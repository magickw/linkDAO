import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { RecommendationService } from '../services/recommendationService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { authenticateUser } from '../middleware/auth';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

const recommendationService = new RecommendationService();

/**
 * Get community recommendations for a user
 * GET /api/recommendations/communities
 */
export async function getCommunityRecommendations(req: Request, res: Response) {
  try {
    const { userId, limit = 10 } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    const recommendations = await recommendationService.getPrecomputedCommunityRecommendations(
      userId, 
      Number(limit)
    );

    res.json({
      communities: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    safeLogger.error('Error getting community recommendations:', error);
    res.status(500).json({ error: 'Failed to get community recommendations' });
  }
}

/**
 * Get user recommendations for a user
 * GET /api/recommendations/users
 */
export async function getUserRecommendations(req: Request, res: Response) {
  try {
    const { userId, limit = 10 } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    const recommendations = await recommendationService.getPrecomputedUserRecommendations(
      userId, 
      Number(limit)
    );

    res.json({
      users: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    safeLogger.error('Error getting user recommendations:', error);
    res.status(500).json({ error: 'Failed to get user recommendations' });
  }
}

/**
 * Get trending content
 * GET /api/trending
 */
export async function getTrendingContent(req: Request, res: Response) {
  try {
    const { timeframe = 'daily', limit = 20 } = req.query;
    
    const trending = await recommendationService.getTrendingContent(
      timeframe as 'hourly' | 'daily' | 'weekly',
      Number(limit)
    );

    res.json({
      content: trending,
      count: trending.length
    });
  } catch (error) {
    safeLogger.error('Error getting trending content:', error);
    res.status(500).json({ error: 'Failed to get trending content' });
  }
}

/**
 * Record user interaction for recommendation training
 * POST /api/recommendations/interaction
 */
export async function recordUserInteraction(req: Request, res: Response) {
  try {
    const { userId, targetType, targetId, interactionType, interactionValue, metadata } = req.body;
    
    if (!userId || !targetType || !targetId || !interactionType) {
      return res.status(400).json({ 
        error: 'userId, targetType, targetId, and interactionType are required' 
      });
    }

    await recommendationService.recordUserInteraction(
      userId,
      targetType,
      targetId,
      interactionType,
      interactionValue || 1.0,
      metadata || {}
    );

    res.json({ success: true });
  } catch (error) {
    safeLogger.error('Error recording user interaction:', error);
    res.status(500).json({ error: 'Failed to record user interaction' });
  }
}

/**
 * Precompute recommendations for a user (admin/periodic task)
 * POST /api/recommendations/precompute
 */
export async function precomputeRecommendations(req: Request, res: Response) {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Precompute both community and user recommendations
    await Promise.all([
      recommendationService.precomputeCommunityRecommendations(userId),
      recommendationService.precomputeUserRecommendations(userId)
    ]);

    res.json({ success: true, message: 'Recommendations precomputed successfully' });
  } catch (error) {
    safeLogger.error('Error precomputing recommendations:', error);
    res.status(500).json({ error: 'Failed to precompute recommendations' });
  }
}