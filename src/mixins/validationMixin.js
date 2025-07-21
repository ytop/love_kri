/**
 * Validation mixin providing reusable validation patterns for Vue components
 * Eliminates duplicate validation logic across components
 */
export const validationMixin = {
  methods: {
    /**
     * Validate atomic value (numeric input)
     * @param {*} value - Value to validate
     * @returns {Object} { valid: boolean, message: string }
     */
    validateAtomicValue(value) {
      // Check for empty or null values
      if (value === null || value === undefined || value === '') {
        return { 
          valid: false, 
          message: 'Please enter a value' 
        };
      }

      // Convert to number and check if valid
      const numericValue = Number(value);
      if (isNaN(numericValue)) {
        return { 
          valid: false, 
          message: 'Please enter a valid numeric value' 
        };
      }

      return { 
        valid: true, 
        value: numericValue 
      };
    },

    /**
     * Validate KRI value
     * @param {*} value - KRI value to validate
     * @returns {Object} { valid: boolean, message: string }
     */
    validateKRIValue(value) {
      if (value === null || value === undefined || value === '') {
        return { 
          valid: false, 
          message: 'KRI value cannot be empty' 
        };
      }

      // Allow text values for KRI as they might contain formulas or text descriptions
      return { 
        valid: true, 
        value: String(value).trim() 
      };
    },

    /**
     * Validate required field
     * @param {*} value - Value to validate
     * @param {string} fieldName - Name of the field for error message
     * @returns {Object} { valid: boolean, message: string }
     */
    validateRequired(value, fieldName = 'Field') {
      if (value === null || value === undefined || String(value).trim() === '') {
        return { 
          valid: false, 
          message: `${fieldName} is required` 
        };
      }

      return { 
        valid: true, 
        value: String(value).trim() 
      };
    },

    /**
     * Validate file upload
     * @param {File} file - File to validate
     * @param {Object} options - Validation options
     * @returns {Object} { valid: boolean, message: string }
     */
    validateFile(file, options = {}) {
      const { 
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']
      } = options;

      if (!file) {
        return { 
          valid: false, 
          message: 'Please select a file' 
        };
      }

      // Check file size
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        return { 
          valid: false, 
          message: `File size must be less than ${maxSizeMB}MB` 
        };
      }

      // Check file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        return { 
          valid: false, 
          message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` 
        };
      }

      return { 
        valid: true, 
        file 
      };
    },

    /**
     * Validate comment/reason field
     * @param {string} comment - Comment to validate
     * @param {boolean} required - Whether comment is required
     * @returns {Object} { valid: boolean, message: string }
     */
    validateComment(comment, required = false) {
      if (required) {
        const requiredValidation = this.validateRequired(comment, 'Comment');
        if (!requiredValidation.valid) {
          return requiredValidation;
        }
      }

      if (comment && comment.trim().length > 500) {
        return { 
          valid: false, 
          message: 'Comment must be less than 500 characters' 
        };
      }

      return { 
        valid: true, 
        value: comment ? comment.trim() : '' 
      };
    }
  }
};

/**
 * Error handling mixin providing consistent error handling patterns
 */
export const errorHandlingMixin = {
  methods: {
    /**
     * Execute async operation with consistent error handling
     * @param {Function} operation - Async operation to execute
     * @param {string} successMessage - Success message to show
     * @param {string} errorMessage - Error message prefix
     * @returns {Object} { success: boolean, data?: any, error?: string }
     */
    async handleAsyncOperation(operation, successMessage = '', errorMessage = 'Operation failed') {
      try {
        const result = await operation();
        
        if (successMessage) {
          this.$message.success(successMessage);
        }
        
        return { 
          success: true, 
          data: result 
        };
      } catch (error) {
        console.error(errorMessage, error);
        
        const message = error.message || errorMessage;
        this.$message.error(message);
        
        return { 
          success: false, 
          error: message 
        };
      }
    },

    /**
     * Show confirmation dialog with consistent styling
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {string} type - Dialog type (warning, info, error)
     * @returns {Promise<boolean>} User confirmation
     */
    async showConfirmDialog(title, message, type = 'warning') {
      try {
        await this.$confirm(message, title, {
          confirmButtonText: 'Confirm',
          cancelButtonText: 'Cancel',
          type: type
        });
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Show input prompt dialog with validation
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {Object} validation - Validation function
     * @returns {Promise<string|null>} User input or null
     */
    async showInputPrompt(title, message, validation = null) {
      try {
        const { value } = await this.$prompt(message, title, {
          confirmButtonText: 'Confirm',
          cancelButtonText: 'Cancel',
          inputValidator: validation || ((value) => {
            if (!value || value.trim() === '') {
              return 'Input cannot be empty';
            }
            return true;
          })
        });
        return value?.trim() || null;
      } catch {
        return null;
      }
    }
  }
};

/**
 * Loading state mixin for consistent loading indicators
 */
export const loadingMixin = {
  data() {
    return {
      loadingStates: {}
    };
  },
  methods: {
    /**
     * Set loading state for a specific operation
     * @param {string} operation - Operation name
     * @param {boolean} isLoading - Loading state
     */
    setLoading(operation, isLoading) {
      this.$set(this.loadingStates, operation, isLoading);
    },

    /**
     * Get loading state for a specific operation
     * @param {string} operation - Operation name
     * @returns {boolean} Loading state
     */
    isLoading(operation) {
      return !!this.loadingStates[operation];
    },

    /**
     * Execute operation with loading indicator
     * @param {string} operation - Operation name
     * @param {Function} asyncOperation - Async operation to execute
     * @returns {Promise<any>} Operation result
     */
    async withLoading(operation, asyncOperation) {
      try {
        this.setLoading(operation, true);
        return await asyncOperation();
      } finally {
        this.setLoading(operation, false);
      }
    }
  }
};

/**
 * Combined mixin with all common patterns
 */
export const commonMixin = {
  mixins: [validationMixin, errorHandlingMixin, loadingMixin]
};