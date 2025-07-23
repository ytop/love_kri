<template>
  <div class="kri-sidebar">
    <!-- Quick Actions -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Quick Actions</span>
      </div>
      <div class="actions">
        <div v-if="isCalculatedKRI" class="calculated-kri-actions">
          <el-alert
            title="Calculated KRI"
            description="This KRI value is automatically calculated from atomic data elements."
            type="info"
            :closable="false"
            show-icon>
          </el-alert>
          
          <!-- Unified Quick Actions for Calculated KRI -->
          <div v-if="calculatedKRIActions.length > 0" class="unified-actions">
            <div class="actions-title">Available Actions</div>
            <div class="actions-buttons">
              <el-button
                v-for="action in calculatedKRIActions"
                :key="action.key"
                :type="action.type"
                :icon="action.icon"
                @click="action.handler"
                :loading="action.loading"
                :disabled="action.disabled"
                :title="action.title"
                size="small"
                style="width: 100%; margin-bottom: 8px;">
                {{ action.label }}
              </el-button>
            </div>
          </div>
          
          <!-- Calculated KRI Summary -->
          <div class="atomic-summary">
            <div class="summary-item">
              <label>Total Elements:</label>
              <span>{{ atomicData.length }}</span>
            </div>
            <div class="summary-item">
              <label>Approved:</label>
              <span class="approved-count">{{ approvedAtomicCount }}</span>
            </div>
            <div class="summary-item">
              <label>Pending:</label>
              <span class="pending-count">{{ pendingAtomicCount }}</span>
            </div>
            <div class="summary-item">
              <label>Completeness:</label>
              <span>{{ completenessPercentage }}%</span>
            </div>
          </div>
        </div>
        <template v-else>
          <!-- Data Input Actions for Pending Input/Under Rework status -->
          <template v-if="showDataInputActions">
            <div class="data-input-actions">
              <el-form :model="inputForm" size="small">
                <el-form-item label="KRI Value">
                  <el-input-number
                    v-model="inputForm.kriValue"
                    placeholder="Enter value"
                    :precision="2"
                    style="width: 100%"
                    :disabled="actionLoading">
                  </el-input-number>
                </el-form-item>
                <div class="action-buttons">
                  <el-button
                    type="primary"
                    icon="el-icon-check"
                    @click="handleSave"
                    :loading="actionLoading"
                    :disabled="!isValidInput"
                    size="small"
                    style="width: 100%;">
                    Save
                  </el-button>
                  <el-button
                    v-if="kriData.kri_status === 30"
                    type="success"
                    icon="el-icon-upload"
                    @click="handleSubmit"
                    :loading="actionLoading"
                    size="small"
                    style="width: 100%;">
                    Submit
                  </el-button>
                </div>
              </el-form>
            </div>
          </template>
          
          <!-- Review Actions for Data Provider Approver -->
          <template v-if="showReviewActions">
            <el-button
              type="primary"
              icon="el-icon-check"
              @click="handleApproveKRI"
              :loading="actionLoading"
              style="width: 100%;">
              Approve
            </el-button>
            <el-button
              type="danger"
              icon="el-icon-close"
              @click="handleRejectKRI"
              :loading="actionLoading"
              style="width: 100%;">
              Reject
            </el-button>
          </template>
          
          <!-- Acknowledge Actions for KRI Owner Approver -->
          <template v-if="showAcknowledgeActions">
            <el-button
              type="primary"
              icon="el-icon-check"
              @click="handleAcknowledgeKRI"
              :loading="actionLoading"
              style="width: 100%;">
              Acknowledge
            </el-button>
            <el-button
              type="danger"
              icon="el-icon-close"
              @click="handleRejectKRI"
              :loading="actionLoading"
              style="width: 100%;">
              Reject
            </el-button>
          </template>
          
          <!-- No Actions Available -->
          <div v-if="!showDataInputActions && !showReviewActions && !showAcknowledgeActions" class="no-actions">
            <el-alert
              title="No Actions Available"
              description="You don't have permission to perform actions on this KRI, or it's in a status that doesn't allow actions."
              type="info"
              :closable="false"
              show-icon>
            </el-alert>
          </div>
        </template>
      </div>
    </el-card>

    <!-- Breach Status -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Breach Status</span>
      </div>
      <div>
        <v-chart class="chart" :option="gaugeOption" style="height: 200px;" autoresize />
      </div>
    </el-card>

    <!-- 12-Month Trend -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>12-Month Trend</span>
      </div>
      <div>
        <v-chart class="chart" :option="lineOption" style="height: 200px;" autoresize />
      </div>
    </el-card>

    <!-- Navigation -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Navigation</span>
      </div>
      <div class="navigation">
        <el-button type="text" style="width: 100%; text-align: left; padding-left: 0;">
          <i class="el-icon-document"></i>
          Related KRIs
        </el-button>
        <el-button type="text" style="width: 100%; text-align: left; padding-left: 0;">
          <i class="el-icon-setting"></i>
          Configuration
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
</script>

<style scoped>
.kri-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  font-weight: 600;
  color: #374151;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem; /* Use a slightly larger gap for clarity, e.g., 0.75rem or 12px */
}

/* Override Element UI's default margin between adjacent buttons */
.el-button + .el-button {
  margin-left: 0;
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-item label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.summary-item span {
  font-size: 0.875rem;
  color: #374151;
}

.summary-item .value {
  font-weight: 600;
  color: #1f2937;
}

.quality-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.quality-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quality-item label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.quality-item .count {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 600;
}

.navigation {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.navigation .el-button {
  justify-content: flex-start;
  color: #6b7280;
}

.navigation .el-button:hover {
  color: #3b82f6;
}

.navigation .el-button i {
  margin-right: 0.5rem;
}

.calculated-kri-notice {
  margin-bottom: 0.75rem;
}

.calculated-kri-notice >>> .el-alert {
  margin: 0;
}

.calculated-kri-notice >>> .el-alert__title {
  font-size: 0.875rem;
  font-weight: 600;
}

.calculated-kri-notice >>> .el-alert__description {
  font-size: 0.75rem;
  line-height: 1.4;
  margin-top: 0.25rem;
}

.data-input-actions {
  padding: 0.5rem 0;
}

.data-input-actions .el-form-item {
  margin-bottom: 1rem;
}

.data-input-actions .el-form-item:last-child {
  margin-bottom: 0;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.no-actions {
  margin-bottom: 0.75rem;
}

.no-actions >>> .el-alert {
  margin: 0;
}

.no-actions >>> .el-alert__title {
  font-size: 0.875rem;
  font-weight: 600;
}

.no-actions >>> .el-alert__description {
  font-size: 0.75rem;
  line-height: 1.4;
  margin-top: 0.25rem;
}

/* Calculated KRI Styles */
.calculated-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.unified-actions {
  margin: 16px 0;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.actions-title {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 12px;
}

.actions-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.actions-buttons .el-button {
  margin: 0;
}

.atomic-summary {
  margin-top: 16px;
}
</style>