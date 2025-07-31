<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>{{ title }}</h3>
        <p class="admin-tab-description">{{ description }}</p>
      </div>
      <div class="admin-header-actions">
        <el-select 
          v-if="showDepartmentFilter"
          v-model="selectedDepartment" 
          placeholder="Filter by Department" 
          clearable
          @change="handleDepartmentFilter"
          class="admin-filter-select"
        >
          <el-option 
            v-for="dept in departments" 
            :key="dept" 
            :label="dept" 
            :value="dept"
          ></el-option>
        </el-select>
        <el-button 
          type="primary" 
          icon="el-icon-refresh" 
          @click="$emit('refresh-users')"
          :loading="loading"
        >
          Refresh
        </el-button>
        <el-button 
          v-if="showAddUser"
          type="success" 
          icon="el-icon-plus"
          @click="$emit('add-user')"
        >
          Add User
        </el-button>
      </div>
    </div>

    <el-table 
      :data="filteredUsers" 
      v-loading="loading"
      stripe
      border
      class="admin-full-width"
      :default-sort="{ prop: 'user_id', order: 'ascending' }"
      @selection-change="handleSelectionChange"
    >
      <el-table-column v-if="showSelection" type="selection" width="55"></el-table-column>
      
      <el-table-column prop="user_id" label="User ID" sortable width="120">
      </el-table-column>
      
      <el-table-column prop="user_name" label="Display Name" sortable width="150">
      </el-table-column>
      
      <el-table-column v-if="showDepartmentColumn" prop="department" label="Department" sortable width="120">
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
      
      <el-table-column v-if="showPermissionSummary" label="Permissions Summary" min-width="200">
        <template slot-scope="scope">
          <div v-if="scope.row.permissionSummary">
            <el-tag size="mini" type="info">
              {{ scope.row.permissionSummary.kriCount || scope.row.permissionSummary.totalKRIs || 0 }} KRIs
            </el-tag>
            <el-tag size="mini" type="success" style="margin-left: 5px;">
              {{ scope.row.permissionSummary.totalPermissions }} permissions
            </el-tag>
          </div>
          <span v-else class="admin-text-muted">No permissions assigned</span>
        </template>
      </el-table-column>
      
      <el-table-column label="Actions" :width="actionColumnWidth" align="center">
        <template slot-scope="scope">
          <div class="admin-user-actions">
            <el-button 
              v-if="showEditRole"
              size="mini" 
              type="primary" 
              icon="el-icon-edit"
              @click="$emit('edit-user-role', scope.row)"
              :disabled="!canManageUser(scope.row)"
            >
              Edit Role
            </el-button>
            <el-button 
              size="mini" 
              type="info" 
              icon="el-icon-key"
              @click="handlePermissionsClick(scope.row)"
            >
              Permissions
            </el-button>
            <el-button 
              v-if="showViewDetails"
              size="mini" 
              type="info" 
              icon="el-icon-view"
              @click="handleDetailsClick(scope.row)"
            >
              Details
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- Bulk Actions -->
    <div v-if="selectedItems.length > 0 && showBulkActions" class="admin-bulk-actions" style="margin-top: 16px;">
      <h4>Bulk Operations</h4>
      <el-form :inline="true">
        <el-form-item label="Selected Users:">
          <span>{{ selectedItems.length }} users selected</span>
        </el-form-item>
        <el-form-item v-if="showBulkRoleChange" label="Change Role To:">
          <el-select 
            v-model="bulkRoleChange" 
            placeholder="Select role"
            style="width: 150px;"
          >
            <el-option label="User" value="user"></el-option>
            <el-option v-if="canAssignDeptAdmin" label="Dept Admin" value="dept_admin"></el-option>
            <el-option v-if="canAssignSystemAdmin" label="System Admin" value="admin"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button 
            v-if="showBulkRoleChange"
            type="primary" 
            @click="executeBulkRoleChange"
            :disabled="!bulkRoleChange"
            :loading="bulkOperationLoading"
          >
            Apply Role Change
          </el-button>
          <el-button 
            v-if="showBulkPermissions"
            type="success" 
            @click="$emit('bulk-assign-permissions', selectedItems)"
          >
            Assign Permissions
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import adminHelpersMixin from '@/mixins/adminHelpersMixin';
import { mapGetters } from 'vuex';

export default {
  name: 'AdminBaseUserManagement',
  
  mixins: [adminHelpersMixin],
  
  props: {
    title: {
      type: String,
      default: 'User Management'
    },
    description: {
      type: String,
      default: 'Manage system users, their roles, and department assignments.'
    },
    users: {
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
    showDepartmentFilter: {
      type: Boolean,
      default: true
    },
    showDepartmentColumn: {
      type: Boolean,
      default: true
    },
    showPermissionSummary: {
      type: Boolean,
      default: true
    },
    showAddUser: {
      type: Boolean,
      default: true
    },
    showEditRole: {
      type: Boolean,
      default: true
    },
    showViewDetails: {
      type: Boolean,
      default: true
    },
    showSelection: {
      type: Boolean,
      default: true
    },
    showBulkActions: {
      type: Boolean,
      default: true
    },
    showBulkRoleChange: {
      type: Boolean,
      default: true
    },
    showBulkPermissions: {
      type: Boolean,
      default: true
    },
    actionColumnWidth: {
      type: String,
      default: '240'
    },
    // Filtering
    departmentFilter: {
      type: String,
      default: ''
    },
    // Reporting date for permission operations
    selectedReportingDate: {
      type: Number,
      default: null
    }
  },
  
  data() {
    return {
      selectedDepartment: this.departmentFilter,
      selectedItems: [],
      bulkRoleChange: '',
      bulkOperationLoading: false
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    filteredUsers() {
      let filtered = this.users;
      
      if (this.selectedDepartment) {
        filtered = filtered.filter(user => user.department === this.selectedDepartment);
      }
      
      return filtered;
    },
    
    canAssignDeptAdmin() {
      return this.currentUser.user_role === 'admin';
    },
    
    canAssignSystemAdmin() {
      return this.currentUser.user_role === 'admin';
    }
  },
  
  watch: {
    departmentFilter(newVal) {
      this.selectedDepartment = newVal;
    }
  },
  
  methods: {
    canManageUser(user) {
      // System admin can manage all users except themselves
      if (this.currentUser.user_role === 'admin') {
        return user.uuid !== this.currentUser.uuid;
      }
      
      // Department admin can only manage users in their department (except other dept admins)
      if (this.currentUser.user_role === 'dept_admin') {
        return user.department === this.currentUser.department && 
               user.user_role === 'user' &&
               user.uuid !== this.currentUser.uuid;
      }
      
      return false;
    },
    
    handleDepartmentFilter() {
      this.$emit('department-filter-changed', this.selectedDepartment);
    },
    
    handleSelectionChange(selection) {
      this.selectedItems = selection;
      this.$emit('selection-changed', selection);
    },
    
    handlePermissionsClick(user) {
      this.$emit('manage-user-permissions', user);
    },
    
    handleDetailsClick(user) {
      this.$emit('view-user-details', user);
    },
    
    async executeBulkRoleChange() {
      if (!this.bulkRoleChange || !this.selectedItems.length) return;
      
      this.bulkOperationLoading = true;
      try {
        await this.$emit('bulk-role-change', {
          users: this.selectedItems,
          newRole: this.bulkRoleChange
        });
        
        this.selectedItems = [];
        this.bulkRoleChange = '';
      } finally {
        this.bulkOperationLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.admin-user-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.admin-user-actions .el-button--mini {
  margin: 0;
}
</style>