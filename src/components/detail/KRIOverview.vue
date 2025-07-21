<template>
  <div class="kri-overview">
    <el-row :gutter="24">
      <el-col :span="8">
        <div class="metric-card">
          <div class="metric-label">Current Value</div>
          <div class="metric-value">{{ kriData.kri_value || 'N/A' }}</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="metric-card">
          <div class="metric-label">Warning Line</div>
          <div class="metric-value warning">{{ kriData.warning_line_value || 'N/A' }}</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="metric-card">
          <div class="metric-label">Limit Value</div>
          <div class="metric-value danger">{{ kriData.limit_value || 'N/A' }}</div>
        </div>
      </el-col>
    </el-row>
    
    <!-- Calculated KRI Special Section -->
    <div v-if="isCalculatedKRI && kriData.kri_formula" class="calculated-kri-section">
      <el-card class="formula-card">
        <div slot="header" class="card-header">
          <span>
            <i class="el-icon-s-operation"></i>
            Calculated KRI
          </span>
          <el-tag type="primary" size="small">Auto-calculated</el-tag>
        </div>
        
        <div class="formula-info">
          <div class="formula-display">
            <div class="formula-label">
              <i class="el-icon-edit-outline"></i>
              <strong>Formula:</strong>
            </div>
            <code class="formula-code">{{ kriData.kri_formula }}</code>
          </div>
          
          <div class="calculation-status">
            <div class="status-item">
              <span class="status-label">Atomic Data Status:</span>
              <div class="atomic-progress">
                <el-progress 
                  :percentage="atomicDataProgress.percentage" 
                  :color="atomicDataProgress.color"
                  :show-text="false"
                  style="width: 120px;">
                </el-progress>
                <span class="progress-text">{{ atomicDataProgress.text }}</span>
              </div>
            </div>
            
            <div class="status-item">
              <span class="status-label">Last Calculation:</span>
              <span class="calculation-time">
                {{ lastCalculationTime || 'Never calculated' }}
              </span>
            </div>
          </div>
          
          <div v-if="hasCalculationMismatch" class="calculation-alert">
            <el-alert
              title="Calculation Mismatch Detected"
              type="warning"
              :description="`Current stored value (${kriData.kri_value}) differs from calculated value. Click 'Recalculate' to update.`"
              show-icon
              :closable="false">
            </el-alert>
          </div>
        </div>
        
        <div class="calculated-actions">
          <el-button
            type="primary"
            icon="el-icon-refresh"
            @click="handleRecalculate"
            :loading="calculatingKRI"
            :disabled="!canRecalculate">
            Recalculate KRI
          </el-button>
          <el-button
            v-if="canSubmitAtomic"
            type="success"
            icon="el-icon-upload"
            @click="handleSubmitAtomic"
            :loading="submittingAtomic">
            Submit Atomic Data
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- Regular Data Input Section (for non-calculated KRIs) -->
    <div v-else-if="canEditKRI" class="data-input-section">
      <el-card class="input-card">
        <div slot="header" class="card-header">
          <span>
            <i class="el-icon-edit"></i>
            Manual Data Input
          </span>
          <el-tag :type="getStatusTagType(kriData.kri_status)" size="small">
            {{ mapStatus(kriData.kri_status) }}
          </el-tag>
        </div>
        <div class="input-content">
          <el-form :model="inputForm" label-width="120px" size="medium">
            <el-form-item label="KRI Value">
              <el-input-number
                v-model="inputForm.kriValue"
                placeholder="Enter KRI value"
                :precision="2"
                style="width: 100%"
                :disabled="inputLoading">
              </el-input-number>
            </el-form-item>
            <el-form-item label="Comment (Optional)">
              <el-input
                v-model="inputForm.comment"
                type="textarea"
                placeholder="Add a comment about this value..."
                :rows="3"
                :disabled="inputLoading">
              </el-input>
            </el-form-item>
            <el-form-item>
              <div class="action-buttons">
                <el-button
                  type="primary"
                  icon="el-icon-check"
                  @click="handleSave"
                  :loading="inputLoading"
                  :disabled="!isValidInput">
                  Save
                </el-button>
                <el-button
                  v-if="kriData.kri_status === 30"
                  type="success"
                  icon="el-icon-upload"
                  @click="handleSubmit"
                  :loading="inputLoading">
                  Submit
                </el-button>
                <el-button
                  v-if="[10, 20].includes(kriData.kri_status)"
                  type="success"
                  icon="el-icon-upload"
                  @click="handleSaveAndSubmit"
                  :loading="inputLoading"
                  :disabled="!isValidInput">
                  Save and Submit
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
    </div>
    
    <el-row :gutter="24" style="margin-top: 1.5rem;">
      <el-col :span="12">
        <div class="info-item">
          <label>RAS Metric</label>
          <p>{{ kriData.ras_metric || 'N/A' }}</p>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="info-item">
          <label>Breach Status</label>
          <el-tooltip :content="getBreachDescription(dynamicBreachStatus)" placement="top">
            <el-tag :type="getBreachTagType(dynamicBreachStatus)" size="small" class="status-tag">
              {{ getBreachDisplayText(dynamicBreachStatus) }}
            </el-tag>
          </el-tooltip>
          <span v-if="dynamicBreachStatus !== (kriData.breach_type || 'No Breach')" class="breach-preview">
            (Preview)
          </span>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { getBreachTagType, getBreachDisplayText, getBreachDescription, mapStatus, getStatusTagType, canPerformAction, calculateBreachStatus } from '@/utils/helpers';

export default {
  name: 'KRIOverview',
  props: {
    kriData: {
      type: Object,
      required: true
    },
    atomicData: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      inputForm: {
        kriValue: null,
        comment: ''
      },
      inputLoading: false,
      calculatingKRI: false,
      submittingAtomic: false
    };
  },
  computed: {
    ...mapState('kri', ['currentUser']),
    
    canEditKRI() {
      // Check if user has edit permission and status allows editing
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriData.kri_id,
        reportingDate: this.kriData.reporting_date // Use integer format for permission key
      };
      
      return canPerformAction(userPermissions, 'edit', this.kriData.kri_status, kriItem);
    },
    
    isValidInput() {
      return this.inputForm.kriValue !== null && this.inputForm.kriValue !== '';
    },

    // Calculate dynamic breach status based on current input
    dynamicBreachStatus() {
      if (this.inputForm.kriValue !== null && this.inputForm.kriValue !== '') {
        return calculateBreachStatus(
          this.inputForm.kriValue,
          this.kriData.warning_line_value,
          this.kriData.limit_value
        );
      }
      return this.kriData.breach_type || 'No Breach';
    },

    // Check if this is a calculated KRI
    isCalculatedKRI() {
      return !!(this.kriData.is_calculated_kri && this.kriData.kri_formula);
    },

    // Atomic data progress for calculated KRIs
    atomicDataProgress() {
      if (!this.isCalculatedKRI || !this.atomicData.length) {
        return { percentage: 0, color: '#f56c6c', text: 'No data' };
      }

      const totalElements = this.atomicData.length;
      const approvedElements = this.atomicData.filter(item => item.atomic_status === 60).length;
      const pendingElements = this.atomicData.filter(item => [30, 40, 50].includes(item.atomic_status)).length;
      const percentage = totalElements > 0 ? Math.round((approvedElements / totalElements) * 100) : 0;

      let color = '#f56c6c'; // Red
      let text = `${approvedElements}/${totalElements} approved`;

      if (percentage >= 100) {
        color = '#67c23a'; // Green
        text = 'All approved';
      } else if (percentage >= 50) {
        color = '#e6a23c'; // Orange
      } else if (pendingElements > 0) {
        color = '#409eff'; // Blue
        text = `${pendingElements} pending approval`;
      }

      return { percentage, color, text };
    },

    // Check if calculation is needed (mismatch between stored and calculated value)
    hasCalculationMismatch() {
      if (!this.isCalculatedKRI || !this.atomicData.length) return false;

      try {
        const calculatedValue = this.calculateFromAtomic();
        const storedValue = parseFloat(this.kriData.kri_value) || 0;
        return Math.abs(calculatedValue - storedValue) > 0.01;
      } catch (error) {
        return false;
      }
    },

    // Check if user can recalculate
    canRecalculate() {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriData.kri_id,
        reportingDate: this.kriData.reporting_date
      };
      
      return this.isCalculatedKRI && 
             this.atomicData.length > 0 &&
             canPerformAction(userPermissions, 'edit', this.kriData.kri_status, kriItem);
    },

    // Check if user can submit atomic data
    canSubmitAtomic() {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriData.kri_id,
        reportingDate: this.kriData.reporting_date
      };
      
      const hasUnsavedAtomic = this.atomicData.some(item => item.atomic_status === 30);
      
      return this.isCalculatedKRI && 
             hasUnsavedAtomic &&
             canPerformAction(userPermissions, 'edit', this.kriData.kri_status, kriItem);
    },

    // Get last calculation time (placeholder - would need audit trail data)
    lastCalculationTime() {
      // This would ideally come from audit trail data
      // For now, return a placeholder
      return 'N/A';
    }
  },
  watch: {
    kriData: {
      handler(newData) {
        // Update input form when kriData changes
        if (newData && newData.kri_value) {
          this.inputForm.kriValue = parseFloat(newData.kri_value) || null;
        }
      },
      immediate: true
    }
  },
  methods: {
    ...mapActions('kri', ['saveKRIValue', 'submitKRI', 'calculateKRIFromAtomic', 'submitAtomicData']),
    
    getBreachTagType,
    getBreachDisplayText,
    getBreachDescription,
    mapStatus,
    getStatusTagType,
    
    async handleSave() {
      if (!this.isValidInput) {
        this.$message.warning('Please enter a valid KRI value');
        return;
      }
      
      this.inputLoading = true;
      
      try {
        const result = await this.saveKRIValue({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date,
          value: this.inputForm.kriValue.toString()
        });
        
        if (result.success) {
          this.$message.success('KRI value saved successfully');
          // Emit event to parent to refresh data
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to save KRI value');
        }
      } catch (error) {
        console.error('Save error:', error);
        this.$message.error('Failed to save KRI value');
      } finally {
        this.inputLoading = false;
      }
    },
    
    async handleSubmit() {
      this.inputLoading = true;
      
      try {
        const result = await this.submitKRI({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date
        });
        
        if (result.success) {
          this.$message.success('KRI submitted successfully');
          // Emit event to parent to refresh data
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to submit KRI');
        }
      } catch (error) {
        console.error('Submit error:', error);
        this.$message.error('Failed to submit KRI');
      } finally {
        this.inputLoading = false;
      }
    },

    async handleSaveAndSubmit() {
      if (!this.isValidInput) {
        this.$message.warning('Please enter a valid KRI value');
        return;
      }
      
      this.inputLoading = true;
      
      try {
        // Step 1: Save the value
        const saveResult = await this.saveKRIValue({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date,
          value: this.inputForm.kriValue.toString()
        });
        
        if (!saveResult.success) {
          this.$message.error(saveResult.error || 'Failed to save KRI value');
          return;
        }
        
        // Step 2: Submit the KRI
        const submitResult = await this.submitKRI({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date
        });
        
        if (submitResult.success) {
          this.$message.success('KRI value saved and submitted successfully');
          // Emit event to parent to refresh data
          this.$emit('data-updated');
        } else {
          this.$message.error(submitResult.error || 'Failed to submit KRI');
        }
      } catch (error) {
        console.error('Save and submit error:', error);
        this.$message.error('Failed to save and submit KRI value');
      } finally {
        this.inputLoading = false;
      }
    },

    // Calculate KRI value from atomic data (client-side preview)
    calculateFromAtomic() {
      if (!this.atomicData.length) return 0;

      const values = this.atomicData.map(item => parseFloat(item.atomic_value) || 0);
      const formula = this.kriData.kri_formula;
      
      if (formula && formula.includes('/') && values.length >= 3) {
        // (A - B) / C pattern
        return (values[0] - values[1]) / values[2];
      } else if (formula && formula.includes('+')) {
        // Sum pattern
        return values.reduce((sum, val) => sum + val, 0);
      } else if (formula && formula.includes('-')) {
        // Subtraction pattern
        return values.reduce((diff, val, index) => index === 0 ? val : diff - val, 0);
      }
      
      // Default: sum
      return values.reduce((sum, val) => sum + val, 0);
    },

    // Handle KRI recalculation
    async handleRecalculate() {
      this.calculatingKRI = true;
      
      try {
        const result = await this.calculateKRIFromAtomic({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date
        });
        
        if (result.success) {
          this.$message.success(`KRI recalculated successfully. New value: ${result.data.calculatedValue}`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to recalculate KRI');
        }
      } catch (error) {
        console.error('Recalculation error:', error);
        this.$message.error('Failed to recalculate KRI');
      } finally {
        this.calculatingKRI = false;
      }
    },

    // Handle atomic data submission
    async handleSubmitAtomic() {
      this.submittingAtomic = true;
      
      try {
        const result = await this.submitAtomicData({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date
        });
        
        if (result.success) {
          this.$message.success('Atomic data submitted for approval successfully');
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to submit atomic data');
        }
      } catch (error) {
        console.error('Atomic submission error:', error);
        this.$message.error('Failed to submit atomic data');
      } finally {
        this.submittingAtomic = false;
      }
    }
  }
};
</script>

<style scoped>
.kri-overview {
  padding: 0.5rem 0;
}

.metric-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
}

.metric-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.metric-value.warning {
  color: #f59e0b;
}

.metric-value.danger {
  color: #ef4444;
}

.data-input-section,
.calculated-kri-section {
  margin: 1.5rem 0;
}

.input-card,
.formula-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #374151;
}

.input-content {
  padding: 0.5rem 0;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.action-buttons .el-button + .el-button {
  margin-left: 10px;
}

.breach-preview {
  color: #909399;
  font-size: 0.75rem;
  margin-left: 0.5rem;
  font-style: italic;
}

.info-item {
  margin-bottom: 1rem;
}

.info-item label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  display: block;
  margin-bottom: 0.25rem;
}

.info-item p {
  font-size: 0.875rem;
  color: #374151;
  margin: 0;
}

.status-tag {
  margin-left: 0.5rem;
}

/* Calculated KRI Styles */
.formula-info {
  margin-bottom: 20px;
}

.formula-display {
  margin-bottom: 16px;
}

.formula-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
}

.formula-code {
  background-color: #2d3748;
  color: #e2e8f0;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  border: 1px solid #4a5568;
  display: block;
  overflow-x: auto;
}

.calculation-status {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.atomic-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-text {
  font-size: 12px;
  color: #6c757d;
  white-space: nowrap;
}

.calculation-time {
  color: #6c757d;
  font-size: 13px;
}

.calculation-alert {
  margin-bottom: 16px;
}

.calculated-actions {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}
</style>