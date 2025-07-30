<template>
  <el-dialog 
    title="Manage User Permissions" 
    :visible="dialogVisible"
    width="80%"
    @close="handleClose"
  >
    <div v-if="selectedUser">
      <div class="user-info-header">
        <h4>{{ selectedUser.user_name }} ({{ selectedUser.user_id }})</h4>
        <el-tag :type="getRoleTagType(selectedUser.user_role)" size="medium">
          {{ getRoleDisplayName(selectedUser.user_role) }}
        </el-tag>
      </div>
      
      <el-table 
        :data="editablePermissions" 
        v-loading="userPermissionsLoading"
        stripe
        border
        style="width: 100%; margin-top: 20px;"
      >
        <el-table-column prop="kri_id" label="KRI Code" width="120">
        </el-table-column>
        
        <el-table-column prop="kri_name" label="KRI Name" min-width="200">
        </el-table-column>
        
        <el-table-column prop="is_calculated" label="Type" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.is_calculated ? 'warning' : 'info'" size="small">
              {{ scope.row.is_calculated ? 'Calculated' : 'Manual' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="Current Permissions" width="200">
          <template slot-scope="scope">
            <div v-if="scope.row.current_actions">
              <el-tag 
                v-for="action in scope.row.current_actions.split(',')" 
                :key="action" 
                size="mini"
                style="margin-right: 5px;"
              >
                {{ action.trim() }}
              </el-tag>
            </div>
            <span v-else class="admin-text-muted">No permissions</span>
          </template>
        </el-table-column>
        
        <el-table-column label="New Permissions" width="200">
          <template slot-scope="scope">
            <el-select 
              v-model="scope.row.new_actions" 
              placeholder="Select permissions"
              style="width: 100%;"
            >
              <el-option label="No Access" value=""></el-option>
              <el-option label="View Only" value="view"></el-option>
              <el-option label="View + Edit" value="view,edit"></el-option>
              <el-option label="Data Provider" value="view,edit,review"></el-option>
              <el-option label="KRI Owner" value="view,edit,review,acknowledge"></el-option>
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">Cancel</el-button>
      <el-button 
        type="primary" 
        @click="$emit('update-user-permissions', editablePermissions)"
        :loading="permissionUpdateLoading"
      >
        Update Permissions
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'UserPermissionsDialog',
  
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    selectedUser: {
      type: Object,
      default: null
    },
    editablePermissions: {
      type: Array,
      default: () => []
    },
    userPermissionsLoading: {
      type: Boolean,
      default: false
    },
    permissionUpdateLoading: {
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
.user-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.user-info-header h4 {
  margin: 0;
  color: #303133;
}

.dialog-footer {
  text-align: right;
}
</style>