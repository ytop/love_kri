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
  padding: var(--space-2) 0;
}

.dialog-description {
  margin-bottom: var(--space-5);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
}

.atomic-list {
  margin-bottom: var(--space-5);
}

.atomic-list h4 {
  margin-bottom: var(--space-2);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.bulk-input-notice {
  margin-top: var(--space-5);
}

.dialog-footer {
  text-align: right;
}

/* Use shared modal base styles */
.atomic-input-dialog {
  position: fixed;
  top: 10vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-modal);
  margin: 0;
}

.atomic-input-dialog .el-dialog {
  margin: 0;
  max-height: var(--modal-max-height);
  overflow-y: auto;
  border-radius: var(--modal-border-radius);
  box-shadow: var(--shadow-2xl);
}
</style>