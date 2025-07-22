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
    }
  },
  data() {
    return {
      dialogVisible: false,
      fileList: [],
      uploading: false,
      uploadForm: {
        description: ''
      },
      uploadProgress: {
        show: false,
        percentage: 0,
        status: '',
        text: ''
      },
      uploadUrl: '', // Placeholder - not actually used since we handle upload manually
      acceptedTypes: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
      maxFiles: 10,
      maxFileSize: 10, // MB
      rules: {
        description: [
          { max: 500, message: 'Description cannot exceed 500 characters', trigger: 'blur' }
        ]
      }
    };
  },
  watch: {
    visible: {
      immediate: true,
      handler(val) {
        this.dialogVisible = val;
      }
    },
    dialogVisible(val) {
      this.$emit('update:visible', val);
    }
  },
  methods: {
    handleFileChange(file, fileList) {
      this.fileList = fileList.filter(f => f.status !== 'fail');
    },

    handleFileRemove(file, fileList) {
      this.fileList = fileList;
    },

    handleExceed(files, fileList) {
      this.$message.warning(`You can only upload up to ${this.maxFiles} files at once.`);
    },

    beforeUpload(file) {
      const isValidSize = file.size / 1024 / 1024 < this.maxFileSize;
      if (!isValidSize) {
        this.$message.error(`File size cannot exceed ${this.maxFileSize}MB`);
        return false;
      }

      const isValidType = this.isValidFileType(file.name);
      if (!isValidType) {
        this.$message.error('Invalid file type. Please upload PDF, DOC, DOCX, XLS, XLSX, JPG, or PNG files.');
        return false;
      }

      return false; // Prevent auto upload - we handle it manually
    },

    isValidFileType(fileName) {
      const validExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
      const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
      return validExtensions.includes(fileExtension);
    },

    async handleUpload() {
      if (this.fileList.length === 0) {
        this.$message.warning('Please select at least one file to upload.');
        return;
      }

      // Validate form
      try {
        await this.$refs.uploadForm?.validate();
      } catch (error) {
        return;
      }

      this.uploading = true;
      this.uploadProgress = {
        show: true,
        percentage: 0,
        status: '',
        text: 'Preparing files...'
      };

      try {
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < this.fileList.length; i++) {
          const file = this.fileList[i];
          
          this.uploadProgress.text = `Uploading ${file.name}... (${i + 1}/${this.fileList.length})`;
          this.uploadProgress.percentage = Math.round((i / this.fileList.length) * 90);

          try {
            await this.$store.dispatch('kri/uploadEvidence', {
              kriId: this.kriId,
              reportingDate: this.reportingDate,
              file: file.raw,
              description: this.uploadForm.description
            });
            successCount++;
          } catch (error) {
            console.error('Upload failed for file:', file.name, error);
            failCount++;
          }
        }

        this.uploadProgress.percentage = 100;
        this.uploadProgress.status = failCount === 0 ? 'success' : 'warning';
        this.uploadProgress.text = `Upload complete: ${successCount} successful, ${failCount} failed`;

        // Show final result
        if (failCount === 0) {
          this.$message.success(`Successfully uploaded ${successCount} files.`);
        } else if (successCount > 0) {
          this.$message.warning(`Upload completed with issues: ${successCount} successful, ${failCount} failed.`);
        } else {
          this.$message.error('All uploads failed. Please try again.');
        }

        // Emit success event to refresh data
        if (successCount > 0) {
          this.$emit('upload-success');
        }

        // Close dialog after delay
        setTimeout(() => {
          this.handleClose();
        }, 2000);

      } catch (error) {
        console.error('Upload error:', error);
        this.$message.error('Upload failed. Please try again.');
        this.uploadProgress.status = 'exception';
        this.uploadProgress.text = 'Upload failed';
      } finally {
        this.uploading = false;
      }
    },

    handleClose() {
      if (this.uploading) {
        this.$confirm('Upload is in progress. Are you sure you want to cancel?', 'Warning', {
          confirmButtonText: 'Yes',
          cancelButtonText: 'No',
          type: 'warning'
        }).then(() => {
          this.dialogVisible = false;
        }).catch(() => {});
      } else {
        this.dialogVisible = false;
      }
    },

    resetForm() {
      this.fileList = [];
      this.uploadForm.description = '';
      this.uploadProgress = {
        show: false,
        percentage: 0,
        status: '',
        text: ''
      };
      this.$refs.uploadForm?.resetFields();
      this.$refs.upload?.clearFiles();
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