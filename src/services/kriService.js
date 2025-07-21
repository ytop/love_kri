import { supabase } from './supabase';
import { StorageManager, EvidenceStorageService } from './ObjectStorage';
import { kriCalculationService } from './kriCalculation';
import { calculateBreachStatus } from '@/utils/helpers';

export const kriService = {
  // ========================================
  // STORAGE SERVICE INITIALIZATION
  // ========================================
  // NOTE: Storage provider and evidence management code has been MOVED to @src/services/ObjectStorage.js
  // - StorageManager: Handles storage provider configuration (Supabase, Local, Mock)
  // - EvidenceStorageService: Combines file storage with database operations
  // - All original functionality preserved with improved separation of concerns
  // ========================================
  
  _storageManager: null,
  _evidenceService: null,
  
  getStorageManager() {
    if (!this._storageManager) {
      this._storageManager = new StorageManager();
    }
    return this._storageManager;
  },

  getEvidenceService() {
    if (!this._evidenceService) {
      this._evidenceService = new EvidenceStorageService(this.getStorageManager(), supabase);
      // Set audit service for evidence operations - ensures audit logging continues to work
      this._evidenceService.setAuditService(this);
    }
    return this._evidenceService;
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

  // ========================================
  // EVIDENCE MANAGEMENT METHODS
  // ========================================
  // NOTE: These methods have been MOVED to @src/services/ObjectStorage.js
  // - Storage provider management: StorageManager class
  // - Evidence file operations: EvidenceStorageService class
  // - All audit logging is preserved through service delegation
  // ========================================

  async uploadEvidence(kriId, reportingDate, file, description, uploadedBy) {
    // Delegated to EvidenceStorageService in @src/services/ObjectStorage.js
    return await this.getEvidenceService().uploadEvidence(kriId, reportingDate, file, description, uploadedBy);
  },

  async deleteEvidence(evidenceId, deletedBy) {
    // Delegated to EvidenceStorageService in @src/services/ObjectStorage.js
    return await this.getEvidenceService().deleteEvidence(evidenceId, deletedBy);
  },

  async downloadEvidence(evidenceId) {
    // Delegated to EvidenceStorageService in @src/services/ObjectStorage.js
    return await this.getEvidenceService().downloadEvidence(evidenceId);
  },

  async getEvidenceUrl(evidenceId) {
    // Delegated to EvidenceStorageService in @src/services/ObjectStorage.js
    return await this.getEvidenceService().getEvidenceUrl(evidenceId);
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

  // Atomic Data Element Management Methods

  // Save atomic value (update specific atomic element)
  async saveAtomicValue(kriId, reportingDate, atomicId, atomicValue, changedBy) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      const { data, error } = await supabase
        .from('kri_atomic')
        .update({
          atomic_value: atomicValue,
          atomic_status: 30 // Saved status
        })
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .eq('atomic_id', parseInt(atomicId))
        .select()
        .single();

      if (error) {
        console.error('Error saving atomic value:', error);
        throw new Error('Failed to save atomic value');
      }

      // Add audit trail entry for atomic value change
      await this.addAuditTrailEntry(kriId, reportingDate, 'atomic_save', `atomic_${atomicId}_value`, null, atomicValue, changedBy, `Atomic element ${atomicId} value saved`);

      return data;
    } catch (error) {
      console.error('Save atomic value error:', error);
      throw error;
    }
  },

  // Approve atomic data elements
  async approveAtomicElements(kriId, reportingDate, atomicIds, changedBy) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      // Update multiple atomic elements to approved status (60)
      const { data, error } = await supabase
        .from('kri_atomic')
        .update({
          atomic_status: 60 // Finalized status
        })
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .in('atomic_id', atomicIds.map(id => parseInt(id)))
        .select();

      if (error) {
        console.error('Error approving atomic elements:', error);
        throw new Error('Failed to approve atomic elements');
      }

      // Add audit trail entries for each approved element
      for (const atomicId of atomicIds) {
        await this.addAuditTrailEntry(
          kriId, 
          reportingDate, 
          'atomic_approve', 
          `atomic_${atomicId}_status`, 
          null, 
          '60', 
          changedBy, 
          `Atomic element ${atomicId} approved`
        );
      }

      return data;
    } catch (error) {
      console.error('Approve atomic elements error:', error);
      throw error;
    }
  },

  // Reject atomic data elements
  async rejectAtomicElements(kriId, reportingDate, atomicIds, reason, changedBy) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      // Update multiple atomic elements to rejected status (20 - Under Rework)
      const { data, error } = await supabase
        .from('kri_atomic')
        .update({
          atomic_status: 20 // Under Rework status
        })
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .in('atomic_id', atomicIds.map(id => parseInt(id)))
        .select();

      if (error) {
        console.error('Error rejecting atomic elements:', error);
        throw new Error('Failed to reject atomic elements');
      }

      // Add audit trail entries for each rejected element
      for (const atomicId of atomicIds) {
        await this.addAuditTrailEntry(
          kriId, 
          reportingDate, 
          'atomic_reject', 
          `atomic_${atomicId}_status`, 
          null, 
          '20', 
          changedBy, 
          `Atomic element ${atomicId} rejected: ${reason}`
        );
      }

      return data;
    } catch (error) {
      console.error('Reject atomic elements error:', error);
      throw error;
    }
  },

  // Submit atomic data (move all atomic elements to submitted status)
  async submitAtomicData(kriId, reportingDate, changedBy) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      // Update all atomic elements to submitted status (40)
      const { data, error } = await supabase
        .from('kri_atomic')
        .update({
          atomic_status: 40 // Submitted to Data Provider Approver
        })
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .select();

      if (error) {
        console.error('Error submitting atomic data:', error);
        throw new Error('Failed to submit atomic data');
      }

      // Add audit trail entry for atomic data submission
      await this.addAuditTrailEntry(
        kriId, 
        reportingDate, 
        'atomic_submit', 
        'atomic_data_status', 
        null, 
        '40', 
        changedBy, 
        'All atomic data elements submitted for approval'
      );

      return data;
    } catch (error) {
      console.error('Submit atomic data error:', error);
      throw error;
    }
  },

  // Bulk update atomic values (for efficient bulk operations)
  async bulkUpdateAtomicValues(kriId, reportingDate, atomicUpdates, changedBy) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      const updatePromises = atomicUpdates.map(async (update) => {
        const { data, error } = await supabase
          .from('kri_atomic')
          .update({
            atomic_value: update.value,
            atomic_status: 30 // Saved status
          })
          .eq('kri_id', parseInt(kriId))
          .eq('reporting_date', reportingDateAsInt)
          .eq('atomic_id', parseInt(update.atomicId))
          .select()
          .single();

        if (error) {
          console.error(`Error updating atomic ${update.atomicId}:`, error);
          throw new Error(`Failed to update atomic element ${update.atomicId}`);
        }

        // Add audit trail entry for each atomic value change
        await this.addAuditTrailEntry(
          kriId, 
          reportingDate, 
          'bulk_atomic_save', 
          `atomic_${update.atomicId}_value`, 
          update.oldValue || null, 
          update.value, 
          changedBy, 
          `Atomic element ${update.atomicId} updated via bulk operation`
        );

        return data;
      });

      const results = await Promise.all(updatePromises);
      
      // Add overall bulk operation audit entry
      await this.addAuditTrailEntry(
        kriId, 
        reportingDate, 
        'bulk_atomic_operation', 
        'atomic_data_bulk_update', 
        null, 
        `${atomicUpdates.length} elements updated`, 
        changedBy, 
        `Bulk update operation completed for ${atomicUpdates.length} atomic elements`
      );

      return results;
    } catch (error) {
      console.error('Bulk update atomic values error:', error);
      throw error;
    }
  },

  // ========================================
  // KRI CALCULATION METHODS
  // ========================================
  // NOTE: Formula execution logic has been MOVED to @src/services/kriCalculation.js
  // - KRICalculationService: Handles all formula parsing and mathematical calculations
  // - Database operations remain here for data persistence and audit logging
  // ========================================

  // Calculate KRI value from atomic elements using external calculation service
  async calculateKRIFromAtomic(kriId, reportingDate, changedBy) {
    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);
    
    try {
      // Get KRI details and atomic data
      const [kriDetail, atomicData] = await Promise.all([
        this.fetchKRIDetail(kriId, reportingDate),
        this.fetchKRIAtomic(kriId, reportingDate)
      ]);

      if (!kriDetail || !atomicData || atomicData.length === 0) {
        throw new Error('KRI or atomic data not found');
      }

      // Delegated to KRICalculationService in @src/services/kriCalculation.js
      const result = kriCalculationService.executeFormulaCalculation(kriDetail.kri_formula, atomicData);
      
      if (isNaN(result) || !isFinite(result)) {
        throw new Error('Calculation resulted in invalid number');
      }

      // Calculate new breach status using calculation service
      const newBreachStatus = kriCalculationService.calculateKRIBreachStatus(result, kriDetail.warning_line_value, kriDetail.limit_value);

      // Update KRI with calculated value
      const { data, error } = await supabase
        .from('kri_item')
        .update({
          kri_value: result.toString(),
          breach_type: newBreachStatus
        })
        .eq('kri_id', parseInt(kriId))
        .eq('reporting_date', reportingDateAsInt)
        .select()
        .single();

      if (error) {
        console.error('Error updating calculated KRI value:', error);
        throw new Error('Failed to update calculated KRI value');
      }

      // Add audit trail entry
      await this.addAuditTrailEntry(
        kriId, 
        reportingDate, 
        'calculate_kri', 
        'kri_value', 
        kriDetail.kri_value, 
        result.toString(), 
        changedBy, 
        `KRI value calculated from atomic elements: ${result}`
      );

      return {
        ...data,
        calculatedValue: result,
        previousValue: kriDetail.kri_value,
        atomicValues: atomicData.map(item => ({ 
          id: item.atomic_id, 
          value: item.atomic_value 
        }))
      };
    } catch (error) {
      console.error('Calculate KRI from atomic error:', error);
      throw error;
    }
  },

};