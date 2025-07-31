<template>
  <div class="kri-overview">
    <el-row :gutter="24">
      <el-col :span="hasNegativeLimits ? 6 : 8">
        <div class="metric-card">
          <div class="metric-label">Current Value</div>
          <div class="metric-value">{{ kriData.kri_value || 'N/A' }}</div>
        </div>
      </el-col>
      <el-col :span="hasNegativeLimits ? 6 : 8">
        <div class="metric-card">
          <div class="metric-label">Warning Line</div>
          <div class="metric-value warning">{{ kriData.warning_line_value || 'N/A' }}</div>
        </div>
      </el-col>
      <el-col :span="hasNegativeLimits ? 6 : 8">
        <div class="metric-card">
          <div class="metric-label">Limit Value</div>
          <div class="metric-value danger">{{ kriData.limit_value || 'N/A' }}</div>
        </div>
      </el-col>
      <el-col v-if="hasNegativeLimits" :span="6">
        <div class="metric-card negative-limits">
          <div class="metric-label">Negative Limits</div>
          <div class="negative-limits-container">
            <div class="negative-limit-item">
              <span class="negative-label">Warning:</span>
              <span class="metric-value warning small">{{ kriData.negative_warning || 'N/A' }}</span>
            </div>
            <div class="negative-limit-item">
              <span class="negative-label">Limit:</span>
              <span class="metric-value danger small">{{ kriData.negative_limit || 'N/A' }}</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- Calculation Details Section (Only for Calculated KRIs) -->
    <div v-if="isCalculatedKRI && kriData.kri_formula" class="formula-result-section">
        <div class="formula-header">
          <h4>
            <i class="el-icon-s-data"></i>
            Calculation Details
          </h4>
          <el-tag v-if="isDynamicResult" type="success" size="mini" class="live-tag">
            <i class="el-icon-refresh"></i> Live
          </el-tag>
        </div>
        
        <div class="formula-content">
          <div class="formula-item">
            <div class="formula-label">
              <i class="el-icon-edit-outline"></i>
              <strong>Formula:</strong>
            </div>
            <code class="formula-code">{{ kriData.kri_formula || 'No formula defined' }}</code>
          </div>
          
          <div class="formula-item">
            <div class="formula-label">
              <i class="el-icon-s-operation"></i>
              <strong>Substitution:</strong>
            </div>
            <code class="calculation-code">{{ calculateFormula }}</code>
          </div>
          
          <div class="formula-item result-item">
            <div class="formula-label">
              <i class="el-icon-s-marketing"></i>
              <strong>Result:</strong>
            </div>
            <div class="result-container">
              <span class="result-value" :class="{'result-highlight': isDynamicResult}">
                {{ calculatedResult }}
              </span>
              <div v-if="isDynamicResult" class="result-status">
                <el-tag type="warning" size="mini">
                  <i class="el-icon-warning-outline"></i>
                  Different from stored value ({{ kriData.kri_value }})
                </el-tag>
              </div>
            </div>
          </div>
          
          <div v-if="atomicData.length > 0" class="atomic-values-section">
            <div class="formula-label">
              <i class="el-icon-collection"></i>
              <strong>Atomic Values:</strong>
            </div>
            <div class="atomic-grid">
              <div 
                v-for="item in atomicData" 
                :key="item.atomic_id" 
                class="atomic-card"
                :class="{'atomic-card-highlight': isDynamicResult}"
                :id="`atomic-${item.atomic_id}`"
                @click="scrollToAtomicRow(item.atomic_id)">
                
                <div class="atomic-header">
                  <span class="atomic-id">A{{ item.atomic_id }}</span>
                  <el-tag :type="getAtomicStatusType(item.atomic_status)" size="mini">
                    {{ mapAtomicStatus(item.atomic_status) }}
                  </el-tag>
                </div>
                
                <div class="atomic-card-content">
                  <div class="atomic-name">{{ item.atomic_metadata || `Element ${item.atomic_id}` }}</div>
                  <div class="atomic-value-display">{{ item.atomic_value || 'N/A' }}</div>
                </div>
                
                <div class="atomic-card-footer">
                  <el-button 
                    type="text" 
                    size="mini" 
                    icon="el-icon-view"
                    @click.stop="scrollToAtomicRow(item.atomic_id)">
                    View in Table
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>

    <!-- Regular Data Input Section (for non-calculated KRIs) -->
    <div v-if="canEditKRI" class="data-input-section">
      <el-card class="input-card">
        <div slot="header" class="card-header">
          <span>
            <i class="el-icon-edit"></i>
            Manual Data Input
          </span>
          <el-tag :type="getStatusTagType(kriData.kri_status)" size="small">
            {{ mapStatus(kriData.kri_status) }}
          </el-tag>
        </div>
        <div class="input-content">
          <el-form :model="inputForm" label-width="120px" size="medium">
            <el-form-item label="KRI Value">
              <el-input-number
                v-model="inputForm.kriValue"
                placeholder="Enter KRI value"
                :precision="2"
class="full-width"
                :disabled="inputLoading">
              </el-input-number>
            </el-form-item>
            <el-form-item label="Comment (Optional)">
              <el-input
                v-model="inputForm.comment"
                type="textarea"
                placeholder="Add a comment about this value..."
                :rows="3"
                :disabled="inputLoading">
              </el-input>
            </el-form-item>
            <el-form-item>
              <!-- Show validation warning when save is disabled -->
              <div v-if="validationMessage && !inputLoading" class="validation-warning">
                <el-alert
                  :title="validationMessage"
                  type="warning"
                  :closable="false"
                  show-icon
                  class="validation-alert">
                </el-alert>
              </div>
              
              <div class="action-buttons">
                <el-button
                  type="primary"
                  icon="el-icon-check"
                  @click="handleSave"
                  :loading="inputLoading"
                  :disabled="!canSaveValue">
                  Save
                </el-button>
                <el-button
                  v-if="kriData.kri_status === 30"
                  type="success"
                  icon="el-icon-upload"
                  @click="handleSubmit"
                  :loading="inputLoading"
                  :disabled="!canSubmitValue">
                  Submit
                </el-button>
                <el-button
                  v-if="[10, 20].includes(kriData.kri_status)"
                  type="success"
                  icon="el-icon-upload"
                  @click="handleSaveAndSubmit"
                  :loading="inputLoading"
                  :disabled="!canSubmitValue">
                  Save and Submit
                </el-button>
                <el-button
                  v-if="canUploadEvidence"
                  type="info"
                  icon="el-icon-upload2"
                  @click="showUploadModal"
                  :loading="inputLoading">
                  Upload Evidence
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
    </div>
    
    <el-row :gutter="24" class="info-row">
      <el-col :span="12">
        <div class="info-item">
          <label>RAS Metric</label>
          <p>{{ kriData.ras_metric || 'N/A' }}</p>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="info-item">
          <label>Breach Status</label>
          <el-tooltip :content="getBreachDescription(dynamicBreachStatus)" placement="top">
            <el-tag :type="getBreachTagType(dynamicBreachStatus)" size="small" class="status-tag">
              {{ getBreachDisplayText(dynamicBreachStatus) }}
            </el-tag>
          </el-tooltip>
          <span v-if="dynamicBreachStatus !== (kriData.breach_type || 'No Breach')" class="breach-preview">
            (Preview)
          </span>
        </div>
      </el-col>
    </el-row>

    <!-- Selected Evidence Section -->
    <el-row v-if="selectedEvidence" :gutter="24" class="evidence-row">
      <el-col :span="24">
        <div class="evidence-section">
          <div class="evidence-header">
            <label>
              <i class="el-icon-paperclip"></i>
              {{ evidenceHeaderText }}
            </label>
            <div class="evidence-controls">
              <el-tag type="info" size="mini">{{ totalEvidenceCount }} files total</el-tag>
              <el-button
                v-if="canUploadEvidence && !isCalculatedKRI"
                type="primary"
                size="mini"
                icon="el-icon-upload2"
                @click="showUploadModal"
              >
                Upload Evidence
              </el-button>
            </div>
          </div>
          <!-- Evidence Selection for Direct KRIs -->
          <div v-if="!isCalculatedKRI" class="evidence-selection">
            <div class="selection-header">
              <label class="selection-label">
                <i class="el-icon-s-order"></i>
                Select Evidence File:
              </label>
              <el-tag 
                v-if="!canModifyEvidence" 
                type="warning" 
                size="mini"
                class="readonly-tag"
              >
                <i class="el-icon-lock"></i>
                Read-only (Review/Acknowledge Stage)
              </el-tag>
            </div>
            <el-select
              v-model="selectedEvidenceId"
              placeholder="Choose evidence file"
              size="small"
              style="width: 100%; margin-bottom: 12px;"
              @change="handleEvidenceSelection"
              :loading="isUpdatingSelection"
              :disabled="!canModifyEvidence"
            >
              <el-option
                v-for="evidence in evidenceData"
                :key="evidence.evidence_id"
                :label="evidence.file_name"
                :value="evidence.evidence_id"
              >
                <div class="evidence-option">
                  <span class="option-name">{{ evidence.file_name }}</span>
                  <span class="option-meta">{{ formatReportingDate(evidence.uploaded_at) }}</span>
                </div>
              </el-option>
            </el-select>
          </div>
          
          <!-- Evidence Display -->
          <div class="evidence-item">
            <div class="evidence-info">
              <div class="evidence-name-container">
                <span class="file-name">{{ selectedEvidence.file_name }}</span>
                <el-tag 
                  v-if="isEvidenceSelected" 
                  type="success" 
                  size="mini"
                >
                  Selected
                </el-tag>
                <el-tag 
                  v-else 
                  type="warning" 
                  size="mini"
                >
                  Latest (Default)
                </el-tag>
              </div>
              <span class="file-meta">
                Uploaded by {{ selectedEvidence.uploaded_by || 'Unknown' }} 
                on {{ formatReportingDate(selectedEvidence.uploaded_at) }}
              </span>
              <p v-if="selectedEvidence.description" class="file-description">
                {{ selectedEvidence.description }}
              </p>
            </div>
            <el-button
              v-if="canDownloadSelectedEvidence"
              type="text"
              size="small"
              icon="el-icon-download"
              @click="downloadEvidence(selectedEvidence)"
            >
              Download
            </el-button>
            <span v-else class="no-permission-text">No Download Permission</span>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- Evidence Upload Modal -->
    <evidence-upload-modal
      :visible.sync="uploadModalVisible"
      :kri-id="String(kriData.kri_id)"
      :reporting-date="kriData.reporting_date"
      :kri-item="kriData"
      @upload-success="handleUploadSuccess"
      @close="handleModalClose"
    />
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import { mapStatus, getStatusTagType, getBreachTagType, getBreachDisplayText, getBreachDescription } from '@/utils/types';
import { 
  formatReportingDate, 
  calculateBreachStatus, 
  getSelectedEvidence,
  isEvidenceSelected,
  allowsManualInput,
  canSaveKRIValue,
  canSubmitKRIValue,
  getSaveValidationMessage,
  getSubmitValidationMessage,
  isCalculatedKRI,
  calculateBreachStatusForKRI
} from '@/utils/helpers';
import { kriCalculationService } from '@/utils/kriCalculation';
import Permission from '@/utils/permission';
import { getUserDisplayName } from '@/utils/helpers';
import { kriService } from '@/services/kriService';

export default {
  name: 'KRIOverview',
  components: {
    EvidenceUploadModal: () => import('@/components/shared/EvidenceUploadModal.vue').catch(() => {
      console.warn('EvidenceUploadModal component not found');
      return { template: '<div></div>' };
    })
  },
  props: {
    kriData: {
      type: Object,
      required: true
    },
    atomicData: {
      type: Array,
      default: () => []
    },
    evidenceData: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      inputForm: {
        kriValue: null,
        comment: ''
      },
      inputLoading: false,
      uploadModalVisible: false,
      isUpdatingSelection: false
    };
  },
  computed: {
    ...mapState('kri', ['currentUser']),
    ...mapGetters('kri', ['availableKRIDetailActions']),
    
    // Check if this is a calculated KRI
    isCalculatedKRI() {
      return isCalculatedKRI(this.kriData);
    },
    
    // Check if user can edit this KRI (exclude calculated KRIs from manual input)
    canEditKRI() {
      if (!this.kriData) return false;
      const status = this.kriData.kri_status;
      const allowedStatuses = [10, 20, 30]; // PENDING_INPUT, UNDER_REWORK, SAVED
      const userPermissions = this.currentUser?.permissions || [];
      return allowedStatuses.includes(status) && 
             Permission.canEdit(this.kriData.kri_id, null, userPermissions) &&
             allowsManualInput(this.kriData.source) &&
             !this.isCalculatedKRI; // Exclude calculated KRIs from manual input
    },
    
    
    // Check if KRI has negative limits configured (both non-zero)
    hasNegativeLimits() {
      const negativeWarning = this.kriData?.negative_warning || 0;
      const negativeLimit = this.kriData?.negative_limit || 0;
      return negativeWarning !== 0 || negativeLimit !== 0;
    },
    
    // Calculate dynamic breach status based on current input with 4-limit support
    dynamicBreachStatus() {
      const currentValue = this.inputForm.kriValue || this.kriData?.kri_value;
      if (!currentValue) return 'No Breach';
      
      return calculateBreachStatus(
        currentValue,
        this.kriData?.warning_line_value,
        this.kriData?.limit_value,
        this.kriData?.negative_warning,
        this.kriData?.negative_limit
      );
    },
    
    // Get selected evidence file (or fall back to latest)
    selectedEvidence() {
      return getSelectedEvidence(this.kriData, this.evidenceData);
    },
    
    // Check if evidence is actually selected (not just falling back to latest)
    isEvidenceSelected() {
      return isEvidenceSelected(this.kriData, this.evidenceData);
    },
    
    // Dynamic header text based on evidence selection status
    evidenceHeaderText() {
      return this.isEvidenceSelected ? 'Selected Evidence' : 'Latest Evidence (No Selection)';
    },
    
    // Count total evidence files
    totalEvidenceCount() {
      return this.evidenceData ? this.evidenceData.length : 0;
    },
    
    // Check if user can save KRI value (for save button)
    canSaveValue() {
      // Use selected evidence instead of all evidence data for validation
      const selectedEvidenceArray = this.selectedEvidence ? [this.selectedEvidence] : [];
      return canSaveKRIValue(this.kriData, selectedEvidenceArray, this.inputForm.kriValue);
    },
    
    // Check if user can submit KRI value (for submit button)
    canSubmitValue() {
      // Use selected evidence instead of all evidence data for validation
      const selectedEvidenceArray = this.selectedEvidence ? [this.selectedEvidence] : [];
      return canSubmitKRIValue(this.kriData, selectedEvidenceArray, this.inputForm.kriValue);
    },
    
    // Validate input form (legacy compatibility)
    isValidInput() {
      return this.canSaveValue;
    },
    
    // Get validation message for user feedback
    validationMessage() {
      if (!this.kriData) return null;
      
      // Use selected evidence instead of all evidence data for validation messages
      const selectedEvidenceArray = this.selectedEvidence ? [this.selectedEvidence] : [];
      
      if (!this.canSaveValue) {
        return getSaveValidationMessage(this.kriData, selectedEvidenceArray, this.inputForm.kriValue);
      }
      
      if (!this.canSubmitValue) {
        return getSubmitValidationMessage(this.kriData, selectedEvidenceArray, this.inputForm.kriValue);
      }
      
      return null;
    },
    
    
    // Check if user can upload evidence (only for direct KRIs)
    canUploadEvidence() {
      if (!this.currentUser || !this.currentUser.permissions || this.isCalculatedKRI) {
        return false;
      }
      
      // Check if evidence is required for this KRI based on source
      const requiresEvidence = (source) => {
        return source === 'autoParse' || !source || source === '';
      };
      
      if (!requiresEvidence(this.kriData?.source)) {
        return false;
      }
      
      const allowedStatuses = [10, 20, 30];
      const hasValidStatus = allowedStatuses.includes(this.kriData?.kri_status);
      
      const userPermissions = this.currentUser?.permissions || [];
      return hasValidStatus && Permission.canEdit(this.kriData?.kri_id, null, userPermissions);
    },
    
    // Check if user can modify evidence (select/upload for direct KRIs)
    // Only allowed during input stages: 10 (Pending Input), 20 (Under Rework), 30 (Saved)
    // Disabled during review/acknowledge stages: 40, 50, 60
    canModifyEvidence() {
      if (!this.currentUser || !this.currentUser.permissions || this.isCalculatedKRI) {
        return false;
      }
      
      const inputStages = [10, 20, 30]; // Only input stages allow evidence modification
      const hasValidStatus = inputStages.includes(this.kriData?.kri_status);
      
      const userPermissions = this.currentUser?.permissions || [];
      return hasValidStatus && Permission.canEdit(this.kriData?.kri_id, null, userPermissions);
    },
    
    // Get/set selected evidence ID for dropdown
    selectedEvidenceId: {
      get() {
        return this.kriData?.evidence_id || null;
      },
      set(_value) {
        // This will be handled by the handleEvidenceSelection method
      }
    },
    
    // Calculate formula with atomic values substitution
    calculateFormula() {
      if (!this.isCalculatedKRI || !this.kriData?.kri_formula || !this.atomicData?.length) {
        return 'No formula or atomic data available';
      }
      
      try {
        // Create substitution string showing formula with actual values
        let substitution = this.kriData.kri_formula;
        
        this.atomicData.forEach(atomic => {
          const atomicVar = `atomic${atomic.atomic_id}`;
          const atomicValue = atomic.atomic_value || 0;
          const regex = new RegExp(`\\b${atomicVar}\\b`, 'gi');
          substitution = substitution.replace(regex, atomicValue);
        });
        
        return substitution;
      } catch (error) {
        return `Calculation error: ${error.message}`;
      }
    },
    
    // Real-time calculated result
    calculatedResult() {
      if (!this.isCalculatedKRI || !this.kriData?.kri_formula || !this.atomicData?.length) {
        return 'N/A';
      }
      
      try {
        const result = kriCalculationService.executeFormulaCalculation(
          this.kriData.kri_formula,
          this.atomicData
        );
        return typeof result === 'number' ? result.toFixed(2) : result;
      } catch (error) {
        console.error('Calculation error:', error);
        return 'Error';
      }
    },
    
    // Check if calculated result differs from stored value
    isDynamicResult() {
      if (!this.isCalculatedKRI || this.calculatedResult === 'N/A' || this.calculatedResult === 'Error') {
        return false;
      }
      
      const storedValue = parseFloat(this.kriData?.kri_value || 0);
      const calculatedValue = parseFloat(this.calculatedResult);
      
      // Consider values different if they differ by more than 0.01
      return Math.abs(storedValue - calculatedValue) > 0.01;
    },

    // Check if user can download selected evidence
    canDownloadSelectedEvidence() {
      if (!this.currentUser || !this.currentUser.permissions || !this.kriData) {
        return false;
      }
      
      const userPermissions = this.currentUser.permissions || [];
      return Permission.canDownloadEvidence(this.kriData.kri_id, userPermissions);
    }
  },
  watch: {
    // Watch kriData changes to update input form
    'kriData.kri_value': {
      handler(newValue) {
        if (newValue !== null && newValue !== '') {
          this.inputForm.kriValue = parseFloat(newValue);
        }
      },
      immediate: true
    }
  },
  methods: {
    ...mapActions('kri', ['updateKRIStatus']),
    
    // Utility functions
    mapStatus,
    getStatusTagType,
    getBreachTagType,
    getBreachDisplayText, 
    getBreachDescription,
    formatReportingDate,
    
    // Helper method to determine next status for submission
    getNextSubmitStatus() {
      return this.kriData.kri_owner === this.kriData.data_provider ? 50 : 40;
    },
    
    // Data input handlers
    async handleSave() {
      if (!this.isValidInput) return;
      
      this.inputLoading = true;
      try {
        // Calculate breach status based on new KRI value
        const breachStatus = calculateBreachStatusForKRI(this.inputForm.kriValue, this.kriData);
        
        await this.updateKRIStatus({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date,
          updateData: { 
            kri_value: this.inputForm.kriValue,
            kri_status: 30, // SAVED
            breach_type: breachStatus
          },
          action: 'save',
          comment: this.inputForm.comment || 'Data saved'
        });
        this.$message.success('KRI data saved successfully');
        this.$emit('data-updated');
      } catch (error) {
        this.$message.error('Failed to save KRI data');
        console.error('Save error:', error);
      } finally {
        this.inputLoading = false;
      }
    },
    
    async handleSubmit() {
      this.inputLoading = true;
      try {
        // Determine next status based on KRI owner/data provider relationship
        const nextStatus = this.getNextSubmitStatus();
        await this.updateKRIStatus({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date,
          updateData: { kri_status: nextStatus },
          action: 'submit',
          comment: this.inputForm.comment || 'Data submitted for approval'
        });
        this.$message.success('KRI submitted successfully');
        this.$emit('data-updated');
      } catch (error) {
        this.$message.error('Failed to submit KRI');
        console.error('Submit error:', error);
      } finally {
        this.inputLoading = false;
      }
    },
    
    async handleSaveAndSubmit() {
      if (!this.isValidInput) return;
      
      this.inputLoading = true;
      try {
        // Calculate breach status based on new KRI value
        const breachStatus = calculateBreachStatusForKRI(this.inputForm.kriValue, this.kriData);
        
        // First save the data, then submit
        const nextStatus = this.getNextSubmitStatus();
        await this.updateKRIStatus({
          kriId: this.kriData.kri_id,
          reportingDate: this.kriData.reporting_date,
          updateData: { 
            kri_value: this.inputForm.kriValue,
            kri_status: nextStatus,
            breach_type: breachStatus
          },
          action: 'save_and_submit',
          comment: this.inputForm.comment || 'Data saved and submitted for approval'
        });
        this.$message.success('KRI saved and submitted successfully');
        this.$emit('data-updated');
      } catch (error) {
        this.$message.error('Failed to save and submit KRI');
        console.error('Save and submit error:', error);
      } finally {
        this.inputLoading = false;
      }
    },
    
    
    // Evidence download handler
    downloadEvidence(evidence) {
      if (!evidence || !evidence.file_url) return;
      
      // Check download permissions
      if (!this.canDownloadSelectedEvidence) {
        this.$message.error('You do not have permission to download this evidence file');
        return;
      }
      
      // Create download link
      const link = document.createElement('a');
      link.href = evidence.file_url;
      link.download = evidence.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.$message.success('Evidence downloaded successfully');
    },
    
    // Evidence upload modal handlers
    showUploadModal() {
      this.uploadModalVisible = true;
    },
    
    handleUploadSuccess() {
      this.uploadModalVisible = false;
      this.$message.success('Evidence uploaded successfully');
      this.$emit('data-updated');
    },
    
    handleModalClose() {
      this.uploadModalVisible = false;
    },
    
    // Handle evidence selection from dropdown
    async handleEvidenceSelection(evidenceId) {
      if (this.isUpdatingSelection || this.isCalculatedKRI) return;
      
      // Prevent evidence selection changes during review/acknowledge stages
      if (!this.canModifyEvidence) {
        this.$message.warning('Evidence selection is not allowed during review/acknowledge stages');
        return;
      }
      
      try {
        this.isUpdatingSelection = true;
        
        if (evidenceId) {
          await kriService.linkEvidenceToKRI(
            this.kriData.kri_id,
            this.kriData.reporting_date,
            evidenceId,
            getUserDisplayName(this.currentUser),
            'Evidence selected from overview'
          );
          this.$message.success('Evidence selected successfully');
        } else {
          await kriService.unlinkEvidenceFromKRI(
            this.kriData.kri_id,
            this.kriData.reporting_date,
            getUserDisplayName(this.currentUser),
            'Evidence selection removed from overview'
          );
          this.$message.success('Evidence selection removed');
        }
        
        this.$emit('data-updated');
        
      } catch (error) {
        console.error('Error updating evidence selection:', error);
        this.$message.error('Failed to update evidence selection: ' + error.message);
      } finally {
        this.isUpdatingSelection = false;
      }
    },
    
    // Helper methods for calculation section
    mapAtomicStatus(status) {
      return mapStatus(status);
    },
    
    getAtomicStatusType(status) {
      return getStatusTagType(status);
    },
    
    scrollToAtomicRow(atomicId) {
      this.$nextTick(() => {
        // Look for the data elements section first
        const dataElementsSection = document.querySelector('#data-elements-section');
        if (dataElementsSection) {
          dataElementsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
          
          // Then try to find the specific atomic row in the table
          setTimeout(() => {
            const atomicRow = document.querySelector(`tr[data-atomic-id="${atomicId}"]`) || 
                             document.querySelector(`#dataElementsTable tbody tr:nth-child(${atomicId + 1})`) ||
                             Array.from(document.querySelectorAll('#dataElementsTable tbody tr')).find(row => {
                               const cells = row.querySelectorAll('td');
                               return cells.length > 1 && cells[1].textContent.trim() == atomicId;
                             });
            
            if (atomicRow) {
              atomicRow.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
              });
              
              // Add highlight effect
              atomicRow.classList.add('highlight-row');
              setTimeout(() => {
                atomicRow.classList.remove('highlight-row');
              }, 2000);
            }
          }, 500);
        }
      });
    }
  }
};
</script>

<style scoped>
.kri-overview {
  padding: 0.5rem 0;
}

.metric-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
}

.metric-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.metric-value.warning {
  color: #f59e0b;
}

.metric-value.danger {
  color: #ef4444;
}

.metric-value.small {
  font-size: 1rem;
  font-weight: 600;
}

.negative-limits {
  background: #fef9f9;
  border-color: #fecaca;
}

.negative-limits-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.negative-limit-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.negative-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.data-input-section {
  margin: 1.5rem 0;
}

.input-card {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #374151;
}

.input-content {
  padding: 0.5rem 0;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.action-buttons .el-button + .el-button {
  margin-left: 10px;
}

.breach-preview {
  color: #909399;
  font-size: 0.75rem;
  margin-left: 0.5rem;
  font-style: italic;
}

.info-item {
  margin-bottom: 1rem;
}

.info-item label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  display: block;
  margin-bottom: 0.25rem;
}

.info-item p {
  font-size: 0.875rem;
  color: #374151;
  margin: 0;
}

.status-tag {
  margin-left: 0.5rem;
}


/* Evidence Section Styles */
.evidence-section {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-top: 8px;
}

.evidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.evidence-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.evidence-header label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0;
}

.evidence-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.evidence-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.1);
}

.evidence-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.file-meta {
  font-size: 12px;
  color: #6c757d;
}

.file-description {
  font-size: 12px;
  color: #495057;
  margin: 4px 0 0 0;
  font-style: italic;
}

/* Validation warning styles */
.validation-warning {
  margin-bottom: 16px;
}

.validation-alert {
  font-size: 13px;
}

.validation-alert :deep(.el-alert__title) {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-tight);
}

/* Layout spacing classes */
.info-row {
  margin-top: var(--space-6);
}

.evidence-row {
  margin-top: var(--space-4);
}

.evidence-name-container {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.full-width {
  width: 100%;
}

/* Enhanced Formula/Calculation Result Section */
.formula-result-section {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 12px;
    margin: 20px 0;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    max-width: 100%;
}

.formula-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid #e2e8f0;
}

.formula-header h4 {
    font-size: 18px;
    color: #1a202c;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.live-tag {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.formula-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.formula-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.formula-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #718096;
    font-weight: 500;
    font-size: 14px;
}

.formula-code, .calculation-code {
    background-color: #2d3748;
    color: #e2e8f0;
    padding: 12px 16px;
    border-radius: 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    border: 1px solid #4a5568;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-width: 100%;
    display: block;
    box-sizing: border-box;
}

.result-item {
    background-color: white;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.result-container {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.result-value {
    font-size: 20px;
    font-weight: 700;
    color: #059669;
    padding: 8px 16px;
    border-radius: 6px;
    background-color: #f0fdf4;
}

.result-status {
    flex: 1;
}

.atomic-values-section {
    background-color: white;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.atomic-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    margin-top: 16px;
}

.atomic-card {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.atomic-card:hover {
    border-color: #409eff;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
    transform: translateY(-2px);
}

.atomic-card-highlight {
    border-color: #f6ad55;
    background: #fef5e7;
    box-shadow: 0 2px 8px rgba(246, 173, 85, 0.2);
}

.atomic-card-content {
    margin-bottom: 8px;
}

.atomic-card-footer {
    display: flex;
    justify-content: center;
}

.atomic-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.atomic-id {
    font-weight: 600;
    color: #409eff;
    font-size: 12px;
}

.atomic-name {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 8px;
    font-weight: 500;
}

.atomic-value-display {
    font-size: 16px;
    font-weight: 600;
    color: #059669;
    background-color: white;
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid #d1fae5;
    text-align: center;
}

/* Responsive formula section */
@media (max-width: 768px) {
  .formula-result-section {
    padding: 16px;
    margin: 16px 0;
    border-radius: 8px;
  }
  
  .formula-header h4 {
    font-size: 16px;
  }
  
  .formula-content {
    gap: 12px;
  }
  
  .formula-code, .calculation-code {
    font-size: 12px;
    padding: 10px 12px;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

/* Responsive atomic cards grid */
@media (max-width: 768px) {
  .atomic-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-top: 12px;
  }
  
  .atomic-card {
    padding: 16px;
    min-height: 100px;
  }
  
  .atomic-card:hover {
    transform: none; /* Disable hover transform on mobile */
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .atomic-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
  }
}

@media (min-width: 1025px) {
  .atomic-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 18px;
  }
}

/* Evidence Selection Styles */
.evidence-selection {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.selection-label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0;
}

.readonly-tag {
  display: flex;
  align-items: center;
  gap: 4px;
}

.evidence-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.option-name {
  font-weight: 500;
  color: #374151;
}

.option-meta {
  font-size: 12px;
  color: #6c757d;
}

/* Permission-related styles */
.no-permission-text {
  color: #909399;
  font-size: 12px;
  font-style: italic;
}
</style>