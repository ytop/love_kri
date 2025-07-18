<template>
  <div class="admin-management">
    <!-- Animated Background Particles -->
    <div class="particles-container">
      <div v-for="i in 50" :key="i" class="particle" :style="getParticleStyle(i)"></div>
    </div>
    
    <!-- Floating Orbs -->
    <div class="floating-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>
    <!-- Enhanced Header -->
    <div class="page-header animate-slide-down">
      <div class="header-content">
        <div class="header-text animate-fade-in-up">
          <h1 class="animated-title"><i class="el-icon-setting spinning-gear"></i> Admin Management</h1>
          <p class="typing-effect">Manage users and permissions for the KRI system</p>
        </div>
        <div class="header-stats animate-fade-in-right">
          <el-card class="stat-card pulse-hover" :class="{ 'animate-bounce-in': isLoaded }">
            <div class="stat-content">
              <i class="el-icon-user stat-icon icon-float"></i>
              <div class="stat-text">
                <div class="stat-number counter-animation" ref="userCounter">{{ animatedUserCount }}</div>
                <div class="stat-label glow-text">Users</div>
              </div>
            </div>
          </el-card>
          <el-card class="stat-card pulse-hover" :class="{ 'animate-bounce-in-delayed': isLoaded }">
            <div class="stat-content">
              <i class="el-icon-key stat-icon icon-float icon-delayed"></i>
              <div class="stat-text">
                <div class="stat-number counter-animation" ref="permissionCounter">{{ animatedPermissionCount }}</div>
                <div class="stat-label glow-text">Permissions</div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <div class="management-sections animate-stagger-up">
      <!-- User Management Section -->
      <el-card class="section-card user-section magical-card" :class="{ 'card-loaded': isLoaded }">
        <div slot="header" class="enhanced-section-header gradient-shimmer">
          <div class="section-title">
            <i class="el-icon-user-solid section-icon icon-rotate"></i>
            <div class="section-info">
              <h3>User Management</h3>
              <p>Add, edit, and manage system users</p>
            </div>
          </div>
          <el-button type="primary" size="medium" icon="el-icon-plus" @click="showAddUserDialog" class="add-button magical-button">
            <span class="button-text">Add New User</span>
            <div class="button-ripple"></div>
          </el-button>
        </div>

        <div class="table-container user-table-container">
          <el-table 
            :data="users" 
            v-loading="usersLoading"
            empty-text="No users found"
            class="enhanced-table"
            header-row-class-name="table-header"
            style="width: 100%"
          >
            <el-table-column prop="User_ID" label="User ID" width="140" sortable>
              <template slot-scope="scope">
                <div class="user-id-cell">
                  <el-avatar :size="32" :src="generateAvatar(scope.row.User_Name)" class="user-avatar">
                    {{ scope.row.User_Name ? scope.row.User_Name.charAt(0).toUpperCase() : 'U' }}
                  </el-avatar>
                  <span class="user-id-text">{{ scope.row.User_ID }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="User_Name" label="Display Name" min-width="180" sortable>
              <template slot-scope="scope">
                <div class="user-name-cell">
                  <span class="user-name">{{ scope.row.User_Name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="Department" label="Department" width="130" sortable>
              <template slot-scope="scope">
                <el-tag size="small" class="department-tag">
                  {{ scope.row.Department || 'Not Set' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="UUID" label="UUID" width="140" show-overflow-tooltip>
              <template slot-scope="scope">
                <el-tooltip :content="scope.row.UUID" placement="top">
                  <span class="uuid-text">{{ scope.row.UUID.substring(0, 8) }}...</span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="210" align="center">
              <template slot-scope="scope">
                <div class="action-buttons-container">
                  <el-button size="small" icon="el-icon-edit" @click="editUser(scope.row)" class="edit-btn">
                    Edit
                  </el-button>
                  <el-button size="small" type="danger" icon="el-icon-delete" @click="deleteUser(scope.row)" class="delete-btn">
                    Delete
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <!-- Permission Management Section -->
      <el-card class="section-card permission-section magical-card card-delayed" :class="{ 'card-loaded': isLoaded }">
        <div slot="header" class="enhanced-section-header gradient-shimmer">
          <div class="section-title">
            <i class="el-icon-key section-icon icon-rotate icon-delayed"></i>
            <div class="section-info">
              <h3>Permission Management</h3>
              <p>Control user access and permissions</p>
            </div>
          </div>
          <div class="permission-actions">
            <el-button type="primary" size="medium" icon="el-icon-plus" @click="showAddPermissionDialog" class="add-button magical-button">
              <span class="button-text">Add Permission</span>
              <div class="button-ripple"></div>
            </el-button>
            <el-dropdown trigger="click" @command="handleBatchCommand">
              <el-button type="success" size="medium" class="batch-button magical-button-success">
                <span class="button-text">Batch Actions <i class="el-icon-arrow-down el-icon--right arrow-bounce"></i></span>
                <div class="button-ripple"></div>
              </el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="grant" icon="el-icon-check">Batch Grant</el-dropdown-item>
                <el-dropdown-item command="revoke" icon="el-icon-close">Batch Revoke</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>

        <div class="permission-content">
          <div class="permission-filters">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-select 
                  v-model="permissionFilter.userId" 
                  placeholder="Filter by User" 
                  clearable 
                  filterable
                  class="filter-select"
                >
                  <el-option v-for="user in users" :key="user.UUID" :label="`${user.User_ID} (${user.User_Name})`" :value="user.UUID">
                    <div class="user-option">
                      <el-avatar :size="24" class="option-avatar">
                        {{ user.User_Name ? user.User_Name.charAt(0).toUpperCase() : 'U' }}
                      </el-avatar>
                      <span>{{ user.User_ID }} ({{ user.User_Name }})</span>
                    </div>
                  </el-option>
                </el-select>
              </el-col>
              <el-col :span="6">
                <el-input 
                  v-model="permissionFilter.kriId" 
                  placeholder="Filter by KRI ID" 
                  clearable 
                  class="filter-input"
                  prefix-icon="el-icon-search"
                />
              </el-col>
              <el-col :span="4">
                <el-button type="primary" @click="loadPermissions" class="filter-button" icon="el-icon-refresh">
                  Refresh
                </el-button>
              </el-col>
            </el-row>
          </div>

          <div class="permission-table-actions" v-if="selectedPermissions.length > 0">
            <div class="selection-info">
              <i class="el-icon-check"></i>
              <span>{{ selectedPermissions.length }} permissions selected</span>
            </div>
            <el-button size="small" type="danger" icon="el-icon-delete" @click="batchDeletePermissions" class="danger-button">
              Delete Selected
            </el-button>
          </div>

          <div class="table-container permission-table-container">
            <el-table 
              :data="filteredPermissions" 
              v-loading="permissionsLoading"
              @selection-change="handlePermissionSelectionChange"
              empty-text="No permissions found"
              class="enhanced-table permission-table"
              header-row-class-name="table-header"
              style="width: 100%"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="user_id" label="User" width="140" sortable>
                <template slot-scope="scope">
                  <div class="user-cell">
                    <el-avatar :size="28" class="user-avatar-small">
                      {{ scope.row.user_id.charAt(0).toUpperCase() }}
                    </el-avatar>
                    <span class="user-text">{{ scope.row.user_id }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="kri_id" label="KRI ID" width="100" sortable>
                <template slot-scope="scope">
                  <el-tag size="small" type="info" class="kri-tag">
                    {{ scope.row.kri_id }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="reporting_date" label="Reporting Date" width="120" sortable>
                <template slot-scope="scope">
                  <span class="date-text">{{ formatReportingDate(scope.row.reporting_date) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="actions" label="Actions" min-width="160">
                <template slot-scope="scope">
                  <div class="actions-tags">
                    <el-tag 
                      v-for="action in scope.row.actions.split(',')" 
                      :key="action" 
                      size="mini" 
                      class="action-tag"
                      :type="getActionTagType(action.trim())"
                    >
                      {{ formatActionText(action.trim()) }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="effect" label="Effect" width="80">
                <template slot-scope="scope">
                  <el-tag :type="scope.row.effect ? 'success' : 'danger'" size="small" class="effect-tag">
                    <i :class="scope.row.effect ? 'el-icon-check' : 'el-icon-close'"></i>
                    {{ scope.row.effect ? 'Allow' : 'Deny' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="Operations" width="190" align="center">
                <template slot-scope="scope">
                  <div class="action-buttons-container">
                    <el-button size="small" icon="el-icon-edit" @click="editPermission(scope.row)" class="edit-btn">
                      Edit
                    </el-button>
                    <el-button size="small" type="danger" icon="el-icon-delete" @click="deletePermission(scope.row)" class="delete-btn">
                      Delete
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Add/Edit User Dialog -->
    <el-dialog :title="userDialogTitle" :visible.sync="userDialogVisible" width="500px">
      <el-form :model="userForm" :rules="userRules" ref="userForm" label-width="120px">
        <el-form-item label="User ID" prop="User_ID">
          <el-input v-model="userForm.User_ID" :disabled="isEditingUser" />
        </el-form-item>
        <el-form-item label="Display Name" prop="User_Name">
          <el-input v-model="userForm.User_Name" />
        </el-form-item>
        <el-form-item label="Department" prop="Department">
          <el-input v-model="userForm.Department" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="userDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="saveUser" :loading="userSaving">
          {{ isEditingUser ? 'Update' : 'Create' }}
        </el-button>
      </div>
    </el-dialog>

    <!-- Add/Edit Permission Dialog -->
    <el-dialog :title="permissionDialogTitle" :visible.sync="permissionDialogVisible" width="600px">
      <el-form :model="permissionForm" :rules="permissionRules" ref="permissionForm" label-width="120px">
        <el-form-item label="User" prop="user_uuid">
          <el-select v-model="permissionForm.user_uuid" placeholder="Select User" :disabled="isEditingPermission">
            <el-option v-for="user in users" :key="user.UUID" :label="`${user.User_ID} (${user.User_Name})`" :value="user.UUID" />
          </el-select>
        </el-form-item>
        <el-form-item label="KRI ID" prop="kri_id">
          <el-input-number v-model="permissionForm.kri_id" :min="1" :disabled="isEditingPermission" />
        </el-form-item>
        <el-form-item label="Reporting Date" prop="reporting_date">
          <el-input-number v-model="permissionForm.reporting_date" :min="20200101" :max="30001231" :disabled="isEditingPermission" />
        </el-form-item>
        <el-form-item label="Actions" prop="actions">
          <el-checkbox-group v-model="permissionForm.selectedActions">
            <el-checkbox label="view">View</el-checkbox>
            <el-checkbox label="edit">Edit</el-checkbox>
            <el-checkbox label="review">Review</el-checkbox>
            <el-checkbox label="acknowledge">Acknowledge</el-checkbox>
            <el-checkbox label="delete">Delete</el-checkbox>
            <el-checkbox label="other">Other</el-checkbox>
          </el-checkbox-group>
          <div v-if="permissionForm.selectedActions.includes('other')" style="margin-top: 8px;">
            <el-input
              v-model="permissionForm.otherAction"
              placeholder="Enter custom action"
              size="small"
              style="width: 200px;"
            />
          </div>
        </el-form-item>
        <el-form-item label="Effect" prop="effect">
          <el-radio-group v-model="permissionForm.effect">
            <el-radio :label="true">Allow</el-radio>
            <el-radio :label="false">Deny</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="permissionDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="savePermission" :loading="permissionSaving">
          {{ isEditingPermission ? 'Update Permission' : 'Add Permission' }}
        </el-button>
      </div>
    </el-dialog>

    <!-- Batch Grant Dialog -->
    <el-dialog title="Batch Grant Permissions" :visible.sync="batchGrantDialogVisible" width="600px">
      <el-form :model="batchForm" :rules="batchRules" ref="batchForm" label-width="120px">
        <el-form-item label="User" prop="user_uuid">
          <el-select v-model="batchForm.user_uuid" placeholder="Select User">
            <el-option v-for="user in users" :key="user.UUID" :label="`${user.User_ID} (${user.User_Name})`" :value="user.UUID" />
          </el-select>
        </el-form-item>
        <el-form-item label="KRI ID" prop="kri_id">
          <el-input-number v-model="batchForm.kri_id" :min="1" placeholder="Grant to all KRIs with this ID" />
        </el-form-item>
        <el-form-item label="Actions" prop="actions">
          <el-checkbox-group v-model="batchForm.selectedActions">
            <el-checkbox label="view">View</el-checkbox>
            <el-checkbox label="edit">Edit</el-checkbox>
            <el-checkbox label="review">Review</el-checkbox>
            <el-checkbox label="acknowledge">Acknowledge</el-checkbox>
            <el-checkbox label="delete">Delete</el-checkbox>
            <el-checkbox label="other">Other</el-checkbox>
          </el-checkbox-group>
          <div v-if="batchForm.selectedActions.includes('other')" style="margin-top: 8px;">
            <el-input
              v-model="batchForm.otherAction"
              placeholder="Enter custom action"
              size="small"
              style="width: 200px;"
            />
          </div>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="batchGrantDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="batchGrant" :loading="batchOperationLoading">Grant Permissions</el-button>
      </div>
    </el-dialog>

    <!-- Batch Revoke Dialog -->
    <el-dialog title="Batch Revoke Permissions" :visible.sync="batchRevokeDialogVisible" width="600px">
      <el-form :model="batchRevokeForm" :rules="batchRevokeRules" ref="batchRevokeForm" label-width="120px">
        <el-form-item label="User" prop="user_uuid">
          <el-select v-model="batchRevokeForm.user_uuid" placeholder="Select User">
            <el-option v-for="user in users" :key="user.UUID" :label="`${user.User_ID} (${user.User_Name})`" :value="user.UUID" />
          </el-select>
        </el-form-item>
        <el-form-item label="KRI ID" prop="kri_id">
          <el-input-number v-model="batchRevokeForm.kri_id" :min="1" placeholder="Revoke from all KRIs with this ID" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="batchRevokeDialogVisible = false">Cancel</el-button>
        <el-button type="danger" @click="batchRevoke" :loading="batchOperationLoading">Revoke Permissions</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { supabase } from '@/services/supabase';

export default {
  name: 'AdminManagement',
  data() {
    return {
      // Animation states
      isLoaded: false,
      animatedUserCount: 0,
      animatedPermissionCount: 0,
      
      // User Management
      users: [],
      usersLoading: false,
      userDialogVisible: false,
      userSaving: false,
      isEditingUser: false,
      userForm: {
        UUID: null,
        User_ID: '',
        User_Name: '',
        Department: ''
      },
      userRules: {
        User_ID: [{ required: true, message: 'User ID is required', trigger: 'blur' }],
        User_Name: [{ required: true, message: 'Display Name is required', trigger: 'blur' }]
      },

      // Permission Management
      permissions: [],
      permissionsLoading: false,
      permissionDialogVisible: false,
      permissionSaving: false,
      isEditingPermission: false,
      selectedPermissions: [],
      originalPermission: null, // Store original permission for editing
      permissionForm: {
        user_uuid: '',
        kri_id: null,
        reporting_date: null,
        selectedActions: [],
        otherAction: '',
        effect: true
      },
      permissionRules: {
        user_uuid: [{ required: true, message: 'User is required', trigger: 'change' }],
        kri_id: [{ required: true, message: 'KRI ID is required', trigger: 'blur' }],
        reporting_date: [{ required: true, message: 'Reporting Date is required', trigger: 'blur' }],
        selectedActions: [{ required: true, message: 'At least one action is required', trigger: 'change' }]
      },
      permissionFilter: {
        userId: '',
        kriId: ''
      },

      // Batch Operations
      batchGrantDialogVisible: false,
      batchRevokeDialogVisible: false,
      batchOperationLoading: false,
      batchForm: {
        user_uuid: '',
        kri_id: null,
        selectedActions: [],
        otherAction: ''
      },
      batchRules: {
        user_uuid: [{ required: true, message: 'User is required', trigger: 'change' }],
        kri_id: [{ required: true, message: 'KRI ID is required', trigger: 'blur' }],
        selectedActions: [{ required: true, message: 'At least one action is required', trigger: 'change' }]
      },
      batchRevokeForm: {
        user_uuid: '',
        kri_id: null
      },
      batchRevokeRules: {
        user_uuid: [{ required: true, message: 'User is required', trigger: 'change' }],
        kri_id: [{ required: true, message: 'KRI ID is required', trigger: 'blur' }]
      }
    };
  },
  watch: {
    users: {
      handler() {
        this.$nextTick(() => {
          setTimeout(() => {
            this.setupTableAnimations();
          }, 100);
        });
      },
      deep: true
    },
    permissions: {
      handler() {
        this.$nextTick(() => {
          setTimeout(() => {
            this.setupTableAnimations();
          }, 100);
        });
      },
      deep: true
    }
  },
  computed: {
    userDialogTitle() {
      return this.isEditingUser ? 'Edit User' : 'Add User';
    },
    permissionDialogTitle() {
      return this.isEditingPermission ? 'Edit Permission' : 'Add Permission';
    },
    filteredPermissions() {
      let filtered = [...this.permissions];
      
      if (this.permissionFilter.userId) {
        filtered = filtered.filter(p => p.user_uuid === this.permissionFilter.userId);
      }
      
      if (this.permissionFilter.kriId) {
        filtered = filtered.filter(p => String(p.kri_id).includes(this.permissionFilter.kriId));
      }
      
      return filtered;
    }
  },
  async created() {
    try {
      await this.loadUsers();
      await this.loadPermissions();
      
      // Trigger animations after data loads
      this.$nextTick(() => {
        setTimeout(() => {
          this.isLoaded = true;
          this.animateCounters();
        }, 300);
      });
    } catch (error) {
      console.error('Failed to initialize admin management:', error);
      this.isLoaded = true; // Still show UI even if data loading fails
    }
  },
  
  mounted() {
    // Initialize particles
    this.initializeParticles();
    
    // Set up intersection observer for table row animations if needed
    this.setupTableAnimations();
  },
  methods: {
    // User Management Methods
    async loadUsers() {
      this.usersLoading = true;
      try {
        const { data, error } = await supabase
          .from('kri_user')
          .select('*')
          .order('User_ID');
        
        if (error) throw error;
        this.users = data || [];
        
        // Update counter animation if page is already loaded
        if (this.isLoaded) {
          this.animateCounter(this.animatedUserCount, this.users.length, 800, (value) => {
            this.animatedUserCount = value;
          });
        }
      } catch (error) {
        this.$message.error('Failed to load users: ' + error.message);
      } finally {
        this.usersLoading = false;
      }
    },

    showAddUserDialog() {
      this.isEditingUser = false;
      this.userForm = {
        UUID: null,
        User_ID: '',
        User_Name: '',
        Department: ''
      };
      this.userDialogVisible = true;
    },

    editUser(user) {
      this.isEditingUser = true;
      this.userForm = { ...user };
      this.userDialogVisible = true;
    },

    async saveUser() {
      this.$refs.userForm.validate(async (valid) => {
        if (!valid) return;
        
        this.userSaving = true;
        try {
          let result;
          if (this.isEditingUser) {
            result = await supabase
              .from('kri_user')
              .update({
                User_Name: this.userForm.User_Name,
                Department: this.userForm.Department
              })
              .eq('UUID', this.userForm.UUID);
          } else {
            result = await supabase
              .from('kri_user')
              .insert({
                User_ID: this.userForm.User_ID,
                User_Name: this.userForm.User_Name,
                Department: this.userForm.Department
              });
          }
          
          if (result.error) throw result.error;
          
          this.$message.success(this.isEditingUser ? 'User updated successfully' : 'User created successfully');
          this.userDialogVisible = false;
          await this.loadUsers();
        } catch (error) {
          this.$message.error('Failed to save user: ' + error.message);
        } finally {
          this.userSaving = false;
        }
      });
    },

    async deleteUser(user) {
      try {
        await this.$confirm('Are you sure you want to delete this user? This will also delete all their permissions.', 'Confirm Delete', {
          type: 'warning'
        });
        
        // First delete all permissions for this user
        await supabase
          .from('kri_user_permission')
          .delete()
          .eq('user_uuid', user.UUID);
        
        // Then delete the user
        const { error } = await supabase
          .from('kri_user')
          .delete()
          .eq('UUID', user.UUID);
        
        if (error) throw error;
        
        this.$message.success('User deleted successfully');
        await this.loadUsers();
        await this.loadPermissions();
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('Failed to delete user: ' + error.message);
        }
      }
    },

    // Permission Management Methods
    async loadPermissions() {
      this.permissionsLoading = true;
      try {
        const { data, error } = await supabase
          .from('kri_user_permission')
          .select(`
            *,
            kri_user!inner(User_ID)
          `)
          .order('kri_id')
          .order('reporting_date');
        
        if (error) throw error;
        
        // Add user_id for display
        this.permissions = (data || []).map(permission => ({
          ...permission,
          user_id: permission.kri_user.User_ID
        }));
        
        // Update counter animation if page is already loaded
        if (this.isLoaded) {
          this.animateCounter(this.animatedPermissionCount, this.permissions.length, 800, (value) => {
            this.animatedPermissionCount = value;
          });
        }
      } catch (error) {
        this.$message.error('Failed to load permissions: ' + error.message);
      } finally {
        this.permissionsLoading = false;
        
        // Setup table animations after data loads
        this.$nextTick(() => {
          this.setupTableAnimations();
        });
      }
    },

    showAddPermissionDialog() {
      this.isEditingPermission = false;
      this.originalPermission = null;
      this.permissionForm = {
        user_uuid: '',
        kri_id: null,
        reporting_date: null,
        selectedActions: [],
        otherAction: '',
        effect: true
      };
      this.permissionDialogVisible = true;
    },

    editPermission(permission) {
      this.isEditingPermission = true;
      this.originalPermission = { ...permission };
      
      // Parse actions back into array for the form
      const actions = permission.actions.split(',').map(action => action.trim());
      const predefinedActions = ['view', 'edit', 'review', 'acknowledge', 'delete'];
      const selectedActions = [];
      let otherAction = '';
      
      actions.forEach(action => {
        if (predefinedActions.includes(action)) {
          selectedActions.push(action);
        } else {
          // Only add 'other' once, even if there are multiple custom actions
          if (!selectedActions.includes('other')) {
            selectedActions.push('other');
          }
          // Use the first custom action, or combine them
          otherAction = otherAction ? `${otherAction},${action}` : action;
        }
      });
      
      this.permissionForm = {
        user_uuid: permission.user_uuid,
        kri_id: permission.kri_id,
        reporting_date: permission.reporting_date,
        selectedActions: selectedActions,
        otherAction: otherAction,
        effect: permission.effect
      };
      this.permissionDialogVisible = true;
    },

    // Helper method to process actions including custom "other" action
    processActions(selectedActions, otherAction) {
      let actions = [...selectedActions];
      
      // If "other" is selected and there's a custom action, replace "other" with the custom action
      if (actions.includes('other') && otherAction && otherAction.trim()) {
        const otherIndex = actions.indexOf('other');
        actions[otherIndex] = otherAction.trim();
      } else if (actions.includes('other')) {
        // Remove "other" if no custom action is provided
        actions = actions.filter(action => action !== 'other');
      }
      
      return actions.join(',');
    },

    async savePermission() {
      this.$refs.permissionForm.validate(async (valid) => {
        if (!valid) return;
        
        // Validate that if "other" is selected, a custom action is provided
        if (this.permissionForm.selectedActions.includes('other') && !this.permissionForm.otherAction.trim()) {
          this.$message.error('Please enter a custom action for "Other"');
          return;
        }
        
        this.permissionSaving = true;
        try {
          const actions = this.processActions(this.permissionForm.selectedActions, this.permissionForm.otherAction);
          
          if (!actions) {
            this.$message.error('Please select at least one action');
            return;
          }
          
          let result;
          
          if (this.isEditingPermission) {
            // Delete the old permission first (since primary key might change)
            await supabase
              .from('kri_user_permission')
              .delete()
              .eq('user_uuid', this.originalPermission.user_uuid)
              .eq('kri_id', this.originalPermission.kri_id)
              .eq('reporting_date', this.originalPermission.reporting_date)
              .eq('actions', this.originalPermission.actions);
          }
          
          // Insert/update the permission
          result = await supabase
            .from('kri_user_permission')
            .upsert({
              user_uuid: this.permissionForm.user_uuid,
              kri_id: this.permissionForm.kri_id,
              reporting_date: this.permissionForm.reporting_date,
              actions: actions,
              effect: this.permissionForm.effect
            });
          
          const { error } = result;
          
          if (error) throw error;
          
          this.$message.success(this.isEditingPermission ? 'Permission updated successfully' : 'Permission added successfully');
          this.permissionDialogVisible = false;
          await this.loadPermissions();
        } catch (error) {
          this.$message.error('Failed to save permission: ' + error.message);
        } finally {
          this.permissionSaving = false;
        }
      });
    },

    async deletePermission(permission) {
      try {
        await this.$confirm('Are you sure you want to delete this permission?', 'Confirm Delete', {
          type: 'warning'
        });
        
        const { error } = await supabase
          .from('kri_user_permission')
          .delete()
          .eq('user_uuid', permission.user_uuid)
          .eq('kri_id', permission.kri_id)
          .eq('reporting_date', permission.reporting_date)
          .eq('actions', permission.actions);
        
        if (error) throw error;
        
        this.$message.success('Permission deleted successfully');
        await this.loadPermissions();
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('Failed to delete permission: ' + error.message);
        }
      }
    },

    // Batch Operations
    showBatchGrantDialog() {
      this.batchForm = {
        user_uuid: '',
        kri_id: null,
        selectedActions: [],
        otherAction: ''
      };
      this.batchGrantDialogVisible = true;
    },

    showBatchRevokeDialog() {
      this.batchRevokeForm = {
        user_uuid: '',
        kri_id: null
      };
      this.batchRevokeDialogVisible = true;
    },

    async batchGrant() {
      this.$refs.batchForm.validate(async (valid) => {
        if (!valid) return;
        
        // Validate that if "other" is selected, a custom action is provided
        if (this.batchForm.selectedActions.includes('other') && !this.batchForm.otherAction.trim()) {
          this.$message.error('Please enter a custom action for "Other"');
          return;
        }
        
        this.batchOperationLoading = true;
        try {
          // Get all reporting dates for the specified KRI ID
          const { data: kriItems, error: kriError } = await supabase
            .from('kri_item')
            .select('reporting_date')
            .eq('kri_id', this.batchForm.kri_id);
          
          if (kriError) throw kriError;
          
          if (!kriItems || kriItems.length === 0) {
            this.$message.warning('No KRIs found with the specified ID');
            return;
          }
          
          const actions = this.processActions(this.batchForm.selectedActions, this.batchForm.otherAction);
          
          if (!actions) {
            this.$message.error('Please select at least one action');
            return;
          }
          
          const permissions = kriItems.map(item => ({
            user_uuid: this.batchForm.user_uuid,
            kri_id: this.batchForm.kri_id,
            reporting_date: item.reporting_date,
            actions: actions,
            effect: true
          }));
          
          const { error } = await supabase
            .from('kri_user_permission')
            .upsert(permissions);
          
          if (error) throw error;
          
          this.$message.success(`Batch granted ${permissions.length} permissions successfully`);
          this.batchGrantDialogVisible = false;
          await this.loadPermissions();
        } catch (error) {
          this.$message.error('Failed to batch grant permissions: ' + error.message);
        } finally {
          this.batchOperationLoading = false;
        }
      });
    },

    async batchRevoke() {
      this.$refs.batchRevokeForm.validate(async (valid) => {
        if (!valid) return;
        
        this.batchOperationLoading = true;
        try {
          const { error } = await supabase
            .from('kri_user_permission')
            .delete()
            .eq('user_uuid', this.batchRevokeForm.user_uuid)
            .eq('kri_id', this.batchRevokeForm.kri_id);
          
          if (error) throw error;
          
          this.$message.success('Batch revoked permissions successfully');
          this.batchRevokeDialogVisible = false;
          await this.loadPermissions();
        } catch (error) {
          this.$message.error('Failed to batch revoke permissions: ' + error.message);
        } finally {
          this.batchOperationLoading = false;
        }
      });
    },

    // UI Helper Methods
    generateAvatar(_name) {
      // Simple avatar generation - could be enhanced with a service
      return null; // Let Element UI generate default avatar
    },

    formatReportingDate(dateInt) {
      if (!dateInt) return '';
      const dateString = dateInt.toString();
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      return `${year}-${month}-${day}`;
    },

    formatActionText(action) {
      const actionMap = {
        'view': 'View',
        'edit': 'Edit',
        'review': 'Review',
        'acknowledge': 'Acknowledge',
        'delete': 'Delete'
      };
      return actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1);
    },

    getActionTagType(action) {
      const typeMap = {
        'view': '',
        'edit': 'warning',
        'review': 'info',
        'acknowledge': 'success',
        'delete': 'danger'
      };
      return typeMap[action] || 'info';
    },

    handleBatchCommand(command) {
      if (command === 'grant') {
        this.showBatchGrantDialog();
      } else if (command === 'revoke') {
        this.showBatchRevokeDialog();
      }
    },

    // Permission selection and batch operations
    handlePermissionSelectionChange(selection) {
      this.selectedPermissions = selection;
    },

    async batchDeletePermissions() {
      if (this.selectedPermissions.length === 0) {
        this.$message.warning('Please select permissions to delete');
        return;
      }

      try {
        await this.$confirm(`Are you sure you want to delete ${this.selectedPermissions.length} selected permissions?`, 'Confirm Batch Delete', {
          type: 'warning'
        });

        const deletePromises = this.selectedPermissions.map(permission =>
          supabase
            .from('kri_user_permission')
            .delete()
            .eq('user_uuid', permission.user_uuid)
            .eq('kri_id', permission.kri_id)
            .eq('reporting_date', permission.reporting_date)
            .eq('actions', permission.actions)
        );

        await Promise.all(deletePromises);

        this.$message.success(`Successfully deleted ${this.selectedPermissions.length} permissions`);
        this.selectedPermissions = [];
        await this.loadPermissions();
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('Failed to delete permissions: ' + error.message);
        }
      }
    },
    
    // Animation Methods
    animateCounters() {
      try {
        // Safely animate user count
        const userCount = Array.isArray(this.users) ? this.users.length : 0;
        this.animateCounter(0, userCount, 1500, (value) => {
          this.animatedUserCount = value;
        });
        
        // Delay permission count animation
        setTimeout(() => {
          const permissionCount = Array.isArray(this.permissions) ? this.permissions.length : 0;
          this.animateCounter(0, permissionCount, 1500, (value) => {
            this.animatedPermissionCount = value;
          });
        }, 200);
      } catch (error) {
        console.warn('Counter animation failed:', error);
        // Fallback to immediate values
        this.animatedUserCount = Array.isArray(this.users) ? this.users.length : 0;
        this.animatedPermissionCount = Array.isArray(this.permissions) ? this.permissions.length : 0;
      }
    },
    
    animateCounter(start, end, duration, callback) {
      // Prevent animation if values are the same or invalid
      if (start === end || typeof start !== 'number' || typeof end !== 'number') {
        callback(end);
        return;
      }
      
      const startTime = performance.now();
      const range = end - start;
      
      const updateCounter = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(start + (range * easeOutQuart));
        
        if (typeof callback === 'function') {
          callback(currentValue);
        }
        
        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        }
      };
      
      requestAnimationFrame(updateCounter);
    },
    
    getParticleStyle(_index) {
      try {
        const size = Math.max(2, Math.random() * 4 + 2); // Ensure minimum size
        const duration = Math.max(10, Math.random() * 20 + 10); // Ensure minimum duration
        const delay = Math.max(0, Math.random() * 5); // Ensure non-negative delay
        const left = Math.max(0, Math.min(100, Math.random() * 100)); // Clamp between 0-100
        const opacity = Math.max(0.1, Math.min(0.7, Math.random() * 0.5 + 0.2)); // Clamp opacity
        
        return {
          width: `${size}px`,
          height: `${size}px`,
          left: `${left}%`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          opacity: opacity
        };
      } catch (error) {
        console.warn('Particle style generation failed:', error);
        return {
          width: '3px',
          height: '3px',
          left: '50%',
          animationDuration: '15s',
          animationDelay: '0s',
          opacity: 0.3
        };
      }
    },
    
    initializeParticles() {
      // Additional particle initialization if needed
      // Could add dynamic particle generation here if needed
    },
    
    setupTableAnimations() {
      // Setup table row stagger animations and hover effects
      this.$nextTick(() => {
        try {
          // Use a more aggressive selector to find all table rows
          const tables = document.querySelectorAll('.admin-management .enhanced-table');
          tables.forEach(table => {
            const rows = table.querySelectorAll('tbody tr');
            if (rows && rows.length > 0) {
              rows.forEach((row, index) => {
                if (row && row.style) {
                  row.style.animationDelay = `${index * 0.1}s`;
                  row.classList.add('table-row-animate');
                  
                  // Remove existing listeners to prevent duplicates
                  row.removeEventListener('mouseenter', this.handleRowHover);
                  row.removeEventListener('mouseleave', this.handleRowLeave);
                  
                  // Add JavaScript hover effects as primary method
                  row.addEventListener('mouseenter', this.handleRowHover);
                  row.addEventListener('mouseleave', this.handleRowLeave);
                }
              });
            }
          });
        } catch (error) {
          console.warn('Table animation setup failed:', error);
        }
      });
    },
    
    handleRowHover(e) {
      const row = e.currentTarget;
      row.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
      row.style.transform = 'translateX(8px)';
      row.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.2)';
      row.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      row.style.position = 'relative';
      row.style.zIndex = '10';
      
      // Add left border accent
      if (!row.querySelector('.hover-accent')) {
        const accent = document.createElement('div');
        accent.className = 'hover-accent';
        accent.style.cssText = `
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 5px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 0 3px 3px 0;
          z-index: 11;
          pointer-events: none;
        `;
        row.appendChild(accent);
      }
    },
    
    handleRowLeave(e) {
      const row = e.currentTarget;
      row.style.background = '';
      row.style.transform = '';
      row.style.boxShadow = '';
      row.style.zIndex = '';
      
      // Remove accent border
      const accent = row.querySelector('.hover-accent');
      if (accent) {
        accent.remove();
      }
    }
  }
};
</script>

<style scoped>
.admin-management {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
  padding: 0;
  position: relative;
  overflow-x: hidden;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Floating Particles */
.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.particle {
  position: absolute;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: float linear infinite;
}

@keyframes float {
  0% {
    transform: translateY(100vh) rotate(0deg);
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
  }
}

/* Floating Orbs */
.floating-orbs {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(1px);
  animation: floatOrb 15s ease-in-out infinite;
}

.orb-1 {
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 70%, transparent 100%);
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.orb-2 {
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 70%, transparent 100%);
  top: 60%;
  right: 15%;
  animation-delay: -5s;
}

.orb-3 {
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 70%, transparent 100%);
  bottom: 30%;
  left: 20%;
  animation-delay: -10s;
}

@keyframes floatOrb {
  0%, 100% {
    transform: translateY(0px) translateX(0px) scale(1);
  }
  25% {
    transform: translateY(-20px) translateX(10px) scale(1.1);
  }
  50% {
    transform: translateY(0px) translateX(20px) scale(0.9);
  }
  75% {
    transform: translateY(10px) translateX(-10px) scale(1.05);
  }
}

/* Page Entrance Animations */
.animate-slide-down {
  animation: slideDown 0.8s ease-out forwards;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-fade-in-up {
  animation: fadeInUp 1s ease-out 0.3s forwards;
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-fade-in-right {
  animation: fadeInRight 1s ease-out 0.6s forwards;
  opacity: 0;
}

@keyframes fadeInRight {
  from {
    transform: translateX(50px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-stagger-up {
  animation: staggerUp 0.8s ease-out 0.9s forwards;
  opacity: 0;
}

@keyframes staggerUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Card Animations */
.magical-card {
  transform: translateY(50px);
  opacity: 0;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.magical-card.card-loaded {
  transform: translateY(0);
  opacity: 1;
}

.magical-card.card-delayed {
  transition-delay: 0.3s;
}

.animate-bounce-in {
  animation: bounceIn 1s ease-out 1.2s forwards;
  opacity: 0;
}

.animate-bounce-in-delayed {
  animation: bounceIn 1s ease-out 1.4s forwards;
  opacity: 0;
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  70% {
    transform: scale(0.95);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Text Animations */
.animated-title {
  background: linear-gradient(45deg, #667eea, #764ba2, #667eea);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: titleGradient 3s ease infinite;
}

@keyframes titleGradient {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.spinning-gear {
  animation: spin 3s linear infinite;
  transform-origin: center;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.typing-effect {
  overflow: hidden;
  border-right: 2px solid #667eea;
  animation: typing 2s steps(40) 1s forwards, blink 1s infinite;
  white-space: nowrap;
  width: 0;
}

@keyframes typing {
  from { width: 0 }
  to { width: 100% }
}

@keyframes blink {
  0%, 50% { border-color: #667eea }
  51%, 100% { border-color: transparent }
}

/* Icon Animations */
.icon-float {
  animation: iconFloat 2s ease-in-out infinite;
}

.icon-delayed {
  animation-delay: 0.5s;
}

@keyframes iconFloat {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.icon-rotate {
  animation: rotateY 4s ease-in-out infinite;
}

@keyframes rotateY {
  0%, 100% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(180deg);
  }
}

/* Counter Animation */
.counter-animation {
  font-weight: 700;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.glow-text {
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  from {
    text-shadow: 0 0 5px rgba(102, 126, 234, 0.5);
  }
  to {
    text-shadow: 0 0 20px rgba(102, 126, 234, 0.8), 0 0 30px rgba(102, 126, 234, 0.6);
  }
}

/* Button Animations */
.magical-button {
  position: relative;
  overflow: hidden;
  background: linear-gradient(45deg, #667eea, #764ba2);
  border: none;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.magical-button:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5) !important;
  background: linear-gradient(45deg, #5a67d8, #6b46c1) !important;
}

.magical-button:active {
  transform: translateY(-1px);
}

.magical-button-success {
  position: relative;
  overflow: hidden;
  background: linear-gradient(45deg, #48bb78, #38a169);
  border: none;
  box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.magical-button-success:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 8px 25px rgba(72, 187, 120, 0.5) !important;
  background: linear-gradient(45deg, #38a169, #2f855a) !important;
}

.button-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.magical-button:active .button-ripple,
.magical-button-success:active .button-ripple {
  width: 300px;
  height: 300px;
}

.button-text {
  position: relative;
  z-index: 2;
}

.arrow-bounce {
  animation: arrowBounce 1s ease-in-out infinite;
}

@keyframes arrowBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

/* Hover Effects */
.pulse-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pulse-hover:hover {
  transform: translateY(-5px) scale(1.02) !important;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2) !important;
}

/* Gradient Shimmer Effect */
.gradient-shimmer {
  position: relative;
  overflow: hidden;
}

.gradient-shimmer::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Table Row Animations */
.table-row-animate {
  animation: slideInRow 0.6s ease-out forwards;
  opacity: 0;
  transform: translateX(-20px);
}

@keyframes slideInRow {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Loading State Animations */
.enhanced-table.is-loading {
  position: relative;
}

.enhanced-table.is-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  animation: loadingBar 2s ease-in-out infinite;
}

@keyframes loadingBar {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Form Input Enhancements */
.el-form-item >>> .el-input__inner {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.el-form-item >>> .el-input__inner:focus {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.el-form-item >>> .el-select .el-input__inner {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.el-form-item >>> .el-select:hover .el-input__inner {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

/* Enhanced Header */
.page-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 32px 0;
  margin-bottom: 32px;
  position: relative;
  z-index: 10;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

.header-text h1 {
  font-size: 32px;
  color: #2c3e50;
  margin: 0 0 8px 0;
  font-weight: 700;
}

.header-text h1 i {
  margin-right: 12px;
  color: #667eea;
}

.header-text p {
  color: #7f8c8d;
  margin: 0;
  font-size: 16px;
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat-card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 15px 40px rgba(102, 126, 234, 0.3);
}

.stat-card:hover::before {
  transform: scaleX(1);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 8px;
}

.stat-icon {
  font-size: 24px;
  color: #667eea;
  margin-right: 12px;
}

.stat-text {
  text-align: left;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.management-sections {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 32px;
}

.section-card {
  border: none;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  position: relative;
}

.section-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.section-card:hover {
  transform: translateY(-8px) scale(1.01);
  box-shadow: 0 20px 60px rgba(102, 126, 234, 0.2);
}

.section-card:hover::before {
  opacity: 1;
}

.enhanced-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.section-icon {
  font-size: 28px;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 12px;
  border-radius: 12px;
}

.section-info h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.section-info p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

.add-button, .batch-button {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-button:hover, .batch-button:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

/* Permission Content */
.permission-content {
  padding: 24px;
}

.permission-filters {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.filter-select,
.filter-input {
  width: 100%;
}

.filter-button {
  width: 100%;
  border-radius: 8px;
}

.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-avatar {
  flex-shrink: 0;
}

/* Table Container */
.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  width: 100%;
}

.enhanced-table {
  border: none;
  border-spacing: 0;
  width: 100%;
  table-layout: fixed;
}

.enhanced-table >>> .el-table__header {
  background: #f8fafc;
}

.enhanced-table >>> .el-table__header th {
  background: #f8fafc !important;
  color: #374151 !important;
  font-weight: 600;
  border: none;
  padding: 14px 16px;
  height: 48px;
}

/* Table Row Styles with Maximum Specificity */
.admin-management .enhanced-table table tbody tr {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  height: 60px !important;
  position: relative !important;
  cursor: pointer !important;
}

.admin-management .enhanced-table table tbody tr:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
  transform: translateX(8px) !important;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2) !important;
  z-index: 10 !important;
}

.admin-management .enhanced-table table tbody tr:hover::before {
  content: '' !important;
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  height: 100% !important;
  width: 5px !important;
  background: linear-gradient(135deg, #667eea, #764ba2) !important;
  border-radius: 0 3px 3px 0 !important;
  z-index: 11 !important;
}

/* Alternative approach using CSS variables and direct targeting */
.admin-management .section-card .el-table .el-table__body-wrapper .el-table__body tbody tr:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
  transform: translateX(8px) !important;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2) !important;
}

/* Nuclear option - highest specificity possible */
.admin-management .management-sections .section-card .table-container .enhanced-table .el-table__body-wrapper .el-table__body tbody tr:hover,
.admin-management .user-section .table-container .enhanced-table tbody tr:hover,
.admin-management .permission-section .table-container .enhanced-table tbody tr:hover,
html body .admin-management .enhanced-table tbody tr:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
  transform: translateX(8px) !important;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
  z-index: 10 !important;
}

/* For the hover accent border */
html body .admin-management .enhanced-table tbody tr:hover::before {
  content: '' !important;
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  height: 100% !important;
  width: 5px !important;
  background: linear-gradient(135deg, #667eea, #764ba2) !important;
  border-radius: 0 3px 3px 0 !important;
  z-index: 11 !important;
}

.enhanced-table >>> .el-table__body td {
  border: none;
  padding: 12px 16px;
  vertical-align: middle;
}

.enhanced-table >>> .el-table__body tr + tr td {
  border-top: 1px solid #f1f5f9;
}

/* User Table Specific Styling */
.user-table-container {
  margin-top: 24px;
}

.user-section .enhanced-table >>> .el-table__body td {
  padding: 14px 16px;
}

.user-section .enhanced-table >>> .el-table__header th {
  padding: 16px 16px;
  height: 52px;
}

.user-section .enhanced-table >>> .el-table__body tr {
  height: 64px;
}

/* Permission Table Specific Styling */
.permission-table-container {
  margin-top: 16px;
}

.permission-section .enhanced-table >>> .el-table__body td {
  padding: 10px 14px;
}

.permission-section .enhanced-table >>> .el-table__header th {
  padding: 12px 14px;
  height: 46px;
}

.permission-section .enhanced-table >>> .el-table__body tr {
  height: 56px;
}

/* User Table Cells */
.user-id-cell,
.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar,
.user-avatar-small {
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.user-id-text,
.user-name,
.user-text {
  font-weight: 500;
  color: #374151;
}

.department-tag {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #0369a1;
  border: none;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.department-tag::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s;
}

.department-tag:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(3, 105, 161, 0.3);
}

.department-tag:hover::before {
  left: 100%;
}

.uuid-text {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
}

/* Permission Table Specific */
.kri-tag {
  background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%);
  color: #7c3aed;
  border: none;
  font-weight: 600;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.kri-tag::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s;
}

.kri-tag:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

.kri-tag:hover::before {
  left: 100%;
}

.date-text {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: #374151;
}

.actions-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  max-width: 100%;
}

.action-tag {
  border: none;
  font-weight: 500;
  font-size: 11px;
  padding: 2px 6px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.action-tag::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.action-tag:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.action-tag:hover::before {
  left: 100%;
}

.effect-tag {
  border: none;
  font-weight: 500;
  font-size: 11px;
}

.effect-tag i {
  margin-right: 4px;
}

/* Action Buttons */
.action-buttons-container {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: nowrap;
}

.edit-btn {
  background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%);
  color: #0369a1;
  border: 1px solid #bae6fd;
  padding: 5px 12px;
  font-size: 12px;
  min-width: 60px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.edit-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.edit-btn:hover {
  background: linear-gradient(135deg, #0369a1, #1e40af);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(3, 105, 161, 0.3);
}

.edit-btn:hover::before {
  left: 100%;
}

.delete-btn {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  color: #dc2626;
  border: 1px solid #fecaca;
  padding: 5px 12px;
  font-size: 12px;
  min-width: 60px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.delete-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.delete-btn:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.delete-btn:hover::before {
  left: 100%;
}

/* Permission table actions */
.permission-table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  margin: 20px 0 12px 0;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 1px solid #bbf7d0;
  border-radius: 12px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #065f46;
  font-weight: 500;
}

.selection-info i {
  color: #10b981;
}

.danger-button {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.danger-button:hover {
  background: #dc2626;
  color: white;
}

/* Dialog Enhancements */
.dialog-footer {
  text-align: right;
  padding-top: 16px;
}

/* Form styling */
.el-form-item {
  margin-bottom: 20px;
}

.el-form-item >>> .el-form-item__label {
  font-weight: 500;
  color: #374151;
}

/* Responsive design */
@media (max-width: 1024px) {
  .header-content {
    flex-direction: column;
    gap: 24px;
    text-align: center;
  }

  .header-stats {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .admin-management {
    padding: 0;
  }

  .management-sections {
    padding: 0 16px 24px;
  }

  .enhanced-section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    text-align: center;
  }
  
  .section-title {
    justify-content: center;
  }

  .permission-actions {
    flex-direction: column;
    gap: 12px;
  }

  .add-button,
  .batch-button {
    width: 100%;
  }
  
  .permission-filters .el-row {
    flex-direction: column;
  }
  
  .permission-filters .el-col {
    width: 100% !important;
    margin-bottom: 12px;
  }

  .permission-table-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    text-align: center;
  }

  .danger-button {
    width: 100%;
  }

  .action-buttons-container {
    flex-direction: column;
    gap: 8px;
  }

  .edit-btn,
  .delete-btn {
    width: 100%;
  }

      .user-section .enhanced-table >>> .el-table__body td {
      padding: 12px 10px;
    }
    
    .user-section .enhanced-table >>> .el-table__header th {
      padding: 14px 10px;
      height: 48px;
    }
    
    .user-section .enhanced-table >>> .el-table__body tr {
      height: 58px;
    }
    
    .permission-section .enhanced-table >>> .el-table__body td {
      padding: 8px 10px;
    }
    
    .permission-section .enhanced-table >>> .el-table__header th {
      padding: 10px 10px;
      height: 42px;
    }
    
    .permission-section .enhanced-table >>> .el-table__body tr {
      height: 50px;
    }

  .user-id-cell,
  .user-cell {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }

  .actions-tags {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .header-text h1 {
    font-size: 24px;
  }

  .header-stats {
    flex-direction: column;
    width: 100%;
  }

  .stat-card {
    width: 100%;
  }

  .section-info h3 {
    font-size: 18px;
  }

  .section-icon {
    font-size: 24px;
    padding: 10px;
  }
}
</style>