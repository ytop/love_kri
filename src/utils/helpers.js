import { format, lastDayOfMonth, subMonths } from 'date-fns';
import { kriService } from '@/services/kriService';
// Import status management from centralized StatusManager
import StatusManager, { 
  STATUS_VALUES, 
  mapStatus, 
  getStatusTagType, 
  getStatusCssClass, 
  getStatusTagTypeFromLabel,
  mapKriStatus,
  mapAtomicStatus
} from './StatusManager';
// Import permission management from centralized PermissionManager
import PermissionManager from './PermissionManager';
// Import action management from centralized ActionManager
import ActionManager from './ActionManager';

// Re-export status functions for backward compatibility
export { 
  STATUS_VALUES, 
  mapStatus, 
  getStatusTagType, 
  getStatusCssClass, 
  getStatusTagTypeFromLabel,
  mapKriStatus,
  mapAtomicStatus,
  StatusManager
};

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

// Atomic-level permission patterns (for future use)
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

// Check if user can view a specific KRI based on permissions with effect field
export const canViewKRI = (userPermissions, kriId, reportingDate) => {
  if (!userPermissions || !kriId || !reportingDate) return true; // Default: allow view
  
  const key = `${kriId}_${reportingDate}`;
  const permissions = userPermissions[key] || [];
  
  // Check for view permissions with different effects
  const viewPermissions = permissions.filter(perm => 
    typeof perm === 'object' && perm.action === 'view'
  );
  
  if (viewPermissions.length === 0) {
    return true; // Default: allow view if no explicit view permissions
  }
  
  // Check for conflicting permissions (both true and false effect)
  const allowPermissions = viewPermissions.filter(perm => perm.effect === true);
  const denyPermissions = viewPermissions.filter(perm => perm.effect === false);
  
  if (allowPermissions.length > 0 && denyPermissions.length > 0) {
    console.log(`Permission conflict for KRI ${kriId}_${reportingDate}: both allow and deny view permissions exist. Denying access.`);
    return false; // Prioritize denial when there's conflict
  }
  
  // If only deny permissions exist, deny access
  if (denyPermissions.length > 0) {
    return false;
  }
  
  // If only allow permissions exist, allow access
  if (allowPermissions.length > 0) {
    return true;
  }
  
  return true; // Default fallback
};

// Re-export permission functions for backward compatibility
export const isOwnerDataProvider = PermissionManager.isOwnerDataProvider.bind(PermissionManager);
export const getInputStatus = PermissionManager.getInputStatus.bind(PermissionManager);
export const getNextStatus = PermissionManager.getNextStatus.bind(PermissionManager);

export const canPerformAction = PermissionManager.canPerformAction.bind(PermissionManager);

// Re-export ActionManager functions for backward compatibility
export const getAvailableActions = (userPermissions, currentStatus, kriItem = null, atomicId = null) => {
  if (atomicId !== null && atomicId !== undefined) {
    // For atomic-level actions
    return ActionManager.getAtomicActions(userPermissions, kriItem, atomicId, currentStatus)
      .map(action => action.name);
  }
  
  // For KRI-level actions
  return ActionManager.getAvailableActions(userPermissions, kriItem, currentStatus)
    .map(action => action.name);
};

// Collection Status options for filters - using StatusManager for consistency
export const COLLECTION_STATUS_OPTIONS = StatusManager.getAllStatusOptions().map(option => ({
  label: option.label,
  value: option.label // Use label as value for backward compatibility
}));

// Validate database synchronization
export const validateDatabaseSync = async (kriId, reportingDate, expectedStatus, store) => {
  try {
    console.log('Validating database sync for KRI:', { kriId, reportingDate, expectedStatus });
    
    // Fetch fresh data from database
    const formattedDate = typeof reportingDate === 'string' ? reportingDate : formatDateFromInt(reportingDate);
    const freshData = await kriService.fetchKRIDetail(kriId, formattedDate);
    
    if (!freshData) {
      console.warn('No data returned from database for validation');
      return { isValid: false, reason: 'No data found' };
    }
    
    const actualStatus = freshData.kri_status;
    const isValid = actualStatus === expectedStatus;
    
    if (!isValid) {
      console.warn('Database status mismatch detected:', {
        kriId,
        reportingDate,
        expected: expectedStatus,
        actual: actualStatus,
        expectedLabel: mapStatus(expectedStatus),
        actualLabel: mapStatus(actualStatus)
      });
      
      // Update local store with correct database status
      if (store) {
        store.commit('kri/SET_KRI_DETAIL', freshData);
        
        // Also update the KRI items list
        const kriItems = [...store.state.kri.kriItems];
        const kriIndex = kriItems.findIndex(item => 
          item.id === String(kriId) && item.reportingDate === String(reportingDate)
        );
        
        if (kriIndex !== -1) {
          kriItems[kriIndex] = {
            ...kriItems[kriIndex],
            collectionStatus: mapStatus(actualStatus),
            rawData: {
              ...kriItems[kriIndex].rawData,
              kri_status: actualStatus
            }
          };
          store.commit('kri/SET_KRI_ITEMS', kriItems);
        }
      }
    }
    
    return {
      isValid,
      expectedStatus,
      actualStatus,
      reason: isValid ? 'Status matches' : 'Status mismatch detected and corrected'
    };
  } catch (error) {
    console.error('Error validating database sync:', error);
    return { isValid: false, reason: error.message };
  }
};

// Auto-validation helper for components
export const autoValidateSync = (kriId, reportingDate, expectedStatus, component) => {
  if (!component || !component.$store) return;
  
  // Delay validation to allow database operations to complete
  setTimeout(async () => {
    const result = await validateDatabaseSync(kriId, reportingDate, expectedStatus, component.$store);
    
    if (!result.isValid) {
      console.log('Auto-validation detected sync issue, refreshing component data');
      // Emit refresh event if component supports it
      if (component.$emit) {
        component.$emit('data-sync-issue', result);
      }
    }
  }, 2000); // Wait 2 seconds for database operations to complete
};