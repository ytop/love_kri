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
          
          <draggable 
            v-model="localColumns" 
            class="column-list"
            ghost-class="ghost-item"
            chosen-class="chosen-item"
            drag-class="drag-item"
            :animation="200"
          >
            <div 
              v-for="column in localColumns" 
              :key="column.key" 
              class="column-item"
              :class="{ 'disabled-column': !column.enabled }"
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
              <div class="column-toggle">
                <el-switch 
                  v-model="column.enabled"
                  :disabled="column.required"
                  size="small"
                >
                </el-switch>
              </div>
            </div>
          </draggable>
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
import draggable from 'vuedraggable';

export default {
  name: 'TableColumnConfig',
  components: {
    draggable
  },
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
      localColumns: []
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
    }
  }
};
</script>

<style scoped>
.config-trigger {
  color: #909399;
  padding: 4px 8px;
}

.config-trigger:hover {
  color: #409EFF;
}

.config-content {
  max-height: 500px;
  overflow-y: auto;
}

.section {
  margin-bottom: 20px;
}

.section h4 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.section-desc {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 12px;
}

.column-list {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #fafafa;
  padding: 8px;
  min-height: 200px;
}

.column-item {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: grab;
  transition: all 0.2s ease;
}

.column-item:hover {
  border-color: #c0c4cc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.column-item:last-child {
  margin-bottom: 0;
}

.disabled-column {
  opacity: 0.6;
  background: #f5f7fa;
}

.drag-handle {
  color: #c0c4cc;
  margin-right: 12px;
  cursor: grab;
  font-size: 16px;
  min-width: 16px;
}

.drag-handle:hover {
  color: #909399;
}

.drag-handle:active {
  cursor: grabbing;
}

.column-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-label {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.required-tag {
  margin-left: 8px;
}

.column-toggle {
  margin-left: 12px;
}

/* Dragging states */
.ghost-item {
  opacity: 0.5;
  background: #f0f9ff;
  border: 2px dashed #409eff;
}

.chosen-item {
  transform: rotate(5deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  gap: 8px;
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
    padding: 8px;
  }
  
  .column-label {
    font-size: 13px;
  }
}
</style>