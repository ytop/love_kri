import { kriService } from '@/services/kriService';
import { mapStatus, transformKRIData } from '@/utils/types';
import sessionStorageUtil from '@/utils/sessionStorage';
import { getLastDayOfPreviousMonth, applyKRIFilters, calculatePendingKRIs } from '@/utils/helpers';
import Permission from '@/utils/permission';
import { kriCalculationService } from '@/utils/kriCalculation';

const state = {
  kriItems: [],
  kriDetail: null,
  atomicData: [],
  evidenceData: [],
  auditTrailData: [],
  historicalData: [],
  metadataHistoryData: [], // Add metadata history data
  pendingKRIItems: [], // Cached pending KRIs for performance
  loading: false,
  error: null,
  // User role and department management
  currentUser: {
    uuid: null, // uuid
    name: '', // user_id
    department: '', // Ddepartment, for display
    permissions: [], // look up in permission table
    authenticated: false
  },
  // Table column preferences
  tableColumnPreferences: {
    kriTable: {
      visibleColumns: [],
      columnOrder: []
    },
    kriCollectTable: {
      visibleColumns: [],
      columnOrder: []
    }
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
  SET_PENDING_KRI_ITEMS(state, items) {
    state.pendingKRIItems = items;
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
  SET_METADATA_HISTORY_DATA(state, data) {
    state.metadataHistoryData = data;
  },
  SET_FILTERS(state, filters) {
    state.filters = { ...state.filters, ...filters };
  },
  RESET_FILTERS(state) {
    // Preserve user's department when resetting filters
    const userDepartment = state.currentUser?.department || '';
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
      department: userDepartment
    };
  },
  // User management mutations
  SET_CURRENT_USER(state, user) {
    state.currentUser = { ...state.currentUser, ...user };
    sessionStorageUtil.setUser(state.currentUser);
  },
  SET_USER_PERMISSIONS(state, permissions) {
    state.currentUser.permissions = permissions;
    sessionStorageUtil.setPermissions(permissions);
  },
  LOGOUT_USER(state) {
    state.currentUser = {
      uuid: null,
      name: '',
      department: '',
      permissions: []
    };
    // Clear all KRI data to prevent access after logout
    state.kriItems = [];
    state.pendingKRIItems = [];
    state.kriDetail = null;
    state.atomicData = [];
    state.evidenceData = [];
    state.auditTrailData = [];
    state.historicalData = [];
    state.metadataHistoryData = [];
    sessionStorageUtil.clear();
  },
  RESTORE_USER_FROM_STORAGE(state) {
    const storedUser = sessionStorageUtil.getUser();
    const storedPermissions = sessionStorageUtil.getPermissions();
    if (storedUser && storedUser.uuid) {
      state.currentUser = { ...storedUser, permissions: storedPermissions };
      // Sync department filter with restored user
      if (storedUser.department) {
        state.filters.department = storedUser.department;
      }
    }
  },
  // Table column preference mutations
  SET_TABLE_COLUMN_PREFERENCES(state, { tableType, preferences }) {
    if (state.tableColumnPreferences[tableType]) {
      // Ensure Vue detects array changes by creating a new object
      const newPreferences = {
        ...state.tableColumnPreferences[tableType],
        ...preferences
      };
      // Force reactivity by replacing the entire object
      state.tableColumnPreferences = {
        ...state.tableColumnPreferences,
        [tableType]: newPreferences
      };
    }
  },
  RESET_TABLE_COLUMN_PREFERENCES(state, tableType) {
    if (state.tableColumnPreferences[tableType]) {
      // Force reactivity by replacing the entire tableColumnPreferences object
      state.tableColumnPreferences = {
        ...state.tableColumnPreferences,
        [tableType]: {
          visibleColumns: [],
          columnOrder: []
        }
      };
    }
  }
};

const actions = {
  async fetchKRIItems({ commit, state }, reportingDate) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);
    
    try {
      // Pass user's department for database-level filtering
      const userDepartment = state.currentUser?.department || null;
      const data = await kriService.fetchKRIItems(reportingDate, userDepartment);
      const transformedData = transformKRIData(data, mapStatus);
      commit('SET_KRI_ITEMS', transformedData);
      
      // Calculate and store pending KRIs if user has permissions
      if (state.currentUser.permissions && state.currentUser.permissions.length > 0) {
        const pendingKRIs = calculatePendingKRIs(transformedData, state.currentUser.permissions);
        commit('SET_PENDING_KRI_ITEMS', pendingKRIs);
      } else {
        commit('SET_PENDING_KRI_ITEMS', []);
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  async fetchKRIDetail({ commit }, { kriId, reportingDate }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);
    
    try {
      const [kriDetail, evidenceData, auditTrailData, historicalData] = await Promise.all([
        kriService.fetchKRIDetail(kriId, reportingDate),
        kriService.fetchKRIEvidence(kriId, reportingDate),
        kriService.fetchKRIAuditTrail(kriId, reportingDate),
        kriService.fetchKRIHistorical(kriId, 12)
      ]);
      
      // Fetch atomic data with evidence if this is a calculated KRI
      let atomicData = [];
      if (kriDetail && kriDetail.is_calculated_kri) {
        atomicData = await kriService.fetchAtomicWithEvidence(kriId, reportingDate);
      } else {
        atomicData = await kriService.fetchKRIAtomic(kriId, reportingDate);
      }
      
      // Fetch metadata history if we have a kri_code
      // cant in batch due to require kri_code
      let metadataHistoryData = [];
      if (kriDetail && kriDetail.kri_code) {
        metadataHistoryData = await kriService.fetchMetadataHistory(kriDetail.kri_code);
      }
      
      commit('SET_KRI_DETAIL', kriDetail);
      commit('SET_ATOMIC_DATA', atomicData);
      commit('SET_EVIDENCE_DATA', evidenceData);
      commit('SET_AUDIT_TRAIL_DATA', auditTrailData);
      commit('SET_HISTORICAL_DATA', historicalData || []);
      commit('SET_METADATA_HISTORY_DATA', metadataHistoryData);
    } catch (error) {
      commit('SET_ERROR', error.message);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  async fetchKRIHistorical({ commit }, { kriId, months = 12 }) {
    try {
      const historicalData = await kriService.fetchKRIHistorical(kriId, months);
      commit('SET_HISTORICAL_DATA', historicalData);
      return historicalData;
    } catch (error) {
      console.error('Error fetching KRI historical data:', error);
      commit('SET_HISTORICAL_DATA', []); // Set empty array on error
      return [];
    }
  },

  updateFilters({ commit }, filters) {
    commit('SET_FILTERS', filters);
  },

  resetFilters({ commit }) {
    commit('RESET_FILTERS');
  },

  restoreUserFromStorage({ commit }) {
    commit('RESTORE_USER_FROM_STORAGE');
  },

  updateUserPermissions({ commit }, permissions) {
    commit('SET_USER_PERMISSIONS', permissions);
  },

  async initPermission({ commit, state }) {
    const rawPermissions = await kriService.fetchUserPermission(state.currentUser.uuid, '*', state.filters.reportingDate);
    // Parse the permissions to convert actions string to array
    const parsedPermissions = rawPermissions.map(permission => ({
      ...permission,
      actionsArray: permission.actions ? permission.actions.split(',').map(a => a.trim()) : []
    }));
    commit('SET_USER_PERMISSIONS', parsedPermissions);
    
    // Recalculate pending KRIs when permissions change
    if (state.kriItems.length > 0) {
      const pendingKRIs = calculatePendingKRIs(state.kriItems, parsedPermissions);
      commit('SET_PENDING_KRI_ITEMS', pendingKRIs);
    }
  },

  async fetchAtomicDataForCalculatedKRIs({ commit, state }) {
    // Find all calculated KRIs from current items
    const calculatedKRIs = state.kriItems.filter(item => item.isCalculatedKri);
    
    if (calculatedKRIs.length === 0) {
      return;
    }

    
    try {
      // Fetch atomic data for all calculated KRIs in parallel
      const atomicDataPromises = calculatedKRIs.map(kri => 
        kriService.fetchKRIAtomic(kri.kriId, kri.reportingDate)
      );
      
      const atomicDataResults = await Promise.all(atomicDataPromises);
      
      // Flatten all atomic data into single array
      const allAtomicData = atomicDataResults.flat();
      
      commit('SET_ATOMIC_DATA', allAtomicData);
      
    } catch (error) {
      console.error('Error loading atomic data:', error);
      // Don't throw error - this is background loading
    }
  },

  // Table column preference actions
  updateTableColumnPreferences({ commit }, { tableType, preferences }) {
    commit('SET_TABLE_COLUMN_PREFERENCES', { tableType, preferences });
  },

  resetTableColumnPreferences({ commit }, tableType) {
    commit('RESET_TABLE_COLUMN_PREFERENCES', tableType);
  },

  // User authentication action
  async setCurrentUser({ commit, dispatch }, userData) {
    try {
      if (!userData || !userData.uuid || !userData.name) {
        throw new Error('Invalid user data: missing required fields');
      }

      commit('SET_CURRENT_USER', userData);
      
      // Initialize permissions for the authenticated user
      await dispatch('initPermission');
      
      return userData;
    } catch (error) {
      console.error('Error setting current user:', error);
      throw error;
    }
  },

  // KRI Detail specific actions
  async refreshKRIDetail({ dispatch, state }) {
    if (!state.kriDetail) return;
    
    // Reuse existing fetchKRIDetail action
    await dispatch('fetchKRIDetail', {
      kriId: state.kriDetail.kri_id,
      reportingDate: state.kriDetail.reporting_date
    });
  },

  async forceRefreshKRIDetail({ commit, dispatch }) {
    commit('SET_LOADING', true);
    try {
      await dispatch('refreshKRIDetail');
    } finally {
      commit('SET_LOADING', false);
    }
  },

  // Generic KRI update action that wraps existing service methods
  async updateKRIStatus({ dispatch, getters }, { kriId, reportingDate, updateData, action, comment }) {
    const currentUser = getters.currentUser;
    
    // Use existing kriService.updateKRI method
    await kriService.updateKRI(
      kriId, 
      reportingDate, 
      updateData, 
      currentUser.name || currentUser.User_ID, 
      action, 
      comment
    );
    
    // Refresh data after update
    await dispatch('refreshKRIDetail');
  },

  // Atomic evidence actions
  async linkAtomicEvidence({ dispatch, getters }, { kriId, atomicId, reportingDate, evidenceId, comment }) {
    const currentUser = getters.currentUser;
    
    await kriService.linkEvidenceToAtomic(
      kriId,
      atomicId,
      reportingDate,
      evidenceId,
      currentUser.name || currentUser.User_ID,
      comment
    );
    
    // Refresh data after update
    await dispatch('refreshKRIDetail');
  },

  async unlinkAtomicEvidence({ dispatch, getters }, { kriId, atomicId, reportingDate, comment }) {
    const currentUser = getters.currentUser;
    
    await kriService.unlinkEvidenceFromAtomic(
      kriId,
      atomicId,
      reportingDate,
      currentUser.name || currentUser.User_ID,
      comment
    );
    
    // Refresh data after update
    await dispatch('refreshKRIDetail');
  },

  // KRI calculation action
  async calculateKRI({ dispatch, getters, state }, { kriId, reportingDate }) {
    if (!kriId || !reportingDate) {
      throw new Error('kriId and reportingDate are required for KRI calculation');
    }

    const currentUser = getters.currentUser;
    
    // Get KRI detail and atomic data from state
    if (!state.kriDetail || state.kriDetail.kri_id !== kriId || state.kriDetail.reporting_date !== reportingDate) {
      throw new Error('KRI detail not loaded for calculation');
    }
    
    const kriDetail = state.kriDetail;
    const atomicData = state.atomicData;
    
    // Validate we have formula and atomic data
    if (!kriDetail.kri_formula) {
      throw new Error('No formula found for KRI calculation');
    }
    
    if (!atomicData || atomicData.length === 0) {
      throw new Error('No atomic data available for calculation');
    }
    
    try {
      // Calculate new KRI value using existing calculation service
      const calculatedValue = kriCalculationService.executeFormulaCalculation(
        kriDetail.kri_formula,
        atomicData
      );
      
      // Update KRI with calculated value
      await kriService.updateKRI(
        kriId,
        reportingDate,
        { kri_value: calculatedValue.toString() },
        currentUser.name || currentUser.User_ID || 'system',
        'recalculate',
        `KRI recalculated using formula: ${kriDetail.kri_formula} = ${calculatedValue}`
      );
      
      // Refresh data to show updated values
      await dispatch('refreshKRIDetail');
      
      return calculatedValue;
    } catch (error) {
      console.error('KRI calculation failed:', error);
      throw new Error(`KRI calculation failed: ${error.message}`);
    }
  },
};

const getters = {
  filteredKRIItems: (state) => {
    return applyKRIFilters(state.kriItems, state.filters);
  },

  // Get current user permissions
  currentUserPermissions: (state) => {
    return state.currentUser ? state.currentUser.permissions || {} : {};
  },

  // Get current user
  currentUser: (state) => {
    return state.currentUser;
  },

  // Get reporting date from filters
  get_report_date: (state) => {
    return state.filters.reportingDate;
  },

  /**
   * Check if user can perform action on KRI/atomic using Permission utility
   * 
   * @param {Object} state - Vuex state
   * @returns {Function} Function that takes (kriId, atomicId, action) and returns boolean
   */
  canPerform: (state) => (kriId, atomicId, action) => {
    if (!state.currentUser || !state.currentUser.permissions) {
      return false;
    }
    
    return Permission.canPerform(kriId, atomicId, action, state.currentUser.permissions);
  },

  // Get available departments from KRI items for filtering
  availableDepartments: (state) => {
    const departments = new Set();
    state.kriItems.forEach(item => {
      if (item.owner) departments.add(item.owner);
      if (item.dataProvider) departments.add(item.dataProvider);
    });
    return Array.from(departments).sort();
  },

  // Check if user is authenticated based on currentUser state
  isAuthenticated: (state) => {
    return state.currentUser && state.currentUser.uuid && state.currentUser.authenticated;
  },

  // Get pending KRIs that need user attention (stored in state for performance)
  pendingKRIItems: (state) => {
    return state.pendingKRIItems;
  },

  // Get filtered pending KRIs for display in pending page  
  filteredPendingKRIItems: (state) => {
    return applyKRIFilters(state.pendingKRIItems, state.filters);
  },

  // Count of pending KRIs (simplified - just returns length from state)
  totalPendingKRIsCount: (state, getters) => {
    if (!getters.isAuthenticated) {
      return 0;
    }
    return state.pendingKRIItems.length;
  },

  // Determine if pending button should be visible
  showPendingButton: (state, getters) => {
    return getters.isAuthenticated && getters.totalPendingKRIsCount > 0;
  },

  // Get atomic data for a specific KRI and reporting date
  getAtomicDataForKRI: (state) => (kriId, reportingDate) => {
    return state.atomicData.filter(atomic => 
      (atomic.kriId || atomic.kri_id) === kriId && 
      (atomic.reportingDate || atomic.reporting_date) === reportingDate
    );
  },

  // Get atomic data with evidence information for calculated KRIs
  getAtomicWithEvidenceForKRI: (state) => (kriId, reportingDate) => {
    return state.atomicData
      .filter(atomic => 
        (atomic.kriId || atomic.kri_id) === kriId && 
        (atomic.reportingDate || atomic.reporting_date) === reportingDate
      )
      .map(atomic => ({
        ...atomic,
        hasEvidence: !!(atomic.evidence_id || atomic.linkedEvidence),
        evidenceFileName: atomic.linkedEvidence?.file_name || null,
        evidenceId: atomic.evidence_id || atomic.linkedEvidence?.evidence_id || null
      }));
  },

  // Transform atomic data into table row format for a specific KRI
  getAtomicRowsForKRI: (state, getters) => (kriItem, expandedRows = new Set()) => {
    const kriId = kriItem.kriId || kriItem.id;
    const reportingDate = kriItem.reportingDate;
    
    // Only return rows if this KRI is expanded
    const rowId = `${kriId}_${reportingDate}`;
    if (!expandedRows.has(rowId)) {
      return [];
    }
    
    const atomicItems = getters.getAtomicDataForKRI(kriId, reportingDate);
    
    return atomicItems.map(atomic => ({
      ...atomic,
      isAtomicRow: true,
      id: `${kriId}.${atomic.atomicId || atomic.atomic_id}`,
      name: atomic.atomicMetadata || atomic.atomic_metadata || `Atomic Element ${atomic.atomicId || atomic.atomic_id}`,
      kriId: atomic.kriId || atomic.kri_id, // Ensure consistent field mapping
      atomicId: atomic.atomicId || atomic.atomic_id,
      kriValue: atomic.atomicValue || atomic.atomic_value,
      collectionStatus: atomic.atomicStatus || atomic.atomic_status,
      owner: kriItem.owner,
      dataProvider: kriItem.dataProvider,
      l1RiskType: kriItem.l1RiskType,
      l2RiskType: kriItem.l2RiskType,
      breachType: null, // Will be calculated in component using helpers
      reportingCycle: kriItem.reportingCycle,
      reportingDate: atomic.reportingDate || atomic.reporting_date || reportingDate
    }));
  },

  // Generate expanded table data combining KRI items with atomic sub-rows
  getExpandedTableData: (_, getters) => (kriItems, expandedRows = new Set()) => {
    const result = [];
    
    kriItems.forEach(kriItem => {
      // Add main KRI row
      result.push({
        ...kriItem,
        isAtomicRow: false,
        id: kriItem.kriId || kriItem.id,
        name: kriItem.kriName || kriItem.name,
        collectionStatus: kriItem.kriStatus || kriItem.collectionStatus,
        reportingDate: kriItem.reportingDate
      });
      
      // Add atomic sub-rows if expanded and calculated KRI
      const atomicRows = getters.getAtomicRowsForKRI(kriItem, expandedRows);
      atomicRows.forEach(atomicRow => {
        result.push(atomicRow);
      });
    });
    
    return result;
  },

  // Table column preference getters
  getTableColumnPreferences: (state) => (tableType) => {
    return state.tableColumnPreferences[tableType] || { visibleColumns: [], columnOrder: [] };
  },

  getVisibleColumnsForTable: (state) => (tableType) => {
    const preferences = state.tableColumnPreferences[tableType];
    return preferences ? preferences.visibleColumns : [];
  },

  getColumnOrderForTable: (state) => (tableType) => {
    const preferences = state.tableColumnPreferences[tableType];
    return preferences ? preferences.columnOrder : [];
  },

  // KRI Detail specific getters
  availableKRIDetailActions: (state, getters) => {
    if (!state.kriDetail) return [];
    
    // Import here to avoid circular dependency
    const { generateKRIDetailActions } = require('@/utils/helpers');
    
    // Reuse existing canPerform getter
    return generateKRIDetailActions(state.kriDetail, getters.canPerform);
  },

  // Check if KRI detail data is fully loaded
  isKRIDetailLoaded: (state) => {
    return !!(state.kriDetail && !state.loading);
  },

};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};