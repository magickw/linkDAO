/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { EngagementAnalyticsService } from '../services/engagementAnalyticsService';

export class EngagementAnalyticsController {
  /**
   * Get comprehensive engagement analytics
   */
  static async getEngagementAnalytics(req: Request, res: Response) {
    try {
      const { userId, timeRange = 'week' } = req.query;
      
      const analytics = await EngagementAnalyticsService.getEngagementAnalytics(
        userId as string,
        timeRange as string
      );

      res.json({
        success: true,
        data: analytics,
        metadata: {
          generatedAt: new Date(),
          timeRange,
          totalDataPoints: analytics.reactions + analytics.comments + analytics.shares + analytics.tips,
          cacheStatus: 'miss' // TODO: Implement caching
        }
      });
    } catch (error) {
      safeLogger.error('Error getting engagement analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get engagement analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get engagement trends over time
   */
  static async getEngagementTrends(req: Request, res: Response) {
    try {
      const { userId, timeRange = 'week', granularity = 'day' } = req.query;
      
      const trends = await EngagementAnalyticsService.getEngagementTrends(
        userId as string,
        timeRange as string,
        granularity as string
      );

      res.json({
        success: true,
        data: trends,
        metadata: {
          generatedAt: new Date(),
          timeRange,
          granularity,
          totalDataPoints: trends.length
        }
      });
    } catch (error) {
      safeLogger.error('Error getting engagement trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get engagement trends',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Track a single engagement interaction
   */
  static async trackEngagementInteraction(req: Request, res: Response) {
    try {
      const interaction = req.body;
      const userId = req.user?.walletAddress;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }

      // Add user ID and timestamp
      const fullInteraction = {
        ...interaction,
        userId,
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      await EngagementAnalyticsService.trackEngagementInteraction(fullInteraction);

      res.json({
        success: true,
        message: 'Interaction tracked successfully'
      });
    } catch (error) {
      safeLogger.error('Error tracking engagement interaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track interaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Track multiple engagement interactions in batch
   */
  static async trackEngagementBatch(req: Request, res: Response) {
    try {
      const interactions = req.body;
      const userId = req.user?.walletAddress;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }

      if (!Array.isArray(interactions)) {
        return res.status(400).json({
          success: false,
          error: 'Interactions must be an array'
        });
      }

      // Add user ID and metadata to all interactions
      const fullInteractions = interactions.map(interaction => ({
        ...interaction,
        userId,
        timestamp: new Date(interaction.timestamp || Date.now()),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }));

      await EngagementAnalyticsService.trackEngagementBatch(fullInteractions);

      res.json({
        success: true,
        message: `${interactions.length} interactions tracked successfully`
      });
    } catch (error) {
      safeLogger.error('Error tracking engagement batch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track interactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get top performing posts
   */
  static async getTopPerformingPosts(req: Request, res: Response) {
    try {
      const { userId, timeRange = 'week', limit = '10', sortBy = 'engagementScore' } = req.query;
      
      const posts = await EngagementAnalyticsService.getTopPerformingPosts(
        userId as string,
        timeRange as string,
        parseInt(limit as string),
        sortBy as string
      );

      res.json({
        success: true,
        data: posts,
        metadata: {
          generatedAt: new Date(),
          timeRange,
          sortBy,
          totalPosts: posts.length,
          limit: parseInt(limit as string)
        }
      });
    } catch (error) {
      safeLogger.error('Error getting top performing posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get top performing posts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get social proof indicators for a post
   */
  static async getSocialProofIndicators(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const { maxDisplayCount = '5' } = req.query;
      
      const indicators = await EngagementAnalyticsService.getSocialProofIndicators(
        postId,
        parseInt(maxDisplayCount as string)
      );

      res.json({
        success: true,
        data: indicators
      });
    } catch (error) {
      safeLogger.error('Error getting social proof indicators:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get social proof indicators',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get engagement aggregate for a post
   */
  static async getEngagementAggregate(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const { timeWindow = '1d' } = req.query;
      
      const aggregate = await EngagementAnalyticsService.getEngagementAggregate(
        postId,
        timeWindow as string
      );

      res.json({
        success: true,
        data: aggregate
      });
    } catch (error) {
      safeLogger.error('Error getting engagement aggregate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get engagement aggregate',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get bulk post analytics
   */
  static async getBulkPostAnalytics(req: Request, res: Response) {
    try {
      const { postIds, timeRange = 'week' } = req.body;
      
      if (!Array.isArray(postIds)) {
        return res.status(400).json({
          success: false,
          error: 'postIds must be an array'
        });
      }

      const analytics = await EngagementAnalyticsService.getBulkPostAnalytics(
        postIds,
        timeRange
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      safeLogger.error('Error getting bulk post analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get bulk post analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user engagement profile
   */
  static async getUserEngagementProfile(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const profile = await EngagementAnalyticsService.getUserEngagementProfile(userId);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      safeLogger.error('Error getting user engagement profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user engagement profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
