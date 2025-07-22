import { supabase } from './supabase';

/**
 * Abstract Object Storage Framework for KRI Evidence Files
 * 
 * This framework provides a unified interface for file storage operations
 * that can be implemented by different storage providers (Supabase, AWS S3, etc.)
 */

/**
 * Abstract base class for object storage operations
 * All storage providers must extend this class and implement the abstract methods
 */
export class ObjectStorage {
  constructor(config = {}) {
    this.config = config;
    this.providerName = this.constructor.name;
  }

  /**
   * Upload a file to storage
   * @param {File} file - The file object to upload
   * @param {string} path - Storage path for the file
   * @param {Object} metadata - Additional metadata for the file
   * @returns {Promise<Object>} Upload result with file URL and metadata
   */
  async uploadFile(_file, _path, _metadata = {}) {
    throw new Error('uploadFile method must be implemented by storage provider');
  }

  /**
   * Download a file from storage
   * @param {string} url - File URL or storage path
   * @param {string} filename - Optional filename for download
   * @returns {Promise<Blob|string>} File content or download URL
   */
  async downloadFile(_url, _filename = null) {
    throw new Error('downloadFile method must be implemented by storage provider');
  }

  /**
   * Delete a file from storage
   * @param {string} url - File URL or storage path
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(_url) {
    throw new Error('deleteFile method must be implemented by storage provider');
  }

  /**
   * Get a public URL for a file
   * @param {string} path - Storage path for the file
   * @returns {Promise<string>} Public URL for the file
   */
  async getFileUrl(_path) {
    throw new Error('getFileUrl method must be implemented by storage provider');
  }

  /**
   * Validate file before upload
   * @param {File} file - The file to validate
   * @returns {Object} Validation result with success flag and error message
   */
  validateFile(file) {
    const errors = [];
    
    // Check file size (default max 10MB)
    const maxSize = this.config.maxFileSize || 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    const allowedTypes = this.config.allowedTypes || [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Check filename length
    if (file.name.length > 255) {
      errors.push('Filename is too long (maximum 255 characters)');
    }

    return {
      success: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Generate a unique file path
   * @param {string} filename - Original filename
   * @returns {string} Unique file path
   */
  generateFilePath(filename) {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `kri_evidence/${timestamp}_${sanitizedFilename}`;
  }

  /**
   * Extract metadata from file
   * @param {File} file - The file object
   * @returns {Object} File metadata
   */
  extractMetadata(file) {
    return {
      filename: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      provider: this.providerName
    };
  }

  /**
   * Get provider-specific configuration
   * @returns {Object} Provider configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getProviderName() {
    return this.providerName;
  }
}

/**
 * Supabase Storage Provider
 * Implements ObjectStorage for Supabase storage backend
 */
export class SupabaseStorageProvider extends ObjectStorage {
  constructor(supabaseClient, config = {}) {
    super(config);
    this.supabase = supabaseClient;
    this.bucketName = config.bucketName || 'evidence';
  }

  async uploadFile(file, path, metadata = {}) {
    try {
      const validation = this.validateFile(file);
      if (!validation.success) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            ...metadata,
            ...this.extractMetadata(file)
          }
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const publicUrl = await this.getFileUrl(path);

      return {
        success: true,
        path: data.path,
        url: publicUrl,
        metadata: {
          ...metadata,
          ...this.extractMetadata(file),
          provider: this.providerName
        }
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async downloadFile(url, _filename = null) {
    try {
      // Extract path from URL if it's a full URL
      let path = url;
      if (url.includes('/storage/v1/object/public/')) {
        path = url.split('/storage/v1/object/public/')[1].split('/').slice(1).join('/');
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(path);

      if (error) {
        console.error('Supabase download error:', error);
        throw new Error(`Download failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  async deleteFile(url) {
    try {
      // Extract path from URL if it's a full URL
      let path = url;
      if (url.includes('/storage/v1/object/public/')) {
        path = url.split('/storage/v1/object/public/')[1].split('/').slice(1).join('/');
      }

      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([path]);

      if (error) {
        console.error('Supabase delete error:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  async getFileUrl(path) {
    try {
      const { data } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (error) {
      console.error('Get URL error:', error);
      throw error;
    }
  }
}

/**
 * Local Storage Provider (for development/testing)
 * Simulates file storage using browser localStorage
 */
export class LocalStorageProvider extends ObjectStorage {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:8081/mock-files';
  }

  async uploadFile(file, path, metadata = {}) {
    try {
      const validation = this.validateFile(file);
      if (!validation.success) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Convert file to base64 for localStorage
      const base64 = await this._fileToBase64(file);
      const fileData = {
        content: base64,
        metadata: {
          ...metadata,
          ...this.extractMetadata(file),
          provider: this.providerName,
          uploadedAt: new Date().toISOString()
        }
      };

      localStorage.setItem(`file_${path}`, JSON.stringify(fileData));

      return {
        success: true,
        path: path,
        url: `${this.baseUrl}/${path}`,
        metadata: fileData.metadata
      };
    } catch (error) {
      console.error('Local storage upload error:', error);
      throw error;
    }
  }

  async downloadFile(url, _filename = null) {
    try {
      const path = url.replace(`${this.baseUrl}/`, '');
      const stored = localStorage.getItem(`file_${path}`);
      
      if (!stored) {
        throw new Error('File not found in local storage');
      }

      const fileData = JSON.parse(stored);
      return this._base64ToBlob(fileData.content, fileData.metadata.type);
    } catch (error) {
      console.error('Local storage download error:', error);
      throw error;
    }
  }

  async deleteFile(url) {
    try {
      const path = url.replace(`${this.baseUrl}/`, '');
      localStorage.removeItem(`file_${path}`);
      return true;
    } catch (error) {
      console.error('Local storage delete error:', error);
      throw error;
    }
  }

  async getFileUrl(path) {
    return `${this.baseUrl}/${path}`;
  }

  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  _base64ToBlob(base64, contentType = '') {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }
}

/**
 * Mock Storage Provider (for testing)
 * Simulates storage operations without actual file handling
 */
export class MockStorageProvider extends ObjectStorage {
  constructor(config = {}) {
    super(config);
    this.mockFiles = new Map();
    this.baseUrl = 'mock://storage';
  }

  async uploadFile(file, path, metadata = {}) {
    const validation = this.validateFile(file);
    if (!validation.success) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    const fileData = {
      path: path,
      metadata: {
        ...metadata,
        ...this.extractMetadata(file),
        provider: this.providerName,
        uploadedAt: new Date().toISOString()
      }
    };

    this.mockFiles.set(path, fileData);

    return {
      success: true,
      path: path,
      url: `${this.baseUrl}/${path}`,
      metadata: fileData.metadata
    };
  }

  async downloadFile(url, _filename = null) {
    const path = url.replace(`${this.baseUrl}/`, '');
    const fileData = this.mockFiles.get(path);
    
    if (!fileData) {
      throw new Error('File not found in mock storage');
    }

    // Return a mock blob
    return new Blob(['mock file content'], { type: 'text/plain' });
  }

  async deleteFile(url) {
    const path = url.replace(`${this.baseUrl}/`, '');
    return this.mockFiles.delete(path);
  }

  async getFileUrl(path) {
    return `${this.baseUrl}/${path}`;
  }

  // Additional method for testing
  getMockFiles() {
    return Array.from(this.mockFiles.values());
  }

  clearMockFiles() {
    this.mockFiles.clear();
  }
}


// ----------------------------- Storage Provider -----------------------------

/**
 * Evidence Storage Service
 * Handles only object storage operations for evidence files.
 * No database operations are performed here.
 * 
 * Now manages its own storage provider instance internally (was StorageManager).
 */
export class EvidenceStorageService {
  // ----------------------------- Constructor -----------------------------
  /**
   * @param {Object} options
   *   - storageProvider: (optional) an ObjectStorage instance to use directly
   *   - storageProviderConfig: (optional) config for storage provider if not provided
   */
  constructor(options = {}) {
    // Allow passing in a storage provider instance directly
    this._storageProvider = null;
    this._storageProviderConfig = options.storageProviderConfig || {};

    if (options.storageProvider) {
      // Check that the provided storageProvider is an ObjectStorage subclass
      if (
        typeof options.storageProvider === 'object' &&
        options.storageProvider instanceof ObjectStorage
      ) {
        // If it's a subclass of ObjectStorage, allow
        this._storageProvider = options.storageProvider;
      } else {
        throw new Error('storageProvider must be an instance of ObjectStorage');
      }
    }
  }

  getStorageProvider() {
    if (!this._storageProvider) {
      // Default to Supabase storage provider
      this._storageProvider = new SupabaseStorageProvider(supabase, {
        supabaseClient: supabase,
        bucketName: 'evidence',
        maxFileSize: 10 * 1024 * 1024,
        allowedTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv'
        ],
        ...this._storageProviderConfig
      });
    }
    return this._storageProvider;
  }

  setStorageProvider(provider) {
    if (!(provider instanceof ObjectStorage)) {
      throw new Error('Storage provider must be an instance of ObjectStorage');
    }
    this._storageProvider = provider;
  }


  // ----------------------------- Evidence -----------------------------
  /**
   * @param {string} filename - The name of the file
   * @param {File} file - The file object to upload
   * @param {string} description - The description of the file
   * @param {string} uploadedBy - The user who uploaded the file
   * Upload evidence file to object storage.
   * Returns file info only, does not write to database.
   */
  async uploadEvidence(filename, file, description = '', uploadedBy = 'anonymous') {
    if (!filename) throw new Error('filename is required');
    if (!file) throw new Error('file is required');

    try {
      const storage = this.getStorageProvider();

      // Generate unique file path
      const filePath = storage.generateFilePath(filename);

      // Upload file to storage
      const uploadResult = await storage.uploadFile(file, filePath, {
        filename: filename,
        description: description,
        uploadedBy: uploadedBy
      });

      return {
        success: true,
        fileInfo: {
          path: uploadResult.path,
          url: uploadResult.url,
          metadata: uploadResult.metadata
        }
      };
    } catch (error) {
      console.error('Upload evidence error:', error);
      throw error;
    }
  }

  /**
   * Delete evidence file from object storage.
   * Requires file URL and info as input (no DB lookup).
   * @param {string} file_url - The URL of the file
   * @param {string} deletedBy
   */
  async deleteEvidence(file_url, deletedBy = 'anonymous') {
    try {
      const storage = this.getStorageProvider();

      // Delete file from storage
      await storage.deleteFile(file_url);

      return {
        success: true,
        deletedFile: {
          file_url: file_url,
          deletedBy: deletedBy
        }
      };
    } catch (error) {
      console.error('Delete evidence error:', error);
      throw error;
    }
  }

  /**
   * Download evidence file from object storage.
   * Requires file URL and file name as input (no DB lookup).
   * @param {string} file_url - The URL of the file
   * @param {string} filename - The name of the file
   */
  async downloadEvidence(file_url, filename) {
    try {
      const storage = this.getStorageProvider();

      // Download file from storage
      const fileBlob = await storage.downloadFile(file_url, filename);

      return {
        success: true,
        file: fileBlob,
        filename: filename
      };
    } catch (error) {
      console.error('Download evidence error:', error);
      throw error;
    }
  }

  /**
   * Get public URL for evidence file.
   * Requires file path as input (no DB lookup).
   * @param {string} filePath
   * @param {string} fileName
   */
  async getEvidenceUrl(filePath, fileName) {
    try {
      const storage = this.getStorageProvider();
      const url = await storage.getFileUrl(filePath);

      return {
        success: true,
        url: url,
        filename: fileName
      };
    } catch (error) {
      console.error('Get evidence URL error:', error);
      throw error;
    }
  }

}

/*
-------------------------------- Usage Examples --------------------------------
*/

// Usage example for SupabaseStorageProvider
// import { supabase } from './supabase';
// export const supabaseStorage = new SupabaseStorageProvider(supabase, { bucketName: 'evidence' });

// Usage example for StorageManager and EvidenceStorageService
// import { supabase } from './supabase';
// const storageManager = new StorageManager();
// const evidenceService = new EvidenceStorageService(storageManager, supabase);
