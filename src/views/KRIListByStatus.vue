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
      <el-card class="table-card">
        <div slot="header" class="table-header">
          <span>{{ kriItemsByStatus.length }} KRIs found</span>
        </div>
        <div v-if="error" class="error-message">
          <el-alert
            title="Error loading data"
            :description="error"
            type="error"
            show-icon>
          </el-alert>
        </div>
        <k-r-i-table-collect-data
          :data="kriItemsByStatus"
          :loading="loading"
          @row-click="handleKRIClick"
        />
        <div v-if="!loading && kriItemsByStatus.length === 0 && !error" class="no-data-message">
          <el-empty :description="'No KRIs found with status: ' + status"></el-empty>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import KRITableCollectData from '../components/KRITableCollectData.vue';
import { getLastDayOfPreviousMonth, COLLECTION_STATUS_OPTIONS } from '@/utils/helpers';

export default {
  name: 'KRIListByStatus',
  components: {
    KRITableCollectData
  },
  props: {
    status: {
      type: String,
      required: true,
      validator: function (value) {
        const validStatuses = COLLECTION_STATUS_OPTIONS.map(option => option.value);
        return validStatuses.indexOf(value) !== -1;
      }
    }
  },
  computed: {
    ...mapState('kri', ['loading', 'error', 'filters']),
    ...mapGetters('kri', ['krisByStatus']),
    pageTitle() {
      if (this.status === 'Pending' || this.status === 'Pending Input') {
        return 'KRIs Pending Input';
      } else if (this.status === 'Submitted') {
        return 'KRIs Pending Approval';
      } else if (this.status === 'Adjusting') {
        return 'KRIs Being Adjusted';
      } else if (this.status === 'Pending Data Provider Approval') {
        return 'KRIs Pending Data Provider Approval';
      } else if (this.status === 'Ready for submission') {
        return 'KRIs Ready for Submission';
      } else if (this.status === 'Finalized') {
        return 'Finalized KRIs';
      }
      return 'KRI List';
    },
    kriItemsByStatus() {
      // Handle both old and new status formats for backwards compatibility
      const targetStatus = this.status === 'Pending' ? 'Pending Input' : this.status;
      return this.krisByStatus(targetStatus);
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
    ...mapActions('kri', ['fetchKRIItems', 'updateFilters']),
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
</style>
