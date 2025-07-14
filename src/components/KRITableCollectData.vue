<template>
  <div class="kri-table">
    <div class="table-actions">
      <el-button
        type="primary"
        @click="handleApproveSelected"
        :disabled="selectedKris.length === 0"
      >
        Approve Selected
      </el-button>
    </div>
    <el-table
      :data="data"
      v-loading="loading"
      style="width: 100%"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
    >
      <el-table-column
        type="selection"
        width="55"
        :selectable="isSelectable"
      />
      
      <el-table-column
        prop="id"
        label="KRI ID"
        width="80"
        sortable
      />
      
      <el-table-column
        prop="name"
        label="KRI Name"
        min-width="320"
        sortable
        show-overflow-tooltip
      >
        <template slot-scope="scope">
          <el-button
            type="text"
            @click="handleKRIClick(scope.row.id, scope.row.reportingDate)"
            class="kri-name-link"
          >
            {{ scope.row.name }}
          </el-button>
        </template>
      </el-table-column>
      
      <el-table-column
        prop="owner"
        label="Owner"
        width="80"
        sortable
        show-overflow-tooltip
      />
      
      <el-table-column
        prop="collectionStatus"
        label="Status"
        width="120"
        sortable
      >
        <template slot-scope="scope">
          <el-tag
            :type="getStatusTagType(scope.row.collectionStatus)"
            size="small"
          >
            {{ scope.row.collectionStatus }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column
        prop="kriType"
        label="KRI Type"
        width="120"
        sortable
        show-overflow-tooltip
      />
      
      <el-table-column
        prop="breachType"
        label="Breach Type"
        width="120"
        sortable
      >
        <template slot-scope="scope">
          <el-tag
            :type="getBreachTagType(scope.row.breachType)"
            size="small"
          >
            {{ scope.row.breachType }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column
        prop="kriValue"
        label="KRI Value"
        width="120"
        sortable
      />
      
      <el-table-column
        prop="reportingCycle"
        label="Reporting Cycle"
        width="130"
        sortable
      />
      
      <el-table-column
        prop="reportingDate"
        label="Reporting Date"
        width="130"
        sortable
      >
        <template slot-scope="scope">
          {{ formatReportingDate(scope.row.reportingDate) }}
        </template>
      </el-table-column>
      
      <el-table-column
        label="Actions"
        width="100"
        fixed="right"
      >
        <template slot-scope="scope">
          <el-button
            type="primary"
            size="mini"
            @click="handleKRIClick(scope.row.id, scope.row.reportingDate)"
          >
            Go
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="table-actions">
      <el-button
        type="primary"
        @click="handleApproveSelected"
        :disabled="selectedKris.length === 0"
      >
        Approve Selected
      </el-button>
    </div>
  </div>
</template>

<script>
import { formatDateFromInt } from '@/utils/helpers';

export default {
  name: 'KRITable',
  props: {
    data: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    selectedKris: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    handleRowClick(row, column, event) {
      // Emit event to parent component with KRI ID and reporting date
      this.$emit('row-click', row.id, this.formatReportingDate(row.reportingDate));
    },
    handleSelectionChange(selection) {
      this.$emit('select-all', selection.length === this.data.length);
      selection.forEach(row => {
        this.$emit('row-select', row.id, row.reportingDate, true);
      });
    },
    
    handleKRIClick(kriId, reportingDate) {
      this.$emit('kri-click', kriId, reportingDate);
    },
    
    handleApproveSelected() {
      // TODO: Implement the logic to approve selected KRIs
      console.log('Approving selected KRIs:', this.selectedKris);
    },

    isSelectable(row) {
      return true;
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
    
    formatReportingDate(dateInt) {
      return formatDateFromInt(dateInt);
    }
  }
};
</script>

<style scoped>
.table-actions {
  padding: 10px;
  text-align: left;
}

.kri-table >>> .el-table th {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
}

.kri-table >>> .el-table td {
  padding: 12px 0;
}

.kri-name-link {
  color: #3b82f6;
  font-weight: 500;
  padding: 0;
}

.kri-name-link:hover {
  color: #1d4ed8;
}
</style>