import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';

// Configuration
const STORAGE_BASE_PATH = process.env.SELF_HOSTED_STORAGE_PATH || path.join(process.cwd(), 'storage');
const ENCRYPTION_KEY = process.env.SELF_HOSTED_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const BACKUP_PATH = process.env.SELF_HOSTED_BACKUP_PATH || path.join(process.cwd(), 'backups');

export interface StorageFileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  encrypted: boolean;
  userId?: string;
  contentType: string;
  createdAt: Date;
  updatedAt: Date;
  checksum: string;
  accessControl: {
    owner: string;
    readPermissions: string[];
    writePermissions: string[];
  };
}

export interface UploadOptions {
  userId: string;
  contentType: string;
  encrypt?: boolean;
  accessControl?: {
    readPermissions: string[];
    writePermissions: string[];
  };
}

export interface FileUploadResult {
  id: string;
  url: string;
  metadata: StorageFileMetadata;
}

export class SelfHostedStorageService {
  private encryptionKey: Buffer;
  private initialized: boolean = false;

  constructor() {
    this.encryptionKey = Buffer.from(ENCRYPTION_KEY, 'hex');
    this.initializeStorage();
  }

  /**
   * Initialize storage directories
   */
  private async initializeStorage(): Promise<void> {
    try {
      // Create base storage directory
      await fs.mkdir(STORAGE_BASE_PATH, { recursive: true });
      
      // Create backup directory
      await fs.mkdir(BACKUP_PATH, { recursive: true });
      
      // Create metadata directory
      await fs.mkdir(path.join(STORAGE_BASE_PATH, 'metadata'), { recursive: true });
      
      this.initialized = true;
      safeLogger.info('Self-hosted storage initialized successfully');
    } catch (error) {
      safeLogger.error('Failed to initialize self-hosted storage:', error);
      throw new Error('Storage initialization failed');
    }
  }

  /**
   * Upload a file with optional encryption
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    options: UploadOptions
  ): Promise<FileUploadResult> {
    if (!this.initialized) {
      throw new Error('Storage service not initialized');
    }

    try {
      const startTime = performance.now();
      
      // Generate unique file ID
      const fileId = this.generateFileId(filename, options.userId);
      
      // Process file (encrypt if requested)
      const processedBuffer = options.encrypt !== false 
        ? await this.encryptContent(buffer) 
        : buffer;
      
      // Generate checksum for integrity verification
      const checksum = this.generateChecksum(buffer);
      
      // Save file to storage
      const filePath = path.join(STORAGE_BASE_PATH, fileId);
      await fs.writeFile(filePath, processedBuffer);
      
      // Create metadata
      const metadata: StorageFileMetadata = {
        id: fileId,
        originalName: filename,
        mimeType: this.getMimeType(filename),
        size: buffer.length,
        encrypted: options.encrypt !== false,
        userId: options.userId,
        contentType: options.contentType,
        createdAt: new Date(),
        updatedAt: new Date(),
        checksum,
        accessControl: {
          owner: options.userId,
          readPermissions: options.accessControl?.readPermissions || [options.userId],
          writePermissions: options.accessControl?.writePermissions || [options.userId],
        }
      };
      
      // Save metadata
      await this.saveMetadata(fileId, metadata);
      
      const endTime = performance.now();
      safeLogger.info(`File uploaded successfully: ${fileId} (${endTime - startTime}ms)`);
      
      return {
        id: fileId,
        url: `/api/storage/${fileId}`,
        metadata
      };
    } catch (error) {
      safeLogger.error('File upload failed:', error);
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download a file with decryption if needed
   */
  async downloadFile(fileId: string, userId: string): Promise<{ buffer: Buffer; metadata: StorageFileMetadata }> {
    try {
      // Load metadata
      const metadata = await this.loadMetadata(fileId);
      
      // Check access permissions
      if (!this.hasReadPermission(metadata, userId)) {
        throw new Error('Access denied: Insufficient permissions');
      }
      
      // Load file
      const filePath = path.join(STORAGE_BASE_PATH, fileId);
      const buffer = await fs.readFile(filePath);
      
      // Decrypt if needed
      const decryptedBuffer = metadata.encrypted 
        ? await this.decryptContent(buffer) 
        : buffer;
      
      // Verify integrity
      const checksum = this.generateChecksum(decryptedBuffer);
      if (checksum !== metadata.checksum) {
        throw new Error('File integrity check failed');
      }
      
      return {
        buffer: decryptedBuffer,
        metadata
      };
    } catch (error) {
      safeLogger.error(`File download failed for ${fileId}:`, error);
      throw new Error(`File download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      // Load metadata
      const metadata = await this.loadMetadata(fileId);
      
      // Check write permissions
      if (!this.hasWritePermission(metadata, userId)) {
        throw new Error('Access denied: Insufficient permissions');
      }
      
      // Delete file
      const filePath = path.join(STORAGE_BASE_PATH, fileId);
      await fs.unlink(filePath);
      
      // Delete metadata
      const metadataPath = path.join(STORAGE_BASE_PATH, 'metadata', `${fileId}.json`);
      await fs.unlink(metadataPath);
      
      safeLogger.info(`File deleted successfully: ${fileId}`);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false; // File not found
      }
      
      safeLogger.error(`File deletion failed for ${fileId}:`, error);
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List files for a user
   */
  async listUserFiles(userId: string, limit: number = 50, offset: number = 0): Promise<StorageFileMetadata[]> {
    try {
      const metadataDir = path.join(STORAGE_BASE_PATH, 'metadata');
      const files = await fs.readdir(metadataDir);
      
      const userFiles: StorageFileMetadata[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const metadata = await this.loadMetadata(file.replace('.json', ''));
            if (this.hasReadPermission(metadata, userId)) {
              userFiles.push(metadata);
            }
          } catch (error) {
            safeLogger.warn(`Failed to load metadata for ${file}:`, error);
          }
        }
      }
      
      // Sort by creation date (newest first)
      userFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Apply pagination
      return userFiles.slice(offset, offset + limit);
    } catch (error) {
      safeLogger.error(`Failed to list files for user ${userId}:`, error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update file access control
   */
  async updateAccessControl(
    fileId: string,
    userId: string,
    accessControl: {
      readPermissions?: string[];
      writePermissions?: string[];
    }
  ): Promise<StorageFileMetadata> {
    try {
      // Load metadata
      const metadata = await this.loadMetadata(fileId);
      
      // Check owner permissions
      if (metadata.accessControl.owner !== userId) {
        throw new Error('Access denied: Only file owner can update access control');
      }
      
      // Update access control
      if (accessControl.readPermissions) {
        metadata.accessControl.readPermissions = accessControl.readPermissions;
      }
      
      if (accessControl.writePermissions) {
        metadata.accessControl.writePermissions = accessControl.writePermissions;
      }
      
      metadata.updatedAt = new Date();
      
      // Save updated metadata
      await this.saveMetadata(fileId, metadata);
      
      return metadata;
    } catch (error) {
      safeLogger.error(`Failed to update access control for ${fileId}:`, error);
      throw new Error(`Failed to update access control: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Encrypt content using AES-256-GCM
   */
  private async encryptContent(content: Buffer): Promise<Buffer> {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(content),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted content
      return Buffer.concat([iv, authTag, encrypted]);
    } catch (error) {
      safeLogger.error('Encryption failed:', error);
      throw new Error('Content encryption failed');
    }
  }

  /**
   * Decrypt content using AES-256-GCM
   */
  private async decryptContent(encryptedContent: Buffer): Promise<Buffer> {
    try {
      // Extract IV, auth tag, and encrypted content
      const iv = encryptedContent.subarray(0, 16);
      const authTag = encryptedContent.subarray(16, 32);
      const encrypted = encryptedContent.subarray(32);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
    } catch (error) {
      safeLogger.error('Decryption failed:', error);
      throw new Error('Content decryption failed');
    }
  }

  /**
   * Generate file ID
   */
  private generateFileId(filename: string, userId: string): string {
    const timestamp = Date.now();
    const hash = createHash('sha256')
      .update(`${userId}-${filename}-${timestamp}`)
      .digest('hex');
    
    const extension = path.extname(filename);
    return `${hash.substring(0, 32)}${extension}`;
  }

  /**
   * Generate checksum for file integrity
   */
  private generateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Save metadata to file
   */
  private async saveMetadata(fileId: string, metadata: StorageFileMetadata): Promise<void> {
    const metadataPath = path.join(STORAGE_BASE_PATH, 'metadata', `${fileId}.json`);
    const metadataContent = JSON.stringify(metadata, null, 2);
    await fs.writeFile(metadataPath, metadataContent);
  }

  /**
   * Load metadata from file
   */
  private async loadMetadata(fileId: string): Promise<StorageFileMetadata> {
    const metadataPath = path.join(STORAGE_BASE_PATH, 'metadata', `${fileId}.json`);
    const metadataContent = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(metadataContent) as StorageFileMetadata;
  }

  /**
   * Check read permission
   */
  private hasReadPermission(metadata: StorageFileMetadata, userId: string): boolean {
    return metadata.accessControl.owner === userId || 
           metadata.accessControl.readPermissions.includes(userId) ||
           metadata.accessControl.readPermissions.includes('public');
  }

  /**
   * Check write permission
   */
  private hasWritePermission(metadata: StorageFileMetadata, userId: string): boolean {
    return metadata.accessControl.owner === userId || 
           metadata.accessControl.writePermissions.includes(userId);
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const extension = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(userId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    userFiles?: number;
    userSize?: number;
  }> {
    try {
      const metadataDir = path.join(STORAGE_BASE_PATH, 'metadata');
      const files = await fs.readdir(metadataDir);
      
      let totalFiles = 0;
      let totalSize = 0;
      let userFiles = 0;
      let userSize = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const metadata = await this.loadMetadata(file.replace('.json', ''));
            totalFiles++;
            totalSize += metadata.size;
            
            if (userId && metadata.userId === userId) {
              userFiles++;
              userSize += metadata.size;
            }
          } catch (error) {
            safeLogger.warn(`Failed to load metadata for ${file}:`, error);
          }
        }
      }
      
      const stats: any = { totalFiles, totalSize };
      if (userId) {
        stats.userFiles = userFiles;
        stats.userSize = userSize;
      }
      
      return stats;
    } catch (error) {
      safeLogger.error('Failed to get storage stats:', error);
      throw new Error(`Failed to get storage stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export singleton instance
export const selfHostedStorageService = new SelfHostedStorageService();
export default SelfHostedStorageService;