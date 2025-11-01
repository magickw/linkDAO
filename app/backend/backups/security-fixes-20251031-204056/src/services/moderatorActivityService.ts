import { databaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { RedisService } from './redisService';
import { safeLogger } from '../utils/safeLogger';
import { ModeratorProfile } from './moderatorAuthService';
import { safeLogger } from '../utils/safeLogger';

const redisService = new RedisService();

export interface ActivityMetrics {
  casesReviewed: number;
  avgDecisionTime: number;
  accuracyScore: number;
  appealRate: number;
  overturnRate: number;
  productivityScore: number;
  qualityScore: number;
  timeActive: number;
  peakHours: string[];
}

export interface PerformanceReport {
  moderatorId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: ActivityMetrics;
  trends: {
    casesReviewedTrend: number;
    accuracyTrend: number;
    speedTrend: number;
  };
  comparisons: {
    teamAverage: ActivityMetrics;
    rankInTeam: number;
    totalModerators: number;
  };
  recommendations: string[];
}

export interface ActivityLog {
  id: string;
  moderatorId: string;
  action: string;
  details: Record<string, any>;
  duration?: number;
  timestamp: Date;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ModeratorActivityService {
  private static instance: ModeratorActivityService;
  private activeSessions = new Map<string, { startTime: Date; lastActivity: Date }>();

  public static getInstance(): ModeratorActivityService {
    if (!ModeratorActivityService.instance) {
      ModeratorActivityService.instance = new ModeratorActivityService();
    }
    return ModeratorActivityService.instance;
  }

  /**
   * Log moderator activity
   */
  async logActivity(
    moderatorId: string,
    action: string,
    details: Record<string, any> = {},
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const activityLog: ActivityLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        moderatorId,
        action,
        details,
        timestamp: new Date(),
        sessionId,
        ipAddress,
        userAgent
      };

      // Store in database
      await databaseService.query(`
        INSERT INTO moderator_activity_logs (
          id, moderator_id, action, details, timestamp, session_id, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        activityLog.id,
        activityLog.moderatorId,
        activityLog.action,
        JSON.stringify(activityLog.details),
        activityLog.timestamp,
        activityLog.sessionId,
        activityLog.ipAddress,
        activityLog.userAgent
      ]);

      // Update session tracking
      this.updateSessionActivity(sessionId);

      // Update real-time metrics in Redis
      await this.updateRealTimeMetrics(moderatorId, action, details);

    } catch (error) {
      safeLogger.error('Error logging moderator activity:', error);
    }
  }

  /**
   * Start moderator session
   */
  async startSession(moderatorId: string, sessionId: string): Promise<void> {
    const now = new Date();
    this.activeSessions.set(sessionId, {
      startTime: now,
      lastActivity: now
    });

    await this.logActivity(moderatorId, 'session_start', {}, sessionId);
  }

  /**
   * End moderator session
   */
  async endSession(moderatorId: string, sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      const duration = Date.now() - session.startTime.getTime();
      await this.logActivity(moderatorId, 'session_end', { duration }, sessionId);
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Track case review start
   */
  async trackCaseReviewStart(
    moderatorId: string,
    caseId: number,
    sessionId: string
  ): Promise<void> {
    const cacheKey = `case_review:${moderatorId}:${caseId}`;
    await redisService.set(cacheKey, Date.now().toString(), 3600); // 1 hour TTL

    await this.logActivity(moderatorId, 'case_review_start', { caseId }, sessionId);
  }

  /**
   * Track case review completion
   */
  async trackCaseReviewComplete(
    moderatorId: string,
    caseId: number,
    decision: string,
    sessionId: string
  ): Promise<void> {
    const cacheKey = `case_review:${moderatorId}:${caseId}`;
    const startTimeStr = await redisService.get(cacheKey);
    
    let duration = 0;
    if (startTimeStr) {
      duration = Date.now() - parseInt(startTimeStr);
      await redisService.del(cacheKey);
    }

    await this.logActivity(moderatorId, 'case_review_complete', {
      caseId,
      decision,
      duration
    }, sessionId);

    // Update daily metrics
    await this.updateDailyMetrics(moderatorId, duration);
  }

  /**
   * Get performance metrics for moderator
   */
  async getPerformanceMetrics(
    moderatorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ActivityMetrics> {
    try {
      const result = await databaseService.query(`
        SELECT 
          COUNT(DISTINCT ma.id) as cases_reviewed,
          AVG(CASE WHEN mal.details->>'duration' IS NOT NULL 
              THEN (mal.details->>'duration')::bigint 
              ELSE NULL END) / 1000 as avg_decision_time_sec,
          COUNT(CASE WHEN appeal.jury_decision = 'uphold' OR appeal.jury_decision IS NULL THEN 1 END)::float / 
            NULLIF(COUNT(DISTINCT ma.id), 0) as accuracy_score,
          COUNT(DISTINCT appeal.id)::float / NULLIF(COUNT(DISTINCT ma.id), 0) as appeal_rate,
          COUNT(CASE WHEN appeal.jury_decision = 'overturn' THEN 1 END)::float / 
            NULLIF(COUNT(DISTINCT appeal.id), 0) as overturn_rate,
          SUM(CASE WHEN mal.action = 'session_end' 
              THEN (mal.details->>'duration')::bigint 
              ELSE 0 END) / 1000 / 3600 as time_active_hours
        FROM moderation_actions ma
        LEFT JOIN moderation_cases mc ON ma.content_id = mc.content_id
        LEFT JOIN moderation_appeals appeal ON appeal.case_id = mc.id
        LEFT JOIN moderator_activity_logs mal ON mal.moderator_id = ma.applied_by 
          AND mal.action = 'case_review_complete'
          AND (mal.details->>'caseId')::int = mc.id
        WHERE ma.applied_by = $1 
          AND ma.created_at >= $2 
          AND ma.created_at <= $3
        GROUP BY ma.applied_by
      `, [moderatorId, startDate, endDate]);

      if (!result.rows.length) {
        return this.getEmptyMetrics();
      }

      const row = result.rows[0];
      const casesReviewed = parseInt(row.cases_reviewed) || 0;
      const avgDecisionTime = parseFloat(row.avg_decision_time_sec) || 0;
      const accuracyScore = parseFloat(row.accuracy_score) || 0;
      const appealRate = parseFloat(row.appeal_rate) || 0;
      const overturnRate = parseFloat(row.overturn_rate) || 0;
      const timeActive = parseFloat(row.time_active_hours) || 0;

      // Calculate composite scores
      const productivityScore = this.calculateProductivityScore(casesReviewed, timeActive, avgDecisionTime);
      const qualityScore = this.calculateQualityScore(accuracyScore, appealRate, overturnRate);

      // Get peak hours
      const peakHours = await this.getPeakHours(moderatorId, startDate, endDate);

      return {
        casesReviewed,
        avgDecisionTime,
        accuracyScore,
        appealRate,
        overturnRate,
        productivityScore,
        qualityScore,
        timeActive,
        peakHours
      };
    } catch (error) {
      safeLogger.error('Error getting performance metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    moderatorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceReport> {
    try {
      // Get moderator metrics
      const metrics = await this.getPerformanceMetrics(moderatorId, startDate, endDate);

      // Get trends (compare with previous period)
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = startDate;
      const prevMetrics = await this.getPerformanceMetrics(moderatorId, prevStartDate, prevEndDate);

      const trends = {
        casesReviewedTrend: this.calculateTrend(metrics.casesReviewed, prevMetrics.casesReviewed),
        accuracyTrend: this.calculateTrend(metrics.accuracyScore, prevMetrics.accuracyScore),
        speedTrend: this.calculateTrend(prevMetrics.avgDecisionTime, metrics.avgDecisionTime) // Inverted for speed
      };

      // Get team comparisons
      const teamStats = await this.getTeamAverages(startDate, endDate);
      const moderatorRank = await this.getModeratorRank(moderatorId, startDate, endDate);

      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, trends, teamStats.average);

      return {
        moderatorId,
        period: { start: startDate, end: endDate },
        metrics,
        trends,
        comparisons: {
          teamAverage: teamStats.average,
          rankInTeam: moderatorRank.rank,
          totalModerators: moderatorRank.total
        },
        recommendations
      };
    } catch (error) {
      safeLogger.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  async getRealTimeDashboard(moderatorId: string): Promise<{
    todayStats: {
      casesReviewed: number;
      avgDecisionTime: number;
      currentStreak: number;
    };
    currentSession: {
      startTime: Date | null;
      casesInSession: number;
      timeActive: number;
    };
    recentActivity: ActivityLog[];
    alerts: string[];
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's stats
      const todayMetrics = await this.getPerformanceMetrics(moderatorId, today, tomorrow);

      // Get current session info
      const sessionInfo = await this.getCurrentSessionInfo(moderatorId);

      // Get recent activity
      const recentActivity = await this.getRecentActivity(moderatorId, 10);

      // Check for alerts
      const alerts = await this.checkAlerts(moderatorId, todayMetrics);

      return {
        todayStats: {
          casesReviewed: todayMetrics.casesReviewed,
          avgDecisionTime: todayMetrics.avgDecisionTime,
          currentStreak: await this.getCurrentStreak(moderatorId)
        },
        currentSession: sessionInfo,
        recentActivity,
        alerts
      };
    } catch (error) {
      safeLogger.error('Error getting real-time dashboard:', error);
      throw error;
    }
  }

  /**
   * Update session activity timestamp
   */
  private updateSessionActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Update real-time metrics in Redis
   */
  private async updateRealTimeMetrics(
    moderatorId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const metricsKey = `moderator:metrics:${moderatorId}:${today}`;

      if (action === 'case_review_complete') {
        await redisService.incr(`${metricsKey}:cases`);
        
        if (details.duration) {
          // Update rolling average decision time
          const avgKey = `${metricsKey}:avg_time`;
          const currentAvg = await redisService.get(avgKey);
          const currentCount = await redisService.get(`${metricsKey}:cases`);
          
          if (currentAvg && currentCount) {
            const newAvg = ((parseFloat(currentAvg) * (parseInt(currentCount) - 1)) + details.duration) / parseInt(currentCount);
            await redisService.set(avgKey, newAvg.toString());
          } else {
            await redisService.set(avgKey, details.duration.toString());
          }
        }
      }

      // Set expiry for metrics (7 days)
      await redisService.expire(metricsKey, 7 * 24 * 60 * 60);
    } catch (error) {
      safeLogger.error('Error updating real-time metrics:', error);
    }
  }

  /**
   * Update daily aggregated metrics
   */
  private async updateDailyMetrics(moderatorId: string, decisionTime: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await databaseService.query(`
        INSERT INTO moderator_daily_metrics (
          moderator_id, date, cases_reviewed, total_decision_time, updated_at
        ) VALUES ($1, $2, 1, $3, NOW())
        ON CONFLICT (moderator_id, date) 
        DO UPDATE SET 
          cases_reviewed = moderator_daily_metrics.cases_reviewed + 1,
          total_decision_time = moderator_daily_metrics.total_decision_time + $3,
          updated_at = NOW()
      `, [moderatorId, today, decisionTime]);
    } catch (error) {
      safeLogger.error('Error updating daily metrics:', error);
    }
  }

  /**
   * Get peak activity hours for moderator
   */
  private async getPeakHours(
    moderatorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    try {
      const result = await databaseService.query(`
        SELECT 
          EXTRACT(HOUR FROM timestamp) as hour,
          COUNT(*) as activity_count
        FROM moderator_activity_logs
        WHERE moderator_id = $1 
          AND timestamp >= $2 
          AND timestamp <= $3
          AND action = 'case_review_complete'
        GROUP BY EXTRACT(HOUR FROM timestamp)
        ORDER BY activity_count DESC
        LIMIT 3
      `, [moderatorId, startDate, endDate]);

      return result.rows.map(row => `${row.hour}:00`);
    } catch (error) {
      safeLogger.error('Error getting peak hours:', error);
      return [];
    }
  }

  /**
   * Calculate productivity score (0-100)
   */
  private calculateProductivityScore(
    casesReviewed: number,
    timeActive: number,
    avgDecisionTime: number
  ): number {
    if (timeActive === 0) return 0;
    
    const casesPerHour = casesReviewed / timeActive;
    const speedScore = Math.min(100, (casesPerHour / 10) * 100); // 10 cases/hour = 100%
    const efficiencyScore = avgDecisionTime > 0 ? Math.min(100, (300 / avgDecisionTime) * 100) : 0; // 5 min = 100%
    
    return Math.round((speedScore + efficiencyScore) / 2);
  }

  /**
   * Calculate quality score (0-100)
   */
  private calculateQualityScore(
    accuracyScore: number,
    appealRate: number,
    overturnRate: number
  ): number {
    const accuracyPoints = accuracyScore * 100;
    const appealPenalty = appealRate * 30; // High appeal rate reduces quality
    const overturnPenalty = overturnRate * 40; // Overturns are worse than appeals
    
    return Math.max(0, Math.round(accuracyPoints - appealPenalty - overturnPenalty));
  }

  /**
   * Calculate trend percentage
   */
  private calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Get team averages for comparison
   */
  private async getTeamAverages(startDate: Date, endDate: Date): Promise<{ average: ActivityMetrics }> {
    try {
      const result = await databaseService.query(`
        SELECT 
          AVG(cases_reviewed) as avg_cases,
          AVG(avg_decision_time) as avg_time,
          AVG(accuracy_score) as avg_accuracy,
          AVG(appeal_rate) as avg_appeals,
          AVG(overturn_rate) as avg_overturns,
          AVG(time_active) as avg_active_time
        FROM (
          SELECT 
            ma.applied_by,
            COUNT(DISTINCT ma.id) as cases_reviewed,
            AVG(CASE WHEN mal.details->>'duration' IS NOT NULL 
                THEN (mal.details->>'duration')::bigint 
                ELSE NULL END) / 1000 as avg_decision_time,
            COUNT(CASE WHEN appeal.jury_decision = 'uphold' OR appeal.jury_decision IS NULL THEN 1 END)::float / 
              NULLIF(COUNT(DISTINCT ma.id), 0) as accuracy_score,
            COUNT(DISTINCT appeal.id)::float / NULLIF(COUNT(DISTINCT ma.id), 0) as appeal_rate,
            COUNT(CASE WHEN appeal.jury_decision = 'overturn' THEN 1 END)::float / 
              NULLIF(COUNT(DISTINCT appeal.id), 0) as overturn_rate,
            SUM(CASE WHEN mal.action = 'session_end' 
                THEN (mal.details->>'duration')::bigint 
                ELSE 0 END) / 1000 / 3600 as time_active
          FROM moderation_actions ma
          LEFT JOIN moderation_cases mc ON ma.content_id = mc.content_id
          LEFT JOIN moderation_appeals appeal ON appeal.case_id = mc.id
          LEFT JOIN moderator_activity_logs mal ON mal.moderator_id = ma.applied_by
          WHERE ma.created_at >= $1 AND ma.created_at <= $2
          GROUP BY ma.applied_by
        ) team_stats
      `, [startDate, endDate]);

      const row = result.rows[0];
      return {
        average: {
          casesReviewed: parseFloat(row.avg_cases) || 0,
          avgDecisionTime: parseFloat(row.avg_time) || 0,
          accuracyScore: parseFloat(row.avg_accuracy) || 0,
          appealRate: parseFloat(row.avg_appeals) || 0,
          overturnRate: parseFloat(row.avg_overturns) || 0,
          productivityScore: 0, // Calculated separately
          qualityScore: 0, // Calculated separately
          timeActive: parseFloat(row.avg_active_time) || 0,
          peakHours: []
        }
      };
    } catch (error) {
      safeLogger.error('Error getting team averages:', error);
      return { average: this.getEmptyMetrics() };
    }
  }

  /**
   * Get moderator rank within team
   */
  private async getModeratorRank(
    moderatorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ rank: number; total: number }> {
    try {
      const result = await databaseService.query(`
        WITH moderator_scores AS (
          SELECT 
            ma.applied_by,
            COUNT(DISTINCT ma.id) as cases_reviewed,
            COUNT(CASE WHEN appeal.jury_decision = 'uphold' OR appeal.jury_decision IS NULL THEN 1 END)::float / 
              NULLIF(COUNT(DISTINCT ma.id), 0) as accuracy_score
          FROM moderation_actions ma
          LEFT JOIN moderation_cases mc ON ma.content_id = mc.content_id
          LEFT JOIN moderation_appeals appeal ON appeal.case_id = mc.id
          WHERE ma.created_at >= $1 AND ma.created_at <= $2
          GROUP BY ma.applied_by
        ),
        ranked_moderators AS (
          SELECT 
            applied_by,
            RANK() OVER (ORDER BY (cases_reviewed * accuracy_score) DESC) as rank
          FROM moderator_scores
        )
        SELECT 
          COALESCE(rm.rank, (SELECT COUNT(*) + 1 FROM moderator_scores)) as rank,
          (SELECT COUNT(*) FROM moderator_scores) as total
        FROM ranked_moderators rm
        WHERE rm.applied_by = $3
        UNION ALL
        SELECT 
          (SELECT COUNT(*) + 1 FROM moderator_scores) as rank,
          (SELECT COUNT(*) FROM moderator_scores) as total
        WHERE NOT EXISTS (SELECT 1 FROM ranked_moderators WHERE applied_by = $3)
        LIMIT 1
      `, [startDate, endDate, moderatorId]);

      const row = result.rows[0];
      return {
        rank: parseInt(row.rank) || 1,
        total: parseInt(row.total) || 1
      };
    } catch (error) {
      safeLogger.error('Error getting moderator rank:', error);
      return { rank: 1, total: 1 };
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    metrics: ActivityMetrics,
    trends: any,
    teamAverage: ActivityMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.accuracyScore < 0.8) {
      recommendations.push('Focus on improving decision accuracy through additional training');
    }

    if (metrics.avgDecisionTime > teamAverage.avgDecisionTime * 1.5) {
      recommendations.push('Work on reducing decision time while maintaining quality');
    }

    if (metrics.appealRate > 0.15) {
      recommendations.push('Review appeal patterns to identify areas for improvement');
    }

    if (trends.casesReviewedTrend < -20) {
      recommendations.push('Consider increasing daily case review volume');
    }

    if (metrics.casesReviewed < teamAverage.casesReviewed * 0.8) {
      recommendations.push('Aim to match team average productivity levels');
    }

    return recommendations;
  }

  /**
   * Get current session information
   */
  private async getCurrentSessionInfo(moderatorId: string): Promise<{
    startTime: Date | null;
    casesInSession: number;
    timeActive: number;
  }> {
    // Implementation would track current session
    return {
      startTime: null,
      casesInSession: 0,
      timeActive: 0
    };
  }

  /**
   * Get recent activity logs
   */
  private async getRecentActivity(moderatorId: string, limit: number): Promise<ActivityLog[]> {
    try {
      const result = await databaseService.query(`
        SELECT * FROM moderator_activity_logs
        WHERE moderator_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `, [moderatorId, limit]);

      return result.rows.map(row => ({
        id: row.id,
        moderatorId: row.moderator_id,
        action: row.action,
        details: row.details,
        timestamp: row.timestamp,
        sessionId: row.session_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent
      }));
    } catch (error) {
      safeLogger.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Check for performance alerts
   */
  private async checkAlerts(moderatorId: string, todayMetrics: ActivityMetrics): Promise<string[]> {
    const alerts: string[] = [];

    if (todayMetrics.accuracyScore < 0.7) {
      alerts.push('Low accuracy score today - review recent decisions');
    }

    if (todayMetrics.avgDecisionTime > 600) { // 10 minutes
      alerts.push('Decision time is above recommended threshold');
    }

    return alerts;
  }

  /**
   * Get current streak of accurate decisions
   */
  private async getCurrentStreak(moderatorId: string): Promise<number> {
    // Implementation would calculate current streak
    return 0;
  }

  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(): ActivityMetrics {
    return {
      casesReviewed: 0,
      avgDecisionTime: 0,
      accuracyScore: 0,
      appealRate: 0,
      overturnRate: 0,
      productivityScore: 0,
      qualityScore: 0,
      timeActive: 0,
      peakHours: []
    };
  }
}

export const moderatorActivityService = ModeratorActivityService.getInstance();