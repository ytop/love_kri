# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands

- `npm run dev` - Start development server on port 8081 with hot reload (usually not needed as project uses hot reload)
- `npm run build` - Build production bundle (only build if explicitly requested)
- `npm run lint` - Run ESLint on src/ directory for .js and .vue files

### Utility Commands

- `npm run clean` - Full cleanup (node_modules, dist, cache) and reinstall
- `npm run clean:modules` - Clean and reinstall node_modules only
- `npm run clean:build` - Clean build artifacts (dist, cache)

### Testing

No test framework is configured in this project.

## Architecture Overview

This is a Vue.js 2 KRI (Key Risk Indicator) Dashboard application that manages risk indicators through a complete workflow from data input to finalization.

### Tech Stack

-**Vue.js 2.7** with Vue Router 3 and Vuex 3

-**Element UI 2.15** for components and theming

-**ECharts 5** with vue-echarts for data visualization

-**Supabase** for backend database

-**date-fns 3.6** for date manipulation

-**axios 1.6** for HTTP requests

-**Webpack 5** for bundling

-**ESLint** for code quality

### Key Architecture Patterns

#### Manager Pattern Architecture

The application uses a centralized Manager Pattern for key operations:

- **StatusManager** (`src/utils/types.js`) - Unified status configuration, transitions, and validation
- **Permission System** (`src/utils/permission.js`) - Permission utility class for handling KRI and atomic-level permissions

#### State Management (Vuex)

- Centralized state in `src/store/modules/kri.js`
- Handles KRI items, filters, loading states, and error handling
- Includes comprehensive mock data fallback when database is unavailable
- Uses unified status system with numeric codes (10-60) mapped to readable labels

#### Database Schema

The application works with 6 main Supabase tables:

-`kri_item` - Main KRI records (composite key: kri_id + reporting_date)

- **NEW**: `is_calculated_kri` boolean field for distinguishing calculated vs manual KRIs

-`kri_atomic` - Atomic-level data components

-`kri_evidence` - File attachments and evidence

-`kri_audit_trail` - Change history and audit logs

-`kri_user` - User management and authentication

-`kri_user_permission` - Granular permissions per KRI and user

#### Status System

Unified status configuration now managed by `StatusManager` class in `src/utils/types.js`:

- 10: Pending Input
- 20: Under Rework (formerly "Adjusting")
- 30: Saved (formerly "Pending Data Provider Approval")
- 40: Submitted to Data Provider Approver
- 50: Submitted to KRI Owner Approver
- 60: Finalized

#### Component Structure

-**Views**: Dashboard, KRIDetail, KRIListByStatus, KRIWorkflowPage, Login, NotFound, AdminManagement

-**Components**: KRIFilters, KRITable, KRIChartView, KRITableCollectData

-**Detail Components**: 
- `KRIGeneralInfo` - Basic KRI information display
- `KRIOverview` - KRI summary with data visualization
- `KRIDataElements` - Atomic data management with bulk operations
  - Multi-row selection with bulk approve/reject/acknowledge operations
  - Inline editing for atomic values with immediate save/cancel
  - Status-aware action buttons based on atomic workflow states
  - Provider-based permission checking for atomic elements
- `KRIEvidenceAudit` - Evidence upload and audit trail management
- `KRISidebar` - Action buttons and workflow controls

-**Mixins**:

- `expandableTableMixin.js` - Provides table expansion functionality
- `adminCrudMixin.js` - Shared CRUD patterns for admin components with abstract methods

-**Shared Components**:

- `KRIActionButtons.vue` - Standardized action button components
- `KRIStatusTag.vue` - Consistent status display components
- `EvidenceUploadModal.vue` - Enhanced file upload with auto-parse integration
- `TableColumnConfig.vue` - Configurable table column management
- `AtomicInputDialog.vue` - Dialog for atomic value input and editing
- `LoadingSpinner.vue` and `LoadingState.vue` - Loading state management components
  - Multi-file drag-and-drop upload with progress tracking
  - Excel file auto-parsing for KRIs with `source === 'autoParse'`
  - MD5 hash-based duplicate detection with user warnings
  - Case 1 workflow integration (status 10/20) for automatic KRI value extraction
  - Support for both single KRI and atomic value parsing

-**Admin Components** (`src/components/admin/`):

- `AdminUserManagement.vue` - User role management with department filtering and bulk operations
- `AdminPermissionManagement.vue` - Permission assignments with user/department filtering
- `AdminRoleManagement.vue` - Role distribution visualization and bulk role changes
- `AdminDepartmentManagement.vue` - Department statistics and user promotion
- `AdminSystemOverview.vue` - System health monitoring and recent activity tracking
- `dialogs/AddUserDialog.vue` - User creation with validation and role assignment
- `dialogs/AddPermissionDialog.vue` - Permission creation with templates and KRI selection
- `shared/AdminBaseActivityAudit.vue` - Base audit trail component for admin interfaces
- `shared/AdminBaseDashboard.vue` - Base dashboard component for admin views
- `shared/AdminBaseUserManagement.vue` - Base user management component for admin features

-**Department Admin Components** (`src/components/departmentAdmin/`):

- `DepartmentDashboard.vue` - Department-specific dashboard with team management focus
- `DepartmentPermissionManagement.vue` - Department-level permission assignments
- `DepartmentTeamManagement.vue` - Team member management within department
- `DepartmentActivityAudit.vue` - Department-scoped activity monitoring
- `dialogs/BulkPermissionTemplateDialog.vue` - Bulk permission templates for department
- `dialogs/UserDetailsDialog.vue` - Department user detail management
- `dialogs/UserPermissionsDialog.vue` - User permission assignment within department

**Note**: Department KRI management functionality has been removed. Department admins now use the main AdminManagement.vue interface which provides appropriate access based on role.

#### Routing

- History mode routing with fallback to index.html
- Dynamic routes for KRI details: `/kri/:id/:date`
- Status-based routes: `/kris/pending`, `/kris/status/:status`
- Generic status route: `/kris/status/:status`

#### Data Flow & Service Layer

1. **kriService.js** - Main API service with BaseKRIService class pattern

   - Handles all Supabase API calls with standardized methods
   - Built-in audit trail logging for all updates
   - Server-side functions via Supabase RPC for complex operations
2. **ObjectStorage.js** - File storage operations with abstract framework
3. **ExcelParserService.js** - Excel parsing service for auto-parse functionality

   - Handles Excel file parsing for KRIs with `source === 'autoParse'`
   - Extracts KRI values using multiple strategies (cell reference, label matching, position-based, heuristic)
   - Supports both single KRI values and multiple atomic values for calculated KRIs
   - Includes MD5 hash generation for duplicate detection
   - Validates extracted data with confidence scoring and range checking
   - Browser-based parsing with fallback methods for complex Excel files
4. **permission.js** - Permission utility class providing access control logic

   - Parse comma-separated permission strings
   - Validate actions against USER_PERMISSIONS constants
   - Support both atomic-level and general permissions
5. Vuex actions fetch data and transform it for components
6. Components use Vuex getters for filtered/computed data
7. Date handling uses integer format (YYYYMMDD) for database storage

#### Development Patterns

- Vue single-file components (.vue)
- Composition of reusable components
- Consistent error handling with mock data fallback
- Element UI theming and components
- ECharts integration for data visualization

#### Event-Driven Component Communication

The application uses a comprehensive event system for component communication:

- **KRIDetail View Events**:
  - `@data-updated` - Triggers refresh when child components modify data
  - `@evidence-uploaded` - Handles evidence upload completion
  - `@excel-parsed` - Processes auto-parsed Excel data from EvidenceUploadModal
  - `@status-updated` - Updates parent state when workflow status changes

- **KRIDataElements Events**:
  - `@data-updated` - Notifies parent of atomic data changes
  - `@evidence-uploaded` - Propagates evidence upload events

- **EvidenceUploadModal Events**:
  - Emits `@excel-parsed` with extracted data when auto-parse completes
  - Emits `@evidence-uploaded` when file upload succeeds
  - Emits `@status-updated` when workflow status changes due to auto-fill

- **Component Event Flow**:
  1. User uploads Excel file in EvidenceUploadModal
  2. Modal emits `@excel-parsed` with extracted KRI value
  3. Parent component updates KRI data and status
  4. Parent emits `@data-updated` to trigger UI refresh
  5. Status change triggers `@status-updated` for workflow management

## Key Configuration

### Webpack

- Configuration in `webpack.config.js` and `vue.config.js`
- Entry point: `src/main.js`
- Alias: `@` points to `src/`
- Dev server on port 8081 with hot reload and host 0.0.0.0
- History API fallback for SPA routing

### ESLint

- Vue/essential plugin
- ES2022 syntax support
- Relaxed rules for easier adoption
- Console warnings only in production

### Supabase Configuration

- Project URL: https://vyrojgsjtyitolvzwznl.supabase.co
- Anonymous key is hardcoded in `src/services/supabase.js`
- Database uses integer date format (YYYYMMDD)

## Important Development Notes

### Code Organization

- **Store-related operations**: Put all store related operations in `@src/store/modules/kri.js`
- **Helper functions**: Put all helper function (not related to stored value) in `@src/utils/helpers.js`
  - **NEW**: Added helper function `write` to the helper functions collection

### Status System Migration

This project recently migrated from a role-based system to a relationship-based access control system. The unified status system in `src/utils/types.js` now uses these numeric codes:

- 10: Pending Input
- 20: Under Rework (formerly "Adjusting")
- 30: Saved (formerly "Pending Data Provider Approval")
- 40: Submitted to Data Provider Approver
- 50: Submitted to KRI Owner Approver
- 60: Finalized

#### Control Flow Logics

case 1: 10 "Pending Input" OR 20 "Under Rework"

  User can input data if have proper permission

    subcase 1, user have a document(excel) and are compatible with auto parser (NEW! determined by KRI source === 'autoParse')

    -> user uploads Excel document via EvidenceUploadModal
    -> system checks MD5 hash for duplicate detection (warns if repeat upload)
    -> ExcelParserService.parseExcelFile() extracts KRI value using multiple strategies:
       1. Cell reference matching (if metadata.cellReference provided)
       2. Label-based extraction (if metadata.expectedLabel provided)  
       3. Position-based extraction (default row/column)
       4. Heuristic extraction (most significant numeric value)
    -> system validates extracted value with confidence scoring
    -> auto-populates KRI value field and changes status to "Saved" (30)
    -> audit trail records automatic extraction with confidence level

    subcase 2, user have document(other) and are not compatible with auto parser(by KRI->source === null/EMPTY STRING)

    -> user can manual input KRI value and ask for user to upload supporting documents

    subcase 3, KRI data is prefilled by system (NEW! check if source === 'system')

    -> this should not happend due to KRI that fullfilled by system would have status of 30 "Saved"

case 2: 30 "Saved"

  User can input data if have proper permission (The data is either came from status 10 or 20 or SYSTEM INPUT(NEW! indicated by source === 'system'))

    -> subcase 1: user clicked save button

    -> remain at state "Saved" but update value

    -> subcase 2: user clicked submit button

    IF KRI_OWNER == DATA_PROVIDER (in kri record)

    -> change to "Submitted to KRI Owner Approver"

    ELSE KRI_OWNER <> DATA_PROVIDER

    -> change to "Submitted to Data Provider Approver"

case 3: 40 "Submitted to Data Provider Approver" OR 50 "Submitted to KRI Owner Approver"

  User can approve data if have proper permission

    -> subcase 1: user clicked approve button

    IF KRI_OWNER == DATA_PROVIDER AND STATUS = 50

    -> change to 60 "Finalized"

    ELSE KRI_OWNER <> DATA_PROVIDER AND STATUS = 40

    -> change to 50 "Submitted to KRI Owner Approver"

    ELSE:

    SHOULD NOT HAPPEN

    -> subcase 2: user clicked reject button

    PROVIDE REJECT REASON

    -> change to 20 "Under Rework"

### Access Control Pattern

The application now uses relationship-based access control focusing on department-based permissions rather than role-based access. For data upload and approval workflows, the system ensures different users handle different stages of the process through audit log verification.

### Date Handling

All date operations use integer format (YYYYMMDD) for database storage and queries. The `getLastDayOfPreviousMonth()` helper function provides the default reporting date filter.

### Mock Data Fallback

The Vuex store includes comprehensive mock data fallback when the Supabase database is unavailable, ensuring the application remains functional during development or database downtime.

### Calculated KRI Workflow

The application supports calculated KRIs with a specific workflow documented in `/doc/logicsFlowForCalculatedKRI.md`:

1. Users input atomic values for calculated KRIs
2. Data provider approval for atomic components
3. KRI owner reviews and can approve/reject individual atomic values
4. Auto-recalculation when all atomics are finalized
5. Final KRI approval with optional manual override capability

## Development Best Practices

### Database Operations

- Always use integer date format (YYYYMMDD) for database storage and queries
- Use composite keys (kri_id + reporting_date) for time-series data
- Leverage Vuex getters for filtered data instead of component-level filtering
- Maintain audit trail integrity for all data changes

### Status and Permission Checking

```javascript
// Use StatusManager for consistent status handling
import StatusManager from '@/utils/types';
const canEdit = StatusManager.allowsEdit(currentStatus);

// Use Permission utility for access control
import Permission from '@/utils/permission';
const permission = new Permission(userPermissions);
const canPerform = permission.canPerform(kriId, atomicId, action);
```

### Component Patterns

- Follow Vue single-file component structure (.vue)
- Use Element UI components consistently for theming
- Implement proper error handling with graceful degradation to mock data
- Use Vuex actions for data fetching and transformations

### Access Control

- Use relationship-based permissions through KRI owner/data provider relationships
- Verify permissions through `kri_user_permission` table
- Permissions stored as comma-separated strings (e.g., "atomic1_edit,atomic1_view,edit,view")
- Use `permission.js` utility class for standardized permission checking
- Ensure different users handle different workflow stages via audit log verification

#### Permission Format

Database permissions are stored as comma-separated action strings:

```
"atomic1_edit,atomic1_view,atomic1_review,atomic1_acknowledge,atomic1_delete,atomic2_edit,atomic2_view,edit,view,review,acknowledge,delete"
```

**Note**: There may be inconsistency in permission format between comma-separated and dot-separated formats during system migration. The Permission utility class handles parsing and provides `canPerform(kriId, atomicId, action)` method.

### Performance Considerations

- Use lazy loading for detail views
- Implement computed properties for filtered data
- Optimize database queries with proper indexing on composite keys

### Performance Optimizations & User Experience

#### Inline Editing Features
- **KRIDataElements**: Immediate inline editing of atomic values with save/cancel actions
- **Real-time validation**: Input validation with immediate feedback
- **Optimistic updates**: UI updates immediately while background save occurs

#### Bulk Operations
- **Multi-row selection**: Checkbox-based selection for bulk atomic operations
- **Batch processing**: Approve/reject/acknowledge multiple atomics simultaneously
- **Progress indicators**: Loading states and progress feedback for bulk operations

#### File Upload Enhancements
- **Drag-and-drop interface**: Enhanced file upload experience with visual feedback
- **Progress tracking**: Real-time upload progress with percentage indicators
- **Duplicate detection**: MD5 hash-based duplicate file detection with user warnings
- **Auto-parsing feedback**: Confidence scoring and validation results for extracted values

#### Responsive Design
- **Fixed column layouts**: Action buttons remain visible during horizontal scrolling
- **Mobile-friendly interactions**: Touch-optimized buttons and form controls
- **Status-aware UI**: Dynamic button visibility based on current workflow state and permissions

## Security Considerations

### Resolved Vulnerabilities
- **form-data (Critical)**: Updated to v4.0.4+ to fix unsafe random function vulnerability
- **Dependencies**: Updated axios, @babel/core, @babel/preset-env, @supabase/supabase-js, and webpack to latest compatible versions

### Remaining Vue 2 Ecosystem Constraints
Due to server requirements to maintain Vue 2 compatibility, the following vulnerabilities remain but are mitigated:

- **PostCSS (Moderate)**: Requires vue-loader@17+ upgrade (breaking change for Vue 2)
- **Vue 2.7.16 (Moderate)**: ReDoS vulnerability in parseHTML function - upgrade to Vue 3 would be breaking
- **vue-template-compiler (Moderate)**: XSS vulnerability - tied to Vue 2 ecosystem
- **webpack-dev-server v4 (Moderate)**: Source code exposure risks - upgrade to v5 may cause compatibility issues

### Security Mitigation Strategies
1. **Development Environment**: Only use webpack-dev-server in development, never in production
2. **Input Validation**: Implement strict input validation for all user-supplied HTML/template content
3. **Content Security Policy**: Implement CSP headers to mitigate XSS risks
4. **Regular Updates**: Monitor for Vue 2 compatible security patches
5. **Network Security**: Use HTTPS and secure network configurations to mitigate dev-server risks

## MCP servers

- Supabase configured via MCP server. Using this if you need to check with object storage or database informations.

## Current Development Status

- **Admin Management System**: Recently refactored from monolithic AdminManagement.vue (1400+ lines) into modular components:
  - `AdminUserManagement.vue` - User role and department management with bulk operations
  - `AdminPermissionManagement.vue` - Permission assignments with filtering (KRI management removed)
  - `AdminRoleManagement.vue` - Role distribution analytics and bulk role changes
  - `AdminDepartmentManagement.vue` - Department statistics and user promotion features
  - `AdminSystemOverview.vue` - System health monitoring and activity tracking
  - Dialog components in `src/components/admin/dialogs/` for user and permission creation
  - Shared `adminCrudMixin.js` for consistent CRUD patterns across admin components
  - Centralized styling in `src/assets/styles/admin.css` using design system variables
  - CSS organization follows existing `src/assets/styles/variables.css` design tokens

- **Department Admin Routing**: The `/dept-admin` route uses AdminManagement.vue component, providing department-scoped access to admin functionality based on user role
- **KRI Management Removed**: Department KRI management functionality has been removed from both AdminManagement.vue and department admin components
- **TypeScript Diagnostics**: Minor Vuex import warnings due to package.json exports compatibility (Vue 2 ecosystem constraint)
- **Permission System Changes**: Recently migrated from comma-separated permission strings to a new format - some compatibility issues may exist and are being resolved
- Application uses hot reload extensively - avoid running build commands during development
- Mock data fallback system ensures functionality during database downtime

## Development Principles

- Avoid hardcoding values unless absolutely necessary.
- Backward compatibility is not a priority; this is a prototyping project.
- Do not run tests after implementation (such as `npm run dev` or `npm run build`). The project relies on hot reload for development.
- Run `npm run lint` to check for code quality and linter errors.
- **Code Reuse**
  - Always check for existing functions or data structures before writing new code.
  - Prefer minor revisions to existing code over creating new code from scratch.
  - Only write new code if no existing solution can be adapted.
- If a file exceeds 1000 lines, refactor by moving helper functions to separate files in the appropriate folders.
- Read the entire file before starting work on it.
- Do not hardcode if possible and necessary (avoid magic numbers, strings, or configuration in code).
- When writing code consider re-use if possible:
  1. if we have a similiar method, we can use that method 
  2. can we change some part of it to shared using the same method 
  3. consider writing new, if no existing solution can be adapted.
  This policy applies to all js, css and vue files.

### Code Organization Reminder

- **Store-related operations**: Store function & related ops in `@src/store/modules/kri.js`
- **Admin Management Architecture**: Both system admins (`/admin`) and department admins (`/dept-admin`) use the same AdminManagement.vue component, with role-based feature visibility
- **Department KRI Management**: Removed as of recent refactoring - department admins no longer have separate KRI management interface
