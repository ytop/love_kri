<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>Team Management</h3>
        <p class="admin-tab-description">Manage team members and their permissions.</p>
      </div>
      <div class="admin-header-actions">
        <el-button 
          type="primary" 
          icon="el-icon-refresh" 
          @click="$emit('refresh-team-data')"
          :loading="loading"
        >
          Refresh
        </el-button>
      </div>
    </div>

    <el-table 
      :data="teamMembers" 
      v-loading="loading"
      stripe
      border
      class="admin-full-width"
    >
      <el-table-column prop="user_id" label="User ID" sortable width="120">
      </el-table-column>
      
      <el-table-column prop="user_name" label="Display Name" sortable width="150">
      </el-table-column>
      
      <el-table-column prop="user_role" label="Role" sortable width="120">
        <template slot-scope="scope">
          <el-tag 
            :type="getRoleTagType(scope.row.user_role)"
            size="small"
          >
            {{ getRoleDisplayName(scope.row.user_role) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="Permissions Summary" min-width="200">
        <template slot-scope="scope">
          <div v-if="scope.row.permissionSummary">
            <el-tag size="mini" type="info">
              {{ scope.row.permissionSummary.kriCount }} KRIs
            </el-tag>
            <el-tag size="mini" type="success" style="margin-left: 5px;">
              {{ scope.row.permissionSummary.totalPermissions }} permissions
            </el-tag>
          </div>
          <span v-else class="admin-text-muted">No permissions assigned</span>
        </template>
      </el-table-column>
      
      <el-table-column label="Actions" width="180">
        <template slot-scope="scope">
          <el-button 
            size="mini" 
            type="primary" 
            icon="el-icon-key"
            @click="$emit('manage-user-permissions', scope.row)"
          >
            Permissions
          </el-button>
          <el-button 
            size="mini" 
            type="info" 
            icon="el-icon-view"
            @click="$emit('view-user-details', scope.row)"
          >
            Details
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'DepartmentTeamManagement',
  
  props: {
    teamMembers: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  
  methods: {
    getRoleTagType(role) {
      switch (role) {
      case 'admin': return 'danger';
      case 'dept_admin': return 'warning';
      case 'user': return 'info';
      default: return 'info';
      }
    },
    
    getRoleDisplayName(role) {
      switch (role) {
      case 'admin': return 'System Admin';
      case 'dept_admin': return 'Dept Admin';
      case 'user': return 'User';
      default: return role || 'User';
      }
    }
  }
};
</script>

<style scoped>
/* Component-specific styles are handled by parent admin CSS */
</style>