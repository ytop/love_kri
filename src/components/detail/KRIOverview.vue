<template>
  <div class="kri-overview">
    <el-row :gutter="24">
      <el-col :span="8">
        <div class="metric-card">
          <div class="metric-label">Current Value</div>
          <div class="metric-value">{{ kriData.kri_value || 'N/A' }}</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="metric-card">
          <div class="metric-label">Warning Line</div>
          <div class="metric-value warning">{{ kriData.warning_line_value || 'N/A' }}</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="metric-card">
          <div class="metric-label">Limit Value</div>
          <div class="metric-value danger">{{ kriData.limit_value || 'N/A' }}</div>
        </div>
      </el-col>
    </el-row>
    
    <!-- Calculated KRI Special Section -->
    <div v-if="isCalculatedKRI && kriData.kri_formula" class="calculated-kri-section">
      <el-card class="formula-card">
        <div slot="header" class="card-header">
          <span>
            <i class="el-icon-s-operation"></i>
            Calculated KRI
          </span>
          <el-tag type="primary" size="small">Auto-calculated</el-tag>
        </div>
        
        <div class="formula-info">
          <div class="formula-display">
            <div class="formula-label">
              <i class="el-icon-edit-outline"></i>
              <strong>Formula:</strong>
            </div>
            <code class="formula-code">{{ kriData.kri_formula }}</code>
          </div>
          
          <div class="calculation-status">
            <div class="status-item">
              <span class="status-label">Atomic Data Status:</span>
              <div class="atomic-progress">
                <el-progress 
                  :percentage="atomicDataProgress.percentage" 
                  :color="atomicDataProgress.color"
                  :show-text="false"
                  style="width: 120px;">
                </el-progress>
                <span class="progress-text">{{ atomicDataProgress.text }}</span>
              </div>
            </div>
            
            <div class="status-item">
              <span class="status-label">Last Calculation:</span>
              <span class="calculation-time">
                {{ lastCalculationTime || 'Never calculated' }}
              </span>
            </div>
          </div>
          
          <div v-if="hasCalculationMismatch" class="calculation-alert">
            <el-alert
              title="Calculation Mismatch Detected"
              type="warning"
              :description="`Current stored value (${kriData.kri_value}) differs from calculated value. Click 'Recalculate' to update.`"
              show-icon
              :closable="false">
            </el-alert>
          </div>
        </div>
        
        <div class="calculated-actions">
          <el-button
            type="primary"
            icon="el-icon-refresh"
            @click="handleRecalculate"
            :loading="calculatingKRI"
            :disabled="!canRecalculate">
            Recalculate KRI
          </el-button>
          <el-button
            v-if="canSubmitAtomic"
            type="success"
            icon="el-icon-upload"
            @click="handleSubmitAtomic"
            :loading="submittingAtomic">
            Submit Atomic Data
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- Regular Data Input Section (for non-calculated KRIs) -->
    <div v-else-if="canEditKRI" class="data-input-section">
      <el-card class="input-card">
        <div slot="header" class="card-header">
          <span>
            <i class="el-icon-edit"></i>
            Manual Data Input
          </span>
          <el-tag :type="getStatusTagType(kriData.kri_status)" size="small">
            {{ mapStatus(kriData.kri_status) }}
          </el-tag>
        </div>
        <div class="input-content">
          <el-form :model="inputForm" label-width="120px" size="medium">
            <el-form-item label="KRI Value">
              <el-input-number
                v-model="inputForm.kriValue"
                placeholder="Enter KRI value"
                :precision="2"
                style="width: 100%"
                :disabled="inputLoading">
              </el-input-number>
            </el-form-item>
            <el-form-item label="Comment (Optional)">
              <el-input
                v-model="inputForm.comment"
                type="textarea"
                placeholder="Add a comment about this value..."
                :rows="3"
                :disabled="inputLoading">
              </el-input>
            </el-form-item>
            <el-form-item>
              <div class="action-buttons">
                <el-button
                  type="primary"
                  icon="el-icon-check"
                  @click="handleSave"
                  :loading="inputLoading"
                  :disabled="!isValidInput">
                  Save
                </el-button>
                <el-button
                  v-if="kriData.kri_status === 30"
                  type="success"
                  icon="el-icon-upload"
                  @click="handleSubmit"
                  :loading="inputLoading">
                  Submit
                </el-button>
                <el-button
                  v-if="[10, 20].includes(kriData.kri_status)"
                  type="success"
                  icon="el-icon-upload"
                  @click="handleSaveAndSubmit"
                  :loading="inputLoading"
                  :disabled="!isValidInput">
                  Save and Submit
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
    </div>
    
    <el-row :gutter="24" style="margin-top: 1.5rem;">
      <el-col :span="12">
        <div class="info-item">
          <label>RAS Metric</label>
          <p>{{ kriData.ras_metric || 'N/A' }}</p>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="info-item">
          <label>Breach Status</label>
          <el-tooltip :content="getBreachDescription(dynamicBreachStatus)" placement="top">
            <el-tag :type="getBreachTagType(dynamicBreachStatus)" size="small" class="status-tag">
              {{ getBreachDisplayText(dynamicBreachStatus) }}
            </el-tag>
          </el-tooltip>
          <span v-if="dynamicBreachStatus !== (kriData.breach_type || 'No Breach')" class="breach-preview">
            (Preview)
          </span>
        </div>
      </el-col>
    </el-row>

    <!-- Latest Evidence Section -->
    <el-row v-if="latestEvidence" :gutter="24" style="margin-top: 1rem;">
      <el-col :span="24">
        <div class="evidence-section">
          <div class="evidence-header">
            <label>
              <i class="el-icon-paperclip"></i>
              Latest Evidence
            </label>
            <el-tag type="info" size="mini">{{ totalEvidenceCount }} files total</el-tag>
          </div>
          <div class="evidence-item">
            <div class="evidence-info">
              <span class="file-name">{{ latestEvidence.file_name }}</span>
              <span class="file-meta">
                Uploaded by {{ latestEvidence.uploaded_by || 'Unknown' }} 
                on {{ formatDate(latestEvidence.uploaded_at) }}
              </span>
              <p v-if="latestEvidence.description" class="file-description">
                {{ latestEvidence.description }}
              </p>
            </div>
            <el-button
              type="text"
              size="small"
              icon="el-icon-download"
              @click="downloadEvidence(latestEvidence)"
            >
              Download
            </el-button>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
</script>

<style scoped>
.kri-overview {
  padding: 0.5rem 0;
}

.metric-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
}

.metric-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.metric-value.warning {
  color: #f59e0b;
}

.metric-value.danger {
  color: #ef4444;
}

.data-input-section,
.calculated-kri-section {
  margin: 1.5rem 0;
}

.input-card,
.formula-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #374151;
}

.input-content {
  padding: 0.5rem 0;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.action-buttons .el-button + .el-button {
  margin-left: 10px;
}

.breach-preview {
  color: #909399;
  font-size: 0.75rem;
  margin-left: 0.5rem;
  font-style: italic;
}

.info-item {
  margin-bottom: 1rem;
}

.info-item label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  display: block;
  margin-bottom: 0.25rem;
}

.info-item p {
  font-size: 0.875rem;
  color: #374151;
  margin: 0;
}

.status-tag {
  margin-left: 0.5rem;
}

/* Calculated KRI Styles */
.formula-info {
  margin-bottom: 20px;
}

.formula-display {
  margin-bottom: 16px;
}

.formula-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
}

.formula-code {
  background-color: #2d3748;
  color: #e2e8f0;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  border: 1px solid #4a5568;
  display: block;
  overflow-x: auto;
}

.calculation-status {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.atomic-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-text {
  font-size: 12px;
  color: #6c757d;
  white-space: nowrap;
}

.calculation-time {
  color: #6c757d;
  font-size: 13px;
}

.calculation-alert {
  margin-bottom: 16px;
}

.calculated-actions {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

/* Evidence Section Styles */
.evidence-section {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-top: 8px;
}

.evidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.evidence-header label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0;
}

.evidence-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.evidence-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.1);
}

.evidence-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.file-meta {
  font-size: 12px;
  color: #6c757d;
}

.file-description {
  font-size: 12px;
  color: #495057;
  margin: 4px 0 0 0;
  font-style: italic;
}
</style>