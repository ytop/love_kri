import { kriService } from '@/services/kriService';

// This class is for future refactor to a more secure authentication system

/**
 * Validates user login credentials and returns user data
 * @param {string} username - The username to authenticate
 * @returns {Promise<Object|null>} User data object or null if not found
 */
export async function authenticateUser(username) {
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    throw new Error('Username is required');
  }

  try {
    const userData = await kriService.fetchUser(username.trim());
    
    
    if (!userData || !Array.isArray(userData) || userData.length === 0) {
      return null;
    }
    
    const user = userData[0];
    
    // Check for the actual field names from database schema
    // Database has: uuid, user_id, user_name, department
    if (!user.uuid || !user.user_id) {
      console.error('Missing required fields. Available fields:', Object.keys(user));
      throw new Error('Invalid user data: missing required fields');
    }
    
    return {
      uuid: user.uuid,
      name: user.user_id,
      department: user.department || '',
      authenticated: true
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

/**
 * Validates user data structure
 * @param {Object} userData - User data to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateUserData(userData) {
  return userData && 
         typeof userData === 'object' && 
         userData.uuid && 
         userData.name &&
         typeof userData.authenticated === 'boolean';
}

/**
 * Formats user data for store
 * @param {Object} rawUser - Raw user data from database
 * @returns {Object} Formatted user object
 */
export function formatUserForStore(rawUser) {
  if (!rawUser) {
    throw new Error('User data is required');
  }

  return {
    uuid: rawUser.uuid || null,
    name: rawUser.user_id || '',
    department: rawUser.department || '',
    permissions: [],
    authenticated: true
  };
}