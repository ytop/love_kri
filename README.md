# KRI Dashboard - Vue.js 2 Port

This is a Vue.js 2 port of the original React KRI (Key Risk Indicator) Dashboard application. The project uses Element UI for components and ECharts for data visualization.

## Project Overview

The KRI Dashboard provides a comprehensive risk management interface for monitoring, analyzing, and managing key risk indicators with features for:

- Data filtering and search
- Table and chart visualization
- Detailed KRI views with audit trails
- Evidence management
- Real-time status tracking

## Tech Stack

- **Vue.js 2.7** - Progressive JavaScript framework
- **Element UI 2.15** - Vue 2 component library
- **Vue Router 3** - Official router for Vue.js
- **Vuex 3** - State management pattern
- **ECharts 5** - Powerful charting library
- **Supabase** - Backend as a Service
- **Webpack 5** - Module bundler
- **Babel** - JavaScript compiler

## Project Structure

```
src/
├── components/           # Reusable components
│   ├── detail/          # KRI detail view components
│   ├── KRIFilters.vue   # Advanced filtering
│   ├── KRITable.vue     # Data table component
│   └── KRIChartView.vue # Chart visualization
├── views/               # Page components
│   ├── Dashboard.vue    # Main dashboard
│   ├── KRIDetail.vue    # KRI detail page
│   └── NotFound.vue     # 404 page
├── store/               # Vuex store
│   ├── modules/
│   │   └── kri.js       # KRI state management
│   └── index.js         # Store configuration
├── services/            # API services
│   ├── supabase.js      # Supabase client
│   └── kriService.js    # KRI API methods
├── utils/               # Utility functions
│   └── helpers.js       # Common helpers
├── router/              # Vue Router configuration
│   └── index.js
├── App.vue              # Root component
└── main.js              # Application entry point
```

## Installation

1. Navigate to the vue_porting directory:
```bash
cd vue_porting
```

2. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8081`

## Build

Build for production:
```bash
npm run build
```

## Features Ported

### ✅ Completed
- **Project Setup**: Vue 2 + Element UI + Webpack configuration
- **Routing**: Vue Router with dashboard and detail views
- **State Management**: Vuex store for KRI data management
- **Database Integration**: Supabase client and service layer
- **Dashboard View**: Main KRI listing with filters and table
- **Detail View**: Comprehensive KRI detail page with tabs
- **Filtering**: Advanced filtering with multiple criteria
- **Table Component**: Sortable table with selection and actions
- **Chart Visualization**: ECharts integration with multiple chart types
- **Responsive Design**: Mobile-friendly layout

### 🔧 Component Breakdown

#### Dashboard Components
- `KRIFilters.vue` - Advanced filtering interface
- `KRITable.vue` - Data table with sorting and selection
- `KRIChartView.vue` - Chart visualization dialog

#### Detail Components
- `KRIGeneralInfo.vue` - Basic KRI information
- `KRIOverview.vue` - KRI metrics and status
- `KRIDataElements.vue` - Atomic data table
- `KRIEvidenceAudit.vue` - Evidence files and audit trail
- `KRISidebar.vue` - Quick actions and summary

## Key Differences from React Version

1. **Component Syntax**: Vue single-file components vs React JSX
2. **State Management**: Vuex instead of React Query + local state
3. **Styling**: Element UI theming vs Tailwind CSS classes
4. **Charts**: ECharts with vue-echarts vs Recharts
5. **Routing**: Vue Router vs React Router DOM
6. **Data Binding**: Vue's reactive data vs React hooks

## Configuration

The application uses the same Supabase backend as the original React version:
- Project ID: vyrojgsjtyitolvzwznl
- Database tables: kri_item, kri_atomic, kri_evidence, kri_audit_trail

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Database Schema

The Supabase database has four main tables (see `doc/database.sql` for complete DDL):

**kri_item** - Main KRI records
- Primary key: `(kri_id, reporting_date)`
- Fields: kri_name, kri_description, data_provider, kri_owner, l1_risk_type, l2_risk_type, ras_metric, breach_type, limit_value (integer), warning_line_value (integer), reporting_frequency, kri_formula, kri_value (text), kri_status (0=Pending, 1=Submitted, 2=Finalized)

**kri_atomic** - Atomic-level KRI data components
- Primary key: `(kri_id, reporting_date, atomic_id)`
- Fields: atomic_metadata, atomic_value, atomic_status

**kri_evidence** - File attachments and evidence
- Primary key: `evidence_id` (auto-generated)
- Foreign key: `(kri_id, reporting_date)`
- Fields: file_name, file_url, description, uploaded_by, uploaded_at

**kri_audit_trail** - Change history and audit logs
- Primary key: `audit_id` (auto-generated)
- Foreign key: `(kri_id, reporting_date)`
- Fields: changed_at, changed_by, action, field_name, old_value, new_value, comment

## Browser Support

- Vue 2.7 supports all modern browsers
- Element UI supports IE 10+
- ECharts supports all modern browsers

## Migration Notes

This Vue.js port maintains the same data structure and API integration as the original React application, ensuring compatibility with the existing Supabase backend. The user experience and functionality remain consistent while leveraging Vue.js ecosystem advantages.