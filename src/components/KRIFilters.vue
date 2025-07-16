<template>
  <div class="kri-filters">
    <!-- Primary Filters -->
    <div class="filter-row">
      <el-form :model="filters" :inline="true" class="filter-form">
        <el-form-item label="KRI Owner">
          <el-input
            v-model="localFilters.kriOwner"
            placeholder="Enter owner name"
            clearable
            @input="onFilterChange"
          />
        </el-form-item>
        
        <el-form-item label="Collection Status">
          <el-select
            v-model="localFilters.collectionStatus"
            placeholder="Select status"
            clearable
            @change="onFilterChange"
          >
            <el-option label="Pending" value="Pending" />
            <el-option label="Submitted" value="Submitted" />
            <el-option label="Finalized" value="Finalized" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="L1 Risk Type">
          <el-input
            v-model="localFilters.l1RiskType"
            placeholder="Enter risk type"
            clearable
            @input="onFilterChange"
          />
        </el-form-item>
        
        <el-form-item label="Reporting Date">
          <el-date-picker
            v-model="reportingDateValue"
            type="date"
            placeholder="Select date"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            @change="onReportingDateChange"
          />
        </el-form-item>
      </el-form>
    </div>

    <!-- Advanced Filters -->
    <el-collapse-transition>
      <div v-show="showAdvanced" class="advanced-filters">
        <el-divider content-position="left">Advanced Filters</el-divider>
        <div class="filter-row">
          <el-form :model="localFilters" :inline="true" class="filter-form">
            <el-form-item label="KRI ID">
              <el-input
                v-model="localFilters.kriId"
                placeholder="Enter KRI ID"
                clearable
                @input="onFilterChange"
              />
            </el-form-item>
            
            <el-form-item label="Reporting Cycle">
              <el-select
                v-model="localFilters.reportingCycle"
                placeholder="Select cycle"
                clearable
                @change="onFilterChange"
              >
                <el-option label="Monthly" value="Monthly" />
                <el-option label="Quarterly" value="Quarterly" />
                <el-option label="Annual" value="Annual" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="L2 Risk Type">
              <el-input
                v-model="localFilters.l2RiskType"
                placeholder="Enter L2 risk type"
                clearable
                @input="onFilterChange"
              />
            </el-form-item>
            
            <el-form-item label="KRI Name">
              <el-input
                v-model="localFilters.kriName"
                placeholder="Enter KRI name"
                clearable
                @input="onFilterChange"
              />
            </el-form-item>
          </el-form>
        </div>
        
        <div class="filter-row">
          <el-form :model="localFilters" :inline="true" class="filter-form">
            <el-form-item label="KRI Type">
              <el-input
                v-model="localFilters.kriType"
                placeholder="Enter KRI type"
                clearable
                @input="onFilterChange"
              />
            </el-form-item>
            
            <el-form-item label="Breach Type">
              <el-select
                v-model="localFilters.breachType"
                placeholder="Select breach type"
                clearable
                @change="onFilterChange"
              >
                <el-option label="No Breach" value="No Breach" />
                <el-option label="Warning" value="Warning" />
                <el-option label="Limit" value="Limit" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="Data Provider">
              <el-input
                v-model="localFilters.dataProvider"
                placeholder="Enter data provider"
                clearable
                @input="onFilterChange"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-collapse-transition>

    <!-- Filter Actions -->
    <div class="filter-actions">
      <el-button @click="toggleAdvanced" type="text">
        {{ showAdvanced ? 'Hide' : 'Show' }} Advanced Filters
        <i :class="showAdvanced ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
      </el-button>
      
      <div class="action-buttons">
        <el-button @click="resetFilters" size="small">
          Reset Filters
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KRIFilters',
  props: {
    filters: {
      type: Object,
      required: true
    },
    showAdvanced: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      localFilters: { ...this.filters }
    };
  },
  computed: {
    reportingDateValue: {
      get() {
        return this.localFilters.reportingDate;
      },
      set(value) {
        this.localFilters.reportingDate = value;
      }
    }
  },
  watch: {
    filters: {
      handler(newFilters) {
        this.localFilters = { ...newFilters };
      },
      deep: true
    }
  },
  methods: {
    onFilterChange() {
      this.$emit('filter-change', this.localFilters);
    },
    
    onReportingDateChange(value) {
      this.localFilters.reportingDate = value;
      this.onFilterChange();
    },
    
    toggleAdvanced() {
      this.$emit('toggle-advanced');
    },
    
    resetFilters() {
      this.$emit('reset-filters');
    }
  }
};
</script>

<style scoped>
.kri-filters {
  padding: 1rem;
}

.filter-form >>> .el-form-item {
  margin-bottom: 1rem;
  margin-right: 1rem;
}

.filter-form >>> .el-form-item__label {
  font-weight: 500;
  color: #374151;
}

.advanced-filters {
  overflow: hidden;
}

.filter-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}
</style>