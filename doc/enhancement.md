# Department Admin and Enhanced Admin Panel Implementation Plan

## Current State Analysis

**Existing Infrastructure:**
- Database schema with `kri_user` table containing `department` field
- Current `AdminManagement.vue` view with basic user and permission management
- Permission system via `kri_user_permission` table with KRI-level access control
- Relationship-based access through `owner` and `data_provider` fields in `kri_metadata`

## Core Changes Required

### 1. Database Schema Enhancements
**Add new user role field to `kri_user` table:**
- Add `user_role` column with values: `user`, `dept_admin`, `admin`
- Maintain backward compatibility with existing records (default to `user`)

### 2. Permission Logic Extensions
**Extend `src/utils/permission.js`:**
- Add department-level permission checking methods
- Add role-based permission validation for department admins
- Add methods to check if user can manage department members' permissions

### 3. Enhanced Admin Panel Features
**Upgrade `src/views/AdminManagement.vue`:**
- Add role management section with role assignment UI
- Add department-specific user filtering and management
- Add bulk permission management for department members
- Add department admin delegation interface

### 4. Department Admin Dashboard
**Create new view `src/views/DepartmentAdmin.vue`:**
- Department-specific KRI overview and statistics
- Department member permission management interface
- Bulk permission operations for KRIs owned by their department

### 5. Access Control Implementation
**Router and service-level restrictions:**
- Update router guards to check user roles
- Add department-based filtering in services
- Implement permission inheritance for department admins

### 6. UI/UX Enhancements
**Add role-based UI elements:**
- Role indicators in user tables and profiles
- Department admin action buttons
- Filtered views based on user role and department

## Implementation Strategy

**Phase 1: Core Infrastructure**
1. Database schema updates and migration
2. Permission system extensions
3. Service layer enhancements

**Phase 2: Admin Panel Enhancement**
1. Upgrade existing AdminManagement view
2. Add role management functionality
3. Implement department-specific filtering

**Phase 3: Department Admin Features**
1. Create DepartmentAdmin view
2. Add department member management
3. Implement bulk permission operations

**Phase 4: Integration & Polish**
1. Update routing and navigation
2. Add role-based UI elements
3. Testing and validation

## Detailed Implementation Plan

### Database Changes

#### 1. Add user_role column to kri_user table
```sql
ALTER TABLE kri_user ADD COLUMN user_role VARCHAR(20) DEFAULT 'user' CHECK (user_role IN ('user', 'dept_admin', 'admin'));
```

#### 2. Update existing records
```sql
-- Set admin role for admin department users
UPDATE kri_user SET user_role = 'admin' WHERE department = 'admin';
```

### Permission System Enhancements

#### 1. Extend Permission class (`src/utils/permission.js`)

Add new methods:
- `canManageDepartmentUsers(currentUser, targetUser)` - Check if user can manage another user
- `canAssignPermissions(currentUser, targetKRI)` - Check if user can assign permissions for specific KRIs
- `getDepartmentKRIs(department)` - Get all KRIs owned by a department
- `getUserRole(user)` - Get user role with proper validation

#### 2. Role-based Access Logic

**Admin (department == 'admin'):**
- Full system access
- Can manage all users and permissions
- Can view all KRIs regardless of department

**Department Admin (user_role == 'dept_admin'):**
- Can manage users within their own department
- Can modify permissions for KRIs where their department is the owner
- Cannot modify permissions for KRIs where their department is only data_provider

**Regular User (user_role == 'user'):**
- Current permission system unchanged
- Individual KRI-level permissions only

### Service Layer Changes

#### 1. Update kriService.js
Add methods:
- `getUsersByDepartment(department)` - Get all users in a department
- `getDepartmentKRIs(department)` - Get KRIs owned by department
- `updateUserRole(userId, newRole)` - Update user role with validation
- `bulkUpdatePermissions(permissions)` - Batch permission updates

#### 2. Add Department Admin Service
Create `src/services/departmentAdminService.js`:
- Handle department-specific operations
- Bulk permission management
- Department statistics and reporting

### UI Components

#### 1. Enhanced AdminManagement.vue
**Add new sections:**
- Role management tab with role assignment interface
- Department filter for user management
- Bulk permission operations
- Department admin promotion/demotion interface

**Key features:**
- Visual role indicators (badges/tags)
- Department-based user filtering
- Bulk select for permission changes
- Role change confirmation dialogs

#### 2. New DepartmentAdmin.vue
**Main sections:**
- Department KRI dashboard with statistics
- Team member management interface
- Permission bulk operations for department KRIs
- Department-specific audit trail

**Key features:**
- Department KRI overview charts
- Permission matrix for team members
- Quick permission templates
- Bulk approve/reject workflows

### Router Updates

#### 1. Add new routes
```javascript
{
  path: '/dept-admin',
  name: 'DepartmentAdmin',
  component: DepartmentAdmin,
  meta: { 
    requiresAuth: true,
    requiresRole: 'dept_admin'
  }
}
```

#### 2. Enhanced route guards
- Add role-based route protection
- Department admin access validation
- Redirect logic for insufficient permissions

### Access Control Logic

#### 1. Department Admin Permissions
**Can manage:**
- Users in their own department
- Permissions for KRIs owned by their department (where department appears in kri_metadata.owner field)
- View department-specific audit trails

**Cannot manage:**
- Users in other departments
- KRIs owned by other departments
- System-wide settings
- Admin users

#### 2. Permission Inheritance
**Department Admin inherits:**
- View access to all KRIs owned by their department
- Edit permissions for department team management
- Audit trail access for department activities

### Validation & Security

#### 1. Business Logic Validation
- Prevent department admins from escalating their own privileges
- Ensure department admins cannot modify permissions for KRIs they don't own
- Validate that permission changes maintain workflow integrity

#### 2. Audit Trail Enhancement
- Log all role changes with admin approval
- Track department admin permission modifications
- Maintain separation of duties in audit logs

### Migration Strategy

#### 1. Database Migration
- Add user_role column with default values
- Update existing admin users
- Add indexes for performance

#### 2. Backward Compatibility
- Existing permission system continues to work
- Gradual rollout of department admin features
- Fallback to current admin panel if needed

#### 3. Data Validation
- Ensure all users have valid departments
- Validate KRI ownership data in metadata
- Check permission consistency

## Benefits

**For System Administrators:**
- Reduced administrative overhead
- Better scalability as organization grows
- Maintained control over system-wide settings

**For Department Administrators:**
- Autonomous management of team permissions
- Department-specific KRI insights
- Streamlined workflow for team coordination

**For Regular Users:**
- No change to existing workflows
- Better support through department admins
- More responsive permission updates

**For the System:**
- Better separation of concerns
- Improved audit trail granularity
- More scalable permission management

## Risk Mitigation

**Security Risks:**
- Department admins cannot escalate to system admin
- Strict validation of permission scope
- Audit trail for all administrative actions

**Operational Risks:**
- Fallback to current admin system if needed
- Gradual feature rollout
- Comprehensive testing of permission logic

**Data Integrity:**
- Validation of department ownership data
- Permission consistency checks
- Backup and recovery procedures for role changes