import { kriService } from '@/services/kriService';
import { mapStatus, transformKRIData, USER_PERMISSIONS } from '@/utils/types';
import sessionStorageUtil from '@/utils/sessionStorage';
import { getLastDayOfPreviousMonth } from '@/utils/helpers';

// Extract atomic ID from atomic permission (e.g., "atomic1_edit" -> "1")
export const getAtomicIdFromPermission = (permission) => {
  const match = permission.match(/^atomic(\d+)_/);
  return match ? parseInt(match[1], 10) : null;
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
    permissions: [], // look up in permission table
    authenticated: false
  },
  // Table column preferences
  tableColumnPreferences: {
    kriTable: {
      visibleColumns: []
    },
    kriCollectTable: {
      visibleColumns: []
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
    sessionStorageUtil.clear();
  },
  RESTORE_USER_FROM_STORAGE(state) {
    const storedUser = sessionStorageUtil.getUser();
    const storedPermissions = sessionStorageUtil.getPermissions();
    if (storedUser && storedUser.uuid) {
      state.currentUser = { ...storedUser, permissions: storedPermissions };
    }
  },
  // Table column preference mutations
  SET_TABLE_COLUMN_PREFERENCES(state, { tableType, preferences }) {
    if (state.tableColumnPreferences[tableType]) {
      state.tableColumnPreferences[tableType] = { ...state.tableColumnPreferences[tableType], ...preferences };
    }
  },
  RESET_TABLE_COLUMN_PREFERENCES(state, tableType) {
    if (state.tableColumnPreferences[tableType]) {
      state.tableColumnPreferences[tableType] = {
        visibleColumns: []
      };
    }
  }
};

const actions = {
  async fetchKRIItems({ commit }, reportingDate) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);
    
    try {
      const data = await kriService.fetchKRIItems(reportingDate);
      const transformedData = transformKRIData(data, mapStatus);
      commit('SET_KRI_ITEMS', transformedData);
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
      commit('SET_ERROR', error.message);
      throw error;
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

  restoreUserFromStorage({ commit }) {
    commit('RESTORE_USER_FROM_STORAGE');
  },

  updateUserPermissions({ commit }, permissions) {
    commit('SET_USER_PERMISSIONS', permissions);
  },

  async initPermission({ commit, state }) {
    const rawPermissions = await kriService.fetchUserPermission(state.currentUser.uuid, '*', state.filters.reportingDate);
    console.log('Raw permissions:', rawPermissions);
    
    // Parse the permissions to convert actions string to array
    const parsedPermissions = rawPermissions.map(permission => ({
      ...permission,
      actionsArray: permission.actions ? permission.actions.split(',').map(a => a.trim()) : []
    }));
    
    console.log('Parsed permissions:', parsedPermissions);
    commit('SET_USER_PERMISSIONS', parsedPermissions);

    console.log('Current user permissions:', state.currentUser.permissions);
  },

  async fetchAtomicDataForCalculatedKRIs({ commit, state }) {
    // Find all calculated KRIs from current items
    const calculatedKRIs = state.kriItems.filter(item => item.isCalculatedKri);
    
    if (calculatedKRIs.length === 0) {
      console.log('No calculated KRIs found, skipping atomic data fetch');
      return;
    }

    console.log(`Loading atomic data for ${calculatedKRIs.length} calculated KRIs...`);
    
    try {
      // Fetch atomic data for all calculated KRIs in parallel
      const atomicDataPromises = calculatedKRIs.map(kri => 
        kriService.fetchKRIAtomic(kri.kriId, kri.reportingDate)
      );
      
      const atomicDataResults = await Promise.all(atomicDataPromises);
      
      // Flatten all atomic data into single array
      const allAtomicData = atomicDataResults.flat();
      
      console.log(`Loaded ${allAtomicData.length} atomic data items`);
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
      filtered = filtered.filter(item => {
        // Handle both numeric and string status values
        let itemStatus = item.collectionStatus;
        if (typeof itemStatus === 'string') {
          // Import StatusManager dynamically to avoid circular deps
          const StatusManager = require('@/utils/types').default;
          itemStatus = StatusManager.getLabelToNumber(itemStatus);
        }
        return itemStatus === state.filters.collectionStatus;
      });
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
    
    if (state.filters.kriId) {
      filtered = filtered.filter(item => 
        item.id && item.id.toString().includes(state.filters.kriId.toString())
      );
    }
    
    if (state.filters.reportingCycle) {
      filtered = filtered.filter(item => 
        item.reportingCycle && item.reportingCycle.toLowerCase().includes(state.filters.reportingCycle.toLowerCase())
      );
    }
    
    if (state.filters.l2RiskType) {
      filtered = filtered.filter(item => 
        item.l2RiskType && item.l2RiskType.toLowerCase().includes(state.filters.l2RiskType.toLowerCase())
      );
    }
    
    if (state.filters.kriType) {
      filtered = filtered.filter(item => 
        item.kriType && item.kriType.toLowerCase().includes(state.filters.kriType.toLowerCase())
      );
    }
    
    if (state.filters.breachType) {
      filtered = filtered.filter(item => 
        item.breachType && item.breachType.toLowerCase().includes(state.filters.breachType.toLowerCase())
      );
    }
    
    return filtered;
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

  // Check if user can perform action on KRI/atomic
  canPerform: (state) => (kriId, atomicId, action) => {
    if (!state.currentUser || !state.currentUser.permissions) {
      return false;
    }
    
    // Validate action against defined permissions
    if (!Object.values(USER_PERMISSIONS).includes(action)) {
      console.warn(`Invalid action: ${action}. Valid actions are:`, Object.values(USER_PERMISSIONS));
      return false;
    }
    
    // Find permission record for this KRI
    const permission = state.currentUser.permissions.find(p => p.kri_id === kriId);
    if (!permission || !permission.actions) {
      return false;
    }
    
    // Use pre-parsed actions array if available, otherwise raise error
    const actionsArray = permission.actionsArray;
    if (!actionsArray) {
      throw new Error(`Permission actions not properly parsed for KRI ${kriId}. Call initPermission() first.`);
    }
    
    // Check for atomic-specific permission first (e.g., "atomic1_edit")
    if (atomicId !== null && atomicId !== undefined) {
      const atomicAction = `atomic${atomicId}_${action}`;
      if (actionsArray.includes(atomicAction)) {
        return true;
      }
    }
    
    // Check for general permission (e.g., "edit")
    return actionsArray.includes(action);
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

  // Count pending KRIs that need user attention
  totalPendingKRIsCount: (state, getters) => {
    if (!getters.isAuthenticated) return 0;
    
    return getters.filteredKRIItems.filter(item => {
      const status = item.collectionStatus;
      // Based on database schema, these are statuses that need attention
      return status === 10 || // PENDING_INPUT
             status === 20 || // UNDER_REWORK  
             status === 40 || // SUBMITTED_TO_DATA_PROVIDER_APPROVER
             status === 50;   // SUBMITTED_TO_KRI_OWNER_APPROVER
    }).length;
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
    return state.tableColumnPreferences[tableType] || { visibleColumns: [] };
  },

  getVisibleColumnsForTable: (state) => (tableType) => {
    const preferences = state.tableColumnPreferences[tableType];
    return preferences ? preferences.visibleColumns : [];
  },
  
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};