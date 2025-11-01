/**
 * Share Tracking Service
 *
 * Handles tracking when users share posts
 */

import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { shares, posts } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

interface ShareData {
  postId: number;
  userId: string;
  targetType: 'community' | 'dm' | 'external';
  targetId?: string;
  message?: string;
}

class ShareService {
  /**
   * Track a share
   */
  async trackShare(data: ShareData): Promise<boolean> {
    try {
      const { postId, userId, targetType, targetId, message } = data;

      // Verify post exists
      const post = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (post.length === 0) {
        throw new Error('Post not found');
      }

      // Track the share
      await db.insert(shares).values({
        postId,
        userId,
        targetType,
        targetId: targetId || null,
        message: message || null
      });

      return true;
    } catch (error) {
      safeLogger.error('Error tracking share:', error);
      throw new Error('Failed to track share');
    }
  }

  /**
   * Get share count for a post
   */
  async getShareCount(postId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(shares)
        .where(eq(shares.postId, postId));

      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('Error getting share count:', error);
      return 0;
    }
  }

  /**
   * Get share breakdown by type for a post
   */
  async getShareBreakdown(postId: number) {
    try {
      const breakdown = await db
        .select({
          targetType: shares.targetType,
          count: sql<number>`COUNT(*)`
        })
        .from(shares)
        .where(eq(shares.postId, postId))
        .groupBy(shares.targetType);

      return {
        total: breakdown.reduce((sum, item) => sum + item.count, 0),
        community: breakdown.find(item => item.targetType === 'community')?.count || 0,
        dm: breakdown.find(item => item.targetType === 'dm')?.count || 0,
        external: breakdown.find(item => item.targetType === 'external')?.count || 0
      };
    } catch (error) {
      safeLogger.error('Error getting share breakdown:', error);
      throw new Error('Failed to retrieve share breakdown');
    }
  }

  /**
   * Get recent shares for a post
   */
  async getRecentShares(postId: number, limit: number = 10) {
    try {
      const recentShares = await db
        .select()
        .from(shares)
        .where(eq(shares.postId, postId))
        .orderBy(sql`${shares.createdAt} DESC`)
        .limit(limit);

      return recentShares;
    } catch (error) {
      safeLogger.error('Error getting recent shares:', error);
      throw new Error('Failed to retrieve recent shares');
    }
  }

  /**
   * Get user's sharing history
   */
  async getUserShares(userId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const userShares = await db
        .select({
          share: shares,
          post: posts
        })
        .from(shares)
        .leftJoin(posts, eq(shares.postId, posts.id))
        .where(eq(shares.userId, userId))
        .orderBy(sql`${shares.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(shares)
        .where(eq(shares.userId, userId));

      return {
        shares: userShares,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting user shares:', error);
      throw new Error('Failed to retrieve user shares');
    }
  }
}

export const shareService = new ShareService();
