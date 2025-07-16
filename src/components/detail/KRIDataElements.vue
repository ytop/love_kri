<template>
  <div class="data-elements">
    <div class="actions-toolbar">
        <div class="right-actions">
            <button class="btn btn-success" id="approveSelectedBtn" @click="approveSelectedRows">Approve Selected</button>
            <button class="btn btn-danger" id="rejectSelectedBtn" @click="rejectSelectedRows">Reject Selected</button>
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
            </tr>
        </thead>
        <tbody>
            <tr v-if="atomicData.length === 0">
                <td colspan="8" style="text-align: center; padding: 16px;">No data elements available</td>
            </tr>
            <tr v-else v-for="item in atomicData" :key="item.atomic_id" :data-item-status="mapAtomicStatus(item.atomic_status)">
                <td><input type="checkbox" class="row-checkbox" :value="item.atomic_id" v-model="selectedItems"></td>
                <td>{{ item.atomic_id }}</td>
                <td>{{ item.atomic_metadata }}</td> <!-- Using atomic_metadata for Data Element Name -->
                <td class="data-value" :data-original-value="item.atomic_value">{{ item.atomic_value }}</td>
                <td>
                    <span class="status-badge" :class="getAtomicStatusBadgeClass(item.atomic_status)">
                        {{ mapAtomicStatus(item.atomic_status) }}
                    </span>
                </td>
                <td>{{ item.provider_name || 'N/A' }}</td> <!-- Placeholder for provider, defaults to N/A -->
                <td><span class="icon upload-icon">[ICON_UPLOAD]</span></td> <!-- Placeholder for icon -->
                <td><span class="icon comment-icon">[ICON_COMMENT]</span></td> <!-- Placeholder for icon -->
            </tr>
        </tbody>
    </table>

    <!-- Calculation Details Section -->
    <div class="formula-result-section">
        <h4>Calculation Details</h4>
        <div class="formula-item"><strong>Formula:</strong> (A - B) / C</div>
        <div class="formula-item"><strong>Calculation:</strong> (1,234,567 - 1,100,000) / 500,000</div>
        <div class="formula-item"><strong>Result:</strong> 0.269134</div>
    </div>
  </div>
</template>

<script>
import { mapStatus, getStatusTagType, getStatusCssClass } from '@/utils/helpers';

export default {
  name: 'KRIDataElements',
  props: {
    atomicData: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      selectAll: false,
      selectedItems: [] // To store atomic_ids of selected items
    };
  },
  methods: {
    // Use centralized unified status functions
    mapAtomicStatus: mapStatus,
    
    getAtomicStatusType: getStatusTagType,

    getAtomicStatusBadgeClass: getStatusCssClass,

    handleSelectAllChange() {
      if (this.selectAll) {
        this.selectedItems = this.atomicData.map(item => item.atomic_id);
      } else {
        this.selectedItems = [];
      }
    },

    approveSelectedRows() {
      if (this.selectedItems.length === 0) {
        console.warn('No items selected to approve.');
        // Optionally, show a user message via a notification system if available
        return;
      }
      console.log('Approving selected items:', this.selectedItems);
      // In a real app, this would dispatch a Vuex action or call a service.
      // For now, it will just log.
      // Potentially, clear selection and refresh data or update statuses locally.
    },

    rejectSelectedRows() {
      if (this.selectedItems.length === 0) {
        console.warn('No items selected to reject.');
        return;
      }
      console.log('Rejecting selected items:', this.selectedItems);
      // Similar to approve, this would involve backend interaction.
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
    margin-bottom: 20px;
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
.status-badge {
    padding: 4px 12px;
    border-radius: 9999px; /* pill shape */
    font-size: 11px;
    font-weight: 600;
    display: inline-block;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.2;
}
.status-badge.status-approved {
    background-color: rgba(40, 167, 69, 0.1);
    color: #155724;
}
.status-badge.status-pending {
    background-color: rgba(255, 193, 7, 0.15);
    color: #856404;
}
.status-badge.status-rejected {
    background-color: rgba(220, 53, 69, 0.1);
    color: #721c24;
}
.status-badge.status-na {
    background-color: rgba(108, 117, 125, 0.1);
    color: #6c757d;
}

/* Icon Styles (Placeholders) */
.icon {
    font-size: 18px;
    cursor: default;
    color: #718096;
}
/* .upload-icon, .comment-icon { } */

/* Formula/Calculation Result Section */
.formula-result-section {
    background-color: #f8f9fa;
    padding: 16px;
    border-radius: 8px;
    margin: 24px 0;
    border: 1px solid #e2e8f0;
}
.formula-result-section h4 {
    font-size: 16px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
    color: #1a202c;
    font-weight: 600;
}
.formula-item {
    margin-bottom: 8px;
    font-size: 14px;
    color: #4a5568;
}
.formula-item strong {
    display: inline-block;
    width: 90px;
    color: #718096;
    font-weight: 500;
}
.formula-item:last-child {
    margin-bottom: 0;
}
</style>