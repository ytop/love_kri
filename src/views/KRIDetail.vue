<template>
  <div class="kri-detail">
    <div v-if="loading || !kriDetail" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>
    
    <div v-else-if="error" class="error-container">
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
              <p>KRI ID: {{ kriDetail.kri_id || id }} | {{ formatReportingDate(kriDetail.reporting_date || parseInt(date)) }}</p>
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
            <k-r-i-general-info 
              :kri-id="String(id)" 
              :reporting-date="parseInt(date)" 
            />
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
              @data-updated="refreshKRIDetail"
              @evidence-selected="handleEvidenceSelected"
              @evidence-unselected="handleEvidenceUnselected" />
          </el-card>
          
          <!-- Data Elements -->
          <el-card class="info-card" v-if="atomicData && atomicData.length > 0">
            <k-r-i-data-elements 
              :atomic-data="atomicData"
              :kri-detail="kriDetail"
              :evidence-data="evidenceData"
              @data-updated="refreshKRIDetail"
              @evidence-uploaded="refreshKRIDetail"
            />
          </el-card>
          

          <!-- Evidence and Audit -->
            <k-r-i-evidence-audit 
              :evidence-data="evidenceData"
              :audit-data="auditTrailData"
              :kri-id="String(kriDetail.kri_id)"
              :reporting-date="kriDetail.reporting_date"
              :current-status="kriDetail.kri_status"
              :kri-item="kriDetail"
              @evidence-uploaded="refreshKRIDetail"
              @excel-parsed="handleExcelParsed"
              @status-updated="handleStatusUpdated"
              @evidence-selected="handleEvidenceSelected"
              @evidence-unselected="handleEvidenceUnselected"
            />
        </div>
        
        <!-- Sidebar -->
        <div class="sidebar">
          <k-r-i-sidebar 
            :kri-id="String(id)"
            :reporting-date="parseInt(date)"
            :kri-data="kriDetail"
            @data-updated="forceRefreshKRIDetail"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
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
  data() {
    return {
      rejectionPopupShown: false // Flag to prevent showing popup multiple times
    };
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
    ...mapState('kri', ['kriDetail', 'loading', 'error']),
    atomicData() {
      return this.$store.state.kri.atomicData;
    },
    evidenceData() {
      return this.$store.state.kri.evidenceData;
    },
    auditTrailData() {
      return this.$store.state.kri.auditTrailData;
    },
    
    // Find the latest rejection information from audit trail
    latestRejectionInfo() {
      if (!this.auditTrailData || this.auditTrailData.length === 0) {
        return null;
      }
      
      // Look for rejection actions that led to current status
      const rejectionEntries = this.auditTrailData
        .filter(audit => 
          audit.action && 
          audit.action.toLowerCase().includes('reject') &&
          audit.comment // Ensure there's a rejection reason
        )
        .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at)); // Most recent first
      
      if (rejectionEntries.length === 0) {
        return null;
      }
      
      const latestRejection = rejectionEntries[0];
      return {
        reason: latestRejection.comment || 'No reason provided',
        rejectedBy: latestRejection.changed_by || 'Unknown',
        rejectedAt: latestRejection.changed_at,
        action: latestRejection.action
      };
    }
  },
  watch: {
    '$route.params': {
      handler() {
        this.fetchData();
        // Reset popup flag when route changes
        this.rejectionPopupShown = false;
      },
      immediate: true
    },
    
    // Watch for KRI detail changes to show rejection popup
    kriDetail: {
      handler(newKriDetail) {
        if (newKriDetail && 
            newKriDetail.kri_status === 20 && // Status 20: Under Rework
            this.latestRejectionInfo && 
            !this.rejectionPopupShown) {
          // Small delay to ensure UI is rendered
          this.$nextTick(() => {
            this.showRejectionPopup();
          });
        }
      },
      immediate: false
    }
  },
  methods: {
    ...mapActions('kri', ['fetchKRIDetail', 'refreshKRIDetail', 'forceRefreshKRIDetail']),
    
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
    
    // Handle Excel auto-parse results
    handleExcelParsed(parseData) {
      console.log('Excel parsed:', parseData);
      
      // Show notification about successful auto-parse
      this.$message.success(
        `Auto-parsed KRI value: ${parseData.kriValue} from ${parseData.file}`,
        { duration: 5000 }
      );
      
      // Optionally emit to parent or handle auto-fill logic here
      // For now, the value will be applied when status transitions to "Saved"
    },
    
    // Handle status updates from evidence upload
    async handleStatusUpdated(statusData) {
      console.log('Status updated:', statusData);
      
      // Refresh the KRI detail to reflect status changes
      await this.refreshKRIDetail();
      
      // Show success message based on the status change
      if (statusData.autoParseApplied) {
        this.$message.success(
          `KRI status updated and auto-parsed value (${statusData.kriValue}) applied!`,
          { duration: 6000 }
        );
      } else {
        this.$message.success('KRI status updated to "Saved"');
      }
    },
    
    // Handle evidence selection events
    handleEvidenceSelected(evidenceData) {
      console.log('Evidence selected:', evidenceData);
      
      // Refresh data to ensure UI reflects the selection state
      this.refreshKRIDetail();
      
      // Optional: Show feedback to user about selection
      if (evidenceData && evidenceData.filename) {
        this.$message.info(`Evidence selected: ${evidenceData.filename}`);
      }
    },
    
    // Handle evidence unselection events
    handleEvidenceUnselected(evidenceData) {
      console.log('Evidence unselected:', evidenceData);
      
      // Refresh data to ensure UI reflects the unselection state
      this.refreshKRIDetail();
      
      // Optional: Show feedback to user about unselection
      if (evidenceData && evidenceData.filename) {
        this.$message.info(`Evidence unselected: ${evidenceData.filename}`);
      }
    },
    
    // Show rejection popup with reason from audit trail
    showRejectionPopup() {
      if (!this.latestRejectionInfo) {
        return;
      }
      
      const rejectionInfo = this.latestRejectionInfo;
      const formattedDate = this.formatReportingDate(rejectionInfo.rejectedAt);
      
      const messageContent = `
        <div style="text-align: left; line-height: 1.6;">
          <p style="margin-bottom: 16px; font-weight: 600; color: #e53e3e;">
            <i class="el-icon-warning" style="margin-right: 8px;"></i>
            This KRI was rejected and needs to be reworked
          </p>
          
          <div style="background-color: #fef5e7; border-left: 4px solid #f6ad55; padding: 12px; margin-bottom: 16px; border-radius: 4px;">
            <p style="margin: 0; font-weight: 500; color: #975a16;">Rejection Reason:</p>
            <p style="margin: 8px 0 0 0; color: #744210;">${rejectionInfo.reason}</p>
          </div>
          
          <div style="font-size: 13px; color: #666;">
            <p style="margin: 4px 0;">
              <strong>Rejected by:</strong> ${rejectionInfo.rejectedBy}
            </p>
            <p style="margin: 4px 0;">
              <strong>Date:</strong> ${formattedDate}
            </p>
            <p style="margin: 4px 0;">
              <strong>Action:</strong> ${rejectionInfo.action}
            </p>
          </div>
        </div>
      `;
      
      this.$alert(messageContent, 'KRI Rejection Notice', {
        dangerouslyUseHTMLString: true,
        type: 'warning',
        confirmButtonText: 'Understood',
        confirmButtonClass: 'el-button--warning',
        showClose: true,
        customClass: 'rejection-popup-dialog',
        callback: () => {
          // Mark popup as shown to prevent showing again
          this.rejectionPopupShown = true;
        }
      });
      
      // Also mark as shown immediately to prevent duplicate calls
      this.rejectionPopupShown = true;
    },
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
  contain: layout; /* Isolate layout calculations to prevent ResizeObserver loops */
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
  contain: layout; /* Isolate layout calculations for chart containers */
  width: 320px; /* Fixed width to prevent resize loops */
}

@media (max-width: 1024px) {
  .detail-content {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
  
  .sidebar {
    position: static;
    width: auto; /* Allow responsive width on mobile */
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
  
}

/* Rejection popup styling */
.rejection-popup-dialog .el-message-box {
  max-width: 500px;
}

.rejection-popup-dialog .el-message-box__message {
  color: #333;
}

.rejection-popup-dialog .el-message-box__content {
  padding-bottom: 20px;
}

.rejection-popup-dialog .el-button--warning {
  background-color: #f6ad55;
  border-color: #f6ad55;
}

.rejection-popup-dialog .el-button--warning:hover {
  background-color: #ed8936;
  border-color: #ed8936;
}


</style>