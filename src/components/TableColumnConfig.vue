<template>
  <div class="table-column-config">
    <!-- Config trigger button -->
    <el-button
      size="mini"
      icon="el-icon-setting"
      type="text"
      @click="dialogVisible = true"
      class="config-trigger"
      title="Configure Table Columns"
    >
    </el-button>

    <!-- Configuration dialog -->
    <el-dialog
      title="Configure Table Columns"
      :visible.sync="dialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="config-content">
        <!-- Column ordering and visibility -->
        <div class="section">
          <h4>Column Order & Visibility</h4>
          <p class="section-desc">Drag to reorder columns and toggle visibility</p>
          
          <div 
            class="column-list"
            :class="{ 'drag-disabled': dragDisabled }"
          >
            <div 
              v-for="(column, index) in localColumns" 
              :key="column.key" 
              class="column-item"
              :class="{ 
                'disabled-column': !column.enabled,
                'dragging-item': draggedIndex === index,
                'drag-over': dragOverIndex === index && draggedIndex !== index
              }"
              :draggable="!dragDisabled"
              @dragstart="handleDragStart($event, index)"
              @dragover.prevent="handleDragOver($event, index)"
              @drop.prevent="handleDrop($event, index)"
              @dragend="handleDragEnd"
            >
              <!-- Drag handle -->
              <div class="drag-handle">
                <i class="el-icon-s-grid"></i>
              </div>
              
              <!-- Column info -->
              <div class="column-info">
                <span class="column-label">{{ column.label }}</span>
                <el-tag v-if="column.required" size="mini" type="info" class="required-tag">
                  Required
                </el-tag>
              </div>
              
              <!-- Enable/disable toggle -->
              <div 
                class="column-toggle"
                @mouseenter="dragDisabled = true"
                @mouseleave="dragDisabled = false"
              >
                <el-switch 
                  v-model="column.enabled"
                  :disabled="column.required"
                  size="small"
                  class="toggle-switch"
                >
                </el-switch>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dialog footer -->
      <div slot="footer" class="dialog-footer">
        <div class="footer-left">
          <el-button @click="handleReset" size="small">
            <i class="el-icon-refresh"></i>
            Reset to Default
          </el-button>
        </div>
        <div class="footer-right">
          <el-button @click="dialogVisible = false" size="small">
            Cancel
          </el-button>
          <el-button type="primary" @click="handleSave" size="small">
            <i class="el-icon-check"></i>
            Apply
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import TableColumnManager, { TABLE_TYPES } from '@/utils/tableColumnConfig';
import { 
  saveTablePreferencesToStorage, 
  loadTablePreferencesFromStorage,
  clearTablePreferencesFromStorage 
} from '@/utils/helpers';

export default {
  name: 'TableColumnConfig',
  props: {
    tableType: {
      type: String,
      required: true,
      validator: value => Object.values(TABLE_TYPES).includes(value)
    }
  },
  data() {
    return {
      dialogVisible: false,
      localColumns: [],
      dragDisabled: false,
      draggedIndex: null,
      dragOverIndex: null,
      isDragging: false
    };
  },
  computed: {
    ...mapGetters('kri', ['getTableColumnPreferences', 'getVisibleColumnsForTable']),
    
    currentPreferences() {
      return this.getTableColumnPreferences(this.tableType);
    },
    
    currentVisibleColumns() {
      return this.getVisibleColumnsForTable(this.tableType);
    }
  },
  watch: {
    dialogVisible(newVal) {
      if (newVal) {
        // Initialize local state when dialog opens
        this.initializeLocalState();
      }
    }
  },
  mounted() {
    this.loadPreferencesFromStorage();
  },
  methods: {
    ...mapActions('kri', ['updateTableColumnPreferences', 'resetTableColumnPreferences']),
    
    initializeLocalState() {
      // Get current preferences
      const preferences = this.currentPreferences;
      const currentOrder = preferences?.columnOrder;
      const currentVisible = preferences?.visibleColumns || this.currentVisibleColumns;
      
      // Initialize local columns with current state
      this.localColumns = TableColumnManager.getColumnsForConfiguration(
        this.tableType,
        currentOrder,
        currentVisible
      );
    },
    
    handleSave() {
      // Create preferences from local column configuration
      const preferences = TableColumnManager.createPreferencesFromConfiguration(this.localColumns);
      
      // Update Vuex store
      this.updateTableColumnPreferences({
        tableType: this.tableType,
        preferences
      });
      
      // Save to localStorage
      saveTablePreferencesToStorage(this.tableType, preferences);
      
      // Emit change event for parent components
      this.$emit('preferences-changed', preferences);
      
      // Close dialog
      this.dialogVisible = false;
      
      this.$message.success('Column preferences saved successfully');
    },
    
    handleReset() {
      // Reset to default configuration
      const defaultVisible = TableColumnManager.getDefaultVisible(this.tableType);
      const defaultOrder = TableColumnManager.getDefaultOrder(this.tableType);
      
      this.localColumns = TableColumnManager.getColumnsForConfiguration(
        this.tableType,
        defaultOrder,
        defaultVisible
      );
      
      // Clear from storage and store
      clearTablePreferencesFromStorage(this.tableType);
      this.resetTableColumnPreferences(this.tableType);
      
      // Emit change event
      this.$emit('preferences-changed', { visibleColumns: [], columnOrder: [] });
      
      this.$message.success('Column preferences reset to default');
    },
    
    loadPreferencesFromStorage() {
      const stored = loadTablePreferencesFromStorage(this.tableType);
      if (stored && (stored.visibleColumns || stored.columnOrder)) {
        // Update Vuex store with loaded preferences
        this.updateTableColumnPreferences({
          tableType: this.tableType,
          preferences: stored
        });
      }
    },
    
    // Native HTML5 drag and drop methods
    handleDragStart(event, index) {
      if (this.dragDisabled) {
        event.preventDefault();
        return;
      }
      
      this.draggedIndex = index;
      this.isDragging = true;
      
      // Set drag effect and data
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', event.target.outerHTML);
      
      // Add visual feedback
      event.target.classList.add('dragging-item');
    },
    
    handleDragOver(event, index) {
      if (this.dragDisabled || this.draggedIndex === null) return;
      
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      
      // Update drag over index for visual feedback
      if (this.dragOverIndex !== index) {
        this.dragOverIndex = index;
      }
    },
    
    handleDrop(event, index) {
      if (this.dragDisabled || this.draggedIndex === null) return;
      
      event.preventDefault();
      
      // Only reorder if dropping on a different position
      if (this.draggedIndex !== index) {
        // Create a copy of the array for reordering
        const newColumns = [...this.localColumns];
        const draggedItem = newColumns[this.draggedIndex];
        
        // Remove the dragged item from its original position
        newColumns.splice(this.draggedIndex, 1);
        
        // Insert the dragged item at the new position
        // Adjust the insert index if dragging from earlier position
        const insertIndex = this.draggedIndex < index ? index - 1 : index;
        newColumns.splice(insertIndex, 0, draggedItem);
        
        // Update the local columns array
        this.localColumns = newColumns;
      }
      
      this.cleanupDragState();
    },
    
    handleDragEnd() {
      this.cleanupDragState();
    },
    
    cleanupDragState() {
      this.draggedIndex = null;
      this.dragOverIndex = null;
      this.isDragging = false;
      
      // Remove any remaining drag classes
      const draggingItems = document.querySelectorAll('.dragging-item');
      draggingItems.forEach(item => {
        item.classList.remove('dragging-item');
      });
    }
  }
};
</script>

<style scoped>
.config-trigger {
  color: var(--text-secondary);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.config-trigger:hover {
  color: var(--color-primary);
}

.config-content {
  max-height: 500px;
  overflow-y: auto;
}

.section {
  margin-bottom: var(--spacing-lg);
}

.section h4 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.section-desc {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.column-list {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  padding: var(--spacing-sm);
  min-height: 200px;
}

.column-list.drag-disabled .column-item {
  cursor: default;
}

.column-item {
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  cursor: grab;
  transition: var(--transition-fast);
}

.column-item:hover {
  border-color: var(--border-medium);
  box-shadow: var(--shadow-sm);
}

.column-item:last-child {
  margin-bottom: 0;
}

.disabled-column {
  opacity: 0.6;
  background: var(--bg-tertiary);
}

.drag-handle {
  color: var(--border-medium);
  margin-right: var(--spacing-md);
  cursor: grab;
  font-size: var(--font-size-base);
  min-width: 16px;
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
  transition: var(--transition-fast);
}

.drag-handle:hover {
  color: var(--text-secondary);
  background-color: var(--bg-tertiary);
}

.drag-handle:active {
  cursor: grabbing;
  background-color: var(--border-light);
}

.column-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.column-label {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.required-tag {
  margin-left: var(--spacing-sm);
}

.column-toggle {
  margin-left: var(--spacing-md);
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
  transition: var(--transition-fast);
}

.column-toggle:hover {
  background-color: var(--bg-tertiary);
}

.toggle-switch {
  cursor: pointer;
}

/* Native HTML5 drag states */
.dragging-item {
  opacity: 0.7;
  transform: rotate(3deg);
  box-shadow: var(--shadow-lg);
  border: 2px solid var(--color-primary);
  background: var(--color-primary-light);
  cursor: grabbing;
  z-index: var(--z-tooltip);
}

.drag-over {
  border: 2px dashed var(--color-primary);
  background: var(--color-primary-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
}

/* Legacy dragging states (kept for compatibility) */
.ghost-item {
  opacity: 0.5;
  background: var(--color-primary-light);
  border: 2px dashed var(--color-primary);
}

.chosen-item {
  transform: rotate(5deg);
  box-shadow: var(--shadow-lg);
}

.drag-item {
  transform: rotate(5deg);
  z-index: 2000;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  flex: 1;
}

.footer-right {
  display: flex;
  gap: var(--spacing-sm);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .el-dialog {
    width: 90% !important;
  }
  
  .config-content {
    max-height: 400px;
  }
  
  .column-item {
    padding: var(--spacing-sm);
  }
  
  .column-label {
    font-size: var(--font-size-xs);
  }
}
</style>