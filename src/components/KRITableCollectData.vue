<template>
  <div class="kri-table">
    <!-- Table header with config -->
    <div class="table-header">
      <span class="table-title">KRI Data Collection</span>
      <div class="header-actions">
        <table-column-config 
          :table-type="tableType"
          @preferences-changed="handlePreferencesChanged"
        />
      </div>
    </div>

    <el-table
      ref="table"
      :data="expandedTableData"
      v-loading="loading"
      style="width: 100%"
      fit
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
import { mapGetters } from 'vuex';
import TableColumnConfig from '@/components/TableColumnConfig.vue';
import TableColumnManager, { TABLE_TYPES } from '@/utils/tableColumnConfig';

export default {
  name: 'KRITableCollectData',
  components: {
    TableColumnConfig
  },
  data() {
    return {
      tableType: TABLE_TYPES.KRI_COLLECT_TABLE
    };
  },
  computed: {
    ...mapGetters('kri', ['getVisibleColumnsForTable']),

    visibleColumns() {
      const visibleColumnKeys = this.getVisibleColumnsForTable(this.tableType);
      return TableColumnManager.getVisibleColumns(this.tableType, visibleColumnKeys);
    }
  },
  methods: {
    handlePreferencesChanged() {
      // Force reactivity update when preferences change
      this.$forceUpdate();
    }
  }
};
</script>

<style scoped>
/* Table header styling */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
  padding: 0px 0px !important;
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