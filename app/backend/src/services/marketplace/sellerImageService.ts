/**
 * Seller Image Service
 * Unified image processing and storage service for seller system
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

let sharp;
let sharpAvailable = false;

// Dynamically import sharp with error handling
try {
  sharp = require('sharp');
  sharpAvailable = true;
  console.log('✅ Sharp module loaded successfully in sellerImageService');
} catch (error) {
  console.warn('⚠️ Sharp module not available in sellerImageService:', error.message);
  // Define a fallback object with methods that return errors or skip processing
  sharp = {
    metadata: () => Promise.reject(new Error('Sharp not available')),
    jpeg: () => ({ toBuffer: () => Promise.reject(new Error('Sharp not available')) }),
    resize: () => ({ 
      jpeg: () => ({ toBuffer: () => Promise.reject(new Error('Sharp not available')) }),
      png: () => ({ toBuffer: () => Promise.reject(new Error('Sharp not available')) }),
      webp: () => ({ toBuffer: () => Promise.reject(new Error('Sharp not available')) })
    })
  };
}
import crypto from 'crypto';
import imageStorageService from './imageStorageService';
import { cdnService } from './cdnService';
import { SellerError, SellerErrorType } from '../../types/sellerError';

export interface ImageUploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  context: 'profile' | 'cover' | 'listing';
  userId: string;
  metadata?: Record<string, any>;
}

export interface ProcessedImageResult {
  id: string;
  originalUrl: string;
  cdnUrl: string;
  thumbnails: {
    small: string;
    medium: string;
    large: string;
  };
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
    originalSize: number;
    compressionRatio: number;
  };
  ipfsHash?: string;
  createdAt: string;
}

export interface ImageValidationOptions {
  maxSize: number;
  allowedTypes: string[];
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

class SellerImageService {
  private readonly contextConfigs: Record<string, ImageValidationOptions> = {
    profile: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      minWidth: 100,
      minHeight: 100,
      maxWidth: 2000,
      maxHeight: 2000,
    },
    cover: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      minWidth: 400,
      minHeight: 200,
      maxWidth: 3000,
      maxHeight: 1500,
    },
    listing: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      minWidth: 200,
      minHeight: 200,
      maxWidth: 2000,
      maxHeight: 2000,
    },
  };

  /**
   * Upload and process image
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
   */
  async uploadImage(input: ImageUploadInput): Promise<ProcessedImageResult> {
    try {
      // Step 1: Validate input
      await this.validateImage(input);

      // Step 2: Process image (resize, optimize, generate thumbnails)
      const processedImages = await this.processImage(input);

      // Step 3: Upload to storage (IPFS + CDN)
      const storageResults = await this.uploadToStorage(processedImages, input);

      // Step 4: Generate CDN URLs
      const cdnUrls = await this.generateCDNUrls(storageResults, input.context);

      // Step 5: Save metadata to database
      const imageRecord = await this.saveImageRecord(input, storageResults, cdnUrls);

      return {
        id: imageRecord.id,
        originalUrl: storageResults.main.cdnUrl, // Use cdnUrl instead of url
        cdnUrl: cdnUrls.main,
        thumbnails: cdnUrls.thumbnails,
        metadata: {
          width: processedImages.main.info.width,
          height: processedImages.main.info.height,
          size: processedImages.main.data.length,
          format: processedImages.main.info.format,
          originalSize: input.size,
          compressionRatio: Math.round((1 - processedImages.main.data.length / input.size) * 100),
        },
        ipfsHash: storageResults.main.ipfsHash,
        createdAt: imageRecord.createdAt,
      };

    } catch (error) {
      if (error instanceof SellerError) {
        throw error;
      }

      throw new SellerError(
        SellerErrorType.API_ERROR,
        `Image upload failed: ${error.message}`,
        'IMAGE_UPLOAD_ERROR',
        { originalError: error, input: { ...input, buffer: '[Buffer]' } }
      );
    }
  }

  /**
   * Validate image input
   * Requirements: 5.2
   */
  private async validateImage(input: ImageUploadInput): Promise<void> {
    const config = this.contextConfigs[input.context];
    const errors: string[] = [];

    // Check file size
    if (input.size > config.maxSize) {
      errors.push(`File size ${this.formatFileSize(input.size)} exceeds maximum ${this.formatFileSize(config.maxSize)}`);
    }

    // Check file type
    if (!config.allowedTypes.includes(input.mimeType)) {
      errors.push(`File type ${input.mimeType} not allowed. Supported: ${config.allowedTypes.join(', ')}`);
    }

    // Check image dimensions using sharp
    try {
      const metadata = await sharp(input.buffer).metadata();
      
      if (config.minWidth && metadata.width && metadata.width < config.minWidth) {
        errors.push(`Image width ${metadata.width}px is below minimum ${config.minWidth}px`);
      }
      
      if (config.minHeight && metadata.height && metadata.height < config.minHeight) {
        errors.push(`Image height ${metadata.height}px is below minimum ${config.minHeight}px`);
      }
      
      if (config.maxWidth && metadata.width && metadata.width > config.maxWidth) {
        errors.push(`Image width ${metadata.width}px exceeds maximum ${config.maxWidth}px`);
      }
      
      if (config.maxHeight && metadata.height && metadata.height > config.maxHeight) {
        errors.push(`Image height ${metadata.height}px exceeds maximum ${config.maxHeight}px`);
      }

    } catch (error) {
      errors.push('Invalid image file or corrupted data');
    }

    if (errors.length > 0) {
      throw new SellerError(
        SellerErrorType.VALIDATION_ERROR,
        `Image validation failed: ${errors.join(', ')}`,
        'IMAGE_VALIDATION_ERROR',
        { errors, context: input.context }
      );
    }
  }

  /**
   * Process image with optimization and thumbnail generation
   * Requirements: 5.5, 5.6
   */
  private async processImage(input: ImageUploadInput) {
    const { context, buffer } = input;
    
    // Get optimal dimensions for context
    const dimensions = this.getOptimalDimensions(context);
    
    // Process main image
    const mainImage = await sharp(buffer)
      .resize(dimensions.main.width, dimensions.main.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer({ resolveWithObject: true });

    // Generate thumbnails
    const thumbnails = await Promise.all([
      // Small thumbnail
      sharp(buffer)
        .resize(dimensions.thumbnails.small.width, dimensions.thumbnails.small.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer({ resolveWithObject: true }),
      
      // Medium thumbnail
      sharp(buffer)
        .resize(dimensions.thumbnails.medium.width, dimensions.thumbnails.medium.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85 })
        .toBuffer({ resolveWithObject: true }),
      
      // Large thumbnail
      sharp(buffer)
        .resize(dimensions.thumbnails.large.width, dimensions.thumbnails.large.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 90 })
        .toBuffer({ resolveWithObject: true }),
    ]);

    return {
      main: mainImage,
      thumbnails: {
        small: thumbnails[0],
        medium: thumbnails[1],
        large: thumbnails[2],
      },
    };
  }

  /**
   * Upload processed images to storage
   * Requirements: 5.3, 5.4
   */
  private async uploadToStorage(processedImages: any, input: ImageUploadInput) {
    const imageId = crypto.randomUUID();
    const timestamp = Date.now();
    
    // Upload main image
    const mainUpload = await imageStorageService.uploadImage(
      processedImages.main.data,
      `${input.context}/${imageId}/main-${timestamp}.jpg`,
      {
        userId: input.userId,
        usageType: input.context,
        generateThumbnails: false, // We're generating our own
      }
    );

    // Upload thumbnails
    const thumbnailUploads = await Promise.all([
      imageStorageService.uploadImage(
        processedImages.thumbnails.small.data,
        `${input.context}/${imageId}/thumb-small-${timestamp}.jpg`,
        {
          userId: input.userId,
          usageType: input.context,
          generateThumbnails: false,
        }
      ),
      imageStorageService.uploadImage(
        processedImages.thumbnails.medium.data,
        `${input.context}/${imageId}/thumb-medium-${timestamp}.jpg`,
        {
          userId: input.userId,
          usageType: input.context,
          generateThumbnails: false,
        }
      ),
      imageStorageService.uploadImage(
        processedImages.thumbnails.large.data,
        `${input.context}/${imageId}/thumb-large-${timestamp}.jpg`,
        {
          userId: input.userId,
          usageType: input.context,
          generateThumbnails: false,
        }
      ),
    ]);

    return {
      id: imageId,
      main: mainUpload,
      thumbnails: {
        small: thumbnailUploads[0],
        medium: thumbnailUploads[1],
        large: thumbnailUploads[2],
      },
    };
  }

  /**
   * Generate CDN URLs for images
   * Requirements: 5.4
   */
  private async generateCDNUrls(storageResults: any, context: string) {
    const cdnBaseUrl = process.env.CDN_BASE_URL || process.env.NEXT_PUBLIC_CDN_URL || '';
    
    if (!cdnBaseUrl) {
      // Fallback to direct URLs if no CDN configured
      return {
        main: storageResults.main.url,
        thumbnails: {
          small: storageResults.thumbnails.small.url,
          medium: storageResults.thumbnails.medium.url,
          large: storageResults.thumbnails.large.url,
        },
      };
    }

    // Generate optimized CDN URLs
    return {
      main: `${cdnBaseUrl}/images/${storageResults.id}/main?context=${context}&q=85`,
      thumbnails: {
        small: `${cdnBaseUrl}/images/${storageResults.id}/thumb-small?context=${context}&q=80`,
        medium: `${cdnBaseUrl}/images/${storageResults.id}/thumb-medium?context=${context}&q=85`,
        large: `${cdnBaseUrl}/images/${storageResults.id}/thumb-large?context=${context}&q=90`,
      },
    };
  }

  /**
   * Save image record to database
   */
  private async saveImageRecord(input: ImageUploadInput, storageResults: any, cdnUrls: any) {
    // This would typically save to a database
    // For now, return a mock record
    return {
      id: storageResults.id,
      userId: input.userId,
      context: input.context,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size,
      urls: cdnUrls,
      ipfsHash: storageResults.main.ipfsHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get optimal dimensions based on context
   * Requirements: 5.5
   */
  private getOptimalDimensions(context: string) {
    const dimensions = {
      profile: {
        main: { width: 400, height: 400 },
        thumbnails: {
          small: { width: 100, height: 100 },
          medium: { width: 200, height: 200 },
          large: { width: 300, height: 300 },
        },
      },
      cover: {
        main: { width: 1200, height: 400 },
        thumbnails: {
          small: { width: 300, height: 100 },
          medium: { width: 600, height: 200 },
          large: { width: 900, height: 300 },
        },
      },
      listing: {
        main: { width: 800, height: 800 },
        thumbnails: {
          small: { width: 150, height: 150 },
          medium: { width: 300, height: 300 },
          large: { width: 500, height: 500 },
        },
      },
    };

    return dimensions[context] || dimensions.listing;
  }

  /**
   * Delete image from storage
   * Requirements: 5.4
   */
  async deleteImage(imageId: string, userId: string, context?: string): Promise<boolean> {
    try {
      // In a real implementation, you would:
      // 1. Verify user owns the image
      // 2. Delete from IPFS
      // 3. Delete from CDN
      // 4. Remove database record
      
      // For now, return success
      return true;
    } catch (error) {
      throw new SellerError(
        SellerErrorType.API_ERROR,
        `Failed to delete image: ${error.message}`,
        'IMAGE_DELETE_ERROR',
        { imageId, userId, context }
      );
    }
  }

  /**
   * Get image information
   * Requirements: 5.4
   */
  async getImageInfo(imageId: string): Promise<ProcessedImageResult | null> {
    try {
      // In a real implementation, fetch from database
      // For now, return null (not found)
      return null;
    } catch (error) {
      throw new SellerError(
        SellerErrorType.API_ERROR,
        `Failed to get image info: ${error.message}`,
        'IMAGE_INFO_ERROR',
        { imageId }
      );
    }
  }

  /**
   * Get all images for a seller
   */
  async getSellerImages(
    walletAddress: string,
    context?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ProcessedImageResult[]> {
    try {
      // In a real implementation, fetch from database with pagination
      // For now, return empty array
      return [];
    } catch (error) {
      throw new SellerError(
        SellerErrorType.API_ERROR,
        `Failed to get seller images: ${error.message}`,
        'GET_SELLER_IMAGES_ERROR',
        { walletAddress, context, limit, offset }
      );
    }
  }

  /**
   * Update image metadata
   */
  async updateImageMetadata(
    imageId: string,
    userId: string,
    metadata: Record<string, any>
  ): Promise<ProcessedImageResult | null> {
    try {
      // In a real implementation, update database record
      // For now, return null
      return null;
    } catch (error) {
      throw new SellerError(
        SellerErrorType.API_ERROR,
        `Failed to update image metadata: ${error.message}`,
        'UPDATE_METADATA_ERROR',
        { imageId, userId, metadata }
      );
    }
  }

  /**
   * Format file size for human readability
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const sellerImageService = new SellerImageService();
