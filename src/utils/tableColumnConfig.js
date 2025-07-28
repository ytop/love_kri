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

  // Base column definitions with default ordering
  static BASE_COLUMNS = {
    selection: {
      key: 'selection',
      label: 'Select',
      width: 55,
      required: true,
      order: 1
    },
    id: {
      key: 'id',
      label: 'KRI ID',
      minWidth: 80,
      required: true,
      sortType: 'numeric',
      sortable: true,
      order: 2
    },
    name: {
      key: 'name',
      label: 'KRI Name',
      minWidth: 200,
      required: true,
      order: 3
    },
    owner: {
      key: 'owner',
      label: 'Owner',
      minWidth: 100,
      order: 4
    },
    dataProvider: {
      key: 'dataProvider',
      label: 'Data Provider',
      minWidth: 120,
      order: 5
    },
    collectionStatus: {
      key: 'collectionStatus',
      label: 'Status',
      minWidth: 100,
      required: true,
      order: 6
    },
    l1RiskType: {
      key: 'l1RiskType',
      label: 'L1 Risk Type',
      minWidth: 120,
      order: 7
    },
    l2RiskType: {
      key: 'l2RiskType',
      label: 'L2 Risk Type',
      minWidth: 120,
      order: 8
    },
    breachType: {
      key: 'breachType',
      label: 'Breach Type',
      minWidth: 100,
      order: 9
    },
    kriValue: {
      key: 'kriValue',
      label: 'KRI Value',
      minWidth: 100,
      required: true,
      sortType: 'numeric',
      sortable: true,
      order: 10
    },
    warningBar: {
      key: 'warningBar',
      label: 'Risk Level',
      width: 120,
      order: 10.5
    },
    reportingCycle: {
      key: 'reportingCycle',
      label: 'Reporting Cycle',
      minWidth: 110,
      order: 11
    },
    reportingDate: {
      key: 'reportingDate',
      label: 'Reporting Date',
      minWidth: 110,
      order: 12
    },
    // Additional KRI_ITEM database columns
    kriDescription: {
      key: 'kriDescription',
      label: 'Description',
      minWidth: 200,
      order: 13
    },
    rasMetric: {
      key: 'rasMetric',
      label: 'RAS Metric',
      minWidth: 120,
      order: 14
    },
    limitValue: {
      key: 'limitValue',
      label: 'Limit Value',
      minWidth: 100,
      sortType: 'numeric',
      sortable: true,
      order: 15
    },
    warningLineValue: {
      key: 'warningLineValue',
      label: 'Warning Line Value',
      minWidth: 120,
      sortType: 'numeric',
      sortable: true,
      order: 16
    },
    negativeWarning: {
      key: 'negativeWarning',
      label: 'Negative Warning',
      minWidth: 110,
      sortType: 'numeric',
      sortable: true,
      order: 17
    },
    negativeLimit: {
      key: 'negativeLimit',
      label: 'Negative Limit',
      minWidth: 110,
      sortType: 'numeric',
      sortable: true,
      order: 18
    },
    reportingFrequency: {
      key: 'reportingFrequency',
      label: 'Reporting Frequency',
      minWidth: 130,
      order: 19
    },
    kriFormula: {
      key: 'kriFormula',
      label: 'KRI Formula',
      minWidth: 150,
      order: 20
    },
    kriStatus: {
      key: 'kriStatus',
      label: 'KRI Status',
      minWidth: 100,
      sortType: 'numeric',
      sortable: true,
      order: 21
    },
    createdAt: {
      key: 'createdAt',
      label: 'Created At',
      minWidth: 130,
      order: 22
    },
    isCalculatedKri: {
      key: 'isCalculatedKri',
      label: 'Calculated KRI',
      minWidth: 110,
      order: 23
    },
    source: {
      key: 'source',
      label: 'Source',
      minWidth: 100,
      order: 24
    },
    evidenceId: {
      key: 'evidenceId',
      label: 'Evidence ID',
      minWidth: 100,
      sortType: 'numeric',
      sortable: true,
      order: 25
    },
    actions: {
      key: 'actions',
      label: 'Actions',
      width: 200,
      fixed: 'right',
      required: true,
      order: 99
    }
  };

  // Default configurations per table type with ordering support
  static DEFAULT_CONFIGS = {
    [TableColumnManager.TABLE_TYPES.KRI_TABLE]: {
      availableColumns: [
        'selection', 'id', 'name', 'kriDescription', 'owner', 'dataProvider', 
        'collectionStatus', 'l1RiskType', 'l2RiskType', 'rasMetric',
        'breachType', 'kriValue', 'warningBar', 'limitValue', 'warningLineValue', 'negativeWarning', 'negativeLimit',
        'reportingCycle', 'reportingDate', 'reportingFrequency', 'kriFormula',
        'kriStatus', 'createdAt', 'isCalculatedKri', 'source', 'evidenceId'
      ],
      defaultVisible: [
        'selection', 'id', 'name', 'owner', 'dataProvider',
        'collectionStatus', 'l1RiskType', 'l2RiskType',
        'breachType', 'kriValue', 'warningBar', 'reportingCycle'
      ],
      defaultOrder: [
        'selection', 'id', 'name', 'kriDescription', 'owner', 'dataProvider',
        'collectionStatus', 'l1RiskType', 'l2RiskType', 'rasMetric',
        'breachType', 'kriValue', 'warningBar', 'limitValue', 'warningLineValue', 'negativeWarning', 'negativeLimit',
        'reportingCycle', 'reportingDate', 'reportingFrequency', 'kriFormula',
        'kriStatus', 'createdAt', 'isCalculatedKri', 'source', 'evidenceId'
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
      ],
      defaultOrder: [
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
   * Get visible columns based on user preferences with ordering support
   * @param {string} tableType - Table type constant
   * @param {Array} visibleColumnKeys - Array of visible column keys from user preferences
   * @param {Array} columnOrder - Array of column keys in custom order
   * @returns {Array} Array of visible column definitions in specified order
   */
  static getVisibleColumns(tableType, visibleColumnKeys = null, columnOrder = null) {
    const config = TableColumnManager.DEFAULT_CONFIGS[tableType];
    if (!config) {
      throw new Error(`Unknown table type: ${tableType}`);
    }

    // Use user preferences or default visible columns
    const visibleKeys = (visibleColumnKeys && visibleColumnKeys.length > 0) ? visibleColumnKeys : config.defaultVisible;
    
    // Use custom order or default order
    const orderKeys = (columnOrder && columnOrder.length > 0) ? columnOrder : config.defaultOrder;
    
    // Filter visible columns and sort by order
    return orderKeys
      .filter(key => visibleKeys.includes(key) && config.availableColumns.includes(key))
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

  /**
   * Get default column order for a table type
   * @param {string} tableType - Table type constant
   * @returns {Array} Array of default column order keys
   */
  static getDefaultOrder(tableType) {
    const config = TableColumnManager.DEFAULT_CONFIGS[tableType];
    if (!config) {
      throw new Error(`Unknown table type: ${tableType}`);
    }
    return [...config.defaultOrder];
  }

  /**
   * Get available columns with ordering information for configuration UI
   * @param {string} tableType - Table type constant
   * @param {Array} currentOrder - Current column order from user preferences
   * @param {Array} enabledColumns - Currently enabled column keys
   * @returns {Array} Array of column objects with order and enabled state
   */
  static getColumnsForConfiguration(tableType, currentOrder = null, enabledColumns = null) {
    const config = TableColumnManager.DEFAULT_CONFIGS[tableType];
    if (!config) {
      throw new Error(`Unknown table type: ${tableType}`);
    }

    const order = currentOrder || config.defaultOrder;
    const enabled = enabledColumns || config.defaultVisible;

    // Create ordered list of all available columns
    const orderedColumns = [];
    
    // First, add columns in current order
    order.forEach(key => {
      if (config.availableColumns.includes(key)) {
        orderedColumns.push({
          ...TableColumnManager.BASE_COLUMNS[key],
          key,
          enabled: enabled.includes(key)
        });
      }
    });

    // Then add any remaining available columns not in order
    config.availableColumns.forEach(key => {
      if (!order.includes(key)) {
        orderedColumns.push({
          ...TableColumnManager.BASE_COLUMNS[key],
          key,
          enabled: enabled.includes(key)
        });
      }
    });

    return orderedColumns;
  }

  /**
   * Create column preferences object from configuration arrays
   * @param {Array} orderedColumns - Array of column objects with enabled state
   * @returns {Object} Preferences object with visibleColumns and columnOrder
   */
  static createPreferencesFromConfiguration(orderedColumns) {
    const columnOrder = orderedColumns.map(col => col.key);
    const visibleColumns = orderedColumns
      .filter(col => col.enabled)
      .map(col => col.key);

    return {
      columnOrder,
      visibleColumns
    };
  }
}

// Export constants for external use
export const TABLE_TYPES = TableColumnManager.TABLE_TYPES;

// Export main class
export default TableColumnManager;