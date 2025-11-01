import sharp from 'sharp';
import { safeLogger } from '../utils/safeLogger';
import { createHash } from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db/index';
import { safeLogger } from '../utils/safeLogger';
import { imageStorage } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import ipfsService from './ipfsService';
import { safeLogger } from '../utils/safeLogger';
import { CDNIntegrationService } from './cdnIntegrationService';
import { safeLogger } from '../utils/safeLogger';
import { eq, and } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

// File validation constants
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_FILE_SIZE = 1024; // 1KB

// Thumbnail sizes configuration
const THUMBNAIL_SIZES = [
  { name: 'thumb', width: 150, height: 150, quality: 80 },
  { name: 'small', width: 300, height: 300, quality: 85 },
  { name: 'medium', width: 600, height: 600, quality: 90 },
  { name: 'large', width: 1200, height: 1200, quality: 95 }
];

export interface ImageUploadOptions {
  userId: string;
  usageType: 'profile' | 'cover' | 'listing' | 'product';
  usageReferenceId?: string;
  generateThumbnails?: boolean;
  optimizeForWeb?: boolean;
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
  };
}

export interface ImageUploadResult {
  id: string;
  ipfsHash: string;
  cdnUrl: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  width: number;
  height: number;
  thumbnails: Record<string, string>;
  backupUrls: string[];
}

export interface ThumbnailResult {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
}

class ImageStorageService {
  private cdnService: CDNIntegrationService | null = null;

  constructor() {
    // Initialize CDN service if configuration is available
    this.initializeCDN();
  }

  private initializeCDN(): void {
    try {
      const cdnConfig = {
        distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID || '',
        bucketName: process.env.S3_BUCKET_NAME || '',
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN || ''
      };

      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      if (cdnConfig.distributionId && cdnConfig.bucketName) {
        this.cdnService = new CDNIntegrationService(cdnConfig, redisUrl);
      }
    } catch (error) {
      safeLogger.warn('CDN service initialization failed:', error);
    }
  }

  /**
   * Validate uploaded image file
   */
  async validateImage(buffer: Buffer, filename: string): Promise<ImageValidationResult> {
    const errors: string[] = [];

    try {
      // Check file size
      if (buffer.length > MAX_FILE_SIZE) {
        errors.push(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      if (buffer.length < MIN_FILE_SIZE) {
        errors.push(`File size is below minimum limit of ${MIN_FILE_SIZE} bytes`);
      }

      // Detect file type using Sharp
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.format) {
        errors.push('Unable to detect image format');
        return { isValid: false, errors };
      }

      const mimeType = `image/${metadata.format}`;
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        errors.push(`Unsupported file type: ${metadata.format}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
      }

      // Check image dimensions
      if (!metadata.width || !metadata.height) {
        errors.push('Unable to determine image dimensions');
      } else {
        if (metadata.width < 50 || metadata.height < 50) {
          errors.push('Image dimensions too small (minimum 50x50 pixels)');
        }
        if (metadata.width > 8000 || metadata.height > 8000) {
          errors.push('Image dimensions too large (maximum 8000x8000 pixels)');
        }
      }

      // Content validation - check if it's actually an image
      try {
        await sharp(buffer).jpeg({ quality: 1 }).toBuffer();
      } catch (sharpError) {
        errors.push('File content is not a valid image');
      }

      // Check for potential security issues
      if (this.containsSuspiciousContent(buffer)) {
        errors.push('File contains potentially malicious content');
      }

      return {
        isValid: errors.length === 0,
        errors,
        metadata: metadata.width && metadata.height ? {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length,
          hasAlpha: metadata.hasAlpha || false
        } : undefined
      };

    } catch (error) {
      safeLogger.error('Image validation error:', error);
      return {
        isValid: false,
        errors: ['Failed to validate image file']
      };
    }
  }

  /**
   * Optimize image for web delivery with enhanced performance
   */
  async optimizeImage(buffer: Buffer, options: {
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    progressive?: boolean;
    stripMetadata?: boolean;
    maxWidth?: number;
    maxHeight?: number;
  } = {}): Promise<Buffer> {
    const startTime = performance.now();
    
    try {
      const {
        quality = 85,
        format = 'jpeg',
        progressive = true,
        stripMetadata = true,
        maxWidth = 2048,
        maxHeight = 2048
      } = options;

      let pipeline = sharp(buffer, {
        // Performance optimizations
        sequentialRead: true,
        limitInputPixels: 268402689, // ~16k x 16k limit
      });

      // Get metadata for optimization decisions
      const metadata = await pipeline.metadata();
      
      // Resize if image is too large
      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          pipeline = pipeline.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3 // High quality resampling
          });
        }
      }

      // Strip metadata for privacy and size reduction
      if (stripMetadata) {
        pipeline = pipeline.withMetadata({});
      }

      // Apply format-specific optimizations
      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality,
            progressive,
            mozjpeg: true, // Use mozjpeg encoder for better compression
            trellisQuantisation: true,
            overshootDeringing: true,
            optimizeScans: true
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            quality,
            progressive,
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: true // Use palette when possible
          });
          break;
        case 'webp':
          pipeline = pipeline.webp({
            quality,
            effort: 6, // Maximum compression effort
            smartSubsample: true,
            nearLossless: quality > 90
          });
          break;
      }

      const result = await pipeline.toBuffer();
      
      const duration = performance.now() - startTime;
      safeLogger.info(`Image optimization completed in ${duration.toFixed(2)}ms, size reduced from ${buffer.length} to ${result.length} bytes`);
      
      return result;
    } catch (error) {
      safeLogger.error('Image optimization error:', error);
      throw new Error('Failed to optimize image');
    }
  }

  /**
   * Generate thumbnails in multiple sizes with parallel processing
   */
  async generateThumbnails(buffer: Buffer): Promise<ThumbnailResult[]> {
    const startTime = performance.now();
    
    try {
      // Process thumbnails in parallel for better performance
      const thumbnailPromises = THUMBNAIL_SIZES.map(async (size) => {
        const thumbnailBuffer = await sharp(buffer, {
          sequentialRead: true,
          limitInputPixels: 268402689
        })
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center',
            kernel: sharp.kernel.lanczos3
          })
          .jpeg({ 
            quality: size.quality, 
            progressive: true,
            mozjpeg: true,
            trellisQuantisation: true,
            optimizeScans: true
          })
          .toBuffer();

        return {
          name: size.name,
          buffer: thumbnailBuffer,
          width: size.width,
          height: size.height,
          size: thumbnailBuffer.length
        };
      });

      const thumbnails = await Promise.all(thumbnailPromises);
      
      const duration = performance.now() - startTime;
      safeLogger.info(`Generated ${thumbnails.length} thumbnails in ${duration.toFixed(2)}ms`);
      
      return thumbnails;
    } catch (error) {
      safeLogger.error('Thumbnail generation error:', error);
      throw new Error('Failed to generate thumbnails');
    }
  }

  /**
   * Upload image with comprehensive processing
   */
  async uploadImage(
    buffer: Buffer,
    filename: string,
    options: ImageUploadOptions
  ): Promise<ImageUploadResult> {
    try {
      // Validate the image
      const validation = await this.validateImage(buffer, filename);
      if (!validation.isValid) {
        throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
      }

      const metadata = validation.metadata!;

      // Optimize the main image
      let optimizedBuffer = buffer;
      if (options.optimizeForWeb !== false) {
        optimizedBuffer = await this.optimizeImage(buffer, {
          quality: 90,
          format: metadata.format === 'png' ? 'png' : 'jpeg',
          progressive: true,
          stripMetadata: true
        });
      }

      // Upload main image to IPFS
      const mainUploadResult = await ipfsService.uploadFile(optimizedBuffer, filename);
      
      // Pin the content to ensure persistence
      await ipfsService.pinContent(mainUploadResult.hash);

      // Generate and upload thumbnails
      const thumbnailUrls: Record<string, string> = {};
      const backupUrls: string[] = [mainUploadResult.url];

      if (options.generateThumbnails !== false) {
        const thumbnails = await this.generateThumbnails(optimizedBuffer);
        
        for (const thumbnail of thumbnails) {
          const thumbnailFilename = this.generateThumbnailFilename(filename, thumbnail.name);
          const thumbnailUpload = await ipfsService.uploadFile(thumbnail.buffer, thumbnailFilename);
          await ipfsService.pinContent(thumbnailUpload.hash);
          
          thumbnailUrls[thumbnail.name] = thumbnailUpload.url;
          backupUrls.push(thumbnailUpload.url);
        }
      }

      // Upload to CDN if available
      let cdnUrl = mainUploadResult.url;
      if (this.cdnService) {
        try {
          const cdnKey = `images/${mainUploadResult.hash}/${filename}`;
          await this.cdnService.uploadAsset(cdnKey, optimizedBuffer, metadata.format === 'png' ? 'image/png' : 'image/jpeg');
          cdnUrl = this.cdnService.generateCDNUrl(cdnKey);
        } catch (cdnError) {
          safeLogger.warn('CDN upload failed, using IPFS URL:', cdnError);
        }
      }

      // Store metadata in database
      const imageRecord = await db.insert(imageStorage).values({
        ipfsHash: mainUploadResult.hash,
        cdnUrl,
        originalFilename: filename,
        contentType: metadata.format === 'png' ? 'image/png' : 'image/jpeg',
        fileSize: optimizedBuffer.length,
        width: metadata.width,
        height: metadata.height,
        thumbnails: JSON.stringify(thumbnailUrls),
        ownerId: options.userId,
        usageType: options.usageType,
        usageReferenceId: options.usageReferenceId,
        backupUrls: JSON.stringify(backupUrls),
        accessCount: 0,
        lastAccessed: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return {
        id: imageRecord[0].id,
        ipfsHash: mainUploadResult.hash,
        cdnUrl,
        originalFilename: filename,
        contentType: imageRecord[0].contentType,
        fileSize: optimizedBuffer.length,
        width: metadata.width,
        height: metadata.height,
        thumbnails: thumbnailUrls,
        backupUrls
      };

    } catch (error) {
      safeLogger.error('Image upload error:', error);
      throw error;
    }
  }

  /**
   * Get image by ID with access tracking
   */
  async getImage(imageId: string): Promise<ImageUploadResult | null> {
    try {
      const records = await db
        .select()
        .from(imageStorage)
        .where(eq(imageStorage.id, imageId))
        .limit(1);

      if (records.length === 0) {
        return null;
      }

      const record = records[0];

      // Update access tracking
      await db
        .update(imageStorage)
        .set({
          accessCount: record.accessCount + 1,
          lastAccessed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(imageStorage.id, imageId));

      return {
        id: record.id,
        ipfsHash: record.ipfsHash,
        cdnUrl: record.cdnUrl || '',
        originalFilename: record.originalFilename || '',
        contentType: record.contentType || '',
        fileSize: record.fileSize || 0,
        width: record.width || 0,
        height: record.height || 0,
        thumbnails: record.thumbnails ? JSON.parse(record.thumbnails) : {},
        backupUrls: record.backupUrls ? JSON.parse(record.backupUrls) : []
      };

    } catch (error) {
      safeLogger.error('Get image error:', error);
      return null;
    }
  }

  /**
   * Delete image and cleanup resources
   */
  async deleteImage(imageId: string, userId: string): Promise<boolean> {
    try {
      // Get image record
      const records = await db
        .select()
        .from(imageStorage)
        .where(and(
          eq(imageStorage.id, imageId),
          eq(imageStorage.ownerId, userId)
        ))
        .limit(1);

      if (records.length === 0) {
        return false;
      }

      const record = records[0];

      // Unpin from IPFS
      try {
        await ipfsService.unpinContent(record.ipfsHash);
      } catch (unpinError) {
        safeLogger.warn('Failed to unpin from IPFS:', unpinError);
      }

      // Delete from CDN
      if (this.cdnService && record.cdnUrl) {
        try {
          const cdnKey = `images/${record.ipfsHash}/${record.originalFilename}`;
          await this.cdnService.deleteAsset(cdnKey);
        } catch (cdnError) {
          safeLogger.warn('Failed to delete from CDN:', cdnError);
        }
      }

      // Delete from database
      await db
        .delete(imageStorage)
        .where(eq(imageStorage.id, imageId));

      return true;

    } catch (error) {
      safeLogger.error('Delete image error:', error);
      return false;
    }
  }

  /**
   * Get images by usage type and reference
   */
  async getImagesByUsage(usageType: string, usageReferenceId?: string, userId?: string): Promise<ImageUploadResult[]> {
    try {
      const conditions = [
        eq(imageStorage.usageType, usageType),
        usageReferenceId ? eq(imageStorage.usageReferenceId, usageReferenceId) : undefined,
        userId ? eq(imageStorage.ownerId, userId) : undefined
      ].filter(Boolean) as any[];

      const records = await db
        .select()
        .from(imageStorage)
        .where(and(...conditions));

      return records.map(record => ({
        id: record.id,
        ipfsHash: record.ipfsHash,
        cdnUrl: record.cdnUrl || '',
        originalFilename: record.originalFilename || '',
        contentType: record.contentType || '',
        fileSize: record.fileSize || 0,
        width: record.width || 0,
        height: record.height || 0,
        thumbnails: record.thumbnails ? JSON.parse(record.thumbnails) : {},
        backupUrls: record.backupUrls ? JSON.parse(record.backupUrls) : []
      }));

    } catch (error) {
      safeLogger.error('Get images by usage error:', error);
      return [];
    }
  }

  /**
   * Generate content hash for duplicate detection
   */
  generateContentHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check for duplicate images
   */
  async findDuplicateImage(buffer: Buffer, userId: string): Promise<ImageUploadResult | null> {
    try {
      const contentHash = this.generateContentHash(buffer);
      
      // This is a simplified approach - in production, you might want to use
      // perceptual hashing for better duplicate detection
      const records = await db
        .select()
        .from(imageStorage)
        .where(eq(imageStorage.ownerId, userId));

      // For now, we'll just check file size as a basic duplicate detection
      // In a full implementation, you'd store and compare content hashes
      for (const record of records) {
        if (record.fileSize === buffer.length) {
          return {
            id: record.id,
            ipfsHash: record.ipfsHash,
            cdnUrl: record.cdnUrl || '',
            originalFilename: record.originalFilename || '',
            contentType: record.contentType || '',
            fileSize: record.fileSize || 0,
            width: record.width || 0,
            height: record.height || 0,
            thumbnails: record.thumbnails ? JSON.parse(record.thumbnails) : {},
            backupUrls: record.backupUrls ? JSON.parse(record.backupUrls) : []
          };
        }
      }

      return null;
    } catch (error) {
      safeLogger.error('Duplicate detection error:', error);
      return null;
    }
  }

  // Private helper methods
  private containsSuspiciousContent(buffer: Buffer): boolean {
    // Basic security check - look for suspicious patterns
    const content = buffer.toString('hex');
    
    // Check for embedded scripts or suspicious patterns
    const suspiciousPatterns = [
      '3c736372697074', // <script
      '6a617661736372697074', // javascript
      '6f6e6c6f6164', // onload
      '6f6e6572726f72', // onerror
    ];

    return suspiciousPatterns.some(pattern => content.includes(pattern));
  }

  private generateThumbnailFilename(originalFilename: string, size: string): string {
    const ext = originalFilename.split('.').pop() || 'jpg';
    const name = originalFilename.replace(/\.[^/.]+$/, '');
    return `${name}_${size}.${ext}`;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(userId?: string): Promise<{
    totalImages: number;
    totalSize: number;
    averageSize: number;
    byUsageType: Record<string, number>;
  }> {
    try {
      const conditions = userId ? [eq(imageStorage.ownerId, userId)] : [];
      
      const records = await db
        .select()
        .from(imageStorage)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const totalImages = records.length;
      const totalSize = records.reduce((sum, record) => sum + (record.fileSize || 0), 0);
      const averageSize = totalImages > 0 ? totalSize / totalImages : 0;

      const byUsageType: Record<string, number> = {};
      records.forEach(record => {
        const type = record.usageType || 'unknown';
        byUsageType[type] = (byUsageType[type] || 0) + 1;
      });

      return {
        totalImages,
        totalSize,
        averageSize,
        byUsageType
      };

    } catch (error) {
      safeLogger.error('Storage stats error:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        averageSize: 0,
        byUsageType: {}
      };
    }
  }
}

export default new ImageStorageService();