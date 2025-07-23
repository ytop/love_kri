import { format, lastDayOfMonth, subMonths } from 'date-fns';
import Permission from '@/utils/permission';

// ---------------------------------- helper functions ----------------------------------

// ---------------------------------- table column preference helpers ----------------------------------

// Save table column preferences to localStorage
export const saveTablePreferencesToStorage = (tableType, preferences) => {
  try {
    const key = `kri-table-columns-${tableType}`;
    localStorage.setItem(key, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save table preferences to localStorage:', error);
  }
};

// Load table column preferences from localStorage
export const loadTablePreferencesFromStorage = (tableType) => {
  try {
    const key = `kri-table-columns-${tableType}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load table preferences from localStorage:', error);
    return null;
  }
};

// Clear table column preferences from localStorage
export const clearTablePreferencesFromStorage = (tableType) => {
  try {
    const key = `kri-table-columns-${tableType}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear table preferences from localStorage:', error);
  }
};

// ---------------------------------- date helpers ----------------------------------

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

// Format date from string format (YYYY-MM-DD) to integer format (YYYYMMDD)
export const formatDateToInt = (dateString) => {
  if (!dateString) return '';
  if (typeof dateString === 'number') return dateString;
  if (typeof dateString === 'string' && dateString.length === 8 && dateString.indexOf('-') === -1) {
    return parseInt(dateString, 10);
  }
  if (typeof dateString === 'string' && dateString.indexOf('-') !== -1) {
    const date = new Date(dateString);
    return parseInt(format(date, 'yyyyMMdd'), 10);
  }
  return '';
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

// Atomic-level permission patterns
export const ATOMIC_PERMISSION_PATTERNS = {
  ATOMIC_EDIT: /^atomic\d+_edit$/,
  ATOMIC_VIEW: /^atomic\d+_view$/,
  ATOMIC_REVIEW: /^atomic\d+_review$/,
  ATOMIC_ACKNOWLEDGE: /^atomic\d+_acknowledge$/,
  ATOMIC_DELETE: /^atomic\d+_delete$/
};

// Check if permission is an atomic-level permission
export const isAtomicPermission = (permission) => {
  return Object.values(ATOMIC_PERMISSION_PATTERNS).some(pattern => pattern.test(permission));
};

// Extract atomic ID from atomic permission (e.g., "atomic1_edit" -> "1")
export const getAtomicIdFromPermission = (permission) => {
  const match = permission.match(/^atomic(\d+)_/);
  return match ? parseInt(match[1], 10) : null;
};

// Helper function to calculate pending KRIs based on user permissions
export const calculatePendingKRIs = (kriItems, userPermissions) => {
  if (!Array.isArray(kriItems) || !Array.isArray(userPermissions) || userPermissions.length === 0) {
    return [];
  }
  return kriItems.filter(item => Permission.needsUserAction(item, userPermissions));
};

// Get user display name with fallback options based on database schema
export const getUserDisplayName = (user) => {
  if (!user) return 'Unknown User';
  // Prioritize User_Name, then User_ID, then Department from kri_user table schema
  return user.User_Name || user.name || user.User_ID || user.Department || user.department || 'User';
};

// ---------------------------------- Breach Status Utilities ----------------------------------

// Get Element UI tag type for breach status
export const getBreachTagType = (breachType) => {
  const typeMap = {
    'No Breach': 'success',
    'Warning': 'warning', 
    'Limit': 'danger'
  };
  return typeMap[breachType] || 'info';
};

// Get display text for breach type (with fallback)
export const getBreachDisplayText = (breachType) => {
  return breachType || 'Unknown';
};

// Get descriptive tooltip text for breach types
export const getBreachDescription = (breachType) => {
  const descriptions = {
    'No Breach': 'KRI value is within acceptable limits',
    'Warning': 'KRI value has exceeded the warning threshold',
    'Limit': 'KRI value has exceeded the limit threshold - immediate attention required'
  };
  return descriptions[breachType] || 'Breach status unknown';
};

// Calculate breach status for atomic values using parent KRI thresholds
export const calculateAtomicBreach = (atomic, kriItem) => {
  if (!atomic.atomicValue || !kriItem.warningLineValue || !kriItem.limitValue) {
    return 'No Breach';
  }
  return calculateBreachStatus(atomic.atomicValue, kriItem.warningLineValue, kriItem.limitValue);
};

// ---------------------------------- KRI Classification Utilities ----------------------------------

// Check if a KRI has calculated atomic components
export const isCalculatedKRI = (row) => {
  return row.isCalculatedKri || row.is_calculated_kri || false;
};

// Get status label with fallback for both string and numeric statuses
export const getKRIStatusLabel = (status) => {
  if (typeof status === 'string') return status;
  // Import StatusManager dynamically to avoid circular deps
  const StatusManager = require('@/utils/types').default;
  return StatusManager.mapStatus(status);
};

// ---------------------------------- Sorting Utilities ----------------------------------

// Numeric sort function for KRI ID column
export const sortNumeric = (a, b) => {
  // Handle both ID and kriId properties
  const aId = parseInt(a || 0, 10);
  const bId = parseInt(b || 0, 10);
  return aId - bId;
};

