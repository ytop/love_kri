import { kriService } from './kriService';
import { getUserDisplayName } from '@/utils/helpers';

/**
 * KRI Workflow Service
 * 
 * Implements the workflow logic documented in /doc/logicsFlowForKRI.md
 * Handles status transitions and business rules for KRI items
 */
class KRIWorkflowService {
  
  /**
   * Workflow status constants following the documentation
   */
  static STATUS = {
    PENDING_INPUT: 10,
    UNDER_REWORK: 20,
    SAVED: 30,
    SUBMITTED_TO_DATA_PROVIDER: 40,
    SUBMITTED_TO_KRI_OWNER: 50,
    FINALIZED: 60
  };

  /**
   * Status transition mapping
   */
  static TRANSITIONS = {
    // Case 1: Status 10, 20 - Input/Edit operations
    10: {
      save: 30,       // Pending Input -> Saved
      submit: null    // Dynamic based on owner/provider logic
    },
    20: {
      save: 30,       // Under Rework -> Saved  
      submit: null    // Dynamic based on owner/provider logic
    },
    // Case 2: Status 30 - Saved operations
    30: {
      save: 30,       // Saved -> Saved (update value)
      submit: null    // Dynamic based on owner/provider logic
    },
    // Case 3: Status 40, 50 - Approval operations
    40: {
      approve: 50,    // Data Provider -> KRI Owner (or 60 if same person)
      reject: 20      // Any approval -> Under Rework
    },
    50: {
      approve: 60,    // KRI Owner -> Finalized
      reject: 20      // Any approval -> Under Rework
    }
  };

  /**
   * Save a KRI item
   * Case 1 & 2: Status 10/20/30 -> 30 (Saved)
   * 
   * @param {Object} kriItem - KRI item to save
   * @param {Object} updateData - Data to update (e.g., kri_value)
   * @param {Object} currentUser - Current user object
   * @param {string} comment - Optional comment for audit trail
   * @returns {Promise<Object>} Update result
   */
  static async saveKRI(kriItem, updateData = {}, currentUser, comment = '') {
    try {
      // Validate current status allows save operation
      if (![10, 20, 30].includes(kriItem.kri_status || kriItem.kriStatus)) {
        throw new Error(`Cannot save KRI in status ${kriItem.kri_status || kriItem.kriStatus}`);
      }

      // Prepare update data with status transition
      const finalUpdateData = {
        ...updateData,
        kri_status: this.STATUS.SAVED
      };

      // Execute update via kriService
      const result = await kriService.updateKRI(
        kriItem.kri_id || kriItem.kriId || kriItem.id,
        kriItem.reporting_date || kriItem.reportingDate,
        finalUpdateData,
        getUserDisplayName(currentUser),
        'save_kri',
        comment || `KRI saved with status transition to ${this.STATUS.SAVED}`
      );

      return {
        success: true,
        newStatus: this.STATUS.SAVED,
        result
      };

    } catch (error) {
      console.error('KRI save error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Submit a KRI item for approval
   * Case 1 & 2: Status 10/20/30 -> 40 or 50 (based on owner/provider logic)
   * 
   * @param {Object} kriItem - KRI item to submit
   * @param {Object} updateData - Data to update (e.g., kri_value)
   * @param {Object} currentUser - Current user object
   * @param {string} comment - Optional comment for audit trail
   * @returns {Promise<Object>} Update result
   */
  static async submitKRI(kriItem, updateData = {}, currentUser, comment = '') {
    try {
      // Validate current status allows submit operation
      if (![10, 20, 30].includes(kriItem.kri_status || kriItem.kriStatus)) {
        throw new Error(`Cannot submit KRI in status ${kriItem.kri_status || kriItem.kriStatus}`);
      }

      // Determine next status based on owner/provider logic
      const nextStatus = this.getSubmitStatus(kriItem);

      // Prepare update data with status transition
      const finalUpdateData = {
        ...updateData,
        kri_status: nextStatus
      };

      // Execute update via kriService
      const result = await kriService.updateKRI(
        kriItem.kri_id || kriItem.kriId || kriItem.id,
        kriItem.reporting_date || kriItem.reportingDate,
        finalUpdateData,
        getUserDisplayName(currentUser),
        'submit_kri',
        comment || `KRI submitted for ${nextStatus === 40 ? 'data provider' : 'KRI owner'} approval`
      );

      return {
        success: true,
        newStatus: nextStatus,
        result
      };

    } catch (error) {
      console.error('KRI submit error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Approve a KRI item
   * Case 3: Status 40 -> 50 or 60, Status 50 -> 60
   * 
   * @param {Object} kriItem - KRI item to approve
   * @param {Object} currentUser - Current user object
   * @param {string} comment - Optional comment for audit trail
   * @returns {Promise<Object>} Update result
   */
  static async approveKRI(kriItem, currentUser, comment = '') {
    try {
      // Validate current status allows approve operation
      if (![40, 50].includes(kriItem.kri_status || kriItem.kriStatus)) {
        throw new Error(`Cannot approve KRI in status ${kriItem.kri_status || kriItem.kriStatus}`);
      }

      // Determine next status based on current status and owner/provider logic
      const currentStatus = kriItem.kri_status || kriItem.kriStatus;
      let nextStatus;

      if (currentStatus === 40) {
        // Data Provider approval
        // Check if KRI_OWNER == DATA_PROVIDER
        if (this.isSameOwnerProvider(kriItem)) {
          nextStatus = this.STATUS.FINALIZED; // Direct to finalized
        } else {
          nextStatus = this.STATUS.SUBMITTED_TO_KRI_OWNER; // To KRI owner
        }
      } else if (currentStatus === 50) {
        // KRI Owner approval
        nextStatus = this.STATUS.FINALIZED;
      }

      // Execute update via kriService
      const result = await kriService.updateKRI(
        kriItem.kri_id || kriItem.kriId || kriItem.id,
        kriItem.reporting_date || kriItem.reportingDate,
        { kri_status: nextStatus },
        getUserDisplayName(currentUser),
        'approve_kri',
        comment || `KRI approved ${nextStatus === 60 ? 'and finalized' : 'by data provider'}`
      );

      return {
        success: true,
        newStatus: nextStatus,
        result
      };

    } catch (error) {
      console.error('KRI approve error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reject a KRI item
   * Case 3: Status 40/50 -> 20 (Under Rework)
   * 
   * @param {Object} kriItem - KRI item to reject
   * @param {Object} currentUser - Current user object
   * @param {string} rejectReason - Reason for rejection (required)
   * @returns {Promise<Object>} Update result
   */
  static async rejectKRI(kriItem, currentUser, rejectReason) {
    try {
      // Validate current status allows reject operation
      if (![40, 50].includes(kriItem.kri_status || kriItem.kriStatus)) {
        throw new Error(`Cannot reject KRI in status ${kriItem.kri_status || kriItem.kriStatus}`);
      }

      // Validate reject reason is provided
      if (!rejectReason || typeof rejectReason !== 'string' || rejectReason.trim().length === 0) {
        throw new Error('Reject reason is required');
      }

      // Execute update via kriService
      const result = await kriService.updateKRI(
        kriItem.kri_id || kriItem.kriId || kriItem.id,
        kriItem.reporting_date || kriItem.reportingDate,
        { kri_status: this.STATUS.UNDER_REWORK },
        getUserDisplayName(currentUser),
        'reject_kri',
        `KRI rejected: ${rejectReason.trim()}`
      );

      return {
        success: true,
        newStatus: this.STATUS.UNDER_REWORK,
        result
      };

    } catch (error) {
      console.error('KRI reject error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Bulk operation handler
   * Processes multiple KRI items with the same operation
   * 
   * @param {Array} kriItems - Array of KRI items to process
   * @param {string} operation - Operation type ('save', 'submit', 'approve', 'reject')
   * @param {Object} currentUser - Current user object
   * @param {Object} options - Operation-specific options
   * @returns {Promise<Array>} Array of results for each item
   */
  static async bulkOperation(kriItems, operation, currentUser, options = {}) {
    const results = [];
    
    for (const item of kriItems) {
      try {
        let result;
        
        switch (operation) {
          case 'save':
            result = await this.saveKRI(item, options.updateData || {}, currentUser, options.comment);
            break;
          case 'submit':
            result = await this.submitKRI(item, options.updateData || {}, currentUser, options.comment);
            break;
          case 'approve':
            result = await this.approveKRI(item, currentUser, options.comment);
            break;
          case 'reject':
            result = await this.rejectKRI(item, currentUser, options.rejectReason);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        
        results.push({
          item,
          operation,
          ...result
        });
        
      } catch (error) {
        console.error(`Bulk ${operation} error for item:`, item, error);
        results.push({
          item,
          operation,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Determine submit status based on owner/provider logic
   * IF KRI_OWNER == DATA_PROVIDER -> 50 (KRI Owner), ELSE -> 40 (Data Provider)
   * 
   * @param {Object} kriItem - KRI item
   * @returns {number} Next status code
   */
  static getSubmitStatus(kriItem) {
    const owner = kriItem.kri_owner || kriItem.owner;
    const provider = kriItem.data_provider || kriItem.dataProvider;
    
    return this.isSameOwnerProvider(kriItem) ? 
      this.STATUS.SUBMITTED_TO_KRI_OWNER : 
      this.STATUS.SUBMITTED_TO_DATA_PROVIDER;
  }

  /**
   * Check if KRI owner and data provider are the same
   * 
   * @param {Object} kriItem - KRI item
   * @returns {boolean} True if owner and provider are the same
   */
  static isSameOwnerProvider(kriItem) {
    const owner = kriItem.kri_owner || kriItem.owner;
    const provider = kriItem.data_provider || kriItem.dataProvider;
    
    return owner === provider;
  }

  /**
   * Validate if an operation is allowed for a KRI in its current status
   * 
   * @param {Object} kriItem - KRI item
   * @param {string} operation - Operation to validate ('save', 'submit', 'approve', 'reject')
   * @returns {boolean} True if operation is allowed
   */
  static canPerformOperation(kriItem, operation) {
    const currentStatus = kriItem.kri_status || kriItem.kriStatus;
    
    switch (operation) {
      case 'save':
      case 'submit':
        return [10, 20, 30].includes(currentStatus);
      case 'approve':
      case 'reject':
        return [40, 50].includes(currentStatus);
      default:
        return false;
    }
  }

  /**
   * Get the expected next status for an operation
   * 
   * @param {Object} kriItem - KRI item
   * @param {string} operation - Operation type
   * @returns {number|null} Expected next status or null if dynamic/invalid
   */
  static getExpectedNextStatus(kriItem, operation) {
    const currentStatus = kriItem.kri_status || kriItem.kriStatus;
    
    switch (operation) {
      case 'save':
        return [10, 20, 30].includes(currentStatus) ? this.STATUS.SAVED : null;
      case 'submit':
        return [10, 20, 30].includes(currentStatus) ? this.getSubmitStatus(kriItem) : null;
      case 'approve':
        if (currentStatus === 40) {
          return this.isSameOwnerProvider(kriItem) ? this.STATUS.FINALIZED : this.STATUS.SUBMITTED_TO_KRI_OWNER;
        } else if (currentStatus === 50) {
          return this.STATUS.FINALIZED;
        }
        return null;
      case 'reject':
        return [40, 50].includes(currentStatus) ? this.STATUS.UNDER_REWORK : null;
      default:
        return null;
    }
  }

  /**
   * Get human-readable status name
   * 
   * @param {number} statusCode - Numeric status code
   * @returns {string} Human-readable status name
   */
  static getStatusName(statusCode) {
    const statusNames = {
      10: 'Pending Input',
      20: 'Under Rework',
      30: 'Saved',
      40: 'Submitted to Data Provider Approver',
      50: 'Submitted to KRI Owner Approver',
      60: 'Finalized'
    };
    
    return statusNames[statusCode] || `Unknown Status (${statusCode})`;
  }

  /**
   * Get available operations for a KRI item based on its status
   * 
   * @param {Object} kriItem - KRI item
   * @returns {Array} Array of available operation names
   */
  static getAvailableOperations(kriItem) {
    const currentStatus = kriItem.kri_status || kriItem.kriStatus;
    const operations = [];
    
    if ([10, 20, 30].includes(currentStatus)) {
      operations.push('save', 'submit');
    }
    
    if ([40, 50].includes(currentStatus)) {
      operations.push('approve', 'reject');
    }
    
    return operations;
  }

  /**
   * Validate required fields for KRI submission
   * 
   * @param {Object} kriItem - KRI item to validate
   * @returns {Object} Validation result with success flag and errors
   */
  static validateForSubmission(kriItem) {
    const errors = [];
    
    // Check if KRI has a value
    if (!kriItem.kri_value && !kriItem.kriValue) {
      errors.push('KRI value is required for submission');
    }
    
    // Check if required metadata is present
    if (!kriItem.kri_owner && !kriItem.owner) {
      errors.push('KRI owner is required');
    }
    
    if (!kriItem.data_provider && !kriItem.dataProvider) {
      errors.push('Data provider is required');
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  }
}

export { KRIWorkflowService };
export default KRIWorkflowService;