/**
 * Admin CRUD Mixin
 * 
 * Provides reusable functionality for admin CRUD operations.
 * Designed to work with admin components that manage users, permissions, roles, etc.
 * Follows patterns established in expandableTableMixin.js
 */

import Permission from '@/utils/permission';

export default {
  data() {
    return {
      // Loading states
      loading: false,
      dialogLoading: false,
      deleteLoading: false,
      
      // Dialog states
      dialogVisible: false,
      editMode: false,
      
      // Current item being edited/viewed
      currentItem: null,
      originalItem: null,
      
      // Selection for bulk operations
      selectedItems: [],
      
      // Form validation
      formRules: {},
      
      // Pagination (if needed)
      currentPage: 1,
      pageSize: 20,
      total: 0
    };
  },
  
  computed: {
    /**
     * Check if current user has admin permissions
     */
    isAdmin() {
      return Permission.isSystemAdmin(this.currentUser);
    },
    
    /**
     * Check if current user has department admin permissions
     */
    isDepartmentAdmin() {
      return Permission.isDepartmentAdmin(this.currentUser);
    },
    
    /**
     * Get dialog title based on edit mode
     */
    dialogTitle() {
      if (!this.editMode) return `Add ${this.entityName}`;
      return `Edit ${this.entityName}`;
    },
    
    /**
     * Check if form has changes
     */
    hasChanges() {
      if (!this.currentItem || !this.originalItem) return false;
      return JSON.stringify(this.currentItem) !== JSON.stringify(this.originalItem);
    },
    
    /**
     * Entity name for messages and titles
     * Should be overridden by child components
     */
    entityName() {
      return 'Item';
    }
  },
  
  methods: {
    /**
     * Open dialog for adding new item
     */
    openAddDialog() {
      this.editMode = false;
      this.currentItem = this.getDefaultItem();
      this.originalItem = null;
      this.dialogVisible = true;
      this.resetFormValidation();
    },
    
    /**
     * Open dialog for editing existing item
     * @param {Object} item - Item to edit
     */
    openEditDialog(item) {
      this.editMode = true;
      this.currentItem = { ...item };
      this.originalItem = { ...item };
      this.dialogVisible = true;
      this.resetFormValidation();
    },
    
    /**
     * Close dialog and reset state
     */
    closeDialog() {
      this.dialogVisible = false;
      this.editMode = false;
      this.currentItem = null;
      this.originalItem = null;
      this.dialogLoading = false;
      this.resetFormValidation();
    },
    
    /**
     * Handle save operation (create or update)
     */
    async handleSave() {
      // Validate form first
      if (this.$refs.form) {
        try {
          await this.$refs.form.validate();
        } catch (error) {
          return;
        }
      }
      
      this.dialogLoading = true;
      try {
        let result;
        if (this.editMode) {
          result = await this.updateItem(this.currentItem);
          this.$message.success(`${this.entityName} updated successfully`);
        } else {
          result = await this.createItem(this.currentItem);
          this.$message.success(`${this.entityName} created successfully`);
        }
        
        this.closeDialog();
        await this.refreshData();
        this.$emit('item-saved', result);
      } catch (error) {
        console.error(`Error saving ${this.entityName.toLowerCase()}:`, error);
        this.$message.error(`Failed to save ${this.entityName.toLowerCase()}: ${error.message}`);
      } finally {
        this.dialogLoading = false;
      }
    },
    
    /**
     * Handle delete operation with confirmation
     * @param {Object} item - Item to delete
     */
    async handleDelete(item) {
      try {
        await this.$confirm(
          `This will permanently delete the ${this.entityName.toLowerCase()}. Continue?`,
          'Warning',
          {
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        );
        
        this.deleteLoading = true;
        await this.deleteItem(item);
        this.$message.success(`${this.entityName} deleted successfully`);
        await this.refreshData();
        this.$emit('item-deleted', item);
      } catch (error) {
        if (error !== 'cancel') {
          console.error(`Error deleting ${this.entityName.toLowerCase()}:`, error);
          this.$message.error(`Failed to delete ${this.entityName.toLowerCase()}: ${error.message}`);
        }
      } finally {
        this.deleteLoading = false;
      }
    },
    
    /**
     * Handle bulk delete operation
     */
    async handleBulkDelete() {
      if (!this.selectedItems.length) {
        this.$message.warning('Please select items to delete');
        return;
      }
      
      try {
        await this.$confirm(
          `This will permanently delete ${this.selectedItems.length} ${this.entityName.toLowerCase()}(s). Continue?`,
          'Warning',
          {
            confirmButtonText: 'Delete All',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        );
        
        this.loading = true;
        const promises = this.selectedItems.map(item => this.deleteItem(item));
        await Promise.all(promises);
        
        this.$message.success(`${this.selectedItems.length} ${this.entityName.toLowerCase()}(s) deleted successfully`);
        this.selectedItems = [];
        await this.refreshData();
        this.$emit('bulk-deleted', this.selectedItems);
      } catch (error) {
        if (error !== 'cancel') {
          console.error(`Error bulk deleting ${this.entityName.toLowerCase()}s:`, error);
          this.$message.error(`Failed to delete ${this.entityName.toLowerCase()}s: ${error.message}`);
        }
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Handle selection change for bulk operations
     * @param {Array} selection - Selected items
     */
    handleSelectionChange(selection) {
      this.selectedItems = selection;
      this.$emit('selection-change', selection);
    },
    
    /**
     * Reset form validation
     */
    resetFormValidation() {
      this.$nextTick(() => {
        if (this.$refs.form) {
          this.$refs.form.resetFields();
          this.$refs.form.clearValidate();
        }
      });
    },
    
    /**
     * Refresh data from server
     */
    async refreshData() {
      this.loading = true;
      try {
        await this.loadData();
        this.$emit('data-refreshed');
      } catch (error) {
        console.error(`Error refreshing ${this.entityName.toLowerCase()} data:`, error);
        this.$message.error(`Failed to refresh data: ${error.message}`);
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Handle pagination change
     * @param {number} page - New page number
     */
    handlePageChange(page) {
      this.currentPage = page;
      this.loadData();
    },
    
    /**
     * Handle page size change
     * @param {number} size - New page size
     */
    handlePageSizeChange(size) {
      this.pageSize = size;
      this.currentPage = 1;
      this.loadData();
    },
    
    /**
     * Show loading message
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
      this.loadingInstance = this.$loading({
        lock: true,
        text: message,
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      });
    },
    
    /**
     * Hide loading message
     */
    hideLoading() {
      if (this.loadingInstance) {
        this.loadingInstance.close();
        this.loadingInstance = null;
      }
    },
    
    // ================================
    // Abstract methods to be implemented by child components
    // ================================
    
    /**
     * Get default item structure for new items
     * @returns {Object} Default item
     */
    getDefaultItem() {
      throw new Error('getDefaultItem() must be implemented by child component');
    },
    
    /**
     * Load data from server
     * @returns {Promise}
     */
    async loadData() {
      throw new Error('loadData() must be implemented by child component');
    },
    
    /**
     * Create new item
     * @param {Object} item - Item to create
     * @returns {Promise<Object>} Created item
     */
    async createItem(_item) {
      throw new Error('createItem() must be implemented by child component');
    },
    
    /**
     * Update existing item
     * @param {Object} item - Item to update
     * @returns {Promise<Object>} Updated item
     */
    async updateItem(_item) {
      throw new Error('updateItem() must be implemented by child component');
    },
    
    /**
     * Delete item
     * @param {Object} item - Item to delete
     * @returns {Promise}
     */
    async deleteItem(_item) {
      throw new Error('deleteItem() must be implemented by child component');
    }
  }
};