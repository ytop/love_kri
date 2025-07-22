// Session storage keys
const AUTH_STORAGE_KEY = 'kri_auth_user';
const AUTH_PERMISSIONS_KEY = 'kri_auth_permissions';

// Session storage utilities
export default {
  setUser(user) {
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to store user data in sessionStorage:', error);
    }
  },
  
  getUser() {
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to retrieve user data from sessionStorage:', error);
      return null;
    }
  },
  
  setPermissions(permissions) {
    try {
      sessionStorage.setItem(AUTH_PERMISSIONS_KEY, JSON.stringify(permissions));
    } catch (error) {
      console.warn('Failed to store permissions in sessionStorage:', error);
    }
  },
  
  getPermissions() {
    try {
      const stored = sessionStorage.getItem(AUTH_PERMISSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to retrieve permissions from sessionStorage:', error);
      return [];
    }
  },
  
  clear() {
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_PERMISSIONS_KEY);
    } catch (error) {
      console.warn('Failed to clear auth data from sessionStorage:', error);
    }
  }
};