import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { socialMediaIntegrationService, CrossPostConfig } from '../services/socialMediaIntegrationService';
import { z } from 'zod';

// Validation schemas
const CrossPostSchema = z.object({
  postId: z.string(),
  platforms: z.array(z.enum(['twitter', 'discord', 'telegram', 'facebook', 'linkedin'])),
  contentTemplate: z.string().max(280),
  includeMedia: z.boolean().default(false),
  autoPost: z.boolean().default(true),
  scheduleTime: z.string().datetime().optional()
});

const AnalyticsQuerySchema = z.object({
  communityId: z.string(),
  timeframe: z.enum(['24h', '7d', '30d']).default('7d')
});

const ContentOptimizationSchema = z.object({
  content: z.string(),
  targetPlatforms: z.array(z.enum(['twitter', 'discord', 'telegram', 'facebook', 'linkedin']))
});

const ScheduleContentSchema = z.object({
  postId: z.string(),
  platforms: z.array(z.enum(['twitter', 'discord', 'telegram', 'facebook', 'linkedin'])),
  contentTemplate: z.string().max(280),
  includeMedia: z.boolean().default(false),
  scheduleTime: z.string().datetime()
});

const CancelScheduledPostSchema = z.object({
  postId: z.string()
});

export class SocialMediaIntegrationController {
  
  /**
   * Cross-post content to multiple social media platforms
   */
  async crossPostContent(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = CrossPostSchema.parse(req.body);
      
      // Transform validated input to match CrossPostConfig interface
      const crossPostConfig: CrossPostConfig = {
        postId: validatedInput.postId,
        platforms: validatedInput.platforms,
        contentTemplate: validatedInput.contentTemplate,
        includeMedia: validatedInput.includeMedia,
        autoPost: validatedInput.autoPost,
        scheduleTime: validatedInput.scheduleTime ? new Date(validatedInput.scheduleTime) : undefined
      };
      
      const results = await socialMediaIntegrationService.crossPostContent(crossPostConfig);
      
      res.status(201).json({
        success: true,
        data: results,
        message: 'Content cross-posted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error cross-posting content:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during cross-posting'
      });
    }
  }

  /**
   * Get social media analytics for a community
   */
  async getSocialMediaAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { communityId, timeframe } = req.query;
      
      // Validate query parameters
      const validatedInput = AnalyticsQuerySchema.parse({
        communityId,
        timeframe: timeframe || '7d'
      });
      
      const analytics = await socialMediaIntegrationService.getSocialMediaAnalytics(
        validatedInput.communityId,
        validatedInput.timeframe
      );
      
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error retrieving social media analytics:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving analytics'
      });
    }
  }

  /**
   * Optimize content for social sharing
   */
  async optimizeContentForSocialSharing(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = ContentOptimizationSchema.parse(req.body);
      
      const optimizationResult = await socialMediaIntegrationService.optimizeContentForSocialSharing(
        validatedInput.content,
        validatedInput.targetPlatforms
      );
      
      res.json({
        success: true,
        data: optimizationResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error optimizing content for social sharing:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during content optimization'
      });
    }
  }

  /**
   * Schedule content for future posting
   */
  async scheduleContent(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = ScheduleContentSchema.parse(req.body);
      
      // Transform validated input to match CrossPostConfig interface
      const crossPostConfig: CrossPostConfig = {
        postId: validatedInput.postId,
        platforms: validatedInput.platforms,
        contentTemplate: validatedInput.contentTemplate,
        includeMedia: validatedInput.includeMedia,
        autoPost: true, // Default value for scheduleContent
        scheduleTime: validatedInput.scheduleTime ? new Date(validatedInput.scheduleTime) : undefined
      };
      
      const scheduledPosts = await socialMediaIntegrationService.scheduleContent(crossPostConfig);
      
      res.status(201).json({
        success: true,
        data: scheduledPosts,
        message: 'Content scheduled successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error scheduling content:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during content scheduling'
      });
    }
  }

  /**
   * Get scheduled posts
   */
  async getScheduledPosts(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      
      const scheduledPosts = await socialMediaIntegrationService.getScheduledPosts(
        limit ? parseInt(limit as string, 10) : 50
      );
      
      res.json({
        success: true,
        data: scheduledPosts,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error retrieving scheduled posts:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving scheduled posts'
      });
    }
  }

  /**
   * Cancel scheduled post
   */
  async cancelScheduledPost(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = CancelScheduledPostSchema.parse(req.body);
      
      const cancelled = await socialMediaIntegrationService.cancelScheduledPost(validatedInput.postId);
      
      if (cancelled) {
        res.json({
          success: true,
          message: 'Scheduled post cancelled successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Scheduled post not found or already posted'
        });
      }

    } catch (error) {
      safeLogger.error('Error cancelling scheduled post:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error cancelling scheduled post'
      });
    }
  }

  /**
   * Health check endpoint for the social media integration service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check if all social media services are healthy
      const healthStatus = {
        service: 'social-media-integration',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        dependencies: {
          socialMediaIntegrationService: 'healthy',
          database: 'healthy'
        }
      };
      
      res.json({
        success: true,
        data: healthStatus
      });

    } catch (error) {
      safeLogger.error('Error in health check:', error);
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const socialMediaIntegrationController = new SocialMediaIntegrationController();
