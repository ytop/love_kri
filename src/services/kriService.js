import { supabase } from './supabase';
import { StorageFactory } from './ObjectStorage';
import { calculateBreachStatus } from '@/utils/helpers';

export const kriService = {
  // Initialize storage provider
  _storageProvider: null,
  
  getStorageProvider() {
    if (!this._storageProvider) {
      // Default to Supabase storage provider
      // TODO: use other storage providers for production
      this._storageProvider = StorageFactory.create('supabase', {
        supabaseClient: supabase,
        bucketName: 'evidence',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv'
        ]
      });
    }
    return this._storageProvider;
  },

  setStorageProvider(provider) {
    this._storageProvider = provider;
  },
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

  // Save KRI value (update status to 30 - Saved)
  async saveKRIValue(kriId, reportingDate, kriValue, changedBy) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      // First get the current KRI data to obtain limits and old breach status
      const { data: currentKRI, error: fetchError } = await supabase
        .from('kri_item')
        .select('breach_type, warning_line_value, limit_value')
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .single();

      if (fetchError) {
        console.error('Error fetching current KRI data:', fetchError);
        throw new Error('Failed to fetch current KRI data');
      }

      // Calculate new breach status based on KRI value and limits
      const newBreachStatus = calculateBreachStatus(kriValue, currentKRI.warning_line_value, currentKRI.limit_value);
      const oldBreachStatus = currentKRI.breach_type;

      const { data, error } = await supabase
        .from('kri_item')
        .update({
          kri_value: kriValue,
          kri_status: 30, // Saved status
          breach_type: newBreachStatus
        })
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .select()
        .single();

      if (error) {
        console.error('Error saving KRI value:', error);
        throw new Error('Failed to save KRI value');
      }

      // Add audit trail entry for KRI value change
      await this.addAuditTrailEntry(kriId, reportingDate, 'save', 'kri_value', null, kriValue, changedBy, 'Data saved');

      // Add audit trail entry for breach status change if it changed
      if (oldBreachStatus !== newBreachStatus) {
        await this.addAuditTrailEntry(kriId, reportingDate, 'save', 'breach_type', oldBreachStatus, newBreachStatus, changedBy, `Breach status recalculated: ${oldBreachStatus} → ${newBreachStatus}`);
      }

      return data;
    } catch (error) {
      console.error('Save KRI value error:', error);
      throw error;
    }
  },

  // Submit KRI value (update status based on workflow logic)
  async submitKRIValue(kriId, reportingDate, changedBy) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      // First get the current KRI to determine next status
      const { data: currentKRI, error: fetchError } = await supabase
        .from('kri_item')
        .select('*')
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch current KRI data');
      }

      // Determine next status based on business logic
      let nextStatus = 40; // Default to Data Provider Approver
      
      // If KRI owner is the same as data provider, skip to KRI Owner Approver
      if (currentKRI.kri_owner === currentKRI.data_provider) {
        nextStatus = 50; // Submit directly to KRI Owner Approver
      }

      const { data, error } = await supabase
        .from('kri_item')
        .update({
          kri_status: nextStatus
        })
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .select()
        .single();

      if (error) {
        console.error('Error submitting KRI:', error);
        throw new Error('Failed to submit KRI');
      }

      // Add audit trail entry
      const statusLabel = nextStatus === 40 ? 'Submitted to Data Provider Approver' : 'Submitted to KRI Owner Approver';
      await this.addAuditTrailEntry(kriId, reportingDate, 'submit', 'kri_status', currentKRI.kri_status, nextStatus, changedBy, `KRI submitted - ${statusLabel}`);

      return data;
    } catch (error) {
      console.error('Submit KRI error:', error);
      throw error;
    }
  },

  // Update KRI status (for approve/reject actions)
  async updateKRIStatus(kriId, reportingDate, newStatus, changedBy, reason = null) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      // Get current status for audit trail
      const { data: currentKRI, error: fetchError } = await supabase
        .from('kri_item')
        .select('kri_status')
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch current KRI status');
      }

      const { data, error } = await supabase
        .from('kri_item')
        .update({
          kri_status: newStatus
        })
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .select()
        .single();

      if (error) {
        console.error('Error updating KRI status:', error);
        throw new Error('Failed to update KRI status');
      }

      // Add audit trail entry
      const comment = reason ? `Status updated: ${reason}` : 'Status updated';
      await this.addAuditTrailEntry(kriId, reportingDate, 'status_change', 'kri_status', currentKRI.kri_status, newStatus, changedBy, comment);

      return data;
    } catch (error) {
      console.error('Update KRI status error:', error);
      throw error;
    }
  },

  // Add audit trail entry
  async addAuditTrailEntry(kriId, reportingDate, action, fieldName, oldValue, newValue, changedBy, comment = null) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      const { error } = await supabase
        .from('kri_audit_trail')
        .insert({
          kri_id: parseInt(kriId),
          reporting_date: reportingDateAsInt,
          action: action,
          field_name: fieldName,
          old_value: oldValue ? String(oldValue) : null,
          new_value: newValue ? String(newValue) : null,
          changed_by: changedBy,
          comment: comment
        });

      if (error) {
        console.error('Error adding audit trail entry:', error);
        // Don't throw error for audit trail failures to avoid breaking main operations
      }
    } catch (error) {
      console.error('Audit trail error:', error);
      // Don't throw error for audit trail failures
    }
  },

  // Authentication and user management
  // TODO: Add user authentication and permission management
  // Really, Can't protect it using only username... even without password...
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
      
      // Store each action with its effect value
      actions.forEach(action => {
        const existingPermission = permissions[key].find(p => 
          typeof p === 'object' && p.action === action
        );
        
        const newPermission = {
          action: action,
          effect: permission.effect,
          condition: permission.condition
        };
        
        if (existingPermission) {
          // Handle conflict: if we have both true and false effects for same action
          if (existingPermission.effect !== permission.effect) {
            console.log(`Permission conflict detected for ${key} action '${action}': both allow and deny permissions exist. Prioritizing denial.`);
            existingPermission.effect = false; // Prioritize denial
          }
        } else {
          permissions[key].push(newPermission);
        }
        
        // Also add simple string format for backward compatibility
        if (!permissions[key].includes(action)) {
          permissions[key].push(action);
        }
      });
    });

    return permissions;
  },

  // Check if user has specific permission for a KRI
  hasPermission(userPermissions, action, kriId, reportingDate) {
    const key = `${kriId}_${reportingDate}`;
    return userPermissions[key]?.includes(action) || false;
  },

  // Evidence Management Methods

  // Upload evidence file for a KRI
  async uploadEvidence(kriId, reportingDate, file, description, uploadedBy) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      const storage = this.getStorageProvider();
      
      // Generate unique file path
      const filePath = storage.generateFilePath(kriId, reportingDateAsInt, file.name);
      
      // Upload file to storage
      const uploadResult = await storage.uploadFile(file, filePath, {
        kriId: kriId,
        reportingDate: reportingDateAsInt,
        description: description,
        uploadedBy: uploadedBy
      });

      // Save evidence metadata to database
      const { data, error } = await supabase
        .from('kri_evidence')
        .insert({
          kri_id: parseInt(kriId),
          reporting_date: reportingDateAsInt,
          file_name: file.name,
          file_url: uploadResult.url,
          description: description,
          uploaded_by: uploadedBy
        })
        .select()
        .single();

      if (error) {
        // If database insert fails, try to clean up uploaded file
        try {
          await storage.deleteFile(uploadResult.url);
        } catch (deleteError) {
          console.error('Failed to clean up uploaded file after database error:', deleteError);
        }
        throw new Error(`Failed to save evidence metadata: ${error.message}`);
      }

      // Add audit trail entry for file upload
      await this.addAuditTrailEntry(
        kriId, 
        reportingDate, 
        'file_upload', 
        'evidence', 
        null, 
        file.name, 
        uploadedBy, 
        `File uploaded: ${file.name} (${(file.size / 1024).toFixed(2)} KB) via ${storage.getProviderName()}`
      );

      return {
        success: true,
        evidence: data,
        fileInfo: {
          path: uploadResult.path,
          url: uploadResult.url,
          metadata: uploadResult.metadata
        }
      };
    } catch (error) {
      console.error('Upload evidence error:', error);
      throw error;
    }
  },

  // Delete evidence file
  // TODO: should we allow actually deleting the evidence file?
  async deleteEvidence(evidenceId, deletedBy) {
    try {
      // First get the evidence record to obtain file info
      const { data: evidence, error: fetchError } = await supabase
        .from('kri_evidence')
        .select('*')
        .eq('evidence_id', evidenceId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch evidence record: ${fetchError.message}`);
      }

      const storage = this.getStorageProvider();

      // Delete file from storage
      await storage.deleteFile(evidence.file_url);

      // Delete evidence record from database
      const { error: deleteError } = await supabase
        .from('kri_evidence')
        .delete()
        .eq('evidence_id', evidenceId);

      if (deleteError) {
        throw new Error(`Failed to delete evidence record: ${deleteError.message}`);
      }

      // Add audit trail entry for file deletion
      await this.addAuditTrailEntry(
        evidence.kri_id,
        evidence.reporting_date.toString(),
        'file_delete',
        'evidence',
        evidence.file_name,
        null,
        deletedBy,
        `File deleted: ${evidence.file_name} via ${storage.getProviderName()}`
      );

      return {
        success: true,
        deletedEvidence: evidence
      };
    } catch (error) {
      console.error('Delete evidence error:', error);
      throw error;
    }
  },

  // Download evidence file
  async downloadEvidence(evidenceId) {
    try {
      // Get evidence record
      const { data: evidence, error: fetchError } = await supabase
        .from('kri_evidence')
        .select('*')
        .eq('evidence_id', evidenceId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch evidence record: ${fetchError.message}`);
      }

      const storage = this.getStorageProvider();
      
      // Download file from storage
      const fileBlob = await storage.downloadFile(evidence.file_url, evidence.file_name);

      return {
        success: true,
        file: fileBlob,
        filename: evidence.file_name,
        evidence: evidence
      };
    } catch (error) {
      console.error('Download evidence error:', error);
      throw error;
    }
  },

  // Get evidence file URL (for direct access)
  async getEvidenceUrl(evidenceId) {
    try {
      const { data: evidence, error } = await supabase
        .from('kri_evidence')
        .select('file_url, file_name')
        .eq('evidence_id', evidenceId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch evidence URL: ${error.message}`);
      }

      return {
        success: true,
        url: evidence.file_url,
        filename: evidence.file_name
      };
    } catch (error) {
      console.error('Get evidence URL error:', error);
      throw error;
    }
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