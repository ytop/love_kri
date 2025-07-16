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
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';
import VChart from 'vue-echarts';

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
      required: true
    },
    data: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      dialogVisible: this.visible,
      chartType: 'status',
      chartOption: {}
    };
  },
  watch: {
    visible(newVal) {
      this.dialogVisible = newVal;
    },
    chartType() {
      this.updateChart();
    }
  },
  mounted() {
    this.updateChart();
  },
  methods: {
    handleClose() {
      this.dialogVisible = false;
      this.$emit('close');
    },
    
    getStatusCount(status) {
      return this.data.filter(item => item.collectionStatus === status).length;
    },
    
    updateChart() {
      switch (this.chartType) {
      case 'status':
        this.chartOption = this.getStatusChart();
        break;
      case 'riskType':
        this.chartOption = this.getRiskTypeChart();
        break;
      case 'owner':
        this.chartOption = this.getOwnerChart();
        break;
      case 'breach':
        this.chartOption = this.getBreachChart();
        break;
      default:
        this.chartOption = this.getStatusChart();
      }
    },
    
    getStatusChart() {
      const statusCounts = {};
      this.data.forEach(item => {
        const status = item.collectionStatus || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      const data = Object.entries(statusCounts).map(([name, value]) => ({
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
            data: data,
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
    
    getRiskTypeChart() {
      const riskCounts = {};
      this.data.forEach(item => {
        const risk = item.l1RiskType || 'Unknown';
        riskCounts[risk] = (riskCounts[risk] || 0) + 1;
      });
      
      const categories = Object.keys(riskCounts);
      const values = Object.values(riskCounts);
      
      return {
        title: {
          text: 'L1 Risk Type Distribution',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
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
              color: '#5470c6'
            }
          }
        ]
      };
    },
    
    getOwnerChart() {
      const ownerCounts = {};
      this.data.forEach(item => {
        const owner = item.owner || 'Unknown';
        ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
      });
      
      // Take top 10 owners
      const sortedOwners = Object.entries(ownerCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      const categories = sortedOwners.map(([name]) => name);
      const values = sortedOwners.map(([,value]) => value);
      
      return {
        title: {
          text: 'Top 10 KRI Owners',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
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
            name: 'KRI Count',
            type: 'bar',
            data: values,
            itemStyle: {
              color: '#91cc75'
            }
          }
        ]
      };
    },
    
    getBreachChart() {
      const breachCounts = {};
      this.data.forEach(item => {
        const breach = item.breachType || 'No Breach';
        breachCounts[breach] = (breachCounts[breach] || 0) + 1;
      });
      
      const data = Object.entries(breachCounts).map(([name, value]) => ({
        name,
        value
      }));
      
      return {
        title: {
          text: 'Breach Type Analysis',
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
            name: 'Breach Type',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            data: data,
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
    
    exportChart() {
      // This would implement chart export functionality
      this.$message.success('Chart export functionality would be implemented here');
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