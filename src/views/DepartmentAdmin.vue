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
            :departmentKRIs="departmentKRIs"
            @open-bulk-permission-dialog="openBulkPermissionDialog"
            @execute-bulk-permission-assignment="executeBulkPermissionAssignment"
          />
        </el-tab-pane>

        <!-- Department KRIs Tab -->
        <el-tab-pane label="department KRIs" name="kris">
          <department-kri-management 
            :departmentKRIs="departmentKRIs"
            :loading="krisLoading"
            @refresh-kri-data="refreshKRIData"
            @manage-kri-permissions="manageKRIPermissions"
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
      :departmentKRIs="departmentKRIs"
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

    <kri-permissions-dialog
      :visible.sync="kriPermissionsDialogVisible"
      :selectedKRI="selectedKRI"
      :kriUserPermissions="kriUserPermissions"
      :availableUsersForKRI="availableUsersForKRI"
      :kriPermissionsLoading="kriPermissionsLoading"
      @add-kri-user-permission="addKRIUserPermission"
      @remove-kri-user-permission="removeKRIUserPermission"
    />

  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { departmentAdminService } from '@/services/departmentAdminService';
import { kriService } from '@/services/kriService';
import Permission from '@/utils/permission';
import DepartmentDashboard from '@/components/departmentAdmin/DepartmentDashboard.vue';
import DepartmentTeamManagement from '@/components/departmentAdmin/DepartmentTeamManagement.vue';
import DepartmentPermissionManagement from '@/components/departmentAdmin/DepartmentPermissionManagement.vue';
import DepartmentActivityAudit from '@/components/departmentAdmin/DepartmentActivityAudit.vue';
import UserPermissionsDialog from '@/components/departmentAdmin/dialogs/UserPermissionsDialog.vue';
import UserDetailsDialog from '@/components/departmentAdmin/dialogs/UserDetailsDialog.vue';
import BulkPermissionTemplateDialog from '@/components/departmentAdmin/dialogs/BulkPermissionTemplateDialog.vue';
import '@/assets/styles/admin.css';

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
        totalKRIs: 0,
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
      bulkPermissionKRIs: [],
      bulkPermissionActions: '',
      bulkPermissionLoading: false,
      
      // Department KRIs
      departmentKRIs: [],
      krisLoading: false,
      
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
      dialogBulkKRIs: [],
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
      
      // KRI Permissions Dialog
      kriPermissionsDialogVisible: false,
      selectedKRI: null,
      kriUserPermissions: [],
      availableUsersForKRI: [],
      kriPermissionsLoading: false,
      newUserPermissions: {
        user_uuid: '',
        actions: ''
      },
      
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
        this.departmentKRIs = overview.detailedKRIs || [];
        
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
      case 'kris':
        if (this.departmentKRIs.length === 0) {
          await this.refreshKRIData();
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
    
    async refreshKRIData() {
      this.krisLoading = true;
      try {
        this.departmentKRIs = await kriService.getDepartmentKRIs(this.currentUser.department);
        this.$message.success('KRI data refreshed');
      } catch (error) {
        console.error('Error refreshing KRI data:', error);
        this.$message.error('Failed to refresh KRI data');
      } finally {
        this.krisLoading = false;
      }
    },
    
    async loadAuditData() {
      this.auditLoading = true;
      try {
        // Load department-specific audit trail data
        let auditData = [];
        
        // Get audit data for all department KRIs
        for (const kri of this.departmentKRIs) {
          try {
            const kriAudit = await kriService.fetchKRIAuditTrail(kri.kri_code, '*');
            auditData = auditData.concat(kriAudit || []);
          } catch (error) {
            console.warn(`Failed to load audit data for KRI ${kri.kri_code}:`, error);
          }
        }
        
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
        this.editablePermissions = this.departmentKRIs.map(kri => {
          const existingPerm = this.userCurrentPermissions.find(p => p.kri_id === kri.kri_code);
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
    
    async manageKRIPermissions(kri) {
      this.selectedKRI = kri;
      this.kriPermissionsLoading = true;
      this.kriPermissionsDialogVisible = true;
      
      try {
        // Load all users who have permissions on this KRI
        const allPermissions = await kriService.getUserPermissionsSummary();
        this.kriUserPermissions = allPermissions
          .filter(p => p.kri_id === kri.kri_code)
          .map(p => ({
            ...p,
            user_name: p.kri_user ? p.kri_user.user_name : 'Unknown',
            user_id: p.kri_user ? p.kri_user.user_id : 'Unknown',
            user_department: p.kri_user ? p.kri_user.department : 'Unknown'
          }));
          
        // Prepare available users for assignment (department members without current permissions)
        this.availableUsersForKRI = this.teamMembers.filter(member => 
          !this.kriUserPermissions.some(p => p.user_uuid === member.uuid)
        );
      } catch (error) {
        console.error('Error loading KRI permissions:', error);
        this.$message.error('Failed to load KRI permissions');
      } finally {
        this.kriPermissionsLoading = false;
      }
    },
    
    openBulkPermissionDialog(templateKey) {
      this.selectedTemplate = templateKey;
      this.dialogBulkUsers = [];
      this.dialogBulkKRIs = [];
      this.bulkPermissionDialogVisible = true;
    },
    
    async applyPermissionTemplate() {
      if (!this.selectedTemplate || !this.dialogBulkUsers.length || !this.dialogBulkKRIs.length) {
        return;
      }
      
      this.templateApplyLoading = true;
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        await departmentAdminService.applyPermissionTemplate(
          this.selectedTemplate,
          this.dialogBulkUsers,
          this.dialogBulkKRIs,
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
      if (!this.bulkPermissionUsers.length || !this.bulkPermissionKRIs.length || !this.bulkPermissionActions) {
        return;
      }
      
      this.bulkPermissionLoading = true;
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        await departmentAdminService.bulkAssignDepartmentPermissions(
          this.currentUser.department,
          this.bulkPermissionUsers,
          this.bulkPermissionKRIs,
          this.bulkPermissionActions,
          reportingDate,
          this.currentUser
        );
        
        this.$message.success('Bulk permissions assigned successfully');
        this.bulkPermissionUsers = [];
        this.bulkPermissionKRIs = [];
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
    async getUserRecentActivity(userUuid) {
      try {
        // Get recent audit trail entries for this user across department KRIs
        let recentActivity = [];
        for (const kri of this.departmentKRIs.slice(0, 5)) { // Limit to avoid too many requests
          try {
            const kriAudit = await kriService.fetchKRIAuditTrail(kri.kri_code, '*');
            const userActivity = (kriAudit || []).filter(item => item.changed_by === userUuid);
            recentActivity = recentActivity.concat(userActivity);
          } catch (error) {
            console.warn(`Failed to load activity for KRI ${kri.kri_code}:`, error);
          }
        }
        
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
    
    async addKRIUserPermission() {
      if (!this.newUserPermissions.user_uuid || !this.newUserPermissions.actions || !this.selectedKRI) {
        return;
      }
      
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        const permissionUpdate = {
          user_uuid: this.newUserPermissions.user_uuid,
          kri_id: this.selectedKRI.kri_code,
          actions: this.newUserPermissions.actions,
          effect: true,
          reporting_date: reportingDate
        };
        
        await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.user_id);
        
        this.$message.success('KRI permission added successfully');
        this.newUserPermissions = { user_uuid: '', actions: '' };
        await this.manageKRIPermissions(this.selectedKRI); // Refresh data
      } catch (error) {
        console.error('Error adding KRI permission:', error);
        this.$message.error('Failed to add KRI permission');
      }
    },
    
    async removeKRIUserPermission(permission) {
      try {
        const reportingDate = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        
        const permissionUpdate = {
          user_uuid: permission.user_uuid,
          kri_id: permission.kri_id,
          actions: '',
          effect: false,
          reporting_date: reportingDate
        };
        
        await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.user_id);
        
        this.$message.success('KRI permission removed successfully');
        await this.manageKRIPermissions(this.selectedKRI); // Refresh data
      } catch (error) {
        console.error('Error removing KRI permission:', error);
        this.$message.error('Failed to remove KRI permission');
      }
    }
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