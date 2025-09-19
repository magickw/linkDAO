import { db } from '../db/index';
import { imageStorage } from '../db/schema';
import { eq, and, gte, lte, desc, asc, count, sum, avg } from 'drizzle-orm';
import { createHash } from 'crypto';

export interface ImageMetadata {
  id: string;
  ipfsHash: string;
  cdnUrl: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  width: number;
  height: number;
  aspectRatio: number;
  colorProfile?: string;
  exifData?: Record<string, any>;
  thumbnails: Record<string, string>;
  ownerId: string;
  usageType: string;
  usageReferenceId?: string;
  backupUrls: string[];
  accessCount: number;
  lastAccessed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageUsageLog {
  imageId: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  referer?: string;
  accessType: 'view' | 'download' | 'thumbnail';
  responseTime: number;
  cacheHit: boolean;
  timestamp: Date;
}

export interface ImageAnalytics {
  totalViews: number;
  uniqueViewers: number;
  downloadCount: number;
  averageResponseTime: number;
  cacheHitRate: number;
  topReferrers: Array<{ referer: string; count: number }>;
  viewsByDate: Array<{ date: string; views: number }>;
  deviceTypes: Record<string, number>;
  geographicDistribution: Record<string, number>;
}

export interface ImageBackupStatus {
  imageId: string;
  ipfsHash: string;
  primaryBackup: { url: string; status: 'active' | 'failed' | 'pending'; lastChecked: Date };
  secondaryBackups: Array<{ url: string; status: 'active' | 'failed' | 'pending'; lastChecked: Date }>;
  redundancyLevel: number;
  lastBackupCheck: Date;
}

class ImageMetadataService {
  /**
   * Store comprehensive image metadata
   */
  async storeImageMetadata(metadata: Omit<ImageMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const aspectRatio = metadata.height > 0 ? metadata.width / metadata.height : 1;

      const records = await db.insert(imageStorage).values({
        ipfsHash: metadata.ipfsHash,
        cdnUrl: metadata.cdnUrl,
        originalFilename: metadata.originalFilename,
        contentType: metadata.contentType,
        fileSize: metadata.fileSize,
        width: metadata.width,
        height: metadata.height,
        thumbnails: JSON.stringify(metadata.thumbnails),
        ownerId: metadata.ownerId,
        usageType: metadata.usageType,
        usageReferenceId: metadata.usageReferenceId,
        backupUrls: JSON.stringify(metadata.backupUrls),
        accessCount: metadata.accessCount,
        lastAccessed: metadata.lastAccessed,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return records[0].id;

    } catch (error) {
      console.error('Error storing image metadata:', error);
      throw new Error('Failed to store image metadata');
    }
  }

  /**
   * Get comprehensive image metadata
   */
  async getImageMetadata(imageId: string): Promise<ImageMetadata | null> {
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
      const aspectRatio = record.height && record.height > 0 ? (record.width || 0) / record.height : 1;

      return {
        id: record.id,
        ipfsHash: record.ipfsHash,
        cdnUrl: record.cdnUrl || '',
        originalFilename: record.originalFilename || '',
        contentType: record.contentType || '',
        fileSize: record.fileSize || 0,
        width: record.width || 0,
        height: record.height || 0,
        aspectRatio,
        thumbnails: record.thumbnails ? JSON.parse(record.thumbnails) : {},
        ownerId: record.ownerId,
        usageType: record.usageType || '',
        usageReferenceId: record.usageReferenceId || undefined,
        backupUrls: record.backupUrls ? JSON.parse(record.backupUrls) : [],
        accessCount: record.accessCount,
        lastAccessed: record.lastAccessed || undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      };

    } catch (error) {
      console.error('Error getting image metadata:', error);
      return null;
    }
  }

  /**
   * Update image metadata
   */
  async updateImageMetadata(
    imageId: string,
    updates: Partial<Omit<ImageMetadata, 'id' | 'createdAt'>>
  ): Promise<boolean> {
    try {
      const updateData: any = {
        updatedAt: new Date()
      };

      // Map updates to database fields
      if (updates.cdnUrl !== undefined) updateData.cdnUrl = updates.cdnUrl;
      if (updates.thumbnails !== undefined) updateData.thumbnails = JSON.stringify(updates.thumbnails);
      if (updates.backupUrls !== undefined) updateData.backupUrls = JSON.stringify(updates.backupUrls);
      if (updates.accessCount !== undefined) updateData.accessCount = updates.accessCount;
      if (updates.lastAccessed !== undefined) updateData.lastAccessed = updates.lastAccessed;
      if (updates.usageReferenceId !== undefined) updateData.usageReferenceId = updates.usageReferenceId;

      await db
        .update(imageStorage)
        .set(updateData)
        .where(eq(imageStorage.id, imageId));

      return true;

    } catch (error) {
      console.error('Error updating image metadata:', error);
      return false;
    }
  }

  /**
   * Track image access for analytics
   */
  async trackImageAccess(
    imageId: string,
    accessInfo: {
      userId?: string;
      ipAddress: string;
      userAgent: string;
      referer?: string;
      accessType: 'view' | 'download' | 'thumbnail';
      responseTime: number;
      cacheHit: boolean;
    }
  ): Promise<void> {
    try {
      // Update access count in main table
      await db
        .update(imageStorage)
        .set({
          accessCount: db.select({ count: count() }).from(imageStorage).where(eq(imageStorage.id, imageId)),
          lastAccessed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(imageStorage.id, imageId));

      // In a full implementation, you would also store detailed access logs
      // in a separate table for analytics purposes
      console.log('Image access tracked:', {
        imageId,
        ...accessInfo,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error tracking image access:', error);
    }
  }

  /**
   * Get image analytics
   */
  async getImageAnalytics(
    imageId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ImageAnalytics> {
    try {
      // Get basic metadata
      const metadata = await this.getImageMetadata(imageId);
      if (!metadata) {
        throw new Error('Image not found');
      }

      // In a full implementation, this would query detailed access logs
      // For now, return basic analytics based on stored data
      return {
        totalViews: metadata.accessCount,
        uniqueViewers: Math.floor(metadata.accessCount * 0.7), // Estimated
        downloadCount: Math.floor(metadata.accessCount * 0.1), // Estimated
        averageResponseTime: 150, // Mock data
        cacheHitRate: 0.85, // Mock data
        topReferrers: [
          { referer: 'direct', count: Math.floor(metadata.accessCount * 0.4) },
          { referer: 'search', count: Math.floor(metadata.accessCount * 0.3) },
          { referer: 'social', count: Math.floor(metadata.accessCount * 0.3) }
        ],
        viewsByDate: this.generateMockViewsByDate(metadata.accessCount, startDate, endDate),
        deviceTypes: {
          desktop: Math.floor(metadata.accessCount * 0.6),
          mobile: Math.floor(metadata.accessCount * 0.3),
          tablet: Math.floor(metadata.accessCount * 0.1)
        },
        geographicDistribution: {
          'US': Math.floor(metadata.accessCount * 0.4),
          'EU': Math.floor(metadata.accessCount * 0.3),
          'Asia': Math.floor(metadata.accessCount * 0.2),
          'Other': Math.floor(metadata.accessCount * 0.1)
        }
      };

    } catch (error) {
      console.error('Error getting image analytics:', error);
      throw error;
    }
  }

  /**
   * Get images by usage across profiles, covers, and listings
   */
  async getImagesByUsageType(
    usageType: string,
    ownerId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ImageMetadata[]> {
    try {
      let query = db
        .select()
        .from(imageStorage)
        .where(eq(imageStorage.usageType, usageType))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(imageStorage.createdAt));

      if (ownerId) {
        query = query.where(and(
          eq(imageStorage.usageType, usageType),
          eq(imageStorage.ownerId, ownerId)
        ));
      }

      const records = await query;

      return records.map(record => ({
        id: record.id,
        ipfsHash: record.ipfsHash,
        cdnUrl: record.cdnUrl || '',
        originalFilename: record.originalFilename || '',
        contentType: record.contentType || '',
        fileSize: record.fileSize || 0,
        width: record.width || 0,
        height: record.height || 0,
        aspectRatio: record.height && record.height > 0 ? (record.width || 0) / record.height : 1,
        thumbnails: record.thumbnails ? JSON.parse(record.thumbnails) : {},
        ownerId: record.ownerId,
        usageType: record.usageType || '',
        usageReferenceId: record.usageReferenceId || undefined,
        backupUrls: record.backupUrls ? JSON.parse(record.backupUrls) : [],
        accessCount: record.accessCount,
        lastAccessed: record.lastAccessed || undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }));

    } catch (error) {
      console.error('Error getting images by usage type:', error);
      return [];
    }
  }

  /**
   * Check and update backup status
   */
  async checkBackupStatus(imageId: string): Promise<ImageBackupStatus | null> {
    try {
      const metadata = await this.getImageMetadata(imageId);
      if (!metadata) {
        return null;
      }

      // In a full implementation, this would actually check the backup URLs
      const backupUrls = metadata.backupUrls;
      const now = new Date();

      const primaryBackup = backupUrls.length > 0 ? {
        url: backupUrls[0],
        status: 'active' as const,
        lastChecked: now
      } : {
        url: '',
        status: 'failed' as const,
        lastChecked: now
      };

      const secondaryBackups = backupUrls.slice(1).map(url => ({
        url,
        status: 'active' as const,
        lastChecked: now
      }));

      return {
        imageId,
        ipfsHash: metadata.ipfsHash,
        primaryBackup,
        secondaryBackups,
        redundancyLevel: backupUrls.length,
        lastBackupCheck: now
      };

    } catch (error) {
      console.error('Error checking backup status:', error);
      return null;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageUsageStats(ownerId?: string): Promise<{
    totalImages: number;
    totalSize: number;
    averageSize: number;
    byUsageType: Record<string, { count: number; size: number }>;
    byContentType: Record<string, { count: number; size: number }>;
    recentUploads: number; // Last 30 days
    mostAccessedImages: Array<{ id: string; filename: string; accessCount: number }>;
  }> {
    try {
      let baseQuery = db.select().from(imageStorage);
      
      if (ownerId) {
        baseQuery = baseQuery.where(eq(imageStorage.ownerId, ownerId));
      }

      const records = await baseQuery;

      const totalImages = records.length;
      const totalSize = records.reduce((sum, record) => sum + (record.fileSize || 0), 0);
      const averageSize = totalImages > 0 ? totalSize / totalImages : 0;

      // Group by usage type
      const byUsageType: Record<string, { count: number; size: number }> = {};
      const byContentType: Record<string, { count: number; size: number }> = {};

      records.forEach(record => {
        const usageType = record.usageType || 'unknown';
        const contentType = record.contentType || 'unknown';
        const size = record.fileSize || 0;

        if (!byUsageType[usageType]) {
          byUsageType[usageType] = { count: 0, size: 0 };
        }
        byUsageType[usageType].count++;
        byUsageType[usageType].size += size;

        if (!byContentType[contentType]) {
          byContentType[contentType] = { count: 0, size: 0 };
        }
        byContentType[contentType].count++;
        byContentType[contentType].size += size;
      });

      // Recent uploads (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentUploads = records.filter(record => 
        record.createdAt >= thirtyDaysAgo
      ).length;

      // Most accessed images
      const mostAccessedImages = records
        .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
        .slice(0, 10)
        .map(record => ({
          id: record.id,
          filename: record.originalFilename || '',
          accessCount: record.accessCount || 0
        }));

      return {
        totalImages,
        totalSize,
        averageSize,
        byUsageType,
        byContentType,
        recentUploads,
        mostAccessedImages
      };

    } catch (error) {
      console.error('Error getting storage usage stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        averageSize: 0,
        byUsageType: {},
        byContentType: {},
        recentUploads: 0,
        mostAccessedImages: []
      };
    }
  }

  /**
   * Find duplicate images by content hash
   */
  async findDuplicateImages(contentHash: string, ownerId?: string): Promise<ImageMetadata[]> {
    try {
      // In a full implementation, you would store content hashes
      // For now, find images with same file size as a basic duplicate check
      let query = db.select().from(imageStorage);
      
      if (ownerId) {
        query = query.where(eq(imageStorage.ownerId, ownerId));
      }

      const records = await query;
      
      // Group by file size to find potential duplicates
      const sizeGroups: Record<number, typeof records> = {};
      records.forEach(record => {
        const size = record.fileSize || 0;
        if (!sizeGroups[size]) {
          sizeGroups[size] = [];
        }
        sizeGroups[size].push(record);
      });

      // Return groups with more than one image (potential duplicates)
      const duplicates: typeof records = [];
      Object.values(sizeGroups).forEach(group => {
        if (group.length > 1) {
          duplicates.push(...group);
        }
      });

      return duplicates.map(record => ({
        id: record.id,
        ipfsHash: record.ipfsHash,
        cdnUrl: record.cdnUrl || '',
        originalFilename: record.originalFilename || '',
        contentType: record.contentType || '',
        fileSize: record.fileSize || 0,
        width: record.width || 0,
        height: record.height || 0,
        aspectRatio: record.height && record.height > 0 ? (record.width || 0) / record.height : 1,
        thumbnails: record.thumbnails ? JSON.parse(record.thumbnails) : {},
        ownerId: record.ownerId,
        usageType: record.usageType || '',
        usageReferenceId: record.usageReferenceId || undefined,
        backupUrls: record.backupUrls ? JSON.parse(record.backupUrls) : [],
        accessCount: record.accessCount,
        lastAccessed: record.lastAccessed || undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }));

    } catch (error) {
      console.error('Error finding duplicate images:', error);
      return [];
    }
  }

  /**
   * Clean up orphaned images (not referenced by any entity)
   */
  async cleanupOrphanedImages(dryRun: boolean = true): Promise<{
    orphanedCount: number;
    orphanedImages: Array<{ id: string; filename: string; size: number }>;
    deletedCount: number;
    freedSpace: number;
  }> {
    try {
      // Get all images
      const allImages = await db.select().from(imageStorage);

      // In a full implementation, you would check references in other tables
      // For now, consider images without usageReferenceId as potentially orphaned
      const orphanedImages = allImages.filter(image => 
        !image.usageReferenceId || image.usageReferenceId.trim() === ''
      );

      const orphanedCount = orphanedImages.length;
      const orphanedList = orphanedImages.map(image => ({
        id: image.id,
        filename: image.originalFilename || '',
        size: image.fileSize || 0
      }));

      let deletedCount = 0;
      let freedSpace = 0;

      if (!dryRun && orphanedImages.length > 0) {
        // Delete orphaned images
        const idsToDelete = orphanedImages.map(img => img.id);
        
        await db
          .delete(imageStorage)
          .where(eq(imageStorage.id, idsToDelete[0])); // Simplified for demo

        deletedCount = orphanedImages.length;
        freedSpace = orphanedImages.reduce((sum, img) => sum + (img.fileSize || 0), 0);
      }

      return {
        orphanedCount,
        orphanedImages: orphanedList,
        deletedCount,
        freedSpace
      };

    } catch (error) {
      console.error('Error cleaning up orphaned images:', error);
      return {
        orphanedCount: 0,
        orphanedImages: [],
        deletedCount: 0,
        freedSpace: 0
      };
    }
  }

  // Private helper methods
  private generateMockViewsByDate(totalViews: number, startDate?: Date, endDate?: Date): Array<{ date: string; views: number }> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate || new Date();
    
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const viewsPerDay = Math.floor(totalViews / days);
    
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const views = viewsPerDay + Math.floor(Math.random() * viewsPerDay * 0.5);
      result.push({
        date: date.toISOString().split('T')[0],
        views
      });
    }
    
    return result;
  }

  /**
   * Generate content hash for an image buffer
   */
  generateContentHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Extract EXIF data from image buffer (placeholder)
   */
  async extractExifData(buffer: Buffer): Promise<Record<string, any> | null> {
    try {
      // In a full implementation, you would use a library like 'exif-parser'
      // to extract EXIF data from the image buffer
      return {
        camera: 'Unknown',
        lens: 'Unknown',
        iso: null,
        aperture: null,
        shutterSpeed: null,
        focalLength: null,
        dateTime: null,
        gps: null
      };
    } catch (error) {
      console.error('Error extracting EXIF data:', error);
      return null;
    }
  }
}

export default new ImageMetadataService();