<template>
  <div class="data-elements">
    <div class="actions-toolbar">
        <div class="left-title">
            <h4>Data Elements</h4>
        </div>
        <div class="right-actions">
            <el-button
              v-if="canSubmitAtomicData"
              type="success"
              icon="el-icon-upload"
              @click="handleSubmitAtomicData"
              :loading="submittingAtomicData"
              size="small">
              Submit Atomic Data
            </el-button>
            <el-button
              v-if="showApproveButton"
              type="success"
              icon="el-icon-check"
              @click="approveSelectedRows"
              :disabled="!canApproveSelected"
              size="small">
              Approve Selected ({{ approvableCount }})
            </el-button>
            <el-button
              v-if="showRejectButton"
              type="danger"
              icon="el-icon-close"
              @click="rejectSelectedRows"
              :disabled="!canRejectSelected"
              size="small">
              Reject Selected
            </el-button>
            <el-button
              v-if="showAcknowledgeButton"
              type="primary"
              icon="el-icon-check"
              @click="acknowledgeSelectedRows"
              :disabled="!canAcknowledgeSelected"
              size="small">
              Acknowledge Selected ({{ acknowledgableCount }})
            </el-button>
        </div>
    </div>
    <div class="table-container">
      <table class="data-table" id="dataElementsTable">
        <thead>
            <tr>
                <th><input type="checkbox" id="selectAllCheckboxes" v-model="selectAll" @change="handleSelectAllChange"></th>
                <th>Element ID</th>
                <th>Data Element Name</th>
                <th>Value</th>
                <th>Status</th>
                <th>Provider</th>
                <th>Evidence</th>
                <th>Comment</th>
                <th class="fixed-column">Actions</th>
            </tr>
        </thead>
        <tbody>
            <tr v-if="atomicData.length === 0">
                <td colspan="9" style="text-align: center; padding: 16px;">No data elements available</td>
            </tr>
            <tr v-for="item in atomicData" :key="item.atomic_id" :data-item-status="mapAtomicStatus(item.atomic_status)">
                <td><input type="checkbox" class="row-checkbox" :value="item.atomic_id" v-model="selectedItems"></td>
                <td>{{ item.atomic_id }}</td>
                <td>{{ item.atomic_metadata }}</td> <!-- Using atomic_metadata for Data Element Name -->
                <td class="data-value" :data-original-value="item.atomic_value">
                  <template v-if="canEditAtomicElement(item)">
                    <div v-if="editingAtomic === item.atomic_id" class="inline-edit-container">
                      <el-input-number
                        v-model="editingValue"
                        :precision="2"
                        size="small"
                        @keyup.enter="saveAtomicValue(item)"
                        @keyup.esc="cancelEdit"
                        style="width: 120px"
                        ref="editInput">
                      </el-input-number>
                      <div class="inline-edit-actions">
                        <el-button
                          type="success"
                          icon="el-icon-check"
                          size="mini"
                          @click="saveAtomicValue(item)"
                          :loading="savingAtomic === item.atomic_id"
                          circle>
                        </el-button>
                        <el-button
                          type="info"
                          icon="el-icon-close"
                          size="mini"
                          @click="cancelEdit"
                          circle>
                        </el-button>
                      </div>
                    </div>
                    <div v-else class="editable-value" @click="startEditAtomic(item)">
                      <span class="value-display">{{ item.atomic_value || 'Click to edit' }}</span>
                      <i class="el-icon-edit-outline edit-icon"></i>
                    </div>
                  </template>
                  <template v-else>
                    <span class="readonly-value">{{ item.atomic_value || 'N/A' }}</span>
                  </template>
                </td>
                <td>
                    <el-tag 
                        :type="getAtomicStatusType(item.atomic_status)"
                        size="small"
                        class="status-tag">
                        {{ mapAtomicStatus(item.atomic_status) }}
                    </el-tag>
                </td>
                <td>{{ getProviderName(item) }}</td>
                <td class="evidence-cell">
                  <div class="evidence-content">
                    <span class="evidence-info">{{ getEvidenceInfo(item) }}</span>
                    <el-button
                      v-if="canUploadEvidence"
                      type="text"
                      size="mini"
                      icon="el-icon-upload2"
                      @click="showUploadModal"
                      class="evidence-upload-btn"
                    >
                      Upload
                    </el-button>
                  </div>
                </td>
                <td>{{ getCommentInfo(item) }}</td>
                <td class="fixed-column">
                  <div class="row-actions">
                    <template v-if="canEditAtomicElement(item)">
                      <el-button
                        type="primary"
                        icon="el-icon-check"
                        size="mini"
                        @click="saveAtomicElement(item)"
                        :loading="savingAtomic === item.atomic_id"
                        :disabled="!hasAtomicValue(item)">
                        Save
                      </el-button>
                      <el-button
                        v-if="item.atomic_status === 30"
                        type="success"
                        icon="el-icon-upload"
                        size="mini"
                        @click="submitAtomicElement(item)"
                        :loading="savingAtomic === item.atomic_id">
                        Submit
                      </el-button>
                      <el-button
                        v-if="[10, 20].includes(item.atomic_status)"
                        type="success"
                        icon="el-icon-upload"
                        size="mini"
                        @click="saveAndSubmitAtomicElement(item)"
                        :loading="savingAtomic === item.atomic_id"
                        :disabled="!hasAtomicValue(item)">
                        Save & Submit
                      </el-button>
                    </template>
                    <template v-else-if="canApproveAtomicElement(item)">
                      <el-button
                        type="success"
                        icon="el-icon-check"
                        size="mini"
                        @click="approveAtomicElement(item)">
                        Approve
                      </el-button>
                      <el-button
                        type="danger"
                        icon="el-icon-close"
                        size="mini"
                        @click="rejectAtomicElement(item)">
                        Reject
                      </el-button>
                    </template>
                    <template v-else-if="canAcknowledgeAtomicElement(item)">
                      <el-button
                        type="primary"
                        icon="el-icon-check"
                        size="mini"
                        @click="acknowledgeAtomicElement(item)">
                        Acknowledge
                      </el-button>
                      <el-button
                        type="danger"
                        icon="el-icon-close"
                        size="mini"
                        @click="rejectAtomicElement(item)">
                        Reject
                      </el-button>
                    </template>
                    <span v-else class="no-actions-text">No actions available</span>
                  </div>
                </td>
            </tr>
        </tbody>
      </table>
    </div>

    <!-- Calculation Details Section -->
    <div class="formula-result-section">
        <div class="formula-header">
          <h4>
            <i class="el-icon-s-data"></i>
            Calculation Details
          </h4>
          <el-tag v-if="isDynamicResult" type="success" size="mini" class="live-tag">
            <i class="el-icon-refresh"></i> Live
          </el-tag>
        </div>
        
        <div class="formula-content">
          <div class="formula-item">
            <div class="formula-label">
              <i class="el-icon-edit-outline"></i>
              <strong>Formula:</strong>
            </div>
            <code class="formula-code">{{ kriDetail.kri_formula || 'No formula defined' }}</code>
          </div>
          
          <div class="formula-item">
            <div class="formula-label">
              <i class="el-icon-s-operation"></i>
              <strong>Substitution:</strong>
            </div>
            <code class="calculation-code">{{ calculateFormula() }}</code>
          </div>
          
          <div class="formula-item result-item">
            <div class="formula-label">
              <i class="el-icon-s-marketing"></i>
              <strong>Result:</strong>
            </div>
            <div class="result-container">
              <span class="result-value" :class="{'result-highlight': isDynamicResult}">
                {{ calculatedResult }}
              </span>
              <div v-if="isDynamicResult" class="result-status">
                <el-tag type="warning" size="mini">
                  <i class="el-icon-warning-outline"></i>
                  Different from stored value ({{ kriDetail.kri_value }})
                </el-tag>
              </div>
            </div>
          </div>
          
          <div v-if="atomicData.length > 0" class="atomic-values-section">
            <div class="formula-label">
              <i class="el-icon-collection"></i>
              <strong>Atomic Values:</strong>
            </div>
            <div class="atomic-grid">
              <div v-for="item in atomicData" :key="item.atomic_id" class="atomic-card">
                <div class="atomic-header">
                  <span class="atomic-id">{{ item.atomic_id }}</span>
                  <el-tag :type="getAtomicStatusType(item.atomic_status)" size="mini">
                    {{ mapAtomicStatus(item.atomic_status) }}
                  </el-tag>
                </div>
                <div class="atomic-name">{{ item.atomic_metadata || `Element ${item.atomic_id}` }}</div>
                <div class="atomic-value-display">{{ item.atomic_value || 'N/A' }}</div>
              </div>
            </div>
          </div>
        </div>
    </div>

    <!-- Atomic Input Dialog -->
    <atomic-input-dialog
      v-model="showBulkInputDialog"
      :atomic-data="atomicData"
      :kri-detail="kriDetail"
      :previous-data="previousAtomicData"
      @data-updated="handleBulkDataUpdate">
    </atomic-input-dialog>

    <!-- Evidence Upload Modal -->
    <evidence-upload-modal
      :visible.sync="uploadModalVisible"
      :kri-id="kriDetail.kri_id"
      :reporting-date="kriDetail.reporting_date"
      @upload-success="handleUploadSuccess"
    />
  </div>
</template>

<script>

</script>

<style scoped>
.data-elements {
  padding: 0.5rem 0;
}

/* Actions Toolbar and Buttons */
.actions-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 15pt;
}

.actions-toolbar .right-actions {
    display: flex;
    gap: 12px;
    margin-left: auto;
}

.btn {
    padding: 10px 16px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    border-radius: 6px;
    transition: all 0.2s ease;
    text-align: center;
}
.btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.btn-success {
    background-color: #28a745;
    color: white;
}
.btn-success:hover:not(:disabled) {
    background-color: #218838;
}

.btn-danger {
    background-color: #dc3545;
    color: white;
}
.btn-danger:hover:not(:disabled) {
    background-color: #c82333;
}

/* Table Container with Horizontal Scroll */
.table-container {
  overflow-x: auto;
  overflow-y: visible;
  width: 100%;
  max-width: 100%; /* Constrain to parent width */
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 24px;
  background: white;
  contain: layout style;
  scrollbar-gutter: stable;
  position: relative;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Fixed Actions Column */
.data-table th.fixed-column,
.data-table td.fixed-column {
  position: sticky;
  right: 0;
  background: #f8f9fa; /* Header background */
  z-index: 2;
  border-left: 2px solid #e2e8f0;
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  width: 200px;
}

.data-table td.fixed-column {
  background: white; /* Body background */
}

/* Enhanced styling for fixed column */
.data-table th.fixed-column {
  background: #f1f5f9; /* Slightly different header background */
}

/* Add hover effect for fixed column */
.data-table tbody tr:hover td.fixed-column {
  background: #f8fafc;
}

/* Prevent content shift when scrollbar appears */
.table-container::-webkit-scrollbar {
  height: 12px;
}

.table-container::-webkit-scrollbar-track {
  background-color: #f1f3f4;
  border-radius: 6px;
}

.table-container::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 6px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

/* Data Table Styles */
.data-table {
    width: auto; /* Let table size naturally */
    border-collapse: collapse;
    border-spacing: 0;
    table-layout: auto; /* Auto layout for natural column sizing */
    position: relative;
    transform: translateZ(0); /* Create new stacking context */
}

.data-table th {
    background: #f8f9fa;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: #718096;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #e2e8f0;
    white-space: nowrap;
}

.data-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 13px;
    vertical-align: middle;
    color: #4a5568;
}
.data-table tbody tr:not([data-no-data]):last-child td { /* Ensure this works, might need more specific selector if no-data row is complex */
    border-bottom: none;
}
.data-table tbody tr td[colspan="8"] { /* Specifically for the no-data row based on template */
    text-align: center;
    color: #718096;
    padding: 20px; /* Overrides the 16px inline style for consistency if needed */
    font-style: italic;
}
.data-table input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
}

/* Status Badges Styles */
/* Status badge styles now in global src/styles/status.css */

/* Icon Styles (Placeholders) */
.icon {
    font-size: 18px;
    cursor: default;
    color: #718096;
}
/* .upload-icon, .comment-icon { } */

/* Enhanced Formula/Calculation Result Section */
.formula-result-section {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 12px;
    margin: 20px 0;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.formula-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid #e2e8f0;
}

.formula-header h4 {
    font-size: 18px;
    color: #1a202c;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.live-tag {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.formula-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.formula-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.formula-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #718096;
    font-weight: 500;
    font-size: 14px;
}

.formula-code, .calculation-code {
    background-color: #2d3748;
    color: #e2e8f0;
    padding: 12px 16px;
    border-radius: 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    border: 1px solid #4a5568;
    overflow-x: auto;
}

.result-item {
    background-color: white;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.result-container {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.result-value {
    font-size: 20px;
    font-weight: 700;
    color: #059669;
    padding: 8px 16px;
    border-radius: 6px;
    background-color: #f0fdf4;
}

.result-status {
    flex: 1;
}

.atomic-values-section {
    background-color: white;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.atomic-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    margin-top: 12px;
}

.atomic-card {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 12px;
    transition: all 0.2s ease;
}

.atomic-card:hover {
    border-color: #409eff;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.atomic-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.atomic-id {
    font-weight: 600;
    color: #409eff;
    font-size: 12px;
}

.atomic-name {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 8px;
    font-weight: 500;
}

.atomic-value-display {
    font-size: 16px;
    font-weight: 600;
    color: #059669;
    background-color: white;
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid #d1fae5;
    text-align: center;
}

/* Row Actions Styling */
.row-actions {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    padding: 4px;
    width: 100%;
    min-height: 40px;
}

.row-actions .el-button {
    padding: 4px 8px;
    font-size: 10px;
    border-radius: 4px;
    flex: 0 1 auto;
    min-width: 0;
    white-space: nowrap;
    margin: 0;
}

.row-actions .el-button + .el-button {
    margin-left: 0;
}

.no-actions-text {
    color: #909399;
    font-size: 11px;
    font-style: italic;
}

/* Enhanced inline editing styles */
.editable-value {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 80px;
}

.editable-value:hover {
    background-color: #f0f9ff;
    border: 1px solid #409eff;
}

.value-display {
    flex: 1;
}

.edit-icon {
    opacity: 0;
    transition: opacity 0.2s ease;
    color: #409eff;
    font-size: 12px;
}

.editable-value:hover .edit-icon {
    opacity: 1;
}

.readonly-value {
    color: #606266;
}

.inline-edit-container {
    display: flex;
    align-items: center;
    gap: 8px;
}

.inline-edit-actions {
    display: flex;
    gap: 4px;
}

/* Dynamic calculation styling - enhanced */
.result-highlight {
    background-color: #fef3c7;
    color: #92400e;
    border: 1px solid #fbbf24;
    animation: highlightPulse 3s ease-in-out;
}

@keyframes highlightPulse {
    0%, 100% { 
        background-color: #fef3c7; 
        transform: scale(1);
    }
    50% { 
        background-color: #fbbf24; 
        transform: scale(1.02);
    }
}

/* Evidence Cell Styling */
.evidence-cell {
  padding: 8px 12px;
}

.evidence-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  min-height: 32px;
}

.evidence-info {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.evidence-upload-btn {
  padding: 2px 6px;
  font-size: 11px;
  height: 22px;
  margin: 0;
}

.evidence-upload-btn:hover {
  color: #409eff;
  background-color: #ecf5ff;
}

</style>