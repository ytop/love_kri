<template>
  <div class="kri-sidebar">
    <!-- Quick Actions -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Quick Actions</span>
      </div>
      <div class="actions">
        <!-- Use existing permission logic but with simplified button layout -->
        <template v-if="showReviewActions || showAcknowledgeActions">
          <el-button 
            type="primary" 
            @click="handleApproveKRI"
            :loading="actionLoading"
            style="width: 100%;">
            <i class="el-icon-check"></i>
            Approve KRI
          </el-button>
          <el-button
            type="danger"
            icon="el-icon-close"
            @click="handleRejectKRI"
            :loading="actionLoading"
            style="width: 100%;">
            Reject KRI
          </el-button>
        </template>
        
        <!-- Data Input Actions (simplified) -->
        <template v-else-if="showDataInputActions">
          <!-- Show validation warning when save is disabled -->
          <div v-if="validationMessage && !actionLoading" class="validation-warning">
            <el-alert
              :title="validationMessage"
              type="warning"
              :closable="false"
              show-icon
              class="validation-alert">
            </el-alert>
          </div>
          
          <el-button
            type="primary"
            icon="el-icon-edit"
            @click="handleSave"
            :loading="actionLoading"
            :disabled="!canSaveValue"
            style="width: 100%;">
            Save KRI
          </el-button>
          <el-button
            v-if="kriData.kri_status === 30"
            type="success"
            icon="el-icon-upload"
            @click="handleSubmit"
            :loading="actionLoading"
            :disabled="!canSubmitValue"
            style="width: 100%;">
            Submit KRI
          </el-button>
        </template>
        
        <!-- Calculated KRI Actions -->
        <template v-else-if="isCalculatedKRI && calculatedKRIActions.length > 0">
          <el-button
            v-for="action in calculatedKRIActions"
            :key="action.key"
            :type="action.type"
            :icon="action.icon"
            @click="action.handler"
            :loading="action.loading"
            :disabled="action.disabled"
            style="width: 100%; margin-bottom: 8px;">
            {{ action.label }}
          </el-button>
        </template>
        
        <!-- No Actions Available -->
        <template v-else>
          <el-alert
            title="No Actions Available"
            description="You don't have permission to perform actions on this KRI, or it's in a status that doesn't allow actions."
            type="info"
            :closable="false"
            show-icon>
          </el-alert>
        </template>
      </div>
    </el-card>

    <!-- Breach Status -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Breach Status</span>
      </div>
      <div class="chart-container">
        <v-chart class="chart" :option="gaugeOption" autoresize />
      </div>
    </el-card>

    <!-- 12-Month Trend -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>12-Month Trend</span>
      </div>
      <div class="chart-container">
        <v-chart class="chart" :option="lineOption" autoresize />
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
import { mapState, mapGetters, mapActions } from 'vuex';
import { 
  isCalculatedKRI, 
  calculateBreachStatus, 
  getBreachTagType, 
  getBreachDisplayText,
  generateKRIDetailActions,
  formatDateFromInt,
  allowsManualInput,
  canSaveKRIValue,
  canSubmitKRIValue,
  getSaveValidationMessage,
  getSubmitValidationMessage,
  calculateBreachStatusForKRI
} from '@/utils/helpers';
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
    [THEME_KEY]: 'light'
  },
  name: 'KRISidebar',
  props: {
    kriId: {
      type: String,
      required: true
    },
    reportingDate: {
      type: String,
      required: true
    },
    kriData: {
      type: Object,
      default: () => ({})
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
    ...mapState('kri', ['kriDetail', 'atomicData', 'currentUser', 'historicalData', 'evidenceData', 'loading']),
    ...mapGetters('kri', ['canPerform']),

    // KRI Classification
    isCalculatedKRI() {
      return isCalculatedKRI(this.kriData);
    },

    // Breach Status Calculations
    currentBreachStatus() {
      const value = this.kriData.kri_value || this.kriData.kriValue;
      const warning = this.kriData.warning_line_value || this.kriData.warningLineValue;
      const limit = this.kriData.limit_value || this.kriData.limitValue;
      const negWarning = this.kriData.negative_warning || this.kriData.negativeWarning;
      const negLimit = this.kriData.negative_limit || this.kriData.negativeLimit;
      return calculateBreachStatus(value, warning, limit, negWarning, negLimit);
    },

    breachTagType() {
      return getBreachTagType(this.currentBreachStatus);
    },

    breachDisplayText() {
      return getBreachDisplayText(this.currentBreachStatus);
    },

    // Atomic Data Summary for Calculated KRIs
    relevantAtomicData() {
      if (!this.isCalculatedKRI || !this.atomicData) return [];
      const kriIdNum = parseInt(this.kriId, 10);
      return this.atomicData.filter(atomic => 
        (atomic.kri_id || atomic.kriId) === kriIdNum && 
        (atomic.reporting_date || atomic.reportingDate) === this.reportingDate
      );
    },

    approvedAtomicCount() {
      return this.relevantAtomicData.filter(atomic => 
        (atomic.atomic_status || atomic.atomicStatus) === 60
      ).length;
    },

    pendingAtomicCount() {
      return this.relevantAtomicData.filter(atomic => 
        (atomic.atomic_status || atomic.atomicStatus) < 60
      ).length;
    },

    completenessPercentage() {
      const total = this.relevantAtomicData.length;
      if (total === 0) return 0;
      return Math.floor((this.approvedAtomicCount / total) * 100);
    },

    // Action Generation
    calculatedKRIActions() {
      if (!this.isCalculatedKRI) return [];
      return generateKRIDetailActions(this.kriData, this.canPerform, this.evidenceData, this.inputForm.kriValue);
    },

    // Permission-Based Action Display
    showDataInputActions() {
      const kriIdNum = parseInt(this.kriId, 10);
      const status = this.kriData.kri_status || this.kriData.kriStatus;
      const allowedStatuses = [10, 20, 30];
      return !this.isCalculatedKRI && 
             allowedStatuses.includes(status) && 
             this.canPerform(kriIdNum, null, 'edit') &&
             allowsManualInput(this.kriData.source);
    },

    showReviewActions() {
      const kriIdNum = parseInt(this.kriId, 10);
      const status = this.kriData.kri_status || this.kriData.kriStatus;
      return !this.isCalculatedKRI && 
             status === 40 && 
             this.canPerform(kriIdNum, null, 'review');
    },

    showAcknowledgeActions() {
      const kriIdNum = parseInt(this.kriId, 10);
      const status = this.kriData.kri_status || this.kriData.kriStatus;
      return !this.isCalculatedKRI && 
             status === 50 && 
             this.canPerform(kriIdNum, null, 'acknowledge');
    },

    // Check if user can save KRI value
    canSaveValue() {
      return canSaveKRIValue(this.kriData, this.evidenceData, this.inputForm.kriValue);
    },
    
    // Check if user can submit KRI value
    canSubmitValue() {
      return canSubmitKRIValue(this.kriData, this.evidenceData, this.inputForm.kriValue);
    },
    
    // Legacy compatibility
    isValidInput() {
      return this.canSaveValue;
    },
    
    // Get validation message for user feedback
    validationMessage() {
      if (!this.kriData) return null;
      
      if (!this.canSaveValue) {
        return getSaveValidationMessage(this.kriData, this.evidenceData, this.inputForm.kriValue);
      }
      
      if (!this.canSubmitValue) {
        return getSubmitValidationMessage(this.kriData, this.evidenceData, this.inputForm.kriValue);
      }
      
      return null;
    },

    // Chart Options - Using actual KRI thresholds for dynamic color zones with 4-limit support
    gaugeOption() {
      const value = parseFloat(this.kriData.kri_value) || 0;
      const warning = parseFloat(this.kriData.warning_line_value) || 0;
      const limit = parseFloat(this.kriData.limit_value) || 0;
      const negWarning = parseFloat(this.kriData.negative_warning) || 0;
      const negLimit = parseFloat(this.kriData.negative_limit) || 0;
      
      // Check if negative limits exist
      const hasNegativeLimits = negWarning !== 0 || negLimit !== 0;
      
      // Set dynamic range based on available thresholds
      let minValue, maxValue;
      if (hasNegativeLimits) {
        // Use full range when negative limits exist
        const negativeRange = Math.min(negWarning, negLimit);
        const positiveRange = Math.max(warning, limit);
        minValue = negativeRange < 0 ? negativeRange * 1.2 : negativeRange * 0.8;
        maxValue = positiveRange > 0 ? positiveRange * 1.2 : positiveRange * 1.2;
      } else {
        // Traditional positive-only range
        minValue = 0;
        maxValue = limit * 1.2;
      }
      
      // Calculate segment positions as ratios for color zones
      let colorSegments;
      if (hasNegativeLimits) {
        const range = maxValue - minValue;
        // Define 5 zones: [min to negLimit], [negLimit to negWarning], [negWarning to posWarning], [posWarning to posLimit], [posLimit to max]
        const negLimitRatio = (negLimit - minValue) / range;
        const negWarningRatio = (negWarning - minValue) / range;
        const posWarningRatio = (warning - minValue) / range;
        const posLimitRatio = (limit - minValue) / range;
        
        colorSegments = [
          [negLimitRatio, '#F56C6C'],     // Red: min to negative limit (breach zone)
          [negWarningRatio, '#E6A23C'],   // Yellow: negative limit to negative warning
          [posWarningRatio, '#67C23A'],   // Green: safe zone (negative warning to positive warning)
          [posLimitRatio, '#E6A23C'],     // Yellow: positive warning to positive limit  
          [1, '#F56C6C']                  // Red: positive limit to max (breach zone)
        ];
      } else {
        // Traditional 3-zone positive gauge
        const range = maxValue - minValue;
        const warningRatio = (warning - minValue) / range;
        const limitRatio = (limit - minValue) / range;
        
        colorSegments = [
          [warningRatio, '#67C23A'],      // Green: min to warning
          [limitRatio, '#E6A23C'],        // Yellow: warning to limit
          [1, '#F56C6C']                  // Red: limit to max
        ];
      }

      return {
        series: [
          {
            type: 'gauge',
            center: ['50%', '60%'],
            startAngle: 200,
            endAngle: -20,
            min: minValue,
            max: maxValue,
            splitNumber: hasNegativeLimits ? 12 : 10, // More segments for 4-limit display
            axisLine: {
              lineStyle: {
                width: 18,
                color: colorSegments // Dynamic color segments based on actual thresholds
              }
            },
            progress: {
              show: true,
              width: 18,
              itemStyle: { // Ensure progress color matches the current segment
                color: 'auto'
              }
            },
            pointer: { // Make pointer visible
              show: true,
              width: 5,
              length: '60%',
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
            splitLine: { // Keep split lines for visual cues
              distance: -25, // Adjusted distance
              length: 8,    // Adjusted length
              lineStyle: {
                width: 1,
                color: '#bbb' // Slightly darker color
              }
            },
            axisLabel: { // Show labels for thresholds with negative value support
              distance: -10, // Adjusted distance
              color: 'auto', // Use segment colors or a default
              fontSize: 9,
              formatter: function(value) {
                // Handle negative values and small decimals properly
                return Math.abs(value) < 1 ? value.toFixed(1) : Math.round(value);
              }
            },
            anchor: {
              show: false
            },
            title: { // Title for context, adapted for 4-limit display
              show: true,
              offsetCenter: [0, '40%'],
              fontSize: 12,
              color: '#666'
            },
            detail: { // Prominent value display with negative value support
              valueAnimation: true,
              width: '60%',
              lineHeight: 30, // Adjusted line height
              borderRadius: 6,  // Adjusted border radius
              offsetCenter: [0, '60%'], // Adjusted position
              fontSize: 20, // Larger font size
              fontWeight: 'bold', // Bolder font
              formatter: function(val) {
                // Format numbers appropriately for negative values
                return Math.abs(val) < 1 ? val.toFixed(2) : Math.round(val);
              },
              color: 'auto' // Color based on segment
            },
            data: [
              {
                value: Math.abs(value) < 1 ? parseFloat(value.toFixed(2)) : Math.round(value),
                name: hasNegativeLimits ? 'Risk Level' : 'Status' // Updated title for 4-limit context
              }
            ]
          }
        ]
      };
    },

    lineOption() {
      const historicalData = this.historicalData || [];
      const dates = historicalData.map(item => item.reporting_date || item.date);
      const values = historicalData.map(item => item.kri_value || item.value);

      // Generate mock data if no historical data (matching previous template)
      const mockData = dates.length === 0 ? {
        dates: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        values: [10, 22, 15, 28, 20, 30, 25, 35, 30, 40, 38, 45]
      } : null;
      
      const displayDates = mockData ? mockData.dates : dates;
      const displayValues = mockData ? mockData.values : values;

      return {
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c}' // Simple tooltip
        },
        xAxis: {
          type: 'category',
          data: displayDates,
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
            data: displayValues,
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
    },

    generateMockTrendData() {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const dates = [];
      const values = [];
      
      for (let i = 11; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        dates.push(months[monthIndex]);
        // Generate realistic trend data with some variation
        const baseValue = 60 + Math.sin((monthIndex / 12) * Math.PI * 2) * 20 + Math.random() * 15;
        values.push(Math.round(baseValue));
      }
      
      return { dates, values };
    },

    mockTrendData() {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const dates = [];
      const values = [];
      
      for (let i = 11; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        dates.push(months[monthIndex]);
        // Generate realistic trend data with some variation
        const baseValue = 60 + Math.sin((monthIndex / 12) * Math.PI * 2) * 20 + Math.random() * 15;
        values.push(Math.round(baseValue));
      }
      
      return { dates, values };
    }
  },
  watch: {
    kriData: {
      handler(newData) {
        if (newData && (newData.kri_value || newData.kriValue)) {
          this.inputForm.kriValue = newData.kri_value || newData.kriValue;
        }
      },
      immediate: true
    }
  },
  methods: {
    ...mapActions('kri', ['updateKRIStatus', 'refreshKRIDetail']),
    
    formatReportingDate(dateInt) {
      return formatDateFromInt(dateInt);
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
    
    getProgressColor(percentage) {
      if (percentage >= 80) return '#67c23a';
      if (percentage >= 60) return '#e6a23c';
      return '#f56c6c';
    },

    getGaugeColor(value, warning, limit) {
      if (value >= limit) return '#F56C6C';
      if (value >= warning) return '#E6A23C';
      return '#67C23A';
    },

    async handleSave() {
      if (!this.isValidInput) {
        this.$message.warning('Please enter a valid KRI value');
        return;
      }

      this.actionLoading = true;
      try {
        // Calculate breach status for the new KRI value
        const breachStatus = calculateBreachStatusForKRI(this.inputForm.kriValue, this.kriData);
        
        await this.updateKRIStatus({
          kriId: this.kriId,
          reportingDate: this.reportingDate,
          updateData: { 
            kri_value: this.inputForm.kriValue,
            breach_type: breachStatus
          },
          action: 'save',
          comment: `KRI value saved via sidebar (Breach: ${breachStatus})`
        });
        this.$message.success('KRI value saved successfully');
      } catch (error) {
        console.error('Error saving KRI:', error);
        this.$message.error('Failed to save KRI value');
      } finally {
        this.actionLoading = false;
      }
    },

    async handleSubmit() {
      if (!this.isValidInput) {
        this.$message.warning('Please enter a valid KRI value');
        return;
      }

      this.actionLoading = true;
      try {
        // Determine next status based on KRI owner/data provider logic
        const kriOwner = this.kriData.kri_owner || this.kriData.owner;
        const dataProvider = this.kriData.data_provider || this.kriData.dataProvider;
        const nextStatus = (kriOwner === dataProvider) ? 50 : 40;
        
        // Calculate breach status for the new KRI value
        const breachStatus = calculateBreachStatusForKRI(this.inputForm.kriValue, this.kriData);

        await this.updateKRIStatus({
          kriId: this.kriId,
          reportingDate: this.reportingDate,
          updateData: { 
            kri_value: this.inputForm.kriValue,
            kri_status: nextStatus,
            breach_type: breachStatus
          },
          action: 'submit',
          comment: `KRI submitted for approval via sidebar (Breach: ${breachStatus})`
        });
        this.$message.success('KRI submitted successfully');
      } catch (error) {
        console.error('Error submitting KRI:', error);
        this.$message.error('Failed to submit KRI');
      } finally {
        this.actionLoading = false;
      }
    },

    async handleApproveKRI() {
      this.actionLoading = true;
      try {
        const currentStatus = this.kriData.kri_status || this.kriData.kriStatus;
        const nextStatus = currentStatus === 40 ? 50 : 60;

        await this.updateKRIStatus({
          kriId: this.kriId,
          reportingDate: this.reportingDate,
          updateData: { kri_status: nextStatus },
          action: 'approve',
          comment: 'KRI approved via sidebar'
        });
        this.$message.success('KRI approved successfully');
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
        await this.updateKRIStatus({
          kriId: this.kriId,
          reportingDate: this.reportingDate,
          updateData: { kri_status: 60 },
          action: 'acknowledge',
          comment: 'KRI acknowledged via sidebar'
        });
        this.$message.success('KRI acknowledged successfully');
      } catch (error) {
        console.error('Error acknowledging KRI:', error);
        this.$message.error('Failed to acknowledge KRI');
      } finally {
        this.actionLoading = false;
      }
    },

    async handleRejectKRI() {
      try {
        const { value: comment } = await this.$prompt(
          'Please provide a reason for rejection:',
          'Reject KRI',
          {
            confirmButtonText: 'Reject',
            cancelButtonText: 'Cancel',
            inputType: 'textarea',
            inputValidator: (value) => {
              if (!value || value.trim().length === 0) {
                return 'Rejection reason is required';
              }
              return true;
            }
          }
        );

        this.actionLoading = true;
        await this.updateKRIStatus({
          kriId: this.kriId,
          reportingDate: this.reportingDate,
          updateData: { kri_status: 20 },
          action: 'reject',
          comment: comment
        });
        this.$message.success('KRI rejected successfully');
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error rejecting KRI:', error);
          this.$message.error('Failed to reject KRI');
        }
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

.calculated-kri-notice :deep(.el-alert) {
  margin: 0;
}

.calculated-kri-notice :deep(.el-alert__title) {
  font-size: 0.875rem;
  font-weight: 600;
}

.calculated-kri-notice :deep(.el-alert__description) {
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

.no-actions :deep(.el-alert) {
  margin: 0;
}

.no-actions :deep(.el-alert__title) {
  font-size: 0.875rem;
  font-weight: 600;
}

.no-actions :deep(.el-alert__description) {
  font-size: 0.75rem;
  line-height: 1.4;
  margin-top: 0.25rem;
}

/* Calculated KRI Styles */
.calculated-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.unified-actions {
  margin: 16px 0;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.actions-title {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 12px;
}

.actions-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.actions-buttons .el-button {
  margin: 0;
}

.atomic-summary {
  margin-top: 16px;
}

/* Chart fallback styling */
.chart-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  background-color: #f5f5f5;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  color: #999;
  font-size: 14px;
}

/* Minimalist chart container styling */
.kri-sidebar :deep(.el-card__body) {
  padding: 20px;
}

.kri-sidebar .sidebar-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.kri-sidebar .sidebar-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Chart container styling - fixes ResizeObserver issues */
.chart-container {
  width: 100%;
  height: 200px;
  position: relative;
  overflow: hidden;
}

.chart {
  width: 100% !important;
  height: 100% !important;
  border-radius: 4px;
}

/* Minimal card header */
.kri-sidebar .card-header {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 12px;
  margin-bottom: 0;
}

/* Clean header styling */
.kri-sidebar :deep(.el-card__header) {
  background: #fafafa;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 20px;
}

/* Validation warning styles */
.validation-warning {
  margin-bottom: 12px;
}

.validation-alert {
  font-size: 12px;
}

.validation-alert :deep(.el-alert__title) {
  font-size: 12px;
  line-height: 1.4;
}
</style>