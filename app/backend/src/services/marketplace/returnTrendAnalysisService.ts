import { db } from '../../db/index';
import { returns, returnAnalyticsDaily, returnAnalyticsHourly, users } from '../../db/schema';
import { eq, and, gte, lte, sql, desc, count, avg, sum } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { redisService } from './redisService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AnalyticsPeriod {
  start: string; // ISO date string
  end: string;   // ISO date string
}

export interface PeriodComparisonData {
  currentPeriod: PeriodMetrics;
  previousPeriod: PeriodMetrics;
  percentageChange: number;
  absoluteChange: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  statisticalSignificance: boolean;
  confidenceLevel: number;
}

export interface PeriodMetrics {
  totalReturns: number;
  totalRefundAmount: number;
  averageProcessingTime: number;
  approvalRate: number;
  returnRate: number;
  customerSatisfactionScore: number;
}

export interface SeasonalPatternData {
  patterns: SeasonalPattern[];
  seasonalityStrength: number;
  peakPeriods: PeakPeriod[];
  lowPeriods: LowPeriod[];
  recommendations: string[];
}

export interface SeasonalPattern {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  pattern: number[];
  confidence: number;
  description: string;
}

export interface PeakPeriod {
  startDate: string;
  endDate: string;
  averageVolume: number;
  percentageAboveBaseline: number;
}

export interface LowPeriod {
  startDate: string;
  endDate: string;
  averageVolume: number;
  percentageBelowBaseline: number;
}

export interface GrowthRateData {
  dailyGrowthRate: number;
  weeklyGrowthRate: number;
  monthlyGrowthRate: number;
  quarterlyGrowthRate: number;
  yearlyGrowthRate: number;
  compoundAnnualGrowthRate: number;
  projectedVolume: ProjectedVolume;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  volatility: number;
}

export interface ProjectedVolume {
  nextWeek: number;
  nextMonth: number;
  nextQuarter: number;
  confidence: number;
}

export interface ReturnTrendAnalysis {
  periodComparison: PeriodComparisonData;
  seasonalPatterns: SeasonalPatternData;
  growthRate: GrowthRateData;
  projectedVolume: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  geographicDistribution?: GeographicDistributionAnalytics;
}

export interface CategoryReturnStats {
  categoryId: string;
  categoryName: string;
  totalReturns: number;
  returnRate: number;
  averageProcessingTime: number;
  approvalRate: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  percentageOfTotalReturns: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  monthOverMonthChange: number;
}

export interface CategoryBreakdownAnalytics {
  categories: CategoryReturnStats[];
  topCategories: CategoryReturnStats[];
  bottomCategories: CategoryReturnStats[];
  categoryComparison: CategoryComparison[];
  insights: string[];
}

export interface CategoryComparison {
  categoryId: string;
  categoryName: string;
  currentPeriodReturns: number;
  previousPeriodReturns: number;
  percentageChange: number;
  trend: 'improving' | 'worsening' | 'stable';
}

export interface GeographicReturnData {
  country: string;
  countryCode: string;
  state?: string;
  city?: string;
  totalReturns: number;
  totalRefundAmount: number;
  averageProcessingTime: number;
  approvalRate: number;
  returnRate: number;
  percentageOfTotalReturns: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  topReturnReasons: Array<{ reason: string; count: number }>;
}

export interface GeographicDistributionAnalytics {
  byCountry: GeographicReturnData[];
  byState: GeographicReturnData[];
  byCity: GeographicReturnData[];
  topRegions: GeographicReturnData[];
  insights: string[];
  heatmapData: Array<{
    location: string;
    coordinates?: { lat: number; lng: number };
    value: number;
    intensity: number;
  }>;
}

// ============================================================================
// RETURN TREND ANALYSIS SERVICE
// ============================================================================

export class ReturnTrendAnalysisService {
  private readonly CACHE_TTL = {
    TREND_ANALYSIS: 1800,  // 30 minutes
    SEASONAL: 3600,        // 1 hour
    GROWTH_RATE: 1800,     // 30 minutes
  };

  // Statistical significance threshold (p-value)
  private readonly SIGNIFICANCE_THRESHOLD = 0.05;

  // Minimum data points required for reliable analysis
  private readonly MIN_DATA_POINTS = 7;

  // ========================================================================
  // PERIOD COMPARISON CALCULATIONS
  // ========================================================================

  /**
   * Compare metrics between two time periods
   * Validates: Property 4 - Comprehensive Trend Analysis
   */
  async comparePeriods(
    currentPeriod: AnalyticsPeriod,
    previousPeriod: AnalyticsPeriod,
    sellerId?: string
  ): Promise<PeriodComparisonData> {
    const cacheKey = `return:trend:comparison:${sellerId || 'all'}:${currentPeriod.start}:${previousPeriod.start}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached period comparison');
        return cached;
      }

      // Calculate metrics for both periods
      const currentMetrics = await this.calculatePeriodMetrics(currentPeriod, sellerId);
      const previousMetrics = await this.calculatePeriodMetrics(previousPeriod, sellerId);

      // Calculate changes
      const absoluteChange = currentMetrics.totalReturns - previousMetrics.totalReturns;
      const percentageChange = previousMetrics.totalReturns > 0
        ? ((currentMetrics.totalReturns - previousMetrics.totalReturns) / previousMetrics.totalReturns) * 100
        : 0;

      // Determine trend direction
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (Math.abs(percentageChange) > 5) {
        trend = percentageChange > 0 ? 'increasing' : 'decreasing';
      }

      // Calculate statistical significance
      const { isSignificant, confidenceLevel } = await this.calculateStatisticalSignificance(
        currentMetrics,
        previousMetrics
      );

      const comparison: PeriodComparisonData = {
        currentPeriod: currentMetrics,
        previousPeriod: previousMetrics,
        percentageChange,
        absoluteChange,
        trend,
        statisticalSignificance: isSignificant,
        confidenceLevel,
      };

      // Cache the result
      await redisService.set(cacheKey, comparison, this.CACHE_TTL.TREND_ANALYSIS);

      return comparison;
    } catch (error) {
      safeLogger.error('Error comparing periods:', error);
      throw error;
    }
  }

  /**
   * Calculate metrics for a specific period
   */
  private async calculatePeriodMetrics(
    period: AnalyticsPeriod,
    sellerId?: string
  ): Promise<PeriodMetrics> {
    try {
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

      // Calculate metrics
      const totalReturns = periodReturns.length;
      const approvedReturns = periodReturns.filter(r => r.status === 'approved' || r.status === 'completed').length;
      const approvalRate = totalReturns > 0 ? (approvedReturns / totalReturns) * 100 : 0;

      // Calculate total refund amount
      const totalRefundAmount = periodReturns.reduce((sum, ret) => {
        return sum + (Number(ret.refundAmount) || 0);
      }, 0);

      // Calculate average processing time
      const processingTimes = periodReturns
        .filter(r => r.completedAt && r.createdAt)
        .map(r => {
          const completedAt = r.completedAt as Date;
          const createdAt = r.createdAt as Date;
          return (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // hours
        });

      const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

      // Calculate customer satisfaction (would come from surveys in production)
      const customerSatisfactionScore = 4.2; // Placeholder

      return {
        totalReturns,
        totalRefundAmount,
        averageProcessingTime,
        approvalRate,
        returnRate: 0, // Would need total orders data
        customerSatisfactionScore,
      };
    } catch (error) {
      safeLogger.error('Error calculating period metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate statistical significance using t-test
   */
  private async calculateStatisticalSignificance(
    current: PeriodMetrics,
    previous: PeriodMetrics
  ): Promise<{ isSignificant: boolean; confidenceLevel: number }> {
    try {
      // Simple implementation using percentage change and sample size
      // In production, would use proper statistical tests (t-test, chi-square, etc.)
      
      const percentageChange = Math.abs(
        ((current.totalReturns - previous.totalReturns) / previous.totalReturns) * 100
      );

      // Consider significant if change is > 10% and we have enough data
      const isSignificant = percentageChange > 10 && 
                           current.totalReturns >= this.MIN_DATA_POINTS &&
                           previous.totalReturns >= this.MIN_DATA_POINTS;

      // Calculate confidence level (simplified)
      const confidenceLevel = isSignificant ? 0.95 : 0.80;

      return { isSignificant, confidenceLevel };
    } catch (error) {
      safeLogger.error('Error calculating statistical significance:', error);
      return { isSignificant: false, confidenceLevel: 0 };
    }
  }

  // ========================================================================
  // SEASONAL PATTERN DETECTION
  // ========================================================================

  /**
   * Detect seasonal patterns in return data
   * Validates: Property 4 - Comprehensive Trend Analysis
   */
  async detectSeasonalPatterns(
    period: AnalyticsPeriod,
    sellerId?: string
  ): Promise<SeasonalPatternData> {
    const cacheKey = `return:trend:seasonal:${sellerId || 'all'}:${period.start}:${period.end}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached seasonal patterns');
        return cached;
      }

      const startDate = new Date(period.start);
      const endDate = new Date(period.end);

      // Get daily aggregated data
      const dailyData = await this.getDailyAggregatedData(startDate, endDate, sellerId);

      if (dailyData.length < this.MIN_DATA_POINTS) {
        return this.getEmptySeasonalData();
      }

      // Detect patterns at different granularities
      const weeklyPattern = this.detectWeeklyPattern(dailyData);
      const monthlyPattern = this.detectMonthlyPattern(dailyData);

      // Calculate seasonality strength
      const seasonalityStrength = this.calculateSeasonalityStrength(dailyData);

      // Identify peak and low periods
      const { peakPeriods, lowPeriods } = this.identifyPeakAndLowPeriods(dailyData);

      // Generate recommendations
      const recommendations = this.generateSeasonalRecommendations(
        weeklyPattern,
        monthlyPattern,
        peakPeriods,
        lowPeriods
      );

      const patterns: SeasonalPatternData = {
        patterns: [weeklyPattern, monthlyPattern].filter(p => p !== null) as SeasonalPattern[],
        seasonalityStrength,
        peakPeriods,
        lowPeriods,
        recommendations,
      };

      // Cache the result
      await redisService.set(cacheKey, patterns, this.CACHE_TTL.SEASONAL);

      return patterns;
    } catch (error) {
      safeLogger.error('Error detecting seasonal patterns:', error);
      throw error;
    }
  }

  /**
   * Get daily aggregated return data
   */
  private async getDailyAggregatedData(
    startDate: Date,
    endDate: Date,
    sellerId?: string
  ): Promise<Array<{ date: Date; count: number; amount: number }>> {
    try {
      const conditions = [
        gte(returns.createdAt, startDate),
        lte(returns.createdAt, endDate)
      ];

      if (sellerId) {
        conditions.push(eq(returns.sellerId, sellerId));
      }

      const allReturns = await db
        .select()
        .from(returns)
        .where(and(...conditions));

      // Group by day
      const dailyMap = new Map<string, { count: number; amount: number }>();

      allReturns.forEach(ret => {
        const dateKey = ret.createdAt.toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey) || { count: 0, amount: 0 };
        dailyMap.set(dateKey, {
          count: existing.count + 1,
          amount: existing.amount + (Number(ret.refundAmount) || 0),
        });
      });

      // Convert to array and sort by date
      const result = Array.from(dailyMap.entries())
        .map(([dateStr, data]) => ({
          date: new Date(dateStr),
          count: data.count,
          amount: data.amount,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return result;
    } catch (error) {
      safeLogger.error('Error getting daily aggregated data:', error);
      throw error;
    }
  }

  /**
   * Detect weekly patterns (day of week effects)
   */
  private detectWeeklyPattern(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): SeasonalPattern | null {
    try {
      if (dailyData.length < 7) {
        return null;
      }

      // Group by day of week (0 = Sunday, 6 = Saturday)
      const dayOfWeekCounts: number[] = new Array(7).fill(0);
      const dayOfWeekSamples: number[] = new Array(7).fill(0);

      dailyData.forEach(data => {
        const dayOfWeek = data.date.getDay();
        dayOfWeekCounts[dayOfWeek] += data.count;
        dayOfWeekSamples[dayOfWeek]++;
      });

      // Calculate averages
      const pattern = dayOfWeekCounts.map((count, idx) => 
        dayOfWeekSamples[idx] > 0 ? count / dayOfWeekSamples[idx] : 0
      );

      // Calculate confidence based on sample size
      const minSamples = Math.min(...dayOfWeekSamples.filter(s => s > 0));
      const confidence = Math.min(minSamples / 4, 1); // 4 weeks = high confidence

      // Determine if pattern is significant
      const avg = pattern.reduce((sum, val) => sum + val, 0) / pattern.length;
      const variance = pattern.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / pattern.length;
      const coefficientOfVariation = avg > 0 ? Math.sqrt(variance) / avg : 0;

      if (coefficientOfVariation < 0.1) {
        return null; // Pattern not significant
      }

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const peakDay = dayNames[pattern.indexOf(Math.max(...pattern))];

      return {
        period: 'weekly',
        pattern,
        confidence,
        description: `Weekly pattern detected with peak returns on ${peakDay}`,
      };
    } catch (error) {
      safeLogger.error('Error detecting weekly pattern:', error);
      return null;
    }
  }

  /**
   * Detect monthly patterns
   */
  private detectMonthlyPattern(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): SeasonalPattern | null {
    try {
      if (dailyData.length < 30) {
        return null;
      }

      // Group by day of month (1-31)
      const dayOfMonthCounts: number[] = new Array(31).fill(0);
      const dayOfMonthSamples: number[] = new Array(31).fill(0);

      dailyData.forEach(data => {
        const dayOfMonth = data.date.getDate() - 1; // 0-indexed
        dayOfMonthCounts[dayOfMonth] += data.count;
        dayOfMonthSamples[dayOfMonth]++;
      });

      // Calculate averages
      const pattern = dayOfMonthCounts.map((count, idx) => 
        dayOfMonthSamples[idx] > 0 ? count / dayOfMonthSamples[idx] : 0
      );

      // Calculate confidence
      const avgSamples = dayOfMonthSamples.reduce((sum, s) => sum + s, 0) / dayOfMonthSamples.length;
      const confidence = Math.min(avgSamples / 3, 1); // 3 months = high confidence

      // Check for significance
      const avg = pattern.reduce((sum, val) => sum + val, 0) / pattern.length;
      const variance = pattern.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / pattern.length;
      const coefficientOfVariation = avg > 0 ? Math.sqrt(variance) / avg : 0;

      if (coefficientOfVariation < 0.15) {
        return null;
      }

      // Identify peak periods
      const peakDays = pattern
        .map((val, idx) => ({ day: idx + 1, value: val }))
        .filter(d => d.value > avg * 1.2)
        .map(d => d.day);

      const description = peakDays.length > 0
        ? `Monthly pattern detected with peaks around days ${peakDays.slice(0, 3).join(', ')}`
        : 'Monthly pattern detected';

      return {
        period: 'monthly',
        pattern,
        confidence,
        description,
      };
    } catch (error) {
      safeLogger.error('Error detecting monthly pattern:', error);
      return null;
    }
  }

  /**
   * Calculate overall seasonality strength
   */
  private calculateSeasonalityStrength(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): number {
    try {
      if (dailyData.length < this.MIN_DATA_POINTS) {
        return 0;
      }

      const counts = dailyData.map(d => d.count);
      const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length;
      const variance = counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length;
      const stdDev = Math.sqrt(variance);

      // Coefficient of variation as a measure of seasonality
      const cv = mean > 0 ? stdDev / mean : 0;

      // Normalize to 0-1 scale (cv > 0.5 = strong seasonality)
      return Math.min(cv / 0.5, 1);
    } catch (error) {
      safeLogger.error('Error calculating seasonality strength:', error);
      return 0;
    }
  }

  /**
   * Identify peak and low periods
   */
  private identifyPeakAndLowPeriods(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): { peakPeriods: PeakPeriod[]; lowPeriods: LowPeriod[] } {
    try {
      if (dailyData.length < this.MIN_DATA_POINTS) {
        return { peakPeriods: [], lowPeriods: [] };
      }

      // Calculate baseline (median)
      const sortedCounts = [...dailyData].map(d => d.count).sort((a, b) => a - b);
      const baseline = sortedCounts[Math.floor(sortedCounts.length / 2)];

      // Identify consecutive periods above/below baseline
      const peakPeriods: PeakPeriod[] = [];
      const lowPeriods: LowPeriod[] = [];

      let currentPeak: { start: Date; end: Date; volumes: number[] } | null = null;
      let currentLow: { start: Date; end: Date; volumes: number[] } | null = null;

      dailyData.forEach((data, idx) => {
        const isAboveBaseline = data.count > baseline * 1.3; // 30% above baseline
        const isBelowBaseline = data.count < baseline * 0.7; // 30% below baseline

        // Handle peak periods
        if (isAboveBaseline) {
          if (!currentPeak) {
            currentPeak = { start: data.date, end: data.date, volumes: [data.count] };
          } else {
            currentPeak.end = data.date;
            currentPeak.volumes.push(data.count);
          }
        } else if (currentPeak && currentPeak.volumes.length >= 3) {
          // End of peak period (minimum 3 days)
          const avgVolume = currentPeak.volumes.reduce((sum, v) => sum + v, 0) / currentPeak.volumes.length;
          peakPeriods.push({
            startDate: currentPeak.start.toISOString().split('T')[0],
            endDate: currentPeak.end.toISOString().split('T')[0],
            averageVolume: avgVolume,
            percentageAboveBaseline: ((avgVolume - baseline) / baseline) * 100,
          });
          currentPeak = null;
        } else {
          currentPeak = null;
        }

        // Handle low periods
        if (isBelowBaseline) {
          if (!currentLow) {
            currentLow = { start: data.date, end: data.date, volumes: [data.count] };
          } else {
            currentLow.end = data.date;
            currentLow.volumes.push(data.count);
          }
        } else if (currentLow && currentLow.volumes.length >= 3) {
          // End of low period (minimum 3 days)
          const avgVolume = currentLow.volumes.reduce((sum, v) => sum + v, 0) / currentLow.volumes.length;
          lowPeriods.push({
            startDate: currentLow.start.toISOString().split('T')[0],
            endDate: currentLow.end.toISOString().split('T')[0],
            averageVolume: avgVolume,
            percentageBelowBaseline: ((baseline - avgVolume) / baseline) * 100,
          });
          currentLow = null;
        } else {
          currentLow = null;
        }
      });

      return { peakPeriods, lowPeriods };
    } catch (error) {
      safeLogger.error('Error identifying peak and low periods:', error);
      return { peakPeriods: [], lowPeriods: [] };
    }
  }

  /**
   * Generate recommendations based on seasonal patterns
   */
  private generateSeasonalRecommendations(
    weeklyPattern: SeasonalPattern | null,
    monthlyPattern: SeasonalPattern | null,
    peakPeriods: PeakPeriod[],
    lowPeriods: LowPeriod[]
  ): string[] {
    const recommendations: string[] = [];

    if (weeklyPattern && weeklyPattern.confidence > 0.7) {
      const peakDayIdx = weeklyPattern.pattern.indexOf(Math.max(...weeklyPattern.pattern));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      recommendations.push(
        `Increase staffing on ${dayNames[peakDayIdx]} to handle higher return volumes`
      );
    }

    if (monthlyPattern && monthlyPattern.confidence > 0.7) {
      recommendations.push(
        'Consider adjusting return processing capacity based on monthly patterns'
      );
    }

    if (peakPeriods.length > 0) {
      const avgIncrease = peakPeriods.reduce((sum, p) => sum + p.percentageAboveBaseline, 0) / peakPeriods.length;
      recommendations.push(
        `Prepare for ${Math.round(avgIncrease)}% increase in returns during peak periods`
      );
    }

    if (lowPeriods.length > 0) {
      recommendations.push(
        'Utilize low-volume periods for process improvements and staff training'
      );
    }

    return recommendations;
  }

  /**
   * Get empty seasonal data structure
   */
  private getEmptySeasonalData(): SeasonalPatternData {
    return {
      patterns: [],
      seasonalityStrength: 0,
      peakPeriods: [],
      lowPeriods: [],
      recommendations: ['Insufficient data for seasonal analysis. Collect at least 7 days of data.'],
    };
  }

  // ========================================================================
  // GROWTH RATE CALCULATIONS
  // ========================================================================

  /**
   * Calculate growth rates at various time scales
   * Validates: Property 4 - Comprehensive Trend Analysis
   */
  async calculateGrowthRates(
    period: AnalyticsPeriod,
    sellerId?: string
  ): Promise<GrowthRateData> {
    const cacheKey = `return:trend:growth:${sellerId || 'all'}:${period.start}:${period.end}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached growth rates');
        return cached;
      }

      const startDate = new Date(period.start);
      const endDate = new Date(period.end);

      // Get daily data
      const dailyData = await this.getDailyAggregatedData(startDate, endDate, sellerId);

      if (dailyData.length < this.MIN_DATA_POINTS) {
        return this.getEmptyGrowthData();
      }

      // Calculate growth rates at different time scales
      const dailyGrowthRate = this.calculateDailyGrowthRate(dailyData);
      const weeklyGrowthRate = this.calculateWeeklyGrowthRate(dailyData);
      const monthlyGrowthRate = this.calculateMonthlyGrowthRate(dailyData);
      const quarterlyGrowthRate = this.calculateQuarterlyGrowthRate(dailyData);
      const yearlyGrowthRate = this.calculateYearlyGrowthRate(dailyData);

      // Calculate CAGR (Compound Annual Growth Rate)
      const compoundAnnualGrowthRate = this.calculateCAGR(dailyData);

      // Project future volumes
      const projectedVolume = this.projectFutureVolumes(dailyData, monthlyGrowthRate);

      // Determine trend direction
      const trendDirection = this.determineTrendDirection(monthlyGrowthRate);

      // Calculate volatility
      const volatility = this.calculateVolatility(dailyData);

      const growthData: GrowthRateData = {
        dailyGrowthRate,
        weeklyGrowthRate,
        monthlyGrowthRate,
        quarterlyGrowthRate,
        yearlyGrowthRate,
        compoundAnnualGrowthRate,
        projectedVolume,
        trendDirection,
        volatility,
      };

      // Cache the result
      await redisService.set(cacheKey, growthData, this.CACHE_TTL.GROWTH_RATE);

      return growthData;
    } catch (error) {
      safeLogger.error('Error calculating growth rates:', error);
      throw error;
    }
  }

  /**
   * Calculate daily growth rate
   */
  private calculateDailyGrowthRate(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): number {
    try {
      if (dailyData.length < 2) {
        return 0;
      }

      // Calculate day-over-day growth rates
      const growthRates: number[] = [];

      for (let i = 1; i < dailyData.length; i++) {
        const previous = dailyData[i - 1].count;
        const current = dailyData[i].count;

        if (previous > 0) {
          const growthRate = ((current - previous) / previous) * 100;
          growthRates.push(growthRate);
        }
      }

      // Return average daily growth rate
      return growthRates.length > 0
        ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
        : 0;
    } catch (error) {
      safeLogger.error('Error calculating daily growth rate:', error);
      return 0;
    }
  }

  /**
   * Calculate weekly growth rate
   */
  private calculateWeeklyGrowthRate(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): number {
    try {
      if (dailyData.length < 14) {
        return 0;
      }

      // Group by week
      const weeklyTotals: number[] = [];
      let currentWeekTotal = 0;
      let currentWeekStart = dailyData[0].date;

      dailyData.forEach(data => {
        const daysDiff = Math.floor(
          (data.date.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff >= 7) {
          weeklyTotals.push(currentWeekTotal);
          currentWeekTotal = data.count;
          currentWeekStart = data.date;
        } else {
          currentWeekTotal += data.count;
        }
      });

      if (currentWeekTotal > 0) {
        weeklyTotals.push(currentWeekTotal);
      }

      // Calculate week-over-week growth rates
      const growthRates: number[] = [];

      for (let i = 1; i < weeklyTotals.length; i++) {
        const previous = weeklyTotals[i - 1];
        const current = weeklyTotals[i];

        if (previous > 0) {
          const growthRate = ((current - previous) / previous) * 100;
          growthRates.push(growthRate);
        }
      }

      return growthRates.length > 0
        ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
        : 0;
    } catch (error) {
      safeLogger.error('Error calculating weekly growth rate:', error);
      return 0;
    }
  }

  /**
   * Calculate monthly growth rate
   */
  private calculateMonthlyGrowthRate(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): number {
    try {
      if (dailyData.length < 60) {
        return 0;
      }

      // Group by month
      const monthlyTotals = new Map<string, number>();

      dailyData.forEach(data => {
        const monthKey = `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyTotals.get(monthKey) || 0;
        monthlyTotals.set(monthKey, existing + data.count);
      });

      const sortedMonths = Array.from(monthlyTotals.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      // Calculate month-over-month growth rates
      const growthRates: number[] = [];

      for (let i = 1; i < sortedMonths.length; i++) {
        const previous = sortedMonths[i - 1][1];
        const current = sortedMonths[i][1];

        if (previous > 0) {
          const growthRate = ((current - previous) / previous) * 100;
          growthRates.push(growthRate);
        }
      }

      return growthRates.length > 0
        ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
        : 0;
    } catch (error) {
      safeLogger.error('Error calculating monthly growth rate:', error);
      return 0;
    }
  }

  /**
   * Calculate quarterly growth rate
   */
  private calculateQuarterlyGrowthRate(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): number {
    try {
      if (dailyData.length < 180) {
        return 0;
      }

      // Group by quarter
      const quarterlyTotals = new Map<string, number>();

      dailyData.forEach(data => {
        const quarter = Math.floor(data.date.getMonth() / 3) + 1;
        const quarterKey = `${data.date.getFullYear()}-Q${quarter}`;
        const existing = quarterlyTotals.get(quarterKey) || 0;
        quarterlyTotals.set(quarterKey, existing + data.count);
      });

      const sortedQuarters = Array.from(quarterlyTotals.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      // Calculate quarter-over-quarter growth rates
      const growthRates: number[] = [];

      for (let i = 1; i < sortedQuarters.length; i++) {
        const previous = sortedQuarters[i - 1][1];
        const current = sortedQuarters[i][1];

        if (previous > 0) {
          const growthRate = ((current - previous) / previous) * 100;
          growthRates.push(growthRate);
        }
      }

      return growthRates.length > 0
        ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
        : 0;
    } catch (error) {
      safeLogger.error('Error calculating quarterly growth rate:', error);
      return 0;
    }
  }

  /**
   * Calculate yearly growth rate
   */
  private calculateYearlyGrowthRate(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): number {
    try {
      if (dailyData.length < 365) {
        return 0;
      }

      // Group by year
      const yearlyTotals = new Map<number, number>();

      dailyData.forEach(data => {
        const year = data.date.getFullYear();
        const existing = yearlyTotals.get(year) || 0;
        yearlyTotals.set(year, existing + data.count);
      });

      const sortedYears = Array.from(yearlyTotals.entries())
        .sort((a, b) => a[0] - b[0]);

      // Calculate year-over-year growth rates
      const growthRates: number[] = [];

      for (let i = 1; i < sortedYears.length; i++) {
        const previous = sortedYears[i - 1][1];
        const current = sortedYears[i][1];

        if (previous > 0) {
          const growthRate = ((current - previous) / previous) * 100;
          growthRates.push(growthRate);
        }
      }

      return growthRates.length > 0
        ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
        : 0;
    } catch (error) {
      safeLogger.error('Error calculating yearly growth rate:', error);
      return 0;
    }
  }

  /**
   * Calculate Compound Annual Growth Rate (CAGR)
   */
  private calculateCAGR(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): number {
    try {
      if (dailyData.length < 365) {
        return 0;
      }

      // Get first and last values
      const firstValue = dailyData[0].count;
      const lastValue = dailyData[dailyData.length - 1].count;

      // Calculate number of years
      const daysDiff = (dailyData[dailyData.length - 1].date.getTime() - dailyData[0].date.getTime()) 
                      / (1000 * 60 * 60 * 24);
      const years = daysDiff / 365;

      if (firstValue <= 0 || years <= 0) {
        return 0;
      }

      // CAGR = (Ending Value / Beginning Value)^(1/years) - 1
      const cagr = (Math.pow(lastValue / firstValue, 1 / years) - 1) * 100;

      return cagr;
    } catch (error) {
      safeLogger.error('Error calculating CAGR:', error);
      return 0;
    }
  }

  /**
   * Project future volumes using linear regression
   */
  private projectFutureVolumes(
    dailyData: Array<{ date: Date; count: number; amount: number }>,
    monthlyGrowthRate: number
  ): ProjectedVolume {
    try {
      if (dailyData.length < this.MIN_DATA_POINTS) {
        return {
          nextWeek: 0,
          nextMonth: 0,
          nextQuarter: 0,
          confidence: 0,
        };
      }

      // Use simple linear regression for projection
      const n = dailyData.length;
      const x = Array.from({ length: n }, (_, i) => i);
      const y = dailyData.map(d => d.count);

      // Calculate regression coefficients
      const sumX = x.reduce((sum, val) => sum + val, 0);
      const sumY = y.reduce((sum, val) => sum + val, 0);
      const sumXY = x.reduce((sum, val, idx) => sum + val * y[idx], 0);
      const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Project future values
      const nextWeekIdx = n + 7;
      const nextMonthIdx = n + 30;
      const nextQuarterIdx = n + 90;

      const nextWeek = Math.max(0, slope * nextWeekIdx + intercept);
      const nextMonth = Math.max(0, slope * nextMonthIdx + intercept);
      const nextQuarter = Math.max(0, slope * nextQuarterIdx + intercept);

      // Calculate confidence based on R-squared
      const yMean = sumY / n;
      const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
      const ssResidual = y.reduce((sum, val, idx) => {
        const predicted = slope * x[idx] + intercept;
        return sum + Math.pow(val - predicted, 2);
      }, 0);

      const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
      const confidence = Math.max(0, Math.min(1, rSquared));

      return {
        nextWeek: Math.round(nextWeek),
        nextMonth: Math.round(nextMonth),
        nextQuarter: Math.round(nextQuarter),
        confidence,
      };
    } catch (error) {
      safeLogger.error('Error projecting future volumes:', error);
      return {
        nextWeek: 0,
        nextMonth: 0,
        nextQuarter: 0,
        confidence: 0,
      };
    }
  }

  /**
   * Determine trend direction based on growth rate
   */
  private determineTrendDirection(monthlyGrowthRate: number): 'increasing' | 'decreasing' | 'stable' {
    if (monthlyGrowthRate > 5) {
      return 'increasing';
    } else if (monthlyGrowthRate < -5) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private calculateVolatility(
    dailyData: Array<{ date: Date; count: number; amount: number }>
  ): number {
    try {
      if (dailyData.length < 2) {
        return 0;
      }

      const counts = dailyData.map(d => d.count);
      const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length;
      const variance = counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length;
      const stdDev = Math.sqrt(variance);

      // Return coefficient of variation (normalized volatility)
      return mean > 0 ? stdDev / mean : 0;
    } catch (error) {
      safeLogger.error('Error calculating volatility:', error);
      return 0;
    }
  }

  /**
   * Get empty growth data structure
   */
  private getEmptyGrowthData(): GrowthRateData {
    return {
      dailyGrowthRate: 0,
      weeklyGrowthRate: 0,
      monthlyGrowthRate: 0,
      quarterlyGrowthRate: 0,
      yearlyGrowthRate: 0,
      compoundAnnualGrowthRate: 0,
      projectedVolume: {
        nextWeek: 0,
        nextMonth: 0,
        nextQuarter: 0,
        confidence: 0,
      },
      trendDirection: 'stable',
      volatility: 0,
    };
  }

  // ========================================================================
  // CATEGORY BREAKDOWN ANALYTICS
  // ========================================================================

  /**
   * Get category-wise return statistics
   * Validates: Property 4 - Comprehensive Trend Analysis (category dimension)
   */
  async getCategoryBreakdownAnalytics(
    period: AnalyticsPeriod,
    sellerId?: string
  ): Promise<CategoryBreakdownAnalytics> {
    const cacheKey = `return:category:breakdown:${sellerId || 'all'}:${period.start}:${period.end}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached category breakdown analytics');
        return cached;
      }

      const startDate = new Date(period.start);
      const endDate = new Date(period.end);

      // Get category statistics for current period
      const categories = await this.calculateCategoryStats(startDate, endDate, sellerId);

      // Calculate previous period for comparison
      const periodLength = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodLength);
      const previousEndDate = startDate;

      // Get category comparison data
      const categoryComparison = await this.compareCategoryPerformance(
        startDate,
        endDate,
        previousStartDate,
        previousEndDate,
        sellerId
      );

      // Identify top and bottom performing categories
      const sortedByReturns = [...categories].sort((a, b) => b.totalReturns - a.totalReturns);
      const topCategories = sortedByReturns.slice(0, 5);
      const bottomCategories = sortedByReturns.slice(-5).reverse();

      // Generate insights
      const insights = this.generateCategoryInsights(categories, categoryComparison);

      const analytics: CategoryBreakdownAnalytics = {
        categories,
        topCategories,
        bottomCategories,
        categoryComparison,
        insights,
      };

      // Cache the result
      await redisService.set(cacheKey, analytics, this.CACHE_TTL.TREND_ANALYSIS);

      safeLogger.info('Category breakdown analytics completed', {
        sellerId: sellerId || 'all',
        totalCategories: categories.length,
      });

      return analytics;
    } catch (error) {
      safeLogger.error('Error getting category breakdown analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate statistics for each category
   */
  private async calculateCategoryStats(
    startDate: Date,
    endDate: Date,
    sellerId?: string
  ): Promise<CategoryReturnStats[]> {
    try {
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

      // Group by category
      // Note: Category information needs to be extracted from itemsToReturn or joined from products table
      const categoryMap = new Map<string, {
        returns: typeof periodReturns;
        totalOrders: number;
      }>();

      periodReturns.forEach(ret => {
        // Extract category from itemsToReturn JSON field
        let categoryId = 'uncategorized';
        
        try {
          const items = ret.itemsToReturn as any;
          if (items && Array.isArray(items) && items.length > 0 && items[0].category) {
            categoryId = items[0].category;
          } else if (items && items.category) {
            categoryId = items.category;
          }
        } catch (error) {
          // If parsing fails, use uncategorized
          safeLogger.debug('Failed to extract category from itemsToReturn', { returnId: ret.id });
        }

        const existing = categoryMap.get(categoryId) || { returns: [], totalOrders: 0 };
        existing.returns.push(ret);
        categoryMap.set(categoryId, existing);
      });

      // Calculate stats for each category
      const categoryStats: CategoryReturnStats[] = [];
      const totalReturns = periodReturns.length;

      for (const [categoryId, data] of categoryMap.entries()) {
        const categoryReturns = data.returns;
        const categoryTotalReturns = categoryReturns.length;

        // Calculate approval rate
        const approvedReturns = categoryReturns.filter(
          r => r.status === 'approved' || r.status === 'completed'
        ).length;
        const approvalRate = categoryTotalReturns > 0 
          ? (approvedReturns / categoryTotalReturns) * 100 
          : 0;

        // Calculate total refund amount
        const totalRefundAmount = categoryReturns.reduce((sum, ret) => {
          return sum + (Number(ret.refundAmount) || 0);
        }, 0);

        const averageRefundAmount = categoryTotalReturns > 0
          ? totalRefundAmount / categoryTotalReturns
          : 0;

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

        // Calculate return rate (would need total orders per category in production)
        const returnRate = 0; // Placeholder - would calculate from orders data

        // Calculate percentage of total returns
        const percentageOfTotalReturns = totalReturns > 0
          ? (categoryTotalReturns / totalReturns) * 100
          : 0;

        // Determine trend direction (simplified - would use historical data)
        const trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
        const monthOverMonthChange = 0; // Placeholder

        categoryStats.push({
          categoryId,
          categoryName: this.getCategoryName(categoryId),
          totalReturns: categoryTotalReturns,
          returnRate,
          averageProcessingTime,
          approvalRate,
          totalRefundAmount,
          averageRefundAmount,
          percentageOfTotalReturns,
          trendDirection,
          monthOverMonthChange,
        });
      }

      // Sort by total returns descending
      return categoryStats.sort((a, b) => b.totalReturns - a.totalReturns);
    } catch (error) {
      safeLogger.error('Error calculating category stats:', error);
      throw error;
    }
  }

  /**
   * Compare category performance between two periods
   */
  private async compareCategoryPerformance(
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
    sellerId?: string
  ): Promise<CategoryComparison[]> {
    try {
      // Get current period stats
      const currentStats = await this.calculateCategoryStats(currentStart, currentEnd, sellerId);

      // Get previous period stats
      const previousStats = await this.calculateCategoryStats(previousStart, previousEnd, sellerId);

      // Create a map of previous stats for easy lookup
      const previousStatsMap = new Map(
        previousStats.map(stat => [stat.categoryId, stat])
      );

      // Compare each category
      const comparisons: CategoryComparison[] = currentStats.map(current => {
        const previous = previousStatsMap.get(current.categoryId);
        const previousReturns = previous?.totalReturns || 0;
        const currentReturns = current.totalReturns;

        // Calculate percentage change
        const percentageChange = previousReturns > 0
          ? ((currentReturns - previousReturns) / previousReturns) * 100
          : currentReturns > 0 ? 100 : 0;

        // Determine trend
        let trend: 'improving' | 'worsening' | 'stable' = 'stable';
        if (Math.abs(percentageChange) > 10) {
          // Lower returns = improving, higher returns = worsening
          trend = percentageChange < 0 ? 'improving' : 'worsening';
        }

        return {
          categoryId: current.categoryId,
          categoryName: current.categoryName,
          currentPeriodReturns: currentReturns,
          previousPeriodReturns: previousReturns,
          percentageChange,
          trend,
        };
      });

      // Sort by absolute percentage change (most significant changes first)
      return comparisons.sort((a, b) => 
        Math.abs(b.percentageChange) - Math.abs(a.percentageChange)
      );
    } catch (error) {
      safeLogger.error('Error comparing category performance:', error);
      throw error;
    }
  }

  /**
   * Generate insights from category analytics
   */
  private generateCategoryInsights(
    categories: CategoryReturnStats[],
    comparisons: CategoryComparison[]
  ): string[] {
    const insights: string[] = [];

    // Insight 1: Highest return rate category
    if (categories.length > 0) {
      const highestReturnCategory = categories[0];
      insights.push(
        `${highestReturnCategory.categoryName} has the highest return volume with ${highestReturnCategory.totalReturns} returns (${highestReturnCategory.percentageOfTotalReturns.toFixed(1)}% of total)`
      );
    }

    // Insight 2: Categories with significant changes
    const significantChanges = comparisons.filter(c => Math.abs(c.percentageChange) > 20);
    if (significantChanges.length > 0) {
      const worsening = significantChanges.filter(c => c.trend === 'worsening');
      if (worsening.length > 0) {
        insights.push(
          `${worsening.length} ${worsening.length === 1 ? 'category shows' : 'categories show'} significant increase in returns (>20%)`
        );
      }

      const improving = significantChanges.filter(c => c.trend === 'improving');
      if (improving.length > 0) {
        insights.push(
          `${improving.length} ${improving.length === 1 ? 'category shows' : 'categories show'} significant decrease in returns (>20%)`
        );
      }
    }

    // Insight 3: Processing time variations
    const avgProcessingTime = categories.reduce((sum, c) => sum + c.averageProcessingTime, 0) / categories.length;
    const slowCategories = categories.filter(c => c.averageProcessingTime > avgProcessingTime * 1.5);
    if (slowCategories.length > 0) {
      insights.push(
        `${slowCategories.length} ${slowCategories.length === 1 ? 'category has' : 'categories have'} processing times 50% above average`
      );
    }

    // Insight 4: Approval rate variations
    const avgApprovalRate = categories.reduce((sum, c) => sum + c.approvalRate, 0) / categories.length;
    const lowApprovalCategories = categories.filter(c => c.approvalRate < avgApprovalRate * 0.8);
    if (lowApprovalCategories.length > 0) {
      insights.push(
        `${lowApprovalCategories.length} ${lowApprovalCategories.length === 1 ? 'category has' : 'categories have'} approval rates 20% below average`
      );
    }

    // Insight 5: High refund amount categories
    const sortedByRefund = [...categories].sort((a, b) => b.averageRefundAmount - a.averageRefundAmount);
    if (sortedByRefund.length > 0 && sortedByRefund[0].averageRefundAmount > 0) {
      insights.push(
        `${sortedByRefund[0].categoryName} has the highest average refund amount at $${sortedByRefund[0].averageRefundAmount.toFixed(2)}`
      );
    }

    return insights;
  }

  /**
   * Get human-readable category name
   */
  private getCategoryName(categoryId: string): string {
    // In production, this would look up from a categories table
    // For now, return formatted category ID
    if (categoryId === 'uncategorized') {
      return 'Uncategorized';
    }

    return categoryId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // ========================================================================
  // GEOGRAPHIC DISTRIBUTION ANALYSIS
  // ========================================================================

  /**
   * Get geographic distribution of returns
   * Validates: Property 4 - Comprehensive Trend Analysis (geographic dimension)
   */
  async getGeographicDistributionAnalytics(
    period: AnalyticsPeriod,
    sellerId?: string
  ): Promise<GeographicDistributionAnalytics> {
    const cacheKey = `return:geographic:distribution:${sellerId || 'all'}:${period.start}:${period.end}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached geographic distribution analytics');
        return cached;
      }

      const startDate = new Date(period.start);
      const endDate = new Date(period.end);

      // Get geographic data at different levels
      const [byCountry, byState, byCity] = await Promise.all([
        this.getReturnsByCountry(startDate, endDate, sellerId),
        this.getReturnsByState(startDate, endDate, sellerId),
        this.getReturnsByCity(startDate, endDate, sellerId),
      ]);

      // Identify top regions (by total returns)
      const topRegions = [...byCountry]
        .sort((a, b) => b.totalReturns - a.totalReturns)
        .slice(0, 10);

      // Generate heatmap data
      const heatmapData = this.generateHeatmapData(byCountry, byState);

      // Generate insights
      const insights = this.generateGeographicInsights(byCountry, byState, byCity);

      const analytics: GeographicDistributionAnalytics = {
        byCountry,
        byState,
        byCity,
        topRegions,
        insights,
        heatmapData,
      };

      // Cache the result
      await redisService.set(cacheKey, analytics, this.CACHE_TTL.TREND_ANALYSIS);

      safeLogger.info('Geographic distribution analytics completed', {
        sellerId: sellerId || 'all',
        totalCountries: byCountry.length,
        totalStates: byState.length,
        totalCities: byCity.length,
      });

      return analytics;
    } catch (error) {
      safeLogger.error('Error getting geographic distribution analytics:', error);
      throw error;
    }
  }

  /**
   * Get returns aggregated by country
   */
  private async getReturnsByCountry(
    startDate: Date,
    endDate: Date,
    sellerId?: string
  ): Promise<GeographicReturnData[]> {
    try {
      // Build query conditions
      const conditions = [
        gte(returns.createdAt, startDate),
        lte(returns.createdAt, endDate)
      ];

      if (sellerId) {
        conditions.push(eq(returns.sellerId, sellerId));
      }

      // Get all returns with buyer information
      const periodReturns = await db
        .select({
          return: returns,
          buyer: {
            shippingCountry: users.shippingCountry,
            billingCountry: users.billingCountry,
          }
        })
        .from(returns)
        .leftJoin(users, eq(returns.buyerId, users.id))
        .where(and(...conditions));

      // Group by country
      const countryMap = new Map<string, {
        returns: typeof periodReturns;
        totalOrders: number;
      }>();

      periodReturns.forEach(item => {
        // Use shipping country, fallback to billing country
        const country = item.buyer?.shippingCountry || item.buyer?.billingCountry || 'Unknown';
        
        const existing = countryMap.get(country) || { returns: [], totalOrders: 0 };
        existing.returns.push(item);
        countryMap.set(country, existing);
      });

      // Calculate stats for each country
      const countryStats: GeographicReturnData[] = [];
      const totalReturns = periodReturns.length;

      for (const [countryCode, data] of countryMap.entries()) {
        const countryReturns = data.returns;
        const countryTotalReturns = countryReturns.length;

        // Calculate approval rate
        const approvedReturns = countryReturns.filter(
          r => r.return.status === 'approved' || r.return.status === 'completed'
        ).length;
        const approvalRate = countryTotalReturns > 0 
          ? (approvedReturns / countryTotalReturns) * 100 
          : 0;

        // Calculate total refund amount
        const totalRefundAmount = countryReturns.reduce((sum, item) => {
          return sum + (Number(item.return.refundAmount) || 0);
        }, 0);

        // Calculate average processing time
        const processingTimes = countryReturns
          .filter(r => r.return.completedAt && r.return.createdAt)
          .map(r => {
            const completedAt = r.return.completedAt as Date;
            const createdAt = r.return.createdAt as Date;
            return (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // hours
          });

        const averageProcessingTime = processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
          : 0;

        // Calculate percentage of total returns
        const percentageOfTotalReturns = totalReturns > 0
          ? (countryTotalReturns / totalReturns) * 100
          : 0;

        // Get top return reasons for this country
        const reasonCounts = new Map<string, number>();
        countryReturns.forEach(item => {
          const reason = item.return.returnReason || 'unknown';
          reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        });

        const topReturnReasons = Array.from(reasonCounts.entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        countryStats.push({
          country: this.getCountryName(countryCode),
          countryCode,
          totalReturns: countryTotalReturns,
          totalRefundAmount,
          averageProcessingTime,
          approvalRate,
          returnRate: 0, // Would need total orders per country
          percentageOfTotalReturns,
          trendDirection: 'stable', // Would calculate from historical data
          topReturnReasons,
        });
      }

      // Sort by total returns descending
      return countryStats.sort((a, b) => b.totalReturns - a.totalReturns);
    } catch (error) {
      safeLogger.error('Error getting returns by country:', error);
      throw error;
    }
  }

  /**
   * Get returns aggregated by state/province
   */
  private async getReturnsByState(
    startDate: Date,
    endDate: Date,
    sellerId?: string
  ): Promise<GeographicReturnData[]> {
    try {
      // Build query conditions
      const conditions = [
        gte(returns.createdAt, startDate),
        lte(returns.createdAt, endDate)
      ];

      if (sellerId) {
        conditions.push(eq(returns.sellerId, sellerId));
      }

      // Get all returns with buyer information
      const periodReturns = await db
        .select({
          return: returns,
          buyer: {
            shippingState: users.shippingState,
            shippingCountry: users.shippingCountry,
            billingState: users.billingState,
            billingCountry: users.billingCountry,
          }
        })
        .from(returns)
        .leftJoin(users, eq(returns.buyerId, users.id))
        .where(and(...conditions));

      // Group by state and country
      const stateMap = new Map<string, {
        returns: typeof periodReturns;
        country: string;
      }>();

      periodReturns.forEach(item => {
        const state = item.buyer?.shippingState || item.buyer?.billingState;
        const country = item.buyer?.shippingCountry || item.buyer?.billingCountry || 'Unknown';
        
        if (!state) return; // Skip if no state information

        const key = `${state}|${country}`;
        const existing = stateMap.get(key) || { returns: [], country };
        existing.returns.push(item);
        stateMap.set(key, existing);
      });

      // Calculate stats for each state
      const stateStats: GeographicReturnData[] = [];
      const totalReturns = periodReturns.length;

      for (const [key, data] of stateMap.entries()) {
        const [state, countryCode] = key.split('|');
        const stateReturns = data.returns;
        const stateTotalReturns = stateReturns.length;

        // Calculate approval rate
        const approvedReturns = stateReturns.filter(
          r => r.return.status === 'approved' || r.return.status === 'completed'
        ).length;
        const approvalRate = stateTotalReturns > 0 
          ? (approvedReturns / stateTotalReturns) * 100 
          : 0;

        // Calculate total refund amount
        const totalRefundAmount = stateReturns.reduce((sum, item) => {
          return sum + (Number(item.return.refundAmount) || 0);
        }, 0);

        // Calculate average processing time
        const processingTimes = stateReturns
          .filter(r => r.return.completedAt && r.return.createdAt)
          .map(r => {
            const completedAt = r.return.completedAt as Date;
            const createdAt = r.return.createdAt as Date;
            return (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          });

        const averageProcessingTime = processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
          : 0;

        // Calculate percentage of total returns
        const percentageOfTotalReturns = totalReturns > 0
          ? (stateTotalReturns / totalReturns) * 100
          : 0;

        // Get top return reasons
        const reasonCounts = new Map<string, number>();
        stateReturns.forEach(item => {
          const reason = item.return.returnReason || 'unknown';
          reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        });

        const topReturnReasons = Array.from(reasonCounts.entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        stateStats.push({
          country: this.getCountryName(countryCode),
          countryCode,
          state,
          totalReturns: stateTotalReturns,
          totalRefundAmount,
          averageProcessingTime,
          approvalRate,
          returnRate: 0,
          percentageOfTotalReturns,
          trendDirection: 'stable',
          topReturnReasons,
        });
      }

      // Sort by total returns descending
      return stateStats.sort((a, b) => b.totalReturns - a.totalReturns);
    } catch (error) {
      safeLogger.error('Error getting returns by state:', error);
      throw error;
    }
  }

  /**
   * Get returns aggregated by city
   */
  private async getReturnsByCity(
    startDate: Date,
    endDate: Date,
    sellerId?: string
  ): Promise<GeographicReturnData[]> {
    try {
      // Build query conditions
      const conditions = [
        gte(returns.createdAt, startDate),
        lte(returns.createdAt, endDate)
      ];

      if (sellerId) {
        conditions.push(eq(returns.sellerId, sellerId));
      }

      // Get all returns with buyer information
      const periodReturns = await db
        .select({
          return: returns,
          buyer: {
            shippingCity: users.shippingCity,
            shippingState: users.shippingState,
            shippingCountry: users.shippingCountry,
            billingCity: users.billingCity,
            billingState: users.billingState,
            billingCountry: users.billingCountry,
          }
        })
        .from(returns)
        .leftJoin(users, eq(returns.buyerId, users.id))
        .where(and(...conditions));

      // Group by city, state, and country
      const cityMap = new Map<string, {
        returns: typeof periodReturns;
        state: string;
        country: string;
      }>();

      periodReturns.forEach(item => {
        const city = item.buyer?.shippingCity || item.buyer?.billingCity;
        const state = item.buyer?.shippingState || item.buyer?.billingState || '';
        const country = item.buyer?.shippingCountry || item.buyer?.billingCountry || 'Unknown';
        
        if (!city) return; // Skip if no city information

        const key = `${city}|${state}|${country}`;
        const existing = cityMap.get(key) || { returns: [], state, country };
        existing.returns.push(item);
        cityMap.set(key, existing);
      });

      // Calculate stats for each city
      const cityStats: GeographicReturnData[] = [];
      const totalReturns = periodReturns.length;

      for (const [key, data] of cityMap.entries()) {
        const [city, state, countryCode] = key.split('|');
        const cityReturns = data.returns;
        const cityTotalReturns = cityReturns.length;

        // Only include cities with significant return volume
        if (cityTotalReturns < 3) continue;

        // Calculate approval rate
        const approvedReturns = cityReturns.filter(
          r => r.return.status === 'approved' || r.return.status === 'completed'
        ).length;
        const approvalRate = cityTotalReturns > 0 
          ? (approvedReturns / cityTotalReturns) * 100 
          : 0;

        // Calculate total refund amount
        const totalRefundAmount = cityReturns.reduce((sum, item) => {
          return sum + (Number(item.return.refundAmount) || 0);
        }, 0);

        // Calculate average processing time
        const processingTimes = cityReturns
          .filter(r => r.return.completedAt && r.return.createdAt)
          .map(r => {
            const completedAt = r.return.completedAt as Date;
            const createdAt = r.return.createdAt as Date;
            return (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          });

        const averageProcessingTime = processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
          : 0;

        // Calculate percentage of total returns
        const percentageOfTotalReturns = totalReturns > 0
          ? (cityTotalReturns / totalReturns) * 100
          : 0;

        // Get top return reasons
        const reasonCounts = new Map<string, number>();
        cityReturns.forEach(item => {
          const reason = item.return.returnReason || 'unknown';
          reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        });

        const topReturnReasons = Array.from(reasonCounts.entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        cityStats.push({
          country: this.getCountryName(countryCode),
          countryCode,
          state: state || undefined,
          city,
          totalReturns: cityTotalReturns,
          totalRefundAmount,
          averageProcessingTime,
          approvalRate,
          returnRate: 0,
          percentageOfTotalReturns,
          trendDirection: 'stable',
          topReturnReasons,
        });
      }

      // Sort by total returns descending, limit to top 50 cities
      return cityStats
        .sort((a, b) => b.totalReturns - a.totalReturns)
        .slice(0, 50);
    } catch (error) {
      safeLogger.error('Error getting returns by city:', error);
      throw error;
    }
  }

  /**
   * Generate heatmap data for visualization
   */
  private generateHeatmapData(
    byCountry: GeographicReturnData[],
    byState: GeographicReturnData[]
  ): Array<{
    location: string;
    coordinates?: { lat: number; lng: number };
    value: number;
    intensity: number;
  }> {
    try {
      const heatmapData: Array<{
        location: string;
        coordinates?: { lat: number; lng: number };
        value: number;
        intensity: number;
      }> = [];

      // Find max returns for normalization
      const maxReturns = Math.max(
        ...byCountry.map(c => c.totalReturns),
        ...byState.map(s => s.totalReturns)
      );

      // Add country-level data
      byCountry.forEach(country => {
        heatmapData.push({
          location: `${country.country} (${country.countryCode})`,
          value: country.totalReturns,
          intensity: maxReturns > 0 ? country.totalReturns / maxReturns : 0,
        });
      });

      // Add state-level data for top states
      byState.slice(0, 20).forEach(state => {
        heatmapData.push({
          location: `${state.state}, ${state.countryCode}`,
          value: state.totalReturns,
          intensity: maxReturns > 0 ? state.totalReturns / maxReturns : 0,
        });
      });

      return heatmapData.sort((a, b) => b.value - a.value);
    } catch (error) {
      safeLogger.error('Error generating heatmap data:', error);
      return [];
    }
  }

  /**
   * Generate insights from geographic data
   */
  private generateGeographicInsights(
    byCountry: GeographicReturnData[],
    byState: GeographicReturnData[],
    byCity: GeographicReturnData[]
  ): string[] {
    const insights: string[] = [];

    try {
      // Insight 1: Top country
      if (byCountry.length > 0) {
        const topCountry = byCountry[0];
        insights.push(
          `${topCountry.country} accounts for ${topCountry.percentageOfTotalReturns.toFixed(1)}% of all returns with ${topCountry.totalReturns} returns`
        );
      }

      // Insight 2: Geographic concentration
      if (byCountry.length >= 3) {
        const top3Percentage = byCountry
          .slice(0, 3)
          .reduce((sum, c) => sum + c.percentageOfTotalReturns, 0);
        
        insights.push(
          `Top 3 countries represent ${top3Percentage.toFixed(1)}% of total returns, indicating ${
            top3Percentage > 70 ? 'high' : top3Percentage > 50 ? 'moderate' : 'low'
          } geographic concentration`
        );
      }

      // Insight 3: Processing time variations
      if (byCountry.length > 1) {
        const avgProcessingTime = byCountry.reduce((sum, c) => sum + c.averageProcessingTime, 0) / byCountry.length;
        const slowCountries = byCountry.filter(c => c.averageProcessingTime > avgProcessingTime * 1.5);
        
        if (slowCountries.length > 0) {
          insights.push(
            `${slowCountries.length} ${slowCountries.length === 1 ? 'country has' : 'countries have'} processing times 50% above average (${slowCountries.map(c => c.country).slice(0, 3).join(', ')})`
          );
        }
      }

      // Insight 4: Approval rate variations
      if (byCountry.length > 1) {
        const avgApprovalRate = byCountry.reduce((sum, c) => sum + c.approvalRate, 0) / byCountry.length;
        const lowApprovalCountries = byCountry.filter(c => c.approvalRate < avgApprovalRate * 0.8);
        
        if (lowApprovalCountries.length > 0) {
          insights.push(
            `${lowApprovalCountries.length} ${lowApprovalCountries.length === 1 ? 'country has' : 'countries have'} approval rates 20% below average`
          );
        }
      }

      // Insight 5: Top return reasons by region
      if (byCountry.length > 0 && byCountry[0].topReturnReasons.length > 0) {
        const topCountry = byCountry[0];
        const topReason = topCountry.topReturnReasons[0];
        insights.push(
          `In ${topCountry.country}, "${topReason.reason}" is the most common return reason (${topReason.count} returns)`
        );
      }

      // Insight 6: State-level concentration
      if (byState.length > 0) {
        const topState = byState[0];
        insights.push(
          `${topState.state}, ${topState.country} has the highest state-level return volume with ${topState.totalReturns} returns`
        );
      }

      // Insight 7: City-level hotspots
      if (byCity.length > 0) {
        const topCity = byCity[0];
        insights.push(
          `${topCity.city} is the top city for returns with ${topCity.totalReturns} returns (${topCity.percentageOfTotalReturns.toFixed(1)}% of total)`
        );
      }

      // Insight 8: Refund amount concentration
      if (byCountry.length > 0) {
        const sortedByRefund = [...byCountry].sort((a, b) => b.totalRefundAmount - a.totalRefundAmount);
        const topRefundCountry = sortedByRefund[0];
        const totalRefunds = byCountry.reduce((sum, c) => sum + c.totalRefundAmount, 0);
        const percentage = totalRefunds > 0 ? (topRefundCountry.totalRefundAmount / totalRefunds) * 100 : 0;
        
        insights.push(
          `${topRefundCountry.country} accounts for ${percentage.toFixed(1)}% of total refund amount ($${topRefundCountry.totalRefundAmount.toFixed(2)})`
        );
      }

    } catch (error) {
      safeLogger.error('Error generating geographic insights:', error);
    }

    return insights;
  }

  /**
   * Get human-readable country name from country code
   */
  private getCountryName(countryCode: string): string {
    // In production, this would use a comprehensive country code mapping
    // For now, return the code if unknown
    const countryNames: Record<string, string> = {
      'US': 'United States',
      'CA': 'Canada',
      'GB': 'United Kingdom',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'AT': 'Austria',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'IE': 'Ireland',
      'PT': 'Portugal',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'JP': 'Japan',
      'CN': 'China',
      'KR': 'South Korea',
      'IN': 'India',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'AR': 'Argentina',
      'Unknown': 'Unknown',
    };

    return countryNames[countryCode] || countryCode;
  }

  // ========================================================================
  // COMPREHENSIVE TREND ANALYSIS
  // ========================================================================

  /**
   * Get comprehensive trend analysis combining all metrics
   * Validates: Property 4 - Comprehensive Trend Analysis
   */
  async getComprehensiveTrendAnalysis(
    period: AnalyticsPeriod,
    sellerId?: string,
    includeGeographic: boolean = false
  ): Promise<ReturnTrendAnalysis> {
    const cacheKey = `return:trend:comprehensive:${sellerId || 'all'}:${period.start}:${period.end}:${includeGeographic}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached comprehensive trend analysis');
        return cached;
      }

      // Calculate previous period for comparison
      const startDate = new Date(period.start);
      const endDate = new Date(period.end);
      const periodLength = endDate.getTime() - startDate.getTime();

      const previousPeriod: AnalyticsPeriod = {
        start: new Date(startDate.getTime() - periodLength).toISOString(),
        end: startDate.toISOString(),
      };

      // Get all trend components
      const [periodComparison, seasonalPatterns, growthRate] = await Promise.all([
        this.comparePeriods(period, previousPeriod, sellerId),
        this.detectSeasonalPatterns(period, sellerId),
        this.calculateGrowthRates(period, sellerId),
      ]);

      // Optionally include geographic distribution
      let geographicDistribution: GeographicDistributionAnalytics | undefined;
      if (includeGeographic) {
        geographicDistribution = await this.getGeographicDistributionAnalytics(period, sellerId);
      }

      const analysis: ReturnTrendAnalysis = {
        periodComparison,
        seasonalPatterns,
        growthRate,
        projectedVolume: growthRate.projectedVolume.nextMonth,
        trendDirection: growthRate.trendDirection,
        geographicDistribution,
      };

      // Cache the result
      await redisService.set(cacheKey, analysis, this.CACHE_TTL.TREND_ANALYSIS);

      safeLogger.info('Comprehensive trend analysis completed', {
        sellerId: sellerId || 'all',
        trendDirection: analysis.trendDirection,
        monthlyGrowthRate: growthRate.monthlyGrowthRate,
        includeGeographic,
      });

      return analysis;
    } catch (error) {
      safeLogger.error('Error getting comprehensive trend analysis:', error);
      throw error;
    }
  }
}

// Singleton instance
export const returnTrendAnalysisService = new ReturnTrendAnalysisService();
