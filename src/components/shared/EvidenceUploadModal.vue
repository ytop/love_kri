<template>
  <el-dialog
    title="Upload Evidence"
    :visible.sync="dialogVisible"
    width="600px"
    :before-close="handleClose"
    @closed="resetForm"
    :modal-append-to-body="false"
    :append-to-body="true"
    custom-class="evidence-upload-dialog"
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
import { excelParserService } from '@/services/ExcelParserService';

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
        status: undefined,
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
      },
      // MD5 tracking for duplicate detection
      fileHashes: new Map(),
      duplicateWarnings: [],
      // Auto parser support
      autoParseEnabled: false,
      parseResults: new Map(),
      // Evidence selection tracking
      uploadedEvidenceIds: []
    };
  },
  computed: {
    ...mapState('kri', ['currentUser']),
    
    // Check if KRI is configured for auto-parsing
    isAutoParseKRI() {
      return this.kriItem && this.kriItem.source === 'autoParse';
    },
    
    // Check if current KRI status allows case 1 operations (10: Pending Input, 20: Under Rework)
    isCase1Status() {
      return this.kriItem && (this.kriItem.kri_status === 10 || this.kriItem.kri_status === 20);
    },
    
    // Check if we should show auto-parse related UI
    showAutoParseFeatures() {
      return this.isAutoParseKRI && this.isCase1Status;
    }
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
    async handleFileChange(file, fileList) {
      this.fileList = fileList;
      
      // Validate file immediately
      const validation = this.validateFile(file);
      if (!validation.success) {
        this.$message.error(validation.errors.join(', '));
        // Remove invalid file from list
        this.handleFileRemove(file, fileList);
        return false;
      }
      
      // Generate file hash for duplicate detection
      try {
        const fileHash = await excelParserService.generateFileHash(file.raw || file);
        
        // Check for duplicates in current session
        if (this.fileHashes.has(fileHash)) {
          const existingFile = this.fileHashes.get(fileHash);
          this.$confirm(
            `This file appears to be identical to "${existingFile.name}" in your current upload. Do you want to continue?`,
            'Duplicate File in Current Upload',
            {
              confirmButtonText: 'Continue',
              cancelButtonText: 'Remove',
              type: 'warning'
            }
          ).then(() => {
            // User chose to continue with duplicate
            this.fileHashes.set(fileHash, { name: file.name, uid: file.uid, hash: fileHash });
            this.duplicateWarnings.push(file.name);
          }).catch(() => {
            // User chose to remove duplicate
            this.handleFileRemove(file, fileList);
          });
        } else {
          // Check for system-wide duplicates
          const existingFiles = await kriService.checkFileExists(fileHash);
          
          if (existingFiles && existingFiles.length > 0) {
            await this.handleSystemWideDuplicate(file, fileList, fileHash, existingFiles);
          } else {
            // New unique file
            this.fileHashes.set(fileHash, { name: file.name, uid: file.uid, hash: fileHash });
          }
        }
        
        // Auto-parse Excel files for case 1 KRIs
        if (this.showAutoParseFeatures && excelParserService.isSupportedExcelFile(file.raw || file)) {
          await this.handleExcelAutoParse(file);
        }
        
      } catch (error) {
        console.warn('File hash generation failed:', error);
        // Continue without hash-based duplicate detection
      }
      
      return true;
    },

    handleFileRemove(file, fileList) {
      this.fileList = fileList;
      
      // Clean up file hash tracking
      for (const [hash, fileInfo] of this.fileHashes.entries()) {
        if (fileInfo.uid === file.uid) {
          this.fileHashes.delete(hash);
          break;
        }
      }
      
      // Clean up parse results
      this.parseResults.delete(file.uid);
      
      // Remove from duplicate warnings
      const warningIndex = this.duplicateWarnings.findIndex(name => name === file.name);
      if (warningIndex > -1) {
        this.duplicateWarnings.splice(warningIndex, 1);
      }
    },

    handleExceed(files, fileList) {
      this.$message.warning(`Maximum ${this.maxFiles} files allowed. ${files.length} files selected, ${fileList.length} files already in queue.`);
    },

    beforeUpload(_file) {
      // Prevent auto-upload since we handle manual upload
      return false;
    },

    // System-wide Duplicate Handler
    async handleSystemWideDuplicate(file, fileList, fileHash, existingFiles) {
      const mostRecent = existingFiles[0];
      const uploadedDate = new Date(mostRecent.uploaded_at).toLocaleDateString();
      const totalDuplicates = existingFiles.length;
      
      let message = `This file already exists in the system!\n\n`;
      message += `Most recent upload:\n`;
      message += `• File: ${mostRecent.file_name}\n`;
      message += `• Uploaded by: ${mostRecent.uploaded_by || 'Unknown'}\n`;
      message += `• Date: ${uploadedDate}\n`;
      message += `• KRI ID: ${mostRecent.kri_id}\n`;
      
      if (totalDuplicates > 1) {
        message += `\n(${totalDuplicates} total uploads of this file found)`;
      }
      
      message += `\n\nWhat would you like to do?`;

      try {
        await this.$confirm(message, 'File Already Exists in System', {
          confirmButtonText: 'Upload Anyway',
          cancelButtonText: 'Skip This File',
          type: 'warning',
          customClass: 'duplicate-warning-dialog'
        });
        
        // User chose to upload anyway
        this.fileHashes.set(fileHash, { 
          name: file.name, 
          uid: file.uid, 
          hash: fileHash,
          isDuplicate: true,
          existingFiles: existingFiles
        });
        this.duplicateWarnings.push(`${file.name} (system duplicate)`);
        
        this.$message.warning(
          `Proceeding with upload of duplicate file: ${file.name}`,
          { duration: 3000 }
        );
        
      } catch (error) {
        // User chose to skip this file
        this.handleFileRemove(file, fileList);
        this.$message.info(`Skipped duplicate file: ${file.name}`);
      }
    },

    // Excel Auto-Parse Handler
    async handleExcelAutoParse(file) {
      try {
        this.updateProgress(0, `Parsing Excel file: ${file.name}...`);
        this.uploadProgress.show = true;
        
        // Parse Excel file using the ExcelParserService
        const parseResult = await excelParserService.parseExcelFile(
          file.raw || file,
          {
            kriId: this.kriId,
            expectedLabel: this.kriItem.kri_name,
            minValue: this.kriItem.warning_line_value ? this.kriItem.warning_line_value * 0.1 : undefined,
            maxValue: this.kriItem.limit_value ? this.kriItem.limit_value * 2 : undefined
          }
        );
        
        if (parseResult.success && parseResult.kriValue !== null) {
          // Store successful parse result
          this.parseResults.set(file.uid, parseResult);
          
          // Show success message with extracted value
          this.$message.success(
            `Successfully extracted KRI value: ${parseResult.kriValue} from ${file.name}`,
            { duration: 4000 }
          );
          
          // Emit event to parent component for potential auto-fill
          this.$emit('excel-parsed', {
            file: file.name,
            kriValue: parseResult.kriValue,
            confidence: parseResult.extractedData.confidence,
            parseResult: parseResult
          });
        } else {
          // Show warning for failed parsing
          this.$message.warning(
            `Could not extract KRI value from ${file.name}. You can still upload the file as evidence.`,
            { duration: 4000 }
          );
          
          if (parseResult.validationResults && parseResult.validationResults.errors) {
            console.warn('Parse validation errors:', parseResult.validationResults.errors);
          }
        }
        
      } catch (error) {
        console.error('Excel auto-parse error:', error);
        this.$message.warning(
          `Failed to parse ${file.name}. You can still upload the file as evidence.`
        );
      } finally {
        this.uploadProgress.show = false;
      }
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
      this.uploadProgress.status = undefined;

      const storageService = new EvidenceStorageService();
      const totalFiles = this.fileList.length;
      let successCount = 0;
      let failedCount = 0;
      const failedFiles = [];

      try {
        for (let i = 0; i < this.fileList.length; i++) {
          const file = this.fileList[i];
          const progress = Math.floor(((i + 1) / totalFiles) * 100);
          
          this.updateProgress(progress, `Uploading ${file.name}...`);

          try {
            // Upload file to storage
            const uploadResult = await storageService.uploadEvidence(
              file.name,
              file.raw || file,
              this.uploadForm.description,
              getUserDisplayName(this.currentUser)
            );

            // Get the MD5 hash for this file
            const fileInfo = this.getFileInfoByUid(file.uid);
            const md5Hash = fileInfo ? fileInfo.hash : null;

            // Save evidence record to database
            const evidenceRecord = await this.saveEvidenceToDatabase({
              file_name: file.name,
              file_url: uploadResult.fileInfo.url,
              description: this.uploadForm.description,
              uploaded_by: getUserDisplayName(this.currentUser),
              md5: md5Hash
            });

            // Track uploaded evidence for potential selection
            if (evidenceRecord && evidenceRecord.evidence_id) {
              this.uploadedEvidenceIds.push(evidenceRecord.evidence_id);
            } else {
              console.warn(`Evidence record missing evidence_id for file ${file.name}:`, evidenceRecord);
            }

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

        // Handle case 1 status transition if applicable
        if (successCount > 0 && this.isCase1Status) {
          try {
            await this.handleCase1StatusTransition();
          } catch (error) {
            console.error('Status transition failed:', error);
            this.$message.warning('Files uploaded successfully, but status update failed');
          }
        }

        // Offer evidence selection for uploaded files (if more than one file uploaded)
        if (successCount > 0 && this.uploadedEvidenceIds.length > 0) {
          try {
            await this.offerEvidenceSelection();
          } catch (error) {
            console.error('Evidence selection failed:', error);
            // Don't show error to user - evidence selection is optional
          }
        }

        // Show results
        if (successCount === totalFiles) {
          this.$message.success(`Successfully uploaded ${successCount} files`);
          this.$emit('upload-success');
          // Reset uploading flag before closing to avoid confirmation dialog
          this.uploading = false;
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

    // Case 1 Status Transition Handler
    async handleCase1StatusTransition() {
      // According to case 1 logic: 10 "Pending Input" OR 20 "Under Rework" → 30 "Saved"  
      if (this.kriItem.kri_status === 10 || this.kriItem.kri_status === 20) {
        const updateData = { kri_status: 30 }; // Status 30: "Saved"
        
        // Check if we have auto-parsed values to include
        const parsedValues = Array.from(this.parseResults.values())
          .filter(result => result.success && result.kriValue !== null);
        
        if (parsedValues.length > 0 && this.isAutoParseKRI) {
          // Use the highest confidence parsed value
          const bestParse = parsedValues.reduce((best, current) => 
            (current.extractedData.confidence > best.extractedData.confidence) ? current : best
          );
          
          updateData.kri_value = bestParse.kriValue;
          updateData.source = 'autoParse'; // Mark as auto-parsed
        }
        
        await kriService.updateKRI(
          this.kriId,
          this.reportingDate,
          updateData,
          getUserDisplayName(this.currentUser),
          'case1_evidence_upload',
          `Status changed to Saved after evidence upload${
            updateData.kri_value ? ` with auto-parsed value: ${updateData.kri_value}` : ''
          }`
        );
        
        // Emit event to notify parent components of status change
        this.$emit('status-updated', {
          oldStatus: this.kriItem.kri_status,
          newStatus: 30,
          kriValue: updateData.kri_value || null,
          autoParseApplied: !!updateData.kri_value
        });
        
        this.$message.success(
          `KRI status updated to "Saved"${
            updateData.kri_value ? ` with auto-parsed value: ${updateData.kri_value}` : ''
          }`
        );
      }
    },

    // Database Integration
    async saveEvidenceToDatabase(evidenceData) {
      const insertData = {
        file_name: evidenceData.file_name,
        file_url: evidenceData.file_url,
        description: evidenceData.description,
        uploaded_by: evidenceData.uploaded_by,
        uploaded_at: new Date().toISOString(),
        md5: evidenceData.md5 || null
      };

      try {
        const result = await kriService.insertEvidence(
          this.kriId,
          this.reportingDate,
          insertData,
          getUserDisplayName(this.currentUser),
          'upload_evidence',
          `Uploaded evidence file: ${evidenceData.file_name}`
        );

        // Ensure the result has the expected structure
        if (result && typeof result === 'object') {
          return result;
        } else {
          console.warn('Unexpected result format from insertEvidence:', result);
          return null;
        }
      } catch (error) {
        console.error('Failed to save evidence to database:', error);
        throw error; // Re-throw to be handled by caller
      }
    },

    // Progress and UI Methods
    updateProgress(percentage, text, status = undefined) {
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
      
      // Clear MD5 tracking and parse results
      this.fileHashes.clear();
      this.duplicateWarnings = [];
      this.parseResults.clear();
      this.uploadedEvidenceIds = [];
      
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
    getFileInfoByUid(uid) {
      for (const fileInfo of this.fileHashes.values()) {
        if (fileInfo.uid === uid) {
          return fileInfo;
        }
      }
      return null;
    },

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
    },

    // Offer user choice to select uploaded evidence as submitted evidence
    async offerEvidenceSelection() {
      // Filter out any invalid evidence IDs
      const validEvidenceIds = this.uploadedEvidenceIds.filter(id => id && typeof id === 'number');
      
      if (validEvidenceIds.length === 0) {
        console.warn('No valid evidence IDs available for selection');
        return;
      }
      
      // If only one file uploaded, offer to select it automatically
      if (validEvidenceIds.length === 1) {
        try {
          await this.$confirm(
            'Would you like to set this uploaded file as the submitted evidence for this KRI?',
            'Select Evidence',
            {
              confirmButtonText: 'Yes, Select',
              cancelButtonText: 'No, Thanks',
              type: 'info'
            }
          );
          
          // User chose to select the evidence
          await kriService.linkEvidenceToKRI(
            this.kriId,
            this.reportingDate,
            validEvidenceIds[0],
            getUserDisplayName(this.currentUser),
            'Evidence automatically selected after upload'
          );
          
          this.$message.success('Evidence has been selected as submitted evidence');
          this.$emit('evidence-selected', validEvidenceIds[0]);
          
        } catch (error) {
          // User declined or error occurred
          if (error.message) {
            console.error('Error selecting evidence:', error);
            this.$message.error('Failed to select evidence: ' + error.message);
          }
          // User clicking "No, Thanks" will also reach this catch block, which is fine
        }
      } else {
        // Multiple files uploaded - show selection dialog
        try {
          const { value: selectedEvidenceId } = await this.$prompt(
            `${validEvidenceIds.length} files were uploaded successfully. Enter the evidence ID to select as submitted evidence (or leave empty to skip):`,
            'Select Evidence',
            {
              confirmButtonText: 'Select',
              cancelButtonText: 'Skip',
              inputType: 'number',
              inputValidator: (value) => {
                if (!value) return true; // Allow empty (skip)
                const id = parseInt(value);
                if (!validEvidenceIds.includes(id)) {
                  return 'Please enter a valid evidence ID from the uploaded files';
                }
                return true;
              }
            }
          );
          
          if (selectedEvidenceId) {
            const evidenceId = parseInt(selectedEvidenceId);
            await kriService.linkEvidenceToKRI(
              this.kriId,
              this.reportingDate,
              evidenceId,
              getUserDisplayName(this.currentUser),
              'Evidence selected after multiple file upload'
            );
            
            this.$message.success('Evidence has been selected as submitted evidence');
            this.$emit('evidence-selected', evidenceId);
          }
          
        } catch (error) {
          // User cancelled or error occurred
          if (error.message) {
            console.error('Error selecting evidence:', error);
            this.$message.error('Failed to select evidence: ' + error.message);
          }
        }
      }
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

.upload-dragger :deep(.el-upload-dragger) {
  width: 100%;
  height: 180px;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.upload-dragger :deep(.el-upload-dragger:hover) {
  border-color: #409eff;
}

.upload-dragger :deep(.el-upload-dragger .el-icon-upload) {
  font-size: 67px;
  color: #c0c4cc;
  margin: 40px 0 16px;
  line-height: 50px;
}

.upload-dragger :deep(.el-upload__text) {
  color: #606266;
  font-size: 14px;
  text-align: center;
}

.upload-dragger :deep(.el-upload__text em) {
  color: #409eff;
  font-style: normal;
}

.upload-dragger :deep(.el-upload__tip) {
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
.upload-container :deep(.el-upload-list) {
  margin-top: 10px;
}

.upload-container :deep(.el-upload-list__item) {
  transition: all 0.3s;
  margin-bottom: 8px;
}

.upload-container :deep(.el-upload-list__item:hover) {
  background-color: var(--table-row-hover);
}

/* Use shared modal base styles */
.evidence-upload-dialog {
  position: fixed;
  top: 10vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-modal);
  margin: 0;
}

.evidence-upload-dialog .el-dialog {
  margin: 0;
  max-height: var(--modal-max-height);
  overflow-y: auto;
  border-radius: var(--modal-border-radius);
  box-shadow: var(--shadow-2xl);
}

.el-dialog__wrapper.evidence-upload-dialog {
  z-index: var(--z-modal);
}

.evidence-upload-dialog + .v-modal {
  z-index: var(--z-modal-backdrop);
  background-color: var(--modal-backdrop);
}

/* Duplicate warning dialog styling */
.duplicate-warning-dialog .el-message-box__message {
  white-space: pre-line;
  font-family: monospace;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-tight);
}

.duplicate-warning-dialog .el-message-box__btns {
  text-align: center;
  padding-top: var(--space-5);
}
</style>