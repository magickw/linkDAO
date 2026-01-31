import { safeLogger } from '../utils/safeLogger';
import { databaseService } from './databaseService';
import { moderationCases, moderationAppeals, contentReports, moderationActions, users } from '../db/schema';
import { eq, gte, count, avg, sql, desc, and, inArray } from 'drizzle-orm';

/**
 * Query optimization utilities for moderation system
 * Helps reduce N+1 queries and improve performance
 */
export class ModerationQueryOptimizer {
  /**
   * Fetch moderation queue with pre-loaded related data to avoid N+1 queries
   */
  async getModerationQueueWithRelations(
    filters: {
      status?: string;
      contentType?: string;
      priority?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const db = databaseService.getDatabase();
      const { page = 1, limit = 10, status, contentType, priority } = filters;
      const offset = (page - 1) * limit;

      // Build conditions
      const conditions = [];
      if (status) conditions.push(eq(moderationCases.status, status));
      if (contentType) conditions.push(eq(moderationCases.contentType, contentType));
      if (priority) conditions.push(eq(moderationCases.priority, priority));

      // Single query to fetch cases with user data using LEFT JOIN
      const cases = await db
        .select({
          id: moderationCases.id,
          contentId: moderationCases.contentId,
          contentType: moderationCases.contentType,
          status: moderationCases.status,
          priority: moderationCases.priority,
          riskScore: moderationCases.riskScore,
          decision: moderationCases.decision,
          reasonCode: moderationCases.reasonCode,
          confidence: moderationCases.confidence,
          createdAt: moderationCases.createdAt,
          updatedAt: moderationCases.updatedAt,
          assignedModeratorId: moderationCases.assignedModeratorId,
          // User data
          userId: moderationCases.userId,
          userUsername: users.username,
          userDisplayName: users.displayName,
          userAvatar: users.avatarUrl,
          userReputation: users.reputation
        })
        .from(moderationCases)
        .leftJoin(users, eq(moderationCases.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(moderationCases.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count in a separate query (more efficient than subquery)
      const countResult = await db
        .select({ count: count() })
        .from(moderationCases)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count || 0;

      return {
        items: cases,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      safeLogger.error('Error in optimized moderation queue query:', error);
      throw error;
    }
  }

  /**
   * Fetch moderation history with pre-loaded related data
   */
  async getModerationHistoryWithRelations(
    filters: {
      status?: string;
      contentType?: string;
      moderatorId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const db = databaseService.getDatabase();
      const { page = 1, limit = 10, status, contentType, moderatorId } = filters;
      const offset = (page - 1) * limit;

      // Build conditions
      const conditions = [];
      if (status) conditions.push(eq(moderationCases.status, status));
      if (contentType) conditions.push(eq(moderationCases.contentType, contentType));
      if (moderatorId) conditions.push(eq(moderationCases.assignedModeratorId, moderatorId));

      // Single query with LEFT JOIN to fetch moderator data
      const cases = await db
        .select({
          id: moderationCases.id,
          contentId: moderationCases.contentId,
          contentType: moderationCases.contentType,
          status: moderationCases.status,
          decision: moderationCases.decision,
          reasonCode: moderationCases.reasonCode,
          updatedAt: moderationCases.updatedAt,
          assignedModeratorId: moderationCases.assignedModeratorId,
          // Content creator data
          userId: moderationCases.userId,
          userUsername: users.username,
          userDisplayName: users.displayName
        })
        .from(moderationCases)
        .leftJoin(users, eq(moderationCases.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(moderationCases.updatedAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countResult = await db
        .select({ count: count() })
        .from(moderationCases)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count || 0;

      return {
        items: cases,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      safeLogger.error('Error in optimized moderation history query:', error);
      throw error;
    }
  }

  /**
   * Batch fetch user data for multiple cases (avoid N+1 queries)
   */
  async batchFetchUserData(userIds: string[]) {
    if (userIds.length === 0) return new Map();

    try {
      const db = databaseService.getDatabase();

      const usersData = await db
        .select()
        .from(users)
        .where(inArray(users.id, userIds));

      // Convert to Map for O(1) lookup
      const userMap = new Map(
        usersData.map(user => [user.id, user])
      );

      return userMap;

    } catch (error) {
      safeLogger.error('Error in batch user data fetch:', error);
      return new Map();
    }
  }

  /**
   * Get moderation statistics with optimized aggregation queries
   */
  async getModerationStatistics(timeWindow: number = 86400000) {
    try {
      const db = databaseService.getDatabase();
      const cutoff = new Date(Date.now() - timeWindow);

      // Single query to get all statistics using conditional aggregation
      const stats = await db
        .select({
          totalCases: count(),
          totalBlocked: sql<number>`COUNT(CASE WHEN ${moderationCases.status} = 'blocked' THEN 1 END)`,
          totalAllowed: sql<number>`COUNT(CASE WHEN ${moderationCases.status} = 'allowed' THEN 1 END)`,
          totalUnderReview: sql<number>`COUNT(CASE WHEN ${moderationCases.status} = 'under_review' THEN 1 END)`,
          avgRiskScore: avg(moderationCases.riskScore),
          avgConfidence: avg(moderationCases.confidence),
          byType: sql<any>`json_object_agg(${moderationCases.contentType}, COUNT(*))`
        })
        .from(moderationCases)
        .where(gte(moderationCases.createdAt, cutoff));

      return stats[0] || {
        totalCases: 0,
        totalBlocked: 0,
        totalAllowed: 0,
        totalUnderReview: 0,
        avgRiskScore: 0,
        avgConfidence: 0,
        byType: {}
      };

    } catch (error) {
      safeLogger.error('Error in optimized statistics query:', error);
      throw error;
    }
  }

  /**
   * Get top violation categories with optimized query
   */
  async getTopViolationCategories(timeWindow: number = 86400000, limit: number = 10) {
    try {
      const db = databaseService.getDatabase();
      const cutoff = new Date(Date.now() - timeWindow);

      const categories = await db
        .select({
          category: moderationCases.reasonCode,
          count: count()
        })
        .from(moderationCases)
        .where(gte(moderationCases.createdAt, cutoff))
        .groupBy(moderationCases.reasonCode)
        .orderBy(desc(count()))
        .limit(limit);

      const total = categories.reduce((sum, cat) => sum + (cat.count || 0), 0);

      return categories
        .filter(cat => cat.category)
        .map(cat => ({
          category: cat.category!,
          count: cat.count,
          percentage: total > 0 ? (cat.count / total) * 100 : 0
        }));

    } catch (error) {
      safeLogger.error('Error in optimized violation categories query:', error);
      return [];
    }
  }

  /**
   * Get appeal statistics with optimized query
   */
  async getAppealStatistics(timeWindow: number = 86400000) {
    try {
      const db = databaseService.getDatabase();
      const cutoff = new Date(Date.now() - timeWindow);

      // Single query with conditional aggregation
      const stats = await db
        .select({
          totalAppeals: count(),
          pendingAppeals: sql<number>`COUNT(CASE WHEN ${moderationAppeals.status} = 'open' THEN 1 END)`,
          overturned: sql<number>`COUNT(CASE WHEN ${moderationAppeals.juryDecision} = 'overturn' THEN 1 END)`,
          upheld: sql<number>`COUNT(CASE WHEN ${moderationAppeals.juryDecision} = 'uphold' THEN 1 END)`,
          avgStake: avg(moderationAppeals.stakeAmount)
        })
        .from(moderationAppeals)
        .where(gte(moderationAppeals.createdAt, cutoff));

      const result = stats[0] || {
        totalAppeals: 0,
        pendingAppeals: 0,
        overturned: 0,
        upheld: 0,
        avgStake: 0
      };

      return {
        ...result,
        overturnRate: result.totalAppeals > 0 ? result.overturned / result.totalAppeals : 0
      };

    } catch (error) {
      safeLogger.error('Error in optimized appeal statistics query:', error);
      return {
        totalAppeals: 0,
        pendingAppeals: 0,
        overturned: 0,
        upheld: 0,
        avgStake: 0,
        overturnRate: 0
      };
    }
  }

  /**
   * Get report statistics with optimized query
   */
  async getReportStatistics(timeWindow: number = 86400000) {
    try {
      const db = databaseService.getDatabase();
      const cutoff = new Date(Date.now() - timeWindow);

      const stats = await db
        .select({
          totalReports: count(),
          openReports: sql<number>`COUNT(CASE WHEN ${contentReports.status} = 'open' THEN 1 END)`,
          resolvedReports: sql<number>`COUNT(CASE WHEN ${contentReports.status} = 'resolved' THEN 1 END)`,
          avgWeight: avg(contentReports.weight)
        })
        .from(contentReports)
        .where(gte(contentReports.createdAt, cutoff));

      return stats[0] || {
        totalReports: 0,
        openReports: 0,
        resolvedReports: 0,
        avgWeight: 0
      };

    } catch (error) {
      safeLogger.error('Error in optimized report statistics query:', error);
      return {
        totalReports: 0,
        openReports: 0,
        resolvedReports: 0,
        avgWeight: 0
      };
    }
  }

  /**
   * Get vendor performance with optimized query
   */
  async getVendorPerformance(timeWindow: number = 86400000) {
    try {
      const db = databaseService.getDatabase();
      const cutoff = new Date(Date.now() - timeWindow);

      // Extract vendor performance from JSONB column
      const performance = await db
        .select({
          vendor: sql<string>`key`,
          totalCases: count(),
          avgConfidence: avg(sql<number>`CAST(${moderationCases.vendorScores}->>'confidence' AS DECIMAL)`)
        })
        .from(moderationCases)
        .where(
          and(
            gte(moderationCases.createdAt, cutoff),
            sql`${moderationCases.vendorScores} IS NOT NULL`
          )
        )
        .groupBy(sql`key`)
        .orderBy(desc(count()));

      return performance.map(p => ({
        vendor: p.vendor,
        totalCases: p.totalCases,
        avgConfidence: Number(p.avgConfidence) || 0
      }));

    } catch (error) {
      safeLogger.error('Error in optimized vendor performance query:', error);
      return [];
    }
  }

  /**
   * Get queue depth by status
   */
  async getQueueDepthByStatus() {
    try {
      const db = databaseService.getDatabase();

      const depth = await db
        .select({
          status: moderationCases.status,
          count: count()
        })
        .from(moderationCases)
        .where(
          sql`${moderationCases.status} IN ('pending', 'under_review', 'quarantined')`
        )
        .groupBy(moderationCases.status);

      return depth.reduce((acc, row) => {
        if (row.status) {
          acc[row.status] = row.count;
        }
        return acc;
      }, {} as Record<string, number>);

    } catch (error) {
      safeLogger.error('Error in optimized queue depth query:', error);
      return {};
    }
  }

  /**
   * Batch update case statuses
   */
  async batchUpdateCaseStatuses(
    caseIds: number[],
    updates: {
      status: string;
      decision?: string;
      assignedModeratorId?: string;
    }
  ) {
    if (caseIds.length === 0) return 0;

    try {
      const db = databaseService.getDatabase();

      const result = await db
        .update(moderationCases)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(inArray(moderationCases.id, caseIds));

      return result.rowCount || 0;

    } catch (error) {
      safeLogger.error('Error in batch case status update:', error);
      throw error;
    }
  }

  /**
   * Get cases by IDs with user data (batch fetch)
   */
  async getCasesByIdsWithUserData(caseIds: number[]) {
    if (caseIds.length === 0) return [];

    try {
      const db = databaseService.getDatabase();

      const cases = await db
        .select({
          id: moderationCases.id,
          contentId: moderationCases.contentId,
          contentType: moderationCases.contentType,
          status: moderationCases.status,
          priority: moderationCases.priority,
          riskScore: moderationCases.riskScore,
          decision: moderationCases.decision,
          reasonCode: moderationCases.reasonCode,
          confidence: moderationCases.confidence,
          createdAt: moderationCases.createdAt,
          updatedAt: moderationCases.updatedAt,
          assignedModeratorId: moderationCases.assignedModeratorId,
          // User data
          userId: moderationCases.userId,
          userUsername: users.username,
          userDisplayName: users.displayName,
          userAvatar: users.avatarUrl,
          userReputation: users.reputation
        })
        .from(moderationCases)
        .leftJoin(users, eq(moderationCases.userId, users.id))
        .where(inArray(moderationCases.id, caseIds));

      return cases;

    } catch (error) {
      safeLogger.error('Error in batch cases fetch:', error);
      return [];
    }
  }
}

export const moderationQueryOptimizer = new ModerationQueryOptimizer();