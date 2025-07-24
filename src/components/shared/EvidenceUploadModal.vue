<template>
  <el-dialog
    title="Upload Evidence"
    :visible.sync="dialogVisible"
    width="600px"
    :before-close="handleClose"
    @closed="resetForm"
  >
    <div class="upload-container">
      <el-upload
        ref="upload"
        class="upload-dragger"
        drag
        :action="uploadUrl"
        :multiple="true"
        :auto-upload="false"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
        :file-list="fileList"
        :accept="acceptedTypes"
        :limit="maxFiles"
        :on-exceed="handleExceed"
        :before-upload="beforeUpload"
      >
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">
          Drop files here or <em>click to upload</em>
        </div>
        <div class="el-upload__tip" slot="tip">
          Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max {{ maxFileSize }}MB each, up to {{ maxFiles }} files)
        </div>
      </el-upload>

      <el-form
        v-if="fileList.length > 0"
        :model="uploadForm"
        :rules="rules"
        ref="uploadForm"
        label-position="top"
        class="upload-form"
      >
        <el-form-item label="Description (Optional)" prop="description">
          <el-input
            v-model="uploadForm.description"
            type="textarea"
            :rows="3"
            placeholder="Add a description for the uploaded files..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <div v-if="uploadProgress.show" class="upload-progress">
        <el-progress
          :percentage="uploadProgress.percentage"
          :status="uploadProgress.status"
        />
        <p class="progress-text">{{ uploadProgress.text }}</p>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">Cancel</el-button>
      <el-button
        type="primary"
        @click="handleUpload"
        :loading="uploading"
        :disabled="fileList.length === 0"
      >
        Upload {{ fileList.length > 0 ? `(${fileList.length} files)` : '' }}
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { EvidenceStorageService } from '@/services/ObjectStorage';
import { kriService } from '@/services/kriService';
import { getUserDisplayName } from '@/utils/helpers';

export default {
  name: 'EvidenceUploadModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    kriId: {
      type: String,
      required: true
    },
    reportingDate: {
      type: Number,
      required: true
    },
    kriItem: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      dialogVisible: false,
      fileList: [],
      uploadForm: {
        description: ''
      },
      uploading: false,
      uploadProgress: {
        show: false,
        percentage: 0,
        status: 'active',
        text: 'Preparing upload...'
      },
      // Configuration
      maxFiles: 5,
      maxFileSize: 10, // MB
      acceptedTypes: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
      uploadUrl: '#', // Not used in manual upload
      // Form validation rules
      rules: {
        description: [
          { max: 500, message: 'Description cannot exceed 500 characters', trigger: 'blur' }
        ]
      }
    };
  },
  computed: {
    ...mapState('kri', ['currentUser'])
  },
  watch: {
    visible: {
      handler(newVal) {
        this.dialogVisible = newVal;
      },
      immediate: true
    },
    dialogVisible(newVal) {
      this.$emit('update:visible', newVal);
    }
  },
  methods: {
    ...mapActions('kri', ['refreshKRIDetail']),

    // File Management Methods
    handleFileChange(file, fileList) {
      this.fileList = fileList;
      
      // Validate file immediately
      const validation = this.validateFile(file);
      if (!validation.success) {
        this.$message.error(validation.errors.join(', '));
        // Remove invalid file from list
        this.handleFileRemove(file, fileList);
        return false;
      }
      
      return true;
    },

    handleFileRemove(file, fileList) {
      this.fileList = fileList;
    },

    handleExceed(files, fileList) {
      this.$message.warning(`Maximum ${this.maxFiles} files allowed. ${files.length} files selected, ${fileList.length} files already in queue.`);
    },

    beforeUpload(file) {
      // Prevent auto-upload since we handle manual upload
      return false;
    },

    // File Validation
    validateFile(file) {
      const errors = [];
      
      // Check file size
      const maxSizeBytes = this.maxFileSize * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        errors.push(`File "${file.name}" exceeds maximum size of ${this.maxFileSize}MB`);
      }

      // Check file type
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
      const fileExtension = this.getFileExtension(file.name).toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        errors.push(`File type "${fileExtension}" is not allowed`);
      }

      // Check filename length
      if (file.name.length > 255) {
        errors.push(`Filename "${file.name}" is too long (maximum 255 characters)`);
      }

      return {
        success: errors.length === 0,
        errors: errors
      };
    },

    // Main Upload Handler
    async handleUpload() {
      if (this.fileList.length === 0) {
        this.$message.warning('Please select at least one file to upload');
        return;
      }

      // Validate form
      try {
        await this.$refs.uploadForm?.validate();
      } catch (error) {
        this.$message.error('Please fix form validation errors');
        return;
      }

      this.uploading = true;
      this.uploadProgress.show = true;
      this.uploadProgress.percentage = 0;
      this.uploadProgress.status = 'active';

      const storageService = new EvidenceStorageService();
      const totalFiles = this.fileList.length;
      let successCount = 0;
      let failedCount = 0;
      const failedFiles = [];

      try {
        for (let i = 0; i < this.fileList.length; i++) {
          const file = this.fileList[i];
          const progress = Math.floor(((i + 1) / totalFiles) * 100);
          
          this.updateProgress(progress, `Uploading ${file.name}...`, 'active');

          try {
            // Upload file to storage
            const uploadResult = await storageService.uploadEvidence(
              file.name,
              file.raw || file,
              this.uploadForm.description,
              getUserDisplayName(this.currentUser)
            );

            // Save evidence record to database
            await this.saveEvidenceToDatabase({
              file_name: file.name,
              file_url: uploadResult.fileInfo.url,
              file_path: uploadResult.fileInfo.path,
              description: this.uploadForm.description,
              uploaded_by: getUserDisplayName(this.currentUser),
              file_size: (file.raw || file).size,
              file_type: (file.raw || file).type
            });

            successCount++;
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            failedCount++;
            failedFiles.push({
              filename: file.name,
              error: error.message
            });
          }
        }

        // Update final progress
        this.updateProgress(100, 'Upload completed', successCount === totalFiles ? 'success' : 'warning');

        // Show results
        if (successCount === totalFiles) {
          this.$message.success(`Successfully uploaded ${successCount} files`);
          this.$emit('upload-success');
          this.handleClose();
        } else if (successCount > 0) {
          this.$message.warning(`Uploaded ${successCount} files successfully, ${failedCount} files failed`);
          this.showFailedFiles(failedFiles);
          this.$emit('upload-success');
        } else {
          this.$message.error('All file uploads failed');
          this.showFailedFiles(failedFiles);
        }

      } catch (error) {
        console.error('Upload process error:', error);
        this.$message.error('Upload process failed');
        this.updateProgress(0, 'Upload failed', 'exception');
      } finally {
        this.uploading = false;
        // Hide progress after a delay
        setTimeout(() => {
          this.uploadProgress.show = false;
        }, 2000);
      }
    },

    // Database Integration
    async saveEvidenceToDatabase(evidenceData) {
      const updateData = {
        file_name: evidenceData.file_name,
        file_url: evidenceData.file_url,
        file_path: evidenceData.file_path,
        description: evidenceData.description,
        uploaded_by: evidenceData.uploaded_by,
        uploaded_at: new Date().toISOString(),
        file_size: evidenceData.file_size,
        file_type: evidenceData.file_type
      };

      await kriService.updateEvidence(
        this.kriId,
        this.reportingDate,
        updateData,
        getUserDisplayName(this.currentUser),
        'upload_evidence',
        `Uploaded evidence file: ${evidenceData.file_name}`
      );
    },

    // Progress and UI Methods
    updateProgress(percentage, text, status = 'active') {
      this.uploadProgress.percentage = percentage;
      this.uploadProgress.text = text;
      this.uploadProgress.status = status;
    },

    showFailedFiles(failedFiles) {
      if (failedFiles.length > 0) {
        const failureDetails = failedFiles.map(f => `${f.filename}: ${f.error}`).join('\n');
        this.$alert(failureDetails, 'Upload Failures', {
          type: 'warning',
          customClass: 'upload-failure-dialog'
        });
      }
    },

    // Modal Control Methods
    handleClose() {
      if (this.uploading) {
        this.$confirm(
          'Upload is in progress. Are you sure you want to close?',
          'Confirm Close',
          {
            confirmButtonText: 'Yes, Close',
            cancelButtonText: 'Keep Open',
            type: 'warning'
          }
        ).then(() => {
          this.dialogVisible = false;
        }).catch(() => {
          // User cancelled, do nothing
        });
      } else {
        this.dialogVisible = false;
        this.$emit('close');
      }
    },

    resetForm() {
      this.fileList = [];
      this.uploadForm.description = '';
      this.uploadProgress.show = false;
      this.uploadProgress.percentage = 0;
      this.uploading = false;
      
      // Clear upload component
      if (this.$refs.upload) {
        this.$refs.upload.clearFiles();
      }
      
      // Clear form validation
      if (this.$refs.uploadForm) {
        this.$refs.uploadForm.clearValidate();
      }
    },

    // Utility Methods
    getFileExtension(filename) {
      return filename.substring(filename.lastIndexOf('.'));
    },

    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    generateUniqueFilename(originalName) {
      const timestamp = Date.now();
      const extension = this.getFileExtension(originalName);
      const nameWithoutExt = originalName.replace(extension, '');
      return `${nameWithoutExt}_${timestamp}${extension}`;
    }
  }
};
</script>

<style scoped>
.upload-container {
  padding: 10px 0;
}

.upload-dragger {
  width: 100%;
}

.upload-dragger >>> .el-upload-dragger {
  width: 100%;
  height: 180px;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.upload-dragger >>> .el-upload-dragger:hover {
  border-color: #409eff;
}

.upload-dragger >>> .el-upload-dragger .el-icon-upload {
  font-size: 67px;
  color: #c0c4cc;
  margin: 40px 0 16px;
  line-height: 50px;
}

.upload-dragger >>> .el-upload__text {
  color: #606266;
  font-size: 14px;
  text-align: center;
}

.upload-dragger >>> .el-upload__text em {
  color: #409eff;
  font-style: normal;
}

.upload-dragger >>> .el-upload__tip {
  font-size: 12px;
  color: #606266;
  margin-top: 7px;
}

.upload-form {
  margin-top: 20px;
  padding: 15px;
  background-color: #fafafa;
  border-radius: 4px;
}

.upload-progress {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.progress-text {
  margin-top: 10px;
  color: #606266;
  font-size: 13px;
  text-align: center;
}

.dialog-footer {
  text-align: right;
}

/* File list styling */
.upload-container >>> .el-upload-list {
  margin-top: 10px;
}

.upload-container >>> .el-upload-list__item {
  transition: all 0.3s;
  margin-bottom: 8px;
}

.upload-container >>> .el-upload-list__item:hover {
  background-color: #f5f7fa;
}
</style>