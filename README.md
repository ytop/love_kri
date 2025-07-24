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

## Tech Stack

- **Vue.js 2.7** with Vue Router 3 and Vuex 3
- **Element UI 2.15** for components and theming
- **ECharts 5** with vue-echarts for data visualization
- **Supabase** for backend database and file storage
- **date-fns 3.6** for date manipulation
- **axios 1.7** for HTTP requests
- **Webpack 5** for bundling with hot reload
- **ESLint** for code quality

## Architecture Overview

### Manager Pattern Architecture

The application uses a centralized Manager Pattern for key operations:

- **StatusManager** (`src/utils/types.js`) - Unified status configuration and transitions
- **ExcelParserService** (`src/services/ExcelParserService.js`) - Excel parsing with multiple extraction strategies
- **Permission System** - Relationship-based access control with atomic-level permissions

### Database Schema

The application works with 6 main Supabase tables:

- `kri_item` - Main KRI records (composite key: kri_id + reporting_date)
- `kri_atomic` - Atomic-level data components with individual workflow states
- `kri_evidence` - File attachments and evidence with metadata
- `kri_audit_trail` - Complete change history and audit logs
- `kri_user` - User management and authentication
- `kri_user_permission` - Granular permissions per KRI and user

### Status System

Unified workflow with numeric status codes:

- **10**: Pending Input
- **20**: Under Rework (formerly "Adjusting")
- **30**: Saved (formerly "Pending Data Provider Approval")
- **40**: Submitted to Data Provider Approver
- **50**: Submitted to KRI Owner Approver
- **60**: Finalized

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
- `npm run build` - Build production bundle
- `npm run lint` - Run ESLint on src/ directory for .js and .vue files

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8081` with hot reload enabled.

**Note**: The project uses hot reload extensively - avoid running build commands during development unless explicitly needed.

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
│   └── helpers.js                # Common utility functions
├── mixins/                       # Reusable component logic
│   ├── kriOperationMixin.js      # KRI operation functionality
│   ├── bulkKRIOperationMixin.js  # Bulk operations handling
│   └── validationMixin.js        # Common validation patterns
└── router/                       # Vue Router configuration
    └── index.js                  # Route definitions with dynamic routes
```

## Security Considerations

### Resolved Vulnerabilities
- **form-data (Critical)**: Updated to v4.0.4+ to fix unsafe random function vulnerability
- **Dependencies**: Updated axios, @babel/core, @babel/preset-env, @supabase/supabase-js, and webpack to latest compatible versions

### Security Mitigation Strategies
1. **Development Environment**: webpack-dev-server only used in development, never production
2. **Input Validation**: Strict validation for all user-supplied HTML/template content
3. **Content Security Policy**: CSP headers implemented to mitigate XSS risks
4. **Network Security**: HTTPS and secure network configurations

## Development Patterns

### Event-Driven Communication

Components use comprehensive event system:

- `@data-updated` - Triggers refresh when child components modify data
- `@evidence-uploaded` - Handles evidence upload completion
- `@excel-parsed` - Processes auto-parsed Excel data
- `@status-updated` - Updates parent state when workflow status changes

### Permission System

Relationship-based access control:

```javascript
// Permission format: "atomic1_edit,atomic1_view,edit,view,review,acknowledge"
// Usage in components:
this.canPerform(kriId, atomicId, action)
```

### Code Organization Principles

- **Reuse First**: Always check existing functions before writing new code
- **Store Operations**: All store-related operations in `src/store/modules/kri.js`
- **Helper Functions**: Non-store utility functions in `src/utils/helpers.js`
- **No Hardcoding**: Avoid hardcoded values where possible
- **Hot Reload Friendly**: Designed for development with hot reload

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

## Contributing

1. Follow existing Vue single-file component patterns
2. Use Element UI components for consistency
3. Implement proper error handling with mock data fallback
4. Maintain audit trail integrity for all data changes
5. Use relationship-based permission checking
6. Ensure hot reload compatibility
