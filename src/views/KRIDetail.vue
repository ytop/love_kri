<template>
  <div class="kri-detail">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>
    
    <div v-else-if="error || !kriDetail" class="error-container">
      <NotFound />
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
            <k-r-i-overview 
              :kri-data="kriDetail" 
              :atomic-data="atomicData"
              :evidence-data="evidenceData"
              @data-updated="refreshKRIData" />
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
              @data-updated="refreshKRIData"
              @evidence-uploaded="refreshKRIData"
            />
          </el-card>
          
          <!-- Simple Actions Card (if no data elements) -->
          <el-card class="info-card simple-actions-card" v-else>
            <div slot="header" class="card-header">
              <span>Quick Actions</span>
            </div>
            <div class="simple-actions-content">
              <!-- Unified action system -->
              <el-button
                v-for="action in availableActions"
                :key="action.key"
                :icon="action.icon"
                @click="handleActionClick(action)"
                :loading="action.loading"
                :type="action.type"
                :title="action.title"
                :disabled="action.disabled">
                {{ action.label }}
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
              :kri-id="String(kriDetail.kri_id)"
              :reporting-date="kriDetail.reporting_date"
              :current-status="kriDetail.kri_status"
              :kri-item="kriDetail"
              @evidence-uploaded="refreshKRIData"
            />
          <!-- </el-card> -->
        </div>
        
        <!-- Sidebar -->
        <div class="sidebar">
          <k-r-i-sidebar 
            :kri-data="kriDetail"
            :atomic-data="atomicData"
            @data-updated="forceRefreshKRIData"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import NotFound from './NotFound.vue';
import KRIGeneralInfo from '@/components/detail/KRIGeneralInfo.vue';
import KRIOverview from '@/components/detail/KRIOverview.vue';
import KRIDataElements from '@/components/detail/KRIDataElements.vue';
import KRIEvidenceAudit from '@/components/detail/KRIEvidenceAudit.vue';
import KRISidebar from '@/components/detail/KRISidebar.vue';
import { formatReportingDate, createGoBackHandler } from '@/utils/helpers';
import { mapStatus, getStatusTagType } from '@/utils/types';

export default {
  name: 'KRIDetail',
  components: {
    NotFound,
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
    // Reuse existing Vuex state
    ...mapState('kri', ['kriDetail', 'atomicData', 'evidenceData', 'auditTrailData', 'loading', 'error']),
    ...mapGetters('kri', ['availableKRIDetailActions']),
    
    // Available actions for template (reuses store getter)
    availableActions() {
      return this.availableKRIDetailActions;
    }
  },
  watch: {
    // Watch route parameters to refresh data when navigating between KRIs
    '$route.params': {
      handler() {
        this.fetchData();
      },
      immediate: true
    }
  },
  methods: {
    // Reuse existing store actions
    ...mapActions('kri', ['fetchKRIDetail', 'refreshKRIDetail', 'forceRefreshKRIDetail', 'updateKRIStatus']),
    
    // Reuse utility functions
    formatReportingDate,
    mapStatus,
    getStatusTagType,
    
    // Navigation method
    goBack() {
      const handler = createGoBackHandler(this.$router);
      handler();
    },
    
    // Data fetching using existing store action
    async fetchData() {
      try {
        await this.fetchKRIDetail({
          kriId: parseInt(this.id, 10),
          reportingDate: parseInt(this.date, 10)
        });
      } catch (error) {
        console.error('Error fetching KRI detail:', error);
      }
    },
    
    // Refresh methods that delegate to store actions
    async refreshKRIData() {
      await this.refreshKRIDetail();
    },
    
    async forceRefreshKRIData() {
      await this.forceRefreshKRIDetail();
    },
    
    // Action handlers using existing store action
    async handleSave() {
      try {
        await this.updateKRIStatus({
          kriId: parseInt(this.id, 10),
          reportingDate: parseInt(this.date, 10),
          updateData: { /* will be populated by child components */ },
          action: 'save',
          comment: 'Data saved'
        });
      } catch (error) {
        this.$message.error('Failed to save KRI data');
      }
    },
    
    async handleSubmit() {
      try {
        // Determine next status based on KRI owner/data provider relationship
        const nextStatus = this.kriDetail.kri_owner === this.kriDetail.data_provider ? 50 : 40;
        await this.updateKRIStatus({
          kriId: parseInt(this.id, 10),
          reportingDate: parseInt(this.date, 10),
          updateData: { kri_status: nextStatus },
          action: 'submit',
          comment: 'Data submitted for approval'
        });
        this.$message.success('KRI submitted successfully');
      } catch (error) {
        this.$message.error('Failed to submit KRI');
      }
    },
    
    async handleApprove() {
      try {
        const currentStatus = this.kriDetail.kri_status;
        const nextStatus = currentStatus === 40 ? 50 : 60;
        await this.updateKRIStatus({
          kriId: parseInt(this.id, 10),
          reportingDate: parseInt(this.date, 10),
          updateData: { kri_status: nextStatus },
          action: 'approve',
          comment: 'Approved by user'
        });
        this.$message.success('KRI approved successfully');
      } catch (error) {
        this.$message.error('Failed to approve KRI');
      }
    },
    
    async handleReject() {
      try {
        await this.updateKRIStatus({
          kriId: parseInt(this.id, 10),
          reportingDate: parseInt(this.date, 10),
          updateData: { kri_status: 20 }, // UNDER_REWORK
          action: 'reject',
          comment: 'Rejected - requires rework'
        });
        this.$message.success('KRI rejected and sent back for rework');
      } catch (error) {
        this.$message.error('Failed to reject KRI');
      }
    },
    
    // Route action clicks to appropriate handlers
    handleActionClick(action) {
      const handler = this[action.handler];
      if (typeof handler === 'function') {
        handler.call(this);
      } else {
        console.warn(`Action handler ${action.handler} not found`);
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

.detail-layout {
  display: flex;
  flex-direction: column;
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
  min-width: 0; /* Allow content to shrink */
  overflow: hidden; /* Prevent content from overflowing */
}

.info-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  min-width: 0; /* Allow card to shrink */
  overflow: hidden; /* Prevent card content overflow */
}

/* Ensure card body doesn't overflow */
.info-card >>> .el-card__body {
  min-width: 0;
  overflow: hidden;
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
    padding: 1rem;
  }
  
  .sidebar {
    position: static;
  }
  
  .header-content {
    padding: 1rem;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .header-info h1 {
    font-size: 1.25rem;
  }
}

@media (max-width: 768px) {
  .detail-content {
    padding: 0.75rem;
    gap: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .simple-actions-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .simple-actions-content .el-button {
    width: 100%;
  }
}


.simple-actions-card .simple-actions-content {
  display: flex;
  flex-direction: row; /* Align buttons in a row */
  gap: 1rem; /* Space between buttons */
  align-items: center; /* Align items vertically */
  justify-content: flex-start; /* Align buttons to the start of the container */
  padding: 10px 0; /* Add some padding within the content area of the card */
}

/* If the card itself needs specific margin when it appears: */
.simple-actions-card {
    margin-bottom: 1.5rem; /* Same as other info-cards in the layout */
}
</style>