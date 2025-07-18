# Calculated KRI Implementation Plan

## Overview

Calculated KRIs derive their final values from multiple atomic data elements through predefined formulas. Unlike simple KRIs where users directly input the final value, calculated KRIs require users to input individual atomic data components that are then processed to generate the final KRI value.

## Current State Analysis

### ✅ Existing Infrastructure
- `kri_atomic` table for atomic data storage
- `KRIDataElements.vue` component for atomic data display
- `isCalculatedKRI()` logic in KRISidebar component
- Atomic data fetching in kriService and Vuex store
- Basic atomic status management

### 🔄 Areas Needing Enhancement
- Atomic data input workflow
- Formula calculation engine
- Validation and completeness checking
- Atomic-level permissions
- Calculated value display and audit

## Technical Architecture

### 1. Database Schema Enhancements

#### KRI Item Table (kri_item)
```sql
-- Add calculation metadata
ALTER TABLE kri_item ADD COLUMN is_calculated BOOLEAN DEFAULT FALSE;
ALTER TABLE kri_item ADD COLUMN calculation_formula TEXT;
ALTER TABLE kri_item ADD COLUMN auto_calculate BOOLEAN DEFAULT TRUE;
ALTER TABLE kri_item ADD COLUMN calculation_status INTEGER DEFAULT 10; -- 10: Pending, 20: Calculated, 30: Override
```

#### Atomic Data Table (kri_atomic) - Enhanced
```sql
-- Current structure is good, but add validation fields
ALTER TABLE kri_atomic ADD COLUMN is_required BOOLEAN DEFAULT TRUE;
ALTER TABLE kri_atomic ADD COLUMN data_type VARCHAR(50) DEFAULT 'number'; -- number, text, percentage, currency
ALTER TABLE kri_atomic ADD COLUMN validation_rules JSONB;
ALTER TABLE kri_atomic ADD COLUMN display_order INTEGER DEFAULT 1;
ALTER TABLE kri_atomic ADD COLUMN atomic_label TEXT;
ALTER TABLE kri_atomic ADD COLUMN atomic_description TEXT;
```

#### Formula Management Table (NEW)
```sql
CREATE TABLE kri_formula (
  formula_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kri_id BIGINT NOT NULL,
  formula_expression TEXT NOT NULL, -- JavaScript-like expression
  formula_type VARCHAR(50) DEFAULT 'javascript', -- javascript, sql, custom
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  FOREIGN KEY (kri_id) REFERENCES kri_item(kri_id)
);
```

### 2. Calculation Engine

#### Formula Expression Examples
```javascript
// Simple sum
"atomic_1 + atomic_2 + atomic_3"

// Percentage calculation
"(atomic_1 / atomic_2) * 100"

// Complex business logic
"IF(atomic_1 > atomic_2, atomic_1 * 1.2, atomic_1 * 0.8)"

// Risk weighted calculation
"SUM(atomic_data.map(item => item.value * item.weight))"
```

#### Calculation Service (NEW)
```javascript
// src/services/calculationService.js
export const calculationService = {
  // Calculate KRI value from atomic data
  async calculateKRIValue(kriId, reportingDate, atomicData),
  
  // Validate atomic data completeness
  validateAtomicCompleteness(atomicData, requiredFields),
  
  // Parse and execute formula
  executeFormula(formula, atomicData),
  
  // Save calculated result
  async saveCalculatedValue(kriId, reportingDate, calculatedValue, atomicSnapshot)
};
```

### 3. UI/UX Design

#### Atomic Data Input Interface
```vue
<!-- Enhanced KRIDataElements.vue -->
<template>
  <div class="atomic-data-input">
    <!-- Calculation Status Header -->
    <div class="calculation-status">
      <el-tag :type="getCalculationStatusType()">
        {{ getCalculationStatusLabel() }}
      </el-tag>
      <el-button 
        v-if="canRecalculate" 
        @click="triggerRecalculation"
        type="primary" 
        size="small">
        Recalculate
      </el-button>
    </div>

    <!-- Atomic Data Input Grid -->
    <div class="atomic-input-grid">
      <div 
        v-for="atomic in sortedAtomicData" 
        :key="atomic.atomic_id"
        class="atomic-input-card">
        
        <!-- Input Field -->
        <el-form-item 
          :label="atomic.atomic_label"
          :required="atomic.is_required">
          <el-input-number
            v-model="atomic.atomic_value"
            :precision="getPrecision(atomic.data_type)"
            :placeholder="getPlaceholder(atomic)"
            :disabled="!canEditAtomic(atomic)"
            @change="handleAtomicChange(atomic)">
          </el-input-number>
        </el-form-item>

        <!-- Validation Status -->
        <div class="atomic-status">
          <el-tag 
            :type="getAtomicStatusType(atomic)"
            size="small">
            {{ mapAtomicStatus(atomic.atomic_status) }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- Calculation Result -->
    <div class="calculation-result">
      <el-card>
        <h3>Calculated KRI Value</h3>
        <div class="calculated-value">
          <span class="value">{{ calculatedValue }}</span>
          <el-button 
            v-if="hasCalculationOverride" 
            @click="showOverrideDialog"
            type="warning" 
            size="small">
            Override
          </el-button>
        </div>
        <div class="formula-display">
          <small>Formula: {{ displayFormula }}</small>
        </div>
      </el-card>
    </div>

    <!-- Action Buttons -->
    <div class="atomic-actions">
      <el-button 
        @click="saveAtomicData"
        :loading="saving"
        type="primary">
        Save Atomic Data
      </el-button>
      <el-button 
        @click="submitForReview"
        :disabled="!isCompleteAndValid"
        type="success">
        Submit for Review
      </el-button>
    </div>
  </div>
</template>
```

#### Sidebar Integration
```vue
<!-- Updated KRISidebar.vue -->
<template>
  <div class="kri-sidebar">
    <!-- Calculated KRI Summary -->
    <el-card v-if="isCalculatedKRI" class="calculation-summary">
      <div slot="header">Calculation Status</div>
      
      <!-- Completeness Progress -->
      <div class="completeness-progress">
        <el-progress 
          :percentage="completenessPercentage"
          :color="getProgressColor(completenessPercentage)">
        </el-progress>
        <p>{{ completeAtomicCount }}/{{ totalAtomicCount }} elements complete</p>
      </div>

      <!-- Formula Preview -->
      <div class="formula-preview">
        <h4>Formula</h4>
        <code>{{ kriData.calculation_formula }}</code>
      </div>

      <!-- Quick Atomic Actions -->
      <div class="quick-atomic-actions" v-if="canEditAtomic">
        <el-button 
          @click="focusNextIncomplete"
          size="small"
          type="primary">
          Next Incomplete
        </el-button>
        <el-button 
          @click="calculatePreview"
          size="small"
          type="info">
          Preview Calculation
        </el-button>
      </div>
    </el-card>

    <!-- Standard Actions (for non-calculated KRIs) -->
    <el-card v-else class="quick-actions">
      <!-- Existing simple KRI actions -->
    </el-card>
  </div>
</template>
```

### 4. Workflow Design

#### Calculated KRI Data Flow
```
1. User Access → Check atomic edit permissions
2. Load Atomic Data → Fetch required atomic elements
3. Input Validation → Validate data types and business rules
4. Auto-Calculation → Trigger when all required fields complete
5. Review & Override → Allow manual override if needed
6. Submit → Move through approval workflow
7. Finalize → Lock atomic data and final value
```

#### Status Management
```javascript
// Atomic-level statuses
const ATOMIC_STATUS = {
  10: 'Pending Input',
  20: 'Validation Error', 
  30: 'Complete',
  40: 'Under Review',
  50: 'Approved'
};

// Calculation-level statuses
const CALCULATION_STATUS = {
  10: 'Pending Atomic Data',
  20: 'Ready for Calculation',
  30: 'Calculated',
  40: 'Manual Override',
  50: 'Under Review',
  60: 'Finalized'
};
```

### 5. Permission Framework

#### Atomic-Level Permissions
```javascript
// Enhanced permission checking
const ATOMIC_PERMISSIONS = {
  'atomic_edit': 'Can edit atomic data values',
  'atomic_review': 'Can review and approve atomic data',
  'calculation_override': 'Can override calculated values',
  'formula_edit': 'Can modify calculation formulas'
};

// Permission checking logic
export const canPerformAtomicAction = (userPermissions, action, atomicStatus, kriItem) => {
  const key = `${kriItem.id}_${kriItem.reportingDate}`;
  
  // Check atomic-specific permissions
  if (!userPermissions[key]?.includes(action)) {
    return false;
  }

  // Status-based atomic action rules
  switch (action) {
    case 'atomic_edit':
      return [10, 20].includes(atomicStatus); // Pending Input, Validation Error
    case 'atomic_review':
      return atomicStatus === 40; // Under Review
    case 'calculation_override':
      return [30, 40].includes(atomicStatus) && kriItem.calculationStatus === 30;
    default:
      return true;
  }
};
```

### 6. Implementation Phases

#### Phase 1: Foundation (2-3 weeks)
- [ ] Database schema updates
- [ ] Enhanced atomic data models
- [ ] Basic calculation service
- [ ] Updated atomic data fetching

#### Phase 2: Core Calculation Engine (2-3 weeks)
- [ ] Formula parser and executor
- [ ] Validation framework
- [ ] Auto-calculation triggers
- [ ] Error handling and logging

#### Phase 3: UI Components (3-4 weeks)
- [ ] Enhanced KRIDataElements component
- [ ] Atomic data input forms
- [ ] Calculation result display
- [ ] Override functionality
- [ ] Updated sidebar integration

#### Phase 4: Workflow Integration (2-3 weeks)
- [ ] Atomic-level permissions
- [ ] Status management
- [ ] Audit trail enhancements
- [ ] Approval workflow updates

#### Phase 5: Advanced Features (2-3 weeks)
- [ ] Formula management interface
- [ ] Bulk atomic data import
- [ ] Calculation history
- [ ] Performance optimization

### 7. API Enhancements

#### New Service Methods
```javascript
// src/services/kriService.js - New methods
export const kriService = {
  // Atomic data management
  async fetchAtomicDataWithFormula(kriId, reportingDate),
  async saveAtomicValue(kriId, reportingDate, atomicId, value, changedBy),
  async validateAtomicData(kriId, reportingDate, atomicData),
  
  // Calculation management
  async calculateKRIValue(kriId, reportingDate),
  async overrideCalculatedValue(kriId, reportingDate, overrideValue, reason, changedBy),
  async getCalculationHistory(kriId, reportingDate),
  
  // Formula management
  async updateKRIFormula(kriId, formula, changedBy),
  async testFormula(formula, sampleData)
};
```

#### Vuex Store Enhancements
```javascript
// src/store/modules/kri.js - New actions
const actions = {
  // Atomic data actions
  async saveAtomicValue({ commit, state }, { kriId, reportingDate, atomicId, value }),
  async calculateKRIValue({ commit, state }, { kriId, reportingDate }),
  async overrideCalculation({ commit, state }, { kriId, reportingDate, value, reason }),
  
  // Validation actions
  async validateAtomicCompleteness({ state }, { kriId, reportingDate }),
  async triggerAutoCalculation({ dispatch }, { kriId, reportingDate })
};
```

### 8. Testing Strategy

#### Unit Tests
- Formula calculation accuracy
- Validation rule enforcement
- Permission checking logic
- Data transformation functions

#### Integration Tests
- End-to-end calculated KRI workflow
- Multi-user atomic data collaboration
- Formula override scenarios
- Audit trail verification

#### Performance Tests
- Calculation speed with large atomic datasets
- Concurrent user editing scenarios
- Formula parsing efficiency

## Success Metrics

### Functional Metrics
- ✅ Users can input atomic data efficiently
- ✅ Calculations are accurate and automatic
- ✅ Override functionality works when needed
- ✅ Audit trail captures all changes
- ✅ Performance meets requirements (<2s calculation time)

### User Experience Metrics
- ✅ Intuitive atomic data input interface
- ✅ Clear calculation status and progress
- ✅ Helpful validation messages
- ✅ Seamless integration with existing workflow

## Risk Mitigation

### Technical Risks
- **Formula Security**: Sandboxed execution environment
- **Performance**: Efficient calculation algorithms and caching
- **Data Integrity**: Comprehensive validation and rollback capabilities

### Business Risks
- **User Adoption**: Gradual rollout with training
- **Data Quality**: Strong validation and approval workflows
- **Compliance**: Audit trail and approval mechanisms

## Next Steps

1. **Review and Approve Plan**: Stakeholder review of requirements
2. **Database Design Review**: DBA review of schema changes
3. **Security Assessment**: Security review of formula execution
4. **Resource Allocation**: Team assignment and timeline planning
5. **Prototype Development**: Build basic calculation engine proof-of-concept

---

*This plan provides a comprehensive roadmap for implementing calculated KRIs while maintaining the existing simple KRI functionality and ensuring a smooth user experience.* 