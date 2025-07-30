/**
 * Admin Service
 * 
 * Centralized service for admin operations, extending existing services
 * with admin-specific functionality and business logic.
 */

import { kriService } from './kriService';
// import { departmentAdminService } from './departmentAdminService'; // will used in future
import Permission from '@/utils/permission';

class AdminService {
  
  /**
   * Get comprehensive admin dashboard data
   * @param {Object} currentUser - Current admin user
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData(currentUser) {
    if (!Permission.isSystemAdmin(currentUser)) {
      throw new Error('Insufficient permissions for admin dashboard');
    }

    try {
      const [users, departments, permissions, kris] = await Promise.all([
        kriService.getAllUsers(),
        kriService.getAllDepartments(),
        kriService.getUserPermissionsSummary(),
        this.safeGetKRIMetadata()
      ]);

      // Calculate statistics
      const usersByRole = users.reduce((acc, user) => {
        const role = user.user_role || 'user';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});

      const departmentStats = await this.calculateDepartmentStats(departments, users);

      return {
        systemStats: {
          totalUsers: users.length,
          totalDepartments: departments.length,
          totalKRIs: kris.length,
          totalPermissions: permissions.length
        },
        usersByRole,
        departmentStats,
        recentActivity: await this.getRecentActivity(currentUser)
      };
    } catch (error) {
      console.error('Error loading admin dashboard data:', error);
      throw new Error(`Failed to load dashboard data: ${error.message}`);
    }
  }

  /**
   * Get KRI metadata safely with error handling
   * @returns {Promise<Array>} KRI metadata array
   * @private
   */
  async safeGetKRIMetadata() {
    try {
      return await kriService.getAllKRIMetadata();
    } catch (error) {
      console.warn('Could not load KRI metadata:', error);
      return [];
    }
  }

  /**
   * Calculate department statistics
   * @param {Array} departments - Department list
   * @param {Array} users - User list
   * @returns {Promise<Array>} Department statistics
   * @private
   */
  async calculateDepartmentStats(departments, users) {
    const stats = [];
    
    for (const dept of departments) {
      const deptUsers = users.filter(u => u.Department === dept);
      let kriCount = 0;
      
      try {
        const deptKRIs = await kriService.getDepartmentKRIs(dept);
        kriCount = deptKRIs.length;
      } catch (error) {
        console.warn(`Could not load KRIs for department ${dept}:`, error);
      }
      
      const adminCount = deptUsers.filter(u => 
        Permission.isSystemAdmin(u) || Permission.isDepartmentAdmin(u)
      ).length;
      
      stats.push({
        name: dept,
        userCount: deptUsers.length,
        kriCount,
        adminCount
      });
    }
    
    return stats;
  }

  /**
   * Get recent administrative activity
   * @param {Object} currentUser - Current admin user
   * @returns {Promise<Array>} Recent activity records
   * @private
   */
  async getRecentActivity(currentUser) {
    // Mock implementation - in production, this would query audit trails
    return [
      {
        timestamp: new Date().toISOString(),
        action: 'Role Change',
        user: currentUser.User_ID || 'System Admin',
        target: 'User123',
        details: 'Promoted to dept_admin'
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        action: 'Permission Update',
        user: currentUser.User_ID || 'System Admin',
        target: 'KRI_001',
        details: 'Added edit permissions for User456'
      }
    ];
  }

  /**
   * Bulk user role operations
   * @param {Array} userUuids - Array of user UUIDs
   * @param {string} newRole - New role to assign
   * @param {Object} currentUser - Current admin user
   * @returns {Promise<Array>} Updated user records
   */
  async bulkUpdateUserRoles(userUuids, newRole, currentUser) {
    if (!Permission.isSystemAdmin(currentUser)) {
      throw new Error('Insufficient permissions for bulk role updates');
    }

    const validRoles = Permission.getAssignableRoles(currentUser);
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    try {
      const results = [];
      for (const userUuid of userUuids) {
        const result = await kriService.updateUserRole(
          userUuid, 
          newRole, 
          currentUser.User_ID
        );
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error in bulk role update:', error);
      throw new Error(`Failed to update user roles: ${error.message}`);
    }
  }

  /**
   * Bulk permission operations
   * @param {Array} permissionUpdates - Array of permission update objects
   * @param {Object} currentUser - Current admin user
   * @returns {Promise<Array>} Updated permission records
   */
  async bulkUpdatePermissions(permissionUpdates, currentUser) {
    if (!Permission.isSystemAdmin(currentUser)) {
      throw new Error('Insufficient permissions for bulk permission updates');
    }

    try {
      return await kriService.bulkUpdatePermissions(
        permissionUpdates, 
        currentUser.User_ID
      );
    } catch (error) {
      console.error('Error in bulk permission update:', error);
      throw new Error(`Failed to update permissions: ${error.message}`);
    }
  }

  /**
   * Get user management data with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} currentUser - Current admin user
   * @returns {Promise<Object>} Filtered user data
   */
  async getUserManagementData(filters = {}, currentUser) {
    if (!Permission.isSystemAdmin(currentUser)) {
      throw new Error('Insufficient permissions for user management data');
    }

    try {
      let users = await kriService.getAllUsers();
      
      // Apply department filter
      if (filters.department) {
        users = users.filter(user => user.Department === filters.department);
      }

      // Apply role filter
      if (filters.role) {
        users = users.filter(user => user.user_role === filters.role);
      }

      // Calculate role distribution for filtered users
      const roleCounts = users.reduce((acc, user) => {
        const role = user.user_role || 'user';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});

      return {
        users,
        roleCounts,
        total: users.length
      };
    } catch (error) {
      console.error('Error loading user management data:', error);
      throw new Error(`Failed to load user data: ${error.message}`);
    }
  }

  /**
   * Get permission management data with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} currentUser - Current admin user
   * @returns {Promise<Object>} Permission data
   */
  async getPermissionManagementData(filters = {}, currentUser) {
    if (!Permission.isSystemAdmin(currentUser)) {
      throw new Error('Insufficient permissions for permission management data');
    }

    try {
      let permissions = await kriService.getUserPermissionsSummary(filters.userUuid);
      
      // Apply department filter if specified
      if (filters.department) {
        permissions = permissions.filter(perm => 
          perm.kri_user && perm.kri_user.Department === filters.department
        );
      }

      // Enhance permission data with user information
      const enhancedPermissions = permissions.map(perm => ({
        ...perm,
        user_id: perm.kri_user ? perm.kri_user.User_ID : 'Unknown'
      }));

      return {
        permissions: enhancedPermissions,
        total: enhancedPermissions.length
      };
    } catch (error) {
      console.error('Error loading permission management data:', error);
      throw new Error(`Failed to load permission data: ${error.message}`);
    }
  }

  /**
   * Validate admin operation permissions
   * @param {Object} currentUser - Current user
   * @param {string} operation - Operation type
   * @param {Object} target - Target object (user, permission, etc.)
   * @returns {boolean} Whether operation is allowed
   */
  validateAdminOperation(currentUser, operation, target = null) {
    // System admin can perform all operations
    if (Permission.isSystemAdmin(currentUser)) {
      return true;
    }

    // Department admin has limited operations
    if (Permission.isDepartmentAdmin(currentUser)) {
      switch (operation) {
      case 'manage_department_users':
        return target && target.Department === currentUser.Department;
      case 'assign_department_permissions':
        return target && target.department === currentUser.Department;
      default:
        return false;
      }
    }

    // Regular users cannot perform admin operations
    return false;
  }

  /**
   * Log admin action for audit purposes
   * @param {string} action - Action performed
   * @param {Object} currentUser - User who performed the action
   * @param {Object} details - Action details
   * @returns {Promise<void>}
   */
  async logAdminAction(action, currentUser, details = {}) {
    try {
      // In a full implementation, this would write to an audit log
      console.log('Admin Action:', {
        action,
        user: currentUser.User_ID,
        timestamp: new Date().toISOString(),
        details
      });
      
      // Could also call kriService to log to audit trail table
      // await kriService.logAuditTrail(action, currentUser.User_ID, details);
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw - logging failures shouldn't break the operation
    }
  }

  /**
   * Get system health status
   * @param {Object} currentUser - Current admin user
   * @returns {Promise<Object>} System health indicators
   */
  async getSystemHealth(currentUser) {
    if (!Permission.isSystemAdmin(currentUser)) {
      throw new Error('Insufficient permissions for system health data');
    }

    try {
      // Test database connectivity
      const dbHealth = await this.testDatabaseHealth();
      
      // Check service availability
      const serviceHealth = await this.checkServiceHealth();
      
      return {
        database: dbHealth,
        services: serviceHealth,
        timestamp: new Date().toISOString(),
        status: dbHealth.status === 'healthy' && serviceHealth.status === 'healthy' ? 'healthy' : 'warning'
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        database: { status: 'error', message: error.message },
        services: { status: 'error', message: 'Could not check services' },
        timestamp: new Date().toISOString(),
        status: 'error'
      };
    }
  }

  /**
   * Test database health
   * @returns {Promise<Object>} Database health status
   * @private
   */
  async testDatabaseHealth() {
    try {
      // Simple database test - try to fetch user count
      const users = await kriService.getAllUsers();
      return {
        status: 'healthy',
        message: `Connected - ${users.length} users in system`,
        responseTime: 'Fast'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        responseTime: 'Timeout'
      };
    }
  }

  /**
   * Check service health
   * @returns {Promise<Object>} Service health status
   * @private
   */
  async checkServiceHealth() {
    // Mock service health check
    return {
      status: 'healthy',
      services: {
        authentication: 'operational',
        permissions: 'operational',
        kriService: 'operational'
      }
    };
  }

  /**
   * Export system data for backup/analysis
   * @param {string} exportType - Type of export (users, permissions, full)
   * @param {Object} currentUser - Current admin user
   * @returns {Promise<Object>} Export data
   */
  async exportSystemData(exportType, currentUser) {
    if (!Permission.isSystemAdmin(currentUser)) {
      throw new Error('Insufficient permissions for system export');
    }

    try {
      const exportData = {
        exportType,
        timestamp: new Date().toISOString(),
        exportedBy: currentUser.User_ID
      };

      switch (exportType) {
      case 'users':
        exportData.users = await kriService.getAllUsers();
        break;
      case 'permissions':
        exportData.permissions = await kriService.getUserPermissionsSummary();
        break;
      case 'full':
        exportData.users = await kriService.getAllUsers();
        exportData.permissions = await kriService.getUserPermissionsSummary();
        exportData.departments = await kriService.getAllDepartments();
        exportData.kris = await this.safeGetKRIMetadata();
        break;
      default:
        throw new Error(`Invalid export type: ${exportType}`);
      }

      // Log the export action
      await this.logAdminAction('system_export', currentUser, { exportType });

      return exportData;
    } catch (error) {
      console.error('Error exporting system data:', error);
      throw new Error(`Failed to export system data: ${error.message}`);
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
export default adminService;