import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { sql } from 'drizzle-orm';
import { Redis } from 'ioredis';

export interface CohortData {
  cohortPeriod: string;
  cohortSize: number;
  retentionRates: number[];
  periods: string[];
  userIds: string[];
  acquisitionChannel?: string;
  averageLifetimeValue: number;
  churnRate: number;
}

export interface CohortAnalysis {
  cohorts: CohortData[];
  overallRetentionRate: number;
  averageCohortSize: number;
  bestPerformingCohort: CohortData;
  worstPerformingCohort: CohortData;
  retentionTrends: RetentionTrend[];
  churnAnalysis: ChurnAnalysis;
}

export interface RetentionTrend {
  period: string;
  retentionRate: number;
  cohortCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ChurnAnalysis {
  overallChurnRate: number;
  churnByPeriod: Array<{ period: string; churnRate: number; usersLost: number }>;
  churnReasons: Array<{ reason: string; percentage: number }>;
  riskFactors: Array<{ factor: string; impact: number }>;
}

export interface CohortComparison {
  cohortA: CohortData;
  cohortB: CohortData;
  retentionDifference: number[];
  statisticalSignificance: boolean;
  insights: string[];
}

export interface UserRetentionMetrics {
  userId: string;
  cohortPeriod: string;
  daysSinceSignup: number;
  isActive: boolean;
  lastActivityDate: Date;
  lifetimeValue: number;
  engagementScore: number;
  churnProbability: number;
}

export class CohortAnalysisService {
  private redis: Redis;
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Generate cohort analysis for a given time period
   */
  async generateCohortAnalysis(
    startDate: Date,
    endDate: Date,
    cohortType: 'daily' | 'weekly' | 'monthly' = 'monthly',
    retentionPeriods: number = 12
  ): Promise<CohortAnalysis> {
    try {
      const cacheKey = `cohort:analysis:${startDate.toISOString()}:${endDate.toISOString()}:${cohortType}:${retentionPeriods}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Generate cohorts based on user signup dates
      const cohorts = await this.generateCohorts(startDate, endDate, cohortType, retentionPeriods);
      
      // Calculate overall metrics
      const overallRetentionRate = this.calculateOverallRetentionRate(cohorts);
      const averageCohortSize = cohorts.reduce((sum, c) => sum + c.cohortSize, 0) / cohorts.length;
      
      // Find best and worst performing cohorts
      const bestPerformingCohort = cohorts.reduce((best, current) => 
        this.getCohortPerformanceScore(current) > this.getCohortPerformanceScore(best) ? current : best
      );
      
      const worstPerformingCohort = cohorts.reduce((worst, current) => 
        this.getCohortPerformanceScore(current) < this.getCohortPerformanceScore(worst) ? current : worst
      );

      // Generate retention trends
      const retentionTrends = await this.calculateRetentionTrends(cohorts, cohortType);
      
      // Generate churn analysis
      const churnAnalysis = await this.generateChurnAnalysis(cohorts, startDate, endDate);

      const analysis: CohortAnalysis = {
        cohorts,
        overallRetentionRate,
        averageCohortSize,
        bestPerformingCohort,
        worstPerformingCohort,
        retentionTrends,
        churnAnalysis
      };

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analysis));
      return analysis;
    } catch (error) {
      safeLogger.error('Error generating cohort analysis:', error);
      throw new Error('Failed to generate cohort analysis');
    }
  }

  /**
   * Generate individual cohorts
   */
  private async generateCohorts(
    startDate: Date,
    endDate: Date,
    cohortType: 'daily' | 'weekly' | 'monthly',
    retentionPeriods: number
  ): Promise<CohortData[]> {
    const cohorts: CohortData[] = [];
    
    // Get cohort periods based on type
    const cohortPeriods = this.generateCohortPeriods(startDate, endDate, cohortType);

    for (const period of cohortPeriods) {
      const cohort = await this.generateSingleCohort(period, cohortType, retentionPeriods);
      if (cohort.cohortSize > 0) {
        cohorts.push(cohort);
      }
    }

    return cohorts;
  }

  /**
   * Generate a single cohort
   */
  private async generateSingleCohort(
    cohortPeriod: string,
    cohortType: 'daily' | 'weekly' | 'monthly',
    retentionPeriods: number
  ): Promise<CohortData> {
    const periodStart = new Date(cohortPeriod);
    const periodEnd = this.getNextPeriod(periodStart, cohortType);

    // Get users who signed up in this cohort period
    const cohortUsers = await db.execute(sql`
      SELECT id, created_at, wallet_address
      FROM users
      WHERE created_at >= ${periodStart} AND created_at < ${periodEnd}
      ORDER BY created_at
    `);

    const userIds = cohortUsers.map(user => String(user.id));
    const cohortSize = userIds.length;

    if (cohortSize === 0) {
      return {
        cohortPeriod,
        cohortSize: 0,
        retentionRates: [],
        periods: [],
        userIds: [],
        averageLifetimeValue: 0,
        churnRate: 0
      };
    }

    // Calculate retention rates for each period
    const retentionRates: number[] = [];
    const periods: string[] = [];

    for (let i = 0; i < retentionPeriods; i++) {
      const retentionPeriodStart = this.addPeriods(periodStart, i, cohortType);
      const retentionPeriodEnd = this.addPeriods(periodStart, i + 1, cohortType);
      
      // Count active users in this retention period
      const activeUsers = await this.countActiveUsersInPeriod(
        userIds,
        retentionPeriodStart,
        retentionPeriodEnd
      );

      const retentionRate = cohortSize > 0 ? (activeUsers / cohortSize) * 100 : 0;
      retentionRates.push(retentionRate);
      periods.push(this.formatPeriod(retentionPeriodStart, cohortType));
    }

    // Calculate additional metrics
    const averageLifetimeValue = await this.calculateAverageLifetimeValue(userIds);
    const churnRate = await this.calculateCohortChurnRate(userIds, periodStart, cohortType);

    return {
      cohortPeriod,
      cohortSize,
      retentionRates,
      periods,
      userIds,
      averageLifetimeValue,
      churnRate
    };
  }

  /**
   * Count active users in a specific period
   */
  private async countActiveUsersInPeriod(
    userIds: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    if (userIds.length === 0) return 0;

    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) as active_count
      FROM user_analytics
      WHERE user_id = ANY(${userIds})
      AND timestamp >= ${periodStart}
      AND timestamp < ${periodEnd}
    `);

    return Number(result[0]?.active_count) || 0;
  }

  /**
   * Calculate average lifetime value for a cohort
   */
  private async calculateAverageLifetimeValue(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0;

    try {
      const result = await db.execute(sql`
        SELECT AVG(total_amount) as avg_ltv
        FROM orders
        WHERE buyer_id = ANY(${userIds})
        AND status = 'completed'
      `);

      return Number(result[0]?.avg_ltv) || 0;
    } catch (error) {
      // If orders table doesn't exist or has different structure, return 0
      return 0;
    }
  }

  /**
   * Calculate cohort churn rate
   */
  private async calculateCohortChurnRate(
    userIds: string[],
    cohortStart: Date,
    cohortType: 'daily' | 'weekly' | 'monthly'
  ): Promise<number> {
    if (userIds.length === 0) return 0;

    const now = new Date();
    const periodsSinceCohort = this.getPeriodsBetween(cohortStart, now, cohortType);
    
    // Consider users churned if they haven't been active in the last 2 periods
    const churnThreshold = this.addPeriods(now, -2, cohortType);
    
    const activeUsers = await this.countActiveUsersInPeriod(
      userIds,
      churnThreshold,
      now
    );

    return userIds.length > 0 ? ((userIds.length - activeUsers) / userIds.length) * 100 : 0;
  }

  /**
   * Calculate overall retention rate across all cohorts
   */
  private calculateOverallRetentionRate(cohorts: CohortData[]): number {
    if (cohorts.length === 0) return 0;

    let totalUsers = 0;
    let totalRetained = 0;

    cohorts.forEach(cohort => {
      if (cohort.retentionRates.length > 0) {
        totalUsers += cohort.cohortSize;
        // Use the retention rate at period 1 (first month/week/day after signup)
        const firstPeriodRetention = cohort.retentionRates[1] || 0;
        totalRetained += (cohort.cohortSize * firstPeriodRetention) / 100;
      }
    });

    return totalUsers > 0 ? (totalRetained / totalUsers) * 100 : 0;
  }

  /**
   * Calculate cohort performance score
   */
  private getCohortPerformanceScore(cohort: CohortData): number {
    if (cohort.retentionRates.length === 0) return 0;
    
    // Weight recent retention rates more heavily
    let score = 0;
    let totalWeight = 0;

    cohort.retentionRates.forEach((rate, index) => {
      const weight = Math.max(1, cohort.retentionRates.length - index);
      score += rate * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Calculate retention trends
   */
  private async calculateRetentionTrends(
    cohorts: CohortData[],
    cohortType: 'daily' | 'weekly' | 'monthly'
  ): Promise<RetentionTrend[]> {
    const trends: RetentionTrend[] = [];
    
    // Group cohorts by retention period and calculate trends
    const maxPeriods = Math.max(...cohorts.map(c => c.retentionRates.length));
    
    for (let period = 0; period < maxPeriods; period++) {
      const cohortsWithPeriod = cohorts.filter(c => c.retentionRates.length > period);
      
      if (cohortsWithPeriod.length === 0) continue;

      const avgRetention = cohortsWithPeriod.reduce((sum, c) => sum + c.retentionRates[period], 0) / cohortsWithPeriod.length;
      
      // Determine trend by comparing with previous period
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (period > 0) {
        const prevCohortsWithPeriod = cohorts.filter(c => c.retentionRates.length > period - 1);
        const prevAvgRetention = prevCohortsWithPeriod.reduce((sum, c) => sum + c.retentionRates[period - 1], 0) / prevCohortsWithPeriod.length;
        
        const difference = avgRetention - prevAvgRetention;
        if (Math.abs(difference) > 2) { // 2% threshold
          trend = difference > 0 ? 'up' : 'down';
        }
      }

      trends.push({
        period: `Period ${period + 1}`,
        retentionRate: avgRetention,
        cohortCount: cohortsWithPeriod.length,
        trend
      });
    }

    return trends;
  }

  /**
   * Generate churn analysis
   */
  private async generateChurnAnalysis(
    cohorts: CohortData[],
    startDate: Date,
    endDate: Date
  ): Promise<ChurnAnalysis> {
    const overallChurnRate = cohorts.reduce((sum, c) => sum + c.churnRate, 0) / cohorts.length;
    
    // Calculate churn by period
    const churnByPeriod = cohorts.map(cohort => ({
      period: cohort.cohortPeriod,
      churnRate: cohort.churnRate,
      usersLost: Math.round((cohort.cohortSize * cohort.churnRate) / 100)
    }));

    // Mock churn reasons and risk factors (would be calculated from actual data)
    const churnReasons = [
      { reason: 'Low engagement', percentage: 35 },
      { reason: 'Poor onboarding experience', percentage: 25 },
      { reason: 'Lack of value realization', percentage: 20 },
      { reason: 'Technical issues', percentage: 12 },
      { reason: 'Competitive alternatives', percentage: 8 }
    ];

    const riskFactors = [
      { factor: 'No activity in first 7 days', impact: 0.8 },
      { factor: 'Single session user', impact: 0.7 },
      { factor: 'No purchases after 30 days', impact: 0.6 },
      { factor: 'Low page views per session', impact: 0.4 },
      { factor: 'Mobile-only usage', impact: 0.3 }
    ];

    return {
      overallChurnRate,
      churnByPeriod,
      churnReasons,
      riskFactors
    };
  }

  /**
   * Compare two cohorts
   */
  async compareCohorts(
    cohortA: string,
    cohortB: string,
    cohortType: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<CohortComparison> {
    try {
      const [cohortDataA, cohortDataB] = await Promise.all([
        this.generateSingleCohort(cohortA, cohortType, 12),
        this.generateSingleCohort(cohortB, cohortType, 12)
      ]);

      // Calculate retention rate differences
      const maxPeriods = Math.max(cohortDataA.retentionRates.length, cohortDataB.retentionRates.length);
      const retentionDifference: number[] = [];

      for (let i = 0; i < maxPeriods; i++) {
        const rateA = cohortDataA.retentionRates[i] || 0;
        const rateB = cohortDataB.retentionRates[i] || 0;
        retentionDifference.push(rateA - rateB);
      }

      // Calculate statistical significance (simplified)
      const statisticalSignificance = this.calculateStatisticalSignificance(cohortDataA, cohortDataB);

      // Generate insights
      const insights = this.generateCohortInsights(cohortDataA, cohortDataB, retentionDifference);

      return {
        cohortA: cohortDataA,
        cohortB: cohortDataB,
        retentionDifference,
        statisticalSignificance,
        insights
      };
    } catch (error) {
      safeLogger.error('Error comparing cohorts:', error);
      throw new Error('Failed to compare cohorts');
    }
  }

  /**
   * Get user retention metrics
   */
  async getUserRetentionMetrics(
    userId: string,
    cohortPeriod?: string
  ): Promise<UserRetentionMetrics | null> {
    try {
      // Get user signup date
      const userResult = await db.execute(sql`
        SELECT id, created_at
        FROM users
        WHERE id = ${userId}
      `);

      if (userResult.length === 0) {
        return null;
      }

      const user = userResult[0];
      const signupDate = new Date(user.created_at);
      const daysSinceSignup = Math.floor((Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine cohort period if not provided
      if (!cohortPeriod) {
        cohortPeriod = this.formatPeriod(signupDate, 'monthly');
      }

      // Get last activity
      const activityResult = await db.execute(sql`
        SELECT MAX(timestamp) as last_activity
        FROM user_analytics
        WHERE user_id = ${userId}
      `);

      const lastActivityDate = activityResult[0]?.last_activity 
        ? new Date(activityResult[0].last_activity)
        : signupDate;

      // Check if user is active (activity in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const isActive = lastActivityDate > thirtyDaysAgo;

      // Calculate lifetime value
      const lifetimeValue = await this.calculateAverageLifetimeValue([userId]);

      // Calculate engagement score (simplified)
      const engagementScore = await this.calculateUserEngagementScore(userId);

      // Calculate churn probability (simplified)
      const churnProbability = await this.calculateUserChurnProbability(userId, daysSinceSignup, isActive);

      return {
        userId,
        cohortPeriod,
        daysSinceSignup,
        isActive,
        lastActivityDate,
        lifetimeValue,
        engagementScore,
        churnProbability
      };
    } catch (error) {
      safeLogger.error('Error getting user retention metrics:', error);
      throw new Error('Failed to get user retention metrics');
    }
  }

  // Helper methods

  private generateCohortPeriods(
    startDate: Date,
    endDate: Date,
    cohortType: 'daily' | 'weekly' | 'monthly'
  ): string[] {
    const periods: string[] = [];
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      periods.push(this.formatPeriod(currentDate, cohortType));
      currentDate = this.getNextPeriod(currentDate, cohortType);
    }

    return periods;
  }

  private getNextPeriod(date: Date, cohortType: 'daily' | 'weekly' | 'monthly'): Date {
    const nextDate = new Date(date);
    
    switch (cohortType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    return nextDate;
  }

  private addPeriods(date: Date, periods: number, cohortType: 'daily' | 'weekly' | 'monthly'): Date {
    const newDate = new Date(date);
    
    switch (cohortType) {
      case 'daily':
        newDate.setDate(newDate.getDate() + periods);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() + (periods * 7));
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() + periods);
        break;
    }

    return newDate;
  }

  private getPeriodsBetween(startDate: Date, endDate: Date, cohortType: 'daily' | 'weekly' | 'monthly'): number {
    const diffTime = endDate.getTime() - startDate.getTime();
    
    switch (cohortType) {
      case 'daily':
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
      case 'weekly':
        return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      case 'monthly':
        return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
      default:
        return 0;
    }
  }

  private formatPeriod(date: Date, cohortType: 'daily' | 'weekly' | 'monthly'): string {
    switch (cohortType) {
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private calculateStatisticalSignificance(cohortA: CohortData, cohortB: CohortData): boolean {
    // Simplified statistical significance test
    // In a real implementation, you would use proper statistical tests like chi-square or t-test
    const sampleSizeThreshold = 30;
    const effectSizeThreshold = 5; // 5% difference

    if (cohortA.cohortSize < sampleSizeThreshold || cohortB.cohortSize < sampleSizeThreshold) {
      return false;
    }

    // Check if there's a meaningful difference in retention rates
    const avgRetentionA = cohortA.retentionRates.reduce((sum, rate) => sum + rate, 0) / cohortA.retentionRates.length;
    const avgRetentionB = cohortB.retentionRates.reduce((sum, rate) => sum + rate, 0) / cohortB.retentionRates.length;

    return Math.abs(avgRetentionA - avgRetentionB) > effectSizeThreshold;
  }

  private generateCohortInsights(
    cohortA: CohortData,
    cohortB: CohortData,
    retentionDifference: number[]
  ): string[] {
    const insights: string[] = [];

    // Compare cohort sizes
    if (cohortA.cohortSize > cohortB.cohortSize * 1.5) {
      insights.push(`Cohort A is significantly larger (${cohortA.cohortSize} vs ${cohortB.cohortSize} users)`);
    } else if (cohortB.cohortSize > cohortA.cohortSize * 1.5) {
      insights.push(`Cohort B is significantly larger (${cohortB.cohortSize} vs ${cohortA.cohortSize} users)`);
    }

    // Compare retention trends
    const avgDifferenceA = retentionDifference.slice(0, 3).reduce((sum, diff) => sum + diff, 0) / 3;
    if (avgDifferenceA > 5) {
      insights.push('Cohort A shows better early retention (first 3 periods)');
    } else if (avgDifferenceA < -5) {
      insights.push('Cohort B shows better early retention (first 3 periods)');
    }

    // Compare lifetime value
    if (cohortA.averageLifetimeValue > cohortB.averageLifetimeValue * 1.2) {
      insights.push('Cohort A has higher average lifetime value');
    } else if (cohortB.averageLifetimeValue > cohortA.averageLifetimeValue * 1.2) {
      insights.push('Cohort B has higher average lifetime value');
    }

    // Compare churn rates
    if (cohortA.churnRate < cohortB.churnRate - 5) {
      insights.push('Cohort A has lower churn rate');
    } else if (cohortB.churnRate < cohortA.churnRate - 5) {
      insights.push('Cohort B has lower churn rate');
    }

    return insights;
  }

  private async calculateUserEngagementScore(userId: string): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT DATE(timestamp)) as active_days,
          AVG(EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))) as avg_session_duration
        FROM user_analytics
        WHERE user_id = ${userId}
        AND timestamp >= NOW() - INTERVAL '30 days'
      `);

      const row = result[0];
      const totalEvents = Number(row?.total_events) || 0;
      const activeDays = Number(row?.active_days) || 0;
      const avgSessionDuration = Number(row?.avg_session_duration) || 0;

      // Simple engagement score calculation (0-100)
      const eventScore = Math.min(totalEvents / 10, 10) * 4; // Max 40 points
      const frequencyScore = Math.min(activeDays / 30, 1) * 30; // Max 30 points
      const durationScore = Math.min(avgSessionDuration / 300, 1) * 30; // Max 30 points (5 min sessions)

      return Math.round(eventScore + frequencyScore + durationScore);
    } catch (error) {
      return 0;
    }
  }

  private async calculateUserChurnProbability(
    userId: string,
    daysSinceSignup: number,
    isActive: boolean
  ): Promise<number> {
    // Simplified churn probability calculation
    let churnProbability = 0;

    // Base probability increases with time since signup
    if (daysSinceSignup > 90) churnProbability += 0.3;
    else if (daysSinceSignup > 30) churnProbability += 0.1;

    // Increase probability if not active
    if (!isActive) churnProbability += 0.5;

    // Get recent activity level
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as recent_events
        FROM user_analytics
        WHERE user_id = ${userId}
        AND timestamp >= NOW() - INTERVAL '7 days'
      `);

      const recentEvents = Number(result[0]?.recent_events) || 0;
      if (recentEvents === 0) churnProbability += 0.3;
      else if (recentEvents < 5) churnProbability += 0.1;
    } catch (error) {
      churnProbability += 0.2;
    }

    return Math.min(churnProbability, 1.0);
  }
}

export const cohortAnalysisService = new CohortAnalysisService();
