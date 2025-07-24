-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.kri_atomic (
  kri_id bigint NOT NULL,
  atomic_id integer NOT NULL,
  reporting_date integer NOT NULL,
  atomic_metadata text,
  atomic_value text,
  atomic_status integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source text DEFAULT ''::text,
  CONSTRAINT kri_atomic_pkey PRIMARY KEY (kri_id, atomic_id, reporting_date),
  CONSTRAINT fk_kri_item_snapshot FOREIGN KEY (kri_id) REFERENCES public.kri_item(kri_id),
  CONSTRAINT fk_kri_item_snapshot FOREIGN KEY (reporting_date) REFERENCES public.kri_item(kri_id),
  CONSTRAINT fk_kri_item_snapshot FOREIGN KEY (kri_id) REFERENCES public.kri_item(reporting_date),
  CONSTRAINT fk_kri_item_snapshot FOREIGN KEY (reporting_date) REFERENCES public.kri_item(reporting_date)
);
CREATE TABLE public.kri_audit_trail (
  audit_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  kri_id bigint NOT NULL,
  reporting_date integer NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  changed_by text,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  comment text,
  CONSTRAINT kri_audit_trail_pkey PRIMARY KEY (audit_id),
  CONSTRAINT fk_kri_item_audit FOREIGN KEY (reporting_date) REFERENCES public.kri_item(reporting_date),
  CONSTRAINT fk_kri_item_audit FOREIGN KEY (kri_id) REFERENCES public.kri_item(reporting_date),
  CONSTRAINT fk_kri_item_audit FOREIGN KEY (reporting_date) REFERENCES public.kri_item(kri_id),
  CONSTRAINT fk_kri_item_audit FOREIGN KEY (kri_id) REFERENCES public.kri_item(kri_id)
);
CREATE TABLE public.kri_evidence (
  evidence_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  kri_id bigint NOT NULL,
  reporting_date integer NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  description text,
  uploaded_by text,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  md5 text,
  CONSTRAINT kri_evidence_pkey PRIMARY KEY (evidence_id),
  CONSTRAINT fk_kri_item_evidence FOREIGN KEY (reporting_date) REFERENCES public.kri_item(reporting_date),
  CONSTRAINT fk_kri_item_evidence FOREIGN KEY (kri_id) REFERENCES public.kri_item(reporting_date),
  CONSTRAINT fk_kri_item_evidence FOREIGN KEY (reporting_date) REFERENCES public.kri_item(kri_id),
  CONSTRAINT fk_kri_item_evidence FOREIGN KEY (kri_id) REFERENCES public.kri_item(kri_id)
);
CREATE TABLE public.kri_item (
  kri_id bigint NOT NULL,
  reporting_date integer NOT NULL,
  kri_name text,
  kri_description text,
  data_provider text,
  kri_owner text,
  l1_risk_type text,
  l2_risk_type text,
  ras_metric text,
  breach_type text,
  limit_value integer,
  warning_line_value integer,
  reporting_frequency text,
  kri_formula text,
  kri_value text,
  kri_status integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_calculated_kri boolean NOT NULL DEFAULT false,
  source text DEFAULT ''::text,
  evidence_id bigint,
  CONSTRAINT kri_item_pkey PRIMARY KEY (kri_id, reporting_date),
  CONSTRAINT kri_item_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.kri_evidence(evidence_id)
);
CREATE TABLE public.kri_user (
  UUID uuid NOT NULL DEFAULT gen_random_uuid(),
  User_ID character varying NOT NULL,
  User_Name character varying,
  Department character varying,
  OTHER_INFO text DEFAULT 'anything'::text,
  CONSTRAINT kri_user_pkey PRIMARY KEY (UUID)
);
CREATE TABLE public.kri_user_permission (
  user_uuid uuid NOT NULL,
  kri_id bigint NOT NULL,
  reporting_date integer NOT NULL,
  actions character varying NOT NULL DEFAULT ''::character varying,
  effect boolean DEFAULT true,
  condition json,
  created_date timestamp without time zone DEFAULT now(),
  update_date timestamp without time zone DEFAULT now(),
  CONSTRAINT kri_user_permission_pkey PRIMARY KEY (user_uuid, kri_id, reporting_date),
  CONSTRAINT kri_user_permission_user_uuid_fkey FOREIGN KEY (user_uuid) REFERENCES public.kri_user(UUID),
  CONSTRAINT kri_user_permission_kri_id_reporting_date_fkey FOREIGN KEY (kri_id) REFERENCES public.kri_item(kri_id),
  CONSTRAINT kri_user_permission_kri_id_reporting_date_fkey FOREIGN KEY (reporting_date) REFERENCES public.kri_item(kri_id),
  CONSTRAINT kri_user_permission_kri_id_reporting_date_fkey FOREIGN KEY (kri_id) REFERENCES public.kri_item(reporting_date),
  CONSTRAINT kri_user_permission_kri_id_reporting_date_fkey FOREIGN KEY (reporting_date) REFERENCES public.kri_item(reporting_date)
);

-- Server-side function: updateKRI
-- This function updates a single KRI record in the kri_item table and logs the change in kri_audit_trail.
-- It takes the KRI ID, reporting date, update data (as JSON), user info, action, and comment.
-- For each field updated, it logs the old and new value in the audit trail.

CREATE OR REPLACE FUNCTION public.updatekri(
  p_kri_id bigint,
  p_reporting_date integer,
  p_update_data jsonb,
  p_changed_by text,
  p_action text,
  p_comment text
)
RETURNS TABLE (
  kri_id bigint,
  reporting_date integer,
  kri_name text,
  kri_description text,
  data_provider text,
  kri_owner text,
  l1_risk_type text,
  l2_risk_type text,
  ras_metric text,
  breach_type text,
  limit_value integer,
  warning_line_value integer,
  reporting_frequency text,
  kri_formula text,
  kri_value text,
  kri_status integer,
  created_at timestamp with time zone,
  is_calculated_kri boolean,
  source text
) AS $$
DECLARE
  old_row kri_item%ROWTYPE;
  new_row kri_item%ROWTYPE;
  field_key text;
  field_val text;
  old_field_val text;
  update_stmt text;
  set_clauses text = '';
  first boolean = true;
BEGIN
  -- Lock and fetch the old row (use table alias to avoid ambiguity)
  SELECT * INTO old_row FROM kri_item ki WHERE ki.kri_id = p_kri_id AND ki.reporting_date = p_reporting_date FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'KRI record not found for update (kri_id=%, reporting_date=%)', p_kri_id, p_reporting_date;
  END IF;

  -- Build dynamic SET clause for update
  FOR field_key, field_val IN SELECT key, value FROM jsonb_each_text(p_update_data) LOOP
    IF NOT first THEN
      set_clauses := set_clauses || ', ';
    END IF;
    set_clauses := set_clauses || format('%I = %L', field_key, field_val);
    first := false;
  END LOOP;

  update_stmt := format(
    'UPDATE kri_item SET %s WHERE kri_item.kri_id = $1 AND kri_item.reporting_date = $2 RETURNING *',
    set_clauses
  );

  -- Perform the update and fetch the new row
  EXECUTE update_stmt INTO new_row USING p_kri_id, p_reporting_date;

  -- For each updated field, insert audit trail entry
  FOR field_key, field_val IN SELECT key, value FROM jsonb_each_text(p_update_data) LOOP
    EXECUTE format('SELECT ($1).%I::text', field_key) INTO old_field_val USING old_row;
    INSERT INTO kri_audit_trail (
      kri_id, reporting_date, changed_at, changed_by, action, field_name, old_value, new_value, comment
    ) VALUES (
      p_kri_id,
      p_reporting_date,
      NOW(),
      p_changed_by,
      p_action,
      field_key,
      old_field_val,
      field_val,
      p_comment
    );
  END LOOP;

  -- Return the updated row
  RETURN QUERY
    SELECT
      new_row.kri_id,
      new_row.reporting_date,
      new_row.kri_name,
      new_row.kri_description,
      new_row.data_provider,
      new_row.kri_owner,
      new_row.l1_risk_type,
      new_row.l2_risk_type,
      new_row.ras_metric,
      new_row.breach_type,
      new_row.limit_value,
      new_row.warning_line_value,
      new_row.reporting_frequency,
      new_row.kri_formula,
      new_row.kri_value,
      new_row.kri_status,
      new_row.created_at,
      new_row.is_calculated_kri,
      new_row.source;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.updateAtomicKRI(
  p_kri_id bigint,
  p_atomic_id integer,
  p_reporting_date integer,
  p_update_data jsonb,
  p_changed_by text,
  p_action text,
  p_comment text
)
RETURNS TABLE (
  kri_id bigint,
  atomic_id integer,
  reporting_date integer,
  atomic_metadata text,
  atomic_value text,
  atomic_status integer,
  created_at timestamp with time zone
) AS $$
DECLARE
  old_row kri_atomic%ROWTYPE;
  new_row kri_atomic%ROWTYPE;
  key text;
  new_val text;
  old_val text;
  update_stmt text;
  set_clauses text = '';
  first boolean = true;
BEGIN
  -- Lock and fetch the old row
  SELECT * INTO old_row FROM kri_atomic WHERE kri_id = p_kri_id AND atomic_id = p_atomic_id AND reporting_date = p_reporting_date FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atomic KRI record not found for update (kri_id=%, atomic_id=%, reporting_date=%)', p_kri_id, p_atomic_id, p_reporting_date;
  END IF;

  -- Build dynamic SET clause for update
  FOR key, new_val IN SELECT key, value FROM jsonb_each_text(p_update_data) LOOP
    IF NOT first THEN
      set_clauses := set_clauses || ', ';
    END IF;
    set_clauses := set_clauses || format('%I = %L', key, new_val);
    first := false;
  END LOOP;

  update_stmt := format(
    'UPDATE kri_atomic SET %s WHERE kri_id = $1 AND atomic_id = $2 AND reporting_date = $3 RETURNING *',
    set_clauses
  );

  -- Perform the update and fetch the new row
  EXECUTE update_stmt INTO new_row USING p_kri_id, p_atomic_id, p_reporting_date;

  -- For each updated field, insert audit trail entry
  FOR key, new_val IN SELECT key, value FROM jsonb_each_text(p_update_data) LOOP
    EXECUTE format('SELECT ($1).%I::text', key) INTO old_val USING old_row;
    INSERT INTO kri_audit_trail (
      kri_id, reporting_date, changed_at, changed_by, action, field_name, old_value, new_value, comment
    ) VALUES (
     p_kri_id,
      p_reporting_date,
      NOW(),
      p_changed_by,
      p_action,
      key,
      old_val,
      new_val,
      p_comment
    );
  END LOOP;

  -- Return the updated row
  RETURN QUERY
    SELECT
      new_row.kri_id,
      new_row.atomic_id,
      new_row.reporting_date,
      new_row.atomic_metadata,
      new_row.atomic_value,
      new_row.atomic_status,
      new_row.created_at;
END;
$$ LANGUAGE plpgsql;


-- Function to update KRI status based on minimum atomic status
CREATE OR REPLACE FUNCTION update_kri_status_from_atomic()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if this is a calculated KRI
    IF EXISTS (
        SELECT 1 FROM kri_item 
        WHERE kri_id = COALESCE(NEW.kri_id, OLD.kri_id) 
        AND reporting_date = COALESCE(NEW.reporting_date, OLD.reporting_date)
        AND is_calculated_kri = true
    ) THEN
        -- Update the KRI status to minimum atomic status for this KRI
        UPDATE kri_item 
        SET kri_status = (
            SELECT COALESCE(MIN(atomic_status), kri_status)
            FROM kri_atomic 
            WHERE kri_id = COALESCE(NEW.kri_id, OLD.kri_id)
            AND reporting_date = COALESCE(NEW.reporting_date, OLD.reporting_date)
            AND atomic_status IS NOT NULL
        )
        WHERE kri_id = COALESCE(NEW.kri_id, OLD.kri_id)
        AND reporting_date = COALESCE(NEW.reporting_date, OLD.reporting_date);
        
        -- Add audit trail entry for the status change
        INSERT INTO kri_audit_trail (
            kri_id, 
            reporting_date, 
            action, 
            field_name, 
            old_value, 
            new_value, 
            changed_by, 
            comment
        )
        SELECT 
            COALESCE(NEW.kri_id, OLD.kri_id),
            COALESCE(NEW.reporting_date, OLD.reporting_date),
            'auto_status_update',
            'kri_status',
            kri_status::text,
            (
                SELECT MIN(atomic_status)::text
                FROM kri_atomic 
                WHERE kri_id = COALESCE(NEW.kri_id, OLD.kri_id)
                AND reporting_date = COALESCE(NEW.reporting_date, OLD.reporting_date)
                AND atomic_status IS NOT NULL
            ),
            'SYSTEM',
            'KRI status automatically updated to minimum atomic status'
        FROM kri_item 
        WHERE kri_id = COALESCE(NEW.kri_id, OLD.kri_id)
        AND reporting_date = COALESCE(NEW.reporting_date, OLD.reporting_date)
        AND kri_status != (
            SELECT COALESCE(MIN(atomic_status), kri_status)
            FROM kri_atomic 
            WHERE kri_id = COALESCE(NEW.kri_id, OLD.kri_id)
            AND reporting_date = COALESCE(NEW.reporting_date, OLD.reporting_date)
            AND atomic_status IS NOT NULL
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT, UPDATE, DELETE on kri_atomic
CREATE TRIGGER trigger_update_kri_status_from_atomic
    AFTER INSERT OR UPDATE OR DELETE ON kri_atomic
    FOR EACH ROW
    EXECUTE FUNCTION update_kri_status_from_atomic();

-- Optional: Create a function to manually recalculate all KRI statuses
CREATE OR REPLACE FUNCTION recalculate_all_kri_statuses()
RETURNS void AS $$
BEGIN
    UPDATE kri_item 
    SET kri_status = subquery.min_atomic_status
    FROM (
        SELECT 
            ka.kri_id,
            ka.reporting_date,
            MIN(ka.atomic_status) as min_atomic_status
        FROM kri_atomic ka
        INNER JOIN kri_item ki ON ka.kri_id = ki.kri_id 
            AND ka.reporting_date = ki.reporting_date
        WHERE ki.is_calculated_kri = true
            AND ka.atomic_status IS NOT NULL
        GROUP BY ka.kri_id, ka.reporting_date
    ) subquery
    WHERE kri_item.kri_id = subquery.kri_id
    AND kri_item.reporting_date = subquery.reporting_date
    AND kri_item.kri_status != subquery.min_atomic_status;
    
    -- Log the bulk recalculation
    INSERT INTO kri_audit_trail (
        kri_id, 
        reporting_date, 
        action, 
        field_name, 
        comment,
        changed_by
    )
    SELECT DISTINCT
        kri_id,
        reporting_date,
        'bulk_status_recalc',
        'kri_status',
        'Bulk recalculation of all KRI statuses from atomic minimums',
        'SYSTEM'
    FROM kri_item 
    WHERE is_calculated_kri = true;
END;
$$ LANGUAGE plpgsql;


-- Server-side function: updateEvidence
-- This function updates a single evidence record in the kri_evidence table and logs the change in kri_audit_trail.
-- It takes the evidence ID, update data (as JSON), user info, action, and comment.
-- For each field updated, it logs the old and new value in the audit trail.

CREATE OR REPLACE FUNCTION public.updateEvidence(
  p_evidence_id bigint,
  p_update_data jsonb,
  p_changed_by text,
  p_action text,
  p_comment text
)
RETURNS TABLE (
  evidence_id bigint,
  kri_id bigint,
  reporting_date integer,
  file_name text,
  file_url text,
  description text,
  uploaded_by text,
  uploaded_at timestamp with time zone
) AS $$
DECLARE
  old_row kri_evidence%ROWTYPE;
  new_row kri_evidence%ROWTYPE;
  key text;
  new_val text;
  old_val text;
  update_stmt text;
  set_clauses text = '';
  first boolean = true;
BEGIN
  -- Lock and fetch the old row
  SELECT * INTO old_row FROM kri_evidence WHERE evidence_id = p_evidence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evidence record not found for update (evidence_id=%)', p_evidence_id;
  END IF;

  -- Build dynamic SET clause for update
  FOR key, new_val IN SELECT key, value FROM jsonb_each_text(p_update_data) LOOP
    IF NOT first THEN
      set_clauses := set_clauses || ', ';
    END IF;
    set_clauses := set_clauses || format('%I = %L', key, new_val);
    first := false;
  END LOOP;

  update_stmt := format(
    'UPDATE kri_evidence SET %s WHERE evidence_id = $1 RETURNING *',
    set_clauses
  );

  -- Perform the update and fetch the new row
  EXECUTE update_stmt INTO new_row USING p_evidence_id;

  -- For each updated field, insert audit trail entry
  FOR key, new_val IN SELECT key, value FROM jsonb_each_text(p_update_data) LOOP
    EXECUTE format('SELECT ($1).%I::text', key) INTO old_val USING old_row;
    INSERT INTO kri_audit_trail (
      kri_id, reporting_date, changed_at, changed_by, action, field_name, old_value, new_value, comment
    ) VALUES (
      old_row.kri_id,
      old_row.reporting_date,
      NOW(),
      p_changed_by,
      p_action,
      key,
      old_val,
      new_val,
      p_comment
    );
  END LOOP;

  -- Return the updated row
  RETURN QUERY
    SELECT
      new_row.evidence_id,
      new_row.kri_id,
      new_row.reporting_date,
      new_row.file_name,
      new_row.file_url,
      new_row.description,
      new_row.uploaded_by,
      new_row.uploaded_at;
END;
$$ LANGUAGE plpgsql;



