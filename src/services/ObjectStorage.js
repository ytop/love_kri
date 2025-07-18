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
   * @param {number} kriId - KRI ID
   * @param {number} reportingDate - Reporting date as integer (YYYYMMDD)
   * @param {string} filename - Original filename
   * @returns {string} Unique file path
   */
  generateFilePath(kriId, reportingDate, filename) {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `kri_evidence/${kriId}/${reportingDate}/${timestamp}_${sanitizedFilename}`;
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

/**
 * Storage Factory
 * Creates storage provider instances based on configuration
 */
export class StorageFactory {
  static create(providerType, config = {}) {
    switch (providerType.toLowerCase()) {
    case 'supabase':
      if (!config.supabaseClient) {
        throw new Error('Supabase client is required for SupabaseStorageProvider');
      }
      return new SupabaseStorageProvider(config.supabaseClient, config);
      
    case 'local':
      return new LocalStorageProvider(config);
      
    case 'mock':
      return new MockStorageProvider(config);
      
    default:
      throw new Error(`Unknown storage provider: ${providerType}`);
    }
  }

  static getAvailableProviders() {
    return ['supabase', 'local', 'mock'];
  }
}

/*
-------------------------------- split for real Supabase Storage Provider --------------------------------
*/

// export for real Supabase Storage Provider
import { supabase } from './supabase';
export const supabaseStorage = new SupabaseStorageProvider(supabase, { bucketName: 'evidence' });


// Usage example
// supabaseStorage.uploadFile(new File(['test'], 'test.txt'), 'test.txt');
// supabaseStorage.downloadFile('https://vyrojgsjtyitolvzwznl.supabase.co/storage/v1/object/public/evidence/1/20250718/1721339000_test.txt');
// supabaseStorage.deleteFile('https://vyrojgsjtyitolvzwznl.supabase.co/storage/v1/object/public/evidence/1/20250718/1721339000_test.txt');
// supabaseStorage.getFileUrl('https://vyrojgsjtyitolvzwznl.supabase.co/storage/v1/object/public/evidence/1/20250718/1721339000_test.txt');
