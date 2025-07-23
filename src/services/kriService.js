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

    // Build filters for .match, but skip any key where value is '*'
    const filters = {};
    for (let i = 0; i < primaryKey.length; i++) {
      if (primaryValues[i] !== '*') {
        filters[primaryKey[i]] = primaryValues[i];
      }
    }
    // Only apply .match if there is at least one filter
    if (Object.keys(filters).length > 0) {
      query = query.match(filters);
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
    const reportingDateInts = this.parseReportingDate(reportingDate);
    if (kriIdInts.length !== 1 || reportingDateInts.length !== 1) {
      throw new Error('Only one kriId and reportingDate can be updated at a time');
    }

    // Call the Postgres function via Supabase RPC
    const { data, error } = await supabase.rpc('updateKRI', {
      p_kri_id: kriIdInts[0],
      p_reporting_date: reportingDateInts[0],
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
 * Server-side function: updateAtomicKRI
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
  async updateAtomicKRI(kriId, atomicId, reportingDate, updateData, changedBy, action, comment = '') {
    if (!changedBy) throw new Error('changedBy is required');
    if (!action) throw new Error('action is required');
    if (!comment) throw new Error('comment is required');
    if (!updateData) throw new Error('updateData is required');
    if (!kriId || !atomicId || !reportingDate) throw new Error('kriId, atomicId, and reportingDate are required');

    // Call the Postgres function via Supabase RPC
    const { data, error } = await supabase.rpc('updateAtomicKRI', {
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
    const { data, error } = await supabase.rpc('updateEvidence', {
      p_kri_id: kriId,
      p_reporting_date: reportingDate,
      p_update_data: updateData,
      p_changed_by: changedBy,
      p_action: action,
      p_comment: comment
    });

    if (error) throw error;
    return data;
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
    return this.generalFetch('kri_audit_trail', ['kri_id', 'reporting_date'], [kriId, reportingDate], select);
  }

  /**
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
    const auditData = {
      kri_id: this.parseKRIId(kriId),
      reporting_date: this.parseReportingDate(reportingDate),
      changed_at: new Date().toISOString(),
      changed_by: changedBy,
      action,
      field_name: Object.keys(updateData)[0],
      old_value: oldValue ? String(oldValue) : null,
      new_value: newValue ? String(newValue) : null,
      comment
    };

    const operation = () => supabase
      .from('kri_audit_trail')
      .insert(auditData)
      .select()
      .single();

    return this.executeWithErrorHandling(
      operation,
      'Failed to add audit trail entry'
    );
  }
}

const baseKRIService = new BaseKRIService();

export const kriService = {

  // A place to store all the functions that are used to fetch data from the database
  // Just passing same parameters to the baseKRIService
  // ---------------------------------- fetch ---------------------------
  async fetchKRIItems(reportingDate = null) {
    const { data } = await baseKRIService.fetchKRI('*', reportingDate);
    return data;
  },

  async fetchKRIDetail(kriId, reportingDate) {
    const { data } = await baseKRIService.fetchKRI(kriId, reportingDate);
    return data;
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

  async updateAtomicKRI(kriId, atomicId, reportingDate, updateData, changedBy, action, comment = '') {
    const { data } = await baseKRIService.updateAtomicKRI(kriId, atomicId, reportingDate, updateData, changedBy, action, comment);
    return data;
  },

  async updateEvidence(kriId, reportingDate, updateData, changedBy, action, comment = '') {
    const { data } = await baseKRIService.updateEvidence(kriId, reportingDate, updateData, changedBy, action, comment);
    return data;
  },

  async updateAuditTrail(kriId, reportingDate, updateData, changedBy, action, comment = '') {
    const { data } = await baseKRIService.addAuditTrailEntry(kriId, reportingDate, updateData, changedBy, action, comment);
    return data;
  },

};


