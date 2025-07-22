<template>
  <tbody>
    <tr v-for="(atomicItem, index) in atomicData" :key="`atomic-${atomicItem.atomic_id}`" :class="['atomic-sub-row', `atomic-row-${index}`]">
      <!-- Selection column - empty for atomic rows -->
      <td class="atomic-cell selection-cell"></td>
      
      <!-- KRI ID column - show atomic ID with indentation -->
      <td class="atomic-cell atomic-id-cell">
        <div class="atomic-id-container">
          <i class="el-icon-right atomic-indent"></i>
          <span class="atomic-id">{{ atomicItem.atomic_id }}</span>
        </div>
      </td>
      
      <!-- KRI Name column - show atomic metadata -->
      <td class="atomic-cell atomic-name-cell">
        <div class="atomic-name-container">
          <span class="atomic-name">{{ atomicItem.atomic_metadata || `Element ${atomicItem.atomic_id}` }}</span>
          <el-tag size="mini" type="info" class="atomic-tag">Atomic</el-tag>
        </div>
      </td>
      
      <!-- Owner column - empty or show provider -->
      <td class="atomic-cell">
        <span class="atomic-provider">{{ getAtomicProvider(atomicItem) }}</span>
      </td>
      
      <!-- Data Provider column - empty -->
      <td class="atomic-cell"></td>
      
      <!-- Status column - show atomic status -->
      <td class="atomic-cell">
        <el-tag
          :type="getAtomicStatusType(atomicItem.atomic_status)"
          size="small"
          class="atomic-status-tag">
          {{ mapAtomicStatus(atomicItem.atomic_status) }}
        </el-tag>
      </td>
      
      <!-- L1 Risk Type column - empty -->
      <td class="atomic-cell" v-if="showL1RiskType"></td>
      
      <!-- L2 Risk Type column - empty -->
      <td class="atomic-cell" v-if="showL2RiskType"></td>
      
      <!-- Breach Type column - empty -->
      <td class="atomic-cell" v-if="showBreachType"></td>
      
      <!-- KRI Value column - atomic value with editing -->
      <td class="atomic-cell atomic-value-cell">
        <div v-if="interactiveMode && canEditAtomicElement(atomicItem)" class="atomic-inline-edit">
          <el-input-number
            v-model="editingValues[atomicItem.atomic_id]"
            :precision="2"
            size="small"
            style="width: 100%"
            :placeholder="atomicItem.atomic_value"
            @change="handleAtomicValueChange(atomicItem)"
          />
        </div>
        <div v-else class="atomic-value-display">
          {{ atomicItem.atomic_value || 'N/A' }}
        </div>
      </td>
      
      <!-- Reporting Cycle column - empty -->
      <td class="atomic-cell" v-if="showReportingCycle"></td>
      
      <!-- Reporting Date column - empty -->
      <td class="atomic-cell" v-if="showReportingDate"></td>
      
      <!-- Actions column - atomic-specific actions -->
      <td class="atomic-cell atomic-actions-cell" v-if="showActions">
        <div class="atomic-actions">
          <!-- Input Actions for editable atomic elements -->
          <template v-if="interactiveMode && canEditAtomicElement(atomicItem)">
            <el-button
              size="small"
              icon="el-icon-check"
              @click="handleAtomicSave(atomicItem)"
              :disabled="!hasValidAtomicValue(atomicItem)"
              :loading="getAtomicLoading(atomicItem)"
              class="atomic-action-button save-button">
              Save
            </el-button>
            
            <!-- Submit button for status 30 (Saved) -->
            <el-button
              v-if="atomicItem.atomic_status === 30"
              size="small"
              icon="el-icon-upload"
              @click="handleAtomicSubmitSaved(atomicItem)"
              :loading="getAtomicLoading(atomicItem)"
              class="atomic-action-button submit-button">
              Submit
            </el-button>
            
            <!-- Save and Submit button for statuses 10,20 -->
            <el-button
              v-if="[10, 20].includes(atomicItem.atomic_status)"
              size="small"
              icon="el-icon-upload"
              @click="handleAtomicSaveAndSubmit(atomicItem)"
              :disabled="!hasValidAtomicValue(atomicItem)"
              :loading="getAtomicLoading(atomicItem)"
              class="atomic-action-button submit-button">
              Save & Submit
            </el-button>
          </template>
          
          <!-- Review Actions for Data Provider Approver -->
          <template v-else-if="interactiveMode && canApproveAtomicElement(atomicItem)">
            <el-button
              size="small"
              icon="el-icon-check"
              @click="handleAtomicApprove(atomicItem)"
              :loading="getAtomicLoading(atomicItem)"
              class="atomic-action-button approve-button">
              Approve
            </el-button>
            <el-button
              size="small"
              icon="el-icon-close"
              @click="handleAtomicReject(atomicItem)"
              :loading="getAtomicLoading(atomicItem)"
              class="atomic-action-button reject-button">
              Reject
            </el-button>
          </template>
          
          <!-- Acknowledge Actions for KRI Owner Approver -->
          <template v-else-if="interactiveMode && canAcknowledgeAtomicElement(atomicItem)">
            <el-button
              size="small"
              icon="el-icon-check"
              @click="handleAtomicAcknowledge(atomicItem)"
              :loading="getAtomicLoading(atomicItem)"
              class="atomic-action-button acknowledge-button">
              Ack
            </el-button>
            <el-button
              size="small"
              icon="el-icon-close"
              @click="handleAtomicReject(atomicItem)"
              :loading="getAtomicLoading(atomicItem)"
              class="atomic-action-button reject-button">
              Reject
            </el-button>
          </template>
          
          <!-- No actions available -->
          <template v-else>
            <span class="no-atomic-actions-text">{{ interactiveMode ? 'View only' : 'Read-only' }}</span>
          </template>
        </div>
      </td>
    </tr>
  </tbody>
</template>

<script>
import { mapState } from 'vuex';
import { mapStatus, getStatusTagType } from '@/utils/helpers';
import PermissionManager from '@/utils/PermissionManager';
import StatusManager from '@/utils/StatusManager';

export default {
  name: 'AtomicSubRows',
  props: {
    atomicData: {
      type: Array,
      required: true
    },
    kriItem: {
      type: Object,
      required: true
    },
    interactiveMode: {
      type: Boolean,
      default: false
    },
    // Column visibility props to match parent table structure
    showL1RiskType: {
      type: Boolean,
      default: true
    },
    showL2RiskType: {
      type: Boolean,
      default: true  
    },
    showBreachType: {
      type: Boolean,
      default: true
    },
    showReportingCycle: {
      type: Boolean,
      default: true
    },
    showReportingDate: {
      type: Boolean,
      default: false
    },
    showActions: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      editingValues: {}, // Store editing values for each atomic element
      atomicLoadingStates: {} // Loading states for atomic operations
    };
  },
  computed: {
    ...mapState('kri', ['currentUser'])
  },
  watch: {
    atomicData: {
      handler(newData) {
        // Initialize editing values for all atomic elements
        if (newData && newData.length > 0) {
          newData.forEach(item => {
            if (!this.editingValues[item.atomic_id]) {
              this.$set(this.editingValues, item.atomic_id, parseFloat(item.atomic_value) || 0);
            }
          });
        }
      },
      immediate: true
    }
  },
  methods: {
    // Status mapping
    mapAtomicStatus: mapStatus,
    getAtomicStatusType: getStatusTagType,
    
    // Provider information
    getAtomicProvider(_atomicItem) {
      // Provider information typically comes from the main KRI
      return this.kriItem.dataProvider || this.kriItem.data_provider || '';
    },
    
    // Permission checking methods
    canEditAtomicElement(atomicItem) {
      if (!this.currentUser || !this.currentUser.permissions) {
        return false;
      }
      
      const kriItem = {
        id: this.kriItem.id,
        reportingDate: this.kriItem.reportingDate,
        kri_owner: this.kriItem.owner || this.kriItem.kri_owner,
        data_provider: this.kriItem.dataProvider || this.kriItem.data_provider
      };
      
      // Can edit in statuses 10, 20, 30 with proper permissions
      const canEdit = [10, 20, 30].includes(atomicItem.atomic_status);
      const hasPermission = PermissionManager.canPerformAction(
        this.currentUser.permissions, 
        'edit', 
        atomicItem.atomic_status, 
        kriItem
      );
      
      return canEdit && hasPermission && StatusManager.allowsEdit(atomicItem.atomic_status);
    },
    
    canApproveAtomicElement(atomicItem) {
      if (!this.currentUser || !this.currentUser.permissions) {
        return false;
      }
      
      const kriItem = {
        id: this.kriItem.id,
        reportingDate: this.kriItem.reportingDate,
        kri_owner: this.kriItem.owner || this.kriItem.kri_owner,
        data_provider: this.kriItem.dataProvider || this.kriItem.data_provider
      };
      
      // Can only approve items in status 40 (Submitted to Data Provider Approver)
      const canApprove = atomicItem.atomic_status === 40;
      const hasPermission = PermissionManager.canPerformAction(
        this.currentUser.permissions,
        'review',
        atomicItem.atomic_status,
        kriItem
      );
      
      return canApprove && hasPermission;
    },
    
    canAcknowledgeAtomicElement(atomicItem) {
      if (!this.currentUser || !this.currentUser.permissions) {
        return false;
      }
      
      const kriItem = {
        id: this.kriItem.id,
        reportingDate: this.kriItem.reportingDate,
        kri_owner: this.kriItem.owner || this.kriItem.kri_owner,
        data_provider: this.kriItem.dataProvider || this.kriItem.data_provider
      };
      
      // Can acknowledge if in submitted to KRI Owner status and has permission
      const canAcknowledge = atomicItem.atomic_status === 50;
      const hasPermission = PermissionManager.canPerformAction(
        this.currentUser.permissions,
        'acknowledge',
        atomicItem.atomic_status,
        kriItem
      );
      
      return canAcknowledge && hasPermission;
    },
    
    // Value validation
    hasValidAtomicValue(atomicItem) {
      const value = this.editingValues[atomicItem.atomic_id];
      return value !== null && value !== undefined && value !== '';
    },
    
    // Loading state management
    getAtomicLoading(atomicItem) {
      return this.atomicLoadingStates[atomicItem.atomic_id] || false;
    },
    
    setAtomicLoading(atomicItem, loading) {
      this.$set(this.atomicLoadingStates, atomicItem.atomic_id, loading);
    },
    
    // Event handlers
    handleAtomicValueChange(atomicItem) {
      // Emit value change event to parent
      this.$emit('atomic-value-changed', {
        atomicId: atomicItem.atomic_id,
        value: this.editingValues[atomicItem.atomic_id]
      });
    },
    
    async handleAtomicSave(atomicItem) {
      const value = this.editingValues[atomicItem.atomic_id];
      if (!value) {
        this.$message.warning('Please enter a valid atomic value');
        return;
      }
      
      this.setAtomicLoading(atomicItem, true);
      
      try {
        this.$emit('atomic-action', {
          action: 'save',
          atomicItem,
          payload: { value: value.toString() }
        });
      } finally {
        this.setAtomicLoading(atomicItem, false);
      }
    },
    
    async handleAtomicSubmitSaved(atomicItem) {
      this.setAtomicLoading(atomicItem, true);
      
      try {
        this.$emit('atomic-action', {
          action: 'submit',
          atomicItem,
          payload: {}
        });
      } finally {
        this.setAtomicLoading(atomicItem, false);
      }
    },
    
    async handleAtomicSaveAndSubmit(atomicItem) {
      const value = this.editingValues[atomicItem.atomic_id];
      if (!value) {
        this.$message.warning('Please enter a valid atomic value');
        return;
      }
      
      this.setAtomicLoading(atomicItem, true);
      
      try {
        this.$emit('atomic-action', {
          action: 'save_and_submit',
          atomicItem,
          payload: { value: value.toString() }
        });
      } finally {
        this.setAtomicLoading(atomicItem, false);
      }
    },
    
    async handleAtomicApprove(atomicItem) {
      this.setAtomicLoading(atomicItem, true);
      
      try {
        this.$emit('atomic-action', {
          action: 'approve',
          atomicItem,
          payload: { comment: 'Approved by Data Provider Approver' }
        });
      } finally {
        this.setAtomicLoading(atomicItem, false);
      }
    },
    
    async handleAtomicAcknowledge(atomicItem) {
      this.setAtomicLoading(atomicItem, true);
      
      try {
        this.$emit('atomic-action', {
          action: 'acknowledge',
          atomicItem,
          payload: { comment: 'Acknowledged by KRI Owner Approver' }
        });
      } finally {
        this.setAtomicLoading(atomicItem, false);
      }
    },
    
    async handleAtomicReject(atomicItem) {
      try {
        // Emit request for rejection reason
        this.$emit('atomic-action', {
          action: 'reject',
          atomicItem,
          payload: { needsReason: true }
        });
      } catch (error) {
        console.error('Atomic reject error:', error);
      }
    }
  }
};
</script>

<style scoped>
/* Atomic Sub-Row Styling */
.atomic-sub-row {
  background-color: #fafbfc !important;
  border-left: 3px solid #e2e8f0;
}

.atomic-cell {
  padding: 12px !important;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #f1f5f9 !important;
}

/* Selection column styling */
.selection-cell {
  background-color: #f8f9fa !important;
}

/* Atomic ID column */
.atomic-id-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.atomic-indent {
  color: #cbd5e0;
  font-size: 12px;
  margin-left: 12px;
}

.atomic-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #6366f1;
  font-weight: 600;
  background-color: #f1f5f9;
  padding: 3px 8px;
  border-radius: 4px;
}

/* Atomic Name column */
.atomic-name-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

.atomic-name {
  font-size: 14px;
  color: #475569;
  font-weight: 500;
}

.atomic-tag {
  font-size: 11px;
  height: 20px;
  line-height: 18px;
}

/* Provider column */
.atomic-provider {
  font-size: 13px;
  color: #64748b;
  font-style: italic;
}

/* Status column */
.atomic-status-tag {
  font-size: 12px;
  height: 24px;
  line-height: 22px;
}

/* Value column */
.atomic-value-cell {
  min-width: 120px;
}

.atomic-inline-edit {
  width: 100%;
}

.atomic-inline-edit .el-input-number {
  width: 100% !important;
}

.atomic-value-display {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #059669;
  font-weight: 600;
  background-color: #f0fdf4;
  padding: 6px 10px;
  border-radius: 4px;
  display: inline-block;
}

/* Actions column */
.atomic-actions-cell {
  min-width: 160px;
}

.atomic-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
}

.atomic-action-button {
  padding: 5px 12px;
  font-size: 12px;
  border-radius: 4px;
  min-width: 60px;
  white-space: nowrap;
}

.atomic-action-button >>> .el-button__inner {
  padding: 0;
}

/* Action Button Colors - matching main table */
.save-button {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.save-button:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

.submit-button,
.approve-button,
.acknowledge-button {
  background-color: #10b981;
  border-color: #10b981;
  color: white;
}

.submit-button:hover,
.approve-button:hover,
.acknowledge-button:hover {
  background-color: #059669;
  border-color: #059669;
}

.reject-button {
  background-color: #ef4444;
  border-color: #ef4444;
  color: white;
}

.reject-button:hover {
  background-color: #dc2626;
  border-color: #dc2626;
}

.no-atomic-actions-text {
  color: #94a3b8;
  font-size: 12px;
  font-style: italic;
}

/* Hover effect for atomic rows */
.atomic-sub-row:hover {
  background-color: #f1f5f9 !important;
}

/* Disabled state for action buttons */
.atomic-action-button:disabled {
  background-color: #d1d5db;
  border-color: #d1d5db;
  color: #9ca3af;
  opacity: 0.6;
}

.atomic-action-button:disabled:hover {
  background-color: #d1d5db;
  border-color: #d1d5db;
  color: #9ca3af;
}
</style>