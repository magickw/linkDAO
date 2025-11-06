import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import PerformanceBenchmarkService from './performanceBenchmarkService';
import RenderPerformanceMonitoringService from './renderPerformanceMonitoringService';
import ErrorRecoveryCacheProfiler from './errorRecoveryCacheProfiler';
import CriticalPathPerformanceOptimizer from './criticalPathPerformanceOptimizer';

/**
 * Performance Monitoring Integration Service
 * Coordinates all performance monitoring services and provides unified interface
 */
export class PerformanceMonitoringIntegration {
  private pool: Pool;
  private redis: Redis;
  private benchmarkService: PerformanceBenchmarkService;
  private renderMonitoringService: RenderPerformanceMonitoringService;
  private errorRecoveryProfiler: ErrorRecoveryCacheProfiler;
  private criticalPathOptimizer: CriticalPathPerformanceOptimizer;
  private isInitialized: boolean = false;

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
  }

  /**
   * Initialize all performance monitoring services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      safeLogger.warn('Performance monitoring already initialized');
      return;
    }

    try {
      safeLogger.info('🚀 Initializing performance monitoring services...');

      // Initialize services
      this.benchmarkService = new PerformanceBenchmarkService(this.pool, this.redis);
      this.renderMonitoringService = new RenderPerformanceMonitoringService(this.pool, this.redis);
      this.errorRecoveryProfiler = new ErrorRecoveryCacheProfiler(this.redis);
      this.criticalPathOptimizer = new CriticalPathPerformanceOptimizer(this.pool, this.redis);

      // Run initial benchmark if in development
      if (process.env.NODE_ENV === 'development') {
        setTimeout(async () => {
          try {
            await this.runInitialBenchmark();
          } catch (error) {
            safeLogger.warn('Initial benchmark failed:', error);
          }
        }, 30000); // Wait 30 seconds after startup
      }

      this.isInitialized = true;
      safeLogger.info('✅ Performance monitoring services initialized successfully');
    } catch (error) {
      safeLogger.error('❌ Failed to initialize performance monitoring:', error);
      throw error;
    }
  }

  /**
   * Shutdown all performance monitoring services
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      safeLogger.info('🛑 Shutting down performance monitoring services...');

      // Stop all monitoring services
      if (this.renderMonitoringService) {
        this.renderMonitoringService.stopMonitoring();
      }

      if (this.errorRecoveryProfiler) {
        this.errorRecoveryProfiler.stopProfiling();
      }

      if (this.criticalPathOptimizer) {
        this.criticalPathOptimizer.stopOptimization();
      }

      this.isInitialized = false;
      safeLogger.info('✅ Performance monitoring services shut down successfully');
    } catch (error) {
      safeLogger.error('❌ Error shutting down performance monitoring:', error);
    }
  }

  /**
   * Run initial benchmark to establish baselines
   */
  private async runInitialBenchmark(): Promise<void> {
    try {
      safeLogger.info('🏃 Running initial performance benchmark...');
      
      const results = await this.benchmarkService.runComprehensiveBenchmarks();
      
      safeLogger.info('📊 Initial benchmark completed', {
        overallScore: results.overallScore,
        recommendationCount: results.recommendations.length,
        operation: 'initial_benchmark'
      });

      // Log any critical recommendations
      const criticalRecommendations = results.recommendations.filter(r => 
        r.includes('critical') || r.includes('Critical'));
      
      if (criticalRecommendations.length > 0) {
        safeLogger.warn('⚠️ Critical performance issues detected:', {
          recommendations: criticalRecommendations,
          operation: 'initial_benchmark_warnings'
        });
      }
    } catch (error) {
      safeLogger.error('❌ Initial benchmark failed:', error);
    }
  }

  /**
   * Profile a critical path operation
   */
  async profileCriticalPath<T>(
    pathName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!this.isInitialized) {
      safeLogger.warn('Performance monitoring not initialized, executing without profiling');
      return await operation();
    }

    return await this.criticalPathOptimizer.profileCriticalPath(pathName, operation);
  }

  /**
   * Profile an error recovery operation
   */
  async profileErrorRecovery<T>(
    errorType: string,
    recoveryMethod: string,
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    if (!this.isInitialized) {
      safeLogger.warn('Performance monitoring not initialized, executing without profiling');
      return await operation();
    }

    return await this.errorRecoveryProfiler.profileErrorRecovery(
      errorType,
      recoveryMethod,
      operation,
      maxRetries
    );
  }

  /**
   * Profile a cache operation
   */
  async profileCacheOperation<T>(
    operation: 'get' | 'set' | 'delete' | 'clear',
    cacheType: 'memory' | 'redis' | 'database' | 'file',
    key: string,
    cacheOperation: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    if (!this.isInitialized) {
      safeLogger.warn('Performance monitoring not initialized, executing without profiling');
      return await cacheOperation();
    }

    return await this.errorRecoveryProfiler.profileCacheOperation(
      operation,
      cacheType,
      key,
      cacheOperation,
      ttl
    );
  }

  /**
   * Record user performance feedback
   */
  recordUserFeedback(
    pathName: string,
    perceivedPerformance: 'fast' | 'acceptable' | 'slow' | 'very_slow',
    actualDuration: number,
    userId?: string,
    userAgent?: string
  ): void {
    if (!this.isInitialized) {
      safeLogger.warn('Performance monitoring not initialized, skipping user feedback');
      return;
    }

    this.criticalPathOptimizer.recordUserFeedback(
      pathName,
      perceivedPerformance,
      actualDuration,
      userId,
      userAgent
    );
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary(): Promise<{
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    if (!this.isInitialized) {
      return {
        status: 'critical',
        score: 0,
        issues: ['Performance monitoring not initialized'],
        recommendations: ['Initialize performance monitoring services']
      };
    }

    try {
      const [
        renderSummary,
        criticalPathSummary,
        profilerRecommendations
      ] = await Promise.all([
        this.renderMonitoringService.getPerformanceSummary(),
        this.criticalPathOptimizer.getPerformanceSummary(),
        this.errorRecoveryProfiler.generatePerformanceRecommendations()
      ]);

      // Calculate overall score
      let overallScore = (renderSummary.score + (criticalPathSummary.userSatisfaction || 100)) / 2;
      
      // Adjust based on critical path health
      if (criticalPathSummary.overallHealth === 'poor') overallScore -= 20;
      else if (criticalPathSummary.overallHealth === 'fair') overallScore -= 10;

      // Determine status
      let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      if (overallScore >= 90) status = 'excellent';
      else if (overallScore >= 75) status = 'good';
      else if (overallScore >= 60) status = 'fair';
      else if (overallScore >= 40) status = 'poor';
      else status = 'critical';

      // Combine issues and recommendations
      const issues = [
        ...renderSummary.issues,
        ...(criticalPathSummary.overallHealth === 'poor' ? ['Critical path performance issues'] : [])
      ];

      const recommendations = [
        ...renderSummary.recommendations.map(r => r.title),
        ...profilerRecommendations.map(r => r.title)
      ].slice(0, 10); // Top 10

      return {
        status,
        score: Math.round(overallScore),
        issues,
        recommendations
      };
    } catch (error) {
      safeLogger.error('Error getting performance summary:', error);
      return {
        status: 'critical',
        score: 0,
        issues: ['Error retrieving performance data'],
        recommendations: ['Check performance monitoring services']
      };
    }
  }

  /**
   * Check if performance monitoring is healthy
   */
  isHealthy(): boolean {
    return this.isInitialized;
  }

  /**
   * Get service instances (for advanced usage)
   */
  getServices(): {
    benchmark: PerformanceBenchmarkService;
    renderMonitoring: RenderPerformanceMonitoringService;
    errorRecoveryProfiler: ErrorRecoveryCacheProfiler;
    criticalPathOptimizer: CriticalPathPerformanceOptimizer;
  } | null {
    if (!this.isInitialized) return null;

    return {
      benchmark: this.benchmarkService,
      renderMonitoring: this.renderMonitoringService,
      errorRecoveryProfiler: this.errorRecoveryProfiler,
      criticalPathOptimizer: this.criticalPathOptimizer
    };
  }
}

// Export singleton instance factory
let performanceMonitoringIntegration: PerformanceMonitoringIntegration | null = null;

export function createPerformanceMonitoringIntegration(pool: Pool, redis: Redis): PerformanceMonitoringIntegration {
  if (!performanceMonitoringIntegration) {
    performanceMonitoringIntegration = new PerformanceMonitoringIntegration(pool, redis);
  }
  return performanceMonitoringIntegration;
}

export function getPerformanceMonitoringIntegration(): PerformanceMonitoringIntegration | null {
  return performanceMonitoringIntegration;
}

export default PerformanceMonitoringIntegration;