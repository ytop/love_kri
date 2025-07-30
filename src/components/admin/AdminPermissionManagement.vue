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
      <!-- Use KRITable component for permission display -->
      <template #permission-table="{ loading }">
        <KRITable
          :data="formattedPermissionData"
          :loading="loading"
          :show-permission-actions="true"
          @selection-change="handleSelectionChange"
          @permission-edit="handlePermissionEdit"
        />
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
import KRITable from '@/components/KRITable.vue';
import adminHelpersMixin from '@/mixins/adminHelpersMixin';
import adminCrudMixin from '@/mixins/adminCrudMixin';
import { mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';

export default {
  name: 'AdminPermissionManagement',
  
  components: {
    AdminBasePermissionManagement,
    AddPermissionDialog,
    KRITable
  },
  
  mixins: [adminHelpersMixin, adminCrudMixin],
  
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
        filtered = filtered.filter(user => user.Department === this.permissionDeptFilter);
      }
      return filtered;
    },
    
    formattedPermissionData() {
      return this.permissionData.map(permission => ({
        ...permission,
        // Format for KRITable component
        User_ID: permission.user_id,
        User_Name: permission.user_name,
        Department: permission.department,
        KRI_ID: permission.kri_id,
        Actions: permission.actions,
        Effect: permission.effect
      }));
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
        this.departments = [...new Set(this.users.map(user => user.Department).filter(Boolean))];
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
    
    async handleBulkDelete() {
      if (!this.selectedItems.length) return;
      
      this.deleteLoading = true;
      try {
        const permissionIds = this.selectedItems.map(item => item.id);
        await kriService.bulkDeletePermissions(permissionIds, this.currentUser.User_ID);
        
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
    }
  }
};
</script>

<style scoped>
/* Component-specific styles */
</style>