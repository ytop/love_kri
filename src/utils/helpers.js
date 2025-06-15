import { format, lastDayOfMonth, subMonths } from 'date-fns';

// Map KRI status numbers to readable strings
export const mapKriStatus = (status) => {
  if (status === null || status === undefined) return 'Pending';
  switch (status) {
    case 0:
      return 'Pending';
    case 1:
      return 'Submitted';
    case 2:
      return 'Finalized';
    default:
      return `Unknown (${status})`;
  }
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

// Convert date string to integer format
export const dateStringToInt = (dateString) => {
  return parseInt(dateString.replace(/-/g, ''), 10);
};