<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>Department Dashboard</h3>
        <p class="admin-tab-description">Overview of department statistics and quick actions.</p>
      </div>
      <div class="admin-header-actions">
        <span class="department-info">
          <el-tag type="primary" size="large">{{ currentUser.Department }}</el-tag>
          <span class="user-role">Department Administrator</span>
        </span>
      </div>
    </div>

    <div class="dashboard-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon">
                <i class="el-icon-user"></i>
              </div>
              <div class="metric-data">
                <div class="metric-number">{{ departmentStats.totalUsers }}</div>
                <div class="metric-label">Team Members</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon">
                <i class="el-icon-data-analysis"></i>
              </div>
              <div class="metric-data">
                <div class="metric-number">{{ departmentStats.totalKRIs }}</div>
                <div class="metric-label">Department KRIs</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon">
                <i class="el-icon-warning"></i>
              </div>
              <div class="metric-data">
                <div class="metric-number">{{ departmentStats.pendingItems.pendingApprovals }}</div>
                <div class="metric-label">Pending Approvals</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon">
                <i class="el-icon-edit"></i>
              </div>
              <div class="metric-data">
                <div class="metric-number">{{ departmentStats.pendingItems.pendingInputs }}</div>
                <div class="metric-label">Pending Inputs</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <div slot="header" class="admin-card-header">
            <span>Team Members by Role</span>
          </div>
          <div class="role-distribution">
            <div v-for="(count, role) in departmentStats.usersByRole" :key="role" class="role-item">
              <el-tag :type="getRoleTagType(role)" size="medium">
                {{ getRoleDisplayName(role) }}
              </el-tag>
              <span class="role-count">{{ count }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <div slot="header" class="admin-card-header">
            <span>Quick Actions</span>
          </div>
          <div class="quick-actions">
            <el-button 
              type="primary" 
              icon="el-icon-user-solid"
              @click="$emit('navigate-tab', 'team')"
            >
              Manage Team
            </el-button>
            <el-button 
              type="success" 
              icon="el-icon-key"
              @click="$emit('navigate-tab', 'permissions')"
            >
              Assign Permissions
            </el-button>
            <el-button 
              type="info" 
              icon="el-icon-data-analysis"
              @click="$emit('navigate-tab', 'kris')"
            >
              Department KRIs
            </el-button>
            <el-button 
              type="warning" 
              icon="el-icon-view"
              @click="$emit('navigate-tab', 'audit')"
            >
              View Activity
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'DepartmentDashboard',
  
  props: {
    departmentStats: {
      type: Object,
      default: () => ({
        totalUsers: 0,
        totalKRIs: 0,
        usersByRole: {},
        pendingItems: {
          pendingApprovals: 0,
          pendingInputs: 0,
          overdueTasks: 0
        }
      })
    }
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser'])
  },
  
  methods: {
    getRoleTagType(role) {
      switch (role) {
      case 'admin': return 'danger';
      case 'dept_admin': return 'warning';
      case 'user': return 'info';
      default: return 'info';
      }
    },
    
    getRoleDisplayName(role) {
      switch (role) {
      case 'admin': return 'System Admin';
      case 'dept_admin': return 'Dept Admin';
      case 'user': return 'User';
      default: return role || 'User';
      }
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

.role-distribution {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.role-count {
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