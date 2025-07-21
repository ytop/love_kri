<script>
/**
 * Reusable KRI Table Column Definitions
 * Eliminates duplicate column definitions across multiple table components
 */

import KRIStatusTag from './KRIStatusTag.vue';
import { getBreachTagType, getBreachDisplayText, getBreachDescription } from '@/utils/helpers';

export const KRITableColumnMixin = {
  components: {
    KRIStatusTag
  },
  methods: {
    // Standard column definitions that can be reused across tables
    getStandardColumns() {
      return {
        // Selection column
        selection: {
          type: 'selection',
          width: 55,
          selectable: this.isSelectable || (() => true)
        },

        // KRI ID column
        kriId: {
          prop: 'id',
          label: 'KRI ID',
          width: 80,
          sortable: true
        },

        // KRI Name column with clickable link
        kriName: {
          prop: 'name',
          label: 'KRI Name',
          minWidth: 200,
          sortable: true,
          showOverflowTooltip: true,
          scopedSlot: 'kriName'
        },

        // Owner column
        owner: {
          prop: 'owner',
          label: 'Owner',
          width: 80,
          sortable: true,
          showOverflowTooltip: true
        },

        // Data Provider column
        dataProvider: {
          prop: 'dataProvider',
          label: 'Data Provider',
          width: 120,
          sortable: true,
          showOverflowTooltip: true
        },

        // Status column with tag
        status: {
          prop: 'collectionStatus',
          label: 'Status',
          width: 120,
          sortable: true,
          scopedSlot: 'status'
        },

        // Breach Type column with tag and tooltip
        breachType: {
          prop: 'breachType',
          label: 'Breach Type',
          width: 120,
          sortable: true,
          scopedSlot: 'breachType'
        },

        // KRI Value column
        kriValue: {
          prop: 'kriValue',
          label: 'KRI Value',
          width: 120,
          sortable: true,
          scopedSlot: 'kriValue'
        },

        // L1 Risk Type column
        l1RiskType: {
          prop: 'l1RiskType',
          label: 'L1 Risk Type',
          width: 150,
          sortable: true,
          showOverflowTooltip: true
        },

        // L2 Risk Type column
        l2RiskType: {
          prop: 'l2RiskType',
          label: 'L2 Risk Type',
          width: 150,
          sortable: true,
          showOverflowTooltip: true
        },

        // Reporting Cycle column
        reportingCycle: {
          prop: 'reportingCycle',
          label: 'Reporting Cycle',
          width: 130,
          sortable: true
        },

        // Actions column
        actions: {
          label: 'Actions',
          width: 200,
          scopedSlot: 'actions'
        }
      };
    },

    // Get column configuration for specific table types
    getTableColumns(tableType = 'standard') {
      const columns = this.getStandardColumns();
      
      switch (tableType) {
      case 'dashboard':
        return [
          columns.selection,
          columns.kriId,
          columns.kriName,
          columns.owner,
          columns.dataProvider,
          columns.status,
          columns.breachType,
          columns.kriValue,
          columns.reportingCycle
        ];

      case 'collectData':
        return [
          columns.selection,
          columns.kriId,
          columns.kriName,
          columns.owner,
          columns.dataProvider,
          columns.status,
          columns.breachType,
          columns.kriValue,
          columns.actions
        ];

      case 'detail':
        return [
          columns.kriId,
          columns.kriName,
          columns.status,
          columns.kriValue,
          columns.l1RiskType,
          columns.l2RiskType
        ];

      default:
        return [
          columns.selection,
          columns.kriId,
          columns.kriName,
          columns.owner,
          columns.dataProvider,
          columns.status,
          columns.kriValue
        ];
      }
    },

    // Column slot handlers - using render functions instead of JSX
    renderKRINameSlot(scope) {
      return this.$createElement('el-button', {
        props: { type: 'text' },
        class: 'kri-name-link',
        on: {
          click: () => this.handleKRIClick(scope.row.id, scope.row.reportingDate)
        }
      }, scope.row.name);
    },

    renderStatusSlot(scope) {
      return this.$createElement('KRIStatusTag', {
        props: {
          status: scope.row.collectionStatus,
          size: 'small',
          showTooltip: true
        }
      });
    },

    renderBreachTypeSlot(scope) {
      return this.$createElement('el-tooltip', {
        props: {
          content: getBreachDescription(scope.row.breachType),
          placement: 'top'
        }
      }, [
        this.$createElement('el-tag', {
          props: {
            type: getBreachTagType(scope.row.breachType),
            size: 'small'
          },
          class: 'status-tag'
        }, getBreachDisplayText(scope.row.breachType))
      ]);
    },

    renderKRIValueSlot(scope) {
      if (this.showEditableValue && this.canEditValue(scope.row)) {
        return this.renderEditableValue(scope);
      }
      return this.$createElement('span', scope.row.kriValue);
    },

    renderActionsSlot(scope) {
      // This should be implemented by the parent component
      return this.$scopedSlots.actions ? this.$scopedSlots.actions(scope) : null;
    },

    // Event handlers (to be implemented by parent components)
    handleKRIClick(kriId, reportingDate) {
      this.$emit('kri-click', kriId, reportingDate);
    },

    canEditValue(row) {
      // Default implementation - override in parent component
      return false;
    },

    renderEditableValue(scope) {
      // Default implementation - override in parent component  
      return this.$createElement('span', scope.row.kriValue);
    }
  }
};

// Export as component for dynamic usage
export default {
  name: 'KRITableColumns',
  mixins: [KRITableColumnMixin],
  render() {
    // This component is used for its mixin - no template needed
    return null;
  }
};
</script>