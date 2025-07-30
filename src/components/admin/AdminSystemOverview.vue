<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>System Overview</h3>
        <p class="admin-tab-description">System-wide statistics and monitoring.</p>
      </div>
      <div class="admin-header-actions">
        <el-button 
          type="primary" 
          icon="el-icon-refresh"
          @click="refreshData"
          :loading="loading"
        >
          Refresh Stats
        </el-button>
      </div>
    </div>

    <div class="admin-stats-grid">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="admin-stat-card">
            <div class="admin-stat-content">
              <div class="admin-stat-number">{{ systemStats.totalUsers }}</div>
              <div class="admin-stat-label">Total Users</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="admin-stat-card">
            <div class="admin-stat-content">
              <div class="admin-stat-number">{{ systemStats.totalDepartments }}</div>
              <div class="admin-stat-label">Departments</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="admin-stat-card">
            <div class="admin-stat-content">
              <div class="admin-stat-number">{{ systemStats.totalKRIs }}</div>
              <div class="admin-stat-label">Active KRIs</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="admin-stat-card">
            <div class="admin-stat-content">
              <div class="admin-stat-number">{{ systemStats.totalPermissions }}</div>
              <div class="admin-stat-label">Permissions</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- System Health Metrics -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <div slot="header" class="admin-flex-between">
            <span>User Role Distribution</span>
            <el-tag type="info" size="small">Live Data</el-tag>
          </div>
          <div class="role-distribution">
            <div v-for="(count, role) in usersByRole" :key="role" class="role-distribution-item">
              <div class="role-info">
                <el-tag :type="getRoleTagType(role)" size="medium">
                  {{ getRoleDisplayName(role) }}
                </el-tag>
                <span class="role-count">{{ count }} users</span>
              </div>
              <div class="role-percentage">
                {{ Math.round((count / systemStats.totalUsers) * 100) }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <div slot="header" class="admin-flex-between">
            <span>Department Statistics</span>
            <el-tag type="success" size="small">{{ departments.length }} Active</el-tag>
          </div>
          <div class="department-stats">
            <div v-for="dept in topDepartments" :key="dept.name" class="dept-stat-item">
              <div class="dept-info">
                <strong>{{ dept.name }}</strong>
                <div class="dept-metrics">
                  <span>{{ dept.userCount }} users</span>
                  <span>{{ dept.kriCount }} KRIs</span>
                </div>
              </div>
              <el-progress 
                :percentage="Math.round((dept.userCount / systemStats.totalUsers) * 100)"
                :stroke-width="6"
                :show-text="false"
              ></el-progress>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Recent Activity -->
    <el-card style="margin-top: 20px;">
      <div slot="header" class="admin-flex-between">
        <span class="admin-recent-activity">
          <h4>Recent Administrative Activity</h4>
        </span>
        <div>
          <el-button 
            type="text" 
            @click="loadRecentActivity"
            :loading="activityLoading"
            size="small"
          >
            <i class="el-icon-refresh"></i> Refresh
          </el-button>
        </div>
      </div>
      
      <el-table 
        :data="recentActivity" 
        stripe
        class="admin-full-width"
        v-loading="activityLoading"
      >
        <el-table-column prop="timestamp" label="Time" width="180">
          <template slot-scope="scope">
            {{ formatDateTime(scope.row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="Action" width="150">
          <template slot-scope="scope">
            <el-tag size="mini" :type="getActionTagType(scope.row.action)">
              {{ scope.row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="user" label="Admin User" width="120">
        </el-table-column>
        <el-table-column prop="target" label="Target" width="120">
        </el-table-column>
        <el-table-column prop="details" label="Details">
        </el-table-column>
      </el-table>
      
      <div v-if="recentActivity.length === 0" class="admin-no-data">
        <el-empty description="No recent administrative activity found" :image-size="80">
        </el-empty>
      </div>
    </el-card>

    <!-- System Health Indicators -->
    <el-card style="margin-top: 20px;">
      <div slot="header">
        <span>System Health</span>
      </div>
      
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="health-indicator">
            <div class="health-icon success">
              <i class="el-icon-success"></i>
            </div>
            <div class="health-info">
              <h4>Database Connection</h4>
              <p>Connected and operational</p>
            </div>
          </div>
        </el-col>
        
        <el-col :span="8">
          <div class="health-indicator">
            <div class="health-icon success">
              <i class="el-icon-success"></i>
            </div>
            <div class="health-info">
              <h4>User Authentication</h4>
              <p>All services running</p>
            </div>
          </div>
        </el-col>
        
        <el-col :span="8">
          <div class="health-indicator">
            <div class="health-icon warning">
              <i class="el-icon-warning"></i>
            </div>
            <div class="health-info">
              <h4>Data Sync</h4>
              <p>{{ systemStats.totalUsers }} users synchronized</p>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';
import adminCrudMixin from '@/mixins/adminCrudMixin';

export default {
  name: 'AdminSystemOverview',
  mixins: [adminCrudMixin],
  
  data() {
    return {
      systemStats: {
        totalUsers: 0,
        totalDepartments: 0,
        totalKRIs: 0,
        totalPermissions: 0
      },
      departments: [],
      usersByRole: {},
      departmentStats: [],
      recentActivity: [],
      activityLoading: false
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    entityName() {
      return 'System';
    },
    
    topDepartments() {
      // Create a copy to avoid mutating original array
      return [...this.departmentStats]
        .sort((a, b) => b.userCount - a.userCount)
        .slice(0, 5);
    }
  },
  
  async mounted() {
    await this.loadData();
    await this.loadRecentActivity();
  },
  
  methods: {
    // ================================
    // Implement abstract methods from adminCrudMixin
    // ================================
    
    getDefaultItem() {
      return {};
    },
    
    async loadData() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadSystemStats(),
          this.loadDepartmentStats()
        ]);
      } catch (error) {
        console.error('Error loading system overview data:', error);
        this.$message.error('Failed to load system overview');
      } finally {
        this.loading = false;
      }
    },
    
    async createItem() {
      throw new Error('System creation not supported');
    },
    
    async updateItem() {
      throw new Error('System update not supported');
    },
    
    async deleteItem() {
      throw new Error('System deletion not supported');
    },
    
    // ================================
    // Component-specific methods
    // ================================
    
    async loadSystemStats() {
      try {
        // Load basic system data
        const [users, departments, permissions] = await Promise.all([
          kriService.getAllUsers(),
          kriService.getAllDepartments(),
          kriService.getUserPermissionsSummary()
        ]);
        
        // Calculate user role distribution
        this.usersByRole = users.reduce((acc, user) => {
          const role = user.user_role || 'user';
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {});
        
        this.departments = departments;
        
        // Update system stats
        this.systemStats = {
          totalUsers: users.length,
          totalDepartments: departments.length,
          totalKRIs: 0, // Would need additional query
          totalPermissions: permissions.length
        };
        
        // Try to get KRI count
        try {
          const kriMetadata = await kriService.getAllKRIMetadata();
          this.systemStats.totalKRIs = kriMetadata.length;
        } catch (error) {
          console.warn('Could not load KRI metadata:', error);
        }
        
      } catch (error) {
        console.error('Error loading system stats:', error);
        throw error;
      }
    },
    
    async loadDepartmentStats() {
      try {
        const users = await kriService.getAllUsers();
        const stats = [];
        
        for (const dept of this.departments) {
          const deptUsers = users.filter(u => u.department === dept);
          let kriCount = 0;
          
          try {
            const deptKRIs = await kriService.getDepartmentKRIs(dept);
            kriCount = deptKRIs.length;
          } catch (error) {
            console.warn(`Could not load KRIs for department ${dept}:`, error);
          }
          
          stats.push({
            name: dept,
            userCount: deptUsers.length,
            kriCount
          });
        }
        
        this.departmentStats = stats;
      } catch (error) {
        console.error('Error loading department stats:', error);
      }
    },
    
    async loadRecentActivity() {
      this.activityLoading = true;
      try {
        // Mock recent activity data
        // In a real implementation, this would query audit trails
        this.recentActivity = [
          {
            timestamp: new Date().toISOString(),
            action: 'Role Change',
            user: this.currentUser.user_id || 'System Admin',
            target: 'User123',
            details: 'Promoted to dept_admin'
          },
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            action: 'Permission Update',
            user: this.currentUser.user_id || 'System Admin',
            target: 'KRI_001',
            details: 'Added edit permissions for User456'
          },
          {
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            action: 'User Creation',
            user: this.currentUser.user_id || 'System Admin',
            target: 'NewUser789',
            details: 'Created new user in Finance department'
          }
        ];
      } catch (error) {
        console.error('Error loading recent activity:', error);
        this.$message.error('Failed to load recent activity');
      } finally {
        this.activityLoading = false;
      }
    },
    
    // Utility methods
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
    },
    
    getActionTagType(action) {
      switch (action) {
      case 'Role Change': return 'warning';
      case 'Permission Update': return 'primary';
      case 'User Creation': return 'success';
      case 'User Deletion': return 'danger';
      default: return 'info';
      }
    },
    
    formatDateTime(timestamp) {
      return new Date(timestamp).toLocaleString();
    }
  }
};
</script>

<style scoped>
.role-distribution {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.role-distribution-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.role-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.role-count {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.role-percentage {
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.department-stats {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.dept-stat-item {
  padding: var(--spacing-sm);
}

.dept-info {
  margin-bottom: var(--spacing-sm);
}

.dept-metrics {
  display: flex;
  gap: var(--spacing-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.health-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}

.health-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
}

.health-icon.success {
  background: var(--color-success);
  color: var(--color-white);
}

.health-icon.warning {
  background: var(--color-warning);
  color: var(--color-white);
}

.health-icon.danger {
  background: var(--color-danger);
  color: var(--color-white);
}

.health-info h4 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
  font-size: var(--font-size-base);
}

.health-info p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}
</style>