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