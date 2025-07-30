import { kriService } from './kriService';
import Permission from '@/utils/permission';

/**
 * Department Admin Service
 * Handles department-specific operations for department administrators
 * Provides functionality for managing users and permissions within a department
 */
class DepartmentAdminService {
  
  /**
   * Get comprehensive department overview
   * @param {string} department - Department name
   * @param {Object} currentUser - Current user making the request
   * @returns {Promise<Object>} Department overview with statistics and data
   */
  async getDepartmentOverview(department, currentUser) {
    // Validate permissions
    if (!Permission.canManageDepartment(currentUser, department)) {
      throw new Error('Insufficient permissions to access department data');
    }

    try {
      // Get basic department statistics
      const stats = await kriService.getDepartmentStatistics(department);
      
      // Get all department users with detailed info
      const users = await kriService.getUsersByDepartment(department);
      
      // Get department KRIs with metadata
      const kris = await kriService.getDepartmentKRIs(department);
      
      // Get recent KRI activity for the department
      const recentActivity = await this.getDepartmentRecentActivity(department);
      
      // Calculate pending items that need department attention
      const pendingItems = await this.getDepartmentPendingItems(department);

      return {
        ...stats,
        detailedUsers: users,
        detailedKRIs: kris,
        recentActivity,
        pendingItems,
        overview: {
          activeUsers: users.filter(u => u.user_role !== 'inactive').length,
          adminUsers: users.filter(u => Permission.isSystemAdmin(u) || Permission.isDepartmentAdmin(u)).length,
          activeKRIs: kris.length,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting department overview:', error);
      throw new Error(`Failed to get department overview: ${error.message}`);
    }
  }

  /**
   * Get department users with their KRI permissions
   * @param {string} department - Department name
   * @param {Object} currentUser - Current user making the request
   * @returns {Promise<Array>} Array of users with permission details
   */
  async getDepartmentUsersWithPermissions(department, currentUser) {
    if (!Permission.canManageDepartment(currentUser, department)) {
      throw new Error('Insufficient permissions to access department user data');
    }

    try {
      const users = await kriService.getUsersByDepartment(department);
      const usersWithPermissions = [];

      for (const user of users) {
        const permissions = await kriService.getUserPermissionsSummary(user.uuid);
        
        // Count permissions by type
        const permissionSummary = permissions.reduce((acc, perm) => {
          const actions = perm.actions.split(',').filter(a => a.trim());
          acc.totalPermissions += actions.length;
          acc.kriCount += 1;
          return acc;
        }, { totalPermissions: 0, kriCount: 0 });

        usersWithPermissions.push({
          ...user,
          permissionSummary,
          fullPermissions: permissions
        });
      }

      return usersWithPermissions;
    } catch (error) {
      console.error('Error getting department users with permissions:', error);
      throw new Error(`Failed to get department users: ${error.message}`);
    }
  }

  /**
   * Bulk assign permissions to multiple users for department KRIs
   * @param {string} department - Department name
   * @param {Array} userUuids - Array of user UUIDs
   * @param {Array} kriIds - Array of KRI IDs
   * @param {string} permissions - Comma-separated permission string
   * @param {number} reportingDate - Reporting date (YYYYMMDD format)
   * @param {Object} currentUser - Current user making the request
   * @returns {Promise<Array>} Array of updated permission records
   */
  async bulkAssignDepartmentPermissions(department, userUuids, kriIds, permissions, reportingDate, currentUser) {
    if (!Permission.canManageDepartment(currentUser, department)) {
      throw new Error('Insufficient permissions to assign department permissions');
    }

    try {
      // Validate that all KRIs belong to the department
      const departmentKRIs = await kriService.getDepartmentKRIs(department);
      const departmentKRIIds = departmentKRIs.map(kri => parseInt(kri.kri_code));
      
      const invalidKRIs = kriIds.filter(kriId => !departmentKRIIds.includes(parseInt(kriId)));
      if (invalidKRIs.length > 0) {
        throw new Error(`KRIs ${invalidKRIs.join(', ')} do not belong to department ${department}`);
      }

      // Validate that all users belong to the department
      const departmentUsers = await kriService.getUsersByDepartment(department);
      const departmentUserUuids = departmentUsers.map(user => user.uuid);
      
      const invalidUsers = userUuids.filter(uuid => !departmentUserUuids.includes(uuid));
      if (invalidUsers.length > 0) {
        throw new Error(`Users ${invalidUsers.join(', ')} do not belong to department ${department}`);
      }

      // Create permission updates array
      const permissionUpdates = [];
      for (const userUuid of userUuids) {
        for (const kriId of kriIds) {
          permissionUpdates.push({
            user_uuid: userUuid,
            kri_id: parseInt(kriId),
            reporting_date: reportingDate,
            actions: permissions,
            effect: true
          });
        }
      }

      // Execute bulk permission update
      const results = await kriService.bulkUpdatePermissions(
        permissionUpdates, 
        currentUser.user_id || currentUser.name
      );

      return results;
    } catch (error) {
      console.error('Error bulk assigning department permissions:', error);
      throw new Error(`Failed to assign department permissions: ${error.message}`);
    }
  }

  /**
   * Get recent activity for department KRIs
   * @param {string} department - Department name
   * @returns {Promise<Array>} Array of recent activity records
   * @private
   */
  async getDepartmentRecentActivity(department) {
    try {
      return await kriService.getDepartmentRecentActivity(department);
    } catch (error) {
      console.error('Error getting department recent activity:', error);
      return [];
    }
  }

  /**
   * Get pending items that need department attention
   * @param {string} department - Department name
   * @returns {Promise<Object>} Pending items summary
   * @private
   */
  async getDepartmentPendingItems(department) {
    try {
      return await kriService.getDepartmentPendingItems(department);
    } catch (error) {
      console.error('Error getting department pending items:', error);
      return { pendingApprovals: 0, pendingInputs: 0, overdueTasks: 0 };
    }
  }

  /**
   * Promote user to department admin within the department
   * @param {string} userUuid - User UUID to promote
   * @param {Object} currentUser - Current user making the request
   * @returns {Promise<Object>} Updated user record
   */
  async promoteToDepartmentAdmin(userUuid, currentUser) {
    if (!Permission.isSystemAdmin(currentUser)) {
      throw new Error('Only system administrators can promote users to department admin');
    }

    try {
      const result = await kriService.updateUserRole(
        userUuid, 
        'dept_admin', 
        currentUser.user_id || currentUser.name
      );
      
      return result;
    } catch (error) {
      console.error('Error promoting user to department admin:', error);
      throw new Error(`Failed to promote user: ${error.message}`);
    }
  }

  /**
   * Demote department admin to regular user
   * @param {string} userUuid - User UUID to demote
   * @param {Object} currentUser - Current user making the request
   * @returns {Promise<Object>} Updated user record
   */
  async demoteFromDepartmentAdmin(userUuid, currentUser) {
    if (!Permission.isSystemAdmin(currentUser)) {
      throw new Error('Only system administrators can demote department admins');
    }

    try {
      const result = await kriService.updateUserRole(
        userUuid, 
        'user', 
        currentUser.user_id || currentUser.name
      );
      
      return result;
    } catch (error) {
      console.error('Error demoting department admin:', error);
      throw new Error(`Failed to demote user: ${error.message}`);
    }
  }

  /**
   * Get permission templates for common department scenarios
   * @param {string} department - Department name
   * @returns {Object} Permission templates
   */
  getPermissionTemplates(_department) {
    return {
      viewOnly: {
        name: 'View Only',
        description: 'Can view KRI data but cannot edit',
        permissions: 'view'
      },
      dataEntry: {
        name: 'Data Entry',
        description: 'Can input and edit KRI data',
        permissions: 'view,edit'
      },
      dataProvider: {
        name: 'Data Provider',
        description: 'Can input data and review submissions',
        permissions: 'view,edit,review'
      },
      kriOwner: {
        name: 'KRI Owner',
        description: 'Full access including final approval',
        permissions: 'view,edit,review,acknowledge,delete'
      },
      departmentManager: {
        name: 'Department Manager',
        description: 'Comprehensive access for department oversight',
        permissions: 'view,edit,review,acknowledge'
      }
    };
  }

  /**
   * Apply permission template to users
   * @param {string} template - Template name
   * @param {Array} userUuids - Array of user UUIDs
   * @param {Array} kriIds - Array of KRI IDs
   * @param {number} reportingDate - Reporting date
   * @param {Object} currentUser - Current user making the request
   * @returns {Promise<Array>} Array of updated permission records
   */
  async applyPermissionTemplate(template, userUuids, kriIds, reportingDate, currentUser) {
    const templates = this.getPermissionTemplates(currentUser.department);
    
    if (!templates[template]) {
      throw new Error(`Invalid permission template: ${template}`);
    }

    const permissions = templates[template].permissions;
    
    return await this.bulkAssignDepartmentPermissions(
      currentUser.department,
      userUuids,
      kriIds,
      permissions,
      reportingDate,
      currentUser
    );
  }
}

// Export singleton instance
export const departmentAdminService = new DepartmentAdminService();
export default departmentAdminService;