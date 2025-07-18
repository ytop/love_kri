import { supabase } from './supabase';

export const kriService = {
  // Fetch KRI items with optional filters
  async fetchKRIItems(reportingDate = null) {
    let query = supabase.from('kri_item').select('*');
    
    if (reportingDate) {
      const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
      query = query.eq('reporting_date', reportingDateAsInt);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching KRI data:', error);
      throw new Error('Failed to fetch KRI data');
    }
    return data;
  },

  // Fetch KRI detail by ID and date
  async fetchKRIDetail(kriId, reportingDate) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    const { data, error } = await supabase
      .from('kri_item')
      .select('*')
      .eq('kri_id', parseInt(kriId))
      .eq('reporting_date', reportingDateAsInt)
      .single();
    
    if (error) {
      console.error('Error fetching KRI detail:', error);
      throw new Error('Failed to fetch KRI detail');
    }
    return data;
  },

  // Fetch atomic data for a KRI
  async fetchKRIAtomic(kriId, reportingDate) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    const { data, error } = await supabase
      .from('kri_atomic')
      .select('*')
      .eq('kri_id', parseInt(kriId))
      .eq('reporting_date', reportingDateAsInt)
      .order('atomic_id', { ascending: true });
    
    if (error) {
      console.error('Error fetching atomic data:', error);
      throw new Error('Failed to fetch atomic data');
    }
    return data;
  },

  // Fetch evidence for a KRI
  async fetchKRIEvidence(kriId, reportingDate) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    const { data, error } = await supabase
      .from('kri_evidence')
      .select('*')
      .eq('kri_id', parseInt(kriId))
      .eq('reporting_date', reportingDateAsInt)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching evidence data:', error);
      throw new Error('Failed to fetch evidence data');
    }
    return data;
  },

  // Fetch audit trail for a KRI
  async fetchKRIAuditTrail(kriId, reportingDate) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    const { data, error } = await supabase
      .from('kri_audit_trail')
      .select('*')
      .eq('kri_id', parseInt(kriId))
      .eq('reporting_date', reportingDateAsInt)
      .order('changed_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching audit trail:', error);
      throw new Error('Failed to fetch audit trail');
    }
    return data;
  },


  // Authentication and user management
  async authenticateUser(username) {
    try {
      // Get user from kri_user table
      const { data: userData, error: userError } = await supabase
        .from('kri_user')
        .select('UUID, User_ID, User_Name, Department')
        .eq('User_ID', username.trim())
        .single();

      if (userError) {
        console.error('User not found:', userError);
        return { success: false, error: 'User not found' };
      }

      // Get user permissions from kri_user_permission table
      const { data: permissionData, error: permissionError } = await supabase
        .from('kri_user_permission')
        .select('kri_id, reporting_date, actions, effect, condition')
        .eq('user_uuid', userData.UUID)
        .eq('effect', true);

      if (permissionError) {
        console.error('Error fetching permissions:', permissionError);
        // Continue with empty permissions if permission fetch fails
      }

      // Process permissions into a usable format
      const permissions = this.processUserPermissions(permissionData || []);

      const user = {
        uuid: userData.UUID,
        name: userData.User_Name || userData.User_ID,
        department: userData.Department,
        userId: userData.User_ID,
        loginTime: new Date().toISOString(),
        permissions: permissions
      };
      
      return { success: true, user };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  },

  // Process user permissions from database into KRI-specific format
  processUserPermissions(permissionData) {
    const permissions = {};

    permissionData.forEach(permission => {
      const actions = permission.actions.split(',').map(action => action.trim());
      const key = `${permission.kri_id}_${permission.reporting_date}`;
      
      if (!permissions[key]) {
        permissions[key] = [];
      }
      permissions[key].push(...actions);
    });

    // Remove duplicates for each KRI
    Object.keys(permissions).forEach(key => {
      permissions[key] = [...new Set(permissions[key])];
    });

    return permissions;
  },

  // Check if user has specific permission for a KRI
  hasPermission(userPermissions, action, kriId, reportingDate) {
    const key = `${kriId}_${reportingDate}`;
    return userPermissions[key]?.includes(action) || false;
  },


  // Session management
  async validateSession(_sessionToken) {
    // In a real application, this would validate the session token
    // For now, we'll return a mock validation
    return { valid: true, user: null };
  },

  // Logout
  async logout(_sessionToken) {
    // In a real application, this would invalidate the session
    return { success: true };
  },

};