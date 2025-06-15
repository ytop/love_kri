<template>
  <div class="simple-table">
    <el-table 
      :data="data" 
      :loading="loading" 
      style="width: 100%"
      @row-click="handleRowClick"
      highlight-current-row
    >
      <el-table-column prop="id" label="KRI ID" width="100" sortable />
      
      <el-table-column prop="name" label="KRI Name" min-width="200" sortable show-overflow-tooltip />
      
      <el-table-column prop="owner" label="Owner" width="150" sortable show-overflow-tooltip />
      
      <el-table-column prop="collectionStatus" label="Status" width="120" sortable>
        <template slot-scope="scope">
          <el-tag 
            :type="getStatusTagType(scope.row.collectionStatus)" 
            size="small"
          >
            {{ scope.row.collectionStatus }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="kriType" label="KRI Type" width="120" sortable />
      
      <el-table-column prop="l1RiskType" label="L1 Risk Type" width="150" sortable show-overflow-tooltip />
      
      <el-table-column prop="breachType" label="Breach Type" width="120" sortable>
        <template slot-scope="scope">
          <el-tag 
            :type="getBreachTagType(scope.row.breachType)" 
            size="small"
          >
            {{ scope.row.breachType }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="kriValue" label="KRI Value" width="120" sortable />
      
      <el-table-column prop="reportingCycle" label="Reporting Cycle" width="130" sortable />
      
      <el-table-column 
        prop="limitValue" 
        label="Limit Value" 
        width="120" 
        sortable
        :formatter="formatNumber"
      />
      
      <el-table-column 
        prop="warningLineValue" 
        label="Warning Line" 
        width="120" 
        sortable
        :formatter="formatNumber"
      />
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'SimpleTable',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    handleRowClick(row, column, event) {
      // Emit event to parent component with KRI ID and reporting date
      this.$emit('row-click', row.id, this.formatReportingDate(row.reportingDate));
    },
    
    getStatusTagType(status) {
      switch (status) {
        case 'Pending':
          return 'warning';
        case 'Submitted':
          return 'info';
        case 'Finalized':
          return 'success';
        default:
          return '';
      }
    },
    
    getBreachTagType(breachType) {
      switch (breachType) {
        case 'No Breach':
          return 'success';
        case 'Warning':
          return 'warning';
        case 'Limit':
          return 'danger';
        default:
          return '';
      }
    },
    
    formatNumber(row, column, cellValue) {
      if (cellValue === null || cellValue === undefined) {
        return 'N/A';
      }
      return cellValue.toString();
    },
    
    formatReportingDate(dateInt) {
      if (!dateInt) return '';
      const dateString = dateInt.toString();
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
  }
};
</script>

<style scoped>
.simple-table >>> .el-table th {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
}

.simple-table >>> .el-table td {
  padding: 12px 0;
}

.simple-table >>> .el-table__row {
  cursor: pointer;
}

.simple-table >>> .el-table__row:hover {
  background-color: #f8fafc;
}

.simple-table >>> .current-row > td {
  background-color: #ecf5ff !important;
}
</style>