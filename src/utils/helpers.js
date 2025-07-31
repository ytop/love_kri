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

// Generate available reporting periods (current month and last N months)
export const generateReportingPeriods = (monthsCount = 6) => {
  const periods = [];
  const today = new Date();
  
  // Generate current month and last N-1 months (0, -1, -2, -3, -4, -5...)
  for (let i = 0; i < monthsCount; i++) {
    // Get the target month and year
    const targetMonth = today.getMonth() - i;
    const targetYear = today.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    
    // Get last day of the target month
    const periodDate = new Date(targetYear, normalizedMonth + 1, 0);
    const label = periodDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    const value = formatDateToInt(periodDate.toISOString().slice(0, 10));
    
    periods.push({
      label: label,
      value: value,
      date: periodDate
    });
  }
  
  return periods;
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
    // Parse date string manually to avoid timezone issues
    // I have so many questions about this
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return parseInt(year + month + day, 10);
    }
    // Fallback to date-fns for other formats
    const date = new Date(dateString);
    return parseInt(format(date, 'yyyyMMdd'), 10);
  }
  console.warn('Failed to format date to int:', dateString);
  return '';
};

// Calculate breach status based on KRI value with support for 4 limit types
export const calculateBreachStatus = (kriValue, warningLineValue, limitValue, negativeWarning, negativeLimit) => {
  // Convert values to numbers
  const value = parseFloat(kriValue);
  const warning = parseFloat(warningLineValue);
  const limit = parseFloat(limitValue);
  const negWarn = parseFloat(negativeWarning);
  const negLim = parseFloat(negativeLimit);

  // Return 'No Breach' if value is invalid
  if (isNaN(value)) {
    return 'No Breach';
  }

  // Check positive limit breaches first (highest priority)
  if (!isNaN(limit) && value >= limit) {
    return 'Limit';
  }

  // Check negative limit breaches (second highest priority)
  if (!isNaN(negLim) && value <= negLim) {
    return 'Limit';
  }

  // Check positive warning breaches
  if (!isNaN(warning) && value >= warning) {
    return 'Warning';
  }

  // Check negative warning breaches
  if (!isNaN(negWarn) && value <= negWarn) {
    return 'Warning';
  }

  return 'No Breach';
};

// Calculate breach status for a KRI using its data object
export const calculateBreachStatusForKRI = (kriValue, kriData) => {
  if (!kriData) {
    return 'No Breach';
  }
  
  return calculateBreachStatus(
    kriValue,
    kriData.warning_line_value || kriData.warningLineValue,
    kriData.limit_value || kriData.limitValue,
    kriData.negative_warning || kriData.negativeWarning,
    kriData.negative_limit || kriData.negativeLimit
  );
};

// Atomic-level permission patterns (updated for dot notation)
export const ATOMIC_PERMISSION_PATTERNS = {
  ATOMIC_EDIT: /^atomic\d+\.edit$/,
  ATOMIC_VIEW: /^atomic\d+\.view$/,
  ATOMIC_REVIEW: /^atomic\d+\.review$/,
  ATOMIC_ACKNOWLEDGE: /^atomic\d+\.acknowledge$/,
  ATOMIC_DELETE: /^atomic\d+\.delete$/
};

// Check if permission is an atomic-level permission
export const isAtomicPermission = (permission) => {
  return Object.values(ATOMIC_PERMISSION_PATTERNS).some(pattern => pattern.test(permission));
};

// Extract atomic ID from atomic permission (e.g., "atomic1.edit" -> "1")
export const getAtomicIdFromPermission = (permission) => {
  const match = permission.match(/^atomic(\d+)\./);
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
  // Prioritize user_name, then user_id, then department from kri_user table schema (lowercase columns)
  return user.user_name || user.name || user.user_id || user.department || 'User';
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
  if (!atomic.atomicValue) {
    return 'No Breach';
  }
  return calculateBreachStatus(
    atomic.atomicValue, 
    kriItem.warningLineValue, 
    kriItem.limitValue,
    kriItem.negativeWarning,
    kriItem.negativeLimit
  );
};

// Calculate warning bar data for inline risk level display
export const calculateWarningBarData = (kriValue, warningLineValue, limitValue, negativeWarning, negativeLimit) => {
  // Convert values to numbers
  const value = parseFloat(kriValue);
  const warning = parseFloat(warningLineValue);
  const limit = parseFloat(limitValue);
  const negWarn = parseFloat(negativeWarning);
  const negLim = parseFloat(negativeLimit);

  // Default safe state
  const result = {
    percentage: 0,
    color: 'safe',
    severity: 'safe',
    showIcon: false,
    tooltip: 'No threshold data available'
  };

  // Return default if no valid value
  if (isNaN(value)) {
    result.tooltip = 'No KRI value';
    return result;
  }

  // Check positive thresholds first (warning < limit)
  if (!isNaN(warning) && !isNaN(limit)) {
    if (value >= limit) {
      result.percentage = 100;
      result.color = 'breach';
      result.severity = 'limit';
      result.showIcon = true;
      result.tooltip = `LIMIT BREACH: ${value} ≥ ${limit} (Limit)`;
    } else if (value >= warning) {
      result.percentage = 100;
      result.color = 'caution';
      result.severity = 'warning';
      result.showIcon = true;
      result.tooltip = `WARNING: ${value} ≥ ${warning} (Warning Line)`;
    } else {
      // Calculate percentage to warning threshold
      result.percentage = Math.max(0, Math.min(100, (value / warning) * 100));
      if (result.percentage >= 70) {
        result.color = 'caution';
        result.showIcon = true;
        result.tooltip = `APPROACHING WARNING: ${value} (${result.percentage.toFixed(1)}% of warning threshold)`;
      } else {
        result.color = 'safe';
        result.tooltip = `SAFE: ${value} (${result.percentage.toFixed(1)}% of warning threshold)`;
      }
    }
    return result;
  }

  // Check negative thresholds (negativeWarning > negativeLimit, lower values are worse)
  if (!isNaN(negWarn) && !isNaN(negLim)) {
    if (value <= negLim) {
      result.percentage = 100;
      result.color = 'breach';
      result.severity = 'limit';
      result.showIcon = true;
      result.tooltip = `NEGATIVE LIMIT BREACH: ${value} ≤ ${negLim} (Negative Limit)`;
    } else if (value <= negWarn) {
      result.percentage = 100;
      result.color = 'caution';
      result.severity = 'warning';
      result.showIcon = true;
      result.tooltip = `NEGATIVE WARNING: ${value} ≤ ${negWarn} (Negative Warning)`;
    } else {
      // Calculate percentage approach to negative warning (inverted logic)
      const range = negWarn - negLim;
      const position = value - negLim;
      result.percentage = Math.max(0, Math.min(100, 100 - ((position / range) * 100)));
      if (result.percentage >= 70) {
        result.color = 'caution';
        result.showIcon = true;
        result.tooltip = `APPROACHING NEGATIVE WARNING: ${value} (${result.percentage.toFixed(1)}% risk level)`;
      } else {
        result.color = 'safe';
        result.tooltip = `SAFE: ${value} (${result.percentage.toFixed(1)}% risk level)`;
      }
    }
    return result;
  }

  // No valid thresholds
  result.tooltip = `Value: ${value} (No thresholds configured)`;
  return result;
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

// ---------------------------------- KRI Detail Utilities ----------------------------------

// Date formatting for KRI detail display (extends existing formatDateFromInt)
export const formatReportingDate = (dateInt) => {
  if (!dateInt) return 'N/A';
  return formatDateFromInt(dateInt);
};

// Navigation helper for KRI detail back button
export const createGoBackHandler = (router, fallbackRoute = 'Dashboard') => {
  return function() {
    if (window.history.length > 1) {
      router.go(-1);
    } else {
      router.push({ name: fallbackRoute });
    }
  };
};

// Generate available actions for KRI detail based on status and permissions
export const generateKRIDetailActions = (kriDetail, canPerformFn, evidenceData = [], currentValue = null) => {
  if (!kriDetail || !canPerformFn) return [];
  
  const actions = [];
  const status = kriDetail.kri_status || kriDetail.kriStatus;
  const kriId = kriDetail.kri_id || kriDetail.kriId;
  const source = kriDetail.source;
  
  // Check validation requirements
  const canSave = canSaveKRIValue(kriDetail, evidenceData, currentValue);
  const canSubmit = canSubmitKRIValue(kriDetail, evidenceData, currentValue);
  
  switch (status) {
  case 10: // PENDING_INPUT
  case 20: // UNDER_REWORK
  case 30: // SAVED
    if (canPerformFn(kriId, null, 'edit')) {
      // Save button - only for non-autoparse KRIs with manual input allowed
      if (allowsManualInput(source)) {
        actions.push({
          key: 'save',
          label: 'Save',
          icon: 'el-icon-document',
          type: 'primary',
          handler: 'handleSave',
          loading: false,
          disabled: !canSave,
          title: getSaveValidationMessage(kriDetail, evidenceData, currentValue)
        });
      }
      
      // Submit button - different requirements based on source
      actions.push({
        key: 'submit',
        label: 'Submit',
        icon: 'el-icon-upload',
        type: 'success',
        handler: 'handleSubmit',
        loading: false,
        disabled: !canSubmit,
        title: getSubmitValidationMessage(kriDetail, evidenceData, currentValue)
      });
      
      // Save and Submit combined button (for statuses 10 and 20 only)
      if ((status === 10 || status === 20) && allowsManualInput(source)) {
        actions.push({
          key: 'save_and_submit',
          label: 'Save and Submit',
          icon: 'el-icon-upload',
          type: 'success',
          handler: 'handleSaveAndSubmit',
          loading: false,
          disabled: !canSubmit,
          title: getSubmitValidationMessage(kriDetail, evidenceData, currentValue)
        });
      }
    }
    break;
  case 40: // SUBMITTED_TO_DATA_PROVIDER_APPROVER
    if (canPerformFn(kriId, null, 'review')) {
      actions.push({
        key: 'approve',
        label: 'Approve',
        icon: 'el-icon-check',
        type: 'success',
        handler: 'handleApprove',
        loading: false,
        disabled: false,
        title: 'Approve as Data Provider'
      });
      actions.push({
        key: 'reject',
        label: 'Reject',
        icon: 'el-icon-close',
        type: 'danger',
        handler: 'handleReject',
        loading: false,
        disabled: false,
        title: 'Reject and send back for rework'
      });
    }
    break;
  case 50: // SUBMITTED_TO_KRI_OWNER_APPROVER
    if (canPerformFn(kriId, null, 'acknowledge')) {
      actions.push({
        key: 'approve',
        label: 'Approve',
        icon: 'el-icon-check',
        type: 'success',
        handler: 'handleApprove',
        loading: false,
        disabled: false,
        title: 'Approve as KRI Owner'
      });
      actions.push({
        key: 'reject',
        label: 'Reject',
        icon: 'el-icon-close',
        type: 'danger',
        handler: 'handleReject',
        loading: false,
        disabled: false,
        title: 'Reject and send back for rework'
      });
    }
    break;
  case 60: // FINALIZED
    // View-only mode, no actions available
    break;
  }
  
  return actions;
};

// ---------------------------------- KRI Upload Logic Utilities ----------------------------------

// Check if this KRI allows manual input based on source
export const allowsManualInput = (source) => {
  // Allow manual input if source is empty/null (not auto-parse)
  return !source || source === '' || source === null;
};

// Check if evidence is required for this KRI
export const requiresEvidence = (source) => {
  // Both empty/null source and autoparse require evidence
  return !source || source === '' || source === null || source === 'autoparse';
};

// Check if user can save (input value only, no submit requirement)
export const canSaveKRIValue = (kriDetail, _evidenceData = [], currentValue = null) => {
  if (!kriDetail || !allowsManualInput(kriDetail.source)) return false;
  
  // For save, only check if value is provided
  return currentValue !== null && currentValue !== '';
};

// Check if user can submit (requires both value and evidence for source=empty/null)
export const canSubmitKRIValue = (kriDetail, evidenceData = [], currentValue = null) => {
  if (!kriDetail) return false;
  
  const hasEvidence = evidenceData && evidenceData.length > 0;
  const hasValue = currentValue !== null && currentValue !== '';
  const source = kriDetail.source;
  
  // Allow system-generated data without evidence requirement
  if (source === 'system') {
    return hasValue; // Only value required for system data
  }
  
  if (!source || source === '' || source === null) {
    // For empty/null source: requires both value AND evidence
    return hasValue && hasEvidence;
  } else if (source === 'autoparse') {
    // For autoparse: only requires evidence (value comes from parsing)
    return hasEvidence;
  }
  
  return false;
};

// Check if atomic element can be submitted (requires value and evidence/system source)
export const canSubmitAtomicValue = (atomicItem, evidenceData = []) => {
  if (!atomicItem) return false;
  
  const hasValue = atomicItem.atomic_value !== null && 
                   atomicItem.atomic_value !== undefined && 
                   atomicItem.atomic_value !== '';
  const source = atomicItem.source;
  
  // Allow system-generated data without evidence requirement
  if (source === 'system') {
    return hasValue;
  }
  
  // For manual/empty source: requires evidence
  const hasEvidence = isAtomicEvidenceSelected(atomicItem, evidenceData);
  return hasValue && hasEvidence;
};

// Get validation message for save action
export const getSaveValidationMessage = (kriDetail, _evidenceData = [], currentValue = null) => {
  if (!kriDetail) return 'Invalid KRI data';
  
  const source = kriDetail.source;
  
  if (!allowsManualInput(source)) {
    return 'Manual input not allowed for auto-parse KRIs';
  }
  
  if (!currentValue || currentValue === '') {
    return 'Please enter a KRI value to save';
  }
  
  return 'Save current changes';
};

// Get validation message for submit action
export const getSubmitValidationMessage = (kriDetail, evidenceData = [], currentValue = null) => {
  if (!kriDetail) return 'Invalid KRI data';
  
  const hasEvidence = evidenceData && evidenceData.length > 0;
  const hasValue = currentValue !== null && currentValue !== '';
  const source = kriDetail.source;
  
  // System-generated data only needs value
  if (source === 'system') {
    if (!hasValue) {
      return 'Please enter a KRI value';
    }
    return 'Submit system-generated data for approval';
  }
  
  if (!source || source === '' || source === null) {
    if (!hasValue) {
      return 'Please enter a KRI value';
    }
    if (!hasEvidence) {
      return 'Evidence file is required for submission';
    }
    return 'Submit for approval';
  } else if (source === 'autoparse') {
    if (!hasEvidence) {
      return 'Please upload an Excel file for auto-parsing';
    }
    return 'Submit for approval';
  }
  
  return 'Submit for approval';
};

// ---------------------------------- Evidence Utilities ----------------------------------

// Get the latest evidence file from an array of evidence data
export const getLatestEvidence = (evidenceData) => {
  if (!evidenceData || evidenceData.length === 0) return null;
  return [...evidenceData].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))[0];
};

// Get the selected evidence file for a KRI (or fall back to latest)
export const getSelectedEvidence = (kriItem, evidenceData) => {
  if (!kriItem || !evidenceData || evidenceData.length === 0) {
    return null;
  }

  // If KRI has a selected evidence_id, find that evidence
  if (kriItem.evidence_id) {
    const selectedEvidence = evidenceData.find(evidence => evidence.evidence_id === kriItem.evidence_id);
    if (selectedEvidence) {
      return selectedEvidence;
    }
    // If selected evidence not found in current data, log warning but continue
    console.warn(`Selected evidence ID ${kriItem.evidence_id} not found in evidence data for KRI ${kriItem.kri_id}`);
  }

  // Fall back to latest evidence if no selection or selected not found
  return getLatestEvidence(evidenceData);
};

// Check if evidence is actually selected (not just falling back to latest)
export const isEvidenceSelected = (kriItem, evidenceData) => {
  return kriItem?.evidence_id && evidenceData?.some(e => e.evidence_id === kriItem.evidence_id);
};

// ---------------------------------- Atomic Evidence Utilities ----------------------------------

// Get the selected evidence file for an atomic element (adapted from KRI-level function)
export const getSelectedAtomicEvidence = (atomicItem, evidenceData) => {
  if (!atomicItem || !evidenceData || evidenceData.length === 0) {
    return null;
  }

  // If atomic has a linked evidence_id, find that evidence
  if (atomicItem.evidence_id) {
    const selectedEvidence = evidenceData.find(evidence => evidence.evidence_id === atomicItem.evidence_id);
    if (selectedEvidence) {
      return selectedEvidence;
    }
    // If selected evidence not found in current data, log warning but continue
    console.warn(`Selected evidence ID ${atomicItem.evidence_id} not found in evidence data for atomic ${atomicItem.atomic_id}`);
  }

  // If atomic has linkedEvidence from service join, return it
  if (atomicItem.linkedEvidence) {
    return atomicItem.linkedEvidence;
  }

  return null;
};

// Check if atomic evidence is actually selected (not just available)
export const isAtomicEvidenceSelected = (atomicItem, evidenceData) => {
  if (!atomicItem) return false;
  
  // Check if atomic has evidence_id and it exists in evidence data
  if (atomicItem.evidence_id) {
    return evidenceData?.some(e => e.evidence_id === atomicItem.evidence_id);
  }
  
  // Check if atomic has linkedEvidence from service join
  return !!(atomicItem.linkedEvidence);
};

// Get display text for atomic evidence status
export const getAtomicEvidenceStatus = (atomicItem, evidenceData) => {
  if (!atomicItem) return 'No atomic data';
  
  if (isAtomicEvidenceSelected(atomicItem, evidenceData)) {
    const evidence = getSelectedAtomicEvidence(atomicItem, evidenceData);
    return evidence?.file_name || 'Evidence linked';
  }
  
  return 'No evidence';
};

// Check if atomic element can have evidence linked (only for calculated KRIs)
export const canLinkAtomicEvidence = (kriDetail, atomicItem) => {
  if (!kriDetail || !atomicItem) return false;
  
  // Only calculated KRIs support atomic-level evidence
  return isCalculatedKRI(kriDetail);
};

// Get available evidence for atomic linking (exclude already linked evidence)
export const getAvailableEvidenceForAtomic = (evidenceData, currentAtomicId, allAtomicData) => {
  if (!evidenceData || evidenceData.length === 0) {
    return [];
  }

  // Get evidence IDs that are already linked to other atomics
  const linkedEvidenceIds = allAtomicData
    .filter(atomic => atomic.atomic_id !== currentAtomicId && atomic.evidence_id)
    .map(atomic => atomic.evidence_id);

  // Return evidence that is not linked to other atomics
  return evidenceData.filter(evidence => !linkedEvidenceIds.includes(evidence.evidence_id));
};

// ---------------------------------- Filter Utilities ----------------------------------

/**
 * Apply standard KRI filters to a list of items including permission-based filtering
 * Reusable filtering logic for both filteredKRIItems and filteredPendingKRIItems
 * @param {Array} items - Array of KRI items to filter
 * @param {Object} filters - Filter object from store state
 * @param {Array} userPermissions - User permissions array for permission-based filtering
 * @returns {Array} Filtered array of KRI items
 */
export const applyKRIFilters = (items, filters, userPermissions = []) => {
  let filtered = [...items];
  
  // Apply permission-based filtering first - only show KRIs user has any permission for
  if (userPermissions && userPermissions.length > 0) {
    const Permission = require('@/utils/permission').default;
    filtered = filtered.filter(item => {
      const kriId = item.kriId || item.kri_id;
      return Permission.hasAnyPermission(kriId, userPermissions);
    });
  }
  
  if (filters.kriOwner) {
    filtered = filtered.filter(item => 
      item.owner.toLowerCase().includes(filters.kriOwner.toLowerCase())
    );
  }
  
  if (filters.dataProvider) {
    filtered = filtered.filter(item => 
      item.dataProvider.toLowerCase().includes(filters.dataProvider.toLowerCase())
    );
  }
  
  if (filters.department) {
    filtered = filtered.filter(item => 
      // Match either Owner or Data Provider with department
      item.owner.toLowerCase().includes(filters.department.toLowerCase()) ||
      item.dataProvider.toLowerCase().includes(filters.department.toLowerCase())
    );
  }
  
  if (filters.collectionStatus) {
    filtered = filtered.filter(item => {
      // Handle both numeric and string status values
      let itemStatus = item.collectionStatus;
      if (typeof itemStatus === 'string') {
        // Import StatusManager dynamically to avoid circular deps
        const StatusManager = require('@/utils/types').default;
        itemStatus = StatusManager.getLabelToNumber(itemStatus);
      }
      return itemStatus === filters.collectionStatus;
    });
  }
  
  if (filters.l1RiskType) {
    filtered = filtered.filter(item => 
      item.l1RiskType.toLowerCase().includes(filters.l1RiskType.toLowerCase())
    );
  }
  
  if (filters.kriName) {
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(filters.kriName.toLowerCase())
    );
  }
  
  if (filters.kriId) {
    filtered = filtered.filter(item => 
      item.id && item.id.toString().includes(filters.kriId.toString())
    );
  }
  
  if (filters.reportingCycle) {
    filtered = filtered.filter(item => 
      item.reportingCycle && item.reportingCycle.toLowerCase().includes(filters.reportingCycle.toLowerCase())
    );
  }
  
  if (filters.l2RiskType) {
    filtered = filtered.filter(item => 
      item.l2RiskType && item.l2RiskType.toLowerCase().includes(filters.l2RiskType.toLowerCase())
    );
  }
  
  if (filters.kriType) {
    filtered = filtered.filter(item => 
      item.kriType && item.kriType.toLowerCase().includes(filters.kriType.toLowerCase())
    );
  }
  
  if (filters.breachType) {
    filtered = filtered.filter(item => 
      item.breachType && item.breachType.toLowerCase().includes(filters.breachType.toLowerCase())
    );
  }
  
  return filtered;
};

// ---------------------------------- Inline Editing Utilities ----------------------------------

/**
 * Check if a KRI item can be edited inline based on status and permissions
 * @param {Object} kriItem - KRI item to check
 * @param {Function} canPerformFn - Permission checking function
 * @returns {boolean} True if item can be edited inline
 */
export const canInlineEditKRI = (kriItem, canPerformFn) => {
  if (!kriItem || !canPerformFn) return false;
  
  // Check permission to edit
  const hasEditPermission = canPerformFn(kriItem.kriId || kriItem.id, null, 'edit');
  
  // Check status allows editing (10, 20, 30)
  const editableStatuses = [10, 20, 30];
  const currentStatus = kriItem.kri_status || kriItem.kriStatus;
  const statusAllowsEdit = editableStatuses.includes(currentStatus);
  
  return hasEditPermission && statusAllowsEdit;
};

/**
 * Check if a KRI item can be approved based on status and permissions
 * @param {Object} kriItem - KRI item to check
 * @param {Function} canPerformFn - Permission checking function
 * @returns {boolean} True if item can be approved
 */
export const canApproveKRI = (kriItem, canPerformFn) => {
  if (!kriItem || !canPerformFn) return false;
  
  // Check permission to review/approve
  const hasReviewPermission = canPerformFn(kriItem.kriId || kriItem.id, null, 'review');
  
  // Check status allows approval (40, 50)
  const approvableStatuses = [40, 50];
  const currentStatus = kriItem.kri_status || kriItem.kriStatus;
  const statusAllowsApproval = approvableStatuses.includes(currentStatus);
  
  return hasReviewPermission && statusAllowsApproval;
};

/**
 * Get available actions for a KRI item in inline editing context
 * @param {Object} kriItem - KRI item to check
 * @param {Function} canPerformFn - Permission checking function
 * @returns {Array} Array of available action objects
 */
export const getInlineEditActions = (kriItem, canPerformFn) => {
  const actions = [];
  
  if (!kriItem || !canPerformFn) return actions;
  
  const currentStatus = kriItem.kri_status || kriItem.kriStatus;
  
  // Edit actions (Status 10, 20, 30)
  if (canInlineEditKRI(kriItem, canPerformFn)) {
    // Save action
    actions.push({
      key: 'save',
      label: 'Save',
      icon: 'el-icon-document',
      type: 'primary',
      disabled: !hasValidKRIValue(kriItem),
      tooltip: hasValidKRIValue(kriItem) ? 'Save current changes' : 'Please enter a valid KRI value'
    });
    
    // Submit action
    actions.push({
      key: 'submit',
      label: 'Submit',
      icon: 'el-icon-upload',
      type: 'success',
      disabled: !hasValidKRIValue(kriItem),
      tooltip: hasValidKRIValue(kriItem) ? 'Submit for approval' : 'Please enter a valid KRI value'
    });
  }
  
  // Approval actions (Status 40, 50)
  if (canApproveKRI(kriItem, canPerformFn)) {
    actions.push({
      key: 'approve',
      label: 'Approve',
      icon: 'el-icon-check',
      type: 'success',
      disabled: false,
      tooltip: currentStatus === 40 ? 'Approve as Data Provider' : 'Approve as KRI Owner'
    });
    
    actions.push({
      key: 'reject',
      label: 'Reject',
      icon: 'el-icon-close',
      type: 'danger',
      disabled: false,
      tooltip: 'Reject and send back for rework'
    });
  }
  
  return actions;
};

/**
 * Check if KRI has a valid value for submission
 * @param {Object} kriItem - KRI item to check
 * @returns {boolean} True if KRI has valid value
 */
export const hasValidKRIValue = (kriItem) => {
  if (!kriItem) return false;
  
  const value = kriItem.kri_value || kriItem.kriValue;
  return value !== null && value !== undefined && value !== '' && !isNaN(Number(value));
};

/**
 * Format KRI value for display with proper number formatting
 * @param {number|string} value - KRI value to format
 * @param {number} precision - Number of decimal places (default: 2)
 * @returns {string} Formatted value
 */
export const formatKRIValue = (value, precision = 2) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return 'Invalid';
  }
  
  return numValue.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
};

/**
 * Get status-specific action button styling
 * @param {string} action - Action type ('save', 'submit', 'approve', 'reject')
 * @returns {Object} Button styling configuration
 */
export const getActionButtonStyle = (action) => {
  const baseStyles = {
    save: {
      type: 'primary',
      icon: 'el-icon-document',
      size: 'mini'
    },
    submit: {
      type: 'success',
      icon: 'el-icon-upload',
      size: 'mini'
    },
    approve: {
      type: 'success',
      icon: 'el-icon-check',
      size: 'mini'
    },
    reject: {
      type: 'danger',
      icon: 'el-icon-close',
      size: 'mini'
    }
  };
  
  return baseStyles[action] || {
    type: 'default',
    icon: 'el-icon-more',
    size: 'mini'
  };
};

/**
 * Generate audit trail comment for inline editing actions
 * @param {string} action - Action performed
 * @param {Object} kriItem - KRI item affected
 * @param {*} oldValue - Previous value (optional)
 * @param {*} newValue - New value (optional)
 * @returns {string} Formatted audit comment
 */
export const generateInlineEditComment = (action, kriItem, oldValue = null, newValue = null) => {
  const kriId = kriItem.kriId || kriItem.id;
  const baseComment = `Inline ${action} for KRI ${kriId}`;
  
  if (action === 'edit' && oldValue !== null && newValue !== null) {
    return `${baseComment}: Changed value from ${oldValue} to ${newValue}`;
  }
  
  return baseComment;
};

/**
 * Validate KRI data before save/submit operations
 * @param {Object} kriItem - KRI item to validate
 * @param {string} operation - Operation type ('save' or 'submit')
 * @returns {Object} Validation result
 */
export const validateKRIForOperation = (kriItem, operation) => {
  const errors = [];
  const warnings = [];
  
  // Basic validation
  if (!kriItem) {
    errors.push('KRI item is required');
    return { valid: false, errors, warnings };
  }
  
  // Value validation
  if (!hasValidKRIValue(kriItem)) {
    if (operation === 'submit') {
      errors.push('Valid KRI value is required for submission');
    } else {
      warnings.push('KRI value should be provided');
    }
  }
  
  // Status validation
  const currentStatus = kriItem.kri_status || kriItem.kriStatus;
  const validStatuses = [10, 20, 30];
  if (!validStatuses.includes(currentStatus)) {
    errors.push(`Cannot ${operation} KRI in current status: ${currentStatus}`);
  }
  
  // Threshold validation (warnings only)
  if (hasValidKRIValue(kriItem)) {
    const value = Number(kriItem.kri_value || kriItem.kriValue);
    const warningThreshold = Number(kriItem.warningLineValue);
    const limitThreshold = Number(kriItem.limitValue);
    
    if (!isNaN(limitThreshold) && value >= limitThreshold) {
      warnings.push('KRI value exceeds limit threshold');
    } else if (!isNaN(warningThreshold) && value >= warningThreshold) {
      warnings.push('KRI value exceeds warning threshold');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Get next workflow status for a KRI based on operation and current state
 * @param {Object} kriItem - KRI item
 * @param {string} operation - Operation type
 * @returns {number|null} Next status code or null if invalid
 */
export const getNextWorkflowStatus = (kriItem, operation) => {
  if (!kriItem) return null;
  
  const currentStatus = kriItem.kri_status || kriItem.kriStatus;
  const owner = kriItem.kri_owner || kriItem.owner;
  const provider = kriItem.data_provider || kriItem.dataProvider;
  
  switch (operation) {
  case 'save':
    return [10, 20, 30].includes(currentStatus) ? 30 : null;
  case 'submit':
    if ([10, 20, 30].includes(currentStatus)) {
      // IF KRI_OWNER == DATA_PROVIDER -> 50, ELSE -> 40
      return (owner === provider) ? 50 : 40;
    }
    return null;
  case 'approve':
    if (currentStatus === 40) {
      // Data Provider approval - check if same as owner
      return (owner === provider) ? 60 : 50;
    } else if (currentStatus === 50) {
      // KRI Owner approval
      return 60;
    }
    return null;
  case 'reject':
    return [40, 50].includes(currentStatus) ? 20 : null;
  default:
    return null;
  }
};


