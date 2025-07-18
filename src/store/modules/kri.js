import { kriService } from '@/services/kriService';
import { mapStatus, getLastDayOfPreviousMonth, getNextStatus, canPerformAction, getInputStatus } from '@/utils/helpers';

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
  // Role and Department mutations
  SET_CURRENT_USER(state, user) {
    state.currentUser = { ...state.currentUser, ...user };
  },
  SET_USER_ROLE(state, role) {
    state.currentUser.role = role;
    // Set permissions based on role
    const roleConfig = state.roles.find(r => r.name === role);
    state.currentUser.permissions = roleConfig ? roleConfig.permissions : [];
  },
  SET_USER_DEPARTMENT(state, department) {
    state.currentUser.department = department;
  },
  SET_DEPARTMENTS(state, departments) {
    state.departments = departments;
  },
  LOGOUT_USER(state) {
    state.currentUser = {
      id: null,
      name: '',
      role: '',
      department: '',
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
        kri_status: 1,
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

  // Role and Department actions
  async fetchDepartments({ commit }) {
    try {
      const departments = await kriService.fetchUniqueDepartments();
      commit('SET_DEPARTMENTS', departments);
      return departments;
    } catch (error) {
      console.error('Error fetching departments:', error);
      commit('SET_ERROR', 'Failed to fetch departments');
      // Return fallback departments if service fails
      const fallbackDepartments = [
        'Enterprise Risk Management(Virtual)'
      ];
      commit('SET_DEPARTMENTS', fallbackDepartments);
      return fallbackDepartments;
    }
  },

  async loginUser({ commit }, { username, department, role }) {
    try {
      // In a real app, this would make an API call to authenticate
      const user = {
        id: Date.now(),
        name: username,
        role: role,
        department: department,
        permissions: []
      };
      
      commit('SET_CURRENT_USER', user);
      commit('SET_USER_ROLE', role);
      commit('SET_USER_DEPARTMENT', department);
      
      // Set department filter to user's department on login
      commit('SET_FILTERS', { department: department });
      
      return { success: true, user };
    } catch (error) {
      commit('SET_ERROR', 'Login failed');
      return { success: false, error: error.message };
    }
  },

  logoutUser({ commit }) {
    commit('LOGOUT_USER');
  },

  updateUserRole({ commit }, role) {
    commit('SET_USER_ROLE', role);
  },

  updateUserDepartment({ commit }, department) {
    commit('SET_USER_DEPARTMENT', department);
  },

  // KRI Status Management Actions
  async updateKRIStatus({ commit, state }, { kriId, reportingDate, newStatus, reason = null, changedBy = null }) {
    try {
      // [MOCK] Replace with API call to update KRI status
      const user = changedBy || state.currentUser.name || 'System';
      
      // Find and update the KRI item
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
        
        // Add to audit trail (mock implementation)
        console.log(`KRI ${kriId} status updated to ${newStatus} by ${user}${reason ? ` with reason: ${reason}` : ''}`);
        
        return { success: true };
      } else {
        throw new Error('KRI not found');
      }
    } catch (error) {
      console.error('Error updating KRI status:', error);
      commit('SET_ERROR', 'Failed to update KRI status');
      return { success: false, error: error.message };
    }
  },

  async approveKRI({ dispatch, state }, { kriId, reportingDate }) {
    const userRole = state.currentUser.role;
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
    
    if (!canPerformAction(userRole, 'approve', currentStatus, currentKRI)) {
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
    const userRole = state.currentUser.role;
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
    
    if (!canPerformAction(userRole, 'reject', currentStatus, currentKRI)) {
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
    const userRole = state.currentUser.role;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    const currentStatus = currentKRI.rawData.kri_status;
    
    // Check if user can perform save action
    if (!canPerformAction(userRole, 'save', currentStatus, currentKRI)) {
      return { success: false, error: 'Insufficient permissions' };
    }
    
    // Update to Saved (30) status
    const savedStatus = getNextStatus(currentStatus, 'save');
    if (!savedStatus) {
      return { success: false, error: 'Invalid status transition' };
    }
    
    // Update to Saved status
    const savedResult = await dispatch('updateKRIStatus', {
      kriId,
      reportingDate,
      newStatus: savedStatus,
      changedBy: state.currentUser.name
    });
    
    if (!savedResult.success) {
      return savedResult;
    }
    
    // Update the KRI value (mock implementation)
    const kriItems = [...state.kriItems];
    const kriIndex = kriItems.findIndex(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (kriIndex !== -1) {
      kriItems[kriIndex] = {
        ...kriItems[kriIndex],
        kriValue: value,
        rawData: {
          ...kriItems[kriIndex].rawData,
          kri_value: value
        }
      };
      
      commit('SET_KRI_ITEMS', kriItems);
    }
    
    return { success: true };
  },

  async submitKRI({ dispatch, state }, { kriId, reportingDate }) {
    const userRole = state.currentUser.role;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    const currentStatus = currentKRI.rawData.kri_status;
    
    // Check if user can perform submit action
    if (!canPerformAction(userRole, 'submit', currentStatus, currentKRI)) {
      return { success: false, error: 'Insufficient permissions' };
    }
    
    // Determine final status based on role and ownership
    const finalStatus = getInputStatus(userRole, currentKRI);
    
    // Update to final status
    return await dispatch('updateKRIStatus', {
      kriId,
      reportingDate,
      newStatus: finalStatus,
      changedBy: state.currentUser.name
    });
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
  
  // 10
  pendingKRIsCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Pending Input').length;
  },
  // 50
  submittedKRIsCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Submitted to KRI Owner Approver').length;
  },
  // 20
  underReworkKRIsCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Under Rework').length;
  },
  // 30
  savedKRIsCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Saved').length;
  },
  // 40
  submittedToDataProviderApproverCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Submitted to Data Provider Approver').length;
  },
  // 60
  finalizedKRIsCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Finalized').length;
  },
  // New getters for workflow-based counts
  inputWorkflowKRIsCount: (state) => {
    // Sum of Pending Input + Under Rework (matches KRIPendingInput logic)
    const saved = state.kriItems.filter(item => item.collectionStatus === 'Saved').length;
    const pendingInput = state.kriItems.filter(item => item.collectionStatus === 'Pending Input').length;
    const underRework = state.kriItems.filter(item => item.collectionStatus === 'Under Rework').length;
    return pendingInput + underRework + saved;
  },
  approvalWorkflowKRIsCount: (state) => {
    // Sum of Saved + Submitted to Data Provider Approver + Submitted to KRI Owner Approver (matches KRIPendingApproval logic)
    const submittedToDP = state.kriItems.filter(item => item.collectionStatus === 'Submitted to Data Provider Approver').length;
    const submittedToKRI = state.kriItems.filter(item => item.collectionStatus === 'Submitted to KRI Owner Approver').length;
    return submittedToDP + submittedToKRI;
  },
  krisByStatus: (state) => (status) => {
    // Handle both string and numeric status filtering
    const statusToMatch = typeof status === 'number' ? mapStatus(status) : status;
    return state.kriItems.filter(item => item.collectionStatus === statusToMatch);
  },
  
  departmentCounts: (state) => {
    const counts = {};
    state.departments.forEach(dept => {
      counts[dept] = state.kriItems.filter(item => item.department === dept).length;
    });
    return counts;
  }
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};