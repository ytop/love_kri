import { kriService } from '@/services/kriService';
import { mapStatus, getLastDayOfPreviousMonth } from '@/utils/helpers';

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
    id: null,
    name: '',
    role: '',
    department: '',
    permissions: []
  },
  departments: [],
  roles: [
    { name: 'Admin', permissions: ['read', 'write', 'approve', 'delete'] },
    { name: 'KRI Owner', permissions: ['read', 'write', 'approve', 'reject'] },
    { name: 'KRI Reviewer', permissions: ['read', 'approve', 'reject'] },
    { name: 'Data Provider', permissions: ['read', 'write'] },
    { name: 'Data Reviewer', permissions: ['read', 'approve', 'reject'] },
    { name: 'Viewer', permissions: ['read'] }
  ],
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
        {
          kri_id: 1002,
          reporting_date: reportingDateInt,
          kri_name: 'Credit Risk Indicator',
          kri_description: 'Tracks credit default probability and exposure',
          data_provider: 'Credit Risk Team',
          kri_owner: 'Jane Doe',
          l1_risk_type: 'Credit Risk',
          l2_risk_type: 'Default Risk',
          ras_metric: 'Credit',
          breach_type: 'Warning',
          limit_value: 95,
          warning_line_value: 90,
          reporting_frequency: 'Monthly',
          kri_formula: 'PD * EAD * LGD',
          kri_value: '92.3',
          kri_status: 40, // Submitted to Data Provider Approver
          created_at: new Date().toISOString()
        },
        {
          kri_id: 1003,
          reporting_date: reportingDateInt,
          kri_name: 'Market Risk KRI',
          kri_description: 'Measures market volatility and VaR exposure',
          data_provider: 'Market Risk Team',
          kri_owner: 'Bob Johnson',
          l1_risk_type: 'Market Risk',
          l2_risk_type: 'Volatility Risk',
          ras_metric: 'Market',
          breach_type: 'No Breach',
          limit_value: 80,
          warning_line_value: 75,
          reporting_frequency: 'Daily',
          kri_formula: 'VaR_95% / Portfolio_Value * 100',
          kri_value: '78.1',
          kri_status: 60, // Finalized
          created_at: new Date().toISOString()
        },
        {
          kri_id: 1004,
          reporting_date: reportingDateInt,
          kri_name: 'Liquidity Risk KRI',
          kri_description: 'Monitors liquidity coverage ratio',
          data_provider: 'Treasury Team',
          kri_owner: 'Alice Brown',
          l1_risk_type: 'Liquidity Risk',
          l2_risk_type: 'Coverage Risk',
          ras_metric: 'Liquidity',
          breach_type: 'No Breach',
          limit_value: 120,
          warning_line_value: 110,
          reporting_frequency: 'Monthly',
          kri_formula: 'LCR = HQLA / Net Cash Outflows * 100',
          kri_value: '115.2',
          kri_status: 30, // Saved
          created_at: new Date().toISOString()
        },
        {
          kri_id: 1005,
          reporting_date: reportingDateInt,
          kri_name: 'Compliance Risk KRI',
          kri_description: 'Tracks regulatory compliance violations',
          data_provider: 'Compliance Team',
          kri_owner: 'Charlie Wilson',
          l1_risk_type: 'Compliance Risk',
          l2_risk_type: 'Regulatory Risk',
          ras_metric: 'Compliance',
          breach_type: 'Warning',
          limit_value: 5,
          warning_line_value: 3,
          reporting_frequency: 'Quarterly',
          kri_formula: 'Number of violations / Total controls * 100',
          kri_value: '4.2',
          kri_status: 50, // Submitted to KRI Owner Approver
          created_at: new Date().toISOString()
        }
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
  }
};

const getters = {
  filteredKRIItems: (state) => {
    let filtered = [...state.kriItems];
    
    // Apply filters
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
  pendingKRIsCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Pending Input').length;
  },
  submittedKRIsCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Submitted to KRI Owner Approver').length;
  },
  underReworkKRIsCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Under Rework').length;
  },
  savedKRIsCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Saved').length;
  },
  submittedToDataProviderApproverCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Submitted to Data Provider Approver').length;
  },
  finalizedKRIsCount: (state) => {
    return state.kriItems.filter(item => item.collectionStatus === 'Finalized').length;
  },
  // New getters for workflow-based counts
  inputWorkflowKRIsCount: (state) => {
    // Sum of Pending Input + Under Rework (matches KRIPendingInput logic)
    const pendingInput = state.kriItems.filter(item => item.collectionStatus === 'Pending Input').length;
    const underRework = state.kriItems.filter(item => item.collectionStatus === 'Under Rework').length;
    return pendingInput + underRework;
  },
  approvalWorkflowKRIsCount: (state) => {
    // Sum of Saved + Submitted to Data Provider Approver + Submitted to KRI Owner Approver (matches KRIPendingApproval logic)
    const saved = state.kriItems.filter(item => item.collectionStatus === 'Saved').length;
    const submittedToDP = state.kriItems.filter(item => item.collectionStatus === 'Submitted to Data Provider Approver').length;
    const submittedToKRI = state.kriItems.filter(item => item.collectionStatus === 'Submitted to KRI Owner Approver').length;
    return saved + submittedToDP + submittedToKRI;
  },
  krisByStatus: (state) => (status) => {
    // Handle both string and numeric status filtering
    const statusToMatch = typeof status === 'number' ? mapStatus(status) : status;
    return state.kriItems.filter(item => item.collectionStatus === statusToMatch);
  },
  
  // Role and Department getters
  currentUser: (state) => state.currentUser,
  userRole: (state) => state.currentUser.role,
  userDepartment: (state) => state.currentUser.department,
  userPermissions: (state) => state.currentUser.permissions,
  isAuthenticated: (state) => !!state.currentUser.id,
  
  availableRoles: (state) => state.roles,
  availableDepartments: (state) => state.departments,
  
  hasPermission: (state) => (permission) => {
    return state.currentUser.permissions.includes(permission);
  },
  
  krisByDepartment: (state) => (department) => {
    return state.kriItems.filter(item => item.department === department);
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