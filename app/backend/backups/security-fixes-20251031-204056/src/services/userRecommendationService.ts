import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { users, follows, posts, reactions, tips, communities } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { eq, desc, sql, and, or, ne, count, avg, sum, inArray } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export interface RecommendationScore {
  userId: string;
  score: number;
  reasons: string[];
  mutualConnections: number;
  activityScore: number;
  reputationScore: number;
  communityOverlap: number;
}

export interface RecommendationContext {
  currentUserId: string;
  communityId?: string;
  interests?: string[];
  timeframe?: 'day' | 'week' | 'month' | 'all';
  algorithm?: 'collaborative' | 'content' | 'hybrid';
}

export class UserRecommendationService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Generate user recommendations using hybrid algorithm
   */
  async generateRecommendations(
    context: RecommendationContext,
    limit = 10
  ): Promise<RecommendationScore[]> {
    const { algorithm = 'hybrid' } = context;

    switch (algorithm) {
      case 'collaborative':
        return this.collaborativeFiltering(context, limit);
      case 'content':
        return this.contentBasedFiltering(context, limit);
      case 'hybrid':
      default:
        return this.hybridRecommendation(context, limit);
    }
  }

  /**
   * Collaborative filtering based on user behavior patterns
   */
  private async collaborativeFiltering(
    context: RecommendationContext,
    limit: number
  ): Promise<RecommendationScore[]> {
    const { currentUserId } = context;
    const db = this.databaseService.getDatabase();

    try {
      // Find users with similar following patterns
      const similarUsers = await this.findSimilarUsers(currentUserId);
      
      // Get users followed by similar users but not by current user
      const recommendations: RecommendationScore[] = [];
      
      for (const similarUser of similarUsers.slice(0, 20)) {
        const theirFollows = await db
          .select({ followingId: follows.followingId })
          .from(follows)
          .where(eq(follows.followerId, similarUser.userId));

        for (const follow of theirFollows) {
          // Skip if current user already follows this person
          const alreadyFollowing = await this.isAlreadyFollowing(currentUserId, follow.followingId);
          if (alreadyFollowing || follow.followingId === currentUserId) {
            continue;
          }

          // Calculate recommendation score
          const score = await this.calculateCollaborativeScore(
            currentUserId,
            follow.followingId,
            similarUser.similarity
          );

          const existing = recommendations.find(r => r.userId === follow.followingId);
          if (existing) {
            existing.score += score;
            existing.reasons.push(`Followed by similar users`);
          } else {
            recommendations.push({
              userId: follow.followingId,
              score,
              reasons: [`Followed by users with similar interests`],
              mutualConnections: 0,
              activityScore: 0,
              reputationScore: 0,
              communityOverlap: 0,
            });
          }
        }
      }

      // Sort by score and return top recommendations
      recommendations.sort((a, b) => b.score - a.score);
      return recommendations.slice(0, limit);
    } catch (error) {
      safeLogger.error('Error in collaborative filtering:', error);
      return [];
    }
  }

  /**
   * Content-based filtering based on user interests and activity
   */
  private async contentBasedFiltering(
    context: RecommendationContext,
    limit: number
  ): Promise<RecommendationScore[]> {
    const { currentUserId, communityId, interests } = context;
    const db = this.databaseService.getDatabase();

    try {
      // Get current user's interests from their posts and reactions
      const userInterests = await this.getUserInterests(currentUserId);
      const targetInterests = interests || userInterests;

      // Find users with similar interests
      const candidates = await this.findUsersByInterests(targetInterests, currentUserId);
      
      const recommendations: RecommendationScore[] = [];

      for (const candidate of candidates) {
        const score = await this.calculateContentScore(
          currentUserId,
          candidate.userId,
          targetInterests,
          communityId
        );

        if (score > 0) {
          recommendations.push({
            userId: candidate.userId,
            score,
            reasons: this.generateContentReasons(candidate, targetInterests),
            mutualConnections: 0,
            activityScore: candidate.activityScore || 0,
            reputationScore: candidate.reputationScore || 0,
            communityOverlap: candidate.communityOverlap || 0,
          });
        }
      }

      recommendations.sort((a, b) => b.score - a.score);
      return recommendations.slice(0, limit);
    } catch (error) {
      safeLogger.error('Error in content-based filtering:', error);
      return [];
    }
  }

  /**
   * Hybrid recommendation combining collaborative and content-based approaches
   */
  private async hybridRecommendation(
    context: RecommendationContext,
    limit: number
  ): Promise<RecommendationScore[]> {
    try {
      // Get recommendations from both algorithms
      const collaborativeRecs = await this.collaborativeFiltering(context, limit * 2);
      const contentRecs = await this.contentBasedFiltering(context, limit * 2);

      // Combine and weight the recommendations
      const combinedRecs = new Map<string, RecommendationScore>();

      // Add collaborative recommendations with weight 0.6
      for (const rec of collaborativeRecs) {
        combinedRecs.set(rec.userId, {
          ...rec,
          score: rec.score * 0.6,
          reasons: [...rec.reasons, 'Similar user behavior'],
        });
      }

      // Add content-based recommendations with weight 0.4
      for (const rec of contentRecs) {
        const existing = combinedRecs.get(rec.userId);
        if (existing) {
          existing.score += rec.score * 0.4;
          existing.reasons = [...new Set([...existing.reasons, ...rec.reasons])];
          existing.activityScore = rec.activityScore;
          existing.reputationScore = rec.reputationScore;
          existing.communityOverlap = rec.communityOverlap;
        } else {
          combinedRecs.set(rec.userId, {
            ...rec,
            score: rec.score * 0.4,
            reasons: [...rec.reasons, 'Similar interests'],
          });
        }
      }

      // Add mutual connections and final scoring
      const finalRecs: RecommendationScore[] = [];
      for (const [userId, rec] of combinedRecs) {
        const mutualConnections = await this.getMutualConnectionsCount(context.currentUserId, userId);
        rec.mutualConnections = mutualConnections;
        rec.score += mutualConnections * 10; // Boost score for mutual connections
        
        finalRecs.push(rec);
      }

      // Sort by final score
      finalRecs.sort((a, b) => b.score - a.score);
      return finalRecs.slice(0, limit);
    } catch (error) {
      safeLogger.error('Error in hybrid recommendation:', error);
      return [];
    }
  }

  /**
   * Find users with similar following patterns
   */
  private async findSimilarUsers(currentUserId: string): Promise<Array<{ userId: string; similarity: number }>> {
    const db = this.databaseService.getDatabase();

    try {
      // Get users that current user follows
      const currentUserFollows = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, currentUserId));

      const currentFollowingIds = currentUserFollows.map(f => f.followingId);

      if (currentFollowingIds.length === 0) {
        return [];
      }

      // Find users who follow similar people
      const similarUsers = await db
        .select({
          followerId: follows.followerId,
          commonFollows: count(follows.followingId),
        })
        .from(follows)
        .where(
          and(
            inArray(follows.followingId, currentFollowingIds),
            ne(follows.followerId, currentUserId)
          )
        )
        .groupBy(follows.followerId)
        .having(sql`count(${follows.followingId}) >= 2`) // At least 2 common follows
        .orderBy(desc(count(follows.followingId)))
        .limit(50);

      // Calculate similarity scores
      return similarUsers.map(user => ({
        userId: user.followerId,
        similarity: user.commonFollows / currentFollowingIds.length,
      }));
    } catch (error) {
      safeLogger.error('Error finding similar users:', error);
      return [];
    }
  }

  /**
   * Get user interests from their activity
   */
  private async getUserInterests(userId: string): Promise<string[]> {
    const db = this.databaseService.getDatabase();

    try {
      // Get interests from post tags
      const postTags = await db
        .select({ tags: posts.tags })
        .from(posts)
        .where(eq(posts.authorId, userId))
        .limit(50);

      const interests = new Set<string>();
      
      for (const post of postTags) {
        if (post.tags) {
          try {
            const tags = JSON.parse(post.tags);
            if (Array.isArray(tags)) {
              tags.forEach(tag => interests.add(tag.toLowerCase()));
            }
          } catch (error) {
            // Ignore parsing errors
          }
        }
      }

      return Array.from(interests).slice(0, 10);
    } catch (error) {
      safeLogger.error('Error getting user interests:', error);
      return [];
    }
  }

  /**
   * Find users by interests
   */
  private async findUsersByInterests(
    interests: string[],
    excludeUserId: string
  ): Promise<Array<{
    userId: string;
    activityScore: number;
    reputationScore: number;
    communityOverlap: number;
  }>> {
    const db = this.databaseService.getDatabase();

    try {
      if (interests.length === 0) {
        return [];
      }

      // Find users who have posted with similar tags
      const candidates = await db
        .select({
          authorId: posts.authorId,
          postCount: count(posts.id),
        })
        .from(posts)
        .where(
          and(
            ne(posts.authorId, excludeUserId),
            sql`${posts.tags} IS NOT NULL`
          )
        )
        .groupBy(posts.authorId)
        .orderBy(desc(count(posts.id)))
        .limit(100);

      const results: Array<{
        userId: string;
        activityScore: number;
        reputationScore: number;
        communityOverlap: number;
      }> = [];

      for (const candidate of candidates) {
        if (!candidate.authorId) continue;

        // Calculate interest overlap
        const userInterests = await this.getUserInterests(candidate.authorId);
        const overlap = this.calculateInterestOverlap(interests, userInterests);
        
        if (overlap > 0.1) { // At least 10% overlap
          results.push({
            userId: candidate.authorId,
            activityScore: candidate.postCount || 0,
            reputationScore: 0, // Would be calculated from reputation service
            communityOverlap: overlap,
          });
        }
      }

      return results;
    } catch (error) {
      safeLogger.error('Error finding users by interests:', error);
      return [];
    }
  }

  /**
   * Calculate collaborative filtering score
   */
  private async calculateCollaborativeScore(
    currentUserId: string,
    candidateUserId: string,
    similarity: number
  ): Promise<number> {
    // Base score from similarity
    let score = similarity * 100;

    // Boost for user activity
    const activityScore = await this.getUserActivityScore(candidateUserId);
    score += activityScore * 0.1;

    return score;
  }

  /**
   * Calculate content-based score
   */
  private async calculateContentScore(
    currentUserId: string,
    candidateUserId: string,
    interests: string[],
    communityId?: string
  ): Promise<number> {
    let score = 0;

    // Interest overlap score
    const candidateInterests = await this.getUserInterests(candidateUserId);
    const interestOverlap = this.calculateInterestOverlap(interests, candidateInterests);
    score += interestOverlap * 100;

    // Community overlap score
    if (communityId) {
      const inSameCommunity = await this.isUserInCommunity(candidateUserId, communityId);
      if (inSameCommunity) {
        score += 50;
      }
    }

    // Activity score
    const activityScore = await this.getUserActivityScore(candidateUserId);
    score += activityScore * 0.05;

    return score;
  }

  /**
   * Helper methods
   */
  private async isAlreadyFollowing(followerId: string, followingId: string): Promise<boolean> {
    const db = this.databaseService.getDatabase();
    
    const [result] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      )
      .limit(1);

    return !!result;
  }

  private async getMutualConnectionsCount(userId1: string, userId2: string): Promise<number> {
    const db = this.databaseService.getDatabase();

    try {
      const [result] = await db
        .select({ count: count() })
        .from(follows)
        .innerJoin(
          sql`(SELECT following_id FROM follows WHERE follower_id = ${userId2}) AS user2_follows`,
          sql`follows.following_id = user2_follows.following_id`
        )
        .where(eq(follows.followerId, userId1));

      return result.count || 0;
    } catch (error) {
      safeLogger.error('Error calculating mutual connections:', error);
      return 0;
    }
  }

  private async getUserActivityScore(userId: string): Promise<number> {
    const db = this.databaseService.getDatabase();

    try {
      // Calculate activity score based on posts, reactions, and tips
      const [postCount] = await db
        .select({ count: count() })
        .from(posts)
        .where(eq(posts.authorId, userId));

      const [reactionCount] = await db
        .select({ count: count() })
        .from(reactions)
        .where(eq(reactions.userId, userId));

      const [tipCount] = await db
        .select({ count: count() })
        .from(tips)
        .where(eq(tips.fromUserId, userId));

      return (postCount.count || 0) * 5 + (reactionCount.count || 0) * 2 + (tipCount.count || 0) * 3;
    } catch (error) {
      safeLogger.error('Error calculating activity score:', error);
      return 0;
    }
  }

  private calculateInterestOverlap(interests1: string[], interests2: string[]): number {
    if (interests1.length === 0 || interests2.length === 0) {
      return 0;
    }

    const set1 = new Set(interests1.map(i => i.toLowerCase()));
    const set2 = new Set(interests2.map(i => i.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  private async isUserInCommunity(userId: string, communityId: string): Promise<boolean> {
    const db = this.databaseService.getDatabase();

    try {
      // Check if user has posted in the community
      const [result] = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.authorId, userId),
            eq(posts.communityId, communityId)
          )
        )
        .limit(1);

      return !!result;
    } catch (error) {
      safeLogger.error('Error checking community membership:', error);
      return false;
    }
  }

  private generateContentReasons(
    candidate: { activityScore: number; reputationScore: number; communityOverlap: number },
    interests: string[]
  ): string[] {
    const reasons: string[] = [];

    if (candidate.communityOverlap > 0.3) {
      reasons.push('Similar interests');
    }
    
    if (candidate.activityScore > 50) {
      reasons.push('Active contributor');
    }
    
    if (candidate.reputationScore > 500) {
      reasons.push('High reputation');
    }

    if (reasons.length === 0) {
      reasons.push('Recommended for you');
    }

    return reasons;
  }
}