import { USER_PERMISSIONS } from '@/utils/types';

/**
 * Permission utility class for handling KRI and atomic-level permissions
 * 
 * This class provides centralized permission checking logic for the KRI system.
 * It handles both KRI-level and atomic-level permissions without fallback.
 * Users can have different permissions on different KRIs based on the composite key (kri_id, reporting_date).
 * 
 * Permission Format (NORMALIZED):
 * - Database stores permissions as individual rows in kri_user_permission table
 * - Each permission is a separate record with 'action' field
 * - General permissions: 'edit', 'view', 'review', 'acknowledge', 'delete'
 * - Atomic permissions: 'atomic1.edit', 'atomic2.view', etc. (dot notation)
 * - Atomic permissions do NOT fall back to general permissions
 * 
 * @class Permission
 */
class Permission {
  
  /**
   * Extract actions array from normalized permission records for a specific KRI
   * 
   * @param {Array} permissionRecords - Array of permission record objects
   * @returns {string[]} Array of individual permission actions
   * @static
   */
  static extractActionsFromRecords(permissionRecords) {
    if (!Array.isArray(permissionRecords)) {
      return [];
    }
    return permissionRecords
      .filter(record => record.effect !== false) // Only include allowed permissions
      .map(record => record.action)
      .filter(action => action && typeof action === 'string');
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
   * Find permission records for a specific KRI
   * 
   * @param {Array} userPermissions - Array of user permission record objects
   * @param {number|string} kriId - KRI ID to find permissions for
   * @returns {Array} Array of permission records for the KRI
   * @static
   */
  static findKRIPermissions(userPermissions, kriId) {
    if (!Array.isArray(userPermissions)) {
      return [];
    }
    
    const kriIdNum = typeof kriId === 'string' ? parseInt(kriId, 10) : kriId;
    return userPermissions.filter(p => p.kri_id === kriIdNum);
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
   * @param {Array} userPermissions - Array of user permission record objects from store
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

    // Find permission records for this KRI
    const permissionRecords = Permission.findKRIPermissions(userPermissions, kriId);
    if (permissionRecords.length === 0) {
      return false;
    }

    // Build the expected action string based on atomic ID
    const expectedAction = atomicId !== null && atomicId !== undefined 
      ? `atomic${atomicId}.${action}` 
      : action;

    // Check if the user has the specific permission and it's allowed (effect=true)
    return permissionRecords.some(record => 
      record.action === expectedAction && record.effect !== false
    );
  }

  /**
   * Get all permission actions for a specific KRI (for debugging/display)
   * 
   * @param {Array} permissionRecords - Array of permission record objects
   * @returns {string[]} Array of permission actions for the KRI
   * @static
   */
  static _extractActionsFromRecords(permissionRecords) {
    if (!Array.isArray(permissionRecords)) {
      return [];
    }
    
    return permissionRecords
      .filter(record => record.effect !== false) // Only allowed permissions
      .map(record => record.action)
      .filter(action => action && typeof action === 'string');
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
   * Check if user can download evidence/content for a KRI or atomic element
   * 
   * @param {number|string} kriId - KRI ID 
   * @param {number|string|null} atomicId - Atomic ID (null for KRI-level)
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user can download
   * @static
   */
  static canDownload(kriId, atomicId, userPermissions) {
    return Permission.canPerform(kriId, atomicId, USER_PERMISSIONS.DOWNLOAD, userPermissions);
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
    const permissionRecords = Permission.findKRIPermissions(userPermissions, kriId);
    return Permission._extractActionsFromRecords(permissionRecords);
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
    const permissionRecords = Permission.findKRIPermissions(userPermissions, kriId);
    return permissionRecords.some(record => record.effect !== false);
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

  /**
   * Check if KRI status requires evidence upload (Case 1 logic)
   * Used for validating save operations
   * 
   * @param {number|string} kriStatus - KRI status code
   * @returns {boolean} True if evidence is required for this status
   * @static
   */
  static requiresEvidenceUpload(kriStatus) {
    const status = typeof kriStatus === 'string' ? parseInt(kriStatus, 10) : kriStatus;
    return status === 10 || status === 20; // Pending Input or Under Rework
  }

  /**
   * Check if user can save KRI (includes evidence requirement validation)
   * Combines permission checking with business logic validation
   * 
   * @param {number|string} kriId - KRI ID
   * @param {Object} kriItem - KRI item with status and value
   * @param {Array} evidenceData - Evidence files array
   * @param {Array} userPermissions - User permissions array
   * @param {*} inputValue - Optional input value to validate (null uses kriItem.kri_value)
   * @returns {boolean} True if user can save the KRI
   * @static
   */
  static canSaveKRI(kriId, kriItem, evidenceData, userPermissions, inputValue = null) {
    if (!kriItem || !Permission.canEdit(kriId, null, userPermissions)) {
      return false;
    }

    // Check if input value is valid (either from parameter or from KRI item)
    const valueToCheck = inputValue !== null ? inputValue : kriItem.kri_value;
    const hasValidValue = valueToCheck !== null && valueToCheck !== undefined && valueToCheck !== '';
    
    if (!hasValidValue) {
      return false;
    }

    // For case 1 statuses (10, 20), evidence is required
    if (Permission.requiresEvidenceUpload(kriItem.kri_status)) {
      const hasEvidence = evidenceData && Array.isArray(evidenceData) && evidenceData.length > 0;
      return hasEvidence;
    }

    // For other statuses, only value and permission validation is needed
    return true;
  }

  /**
   * Get validation message for save operations
   * Provides user-friendly feedback about why save is disabled
   * 
   * @param {number|string} kriId - KRI ID
   * @param {Object} kriItem - KRI item with status and value
   * @param {Array} evidenceData - Evidence files array
   * @param {Array} userPermissions - User permissions array
   * @param {*} inputValue - Optional input value to validate
   * @returns {string|null} Validation error message or null if valid
   * @static
   */
  static getSaveValidationMessage(kriId, kriItem, evidenceData, userPermissions, inputValue = null) {
    if (!kriItem) {
      return 'Invalid KRI data';
    }

    if (!Permission.canEdit(kriId, null, userPermissions)) {
      return 'You do not have permission to edit this KRI';
    }

    const valueToCheck = inputValue !== null ? inputValue : kriItem.kri_value;
    const hasValidValue = valueToCheck !== null && valueToCheck !== undefined && valueToCheck !== '';
    
    if (!hasValidValue) {
      return 'Please enter a KRI value';
    }

    if (Permission.requiresEvidenceUpload(kriItem.kri_status)) {
      const hasEvidence = evidenceData && Array.isArray(evidenceData) && evidenceData.length > 0;
      if (!hasEvidence) {
        return 'Evidence upload is required before saving';
      }
    }

    return null; // No validation error
  }

  // ================================== ROLE-BASED PERMISSION METHODS ==================================

  /**
   * Check if user is a system administrator
   * System admins have access to all functions and can manage all users
   * 
   * @param {Object} user - User object with role information
   * @returns {boolean} True if user is system admin
   * @static
   */
  static isSystemAdmin(user) {
    if (!user || !user.user_role) {
      return false;
    }
    return user.user_role === 'admin';
  }

  /**
   * Check if user is a department administrator
   * Department admins can manage users and permissions within their department
   * 
   * @param {Object} user - User object with role information
   * @returns {boolean} True if user is department admin
   * @static
   */
  static isDepartmentAdmin(user) {
    if (!user || !user.user_role) {
      return false;
    }
    return user.user_role === 'dept_admin';
  }

  /**
   * Check if user can manage a specific department
   * System admins can manage all departments
   * Department admins can only manage their own department
   * 
   * @param {Object} currentUser - Current user object
   * @param {string} targetDepartment - Department to check access for
   * @returns {boolean} True if user can manage the department
   * @static
   */
  static canManageDepartment(currentUser, targetDepartment) {
    if (!currentUser || !targetDepartment) {
      return false;
    }

    // System admins can manage all departments
    if (Permission.isSystemAdmin(currentUser)) {
      return true;
    }

    // Department admins can only manage their own department
    if (Permission.isDepartmentAdmin(currentUser)) {
      return currentUser.department === targetDepartment;
    }

    return false;
  }

  /**
   * Check if current user can manage another user
   * System admins can manage all users
   * Department admins can manage users in their department (except other admins)
   * Regular users cannot manage other users
   * 
   * @param {Object} currentUser - Current user object
   * @param {Object} targetUser - User to be managed
   * @returns {boolean} True if current user can manage target user
   * @static
   */
  static canManageUser(currentUser, targetUser) {
    if (!currentUser || !targetUser) {
      return false;
    }

    // System admins can manage all users
    if (Permission.isSystemAdmin(currentUser)) {
      return true;
    }

    // Department admins can manage users in their department
    if (Permission.isDepartmentAdmin(currentUser)) {
      // Cannot manage users from other departments
      if (currentUser.department !== targetUser.department) {
        return false;
      }
      
      // Cannot manage other admins or department admins
      if (Permission.isSystemAdmin(targetUser) || Permission.isDepartmentAdmin(targetUser)) {
        return false;
      }
      
      return true;
    }

    // Regular users cannot manage other users
    return false;
  }

  /**
   * Check if user can assign permissions for a specific KRI
   * System admins can assign permissions for all KRIs
   * Department admins can assign permissions for KRIs owned by their department
   * 
   * @param {Object} currentUser - Current user object
   * @param {Object} kriMetadata - KRI metadata with owner information
   * @returns {boolean} True if user can assign permissions for this KRI
   * @static
   */
  static canAssignPermissions(currentUser, kriMetadata) {
    if (!currentUser || !kriMetadata) {
      return false;
    }

    // System admins can assign permissions for all KRIs
    if (Permission.isSystemAdmin(currentUser)) {
      return true;
    }

    // Department admins can assign permissions for KRIs owned by their department
    if (Permission.isDepartmentAdmin(currentUser)) {
      // Check if current user's department matches KRI owner
      return currentUser.department === kriMetadata.owner;
    }

    return false;
  }

  /**
   * Get all KRIs that a user can manage permissions for
   * This method would typically be used with database queries
   * 
   * @param {Object} currentUser - Current user object
   * @param {Array} allKRIs - Array of all KRI metadata objects
   * @returns {Array} Array of KRIs the user can manage
   * @static
   */
  static getManageableKRIs(currentUser, allKRIs) {
    if (!currentUser || !Array.isArray(allKRIs)) {
      return [];
    }

    // System admins can manage all KRIs
    if (Permission.isSystemAdmin(currentUser)) {
      return allKRIs;
    }

    // Department admins can manage KRIs owned by their department
    if (Permission.isDepartmentAdmin(currentUser)) {
      return allKRIs.filter(kri => kri.owner === currentUser.department);
    }

    // Regular users cannot manage KRI permissions
    return [];
  }

  /**
   * Check if user can promote/demote another user's role
   * System admins can change any user's role (except other system admins)
   * Department admins can promote users in their department to dept_admin (but not to admin)
   * 
   * @param {Object} currentUser - Current user object
   * @param {Object} targetUser - User whose role would be changed
   * @param {string} newRole - New role to assign ('user', 'dept_admin', 'admin')
   * @returns {boolean} True if role change is allowed
   * @static
   */
  static canChangeUserRole(currentUser, targetUser, newRole) {
    if (!currentUser || !targetUser || !newRole) {
      return false;
    }

    const validRoles = ['user', 'dept_admin', 'admin'];
    if (!validRoles.includes(newRole)) {
      return false;
    }

    // System admins can change any user's role
    if (Permission.isSystemAdmin(currentUser)) {
      // Cannot demote other system admins
      if (Permission.isSystemAdmin(targetUser) && targetUser.uuid !== currentUser.uuid) {
        return false;
      }
      return true;
    }

    // Department admins have limited role change abilities
    if (Permission.isDepartmentAdmin(currentUser)) {
      // Can only manage users in their department
      if (currentUser.department !== targetUser.department) {
        return false;
      }
      
      // Cannot promote to system admin
      if (newRole === 'admin') {
        return false;
      }
      
      // Cannot manage other admins or dept admins
      if (Permission.isSystemAdmin(targetUser) || 
          (Permission.isDepartmentAdmin(targetUser) && targetUser.uuid !== currentUser.uuid)) {
        return false;
      }
      
      return true;
    }

    // Regular users cannot change roles
    return false;
  }

  /**
   * Get the highest role a user can assign to others
   * Used for UI role selection dropdowns
   * 
   * @param {Object} currentUser - Current user object
   * @returns {string[]} Array of roles the user can assign
   * @static
   */
  static getAssignableRoles(currentUser) {
    if (!currentUser) {
      return [];
    }

    // System admins can assign all roles
    if (Permission.isSystemAdmin(currentUser)) {
      return ['user', 'dept_admin', 'admin'];
    }

    // Department admins can assign user and dept_admin roles
    if (Permission.isDepartmentAdmin(currentUser)) {
      return ['user', 'dept_admin'];
    }

    // Regular users cannot assign roles
    return [];
  }

  /**
   * Check if user needs admin interface access
   * Used for navigation and UI rendering decisions
   * 
   * @param {Object} user - User object
   * @returns {boolean} True if user should have admin interface access
   * @static
   */
  static needsAdminInterface(user) {
    return Permission.isSystemAdmin(user) || Permission.isDepartmentAdmin(user);
  }

  /**
   * Check if user can download general KRI evidence
   * Checks for 'evidence.download' permission
   * 
   * @param {number|string} kriId - KRI ID
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user can download KRI evidence
   * @static
   */
  static canDownloadEvidence(kriId, userPermissions) {
    if (!kriId || !Array.isArray(userPermissions)) {
      return false;
    }

    // Check for evidence.download permission specifically
    const permissionRecords = Permission.findKRIPermissions(userPermissions, kriId);
    const actions = Permission.extractActionsFromRecords(permissionRecords);
    
    return actions.includes('evidence.download');
  }

  /**
   * Check if user can download atomic-level evidence
   * Checks for 'atomic{n}.evidence.download' permission, with fallback to general evidence.download
   * 
   * @param {number|string} kriId - KRI ID
   * @param {number|string} atomicId - Atomic ID
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user can download atomic evidence
   * @static
   */
  static canDownloadAtomicEvidence(kriId, atomicId, userPermissions) {
    if (!kriId || !atomicId || !Array.isArray(userPermissions)) {
      return false;
    }

    const permissionRecords = Permission.findKRIPermissions(userPermissions, kriId);
    const actions = Permission.extractActionsFromRecords(permissionRecords);
    
    // Check for specific atomic evidence download permission
    const atomicEvidenceDownload = `atomic${atomicId}.evidence.download`;
    if (actions.includes(atomicEvidenceDownload)) {
      return true;
    }
    
    // Fallback to general evidence download permission
    return actions.includes('evidence.download');
  }

  /**
   * Check if user can download any evidence (general or atomic) for a KRI
   * Convenience method that checks both general and atomic evidence permissions
   * 
   * @param {number|string} kriId - KRI ID
   * @param {number|string|null} atomicId - Atomic ID (null for general evidence)
   * @param {Array} userPermissions - User permissions array
   * @returns {boolean} True if user can download evidence
   * @static
   */
  static canDownloadAnyEvidence(kriId, atomicId, userPermissions) {
    if (atomicId) {
      return Permission.canDownloadAtomicEvidence(kriId, atomicId, userPermissions);
    } else {
      return Permission.canDownloadEvidence(kriId, userPermissions);
    }
  }
}

export default Permission;