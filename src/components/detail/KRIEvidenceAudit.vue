<template>
  <div class="evidence-audit">
    <div v-if="bothDataEmpty" class="no-data-prominent">
      <p>No evidence or audit trail information is available for this KRI.</p>
    </div>
    <div v-else class="tabs-container">
      <el-tabs v-model="activeTab" type="border-card">
      
      <el-tab-pane label="Evidence" name="evidence">
        <div class="evidence-header">
          <el-button
            v-if="canUploadEvidence"
            type="primary"
            size="small"
            icon="el-icon-upload2"
            @click="showUploadModal"
          >
            Upload Evidence
          </el-button>
          <div></div>
        </div>
        
        <div v-if="evidenceData?.length === 0" class="no-data">
          <p>No evidence files available</p>
        </div>
        
        <div v-else>
          <el-table :data="evidenceData" style="width: 100%">
            <el-table-column
              prop="file_name"
              label="File Name"
              min-width="200"
              show-overflow-tooltip
            />
            
            <el-table-column
              prop="description"
              label="Description"
              min-width="250"
              show-overflow-tooltip
            >
              <template slot-scope="scope">
                <span>{{ scope.row.description || 'No description' }}</span>
              </template>
            </el-table-column>
            
            <el-table-column
              prop="uploaded_by"
              label="Uploaded By"
              width="150"
            >
              <template slot-scope="scope">
                <span>{{ scope.row.uploaded_by || 'Unknown' }}</span>
              </template>
            </el-table-column>
            
            <el-table-column
              prop="uploaded_at"
              label="Upload Date"
              width="160"
            >
              <template slot-scope="scope">
                <span>{{ formatDate(scope.row.uploaded_at) }}</span>
              </template>
            </el-table-column>
            
            <el-table-column
              label="Actions"
              width="100"
            >
              <template slot-scope="scope">
                <el-button
                  type="text"
                  size="small"
                  @click="downloadFile(scope.row.file_url, scope.row.file_name)"
                >
                  Download
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="Audit Trail" name="audit">
        <div class="evidence-header">
          <div></div>
          <el-button
            v-if="auditData?.length > 0"
            type="primary"
            size="small"
            icon="el-icon-download"
            @click="exportAuditCSV"
          >
            Export CSV
          </el-button>
        </div>
        
        <div v-if="auditData?.length === 0" class="no-data">
          <p>No audit trail records available</p>
        </div>
        
        <div v-else>
          <div class="audit-timeline-container" :class="{ 'scrollable': auditData.length > 5 }">
            <el-timeline>
              <el-timeline-item
                v-for="audit in auditData.slice().reverse()"
                :key="audit.audit_id"
                :timestamp="formatDate(audit.changed_at)"
                placement="top"
              >
              <el-card>
                <div class="audit-item">
                  <div class="audit-header">
                    <strong>{{ audit.action }}</strong>
                    <span v-if="audit.changed_by" class="changed-by">
                      by {{ audit.changed_by }}
                    </span>
                  </div>
                  
                  <div v-if="audit.field_name" class="audit-details">
                    <p><strong>Field:</strong> {{ audit.field_name }}</p>
                    <p v-if="audit.old_value">
                      <strong>Old Value:</strong> {{ audit.old_value }}
                    </p>
                    <p v-if="audit.new_value">
                      <strong>New Value:</strong> {{ audit.new_value }}
                    </p>
                  </div>
                  
                  <div v-if="audit.comment" class="audit-comment">
                    <p><strong>Comment:</strong> {{ audit.comment }}</p>
                  </div>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    </div>

    <!-- Evidence Upload Modal -->
    <evidence-upload-modal
      :visible.sync="uploadModalVisible"
      :kri-id="kriId"
      :reporting-date="reportingDate"
      :kri-item="kriItem"
      @upload-success="handleUploadSuccess"
      @close="handleModalClose"
    />
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { formatDateFromInt, requiresEvidence } from '@/utils/helpers';

export default {
  name: 'KRIEvidenceAudit',
  props: {
    evidenceData: {
      type: Array,
      default: () => []
    },
    auditData: {
      type: Array,
      default: () => []
    },
    kriId: {
      type: String,
      required: true
    },
    reportingDate: {
      type: Number,
      required: true
    },
    currentStatus: {
      type: Number,
      default: null
    },
    kriItem: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      activeTab: 'evidence',
      uploadModalVisible: false
    };
  },
  computed: {
    ...mapState('kri', ['currentUser']),
    ...mapGetters('kri', ['canPerform']),
    
    bothDataEmpty() {
      return (!this.evidenceData || this.evidenceData?.length === 0) && 
             (!this.auditData || this.auditData?.length === 0);
    },
    
    canUploadEvidence() {
      if (!this.currentUser || !this.currentUser.permissions) {
        return false;
      }
      
      // Check if evidence is required for this KRI based on source
      if (!requiresEvidence(this.kriItem?.source)) {
        return false;
      }
      
      const kriIdNum = parseInt(this.kriId, 10);
      const allowedStatuses = [10, 20, 30];
      const hasValidStatus = allowedStatuses.includes(this.currentStatus);
      
      return hasValidStatus && this.canPerform(kriIdNum, null, 'edit');
    }
  },
  methods: {
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      
      try {
        if (typeof dateString === 'string' && dateString.includes('T')) {
          const date = new Date(dateString);
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
        
        if (typeof dateString === 'number') {
          return formatDateFromInt(dateString);
        }
        
        const date = new Date(dateString);
        return date.toLocaleDateString();
      } catch (error) {
        console.warn('Error formatting date:', error);
        return 'Invalid Date';
      }
    },
    
    showUploadModal() {
      this.uploadModalVisible = true;
    },
    
    async downloadFile(fileUrl, fileName) {
      if (!fileUrl) {
        this.$message.warning('File URL not available');
        return;
      }
      
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch file');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.$message.success('File downloaded successfully');
      } catch (error) {
        console.error('Error downloading file:', error);
        this.$message.error('Failed to download file');
      }
    },
    
    handleUploadSuccess() {
      this.uploadModalVisible = false;
      this.$message.success('Evidence uploaded successfully');
      
      this.$emit('evidence-uploaded');
    },
    
    handleModalClose() {
      this.uploadModalVisible = false;
    },
    
    exportAuditCSV() {
      if (!this.auditData || this.auditData.length === 0) {
        this.$message.warning('No audit data to export');
        return;
      }
      
      const headers = ['Date/Time', 'Action', 'Changed By', 'Field', 'Old Value', 'New Value', 'Comment'];
      const csvContent = [headers.join(',')];
      
      this.auditData.forEach(audit => {
        const row = [
          `"${this.formatDate(audit.changed_at)}"`,
          `"${audit.action || ''}"`,
          `"${audit.changed_by || ''}"`,
          `"${audit.field_name || ''}"`,
          `"${audit.old_value || ''}"`,
          `"${audit.new_value || ''}"`,
          `"${audit.comment || ''}"`
        ];
        csvContent.push(row.join(','));
      });
      
      const csvString = csvContent.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_trail_${this.kriId}_${this.reportingDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.$message.success('Audit trail exported successfully');
    }
  },
  components: {
    EvidenceUploadModal: () => import('@/components/shared/EvidenceUploadModal.vue').catch(() => {
      console.warn('EvidenceUploadModal component not found');
      return { template: '<div></div>' };
    })
  }
};
</script>

<style scoped>
.evidence-audit {
  padding: 0.5rem 0;
}

/* Ensure consistent tab content sizing */
.evidence-audit >>> .el-tabs__content {
  min-height: 300px; /* Set minimum height to prevent jumping */
}

.evidence-audit >>> .el-tab-pane {
  width: 100%; /* Ensure full width for both tabs */
}

.evidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 0 5px;
}

.no-data-prominent {
  text-align: center;
  padding: 2rem;
  color: #ef4444; /* Prominent color, adjust as needed */
  font-size: 1.125rem; /* Larger font size */
  border: 1px solid #fecaca; /* Optional border */
  background-color: #fee2e2; /* Optional background */
  border-radius: 0.375rem; /* Optional rounded corners */
  margin-bottom: 1rem; /* Space before tabs if they were to appear */
}

.no-data {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.evidence-audit >>> .el-table th {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
}

.audit-item {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.audit-header {
  margin-bottom: 0.75rem;
}

.audit-header strong {
  color: #374151;
  margin-right: 0.5rem;
}

.changed-by {
  color: #6b7280;
  font-size: 0.875rem;
}

.audit-details p,
.audit-comment p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #6b7280;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.audit-details strong,
.audit-comment strong {
  color: #374151;
}

/* Audit trail scroll functionality */
.audit-timeline-container {
  width: 100%;
  min-height: 200px; /* Ensure consistent minimum height */
}

.audit-timeline-container.scrollable {
  max-height: 500px; /* Limit height when more than 5 records */
  overflow-y: auto; /* Enable vertical scrolling */
  border: 1px solid #e5e7eb; /* Add subtle border */
  border-radius: 6px; /* Rounded corners */
  padding: 1rem; /* Add padding inside scroll container */
  background-color: #fafafa; /* Light background */
}

/* Custom scrollbar styling */
.audit-timeline-container.scrollable::-webkit-scrollbar {
  width: 8px;
}

.audit-timeline-container.scrollable::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.audit-timeline-container.scrollable::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.audit-timeline-container.scrollable::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}


.tabs-container {
  min-height: 500px;
  min-width: 10cm;
  width: min(100%, 1800px);
}

.tabs-container >>> .el-tabs__content {
  min-height: 450px;
}
</style>