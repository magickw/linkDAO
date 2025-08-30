import { Request, Response } from 'express';
import { contentModerationQueue, ContentModerationJob } from '../services/contentModerationQueue';
import { contentStagingService } from '../services/contentStagingService';
import { databaseService } from '../services/databaseService';

export class ContentIngestionController {
  /**
   * Submit content for moderation
   */
  async submitContent(req: Request, res: Response): Promise<void> {
    try {
      const validatedContent = req.validatedContent;
      const user = req.user;

      if (!validatedContent || !user) {
        res.status(400).json({
          error: 'Invalid request data',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      // Generate unique content ID
      const userId = user.userId || (user as any).id;
      const contentId = `${validatedContent.contentType}_${userId}_${Date.now()}`;

      // Prepare job data
      const jobData: ContentModerationJob = {
        contentId,
        contentType: validatedContent.contentType,
        userId: userId,
        priority: validatedContent.priority,
        content: {
          text: validatedContent.text,
          mediaUrls: validatedContent.mediaFiles?.map(f => f.originalname) || [],
          links: validatedContent.links || [],
          metadata: {
            stagedContent: validatedContent.stagedContent,
            fileCount: validatedContent.mediaFiles?.length || 0,
            textLength: validatedContent.text?.length || 0,
            linkCount: validatedContent.links?.length || 0
          }
        },
        userReputation: (user as any).reputation || 0,
        walletAddress: user.walletAddress,
        submittedAt: new Date()
      };

      // Create moderation case in database
      const moderationCase = await databaseService.createModerationCase({
        contentId,
        contentType: validatedContent.contentType,
        userId: userId,
        status: 'pending',
        riskScore: 0,
        confidence: 0,
        vendorScores: {},
        evidenceCid: null
      });

      // Add to moderation queue
      const jobId = await contentModerationQueue.addToQueue(jobData);

      res.status(202).json({
        message: 'Content submitted for moderation',
        data: {
          contentId,
          jobId,
          caseId: moderationCase?.id,
          priority: validatedContent.priority,
          estimatedProcessingTime: validatedContent.priority === 'fast' ? '1-3 seconds' : '10-30 seconds',
          status: 'pending'
        }
      });

    } catch (error) {
      console.error('Content submission error:', error);
      res.status(500).json({
        error: 'Failed to submit content for moderation',
        code: 'SUBMISSION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check moderation status
   */
  async getModerationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      const user = req.user;

      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      // Get moderation case from database
      const moderationCase = await databaseService.getModerationCaseByContentId(contentId);

      if (!moderationCase) {
        res.status(404).json({
          error: 'Moderation case not found',
          code: 'CASE_NOT_FOUND'
        });
        return;
      }

      // Check if user owns this content
      const userId = user.userId || (user as any).id;
      if (moderationCase.userId !== userId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Get job status from queue (if still processing)
      let jobStatus = null;
      if (moderationCase.status === 'pending') {
        // Try to find the job (this is a simplified approach)
        const queueStats = await contentModerationQueue.getQueueStats();
        jobStatus = {
          inQueue: queueStats.fastQueue.waiting + queueStats.slowQueue.waiting > 0,
          processing: queueStats.fastQueue.active + queueStats.slowQueue.active > 0
        };
      }

      res.json({
        data: {
          contentId: moderationCase.contentId,
          status: moderationCase.status,
          decision: moderationCase.decision,
          confidence: moderationCase.confidence,
          riskScore: moderationCase.riskScore,
          reasonCode: moderationCase.reasonCode,
          createdAt: moderationCase.createdAt,
          updatedAt: moderationCase.updatedAt,
          jobStatus,
          canAppeal: moderationCase.status === 'blocked' || moderationCase.status === 'quarantined'
        }
      });

    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        error: 'Failed to check moderation status',
        code: 'STATUS_CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get queue statistics (admin only)
   */
  async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;

      // Check if user has admin permissions
      if (!user?.permissions?.includes('admin')) {
        res.status(403).json({
          error: 'Admin access required',
          code: 'ADMIN_REQUIRED'
        });
        return;
      }

      const queueStats = await contentModerationQueue.getQueueStats();
      const stagingStats = await contentStagingService.getStagingStats();

      res.json({
        data: {
          queues: queueStats,
          staging: stagingStats,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Queue stats error:', error);
      res.status(500).json({
        error: 'Failed to get queue statistics',
        code: 'STATS_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Retry failed moderation
   */
  async retryModeration(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      const user = req.user;

      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      // Get moderation case
      const moderationCase = await databaseService.getModerationCaseByContentId(contentId);

      if (!moderationCase) {
        res.status(404).json({
          error: 'Moderation case not found',
          code: 'CASE_NOT_FOUND'
        });
        return;
      }

      // Check ownership or admin permissions
      const userId2 = user.userId || (user as any).id;
      if (moderationCase.userId !== userId2 && !user.permissions?.includes('admin')) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Only allow retry for failed cases
      if (moderationCase.status !== 'failed') {
        res.status(400).json({
          error: 'Can only retry failed moderation cases',
          code: 'INVALID_STATUS',
          currentStatus: moderationCase.status
        });
        return;
      }

      // Reset case status
      await databaseService.updateModerationCase(moderationCase.id, {
        status: 'pending',
        updatedAt: new Date()
      });

      // Create new job (simplified - in real implementation, you'd reconstruct the original job data)
      const jobData: ContentModerationJob = {
        contentId,
        contentType: moderationCase.contentType as any,
        userId: moderationCase.userId,
        priority: 'fast', // Default to fast for retries
        content: {
          text: 'Retry job', // In real implementation, retrieve original content
          metadata: { retry: true }
        },
        userReputation: (user as any).reputation || 0,
        walletAddress: user.walletAddress,
        submittedAt: new Date()
      };

      const jobId = await contentModerationQueue.addToQueue(jobData);

      res.json({
        message: 'Moderation retry initiated',
        data: {
          contentId,
          jobId,
          status: 'pending'
        }
      });

    } catch (error) {
      console.error('Retry moderation error:', error);
      res.status(500).json({
        error: 'Failed to retry moderation',
        code: 'RETRY_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user's moderation history
   */
  async getModerationHistory(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { page = 1, limit = 20, status } = req.query;

      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 items per page

      // Get user's moderation cases
      const userId3 = user.userId || (user as any).id;
      const cases = await databaseService.getUserModerationCases(
        userId3,
        {
          page: pageNum,
          limit: limitNum,
          status: status as string
        }
      );

      res.json({
        data: {
          cases: cases.map((c: any) => ({
            contentId: c.contentId,
            contentType: c.contentType,
            status: c.status,
            decision: c.decision,
            confidence: c.confidence,
            riskScore: c.riskScore,
            reasonCode: c.reasonCode,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            hasMore: cases.length === limitNum
          }
        }
      });

    } catch (error) {
      console.error('Moderation history error:', error);
      res.status(500).json({
        error: 'Failed to get moderation history',
        code: 'HISTORY_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clean up expired staged content (admin only)
   */
  async cleanupStagedContent(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user?.permissions?.includes('admin')) {
        res.status(403).json({
          error: 'Admin access required',
          code: 'ADMIN_REQUIRED'
        });
        return;
      }

      const cleanedCount = await contentStagingService.cleanupExpiredContent();

      res.json({
        message: 'Staged content cleanup completed',
        data: {
          cleanedFiles: cleanedCount,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({
        error: 'Failed to cleanup staged content',
        code: 'CLEANUP_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const contentIngestionController = new ContentIngestionController();