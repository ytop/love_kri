<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>Department Activity Audit</h3>
        <p class="admin-tab-description">Monitor department activities and changes</p>
      </div>
    </div>

    <div class="audit-summary">
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

    <div class="audit-filters" style="margin-bottom: 20px;">
      <el-form :inline="true">
        <el-form-item label="Date Range:">
          <el-date-picker
            v-model="auditDateRange"
            type="daterange"
            range-separator="To"
            start-placeholder="Start date"
            end-placeholder="End date"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            @change="$emit('load-audit-data')"
          >
          </el-date-picker>
        </el-form-item>
        <el-form-item label="Activity Type:">
          <el-select 
            v-model="auditTypeFilter" 
            placeholder="All Types"
            clearable
            @change="$emit('load-audit-data')"
          >
            <el-option label="KRI Updates" value="kri_update"></el-option>
            <el-option label="Permission Changes" value="permission_change"></el-option>
            <el-option label="Status Changes" value="status_change"></el-option>
            <el-option label="Data Input" value="data_input"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            @click="$emit('load-audit-data')"
            :loading="loading"
          >
            Refresh
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table 
      :data="auditTrailData" 
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
      
      <el-table-column prop="kri_id" label="KRI ID" width="80" sortable>
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
      
      <el-table-column prop="field_name" label="Field" width="150">
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
    </el-table>
    
    <div v-if="auditTrailData.length === 0 && !loading" class="no-audit-data">
      <el-empty description="No audit data found for the selected criteria">
      </el-empty>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DepartmentActivityAudit',
  
  props: {
    auditStats: {
      type: Object,
      default: () => ({
        totalActivities: 0,
        todayActivities: 0,
        uniqueUsers: 0
      })
    },
    auditTrailData: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  
  data() {
    return {
      auditDateRange: [],
      auditTypeFilter: ''
    };
  },
  
  methods: {
    formatDateTime(timestamp) {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString();
    },
    
    getActionTagType(action) {
      if (!action) return 'info';
      const actionLower = action.toLowerCase();
      if (actionLower.includes('approve') || actionLower.includes('finalize')) return 'success';
      if (actionLower.includes('reject') || actionLower.includes('delete')) return 'danger';
      if (actionLower.includes('submit') || actionLower.includes('update')) return 'warning';
      return 'info';
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
  margin-bottom: 20px;
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