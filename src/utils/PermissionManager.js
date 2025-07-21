import StatusManager from './StatusManager';

/**
 * Centralized permission management for KRI operations
 * Consolidates duplicate permission logic from helpers.js and components
 */
class PermissionManager {
  /**
   * Check if user can perform action on KRI with current status
   * @param {Object} userPermissions - User's permissions object
   * @param {string} action - Action to check (edit, review, acknowledge, etc.)
   * @param {number} currentStatus - Current KRI status
   * @param {Object} kriItem - KRI item with id and reportingDate
   * @param {number|null} atomicId - Optional atomic ID for atomic-level permissions
   * @returns {boolean} Whether action is allowed
   */
  static canPerformAction(userPermissions, action, currentStatus, kriItem = null, atomicId = null) {
    if (!kriItem) {
      console.log('canPerformAction: No kriItem provided');
      return false;
    }
    
    const key = `${kriItem.id}_${kriItem.reportingDate}`;
    let hasPermission = false;
    
    // Check for atomic-level permission first if atomicId is provided
    if (atomicId !== null && atomicId !== undefined) {
      const atomicPermission = `atomic${atomicId}_${action}`;
      hasPermission = userPermissions[key]?.includes(atomicPermission) || false;
    }
    
    // Fall back to regular permission check
    if (!hasPermission) {
      hasPermission = userPermissions[key]?.includes(action) || false;
    }
    
    console.log('Permission Check:', {
      key,
      action,
      atomicId,
      currentStatus,
      availablePermissions: userPermissions[key],
      hasPermission,
      allUserPermissions: userPermissions
    });
    
    if (!hasPermission) {
      console.log(`canPerformAction: No ${action} permission for ${key}`);
      return false;
    }

    // Status-based checks using StatusManager
    return PermissionManager.isActionAllowedForStatus(action, currentStatus);
  }

  /**
   * Check if action is allowed for given status
   * @param {string} action - Action to check
   * @param {number} currentStatus - Current status
   * @returns {boolean} Whether action is allowed
   */
  static isActionAllowedForStatus(action, currentStatus) {
    switch (action) {
    case 'edit':
      return StatusManager.allowsEdit(currentStatus);
      
    case 'submit':
      return StatusManager.allowsSubmit(currentStatus);
      
    case 'review':
      // Data Provider Approver - can review status 40
      return currentStatus === 40 && StatusManager.allowsApprove(currentStatus);
      
    case 'acknowledge':
      // KRI Owner Approver - can acknowledge status 50
      return currentStatus === 50 && StatusManager.allowsApprove(currentStatus);
      
    case 'approve':
      return StatusManager.allowsApprove(currentStatus);
      
    case 'reject':
      return StatusManager.allowsReject(currentStatus);
      
    default:
      return true; // Allow other actions if permission exists
    }
  }

  /**
   * Check if KRI owner is the same as data provider
   * @param {Object} kriItem - KRI item with owner and dataProvider
   * @returns {boolean} Whether owner equals data provider
   */
  static isOwnerDataProvider(kriItem) {
    if (!kriItem) return false;
    return kriItem.owner === kriItem.dataProvider || kriItem.kri_owner === kriItem.data_provider;
  }

  /**
   * Get status after input - determine next status based on business logic
   * @param {Object} userPermissions - User permissions (unused but kept for compatibility)
   * @param {Object} kriItem - KRI item
   * @returns {number} Next status (40 or 50)
   */
  static getInputStatus(userPermissions, kriItem) {
    if (!kriItem) {
      return 40; // Default to Data Provider Approver
    }
    
    // Business logic: If KRI owner is same as data provider, skip Data Provider Approver
    if (PermissionManager.isOwnerDataProvider(kriItem)) {
      return 50; // Submit directly to KRI Owner Approver
    } else {
      return 40; // Submit to Data Provider Approver first
    }
  }

  /**
   * Get next status based on current status and action
   * @param {number} currentStatus - Current status
   * @param {string} action - Action being performed
   * @param {Object} kriItem - KRI item for business logic
   * @returns {number|null} Next status or null if invalid transition
   */
  static getNextStatus(currentStatus, action, kriItem = null) {
    // Use StatusManager for workflow logic
    const validNextStatuses = StatusManager.getValidNextStatuses(
      currentStatus, 
      kriItem ? PermissionManager.isOwnerDataProvider(kriItem) : false
    );

    switch (action) {
    case 'save':
      return validNextStatuses.includes(30) ? 30 : null; // Saved status
      
    case 'submit':
      // Return the submission status (either 40 or 50 based on business logic)
      return validNextStatuses.find(status => [40, 50].includes(status)) || null;
      
    case 'approve':
      if (currentStatus === 40) return 50; // Data Provider → KRI Owner
      if (currentStatus === 50) return 60; // KRI Owner → Finalized
      return null;
      
    case 'reject':
      return validNextStatuses.includes(20) ? 20 : null; // Under Rework
      
    default:
      return null;
    }
  }

  /**
   * Get available actions for user on KRI item
   * @param {Object} userPermissions - User permissions
   * @param {Object} kriItem - KRI item
   * @param {number} currentStatus - Current status
   * @returns {Array} Array of available actions
   */
  static getAvailableActions(userPermissions, kriItem, currentStatus) {
    const actions = ['edit', 'submit', 'review', 'acknowledge', 'approve', 'reject'];
    
    return actions.filter(action => 
      PermissionManager.canPerformAction(userPermissions, action, currentStatus, kriItem)
    );
  }

  /**
   * Check if user has any permissions for a specific KRI
   * @param {Object} userPermissions - User permissions
   * @param {Object} kriItem - KRI item
   * @returns {boolean} Whether user has any permissions
   */
  static hasAnyPermission(userPermissions, kriItem) {
    if (!kriItem || !userPermissions) return false;
    
    const key = `${kriItem.id}_${kriItem.reportingDate}`;
    return userPermissions[key] && userPermissions[key].length > 0;
  }

  /**
   * Get permission key for KRI item
   * @param {Object} kriItem - KRI item with id and reportingDate
   * @returns {string} Permission key
   */
  static getPermissionKey(kriItem) {
    if (!kriItem) return '';
    return `${kriItem.id}_${kriItem.reportingDate}`;
  }

  /**
   * Check atomic-level permissions
   * @param {Object} userPermissions - User permissions
   * @param {Object} kriItem - KRI item
   * @param {number} atomicId - Atomic ID
   * @param {string} action - Action to check
   * @returns {boolean} Whether atomic action is allowed
   */
  static canPerformAtomicAction(userPermissions, kriItem, atomicId, action) {
    return PermissionManager.canPerformAction(userPermissions, action, null, kriItem, atomicId);
  }
}

export default PermissionManager;