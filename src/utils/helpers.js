import { format, lastDayOfMonth, subMonths } from 'date-fns';

// Unified Status Configuration (used for both KRI and Atomic status)
const STATUS_CONFIG = {
  10: { label: 'Pending Input', tagType: 'warning', cssClass: 'status-pending' },
  20: { label: 'Adjusting', tagType: 'warning', cssClass: 'status-adjusting' },
  30: { label: 'Pending Data Provider Approval', tagType: 'info', cssClass: 'status-pending-approval' },
  40: { label: 'Ready for submission', tagType: 'primary', cssClass: 'status-ready' },
  50: { label: 'Submitted', tagType: 'info', cssClass: 'status-submitted' },
  60: { label: 'Finalized', tagType: 'success', cssClass: 'status-approved' }
};

// Reverse mapping from status labels to numeric values
const STATUS_LABEL_TO_NUMBER = {
  'Pending Input': 10,
  'Adjusting': 20,
  'Pending Data Provider Approval': 30,
  'Ready for submission': 40,
  'Submitted': 50,
  'Finalized': 60
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