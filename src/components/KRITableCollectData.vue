<template>
  <div class="kri-table">
    <el-table
      ref="table"
      :data="sortedData"
      v-loading="loading"
      style="width: 100%"
      @selection-change="handleSelectionChange"
      :row-class-name="getRowClassName"
    >
      <el-table-column
        type="selection"
        width="55"
        :selectable="isSelectable"
      />
      
      <el-table-column
        prop="id"
        label="KRI ID"
        width="80"
        sortable
      />
      
      <el-table-column
        prop="name"
        label="KRI Name"
        min-width="200"
        sortable
        show-overflow-tooltip
      >
        <template slot-scope="scope">
          <el-button
            type="text"
            @click="handleKRIClick(scope.row.id, scope.row.reportingDate)"
            class="kri-name-link"
          >
            {{ scope.row.name }}
          </el-button>
        </template>
      </el-table-column>
      
      <el-table-column
        prop="owner"
        label="Owner"
        width="80"
        sortable
        show-overflow-tooltip
      />
      
      <el-table-column
        prop="dataProvider"
        label="Data Provider"
        width="120"
        sortable
        show-overflow-tooltip
      />
      
      <el-table-column
        prop="collectionStatus"
        label="Status"
        width="120"
        sortable
      >
        <template slot-scope="scope">
          <el-tag
            :type="getStatusTagType(scope.row.collectionStatus)"
            size="small"
            class="status-tag"
          >
            {{ scope.row.collectionStatus }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column
        prop="breachType"
        label="Breach Type"
        width="120"
        sortable
      >
        <template slot-scope="scope">
          <el-tooltip :content="getBreachDescription(scope.row.breachType)" placement="top">
            <el-tag
              :type="getBreachTagType(scope.row.breachType)"
              size="small"
              class="status-tag"
            >
              {{ getBreachDisplayText(scope.row.breachType) }}
            </el-tag>
          </el-tooltip>
        </template>
      </el-table-column>
      
      <el-table-column
        prop="kriValue"
        label="KRI Value"
        width="140"
        sortable
      >
        <template slot-scope="scope">
          <div v-if="canEditRow(scope.row)" class="inline-edit">
            <el-input-number
              v-model="editingValues[getRowKey(scope.row)]"
              :precision="2"
              size="mini"
              style="width: 100%"
              :placeholder="scope.row.kriValue"
              @change="handleValueChange(scope.row)"
            />
          </div>
          <div v-else>
            {{ scope.row.kriValue }}
          </div>
        </template>
      </el-table-column>
      
      <el-table-column
        prop="reportingCycle"
        label="Reporting Cycle"
        width="130"
        sortable
      />
      
      <el-table-column
        prop="reportingDate"
        label="Reporting Date"
        width="130"
        sortable
      >
        <template slot-scope="scope">
          {{ formatReportingDate(scope.row.reportingDate) }}
        </template>
      </el-table-column>
      
      <el-table-column
        label="Actions"
        width="200"
        fixed="right"
      >
        <template slot-scope="scope">
          <div class="action-buttons">
            <!-- Input Actions for editable rows -->
            <template v-if="canEditRow(scope.row)">
              <el-button
                size="mini"
                icon="el-icon-check"
                @click="handleSingleSave(scope.row)"
                :disabled="!hasValidValue(scope.row)"
                :loading="getRowLoading(scope.row)"
                class="action-button save-button"
              >
                Save
              </el-button>
              <el-button
                size="mini"
                icon="el-icon-upload"
                @click="handleSingleSaveAndSubmit(scope.row)"
                :disabled="!hasValidValue(scope.row)"
                :loading="getRowLoading(scope.row)"
                class="action-button submit-button"
              >
                Submit
              </el-button>
            </template>
            
            <!-- Review Actions for Data Provider Approver -->
            <template v-else-if="canReviewRow(scope.row)">
              <el-button
                size="mini"
                icon="el-icon-check"
                @click="handleSingleApprove(scope.row)"
                :loading="getRowLoading(scope.row)"
                class="action-button approve-button"
              >
                Approve
              </el-button>
              <el-button
                size="mini"
                icon="el-icon-close"
                @click="handleSingleReject(scope.row)"
                :loading="getRowLoading(scope.row)"
                class="action-button reject-button"
              >
                Reject
              </el-button>
            </template>
            
            <!-- Acknowledge Actions for KRI Owner Approver -->
            <template v-else-if="canAcknowledgeRow(scope.row)">
              <el-button
                size="mini"
                icon="el-icon-check"
                @click="handleSingleAcknowledge(scope.row)"
                :loading="getRowLoading(scope.row)"
                class="action-button acknowledge-button"
              >
                Ack
              </el-button>
              <el-button
                size="mini"
                icon="el-icon-close"
                @click="handleSingleReject(scope.row)"
                :loading="getRowLoading(scope.row)"
                class="action-button reject-button"
              >
                Reject
              </el-button>
            </template>
            
            <!-- No actions available - show KRI name link instead -->
            <template v-else>
              <span class="no-actions-text">Click KRI name to view</span>
            </template>
          </div>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- Batch Actions -->
    <div class="table-actions" v-if="data.length > 0">
      <!-- Data Input Actions -->
      <div class="batch-section" v-if="hasInputActions">
        <div class="section-title">Data Input Actions</div>
        <div class="batch-actions">
          <el-button
            v-if="hasBatchSaveActions"
            icon="el-icon-check"
            @click="handleBatchSave"
            :loading="batchLoading"
            class="batch-button save-button"
          >
            Batch Save ({{ getBatchSaveCount }})
          </el-button>
          <el-button
            v-if="hasBatchSubmitActions"
            icon="el-icon-upload"
            @click="handleBatchSubmit"
            :loading="batchLoading"
            class="batch-button submit-button"
          >
            Batch Submit ({{ getBatchSubmitCount }})
          </el-button>
        </div>
      </div>
      
      <!-- Divider -->
      <el-divider v-if="hasInputActions && hasApprovalActions" class="batch-divider" />
      
      <!-- Approval Actions -->
      <div class="batch-section" v-if="hasApprovalActions">
        <div class="section-title">Approval Actions</div>
        <div class="batch-actions">
          <el-button
            v-if="hasBatchApproveActions"
            icon="el-icon-check"
            @click="handleBatchApprove"
            :loading="batchLoading"
            class="batch-button approve-button"
          >
            Batch Approve ({{ getBatchApproveCount }})
          </el-button>
          <el-button
            v-if="hasBatchAcknowledgeActions"
            icon="el-icon-check"
            @click="handleBatchAcknowledge"
            :loading="batchLoading"
            class="batch-button acknowledge-button"
          >
            Batch Acknowledge ({{ getBatchAcknowledgeCount }})
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { formatDateFromInt, getStatusTagTypeFromLabel, getBreachTagType, getBreachDisplayText, getBreachDescription, canPerformAction } from '@/utils/helpers';

export default {
  name: 'KRITableCollectData',
  props: {
    data: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      selectedRows: [],
      editingValues: {}, // Store editing values for each row
      rowLoadingStates: {}, // Store loading states for each row
      batchLoading: false
    };
  },
  computed: {
    ...mapState('kri', ['currentUser']),
    
    // Sort data by role - input actions first, then approval actions
    sortedData() {
      const inputRows = [];
      const approvalRows = [];
      const otherRows = [];
      
      this.data.forEach(row => {
        if (this.canEditRow(row)) {
          inputRows.push({ ...row, rowType: 'input' });
        } else if (this.canReviewRow(row) || this.canAcknowledgeRow(row)) {
          approvalRows.push({ ...row, rowType: 'approval' });
        } else {
          otherRows.push({ ...row, rowType: 'other' });
        }
      });
      
      return [...inputRows, ...approvalRows, ...otherRows];
    },
    
    // Check if we have both input and approval sections
    hasBothSections() {
      const hasInput = this.sortedData.some(row => row.rowType === 'input');
      const hasApproval = this.sortedData.some(row => row.rowType === 'approval');
      return hasInput && hasApproval;
    },
    
    // Find the index where approval section starts (for divider)
    approvalSectionStartIndex() {
      return this.sortedData.findIndex(row => row.rowType === 'approval');
    },
    
    // Count functions for batch operations
    getBatchSaveCount() {
      return this.selectedRows.filter(row => this.canEditRow(row) && this.hasValidValue(row)).length;
    },
    
    getBatchSubmitCount() {
      return this.selectedRows.filter(row => this.canEditRow(row) && this.hasValidValue(row)).length;
    },
    
    getBatchApproveCount() {
      return this.selectedRows.filter(row => this.canReviewRow(row)).length;
    },
    
    getBatchAcknowledgeCount() {
      return this.selectedRows.filter(row => this.canAcknowledgeRow(row)).length;
    },
    
    // Check if batch actions are available
    hasBatchSaveActions() {
      return this.getBatchSaveCount > 0;
    },
    
    hasBatchSubmitActions() {
      return this.getBatchSubmitCount > 0;
    },
    
    hasBatchApproveActions() {
      return this.getBatchApproveCount > 0;
    },
    
    hasBatchAcknowledgeActions() {
      return this.getBatchAcknowledgeCount > 0;
    },
    
    // Section groupings
    hasInputActions() {
      return this.hasBatchSaveActions || this.hasBatchSubmitActions;
    },
    
    hasApprovalActions() {
      return this.hasBatchApproveActions || this.hasBatchAcknowledgeActions;
    },
    
    hasAnyBatchActions() {
      return this.hasInputActions || this.hasApprovalActions;
    }
  },
  watch: {
    // Watch for data changes and auto-select all rows
    sortedData: {
      handler(newData) {
        if (newData.length > 0) {
          this.$nextTick(() => {
            this.selectAllRows();
          });
        }
      },
      immediate: true
    }
  },
  methods: {
    ...mapActions('kri', ['saveKRIValue', 'updateKRIStatus', 'submitKRI']),
    
    // Permission checking methods
    canEditRow(row) {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: row.id,
        reportingDate: row.reportingDate
      };
      
      // Can edit in Pending Input, Under Rework, and Saved status
      return [10, 20, 30].includes(row.rawData.kri_status) &&
             canPerformAction(userPermissions, 'edit', row.rawData.kri_status, kriItem);
    },
    
    canReviewRow(row) {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: row.id,
        reportingDate: row.reportingDate
      };
      
      return row.rawData.kri_status === 40 && // Submitted to Data Provider Approver
             canPerformAction(userPermissions, 'review', row.rawData.kri_status, kriItem);
    },
    
    canAcknowledgeRow(row) {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: row.id,
        reportingDate: row.reportingDate
      };
      
      return row.rawData.kri_status === 50 && // Submitted to KRI Owner Approver
             canPerformAction(userPermissions, 'acknowledge', row.rawData.kri_status, kriItem);
    },
    
    // Utility methods
    getRowKey(row) {
      return `${row.id}_${row.reportingDate}`;
    },
    
    hasValidValue(row) {
      const value = this.editingValues[this.getRowKey(row)];
      return value !== null && value !== undefined && value !== '';
    },
    
    getRowLoading(row) {
      return this.rowLoadingStates[this.getRowKey(row)] || false;
    },
    
    setRowLoading(row, loading) {
      this.$set(this.rowLoadingStates, this.getRowKey(row), loading);
    },
    
    // Event handlers
    handleSelectionChange(selection) {
      this.selectedRows = selection;
      this.$emit('selection-change', selection);
    },
    
    handleKRIClick(kriId, reportingDate) {
      this.$emit('row-click', kriId, reportingDate);
    },
    
    handleValueChange(row) {
      // This is called when user changes the input value
      // We just store it in editingValues, no immediate action
    },
    
    // Single row actions
    async handleSingleSave(row) {
      const value = this.editingValues[this.getRowKey(row)];
      if (!value) {
        this.$message.warning('Please enter a valid KRI value');
        return;
      }
      
      this.setRowLoading(row, true);
      
      try {
        const result = await this.saveKRIValue({
          kriId: row.id,
          reportingDate: row.reportingDate,
          value: value.toString()
        });
        
        if (result.success) {
          this.$message.success(`KRI ${row.id} saved successfully`);
          // No need to emit data-updated since store is updated immediately
        } else {
          this.$message.error(result.error || `Failed to save KRI ${row.id}`);
        }
      } catch (error) {
        console.error('Save error:', error);
        this.$message.error(`Failed to save KRI ${row.id}`);
      } finally {
        this.setRowLoading(row, false);
      }
    },
    
    async handleSingleSaveAndSubmit(row) {
      const value = this.editingValues[this.getRowKey(row)];
      if (!value) {
        this.$message.warning('Please enter a valid KRI value');
        return;
      }
      
      this.setRowLoading(row, true);
      
      try {
        const saveResult = await this.saveKRIValue({
          kriId: row.id,
          reportingDate: row.reportingDate,
          value: value.toString()
        });
        
        if (!saveResult.success) {
          this.$message.error(saveResult.error || `Failed to save KRI ${row.id}`);
          return;
        }
        
        const submitResult = await this.submitKRI({
          kriId: row.id,
          reportingDate: row.reportingDate
        });
        
        if (submitResult.success) {
          this.$message.success(`KRI ${row.id} saved and submitted successfully`);
          // No need to emit data-updated since store is updated immediately
        } else {
          this.$message.error(submitResult.error || `Failed to submit KRI ${row.id}`);
        }
      } catch (error) {
        console.error('Save and submit error:', error);
        this.$message.error(`Failed to save and submit KRI ${row.id}`);
      } finally {
        this.setRowLoading(row, false);
      }
    },
    
    async handleSingleApprove(row) {
      this.setRowLoading(row, true);
      
      try {
        const result = await this.updateKRIStatus({
          kriId: row.id,
          reportingDate: row.reportingDate,
          newStatus: 50, // Move to KRI Owner Approver
          changedBy: this.currentUser.name,
          reason: 'Approved by Data Provider Approver'
        });
        
        if (result.success) {
          this.$message.success(`KRI ${row.id} approved successfully`);
          // No need to emit data-updated since store is updated immediately
        } else {
          this.$message.error(result.error || `Failed to approve KRI ${row.id}`);
        }
      } catch (error) {
        console.error('Approve error:', error);
        this.$message.error(`Failed to approve KRI ${row.id}`);
      } finally {
        this.setRowLoading(row, false);
      }
    },
    
    async handleSingleAcknowledge(row) {
      this.setRowLoading(row, true);
      
      try {
        const result = await this.updateKRIStatus({
          kriId: row.id,
          reportingDate: row.reportingDate,
          newStatus: 60, // Move to Finalized
          changedBy: this.currentUser.name,
          reason: 'Acknowledged by KRI Owner Approver'
        });
        
        if (result.success) {
          this.$message.success(`KRI ${row.id} acknowledged successfully`);
          // No need to emit data-updated since store is updated immediately
        } else {
          this.$message.error(result.error || `Failed to acknowledge KRI ${row.id}`);
        }
      } catch (error) {
        console.error('Acknowledge error:', error);
        this.$message.error(`Failed to acknowledge KRI ${row.id}`);
      } finally {
        this.setRowLoading(row, false);
      }
    },
    
    async handleSingleReject(row) {
      try {
        const reason = await this.$prompt('Please provide a reason for rejection:', 'Reject KRI', {
          confirmButtonText: 'Reject',
          cancelButtonText: 'Cancel',
          inputValidator: (value) => {
            if (!value || value.trim().length < 3) {
              return 'Reason must be at least 3 characters long';
            }
            return true;
          }
        });
        
        this.setRowLoading(row, true);
        
        const result = await this.updateKRIStatus({
          kriId: row.id,
          reportingDate: row.reportingDate,
          newStatus: 20, // Move to Under Rework
          changedBy: this.currentUser.name,
          reason: reason.value
        });
        
        if (result.success) {
          this.$message.success(`KRI ${row.id} rejected and sent back for rework`);
          // No need to emit data-updated since store is updated immediately
        } else {
          this.$message.error(result.error || `Failed to reject KRI ${row.id}`);
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Reject error:', error);
          this.$message.error(`Failed to reject KRI ${row.id}`);
        }
      } finally {
        this.setRowLoading(row, false);
      }
    },
    
    // Batch operations
    async handleBatchSave() {
      const savableRows = this.selectedRows.filter(row => this.canEditRow(row) && this.hasValidValue(row));
      
      if (savableRows.length === 0) {
        this.$message.warning('No valid rows selected for saving');
        return;
      }
      
      this.batchLoading = true;
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of savableRows) {
        try {
          const value = this.editingValues[this.getRowKey(row)];
          const result = await this.saveKRIValue({
            kriId: row.id,
            reportingDate: row.reportingDate,
            value: value.toString()
          });
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      this.batchLoading = false;
      
      if (successCount > 0) {
        this.$message.success(`Successfully saved ${successCount} KRIs`);
        // No need to emit data-updated since store is updated immediately
      }
      
      if (errorCount > 0) {
        this.$message.error(`Failed to save ${errorCount} KRIs`);
      }
    },
    
    async handleBatchSubmit() {
      const submittableRows = this.selectedRows.filter(row => this.canEditRow(row) && this.hasValidValue(row));
      
      if (submittableRows.length === 0) {
        this.$message.warning('No valid rows selected for submission');
        return;
      }
      
      this.batchLoading = true;
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of submittableRows) {
        try {
          const value = this.editingValues[this.getRowKey(row)];
          
          const saveResult = await this.saveKRIValue({
            kriId: row.id,
            reportingDate: row.reportingDate,
            value: value.toString()
          });
          
          if (!saveResult.success) {
            errorCount++;
            continue;
          }
          
          const submitResult = await this.submitKRI({
            kriId: row.id,
            reportingDate: row.reportingDate
          });
          
          if (submitResult.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      this.batchLoading = false;
      
      if (successCount > 0) {
        this.$message.success(`Successfully submitted ${successCount} KRIs`);
        // No need to emit data-updated since store is updated immediately
      }
      
      if (errorCount > 0) {
        this.$message.error(`Failed to submit ${errorCount} KRIs`);
      }
    },
    
    async handleBatchApprove() {
      const approvableRows = this.selectedRows.filter(row => this.canReviewRow(row));
      
      if (approvableRows.length === 0) {
        this.$message.warning('No rows selected for approval');
        return;
      }
      
      this.batchLoading = true;
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of approvableRows) {
        try {
          const result = await this.updateKRIStatus({
            kriId: row.id,
            reportingDate: row.reportingDate,
            newStatus: 50, // Move to KRI Owner Approver
            changedBy: this.currentUser.name,
            reason: 'Batch approved by Data Provider Approver'
          });
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      this.batchLoading = false;
      
      if (successCount > 0) {
        this.$message.success(`Successfully approved ${successCount} KRIs`);
        // No need to emit data-updated since store is updated immediately
      }
      
      if (errorCount > 0) {
        this.$message.error(`Failed to approve ${errorCount} KRIs`);
      }
    },
    
    async handleBatchAcknowledge() {
      const acknowledgableRows = this.selectedRows.filter(row => this.canAcknowledgeRow(row));
      
      if (acknowledgableRows.length === 0) {
        this.$message.warning('No rows selected for acknowledgment');
        return;
      }
      
      this.batchLoading = true;
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of acknowledgableRows) {
        try {
          const result = await this.updateKRIStatus({
            kriId: row.id,
            reportingDate: row.reportingDate,
            newStatus: 60, // Move to Finalized
            changedBy: this.currentUser.name,
            reason: 'Batch acknowledged by KRI Owner Approver'
          });
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      this.batchLoading = false;
      
      if (successCount > 0) {
        this.$message.success(`Successfully acknowledged ${successCount} KRIs`);
        // No need to emit data-updated since store is updated immediately
      }
      
      if (errorCount > 0) {
        this.$message.error(`Failed to acknowledge ${errorCount} KRIs`);
      }
    },

    isSelectable() {
      return true;
    },
    
    getStatusTagType(status) {
      return getStatusTagTypeFromLabel(status);
    },
    
    getBreachTagType,
    getBreachDisplayText,
    getBreachDescription,
    
    formatReportingDate(dateInt) {
      return formatDateFromInt(dateInt);
    },
    
    // Add row class name for styling
    getRowClassName({ row, rowIndex }) {
      const classes = [];
      
      if (row.rowType === 'input') {
        classes.push('input-row');
      } else if (row.rowType === 'approval') {
        classes.push('approval-row');
      }
      
      // Add divider class to first approval row if we have both sections
      if (this.hasBothSections && rowIndex === this.approvalSectionStartIndex) {
        classes.push('section-divider');
      }
      
      return classes.join(' ');
    },
    
    // Select all rows by default
    selectAllRows() {
      if (this.$refs.table) {
        this.sortedData.forEach(row => {
          this.$refs.table.toggleRowSelection(row, true);
        });
      }
    }
  }
};
</script>

<style scoped>
.table-actions {
  padding: 15px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.batch-section {
  margin-bottom: 15px;
}

.batch-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.batch-actions {
  display: flex;
  gap: 1%;
  flex-wrap: wrap;
  align-items: center;
}

.batch-button {
  margin-left: 0;
  margin-right: 0;
  flex: 1;
  min-width: 0;
  max-width: 24%;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: none;
  font-weight: 500;
}

.batch-divider {
  margin: 10px 0;
}

.action-buttons {
  display: flex;
  gap: 2%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}

.action-buttons .el-button {
  margin-left: 0;
  margin-right: 0;
}

/* Unified action button styles */
.action-button {
  flex: 1;
  min-width: 0;
  max-width: 48%;
  font-size: 11px;
  padding: 6px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ensure buttons maintain aspect ratio */
.action-button >>> .el-button__inner {
  padding: 0;
}

/* Unified Color Scheme */
/* Blue for Save actions */
.save-button {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.save-button:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

.save-button:active,
.save-button:focus {
  background-color: #1d4ed8;
  border-color: #1d4ed8;
}

/* Green for Submit/Approve/Acknowledge actions */
.submit-button,
.approve-button,
.acknowledge-button {
  background-color: #10b981;
  border-color: #10b981;
  color: white;
}

.submit-button:hover,
.approve-button:hover,
.acknowledge-button:hover {
  background-color: #059669;
  border-color: #059669;
}

.submit-button:active,
.submit-button:focus,
.approve-button:active,
.approve-button:focus,
.acknowledge-button:active,
.acknowledge-button:focus {
  background-color: #047857;
  border-color: #047857;
}

/* Red for Reject actions */
.reject-button {
  background-color: #ef4444;
  border-color: #ef4444;
  color: white;
}

.reject-button:hover {
  background-color: #dc2626;
  border-color: #dc2626;
}

.reject-button:active,
.reject-button:focus {
  background-color: #b91c1c;
  border-color: #b91c1c;
}

/* Disabled state for all action buttons */
.action-button:disabled,
.batch-button:disabled {
  background-color: #d1d5db;
  border-color: #d1d5db;
  color: #9ca3af;
  opacity: 0.6;
}

.action-button:disabled:hover,
.batch-button:disabled:hover {
  background-color: #d1d5db;
  border-color: #d1d5db;
  color: #9ca3af;
}

/* Section divider styling */
.kri-table >>> .section-divider td {
  border-top: 2px solid #e2e8f0 !important;
  position: relative;
}

.kri-table >>> .section-divider td::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #cbd5e0;
}

/* Row type styling */
.kri-table >>> .input-row {
  background-color: #f8fafc;
}

.kri-table >>> .approval-row {
  background-color: #fefefe;
}

.inline-edit {
  width: 100%;
}

.no-actions-text {
  color: #909399;
  font-size: 0.75rem;
  font-style: italic;
}

.kri-table >>> .el-table th {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
}

.kri-table >>> .el-table td {
  padding: 8px 0;
}

/* Fix caret-wrapper alignment to prevent line breaks */
.kri-table >>> .el-table th .cell {
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kri-table >>> .el-table th .caret-wrapper {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-left: 5px;
  vertical-align: middle;
}

.kri-table >>> .el-table th .sort-caret {
  display: block;
}

.kri-name-link {
  color: #3b82f6;
  font-weight: 500;
  padding: 0;
}

.kri-name-link:hover {
  color: #1d4ed8;
}

/* Responsive design for action buttons */
@media (max-width: 768px) {
  .action-button {
    max-width: 100%;
    margin-bottom: 2%;
  }
  
  .batch-button {
    max-width: 48%;
    margin-bottom: 1%;
  }
}

@media (min-width: 1200px) {
  .action-button {
    font-size: 12px;
    padding: 7px 10px;
  }
  
  .batch-button {
    max-width: 22%;
    font-size: 13px;
  }
}
</style>