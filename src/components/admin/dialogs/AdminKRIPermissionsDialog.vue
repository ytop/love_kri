<template>
  <el-dialog 
    title="Manage KRI Permissions" 
    :visible="dialogVisible"
    width="80%"
    @close="handleClose"
  >
    <div v-if="selectedKRI">
      <div class="kri-info-header">
        <h4>{{ selectedKRI.kri_code }} - {{ selectedKRI.name }}</h4>
        <el-tag :type="selectedKRI.is_calculated_kri ? 'warning' : 'info'" size="medium">
          {{ selectedKRI.is_calculated_kri ? 'Calculated KRI' : 'Manual KRI' }}
        </el-tag>
      </div>
      
      <!-- Add New User Permission -->
      <el-card style="margin-bottom: 20px;">
        <div slot="header" class="admin-card-header">
          <span>Add User Permission</span>
        </div>
        <el-form :inline="true">
          <el-form-item label="User:">
            <el-select 
              v-model="newUserPermissions.user_uuid" 
              placeholder="Select user"
              style="width: 200px;"
            >
              <el-option 
                v-for="user in availableUsersForKRI" 
                :key="user.uuid" 
                :label="`${user.user_id} (${user.user_name})`" 
                :value="user.uuid"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="Permissions:">
            <el-select 
              v-model="newUserPermissions.actions" 
              placeholder="Select permissions"
              style="width: 200px;"
            >
              <el-option label="View Only" value="view"></el-option>
              <el-option label="View + Edit" value="view,edit"></el-option>
              <el-option label="Data Provider" value="view,edit,review"></el-option>
              <el-option label="KRI Owner" value="view,edit,review,acknowledge"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button 
              type="primary" 
              @click="$emit('add-kri-user-permission', newUserPermissions)"
              :disabled="!newUserPermissions.user_uuid || !newUserPermissions.actions"
            >
              Add Permission
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
      
      <!-- Current Users with Permissions -->
      <el-table 
        :data="kriUserPermissions" 
        v-loading="kriPermissionsLoading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="user_id" label="User ID" width="120">
        </el-table-column>
        
        <el-table-column prop="user_name" label="User Name" width="150">
        </el-table-column>
        
        <el-table-column prop="user_department" label="department" width="120">
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
        
        <el-table-column label="Actions" width="100">
          <template slot-scope="scope">
            <el-button 
              size="mini" 
              type="danger" 
              icon="el-icon-delete"
              @click="$emit('remove-kri-user-permission', scope.row)"
            >
              Remove
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">Close</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'AdminKRIPermissionsDialog',
  
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    selectedKRI: {
      type: Object,
      default: null
    },
    kriUserPermissions: {
      type: Array,
      default: () => []
    },
    availableUsersForKRI: {
      type: Array,  
      default: () => []
    },
    kriPermissionsLoading: {
      type: Boolean,
      default: false
    }
  },
  
  data() {
    return {
      newUserPermissions: {
        user_uuid: '',
        actions: ''
      }
    };
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
      this.newUserPermissions = { user_uuid: '', actions: '' };
    }
  }
};
</script>

<style scoped>
.kri-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.kri-info-header h4 {
  margin: 0;
  color: #303133;
}

.dialog-footer {
  text-align: right;
}
</style>