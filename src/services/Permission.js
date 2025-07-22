import { USER_PERMISSIONS, USER_PERMISSION_LABEL_TO_NUMBER } from '@/utils/types';
import { kriService } from '@/services/kriService';

// Extract atomic ID from atomic permission (e.g., "atomic1_edit" -> "1")
export const getAtomicIdFromPermission = (permission) => {
  const match = permission.match(/^atomic(\d+)_/);
  return match ? parseInt(match[1], 10) : null;
};