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
</script>

<style scoped>
.kri-status-tag {
  display: inline-block;
}

.status-icon {
  margin-right: var(--spacing-xs);
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