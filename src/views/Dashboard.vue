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
          <el-badge
            v-if="showPendingButton"
            :value="totalPendingKRIsCount"
            class="item"
            type="danger"
            :hidden="totalPendingKRIsCount === 0"
          >
            <el-button size="medium" @click="navigateToPendingKRI">
              Pending KRIs
            </el-button>
          </el-badge>
          <!-- Login/Logout Button -->
          <div class="auth-section">
            <el-button
              v-if="isAuthenticated"
              type="primary"
              size="medium"
              @click="handleLogout"
            >
              <i class="el-icon-switch-button"></i>
              Logout ({{ getUserDisplayName(currentUser) }})
            </el-button>
            <el-button
              v-else
              type="primary"
              size="medium"
              @click="handleLogin"
            >
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
import KRIFilters from '@/components/KRIFilters.vue';
import KRITable from '@/components/KRITable.vue';
import KRIChartView from '@/components/KRIChartView.vue';
import { getLastDayOfPreviousMonth, getUserDisplayName } from '@/utils/helpers';

export default {
  name: 'Dashboard',
  components: {
    KRIFilters,
    KRITable,
    KRIChartView
  },
  data() {
    return {
      showChartView: false,
      showAdvancedFilters: false,
      selectedKRIs: []
    };
  },
  computed: {
    ...mapState('kri', ['loading', 'error', 'filters']),
    ...mapGetters('kri', [
      'filteredKRIItems', 
      'currentUser', 
      'isAuthenticated',
      'availableDepartments',
      'totalPendingKRIsCount',
      'showPendingButton'
    ])
  },
  methods: {
    ...mapActions('kri', [
      'fetchKRIItems', 
      'updateFilters', 
      'resetFilters', 
      'restoreUserFromStorage',
      'initPermission',
      'fetchAtomicDataForCalculatedKRIs'
    ]),
    
    handleKRIClick(row) {
      this.$router.push({
        name: 'KRIDetail',
        params: {
          id: row.kriId,
          date: row.reportingDate
        }
      });
    },
    
    navigateToPendingKRI() {
      this.$router.push({
        name: 'PendingKRIs'
      });
    },
    
    handleLogin() {
      this.$router.push({ name: 'Login' });
    },
    
    async handleLogout() {
      try {
        this.$store.commit('kri/LOGOUT_USER');
        this.$message.success('Logged out successfully');
      } catch (error) {
        this.$message.error('Error during logout');
        console.error('Logout error:', error);
      }
    },
    
    handleFilterChange(newFilters) {
      this.updateFilters(newFilters);
      this.refreshData();
    },
    
    handleResetFilters() {
      this.resetFilters();
      this.refreshData();
    },
    
    handleToggleAdvancedFilters() {
      this.showAdvancedFilters = !this.showAdvancedFilters;
    },
    
    async handleRefresh() {
      await this.refreshData();
      this.$message.success('Data refreshed');
    },
    
    async refreshData() {
      try {
        const reportingDate = this.filters.reportingDate || getLastDayOfPreviousMonth();
        
        // Primary load: Fetch main KRI data first for fast rendering
        await this.fetchKRIItems(reportingDate);
        
        // Background load: Fetch atomic data for calculated KRIs (non-blocking)
        this.$nextTick(() => {
          this.fetchAtomicDataForCalculatedKRIs().catch(error => {
            console.warn('Background atomic data loading failed:', error);
            // Don't show error to user - this is background loading
          });
        });
        
      } catch (error) {
        console.error('Error refreshing data:', error);
        this.$message.error('Failed to refresh data');
      }
    },
    
    getUserDisplayName(user) {
      return getUserDisplayName(user);
    }
  },
  async created() {
    // Restore user session if available
    await this.restoreUserFromStorage();
    
    // Initialize permissions if user is authenticated
    if (this.isAuthenticated) {
      try {
        await this.initPermission();
      } catch (error) {
        console.error('Error initializing permissions:', error);
      }
    }
    
    // Load initial data
    await this.refreshData();
  },
  async mounted() {
    // Additional initialization if needed when component is mounted
    if (this.isAuthenticated && (!this.currentUser.permissions || this.currentUser.permissions.length === 0)) {
      try {
        await this.initPermission();
      } catch (error) {
        console.error('Error initializing permissions on mount:', error);
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

/* Responsive: Stack header elements on smaller screens */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .header-info {
    text-align: center;
  }
  
  .header-stats {
    text-align: center;
  }
  
  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
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