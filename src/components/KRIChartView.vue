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