<template>
  <div class="kri-sidebar">
    <!-- Quick Actions -->
    <el-card class="sidebar-card">
      <div slot="header" class="card-header">
        <span>Quick Actions</span>
      </div>
      <div class="actions">
        <el-button type="primary" style="width: 100%;">
          <i class="el-icon-edit"></i>
          Approve KRI
        </el-button>
            <el-button
              type="danger"
              icon="el-icon-close"
              @click="handleRejectKRI"
              style="width: 100%;">
              Reject KRI
            </el-button>
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
import { mapKriStatus, formatDateFromInt } from '@/utils/helpers';
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
  computed: {
    completeAtomicCount() {
      return this.atomicData.filter(item => 
        item.atomic_value && item.atomic_value !== 'N/A'
      ).length;
    },
    
    completenessPercentage() {
      if (this.atomicData.length === 0) return 0;
      return Math.round((this.completeAtomicCount / this.atomicData.length) * 100);
    },

    gaugeOption() {
      return {
        series: [
          {
            type: 'gauge',
            center: ['50%', '60%'],
            startAngle: 200,
            endAngle: -20,
            min: 0,
            max: 100,
            splitNumber: 10, // More granularity for segments
            axisLine: {
              lineStyle: {
                width: 18,
                color: [ // Segment colors
                  [0.3, '#67C23A'], // Green for 0-30%
                  [0.7, '#E6A23C'], // Yellow for 30-70%
                  [1, '#F56C6C']    // Red for 70-100%
                ]
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
            axisLabel: { // Show labels for thresholds
              distance: -10, // Adjusted distance
              color: 'auto', // Use segment colors or a default
              fontSize: 9
            },
            anchor: {
              show: false
            },
            title: { // Title for context if needed, e.g. "Breach Level"
              show: true,
              offsetCenter: [0, '20%'],
              fontSize: 12,
              color: '#666'
            },
            detail: { // Prominent value display
              valueAnimation: true,
              width: '60%',
              lineHeight: 30, // Adjusted line height
              borderRadius: 6,  // Adjusted border radius
              offsetCenter: [0, '-10%'], // Adjusted position
              fontSize: 20, // Larger font size
              fontWeight: 'bold', // Bolder font
              formatter: '{value}%',
              color: 'auto' // Color based on segment
            },
            data: [
              {
                value: 67, // Placeholder value
                name: 'Status' // Optional name for title
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
  methods: {
    mapKriStatus,
    
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
    handleRejectKRI() {
      if (this.kriData && this.kriData.kri_id) {
        console.log('Reject KRI button clicked for KRI ID:', this.kriData.kri_id);
        // In a real application, this would likely dispatch a Vuex action
        // or call a service to reject the KRI.
        // It might also involve showing a confirmation modal.
      } else {
        console.log('Reject KRI button clicked, but KRI data or KRI ID is missing.');
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
.actions .el-button + .el-button {
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
</style>