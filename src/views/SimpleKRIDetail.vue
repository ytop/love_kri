<template>
  <div class="kri-detail">
    <div v-if="loading" class="loading-container">
      <el-card>
        <el-skeleton :rows="8" animated />
      </el-card>
    </div>
    
    <div v-else-if="error || !kriDetail" class="error-container">
      <el-card>
        <div class="error-content">
          <i class="el-icon-warning" style="font-size: 48px; color: #f56c6c;"></i>
          <h2>Error loading KRI Details</h2>
          <p>There was a problem fetching data, or the KRI does not exist.</p>
          <p v-if="error" class="error-message">{{ error }}</p>
          <el-button @click="goBack" type="primary">Back to Dashboard</el-button>
        </div>
      </el-card>
    </div>
    
    <div v-else class="detail-layout">
      <!-- Header -->
      <div class="detail-header">
        <div class="header-content">
          <div class="header-left">
            <el-button @click="goBack" icon="el-icon-arrow-left" circle></el-button>
            <div class="header-info">
              <h1>{{ kriDetail.kri_name || 'KRI Detail' }}</h1>
              <p>KRI ID: {{ kriDetail.kri_id }} | {{ formatReportingDate(kriDetail.reporting_date) }}</p>
            </div>
          </div>
          <div class="header-actions">
            <el-tag :type="getStatusTagType(mapKriStatus(kriDetail.kri_status))">
              {{ mapKriStatus(kriDetail.kri_status) }}
            </el-tag>
          </div>
        </div>
      </div>
      
      <!-- Content -->
      <div class="detail-content">
        <div class="main-content">
          <!-- General Information -->
          <el-card class="info-card">
            <div slot="header" class="card-header">
              <span>General Information</span>
            </div>
            <el-row :gutter="24">
              <el-col :span="12">
                <div class="info-item">
                  <label>KRI Name</label>
                  <p>{{ kriDetail.kri_name || 'N/A' }}</p>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="info-item">
                  <label>KRI Owner</label>
                  <p>{{ kriDetail.kri_owner || 'N/A' }}</p>
                </div>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <div class="info-item">
                  <label>L1 Risk Type</label>
                  <p>{{ kriDetail.l1_risk_type || 'N/A' }}</p>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="info-item">
                  <label>L2 Risk Type</label>
                  <p>{{ kriDetail.l2_risk_type || 'N/A' }}</p>
                </div>
              </el-col>
            </el-row>
            <div class="info-item">
              <label>Description</label>
              <p>{{ kriDetail.kri_description || 'No description available' }}</p>
            </div>
          </el-card>
          
          <!-- KRI Overview -->
          <el-card class="info-card">
            <div slot="header" class="card-header">
              <span>KRI Overview</span>
            </div>
            <el-row :gutter="24">
              <el-col :span="8">
                <div class="metric-card">
                  <div class="metric-label">Current Value</div>
                  <div class="metric-value">{{ kriDetail.kri_value || 'N/A' }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="metric-card warning">
                  <div class="metric-label">Warning Line</div>
                  <div class="metric-value">{{ kriDetail.warning_line_value || 'N/A' }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="metric-card danger">
                  <div class="metric-label">Limit Value</div>
                  <div class="metric-value">{{ kriDetail.limit_value || 'N/A' }}</div>
                </div>
              </el-col>
            </el-row>
          </el-card>
          
          <!-- Data Elements -->
          <el-card class="info-card">
            <div slot="header" class="card-header">
              <span>Data Elements</span>
            </div>
            <el-table :data="atomicData" style="width: 100%">
              <el-table-column prop="atomic_id" label="Atomic ID" width="120" />
              <el-table-column prop="atomic_value" label="Value" width="150">
                <template slot-scope="scope">
                  <span>{{ scope.row.atomic_value || 'N/A' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="atomic_metadata" label="Metadata" min-width="200">
                <template slot-scope="scope">
                  <span>{{ scope.row.atomic_metadata || 'No metadata' }}</span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
        
        <!-- Quick Info Sidebar -->
        <div class="sidebar">
          <el-card class="sidebar-card">
            <div slot="header" class="card-header">
              <span>Quick Actions</span>
            </div>
            <div class="actions">
              <el-button type="primary" style="width: 100%; margin-bottom: 0.5rem;">
                <i class="el-icon-edit"></i>
                Edit KRI
              </el-button>
              <el-button style="width: 100%;" @click="goBack">
                <i class="el-icon-back"></i>
                Back to Dashboard
              </el-button>
            </div>
          </el-card>
          
          <el-card class="sidebar-card">
            <div slot="header" class="card-header">
              <span>KRI Summary</span>
            </div>
            <div class="summary">
              <div class="summary-item">
                <label>KRI ID</label>
                <span>{{ kriDetail.kri_id }}</span>
              </div>
              <div class="summary-item">
                <label>Owner</label>
                <span>{{ kriDetail.kri_owner || 'N/A' }}</span>
              </div>
              <div class="summary-item">
                <label>Current Value</label>
                <span class="value">{{ kriDetail.kri_value || 'N/A' }}</span>
              </div>
              <div class="summary-item">
                <label>Reporting Date</label>
                <span>{{ formatReportingDate(kriDetail.reporting_date) }}</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'SimpleKRIDetail',
  props: {
    id: {
      type: String,
      required: true
    },
    date: {
      type: String,
      required: true
    }
  },
  computed: {
    ...mapState('kri', [
      'kriDetail',
      'atomicData',
      'evidenceData',
      'auditTrailData',
      'loading',
      'error'
    ])
  },
  async created() {
    await this.fetchKRIDetail({
      kriId: this.id,
      reportingDate: this.date
    });
  },
  methods: {
    ...mapActions('kri', ['fetchKRIDetail']),
    
    goBack() {
      this.$router.push('/');
    },
    
    mapKriStatus(status) {
      if (status === null || status === undefined) return 'Pending';
      switch (status) {
        case 0: return 'Pending';
        case 1: return 'Submitted';
        case 2: return 'Finalized';
        default: return `Unknown (${status})`;
      }
    },
    
    formatReportingDate(dateInt) {
      if (!dateInt) return '';
      const dateString = dateInt.toString();
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      return `${year}-${month}-${day}`;
    },
    
    getStatusTagType(status) {
      switch (status) {
        case 'Pending': return 'warning';
        case 'Submitted': return 'info';
        case 'Finalized': return 'success';
        default: return '';
      }
    }
  }
};
</script>

<style scoped>
.kri-detail {
  min-height: 100vh;
  background-color: #f1f5f9;
}

.loading-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.error-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
}

.error-content {
  text-align: center;
  padding: 2rem;
}

.error-content h2 {
  color: #374151;
  margin: 1rem 0;
}

.error-content p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
}

.detail-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-info h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.header-info p {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

.detail-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.5rem;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  font-weight: 600;
  color: #374151;
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

.metric-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
}

.metric-card.warning {
  border-color: #f59e0b;
  background: #fffbeb;
}

.metric-card.danger {
  border-color: #ef4444;
  background: #fef2f2;
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

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1.5rem;
  height: fit-content;
}

.sidebar-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
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

@media (max-width: 1024px) {
  .detail-content {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    position: static;
  }
}
</style>