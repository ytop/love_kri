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
            <el-tag :type="getStatusTagType(kriDetail.kri_status)" class="status-tag">
              {{ mapStatus(kriDetail.kri_status) }}
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
            <k-r-i-general-info :kri-data="kriDetail" />
          </el-card>
          
          <!-- KRI Overview -->
          <el-card class="info-card">
            <div slot="header" class="card-header">
              <span>KRI Overview</span>
            </div>
            <k-r-i-overview :kri-data="kriDetail" />
          </el-card>
          
          <!-- Data Elements -->
          <el-card class="info-card" v-if="atomicData && atomicData.length > 0">
            <!-- <div slot="header" class="card-header">
              <span>Data Elements</span> -->
            <!-- </div> -->
            <k-r-i-data-elements 
              :atomic-data="atomicData"
              :kri-detail="kriDetail"
              :evidence-data="evidenceData"
            />
          </el-card>
          
          <!-- Simple Actions Card (if no data elements) -->
          <el-card class="info-card simple-actions-card" v-else>
            <div slot="header" class="card-header">
              <span>Quick Actions</span>
            </div>
            <div class="simple-actions-content">
              <el-button
                icon="el-icon-folder-opened"
                @click="handleEvidenceClick"
                title="View Evidence"
                type="primary" plain>
                Evidence
              </el-button>
              <el-button
                icon="el-icon-chat-dot-round"
                @click="handleCommentClick"
                title="View Comments"
                type="primary" plain>
                Comments
              </el-button>
            </div>
          </el-card>

          <!-- Evidence and Audit -->
          <!-- <el-card class="info-card"> -->
            <!-- <div slot="header" class="card-header">
              <span>Evidence & Audit Trail</span> # kind of redundant
            </div> -->
            <k-r-i-evidence-audit 
              :evidence-data="evidenceData"
              :audit-data="auditTrailData"
            />
          <!-- </el-card> -->
        </div>
        
        <!-- Sidebar -->
        <div class="sidebar">
          <k-r-i-sidebar 
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
import { mapStatus, formatDateFromInt, getStatusTagType } from '../utils/helpers';
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
    
    mapStatus,
    getStatusTagType,
    
    formatReportingDate(dateInt) {
      return formatDateFromInt(dateInt);
    },
    handleEvidenceClick() {
      console.log('Evidence button on simple card clicked. KRI ID:', this.id, 'Reporting Date:', this.date);
      // Placeholder: Future implementation might navigate to the evidence tab or open a modal.
    },
    handleCommentClick() {
      console.log('Comment button on simple card clicked. KRI ID:', this.id, 'Reporting Date:', this.date);
      // Placeholder: Future implementation might open a comment modal or section.
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

.simple-actions-card .el-card__header { /* Target header of the simple actions card if more specific styling is needed */
  /* For example, if the header padding needs adjustment: */
  /* padding: 10px 20px; */
  /* Or if the title needs a different style: */
  /* font-size: 1rem; */
}

.simple-actions-card .simple-actions-content {
  display: flex;
  flex-direction: row; /* Align buttons in a row */
  gap: 1rem; /* Space between buttons */
  align-items: center; /* Align items vertically */
  justify-content: flex-start; /* Align buttons to the start of the container */
  padding: 10px 0; /* Add some padding within the content area of the card */
}

.simple-actions-card .el-button {
  /* Ensure buttons have a consistent look if not already covered by global El-UI styles */
  /* For example, if you want to enforce a certain margin or size: */
  /* margin-right: 10px; */ /* gap property on parent is better */
}

/* If the card itself needs specific margin when it appears: */
.simple-actions-card {
    margin-bottom: 1.5rem; /* Same as other info-cards in the layout */
}
</style>