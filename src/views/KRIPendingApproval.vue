<template>
  <div class="kri-pending-approval">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <el-button icon="el-icon-arrow-left" @click="goBack" class="back-button">Back to Dashboard</el-button>
        <div class="header-info">
          <h1>KRIs Pending Approval</h1>
          <p>{{ kriItemsForApproval.length }} KRIs requiring approval</p>
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
            <el-tag type="info" size="small" class="status-tag">{{ pendingDataProviderApprovalCount }} Pending DP Approval</el-tag>
            <el-tag type="primary" size="small" class="status-tag">{{ readyForSubmissionCount }} Ready for Submission</el-tag>
            <el-tag type="info" size="small" class="status-tag">{{ submittedCount }} Submitted</el-tag>
          </div>
        </div>
      </el-card>

      <!-- KRI Approval Table -->
      <el-card class="table-card">
        <div slot="header" class="table-header">
          <span>KRIs Requiring Approval</span>
          <el-tooltip content="Click any KRI to review and approve/reject" placement="top">
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
          :data="kriItemsForApproval"
          :loading="loading"
          @row-click="handleKRIClick"
        />
        <div v-if="!loading && kriItemsForApproval.length === 0 && !error" class="no-data-message">
          <el-empty description="No KRIs pending approval at this time">
            <el-button type="primary" @click="goBack">Go to Dashboard</el-button>
          </el-empty>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import KRITableCollectData from '../components/KRITableCollectData.vue';
import KRIFilters from '../components/KRIFilters.vue';
import { getLastDayOfPreviousMonth, STATUS_VALUES } from '@/utils/helpers';

export default {
  name: 'KRIPendingApproval',
  components: {
    KRITableCollectData,
    KRIFilters
  },
  data() {
    return {
      showAdvancedFilters: false
    };
  },
  computed: {
    ...mapState('kri', ['loading', 'error', 'filters']),
    ...mapGetters('kri', ['roleBasedFilteredKRIItems', 'availableDepartments', 'currentUser']),
    
    kriItemsForApproval() {
      const userRole = this.currentUser.role;
      // Get filtered KRIs that need approval: Saved + Submitted to Data Provider Approver + Submitted to KRI Owner Approver
      const baseItems = this.roleBasedFilteredKRIItems.filter(item => 
        item.collectionStatus === 'Saved' || 
        item.collectionStatus === 'Submitted to Data Provider Approver' || 
        item.collectionStatus === 'Submitted to KRI Owner Approver'
      );
      
      // Additional role-based filtering for approval workflow
      switch(userRole) {
        case 'Data Approver':
          return baseItems.filter(item => 
            item.collectionStatus === 'Submitted to Data Provider Approver'
          );
        case 'KRI Approver':
          return baseItems.filter(item => 
            item.collectionStatus === 'Submitted to KRI Owner Approver'
          );
        default:
          return baseItems;
      }
    },
    
    pendingDataProviderApprovalCount() {
      return this.kriItemsForApproval.filter(item => item.collectionStatus === 'Submitted to Data Provider Approver').length;
    },
    
    readyForSubmissionCount() {
      return this.kriItemsForApproval.filter(item => item.collectionStatus === 'Submitted to KRI Owner Approver').length;
    },
    
    submittedCount() {
      return this.kriItemsForApproval.filter(item => item.collectionStatus === 'Saved').length;
    },
    
    reportingDate() {
      return this.filters.reportingDate || getLastDayOfPreviousMonth();
    }
  },
  async created() {
    await this.loadData();
  },
  methods: {
    ...mapActions('kri', ['fetchKRIItems', 'updateFilters', 'resetFilters', 'fetchDepartments']),
    
    async loadData() {
      if (this.$store.state.kri.kriItems.length === 0 || 
          this.$store.state.kri.filters.reportingDate !== this.reportingDate) {
        try {
          if (this.$store.state.kri.filters.reportingDate !== this.reportingDate) {
            this.updateFilters({ reportingDate: this.reportingDate });
          }
          await Promise.all([
            this.fetchKRIItems(this.reportingDate),
            this.fetchDepartments()
          ]);
        } catch (error) {
          console.error('Error loading KRI data for approval:', error);
        }
      }
    },
    
    async refreshData() {
      await this.fetchKRIItems(this.reportingDate);
    },
    
    handleFilterChange(changedFilter) {
      this.updateFilters(changedFilter);
      
      // Refetch data if reporting date changed
      if (changedFilter.reportingDate) {
        this.fetchKRIItems(changedFilter.reportingDate);
      }
    },
    
    handleResetFilters() {
      this.resetFilters();
      const defaultDate = getLastDayOfPreviousMonth();
      this.updateFilters({ reportingDate: defaultDate });
      this.fetchKRIItems(defaultDate);
    },
    
    handleToggleAdvancedFilters() {
      this.showAdvancedFilters = !this.showAdvancedFilters;
    },
    
    handleKRIClick(kriId, reportingDate) {
      this.$router.push({
        name: 'KRIDetail',
        params: { id: kriId, date: reportingDate }
      });
    },
    
    goBack() {
      this.$router.push({ name: 'Dashboard' });
    }
  }
};
</script>

<style scoped>
.kri-pending-approval {
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
  gap: 0.5rem;
  flex-wrap: wrap;
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