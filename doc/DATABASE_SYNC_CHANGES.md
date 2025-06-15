# Database Schema Synchronization Changes

This document outlines the changes made to sync the Vue.js codebase with the actual Supabase database DDL schema.

## Changes Made

### 1. Database Schema Documentation
- ✅ **Added**: `doc/database.sql` - Complete DDL for all four tables
- ✅ **Added**: `src/types/database.js` - Type definitions and helpers matching schema
- ✅ **Updated**: `README.md` - Added database schema documentation section

### 2. Data Type Corrections
**Key Changes from Previous Implementation:**

| Field | Previous Type | Correct Type | Impact |
|-------|---------------|--------------|--------|
| `limit_value` | text/string | integer | Fixed mock data and display formatting |
| `warning_line_value` | text/string | integer | Fixed mock data and display formatting |
| `kri_id` | string | bigint | Ensured proper type casting in queries |
| `atomic_id` | string | integer | Added to composite primary key |
| `evidence_id` | manual | auto-generated identity | Removed from insert operations |
| `audit_id` | manual | auto-generated identity | Removed from insert operations |

### 3. Primary Key Structure Updates
**Composite Primary Keys:**
- `kri_item`: `(kri_id, reporting_date)`
- `kri_atomic`: `(kri_id, reporting_date, atomic_id)`
- `kri_evidence`: `evidence_id` (auto-generated)
- `kri_audit_trail`: `audit_id` (auto-generated)

### 4. Updated Mock Data
**Enhanced `src/store/modules/kri.js`:**
- ✅ Mock data now includes all database fields
- ✅ Proper integer values for `limit_value` and `warning_line_value`
- ✅ Realistic formulas and descriptions
- ✅ Correct data provider information
- ✅ Proper status mappings (0, 1, 2 instead of strings)

### 5. Service Layer Updates
**Enhanced `src/services/kriService.js`:**
- ✅ Proper type casting for `kri_id` (string to bigint)
- ✅ Added ordering to query results
- ✅ Ensured composite key handling in WHERE clauses

### 6. UI Components Updates
**Enhanced `src/components/SimpleTable.vue`:**
- ✅ Added `Limit Value` and `Warning Line` columns
- ✅ Proper number formatting for integer fields
- ✅ Enhanced status and breach type tag styling
- ✅ Added more table columns matching database schema

### 7. Status Mapping Definitions
**Added proper enums in `src/types/database.js`:**
```javascript
export const KRIStatus = {
  PENDING: 0,
  SUBMITTED: 1,
  FINALIZED: 2
};

export const AtomicStatus = {
  INACTIVE: 0,
  ACTIVE: 1,
  VALIDATED: 2
};
```

## Database Field Mapping

### KRI Item Fields
| Database Field | UI Display | Data Type | Notes |
|----------------|------------|-----------|--------|
| `kri_id` | KRI ID | bigint | Primary key component |
| `reporting_date` | Reporting Date | integer | YYYYMMDD format, primary key component |
| `kri_name` | KRI Name | text | Nullable |
| `kri_description` | Description | text | Nullable |
| `data_provider` | Data Provider | text | Nullable |
| `kri_owner` | Owner | text | Nullable |
| `l1_risk_type` | L1 Risk Type | text | Nullable |
| `l2_risk_type` | L2 Risk Type | text | Nullable |
| `ras_metric` | KRI Type | text | Nullable |
| `breach_type` | Breach Type | text | Nullable |
| `limit_value` | Limit Value | integer | Nullable |
| `warning_line_value` | Warning Line | integer | Nullable |
| `reporting_frequency` | Reporting Cycle | text | Nullable |
| `kri_formula` | Formula | text | Nullable |
| `kri_value` | KRI Value | text | Stored as text for flexibility |
| `kri_status` | Status | integer | 0=Pending, 1=Submitted, 2=Finalized |

## Validation
- ✅ All table structures match DDL exactly
- ✅ Primary key constraints properly handled
- ✅ Foreign key relationships maintained
- ✅ Data types correctly mapped
- ✅ Mock data realistic and complete
- ✅ UI components display all relevant fields

## Next Steps
1. Test with actual Supabase database connection
2. Implement CRUD operations following schema constraints
3. Add data validation based on schema rules
4. Implement proper error handling for constraint violations