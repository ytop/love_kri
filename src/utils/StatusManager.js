import { KRIStatus } from '@/types/database';

/**
 * Centralized status management for KRI and Atomic items
 * Consolidates duplicate status-related functions from helpers.js
 */
class StatusManager {
  // Unified Status Configuration
  static STATUS_CONFIG = {
    10: { 
      label: 'Pending Input', 
      tagType: 'warning', 
      cssClass: 'status-pending',
      description: 'Data input is pending',
      allowsEdit: true,
      allowsSubmit: true
    },
    20: { 
      label: 'Under Rework', 
      tagType: 'warning', 
      cssClass: 'status-adjusting',
      description: 'Data requires revision',
      allowsEdit: true,
      allowsSubmit: true
    },
    30: { 
      label: 'Saved', 
      tagType: 'info', 
      cssClass: 'status-pending-approval',
      description: 'Data saved but not submitted',
      allowsEdit: true,
      allowsSubmit: true
    },
    40: { 
      label: 'Submitted to Data Provider Approver', 
      tagType: 'primary', 
      cssClass: 'status-ready',
      description: 'Pending data provider approval',
      allowsEdit: false,
      allowsApprove: true,
      allowsReject: true
    },
    50: { 
      label: 'Submitted to KRI Owner Approver', 
      tagType: 'info', 
      cssClass: 'status-submitted',
      description: 'Pending KRI owner approval',
      allowsEdit: false,
      allowsApprove: true,
      allowsReject: true
    },
    60: { 
      label: 'Finalized', 
      tagType: 'success', 
      cssClass: 'status-approved',
      description: 'Data approved and finalized',
      allowsEdit: false,
      allowsView: true
    }
  };

  // Reverse mapping from status labels to numeric values
  static STATUS_LABEL_TO_NUMBER = Object.entries(StatusManager.STATUS_CONFIG)
    .reduce((acc, [key, config]) => {
      acc[config.label] = parseInt(key);
      return acc;
    }, {});

  /**
   * Get status configuration
   * @param {number} status - Status number
   * @returns {Object|null} Status configuration object
   */
  static getStatusConfig(status) {
    if (status === null || status === undefined) {
      return StatusManager.STATUS_CONFIG[10]; // Default to Pending Input
    }
    return StatusManager.STATUS_CONFIG[status] || null;
  }

  /**
   * Map status number to readable string
   * @param {number} status - Status number
   * @returns {string} Status label
   */
  static mapStatus(status) {
    const config = StatusManager.getStatusConfig(status);
    return config ? config.label : `Unknown (${status})`;
  }

  /**
   * Get status tag type for Element UI
   * @param {number} status - Status number
   * @returns {string} Tag type
   */
  static getStatusTagType(status) {
    const config = StatusManager.getStatusConfig(status);
    return config ? config.tagType : 'info';
  }

  /**
   * Get status CSS class
   * @param {number} status - Status number
   * @returns {string} CSS class
   */
  static getStatusCssClass(status) {
    const config = StatusManager.getStatusConfig(status);
    return config ? config.cssClass : 'status-na';
  }

  /**
   * Get status description
   * @param {number} status - Status number
   * @returns {string} Status description
   */
  static getStatusDescription(status) {
    const config = StatusManager.getStatusConfig(status);
    return config ? config.description : 'Unknown status';
  }

  /**
   * Get status tag type from status label string
   * @param {string} statusLabel - Status label
   * @returns {string} Tag type
   */
  static getStatusTagTypeFromLabel(statusLabel) {
    const numericStatus = StatusManager.STATUS_LABEL_TO_NUMBER[statusLabel];
    return StatusManager.getStatusTagType(numericStatus);
  }

  /**
   * Convert status label to numeric value
   * @param {string} statusLabel - Status label
   * @returns {number|null} Numeric status
   */
  static getLabelToNumber(statusLabel) {
    return StatusManager.STATUS_LABEL_TO_NUMBER[statusLabel] || null;
  }

  /**
   * Check if status allows editing
   * @param {number} status - Status number
   * @returns {boolean} Whether editing is allowed
   */
  static allowsEdit(status) {
    const config = StatusManager.getStatusConfig(status);
    return config ? !!config.allowsEdit : false;
  }

  /**
   * Check if status allows submission
   * @param {number} status - Status number
   * @returns {boolean} Whether submission is allowed
   */
  static allowsSubmit(status) {
    const config = StatusManager.getStatusConfig(status);
    return config ? !!config.allowsSubmit : false;
  }

  /**
   * Check if status allows approval
   * @param {number} status - Status number
   * @returns {boolean} Whether approval is allowed
   */
  static allowsApprove(status) {
    const config = StatusManager.getStatusConfig(status);
    return config ? !!config.allowsApprove : false;
  }

  /**
   * Check if status allows rejection
   * @param {number} status - Status number
   * @returns {boolean} Whether rejection is allowed
   */
  static allowsReject(status) {
    const config = StatusManager.getStatusConfig(status);
    return config ? !!config.allowsReject : false;
  }

  /**
   * Get all status options for dropdowns/selects
   * @returns {Array} Array of status options
   */
  static getAllStatusOptions() {
    return Object.entries(StatusManager.STATUS_CONFIG).map(([value, config]) => ({
      value: parseInt(value),
      label: config.label,
      tagType: config.tagType,
      description: config.description
    }));
  }

  /**
   * Get valid next statuses based on workflow logic
   * @param {number} currentStatus - Current status
   * @param {boolean} isOwnerSameAsProvider - Whether KRI owner is same as data provider
   * @returns {Array} Array of valid next statuses
   */
  static getValidNextStatuses(currentStatus, isOwnerSameAsProvider = false) {
    switch (currentStatus) {
    case 10: // Pending Input
    case 20: // Under Rework
    case 30: // Saved
      return [
        30, // Saved
        isOwnerSameAsProvider ? 50 : 40 // Submit directly to KRI Owner or Data Provider
      ];
      
    case 40: // Submitted to Data Provider Approver
      return [
        50, // Approve to KRI Owner
        20  // Reject to Under Rework
      ];
      
    case 50: // Submitted to KRI Owner Approver
      return [
        60, // Approve to Finalized
        20  // Reject to Under Rework
      ];
      
    case 60: // Finalized
      return []; // No further transitions
      
    default:
      return [];
    }
  }

  /**
   * Get workflow action text based on current and next status
   * @param {number} currentStatus - Current status
   * @param {number} nextStatus - Next status
   * @returns {string} Action text
   */
  static getWorkflowActionText(currentStatus, nextStatus) {
    if (nextStatus === 30) return 'Save';
    if (nextStatus === 40) return 'Submit to Data Provider';
    if (nextStatus === 50) return 'Submit to KRI Owner';
    if (nextStatus === 60) return 'Approve & Finalize';
    if (nextStatus === 20) return 'Reject for Rework';
    return 'Update Status';
  }
}

// Export status values for use in other modules
export const STATUS_VALUES = KRIStatus;

// Export static methods as individual functions for backward compatibility
export const mapStatus = StatusManager.mapStatus.bind(StatusManager);
export const getStatusTagType = StatusManager.getStatusTagType.bind(StatusManager);
export const getStatusCssClass = StatusManager.getStatusCssClass.bind(StatusManager);
export const getStatusTagTypeFromLabel = StatusManager.getStatusTagTypeFromLabel.bind(StatusManager);

// Legacy aliases for backward compatibility
export const mapKriStatus = mapStatus;
export const mapAtomicStatus = mapStatus;

// Export the main class
export default StatusManager;