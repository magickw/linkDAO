import { databaseService } from './databaseService';
import { sql, eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { redisService } from './redisService';
import { ModerationCase } from './advancedModerationWorkflowsService';
import { ContentReport } from './advancedModeration';
import { ModeratorProfile } from './moderatorAuthService';

export interface QueueFilters {
  status?: string[];
  contentType?: string[];
  severity?: string[];
  reportCount?: { min?: number; max?: number };
  confidence?: { min?: number; max?: number };
  ageHours?: { min?: number; max?: number };
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface QueueSortOptions {
  field: 'created_at' | 'risk_score' | 'confidence' | 'report_count' | 'priority_score';
  direction: 'asc' | 'desc';
}

export interface QueueItem {
  case: ModerationCase;
  reports: ContentReport[];
  reportCount: number;
  priorityScore: number;
  assignedTo?: string;
  assignedAt?: Date;
  contentPreview?: {
    text?: string;
    mediaUrls?: string[];
    metadata?: Record<string, any>;
  };
  userContext?: {
    reputation: number;
    violationHistory: number;
    accountAge: number;
  };
}

export interface QueueStats {
  total: number;
  pending: number;
  underReview: number;
  highPriority: number;
  avgWaitTime: number;
  oldestCase: Date | null;
}

export class ReviewQueueService {
  private static instance: ReviewQueueService;

  public static getInstance(): ReviewQueueService {
    if (!ReviewQueueService.instance) {
      ReviewQueueService.instance = new ReviewQueueService();
    }
    return ReviewQueueService.instance;
  }

  /**
   * Get paginated review queue with filters and sorting
   */
  async getQueue(
    moderator: ModeratorProfile,
    page: number = 1,
    limit: number = 20,
    filters: QueueFilters = {},
    sort: QueueSortOptions = { field: 'created_at', direction: 'desc' }
  ): Promise<{
    items: QueueItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats: QueueStats;
  }> {
    try {
      const offset = (page - 1) * limit;
      
      // Build WHERE clause based on filters and moderator permissions
      const whereConditions = this.buildWhereClause(filters, moderator);
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Build ORDER BY clause
      const orderClause = this.buildOrderClause(sort);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT mc.id) as total
        FROM moderation_cases mc
        LEFT JOIN content_reports cr ON cr.content_id = mc.content_id AND cr.status = 'open'
        LEFT JOIN users u ON u.id = mc.user_id
        ${whereClause}
      `;
      
      // Use the database instance directly instead of query method
      const db = databaseService.getDatabase();
      const countResult = await db.execute(sql`${countQuery}`);
      const total = parseInt(countResult[0].total);
      
      // Get queue items
      const itemsQuery = `
        SELECT 
          mc.*,
          COUNT(DISTINCT cr.id) as report_count,
          COALESCE(
            (mc.risk_score * 0.4) + 
            (COUNT(DISTINCT cr.id) * 0.3) + 
            (CASE WHEN mc.created_at < NOW() - INTERVAL '24 hours' THEN 0.2 ELSE 0 END) +
            (CASE WHEN u.reputation < 50 THEN 0.1 ELSE 0 END),
            mc.risk_score
          ) as priority_score,
          u.reputation as user_reputation,
          (
            SELECT COUNT(*) 
            FROM moderation_actions ma2 
            WHERE ma2.user_id = mc.user_id 
              AND ma2.created_at > NOW() - INTERVAL '30 days'
          ) as violation_history,
          EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 86400 as account_age_days,
          qa.assigned_to,
          qa.assigned_at
        FROM moderation_cases mc
        LEFT JOIN content_reports cr ON cr.content_id = mc.content_id AND cr.status = 'open'
        LEFT JOIN users u ON u.id = mc.user_id
        LEFT JOIN queue_assignments qa ON qa.case_id = mc.id AND qa.is_active = true
        ${whereClause}
        GROUP BY mc.id, u.id, qa.assigned_to, qa.assigned_at
        ${orderClause}
        LIMIT $1 OFFSET $2
      `;
      
      const itemsResult = await db.execute(sql`${itemsQuery}`, [limit, offset]);
      
      // Process items and get additional data
      const items: QueueItem[] = await Promise.all(
        itemsResult.rows.map(async (row) => {
          const reports = await this.getReportsForCase(row.content_id);
          const contentPreview = await this.getContentPreview(row.content_id, row.content_type);
          
          return {
            case: {
              id: row.id,
              contentId: row.content_id,
              contentType: row.content_type,
              userId: row.user_id,
              status: row.status,
              riskScore: parseFloat(row.risk_score),
              decision: row.decision,
              reasonCode: row.reason_code,
              confidence: parseFloat(row.confidence),
              vendorScores: row.vendor_scores || {},
              evidenceCid: row.evidence_cid,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            },
            reports,
            reportCount: parseInt(row.report_count),
            priorityScore: parseFloat(row.priority_score),
            assignedTo: row.assigned_to,
            assignedAt: row.assigned_at,
            contentPreview,
            userContext: {
              reputation: parseInt(row.user_reputation) || 0,
              violationHistory: parseInt(row.violation_history) || 0,
              accountAge: parseFloat(row.account_age_days) || 0
            }
          };
        })
      );
      
      // Get queue statistics
      const stats = await this.getQueueStats(moderator);
      
      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        stats
      };
    } catch (error) {
      safeLogger.error('Error getting review queue:', error);
      throw new Error('Failed to fetch review queue');
    }
  }

  /**
   * Assign case to moderator
   */
  async assignCase(caseId: number, moderatorId: string): Promise<boolean> {
    try {
      // Check if case is already assigned
      const db = databaseService.getDatabase();
      const existing = await db.execute(sql`
        SELECT id FROM queue_assignments 
        WHERE case_id = $1 AND is_active = true
      `, [caseId]);
      
      if (existing.length > 0) {
        return false; // Already assigned
      }
      
      // Create assignment
      await db.execute(sql`
        INSERT INTO queue_assignments (case_id, assigned_to, assigned_at, is_active)
        VALUES ($1, $2, NOW(), true)
      `, [caseId, moderatorId]);
      
      // Update case status
      await db.execute(sql`
        UPDATE moderation_cases 
        SET status = 'under_review', updated_at = NOW()
        WHERE id = $1
      `, [caseId]);
      
      return true;
    } catch (error) {
      safeLogger.error('Error assigning case:', error);
      return false;
    }
  }

  /**
   * Release case assignment
   */
  async releaseCase(caseId: number, moderatorId: string): Promise<boolean> {
    try {
      const db = databaseService.getDatabase();
      // Deactivate assignment
      await db.execute(sql`
        UPDATE queue_assignments 
        SET is_active = false, released_at = NOW()
        WHERE case_id = $1 AND assigned_to = $2 AND is_active = true
      `, [caseId, moderatorId]);
      
      // Update case status back to pending
      await db.execute(sql`
        UPDATE moderation_cases 
        SET status = 'pending', updated_at = NOW()
        WHERE id = $1
      `, [caseId]);
      
      return true;
    } catch (error) {
      safeLogger.error('Error releasing case:', error);
      return false;
    }
  }

  /**
   * Get next case for moderator based on their permissions and workload
   */
  async getNextCase(moderator: ModeratorProfile): Promise<QueueItem | null> {
    try {
      // Check daily limit
      const dailyLimit = await this.checkDailyLimit(moderator.id);
      if (!dailyLimit.allowed) {
        return null;
      }
      
      // Get next available case matching moderator permissions
      const query = `
        SELECT mc.*, COUNT(DISTINCT cr.id) as report_count
        FROM moderation_cases mc
        LEFT JOIN content_reports cr ON cr.content_id = mc.content_id AND cr.status = 'open'
        LEFT JOIN queue_assignments qa ON qa.case_id = mc.id AND qa.is_active = true
        WHERE mc.status = 'pending'
          AND qa.id IS NULL
          AND ($1 = '*' OR mc.content_type = ANY($2))
        GROUP BY mc.id
        ORDER BY 
          (mc.risk_score * 0.4) + 
          (COUNT(DISTINCT cr.id) * 0.3) + 
          (CASE WHEN mc.created_at < NOW() - INTERVAL '24 hours' THEN 0.2 ELSE 0 END) DESC
        LIMIT 1
      `;
      
      const contentTypes = moderator.permissions.allowedContentTypes.includes('*') 
        ? ['*'] 
        : moderator.permissions.allowedContentTypes;
      
      const db = databaseService.getDatabase();
      const result = await db.execute(sql`${query}`, [
        contentTypes[0],
        contentTypes
      ]);
      
      if (!result.length) {
        return null;
      }
      
      const row = result[0];
      
      // Auto-assign the case
      const assigned = await this.assignCase(row.id, moderator.id);
      if (!assigned) {
        return null; // Case was taken by another moderator
      }
      
      // Build full queue item
      const reports = await this.getReportsForCase(row.content_id);
      const contentPreview = await this.getContentPreview(row.content_id, row.content_type);
      
      return {
        case: {
          id: row.id,
          contentId: row.content_id,
          contentType: row.content_type,
          userId: row.user_id,
          status: 'in_review',
          riskScore: parseFloat(row.risk_score),
          decision: row.decision,
          reasonCode: row.reason_code,
          confidence: parseFloat(row.confidence),
          vendorScores: row.vendor_scores || {},
          evidenceCid: row.evidence_cid,
          createdAt: row.created_at,
          updatedAt: new Date()
        },
        reports,
        reportCount: parseInt(row.report_count),
        priorityScore: parseFloat(row.risk_score),
        assignedTo: moderator.id,
        assignedAt: new Date(),
        contentPreview
      };
    } catch (error) {
      safeLogger.error('Error getting next case:', error);
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  private async getQueueStats(moderator: ModeratorProfile): Promise<QueueStats> {
    try {
      const whereConditions = this.buildWhereClause({}, moderator);
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN mc.status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN mc.status = 'under_review' THEN 1 END) as under_review,
          COUNT(CASE WHEN mc.risk_score > 0.7 THEN 1 END) as high_priority,
          AVG(EXTRACT(EPOCH FROM (NOW() - mc.created_at)) / 3600) as avg_wait_hours,
          MIN(mc.created_at) as oldest_case
        FROM moderation_cases mc
        LEFT JOIN content_reports cr ON cr.content_id = mc.content_id AND cr.status = 'open'
        ${whereClause}
      `;
      
      const db = databaseService.getDatabase();
      const result = await db.execute(sql`${query}`);
      const row = result.rows[0];
      
      return {
        total: parseInt(row.total),
        pending: parseInt(row.pending),
        underReview: parseInt(row.under_review),
        highPriority: parseInt(row.high_priority),
        avgWaitTime: parseFloat(row.avg_wait_hours) || 0,
        oldestCase: row.oldest_case
      };
    } catch (error) {
      safeLogger.error('Error getting queue stats:', error);
      return {
        total: 0,
        pending: 0,
        underReview: 0,
        highPriority: 0,
        avgWaitTime: 0,
        oldestCase: null
      };
    }
  }

  /**
   * Build WHERE clause based on filters and moderator permissions
   */
  private buildWhereClause(filters: QueueFilters, moderator: ModeratorProfile): string[] {
    const conditions: string[] = [];
    
    // Moderator content type restrictions
    if (!moderator.permissions.allowedContentTypes.includes('*')) {
      const types = moderator.permissions.allowedContentTypes.map(t => `'${t}'`).join(',');
      conditions.push(`mc.content_type IN (${types})`);
    }
    
    // Status filter
    if (filters.status && filters.status.length > 0) {
      const statuses = filters.status.map(s => `'${s}'`).join(',');
      conditions.push(`mc.status IN (${statuses})`);
    } else {
      // Default to reviewable statuses
      conditions.push(`mc.status IN ('pending', 'under_review', 'quarantined')`);
    }
    
    // Content type filter
    if (filters.contentType && filters.contentType.length > 0) {
      const types = filters.contentType.map(t => `'${t}'`).join(',');
      conditions.push(`mc.content_type IN (${types})`);
    }
    
    // Confidence range
    if (filters.confidence) {
      if (filters.confidence.min !== undefined) {
        conditions.push(`mc.confidence >= ${filters.confidence.min}`);
      }
      if (filters.confidence.max !== undefined) {
        conditions.push(`mc.confidence <= ${filters.confidence.max}`);
      }
    }
    
    // Age filter
    if (filters.ageHours) {
      if (filters.ageHours.min !== undefined) {
        conditions.push(`mc.created_at <= NOW() - INTERVAL '${filters.ageHours.min} hours'`);
      }
      if (filters.ageHours.max !== undefined) {
        conditions.push(`mc.created_at >= NOW() - INTERVAL '${filters.ageHours.max} hours'`);
      }
    }
    
    // Assignment filter
    if (filters.assignedTo) {
      if (filters.assignedTo === 'unassigned') {
        conditions.push(`qa.id IS NULL`);
      } else {
        conditions.push(`qa.assigned_to = '${filters.assignedTo}'`);
      }
    }
    
    return conditions;
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderClause(sort: QueueSortOptions): string {
    const fieldMap: Record<string, string> = {
      'created_at': 'mc.created_at',
      'risk_score': 'mc.risk_score',
      'confidence': 'mc.confidence',
      'report_count': 'report_count',
      'priority_score': 'priority_score'
    };
    
    const field = fieldMap[sort.field] || 'mc.created_at';
    return `ORDER BY ${field} ${sort.direction.toUpperCase()}`;
  }

  async getReportsForCase(contentId: string): Promise<any[]> {
    try {
      const db = databaseService.getDatabase();
      const result = await db
        .select()
        .from(schema.contentReports)
        .where(eq(schema.contentReports.contentId, contentId));
      
      return result;
    } catch (error) {
      safeLogger.error('Error getting reports for case:', error);
      return [];
    }
  }

  async getContentPreview(contentId: string, contentType: string): Promise<any> {
    try {
      // This is a simplified implementation - in reality, you'd fetch the actual content
      return {
        id: contentId,
        type: contentType,
        preview: 'Content preview not available'
      };
    } catch (error) {
      safeLogger.error('Error getting content preview:', error);
      return null;
    }
  }



  async checkDailyLimit(moderatorId: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const db = databaseService.getDatabase();
      // Check how many cases this moderator has completed today
      const result = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM moderation_cases 
        WHERE moderator_id = $1 
          AND status IN ('approved', 'rejected')
          AND updated_at > NOW() - INTERVAL '1 day'
      `, [moderatorId]);
      
      const completedToday = parseInt(result[0].count);
      const dailyLimit = 100; // Example limit
      
      return {
        allowed: completedToday < dailyLimit,
        remaining: Math.max(0, dailyLimit - completedToday)
      };
    } catch (error) {
      safeLogger.error('Error checking daily limit:', error);
      return { allowed: true, remaining: 100 };
    }
  }

  async updateCase(caseId: number, updates: any): Promise<boolean> {
    try {
      const db = databaseService.getDatabase();
      const result = await db
        .update(schema.moderationCases)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(schema.moderationCases.id, caseId))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      safeLogger.error('Error updating case:', error);
      return false;
    }
  }
}

export const reviewQueueService = ReviewQueueService.getInstance();
