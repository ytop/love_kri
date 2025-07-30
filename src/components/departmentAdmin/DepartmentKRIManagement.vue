<template>
  <div class="admin-section">
    <div class="admin-content-header">
      <div>
        <h3>Department KRIs</h3>
        <p class="admin-tab-description">Manage KRIs assigned to your department.</p>
      </div>
      <div class="admin-header-actions">
        <el-button 
          type="primary" 
          icon="el-icon-refresh" 
          @click="$emit('refresh-kri-data')"
          :loading="loading"
        >
          Refresh
        </el-button>
      </div>
    </div>

    <el-table 
      :data="departmentKRIs" 
      v-loading="loading"
      stripe
      border
      class="admin-full-width"
    >
      <el-table-column prop="kri_code" label="KRI Code" sortable width="120">
      </el-table-column>
      
      <el-table-column prop="name" label="KRI Name" sortable min-width="200">
      </el-table-column>
      
      <el-table-column prop="l1_risk_type" label="L1 Risk Type" sortable width="150">
      </el-table-column>
      
      <el-table-column prop="data_provider" label="Data Provider" sortable width="150">
      </el-table-column>
      
      <el-table-column prop="is_calculated_kri" label="Type" width="100">
        <template slot-scope="scope">
          <el-tag :type="scope.row.is_calculated_kri ? 'warning' : 'info'" size="small">
            {{ scope.row.is_calculated_kri ? 'Calculated' : 'Manual' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="Actions" width="150">
        <template slot-scope="scope">
          <el-button 
            size="mini" 
            type="primary" 
            icon="el-icon-key"
            @click="$emit('manage-kri-permissions', scope.row)"
          >
            Permissions
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'DepartmentKRIManagement',
  
  props: {
    departmentKRIs: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
/* Component-specific styles are handled by parent admin CSS */
</style>