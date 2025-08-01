create view public.kri_with_metadata as
select
  ki.kri_id,
  ki.reporting_date,
  ki.kri_code,
  ki.metadata_effective_date,
  ki.kri_value,
  ki.kri_status,
  ki.breach_type,
  ki.source,
  ki.evidence_id,
  ki.created_at,
  m.name as kri_name,
  m.description as kri_description,
  m.formula as kri_formula,
  m.owner as kri_owner,
  m.data_provider,
  m.l1_risk_type,
  m.l2_risk_type,
  m.ras_metric,
  m.limit_value,
  m.warning_line_value,
  m.negative_warning,
  m.negative_limit,
  m.reporting_frequency,
  m.is_calculated_kri
from
  kri_item ki
  cross join lateral (
    select
      get_kri_metadata_at_time.metadata_id,
      get_kri_metadata_at_time.kri_code,
      get_kri_metadata_at_time.name,
      get_kri_metadata_at_time.description,
      get_kri_metadata_at_time.formula,
      get_kri_metadata_at_time.owner,
      get_kri_metadata_at_time.data_provider,
      get_kri_metadata_at_time.l1_risk_type,
      get_kri_metadata_at_time.l2_risk_type,
      get_kri_metadata_at_time.ras_metric,
      get_kri_metadata_at_time.limit_value,
      get_kri_metadata_at_time.warning_line_value,
      get_kri_metadata_at_time.negative_warning,
      get_kri_metadata_at_time.negative_limit,
      get_kri_metadata_at_time.reporting_frequency,
      get_kri_metadata_at_time.is_calculated_kri,
      get_kri_metadata_at_time.created_at,
      get_kri_metadata_at_time.updated_at
    from
      get_kri_metadata_at_time (
        ki.kri_code,
        COALESCE(ki.metadata_effective_date, now())
      ) get_kri_metadata_at_time (
        metadata_id,
        kri_code,
        name,
        description,
        formula,
        owner,
        data_provider,
        l1_risk_type,
        l2_risk_type,
        ras_metric,
        limit_value,
        warning_line_value,
        negative_warning,
        negative_limit,
        reporting_frequency,
        is_calculated_kri,
        created_at,
        updated_at
      )
  ) m;