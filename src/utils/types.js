// Database types matching the actual DDL schema

// /**
//  * Main KRI Item table structure
//  * Primary key: (kri_id, reporting_date)
//  */
// export const KRIItemSchema = {
//   kri_id: 'bigint', // not null
//   reporting_date: 'integer', // not null (YYYYMMDD format)
//   kri_name: 'text', // nullable
//   kri_description: 'text', // nullable
//   data_provider: 'text', // nullable
//   kri_owner: 'text', // nullable
//   l1_risk_type: 'text', // nullable
//   l2_risk_type: 'text', // nullable
//   ras_metric: 'text', // nullable
//   breach_type: 'text', // nullable
//   limit_value: 'integer', // nullable
//   warning_line_value: 'integer', // nullable
//   reporting_frequency: 'text', // nullable
//   kri_formula: 'text', // nullable
//   kri_value: 'text', // nullable (stored as text for flexibility)
//   kri_status: 'integer', // nullable (0=Pending, 1=Submitted, 2=Finalized)
//   created_at: 'timestamp with time zone' // not null, default now()
// };

// /**
//  * KRI Atomic data table structure
//  * Primary key: (kri_id, reporting_date, atomic_id)
//  */
// export const KRIAtomicSchema = {
//   kri_id: 'bigint', // not null, FK to kri_item
//   atomic_id: 'integer', // not null
//   reporting_date: 'integer', // not null, FK to kri_item
//   atomic_metadata: 'text', // nullable
//   atomic_value: 'text', // nullable
//   atomic_status: 'integer', // nullable
//   created_at: 'timestamp with time zone' // not null, default now()
// };

// /**
//  * KRI Evidence table structure
//  * Primary key: evidence_id (auto-generated)
//  */
// export const KRIEvidenceSchema = {
//   evidence_id: 'bigint', // identity, primary key
//   kri_id: 'bigint', // not null, FK to kri_item
//   reporting_date: 'integer', // not null, FK to kri_item
//   file_name: 'text', // not null
//   file_url: 'text', // not null
//   description: 'text', // nullable
//   uploaded_by: 'text', // nullable
//   uploaded_at: 'timestamp with time zone' // not null, default now()
// };

// /**
//  * KRI Audit Trail table structure
//  * Primary key: audit_id (auto-generated)
//  */
// export const KRIAuditTrailSchema = {
//   audit_id: 'bigint', // identity, primary key
//   kri_id: 'bigint', // not null, FK to kri_item
//   reporting_date: 'integer', // not null, FK to kri_item
//   changed_at: 'timestamp with time zone', // not null, default now()
//   changed_by: 'text', // nullable
//   action: 'text', // not null
//   field_name: 'text', // nullable
//   old_value: 'text', // nullable
//   new_value: 'text', // nullable
//   comment: 'text' // nullable
// };


/**
 * Centralized status management for KRI and Atomic items
 * Consolidates duplicate status-related functions from helpers.js
 */
class StatusManager {
  // Unified Status Configuration
  static STATUS_VALUES = {
    PENDING_INPUT: 10,
    UNDER_REWORK: 20,
    SAVED: 30,
    SUBMITTED_TO_DATA_PROVIDER_APPROVER: 40,
    SUBMITTED_TO_KRI_OWNER_APPROVER: 50,
    FINALIZED: 60
  };
  static STATUS_CONFIG = {
    [StatusManager.STATUS_VALUES.PENDING_INPUT]: { 
      label: 'Pending Input', 
      tagType: 'warning', 
      cssClass: 'status-pending',
      description: 'Data input is pending',
    },
    [StatusManager.STATUS_VALUES.UNDER_REWORK]: { 
      label: 'Under Rework', 
      tagType: 'warning', 
      cssClass: 'status-adjusting',
      description: 'Data requires revision',
    },
    [StatusManager.STATUS_VALUES.SAVED]: { 
      label: 'Saved', 
      tagType: 'info', 
      cssClass: 'status-pending-approval',
      description: 'Data saved but not submitted',
    },
    [StatusManager.STATUS_VALUES.SUBMITTED_TO_DATA_PROVIDER_APPROVER]: { 
      label: 'Submitted to Data Provider Approver', 
      tagType: 'primary', 
      cssClass: 'status-ready',
      description: 'Pending data provider approval',
    },
    [StatusManager.STATUS_VALUES.SUBMITTED_TO_KRI_OWNER_APPROVER]: { 
      label: 'Submitted to KRI Owner Approver', 
      tagType: 'info', 
      cssClass: 'status-submitted',
      description: 'Pending KRI owner approval',
    },
    [StatusManager.STATUS_VALUES.FINALIZED]: { 
      label: 'Finalized', 
      tagType: 'success', 
      cssClass: 'status-approved',
      description: 'Data approved and finalized',
    }
  };

  // Reverse mapping from status labels to numeric values
  static STATUS_LABEL_TO_NUMBER = Object.entries(StatusManager.STATUS_CONFIG)
    .reduce((acc, [key, config]) => {
      acc[config.label] = parseInt(key);
      return acc;
    }, {});

  /**
   * Convert status label to numeric value
   * @param {string} label - Status label
   * @returns {number} Status numeric value
   */
  static getLabelToNumber(label) {
    return StatusManager.STATUS_LABEL_TO_NUMBER[label] || null;
  }

  // ---------------------------------- status mapping getters ----------------------------------
  /**
   * Map status number to readable string
   * @param {number|string} status - Status number or label
   * @returns {string} Status label
   */
  static mapStatus(status) {
    if (typeof status === 'string') {
      status = StatusManager.getLabelToNumber(status);
    }
    const config = StatusManager.STATUS_CONFIG[status];
    return config ? config.label : `Unknown (${status})`;
  }

  /**
   * Get status tag type for Element UI
   * @param {number|string} status - Status number or label
   * @returns {string} Tag type
   */
  static getStatusTagType(status) {
    if (typeof status === 'string') {
      status = StatusManager.getLabelToNumber(status);
    }
    const config = StatusManager.STATUS_CONFIG[status];
    return config ? config.tagType : 'info';
  }

  /**
   * Get status CSS class
   * @param {number} status - Status number
   * @returns {string} CSS class
   */
  static getStatusCssClass(status) {
    if (typeof status === 'string') {
      status = StatusManager.getLabelToNumber(status);
    }
    const config = StatusManager.STATUS_CONFIG[status];
    return config ? config.cssClass : 'status-na';
  }

  /**
   * Get status description
   * @param {number|string} status - Status number or label
   * @returns {string} Status description
   */
  static getStatusDescription(status) {
    if (typeof status === 'string') {
      status = StatusManager.getLabelToNumber(status);
    }
    const config = StatusManager.STATUS_CONFIG[status];
    return config ? config.description : 'Unknown status';
  }
}
// Export status values for use in other modules
export const STATUS_VALUES = StatusManager.STATUS_VALUES;

// Export static methods as individual functions for backward compatibility
export const mapStatus = StatusManager.mapStatus.bind(StatusManager);
export const getStatusTagType = StatusManager.getStatusTagType.bind(StatusManager);
export const getStatusCssClass = StatusManager.getStatusCssClass.bind(StatusManager);
export const getStatusDescription = StatusManager.getStatusDescription.bind(StatusManager);

// Export the main class
export default StatusManager;

// ---------------------------------- breach status mapping getters ----------------------------------

// Breach Status Configuration
export const BREACH_STATUS_CONFIG = {
  'No Breach': {
    label: 'No Breach',
    tagType: 'success',
    description: 'KRI value is within acceptable limits.'
  },
  'Warning': {
    label: 'Warning',
    tagType: 'warning',
    description: 'KRI value has exceeded the warning threshold.'
  },
  'Limit': {
    label: 'Limit Breach',
    tagType: 'danger',
    description: 'KRI value has exceeded the limit threshold.'
  },
  'Critical': {
    label: 'Critical Breach',
    tagType: 'danger',
    description: 'KRI value has significantly exceeded the limit.'
  }
};

/**
 * Get the Element UI tag type for a given breach type.
 * @param {string} breachType - The breach type string (e.g., "No Breach", "Warning", "Limit", "Critical")
 * @returns {string} The Element UI tag type ("success", "warning", "danger", or "info")
 */
export function getBreachTagType(breachType) {
  if (!breachType) return 'info';
  const config = BREACH_STATUS_CONFIG[breachType];
  return config ? config.tagType : 'info';
}

/**
 * Get the display text for a given breach type.
 * @param {string} breachType - The breach type string (e.g., "No Breach", "Warning", "Limit", "Critical")
 * @returns {string} The display text for the breach type.
 */
export function getBreachDisplayText(breachType) {
  if (!breachType) return '';
  const config = BREACH_STATUS_CONFIG[breachType];
  // For "Limit" and "Critical", use the label from config (which is "Limit Breach" or "Critical Breach")
  // For others, just use the label as is
  return config ? config.label : breachType;
}

/**
 * Get the description for a given breach type.
 * @param {string} breachType - The breach type string (e.g., "No Breach", "Warning", "Limit", "Critical")
 * @returns {string} The description for the breach type.
 */
export function getBreachDescription(breachType) {
  if (!breachType) return '';
  const config = BREACH_STATUS_CONFIG[breachType];
  return config ? config.description : '';
}


// ---------------------------------- permission mapping getters ----------------------------------
// User permissions configuration
export const USER_PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit',
  REVIEW: 'review',
  ACKNOWLEDGE: 'acknowledge',
  DELETE: 'delete'
};

//reverse mapping from permission labels to numeric values
export const USER_PERMISSION_LABEL_TO_NUMBER = Object.entries(USER_PERMISSIONS)
  .reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
  }, {});

// ---------------------------------- KRI type mapping getters ----------------------------------
// Transform data to match Vue component expectations
/**
 * Transform an array of KRI database records to match Vue component expectations.
 * @param {Array} data - Array of KRI records from the database.
 * @param {Function} mapStatus - Function to map status code to label.
 * @returns {Array} Transformed KRI data for components.
 */
export function transformKRIData(data, mapStatus) {
  if (!Array.isArray(data)) return [];
  return data.map(kri => ({
    id: String(kri.kri_id),
    kriId: kri.kri_id, // Keep numeric ID for internal operations
    name: kri.kri_name || '',
    owner: kri.owner || '',
    dataProvider: kri.data_provider || '',
    collectionStatus: mapStatus ? mapStatus(kri.kri_status) : kri.kri_status,
    kriStatus: kri.kri_status, // Keep numeric status for internal operations
    kriType: kri.ras_metric || 'N/A',
    l1RiskType: kri.l1_risk_type || '',
    l2RiskType: kri.l2_risk_type || '',
    breachType: kri.breach_type || 'No Breach',
    kriValue: kri.kri_value || 'N/A',
    warningLineValue: kri.warning_line_value,
    limitValue: kri.limit_value,
    negativeWarning: kri.negative_warning,
    negativeLimit: kri.negative_limit,
    reportingCycle: kri.reporting_frequency || '',
    reportingDate: kri.reporting_date, // Keep as integer for internal operations
    isCalculatedKri: kri.is_calculated_kri || false, // Map calculated KRI flag
    rawData: kri
  }));
}