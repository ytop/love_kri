<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>Permission Management</h3>
        <p class="admin-tab-description">Assign and manage permissions for department KRIs</p>
      </div>
    </div>

    <div class="permission-tools">
      <el-card>
        <div slot="header" class="admin-card-header">
          <span>Permission Templates</span>
        </div>
        <div class="template-grid">
          <div v-for="(template, key) in permissionTemplates" :key="key" class="template-item">
            <div class="template-info">
              <h4>{{ template.name }}</h4>
              <p>{{ template.description }}</p>
              <el-tag size="mini">{{ template.permissions }}</el-tag>
            </div>
            <el-button 
              size="small" 
              type="primary"
              @click="$emit('open-bulk-permission-dialog', key)"
            >
              Apply Template
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <div class="bulk-permission-section" style="margin-top: 20px;">
      <el-card>
        <div slot="header" class="admin-card-header">
          <span>Bulk Permission Assignment</span>
        </div>
        <el-form :inline="true">
          <el-form-item label="Select Users:">
            <el-select 
              v-model="bulkPermissionUsers" 
              multiple 
              placeholder="Choose team members"
              style="width: 300px;"
            >
              <el-option 
                v-for="user in teamMembers" 
                :key="user.UUID" 
                :label="`${user.User_ID} (${user.User_Name})`" 
                :value="user.UUID"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="Select KRIs:">
            <el-select 
              v-model="bulkPermissionKRIs" 
              multiple 
              placeholder="Choose KRIs"
              style="width: 200px;"
            >
              <el-option 
                v-for="kri in departmentKRIs" 
                :key="kri.kri_code" 
                :label="`${kri.kri_code} - ${kri.name}`" 
                :value="kri.kri_code"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="Permissions:">
            <el-select 
              v-model="bulkPermissionActions" 
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
              @click="executeBulkPermissionAssignment"
              :disabled="!bulkPermissionUsers.length || !bulkPermissionKRIs.length || !bulkPermissionActions"
              :loading="bulkPermissionLoading"
            >
              Assign Permissions
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DepartmentPermissionManagement',
  
  props: {
    permissionTemplates: {
      type: Object,
      default: () => ({})
    },
    teamMembers: {
      type: Array,
      default: () => []
    },
    departmentKRIs: {
      type: Array,
      default: () => []
    }
  },
  
  data() {
    return {
      bulkPermissionUsers: [],
      bulkPermissionKRIs: [],
      bulkPermissionActions: '',
      bulkPermissionLoading: false
    };
  },
  
  methods: {
    async executeBulkPermissionAssignment() {
      if (!this.bulkPermissionUsers.length || !this.bulkPermissionKRIs.length || !this.bulkPermissionActions) {
        return;
      }
      
      this.bulkPermissionLoading = true;
      try {
        await this.$emit('execute-bulk-permission-assignment', {
          users: this.bulkPermissionUsers,
          kris: this.bulkPermissionKRIs,
          actions: this.bulkPermissionActions
        });
        
        this.$message.success('Bulk permissions assigned successfully');
        this.bulkPermissionUsers = [];
        this.bulkPermissionKRIs = [];
        this.bulkPermissionActions = '';
      } catch (error) {
        console.error('Error executing bulk permission assignment:', error);
        this.$message.error('Failed to assign permissions');
      } finally {
        this.bulkPermissionLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.permission-tools {
  margin-bottom: 20px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.template-item {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-info h4 {
  margin: 0 0 5px 0;
  color: #303133;
}

.template-info p {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 14px;
}

/* Responsive design */
@media (max-width: 768px) {
  .template-grid {
    grid-template-columns: 1fr;
  }
  
  .template-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
}
</style>