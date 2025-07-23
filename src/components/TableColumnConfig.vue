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
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="config-content">
        <!-- Column selection -->
        <div class="section">
          <h4>Visible Columns</h4>
          <p class="section-desc">Select which columns to display in the table</p>
          
          <el-checkbox-group v-model="localVisibleColumns" class="column-checkboxes">
            <div v-for="column in availableColumns" :key="column.key" class="column-item">
              <el-checkbox 
                :label="column.key" 
                :disabled="column.required"
                class="column-checkbox"
              >
                {{ column.label }}
                <el-tag v-if="column.required" size="mini" type="info" class="required-tag">
                  Required
                </el-tag>
              </el-checkbox>
            </div>
          </el-checkbox-group>
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
      localVisibleColumns: []
    };
  },
  computed: {
    ...mapGetters('kri', ['getTableColumnPreferences', 'getVisibleColumnsForTable']),
    
    availableColumns() {
      return TableColumnManager.getAvailableColumns(this.tableType);
    },
    
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
      // Use current visible columns or defaults
      if (this.currentVisibleColumns.length > 0) {
        this.localVisibleColumns = [...this.currentVisibleColumns];
      } else {
        this.localVisibleColumns = TableColumnManager.getDefaultVisible(this.tableType);
      }
    },
    
    handleSave() {
      const preferences = {
        visibleColumns: this.localVisibleColumns
      };
      
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
      // Reset to default visible columns
      this.localVisibleColumns = TableColumnManager.getDefaultVisible(this.tableType);
      
      // Clear from storage and store
      clearTablePreferencesFromStorage(this.tableType);
      this.resetTableColumnPreferences(this.tableType);
      
      // Emit change event
      this.$emit('preferences-changed', { visibleColumns: [] });
      
      this.$message.success('Column preferences reset to default');
    },
    
    loadPreferencesFromStorage() {
      const stored = loadTablePreferencesFromStorage(this.tableType);
      if (stored && stored.visibleColumns) {
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
  max-height: 400px;
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

.column-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-item {
  display: flex;
  align-items: center;
}

.column-checkbox {
  width: 100%;
  margin-right: 0;
}

.column-checkbox >>> .el-checkbox__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-left: 8px;
}

.required-tag {
  margin-left: auto;
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
    max-height: 300px;
  }
}
</style>