<template>
  <div class="data-elements">
    <div class="actions-toolbar">
        <div class="left-title">
            <h4>Data Elements</h4>
        </div>
        <div class="right-actions">
            <el-button
              type="primary"
              icon="el-icon-edit"
              @click="openBulkInputDialog"
              size="small">
              Bulk Input
            </el-button>
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
                <th>Actions</th>
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
                <td>{{ getEvidenceInfo(item) }}</td>
                <td>{{ getCommentInfo(item) }}</td>
                <td>
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

    <!-- Calculation Details Section -->
    <div class="formula-result-section">
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
            <code class="calculation-code">{{ calculateFormula() }}</code>
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
              <div v-for="item in atomicData" :key="item.atomic_id" class="atomic-card">
                <div class="atomic-header">
                  <span class="atomic-id">{{ item.atomic_id }}</span>
                  <el-tag :type="getAtomicStatusType(item.atomic_status)" size="mini">
                    {{ mapAtomicStatus(item.atomic_status) }}
                  </el-tag>
                </div>
                <div class="atomic-name">{{ item.atomic_metadata || `Element ${item.atomic_id}` }}</div>
                <div class="atomic-value-display">{{ item.atomic_value || 'N/A' }}</div>
              </div>
            </div>
          </div>
        </div>
    </div>

    <!-- Atomic Input Dialog -->
    <atomic-input-dialog
      v-model="showBulkInputDialog"
      :atomic-data="atomicData"
      :kri-detail="kriDetail"
      :previous-data="previousAtomicData"
      @data-updated="handleBulkDataUpdate">
    </atomic-input-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { mapStatus, getStatusTagType, canPerformAction } from '@/utils/helpers';
import AtomicInputDialog from './AtomicInputDialog.vue';

export default {
  name: 'KRIDataElements',
  components: {
    AtomicInputDialog
  },
  props: {
    atomicData: {
      type: Array,
      required: true
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
      selectAll: false,
      selectedItems: [], // To store atomic_ids of selected items
      editingAtomic: null, // Currently editing atomic element ID
      editingValue: null, // Current editing value
      savingAtomic: null, // ID of atomic element being saved
      showBulkInputDialog: false,
      previousAtomicData: [], // Previous period data for comparison
      submittingAtomicData: false // Loading state for submitting atomic data
    };
  },
  computed: {
    ...mapState('kri', ['currentUser']),
    
    // Calculate if result is dynamic (different from stored KRI value)
    isDynamicResult() {
      const storedValue = parseFloat(this.kriDetail.kri_value) || 0;
      const calculatedValue = parseFloat(this.calculatedResult) || 0;
      return Math.abs(storedValue - calculatedValue) > 0.01; // Allow for small floating point differences
    },
    
    // Calculate the result based on atomic values
    calculatedResult() {
      if (this.atomicData.length === 0) {
        return this.kriDetail.kri_value || 'N/A';
      }
      
      try {
        // Simple calculation based on common formula patterns
        const values = this.atomicData.map(item => parseFloat(item.atomic_value) || 0);
        
        if (values.length === 0) {
          return 'No valid values';
        }
        
        // Try to parse the formula and calculate
        const formula = this.kriDetail.kri_formula;
        if (formula && formula.includes('/')) {
          // Simple division case: (A - B) / C
          if (values.length >= 3) {
            const result = (values[0] - values[1]) / values[2];
            return isNaN(result) ? 'Invalid calculation' : result.toFixed(4);
          }
        } else if (formula && formula.includes('+')) {
          // Simple sum
          const result = values.reduce((sum, val) => sum + val, 0);
          return result.toFixed(4);
        } else if (formula && formula.includes('-')) {
          // Simple subtraction
          const result = values.reduce((diff, val, index) => index === 0 ? val : diff - val, 0);
          return result.toFixed(4);
        }
        
        // Default: return sum
        const result = values.reduce((sum, val) => sum + val, 0);
        return result.toFixed(4);
      } catch (error) {
        console.error('Calculation error:', error);
        return 'Calculation error';
      }
    },

    // Smart button visibility and state
    showApproveButton() {
      // Show if user has review permissions and there are items in status 40 (Data Provider review)
      const userPermissions = this.currentUser.permissions;
      const key = `${this.kriDetail.kri_id}_${this.kriDetail.reporting_date}`;
      const hasReviewPermission = userPermissions[key]?.includes('review') || 
                                  this.atomicData.some(item => userPermissions[key]?.includes(`atomic${item.atomic_id}_review`));
      return hasReviewPermission && this.approvableCount > 0;
    },

    showAcknowledgeButton() {
      // Show if user has acknowledge permissions and there are items in status 50 (KRI Owner review)
      const userPermissions = this.currentUser.permissions;
      const key = `${this.kriDetail.kri_id}_${this.kriDetail.reporting_date}`;
      const hasAcknowledgePermission = userPermissions[key]?.includes('acknowledge') || 
                                       this.atomicData.some(item => userPermissions[key]?.includes(`atomic${item.atomic_id}_acknowledge`));
      return hasAcknowledgePermission && this.acknowledgableCount > 0;
    },

    showRejectButton() {
      // Show if user can reject items (either from review or acknowledge status)
      const userPermissions = this.currentUser.permissions;
      const key = `${this.kriDetail.kri_id}_${this.kriDetail.reporting_date}`;
      const hasReviewPermission = userPermissions[key]?.includes('review') || 
                                  this.atomicData.some(item => userPermissions[key]?.includes(`atomic${item.atomic_id}_review`));
      const hasAcknowledgePermission = userPermissions[key]?.includes('acknowledge') || 
                                       this.atomicData.some(item => userPermissions[key]?.includes(`atomic${item.atomic_id}_acknowledge`));
      return (hasReviewPermission || hasAcknowledgePermission) && this.rejectableCount > 0;
    },

    approvableCount() {
      // Count items in status 40 (Submitted to Data Provider Approver) - these can be approved to move to status 50
      return this.atomicData.filter(item => item.atomic_status === 40).length;
    },

    acknowledgableCount() {
      // Count items in status 50 (Submitted to KRI Owner Approver) - these can be acknowledged to move to status 60
      return this.atomicData.filter(item => item.atomic_status === 50).length;
    },

    rejectableCount() {
      // Count items that can be rejected (in review or acknowledge status) - these can be rejected to status 20
      return this.atomicData.filter(item => [40, 50].includes(item.atomic_status)).length;
    },

    canApproveSelected() {
      // Can approve if there are selected items in status 40 (Data Provider review)
      return this.selectedItems.length > 0 && 
             this.selectedItems.some(atomicId => {
               const item = this.atomicData.find(a => a.atomic_id === atomicId);
               return item && item.atomic_status === 40;
             });
    },

    canAcknowledgeSelected() {
      // Can acknowledge if there are selected items that are acknowledgable
      return this.selectedItems.length > 0 && 
             this.selectedItems.some(atomicId => {
               const item = this.atomicData.find(a => a.atomic_id === atomicId);
               return item && item.atomic_status === 50;
             });
    },

    canRejectSelected() {
      // Can reject if there are selected items that are rejectable
      return this.selectedItems.length > 0 && 
             this.selectedItems.some(atomicId => {
               const item = this.atomicData.find(a => a.atomic_id === atomicId);
               return item && [40, 50].includes(item.atomic_status);
             });
    },

    canSubmitAtomicData() {
      // Check if user has edit permissions and there are editable atomic elements
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriDetail.kri_id,
        reportingDate: this.kriDetail.reporting_date
      };
      
      // Can submit if user has edit permission and there are atomic elements in editable status (10, 20, 30)
      const hasEditPermission = canPerformAction(userPermissions, 'edit', this.kriDetail.kri_status, kriItem);
      const hasEditableElements = this.atomicData.some(item => [10, 20, 30].includes(item.atomic_status));
      
      return hasEditPermission && hasEditableElements && this.atomicData.length > 0;
    }
  },
  methods: {
    // Use centralized unified status functions
    mapAtomicStatus: mapStatus,
    
    getAtomicStatusType: getStatusTagType,

    handleSelectAllChange() {
      if (this.selectAll) {
        this.selectedItems = this.atomicData.map(item => item.atomic_id);
      } else {
        this.selectedItems = [];
      }
    },

    async approveSelectedRows() {
      if (this.selectedItems.length === 0) {
        this.$message.warning('No items selected to approve.');
        return;
      }
      
      this.$confirm(`Are you sure you want to approve ${this.selectedItems.length} selected atomic data element(s)?`, 'Confirm Approval', {
        confirmButtonText: 'Approve',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(async () => {
        try {
          const result = await this.$store.dispatch('kri/approveAtomicElements', {
            kriId: this.kriDetail.kri_id,
            reportingDate: this.kriDetail.reporting_date,
            atomicIds: this.selectedItems
          });
          
          if (result.success) {
            this.$message.success(`${this.selectedItems.length} atomic element(s) approved successfully`);
            this.selectedItems = [];
            this.selectAll = false;
            this.$emit('data-updated');
          } else {
            this.$message.error(result.error || 'Failed to approve atomic elements');
          }
        } catch (error) {
          console.error('Error approving atomic elements:', error);
          this.$message.error('Failed to approve atomic elements');
        }
      }).catch(() => {
        // User cancelled
      });
    },

    async rejectSelectedRows() {
      if (this.selectedItems.length === 0) {
        this.$message.warning('No items selected to reject.');
        return;
      }
      
      try {
        const reasonPrompt = await this.$prompt('Please provide a reason for rejection:', 'Reject Atomic Elements', {
          confirmButtonText: 'Reject',
          cancelButtonText: 'Cancel',
          inputValidator: (value) => {
            if (!value || value.trim().length < 3) {
              return 'Reason must be at least 3 characters long';
            }
            return true;
          }
        });
        
        const result = await this.$store.dispatch('kri/rejectAtomicElements', {
          kriId: this.kriDetail.kri_id,
          reportingDate: this.kriDetail.reporting_date,
          atomicIds: this.selectedItems,
          reason: reasonPrompt.value
        });
        
        if (result.success) {
          this.$message.success(`${this.selectedItems.length} atomic element(s) rejected successfully`);
          this.selectedItems = [];
          this.selectAll = false;
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to reject atomic elements');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error rejecting atomic elements:', error);
          this.$message.error('Failed to reject atomic elements');
        }
      }
    },

    async acknowledgeSelectedRows() {
      if (this.selectedItems.length === 0) {
        this.$message.warning('No items selected to acknowledge.');
        return;
      }
      
      this.$confirm(`Are you sure you want to acknowledge ${this.selectedItems.length} selected atomic data element(s)?`, 'Confirm Acknowledgment', {
        confirmButtonText: 'Acknowledge',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(async () => {
        try {
          const result = await this.$store.dispatch('kri/acknowledgeAtomicElements', {
            kriId: this.kriDetail.kri_id,
            reportingDate: this.kriDetail.reporting_date,
            atomicIds: this.selectedItems
          });
          
          if (result.success) {
            this.$message.success(`${this.selectedItems.length} atomic element(s) acknowledged successfully`);
            this.selectedItems = [];
            this.selectAll = false;
            this.$emit('data-updated');
          } else {
            this.$message.error(result.error || 'Failed to acknowledge atomic elements');
          }
        } catch (error) {
          console.error('Error acknowledging atomic elements:', error);
          this.$message.error('Failed to acknowledge atomic elements');
        }
      }).catch(() => {
        // User cancelled
      });
    },

    getProviderName(_item) {
      // Provider information comes from the main KRI detail
      return this.kriDetail.data_provider || 'Not specified';
    },

    getEvidenceInfo(_item) {
      // Evidence count from service data
      const evidenceCount = this.evidenceData.length;
      return evidenceCount > 0 ? `${evidenceCount} file(s)` : 'No evidence';
    },

    getCommentInfo(item) {
      // Comments from atomic metadata or audit trail
      return item.comment || item.atomic_metadata || 'No comment';
    },

    // Calculate formula with actual values substituted
    calculateFormula() {
      if (this.atomicData.length === 0 || !this.kriDetail.kri_formula) {
        return 'No formula or data available';
      }
      
      try {
        let formula = this.kriDetail.kri_formula;
        
        // Enhanced substitution for better display
        // Replace atomic variable patterns (atomic1, atomic2, etc.) with actual values
        this.atomicData.forEach((item) => {
          const atomicVariable = `atomic${item.atomic_id}`;
          const value = item.atomic_value;
          let displayValue;
          
          if (!value || value === 'N/A' || value === '') {
            // Show metadata or atomic ID if value is blank
            const metadata = item.atomic_metadata ? `{${item.atomic_metadata}}` : `{atomic${item.atomic_id}}`;
            displayValue = `${metadata} = (left blank)`;
          } else {
            displayValue = parseFloat(value) || 0;
          }
          
          // Replace both case variations
          const atomicPattern = new RegExp(`\\b${atomicVariable}\\b`, 'gi');
          formula = formula.replace(atomicPattern, displayValue.toString());
        });
        
        // Legacy support for A, B, C pattern
        const variables = ['A', 'B', 'C', 'D', 'E', 'F'];
        variables.forEach((variable, index) => {
          if (index < this.atomicData.length) {
            const item = this.atomicData[index];
            const value = item.atomic_value;
            let displayValue;
            
            if (!value || value === 'N/A' || value === '') {
              const metadata = item.atomic_metadata ? `{${item.atomic_metadata}}` : `{atomic${item.atomic_id}}`;
              displayValue = `${metadata} = (left blank)`;
            } else {
              displayValue = parseFloat(value) || 0;
            }
            
            const variablePattern = new RegExp(`\\b${variable}\\b`, 'g');
            formula = formula.replace(variablePattern, displayValue.toString());
          }
        });
        
        return formula;
      } catch (error) {
        console.error('Formula substitution error:', error);
        return 'Formula substitution error';
      }
    },

    // Permission checking methods
    canEditAtomicElement(item) {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriDetail.kri_id,
        reportingDate: this.kriDetail.reporting_date
      };
      
      // Can edit in statuses 10, 20, 30 with proper permissions
      const canEdit = [10, 20, 30].includes(item.atomic_status);
      const hasPermission = canPerformAction(userPermissions, 'edit', item.atomic_status, kriItem, item.atomic_id);
      
      return canEdit && hasPermission;
    },

    canApproveAtomicElement(item) {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriDetail.kri_id,
        reportingDate: this.kriDetail.reporting_date
      };
      
      // Can only approve items in status 40 (Submitted to Data Provider Approver)
      const canApprove = item.atomic_status === 40;
      
      // For atomic-level review permissions, check if user has the specific atomic review permission
      const atomicPermission = `atomic${item.atomic_id}_review`;
      const key = `${kriItem.id}_${kriItem.reportingDate}`;
      const hasAtomicPermission = userPermissions[key]?.includes(atomicPermission) || false;
      
      // Also check for general review permission as fallback
      const hasGeneralReview = userPermissions[key]?.includes('review') || false;
      
      console.log(`canApproveAtomicElement for atomic ${item.atomic_id}:`, {
        canApprove,
        atomicStatus: item.atomic_status,
        atomicPermission,
        key,
        hasAtomicPermission,
        hasGeneralReview,
        result: canApprove && (hasAtomicPermission || hasGeneralReview)
      });
      
      return canApprove && (hasAtomicPermission || hasGeneralReview);
    },

    canAcknowledgeAtomicElement(item) {
      const userPermissions = this.currentUser.permissions;
      const kriItem = {
        id: this.kriDetail.kri_id,
        reportingDate: this.kriDetail.reporting_date
      };
      
      // Can acknowledge if in submitted to KRI Owner status and has permission
      const canAcknowledge = item.atomic_status === 50; // Submitted to KRI Owner Approver
      
      // For atomic-level acknowledge permissions, check if user has the specific atomic acknowledge permission
      const atomicPermission = `atomic${item.atomic_id}_acknowledge`;
      const key = `${kriItem.id}_${kriItem.reportingDate}`;
      const hasAtomicPermission = userPermissions[key]?.includes(atomicPermission) || false;
      
      // Also check for general acknowledge permission as fallback
      const hasGeneralAcknowledge = canPerformAction(userPermissions, 'acknowledge', 50, kriItem); // Use status 50 for acknowledge logic
      
      return canAcknowledge && (hasAtomicPermission || hasGeneralAcknowledge);
    },

    // Inline editing methods
    startEditAtomic(item) {
      this.editingAtomic = item.atomic_id;
      this.editingValue = parseFloat(item.atomic_value) || 0;
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
      // Enhanced validation
      if (this.editingValue === null || this.editingValue === '') {
        this.$message({
          message: 'Please enter a valid numeric value',
          type: 'warning',
          duration: 3000
        });
        return;
      }

      if (isNaN(this.editingValue)) {
        this.$message({
          message: 'Value must be a valid number',
          type: 'warning',
          duration: 3000
        });
        return;
      }

      // Check if value actually changed
      const currentValue = parseFloat(item.atomic_value) || 0;
      if (Math.abs(currentValue - this.editingValue) < 0.001) {
        this.cancelEdit();
        return;
      }

      this.savingAtomic = item.atomic_id;

      try {
        const result = await this.$store.dispatch('kri/saveAtomicValue', {
          kriId: this.kriDetail.kri_id,
          reportingDate: this.kriDetail.reporting_date,
          atomicId: item.atomic_id,
          value: this.editingValue.toString()
        });

        if (result.success) {
          this.$message({
            message: `Atomic element ${item.atomic_id} saved successfully`,
            type: 'success',
            duration: 2000
          });
          this.$emit('data-updated');
        } else {
          this.$message({
            message: result.error || 'Failed to save atomic value',
            type: 'error',
            duration: 4000
          });
        }
      } catch (error) {
        console.error('Error saving atomic value:', error);
        this.$message({
          message: 'Network error: Failed to save atomic value',
          type: 'error',
          duration: 4000
        });
      } finally {
        this.savingAtomic = null;
        this.editingAtomic = null;
        this.editingValue = null;
      }
    },

    // Individual row approval/rejection methods
    async approveAtomicElement(item) {
      this.$confirm(`Are you sure you want to approve atomic element ${item.atomic_id}?`, 'Confirm Approval', {
        confirmButtonText: 'Approve',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(async () => {
        try {
          const result = await this.$store.dispatch('kri/approveAtomicElements', {
            kriId: this.kriDetail.kri_id,
            reportingDate: this.kriDetail.reporting_date,
            atomicIds: [item.atomic_id]
          });

          if (result.success) {
            this.$message.success(`Atomic element ${item.atomic_id} approved successfully`);
            this.$emit('data-updated');
          } else {
            this.$message.error(result.error || 'Failed to approve atomic element');
          }
        } catch (error) {
          console.error('Error approving atomic element:', error);
          this.$message.error('Failed to approve atomic element');
        }
      }).catch(() => {
        // User cancelled
      });
    },

    async rejectAtomicElement(item) {
      try {
        const reasonPrompt = await this.$prompt('Please provide a reason for rejection:', 'Reject Atomic Element', {
          confirmButtonText: 'Reject',
          cancelButtonText: 'Cancel',
          inputValidator: (value) => {
            if (!value || value.trim().length < 3) {
              return 'Reason must be at least 3 characters long';
            }
            return true;
          }
        });

        const result = await this.$store.dispatch('kri/rejectAtomicElements', {
          kriId: this.kriDetail.kri_id,
          reportingDate: this.kriDetail.reporting_date,
          atomicIds: [item.atomic_id],
          reason: reasonPrompt.value
        });

        if (result.success) {
          this.$message.success(`Atomic element ${item.atomic_id} rejected successfully`);
          this.$emit('data-updated');
        } else {
          this.$message.error(result.error || 'Failed to reject atomic element');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error rejecting atomic element:', error);
          this.$message.error('Failed to reject atomic element');
        }
      }
    },

    async acknowledgeAtomicElement(item) {
      this.$confirm(`Are you sure you want to acknowledge atomic element ${item.atomic_id}?`, 'Confirm Acknowledgment', {
        confirmButtonText: 'Acknowledge',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(async () => {
        try {
          const result = await this.$store.dispatch('kri/acknowledgeAtomicElements', {
            kriId: this.kriDetail.kri_id,
            reportingDate: this.kriDetail.reporting_date,
            atomicIds: [item.atomic_id]
          });

          if (result.success) {
            this.$message.success(`Atomic element ${item.atomic_id} acknowledged successfully`);
            this.$emit('data-updated');
          } else {
            this.$message.error(result.error || 'Failed to acknowledge atomic element');
          }
        } catch (error) {
          console.error('Error acknowledging atomic element:', error);
          this.$message.error('Failed to acknowledge atomic element');
        }
      }).catch(() => {
        // User cancelled
      });
    },

    // Bulk input dialog methods
    openBulkInputDialog() {
      // Check if user can edit atomic elements
      const canEdit = this.atomicData.some(item => this.canEditAtomicElement(item));
      if (!canEdit) {
        this.$message.warning('You do not have permission to edit atomic elements for this KRI');
        return;
      }

      this.showBulkInputDialog = true;
    },

    handleBulkDataUpdate() {
      // Emit event to parent to refresh data
      this.$emit('data-updated');
      this.showBulkInputDialog = false;
    },

    async handleSubmitAtomicData() {
      // Check if all atomic elements have values
      const missingValues = this.atomicData.filter(item => 
        !item.atomic_value || item.atomic_value === 'N/A' || item.atomic_value === ''
      );

      if (missingValues.length > 0) {
        this.$message.warning(`${missingValues.length} atomic element(s) are missing values. Please complete all data before submission.`);
        return;
      }

      this.$confirm('Are you sure you want to submit all atomic data elements for approval?', 'Confirm Submission', {
        confirmButtonText: 'Submit',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(async () => {
        this.submittingAtomicData = true;
        try {
          const result = await this.$store.dispatch('kri/submitAtomicData', {
            kriId: this.kriDetail.kri_id,
            reportingDate: this.kriDetail.reporting_date
          });

          if (result.success) {
            this.$message.success('All atomic data elements submitted for approval successfully.');
            this.selectedItems = [];
            this.selectAll = false;
            this.$emit('data-updated');
          } else {
            this.$message.error(result.error || 'Failed to submit atomic data for approval.');
          }
        } catch (error) {
          console.error('Error submitting atomic data:', error);
          this.$message.error('Failed to submit atomic data for approval.');
        } finally {
          this.submittingAtomicData = false;
        }
      }).catch(() => {
        // User cancelled
      });
    },

    // New methods for row actions
    saveAtomicElement(item) {
      if (!this.hasAtomicValue(item)) {
        this.$message.warning('Cannot save atomic element without a value');
        return;
      }

      this.$confirm(`Are you sure you want to save atomic element ${item.atomic_id}?`, 'Confirm Save', {
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        type: 'info'
      }).then(async () => {
        this.savingAtomic = item.atomic_id;
        try {
          const result = await this.$store.dispatch('kri/saveAtomicValue', {
            kriId: this.kriDetail.kri_id,
            reportingDate: this.kriDetail.reporting_date,
            atomicId: item.atomic_id,
            value: item.atomic_value.toString()
          });

          if (result.success) {
            this.$message.success(`Atomic element ${item.atomic_id} saved successfully.`);
            this.$emit('data-updated');
          } else {
            this.$message.error(result.error || 'Failed to save atomic element.');
          }
        } catch (error) {
          console.error('Error saving atomic element:', error);
          this.$message.error('Failed to save atomic element.');
        } finally {
          this.savingAtomic = null;
        }
      }).catch(() => {
        // User cancelled
      });
    },

    submitAtomicElement(item) {
      this.$confirm(`Are you sure you want to submit atomic element ${item.atomic_id} for approval?`, 'Confirm Submission', {
        confirmButtonText: 'Submit',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(async () => {
        this.savingAtomic = item.atomic_id;
        try {
          const result = await this.$store.dispatch('kri/submitAtomicElement', {
            kriId: this.kriDetail.kri_id,
            reportingDate: this.kriDetail.reporting_date,
            atomicId: item.atomic_id
          });

          if (result.success) {
            this.$message.success(`Atomic element ${item.atomic_id} submitted for approval successfully.`);
            this.$emit('data-updated');
          } else {
            this.$message.error(result.error || 'Failed to submit atomic element for approval.');
          }
        } catch (error) {
          console.error('Error submitting atomic element:', error);
          this.$message.error('Failed to submit atomic element for approval.');
        } finally {
          this.savingAtomic = null;
        }
      }).catch(() => {
        // User cancelled
      });
    },

    saveAndSubmitAtomicElement(item) {
      if (!this.hasAtomicValue(item)) {
        this.$message.warning('Cannot save and submit atomic element without a value');
        return;
      }

      this.$confirm(`Are you sure you want to save and submit atomic element ${item.atomic_id} for approval?`, 'Confirm Submission', {
        confirmButtonText: 'Save & Submit',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(async () => {
        this.savingAtomic = item.atomic_id;
        try {
          const result = await this.$store.dispatch('kri/saveAndSubmitAtomicElement', {
            kriId: this.kriDetail.kri_id,
            reportingDate: this.kriDetail.reporting_date,
            atomicId: item.atomic_id,
            value: item.atomic_value.toString()
          });

          if (result.success) {
            this.$message.success(`Atomic element ${item.atomic_id} saved and submitted for approval successfully.`);
            this.$emit('data-updated');
          } else {
            this.$message.error(result.error || 'Failed to save and submit atomic element.');
          }
        } catch (error) {
          console.error('Error saving and submitting atomic element:', error);
          this.$message.error('Failed to save and submit atomic element.');
        } finally {
          this.savingAtomic = null;
        }
      }).catch(() => {
        // User cancelled
      });
    },

    hasAtomicValue(item) {
      return item.atomic_value !== null && item.atomic_value !== '' && item.atomic_value !== 'N/A';
    }
  },
  watch: {
    selectedItems(newSelection) {
      if (this.atomicData.length > 0) {
        this.selectAll = newSelection.length === this.atomicData.length;
      } else {
        this.selectAll = false;
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
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 15pt;
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

/* Data Table Styles */
.data-table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    margin-bottom: 24px;
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
}

/* Status Badges Styles */
/* Status badge styles now in global src/styles/status.css */

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
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    margin-top: 12px;
}

.atomic-card {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 12px;
    transition: all 0.2s ease;
}

.atomic-card:hover {
    border-color: #409eff;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
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
    gap: 8px;
    flex-wrap: wrap;
}

.row-actions .el-button {
    padding: 4px 8px;
    font-size: 11px;
    border-radius: 4px;
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
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 80px;
}

.editable-value:hover {
    background-color: #f0f9ff;
    border: 1px solid #409eff;
}

.value-display {
    flex: 1;
}

.edit-icon {
    opacity: 0;
    transition: opacity 0.2s ease;
    color: #409eff;
    font-size: 12px;
}

.editable-value:hover .edit-icon {
    opacity: 1;
}

.readonly-value {
    color: #606266;
}

.inline-edit-container {
    display: flex;
    align-items: center;
    gap: 8px;
}

.inline-edit-actions {
    display: flex;
    gap: 4px;
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
</style>