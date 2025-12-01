import { db } from '../db/index';
import { returns } from '../db/schema';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { redisService } from './redisService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ReasonCategory {
  category: string;
  reasons: string[];
  count: number;
  percentage: number;
  averageRefundAmount: number;
  averageProcessingTime: number;
  approvalRate: number;
}

export interface ReasonTrendData {
  reason: string;
  category: string;
  timeSeries: Array<{
    date: string;
    count: number;
    percentage: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  growthRate: number;
  seasonalPattern?: {
    hasPattern: boolean;
    peakPeriods: string[];
    confidence: number;
  };
}

export interface ReasonCluster {
  clusterId: string;
  clusterName: string;
  reasons: string[];
  keywords: string[];
  count: number;
  percentage: number;
  sentiment: 'negative' | 'neutral' | 'positive';
  actionableInsights: string[];
}

export interface ReasonAnalytics {
  categorization: ReasonCategory[];
  trends: ReasonTrendData[];
  clusters: ReasonCluster[];
  topReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  insights: string[];
  recommendations: string[];
}

export interface AnalyticsPeriod {
  start: string;
  end: string;
}

// ============================================================================
// RETURN REASON ANALYSIS SERVICE
// ============================================================================

export class ReturnReasonAnalysisService {
  private readonly CACHE_TTL = {
    CATEGORIZATION: 3600,  // 1 hour
    TRENDS: 1800,          // 30 minutes
    CLUSTERS: 7200,        // 2 hours
  };

  // Reason categorization mapping
  private readonly REASON_CATEGORIES = {
    'product_quality': ['defective', 'damaged_shipping', 'not_as_described'],
    'customer_preference': ['changed_mind', 'better_price', 'no_longer_needed'],
    'fulfillment_error': ['wrong_item'],
    'other': ['other']
  };

  // Keywords for NLP-based clustering
  private readonly QUALITY_KEYWORDS = [
    'broken', 'defective', 'damaged', 'poor quality', 'not working',
    'malfunction', 'faulty', 'cracked', 'torn', 'stained'
  ];

  private readonly SIZE_FIT_KEYWORDS = [
    'too small', 'too large', 'doesn\'t fit', 'wrong size', 'size issue',
    'tight', 'loose', 'short', 'long', 'narrow', 'wide'
  ];

  private readonly DESCRIPTION_KEYWORDS = [
    'not as shown', 'different', 'misleading', 'inaccurate', 'wrong color',
    'wrong material', 'not as described', 'false advertising'
  ];

  private readonly SHIPPING_KEYWORDS = [
    'arrived damaged', 'shipping damage', 'broken in transit', 'crushed',
    'dented', 'packaging damaged', 'delivery issue'
  ];

  // ========================================================================
  // REASON CATEGORIZATION
  // ========================================================================

  /**
   * Categorize return reasons into logical groups
   * Validates: Task 2.1 - Reason categorization
   */
  async categorizeReasons(
    period: AnalyticsPeriod,
    sellerId?: string
  ): Promise<ReasonCategory[]> {
    const cacheKey = `return:reason:categorization:${sellerId || 'all'}:${period.start}:${period.end}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached reason categorization');
        return cached;
      }

      const startDate = new Date(period.start);
      const endDate = new Date(period.end);

      // Build query conditions
      const conditions = [
        gte(returns.createdAt, startDate),
        lte(returns.createdAt, endDate)
      ];

      if (sellerId) {
        conditions.push(eq(returns.sellerId, sellerId));
      }

      // Get all returns for the period
      const periodReturns = await db
        .select()
        .from(returns)
        .where(and(...conditions));

      const totalReturns = periodReturns.length;

      // Group returns by category
      const categoryMap = new Map<string, typeof periodReturns>();

      for (const [category, reasons] of Object.entries(this.REASON_CATEGORIES)) {
        const categoryReturns = periodReturns.filter(ret => 
          reasons.includes(ret.returnReason)
        );
        categoryMap.set(category, categoryReturns);
      }

      // Calculate statistics for each category
      const categories: ReasonCategory[] = [];

      for (const [category, categoryReturns] of categoryMap.entries()) {
        const count = categoryReturns.length;
        const percentage = totalReturns > 0 ? (count / totalReturns) * 100 : 0;

        // Calculate average refund amount
        const totalRefundAmount = categoryReturns.reduce((sum, ret) => 
          sum + (Number(ret.refundAmount) || 0), 0
        );
        const averageRefundAmount = count > 0 ? totalRefundAmount / count : 0;

        // Calculate average processing time
        const processingTimes = categoryReturns
          .filter(r => r.completedAt && r.createdAt)
          .map(r => {
            const completedAt = r.completedAt as Date;
            const createdAt = r.createdAt as Date;
            return (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // hours
          });

        const averageProcessingTime = processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
          : 0;

        // Calculate approval rate
        const approvedReturns = categoryReturns.filter(
          r => r.status === 'approved' || r.status === 'completed'
        ).length;
        const approvalRate = count > 0 ? (approvedReturns / count) * 100 : 0;

        categories.push({
          category,
          reasons: this.REASON_CATEGORIES[category as keyof typeof this.REASON_CATEGORIES],
          count,
          percentage,
          averageRefundAmount,
          averageProcessingTime,
          approvalRate,
        });
      }

      // Sort by count descending
      const sortedCategories = categories.sort((a, b) => b.count - a.count);

      // Cache the result
      await redisService.set(cacheKey, sortedCategories, this.CACHE_TTL.CATEGORIZATION);

      safeLogger.info('Return reason categorization completed', {
        sellerId: sellerId || 'all',
        totalCategories: sortedCategories.length,
        totalReturns,
      });

      return sortedCategories;
    } catch (error) {
      safeLogger.error('Error categorizing return reasons:', error);
      throw error;
    }
  }

  // ========================================================================
  // REASON TREND ANALYSIS
  // ========================================================================

  /**
   * Analyze trends for each return reason over time
   * Validates: Task 2.1 - Reason trend analysis
   */
  async analyzeReasonTrends(
    period: AnalyticsPeriod,
    sellerId?: string
  ): Promise<ReasonTrendData[]> {
    const cacheKey = `return:reason:trends:${sellerId || 'all'}:${period.start}:${period.end}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached reason trends');
        return cached;
      }

      const startDate = new Date(period.start);
      const endDate = new Date(period.end);

      // Build query conditions
      const conditions = [
        gte(returns.createdAt, startDate),
        lte(returns.createdAt, endDate)
      ];

      if (sellerId) {
        conditions.push(eq(returns.sellerId, sellerId));
      }

      // Get all returns for the period
      const periodReturns = await db
        .select()
        .from(returns)
        .where(and(...conditions));

      // Get unique reasons
      const uniqueReasons = [...new Set(periodReturns.map(r => r.returnReason))];

      // Analyze trends for each reason
      const trends: ReasonTrendData[] = [];

      for (const reason of uniqueReasons) {
        const reasonReturns = periodReturns.filter(r => r.returnReason === reason);

        // Create time series data (daily aggregation)
        const timeSeriesMap = new Map<string, number>();
        const totalCountMap = new Map<string, number>();

        // Initialize all dates in the period
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          timeSeriesMap.set(dateKey, 0);
          totalCountMap.set(dateKey, 0);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Count returns by date
        periodReturns.forEach(ret => {
          const dateKey = ret.createdAt.toISOString().split('T')[0];
          const currentTotal = totalCountMap.get(dateKey) || 0;
          totalCountMap.set(dateKey, currentTotal + 1);
        });

        reasonReturns.forEach(ret => {
          const dateKey = ret.createdAt.toISOString().split('T')[0];
          const currentCount = timeSeriesMap.get(dateKey) || 0;
          timeSeriesMap.set(dateKey, currentCount + 1);
        });

        // Convert to array and calculate percentages
        const timeSeries = Array.from(timeSeriesMap.entries())
          .map(([date, count]) => {
            const totalForDate = totalCountMap.get(date) || 0;
            const percentage = totalForDate > 0 ? (count / totalForDate) * 100 : 0;
            return { date, count, percentage };
          })
          .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate growth rate (comparing first and last week)
        const growthRate = this.calculateGrowthRate(timeSeries);

        // Determine trend direction
        const trend = this.determineTrend(growthRate);

        // Detect seasonal patterns
        const seasonalPattern = this.detectSeasonalPattern(timeSeries);

        // Find category for this reason
        const category = this.findCategoryForReason(reason);

        trends.push({
          reason,
          category,
          timeSeries,
          trend,
          growthRate,
          seasonalPattern,
        });
      }

      // Sort by total count descending
      const sortedTrends = trends.sort((a, b) => {
        const aTotal = a.timeSeries.reduce((sum, t) => sum + t.count, 0);
        const bTotal = b.timeSeries.reduce((sum, t) => sum + t.count, 0);
        return bTotal - aTotal;
      });

      // Cache the result
      await redisService.set(cacheKey, sortedTrends, this.CACHE_TTL.TRENDS);

      safeLogger.info('Return reason trend analysis completed', {
        sellerId: sellerId || 'all',
        totalReasons: sortedTrends.length,
      });

      return sortedTrends;
    } catch (error) {
      safeLogger.error('Error analyzing reason trends:', error);
      throw error;
    }
  }

  /**
   * Calculate growth rate from time series data
   */
  private calculateGrowthRate(timeSeries: Array<{ date: string; count: number; percentage: number }>): number {
    if (timeSeries.length < 14) {
      return 0;
    }

    // Compare first week to last week
    const firstWeek = timeSeries.slice(0, 7);
    const lastWeek = timeSeries.slice(-7);

    const firstWeekTotal = firstWeek.reduce((sum, t) => sum + t.count, 0);
    const lastWeekTotal = lastWeek.reduce((sum, t) => sum + t.count, 0);

    if (firstWeekTotal === 0) {
      return lastWeekTotal > 0 ? 100 : 0;
    }

    return ((lastWeekTotal - firstWeekTotal) / firstWeekTotal) * 100;
  }

  /**
   * Determine trend direction from growth rate
   */
  private determineTrend(growthRate: number): 'increasing' | 'decreasing' | 'stable' {
    if (growthRate > 10) {
      return 'increasing';
    } else if (growthRate < -10) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Detect seasonal patterns in time series data
   */
  private detectSeasonalPattern(
    timeSeries: Array<{ date: string; count: number; percentage: number }>
  ): { hasPattern: boolean; peakPeriods: string[]; confidence: number } {
    if (timeSeries.length < 28) {
      return { hasPattern: false, peakPeriods: [], confidence: 0 };
    }

    // Simple pattern detection: find days of week with consistently high counts
    const dayOfWeekCounts: number[][] = Array.from({ length: 7 }, () => []);

    timeSeries.forEach(t => {
      const date = new Date(t.date);
      const dayOfWeek = date.getDay();
      dayOfWeekCounts[dayOfWeek].push(t.count);
    });

    // Calculate average for each day of week
    const dayOfWeekAverages = dayOfWeekCounts.map(counts => {
      if (counts.length === 0) return 0;
      return counts.reduce((sum, c) => sum + c, 0) / counts.length;
    });

    const overallAverage = dayOfWeekAverages.reduce((sum, avg) => sum + avg, 0) / 7;

    // Find peak days (>30% above average)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakPeriods: string[] = [];

    dayOfWeekAverages.forEach((avg, idx) => {
      if (avg > overallAverage * 1.3) {
        peakPeriods.push(dayNames[idx]);
      }
    });

    // Calculate confidence based on consistency
    const variance = dayOfWeekAverages.reduce((sum, avg) => 
      sum + Math.pow(avg - overallAverage, 2), 0
    ) / 7;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = overallAverage > 0 ? stdDev / overallAverage : 0;

    const hasPattern = peakPeriods.length > 0 && coefficientOfVariation > 0.2;
    const confidence = hasPattern ? Math.min(coefficientOfVariation, 1) : 0;

    return {
      hasPattern,
      peakPeriods,
      confidence,
    };
  }

  /**
   * Find category for a given reason
   */
  private findCategoryForReason(reason: string): string {
    for (const [category, reasons] of Object.entries(this.REASON_CATEGORIES)) {
      if (reasons.includes(reason)) {
        return category;
      }
    }
    return 'other';
  }

  // ========================================================================
  // NLP-BASED REASON CLUSTERING
  // ========================================================================

  /**
   * Cluster return reasons using NLP techniques
   * Validates: Task 2.1 - NLP-based reason clustering
   */
  async clusterReasons(
    period: AnalyticsPeriod,
    sellerId?: string
  ): Promise<ReasonCluster[]> {
    const cacheKey = `return:reason:clusters:${sellerId || 'all'}:${period.start}:${period.end}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached reason clusters');
        return cached;
      }

      const startDate = new Date(period.start);
      const endDate = new Date(period.end);

      // Build query conditions
      const conditions = [
        gte(returns.createdAt, startDate),
        lte(returns.createdAt, endDate)
      ];

      if (sellerId) {
        conditions.push(eq(returns.sellerId, sellerId));
      }

      // Get all returns with detailed reasons
      const periodReturns = await db
        .select()
        .from(returns)
        .where(and(...conditions));

      const totalReturns = periodReturns.length;

      // Extract detailed reason texts
      const reasonTexts = periodReturns
        .map(r => r.returnReasonDetails)
        .filter(text => text && text.length > 0) as string[];

      // Cluster based on keyword matching
      const clusters: ReasonCluster[] = [];

      // Quality Issues Cluster
      const qualityReturns = this.findReturnsByKeywords(periodReturns, this.QUALITY_KEYWORDS);
      if (qualityReturns.length > 0) {
        clusters.push(this.createCluster(
          'quality_issues',
          'Product Quality Issues',
          qualityReturns,
          this.QUALITY_KEYWORDS,
          totalReturns,
          'negative',
          [
            'Improve quality control processes',
            'Review supplier quality standards',
            'Consider product testing before shipment'
          ]
        ));
      }

      // Size/Fit Issues Cluster
      const sizeFitReturns = this.findReturnsByKeywords(periodReturns, this.SIZE_FIT_KEYWORDS);
      if (sizeFitReturns.length > 0) {
        clusters.push(this.createCluster(
          'size_fit_issues',
          'Size and Fit Issues',
          sizeFitReturns,
          this.SIZE_FIT_KEYWORDS,
          totalReturns,
          'neutral',
          [
            'Improve size charts and measurements',
            'Add customer reviews about sizing',
            'Consider offering virtual try-on features'
          ]
        ));
      }

      // Description Mismatch Cluster
      const descriptionReturns = this.findReturnsByKeywords(periodReturns, this.DESCRIPTION_KEYWORDS);
      if (descriptionReturns.length > 0) {
        clusters.push(this.createCluster(
          'description_mismatch',
          'Product Description Mismatch',
          descriptionReturns,
          this.DESCRIPTION_KEYWORDS,
          totalReturns,
          'negative',
          [
            'Review and update product descriptions',
            'Ensure photos accurately represent products',
            'Add more detailed specifications'
          ]
        ));
      }

      // Shipping Damage Cluster
      const shippingReturns = this.findReturnsByKeywords(periodReturns, this.SHIPPING_KEYWORDS);
      if (shippingReturns.length > 0) {
        clusters.push(this.createCluster(
          'shipping_damage',
          'Shipping and Delivery Issues',
          shippingReturns,
          this.SHIPPING_KEYWORDS,
          totalReturns,
          'negative',
          [
            'Improve packaging materials',
            'Review shipping carrier performance',
            'Add fragile handling instructions'
          ]
        ));
      }

      // Customer Preference Cluster (no detailed reason needed)
      const preferenceReturns = periodReturns.filter(r => 
        ['changed_mind', 'better_price', 'no_longer_needed'].includes(r.returnReason)
      );
      if (preferenceReturns.length > 0) {
        clusters.push(this.createCluster(
          'customer_preference',
          'Customer Preference Changes',
          preferenceReturns,
          ['changed mind', 'better price', 'no longer needed'],
          totalReturns,
          'neutral',
          [
            'Consider offering price matching',
            'Implement wish list features',
            'Provide better product recommendations'
          ]
        ));
      }

      // Sort by count descending
      const sortedClusters = clusters.sort((a, b) => b.count - a.count);

      // Cache the result
      await redisService.set(cacheKey, sortedClusters, this.CACHE_TTL.CLUSTERS);

      safeLogger.info('Return reason clustering completed', {
        sellerId: sellerId || 'all',
        totalClusters: sortedClusters.length,
        totalReturns,
      });

      return sortedClusters;
    } catch (error) {
      safeLogger.error('Error clustering return reasons:', error);
      throw error;
    }
  }

  /**
   * Find returns matching specific keywords
   */
  private findReturnsByKeywords(
    returns: any[],
    keywords: string[]
  ): any[] {
    return returns.filter(ret => {
      const reasonText = (ret.returnReasonDetails || '').toLowerCase();
      return keywords.some(keyword => reasonText.includes(keyword.toLowerCase()));
    });
  }

  /**
   * Create a cluster object
   */
  private createCluster(
    clusterId: string,
    clusterName: string,
    returns: any[],
    keywords: string[],
    totalReturns: number,
    sentiment: 'negative' | 'neutral' | 'positive',
    actionableInsights: string[]
  ): ReasonCluster {
    const count = returns.length;
    const percentage = totalReturns > 0 ? (count / totalReturns) * 100 : 0;

    // Extract unique reasons from the cluster
    const reasons = [...new Set(returns.map(r => r.returnReason))];

    return {
      clusterId,
      clusterName,
      reasons,
      keywords,
      count,
      percentage,
      sentiment,
      actionableInsights,
    };
  }

  // ========================================================================
  // COMPREHENSIVE REASON ANALYTICS
  // ========================================================================

  /**
   * Get comprehensive reason analytics
   * Combines categorization, trends, and clustering
   */
  async getComprehensiveReasonAnalytics(
    period: AnalyticsPeriod,
    sellerId?: string
  ): Promise<ReasonAnalytics> {
    const cacheKey = `return:reason:comprehensive:${sellerId || 'all'}:${period.start}:${period.end}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached comprehensive reason analytics');
        return cached;
      }

      // Get all analytics components
      const [categorization, trends, clusters] = await Promise.all([
        this.categorizeReasons(period, sellerId),
        this.analyzeReasonTrends(period, sellerId),
        this.clusterReasons(period, sellerId),
      ]);

      // Calculate top reasons
      const reasonCounts = new Map<string, number>();
      const reasonTrends = new Map<string, 'up' | 'down' | 'stable'>();

      trends.forEach(t => {
        const totalCount = t.timeSeries.reduce((sum, ts) => sum + ts.count, 0);
        reasonCounts.set(t.reason, totalCount);
        reasonTrends.set(t.reason, t.trend === 'increasing' ? 'up' : t.trend === 'decreasing' ? 'down' : 'stable');
      });

      const totalReturns = Array.from(reasonCounts.values()).reduce((sum, count) => sum + count, 0);

      const topReasons = Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: totalReturns > 0 ? (count / totalReturns) * 100 : 0,
          trend: reasonTrends.get(reason) || 'stable',
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Generate insights
      const insights = this.generateInsights(categorization, trends, clusters, topReasons);

      // Generate recommendations
      const recommendations = this.generateRecommendations(categorization, trends, clusters);

      const analytics: ReasonAnalytics = {
        categorization,
        trends,
        clusters,
        topReasons,
        insights,
        recommendations,
      };

      // Cache the result
      await redisService.set(cacheKey, analytics, this.CACHE_TTL.TRENDS);

      safeLogger.info('Comprehensive reason analytics completed', {
        sellerId: sellerId || 'all',
        totalCategories: categorization.length,
        totalTrends: trends.length,
        totalClusters: clusters.length,
      });

      return analytics;
    } catch (error) {
      safeLogger.error('Error getting comprehensive reason analytics:', error);
      throw error;
    }
  }

  /**
   * Generate insights from analytics data
   */
  private generateInsights(
    categorization: ReasonCategory[],
    trends: ReasonTrendData[],
    clusters: ReasonCluster[],
    topReasons: any[]
  ): string[] {
    const insights: string[] = [];

    // Insight 1: Top reason
    if (topReasons.length > 0) {
      const topReason = topReasons[0];
      insights.push(
        `"${topReason.reason}" is the most common return reason, accounting for ${topReason.percentage.toFixed(1)}% of all returns`
      );
    }

    // Insight 2: Category distribution
    if (categorization.length > 0) {
      const topCategory = categorization[0];
      insights.push(
        `${topCategory.category.replace('_', ' ')} issues represent ${topCategory.percentage.toFixed(1)}% of returns`
      );
    }

    // Insight 3: Trending reasons
    const increasingReasons = trends.filter(t => t.trend === 'increasing');
    if (increasingReasons.length > 0) {
      insights.push(
        `${increasingReasons.length} return ${increasingReasons.length === 1 ? 'reason shows' : 'reasons show'} an increasing trend`
      );
    }

    // Insight 4: Largest cluster
    if (clusters.length > 0) {
      const largestCluster = clusters[0];
      insights.push(
        `${largestCluster.clusterName} is the largest issue cluster with ${largestCluster.count} returns (${largestCluster.percentage.toFixed(1)}%)`
      );
    }

    // Insight 5: Seasonal patterns
    const reasonsWithPatterns = trends.filter(t => t.seasonalPattern?.hasPattern);
    if (reasonsWithPatterns.length > 0) {
      insights.push(
        `${reasonsWithPatterns.length} return ${reasonsWithPatterns.length === 1 ? 'reason shows' : 'reasons show'} seasonal patterns`
      );
    }

    return insights;
  }

  /**
   * Generate recommendations from analytics data
   */
  private generateRecommendations(
    categorization: ReasonCategory[],
    trends: ReasonTrendData[],
    clusters: ReasonCluster[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommendation 1: Focus on top category
    if (categorization.length > 0) {
      const topCategory = categorization[0];
      if (topCategory.percentage > 40) {
        recommendations.push(
          `Focus on reducing ${topCategory.category.replace('_', ' ')} issues as they account for over 40% of returns`
        );
      }
    }

    // Recommendation 2: Address increasing trends
    const increasingReasons = trends.filter(t => t.trend === 'increasing' && t.growthRate > 20);
    if (increasingReasons.length > 0) {
      recommendations.push(
        `Investigate rapidly increasing return reasons: ${increasingReasons.map(r => r.reason).join(', ')}`
      );
    }

    // Recommendation 3: Cluster-specific actions
    clusters.forEach(cluster => {
      if (cluster.percentage > 15) {
        recommendations.push(...cluster.actionableInsights);
      }
    });

    // Recommendation 4: Approval rate optimization
    const lowApprovalCategories = categorization.filter(c => c.approvalRate < 70);
    if (lowApprovalCategories.length > 0) {
      recommendations.push(
        `Review approval criteria for ${lowApprovalCategories.map(c => c.category).join(', ')} to improve customer satisfaction`
      );
    }

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }
}

// Singleton instance
export const returnReasonAnalysisService = new ReturnReasonAnalysisService();
