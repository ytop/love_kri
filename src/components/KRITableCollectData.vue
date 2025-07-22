<template>
  <div class="kri-table">
    <div class="table-wrapper">
      <el-table
        ref="table"
        :data="expandedTableData"
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
          <div class="kri-name-container">
            <!-- Expand/Collapse button for calculated KRIs -->
            <el-button
              v-if="isCalculatedKRI(scope.row) && !scope.row.isAtomicRow"
              type="text"
              @click.stop="toggleRowExpansion(scope.row)"
              class="expand-button"
              :icon="isRowExpanded(scope.row) ? 'el-icon-caret-bottom' : 'el-icon-caret-right'"
            >
            </el-button>
            
            <!-- KRI Name button -->
            <el-button
              v-if="!scope.row.isAtomicRow"
              type="text"
              @click="handleKRIClick(scope.row.id, scope.row.reportingDate)"
              class="kri-name-link"
              :class="{ 'with-expand-button': isCalculatedKRI(scope.row) }"
            >
              {{ scope.row.name }}
            </el-button>
            
            <!-- Atomic element name for sub-rows -->
            <div v-if="scope.row.isAtomicRow" class="atomic-name-display">
              <i class="el-icon-right atomic-indent"></i>
              <span class="atomic-element-name">{{ scope.row.name }}</span>
              <el-tag size="mini" type="info" class="atomic-tag">Atomic</el-tag>
            </div>
          </div>
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
          <!-- Atomic value editing for atomic sub-rows -->
          <div v-if="scope.row.isAtomicRow && canEditAtomicElement(scope.row)" class="inline-edit atomic-edit">
            <el-input-number
              v-model="atomicEditingValues[scope.row.atomic_id]"
              :precision="2"
              size="mini"
              style="width: 100%"
              :placeholder="scope.row.kriValue"
              @change="handleAtomicValueChange(scope.row)"
            />
          </div>
          <!-- Regular KRI value editing -->
          <div v-else-if="!scope.row.isAtomicRow && canEditRow(scope.row)" class="inline-edit">
            <el-input-number
              v-model="editingValues[getRowKey(scope.row)]"
              :precision="2"
              size="mini"
              style="width: 100%"
              :placeholder="scope.row.kriValue"
              @change="handleValueChange(scope.row)"
            />
          </div>
          <!-- Display-only value -->
          <div v-else class="value-display">
            <span :class="{ 'atomic-value': scope.row.isAtomicRow }">
              {{ scope.row.kriValue || 'N/A' }}
            </span>
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
            <!-- Atomic Actions for atomic sub-rows -->
            <template v-if="scope.row.isAtomicRow && canEditAtomicElement(scope.row)">
              <el-button
                size="mini"
                icon="el-icon-check"
                @click="handleAtomicSave(scope.row)"
                :disabled="!hasValidAtomicValue(scope.row)"
                :loading="getAtomicLoading(scope.row)"
                class="action-button save-button atomic-action"
              >
                Save
              </el-button>
              
              <!-- Submit button for atomic status 30 -->
              <el-button
                v-if="scope.row.rawData.atomic_status === 30"
                size="mini"
                icon="el-icon-upload"
                @click="handleAtomicSubmitSaved(scope.row)"
                :loading="getAtomicLoading(scope.row)"
                class="action-button submit-button atomic-action"
              >
                Submit
              </el-button>
              
              <!-- Save and Submit button for atomic statuses 10,20 -->
              <el-button
                v-if="[10, 20].includes(scope.row.rawData.atomic_status)"
                size="mini"
                icon="el-icon-upload"
                @click="handleAtomicSaveAndSubmit(scope.row)"
                :disabled="!hasValidAtomicValue(scope.row)"
                :loading="getAtomicLoading(scope.row)"
                class="action-button submit-button atomic-action"
              >
                Save & Submit
              </el-button>
            </template>
            
            <!-- Atomic Review Actions -->
            <template v-else-if="scope.row.isAtomicRow && canApproveAtomicElement(scope.row)">
              <el-button
                size="mini"
                icon="el-icon-check"
                @click="handleAtomicApprove(scope.row)"
                :loading="getAtomicLoading(scope.row)"
                class="action-button approve-button atomic-action"
              >
                Approve
              </el-button>
              <el-button
                size="mini"
                icon="el-icon-close"
                @click="handleAtomicReject(scope.row)"
                :loading="getAtomicLoading(scope.row)"
                class="action-button reject-button atomic-action"
              >
                Reject
              </el-button>
            </template>
            
            <!-- Atomic Acknowledge Actions -->
            <template v-else-if="scope.row.isAtomicRow && canAcknowledgeAtomicElement(scope.row)">
              <el-button
                size="mini"
                icon="el-icon-check"
                @click="handleAtomicAcknowledge(scope.row)"
                :loading="getAtomicLoading(scope.row)"
                class="action-button acknowledge-button atomic-action"
              >
                Ack
              </el-button>
              <el-button
                size="mini"
                icon="el-icon-close"
                @click="handleAtomicReject(scope.row)"
                :loading="getAtomicLoading(scope.row)"
                class="action-button reject-button atomic-action"
              >
                Reject
              </el-button>
            </template>
            
            <!-- Input Actions for editable KRI rows -->
            <template v-else-if="!scope.row.isAtomicRow && canEditRow(scope.row)">
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
              
              <!-- Submit button for status 30 (Saved) - can submit without new input -->
              <el-button
                v-if="scope.row.rawData.kri_status === 30"
                size="mini"
                icon="el-icon-upload"
                @click="handleSingleSubmitSaved(scope.row)"
                :loading="getRowLoading(scope.row)"
                class="action-button submit-button"
              >
                Submit
              </el-button>
              
              <!-- Save and Submit button for statuses 10,20 - requires input -->
              <el-button
                v-if="[10, 20].includes(scope.row.rawData.kri_status)"
                size="mini"
                icon="el-icon-upload"
                @click="handleSingleSaveAndSubmit(scope.row)"
                :disabled="!hasValidValue(scope.row)"
                :loading="getRowLoading(scope.row)"
                class="action-button submit-button"
              >
                Save & Submit
              </el-button>
            </template>
            
            <!-- Review Actions for Data Provider Approver -->
            <template v-else-if="!scope.row.isAtomicRow && canReviewRow(scope.row)">
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
            <template v-else-if="!scope.row.isAtomicRow && canAcknowledgeRow(scope.row)">
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
            
            <!-- No actions available -->
            <template v-else>
              <span class="no-actions-text">
                {{ scope.row.isAtomicRow ? 'Atomic view only' : 'Click KRI name to view' }}
              </span>
            </template>
          </div>
        </template>
      </el-table-column>
      </el-table>
    </div>
    
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
            v-if="hasBatchSubmitSavedActions"
            icon="el-icon-upload"
            @click="handleBatchSubmitSaved"
            :loading="batchLoading"
            class="batch-button submit-button"
          >
            Batch Submit Saved ({{ getBatchSubmitSavedCount }})
          </el-button>
          <el-button
            v-if="hasBatchSaveAndSubmitActions"
            icon="el-icon-upload"
            @click="handleBatchSaveAndSubmit"
            :loading="batchLoading"
            class="batch-button submit-button"
          >
            Batch Save & Submit ({{ getBatchSaveAndSubmitCount }})
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
import { mapState } from 'vuex';
import { formatDateFromInt, getStatusTagTypeFromLabel, getBreachTagType, getBreachDisplayText, getBreachDescription } from '@/utils/helpers';
import { kriCollectDataTableMixin } from '@/mixins/kriTableMixin';
import { kriOperationMixin } from '@/mixins/kriOperationMixin';
import PermissionManager from '@/utils/PermissionManager';
import StatusManager from '@/utils/StatusManager';

export default {
  name: 'KRITableCollectData',
  mixins: [kriCollectDataTableMixin, kriOperationMixin],
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
      editingValues: {}, // Store editing values for each row (mixin handles the rest)
      atomicEditingValues: {}, // Store editing values for atomic elements
      // Batch loading state
      batchLoading: false,
      // Row-level loading states
      rowLoadingStates: {},
      // Atomic-level loading states
      atomicLoadingStates: {},
      // Expansion state management
      expandedRows: {},
      atomicDataCache: {}
    };
  },
  computed: {
    ...mapState('kri', ['currentUser']),
    
    // Provide tableData for mixin compatibility
    tableData() {
      return this.data;
    },
    
    // Create expanded table data with atomic sub-rows (default expanded for calculated KRIs)
    expandedTableData() {
      const inputRows = [];
      const approvalRows = [];
      const otherRows = [];
      
      this.data.forEach(row => {
        let processedRow = { ...row };
        
        // Classify the row type
        if (this.canEditRow(row)) {
          processedRow.rowType = 'input';
          inputRows.push(processedRow);
        } else if (this.canReviewRow(row) || this.canAcknowledgeRow(row)) {
          processedRow.rowType = 'approval';
          approvalRows.push(processedRow);
        } else {
          processedRow.rowType = 'other';
          otherRows.push(processedRow);
        }
        
        // Add atomic sub-rows for calculated KRIs
        if (this.isCalculatedKRI(row)) {
          // Default to expanded for collect data table
          if (!Object.prototype.hasOwnProperty.call(this.expandedRows, this.getRowKey(row))) {
            this.$set(this.expandedRows, this.getRowKey(row), true);
            // Auto-load atomic data for calculated KRIs
            this.loadAtomicData(row);
          }
          
          if (this.isRowExpanded(row)) {
            const atomicData = this.atomicDataCache[this.getRowKey(row)];
            if (atomicData && atomicData.length > 0) {
              atomicData.forEach(atomicItem => {
                const atomicRow = {
                  ...atomicItem,
                  isAtomicRow: true,
                  parentKriId: row.id,
                  parentReportingDate: row.reportingDate,
                  // Map atomic properties to table column structure
                  id: `${row.id}_atomic_${atomicItem.atomic_id}`,
                  name: atomicItem.atomic_metadata || `Element ${atomicItem.atomic_id}`,
                  kriValue: atomicItem.atomic_value,
                  collectionStatus: this.mapAtomicStatus(atomicItem.atomic_status),
                  owner: row.owner,
                  dataProvider: row.dataProvider,
                  reportingDate: row.reportingDate,
                  reportingCycle: row.reportingCycle,
                  rowType: processedRow.rowType, // Inherit parent's row type
                  rawData: {
                    ...atomicItem,
                    kri_status: atomicItem.atomic_status,
                    atomic_status: atomicItem.atomic_status
                  }
                };
                
                // Add to appropriate section based on parent row type
                if (processedRow.rowType === 'input') {
                  inputRows.push(atomicRow);
                } else if (processedRow.rowType === 'approval') {
                  approvalRows.push(atomicRow);
                } else {
                  otherRows.push(atomicRow);
                }
              });
            }
          }
        }
      });
      
      return [...inputRows, ...approvalRows, ...otherRows];
    },
    
    // Update sortedData to use expandedTableData for backward compatibility
    sortedData() {
      return this.expandedTableData;
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
    
    getBatchSubmitSavedCount() {
      return this.selectedRows.filter(row => 
        this.canEditRow(row) && row.rawData.kri_status === 30
      ).length;
    },
    
    getBatchSaveAndSubmitCount() {
      return this.selectedRows.filter(row => 
        this.canEditRow(row) && [10, 20].includes(row.rawData.kri_status) && this.hasValidValue(row)
      ).length;
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
    
    hasBatchSubmitSavedActions() {
      return this.getBatchSubmitSavedCount > 0;
    },
    
    hasBatchSaveAndSubmitActions() {
      return this.getBatchSaveAndSubmitCount > 0;
    },
    
    hasBatchApproveActions() {
      return this.getBatchApproveCount > 0;
    },
    
    hasBatchAcknowledgeActions() {
      return this.getBatchAcknowledgeCount > 0;
    },
    
    // Section groupings
    hasInputActions() {
      return this.hasBatchSaveActions || this.hasBatchSubmitSavedActions || this.hasBatchSaveAndSubmitActions;
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
    },
    
    // Watch for currentUser and data changes to initialize operations
    currentUser: {
      handler(newUser) {
        if (newUser && this.data.length > 0) {
          this.initializeOperations();
        }
      },
      immediate: true
    },
    
    data: {
      handler(newData) {
        if (newData && newData.length > 0 && this.currentUser) {
          this.initializeOperations();
        }
      },
      immediate: true
    }
  },
  
  methods: {
    // Initialize KRI operations when both user and data are available
    async initializeOperations() {
      if (!this.currentUser || !this.data || this.data.length === 0) {
        return;
      }
      
      // Small delay to ensure store is fully loaded
      await this.$nextTick();
      
      try {
        // Use first row as representative for initializing operations
        const firstRow = this.data[0];
        const kriItem = this.transformRowToKRIItem(firstRow);
        
        // Only initialize if we have the required kriOperationMixin methods
        if (typeof this.initializeKRIOperations === 'function') {
          await this.initializeKRIOperations(kriItem);
        }
      } catch (error) {
        console.error('Failed to initialize KRI operations:', error);
        // Don't show error message to user as this is internal initialization
      }
    },
    
    // Transform row data to KRI item format for manager usage
    transformRowToKRIItem(row) {
      return {
        id: row.id,
        reportingDate: row.reportingDate,
        kri_status: row.rawData?.kri_status || 10,
        kri_owner: row.owner,
        data_provider: row.dataProvider,
        rawData: row.rawData
      };
    },
    
    // Permission checking methods using NEW PermissionManager
    canEditRow(row) {
      const kriItem = this.transformRowToKRIItem(row);
      return PermissionManager.canPerformAction(
        this.currentUser.permissions, 
        'edit', 
        row.rawData.kri_status, 
        kriItem
      ) && StatusManager.allowsEdit(row.rawData.kri_status);
    },
    
    canReviewRow(row) {
      const kriItem = this.transformRowToKRIItem(row);
      return PermissionManager.canPerformAction(
        this.currentUser.permissions, 
        'review', 
        row.rawData.kri_status, 
        kriItem
      ) && row.rawData.kri_status === 40;
    },
    
    canAcknowledgeRow(row) {
      const kriItem = this.transformRowToKRIItem(row);
      return PermissionManager.canPerformAction(
        this.currentUser.permissions, 
        'acknowledge', 
        row.rawData.kri_status, 
        kriItem
      ) && row.rawData.kri_status === 50;
    },
    
    // Utility methods (mixin provides most utility methods)
    hasValidValue(row) {
      const value = this.editingValues[this.getRowKey(row)];
      return value !== null && value !== undefined && value !== '';
    },
    
    // Event handlers (override mixin if needed)
    
    handleKRIClick(kriId, reportingDate) {
      this.$emit('row-click', kriId, reportingDate);
    },
    
    handleValueChange(_row) {
      // This is called when user changes the input value
      // We just store it in editingValues, no immediate action
    },
    
    // Single row actions using NEW Manager Pattern
    async handleSingleSave(row) {
      const value = this.editingValues[this.getRowKey(row)];
      if (!value) {
        this.$message.warning('Please enter a valid KRI value');
        return;
      }
      
      try {
        // Use the mixin's executeRowAction which uses KRIOperationManager
        const result = await this.executeRowAction(row, 'save', { value: value.toString() });
        
        if (result.success) {
          this.$message.success(`KRI ${row.id} saved successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to save KRI ${row.id}`);
        }
      } catch (error) {
        console.error('Save error:', error);
        this.$message.error(`Failed to save KRI ${row.id}`);
        this.$emit('data-updated');
      }
    },
    
    async handleSingleSaveAndSubmit(row) {
      const value = this.editingValues[this.getRowKey(row)];
      if (!value) {
        this.$message.warning('Please enter a valid KRI value');
        return;
      }
      
      try {
        // First save using Manager Pattern
        const saveResult = await this.executeRowAction(row, 'save', { value: value.toString() });
        
        if (!saveResult.success) {
          this.$message.error(saveResult.error || `Failed to save KRI ${row.id}`);
          return;
        }
        
        // Then submit using Manager Pattern  
        const submitResult = await this.executeRowAction(row, 'submit');
        
        if (submitResult.success) {
          this.$message.success(`KRI ${row.id} saved and submitted successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(submitResult.error || `Failed to submit KRI ${row.id}`);
        }
      } catch (error) {
        console.error('Save and submit error:', error);
        this.$message.error(`Failed to save and submit KRI ${row.id}`);
        this.$emit('data-updated');
      }
    },

    async handleSingleSubmitSaved(row) {
      try {
        const result = await this.executeRowAction(row, 'submit');
        if (result.success) {
          this.$message.success(`KRI ${row.id} submitted successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to submit KRI ${row.id}`);
        }
      } catch (error) {
        console.error('Submit saved error:', error);
        this.$message.error(`Failed to submit KRI ${row.id}`);
        this.$emit('data-updated');
      }
    },
    
    async handleSingleApprove(row) {
      try {
        const result = await this.executeRowAction(row, 'approve', { 
          comment: 'Approved by Data Provider Approver' 
        });
        
        if (result.success) {
          this.$message.success(`KRI ${row.id} approved successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to approve KRI ${row.id}`);
        }
      } catch (error) {
        console.error('Approve error:', error);
        this.$message.error(`Failed to approve KRI ${row.id}`);
        this.$emit('data-updated');
      }
    },
    
    async handleSingleAcknowledge(row) {
      try {
        const result = await this.executeRowAction(row, 'approve', { 
          comment: 'Acknowledged by KRI Owner Approver' 
        });
        
        if (result.success) {
          this.$message.success(`KRI ${row.id} acknowledged successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to acknowledge KRI ${row.id}`);
        }
      } catch (error) {
        console.error('Acknowledge error:', error);
        this.$message.error(`Failed to acknowledge KRI ${row.id}`);
        this.$emit('data-updated');
      }
    },
    
    async handleSingleReject(row) {
      try {
        const reason = await this.showInputPrompt(
          'Reject KRI', 
          'Please provide a reason for rejection:',
          (value) => {
            if (!value || value.trim().length < 3) {
              return 'Reason must be at least 3 characters long';
            }
            return true;
          }
        );
        
        if (!reason) return; // User cancelled
        
        const result = await this.executeRowAction(row, 'reject', { reason });
        
        if (result.success) {
          this.$message.success(`KRI ${row.id} rejected and sent back for rework`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to reject KRI ${row.id}`);
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Reject error:', error);
          this.$message.error(`Failed to reject KRI ${row.id}`);
          this.$emit('data-updated');
        }
      }
    },
    
    // Batch operations using NEW Manager Pattern
    async handleBatchSave() {
      const savableRows = this.selectedRows.filter(row => this.canEditRow(row) && this.hasValidValue(row));
      
      if (savableRows.length === 0) {
        this.$message.warning('No valid rows selected for saving');
        return;
      }
      
      try {
        // Use the mixin's bulk operation capability
        await this.executeBulkAction('save', { 
          getValueForRow: (row) => this.editingValues[this.getRowKey(row)] 
        });
        this.$emit('data-updated');
      } catch (error) {
        console.error('Batch save error:', error);
        this.$message.error('Batch save operation failed');
        this.$emit('data-updated');
      }
    },
    


    async handleBatchSubmitSaved() {
      const submittableRows = this.selectedRows.filter(row => 
        this.canEditRow(row) && row.rawData.kri_status === 30
      );
      
      if (submittableRows.length === 0) {
        this.$message.warning('No saved KRIs selected for submission');
        return;
      }
      
      try {
        await this.executeBulkAction('submit');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Batch submit error:', error);
        this.$message.error('Batch submit operation failed');
        this.$emit('data-updated');
      }
    },

    async handleBatchSaveAndSubmit() {
      const submittableRows = this.selectedRows.filter(row => 
        this.canEditRow(row) && [10, 20].includes(row.rawData.kri_status) && this.hasValidValue(row)
      );
      
      if (submittableRows.length === 0) {
        this.$message.warning('No valid rows with input selected for save and submit');
        return;
      }
      
      try {
        // Use bulk operations for save then submit
        await this.executeBulkAction('save', { 
          getValueForRow: (row) => this.editingValues[this.getRowKey(row)] 
        });
        
        // Then bulk submit
        await this.executeBulkAction('submit');
        
        this.$emit('data-updated');
      } catch (error) {
        console.error('Batch save and submit error:', error);
        this.$message.error('Batch save and submit operation failed');
        this.$emit('data-updated');
      }
    },
    
    async handleBatchApprove() {
      const approvableRows = this.selectedRows.filter(row => this.canReviewRow(row));
      
      if (approvableRows.length === 0) {
        this.$message.warning('No rows selected for approval');
        return;
      }
      
      try {
        await this.executeBulkAction('approve', { 
          comment: 'Batch approved by Data Provider Approver' 
        });
        this.$emit('data-updated');
      } catch (error) {
        console.error('Batch approve error:', error);
        this.$message.error('Batch approve operation failed');
        this.$emit('data-updated');
      }
    },
    
    async handleBatchAcknowledge() {
      const acknowledgableRows = this.selectedRows.filter(row => this.canAcknowledgeRow(row));
      
      if (acknowledgableRows.length === 0) {
        this.$message.warning('No rows selected for acknowledgment');
        return;
      }
      
      try {
        await this.executeBulkAction('approve', { 
          comment: 'Batch acknowledged by KRI Owner Approver' 
        });
        this.$emit('data-updated');
      } catch (error) {
        console.error('Batch acknowledge error:', error);
        this.$message.error('Batch acknowledge operation failed');
        this.$emit('data-updated');
      }
    },

    isSelectable(row) {
      // Only main KRI rows should be selectable, not atomic sub-rows
      return !row.isAtomicRow;
    },
    
    // Get row loading state
    getRowLoading(row) {
      const key = `${row.id}_${row.reportingDate}`;
      return this.rowLoadingStates[key] || false;
    },
    
    // Set row loading state
    setRowLoading(row, loading) {
      const key = `${row.id}_${row.reportingDate}`;
      this.$set(this.rowLoadingStates, key, loading);
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
      
      if (row.isAtomicRow) {
        classes.push('atomic-sub-row');
      } else {
        if (row.rowType === 'input') {
          classes.push('input-row');
        } else if (row.rowType === 'approval') {
          classes.push('approval-row');
        }
        
        // Add calculated KRI classes
        if (this.isCalculatedKRI(row)) {
          classes.push('calculated-kri-row');
          if (this.isRowExpanded(row)) {
            classes.push('expanded');
          }
        }
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
          // Only select main KRI rows, not atomic sub-rows
          if (!row.isAtomicRow) {
            this.$refs.table.toggleRowSelection(row, true);
          }
        });
      }
    },
    
    // Calculated KRI detection
    isCalculatedKRI(row) {
      // Check if this KRI has the calculated flag
      return row.rawData?.is_calculated_kri === true || 
             row.rawData?.is_calculated_kri === 1 ||
             row.isCalculated === true;
    },
    
    // Expansion state management
    getRowKey(row) {
      return `${row.id}_${row.reportingDate}`;
    },
    
    isRowExpanded(row) {
      return this.expandedRows[this.getRowKey(row)] || false;
    },
    
    async toggleRowExpansion(row) {
      const key = this.getRowKey(row);
      const isExpanded = this.isRowExpanded(row);
      
      if (isExpanded) {
        // Collapse the row
        this.$set(this.expandedRows, key, false);
      } else {
        // Expand the row - fetch atomic data if not cached
        if (!this.atomicDataCache[key]) {
          await this.loadAtomicData(row);
        }
        this.$set(this.expandedRows, key, true);
      }
    },
    
    async loadAtomicData(row) {
      const key = this.getRowKey(row);
      
      try {
        // Use the store to fetch atomic data
        const result = await this.$store.dispatch('kri/fetchAtomicData', {
          kriId: row.id,
          reportingDate: row.reportingDate
        });
        
        if (result.success) {
          const atomicData = result.data || [];
          this.$set(this.atomicDataCache, key, atomicData);
          
          // Initialize atomic editing values
          atomicData.forEach(item => {
            if (!this.atomicEditingValues[item.atomic_id]) {
              this.$set(this.atomicEditingValues, item.atomic_id, parseFloat(item.atomic_value) || 0);
            }
          });
        } else {
          console.error('Failed to load atomic data:', result.error);
          this.$set(this.atomicDataCache, key, []);
        }
      } catch (error) {
        console.error('Error loading atomic data:', error);
        this.$set(this.atomicDataCache, key, []);
      }
    },
    
    // Status mapping for atomic elements
    mapAtomicStatus(status) {
      const statusMap = {
        10: 'Pending Input',
        20: 'Under Rework', 
        30: 'Saved',
        40: 'Submitted to Data Provider Approver',
        50: 'Submitted to KRI Owner Approver',
        60: 'Finalized'
      };
      return statusMap[status] || 'Unknown';
    },
    
    // Atomic permission checking
    canEditAtomicElement(atomicRow) {
      if (!this.currentUser || !this.currentUser.permissions || !atomicRow.isAtomicRow) {
        return false;
      }
      
      const kriItem = {
        id: atomicRow.parentKriId,
        reportingDate: atomicRow.parentReportingDate,
        kri_owner: atomicRow.owner,
        data_provider: atomicRow.dataProvider
      };
      
      // Can edit in statuses 10, 20, 30 with proper permissions
      const canEdit = [10, 20, 30].includes(atomicRow.rawData.atomic_status);
      const hasPermission = PermissionManager.canPerformAction(
        this.currentUser.permissions, 
        'edit', 
        atomicRow.rawData.atomic_status, 
        kriItem
      );
      
      return canEdit && hasPermission && StatusManager.allowsEdit(atomicRow.rawData.atomic_status);
    },
    
    canApproveAtomicElement(atomicRow) {
      if (!this.currentUser || !this.currentUser.permissions || !atomicRow.isAtomicRow) {
        return false;
      }
      
      const kriItem = {
        id: atomicRow.parentKriId,
        reportingDate: atomicRow.parentReportingDate,
        kri_owner: atomicRow.owner,
        data_provider: atomicRow.dataProvider
      };
      
      // Can only approve items in status 40 (Submitted to Data Provider Approver)
      const canApprove = atomicRow.rawData.atomic_status === 40;
      const hasPermission = PermissionManager.canPerformAction(
        this.currentUser.permissions,
        'review',
        atomicRow.rawData.atomic_status,
        kriItem
      );
      
      return canApprove && hasPermission;
    },
    
    canAcknowledgeAtomicElement(atomicRow) {
      if (!this.currentUser || !this.currentUser.permissions || !atomicRow.isAtomicRow) {
        return false;
      }
      
      const kriItem = {
        id: atomicRow.parentKriId,
        reportingDate: atomicRow.parentReportingDate,
        kri_owner: atomicRow.owner,
        data_provider: atomicRow.dataProvider
      };
      
      // Can acknowledge if in submitted to KRI Owner status and has permission
      const canAcknowledge = atomicRow.rawData.atomic_status === 50;
      const hasPermission = PermissionManager.canPerformAction(
        this.currentUser.permissions,
        'acknowledge',
        atomicRow.rawData.atomic_status,
        kriItem
      );
      
      return canAcknowledge && hasPermission;
    },
    
    // Atomic value validation
    hasValidAtomicValue(atomicRow) {
      if (!atomicRow.isAtomicRow) return false;
      const value = this.atomicEditingValues[atomicRow.atomic_id];
      return value !== null && value !== undefined && value !== '';
    },
    
    // Atomic loading state management
    getAtomicLoading(atomicRow) {
      if (!atomicRow.isAtomicRow) return false;
      return this.atomicLoadingStates[atomicRow.atomic_id] || false;
    },
    
    setAtomicLoading(atomicRow, loading) {
      if (atomicRow.isAtomicRow) {
        this.$set(this.atomicLoadingStates, atomicRow.atomic_id, loading);
      }
    },
    
    // Atomic event handlers
    handleAtomicValueChange(_atomicRow) {
      // This is called when user changes the atomic input value
      // Value is already stored in atomicEditingValues, no immediate action needed
    },
    
    // Atomic action handlers
    async handleAtomicSave(atomicRow) {
      const value = this.atomicEditingValues[atomicRow.atomic_id];
      if (!value) {
        this.$message.warning('Please enter a valid atomic value');
        return;
      }
      
      this.setAtomicLoading(atomicRow, true);
      
      try {
        const result = await this.$store.dispatch('kri/saveAtomicValue', {
          kriId: atomicRow.parentKriId,
          reportingDate: atomicRow.parentReportingDate,
          atomicId: atomicRow.atomic_id,
          value: value.toString()
        });
        
        if (result.success) {
          this.$message.success(`Atomic element ${atomicRow.atomic_id} saved successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to save atomic element ${atomicRow.atomic_id}`);
        }
      } catch (error) {
        console.error('Atomic save error:', error);
        this.$message.error(`Failed to save atomic element ${atomicRow.atomic_id}`);
        this.$emit('data-updated');
      } finally {
        this.setAtomicLoading(atomicRow, false);
      }
    },
    
    async handleAtomicSubmitSaved(atomicRow) {
      this.setAtomicLoading(atomicRow, true);
      
      try {
        const result = await this.$store.dispatch('kri/submitAtomicElement', {
          kriId: atomicRow.parentKriId,
          reportingDate: atomicRow.parentReportingDate,
          atomicId: atomicRow.atomic_id
        });
        
        if (result.success) {
          this.$message.success(`Atomic element ${atomicRow.atomic_id} submitted successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to submit atomic element ${atomicRow.atomic_id}`);
        }
      } catch (error) {
        console.error('Atomic submit error:', error);
        this.$message.error(`Failed to submit atomic element ${atomicRow.atomic_id}`);
        this.$emit('data-updated');
      } finally {
        this.setAtomicLoading(atomicRow, false);
      }
    },
    
    async handleAtomicSaveAndSubmit(atomicRow) {
      const value = this.atomicEditingValues[atomicRow.atomic_id];
      if (!value) {
        this.$message.warning('Please enter a valid atomic value');
        return;
      }
      
      this.setAtomicLoading(atomicRow, true);
      
      try {
        const result = await this.$store.dispatch('kri/saveAndSubmitAtomicElement', {
          kriId: atomicRow.parentKriId,
          reportingDate: atomicRow.parentReportingDate,
          atomicId: atomicRow.atomic_id,
          value: value.toString()
        });
        
        if (result.success) {
          this.$message.success(`Atomic element ${atomicRow.atomic_id} saved and submitted successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to save and submit atomic element ${atomicRow.atomic_id}`);
        }
      } catch (error) {
        console.error('Atomic save and submit error:', error);
        this.$message.error(`Failed to save and submit atomic element ${atomicRow.atomic_id}`);
        this.$emit('data-updated');
      } finally {
        this.setAtomicLoading(atomicRow, false);
      }
    },
    
    async handleAtomicApprove(atomicRow) {
      this.setAtomicLoading(atomicRow, true);
      
      try {
        const result = await this.$store.dispatch('kri/approveAtomicElements', {
          kriId: atomicRow.parentKriId,
          reportingDate: atomicRow.parentReportingDate,
          atomicIds: [atomicRow.atomic_id]
        });
        
        if (result.success) {
          this.$message.success(`Atomic element ${atomicRow.atomic_id} approved successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to approve atomic element ${atomicRow.atomic_id}`);
        }
      } catch (error) {
        console.error('Atomic approve error:', error);
        this.$message.error(`Failed to approve atomic element ${atomicRow.atomic_id}`);
        this.$emit('data-updated');
      } finally {
        this.setAtomicLoading(atomicRow, false);
      }
    },
    
    async handleAtomicAcknowledge(atomicRow) {
      this.setAtomicLoading(atomicRow, true);
      
      try {
        const result = await this.$store.dispatch('kri/acknowledgeAtomicElements', {
          kriId: atomicRow.parentKriId,
          reportingDate: atomicRow.parentReportingDate,
          atomicIds: [atomicRow.atomic_id]
        });
        
        if (result.success) {
          this.$message.success(`Atomic element ${atomicRow.atomic_id} acknowledged successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to acknowledge atomic element ${atomicRow.atomic_id}`);
        }
      } catch (error) {
        console.error('Atomic acknowledge error:', error);
        this.$message.error(`Failed to acknowledge atomic element ${atomicRow.atomic_id}`);
        this.$emit('data-updated');
      } finally {
        this.setAtomicLoading(atomicRow, false);
      }
    },
    
    async handleAtomicReject(atomicRow) {
      try {
        const reason = await this.showInputPrompt(
          'Reject Atomic Element', 
          'Please provide a reason for rejection:',
          (value) => {
            if (!value || value.trim().length < 3) {
              return 'Reason must be at least 3 characters long';
            }
            return true;
          }
        );
        
        if (!reason) return; // User cancelled
        
        this.setAtomicLoading(atomicRow, true);
        
        const result = await this.$store.dispatch('kri/rejectAtomicElements', {
          kriId: atomicRow.parentKriId,
          reportingDate: atomicRow.parentReportingDate,
          atomicIds: [atomicRow.atomic_id],
          reason
        });
        
        if (result.success) {
          this.$message.success(`Atomic element ${atomicRow.atomic_id} rejected and sent back for rework`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || `Failed to reject atomic element ${atomicRow.atomic_id}`);
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Atomic reject error:', error);
          this.$message.error(`Failed to reject atomic element ${atomicRow.atomic_id}`);
          this.$emit('data-updated');
        }
      } finally {
        this.setAtomicLoading(atomicRow, false);
      }
    }
  }
};
</script>

<style scoped>
/* Table wrapper with horizontal scroll */
.table-wrapper {
  overflow-x: auto;
  overflow-y: visible;
  max-width: 100%;
  min-width: 0;
  contain: layout style;
  scrollbar-gutter: stable;
  position: relative;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Prevent content shift when scrollbar appears */
.table-wrapper::-webkit-scrollbar {
  height: 12px;
}

.table-wrapper::-webkit-scrollbar-track {
  background-color: #f1f3f4;
  border-radius: 6px;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 6px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

.table-wrapper >>> .el-table {
  min-width: 1200px; /* Minimum width to ensure columns aren't too cramped */
  position: relative;
}

.table-wrapper >>> .el-table__body-wrapper {
  contain: layout;
}

/* Prevent ResizeObserver loops */
.kri-table >>> .el-table__header-wrapper,
.kri-table >>> .el-table__body-wrapper,
.kri-table >>> .el-table__footer-wrapper {
  transform: translateZ(0);
  backface-visibility: hidden;
}

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

/* KRI Name container for expand functionality */
.kri-name-container {
  display: flex;
  align-items: center;
  gap: 4px;
}

.expand-button {
  padding: 0 4px !important;
  font-size: 14px;
  color: #64748b;
  min-width: 20px;
}

.expand-button:hover {
  color: #3b82f6;
}

.kri-name-link.with-expand-button {
  margin-left: 0;
}

/* Calculated KRI row styling */
.kri-table >>> .calculated-kri-row {
  background-color: #fefefe;
}

.kri-table >>> .calculated-kri-row.expanded {
  background-color: #f0f9ff;
  border-bottom: 2px solid #bfdbfe;
}

/* Atomic sub-row styling */
.kri-table >>> .atomic-sub-row {
  background-color: #fafbfc !important;
  border-left: 3px solid #e2e8f0 !important;
}

.kri-table >>> .atomic-sub-row:hover {
  background-color: #f1f5f9 !important;
}

.kri-table >>> .atomic-sub-row td {
  padding: 8px 12px !important;
  font-size: 12px;
  color: #64748b;
  border-bottom: 1px solid #f1f5f9 !important;
}

/* Atomic name display styling */
.atomic-name-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

.atomic-indent {
  color: #cbd5e0;
  font-size: 10px;
}

.atomic-element-name {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
}

.atomic-tag {
  font-size: 10px;
  height: 18px;
  line-height: 16px;
}

/* Atomic value styling */
.atomic-edit {
  background-color: #fef3c7;
  padding: 2px;
  border-radius: 3px;
}

.value-display .atomic-value {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  color: #059669;
  font-weight: 600;
  background-color: #f0fdf4;
  padding: 4px 8px;
  border-radius: 3px;
  display: inline-block;
}

/* Atomic action buttons */
.atomic-action {
  font-size: 9px !important;
  padding: 2px 4px !important;
  margin: 1px !important;
  border-radius: 2px !important;
}

.atomic-action >>> .el-button__inner {
  padding: 0;
  font-size: 9px;
}
</style>