/**
 * Expandable Table Mixin
 * 
 * Provides reusable functionality for tables with expandable rows.
 * Designed to work with KRI tables that show atomic data as sub-rows.
 */

import { isCalculatedKRI } from '@/utils/helpers';

export default {
  data() {
    return {
      expandedRowIds: [], // Track expanded KRI row IDs (Vue 2 reactive array)
      selectedRows: []
    };
  },
  
  computed: {
    /**
     * Generate table data with atomic sub-rows inserted at appropriate positions
     * @returns {Array} Combined table data with expanded atomic rows
     */
    expandedTableData() {
      if (!this.data || !Array.isArray(this.data)) {
        return [];
      }
      
      const result = [];
      
      this.data.forEach(row => {
        // Add the main KRI row
        result.push(row);
        
        // If this row is expanded and calculated, add its atomic sub-rows
        if (this.isRowExpanded(row) && this.isCalculatedKRI(row) && !row.isAtomicRow) {
          const atomicRows = this.$store.getters['kri/getAtomicRowsForKRI'](row, new Set(this.expandedRowIds));
          result.push(...atomicRows);
        }
      });
      
      return result;
    }
  },
  
  methods: {
    /**
     * Check if a row is currently expanded
     * @param {Object} row - Table row data
     * @returns {boolean} True if row is expanded
     */
    isRowExpanded(row) {
      const rowId = this.getRowId(row);
      return this.expandedRowIds.includes(rowId);
    },
    
    /**
     * Toggle expansion state of a row
     * @param {Object} row - Table row data
     */
    toggleRowExpansion(row) {
      const rowId = this.getRowId(row);
      const index = this.expandedRowIds.indexOf(rowId);
      
      if (index !== -1) {
        // Row is expanded, collapse it
        this.$set(this.expandedRowIds, index, null);
        this.expandedRowIds.splice(index, 1);
      } else {
        // Row is collapsed, expand it
        this.expandedRowIds.push(rowId);
      }
    },
    
    /**
     * Generate unique ID for a row (for expansion tracking)
     * @param {Object} row - Table row data
     * @returns {string} Unique row identifier
     */
    getRowId(row) {
      return `${row.kriId || row.id}_${row.reportingDate}`;
    },
    
    /**
     * Check if a KRI has calculated atomic components
     * @param {Object} row - Table row data
     * @returns {boolean} True if KRI is calculated
     */
    isCalculatedKRI(row) {
      return isCalculatedKRI(row);
    },
    
    /**
     * Handle row selection changes (filters out atomic sub-rows)
     * @param {Array} selection - Selected rows
     */
    handleSelectionChange(selection) {
      this.selectedRows = selection.filter(row => !row.isAtomicRow);
      this.$emit('selection-change', this.selectedRows);
    },
    
    /**
     * Determine if a row can be selected (only main KRI rows)
     * @param {Object} row - Table row data
     * @returns {boolean} True if row is selectable
     */
    isSelectable(row) {
      return !row.isAtomicRow;
    },
    
    /**
     * Generate CSS class names for table rows based on their type and state
     * @param {Object} row - Table row data
     * @param {number} _index - Row index (unused but required by Element UI)
     * @returns {string} Space-separated CSS class names
     */
    getRowClassName(row, _index) {
      const classes = [];
      
      if (row.isAtomicRow) {
        classes.push('atomic-sub-row');
      } else if (this.isCalculatedKRI(row)) {
        classes.push('calculated-kri-row');
        if (this.isRowExpanded(row)) {
          classes.push('expanded');
        }
      }
      
      return classes.join(' ');
    },
    
    /**
     * Expand all calculated KRIs
     */
    expandAll() {
      if (this.data) {
        const newExpandedIds = [];
        this.data.forEach(row => {
          if (this.isCalculatedKRI(row) && !row.isAtomicRow) {
            const rowId = this.getRowId(row);
            if (!this.expandedRowIds.includes(rowId)) {
              newExpandedIds.push(rowId);
            }
          }
        });
        this.expandedRowIds.push(...newExpandedIds);
      }
    },
    
    /**
     * Collapse all expanded rows
     */
    collapseAll() {
      this.expandedRowIds.splice(0, this.expandedRowIds.length);
    }
  }
};