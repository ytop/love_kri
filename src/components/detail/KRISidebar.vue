<template>
  <div class="kri-sidebar">
    <!-- Quick Actions -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Quick Actions</span>
      </div>
      <div class="actions">
        <el-button type="primary" style="width: 100%; margin-bottom: 0.5rem;">
          <i class="el-icon-edit"></i>
          Edit KRI
        </el-button>
        <el-button style="width: 100%; margin-bottom: 0.5rem;">
          <i class="el-icon-download"></i>
          Export Data
        </el-button>
        <el-button style="width: 100%;">
          <i class="el-icon-refresh"></i>
          Refresh Data
        </el-button>
      </div>
    </el-card>

    <!-- KRI Summary -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>KRI Summary</span>
      </div>
      <div class="summary">
        <div class="summary-item">
          <label>KRI ID</label>
          <span>{{ kriData.kri_id }}</span>
        </div>
        <div class="summary-item">
          <label>Status</label>
          <el-tag :type="getStatusTagType(mapKriStatus(kriData.kri_status))" size="small">
            {{ mapKriStatus(kriData.kri_status) }}
          </el-tag>
        </div>
        <div class="summary-item">
          <label>Owner</label>
          <span>{{ kriData.kri_owner || 'N/A' }}</span>
        </div>
        <div class="summary-item">
          <label>Current Value</label>
          <span class="value">{{ kriData.kri_value || 'N/A' }}</span>
        </div>
        <div class="summary-item">
          <label>Reporting Date</label>
          <span>{{ formatReportingDate(kriData.reporting_date) }}</span>
        </div>
      </div>
    </el-card>

    <!-- Data Quality -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Data Quality</span>
      </div>
      <div class="quality-metrics">
        <div class="quality-item">
          <label>Atomic Elements</label>
          <span class="count">{{ atomicData.length }}</span>
        </div>
        <div class="quality-item">
          <label>Complete Elements</label>
          <span class="count">{{ completeAtomicCount }}</span>
        </div>
        <div class="quality-item">
          <label>Completeness</label>
          <el-progress 
            :percentage="completenessPercentage"
            :color="getProgressColor(completenessPercentage)"
            :stroke-width="8"
          />
        </div>
      </div>
    </el-card>

    <!-- Navigation -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Navigation</span>
      </div>
      <div class="navigation">
        <el-button type="text" style="width: 100%; text-align: left; padding-left: 0;">
          <i class="el-icon-trend-charts"></i>
          Historical Trend
        </el-button>
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
import { mapKriStatus, formatDateFromInt } from '@/utils/helpers';

export default {
  name: 'KRISidebar',
  props: {
    kriData: {
      type: Object,
      required: true
    },
    atomicData: {
      type: Array,
      required: true
    }
  },
  computed: {
    completeAtomicCount() {
      return this.atomicData.filter(item => 
        item.atomic_value && item.atomic_value !== 'N/A'
      ).length;
    },
    
    completenessPercentage() {
      if (this.atomicData.length === 0) return 0;
      return Math.round((this.completeAtomicCount / this.atomicData.length) * 100);
    }
  },
  methods: {
    mapKriStatus,
    
    formatReportingDate(dateInt) {
      return formatDateFromInt(dateInt);
    },
    
    getStatusTagType(status) {
      switch (status) {
        case 'Pending':
          return 'warning';
        case 'Submitted':
          return 'info';
        case 'Finalized':
          return 'success';
        default:
          return '';
      }
    },
    
    getProgressColor(percentage) {
      if (percentage >= 80) return '#67c23a';
      if (percentage >= 60) return '#e6a23c';
      return '#f56c6c';
    }
  }
};
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
</style>