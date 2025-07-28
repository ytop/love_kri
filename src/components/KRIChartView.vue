<template>
  <el-dialog
    title="KRI Chart View"
    :visible.sync="dialogVisible"
    width="90%"
    top="5vh"
    @close="handleClose"
  >
    <div class="chart-view">
      <div class="chart-controls">
        <el-radio-group v-model="chartType" @change="updateChart">
          <el-radio-button label="status">Status Distribution</el-radio-button>
          <el-radio-button label="riskType">Risk Type Distribution</el-radio-button>
          <el-radio-button label="owner">Owner Distribution</el-radio-button>
          <el-radio-button label="breach">Breach Analysis</el-radio-button>
        </el-radio-group>
      </div>
      
      <div class="chart-container">
        <v-chart
          ref="chart"
          class="chart"
          :option="chartOption"
          :autoresize="true"
        />
      </div>
      
      <div class="chart-summary">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic
              title="Total KRIs"
              :value="data.length"
              suffix="items"
            />
          </el-col>
          <el-col :span="6">
            <el-statistic
              title="Pending"
              :value="getStatusCount('Pending')"
              suffix="items"
            />
          </el-col>
          <el-col :span="6">
            <el-statistic
              title="Submitted"
              :value="getStatusCount('Submitted')"
              suffix="items"
            />
          </el-col>
          <el-col :span="6">
            <el-statistic
              title="Finalized"
              :value="getStatusCount('Finalized')"
              suffix="items"
            />
          </el-col>
        </el-row>
      </div>
    </div>
    
    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">Close</el-button>
      <el-button type="primary" @click="exportChart">Export Chart</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { use } from 'echarts/core';
import {
  CanvasRenderer
} from 'echarts/renderers';
import {
  PieChart,
  BarChart
} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';
import VChart from 'vue-echarts';
import StatusManager from '@/utils/types';

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
]);

export default {
  name: 'KRIChartView',
  components: {
    VChart
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    data: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      chartType: 'status',
      chartOption: {}
    };
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible;
      },
      set(value) {
        if (!value) {
          this.handleClose();
        }
      }
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.updateChart();
      }
    },
    data() {
      if (this.visible) {
        this.updateChart();
      }
    }
  },
  methods: {
    handleClose() {
      this.$emit('close');
    },
    
    updateChart() {
      switch (this.chartType) {
      case 'status':
        this.chartOption = this.generateStatusChart();
        break;
      case 'riskType':
        this.chartOption = this.generateRiskTypeChart();
        break;
      case 'owner':
        this.chartOption = this.generateOwnerChart();
        break;
      case 'breach':
        this.chartOption = this.generateBreachChart();
        break;
      default:
        this.chartOption = this.generateStatusChart();
      }
    },
    
    generateStatusChart() {
      const statusCounts = {};
      
      this.data.forEach(item => {
        const status = StatusManager.mapStatus(item.kriStatus || item.collectionStatus);
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      const chartData = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value
      }));
      
      return {
        title: {
          text: 'KRI Status Distribution',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: 'Status',
            type: 'pie',
            radius: '50%',
            data: chartData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      };
    },
    
    generateRiskTypeChart() {
      const riskTypeCounts = {};
      
      this.data.forEach(item => {
        const riskType = item.l1RiskType || 'Unspecified';
        riskTypeCounts[riskType] = (riskTypeCounts[riskType] || 0) + 1;
      });
      
      const categories = Object.keys(riskTypeCounts);
      const values = Object.values(riskTypeCounts);
      
      return {
        title: {
          text: 'Risk Type Distribution',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            rotate: 45
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: 'Count',
            type: 'bar',
            data: values,
            itemStyle: {
              color: '#409EFF'
            }
          }
        ]
      };
    },
    
    generateOwnerChart() {
      const ownerCounts = {};
      
      this.data.forEach(item => {
        const owner = item.owner || 'Unassigned';
        ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
      });
      
      const chartData = Object.entries(ownerCounts).map(([name, value]) => ({
        name,
        value
      }));
      
      return {
        title: {
          text: 'Owner Distribution',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: 'Owner',
            type: 'pie',
            radius: ['40%', '70%'],
            data: chartData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      };
    },
    
    generateBreachChart() {
      const breachCounts = {};
      
      this.data.forEach(item => {
        const breachType = item.breachType || 'No Breach';
        breachCounts[breachType] = (breachCounts[breachType] || 0) + 1;
      });
      
      const categories = Object.keys(breachCounts);
      const values = Object.values(breachCounts);
      
      return {
        title: {
          text: 'Breach Analysis',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        xAxis: {
          type: 'category',
          data: categories
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: 'Count',
            type: 'bar',
            data: values.map((value, index) => ({
              value,
              itemStyle: {
                color: this.getBreachColor(categories[index])
              }
            }))
          }
        ]
      };
    },
    
    getBreachColor(breachType) {
      switch (breachType) {
      case 'No Breach':
        return '#67C23A';
      case 'Warning':
        return '#E6A23C';
      case 'Limit':
      case 'Critical':
        return '#F56C6C';
      default:
        return '#909399';
      }
    },
    
    exportChart() {
      const chartInstance = this.$refs.chart?.chart;
      if (chartInstance) {
        const url = chartInstance.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: '#fff'
        });
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `kri-chart-${this.chartType}-${Date.now()}.png`;
        link.click();
        
        this.$message.success('Chart exported successfully');
      } else {
        this.$message.error('Failed to export chart');
      }
    },
    
    getStatusCount(statusLabel) {
      if (!this.data || this.data.length === 0) return 0;
      
      return this.data.filter(item => {
        const itemStatus = StatusManager.mapStatus(item.kriStatus || item.collectionStatus);
        
        switch (statusLabel) {
        case 'Pending':
          return itemStatus === 'Pending Input' || itemStatus === 'Under Rework';
        case 'Submitted':
          return itemStatus === 'Submitted to Data Provider Approver' || 
                   itemStatus === 'Submitted to KRI Owner Approver';
        case 'Finalized':
          return itemStatus === 'Finalized';
        default:
          return itemStatus === statusLabel;
        }
      }).length;
    }
  }
};
</script>

<style scoped>
.chart-view {
  height: 70vh;
  display: flex;
  flex-direction: column;
}

.chart-controls {
  margin-bottom: 1rem;
  text-align: center;
}

.chart-container {
  flex: 1;
  height: 500px;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-summary {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.dialog-footer {
  text-align: right;
}
</style>