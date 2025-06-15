<template>
  <div class="data-elements">
    <div v-if="atomicData.length === 0" class="no-data">
      <p>No atomic data elements available</p>
    </div>
    
    <div v-else>
      <el-table :data="atomicData" style="width: 100%">
        <el-table-column
          prop="atomic_id"
          label="Atomic ID"
          width="120"
        />
        
        <el-table-column
          prop="atomic_value"
          label="Value"
          width="150"
        >
          <template slot-scope="scope">
            <span>{{ scope.row.atomic_value || 'N/A' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column
          prop="atomic_status"
          label="Status"
          width="120"
        >
          <template slot-scope="scope">
            <el-tag :type="getAtomicStatusType(scope.row.atomic_status)" size="small">
              {{ mapAtomicStatus(scope.row.atomic_status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column
          prop="atomic_metadata"
          label="Metadata"
          min-width="200"
          show-overflow-tooltip
        >
          <template slot-scope="scope">
            <span>{{ scope.row.atomic_metadata || 'No metadata' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KRIDataElements',
  props: {
    atomicData: {
      type: Array,
      required: true
    }
  },
  methods: {
    mapAtomicStatus(status) {
      if (status === null || status === undefined) return 'Unknown';
      switch (status) {
        case 0:
          return 'Inactive';
        case 1:
          return 'Active';
        case 2:
          return 'Validated';
        default:
          return `Status ${status}`;
      }
    },
    
    getAtomicStatusType(status) {
      switch (status) {
        case 0:
          return 'info';
        case 1:
          return 'warning';
        case 2:
          return 'success';
        default:
          return '';
      }
    }
  }
};
</script>

<style scoped>
.data-elements {
  padding: 0.5rem 0;
}

.no-data {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.data-elements >>> .el-table th {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
}
</style>