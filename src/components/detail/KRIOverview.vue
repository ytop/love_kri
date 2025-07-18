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
    
    <!-- Data Input Section -->
    <div v-if="canEditKRI" class="data-input-section">
      <el-card class="input-card">
        <div slot="header" class="card-header">
          <span>Data Input</span>
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
    }
  },
  data() {
    return {
      inputForm: {
        kriValue: null,
        comment: ''
      },
      inputLoading: false
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
    ...mapActions('kri', ['saveKRIValue', 'submitKRI']),
    
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

.data-input-section {
  margin: 1.5rem 0;
}

.input-card {
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
</style>