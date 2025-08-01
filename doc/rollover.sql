-- =====================================================
-- Monthly KRI Rollover Function
-- =====================================================
-- This script creates a monthly rollover function for KRI data that:
-- 1. Creates blank KRI records for the new month
-- 2. Duplicates permissions from the previous month
-- 3. Resets all data values and statuses to initial state
-- 4. Maintains audit trail integrity
-- 5. Schedules execution via pg_cron
--
-- PREREQUISITES:
-- - pg_cron extension must be installed and enabled
-- - All existing database functions (get_current_kri_metadata, etc.) must be present
-- - Proper permissions for cron scheduling
--
-- USAGE:
-- 1. Execute this entire script to create all functions
-- 2. Run the cron.schedule command to set up monthly automation
-- 3. Use monitoring queries to track execution
-- 4. Use rollback function only in emergencies
-- =====================================================

-- =====================================================
-- MAIN ROLLOVER FUNCTION
-- =====================================================

-- =====================================================
-- FIX: CORRECTED get_current_kri_metadata FUNCTION
-- =====================================================
-- The original get_current_kri_metadata function has a return type mismatch
-- It declares 'breach_type text' but get_kri_metadata_at_time returns 'limit_value integer' in that position
-- This corrected version matches the actual return structure

CREATE OR REPLACE FUNCTION get_current_kri_metadata(p_kri_code text)
RETURNS TABLE(
    metadata_id bigint, 
    kri_code text, 
    name text, 
    description text, 
    formula text, 
    owner text, 
    data_provider text, 
    l1_risk_type text, 
    l2_risk_type text, 
    ras_metric text, 
    limit_value integer, 
    warning_line_value integer, 
    negative_warning integer, 
    negative_limit integer, 
    reporting_frequency text, 
    is_calculated_kri boolean, 
    created_at timestamp with time zone, 
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_kri_metadata_at_time(p_kri_code, NOW());
END;
$$;

-- Test function to verify the fix works
CREATE OR REPLACE FUNCTION test_metadata_function_fix()
RETURNS TABLE(
    test_result TEXT,
    function_name TEXT,
    columns_returned INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    col_count INTEGER := 0;
BEGIN
    -- Test the fixed function
    BEGIN
        FOR rec IN SELECT * FROM get_current_kri_metadata('TEST_CODE') LOOP
            col_count := col_count + 1;
        END LOOP;
        
        RETURN QUERY SELECT 'SUCCESS'::TEXT, 'get_current_kri_metadata'::TEXT, col_count;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT SQLERRM::TEXT, 'get_current_kri_metadata'::TEXT, 0;
    END;
END;
$$;


CREATE OR REPLACE FUNCTION perform_monthly_kri_rollover(
    target_date INTEGER DEFAULT NULL
)
RETURNS TABLE(
    rollover_reporting_date INTEGER,
    kri_items_created INTEGER,
    atomic_items_created INTEGER,
    permissions_created INTEGER,
    status TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    -- Variables for date calculations
    new_reporting_date INTEGER;
    source_reporting_date INTEGER;
    
    -- Statistics tracking
    kri_count INTEGER := 0;
    atomic_count INTEGER := 0;
    permission_count INTEGER := 0;
    
    -- Safety checks
    existing_count INTEGER;
    source_count INTEGER;
    
BEGIN
    -- =====================================================
    -- DATE CALCULATION LOGIC
    -- =====================================================
    
    IF target_date IS NULL THEN
        -- Calculate last day of current month in YYYYMMDD format
        new_reporting_date := TO_CHAR(
            DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
            'YYYYMMDD'
        )::INTEGER;
    ELSE
        new_reporting_date := target_date;
    END IF;
    
    -- Calculate source month (previous month's last day)
    source_reporting_date := TO_CHAR(
        TO_DATE(new_reporting_date::TEXT, 'YYYYMMDD') - INTERVAL '1 month',
        'YYYYMMDD'
    )::INTEGER;
    
    -- =====================================================
    -- SAFETY CHECKS
    -- =====================================================
    
    -- Check if rollover already completed for target month
    SELECT COUNT(*) INTO existing_count
    FROM kri_item 
    WHERE reporting_date = new_reporting_date;
    
    IF existing_count > 0 THEN
        RAISE EXCEPTION 'Rollover already completed for reporting date %. Found % existing records.', 
            new_reporting_date, existing_count;
    END IF;
    
    -- Verify source month has data
    SELECT COUNT(*) INTO source_count
    FROM kri_item 
    WHERE reporting_date = source_reporting_date;
    
    IF source_count = 0 THEN
        RAISE EXCEPTION 'No source data found for reporting date %. Cannot perform rollover.', 
            source_reporting_date;
    END IF;
    
    -- Log rollover start
    RAISE NOTICE 'Starting monthly rollover: % -> %. Source records: %', 
        source_reporting_date, new_reporting_date, source_count;
        
    -- =====================================================
    -- KRI ITEMS ROLLOVER
    -- =====================================================
    
    INSERT INTO kri_item (
        kri_id, 
        reporting_date, 
        kri_code, 
        metadata_effective_date,
        kri_value, 
        kri_status, 
        source, 
        evidence_id, 
        breach_type
    )
    SELECT 
        ki.kri_id,
        new_reporting_date,
        ki.kri_code,
        NOW() as metadata_effective_date,  -- Fresh metadata reference
        NULL as kri_value,                 -- Reset value
        10 as kri_status,                  -- Pending Input status (10=Pending Input)
        CASE 
            WHEN ki.source = 'system' THEN 'system'  -- Preserve system source
            ELSE ''::text  -- Reset source for manual/autoparse entries
        END as source,
        NULL as evidence_id,               -- Clear evidence links
        NULL as breach_type                -- Reset breach status
    FROM kri_item ki
    WHERE ki.reporting_date = source_reporting_date;
    
    GET DIAGNOSTICS kri_count = ROW_COUNT;
    
    RAISE NOTICE 'Created % KRI item records for reporting date %', kri_count, new_reporting_date;
    
    -- =====================================================
    -- ATOMIC ELEMENTS ROLLOVER (for calculated KRIs only)
    -- =====================================================
    
    INSERT INTO kri_atomic (
        kri_id, 
        atomic_id, 
        reporting_date, 
        atomic_metadata,
        atomic_value, 
        atomic_status, 
        source, 
        kri_code, 
        evidence_id
    )
    SELECT 
        ka.kri_id, 
        ka.atomic_id, 
        new_reporting_date,
        ka.atomic_metadata,                -- Preserve atomic metadata structure
        NULL as atomic_value,              -- Reset atomic value
        10 as atomic_status,               -- Pending Input status (10=Pending Input)
        CASE 
            WHEN ka.source = 'system' THEN 'system'  -- Preserve system source
            ELSE ''::text  -- Reset source for manual entries
        END as source,
        ka.kri_code,
        NULL as evidence_id                -- Clear evidence links
    FROM kri_atomic ka
    WHERE ka.reporting_date = source_reporting_date
      AND EXISTS (
          -- Only rollover atomics for KRIs that are marked as calculated
          SELECT 1 
          FROM get_current_kri_metadata(ka.kri_code) m 
          WHERE m.is_calculated_kri = true
      );
    
    GET DIAGNOSTICS atomic_count = ROW_COUNT;
    
    RAISE NOTICE 'Created % atomic element records for reporting date %', atomic_count, new_reporting_date;
    
    -- =====================================================
    -- PERMISSIONS ROLLOVER
    -- =====================================================
    
    INSERT INTO kri_user_permission (
        user_uuid, 
        kri_id, 
        reporting_date, 
        action, 
        effect, 
        condition
    )
    SELECT 
        kup.user_uuid,
        kup.kri_id,
        new_reporting_date,     -- Update to new reporting period
        kup.action,             -- Preserve permission action
        kup.effect,             -- Preserve permission effect
        kup.condition           -- Preserve conditions
    FROM kri_user_permission kup
    WHERE kup.reporting_date = source_reporting_date;
    
    GET DIAGNOSTICS permission_count = ROW_COUNT;
    
    RAISE NOTICE 'Created % permission records for reporting date %', permission_count, new_reporting_date;
    
    -- =====================================================
    -- AUDIT TRAIL LOGGING
    -- =====================================================
    
    -- Log rollover completion (only if we created KRIs)
    IF kri_count > 0 THEN
        INSERT INTO kri_audit_trail (
            kri_id, 
            reporting_date, 
            changed_by, 
            action,
            field_name, 
            new_value, 
            comment, 
            kri_code
        )
        SELECT 
            ki.kri_id,
            ki.reporting_date,
            'system', 
            'monthly_rollover',
            'batch_operation', 
            json_build_object(
                'source_date', source_reporting_date,
                'target_date', new_reporting_date,
                'kri_count', kri_count,
                'atomic_count', atomic_count,
                'permission_count', permission_count
            )::text,
            'Monthly rollover completed successfully',
            ki.kri_code
        FROM kri_item ki
        WHERE ki.reporting_date = new_reporting_date
        LIMIT 1;
    END IF;
    
    -- =====================================================
    -- RETURN RESULTS
    -- =====================================================
    
    RETURN QUERY 
    SELECT 
        new_reporting_date,
        kri_count,
        atomic_count, 
        permission_count,
        'SUCCESS'::TEXT;
        
    RAISE NOTICE 'Monthly rollover completed successfully.';

EXCEPTION
    WHEN OTHERS THEN
        -- Log error to audit trail (using first available KRI for reference)
        INSERT INTO kri_audit_trail (
            kri_id, reporting_date, changed_by, action,
            field_name, old_value, new_value, comment, kri_code
        )
        SELECT 
            ki.kri_id, source_reporting_date, 'system', 'monthly_rollover_error',
            'error_details', NULL, SQLERRM, 
            'Monthly rollover failed with error', ki.kri_code
        FROM kri_item ki
        WHERE ki.reporting_date = source_reporting_date
        LIMIT 1;
        
        -- Re-raise the exception
        RAISE EXCEPTION 'Monthly rollover failed: %', SQLERRM;
        
END;
$$;

-- =====================================================
-- PG_CRON SCHEDULING SETUP
-- =====================================================
-- Schedule the rollover function to run on the 1st of every month at 00:00 UTC
-- Note: Ensure pg_cron extension is installed before running these commands

-- Create the monthly rollover cron job
SELECT cron.schedule(
    'monthly-kri-rollover',                    -- Job name
    '0 0 1 * *',                              -- Cron schedule: minute hour day month day_of_week
    'SELECT perform_monthly_kri_rollover();'   -- SQL command to execute
);

-- =====================================================
-- CRON JOB MANAGEMENT COMMANDS
-- =====================================================

-- View all scheduled cron jobs
-- SELECT * FROM cron.job;

-- View cron job execution history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Unschedule the rollover job (if needed)
-- SELECT cron.unschedule('monthly-kri-rollover');

-- Manual execution for testing (run outside of schedule)
-- SELECT * FROM perform_monthly_kri_rollover();

-- Test with specific target date (format: YYYYMMDD)
-- SELECT * FROM perform_monthly_kri_rollover(20250228); -- February 28, 2025

-- =====================================================
-- MONITORING AND ROLLBACK PROCEDURES
-- =====================================================

-- Query to check rollover status and statistics
CREATE OR REPLACE FUNCTION get_rollover_status(target_reporting_date INTEGER)
RETURNS TABLE(
    status_reporting_date INTEGER,
    kri_items_count INTEGER,
    atomic_items_count INTEGER,
    permissions_count INTEGER,
    rollover_completed BOOLEAN,
    rollover_timestamp TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        target_reporting_date as status_reporting_date,
        (SELECT COUNT(*)::INTEGER FROM kri_item ki WHERE ki.reporting_date = target_reporting_date) as kri_items_count,
        (SELECT COUNT(*)::INTEGER FROM kri_atomic ka WHERE ka.reporting_date = target_reporting_date) as atomic_items_count,
        (SELECT COUNT(*)::INTEGER FROM kri_user_permission kup WHERE kup.reporting_date = target_reporting_date) as permissions_count,
        EXISTS(
            SELECT 1 FROM kri_audit_trail kat
            WHERE kat.reporting_date = target_reporting_date 
              AND kat.action = 'monthly_rollover'
              AND kat.changed_by = 'system'
        ) as rollover_completed,
        (SELECT MAX(kat2.changed_at) FROM kri_audit_trail kat2
         WHERE kat2.reporting_date = target_reporting_date 
           AND kat2.action = 'monthly_rollover'
           AND kat2.changed_by = 'system'
        ) as rollover_timestamp;
END;
$$;

-- Emergency rollback function (use with caution!)
CREATE OR REPLACE FUNCTION rollback_monthly_rollover(target_reporting_date INTEGER)
RETURNS TABLE(
    rollback_reporting_date INTEGER,
    kri_items_deleted INTEGER,
    atomic_items_deleted INTEGER,
    permissions_deleted INTEGER,
    status TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    kri_deleted INTEGER := 0;
    atomic_deleted INTEGER := 0;
    permission_deleted INTEGER := 0;
    rollover_exists BOOLEAN := false;
BEGIN
    -- Safety check: ensure rollover actually exists for this date
    SELECT EXISTS(
        SELECT 1 FROM kri_audit_trail 
        WHERE reporting_date = target_reporting_date 
          AND action = 'monthly_rollover'
          AND changed_by = 'system'
    ) INTO rollover_exists;
    
    IF NOT rollover_exists THEN
        RAISE EXCEPTION 'No rollover found for reporting date %. Cannot rollback.', target_reporting_date;
    END IF;
    
    RAISE NOTICE 'WARNING: Rolling back monthly rollover for date %. This will delete all data for this reporting period!', target_reporting_date;
    
    -- Delete permissions
    DELETE FROM kri_user_permission kup WHERE kup.reporting_date = target_reporting_date;
    GET DIAGNOSTICS permission_deleted = ROW_COUNT;
    
    -- Delete atomic elements
    DELETE FROM kri_atomic ka WHERE ka.reporting_date = target_reporting_date;
    GET DIAGNOSTICS atomic_deleted = ROW_COUNT;
    
    -- Delete KRI items
    DELETE FROM kri_item ki WHERE ki.reporting_date = target_reporting_date;
    GET DIAGNOSTICS kri_deleted = ROW_COUNT;
    
    -- Log the rollback action (use a representative KRI from audit trail)
    INSERT INTO kri_audit_trail (
        kri_id, reporting_date, changed_by, action,
        field_name, new_value, comment, kri_code
    )
    SELECT 
        kat.kri_id, target_reporting_date, 'system', 'monthly_rollover_rollback',
        'batch_operation', 
        json_build_object(
            'kri_deleted', kri_deleted,
            'atomic_deleted', atomic_deleted, 
            'permission_deleted', permission_deleted
        )::text,
        'Monthly rollover rolled back - all data deleted for reporting period',
        kat.kri_code
    FROM kri_audit_trail kat
    WHERE kat.reporting_date = target_reporting_date 
      AND kat.action = 'monthly_rollover'
      AND kat.changed_by = 'system'
    LIMIT 1;
    
    RETURN QUERY 
    SELECT 
        target_reporting_date as rollback_reporting_date,
        kri_deleted as kri_items_deleted,
        atomic_deleted as atomic_items_deleted,
        permission_deleted as permissions_deleted,
        'ROLLBACK_SUCCESS'::text as status;
        
    RAISE NOTICE 'Rollback completed. Deleted: % KRIs, % atomics, % permissions', 
        kri_deleted, atomic_deleted, permission_deleted;
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Rollback failed: %', SQLERRM;
END;
$$;

-- =====================================================
-- MONITORING QUERIES
-- =====================================================

-- Check recent rollover executions
/*
SELECT 
    jr.jobid,
    jr.runid,
    jr.job_pid,
    jr.database,
    jr.username,
    jr.command,
    jr.status,
    jr.return_message,
    jr.start_time,
    jr.end_time,
    jr.end_time - jr.start_time as duration
FROM cron.job_run_details jr
JOIN cron.job j ON jr.jobid = j.jobid
WHERE j.jobname = 'monthly-kri-rollover'
ORDER BY jr.start_time DESC
LIMIT 5;
*/

-- Check rollover status for current month
/*
SELECT * FROM get_rollover_status(
    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 'YYYYMMDD')::INTEGER
);
*/

-- Check audit trail for rollover activities
/*
SELECT 
    reporting_date,
    changed_at,
    action,
    new_value,
    comment
FROM kri_audit_trail 
WHERE action IN ('monthly_rollover', 'monthly_rollover_error', 'monthly_rollover_rollback')
  AND changed_by = 'system'
ORDER BY changed_at DESC
LIMIT 10;
*/

-- =====================================================
-- INSTALLATION AND SETUP GUIDE
-- =====================================================

-- Step 1: Ensure pg_cron extension is installed
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Execute this entire script to create all functions
-- \i /path/to/rollover.sql

-- Step 3: Schedule the monthly rollover (uncomment to activate)
-- SELECT cron.schedule('monthly-kri-rollover', '0 0 1 * *', 'SELECT perform_monthly_kri_rollover();');

-- Step 4: Verify the job was created
-- SELECT * FROM cron.job WHERE jobname = 'monthly-kri-rollover';

-- =====================================================
-- TESTING GUIDE
-- =====================================================

-- Test the rollover function manually (use a future date for testing)
-- SELECT * FROM perform_monthly_kri_rollover(20251031); -- Test with October 31, 2025

-- Check what was created
-- SELECT * FROM get_rollover_status(20251031);

-- If testing, clean up afterwards
-- SELECT * FROM rollback_monthly_rollover(20251031);

-- =====================================================
-- OPERATIONAL PROCEDURES
-- =====================================================

-- MONTHLY HEALTH CHECK (run after each scheduled execution):
/*
-- 1. Check if rollover completed successfully
SELECT * FROM get_rollover_status(
    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 'YYYYMMDD')::INTEGER
);

-- 2. Review execution logs
SELECT 
    status,
    return_message,
    start_time,
    end_time,
    end_time - start_time as duration
FROM cron.job_run_details jr
JOIN cron.job j ON jr.jobid = j.jobid
WHERE j.jobname = 'monthly-kri-rollover'
ORDER BY start_time DESC
LIMIT 1;

-- 3. Verify data integrity
SELECT 
    reporting_date,
    COUNT(*) as total_kris,
    COUNT(CASE WHEN kri_status = 10 THEN 1 END) as pending_input,
    COUNT(CASE WHEN kri_value IS NULL THEN 1 END) as blank_values,
    COUNT(CASE WHEN evidence_id IS NULL THEN 1 END) as no_evidence
FROM kri_item 
WHERE reporting_date = TO_CHAR(DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 'YYYYMMDD')::INTEGER
GROUP BY reporting_date;
*/

-- TROUBLESHOOTING:
-- If rollover fails, check the audit trail:
-- SELECT * FROM kri_audit_trail WHERE action = 'monthly_rollover_error' ORDER BY changed_at DESC LIMIT 5;

-- If manual rollover is needed:
-- SELECT * FROM perform_monthly_kri_rollover(); -- Uses current month

-- EMERGENCY ROLLBACK (use with extreme caution):
-- SELECT * FROM rollback_monthly_rollover(YYYYMMDD); -- Replace with actual date

-- =====================================================
-- PERFORMANCE NOTES
-- =====================================================
-- 
-- This rollover function is designed to:
-- - Execute efficiently with minimal table locking
-- - Handle large datasets through batch operations
-- - Maintain referential integrity throughout the process
-- - Provide comprehensive logging for troubleshooting
-- 
-- Expected execution time: 1-5 minutes depending on data volume
-- Resource usage: Moderate CPU and I/O during execution
-- Concurrency: Safe to run while users are accessing the system
-- 
-- =====================================================