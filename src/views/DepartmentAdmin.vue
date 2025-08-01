<template>
  <div class="department-admin">
    <div class="admin-header">
      <h1 class="admin-title">
        <i class="el-icon-office-building"></i>
        Department Administration
      </h1>
      <div class="admin-breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">Dashboard</el-breadcrumb-item>
          <el-breadcrumb-item>Department Admin</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
    </div>

    <el-card class="admin-container">
      <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
        <!-- Dashboard Tab -->
        <el-tab-pane label="Dashboard" name="dashboard">
          <department-dashboard 
            :departmentStats="departmentStats"
            @navigate-tab="handleNavigateTab"
          />
        </el-tab-pane>

        <!-- Team Management Tab -->
        <el-tab-pane label="Team Management" name="team">
          <department-team-management 
            :teamMembers="teamMembers"
            :loading="teamLoading"
            @refresh-team-data="refreshTeamData"
            @manage-user-permissions="manageUserPermissions"
            @view-user-details="viewUserDetails"
          />
        </el-tab-pane>

        <!-- Permission Management Tab -->
        <el-tab-pane label="Permission Management" name="permissions">
          <department-permission-management 
            :permissionTemplates="permissionTemplates"
            :teamMembers="teamMembers"
                        @open-bulk-permission-dialog="openBulkPermissionDialog"
            @execute-bulk-permission-assignment="executeBulkPermissionAssignment"
          />
        </el-tab-pane>

        <!-- Activity Audit Tab -->
        <el-tab-pane label="Activity Audit" name="audit">
          <department-activity-audit 
            :auditStats="auditStats"
            :auditTrailData="auditTrailData"
            :loading="auditLoading"
            @load-audit-data="loadAuditData"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Dialogs -->
    <bulk-permission-template-dialog
      :visible.sync="bulkPermissionDialogVisible"
      :selectedTemplate="selectedTemplate"
      :permissionTemplates="permissionTemplates"
      :teamMembers="teamMembers"
            :templateApplyLoading="templateApplyLoading"
      @apply-permission-template="applyPermissionTemplate"
    />

    <user-permissions-dialog
      :visible.sync="userPermissionsDialogVisible"
      :selectedUser="selectedUser"
      :editablePermissions="editablePermissions"
      :userPermissionsLoading="userPermissionsLoading"
      :permissionUpdateLoading="permissionUpdateLoading"
      @update-user-permissions="updateUserPermissions"
    />

    <user-details-dialog
      :visible.sync="userDetailsDialogVisible"
      :userDetailData="userDetailData"
      :userDetailsLoading="userDetailsLoading"
    />


  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { departmentAdminService } from '@/services/departmentAdminService';
import { kriService } from '@/services/kriService';
import Permission from '@/utils/permission';
import DepartmentTeamManagement from '@/components/departmentAdmin/DepartmentTeamManagement.vue';
import DepartmentPermissionManagement from '@/components/departmentAdmin/DepartmentPermissionManagement.vue';
import DepartmentActivityAudit from '@/components/departmentAdmin/DepartmentActivityAudit.vue';
import UserPermissionsDialog from '@/components/departmentAdmin/dialogs/UserPermissionsDialog.vue';
import UserDetailsDialog from '@/components/departmentAdmin/dialogs/UserDetailsDialog.vue';
import BulkPermissionTemplateDialog from '@/components/departmentAdmin/dialogs/BulkPermissionTemplateDialog.vue';
import '@/assets/styles/admin.css';


import DepartmentDashboard from '@/components/departmentAdmin/DepartmentDashboard.vue';

export default {
  name: 'DepartmentAdmin',
  
  components: {
    DepartmentDashboard,
    DepartmentTeamManagement,
    DepartmentPermissionManagement,
    DepartmentActivityAudit,
    UserPermissionsDialog,
    UserDetailsDialog,
    BulkPermissionTemplateDialog
  },
  
  data() {
    return {
      activeTab: 'dashboard',
      
      // Department data
      departmentStats: {
        totalUsers: 0,
        usersByRole: {},
        pendingItems: {
          pendingApprovals: 0,
          pendingInputs: 0,
          overdueTasks: 0
        }
      },
      
      // Team management
      teamMembers: [],
      teamLoading: false,
      
      // Permission management
      bulkPermissionUsers: [],
      bulkPermissionActions: '',
      bulkPermissionLoading: false,
      
      // Audit data
      auditStats: {
        totalActivities: 0,
        todayActivities: 0,
        uniqueUsers: 0
      },
      
      // Dialog data
      bulkPermissionDialogVisible: false,
      selectedTemplate: '',
      dialogBulkUsers: [],
      templateApplyLoading: false,
      
      // User Permissions Dialog
      userPermissionsDialogVisible: false,
      selectedUser: null,
      userCurrentPermissions: [],
      editablePermissions: [],
      userPermissionsLoading: false,
      permissionUpdateLoading: false,
      
      // User Details Dialog
      userDetailsDialogVisible: false,
      userDetailData: null,
      userDetailsLoading: false,
      
      // Audit Trail
      auditTrailData: [],
      auditLoading: false,
      auditDateRange: [],
      auditTypeFilter: ''
    };
  },
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    permissionTemplates() {
      return departmentAdminService.getPermissionTemplates(this.currentUser.department);
    }
  },
  async mounted() {
    // Verify department admin access
    if (!Permission.isDepartmentAdmin(this.currentUser) && !Permission.isSystemAdmin(this.currentUser)) {
      this.$message.error('Access denied. Department administrator privileges required.');
      this.$router.push('/');
      return;
    }
    
    await this.loadDepartmentData();
  },
  methods: {
    handleNavigateTab(tabName) {
      this.activeTab = tabName;
    },
    
    async loadDepartmentData() {
      try {
        // Load department overview
        const overview = await departmentAdminService.getDepartmentOverview(
          this.currentUser.department, 
          this.currentUser
        );
        
        this.departmentStats = overview;
        this.teamMembers = overview.detailedUsers || [];
        
        // Load team members with permissions
        await this.loadTeamMembersWithPermissions();
        
      } catch (error) {
        console.error('Error loading department data:', error);
        this.$message.error('Failed to load department data');
      }
    },
    
    async loadTeamMembersWithPermissions() {
      try {
        this.teamMembers = await departmentAdminService.getDepartmentUsersWithPermissions(
          this.currentUser.department,
          this.currentUser
        );
      } catch (error) {
        console.error('Error loading team members with permissions:', error);
        this.$message.error('Failed to load team member permissions');
      }
    },
    
    async handleTabClick(tab) {
      switch (tab.name) {
      case 'team':
        if (this.teamMembers.length === 0) {
          await this.refreshTeamData();
        }
        break;
      case 'audit':
        if (this.auditTrailData.length === 0) {
          await this.loadAuditData();
        }
        break;
      }
    },
    
    async refreshTeamData() {
      this.teamLoading = true;
      try {
        await this.loadTeamMembersWithPermissions();
        this.$message.success('Team data refreshed');
      } catch (error) {
        console.error('Error refreshing team data:', error);
        this.$message.error('Failed to refresh team data');
      } finally {
        this.teamLoading = false;
      }
    },
    
    async loadAuditData() {
      this.auditLoading = true;
      try {
        // Load department-specific audit trail data
        let auditData = [];
        
        // Get general department audit data
        // Note: This section was modified to remove KRI-specific audit loading
        
        // Filter by date range if specified
        if (this.auditDateRange && this.auditDateRange.length === 2) {
          const startDate = new Date(this.auditDateRange[0]);
          const endDate = new Date(this.auditDateRange[1]);
          endDate.setHours(23, 59, 59, 999); // Include the entire end date
          
          auditData = auditData.filter(item => {
            const itemDate = new Date(item.changed_at);
            return itemDate >= startDate && itemDate <= endDate;
          });
        }
        
        // Filter by activity type if specified
        if (this.auditTypeFilter) {
          auditData = auditData.filter(item => 
            item.action && item.action.toLowerCase().includes(this.auditTypeFilter.replace('_', ' '))
          );
        }
        
        // Sort by date (newest first)
        auditData.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));
        
        this.auditTrailData = auditData;
        
        // Update audit statistics
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayActivities = auditData.filter(item => 
          new Date(item.changed_at) >= todayStart
        ).length;
        
        const uniqueUsers = new Set(auditData.map(item => item.changed_by)).size;
        
        this.auditStats = {
          totalActivities: auditData.length,
          todayActivities,
          uniqueUsers
        };
        
      } catch (error) {
        console.error('Error loading audit data:', error);
        this.$message.error('Failed to load audit trail data');
      } finally {
        this.auditLoading = false;
      }
    },
    
    async manageUserPermissions(user) {
      this.selectedUser = user;
      this.userPermissionsLoading = true;
      this.userPermissionsDialogVisible = true;
      
      try {
        // Load user's current permissions
        this.userCurrentPermissions = await kriService.getUserPermissionsSummary(user.uuid);
        
        // Transform permissions for editing
        this.editablePermissions = [];
      } catch (error) {
        console.error('Error loading user permissions:', error);
        this.$message.error('Failed to load user permissions');
      } finally {
        this.userPermissionsLoading = false;
      }
    },
    
    async viewUserDetails(user) {
      this.selectedUser = user;
      this.userDetailsLoading = true;
      this.userDetailsDialogVisible = true;
      
      try {
        // Load detailed user information
        const [permissions, recentActivity] = await Promise.all([
          kriService.getUserPermissionsSummary(user.uuid),
          this.getUserRecentActivity(user.uuid)
        ]);
        
        this.userDetailData = {
          ...user,
          permissions,
          recentActivity,
          permissionSummary: {
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
    
    openBulkPermissionDialog(templateKey) {
      this.selectedTemplate = templateKey;
      this.dialogBulkUsers = [];
      this.bulkPermissionDialogVisible = true;
    },
    
    async applyPermissionTemplate() {
      if (!this.selectedTemplate || !this.dialogBulkUsers.length) {
        return;
      }
      
      this.templateApplyLoading = true;
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        await departmentAdminService.applyPermissionTemplate(
          this.selectedTemplate,
          this.dialogBulkUsers,
          reportingDate,
          this.currentUser
        );
        
        this.$message.success('Permission template applied successfully');
        this.bulkPermissionDialogVisible = false;
        await this.loadTeamMembersWithPermissions();
      } catch (error) {
        console.error('Error applying permission template:', error);
        this.$message.error('Failed to apply permission template');
      } finally {
        this.templateApplyLoading = false;
      }
    },
    
    async executeBulkPermissionAssignment() {
      if (!this.bulkPermissionUsers.length || !this.bulkPermissionActions) {
        return;
      }
      
      this.bulkPermissionLoading = true;
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        await departmentAdminService.bulkAssignDepartmentPermissions(
          this.currentUser.department,
          this.bulkPermissionUsers,
          this.bulkPermissionActions,
          reportingDate,
          this.currentUser
        );
        
        this.$message.success('Bulk permissions assigned successfully');
        this.bulkPermissionUsers = [];
        this.bulkPermissionActions = '';
        await this.loadTeamMembersWithPermissions();
      } catch (error) {
        console.error('Error executing bulk permission assignment:', error);
        this.$message.error('Failed to assign permissions');
      } finally {
        this.bulkPermissionLoading = false;
      }
    },
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
    
    // Helper methods for new functionality
    async getUserRecentActivity(_userUuid) {
      try {
        // KRI-related audit loading removed - return empty activity for now
        let recentActivity = [];
        
        // Sort by date and return recent 10 items
        return recentActivity
          .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
          .slice(0, 10);
      } catch (error) {
        console.error('Error loading user recent activity:', error);
        return [];
      }
    },
    
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
    },
    
    async updateUserPermissions() {
      if (!this.selectedUser || !this.editablePermissions.length) return;
      
      this.permissionUpdateLoading = true;
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        // Update permissions for each KRI that has changes
        for (const perm of this.editablePermissions) {
          if (perm.current_actions !== perm.new_actions) {
            const permissionUpdate = {
              user_uuid: this.selectedUser.uuid,
              kri_id: perm.kri_id,
              actions: perm.new_actions,
              effect: perm.new_actions ? true : false,
              reporting_date: reportingDate
            };
            
            await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.user_id);
          }
        }
        
        this.$message.success('User permissions updated successfully');
        this.userPermissionsDialogVisible = false;
        await this.loadTeamMembersWithPermissions();
      } catch (error) {
        console.error('Error updating user permissions:', error);
        this.$message.error('Failed to update user permissions');
      } finally {
        this.permissionUpdateLoading = false;
      }
    },
    
  }
};
</script>

<style scoped>
/* Main DepartmentAdmin orchestration component - minimal styling */
/* All component-specific styles are now in extracted components and admin.css */

.department-admin {
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
  .department-admin {
    padding: var(--spacing-sm);
  }
}
</style>