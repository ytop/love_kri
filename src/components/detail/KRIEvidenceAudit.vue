<template>
  <div class="evidence-audit">
    <div class="tabs-container">
      <el-tabs v-model="activeTab" type="border-card">
      
      <el-tab-pane label="KRI Evidence" name="evidence">
        <div class="evidence-header">
          <el-tag type="info" size="small">
            <i class="el-icon-view"></i>
            Evidence files (read-only)
          </el-tag>
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
            >
              <template slot-scope="scope">
                <span>{{ scope.row.file_name }}</span>
              </template>
            </el-table-column>
            
            <el-table-column
              prop="description"
              label="Description"
              min-width="200"
              show-overflow-tooltip
            >
              <template slot-scope="scope">
                <span>{{ scope.row.description || 'No description' }}</span>
              </template>
            </el-table-column>
            
            <el-table-column
              prop="uploaded_by"
              label="Uploaded By"
              width="120"
            >
              <template slot-scope="scope">
                <span>{{ scope.row.uploaded_by || 'Unknown' }}</span>
              </template>
            </el-table-column>
            
            <el-table-column
              prop="uploaded_at"
              label="Upload Date"
              width="140"
            >
              <template slot-scope="scope">
                <span>{{ formatDate(scope.row.uploaded_at) }}</span>
              </template>
            </el-table-column>
            
            <el-table-column
              label="Actions"
              width="160"
            >
              <template slot-scope="scope">
                <el-button
                  v-if="canDownloadGeneralEvidence"
                  type="text"
                  size="small"
                  @click="downloadFile(scope.row.file_url, scope.row.file_name)"
                >
                  Download
                </el-button>
                <span v-else class="no-permission-text">No Download Permission</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- Atomic Evidence Tab (only for calculated KRIs) -->
      <el-tab-pane v-if="isCalculatedKRI" label="Atomic Evidence" name="atomic-evidence">
        <div class="evidence-header">
          <div class="header-info">
            <el-tag type="info" size="small">
              <i class="el-icon-info"></i>
              Atomic-level evidence for calculated KRI
            </el-tag>
          </div>
          <div></div>
        </div>
        
        <div v-if="!atomicData || atomicData.length === 0" class="no-data">
          <p>No atomic data available</p>
        </div>
        
        <div v-else>
          <el-table :data="atomicData" style="width: 100%">
            <el-table-column
              prop="atomic_id"
              label="Atomic ID"
              width="100"
              align="center"
            >
              <template slot-scope="scope">
                <el-tag size="mini">A{{ scope.row.atomic_id }}</el-tag>
              </template>
            </el-table-column>
            
            <el-table-column
              prop="atomic_metadata"
              label="Atomic Element"
              min-width="200"
              show-overflow-tooltip
            />
            
            <el-table-column
              prop="atomic_value"
              label="Value"
              width="100"
              align="center"
            />
            
            <el-table-column
              label="Linked Evidence"
              min-width="250"
              show-overflow-tooltip
            >
              <template slot-scope="scope">
                <div v-if="scope.row.linkedEvidence" class="linked-evidence">
                  <div class="evidence-file">
                    <i class="el-icon-document"></i>
                    <span>{{ scope.row.linkedEvidence.file_name }}</span>
                  </div>
                  <div class="evidence-meta">
                    <small>Uploaded: {{ formatDate(scope.row.linkedEvidence.uploaded_at) }}</small>
                  </div>
                </div>
                <div v-else class="no-evidence">
                  <el-tag type="info" size="mini">No evidence linked</el-tag>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column
              label="Actions"
              width="120"
              align="center"
            >
              <template slot-scope="scope">
                <el-button
                  v-if="scope.row.linkedEvidence && canDownloadAtomicEvidence(scope.row.atomic_id)"
                  type="text"
                  size="small"
                  @click="downloadFile(scope.row.linkedEvidence.file_url, scope.row.linkedEvidence.file_name, scope.row.atomic_id)"
                >
                  Download
                </el-button>
                <span v-else-if="scope.row.linkedEvidence" class="no-permission-text">No Download Permission</span>
                <span v-else class="no-actions">-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="KRI Change Log" name="audit">
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
                v-for="audit in sortedAuditData"
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

      <el-tab-pane label="Metadata Changes" name="metadata">
        <div class="evidence-header">
          <div></div>
          <el-button
            v-if="metadataHistoryData?.length > 0"
            type="primary"
            size="small"
            icon="el-icon-download"
            @click="exportMetadataCSV"
          >
            Export CSV
          </el-button>
        </div>

        <div v-if="metadataHistoryData?.length === 0" class="no-data">
          <p>No metadata change records available</p>
        </div>

        <div v-else>
          <div class="audit-timeline-container" :class="{ 'scrollable': metadataHistoryData.length > 5 }">
            <el-timeline>
              <el-timeline-item
                v-for="metadata in sortedMetadataHistoryData"
                :key="metadata.metadata_id"
                :timestamp="formatDate(metadata.changed_at)"
                placement="top"
              >
                                 <el-card>
                   <div class="audit-item">
                     <div class="audit-header">
                       <strong>Metadata Change</strong>
                       <span v-if="metadata.changed_by" class="changed-by">
                         by {{ metadata.changed_by }}
                       </span>
                     </div>

                     <div class="audit-details">
                       <p><strong>Effective From:</strong> {{ formatDate(metadata.effective_from) }}</p>
                       <p v-if="metadata.effective_to"><strong>Effective To:</strong> {{ formatDate(metadata.effective_to) }}</p>
                       <p v-if="metadata.change_reason"><strong>Change Reason:</strong> {{ metadata.change_reason }}</p>
                     </div>

                     <div class="metadata-fields">
                       <p><strong>Name:</strong> {{ metadata.name }}</p>
                       <p v-if="metadata.description"><strong>Description:</strong> {{ metadata.description }}</p>
                       <p v-if="metadata.formula"><strong>Formula:</strong> {{ metadata.formula }}</p>
                       <p v-if="metadata.owner"><strong>Owner:</strong> {{ metadata.owner }}</p>
                       <p v-if="metadata.data_provider"><strong>Data Provider:</strong> {{ metadata.data_provider }}</p>
                       <p v-if="metadata.l1_risk_type"><strong>L1 Risk Type:</strong> {{ metadata.l1_risk_type }}</p>
                       <p v-if="metadata.l2_risk_type"><strong>L2 Risk Type:</strong> {{ metadata.l2_risk_type }}</p>
                       <p v-if="metadata.ras_metric"><strong>RAS Metric:</strong> {{ metadata.ras_metric }}</p>
                       <p v-if="metadata.breach_type"><strong>Breach Type:</strong> {{ metadata.breach_type }}</p>
                       <p v-if="metadata.limit_value !== null"><strong>Limit Value:</strong> {{ metadata.limit_value }}</p>
                       <p v-if="metadata.warning_line_value !== null"><strong>Warning Line Value:</strong> {{ metadata.warning_line_value }}</p>
                       <p v-if="metadata.negative_warning !== null"><strong>Negative Warning:</strong> {{ metadata.negative_warning }}</p>
                       <p v-if="metadata.negative_limit !== null"><strong>Negative Limit:</strong> {{ metadata.negative_limit }}</p>
                       <p v-if="metadata.reporting_frequency"><strong>Reporting Frequency:</strong> {{ metadata.reporting_frequency }}</p>
                       <p><strong>Is Calculated KRI:</strong> {{ metadata.is_calculated_kri ? 'Yes' : 'No' }}</p>
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

  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { formatDateFromInt } from '@/utils/helpers';
import Permission from '@/utils/permission';

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
    metadataHistoryData: {
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
    },
    atomicData: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      activeTab: 'evidence'
    };
  },
  computed: {
    ...mapState('kri', ['currentUser']),
    ...mapGetters('kri', ['canPerform']),
    
    
    
    sortedAuditData() {
      if (!this.auditData || this.auditData.length === 0) {
        return [];
      }
      
      // Sort by changed_at timestamp (newest first) as backup to database sorting
      return this.auditData.slice().sort((a, b) => {
        const dateA = new Date(a.changed_at);
        const dateB = new Date(b.changed_at);
        return dateB - dateA; // Descending order (newest first)
      });
    },

    sortedMetadataHistoryData() {
      if (!this.metadataHistoryData || this.metadataHistoryData.length === 0) {
        return [];
      }

      // Sort by changed_at timestamp (newest first) as backup to database sorting
      return this.metadataHistoryData.slice().sort((a, b) => {
        const dateA = new Date(a.changed_at);
        const dateB = new Date(b.changed_at);
        return dateB - dateA; // Descending order (newest first)
      });
    },

    // Check if this is a calculated KRI for atomic evidence tab
    isCalculatedKRI() {
      return this.kriItem?.is_calculated_kri || false;
    },

    // Check if user can download general KRI evidence
    canDownloadGeneralEvidence() {
      if (!this.currentUser || !this.currentUser.permissions) {
        return false;
      }
      
      const kriIdNum = parseInt(this.kriId, 10);
      const userPermissions = this.currentUser.permissions || [];
      
      return Permission.canDownloadEvidence(kriIdNum, userPermissions);
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
    
    async downloadFile(fileUrl, fileName, atomicId = null) {
      if (!fileUrl) {
        this.$message.warning('File URL not available');
        return;
      }
      
      // Check download permissions
      const hasPermission = atomicId 
        ? this.canDownloadAtomicEvidence(atomicId)
        : this.canDownloadGeneralEvidence;
        
      if (!hasPermission) {
        this.$message.error('You do not have permission to download this evidence file');
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

    // Check if user can download atomic evidence
    canDownloadAtomicEvidence(atomicId) {
      if (!this.currentUser || !this.currentUser.permissions || !atomicId) {
        return false;
      }
      
      const kriIdNum = parseInt(this.kriId, 10);
      const userPermissions = this.currentUser.permissions || [];
      
      return Permission.canDownloadAtomicEvidence(kriIdNum, atomicId, userPermissions);
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
    },

    exportMetadataCSV() {
      if (!this.metadataHistoryData || this.metadataHistoryData.length === 0) {
        this.$message.warning('No metadata change data to export');
        return;
      }

      const headers = ['Date/Time', 'Changed By', 'Effective From', 'Effective To', 'Change Reason', 'Name', 'Description', 'Formula', 'Owner', 'Data Provider', 'L1 Risk Type', 'L2 Risk Type', 'RAS Metric', 'Breach Type', 'Limit Value', 'Warning Line Value', 'Negative Warning', 'Negative Limit', 'Reporting Frequency', 'Is Calculated KRI'];
      const csvContent = [headers.join(',')];

      this.metadataHistoryData.forEach(metadata => {
        const row = [
          `"${this.formatDate(metadata.changed_at)}"`,
          `"${metadata.changed_by || ''}"`,
          `"${this.formatDate(metadata.effective_from)}"`,
          `"${metadata.effective_to ? this.formatDate(metadata.effective_to) : ''}"`,
          `"${metadata.change_reason || ''}"`,
          `"${metadata.name || ''}"`,
          `"${metadata.description || ''}"`,
          `"${metadata.formula || ''}"`,
          `"${metadata.owner || ''}"`,
          `"${metadata.data_provider || ''}"`,
          `"${metadata.l1_risk_type || ''}"`,
          `"${metadata.l2_risk_type || ''}"`,
          `"${metadata.ras_metric || ''}"`,
          `"${metadata.breach_type || ''}"`,
          `"${metadata.limit_value || ''}"`,
          `"${metadata.warning_line_value || ''}"`,
          `"${metadata.negative_warning || ''}"`,
          `"${metadata.negative_limit || ''}"`,
          `"${metadata.reporting_frequency || ''}"`,
          `"${metadata.is_calculated_kri ? 'Yes' : 'No'}"`
        ];
        csvContent.push(row.join(','));
      });

      const csvString = csvContent.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `metadata_changes_${this.kriId}_${this.reportingDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.$message.success('Metadata changes exported successfully');
    }
  }
};
</script>

<style scoped>
.evidence-audit {
  padding: 0.5rem 0;
}

/* Ensure consistent tab content sizing */
.evidence-audit :deep(.el-tabs__content) {
  min-height: 300px; /* Set minimum height to prevent jumping */
}

.evidence-audit :deep(.el-tab-pane) {
  width: 100%; /* Ensure full width for both tabs */
}

.evidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 0 5px;
}


.no-data {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.evidence-audit :deep(.el-table th) {
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

.metadata-fields {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #f8fafc;
  border-radius: 4px;
  border-left: 3px solid #3b82f6;
}

.metadata-fields p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #6b7280;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.metadata-fields strong {
  color: #374151;
  min-width: 120px;
  display: inline-block;
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

.tabs-container :deep(.el-tabs__content) {
  min-height: 450px;
}

/* Atomic Evidence Tab Styling */
.linked-evidence {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.evidence-file {
  display: flex;
  align-items: center;
  gap: 6px;
}

.evidence-file i {
  color: #409eff;
}

.evidence-meta {
  color: #6b7280;
  font-size: 12px;
}

.no-evidence {
  text-align: center;
}

.no-actions {
  color: #c0c4cc;
  font-style: italic;
}

.header-info {
  display: flex;
  align-items: center;
}

/* Permission-related styles */
.no-permission-text {
  color: #909399;
  font-size: 12px;
  font-style: italic;
}
</style>