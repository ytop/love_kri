import { USER_PERMISSIONS } from '@/utils/types';

/**
 * Permission utility class for handling KRI and atomic-level permissions
 * 
 * This class provides centralized permission checking logic for the KRI system.
 * It handles both KRI-level and atomic-level permissions without fallback.
 * Users can have different permissions on different KRIs based on the composite key (kri_id, reporting_date).
 * 
 * Permission Format:
 * - Database stores permissions as comma-separated strings in 'actions' field
 * - General permissions: 'edit', 'view', 'review', 'acknowledge', 'delete'
 * - Atomic permissions: 'atomic1_edit', 'atomic2_view', etc.
 * - Atomic permissions do NOT fall back to general permissions
 * 
 * @class Permission
 */
class Permission {
  
  /**
   * Parse comma-separated permission string into an array
   * 
   * @param {string} permissionString - Comma-separated permission string
   * @returns {string[]} Array of individual permissions
   * @static
   */
  static parsePermissionString(permissionString) {
    if (!permissionString || typeof permissionString !== 'string') {
      return [];
    }
    return permissionString.split(',').map(p => p.trim()).filter(p => p.length > 0);
  }

  /**
   * Validate if an action is a valid permission action
   * 
   * @param {string} action - The action to validate
   * @returns {boolean} True if action is valid
   * @static
   */
  static isValidAction(action) {
    return Object.values(USER_PERMISSIONS).includes(action);
  }

  /**
   * Find permission record for a specific KRI
   * 
   * @param {Array} userPermissions - Array of user permission objects
   * @param {number|string} kriId - KRI ID to find permissions for
   * @returns {Object|null} Permission object or null if not found
   * @static
   */
  static findKRIPermission(userPermissions, kriId) {
    if (!Array.isArray(userPermissions)) {
      return null;
    }
    
    const kriIdNum = typeof kriId === 'string' ? parseInt(kriId, 10) : kriId;
    return userPermissions.find(p => p.kri_id === kriIdNum) || null;
  }

  /**
   * Check if user can perform a specific action on a KRI or atomic element
   * 
   * This is the base method for all permission checking. It checks permissions
   * for the specific KRI without any fallback logic between atomic and general permissions.
   * 
   * @param {number|string} kriId - KRI ID to check permissions for
   * @param {number|string|null} atomicId - Atomic ID (null for KRI-level actions)
   * @param {string} action - Action to check (edit, view, review, acknowledge, delete)
   * @param {Array} userPermissions - Array of user permission objects from store
   * @returns {boolean} True if user can perform the action
   * @static
   */
  static canPerform(kriId, atomicId, action, userPermissions) {
    // Validate inputs
    if (!kriId || !action) {
      console.warn('Permission.canPerform: Missing required parameters (kriId, action)');
      return false;
    }

    if (!Permission.isValidAction(action)) {
      console.warn(`Permission.canPerform: Invalid action '${action}'. Valid actions:`, Object.values(USER_PERMISSIONS));
      return false;
    }

    if (!Array.isArray(userPermissions)) {
      console.warn('Permission.canPerform: userPermissions must be an array');
      return false;
    }

    // Find permission record for this KRI
    const permission = Permission.findKRIPermission(userPermissions, kriId);
    if (!permission) {
      return false;
    }

    // Get parsed actions array (should be pre-parsed by initPermission)
    const actionsArray = permission.actionsArray || [];
    if (actionsArray.length === 0) {
      // Try to parse if not pre-parsed (fallback)
      const parsedActions = Permission.parsePermissionString(permission.actions);
      if (parsedActions.length === 0) {
        return false;
      }
      // Use parsed actions for this check
      return Permission._checkActionsArray(parsedActions, atomicId, action);
    }

    return Permission._checkActionsArray(actionsArray, atomicId, action);
  }

  /**
   * Internal method to check if an action exists in the actions array
   * 
   * @param {string[]} actionsArray - Array of permission actions
   * @param {number|string|null} atomicId - Atomic ID (null for KRI-level actions)
   * @param {string} action - Action to check
   * @returns {boolean} True if action is found
   * @static
   * @private
   */
  static _checkActionsArray(actionsArray, atomicId, action) {
    // For atomic-level permissions, check specific atomic permission only
    if (atomicId !== null && atomicId !== undefined) {
      const atomicAction = `atomic${atomicId}_${action}`;
      return actionsArray.includes(atomicAction);
    }
    
    // For KRI-level permissions, check general permission only
    return actionsArray.includes(action);
  }

  /**
   * Check if user can edit a KRI or atomic element
   * 
   * @param {number|string} kriId - KRI ID
   * @param {number|string|null} atomicId - Atomic ID (null for KRI-level)
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user can edit
   * @static
   */
  static canEdit(kriId, atomicId, userPermissions) {
    return Permission.canPerform(kriId, atomicId, USER_PERMISSIONS.EDIT, userPermissions);
  }

  /**
   * Check if user can view a KRI or atomic element
   * 
   * @param {number|string} kriId - KRI ID
   * @param {number|string|null} atomicId - Atomic ID (null for KRI-level)
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user can view
   * @static
   */
  static canView(kriId, atomicId, userPermissions) {
    return Permission.canPerform(kriId, atomicId, USER_PERMISSIONS.VIEW, userPermissions);
  }

  /**
   * Check if user can review a KRI or atomic element
   * Used for Data Provider approval (status 40)
   * 
   * @param {number|string} kriId - KRI ID
   * @param {number|string|null} atomicId - Atomic ID (null for KRI-level)
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user can review
   * @static
   */
  static canReview(kriId, atomicId, userPermissions) {
    return Permission.canPerform(kriId, atomicId, USER_PERMISSIONS.REVIEW, userPermissions);
  }

  /**
   * Check if user can acknowledge a KRI or atomic element
   * Used for KRI Owner approval (status 50)
   * 
   * @param {number|string} kriId - KRI ID
   * @param {number|string|null} atomicId - Atomic ID (null for KRI-level)
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user can acknowledge
   * @static
   */
  static canAcknowledge(kriId, atomicId, userPermissions) {
    return Permission.canPerform(kriId, atomicId, USER_PERMISSIONS.ACKNOWLEDGE, userPermissions);
  }

  /**
   * Check if user can delete a KRI or atomic element
   * 
   * @param {number|string} kriId - KRI ID
   * @param {number|string|null} atomicId - Atomic ID (null for KRI-level)
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user can delete
   * @static
   */
  static canDelete(kriId, atomicId, userPermissions) {
    return Permission.canPerform(kriId, atomicId, USER_PERMISSIONS.DELETE, userPermissions);
  }

  /**
   * Get all permissions for a specific KRI
   * Useful for debugging or displaying user capabilities
   * 
   * @param {number|string} kriId - KRI ID
   * @param {Array} userPermissions - User permissions array
   * @returns {string[]} Array of permissions for the KRI
   * @static
   */
  static getKRIPermissions(kriId, userPermissions) {
    const permission = Permission.findKRIPermission(userPermissions, kriId);
    if (!permission) {
      return [];
    }
    
    return permission.actionsArray || Permission.parsePermissionString(permission.actions);
  }

  /**
   * Check if user has any permissions for a KRI
   * Useful for determining if user should see a KRI at all
   * 
   * @param {number|string} kriId - KRI ID
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user has any permissions for the KRI
   * @static
   */
  static hasAnyPermission(kriId, userPermissions) {
    const permissions = Permission.getKRIPermissions(kriId, userPermissions);
    return permissions.length > 0;
  }

  /**
   * Check if user needs to take action on a KRI based on its status
   * This method determines if a KRI should appear in the "pending" count
   * 
   * @param {Object} kriItem - KRI item object
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user needs to take action on this KRI
   * @static
   */
  static needsUserAction(kriItem, userPermissions) {
    if (!kriItem || !kriItem.kriId) {
      return false;
    }

    const kriId = kriItem.kriId;
    const status = kriItem.kriStatus || kriItem.collectionStatus;

    // Convert string status to number if needed
    let statusNum = status;
    if (typeof status === 'string') {
      const StatusManager = require('@/utils/types').default;
      statusNum = StatusManager.getLabelToNumber(status);
    }

    switch (statusNum) {
    case 10: // PENDING_INPUT
    case 20: // UNDER_REWORK
    case 30: // SAVED
      // User needs edit permission to input/modify data
      return Permission.canEdit(kriId, null, userPermissions);
        
    case 40: // SUBMITTED_TO_DATA_PROVIDER_APPROVER
      // User needs review permission to approve as data provider
      return Permission.canReview(kriId, null, userPermissions);
        
    case 50: // SUBMITTED_TO_KRI_OWNER_APPROVER
      // User needs acknowledge permission to approve as KRI owner
      return Permission.canAcknowledge(kriId, null, userPermissions);

    case 60: // FINALIZED
      // No action needed for finalized status
      return false;
        
    default:
      // Hidden Achievement: why are we here?
      console.warn(`Permission.needsUserAction: Unknown status ${statusNum}`);
      return false;
    }
  }
}

export default Permission;