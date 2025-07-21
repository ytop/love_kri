<template>
  <div class="kri-sidebar">
    <!-- Quick Actions -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Quick Actions</span>
      </div>
      <div class="actions">
        <div v-if="isCalculatedKRI" class="calculated-kri-actions">
          <el-alert
            title="Calculated KRI"
            description="Manage atomic data elements to update this KRI value."
            type="info"
            :closable="false"
            show-icon>
          </el-alert>
          
          <!-- Calculated KRI Actions -->
          <template v-if="showCalculatedKRIActions">
            <div class="calculated-actions">
              <el-button
                type="primary"
                icon="el-icon-refresh"
                @click="handleCalculateFromAtomic"
                :loading="actionLoading"
                size="small"
                style="width: 100%;">
                Recalculate KRI Value
              </el-button>
              <el-button
                v-if="canSubmitAtomicData"
                type="success"
                icon="el-icon-upload"
                @click="handleSubmitAtomicData"
                :loading="actionLoading"
                size="small"
                style="width: 100%;">
                Submit Atomic Data
              </el-button>
            </div>
            <div class="atomic-summary">
              <div class="summary-item">
                <label>Total Elements:</label>
                <span>{{ atomicData.length }}</span>
              </div>
              <div class="summary-item">
                <label>Approved:</label>
                <span class="approved-count">{{ approvedAtomicCount }}</span>
              </div>
              <div class="summary-item">
                <label>Pending:</label>
                <span class="pending-count">{{ pendingAtomicCount }}</span>
              </div>
              <div class="summary-item">
                <label>Completeness:</label>
                <el-progress
                  :percentage="atomicCompletenessPercentage"
                  :color="getProgressColor(atomicCompletenessPercentage)"
                  :stroke-width="6"
                  :show-text="false">
                </el-progress>
                <span class="percentage-text">{{ atomicCompletenessPercentage }}%</span>
              </div>
            </div>
          </template>
        </div>
        <template v-else>
          <!-- Data Input Actions for Pending Input/Under Rework status -->
          <template v-if="showDataInputActions">
            <div class="data-input-actions">
              <el-form :model="inputForm" size="small">
                <el-form-item label="KRI Value">
                  <el-input-number
                    v-model="inputForm.kriValue"
                    placeholder="Enter value"
                    :precision="2"
                    style="width: 100%"
                    :disabled="actionLoading">
                  </el-input-number>
                </el-form-item>
                <div class="action-buttons">
                  <el-button
                    type="primary"
                    icon="el-icon-check"
                    @click="handleSave"
                    :loading="actionLoading"
                    :disabled="!isValidInput"
                    size="small"
                    style="width: 100%;">
                    Save
                  </el-button>
                  <el-button
                    v-if="kriData.kri_status === 30"
                    type="success"
                    icon="el-icon-upload"
                    @click="handleSubmit"
                    :loading="actionLoading"
                    size="small"
                    style="width: 100%;">
                    Submit
                  </el-button>
                </div>
              </el-form>
            </div>
          </template>
          
          <!-- Review Actions for Data Provider Approver -->
          <template v-if="showReviewActions">
            <el-button
              type="primary"
              icon="el-icon-check"
              @click="handleApproveKRI"
              :loading="actionLoading"
              style="width: 100%;">
              Approve
            </el-button>
            <el-button
              type="danger"
              icon="el-icon-close"
              @click="handleRejectKRI"
              :loading="actionLoading"
              style="width: 100%;">
              Reject
            </el-button>
          </template>
          
          <!-- Acknowledge Actions for KRI Owner Approver -->
          <template v-if="showAcknowledgeActions">
            <el-button
              type="primary"
              icon="el-icon-check"
              @click="handleAcknowledgeKRI"
              :loading="actionLoading"
              style="width: 100%;">
              Acknowledge
            </el-button>
            <el-button
              type="danger"
              icon="el-icon-close"
              @click="handleRejectKRI"
              :loading="actionLoading"
              style="width: 100%;">
              Reject
            </el-button>
          </template>
          
          <!-- No Actions Available -->
          <div v-if="!showDataInputActions && !showReviewActions && !showAcknowledgeActions" class="no-actions">
            <el-alert
              title="No Actions Available"
              description="You don't have permission to perform actions on this KRI, or it's in a status that doesn't allow actions."
              type="info"
              :closable="false"
              show-icon>
            </el-alert>
          </div>
        </template>
      </div>
    </el-card>

    <!-- Breach Status -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Breach Status</span>
      </div>
      <div>
        <v-chart class="chart" :option="gaugeOption" style="height: 200px;" autoresize />
      </div>
    </el-card>

    <!-- 12-Month Trend -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>12-Month Trend</span>
      </div>
      <div>
        <v-chart class="chart" :option="lineOption" style="height: 200px;" autoresize />
      </div>
    </el-card>

    <!-- Navigation -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Navigation</span>
      </div>
      <div class="navigation">
        <el-button type="text" style="width: 100%; text-align: left; padding-left: 0;">
          <i class="el-icon-document"></i>
          Related KRIs
        </el-button>
        <el-button type="text" style="width: 100%; text-align: left; padding-left: 0;">
          <i class="el-icon-setting"></i>
          Configuration
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { mapStatus, formatDateFromInt, getStatusTagType, canPerformAction } from '@/utils/helpers';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { GaugeChart, LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';

use([
  CanvasRenderer,
  GaugeChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
]);

export default {
  components: {
    VChart
  },
  provide: {
    [THEME_KEY]: 'light' // or 'dark'
  },
  name: 'KRISidebar',
  props: {
    kriData: {
      type: Object,
      required: true
    },
    atomicData: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      inputForm: {
        kriValue: null
      },
      actionLoading: false
    };
  },
  computed: {
    ...mapState('kri', ['currentUser']),
    
    // Check if user can perform data input actions
    showDataInputActions() {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriData.kri_id,
        reportingDate: this.kriData.reporting_date
      };
      
      // Show for Pending Input (10), Under Rework (20), and Saved (30) status
      return [10, 20, 30].includes(this.kriData.kri_status) &&
             canPerformAction(userPermissions, 'edit', this.kriData.kri_status, kriItem);
    },
    
    // Check if user can perform review actions (Data Provider Approver)
    showReviewActions() {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriData.kri_id,
        reportingDate: this.kriData.reporting_date // Use integer format for permission key
      };
      
      return this.kriData.kri_status === 40 && // Submitted to Data Provider Approver
             canPerformAction(userPermissions, 'review', this.kriData.kri_status, kriItem);
    },
    
    // Check if user can perform acknowledge actions (KRI Owner Approver)
    showAcknowledgeActions() {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriData.kri_id,
        reportingDate: this.kriData.reporting_date 
      };
      
      return this.kriData.kri_status === 50 && // Submitted to KRI Owner Approver
             canPerformAction(userPermissions, 'acknowledge', this.kriData.kri_status, kriItem);
    },
    
    isValidInput() {
      return this.inputForm.kriValue !== null && this.inputForm.kriValue !== '';
    },
    completeAtomicCount() {
      return this.atomicData.filter(item => 
        item.atomic_value && item.atomic_value !== 'N/A'
      ).length;
    },
    
    completenessPercentage() {
      if (this.atomicData.length === 0) return 0;
      return Math.round((this.completeAtomicCount / this.atomicData.length) * 100);
    },

    // Determine if this is a calculated KRI (has atomic data elements)
    isCalculatedKRI() {
      return this.atomicData && this.atomicData.length > 0;
    },

    // Check if user can perform calculated KRI actions
    showCalculatedKRIActions() {
      if (!this.isCalculatedKRI) return false;
      
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriData.kri_id,
        reportingDate: this.kriData.reporting_date
      };
      
      // Show actions if user can edit or review
      return canPerformAction(userPermissions, 'edit', this.kriData.kri_status, kriItem) ||
             canPerformAction(userPermissions, 'review', this.kriData.kri_status, kriItem);
    },

    // Check if user can submit atomic data
    canSubmitAtomicData() {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriData.kri_id,
        reportingDate: this.kriData.reporting_date
      };
      
      return [10, 20, 30].includes(this.kriData.kri_status) &&
             canPerformAction(userPermissions, 'edit', this.kriData.kri_status, kriItem);
    },

    // Count approved atomic elements
    approvedAtomicCount() {
      return this.atomicData.filter(item => item.atomic_status === 60).length;
    },

    // Count pending atomic elements (not finalized)
    pendingAtomicCount() {
      return this.atomicData.filter(item => item.atomic_status !== 60).length;
    },

    // Calculate atomic data completeness percentage
    atomicCompletenessPercentage() {
      if (this.atomicData.length === 0) return 0;
      return Math.round((this.approvedAtomicCount / this.atomicData.length) * 100);
    },

    gaugeOption() {
      // Helper function to parse values, handling "N/A" and other non-numeric strings
      const parseValue = (value) => {
        if (value === null || value === undefined || value === 'N/A' || value === '') {
          return NaN;
        }
        return parseFloat(value);
      };
      
      const currentValue = Math.floor(parseValue(this.kriData.kri_value) || NaN);
      const warningLine = Math.floor(parseValue(this.kriData.warning_line_value) || NaN);
      const limitValue = Math.floor(parseValue(this.kriData.limit_value) || NaN);
      
      // Validate critical KRI values
      const hasValidCurrentValue = Number.isFinite(currentValue);
      const hasValidWarningLine = Number.isFinite(warningLine);
      const hasValidLimitValue = Number.isFinite(limitValue) && limitValue > 0;
      
      // Return invalid gauge state if any critical value is missing or invalid
      if (!hasValidCurrentValue || !hasValidWarningLine || !hasValidLimitValue) {
        console.log('KRI gauge disabled due to missing/invalid values:', {
          kri_value: this.kriData.kri_value,
          warning_line_value: this.kriData.warning_line_value,
          limit_value: this.kriData.limit_value,
          currentValue,
          warningLine,
          limitValue
        });
        return {
          series: [
            {
              type: 'gauge',
              center: ['50%', '60%'],
              startAngle: 200,
              endAngle: -20,
              min: 0,
              max: 100,
              splitNumber: 5,
              axisLine: {
                lineStyle: {
                  width: 18,
                  color: [[1, '#e5e7eb']]  // Gray for invalid state
                }
              },
              progress: {
                show: false
              },
              pointer: {
                show: false
              },
              axisTick: {
                distance: -25,
                splitNumber: 5,
                lineStyle: {
                  width: 1,
                  color: '#999'
                }
              },
              splitLine: {
                distance: -25,
                length: 8,
                lineStyle: {
                  width: 1,
                  color: '#bbb'
                }
              },
              axisLabel: {
                distance: -10,
                color: '#999',
                fontSize: 9
              },
              anchor: {
                show: false
              },
              title: {
                show: true,
                offsetCenter: [0, '30%'],
                fontSize: 12,
                color: '#666'
              },
              detail: {
                width: '60%',
                lineHeight: 30,
                borderRadius: 6,
                offsetCenter: [0, '60%'],
                fontSize: 16,
                fontWeight: 'bold',
                formatter: 'Invalid',
                color: '#6b7280'
              },
              data: [
                {
                  value: 0,
                  name: 'Invalid Data'
                }
              ]
            }
          ]
        };
      }
      
      // Calculate gauge segments based on actual thresholds
      const warningPercent = (warningLine / limitValue) * 100;
      const segments = [
        [warningPercent / 100, '#67C23A'],  // Green up to warning line
        [1, '#F56C6C']                      // Red from warning line to limit
      ];
      
      return {
        series: [
          {
            type: 'gauge',
            center: ['50%', '60%'],
            startAngle: 200,
            endAngle: -20,
            min: 0,
            max: limitValue,
            splitNumber: 5,
            axisLine: {
              lineStyle: {
                width: 18,
                color: segments
              }
            },
            progress: {
              show: true,
              width: 18,
              itemStyle: {
                color: 'auto'
              }
            },
            pointer: {
              show: true,
              width: 6,
              length: '65%',
              itemStyle: {
                color: 'auto'
              }
            },
            axisTick: {
              distance: -25,
              splitNumber: 5,
              lineStyle: {
                width: 1,
                color: '#999'
              }
            },
            splitLine: {
              distance: -25,
              length: 8,
              lineStyle: {
                width: 1,
                color: '#bbb'
              }
            },
            axisLabel: {
              distance: -10,
              color: 'auto',
              fontSize: 9
            },
            anchor: {
              show: false
            },
            title: {
              show: true,
              offsetCenter: [0, '30%'],
              fontSize: 12,
              color: '#666'
            },
            detail: {
              valueAnimation: true,
              width: '60%',
              lineHeight: 30,
              borderRadius: 6,
              offsetCenter: [0, '60%'],
              fontSize: 20,
              fontWeight: 'bold',
              formatter: '{value}',
              color: 'auto'
            },
            data: [
              {
                value: currentValue,
                name: 'Breach Level'
              }
            ]
          }
        ]
      };
    },
    lineOption() {
      return {
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c}' // Simple tooltip
        },
        xAxis: {
          type: 'category',
          data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          boundaryGap: false, // Line starts from the edge
          axisTick: { show: false }, // Hide ticks
          axisLine: { show: false } // Hide x-axis line
        },
        yAxis: {
          type: 'value',
          splitLine: { show: false }, // Hide y-axis grid lines
          axisLabel: { show: false }, // Hide y-axis labels
          axisLine: { show: false } // Hide y-axis line
        },
        series: [
          {
            data: [10, 22, 15, 28, 20, 30, 25, 35, 30, 40, 38, 45], // Placeholder data
            type: 'line',
            smooth: true,
            symbol: 'circle', // Show data points as circles
            symbolSize: 6,
            itemStyle: {
              color: '#3b82f6' // Primary blue color for line and points
            },
            lineStyle: {
              color: '#3b82f6',
              width: 2
            },
            areaStyle: { // Optional: add a subtle gradient area below the line
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [{
                  offset: 0, color: 'rgba(59, 130, 246, 0.3)' // Light blue tint
                }, {
                  offset: 1, color: 'rgba(59, 130, 246, 0)' // Transparent
                }]
              }
            }
          }
        ],
        grid: { // Adjust grid to make chart cleaner
          left: '0%',
          right: '2%',
          top: '5%', // Add some top margin
          bottom: '0%',
          containLabel: false // Set to false if axes are hidden
        }
      };
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
    ...mapActions('kri', ['saveKRIValue', 'submitKRI', 'updateKRIStatus']),
    
    mapStatus,
    getStatusTagType,
    
    formatReportingDate(dateInt) {
      return formatDateFromInt(dateInt);
    },
    
    getProgressColor(percentage) {
      if (percentage >= 80) return '#67c23a';
      if (percentage >= 60) return '#e6a23c';
      return '#f56c6c';
    },
    
    async handleSave() {
      if (!this.isValidInput) {
        this.$message.warning('Please enter a valid KRI value');
        return;
      }
      
      this.actionLoading = true;
      
      try {
        const result = await this.saveKRIValue({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date, // Use integer format
          value: this.inputForm.kriValue.toString()
        });
        
        if (result.success) {
          this.$message.success('KRI value saved successfully');
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to save KRI value');
        }
      } catch (error) {
        console.error('Save error:', error);
        this.$message.error('Failed to save KRI value');
      } finally {
        this.actionLoading = false;
      }
    },
    
    async handleSubmit() {
      this.actionLoading = true;
      
      try {
        const result = await this.submitKRI({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date // Use integer format
        });
        
        if (result.success) {
          this.$message.success('KRI submitted successfully');
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to submit KRI');
        }
      } catch (error) {
        console.error('Submit error:', error);
        this.$message.error('Failed to submit KRI');
      } finally {
        this.actionLoading = false;
      }
    },
    
    async handleApproveKRI() {
      this.actionLoading = true;
      
      try {
        const result = await this.updateKRIStatus({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date, // Use integer format
          newStatus: 50, // Move to KRI Owner Approver
          changedBy: this.currentUser.name,
          reason: 'Approved by Data Provider Approver'
        });
        
        if (result.success) {
          this.$message.success('KRI approved successfully');
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to approve KRI');
        }
      } catch (error) {
        console.error('Error approving KRI:', error);
        this.$message.error('Failed to approve KRI');
      } finally {
        this.actionLoading = false;
      }
    },
    
    async handleAcknowledgeKRI() {
      this.actionLoading = true;
      
      try {
        const result = await this.updateKRIStatus({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date, // Use integer format
          newStatus: 60, // Move to Finalized
          changedBy: this.currentUser.name,
          reason: 'Acknowledged by KRI Owner Approver'
        });
        
        if (result.success) {
          this.$message.success('KRI acknowledged and finalized successfully');
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to acknowledge KRI');
        }
      } catch (error) {
        console.error('Error acknowledging KRI:', error);
        this.$message.error('Failed to acknowledge KRI');
      } finally {
        this.actionLoading = false;
      }
    },
    
    async handleRejectKRI() {
      this.actionLoading = true;
      
      try {
        // Prompt for rejection reason
        const reason = await this.$prompt('Please provide a reason for rejection:', 'Reject KRI', {
          confirmButtonText: 'Reject',
          cancelButtonText: 'Cancel',
          inputValidator: (value) => {
            if (!value || value.trim().length < 3) {
              return 'Reason must be at least 3 characters long';
            }
            return true;
          }
        });
        
        const result = await this.updateKRIStatus({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date, // Use integer format
          newStatus: 20, // Move to Under Rework
          changedBy: this.currentUser.name,
          reason: reason.value
        });
        
        if (result.success) {
          this.$message.success('KRI rejected and sent back for rework');
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to reject KRI');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error rejecting KRI:', error);
          this.$message.error('Failed to reject KRI');
        }
      } finally {
        this.actionLoading = false;
      }
    },

    // Calculated KRI action handlers
    async handleCalculateFromAtomic() {
      this.actionLoading = true;
      
      try {
        const result = await this.$store.dispatch('kri/calculateKRIFromAtomic', {
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date
        });
        
        if (result.success) {
          this.$message.success('KRI value recalculated successfully');
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to recalculate KRI value');
        }
      } catch (error) {
        console.error('Error calculating KRI from atomic:', error);
        this.$message.error('Failed to recalculate KRI value');
      } finally {
        this.actionLoading = false;
      }
    },

    async handleSubmitAtomicData() {
      // Check if all atomic elements have values
      const missingValues = this.atomicData.filter(item => 
        !item.atomic_value || item.atomic_value === 'N/A' || item.atomic_value === ''
      );

      if (missingValues.length > 0) {
        this.$message.warning(`${missingValues.length} atomic element(s) are missing values. Please complete all data before submission.`);
        return;
      }

      this.actionLoading = true;
      
      try {
        const result = await this.$store.dispatch('kri/submitAtomicData', {
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date
        });
        
        if (result.success) {
          this.$message.success('Atomic data submitted successfully');
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to submit atomic data');
        }
      } catch (error) {
        console.error('Error submitting atomic data:', error);
        this.$message.error('Failed to submit atomic data');
      } finally {
        this.actionLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.kri-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  font-weight: 600;
  color: #374151;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem; /* Use a slightly larger gap for clarity, e.g., 0.75rem or 12px */
}

/* Override Element UI's default margin between adjacent buttons */
.el-button + .el-button {
  margin-left: 0;
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-item label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.summary-item span {
  font-size: 0.875rem;
  color: #374151;
}

.summary-item .value {
  font-weight: 600;
  color: #1f2937;
}

.quality-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.quality-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quality-item label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.quality-item .count {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 600;
}

.navigation {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.navigation .el-button {
  justify-content: flex-start;
  color: #6b7280;
}

.navigation .el-button:hover {
  color: #3b82f6;
}

.navigation .el-button i {
  margin-right: 0.5rem;
}

.calculated-kri-notice {
  margin-bottom: 0.75rem;
}

.calculated-kri-notice >>> .el-alert {
  margin: 0;
}

.calculated-kri-notice >>> .el-alert__title {
  font-size: 0.875rem;
  font-weight: 600;
}

.calculated-kri-notice >>> .el-alert__description {
  font-size: 0.75rem;
  line-height: 1.4;
  margin-top: 0.25rem;
}

.data-input-actions {
  padding: 0.5rem 0;
}

.data-input-actions .el-form-item {
  margin-bottom: 1rem;
}

.data-input-actions .el-form-item:last-child {
  margin-bottom: 0;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.no-actions {
  margin-bottom: 0.75rem;
}

.no-actions >>> .el-alert {
  margin: 0;
}

.no-actions >>> .el-alert__title {
  font-size: 0.875rem;
  font-weight: 600;
}

.no-actions >>> .el-alert__description {
  font-size: 0.75rem;
  line-height: 1.4;
  margin-top: 0.25rem;
}
</style>