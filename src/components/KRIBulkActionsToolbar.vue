<template>
  <div class="kri-bulk-actions-toolbar" v-if="selectedItems.length > 0">
    <div class="toolbar-content">
      <!-- Selection Summary -->
      <div class="selection-summary">
        <i class="el-icon-check selection-icon"></i>
        <span class="selection-text">
          <strong>{{ selectedItems.length }}</strong> 
          {{ selectedItems.length === 1 ? 'item' : 'items' }} selected
        </span>
        <el-button 
          type="text" 
          icon="el-icon-close"
          @click="clearSelection"
          size="mini"
          class="clear-selection">
          Clear
        </el-button>
      </div>

      <!-- Bulk Action Buttons -->
      <div class="bulk-actions">
        <!-- Save Actions (Status 10, 20, 30) -->
        <el-button
          v-if="canBulkSave"
          type="primary"
          icon="el-icon-document"
          size="small"
          @click="handleBulkSave"
          :loading="isLoading('save')"
          :disabled="!saveableCount">
          Save Selected ({{ saveableCount }})
        </el-button>

        <!-- Submit Actions (Status 10, 20, 30) -->
        <el-button
          v-if="canBulkSubmit"  
          type="success"
          icon="el-icon-upload"
          size="small"
          @click="handleBulkSubmit"
          :loading="isLoading('submit')"
          :disabled="!submittableCount">
          Submit Selected ({{ submittableCount }})
        </el-button>

        <!-- Approve Actions (Status 40, 50) -->
        <el-button
          v-if="canBulkApprove"
          type="success"
          icon="el-icon-check"
          size="small"
          @click="handleBulkApprove"
          :loading="isLoading('approve')"
          :disabled="!approvableCount">
          Approve Selected ({{ approvableCount }})
        </el-button>

        <!-- Reject Actions (Status 40, 50) -->
        <el-button
          v-if="canBulkReject"
          type="danger"
          icon="el-icon-close"
          size="small"
          @click="handleBulkReject"
          :loading="isLoading('reject')"
          :disabled="!rejectable.length">
          Reject Selected ({{ rejectable.length }})
        </el-button>
      </div>

      <!-- Progress Information -->
      <div class="action-progress" v-if="hasActiveOperation">
        <el-progress 
          :percentage="operationProgress" 
          :status="operationStatus"
          size="small"
          class="progress-bar">
        </el-progress>
        <span class="progress-text">{{ operationText }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'KRIBulkActionsToolbar',
  props: {
    selectedItems: {
      type: Array,
      default: () => []
    },
    allItems: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      loadingOperations: new Set(),
      operationProgress: 0,
      operationStatus: null,
      operationText: '',
      hasActiveOperation: false
    };
  },
  computed: {
    ...mapGetters('kri', ['canPerform']),

    // Get the actual KRI items from selection
    selectedKRIItems() {
      return this.selectedItems.map(selected => {
        // Handle both row objects and simple identifiers
        if (typeof selected === 'object' && selected.kriId) {
          return selected;
        }
        // Find the item in allItems by kriId and reportingDate
        return this.allItems.find(item => 
          (item.kriId || item.id) === (selected.kriId || selected.id) &&
          item.reportingDate === selected.reportingDate
        );
      }).filter(Boolean);
    },

    // Status-based filtering for bulk operations
    saveable() {
      return this.selectedKRIItems.filter(item => 
        this.canPerform(item.kriId || item.id, null, 'edit') &&
        [10, 20, 30].includes(item.kriStatus) &&
        !item.isAtomicRow
      );
    },

    submittable() {
      return this.selectedKRIItems.filter(item => 
        this.canPerform(item.kriId || item.id, null, 'edit') &&
        [10, 20, 30].includes(item.kriStatus) &&
        this.hasKRIValue(item) &&
        !item.isAtomicRow
      );
    },

    approvable() {
      return this.selectedKRIItems.filter(item => 
        this.canPerform(item.kriId || item.id, null, 'review') &&
        [40, 50].includes(item.kriStatus) &&
        !item.isAtomicRow
      );
    },

    rejectable() {
      return this.selectedKRIItems.filter(item => 
        this.canPerform(item.kriId || item.id, null, 'review') &&
        [40, 50].includes(item.kriStatus) &&
        !item.isAtomicRow
      );
    },

    // Count computeds for button labels
    saveableCount() {
      return this.saveable.length;
    },

    submittableCount() {
      return this.submittable.length;
    },

    approvableCount() {
      return this.approvable.length;
    },

    // Button visibility computeds
    canBulkSave() {
      return this.saveableCount > 0;
    },

    canBulkSubmit() {
      return this.submittableCount > 0;
    },

    canBulkApprove() {
      return this.approvableCount > 0;
    },

    canBulkReject() {
      return this.rejectable.length > 0;
    }
  },
  methods: {
    // Utility methods
    hasKRIValue(item) {
      return item.kriValue !== null && item.kriValue !== undefined && item.kriValue !== '';
    },

    isLoading(operation) {
      return this.loadingOperations.has(operation);
    },

    setLoading(operation, loading = true) {
      if (loading) {
        this.loadingOperations.add(operation);
      } else {
        this.loadingOperations.delete(operation);
      }
    },

    clearSelection() {
      this.$emit('clear-selection');
    },

    // Progress tracking methods
    startOperation(operation, total) {
      this.hasActiveOperation = true;
      this.operationProgress = 0;
      this.operationStatus = null;
      this.operationText = `Processing ${operation}... 0/${total}`;
    },

    updateProgress(operation, completed, total) {
      this.operationProgress = Math.round((completed / total) * 100);
      this.operationText = `Processing ${operation}... ${completed}/${total}`;
    },

    completeOperation(operation, success = true) {
      this.operationProgress = 100;
      this.operationStatus = success ? 'success' : 'exception';
      this.operationText = success ? `${operation} completed successfully` : `${operation} failed`;
      
      // Hide progress after 2 seconds
      setTimeout(() => {
        this.hasActiveOperation = false;
        this.operationProgress = 0;
        this.operationStatus = null;
        this.operationText = '';
      }, 2000);
    },

    // Bulk operation handlers
    async handleBulkSave() {
      if (this.isLoading('save') || this.saveable.length === 0) return;
      
      this.setLoading('save', true);
      this.startOperation('Save', this.saveable.length);
      
      try {
        const results = await this.processBulkOperation(
          this.saveable,
          'save',
          { kri_status: 30 } // Status 30: "Saved"
        );
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        if (failed === 0) {
          this.$message.success(`Successfully saved ${successful} KRI${successful !== 1 ? 's' : ''}`);
        } else {
          this.$message.warning(`Saved ${successful} KRI${successful !== 1 ? 's' : ''}, ${failed} failed`);
        }
        
        this.completeOperation('Save', failed === 0);
        this.$emit('bulk-operation-complete', 'save', results);
        
      } catch (error) {
        console.error('Bulk save error:', error);
        this.$message.error('Bulk save operation failed');
        this.completeOperation('Save', false);
      } finally {
        this.setLoading('save', false);
      }
    },

    async handleBulkSubmit() {
      if (this.isLoading('submit') || this.submittable.length === 0) return;
      
      this.setLoading('submit', true);
      this.startOperation('Submit', this.submittable.length);
      
      try {
        const results = await this.processBulkOperation(
          this.submittable,
          'submit',
          null // Status will be determined per item
        );
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        if (failed === 0) {
          this.$message.success(`Successfully submitted ${successful} KRI${successful !== 1 ? 's' : ''}`);
        } else {
          this.$message.warning(`Submitted ${successful} KRI${successful !== 1 ? 's' : ''}, ${failed} failed`);
        }
        
        this.completeOperation('Submit', failed === 0);
        this.$emit('bulk-operation-complete', 'submit', results);
        
      } catch (error) {
        console.error('Bulk submit error:', error);
        this.$message.error('Bulk submit operation failed');
        this.completeOperation('Submit', false);
      } finally {
        this.setLoading('submit', false);
      }
    },

    async handleBulkApprove() {
      if (this.isLoading('approve') || this.approvable.length === 0) return;
      
      this.setLoading('approve', true);
      this.startOperation('Approve', this.approvable.length);
      
      try {
        const results = await this.processBulkOperation(
          this.approvable,
          'approve',
          null // Status will be determined per item
        );
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        if (failed === 0) {
          this.$message.success(`Successfully approved ${successful} KRI${successful !== 1 ? 's' : ''}`);
        } else {
          this.$message.warning(`Approved ${successful} KRI${successful !== 1 ? 's' : ''}, ${failed} failed`);
        }
        
        this.completeOperation('Approve', failed === 0);
        this.$emit('bulk-operation-complete', 'approve', results);
        
      } catch (error) {
        console.error('Bulk approve error:', error);
        this.$message.error('Bulk approve operation failed');
        this.completeOperation('Approve', false);
      } finally {
        this.setLoading('approve', false);
      }
    },

    async handleBulkReject() {
      if (this.isLoading('reject') || this.rejectable.length === 0) return;
      
      this.setLoading('reject', true);
      this.startOperation('Reject', this.rejectable.length);
      
      try {
        const results = await this.processBulkOperation(
          this.rejectable,
          'reject',
          { kri_status: 20 } // Status 20: "Under Rework"
        );
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        if (failed === 0) {
          this.$message.success(`Successfully rejected ${successful} KRI${successful !== 1 ? 's' : ''}`);
        } else {
          this.$message.warning(`Rejected ${successful} KRI${successful !== 1 ? 's' : ''}, ${failed} failed`);
        }
        
        this.completeOperation('Reject', failed === 0);
        this.$emit('bulk-operation-complete', 'reject', results);
        
      } catch (error) {
        console.error('Bulk reject error:', error);
        this.$message.error('Bulk reject operation failed');
        this.completeOperation('Reject', false);
      } finally {
        this.setLoading('reject', false);
      }
    },

    // Helper method to process bulk operations
    async processBulkOperation(items, operation, updateData) {
      const results = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        this.updateProgress(operation, i, items.length);
        
        try {
          // Determine update data based on operation
          let finalUpdateData = updateData;
          
          if (operation === 'submit') {
            // Determine next status based on KRI owner/data provider logic
            const nextStatus = (item.owner === item.dataProvider) ? 50 : 40;
            finalUpdateData = { kri_status: nextStatus };
          } else if (operation === 'approve') {
            // Status 40 -> 50, Status 50 -> 60
            const nextStatus = item.kriStatus === 40 ? 50 : 60;
            finalUpdateData = { kri_status: nextStatus };
          }
          
          // Emit individual operation event
          const result = await new Promise((resolve) => {
            this.$emit('bulk-operation-item', {
              item,
              operation,
              updateData: finalUpdateData,
              callback: resolve
            });
          });
          
          results.push({
            item,
            operation,
            success: result.success,
            error: result.error
          });
          
        } catch (error) {
          console.error(`Error processing ${operation} for item:`, item, error);
          results.push({
            item,
            operation,
            success: false,
            error: error.message
          });
        }
        
        // Small delay to prevent overwhelming the server
        if (i < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      this.updateProgress(operation, items.length, items.length);
      return results;
    }
  }
};
</script>

<style scoped>
.kri-bulk-actions-toolbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  margin-bottom: var(--spacing-md);
  animation: slideInDown 0.3s ease-out;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toolbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--button-gap-loose);
}

/* Selection Summary */
.selection-summary {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  color: white;
  font-weight: var(--font-weight-medium);
}

.selection-icon {
  font-size: var(--font-size-lg);
  color: #a7f3d0;
}

.selection-text {
  font-size: var(--font-size-sm);
}

.clear-selection {
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  transition: var(--transition-fast);
}

.clear-selection:hover {
  color: white;
  background-color: rgba(255, 255, 255, 0.1);
}

/* Bulk Actions */
.bulk-actions {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  align-items: center;
}

.bulk-actions .el-button {
  border: none;
  font-weight: var(--font-weight-medium);
  transition: var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.bulk-actions .el-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.bulk-actions .el-button[disabled] {
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

/* Action Progress */
.action-progress {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  color: white;
  min-width: 200px;
}

.progress-bar {
  flex: 1;
}

.progress-text {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

/* Progress bar custom styling */
.action-progress :deep(.el-progress-bar__outer) {
  background-color: rgba(255, 255, 255, 0.2);
}

.action-progress :deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
}

.action-progress :deep(.el-progress__text) {
  color: white !important;
  font-size: var(--font-size-xs) !important;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-md);
  }
  
  .selection-summary {
    justify-content: center;
  }
  
  .bulk-actions {
    justify-content: center;
  }
  
  .action-progress {
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .toolbar-content {
    padding: var(--spacing-md) var(--spacing-md);
  }
  
  .bulk-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .bulk-actions .el-button {
    width: 100%;
    justify-content: center;
  }
  
  .selection-summary {
    font-size: var(--font-size-sm);
  }
  
  .selection-text {
    font-size: var(--font-size-sm);
  }
}

/* Animation for button counts */
.bulk-actions .el-button {
  position: relative;
  overflow: hidden;
}

.bulk-actions .el-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.bulk-actions .el-button:hover::before {
  left: 100%;
}

/* Status-specific button styling */
.bulk-actions .el-button--primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.bulk-actions .el-button--success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.bulk-actions .el-button--danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

/* Loading state enhancements */
.bulk-actions .el-button.is-loading {
  position: relative;
}

.bulk-actions .el-button.is-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>