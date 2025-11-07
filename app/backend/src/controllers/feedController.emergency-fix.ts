/// <reference path="../types/express.d.ts" />
import { Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { apiResponse } from '../utils/apiResponse';

/**
 * EMERGENCY FIX: Simplified getTrendingPosts that returns empty array instead of 500 error
 * This prevents the frontend from breaking while we fix the underlying database query
 */
export class FeedControllerEmergencyFix {
  // Get trending posts - EMERGENCY FALLBACK
  async getTrendingPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        timeRange = 'day'
      } = req.query;

      safeLogger.warn('Using emergency fallback for trending posts');

      // Return empty trending posts with proper structure
      res.json(apiResponse.success({
        posts: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0
        },
        message: 'Trending posts temporarily unavailable'
      }, 'Trending posts service temporarily unavailable'));
    } catch (error) {
      safeLogger.error('Error in emergency trending posts fallback:', error);
      
      // Even the fallback failed - return minimal response
      res.json(apiResponse.success({
        posts: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      }, 'Service temporarily unavailable'));
    }
  }
}

export const feedControllerEmergencyFix = new FeedControllerEmergencyFix();
