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
              <div class="audit-number">{{ auditStats.totalActivities }}</div>
              <div class="audit-label">Total Activities</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="audit-stat-card">
            <div class="audit-stat">
              <div class="audit-number">{{ auditStats.todayActivities }}</div>
              <div class="audit-label">Today's Activities</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="audit-stat-card">
            <div class="audit-stat">
              <div class="audit-number">{{ auditStats.uniqueUsers }}</div>
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
              v-for="type in activityTypes"
              :key="type.value"
              :label="type.label" 
              :value="type.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="showDepartmentFilter" label="Department:">
          <el-select 
            v-model="departmentFilter" 
            placeholder="All Departments"
            clearable
            @change="handleFilterChange"
          >
            <el-option 
              v-for="dept in departments" 
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
              v-for="user in availableUsers" 
              :key="user.UUID || user.User_ID" 
              :label="`${user.User_ID} (${user.User_Name})`" 
              :value="user.UUID || user.User_ID"
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
            @click="$emit('export-audit-data', { filters: currentFilters, data: auditData })"
          >
            Export
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- Audit Data Table -->
    <el-table 
      :data="auditData" 
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
      
      <el-table-column v-if="showDepartmentColumn" prop="user_department" label="Department" width="120">
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
    
    <div v-if="auditData.length === 0 && !loading" class="no-audit-data">
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
        user: this.userFilter
      };
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