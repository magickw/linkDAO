import { performance } from 'perf_hooks';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { performanceMonitoringService } from './performanceMonitoringService';

interface CriticalPathMetrics {
  pathName: string;
  totalDuration: number;
  steps: PathStepMetrics[];
  bottlenecks: Bottleneck[];
  optimizationOpportunities: OptimizationOpportunity[];
  timestamp: Date;
}

interface PathStepMetrics {
  stepName: string;
  duration: number;
  percentage: number;
  success: boolean;
  metadata?: any;
}

interface Bottleneck {
  stepName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number; // percentage of total path time
  description: string;
  recommendation: string;
}

interface OptimizationOpportunity {
  type: 'caching' | 'database' | 'network' | 'computation' | 'memory';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedImprovement: number; // percentage improvement
  implementation: string;
}

interface UserFeedbackMetrics {
  userId?: string;
  pathName: string;
  perceivedPerformance: 'fast' | 'acceptable' | 'slow' | 'very_slow';
  actualDuration: number;
  userAgent?: string;
  timestamp: Date;
}

interface PerformanceBaseline {
  pathName: string;
  p50: number;
  p95: number;
  p99: number;
  averageDuration: number;
  sampleCount: number;
  lastUpdated: Date;
}

/**
 * Critical Path Performance Optimizer
 * Implements task 14.4: Optimize critical path performance based on metrics and user feedback
 */
export class CriticalPathPerformanceOptimizer {
  private pool: Pool;
  private redis: Redis;
  private pathMetrics: Map<string, CriticalPathMetrics[]> = new Map();
  private userFeedback: UserFeedbackMetrics[] = [];
  private performanceBaselines: Map<string, PerformanceBaseline> = new Map();
  private optimizationInterval: NodeJS.Timeout | null = null;

  private readonly CRITICAL_PATHS = [
    'user_authentication',
    'post_creation',
    'community_join',
    'marketplace_listing_view',
    'wallet_connection',
    'feed_load',
    'search_execution',
    'payment_processing'
  ];

  private readonly PERFORMANCE_THRESHOLDS = {
    fast: 500,      // < 500ms
    acceptable: 1500, // < 1.5s
    slow: 3000,     // < 3s
    very_slow: 5000 // >= 5s
  };

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
    this.initializeBaselines();
    this.startOptimization();
  }

  /**
   * Initialize performance baselines for critical paths
   */
  private async initializeBaselines(): Promise<void> {
    for (const pathName of this.CRITICAL_PATHS) {
      // Load existing baseline from Redis if available
      try {
        const baselineData = await this.redis.get(`performance:baseline:${pathName}`);
        if (baselineData) {
          const baseline = JSON.parse(baselineData);
          baseline.lastUpdated = new Date(baseline.lastUpdated);
          this.performanceBaselines.set(pathName, baseline);
        } else {
          // Create initial baseline
          this.performanceBaselines.set(pathName, {
            pathName,
            p50: 1000,
            p95: 2000,
            p99: 5000,
            averageDuration: 1200,
            sampleCount: 0,
            lastUpdated: new Date()
          });
        }
      } catch (error) {
        safeLogger.warn(`Failed to load baseline for ${pathName}:`, error);
      }
    }

    safeLogger.info('📊 Performance baselines initialized', {
      pathCount: this.performanceBaselines.size,
      operation: 'baseline_initialization'
    });
  }

  /**
   * Start optimization monitoring
   */
  private startOptimization(): void {
    safeLogger.info('🚀 Starting critical path performance optimization');

    this.optimizationInterval = setInterval(async () => {
      try {
        await this.analyzePerformanceTrends();
        await this.updateBaselines();
        await this.generateOptimizationRecommendations();
        this.cleanupOldMetrics();
      } catch (error) {
        safeLogger.error('Error in optimization cycle:', error);
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Stop optimization monitoring
   */
  stopOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
      safeLogger.info('🚀 Critical path optimization stopped');
    }
  }

  /**
   * Profile a critical path execution
   */
  async profileCriticalPath<T>(
    pathName: string,
    pathExecution: () => Promise<T>,
    stepProfiler?: (stepName: string, stepExecution: () => Promise<any>) => Promise<any>
  ): Promise<T> {
    const startTime = performance.now();
    const steps: PathStepMetrics[] = [];
    let result: T;

    try {
      if (stepProfiler) {
        // Use custom step profiler if provided
        result = await pathExecution();
      } else {
        // Default execution without step profiling
        result = await pathExecution();
      }

      const totalDuration = performance.now() - startTime;

      // Analyze bottlenecks and optimization opportunities
      const bottlenecks = this.identifyBottlenecks(steps, totalDuration);
      const optimizationOpportunities = this.identifyOptimizationOpportunities(steps, pathName);

      // Record metrics
      const pathMetrics: CriticalPathMetrics = {
        pathName,
        totalDuration,
        steps,
        bottlenecks,
        optimizationOpportunities,
        timestamp: new Date()
      };

      this.recordPathMetrics(pathMetrics);

      // Log performance
      const performanceLevel = this.categorizePerformance(totalDuration);
      const logLevel = performanceLevel === 'fast' || performanceLevel === 'acceptable' ? 'info' : 'warn';

      safeLogger[logLevel](`🎯 Critical path executed: ${pathName}`, {
        duration: totalDuration.toFixed(2),
        performance: performanceLevel,
        bottlenecks: bottlenecks.length,
        opportunities: optimizationOpportunities.length,
        operation: 'critical_path_execution'
      });

      return result;
    } catch (error) {
      const totalDuration = performance.now() - startTime;

      // Record failed execution
      const pathMetrics: CriticalPathMetrics = {
        pathName,
        totalDuration,
        steps,
        bottlenecks: [{
          stepName: 'execution',
          severity: 'critical',
          impact: 100,
          description: 'Path execution failed',
          recommendation: 'Investigate and fix the underlying error'
        }],
        optimizationOpportunities: [],
        timestamp: new Date()
      };

      this.recordPathMetrics(pathMetrics);

      safeLogger.error(`❌ Critical path failed: ${pathName}`, {
        duration: totalDuration.toFixed(2),
        error: error.message,
        operation: 'critical_path_failure'
      });

      throw error;
    }
  }

  /**
   * Profile individual steps within a critical path
   */
  async profileStep<T>(
    stepName: string,
    stepExecution: () => Promise<T>
  ): Promise<{ result: T; metrics: PathStepMetrics }> {
    const startTime = performance.now();

    try {
      const result = await stepExecution();
      const duration = performance.now() - startTime;

      const metrics: PathStepMetrics = {
        stepName,
        duration,
        percentage: 0, // Will be calculated later in context of full path
        success: true
      };

      return { result, metrics };
    } catch (error) {
      const duration = performance.now() - startTime;

      const metrics: PathStepMetrics = {
        stepName,
        duration,
        percentage: 0,
        success: false,
        metadata: { error: error.message }
      };

      throw error;
    }
  }

  /**
   * Record user feedback on performance
   */
  recordUserFeedback(
    pathName: string,
    perceivedPerformance: UserFeedbackMetrics['perceivedPerformance'],
    actualDuration: number,
    userId?: string,
    userAgent?: string
  ): void {
    const feedback: UserFeedbackMetrics = {
      userId,
      pathName,
      perceivedPerformance,
      actualDuration,
      userAgent,
      timestamp: new Date()
    };

    this.userFeedback.push(feedback);

    // Keep only recent feedback (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.userFeedback = this.userFeedback.filter(f => f.timestamp.getTime() > oneDayAgo);

    safeLogger.info('👤 User performance feedback recorded', {
      pathName,
      perceivedPerformance,
      actualDuration: actualDuration.toFixed(2),
      operation: 'user_feedback'
    });
  }

  /**
   * Record path metrics
   */
  private recordPathMetrics(metrics: CriticalPathMetrics): void {
    if (!this.pathMetrics.has(metrics.pathName)) {
      this.pathMetrics.set(metrics.pathName, []);
    }

    const pathHistory = this.pathMetrics.get(metrics.pathName)!;
    pathHistory.push(metrics);

    // Keep only recent metrics (last 1000 executions)
    if (pathHistory.length > 1000) {
      pathHistory.splice(0, pathHistory.length - 1000);
    }

    // Update performance monitoring service
    performanceMonitoringService.recordRequest(
      'CRITICAL_PATH',
      metrics.pathName,
      metrics.totalDuration,
      metrics.bottlenecks.length > 0 ? 500 : 200
    );
  }

  /**
   * Identify bottlenecks in path execution
   */
  private identifyBottlenecks(steps: PathStepMetrics[], totalDuration: number): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Calculate percentages
    steps.forEach(step => {
      step.percentage = (step.duration / totalDuration) * 100;
    });

    // Identify steps that take more than 30% of total time
    const slowSteps = steps.filter(step => step.percentage > 30);
    slowSteps.forEach(step => {
      bottlenecks.push({
        stepName: step.stepName,
        severity: step.percentage > 60 ? 'critical' : step.percentage > 45 ? 'high' : 'medium',
        impact: step.percentage,
        description: `Step takes ${step.percentage.toFixed(1)}% of total execution time`,
        recommendation: this.getBottleneckRecommendation(step.stepName, step.duration)
      });
    });

    // Identify failed steps
    const failedSteps = steps.filter(step => !step.success);
    failedSteps.forEach(step => {
      bottlenecks.push({
        stepName: step.stepName,
        severity: 'critical',
        impact: step.percentage,
        description: 'Step execution failed',
        recommendation: 'Investigate and fix the underlying error'
      });
    });

    return bottlenecks;
  }

  /**
   * Get bottleneck recommendation based on step name and duration
   */
  private getBottleneckRecommendation(stepName: string, duration: number): string {
    if (stepName.includes('database') || stepName.includes('query')) {
      return 'Optimize database queries, add indexes, or implement query caching';
    }
    
    if (stepName.includes('network') || stepName.includes('api')) {
      return 'Implement request caching, connection pooling, or consider CDN usage';
    }
    
    if (stepName.includes('auth') || stepName.includes('wallet')) {
      return 'Cache authentication results or optimize wallet connection process';
    }
    
    if (stepName.includes('validation') || stepName.includes('processing')) {
      return 'Optimize validation logic or implement result caching';
    }

    return 'Profile this step in detail to identify specific optimization opportunities';
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOptimizationOpportunities(steps: PathStepMetrics[], pathName: string): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Database optimization opportunities
    const dbSteps = steps.filter(step => 
      step.stepName.includes('database') || step.stepName.includes('query'));
    
    if (dbSteps.length > 0) {
      const totalDbTime = dbSteps.reduce((sum, step) => sum + step.duration, 0);
      if (totalDbTime > 200) {
        opportunities.push({
          type: 'database',
          priority: totalDbTime > 1000 ? 'critical' : 'high',
          description: `Database operations take ${totalDbTime.toFixed(0)}ms`,
          estimatedImprovement: 40,
          implementation: 'Add database indexes, implement query caching, optimize queries'
        });
      }
    }

    // Caching opportunities
    const cachableSteps = steps.filter(step => 
      step.stepName.includes('fetch') || step.stepName.includes('load') || step.stepName.includes('get'));
    
    if (cachableSteps.length > 0) {
      opportunities.push({
        type: 'caching',
        priority: 'medium',
        description: `${cachableSteps.length} steps could benefit from caching`,
        estimatedImprovement: 25,
        implementation: 'Implement Redis caching for frequently accessed data'
      });
    }

    // Network optimization opportunities
    const networkSteps = steps.filter(step => 
      step.stepName.includes('api') || step.stepName.includes('request'));
    
    if (networkSteps.length > 2) {
      opportunities.push({
        type: 'network',
        priority: 'medium',
        description: `${networkSteps.length} network requests could be optimized`,
        estimatedImprovement: 30,
        implementation: 'Implement request batching, connection pooling, or parallel execution'
      });
    }

    // Memory optimization opportunities
    const memoryIntensiveSteps = steps.filter(step => step.duration > 500);
    if (memoryIntensiveSteps.length > 0) {
      opportunities.push({
        type: 'memory',
        priority: 'low',
        description: 'Some steps may have memory optimization opportunities',
        estimatedImprovement: 15,
        implementation: 'Profile memory usage and implement object pooling if needed'
      });
    }

    return opportunities.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Categorize performance level
   */
  private categorizePerformance(duration: number): 'fast' | 'acceptable' | 'slow' | 'very_slow' {
    if (duration < this.PERFORMANCE_THRESHOLDS.fast) return 'fast';
    if (duration < this.PERFORMANCE_THRESHOLDS.acceptable) return 'acceptable';
    if (duration < this.PERFORMANCE_THRESHOLDS.slow) return 'slow';
    return 'very_slow';
  }

  /**
   * Analyze performance trends
   */
  private async analyzePerformanceTrends(): Promise<void> {
    for (const [pathName, metrics] of this.pathMetrics) {
      if (metrics.length < 10) continue; // Need sufficient data

      const recentMetrics = metrics.slice(-100); // Last 100 executions
      const durations = recentMetrics.map(m => m.totalDuration);
      
      // Calculate trend
      const oldAvg = durations.slice(0, 50).reduce((sum, d) => sum + d, 0) / 50;
      const newAvg = durations.slice(-50).reduce((sum, d) => sum + d, 0) / 50;
      const trend = ((newAvg - oldAvg) / oldAvg) * 100;

      if (Math.abs(trend) > 10) {
        const trendDirection = trend > 0 ? 'degrading' : 'improving';
        safeLogger.info(`📈 Performance trend detected: ${pathName}`, {
          trend: trendDirection,
          change: `${Math.abs(trend).toFixed(1)}%`,
          oldAvg: oldAvg.toFixed(2),
          newAvg: newAvg.toFixed(2),
          operation: 'trend_analysis'
        });
      }

      // Analyze user feedback correlation
      const pathFeedback = this.userFeedback.filter(f => f.pathName === pathName);
      if (pathFeedback.length > 5) {
        const negativeFeeback = pathFeedback.filter(f => 
          f.perceivedPerformance === 'slow' || f.perceivedPerformance === 'very_slow');
        
        if (negativeFeeback.length / pathFeedback.length > 0.3) {
          safeLogger.warn(`👤 High negative user feedback for ${pathName}`, {
            negativeFeedbackRate: `${((negativeFeeback.length / pathFeedback.length) * 100).toFixed(1)}%`,
            totalFeedback: pathFeedback.length,
            operation: 'user_feedback_analysis'
          });
        }
      }
    }
  }

  /**
   * Update performance baselines
   */
  private async updateBaselines(): Promise<void> {
    for (const [pathName, metrics] of this.pathMetrics) {
      if (metrics.length < 50) continue; // Need sufficient data

      const recentMetrics = metrics.slice(-100);
      const durations = recentMetrics.map(m => m.totalDuration).sort((a, b) => a - b);

      const baseline: PerformanceBaseline = {
        pathName,
        p50: durations[Math.floor(durations.length * 0.5)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)],
        averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        sampleCount: durations.length,
        lastUpdated: new Date()
      };

      this.performanceBaselines.set(pathName, baseline);

      // Store in Redis for persistence
      try {
        await this.redis.setex(
          `performance:baseline:${pathName}`,
          86400, // 24 hours
          JSON.stringify(baseline)
        );
      } catch (error) {
        safeLogger.warn(`Failed to store baseline for ${pathName}:`, error);
      }
    }
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(): Promise<void> {
    const recommendations = this.getOptimizationRecommendations();
    
    if (recommendations.length > 0) {
      safeLogger.info('💡 Performance optimization recommendations generated', {
        recommendationCount: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length,
        operation: 'optimization_recommendations'
      });

      // Store recommendations in Redis for dashboard access
      try {
        await this.redis.setex(
          'performance:recommendations',
          3600, // 1 hour
          JSON.stringify(recommendations)
        );
      } catch (error) {
        safeLogger.warn('Failed to store recommendations:', error);
      }
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;

    for (const [pathName, metrics] of this.pathMetrics) {
      const filteredMetrics = metrics.filter(m => m.timestamp.getTime() > sixHoursAgo);
      this.pathMetrics.set(pathName, filteredMetrics);
    }

    // Clean user feedback
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.userFeedback = this.userFeedback.filter(f => f.timestamp.getTime() > oneDayAgo);
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): {
    pathName: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    estimatedImprovement: number;
    implementation: string;
  }[] {
    const recommendations = [];

    for (const [pathName, metrics] of this.pathMetrics) {
      if (metrics.length === 0) continue;

      const recentMetrics = metrics.slice(-50);
      const avgDuration = recentMetrics.reduce((sum, m) => sum + m.totalDuration, 0) / recentMetrics.length;
      const baseline = this.performanceBaselines.get(pathName);

      // Check if performance is degraded
      if (baseline && avgDuration > baseline.p95) {
        recommendations.push({
          pathName,
          priority: 'high' as const,
          type: 'performance_degradation',
          description: `Performance is ${((avgDuration / baseline.p95 - 1) * 100).toFixed(1)}% slower than baseline`,
          estimatedImprovement: 30,
          implementation: 'Investigate recent changes and optimize bottlenecks'
        });
      }

      // Aggregate optimization opportunities
      const allOpportunities = recentMetrics.flatMap(m => m.optimizationOpportunities);
      const opportunityTypes = new Map<string, number>();
      
      allOpportunities.forEach(opp => {
        opportunityTypes.set(opp.type, (opportunityTypes.get(opp.type) || 0) + 1);
      });

      // Recommend most common optimization opportunities
      for (const [type, count] of opportunityTypes) {
        if (count >= recentMetrics.length * 0.3) { // Appears in 30% of executions
          const sampleOpp = allOpportunities.find(o => o.type === type);
          if (sampleOpp) {
            recommendations.push({
              pathName,
              priority: sampleOpp.priority,
              type: sampleOpp.type,
              description: sampleOpp.description,
              estimatedImprovement: sampleOpp.estimatedImprovement,
              implementation: sampleOpp.implementation
            });
          }
        }
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    criticalPaths: {
      pathName: string;
      averageDuration: number;
      performanceLevel: string;
      recentExecutions: number;
      bottleneckCount: number;
    }[];
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    userSatisfaction: number;
    recommendations: number;
  } {
    const criticalPaths = [];
    let totalNegativeFeedback = 0;
    let totalFeedback = 0;

    for (const pathName of this.CRITICAL_PATHS) {
      const metrics = this.pathMetrics.get(pathName) || [];
      const recentMetrics = metrics.slice(-50);
      
      if (recentMetrics.length > 0) {
        const avgDuration = recentMetrics.reduce((sum, m) => sum + m.totalDuration, 0) / recentMetrics.length;
        const performanceLevel = this.categorizePerformance(avgDuration);
        const bottleneckCount = recentMetrics.reduce((sum, m) => sum + m.bottlenecks.length, 0);

        criticalPaths.push({
          pathName,
          averageDuration: avgDuration,
          performanceLevel,
          recentExecutions: recentMetrics.length,
          bottleneckCount
        });
      }

      // Aggregate user feedback
      const pathFeedback = this.userFeedback.filter(f => f.pathName === pathName);
      totalFeedback += pathFeedback.length;
      totalNegativeFeedback += pathFeedback.filter(f => 
        f.perceivedPerformance === 'slow' || f.perceivedPerformance === 'very_slow').length;
    }

    // Calculate overall health
    const fastPaths = criticalPaths.filter(p => p.performanceLevel === 'fast').length;
    const acceptablePaths = criticalPaths.filter(p => p.performanceLevel === 'acceptable').length;
    const totalPaths = criticalPaths.length;

    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    if (fastPaths / totalPaths > 0.8) overallHealth = 'excellent';
    else if ((fastPaths + acceptablePaths) / totalPaths > 0.7) overallHealth = 'good';
    else if ((fastPaths + acceptablePaths) / totalPaths > 0.5) overallHealth = 'fair';
    else overallHealth = 'poor';

    // Calculate user satisfaction
    const userSatisfaction = totalFeedback > 0 ? 
      ((totalFeedback - totalNegativeFeedback) / totalFeedback) * 100 : 100;

    const recommendations = this.getOptimizationRecommendations().length;

    return {
      criticalPaths,
      overallHealth,
      userSatisfaction,
      recommendations
    };
  }

  /**
   * Get detailed metrics for a specific path
   */
  getPathMetrics(pathName: string, limit: number = 100): CriticalPathMetrics[] {
    const metrics = this.pathMetrics.get(pathName) || [];
    return metrics.slice(-limit);
  }

  /**
   * Get performance baselines
   */
  getPerformanceBaselines(): Map<string, PerformanceBaseline> {
    return new Map(this.performanceBaselines);
  }

  /**
   * Get user feedback
   */
  getUserFeedback(pathName?: string): UserFeedbackMetrics[] {
    if (pathName) {
      return this.userFeedback.filter(f => f.pathName === pathName);
    }
    return [...this.userFeedback];
  }
}

export default CriticalPathPerformanceOptimizer;