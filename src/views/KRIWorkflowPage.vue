<template>
  <div class="kri-workflow-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <el-button icon="el-icon-arrow-left" @click="goBack" class="back-button">Back to Dashboard</el-button>
        <div class="header-info">
          <h1>{{ pageTitle }}</h1>
          <p>{{ workflowItems.length }} {{ workflowDescription }}</p>
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
            <!-- Filter Warning -->
            <el-alert
              v-if="hasActiveFilters"
              title="Filters Active"
              description="Some KRIs may be hidden due to active filters. Reset filters to see all pending items."
              type="warning"
              size="small"
              :closable="false"
              show-icon
              class="filter-warning">
            </el-alert>
            <div class="status-tags">
              <el-tag 
                v-for="status in statusTags" 
                :key="status.key"
                :type="status.type" 
                size="small" 
                class="status-tag"
              >
                {{ status.label }}
              </el-tag>
            </div>
          </div>
        </div>
      </el-card>

      <!-- KRI Table -->
      <el-card class="table-card">
        <div slot="header" class="table-header">
          <span>{{ tableTitle }}</span>
          <el-tooltip :content="tableTooltip" placement="top">
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
          :data="workflowItems"
          :loading="loading"
          @row-click="handleKRIClick"
          @data-updated="refreshData"
          @selection-change="handleSelectionChange"
        />
        <div v-if="!loading && workflowItems.length === 0 && !error" class="no-data-message">
          <el-empty :description="emptyMessage">
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
import { getLastDayOfPreviousMonth } from '@/utils/helpers';

export default {
  name: 'KRIWorkflowPage',
  components: {
    KRITableCollectData,
    KRIFilters
  },
  data() {
    return {
      showAdvancedFilters: false,
      selectedKRIs: [] // Track selected KRIs for batch operations
    };
  },
  computed: {
    ...mapState('kri', ['loading', 'error', 'filters', 'currentUser']),
    ...mapGetters('kri', ['filteredKRIItems', 'availableDepartments']),
    
    pageTitle() {
      return 'Pending KRIs';
    },
    
    workflowDescription() {
      return 'KRIs requiring your action';
    },
    
    tableTitle() {
      return 'KRIs Requiring Action';
    },
    
    tableTooltip() {
      return 'Click any KRI to take action or view details';
    },
    
    emptyMessage() {
      return 'No KRIs pending your action at this time';
    },
    
    workflowItems() {
      const userPermissions = this.currentUser.permissions;
      
      if (!userPermissions) {
        return [];
      }
      
      return this.filteredKRIItems.filter(item => {
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
      });
    },
    
    statusTags() {
      // Define stable order and mapping
      const statusDefinitions = [
        {
          key: 'pending-input',
          label: 'Pending Input',
          mappedStatus: 'Pending Input',
          type: 'warning'
        },
        {
          key: 'under-rework',
          label: 'Under Rework',
          mappedStatus: 'Under Rework', 
          type: 'warning'
        },
        {
          key: 'saved',
          label: 'Saved',
          mappedStatus: 'Saved',
          type: 'info'
        },
        {
          key: 'pending-dp',
          label: 'Pending DP Approval',
          mappedStatus: 'Submitted to Data Provider Approver',
          type: 'info'
        },
        {
          key: 'pending-owner',
          label: 'Pending KRI Owner Approval',
          mappedStatus: 'Submitted to KRI Owner Approver',
          type: 'primary'
        }
      ];
      
      return statusDefinitions.map(def => {
        const totalCount = this.workflowItems.filter(item => item.collectionStatus === def.mappedStatus).length;
        const selectedCount = this.selectedKRIs.filter(item => item.collectionStatus === def.mappedStatus).length;
        
        // Only show tags that have items
        if (totalCount === 0) {
          return null;
        }
        
        return {
          key: def.key,
          label: selectedCount > 0 ? `${def.label} (${selectedCount}/${totalCount})` : `${totalCount} ${def.label}`,
          type: def.type,
          count: totalCount,
          selectedCount: selectedCount
        };
      }).filter(tag => tag !== null);
    },
    
    // Check if filters other than reportingDate are active
    hasActiveFilters() {
      const { reportingDate, ...otherFilters } = this.filters;
      return Object.values(otherFilters).some(value => value && value.toString().trim() !== '');
    },
    
    reportingDate() {
      return this.filters.reportingDate || getLastDayOfPreviousMonth();
    }
  },
  async created() {
    await this.loadData();
  },
  methods: {
    ...mapActions('kri', ['fetchKRIItems', 'updateFilters', 'resetFilters']),
    
    async loadData() {
      if (this.$store.state.kri.kriItems.length === 0 || 
          this.$store.state.kri.filters.reportingDate !== this.reportingDate) {
        try {
          if (this.$store.state.kri.filters.reportingDate !== this.reportingDate) {
            this.updateFilters({ reportingDate: this.reportingDate });
          }
          await this.fetchKRIItems(this.reportingDate);
        } catch (error) {
          console.error('Error loading KRI data for pending workflow:', error);
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
    
    handleSelectionChange(selection) {
      this.selectedKRIs = selection;
    },
    
    goBack() {
      this.$router.push({ name: 'Dashboard' });
    }
  }
};
</script>

<style scoped>
.kri-workflow-page {
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
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.status-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.filter-warning {
  margin-bottom: 0.5rem;
  width: 100%;
}

.status-tag {
  margin-right: 0.5rem;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
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