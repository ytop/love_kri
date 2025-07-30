/**
 * Admin Permission Mixin
 * Shared permission management logic across admin components
 */
import { kriService } from '@/services/kriService';
import { departmentAdminService } from '@/services/departmentAdminService';

export default {
  data() {
    return {
      // Permission operation states
      permissionUpdateLoading: false,
      bulkPermissionLoading: false,
      
      // Permission templates
      permissionTemplates: {
        viewer: {
          name: 'Viewer',
          description: 'View-only access to KRIs',
          permissions: 'view'
        },
        editor: {
          name: 'Editor', 
          description: 'View and edit access to KRIs',
          permissions: 'view,edit'
        },
        dataProvider: {
          name: 'Data Provider',
          description: 'Data provider permissions including review',
          permissions: 'view,edit,review'
        },
        kriOwner: {
          name: 'KRI Owner',
          description: 'Full KRI ownership permissions',
          permissions: 'view,edit,review,acknowledge'
        }
      }
    };
  },
  
  methods: {
    /**
     * Update user permissions for multiple KRIs
     * @param {Array} permissionUpdates - Array of permission update objects
     * @param {string} userId - User performing the update
     * @returns {Promise} Update result
     */
    async bulkUpdateUserPermissions(permissionUpdates, userId) {
      this.permissionUpdateLoading = true;
      try {
        const reportingDate = this.getCurrentReportingDate();
        
        const updates = permissionUpdates.map(update => ({
          user_uuid: update.user_uuid,
          kri_id: update.kri_id,
          actions: update.actions,
          effect: update.actions ? true : false,
          reporting_date: reportingDate
        }));
        
        await kriService.bulkUpdatePermissions(updates, userId);
        this.$message.success('Permissions updated successfully');
        return true;
      } catch (error) {
        console.error('Error updating permissions:', error);
        this.$message.error('Failed to update permissions');
        return false;
      } finally {
        this.permissionUpdateLoading = false;
      }
    },
    
    /**
     * Apply permission template to users and KRIs
     * @param {string} templateKey - Permission template key
     * @param {Array} userIds - Array of user UUIDs
     * @param {Array} kriIds - Array of KRI codes
     * @param {Object} currentUser - Current user object
     * @returns {Promise} Application result
     */
    async applyPermissionTemplate(templateKey, userIds, kriIds, currentUser) {
      this.bulkPermissionLoading = true;
      try {
        const template = this.permissionTemplates[templateKey];
        if (!template) {
          throw new Error('Invalid permission template');
        }
        
        const reportingDate = this.getCurrentReportingDate();
        
        // For department admin context
        if (currentUser.user_role === 'dept_admin') {
          await departmentAdminService.applyPermissionTemplate(
            templateKey,
            userIds,
            kriIds,
            reportingDate,
            currentUser
          );
        } else {
          // For system admin context - create permission updates
          const updates = [];
          for (const userId of userIds) {
            for (const kriId of kriIds) {
              updates.push({
                user_uuid: userId,
                kri_id: kriId,
                actions: template.permissions,
                effect: true,
                reporting_date: reportingDate
              });
            }
          }
          await kriService.bulkUpdatePermissions(updates, currentUser.User_ID);
        }
        
        this.$message.success(`${template.name} template applied successfully`);
        return true;
      } catch (error) {
        console.error('Error applying permission template:', error);
        this.$message.error('Failed to apply permission template');
        return false;
      } finally {
        this.bulkPermissionLoading = false;
      }
    },
    
    /**
     * Execute bulk permission assignment
     * @param {Array} userIds - Array of user UUIDs
     * @param {Array} kriIds - Array of KRI codes
     * @param {string} actions - Permission actions string
     * @param {Object} currentUser - Current user object
     * @returns {Promise} Assignment result
     */
    async executeBulkPermissionAssignment(userIds, kriIds, actions, currentUser) {
      this.bulkPermissionLoading = true;
      try {
        const reportingDate = this.getCurrentReportingDate();
        
        // For department admin context
        if (currentUser.user_role === 'dept_admin') {
          await departmentAdminService.bulkAssignDepartmentPermissions(
            currentUser.Department,
            userIds,
            kriIds,
            actions,
            reportingDate,
            currentUser
          );
        } else {
          // For system admin context
          const updates = [];
          for (const userId of userIds) {
            for (const kriId of kriIds) {
              updates.push({
                user_uuid: userId,
                kri_id: kriId,
                actions: actions,
                effect: true,
                reporting_date: reportingDate
              });
            }
          }
          await kriService.bulkUpdatePermissions(updates, currentUser.User_ID);
        }
        
        this.$message.success('Bulk permissions assigned successfully');
        return true;
      } catch (error) {
        console.error('Error executing bulk permission assignment:', error);
        this.$message.error('Failed to assign permissions');
        return false;
      } finally {
        this.bulkPermissionLoading = false;
      }
    },
    
    /**
     * Remove user permission for specific KRI
     * @param {string} userUuid - User UUID
     * @param {string} kriId - KRI code
     * @param {string} userId - User performing the removal
     * @returns {Promise} Removal result
     */
    async removeKRIUserPermission(userUuid, kriId, userId) {
      try {
        const reportingDate = this.getCurrentReportingDate();
        
        const permissionUpdate = {
          user_uuid: userUuid,
          kri_id: kriId,
          actions: '',
          effect: false,
          reporting_date: reportingDate
        };
        
        await kriService.bulkUpdatePermissions([permissionUpdate], userId);
        this.$message.success('Permission removed successfully');
        return true;
      } catch (error) {
        console.error('Error removing permission:', error);
        this.$message.error('Failed to remove permission');
        return false;
      }
    },
    
    /**
     * Add user permission for specific KRI
     * @param {string} userUuid - User UUID
     * @param {string} kriId - KRI code
     * @param {string} actions - Permission actions
     * @param {string} userId - User performing the addition
     * @returns {Promise} Addition result
     */
    async addKRIUserPermission(userUuid, kriId, actions, userId) {
      try {
        const reportingDate = this.getCurrentReportingDate();
        
        const permissionUpdate = {
          user_uuid: userUuid,
          kri_id: kriId,
          actions: actions,
          effect: true,
          reporting_date: reportingDate
        };
        
        await kriService.bulkUpdatePermissions([permissionUpdate], userId);
        this.$message.success('Permission added successfully');
        return true;
      } catch (error) {
        console.error('Error adding permission:', error);
        this.$message.error('Failed to add permission');
        return false;
      }
    },
    
    /**
     * Validate permission actions string
     * @param {string} actions - Permission actions to validate
     * @returns {boolean} True if valid
     */
    validatePermissionActions(actions) {
      if (!actions) return true; // Empty is valid (no access)
      
      const validActions = ['view', 'edit', 'review', 'acknowledge', 'delete'];
      const actionArray = this.formatPermissionActions(actions);
      
      return actionArray.every(action => validActions.includes(action));
    },
    
    /**
     * Get permission suggestions based on user role
     * @param {string} userRole - User role
     * @returns {Array} Array of permission suggestions
     */
    getPermissionSuggestions(userRole) {
      const suggestions = [
        { label: 'No Access', value: '' },
        { label: 'View Only', value: 'view' },
        { label: 'View + Edit', value: 'view,edit' }
      ];
      
      if (userRole !== 'user') {
        suggestions.push(
          { label: 'Data Provider', value: 'view,edit,review' },
          { label: 'KRI Owner', value: 'view,edit,review,acknowledge' }
        );
      }
      
      return suggestions;
    }
  }
};