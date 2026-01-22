/**
 * S3 Storage Service
 * Handles file uploads to AWS S3, signed URL generation, and CloudFront CDN integration
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { safeLogger } from '../utils/safeLogger';
import crypto from 'crypto';

export interface S3UploadResult {
    s3Key: string;
    s3Url: string;
    cdnUrl?: string;
    bucket: string;
    region: string;
}

export interface S3UploadOptions {
    filename: string;
    mimeType: string;
    metadata?: Record<string, string>;
    folder?: string;
}

export class S3StorageService {
    private s3Client: S3Client;
    private bucket: string;
    private region: string;
    private cdnDomain?: string;
    private isConfigured: boolean = false;

    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.bucket = process.env.AWS_S3_BUCKET || '';
        this.cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

        // Check if AWS credentials are configured
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !this.bucket) {
            safeLogger.warn('[S3Storage] AWS credentials not configured. S3 storage will be disabled.');
            this.isConfigured = false;
            return;
        }

        try {
            this.s3Client = new S3Client({
                region: this.region,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
            });
            this.isConfigured = true;
            safeLogger.info(`[S3Storage] Initialized successfully (bucket: ${this.bucket}, region: ${this.region})`);
        } catch (error) {
            safeLogger.error('[S3Storage] Failed to initialize S3 client:', error);
            this.isConfigured = false;
        }
    }

    /**
     * Check if S3 is configured and available
     */
    isAvailable(): boolean {
        return this.isConfigured;
    }

    /**
     * Upload file to S3
     */
    async uploadFile(
        buffer: Buffer,
        options: S3UploadOptions
    ): Promise<S3UploadResult> {
        if (!this.isConfigured) {
            throw new Error('S3 storage is not configured');
        }

        try {
            // Generate unique S3 key
            const s3Key = this.generateS3Key(options.filename, options.folder);

            // Prepare upload command
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: s3Key,
                Body: buffer,
                ContentType: options.mimeType,
                Metadata: options.metadata || {},
                ServerSideEncryption: 'AES256', // Enable encryption at rest
                CacheControl: 'public, max-age=31536000', // Cache for 1 year
            });

            // Upload to S3
            await this.s3Client.send(command);

            // Build URLs
            const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;
            const cdnUrl = this.cdnDomain
                ? `https://${this.cdnDomain}/${s3Key}`
                : undefined;

            safeLogger.info(`[S3Storage] File uploaded successfully: ${s3Key}`);

            return {
                s3Key,
                s3Url,
                cdnUrl,
                bucket: this.bucket,
                region: this.region
            };
        } catch (error) {
            safeLogger.error('[S3Storage] Upload failed:', error);
            throw new Error(`S3 upload failed: ${error.message}`);
        }
    }

    /**
     * Generate signed URL for secure file access
     */
    async generateSignedUrl(
        s3Key: string,
        expiresIn: number = 3600 // Default 1 hour
    ): Promise<string> {
        if (!this.isConfigured) {
            throw new Error('S3 storage is not configured');
        }

        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: s3Key
            });

            // Verify file exists
            await this.s3Client.send(command);

            // Generate signed URL
            const getCommand = new PutObjectCommand({
                Bucket: this.bucket,
                Key: s3Key
            });

            const signedUrl = await getSignedUrl(this.s3Client, getCommand, {
                expiresIn
            });

            safeLogger.info(`[S3Storage] Generated signed URL for: ${s3Key} (expires in ${expiresIn}s)`);

            return signedUrl;
        } catch (error) {
            safeLogger.error('[S3Storage] Failed to generate signed URL:', error);
            throw new Error(`Failed to generate signed URL: ${error.message}`);
        }
    }

    /**
     * Delete file from S3
     */
    async deleteFile(s3Key: string): Promise<void> {
        if (!this.isConfigured) {
            throw new Error('S3 storage is not configured');
        }

        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: s3Key
            });

            await this.s3Client.send(command);
            safeLogger.info(`[S3Storage] File deleted: ${s3Key}`);
        } catch (error) {
            safeLogger.error('[S3Storage] Delete failed:', error);
            throw new Error(`S3 delete failed: ${error.message}`);
        }
    }

    /**
     * Check if file exists in S3
     */
    async fileExists(s3Key: string): Promise<boolean> {
        if (!this.isConfigured) {
            return false;
        }

        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: s3Key
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get file metadata from S3
     */
    async getFileMetadata(s3Key: string): Promise<{
        contentType: string;
        contentLength: number;
        lastModified: Date;
        metadata: Record<string, string>;
    } | null> {
        if (!this.isConfigured) {
            return null;
        }

        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: s3Key
            });

            const response = await this.s3Client.send(command);

            return {
                contentType: response.ContentType || 'application/octet-stream',
                contentLength: response.ContentLength || 0,
                lastModified: response.LastModified || new Date(),
                metadata: response.Metadata || {}
            };
        } catch (error) {
            safeLogger.error('[S3Storage] Failed to get file metadata:', error);
            return null;
        }
    }

    /**
     * Generate unique S3 key for file
     */
    private generateS3Key(filename: string, folder?: string): string {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        const sanitizedFilename = this.sanitizeFilename(filename);

        const key = folder
            ? `${folder}/${timestamp}_${random}_${sanitizedFilename}`
            : `attachments/${timestamp}_${random}_${sanitizedFilename}`;

        return key;
    }

    /**
     * Sanitize filename for S3
     */
    private sanitizeFilename(filename: string): string {
        // Remove special characters, keep only alphanumeric, dots, dashes, underscores
        return filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 200); // Limit length
    }

    /**
     * Get public URL for file (without signing)
     */
    getPublicUrl(s3Key: string): string {
        if (this.cdnDomain) {
            return `https://${this.cdnDomain}/${s3Key}`;
        }
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;
    }

    /**
     * Get service status
     */
    getStatus(): {
        configured: boolean;
        bucket: string;
        region: string;
        cdnEnabled: boolean;
    } {
        return {
            configured: this.isConfigured,
            bucket: this.bucket,
            region: this.region,
            cdnEnabled: !!this.cdnDomain
        };
    }
}

// Export singleton instance
export const s3StorageService = new S3StorageService();
export default s3StorageService;
