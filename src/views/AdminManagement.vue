<template>
  <div class="admin-management">
    <div class="admin-header">
      <h1 class="admin-title">
        <i class="el-icon-setting"></i>
        {{ adminTitle }}
      </h1>
      <div class="admin-breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">Dashboard</el-breadcrumb-item>
          <el-breadcrumb-item>{{ breadcrumbTitle }}</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
    </div>

    <el-card class="admin-container">
      <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
        <!-- Dashboard Tab (Department Admin Only) -->
        <el-tab-pane v-if="isDepartmentAdmin" label="Dashboard" name="dashboard">
          <admin-base-dashboard
            :title="dashboardTitle"
            :description="dashboardDescription"
            :metrics="dashboardMetrics"
            :distribution-data="departmentStats.usersByRole"
            :distribution-title="'Team Members by Role'"
            :quick-actions="dashboardQuickActions"
            @quick-action="handleQuickAction"
          />
        </el-tab-pane>

        <!-- User Management Tab -->
        <el-tab-pane :label="userManagementLabel" name="users">
          <admin-user-management 
            v-if="isSystemAdmin"
            @data-updated="handleDataUpdated" 
          />
          <admin-base-user-management
            v-else-if="isDepartmentAdmin"
            :title="'Team Management'"
            :description="'Manage department team members and their permissions.'"
            :users="departmentUsers"
            :departments="[currentUser.Department]"
            :loading="teamLoading"
            :department-filter="currentUser.Department"
            :show-department-filter="false"
            :show-department-column="false"
            :show-add-user="false"
            :show-edit-role="false"
            :show-bulk-role-change="false"
            :show-permission-summary="true"
            @refresh-users="refreshDepartmentUsers"
            @manage-user-permissions="handleManageUserPermissions"
            @view-user-details="handleViewUserDetails"
          />
        </el-tab-pane>
        <!-- Role Management Tab (System Admin Only) -->
        <el-tab-pane v-if="isSystemAdmin" label="Role Management" name="roles">
          <admin-role-management @data-updated="handleDataUpdated" />
        </el-tab-pane>

        <!-- Department Administration Tab (System Admin Only) -->
        <el-tab-pane v-if="isSystemAdmin" label="Department Admin" name="departments">
          <admin-department-management @data-updated="handleDataUpdated" />
        </el-tab-pane>

        <!-- Permission Management Tab -->
        <el-tab-pane label="Permission Management" name="permissions">
          <admin-permission-management 
            v-if="isSystemAdmin"
            @data-updated="handleDataUpdated" 
          />
          <admin-base-permission-management
            v-else-if="isDepartmentAdmin"
            :title="'Department Permission Management'"
            :description="'Assign and manage permissions for department KRIs'"
            :permission-data="departmentPermissions"
            :available-users="departmentUsers"
            :available-k-r-is="departmentKRIs"
            :departments="[currentUser.Department]"
            :loading="permissionsLoading"
            :show-department-filter="false"
            :show-user-filter="true"
            @apply-template="handleApplyPermissionTemplate"
            @filter-changed="handlePermissionFilterChange"
            @load-permissions="loadDepartmentPermissions"
            @bulk-assignment-completed="loadDepartmentPermissions"
          />
        </el-tab-pane>

        <!-- KRI Management Tab (Department Admin Only) -->
        <el-tab-pane v-if="isDepartmentAdmin" label="Department KRIs" name="kris">
          <admin-base-user-management
            :title="'Department KRIs'"
            :description="'Manage KRIs assigned to your department.'"
            :users="departmentKRIs"
            :loading="krisLoading"
            :show-department-filter="false"
            :show-department-column="false"
            :show-permission-summary="false"
            :show-add-user="false"
            :show-edit-role="false"
            :show-view-details="false"
            :show-bulk-actions="false"
            :action-column-width="'150'"
            @refresh-users="refreshDepartmentKRIs"
            @manage-user-permissions="handleManageKRIPermissions"
          />
        </el-tab-pane>

        <!-- Activity Audit Tab -->
        <el-tab-pane label="Activity Audit" name="audit">
          <admin-base-activity-audit
            :title="auditTitle"
            :description="auditDescription"
            :audit-data="auditData"
            :audit-stats="auditStats"
            :available-users="availableAuditUsers"
            :departments="auditDepartments"
            :loading="auditLoading"
            :show-department-filter="isSystemAdmin"
            :show-user-filter="true"
            :show-department-column="isSystemAdmin"
            @filter-changed="handleAuditFilterChange"
            @load-audit-data="loadAuditData"
            @export-audit-data="handleExportAuditData"
          />
        </el-tab-pane>

        <!-- System Overview Tab (System Admin Only) -->
        <el-tab-pane v-if="isSystemAdmin" label="System Overview" name="overview">
          <admin-system-overview />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Shared Dialogs -->
    <admin-user-permissions-dialog
      :visible.sync="userPermissionsDialogVisible"
      :selected-user="selectedUser"
      :editable-permissions="editablePermissions"
      :user-permissions-loading="userPermissionsLoading"
      :permission-update-loading="permissionUpdateLoading"
      @update-user-permissions="updateUserPermissions"
    />

    <admin-user-details-dialog
      :visible.sync="userDetailsDialogVisible"
      :user-detail-data="userDetailData"
      :user-details-loading="userDetailsLoading"
    />

    <admin-kri-permissions-dialog
      :visible.sync="kriPermissionsDialogVisible"
      :selected-kri="selectedKRI"
      :kri-user-permissions="kriUserPermissions"
      :available-users-for-kri="availableUsersForKRI"
      :kri-permissions-loading="kriPermissionsLoading"
      @add-kri-user-permission="addKRIUserPermission"
      @remove-kri-user-permission="removeKRIUserPermission"
    />

    <admin-bulk-permission-template-dialog
      :visible.sync="bulkPermissionDialogVisible"
      :selected-template="selectedTemplate"
      :permission-templates="permissionTemplates"
      :team-members="departmentUsers"
      :department-k-r-is="departmentKRIs"
      :template-apply-loading="templateApplyLoading"
      @apply-permission-template="applyPermissionTemplate"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import Permission from '@/utils/permission';

// Base components
import AdminBaseDashboard from '@/components/admin/shared/AdminBaseDashboard.vue';
import AdminBaseUserManagement from '@/components/admin/shared/AdminBaseUserManagement.vue';
import AdminBasePermissionManagement from '@/components/admin/shared/AdminBasePermissionManagement.vue';
import AdminBaseActivityAudit from '@/components/admin/shared/AdminBaseActivityAudit.vue';

// System admin specific components
import AdminUserManagement from '@/components/admin/AdminUserManagement.vue';
import AdminRoleManagement from '@/components/admin/AdminRoleManagement.vue';
import AdminPermissionManagement from '@/components/admin/AdminPermissionManagement.vue';
import AdminDepartmentManagement from '@/components/admin/AdminDepartmentManagement.vue';
import AdminSystemOverview from '@/components/admin/AdminSystemOverview.vue';

// Shared dialogs
import AdminUserPermissionsDialog from '@/components/admin/dialogs/AdminUserPermissionsDialog.vue';
import AdminUserDetailsDialog from '@/components/admin/dialogs/AdminUserDetailsDialog.vue';
import AdminKRIPermissionsDialog from '@/components/admin/dialogs/AdminKRIPermissionsDialog.vue';
import AdminBulkPermissionTemplateDialog from '@/components/admin/dialogs/AdminBulkPermissionTemplateDialog.vue';

// Services and mixins
import { departmentAdminService } from '@/services/departmentAdminService';
import { kriService } from '@/services/kriService';
import adminHelpersMixin from '@/mixins/adminHelpersMixin';
import adminPermissionMixin from '@/mixins/adminPermissionMixin';
import '@/assets/styles/admin.css';

export default {
  name: 'AdminManagement',
  
  components: {
    AdminBaseDashboard,
    AdminBaseUserManagement,
    AdminBasePermissionManagement,
    AdminBaseActivityAudit,
    AdminUserManagement,
    AdminRoleManagement,
    AdminPermissionManagement,
    AdminDepartmentManagement,
    AdminSystemOverview,
    AdminUserPermissionsDialog,
    AdminUserDetailsDialog,
    AdminKRIPermissionsDialog,
    AdminBulkPermissionTemplateDialog
  },
  
  mixins: [adminHelpersMixin, adminPermissionMixin],
  
  data() {
    return {
      activeTab: 'dashboard',
      
      // Department admin specific data
      departmentStats: {
        totalUsers: 0,
        totalKRIs: 0,
        usersByRole: {},
        pendingItems: {
          pendingApprovals: 0,
          pendingInputs: 0
        }
      },
      departmentUsers: [],
      departmentKRIs: [],
      departmentPermissions: [],
      
      // Loading states
      teamLoading: false,
      krisLoading: false,
      permissionsLoading: false,
      auditLoading: false,
      
      // Dialog states
      userPermissionsDialogVisible: false,
      userDetailsDialogVisible: false,
      kriPermissionsDialogVisible: false,
      bulkPermissionDialogVisible: false,
      
      // Dialog data
      selectedUser: null,
      selectedKRI: null,
      selectedTemplate: '',
      editablePermissions: [],
      userDetailData: null,
      kriUserPermissions: [],
      availableUsersForKRI: [],
      
      // Dialog loading states
      userPermissionsLoading: false,
      userDetailsLoading: false,
      kriPermissionsLoading: false,
      permissionUpdateLoading: false,
      templateApplyLoading: false,
      
      // Audit data
      auditData: [],
      auditStats: {
        totalActivities: 0,
        todayActivities: 0,
        uniqueUsers: 0
      }
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    isSystemAdmin() {
      return Permission.isSystemAdmin(this.currentUser);
    },
    
    isDepartmentAdmin() {
      return Permission.isDepartmentAdmin(this.currentUser);
    },
    
    adminTitle() {
      return this.isSystemAdmin ? 'System Administration' : 'Department Administration';
    },
    
    breadcrumbTitle() {
      return this.isSystemAdmin ? 'Administration' : 'Department Admin';
    },
    
    userManagementLabel() {
      return this.isSystemAdmin ? 'User Management' : 'Team Management';
    },
    
    dashboardTitle() {
      return this.isDepartmentAdmin ? 'Department Dashboard' : 'Dashboard';
    },
    
    dashboardDescription() {
      return this.isDepartmentAdmin 
        ? 'Overview of department statistics and quick actions.' 
        : 'System overview and statistics.';
    },
    
    dashboardMetrics() {
      if (this.isDepartmentAdmin) {
        return [
          {
            icon: 'el-icon-user',
            value: this.departmentStats.totalUsers,
            label: 'Team Members'
          },
          {
            icon: 'el-icon-data-analysis',
            value: this.departmentStats.totalKRIs,
            label: 'Department KRIs'
          },
          {
            icon: 'el-icon-warning',
            value: this.departmentStats.pendingItems.pendingApprovals,
            label: 'Pending Approvals'
          },
          {
            icon: 'el-icon-edit',
            value: this.departmentStats.pendingItems.pendingInputs,
            label: 'Pending Inputs'
          }
        ];
      }
      return [];
    },
    
    dashboardQuickActions() {
      if (this.isDepartmentAdmin) {
        return [
          { key: 'team', type: 'primary', icon: 'el-icon-user-solid', label: 'Manage Team' },
          { key: 'permissions', type: 'success', icon: 'el-icon-key', label: 'Assign Permissions' },
          { key: 'kris', type: 'info', icon: 'el-icon-data-analysis', label: 'Department KRIs' },
          { key: 'audit', type: 'warning', icon: 'el-icon-view', label: 'View Activity' }
        ];
      }
      return [];
    },
    
    auditTitle() {
      return this.isSystemAdmin ? 'System Activity Audit' : 'Department Activity Audit';
    },
    
    auditDescription() {
      return this.isSystemAdmin 
        ? 'Monitor all system activities and changes.'
        : 'Monitor department activities and changes.';
    },
    
    availableAuditUsers() {
      return this.isSystemAdmin ? [] : this.departmentUsers;
    },
    
    auditDepartments() {
      return this.isSystemAdmin ? [] : [this.currentUser.Department];
    }
  },
  
  async mounted() {
    // Verify admin access
    if (!this.isSystemAdmin && !this.isDepartmentAdmin) {
      this.$message.error('Access denied. Administrator privileges required.');
      this.$router.push('/');
      return;
    }
    
    // Set default tab based on role
    if (this.isDepartmentAdmin) {
      this.activeTab = 'dashboard';
      await this.loadDepartmentData();
    } else {
      this.activeTab = 'users';
    }
  },
  
  methods: {
    async handleTabClick(tab) {
      // Tab switching is handled automatically by el-tabs
      // Load data for department admin tabs as needed
      if (this.isDepartmentAdmin) {
        switch (tab.name) {
        case 'users':
          if (this.departmentUsers.length === 0) {
            await this.refreshDepartmentUsers();
          }
          break;
        case 'kris':
          if (this.departmentKRIs.length === 0) {
            await this.refreshDepartmentKRIs();
          }
          break;
        case 'audit':
          if (this.auditData.length === 0) {
            await this.loadAuditData();
          }
          break;
        }
      }
    },
    
    handleDataUpdated() {
      // Emit event to notify other tabs that data has been updated
      this.$emit('admin-data-updated');
    },
    
    handleQuickAction(actionKey) {
      this.activeTab = actionKey;
    },
    
    // Department admin specific methods
    async loadDepartmentData() {
      try {
        const overview = await departmentAdminService.getDepartmentOverview(
          this.currentUser.Department,
          this.currentUser
        );
        
        this.departmentStats = overview;
        this.departmentUsers = overview.detailedUsers || [];
        this.departmentKRIs = overview.detailedKRIs || [];
      } catch (error) {
        console.error('Error loading department data:', error);
        this.$message.error('Failed to load department data');
      }
    },
    
    async refreshDepartmentUsers() {
      this.teamLoading = true;
      try {
        this.departmentUsers = await departmentAdminService.getDepartmentUsersWithPermissions(
          this.currentUser.Department,
          this.currentUser
        );
      } catch (error) {
        console.error('Error loading department users:', error);
        this.$message.error('Failed to load team members');
      } finally {
        this.teamLoading = false;
      }
    },
    
    async refreshDepartmentKRIs() {
      this.krisLoading = true;
      try {
        this.departmentKRIs = await kriService.getDepartmentKRIs(this.currentUser.Department);
      } catch (error) {
        console.error('Error loading department KRIs:', error);
        this.$message.error('Failed to load department KRIs');
      } finally {
        this.krisLoading = false;
      }
    },
    
    async loadDepartmentPermissions() {
      this.permissionsLoading = true;
      try {
        // Load permissions for department users and KRIs
        this.departmentPermissions = await kriService.getDepartmentPermissions(
          this.currentUser.Department
        );
      } catch (error) {
        console.error('Error loading department permissions:', error);
        this.$message.error('Failed to load permissions');
      } finally {
        this.permissionsLoading = false;
      }
    },
    
    async loadAuditData() {
      this.auditLoading = true;
      try {
        if (this.isSystemAdmin) {
          // Load system-wide audit data
          this.auditData = await kriService.getSystemAuditTrail();
        } else {
          // Load department-specific audit data
          this.auditData = await departmentAdminService.getDepartmentAuditTrail(
            this.currentUser.Department
          );
        }
        
        // Calculate audit statistics
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        this.auditStats = {
          totalActivities: this.auditData.length,
          todayActivities: this.auditData.filter(item => 
            new Date(item.changed_at) >= todayStart
          ).length,
          uniqueUsers: new Set(this.auditData.map(item => item.changed_by)).size
        };
      } catch (error) {
        console.error('Error loading audit data:', error);
        this.$message.error('Failed to load audit data');
      } finally {
        this.auditLoading = false;
      }
    },
    
    // Dialog handlers
    async handleManageUserPermissions(user) {
      this.selectedUser = user;
      this.userPermissionsLoading = true;
      this.userPermissionsDialogVisible = true;
      
      try {
        const permissions = await kriService.getUserPermissionsSummary(user.UUID);
        this.editablePermissions = this.departmentKRIs.map(kri => {
          const existingPerm = permissions.find(p => p.kri_id === kri.kri_code);
          return {
            kri_id: kri.kri_code,
            kri_name: kri.name,
            current_actions: existingPerm ? existingPerm.actions : '',
            new_actions: existingPerm ? existingPerm.actions : '',
            is_calculated: kri.is_calculated_kri
          };
        });
      } catch (error) {
        console.error('Error loading user permissions:', error);
        this.$message.error('Failed to load user permissions');
      } finally {
        this.userPermissionsLoading = false;
      }
    },
    
    async handleViewUserDetails(user) {
      this.selectedUser = user;
      this.userDetailsLoading = true;
      this.userDetailsDialogVisible = true;
      
      try {
        const [permissions, recentActivity] = await Promise.all([
          kriService.getUserPermissionsSummary(user.UUID),
          this.getUserRecentActivity(user.UUID)
        ]);
        
        this.userDetailData = {
          ...user,
          permissions,
          recentActivity,
          permissionSummary: {
            totalKRIs: permissions.length,
            totalPermissions: permissions.reduce((sum, p) => sum + (p.actions ? p.actions.split(',').length : 0), 0),
            lastActivity: recentActivity.length > 0 ? recentActivity[0].changed_at : null
          }
        };
      } catch (error) {
        console.error('Error loading user details:', error);
        this.$message.error('Failed to load user details');
      } finally {
        this.userDetailsLoading = false;
      }
    },
    
    async handleManageKRIPermissions(kri) {
      this.selectedKRI = kri;
      this.kriPermissionsLoading = true;
      this.kriPermissionsDialogVisible = true;
      
      try {
        const allPermissions = await kriService.getUserPermissionsSummary();
        this.kriUserPermissions = allPermissions
          .filter(p => p.kri_id === kri.kri_code)
          .map(p => ({
            ...p,
            user_name: p.kri_user ? p.kri_user.User_Name : 'Unknown',
            user_id: p.kri_user ? p.kri_user.User_ID : 'Unknown',
            user_department: p.kri_user ? p.kri_user.Department : 'Unknown'
          }));
          
        this.availableUsersForKRI = this.departmentUsers.filter(member => 
          !this.kriUserPermissions.some(p => p.user_uuid === member.UUID)
        );
      } catch (error) {
        console.error('Error loading KRI permissions:', error);
        this.$message.error('Failed to load KRI permissions');
      } finally {
        this.kriPermissionsLoading = false;
      }
    },
    
    handleApplyPermissionTemplate(templateKey) {
      this.selectedTemplate = templateKey;
      this.bulkPermissionDialogVisible = true;
    },
    
    handlePermissionFilterChange(_filters) {
      // Handle permission filter changes
    },
    
    handleAuditFilterChange(_filters) {
      // Handle audit filter changes
    },
    
    handleExportAuditData(_data) {
      // Handle audit data export
      this.$message.info('Audit export functionality to be implemented');
    },
    
    // Permission management methods
    async updateUserPermissions(permissions) {
      const success = await this.bulkUpdateUserPermissions(permissions, this.currentUser.User_ID);
      if (success) {
        this.userPermissionsDialogVisible = false;
        await this.refreshDepartmentUsers();
      }
    },
    
    async addKRIUserPermission(permissionData) {
      const success = await this.addKRIUserPermission(
        permissionData.user_uuid,
        this.selectedKRI.kri_code,
        permissionData.actions,
        this.currentUser.User_ID
      );
      if (success) {
        await this.handleManageKRIPermissions(this.selectedKRI);
      }
    },
    
    async removeKRIUserPermission(permission) {
      const success = await this.removeKRIUserPermission(
        permission.user_uuid,
        permission.kri_id,
        this.currentUser.User_ID
      );
      if (success) {
        await this.handleManageKRIPermissions(this.selectedKRI);
      }
    },
    
    async applyPermissionTemplate(data) {
      const success = await this.applyPermissionTemplate(
        data.template,
        data.users,
        data.kris,
        this.currentUser
      );
      if (success) {
        this.bulkPermissionDialogVisible = false;
        await this.refreshDepartmentUsers();
      }
    },
    
    // Helper methods
    async getUserRecentActivity(userUuid) {
      try {
        let recentActivity = [];
        const krisToCheck = this.isDepartmentAdmin ? this.departmentKRIs : [];
        
        for (const kri of krisToCheck.slice(0, 5)) {
          try {
            const kriAudit = await kriService.fetchKRIAuditTrail(kri.kri_code, '*');
            const userActivity = (kriAudit || []).filter(item => item.changed_by === userUuid);
            recentActivity = recentActivity.concat(userActivity);
          } catch (error) {
            console.warn(`Failed to load activity for KRI ${kri.kri_code}:`, error);
          }
        }
        
        return recentActivity
          .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
          .slice(0, 10);
      } catch (error) {
        console.error('Error loading user recent activity:', error);
        return [];
      }
    }
  }
};
</script>

<style scoped>
/* Main AdminManagement orchestration component - minimal styling */
/* All component-specific styles are now in extracted components and admin.css */

.admin-management {
  padding: var(--spacing-lg);
  background-color: var(--bg-secondary);
  min-height: 100vh;
}

.admin-header {
  margin-bottom: var(--spacing-lg);
}

.admin-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-3xl);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.admin-container {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
}

/* Responsive design */
@media (max-width: 768px) {
  .admin-management {
    padding: var(--spacing-sm);
  }
}
</style>