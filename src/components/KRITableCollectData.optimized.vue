<template>
  <div class="kri-table">
    <!-- Action Toolbar -->
    <div class="table-toolbar">
      <div class="toolbar-left">
        <h4>Data Collection</h4>
      </div>
      <div class="toolbar-right">
        <!-- Dynamic Action Buttons using ActionManager -->
        <KRIActionButtons
          :available-actions="availableActions"
          :operation-context="operationContext"
          :show-bulk-actions="true"
          :selected-count="selectedCount"
          layout="horizontal"
          size="small"
          @action-executed="handleActionExecuted"
          @bulk-action="handleBulkAction"
        />
      </div>
    </div>

    <!-- Data Table with Reusable Columns -->
    <el-table
      ref="table"
      :data="sortedData"
      v-loading="loading || isLoading('init')"
      style="width: 100%"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      :row-class-name="getRowClassName"
      @row-click="handleRowClick"
    >
      <!-- Dynamic Columns using Column Mixin -->
      <el-table-column
        v-for="column in tableColumns"
        :key="column.prop || column.label"
        v-bind="column"
      >
        <!-- Dynamic Scoped Slots -->
        <template v-if="column.scopedSlot" slot-scope="scope">
          <component 
            :is="getRenderFunction(column.scopedSlot)"
            :scope="scope"
            @action-click="(action) => executeRowAction(scope.row, action)"
          />
        </template>
      </el-table-column>

      <!-- Actions Column -->
      <el-table-column label="Actions" width="200" fixed="right">
        <template slot-scope="scope">
          <div class="row-actions">
            <!-- Edit Value Input -->
            <div v-if="canEditValue(scope.row)" class="inline-edit">
              <el-input-number
                v-model="editingValues[getRowKey(scope.row)]"
                :precision="2"
                size="mini"
                :disabled="isRowLoading(scope.row)"
                @change="handleValueChange(scope.row)"
                placeholder="Enter value"
                style="width: 120px"
              />
            </div>

            <!-- Row Action Buttons -->
            <KRIActionButtons
              :available-actions="getRowAvailableActions(scope.row)"
              :operation-context="getRowOperationContext(scope.row)"
              layout="compact"
              size="mini"
              :show-secondary="false"
              :disabled="isRowLoading(scope.row)"
              @action-executed="(action, data) => executeRowAction(scope.row, action, data)"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- Selection Summary -->
    <div v-if="selectedCount > 0" class="selection-summary">
      <el-alert
        :title="`${selectedCount} rows selected`"
        type="info"
        show-icon
        :closable="false"
      >
        <template slot="default">
          Available batch actions: 
          <el-button
            v-for="action in bulkActions"
            :key="action.name"
            :type="action.type"
            size="mini"
            @click="executeBulkAction(action.name)"
            :loading="isLoading(`bulk-${action.name}`)"
          >
            {{ action.label }}
          </el-button>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { kriCollectDataTableMixin } from '@/mixins/kriTableMixin';
import KRIActionButtons from './shared/KRIActionButtons.vue';
import KRIStatusTag from './shared/KRIStatusTag.vue';
import ActionManager from '@/utils/ActionManager';

export default {
  name: 'KRITableCollectDataOptimized',
  components: {
    KRIActionButtons,
    KRIStatusTag
  },
  mixins: [kriCollectDataTableMixin], // Gets all table functionality
  props: {
    tableData: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    ...mapState('kri', ['currentUser']),

    // Table configuration
    tableColumns() {
      return this.getTableColumns('collectData');
    },

    // Available actions for bulk operations
    bulkActions() {
      return this.actionsByCategory?.workflow || [];
    }
  },

  async mounted() {
    // Initialize KRI operations - this sets up all available actions
    if (this.currentUser && this.tableData.length > 0) {
      // Use first row as representative for permissions
      await this.initializeKRIOperations(this.tableData[0]);
    }
  },

  methods: {
    ...mapActions('kri', ['saveKRIValue', 'submitKRI', 'approveKRI']),

    /**
     * Get operation context for a specific row
     */
    getRowOperationContext(row) {
      // This could be cached or computed more efficiently
      return {
        kriItem: {
          id: row.id,
          reportingDate: row.reportingDate,
          kri_status: row.rawData?.kri_status || 10,
          ...row
        },
        user: this.currentUser,
        currentStatus: row.rawData?.kri_status || 10
      };
    },

    /**
     * Check if row value can be edited
     */
    canEditValue(row) {
      return this.canPerformRowAction(row, 'edit') && 
             [10, 20, 30].includes(row.rawData?.kri_status);
    },

    /**
     * Handle value changes
     */
    handleValueChange(row) {
      // Store the editing value
      const key = this.getRowKey(row);
      if (!this.editingValues[key]) {
        this.$set(this.editingValues, key, row.kriValue || '');
      }
    },

    /**
     * Handle individual action execution
     */
    async handleActionExecuted(actionName, actionData) {
      // This is handled by the mixin, but can be customized here
      this.$emit('action-completed', actionName, actionData);
    },

    /**
     * Handle bulk actions
     */
    async handleBulkAction(actionName) {
      await this.executeBulkAction(actionName);
    },

    /**
     * Dynamic render functions for column slots
     */
    getRenderFunction(slotName) {
      const renderFunctions = {
        kriName: (scope) => this.renderKRINameSlot(scope),
        status: (scope) => this.renderStatusSlot(scope),
        breachType: (scope) => this.renderBreachTypeSlot(scope),
        kriValue: (scope) => this.renderKRIValueSlot(scope)
      };

      return renderFunctions[slotName] || (() => null);
    },

    /**
     * Override parent methods for custom behavior
     */
    async executeRowAction(row, actionName, actionData = {}) {
      // Add the editing value to actionData if it's a save action
      if (actionName === 'save') {
        const value = this.editingValues[this.getRowKey(row)];
        if (value) {
          actionData.value = value;
        }
      }

      // Call parent method
      const result = await this.$options.mixins[0].methods.executeRowAction.call(
        this, row, actionName, actionData
      );

      // Handle success actions
      if (result.success) {
        this.$emit('data-updated');
      }

      return result;
    }
  }
};
</script>

<style scoped>
.kri-table {
  width: 100%;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
}

.toolbar-left h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inline-edit {
  min-width: 120px;
}

.selection-summary {
  margin-top: 16px;
}

.row-loading {
  opacity: 0.6;
  pointer-events: none;
}

/* Status-based row styling */
.status-pending {
  background-color: #fef9e7;
}

.status-adjusting {
  background-color: #fef0f0;
}

.status-approved {
  background-color: #f0f9ff;
}
</style>