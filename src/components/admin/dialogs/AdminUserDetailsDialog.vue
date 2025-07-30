<template>
  <el-dialog 
    title="User Details" 
    :visible="dialogVisible"
    width="70%"
    @close="handleClose"
  >
    <div v-if="userDetailData" v-loading="userDetailsLoading">
      <div class="user-profile">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card>
              <div slot="header" class="admin-card-header">
                <span>User Information</span>
              </div>
              <div class="user-details">
                <p><strong>User ID:</strong> {{ userDetailData.user_id }}</p>
                <p><strong>Display Name:</strong> {{ userDetailData.user_name }}</p>
                <p><strong>Department:</strong> {{ userDetailData.department }}</p>
                <p><strong>Role:</strong> 
                  <el-tag :type="getRoleTagType(userDetailData.user_role)" size="small">
                    {{ getRoleDisplayName(userDetailData.user_role) }}
                  </el-tag>
                </p>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <div slot="header" class="admin-card-header">
                <span>Permission Summary</span>
              </div>
              <div class="permission-summary">
                <div class="summary-item">
                  <span class="summary-label">KRIs with Access:</span>
                  <span class="summary-value">{{ userDetailData.permissionSummary.totalKRIs }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Total Permissions:</span>
                  <span class="summary-value">{{ userDetailData.permissionSummary.totalPermissions }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Last Activity:</span>
                  <span class="summary-value">{{ formatDateTime(userDetailData.permissionSummary.lastActivity) }}</span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
      
      <div style="margin-top: 20px;">
        <el-tabs>
          <el-tab-pane label="Permissions" name="permissions">
            <el-table :data="userDetailData.permissions" stripe style="width: 100%">
              <el-table-column prop="kri_id" label="KRI ID" width="120">
              </el-table-column>
              <el-table-column prop="actions" label="Permissions">
                <template slot-scope="scope">
                  <el-tag 
                    v-for="action in scope.row.actions.split(',')" 
                    :key="action" 
                    size="mini"
                    style="margin-right: 5px;"
                  >
                    {{ action.trim() }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="effect" label="Status" width="80">
                <template slot-scope="scope">
                  <el-tag :type="scope.row.effect ? 'success' : 'danger'" size="small">
                    {{ scope.row.effect ? 'Active' : 'Inactive' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="Recent Activity" name="activity">
            <el-table :data="userDetailData.recentActivity" stripe style="width: 100%">
              <el-table-column prop="changed_at" label="Date/Time" width="180">
                <template slot-scope="scope">
                  {{ formatDateTime(scope.row.changed_at) }}
                </template>
              </el-table-column>
              <el-table-column prop="kri_id" label="KRI ID" width="80">
              </el-table-column>
              <el-table-column prop="action" label="Action" width="120">
              </el-table-column>
              <el-table-column prop="field_name" label="Field">
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
    
    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">Close</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'AdminUserDetailsDialog',
  
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    userDetailData: {
      type: Object,
      default: null
    },
    userDetailsLoading: {
      type: Boolean,
      default: false
    }
  },
  
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(value) {
        this.$emit('update:visible', value);
      }
    }
  },
  
  methods: {
    handleClose() {
      this.$emit('update:visible', false);
    },
    
    formatDateTime(timestamp) {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString();
    },
    
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
.user-profile {
  margin-bottom: 20px;
}

.user-details p {
  margin: 10px 0;
  color: #606266;
}

.permission-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.summary-label {
  color: #606266;
  font-weight: 500;
}

.summary-value {
  color: #303133;
  font-weight: bold;
}

.dialog-footer {
  text-align: right;
}
</style>