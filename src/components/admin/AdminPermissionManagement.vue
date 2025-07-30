<template>
  <div>
    <admin-base-permission-management
      :permission-data="permissionData"
      :available-users="users"
      :available-k-r-is="kris"
      :departments="departments"
      :loading="loading"
      :delete-loading="deleteLoading"
      @apply-template="handleApplyTemplate"
      @filter-changed="handleFilterChange"
      @load-permissions="loadPermissionData"
      @add-permission="openAddDialog"
      @edit-permission="handlePermissionEdit"
      @permission-selection-changed="handleSelectionChange"
      @bulk-delete-permissions="handleBulkDelete"
      @bulk-assignment-completed="loadPermissionData"
    >
      <!-- New dedicated permission table -->
      <template #permission-table="{ loading }">
        <div class="permission-table-container">
          <el-table
            :data="formattedPermissionData"
            :loading="loading"
            @selection-change="handleSelectionChange"
            style="width: 100%"
            border
            stripe
          >
            <el-table-column
              type="selection"
              width="55"
              align="center"
            />
            
            <el-table-column
              prop="user_name"
              label="User Name"
              min-width="120"
              sortable
            >
              <template slot-scope="scope">
                <div class="user-info">
                  <div class="user-name">{{ scope.row.user_name || scope.row.user_id }}</div>
                  <div class="user-id">{{ scope.row.user_id }}</div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column
              prop="department"
              label="Department"
              min-width="120"
              sortable
            />
            
            <el-table-column
              prop="kri_id"
              label="KRI ID"
              min-width="100"
              sortable
            />
            
            <el-table-column
              prop="actions"
              label="Permissions"
              min-width="200"
            >
              <template slot-scope="scope">
                <div class="permission-actions">
                  <el-tag
                    v-for="action in scope.row.permissionActions"
                    :key="action"
                    :type="getPermissionTagType(action)"
                    size="small"
                    class="permission-tag"
                  >
                    {{ formatPermissionAction(action) }}
                  </el-tag>
                  <span v-if="!scope.row.permissionActions.length" class="no-permissions">
                    No permissions
                  </span>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column
              prop="effect"
              label="Status"
              width="100"
              align="center"
            >
              <template slot-scope="scope">
                <el-tag
                  :type="scope.row.effect ? 'success' : 'danger'"
                  size="small"
                >
                  {{ scope.row.effect ? 'Active' : 'Inactive' }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column
              label="Actions"
              width="150"
              align="center"
            >
              <template slot-scope="scope">
                <el-button
                  type="primary"
                  size="mini"
                  @click="handlePermissionEdit(scope.row)"
                  icon="el-icon-edit"
                >
                  Edit
                </el-button>
                <el-button
                  type="danger"
                  size="mini"
                  @click="handleRemovePermission(scope.row)"
                  icon="el-icon-delete"
                >
                  Remove
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </admin-base-permission-management>

    <!-- Permission Edit Dialog -->
    <add-permission-dialog 
      :visible.sync="editDialogVisible"
      :permission-data="editingPermission"
      :edit-mode="true"
      @permission-updated="handlePermissionUpdated"
    />

    <!-- Add Permission Dialog -->
    <add-permission-dialog 
      :visible.sync="addDialogVisible"
      @permission-added="handlePermissionAdded"
    />
  </div>
</template>

<script>
import AdminBasePermissionManagement from '@/components/admin/shared/AdminBasePermissionManagement.vue';
import AddPermissionDialog from '@/components/admin/dialogs/AddPermissionDialog.vue';
import adminHelpersMixin from '@/mixins/adminHelpersMixin';
import adminCrudMixin from '@/mixins/adminCrudMixin';
import adminPermissionMixin from '@/mixins/adminPermissionMixin';
import { mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';

export default {
  name: 'AdminPermissionManagement',
  
  components: {
    AdminBasePermissionManagement,
    AddPermissionDialog
  },
  
  mixins: [adminHelpersMixin, adminCrudMixin, adminPermissionMixin],
  
  data() {
    return {
      permissionData: [],
      users: [],
      kris: [],
      departments: [],
      loading: false,
      deleteLoading: false,
      selectedItems: [],
      
      // Filters
      permissionDeptFilter: '',
      permissionUserFilter: '',
      
      // Dialogs
      addDialogVisible: false,
      editDialogVisible: false,
      editingPermission: null
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    filteredUsersForPermissions() {
      let filtered = this.users;
      if (this.permissionDeptFilter) {
        filtered = filtered.filter(user => user.department === this.permissionDeptFilter);
      }
      return filtered;
    },
    
    formattedPermissionData() {
      return this.permissionData.map(permission => {
        // Parse the actions string to get individual permissions
        const permissionActions = this.parsePermissionActions(permission.actions);
        
        return {
          ...permission,
          permissionActions: permissionActions
        };
      });
    }
  },
  
  async mounted() {
    await this.loadUsers();
    await this.loadKRIs();
    await this.loadDepartments();
  },
  
  methods: {
    async loadUsers() {
      try {
        this.users = await kriService.getAllUsers();
      } catch (error) {
        console.error('Error loading users:', error);
        this.$message.error('Failed to load users');
      }
    },
    
    async loadKRIs() {
      try {
        this.kris = await kriService.getAllKRIMetadata();
      } catch (error) {
        console.error('Error loading KRIs:', error);
        this.$message.error('Failed to load KRIs');
      }
    },
    
    async loadDepartments() {
      try {
        this.departments = [...new Set(this.users.map(user => user.department).filter(Boolean))];
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    },
    
    async loadPermissionData() {
      this.loading = true;
      try {
        let params = {};
        
        if (this.permissionDeptFilter) {
          params.department = this.permissionDeptFilter;
        }
        
        if (this.permissionUserFilter) {
          params.user_uuid = this.permissionUserFilter;
        }
        
        this.permissionData = await kriService.getUserPermissionsSummary(null, params);
      } catch (error) {
        console.error('Error loading permission data:', error);
        this.$message.error('Failed to load permission data');
      } finally {
        this.loading = false;
      }
    },
    
    handleFilterChange(filters) {
      this.permissionDeptFilter = filters.department || '';
      this.permissionUserFilter = filters.user || '';
    },
    
    handleSelectionChange(selection) {
      this.selectedItems = selection;
    },
    
    handleApplyTemplate(_templateKey) {
      // Handle template application
      this.$message.info('Template application functionality to be implemented');
    },
    
    openAddDialog() {
      this.addDialogVisible = true;
    },
    
    handlePermissionEdit(permission) {
      this.editingPermission = permission;
      this.editDialogVisible = true;
    },
    
    async handleRemovePermission(permission) {
      try {
        await this.$confirm(
          `Are you sure you want to remove all permissions for ${permission.user_name || permission.user_id} on KRI ${permission.kri_id}?`,
          'Remove Permission',
          {
            confirmButtonText: 'Remove',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        );
        
        await this.removeKRIUserPermission(
          permission.user_uuid,
          permission.kri_id,
          this.currentUser.user_id
        );
        
        this.$message.success('Permission removed successfully');
        await this.loadPermissionData();
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error removing permission:', error);
          this.$message.error('Failed to remove permission');
        }
      }
    },
    
    async handleBulkDelete() {
      if (!this.selectedItems.length) return;
      
      this.deleteLoading = true;
      try {
        const permissionIds = this.selectedItems.map(item => item.id);
        await kriService.bulkDeletePermissions(permissionIds, this.currentUser.user_id);
        
        this.$message.success(`Deleted ${permissionIds.length} permissions`);
        await this.loadPermissionData();
        this.selectedItems = [];
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error deleting permissions:', error);
        this.$message.error('Failed to delete permissions');
      } finally {
        this.deleteLoading = false;
      }
    },
    
    async handlePermissionAdded() {
      this.addDialogVisible = false;
      await this.loadPermissionData();
      this.$emit('data-updated');
    },
    
    async handlePermissionUpdated() {
      this.editDialogVisible = false;
      this.editingPermission = null;
      await this.loadPermissionData();
      this.$emit('data-updated');
    },
    
    // Helper methods for permission display
    parsePermissionActions(actionsString) {
      if (!actionsString) return [];
      
      // Handle both comma-separated and space-separated formats
      return actionsString.split(/[,\s]+/).map(action => action.trim()).filter(action => action);
    },
    
    formatPermissionAction(action) {
      // Format atomic permissions (e.g., atomic1.edit -> Atomic1 Edit)
      if (action.includes('.')) {
        const [atomic, permission] = action.split('.');
        return `${atomic.charAt(0).toUpperCase() + atomic.slice(1)} ${permission.charAt(0).toUpperCase() + permission.slice(1)}`;
      }
      
      // Format regular permissions
      return action.charAt(0).toUpperCase() + action.slice(1);
    },
    
    getPermissionTagType(action) {
      const typeMap = {
        'view': 'info',
        'edit': 'warning',
        'review': 'primary',
        'acknowledge': 'success',
        'delete': 'danger'
      };
      
      // Handle atomic permissions
      if (action.includes('.')) {
        const permission = action.split('.')[1];
        return typeMap[permission] || 'default';
      }
      
      return typeMap[action] || 'default';
    }
  }
};
</script>

<style scoped>
.permission-table-container {
  margin-top: 20px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
  color: #303133;
}

.user-id {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.permission-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.permission-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.no-permissions {
  color: #909399;
  font-style: italic;
  font-size: 12px;
}
</style>