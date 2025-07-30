<template>
  <div>
    <admin-base-user-management
      :users="users"
      :departments="departments"
      :loading="loading"
      :show-permission-summary="false"
      @refresh-users="refreshUsers"
      @add-user="openAddDialog"
      @edit-user-role="openRoleEditDialog"
      @manage-user-permissions="viewUserPermissions"
      @department-filter-changed="handleDepartmentFilter"
      @selection-changed="handleSelectionChange"
      @bulk-role-change="handleBulkRoleChange"
    />

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
      @user-added="handleUserAdded"
    />
  </div>
</template>

<script>
import AdminBaseUserManagement from '@/components/admin/shared/AdminBaseUserManagement.vue';
import AddUserDialog from '@/components/admin/dialogs/AddUserDialog.vue';
import adminHelpersMixin from '@/mixins/adminHelpersMixin';
import adminCrudMixin from '@/mixins/adminCrudMixin';
import { mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';

export default {
  name: 'AdminUserManagement',
  
  components: {
    AdminBaseUserManagement,
    AddUserDialog
  },
  
  mixins: [adminHelpersMixin, adminCrudMixin],
  
  data() {
    return {
      users: [],
      departments: [],
      loading: false,
      selectedDepartment: '',
      
      // Role editing
      roleEditDialogVisible: false,
      editingUser: null,
      roleEditForm: {
        newRole: '',
        reason: ''
      },
      roleChangeLoading: false,
      
      // Add user
      addDialogVisible: false
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
    }
  },
  
  async mounted() {
    await this.loadUsers();
    await this.loadDepartments();
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
        const users = await kriService.getAllUsers();
        this.departments = [...new Set(users.map(user => user.department).filter(Boolean))];
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    },
    
    async refreshUsers() {
      await this.loadUsers();
      this.$emit('data-updated');
    },
    
    handleDepartmentFilter(department) {
      this.selectedDepartment = department;
    },
    
    handleSelectionChange(_selection) {
      // Handle selection change if needed
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
    
    openAddDialog() {
      this.addDialogVisible = true;
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
      
      // Only system admins can assign admin roles
      if (this.currentUser.user_role === 'admin') {
        roles.push('dept_admin', 'admin');
      }
      
      // Filter out current role
      return roles.filter(role => role !== user.user_role);
    },
    
    async confirmRoleChange() {
      if (!this.roleEditForm.newRole) return;
      
      this.roleChangeLoading = true;
      try {
        await kriService.updateUserRole(
          this.editingUser.uuid,
          this.roleEditForm.newRole,
          this.roleEditForm.reason,
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
    
    viewUserPermissions(user) {
      // Navigate to user's permission view or open permission dialog
      this.$router.push({
        name: 'admin',
        params: { tab: 'permissions' },
        query: { user: user.uuid }
      });
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
</style>