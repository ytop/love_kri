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
      console.error("Error fetching KRI data:", error);
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
      console.error("Error fetching KRI detail:", error);
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
      console.error("Error fetching atomic data:", error);
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
      console.error("Error fetching evidence data:", error);
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
      console.error("Error fetching audit trail:", error);
      throw new Error('Failed to fetch audit trail');
    }
    return data;
  },

  // Convert text status to numerical status for DB
  _getNumericalStatus(statusText) {
    switch (statusText) {
      case 'Pending': return 0;
      case 'Submitted': return 1;
      case 'Finalized': return 2;
      default:
        console.warn(`Unknown status text: ${statusText}`);
        return -1; // Or throw error
    }
  },

  // Update KRI status
  async updateKRIStatus(kriId, reportingDate, newStatusText, comment = '') {
    // TODO: Store comment for future enhancement
    if (comment) {
      console.log(`TODO: Store rework comment for KRI ${kriId} (${reportingDate}): ${comment}`);
    }

    const numericalStatus = this._getNumericalStatus(newStatusText);
    if (numericalStatus === -1) {
      throw new Error(`Invalid status provided: ${newStatusText}`);
    }

    const reportingDateAsInt = parseInt(reportingDate.replace(/-/g, ''), 10);

    const { data, error } = await supabase
      .from('kri_item')
      .update({ kri_status: numericalStatus })
      .eq('kri_id', parseInt(kriId))
      .eq('reporting_date', reportingDateAsInt);

    if (error) {
      console.error(`Error updating KRI status for ${kriId}, ${reportingDate}:`, error);
      throw new Error('Failed to update KRI status');
    }
    return data;
  },

  // Batch update KRI status
  async batchUpdateKRIStatus(krisToUpdate, newStatusText) {
    const numericalStatus = this._getNumericalStatus(newStatusText);
    if (numericalStatus === -1) {
      throw new Error(`Invalid status provided for batch update: ${newStatusText}`);
    }

    const results = [];
    const errors = [];

    for (const kri of krisToUpdate) {
      try {
        const reportingDateAsInt = parseInt(kri.reportingDate.replace(/-/g, ''), 10);
        const { data, error } = await supabase
          .from('kri_item')
          .update({ kri_status: numericalStatus })
          .eq('kri_id', parseInt(kri.id || kri.kri_id)) // Accommodate both id and kri_id property names
          .eq('reporting_date', reportingDateAsInt);

        if (error) {
          errors.push({ kri, error });
        } else {
          results.push(data);
        }
      } catch (error) {
        errors.push({ kri, error });
      }
    }

    if (errors.length > 0) {
      console.error('Errors during batch KRI status update:', errors);
      // Decide on error handling: throw a summary, or return partial success
      throw new Error(`Failed to update status for ${errors.length} KRIs during batch operation.`);
    }
    return results;
  }
};