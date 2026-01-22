/**
 * Thumbnail Generation Service
 * Generates thumbnails for images using Sharp library
 * Supports multiple sizes and WebP conversion for smaller file sizes
 */

import sharp from 'sharp';
import { safeLogger } from '../utils/safeLogger';

export interface ThumbnailSize {
    name: 'small' | 'medium' | 'large';
    width: number;
    height: number;
}

export interface ThumbnailResult {
    size: 'small' | 'medium' | 'large';
    buffer: Buffer;
    width: number;
    height: number;
    format: 'webp' | 'jpeg';
    sizeBytes: number;
}

export interface ThumbnailGenerationOptions {
    sizes?: ThumbnailSize[];
    format?: 'webp' | 'jpeg';
    quality?: number;
}

export class ThumbnailGenerationService {
    private readonly DEFAULT_SIZES: ThumbnailSize[] = [
        { name: 'small', width: 150, height: 150 },
        { name: 'medium', width: 800, height: 600 }
    ];

    private readonly DEFAULT_FORMAT = 'webp';
    private readonly DEFAULT_QUALITY = 80;

    /**
     * Generate thumbnails for an image
     */
    async generateThumbnails(
        imageBuffer: Buffer,
        options: ThumbnailGenerationOptions = {}
    ): Promise<ThumbnailResult[]> {
        const sizes = options.sizes || this.DEFAULT_SIZES;
        const format = options.format || this.DEFAULT_FORMAT;
        const quality = options.quality || this.DEFAULT_QUALITY;

        try {
            // Verify it's a valid image
            const metadata = await sharp(imageBuffer).metadata();
            if (!metadata.width || !metadata.height) {
                throw new Error('Invalid image: no dimensions');
            }

            safeLogger.info(`[Thumbnails] Generating ${sizes.length} thumbnails for image (${metadata.width}x${metadata.height})`);

            // Generate all thumbnails in parallel
            const thumbnails = await Promise.all(
                sizes.map(size => this.generateSingleThumbnail(imageBuffer, size, format, quality))
            );

            const totalSize = thumbnails.reduce((sum, t) => sum + t.sizeBytes, 0);
            safeLogger.info(`[Thumbnails] Generated ${thumbnails.length} thumbnails (total: ${this.formatBytes(totalSize)})`);

            return thumbnails;
        } catch (error) {
            safeLogger.error('[Thumbnails] Generation failed:', error);
            throw new Error(`Thumbnail generation failed: ${error.message}`);
        }
    }

    /**
     * Generate a single thumbnail
     */
    private async generateSingleThumbnail(
        imageBuffer: Buffer,
        size: ThumbnailSize,
        format: 'webp' | 'jpeg',
        quality: number
    ): Promise<ThumbnailResult> {
        try {
            let pipeline = sharp(imageBuffer)
                .resize(size.width, size.height, {
                    fit: 'cover', // Crop to fill the dimensions
                    position: 'center'
                });

            // Apply format-specific processing
            if (format === 'webp') {
                pipeline = pipeline.webp({ quality });
            } else {
                pipeline = pipeline.jpeg({ quality });
            }

            const buffer = await pipeline.toBuffer();
            const metadata = await sharp(buffer).metadata();

            return {
                size: size.name,
                buffer,
                width: metadata.width || size.width,
                height: metadata.height || size.height,
                format,
                sizeBytes: buffer.length
            };
        } catch (error) {
            safeLogger.error(`[Thumbnails] Failed to generate ${size.name} thumbnail:`, error);
            throw error;
        }
    }

    /**
     * Check if file is an image that can be thumbnailed
     */
    canGenerateThumbnail(mimeType: string): boolean {
        const supportedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/tiff',
            'image/bmp'
        ];

        return supportedTypes.includes(mimeType.toLowerCase());
    }

    /**
     * Get optimal thumbnail sizes based on original image dimensions
     */
    getOptimalSizes(originalWidth: number, originalHeight: number): ThumbnailSize[] {
        const sizes: ThumbnailSize[] = [];

        // Always generate small thumbnail
        sizes.push({ name: 'small', width: 150, height: 150 });

        // Only generate medium if image is large enough
        if (originalWidth >= 800 || originalHeight >= 600) {
            sizes.push({ name: 'medium', width: 800, height: 600 });
        }

        return sizes;
    }

    /**
     * Compress image without resizing
     */
    async compressImage(
        imageBuffer: Buffer,
        quality: number = 80
    ): Promise<{ buffer: Buffer; originalSize: number; compressedSize: number; savings: number }> {
        try {
            const originalSize = imageBuffer.length;

            const compressedBuffer = await sharp(imageBuffer)
                .webp({ quality })
                .toBuffer();

            const compressedSize = compressedBuffer.length;
            const savings = ((originalSize - compressedSize) / originalSize) * 100;

            safeLogger.info(`[Thumbnails] Compressed image: ${this.formatBytes(originalSize)} → ${this.formatBytes(compressedSize)} (${savings.toFixed(1)}% savings)`);

            return {
                buffer: compressedBuffer,
                originalSize,
                compressedSize,
                savings
            };
        } catch (error) {
            safeLogger.error('[Thumbnails] Compression failed:', error);
            throw error;
        }
    }

    /**
     * Extract metadata from image
     */
    async getImageMetadata(imageBuffer: Buffer): Promise<{
        width: number;
        height: number;
        format: string;
        size: number;
        hasAlpha: boolean;
    }> {
        try {
            const metadata = await sharp(imageBuffer).metadata();

            return {
                width: metadata.width || 0,
                height: metadata.height || 0,
                format: metadata.format || 'unknown',
                size: imageBuffer.length,
                hasAlpha: metadata.hasAlpha || false
            };
        } catch (error) {
            safeLogger.error('[Thumbnails] Failed to extract metadata:', error);
            throw error;
        }
    }

    /**
     * Generate thumbnail from video (first frame)
     * Note: Requires ffmpeg to be installed
     */
    async generateVideoThumbnail(
        videoBuffer: Buffer
    ): Promise<ThumbnailResult | null> {
        // This would require ffmpeg integration
        // For now, return null - can be implemented later
        safeLogger.warn('[Thumbnails] Video thumbnail generation not yet implemented');
        return null;
    }

    /**
     * Format bytes to human-readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Get service status
     */
    getStatus(): {
        available: boolean;
        supportedFormats: string[];
        defaultSizes: ThumbnailSize[];
    } {
        return {
            available: true,
            supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            defaultSizes: this.DEFAULT_SIZES
        };
    }
}

// Export singleton instance
export const thumbnailGenerationService = new ThumbnailGenerationService();
export default thumbnailGenerationService;
