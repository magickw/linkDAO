import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { databaseService } from './databaseService';
import { redisService } from './redisService';
import AuditLoggingService from './auditLoggingService';

const auditLoggingService = new AuditLoggingService();
import { sql } from 'drizzle-orm';

export interface ModeratorPermissions {
  canReviewContent: boolean;
  canMakeDecisions: boolean;
  canAccessBulkActions: boolean;
  canViewAnalytics: boolean;
  canManagePolicies: boolean;
  maxCasesPerDay?: number;
  allowedContentTypes: string[];
  allowedSeverityLevels: string[];
}

export interface ModeratorProfile {
  id: string;
  userId: string;
  walletAddress: string;
  role: 'junior' | 'senior' | 'lead' | 'admin';
  permissions: ModeratorPermissions;
  isActive: boolean;
  totalCasesReviewed: number;
  accuracyScore: number;
  avgDecisionTime: number;
  specializations: string[];
  createdAt: Date;
  lastActiveAt: Date;
}

export class ModeratorAuthService {
  private static instance: ModeratorAuthService;
  private moderatorCache = new Map<string, ModeratorProfile>();

  public static getInstance(): ModeratorAuthService {
    if (!ModeratorAuthService.instance) {
      ModeratorAuthService.instance = new ModeratorAuthService();
    }
    return ModeratorAuthService.instance;
  }

  /**
   * Check if user is a moderator and get their profile
   */
  async getModeratorProfile(userId: string): Promise<ModeratorProfile | null> {
    try {
      // Check cache first
      const cached = this.moderatorCache.get(userId);
      if (cached) {
        return cached;
      }

      // Query database for moderator profile
      const db = databaseService.getDatabase();
      const result = await db.execute(sql`
        SELECT 
          m.*,
          u.wallet_address,
          COALESCE(stats.total_cases, 0) as total_cases_reviewed,
          COALESCE(stats.accuracy_score, 0) as accuracy_score,
          COALESCE(stats.avg_decision_time, 0) as avg_decision_time
        FROM moderators m
        JOIN users u ON m.user_id = u.id
        LEFT JOIN moderator_stats stats ON m.id = stats.moderator_id
        WHERE m.user_id = ${userId} AND m.is_active = true
      `);

      if (!result.length) {
        return null;
      }

      const row = result[0];
      const profile: ModeratorProfile = {
        id: row.id,
        userId: row.user_id,
        walletAddress: row.wallet_address,
        role: row.role,
        permissions: JSON.parse(row.permissions || '{}'),
        isActive: row.is_active,
        totalCasesReviewed: parseInt(row.total_cases_reviewed),
        accuracyScore: parseFloat(row.accuracy_score),
        avgDecisionTime: parseFloat(row.avg_decision_time),
        specializations: JSON.parse(row.specializations || '[]'),
        createdAt: row.created_at,
        lastActiveAt: row.last_active_at
      };

      // Cache for 5 minutes
      this.moderatorCache.set(userId, profile);
      setTimeout(() => this.moderatorCache.delete(userId), 5 * 60 * 1000);

      return profile;
    } catch (error) {
      safeLogger.error('Error getting moderator profile:', error);
      return null;
    }
  }

  /**
   * Middleware to require moderator authentication
   */
  requireModerator = () => {
    return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const moderatorProfile = await this.getModeratorProfile(req.user.userId!);
      if (!moderatorProfile) {
        return res.status(403).json({ 
          error: 'Moderator access required',
          code: 'NOT_MODERATOR'
        });
      }

      // Add moderator profile to request
      (req as any).moderator = moderatorProfile;

      // Update last active timestamp
      await this.updateLastActive(moderatorProfile.id);

      next();
    };
  };

  /**
   * Middleware to require specific moderator permission
   */
  requireModeratorPermission = (permission: keyof ModeratorPermissions) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      if (!moderator) {
        return res.status(403).json({ error: 'Moderator authentication required' });
      }

      if (!moderator.permissions[permission]) {
        return res.status(403).json({ 
          error: `Permission required: ${permission}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    };
  };

  /**
   * Check if moderator can handle specific content type
   */
  canHandleContentType(moderator: ModeratorProfile, contentType: string): boolean {
    return moderator.permissions.allowedContentTypes.includes(contentType) || 
           moderator.permissions.allowedContentTypes.includes('*');
  }

  /**
   * Check if moderator can handle specific severity level
   */
  canHandleSeverity(moderator: ModeratorProfile, severity: string): boolean {
    return moderator.permissions.allowedSeverityLevels.includes(severity) ||
           moderator.permissions.allowedSeverityLevels.includes('*');
  }

  /**
   * Check daily case limit
   */
  async checkDailyLimit(moderatorId: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const moderator = await this.getModeratorProfile(moderatorId);
      if (!moderator?.permissions.maxCasesPerDay) {
        return { allowed: true, remaining: -1 }; // No limit
      }

      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `moderator:daily:${moderatorId}:${today}`;
      
      const currentCount = await redisService.get(cacheKey);
      const count = currentCount ? parseInt(currentCount) : 0;
      
      const remaining = moderator.permissions.maxCasesPerDay - count;
      
      return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining)
      };
    } catch (error) {
      safeLogger.error('Error checking daily limit:', error);
      return { allowed: true, remaining: -1 };
    }
  }

  /**
   * Increment daily case count
   */
  async incrementDailyCount(moderatorId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `moderator:daily:${moderatorId}:${today}`;
      
      const currentCount = await redisService.get(cacheKey);
      const newCount = (currentCount ? parseInt(currentCount) : 0) + 1;
      
      // Set with 24 hour expiration
      await redisService.setex(cacheKey, 24 * 60 * 60, newCount.toString());
    } catch (error) {
      safeLogger.error('Error incrementing daily count:', error);
    }
  }

  /**
   * Update moderator's last active timestamp
   */
  private async updateLastActive(moderatorId: string): Promise<void> {
    try {
      const db = databaseService.getDatabase();
      await db.execute(sql`
        UPDATE moderators 
        SET last_active_at = NOW() 
        WHERE id = ${moderatorId}
      `);
    } catch (error) {
      safeLogger.error('Error updating last active:', error);
    }
  }

  /**
   * Log moderator activity
   */
  async logActivity(
    moderatorId: string, 
    action: string, 
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    try {
      await auditLoggingService.logModerationAction({
        actionType: action,
        actorId: moderatorId,
        actorType: 'moderator',
        newState: details,
        reasoning: ipAddress
      });
    } catch (error) {
      safeLogger.error('Error logging moderator activity:', error);
    }
  }

  /**
   * Get moderator performance metrics
   */
  async getPerformanceMetrics(
    moderatorId: string,
    days: number = 30
  ): Promise<{
    casesReviewed: number;
    avgDecisionTime: number;
    accuracyScore: number;
    appealRate: number;
    overturnRate: number;
  }> {
    try {
      // Use the database instance directly since query method doesn't exist
      const db = databaseService.getDatabase();
      const result = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT ma.id) as cases_reviewed,
          AVG(EXTRACT(EPOCH FROM (ma.created_at - mc.created_at))) as avg_decision_time,
          COUNT(CASE WHEN appeal.jury_decision = 'uphold' THEN 1 END)::float / 
            NULLIF(COUNT(appeal.id), 0) as accuracy_score,
          COUNT(appeal.id)::float / NULLIF(COUNT(DISTINCT ma.id), 0) as appeal_rate,
          COUNT(CASE WHEN appeal.jury_decision = 'overturn' THEN 1 END)::float / 
            NULLIF(COUNT(appeal.id), 0) as overturn_rate
        FROM moderation_actions ma
        JOIN moderation_cases mc ON ma.content_id = mc.content_id
        LEFT JOIN moderation_appeals appeal ON appeal.case_id = mc.id
        WHERE ma.applied_by = ${moderatorId} 
          AND ma.created_at >= NOW() - INTERVAL '${days} days'
      `);

      const row = result[0];
      return {
        casesReviewed: parseInt(row.cases_reviewed) || 0,
        avgDecisionTime: parseFloat(row.avg_decision_time) || 0,
        accuracyScore: parseFloat(row.accuracy_score) || 0,
        appealRate: parseFloat(row.appeal_rate) || 0,
        overturnRate: parseFloat(row.overturn_rate) || 0
      };
    } catch (error) {
      safeLogger.error('Error getting performance metrics:', error);
      return {
        casesReviewed: 0,
        avgDecisionTime: 0,
        accuracyScore: 0,
        appealRate: 0,
        overturnRate: 0
      };
    }
  }

  /**
   * Create default moderator permissions based on role
   */
  static getDefaultPermissions(role: 'junior' | 'senior' | 'lead' | 'admin'): ModeratorPermissions {
    const basePermissions: ModeratorPermissions = {
      canReviewContent: true,
      canMakeDecisions: true,
      canAccessBulkActions: false,
      canViewAnalytics: false,
      canManagePolicies: false,
      allowedContentTypes: ['post', 'comment'],
      allowedSeverityLevels: ['low', 'medium']
    };

    switch (role) {
      case 'junior':
        return {
          ...basePermissions,
          maxCasesPerDay: 50,
          allowedSeverityLevels: ['low']
        };
      
      case 'senior':
        return {
          ...basePermissions,
          maxCasesPerDay: 100,
          allowedContentTypes: ['post', 'comment', 'listing', 'image'],
          allowedSeverityLevels: ['low', 'medium', 'high']
        };
      
      case 'lead':
        return {
          ...basePermissions,
          canAccessBulkActions: true,
          canViewAnalytics: true,
          maxCasesPerDay: 200,
          allowedContentTypes: ['*'],
          allowedSeverityLevels: ['*']
        };
      
      case 'admin':
        return {
          canReviewContent: true,
          canMakeDecisions: true,
          canAccessBulkActions: true,
          canViewAnalytics: true,
          canManagePolicies: true,
          allowedContentTypes: ['*'],
          allowedSeverityLevels: ['*']
        };
      
      default:
        return basePermissions;
    }
  }
}

export const moderatorAuthService = ModeratorAuthService.getInstance();
