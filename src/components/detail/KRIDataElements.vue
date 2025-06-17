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

    <!-- Calculation Details Section -->
    <div class="calculation-details">
      <h3 class="section-title">Calculation Details</h3>
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">Formula:</span>
          <span class="detail-value code-font">(A - B) / C</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Calculation:</span>
          <span class="detail-value code-font">(1,234,567 - 1,100,000) / 500,000</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Result:</span>
          <span class="detail-value code-font">0.269134</span>
        </div>
      </div>
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

/* Styles for Calculation Details section based on mock UI */
.calculation-details {
  background-color: #f8f9fa; /* Mock: #f8f9fa */
  padding: 16px;             /* Mock: 16px */
  border-radius: 6px;        /* Mock: var(--border-radius), using 6px as placeholder */
  margin: 24px 0;            /* Mock: 24px 0 */
  border: 1px solid #e0e0e0; /* Mock: 1px solid var(--border-color), using #e0e0e0 */
}

.section-title {
  font-size: 18px;           /* Mock: 18px */
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;       /* Mock: 20px */
  padding-bottom: 12px;      /* Mock: 12px */
  border-bottom: 1px solid #e0e0e0; /* Mock: 1px solid var(--border-color) */
}

.details-grid {
  display: grid;
  gap: 0.5rem; /* Adjusted gap for tighter spacing if needed */
}

.detail-item {
  display: flex;
  align-items: center;
  padding: 0.25rem 0; /* Reduced padding for a cleaner look within the section */
}

.detail-label {
  font-weight: bold;         /* Mock: bold */
  width: 90px;               /* Mock: 90px */
  min-width: 90px;           /* Ensure width is applied */
  color: #6c757d;           /* Mock: var(--text-muted), using #6c757d */
  margin-right: 0.75rem;
}

.detail-value {
  color: #111827; /* Dark gray for values */
}

.code-font {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
  font-size: 0.875rem; /* 14px */
  background-color: #f3f4f6; /* Light gray background for code-like text */
  padding: 0.125rem 0.375rem; /* Small padding */
  border-radius: 3px;
}
</style>