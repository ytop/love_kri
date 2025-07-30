<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>Department Administration</h3>
        <p class="admin-tab-description">Manage department administrators and oversee department operations.</p>
      </div>
    </div>

    <div class="admin-department-overview">
      <el-row :gutter="20">
        <el-col :span="6" v-for="dept in departmentStats" :key="dept.name">
          <el-card class="admin-dept-card">
            <div class="admin-dept-info">
              <h4>{{ dept.name }}</h4>
              <div class="admin-dept-metrics">
                <div class="admin-dept-metric">
                  <span class="admin-dept-metric-label">Users:</span>
                  <span class="admin-dept-metric-value">{{ dept.userCount }}</span>
                </div>
                <div class="admin-dept-metric">
                  <span class="admin-dept-metric-label">KRIs:</span>
                  <span class="admin-dept-metric-value">{{ dept.kriCount }}</span>
                </div>
                <div class="admin-dept-metric">
                  <span class="admin-dept-metric-label">Admins:</span>
                  <span class="admin-dept-metric-value">{{ dept.adminCount }}</span>
                </div>
              </div>
              <el-button 
                size="small" 
                type="primary" 
                @click="viewDepartmentDetails(dept.name)"
                style="margin-top: 10px;"
              >
                Manage
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- Department Management Actions -->
    <el-card style="margin-top: 20px;">
      <div slot="header" class="admin-flex-between">
        <span>Department Management Actions</span>
        <el-button 
          type="primary" 
          icon="el-icon-refresh"
          @click="refreshData"
          :loading="loading"
          size="small"
        >
          Refresh
        </el-button>
      </div>
      
      <div class="admin-bulk-actions">
        <h4>Bulk Department Operations</h4>
        <el-form :inline="true">
          <el-form-item label="Department:">
            <el-select 
              v-model="selectedDepartment" 
              placeholder="Select department"
              class="admin-filter-select"
            >
              <el-option 
                v-for="dept in departments" 
                :key="dept" 
                :label="dept" 
                :value="dept"
              ></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="Action:">
            <el-select 
              v-model="selectedAction" 
              placeholder="Select action"
              class="admin-filter-select"
            >
              <el-option label="Promote Users to Dept Admin" value="promote"></el-option>
              <el-option label="View Department Report" value="report"></el-option>
              <el-option label="Export Department Data" value="export"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="warning" 
              @click="executeDepartmentAction"
              :disabled="!selectedDepartment || !selectedAction"
              :loading="actionLoading"
            >
              Execute Action
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- Department Details Dialog -->
    <el-dialog 
      title="Department Management" 
      :visible.sync="departmentDetailsDialogVisible"
      width="900px"
      @close="resetDepartmentDetailsDialog"
    >
      <div v-if="selectedDepartmentDetails" v-loading="departmentDetailsLoading" class="admin-dialog-content">
        <div class="admin-dept-detail-header">
          <h3>{{ selectedDepartmentDetails }} Department</h3>
          <div class="admin-dept-detail-metrics">
            <el-tag>{{ departmentUsers.length }} Users</el-tag>
            <el-tag type="info">{{ departmentKRIs.length }} KRIs</el-tag>
          </div>
        </div>

        <el-tabs>
          <el-tab-pane label="Users" name="users">
            <el-table :data="departmentUsers" stripe class="admin-full-width">
              <el-table-column prop="User_ID" label="User ID" width="120"></el-table-column>
              <el-table-column prop="User_Name" label="Name" width="150"></el-table-column>
              <el-table-column prop="user_role" label="Role" width="120">
                <template slot-scope="scope">
                  <el-tag :type="getRoleTagType(scope.row.user_role)" size="small">
                    {{ getRoleDisplayName(scope.row.user_role) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="Actions" width="200">
                <template slot-scope="scope">
                  <el-button 
                    v-if="scope.row.user_role === 'user'"
                    size="mini" 
                    type="warning"
                    @click="promoteUserToDeptAdmin(scope.row)"
                    :disabled="!canPromoteUser(scope.row)"
                  >
                    Promote to Dept Admin
                  </el-button>
                  <el-button 
                    size="mini" 
                    type="primary"
                    @click="viewUserPermissions(scope.row)"
                  >
                    View Permissions
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="KRIs" name="kris">
            <el-table :data="departmentKRIs" stripe class="admin-full-width">
              <el-table-column prop="kri_id" label="KRI ID" width="80"></el-table-column>
              <el-table-column prop="kri_name" label="KRI Name" min-width="200"></el-table-column>
              <el-table-column prop="owner" label="Owner" width="120"></el-table-column>
              <el-table-column prop="data_provider" label="Data Provider" width="120"></el-table-column>
              <el-table-column prop="l1_risk_type" label="L1 Risk Type" width="120"></el-table-column>
              <el-table-column label="Actions" width="100">
                <template slot-scope="scope">
                  <el-button 
                    size="mini" 
                    type="info"
                    @click="navigateToKRI(scope.row)"
                  >
                    View
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <div slot="footer" class="admin-dialog-footer">
        <el-button @click="departmentDetailsDialogVisible = false">Close</el-button>
      </div>
    </el-dialog>

    <!-- User Permissions Dialog (reused from other components) -->
    <el-dialog 
      title="User Permissions" 
      :visible.sync="userPermissionsDialogVisible"
      width="800px"
    >
      <div v-if="viewingUser" class="admin-dialog-content">
        <div class="admin-user-info">
          <p><strong>User:</strong> {{ viewingUser.User_ID }} ({{ viewingUser.User_Name }})</p>
          <p><strong>Department:</strong> {{ viewingUser.Department }}</p>
        </div>
        
        <el-table 
          :data="userPermissions" 
          v-loading="userPermissionsLoading"
          stripe
          class="admin-full-width"
        >
          <el-table-column prop="kri_id" label="KRI ID" width="80">
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
                {{ scope.row.effect ? 'Active' : 'Denied' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div slot="footer" class="admin-dialog-footer">
        <el-button @click="userPermissionsDialogVisible = false">Close</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';
import Permission from '@/utils/permission';
import adminCrudMixin from '@/mixins/adminCrudMixin';

export default {
  name: 'AdminDepartmentManagement',
  mixins: [adminCrudMixin],
  
  data() {
    return {
      departments: [],
      departmentStats: [],
      
      // Bulk operations
      selectedDepartment: '',
      selectedAction: '',
      actionLoading: false,
      
      // Department details dialog
      departmentDetailsDialogVisible: false,
      selectedDepartmentDetails: null,
      departmentUsers: [],
      departmentKRIs: [],
      departmentDetailsLoading: false,
      
      // User permissions dialog
      userPermissionsDialogVisible: false,
      viewingUser: null,
      userPermissions: [],
      userPermissionsLoading: false
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    entityName() {
      return 'Department';
    }
  },
  
  async mounted() {
    await this.loadData();
  },
  
  methods: {
    // ================================
    // Implement abstract methods from adminCrudMixin
    // ================================
    
    getDefaultItem() {
      return {
        name: '',
        description: ''
      };
    },
    
    async loadData() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadDepartments(),
          this.loadDepartmentStats()
        ]);
      } catch (error) {
        console.error('Error loading department data:', error);
        this.$message.error('Failed to load department data');
      } finally {
        this.loading = false;
      }
    },
    
    async createItem() {
      // Department creation not implemented
      throw new Error('Department creation not implemented');
    },
    
    async updateItem() {
      // Department update not implemented
      throw new Error('Department update not implemented');
    },
    
    async deleteItem() {
      // Department deletion not implemented
      throw new Error('Department deletion not implemented');
    },
    
    // ================================
    // Component-specific methods
    // ================================
    
    async loadDepartments() {
      try {
        this.departments = await kriService.getAllDepartments();
      } catch (error) {
        console.error('Error loading departments:', error);
        this.$message.error('Failed to load departments');
      }
    },
    
    async loadDepartmentStats() {
      try {
        const users = await kriService.getAllUsers();
        const stats = [];
        
        for (const dept of this.departments) {
          const deptUsers = users.filter(u => u.Department === dept);
          let deptKRIs = [];
          
          try {
            deptKRIs = await kriService.getDepartmentKRIs(dept);
          } catch (error) {
            console.warn(`Could not load KRIs for department ${dept}:`, error);
          }
          
          const adminCount = deptUsers.filter(u => 
            Permission.isSystemAdmin(u) || Permission.isDepartmentAdmin(u)
          ).length;
          
          stats.push({
            name: dept,
            userCount: deptUsers.length,
            kriCount: deptKRIs.length,
            adminCount
          });
        }
        
        this.departmentStats = stats;
      } catch (error) {
        console.error('Error loading department stats:', error);
        this.$message.error('Failed to load department statistics');
      }
    },
    
    async viewDepartmentDetails(department) {
      this.selectedDepartmentDetails = department;
      this.departmentDetailsLoading = true;
      this.departmentDetailsDialogVisible = true;
      
      try {
        // Load department users and KRIs in parallel
        const [users, kris] = await Promise.all([
          kriService.getUsersByDepartment(department),
          kriService.getDepartmentKRIs(department)
        ]);
        
        this.departmentUsers = users;
        this.departmentKRIs = kris;
      } catch (error) {
        console.error('Error loading department details:', error);
        this.$message.error('Failed to load department details');
      } finally {
        this.departmentDetailsLoading = false;
      }
    },
    
    resetDepartmentDetailsDialog() {
      this.selectedDepartmentDetails = null;
      this.departmentUsers = [];
      this.departmentKRIs = [];
      this.departmentDetailsLoading = false;
    },
    
    async executeDepartmentAction() {
      if (!this.selectedDepartment || !this.selectedAction) return;
      
      this.actionLoading = true;
      try {
        switch (this.selectedAction) {
          case 'promote':
            await this.showPromotionDialog();
            break;
          case 'report':
            await this.generateDepartmentReport();
            break;
          case 'export':
            await this.exportDepartmentData();
            break;
        }
      } catch (error) {
        console.error('Error executing department action:', error);
        this.$message.error('Failed to execute department action');
      } finally {
        this.actionLoading = false;
      }
    },
    
    async showPromotionDialog() {
      // Load department users for promotion
      const users = await kriService.getUsersByDepartment(this.selectedDepartment);
      const regularUsers = users.filter(u => u.user_role === 'user');
      
      if (regularUsers.length === 0) {
        this.$message.info('No users available for promotion in this department');
        return;
      }
      
      this.$message.info('Promotion dialog would open here with available users');
      // This would typically open a dialog to select users for promotion
    },
    
    async generateDepartmentReport() {
      this.$message.success(`Generating report for ${this.selectedDepartment} department`);
      // This would generate and download a department report
    },
    
    async exportDepartmentData() {
      this.$message.success(`Exporting data for ${this.selectedDepartment} department`);
      // This would export department data to CSV/Excel
    },
    
    canPromoteUser(user) {
      return Permission.isSystemAdmin(this.currentUser) && user.user_role === 'user';
    },
    
    async promoteUserToDeptAdmin(user) {
      try {
        await kriService.updateUserRole(user.UUID, 'dept_admin', this.currentUser.User_ID);
        
        // Update local data
        const userIndex = this.departmentUsers.findIndex(u => u.UUID === user.UUID);
        if (userIndex !== -1) {
          this.departmentUsers[userIndex].user_role = 'dept_admin';
        }
        
        this.$message.success(`${user.User_ID} promoted to Department Administrator`);
        await this.loadDepartmentStats(); // Refresh stats
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error promoting user:', error);
        this.$message.error('Failed to promote user');
      }
    },
    
    async viewUserPermissions(user) {
      this.viewingUser = user;
      this.userPermissionsLoading = true;
      this.userPermissionsDialogVisible = true;
      
      try {
        this.userPermissions = await kriService.getUserPermissionsSummary(user.UUID);
      } catch (error) {
        console.error('Error loading user permissions:', error);
        this.$message.error('Failed to load user permissions');
      } finally {
        this.userPermissionsLoading = false;
      }
    },
    
    navigateToKRI(kri) {
      const reportingDate = kri.reporting_date || 20241231;
      this.$router.push(`/kri/${kri.kri_id}/${reportingDate}`);
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
    }
  }
};
</script>

<style scoped>
/* Component-specific styles if needed */
/* Most styles are in admin.css */
</style>