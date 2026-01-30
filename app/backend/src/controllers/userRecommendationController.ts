import { Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { UserRecommendationService, RecommendationScore, RecommendationContext } from '../services/userRecommendationService';
import { UserProfileService } from '../services/userProfileService';
import { UserReputationService } from '../services/userReputationService';

const userRecommendationService = new UserRecommendationService();
const userProfileService = new UserProfileService();
const userReputationService = new UserReputationService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
  };
}

/**
 * Get personalized user recommendations
 */
export async function getUserRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const algorithm = req.query.algorithm as 'collaborative' | 'content' | 'hybrid' || 'hybrid';
    const communityId = req.query.communityId as string;

    // Build recommendation context
    const context: RecommendationContext = {
      currentUserId: userId,
      communityId,
      algorithm,
      timeframe: 'week'
    };

    // Get raw recommendations
    const recommendations = await userRecommendationService.generateRecommendations(context, limit * 2);

    // Enrich recommendations with user profiles and reputation
    const enrichedRecommendations = await Promise.all(
      recommendations.slice(0, limit).map(async (rec) => {
        const [profile, reputation] = await Promise.all([
              userProfileService.getProfileById(rec.userId).catch(() => null),
              userReputationService.calculateUserReputation(rec.userId).catch(() => ({ score: 0 }))
            ]);
        return {
          userId: rec.userId,
          score: rec.score,
          reasons: rec.reasons,
          mutualConnections: rec.mutualConnections,
          activityScore: rec.activityScore,
          reputationScore: ('totalScore' in reputation ? reputation.totalScore : reputation.score) || 0,
          communityOverlap: rec.communityOverlap,
          profile: profile ? {
            displayName: profile.displayName,
            handle: profile.handle,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio,
            walletAddress: profile.walletAddress
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        recommendations: enrichedRecommendations,
        metadata: {
          algorithm,
          totalFound: recommendations.length,
          returned: enrichedRecommendations.length,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    safeLogger.error('Error getting user recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user recommendations'
    });
  }
}

/**
 * Get community recommendations
 */
export async function getCommunityRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;

    // Get user's interests from their posts
    const interests = await userRecommendationService['getUserInterests'](userId);

    // Build context with interests
    const context: RecommendationContext = {
      currentUserId: userId,
      interests,
      algorithm: 'content',
      timeframe: 'week'
    };

    const recommendations = await userRecommendationService.generateRecommendations(context, limit);

    res.json({
      success: true,
      data: {
        recommendations,
        metadata: {
          totalFound: recommendations.length,
          returned: recommendations.length,
          interests: interests.slice(0, 5),
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    safeLogger.error('Error getting community recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get community recommendations'
    });
  }
}

/**
 * Record feedback on recommendations
 */
export async function recordRecommendationFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { recommendedUserId, action, type } = req.body;

    if (!recommendedUserId || !action) {
      res.status(400).json({ error: 'Missing required fields: recommendedUserId, action' });
      return;
    }

    if (!['view', 'follow', 'dismiss', 'report'].includes(action)) {
      res.status(400).json({ error: 'Invalid action. Must be one of: view, follow, dismiss, report' });
      return;
    }

    // Log feedback for analytics
    safeLogger.info('Recommendation feedback recorded:', {
      userId,
      recommendedUserId,
      action,
      type,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    safeLogger.error('Error recording recommendation feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record feedback'
    });
  }
}

/**
 * Get recommendation insights
 */
export async function getRecommendationInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user's current following count
    const profile = await userProfileService.getProfileById(userId);
    const followingCount = 0; // TODO: Get from database when available

    // Get recommendation quality metrics
    const recentRecommendations = await userRecommendationService.generateRecommendations({
      currentUserId: userId,
      algorithm: 'hybrid',
      timeframe: 'week'
    }, 5);

    const avgScore = recentRecommendations.length > 0
      ? recentRecommendations.reduce((sum, rec) => sum + rec.score, 0) / recentRecommendations.length
      : 0;

    res.json({
      success: true,
      data: {
        followingCount,
        recommendationCount: recentRecommendations.length,
        avgScore: Math.round(avgScore),
        recommendationQuality: avgScore > 70 ? 'high' : avgScore > 40 ? 'medium' : 'low',
        suggestions: followingCount < 10
          ? 'Follow more users to improve recommendations'
          : 'Your recommendations are personalized based on your activity',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    safeLogger.error('Error getting recommendation insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendation insights'
    });
  }
}