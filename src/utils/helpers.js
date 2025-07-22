import { format, lastDayOfMonth, subMonths } from 'date-fns';

// ---------------------------------- helper functions ----------------------------------

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
