<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>{{ title }}</h3>
        <p class="admin-tab-description">{{ description }}</p>
      </div>
    </div>

    <!-- Statistics Summary -->
    <div v-if="showStatistics" class="audit-summary">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="audit-stat-card">
            <div class="audit-stat">
              <div class="audit-number">{{ filteredAuditStats.totalActivities }}</div>
              <div class="audit-label">Total Activities</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="audit-stat-card">
            <div class="audit-stat">
              <div class="audit-number">{{ filteredAuditStats.todayActivities }}</div>
              <div class="audit-label">Today's Activities</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="audit-stat-card">
            <div class="audit-stat">
              <div class="audit-number">{{ filteredAuditStats.uniqueUsers }}</div>
              <div class="audit-label">Active Users</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- Filters -->
    <div v-if="showFilters" class="audit-filters" :style="showStatistics ? 'margin-top: 20px; margin-bottom: 20px;' : 'margin-bottom: 20px;'">
      <el-form :inline="true">
        <el-form-item label="Date Range:">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="To"
            start-placeholder="Start date"
            end-placeholder="End date"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            @change="handleDateRangeChange"
          >
          </el-date-picker>
        </el-form-item>
        <el-form-item v-if="showActivityTypeFilter" label="Activity Type:">
          <el-select 
            v-model="activityTypeFilter" 
            placeholder="All Types"
            clearable
            @change="handleFilterChange"
          >
            <el-option 
              v-for="type in computedActivityTypes"
              :key="type.value"
              :label="type.label" 
              :value="type.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="showDepartmentFilter" label="department:">
          <el-select 
            v-model="departmentFilter" 
            placeholder="All Departments"
            clearable
            @change="handleFilterChange"
          >
            <el-option 
              v-for="dept in computedDepartments" 
              :key="dept" 
              :label="dept" 
              :value="dept"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="showUserFilter" label="User:">
          <el-select 
            v-model="userFilter" 
            placeholder="All Users"
            clearable
            filterable
            @change="handleFilterChange"
          >
            <el-option 
              v-for="user in computedUsers" 
              :key="user.uuid || user.user_id" 
              :label="`${user.user_id} (${user.user_name})`" 
              :value="user.uuid || user.user_id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            @click="loadAuditData"
            :loading="loading"
          >
            Refresh
          </el-button>
          <el-button 
            v-if="showExport" 
            type="info" 
            icon="el-icon-download"
            @click="exportToCSV"
          >
            Export CSV
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- Audit Data Table -->
    <el-table 
      :data="filteredAuditData" 
      v-loading="loading"
      stripe
      border
      class="admin-full-width"
      :default-sort="{ prop: 'changed_at', order: 'descending' }"
    >
      <el-table-column prop="changed_at" label="Date/Time" width="180" sortable>
        <template slot-scope="scope">
          {{ formatDateTime(scope.row.changed_at) }}
        </template>
      </el-table-column>
      
      <el-table-column v-if="showKRIColumn" prop="kri_id" label="KRI ID" width="80" sortable>
      </el-table-column>
      
      <el-table-column prop="action" label="Action" width="150" sortable>
        <template slot-scope="scope">
          <el-tag :type="getActionTagType(scope.row.action)" size="small">
            {{ scope.row.action }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="changed_by" label="User" width="120" sortable>
      </el-table-column>
      
      <el-table-column v-if="showDepartmentColumn" prop="user_department" label="department" width="120">
      </el-table-column>
      
      <el-table-column v-if="showFieldColumn" prop="field_name" label="Field" width="150">
      </el-table-column>
      
      <el-table-column label="Changes" min-width="200">
        <template slot-scope="scope">
          <div v-if="scope.row.old_value || scope.row.new_value">
            <span class="change-item">
              <el-tag type="info" size="mini">From:</el-tag>
              <span class="old-value">{{ scope.row.old_value || 'N/A' }}</span>
            </span>
            <br>
            <span class="change-item">
              <el-tag type="success" size="mini">To:</el-tag>
              <span class="new-value">{{ scope.row.new_value || 'N/A' }}</span>
            </span>
          </div>
          <span v-else class="admin-text-muted">{{ scope.row.comment || 'No details' }}</span>
        </template>
      </el-table-column>
      
      <el-table-column v-if="showActions" label="Actions" width="100">
        <template slot-scope="scope">
          <el-button 
            size="mini" 
            type="info" 
            icon="el-icon-view"
            @click="$emit('view-audit-details', scope.row)"
          >
            Details
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <div v-if="filteredAuditData.length === 0 && !loading" class="no-audit-data">
      <el-empty :description="emptyMessage">
      </el-empty>
    </div>
  </div>
</template>

<script>
import adminHelpersMixin from '@/mixins/adminHelpersMixin';

export default {
  name: 'AdminBaseActivityAudit',
  
  mixins: [adminHelpersMixin],
  
  props: {
    title: {
      type: String,
      default: 'Activity Audit'
    },
    description: {
      type: String,
      default: 'Monitor system activities and changes'
    },
    auditData: {
      type: Array,
      default: () => []
    },
    auditStats: {
      type: Object,
      default: () => ({
        totalActivities: 0,
        todayActivities: 0,
        uniqueUsers: 0
      })
    },
    availableUsers: {
      type: Array,
      default: () => []
    },
    departments: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    // Configuration props
    showStatistics: {
      type: Boolean,
      default: true
    },
    showFilters: {
      type: Boolean,
      default: true
    },
    showActivityTypeFilter: {
      type: Boolean,
      default: true
    },
    showDepartmentFilter: {
      type: Boolean,
      default: true
    },
    showUserFilter: {
      type: Boolean,
      default: true
    },
    showKRIColumn: {
      type: Boolean,
      default: true
    },
    showDepartmentColumn: {
      type: Boolean,
      default: true
    },
    showFieldColumn: {
      type: Boolean,
      default: true
    },
    showActions: {
      type: Boolean,
      default: false
    },
    showExport: {
      type: Boolean,
      default: true
    },
    emptyMessage: {
      type: String,
      default: 'No audit data found for the selected criteria'
    },
    activityTypes: {
      type: Array,
      default: () => [
        { label: 'KRI Updates', value: 'kri_update' },
        { label: 'Permission Changes', value: 'permission_change' },
        { label: 'Status Changes', value: 'status_change' },
        { label: 'Data Input', value: 'data_input' }
      ]
    },
    // Reporting date for audit filtering
    selectedReportingDate: {
      type: Number,
      default: null
    }
  },
  
  data() {
    return {
      dateRange: [],
      activityTypeFilter: '',
      departmentFilter: '',
      userFilter: ''
    };
  },
  
  computed: {
    currentFilters() {
      return {
        dateRange: this.dateRange,
        activityType: this.activityTypeFilter,
        department: this.departmentFilter,
        user: this.userFilter,
        reportingDate: this.selectedReportingDate
      };
    },
    
    // Dynamically compute activity types from audit data
    computedActivityTypes() {
      if (!this.auditData || this.auditData.length === 0) {
        return this.activityTypes; // Fallback to default prop values
      }
      
      const uniqueActions = [...new Set(this.auditData.map(item => item.action))].filter(action => action);
      return uniqueActions.map(action => ({
        label: this.formatActionLabel(action),
        value: action
      })).sort((a, b) => a.label.localeCompare(b.label));
    },
    
    // Dynamically compute departments from audit data
    computedDepartments() {
      if (!this.auditData || this.auditData.length === 0) {
        return this.departments; // Fallback to prop values
      }
      
      const uniqueDepartments = [...new Set(this.auditData.map(item => item.user_department || item.kri_user?.department))].filter(dept => dept);
      return uniqueDepartments.sort();
    },
    
    // Dynamically compute users from audit data
    computedUsers() {
      if (!this.auditData || this.auditData.length === 0) {
        return this.availableUsers; // Fallback to prop values
      }
      
      const uniqueUsers = [...new Set(this.auditData.map(item => item.changed_by))].filter(user => user);
      return uniqueUsers.map(userId => ({
        user_id: userId,
        user_name: this.auditData.find(item => item.changed_by === userId)?.kri_user?.user_name || 'Unknown',
        uuid: userId // For consistency with prop structure
      })).sort((a, b) => a.user_id.localeCompare(b.user_id));
    },
    
    // Apply filters to audit data
    filteredAuditData() {
      if (!this.auditData || this.auditData.length === 0) {
        return [];
      }
      
      let filtered = [...this.auditData];
      
      // Apply date range filter
      if (this.dateRange && this.dateRange.length === 2) {
        const [startDate, endDate] = this.dateRange;
        if (startDate && endDate) {
          const start = new Date(startDate + 'T00:00:00.000Z');
          const end = new Date(endDate + 'T23:59:59.999Z');
          
          filtered = filtered.filter(item => {
            if (!item.changed_at) return false;
            const itemDate = new Date(item.changed_at);
            return itemDate >= start && itemDate <= end;
          });
        }
      }
      
      // Apply activity type filter
      if (this.activityTypeFilter) {
        filtered = filtered.filter(item => item.action === this.activityTypeFilter);
      }
      
      // Apply department filter
      if (this.departmentFilter) {
        filtered = filtered.filter(item => {
          const itemDept = item.user_department || item.kri_user?.department;
          return itemDept === this.departmentFilter;
        });
      }
      
      // Apply user filter
      if (this.userFilter) {
        filtered = filtered.filter(item => item.changed_by === this.userFilter);
      }
      
      return filtered;
    },
    
    // Compute statistics for filtered data
    filteredAuditStats() {
      const filtered = this.filteredAuditData;
      const today = new Date().toISOString().split('T')[0];
      
      const todayActivities = filtered.filter(item => 
        item.changed_at && item.changed_at.split('T')[0] === today
      ).length;
      
      const uniqueUsers = new Set(filtered.map(item => item.changed_by)).size;
      
      return {
        totalActivities: filtered.length,
        todayActivities,
        uniqueUsers
      };
    }
  },
  
  watch: {
    selectedReportingDate(newDate) {
      if (newDate && !this.dateRange.length) {
        // If reporting date changes and no date range is set, 
        // automatically set date range to include the reporting period
        this.setDefaultDateRange(newDate);
      }
    }
  },
  
  methods: {
    handleDateRangeChange() {
      this.handleFilterChange();
    },
    
    handleFilterChange() {
      this.$emit('filter-changed', this.currentFilters);
    },
    
    loadAuditData() {
      this.$emit('load-audit-data', this.currentFilters);
    },
    
    /**
     * Format action labels for better display
     * @param {string} action - Raw action value from database
     * @returns {string} Formatted label
     */
    formatActionLabel(action) {
      if (!action) return 'Unknown';
      
      // Convert snake_case and other formats to readable labels
      const labelMap = {
        'kri_update': 'KRI Update',
        'permission_change': 'Permission Change',
        'status_change': 'Status Change',
        'data_input': 'Data Input',
        'update_atomic': 'Atomic Update',
        'updatekri': 'KRI Update',
        'updateatomickri': 'Atomic KRI Update',
        'select_evidence': 'Evidence Selected',
        'unselect_evidence': 'Evidence Unselected',
        'upload_evidence': 'Evidence Upload',
        'approve_kri': 'KRI Approved',
        'reject_kri': 'KRI Rejected',
        'submit_kri': 'KRI Submitted'
      };
      
      // If we have a specific mapping, use it
      if (labelMap[action]) {
        return labelMap[action];
      }
      
      // Otherwise, format the action string nicely
      return action
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    },
    
    /**
     * Export filtered audit data to CSV
     */
    exportToCSV() {
      try {
        const data = this.filteredAuditData;
        
        if (!data || data.length === 0) {
          this.$message.warning('No data to export');
          return;
        }
        
        // Define CSV columns and headers
        const columns = [
          { key: 'changed_at', header: 'Date/Time' },
          { key: 'kri_id', header: 'KRI ID' },
          { key: 'action', header: 'Action' },
          { key: 'changed_by', header: 'User' },
          { key: 'user_department', header: 'Department', transform: (item) => item.user_department || item.kri_user?.department || 'N/A' },
          { key: 'field_name', header: 'Field' },
          { key: 'old_value', header: 'Old Value' },
          { key: 'new_value', header: 'New Value' },
          { key: 'comment', header: 'Comment' }
        ];
        
        // Create CSV header
        const csvHeader = columns.map(col => `"${col.header}"`).join(',');
        
        // Create CSV rows
        const csvRows = data.map(item => {
          return columns.map(col => {
            let value;
            
            // Apply custom transform if available
            if (col.transform) {
              value = col.transform(item);
            } else {
              value = item[col.key];
            }
            
            // Format specific fields
            if (col.key === 'changed_at' && value) {
              value = this.formatDateTime(value);
            }
            
            // Handle null/undefined values
            if (value === null || value === undefined) {
              value = '';
            }
            
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',');
        });
        
        // Combine header and rows
        const csvContent = [csvHeader, ...csvRows].join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          
          // Generate filename with timestamp
          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          const filename = `audit-trail-${timestamp}.csv`;
          link.setAttribute('download', filename);
          
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          this.$message.success(`Exported ${data.length} audit records to ${filename}`);
        } else {
          this.$message.error('CSV export not supported in this browser');
        }
      } catch (error) {
        console.error('Error exporting CSV:', error);
        this.$message.error('Failed to export audit data');
      }
    },
    
    /**
     * Set default date range based on reporting date
     * @param {number} reportingDate - Reporting date in YYYYMMDD format
     */
    setDefaultDateRange(reportingDate) {
      try {
        const dateStr = reportingDate.toString();
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
        const day = parseInt(dateStr.substring(6, 8));
        
        const reportingDateObj = new Date(year, month, day);
        const startOfMonth = new Date(year, month, 1);
        
        this.dateRange = [
          startOfMonth.toISOString().split('T')[0],
          reportingDateObj.toISOString().split('T')[0]
        ];
      } catch (error) {
        console.warn('Failed to set default date range:', error);
      }
    }
  }
};
</script>

<style scoped>
.audit-summary {
  margin-bottom: 30px;
}

.audit-stat-card {
  text-align: center;
}

.audit-stat {
  padding: 20px;
}

.audit-number {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.audit-label {
  font-size: 14px;
  color: #909399;
}

.audit-filters {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
}

.change-item {
  display: block;
  margin: 2px 0;
}

.old-value {
  color: #909399;
  margin-left: 5px;
}

.new-value {
  color: #67c23a;
  margin-left: 5px;
}

.no-audit-data {
  text-align: center;
  padding: 40px;
  color: #909399;
}
</style>