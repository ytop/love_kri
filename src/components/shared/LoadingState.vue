<template>
  <div class="loading-state" :class="[type, size]">
    <!-- Skeleton Loading -->
    <el-skeleton 
      v-if="type === 'skeleton'"
      :rows="rows" 
      :animated="animated"
      :loading="true"
    >
      <template slot="template">
        <!-- Custom skeleton patterns based on variant -->
        <div v-if="variant === 'table'" class="skeleton-table">
          <el-skeleton-item 
            v-for="row in rows"
            :key="row"
            variant="rect" 
            :style="`width: 100%; height: 40px; margin-bottom: ${getSpacing('sm')};`"
          />
        </div>
        
        <div v-else-if="variant === 'card'" class="skeleton-card">
          <el-skeleton-item variant="rect" :style="`width: 100%; height: 120px; margin-bottom: ${getSpacing('md')};`" />
          <el-skeleton-item variant="text" style="width: 80%;" />
          <el-skeleton-item variant="text" style="width: 60%;" />
        </div>
        
        <div v-else-if="variant === 'form'" class="skeleton-form">
          <div v-for="field in rows" :key="field" class="skeleton-field">
            <el-skeleton-item variant="text" :style="`width: 120px; height: 16px; margin-bottom: ${getSpacing('sm')};`" />
            <el-skeleton-item variant="rect" :style="`width: 100%; height: 32px; margin-bottom: ${getSpacing('md')};`" />
          </div>
        </div>
        
        <div v-else-if="variant === 'list'" class="skeleton-list">
          <div v-for="item in rows" :key="item" class="skeleton-list-item">
            <el-skeleton-item variant="circle" :style="`width: 40px; height: 40px; margin-right: ${getSpacing('md')};`" />
            <div class="skeleton-content">
              <el-skeleton-item variant="text" style="width: 70%;" />
              <el-skeleton-item variant="text" style="width: 50%;" />
            </div>
          </div>
        </div>
        
        <!-- Default skeleton -->
        <div v-else>
          <el-skeleton-item 
            v-for="row in rows"
            :key="row"
            variant="text" 
:style="`margin-bottom: ${getSpacing('sm')};`"
          />
        </div>
      </template>
    </el-skeleton>
    
    <!-- Message -->
    <div v-if="message" class="loading-message" :class="messageType">
      <i v-if="showIcon" :class="getMessageIcon()" class="message-icon"></i>
      <span>{{ message }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingState',
  props: {
    // Loading type: 'skeleton'
    type: {
      type: String,
      default: 'skeleton',
      validator: value => ['skeleton'].includes(value)
    },
    
    // Skeleton variant: 'default', 'table', 'card', 'form', 'list'
    variant: {
      type: String,
      default: 'default',
      validator: value => ['default', 'table', 'card', 'form', 'list'].includes(value)
    },
    
    // Number of skeleton rows/items
    rows: {
      type: Number,
      default: 3
    },
    
    // Animation enabled
    animated: {
      type: Boolean,
      default: true
    },
    
    // Size: 'small', 'medium', 'large'
    size: {
      type: String,
      default: 'medium',
      validator: value => ['small', 'medium', 'large'].includes(value)
    },
    
    // Optional loading message
    message: {
      type: String,
      default: ''
    },
    
    // Message type: 'info', 'loading', 'warning'
    messageType: {
      type: String,
      default: 'info',
      validator: value => ['info', 'loading', 'warning'].includes(value)
    },
    
    // Show icon with message
    showIcon: {
      type: Boolean,
      default: false
    }
  },
  
  methods: {
    getMessageIcon() {
      const iconMap = {
        info: 'el-icon-info',
        loading: 'el-icon-loading',
        warning: 'el-icon-warning'
      };
      return iconMap[this.messageType] || 'el-icon-info';
    },
    
    getSpacing(size) {
      const spacingMap = {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)', 
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)'
      };
      return spacingMap[size] || 'var(--spacing-sm)';
    }
  }
};
</script>

<style scoped>
.loading-state {
  width: 100%;
}

/* Size variations */
.loading-state.small {
  font-size: var(--font-size-sm);
}

.loading-state.medium {
  font-size: var(--font-size-base);
}

.loading-state.large {
  font-size: var(--font-size-lg);
}

/* Skeleton variants */
.skeleton-table {
  width: 100%;
}

.skeleton-card {
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
}

.skeleton-form {
  width: 100%;
}

.skeleton-field {
  margin-bottom: var(--spacing-md);
}

.skeleton-list {
  width: 100%;
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.skeleton-content {
  flex: 1;
}

.skeleton-content .el-skeleton-item:first-child {
  margin-bottom: var(--spacing-xs);
}

/* Loading message */
.loading-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.loading-message.info {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.loading-message.loading {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.loading-message.warning {
  background: var(--color-warning-light);
  color: var(--color-warning-dark);
}

.message-icon {
  font-size: var(--font-size-base);
}

.loading-message.loading .message-icon {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .skeleton-list-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .loading-message {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
</style>