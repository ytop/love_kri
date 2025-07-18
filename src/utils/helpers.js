import { format, lastDayOfMonth, subMonths } from 'date-fns';
import { KRIStatus } from '@/types/database';

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

// Export status values for use in other modules (from database.js)
export const STATUS_VALUES = KRIStatus;

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

// Calculate breach status based on KRI value, warning line, and limit value
export const calculateBreachStatus = (kriValue, warningLineValue, limitValue) => {
  // Convert values to numbers
  const value = parseFloat(kriValue);
  const warning = parseFloat(warningLineValue);
  const limit = parseFloat(limitValue);

  // Return 'No Breach' if any value is invalid
  if (isNaN(value) || isNaN(warning) || isNaN(limit)) {
    return 'No Breach';
  }

  // Check breach levels
  if (value >= limit) {
    return 'Limit';
  } else if (value >= warning) {
    return 'Warning';
  } else {
    return 'No Breach';
  }
};

// User permissions configuration
export const USER_PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit',
  REVIEW: 'review',
  ACKNOWLEDGE: 'acknowledge',
  DELETE: 'delete'
};

// Validate login form
export const validateLoginForm = (loginForm) => {
  const { username } = loginForm;
  
  if (!username || username.trim().length < 2) {
    return { isValid: false, message: 'Username must be at least 2 characters long' };
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

// Check if KRI owner equals data provider
export const isOwnerDataProvider = (kriItem) => {
  if (!kriItem) return false;
  return kriItem.owner === kriItem.dataProvider;
};

// Get status after input - determine whether to go to Data Provider Approver or KRI Owner Approver
export const getInputStatus = (userPermissions, kriItem) => {
  if (!kriItem) {
    return 40; // Default to Data Provider Approver
  }
  
  // Business logic: If KRI owner is the same as data provider, skip Data Provider Approver
  if (isOwnerDataProvider(kriItem)) {
    return 50; // Submit directly to KRI Owner Approver
  } else {
    return 40; // Submit to Data Provider Approver first
  }
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
    review: {
      30: 40, // Saved → Submitted to Data Provider Approver
    },
    approve: {
      40: 50, // Submitted to Data Provider Approver → Submitted to KRI Owner Approver
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
export const canPerformAction = (userPermissions, action, currentStatus, kriItem = null) => {
  // Check if user has the KRI-specific permission
  if (!kriItem) {
    console.log('canPerformAction: No kriItem provided');
    return false;
  }
  
  const key = `${kriItem.id}_${kriItem.reportingDate}`;
  const hasPermission = userPermissions[key]?.includes(action) || false;
  
  // Debug logging
  console.log('Permission Check:', {
    key,
    action,
    currentStatus,
    availablePermissions: userPermissions[key],
    hasPermission,
    allUserPermissions: userPermissions
  });
  
  if (!hasPermission) {
    console.log(`canPerformAction: No ${action} permission for ${key}`);
    return false;
  }

  // Additional status-based checks
  switch (action) {
  case 'edit':
    // Can edit in Pending Input, Under Rework, and Saved status
    return [10, 20, 30].includes(currentStatus);
  
  case 'review':
    // Data Provider Approver - can review status 40
    return currentStatus === 40;
  
  case 'acknowledge':
    // KRI Owner Approver - can acknowledge status 50
    return currentStatus === 50;
  
  default:
    console.log(`canPerformAction: Unknown action ${action}, returning false`); // TODO: Should change to Failed Open?
    return false;
  }
};

// Get available actions for user and KRI status
export const getAvailableActions = (userPermissions, currentStatus, kriItem = null) => {
  const actions = [];
  
  if (canPerformAction(userPermissions, 'save', currentStatus, kriItem)) {
    actions.push('save');
  }

  if (canPerformAction(userPermissions, 'edit', currentStatus, kriItem)) {
    actions.push('edit');
  }
  
  if (canPerformAction(userPermissions, 'acknowledge', currentStatus, kriItem)) {
    actions.push('acknowledge');
  }
  
  if (canPerformAction(userPermissions, 'review', currentStatus, kriItem)) {
    actions.push('review');
  }
  
  return actions;
};

// Collection Status options for filters
export const COLLECTION_STATUS_OPTIONS = [
  { label: 'Pending Input', value: 'Pending Input' },
  { label: 'Under Rework', value: 'Under Rework' },
  { label: 'Saved', value: 'Saved' },
  { label: 'Submitted to Data Provider Approver', value: 'Submitted to Data Provider Approver' },
  { label: 'Submitted to KRI Owner Approver', value: 'Submitted to KRI Owner Approver' },
  { label: 'Finalized', value: 'Finalized' }
];