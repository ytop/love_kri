/**
 * Admin Helpers Mixin
 * Shared helper methods used across admin components
 */
export default {
  methods: {
    /**
     * Get Element UI tag type for user roles
     * @param {string} role - User role (admin, dept_admin, user)
     * @returns {string} Element UI tag type
     */
    getRoleTagType(role) {
      switch (role) {
      case 'admin': return 'danger';
      case 'dept_admin': return 'warning';
      case 'user': return 'info';
      default: return 'info';
      }
    },
    
    /**
     * Get display name for user roles
     * @param {string} role - User role
     * @returns {string} Human-readable role name
     */
    getRoleDisplayName(role) {
      switch (role) {
      case 'admin': return 'System Admin';
      case 'dept_admin': return 'Dept Admin';
      case 'user': return 'User';
      default: return role || 'User';
      }
    },
    
    /**
     * Format timestamp for display
     * @param {string|Date} timestamp - Timestamp to format
     * @returns {string} Formatted date/time string
     */
    formatDateTime(timestamp) {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString();
    },
    
    /**
     * Get Element UI tag type for audit actions
     * @param {string} action - Audit action type
     * @returns {string} Element UI tag type
     */
    getActionTagType(action) {
      if (!action) return 'info';
      const actionLower = action.toLowerCase();
      if (actionLower.includes('approve') || actionLower.includes('finalize')) return 'success';
      if (actionLower.includes('reject') || actionLower.includes('delete')) return 'danger';
      if (actionLower.includes('submit') || actionLower.includes('update')) return 'warning';
      return 'info';
    },
    
    /**
     * Format permission actions for display
     * @param {string} actions - Comma-separated permission actions
     * @returns {Array} Array of permission action strings
     */
    formatPermissionActions(actions) {
      if (!actions) return [];
      return actions.split(',').map(action => action.trim()).filter(Boolean);
    },
    
    /**
     * Get permission level display name
     * @param {string} actions - Comma-separated permission actions
     * @returns {string} Human-readable permission level
     */
    getPermissionLevelName(actions) {
      if (!actions) return 'No Access';
      const actionArray = this.formatPermissionActions(actions);
      
      if (actionArray.includes('acknowledge')) return 'KRI Owner';
      if (actionArray.includes('review')) return 'Data Provider';
      if (actionArray.includes('edit')) return 'View + Edit';
      if (actionArray.includes('view')) return 'View Only';
      return 'Custom';
    },
    
    /**
     * Generate unique ID for components
     * @param {string} prefix - Prefix for the ID
     * @returns {string} Unique ID
     */
    generateId(prefix = 'id') {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalize(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    /**
     * Safe string comparison (case-insensitive, null-safe)
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {boolean} True if strings match
     */
    stringMatch(a, b) {
      if (!a && !b) return true;
      if (!a || !b) return false;
      return a.toString().toLowerCase() === b.toString().toLowerCase();
    },
    
    /**
     * Get current reporting date in YYYYMMDD format
     * @returns {number} Current date as integer
     */
    getCurrentReportingDate() {
      const today = new Date();
      return parseInt(today.toISOString().slice(0, 10).replace(/-/g, ''));
    }
  }
};