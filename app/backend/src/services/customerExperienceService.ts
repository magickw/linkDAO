import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, gte, lte, desc, count, avg, sum } from 'drizzle-orm';
import { satisfactionTrackingService } from './satisfactionTrackingService';
import { analyticsService } from './analyticsService';

// Interfaces for Customer Experience Analytics
export interface CustomerSatisfactionMetrics {
  overallSatisfaction: number;
  responseRate: number;
  totalSurveys: number;
  satisfactionTrend: number; // Change from previous period
  categoryBreakdown: Array<{
    category: string;
    satisfaction: number;
    volume: number;
    trend: number;
  }>;
}

export interface IssueCorrelation {
  issueType: string;
  frequency: number;
  satisfactionImpact: number;
  resolutionRate: number;
  commonContexts: string[];
}

export interface ExperienceScore {
  score: number;
  components: {
    satisfaction: number;
    easeOfUse: number;
    supportQuality: number;
    valuePerception: number;
  };
  benchmarks: {
    industryAverage: number;
    topPerformers: number;
    ourPercentile: number;
  };
}

export interface ExperienceReport {
  period: {
    start: Date;
    end: Date;
  };
  satisfaction: CustomerSatisfactionMetrics;
  experienceScore: ExperienceScore;
  issueCorrelations: IssueCorrelation[];
  improvementRecommendations: Array<{
    area: string;
    currentScore: number;
    targetScore: number;
    priority: 'high' | 'medium' | 'low';
    actions: string[];
  }>;
}

export interface FeedbackTheme {
  theme: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  frequency: number;
  examples: string[];
  impact: number; // -1 to 1 scale
}

export class CustomerExperienceService {
  /**
   * Create and initialize the Customer Experience Service
   */
  constructor() {
    // Initialize any required resources
  }

  /**
   * Get comprehensive customer satisfaction metrics
   */
  async getSatisfactionMetrics(startDate?: Date, endDate?: Date): Promise<CustomerSatisfactionMetrics> {
    try {
      const timeframe = this.determineTimeframe(startDate, endDate);
      const analytics = await satisfactionTrackingService.getSatisfactionAnalytics(timeframe);
      
      // Calculate category breakdown with trends
      const categoryBreakdown = analytics.categoryBreakdown.map(category => ({
        category: category.category,
        satisfaction: category.averageSatisfaction,
        volume: category.sampleSize,
        trend: this.calculateTrend(category.trends)
      }));
      
      return {
        overallSatisfaction: analytics.averageOverallSatisfaction,
        responseRate: analytics.responseRate,
        totalSurveys: analytics.totalSurveys,
        satisfactionTrend: this.calculateOverallTrend(analytics.satisfactionTrends),
        categoryBreakdown
      };
    } catch (error) {
      safeLogger.error('Error getting satisfaction metrics:', error);
      throw new Error('Failed to retrieve customer satisfaction metrics');
    }
  }

  /**
   * Analyze feedback text to identify themes and insights
   */
  async analyzeFeedback(feedbackTexts: string[]): Promise<FeedbackTheme[]> {
    try {
      const analysis = await satisfactionTrackingService.analyzeFeedback(feedbackTexts);
      
      // Convert to our FeedbackTheme format
      return analysis.themes.map(theme => ({
        theme: theme.theme,
        sentiment: theme.sentiment > 0.1 ? 'positive' : theme.sentiment < -0.1 ? 'negative' : 'neutral',
        frequency: theme.frequency,
        examples: theme.examples,
        impact: theme.sentiment
      }));
    } catch (error) {
      safeLogger.error('Error analyzing feedback:', error);
      throw new Error('Failed to analyze customer feedback');
    }
  }

  /**
   * Calculate experience score based on multiple factors
   */
  async calculateExperienceScore(startDate?: Date, endDate?: Date): Promise<ExperienceScore> {
    try {
      const timeframe = this.determineTimeframe(startDate, endDate);
      const satisfactionAnalytics = await satisfactionTrackingService.getSatisfactionAnalytics(timeframe);
      const overviewMetrics = await analyticsService.getOverviewMetrics(startDate, endDate);
      
      // Calculate component scores
      const satisfaction = satisfactionAnalytics.averageOverallSatisfaction;
      const easeOfUse = this.calculateEaseOfUseScore(overviewMetrics);
      const supportQuality = this.calculateSupportQualityScore(satisfactionAnalytics);
      const valuePerception = this.calculateValuePerceptionScore(overviewMetrics);
      
      // Overall experience score (weighted average)
      const score = (
        satisfaction * 0.4 +
        easeOfUse * 0.25 +
        supportQuality * 0.25 +
        valuePerception * 0.1
      );
      
      // Get benchmarks
      const benchmarks = {
        industryAverage: satisfactionAnalytics.benchmarkComparison.industryAverage,
        topPerformers: satisfactionAnalytics.benchmarkComparison.topPerformerAverage,
        ourPercentile: satisfactionAnalytics.benchmarkComparison.percentileRank
      };
      
      return {
        score,
        components: {
          satisfaction,
          easeOfUse,
          supportQuality,
          valuePerception
        },
        benchmarks
      };
    } catch (error) {
      safeLogger.error('Error calculating experience score:', error);
      throw new Error('Failed to calculate experience score');
    }
  }

  /**
   * Identify issue correlations and their impact on satisfaction
   */
  async identifyIssueCorrelations(startDate?: Date, endDate?: Date): Promise<IssueCorrelation[]> {
    try {
      const timeframe = this.determineTimeframe(startDate, endDate);
      const analytics = await satisfactionTrackingService.getSatisfactionAnalytics(timeframe);
      
      // Extract issue correlations from improvement opportunities
      return analytics.improvementOpportunities.map(opportunity => ({
        issueType: opportunity.area,
        frequency: 100, // This would be calculated from actual data
        satisfactionImpact: this.calculateIssueImpact(opportunity.area, analytics),
        resolutionRate: 0.75, // This would be calculated from actual data
        commonContexts: opportunity.recommendations
      }));
    } catch (error) {
      safeLogger.error('Error identifying issue correlations:', error);
      throw new Error('Failed to identify issue correlations');
    }
  }

  /**
   * Generate comprehensive experience report
   */
  async generateExperienceReport(startDate?: Date, endDate?: Date): Promise<ExperienceReport> {
    try {
      const start = startDate || this.getDefaultStartDate();
      const end = endDate || new Date();
      
      // Get all required data in parallel
      const [
        satisfaction,
        experienceScore,
        issueCorrelations
      ] = await Promise.all([
        this.getSatisfactionMetrics(start, end),
        this.calculateExperienceScore(start, end),
        this.identifyIssueCorrelations(start, end)
      ]);
      
      // Generate improvement recommendations
      const improvementRecommendations = await this.generateImprovementRecommendations(satisfaction, experienceScore);
      
      return {
        period: {
          start,
          end
        },
        satisfaction,
        experienceScore,
        issueCorrelations,
        improvementRecommendations
      };
    } catch (error) {
      safeLogger.error('Error generating experience report:', error);
      throw new Error('Failed to generate customer experience report');
    }
  }

  /**
   * Generate improvement recommendations based on current metrics
   */
  private async generateImprovementRecommendations(
    satisfaction: CustomerSatisfactionMetrics,
    experienceScore: ExperienceScore
  ): Promise<ExperienceReport['improvementRecommendations']> {
    const recommendations: ExperienceReport['improvementRecommendations'] = [];
    
    // Check overall satisfaction
    if (satisfaction.overallSatisfaction < 0.7) {
      recommendations.push({
        area: 'Overall Satisfaction',
        currentScore: satisfaction.overallSatisfaction,
        targetScore: 0.85,
        priority: 'high',
        actions: [
          'Implement proactive customer outreach program',
          'Enhance customer support response times',
          'Conduct customer journey mapping workshop'
        ]
      });
    }
    
    // Check experience score components
    if (experienceScore.components.supportQuality < 0.7) {
      recommendations.push({
        area: 'Support Quality',
        currentScore: experienceScore.components.supportQuality,
        targetScore: 0.85,
        priority: 'high',
        actions: [
          'Provide additional training for support staff',
          'Implement knowledge base improvements',
          'Add 24/7 support coverage'
        ]
      });
    }
    
    if (experienceScore.components.easeOfUse < 0.7) {
      recommendations.push({
        area: 'Ease of Use',
        currentScore: experienceScore.components.easeOfUse,
        targetScore: 0.85,
        priority: 'medium',
        actions: [
          'Conduct usability testing sessions',
          'Simplify checkout process',
          'Improve navigation and search functionality'
        ]
      });
    }
    
    // Add category-specific recommendations
    satisfaction.categoryBreakdown.forEach(category => {
      if (category.satisfaction < 0.6) {
        recommendations.push({
          area: `Category: ${category.category}`,
          currentScore: category.satisfaction,
          targetScore: 0.8,
          priority: 'medium',
          actions: [
            `Review ${category.category} product listings`,
            `Improve ${category.category} customer support`,
            `Analyze ${category.category} return patterns`
          ]
        });
      }
    });
    
    return recommendations;
  }

  /**
   * Helper methods
   */
  private determineTimeframe(startDate?: Date, endDate?: Date): string {
    if (!startDate && !endDate) return '30d';
    if (!startDate) return '30d';
    
    const diffTime = Math.abs((endDate || new Date()).getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return '7d';
    if (diffDays <= 30) return '30d';
    if (diffDays <= 90) return '90d';
    return '365d';
  }

  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }

  private calculateTrend(trends: number[]): number {
    if (trends.length < 2) return 0;
    return trends[trends.length - 1] - trends[0];
  }

  private calculateOverallTrend(trends: any[]): number {
    if (trends.length < 2) return 0;
    // This would be implemented based on the actual trend data structure
    return 0;
  }

  private calculateEaseOfUseScore(overviewMetrics: any): number {
    // This would be calculated based on actual ease of use metrics
    // For now, we'll derive it from existing metrics
    const conversionRate = overviewMetrics.conversionRate || 0;
    return Math.min(1, conversionRate / 5); // Normalize to 0-1 scale
  }

  private calculateSupportQualityScore(satisfactionAnalytics: any): number {
    // This would be calculated based on actual support quality metrics
    return satisfactionAnalytics.averageOverallSatisfaction || 0.7;
  }

  private calculateValuePerceptionScore(overviewMetrics: any): number {
    // This would be calculated based on actual value perception metrics
    const avgOrderValue = overviewMetrics.averageOrderValue || 0;
    const totalRevenue = overviewMetrics.totalRevenue || 1;
    return Math.min(1, avgOrderValue / (totalRevenue / 100)); // Simplified calculation
  }

  private calculateIssueImpact(area: string, analytics: any): number {
    // This would calculate the actual impact of issues on satisfaction
    // For now, we'll return a mock value based on the area
    const impactMap: Record<string, number> = {
      'processEfficiency': -0.3,
      'communicationQuality': -0.25,
      'resolutionFairness': -0.35,
      'responseTime': -0.2,
      'platformUsability': -0.15
    };
    
    return impactMap[area] || -0.2;
  }
}

// Export singleton instance
export const customerExperienceService = new CustomerExperienceService();