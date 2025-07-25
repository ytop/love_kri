# KRI Dashboard - Vue.js 2 Application

[![Deployment Verification](https://github.com/ytop/love_kri/actions/workflows/deployment-verification.yml/badge.svg?branch=main)](https://github.com/ytop/love_kri/actions/workflows/deployment-verification.yml)

A comprehensive Vue.js 2 KRI (Key Risk Indicator) Dashboard application that manages risk indicators through a complete workflow from data input to finalization. The application supports both manual data entry and automated Excel parsing with a sophisticated atomic workflow management system.

## Project Overview

The KRI Dashboard provides enterprise-grade risk management capabilities with:

- **Complete Workflow Management**: From pending input through approval stages to finalization
- **Excel Auto-Parsing**: Automated data extraction from Excel files with confidence scoring
- **Atomic Data Management**: Granular control over individual data elements with bulk operations
- **Evidence Management**: File upload with duplicate detection and audit trails
- **Advanced Permissions**: Relationship-based access control with department-level permissions
- **Real-time Collaboration**: Multi-user workflow with audit logging
- **Calculated KRI Support**: Specialized workflow for calculated KRIs with atomic value management

## Tech Stack

- **Vue.js 2.7** with Vue Router 3 and Vuex 3
- **Element UI 2.15** for components and theming
- **ECharts 5** with vue-echarts for data visualization
- **Supabase** for backend database and file storage
- **date-fns 3.6** for date manipulation
- **axios 1.6** for HTTP requests
- **Webpack 5** for bundling with hot reload
- **ESLint** for code quality

## Architecture Overview

### Manager Pattern Architecture

The application uses a centralized Manager Pattern for key operations:

- **StatusManager** (`src/utils/types.js`) - Unified status configuration, transitions, and validation
- **ExcelParserService** (`src/services/ExcelParserService.js`) - Excel parsing with multiple extraction strategies
- **Permission System** (`src/utils/permission.js`) - Permission utility class for handling KRI and atomic-level permissions

### State Management (Vuex)

- Centralized state in `src/store/modules/kri.js`
- Handles KRI items, filters, loading states, and error handling
- Includes comprehensive mock data fallback when database is unavailable
- Uses unified status system with numeric codes (10-60) mapped to readable labels

### Database Schema

The application works with 6 main Supabase tables:

- `kri_item` - Main KRI records (composite key: kri_id + reporting_date)
  - **NEW**: `is_calculated_kri` boolean field for distinguishing calculated vs manual KRIs
- `kri_atomic` - Atomic-level data components with individual workflow states
- `kri_evidence` - File attachments and evidence with metadata
- `kri_audit_trail` - Complete change history and audit logs
- `kri_user` - User management and authentication
- `kri_user_permission` - Granular permissions per KRI and user

### Status System

Unified status configuration managed by `StatusManager` class in `src/utils/types.js`:

- **10**: Pending Input
- **20**: Under Rework (formerly "Adjusting")
- **30**: Saved (formerly "Pending Data Provider Approval")
- **40**: Submitted to Data Provider Approver
- **50**: Submitted to KRI Owner Approver
- **60**: Finalized

### Component Structure

- **Views**: Dashboard, KRIDetail, KRIListByStatus, KRIWorkflowPage, Login, NotFound, AdminManagement
- **Components**: KRIFilters, KRITable, KRIChartView, KRITableCollectData
- **Detail Components**: 
  - `KRIGeneralInfo` - Basic KRI information display
  - `KRIOverview` - KRI summary with data visualization
  - `KRIDataElements` - Atomic data management with bulk operations
    - Multi-row selection with bulk approve/reject/acknowledge operations
    - Inline editing for atomic values with immediate save/cancel
    - Status-aware action buttons based on atomic workflow states
    - Provider-based permission checking for atomic elements
  - `KRIEvidenceAudit` - Evidence upload and audit trail management
  - `KRISidebar` - Action buttons and workflow controls
- **Mixins**: `expandableTableMixin.js` - Provides table expansion functionality
- **Shared Components**:
  - `KRIActionButtons.vue` - Standardized action button components
  - `KRIStatusTag.vue` - Consistent status display components
  - `EvidenceUploadModal.vue` - Enhanced file upload with auto-parse integration
  - `TableColumnConfig.vue` - Configurable table column management
    - Multi-file drag-and-drop upload with progress tracking
    - Excel file auto-parsing for KRIs with `source === 'autoParse'`
    - MD5 hash-based duplicate detection with user warnings
    - Case 1 workflow integration (status 10/20) for automatic KRI value extraction
    - Support for both single KRI and atomic value parsing

### Routing

- History mode routing with fallback to index.html
- Dynamic routes for KRI details: `/kri/:id/:date`
- Status-based routes: `/kris/pending`, `/kris/status/:status`
- Generic status route: `/kris/status/:status`

### Data Flow & Service Layer

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

## Installation

1. **Clone and navigate to the project**:
```bash
git clone <repository-url>
cd love_kri
```

2. **Install dependencies**:
```bash
npm install
```

3. **Environment Setup**:
   - Supabase configuration is in `src/services/supabase.js`
   - Project URL: https://vyrojgsjtyitolvzwznl.supabase.co

## Development

### Core Commands

- `npm run dev` - Start development server on port 8081 with hot reload
- `npm run build` - Build production bundle (only build if explicitly requested)
- `npm run lint` - Run ESLint on src/ directory for .js and .vue files

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8081` with hot reload enabled.

**Note**: The project uses hot reload extensively - avoid running build commands during development unless explicitly needed.

### Testing

No test framework is configured in this project.

## Key Features

### Excel Auto-Parsing Workflow

For KRIs with `source === 'autoParse'`:

1. **Upload Excel Document**: Via enhanced drag-and-drop interface
2. **Duplicate Detection**: MD5 hash-based duplicate file detection
3. **Multi-Strategy Extraction**:
   - Cell reference matching (metadata.cellReference)
   - Label-based extraction (metadata.expectedLabel)
   - Position-based extraction (default row/column)
   - Heuristic extraction (most significant numeric value)
4. **Validation & Confidence Scoring**: Automatic data validation with confidence levels
5. **Auto-Population**: KRI value auto-filled with status change to "Saved"

### Atomic Data Management

- **Bulk Operations**: Multi-row selection with bulk approve/reject/acknowledge
- **Inline Editing**: Real-time editing of atomic values with immediate save/cancel
- **Status-Aware Actions**: Dynamic button visibility based on workflow state and permissions
- **Provider-Based Permissions**: Granular access control per atomic element

### Enhanced User Experience

- **Drag-and-Drop Upload**: Enhanced file upload with progress tracking
- **Fixed Column Layouts**: Action buttons remain visible during horizontal scrolling
- **Real-time Validation**: Input validation with immediate feedback
- **Optimistic Updates**: UI updates immediately while background operations occur

### Calculated KRI Workflow

The application supports calculated KRIs with a specific workflow:

1. Users input atomic values for calculated KRIs
2. Data provider approval for atomic components
3. KRI owner reviews and can approve/reject individual atomic values
4. Auto-recalculation when all atomics are finalized
5. Final KRI approval with optional manual override capability

## Project Structure

```
src/
├── components/
│   ├── detail/                    # KRI detail view components
│   │   ├── KRIGeneralInfo.vue    # Basic KRI information display
│   │   ├── KRIOverview.vue       # KRI summary with data visualization
│   │   ├── KRIDataElements.vue   # Atomic data management with bulk operations
│   │   ├── KRIEvidenceAudit.vue  # Evidence upload and audit trail
│   │   └── KRISidebar.vue        # Action buttons and workflow controls
│   ├── shared/                   # Shared components
│   │   ├── EvidenceUploadModal.vue # Enhanced file upload with auto-parse
│   │   ├── KRIActionButtons.vue   # Standardized action buttons
│   │   └── KRIStatusTag.vue       # Consistent status display
│   ├── KRIFilters.vue            # Advanced filtering interface
│   ├── KRITable.vue              # Data table with sorting and selection
│   └── KRIChartView.vue          # Chart visualization
├── views/                        # Page components
│   ├── Dashboard.vue             # Main dashboard with filters and table
│   ├── KRIDetail.vue             # Comprehensive KRI detail page
│   ├── KRIListByStatus.vue       # Status-based KRI listings
│   └── KRIWorkflowPage.vue       # Workflow management interface
├── services/                     # Service layer
│   ├── kriService.js             # Main API service with audit trail logging
│   ├── ExcelParserService.js     # Excel parsing with multiple strategies
│   ├── ObjectStorage.js          # File storage operations
│   └── supabase.js               # Supabase client configuration
├── store/modules/
│   └── kri.js                    # Centralized state management with mock fallback
├── utils/
│   ├── types.js                  # StatusManager and unified configurations
│   ├── permission.js             # Permission utility class
│   └── helpers.js                # Common utility functions
├── mixins/                       # Reusable component logic
│   └── expandableTableMixin.js   # Table expansion functionality
└── router/                       # Vue Router configuration
    └── index.js                  # Route definitions with dynamic routes
```

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

## Development Patterns

### Event-Driven Communication

Components use comprehensive event system:

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

### Permission System

Relationship-based access control:

```javascript
// Permission format: "atomic1_edit,atomic1_view,edit,view,review,acknowledge"
// Usage in components:
this.canPerform(kriId, atomicId, action)
```

Database permissions are stored as comma-separated action strings:
```
"atomic1_edit,atomic1_view,atomic1_review,atomic1_acknowledge,atomic1_delete,atomic2_edit,atomic2_view,edit,view,review,acknowledge,delete"
```

The Permission utility class parses these into arrays and provides `canPerform(kriId, atomicId, action)` method.

### Code Organization Principles

- **Reuse First**: Always check existing functions before writing new code
- **Store Operations**: All store-related operations in `src/store/modules/kri.js`
- **Helper Functions**: Non-store utility functions in `src/utils/helpers.js`
- **No Hardcoding**: Avoid hardcoded values where possible
- **Hot Reload Friendly**: Designed for development with hot reload

### Access Control Pattern

The application uses relationship-based access control focusing on department-based permissions rather than role-based access. For data upload and approval workflows, the system ensures different users handle different stages of the process through audit log verification.

### Date Handling

All date operations use integer format (YYYYMMDD) for database storage and queries. The `getLastDayOfPreviousMonth()` helper function provides the default reporting date filter.

### Mock Data Fallback

The Vuex store includes comprehensive mock data fallback when the Supabase database is unavailable, ensuring the application remains functional during development or database downtime.

## Workflow Logic

### Case 1: Pending Input (10) / Under Rework (20)

**Auto-Parse Workflow**:
1. User uploads Excel document via EvidenceUploadModal
2. System checks MD5 hash for duplicate detection
3. ExcelParserService extracts KRI value using multiple strategies
4. System validates with confidence scoring
5. Auto-populates KRI value and changes status to "Saved" (30)

**Manual Input**:
- User can manually input KRI values and upload supporting documents
- System-prefilled data (source === 'system') should have status 30

### Case 2: Saved (30)

Users can:
- Save updates (remain at status 30)
- Submit for approval:
  - If KRI_OWNER == DATA_PROVIDER → Status 50
  - If KRI_OWNER ≠ DATA_PROVIDER → Status 40

### Case 3: Approval Stages (40/50)

**Data Provider Approval (40)**:
- Approve → Status 50 (if different from KRI owner) or 60 (if same)
- Reject → Status 20 with reason

**KRI Owner Approval (50)**:
- Approve → Status 60 (Finalized)
- Reject → Status 20 with reason

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

## Browser Support

- **Vue 2.7**: All modern browsers
- **Element UI**: IE 10+
- **ECharts**: All modern browsers
- **Excel Parsing**: Modern browsers with FileReader API support

## Performance Optimizations

- **Lazy Loading**: Detail views loaded on demand
- **Computed Properties**: Efficient filtered data rendering
- **Mock Data Fallback**: Ensures functionality during database downtime
- **Optimistic Updates**: Immediate UI feedback during operations
- **Bulk Operations**: Efficient multi-row processing

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

### Performance Considerations

- Use lazy loading for detail views
- Implement computed properties for filtered data
- Optimize database queries with proper indexing on composite keys

## Development Principles

- Avoid hardcoding values unless absolutely necessary
- Backward compatibility is not a priority; this is a prototyping project
- Do not run tests after implementation (such as `npm run dev` or `npm run build`). The project relies on hot reload for development
- **Code Reuse**
  - Always check for existing functions or data structures before writing new code
  - Prefer minor revisions to existing code over creating new code from scratch
  - Only write new code if no existing solution can be adapted
- If a file exceeds 1000 lines, refactor by moving helper functions to separate files in the appropriate folders
- Read the entire file before starting work on it
- Do not hardcode if possible and necessary (avoid magic numbers, strings, or configuration in code)

### Code Organization Reminder

- **Store-related operations**: Store function & related ops in `@src/store/modules/kri.js`
- **Helper functions**: Put all helper function (not related to stored value) in `@src/utils/helpers.js`

## MCP Servers

- Supabase configured via MCP server. Using this if you need to check with object storage or database informations.

## Current Development Status

- Permission system recently refactored with improved parsing logic
- Some Manager pattern files referenced in documentation may be missing from current codebase
- Application uses hot reload extensively - avoid running build commands during development
- Mock data fallback system ensures functionality during database downtime

## Contributing

1. Follow existing Vue single-file component patterns
2. Use Element UI components for consistency
3. Implement proper error handling with mock data fallback
4. Maintain audit trail integrity for all data changes
5. Use relationship-based permission checking
6. Ensure hot reload compatibility
7. Follow the development principles outlined above
