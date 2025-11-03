import { db } from '../db';
import { contentReports, moderationCases, users } from '../db/schema';
import { eq, and, desc, count, sql, gte, lte } from 'drizzle-orm';
import { reputationService } from './reputationService';

interface SubmitReportParams {
  contentId: string;
  contentType: string;
  reporterId: string;
  reason: string;
  details?: string;
  category?: string;
  weight: number;
}

interface ReportStatusInfo {
  hasReported: boolean;
  reportCount: number;
  totalWeight: number;
  status: string;
  canReport: boolean;
}

interface ModerationQueueParams {
  status?: string;
  page: number;
  limit: number;
}

interface ReportAnalytics {
  totalReports: number;
  openReports: number;
  resolvedReports: number;
  dismissedReports: number;
  averageResolutionTime: number;
  topReasons: Array<{ reason: string; count: number }>;
  reportsByDay: Array<{ date: string; count: number }>;
  falsePositiveRate: number;
}

export class ReportService {
  // Configuration constants
  private readonly ESCALATION_THRESHOLD = 3.0; // Weighted threshold for escalation
  private readonly MAX_REPORTS_PER_USER_PER_DAY = 20;
  private readonly REPUTATION_REWARD_ACCURATE = 5;
  private readonly REPUTATION_PENALTY_FALSE = -10;
  private readonly MIN_REPUTATION_FOR_REPORTING = -50;

  async submitReport(params: SubmitReportParams) {
    const { contentId, contentType, reporterId, reason, details, category, weight } = params;

    // Check daily report limit
    const dailyReportCount = await this.getDailyReportCount(reporterId);
    if (dailyReportCount >= this.MAX_REPORTS_PER_USER_PER_DAY) {
      throw new Error('Daily report limit exceeded');
    }

    // Check minimum reputation requirement
    const userReputation = await reputationService.getReputation(reporterId);
    if (userReputation.score < this.MIN_REPUTATION_FOR_REPORTING) {
      throw new Error('Insufficient reputation to submit reports');
    }

    // Insert the report
    const [report] = await db.insert(contentReports).values({
      contentId,
      contentType,
      reporterId,
      reason,
      details,
      category,
      weight: weight.toString(),
      status: 'open'
    }).returning();

    return report;
  }

  async getExistingReport(contentId: string, reporterId: string) {
    const [report] = await db
      .select()
      .from(contentReports)
      .where(and(
        eq(contentReports.contentId, contentId),
        eq(contentReports.reporterId, reporterId)
      ))
      .limit(1);

    return report;
  }

  async getReporterWeight(reporterId: string): Promise<number> {
    const userReputation = await reputationService.getReputation(reporterId);
    
    // Calculate weight based on reputation
    // Base weight is 1.0, modified by reputation
    let weight = 1.0;
    
    if (userReputation.score >= 100) {
      weight = 2.0; // High reputation users get double weight
    } else if (userReputation.score >= 50) {
      weight = 1.5; // Medium reputation users get 1.5x weight
    } else if (userReputation.score < 0) {
      weight = 0.5; // Low reputation users get reduced weight
    }

    // Check for false report history
    const falseReportRate = await this.getFalseReportRate(reporterId);
    if (falseReportRate > 0.5) {
      weight *= 0.5; // Reduce weight for users with high false report rate
    }

    return Math.max(0.1, weight); // Minimum weight of 0.1
  }

  async getFalseReportRate(reporterId: string): Promise<number> {
    const recentReports = await db
      .select({
        total: count(),
        dismissed: sql<number>`COUNT(CASE WHEN status = 'dismissed' THEN 1 END)`
      })
      .from(contentReports)
      .where(and(
        eq(contentReports.reporterId, reporterId),
        gte(contentReports.createdAt, sql`NOW() - INTERVAL '30 days'`)
      ));

    const { total, dismissed } = recentReports[0];
    return total > 0 ? dismissed / total : 0;
  }

  async getDailyReportCount(reporterId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(contentReports)
      .where(and(
        eq(contentReports.reporterId, reporterId),
        gte(contentReports.createdAt, sql`CURRENT_DATE`)
      ));

    return result.count;
  }

  async checkAggregationThreshold(contentId: string): Promise<boolean> {
    const aggregation = await this.aggregateReportsForContent(contentId);
    
    if (aggregation.totalWeight >= this.ESCALATION_THRESHOLD) {
      await this.escalateToModeration(contentId, aggregation);
      return true;
    }
    
    return false;
  }

  async aggregateReportsForContent(contentId: string) {
    const reports = await db
      .select({
        weight: contentReports.weight,
        reason: contentReports.reason
        // Removed category as it doesn't exist in the table
      })
      .from(contentReports)
      .where(and(
        eq(contentReports.contentId, contentId),
        eq(contentReports.status, 'open')
      ));

    const totalWeight = reports.reduce((sum, report) => sum + parseFloat(report.weight), 0);
    const reportCount = reports.length;
    
    // Determine primary reason/category
    const reasonCounts = reports.reduce((acc, report) => {
      acc[report.reason] = (acc[report.reason] || 0) + parseFloat(report.weight);
      return acc;
    }, {} as Record<string, number>);

    const primaryReason = Object.entries(reasonCounts)
      .sort(([,a], [,b]) => {
        // Fix the arithmetic operations by converting to numbers
        const numA = typeof a === 'number' ? a : parseFloat(a as any);
        const numB = typeof b === 'number' ? b : parseFloat(b as any);
        return numB - numA;
      })[0]?.[0] || 'other';

    const escalated = totalWeight >= this.ESCALATION_THRESHOLD;

    return {
      totalWeight,
      reportCount,
      primaryReason,
      escalated,
      reports
    };
  }

  async escalateToModeration(contentId: string, aggregation: any) {
    // Check if already escalated
    const [existingCase] = await db
      .select()
      .from(moderationCases)
      .where(eq(moderationCases.contentId, contentId))
      .limit(1);

    if (existingCase) {
      return existingCase;
    }

    // Create moderation case
    const [moderationCase] = await db.insert(moderationCases).values({
      contentId,
      contentType: 'unknown', // Will be updated by moderation system
      userId: '', // Will be populated by moderation system
      status: 'pending',
      riskScore: aggregation.totalWeight.toString(),
      reasonCode: aggregation.primaryReason,
      confidence: Math.min(aggregation.totalWeight / 5.0, 1.0).toString() // Scale to 0-1
    }).returning();

    // Update all related reports to 'under_review'
    await db
      .update(contentReports)
      .set({ 
        status: 'under_review'
        // Removed updatedAt as it doesn't exist in the table
      })
      .where(and(
        eq(contentReports.contentId, contentId),
        eq(contentReports.status, 'open')
      ));

    return moderationCase;
  }

  async getUserReports(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;

    const reports = await db
      .select({
        id: contentReports.id,
        contentId: contentReports.contentId,
        // Removed contentType as it doesn't exist in the table
        reason: contentReports.reason,
        details: contentReports.details,
        // Removed category as it doesn't exist in the table
        status: contentReports.status,
        weight: contentReports.weight,
        createdAt: contentReports.createdAt
        // Removed updatedAt as it doesn't exist in the table
      })
      .from(contentReports)
      .where(eq(contentReports.reporterId, userId))
      .orderBy(desc(contentReports.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(contentReports)
      .where(eq(contentReports.reporterId, userId));

    return {
      data: reports,
      total: totalResult.count
    };
  }

  async getContentReportStatus(contentId: string, userId?: string): Promise<ReportStatusInfo> {
    // Get user's report if they've reported this content
    let hasReported = false;
    if (userId) {
      const userReport = await this.getExistingReport(contentId, userId);
      hasReported = !!userReport;
    }

    // Get aggregated report info
    const aggregation = await this.aggregateReportsForContent(contentId);
    
    // Check if user can still report (reputation, daily limits, etc.)
    let canReport = true;
    if (userId) {
      const userReputation = await reputationService.getReputation(userId);
      const dailyCount = await this.getDailyReportCount(userId);
      
      canReport = !hasReported && 
                  userReputation.score >= this.MIN_REPUTATION_FOR_REPORTING &&
                  dailyCount < this.MAX_REPORTS_PER_USER_PER_DAY;
    }

    // Determine overall status
    let status = 'clean';
    if (aggregation.escalated) {
      status = 'under_review';
    } else if (aggregation.reportCount > 0) {
      status = 'reported';
    }

    return {
      hasReported,
      reportCount: aggregation.reportCount,
      totalWeight: aggregation.totalWeight,
      status,
      canReport
    };
  }

  async getModerationQueue(params: ModerationQueueParams) {
    const { status, page, limit } = params;
    const offset = (page - 1) * limit;

    let whereCondition = sql`1=1`;
    if (status) {
      whereCondition = eq(contentReports.status, status);
    }

    // Get reports that need moderation (escalated or under review)
    const reports = await db
      .select({
        id: contentReports.id,
        contentId: contentReports.contentId,
        // Removed contentType as it doesn't exist in the table
        reason: contentReports.reason,
        details: contentReports.details,
        // Removed category as it doesn't exist in the table
        status: contentReports.status,
        weight: contentReports.weight,
        createdAt: contentReports.createdAt
        // Removed updatedAt as it doesn't exist in the table
        // Removed reporterHandle and reporterWallet as they need proper joins
      })
      .from(contentReports)
      // Removed leftJoin as it's not needed for now
      .where(and(
        whereCondition,
        sql`${contentReports.status} IN ('under_review', 'open')`
      ))
      .orderBy(desc(contentReports.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(contentReports)
      .where(and(
        whereCondition,
        sql`${contentReports.status} IN ('under_review', 'open')`
      ));

    return {
      data: reports,
      total: totalResult.count
    };
  }

  async updateReportStatus(
    reportId: number, 
    status: string, 
    moderatorId: string, 
    metadata?: { resolution?: string; moderatorNotes?: string }
  ) {
    const [updatedReport] = await db
      .update(contentReports)
      .set({
        status,
        moderatorId,
        resolution: metadata?.resolution,
        moderatorNotes: metadata?.moderatorNotes,
        updatedAt: sql`NOW()`
      })
      .where(eq(contentReports.id, reportId))
      .returning();

    return updatedReport;
  }

  async updateReporterReputation(reporterId: string, isAccurate: boolean) {
    const change = isAccurate ? this.REPUTATION_REWARD_ACCURATE : this.REPUTATION_PENALTY_FALSE;
    const reason = isAccurate ? 'Accurate content report' : 'False content report';
    
    await reputationService.updateReputation(
      reporterId,
      {
        eventType: isAccurate ? 'helpful_report' : 'false_report',
        metadata: {
          change,
          reason,
          type: 'content_report'
        }
      }
    );
  }

  async getReportAnalytics(): Promise<ReportAnalytics> {
    // Get basic counts
    const [counts] = await db
      .select({
        total: count(),
        open: sql<number>`COUNT(CASE WHEN status = 'open' THEN 1 END)`,
        resolved: sql<number>`COUNT(CASE WHEN status = 'resolved' THEN 1 END)`,
        dismissed: sql<number>`COUNT(CASE WHEN status = 'dismissed' THEN 1 END)`,
        underReview: sql<number>`COUNT(CASE WHEN status = 'under_review' THEN 1 END)`
      })
      .from(contentReports);

    // Get average resolution time
    const [resolutionTime] = await db
      .select({
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)`
      })
      .from(contentReports)
      .where(sql`status IN ('resolved', 'dismissed')`);

    // Get top reasons
    const topReasons = await db
      .select({
        reason: contentReports.reason,
        count: count()
      })
      .from(contentReports)
      .groupBy(contentReports.reason)
      .orderBy(desc(count()))
      .limit(10);

    // Get reports by day (last 30 days)
    const reportsByDay = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        count: count()
      })
      .from(contentReports)
      .where(gte(contentReports.createdAt, sql`NOW() - INTERVAL '30 days'`))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    // Calculate false positive rate
    const falsePositiveRate = counts.total > 0 ? counts.dismissed / (counts.resolved + counts.dismissed) : 0;

    return {
      totalReports: counts.total,
      openReports: counts.open + counts.underReview,
      resolvedReports: counts.resolved,
      dismissedReports: counts.dismissed,
      averageResolutionTime: resolutionTime.avgTime || 0,
      topReasons,
      reportsByDay,
      falsePositiveRate
    };
  }

  // Anti-abuse measures
  async detectAbusePatterns(reporterId: string): Promise<boolean> {
    // Check for rapid-fire reporting
    const recentReports = await db
      .select({ count: count() })
      .from(contentReports)
      .where(and(
        eq(contentReports.reporterId, reporterId),
        gte(contentReports.createdAt, sql`NOW() - INTERVAL '1 hour'`)
      ));

    if (recentReports[0].count > 5) {
      return true; // Potential abuse
    }

    // Check for targeting specific users
    const targetedReports = await db
      .select({
        contentId: contentReports.contentId,
        count: count()
      })
      .from(contentReports)
      .where(and(
        eq(contentReports.reporterId, reporterId),
        gte(contentReports.createdAt, sql`NOW() - INTERVAL '24 hours'`)
      ))
      .groupBy(contentReports.contentId)
      .having(sql`COUNT(*) > 3`);

    return targetedReports.length > 0;
  }

  async applyAbuseProtection(reporterId: string) {
    // Temporarily reduce reporting weight
    await db
      .update(contentReports)
      .set({ weight: '0.1' })
      .where(and(
        eq(contentReports.reporterId, reporterId),
        gte(contentReports.createdAt, sql`NOW() - INTERVAL '24 hours'`)
      ));

    // Apply reputation penalty
    await this.updateReporterReputation(reporterId, false);
  }
}

export const reportService = new ReportService();
