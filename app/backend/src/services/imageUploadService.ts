import axios from 'axios';
import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { imageStorage } from '../db/schema';
import { eq } from 'drizzle-orm';
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
 * Cloudinary Upload Result
 */
interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
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
 * Handles image uploads to Cloudinary CDN
 */
class ImageUploadService {
  private cloudinaryCloudName: string;
  private cloudinaryUploadPreset: string;
  private cloudinaryApiKey: string;
  private cloudinaryApiSecret: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private allowedMimeTypes: string[] = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  constructor() {
    // Cloudinary configuration
    this.cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    this.cloudinaryUploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || '';
    this.cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || '';
    this.cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (!this.cloudinaryCloudName || !this.cloudinaryUploadPreset) {
      safeLogger.warn('Cloudinary configuration not fully set. Image uploads may fail.');
    }
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
   * Upload image to Cloudinary
   */
  private async uploadToCloudinary(file: Express.Multer.File, options: UploadOptions): Promise<CloudinaryUploadResult> {
    if (!this.cloudinaryCloudName || !this.cloudinaryUploadPreset) {
      throw new Error('Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET environment variables.');
    }

    try {
      const formData = new FormData();
      const blob = new Blob([file.buffer as BlobPart], { type: file.mimetype });
      const cloudinaryFile = new File([blob], file.originalname, { type: file.mimetype });

      formData.append('file', cloudinaryFile);
      formData.append('upload_preset', this.cloudinaryUploadPreset);
      formData.append('folder', `linkdao/${options.usageType}`);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = response.data;
      return {
        publicId: data.public_id,
        url: data.url,
        secureUrl: data.secure_url,
        width: data.width,
        height: data.height,
        format: data.format,
      };
    } catch (error) {
      safeLogger.error('Cloudinary upload failed:', error);
      throw new Error(`Cloudinary upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate CDN URLs with transformations
   */
  private generateCDNUrls(publicId: string): { url: string; thumbnails: { small?: string; medium?: string; large?: string } } {
    if (!this.cloudinaryCloudName) {
      throw new Error('Cloudinary configuration is missing.');
    }

    const baseUrl = `https://res.cloudinary.com/${this.cloudinaryCloudName}/image/upload`;

    return {
      url: `${baseUrl}/${publicId}`,
      thumbnails: {
        small: `${baseUrl}/c_fill,w_150,h_150,q_80/${publicId}`,
        medium: `${baseUrl}/c_fill,w_300,h_300,q_85/${publicId}`,
        large: `${baseUrl}/c_fill,w_600,h_600,q_90/${publicId}`,
      },
    };
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

    // Upload to Cloudinary
    const uploadResult = await this.uploadToCloudinary(file, options);
    
    // Generate CDN URLs with transformations
    const cdnUrls = this.generateCDNUrls(uploadResult.publicId);

    // Store in database
    await db.insert(imageStorage).values({
      ipfsHash: uploadResult.publicId, // Using publicId as the identifier
      cdnUrl: cdnUrls.url,
      originalFilename: file.originalname,
      contentType: file.mimetype,
      fileSize: file.size,
      width: uploadResult.width,
      height: uploadResult.height,
      thumbnails: JSON.stringify(cdnUrls.thumbnails),
      ownerId: options.ownerId,
      usageType: options.usageType,
      usageReferenceId: options.usageReferenceId,
      accessCount: 0,
    });

    return {
      ipfsHash: uploadResult.publicId,
      cdnUrl: cdnUrls.url,
      thumbnails: cdnUrls.thumbnails,
      metadata: {
        originalFilename: file.originalname,
        contentType: file.mimetype,
        fileSize: file.size,
        width: uploadResult.width,
        height: uploadResult.height,
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
        safeLogger.error('Failed to upload image:', error);
        // Continue with other files even if one fails
      }
    }

    return results;
  }

  /**
   * Delete image (placeholder)
   */
  async deleteImage(ipfsHash: string): Promise<void> {
    // In a real implementation, you would call Cloudinary's delete API
    safeLogger.warn('Image deletion not implemented');
  }

  /**
   * Get image URL by public ID
   */
  getImageUrl(publicId: string, preferCDN: boolean = true): string {
    if (!this.cloudinaryCloudName) {
      throw new Error('Cloudinary configuration is missing.');
    }

    return `https://res.cloudinary.com/${this.cloudinaryCloudName}/image/upload/${publicId}`;
  }

  /**
   * Update access count for analytics
   */
  async trackImageAccess(ipfsHash: string): Promise<void> {
    try {
      // First, get the current record to get the current access count
      const records = await db
        .select()
        .from(imageStorage)
        .where(eq(imageStorage.ipfsHash, ipfsHash))
        .limit(1);

      if (records.length === 0) {
        safeLogger.warn('Image not found for access tracking:', ipfsHash);
        return;
      }

      const record = records[0];
      
      // Update access count
      await db
        .update(imageStorage)
        .set({
          accessCount: record.accessCount + 1,
          lastAccessed: new Date(),
        })
        .where(eq(imageStorage.ipfsHash, ipfsHash));
    } catch (error) {
      safeLogger.error('Failed to track image access:', error);
      // Non-critical, don't throw
    }
  }
}

export const imageUploadService = new ImageUploadService();