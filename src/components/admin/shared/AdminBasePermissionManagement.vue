<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>{{ title }}</h3>
        <p class="admin-tab-description">{{ description }}</p>
      </div>
    </div>

    <!-- Permission Templates Section -->
    <div v-if="showTemplates" class="permission-tools">
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
              @click="$emit('apply-template', key)"
            >
              Apply Template
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Bulk Permission Assignment -->
    <div v-if="showBulkAssignment" class="bulk-permission-section" :style="showTemplates ? 'margin-top: 20px;' : ''">
      <el-card>
        <div slot="header" class="admin-card-header">
          <span>Bulk Permission Assignment</span>
        </div>
        <el-form :inline="true">
          <el-form-item label="Select Users:">
            <el-select 
              v-model="bulkPermissionUsers" 
              multiple 
              placeholder="Choose users"
              style="width: 300px;"
            >
              <el-option 
                v-for="user in availableUsers" 
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
                v-for="kri in availableKRIs" 
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
              <el-option 
                v-for="suggestion in permissionSuggestions"
                :key="suggestion.value"
                :label="suggestion.label" 
                :value="suggestion.value"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button 
              type="primary" 
              @click="executeBulkAssignment"
              :disabled="!bulkPermissionUsers.length || !bulkPermissionKRIs.length || bulkPermissionActions === null"
              :loading="bulkPermissionLoading"
            >
              Assign Permissions
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- Filters Section -->
    <div v-if="showFilters" class="admin-filters" :style="(showTemplates || showBulkAssignment) ? 'margin-top: 20px;' : ''">
      <el-form :inline="true" class="admin-filter-form">
        <el-form-item v-if="showDepartmentFilter" label="Department:">
          <el-select 
            v-model="selectedDepartment" 
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
        
        <el-form-item v-if="showUserFilter" label="User:">
          <el-select 
            v-model="selectedUser" 
            placeholder="All Users"
            clearable
            filterable
            @change="handleFilterChange"
            class="admin-filter-select wide"
          >
            <el-option 
              v-for="user in filteredUsers" 
              :key="user.UUID" 
              :label="`${user.User_ID} (${user.Department || 'No Dept'})`" 
              :value="user.UUID"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            @click="$emit('load-permissions')"
            :loading="loading"
          >
            Load Permissions
          </el-button>
          <el-button 
            v-if="showAddPermission"
            type="success" 
            icon="el-icon-plus"
            @click="$emit('add-permission')"
          >
            Add New Permission
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- Permission Data Table -->
    <div v-if="permissionData.length > 0" style="margin-top: 20px;">
      <slot name="permission-table" :data="permissionData" :loading="loading">
        <!-- Default permission table -->
        <el-table 
          :data="permissionData" 
          v-loading="loading"
          stripe
          border
          class="admin-full-width"
          @selection-change="handleSelectionChange"
        >
          <el-table-column v-if="showSelection" type="selection" width="55"></el-table-column>
          
          <el-table-column prop="user_id" label="User ID" width="120" sortable>
          </el-table-column>
          
          <el-table-column prop="user_name" label="User Name" width="150" sortable>
          </el-table-column>
          
          <el-table-column v-if="showDepartmentColumn" prop="department" label="Department" width="120">
          </el-table-column>
          
          <el-table-column prop="kri_id" label="KRI Code" width="120" sortable>
          </el-table-column>
          
          <el-table-column prop="actions" label="Permissions" min-width="200">
            <template slot-scope="scope">
              <el-tag 
                v-for="action in formatPermissionActions(scope.row.actions)" 
                :key="action" 
                size="mini"
                style="margin-right: 5px;"
              >
                {{ action }}
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
          
          <el-table-column label="Actions" width="120">
            <template slot-scope="scope">
              <el-button 
                size="mini" 
                type="primary" 
                icon="el-icon-edit"
                @click="$emit('edit-permission', scope.row)"
              >
                Edit
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </slot>
    </div>
    
    <div v-else-if="showFilters" class="admin-no-data">
      <el-empty description="No permission data loaded. Please select filters and click Load Permissions.">
      </el-empty>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedPermissions.length > 0 && showBulkActions" class="admin-bulk-actions" style="margin-top: 16px;">
      <h4>Bulk Permission Operations</h4>
      <el-form :inline="true">
        <el-form-item label="Selected Permissions:">
          <span>{{ selectedPermissions.length }} permissions selected</span>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="warning" 
            @click="$emit('bulk-delete-permissions', selectedPermissions)"
            :loading="deleteLoading"
          >
            Delete Selected
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import adminHelpersMixin from '@/mixins/adminHelpersMixin';
import adminPermissionMixin from '@/mixins/adminPermissionMixin';
import { mapGetters } from 'vuex';

export default {
  name: 'AdminBasePermissionManagement',
  
  mixins: [adminHelpersMixin, adminPermissionMixin],
  
  props: {
    title: {
      type: String,
      default: 'Permission Management'
    },
    description: {
      type: String,
      default: 'Manage user permissions across KRIs and system functions.'
    },
    permissionData: {
      type: Array,
      default: () => []
    },
    availableUsers: {
      type: Array,
      default: () => []
    },
    availableKRIs: {
      type: Array,
      default: () => []
    },
    departments: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    deleteLoading: {
      type: Boolean,
      default: false
    },
    // Configuration props
    showTemplates: {
      type: Boolean,
      default: true
    },
    showBulkAssignment: {
      type: Boolean,
      default: true
    },
    showFilters: {
      type: Boolean,
      default: true
    },
    showDepartmentFilter: {
      type: Boolean,
      default: true
    },
    showUserFilter: {
      type: Boolean,
      default: true
    },
    showDepartmentColumn: {
      type: Boolean,
      default: true
    },
    showAddPermission: {
      type: Boolean,
      default: true
    },
    showSelection: {
      type: Boolean,
      default: true
    },
    showBulkActions: {
      type: Boolean,
      default: true
    }
  },
  
  data() {
    return {
      // Filter state
      selectedDepartment: '',
      selectedUser: '',
      
      // Bulk assignment state
      bulkPermissionUsers: [],
      bulkPermissionKRIs: [],
      bulkPermissionActions: null,
      
      // Selection state
      selectedPermissions: []
    };
  },
  
  computed: {
    ...mapGetters('kri', ['currentUser']),
    
    filteredUsers() {
      let filtered = this.availableUsers;
      
      if (this.selectedDepartment) {
        filtered = filtered.filter(user => user.Department === this.selectedDepartment);
      }
      
      return filtered;
    },
    
    permissionSuggestions() {
      return this.getPermissionSuggestions(this.currentUser.user_role);
    }
  },
  
  methods: {
    handleFilterChange() {
      this.$emit('filter-changed', {
        department: this.selectedDepartment,
        user: this.selectedUser
      });
    },
    
    handleSelectionChange(selection) {
      this.selectedPermissions = selection;
      this.$emit('permission-selection-changed', selection);
    },
    
    async executeBulkAssignment() {
      if (!this.bulkPermissionUsers.length || !this.bulkPermissionKRIs.length || this.bulkPermissionActions === null) {
        return;
      }
      
      const success = await this.executeBulkPermissionAssignment(
        this.bulkPermissionUsers,
        this.bulkPermissionKRIs,
        this.bulkPermissionActions,
        this.currentUser
      );
      
      if (success) {
        this.bulkPermissionUsers = [];
        this.bulkPermissionKRIs = [];
        this.bulkPermissionActions = null;
        this.$emit('bulk-assignment-completed');
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