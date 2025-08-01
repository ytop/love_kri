<template>
  <div class="admin-management">
    <div class="admin-header">
      <div class="admin-header-left">
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
      <div class="admin-header-right">
        <div class="reporting-period-selector">
          <label class="period-label">Reporting Period:</label>
          <el-select 
            v-model="selectedReportingDate" 
            placeholder="Select period"
            @change="handleReportingDateChange"
            class="period-select"
            size="small"
          >
            <el-option
              v-for="period in availableReportingPeriods"
              :key="period.value"
              :label="period.label"
              :value="period.value"
            ></el-option>
          </el-select>
        </div>
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
            :selected-reporting-date="selectedReportingDate"
            @data-updated="handleDataUpdated"
            @manage-user-permissions="handleManageUserPermissions"
            @view-user-details="handleViewUserDetails"
          />
          <admin-base-user-management
            v-else-if="isDepartmentAdmin"
            :title="'Team Management'"
            :description="'Manage department team members and their permissions.'"
            :users="departmentUsers"
            :departments="[currentUser.department]"
            :loading="teamLoading"
            :department-filter="currentUser.department"
            :show-department-filter="false"
            :show-department-column="false"
            :show-add-user="false"
            :show-edit-role="false"
            :show-bulk-role-change="false"
            :show-permission-summary="true"
            :selected-reporting-date="selectedReportingDate"
            @refresh-users="refreshDepartmentUsers"
            @manage-user-permissions="handleManageUserPermissions"
            @view-user-details="handleViewUserDetails"
          />
        </el-tab-pane>

        <!-- Department Administration Tab (System Admin Only) -->
        <el-tab-pane v-if="isSystemAdmin" label="Department Admin" name="departments">
          <admin-department-management 
            :selected-reporting-date="selectedReportingDate"
            @data-updated="handleDataUpdated" 
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
            :selected-reporting-date="selectedReportingDate"
            @filter-changed="handleAuditFilterChange"
            @load-audit-data="loadAuditData"
            @export-audit-data="handleExportAuditData"
          />
        </el-tab-pane>

        <!-- System Overview Tab (System Admin Only) -->
        <el-tab-pane v-if="isSystemAdmin" label="System Overview" name="overview">
          <admin-system-overview 
            :selected-reporting-date="selectedReportingDate"
          />
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
      :selected-reporting-date="selectedReportingDate"
      @update-user-permissions="updateUserPermissions"
    />

    <admin-user-details-dialog
      :visible.sync="userDetailsDialogVisible"
      :user-detail-data="userDetailData"
      :user-details-loading="userDetailsLoading"
      :selected-reporting-date="selectedReportingDate"
    />

    <admin-k-r-i-permissions-dialog
      :visible.sync="kriPermissionsDialogVisible"
      :selected-kri="selectedKRI"
      :kri-user-permissions="kriUserPermissions"
      :available-users-for-kri="availableUsersForKRI"
      :kri-permissions-loading="kriPermissionsLoading"
      :selected-reporting-date="selectedReportingDate"
      @add-kri-user-permission="addKRIUserPermission"
      @remove-kri-user-permission="removeKRIUserPermission"
    />


  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import Permission from '@/utils/permission';

// Base components
import AdminBaseDashboard from '@/components/admin/shared/AdminBaseDashboard.vue';
import AdminBaseUserManagement from '@/components/admin/shared/AdminBaseUserManagement.vue';
import AdminBaseActivityAudit from '@/components/admin/shared/AdminBaseActivityAudit.vue';

// System admin specific components
import AdminUserManagement from '@/components/admin/AdminUserManagement.vue';
import AdminDepartmentManagement from '@/components/admin/AdminDepartmentManagement.vue';
import AdminSystemOverview from '@/components/admin/AdminSystemOverview.vue';

// Shared dialogs
import AdminUserPermissionsDialog from '@/components/admin/dialogs/AdminUserPermissionsDialog.vue';
import AdminUserDetailsDialog from '@/components/admin/dialogs/AdminUserDetailsDialog.vue';
import AdminKRIPermissionsDialog from '@/components/admin/dialogs/AdminKRIPermissionsDialog.vue';

// Services and mixins
import { departmentAdminService } from '@/services/departmentAdminService';
import { kriService } from '@/services/kriService';
import adminHelpersMixin from '@/mixins/adminHelpersMixin';
import adminPermissionMixin from '@/mixins/adminPermissionMixin';
import { generateReportingPeriods } from '@/utils/helpers';
import '@/assets/styles/admin.css';

export default {
  name: 'AdminManagement',
  
  components: {
    AdminBaseDashboard,
    AdminBaseUserManagement,
    AdminBaseActivityAudit,
    AdminUserManagement,
    AdminDepartmentManagement,
    AdminSystemOverview,
    AdminUserPermissionsDialog,
    AdminUserDetailsDialog,
    AdminKRIPermissionsDialog
  },
  
  mixins: [adminHelpersMixin, adminPermissionMixin],
  
  data() {
    return {
      activeTab: 'dashboard',
      
      // Global reporting period selection
      selectedReportingDate: null,
      availableReportingPeriods: [],
      
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
      
      // Loading states
      teamLoading: false,
      auditLoading: false,
      
      // Dialog states
      userPermissionsDialogVisible: false,
      userDetailsDialogVisible: false,
      kriPermissionsDialogVisible: false,

      
      // Dialog data
      selectedUser: null,
      selectedKRI: null,
      editablePermissions: [],
      userDetailData: null,
      kriUserPermissions: [],
      availableUsersForKRI: [],
      
      // Dialog loading states
      userPermissionsLoading: false,
      userDetailsLoading: false,
      kriPermissionsLoading: false,
      permissionUpdateLoading: false,
      
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
      return this.isSystemAdmin ? [] : [this.currentUser.department];
    }
  },
  
  async mounted() {
    // Verify admin access
    if (!this.isSystemAdmin && !this.isDepartmentAdmin) {
      this.$message.error('Access denied. Administrator privileges required.');
      this.$router.push('/');
      return;
    }
    
    // Initialize reporting periods
    this.initializeReportingPeriods();
    
    // Set default tab based on role
    if (this.isDepartmentAdmin) {
      this.activeTab = 'dashboard';
      await this.loadDepartmentData();
    } else {
      this.activeTab = 'users';
    }
  },
  
  methods: {
    /**
     * Initialize available reporting periods (current month and last 5 months)
     */
    initializeReportingPeriods() {
      // Generate 6 periods: current month + last 5 months
      this.availableReportingPeriods = generateReportingPeriods(6);
      
      // Set default to the second period (index 1) which represents last month
      // This ensures we use the same date format as generated by generateReportingPeriods
      if (this.availableReportingPeriods.length > 1) {
        this.selectedReportingDate = this.availableReportingPeriods[1].value;
      } else {
        // Fallback to first period if not enough periods generated
        this.selectedReportingDate = this.availableReportingPeriods[0]?.value || null;
      }
    },
    
    /**
     * Handle reporting date change - trigger soft refresh
     */
    async handleReportingDateChange(newDate) {
      console.log('Reporting date changed to:', newDate);
      
      // Show loading indicator
      this.$message.info(`Switching to reporting period: ${this.getSelectedPeriodLabel()}`);
      
      try {
        // Refresh open dialogs first
        await this.refreshOpenDialogs();
        
        // Refresh tab-specific data based on current active tab
        await this.refreshCurrentTabData();
        
        // Emit global data update event
        this.$emit('admin-data-updated');
        
        this.$message.success('Data refreshed for new reporting period');
      } catch (error) {
        console.error('Error refreshing data for new reporting period:', error);
        this.$message.error('Failed to refresh data for new period');
      }
    },
    
    /**
     * Get the label for currently selected reporting period
     */
    getSelectedPeriodLabel() {
      const selectedPeriod = this.availableReportingPeriods.find(p => p.value === this.selectedReportingDate);
      return selectedPeriod ? selectedPeriod.label : 'Unknown Period';
    },
    
    /**
     * Refresh data for all open dialogs
     */
    async refreshOpenDialogs() {
      const refreshPromises = [];
      
      // Refresh user permissions dialog if open
      if (this.userPermissionsDialogVisible && this.selectedUser) {
        refreshPromises.push(this.refreshUserPermissionsData());
      }
      
      // Refresh user details dialog if open
      if (this.userDetailsDialogVisible && this.selectedUser) {
        refreshPromises.push(this.refreshUserDetailsData());
      }
      
      // Refresh KRI permissions dialog if open
      if (this.kriPermissionsDialogVisible && this.selectedKRI) {
        refreshPromises.push(this.refreshKRIPermissionsData());
      }
      
      // Wait for all dialog refreshes to complete
      if (refreshPromises.length > 0) {
        await Promise.all(refreshPromises);
      }
    },
    
    /**
     * Refresh current tab data based on active tab
     */
    async refreshCurrentTabData() {
      switch (this.activeTab) {
      case 'dashboard':
        if (this.isDepartmentAdmin) {
          await this.loadDepartmentData();
        }
        break;
      case 'users':
        if (this.isDepartmentAdmin) {
          await this.refreshDepartmentUsers();
        }
        // System admin user data is not period-specific, so no refresh needed
        break;
      case 'audit':
        await this.loadAuditData();
        break;
      // 'departments' and 'overview' tabs don't have period-specific data
      }
    },
    
    /**
     * Refresh user details data when reporting date changes
     */
    async refreshUserDetailsData() {
      if (!this.selectedUser) return;
      
      this.userDetailsLoading = true;
      try {
        const [permissions, recentActivity] = await Promise.all([
          kriService.getUserPermissionsSummary(this.selectedUser.uuid, { reporting_date: this.selectedReportingDate }),
          this.getUserRecentActivity(this.selectedUser.uuid)
        ]);
        
        this.userDetailData = {
          ...this.selectedUser,
          permissions,
          recentActivity,
          permissionSummary: {
            totalKRIs: permissions.length,
            totalPermissions: permissions.reduce((sum, p) => sum + (p.actions ? p.actions.split(',').length : 0), 0),
            lastActivity: recentActivity.length > 0 ? recentActivity[0].changed_at : null
          }
        };
      } catch (error) {
        console.error('Error refreshing user details:', error);
        this.$message.error('Failed to refresh user details');
      } finally {
        this.userDetailsLoading = false;
      }
    },
    
    /**
     * Refresh KRI permissions data when reporting date changes
     */
    async refreshKRIPermissionsData() {
      if (!this.selectedKRI) return;
      
      this.kriPermissionsLoading = true;
      try {
        const allPermissions = await kriService.getUserPermissionsSummary();
        this.kriUserPermissions = allPermissions
          .filter(p => p.kri_id === this.selectedKRI.kri_code)
          .map(p => ({
            ...p,
            user_name: p.kri_user ? p.kri_user.user_name : 'Unknown',
            user_id: p.kri_user ? p.kri_user.user_id : 'Unknown',
            user_department: p.kri_user ? p.kri_user.department : 'Unknown'
          }));
          
        this.availableUsersForKRI = this.departmentUsers.filter(member => 
          !this.kriUserPermissions.some(p => p.user_uuid === member.uuid)
        );
      } catch (error) {
        console.error('Error refreshing KRI permissions:', error);
        this.$message.error('Failed to refresh KRI permissions');
      } finally {
        this.kriPermissionsLoading = false;
      }
    },
    
    /**
     * Refresh user permissions data when reporting date changes
     */
    async refreshUserPermissionsData() {
      if (!this.selectedUser) return;
      
      this.userPermissionsLoading = true;
      try {
        const permissions = await kriService.getUserPermissionsSummary(this.selectedUser.uuid, { reporting_date: this.selectedReportingDate });
        
        // For system admins, get all KRIs, for department admins use department KRIs
        let availableKRIs = [];
        if (this.isSystemAdmin) {
          availableKRIs = await kriService.getAllKRIMetadata();
        } else {
          availableKRIs = [];
        }
        
        this.editablePermissions = availableKRIs.map(kri => {
          const existingPerm = permissions.find(p => p.kri_id === kri.kri_id);
          return {
            kri_id: kri.kri_id,
            kri_name: kri.name,
            current_actions: existingPerm ? existingPerm.actions : '',
            new_actions: existingPerm ? existingPerm.actions : '',
            is_calculated: kri.is_calculated_kri
          };
        });
      } catch (error) {
        console.error('Error refreshing user permissions:', error);
        this.$message.error('Failed to refresh user permissions');
      } finally {
        this.userPermissionsLoading = false;
      }
    },

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
          this.currentUser.department,
          this.currentUser,
          this.selectedReportingDate
        );
        
        this.departmentStats = overview;
        this.departmentUsers = overview.detailedUsers || [];
      } catch (error) {
        console.error('Error loading department data:', error);
        this.$message.error('Failed to load department data');
      }
    },
    
    async refreshDepartmentUsers() {
      this.teamLoading = true;
      try {
        this.departmentUsers = await departmentAdminService.getDepartmentUsersWithPermissions(
          this.currentUser.department,
          this.currentUser,
          this.selectedReportingDate
        );
      } catch (error) {
        console.error('Error loading department users:', error);
        this.$message.error('Failed to load team members');
      } finally {
        this.teamLoading = false;
      }
    },
    
    async loadAuditData() {
      this.auditLoading = true;
      try {
        if (this.isSystemAdmin) {
          // Load system-wide audit data
          const auditResult = await kriService.getSystemAuditTrail();
          this.auditData = auditResult.data || [];
          this.auditStats = auditResult.statistics || {
            totalActivities: 0,
            todayActivities: 0,
            uniqueUsers: 0
          };
        } else {
          // Load department-specific audit data
          this.auditData = await departmentAdminService.getDepartmentAuditTrail(
            this.currentUser.department
          );
          
          // Calculate audit statistics for department admin
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          
          this.auditStats = {
            totalActivities: this.auditData.length,
            todayActivities: this.auditData.filter(item => 
              new Date(item.changed_at) >= todayStart
            ).length,
            uniqueUsers: new Set(this.auditData.map(item => item.changed_by)).size
          };
        }
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
        const permissions = await kriService.getUserPermissionsSummary(user.uuid, { reporting_date: this.selectedReportingDate });
        
        // For system admins, get all KRIs, for department admins use department KRIs
        let availableKRIs = [];
        if (this.isSystemAdmin) {
          availableKRIs = await kriService.getAllKRIMetadata();
        } else {
          availableKRIs = [];
        }
        
        this.editablePermissions = availableKRIs.map(kri => {
          const existingPerm = permissions.find(p => p.kri_id === kri.kri_id);
          return {
            kri_id: kri.kri_id,
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
          kriService.getUserPermissionsSummary(user.uuid, { reporting_date: this.selectedReportingDate }),
          this.getUserRecentActivity(user.uuid)
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
    
    handleAuditFilterChange(_filters) {
      // Handle audit filter changes
    },
    
    handleExportAuditData(_data) {
      // Handle audit data export
      this.$message.info('Audit export functionality to be implemented');
    },
    
    // Permission management methods
    async updateUserPermissions(permissions) {
      // Use the globally selected reporting date
      const reportingDate = this.getCurrentReportingDate();
      
      // Convert the permissions format from dialog to the expected format
      // Each permission can have multiple actions, so we need to create individual records
      const permissionUpdates = [];
      
      for (const perm of permissions) {
        if (perm.new_actions !== perm.current_actions) { // Only update changed permissions
          if (perm.new_actions && perm.new_actions.trim()) {
            // Split actions and create individual permission records for new permissions
            const actions = perm.new_actions.split(',').map(action => action.trim());
            
            // Ensure "view" permission is always included when adding any permissions
            if (!actions.includes('view')) {
              actions.unshift('view');
            }
            
            for (const action of actions) {
              permissionUpdates.push({
                user_uuid: this.selectedUser.uuid,
                kri_id: perm.kri_id,
                action: action,
                effect: true,
                reporting_date: reportingDate
              });
            }
          } else {
            // No actions selected - deactivate existing permissions by setting effect to false
            if (perm.current_actions && perm.current_actions.trim()) {
              const currentActions = perm.current_actions.split(',').map(action => action.trim());
              for (const action of currentActions) {
                permissionUpdates.push({
                  user_uuid: this.selectedUser.uuid,
                  kri_id: perm.kri_id,
                  action: action,
                  effect: false,
                  reporting_date: reportingDate
                });
              }
            }
          }
        }
      }
      
      if (permissionUpdates.length === 0) {
        this.$message.info('No permission changes detected');
        this.userPermissionsDialogVisible = false;
        return;
      }
      
      const success = await this.bulkUpdateUserPermissions(permissionUpdates, this.currentUser.user_id);
      if (success) {
        this.userPermissionsDialogVisible = false;
        await this.refreshDepartmentUsers();
      }
    },
    
    // Helper methods
    async getUserRecentActivity(userUuid) {
      try {
        let recentActivity = [];
        const krisToCheck = [];
        
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.admin-header-left {
  flex: 1;
}

.admin-header-right {
  display: flex;
  align-items: center;
  margin-top: var(--spacing-sm);
}

.reporting-period-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.period-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  white-space: nowrap;
}

.period-select {
  min-width: 140px;
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
  
  .admin-header {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .admin-header-right {
    align-self: flex-end;
    margin-top: 0;
  }
  
  .reporting-period-selector {
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-xs);
  }
  
  .period-select {
    min-width: 120px;
  }
}
</style>