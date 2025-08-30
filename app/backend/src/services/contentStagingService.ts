import type { IPFSHTTPClient } from 'ipfs-http-client';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface StagedContent {
  id: string;
  contentType: 'text' | 'image' | 'video' | 'audio' | 'document';
  originalName?: string;
  mimeType?: string;
  size: number;
  hash: string;
  stagingPath: string;
  metadata: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
}

export interface ContentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  contentType: 'text' | 'image' | 'video' | 'audio' | 'document';
  size: number;
  hash: string;
}

class ContentStagingService {
  private ipfs: IPFSHTTPClient | undefined;
  private stagingDir: string;
  private maxFileSize: number = 100 * 1024 * 1024; // 100MB
  private allowedMimeTypes: Set<string>;
  private stagingTTL: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Set up staging directory
    this.stagingDir = process.env.CONTENT_STAGING_DIR || '/tmp/content-staging';
    
    // Define allowed MIME types
    this.allowedMimeTypes = new Set([
      // Text
      'text/plain',
      'text/markdown',
      'application/json',
      
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      
      // Videos
      'video/mp4',
      'video/webm',
      'video/quicktime',
      
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]);

    this.initializeStagingDirectory();
  }

  private async getIpfsClient(): Promise<IPFSHTTPClient> {
    if (!this.ipfs) {
      const { create } = await import('ipfs-http-client');
      this.ipfs = create({
        host: process.env.IPFS_HOST || 'localhost',
        port: parseInt(process.env.IPFS_PORT || '5001'),
        protocol: process.env.IPFS_PROTOCOL || 'http'
      });
    }
    return this.ipfs;
  }

  private async initializeStagingDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.stagingDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create staging directory:', error);
    }
  }

  /**
   * Validate content before staging
   */
  async validateContent(
    content: Buffer | string,
    mimeType?: string,
    originalName?: string
  ): Promise<ContentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Convert content to buffer for consistent handling
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    const size = buffer.length;
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Size validation
    if (size > this.maxFileSize) {
      errors.push(`File size ${size} exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }

    if (size === 0) {
      errors.push('Content cannot be empty');
    }

    // MIME type validation
    let contentType: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text';
    
    if (mimeType) {
      if (!this.allowedMimeTypes.has(mimeType)) {
        errors.push(`MIME type ${mimeType} is not allowed`);
      }

      // Determine content type from MIME type
      if (mimeType.startsWith('image/')) {
        contentType = 'image';
      } else if (mimeType.startsWith('video/')) {
        contentType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        contentType = 'audio';
      } else if (mimeType.includes('pdf') || mimeType.includes('document')) {
        contentType = 'document';
      }
    }

    // File extension validation
    if (originalName) {
      const ext = path.extname(originalName).toLowerCase();
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
      
      if (suspiciousExtensions.includes(ext)) {
        errors.push(`File extension ${ext} is not allowed for security reasons`);
      }
    }

    // Content-specific validation
    if (contentType === 'text') {
      try {
        const text = buffer.toString('utf-8');
        
        // Check for extremely long lines that might indicate binary content
        const lines = text.split('\n');
        const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
        
        if (maxLineLength > 10000) {
          warnings.push('Text content contains very long lines, might be binary data');
        }

        // Basic malicious content detection
        const suspiciousPatterns = [
          /javascript:/gi,
          /<script/gi,
          /data:text\/html/gi,
          /vbscript:/gi
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(text)) {
            errors.push('Content contains potentially malicious patterns');
            break;
          }
        }
      } catch (error) {
        errors.push('Content is not valid UTF-8 text');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      contentType,
      size,
      hash
    };
  }

  /**
   * Stage content for moderation review
   */
  async stageContent(
    content: Buffer | string,
    metadata: Record<string, any> = {},
    mimeType?: string,
    originalName?: string
  ): Promise<StagedContent> {
    // Validate content first
    const validation = await this.validateContent(content, mimeType, originalName);
    
    if (!validation.isValid) {
      throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate unique ID for staged content
    const id = crypto.randomUUID();
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    
    // Create staging path
    const stagingPath = path.join(this.stagingDir, `${id}.staged`);
    
    // Write content to staging area
    await fs.writeFile(stagingPath, buffer);

    const stagedContent: StagedContent = {
      id,
      contentType: validation.contentType,
      originalName,
      mimeType,
      size: validation.size,
      hash: validation.hash,
      stagingPath,
      metadata: {
        ...metadata,
        validationWarnings: validation.warnings
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.stagingTTL)
    };

    return stagedContent;
  }

  /**
   * Retrieve staged content
   */
  async getStagedContent(id: string): Promise<Buffer | null> {
    try {
      const stagingPath = path.join(this.stagingDir, `${id}.staged`);
      return await fs.readFile(stagingPath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Remove staged content
   */
  async removeStagedContent(id: string): Promise<boolean> {
    try {
      const stagingPath = path.join(this.stagingDir, `${id}.staged`);
      await fs.unlink(stagingPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Publish content to IPFS after approval
   */
  async publishToIPFS(id: string): Promise<string | null> {
    try {
      const content = await this.getStagedContent(id);
      if (!content) {
        throw new Error('Staged content not found');
      }

      const ipfs = await this.getIpfsClient();
      // Add to IPFS
      const result = await ipfs.add(content);
      const cid = result.cid.toString();

      // Clean up staged content
      await this.removeStagedContent(id);

      return cid;
    } catch (error) {
      console.error('Failed to publish content to IPFS:', error);
      return null;
    }
  }

  /**
   * Clean up expired staged content
   */
  async cleanupExpiredContent(): Promise<number> {
    try {
      const files = await fs.readdir(this.stagingDir);
      let cleanedCount = 0;

      for (const file of files) {
        if (file.endsWith('.staged')) {
          const filePath = path.join(this.stagingDir, file);
          const stats = await fs.stat(filePath);
          
          // Check if file is older than TTL
          if (Date.now() - stats.mtime.getTime() > this.stagingTTL) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup expired content:', error);
      return 0;
    }
  }

  /**
   * Get staging statistics
   */
  async getStagingStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  }> {
    try {
      const files = await fs.readdir(this.stagingDir);
      let totalFiles = 0;
      let totalSize = 0;
      let oldestFile: Date | null = null;
      let newestFile: Date | null = null;

      for (const file of files) {
        if (file.endsWith('.staged')) {
          const filePath = path.join(this.stagingDir, file);
          const stats = await fs.stat(filePath);
          
          totalFiles++;
          totalSize += stats.size;
          
          if (!oldestFile || stats.mtime < oldestFile) {
            oldestFile = stats.mtime;
          }
          
          if (!newestFile || stats.mtime > newestFile) {
            newestFile = stats.mtime;
          }
        }
      }

      return {
        totalFiles,
        totalSize,
        oldestFile,
        newestFile
      };
    } catch (error) {
      console.error('Failed to get staging stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null
      };
    }
  }
}

export const contentStagingService = new ContentStagingService();
