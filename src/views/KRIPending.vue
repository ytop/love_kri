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
        <!-- Filter Warning - moved outside quick-actions for better positioning -->
        <el-alert
          v-if="hasActiveFilters"
          title="Filters Active"
          description="Some KRIs may be hidden due to active filters. Reset filters to see all pending items."
          type="warning"
          size="small"
          :closable="false"
          show-icon
          class="filter-warning-separate">
        </el-alert>
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
        <div style="display: none;"><!-- placeholder for structure -->
        </div>
      </el-card>

      <!-- Bulk Actions Toolbar -->
      <k-r-i-bulk-actions-toolbar
        :selected-items="selectedRows"
        :all-items="filteredPendingKRIItems"
        @clear-selection="clearSelection"
        @bulk-operation-complete="handleBulkOperationComplete"
        @bulk-operation-item="handleBulkOperationItem"
      />

      <!-- KRI Table with Inline Editing -->
      <el-card class="table-card">
        <div v-if="error" class="error-message">
          <el-alert
            title="Error loading data"
            :description="error"
            type="error"
            show-icon>
          </el-alert>
        </div>
        <k-r-i-table-inline-edit
          ref="kriTable"
          :data="filteredPendingKRIItems"
          :loading="loading"
          @row-click="handleKRIClick"
          @selection-change="handleSelectionChange"
          @data-updated="handleDataUpdated"
        />
        <div v-if="!loading && filteredPendingKRIItems.length === 0 && !error" class="no-data-message">
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
import KRIFilters from '@/components/KRIFilters.vue';
import KRITableInlineEdit from '@/components/KRITableInlineEdit.vue';
import KRIBulkActionsToolbar from '@/components/KRIBulkActionsToolbar.vue';
import { getLastDayOfPreviousMonth } from '@/utils/helpers';
import StatusManager from '@/utils/types';
import KRIWorkflowService from '@/services/kriWorkflowService';

export default {
  name: 'KRIPending',
  components: {
    KRIFilters,
    KRITableInlineEdit,
    KRIBulkActionsToolbar
  },
  data() {
    return {
      showAdvancedFilters: false,
      selectedRows: []
    };
  },
  computed: {
    ...mapState('kri', ['loading', 'error', 'filters']),
    ...mapGetters('kri', [
      'pendingKRIItems',
      'filteredPendingKRIItems',
      'currentUser', 
      'isAuthenticated',
      'availableDepartments'
    ]),
    
    // Main data source for the table
    workflowItems() {
      // Use pendingKRIItems directly - they're already filtered by permission
      return this.pendingKRIItems || [];
    },
    
    // Page metadata
    pageTitle() {
      return 'Pending KRI Items';
    },
    
    workflowDescription() {
      return 'items requiring your attention';
    },
    
    tableTooltip() {
      return 'These KRI items require your input, review, or approval based on their current status';
    },
    
    emptyMessage() {
      if (this.hasActiveFilters && this.workflowItems.length > 0) {
        return 'No pending KRI items match the current filters. Try adjusting or resetting the filters to see more items.';
      }
      return 'No pending KRI items found. All items have been processed or you do not have permissions to modify any KRI items.';
    },
    
    // Check if any filters are active
    hasActiveFilters() {
      const filters = this.filters;
      return !!(
        filters.kriOwner ||
        filters.dataProvider ||
        filters.department ||
        filters.collectionStatus ||
        filters.l1RiskType ||
        filters.l2RiskType ||
        filters.kriName ||
        filters.kriId ||
        filters.reportingCycle ||
        filters.kriType ||
        filters.breachType
      );
    },
    
    // Generate status tags shown in the UI (based on filtered items)
    statusTags() {
      if (!this.filteredPendingKRIItems.length) return [];
      
      // Get unique statuses from filtered pending items
      const statusCounts = {};
      this.filteredPendingKRIItems.forEach(item => {
        const status = item.collectionStatus || item.kriStatus;
        const statusLabel = typeof status === 'number' ? StatusManager.mapStatus(status) : status;
        statusCounts[statusLabel] = (statusCounts[statusLabel] || 0) + 1;
      });
      
      // Convert to tag format
      return Object.entries(statusCounts).map(([status, count]) => ({
        key: status,
        label: `${status} (${count})`,
        type: StatusManager.getStatusTagType(status)
      }));
    }
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
    
    // Navigation methods
    goBack() {
      this.$router.push({ name: 'Dashboard' });
    },
    
    handleKRIClick(row) {
      this.$router.push({
        name: 'KRIDetail',
        params: {
          id: row.kriId || row.id,
          date: row.reportingDate
        }
      });
    },
    
    // Filter management methods
    handleFilterChange(newFilters) {
      this.updateFilters(newFilters);
      // Note: No need to refresh data as pendingKRIItems are already cached
      // The computed workflowItems will automatically update through reactivity
    },
    
    handleResetFilters() {
      this.resetFilters();
    },
    
    handleToggleAdvancedFilters() {
      this.showAdvancedFilters = !this.showAdvancedFilters;
    },
    
    // Data refresh method
    async refreshData() {
      try {
        const reportingDate = this.filters.reportingDate || getLastDayOfPreviousMonth();
        
        // Refresh main KRI data which will recalculate pending items
        await this.fetchKRIItems(reportingDate);
        
        // Background load: Fetch atomic data for calculated KRIs (non-blocking)
        this.$nextTick(() => {
          this.fetchAtomicDataForCalculatedKRIs().catch(error => {
            console.warn('Background atomic data loading failed:', error);
            // Don't show error to user - this is background loading
          });
          
          // Auto-expand all calculated KRIs after data refresh
          if (this.$refs.kriTable && this.filteredPendingKRIItems.length > 0) {
            this.$refs.kriTable.expandAll();
          }
        });
        
        this.$message.success('Data refreshed');
      } catch (error) {
        console.error('Error refreshing data:', error);
        this.$message.error('Failed to refresh data');
      }
    },
    
    // Selection handling
    handleSelectionChange(selection) {
      this.selectedRows = selection;
      // Emit for parent components if needed
      this.$emit('selection-change', selection);
    },

    // Clear selection
    clearSelection() {
      this.selectedRows = [];
      // Clear table selection
      if (this.$refs.kriTable && this.$refs.kriTable.$refs.table) {
        this.$refs.kriTable.$refs.table.clearSelection();
      }
    },

    // Handle data updates from inline editing
    handleDataUpdated() {
      // Refresh data to reflect changes
      this.refreshData();
    },

    // Handle bulk operation completion
    handleBulkOperationComplete(operation, results) {
      // Clear selection after bulk operation
      this.clearSelection();
      
      // Refresh data to reflect changes
      this.refreshData();
      
      // Log results for debugging
      console.log(`Bulk ${operation} completed:`, results);
    },

    // Handle individual bulk operation items
    async handleBulkOperationItem({ item, operation, updateData, callback }) {
      try {
        let result;
        
        switch (operation) {
          case 'save':
            result = await KRIWorkflowService.saveKRI(
              item, 
              updateData, 
              this.currentUser, 
              `Bulk save operation`
            );
            break;
            
          case 'submit':
            result = await KRIWorkflowService.submitKRI(
              item, 
              updateData, 
              this.currentUser, 
              `Bulk submit operation`
            );
            break;
            
          case 'approve':
            result = await KRIWorkflowService.approveKRI(
              item, 
              this.currentUser, 
              `Bulk approve operation`
            );
            break;
            
          case 'reject':
            // For bulk reject, we'll use a generic reason
            // In a real implementation, you might want to collect reasons
            result = await KRIWorkflowService.rejectKRI(
              item, 
              this.currentUser, 
              `Bulk reject operation - requires further review`
            );
            break;
            
          default:
            throw new Error(`Unknown bulk operation: ${operation}`);
        }
        
        // Return result to the bulk toolbar
        callback(result);
        
      } catch (error) {
        console.error(`Error processing bulk ${operation} for item:`, item, error);
        callback({
          success: false,
          error: error.message
        });
      }
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
    
    // Load initial data if needed
    // Note: Dashboard should have already loaded data and calculated pendingKRIItems
    // But refresh if we don't have any data
    if (!this.workflowItems.length && this.isAuthenticated) {
      await this.refreshData();
    } else if (this.workflowItems.length > 0) {
      // If data already exists, auto-expand calculated KRIs
      this.$nextTick(() => {
        if (this.$refs.kriTable) {
          this.$refs.kriTable.expandAll();
        }
      });
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
  align-items: center;
  justify-content: flex-end;
  flex: 1;
}

.status-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.filter-warning-separate {
  margin: 0.75rem 0;
}

.status-tag {
  margin-right: 0.5rem;
}

.table-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.table-card :deep(.el-card__body) {
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