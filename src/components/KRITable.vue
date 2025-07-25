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
    }
  },
  data() {
    return {
      tableType: TABLE_TYPES.KRI_TABLE
    };
  },
  computed: {
    ...mapGetters('kri', ['getVisibleColumnsForTable', 'getColumnOrderForTable']),

    visibleColumns() {
      const visibleColumnKeys = this.getVisibleColumnsForTable(this.tableType);
      const columnOrder = this.getColumnOrderForTable(this.tableType);
      const columns = TableColumnManager.getVisibleColumns(this.tableType, visibleColumnKeys, columnOrder);
      
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
      const stored = loadTablePreferencesFromStorage(this.tableType);
      if (stored && (stored.visibleColumns || stored.columnOrder)) {
        // Update Vuex store with loaded preferences
        this.updateTableColumnPreferences({
          tableType: this.tableType,
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
  padding: 16px 20px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-info-icon {
  color: #909399;
  cursor: help;
}

.table-info-icon:hover {
  color: #409EFF;
}

/* Minimal table overrides - let Element UI handle most styling */
.kri-table >>> .el-table th {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
}

.kri-table >>> .el-table td {
  padding: 8px 0;
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
  padding: 0 4px !important;
  font-size: 14px;
  color: #64748b;
  min-width: 20px;
}

.expand-button:hover {
  color: #3b82f6;
}

.kri-name-link.with-expand-button {
  margin-left: 0;
}

/* Calculated KRI row styling */
.kri-table >>> .calculated-kri-row {
  background-color: #fefefe;
}

.kri-table >>> .calculated-kri-row.expanded {
  background-color: #f0f9ff;
  border-bottom: 2px solid #bfdbfe;
}

/* Atomic sub-row styling */
.kri-table >>> .atomic-sub-row {
  background-color: #fafbfc !important;
  border-left: 3px solid #e2e8f0 !important;
}

.kri-table >>> .atomic-sub-row:hover {
  background-color: #f1f5f9 !important;
}

.kri-table >>> .atomic-sub-row td {
  padding: 8px 12px !important;
  font-size: 12px;
  color: #64748b;
  border-bottom: 1px solid #f1f5f9 !important;
}

/* Atomic name display styling */
.atomic-name-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
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
</style>