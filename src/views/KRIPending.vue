<template>
  <div class="kri-workflow-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <el-button icon="el-icon-arrow-left" @click="goBack" class="back-button">Back to Dashboard</el-button>
        <div class="header-info">
          <h1>{{ pageTitle }}</h1>
          <p>{{ workflowItems.length }} {{ workflowDescription }}</p>
        </div>
      </div>
    </div>

    <div class="page-content">
      <!-- Filters Card -->
      <el-card class="filter-card">
        <k-r-i-filters
          :filters="filters"
          :show-advanced="showAdvancedFilters"
          :available-departments="availableDepartments"
          @filter-change="handleFilterChange"
          @reset-filters="handleResetFilters"
          @toggle-advanced="handleToggleAdvancedFilters"
        />
        <!-- Filter Warning - moved outside quick-actions for better positioning -->
        <el-alert
          v-if="hasActiveFilters"
          title="Filters Active"
          description="Some KRIs may be hidden due to active filters. Reset filters to see all pending items."
          type="warning"
          size="small"
          :closable="false"
          show-icon
          class="filter-warning-separate">
        </el-alert>
      </el-card>

      <!-- Quick Actions Card -->
      <el-card class="actions-card">
        <div class="quick-actions">
          <div class="action-group">
            <span class="action-label">Quick Actions:</span>
            <el-button size="small" icon="el-icon-refresh" @click="refreshData">Refresh</el-button>
            <el-button size="small" icon="el-icon-download">Export List</el-button>
          </div>
          <div class="status-info">
            <div class="status-tags">
              <el-tag 
                v-for="status in statusTags" 
                :key="status.key"
                :type="status.type" 
                size="small" 
                class="status-tag"
              >
                {{ status.label }}
              </el-tag>
            </div>
          </div>
        </div>
        <div style="display: none;"><!-- placeholder for structure -->
        </div>
      </el-card>

      <!-- KRI Table -->
      <el-card class="table-card">
        <div slot="header" class="table-header">
          <span>{{ tableTitle }}</span>
          <el-tooltip :content="tableTooltip" placement="top">
            <i class="el-icon-info table-info-icon"></i>
          </el-tooltip>
        </div>
        <div v-if="error" class="error-message">
          <el-alert
            title="Error loading data"
            :description="error"
            type="error"
            show-icon>
          </el-alert>
        </div>
        <k-r-i-table-collect-data
          :data="workflowItems"
          :loading="loading"
          @row-click="handleKRIClick"
          @data-updated="refreshData"
          @selection-change="handleSelectionChange"
        />
        <div v-if="!loading && workflowItems.length === 0 && !error" class="no-data-message">
          <el-empty :description="emptyMessage">
            <el-button type="primary" @click="goBack">Go to Dashboard</el-button>
          </el-empty>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.kri-workflow-page {
  min-height: 100vh;
  background-color: #f1f5f9;
}

.page-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 1rem 1.5rem;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-info h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.header-info p {
  color: #64748b;
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
}

.back-button {
  font-size: 0.875rem;
}

.page-content {
  max-width: 1400px;
  margin: 1.5rem auto;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.actions-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.quick-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.action-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.status-info {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
}

.status-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.filter-warning-separate {
  margin: 0.75rem 0;
}

.status-tag {
  margin-right: 0.5rem;
}

.table-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.table-card >>> .el-card__body {
  padding: 0;
}

.table-header {
  font-weight: 600;
  color: #374151;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message, .no-data-message {
  padding: 1rem;
  text-align: center;
}

.table-info-icon {
  color: #9ca3af;
  margin-left: 0.5rem;
}
</style>