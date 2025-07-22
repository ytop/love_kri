import { supabase } from './supabase';

/**
 * Base service class providing common patterns for KRI database operations
 * Eliminates duplicate code across KRI service methods
 */
export class BaseKRIService {
  /**
   * Parse reporting date from YYYY-MM-DD format to YYYYMMDD integer
   * @param {string} reportingDate - Date in YYYY-MM-DD format
   * @returns {number} Date as integer in YYYYMMDD format
   */
  parseReportingDate(reportingDate) {
    if (!reportingDate) return null;
    if (typeof reportingDate === 'number') return reportingDate;
    return parseInt(reportingDate.replace(/-/g, ''), 10);
  }

  /**
   * Create base query parameters for KRI operations
   * @param {string|number} kriId - KRI ID
   * @param {string} reportingDate - Reporting date in YYYY-MM-DD format
   * @returns {object} Object with parsed kri_id and reporting_date
   */
  createBaseQuery(kriId, reportingDate) {
    return {
      kri_id: parseInt(kriId),
      reporting_date: this.parseReportingDate(reportingDate)
    };
  }

  /**
   * Execute database operation with consistent error handling
   * @param {Function} operation - Async database operation to execute
   * @param {string} errorMessage - Error message to use if operation fails
   * @returns {Promise<*>} Result of the operation
   * @throws {Error} Standardized error with provided message
   */
  async executeWithErrorHandling(operation, errorMessage) {
    try {
      const result = await operation();
      if (result.error) {
        console.error(errorMessage, result.error);
        throw new Error(errorMessage);
      }
      return result;
    } catch (error) {
      console.error(errorMessage, error);
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  /**
   * Fetch single KRI record with base query parameters
   * @param {string} table - Table name
   * @param {string|number} kriId - KRI ID
   * @param {string} reportingDate - Reporting date
   * @param {string} select - Columns to select (default: '*')
   * @returns {Promise<object>} Single record
   */
  async fetchSingleKRI(table, kriId, reportingDate, select = '*') {
    const baseQuery = this.createBaseQuery(kriId, reportingDate);
    const operation = () => supabase
      .from(table)
      .select(select)
      .eq('kri_id', baseQuery.kri_id)
      .eq('reporting_date', baseQuery.reporting_date)
      .single();

    return this.executeWithErrorHandling(
      operation,
      `Failed to fetch ${table} data`
    );
  }

  /**
   * Fetch multiple KRI records with base query parameters
   * @param {string} table - Table name
   * @param {string|number} kriId - KRI ID
   * @param {string} reportingDate - Reporting date
   * @param {string} select - Columns to select (default: '*')
   * @param {object} orderBy - Order by configuration {column, ascending}
   * @returns {Promise<Array>} Array of records
   */
  async fetchMultipleKRI(table, kriId, reportingDate, select = '*', orderBy = null) {
    const baseQuery = this.createBaseQuery(kriId, reportingDate);
    const operation = () => {
      let query = supabase
        .from(table)
        .select(select)
        .eq('kri_id', baseQuery.kri_id)
        .eq('reporting_date', baseQuery.reporting_date);

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending });
      }

      return query;
    };

    return this.executeWithErrorHandling(
      operation,
      `Failed to fetch ${table} data`
    );
  }

  /**
   * Update KRI record with base query parameters and audit trail
   * @param {string} table - Table name
   * @param {string|number} kriId - KRI ID
   * @param {string} reportingDate - Reporting date
   * @param {object} updateData - Data to update
   * @param {string} changedBy - User making the change
   * @param {string} action - Action description for audit
   * @param {string} comment - Comment for audit trail
   * @returns {Promise<object>} Updated record
   */
  async updateKRIWithAudit(table, kriId, reportingDate, updateData, changedBy, action, comment = '') {
    const baseQuery = this.createBaseQuery(kriId, reportingDate);
    
    const operation = async () => {
      const result = await supabase
        .from(table)
        .update(updateData)
        .eq('kri_id', baseQuery.kri_id)
        .eq('reporting_date', baseQuery.reporting_date)
        .select()
        .single();

      // Add audit trail entries for each updated field
      if (result.data && changedBy) {
        const auditPromises = Object.entries(updateData).map(([fieldName, newValue]) =>
          this.addAuditTrailEntry(kriId, reportingDate, action, fieldName, null, newValue, changedBy, comment)
        );
        await Promise.all(auditPromises);
      }

      return result;
    };

    return this.executeWithErrorHandling(
      operation,
      `Failed to update ${table} data`
    );
  }

  /**
   * Add audit trail entry with consistent pattern
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
  async addAuditTrailEntry(kriId, reportingDate, action, fieldName, oldValue, newValue, changedBy, comment = '') {
    const baseQuery = this.createBaseQuery(kriId, reportingDate);
    
    const auditData = {
      kri_id: baseQuery.kri_id,
      reporting_date: baseQuery.reporting_date,
      changed_at: new Date().toISOString(),
      changed_by: changedBy,
      action,
      field_name: fieldName,
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

  /**
   * Fetch KRI items with optional date filter using consistent pattern
   * @param {string} reportingDate - Optional reporting date filter
   * @param {string} select - Columns to select
   * @returns {Promise<Array>} Array of KRI items
   */
  async fetchKRIItems(reportingDate = null, select = '*') {
    const operation = () => {
      let query = supabase.from('kri_item').select(select);
      
      if (reportingDate) {
        const reportingDateAsInt = this.parseReportingDate(reportingDate);
        query = query.eq('reporting_date', reportingDateAsInt);
      }
      
      return query;
    };

    return this.executeWithErrorHandling(
      operation,
      'Failed to fetch KRI data'
    );
  }
}

// Create singleton instance for reuse
export const baseKRIService = new BaseKRIService();