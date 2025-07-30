<template>
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
            :loading="loading"
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
          @click="refreshData"
          :loading="loading"
          size="small"
        >
          Refresh
        </el-button>
      </div>
      
      <el-table 
        :data="paginatedUsers" 
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
        
        <el-table-column prop="department" label="department" sortable width="120">
        </el-table-column>
        
        <el-table-column prop="user_role" label="Current Role" sortable width="140">
          <template slot-scope="scope">
            <el-tag 
              :type="getRoleTagType(scope.row.user_role)"
              size="small"
            >
              {{ getRoleDisplayName(scope.row.user_role) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="Role Capabilities" min-width="200">
          <template slot-scope="scope">
            <div class="role-capabilities">
              <span v-for="capability in getRoleCapabilities(scope.row.user_role)" 
                    :key="capability" 
                    class="capability-tag">
                {{ capability }}
              </span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="Actions" width="120">
          <template slot-scope="scope">
            <el-button 
              size="mini" 
              type="primary" 
              icon="el-icon-edit"
              @click="openRoleChangeDialog(scope.row)"
              :disabled="!canManageUser(scope.row)"
            >
              Change Role
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- Pagination -->
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="currentPage"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="users.length"
        style="margin-top: 20px; text-align: right;">
      </el-pagination>
    </el-card>

    <!-- Role Change Dialog -->
    <el-dialog 
      title="Change User Role" 
      :visible.sync="roleChangeDialogVisible"
      width="450px"
      @close="resetRoleChangeDialog"
    >
      <div v-if="selectedUser" class="admin-dialog-content">
        <div class="admin-user-info">
          <p><strong>User:</strong> {{ selectedUser.user_id }} ({{ selectedUser.user_name }})</p>
          <p><strong>Department:</strong> {{ selectedUser.department }}</p>
          <p><strong>Current Role:</strong> 
            <el-tag :type="getRoleTagType(selectedUser.user_role)" size="small">
              {{ getRoleDisplayName(selectedUser.user_role) }}
            </el-tag>
          </p>
        </div>
        
        <el-form>
          <el-form-item label="New Role:">
            <el-select v-model="selectedNewRole" placeholder="Select new role" class="admin-full-width">
              <el-option 
                v-for="role in assignableRoles" 
                :key="role" 
                :label="getRoleDisplayName(role)" 
                :value="role"
              >
                <span>{{ getRoleDisplayName(role) }}</span>
                <span style="float: right; color: #8492a6; font-size: 13px">
                  {{ getRoleDescription(role) }}
                </span>
              </el-option>
            </el-select>
          </el-form-item>
          
          <div v-if="selectedNewRole && selectedNewRole !== selectedUser.user_role" class="role-change-preview">
            <h4>Role Change Preview:</h4>
            <p><strong>From:</strong> {{ getRoleDisplayName(selectedUser.user_role) }}</p>
            <p><strong>To:</strong> {{ getRoleDisplayName(selectedNewRole) }}</p>
            <p><strong>New Capabilities:</strong></p>
            <ul>
              <li v-for="capability in getRoleCapabilities(selectedNewRole)" :key="capability">
                {{ capability }}
              </li>
            </ul>
          </div>
        </el-form>
      </div>
      
      <div slot="footer" class="admin-dialog-footer">
        <el-button @click="roleChangeDialogVisible = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="confirmSingleRoleChange"
          :disabled="!selectedNewRole || selectedNewRole === selectedUser?.user_role"
          :loading="roleChangeLoading"
        >
          Change Role
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';
import Permission from '@/utils/permission';
import adminCrudMixin from '@/mixins/adminCrudMixin';

export default {
  name: 'AdminRoleManagement',
  mixins: [adminCrudMixin],
  
  data() {
    return {
      users: [],
      selectedUsers: [],
      newRole: '',
      
      // Single role change dialog
      roleChangeDialogVisible: false,
      selectedUser: null,
      selectedNewRole: '',
      roleChangeLoading: false
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    entityName() {
      return 'Role';
    },
    
    roleCounts() {
      return this.users.reduce((acc, user) => {
        const role = user.user_role || 'user';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});
    },
    
    assignableRoles() {
      return Permission.getAssignableRoles(this.currentUser);
    },
    
    paginatedUsers() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.users.slice(start, end);
    }
  },
  
  async mounted() {
    await this.loadData();
  },
  
  methods: {
    // ================================
    // Implement abstract methods from adminCrudMixin
    // ================================
    
    getDefaultItem() {
      return {
        user_role: 'user'
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
    
    async createItem() {
      // Role creation is handled through user management
      throw new Error('Role creation not supported');
    },
    
    async updateItem(item) {
      return await kriService.updateUserRole(
        item.uuid, 
        item.user_role, 
        this.currentUser.user_id
      );
    },
    
    async deleteItem() {
      // Role deletion is handled through user management
      throw new Error('Role deletion not supported');
    },
    
    // ================================
    // Component-specific methods
    // ================================
    
    canManageUser(user) {
      return Permission.canManageUser(this.currentUser, user);
    },
    
    openRoleChangeDialog(user) {
      this.selectedUser = user;
      this.selectedNewRole = user.user_role;
      this.roleChangeDialogVisible = true;
    },
    
    resetRoleChangeDialog() {
      this.selectedUser = null;
      this.selectedNewRole = '';
      this.roleChangeLoading = false;
    },
    
    async confirmSingleRoleChange() {
      if (!this.selectedUser || !this.selectedNewRole) return;
      
      this.roleChangeLoading = true;
      try {
        await kriService.updateUserRole(
          this.selectedUser.uuid, 
          this.selectedNewRole, 
          this.currentUser.user_id
        );
        
        // Update local data
        const userIndex = this.users.findIndex(u => u.uuid === this.selectedUser.uuid);
        if (userIndex !== -1) {
          this.users[userIndex].user_role = this.selectedNewRole;
        }
        
        this.$message.success(`Role updated successfully for ${this.selectedUser.user_id}`);
        this.roleChangeDialogVisible = false;
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error updating user role:', error);
        this.$message.error('Failed to update user role');
      } finally {
        this.roleChangeLoading = false;
      }
    },
    
    async executeBulkRoleChange() {
      if (!this.selectedUsers.length || !this.newRole) return;
      
      this.loading = true;
      try {
        for (const userUuid of this.selectedUsers) {
          await kriService.updateUserRole(userUuid, this.newRole, this.currentUser.user_id);
          
          // Update local data
          const userIndex = this.users.findIndex(u => u.uuid === userUuid);
          if (userIndex !== -1) {
            this.users[userIndex].user_role = this.newRole;
          }
        }
        
        this.$message.success(`Bulk role change completed for ${this.selectedUsers.length} users`);
        this.selectedUsers = [];
        this.newRole = '';
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error executing bulk role change:', error);
        this.$message.error('Failed to execute bulk role change');
      } finally {
        this.loading = false;
      }
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
    },
    
    getRoleDescription(role) {
      switch (role) {
      case 'admin': return 'Full system access and user management';
      case 'dept_admin': return 'Department-level administration';
      case 'user': return 'Standard user with limited permissions';
      default: return 'Standard user permissions';
      }
    },
    
    getRoleCapabilities(role) {
      switch (role) {
      case 'admin':
        return ['Manage all users', 'System configuration', 'View all departments', 'Manage permissions'];
      case 'dept_admin':
        return ['Manage department users', 'Department KRI oversight', 'Assign permissions'];
      case 'user':
        return ['View assigned KRIs', 'Input data', 'Submit reports'];
      default:
        return ['Basic user access'];
      }
    },
    
    handleSizeChange(size) {
      this.pageSize = size;
      this.currentPage = 1;
    },
    
    handleCurrentChange(page) {
      this.currentPage = page;
    }
  }
};
</script>

<style scoped>
.role-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.capability-tag {
  display: inline-block;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  margin-right: 4px;
  margin-bottom: 2px;
}

.role-change-preview {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.role-change-preview h4 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-size: var(--font-size-base);
}

.role-change-preview ul {
  margin: var(--spacing-xs) 0 0 0;
  padding-left: var(--spacing-lg);
}

.role-change-preview li {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}
</style>