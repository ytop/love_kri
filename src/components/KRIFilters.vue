<template>
  <div class="kri-filters">
    <!-- Primary Filters -->
    <div class="filter-row">
      <el-form :model="filters" :inline="true" class="filter-form compact-form">
        <div class="filters-container">
          <div class="filters-left">
            
            <el-form-item label="Collection Status" class="compact-item">
              <el-select
                v-model="localFilters.collectionStatus"
                placeholder="Select status"
                clearable
                @change="onFilterChange"
                size="small"
                style="width: 180px;"
              >
                <el-option 
                  v-for="option in STATUS_VALUES" 
                  :key="option.value"
                  :label="option.label" 
                  :value="option.value" 
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="L1 Risk Type" class="compact-item">
              <el-input
                v-model="localFilters.l1RiskType"
                placeholder="Risk type"
                clearable
                @input="onFilterChange"
                size="small"
                style="width: 150px;"
              />
            </el-form-item>
            
            <el-button 
              @click="resetFilters" 
              size="small" 
              :type="hasActiveFilters ? 'warning' : ''"
              :plain="!hasActiveFilters"
              class="reset-button"
              :class="{ 'reset-button-active': hasActiveFilters }"
            >
              Reset
            </el-button>
          </div>
          
          <div class="filters-right">
            <el-button @click="toggleAdvanced" type="text" size="small">
              {{ showAdvanced ? 'Hide' : 'Show' }} Advanced
              <i :class="showAdvanced ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
            </el-button>
          </div>
        </div>
      </el-form>
    </div>

    <!-- Advanced Filters -->
    <el-collapse-transition>
      <div v-show="showAdvanced" class="advanced-filters">
        <div class="advanced-header">
          <span class="advanced-title">Advanced Filters</span>
        </div>
        <div class="filter-row">
          <el-form :model="localFilters" :inline="true" class="filter-form">
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
            
            <el-form-item label="KRI Owner">
              <el-input
                v-model="localFilters.kriOwner"
                placeholder="Enter owner name"
                clearable
                @input="onFilterChange"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-collapse-transition>
  </div>
</template>

<script>
import StatusManager from '@/utils/types';
import { formatDateFromInt } from '@/utils/helpers';

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
    },
    availableDepartments: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      localFilters: {},
      reportingDateValue: null
    };
  },
  computed: {
    STATUS_VALUES() {
      return Object.entries(StatusManager.STATUS_CONFIG).map(([value, config]) => ({
        value: parseInt(value, 10),
        label: config.label
      }));
    },
    
    hasActiveFilters() {
      const defaultFilters = ['reportingDate', 'department'];
      return Object.keys(this.localFilters).some(key => {
        if (defaultFilters.includes(key)) return false;
        const value = this.localFilters[key];
        return value && value !== '' && value !== null && value !== undefined;
      });
    },

    currentUser() {
      return this.$store.getters['kri/currentUser'];
    }
  },
  methods: {
    onFilterChange() {
      this.$emit('filter-change', { ...this.localFilters });
    },
    
    onReportingDateChange(dateValue) {
      if (dateValue) {
        this.localFilters.reportingDate = dateValue;
        this.onFilterChange();
      }
    },
    
    resetFilters() {
      this.$emit('reset-filters');
    },
    
    toggleAdvanced() {
      this.$emit('toggle-advanced');
    }
  },
  created() {
    // Initialize local filters from props
    this.localFilters = { ...this.filters };
    
    // Auto-apply user's department to filters
    if (this.currentUser && this.currentUser.department) {
      this.localFilters.department = this.currentUser.department;
    }
    
    // Convert reporting date from integer to string for date picker
    if (this.filters.reportingDate) {
      if (typeof this.filters.reportingDate === 'number') {
        this.reportingDateValue = formatDateFromInt(this.filters.reportingDate);
      } else {
        this.reportingDateValue = this.filters.reportingDate;
      }
    }
  },
  watch: {
    filters: {
      handler(newFilters) {
        this.localFilters = { ...newFilters };
        
        // Auto-apply user's department to filters
        if (this.currentUser && this.currentUser.department) {
          this.localFilters.department = this.currentUser.department;
        }
        
        // Update date picker value when filters change
        if (newFilters.reportingDate) {
          if (typeof newFilters.reportingDate === 'number') {
            this.reportingDateValue = formatDateFromInt(newFilters.reportingDate);
          } else {
            this.reportingDateValue = newFilters.reportingDate;
          }
        }
      },
      deep: true,
      immediate: false
    },
    
    currentUser: {
      handler(newUser) {
        // Update department filter when user changes
        if (newUser && newUser.department) {
          this.localFilters.department = newUser.department;
          this.onFilterChange();
        }
      },
      deep: true
    }
  }
};
</script>

<style scoped>
.kri-filters {
  padding: 0.5rem 1rem;
}

.filters-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 1rem;
}

.filters-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  flex: 1 1 auto;
  gap: 1.5rem;
  min-width: 0;
}

.filters-right {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 0.5rem;
}

.compact-form :deep(.el-form-item.compact-item) {
  margin-bottom: 0;
  margin-right: 0;
  display: flex;
  align-items: center;
}

.compact-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
  line-height: 32px;
  padding: 0 var(--spacing-sm) 0 0;
  min-width: auto;
  height: 32px;
  display: flex;
  align-items: center;
}

.compact-form :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  height: 32px;
}

.compact-form :deep(.el-input--small .el-input__inner) {
  height: 32px;
  line-height: 32px;
}

.compact-form :deep(.el-select--small .el-input__inner) {
  height: 32px;
  line-height: 32px;
}

.reset-button {
  margin-left: 1rem;
  height: 32px;
  align-self: center;
  transition: all 0.3s ease;
}

.reset-button-active {
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(230, 162, 60, 0.2);
}

.advanced-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.advanced-title {
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
}

.advanced-filters {
  overflow: hidden;
  margin-top: 1rem;
}

.advanced-filters :deep(.el-form-item) {
  margin-bottom: 1rem;
  margin-right: 1rem;
}

.advanced-filters :deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .filters-left {
    gap: 1rem;
  }
  
  .compact-item {
    margin-bottom: 0.5rem;
  }
}

@media (max-width: 992px) {
  .filters-container {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .filters-left {
    justify-content: flex-start;
    gap: 1rem;
  }
  
  .filters-right {
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
  
  .compact-form :deep(.el-form-item.compact-item) {
    margin-bottom: 0.5rem;
  }
}

@media (max-width: 768px) {
  .filters-left {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .compact-form :deep(.el-form-item.compact-item) {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }
  
  .compact-form :deep(.el-form-item__label) {
    margin-bottom: 0.25rem;
    padding: 0;
    height: auto;
    line-height: 1.4;
  }
  
  .compact-form :deep(.el-form-item__content) {
    width: 100%;
    height: auto;
  }
  
  .compact-item .el-select,
  .compact-item .el-input {
    width: 100% !important;
  }
  
  .reset-button {
    margin-left: 0;
    margin-top: 0.5rem;
    align-self: flex-start;
  }
}

@media (max-width: 480px) {
  .kri-filters {
    padding: 0.5rem;
  }
  
  .filters-container {
    gap: 0.75rem;
  }
  
  .filters-left {
    gap: 0.5rem;
  }
  
  .compact-form :deep(.el-form-item__label) {
    font-size: 0.8rem;
  }
}
</style>