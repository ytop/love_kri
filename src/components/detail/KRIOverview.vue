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
    
    <el-row :gutter="24" style="margin-top: 1.5rem;">
      <el-col :span="12">
        <div class="info-item">
          <label>RAS Metric</label>
          <p>{{ kriData.ras_metric || 'N/A' }}</p>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="info-item">
          <label>Breach Type</label>
          <el-tag :type="getBreachTagType(kriData.breach_type || 'No Breach')" size="small">
            {{ kriData.breach_type || 'No Breach' }}
          </el-tag>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: 'KRIOverview',
  props: {
    kriData: {
      type: Object,
      required: true
    }
  },
  methods: {
    getBreachTagType(breachType) {
      switch (breachType) {
      case 'No Breach':
        return 'success';
      case 'Warning':
        return 'warning';
      case 'Limit':
        return 'danger';
      default:
        return '';
      }
    }
  }
};
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

.info-item {
  margin-bottom: 1rem;
}

.info-item label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.info-item p {
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}
</style>