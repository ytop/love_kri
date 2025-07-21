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
  CONSTRAINT kri_atomic_pkey PRIMARY KEY (kri_id, atomic_id, reporting_date),
  CONSTRAINT fk_kri_item_snapshot FOREIGN KEY (kri_id) REFERENCES public.kri_item(kri_id),
  CONSTRAINT fk_kri_item_snapshot FOREIGN KEY (reporting_date) REFERENCES public.kri_item(reporting_date),
  CONSTRAINT fk_kri_item_snapshot FOREIGN KEY (reporting_date) REFERENCES public.kri_item(kri_id),
  CONSTRAINT fk_kri_item_snapshot FOREIGN KEY (kri_id) REFERENCES public.kri_item(reporting_date)
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
  CONSTRAINT fk_kri_item_audit FOREIGN KEY (kri_id) REFERENCES public.kri_item(reporting_date),
  CONSTRAINT fk_kri_item_audit FOREIGN KEY (kri_id) REFERENCES public.kri_item(kri_id),
  CONSTRAINT fk_kri_item_audit FOREIGN KEY (reporting_date) REFERENCES public.kri_item(kri_id),
  CONSTRAINT fk_kri_item_audit FOREIGN KEY (reporting_date) REFERENCES public.kri_item(reporting_date)
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
  CONSTRAINT kri_evidence_pkey PRIMARY KEY (evidence_id),
  CONSTRAINT fk_kri_item_evidence FOREIGN KEY (kri_id) REFERENCES public.kri_item(reporting_date),
  CONSTRAINT fk_kri_item_evidence FOREIGN KEY (reporting_date) REFERENCES public.kri_item(reporting_date),
  CONSTRAINT fk_kri_item_evidence FOREIGN KEY (kri_id) REFERENCES public.kri_item(kri_id),
  CONSTRAINT fk_kri_item_evidence FOREIGN KEY (reporting_date) REFERENCES public.kri_item(kri_id)
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
  CONSTRAINT kri_item_pkey PRIMARY KEY (kri_id, reporting_date)
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