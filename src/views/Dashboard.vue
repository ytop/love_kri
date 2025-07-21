<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-content">
                  <div class="header-info">
            <h1>KRI Dashboard</h1>
            <p>Monitor and manage key risk indicators</p>
          </div>
          <div class="header-stats">
          <el-tag type="info">{{ filteredKRIItems.length }} KRIs</el-tag>
        </div>
        <div class="header-actions">
          <el-badge v-if="showPendingButton" :value="totalPendingKRIsCount" class="item" type="danger" :hidden="totalPendingKRIsCount === 0">
            <el-button size="medium" @click="navigateToStatusPage()">Pending KRIs</el-button>
          </el-badge>
          <!-- Login/Logout Button -->
          <div class="auth-section">
            <el-button v-if="isAuthenticated" type="primary" size="medium" @click="handleLogout">
              <i class="el-icon-switch-button"></i>
              Logout ({{ getUserDisplayName(currentUser) }})
            </el-button>
            <el-button v-else type="primary" size="medium" @click="handleLogin">
              <i class="el-icon-user"></i>
              Login
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-content">
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

      <!-- Action Toolbar -->
      <div class="action-toolbar">
        <div class="toolbar-left">
          <el-button @click="handleRefresh" icon="el-icon-refresh">
            Refresh
          </el-button>
          <el-button @click="showChartView = true" icon="el-icon-s-data">
            Chart View
          </el-button>
          <el-button icon="el-icon-download">
            Export
          </el-button>
        </div>

        <div class="toolbar-right" v-if="selectedKRIs.length > 0">
          <span class="selection-info">{{ selectedKRIs.length }} selected</span>
          <el-button type="primary" icon="el-icon-check">
            Approve Selected KRI
          </el-button>
        </div>
      </div>

      <!-- KRI Table -->
      <el-card class="table-card">
        <div slot="header" class="table-header">
          <span>KRI Items</span>
          <el-tooltip content="Click any row to view detailed information" placement="top">
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
        <k-r-i-table 
          :data="filteredKRIItems" 
          :loading="loading"
          @row-click="handleKRIClick"
        />
      </el-card>
    </div>

    <!-- Chart View Dialog -->
    <k-r-i-chart-view
      v-if="showChartView"
      :visible="showChartView"
      :data="filteredKRIItems"
      @close="showChartView = false"
    />
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import { getLastDayOfPreviousMonth, mapStatus as getStatusLabel, getUserDisplayName } from '@/utils/helpers';
import { validationMixin, errorHandlingMixin } from '@/mixins/validationMixin';
import KRIFilters from '../components/KRIFilters.vue'; // Changed from SimpleFilters
import KRITable from '../components/KRITable.vue';
import KRIChartView from '../components/KRIChartView.vue';

export default {
  name: 'Dashboard',
  mixins: [validationMixin, errorHandlingMixin],
  components: {
    KRIFilters, // Changed from SimpleFilters
    KRITable,
    KRIChartView
  },
  data() {
    return {
      showAdvancedFilters: false,
      showChartView: false,
      selectedKRIs: []
    };
  },
  computed: {
    ...mapState('kri', ['loading', 'error']),
    ...mapGetters('kri', [
      'filteredKRIItems',
      'availableDepartments'
    ]),
    ...mapState('kri', ['kriItems']),
    currentUser() {
      return this.$store.state.kri.currentUser;
    },
    isAuthenticated() {
      return !!this.currentUser.uuid;
    },
    filters() {
      return this.$store.state.kri.filters;
    },
    // Calculate total pending KRIs count based on user permissions
    totalPendingKRIsCount() {
      const userPermissions = this.currentUser.permissions;
      
      if (!userPermissions) {
        return 0;
      }
      
      return this.kriItems.filter(item => {
        const key = `${item.id}_${item.reportingDate}`;
        
        // Check if user has any permission for this KRI
        const hasEditPermission = userPermissions[key]?.includes('edit') || false;
        const hasReviewPermission = userPermissions[key]?.includes('review') || false;
        const hasAcknowledgePermission = userPermissions[key]?.includes('acknowledge') || false;
        
        // Show KRIs that the user can act on based on status and permissions
        if (hasEditPermission && (
          item.collectionStatus === 'Pending Input' || 
          item.collectionStatus === 'Under Rework' ||
          item.collectionStatus === 'Saved'
        )) {
          return true;
        }
        
        if (hasReviewPermission && item.collectionStatus === 'Submitted to Data Provider Approver') {
          return true;
        }
        
        if (hasAcknowledgePermission && item.collectionStatus === 'Submitted to KRI Owner Approver') {
          return true;
        }
        
        return false;
      }).length;
    },
    
    // Show pending button if user has any permissions
    showPendingButton() {
      const userPermissions = this.currentUser.permissions;
      if (!userPermissions) return false;
      
      // Check if user has any permission for any KRI
      return Object.values(userPermissions).some(permissions => 
        permissions.includes('edit') || permissions.includes('review') || permissions.includes('acknowledge')
      );
    }
  },
  async created() {
    // Set default reporting date
    const defaultDate = getLastDayOfPreviousMonth();
    this.updateFilters({ reportingDate: defaultDate });
    
    // Fetch initial data and departments
    try {
      await Promise.all([
        this.refetchUserPermissions().catch(err => console.warn('Failed to refetch permissions on load:', err)),
        this.fetchKRIItems(defaultDate),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  },
  methods: {
    ...mapActions('kri', [
      'fetchKRIItems', 
      'updateFilters', 
      'resetFilters',
      'logoutUser',
      'refetchUserPermissions'
    ]),
    
    // Helper method to access status mapping in template
    mapStatus(status) {
      return getStatusLabel(status);
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
    
    handleSelectAll(checked) {
      if (checked) {
        this.selectedKRIs = this.filteredKRIItems.map(kri => `${kri.id}-${kri.reportingDate}`);
      } else {
        this.selectedKRIs = [];
      }
    },
    
    handleRowSelect(kriId, reportingDate, checked) {
      const compositeId = `${kriId}-${reportingDate}`;
      if (checked) {
        this.selectedKRIs.push(compositeId);
      } else {
        const index = this.selectedKRIs.indexOf(compositeId);
        if (index > -1) {
          this.selectedKRIs.splice(index, 1);
        }
      }
    },
    
    handleKRIClick(kriId, reportingDate) {
      console.log(kriId, reportingDate);
      this.$router.push({ 
        name: 'KRIDetail', 
        params: { id: kriId, date: reportingDate }
      });
    },
    navigateToStatusPage() {
      this.$router.push({ name: 'PendingKRIs' });
    },
    
    // Helper method to get user display name
    getUserDisplayName(user) {
      return getUserDisplayName(user);
    },
    
    // Handle login button click
    handleLogin() {
      this.$router.push({ name: 'Login' });
    },
    
    
    // Handle logout
    async handleLogout() {
      try {
        await this.logoutUser();
        this.$message.success('Logged out successfully');
        this.$router.push({ name: 'Login' });
      } catch (error) {
        this.$message.error('Logout failed');
      }
    },
    
    // Handle refresh button click
    async handleRefresh() {
      try {
        // Refetch user permissions first
        await this.refetchUserPermissions();
        
        const currentReportingDate = this.filters.reportingDate || getLastDayOfPreviousMonth();
        await this.fetchKRIItems(currentReportingDate);
        this.$message.success('Data refreshed successfully');
      } catch (error) {
        this.$message.error('Failed to refresh data');
        console.error('Refresh error:', error);
      }
    }
  }
};
</script>

<style scoped>
/* .item class and its styling removed as el-badge handles positioning well with parent flex alignment. */
/* Retained for context if specific adjustments are needed later:
.item {
  margin-top: 10px;
  margin-right: 40px;
}
*/

.dashboard {
  min-height: 100vh;
  background-color: #f1f5f9;
}

.dashboard-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem; /* Added for spacing between elements */
}

.header-info {
  flex-grow: 1; /* Allow info to take available space */
}

.header-info h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.header-info p {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
}



.dashboard-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.action-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  gap: 0.75rem;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selection-info {
  font-size: 0.875rem;
  color: #64748b;
}

.table-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.table-card >>> .el-card__body {
  padding: 0;
}

.error-message {
  padding: 1rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #374151;
}

.table-info-icon {
  color: #6b7280;
  font-size: 1rem;
  cursor: help;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.header-actions >>> .el-badge__content {
  /* ensure the badge is on top of the button */
  z-index: 10;
  /* ensure the text is centered */
  padding: 0 6px;
  height: 18px;
  min-width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-size: 12px;
  box-sizing: border-box;
}

.auth-section {
  margin-left: 1rem;
}
</style>