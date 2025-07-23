<template>
  <div class="evidence-audit">
    <div v-if="bothDataEmpty" class="no-data-prominent">
      <p>No evidence or audit trail information is available for this KRI.</p>
    </div>
    <el-tabs v-else v-model="activeTab" type="border-card">
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
        </div>
        
        <div v-if="evidenceData.length === 0" class="no-data">
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
        <div v-if="auditData.length === 0" class="no-data">
          <p>No audit trail records available</p>
        </div>
        
        <div v-else>
          <el-timeline>
            <el-timeline-item
              v-for="audit in auditData"
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
      </el-tab-pane>
    </el-tabs>

    <!-- Evidence Upload Modal -->
    <evidence-upload-modal
      :visible.sync="uploadModalVisible"
      :kri-id="kriId"
      :reporting-date="reportingDate"
      @upload-success="handleUploadSuccess"
    />
  </div>
</template>

<script>
</script>

<style scoped>
.evidence-audit {
  padding: 0.5rem 0;
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
  padding: 0.5rem 0;
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
}

.audit-details strong,
.audit-comment strong {
  color: #374151;
}
</style>