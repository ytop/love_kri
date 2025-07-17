import { format, lastDayOfMonth, subMonths } from 'date-fns';

// Unified Status Configuration (used for both KRI and Atomic status)
const STATUS_CONFIG = {
  10: { label: 'Pending Input', tagType: 'warning', cssClass: 'status-pending' },
  20: { label: 'Under Rework', tagType: 'warning', cssClass: 'status-adjusting' },
  30: { label: 'Saved', tagType: 'info', cssClass: 'status-pending-approval' },
  40: { label: 'Submitted to Data Provider Approver', tagType: 'primary', cssClass: 'status-ready' },
  50: { label: 'Submitted to KRI Owner Approver', tagType: 'info', cssClass: 'status-submitted' },
  60: { label: 'Finalized', tagType: 'success', cssClass: 'status-approved' }
};

// Reverse mapping from status labels to numeric values
const STATUS_LABEL_TO_NUMBER = {
  'Pending Input': 10,
  'Under Rework': 20,
  'Saved': 30,
  'Submitted to Data Provider Approver': 40,
  'Submitted to KRI Owner Approver': 50,
  'Finalized': 60
};

// Export status values for use in other modules
export const STATUS_VALUES = {
  PENDING_INPUT: 10,
  UNDER_REWORK: 20,
  SAVED: 30,
  SUBMITTED_TO_DATA_PROVIDER_APPROVER: 40,
  SUBMITTED_TO_KRI_OWNER_APPROVER: 50,
  FINALIZED: 60
};

// Map status numbers to readable strings (works for both KRI and Atomic)
export const mapStatus = (status) => {
  if (status === null || status === undefined) return 'Pending Input';
  const config = STATUS_CONFIG[status];
  return config ? config.label : `Unknown (${status})`;
};

// Get status tag type for Element UI (works for both KRI and Atomic)
export const getStatusTagType = (status) => {
  if (status === null || status === undefined) return 'warning';
  const config = STATUS_CONFIG[status];
  return config ? config.tagType : '';
};

// Get status CSS class (works for both KRI and Atomic)
export const getStatusCssClass = (status) => {
  if (status === null || status === undefined) return 'status-pending';
  const config = STATUS_CONFIG[status];
  return config ? config.cssClass : 'status-na';
};

// Get status tag type from status label string (convenience function for components)
export const getStatusTagTypeFromLabel = (statusLabel) => {
  const numericStatus = STATUS_LABEL_TO_NUMBER[statusLabel];
  return getStatusTagType(numericStatus);
};

// Legacy aliases for backward compatibility (only keep the ones actually used)
export const mapKriStatus = mapStatus;
export const mapAtomicStatus = mapStatus;

// Get the last day of the previous month as default reporting date
export const getLastDayOfPreviousMonth = () => {
  const today = new Date();
  const previousMonth = subMonths(today, 1);
  const lastDay = lastDayOfMonth(previousMonth);
  return format(lastDay, 'yyyy-MM-dd');
};

// Format date from integer format (YYYYMMDD) to readable string
export const formatDateFromInt = (dateInt) => {
  if (!dateInt) return '';
  const dateString = dateInt.toString();
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  return `${year}-${month}-${day}`;
};

// Breach Status Configuration
const BREACH_STATUS_CONFIG = {
  'No Breach': {
    label: 'No Breach',
    tagType: 'success',
    description: 'KRI value is within acceptable limits'
  },
  'Warning': {
    label: 'Warning Level',
    tagType: 'warning',
    description: 'KRI value has exceeded the warning threshold'
  },
  'Limit': {
    label: 'Limit Breach',
    tagType: 'danger',
    description: 'KRI value has exceeded the limit threshold'
  },
  'Critical': {
    label: 'Critical Breach',
    tagType: 'danger',
    description: 'KRI value has significantly exceeded limits'
  }
};

// Get breach status display text
export const getBreachDisplayText = (breachType) => {
  const config = BREACH_STATUS_CONFIG[breachType] || BREACH_STATUS_CONFIG['No Breach'];
  return config.label;
};

// Get breach status tag type for Element UI
export const getBreachTagType = (breachType) => {
  const config = BREACH_STATUS_CONFIG[breachType] || BREACH_STATUS_CONFIG['No Breach'];
  return config.tagType;
};

// Get breach status description
export const getBreachDescription = (breachType) => {
  const config = BREACH_STATUS_CONFIG[breachType] || BREACH_STATUS_CONFIG['No Breach'];
  return config.description;
};

// User role configuration
export const USER_ROLES = {
  ADMIN: 'Admin',
  KRI_OWNER: 'KRI Owner',
  KRI_APPROVER: 'KRI Approver',
  DATA_PROVIDER: 'Data Provider',
  DATA_APPROVER: 'Data Approver',
  VIEWER: 'Viewer'
};

// Validate login form
export const validateLoginForm = (loginForm) => {
  const { username, department, role } = loginForm;
  
  if (!username || username.trim().length < 2) {
    return { isValid: false, message: 'Username must be at least 2 characters long' };
  }
  
  if (!department || department.trim().length === 0) {
    return { isValid: false, message: 'Department is required' };
  }
  
  if (!role || role.trim().length === 0) {
    return { isValid: false, message: 'Role is required' };
  }
  
  return { isValid: true, message: 'Valid' };
};

// Get user display name
export const getUserDisplayName = (user) => {
  if (!user || !user.name) return 'Unknown User';
  return user.name;
};

// Check if user has specific permission
export const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

// Get role permissions
export const getRolePermissions = (roleName) => {
  const rolePermissions = {
    'Admin': ['read', 'write', 'approve', 'reject', 'delete', 'save', 'submit'],
    'KRI Owner': ['read', 'write', 'save', 'submit'],
    'KRI Approver': ['read', 'approve', 'reject'],
    'Data Provider': ['read', 'write', 'save', 'submit'],
    'Data Approver': ['read', 'approve', 'reject'],
    'Viewer': ['read']
  };
  
  return rolePermissions[roleName] || [];
};

// Check if KRI owner equals data provider
export const isOwnerDataProvider = (kriItem) => {
  if (!kriItem) return false;
  return kriItem.owner === kriItem.dataProvider;
};

// Get status after input based on role and ownership
export const getInputStatus = (userRole, kriItem) => {
  if (userRole === 'KRI Owner') {
    return 50; // Submitted to KRI Owner Approver
  } else if (userRole === 'Data Provider' && !isOwnerDataProvider(kriItem)) {
    return 40; // Submitted to Data Provider Approver
  }
  return 30; // Default to Saved (this shouldn't happen in normal flow)
};

// Status transition logic
export const getNextStatus = (currentStatus, action) => {
  const transitions = {
    // Save action - goes to Saved status
    save: {
      10: 30, // Pending Input → Saved
      20: 30  // Under Rework → Saved
    },
    // Submit action - from Saved to appropriate approval status
    submit: {
      30: null // Will be determined by getInputStatus based on role
    },
    // Approve transitions
    approve: {
      40: 50, // Submitted to Data Provider Approver → Submitted to KRI Owner Approver
      50: 60  // Submitted to KRI Owner Approver → Finalized
    },
    // Reject transitions
    reject: {
      40: 20, // Submitted to Data Provider Approver → Under Rework
      50: 20  // Submitted to KRI Owner Approver → Under Rework
    }
  };

  return transitions[action]?.[currentStatus] || null;
};

// Check if user can perform action on KRI with current status
export const canPerformAction = (userRole, action, currentStatus, kriItem = null) => {
  const permissions = getRolePermissions(userRole);
  
  // Check if user has the basic permission
  if (!permissions.includes(action)) {
    return false;
  }

  // Additional role-specific checks
  switch (action) {
  case 'save':
    // KRI Owner, Data Provider, and Admin can save values
    return ['KRI Owner', 'Data Provider', 'Admin'].includes(userRole) && [10, 20].includes(currentStatus);
  
  case 'submit':
    // KRI Owner, Data Provider, and Admin can submit from Saved status
    return ['KRI Owner', 'Data Provider', 'Admin'].includes(userRole) && currentStatus === 30;
  
  case 'approve':
    // Data Approver can approve status 40 (when owner ≠ data provider)
    if (userRole === 'Data Approver') {
      return currentStatus === 40 && kriItem && !isOwnerDataProvider(kriItem);
    }
    // KRI Approver can approve status 50
    if (userRole === 'KRI Approver') {
      return currentStatus === 50;
    }
    // Admin can approve both
    if (userRole === 'Admin') {
      return [40, 50].includes(currentStatus);
    }
    return false;
  
  case 'reject':
    // Data Approver can reject status 40 (when owner ≠ data provider)
    if (userRole === 'Data Approver') {
      return currentStatus === 40 && kriItem && !isOwnerDataProvider(kriItem);
    }
    // KRI Approver can reject status 50
    if (userRole === 'KRI Approver') {
      return currentStatus === 50;
    }
    // Admin can reject both
    if (userRole === 'Admin') {
      return [40, 50].includes(currentStatus);
    }
    return false;
  
  default:
    return true;
  }
};

// Get available actions for user and KRI status
export const getAvailableActions = (userRole, currentStatus, kriItem = null) => {
  const actions = [];
  
  if (canPerformAction(userRole, 'save', currentStatus, kriItem)) {
    actions.push('save');
  }
  
  if (canPerformAction(userRole, 'submit', currentStatus, kriItem)) {
    actions.push('submit');
  }
  
  if (canPerformAction(userRole, 'approve', currentStatus, kriItem)) {
    actions.push('approve');
  }
  
  if (canPerformAction(userRole, 'reject', currentStatus, kriItem)) {
    actions.push('reject');
  }
  
  return actions;
};