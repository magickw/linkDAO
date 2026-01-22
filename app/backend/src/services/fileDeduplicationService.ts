/**
 * File Deduplication Service
 * Prevents duplicate file uploads using SHA-256 hashing
 * Tracks file usage and reference counts
 */

import crypto from 'crypto';
import { db } from '../db';
import { fileAttachments } from '../db/schema';
import { eq } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export interface FileMetadata {
    id: string;
    fileHash: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    s3Key?: string;
    ipfsCid?: string;
    uploadedBy: string;
    uploadTimestamp: Date;
    referenceCount: number;
    virusScanStatus?: 'pending' | 'clean' | 'infected' | 'error';
    isQuarantined: boolean;
}

export interface DeduplicationResult {
    isDuplicate: boolean;
    existingFile?: FileMetadata;
    fileHash: string;
}

export class FileDeduplicationService {
    /**
     * Generate SHA-256 hash for file content
     */
    generateFileHash(fileBuffer: Buffer): string {
        return crypto
            .createHash('sha256')
            .update(fileBuffer)
            .digest('hex');
    }

    /**
     * Check if file already exists by hash
     */
    async checkDuplicate(fileBuffer: Buffer): Promise<DeduplicationResult> {
        const fileHash = this.generateFileHash(fileBuffer);

        try {
            const existing = await db.query.fileAttachments.findFirst({
                where: eq(fileAttachments.fileHash, fileHash)
            });

            if (existing) {
                safeLogger.info(`[Deduplication] Found duplicate file: ${fileHash}`);
                return {
                    isDuplicate: true,
                    existingFile: {
                        id: existing.id,
                        fileHash: existing.fileHash,
                        filename: existing.filename,
                        mimeType: existing.mimeType,
                        sizeBytes: existing.sizeBytes,
                        s3Key: existing.s3Key || undefined,
                        ipfsCid: existing.ipfsCid || undefined,
                        uploadedBy: existing.uploadedBy,
                        uploadTimestamp: existing.uploadTimestamp || new Date(),
                        referenceCount: existing.referenceCount || 1,
                        virusScanStatus: existing.virusScanStatus as any,
                        isQuarantined: existing.isQuarantined || false
                    },
                    fileHash
                };
            }

            return {
                isDuplicate: false,
                fileHash
            };
        } catch (error) {
            safeLogger.error('[Deduplication] Error checking duplicate:', error);
            // On error, treat as not duplicate to allow upload
            return {
                isDuplicate: false,
                fileHash
            };
        }
    }

    /**
     * Store new file metadata
     */
    async storeFileMetadata(metadata: {
        fileHash: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
        s3Key?: string;
        ipfsCid?: string;
        uploadedBy: string;
        virusScanStatus?: 'pending' | 'clean' | 'infected' | 'error';
        virusScanResult?: any;
    }): Promise<FileMetadata> {
        try {
            const [inserted] = await db.insert(fileAttachments).values({
                fileHash: metadata.fileHash,
                filename: metadata.filename,
                mimeType: metadata.mimeType,
                sizeBytes: metadata.sizeBytes,
                s3Key: metadata.s3Key,
                ipfsCid: metadata.ipfsCid,
                uploadedBy: metadata.uploadedBy,
                uploadTimestamp: new Date(),
                virusScanStatus: metadata.virusScanStatus || 'pending',
                virusScanResult: metadata.virusScanResult,
                referenceCount: 1,
                isQuarantined: false
            }).returning();

            safeLogger.info(`[Deduplication] Stored new file metadata: ${metadata.fileHash}`);

            return {
                id: inserted.id,
                fileHash: inserted.fileHash,
                filename: inserted.filename,
                mimeType: inserted.mimeType,
                sizeBytes: inserted.sizeBytes,
                s3Key: inserted.s3Key || undefined,
                ipfsCid: inserted.ipfsCid || undefined,
                uploadedBy: inserted.uploadedBy,
                uploadTimestamp: inserted.uploadTimestamp || new Date(),
                referenceCount: inserted.referenceCount || 1,
                virusScanStatus: inserted.virusScanStatus as any,
                isQuarantined: inserted.isQuarantined || false
            };
        } catch (error) {
            safeLogger.error('[Deduplication] Error storing file metadata:', error);
            throw error;
        }
    }

    /**
     * Increment reference count for existing file
     */
    async incrementReferenceCount(fileHash: string): Promise<void> {
        try {
            await db
                .update(fileAttachments)
                .set({
                    referenceCount: db.raw('reference_count + 1')
                })
                .where(eq(fileAttachments.fileHash, fileHash));

            safeLogger.info(`[Deduplication] Incremented reference count for: ${fileHash}`);
        } catch (error) {
            safeLogger.error('[Deduplication] Error incrementing reference count:', error);
            throw error;
        }
    }

    /**
     * Decrement reference count (when file is deleted)
     */
    async decrementReferenceCount(fileHash: string): Promise<number> {
        try {
            const [updated] = await db
                .update(fileAttachments)
                .set({
                    referenceCount: db.raw('GREATEST(reference_count - 1, 0)')
                })
                .where(eq(fileAttachments.fileHash, fileHash))
                .returning({ referenceCount: fileAttachments.referenceCount });

            const newCount = updated?.referenceCount || 0;
            safeLogger.info(`[Deduplication] Decremented reference count for: ${fileHash}, new count: ${newCount}`);

            return newCount;
        } catch (error) {
            safeLogger.error('[Deduplication] Error decrementing reference count:', error);
            throw error;
        }
    }

    /**
     * Update virus scan status
     */
    async updateVirusScanStatus(
        fileHash: string,
        status: 'pending' | 'clean' | 'infected' | 'error',
        scanResult?: any
    ): Promise<void> {
        try {
            await db
                .update(fileAttachments)
                .set({
                    virusScanStatus: status,
                    virusScanResult: scanResult,
                    isQuarantined: status === 'infected'
                })
                .where(eq(fileAttachments.fileHash, fileHash));

            safeLogger.info(`[Deduplication] Updated virus scan status for ${fileHash}: ${status}`);
        } catch (error) {
            safeLogger.error('[Deduplication] Error updating virus scan status:', error);
            throw error;
        }
    }

    /**
     * Get file metadata by hash
     */
    async getFileByHash(fileHash: string): Promise<FileMetadata | null> {
        try {
            const file = await db.query.fileAttachments.findFirst({
                where: eq(fileAttachments.fileHash, fileHash)
            });

            if (!file) return null;

            return {
                id: file.id,
                fileHash: file.fileHash,
                filename: file.filename,
                mimeType: file.mimeType,
                sizeBytes: file.sizeBytes,
                s3Key: file.s3Key || undefined,
                ipfsCid: file.ipfsCid || undefined,
                uploadedBy: file.uploadedBy,
                uploadTimestamp: file.uploadTimestamp || new Date(),
                referenceCount: file.referenceCount || 1,
                virusScanStatus: file.virusScanStatus as any,
                isQuarantined: file.isQuarantined || false
            };
        } catch (error) {
            safeLogger.error('[Deduplication] Error getting file by hash:', error);
            return null;
        }
    }

    /**
     * Get deduplication statistics
     */
    async getStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        savedSpace: number;
        duplicateCount: number;
    }> {
        try {
            const files = await db.query.fileAttachments.findMany();

            const totalFiles = files.length;
            const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);
            const duplicateCount = files.filter(f => (f.referenceCount || 1) > 1).length;
            const savedSpace = files.reduce((sum, f) => {
                const refs = f.referenceCount || 1;
                return sum + (refs > 1 ? f.sizeBytes * (refs - 1) : 0);
            }, 0);

            return {
                totalFiles,
                totalSize,
                savedSpace,
                duplicateCount
            };
        } catch (error) {
            safeLogger.error('[Deduplication] Error getting stats:', error);
            return {
                totalFiles: 0,
                totalSize: 0,
                savedSpace: 0,
                duplicateCount: 0
            };
        }
    }
}

// Export singleton instance
export const fileDeduplicationService = new FileDeduplicationService();
export default fileDeduplicationService;
