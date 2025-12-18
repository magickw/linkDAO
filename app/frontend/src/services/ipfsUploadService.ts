import { enhancedAuthService } from './enhancedAuthService';
import { ENV_CONFIG } from '@/config/environment';

export interface UploadResult {
  cid: string;
  url: string;
  size: number;
  type: string;
}

export interface CharityDocMetadata {
  proposalId?: string;
  documentType: 'verification' | 'registration' | 'tax_exempt' | 'other';
  charityName?: string;
  ein?: string;
  uploadedBy?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class IPFSUploadService {
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB to support videos
  private readonly maxDocumentSize = 25 * 1024 * 1024; // 25MB for charity documents
  private readonly allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    'application/pdf', 'text/plain', 'application/json'
  ];
  private readonly allowedDocumentTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/json',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ];

  async uploadFile(file: File): Promise<UploadResult> {
    this.validateFile(file);

    const formData = new FormData();
    formData.append('file', file);

    // Get auth headers
    const authHeaders = await enhancedAuthService.getAuthHeaders();

    // Create headers object for fetch
    // IMPORTANT: Do NOT set Content-Type for FormData - browser will set it automatically with boundary
    const headers: Record<string, string> = {};
    // Only copy Authorization header, not Content-Type
    if (authHeaders['Authorization']) {
      headers['Authorization'] = authHeaders['Authorization'];
    }

    console.log('[ipfsUploadService] Uploading file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      url: `${ENV_CONFIG.BACKEND_URL}/api/ipfs/upload`
    });

    const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/ipfs/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      // Handle 413 Payload Too Large specifically
      if (response.status === 413) {
        throw new Error(`File "${file.name}" is too large. Maximum file size is ${this.maxFileSize / 1024 / 1024}MB. Your file is ${this.formatFileSize(file.size)}.`);
      }

      let errorMessage = `Upload failed (${response.status})`;
      try {
        const errorData = await response.json();
        console.error('[ipfsUploadService] Backend error:', errorData);
        errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
      } catch (e) {
        // If we can't parse JSON, try to get text
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch (textError) {
          // Ignore
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Map backend response to UploadResult
    // Backend returns: { success: true, data: { ipfsHash: '...', gatewayUrl: '...', ... } }
    return {
      cid: data.data.ipfsHash,
      url: data.data.gatewayUrl || data.data.url || `https://gateway.pinata.cloud/ipfs/${data.data.ipfsHash}`,
      size: data.data.size || file.size,
      type: data.data.mimeType || file.type
    };
  }

  async uploadMultiple(files: File[]): Promise<UploadResult[]> {
    return Promise.all(files.map(file => this.uploadFile(file)));
  }

  /**
   * Upload charity verification document with metadata and progress tracking
   */
  async uploadCharityDocument(
    file: File,
    metadata: CharityDocMetadata,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    this.validateCharityDocument(file);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percentage: Math.round((e.loaded / e.total) * 100),
            });
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.data);
          } catch (error) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', '/api/charity/upload');
      xhr.send(formData);
    });
  }

  /**
   * Upload multiple charity documents with progress tracking
   */
  async uploadMultipleCharityDocuments(
    files: File[],
    metadata: CharityDocMetadata,
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await this.uploadCharityDocument(
        files[i],
        metadata,
        onProgress ? (progress) => onProgress(i, progress) : undefined
      );
      results.push(result);
    }

    return results;
  }

  private validateFile(file: File): void {
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
    }

    if (!this.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed. Supported types: images (JPEG, PNG, GIF, WebP), videos (MP4, WebM, OGG, QuickTime), PDF, JSON`);
    }
  }

  private validateCharityDocument(file: File): void {
    if (file.size > this.maxDocumentSize) {
      throw new Error(`Document size exceeds ${this.maxDocumentSize / 1024 / 1024}MB limit`);
    }

    if (!this.allowedDocumentTypes.includes(file.type)) {
      throw new Error(`Document type ${file.type} not allowed. Supported types: PDF, DOC, DOCX, images`);
    }
  }

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get maximum file size in bytes
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }
}

export const ipfsUploadService = new IPFSUploadService();
