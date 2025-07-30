<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>{{ title }}</h3>
        <p class="admin-tab-description">{{ description }}</p>
      </div>
      <div class="admin-header-actions">
        <slot name="header-actions">
          <span v-if="currentUser.department" class="department-info">
            <el-tag type="primary" size="large">{{ currentUser.department }}</el-tag>
            <span class="user-role">{{ getRoleDisplayName(currentUser.user_role) }}</span>
          </span>
        </slot>
      </div>
    </div>

    <!-- Metrics Overview -->
    <div class="dashboard-overview">
      <el-row :gutter="20">
        <el-col v-for="(metric, index) in metrics" :key="index" :span="Math.floor(24 / metrics.length)">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon">
                <i :class="metric.icon"></i>
              </div>
              <div class="metric-data">
                <div class="metric-number">{{ metric.value }}</div>
                <div class="metric-label">{{ metric.label }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- Additional Content Grid -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- Left Column - Custom Content -->
      <el-col :span="12">
        <slot name="left-content">
          <el-card v-if="showDistribution">
            <div slot="header" class="admin-card-header">
              <span>{{ distributionTitle }}</span>
            </div>
            <div class="distribution-content">
              <div v-for="(item, key) in distributionData" :key="key" class="distribution-item">
                <el-tag :type="getDistributionTagType(key)" size="medium">
                  {{ formatDistributionLabel(key) }}
                </el-tag>
                <span class="distribution-count">{{ item }}</span>
              </div>
            </div>
          </el-card>
        </slot>
      </el-col>
      
      <!-- Right Column - Quick Actions -->
      <el-col :span="12">
        <slot name="right-content">
          <el-card v-if="quickActions.length > 0">
            <div slot="header" class="admin-card-header">
              <span>Quick Actions</span>
            </div>
            <div class="quick-actions">
              <el-button 
                v-for="action in quickActions"
                :key="action.key"
                :type="action.type" 
                :icon="action.icon"
                @click="$emit('quick-action', action.key)"
              >
                {{ action.label }}
              </el-button>
            </div>
          </el-card>
        </slot>
      </el-col>
    </el-row>

    <!-- Additional Custom Sections -->
    <slot name="additional-content"></slot>
  </div>
</template>

<script>
import adminHelpersMixin from '@/mixins/adminHelpersMixin';
import { mapGetters } from 'vuex';

export default {
  name: 'AdminBaseDashboard',
  
  mixins: [adminHelpersMixin],
  
  props: {
    title: {
      type: String,
      default: 'Dashboard'
    },
    description: {
      type: String,
      default: 'Overview of system statistics and quick actions'
    },
    metrics: {
      type: Array,
      default: () => []
    },
    distributionData: {
      type: Object,
      default: () => ({})
    },
    distributionTitle: {
      type: String,
      default: 'Distribution'
    },
    quickActions: {
      type: Array,
      default: () => []
    },
    showDistribution: {
      type: Boolean,
      default: true
    }
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser'])
  },
  
  methods: {
    getDistributionTagType(key) {
      // Can be overridden by parent component
      if (typeof key === 'string') {
        const keyLower = key.toLowerCase();
        if (keyLower.includes('admin')) return 'danger';
        if (keyLower.includes('dept')) return 'warning';
        if (keyLower.includes('user')) return 'info';
      }
      return 'info';
    },
    
    formatDistributionLabel(key) {
      // Can be overridden by parent component  
      if (typeof key === 'string') {
        return this.getRoleDisplayName(key) || this.capitalize(key.replace(/_/g, ' '));
      }
      return key;
    }
  }
};
</script>

<style scoped>
.department-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-role {
  color: #909399;
  font-size: 14px;
}

.dashboard-overview {
  margin-bottom: 20px;
}

.metric-card {
  text-align: center;
}

.metric-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 15px;
}

.metric-icon {
  font-size: 40px;
  color: #409eff;
}

.metric-data {
  text-align: left;
}

.metric-number {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
}

.distribution-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.distribution-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.distribution-count {
  font-weight: bold;
  color: #409eff;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-actions .el-button {
  justify-content: flex-start;
}

/* Responsive design */
@media (max-width: 768px) {
  .metric-content {
    flex-direction: column;
    gap: 10px;
  }
  
  .metric-data {
    text-align: center;
  }
}
</style>