<template>
  <el-dialog
    :title="dialogTitle"
    :visible.sync="visible"
    width="800px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
    class="atomic-input-dialog">
    
    <div class="dialog-content">
      <!-- Progress Indicator -->
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-text">Atomic Data Entry Progress</span>
          <span class="progress-count">{{ completedCount }}/{{ totalCount }} Complete</span>
        </div>
        <el-progress 
          :percentage="progressPercentage" 
          :color="progressColor"
          class="progress-bar">
        </el-progress>
      </div>

      <!-- Bulk Actions Toolbar -->
      <div class="bulk-actions-toolbar">
        <el-button-group>
          <el-button 
            icon="el-icon-refresh" 
            @click="autoCalculateAll"
            :disabled="!hasFormula">
            Auto Calculate
          </el-button>
          <el-button 
            icon="el-icon-document-copy" 
            @click="copyPreviousValues"
            :disabled="!hasPreviousData">
            Copy Previous
          </el-button>
          <el-button 
            icon="el-icon-delete" 
            @click="clearAllValues">
            Clear All
          </el-button>
        </el-button-group>

        <div class="validation-info">
          <el-tag v-if="hasValidationErrors" type="danger" size="mini">
            <i class="el-icon-warning"></i>
            {{ validationErrors.length }} Errors
          </el-tag>
          <el-tag v-else-if="isAllValid" type="success" size="mini">
            <i class="el-icon-success"></i>
            All Valid
          </el-tag>
        </div>
      </div>

      <!-- Atomic Elements Input Form -->
      <div class="atomic-form-container">
        <el-form 
          ref="atomicForm" 
          :model="formData" 
          :rules="formRules" 
          label-position="top"
          class="atomic-form">
          
          <div class="atomic-grid">
            <div 
              v-for="item in atomicElements" 
              :key="item.atomic_id" 
              class="atomic-form-item"
              :class="{'has-error': getFieldError(item.atomic_id)}">
              
              <div class="atomic-form-header">
                <div class="atomic-info">
                  <span class="atomic-id-label">Element {{ item.atomic_id }}</span>
                  <el-tag 
                    :type="getAtomicStatusType(item.atomic_status)" 
                    size="mini">
                    {{ mapAtomicStatus(item.atomic_status) }}
                  </el-tag>
                </div>
                <div class="atomic-actions">
                  <el-tooltip content="Calculate from previous values" v-if="hasPreviousValue(item.atomic_id)">
                    <el-button 
                      icon="el-icon-refresh-right" 
                      size="mini" 
                      circle
                      @click="calculateSingleValue(item.atomic_id)">
                    </el-button>
                  </el-tooltip>
                </div>
              </div>

              <div class="atomic-form-content">
                <el-form-item 
                  :label="item.atomic_metadata || `Data Element ${item.atomic_id}`"
                  :prop="`values.${item.atomic_id}`"
                  class="atomic-input-item">
                  
                  <el-input-number
                    v-model="formData.values[item.atomic_id]"
                    :precision="2"
                    :step="0.01"
                    :min="getMinValue(item)"
                    :max="getMaxValue(item)"
                    placeholder="Enter value"
                    style="width: 100%"
                    @change="handleValueChange(item.atomic_id, $event)"
                    @blur="validateSingleField(item.atomic_id)">
                  </el-input-number>
                  
                  <div v-if="getFieldError(item.atomic_id)" class="field-error">
                    {{ getFieldError(item.atomic_id) }}
                  </div>
                </el-form-item>

                <div class="atomic-metadata">
                  <div class="current-value" v-if="item.atomic_value">
                    <span class="label">Current:</span>
                    <span class="value">{{ item.atomic_value }}</span>
                  </div>
                  <div class="previous-value" v-if="getPreviousValue(item.atomic_id)">
                    <span class="label">Previous:</span>
                    <span class="value">{{ getPreviousValue(item.atomic_id) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Live Calculation Preview -->
          <div v-if="kriDetail.kri_formula && hasAnyValue" class="calculation-preview">
            <div class="preview-header">
              <h4>
                <i class="el-icon-s-data"></i>
                Live Calculation Preview
              </h4>
              <el-tag type="info" size="mini">Updates in real-time</el-tag>
            </div>
            
            <div class="preview-content">
              <div class="formula-display">
                <strong>Formula:</strong>
                <code>{{ kriDetail.kri_formula }}</code>
              </div>
              <div class="calculation-display">
                <strong>Calculation:</strong>
                <code>{{ getCalculationPreview() }}</code>
              </div>
              <div class="result-display">
                <strong>Result:</strong>
                <span class="preview-result">{{ getResultPreview() }}</span>
                <el-tag v-if="isResultDifferent" type="warning" size="mini">
                  Different from current ({{ kriDetail.kri_value }})
                </el-tag>
              </div>
            </div>
          </div>
        </el-form>
      </div>
    </div>

    <!-- Dialog Footer -->
    <div slot="footer" class="dialog-footer">
      <div class="footer-actions">
        <div class="left-actions">
          <el-button @click="handleClose">Cancel</el-button>
          <el-button type="info" @click="saveDraft" :loading="savingDraft">
            Save Draft
          </el-button>
        </div>
        <div class="right-actions">
          <el-button 
            type="primary" 
            @click="saveAndClose"
            :loading="saving"
            :disabled="!canSave">
            Save & Close
          </el-button>
          <el-button 
            type="success" 
            @click="saveAndSubmit"
            :loading="submitting"
            :disabled="!canSubmit">
            Save & Submit for Approval
          </el-button>
        </div>
      </div>
      
      <div class="footer-info">
        <el-alert
          v-if="hasValidationErrors"
          :title="`Please fix ${validationErrors.length} validation error(s) before proceeding`"
          type="error"
          :closable="false"
          show-icon>
        </el-alert>
        <el-alert
          v-else-if="hasUnsavedChanges"
          title="You have unsaved changes"
          type="warning"
          :closable="false"
          show-icon>
        </el-alert>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import { mapStatus, getStatusTagType } from '@/utils/helpers';

export default {
  name: 'AtomicInputDialog',
  props: {
    value: {
      type: Boolean,
      default: false
    },
    atomicData: {
      type: Array,
      default: () => []
    },
    kriDetail: {
      type: Object,
      required: true
    },
    previousData: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      visible: this.value,
      formData: {
        values: {}
      },
      validationErrors: [],
      saving: false,
      savingDraft: false,
      submitting: false,
      originalValues: {},
      formRules: {}
    };
  },
  computed: {
    dialogTitle() {
      return `Bulk Atomic Data Entry - KRI ${this.kriDetail.kri_id}`;
    },
    
    atomicElements() {
      return this.atomicData || [];
    },
    
    totalCount() {
      return this.atomicElements.length;
    },
    
    completedCount() {
      return Object.values(this.formData.values).filter(v => v !== null && v !== undefined && v !== '').length;
    },
    
    progressPercentage() {
      return this.totalCount > 0 ? Math.round((this.completedCount / this.totalCount) * 100) : 0;
    },
    
    progressColor() {
      if (this.progressPercentage < 30) return '#f56c6c';
      if (this.progressPercentage < 70) return '#e6a23c';
      return '#67c23a';
    },
    
    hasFormula() {
      return !!(this.kriDetail.kri_formula && this.kriDetail.kri_formula.trim());
    },
    
    hasPreviousData() {
      return this.previousData && this.previousData.length > 0;
    },
    
    hasValidationErrors() {
      return this.validationErrors.length > 0;
    },
    
    isAllValid() {
      return this.completedCount === this.totalCount && !this.hasValidationErrors;
    },
    
    hasAnyValue() {
      return Object.keys(this.formData.values).some(key => 
        this.formData.values[key] !== null && this.formData.values[key] !== undefined && this.formData.values[key] !== ''
      );
    },
    
    hasUnsavedChanges() {
      return JSON.stringify(this.formData.values) !== JSON.stringify(this.originalValues);
    },
    
    canSave() {
      return this.hasAnyValue && !this.hasValidationErrors;
    },
    
    canSubmit() {
      return this.isAllValid;
    },
    
    isResultDifferent() {
      const currentValue = parseFloat(this.kriDetail.kri_value) || 0;
      const previewValue = parseFloat(this.getResultPreview()) || 0;
      return Math.abs(currentValue - previewValue) > 0.01;
    }
  },
  watch: {
    value(newVal) {
      this.visible = newVal;
      if (newVal) {
        this.initializeForm();
      }
    },
    visible(newVal) {
      this.$emit('input', newVal);
    }
  },
  methods: {
    mapAtomicStatus: mapStatus,
    getAtomicStatusType: getStatusTagType,
    
    initializeForm() {
      // Initialize form data with current atomic values
      const values = {};
      this.atomicElements.forEach(item => {
        values[item.atomic_id] = parseFloat(item.atomic_value) || null;
      });
      
      this.formData.values = { ...values };
      this.originalValues = { ...values };
      this.validationErrors = [];
      
      // Initialize form rules
      this.generateFormRules();
    },
    
    generateFormRules() {
      const rules = {};
      this.atomicElements.forEach(item => {
        rules[`values.${item.atomic_id}`] = [
          {
            required: true,
            message: `${item.atomic_metadata || 'This field'} is required`,
            trigger: 'blur'
          },
          {
            type: 'number',
            message: 'Must be a valid number',
            trigger: 'blur'
          }
        ];
      });
      this.formRules = rules;
    },
    
    handleValueChange(atomicId, value) {
      this.$set(this.formData.values, atomicId, value);
      this.validateSingleField(atomicId);
    },
    
    validateSingleField(atomicId) {
      // Remove existing error for this field
      this.validationErrors = this.validationErrors.filter(error => error.field !== atomicId);
      
      const value = this.formData.values[atomicId];
      
      // Custom validation logic
      if (value === null || value === undefined || value === '') {
        this.validationErrors.push({
          field: atomicId,
          message: 'Value is required'
        });
      } else if (isNaN(value)) {
        this.validationErrors.push({
          field: atomicId,
          message: 'Must be a valid number'
        });
      }
      
      // Additional business validation can be added here
    },
    
    getFieldError(atomicId) {
      const error = this.validationErrors.find(e => e.field === atomicId);
      return error ? error.message : null;
    },
    
    getMinValue(_item) {
      // Can be customized based on item metadata
      return undefined;
    },
    
    getMaxValue(_item) {
      // Can be customized based on item metadata  
      return undefined;
    },
    
    hasPreviousValue(atomicId) {
      return this.previousData.some(item => item.atomic_id === atomicId && item.atomic_value);
    },
    
    getPreviousValue(atomicId) {
      const prev = this.previousData.find(item => item.atomic_id === atomicId);
      return prev ? prev.atomic_value : null;
    },
    
    autoCalculateAll() {
      // Placeholder for auto calculation logic
      this.$message.info('Auto calculation feature will be implemented based on business rules');
    },
    
    copyPreviousValues() {
      let copiedCount = 0;
      this.previousData.forEach(prevItem => {
        if (prevItem.atomic_value && this.atomicElements.some(item => item.atomic_id === prevItem.atomic_id)) {
          this.$set(this.formData.values, prevItem.atomic_id, parseFloat(prevItem.atomic_value));
          copiedCount++;
        }
      });
      
      if (copiedCount > 0) {
        this.$message.success(`Copied ${copiedCount} values from previous period`);
      } else {
        this.$message.warning('No previous values available to copy');
      }
    },
    
    clearAllValues() {
      this.$confirm('Are you sure you want to clear all entered values?', 'Confirm Clear', {
        confirmButtonText: 'Clear All',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(() => {
        Object.keys(this.formData.values).forEach(key => {
          this.$set(this.formData.values, key, null);
        });
        this.validationErrors = [];
        this.$message.success('All values cleared');
      }).catch(() => {});
    },
    
    calculateSingleValue(atomicId) {
      // Placeholder for single value calculation
      this.$message.info(`Calculate value for atomic element ${atomicId} - business logic to be implemented`);
    },
    
    getCalculationPreview() {
      if (!this.kriDetail.kri_formula) return 'No formula available';
      
      let formula = this.kriDetail.kri_formula;
      const variables = ['A', 'B', 'C', 'D', 'E', 'F'];
      
      // Replace variables with actual values
      this.atomicElements.forEach((item, index) => {
        const value = this.formData.values[item.atomic_id];
        if (variables[index] && value !== null && value !== undefined) {
          formula = formula.replace(new RegExp(variables[index], 'g'), value.toString());
        }
      });
      
      return formula;
    },
    
    getResultPreview() {
      try {
        const values = this.atomicElements.map(item => 
          parseFloat(this.formData.values[item.atomic_id]) || 0
        ).filter(v => !isNaN(v));
        
        if (values.length === 0) return 'No values entered';
        
        const formula = this.kriDetail.kri_formula;
        if (formula && formula.includes('/') && values.length >= 3) {
          return ((values[0] - values[1]) / values[2]).toFixed(4);
        } else if (formula && formula.includes('+')) {
          return values.reduce((sum, val) => sum + val, 0).toFixed(4);
        } else if (formula && formula.includes('-')) {
          return values.reduce((diff, val, index) => index === 0 ? val : diff - val, 0).toFixed(4);
        }
        
        return values.reduce((sum, val) => sum + val, 0).toFixed(4);
      } catch (error) {
        return 'Calculation error';
      }
    },
    
    async saveDraft() {
      this.savingDraft = true;
      try {
        await this.performSave(false);
        this.$message.success('Draft saved successfully');
      } catch (error) {
        this.$message.error('Failed to save draft');
      } finally {
        this.savingDraft = false;
      }
    },
    
    async saveAndClose() {
      this.saving = true;
      try {
        await this.performSave(false);
        this.$message.success('Changes saved successfully');
        this.handleClose();
      } catch (error) {
        this.$message.error('Failed to save changes');
      } finally {
        this.saving = false;
      }
    },
    
    async saveAndSubmit() {
      this.submitting = true;
      try {
        await this.performSave(true);
        this.$message.success('Data saved and submitted for approval');
        this.handleClose();
      } catch (error) {
        this.$message.error('Failed to save and submit');
      } finally {
        this.submitting = false;
      }
    },
    
    async performSave(submit = false) {
      // Validate form first
      await this.$refs.atomicForm.validate();
      
      const changedValues = [];
      Object.keys(this.formData.values).forEach(atomicId => {
        const newValue = this.formData.values[atomicId];
        const originalValue = this.originalValues[atomicId];
        
        if (newValue !== originalValue && newValue !== null && newValue !== undefined) {
          changedValues.push({
            atomicId: parseInt(atomicId),
            value: newValue.toString()
          });
        }
      });
      
      if (changedValues.length === 0) {
        throw new Error('No changes detected');
      }
      
      // Use bulk update for efficiency
      if (changedValues.length === 1) {
        // Single update
        const change = changedValues[0];
        const result = await this.$store.dispatch('kri/saveAtomicValue', {
          kriId: this.kriDetail.kri_id,
          reportingDate: this.kriDetail.reporting_date,
          atomicId: change.atomicId,
          value: change.value
        });
        
        if (!result.success) {
          throw new Error(result.error || `Failed to save atomic element ${change.atomicId}`);
        }
      } else {
        // Bulk update for multiple changes
        const result = await this.$store.dispatch('kri/bulkUpdateAtomicValues', {
          kriId: this.kriDetail.kri_id,
          reportingDate: this.kriDetail.reporting_date,
          atomicUpdates: changedValues
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to save atomic elements');
        }
      }
      
      // If submit flag is true, also submit the atomic data
      if (submit) {
        const submitResult = await this.$store.dispatch('kri/submitAtomicData', {
          kriId: this.kriDetail.kri_id,
          reportingDate: this.kriDetail.reporting_date
        });
        
        if (!submitResult.success) {
          throw new Error(submitResult.error || 'Failed to submit atomic data');
        }
      }
      
      // Update original values to current values
      this.originalValues = { ...this.formData.values };
      this.$emit('data-updated');
    },
    
    handleClose() {
      if (this.hasUnsavedChanges) {
        this.$confirm('You have unsaved changes. Are you sure you want to close?', 'Unsaved Changes', {
          confirmButtonText: 'Close Anyway',
          cancelButtonText: 'Keep Editing',
          type: 'warning'
        }).then(() => {
          this.visible = false;
        }).catch(() => {});
      } else {
        this.visible = false;
      }
    }
  }
};
</script>

<style scoped>
.atomic-input-dialog {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.dialog-content {
  padding: 8px 0;
}

/* Progress Section */
.progress-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-text {
  font-weight: 600;
  color: #495057;
}

.progress-count {
  font-size: 14px;
  color: #6c757d;
}

.progress-bar {
  margin-top: 8px;
}

/* Bulk Actions */
.bulk-actions-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 12px 0;
  border-bottom: 1px solid #e9ecef;
}

/* Atomic Form */
.atomic-form-container {
  max-height: 500px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.atomic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.atomic-form-item {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  background-color: #ffffff;
  transition: all 0.2s ease;
}

.atomic-form-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.atomic-form-item.has-error {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.atomic-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.atomic-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.atomic-id-label {
  font-weight: 600;
  color: #409eff;
  font-size: 14px;
}

.atomic-form-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.atomic-input-item {
  margin-bottom: 8px;
}

.field-error {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
}

.atomic-metadata {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #6c757d;
}

.atomic-metadata .label {
  font-weight: 500;
}

.atomic-metadata .value {
  font-weight: 600;
  color: #059669;
}

/* Calculation Preview */
.calculation-preview {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.preview-header h4 {
  margin: 0;
  font-size: 16px;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.formula-display,
.calculation-display,
.result-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.formula-display code,
.calculation-display code {
  background-color: #2d3748;
  color: #e2e8f0;
  padding: 6px 12px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.preview-result {
  font-size: 18px;
  font-weight: 700;
  color: #059669;
  background-color: #f0fdf4;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #d1fae5;
}

/* Dialog Footer */
.dialog-footer {
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

.footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.left-actions,
.right-actions {
  display: flex;
  gap: 8px;
}

.footer-info {
  margin-top: 12px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .atomic-grid {
    grid-template-columns: 1fr;
  }
  
  .bulk-actions-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .footer-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .left-actions,
  .right-actions {
    justify-content: center;
  }
}
</style>