import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import imageMetadataService from '../services/imageMetadataService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class ImageMetadataController {
  /**
   * Get image metadata by ID
   */
  async getImageMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;

      if (!imageId) {
        res.status(400).json({
          success: false,
          error: 'Image ID is required'
        });
        return;
      }

      const metadata = await imageMetadataService.getImageMetadata(imageId);

      if (!metadata) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: metadata
      });

    } catch (error) {
      safeLogger.error('Get image metadata error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image metadata'
      });
    }
  }

  /**
   * Update image metadata
   */
  async updateImageMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const { userId } = req.user as { userId: string };
      const updates = req.body;

      if (!imageId) {
        res.status(400).json({
          success: false,
          error: 'Image ID is required'
        });
        return;
      }

      // Verify ownership
      const existingMetadata = await imageMetadataService.getImageMetadata(imageId);
      if (!existingMetadata) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
        return;
      }

      if (existingMetadata.ownerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to update this image'
        });
        return;
      }

      const success = await imageMetadataService.updateImageMetadata(imageId, updates);

      if (!success) {
        res.status(500).json({
          success: false,
          error: 'Failed to update image metadata'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Image metadata updated successfully'
      });

    } catch (error) {
      safeLogger.error('Update image metadata error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update image metadata'
      });
    }
  }

  /**
   * Track image access
   */
  async trackImageAccess(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const { accessType = 'view', responseTime = 0, cacheHit = false } = req.body;
      const { userId } = req.user as { userId?: string };

      if (!imageId) {
        res.status(400).json({
          success: false,
          error: 'Image ID is required'
        });
        return;
      }

      const accessInfo = {
        userId,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        referer: req.get('Referer'),
        accessType,
        responseTime: parseInt(responseTime) || 0,
        cacheHit: Boolean(cacheHit)
      };

      await imageMetadataService.trackImageAccess(imageId, accessInfo);

      res.status(200).json({
        success: true,
        message: 'Image access tracked successfully'
      });

    } catch (error) {
      safeLogger.error('Track image access error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track image access'
      });
    }
  }

  /**
   * Get image analytics
   */
  async getImageAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const { startDate, endDate } = req.query;
      const { userId } = req.user as { userId: string };

      if (!imageId) {
        res.status(400).json({
          success: false,
          error: 'Image ID is required'
        });
        return;
      }

      // Verify ownership
      const metadata = await imageMetadataService.getImageMetadata(imageId);
      if (!metadata) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
        return;
      }

      if (metadata.ownerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to view analytics for this image'
        });
        return;
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const analytics = await imageMetadataService.getImageAnalytics(imageId, start, end);

      res.status(200).json({
        success: true,
        data: analytics
      });

    } catch (error) {
      safeLogger.error('Get image analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image analytics'
      });
    }
  }

  /**
   * Get images by usage type
   */
  async getImagesByUsageType(req: Request, res: Response): Promise<void> {
    try {
      const { usageType } = req.params;
      const { limit = '50', offset = '0', ownerId } = req.query;
      const { userId } = req.user as { userId: string };

      if (!usageType) {
        res.status(400).json({
          success: false,
          error: 'Usage type is required'
        });
        return;
      }

      // Use requesting user's ID if no specific owner requested
      const targetOwnerId = ownerId as string || userId;

      const images = await imageMetadataService.getImagesByUsageType(
        usageType,
        targetOwnerId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.status(200).json({
        success: true,
        data: images
      });

    } catch (error) {
      safeLogger.error('Get images by usage type error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve images by usage type'
      });
    }
  }

  /**
   * Check backup status for image
   */
  async checkBackupStatus(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const { userId } = req.user as { userId: string };

      if (!imageId) {
        res.status(400).json({
          success: false,
          error: 'Image ID is required'
        });
        return;
      }

      // Verify ownership
      const metadata = await imageMetadataService.getImageMetadata(imageId);
      if (!metadata) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
        return;
      }

      if (metadata.ownerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to check backup status for this image'
        });
        return;
      }

      const backupStatus = await imageMetadataService.checkBackupStatus(imageId);

      res.status(200).json({
        success: true,
        data: backupStatus
      });

    } catch (error) {
      safeLogger.error('Check backup status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check backup status'
      });
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user as { userId: string };
      const { global } = req.query;

      // Only allow global stats for admin users
      const targetUserId = global === 'true' && req.user?.isAdmin ? undefined : userId;

      const stats = await imageMetadataService.getStorageUsageStats(targetUserId);

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      safeLogger.error('Get storage usage stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve storage usage statistics'
      });
    }
  }

  /**
   * Find duplicate images
   */
  async findDuplicateImages(req: Request, res: Response): Promise<void> {
    try {
      const { contentHash } = req.params;
      const { userId } = req.user as { userId: string };
      const { global } = req.query;

      if (!contentHash) {
        res.status(400).json({
          success: false,
          error: 'Content hash is required'
        });
        return;
      }

      // Only allow global search for admin users
      const targetUserId = global === 'true' && req.user?.isAdmin ? undefined : userId;

      const duplicates = await imageMetadataService.findDuplicateImages(contentHash, targetUserId);

      res.status(200).json({
        success: true,
        data: {
          duplicateCount: duplicates.length,
          duplicates
        }
      });

    } catch (error) {
      safeLogger.error('Find duplicate images error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to find duplicate images'
      });
    }
  }

  /**
   * Cleanup orphaned images
   */
  async cleanupOrphanedImages(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user as { userId: string };
      const { dryRun = 'true' } = req.query;

      // Only allow admin users to perform cleanup
      if (!req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Admin privileges required for cleanup operations'
        });
        return;
      }

      const isDryRun = dryRun === 'true';
      const result = await imageMetadataService.cleanupOrphanedImages(isDryRun);

      res.status(200).json({
        success: true,
        data: {
          ...result,
          dryRun: isDryRun
        }
      });

    } catch (error) {
      safeLogger.error('Cleanup orphaned images error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup orphaned images'
      });
    }
  }

  /**
   * Generate content hash for uploaded file
   */
  async generateContentHash(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file provided'
        });
        return;
      }

      const contentHash = imageMetadataService.generateContentHash(req.file.buffer);

      res.status(200).json({
        success: true,
        data: {
          contentHash,
          filename: req.file.originalname,
          size: req.file.size
        }
      });

    } catch (error) {
      safeLogger.error('Generate content hash error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate content hash'
      });
    }
  }

  /**
   * Extract EXIF data from uploaded image
   */
  async extractExifData(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
        return;
      }

      const exifData = await imageMetadataService.extractExifData(req.file.buffer);

      res.status(200).json({
        success: true,
        data: {
          exifData,
          filename: req.file.originalname
        }
      });

    } catch (error) {
      safeLogger.error('Extract EXIF data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extract EXIF data'
      });
    }
  }

  /**
   * Get comprehensive image report
   */
  async getImageReport(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const { userId } = req.user as { userId: string };

      if (!imageId) {
        res.status(400).json({
          success: false,
          error: 'Image ID is required'
        });
        return;
      }

      // Get all image information
      const metadata = await imageMetadataService.getImageMetadata(imageId);
      if (!metadata) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
        return;
      }

      if (metadata.ownerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to view report for this image'
        });
        return;
      }

      const [analytics, backupStatus] = await Promise.all([
        imageMetadataService.getImageAnalytics(imageId),
        imageMetadataService.checkBackupStatus(imageId)
      ]);

      const report = {
        metadata,
        analytics,
        backupStatus,
        generatedAt: new Date()
      };

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      safeLogger.error('Get image report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate image report'
      });
    }
  }
}

export default new ImageMetadataController();