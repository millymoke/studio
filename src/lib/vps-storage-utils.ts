/**
 * VPS Storage Utilities
 * 
 * This module provides utilities for uploading, managing, and serving files
 * from a Hostinger VPS instead of Firebase Storage.
 * 
 * Features:
 * - File upload with progress tracking
 * - File deletion
 * - URL generation for served files
 * - File type validation
 * - Image optimization
 * - Error handling
 */

export interface VPSConfig {
  baseUrl: string;           // Your VPS domain (e.g., 'https://yourdomain.com')
  uploadEndpoint: string;    // Upload API endpoint (e.g., '/api/upload')
  deleteEndpoint: string;    // Delete API endpoint (e.g., '/api/delete')
  maxFileSize: number;       // Max file size in bytes (default: 50MB)
  allowedTypes: string[];    // Allowed MIME types
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface VPSFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
  path: string;
}

export interface UploadResponse {
  success: boolean;
  file?: VPSFile;
  error?: string;
}

// Default configuration
const DEFAULT_CONFIG: VPSConfig = {
  // Use same-origin proxy endpoints by default to avoid CORS/HTTP2 issues
  baseUrl: '',
  uploadEndpoint: '/api/vps/upload',
  deleteEndpoint: '/api/vps/delete',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/*',
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/*',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text files
    'text/plain',
    'text/*',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
    '*/*'
  ]
};

class VPSStorageService {
  private config: VPSConfig;

  constructor(config: Partial<VPSConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private joinUrl(base: string, path: string): string {
    const b = base.endsWith('/') ? base.slice(0, -1) : base;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${b}${p}`;
  }

  /**
   * Upload a file to VPS
   */
  async uploadFile(
    file: File,
    path: string = 'uploads',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);
      formData.append('userId', 'current-user'); // You can get this from auth context

      // Upload with progress tracking, with fetch fallback for environments where XHR over HTTP/2 fails
      const uploadUrl = this.joinUrl(this.config.baseUrl, this.config.uploadEndpoint);
      const response = await this.withRetry(() => this.uploadWithProgress(uploadUrl, formData, onProgress));
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        return { success: false, error: errorData.error || 'Upload failed' };
      }

      const result = await response.json();
      return {
        success: true,
        file: {
          id: result.id || this.generateFileId(),
          filename: result.filename || file.name,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          url: result.url || this.getFileUrl(result.filename, path),
          uploadedAt: new Date(),
          path: `${path}/${result.filename || file.name}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Delete a file from VPS
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = this.joinUrl(this.config.baseUrl, this.config.deleteEndpoint);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Delete failed' }));
        return { success: false, error: errorData.error || 'Delete failed' };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts: number = 2): Promise<T> {
    let lastError: any;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        await new Promise(r => setTimeout(r, 300 * (i + 1)));
      }
    }
    throw lastError;
  }

  /**
   * Get file URL
   */
  getFileUrl(filename: string, path: string = 'uploads'): string {
    return `${this.config.baseUrl}/files/uploads/${path}/${filename}`;
  }

  /**
   * Generate a unique file ID
   */
  private generateFileId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${this.formatFileSize(this.config.maxFileSize)}`
      };
    }

    // Check file type
    const rawType = file.type || '';
    const baseType = rawType.split(';')[0].trim(); // strip parameters like charset
    const isAllowed = this.config.allowedTypes.some((allowed) => {
      if (allowed === '*/*') return true;
      if (allowed.endsWith('/*')) {
        const prefix = allowed.slice(0, allowed.indexOf('/*'));
        return baseType.startsWith(prefix + '/');
      }
      return allowed === baseType;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type ${rawType} is not allowed`
      };
    }

    return { valid: true };
  }

  /**
   * Upload with progress tracking
   */
  private async uploadWithProgress(
    url: string,
    formData: FormData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Response> {
    try {
      return await this.uploadWithXHR(url, formData, onProgress);
    } catch (e: any) {
      // Fallback to fetch (no progress events) to avoid HTTP/2/XHR quirks on some CDNs
      const resp = await fetch(url, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });
      return resp;
    }
  }

  private async uploadWithXHR(
    url: string,
    formData: FormData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            };
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText
          }));
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Start upload
      xhr.open('POST', url, true);
      // Avoid sending any custom headers to minimize CORS preflight
      xhr.timeout = 120000; // 2 minutes
      xhr.send(formData);
    });
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file is an image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is a video
   */
  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Check if file is a PDF
   */
  isPDF(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  /**
   * Check if file is an Office document
   */
  isOfficeDocument(mimeType: string): boolean {
    const officeTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    return officeTypes.includes(mimeType);
  }

  /**
   * Generate optimized filename
   */
  generateOptimizedFilename(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const extension = this.getFileExtension(originalName);
    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-');
    return `${timestamp}-${baseName}-${userId}.${extension}`;
  }

  /**
   * Create directory path for user files
   */
  createUserPath(userId: string, type: 'uploads' | 'covers' | 'avatars' = 'uploads'): string {
    return `${type}/${userId}`;
  }
}

// Create singleton instance
export const vpsStorage = new VPSStorageService();

// Export individual functions for convenience
export const uploadFileToVPS = (file: File, path?: string, onProgress?: (progress: UploadProgress) => void) =>
  vpsStorage.uploadFile(file, path, onProgress);

export const deleteFileFromVPS = (filePath: string) =>
  vpsStorage.deleteFile(filePath);

export const getVPSFileUrl = (filename: string, path?: string) =>
  vpsStorage.getFileUrl(filename, path);

export const isVPSImage = (mimeType: string) =>
  vpsStorage.isImage(mimeType);

export const isVPSVideo = (mimeType: string) =>
  vpsStorage.isVideo(mimeType);

export const isVPSPDF = (mimeType: string) =>
  vpsStorage.isPDF(mimeType);

export const isVPSOfficeDocument = (mimeType: string) =>
  vpsStorage.isOfficeDocument(mimeType);

export const generateVPSFilename = (originalName: string, userId: string) =>
  vpsStorage.generateOptimizedFilename(originalName, userId);

export const createVPSUserPath = (userId: string, type?: 'uploads' | 'covers' | 'avatars') =>
  vpsStorage.createUserPath(userId, type);

// Export the service class for advanced usage
export { VPSStorageService };
