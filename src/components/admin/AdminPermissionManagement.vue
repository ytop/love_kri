<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>Permission Management</h3>
        <p class="admin-tab-description">Manage user permissions across KRIs and system functions.</p>
      </div>
    </div>

    <div class="admin-filters">
      <el-form :inline="true" class="admin-filter-form">
        <el-form-item label="Department:">
          <el-select 
            v-model="permissionDeptFilter" 
            placeholder="All Departments"
            clearable
            @change="handleFilterChange"
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
        
        <el-form-item label="User:">
          <el-select 
            v-model="permissionUserFilter" 
            placeholder="All Users"
            clearable
            filterable
            @change="handleFilterChange"
            class="admin-filter-select wide"
          >
            <el-option 
              v-for="user in filteredUsersForPermissions" 
              :key="user.UUID" 
              :label="`${user.User_ID} (${user.Department})`" 
              :value="user.UUID"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            @click="loadPermissionData"
            :loading="loading"
          >
            Load Permissions
          </el-button>
          <el-button 
            type="success" 
            icon="el-icon-plus"
            @click="openAddDialog"
          >
            Add New Permission
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div v-if="permissionData.length > 0">
      <el-table 
        :data="permissionData" 
        v-loading="loading"
        stripe
        border
        class="admin-full-width"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55"></el-table-column>
        
        <el-table-column prop="user_id" label="User" width="120">
        </el-table-column>
        
        <el-table-column prop="kri_id" label="KRI ID" width="80">
        </el-table-column>
        
        <el-table-column prop="actions" label="Permissions" min-width="200">
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
        
        <el-table-column label="Actions" width="100">
          <template slot-scope="scope">
            <el-button 
              size="mini" 
              type="primary" 
              icon="el-icon-edit"
              @click="editPermission(scope.row)"
            >
              Edit
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <div v-else class="admin-no-data">
      <el-empty description="No permission data loaded. Please select filters and click Load Permissions.">
      </el-empty>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedItems.length > 0" class="admin-bulk-actions" style="margin-top: 16px;">
      <h4>Bulk Permission Operations</h4>
      <el-form :inline="true">
        <el-form-item label="Selected Permissions:">
          <span>{{ selectedItems.length }} permissions selected</span>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="warning" 
            @click="handleBulkDelete"
            :loading="deleteLoading"
          >
            Delete Selected
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- Permission Edit Dialog -->
    <el-dialog 
      title="Edit Permission" 
      :visible.sync="permissionEditDialogVisible"
      width="500px"
      @close="resetPermissionEditDialog"
    >
      <div v-if="editingPermission" class="admin-dialog-content">
        <div class="admin-permission-info">
          <p><strong>User:</strong> {{ editingPermission.user_id }}</p>
          <p><strong>KRI ID:</strong> {{ editingPermission.kri_id }}</p>
          <p><strong>Current Permissions:</strong> {{ editingPermission.actions }}</p>
        </div>
        
        <el-form>
          <el-form-item label="Actions (comma-separated):">
            <el-input 
              v-model="editingPermissionActions" 
              type="textarea"
              :rows="3"
              placeholder="e.g., edit,view,review,acknowledge,delete,atomic1_edit,atomic1_view"
              class="admin-full-width"
            ></el-input>
            <div class="admin-permission-help">
              <small>Available actions: edit, view, review, acknowledge, delete</small><br>
              <small>Atomic actions: atomic1_edit, atomic1_view, atomic2_edit, etc.</small>
            </div>
          </el-form-item>
        </el-form>
      </div>
      
      <div slot="footer" class="admin-dialog-footer">
        <el-button @click="permissionEditDialogVisible = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="confirmPermissionEdit"
          :disabled="!editingPermissionActions"
          :loading="permissionEditLoading"
        >
          Update Permission
        </el-button>
      </div>
    </el-dialog>

    <!-- Add Permission Dialog -->
    <add-permission-dialog
      :visible.sync="dialogVisible"
      :users="users"
      :available-kris="availableKRIs"
      @permission-created="handlePermissionCreated"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';
import adminCrudMixin from '@/mixins/adminCrudMixin';
import AddPermissionDialog from './dialogs/AddPermissionDialog.vue';

export default {
  name: 'AdminPermissionManagement',
  components: {
    AddPermissionDialog
  },
  mixins: [adminCrudMixin],
  
  data() {
    return {
      users: [],
      departments: [],
      availableKRIs: [],
      permissionData: [],
      
      // Filters
      permissionDeptFilter: '',
      permissionUserFilter: '',
      
      // Permission edit dialog
      permissionEditDialogVisible: false,
      editingPermission: null,
      editingPermissionActions: '',
      permissionEditLoading: false
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    entityName() {
      return 'Permission';
    },
    
    filteredUsersForPermissions() {
      if (!this.permissionDeptFilter) {
        return this.users;
      }
      return this.users.filter(user => user.Department === this.permissionDeptFilter);
    }
  },
  
  async mounted() {
    await this.loadInitialData();
  },
  
  methods: {
    // ================================
    // Implement abstract methods from adminCrudMixin
    // ================================
    
    getDefaultItem() {
      return {
        user_uuid: '',
        kri_id: '',
        reporting_date: new Date(),
        actions: '',
        effect: true
      };
    },
    
    async loadData() {
      // Permission data is loaded on demand via filters
      return Promise.resolve();
    },
    
    async createItem(item) {
      const permissionUpdate = {
        user_uuid: item.user_uuid,
        kri_id: item.kri_id,
        reporting_date: item.reporting_date,
        actions: item.actions,
        effect: item.effect
      };
      
      return await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.User_ID);
    },
    
    async updateItem(item) {
      const permissionUpdate = {
        user_uuid: item.user_uuid,
        kri_id: item.kri_id,
        reporting_date: item.reporting_date,
        actions: item.actions,
        effect: item.effect || true
      };
      
      return await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.User_ID);
    },
    
    async deleteItem(item) {
      // Implement permission deletion by setting effect to false
      const permissionUpdate = {
        user_uuid: item.user_uuid,
        kri_id: item.kri_id,
        reporting_date: item.reporting_date,
        actions: '',
        effect: false
      };
      
      return await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.User_ID);
    },
    
    // ================================
    // Component-specific methods
    // ================================
    
    async loadInitialData() {
      try {
        await Promise.all([
          this.loadUsers(),
          this.loadDepartments(),
          this.loadAvailableKRIs()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        this.$message.error('Failed to load initial data');
      }
    },
    
    async loadUsers() {
      try {
        this.users = await kriService.getAllUsers();
      } catch (error) {
        console.error('Error loading users:', error);
        this.$message.error('Failed to load users');
      }
    },
    
    async loadDepartments() {
      try {
        this.departments = await kriService.getAllDepartments();
      } catch (error) {
        console.error('Error loading departments:', error);
        this.$message.error('Failed to load departments');
      }
    },
    
    async loadAvailableKRIs() {
      try {
        this.availableKRIs = await kriService.getAllKRIMetadata();
      } catch (error) {
        console.error('Error loading available KRIs:', error);
        this.$message.error('Failed to load available KRIs');
      }
    },
    
    handleFilterChange() {
      // Auto-load when filters change
      if (this.permissionUserFilter || this.permissionDeptFilter) {
        this.loadPermissionData();
      }
    },
    
    async loadPermissionData() {
      this.loading = true;
      try {
        let userUuid = this.permissionUserFilter || null;
        this.permissionData = await kriService.getUserPermissionsSummary(userUuid);
        
        // If department filter is set, filter the results
        if (this.permissionDeptFilter) {
          this.permissionData = this.permissionData.filter(perm => 
            perm.kri_user && perm.kri_user.Department === this.permissionDeptFilter
          );
        }
        
        // Flatten the data for display
        this.permissionData = this.permissionData.map(perm => ({
          ...perm,
          user_id: perm.kri_user ? perm.kri_user.User_ID : 'Unknown'
        }));
      } catch (error) {
        console.error('Error loading permission data:', error);
        this.$message.error('Failed to load permission data');
      } finally {
        this.loading = false;
      }
    },
    
    async editPermission(permission) {
      this.editingPermission = { ...permission };
      this.editingPermissionActions = permission.actions || '';
      this.permissionEditDialogVisible = true;
    },
    
    async confirmPermissionEdit() {
      if (!this.editingPermission || !this.editingPermissionActions) return;
      
      this.permissionEditLoading = true;
      try {
        // Update permission using bulk update method
        const permissionUpdate = {
          user_uuid: this.editingPermission.user_uuid,
          kri_id: this.editingPermission.kri_id,
          reporting_date: this.editingPermission.reporting_date,
          actions: this.editingPermissionActions,
          effect: true // Keep permission active
        };
        
        await kriService.bulkUpdatePermissions([permissionUpdate], this.currentUser.User_ID);
        
        // Update local data
        const permIndex = this.permissionData.findIndex(p => 
          p.user_uuid === this.editingPermission.user_uuid && 
          p.kri_id === this.editingPermission.kri_id
        );
        if (permIndex !== -1) {
          this.permissionData[permIndex].actions = this.editingPermissionActions;
        }
        
        this.$message.success('Permission updated successfully');
        this.permissionEditDialogVisible = false;
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error updating permission:', error);
        this.$message.error('Failed to update permission');
      } finally {
        this.permissionEditLoading = false;
      }
    },
    
    resetPermissionEditDialog() {
      this.editingPermission = null;
      this.editingPermissionActions = '';
      this.permissionEditLoading = false;
    },
    
    handlePermissionCreated(_newPermission) {
      // Reload permission data to show the new permission
      this.loadPermissionData();
      this.$emit('data-updated');
    }
  }
};
</script>

<style scoped>
/* Component-specific styles if needed */
/* Most styles are in admin.css */
</style>