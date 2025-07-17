<template>
  <div class="kri-table">
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
        min-width="200"
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
            class="status-tag"
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
        prop="l1RiskType"
        label="L1 Risk Type"
        width="150"
        sortable
        show-overflow-tooltip
      />
      
      <el-table-column
        prop="l2RiskType"
        label="L2 Risk Type"
        width="150"
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
          <el-tooltip :content="getBreachDescription(scope.row.breachType)" placement="top">
            <el-tag
              :type="getBreachTagType(scope.row.breachType)"
              size="small"
              class="status-tag"
            >
              {{ getBreachDisplayText(scope.row.breachType) }}
            </el-tag>
          </el-tooltip>
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
  </div>
</template>

<script>
import { formatDateFromInt, getStatusTagTypeFromLabel, getBreachTagType, getBreachDisplayText, getBreachDescription } from '@/utils/helpers';

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
    handleRowClick(row, _column, _event) {
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
    
    isSelectable(_row) {
      return true;
    },
    
    getStatusTagType(status) {
      return getStatusTagTypeFromLabel(status);
    },
    
    getBreachTagType,
    getBreachDisplayText,
    getBreachDescription,
    
    formatReportingDate(dateInt) {
      return formatDateFromInt(dateInt);
    }
  }
};
</script>

<style scoped>
.kri-table >>> .el-table th {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
}

.kri-table >>> .el-table td {
  padding: 12px 0;
}

/* Fix caret-wrapper alignment to prevent line breaks */
.kri-table >>> .el-table th .cell {
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kri-table >>> .el-table th .caret-wrapper {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-left: 5px;
  vertical-align: middle;
}

.kri-table >>> .el-table th .sort-caret {
  display: block;
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