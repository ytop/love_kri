<template>
  <div class="kri-table">
    <el-table
      ref="table"
      :data="expandedTableData"
      v-loading="loading"
      style="width: 100%"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
      :row-class-name="getRowClassName"
    >
      <el-table-column
        type="selection"
        width="55"
        :selectable="isSelectable"
      />
      
      <el-table-column
        prop="id"
        label="KRI ID"
        width="80"
        sortable
      />
      
      <el-table-column
        prop="name"
        label="KRI Name"
        min-width="200"
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
      
      <el-table-column
        prop="owner"
        label="Owner"
        width="80"
        sortable
        show-overflow-tooltip
      />
      
      <el-table-column
        prop="dataProvider"
        label="Data Provider"
        width="120"
        sortable
        show-overflow-tooltip
      />
      
      <el-table-column
        prop="collectionStatus"
        label="Status"
        width="120"
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
      
      <el-table-column
        prop="l1RiskType"
        label="L1 Risk Type"
        width="150"
        sortable
        show-overflow-tooltip
      />
      
      <el-table-column
        prop="l2RiskType"
        label="L2 Risk Type"
        width="150"
        sortable
        show-overflow-tooltip
      />
      
      <el-table-column
        prop="breachType"
        label="Breach Type"
        width="120"
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
      
      <el-table-column
        prop="kriValue"
        label="KRI Value"
        width="120"
        sortable
      />
      
      <el-table-column
        prop="reportingCycle"
        label="Reporting Cycle"
        width="130"
        sortable
      />
    </el-table>
  </div>
</template>

<script>
import { formatDateFromInt, getStatusTagTypeFromLabel, getBreachTagType, getBreachDisplayText, getBreachDescription } from '@/utils/helpers';

export default {
  name: 'KRITable',
  props: {
    data: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    selectedKris: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      expandedRows: {}, // Track expansion state for calculated KRIs
      atomicDataCache: {} // Cache atomic data to avoid repeated API calls
    };
  },
  computed: {
    // Create expanded table data with atomic sub-rows
    expandedTableData() {
      const result = [];
      
      this.data.forEach(row => {
        // Add main KRI row
        result.push(row);
        
        // Add atomic sub-rows if this KRI is expanded
        if (this.isCalculatedKRI(row) && this.isRowExpanded(row)) {
          const atomicData = this.atomicDataCache[this.getRowKey(row)];
          if (atomicData && atomicData.length > 0) {
            atomicData.forEach(atomicItem => {
              result.push({
                ...atomicItem,
                isAtomicRow: true,
                parentKriId: row.id,
                parentReportingDate: row.reportingDate,
                // Map atomic properties to table column structure
                id: `${row.id}_atomic_${atomicItem.atomic_id}`,
                name: atomicItem.atomic_metadata || `Element ${atomicItem.atomic_id}`,
                kriValue: atomicItem.atomic_value,
                collectionStatus: this.mapAtomicStatus(atomicItem.atomic_status),
                owner: row.owner,
                dataProvider: row.dataProvider,
                reportingDate: row.reportingDate,
                reportingCycle: row.reportingCycle,
                l1RiskType: '',
                l2RiskType: '',
                breachType: '',
                rawData: {
                  ...atomicItem,
                  kri_status: atomicItem.atomic_status
                }
              });
            });
          }
        }
      });
      
      return result;
    }
  },
  methods: {
    handleRowClick(row, _column, _event) {
      // Don't handle row click for atomic sub-rows or when clicking expand button
      if (row.isAtomicRow || (_event && _event.target && _event.target.closest('.expand-button'))) {
        return;
      }
      
      // Emit event to parent component with KRI ID and reporting date
      this.$emit('row-click', row.id, this.formatReportingDate(row.reportingDate));
    },
    handleSelectionChange(selection) {
      // Filter out atomic sub-rows from selection
      const mainKriSelection = selection.filter(row => !row.isAtomicRow);
      
      this.$emit('select-all', mainKriSelection.length === this.data.length);
      mainKriSelection.forEach(row => {
        this.$emit('row-select', row.id, row.reportingDate, true);
      });
    },
    
    handleKRIClick(kriId, reportingDate) {
      this.$emit('kri-click', kriId, reportingDate);
    },
    
    isSelectable(row) {
      // Only main KRI rows should be selectable, not atomic sub-rows
      return !row.isAtomicRow;
    },
    
    getStatusTagType(status) {
      return getStatusTagTypeFromLabel(status);
    },
    
    getBreachTagType,
    getBreachDisplayText,
    getBreachDescription,
    
    formatReportingDate(dateInt) {
      return formatDateFromInt(dateInt);
    },
    
    // Calculated KRI detection
    isCalculatedKRI(row) {
      // Check if this KRI has the calculated flag
      return row.rawData?.is_calculated_kri === true || 
             row.rawData?.is_calculated_kri === 1 ||
             row.isCalculated === true;
    },
    
    // Expansion state management
    getRowKey(row) {
      return `${row.id}_${row.reportingDate}`;
    },
    
    isRowExpanded(row) {
      return this.expandedRows[this.getRowKey(row)] || false;
    },
    
    async toggleRowExpansion(row) {
      const key = this.getRowKey(row);
      const isExpanded = this.isRowExpanded(row);
      
      if (isExpanded) {
        // Collapse the row
        this.$set(this.expandedRows, key, false);
      } else {
        // Expand the row - fetch atomic data if not cached
        if (!this.atomicDataCache[key]) {
          await this.loadAtomicData(row);
        }
        this.$set(this.expandedRows, key, true);
      }
    },
    
    async loadAtomicData(row) {
      const key = this.getRowKey(row);
      
      try {
        // Use the store to fetch atomic data
        const result = await this.$store.dispatch('kri/fetchAtomicData', {
          kriId: row.id,
          reportingDate: row.reportingDate
        });
        
        if (result.success) {
          this.$set(this.atomicDataCache, key, result.data || []);
        } else {
          console.error('Failed to load atomic data:', result.error);
          this.$set(this.atomicDataCache, key, []);
        }
      } catch (error) {
        console.error('Error loading atomic data:', error);
        this.$set(this.atomicDataCache, key, []);
      }
    },
    
    // Status mapping for atomic elements
    mapAtomicStatus(status) {
      const statusMap = {
        10: 'Pending Input',
        20: 'Under Rework', 
        30: 'Saved',
        40: 'Submitted to Data Provider Approver',
        50: 'Submitted to KRI Owner Approver',
        60: 'Finalized'
      };
      return statusMap[status] || 'Unknown';
    },
    
    // Row class name for styling
    getRowClassName({ row }) {
      const classes = [];
      
      if (row.isAtomicRow) {
        classes.push('atomic-sub-row');
      } else if (this.isCalculatedKRI(row)) {
        classes.push('calculated-kri-row');
        if (this.isRowExpanded(row)) {
          classes.push('expanded');
        }
      }
      
      return classes.join(' ');
    }
  }
};
</script>

<style scoped>
.kri-table >>> .el-table th {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
}

.kri-table >>> .el-table td {
  padding: 12px 0;
}

/* Fix caret-wrapper alignment to prevent line breaks */
.kri-table >>> .el-table th .cell {
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kri-table >>> .el-table th .caret-wrapper {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-left: 5px;
  vertical-align: middle;
}

.kri-table >>> .el-table th .sort-caret {
  display: block;
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
</style>