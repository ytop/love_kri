import { kriService } from '@/services/kriService';
import { mapStatus, getLastDayOfPreviousMonth, getNextStatus, canPerformAction, formatDateFromInt } from '@/utils/helpers';

const state = {
  kriItems: [],
  kriDetail: null,
  atomicData: [],
  evidenceData: [],
  auditTrailData: [],
  historicalData: [],
  loading: false,
  error: null,
  // User role and department management
  currentUser: {
    uuid: null, // uuid
    name: '', // user_id
    department: '', // Ddepartment, for display
    permissions: [] // look up in permission table
  },
  filters: {
    kriOwner: '',
    collectionStatus: '',
    l1RiskType: '',
    reportingDate: getLastDayOfPreviousMonth(),
    kriId: '',
    reportingCycle: '',
    l2RiskType: '',
    kriName: '',
    kriType: '',
    breachType: '',
    dataProvider: '',
    department: ''
  }
};

const mutations = {
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  SET_ERROR(state, error) {
    state.error = error;
  },
  SET_KRI_ITEMS(state, items) {
    state.kriItems = items;
  },
  SET_KRI_DETAIL(state, detail) {
    state.kriDetail = detail;
  },
  SET_ATOMIC_DATA(state, data) {
    state.atomicData = data;
  },
  SET_EVIDENCE_DATA(state, data) {
    state.evidenceData = data;
  },
  SET_AUDIT_TRAIL_DATA(state, data) {
    state.auditTrailData = data;
  },
  SET_HISTORICAL_DATA(state, data) {
    state.historicalData = data;
  },
  SET_FILTERS(state, filters) {
    state.filters = { ...state.filters, ...filters };
  },
  RESET_FILTERS(state) {
    state.filters = {
      kriOwner: '',
      collectionStatus: '',
      l1RiskType: '',
      reportingDate: getLastDayOfPreviousMonth(),
      kriId: '',
      reportingCycle: '',
      l2RiskType: '',
      kriName: '',
      kriType: '',
      breachType: '',
      dataProvider: '',
      department: ''
    };
  },
  // User management mutations
  SET_CURRENT_USER(state, user) {
    state.currentUser = { ...state.currentUser, ...user };
  },
  SET_USER_PERMISSIONS(state, permissions) {
    state.currentUser.permissions = permissions;
  },
  LOGOUT_USER(state) {
    state.currentUser = {
      uuid: null,
      name: '',
      permissions: []
    };
  }
};

const actions = {
  async fetchKRIItems({ commit }, reportingDate) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);
    
    try {
      const data = await kriService.fetchKRIItems(reportingDate);
      
      // Transform data to match Vue component expectations
      const transformedData = data.map(kri => ({
        id: String(kri.kri_id),
        name: kri.kri_name || '',
        owner: kri.kri_owner || '',
        dataProvider: kri.data_provider || '',
        collectionStatus: mapStatus(kri.kri_status),
        kriType: kri.ras_metric || 'N/A',
        l1RiskType: kri.l1_risk_type || '',
        l2RiskType: kri.l2_risk_type || '',
        breachType: kri.breach_type || 'No Breach',
        kriValue: kri.kri_value || 'N/A',
        reportingCycle: kri.reporting_frequency || '',
        reportingDate: String(kri.reporting_date),
        rawData: kri
      }));
      
      commit('SET_KRI_ITEMS', transformedData);
    } catch (error) {
      console.log('Database error, loading mock data:', error.message);
      // Load mock data matching actual database schema
      const reportingDateInt = reportingDate ? parseInt(reportingDate.replace(/-/g, ''), 10) : 20241231;
      
      const mockKRIData = [
        {
          kri_id: 1001,
          reporting_date: reportingDateInt,
          kri_name: 'Operational Risk KRI',
          kri_description: 'Monitors operational risk exposure across business units',
          data_provider: 'Risk Operations Team',
          kri_owner: 'John Smith',
          l1_risk_type: 'Operational Risk',
          l2_risk_type: 'Process Risk',
          ras_metric: 'Operational',
          breach_type: 'No Breach',
          limit_value: 100,
          warning_line_value: 85,
          reporting_frequency: 'Monthly',
          kri_formula: 'SUM(operational_losses) / total_revenue * 100',
          kri_value: '85.5',
          kri_status: 10, // Pending Input
          created_at: new Date().toISOString()
        },
      ];
      
      // Transform to match component expectations
      const mockData = mockKRIData.map(kri => ({
        id: String(kri.kri_id),
        name: kri.kri_name || '',
        owner: kri.kri_owner || '',
        dataProvider: kri.data_provider || '',
        collectionStatus: mapStatus(kri.kri_status),
        kriType: kri.ras_metric || 'N/A',
        l1RiskType: kri.l1_risk_type || '',
        l2RiskType: kri.l2_risk_type || '',
        breachType: kri.breach_type || 'No Breach',
        kriValue: kri.kri_value || 'N/A',
        reportingCycle: kri.reporting_frequency || '',
        reportingDate: String(kri.reporting_date),
        limitValue: kri.limit_value,
        warningLineValue: kri.warning_line_value,
        rawData: kri
      }));
      commit('SET_KRI_ITEMS', mockData);
      commit('SET_ERROR', null);
    } finally {
      commit('SET_LOADING', false);
    }
  },

  async fetchKRIDetail({ commit }, { kriId, reportingDate }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);
    
    try {
      const [kriDetail, atomicData, evidenceData, auditTrailData] = await Promise.all([
        kriService.fetchKRIDetail(kriId, reportingDate),
        kriService.fetchKRIAtomic(kriId, reportingDate),
        kriService.fetchKRIEvidence(kriId, reportingDate),
        kriService.fetchKRIAuditTrail(kriId, reportingDate)
      ]);
      
      commit('SET_KRI_DETAIL', kriDetail);
      commit('SET_ATOMIC_DATA', atomicData);
      commit('SET_EVIDENCE_DATA', evidenceData);
      commit('SET_AUDIT_TRAIL_DATA', auditTrailData);
    } catch (error) {
      console.log('Database error for KRI detail, loading mock data:', error.message);
      
      // Load mock detail data
      const reportingDateInt = parseInt(reportingDate.replace(/-/g, ''), 10);
      const kriIdInt = parseInt(kriId);
      
      const mockKRIDetail = {
        kri_id: kriIdInt,
        reporting_date: reportingDateInt,
        kri_name: `Mock KRI ${kriId}`,
        kri_description: `Detailed description for KRI ${kriId}`,
        data_provider: 'Mock Data Provider',
        kri_owner: 'Mock Owner',
        l1_risk_type: 'Mock L1 Risk',
        l2_risk_type: 'Mock L2 Risk',
        ras_metric: 'Mock Metric',
        breach_type: 'No Breach',
        limit_value: 100,
        warning_line_value: 85,
        reporting_frequency: 'Monthly',
        kri_formula: 'Mock Formula',
        kri_value: '75.5',
        kri_status: 10,
        created_at: new Date().toISOString()
      };
      
      const mockAtomicData = [
        {
          kri_id: kriIdInt,
          atomic_id: 1,
          reporting_date: reportingDateInt,
          atomic_metadata: 'Sample atomic metadata',
          atomic_value: '25.5',
          atomic_status: 1,
          created_at: new Date().toISOString()
        }
      ];
      
      const mockEvidenceData = [
        {
          evidence_id: 1,
          kri_id: kriIdInt,
          reporting_date: reportingDateInt,
          file_name: 'sample_evidence.pdf',
          file_url: '#',
          description: 'Sample evidence file',
          uploaded_by: 'Mock User',
          uploaded_at: new Date().toISOString()
        }
      ];
      
      const mockAuditTrailData = [
        {
          audit_id: 1,
          kri_id: kriIdInt,
          reporting_date: reportingDateInt,
          changed_at: new Date().toISOString(),
          changed_by: 'Mock User',
          action: 'Created',
          field_name: 'kri_value',
          old_value: null,
          new_value: '75.5',
          comment: 'Initial value set'
        }
      ];
      
      commit('SET_KRI_DETAIL', mockKRIDetail);
      commit('SET_ATOMIC_DATA', mockAtomicData);
      commit('SET_EVIDENCE_DATA', mockEvidenceData);
      commit('SET_AUDIT_TRAIL_DATA', mockAuditTrailData);
      commit('SET_ERROR', null);
    } finally {
      commit('SET_LOADING', false);
    }
  },

  updateFilters({ commit }, filters) {
    commit('SET_FILTERS', filters);
  },

  resetFilters({ commit }) {
    commit('RESET_FILTERS');
  },


  async loginUser({ commit }, { username }) {
    try {
      // Authenticate user using the database
      const result = await kriService.authenticateUser(username);
      
      if (result.success) {
        commit('SET_CURRENT_USER', result.user);
        return { success: true, user: result.user };
      } else {
        commit('SET_ERROR', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      commit('SET_ERROR', 'Login failed');
      return { success: false, error: error.message };
    }
  },

  logoutUser({ commit }) {
    commit('LOGOUT_USER');
  },

  updateUserPermissions({ commit }, permissions) {
    commit('SET_USER_PERMISSIONS', permissions);
  },

  // KRI Status Management Actions
  async updateKRIStatus({ commit, state }, { kriId, reportingDate, newStatus, reason = null, changedBy = null }) {
    try {
      const user = changedBy || state.currentUser.name || 'System';
      
      // Use kriService to update KRI status
      // Convert integer date to YYYY-MM-DD format for kriService
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.updateKRIStatus with:', { kriId, formattedDate, newStatus, user, reason });
      
      const updatedKRI = await kriService.updateKRIStatus(
        kriId, 
        formattedDate, 
        newStatus, 
        user, 
        reason
      );
      
      // Update local state
      const kriItems = [...state.kriItems];
      const kriIndex = kriItems.findIndex(item => 
        item.id === String(kriId) && item.reportingDate === String(reportingDate)
      );
      
      if (kriIndex !== -1) {
        kriItems[kriIndex] = {
          ...kriItems[kriIndex],
          collectionStatus: mapStatus(newStatus),
          rawData: {
            ...kriItems[kriIndex].rawData,
            kri_status: newStatus
          }
        };
        
        commit('SET_KRI_ITEMS', kriItems);
        
        // Update kriDetail if it's the same KRI
        if (state.kriDetail && 
            String(state.kriDetail.kri_id) === String(kriId) && 
            String(state.kriDetail.reporting_date) === String(reportingDate)) {
          commit('SET_KRI_DETAIL', {
            ...state.kriDetail,
            kri_status: newStatus
          });
        }
      }
      
      return { success: true, data: updatedKRI };
    } catch (error) {
      console.error('Error updating KRI status:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  async approveKRI({ dispatch, state }, { kriId, reportingDate }) {
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    const currentStatus = currentKRI.rawData.kri_status;
    const nextStatus = getNextStatus(currentStatus, 'approve');
    
    if (!nextStatus) {
      return { success: false, error: 'Invalid status transition' };
    }
    
    // Check permission based on status - review for 40, acknowledge for 50
    const requiredPermission = currentStatus === 40 ? 'review' : 'acknowledge';
    if (!canPerformAction(userPermissions, requiredPermission, currentStatus, currentKRI)) {
      return { success: false, error: 'Insufficient permissions' };
    }
    
    return await dispatch('updateKRIStatus', {
      kriId,
      reportingDate,
      newStatus: nextStatus,
      changedBy: state.currentUser.name
    });
  },

  async rejectKRI({ dispatch, state }, { kriId, reportingDate, reason }) {
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    const currentStatus = currentKRI.rawData.kri_status;
    const nextStatus = getNextStatus(currentStatus, 'reject');
    
    if (!nextStatus) {
      return { success: false, error: 'Invalid status transition' };
    }
    
    // Check permission based on status - review for 40, acknowledge for 50
    const requiredPermission = currentStatus === 40 ? 'review' : 'acknowledge';
    if (!canPerformAction(userPermissions, requiredPermission, currentStatus, currentKRI)) {
      return { success: false, error: 'Insufficient permissions' };
    }
    
    return await dispatch('updateKRIStatus', {
      kriId,
      reportingDate,
      newStatus: nextStatus,
      reason,
      changedBy: state.currentUser.name
    });
  },

  async saveKRIValue({ dispatch, commit, state }, { kriId, reportingDate, value }) {
    console.log('saveKRIValue called with:', { kriId, reportingDate, value });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      console.log('KRI not found in saveKRIValue:', { kriId: String(kriId), reportingDate: String(reportingDate) });
      return { success: false, error: 'KRI not found' };
    }
    
    const currentStatus = currentKRI.rawData.kri_status;
    
    // Check if user can perform save action
    if (!canPerformAction(userPermissions, 'edit', currentStatus, currentKRI)) {
      return { success: false, error: 'Insufficient permissions' };
    }
    
    try {
      // Use kriService to save value and update status to Saved (30)
      // Convert integer date to YYYY-MM-DD format for kriService
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.saveKRIValue with:', { kriId, formattedDate, value });
      
      const updatedKRI = await kriService.saveKRIValue(
        kriId, 
        formattedDate, 
        value, 
        state.currentUser.name
      );
      
      // Update local state
      const kriItems = [...state.kriItems];
      const kriIndex = kriItems.findIndex(item => 
        item.id === String(kriId) && item.reportingDate === String(reportingDate)
      );
      
      if (kriIndex !== -1) {
        kriItems[kriIndex] = {
          ...kriItems[kriIndex],
          kriValue: value,
          collectionStatus: mapStatus(30), // Saved status
          rawData: {
            ...kriItems[kriIndex].rawData,
            kri_value: value,
            kri_status: 30
          }
        };
        
        commit('SET_KRI_ITEMS', kriItems);
        
        // Update kriDetail if it's the same KRI
        if (state.kriDetail && 
            String(state.kriDetail.kri_id) === String(kriId) && 
            String(state.kriDetail.reporting_date) === String(reportingDate)) {
          commit('SET_KRI_DETAIL', {
            ...state.kriDetail,
            kri_value: value,
            kri_status: 30
          });
        }
      }
      
      return { success: true, data: updatedKRI };
    } catch (error) {
      console.error('Error saving KRI value:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  async submitKRI({ commit, state }, { kriId, reportingDate }) {
    console.log('submitKRI called with:', { kriId, reportingDate });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      console.log('KRI not found in submitKRI:', { kriId: String(kriId), reportingDate: String(reportingDate) });
      return { success: false, error: 'KRI not found' };
    }
    
    const currentStatus = currentKRI.rawData.kri_status;
    
    // Check if user can perform submit action (should be from Saved status)
    if (currentStatus !== 30) {
      return { success: false, error: 'KRI must be saved before submission' };
    }
    
    // Check if user can perform submit action
    if (!canPerformAction(userPermissions, 'edit', currentStatus, currentKRI)) {
      return { success: false, error: 'Insufficient permissions' };
    }
    
    try {
      // Use kriService to submit KRI
      // Convert integer date to YYYY-MM-DD format for kriService
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.submitKRIValue with:', { kriId, formattedDate });
      
      const updatedKRI = await kriService.submitKRIValue(
        kriId, 
        formattedDate, 
        state.currentUser.name
      );
      
      // Update local state
      const kriItems = [...state.kriItems];
      const kriIndex = kriItems.findIndex(item => 
        item.id === String(kriId) && item.reportingDate === String(reportingDate)
      );
      
      if (kriIndex !== -1) {
        kriItems[kriIndex] = {
          ...kriItems[kriIndex],
          collectionStatus: mapStatus(updatedKRI.kri_status),
          rawData: {
            ...kriItems[kriIndex].rawData,
            kri_status: updatedKRI.kri_status
          }
        };
        
        commit('SET_KRI_ITEMS', kriItems);
        
        // Update kriDetail if it's the same KRI
        if (state.kriDetail && 
            String(state.kriDetail.kri_id) === String(kriId) && 
            String(state.kriDetail.reporting_date) === String(reportingDate)) {
          commit('SET_KRI_DETAIL', {
            ...state.kriDetail,
            kri_status: updatedKRI.kri_status
          });
        }
      }
      
      return { success: true, data: updatedKRI };
    } catch (error) {
      console.error('Error submitting KRI:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  }
};

const getters = {
  filteredKRIItems: (state) => {
    let filtered = [...state.kriItems];
    
    if (state.filters.kriOwner) {
      filtered = filtered.filter(item => 
        item.owner.toLowerCase().includes(state.filters.kriOwner.toLowerCase())
      );
    }
    
    if (state.filters.dataProvider) {
      filtered = filtered.filter(item => 
        item.dataProvider.toLowerCase().includes(state.filters.dataProvider.toLowerCase())
      );
    }
    
    if (state.filters.department) {
      filtered = filtered.filter(item => 
        // Match either Owner or Data Provider with department
        item.owner.toLowerCase().includes(state.filters.department.toLowerCase()) ||
        item.dataProvider.toLowerCase().includes(state.filters.department.toLowerCase())
      );
    }
    
    if (state.filters.collectionStatus) {
      filtered = filtered.filter(item => 
        item.collectionStatus === state.filters.collectionStatus
      );
    }
    
    if (state.filters.l1RiskType) {
      filtered = filtered.filter(item => 
        item.l1RiskType.toLowerCase().includes(state.filters.l1RiskType.toLowerCase())
      );
    }
    
    if (state.filters.kriName) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(state.filters.kriName.toLowerCase())
      );
    }
    
    return filtered;
  },
  
  krisByStatus: (state) => (status) => {
    // Handle both string and numeric status filtering
    const statusToMatch = typeof status === 'number' ? mapStatus(status) : status;
    return state.kriItems.filter(item => item.collectionStatus === statusToMatch);
  },
  
  // Get available departments from KRI_OWNER and DATA_PROVIDER fields
  availableDepartments: (state) => {
    const departments = new Set();
    
    state.kriItems.forEach(item => {
      // Add KRI Owner as department option
      if (item.owner) {
        departments.add(item.owner);
      }
      // Add Data Provider as department option
      if (item.dataProvider) {
        departments.add(item.dataProvider);
      }
    });
    
    return Array.from(departments).sort();
  },
  
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};