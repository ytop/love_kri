import { calculateBreachStatus } from '@/utils/helpers';

/**
 * KRI Calculation Service
 * Handles formula execution and mathematical calculations for KRI values
 * 
 * This service contains pure calculation logic without database operations.
 * Database operations remain in kriService.js for better separation of concerns.
 */
export class KRICalculationService {
  constructor() {
    // Pure calculation service - no dependencies needed
  }

  /**
   * Execute formula calculation with atomic data
   * @param {string} formula - The formula to execute
   * @param {Array} atomicData - Array of atomic data objects
   * @returns {number} Calculated result
   */
  executeFormulaCalculation(formula, atomicData) {
    if (!formula || !atomicData || atomicData.length === 0) {
      throw new Error('Invalid formula or atomic data');
    }

    try {
      const values = atomicData.map(item => parseFloat(item.atomic_value) || 0);
      
      // Create a mapping of variable names to values
      const variableMap = {};
      
      // Map atomic data by atomic_id to atomic1, atomic2, atomic3 etc.
      atomicData.forEach((item, index) => {
        const atomicVariable = `atomic${item.atomic_id}`;
        variableMap[atomicVariable] = parseFloat(item.atomic_value) || 0;
        
        // Also create uppercase version for case-insensitive matching
        variableMap[atomicVariable.toUpperCase()] = parseFloat(item.atomic_value) || 0;
        
        // Legacy support for A, B, C pattern (in case needed)
        const legacyVariables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        if (legacyVariables[index]) {
          variableMap[legacyVariables[index]] = parseFloat(item.atomic_value) || 0;
        }
      });

      // Enhanced formula patterns
      let result = 0;
      const normalizedFormula = formula.toUpperCase().trim();

      // Handle special cases first
      if (normalizedFormula === 'DIRECT INPUT') {
        // For direct input KRIs, return the first atomic value or sum if multiple
        result = values.length === 1 ? values[0] : values.reduce((sum, val) => sum + val, 0);
      }
      // Pattern 1: Simple arithmetic with atomic variables (atomic1 + atomic2, etc.)
      else if (this.isAtomicArithmeticFormula(normalizedFormula)) {
        result = this.evaluateAtomicArithmetic(normalizedFormula, variableMap);
      }
      // Pattern 2: Complex formula with parentheses
      else if (normalizedFormula.includes('(') && normalizedFormula.includes(')')) {
        result = this.evaluateComplexFormula(normalizedFormula, variableMap);
      }
      // Pattern 3: SUM function with atomic variables
      else if (normalizedFormula.includes('SUM(')) {
        result = this.evaluateSumFormula(normalizedFormula, variableMap);
      }
      // Pattern 4: AVERAGE function
      else if (normalizedFormula.includes('AVERAGE(') || normalizedFormula.includes('AVG(')) {
        result = this.evaluateAverageFormula(normalizedFormula, variableMap);
      }
      // Pattern 5: MAX/MIN functions
      else if (normalizedFormula.includes('MAX(') || normalizedFormula.includes('MIN(')) {
        result = this.evaluateMinMaxFormula(normalizedFormula, variableMap);
      }
      // Pattern 6: Legacy simple arithmetic with A, B, C variables
      else if (this.isSimpleArithmeticFormula(normalizedFormula)) {
        result = this.evaluateSimpleArithmetic(normalizedFormula, variableMap);
      }
      // Fallback: Legacy simple patterns
      else {
        result = this.evaluateLegacyFormula(formula, values);
      }

      // Validate result
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        throw new Error(`Formula calculation resulted in invalid value: ${result}`);
      }

      return result;
    } catch (error) {
      console.error('Formula execution error:', error);
      throw new Error(`Formula calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate breach status based on KRI value and limits (4-limit support)
   * @param {number} kriValue - The KRI value
   * @param {number} warningLineValue - Warning threshold
   * @param {number} limitValue - Limit threshold
   * @param {number} negativeWarning - Negative warning threshold (optional)
   * @param {number} negativeLimit - Negative limit threshold (optional)
   * @returns {string} Breach status
   */
  calculateKRIBreachStatus(kriValue, warningLineValue, limitValue, negativeWarning = null, negativeLimit = null) {
    return calculateBreachStatus(kriValue, warningLineValue, limitValue, negativeWarning, negativeLimit);
  }

  // ========================================
  // FORMULA EVALUATION METHODS
  // ========================================

  /**
   * Check if formula is simple arithmetic pattern
   * @param {string} formula - Formula to check
   * @returns {boolean} True if simple arithmetic
   */
  isSimpleArithmeticFormula(formula) {
    const simplePattern = /^[A-Z]\s*[+\-*/]\s*[A-Z](\s*[+\-*/]\s*[A-Z])*$/;
    return simplePattern.test(formula.replace(/\s/g, ''));
  }

  /**
   * Check if formula is simple arithmetic pattern with atomic variables
   * @param {string} formula - Formula to check
   * @returns {boolean} True if simple arithmetic with atomic variables
   */
  isAtomicArithmeticFormula(formula) {
    const atomicPattern = /^atomic\d\s*[+\-*/]\s*atomic\d(\s*[+\-*/]\s*atomic\d)*$/;
    return atomicPattern.test(formula.replace(/\s/g, ''));
  }

  /**
   * Evaluate simple arithmetic formula
   * @param {string} formula - Formula to evaluate
   * @param {Object} variableMap - Variable to value mapping
   * @returns {number} Calculation result
   */
  evaluateSimpleArithmetic(formula, variableMap) {
    let expression = formula;
    Object.keys(variableMap).forEach(variable => {
      const regex = new RegExp(`\\b${variable}\\b`, 'g');
      expression = expression.replace(regex, variableMap[variable].toString());
    });
    
    // Check for empty or invalid expression after substitution
    if (!expression.trim() || expression.trim() === '()') {
      throw new Error('Formula resulted in empty expression after variable substitution');
    }
    
    return this.safeEval(expression);
  }

  /**
   * Evaluate atomic arithmetic formula
   * @param {string} formula - Formula to evaluate
   * @param {Object} variableMap - Variable to value mapping
   * @returns {number} Calculation result
   */
  evaluateAtomicArithmetic(formula, variableMap) {
    let expression = formula;
    Object.keys(variableMap).forEach(variable => {
      const regex = new RegExp(`\\b${variable}\\b`, 'g');
      expression = expression.replace(regex, variableMap[variable].toString());
    });
    
    // Check for empty or invalid expression after substitution
    if (!expression.trim() || expression.trim() === '()') {
      throw new Error('Formula resulted in empty expression after variable substitution');
    }
    
    return this.safeEval(expression);
  }

  /**
   * Evaluate complex formula with parentheses
   * @param {string} formula - Formula to evaluate
   * @param {Object} variableMap - Variable to value mapping
   * @returns {number} Calculation result
   */
  evaluateComplexFormula(formula, variableMap) {
    let expression = formula;
    
    // First, check if all variables in the formula exist in our variable map
    const atomicPattern = /\batomic\d+\b/gi;
    const legacyPattern = /\b[A-Z]\b/g;
    const variablesInFormula = [
      ...(formula.match(atomicPattern) || []),
      ...(formula.match(legacyPattern) || [])
    ];
    
    const missingVariables = variablesInFormula.filter(variable => 
      !(variable.toLowerCase() in variableMap) && !(variable.toUpperCase() in variableMap)
    );
    
    if (missingVariables.length > 0) {
      console.warn(`Missing variables in formula: ${missingVariables.join(', ')}`);
      // Set missing variables to 0 as default
      missingVariables.forEach(variable => {
        variableMap[variable.toLowerCase()] = 0;
        variableMap[variable.toUpperCase()] = 0;
      });
    }
    
    // Replace variables with their values (case-insensitive)
    Object.keys(variableMap).forEach(variable => {
      const regex = new RegExp(`\\b${variable}\\b`, 'gi');
      expression = expression.replace(regex, variableMap[variable].toString());
    });
    
    
    // Check for empty or invalid expression after substitution
    if (!expression.trim() || expression.trim() === '()' || /^[() \s]*$/.test(expression)) {
      throw new Error('Formula resulted in empty or invalid expression after variable substitution');
    }
    
    // Validate that expression contains only valid mathematical characters
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error(`Expression contains invalid characters after substitution: ${expression}`);
    }
    
    return this.safeEval(expression);
  }

  /**
   * Evaluate percentage formula
   * @param {string} formula - Formula to evaluate
   * @param {Object} variableMap - Variable to value mapping
   * @returns {number} Calculation result
   */
  evaluatePercentageFormula(formula, variableMap) {
    let expression = formula;
    Object.keys(variableMap).forEach(variable => {
      const regex = new RegExp(`\\b${variable}\\b`, 'g');
      expression = expression.replace(regex, variableMap[variable].toString());
    });
    
    // Check for empty or invalid expression after substitution
    if (!expression.trim() || expression.trim() === '()') {
      throw new Error('Formula resulted in empty expression after variable substitution');
    }
    
    return this.safeEval(expression);
  }

  /**
   * Evaluate SUM function formula
   * @param {string} formula - Formula to evaluate
   * @param {Object} variableMap - Variable to value mapping
   * @returns {number} Calculation result
   */
  evaluateSumFormula(formula, variableMap) {
    const sumMatch = formula.match(/SUM\(([^)]+)\)/i);
    if (!sumMatch) throw new Error('Invalid SUM formula');
    
    const params = sumMatch[1].split(',').map(p => p.trim());
    let sum = 0;
    
    params.forEach(param => {
      if (param.includes(':')) {
        // Range notation (atomic1:atomic3 or A:C)
        const [start, end] = param.split(':');
        const startVar = start.trim();
        const endVar = end.trim();
        
        // Handle atomic range (atomic1:atomic3)
        if (startVar.toLowerCase().startsWith('atomic') && endVar.toLowerCase().startsWith('atomic')) {
          const startNum = parseInt(startVar.toLowerCase().replace('atomic', ''));
          const endNum = parseInt(endVar.toLowerCase().replace('atomic', ''));
          
          if (!isNaN(startNum) && !isNaN(endNum)) {
            for (let i = startNum; i <= endNum; i++) {
              const atomicVar = `atomic${i}`;
              sum += variableMap[atomicVar] || variableMap[atomicVar.toUpperCase()] || 0;
            }
          }
        } else {
          // Legacy range notation (A:C)
          const variables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
          const startIndex = variables.indexOf(startVar.toUpperCase());
          const endIndex = variables.indexOf(endVar.toUpperCase());
          
          if (startIndex !== -1 && endIndex !== -1) {
            for (let i = startIndex; i <= endIndex; i++) {
              sum += variableMap[variables[i]] || 0;
            }
          }
        }
      } else {
        // Single variable - try both cases
        const paramLower = param.toLowerCase();
        const paramUpper = param.toUpperCase();
        sum += variableMap[paramLower] || variableMap[paramUpper] || variableMap[param] || 0;
      }
    });
    
    return sum;
  }

  /**
   * Evaluate AVERAGE function formula
   * @param {string} formula - Formula to evaluate
   * @param {Object} variableMap - Variable to value mapping
   * @returns {number} Calculation result
   */
  evaluateAverageFormula(formula, variableMap) {
    const avgMatch = formula.match(/(AVERAGE|AVG)\(([^)]+)\)/);
    if (!avgMatch) throw new Error('Invalid AVERAGE formula');
    
    const params = avgMatch[2].split(',').map(p => p.trim());
    const values = [];
    
    params.forEach(param => {
      if (param.includes(':')) {
        // Range notation
        const [start, end] = param.split(':');
        const startVar = start.trim();
        const endVar = end.trim();
        const variables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const startIndex = variables.indexOf(startVar);
        const endIndex = variables.indexOf(endVar);
        
        if (startIndex !== -1 && endIndex !== -1) {
          for (let i = startIndex; i <= endIndex; i++) {
            values.push(variableMap[variables[i]] || 0);
          }
        }
      } else {
        values.push(variableMap[param] || 0);
      }
    });
    
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  /**
   * Evaluate MIN/MAX function formula
   * @param {string} formula - Formula to evaluate
   * @param {Object} variableMap - Variable to value mapping
   * @returns {number} Calculation result
   */
  evaluateMinMaxFormula(formula, variableMap) {
    const minMaxMatch = formula.match(/(MIN|MAX)\(([^)]+)\)/);
    if (!minMaxMatch) throw new Error('Invalid MIN/MAX formula');
    
    const isMax = minMaxMatch[1] === 'MAX';
    const params = minMaxMatch[2].split(',').map(p => p.trim());
    const values = [];
    
    params.forEach(param => {
      if (param.includes(':')) {
        // Range notation
        const [start, end] = param.split(':');
        const startVar = start.trim();
        const endVar = end.trim();
        const variables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const startIndex = variables.indexOf(startVar);
        const endIndex = variables.indexOf(endVar);
        
        if (startIndex !== -1 && endIndex !== -1) {
          for (let i = startIndex; i <= endIndex; i++) {
            values.push(variableMap[variables[i]] || 0);
          }
        }
      } else {
        values.push(variableMap[param] || 0);
      }
    });
    
    if (values.length === 0) return 0;
    
    return isMax ? Math.max(...values) : Math.min(...values);
  }

  /**
   * Evaluate legacy formula patterns
   * @param {string} formula - Formula to evaluate
   * @param {Array} values - Array of numeric values
   * @returns {number} Calculation result
   */
  evaluateLegacyFormula(formula, values) {
    // Legacy fallback for simple patterns
    if (formula.includes('/') && values.length >= 3) {
      return (values[0] - values[1]) / values[2];
    } else if (formula.includes('+')) {
      return values.reduce((sum, val) => sum + val, 0);
    } else if (formula.includes('-')) {
      return values.reduce((diff, val, index) => index === 0 ? val : diff - val, 0);
    } else if (formula.includes('*')) {
      return values.reduce((product, val) => product * val, 1);
    }
    
    // Default: sum
    return values.reduce((sum, val) => sum + val, 0);
  }

  /**
   * Safer alternative to eval() for mathematical expressions
   * @param {string} expression - Mathematical expression to evaluate
   * @returns {number} Evaluation result
   */
  safeEval(expression) {
    // Remove any non-mathematical characters for security
    const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
    
    // Check for empty or invalid expressions
    if (!sanitized.trim()) {
      throw new Error('Empty mathematical expression');
    }
    
    // Check for various invalid patterns
    if (sanitized.trim() === '()' || sanitized.trim() === '(' || sanitized.trim() === ')') {
      throw new Error('Invalid mathematical expression: contains only parentheses');
    }
    
    if (/^[() \s]*$/.test(sanitized)) {
      throw new Error('Invalid mathematical expression: contains only parentheses and whitespace');
    }
    
    // Check for unclosed parentheses
    const openParens = (sanitized.match(/\(/g) || []).length;
    const closeParens = (sanitized.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      throw new Error('Invalid mathematical expression: mismatched parentheses');
    }
    
    // Check for invalid operator sequences
    if (/[+\-*/]{2,}/.test(sanitized) || /^[+*/]/.test(sanitized) || /[+\-*/]$/.test(sanitized)) {
      throw new Error('Invalid mathematical expression: invalid operator sequence');
    }
    
    try {
      // Use Function constructor instead of eval for better security
      const result = new Function(`"use strict"; return (${sanitized})`)();
      
      // Additional validation of result
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        throw new Error(`Calculation resulted in invalid number: ${result}`);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid mathematical expression: ${sanitized} - ${error.message}`);
    }
  }
}

// Export singleton instance for convenience
export const kriCalculationService = new KRICalculationService();

/*
-------------------------------- Usage Examples --------------------------------
*/

// Usage example
// import { kriCalculationService } from './kriCalculation';
// const result = kriCalculationService.executeFormulaCalculation('A + B', atomicData);
// const breachStatus = kriCalculationService.calculateKRIBreachStatus(result, warningValue, limitValue);