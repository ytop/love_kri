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
          <el-badge :value="pendingKRIsCount" class="item" type="danger" :hidden="pendingKRIsCount === 0">
            <el-button size="medium" @click="navigateToStatusPage('Pending')">Pending for input</el-button>
          </el-badge>
          <el-badge :value="submittedKRIsCount" class="item" type="danger" :hidden="submittedKRIsCount === 0">
            <el-button size="medium" @click="navigateToStatusPage('Submitted')">Pending for approval</el-button>
          </el-badge>
        </div>
      </div>
    </div>

    <div class="dashboard-content">
      <!-- Filters Card -->
      <el-card class="filter-card">
        <k-r-i-filters
          :filters="filters"
          :show-advanced="showAdvancedFilters"
          @filter-change="handleFilterChange"
          @reset-filters="handleResetFilters"
          @toggle-advanced="handleToggleAdvancedFilters"
        />
      </el-card>

      <!-- Action Toolbar -->
      <div class="action-toolbar">
        <div class="toolbar-left">
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
import { getLastDayOfPreviousMonth } from '@/utils/helpers';
import KRIFilters from '../components/KRIFilters.vue'; // Changed from SimpleFilters
import KRITable from '../components/KRITable.vue';
import KRIChartView from '../components/KRIChartView.vue';

export default {
  name: 'Dashboard',
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
    ...mapGetters('kri', ['filteredKRIItems', 'pendingKRIsCount', 'submittedKRIsCount']),
    filters() {
      return this.$store.state.kri.filters;
    }
  },
  async created() {
    // Set default reporting date
    const defaultDate = getLastDayOfPreviousMonth();
    this.updateFilters({ reportingDate: defaultDate });
    
    // Fetch initial data
    try {
      await this.fetchKRIItems(defaultDate);
    } catch (error) {
      console.error('Error loading KRI data:', error);
    }
  },
  methods: {
    ...mapActions('kri', ['fetchKRIItems', 'updateFilters', 'resetFilters']),
    
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
      console.log(kriId, reportingDate)
      this.$router.push({ 
        name: 'KRIDetail', 
        params: { id: kriId, date: reportingDate }
      });
    },
    navigateToStatusPage(status) {
      if (status === 'Pending') {
        this.$router.push({ name: 'PendingKRIs' });
      } else if (status === 'Submitted') {
        this.$router.push({ name: 'SubmittedKRIs' });
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

.header-actions >>> .el-badge__content {
  z-index: 10;
}
</style>