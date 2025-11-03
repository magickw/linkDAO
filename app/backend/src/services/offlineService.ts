import { db } from '../db/connection';
import { safeLogger } from '../utils/safeLogger';
import { 
  offlineContentCache, 
  offlineActionQueue
} from '../db/schema';
import { eq, and, lt, desc, sql } from 'drizzle-orm';
import { Post } from '../models/Post';
import { Community } from '../types/community';

export interface CachedContent {
  id: string;
  userAddress: string;
  contentType: 'post' | 'community' | 'user' | 'comment';
  contentId: string;
  contentData: string; // JSON serialized
  expiresAt?: Date;
  priority: number;
  accessedAt: Date;
  createdAt: Date;
}

export interface OfflineAction {
  id: string;
  userAddress: string;
  actionType: 'post' | 'comment' | 'vote' | 'like';
  actionData: string; // JSON serialized
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastAttemptAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export class OfflineService {
  /**
   * Cache content for offline use
   */
  async cacheContent(
    userAddress: string,
    contentType: 'post' | 'community' | 'user' | 'comment',
    contentId: string,
    contentData: any,
    priority: number = 0,
    expiresInHours: number = 24
  ): Promise<boolean> {
    try {
      const expiresAt = expiresInHours > 0 
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : undefined;

      await db.insert(offlineContentCache).values({
        userAddress,
        contentType,
        contentId,
        contentData: JSON.stringify(contentData),
        expiresAt,
        priority,
        accessedAt: new Date(),
        createdAt: new Date(),
      });

      return true;
    } catch (error) {
      safeLogger.error('Error caching content:', error);
      return false;
    }
  }

  /**
   * Get cached content
   */
  async getCachedContent(
    userAddress: string,
    contentType: 'post' | 'community' | 'user' | 'comment',
    contentId: string
  ): Promise<any | null> {
    try {
      const result = await db
        .select()
        .from(offlineContentCache)
        .where(and(
          eq(offlineContentCache.userAddress, userAddress),
          eq(offlineContentCache.contentType, contentType),
          eq(offlineContentCache.contentId, contentId),
          offlineContentCache.expiresAt ? lt(offlineContentCache.expiresAt, new Date()) : undefined
        ))
        .limit(1);

      if (result.length > 0) {
        // Update accessed time
        await db
          .update(offlineContentCache)
          .set({ accessedAt: new Date() })
          .where(eq(offlineContentCache.id, result[0].id));

        return JSON.parse(result[0].contentData);
      }

      return null;
    } catch (error) {
      safeLogger.error('Error getting cached content:', error);
      return null;
    }
  }

  /**
   * Get all cached content for a user
   */
  async getAllCachedContent(userAddress: string): Promise<CachedContent[]> {
    try {
      // Clean up expired content first
      await this.cleanupExpiredContent();

      const results = await db
        .select()
        .from(offlineContentCache)
        .where(and(
          eq(offlineContentCache.userAddress, userAddress),
          offlineContentCache.expiresAt ? lt(offlineContentCache.expiresAt, new Date()) : undefined
        ))
        .orderBy(desc(offlineContentCache.accessedAt));

      return results;
    } catch (error) {
      safeLogger.error('Error getting all cached content:', error);
      return [];
    }
  }

  /**
   * Remove cached content
   */
  async removeCachedContent(
    userAddress: string,
    contentType: 'post' | 'community' | 'user' | 'comment',
    contentId: string
  ): Promise<boolean> {
    try {
      await db
        .delete(offlineContentCache)
        .where(and(
          eq(offlineContentCache.userAddress, userAddress),
          eq(offlineContentCache.contentType, contentType),
          eq(offlineContentCache.contentId, contentId)
        ));

      return true;
    } catch (error) {
      safeLogger.error('Error removing cached content:', error);
      return false;
    }
  }

  /**
   * Cleanup expired content
   */
  async cleanupExpiredContent(): Promise<void> {
    try {
      await db
        .delete(offlineContentCache)
        .where(and(
          offlineContentCache.expiresAt ? lt(offlineContentCache.expiresAt, new Date()) : undefined
        ));
    } catch (error) {
      safeLogger.error('Error cleaning up expired content:', error);
    }
  }

  /**
   * Queue offline action
   */
  async queueOfflineAction(
    userAddress: string,
    actionType: 'post' | 'comment' | 'vote' | 'like',
    actionData: any
  ): Promise<string | null> {
    try {
      const [result] = await db.insert(offlineActionQueue).values({
        userAddress,
        actionType,
        actionData: JSON.stringify(actionData),
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
      }).returning({ id: offlineActionQueue.id });

      return result.id;
    } catch (error) {
      safeLogger.error('Error queuing offline action:', error);
      return null;
    }
  }

  /**
   * Get pending offline actions for a user
   */
  async getPendingActions(userAddress: string): Promise<OfflineAction[]> {
    try {
      const results = await db
        .select()
        .from(offlineActionQueue)
        .where(and(
          eq(offlineActionQueue.userAddress, userAddress),
          eq(offlineActionQueue.status, 'pending')
        ))
        .orderBy(offlineActionQueue.createdAt);

      return results;
    } catch (error) {
      safeLogger.error('Error getting pending actions:', error);
      return [];
    }
  }

  /**
   * Update action status
   */
  async updateActionStatus(
    actionId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    retryCount?: number,
    lastAttemptAt?: Date
  ): Promise<boolean> {
    try {
      const updateData: any = { status };
      
      if (retryCount !== undefined) {
        updateData.retryCount = retryCount;
      }
      
      if (lastAttemptAt) {
        updateData.lastAttemptAt = lastAttemptAt;
      }
      
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }

      await db
        .update(offlineActionQueue)
        .set(updateData)
        .where(eq(offlineActionQueue.id, actionId));

      return true;
    } catch (error) {
      safeLogger.error('Error updating action status:', error);
      return false;
    }
  }

  /**
   * Get offline storage usage statistics
   */
  async getStorageUsage(userAddress: string): Promise<{
    totalActions: number;
    pendingActions: number;
    completedActions: number;
    failedActions: number;
    cachedContentCount: number;
    totalSize: number;
  }> {
    try {
      // Get action counts
      const actionCounts = await db
        .select({
          status: offlineActionQueue.status,
          count: sql<number>`count(*)`
        })
        .from(offlineActionQueue)
        .where(eq(offlineActionQueue.userAddress, userAddress))
        .groupBy(offlineActionQueue.status);

      // Get content count
      const contentCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(offlineContentCache)
        .where(eq(offlineContentCache.userAddress, userAddress));

      // Calculate approximate size (this is a rough estimate)
      const actionSize = actionCounts.reduce((sum, item) => sum + (item.count * 200), 0); // Approx 200 bytes per action
      const contentSize = contentCount[0]?.count * 1000 || 0; // Approx 1KB per content item

      return {
        totalActions: actionCounts.reduce((sum, item) => sum + item.count, 0),
        pendingActions: actionCounts.find(item => item.status === 'pending')?.count || 0,
        completedActions: actionCounts.find(item => item.status === 'completed')?.count || 0,
        failedActions: actionCounts.find(item => item.status === 'failed')?.count || 0,
        cachedContentCount: contentCount[0]?.count || 0,
        totalSize: actionSize + contentSize,
      };
    } catch (error) {
      safeLogger.error('Error getting storage usage:', error);
      return {
        totalActions: 0,
        pendingActions: 0,
        completedActions: 0,
        failedActions: 0,
        cachedContentCount: 0,
        totalSize: 0,
      };
    }
  }

  /**
   * Clear completed actions
   */
  async clearCompletedActions(userAddress: string, olderThanHours: number = 24): Promise<boolean> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      
      await db
        .delete(offlineActionQueue)
        .where(and(
          eq(offlineActionQueue.userAddress, userAddress),
          eq(offlineActionQueue.status, 'completed'),
          offlineActionQueue.completedAt ? lt(offlineActionQueue.completedAt, cutoffDate) : undefined
        ));

      return true;
    } catch (error) {
      safeLogger.error('Error clearing completed actions:', error);
      return false;
    }
  }
}

export default new OfflineService();
