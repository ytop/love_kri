// Database types matching the actual DDL schema

/**
 * Main KRI Item table structure
 * Primary key: (kri_id, reporting_date)
 */
export const KRIItemSchema = {
  kri_id: 'bigint', // not null
  reporting_date: 'integer', // not null (YYYYMMDD format)
  kri_name: 'text', // nullable
  kri_description: 'text', // nullable
  data_provider: 'text', // nullable
  kri_owner: 'text', // nullable
  l1_risk_type: 'text', // nullable
  l2_risk_type: 'text', // nullable
  ras_metric: 'text', // nullable
  breach_type: 'text', // nullable
  limit_value: 'integer', // nullable
  warning_line_value: 'integer', // nullable
  reporting_frequency: 'text', // nullable
  kri_formula: 'text', // nullable
  kri_value: 'text', // nullable (stored as text for flexibility)
  kri_status: 'integer', // nullable (0=Pending, 1=Submitted, 2=Finalized)
  created_at: 'timestamp with time zone' // not null, default now()
};

/**
 * KRI Atomic data table structure
 * Primary key: (kri_id, reporting_date, atomic_id)
 */
export const KRIAtomicSchema = {
  kri_id: 'bigint', // not null, FK to kri_item
  atomic_id: 'integer', // not null
  reporting_date: 'integer', // not null, FK to kri_item
  atomic_metadata: 'text', // nullable
  atomic_value: 'text', // nullable
  atomic_status: 'integer', // nullable
  created_at: 'timestamp with time zone' // not null, default now()
};

/**
 * KRI Evidence table structure
 * Primary key: evidence_id (auto-generated)
 */
export const KRIEvidenceSchema = {
  evidence_id: 'bigint', // identity, primary key
  kri_id: 'bigint', // not null, FK to kri_item
  reporting_date: 'integer', // not null, FK to kri_item
  file_name: 'text', // not null
  file_url: 'text', // not null
  description: 'text', // nullable
  uploaded_by: 'text', // nullable
  uploaded_at: 'timestamp with time zone' // not null, default now()
};

/**
 * KRI Audit Trail table structure
 * Primary key: audit_id (auto-generated)
 */
export const KRIAuditTrailSchema = {
  audit_id: 'bigint', // identity, primary key
  kri_id: 'bigint', // not null, FK to kri_item
  reporting_date: 'integer', // not null, FK to kri_item
  changed_at: 'timestamp with time zone', // not null, default now()
  changed_by: 'text', // nullable
  action: 'text', // not null
  field_name: 'text', // nullable
  old_value: 'text', // nullable
  new_value: 'text', // nullable
  comment: 'text' // nullable
};

// Enum definitions for status fields
export const KRIStatus = {
  PENDING_INPUT: 10,
  ADJUSTING: 20,
  PENDING_DATA_PROVIDER_APPROVAL: 30,
  READY_FOR_SUBMISSION: 40,
  SUBMITTED: 50,
  FINALIZED: 60
};

export const AtomicStatus = {
  PENDING_INPUT: 10,
  ADJUSTING: 20,
  PENDING_DATA_PROVIDER_APPROVAL: 30,
  READY_FOR_SUBMISSION: 40,
  SUBMITTED: 50,
  FINALIZED: 60
};

// Helper functions for data transformation
export const mapKriStatus = (status) => {
  if (status === null || status === undefined) return 'Pending Input';
  switch (status) {
  case KRIStatus.PENDING_INPUT:
    return 'Pending Input';
  case KRIStatus.ADJUSTING:
    return 'Adjusting';
  case KRIStatus.PENDING_DATA_PROVIDER_APPROVAL:
    return 'Pending Data Provider Approval';
  case KRIStatus.READY_FOR_SUBMISSION:
    return 'Ready for submission';
  case KRIStatus.SUBMITTED:
    return 'Submitted';
  case KRIStatus.FINALIZED:
    return 'Finalized';
  default:
    return `Unknown (${status})`;
  }
};

export const mapAtomicStatus = (status) => {
  if (status === null || status === undefined) return 'Unknown';
  switch (status) {
  case AtomicStatus.INACTIVE:
    return 'Inactive';
  case AtomicStatus.ACTIVE:
    return 'Active';
  case AtomicStatus.VALIDATED:
    return 'Validated';
  default:
    return `Status ${status}`;
  }
};