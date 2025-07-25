-- SQL commands to check all custom functions and triggers in the database
-- These queries help verify what functions and triggers are currently active

-- =====================================================
-- 1. GET ALL CUSTOM FUNCTIONS WITH DEFINITIONS (excluding system functions starting with 'gbt')
-- =====================================================

SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    l.lanname AS language,
    CASE 
        WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
        WHEN p.provolatile = 's' THEN 'STABLE' 
        WHEN p.provolatile = 'v' THEN 'VOLATILE'
    END AS volatility,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'  -- Only show functions in public schema
    AND p.proname NOT LIKE 'gbt%'  -- Exclude functions starting with 'gbt' 
    AND l.lanname != 'c'  -- Exclude C functions (usually system functions)
ORDER BY p.proname;

-- =====================================================
-- 2. GET ALL TRIGGERS WITH DEFINITIONS
-- =====================================================

SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    n.nspname AS schema_name,
    p.proname AS function_name,
    CASE t.tgtype & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS trigger_timing,
    CASE t.tgtype & 28
        WHEN 4 THEN 'INSERT'
        WHEN 8 THEN 'DELETE'
        WHEN 16 THEN 'UPDATE'
        WHEN 12 THEN 'INSERT, DELETE'
        WHEN 20 THEN 'INSERT, UPDATE'
        WHEN 24 THEN 'DELETE, UPDATE'
        WHEN 28 THEN 'INSERT, DELETE, UPDATE'
    END AS trigger_events,
    CASE t.tgtype & 1
        WHEN 1 THEN 'ROW'
        ELSE 'STATEMENT'
    END AS trigger_level,
    t.tgenabled AS enabled,
    pg_get_triggerdef(t.oid) AS trigger_definition,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'  -- Only show triggers in public schema
    AND NOT t.tgisinternal  -- Exclude internal triggers
ORDER BY c.relname, t.tgname;