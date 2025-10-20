/**
 * UnifiedImageService - Standardized image upload pipeline for all seller components
 * 
 * Features:
 * - Consistent image validation and processing
 * - Support for different image contexts (profile, cover, listing)
 * - CDN URL generation and optimization
 * - Proper error handling with recovery strategies
 * - Image optimization and thumbnail generation
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { SellerError, SellerErrorType } from '../types/sellerError';

export interface ImageUploadOptions {
  maxSize: number;
  allowedTypes: string[];
  quality: number;
  generateThumbnails: boolean;
  context: 'profile' | 'cover' | 'listing';
  userId?: string;
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  format: string;
  quality: number;
}

export interface StorageResult {
  id: string;
  url: string;
  ipfsHash?: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

export interface CDNUrls {
  main: string;
  thumbnails: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface ImageUploadResult {
  originalUrl: string;
  cdnUrl: string;
  thumbnails: CDNUrls['thumbnails'];
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class UnifiedImageService {
  private defaultOptions: Record<string, ImageUploadOptions> = {
    profile: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      quality: 0.85,
      generateThumbnails: true,
      context: 'profile',
    },
    cover: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      quality: 0.8,
      generateThumbnails: true,
      context: 'cover',
    },
    listing: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      quality: 0.8,
      generateThumbnails: true,
      context: 'listing',
    },
  };

  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  /**
   * Upload image with comprehensive processing pipeline
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
   */
  async uploadImage(
    file: File,
    context: 'profile' | 'cover' | 'listing',
    options?: Partial<ImageUploadOptions>
  ): Promise<ImageUploadResult> {
    const config = { ...this.defaultOptions[context], ...options };
    
    try {
      // Step 1: Validate file
      const validationResult = this.validateFile(file, config);
      if (!validationResult.isValid) {
        throw new SellerError(
          SellerErrorType.VALIDATION_ERROR,
          `Image validation failed: ${validationResult.errors.join(', ')}`,
          'IMAGE_VALIDATION_ERROR',
          { context, fileName: file.name, errors: validationResult.errors }
        );
      }

      // Step 2: Process image (resize, optimize, format conversion)
      const processedImage = await this.processImage(file, config);

      // Step 3: Upload to storage (IPFS + backend)
      const uploadResult = await this.uploadToStorage(processedImage, context, config);

      // Step 4: Generate CDN URLs and thumbnails
      const cdnUrls = await this.generateCDNUrls(uploadResult, config);

      return {
        originalUrl: uploadResult.url,
        cdnUrl: cdnUrls.main,
        thumbnails: cdnUrls.thumbnails,
        metadata: {
          width: processedImage.width,
          height: processedImage.height,
          size: processedImage.size,
          format: processedImage.format,
        },
      };
    } catch (error) {
      if (error instanceof SellerError) {
        throw error;
      }
      
      throw new SellerError(
        SellerErrorType.API_ERROR,
        `Image upload failed: ${error.message}`,
        'IMAGE_UPLOAD_ERROR',
        { context, fileName: file.name, originalError: error }
      );
    }
  }

  /**
   * Upload multiple images with batch processing
   * Requirements: 5.1, 5.3
   */
  async uploadMultipleImages(
    files: File[],
    context: 'profile' | 'cover' | 'listing',
    options?: Partial<ImageUploadOptions>
  ): Promise<ImageUploadResult[]> {
    const results: ImageUploadResult[] = [];
    const errors: Array<{ file: string; error: SellerError }> = [];

    // Process images in parallel with concurrency limit
    const concurrencyLimit = 3;
    const chunks = this.chunkArray(files, concurrencyLimit);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (file) => {
        try {
          return await this.uploadImage(file, context, options);
        } catch (error) {
          errors.push({ 
            file: file.name, 
            error: error instanceof SellerError ? error : new SellerError(
              SellerErrorType.API_ERROR,
              `Failed to upload ${file.name}: ${error.message}`,
              'BATCH_UPLOAD_ERROR'
            )
          });
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.filter(result => result !== null));
    }

    // If there were errors, include them in the response
    if (errors.length > 0) {
      const errorMessage = `${errors.length} of ${files.length} images failed to upload`;
      throw new SellerError(
        SellerErrorType.API_ERROR,
        errorMessage,
        'BATCH_UPLOAD_PARTIAL_FAILURE',
        { successCount: results.length, errors }
      );
    }

    return results;
  }

  /**
   * Validate image file against context-specific rules
   * Requirements: 5.2
   */
  private validateFile(file: File, options: ImageUploadOptions): ImageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (file.size > options.maxSize) {
      errors.push(`File size ${this.formatFileSize(file.size)} exceeds maximum ${this.formatFileSize(options.maxSize)}`);
    }

    // Check file type
    if (!options.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed. Supported types: ${options.allowedTypes.join(', ')}`);
    }

    // Check file name
    if (file.name.length > 255) {
      errors.push('File name too long (max 255 characters)');
    }

    // Context-specific validations
    switch (options.context) {
      case 'profile':
        if (file.size < 1024) { // Less than 1KB
          warnings.push('Profile image is very small and may not display well');
        }
        break;
      case 'cover':
        if (file.size < 10 * 1024) { // Less than 10KB
          warnings.push('Cover image is very small and may not display well');
        }
        break;
      case 'listing':
        if (file.size < 5 * 1024) { // Less than 5KB
          warnings.push('Listing image is very small and may affect product presentation');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Process image with optimization and format conversion
   * Requirements: 5.5
   */
  private async processImage(file: File, options: ImageUploadOptions): Promise<ProcessedImage> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate optimal dimensions based on context
          const { width, height } = this.calculateOptimalDimensions(
            img.width,
            img.height,
            options.context
          );

          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to blob with specified quality
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new Error('Failed to process image'));
                return;
              }

              try {
                const arrayBuffer = await blob.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                resolve({
                  buffer,
                  width,
                  height,
                  size: buffer.length,
                  format: this.getOptimalFormat(file.type),
                  quality: options.quality,
                });
              } catch (error) {
                reject(error);
              }
            },
            this.getOptimalFormat(file.type),
            options.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for processing'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload processed image to storage backend
   * Requirements: 5.3, 5.4
   */
  private async uploadToStorage(
    image: ProcessedImage,
    context: string,
    options: ImageUploadOptions
  ): Promise<StorageResult> {
    const formData = new FormData();
    const blob = new Blob([image.buffer], { type: `image/${image.format}` });
    
    formData.append('image', blob, `${context}-${Date.now()}.${image.format}`);
    formData.append('context', context);
    formData.append('userId', options.userId || 'anonymous');
    formData.append('metadata', JSON.stringify({
      width: image.width,
      height: image.height,
      size: image.size,
      format: image.format,
      quality: image.quality,
    }));

    const response = await fetch(`${this.apiBaseUrl}/api/marketplace/seller/images/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type header - let browser set it with boundary for FormData
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || `Upload failed with status ${response.status}`);
    }

    const result = await response.json();
    return {
      id: result.id,
      url: result.url,
      ipfsHash: result.ipfsHash,
      metadata: {
        width: image.width,
        height: image.height,
        size: image.size,
        format: image.format,
      },
    };
  }

  /**
   * Generate CDN URLs with different sizes and optimizations
   * Requirements: 5.4, 5.6
   */
  private async generateCDNUrls(uploadResult: StorageResult, options: ImageUploadOptions): Promise<CDNUrls> {
    const baseUrl = uploadResult.url;
    const cdnBaseUrl = process.env.NEXT_PUBLIC_CDN_URL || this.apiBaseUrl;

    // Generate main CDN URL
    const mainCdnUrl = `${cdnBaseUrl}/cdn/images/${uploadResult.id}`;

    // Generate thumbnail URLs if enabled
    const thumbnails = options.generateThumbnails ? {
      small: `${cdnBaseUrl}/cdn/images/${uploadResult.id}?w=150&h=150&fit=cover&q=80`,
      medium: `${cdnBaseUrl}/cdn/images/${uploadResult.id}?w=300&h=300&fit=cover&q=85`,
      large: `${cdnBaseUrl}/cdn/images/${uploadResult.id}?w=600&h=600&fit=cover&q=90`,
    } : {
      small: mainCdnUrl,
      medium: mainCdnUrl,
      large: mainCdnUrl,
    };

    return {
      main: mainCdnUrl,
      thumbnails,
    };
  }

  /**
   * Calculate optimal dimensions based on context
   * Requirements: 5.5
   */
  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    context: 'profile' | 'cover' | 'listing'
  ): { width: number; height: number } {
    const maxDimensions = {
      profile: { width: 400, height: 400 },
      cover: { width: 1200, height: 400 },
      listing: { width: 800, height: 800 },
    };

    const max = maxDimensions[context];
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    // Scale down if necessary while maintaining aspect ratio
    if (width > max.width) {
      width = max.width;
      height = width / aspectRatio;
    }

    if (height > max.height) {
      height = max.height;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  /**
   * Get optimal image format based on input type
   * Requirements: 5.5
   */
  private getOptimalFormat(inputType: string): string {
    // Convert to WebP for better compression, fallback to JPEG
    if (inputType === 'image/png' && this.supportsWebP()) {
      return 'webp';
    }
    if (inputType === 'image/gif') {
      return 'gif'; // Preserve GIF for animations
    }
    return 'jpeg'; // Default to JPEG for best compatibility
  }

  /**
   * Check if browser supports WebP format
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
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

  /**
   * Split array into chunks for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delete image from storage
   * Requirements: 5.4
   */
  async deleteImage(imageId: string, context: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/marketplace/seller/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      return true;
    } catch (error) {
      throw new SellerError(
        SellerErrorType.API_ERROR,
        `Failed to delete image: ${error.message}`,
        'IMAGE_DELETE_ERROR',
        { imageId, context }
      );
    }
  }

  /**
   * Get image metadata and URLs
   * Requirements: 5.4
   */
  async getImageInfo(imageId: string): Promise<ImageUploadResult | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/marketplace/seller/images/${imageId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get image info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new SellerError(
        SellerErrorType.API_ERROR,
        `Failed to get image info: ${error.message}`,
        'IMAGE_INFO_ERROR',
        { imageId }
      );
    }
  }
}

// Export singleton instance
export const unifiedImageService = new UnifiedImageService();
export default UnifiedImageService;