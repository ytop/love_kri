<template>
  <div class="kri-status-tag">
    <el-tooltip 
      :content="statusConfig.description || status" 
      placement="top"
      :disabled="!showTooltip"
    >
      <el-tag
        :type="statusConfig.tagType"
        :size="size"
        :class="[statusConfig.cssClass, customClass]"
        :effect="effect"
      >
        <i v-if="showIcon" :class="getStatusIcon()" class="status-icon"></i>
        {{ displayText }}
      </el-tag>
    </el-tooltip>
  </div>
</template>

<script>
import StatusManager from '@/utils/StatusManager';

export default {
  name: 'KRIStatusTag',
  props: {
    // Status value (number) or status label (string)
    status: {
      type: [Number, String],
      required: true
    },
    // Tag size
    size: {
      type: String,
      default: 'small'
    },
    // Show tooltip with description
    showTooltip: {
      type: Boolean,
      default: true
    },
    // Show status icon
    showIcon: {
      type: Boolean,
      default: false
    },
    // Tag effect: 'dark', 'light', 'plain'
    effect: {
      type: String,
      default: 'light'
    },
    // Custom CSS class
    customClass: {
      type: String,
      default: ''
    },
    // Format: 'full', 'short', 'code'
    format: {
      type: String,
      default: 'full'
    }
  },
  computed: {
    statusConfig() {
      // Handle both numeric status and string status labels
      const numericStatus = typeof this.status === 'number' 
        ? this.status 
        : StatusManager.getLabelToNumber(this.status);
      
      return StatusManager.getStatusConfig(numericStatus) || {
        label: this.status,
        tagType: 'info',
        cssClass: 'status-unknown',
        description: 'Unknown status'
      };
    },
    
    displayText() {
      switch (this.format) {
      case 'short':
        return this.getShortLabel();
      case 'code':
        return typeof this.status === 'number' ? this.status : '';
      default:
        return this.statusConfig.label;
      }
    }
  },
  methods: {
    getShortLabel() {
      const labelMap = {
        'Pending Input': 'Pending',
        'Under Rework': 'Rework',
        'Saved': 'Saved',
        'Submitted to Data Provider Approver': 'DP Approval',
        'Submitted to KRI Owner Approver': 'KRI Approval',
        'Finalized': 'Finalized'
      };
      return labelMap[this.statusConfig.label] || this.statusConfig.label;
    },
    
    getStatusIcon() {
      const iconMap = {
        10: 'el-icon-edit-outline',    // Pending Input
        20: 'el-icon-refresh',         // Under Rework
        30: 'el-icon-document',        // Saved
        40: 'el-icon-s-check',         // Submitted to Data Provider
        50: 'el-icon-s-check',         // Submitted to KRI Owner
        60: 'el-icon-circle-check'     // Finalized
      };
      
      const numericStatus = typeof this.status === 'number' 
        ? this.status 
        : StatusManager.getLabelToNumber(this.status);
        
      return iconMap[numericStatus] || 'el-icon-info';
    }
  }
};
</script>

<style scoped>
.kri-status-tag {
  display: inline-block;
}

.status-icon {
  margin-right: 4px;
}

/* Status-specific styling */
.status-pending {
  --el-color-warning: #e6a23c;
}

.status-adjusting {
  --el-color-warning: #f56c6c;
}

.status-pending-approval {
  --el-color-info: #909399;
}

.status-ready {
  --el-color-primary: #409eff;
}

.status-submitted {
  --el-color-info: #909399;
}

.status-approved {
  --el-color-success: #67c23a;
}

.status-unknown {
  --el-color-info: #c0c4cc;
}
</style>