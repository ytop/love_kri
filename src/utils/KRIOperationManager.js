import ActionManager from './ActionManager';
import StatusManager from './StatusManager';
import PermissionManager from './PermissionManager';
import { baseKRIService } from '../services/BaseKRIService';

/**
 * Comprehensive KRI Operation Manager
 * Centralized hub for all KRI operations, combining actions, permissions, and status management
 */
class KRIOperationManager {
  constructor(kriService = null) {
    this.kriService = kriService || baseKRIService;
  }

  /**
   * Get complete KRI operation context for a specific KRI
   * @param {Object} kriItem - KRI item
   * @param {Object} user - Current user
   * @param {Object} userPermissions - User permissions
   * @returns {Object} Complete operation context
   */
  getKRIOperationContext(kriItem, user, userPermissions) {
    const currentStatus = kriItem.kri_status || kriItem.status || 10;
    
    // Get explicit permissions for this KRI
    const permissionKey = PermissionManager.getPermissionKey(kriItem);
    const explicitPermissions = userPermissions[permissionKey] || [];

    // Get all available actions
    const availableActions = ActionManager.getAvailableActions(
      userPermissions, 
      kriItem, 
      currentStatus, 
      explicitPermissions
    );

    // Categorize actions
    const primaryActions = ActionManager.getPrimaryActions(availableActions);
    const secondaryActions = ActionManager.getSecondaryActions(availableActions);
    const actionsByCategory = this.groupActionsByCategory(availableActions);

    // Get workflow information
    const workflowInfo = ActionManager.getWorkflowVisualization(currentStatus, availableActions);
    
    // Get status information
    const statusInfo = {
      current: StatusManager.getStatusConfig(currentStatus),
      validNextStatuses: StatusManager.getValidNextStatuses(
        currentStatus, 
        PermissionManager.isOwnerDataProvider(kriItem)
      ),
      allowsEdit: StatusManager.allowsEdit(currentStatus),
      allowsSubmit: StatusManager.allowsSubmit(currentStatus),
      allowsApprove: StatusManager.allowsApprove(currentStatus),
      allowsReject: StatusManager.allowsReject(currentStatus)
    };

    return {
      kriItem,
      user,
      currentStatus,
      statusInfo,
      availableActions,
      primaryActions,
      secondaryActions,
      actionsByCategory,
      workflowInfo,
      permissions: {
        explicitPermissions,
        hasAnyPermission: PermissionManager.hasAnyPermission(userPermissions, kriItem),
        canView: this.canViewKRI(userPermissions, kriItem)
      }
    };
  }

  /**
   * Execute a KRI action with comprehensive error handling
   * @param {string} actionName - Action to execute
   * @param {Object} operationContext - KRI operation context
   * @param {Object} actionData - Action-specific data
   * @returns {Promise<Object>} Operation result
   */
  async executeKRIAction(actionName, operationContext, actionData = {}) {
    const { kriItem, user, availableActions } = operationContext;

    // Verify action is available
    const action = availableActions.find(a => a.name === actionName);
    if (!action) {
      return {
        success: false,
        error: `Action '${actionName}' is not available for this KRI`,
        code: 'ACTION_NOT_AVAILABLE'
      };
    }

    // Validate required data
    const validation = this.validateActionData(action, actionData);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.message,
        code: 'VALIDATION_FAILED'
      };
    }

    try {
      // Execute the action
      const result = await ActionManager.executeAction(actionName, {
        kriItem,
        user,
        service: this.kriService
      }, actionData);

      if (result.success) {
        // Log the action
        await this.logAction(actionName, kriItem, user, actionData);
        
        // Return success with updated context
        return {
          ...result,
          updatedContext: await this.refreshOperationContext(kriItem, user)
        };
      }

      return result;
    } catch (error) {
      console.error(`Error executing action ${actionName}:`, error);
      return {
        success: false,
        error: error.message || 'Action execution failed',
        code: 'EXECUTION_ERROR'
      };
    }
  }

  /**
   * Get actions for multiple KRIs (bulk operations)
   * @param {Array} kriItems - Array of KRI items
   * @param {Object} user - Current user
   * @param {Object} userPermissions - User permissions
   * @returns {Object} Bulk operation information
   */
  getBulkOperationContext(kriItems, user, userPermissions) {
    const contexts = kriItems.map(kriItem => 
      this.getKRIOperationContext(kriItem, user, userPermissions)
    );

    // Find common actions available for all KRIs
    const commonActions = this.findCommonActions(contexts);
    
    // Group KRIs by status
    const statusGroups = this.groupKRIsByStatus(contexts);

    return {
      contexts,
      commonActions,
      statusGroups,
      canBulkEdit: commonActions.some(action => action.name === 'edit'),
      canBulkSubmit: commonActions.some(action => action.name === 'submit'),
      canBulkApprove: commonActions.some(action => action.name === 'approve')
    };
  }

  /**
   * Create reusable action handlers for Vue components
   * @param {Object} operationContext - KRI operation context
   * @param {Object} componentContext - Vue component context (this)
   * @returns {Object} Action handlers
   */
  createActionHandlers(operationContext, componentContext) {
    const handlers = {};

    operationContext.availableActions.forEach(action => {
      const handlerName = `handle${action.name.charAt(0).toUpperCase() + action.name.slice(1)}`;
      
      handlers[handlerName] = async (actionData = {}) => {
        // Show loading state
        if (componentContext.setLoading) {
          componentContext.setLoading(action.name, true);
        }

        try {
          // Handle confirmation if required
          if (action.requiresConfirmation) {
            const confirmed = await componentContext.showConfirmDialog?.(
              `Confirm ${action.label}`,
              `Are you sure you want to ${action.description.toLowerCase()}?`,
              action.type === 'danger' ? 'warning' : 'info'
            );
            
            if (!confirmed) {
              return { success: false, cancelled: true };
            }
          }

          // Handle comment requirement
          if (action.requiresComment && !actionData.comment) {
            const comment = await componentContext.showInputPrompt?.(
              'Comment Required',
              `Please provide a comment for ${action.description.toLowerCase()}:`
            );
            
            if (!comment) {
              return { success: false, cancelled: true };
            }
            
            actionData.comment = comment;
          }

          // Execute the action
          const result = await this.executeKRIAction(action.name, operationContext, actionData);

          // Show success/error message
          if (result.success) {
            componentContext.$message?.success(result.message);
          } else {
            componentContext.$message?.error(result.error);
          }

          return result;
        } finally {
          // Hide loading state
          if (componentContext.setLoading) {
            componentContext.setLoading(action.name, false);
          }
        }
      };
    });

    return handlers;
  }

  /**
   * Create atomic-level operation context
   * @param {Object} kriItem - KRI item
   * @param {number} atomicId - Atomic ID
   * @param {Object} user - Current user
   * @param {Object} userPermissions - User permissions
   * @returns {Object} Atomic operation context
   */
  getAtomicOperationContext(kriItem, atomicId, user, userPermissions) {
    const currentStatus = kriItem.kri_status || kriItem.status || 10;
    
    const availableActions = ActionManager.getAtomicActions(
      userPermissions, 
      kriItem, 
      atomicId, 
      currentStatus
    );

    return {
      kriItem,
      atomicId,
      user,
      currentStatus,
      availableActions,
      canEdit: PermissionManager.canPerformAtomicAction(userPermissions, kriItem, atomicId, 'editAtomic')
    };
  }

  // Private helper methods

  groupActionsByCategory(availableActions) {
    const grouped = {};
    availableActions.forEach(action => {
      if (!grouped[action.category]) {
        grouped[action.category] = [];
      }
      grouped[action.category].push(action);
    });
    return grouped;
  }

  findCommonActions(contexts) {
    if (contexts.length === 0) return [];
    
    const firstActions = contexts[0].availableActions.map(a => a.name);
    return contexts[0].availableActions.filter(action => 
      contexts.every(ctx => 
        ctx.availableActions.some(a => a.name === action.name)
      )
    );
  }

  groupKRIsByStatus(contexts) {
    const groups = {};
    contexts.forEach(ctx => {
      const status = ctx.currentStatus;
      if (!groups[status]) {
        groups[status] = {
          status,
          label: StatusManager.mapStatus(status),
          contexts: []
        };
      }
      groups[status].contexts.push(ctx);
    });
    return Object.values(groups);
  }

  validateActionData(action, actionData) {
    // Validate required fields based on action requirements
    if (action.requiresComment && (!actionData.comment || actionData.comment.trim() === '')) {
      return { valid: false, message: `Comment is required for ${action.label}` };
    }

    if (action.name === 'save' && actionData.value === undefined) {
      return { valid: false, message: 'Value is required for save action' };
    }

    return { valid: true };
  }

  async logAction(actionName, kriItem, user, actionData) {
    try {
      await baseKRIService.addAuditTrailEntry(
        kriItem.id || kriItem.kri_id,
        kriItem.reportingDate || kriItem.reporting_date,
        actionName,
        'action_executed',
        null,
        JSON.stringify(actionData),
        user.userId,
        `Action ${actionName} executed`
      );
    } catch (error) {
      console.warn('Failed to log action:', error);
    }
  }

  async refreshOperationContext(kriItem, user) {
    // This would typically refetch the KRI data and permissions
    // For now, return null to indicate context should be refreshed by the component
    return null;
  }

  canViewKRI(userPermissions, kriItem) {
    // Implement view permission logic
    return PermissionManager.hasAnyPermission(userPermissions, kriItem);
  }
}

// Export singleton instance
export const kriOperationManager = new KRIOperationManager();

export default KRIOperationManager;