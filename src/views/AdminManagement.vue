<template>
  <div class="admin-management">
    <div class="admin-header">
      <h1 class="admin-title">
        <i class="el-icon-setting"></i>
        System Administration
      </h1>
      <div class="admin-breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">Dashboard</el-breadcrumb-item>
          <el-breadcrumb-item>Administration</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
    </div>

    <el-card class="admin-container">
      <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
        <!-- User Management Tab -->
        <el-tab-pane label="User Management" name="users">
          <admin-user-management @data-updated="handleDataUpdated" />
        </el-tab-pane>

        <!-- Role Management Tab -->
        <el-tab-pane label="Role Management" name="roles">
          <admin-role-management @data-updated="handleDataUpdated" />
        </el-tab-pane>

        <!-- Department Administration Tab -->
        <el-tab-pane label="Department Admin" name="departments">
          <admin-department-management @data-updated="handleDataUpdated" />
        </el-tab-pane>

        <!-- Permission Management Tab -->
        <el-tab-pane label="Permissions" name="permissions">
          <admin-permission-management @data-updated="handleDataUpdated" />
        </el-tab-pane>

        <!-- System Overview Tab -->
        <el-tab-pane label="System Overview" name="overview">
          <admin-system-overview />
        </el-tab-pane>
      </el-tabs>
    </el-card>

  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import Permission from '@/utils/permission';
import AdminUserManagement from '@/components/admin/AdminUserManagement.vue';
import AdminRoleManagement from '@/components/admin/AdminRoleManagement.vue';
import AdminPermissionManagement from '@/components/admin/AdminPermissionManagement.vue';
import AdminDepartmentManagement from '@/components/admin/AdminDepartmentManagement.vue';
import AdminSystemOverview from '@/components/admin/AdminSystemOverview.vue';
import '@/assets/styles/admin.css';

export default {
  name: 'AdminManagement',
  
  components: {
    AdminUserManagement,
    AdminRoleManagement,
    AdminPermissionManagement,
    AdminDepartmentManagement,
    AdminSystemOverview
  },
  
  data() {
    return {
      activeTab: 'users'
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser'])
  },
  
  async mounted() {
    // Verify admin access
    if (!Permission.isSystemAdmin(this.currentUser)) {
      this.$message.error('Access denied. System administrator privileges required.');
      this.$router.push('/');
      return;
    }
  },
  
  methods: {
    handleTabClick(_tab) {
      // Tab switching is handled automatically by el-tabs
      // Individual components handle their own data loading
    },
    
    handleDataUpdated() {
      // Emit event to notify other tabs that data has been updated
      // This can be used to refresh related data across tabs
      this.$emit('admin-data-updated');
    }
  }
};
</script>

<style scoped>
/* Main AdminManagement orchestration component - minimal styling */
/* All component-specific styles are now in extracted components and admin.css */

.admin-management {
  padding: var(--spacing-lg);
  background-color: var(--bg-secondary);
  min-height: 100vh;
}

.admin-header {
  margin-bottom: var(--spacing-lg);
}

.admin-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-3xl);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.admin-container {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
}

/* Responsive design */
@media (max-width: 768px) {
  .admin-management {
    padding: var(--spacing-sm);
  }
}
</style>