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