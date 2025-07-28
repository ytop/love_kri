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
 * @param {string} userId - User_ID(s) to fetch
 * @param {string} select - Columns to select (default: '*')
 * @returns {Promise<object>} Query result (may be single or multiple records)
 */
  async fetchUser(userId, select = '*') {
    return this.generalFetch('kri_user', ['User_ID'], [userId], select);
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
  async fetchKRIItems(reportingDate = null) {
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
    
    const { data, error } = await query.order('kri_id', { ascending: true });
    if (error) throw error;
    return data;
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


};


