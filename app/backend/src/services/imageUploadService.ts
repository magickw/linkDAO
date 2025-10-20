import { create } from 'ipfs-http-client';
import { db } from '../db';
import { imageStorage } from '../db/schema';
import crypto from 'crypto';

/**
 * Image Upload Result
 */
interface UploadResult {
  ipfsHash: string;
  cdnUrl?: string;
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  metadata: {
    originalFilename: string;
    contentType: string;
    fileSize: number;
    width?: number;
    height?: number;
  };
}

/**
 * Image Upload Options
 */
interface UploadOptions {
  ownerId: string;
  usageType: 'profile' | 'cover' | 'listing' | 'product';
  usageReferenceId?: string;
  generateThumbnails?: boolean;
}

/**
 * Image Upload Service
 * Handles image uploads to IPFS and CDN storage
 */
class ImageUploadService {
  private ipfsClient: any;
  private cdnBaseUrl: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private allowedMimeTypes: string[] = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  constructor() {
    // Initialize IPFS client
    const ipfsUrl = process.env.IPFS_URL || 'http://127.0.0.1:5001';
    try {
      this.ipfsClient = create({ url: ipfsUrl });
    } catch (error) {
      console.warn('IPFS client initialization failed, will use fallback storage:', error);
      this.ipfsClient = null;
    }

    // CDN base URL (could be Cloudflare, AWS CloudFront, etc.)
    this.cdnBaseUrl = process.env.CDN_BASE_URL || 'https://cdn.linkdao.io';
  }

  /**
   * Validate image file
   */
  private validateImage(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    // Check if file buffer exists
    if (!file.buffer) {
      throw new Error('File buffer is empty');
    }
  }

  /**
   * Upload image to IPFS
   */
  private async uploadToIPFS(file: Express.Multer.File): Promise<string> {
    if (!this.ipfsClient) {
      // Fallback: generate a hash-based identifier
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
      console.warn('IPFS not available, using hash-based identifier:', hash);
      return hash;
    }

    try {
      const result = await this.ipfsClient.add(file.buffer, {
        pin: true, // Pin the file to prevent garbage collection
      });
      return result.path; // This is the IPFS hash (CID)
    } catch (error) {
      console.error('IPFS upload failed:', error);
      // Fallback to hash-based identifier
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
      return hash;
    }
  }

  /**
   * Upload image to CDN (placeholder - implement based on your CDN provider)
   */
  private async uploadToCDN(file: Express.Multer.File, ipfsHash: string): Promise<string> {
    // TODO: Implement actual CDN upload based on your provider
    // For now, return a URL that points to IPFS gateway
    const ipfsGateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';
    return `${ipfsGateway}/${ipfsHash}`;
  }

  /**
   * Generate thumbnails (placeholder - requires image processing library)
   */
  private async generateThumbnails(file: Express.Multer.File, ipfsHash: string): Promise<{
    small?: string;
    medium?: string;
    large?: string;
  }> {
    // TODO: Implement thumbnail generation using sharp or similar library
    // For now, return empty object
    return {};
  }

  /**
   * Extract image dimensions (placeholder)
   */
  private async extractDimensions(file: Express.Multer.File): Promise<{ width?: number; height?: number }> {
    // TODO: Implement using sharp or similar library
    return {};
  }

  /**
   * Upload single image
   */
  async uploadImage(
    file: Express.Multer.File,
    options: UploadOptions
  ): Promise<UploadResult> {
    // Validate image
    this.validateImage(file);

    // Upload to IPFS
    const ipfsHash = await this.uploadToIPFS(file);

    // Upload to CDN
    const cdnUrl = await this.uploadToCDN(file, ipfsHash);

    // Generate thumbnails if requested
    let thumbnails = {};
    if (options.generateThumbnails) {
      thumbnails = await this.generateThumbnails(file, ipfsHash);
    }

    // Extract dimensions
    const dimensions = await this.extractDimensions(file);

    // Store in database
    await db.insert(imageStorage).values({
      ipfsHash,
      cdnUrl,
      originalFilename: file.originalname,
      contentType: file.mimetype,
      fileSize: file.size,
      width: dimensions.width,
      height: dimensions.height,
      thumbnails: JSON.stringify(thumbnails),
      ownerId: options.ownerId,
      usageType: options.usageType,
      usageReferenceId: options.usageReferenceId,
      accessCount: 0,
    });

    return {
      ipfsHash,
      cdnUrl,
      thumbnails,
      metadata: {
        originalFilename: file.originalname,
        contentType: file.mimetype,
        fileSize: file.size,
        width: dimensions.width,
        height: dimensions.height,
      },
    };
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    options: UploadOptions
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadImage(file, options);
        results.push(result);
      } catch (error) {
        console.error('Failed to upload image:', error);
        // Continue with other files even if one fails
      }
    }

    return results;
  }

  /**
   * Delete image from IPFS (unpin)
   */
  async deleteImage(ipfsHash: string): Promise<void> {
    if (!this.ipfsClient) {
      console.warn('IPFS not available, skipping delete');
      return;
    }

    try {
      await this.ipfsClient.pin.rm(ipfsHash);
    } catch (error) {
      console.error('Failed to unpin from IPFS:', error);
      // Don't throw error, as the image might still be accessible
    }

    // Update database to mark as deleted
    // Note: We don't actually delete from DB for audit purposes
    // You might want to add a 'deleted' flag to the schema
  }

  /**
   * Get image URL by IPFS hash
   */
  getImageUrl(ipfsHash: string, preferCDN: boolean = true): string {
    if (preferCDN) {
      // Check if we have a CDN URL in database
      // For now, construct from IPFS gateway
      const ipfsGateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';
      return `${ipfsGateway}/${ipfsHash}`;
    }

    const ipfsGateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';
    return `${ipfsGateway}/${ipfsHash}`;
  }

  /**
   * Update access count for analytics
   */
  async trackImageAccess(ipfsHash: string): Promise<void> {
    try {
      await db
        .update(imageStorage)
        .set({
          accessCount: db.raw('access_count + 1') as any,
          lastAccessed: new Date(),
        })
        .where(db.eq(imageStorage.ipfsHash, ipfsHash));
    } catch (error) {
      console.error('Failed to track image access:', error);
      // Non-critical, don't throw
    }
  }
}

export const imageUploadService = new ImageUploadService();
