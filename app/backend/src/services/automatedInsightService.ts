import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { users, products, orders } from '../db/schema';
import { eq, sql, and, gte, lte, desc, asc, count, sum, avg } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { predictiveAnalyticsService } from './predictiveAnalyticsService';
import { anomalyDetectionService } from './anomalyDetectionService';

export interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'alert' | 'opportunity' | 'risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number;
  actionItems: ActionItem[];
  relatedMetrics: string[];
  timestamp: Date;
  category: string;
  priority: number;
  impact: 'positive' | 'negative' | 'neutral';
  timeframe: string;
  metadata: Record<string, any>;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedEffort: string;
  expectedImpact: string;
  category: string;
  assignedTo?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

export interface InsightRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  confidence: number;
  potentialImpact: {
    metric: string;
    expectedChange: number;
    timeframe: string;
  }[];
  implementationSteps: string[];
  requiredResources: string[];
  risks: string[];
}

export interface InsightTracking {
  insightId: string;
  actionTaken: boolean;
  actionType?: string;
  implementationDate?: Date;
  measuredImpact?: {
    metric: string;
    beforeValue: number;
    afterValue: number;
    changePercent: number;
  }[];
  outcome: 'successful' | 'failed' | 'partial' | 'pending';
  feedback?: string;
}

export interface NaturalLanguageInsight {
  insight: AIInsight;
  naturalLanguageDescription: string;
  keyPoints: string[];
  visualizationSuggestions: string[];
  contextualInformation: string[];
}

export class AutomatedInsightService {
  private redis: Redis;
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly INSIGHT_HISTORY_DAYS = 90;

  /**
   * Check if Redis is enabled for this service
   */
  isRedisEnabled(): boolean {
    return !!this.redis;
  }

  constructor() {
    // Check if Redis is disabled
    if (process.env.REDIS_ENABLED === 'false' || process.env.REDIS_ENABLED === '0') {
      safeLogger.warn('Redis functionality is disabled via REDIS_ENABLED environment variable for automated insights');
      return;
    }
    
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Handle placeholder values
      if (redisUrl === 'your_redis_url' || redisUrl === 'redis://your_redis_url') {
        redisUrl = 'redis://localhost:6379';
      }
      
      safeLogger.info('🔗 Attempting Redis connection for automated insights to:', redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
      
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        retryStrategy: (times) => {
          if (times > 3) {
            safeLogger.warn('Redis max reconnection attempts reached for automated insights, disabling Redis functionality');
            return null; // Stop reconnecting
          }
          const delay = Math.min(times * 1000, 30000); // Exponential backoff up to 30s
          safeLogger.warn(`Redis reconnection attempt ${times}/3 for automated insights, next attempt in ${delay}ms`);
          return delay;
        }
      });

      this.redis.on('error', (error) => {
        safeLogger.error('Redis connection error for automated insights:', {
          message: error.message,
          name: error.name,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall
        });
      });

      this.redis.on('node error', (error) => {
        safeLogger.error('Redis node error for automated insights:', {
          message: error.message,
          name: error.name,
          code: error.code
        });
      });

      this.redis.on('connect', () => {
        safeLogger.info('✅ Redis connected successfully for automated insights');
      });

      this.redis.on('reconnecting', () => {
        safeLogger.info('🔄 Redis reconnecting for automated insights...');
      });
    } catch (error) {
      safeLogger.error('Failed to initialize Redis for automated insights:', {
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall
        }
      });
    }
  }

  /**
   * Generate comprehensive AI insights from multiple data sources
   */
  async generateInsights(
    timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<AIInsight[]> {
    try {
      // Check if Redis is available before using it
      if (this.redis) {
        const cacheKey = `insights:generated:${timeframe}`;
        const cached = await this.redis.get(cacheKey);
        
        if (cached) {
          return JSON.parse(cached);
        }
      }

      const insights: AIInsight[] = [];

      // Generate insights from different sources in parallel
      const [
        trendInsights,
        anomalyInsights,
        performanceInsights,
        userBehaviorInsights,
        businessInsights,
        opportunityInsights
      ] = await Promise.all([
        this.generateTrendInsights(timeframe),
        this.generateAnomalyInsights(),
        this.generatePerformanceInsights(),
        this.generateUserBehaviorInsights(),
        this.generateBusinessInsights(),
        this.generateOpportunityInsights()
      ]);

      insights.push(
        ...trendInsights,
        ...anomalyInsights,
        ...performanceInsights,
        ...userBehaviorInsights,
        ...businessInsights,
        ...opportunityInsights
      );

      // Prioritize and rank insights
      const prioritizedInsights = await this.prioritizeInsights(insights);

      // Store insights for tracking
      for (const insight of prioritizedInsights) {
        await this.storeInsight(insight);
      }

      // Cache insights if Redis is available
      if (this.redis) {
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(prioritizedInsights));
      }
      return prioritizedInsights;
    } catch (error) {
      safeLogger.error('Error generating insights:', {
        message: error.message,
        name: error.name,
        code: (error as any).code
      });
      
      // If it's a Redis error, disable Redis functionality
      if ((error as any).code && (error as any).code.startsWith('E')) {
        safeLogger.warn('Disabling Redis functionality for automated insights due to error');
        this.redis = null;
      }
      
      throw new Error('Failed to generate AI insights');
    }
  }

  /**
   * Create natural language descriptions for insights
   */
  async generateNaturalLanguageInsight(insight: AIInsight): Promise<NaturalLanguageInsight> {
    try {
      // Generate human-readable description
      const naturalLanguageDescription = await this.createNaturalLanguageDescription(insight);
      
      // Extract key points
      const keyPoints = await this.extractKeyPoints(insight);
      
      // Suggest visualizations
      const visualizationSuggestions = await this.suggestVisualizations(insight);
      
      // Provide contextual information
      const contextualInformation = await this.gatherContextualInformation(insight);

      return {
        insight,
        naturalLanguageDescription,
        keyPoints,
        visualizationSuggestions,
        contextualInformation
      };
    } catch (error) {
      safeLogger.error('Error generating natural language insight:', error);
      throw new Error('Failed to generate natural language insight');
    }
  }

  /**
   * Prioritize insights based on relevance and impact
   */
  async prioritizeInsights(insights: AIInsight[]): Promise<AIInsight[]> {
    try {
      // Calculate priority scores for each insight
      const scoredInsights = await Promise.all(
        insights.map(async (insight) => {
          const relevanceScore = await this.calculateRelevanceScore(insight);
          const impactScore = await this.calculateImpactScore(insight);
          const urgencyScore = await this.calculateUrgencyScore(insight);
          
          const totalScore = (relevanceScore * 0.4) + (impactScore * 0.4) + (urgencyScore * 0.2);
          
          return {
            ...insight,
            priority: Math.round(totalScore)
          };
        })
      );

      // Sort by priority score (highest first)
      return scoredInsights.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      safeLogger.error('Error prioritizing insights:', error);
      return insights;
    }
  }

  /**
   * Generate actionable recommendations from insights
   */
  async generateRecommendations(insights: AIInsight[]): Promise<InsightRecommendation[]> {
    try {
      const recommendations: InsightRecommendation[] = [];

      for (const insight of insights) {
        if (insight.type === 'recommendation' || insight.type === 'opportunity') {
          const recommendation = await this.createRecommendation(insight);
          recommendations.push(recommendation);
        }
      }

      return recommendations.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      safeLogger.error('Error generating recommendations:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  /**
   * Track insight outcomes and measure impact
   */
  async trackInsightOutcome(tracking: InsightTracking): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO insight_tracking (
          insight_id, action_taken, action_type, implementation_date,
          measured_impact, outcome, feedback, tracked_at
        ) VALUES (
          ${tracking.insightId}, ${tracking.actionTaken}, ${tracking.actionType},
          ${tracking.implementationDate}, ${JSON.stringify(tracking.measuredImpact)},
          ${tracking.outcome}, ${tracking.feedback}, NOW()
        )
      `);

      // Update insight effectiveness metrics
      await this.updateInsightEffectiveness(tracking);
    } catch (error) {
      safeLogger.error('Error tracking insight outcome:', error);
      throw new Error('Failed to track insight outcome');
    }
  }

  /**
   * Get insight performance analytics
   */
  async getInsightAnalytics(days: number = 30): Promise<{
    totalInsights: number;
    insightsByType: Record<string, number>;
    insightsBySeverity: Record<string, number>;
    actionRate: number;
    successRate: number;
    averageConfidence: number;
    topCategories: Array<{ category: string; count: number; successRate: number }>;
    impactMetrics: {
      totalMeasuredImpact: number;
      averageImpact: number;
      positiveImpacts: number;
      negativeImpacts: number;
    };
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get basic insight statistics
      const insightStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_insights,
          COUNT(CASE WHEN type = 'trend' THEN 1 END) as trend_insights,
          COUNT(CASE WHEN type = 'anomaly' THEN 1 END) as anomaly_insights,
          COUNT(CASE WHEN type = 'recommendation' THEN 1 END) as recommendation_insights,
          COUNT(CASE WHEN type = 'alert' THEN 1 END) as alert_insights,
          COUNT(CASE WHEN type = 'opportunity' THEN 1 END) as opportunity_insights,
          COUNT(CASE WHEN type = 'risk' THEN 1 END) as risk_insights,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_severity,
          AVG(confidence) as avg_confidence
        FROM ai_insights
        WHERE created_at >= ${startDate}
      `);

      // Get tracking statistics
      const trackingStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_tracked,
          COUNT(CASE WHEN action_taken = true THEN 1 END) as actions_taken,
          COUNT(CASE WHEN outcome = 'successful' THEN 1 END) as successful_outcomes
        FROM insight_tracking it
        JOIN ai_insights ai ON it.insight_id = ai.id
        WHERE ai.created_at >= ${startDate}
      `);

      // Get category statistics
      const categoryStats = await db.execute(sql`
        SELECT 
          ai.category,
          COUNT(*) as count,
          COUNT(CASE WHEN it.outcome = 'successful' THEN 1 END)::float / 
          NULLIF(COUNT(CASE WHEN it.action_taken = true THEN 1 END), 0) * 100 as success_rate
        FROM ai_insights ai
        LEFT JOIN insight_tracking it ON ai.id = it.insight_id
        WHERE ai.created_at >= ${startDate}
        GROUP BY ai.category
        ORDER BY count DESC
      `);

      const stats = insightStats[0];
      const tracking = trackingStats[0];
      const totalInsights = Number(stats?.total_insights) || 0;
      const totalTracked = Number(tracking?.total_tracked) || 0;
      const actionsTaken = Number(tracking?.actions_taken) || 0;
      const successfulOutcomes = Number(tracking?.successful_outcomes) || 0;

      return {
        totalInsights,
        insightsByType: {
          trend: Number(stats?.trend_insights) || 0,
          anomaly: Number(stats?.anomaly_insights) || 0,
          recommendation: Number(stats?.recommendation_insights) || 0,
          alert: Number(stats?.alert_insights) || 0,
          opportunity: Number(stats?.opportunity_insights) || 0,
          risk: Number(stats?.risk_insights) || 0
        },
        insightsBySeverity: {
          low: Number(stats?.low_severity) || 0,
          medium: Number(stats?.medium_severity) || 0,
          high: Number(stats?.high_severity) || 0,
          critical: Number(stats?.critical_severity) || 0
        },
        actionRate: totalTracked > 0 ? (actionsTaken / totalTracked) * 100 : 0,
        successRate: actionsTaken > 0 ? (successfulOutcomes / actionsTaken) * 100 : 0,
        averageConfidence: Number(stats?.avg_confidence) || 0,
        topCategories: categoryStats.map((row: any) => ({
          category: row.category,
          count: Number(row.count),
          successRate: Number(row.success_rate) || 0
        })),
        impactMetrics: {
          totalMeasuredImpact: 0, // Would calculate from measured_impact data
          averageImpact: 0,
          positiveImpacts: 0,
          negativeImpacts: 0
        }
      };
    } catch (error) {
      safeLogger.error('Error getting insight analytics:', error);
      throw new Error('Failed to get insight analytics');
    }
  }

  // Private helper methods for generating different types of insights

  private async generateTrendInsights(timeframe: string): Promise<AIInsight[]> {
    try {
      const insights: AIInsight[] = [];

      // Get user growth trends
      const userGrowthPredictions = await predictiveAnalyticsService.predictUserGrowth(7);
      
      for (const prediction of userGrowthPredictions.slice(0, 3)) {
        if (prediction.confidence > 0.7) {
          insights.push({
            id: `trend_user_growth_${Date.now()}_${Math.random()}`,
            type: 'trend',
            severity: prediction.growthRate > 10 ? 'high' : 'medium',
            title: `User Growth Trend Detected`,
            description: `User growth is predicted to ${prediction.growthRate > 0 ? 'increase' : 'decrease'} by ${Math.abs(prediction.growthRate).toFixed(1)}% on ${prediction.period}`,
            confidence: prediction.confidence,
            actionItems: await this.generateActionItems('user_growth', prediction.growthRate),
            relatedMetrics: ['user_registrations', 'daily_active_users', 'user_retention'],
            timestamp: new Date(),
            category: 'user_growth',
            priority: 0, // Will be calculated later
            impact: prediction.growthRate > 0 ? 'positive' : 'negative',
            timeframe: prediction.period,
            metadata: { prediction }
          });
        }
      }

      return insights;
    } catch (error) {
      safeLogger.error('Error generating trend insights:', error);
      return [];
    }
  }

  private async generateAnomalyInsights(): Promise<AIInsight[]> {
    try {
      const insights: AIInsight[] = [];
      const anomalies = await anomalyDetectionService.monitorRealTimeAnomalies();

      for (const anomaly of anomalies) {
        insights.push({
          id: `anomaly_${anomaly.id}`,
          type: 'anomaly',
          severity: anomaly.severity,
          title: anomaly.title,
          description: anomaly.description,
          confidence: anomaly.confidence,
          actionItems: anomaly.suggestedActions.map((action, index) => ({
            id: `action_${anomaly.id}_${index}`,
            title: action,
            description: action,
            priority: anomaly.severity === 'critical' ? 'urgent' : 'high',
            estimatedEffort: 'Medium',
            expectedImpact: 'High',
            category: 'anomaly_response',
            status: 'pending' as const
          })),
          relatedMetrics: [anomaly.affectedEntity],
          timestamp: anomaly.detectionTime,
          category: 'anomaly_detection',
          priority: 0,
          impact: 'negative',
          timeframe: 'immediate',
          metadata: { anomaly }
        });
      }

      return insights;
    } catch (error) {
      safeLogger.error('Error generating anomaly insights:', error);
      return [];
    }
  }

  private async generatePerformanceInsights(): Promise<AIInsight[]> {
    try {
      const insights: AIInsight[] = [];

      // Get system load predictions
      const systemPredictions = await predictiveAnalyticsService.predictSystemLoad(3);
      
      for (const prediction of systemPredictions) {
        if (prediction.confidence > 0.6 && 
            (prediction.predictedCpuUsage > 80 || prediction.predictedMemoryUsage > 85)) {
          
          insights.push({
            id: `performance_${Date.now()}_${Math.random()}`,
            type: 'alert',
            severity: prediction.predictedCpuUsage > 90 ? 'critical' : 'high',
            title: 'System Performance Alert',
            description: `System resources predicted to reach critical levels on ${prediction.period}. CPU: ${prediction.predictedCpuUsage.toFixed(1)}%, Memory: ${prediction.predictedMemoryUsage.toFixed(1)}%`,
            confidence: prediction.confidence,
            actionItems: prediction.recommendedActions.map((action, index) => ({
              id: `perf_action_${Date.now()}_${index}`,
              title: action,
              description: action,
              priority: 'high' as const,
              estimatedEffort: 'High',
              expectedImpact: 'High',
              category: 'performance_optimization',
              status: 'pending' as const
            })),
            relatedMetrics: ['cpu_usage', 'memory_usage', 'disk_usage', 'network_traffic'],
            timestamp: new Date(),
            category: 'system_performance',
            priority: 0,
            impact: 'negative',
            timeframe: prediction.period,
            metadata: { prediction }
          });
        }
      }

      return insights;
    } catch (error) {
      safeLogger.error('Error generating performance insights:', error);
      return [];
    }
  }

  private async generateUserBehaviorInsights(): Promise<AIInsight[]> {
    try {
      const insights: AIInsight[] = [];

      // Analyze user engagement patterns
      const engagementData = await this.analyzeUserEngagement();
      
      if (engagementData.trend !== 'stable') {
        insights.push({
          id: `user_behavior_${Date.now()}`,
          type: engagementData.trend === 'increasing' ? 'opportunity' : 'risk',
          severity: Math.abs(engagementData.changePercent) > 20 ? 'high' : 'medium',
          title: `User Engagement ${engagementData.trend === 'increasing' ? 'Opportunity' : 'Risk'} Detected`,
          description: `User engagement has ${engagementData.trend} by ${Math.abs(engagementData.changePercent).toFixed(1)}% over the past week`,
          confidence: 0.8,
          actionItems: await this.generateEngagementActionItems(engagementData),
          relatedMetrics: ['user_engagement', 'session_duration', 'page_views', 'bounce_rate'],
          timestamp: new Date(),
          category: 'user_behavior',
          priority: 0,
          impact: engagementData.trend === 'increasing' ? 'positive' : 'negative',
          timeframe: 'weekly',
          metadata: { engagementData }
        });
      }

      return insights;
    } catch (error) {
      safeLogger.error('Error generating user behavior insights:', error);
      return [];
    }
  }

  private async generateBusinessInsights(): Promise<AIInsight[]> {
    try {
      const insights: AIInsight[] = [];

      // Analyze revenue trends
      const revenuePredictions = await predictiveAnalyticsService.predictBusinessMetrics(['revenue'], 7);
      
      for (const prediction of revenuePredictions) {
        if (prediction.confidence > 0.7) {
          insights.push({
            id: `business_revenue_${Date.now()}`,
            type: prediction.trend === 'increasing' ? 'opportunity' : 'risk',
            severity: Math.abs(prediction.predictedValue) > 1000 ? 'high' : 'medium',
            title: `Revenue ${prediction.trend === 'increasing' ? 'Growth' : 'Decline'} Predicted`,
            description: `Revenue is predicted to ${prediction.trend} to $${prediction.predictedValue.toFixed(2)} on ${prediction.period}`,
            confidence: prediction.confidence,
            actionItems: await this.generateRevenueActionItems(prediction),
            relatedMetrics: ['revenue', 'orders', 'conversion_rate', 'average_order_value'],
            timestamp: new Date(),
            category: 'business_metrics',
            priority: 0,
            impact: prediction.trend === 'increasing' ? 'positive' : 'negative',
            timeframe: prediction.period,
            metadata: { prediction }
          });
        }
      }

      return insights;
    } catch (error) {
      safeLogger.error('Error generating business insights:', error);
      return [];
    }
  }

  private async generateOpportunityInsights(): Promise<AIInsight[]> {
    try {
      const insights: AIInsight[] = [];

      // Identify growth opportunities
      const opportunities = await this.identifyGrowthOpportunities();
      
      for (const opportunity of opportunities) {
        insights.push({
          id: `opportunity_${Date.now()}_${Math.random()}`,
          type: 'opportunity',
          severity: 'medium',
          title: opportunity.title,
          description: opportunity.description,
          confidence: opportunity.confidence,
          actionItems: opportunity.actionItems,
          relatedMetrics: opportunity.relatedMetrics,
          timestamp: new Date(),
          category: 'growth_opportunity',
          priority: 0,
          impact: 'positive',
          timeframe: opportunity.timeframe,
          metadata: { opportunity }
        });
      }

      return insights;
    } catch (error) {
      safeLogger.error('Error generating opportunity insights:', error);
      return [];
    }
  }

  // Helper methods for natural language generation

  private async createNaturalLanguageDescription(insight: AIInsight): Promise<string> {
    // Simple template-based natural language generation
    const templates = {
      trend: `We've identified a ${insight.impact} trend in ${insight.category}. ${insight.description} This trend has a confidence level of ${(insight.confidence * 100).toFixed(0)}% and is expected to continue in the ${insight.timeframe} timeframe.`,
      anomaly: `An anomaly has been detected in ${insight.category}. ${insight.description} This requires immediate attention with a ${insight.severity} severity level.`,
      recommendation: `We recommend taking action on ${insight.category}. ${insight.description} Implementing this recommendation could have a ${insight.impact} impact on your platform.`,
      alert: `Alert: ${insight.description} This ${insight.severity} priority alert affects ${insight.relatedMetrics.join(', ')} and should be addressed within the ${insight.timeframe} timeframe.`,
      opportunity: `Growth opportunity identified in ${insight.category}. ${insight.description} This opportunity has a ${(insight.confidence * 100).toFixed(0)}% confidence level and could positively impact your business.`,
      risk: `Risk detected in ${insight.category}. ${insight.description} This ${insight.severity} risk should be mitigated to prevent negative impact on ${insight.relatedMetrics.join(', ')}.`
    };

    return templates[insight.type] || insight.description;
  }

  private async extractKeyPoints(insight: AIInsight): Promise<string[]> {
    const keyPoints: string[] = [];
    
    keyPoints.push(`Type: ${insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}`);
    keyPoints.push(`Confidence: ${(insight.confidence * 100).toFixed(0)}%`);
    keyPoints.push(`Severity: ${insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1)}`);
    keyPoints.push(`Impact: ${insight.impact.charAt(0).toUpperCase() + insight.impact.slice(1)}`);
    
    if (insight.actionItems.length > 0) {
      keyPoints.push(`${insight.actionItems.length} recommended action${insight.actionItems.length > 1 ? 's' : ''}`);
    }
    
    if (insight.relatedMetrics.length > 0) {
      keyPoints.push(`Affects: ${insight.relatedMetrics.join(', ')}`);
    }

    return keyPoints;
  }

  private async suggestVisualizations(insight: AIInsight): Promise<string[]> {
    const suggestions: string[] = [];
    
    switch (insight.type) {
      case 'trend':
        suggestions.push('Line chart showing trend over time');
        suggestions.push('Comparison chart with historical data');
        break;
      case 'anomaly':
        suggestions.push('Scatter plot highlighting anomalous points');
        suggestions.push('Time series with anomaly markers');
        break;
      case 'recommendation':
        suggestions.push('Before/after comparison chart');
        suggestions.push('Impact projection visualization');
        break;
      default:
        suggestions.push('Dashboard widget with key metrics');
        suggestions.push('Alert notification panel');
    }

    return suggestions;
  }

  private async gatherContextualInformation(insight: AIInsight): Promise<string[]> {
    const context: string[] = [];
    
    context.push(`Generated on ${insight.timestamp.toLocaleDateString()}`);
    context.push(`Category: ${insight.category}`);
    context.push(`Priority Score: ${insight.priority}`);
    
    if (insight.timeframe) {
      context.push(`Timeframe: ${insight.timeframe}`);
    }
    
    return context;
  }

  // Helper methods for scoring and prioritization

  private async calculateRelevanceScore(insight: AIInsight): Promise<number> {
    let score = 50; // Base score
    
    // Adjust based on type
    switch (insight.type) {
      case 'alert': score += 30; break;
      case 'anomaly': score += 25; break;
      case 'risk': score += 20; break;
      case 'opportunity': score += 15; break;
      case 'recommendation': score += 10; break;
      case 'trend': score += 5; break;
    }
    
    // Adjust based on severity
    switch (insight.severity) {
      case 'critical': score += 25; break;
      case 'high': score += 15; break;
      case 'medium': score += 5; break;
      case 'low': score -= 5; break;
    }
    
    return Math.min(score, 100);
  }

  private async calculateImpactScore(insight: AIInsight): Promise<number> {
    let score = 50; // Base score
    
    // Adjust based on number of affected metrics
    score += Math.min(insight.relatedMetrics.length * 5, 25);
    
    // Adjust based on impact type
    switch (insight.impact) {
      case 'positive': score += 10; break;
      case 'negative': score += 20; break; // Negative impacts are more urgent
      case 'neutral': break;
    }
    
    // Adjust based on confidence
    score += (insight.confidence - 0.5) * 40;
    
    return Math.min(Math.max(score, 0), 100);
  }

  private async calculateUrgencyScore(insight: AIInsight): Promise<number> {
    let score = 50; // Base score
    
    // Adjust based on timeframe
    switch (insight.timeframe) {
      case 'immediate': score += 40; break;
      case 'hourly': score += 30; break;
      case 'daily': score += 20; break;
      case 'weekly': score += 10; break;
      case 'monthly': break;
      default: score -= 10; break;
    }
    
    // Adjust based on type urgency
    if (insight.type === 'alert' || insight.type === 'anomaly') {
      score += 20;
    }
    
    return Math.min(Math.max(score, 0), 100);
  }

  // Mock implementations for data analysis

  private async analyzeUserEngagement(): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
  }> {
    // Mock implementation - would analyze actual engagement data
    return {
      trend: 'stable',
      changePercent: 0
    };
  }

  private async identifyGrowthOpportunities(): Promise<Array<{
    title: string;
    description: string;
    confidence: number;
    actionItems: ActionItem[];
    relatedMetrics: string[];
    timeframe: string;
  }>> {
    // Mock implementation - would identify actual opportunities
    return [];
  }

  private async generateActionItems(category: string, value: number): Promise<ActionItem[]> {
    // Mock implementation - would generate contextual action items
    return [];
  }

  private async generateEngagementActionItems(data: any): Promise<ActionItem[]> {
    // Mock implementation - would generate engagement-specific actions
    return [];
  }

  private async generateRevenueActionItems(prediction: any): Promise<ActionItem[]> {
    // Mock implementation - would generate revenue-specific actions
    return [];
  }

  private async createRecommendation(insight: AIInsight): Promise<InsightRecommendation> {
    // Mock implementation - would create detailed recommendations
    return {
      id: `rec_${insight.id}`,
      title: insight.title,
      description: insight.description,
      category: insight.category,
      priority: insight.priority,
      confidence: insight.confidence,
      potentialImpact: [],
      implementationSteps: [],
      requiredResources: [],
      risks: []
    };
  }

  private async storeInsight(insight: AIInsight): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO ai_insights (
          id, type, severity, title, description, confidence,
          action_items, related_metrics, category, priority,
          impact, timeframe, metadata, created_at
        ) VALUES (
          ${insight.id}, ${insight.type}, ${insight.severity},
          ${insight.title}, ${insight.description}, ${insight.confidence},
          ${JSON.stringify(insight.actionItems)}, ${JSON.stringify(insight.relatedMetrics)},
          ${insight.category}, ${insight.priority}, ${insight.impact},
          ${insight.timeframe}, ${JSON.stringify(insight.metadata)}, ${insight.timestamp}
        )
      `);
    } catch (error) {
      safeLogger.error('Error storing insight:', error);
    }
  }

  private async updateInsightEffectiveness(tracking: InsightTracking): Promise<void> {
    // Mock implementation - would update effectiveness metrics
  }
}

export const automatedInsightService = new AutomatedInsightService();
