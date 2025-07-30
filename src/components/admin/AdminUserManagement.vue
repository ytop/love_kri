<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>User Management</h3>
        <p class="admin-tab-description">Manage system users, their roles, and department assignments.</p>
      </div>
      <div class="admin-header-actions">
        <el-select 
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
          @click="refreshUsers"
          :loading="loading"
        >
          Refresh
        </el-button>
        <el-button 
          type="success" 
          icon="el-icon-plus"
          @click="openAddDialog"
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
      :default-sort="{ prop: 'User_ID', order: 'ascending' }"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55"></el-table-column>
      
      <el-table-column prop="User_ID" label="User ID" sortable width="120">
      </el-table-column>
      
      <el-table-column prop="User_Name" label="Display Name" sortable width="150">
      </el-table-column>
      
      <el-table-column prop="Department" label="Department" sortable width="120">
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
      
      <el-table-column label="Actions" width="240" align="center">
        <template slot-scope="scope">
          <div class="admin-user-actions">
            <el-button 
              size="mini" 
              type="primary" 
              icon="el-icon-edit"
              @click="openRoleEditDialog(scope.row)"
              :disabled="!canManageUser(scope.row)"
            >
              Edit Role
            </el-button>
            <el-button 
              size="mini" 
              type="info" 
              icon="el-icon-view"
              @click="viewUserPermissions(scope.row)"
            >
              Permissions
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- Bulk Actions -->
    <div v-if="selectedItems.length > 0" class="admin-bulk-actions" style="margin-top: 16px;">
      <h4>Bulk Operations</h4>
      <el-form :inline="true">
        <el-form-item label="Selected Users:">
          <span>{{ selectedItems.length }} users selected</span>
        </el-form-item>
        <el-form-item label="New Role:">
          <el-select v-model="bulkNewRole" placeholder="Select role">
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
            :disabled="!selectedItems.length || !bulkNewRole"
            :loading="bulkRoleLoading"
          >
            Apply Role Change
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- Role Edit Dialog -->
    <el-dialog 
      title="Edit User Role" 
      :visible.sync="roleEditDialogVisible"
      width="400px"
      @close="resetRoleEditDialog"
    >
      <div v-if="editingUser" class="admin-dialog-content">
        <div class="admin-user-info">
          <p><strong>User:</strong> {{ editingUser.User_ID }} ({{ editingUser.User_Name }})</p>
          <p><strong>Department:</strong> {{ editingUser.Department }}</p>
          <p><strong>Current Role:</strong> 
            <el-tag :type="getRoleTagType(editingUser.user_role)" size="small">
              {{ getRoleDisplayName(editingUser.user_role) }}
            </el-tag>
          </p>
        </div>
        
        <el-form>
          <el-form-item label="New Role:">
            <el-select v-model="newUserRole" placeholder="Select new role" class="admin-full-width">
              <el-option 
                v-for="role in assignableRoles" 
                :key="role" 
                :label="getRoleDisplayName(role)" 
                :value="role"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <div slot="footer" class="admin-dialog-footer">
        <el-button @click="roleEditDialogVisible = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="confirmRoleChange"
          :disabled="!newUserRole || newUserRole === editingUser.user_role"
          :loading="roleChangeLoading"
        >
          Update Role
        </el-button>
      </div>
    </el-dialog>

    <!-- User Permissions Dialog -->
    <el-dialog 
      title="User Permissions" 
      :visible.sync="userPermissionsDialogVisible"
      width="800px"
    >
      <div v-if="viewingUser" class="admin-dialog-content">
        <div class="admin-user-info">
          <p><strong>User:</strong> {{ viewingUser.User_ID }} ({{ viewingUser.User_Name }})</p>
          <p><strong>Department:</strong> {{ viewingUser.Department }}</p>
        </div>
        
        <el-table 
          :data="userPermissions" 
          v-loading="userPermissionsLoading"
          stripe
          class="admin-full-width"
        >
          <el-table-column prop="kri_id" label="KRI ID" width="80">
          </el-table-column>
          <el-table-column prop="actions" label="Permissions">
            <template slot-scope="scope">
              <el-tag 
                v-for="action in scope.row.actions.split(',')" 
                :key="action" 
                size="mini"
                style="margin-right: 5px;"
              >
                {{ action.trim() }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="effect" label="Status" width="80">
            <template slot-scope="scope">
              <el-tag :type="scope.row.effect ? 'success' : 'danger'" size="small">
                {{ scope.row.effect ? 'Active' : 'Denied' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div slot="footer" class="admin-dialog-footer">
        <el-button @click="userPermissionsDialogVisible = false">Close</el-button>
      </div>
    </el-dialog>

    <!-- Add User Dialog -->
    <add-user-dialog
      :visible.sync="dialogVisible"
      :departments="departments"
      :assignable-roles="assignableRoles"
      @user-created="handleUserCreated"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';
import Permission from '@/utils/permission';
import adminCrudMixin from '@/mixins/adminCrudMixin';
import AddUserDialog from './dialogs/AddUserDialog.vue';

export default {
  name: 'AdminUserManagement',
  components: {
    AddUserDialog
  },
  mixins: [adminCrudMixin],
  
  data() {
    return {
      users: [],
      departments: [],
      selectedDepartment: '',
      
      // Bulk operations
      bulkNewRole: '',
      bulkRoleLoading: false,
      
      // Role edit dialog
      roleEditDialogVisible: false,
      editingUser: null,
      newUserRole: '',
      roleChangeLoading: false,
      
      // User permissions dialog
      userPermissionsDialogVisible: false,
      viewingUser: null,
      userPermissions: [],
      userPermissionsLoading: false
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    entityName() {
      return 'User';
    },
    
    filteredUsers() {
      if (!this.selectedDepartment) {
        return this.users;
      }
      return this.users.filter(user => user.Department === this.selectedDepartment);
    },
    
    assignableRoles() {
      return Permission.getAssignableRoles(this.currentUser);
    }
  },
  
  async mounted() {
    await this.loadData();
    await this.loadDepartments();
  },
  
  methods: {
    // ================================
    // Implement abstract methods from adminCrudMixin
    // ================================
    
    getDefaultItem() {
      return {
        user_id: '',
        user_name: '',
        department: '',
        user_role: 'user',
        other_info: ''
      };
    },
    
    async loadData() {
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
    
    async createItem(item) {
      return await kriService.createUser(item, this.currentUser.User_ID);
    },
    
    async updateItem(item) {
      return await kriService.updateUserRole(
        item.UUID, 
        item.user_role, 
        this.currentUser.User_ID
      );
    },
    
    async deleteItem(_item) {
      // Implement user deletion if needed
      throw new Error('User deletion not implemented');
    },
    
    // ================================
    // Component-specific methods
    // ================================
    
    async loadDepartments() {
      try {
        this.departments = await kriService.getAllDepartments();
      } catch (error) {
        console.error('Error loading departments:', error);
        this.$message.error('Failed to load departments');
      }
    },
    
    handleDepartmentFilter() {
      // Filter is handled by computed property
    },
    
    async refreshUsers() {
      await this.refreshData();
      this.$message.success('User data refreshed');
    },
    
    canManageUser(user) {
      return Permission.canManageUser(this.currentUser, user);
    },
    
    openRoleEditDialog(user) {
      this.editingUser = user;
      this.newUserRole = user.user_role;
      this.roleEditDialogVisible = true;
    },
    
    resetRoleEditDialog() {
      this.editingUser = null;
      this.newUserRole = '';
      this.roleChangeLoading = false;
    },
    
    async confirmRoleChange() {
      if (!this.editingUser || !this.newUserRole) return;
      
      this.roleChangeLoading = true;
      try {
        await kriService.updateUserRole(
          this.editingUser.UUID, 
          this.newUserRole, 
          this.currentUser.User_ID
        );
        
        // Update local data
        const userIndex = this.users.findIndex(u => u.UUID === this.editingUser.UUID);
        if (userIndex !== -1) {
          this.users[userIndex].user_role = this.newUserRole;
        }
        
        this.$message.success(`Role updated successfully for ${this.editingUser.User_ID}`);
        this.roleEditDialogVisible = false;
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error updating user role:', error);
        this.$message.error('Failed to update user role');
      } finally {
        this.roleChangeLoading = false;
      }
    },
    
    async viewUserPermissions(user) {
      this.viewingUser = user;
      this.userPermissionsLoading = true;
      this.userPermissionsDialogVisible = true;
      
      try {
        this.userPermissions = await kriService.getUserPermissionsSummary(user.UUID);
      } catch (error) {
        console.error('Error loading user permissions:', error);
        this.$message.error('Failed to load user permissions');
      } finally {
        this.userPermissionsLoading = false;
      }
    },
    
    async executeBulkRoleChange() {
      if (!this.selectedItems.length || !this.bulkNewRole) return;
      
      this.bulkRoleLoading = true;
      try {
        for (const user of this.selectedItems) {
          await kriService.updateUserRole(user.UUID, this.bulkNewRole, this.currentUser.User_ID);
          
          // Update local data
          const userIndex = this.users.findIndex(u => u.UUID === user.UUID);
          if (userIndex !== -1) {
            this.users[userIndex].user_role = this.bulkNewRole;
          }
        }
        
        this.$message.success(`Bulk role change completed for ${this.selectedItems.length} users`);
        this.selectedItems = [];
        this.bulkNewRole = '';
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error executing bulk role change:', error);
        this.$message.error('Failed to execute bulk role change');
      } finally {
        this.bulkRoleLoading = false;
      }
    },
    
    handleUserCreated(newUser) {
      this.users.push(newUser);
      this.$emit('data-updated');
    },
    
    // Utility methods
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
/* Component-specific styles if needed */
/* Most styles are in admin.css */
</style>