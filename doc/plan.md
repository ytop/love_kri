# KRI Enhancement Implementation Plan

## Overview

This plan implements a comprehensive enhancement to the KRI (Key Risk Indicator) system, focusing on improved status workflows, unified data views, and separated input/approval interfaces.

## Phase 1: UI Improvements & Foundation

### Step 1.1: Fix Button Spacing Issues

- **File**: Identify components with button spacing issues
- **Action**: Adjust CSS/styling for proper button spacing
- **Target**: All Vue components with button layouts
- **Estimate**: 1-2 hours

### Step 1.2: Database Schema Review

- **File**: `doc/database.sql`
- **Action**: Review current KRI table structure for status fields
- **Verify**: Ensure status field can handle new numeric values (10-60)
- **Estimate**: 30 minutes

## Phase 2: Status System Overhaul

### Step 2.1: Update Status Constants

- **File**: `src/utils/helpers.js`
- **Action**: Replace `mapKriStatus` function with new status mapping
- **New Status Values**:
  - 10: "Pending Input"
  - 20: "Adjusting"
  - 30: "Pending Data Provider Approval"
  - 40: "Ready for submission"
  - 50: "Submitted"
  - 60: "Finalized"
- **Estimate**: 1 hour

### Step 2.2: Implement Status Workflow Logic

- **File**: `src/services/kriService.js`
- **Action**: Create workflow functions for status transitions
- **Workflows**:
  - **Case 1** (Data Provider = KRI Owner): 10 → 30 → 50 → 60
  - **Case 2** (Data Provider ≠ KRI Owner): 10 → 30 → 40 → 50 → 60
  - **Case 3** (Rejection flows): Any approval → 20 (Adjusting)
- **Functions to implement**:
  - `canTransitionStatus(currentStatus, newStatus, userRole, isDataProvider)`
  - `getNextAvailableStatuses(currentStatus, userRole, isDataProvider)`
  - `updateKRIStatus(kriId, newStatus, comments)`
- **Estimate**: 4-6 hours

### Step 2.3: Update Status Display Components

- **Files**:
  - `src/components/KRITable.vue`
  - `src/components/KRIFilters.vue`
  - `src/views/KRIListByStatus.vue`
- **Action**: Update all status displays to use new status values
- **Add**: Status-based filtering and sorting
- **Estimate**: 3-4 hours

### Step 2.4: Update Sample Data

- **File**: Create data migration script
- **Action**: Convert existing status values (0,1,2) to new system (10,50,60)
- **Test**: Verify data integrity after migration
- **Estimate**: 2 hours

## Phase 3: Union View Implementation (Task 2)

### Step 3.1: Analyze Current Data Structure

- **File**: `src/components/KRITableCollectData.vue`
- **Action**: Review current data display and identify KRI data elements/atomic data
- **Research**: Understand the relationship between KRI data elements and main KRI data
- **Estimate**: 1-2 hours

### Step 3.2: Create Unified Data Service

- **File**: `src/services/kriService.js`
- **Action**: Create functions to merge KRI data with atomic/element data
- **Functions**:
  - `getUnifiedKRIData(kriId)`
  - `getKRIWithElements(filters)`
- **Estimate**: 3-4 hours

### Step 3.3: Update Collection Data Component

- **File**: `src/components/KRITableCollectData.vue`
- **Action**: Modify to display merged view of KRI data and elements
- **Features**:
  - Expandable rows for atomic data
  - Inline editing for data elements
  - Bulk operations for multiple elements
- **Estimate**: 4-6 hours

## Phase 4: Split Input/Approve Interface (Task 3)

### Step 4.1: Create Input Component

- **File**: `src/components/KRITableInput.vue` (new)
- **Action**: Extract input functionality from `KRITableCollectData.vue`
- **Features**:
  - Data input forms
  - Validation
  - Submit for approval actions
  - Status: "Pending Input" → "Ready for submission"
- **Estimate**: 4-5 hours

### Step 4.2: Create Approval Component

- **File**: `src/components/KRITableApprove.vue` (new)
- **Action**: Extract approval functionality from `KRITableCollectData.vue`
- **Features**:
  - Review submitted data
  - Approve/Reject actions with comments
  - Rework comments functionality
  - Status transitions for approval workflow
- **Estimate**: 4-5 hours

### Step 4.3: Update Button Names and Actions

- **Files**: New input and approve components
- **Action**: Update button labels to reflect new workflow
- **Button Updates**:
  - "Submit for Approval" (Input component)
  - "Approve", "Reject", "Request Rework" (Approve component)
- **Estimate**: 1-2 hours

### Step 4.4: Add Rework Comments System

- **File**: `src/components/KRITableApprove.vue`
- **Action**: Implement comments system for rework requests
- **Features**:
  - Comment input for rejections
  - Comment history display
  - Comment notifications
- **Database**: May need comments table/field
- **Estimate**: 3-4 hours

### Step 4.5: Update Collection Data Router

- **File**: `src/components/KRITableCollectData.vue`
- **Action**: Convert to router component that loads Input or Approve based on user role/status
- **Logic**: Route to appropriate component based on KRI status and user permissions
- **Estimate**: 2-3 hours

## Phase 5: Integration & Testing

### Step 5.1: Update Store/State Management

- **File**: `src/store/modules/kri.js`
- **Action**: Update Vuex store to handle new status workflows and component interactions
- **Add**: Actions for status transitions, comment management
- **Estimate**: 2-3 hours

### Step 5.2: Update Routing

- **File**: `src/router/index.js`
- **Action**: Add routes for new input/approve components
- **Consider**: Role-based route guards
- **Estimate**: 1 hour

### Step 5.3: Component Integration Testing

- **Action**: Test all components work together with new status system
- **Test Cases**:
  - Status transitions for each workflow case
  - Input → Approve workflow
  - Rejection → Rework flow
  - Union view data display
- **Estimate**: 4-6 hours

### Step 5.4: Database Testing & Migration

- **Action**: Test all database operations with new status values
- **Verify**: Data integrity and proper status transitions
- **Estimate**: 2-3 hours

## Phase 6: Final Polish & Documentation

### Step 6.1: Error Handling & Validation

- **Action**: Add comprehensive error handling for status transitions
- **Add**: User-friendly error messages
- **Estimate**: 2-3 hours

### Step 6.2: User Experience Testing

- **Action**: Test complete user workflows
- **Verify**: Intuitive navigation between input/approve modes
- **Estimate**: 2-3 hours

### Step 6.3: Documentation Update

- **Files**: Update README.md and create user guide
- **Action**: Document new workflows and component usage
- **Estimate**: 2 hours

## Total Estimated Time: 50-70 hours

## Dependencies & Risks

1. **Database Schema**: May need schema changes for comments system
2. **User Roles**: Need clear definition of user roles and permissions
3. **Data Migration**: Existing production data needs careful migration
4. **Testing**: Extensive testing required due to workflow complexity

## Success Criteria

- [ ] All 6 status values properly implemented and functional
- [ ] Status workflows correctly enforce business rules
- [ ] Union view displays merged KRI and element data
- [ ] Input/Approve components provide clear separation of concerns
- [ ] Rework comments system enables proper feedback loop
- [ ] UI improvements enhance user experience
- [ ] All existing functionality preserved
