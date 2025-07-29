<template>
  <div class="admin-management">
    <div class="admin-header">
      <h1 class="admin-title">
        <i class="el-icon-setting"></i>
        System Administration
      </h1>
      <div class="admin-breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">Dashboard</el-breadcrumb-item>
          <el-breadcrumb-item>Administration</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
    </div>

    <el-card class="admin-container">
      <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
        <!-- User Management Tab -->
        <el-tab-pane label="User Management" name="users">
          <div class="tab-content">
            <div class="content-header">
              <h3>User Management</h3>
              <div class="header-actions">
                <el-select 
                  v-model="selectedDepartment" 
                  placeholder="Filter by Department" 
                  clearable
                  @change="handleDepartmentFilter"
                  style="width: 200px; margin-right: 10px;"
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
                  :loading="usersLoading"
                >
                  Refresh
                </el-button>
              </div>
            </div>

            <el-table 
              :data="filteredUsers" 
              v-loading="usersLoading"
              stripe
              border
              style="width: 100%"
              :default-sort="{ prop: 'User_ID', order: 'ascending' }"
            >
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
              
              <el-table-column label="Actions" width="200">
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
                  <el-button 
                    size="mini" 
                    type="info" 
                    icon="el-icon-view"
                    @click="viewUserPermissions(scope.row)"
                  >
                    Permissions
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- Role Management Tab -->
        <el-tab-pane label="Role Management" name="roles">
          <div class="tab-content">
            <div class="content-header">
              <h3>Role Management</h3>
              <p class="tab-description">Manage user roles and their capabilities across the system.</p>
            </div>

            <div class="role-summary">
              <el-row :gutter="20">
                <el-col :span="8" v-for="(count, role) in roleCounts" :key="role">
                  <el-card class="role-card">
                    <div class="role-info">
                      <div class="role-name">
                        <el-tag :type="getRoleTagType(role)" size="medium">
                          {{ getRoleDisplayName(role) }}
                        </el-tag>
                      </div>
                      <div class="role-count">{{ count }} users</div>
                      <div class="role-description">{{ getRoleDescription(role) }}</div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>

            <div class="bulk-role-actions">
              <h4>Bulk Role Operations</h4>
              <el-form :inline="true">
                <el-form-item label="Select Users:">
                  <el-select 
                    v-model="bulkSelectedUsers" 
                    multiple 
                    placeholder="Choose users"
                    style="width: 300px;"
                  >
                    <el-option 
                      v-for="user in users" 
                      :key="user.UUID" 
                      :label="`${user.User_ID} (${user.Department})`" 
                      :value="user.UUID"
                      :disabled="!canManageUser(user)"
                    ></el-option>
                  </el-select>
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
                    :disabled="!bulkSelectedUsers.length || !bulkNewRole"
                    :loading="bulkRoleLoading"
                  >
                    Apply Role Change
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>
        </el-tab-pane>

        <!-- Department Administration Tab -->
        <el-tab-pane label="Department Admin" name="departments">
          <div class="tab-content">
            <div class="content-header">
              <h3>Department Administration</h3>
              <p class="tab-description">Manage department administrators and oversee department operations.</p>
            </div>

            <div class="department-overview">
              <el-row :gutter="20">
                <el-col :span="6" v-for="dept in departmentStats" :key="dept.name">
                  <el-card class="dept-card">
                    <div class="dept-info">
                      <h4>{{ dept.name }}</h4>
                      <div class="dept-metrics">
                        <div class="metric">
                          <span class="metric-label">Users:</span>
                          <span class="metric-value">{{ dept.userCount }}</span>
                        </div>
                        <div class="metric">
                          <span class="metric-label">KRIs:</span>
                          <span class="metric-value">{{ dept.kriCount }}</span>
                        </div>
                        <div class="metric">
                          <span class="metric-label">Admins:</span>
                          <span class="metric-value">{{ dept.adminCount }}</span>
                        </div>
                      </div>
                      <el-button 
                        size="small" 
                        type="primary" 
                        @click="viewDepartmentDetails(dept.name)"
                        style="margin-top: 10px;"
                      >
                        Manage
                      </el-button>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-tab-pane>

        <!-- Permission Management Tab -->
        <el-tab-pane label="Permissions" name="permissions">
          <div class="tab-content">
            <div class="content-header">
              <h3>Permission Management</h3>
              <p class="tab-description">Manage user permissions across KRIs and system functions.</p>
            </div>

            <div class="permission-filters">
              <el-form :inline="true">
                <el-form-item label="Department:">
                  <el-select 
                    v-model="permissionDeptFilter" 
                    placeholder="All Departments"
                    clearable
                    @change="loadPermissionData"
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
                    v-model="permissionUserFilter" 
                    placeholder="All Users"
                    clearable
                    filterable
                    @change="loadPermissionData"
                  >
                    <el-option 
                      v-for="user in filteredUsersForPermissions" 
                      :key="user.UUID" 
                      :label="`${user.User_ID} (${user.Department})`" 
                      :value="user.UUID"
                    ></el-option>
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button 
                    type="primary" 
                    @click="loadPermissionData"
                    :loading="permissionsLoading"
                  >
                    Load Permissions
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <div v-if="permissionData.length > 0">
              <el-table 
                :data="permissionData" 
                v-loading="permissionsLoading"
                stripe
                border
                style="width: 100%"
              >
                <el-table-column prop="user_id" label="User" width="120">
                </el-table-column>
                <el-table-column prop="kri_id" label="KRI ID" width="80">
                </el-table-column>
                <el-table-column prop="actions" label="Permissions" min-width="200">
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
                <el-table-column label="Actions" width="100">
                  <template slot-scope="scope">
                    <el-button 
                      size="mini" 
                      type="primary" 
                      icon="el-icon-edit"
                      @click="editPermission(scope.row)"
                    >
                      Edit
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <div v-else class="no-permission-data">
              <el-empty description="No permission data loaded. Please select filters and click Load Permissions.">
              </el-empty>
            </div>
          </div>
        </el-tab-pane>

        <!-- System Overview Tab -->
        <el-tab-pane label="System Overview" name="overview">
          <div class="tab-content">
            <div class="content-header">
              <h3>System Overview</h3>
              <p class="tab-description">System-wide statistics and monitoring.</p>
            </div>

            <div class="system-stats">
              <el-row :gutter="20">
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-content">
                      <div class="stat-number">{{ systemStats.totalUsers }}</div>
                      <div class="stat-label">Total Users</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-content">
                      <div class="stat-number">{{ systemStats.totalDepartments }}</div>
                      <div class="stat-label">Departments</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-content">
                      <div class="stat-number">{{ systemStats.totalKRIs }}</div>
                      <div class="stat-label">Active KRIs</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-content">
                      <div class="stat-number">{{ systemStats.totalPermissions }}</div>
                      <div class="stat-label">Permissions</div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>

            <div class="recent-activity">
              <h4>Recent Administrative Activity</h4>
              <el-table 
                :data="recentActivity" 
                stripe
                style="width: 100%"
              >
                <el-table-column prop="timestamp" label="Time" width="180">
                  <template slot-scope="scope">
                    {{ formatDateTime(scope.row.timestamp) }}
                  </template>
                </el-table-column>
                <el-table-column prop="action" label="Action" width="150">
                </el-table-column>
                <el-table-column prop="user" label="Admin User" width="120">
                </el-table-column>
                <el-table-column prop="target" label="Target" width="120">
                </el-table-column>
                <el-table-column prop="details" label="Details">
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Role Edit Dialog -->
    <el-dialog 
      title="Edit User Role" 
      :visible.sync="roleEditDialogVisible"
      width="400px"
      @close="resetRoleEditDialog"
    >
      <div v-if="editingUser">
        <div class="user-info">
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
            <el-select v-model="newUserRole" placeholder="Select new role">
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
      
      <div slot="footer" class="dialog-footer">
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
      <div v-if="viewingUser">
        <div class="user-info">
          <p><strong>User:</strong> {{ viewingUser.User_ID }} ({{ viewingUser.User_Name }})</p>
          <p><strong>Department:</strong> {{ viewingUser.Department }}</p>
        </div>
        
        <el-table 
          :data="userPermissions" 
          v-loading="userPermissionsLoading"
          stripe
          style="width: 100%"
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
      
      <div slot="footer" class="dialog-footer">
        <el-button @click="userPermissionsDialogVisible = false">Close</el-button>
      </div>
    </el-dialog>

    <!-- Permission Edit Dialog -->
    <el-dialog 
      title="Edit Permission" 
      :visible.sync="permissionEditDialogVisible"
      width="500px"
      @close="resetPermissionEditDialog"
    >
      <div v-if="editingPermission">
        <div class="permission-info">
          <p><strong>User:</strong> {{ editingPermission.user_id }}</p>
          <p><strong>KRI ID:</strong> {{ editingPermission.kri_id }}</p>
          <p><strong>Current Permissions:</strong> {{ editingPermission.actions }}</p>
        </div>
        
        <el-form>
          <el-form-item label="Actions (comma-separated):">
            <el-input 
              v-model="editingPermissionActions" 
              type="textarea"
              :rows="3"
              placeholder="e.g., edit,view,review,acknowledge,delete,atomic1_edit,atomic1_view"
            ></el-input>
            <div class="permission-help">
              <small>Available actions: edit, view, review, acknowledge, delete</small><br>
              <small>Atomic actions: atomic1_edit, atomic1_view, atomic2_edit, etc.</small>
            </div>
          </el-form-item>
        </el-form>
      </div>
      
      <div slot="footer" class="dialog-footer">
        <el-button @click="permissionEditDialogVisible = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="confirmPermissionEdit"
          :disabled="!editingPermissionActions"
          :loading="permissionEditLoading"
        >
          Update Permission
        </el-button>
      </div>
    </el-dialog>

    <!-- Department Details Dialog -->
    <el-dialog 
      title="Department Management" 
      :visible.sync="departmentDetailsDialogVisible"
      width="900px"
      @close="resetDepartmentDetailsDialog"
    >
      <div v-if="selectedDepartmentDetails" v-loading="departmentDetailsLoading">
        <div class="dept-detail-header">
          <h3>{{ selectedDepartmentDetails }} Department</h3>
          <div class="dept-metrics">
            <el-tag>{{ departmentUsers.length }} Users</el-tag>
            <el-tag type="info">{{ departmentKRIs.length }} KRIs</el-tag>
          </div>
        </div>

        <el-tabs>
          <el-tab-pane label="Users" name="users">
            <el-table :data="departmentUsers" stripe style="width: 100%">
              <el-table-column prop="User_ID" label="User ID" width="120"></el-table-column>
              <el-table-column prop="User_Name" label="Name" width="150"></el-table-column>
              <el-table-column prop="user_role" label="Role" width="120">
                <template slot-scope="scope">
                  <el-tag :type="getRoleTagType(scope.row.user_role)" size="small">
                    {{ getRoleDisplayName(scope.row.user_role) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="Actions" width="200">
                <template slot-scope="scope">
                  <el-button 
                    v-if="scope.row.user_role === 'user'"
                    size="mini" 
                    type="warning"
                    @click="promoteUserToDeptAdmin(scope.row)"
                    :disabled="!Permission.canChangeUserRole(currentUser, scope.row, 'dept_admin')"
                  >
                    Promote to Dept Admin
                  </el-button>
                  <el-button 
                    size="mini" 
                    type="primary"
                    @click="viewUserPermissions(scope.row)"
                  >
                    View Permissions
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="KRIs" name="kris">
            <el-table :data="departmentKRIs" stripe style="width: 100%">
              <el-table-column prop="kri_id" label="KRI ID" width="80"></el-table-column>
              <el-table-column prop="kri_name" label="KRI Name" min-width="200"></el-table-column>
              <el-table-column prop="kri_owner" label="Owner" width="120"></el-table-column>
              <el-table-column prop="data_provider" label="Data Provider" width="120"></el-table-column>
              <el-table-column prop="l1_risk_type" label="L1 Risk Type" width="120"></el-table-column>
              <el-table-column label="Actions" width="100">
                <template slot-scope="scope">
                  <el-button 
                    size="mini" 
                    type="info"
                    @click="$router.push(`/kri/${scope.row.kri_id}/${scope.row.reporting_date || 20241231}`)"
                  >
                    View
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <div slot="footer" class="dialog-footer">
        <el-button @click="departmentDetailsDialogVisible = false">Close</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';
import Permission from '@/utils/permission';

export default {
  name: 'AdminManagement',
  // Make Permission available in template
  created() {
    this.Permission = Permission;
  },
  data() {
    return {
      activeTab: 'users',
      
      // User Management
      users: [],
      departments: [],
      selectedDepartment: '',
      usersLoading: false,
      
      // Role Management
      bulkSelectedUsers: [],
      bulkNewRole: '',
      bulkRoleLoading: false,
      
      // Department Management
      departmentStats: [],
      
      // Permission Management
      permissionDeptFilter: '',
      permissionUserFilter: '',
      permissionData: [],
      permissionsLoading: false,
      
      // System Overview
      systemStats: {
        totalUsers: 0,
        totalDepartments: 0,
        totalKRIs: 0,
        totalPermissions: 0
      },
      recentActivity: [],
      
      // Dialogs
      roleEditDialogVisible: false,
      editingUser: null,
      newUserRole: '',
      roleChangeLoading: false,
      
      userPermissionsDialogVisible: false,
      viewingUser: null,
      userPermissions: [],
      userPermissionsLoading: false,
      
      // Permission editing dialog
      permissionEditDialogVisible: false,
      editingPermission: null,
      editingPermissionActions: '',
      permissionEditLoading: false,
      
      // Department details dialog
      departmentDetailsDialogVisible: false,
      selectedDepartmentDetails: null,
      departmentUsers: [],
      departmentKRIs: [],
      departmentDetailsLoading: false
    };
  },
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    filteredUsers() {
      if (!this.selectedDepartment) {
        return this.users;
      }
      return this.users.filter(user => user.Department === this.selectedDepartment);
    },
    
    filteredUsersForPermissions() {
      if (!this.permissionDeptFilter) {
        return this.users;
      }
      return this.users.filter(user => user.Department === this.permissionDeptFilter);
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
    }
  },
  async mounted() {
    // Verify admin access
    if (!Permission.isSystemAdmin(this.currentUser)) {
      this.$message.error('Access denied. System administrator privileges required.');
      this.$router.push('/');
      return;
    }
    
    await this.loadInitialData();
  },
  methods: {
    async loadInitialData() {
      try {
        await Promise.all([
          this.loadUsers(),
          this.loadDepartments(),
          this.loadSystemStats()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        this.$message.error('Failed to load admin data');
      }
    },
    
    async loadUsers() {
      this.usersLoading = true;
      try {
        this.users = await kriService.getAllUsers();
      } catch (error) {
        console.error('Error loading users:', error);
        this.$message.error('Failed to load users');
      } finally {
        this.usersLoading = false;
      }
    },
    
    async loadDepartments() {
      try {
        this.departments = await kriService.getAllDepartments();
        await this.loadDepartmentStats();
      } catch (error) {
        console.error('Error loading departments:', error);
        this.$message.error('Failed to load departments');
      }
    },
    
    async loadDepartmentStats() {
      try {
        const stats = [];
        for (const dept of this.departments) {
          const deptUsers = this.users.filter(u => u.Department === dept);
          const deptKRIs = await kriService.getDepartmentKRIs(dept);
          const adminCount = deptUsers.filter(u => 
            Permission.isSystemAdmin(u) || Permission.isDepartmentAdmin(u)
          ).length;
          
          stats.push({
            name: dept,
            userCount: deptUsers.length,
            kriCount: deptKRIs.length,
            adminCount
          });
        }
        this.departmentStats = stats;
      } catch (error) {
        console.error('Error loading department stats:', error);
      }
    },
    
    async loadSystemStats() {
      try {
        const permissions = await kriService.getUserPermissionsSummary();
        this.systemStats = {
          totalUsers: this.users.length,
          totalDepartments: this.departments.length,
          totalKRIs: 0, // Would need additional query
          totalPermissions: permissions.length
        };
        
        // Mock recent activity
        this.recentActivity = [
          { 
            timestamp: new Date().toISOString(), 
            action: 'Role Change', 
            user: 'Steven', 
            target: 'User123', 
            details: 'Promoted to dept_admin' 
          }
        ];
      } catch (error) {
        console.error('Error loading system stats:', error);
      }
    },
    
    async handleTabClick(tab) {
      if (tab.name === 'permissions' && this.permissionData.length === 0) {
        // Load initial permission data if needed
      }
    },
    
    handleDepartmentFilter() {
      // Filter is handled by computed property
    },
    
    async refreshUsers() {
      await this.loadUsers();
      await this.loadDepartmentStats();
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
        await this.loadDepartmentStats(); // Refresh stats
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
      if (!this.bulkSelectedUsers.length || !this.bulkNewRole) return;
      
      this.bulkRoleLoading = true;
      try {
        for (const userUuid of this.bulkSelectedUsers) {
          await kriService.updateUserRole(userUuid, this.bulkNewRole, this.currentUser.User_ID);
          
          // Update local data
          const userIndex = this.users.findIndex(u => u.UUID === userUuid);
          if (userIndex !== -1) {
            this.users[userIndex].user_role = this.bulkNewRole;
          }
        }
        
        this.$message.success(`Bulk role change completed for ${this.bulkSelectedUsers.length} users`);
        this.bulkSelectedUsers = [];
        this.bulkNewRole = '';
        await this.loadDepartmentStats();
      } catch (error) {
        console.error('Error executing bulk role change:', error);
        this.$message.error('Failed to execute bulk role change');
      } finally {
        this.bulkRoleLoading = false;
      }
    },
    
    async loadPermissionData() {
      this.permissionsLoading = true;
      try {
        let userUuid = this.permissionUserFilter || null;
        this.permissionData = await kriService.getUserPermissionsSummary(userUuid);
        
        // If department filter is set, filter the results
        if (this.permissionDeptFilter) {
          this.permissionData = this.permissionData.filter(perm => 
            perm.kri_user && perm.kri_user.Department === this.permissionDeptFilter
          );
        }
        
        // Flatten the data for display
        this.permissionData = this.permissionData.map(perm => ({
          ...perm,
          user_id: perm.kri_user ? perm.kri_user.User_ID : 'Unknown'
        }));
      } catch (error) {
        console.error('Error loading permission data:', error);
        this.$message.error('Failed to load permission data');
      } finally {
        this.permissionsLoading = false;
      }
    },
    
    async editPermission(permission) {
      this.editingPermission = { ...permission };
      this.editingPermissionActions = permission.actions || '';
      this.permissionEditDialogVisible = true;
    },
    
    async confirmPermissionEdit() {
      if (!this.editingPermission || !this.editingPermissionActions) return;
      
      this.permissionEditLoading = true;
      try {
        // Update permission using bulk update method
        const permissionUpdate = {
          user_uuid: this.editingPermission.user_uuid,
          kri_id: this.editingPermission.kri_id,
          actions: this.editingPermissionActions,
          effect: true // Keep permission active
        };
        
        await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.User_ID);
        
        // Update local data
        const permIndex = this.permissionData.findIndex(p => 
          p.user_uuid === this.editingPermission.user_uuid && 
          p.kri_id === this.editingPermission.kri_id
        );
        if (permIndex !== -1) {
          this.permissionData[permIndex].actions = this.editingPermissionActions;
        }
        
        this.$message.success('Permission updated successfully');
        this.permissionEditDialogVisible = false;
      } catch (error) {
        console.error('Error updating permission:', error);
        this.$message.error('Failed to update permission');
      } finally {
        this.permissionEditLoading = false;
      }
    },
    
    resetPermissionEditDialog() {
      this.editingPermission = null;
      this.editingPermissionActions = '';
      this.permissionEditLoading = false;
    },
    
    async viewDepartmentDetails(department) {
      this.selectedDepartmentDetails = department;
      this.departmentDetailsLoading = true;
      this.departmentDetailsDialogVisible = true;
      
      try {
        // Load department users and KRIs in parallel
        const [users, kris] = await Promise.all([
          kriService.getUsersByDepartment(department),
          kriService.getDepartmentKRIs(department)
        ]);
        
        this.departmentUsers = users;
        this.departmentKRIs = kris;
      } catch (error) {
        console.error('Error loading department details:', error);
        this.$message.error('Failed to load department details');
      } finally {
        this.departmentDetailsLoading = false;
      }
    },
    
    resetDepartmentDetailsDialog() {
      this.selectedDepartmentDetails = null;
      this.departmentUsers = [];
      this.departmentKRIs = [];
      this.departmentDetailsLoading = false;
    },
    
    async promoteUserToDeptAdmin(user) {
      try {
        await kriService.updateUserRole(user.UUID, 'dept_admin', this.currentUser.User_ID);
        
        // Update local data
        const userIndex = this.departmentUsers.findIndex(u => u.UUID === user.UUID);
        if (userIndex !== -1) {
          this.departmentUsers[userIndex].user_role = 'dept_admin';
        }
        
        // Also update main users array
        const mainUserIndex = this.users.findIndex(u => u.UUID === user.UUID);
        if (mainUserIndex !== -1) {
          this.users[mainUserIndex].user_role = 'dept_admin';
        }
        
        this.$message.success(`${user.User_ID} promoted to Department Administrator`);
        await this.loadDepartmentStats(); // Refresh stats
      } catch (error) {
        console.error('Error promoting user:', error);
        this.$message.error('Failed to promote user');
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
    
    formatDateTime(timestamp) {
      return new Date(timestamp).toLocaleString();
    }
  }
};
</script>

<style scoped>
.admin-management {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.admin-header {
  margin-bottom: 20px;
}

.admin-title {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-container {
  background: white;
  border-radius: 8px;
}

.tab-content {
  padding: 20px 0;
}

.content-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-header h3 {
  margin: 0;
  color: #303133;
}

.tab-description {
  color: #909399;
  margin: 5px 0 0 0;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.role-summary {
  margin-bottom: 30px;
}

.role-card {
  text-align: center;
}

.role-info {
  padding: 10px;
}

.role-name {
  margin-bottom: 10px;
}

.role-count {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.role-description {
  font-size: 12px;
  color: #909399;
}

.bulk-role-actions {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.bulk-role-actions h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.department-overview {
  margin-bottom: 30px;
}

.dept-card {
  text-align: center;
}

.dept-info h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.dept-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 14px;
  color: #606266;
}

.metric-value {
  font-weight: bold;
  color: #409eff;
}

.permission-filters {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.no-permission-data {
  text-align: center;
  padding: 40px;
}

.system-stats {
  margin-bottom: 30px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 20px;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.recent-activity h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.user-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.user-info p {
  margin: 5px 0;
}

.dialog-footer {
  text-align: right;
}

.permission-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.permission-info p {
  margin: 5px 0;
}

.permission-help {
  margin-top: 8px;
  color: #909399;
}

.dept-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e9ecef;
}

.dept-detail-header h3 {
  margin: 0;
  color: #303133;
}

.dept-metrics .el-tag {
  margin-left: 10px;
}

/* Responsive design */
@media (max-width: 768px) {
  .admin-management {
    padding: 10px;
  }
  
  .content-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>