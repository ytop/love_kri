import StatusManager from './StatusManager';
import PermissionManager from './PermissionManager';

/**
 * Centralized action management system for KRI operations
 * Provides reusable action definitions and permission-based action availability
 */
class ActionManager {
  // Define all possible KRI actions with metadata
  static ACTION_DEFINITIONS = {
    // Data Entry Actions
    edit: {
      label: 'Edit',
      icon: 'el-icon-edit',
      type: 'primary',
      category: 'data',
      description: 'Edit KRI data',
      requiresConfirmation: false,
      validStatuses: [10, 20, 30]
    },
    
    save: {
      label: 'Save',
      icon: 'el-icon-document',
      type: 'success',
      category: 'data',
      description: 'Save changes without submitting',
      requiresConfirmation: false,
      validStatuses: [10, 20, 30],
      nextStatus: 30
    },

    submit: {
      label: 'Submit',
      icon: 'el-icon-s-promotion',
      type: 'primary',
      category: 'workflow',
      description: 'Submit for approval',
      requiresConfirmation: true,
      validStatuses: [10, 20, 30],
      nextStatusLogic: 'dynamic' // Determined by business logic
    },

    // Approval Actions
    approve: {
      label: 'Approve',
      icon: 'el-icon-check',
      type: 'success',
      category: 'approval',
      description: 'Approve and move to next stage',
      requiresConfirmation: true,
      validStatuses: [40, 50],
      nextStatusLogic: 'workflow'
    },

    reject: {
      label: 'Reject',
      icon: 'el-icon-close',
      type: 'danger',
      category: 'approval',
      description: 'Reject and send back for rework',
      requiresConfirmation: true,
      requiresComment: true,
      validStatuses: [40, 50],
      nextStatus: 20
    },

    // Review Actions
    review: {
      label: 'Review',
      icon: 'el-icon-view',
      type: 'primary',
      category: 'review',
      description: 'Review data as Data Provider',
      requiresConfirmation: false,
      validStatuses: [40]
    },

    acknowledge: {
      label: 'Acknowledge',
      icon: 'el-icon-finished',
      type: 'success',
      category: 'review',
      description: 'Acknowledge as KRI Owner',
      requiresConfirmation: true,
      validStatuses: [50],
      nextStatus: 60
    },

    // File Actions
    uploadEvidence: {
      label: 'Upload Evidence',
      icon: 'el-icon-upload',
      type: 'primary',
      category: 'evidence',
      description: 'Upload supporting evidence',
      requiresConfirmation: false,
      validStatuses: [10, 20, 30, 40, 50, 60]
    },

    deleteEvidence: {
      label: 'Delete Evidence',
      icon: 'el-icon-delete',
      type: 'danger',
      category: 'evidence',
      description: 'Delete evidence file',
      requiresConfirmation: true,
      validStatuses: [10, 20, 30]
    },

    // View Actions
    viewDetail: {
      label: 'View Detail',
      icon: 'el-icon-view',
      type: 'info',
      category: 'view',
      description: 'View KRI details',
      requiresConfirmation: false,
      validStatuses: [10, 20, 30, 40, 50, 60]
    },

    viewAuditTrail: {
      label: 'View Audit Trail',
      icon: 'el-icon-s-order',
      type: 'info',
      category: 'audit',
      description: 'View change history',
      requiresConfirmation: false,
      validStatuses: [10, 20, 30, 40, 50, 60]
    },

    // Atomic Data Actions
    editAtomic: {
      label: 'Edit Atomic Data',
      icon: 'el-icon-edit-outline',
      type: 'primary',
      category: 'atomic',
      description: 'Edit atomic level data',
      requiresConfirmation: false,
      validStatuses: [10, 20, 30],
      supportsAtomicLevel: true
    },

    calculateKRI: {
      label: 'Calculate KRI',
      icon: 'el-icon-s-data',
      type: 'warning',
      category: 'calculation',
      description: 'Recalculate KRI value from atomics',
      requiresConfirmation: true,
      validStatuses: [10, 20, 30]
    }
  };

  /**
   * Get action definition by action name
   * @param {string} actionName - Name of the action
   * @returns {Object|null} Action definition
   */
  static getActionDefinition(actionName) {
    return ActionManager.ACTION_DEFINITIONS[actionName] || null;
  }

  /**
   * Get all available actions for a KRI based on permissions and status
   * @param {Object} userPermissions - User permissions
   * @param {Object} kriItem - KRI item
   * @param {number} currentStatus - Current KRI status
   * @param {Array} explicitPermissions - Explicit permission list for this KRI
   * @returns {Array} Array of available action objects
   */
  static getAvailableActions(userPermissions, kriItem, currentStatus, explicitPermissions = []) {
    const availableActions = [];

    for (const [actionName, actionDef] of Object.entries(ActionManager.ACTION_DEFINITIONS)) {
      // Check if action is valid for current status
      if (!actionDef.validStatuses.includes(currentStatus)) {
        continue;
      }

      // Check if user has permission for this action
      const hasPermission = explicitPermissions.includes(actionName) ||
        PermissionManager.canPerformAction(userPermissions, actionName, currentStatus, kriItem);

      if (hasPermission) {
        availableActions.push({
          name: actionName,
          ...actionDef,
          nextStatus: ActionManager.calculateNextStatus(actionName, currentStatus, kriItem)
        });
      }
    }

    return availableActions;
  }

  /**
   * Calculate next status for an action
   * @param {string} actionName - Name of the action
   * @param {number} currentStatus - Current status
   * @param {Object} kriItem - KRI item for business logic
   * @returns {number|null} Next status
   */
  static calculateNextStatus(actionName, currentStatus, kriItem) {
    const actionDef = ActionManager.getActionDefinition(actionName);
    if (!actionDef) return null;

    // If action has explicit next status, use it
    if (actionDef.nextStatus) {
      return actionDef.nextStatus;
    }

    // If action uses workflow logic, calculate based on current status
    if (actionDef.nextStatusLogic === 'workflow') {
      return PermissionManager.getNextStatus(currentStatus, actionName, kriItem);
    }

    // If action uses dynamic logic, use business rules
    if (actionDef.nextStatusLogic === 'dynamic') {
      if (actionName === 'submit') {
        return PermissionManager.isOwnerDataProvider(kriItem) ? 50 : 40;
      }
    }

    return null;
  }

  /**
   * Get actions by category
   * @param {string} category - Action category
   * @param {Array} availableActions - List of available actions
   * @returns {Array} Actions in the specified category
   */
  static getActionsByCategory(category, availableActions) {
    return availableActions.filter(action => action.category === category);
  }

  /**
   * Get primary actions (most commonly used)
   * @param {Array} availableActions - List of available actions
   * @returns {Array} Primary actions
   */
  static getPrimaryActions(availableActions) {
    const primaryActionNames = ['edit', 'save', 'submit', 'approve', 'reject'];
    return availableActions.filter(action => primaryActionNames.includes(action.name));
  }

  /**
   * Get secondary actions (less commonly used)
   * @param {Array} availableActions - List of available actions
   * @returns {Array} Secondary actions
   */
  static getSecondaryActions(availableActions) {
    const primaryActionNames = ['edit', 'save', 'submit', 'approve', 'reject'];
    return availableActions.filter(action => !primaryActionNames.includes(action.name));
  }

  /**
   * Create action button configuration for Element UI
   * @param {Object} action - Action object
   * @param {Function} clickHandler - Click handler function
   * @returns {Object} Button configuration
   */
  static createButtonConfig(action, clickHandler) {
    return {
      label: action.label,
      type: action.type,
      icon: action.icon,
      disabled: false,
      loading: false,
      onClick: clickHandler,
      confirmation: action.requiresConfirmation ? {
        title: `Confirm ${action.label}`,
        message: `Are you sure you want to ${action.description.toLowerCase()}?`,
        type: action.type === 'danger' ? 'warning' : 'info'
      } : null,
      tooltip: action.description
    };
  }

  /**
   * Get atomic-level actions for a specific atomic element
   * @param {Object} userPermissions - User permissions
   * @param {Object} kriItem - KRI item
   * @param {number} atomicId - Atomic ID
   * @param {number} currentStatus - Current status
   * @returns {Array} Available atomic actions
   */
  static getAtomicActions(userPermissions, kriItem, atomicId, currentStatus) {
    const atomicActions = [];

    for (const [actionName, actionDef] of Object.entries(ActionManager.ACTION_DEFINITIONS)) {
      // Skip non-atomic actions
      if (!actionDef.supportsAtomicLevel) {
        continue;
      }

      // Check status validity
      if (!actionDef.validStatuses.includes(currentStatus)) {
        continue;
      }

      // Check atomic-level permissions
      if (PermissionManager.canPerformAtomicAction(userPermissions, kriItem, atomicId, actionName)) {
        atomicActions.push({
          name: actionName,
          ...actionDef,
          atomicId: atomicId
        });
      }
    }

    return atomicActions;
  }

  /**
   * Execute an action with consistent handling
   * @param {string} actionName - Action to execute
   * @param {Object} actionContext - Context object with kriItem, user, etc.
   * @param {Object} actionData - Additional data for the action
   * @returns {Promise<Object>} Action result
   */
  static async executeAction(actionName, actionContext, actionData = {}) {
    const actionDef = ActionManager.getActionDefinition(actionName);
    if (!actionDef) {
      throw new Error(`Unknown action: ${actionName}`);
    }

    const { kriItem, user, service } = actionContext;

    try {
      let result;

      switch (actionName) {
      case 'save':
        result = await service.saveKRIValue(
          kriItem.id,
          kriItem.reportingDate,
          actionData.value,
          user.userId
        );
        break;

      case 'submit':
        result = await service.submitKRIValue(
          kriItem.id,
          kriItem.reportingDate,
          user.userId
        );
        break;

      case 'approve':
        result = await service.approveKRI(
          kriItem.id,
          kriItem.reportingDate,
          user.userId,
          actionData.comment
        );
        break;

      case 'reject':
        result = await service.rejectKRI(
          kriItem.id,
          kriItem.reportingDate,
          user.userId,
          actionData.reason
        );
        break;

      default:
        throw new Error(`Action execution not implemented for: ${actionName}`);
      }

      return {
        success: true,
        data: result,
        message: `${actionDef.label} completed successfully`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to ${actionDef.description.toLowerCase()}`
      };
    }
  }

  /**
   * Get workflow visualization data
   * @param {number} currentStatus - Current status
   * @param {Array} availableActions - Available actions
   * @returns {Object} Workflow visualization data
   */
  static getWorkflowVisualization(currentStatus, availableActions) {
    const currentStatusConfig = StatusManager.getStatusConfig(currentStatus);
    const nextStatuses = availableActions
      .filter(action => action.nextStatus)
      .map(action => ({
        action: action.name,
        nextStatus: action.nextStatus,
        label: StatusManager.mapStatus(action.nextStatus)
      }));

    return {
      currentStatus: {
        value: currentStatus,
        label: currentStatusConfig.label,
        type: currentStatusConfig.tagType
      },
      possibleTransitions: nextStatuses,
      availableActions: availableActions.map(action => ({
        name: action.name,
        label: action.label,
        category: action.category
      }))
    };
  }
}

export default ActionManager;