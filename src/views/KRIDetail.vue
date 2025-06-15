<template>
  <div class="kri-detail">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
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
            <kri-general-info :kri-data="kriDetail" />
          </el-card>
          
          <!-- KRI Overview -->
          <el-card class="info-card">
            <div slot="header" class="card-header">
              <span>KRI Overview</span>
            </div>
            <kri-overview :kri-data="kriDetail" />
          </el-card>
          
          <!-- Data Elements -->
          <el-card class="info-card">
            <div slot="header" class="card-header">
              <span>Data Elements</span>
            </div>
            <kri-data-elements :atomic-data="atomicData" />
          </el-card>
          
          <!-- Evidence and Audit -->
          <el-card class="info-card">
            <div slot="header" class="card-header">
              <span>Evidence & Audit Trail</span>
            </div>
            <kri-evidence-audit 
              :evidence-data="evidenceData"
              :audit-data="auditTrailData"
            />
          </el-card>
        </div>
        
        <!-- Sidebar -->
        <div class="sidebar">
          <kri-sidebar 
            :kri-data="kriDetail"
            :atomic-data="atomicData"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { mapKriStatus, formatDateFromInt } from '../utils/helpers';
import KRIGeneralInfo from '../components/detail/KRIGeneralInfo.vue';
import KRIOverview from '../components/detail/KRIOverview.vue';
import KRIDataElements from '../components/detail/KRIDataElements.vue';
import KRIEvidenceAudit from '../components/detail/KRIEvidenceAudit.vue';
import KRISidebar from '../components/detail/KRISidebar.vue';

export default {
  name: 'KRIDetail',
  components: {
    KRIGeneralInfo,
    KRIOverview,
    KRIDataElements,
    KRIEvidenceAudit,
    KRISidebar
  },
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

.sidebar {
  position: sticky;
  top: 1.5rem;
  height: fit-content;
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