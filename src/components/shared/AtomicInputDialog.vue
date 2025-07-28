<template>
  <el-dialog
    title="Bulk Atomic Data Input"
    :visible.sync="dialogVisible"
    width="800px"
    :before-close="handleClose"
    @closed="resetForm"
    custom-class="atomic-input-dialog"
  >
    <div class="atomic-input-container">
      <p class="dialog-description">
        This feature allows bulk input of atomic data values. Individual atomic editing is available in the main table.
      </p>
      
      <div v-if="atomicData && atomicData.length > 0" class="atomic-list">
        <h4>Available Atomic Elements:</h4>
        <el-table :data="atomicData" stripe size="small">
          <el-table-column prop="atomic_id" label="Atomic ID" width="100" />
          <el-table-column prop="atomic_metadata" label="Element Name" />
          <el-table-column prop="atomic_value" label="Current Value" width="120" />
          <el-table-column prop="atomic_status" label="Status" width="100">
            <template slot-scope="scope">
              <el-tag size="mini" :type="getStatusType(scope.row.atomic_status)">
                {{ getStatusLabel(scope.row.atomic_status) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="bulk-input-notice">
        <el-alert
          title="Feature Coming Soon"
          type="info"
          description="Bulk atomic data input functionality is currently under development. Please use the individual row editing in the main table for now."
          show-icon
          :closable="false">
        </el-alert>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">Close</el-button>
      <!-- Future: Add bulk input controls here -->
    </div>
  </el-dialog>
</template>

<script>
import { mapStatus } from '@/utils/types';

export default {
  name: 'AtomicInputDialog',
  props: {
    value: {
      type: Boolean,
      default: false
    },
    atomicData: {
      type: Array,
      default: () => []
    },
    kriDetail: {
      type: Object,
      default: () => ({})
    },
    previousData: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      dialogVisible: false
    };
  },
  watch: {
    value: {
      handler(newVal) {
        this.dialogVisible = newVal;
      },
      immediate: true
    },
    dialogVisible(newVal) {
      this.$emit('input', newVal);
    }
  },
  methods: {
    handleClose() {
      this.dialogVisible = false;
    },
    
    resetForm() {
      // Reset form state when dialog closes
    },
    
    getStatusLabel(status) {
      return mapStatus(status);
    },
    
    getStatusType(status) {
      const typeMap = {
        10: 'info',     // Pending Input
        20: 'warning',  // Under Rework
        30: 'primary',  // Saved
        40: 'warning',  // Submitted to Data Provider
        50: 'warning',  // Submitted to KRI Owner
        60: 'success'   // Finalized
      };
      return typeMap[status] || 'info';
    }
  }
};
</script>

<style scoped>
.atomic-input-container {
  padding: 10px 0;
}

.dialog-description {
  margin-bottom: 20px;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.atomic-list {
  margin-bottom: 20px;
}

.atomic-list h4 {
  margin-bottom: 10px;
  color: #303133;
  font-size: 16px;
}

.bulk-input-notice {
  margin-top: 20px;
}

.dialog-footer {
  text-align: right;
}

/* Dialog positioning */
.atomic-input-dialog {
  position: fixed !important;
  top: 10vh !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  z-index: 2060 !important;
  margin: 0 !important;
}

.atomic-input-dialog .el-dialog {
  margin: 0 !important;
  max-height: 80vh !important;
  overflow-y: auto !important;
}
</style>