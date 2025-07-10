<template>
  <div class="kri-list-by-status">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <el-button icon="el-icon-arrow-left" @click="goBack" class="back-button">Back to Dashboard</el-button>
        <h1>{{ pageTitle }}</h1>
      </div>
    </div>

    <div class="page-content">
      <div class="action-bar top-action-bar">
        <el-button
          type="primary"
          @click="handleApproveSelected"
          :disabled="selectedKRIItems.length === 0"
        >
          Approve Selected Items
        </el-button>
      </div>

      <el-card class="table-card">
        <div slot="header" class="table-header">
          <span>{{ kriItemsByStatus.length }} KRIs found</span>
          <!-- Can add more info or controls here if needed -->
        </div>
        <div v-if="error" class="error-message">
          <el-alert
            title="Error loading data"
            :description="error"
            type="error"
            show-icon>
          </el-alert>
        </div>
        <k-r-i-table
          :data="kriItemsByStatus"
          :loading="loading"
          :show-row-selection="true"
          @selection-change="handleSelectionChange"
          @kri-click="handleKRIClick"
        >
          <template #actions="slotProps">
            <div class="action-cell">
              <el-button
                type="primary"
                size="mini"
                @click="handleKRIClick(slotProps.row.id, slotProps.row.reportingDate)"
              >
                Go
              </el-button>
              <template v-if="status === 'Submitted'">
                <el-input
                  v-model="reworkComments[slotProps.row.id + '_' + slotProps.row.reportingDate]"
                  size="mini"
                  placeholder="Rework Comment"
                  class="rework-comment-input"
                ></el-input>
                <el-button
                  type="warning"
                  size="mini"
                  @click="handleRework(slotProps.row)"
                  class="rework-button"
                >
                  Rework
                </el-button>
                <!-- TODO: Persist this comment. (Comment added in script logic as well) -->
              </template>
            </div>
          </template>
        </k-r-i-table>
        <div v-if="!loading && kriItemsByStatus.length === 0 && !error" class="no-data-message">
          <el-empty :description="'No KRIs found with status: ' + status"></el-empty>
        </div>
      </el-card>

      <div class="action-bar bottom-action-bar">
        <el-button
          type="primary"
          @click="handleApproveSelected"
          :disabled="selectedKRIItems.length === 0"
        >
          Approve Selected Items
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import KRITable from '../components/KRITable.vue';
import { getLastDayOfPreviousMonth } from '@/utils/helpers';

export default {
  name: 'KRIListByStatus',
  components: {
    KRITable
  },
  props: {
    status: {
      type: String,
      required: true,
      validator: function (value) {
        return ['Pending', 'Submitted'].indexOf(value) !== -1;
      }
    }
  },
  data() {
    return {
      selectedKRIItems: [],
      reworkComments: {} // For storing comments for each row on 'Submitted' page: { [kriId_reportingDate]: comment }
    };
  },
  computed: {
    ...mapState('kri', ['loading', 'error', 'filters']),
    ...mapGetters('kri', ['krisByStatus']),
    pageTitle() {
      if (this.status === 'Pending') {
        return 'KRIs Pending Input';
      } else if (this.status === 'Submitted') {
        return 'KRIs Pending Approval';
      }
      return 'KRI List';
    },
    kriItemsByStatus() {
      // Ensure that the krisByStatus getter receives the status prop correctly
      return this.krisByStatus(this.status);
    },
    // We need the reportingDate from filters to ensure data is loaded for the correct period
    reportingDate() {
      return this.filters.reportingDate || getLastDayOfPreviousMonth();
    }
  },
  async created() {
    // Fetch initial data if not already loaded for the current reporting date
    // This logic is similar to Dashboard.vue to ensure data consistency
    if (this.$store.state.kri.kriItems.length === 0 || this.$store.state.kri.filters.reportingDate !== this.reportingDate) {
      try {
        // Ensure filters in store are up-to-date if navigating directly to this page
        if (this.$store.state.kri.filters.reportingDate !== this.reportingDate) {
            this.updateFilters({ reportingDate: this.reportingDate });
        }
        await this.fetchKRIItems(this.reportingDate);
      } catch (error) {
        console.error(`Error loading KRI data for ${this.status} list:`, error);
        // Error is handled by the store and displayed in the template
      }
    }
  },
  methods: {
    ...mapActions('kri', ['fetchKRIItems', 'updateFilters', 'updateKRIStatusAction', 'batchUpdateKRIStatusAction']),
    handleSelectionChange(selection) {
      this.selectedKRIItems = selection;
    },
    async handleApproveSelected() {
      if (this.selectedKRIItems.length === 0) {
        this.$message.warning('No items selected for approval.');
        return;
      }

      const krisToUpdate = this.selectedKRIItems.map(item => ({ id: item.id, reportingDate: item.reportingDate }));
      let targetStatus = '';

      if (this.status === 'Pending') {
        targetStatus = 'Submitted';
      } else if (this.status === 'Submitted') {
        targetStatus = 'Finalized';
      } else {
        this.$message.error('Invalid page status for approval action.');
        return;
      }

      try {
        await this.batchUpdateKRIStatusAction({ krisToUpdate, newStatusText: targetStatus });
        this.$message.success(`${krisToUpdate.length} KRI(s) have been moved to '${targetStatus}'.`);
        this.selectedKRIItems = []; // Clear selection
        // The list will auto-update due to Vuex reactivity and getters
      } catch (error) {
        this.$message.error('Failed to approve selected KRIs: ' + error.message);
      }
    },
    async handleRework(row) {
      const commentKey = `${row.id}_${row.reportingDate}`;
      const comment = this.reworkComments[commentKey] || '';
      // TODO: Persist this comment. For now, it's logged by the service.

      try {
        await this.updateKRIStatusAction({
          kriId: row.id,
          reportingDate: row.reportingDate,
          newStatusText: 'Pending',
          comment
        });
        this.$message.success(`KRI ${row.id} has been sent back to 'Pending'.`);
        this.$set(this.reworkComments, commentKey, ''); // Clear comment for this row
        // Item will disappear from 'Submitted' list due to reactivity
      } catch (error) {
        this.$message.error(`Failed to rework KRI ${row.id}: ` + error.message);
      }
    },
    handleKRIClick(kriId, reportingDate) {
      this.$router.push({
        name: 'KRIDetail',
        params: { id: kriId, date: reportingDate }
      });
    },
    goBack() {
      this.$router.push({ name: 'Dashboard' });
    }
  }
};
</script>

<style scoped>
.kri-list-by-status {
  min-height: 100vh;
  background-color: #f1f5f9;
}

.page-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 1rem 1.5rem;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-content h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.back-button {
  font-size: 0.875rem;
}

.page-content {
  max-width: 1400px;
  margin: 1.5rem auto;
  padding: 0 1.5rem;
}

.table-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.table-card >>> .el-card__body {
  padding: 0; /* Match dashboard table style */
}

.table-header {
  font-weight: 600;
  color: #374151;
}

.error-message, .no-data-message {
  padding: 1rem;
  text-align: center;
}

.action-bar {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end; /* Align button to the right, or flex-start for left */
}

.bottom-action-bar {
  margin-top: 1rem;
}

.action-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem; /* Space between items in action cell */
}

.rework-comment-input {
  width: 150px; /* Adjust as needed */
  margin-left: 5px;
  margin-right: 5px;
}

.rework-button {
  /* Custom styles if needed */
}
</style>
