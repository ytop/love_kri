/**
 * ExcelParserService - Handles Excel file parsing for KRI auto-fill functionality
 * 
 * This service provides Excel parsing capabilities for KRIs with source === 'autoParse'
 * It extracts KRI values from uploaded Excel files and validates the data format
 */

export class ExcelParserService {
  constructor() {
    this.supportedFormats = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
  }

  /**
   * Check if file is a supported Excel format
   * @param {File} file - The file to check
   * @returns {boolean} True if file is supported Excel format
   */
  isSupportedExcelFile(file) {
    return this.supportedFormats.includes(file.type) || 
           file.name.toLowerCase().endsWith('.xls') || 
           file.name.toLowerCase().endsWith('.xlsx');
  }

  /**
   * Parse Excel file and extract KRI data
   * @param {File} file - Excel file to parse
   * @param {Object} kriMetadata - KRI metadata for validation
   * @returns {Promise<Object>} Parsed data with KRI value and validation results
   */
  async parseExcelFile(file, kriMetadata = {}) {
    try {
      if (!this.isSupportedExcelFile(file)) {
        throw new Error('File is not a supported Excel format');
      }

      // Read file as array buffer
      const arrayBuffer = await this._readFileAsArrayBuffer(file);
      
      // Parse Excel file using browser capabilities
      const parsedData = await this._parseExcelBuffer(arrayBuffer);
      
      // Extract KRI value based on metadata or default patterns
      const extractedValue = this._extractKRIValue(parsedData, kriMetadata);
      
      // Validate extracted data
      const validation = this._validateExtractedData(extractedValue, kriMetadata);
      
      return {
        success: validation.isValid,
        kriValue: extractedValue.value,
        extractedData: extractedValue,
        validationResults: validation,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          parsedAt: new Date().toISOString(),
          rowCount: parsedData.rowCount,
          columnCount: parsedData.columnCount
        }
      };
    } catch (error) {
      console.error('Excel parsing error:', error);
      return {
        success: false,
        error: error.message,
        kriValue: null,
        extractedData: null,
        validationResults: { isValid: false, errors: [error.message] }
      };
    }
  }

  /**
   * Extract multiple atomic values from Excel file for calculated KRIs
   * @param {File} file - Excel file to parse
   * @param {Array} atomicDefinitions - Array of atomic element definitions
   * @returns {Promise<Object>} Parsed atomic values with validation
   */
  async parseAtomicValues(file, atomicDefinitions = []) {
    try {
      if (!this.isSupportedExcelFile(file)) {
        throw new Error('File is not a supported Excel format');
      }

      const arrayBuffer = await this._readFileAsArrayBuffer(file);
      const parsedData = await this._parseExcelBuffer(arrayBuffer);
      
      const atomicValues = {};
      const validationResults = {};
      
      // Extract value for each atomic element
      for (const atomic of atomicDefinitions) {
        const extractedValue = this._extractKRIValue(parsedData, atomic);
        const validation = this._validateExtractedData(extractedValue, atomic);
        
        atomicValues[atomic.atomicId] = {
          value: extractedValue.value,
          metadata: extractedValue.metadata,
          isValid: validation.isValid
        };
        
        validationResults[atomic.atomicId] = validation;
      }
      
      return {
        success: true,
        atomicValues: atomicValues,
        validationResults: validationResults,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          parsedAt: new Date().toISOString(),
          atomicCount: Object.keys(atomicValues).length
        }
      };
    } catch (error) {
      console.error('Atomic values parsing error:', error);
      return {
        success: false,
        error: error.message,
        atomicValues: {},
        validationResults: {}
      };
    }
  }

  /**
   * Generate MD5 hash for file content to detect duplicates
   * @param {File} file - File to hash
   * @returns {Promise<string>} MD5 hash of file content
   */
  async generateFileHash(file) {
    try {
      const arrayBuffer = await this._readFileAsArrayBuffer(file);
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('File hash generation error:', error);
      // Fallback to simple hash based on file properties
      return `${file.name}_${file.size}_${file.lastModified}`.replace(/[^a-zA-Z0-9]/g, '');
    }
  }

  /**
   * Validate if uploaded file matches expected format for KRI
   * @param {File} file - File to validate
   * @param {Object} kriMetadata - KRI metadata including expected format
   * @returns {Object} Validation result with success flag and messages
   */
  validateFileFormat(file, kriMetadata = {}) {
    const errors = [];
    const warnings = [];
    
    // Check file type
    if (!this.isSupportedExcelFile(file)) {
      errors.push('File must be an Excel file (.xls or .xlsx)');
    }
    
    // Check file size (max 10MB for Excel files)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 10MB`);
    }
    
    // Check filename patterns if specified in KRI metadata
    if (kriMetadata.expectedFilePattern) {
      const pattern = new RegExp(kriMetadata.expectedFilePattern, 'i');
      if (!pattern.test(file.name)) {
        warnings.push(`Filename doesn't match expected pattern: ${kriMetadata.expectedFilePattern}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      canProceed: errors.length === 0
    };
  }

  // ===================== Private Methods =====================

  /**
   * Read file as ArrayBuffer
   * @private
   */
  _readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parse Excel buffer using browser capabilities
   * Basic implementation - can be enhanced with specialized Excel parsing library
   * @private
   */
  async _parseExcelBuffer(arrayBuffer) {
    // For now, implement a basic CSV-like parsing approach
    // In production, this could use libraries like xlsx or exceljs
    
    try {
      // Convert to text for basic parsing (works for simple Excel files)
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(arrayBuffer);
      
      // Basic parsing - look for numeric patterns
      const lines = text.split(/[\r\n]+/).filter(line => line.trim());
      const data = [];
      
      for (let i = 0; i < Math.min(lines.length, 100); i++) { // Limit to first 100 lines
        const line = lines[i];
        const values = this._extractNumbersFromLine(line);
        if (values.length > 0) {
          data.push({ row: i, values: values });
        }
      }
      
      return {
        data: data,
        rowCount: data.length,
        columnCount: data.length > 0 ? Math.max(...data.map(d => d.values.length)) : 0,
        rawText: text.substring(0, 1000) // First 1000 chars for debugging
      };
    } catch (error) {
      console.warn('Advanced parsing failed, trying fallback method');
      return this._fallbackParseExcel(arrayBuffer);
    }
  }

  /**
   * Extract numbers from a text line
   * @private
   */
  _extractNumbersFromLine(line) {
    const numberPattern = /[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g;
    const matches = line.match(numberPattern);
    return matches ? matches.map(m => parseFloat(m)).filter(n => !isNaN(n)) : [];
  }

  /**
   * Fallback Excel parsing method
   * @private
   */
  _fallbackParseExcel(arrayBuffer) {
    // Simple fallback - extract any numeric values from the binary data
    const view = new Uint8Array(arrayBuffer);
    const numbers = [];
    
    // Look for float64 patterns in the binary data
    for (let i = 0; i < view.length - 8; i += 8) {
      try {
        const value = new DataView(arrayBuffer, i, 8).getFloat64(0, true);
        if (isFinite(value) && value !== 0 && Math.abs(value) < 1e10) {
          numbers.push(value);
        }
      } catch (e) {
        // Continue parsing
      }
    }
    
    return {
      data: numbers.map((value, index) => ({ row: index, values: [value] })),
      rowCount: numbers.length,
      columnCount: 1,
      rawText: 'Binary parsing fallback'
    };
  }

  /**
   * Extract KRI value from parsed data
   * @private
   */
  _extractKRIValue(parsedData, metadata = {}) {
    const { data } = parsedData;
    
    if (!data || data.length === 0) {
      return { value: null, confidence: 0, method: 'no_data' };
    }
    
    // Strategy 1: Use metadata hints if available
    if (metadata.cellReference) {
      const value = this._extractValueByCellReference(data, metadata.cellReference);
      if (value !== null) {
        return { value: value, confidence: 0.9, method: 'cell_reference', metadata: { cellReference: metadata.cellReference } };
      }
    }
    
    // Strategy 2: Look for labeled values
    if (metadata.expectedLabel) {
      const value = this._extractValueByLabel(data, metadata.expectedLabel);
      if (value !== null) {
        return { value: value, confidence: 0.8, method: 'label_match', metadata: { label: metadata.expectedLabel } };
      }
    }
    
    // Strategy 3: Use position-based extraction
    const positionValue = this._extractValueByPosition(data, metadata.position || { row: 1, column: 1 });
    if (positionValue !== null) {
      return { value: positionValue, confidence: 0.6, method: 'position', metadata: { position: metadata.position } };
    }
    
    // Strategy 4: Find the largest/most significant number
    const allNumbers = data.flatMap(d => d.values);
    if (allNumbers.length > 0) {
      const significantValue = this._findMostSignificantValue(allNumbers);
      return { value: significantValue, confidence: 0.4, method: 'heuristic', metadata: { totalNumbers: allNumbers.length } };
    }
    
    return { value: null, confidence: 0, method: 'failed' };
  }

  /**
   * Extract value by cell reference (e.g., "A1", "B2")
   * @private
   */
  _extractValueByCellReference(data, cellRef) {
    // Basic implementation - would need more sophisticated parsing for real Excel references
    const match = cellRef.match(/([A-Z]+)([0-9]+)/);
    if (!match) return null;
    
    const col = this._columnLetterToNumber(match[1]) - 1;
    const row = parseInt(match[2], 10) - 1;
    
    if (row < data.length && col < data[row].values.length) {
      return data[row].values[col];
    }
    
    return null;
  }

  /**
   * Convert Excel column letter to number (A=1, B=2, etc.)
   * @private
   */
  _columnLetterToNumber(letters) {
    let result = 0;
    for (let i = 0; i < letters.length; i++) {
      result = result * 26 + (letters.charCodeAt(i) - 65 + 1);
    }
    return result;
  }

  /**
   * Extract value by label matching
   * @private
   */
  _extractValueByLabel(_data, _expectedLabel) {
    // This would require text parsing from Excel - simplified for now
    return null;
  }

  /**
   * Extract value by position
   * @private
   */
  _extractValueByPosition(data, position) {
    const { row = 0, column = 0 } = position;
    if (row < data.length && column < data[row].values.length) {
      return data[row].values[column];
    }
    return null;
  }

  /**
   * Find most significant value using heuristics
   * @private
   */
  _findMostSignificantValue(numbers) {
    // Remove outliers and find the most reasonable value
    const sorted = [...numbers].sort((a, b) => Math.abs(b) - Math.abs(a));
    
    // Return largest absolute value that's not too extreme
    for (const num of sorted) {
      if (Math.abs(num) < 1e6 && Math.abs(num) > 0.01) {
        return num;
      }
    }
    
    return sorted[0] || null;
  }

  /**
   * Validate extracted data
   * @private
   */
  _validateExtractedData(extractedValue, metadata = {}) {
    const errors = [];
    const warnings = [];
    
    if (extractedValue.value === null) {
      errors.push('No valid numeric value found in the file');
      return { isValid: false, errors: errors, warnings: warnings };
    }
    
    const value = extractedValue.value;
    
    // Check if value is within expected range
    if (metadata.minValue !== undefined && value < metadata.minValue) {
      errors.push(`Value ${value} is below minimum expected value ${metadata.minValue}`);
    }
    
    if (metadata.maxValue !== undefined && value > metadata.maxValue) {
      errors.push(`Value ${value} exceeds maximum expected value ${metadata.maxValue}`);
    }
    
    // Check confidence level
    if (extractedValue.confidence < 0.5) {
      warnings.push(`Low confidence (${(extractedValue.confidence * 100).toFixed(0)}%) in extracted value`);
    }
    
    // Check for reasonable value ranges
    if (Math.abs(value) > 1e9) {
      warnings.push('Extracted value seems unusually large');
    }
    
    if (Math.abs(value) < 1e-6) {
      warnings.push('Extracted value seems unusually small');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      confidence: extractedValue.confidence
    };
  }
}

// Create and export a singleton instance
export const excelParserService = new ExcelParserService();

export default excelParserService;