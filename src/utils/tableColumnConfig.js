/**
 * Centralized table column configuration management
 * Provides standardized column definitions and visibility handling
 */

/**
 * Table column configuration manager following the Manager pattern
 */
class TableColumnManager {
  // Table type constants
  static TABLE_TYPES = {
    KRI_TABLE: 'kriTable',
    KRI_COLLECT_TABLE: 'kriCollectTable'
  };

  // Base column definitions
  static BASE_COLUMNS = {
    selection: {
      key: 'selection',
      label: 'Select',
      width: 55,
      required: true
    },
    id: {
      key: 'id',
      label: 'KRI ID',
      minWidth: 80,
      required: true
    },
    name: {
      key: 'name',
      label: 'KRI Name',
      minWidth: 200,
      required: true
    },
    owner: {
      key: 'owner',
      label: 'Owner',
      minWidth: 100
    },
    dataProvider: {
      key: 'dataProvider',
      label: 'Data Provider',
      minWidth: 120
    },
    collectionStatus: {
      key: 'collectionStatus',
      label: 'Status',
      minWidth: 100,
      required: true
    },
    l1RiskType: {
      key: 'l1RiskType',
      label: 'L1 Risk Type',
      minWidth: 120
    },
    l2RiskType: {
      key: 'l2RiskType',
      label: 'L2 Risk Type',
      minWidth: 120
    },
    breachType: {
      key: 'breachType',
      label: 'Breach Type',
      minWidth: 100
    },
    kriValue: {
      key: 'kriValue',
      label: 'KRI Value',
      minWidth: 100,
      required: true
    },
    reportingCycle: {
      key: 'reportingCycle',
      label: 'Reporting Cycle',
      minWidth: 110
    },
    reportingDate: {
      key: 'reportingDate',
      label: 'Reporting Date',
      minWidth: 110
    },
    actions: {
      key: 'actions',
      label: 'Actions',
      width: 200,
      fixed: 'right',
      required: true
    }
  };

  // Default configurations per table type
  static DEFAULT_CONFIGS = {
    [TableColumnManager.TABLE_TYPES.KRI_TABLE]: {
      availableColumns: [
        'selection', 'id', 'name', 'owner', 'dataProvider', 
        'collectionStatus', 'l1RiskType', 'l2RiskType', 
        'breachType', 'kriValue', 'reportingCycle'
      ],
      defaultVisible: [
        'selection', 'id', 'name', 'owner', 'dataProvider',
        'collectionStatus', 'l1RiskType', 'l2RiskType',
        'breachType', 'kriValue', 'reportingCycle'
      ]
    },
    [TableColumnManager.TABLE_TYPES.KRI_COLLECT_TABLE]: {
      availableColumns: [
        'selection', 'id', 'name', 'owner', 'dataProvider',
        'collectionStatus', 'breachType', 'kriValue', 
        'reportingCycle', 'reportingDate', 'actions'
      ],
      defaultVisible: [
        'selection', 'id', 'name', 'owner', 'dataProvider',
        'collectionStatus', 'breachType', 'kriValue',
        'reportingCycle', 'reportingDate', 'actions'
      ]
    }
  };

  /**
   * Get available columns for a table type
   * @param {string} tableType - Table type constant
   * @returns {Array} Array of available column definitions
   */
  static getAvailableColumns(tableType) {
    const config = TableColumnManager.DEFAULT_CONFIGS[tableType];
    if (!config) {
      throw new Error(`Unknown table type: ${tableType}`);
    }
    
    return config.availableColumns.map(key => ({
      ...TableColumnManager.BASE_COLUMNS[key],
      key
    }));
  }

  /**
   * Get visible columns based on user preferences
   * @param {string} tableType - Table type constant
   * @param {Array} visibleColumnKeys - Array of visible column keys from user preferences
   * @returns {Array} Array of visible column definitions
   */
  static getVisibleColumns(tableType, visibleColumnKeys = null) {
    const config = TableColumnManager.DEFAULT_CONFIGS[tableType];
    if (!config) {
      throw new Error(`Unknown table type: ${tableType}`);
    }

    // Use user preferences or default visible columns
    const columnKeys = (visibleColumnKeys && visibleColumnKeys.length > 0) ? visibleColumnKeys : config.defaultVisible;
    
    return columnKeys
      .filter(key => config.availableColumns.includes(key))
      .map(key => ({
        ...TableColumnManager.BASE_COLUMNS[key],
        key
      }));
  }

  /**
   * Get default visible column keys for a table type
   * @param {string} tableType - Table type constant
   * @returns {Array} Array of default visible column keys
   */
  static getDefaultVisible(tableType) {
    const config = TableColumnManager.DEFAULT_CONFIGS[tableType];
    if (!config) {
      throw new Error(`Unknown table type: ${tableType}`);
    }
    return [...config.defaultVisible];
  }
}

// Export constants for external use
export const TABLE_TYPES = TableColumnManager.TABLE_TYPES;

// Export main class
export default TableColumnManager;