import { kriOperationManager } from '@/utils/KRIOperationManager';
import { commonMixin } from './validationMixin';

/**
 * KRI Operation Mixin - Provides reusable KRI operation functionality for Vue components
 * Eliminates duplicate action handling logic across components
 */
export const kriOperationMixin = {
  mixins: [commonMixin],
  
  data() {
    return {
      operationContext: null,
      actionHandlers: {},
      refreshing: false
    };
  },

  computed: {
    /**
     * Get current KRI status information
     */
    statusInfo() {
      return this.operationContext?.statusInfo || {};
    },

    /**
     * Get available primary actions
     */
    primaryActions() {
      return this.operationContext?.primaryActions || [];
    },

    /**
     * Get available secondary actions
     */
    secondaryActions() {
      return this.operationContext?.secondaryActions || [];
    },

    /**
     * Get actions grouped by category
     */
    actionsByCategory() {
      return this.operationContext?.actionsByCategory || {};
    },

    /**
     * Check if user can edit current KRI
     */
    canEdit() {
      return this.statusInfo.allowsEdit && this.hasAction('edit');
    },

    /**
     * Check if user can submit current KRI
     */
    canSubmit() {
      return this.statusInfo.allowsSubmit && this.hasAction('submit');
    },

    /**
     * Check if user can approve current KRI
     */
    canApprove() {
      return this.statusInfo.allowsApprove && this.hasAction('approve');
    },

    /**
     * Check if user can reject current KRI
     */
    canReject() {
      return this.statusInfo.allowsReject && this.hasAction('reject');
    },

    /**
     * Get workflow visualization data
     */
    workflowInfo() {
      return this.operationContext?.workflowInfo || {};
    }
  },

  methods: {
    /**
     * Initialize KRI operation context
     * @param {Object} kriItem - KRI item
     * @param {Object} user - Current user (optional, uses $store if not provided)
     * @param {Object} userPermissions - User permissions (optional, uses $store if not provided)
     */
    async initializeKRIOperations(kriItem, user = null, userPermissions = null) {
      try {
        this.setLoading('init', true);

        const currentUser = user || this.$store.getters['auth/currentUser'] || this.$store.state.user?.currentUser;
        const permissions = userPermissions || this.$store.getters['auth/userPermissions'] || this.$store.state.user?.permissions;

        if (!currentUser || !permissions) {
          throw new Error('User or permissions not available');
        }

        // Get operation context
        this.operationContext = kriOperationManager.getKRIOperationContext(
          kriItem,
          currentUser,
          permissions
        );

        // Create action handlers
        this.actionHandlers = kriOperationManager.createActionHandlers(
          this.operationContext,
          this
        );

        // Emit initialization event
        this.$emit('kri-operations-initialized', this.operationContext);

      } catch (error) {
        console.error('Failed to initialize KRI operations:', error);
        this.$message.error('Failed to initialize KRI operations');
      } finally {
        this.setLoading('init', false);
      }
    },

    /**
     * Check if user has a specific action available
     * @param {string} actionName - Action name to check
     * @returns {boolean} Whether action is available
     */
    hasAction(actionName) {
      return this.operationContext?.availableActions.some(action => action.name === actionName) || false;
    },

    /**
     * Execute a KRI action
     * @param {string} actionName - Action to execute
     * @param {Object} actionData - Action-specific data
     * @returns {Promise<Object>} Action result
     */
    async executeKRIAction(actionName, actionData = {}) {
      if (!this.operationContext) {
        throw new Error('KRI operations not initialized');
      }

      const handler = this.actionHandlers[`handle${actionName.charAt(0).toUpperCase() + actionName.slice(1)}`];
      if (handler) {
        return await handler(actionData);
      } else {
        throw new Error(`No handler found for action: ${actionName}`);
      }
    },

    /**
     * Refresh operation context (e.g., after status change)
     */
    async refreshKRIOperations() {
      if (!this.operationContext) return;

      this.refreshing = true;
      try {
        await this.initializeKRIOperations(this.operationContext.kriItem);
        this.$emit('kri-operations-refreshed');
      } finally {
        this.refreshing = false;
      }
    },

    /**
     * Get atomic operation context for atomic-level operations
     * @param {number} atomicId - Atomic ID
     * @returns {Object} Atomic operation context
     */
    getAtomicOperationContext(atomicId) {
      if (!this.operationContext) return null;

      return kriOperationManager.getAtomicOperationContext(
        this.operationContext.kriItem,
        atomicId,
        this.operationContext.user,
        this.operationContext.permissions.explicitPermissions
      );
    },

    /**
     * Create action button configuration for Element UI
     * @param {string} actionName - Action name
     * @returns {Object|null} Button configuration
     */
    createActionButton(actionName) {
      const action = this.operationContext?.availableActions.find(a => a.name === actionName);
      if (!action) return null;

      const handler = this.actionHandlers[`handle${actionName.charAt(0).toUpperCase() + actionName.slice(1)}`];
      return {
        label: action.label,
        type: action.type,
        icon: action.icon,
        disabled: this.isLoading(actionName),
        loading: this.isLoading(actionName),
        onClick: handler,
        tooltip: action.description
      };
    },

    /**
     * Get all action buttons for current context
     * @param {boolean} primaryOnly - Return only primary actions
     * @returns {Array} Array of button configurations
     */
    getActionButtons(primaryOnly = false) {
      const actions = primaryOnly ? this.primaryActions : this.operationContext?.availableActions || [];
      return actions.map(action => this.createActionButton(action.name)).filter(Boolean);
    },

    /**
     * Handle common KRI actions with default implementations
     */

    // Save action
    async handleSave(value) {
      return await this.executeKRIAction('save', { value });
    },

    // Submit action  
    async handleSubmit() {
      return await this.executeKRIAction('submit');
    },

    // Approve action
    async handleApprove(comment = '') {
      return await this.executeKRIAction('approve', { comment });
    },

    // Reject action
    async handleReject(reason = '') {
      return await this.executeKRIAction('reject', { reason });
    },

    // View detail action
    handleViewDetail() {
      const kriItem = this.operationContext?.kriItem;
      if (kriItem) {
        this.$router.push(`/kri/${kriItem.id}/${kriItem.reportingDate}`);
      }
    },

    /**
     * Show action confirmation dialog
     * @param {Object} action - Action object
     * @returns {Promise<boolean>} User confirmation
     */
    async confirmAction(action) {
      if (!action.requiresConfirmation) return true;

      return await this.showConfirmDialog(
        `Confirm ${action.label}`,
        `Are you sure you want to ${action.description.toLowerCase()}?`,
        action.type === 'danger' ? 'warning' : 'info'
      );
    },

    /**
     * Show action input prompt (for actions requiring comments)
     * @param {Object} action - Action object
     * @param {string} prompt - Custom prompt message
     * @returns {Promise<string|null>} User input
     */
    async promptForActionInput(action, prompt = null) {
      const message = prompt || `Please provide a comment for ${action.description.toLowerCase()}:`;
      return await this.showInputPrompt(`${action.label} - Comment Required`, message);
    }
  },

  watch: {
    // Auto-refresh when KRI item changes
    kriItem: {
      handler(newKriItem, oldKriItem) {
        if (newKriItem && (!oldKriItem || newKriItem.id !== oldKriItem.id || newKriItem.reportingDate !== oldKriItem.reportingDate)) {
          this.initializeKRIOperations(newKriItem);
        }
      },
      immediate: false
    }
  },

  // Auto-cleanup on component destroy
  beforeDestroy() {
    this.operationContext = null;
    this.actionHandlers = {};
  }
};

/**
 * Bulk KRI Operations Mixin - For components handling multiple KRIs
 */
export const bulkKRIOperationMixin = {
  mixins: [commonMixin],

  data() {
    return {
      bulkOperationContext: null,
      selectedKRIs: []
    };
  },

  computed: {
    commonActions() {
      return this.bulkOperationContext?.commonActions || [];
    },

    canBulkEdit() {
      return this.bulkOperationContext?.canBulkEdit || false;
    },

    canBulkSubmit() {
      return this.bulkOperationContext?.canBulkSubmit || false;
    },

    canBulkApprove() {
      return this.bulkOperationContext?.canBulkApprove || false;
    },

    statusGroups() {
      return this.bulkOperationContext?.statusGroups || [];
    }
  },

  methods: {
    async initializeBulkOperations(kriItems, user = null, userPermissions = null) {
      try {
        this.setLoading('bulk-init', true);

        const currentUser = user || this.$store.getters['auth/currentUser'];
        const permissions = userPermissions || this.$store.getters['auth/userPermissions'];

        this.bulkOperationContext = kriOperationManager.getBulkOperationContext(
          kriItems,
          currentUser,
          permissions
        );

        this.$emit('bulk-operations-initialized', this.bulkOperationContext);

      } catch (error) {
        console.error('Failed to initialize bulk operations:', error);
        this.$message.error('Failed to initialize bulk operations');
      } finally {
        this.setLoading('bulk-init', false);
      }
    },

    async executeBulkAction(actionName, actionData = {}) {
      if (!this.selectedKRIs.length) {
        this.$message.warning('Please select KRIs to perform bulk action');
        return;
      }

      const confirmed = await this.showConfirmDialog(
        'Confirm Bulk Action',
        `Execute ${actionName} on ${this.selectedKRIs.length} selected KRI(s)?`
      );

      if (!confirmed) return;

      const results = await this.withLoading(`bulk-${actionName}`, async () => {
        const promises = this.selectedKRIs.map(async (kriItem) => {
          try {
            const context = kriOperationManager.getKRIOperationContext(
              kriItem,
              this.bulkOperationContext.user,
              this.bulkOperationContext.userPermissions
            );
            return await kriOperationManager.executeKRIAction(actionName, context, actionData);
          } catch (error) {
            return { success: false, error: error.message, kriItem };
          }
        });

        return await Promise.all(promises);
      });

      // Process results
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      if (successful > 0) {
        this.$message.success(`${actionName} completed for ${successful} KRI(s)`);
      }
      if (failed > 0) {
        this.$message.error(`${actionName} failed for ${failed} KRI(s)`);
      }

      this.$emit('bulk-action-completed', { actionName, results });
    }
  }
};