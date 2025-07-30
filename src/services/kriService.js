import { supabase } from './supabase';

/**
 * Base service class providing common patterns for KRI database operations
 * Eliminates duplicate code across KRI service methods
 */
class BaseKRIService {
// ----------------------------- Helper Functions -----------------------------
/**
 * Parse reporting date from YYYY-MM-DD format to YYYYMMDD integer
 * @param {string|number|Array} reportingDate - Date in YYYY-MM-DD format or array of dates
 * @returns {number|Array} Date as integer in YYYYMMDD format or array of integers
 */
  parseReportingDate(reportingDate) {
    if (!reportingDate) throw new Error('Reporting date is required');
    if (Array.isArray(reportingDate)) return reportingDate.map(date => this.parseReportingDate(date));
    if (typeof reportingDate === 'number') return reportingDate;
    if (typeof reportingDate === 'string'){
      if (reportingDate.includes('-')) {
        return parseInt(reportingDate.replace(/-/g, ''), 10);
      } else {
        return parseInt(reportingDate, 10);
      }
    }
    throw new Error('Invalid reporting date format: ' + reportingDate);
  }

  /**
 * Parse KRI ID from string or number
 * @param {string|number|Array} kriId - KRI ID or array of KRI IDs
 * @returns {number|Array} KRI ID as integer or array of integers
 */
  parseKRIId(kriId) {
    if (!kriId) throw new Error('KRI ID is required');
    if (Array.isArray(kriId)) return kriId.map(id => this.parseKRIId(id));
    if (typeof kriId === 'number') return [kriId];
    if (typeof kriId === 'string') return [parseInt(kriId, 10)];
    throw new Error('Invalid KRI ID format: ' + kriId);
  }

  /*
* Fetch data from any table with a primary key
* @param {string} table - Table name
* @param {Array} primaryKey - Primary key column name
* @param {Array} primaryValues - Array of primary key values
* @param {string} select - Columns to select (default: '*')
* @param {object} orderBy - Order by configuration {column, ascending}, eg {column: 'reporting_date', ascending: true}
* @returns {Promise<object>} Query result (may be single or multiple records)
*/
  async generalFetch(table, primaryKey, primaryValues, select = '*', orderBy = null) {
    // primaryKey is array, primaryValues is array of values (same order)
    if (!Array.isArray(primaryKey) || !Array.isArray(primaryValues)) {
      throw new Error('primaryKey and primaryValues must be arrays');
    }
    if (primaryKey.length !== primaryValues.length) {
      throw new Error('primaryKey and primaryValues must have the same length');
    }

    let query = supabase.from(table).select(select);

    // Build filters, handling arrays and single values properly
    for (let i = 0; i < primaryKey.length; i++) {
      const key = primaryKey[i];
      const value = primaryValues[i];
      
      if (value !== '*') {
        if (Array.isArray(value)) {
          // Use .in() for array values
          query = query.in(key, value);
        } else {
          // Use .eq() for single values
          query = query.eq(key, value);
        }
      }
    }

    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
    }
    return query;
  }

  // ----------------------------- KRI -----------------------------
  /**
 * Fetch KRI record(s) with base query parameters.
 * kriId and reportingDate can be a single value or an array of values.
 * @param {string|number|Array} kriId - KRI ID or array of KRI IDs
 * @param {string|number|Array} reportingDate - Reporting date(s)
 * @param {string} select - Columns to select (default: '*')
 * @param {object} orderBy - Order by configuration {column, ascending}, eg {column: 'reporting_date', ascending: true}
 * @returns {Promise<object>} Query result (may be single or multiple records)
 */
  async fetchKRI(kriId, reportingDate, select = '*', orderBy = null) {
    // parse kriId and reportingDate, support array or single value
    const kriIdInts = kriId === '*' ? '*' : this.parseKRIId(kriId);
    const reportingDateInts = reportingDate === '*' ? '*' : this.parseReportingDate(reportingDate);
    
    return this.generalFetch('kri_item', ['kri_id', 'reporting_date'], [kriIdInts, reportingDateInts], select, orderBy); 
  }

  /**
 * Fetch historical KRI data for trend analysis
 * Gets the last N months of KRI data for a specific KRI ID
 * @param {string|number} kriId - KRI ID
 * @param {number} months - Number of months to fetch (default: 12)
 * @returns {Promise<object>} Query result with historical data ordered by reporting_date
 */
  async fetchKRIHistorical(kriId, months = 12) {
    if (kriId === '*') {
      throw new Error('kriId cannot be "*"');
    }
    const kriIdInts = this.parseKRIId(kriId);
    let kriIdInt;
    if (kriIdInts.length == 1) {
      kriIdInt = kriIdInts[0];
    } else {
      throw new Error('kriId must be a single value');
    }
    
    // Calculate date range for the last N months
    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - months + 1, 1); // First day of N months ago
    
    // Convert to YYYYMMDD format
    const endDateInt = parseInt(
      endDate.getFullYear().toString() + 
      (endDate.getMonth() + 1).toString().padStart(2, '0') + 
      endDate.getDate().toString().padStart(2, '0')
    );
    const startDateInt = parseInt(
      startDate.getFullYear().toString() + 
      (startDate.getMonth() + 1).toString().padStart(2, '0') + 
      startDate.getDate().toString().padStart(2, '0')
    );

    // Query historical data within date range using metadata-aware view
    const { data, error } = await supabase
      .from('kri_with_metadata')
      .select('kri_id, reporting_date, kri_value')
      .eq('kri_id', kriIdInt)
      .gte('reporting_date', startDateInt)
      .lte('reporting_date', endDateInt)
      .order('reporting_date', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  }

  /**
 * Server-side function: updateKRI
 * This function updates a single KRI record in the kri_item table and logs the change in kri_audit_trail.
 * It takes the KRI ID, reporting date, update data (as JSON), user info, action, and comment.
 * For each field updated, it logs the old and new value in the audit trail.
 * @database.sql line 102
 * Update KRI record with base query parameters and audit trail
 * Once per time, only one kriId and reportingDate can be updated
 * @param {string} table - Table name
 * @param {string|number} kriId - KRI ID
 * @param {string} reportingDate - Reporting date
 * @param {object} updateData - Data to update
 * @param {string} changedBy - User making the change
 * @param {string} action - Action description for audit
 * @param {string} comment - Comment for audit trail
 * @returns {Promise<object>} Updated record
 */
  async updateKRI(kriId, reportingDate, updateData, changedBy, action, comment = '') {
    if (!changedBy) throw new Error('changedBy is required');
    if (!action) throw new Error('action is required');
    if (!comment) throw new Error('comment is required');
    if (!updateData) throw new Error('updateData is required');

    // Only allow single kriId and reportingDate
    const kriIdInts = this.parseKRIId(kriId);
    const reportingDateInt = this.parseReportingDate(reportingDate);
    
    if (kriIdInts.length !== 1) {
      throw new Error('Only one kriId can be updated at a time');
    }
    
    // Call the Postgres function via Supabase RPC
    const { data, error } = await supabase.rpc('updatekri', {
      p_kri_id: kriIdInts[0],
      p_reporting_date: reportingDateInt,
      p_update_data: updateData,
      p_changed_by: changedBy,
      p_action: action,
      p_comment: comment
    });

    if (error) throw error;
    return data;
  }

  // ----------------------------- Atomic KRI -----------------------------
  /**
 * Fetch atomic KRI record(s) with base query parameters.
 * kriId, atomicId, and reportingDate can be a single value or an array of values.
 * @param {string|number|Array} kriId - KRI ID(s)
 * @param {string|number|Array} atomicId - Atomic ID(s)
 * @param {string|number|Array} reportingDate - Reporting date(s)
 * @param {string} select - Columns to select (default: '*')
 * @returns {Promise<object>} Query result (may be single or multiple records)
 */
  async fetchAtomicKRI(kriId, atomicId, reportingDate, select = '*') {
    if (reportingDate === '*' || reportingDate === undefined) {
      throw new Error('reportingDate must be provided and cannot be "*"');
    }

    const kriIdInts = kriId === '*' ? '*' : this.parseKRIId(kriId);
    const atomicIdInts = atomicId === '*' ? '*' : this.parseKRIId(atomicId);
    const reportingDateInts = this.parseReportingDate(reportingDate);


    return this.generalFetch('kri_atomic', ['kri_id', 'atomic_id', 'reporting_date'], [kriIdInts, atomicIdInts, reportingDateInts], select);
  }

  /**
 * Server-side function: updateatomickri
 * This function updates a single atomic KRI record in the kri_atomic table and logs the change in kri_audit_trail.
 * It takes the KRI ID, atomic ID, reporting date, update data (as JSON), user info, action, and comment.
 * For each field updated, it logs the old and new value in the audit trail.
 * @database.sql line 208
 * JS function to invoke the above server-side function for atomic KRI update.
 * @param {number} kriId - KRI ID
 * @param {number} atomicId - Atomic ID
 * @param {number} reportingDate - Reporting date (YYYYMMDD)
 * @param {object} updateData - Fields to update (key-value pairs)
 * @param {string} changedBy - User making the change
 * @param {string} action - Action performed (e.g. 'update_atomic')
 * @param {string} comment - Optional comment
 * @returns {Promise<object>} Updated kri_atomic row
 */
  // TODO: fix in the future, the function did not exist in the database
  async updateatomickri(kriId, atomicId, reportingDate, updateData, changedBy, action, comment = '') {
    if (!changedBy) throw new Error('changedBy is required');
    if (!action) throw new Error('action is required');
    if (!comment) throw new Error('comment is required');
    if (!updateData) throw new Error('updateData is required');
    if (!kriId || !atomicId || !reportingDate) throw new Error('kriId, atomicId, and reportingDate are required');

    // Call the Postgres function via Supabase RPC
    const { data, error } = await supabase.rpc('updateatomickri', {
      p_kri_id: kriId,
      p_atomic_id: atomicId,
      p_reporting_date: reportingDate,
      p_update_data: updateData,
      p_changed_by: changedBy,
      p_action: action,
      p_comment: comment
    });

    if (error) throw error;
    return data;
  }

  // ----------------------------- Evidence -----------------------------
  /**
 * Fetch evidence record(s) for given KRI ID(s) and reporting date(s).
 * Mimics the kri_evidence table structure and query pattern.
 * @param {string|number|Array} kriId - KRI ID(s)
 * @param {string|number|Array} reportingDate - Reporting date(s)
 * @param {string} select - Columns to select (default: '*')
 * @returns {Promise<object>} Query result (may be single or multiple records)
 */
  async fetchEvidence(kriId, reportingDate, select = '*') {
    const kriIdInts = this.parseKRIId(kriId);
    const reportingDateInts = this.parseReportingDate(reportingDate);

    // Ensure both are arrays for .length check and .in query
    const kriIdArr = Array.isArray(kriIdInts) ? kriIdInts : [kriIdInts];
    const reportingDateArr = Array.isArray(reportingDateInts) ? reportingDateInts : [reportingDateInts];

    return this.generalFetch('kri_evidence', ['kri_id', 'reporting_date'], [kriIdArr, reportingDateArr], select);
  }

  /**
 * Server-side function: updateEvidence
 * This function updates a single evidence record in the kri_evidence table and logs the change in kri_audit_trail.
 * It takes the KRI ID, reporting date, update data (as JSON), user info, action, and comment.
 * For each field updated, it logs the old and new value in the audit trail.
 * JS function to invoke the above server-side function for evidence update.
 * @param {number} kriId - KRI ID
 * @param {number} reportingDate - Reporting date (YYYYMMDD)
 * @param {object} updateData - Fields to update (key-value pairs)
 * @param {string} changedBy - User making the change
 * @param {string} action - Action performed (e.g. 'update_evidence')
 * @param {string} comment - Optional comment
 * @returns {Promise<object>} Updated kri_evidence row
 */
  async updateEvidence(kriId, reportingDate, updateData, changedBy, action, comment = '') {
    if (!changedBy) throw new Error('changedBy is required');
    if (!action) throw new Error('action is required');
    if (!comment) throw new Error('comment is required');
    if (!updateData) throw new Error('updateData is required');
    if (!kriId || !reportingDate) throw new Error('kriId and reportingDate are required');

    // Call the Postgres function via Supabase RPC
    const { data, error } = await supabase.rpc('updateevidence', {
      p_evidence_id: kriId,  // This should be evidence_id for existing evidence updates
      p_update_data: updateData,
      p_changed_by: changedBy,
      p_action: action,
      p_comment: comment
    });

    if (error) throw error;
    return data;
  }

  /**
   * Insert new evidence record into kri_evidence table
   * @param {string} kriId - KRI ID
   * @param {number} reportingDate - Reporting date (YYYYMMDD)
   * @param {object} evidenceData - Evidence data to insert
   * @param {string} changedBy - User making the change
   * @param {string} action - Action performed (e.g. 'upload_evidence')
   * @param {string} comment - Optional comment
   * @returns {Promise<object>} Inserted kri_evidence row
   */
  async insertEvidence(kriId, reportingDate, evidenceData, changedBy, action, comment = '') {
    if (!changedBy) throw new Error('changedBy is required');
    if (!action) throw new Error('action is required');
    if (!comment) throw new Error('comment is required');
    if (!evidenceData) throw new Error('evidenceData is required');
    if (!kriId || !reportingDate) throw new Error('kriId and reportingDate are required');

    // Insert the evidence record
    const { data: evidenceRecord, error: insertError } = await supabase
      .from('kri_evidence')
      .insert({
        kri_id: kriId,
        reporting_date: reportingDate,
        ...evidenceData
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Add audit trail entry
    await this.addAuditTrailEntry(
      kriId,
      reportingDate,
      action,
      { evidence_id: evidenceRecord.evidence_id },
      '', // oldValue - empty for new record
      evidenceRecord.evidence_id, // newValue - the new evidence ID
      changedBy,
      comment
    );

    return evidenceRecord;
  }

  // ----------------------------- User & Permission -----------------------------

  /**
 * Fetch user record(s) from kri_user table.
 * @param {string} userId - user_id(s) to fetch
 * @param {string} select - Columns to select (default: '*')
 * @returns {Promise<object>} Query result (may be single or multiple records)
 */
  async fetchUser(userId, select = '*') {
    return this.generalFetch('kri_user', ['user_id'], [userId], select);
  }

  /**
 * Fetch user permission(s) from kri_user_permission table.
 * @param {string} userUuid - User UUID
 * @param {number} kriId - KRI ID
 * @param {number} reportingDate - Reporting date
 * @param {string} select - Columns to select (default: '*')
 * @returns {Promise<object>} Query result (may be single or multiple records)
 */
  // Best practice: userUuid is not allowed to be '*'
  // but kriId and reportingDate could be '*' to fetch all records
  // reportingDate is recommended to be a single value
  async fetchUserPermission(userUuid, kriId = '*', reportingDate = '*', select = '*') {
    if (!userUuid || userUuid === '*') throw new Error('userUuid cannot be "*"');
    const reportingDateInts = this.parseReportingDate(reportingDate);
    return this.generalFetch('kri_user_permission', ['user_uuid', 'kri_id', 'reporting_date'], [userUuid, kriId, reportingDateInts], select);
  }

  // /**
  //  * Update user permission for a specific KRI and reporting date.
  //  * @param {string} userUuid - User UUID
  //  * @param {number} kriId - KRI ID
  //  * @param {number} reportingDate - Reporting date (YYYYMMDD)
  //  * @param {object} updateData - Fields to update (key-value pairs)
  //  * @returns {Promise<object>} Updated kri_user_permission row
  //  */
  // async updateUserPermission(userUuid, kriId, reportingDate, updateData) {
  //   if (!userUuid || !kriId || !reportingDate) {
  //     throw new Error('userUuid, kriId, and reportingDate are required');
  //   }
  //   if (!updateData) {
  //     throw new Error('updateData is required');
  //   }

  //   const { data, error } = await supabase
  //     .from('kri_user_permission')
  //     .update(updateData)
  //     .eq('user_uuid', userUuid)
  //     .eq('kri_id', kriId)
  //     .eq('reporting_date', reportingDate)
  //     .select()
  //     .single();

  //   if (error) throw error;
  //   return data;
  // }

  // /**
  //  * Insert a new user permission record.
  //  * @param {object} permissionData - Object with user_uuid, kri_id, reporting_date, actions, effect, etc.
  //  * @returns {Promise<object>} Inserted kri_user_permission row
  //  */
  // async insertUserPermission(permissionData) {
  //   if (!permissionData) throw new Error('permissionData is required');
  //   const { data, error } = await supabase
  //     .from('kri_user_permission')
  //     .insert(permissionData)
  //     .select()
  //     .single();
  //   if (error) throw error;
  //   return data;
  // }


  // ----------------------------- Audit Trail -----------------------------

  async fetchAuditTrail(kriId, reportingDate, select = '*') {
    if (!kriId || !reportingDate) throw new Error('kriId and reportingDate are required');
    return this.generalFetch('kri_audit_trail', ['kri_id', 'reporting_date'], [kriId, reportingDate], select, {column: 'changed_at', ascending: false});
  }

  /**
   * Audit Trail are automatically added by the server-side function updateKRI, updateatomickri, updateEvidence
   * This function is used to manually add audit trail entry only when needed
    * Manually add audit trail entry with consistent pattern
    * @param {string|number} kriId - KRI ID
    * @param {string} reportingDate - Reporting date
    * @param {string} action - Action performed
    * @param {string} fieldName - Field that was changed
    * @param {*} oldValue - Previous value
    * @param {*} newValue - New value
    * @param {string} changedBy - User making the change
    * @param {string} comment - Additional comment
    * @returns {Promise<object>} Audit trail record
    */
  async addAuditTrailEntry(kriId, reportingDate, action, updateData, oldValue, newValue, changedBy, comment = '') {
    const kriIdInts = this.parseKRIId(kriId);
    if (kriIdInts.length !== 1) {
      throw new Error('Only one kriId can be used for audit trail entry');
    }
    
    const auditData = {
      kri_id: kriIdInts[0],
      reporting_date: this.parseReportingDate(reportingDate),
      changed_at: new Date().toISOString(),
      changed_by: changedBy,
      action,
      field_name: Object.keys(updateData)[0],
      old_value: oldValue ? String(oldValue) : null,
      new_value: newValue ? String(newValue) : null,
      comment
    };

    const { data, error } = await supabase
      .from('kri_audit_trail')
      .insert(auditData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add audit trail entry: ${error.message}`);
    }

    return { data };
  }
}

const baseKRIService = new BaseKRIService();

export const kriService = {

  // A place to store all the functions that are used to fetch data from the database
  // Just passing same parameters to the baseKRIService
  // ---------------------------------- fetch ---------------------------
  async fetchKRIItems(reportingDate = null, userDepartment = null) {
    // Return empty array immediately for unauthenticated users
    if (!userDepartment || userDepartment.trim() === '') {
      return [];
    }
    
    // Use kri_with_metadata view to get complete KRI data including metadata
    let query = supabase.from('kri_with_metadata').select('*');
    
    if (reportingDate) {
      const reportingDateInts = baseKRIService.parseReportingDate(reportingDate);
      if (Array.isArray(reportingDateInts)) {
        query = query.in('reporting_date', reportingDateInts);
      } else {
        query = query.eq('reporting_date', reportingDateInts);
      }
    }
    
    // Apply department filtering at database level - only show KRIs where user's department matches owner or data provider
    query = query.or(`kri_owner.ilike.%${userDepartment}%,data_provider.ilike.%${userDepartment}%`);
    
    const { data, error } = await query.order('kri_id', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async fetchKRIDetail(kriId, reportingDate) {
    const kriIdInt = baseKRIService.parseKRIId(kriId)[0];
    const reportingDateInt = baseKRIService.parseReportingDate(reportingDate);
    
    // Use the database function to get KRI with metadata
    const { data, error } = await supabase.rpc('get_kri_with_metadata', {
      p_kri_id: kriIdInt,
      p_reporting_date: reportingDateInt
    });
    
    if (error) throw error;
    return data?.[0] || {};
  },

  async fetchKRIAtomic(kriId, reportingDate) {
    const { data } = await baseKRIService.fetchAtomicKRI(kriId, '*', reportingDate);
    return data;
  },

  async fetchKRIEvidence(kriId, reportingDate) {
    const { data } = await baseKRIService.fetchEvidence(kriId, reportingDate);
    return data;
  },

  async fetchKRIAuditTrail(kriId, reportingDate) {
    const { data } = await baseKRIService.fetchAuditTrail(kriId, reportingDate);
    return data;
  },

  async fetchKRIHistorical(kriId, months = 12) {
    const { data } = await baseKRIService.fetchKRIHistorical(kriId, months);
    return data;
  },

  async fetchUser(userId) {
    const { data } = await baseKRIService.fetchUser(userId);
    return data;
  },

  async fetchUserPermission(userUuid, kriId = '*', reportingDate = '*', select = '*') {
    const { data } = await baseKRIService.fetchUserPermission(userUuid, kriId, reportingDate, select);
    return data;
  },

  // ---------------------------------- update ---------------------------

  async updateKRI(kriId, reportingDate, updateData, changedBy, action, comment = '') {
    const { data } = await baseKRIService.updateKRI(kriId, reportingDate, updateData, changedBy, action, comment);
    return data;
  },

  async updateatomickri(kriId, atomicId, reportingDate, updateData, changedBy, action, comment = '') {
    const { data } = await baseKRIService.updateatomickri(kriId, atomicId, reportingDate, updateData, changedBy, action, comment);
    return data;
  },

  async updateEvidence(evidenceId, updateData, changedBy, action, comment = '') {
    const { data } = await baseKRIService.updateEvidence(evidenceId, null, updateData, changedBy, action, comment);
    return data;
  },

  async insertEvidence(kriId, reportingDate, evidenceData, changedBy, action, comment = '') {
    const { data } = await baseKRIService.insertEvidence(kriId, reportingDate, evidenceData, changedBy, action, comment);
    return data;
  },

  async checkFileExists(md5Hash) {
    if (!md5Hash) return null;
    
    const { data, error } = await supabase
      .from('kri_evidence')
      .select('evidence_id, kri_id, reporting_date, file_name, uploaded_by, uploaded_at')
      .eq('md5', md5Hash)
      .order('uploaded_at', { ascending: false })
      .limit(5); // Get up to 5 most recent duplicates
    
    if (error) {
      console.error('Error checking file duplicates:', error);
      return null;
    }
    
    return data && data.length > 0 ? data : null;
  },

  async linkEvidenceToKRI(kriId, reportingDate, evidenceId, changedBy, comment = 'Evidence selected as submitted evidence') {
    if (!kriId || !reportingDate || !evidenceId || !changedBy) {
      throw new Error('kriId, reportingDate, evidenceId, and changedBy are required');
    }

    const updateData = { evidence_id: evidenceId };
    
    const result = await baseKRIService.updateKRI(
      kriId,
      reportingDate,
      updateData,
      changedBy,
      'select_evidence',
      comment
    );
    
    return result;
  },

  async unlinkEvidenceFromKRI(kriId, reportingDate, changedBy, comment = 'Evidence selection removed') {
    if (!kriId || !reportingDate || !changedBy) {
      throw new Error('kriId, reportingDate, and changedBy are required');
    }

    const updateData = { evidence_id: null };
    
    const result = await baseKRIService.updateKRI(
      kriId,
      reportingDate,
      updateData,
      changedBy,
      'unselect_evidence',
      comment
    );
    
    return result;
  },

  async getSelectedEvidence(kriItem, evidenceData) {
    if (!kriItem || !evidenceData || evidenceData.length === 0) {
      return null;
    }

    // If KRI has a selected evidence_id, find that evidence
    if (kriItem.evidence_id) {
      const selectedEvidence = evidenceData.find(evidence => evidence.evidence_id === kriItem.evidence_id);
      if (selectedEvidence) {
        return selectedEvidence;
      }
      // If selected evidence not found in current data, log warning but continue
      console.warn(`Selected evidence ID ${kriItem.evidence_id} not found in evidence data for KRI ${kriItem.kri_id}`);
    }

    // Fall back to latest evidence if no selection or selected not found
    if (evidenceData && evidenceData.length > 0) {
      return [...evidenceData].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))[0];
    }

    return null;
  },

  // ---------------------------------- atomic evidence functions ---------------------------

  async linkEvidenceToAtomic(kriId, atomicId, reportingDate, evidenceId, changedBy, comment = 'Evidence linked to atomic element') {
    if (!kriId || !atomicId || !reportingDate || !evidenceId || !changedBy) {
      throw new Error('kriId, atomicId, reportingDate, evidenceId, and changedBy are required');
    }

    const updateData = { evidence_id: evidenceId };
    
    const result = await baseKRIService.updateatomickri(
      kriId,
      atomicId,
      reportingDate,
      updateData,
      changedBy,
      'select_atomic_evidence',
      comment
    );
    
    return result;
  },

  async unlinkEvidenceFromAtomic(kriId, atomicId, reportingDate, changedBy, comment = 'Evidence unlinked from atomic element') {
    if (!kriId || !atomicId || !reportingDate || !changedBy) {
      throw new Error('kriId, atomicId, reportingDate, and changedBy are required');
    }

    const updateData = { evidence_id: null };
    
    const result = await baseKRIService.updateatomickri(
      kriId,
      atomicId,
      reportingDate,
      updateData,
      changedBy,
      'unselect_atomic_evidence',
      comment
    );
    
    return result;
  },

  async fetchAtomicWithEvidence(kriId, reportingDate) {
    // First fetch atomic data
    const atomicData = await this.fetchKRIAtomic(kriId, reportingDate);
    
    if (!atomicData || atomicData.length === 0) {
      return [];
    }

    // Get all evidence IDs from atomic data
    const evidenceIds = atomicData
      .map(atomic => atomic.evidence_id)
      .filter(id => id !== null && id !== undefined);

    if (evidenceIds.length === 0) {
      // Return atomic data with null evidence
      return atomicData.map(atomic => ({
        ...atomic,
        linkedEvidence: null
      }));
    }

    // Fetch evidence data for the evidence IDs
    const { data: evidenceData, error } = await supabase
      .from('kri_evidence')
      .select('*')
      .in('evidence_id', evidenceIds);

    if (error) {
      console.error('Error fetching atomic evidence:', error);
      // Return atomic data without evidence on error
      return atomicData.map(atomic => ({
        ...atomic,
        linkedEvidence: null
      }));
    }

    // Join atomic data with evidence data
    return atomicData.map(atomic => ({
      ...atomic,
      linkedEvidence: evidenceData.find(evidence => evidence.evidence_id === atomic.evidence_id) || null
    }));
  },

  async updateAuditTrail(kriId, reportingDate, updateData, changedBy, action, comment = '') {
    const { data } = await baseKRIService.addAuditTrailEntry(kriId, reportingDate, updateData, changedBy, action, comment);
    return data;
  },

  // ---------------------------------- metadata functions ---------------------------
  
  async fetchKRIMetadata(kriCode, effectiveDate = null) {
    const { data, error } = await supabase.rpc('get_kri_metadata_at_time', {
      p_kri_code: kriCode,
      p_effective_date: effectiveDate || new Date().toISOString()
    });
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async fetchCurrentKRIMetadata(kriCode) {
    const { data, error } = await supabase.rpc('get_current_kri_metadata', {
      p_kri_code: kriCode
    });
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async fetchKRIConfig(kriCode, effectiveTime = null) {
    const { data, error } = await supabase.rpc('get_kri_config_at_time', {
      p_kri_code: kriCode,
      p_effective_time: effectiveTime || new Date().toISOString()
    });
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async fetchKRIsForDate(reportingDate) {
    const reportingDateInt = baseKRIService.parseReportingDate(reportingDate);
    
    const { data, error } = await supabase.rpc('get_kris_for_date', {
      p_reporting_date: reportingDateInt
    });
    
    if (error) throw error;
    return data || [];
  },

  async fetchMetadataHistory(kriCode) {
    if (!kriCode) throw new Error('kriCode is required');
    
    const { data, error } = await supabase
      .from('metadata_history')
      .select('*')
      .eq('kri_code', kriCode)
      .order('effective_from', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // ---------------------------------- ADMIN MANAGEMENT FUNCTIONS ---------------------------

  /**
   * Get all users in the system (admin function)
   * @returns {Promise<Array>} Array of all users
   */
  async getAllUsers() {
    const { data, error } = await supabase
      .from('kri_user')
      .select('uuid, user_id, user_name, department, user_role, other_info')
      .order('user_id', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Get users by department
   * @param {string} department - Department name
   * @returns {Promise<Array>} Array of users in the department
   */
  async getUsersByDepartment(department) {
    if (!department) throw new Error('Department is required');
    
    const { data, error } = await supabase
      .from('kri_user')
      .select('uuid, user_id, user_name, department, user_role, other_info')
      .eq('department', department)
      .order('user_id', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Update user role
   * @param {string} userUuid - User UUID
   * @param {string} newRole - New role ('user', 'dept_admin', 'admin')
   * @param {string} changedBy - User making the change
   * @returns {Promise<Object>} Updated user record
   */
  async updateUserRole(userUuid, newRole, changedBy) {
    if (!userUuid || !newRole || !changedBy) {
      throw new Error('userUuid, newRole, and changedBy are required');
    }

    const validRoles = ['user', 'dept_admin', 'admin'];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}. Valid roles: ${validRoles.join(', ')}`);
    }

    const { data, error } = await supabase
      .from('kri_user')
      .update({ user_role: newRole })
      .eq('uuid', userUuid)
      .select()
      .single();

    if (error) throw error;

    // Log the role change in audit trail (if needed for compliance)
    await this.logUserRoleChange(userUuid, newRole, changedBy);

    return data;
  },

  /**
   * Get all departments in the system
   * @returns {Promise<Array>} Array of unique departments
   */
  async getAllDepartments() {
    const { data, error } = await supabase
      .from('kri_user')
      .select('department')
      .not('department', 'is', null)
      .not('department', 'eq', '');
    
    if (error) throw error;
    
    // Extract unique departments
    const departments = [...new Set(data.map(row => row.department))].filter(dept => dept);
    return departments.sort();
  },

  /**
   * Get KRIs owned by a specific department
   * @param {string} department - Department name
   * @returns {Promise<Array>} Array of KRI metadata for the department
   */
  async getDepartmentKRIs(department) {
    if (!department) throw new Error('Department is required');
    
    const { data, error } = await supabase
      .from('kri_metadata')
      .select('*')
      .eq('owner', department)
      .order('kri_code', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Bulk delete permissions
   * @param {Array} permissionIds - Array of permission IDs to delete
   * @param {string} changedBy - User making the changes
   * @returns {Promise<void>}
   */
  async bulkDeletePermissions(permissionIds, changedBy) {
    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      throw new Error('permissionIds must be a non-empty array');
    }
    if (!changedBy) {
      throw new Error('changedBy is required');
    }

    const { data, error } = await supabase
      .from('kri_user_permission')
      .delete()
      .in('id', permissionIds)
      .select();

    if (error) throw error;

    // Log the deletion for audit purposes
    console.log(`Bulk deleted ${permissionIds.length} permissions by ${changedBy} at ${new Date().toISOString()}`);

    return data;
  },

  /**
   * Bulk update user permissions
   * @param {Array} permissionUpdates - Array of permission update objects
   * @param {string} changedBy - User making the changes
   * @returns {Promise<Array>} Array of updated permission records
   */
  async bulkUpdatePermissions(permissionUpdates, changedBy) {
    if (!Array.isArray(permissionUpdates) || permissionUpdates.length === 0) {
      throw new Error('permissionUpdates must be a non-empty array');
    }
    if (!changedBy) {
      throw new Error('changedBy is required');
    }

    const results = [];
    
    for (const update of permissionUpdates) {
      const { user_uuid, kri_id, reporting_date, action, actions, effect = true } = update;
      
      // Support both old format (actions) and new format (action)
      const permissionAction = action || actions;
      
      if (!user_uuid || !kri_id || !reporting_date || !permissionAction) {
        throw new Error('Each permission update must have user_uuid, kri_id, reporting_date, and action/actions');
      }

      try {
        // Try to update existing permission first
        let { data, error } = await supabase
          .from('kri_user_permission')
          .update({
            action: permissionAction,
            effect,
            update_date: new Date().toISOString()
          })
          .eq('user_uuid', user_uuid)
          .eq('kri_id', kri_id)
          .eq('reporting_date', reporting_date)
          .eq('action', permissionAction)
          .select()
          .single();

        // If no existing permission, insert new one
        if (error && error.code === 'PGRST116') {
          const insertResult = await supabase
            .from('kri_user_permission')
            .insert({
              user_uuid,
              kri_id,
              reporting_date,
              action: permissionAction,
              effect,
              created_date: new Date().toISOString(),
              update_date: new Date().toISOString()
            })
            .select()
            .single();

          if (insertResult.error) throw insertResult.error;
          data = insertResult.data;
        } else if (error) {
          throw error;
        }

        results.push(data);
      } catch (err) {
        console.error(`Error updating permission for user ${user_uuid}, KRI ${kri_id}:`, err);
        throw err;
      }
    }

    return results;
  },

  /**
   * Get department statistics
   * @param {string} department - Department name
   * @returns {Promise<Object>} Department statistics
   */
  async getDepartmentStatistics(department) {
    if (!department) throw new Error('Department is required');

    // Get user count in department
    const { data: users, error: usersError } = await supabase
      .from('kri_user')
      .select('uuid, user_role')
      .eq('department', department);

    if (usersError) throw usersError;

    // Get KRI count owned by department
    const { data: kris, error: krisError } = await supabase
      .from('kri_metadata')
      .select('kri_code')
      .eq('owner', department);

    if (krisError) throw krisError;

    // Count users by role
    const roleCounts = users.reduce((acc, user) => {
      const role = user.user_role || 'user';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    return {
      department,
      totalUsers: users.length,
      totalKRIs: kris.length,
      usersByRole: roleCounts,
      users: users || [],
      kris: kris || []
    };
  },

  /**
   * Log user role changes for audit purposes
   * @param {string} userUuid - User UUID
   * @param {string} newRole - New role assigned
   * @param {string} changedBy - User making the change
   * @returns {Promise<void>}
   * @private
   */
  async logUserRoleChange(userUuid, newRole, changedBy) {
    try {
      // This could be expanded to use a dedicated audit table for user changes
      // For now, we'll use console logging and could store in a separate audit system
      console.log(`User role change: ${userUuid} -> ${newRole} by ${changedBy} at ${new Date().toISOString()}`);
      
      // Future implementation could store in dedicated audit table:
      // await supabase.from('user_audit_trail').insert({
      //   user_uuid: userUuid,
      //   action: 'role_change',
      //   old_value: oldRole,
      //   new_value: newRole,
      //   changed_by: changedBy,
      //   changed_at: new Date().toISOString()
      // });
    } catch (error) {
      console.error('Error logging user role change:', error);
      // Don't throw error as this is just logging
    }
  },

  /**
   * Get user permissions summary for admin interface
   * @param {string} userUuid - User UUID (optional, if not provided returns all users)
   * @param {Object} filters - Additional filters (department, kri_id, etc.)
   * @returns {Promise<Array>} Array of user permission summaries
   */
  async getUserPermissionsSummary(userUuid = null, filters = {}) {
    let query = supabase
      .from('kri_user_permission')
      .select(`
        *,
        kri_user!inner(user_id, user_name, department, user_role)
      `);

    // Apply filters
    if (userUuid) {
      query = query.eq('user_uuid', userUuid);
    }
    if (filters.department) {
      query = query.eq('kri_user.department', filters.department);
    }
    if (filters.kri_id) {
      query = query.eq('kri_id', filters.kri_id);
    }

    query = query.order('kri_id', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    
    // Group permissions by user and KRI for admin interface display
    const groupedPermissions = {};
    
    (data || []).forEach(permission => {
      const key = `${permission.user_uuid}_${permission.kri_id}`;
      
      if (!groupedPermissions[key]) {
        groupedPermissions[key] = {
          user_uuid: permission.user_uuid,
          kri_id: permission.kri_id,
          user_id: permission.kri_user?.user_id || 'Unknown',
          user_name: permission.kri_user?.user_name || 'Unknown',
          department: permission.kri_user?.department || 'Unknown',
          user_role: permission.kri_user?.user_role || 'user',
          actions: [],
          effect: true,
          reporting_date: permission.reporting_date
        };
      }
      
      // Add individual action to the actions array
      if (permission.action && permission.effect) {
        groupedPermissions[key].actions.push(permission.action);
      }
      
      // If any permission is inactive, mark the whole group as inactive
      if (!permission.effect) {
        groupedPermissions[key].effect = false;
      }
    });
    
    // Convert grouped permissions back to array and format actions as comma-separated string
    return Object.values(groupedPermissions).map(permission => ({
      ...permission,
      actions: permission.actions.join(', ')
    }));
  },

  /**
   * Get all KRI metadata for admin dropdown selections
   * @returns {Promise<Array>} Array of KRI data with kri_id, kri_code, and name
   */
  async getAllKRIMetadata() {
    const { data, error } = await supabase
      .from('kri_with_metadata')
      .select('kri_id, kri_code, kri_name')
      .order('kri_id', { ascending: true });
    
    if (error) throw error;
    
    // Remove duplicates based on kri_id (in case same KRI has multiple reporting dates)
    const uniqueKRIs = (data || []).reduce((acc, current) => {
      const existing = acc.find(item => item.kri_id === current.kri_id);
      if (!existing) {
        acc.push({
          kri_id: current.kri_id,
          kri_code: current.kri_code,
          name: current.kri_name || 'Unknown'
        });
      }
      return acc;
    }, []);
    
    return uniqueKRIs;
  },

  /**
   * Create a new user
   * @param {Object} userData - User data object
   * @param {string} changedBy - User creating the account
   * @returns {Promise<Object>} Created user record
   */
  async createUser(userData, changedBy) {
    if (!userData || !changedBy) {
      throw new Error('userData and changedBy are required');
    }

    const { user_id, user_name, department, user_role = 'user', other_info = '' } = userData;

    if (!user_id || !user_name || !department) {
      throw new Error('user_id, user_name, and department are required');
    }

    // Check if user_id already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('kri_user')
      .select('user_id')
      .eq('user_id', user_id)
      .single();

    if (existingUser) {
      throw new Error(`User ID '${user_id}' already exists`);
    }

    // If checkError is not "no rows" error, throw it
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // Validate role
    const validRoles = ['user', 'dept_admin', 'admin'];
    if (!validRoles.includes(user_role)) {
      throw new Error(`Invalid role: ${user_role}. Valid roles: ${validRoles.join(', ')}`);
    }

    // Create the user
    const { data, error } = await supabase
      .from('kri_user')
      .insert({
        user_id: user_id,
        user_name: user_name,
        department: department,
        user_role: user_role,
        other_info: other_info
      })
      .select()
      .single();

    if (error) throw error;

    // Log the user creation
    await this.logUserCreation(data.uuid, user_id, changedBy);

    return data;
  },

  /**
   * Log user creation for audit purposes
   * @param {string} userUuid - Created user UUID
   * @param {string} userId - Created user ID
   * @param {string} changedBy - User who created the account
   * @returns {Promise<void>}
   * @private
   */
  async logUserCreation(userUuid, userId, changedBy) {
    try {
      console.log(`User created: ${userId} (${userUuid}) by ${changedBy} at ${new Date().toISOString()}`);
      
      // Future implementation could store in dedicated audit table for user management
    } catch (error) {
      console.error('Error logging user creation:', error);
      // Don't throw error as this is just logging
    }
  },

  /**
 * Get recent audit trail activity for all KRIs owned by a department
 * @param {string} department - Department name
 * @param {number} [limit=20] - Max number of records
 * @returns {Promise<Array>}
 */
  async getDepartmentRecentActivity(department, limit = 20) {
    const { data: kris, error: kriError } = await supabase
      .from('kri_metadata')
      .select('kri_id')
      .eq('owner', department);
    if (kriError) throw kriError;
    const kriIds = (kris || []).map(k => k.kri_id);
    if (!kriIds.length) return [];
    const { data, error } = await supabase
      .from('kri_audit_trail')
      .select('*')
      .in('kri_id', kriIds)
      .order('changed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  /**
 * Get pending items summary for a department
 * @param {string} department - Department name
 * @returns {Promise<Object>}
 */
  async getDepartmentPendingItems(department) {
    const { data: kris, error: kriError } = await supabase
      .from('kri_metadata')
      .select('kri_id')
      .eq('owner', department);
    if (kriError) throw kriError;
    const kriIds = (kris || []).map(k => k.kri_id);
    if (!kriIds.length) return { pendingApprovals: 0, pendingInputs: 0, overdueTasks: 0 };
    const { data, error } = await supabase
      .from('kri_item')
      .select('status')
      .in('kri_id', kriIds);
    if (error) throw error;
    let pendingApprovals = 0, pendingInputs = 0, overdueTasks = 0;
    (data || []).forEach(item => {
      if (item.status === 40) pendingInputs++;
      else if (item.status === 50) pendingApprovals++;
      else if (item.status === 60) overdueTasks++;
    });
    return { pendingApprovals, pendingInputs, overdueTasks };
  },


};


