<template>
  <div>
    <!-- Main User Management with Tabs -->
    <el-tabs v-model="activeSubTab" type="card" class="admin-sub-tabs">
      <!-- Users Tab -->
      <el-tab-pane label="Users" name="users">
        <admin-base-user-management
          :users="users"
          :departments="departments"
          :loading="loading"
          :show-permission-summary="false"
          :show-view-details="true"
          :selected-reporting-date="selectedReportingDate"
          @refresh-users="refreshUsers"
          @add-user="openAddDialog"
          @edit-user-role="openRoleEditDialog"
          @manage-user-permissions="handleManageUserPermissions"
          @view-user-details="handleViewUserDetails"
          @department-filter-changed="handleDepartmentFilter"
          @selection-changed="handleSelectionChange"
          @bulk-role-change="handleBulkRoleChange"
        />
      </el-tab-pane>

      <!-- Roles Tab -->
      <el-tab-pane label="Roles" name="roles">
        <div class="admin-section">
          <div class="admin-content-header">
            <div>
              <h3>Role Management</h3>
              <p class="admin-tab-description">Manage user roles and their capabilities across the system.</p>
            </div>
          </div>

          <div class="admin-role-summary">
            <el-row :gutter="20">
              <el-col :span="8" v-for="(count, role) in roleCounts" :key="role">
                <el-card class="admin-role-card">
                  <div class="admin-role-info">
                    <div class="admin-role-name">
                      <el-tag :type="getRoleTagType(role)" size="medium">
                        {{ getRoleDisplayName(role) }}
                      </el-tag>
                    </div>
                    <div class="admin-role-count">{{ count }} users</div>
                    <div class="admin-role-description">{{ getRoleDescription(role) }}</div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <div class="admin-bulk-actions">
            <h4>Bulk Role Operations</h4>
            <el-form :inline="true">
              <el-form-item label="Select Users:">
                <el-select 
                  v-model="selectedUsers" 
                  multiple 
                  placeholder="Choose users"
                  class="admin-filter-select wide"
                >
                  <el-option 
                    v-for="user in users" 
                    :key="user.uuid" 
                    :label="`${user.user_id} (${user.department})`" 
                    :value="user.uuid"
                    :disabled="!canManageUser(user)"
                  ></el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item label="New Role:">
                <el-select v-model="newRole" placeholder="Select role" class="admin-filter-select">
                  <el-option 
                    v-for="role in assignableRoles" 
                    :key="role" 
                    :label="getRoleDisplayName(role)" 
                    :value="role"
                  ></el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item>
                <el-button 
                  type="warning" 
                  @click="executeBulkRoleChange"
                  :disabled="!selectedUsers.length || !newRole"
                  :loading="roleLoading"
                >
                  Apply Role Change
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- Role Details Table -->
          <el-card style="margin-top: 20px;">
            <div slot="header" class="admin-flex-between">
              <span>User Role Details</span>
              <el-button 
                type="primary" 
                icon="el-icon-refresh"
                @click="refreshUsers"
                :loading="loading"
                size="small"
              >
                Refresh
              </el-button>
            </div>
            
            <el-table 
              :data="users" 
              v-loading="loading"
              stripe
              border
              class="admin-full-width"
              :default-sort="{ prop: 'user_role', order: 'ascending' }"
            >
              <el-table-column prop="user_id" label="User ID" sortable width="120">
              </el-table-column>
              
              <el-table-column prop="user_name" label="Display Name" sortable width="150">
              </el-table-column>
              
              <el-table-column prop="department" label="Department" sortable width="120">
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
              
              <el-table-column label="Actions" width="200" align="center">
                <template slot-scope="scope">
                  <el-button 
                    size="mini" 
                    type="primary" 
                    icon="el-icon-edit"
                    @click="openRoleEditDialog(scope.row)"
                    :disabled="!canManageUser(scope.row)"
                  >
                    Edit Role
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- Permissions Tab -->
      <el-tab-pane label="Permissions" name="permissions">
        <div class="admin-section">
          <div class="admin-content-header">
            <div>
              <h3>Permission Management</h3>
              <p class="admin-tab-description">Manage user permissions across all KRIs in the system.</p>
            </div>
            <div class="admin-header-actions">
              <el-button 
                type="primary" 
                icon="el-icon-refresh" 
                @click="loadPermissionData"
                :loading="permissionLoading"
              >
                Refresh
              </el-button>
              <el-button 
                type="success" 
                icon="el-icon-plus"
                @click="openAddPermissionDialog"
              >
                Add Permission
              </el-button>
            </div>
          </div>

          <!-- Permission Filters -->
          <el-card style="margin-bottom: 20px;">
            <el-form :inline="true">
              <el-form-item label="Department:">
                <el-select 
                  v-model="permissionFilters.department" 
                  placeholder="Filter by Department" 
                  clearable
                  @change="handlePermissionFilterChange"
                  class="admin-filter-select"
                >
                  <el-option 
                    v-for="dept in departments" 
                    :key="dept" 
                    :label="dept" 
                    :value="dept"
                  ></el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item label="User:">
                <el-select 
                  v-model="permissionFilters.user" 
                  placeholder="Filter by User" 
                  clearable
                  @change="handlePermissionFilterChange"
                  class="admin-filter-select"
                >
                  <el-option 
                    v-for="user in users" 
                    :key="user.uuid" 
                    :label="`${user.user_id} (${user.user_name})`" 
                    :value="user.uuid"
                  ></el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item label="KRI:">
                <el-select 
                  v-model="permissionFilters.kri" 
                  placeholder="Filter by KRI" 
                  clearable
                  @change="handlePermissionFilterChange"
                  class="admin-filter-select"
                >
                  <el-option 
                    v-for="kri in availableKRIs" 
                    :key="kri.kri_code" 
                    :label="`${kri.kri_code} - ${kri.name}`" 
                    :value="kri.kri_code"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- Permission Table -->
          <el-card>
            <div slot="header" class="admin-flex-between">
              <span>User Permissions</span>
              <div>
                <el-button 
                  v-if="selectedPermissions.length > 0"
                  type="danger" 
                  size="small"
                  @click="handleBulkDeletePermissions"
                  :loading="deleteLoading"
                >
                  Delete Selected ({{ selectedPermissions.length }})
                </el-button>
              </div>
            </div>
            
            <el-table 
              :data="filteredPermissionData" 
              v-loading="permissionLoading"
              @selection-change="handlePermissionSelectionChange"
              stripe
              border
              class="admin-full-width"
            >
              <el-table-column type="selection" width="55" align="center"></el-table-column>
              
              <el-table-column prop="user_name" label="User Name" min-width="120" sortable>
                <template slot-scope="scope">
                  <div class="user-info">
                    <div class="user-name">{{ scope.row.user_name || scope.row.user_id }}</div>
                    <div class="user-id">{{ scope.row.user_id }}</div>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="department" label="Department" min-width="120" sortable>
              </el-table-column>
              
              <el-table-column prop="kri_id" label="KRI ID" min-width="100" sortable>
              </el-table-column>
              
              <el-table-column prop="actions" label="Permissions" min-width="200">
                <template slot-scope="scope">
                  <div class="permission-actions">
                    <el-tag
                      v-for="action in scope.row.permissionActions"
                      :key="action"
                      :type="getPermissionTagType(action)"
                      size="small"
                      class="permission-tag"
                    >
                      {{ formatPermissionAction(action) }}
                    </el-tag>
                    <span v-if="!scope.row.permissionActions.length" class="no-permissions">
                      No permissions
                    </span>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="effect" label="Status" width="100" align="center">
                <template slot-scope="scope">
                  <el-tag
                    :type="scope.row.effect ? 'success' : 'danger'"
                    size="small"
                  >
                    {{ scope.row.effect ? 'Active' : 'Inactive' }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column label="Actions" width="150" align="center">
                <template slot-scope="scope">
                  <el-button 
                    size="mini" 
                    type="danger" 
                    icon="el-icon-delete"
                    @click="deletePermission(scope.row)"
                  >
                    Delete
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Role Edit Dialog -->
    <el-dialog 
      title="Edit User Role" 
      :visible.sync="roleEditDialogVisible"
      width="400px"
      @close="resetRoleEditDialog"
    >
      <div v-if="editingUser" class="admin-dialog-content">
        <div class="admin-user-info">
          <p><strong>User:</strong> {{ editingUser.user_id }} ({{ editingUser.user_name }})</p>
          <p><strong>Department:</strong> {{ editingUser.department }}</p>
          <p><strong>Current Role:</strong> 
            <el-tag :type="getRoleTagType(editingUser.user_role)" size="small">
              {{ getRoleDisplayName(editingUser.user_role) }}
            </el-tag>
          </p>
        </div>
        
        <el-form :model="roleEditForm" label-width="120px" style="margin-top: 20px;">
          <el-form-item label="New Role:">
            <el-select v-model="roleEditForm.newRole" placeholder="Select new role">
              <el-option 
                v-for="role in getAssignableRoles(editingUser)" 
                :key="role" 
                :label="getRoleDisplayName(role)" 
                :value="role"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="Reason:">
            <el-input 
              v-model="roleEditForm.reason" 
              type="textarea" 
              placeholder="Optional reason for role change"
              :rows="3"
            ></el-input>
          </el-form-item>
        </el-form>
      </div>
      
      <div slot="footer" class="dialog-footer">
        <el-button @click="resetRoleEditDialog">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="confirmRoleChange"
          :disabled="!roleEditForm.newRole"
          :loading="roleChangeLoading"
        >
          Update Role
        </el-button>
      </div>
    </el-dialog>

    <!-- Add User Dialog -->
    <add-user-dialog 
      :visible.sync="addDialogVisible"
      :departments="departments"
      :assignable-roles="assignableRoles"
      @user-created="handleUserAdded"
    />

    <!-- Add Permission Dialog -->
    <add-permission-dialog
      :visible.sync="addPermissionDialogVisible"
      :available-users="users"
      :available-k-r-is="availableKRIs"
      :departments="departments"
      :selected-reporting-date="selectedReportingDate"
      @permission-added="handlePermissionAdded"
    />
  </div>
</template>

<script>
import AdminBaseUserManagement from '@/components/admin/shared/AdminBaseUserManagement.vue';
import AddUserDialog from '@/components/admin/dialogs/AddUserDialog.vue';
import AddPermissionDialog from '@/components/admin/dialogs/AddPermissionDialog.vue';
import adminHelpersMixin from '@/mixins/adminHelpersMixin';
import adminCrudMixin from '@/mixins/adminCrudMixin';
import { mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';

export default {
  name: 'AdminUserManagement',
  
  components: {
    AdminBaseUserManagement,
    AddUserDialog,
    AddPermissionDialog
  },
  
  mixins: [adminHelpersMixin, adminCrudMixin],
  
  props: {
    selectedReportingDate: {
      type: Number,
      default: null
    }
  },
  
  data() {
    return {
      activeSubTab: 'users',
      users: [],
      departments: [],
      availableKRIs: [],
      permissionData: [],
      selectedPermissions: [],
      loading: false,
      roleLoading: false,
      permissionLoading: false,
      deleteLoading: false,
      selectedDepartment: '',
      
      // Role management
      selectedUsers: [],
      newRole: '',
      roleEditDialogVisible: false,
      editingUser: null,
      roleEditForm: {
        newRole: '',
        reason: ''
      },
      roleChangeLoading: false,
      
      // Permission management
      permissionFilters: {
        department: '',
        user: '',
        kri: ''
      },
      
      // Dialogs
      addDialogVisible: false,
      addPermissionDialogVisible: false
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    roleCounts() {
      const counts = {};
      this.users.forEach(user => {
        const role = user.user_role || 'user';
        counts[role] = (counts[role] || 0) + 1;
      });
      return counts;
    },
    
    assignableRoles() {
      const roles = ['user'];
      if (this.currentUser.user_role === 'admin') {
        roles.push('dept_admin', 'admin');
      }
      return roles;
    },
    
    filteredPermissionData() {
      let filtered = this.permissionData;
      
      if (this.permissionFilters.department) {
        filtered = filtered.filter(p => p.department === this.permissionFilters.department);
      }
      
      if (this.permissionFilters.user) {
        filtered = filtered.filter(p => p.user_uuid === this.permissionFilters.user);
      }
      
      if (this.permissionFilters.kri) {
        filtered = filtered.filter(p => p.kri_id === this.permissionFilters.kri);
      }
      
      return filtered;
    }
  },
  
  async mounted() {
    await this.loadUsers();
    await this.loadDepartments();
    await this.loadKRIs();
    await this.loadPermissionData();
  },
  
  methods: {
    async loadUsers() {
      this.loading = true;
      try {
        this.users = await kriService.getAllUsers();
      } catch (error) {
        console.error('Error loading users:', error);
        this.$message.error('Failed to load users');
      } finally {
        this.loading = false;
      }
    },
    
    async loadDepartments() {
      try {
        this.departments = [...new Set(this.users.map(user => user.department).filter(Boolean))];
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    },
    
    async loadKRIs() {
      try {
        this.availableKRIs = await kriService.getAllKRIMetadata();
      } catch (error) {
        console.error('Error loading KRIs:', error);
        this.$message.error('Failed to load KRIs');
      }
    },
    
    async loadPermissionData() {
      this.permissionLoading = true;
      try {
        const reportingDate = this.getCurrentReportingDate();
        const permissions = await kriService.getUserPermissionsSummary(null, { reporting_date: reportingDate });
        this.permissionData = permissions.map(p => ({
          ...p,
          permissionActions: p.actions ? p.actions.split(',').map(a => a.trim()) : []
        }));
      } catch (error) {
        console.error('Error loading permissions:', error);
        this.$message.error('Failed to load permissions');
      } finally {
        this.permissionLoading = false;
      }
    },
    
    async refreshUsers() {
      await this.loadUsers();
      await this.loadDepartments();
      this.$emit('data-updated');
    },
    
    handleDepartmentFilter(department) {
      this.selectedDepartment = department;
    },
    
    handleSelectionChange(_selection) {
      // Handle selection change if needed
    },
    
    handlePermissionSelectionChange(selection) {
      this.selectedPermissions = selection;
    },
    
    handlePermissionFilterChange() {
      // Filtering is handled by computed property
    },
    
    async handleBulkRoleChange(data) {
      try {
        const { users, newRole } = data;
        const userIds = users.map(user => user.uuid);
        
        await kriService.bulkUpdateUserRoles(userIds, newRole, this.currentUser.user_id);
        
        this.$message.success(`Updated role for ${users.length} users`);
        await this.refreshUsers();
      } catch (error) {
        console.error('Error updating user roles:', error);
        this.$message.error('Failed to update user roles');
      }
    },
    
    async executeBulkRoleChange() {
      if (!this.selectedUsers.length || !this.newRole) return;
      
      this.roleLoading = true;
      try {
        await kriService.bulkUpdateUserRoles(this.selectedUsers, this.newRole, this.currentUser.user_id);
        
        this.$message.success(`Updated role for ${this.selectedUsers.length} users`);
        this.selectedUsers = [];
        this.newRole = '';
        await this.refreshUsers();
      } catch (error) {
        console.error('Error updating user roles:', error);
        this.$message.error('Failed to update user roles');
      } finally {
        this.roleLoading = false;
      }
    },
    
    openAddDialog() {
      this.addDialogVisible = true;
    },
    
    openAddPermissionDialog() {
      this.addPermissionDialogVisible = true;
    },
    
    openRoleEditDialog(user) {
      this.editingUser = user;
      this.roleEditForm = {
        newRole: '',
        reason: ''
      };
      this.roleEditDialogVisible = true;
    },
    
    resetRoleEditDialog() {
      this.roleEditDialogVisible = false;
      this.editingUser = null;
      this.roleEditForm = {
        newRole: '',
        reason: ''
      };
    },
    
    getAssignableRoles(user) {
      const roles = ['user'];
      
      if (this.currentUser.user_role === 'admin') {
        roles.push('dept_admin', 'admin');
      }
      
      return roles.filter(role => role !== user.user_role);
    },
    
    async confirmRoleChange() {
      if (!this.roleEditForm.newRole) return;
      
      this.roleChangeLoading = true;
      try {
        await kriService.updateUserRole(
          this.editingUser.uuid,
          this.roleEditForm.newRole,
          this.currentUser.user_id
        );
        
        this.$message.success('User role updated successfully');
        this.resetRoleEditDialog();
        await this.refreshUsers();
      } catch (error) {
        console.error('Error updating user role:', error);
        this.$message.error('Failed to update user role');
      } finally {
        this.roleChangeLoading = false;
      }
    },
    
    handleManageUserPermissions(user) {
      this.$emit('manage-user-permissions', user);
    },
    
    handleViewUserDetails(user) {
      this.$emit('view-user-details', user);
    },
    
    async handlePermissionAdded() {
      this.addPermissionDialogVisible = false;
      await this.loadPermissionData();
      this.$emit('data-updated');
    },
    
    async deletePermission(permission) {
      try {
        await kriService.bulkDeletePermissions([permission], this.currentUser.user_id);
        this.$message.success('Permission deleted successfully');
        await this.loadPermissionData();
      } catch (error) {
        console.error('Error deleting permission:', error);
        this.$message.error('Failed to delete permission');
      }
    },
    
    async handleBulkDeletePermissions() {
      if (!this.selectedPermissions.length) return;
      
      this.deleteLoading = true;
      try {
        await kriService.bulkDeletePermissions(this.selectedPermissions, this.currentUser.user_id);
        
        this.$message.success(`Deleted ${this.selectedPermissions.length} permissions`);
        this.selectedPermissions = [];
        await this.loadPermissionData();
      } catch (error) {
        console.error('Error deleting permissions:', error);
        this.$message.error('Failed to delete permissions');
      } finally {
        this.deleteLoading = false;
      }
    },
    
    getPermissionTagType(action) {
      const types = {
        view: 'info',
        edit: 'warning',
        review: 'success',
        acknowledge: 'danger'
      };
      return types[action] || 'info';
    },
    
    formatPermissionAction(action) {
      return action.charAt(0).toUpperCase() + action.slice(1);
    },
    
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
    
    getRoleDescription(role) {
      const descriptions = {
        admin: 'Full system access and control',
        dept_admin: 'Department-level administration',
        user: 'Standard user access'
      };
      return descriptions[role] || 'Standard user access';
    },
    
    async handleUserAdded() {
      this.addDialogVisible = false;
      await this.refreshUsers();
      this.$emit('data-updated');
    }
  }
};
</script>

<style scoped>
.admin-sub-tabs {
  margin-bottom: 20px;
}

.admin-role-summary {
  margin-bottom: 30px;
}

.admin-role-card {
  text-align: center;
  padding: 20px;
}

.admin-role-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.admin-role-name {
  margin-bottom: 10px;
}

.admin-role-count {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
}

.admin-role-description {
  font-size: 14px;
  color: #606266;
}

.admin-bulk-actions {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.admin-bulk-actions h4 {
  margin-top: 0;
  margin-bottom: 15px;
}

.admin-user-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.admin-user-info p {
  margin: 5px 0;
  color: #606266;
}

.dialog-footer {
  text-align: right;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: bold;
  color: #303133;
}

.user-id {
  font-size: 12px;
  color: #909399;
}

.permission-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.permission-tag {
  margin-right: 4px;
}

.no-permissions {
  color: #909399;
  font-style: italic;
}

.admin-filter-select.wide {
  width: 300px;
}
</style>