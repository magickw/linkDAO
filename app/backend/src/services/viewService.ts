/**
 * View Tracking Service
 *
 * Handles tracking post views with deduplication:
 * - Logged-in users: deduplicate by user_id + post_id
 * - Anonymous users: deduplicate by ip_address + post_id (within 24 hours)
 */

import { db } from '../db';
import { views, posts } from '../db/schema';
import { eq, and, sql, gt } from 'drizzle-orm';

interface ViewTrackingData {
  postId: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

class ViewService {
  /**
   * Track a view for a post with deduplication
   * Returns true if view was tracked, false if deduplicated
   */
  async trackView(data: ViewTrackingData): Promise<boolean> {
    const { postId, userId, ipAddress, userAgent } = data;

    try {
      // Check if post exists
      const post = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (post.length === 0) {
        console.warn(`Post ${postId} not found for view tracking`);
        return false;
      }

      // Deduplication logic
      if (userId) {
        // For logged-in users, check if they've already viewed this post
        const existingView = await db
          .select({ id: views.id })
          .from(views)
          .where(and(
            eq(views.postId, postId),
            eq(views.userId, userId)
          ))
          .limit(1);

        if (existingView.length > 0) {
          // User has already viewed this post
          return false;
        }
      } else if (ipAddress) {
        // For anonymous users, check if this IP viewed the post in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const existingView = await db
          .select({ id: views.id })
          .from(views)
          .where(and(
            eq(views.postId, postId),
            eq(views.ipAddress, ipAddress),
            gt(views.createdAt, twentyFourHoursAgo)
          ))
          .limit(1);

        if (existingView.length > 0) {
          // IP has viewed this post in last 24 hours
          return false;
        }
      }

      // Track the view
      await db.insert(views).values({
        postId,
        userId: userId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      });

      return true;
    } catch (error) {
      console.error('Error tracking view:', error);
      throw new Error('Failed to track view');
    }
  }

  /**
   * Get view count for a post
   */
  async getViewCount(postId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(views)
        .where(eq(views.postId, postId));

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting view count:', error);
      return 0;
    }
  }

  /**
   * Get view counts for multiple posts
   */
  async getViewCounts(postIds: number[]): Promise<Map<number, number>> {
    try {
      const results = await db
        .select({
          postId: views.postId,
          count: sql<number>`COUNT(*)`
        })
        .from(views)
        .where(sql`${views.postId} = ANY(${postIds})`)
        .groupBy(views.postId);

      const countsMap = new Map<number, number>();
      results.forEach(row => {
        countsMap.set(row.postId, row.count);
      });

      return countsMap;
    } catch (error) {
      console.error('Error getting view counts:', error);
      return new Map();
    }
  }

  /**
   * Get unique viewer count for a post (distinct users + IPs)
   */
  async getUniqueViewerCount(postId: number): Promise<number> {
    try {
      const result = await db
        .select({
          count: sql<number>`COUNT(DISTINCT COALESCE(user_id::TEXT, ip_address))`
        })
        .from(views)
        .where(eq(views.postId, postId));

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting unique viewer count:', error);
      return 0;
    }
  }

  /**
   * Get view analytics for a post
   */
  async getViewAnalytics(postId: number) {
    try {
      const [totalViews, uniqueViewers, loggedInViews, anonymousViews] = await Promise.all([
        this.getViewCount(postId),
        this.getUniqueViewerCount(postId),
        db.select({ count: sql<number>`COUNT(*)` })
          .from(views)
          .where(and(
            eq(views.postId, postId),
            sql`user_id IS NOT NULL`
          )),
        db.select({ count: sql<number>`COUNT(*)` })
          .from(views)
          .where(and(
            eq(views.postId, postId),
            sql`user_id IS NULL`
          ))
      ]);

      return {
        totalViews,
        uniqueViewers,
        loggedInViews: loggedInViews[0]?.count || 0,
        anonymousViews: anonymousViews[0]?.count || 0
      };
    } catch (error) {
      console.error('Error getting view analytics:', error);
      throw new Error('Failed to retrieve view analytics');
    }
  }
}

export const viewService = new ViewService();
