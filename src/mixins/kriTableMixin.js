import { kriOperationMixin } from './kriOperationMixin';
import { KRITableColumnMixin } from '@/components/shared/KRITableColumns.vue';
import StatusManager from '@/utils/StatusManager';

/**
 * Comprehensive KRI Table Mixin
 * Consolidates repetitive table functionality across components
 */
export const kriTableMixin = {
  mixins: [kriOperationMixin, KRITableColumnMixin],

  data() {
    return {
      // Selection state
      selectedRows: [],
      selectAll: false,
      
      // Loading states per row
      rowLoadingStates: {},
      
      // Editing state
      editingValues: {},
      editingRow: null,
      
      // Sorting and filtering
      sortBy: null,
      sortOrder: 'ascending',
      currentFilters: {}
    };
  },

  computed: {
    /**
     * Get sorted table data
     */
    sortedData() {
      if (!this.tableData || !Array.isArray(this.tableData)) {
        return [];
      }

      let data = [...this.tableData];

      // Apply sorting
      if (this.sortBy) {
        data.sort((a, b) => {
          const aVal = a[this.sortBy];
          const bVal = b[this.sortBy];
          
          if (aVal === bVal) return 0;
          
          const result = aVal > bVal ? 1 : -1;
          return this.sortOrder === 'ascending' ? result : -result;
        });
      }

      return data;
    },

    /**
     * Get rows that can be selected
     */
    selectableRows() {
      return this.sortedData.filter(row => this.isRowSelectable(row));
    },

    /**
     * Check if all selectable rows are selected
     */
    isAllSelected() {
      if (this.selectableRows.length === 0) return false;
      return this.selectableRows.every(row => 
        this.selectedRows.some(selected => this.getRowKey(row) === this.getRowKey(selected))
      );
    },

    /**
     * Get selected row count
     */
    selectedCount() {
      return this.selectedRows.length;
    }
  },

  methods: {
    /**
     * Row utility methods
     */
    getRowKey(row) {
      return `${row.id}_${row.reportingDate}`;
    },

    isRowSelectable(row) {
      // Override in component if needed
      return true;
    },

    getRowClassName(row) {
      const classes = [];
      
      if (row.rawData && row.rawData.kri_status) {
        const statusConfig = StatusManager.getStatusConfig(row.rawData.kri_status);
        classes.push(statusConfig.cssClass);
      }
      
      if (this.isRowLoading(row)) {
        classes.push('row-loading');
      }
      
      return classes.join(' ');
    },

    /**
     * Loading state management
     */
    isRowLoading(row) {
      return this.rowLoadingStates[this.getRowKey(row)] || false;
    },

    setRowLoading(row, loading) {
      this.$set(this.rowLoadingStates, this.getRowKey(row), loading);
    },

    /**
     * Selection handling
     */
    handleSelectionChange(selection) {
      this.selectedRows = selection;
      this.$emit('selection-change', selection);
    },

    handleSelectAllChange() {
      if (this.selectAll) {
        this.selectAllRows();
      } else {
        this.clearSelection();
      }
    },

    selectAllRows() {
      this.selectedRows = [...this.selectableRows];
      this.selectAll = true;
      this.$emit('selection-change', this.selectedRows);
    },

    clearSelection() {
      this.selectedRows = [];
      this.selectAll = false;
      this.$emit('selection-change', this.selectedRows);
    },

    /**
     * Row action methods using centralized ActionManager
     */
    async executeRowAction(row, actionName, actionData = {}) {
      this.setRowLoading(row, true);
      
      try {
        // Initialize operations for this row if not already done
        await this.initializeKRIOperations({
          id: row.id,
          reportingDate: row.reportingDate,
          kri_status: row.rawData?.kri_status || 10,
          ...row
        });

        // Execute the action
        const result = await this.executeKRIAction(actionName, actionData);
        
        if (result.success) {
          this.$emit('row-action-completed', row, actionName, result);
        }
        
        return result;
        
      } finally {
        this.setRowLoading(row, false);
      }
    },

    /**
     * Bulk action methods
     */
    async executeBulkAction(actionName, actionData = {}) {
      if (this.selectedRows.length === 0) {
        this.$message.warning('Please select rows first');
        return;
      }

      const confirmed = await this.showConfirmDialog(
        'Confirm Bulk Action',
        `Execute ${actionName} on ${this.selectedRows.length} selected row(s)?`
      );

      if (!confirmed) return;

      this.setLoading(`bulk-${actionName}`, true);

      try {
        const results = [];
        
        for (const row of this.selectedRows) {
          try {
            const result = await this.executeRowAction(row, actionName, actionData);
            results.push({ row, result });
          } catch (error) {
            results.push({ row, result: { success: false, error: error.message } });
          }
        }

        // Process results
        const successful = results.filter(r => r.result.success).length;
        const failed = results.length - successful;

        if (successful > 0) {
          this.$message.success(`${actionName} completed for ${successful} row(s)`);
        }
        if (failed > 0) {
          this.$message.error(`${actionName} failed for ${failed} row(s)`);
        }

        this.$emit('bulk-action-completed', actionName, results);
        this.clearSelection();

      } finally {
        this.setLoading(`bulk-${actionName}`, false);
      }
    },

    /**
     * Permission checking methods using centralized system
     */
    canPerformRowAction(row, actionName) {
      if (!this.operationContext) return false;
      
      return this.hasAction(actionName) && 
             this.operationContext.availableActions.some(action => action.name === actionName);
    },

    getRowAvailableActions(row) {
      // This would typically initialize operations for the specific row
      // For now, return the current context actions
      return this.operationContext?.availableActions || [];
    },

    /**
     * Editing methods
     */
    startEdit(row) {
      this.editingRow = this.getRowKey(row);
      this.$set(this.editingValues, this.getRowKey(row), row.kriValue || '');
      
      this.$nextTick(() => {
        const input = this.$refs[`editInput-${this.getRowKey(row)}`];
        if (input && input.focus) {
          input.focus();
        }
      });
    },

    cancelEdit() {
      this.editingRow = null;
      this.editingValues = {};
    },

    async saveEdit(row) {
      const value = this.editingValues[this.getRowKey(row)];
      
      if (!this.validateValue(value)) {
        this.$message.warning('Please enter a valid value');
        return;
      }

      const result = await this.executeRowAction(row, 'save', { value });
      
      if (result.success) {
        this.cancelEdit();
      }
    },

    validateValue(value) {
      return value !== null && value !== undefined && String(value).trim() !== '';
    },

    /**
     * Sorting methods
     */
    handleSortChange({ column, prop, order }) {
      this.sortBy = prop;
      this.sortOrder = order;
      this.$emit('sort-change', { column, prop, order });
    },

    /**
     * Event handlers
     */
    handleRowClick(row, column, event) {
      // Prevent navigation when clicking on action buttons
      if (event.target.closest('.action-button, .el-button')) {
        return;
      }
      
      this.$emit('row-click', row.id, row.reportingDate);
    },

    handleKRIClick(kriId, reportingDate) {
      this.$emit('kri-click', kriId, reportingDate);
    },

    /**
     * Utility methods for common operations
     */
    refreshData() {
      this.$emit('refresh-requested');
    },

    exportData(format = 'csv') {
      this.$emit('export-requested', format, this.selectedRows.length > 0 ? this.selectedRows : this.sortedData);
    },

    /**
     * Status and tag helpers
     */
    getStatusTagType(status) {
      return StatusManager.getStatusTagType(
        typeof status === 'string' ? StatusManager.getLabelToNumber(status) : status
      );
    },

    /**
     * Responsive helpers
     */
    isMobile() {
      return window.innerWidth < 768;
    },

    getResponsiveTableLayout() {
      return this.isMobile() ? 'mobile' : 'desktop';
    }
  },

  watch: {
    // Watch for data changes and update selection
    sortedData: {
      handler(newData) {
        // Remove selected rows that are no longer in the data
        this.selectedRows = this.selectedRows.filter(selectedRow =>
          newData.some(dataRow => this.getRowKey(dataRow) === this.getRowKey(selectedRow))
        );
        
        // Update select all state
        this.selectAll = this.isAllSelected;
      },
      immediate: true
    }
  }
};

/**
 * Specialized mixin for data collection tables
 */
export const kriCollectDataTableMixin = {
  mixins: [kriTableMixin],

  data() {
    return {
      batchOperation: false
    };
  },

  computed: {
    // Batch action availability
    canBatchSave() {
      return this.selectedRows.some(row => 
        this.canPerformRowAction(row, 'save') && this.hasValidValue(row)
      );
    },

    canBatchSubmit() {
      return this.selectedRows.some(row => this.canPerformRowAction(row, 'submit'));
    },

    canBatchApprove() {
      return this.selectedRows.some(row => this.canPerformRowAction(row, 'approve'));
    }
  },

  methods: {
    hasValidValue(row) {
      const value = this.editingValues[this.getRowKey(row)];
      return this.validateValue(value);
    },

    async batchSave() {
      const validRows = this.selectedRows.filter(row => 
        this.canPerformRowAction(row, 'save') && this.hasValidValue(row)
      );

      if (validRows.length === 0) {
        this.$message.warning('No valid rows to save');
        return;
      }

      await this.executeBulkAction('save');
    },

    async batchSubmit() {
      await this.executeBulkAction('submit');
    },

    async batchApprove() {
      await this.executeBulkAction('approve');
    }
  }
};

export default kriTableMixin;