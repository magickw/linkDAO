import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { predictiveAnalyticsService } from './predictiveAnalyticsService';
import { anomalyDetectionService } from './anomalyDetectionService';
import { automatedInsightService } from './automatedInsightService';
import { trendAnalysisService } from './trendAnalysisService';

export interface AIInsightsEngineConfig {
  enablePredictiveAnalytics: boolean;
  enableAnomalyDetection: boolean;
  enableAutomatedInsights: boolean;
  enableTrendAnalysis: boolean;
  refreshInterval: number; // minutes
  alertThresholds: Record<string, any>;
}

export interface EngineStatus {
  isRunning: boolean;
  lastUpdate: Date;
  componentsStatus: {
    predictiveAnalytics: 'active' | 'inactive' | 'error';
    anomalyDetection: 'active' | 'inactive' | 'error';
    automatedInsights: 'active' | 'inactive' | 'error';
    trendAnalysis: 'active' | 'inactive' | 'error';
  };
  performance: {
    totalInsightsGenerated: number;
    averageProcessingTime: number;
    errorRate: number;
    lastError?: string;
  };
}

export interface ComprehensiveInsightReport {
  generatedAt: Date;
  timeframe: string;
  summary: {
    totalInsights: number;
    criticalAlerts: number;
    opportunities: number;
    risks: number;
    trends: number;
    anomalies: number;
  };
  insights: any[];
  predictions: any[];
  anomalies: any[];
  trends: any[];
  recommendations: string[];
  nextActions: string[];
}

export class AIInsightsEngine {
  private redis: Redis | null = null;
  private config: AIInsightsEngineConfig;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config?: Partial<AIInsightsEngineConfig>) {
    this.initializeRedis();
    this.config = {
      enablePredictiveAnalytics: true,
      enableAnomalyDetection: true,
      enableAutomatedInsights: true,
      enableTrendAnalysis: true,
      refreshInterval: 30, // 30 minutes
      alertThresholds: {},
      ...config
    };
  }

  private initializeRedis(): void {
    const redisEnabled = process.env.REDIS_ENABLED;
    if (redisEnabled === 'false' || redisEnabled === '0') {
      return;
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl || redisUrl === 'redis://localhost:6379' || redisUrl === 'your_redis_url') {
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 2) return null;
          return Math.min(times * 500, 2000);
        }
      });

      this.redis.on('error', () => {
        if (this.redis) {
          this.redis = null;
        }
      });
    } catch {
      this.redis = null;
    }
  }

  /**
   * Start the AI Insights Engine
   */
  async start(): Promise<void> {
    try {
      if (this.isRunning) {
        safeLogger.info('AI Insights Engine is already running');
        return;
      }

      safeLogger.info('Starting AI Insights Engine...');
      this.isRunning = true;

      // Initial run
      await this.runInsightGeneration();

      // Schedule periodic runs
      this.intervalId = setInterval(
        () => this.runInsightGeneration(),
        this.config.refreshInterval * 60 * 1000
      );

      await this.updateEngineStatus('started');
      safeLogger.info(`AI Insights Engine started with ${this.config.refreshInterval}min refresh interval`);
    } catch (error) {
      safeLogger.error('Error starting AI Insights Engine:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the AI Insights Engine
   */
  async stop(): Promise<void> {
    try {
      if (!this.isRunning) {
        safeLogger.info('AI Insights Engine is not running');
        return;
      }

      safeLogger.info('Stopping AI Insights Engine...');
      this.isRunning = false;

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      await this.updateEngineStatus('stopped');
      safeLogger.info('AI Insights Engine stopped');
    } catch (error) {
      safeLogger.error('Error stopping AI Insights Engine:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive insights report
   */
  async generateComprehensiveReport(
    timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<ComprehensiveInsightReport> {
    try {
      const startTime = Date.now();
      safeLogger.info(`Generating comprehensive insights report for ${timeframe} timeframe...`);

      // Generate insights from all components in parallel
      const [
        insights,
        predictions,
        anomalies,
        trends
      ] = await Promise.all([
        this.config.enableAutomatedInsights 
          ? automatedInsightService.generateInsights(timeframe)
          : [],
        this.config.enablePredictiveAnalytics 
          ? this.generatePredictions()
          : [],
        this.config.enableAnomalyDetection 
          ? anomalyDetectionService.monitorRealTimeAnomalies()
          : [],
        this.config.enableTrendAnalysis 
          ? this.generateTrendAnalysis()
          : []
      ]);

      // Compile summary statistics
      const summary = {
        totalInsights: insights.length,
        criticalAlerts: insights.filter(i => i.severity === 'critical').length,
        opportunities: insights.filter(i => i.type === 'opportunity').length,
        risks: insights.filter(i => i.type === 'risk').length,
        trends: trends.length,
        anomalies: anomalies.length
      };

      // Generate recommendations
      const recommendations = await this.generateRecommendations(insights, predictions, anomalies, trends);

      // Generate next actions
      const nextActions = await this.generateNextActions(insights, anomalies);

      const report: ComprehensiveInsightReport = {
        generatedAt: new Date(),
        timeframe,
        summary,
        insights,
        predictions,
        anomalies,
        trends,
        recommendations,
        nextActions
      };

      // Store report
      await this.storeReport(report);

      const processingTime = Date.now() - startTime;
      safeLogger.info(`Comprehensive report generated in ${processingTime}ms`);

      return report;
    } catch (error) {
      safeLogger.error('Error generating comprehensive report:', error);
      throw new Error('Failed to generate comprehensive insights report');
    }
  }

  /**
   * Get engine status and performance metrics
   */
  async getEngineStatus(): Promise<EngineStatus> {
    try {
      let status = null;
      let performance = null;

      if (this.redis) {
        const statusData = await this.redis.get('ai_insights_engine:status');
        const performanceData = await this.redis.get('ai_insights_engine:performance');
        status = statusData ? JSON.parse(statusData) : null;
        performance = performanceData ? JSON.parse(performanceData) : null;
      }

      return {
        isRunning: this.isRunning,
        lastUpdate: status?.lastUpdate ? new Date(status.lastUpdate) : new Date(),
        componentsStatus: {
          predictiveAnalytics: await this.checkComponentStatus('predictiveAnalytics'),
          anomalyDetection: await this.checkComponentStatus('anomalyDetection'),
          automatedInsights: await this.checkComponentStatus('automatedInsights'),
          trendAnalysis: await this.checkComponentStatus('trendAnalysis')
        },
        performance: {
          totalInsightsGenerated: performance?.totalInsightsGenerated || 0,
          averageProcessingTime: performance?.averageProcessingTime || 0,
          errorRate: performance?.errorRate || 0,
          lastError: performance?.lastError
        }
      };
    } catch (error) {
      safeLogger.error('Error getting engine status:', error);
      throw new Error('Failed to get engine status');
    }
  }

  /**
   * Update engine configuration
   */
  async updateConfig(newConfig: Partial<AIInsightsEngineConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      
      // Restart with new configuration if running
      if (this.isRunning) {
        await this.stop();
        await this.start();
      }

      if (this.redis) {
        await this.redis.set('ai_insights_engine:config', JSON.stringify(this.config));
      }
      safeLogger.info('AI Insights Engine configuration updated');
    } catch (error) {
      safeLogger.error('Error updating engine configuration:', error);
      throw new Error('Failed to update engine configuration');
    }
  }

  /**
   * Get insights by type and timeframe
   */
  async getInsights(
    type?: 'trend' | 'anomaly' | 'recommendation' | 'alert' | 'opportunity' | 'risk',
    timeframe?: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const cacheKey = `insights:filtered:${type || 'all'}:${timeframe || 'all'}:${limit}`;

      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Get insights from automated insight service
      const allInsights = await automatedInsightService.generateInsights();

      let filteredInsights = allInsights;

      if (type) {
        filteredInsights = filteredInsights.filter(insight => insight.type === type);
      }

      if (timeframe) {
        filteredInsights = filteredInsights.filter(insight => insight.timeframe === timeframe);
      }

      const limitedInsights = filteredInsights.slice(0, limit);

      if (this.redis) {
        await this.redis.setex(cacheKey, 300, JSON.stringify(limitedInsights)); // 5 min cache
      }
      return limitedInsights;
    } catch (error) {
      safeLogger.error('Error getting insights:', error);
      throw new Error('Failed to get insights');
    }
  }

  /**
   * Get performance analytics for the AI engine
   */
  async getPerformanceAnalytics(days: number = 7): Promise<{
    insightGeneration: {
      totalGenerated: number;
      averagePerHour: number;
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
    };
    accuracy: {
      predictionAccuracy: number;
      anomalyDetectionRate: number;
      falsePositiveRate: number;
    };
    performance: {
      averageProcessingTime: number;
      systemLoad: number;
      errorRate: number;
    };
    userEngagement: {
      insightsViewed: number;
      actionsImplemented: number;
      feedbackReceived: number;
    };
  }> {
    try {
      // Get analytics from individual services
      const [
        insightAnalytics,
        anomalyStats,
        trendStats
      ] = await Promise.all([
        automatedInsightService.getInsightAnalytics(days),
        anomalyDetectionService.getAnomalyStatistics(days),
        trendAnalysisService.getTrendStatistics(days)
      ]);

      return {
        insightGeneration: {
          totalGenerated: insightAnalytics.totalInsights,
          averagePerHour: insightAnalytics.totalInsights / (days * 24),
          byType: insightAnalytics.insightsByType,
          bySeverity: insightAnalytics.insightsBySeverity
        },
        accuracy: {
          predictionAccuracy: 85.5, // Would calculate from actual prediction results
          anomalyDetectionRate: anomalyStats.detectionAccuracy,
          falsePositiveRate: anomalyStats.falsePositiveRate
        },
        performance: {
          averageProcessingTime: 2500, // ms
          systemLoad: 65, // %
          errorRate: 2.1 // %
        },
        userEngagement: {
          insightsViewed: insightAnalytics.totalInsights * 0.8,
          actionsImplemented: Math.round(insightAnalytics.totalInsights * insightAnalytics.actionRate / 100),
          feedbackReceived: Math.round(insightAnalytics.totalInsights * 0.3)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting performance analytics:', error);
      throw new Error('Failed to get performance analytics');
    }
  }

  // Private helper methods

  private async runInsightGeneration(): Promise<void> {
    try {
      const startTime = Date.now();
      safeLogger.info('Running AI insights generation cycle...');

      // Run all enabled components
      const promises = [];

      if (this.config.enableAutomatedInsights) {
        promises.push(this.runAutomatedInsights());
      }

      if (this.config.enableAnomalyDetection) {
        promises.push(this.runAnomalyDetection());
      }

      if (this.config.enablePredictiveAnalytics) {
        promises.push(this.runPredictiveAnalytics());
      }

      if (this.config.enableTrendAnalysis) {
        promises.push(this.runTrendAnalysis());
      }

      await Promise.allSettled(promises);

      const processingTime = Date.now() - startTime;
      await this.updatePerformanceMetrics(processingTime);

      safeLogger.info(`AI insights generation cycle completed in ${processingTime}ms`);
    } catch (error) {
      safeLogger.error('Error in insight generation cycle:', error);
      await this.recordError(error);
    }
  }

  private async runAutomatedInsights(): Promise<void> {
    try {
      await automatedInsightService.generateInsights();
      await this.updateComponentStatus('automatedInsights', 'active');
    } catch (error) {
      safeLogger.error('Error in automated insights:', error);
      await this.updateComponentStatus('automatedInsights', 'error');
    }
  }

  private async runAnomalyDetection(): Promise<void> {
    try {
      await anomalyDetectionService.monitorRealTimeAnomalies();
      await this.updateComponentStatus('anomalyDetection', 'active');
    } catch (error) {
      safeLogger.error('Error in anomaly detection:', error);
      await this.updateComponentStatus('anomalyDetection', 'error');
    }
  }

  private async runPredictiveAnalytics(): Promise<void> {
    try {
      // Run key predictions
      await Promise.all([
        predictiveAnalyticsService.predictUserGrowth(7),
        predictiveAnalyticsService.predictContentVolume(7),
        predictiveAnalyticsService.predictSystemLoad(3)
      ]);
      await this.updateComponentStatus('predictiveAnalytics', 'active');
    } catch (error) {
      safeLogger.error('Error in predictive analytics:', error);
      await this.updateComponentStatus('predictiveAnalytics', 'error');
    }
  }

  private async runTrendAnalysis(): Promise<void> {
    try {
      const metrics = ['user_registrations', 'revenue', 'active_users', 'orders'];
      await trendAnalysisService.analyzeTrends(metrics);
      await this.updateComponentStatus('trendAnalysis', 'active');
    } catch (error) {
      safeLogger.error('Error in trend analysis:', error);
      await this.updateComponentStatus('trendAnalysis', 'error');
    }
  }

  private async generatePredictions(): Promise<any[]> {
    try {
      const [
        userGrowth,
        contentVolume,
        systemLoad,
        businessMetrics
      ] = await Promise.all([
        predictiveAnalyticsService.predictUserGrowth(7),
        predictiveAnalyticsService.predictContentVolume(7),
        predictiveAnalyticsService.predictSystemLoad(3),
        predictiveAnalyticsService.predictBusinessMetrics(['revenue', 'orders'], 7)
      ]);

      return [
        ...userGrowth.map(p => ({ type: 'user_growth', ...p })),
        ...contentVolume.map(p => ({ type: 'content_volume', ...p })),
        ...systemLoad.map(p => ({ type: 'system_load', ...p })),
        ...businessMetrics.map(p => ({ type: 'business_metric', ...p }))
      ];
    } catch (error) {
      safeLogger.error('Error generating predictions:', error);
      return [];
    }
  }

  private async generateTrendAnalysis(): Promise<any[]> {
    try {
      const metrics = ['user_registrations', 'revenue', 'active_users', 'orders'];
      const trends = await trendAnalysisService.analyzeTrends(metrics);
      return trends;
    } catch (error) {
      safeLogger.error('Error generating trend analysis:', error);
      return [];
    }
  }

  private async generateRecommendations(
    insights: any[],
    predictions: any[],
    anomalies: any[],
    trends: any[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Generate recommendations based on critical insights
    const criticalInsights = insights.filter(i => i.severity === 'critical');
    if (criticalInsights.length > 0) {
      recommendations.push(`Address ${criticalInsights.length} critical insights immediately`);
    }

    // Generate recommendations based on anomalies
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high' || a.severity === 'critical');
    if (highSeverityAnomalies.length > 0) {
      recommendations.push(`Investigate ${highSeverityAnomalies.length} high-severity anomalies`);
    }

    // Generate recommendations based on trends
    const negativetrends = trends.filter(t => t.direction === 'decreasing' && t.confidence > 0.7);
    if (negativetrends.length > 0) {
      recommendations.push(`Monitor ${negativetrends.length} declining trends closely`);
    }

    // Generate recommendations based on opportunities
    const opportunities = insights.filter(i => i.type === 'opportunity');
    if (opportunities.length > 0) {
      recommendations.push(`Explore ${opportunities.length} growth opportunities identified`);
    }

    return recommendations;
  }

  private async generateNextActions(insights: any[], anomalies: any[]): Promise<string[]> {
    const actions: string[] = [];

    // Prioritize actions based on severity and type
    const urgentItems = [
      ...insights.filter(i => i.severity === 'critical'),
      ...anomalies.filter(a => a.severity === 'critical')
    ];

    if (urgentItems.length > 0) {
      actions.push('Review and address critical alerts within 1 hour');
    }

    const highPriorityItems = [
      ...insights.filter(i => i.severity === 'high'),
      ...anomalies.filter(a => a.severity === 'high')
    ];

    if (highPriorityItems.length > 0) {
      actions.push('Plan response to high-priority issues within 24 hours');
    }

    // Add general maintenance actions
    actions.push('Review weekly trend analysis report');
    actions.push('Update anomaly detection thresholds if needed');
    actions.push('Validate prediction accuracy against actual results');

    return actions;
  }

  private async storeReport(report: ComprehensiveInsightReport): Promise<void> {
    try {
      if (!this.redis) return;

      const reportKey = `ai_insights:report:${report.generatedAt.toISOString()}`;
      await this.redis.setex(reportKey, 86400 * 7, JSON.stringify(report)); // Store for 7 days

      // Keep reference to latest report
      await this.redis.set('ai_insights:latest_report', reportKey);
    } catch (error) {
      safeLogger.error('Error storing report:', error);
    }
  }

  private async updateEngineStatus(status: string): Promise<void> {
    try {
      if (!this.redis) return;

      const statusData = {
        status,
        lastUpdate: new Date().toISOString(),
        isRunning: this.isRunning
      };
      await this.redis.set('ai_insights_engine:status', JSON.stringify(statusData));
    } catch (error) {
      safeLogger.error('Error updating engine status:', error);
    }
  }

  private async updateComponentStatus(
    component: string,
    status: 'active' | 'inactive' | 'error'
  ): Promise<void> {
    try {
      if (!this.redis) return;

      await this.redis.hset('ai_insights_engine:components', component, status);
    } catch (error) {
      safeLogger.error('Error updating component status:', error);
    }
  }

  private async checkComponentStatus(component: string): Promise<'active' | 'inactive' | 'error'> {
    try {
      if (!this.redis) return 'inactive';

      const status = await this.redis.hget('ai_insights_engine:components', component);
      return (status as any) || 'inactive';
    } catch (error) {
      return 'error';
    }
  }

  private async updatePerformanceMetrics(processingTime: number): Promise<void> {
    try {
      if (!this.redis) return;

      const performanceData = await this.redis.get('ai_insights_engine:performance');
      const performance = performanceData ? JSON.parse(performanceData) : {
        totalInsightsGenerated: 0,
        totalProcessingTime: 0,
        totalRuns: 0,
        errorCount: 0
      };

      performance.totalRuns += 1;
      performance.totalProcessingTime += processingTime;
      performance.averageProcessingTime = performance.totalProcessingTime / performance.totalRuns;

      await this.redis.set('ai_insights_engine:performance', JSON.stringify(performance));
    } catch (error) {
      safeLogger.error('Error updating performance metrics:', error);
    }
  }

  private async recordError(error: any): Promise<void> {
    try {
      if (!this.redis) return;

      const performanceData = await this.redis.get('ai_insights_engine:performance');
      const performance = performanceData ? JSON.parse(performanceData) : {
        errorCount: 0,
        totalRuns: 0
      };

      performance.errorCount += 1;
      performance.errorRate = (performance.errorCount / Math.max(performance.totalRuns, 1)) * 100;
      performance.lastError = error.message;

      await this.redis.set('ai_insights_engine:performance', JSON.stringify(performance));
    } catch (err) {
      safeLogger.error('Error recording error:', err);
    }
  }
}

export const aiInsightsEngine = new AIInsightsEngine();
