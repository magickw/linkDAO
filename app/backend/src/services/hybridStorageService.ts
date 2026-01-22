/**
 * Hybrid Storage Service
 * Orchestrates file uploads to both S3 (primary) and IPFS (backup)
 * Provides fallback logic and retrieval with priority
 */

import { s3StorageService, S3UploadResult } from './s3StorageService';
import { thumbnailGenerationService, ThumbnailResult } from './thumbnailGenerationService';
import { ipfsService } from './ipfsService';
import { safeLogger } from '../utils/safeLogger';

export interface HybridUploadResult {
    // S3 storage
    s3Key?: string;
    s3Url?: string;
    cdnUrl?: string;

    // IPFS storage
    ipfsCid?: string;
    ipfsGatewayUrl?: string;

    // Thumbnails
    thumbnails?: {
        small?: { s3Key: string; url: string };
        medium?: { s3Key: string; url: string };
    };

    // Metadata
    primaryStorage: 'S3' | 'ipfs';
    backupStorage?: 's3' | 'IPFS';
    uploadedAt: Date;
}

export interface HybridUploadOptions {
    filename: string;
    mimeType: string;
    generateThumbnails?: boolean;
    uploadToIPFS?: boolean;
    folder?: string;
}

export class HybridStorageService {
    private readonly PRIMARY_STORAGE = process.env.PRIMARY_STORAGE || 's3';
    private readonly ENABLE_IPFS_BACKUP = process.env.ENABLE_IPFS_BACKUP !== 'false';
    private readonly ENABLE_THUMBNAILS = process.env.ENABLE_THUMBNAIL_GENERATION !== 'false';

    /**
     * Upload file to hybrid storage (S3 + IPFS)
     */
    async uploadFile(
        buffer: Buffer,
        options: HybridUploadOptions
    ): Promise<HybridUploadResult> {
        const result: HybridUploadResult = {
            primaryStorage: this.PRIMARY_STORAGE === 's3' ? 'S3' : 'ipfs',
            uploadedAt: new Date()
        };

        const startTime = Date.now();

        try {
            // Step 1: Upload to primary storage (S3)
            if (s3StorageService.isAvailable()) {
                try {
                    const s3Result = await s3StorageService.uploadFile(buffer, {
                        filename: options.filename,
                        mimeType: options.mimeType,
                        folder: options.folder,
                        metadata: {
                            originalFilename: options.filename,
                            uploadedAt: new Date().toISOString()
                        }
                    });

                    result.s3Key = s3Result.s3Key;
                    result.s3Url = s3Result.s3Url;
                    result.cdnUrl = s3Result.cdnUrl;
                    result.primaryStorage = 'S3';

                    safeLogger.info(`[HybridStorage] S3 upload successful: ${s3Result.s3Key}`);
                } catch (error) {
                    safeLogger.error('[HybridStorage] S3 upload failed:', error);
                    // Continue to IPFS as fallback
                }
            }

            // Step 2: Generate thumbnails (if image)
            if (
                this.ENABLE_THUMBNAILS &&
                options.generateThumbnails !== false &&
                thumbnailGenerationService.canGenerateThumbnail(options.mimeType)
            ) {
                try {
                    const thumbnails = await this.generateAndUploadThumbnails(
                        buffer,
                        options.filename,
                        options.folder
                    );
                    result.thumbnails = thumbnails;

                    safeLogger.info(`[HybridStorage] Generated ${Object.keys(thumbnails).length} thumbnails`);
                } catch (error) {
                    safeLogger.error('[HybridStorage] Thumbnail generation failed:', error);
                    // Non-critical, continue
                }
            }

            // Step 3: Upload to IPFS (backup or primary if S3 failed)
            if (this.ENABLE_IPFS_BACKUP || !result.s3Key) {
                try {
                    const ipfsResult = await ipfsService.uploadFile(buffer, {
                        metadata: {
                            name: options.filename,
                            mimeType: options.mimeType
                        }
                    });

                    result.ipfsCid = ipfsResult.ipfsHash;
                    result.ipfsGatewayUrl = ipfsResult.gatewayUrl;

                    if (!result.s3Key) {
                        result.primaryStorage = 'ipfs';
                    } else {
                        result.backupStorage = 'IPFS';
                    }

                    safeLogger.info(`[HybridStorage] IPFS upload successful: ${ipfsResult.ipfsHash}`);
                } catch (error) {
                    safeLogger.error('[HybridStorage] IPFS upload failed:', error);

                    // If both S3 and IPFS failed, throw error
                    if (!result.s3Key) {
                        throw new Error('Both S3 and IPFS uploads failed');
                    }
                }
            }

            const uploadTime = Date.now() - startTime;
            safeLogger.info(`[HybridStorage] Hybrid upload completed in ${uploadTime}ms`);

            return result;
        } catch (error) {
            safeLogger.error('[HybridStorage] Upload failed:', error);
            throw error;
        }
    }

    /**
     * Generate thumbnails and upload to S3
     */
    private async generateAndUploadThumbnails(
        imageBuffer: Buffer,
        originalFilename: string,
        folder?: string
    ): Promise<{
        small?: { s3Key: string; url: string };
        medium?: { s3Key: string; url: string };
    }> {
        const thumbnails: any = {};

        try {
            // Generate thumbnails
            const generated = await thumbnailGenerationService.generateThumbnails(imageBuffer);

            // Upload each thumbnail to S3
            for (const thumbnail of generated) {
                const thumbnailFilename = `${thumbnail.size}_${originalFilename}.${thumbnail.format}`;

                const s3Result = await s3StorageService.uploadFile(thumbnail.buffer, {
                    filename: thumbnailFilename,
                    mimeType: `image/${thumbnail.format}`,
                    folder: folder ? `${folder}/thumbnails` : 'thumbnails'
                });

                thumbnails[thumbnail.size] = {
                    s3Key: s3Result.s3Key,
                    url: s3Result.cdnUrl || s3Result.s3Url
                };
            }

            return thumbnails;
        } catch (error) {
            safeLogger.error('[HybridStorage] Thumbnail upload failed:', error);
            throw error;
        }
    }

    /**
     * Get file URL with priority (S3 first, then IPFS)
     */
    async getFileUrl(
        s3Key?: string,
        ipfsCid?: string,
        generateSignedUrl: boolean = true
    ): Promise<string | null> {
        // Try S3 first
        if (s3Key && s3StorageService.isAvailable()) {
            try {
                if (generateSignedUrl) {
                    return await s3StorageService.generateSignedUrl(s3Key);
                } else {
                    return s3StorageService.getPublicUrl(s3Key);
                }
            } catch (error) {
                safeLogger.warn('[HybridStorage] Failed to get S3 URL, falling back to IPFS');
            }
        }

        // Fallback to IPFS
        if (ipfsCid) {
            return `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;
        }

        return null;
    }

    /**
     * Delete file from all storage locations
     */
    async deleteFile(s3Key?: string, ipfsCid?: string): Promise<void> {
        const errors: string[] = [];

        // Delete from S3
        if (s3Key && s3StorageService.isAvailable()) {
            try {
                await s3StorageService.deleteFile(s3Key);
                safeLogger.info(`[HybridStorage] Deleted from S3: ${s3Key}`);
            } catch (error) {
                errors.push(`S3 deletion failed: ${error.message}`);
            }
        }

        // Note: IPFS files are permanent and cannot be deleted
        // We can only unpin them if we're running our own node
        if (ipfsCid) {
            safeLogger.info(`[HybridStorage] IPFS file cannot be deleted (permanent): ${ipfsCid}`);
        }

        if (errors.length > 0) {
            safeLogger.warn(`[HybridStorage] Deletion completed with errors: ${errors.join(', ')}`);
        }
    }

    /**
     * Get service status
     */
    getStatus(): {
        primaryStorage: string;
        s3Available: boolean;
        ipfsAvailable: boolean;
        thumbnailsEnabled: boolean;
    } {
        return {
            primaryStorage: this.PRIMARY_STORAGE,
            s3Available: s3StorageService.isAvailable(),
            ipfsAvailable: true, // IPFS service is always available
            thumbnailsEnabled: this.ENABLE_THUMBNAILS
        };
    }
}

// Export singleton instance
export const hybridStorageService = new HybridStorageService();
export default hybridStorageService;
