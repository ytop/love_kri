# KRI Permission System Documentation

## Overview

The KRI (Key Risk Indicator) system implements a sophisticated multi-level permission system that combines role-based access control (RBAC) with granular KRI-level and atomic-level permissions. This system ensures secure access to sensitive risk management data while providing flexible administration capabilities.

## Database Schema

### Core Permission Tables

#### `kri_user` Table

```sql
CREATE TABLE public.kri_user (
  uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  user_name character varying,
  department character varying,
  other_info text DEFAULT 'anything'::text,
  user_role character varying DEFAULT 'user'::character varying CHECK (user_role::text = ANY (ARRAY['user'::character varying, 'dept_admin'::character varying, 'admin'::character varying]::text[])),
  CONSTRAINT kri_user_pkey PRIMARY KEY (uuid)
);
```

**Key Fields:**

- `uuid`: Primary key, auto-generated UUID
- `user_id`: Unique user identifier
- `user_name`: Display name
- `department`: User's department affiliation
- `user_role`: Role-based access level (`user`, `dept_admin`, `admin`)

#### `kri_user_permission` Table (Normalized Structure)

```sql
CREATE TABLE public.kri_user_permission (
  user_uuid uuid NOT NULL,
  kri_id bigint NOT NULL,
  reporting_date integer NOT NULL,
  action varchar(50) NOT NULL, -- Individual permission action
  effect boolean DEFAULT true,
  condition json,
  created_date timestamp without time zone DEFAULT now(),
  update_date timestamp without time zone DEFAULT now(),
  kri_code text,
  CONSTRAINT kri_user_permission_pkey PRIMARY KEY (user_uuid, kri_id, reporting_date, action)
);
```

**Key Fields:**

- `user_uuid`: Foreign key to kri_user.uuid
- `kri_id`: KRI identifier
- `reporting_date`: Reporting period (YYYYMMDD format)
- `action`: Individual permission action (e.g., 'edit', 'view', 'atomic1.edit')
- `effect`: Boolean flag for permission effect (true = grant, false = deny)

**Database Design:**
- **Normalized Structure**: Each permission is stored as a separate row
- **Dot Notation**: Atomic permissions use format `atomic1.edit`, `atomic2.view`
- **Primary Key**: Composite key includes action for unique permission records
- **Performance**: Indexed for efficient querying and filtering

#### `kri_metadata` Table

```sql
CREATE TABLE public.kri_metadata (
  metadata_id bigint NOT NULL DEFAULT nextval('kri_metadata_metadata_id_seq'::regclass),
  kri_code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  formula text,
  owner text,
  data_provider text,
  -- ... other fields
  CONSTRAINT kri_metadata_pkey PRIMARY KEY (metadata_id)
);
```

**Key Fields:**

- `owner`: Department that owns the KRI
- `data_provider`: Department responsible for data provision

## Permission Types

### 1. Role-Based Permissions

#### User Roles

- **`user`**: Regular user with KRI-level permissions only
- **`dept_admin`**: Department administrator with department-level management capabilities
- **`admin`**: System administrator with full system access

#### Role Hierarchy

```
admin (System Admin)
├── Full system access
├── Can manage all users and departments
├── Can assign any role to any user
└── Can manage permissions for all KRIs

dept_admin (Department Admin)
├── Can manage users within their department
├── Can assign dept_admin role to department users
├── Can manage permissions for KRIs owned by their department
└── Cannot promote users to system admin

user (Regular User)
├── Individual KRI-level permissions only
├── No user management capabilities
└── No role assignment capabilities
```

### 2. KRI-Level Permissions

#### Permission Actions

```javascript
export const USER_PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit', 
  REVIEW: 'review',
  ACKNOWLEDGE: 'acknowledge',
  DELETE: 'delete'
};
```

#### Permission Format (Normalized)

Permissions are stored as individual database records, one per action:

```sql
-- Example permission records for a user on KRI 1:
INSERT INTO kri_user_permission VALUES 
  ('uuid-123', 1, 20250630, 'view', true),
  ('uuid-123', 1, 20250630, 'edit', true),
  ('uuid-123', 1, 20250630, 'review', true);
```

### 3. Atomic-Level Permissions

#### Atomic Permission Format (Dot Notation)

Atomic permissions use dot notation pattern `atomic{id}.{action}`:

```sql
-- Example atomic permission records:
INSERT INTO kri_user_permission VALUES 
  ('uuid-123', 1, 20250630, 'atomic1.edit', true),
  ('uuid-123', 1, 20250630, 'atomic1.view', true),
  ('uuid-123', 1, 20250630, 'atomic2.edit', true),
  ('uuid-123', 1, 20250630, 'atomic2.view', true);
```

#### Atomic Permission Patterns

```javascript
export const ATOMIC_PERMISSION_PATTERNS = {
  ATOMIC_EDIT: /^atomic\d+\.edit$/,
  ATOMIC_VIEW: /^atomic\d+\.view$/,
  ATOMIC_REVIEW: /^atomic\d+\.review$/,
  ATOMIC_ACKNOWLEDGE: /^atomic\d+\.acknowledge$/,
  ATOMIC_DELETE: /^atomic\d+\.delete$/
};
```

**Important**: Atomic permissions do NOT fall back to general KRI-level permissions. Each atomic element requires explicit permission assignment.

## Permission Logic Implementation

### Core Permission Class (`src/utils/permission.js`)

#### Permission Checking Methods

```javascript
// Base permission checking method
static canPerform(kriId, atomicId, action, userPermissions)

// Specific permission checks
static canEdit(kriId, atomicId, userPermissions)
static canView(kriId, atomicId, userPermissions)
static canReview(kriId, atomicId, userPermissions)
static canAcknowledge(kriId, atomicId, userPermissions)
static canDelete(kriId, atomicId, userPermissions)
```

#### Permission Record Processing

```javascript
static findKRIPermissions(userPermissions, kriId)
// Returns array of permission records for the specified KRI
// Each record: { kri_id, action, effect, ... }

static extractActionsFromRecords(permissionRecords)
// Extracts action strings from permission records
// Filters out denied permissions (effect=false)
```

#### Atomic Permission Logic

```javascript
static canPerform(kriId, atomicId, action, userPermissions)
// For atomicId !== null: checks for "atomic{id}.{action}" record
// For atomicId === null: checks for general "{action}" record
// Returns true only if record exists with effect=true
```

### Role-Based Permission Methods

#### User Role Checking

```javascript
static isSystemAdmin(user)
static isDepartmentAdmin(user)
static needsAdminInterface(user)
```

#### Department Management

```javascript
static canManageDepartment(currentUser, targetDepartment)
static canManageUser(currentUser, targetUser)
static canAssignPermissions(currentUser, kriMetadata)
```

#### Role Assignment Control

```javascript
static canChangeUserRole(currentUser, targetUser, newRole)
static getAssignableRoles(currentUser)
```

### Workflow-Based Permission Logic

#### Status-Based Action Requirements

```javascript
static needsUserAction(kriItem, userPermissions)
```

**Status Mapping:**

- **10 (PENDING_INPUT)**: Requires `edit` permission
- **20 (UNDER_REWORK)**: Requires `edit` permission
- **30 (SAVED)**: Requires `edit` permission
- **40 (SUBMITTED_TO_DATA_PROVIDER_APPROVER)**: Requires `review` permission
- **50 (SUBMITTED_TO_KRI_OWNER_APPROVER)**: Requires `acknowledge` permission
- **60 (FINALIZED)**: No action required

#### Evidence Upload Requirements

```javascript
static requiresEvidenceUpload(kriStatus)
static canSaveKRI(kriId, kriItem, evidenceData, userPermissions, inputValue)
```

**Evidence Logic:**

- Status 10 (PENDING_INPUT) and 20 (UNDER_REWORK) require evidence upload
- Other statuses only require valid KRI value and edit permission

## Permission Assignment and Management

### Permission Templates

The system provides predefined permission templates for common use cases:

```javascript
permissionTemplates: {
  viewer: {
    name: 'Viewer',
    description: 'View-only access to KRIs',
    actions: ['view']
  },
  editor: {
    name: 'Editor', 
    description: 'View and edit access to KRIs',
    actions: ['view', 'edit']
  },
  dataProvider: {
    name: 'Data Provider',
    description: 'Data provider permissions including review',
    actions: ['view', 'edit', 'review']
  },
  kriOwner: {
    name: 'KRI Owner',
    description: 'Full KRI ownership permissions',
    actions: ['view', 'edit', 'review', 'acknowledge']
  }
}
```

### Bulk Permission Operations

#### Bulk Permission Updates

```javascript
async bulkUpdateUserPermissions(permissionUpdates, userId)
```

#### Template Application

```javascript
async applyPermissionTemplate(templateKey, userIds, kriIds, currentUser)
```

### Department-Specific Permission Management

#### Department Admin Capabilities

- Manage users within their department
- Assign permissions for KRIs owned by their department
- Cannot manage KRIs where their department is only data provider
- Cannot promote users to system admin role

#### System Admin Capabilities

- Full system access
- Can manage all users and departments
- Can assign any role to any user
- Can manage permissions for all KRIs

## Implementation Patterns and Architecture

### Design Principles

#### 1. Separation of Concerns
- **Permission Logic**: Centralized in `Permission` utility class
- **Role Management**: Handled by role-based methods
- **Workflow Integration**: Status-based permission requirements
- **UI Integration**: Component-level permission checking

#### 2. No Permission Inheritance
- Atomic permissions do not fall back to KRI-level permissions
- Each permission level requires explicit assignment
- Prevents unintended access escalation

#### 3. Composite Key Design
- Permissions are tied to `(kri_id, reporting_date)` composite key
- Allows time-based permission management
- Supports historical permission tracking

#### 4. Template-Based Assignment
- Predefined permission templates ensure consistency
- Reduces manual permission configuration errors
- Supports bulk operations efficiently

### Architectural Decisions

#### 1. Static Utility Class Pattern
```javascript
class Permission {
  static canPerform(kriId, atomicId, action, userPermissions) { ... }
  static canEdit(kriId, atomicId, userPermissions) { ... }
  // ... other static methods
}
```

**Benefits:**
- No instantiation required
- Consistent API across components
- Easy to test and mock
- Clear separation from component logic

#### 2. Mixin-Based Component Integration
```javascript
// adminPermissionMixin.js
export default {
  methods: {
    async bulkUpdateUserPermissions(permissionUpdates, userId) { ... }
    async applyPermissionTemplate(templateKey, userIds, kriIds, currentUser) { ... }
  }
}
```

**Benefits:**
- Reusable permission logic across components
- Consistent permission management UI
- Centralized template definitions

#### 3. Service Layer Abstraction
```javascript
// kriService.js, adminService.js, departmentAdminService.js
class AdminService {
  async getPermissionManagementData(filters = {}, currentUser) { ... }
  validateAdminOperation(currentUser, operation, target = null) { ... }
}
```

**Benefits:**
- Business logic separation from UI
- Centralized data access patterns
- Consistent error handling

#### 4. Status-Driven Workflow
```javascript
static needsUserAction(kriItem, userPermissions) {
  const status = kriItem.kriStatus;
  switch (status) {
    case 10: // PENDING_INPUT
      return Permission.canEdit(kriId, null, userPermissions);
    case 40: // SUBMITTED_TO_DATA_PROVIDER_APPROVER
      return Permission.canReview(kriId, null, userPermissions);
    // ...
  }
}
```

**Benefits:**
- Clear workflow progression
- Status-specific permission requirements
- Automatic action determination

### Data Flow Patterns

#### 1. Permission Initialization
```javascript
// Store initialization with normalized permissions
commit('SET_USER_PERMISSIONS', normalizedPermissions);
// Each permission is already a separate record - no parsing needed
// Records: [{ kri_id, action, effect, ... }, ...]
```

#### 2. Component Permission Checking
```javascript
// In Vue components
computed: {
  canEditKRI() {
    return Permission.canEdit(this.kriId, null, this.userPermissions);
  },
  canEditAtomic() {
    return Permission.canEdit(this.kriId, this.atomicId, this.userPermissions);
  }
}
```

#### 3. Bulk Operation Flow
```javascript
// 1. Template selection
// 2. User/KRI selection
// 3. Permission validation
// 4. Bulk update execution
// 5. Audit logging
// 6. UI refresh
```

### Performance Optimizations

#### 1. Direct Permission Record Access
```javascript
// No parsing needed - permissions are already normalized
// Direct filtering and querying of permission records
const kriPermissions = userPermissions.filter(p => p.kri_id === kriId);
```

#### 2. Cached Permission Checks
```javascript
// Component-level caching of permission results
computed: {
  userPermissions() {
    return this.$store.state.kri.userPermissions;
  }
}
```

#### 3. Bulk Database Operations
```javascript
// Single database transaction for multiple permission updates
await kriService.bulkUpdatePermissions(updates, userId);
```

## Security Considerations

### Permission Validation

- All permission strings are validated against `USER_PERMISSIONS` constants
- Atomic permissions are validated using regex patterns
- Role assignments are restricted based on current user's role

### Audit Trail

- All permission changes are logged in `kri_audit_trail` table
- User actions are tracked with timestamps and user identification
- Permission modifications include before/after values

### Data Isolation

- Department admins can only access data within their department
- Users can only access KRIs for which they have explicit permissions
- No permission inheritance between atomic and KRI levels

## Integration Points

### Vue Components

- Permission checking is integrated into Vue components via mixins
- UI elements are conditionally rendered based on permissions
- Action buttons are disabled/enabled based on user capabilities

### Services Layer

- `kriService.js`: Core KRI operations with permission validation
- `adminService.js`: Admin-specific operations with role-based access
- `departmentAdminService.js`: Department-level operations

### Router Guards

- Route access is controlled based on user roles
- Admin routes require appropriate role permissions
- Department admin routes are filtered by department

## Best Practices

### Permission Assignment

1. Always use permission templates for consistency
2. Grant minimum required permissions (principle of least privilege)
3. Regularly audit permission assignments
4. Use bulk operations for efficiency

### Security Guidelines

1. Never bypass permission checks in components
2. Always validate permissions on both client and server side
3. Log all permission-related actions
4. Regularly review and update permission assignments

### Performance Considerations

1. Cache parsed permission arrays to avoid repeated parsing
2. Use bulk operations for multiple permission updates
3. Implement proper indexing on permission table composite keys
4. Consider permission pre-filtering in database queries

## Troubleshooting

### Common Issues

1. **Atomic permissions not working**: Ensure atomic permissions are explicitly assigned with dot notation (e.g., `atomic1.edit`)
2. **Department admin access denied**: Verify KRI ownership vs data provider relationship
3. **Role assignment failures**: Check current user's role assignment capabilities
4. **Permission record errors**: Validate action format and ensure records exist with effect=true
5. **Migration issues**: Verify old comma-separated permissions were properly converted to normalized records

### Debug Methods

```javascript
// Get all permissions for a KRI
Permission.getKRIPermissions(kriId, userPermissions)

// Check if user has any permissions
Permission.hasAnyPermission(kriId, userPermissions)

// Validate permission actions
Permission.isValidAction(action)

// Find permission records for debugging
Permission.findKRIPermissions(userPermissions, kriId)

// Extract atomic ID from dot notation
getAtomicIdFromPermission('atomic1.edit') // returns 1
```

## Database Migration: Normalized Permission Structure

### Migration Overview

The permission system was migrated from a comma-separated string format to a fully normalized database structure to improve performance, maintainability, and query flexibility.

### Migration Details

#### Before (Legacy Format)
```sql
-- Old structure with comma-separated actions
CREATE TABLE kri_user_permission_old (
  user_uuid uuid,
  kri_id bigint,
  reporting_date integer,
  actions varchar, -- "view,edit,atomic1_edit,atomic2_view"
  PRIMARY KEY (user_uuid, kri_id, reporting_date)
);
```

#### After (Normalized Format)
```sql
-- New normalized structure with individual permission records
CREATE TABLE kri_user_permission (
  user_uuid uuid,
  kri_id bigint,
  reporting_date integer,
  action varchar(50), -- "view", "edit", "atomic1.edit", "atomic2.view"
  effect boolean DEFAULT true,
  PRIMARY KEY (user_uuid, kri_id, reporting_date, action)
);
```

### Migration Process

1. **Create normalized table** with dot notation support
2. **Parse existing comma-separated permissions** using PostgreSQL functions
3. **Convert underscore to dot notation**: `atomic1_edit` → `atomic1.edit`
4. **Insert individual permission records** for each action
5. **Replace old table** with new normalized structure
6. **Update application code** to work with normalized data

### Benefits of Normalized Structure

#### 1. **Performance Improvements**
- **Direct database queries** instead of string parsing
- **Efficient filtering** with WHERE clauses on action column
- **Better indexing** for atomic permission queries
- **Reduced client-side processing** overhead

#### 2. **Query Flexibility**
```sql
-- Easy to query specific permission types
SELECT * FROM kri_user_permission WHERE action = 'edit';

-- Simple atomic permission filtering  
SELECT * FROM kri_user_permission WHERE action LIKE 'atomic%.edit';

-- Permission counting and analytics
SELECT action, COUNT(*) FROM kri_user_permission GROUP BY action;
```

#### 3. **Maintainability**
- **Cleaner code** - no string parsing logic
- **Type safety** - each permission is a proper database record
- **Easier debugging** - permissions are visible as individual records
- **Simpler updates** - add/remove individual permissions without string manipulation

#### 4. **Extensibility**
- **Easy to add metadata** to individual permissions
- **Granular permission control** with effect flags
- **Condition-based permissions** using JSON conditions
- **Audit trail integration** for individual permission changes

### Code Changes Summary

#### Permission Utility Class Updates
```javascript
// Old approach - string parsing
static parsePermissionString(permissionString) {
  return permissionString.split(',').map(a => a.trim());
}

// New approach - direct record filtering
static findKRIPermissions(userPermissions, kriId) {
  return userPermissions.filter(p => p.kri_id === kriId);
}
```

#### Store Integration Updates
```javascript
// Old approach - parse comma-separated strings
const parsedPermissions = rawPermissions.map(permission => ({
  ...permission,
  actionsArray: permission.actions.split(',').map(a => a.trim())
}));

// New approach - use normalized records directly
const normalizedPermissions = await kriService.fetchUserPermission(...);
commit('SET_USER_PERMISSIONS', normalizedPermissions);
```

#### Helper Function Updates
```javascript
// Updated regex patterns for dot notation
export const ATOMIC_PERMISSION_PATTERNS = {
  ATOMIC_EDIT: /^atomic\d+\.edit$/,    // was: /^atomic\d+_edit$/
  ATOMIC_VIEW: /^atomic\d+\.view$/,    // was: /^atomic\d+_view$/
  // ...
};

// Updated atomic ID extraction
export const getAtomicIdFromPermission = (permission) => {
  const match = permission.match(/^atomic(\d+)\./); // was: /^atomic(\d+)_/
  return match ? parseInt(match[1], 10) : null;
};
```

This normalized permission system provides a robust, scalable foundation for managing access to KRI data while maintaining security and operational flexibility. The migration to a normalized structure with dot notation ensures better performance, maintainability, and future extensibility.
