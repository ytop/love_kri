<template>
  <div class="loading-spinner" :class="[size, variant]">
    <!-- Element UI Spinner -->
    <div v-if="type === 'element'" class="spinner-element">
      <i class="el-icon-loading" :style="spinnerStyle"></i>
      <span v-if="text" class="spinner-text">{{ text }}</span>
    </div>
    
    <!-- Custom CSS Spinner -->
    <div v-else-if="type === 'custom'" class="spinner-custom">
      <div class="spinner-ring" :style="spinnerStyle">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <span v-if="text" class="spinner-text">{{ text }}</span>
    </div>
    
    <!-- Dots Spinner -->
    <div v-else-if="type === 'dots'" class="spinner-dots">
      <div class="dot" :style="dotStyle"></div>
      <div class="dot" :style="dotStyle"></div>
      <div class="dot" :style="dotStyle"></div>
      <span v-if="text" class="spinner-text">{{ text }}</span>
    </div>
    
    <!-- Pulse Spinner -->
    <div v-else-if="type === 'pulse'" class="spinner-pulse">
      <div class="pulse-circle" :style="pulseStyle"></div>
      <span v-if="text" class="spinner-text">{{ text }}</span>
    </div>
    
    <!-- Default: Element UI -->
    <div v-else class="spinner-element">
      <i class="el-icon-loading" :style="spinnerStyle"></i>
      <span v-if="text" class="spinner-text">{{ text }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  props: {
    // Spinner type: 'element', 'custom', 'dots', 'pulse'
    type: {
      type: String,
      default: 'element',
      validator: value => ['element', 'custom', 'dots', 'pulse'].includes(value)
    },
    
    // Size: 'xs', 'sm', 'md', 'lg', 'xl'
    size: {
      type: String,
      default: 'md',
      validator: value => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
    },
    
    // Variant: 'inline', 'block', 'overlay'
    variant: {
      type: String,
      default: 'inline',
      validator: value => ['inline', 'block', 'overlay'].includes(value)
    },
    
    // Color (CSS color value)
    color: {
      type: String,
      default: ''
    },
    
    // Loading text
    text: {
      type: String,
      default: ''
    },
    
    // Show overlay background
    overlay: {
      type: Boolean,
      default: false
    }
  },
  
  computed: {
    spinnerStyle() {
      const styles = {};
      
      // Size mapping
      const sizeMap = {
        xs: '12px',
        sm: '16px',
        md: '20px',
        lg: '24px',
        xl: '32px'
      };
      
      styles.fontSize = sizeMap[this.size];
      
      if (this.color) {
        styles.color = this.color;
      }
      
      return styles;
    },
    
    dotStyle() {
      const styles = {};
      
      // Size mapping for dots
      const sizeMap = {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px'
      };
      
      styles.width = sizeMap[this.size];
      styles.height = sizeMap[this.size];
      
      if (this.color) {
        styles.backgroundColor = this.color;
      }
      
      return styles;
    },
    
    pulseStyle() {
      const styles = {};
      
      // Size mapping for pulse
      const sizeMap = {
        xs: '16px',
        sm: '20px',
        md: '24px',
        lg: '32px',
        xl: '40px'
      };
      
      styles.width = sizeMap[this.size];
      styles.height = sizeMap[this.size];
      
      if (this.color) {
        styles.backgroundColor = `${this.color}40`; // 25% opacity
        styles.borderColor = this.color;
      }
      
      return styles;
    }
  }
};
</script>

<style scoped>
.loading-spinner {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.loading-spinner.block {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: var(--spacing-md);
}

.loading-spinner.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--modal-backdrop);
  z-index: var(--z-modal);
}

/* Element UI Spinner */
.spinner-element {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.spinner-element .el-icon-loading {
  animation: rotating 2s linear infinite;
  color: var(--color-primary);
}

/* Custom Ring Spinner */
.spinner-custom {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.spinner-ring {
  display: inline-block;
  position: relative;
  width: 20px;
  height: 20px;
}

.spinner-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 16px;
  height: 16px;
  margin: 2px;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spinner-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: var(--color-primary) transparent transparent transparent;
}

.spinner-ring div:nth-child(1) { animation-delay: -0.45s; }
.spinner-ring div:nth-child(2) { animation-delay: -0.3s; }
.spinner-ring div:nth-child(3) { animation-delay: -0.15s; }

/* Dots Spinner */
.spinner-dots {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.spinner-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: spinner-dots 1.4s ease-in-out infinite both;
}

.spinner-dots .dot:nth-child(1) { animation-delay: -0.32s; }
.spinner-dots .dot:nth-child(2) { animation-delay: -0.16s; }

/* Pulse Spinner */
.spinner-pulse {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.pulse-circle {
  width: 24px;
  height: 24px;
  background: rgba(64, 158, 255, 0.25);
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spinner-pulse 1.5s ease-in-out infinite;
}

/* Spinner Text */
.spinner-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

/* Size variations */
.loading-spinner.xs .spinner-text {
  font-size: var(--font-size-xs);
}

.loading-spinner.sm .spinner-text {
  font-size: var(--font-size-sm);
}

.loading-spinner.md .spinner-text {
  font-size: var(--font-size-base);
}

.loading-spinner.lg .spinner-text {
  font-size: var(--font-size-lg);
}

.loading-spinner.xl .spinner-text {
  font-size: var(--font-size-xl);
}

/* Animations */
@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spinner-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes spinner-dots {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes spinner-pulse {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .loading-spinner {
    gap: var(--spacing-xs);
  }
  
  .spinner-text {
    font-size: var(--font-size-xs);
  }
}
</style>