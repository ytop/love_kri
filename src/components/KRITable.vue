<template>
  <div class="kri-table">
    <!-- Table header with config -->
    <div class="table-header">
      <span class="table-title">KRI Items</span>
      <div class="header-actions">
        <el-tooltip content="Click any row to view detailed information" placement="top">
          <i class="el-icon-info table-info-icon"></i>
        </el-tooltip>
        <table-column-config 
          :table-type="tableType"
          @preferences-changed="handlePreferencesChanged"
        />
      </div>
    </div>

    <el-table
      ref="table"
      :data="displayTableData"
      v-loading="loading"
      style="width: 100%"
      fit
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
      :row-class-name="getRowClassName"
      :empty-text="emptyTableText"
    >
      <!-- Dynamic column rendering -->
      <template v-for="column in visibleColumns">
        <!-- Selection column -->
        <el-table-column
          v-if="column.key === 'selection'"
          :key="column.key"
          type="selection"
          :width="column.width"
          :selectable="isSelectable"
        />
        
        <!-- KRI Name column with special handling -->
        <el-table-column
          v-else-if="column.key === 'name'"
          :key="column.key"
          prop="name"
          :label="column.label"
          :min-width="column.minWidth"
          :width="column.width"
          :fixed="column.fixed"
          sortable
          show-overflow-tooltip
        >
          <template slot-scope="scope">
            <div class="kri-name-container">
              <!-- Expand/Collapse button for calculated KRIs -->
              <el-button
                v-if="isCalculatedKRI(scope.row) && !scope.row.isAtomicRow"
                type="text"
                @click.stop="toggleRowExpansion(scope.row)"
                class="expand-button"
                :icon="isRowExpanded(scope.row) ? 'el-icon-caret-bottom' : 'el-icon-caret-right'"
              >
              </el-button>
              
              <!-- KRI Name button -->
              <el-button
                v-if="!scope.row.isAtomicRow"
                type="text"
                @click="handleKRIClick(scope.row.id, scope.row.reportingDate)"
                class="kri-name-link"
                :class="{ 'with-expand-button': isCalculatedKRI(scope.row) }"
              >
                {{ scope.row.name }}
              </el-button>
              
              <!-- Atomic element name for sub-rows -->
              <div v-if="scope.row.isAtomicRow" class="atomic-name-display">
                <i class="el-icon-right atomic-indent"></i>
                <span class="atomic-element-name">{{ scope.row.name }}</span>
                <el-tag size="mini" type="info" class="atomic-tag">Atomic</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <!-- Status column with special handling -->
        <el-table-column
          v-else-if="column.key === 'collectionStatus'"
          :key="column.key"
          prop="collectionStatus"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          sortable
        >
          <template slot-scope="scope">
            <el-tag
              :type="getStatusTagType(scope.row.collectionStatus)"
              size="small"
              class="status-tag"
            >
              {{ scope.row.collectionStatus }}
            </el-tag>
          </template>
        </el-table-column>
        
        <!-- Breach type column with special handling -->
        <el-table-column
          v-else-if="column.key === 'breachType'"
          :key="column.key"
          prop="breachType"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          sortable
        >
          <template slot-scope="scope">
            <el-tooltip :content="getBreachDescription(scope.row.breachType)" placement="top">
              <el-tag
                :type="getBreachTagType(scope.row.breachType)"
                size="small"
                class="status-tag"
              >
                {{ getBreachDisplayText(scope.row.breachType) }}
              </el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        
        <!-- KRI Status column with special handling -->
        <el-table-column
          v-else-if="column.key === 'kriStatus'"
          :key="column.key"
          prop="kriStatus"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          sortable
        >
          <template slot-scope="scope">
            <el-tag
              :type="getStatusTagType(scope.row.kriStatus)"
              size="small"
              class="status-tag"
            >
              {{ getKRIStatusLabel(scope.row.kriStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <!-- Created At column with date formatting -->
        <el-table-column
          v-else-if="column.key === 'createdAt'"
          :key="column.key"
          prop="createdAt"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          sortable
        >
          <template slot-scope="scope">
            {{ formatDateDisplay(scope.row.createdAt) }}
          </template>
        </el-table-column>
        
        <!-- Is Calculated KRI column with icon display -->
        <el-table-column
          v-else-if="column.key === 'isCalculatedKri'"
          :key="column.key"
          prop="isCalculatedKri"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          sortable
        >
          <template slot-scope="scope">
            <div class="calculated-kri-indicator">
              <i 
                v-if="scope.row.isCalculatedKri" 
                class="el-icon-s-operation calculated-icon"
                title="Calculated KRI"
              ></i>
              <span v-else class="manual-indicator">Manual</span>
            </div>
          </template>
        </el-table-column>
        
        <!-- Source column with tag display -->
        <el-table-column
          v-else-if="column.key === 'source'"
          :key="column.key"
          prop="source"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          sortable
        >
          <template slot-scope="scope">
            <el-tag 
              v-if="scope.row.source" 
              :type="getSourceTagType(scope.row.source)"
              size="mini"
            >
              {{ getSourceDisplayText(scope.row.source) }}
            </el-tag>
            <span v-else class="no-source">-</span>
          </template>
        </el-table-column>
        
        <!-- KRI Value column with color coding based on breach type ---->
        <el-table-column
          v-else-if="column.key === 'kriValue'"
          :key="column.key"
          prop="kriValue"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          :sortable="column?.sortable ?? false"
          :sort-method="getSortMethod(column?.sortType ?? 'numeric')"
          show-overflow-tooltip
        >
          <template slot-scope="scope">
            <span 
              :class="getKRIValueColorClass(scope.row.breachType)" 
              class="kri-value-display"
            >
              {{ scope.row.kriValue || 'N/A' }}
            </span>
          </template>
        </el-table-column>
        
        <!-- Warning Bar column with inline risk level visualization -->
        <el-table-column
          v-else-if="column.key === 'warningBar'"
          :key="column.key"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
        >
          <template slot-scope="scope">
            <div class="warning-bar-container">
              <el-tooltip 
                :content="getWarningBarData(scope.row).tooltip" 
                placement="top"
                :open-delay="300"
              >
                <div class="warning-bar-wrapper">
                  <div class="warning-bar-background">
                    <div 
                      class="warning-bar-fill"
                      :class="`warning-bar-${getWarningBarData(scope.row).color}`"
                      :style="{ width: Math.min(100, getWarningBarData(scope.row).percentage) + '%' }"
                    ></div>
                  </div>
                  <i 
                    v-if="getWarningBarData(scope.row).showIcon"
                    class="el-icon-warning warning-icon"
                    :class="`warning-icon-${getWarningBarData(scope.row).color}`"
                  ></i>
                </div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        
        <!-- Actions column for permission management -->
        <el-table-column
          v-else-if="column.key === 'actions' && showPermissionActions"
          :key="column.key"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
        >
          <template slot-scope="scope">
            <el-button 
              size="mini" 
              type="primary" 
              icon="el-icon-edit"
              @click="handlePermissionEdit(scope.row)"
            >
              Edit Permissions
            </el-button>
          </template>
        </el-table-column>
        
        <!-- Standard columns -->
        <el-table-column
          v-else
          :key="column.uniqueKey"
          :prop="column.key"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          :sortable="column?.sortable ?? false"
          :sort-method="getSortMethod(column?.sortType ?? 'string')"
          show-overflow-tooltip
        />
      </template>
    </el-table>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import StatusManager from '@/utils/types';
import { 
  getBreachTagType, 
  getBreachDisplayText, 
  getBreachDescription, 
  calculateAtomicBreach,
  calculateWarningBarData,
  getKRIStatusLabel,
  sortNumeric,
  loadTablePreferencesFromStorage,
  formatDateFromInt
} from '@/utils/helpers';
import expandableTableMixin from '@/mixins/expandableTableMixin';
import TableColumnConfig from '@/components/TableColumnConfig.vue';
import TableColumnManager, { TABLE_TYPES } from '@/utils/tableColumnConfig';

export default {
  name: 'KRITable',
  components: {
    TableColumnConfig
  },
  mixins: [expandableTableMixin],
  props: {
    data: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    showPermissionActions: {
      type: Boolean,
      default: false
    },
    tableType: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      defaultTableType: TABLE_TYPES.KRI_TABLE
    };
  },
  computed: {
    ...mapGetters('kri', ['getVisibleColumnsForTable', 'getColumnOrderForTable', 'isAuthenticated']),

    currentTableType() {
      return this.tableType || this.defaultTableType;
    },

    visibleColumns() {
      const visibleColumnKeys = this.getVisibleColumnsForTable(this.currentTableType);
      const columnOrder = this.getColumnOrderForTable(this.currentTableType);
      const columns = TableColumnManager.getVisibleColumns(this.currentTableType, visibleColumnKeys, columnOrder);
      
      // Add position-aware keys to force Vue re-rendering when order changes
      return columns.map((column, index) => ({
        ...column,
        uniqueKey: `${column.key}-${index}`
      }));
    },

    displayTableData() {
      return this.expandedTableData.map(row => {
        if (row.isAtomicRow) {
          // Calculate breach status for atomic rows
          const parentKRI = this.data.find(kri => 
            (kri.kriId || kri.id) === row.kriId && kri.reportingDate === row.reportingDate
          );
          return {
            ...row,
            breachType: parentKRI ? calculateAtomicBreach(row, parentKRI) : 'No Breach',
            collectionStatus: getKRIStatusLabel(row.collectionStatus)
          };
        } else {
          // Transform main KRI rows
          return {
            ...row,
            collectionStatus: getKRIStatusLabel(row.collectionStatus)
          };
        }
      });
    },

    emptyTableText() {
      if (!this.isAuthenticated) {
        return 'Please login to view KRI data';
      }
      return 'No data available';
    }
  },
  mounted() {
    // Load column preferences from localStorage on component initialization
    this.loadColumnPreferencesFromStorage();
  },
  methods: {
    ...mapActions('kri', ['updateTableColumnPreferences']),
    // Event handlers
    handleRowClick(row) {
      if (!row.isAtomicRow) {
        this.$emit('row-click', row);
      }
    },
    
    handleKRIClick(kriId, reportingDate) {
      this.$emit('row-click', { kriId, reportingDate });
    },
    
    handlePermissionEdit(row) {
      this.$emit('permission-edit', row);
    },
    
    // UI helper methods using extracted utilities
    getStatusTagType(status) {
      return StatusManager.getStatusTagType(status);
    },
    
    getBreachTagType(breachType) {
      return getBreachTagType(breachType);
    },
    
    getBreachDisplayText(breachType) {
      return getBreachDisplayText(breachType);
    },
    
    getBreachDescription(breachType) {
      return getBreachDescription(breachType);
    },
    
    getKRIStatusLabel(status) {
      return getKRIStatusLabel(status);
    },
    getSortMethod(dataType) {
      if (dataType === 'numeric') {
        return sortNumeric;
      } else if (dataType === 'string') {
        return (a,b) => {return a.localeCompare(b);};
      }
      throw new Error(`Invalid data type: ${dataType}`);
    },

    handlePreferencesChanged() {
      // Force reactivity update when preferences change
      this.$forceUpdate();
      // Also trigger a nextTick to ensure DOM updates
      this.$nextTick(() => {
        // Ensure table layout recalculates after column changes
        if (this.$refs.table) {
          this.$refs.table.doLayout();
        }
      });
    },

    loadColumnPreferencesFromStorage() {
      const stored = loadTablePreferencesFromStorage(this.currentTableType);
      if (stored && (stored.visibleColumns || stored.columnOrder)) {
        // Update Vuex store with loaded preferences
        this.updateTableColumnPreferences({
          tableType: this.currentTableType,
          preferences: stored
        });
      }
    },

    // New formatting methods for additional columns
    formatDateDisplay(dateValue) {
      if (!dateValue) return 'N/A';
      
      try {
        // Handle different date formats
        if (typeof dateValue === 'number') {
          return formatDateFromInt(dateValue);
        } else if (typeof dateValue === 'string') {
          const date = new Date(dateValue);
          return date.toLocaleDateString();
        }
        return dateValue;
      } catch (error) {
        console.warn('Error formatting date:', error);
        return 'Invalid Date';
      }
    },

    getSourceTagType(source) {
      switch (source?.toLowerCase()) {
      case 'autoparse':
        return 'success';
      case 'system':
        return 'info';
      case 'manual':
        return 'warning';
      default:
        return '';
      }
    },

    getSourceDisplayText(source) {
      if (!source) return '-';
      
      switch (source.toLowerCase()) {
      case 'autoparse':
        return 'Auto Parse';
      case 'system':
        return 'System';
      case 'manual':
        return 'Manual';
      default:
        return source;
      }
    },

    getKRIValueColorClass(breachType) {
      const tagType = this.getBreachTagType(breachType);
      return `kri-value-${tagType}`;
    },

    // Warning bar data calculation method
    getWarningBarData(row) {
      if (row.isAtomicRow) {
        // For atomic rows, use parent KRI thresholds
        const parentKRI = this.data.find(kri => 
          (kri.kriId || kri.id) === row.kriId && kri.reportingDate === row.reportingDate
        );
        if (parentKRI) {
          return calculateWarningBarData(
            row.atomicValue,
            parentKRI.warningLineValue,
            parentKRI.limitValue,
            parentKRI.negativeWarning,
            parentKRI.negativeLimit
          );
        }
      } else {
        // For main KRI rows
        return calculateWarningBarData(
          row.kriValue,
          row.warningLineValue,
          row.limitValue,
          row.negativeWarning,
          row.negativeLimit
        );
      }
      
      // Fallback for rows without valid data
      return {
        percentage: 0,
        color: 'safe',
        severity: 'safe',
        showIcon: false,
        tooltip: 'No threshold data available'
      };
    }
  }
};
</script>

<style scoped>
/* Table header styling */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 0;
}

.table-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.table-info-icon {
  color: var(--text-secondary);
  cursor: help;
}

.table-info-icon:hover {
  color: var(--color-primary);
}

/* Minimal table overrides - let Element UI handle most styling */
.kri-table :deep(.el-table th) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: var(--font-weight-semibold);
}

.kri-table :deep(.el-table td) {
  padding: var(--spacing-sm) 0;
}

.kri-name-link {
  color: #3b82f6;
  font-weight: 500;
  padding: 0;
}

.kri-name-link:hover {
  color: #1d4ed8;
}

/* KRI Name container for expand functionality */
.kri-name-container {
  display: flex;
  align-items: center;
  gap: 4px;
}

.expand-button {
  padding: 0 var(--spacing-xs) !important;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  min-width: 20px;
}

.expand-button:hover {
  color: var(--color-primary);
}

.kri-name-link.with-expand-button {
  margin-left: 0;
}

/* Calculated KRI row styling */
.kri-table :deep(.calculated-kri-row) {
  background-color: #fefefe;
}

.kri-table :deep(.calculated-kri-row.expanded) {
  background-color: #f0f9ff;
  border-bottom: 2px solid #bfdbfe;
}

/* Atomic sub-row styling */
.kri-table :deep(.atomic-sub-row) {
  background-color: #fafbfc !important;
  border-left: 3px solid #e2e8f0 !important;
}

.kri-table :deep(.atomic-sub-row:hover) {
  background-color: #f1f5f9 !important;
}

.kri-table :deep(.atomic-sub-row td) {
  padding: var(--spacing-sm) var(--spacing-md) !important;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-light) !important;
}

/* Atomic name display styling */
.atomic-name-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-left: var(--spacing-md);
}

.atomic-indent {
  color: #cbd5e0;
  font-size: 10px;
}

.atomic-element-name {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
}

.atomic-tag {
  font-size: 10px;
  height: 18px;
  line-height: 16px;
}

/* New column specific styling */
.calculated-kri-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.calculated-icon {
  color: #409eff;
  font-size: 16px;
}

.manual-indicator {
  font-size: 12px;
  color: #909399;
  font-style: italic;
}

.no-source {
  color: #c0c4cc;
  font-style: italic;
}

/* KRI Value color coding based on breach type (using App.vue color scheme) */
.kri-value-success {
  color: #15803d;
  font-weight: 500;
}

.kri-value-warning {
  color: #92400e;
  font-weight: 500;
}

.kri-value-danger {
  color: #dc2626;
  font-weight: 500;
}

.kri-value-display {
  display: inline-block;
}

/* Warning Bar Column Styling */
.warning-bar-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.warning-bar-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
}

.warning-bar-background {
  position: relative;
  width: 100px;
  height: 6px;
  background-color: #f0f2f5;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.warning-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background-color 0.3s ease;
  position: relative;
}

/* Warning bar color states */
.warning-bar-safe {
  background-color: #52c41a;
  background: linear-gradient(90deg, #52c41a 0%, #73d13d 100%);
}

.warning-bar-caution {
  background-color: #faad14;
  background: linear-gradient(90deg, #faad14 0%, #ffc53d 100%);
}

.warning-bar-breach {
  background-color: #ff4d4f;
  background: linear-gradient(90deg, #ff4d4f 0%, #ff7875 100%);
}

/* Warning icons */
.warning-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.warning-icon-safe {
  color: #52c41a;
  display: none; /* Only show for caution/breach */
}

.warning-icon-caution {
  color: #faad14;
  animation: pulse-warning 2s infinite;
}

.warning-icon-breach {
  color: #ff4d4f;
  animation: pulse-danger 1.5s infinite;
}

/* Pulse animations for warning states */
@keyframes pulse-warning {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

@keyframes pulse-danger {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.15); }
}

/* Hover effects */
.warning-bar-container:hover .warning-bar-background {
  border-color: #409eff;
  box-shadow: 0 0 4px rgba(64, 158, 255, 0.3);
}

.warning-bar-container:hover .warning-bar-fill {
  filter: brightness(1.1);
}

/* Responsive adjustments for smaller screens */
@media (max-width: 1200px) {
  .warning-bar-background {
    width: 80px;
  }
}

@media (max-width: 768px) {
  .warning-bar-background {
    width: 60px;
  }
  
  .warning-bar-wrapper {
    gap: 4px;
  }
  
  .warning-icon {
    font-size: 12px;
  }
}
</style>