<template>
  <div class="general-info">
    <el-row :gutter="24">
      <el-col :span="12">
        <div class="info-item">
          <label>KRI Name</label>
          <p>{{ kriData.kri_name || 'N/A' }}</p>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="info-item">
          <label>KRI Owner</label>
          <p>{{ kriData.kri_owner || 'N/A' }}</p>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="24">
      <el-col :span="12">
        <div class="info-item">
          <label>L1 Risk Type</label>
          <p>{{ kriData.l1_risk_type || 'N/A' }}</p>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="info-item">
          <label>L2 Risk Type</label>
          <p>{{ kriData.l2_risk_type || 'N/A' }}</p>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="24">
      <el-col :span="12">
        <div class="info-item">
          <label>Reporting Frequency</label>
          <p>{{ kriData.reporting_frequency || 'N/A' }}</p>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="info-item">
          <label>Data Provider</label>
          <p>{{ kriData.data_provider || 'N/A' }}</p>
        </div>
      </el-col>
    </el-row>
    
    <div class="info-item full-width">
      <label>KRI Description</label>
      <p>{{ kriData.kri_description || 'No description available' }}</p>
    </div>
    
    <div class="info-item full-width">
      <label>KRI Formula</label>
      <p class="formula">{{ kriData.kri_formula || 'No formula available' }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KRIGeneralInfo',
  props: {
    kriData: {
      type: Object,
      required: true
    }
  }
};
</script>

<style scoped>
.general-info {
  padding: 0.5rem 0;
}

.info-item {
  margin-bottom: 1.5rem;
}

.info-item.full-width {
  width: 100%;
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

.formula {
  background-color: #f9fafb;
  padding: 0.75rem;
  border-radius: 0.375rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  border: 1px solid #e5e7eb;
}
</style>