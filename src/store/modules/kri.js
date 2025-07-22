import { kriService } from '@/services/kriService';
import { mapStatus, getLastDayOfPreviousMonth, getNextStatus, canPerformAction, formatDateFromInt, canViewKRI } from '@/utils/helpers';

// Session storage keys
const AUTH_STORAGE_KEY = 'kri_auth_user';
const AUTH_PERMISSIONS_KEY = 'kri_auth_permissions';

// Session storage utilities
const sessionStorageUtil = {
  setUser(user) {
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to store user data in sessionStorage:', error);
    }
  },
  
  getUser() {
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to retrieve user data from sessionStorage:', error);
      return null;
    }
  },
  
  setPermissions(permissions) {
    try {
      sessionStorage.setItem(AUTH_PERMISSIONS_KEY, JSON.stringify(permissions));
    } catch (error) {
      console.warn('Failed to store permissions in sessionStorage:', error);
    }
  },
  
  getPermissions() {
    try {
      const stored = sessionStorage.getItem(AUTH_PERMISSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to retrieve permissions from sessionStorage:', error);
      return [];
    }
  },
  
  clear() {
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_PERMISSIONS_KEY);
    } catch (error) {
      console.warn('Failed to clear auth data from sessionStorage:', error);
    }
  }
};

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
    // Store in sessionStorage
    sessionStorageUtil.setUser(state.currentUser);
  },
  SET_USER_PERMISSIONS(state, permissions) {
    state.currentUser.permissions = permissions;
    // Store permissions separately for easier access
    sessionStorageUtil.setPermissions(permissions);
  },
  LOGOUT_USER(state) {
    state.currentUser = {
      uuid: null,
      name: '',
      department: '',
      permissions: []
    };
    // Clear sessionStorage
    sessionStorageUtil.clear();
  },
  // New mutation to restore user from sessionStorage
  RESTORE_USER_FROM_STORAGE(state) {
    const storedUser = sessionStorageUtil.getUser();
    const storedPermissions = sessionStorageUtil.getPermissions();
    
    if (storedUser && storedUser.uuid) {
      state.currentUser = { ...storedUser, permissions: storedPermissions };
    }
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
      let reportingDateInt = 20241231;
      if (reportingDate) {
        if (typeof reportingDate === 'number') {
          reportingDateInt = reportingDate;
        } else if (typeof reportingDate === 'string') {
          reportingDateInt = parseInt(reportingDate.replace(/-/g, ''), 10);
        } else {
          reportingDateInt = parseInt(String(reportingDate).replace(/-/g, ''), 10);
        }
      }
      
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
      let reportingDateInt;
      if (typeof reportingDate === 'number') {
        reportingDateInt = reportingDate;
      } else if (typeof reportingDate === 'string') {
        reportingDateInt = parseInt(reportingDate.replace(/-/g, ''), 10);
      } else {
        reportingDateInt = parseInt(String(reportingDate).replace(/-/g, ''), 10);
      }
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

  async refetchUserPermissions({ commit, state }) {
    if (!state.currentUser.uuid) {
      console.warn('No user logged in, cannot refetch permissions');
      return { success: false, error: 'No user logged in' };
    }

    try {
      const result = await kriService.authenticateUser(state.currentUser.userId || state.currentUser.name);
      
      if (result.success && result.user.permissions) {
        commit('SET_USER_PERMISSIONS', result.user.permissions);
        return { success: true, permissions: result.user.permissions };
      } else {
        console.error('Failed to refetch permissions:', result.error);
        return { success: false, error: result.error || 'Failed to refetch permissions' };
      }
    } catch (error) {
      console.error('Error refetching permissions:', error);
      return { success: false, error: error.message };
    }
  },

  // New action to restore user from sessionStorage
  restoreUserFromStorage({ commit }) {
    commit('RESTORE_USER_FROM_STORAGE');
  },

  updateUserPermissions({ commit }, permissions) {
    commit('SET_USER_PERMISSIONS', permissions);
  },

  // KRI Status Management Actions
  async updateKRIStatus({ commit, state }, { kriId, reportingDate, newStatus, reason = null, changedBy = null, forceRefresh = false }) {
    try {
      const user = changedBy || state.currentUser.name || 'System';
      
      // Use kriService to update KRI status
      // Convert integer date to YYYY-MM-DD format for kriService
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.updateKRIStatus with:', { kriId, formattedDate, newStatus, user, reason, forceRefresh });
      
      const updatedKRI = await kriService.updateKRIStatus(
        kriId, 
        formattedDate, 
        newStatus, 
        user, 
        reason
      );
      
      // Validate that the database operation succeeded
      if (!updatedKRI || !updatedKRI.kri_id) {
        throw new Error('Database operation failed - no valid response from server');
      }
      
      // Update local state only after successful database operation
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
      
      // If forceRefresh is requested, reload data from database to ensure sync
      if (forceRefresh) {
        console.log('Force refreshing data from database after status update');
        const currentReportingDate = formatDateFromInt(reportingDate);
        await this.dispatch('kri/fetchKRIItems', currentReportingDate);
      }
      
      return { success: true, data: updatedKRI, requiresRefresh: true };
    } catch (error) {
      console.error('Error updating KRI status:', error);
      commit('SET_ERROR', error.message);
      
      // Force refresh on error to sync with actual database state
      const currentReportingDate = formatDateFromInt(reportingDate);
      try {
        await this.dispatch('kri/fetchKRIItems', currentReportingDate);
      } catch (refreshError) {
        console.error('Failed to refresh data after status update error:', refreshError);
      }
      
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

  async saveKRIValue({ commit, state }, { kriId, reportingDate, value, forceRefresh = false }) {
    console.log('saveKRIValue called with:', { kriId, reportingDate, value, forceRefresh });
    
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
      
      // Validate that the database operation succeeded by checking returned data
      if (!updatedKRI || !updatedKRI.kri_id) {
        throw new Error('Database operation failed - no valid response from server');
      }
      
      // Update local state only after successful database operation
      const kriItems = [...state.kriItems];
      const kriIndex = kriItems.findIndex(item => 
        item.id === String(kriId) && item.reportingDate === String(reportingDate)
      );
      
      if (kriIndex !== -1) {
        kriItems[kriIndex] = {
          ...kriItems[kriIndex],
          kriValue: value,
          collectionStatus: mapStatus(30), // Saved status
          breachType: updatedKRI.breach_type, // Update breach type from server response
          rawData: {
            ...kriItems[kriIndex].rawData,
            kri_value: value,
            kri_status: 30,
            breach_type: updatedKRI.breach_type
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
            kri_status: 30,
            breach_type: updatedKRI.breach_type
          });
        }
      }
      
      // If forceRefresh is requested, reload data from database to ensure sync
      if (forceRefresh) {
        console.log('Force refreshing data from database after save operation');
        const currentReportingDate = formatDateFromInt(reportingDate);
        await this.dispatch('kri/fetchKRIItems', currentReportingDate);
      }
      
      return { success: true, data: updatedKRI, requiresRefresh: true };
    } catch (error) {
      console.error('Error saving KRI value:', error);
      commit('SET_ERROR', error.message);
      
      // Force refresh on error to sync with actual database state
      const currentReportingDate = formatDateFromInt(reportingDate);
      try {
        await this.dispatch('kri/fetchKRIItems', currentReportingDate);
      } catch (refreshError) {
        console.error('Failed to refresh data after save error:', refreshError);
      }
      
      return { success: false, error: error.message };
    }
  },

  async submitKRI({ commit, state }, { kriId, reportingDate, forceRefresh = false }) {
    console.log('submitKRI called with:', { kriId, reportingDate, forceRefresh });
    
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
      
      // Validate that the database operation succeeded
      if (!updatedKRI || !updatedKRI.kri_id) {
        throw new Error('Database operation failed - no valid response from server');
      }
      
      // Update local state only after successful database operation
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
      
      // If forceRefresh is requested, reload data from database to ensure sync
      if (forceRefresh) {
        console.log('Force refreshing data from database after submit operation');
        const currentReportingDate = formatDateFromInt(reportingDate);
        await this.dispatch('kri/fetchKRIItems', currentReportingDate);
      }
      
      return { success: true, data: updatedKRI, requiresRefresh: true };
    } catch (error) {
      console.error('Error submitting KRI:', error);
      commit('SET_ERROR', error.message);
      
      // Force refresh on error to sync with actual database state
      const currentReportingDate = formatDateFromInt(reportingDate);
      try {
        await this.dispatch('kri/fetchKRIItems', currentReportingDate);
      } catch (refreshError) {
        console.error('Failed to refresh data after submit error:', refreshError);
      }
      
      return { success: false, error: error.message };
    }
  },

  // Atomic-Level Actions
  
  async saveAtomicValue({ commit, state }, { kriId, reportingDate, atomicId, value }) {
    console.log('saveAtomicValue called with:', { kriId, reportingDate, atomicId, value });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      console.log('KRI not found in saveAtomicValue:', { kriId: String(kriId), reportingDate: String(reportingDate) });
      return { success: false, error: 'KRI not found' };
    }
    
    // Check if user can perform save action for atomic element
    if (!canPerformAction(userPermissions, 'edit', currentKRI.rawData.kri_status, currentKRI, atomicId)) {
      return { success: false, error: 'Insufficient permissions for atomic element' };
    }
    
    try {
      // Use kriService to save atomic value
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.saveAtomicValue with:', { kriId, formattedDate, atomicId, value });
      
      const updatedAtomic = await kriService.saveAtomicValue(
        kriId, 
        formattedDate, 
        atomicId,
        value, 
        state.currentUser.name
      );
      
      // Update local atomic data state
      const atomicData = [...state.atomicData];
      const atomicIndex = atomicData.findIndex(item => 
        item.atomic_id === parseInt(atomicId) && 
        item.kri_id === parseInt(kriId) && 
        item.reporting_date === parseInt(reportingDate)
      );
      
      if (atomicIndex !== -1) {
        atomicData[atomicIndex] = {
          ...atomicData[atomicIndex],
          atomic_value: value,
          atomic_status: 30
        };
        commit('SET_ATOMIC_DATA', atomicData);
      }
      
      return { success: true, data: updatedAtomic };
    } catch (error) {
      console.error('Error saving atomic value:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  async approveAtomicElements({ commit, state }, { kriId, reportingDate, atomicIds }) {
    console.log('approveAtomicElements called with:', { kriId, reportingDate, atomicIds });
    console.log('Looking for KRI with:', { id: String(kriId), reportingDate: String(reportingDate) });
    console.log('Available KRIs:', state.kriItems.map(item => ({ id: item.id, reportingDate: item.reportingDate })));
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      console.log('KRI not found in state');
      return { success: false, error: 'KRI not found' };
    }
    
    // Check if user has permission to approve atomic elements
    const key = `${kriId}_${reportingDate}`;
    const hasPermission = atomicIds.every(atomicId => {
      const atomicPermission = `atomic${atomicId}_review`;
      const hasAtomicPermission = userPermissions[key]?.includes(atomicPermission) || false;
      const hasGeneralReview = userPermissions[key]?.includes('review') || false;
      return hasAtomicPermission || hasGeneralReview;
    });
    
    if (!hasPermission) {
      return { success: false, error: 'Insufficient permissions to approve atomic elements' };
    }
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.approveAtomicElements with:', { kriId, formattedDate, atomicIds });
      
      const updatedAtomics = await kriService.approveAtomicElements(
        kriId, 
        formattedDate, 
        atomicIds,
        state.currentUser.name
      );
      
      // Update local atomic data state
      const atomicData = [...state.atomicData];
      atomicIds.forEach(atomicId => {
        const atomicIndex = atomicData.findIndex(item => 
          item.atomic_id === parseInt(atomicId) && 
          item.kri_id === parseInt(kriId) && 
          item.reporting_date === parseInt(reportingDate)
        );
        
        if (atomicIndex !== -1) {
          atomicData[atomicIndex] = {
            ...atomicData[atomicIndex],
            atomic_status: 50 // Submitted to KRI Owner Approver
          };
        }
      });
      
      commit('SET_ATOMIC_DATA', atomicData);
      return { success: true, data: updatedAtomics };
    } catch (error) {
      console.error('Error approving atomic elements:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  async rejectAtomicElements({ commit, state }, { kriId, reportingDate, atomicIds, reason }) {
    console.log('rejectAtomicElements called with:', { kriId, reportingDate, atomicIds, reason });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    // Check if user has permission to reject atomic elements
    const key = `${kriId}_${reportingDate}`;
    const hasPermission = atomicIds.every(atomicId => {
      const atomicPermission = `atomic${atomicId}_review`;
      const hasAtomicPermission = userPermissions[key]?.includes(atomicPermission) || false;
      const hasGeneralReview = userPermissions[key]?.includes('review') || false;
      return hasAtomicPermission || hasGeneralReview;
    });
    
    if (!hasPermission) {
      return { success: false, error: 'Insufficient permissions to reject atomic elements' };
    }
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.rejectAtomicElements with:', { kriId, formattedDate, atomicIds, reason });
      
      const updatedAtomics = await kriService.rejectAtomicElements(
        kriId, 
        formattedDate, 
        atomicIds,
        reason,
        state.currentUser.name
      );
      
      // Update local atomic data state
      const atomicData = [...state.atomicData];
      atomicIds.forEach(atomicId => {
        const atomicIndex = atomicData.findIndex(item => 
          item.atomic_id === parseInt(atomicId) && 
          item.kri_id === parseInt(kriId) && 
          item.reporting_date === parseInt(reportingDate)
        );
        
        if (atomicIndex !== -1) {
          atomicData[atomicIndex] = {
            ...atomicData[atomicIndex],
            atomic_status: 20 // Under Rework status
          };
        }
      });
      
      commit('SET_ATOMIC_DATA', atomicData);
      return { success: true, data: updatedAtomics };
    } catch (error) {
      console.error('Error rejecting atomic elements:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  async acknowledgeAtomicElements({ commit, state }, { kriId, reportingDate, atomicIds }) {
    console.log('acknowledgeAtomicElements called with:', { kriId, reportingDate, atomicIds });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    // Check if user has permission to acknowledge atomic elements
    const key = `${kriId}_${reportingDate}`;
    const hasPermission = atomicIds.every(atomicId => {
      const atomicPermission = `atomic${atomicId}_acknowledge`;
      const hasAtomicPermission = userPermissions[key]?.includes(atomicPermission) || false;
      const hasGeneralAcknowledge = userPermissions[key]?.includes('acknowledge') || false;
      return hasAtomicPermission || hasGeneralAcknowledge;
    });
    
    if (!hasPermission) {
      return { success: false, error: 'Insufficient permissions to acknowledge atomic elements' };
    }
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.acknowledgeAtomicElements with:', { kriId, formattedDate, atomicIds });
      
      const updatedAtomics = await kriService.acknowledgeAtomicElements(
        kriId, 
        formattedDate, 
        atomicIds,
        state.currentUser.name
      );
      
      // Update local atomic data state
      const atomicData = [...state.atomicData];
      atomicIds.forEach(atomicId => {
        const atomicIndex = atomicData.findIndex(item => 
          item.atomic_id === parseInt(atomicId) && 
          item.kri_id === parseInt(kriId) && 
          item.reporting_date === parseInt(reportingDate)
        );
        
        if (atomicIndex !== -1) {
          atomicData[atomicIndex] = {
            ...atomicData[atomicIndex],
            atomic_status: 60 // Finalized status
          };
        }
      });
      
      commit('SET_ATOMIC_DATA', atomicData);
      return { success: true, data: updatedAtomics };
    } catch (error) {
      console.error('Error acknowledging atomic elements:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  async submitAtomicElement({ commit, state }, { kriId, reportingDate, atomicId }) {
    console.log('submitAtomicElement called with:', { kriId, reportingDate, atomicId });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    // Check if user can perform submit action for atomic element
    if (!canPerformAction(userPermissions, 'edit', currentKRI.rawData.kri_status, currentKRI, atomicId)) {
      return { success: false, error: 'Insufficient permissions to submit atomic element' };
    }
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.submitAtomicElement with:', { kriId, formattedDate, atomicId });
      
      const updatedAtomic = await kriService.submitAtomicElement(
        kriId, 
        formattedDate,
        atomicId,
        state.currentUser.name
      );
      
      // Update local atomic data state
      const atomicData = [...state.atomicData];
      const atomicIndex = atomicData.findIndex(item => 
        item.atomic_id === parseInt(atomicId) && 
        item.kri_id === parseInt(kriId) && 
        item.reporting_date === parseInt(reportingDate)
      );
      
      if (atomicIndex !== -1) {
        atomicData[atomicIndex] = {
          ...atomicData[atomicIndex],
          atomic_status: 40 // Submitted to Data Provider Approver
        };
        commit('SET_ATOMIC_DATA', atomicData);
      }
      
      return { success: true, data: updatedAtomic };
    } catch (error) {
      console.error('Error submitting atomic element:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  async saveAndSubmitAtomicElement({ commit, state }, { kriId, reportingDate, atomicId, value }) {
    console.log('saveAndSubmitAtomicElement called with:', { kriId, reportingDate, atomicId, value });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    // Check if user can perform save and submit action for atomic element
    if (!canPerformAction(userPermissions, 'edit', currentKRI.rawData.kri_status, currentKRI, atomicId)) {
      return { success: false, error: 'Insufficient permissions to save and submit atomic element' };
    }
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.saveAndSubmitAtomicElement with:', { kriId, formattedDate, atomicId, value });
      
      const updatedAtomic = await kriService.saveAndSubmitAtomicElement(
        kriId, 
        formattedDate,
        atomicId,
        value,
        state.currentUser.name
      );
      
      // Update local atomic data state
      const atomicData = [...state.atomicData];
      const atomicIndex = atomicData.findIndex(item => 
        item.atomic_id === parseInt(atomicId) && 
        item.kri_id === parseInt(kriId) && 
        item.reporting_date === parseInt(reportingDate)
      );
      
      if (atomicIndex !== -1) {
        atomicData[atomicIndex] = {
          ...atomicData[atomicIndex],
          atomic_value: value,
          atomic_status: 40 // Submitted to Data Provider Approver
        };
        commit('SET_ATOMIC_DATA', atomicData);
      }
      
      return { success: true, data: updatedAtomic };
    } catch (error) {
      console.error('Error saving and submitting atomic element:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  async submitAtomicData({ commit, state }, { kriId, reportingDate }) {
    console.log('submitAtomicData called with:', { kriId, reportingDate });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    // Check if user can perform submit action
    if (!canPerformAction(userPermissions, 'edit', currentKRI.rawData.kri_status, currentKRI)) {
      return { success: false, error: 'Insufficient permissions to submit atomic data' };
    }
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.submitAtomicData with:', { kriId, formattedDate });
      
      const updatedAtomics = await kriService.submitAtomicData(
        kriId, 
        formattedDate,
        state.currentUser.name
      );
      
      // Update local atomic data state - all elements to submitted status
      const atomicData = [...state.atomicData];
      atomicData.forEach((item, index) => {
        if (item.kri_id === parseInt(kriId) && item.reporting_date === parseInt(reportingDate)) {
          atomicData[index] = {
            ...item,
            atomic_status: 40 // Submitted status
          };
        }
      });
      
      commit('SET_ATOMIC_DATA', atomicData);
      return { success: true, data: updatedAtomics };
    } catch (error) {
      console.error('Error submitting atomic data:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  async calculateKRIFromAtomic({ commit, state }, { kriId, reportingDate }) {
    console.log('calculateKRIFromAtomic called with:', { kriId, reportingDate });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    // Check if user can perform calculation
    if (!canPerformAction(userPermissions, 'edit', currentKRI.rawData.kri_status, currentKRI)) {
      return { success: false, error: 'Insufficient permissions to calculate KRI' };
    }
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.calculateKRIFromAtomic with:', { kriId, formattedDate });
      
      const calculationResult = await kriService.calculateKRIFromAtomic(
        kriId, 
        formattedDate,
        state.currentUser.name
      );
      
      // Update local KRI state with calculated value
      const kriItems = [...state.kriItems];
      const kriIndex = kriItems.findIndex(item => 
        item.id === String(kriId) && item.reportingDate === String(reportingDate)
      );
      
      if (kriIndex !== -1) {
        kriItems[kriIndex] = {
          ...kriItems[kriIndex],
          kriValue: calculationResult.calculatedValue.toString(),
          breachType: calculationResult.breach_type,
          rawData: {
            ...kriItems[kriIndex].rawData,
            kri_value: calculationResult.calculatedValue.toString(),
            breach_type: calculationResult.breach_type
          }
        };
        
        commit('SET_KRI_ITEMS', kriItems);
        
        // Update kriDetail if it's the same KRI
        if (state.kriDetail && 
            String(state.kriDetail.kri_id) === String(kriId) && 
            String(state.kriDetail.reporting_date) === String(reportingDate)) {
          commit('SET_KRI_DETAIL', {
            ...state.kriDetail,
            kri_value: calculationResult.calculatedValue.toString(),
            breach_type: calculationResult.breach_type
          });
        }
      }
      
      return { success: true, data: calculationResult };
    } catch (error) {
      console.error('Error calculating KRI from atomic:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  // Bulk update atomic values with optimistic updates
  async bulkUpdateAtomicValues({ commit, state }, { kriId, reportingDate, atomicUpdates }) {
    console.log('bulkUpdateAtomicValues called with:', { kriId, reportingDate, atomicUpdates });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    // Check if user has permission for bulk operations
    const hasPermission = atomicUpdates.every(update => 
      canPerformAction(userPermissions, 'edit', currentKRI.rawData.kri_status, currentKRI, update.atomicId)
    );
    
    if (!hasPermission) {
      return { success: false, error: 'Insufficient permissions for bulk atomic update' };
    }
    
    // Optimistic update - update local state first
    const atomicData = [...state.atomicData];
    const originalValues = {};
    
    // Apply optimistic updates and store original values for rollback
    atomicUpdates.forEach(update => {
      const atomicIndex = atomicData.findIndex(item => 
        item.atomic_id === parseInt(update.atomicId) && 
        item.kri_id === parseInt(kriId) && 
        item.reporting_date === parseInt(reportingDate)
      );
      
      if (atomicIndex !== -1) {
        originalValues[update.atomicId] = {
          atomic_value: atomicData[atomicIndex].atomic_value,
          atomic_status: atomicData[atomicIndex].atomic_status
        };
        
        atomicData[atomicIndex] = {
          ...atomicData[atomicIndex],
          atomic_value: update.value,
          atomic_status: 30 // Saved status
        };
      }
    });
    
    // Apply optimistic update
    commit('SET_ATOMIC_DATA', atomicData);
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.bulkUpdateAtomicValues with:', { kriId, formattedDate, atomicUpdates });
      
      const updatedAtomics = await kriService.bulkUpdateAtomicValues(
        kriId, 
        formattedDate, 
        atomicUpdates.map(update => ({
          atomicId: update.atomicId,
          value: update.value,
          oldValue: originalValues[update.atomicId]?.atomic_value
        })),
        state.currentUser.name
      );
      
      // Success - the optimistic update is confirmed
      return { success: true, data: updatedAtomics };
    } catch (error) {
      console.error('Error in bulk atomic update:', error);
      
      // Rollback optimistic update
      const rolledBackData = [...state.atomicData];
      atomicUpdates.forEach(update => {
        const atomicIndex = rolledBackData.findIndex(item => 
          item.atomic_id === parseInt(update.atomicId) && 
          item.kri_id === parseInt(kriId) && 
          item.reporting_date === parseInt(reportingDate)
        );
        
        if (atomicIndex !== -1 && originalValues[update.atomicId]) {
          rolledBackData[atomicIndex] = {
            ...rolledBackData[atomicIndex],
            atomic_value: originalValues[update.atomicId].atomic_value,
            atomic_status: originalValues[update.atomicId].atomic_status
          };
        }
      });
      
      commit('SET_ATOMIC_DATA', rolledBackData);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  // Fetch atomic data for a specific KRI (for table expansion)
  async fetchAtomicData(_, { kriId, reportingDate }) {
    console.log('fetchAtomicData called with:', { kriId, reportingDate });
    
    // Convert reporting date YYYYMMDD or YYYY-MM-DD to integer format (YYYYMMDD)
    let formattedDate;
    if (typeof reportingDate === 'number') {
      formattedDate = reportingDate;
    } else if (typeof reportingDate === 'string') {
      if (reportingDate.includes('-')) {
        formattedDate = parseInt(reportingDate.replace(/-/g, ''), 10); // Convert YYYY-MM-DD to YYYYMMDD
      } else {
        formattedDate = parseInt(reportingDate, 10); // Already in YYYYMMDD format
      }
    } else {
      console.warn('Incorrect reporting date format:',reportingDate,'(', typeof reportingDate,')');
      formattedDate = parseInt(String(reportingDate).replace(/-/g, ''), 10); // Try to convert to YYYYMMDD
    }
    
    try {
      // Use the service to fetch atomic data
      const atomicData = await kriService.fetchKRIAtomic(kriId, formattedDate);
      
      // Return the data directly for table usage
      return { success: true, data: atomicData };
    } catch (error) {
      console.log('Database error for atomic data, returning empty array:', error.message);
      
      // Return empty array as fallback
      return { success: true, data: [] };
    }
  },

  // ========================================
  // KRI-LEVEL APPROVAL WORKFLOW ACTIONS
  // ========================================

  // KRI-level approve (Data Provider: 40→50, KRI Owner: 50→60)
  async approveKRILevel({ commit, state }, { kriId, reportingDate, reason = null }) {
    console.log('approveKRILevel called with:', { kriId, reportingDate, reason });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    const currentStatus = currentKRI.rawData.kri_status;
    
    // Check permission based on status - review for 40, acknowledge for 50
    const requiredPermission = currentStatus === 40 ? 'review' : 'acknowledge';
    if (!canPerformAction(userPermissions, requiredPermission, currentStatus, currentKRI)) {
      return { success: false, error: 'Insufficient permissions' };
    }
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.approveKRI with:', { kriId, formattedDate, reason });
      
      const updatedKRI = await kriService.approveKRI(
        kriId, 
        formattedDate, 
        state.currentUser.name,
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
      console.error('Error approving KRI level:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  // KRI-level reject (40→20 or 50→20)
  async rejectKRILevel({ commit, state }, { kriId, reportingDate, reason }) {
    console.log('rejectKRILevel called with:', { kriId, reportingDate, reason });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    const currentStatus = currentKRI.rawData.kri_status;
    
    // Check permission based on status - review for 40, acknowledge for 50
    const requiredPermission = currentStatus === 40 ? 'review' : 'acknowledge';
    if (!canPerformAction(userPermissions, requiredPermission, currentStatus, currentKRI)) {
      return { success: false, error: 'Insufficient permissions' };
    }
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.rejectKRI with:', { kriId, formattedDate, reason });
      
      const updatedKRI = await kriService.rejectKRI(
        kriId, 
        formattedDate, 
        reason,
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
          collectionStatus: mapStatus(20), // Under Rework
          rawData: {
            ...kriItems[kriIndex].rawData,
            kri_status: 20
          }
        };
        
        commit('SET_KRI_ITEMS', kriItems);
        
        // Update kriDetail if it's the same KRI
        if (state.kriDetail && 
            String(state.kriDetail.kri_id) === String(kriId) && 
            String(state.kriDetail.reporting_date) === String(reportingDate)) {
          commit('SET_KRI_DETAIL', {
            ...state.kriDetail,
            kri_status: 20
          });
        }
      }
      
      return { success: true, data: updatedKRI };
    } catch (error) {
      console.error('Error rejecting KRI level:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  // Manual override KRI value
  async overrideKRIValue({ commit, state }, { kriId, reportingDate, newValue, reason }) {
    console.log('overrideKRIValue called with:', { kriId, reportingDate, newValue, reason });
    
    const userPermissions = state.currentUser.permissions;
    const currentKRI = state.kriItems.find(item => 
      item.id === String(kriId) && item.reportingDate === String(reportingDate)
    );
    
    if (!currentKRI) {
      return { success: false, error: 'KRI not found' };
    }
    
    // Check if user has acknowledge permission (KRI Owner level)
    if (!canPerformAction(userPermissions, 'acknowledge', currentKRI.rawData.kri_status, currentKRI)) {
      return { success: false, error: 'Insufficient permissions for KRI override' };
    }
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.overrideKRIValue with:', { kriId, formattedDate, newValue, reason });
      
      const overrideResult = await kriService.overrideKRIValue(
        kriId, 
        formattedDate, 
        newValue,
        reason,
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
          kriValue: newValue.toString(),
          breachType: overrideResult.newBreachStatus,
          rawData: {
            ...kriItems[kriIndex].rawData,
            kri_value: newValue.toString(),
            breach_type: overrideResult.newBreachStatus
          }
        };
        
        commit('SET_KRI_ITEMS', kriItems);
        
        // Update kriDetail if it's the same KRI
        if (state.kriDetail && 
            String(state.kriDetail.kri_id) === String(kriId) && 
            String(state.kriDetail.reporting_date) === String(reportingDate)) {
          commit('SET_KRI_DETAIL', {
            ...state.kriDetail,
            kri_value: newValue.toString(),
            breach_type: overrideResult.newBreachStatus
          });
        }
      }
      
      return { success: true, data: overrideResult };
    } catch (error) {
      console.error('Error overriding KRI value:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  },

  // Check and auto-recalculate KRI when all atomic elements are finalized
  async checkAndAutoRecalculate({ commit, state }, { kriId, reportingDate }) {
    console.log('checkAndAutoRecalculate called with:', { kriId, reportingDate });
    
    try {
      const formattedDate = formatDateFromInt(reportingDate);
      console.log('Calling kriService.checkAndAutoRecalculate with:', { kriId, formattedDate });
      
      const recalcResult = await kriService.checkAndAutoRecalculate(
        kriId, 
        formattedDate,
        state.currentUser.name
      );
      
      if (recalcResult.needsRecalculation) {
        // Update local state with recalculated value
        const kriItems = [...state.kriItems];
        const kriIndex = kriItems.findIndex(item => 
          item.id === String(kriId) && item.reportingDate === String(reportingDate)
        );
        
        if (kriIndex !== -1) {
          kriItems[kriIndex] = {
            ...kriItems[kriIndex],
            kriValue: recalcResult.result.calculatedValue.toString(),
            breachType: recalcResult.result.breach_type,
            rawData: {
              ...kriItems[kriIndex].rawData,
              kri_value: recalcResult.result.calculatedValue.toString(),
              breach_type: recalcResult.result.breach_type
            }
          };
          
          commit('SET_KRI_ITEMS', kriItems);
          
          // Update kriDetail if it's the same KRI
          if (state.kriDetail && 
              String(state.kriDetail.kri_id) === String(kriId) && 
              String(state.kriDetail.reporting_date) === String(reportingDate)) {
            commit('SET_KRI_DETAIL', {
              ...state.kriDetail,
              kri_value: recalcResult.result.calculatedValue.toString(),
              breach_type: recalcResult.result.breach_type
            });
          }
        }
      }
      
      return { success: true, data: recalcResult };
    } catch (error) {
      console.error('Error in auto-recalculation check:', error);
      commit('SET_ERROR', error.message);
      return { success: false, error: error.message };
    }
  }
};

const getters = {
  filteredKRIItems: (state) => {
    let filtered = [...state.kriItems];
    
    // First, filter based on view permissions
    if (state.currentUser && state.currentUser.permissions) {
      filtered = filtered.filter(item => 
        canViewKRI(state.currentUser.permissions, item.id, item.reportingDate)
      );
    }
    
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
    let filtered = state.kriItems.filter(item => item.collectionStatus === statusToMatch);
    
    // Also filter based on view permissions
    if (state.currentUser && state.currentUser.permissions) {
      filtered = filtered.filter(item => 
        canViewKRI(state.currentUser.permissions, item.id, item.reportingDate)
      );
    }
    
    return filtered;
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

  // Check if user is authenticated
  isAuthenticated: (state) => {
    return !!(state.currentUser && state.currentUser.uuid);
  },
  
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};