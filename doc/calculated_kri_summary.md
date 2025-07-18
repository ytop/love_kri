# Calculated KRI Feature - Executive Summary

## 🎯 **Project Overview**

**Objective**: Extend the existing KRI management system to support **Calculated KRIs** - KRIs that derive their values from multiple atomic data elements through automated formulas.

**Current State**: ✅ Simple KRI data input workflow is working (save, submit, approve, finalize)

**Next Phase**: 🚀 Add support for complex KRIs with atomic data elements and automatic calculation

## 📊 **Business Value**

### **Enhanced Data Quality**
- **Granular Data Input**: Users enter specific atomic components instead of final calculated values
- **Automatic Validation**: Built-in data type and business rule validation
- **Reduced Manual Errors**: Automated calculations eliminate human calculation mistakes

### **Improved Transparency** 
- **Formula Visibility**: Users can see exactly how KRI values are calculated
- **Audit Trail**: Complete tracking of atomic data changes and calculations
- **Override Capability**: Manual override with justification when needed

### **Operational Efficiency**
- **Consistent Calculations**: Standardized formulas across all reporting periods
- **Faster Data Entry**: Focused atomic data input vs complex calculations
- **Real-time Updates**: Automatic recalculation when atomic data changes

## 🏗️ **Technical Architecture**

### **Database Enhancements**
```
kri_item table: + is_calculated, calculation_formula, auto_calculate
kri_atomic table: + validation_rules, data_type, is_required, atomic_label  
kri_formula table: NEW - formula management and versioning
```

### **Key Components**
- **Calculation Engine**: Safe formula execution with JavaScript expressions
- **Validation Framework**: Data type and business rule validation
- **Atomic Data UI**: Enhanced input interface for atomic elements
- **Permission System**: Granular permissions for atomic vs calculated data

### **Example Workflow**
```
User Input:  Revenue = $1,000,000
            Losses = $25,000
            
Formula:    (Losses / Revenue) * 100

Calculated: 2.5% Risk Ratio
```

## 📅 **Implementation Timeline**

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1: Foundation** | 3 weeks | Database schema, basic services |
| **Phase 2: Calculation Engine** | 3 weeks | Formula parser, auto-calculation |
| **Phase 3: UI Components** | 4 weeks | Atomic data interface, results display |
| **Phase 4: Workflow Integration** | 3 weeks | Permissions, status management |
| **Phase 5: Advanced Features** | 3 weeks | Formula management, optimization |

**Total Duration**: ~16 weeks (~4 months)

## 🎛️ **User Experience**

### **For Data Input Users**
- **Simplified Interface**: Input atomic components instead of complex calculations
- **Real-time Validation**: Immediate feedback on data quality
- **Progress Tracking**: Visual progress of completeness
- **Auto-calculation**: Instant results as data is entered

### **For Reviewers/Approvers**
- **Formula Transparency**: See how values are calculated
- **Override Capability**: Ability to manually adjust when needed
- **Audit Visibility**: Complete change history
- **Validation Status**: Clear indicators of data quality

### **For Administrators**
- **Formula Management**: Define and update calculation formulas
- **Permission Control**: Granular access control
- **Performance Monitoring**: Calculation performance metrics
- **Data Quality Reports**: Validation and completeness reporting

## 🔒 **Security & Compliance**

### **Formula Security**
- **Sandboxed Execution**: Safe formula evaluation environment
- **Input Validation**: Prevent injection attacks
- **Audit Logging**: Complete tracking of formula changes

### **Data Integrity**
- **Validation Rules**: Enforce data quality standards
- **Rollback Capability**: Ability to revert problematic changes
- **Change Approval**: Workflow for formula modifications

## 📈 **Success Metrics**

### **Functional Goals**
- ✅ Support 50+ atomic elements per KRI
- ✅ Calculation time < 2 seconds
- ✅ 99.9% calculation accuracy
- ✅ Complete audit trail

### **User Adoption Goals**
- ✅ 90% user satisfaction score
- ✅ 50% reduction in data entry time
- ✅ 80% reduction in calculation errors
- ✅ 100% feature adoption within 6 months

## 🚀 **Next Steps**

### **Immediate Actions** (Next 2 weeks)
1. **Stakeholder Review**: Present plan to business stakeholders
2. **Technical Review**: Database team review of schema changes
3. **Security Assessment**: Security team review of formula execution
4. **Resource Planning**: Finalize team assignments and timeline

### **Phase 1 Kickoff** (Week 3)
1. **Database Migration**: Implement schema changes
2. **Service Foundation**: Create calculationService.js
3. **Basic UI Updates**: Prepare components for atomic data
4. **Testing Framework**: Set up calculation testing infrastructure

## 💡 **Key Benefits Summary**

| Current State | Future State |
|---------------|--------------|
| Manual calculations prone to errors | Automated, validated calculations |
| Limited transparency into KRI logic | Complete formula visibility |
| Basic audit trail | Granular atomic data tracking |
| Single-value input only | Multi-component atomic data input |
| Manual validation | Automated data quality checking |

---

**📞 Ready for Questions & Approval**

This plan builds on the successful simple KRI implementation to deliver a comprehensive calculated KRI solution that enhances data quality, transparency, and operational efficiency while maintaining the robust security and audit capabilities of the existing system. 