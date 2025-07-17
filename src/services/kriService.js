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

  // Login method - fetch unique departments from owner column
  async fetchUniqueDepartments() {
    const { data, error } = await supabase
      .from('kri_item')
      .select('kri_owner')
      .not('kri_owner', 'is', null);
    
    if (error) {
      console.error('Error fetching departments:', error);
      throw new Error('Failed to fetch departments');
    }
    
    // Extract unique departments
    const uniqueDepartments = [...new Set(data.map(item => item.kri_owner))];
    return uniqueDepartments.sort();
  },

  // Authentication and user management
  async authenticateUser(username, department, role) {
    try {
      // In a real application, this would validate credentials against a user database
      // For now, we'll create a mock authentication
      const user = {
        id: Date.now(),
        username: username.trim(),
        name: username.trim(),
        department: department.trim(),
        role: role.trim(),
        loginTime: new Date().toISOString(),
        permissions: this.getRolePermissions(role)
      };
      
      return { success: true, user };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  },

  // Get role permissions
  getRolePermissions(roleName) {
    const rolePermissions = {
      'Admin': ['read', 'write', 'approve', 'delete'],
      'KRI Owner': ['read', 'write', 'approve', 'reject'],
      'KRI Reviewer': ['read', 'approve', 'reject'],
      'Data Provider': ['read', 'write'],
      'Data Reviewer': ['read', 'approve', 'reject'],
      'Viewer': ['read']
    };
    
    return rolePermissions[roleName] || [];
  },

  // Session management
  async validateSession(sessionToken) {
    // In a real application, this would validate the session token
    // For now, we'll return a mock validation
    return { valid: true, user: null };
  },

  // Logout
  async logout(sessionToken) {
    // In a real application, this would invalidate the session
    return { success: true };
  },

  // KRI Status Update Methods
  async updateKRIStatus(kriId, reportingDate, newStatus, reason = null, changedBy = null) {
    try {
      const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
      
      // In a real application, this would update the database
      // For now, we'll return a mock successful response
      const updateData = {
        kri_id: parseInt(kriId),
        reporting_date: reportingDateAsInt,
        new_status: newStatus,
        reason: reason,
        changed_by: changedBy || 'System',
        changed_at: new Date().toISOString()
      };
      
      console.log('Updating KRI status:', updateData);
      
      return { success: true, data: updateData };
    } catch (error) {
      console.error('Error updating KRI status:', error);
      return { success: false, error: 'Failed to update KRI status' };
    }
  },

  async updateKRIValue(kriId, reportingDate, value, changedBy = null) {
    try {
      const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
      
      // In a real application, this would update the database
      // For now, we'll return a mock successful response
      const updateData = {
        kri_id: parseInt(kriId),
        reporting_date: reportingDateAsInt,
        kri_value: value,
        changed_by: changedBy || 'System',
        changed_at: new Date().toISOString()
      };
      
      console.log('Updating KRI value:', updateData);
      
      return { success: true, data: updateData };
    } catch (error) {
      console.error('Error updating KRI value:', error);
      return { success: false, error: 'Failed to update KRI value' };
    }
  },

  async addAuditTrailEntry(kriId, reportingDate, action, oldValue, newValue, reason = null, changedBy = null) {
    try {
      const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
      
      // In a real application, this would insert into the audit trail table
      const auditEntry = {
        kri_id: parseInt(kriId),
        reporting_date: reportingDateAsInt,
        action: action,
        field_name: 'kri_status',
        old_value: oldValue,
        new_value: newValue,
        reason: reason,
        changed_by: changedBy || 'System',
        changed_at: new Date().toISOString()
      };
      
      console.log('Adding audit trail entry:', auditEntry);
      
      return { success: true, data: auditEntry };
    } catch (error) {
      console.error('Error adding audit trail entry:', error);
      return { success: false, error: 'Failed to add audit trail entry' };
    }
  },

  // Save KRI value (to status 30)
  async saveKRIValue(kriId, reportingDate, value, changedBy = null) {
    try {
      const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
      
      // In a real application, this would update the database
      const updateData = {
        kri_id: parseInt(kriId),
        reporting_date: reportingDateAsInt,
        kri_value: value,
        new_status: 30, // Saved
        changed_by: changedBy || 'System',
        changed_at: new Date().toISOString()
      };
      
      console.log('Saving KRI value:', updateData);
      
      return { success: true, data: updateData };
    } catch (error) {
      console.error('Error saving KRI value:', error);
      return { success: false, error: 'Failed to save KRI value' };
    }
  },

  // Submit KRI (from status 30 to final status)
  async submitKRI(kriId, reportingDate, finalStatus, changedBy = null) {
    try {
      const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
      
      // In a real application, this would update the database
      const updateData = {
        kri_id: parseInt(kriId),
        reporting_date: reportingDateAsInt,
        new_status: finalStatus,
        changed_by: changedBy || 'System',
        changed_at: new Date().toISOString()
      };
      
      console.log('Submitting KRI:', updateData);
      
      return { success: true, data: updateData };
    } catch (error) {
      console.error('Error submitting KRI:', error);
      return { success: false, error: 'Failed to submit KRI' };
    }
  }
};