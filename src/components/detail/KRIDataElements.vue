<template>
  <div class="data-elements">
    <div class="left-title">
            <h4>Data Elements</h4>
        </div>
    <!-- Calculation Details Section (Only for Calculated KRIs) -->
    <div v-if="isCalculatedKRI && kriDetail.kri_formula" class="formula-result-section">
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
            <code class="formula-code">{{ kriDetail.kri_formula || 'No formula defined' }}</code>
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
                  Different from stored value ({{ kriDetail.kri_value }})
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

    <div class="actions-toolbar">

    <div class="right-actions">
        <el-button
          v-if="canSubmitAtomicData"
          type="success"
          icon="el-icon-upload"
          @click="handleSubmitAtomicData"
          :loading="submittingAtomicData"
          size="small">
          Submit Atomic Data
        </el-button>
        <el-button
          v-if="showApproveButton"
          type="success"
          icon="el-icon-check"
          @click="approveSelectedRows"
          :disabled="!canApproveSelected"
          size="small">
          Approve Selected ({{ approvableCount }})
        </el-button>
        <el-button
          v-if="showRejectButton"
          type="danger"
          icon="el-icon-close"
          @click="rejectSelectedRows"
          :disabled="!canRejectSelected"
          size="small">
          Reject Selected
        </el-button>
        <el-button
          v-if="showAcknowledgeButton"
          type="primary"
          icon="el-icon-check"
          @click="acknowledgeSelectedRows"
          :disabled="!canAcknowledgeSelected"
          size="small">
          Acknowledge Selected ({{ acknowledgableCount }})
        </el-button>
    </div>
    </div>
    <div class="table-container">
    <table class="data-table" id="dataElementsTable">
    <thead>
        <tr>
            <th><input type="checkbox" id="selectAllCheckboxes" v-model="selectAll" @change="handleSelectAllChange"></th>
            <th>Element ID</th>
            <th>Data Element Name</th>
            <th>Value</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Evidence</th>
            <th>Comment</th>
            <th class="fixed-column">Actions</th>
        </tr>
    </thead>
    <tbody>
        <tr v-if="atomicData.length === 0">
            <td colspan="9" style="text-align: center; padding: 16px;">No data elements available</td>
        </tr>
        <tr v-for="item in atomicData" :key="item.atomic_id" :data-item-status="mapAtomicStatus(item.atomic_status)">
            <td><input type="checkbox" class="row-checkbox" :value="item.atomic_id" v-model="selectedItems"></td>
            <td>{{ item.atomic_id }}</td>
            <td>{{ item.atomic_metadata }}</td> <!-- Using atomic_metadata for Data Element Name -->
            <td class="data-value" :data-original-value="item.atomic_value">
              <template v-if="canEditAtomicElement(item)">
                <div v-if="editingAtomic === item.atomic_id" class="inline-edit-container">
                  <el-input-number
                    v-model="editingValue"
                    :precision="2"
                    size="small"
                    @keyup.enter="saveAtomicValue(item)"
                    @keyup.esc="cancelEdit"
                    style="width: 120px"
                    ref="editInput">
                  </el-input-number>
                  <div class="inline-edit-actions">
                    <el-button
                      type="success"
                      icon="el-icon-check"
                      size="mini"
                      @click="saveAtomicValue(item)"
                      :loading="savingAtomic === item.atomic_id"
                      circle>
                    </el-button>
                    <el-button
                      type="info"
                      icon="el-icon-close"
                      size="mini"
                      @click="cancelEdit"
                      circle>
                    </el-button>
                  </div>
                </div>
                <div v-else class="editable-value" @click="startEditAtomic(item)">
                  <span class="value-display">{{ item.atomic_value || 'Click to edit' }}</span>
                  <i class="el-icon-edit-outline edit-icon"></i>
                </div>
              </template>
              <template v-else>
                <span class="readonly-value">{{ item.atomic_value || 'N/A' }}</span>
              </template>
            </td>
            <td>
                <el-tag 
                    :type="getAtomicStatusType(item.atomic_status)"
                    size="small"
                    class="status-tag">
                    {{ mapAtomicStatus(item.atomic_status) }}
                </el-tag>
            </td>
            <td>{{ getProviderName(item) }}</td>
            <td class="evidence-cell">
              <div class="evidence-content">
                <!-- Atomic evidence for calculated KRIs -->
                <template v-if="isCalculatedKRI && canLinkAtomicEvidence(kriDetail, item)">
                  <el-select
                    :value="item.evidence_id || item.evidenceId || null"
                    @change="handleAtomicEvidenceChange(item, $event)"
                    placeholder="Select evidence"
                    size="mini"
                    style="width: 140px"
                    :disabled="!canEditAtomicElement(item)"
                    clearable>
                    <el-option
                      v-for="evidence in getAvailableEvidenceForAtomic(evidenceData, item.atomic_id, atomicData)"
                      :key="evidence.evidence_id"
                      :label="evidence.file_name"
                      :value="evidence.evidence_id">
                      <span style="float: left">{{ evidence.file_name }}</span>
                      <span style="float: right; color: #8492a6; font-size: 13px">
                        {{ formatEvidenceDate(evidence.uploaded_at) }}
                      </span>
                    </el-option>
                  </el-select>
                  <div v-if="item.evidenceFileName" class="evidence-filename" :title="item.evidenceFileName">
                    {{ item.evidenceFileName }}
                  </div>
                </template>
                
                <!-- KRI-level evidence for regular KRIs -->
                <template v-else>
                  <span class="evidence-info">{{ getEvidenceInfo(item) }}</span>
                  <el-button
                    v-if="canUploadEvidence"
                    type="text"
                    size="mini"
                    icon="el-icon-upload2"
                    @click="showUploadModal"
                    class="evidence-upload-btn"
                  >
                    Upload
                  </el-button>
                </template>
              </div>
            </td>
            <td>{{ getCommentInfo(item) }}</td>
            <td class="fixed-column">
              <div class="row-actions">
                <template v-if="canEditAtomicElement(item)">
                  <el-button
                    type="primary"
                    icon="el-icon-check"
                    size="mini"
                    @click="saveAtomicElement(item)"
                    :loading="savingAtomic === item.atomic_id"
                    :disabled="!hasAtomicValue(item)">
                    Save
                  </el-button>
                  <el-button
                    v-if="item.atomic_status === 30"
                    type="success"
                    icon="el-icon-upload"
                    size="mini"
                    @click="submitAtomicElement(item)"
                    :loading="savingAtomic === item.atomic_id">
                    Submit
                  </el-button>
                  <el-button
                    v-if="[10, 20].includes(item.atomic_status)"
                    type="success"
                    icon="el-icon-upload"
                    size="mini"
                    @click="saveAndSubmitAtomicElement(item)"
                    :loading="savingAtomic === item.atomic_id"
                    :disabled="!hasAtomicValue(item)">
                    Save & Submit
                  </el-button>
                </template>
                <template v-else-if="canApproveAtomicElement(item)">
                  <el-button
                    type="success"
                    icon="el-icon-check"
                    size="mini"
                    @click="approveAtomicElement(item)">
                    Approve
                  </el-button>
                  <el-button
                    type="danger"
                    icon="el-icon-close"
                    size="mini"
                    @click="rejectAtomicElement(item)">
                    Reject
                  </el-button>
                </template>
                <template v-else-if="canAcknowledgeAtomicElement(item)">
                  <el-button
                    type="primary"
                    icon="el-icon-check"
                    size="mini"
                    @click="acknowledgeAtomicElement(item)">
                    Acknowledge
                  </el-button>
                  <el-button
                    type="danger"
                    icon="el-icon-close"
                    size="mini"
                    @click="rejectAtomicElement(item)">
                    Reject
                  </el-button>
                </template>
                <span v-else class="no-actions-text">No actions available</span>
              </div>
            </td>
        </tr>
    </tbody>
    </table>
    </div>


    <!-- Atomic Input Dialog -->
    <atomic-input-dialog
      v-model="showBulkInputDialog"
      :atomic-data="atomicData"
      :kri-detail="kriDetail"
      :previous-data="previousAtomicData"
      @data-updated="handleBulkDataUpdate">
    </atomic-input-dialog>

    <!-- Evidence Upload Modal -->
    <evidence-upload-modal
      :visible.sync="uploadModalVisible"
      :kri-id="String(kriDetail.kri_id)"
      :reporting-date="kriDetail.reporting_date"
      :kri-item="kriDetail"
      @upload-success="handleUploadSuccess"
      @excel-parsed="handleExcelParsed"
      @status-updated="handleStatusUpdated"
      @evidence-selected="handleEvidenceSelected"
    />
  </div>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex';
import { kriService } from '@/services/kriService';
import { getUserDisplayName, isCalculatedKRI, getAtomicEvidenceStatus, getAvailableEvidenceForAtomic, canLinkAtomicEvidence } from '@/utils/helpers';
import { mapStatus } from '@/utils/types';
import { kriCalculationService } from '@/utils/kriCalculation';
import EvidenceUploadModal from '@/components/shared/EvidenceUploadModal.vue';
import AtomicInputDialog from '@/components/shared/AtomicInputDialog.vue';

export default {
  name: 'KRIDataElements',
  components: {
    EvidenceUploadModal,
    AtomicInputDialog
  },
  props: {
    atomicData: {
      type: Array,
      default: () => []
    },
    kriDetail: {
      type: Object,
      required: true
    },
    evidenceData: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      selectedItems: [],
      selectAll: false,
      editingAtomic: null,
      editingValue: null,
      savingAtomic: null,
      submittingAtomicData: false,
      // Missing data properties for template
      previousAtomicData: [],
      showBulkInputDialog: false,
      uploadModalVisible: false
    };
  },
  computed: {
    ...mapState('kri', ['currentUser']),
    ...mapGetters('kri', ['canPerform']),
    
    // Check if current KRI status allows case 1 operations
    isCase1Status() {
      return this.kriDetail && (this.kriDetail.kri_status === 10 || this.kriDetail.kri_status === 20);
    },
    
    // Bulk operation computed properties
    canSubmitAtomicData() {
      return this.isCase1Status && this.atomicData.some(item => 
        this.canEditAtomicElement(item) && this.hasAtomicValue(item)
      );
    },
    
    showApproveButton() {
      return this.atomicData.some(item => this.canApproveAtomicElement(item));
    },
    
    showRejectButton() {
      return this.atomicData.some(item => this.canApproveAtomicElement(item));
    },
    
    showAcknowledgeButton() {
      return this.atomicData.some(item => this.canAcknowledgeAtomicElement(item));
    },
    
    canApproveSelected() {
      return this.selectedItems.length > 0 && this.selectedItems.every(id => {
        const item = this.atomicData.find(a => a.atomic_id === id);
        return item && this.canApproveAtomicElement(item);
      });
    },
    
    canRejectSelected() {
      return this.selectedItems.length > 0;
    },
    
    canAcknowledgeSelected() {
      return this.selectedItems.length > 0 && this.selectedItems.every(id => {
        const item = this.atomicData.find(a => a.atomic_id === id);
        return item && this.canAcknowledgeAtomicElement(item);
      });
    },
    
    approvableCount() {
      return this.selectedItems.filter(id => {
        const item = this.atomicData.find(a => a.atomic_id === id);
        return item && this.canApproveAtomicElement(item);
      }).length;
    },
    
    acknowledgableCount() {
      return this.selectedItems.filter(id => {
        const item = this.atomicData.find(a => a.atomic_id === id);
        return item && this.canAcknowledgeAtomicElement(item);
      }).length;
    },
    
    canUploadEvidence() {
      return this.isCase1Status && this.canPerform(this.kriDetail.kri_id, null, 'edit');
    },
    
    // Calculated KRI detection
    isCalculatedKRI() {
      return this.kriDetail ? isCalculatedKRI(this.kriDetail) : false;
    },
    
    // Calculate formula with atomic values substitution
    calculateFormula() {
      if (!this.isCalculatedKRI || !this.kriDetail?.kri_formula || !this.atomicData?.length) {
        return 'No formula or atomic data available';
      }
      
      try {
        // Create substitution string showing formula with actual values
        let substitution = this.kriDetail.kri_formula;
        
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
      if (!this.isCalculatedKRI || !this.kriDetail?.kri_formula || !this.atomicData?.length) {
        return 'N/A';
      }
      
      try {
        const result = kriCalculationService.executeFormulaCalculation(
          this.kriDetail.kri_formula,
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
      
      const storedValue = parseFloat(this.kriDetail?.kri_value || 0);
      const calculatedValue = parseFloat(this.calculatedResult);
      
      // Consider values different if they differ by more than 0.01
      return Math.abs(storedValue - calculatedValue) > 0.01;
    }
  },
  methods: {
    ...mapActions('kri', ['refreshKRIDetail', 'linkAtomicEvidence', 'unlinkAtomicEvidence']),
    
    // Permission checking methods
    canEditAtomicElement(item) {
      return this.canPerform(this.kriDetail.kri_id, item.atomic_id, 'edit') && 
             [10, 20, 30].includes(item.atomic_status);
    },
    
    canApproveAtomicElement(item) {
      return this.canPerform(this.kriDetail.kri_id, item.atomic_id, 'review') && 
             item.atomic_status === 40;
    },
    
    canAcknowledgeAtomicElement(item) {
      return this.canPerform(this.kriDetail.kri_id, item.atomic_id, 'acknowledge') && 
             item.atomic_status === 50;
    },
    
    hasAtomicValue(item) {
      return item.atomic_value !== null && item.atomic_value !== undefined && item.atomic_value !== '';
    },
    
    // Selection handling
    handleSelectAllChange() {
      if (this.selectAll) {
        this.selectedItems = this.atomicData.map(item => item.atomic_id);
      } else {
        this.selectedItems = [];
      }
    },
    
    // Editing methods
    startEditAtomic(item) {
      this.editingAtomic = item.atomic_id;
      this.editingValue = item.atomic_value || 0;
      this.$nextTick(() => {
        const input = this.$refs.editInput;
        if (input && input.focus) {
          input.focus();
        }
      });
    },
    
    cancelEdit() {
      this.editingAtomic = null;
      this.editingValue = null;
    },
    
    async saveAtomicValue(item) {
      if (this.savingAtomic === item.atomic_id) return;
      
      this.savingAtomic = item.atomic_id;
      try {
        await kriService.updateatomickri(
          this.kriDetail.kri_id,
          item.atomic_id,
          this.kriDetail.reporting_date,
          { atomic_value: this.editingValue },
          getUserDisplayName(this.currentUser),
          'update_atomic_value',
          `Updated atomic value to ${this.editingValue}`
        );
        
        this.cancelEdit();
        this.$message.success('Atomic value updated successfully');
        this.$emit('data-updated');
        
        // Check for auto-recalculation after atomic value update
        this.$nextTick(() => {
          this.checkForAutoRecalculation();
        });
      } catch (error) {
        console.error('Error updating atomic value:', error);
        this.$message.error('Failed to update atomic value');
      } finally {
        this.savingAtomic = null;
      }
    },
    
    // Case 1 status transition methods
    async saveAtomicElement(item) {
      if (this.savingAtomic === item.atomic_id) return;
      
      this.savingAtomic = item.atomic_id;
      try {
        // For case 1: transition status 10/20 → 30 (Saved)
        const updateData = {};
        if (this.isCase1Status) {
          updateData.atomic_status = 30; // Status 30: "Saved"
        }
        
        await kriService.updateatomickri(
          this.kriDetail.kri_id,
          item.atomic_id,
          this.kriDetail.reporting_date,
          updateData,
          getUserDisplayName(this.currentUser),
          'save_atomic_element',
          'Atomic element saved'
        );
        
        this.$message.success('Atomic element saved successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error saving atomic element:', error);
        this.$message.error('Failed to save atomic element');
      } finally {
        this.savingAtomic = null;
      }
    },
    
    async submitAtomicElement(item) {
      if (this.savingAtomic === item.atomic_id) return;
      
      this.savingAtomic = item.atomic_id;
      try {
        // Determine next status based on KRI owner/data provider logic
        const nextStatus = this.getNextSubmitStatus();
        
        await kriService.updateatomickri(
          this.kriDetail.kri_id,
          item.atomic_id,
          this.kriDetail.reporting_date,
          { atomic_status: nextStatus },
          getUserDisplayName(this.currentUser),
          'submit_atomic_element',
          `Atomic element submitted for ${nextStatus === 40 ? 'data provider' : 'KRI owner'} approval`
        );
        
        this.$message.success('Atomic element submitted successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error submitting atomic element:', error);
        this.$message.error('Failed to submit atomic element');
      } finally {
        this.savingAtomic = null;
      }
    },
    
    async saveAndSubmitAtomicElement(item) {
      if (this.savingAtomic === item.atomic_id) return;
      
      this.savingAtomic = item.atomic_id;
      try {
        // For case 1: direct transition from 10/20 to submit status
        const nextStatus = this.getNextSubmitStatus();
        
        await kriService.updateatomickri(
          this.kriDetail.kri_id,
          item.atomic_id,
          this.kriDetail.reporting_date,
          { atomic_status: nextStatus },
          getUserDisplayName(this.currentUser),
          'save_and_submit_atomic',
          `Atomic element saved and submitted for ${nextStatus === 40 ? 'data provider' : 'KRI owner'} approval`
        );
        
        this.$message.success('Atomic element saved and submitted successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error saving and submitting atomic element:', error);
        this.$message.error('Failed to save and submit atomic element');
      } finally {
        this.savingAtomic = null;
      }
    },
    
    // Approval workflow methods
    async approveAtomicElement(item) {
      await this.updateAtomicStatus(item, 50, 'approve_atomic', 'Atomic element approved');
    },
    
    async rejectAtomicElement(item) {
      await this.updateAtomicStatus(item, 20, 'reject_atomic', 'Atomic element rejected');
    },
    
    async acknowledgeAtomicElement(item) {
      await this.updateAtomicStatus(item, 60, 'acknowledge_atomic', 'Atomic element acknowledged');
    },
    
    async updateAtomicStatus(item, newStatus, action, message) {
      try {
        await kriService.updateatomickri(
          this.kriDetail.kri_id,
          item.atomic_id,
          this.kriDetail.reporting_date,
          { atomic_status: newStatus },
          getUserDisplayName(this.currentUser),
          action,
          message
        );
        
        this.$message.success(message);
        this.$emit('data-updated');
        
        // Check for auto-recalculation after status update
        this.$nextTick(() => {
          this.checkForAutoRecalculation();
        });
      } catch (error) {
        console.error(`Error updating atomic status:`, error);
        this.$message.error(`Failed to ${action.replace('_', ' ')}`);
      }
    },
    
    // Bulk operations
    async handleSubmitAtomicData() {
      this.submittingAtomicData = true;
      try {
        const nextStatus = this.getNextSubmitStatus();
        const promises = this.atomicData
          .filter(item => this.canEditAtomicElement(item) && this.hasAtomicValue(item))
          .map(item => kriService.updateatomickri(
            this.kriDetail.kri_id,
            item.atomic_id,
            this.kriDetail.reporting_date,
            { atomic_status: nextStatus },
            getUserDisplayName(this.currentUser),
            'bulk_submit_atomic',
            'Bulk atomic data submission'
          ));
        
        await Promise.all(promises);
        this.$message.success('All atomic data submitted successfully');
        this.$emit('data-updated');
      } catch (error) {
        console.error('Error submitting atomic data:', error);
        this.$message.error('Failed to submit atomic data');
      } finally {
        this.submittingAtomicData = false;
      }
    },
    
    async approveSelectedRows() {
      await this.bulkUpdateSelected(50, 'bulk_approve_atomic', 'Selected atomic elements approved');
    },
    
    async rejectSelectedRows() {
      await this.bulkUpdateSelected(20, 'bulk_reject_atomic', 'Selected atomic elements rejected');
    },
    
    async acknowledgeSelectedRows() {
      await this.bulkUpdateSelected(60, 'bulk_acknowledge_atomic', 'Selected atomic elements acknowledged');
    },
    
    async bulkUpdateSelected(newStatus, action, successMessage) {
      try {
        const promises = this.selectedItems.map(atomicId => 
          kriService.updateatomickri(
            this.kriDetail.kri_id,
            atomicId,
            this.kriDetail.reporting_date,
            { atomic_status: newStatus },
            getUserDisplayName(this.currentUser),
            action,
            successMessage
          )
        );
        
        await Promise.all(promises);
        this.$message.success(successMessage);
        this.selectedItems = [];
        this.selectAll = false;
        this.$emit('data-updated');
      } catch (error) {
        console.error('Bulk update error:', error);
        this.$message.error('Bulk operation failed');
      }
    },
    
    // Utility methods
    getNextSubmitStatus() {
      // Case 1 logic: IF KRI_OWNER == DATA_PROVIDER -> 50, ELSE -> 40
      return (this.kriDetail.kri_owner === this.kriDetail.data_provider) ? 50 : 40;
    },
    
    mapAtomicStatus(status) {
      return mapStatus(status);
    },
    
    getAtomicStatusType(status) {
      const typeMap = {
        10: 'info',     // Pending Input
        20: 'warning',  // Under Rework
        30: 'primary',  // Saved
        40: 'warning',  // Submitted to Data Provider
        50: 'warning',  // Submitted to KRI Owner
        60: 'success'   // Finalized
      };
      return typeMap[status] || 'info';
    },
    
    getProviderName(_item) {
      return this.kriDetail.data_provider || 'N/A';
    },
    
    getEvidenceInfo(item) {
      // For calculated KRIs, show atomic-level evidence
      if (this.isCalculatedKRI && canLinkAtomicEvidence(this.kriDetail, item)) {
        return getAtomicEvidenceStatus(item, this.evidenceData);
      }
      
      // For regular KRIs, show KRI-level evidence count
      const evidence = this.evidenceData.filter(e => 
        e.kri_id === this.kriDetail.kri_id && 
        e.reporting_date === this.kriDetail.reporting_date
      );
      return evidence.length > 0 ? `${evidence.length} file(s)` : 'No evidence';
    },
    
    getCommentInfo(_item) {
      // This would come from audit trail data if available
      return 'No comments';
    },

    // Atomic evidence methods
    async handleAtomicEvidenceChange(item, evidenceId) {
      try {
        if (evidenceId) {
          // Link evidence to atomic
          await this.linkAtomicEvidence({
            kriId: this.kriDetail.kri_id,
            atomicId: item.atomic_id,
            reportingDate: this.kriDetail.reporting_date,
            evidenceId: evidenceId,
            comment: `Evidence linked to atomic element ${item.atomic_id}`
          });
          this.$message.success('Evidence linked to atomic element');
        } else {
          // Unlink evidence from atomic
          await this.unlinkAtomicEvidence({
            kriId: this.kriDetail.kri_id,
            atomicId: item.atomic_id,
            reportingDate: this.kriDetail.reporting_date,
            comment: `Evidence unlinked from atomic element ${item.atomic_id}`
          });
          this.$message.success('Evidence unlinked from atomic element');
        }
      } catch (error) {
        console.error('Error updating atomic evidence:', error);
        this.$message.error('Failed to update atomic evidence');
      }
    },

    formatEvidenceDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString();
    },

    // Helper methods for template usage
    getAvailableEvidenceForAtomic,
    canLinkAtomicEvidence,
    
    showUploadModal() {
      this.uploadModalVisible = true;
    },
    
    // Missing methods for template event handlers
    handleBulkDataUpdate(updateData) {
      // Handle bulk atomic data updates from AtomicInputDialog
      console.log('Bulk data update:', updateData);
      // Close the dialog
      this.showBulkInputDialog = false;
      // Emit data-updated event to parent
      this.$emit('data-updated');
      // Show success message
      this.$message.success('Bulk atomic data updated successfully');
    },
    
    handleUploadSuccess(uploadData) {
      // Handle evidence upload completion from EvidenceUploadModal
      console.log('Upload success:', uploadData);
      // Close the modal
      this.uploadModalVisible = false;
      // Emit evidence-uploaded event to parent  
      this.$emit('evidence-uploaded');
      // Refresh data
      this.refreshKRIDetail();
    },
    
    handleExcelParsed(parseData) {
      // Handle Excel auto-parse results from EvidenceUploadModal
      console.log('Excel parsed:', parseData);
      // Emit to parent for potential KRI value updates
      this.$emit('excel-parsed', parseData);
    },
    
    handleStatusUpdated(statusData) {
      // Handle status updates from evidence upload
      console.log('Status updated:', statusData);
      // Emit to parent for status change handling
      this.$emit('status-updated', statusData);
      // Refresh data to reflect changes
      this.refreshKRIDetail();
    },
    
    handleEvidenceSelected(evidenceId) {
      // Handle evidence selection from upload modal
      console.log('Evidence selected:', evidenceId);
      // Emit to parent 
      this.$emit('evidence-selected', evidenceId);
      // Refresh data to show selection
      this.refreshKRIDetail();
    },
    
    // Scroll to specific atomic element row in the table
    scrollToAtomicRow(atomicId) {
      this.$nextTick(() => {
        // Find the table row for this atomic element
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
          atomicRow.classList.add('highlight-atomic-row');
          setTimeout(() => {
            atomicRow.classList.remove('highlight-atomic-row');
          }, 2000);
        } else {
          // Fallback: scroll to the table
          const table = document.getElementById('dataElementsTable');
          if (table) {
            table.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }
      });
    },
    
    // Check if all atomic elements are finalized and trigger auto-recalculation
    async checkForAutoRecalculation() {
      if (!this.isCalculatedKRI || !this.atomicData?.length) return;
      
      // Check if all atomic elements are finalized (status 60)
      const allAtomicsFinalized = this.atomicData.every(atomic => atomic.atomic_status === 60);
      
      if (allAtomicsFinalized && this.isDynamicResult) {
        // All atomics are finalized and calculation differs from stored value
        try {
          const newKriValue = parseFloat(this.calculatedResult);
          
          // Update KRI with calculated value via service
          await kriService.updateKRI(
            this.kriDetail.kri_id,
            this.kriDetail.reporting_date,
            { 
              kri_value: newKriValue.toString(),
              kri_status: 30 // Set to "Saved" status after auto-calculation
            },
            getUserDisplayName(this.currentUser),
            'auto_recalculate_kri',
            `Auto-recalculated KRI value from atomic elements: ${this.calculatedResult}`
          );
          
          this.$message.success(
            `KRI auto-recalculated: ${this.calculatedResult}`,
            { duration: 5000 }
          );
          
          // Emit to parent for refresh
          this.$emit('data-updated');
          
        } catch (error) {
          console.error('Auto-recalculation failed:', error);
          this.$message.error('Failed to auto-recalculate KRI value');
        }
      }
    }
  }
};
</script>

<style scoped>
.data-elements {
  padding: 0.5rem 0;
}

/* Actions Toolbar and Buttons */
.actions-toolbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 16px;
    padding: 12px 0;
}

.left-title {
  margin-bottom: 16px;
}

.left-title h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
}

@media (max-width: 768px) {
  .left-title h4 {
    font-size: 16px;
  }
  
  .actions-toolbar {
    justify-content: center;
    padding: 8px 0;
  }
}

.actions-toolbar .right-actions {
    display: flex;
    gap: 12px;
    margin-left: auto;
}

.btn {
    padding: 10px 16px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    border-radius: 6px;
    transition: all 0.2s ease;
    text-align: center;
}
.btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.btn-success {
    background-color: #28a745;
    color: white;
}
.btn-success:hover:not(:disabled) {
    background-color: #218838;
}

.btn-danger {
    background-color: #dc3545;
    color: white;
}
.btn-danger:hover:not(:disabled) {
    background-color: #c82333;
}

/* Table Container with Horizontal Scroll */
.table-container {
  overflow-x: auto;
  overflow-y: visible;
  width: 100%;
  max-width: 100%; /* Constrain to parent width */
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 24px;
  background: white;
  contain: layout style;
  scrollbar-gutter: stable;
  position: relative;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Fixed Actions Column */
.data-table th.fixed-column,
.data-table td.fixed-column {
  position: sticky;
  right: 0;
  background: #f8f9fa; /* Header background */
  z-index: 10;
  border-left: 2px solid #e2e8f0;
  box-shadow: -4px 0 8px rgba(0, 0, 0, 0.08);
  min-width: 240px;
  width: 240px;
  max-width: 240px;
}

.data-table td.fixed-column {
  background: white; /* Body background */
  vertical-align: middle;
}

/* Enhanced styling for fixed column */
.data-table th.fixed-column {
  background: #f1f5f9; /* Slightly different header background */
  position: sticky;
  z-index: 11;
}

/* Add hover effect for fixed column */
.data-table tbody tr:hover td.fixed-column {
  background: #f8fafc;
}

/* Ensure fixed column content doesn't overflow */
.data-table th.fixed-column,
.data-table td.fixed-column {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Prevent content shift when scrollbar appears */
.table-container::-webkit-scrollbar {
  height: 12px;
}

.table-container::-webkit-scrollbar-track {
  background-color: #f1f3f4;
  border-radius: 6px;
}

.table-container::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 6px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

/* Data Table Styles */
.data-table {
    width: auto; /* Let table size naturally */
    border-collapse: collapse;
    border-spacing: 0;
    table-layout: auto; /* Auto layout for natural column sizing */
    position: relative;
    transform: translateZ(0); /* Create new stacking context */
    min-width: 800px; /* Ensure table has minimum width for proper layout */
}

.data-table th {
    background: #f8f9fa;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: #718096;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #e2e8f0;
    white-space: nowrap;
}

.data-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 13px;
    vertical-align: middle;
    color: #4a5568;
}
.data-table tbody tr:not([data-no-data]):last-child td { /* Ensure this works, might need more specific selector if no-data row is complex */
    border-bottom: none;
}
.data-table tbody tr td[colspan="8"] { /* Specifically for the no-data row based on template */
    text-align: center;
    color: #718096;
    padding: 20px; /* Overrides the 16px inline style for consistency if needed */
    font-style: italic;
}
.data-table input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    transform: scale(1.2);
    margin: 4px;
}

/* Improve touch targets on mobile */
@media (max-width: 768px) {
  .data-table input[type="checkbox"] {
    width: 20px;
    height: 20px;
    transform: scale(1.4);
    margin: 6px;
  }
  
  .data-table th,
  .data-table td {
    padding: 16px 12px;
    font-size: 14px;
  }
  
  .data-table th {
    font-size: 13px;
  }
}

/* Tablet optimizations */
@media (min-width: 769px) and (max-width: 1024px) {
  .data-table th,
  .data-table td {
    padding: 14px 14px;
  }
  
  .data-table th.fixed-column,
  .data-table td.fixed-column {
    min-width: 220px;
    width: 220px;
    max-width: 220px;
  }
}

/* Status Badges Styles */
/* Status badge styles - using Element UI classes */

/* Icon Styles (Placeholders) */
.icon {
    font-size: 18px;
    cursor: default;
    color: #718096;
}
/* .upload-icon, .comment-icon { } */

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

/* Responsive code blocks */
@media (max-width: 768px) {
  .formula-code, .calculation-code {
    font-size: 12px;
    padding: 10px 12px;
    white-space: pre-wrap;
    word-break: break-word;
  }
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

/* Responsive atomic cards grid */
@media (max-width: 768px) {
  .atomic-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-top: 12px;
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

/* Mobile atomic card optimizations */
@media (max-width: 768px) {
  .atomic-card {
    padding: 16px;
    min-height: 100px;
  }
  
  .atomic-card:hover {
    transform: none; /* Disable hover transform on mobile */
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  }
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

/* Row Actions Styling */
.row-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    padding: 6px;
    width: 100%;
    min-height: 44px;
}

.row-actions .el-button {
    padding: 6px 10px;
    font-size: 11px;
    border-radius: 4px;
    flex: 0 1 auto;
    min-width: 0;
    white-space: nowrap;
    margin: 0;
    line-height: 1.2;
    min-height: 28px;
}

.row-actions .el-button + .el-button {
    margin-left: 0;
}

/* Ensure buttons wrap properly in narrow spaces */
@media (max-width: 1200px) {
  .row-actions {
    flex-direction: column;
    gap: 4px;
    padding: 4px;
  }
  
  .row-actions .el-button {
    width: 100%;
    max-width: 100px;
    padding: 4px 6px;
    font-size: 10px;
  }
}

.no-actions-text {
    color: #909399;
    font-size: 11px;
    font-style: italic;
}

/* Enhanced inline editing styles */
.editable-value {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 100px;
    min-height: 32px;
    border: 1px solid transparent;
    background-color: rgba(0, 0, 0, 0.02);
}

.editable-value:hover {
    background-color: #f0f9ff;
    border: 1px solid #409eff;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(64, 158, 255, 0.1);
}

.value-display {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.edit-icon {
    opacity: 0;
    transition: all 0.2s ease;
    color: #409eff;
    font-size: 14px;
    margin-left: 6px;
    flex-shrink: 0;
}

.editable-value:hover .edit-icon {
    opacity: 1;
    transform: scale(1.1);
}

.readonly-value {
    color: #606266;
    padding: 6px 10px;
    min-height: 32px;
    display: flex;
    align-items: center;
}

.inline-edit-container {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 40px;
}

.inline-edit-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

/* Improve input styling within inline edit */
.inline-edit-container .el-input-number {
    flex: 1;
    min-width: 80px;
}

.inline-edit-container .el-input-number .el-input__inner {
    padding: 6px 8px;
    height: 32px;
    font-size: 13px;
}

/* Mobile optimizations for inline editing */
@media (max-width: 768px) {
  .editable-value {
    padding: 8px 12px;
    min-height: 36px;
  }
  
  .edit-icon {
    font-size: 16px;
    opacity: 0.6; /* Make more visible on touch devices */
  }
  
  .inline-edit-container {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  
  .inline-edit-actions {
    justify-content: center;
  }
}

/* Dynamic calculation styling - enhanced */
.result-highlight {
    background-color: #fef3c7;
    color: #92400e;
    border: 1px solid #fbbf24;
    animation: highlightPulse 3s ease-in-out;
}

@keyframes highlightPulse {
    0%, 100% { 
        background-color: #fef3c7; 
        transform: scale(1);
    }
    50% { 
        background-color: #fbbf24; 
        transform: scale(1.02);
    }
}

/* Evidence Cell Styling */
.evidence-cell {
  padding: 8px 12px;
}

.evidence-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  min-height: 32px;
}

.evidence-info {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.evidence-upload-btn {
  padding: 2px 6px;
  font-size: 11px;
  height: 22px;
  margin: 0;
}

.evidence-upload-btn:hover {
  color: #409eff;
  background-color: #ecf5ff;
}

/* Highlight Effect for Atomic Table Rows */
@keyframes highlightAtomicRow {
  0% { background-color: #fef3c7; }
  100% { background-color: transparent; }
}

.highlight-atomic-row {
  animation: highlightAtomicRow 2s ease-in-out;
  border: 2px solid #f6ad55 !important;
}

.highlight-atomic-row td {
  background-color: #fef5e7 !important;
}

/* Evidence cell styling */
.evidence-cell {
  min-width: 160px;
  max-width: 180px;
}

.evidence-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.evidence-filename {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.evidence-upload-btn {
  align-self: flex-start;
  padding: 0;
  margin-top: 2px;
}

/* Atomic evidence select styling */
.evidence-cell .el-select {
  width: 100%;
}

.evidence-cell .el-select .el-input {
  font-size: 12px;
}

.evidence-cell .el-select .el-input__inner {
  padding-left: 8px;
  padding-right: 24px;
}

</style>