<template>
  <div class="kri-table-inline-edit">
    <!-- Table header with config -->
    <div class="table-header">
      <span class="table-title">KRI Items - Inline Editing</span>
      <div class="header-actions">
        <el-tooltip content="Click KRI values to edit, use action buttons to save/submit/approve" placement="top">
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
          :selectable="isRowSelectable"
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
        
        <!-- KRI Value column with inline editing -->
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
            <div class="kri-value-container">
              <!-- Inline editing for eligible manual KRIs (not calculated) -->
              <template v-if="canEditKRIValue(scope.row) && !scope.row.isAtomicRow">
                <div v-if="editingKRI === getRowKey(scope.row)" class="inline-edit-container" @click.stop @mousedown.stop @mouseup.stop @focus.stop>
                  <el-input
                    v-model="editingValue"
                    type="number"
                    step="0.01"
                    size="small"
                    @keyup.enter="saveKRIValue(scope.row)"
                    @keyup.esc="cancelEdit"
                    @click.stop
                    @mousedown.stop
                    @focus.stop
                    style="width: 120px"
                    ref="editInput">
                  </el-input>
                  <div class="inline-edit-actions" @click.stop @mousedown.stop>
                    <el-button
                      type="success"
                      icon="el-icon-check"
                      size="mini"
                      @click.stop="saveKRIValue(scope.row)"
                      :loading="savingKRI === getRowKey(scope.row)"
                      circle>
                    </el-button>
                    <el-button
                      type="info"
                      icon="el-icon-close"
                      size="mini"
                      @click.stop="cancelEdit"
                      circle>
                    </el-button>
                  </div>
                </div>
                <div v-else class="editable-value" @click.stop="startEditKRI(scope.row)">
                  <span 
                    class="value-display"
                    :class="getKRIValueColorClass(scope.row.breachType)"
                  >
                    {{ scope.row.kriValue }}
                  </span>
                  <i class="el-icon-edit-outline edit-icon"></i>
                </div>
              </template>
              <!-- Inline editing for atomic values -->
              <template v-else-if="canEditAtomicValue(scope.row) && scope.row.isAtomicRow">
                <div v-if="editingKRI === getRowKey(scope.row)" class="inline-edit-container" @click.stop @mousedown.stop @mouseup.stop @focus.stop>
                  <el-input
                    v-model="editingValue"
                    type="number"
                    step="0.01"
                    size="small"
                    @keyup.enter="saveAtomicValue(scope.row)"
                    @keyup.esc="cancelEdit"
                    @click.stop
                    @mousedown.stop
                    @focus.stop
                    style="width: 120px"
                    ref="editInput">
                  </el-input>
                  <div class="inline-edit-actions" @click.stop @mousedown.stop>
                    <el-button
                      type="success"
                      icon="el-icon-check"
                      size="mini"
                      @click.stop="saveAtomicValue(scope.row)"
                      :loading="savingKRI === getRowKey(scope.row)"
                      circle>
                    </el-button>
                    <el-button
                      type="info"
                      icon="el-icon-close"
                      size="mini"
                      @click.stop="cancelEdit"
                      circle>
                    </el-button>
                  </div>
                </div>
                <div v-else class="editable-value atomic-editable" @click.stop="startEditAtomic(scope.row)">
                  <span 
                    class="value-display"
                    :class="getKRIValueColorClass(scope.row.breachType)"
                  >
                    {{ scope.row.kriValue }}
                  </span>
                  <i class="el-icon-edit-outline edit-icon"></i>
                </div>
              </template>
              <!-- Read-only value for calculated KRIs and non-editable items -->
              <template v-else>
                <div class="readonly-value-container">
                  <span 
                    :class="[
                      getKRIValueColorClass(scope.row.breachType),
                      'kri-value-display',
                      'readonly-value',
                      { 'calculated-kri-value': isCalculatedKRI(scope.row) && !scope.row.isAtomicRow }
                    ]"
                  >
                    {{ scope.row.kriValue || 'N/A' }}
                  </span>
                  <el-tooltip 
                    v-if="isCalculatedKRI(scope.row) && !scope.row.isAtomicRow" 
                    content="This value is automatically calculated from atomic elements" 
                    placement="top"
                  >
                    <i class="el-icon-s-operation calculated-indicator"></i>
                  </el-tooltip>
                </div>
              </template>
            </div>
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

        <!-- Actions column with inline workflow buttons -->
        <el-table-column
          v-else-if="column.key === 'actions'"
          :key="column.key"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
        >
          <template slot-scope="scope">
            <!-- Actions for main KRI rows -->
            <div class="row-actions" v-if="!scope.row.isAtomicRow">
              <!-- Case 1: Status 10, 20, 30 - Input/Edit actions for manual KRIs only -->
              <template v-if="canEditKRIValue(scope.row)">
                <el-button
                  v-if="[10, 20, 30].includes(scope.row.kriStatus)"
                  type="primary"
                  icon="el-icon-document"
                  size="mini"
                  @click.stop="handleSaveKRI(scope.row)"
                  :loading="savingKRI === getRowKey(scope.row)"
                  :disabled="!hasKRIValue(scope.row)">
                  Save
                </el-button>
                <el-button
                  v-if="[10, 20, 30].includes(scope.row.kriStatus)"
                  type="success"
                  icon="el-icon-upload"
                  size="mini"
                  @click.stop="handleSubmitKRI(scope.row)"
                  :loading="savingKRI === getRowKey(scope.row)"
                  :disabled="!hasKRIValue(scope.row)">
                  Submit
                </el-button>
              </template>
              
              <!-- Case 3: Status 40, 50 - Approval actions -->
              <template v-else-if="canApproveKRI(scope.row)">
                <el-button
                  type="success"
                  icon="el-icon-check"
                  size="mini"
                  @click.stop="handleApproveKRI(scope.row)"
                  :loading="savingKRI === getRowKey(scope.row)">
                  Approve
                </el-button>
                <el-button
                  type="danger"
                  icon="el-icon-close"
                  size="mini"
                  @click.stop="handleRejectKRI(scope.row)"
                  :loading="savingKRI === getRowKey(scope.row)">
                  Reject
                </el-button>
              </template>
              
              <!-- Calculated KRIs show read-only indicator -->
              <template v-else-if="isCalculatedKRI(scope.row)">
                <span class="calculated-actions-text">
                  <i class="el-icon-s-operation"></i>
                  Auto-calculated
                </span>
              </template>
              
              <!-- No actions available -->
              <span v-else class="no-actions-text">No actions available</span>
            </div>
            
            <!-- Actions for atomic rows -->
            <div class="row-actions" v-else-if="scope.row.isAtomicRow">
              <!-- Atomic editing actions -->
              <template v-if="canEditAtomicValue(scope.row)">
                <el-button
                  v-if="[10, 20, 30].includes(scope.row.atomicStatusNumeric || scope.row.atomicStatus || scope.row.atomic_status)"
                  type="primary"
                  icon="el-icon-document"
                  size="mini"
                  @click.stop="handleSaveAtomic(scope.row)"
                  :loading="savingKRI === getRowKey(scope.row)"
                  :disabled="!hasAtomicValue(scope.row)">
                  Save
                </el-button>
                <el-button
                  v-if="[10, 20, 30].includes(scope.row.atomicStatusNumeric || scope.row.atomicStatus || scope.row.atomic_status)"
                  type="success"
                  icon="el-icon-upload"
                  size="mini"
                  @click.stop="handleSubmitAtomic(scope.row)"
                  :loading="savingKRI === getRowKey(scope.row)"
                  :disabled="!hasAtomicValue(scope.row)">
                  Submit
                </el-button>
              </template>
              
              <!-- Atomic approval actions -->
              <template v-else-if="canApproveAtomic(scope.row)">
                <el-button
                  type="success"
                  icon="el-icon-check"
                  size="mini"
                  @click.stop="handleApproveAtomic(scope.row)"
                  :loading="savingKRI === getRowKey(scope.row)">
                  Approve
                </el-button>
                <el-button
                  type="danger"
                  icon="el-icon-close"
                  size="mini"
                  @click.stop="handleRejectAtomic(scope.row)"
                  :loading="savingKRI === getRowKey(scope.row)">
                  Reject
                </el-button>
              </template>
              
              <!-- No atomic actions -->
              <span v-else class="atomic-actions-text">No actions available</span>
            </div>
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
  formatDateFromInt,
  getUserDisplayName,
  isCalculatedKRI
} from '@/utils/helpers';
import expandableTableMixin from '@/mixins/expandableTableMixin';
import TableColumnConfig from '@/components/TableColumnConfig.vue';
import TableColumnManager, { TABLE_TYPES } from '@/utils/tableColumnConfig';
import { kriService } from '@/services/kriService';

export default {
  name: 'KRITableInlineEdit',
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
      tableType: TABLE_TYPES.KRI_TABLE,
      // Inline editing state
      editingKRI: null,
      editingValue: null,
      savingKRI: null
    };
  },
  computed: {
    ...mapGetters('kri', [
      'getVisibleColumnsForTable', 
      'getColumnOrderForTable', 
      'canPerform',
      'currentUser'
    ]),

    visibleColumns() {
      const visibleColumnKeys = this.getVisibleColumnsForTable(this.tableType);
      const columnOrder = this.getColumnOrderForTable(this.tableType);
      let columns = TableColumnManager.getVisibleColumns(this.tableType, visibleColumnKeys, columnOrder);
      
      // Dynamically adjust kriValue column width for better editing experience
      const kriValueIndex = columns.findIndex(col => col.key === 'kriValue');
      if (kriValueIndex !== -1) {
        columns[kriValueIndex] = {
          ...columns[kriValueIndex],
          minWidth: 240
        };
      }
      
      // Ensure actions column is always visible for inline editing
      const hasActions = columns.some(col => col.key === 'actions');
      if (!hasActions) {
        columns.push({
          key: 'actions',
          label: 'Actions',
          width: 240,
          minWidth: 240,
          fixed: 'right'
        });
      }
      
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
            // Preserve numeric status for logic, but also add display label
            atomicStatusNumeric: row.collectionStatus, // Original numeric status
            collectionStatus: getKRIStatusLabel(row.collectionStatus) // Display label
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

    handleSelectionChange(selection) {
      this.$emit('selection-change', selection);
    },
    
    // Permission checking methods
    canEditKRIValue(row) {
      // Prevent direct editing of calculated KRIs - they should be auto-computed from atomics
      if (isCalculatedKRI(row)) {
        return false;
      }
      return this.canPerform(row.kriId || row.id, null, 'edit') && 
             [10, 20, 30].includes(row.kriStatus);
    },
    
    canEditAtomicValue(row) {
      // Only atomic rows can be edited with atomic-level permissions
      if (!row.isAtomicRow) {
        return false;
      }
      const atomicId = row.atomicId || row.atomic_id;
      // Use the preserved numeric status for logic comparison
      const numericStatus = row.atomicStatusNumeric || row.atomicStatus || row.atomic_status;
      return this.canPerform(row.kriId, atomicId, 'edit') && 
             [10, 20, 30].includes(numericStatus);
    },
    
    canApproveKRI(row) {
      return this.canPerform(row.kriId || row.id, null, 'review') && 
             [40, 50].includes(row.kriStatus);
    },
    
    canApproveAtomic(row) {
      // Only atomic rows can be approved with atomic-level review permissions
      if (!row.isAtomicRow) {
        return false;
      }
      const atomicId = row.atomicId || row.atomic_id;
      // Use the preserved numeric status for logic comparison
      const numericStatus = row.atomicStatusNumeric || row.atomicStatus || row.atomic_status;
      return this.canPerform(row.kriId, atomicId, 'review') && 
             [40, 50].includes(numericStatus);
    },

    hasKRIValue(row) {
      return row.kriValue !== null && row.kriValue !== undefined && row.kriValue !== '';
    },
    
    hasAtomicValue(row) {
      const atomicValue = row.kriValue || row.atomicValue;
      return atomicValue !== null && atomicValue !== undefined && atomicValue !== '';
    },

    isRowSelectable(row) {
      // Only allow selection for rows that have available actions
      return !row.isAtomicRow && (this.canEditKRIValue(row) || this.canApproveKRI(row));
    },
    
    // Inline editing methods
    getRowKey(row) {
      if (row.isAtomicRow) {
        // For atomic rows, include atomicId to make each atomic element unique
        const atomicId = row.atomicId || row.atomic_id;
        return `${row.kriId}-${atomicId}-${row.reportingDate}`;
      }
      // For regular KRI rows, use existing format
      return `${row.kriId || row.id}-${row.reportingDate}`;
    },

    startEditKRI(row) {
      this.editingKRI = this.getRowKey(row);
      this.editingValue = row.kriValue || 0;
      this.$nextTick(() => {
        const input = this.$refs.editInput;
        if (input && input.focus) {
          input.focus();
        }
      });
    },
    
    startEditAtomic(row) {
      this.editingKRI = this.getRowKey(row);
      this.editingValue = row.kriValue || row.atomicValue || 0;
      this.$nextTick(() => {
        const input = this.$refs.editInput;
        if (input && input.focus) {
          input.focus();
        }
      });
    },

    cancelEdit() {
      this.editingKRI = null;
      this.editingValue = null;
    },

    async saveKRIValue(row) {
      if (this.savingKRI === this.getRowKey(row)) return;
      
      this.savingKRI = this.getRowKey(row);
      try {
        await kriService.updateKRI(
          row.kriId || row.id,
          row.reportingDate,
          { kri_value: this.editingValue.toString() },
          getUserDisplayName(this.currentUser),
          'inline_edit_value',
          `Updated KRI value to ${this.editingValue}`
        );
        
        this.cancelEdit();
        this.$message.success('KRI value updated successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error updating KRI value:', error);
        this.$message.error('Failed to update KRI value');
      } finally {
        this.savingKRI = null;
      }
    },
    
    async saveAtomicValue(row) {
      if (this.savingKRI === this.getRowKey(row)) return;
      
      this.savingKRI = this.getRowKey(row);
      try {
        await kriService.updateAtomicValue(
          row.kriId,
          row.reportingDate,
          row.atomicId || row.atomic_id,
          { atomic_value: this.editingValue.toString() },
          getUserDisplayName(this.currentUser),
          'inline_edit_atomic_value',
          `Updated atomic value to ${this.editingValue}`
        );
        
        this.cancelEdit();
        this.$message.success('Atomic value updated successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error updating atomic value:', error);
        this.$message.error('Failed to update atomic value');
      } finally {
        this.savingKRI = null;
      }
    },

    // Workflow action methods
    async handleSaveKRI(row) {
      if (this.savingKRI === this.getRowKey(row)) return;
      
      this.savingKRI = this.getRowKey(row);
      try {
        await kriService.updateKRI(
          row.kriId || row.id,
          row.reportingDate,
          { kri_status: 30 }, // Status 30: "Saved"
          getUserDisplayName(this.currentUser),
          'save_kri',
          'KRI saved'
        );
        
        this.$message.success('KRI saved successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error saving KRI:', error);
        this.$message.error('Failed to save KRI');
      } finally {
        this.savingKRI = null;
      }
    },

    async handleSubmitKRI(row) {
      if (this.savingKRI === this.getRowKey(row)) return;
      
      this.savingKRI = this.getRowKey(row);
      try {
        // Determine next status based on KRI owner/data provider logic
        const nextStatus = this.getNextSubmitStatus(row);
        
        await kriService.updateKRI(
          row.kriId || row.id,
          row.reportingDate,
          { kri_status: nextStatus },
          getUserDisplayName(this.currentUser),
          'submit_kri',
          `KRI submitted for ${nextStatus === 40 ? 'data provider' : 'KRI owner'} approval`
        );
        
        this.$message.success('KRI submitted successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error submitting KRI:', error);
        this.$message.error('Failed to submit KRI');
      } finally {
        this.savingKRI = null;
      }
    },

    async handleApproveKRI(row) {
      if (this.savingKRI === this.getRowKey(row)) return;
      
      this.savingKRI = this.getRowKey(row);
      try {
        // Status 40 -> 50, Status 50 -> 60
        const nextStatus = row.kriStatus === 40 ? 50 : 60;
        
        await kriService.updateKRI(
          row.kriId || row.id,
          row.reportingDate,
          { kri_status: nextStatus },
          getUserDisplayName(this.currentUser),
          'approve_kri',
          `KRI approved ${nextStatus === 60 ? 'and finalized' : 'by data provider'}`
        );
        
        this.$message.success('KRI approved successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error approving KRI:', error);
        this.$message.error('Failed to approve KRI');
      } finally {
        this.savingKRI = null;
      }
    },

    async handleRejectKRI(row) {
      if (this.savingKRI === this.getRowKey(row)) return;
      
      this.savingKRI = this.getRowKey(row);
      try {
        await kriService.updateKRI(
          row.kriId || row.id,
          row.reportingDate,
          { kri_status: 20 }, // Status 20: "Under Rework"
          getUserDisplayName(this.currentUser),
          'reject_kri',
          'KRI rejected and sent back for rework'
        );
        
        this.$message.success('KRI rejected successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error rejecting KRI:', error);
        this.$message.error('Failed to reject KRI');
      } finally {
        this.savingKRI = null;
      }
    },
    
    // Atomic workflow methods
    async handleSaveAtomic(row) {
      if (this.savingKRI === this.getRowKey(row)) return;
      
      this.savingKRI = this.getRowKey(row);
      try {
        await kriService.updateAtomicValue(
          row.kriId,
          row.reportingDate,
          row.atomicId || row.atomic_id,
          { atomic_status: 30 }, // Status 30: "Saved"
          getUserDisplayName(this.currentUser),
          'save_atomic',
          'Atomic value saved'
        );
        
        this.$message.success('Atomic value saved successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error saving atomic value:', error);
        this.$message.error('Failed to save atomic value');
      } finally {
        this.savingKRI = null;
      }
    },
    
    async handleSubmitAtomic(row) {
      if (this.savingKRI === this.getRowKey(row)) return;
      
      this.savingKRI = this.getRowKey(row);
      try {
        // Determine next status based on atomic workflow
        const nextStatus = this.getNextAtomicSubmitStatus(row);
        
        await kriService.updateAtomicValue(
          row.kriId,
          row.reportingDate,
          row.atomicId || row.atomic_id,
          { atomic_status: nextStatus },
          getUserDisplayName(this.currentUser),
          'submit_atomic',
          `Atomic value submitted for ${nextStatus === 40 ? 'data provider' : 'KRI owner'} approval`
        );
        
        this.$message.success('Atomic value submitted successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error submitting atomic value:', error);
        this.$message.error('Failed to submit atomic value');
      } finally {
        this.savingKRI = null;
      }
    },
    
    async handleApproveAtomic(row) {
      if (this.savingKRI === this.getRowKey(row)) return;
      
      this.savingKRI = this.getRowKey(row);
      try {
        // Status 40 -> 50, Status 50 -> 60
        const currentStatus = row.kriStatus || row.collectionStatus;
        const nextStatus = currentStatus === 40 ? 50 : 60;
        
        await kriService.updateAtomicValue(
          row.kriId,
          row.reportingDate,
          row.atomicId || row.atomic_id,
          { atomic_status: nextStatus },
          getUserDisplayName(this.currentUser),
          'approve_atomic',
          `Atomic value approved ${nextStatus === 60 ? 'and finalized' : 'by data provider'}`
        );
        
        this.$message.success('Atomic value approved successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error approving atomic value:', error);
        this.$message.error('Failed to approve atomic value');
      } finally {
        this.savingKRI = null;
      }
    },
    
    async handleRejectAtomic(row) {
      if (this.savingKRI === this.getRowKey(row)) return;
      
      this.savingKRI = this.getRowKey(row);
      try {
        await kriService.updateAtomicValue(
          row.kriId,
          row.reportingDate,
          row.atomicId || row.atomic_id,
          { atomic_status: 20 }, // Status 20: "Under Rework"
          getUserDisplayName(this.currentUser),
          'reject_atomic',
          'Atomic value rejected and sent back for rework'
        );
        
        this.$message.success('Atomic value rejected successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error rejecting atomic value:', error);
        this.$message.error('Failed to reject atomic value');
      } finally {
        this.savingKRI = null;
      }
    },

    // Utility methods
    getNextSubmitStatus(row) {
      // Case 1 logic: IF KRI_OWNER == DATA_PROVIDER -> 50, ELSE -> 40
      return (row.owner === row.dataProvider) ? 50 : 40;
    },
    
    getNextAtomicSubmitStatus(row) {
      // Same logic as KRI for atomic elements
      return (row.owner === row.dataProvider) ? 50 : 40;
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
    },
    
    // Helper method to check if a row is a calculated KRI
    isCalculatedKRI(row) {
      return isCalculatedKRI(row);
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
.kri-table-inline-edit :deep(.el-table th) {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
}

.kri-table-inline-edit :deep(.el-table td) {
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
.kri-table-inline-edit :deep(.calculated-kri-row) {
  background-color: #fefefe;
}

.kri-table-inline-edit :deep(.calculated-kri-row.expanded) {
  background-color: #f0f9ff;
  border-bottom: 2px solid #bfdbfe;
}

/* Atomic sub-row styling */
.kri-table-inline-edit :deep(.atomic-sub-row) {
  background-color: #fafbfc !important;
  border-left: 3px solid #e2e8f0 !important;
}

.kri-table-inline-edit :deep(.atomic-sub-row:hover) {
  background-color: #f1f5f9 !important;
}

.kri-table-inline-edit :deep(.atomic-sub-row td) {
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
  padding: 4px 8px;
}

.warning-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
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

/* Inline Editing Styles */
.kri-value-container {
  min-width: 120px;
}

.editable-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  min-height: 32px;
  border: 1px solid transparent;
  background-color: rgba(0, 0, 0, 0.02);
}

.editable-value:hover {
  background-color: #f0f9ff;
  border: 1px solid #409eff;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.1);
}

.value-display {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-icon {
  opacity: 0;
  transition: all 0.2s ease;
  color: #409eff;
  font-size: 14px;
  margin-left: 6px;
  flex-shrink: 0;
}

.editable-value:hover .edit-icon {
  opacity: 1;
  transform: scale(1.1);
}

.readonly-value {
  color: #606266;
  padding: 6px 10px;
  min-height: 32px;
  display: flex;
  align-items: center;
}

.inline-edit-container {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
}

.inline-edit-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* Improve input styling within inline edit */
.inline-edit-container .el-input-number {
  flex: 1;
  min-width: 80px;
}

.inline-edit-container .el-input-number .el-input__inner {
  padding: 6px 8px;
  height: 32px;
  font-size: 13px;
}

/* Row Actions Styling */
.row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  padding: 6px;
  width: 100%;
  min-height: 44px;
}

.row-actions .el-button {
  padding: 6px 10px;
  font-size: 11px;
  border-radius: 4px;
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
  margin: 0;
  line-height: 1.2;
  min-height: 28px;
}

.row-actions .el-button + .el-button {
  margin-left: 0;
}

/* Ensure buttons wrap properly in narrow spaces */
@media (max-width: 1200px) {
  .row-actions {
    flex-direction: column;
    gap: 4px;
    padding: 4px;
  }
  
  .row-actions .el-button {
    width: 100%;
    max-width: 100px;
    padding: 4px 6px;
    font-size: 10px;
  }
}

.no-actions-text {
  color: #909399;
  font-size: 11px;
  font-style: italic;
}

.atomic-actions-text {
  color: #c0c4cc;
  font-size: 11px;
  font-style: italic;
}

/* Mobile optimizations for inline editing */
@media (max-width: 768px) {
  .editable-value {
    padding: 8px 12px;
    min-height: 36px;
  }
  
  .edit-icon {
    font-size: 16px;
    opacity: 0.6; /* Make more visible on touch devices */
  }
  
  .inline-edit-container {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  
  .inline-edit-actions {
    justify-content: center;
  }
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