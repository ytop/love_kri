<template>
  <div class="kri-action-buttons" :class="[layout, size]">
    <!-- Primary Actions -->
    <div v-if="primaryActions.length > 0" class="button-group primary-actions">
      <el-button
        v-for="action in primaryActions"
        :key="action.name"
        :type="action.type"
        :icon="action.icon"
        :loading="isLoading(action.name)"
        :disabled="disabled || isLoading(action.name)"
        :size="size"
        @click="handleActionClick(action)"
      >
        {{ action.label }}
      </el-button>
    </div>

    <!-- Secondary Actions Dropdown -->
    <el-dropdown 
      v-if="secondaryActions.length > 0 && showSecondary"
      @command="handleDropdownAction"
      :size="size"
    >
      <el-button :size="size" :disabled="disabled">
        More Actions<i class="el-icon-arrow-down el-icon--right"></i>
      </el-button>
      <el-dropdown-menu slot="dropdown">
        <el-dropdown-item
          v-for="action in secondaryActions"
          :key="action.name"
          :command="action"
          :disabled="isLoading(action.name)"
        >
          <i :class="action.icon"></i>
          {{ action.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </el-dropdown>

    <!-- Bulk Actions (if applicable) -->
    <div v-if="showBulkActions && selectedCount > 0" class="button-group bulk-actions">
      <span class="selection-info">{{ selectedCount }} selected</span>
      <el-button
        v-for="action in bulkActions"
        :key="'bulk-' + action.name"
        :type="action.type"
        :icon="action.icon"
        :loading="isLoading('bulk-' + action.name)"
        :disabled="disabled || isLoading('bulk-' + action.name)"
        :size="size"
        @click="handleBulkActionClick(action)"
      >
        {{ action.label }}
      </el-button>
    </div>
  </div>
</template>

<script>
import { loadingMixin, errorHandlingMixin } from '@/mixins/validationMixin';

export default {
  name: 'KRIActionButtons',
  mixins: [loadingMixin, errorHandlingMixin],
  props: {
    // Actions from ActionManager
    availableActions: {
      type: Array,
      default: () => []
    },
    // Context for action execution
    operationContext: {
      type: Object,
      required: true
    },
    // Layout options: 'horizontal', 'vertical', 'compact'
    layout: {
      type: String,
      default: 'horizontal'
    },
    // Button size: 'mini', 'small', 'medium'
    size: {
      type: String,
      default: 'small'
    },
    // Show secondary actions dropdown
    showSecondary: {
      type: Boolean,
      default: true
    },
    // Show bulk actions
    showBulkActions: {
      type: Boolean,
      default: false
    },
    // Selected items count for bulk actions
    selectedCount: {
      type: Number,
      default: 0
    },
    // Disabled state
    disabled: {
      type: Boolean,
      default: false
    },
    // Filter actions by category
    categoryFilter: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    filteredActions() {
      if (this.categoryFilter.length === 0) {
        return this.availableActions;
      }
      return this.availableActions.filter(action => 
        this.categoryFilter.includes(action.category)
      );
    },
    
    primaryActions() {
      const primaryNames = ['edit', 'save', 'submit', 'approve', 'reject'];
      return this.filteredActions.filter(action => 
        primaryNames.includes(action.name)
      );
    },
    
    secondaryActions() {
      const primaryNames = ['edit', 'save', 'submit', 'approve', 'reject'];
      return this.filteredActions.filter(action => 
        !primaryNames.includes(action.name)
      );
    },
    
    bulkActions() {
      // Only certain actions make sense for bulk operations
      const bulkableActions = ['approve', 'reject', 'submit'];
      return this.filteredActions.filter(action => 
        bulkableActions.includes(action.name)
      );
    }
  },
  methods: {
    async handleActionClick(action) {
      await this.executeAction(action, {});
    },
    
    async handleDropdownAction(action) {
      await this.executeAction(action, {});
    },
    
    async handleBulkActionClick(action) {
      if (this.selectedCount === 0) {
        this.$message.warning('Please select items first');
        return;
      }
      
      const confirmed = await this.showConfirmDialog(
        'Confirm Bulk Action',
        `Execute ${action.label} on ${this.selectedCount} selected item(s)?`
      );
      
      if (confirmed) {
        this.$emit('bulk-action', action.name, this.selectedCount);
      }
    },
    
    async executeAction(action, actionData) {
      this.setLoading(action.name, true);
      
      try {
        // Handle confirmation if required
        if (action.requiresConfirmation) {
          const confirmed = await this.showConfirmDialog(
            `Confirm ${action.label}`,
            `Are you sure you want to ${action.description.toLowerCase()}?`,
            action.type === 'danger' ? 'warning' : 'info'
          );
          
          if (!confirmed) return;
        }
        
        // Handle comment requirement
        if (action.requiresComment) {
          const comment = await this.showInputPrompt(
            'Comment Required',
            `Please provide a comment for ${action.description.toLowerCase()}:`
          );
          
          if (!comment) return;
          actionData.comment = comment;
        }
        
        // Emit action event to parent
        this.$emit('action-executed', action.name, actionData);
        
      } finally {
        this.setLoading(action.name, false);
      }
    }
  }
};
</script>

<style scoped>
.kri-action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.kri-action-buttons.vertical {
  flex-direction: column;
  align-items: stretch;
}

.kri-action-buttons.compact {
  gap: 4px;
}

.button-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.kri-action-buttons.vertical .button-group {
  flex-direction: column;
  align-items: stretch;
}

.selection-info {
  font-size: 12px;
  color: #606266;
  margin-right: 8px;
}

.bulk-actions {
  border-left: 1px solid #dcdfe6;
  padding-left: 12px;
  margin-left: 8px;
}

.kri-action-buttons.vertical .bulk-actions {
  border-left: none;
  border-top: 1px solid #dcdfe6;
  padding-left: 0;
  padding-top: 8px;
  margin-left: 0;
  margin-top: 8px;
}
</style>