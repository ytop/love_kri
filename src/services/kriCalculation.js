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
      const variables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      
      // Map atomic data to variables
      atomicData.forEach((item, index) => {
        if (variables[index]) {
          variableMap[variables[index]] = parseFloat(item.atomic_value) || 0;
        }
        // Also map by atomic_id
        variableMap[`ATOMIC_${item.atomic_id}`] = parseFloat(item.atomic_value) || 0;
      });

      // Enhanced formula patterns
      let result = 0;
      const normalizedFormula = formula.toUpperCase().trim();

      // Pattern 1: Simple arithmetic with variables (A + B, A - B, A * B, A / B)
      if (this.isSimpleArithmeticFormula(normalizedFormula)) {
        result = this.evaluateSimpleArithmetic(normalizedFormula, variableMap);
      }
      // Pattern 2: Complex formula with parentheses ((A - B) / C, (A + B) * C, etc.)
      else if (normalizedFormula.includes('(') && normalizedFormula.includes(')')) {
        result = this.evaluateComplexFormula(normalizedFormula, variableMap);
      }
      // Pattern 3: Percentage calculations (A / B * 100)
      else if (normalizedFormula.includes('* 100') || normalizedFormula.includes('*100')) {
        result = this.evaluatePercentageFormula(normalizedFormula, variableMap);
      }
      // Pattern 4: SUM function (SUM(A,B,C) or SUM(A:C))
      else if (normalizedFormula.includes('SUM(')) {
        result = this.evaluateSumFormula(normalizedFormula, variableMap);
      }
      // Pattern 5: AVERAGE function (AVERAGE(A,B,C) or AVG(A:C))
      else if (normalizedFormula.includes('AVERAGE(') || normalizedFormula.includes('AVG(')) {
        result = this.evaluateAverageFormula(normalizedFormula, variableMap);
      }
      // Pattern 6: MAX/MIN functions
      else if (normalizedFormula.includes('MAX(') || normalizedFormula.includes('MIN(')) {
        result = this.evaluateMinMaxFormula(normalizedFormula, variableMap);
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
   * Calculate breach status based on KRI value and limits
   * @param {number} kriValue - The KRI value
   * @param {number} warningLineValue - Warning threshold
   * @param {number} limitValue - Limit threshold
   * @returns {string} Breach status
   */
  calculateKRIBreachStatus(kriValue, warningLineValue, limitValue) {
    return calculateBreachStatus(kriValue, warningLineValue, limitValue);
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
   * Evaluate complex formula with parentheses
   * @param {string} formula - Formula to evaluate
   * @param {Object} variableMap - Variable to value mapping
   * @returns {number} Calculation result
   */
  evaluateComplexFormula(formula, variableMap) {
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
    const sumMatch = formula.match(/SUM\(([^)]+)\)/);
    if (!sumMatch) throw new Error('Invalid SUM formula');
    
    const params = sumMatch[1].split(',').map(p => p.trim());
    let sum = 0;
    
    params.forEach(param => {
      if (param.includes(':')) {
        // Range notation (A:C)
        const [start, end] = param.split(':');
        const startVar = start.trim();
        const endVar = end.trim();
        // For simplicity, sum all variables from start to end
        const variables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const startIndex = variables.indexOf(startVar);
        const endIndex = variables.indexOf(endVar);
        
        if (startIndex !== -1 && endIndex !== -1) {
          for (let i = startIndex; i <= endIndex; i++) {
            sum += variableMap[variables[i]] || 0;
          }
        }
      } else {
        // Single variable
        sum += variableMap[param] || 0;
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
    
    if (sanitized.trim() === '()' || sanitized.trim() === '(' || sanitized.trim() === ')') {
      throw new Error('Invalid mathematical expression: contains only parentheses');
    }
    
    try {
      // Use Function constructor instead of eval for better security
      return new Function(`"use strict"; return (${sanitized})`)();
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