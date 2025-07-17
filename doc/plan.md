# KRI System Refactoring Plan: Role-Based to Relationship-Based Access Control (ReBAC)

## 🎯 Objective

Transform the current scattered role-based access control system into a clean, maintainable Relationship-Based Access Control (ReBAC) system that clearly separates read, write, and acknowledge permissions based on user-KRI relationships.

## 📊 Current State Analysis

### Problems Identified:
1. **Duplicate Role Definitions**: Role logic scattered across multiple files
   - `src/utils/helpers.js` - USER_ROLES, getRolePermissions, canPerformAction
   - `src/services/kriService.js` - Another getRolePermissions function
   - `src/store/modules/kri.js` - Role-based filtering logic
   
2. **Hardcoded Access Logic**: Business rules mixed with presentation logic
   - Role checks directly in Vue components
   - Status-based permissions hardcoded in helpers
   - Department-based filtering scattered across getters

3. **Maintenance Issues**: 
   - Adding new roles requires changes in multiple files
   - Permission logic is not centralized
   - No clear separation of read/write/acknowledge permissions

## 🏗️ Target ReBAC Architecture

### Core Principles:
1. **Relationship-Based**: Access determined by user's relationship to specific KRIs
2. **Permission Separation**: Clear distinction between READ, WRITE, and ACKNOWLEDGE
3. **Centralized Logic**: Single source of truth for access control
4. **Backend-Driven**: Permissions fetched from database, not hardcoded

### Permission Types:
- **READ**: View KRI data and details
- **WRITE**: Input/edit KRI values and data
- **ACKNOWLEDGE**: Approve/reject KRI submissions

### Relationship Types:
- **OWNER**: User is the KRI owner
- **DATA_PROVIDER**: User/department provides data for the KRI
- **DATA_APPROVER**: User can approve data provider submissions
- **KRI_APPROVER**: User can approve final KRI submissions
- **DEPARTMENT_MEMBER**: User belongs to relevant department
- **ADMIN**: User has system-wide permissions

## 📅 Implementation Plan

### Phase 1: Database & Backend Preparation (Day 1)

#### Step 1.1: Database Schema Enhancement
**Time: 2 hours**

Create new tables for ReBAC:

```sql
-- User-KRI Relationships table
CREATE TABLE user_kri_relationships (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  kri_id INTEGER NOT NULL,
  reporting_date INTEGER NOT NULL,
  relationship_type VARCHAR(50) NOT NULL, -- OWNER, DATA_PROVIDER, DATA_APPROVER, KRI_APPROVER
  granted_by VARCHAR(255),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Permission definitions table
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  permission_name VARCHAR(50) NOT NULL, -- READ, WRITE, ACKNOWLEDGE
  description TEXT
);

-- Relationship permissions mapping
CREATE TABLE relationship_permissions (
  id SERIAL PRIMARY KEY,
  relationship_type VARCHAR(50) NOT NULL,
  permission_name VARCHAR(50) NOT NULL,
  kri_status INTEGER[], -- Which statuses this permission applies to
  conditions JSONB -- Additional conditions (e.g., same department)
);
```

#### Step 1.2: Backend API Endpoints
**Time: 3 hours**

Create new service methods:

```javascript
// In kriService.js
async fetchUserKRIRelationships(userId, reportingDate)
async fetchKRIPermissions(userId, kriId, reportingDate) 
async checkUserPermission(userId, kriId, reportingDate, permissionType)
async grantKRIAccess(userId, kriId, relationshipType, grantedBy)
async revokeKRIAccess(userId, kriId, relationshipType)
```

### Phase 2: Core ReBAC Implementation (Day 1-2)

#### Step 2.1: Create ReBAC Service
**Time: 4 hours**
**File: `src/services/rebacService.js`**

```javascript
export class RebacService {
  async getUserPermissions(userId, kriId, reportingDate) {
    // Fetch user-KRI relationships from backend
    // Return { read: boolean, write: boolean, acknowledge: boolean }
  }
  
  async getFilteredKRIs(userId, permissionType = 'READ') {
    // Return KRIs user has specified permission for
  }
  
  async canUserPerformAction(userId, kriId, action, currentStatus) {
    // Check if user can perform specific action on KRI
  }
}
```

#### Step 2.2: Update Store Module
**Time: 3 hours**
**File: `src/store/modules/kri.js`**

Replace role-based logic with relationship-based:

```javascript
// Remove all role-based filtering
// Replace with ReBAC service calls
// Update getters to use permissions instead of roles

getters: {
  readableKRIs: (state) => {
    // Return KRIs user can read
  },
  writableKRIs: (state) => {
    // Return KRIs user can write to
  },
  approvableKRIs: (state) => {
    // Return KRIs user can approve
  }
}
```

#### Step 2.3: Clean Up Duplicate Code
**Time: 2 hours**

1. **Remove from `src/utils/helpers.js`**:
   - USER_ROLES constant
   - getRolePermissions function
   - canPerformAction function (replace with ReBAC calls)

2. **Remove from `src/services/kriService.js`**:
   - getRolePermissions method
   - Role-specific authentication logic

3. **Update `src/store/modules/kri.js`**:
   - Remove role-based getters
   - Simplify user state (remove role field, keep relationships)

### Phase 3: Frontend Integration (Day 2)

#### Step 3.1: Update Components
**Time: 4 hours**

**Files to update:**
- `src/views/Dashboard.vue`
- `src/views/KRIPendingInput.vue`
- `src/views/KRIPendingApproval.vue`
- `src/components/KRITable.vue`
- `src/components/KRITableCollectData.vue`

**Changes:**
- Replace role checks with permission checks
- Use ReBAC service for filtering
- Update button visibility logic

#### Step 3.2: Update Login System
**Time: 2 hours**
**File: `src/views/Login.vue`**

```javascript
// Remove role selection
// Fetch user relationships after login
// Update user state with permissions instead of roles
```

### Phase 4: Testing & Migration (Day 2-3)

#### Step 4.1: Create Migration Script
**Time: 3 hours**
**File: `scripts/migrateToReBAC.js`**

```javascript
// Script to migrate existing role-based data to relationships
// Map current users to appropriate KRI relationships
// Populate user_kri_relationships table
```

#### Step 4.2: Unit Tests
**Time: 4 hours**
**File: `tests/rebac.test.js`**

Test ReBAC service methods:
- Permission checking
- Relationship management
- KRI filtering

#### Step 4.3: Integration Testing
**Time: 2 hours**

Test complete workflows:
- User login and permission loading
- KRI filtering by permissions
- Action permission checking

### Phase 5: Documentation & Cleanup (Day 3)

#### Step 5.1: Update Documentation
**Time: 2 hours**

1. **Create `doc/ReBAC_GUIDE.md`**:
   - How to add new relationships
   - Permission matrix
   - Troubleshooting guide

2. **Update `README.md`**:
   - New architecture overview
   - Setup instructions

#### Step 5.2: Code Cleanup
**Time: 1 hour**

- Remove commented-out role-based code
- Clean up unused imports
- Update component comments

## 🔄 Detailed ReBAC Permission Matrix

| Relationship Type | KRI Status | READ | WRITE | ACKNOWLEDGE |
|------------------|------------|------|-------|-------------|
| OWNER | All | ✓ | ✓ (10,20) | ✗ |
| DATA_PROVIDER | All | ✓ | ✓ (10,20,30) | ✗ |
| DATA_APPROVER | All | ✓ | ✗ | ✓ (40) |
| KRI_APPROVER | All | ✓ | ✗ | ✓ (50) |
| DEPARTMENT_MEMBER | All | ✓ | ✗ | ✗ |
| ADMIN | All | ✓ | ✓ | ✓ |

## 🚀 Migration Strategy

### Backward Compatibility:
1. Keep role field in user object during transition
2. Implement both systems in parallel
3. Gradual migration with feature flags
4. Remove role-based system after verification

### Data Migration:
1. **Current Users → Relationships**:
   - Data Provider → DATA_PROVIDER relationship for their department's KRIs
   - KRI Owner → OWNER relationship for their KRIs
   - Data Approver → DATA_APPROVER for their department
   - KRI Approver → KRI_APPROVER for their department

### Rollback Plan:
1. Keep original role-based code in separate branch
2. Database backup before migration
3. Quick rollback procedure documented

## 📊 Success Metrics

1. **Code Quality**:
   - Reduce role-related code duplication by 80%
   - Centralize access control to 1 service
   - Improve test coverage to >90%

2. **Performance**:
   - Reduce permission check time
   - Optimize database queries
   - Improve page load times

3. **Maintainability**:
   - Single place to add new relationship types
   - Clear permission rules
   - Easier testing and debugging

## ⚠️ Risks & Mitigation

1. **Risk**: Complex migration breaks existing functionality
   **Mitigation**: Parallel implementation with feature toggle

2. **Risk**: Performance impact from additional database queries
   **Mitigation**: Implement caching layer for permissions

3. **Risk**: User confusion with new permission system
   **Mitigation**: Clear documentation and gradual rollout

## 📝 Implementation Checklist

### Day 1:
- [ ] Create database schema for ReBAC
- [ ] Implement backend API endpoints
- [ ] Create RebacService class
- [ ] Update store module structure

### Day 2:
- [ ] Update all Vue components
- [ ] Modify login system
- [ ] Create migration script
- [ ] Write unit tests

### Day 3:
- [ ] Run integration tests
- [ ] Update documentation
- [ ] Clean up old code
- [ ] Deploy to staging environment

### Post-Implementation:
- [ ] Monitor performance metrics
- [ ] Gather user feedback
- [ ] Plan additional relationship types
- [ ] Consider advanced ReBAC features

---

**Estimated Total Time**: 3 days (24 hours)
**Priority**: High
**Dependencies**: Database access, staging environment
**Reviewer**: System architect, Security team