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
            <k-r-i-overview 
              :kri-data="kriDetail" 
              :atomic-data="atomicData"
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
                @click="action.handler"
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
import { mapState, mapActions } from 'vuex';
import { mapStatus, formatDateFromInt, getStatusTagType, canPerformAction } from '../utils/helpers';
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
  data() {
    return {
      // Loading states for different actions
      approvingKRI: false,
      rejectingKRI: false,
      overridingKRI: false,
      recalculatingKRI: false,
      
      // Dialog states
      showRejectDialog: false,
      showOverrideDialog: false,
      rejectReason: '',
      overrideValue: '',
      overrideReason: ''
    };
  },
  computed: {
    ...mapState('kri', [
      'kriDetail',
      'atomicData',
      'evidenceData',
      'auditTrailData',
      'loading',
      'error',
      'currentUser'
    ]),
    
    // Current KRI object for permission checking
    currentKRI() {
      if (!this.kriDetail) return null;
      return {
        id: this.kriDetail.kri_id,
        reportingDate: this.kriDetail.reporting_date,
        owner: this.kriDetail.kri_owner,
        dataProvider: this.kriDetail.data_provider
      };
    },
    
    // User permissions
    userPermissions() {
      return this.currentUser?.permissions || {};
    },
    
    // Current KRI status
    currentStatus() {
      return this.kriDetail?.kri_status || 0;
    },
    
    // Whether this is a calculated KRI
    isCalculatedKRI() {
      return this.kriDetail?.kri_formula && 
             this.kriDetail.kri_formula !== 'Direct Input' && 
             this.kriDetail.kri_formula.trim() !== '';
    },
    
    // Available actions based on status and permissions
    availableActions() {
      const actions = [];
      
      // Workflow actions (approve/reject/override) - shown first
      if (this.canApproveKRI) {
        actions.push({
          key: 'approve',
          label: this.getApproveButtonText,
          icon: 'el-icon-check',
          type: 'success',
          handler: this.handleApproveKRI,
          loading: this.approvingKRI,
          title: this.getApproveButtonTitle,
          disabled: false
        });
      }
      
      if (this.canRejectKRI) {
        actions.push({
          key: 'reject',
          label: this.getRejectButtonText,
          icon: 'el-icon-close',
          type: 'danger',
          handler: this.handleRejectKRI,
          loading: this.rejectingKRI,
          title: this.getRejectButtonTitle,
          disabled: false
        });
      }
      
      if (this.canOverrideKRI) {
        actions.push({
          key: 'override',
          label: 'Override Value',
          icon: 'el-icon-edit-outline',
          type: 'warning',
          handler: this.handleOverrideKRI,
          loading: this.overridingKRI,
          title: 'Manually override KRI value (not recommended)',
          disabled: false
        });
      }
      
      if (this.canRecalculateKRI) {
        actions.push({
          key: 'recalculate',
          label: 'Recalculate',
          icon: 'el-icon-refresh',
          type: 'primary',
          handler: this.handleRecalculateKRI,
          loading: this.recalculatingKRI,
          title: 'Recalculate KRI from atomic values',
          disabled: false
        });
      }
      
      // Standard actions (always available) - shown last
      actions.push({
        key: 'evidence',
        label: 'Evidence',
        icon: 'el-icon-folder-opened',
        type: 'primary',
        handler: this.handleEvidenceClick,
        loading: false,
        title: 'View Evidence',
        disabled: false
      });
      
      actions.push({
        key: 'comments',
        label: 'Comments',
        icon: 'el-icon-chat-dot-round',
        type: 'primary',
        handler: this.handleCommentClick,
        loading: false,
        title: 'View Comments',
        disabled: false
      });
      
      return actions;
    },
    
    // Permission checks
    canApproveKRI() {
      if (!this.currentKRI || !this.userPermissions) return false;
      const requiredPermission = this.currentStatus === 40 ? 'review' : 'acknowledge';
      return [40, 50].includes(this.currentStatus) && 
             canPerformAction(this.userPermissions, requiredPermission, this.currentStatus, this.currentKRI);
    },
    
    canRejectKRI() {
      if (!this.currentKRI || !this.userPermissions) return false;
      const requiredPermission = this.currentStatus === 40 ? 'review' : 'acknowledge';
      return [40, 50].includes(this.currentStatus) && 
             canPerformAction(this.userPermissions, requiredPermission, this.currentStatus, this.currentKRI);
    },
    
    canOverrideKRI() {
      if (!this.currentKRI || !this.userPermissions) return false;
      // Only KRI Owner can override, and only in certain statuses
      return [40, 50].includes(this.currentStatus) && 
             canPerformAction(this.userPermissions, 'acknowledge', this.currentStatus, this.currentKRI);
    },
    
    canRecalculateKRI() {
      if (!this.currentKRI || !this.userPermissions || !this.isCalculatedKRI) return false;
      // Can recalculate if user can edit and it's a calculated KRI
      return [10, 20, 30].includes(this.currentStatus) && 
             canPerformAction(this.userPermissions, 'edit', this.currentStatus, this.currentKRI);
    },
    
    // Button text and titles
    getApproveButtonText() {
      if (this.currentStatus === 40) return 'Approve (Data Provider)';
      if (this.currentStatus === 50) return 'Approve (KRI Owner)';
      return 'Approve';
    },
    
    getApproveButtonTitle() {
      if (this.currentStatus === 40) return 'Approve and forward to KRI Owner';
      if (this.currentStatus === 50) return 'Approve and finalize KRI';
      return 'Approve KRI';
    },
    
    getRejectButtonText() {
      if (this.currentStatus === 40) return 'Reject (Data Provider)';
      if (this.currentStatus === 50) return 'Reject (KRI Owner)';
      return 'Reject';
    },
    
    getRejectButtonTitle() {
      return 'Reject and send back for rework';
    }
  },
  async created() {
    await this.fetchKRIDetail({
      kriId: this.id,
      reportingDate: this.date
    });
  },
  methods: {
    ...mapActions('kri', [
      'fetchKRIDetail', 
      'approveKRILevel', 
      'rejectKRILevel', 
      'overrideKRIValue', 
      'calculateKRIFromAtomic',
      'checkAndAutoRecalculate'
    ]),
    
    goBack() {
      this.$router.push('/');
    },
    
    mapStatus,
    getStatusTagType,
    
    formatReportingDate(dateInt) {
      return formatDateFromInt(dateInt);
    },
    
    // KRI Workflow Action Handlers
    async handleApproveKRI() {
      this.approvingKRI = true;
      try {
        const result = await this.approveKRILevel({
          kriId: this.id,
          reportingDate: this.kriDetail.reporting_date
        });
        
        if (result.success) {
          this.$message.success('KRI approved successfully');
          await this.refreshKRIData();
        } else {
          this.$message.error(result.error || 'Failed to approve KRI');
        }
      } catch (error) {
        console.error('Approve KRI error:', error);
        this.$message.error('Failed to approve KRI');
      } finally {
        this.approvingKRI = false;
      }
    },
    
    handleRejectKRI() {
      this.$prompt('Please provide a reason for rejection:', 'Reject KRI', {
        confirmButtonText: 'Reject',
        cancelButtonText: 'Cancel',
        inputType: 'textarea',
        inputValidator: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Rejection reason is required';
          }
          return true;
        }
      }).then(async ({ value }) => {
        this.rejectingKRI = true;
        try {
          const result = await this.rejectKRILevel({
            kriId: this.id,
            reportingDate: this.kriDetail.reporting_date,
            reason: value.trim()
          });
          
          if (result.success) {
            this.$message.success('KRI rejected successfully');
            await this.refreshKRIData();
          } else {
            this.$message.error(result.error || 'Failed to reject KRI');
          }
        } catch (error) {
          console.error('Reject KRI error:', error);
          this.$message.error('Failed to reject KRI');
        } finally {
          this.rejectingKRI = false;
        }
      }).catch(() => {
        // User cancelled
      });
    },
    
    handleOverrideKRI() {
      this.$prompt(
        `Current KRI value: ${this.kriDetail.kri_value}\nEnter new value:`, 
        'Override KRI Value', 
        {
          confirmButtonText: 'Override',
          cancelButtonText: 'Cancel',
          inputType: 'number',
          inputValue: this.kriDetail.kri_value,
          inputValidator: (value) => {
            if (value === null || value === undefined || value === '') {
              return 'New value is required';
            }
            if (isNaN(parseFloat(value))) {
              return 'Please enter a valid number';
            }
            return true;
          }
        }
      ).then(({ value }) => {
        // Ask for reason
        this.$prompt('Please provide a reason for this override:', 'Override Reason', {
          confirmButtonText: 'Confirm Override',
          cancelButtonText: 'Cancel',
          inputType: 'textarea',
          inputValidator: (reason) => {
            if (!reason || reason.trim().length === 0) {
              return 'Override reason is required';
            }
            return true;
          }
        }).then(async ({ value: reason }) => {
          this.overridingKRI = true;
          try {
            const result = await this.overrideKRIValue({
              kriId: this.id,
              reportingDate: this.kriDetail.reporting_date,
              newValue: parseFloat(value),
              reason: reason.trim()
            });
            
            if (result.success) {
              this.$message.success('KRI value overridden successfully');
              await this.refreshKRIData();
            } else {
              this.$message.error(result.error || 'Failed to override KRI value');
            }
          } catch (error) {
            console.error('Override KRI error:', error);
            this.$message.error('Failed to override KRI value');
          } finally {
            this.overridingKRI = false;
          }
        });
      }).catch(() => {
        // User cancelled
      });
    },
    
    async handleRecalculateKRI() {
      this.recalculatingKRI = true;
      try {
        const result = await this.calculateKRIFromAtomic({
          kriId: this.id,
          reportingDate: this.kriDetail.reporting_date
        });
        
        if (result.success) {
          this.$message.success(`KRI recalculated successfully. New value: ${result.data.calculatedValue}`);
          await this.refreshKRIData();
        } else {
          this.$message.error(result.error || 'Failed to recalculate KRI');
        }
      } catch (error) {
        console.error('Recalculate KRI error:', error);
        this.$message.error('Failed to recalculate KRI');
      } finally {
        this.recalculatingKRI = false;
      }
    },
    
    // Standard Action Handlers
    handleEvidenceClick() {
      console.log('Evidence button clicked. KRI ID:', this.id, 'Reporting Date:', this.date);
      // Placeholder: Future implementation might navigate to the evidence tab or open a modal.
    },
    
    handleCommentClick() {
      console.log('Comment button clicked. KRI ID:', this.id, 'Reporting Date:', this.date);
      // Placeholder: Future implementation might open a comment modal or section.
    },
    
    async refreshKRIData() {
      console.log('Refreshing KRI data from database...');
      try {
        await this.fetchKRIDetail({
          kriId: this.id,
          reportingDate: this.date
        });
        console.log('KRI data refreshed successfully');
      } catch (error) {
        console.error('Error refreshing KRI data:', error);
        this.$message.error('Failed to refresh data from database');
      }
    },
    
    // Enhanced refresh with validation
    async forceRefreshKRIData() {
      console.log('Force refreshing KRI data from database...');
      this.loading = true;
      try {
        // Clear current state to force fresh fetch
        this.$store.commit('kri/SET_KRI_DETAIL', null);
        this.$store.commit('kri/SET_ATOMIC_DATA', []);
        this.$store.commit('kri/SET_EVIDENCE_DATA', []);
        this.$store.commit('kri/SET_AUDIT_TRAIL_DATA', []);
        
        await this.fetchKRIDetail({
          kriId: this.id,
          reportingDate: this.date
        });
        
        // Also refresh the main KRI list to ensure consistency
        const formattedDate = this.date.includes('-') ? this.date : formatDateFromInt(this.date);
        await this.$store.dispatch('kri/fetchKRIItems', formattedDate);
        
        console.log('KRI data force refreshed successfully');
      } catch (error) {
        console.error('Error force refreshing KRI data:', error);
        this.$message.error('Failed to refresh data from database');
      } finally {
        this.loading = false;
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