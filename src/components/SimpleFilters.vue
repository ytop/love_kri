<template>
  <div class="simple-filters">
    <el-form :inline="true">
      <el-form-item label="KRI Owner">
        <el-input 
          v-model="ownerFilter"
          placeholder="Enter owner name" 
          clearable 
        />
      </el-form-item>
      <el-form-item label="Status">
        <el-select 
          v-model="statusFilter"
          placeholder="Select status" 
          clearable
        >
          <el-option label="Pending" value="Pending" />
          <el-option label="Submitted" value="Submitted" />
          <el-option label="Finalized" value="Finalized" />
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  name: 'SimpleFilters',
  data() {
    return {
      ownerFilter: '',
      statusFilter: ''
    };
  }
};
</script>

<style scoped>
.simple-filters {
  padding: 1rem;
}
</style>