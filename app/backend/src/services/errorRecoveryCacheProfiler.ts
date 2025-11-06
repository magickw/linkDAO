import { performance } from 'perf_hooks';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { circuitBreakerService } from './circuitBreakerService';

interface ErrorRecoveryMetrics {
  errorType: string;
  recoveryMethod: string;
  recoveryTime: number;
  success: boolean;
  retryAttempts: number;
  timestamp: Date;
  metadata?: any;
}

interface CachePerformanceMetrics {
  operation: 'get' | 'set' | 'delete' | 'clear';
  cacheType: 'memory' | 'redis' | 'database' | 'file';
  key: string;
  hitRate: number;
  responseTime: number;
  dataSize: number;
  ttl?: number;
  timestamp: Date;
}

interface CircuitBreakerMetrics {
  service: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  recoveryTime?: number;
}

interface ProfilerSummary {
  errorRecovery: {
    totalErrors: number;
    recoverySuccessRate: number;
    averageRecoveryTime: number;
    commonErrorTypes: { type: string; count: number }[];
    fastestRecoveryMethods: { method: string; avgTime: number }[];
  };
  cachePerformance: {
    overallHitRate: number;
    averageResponseTime: number;
    operationBreakdown: { operation: string; count: number; avgTime: number }[];
    cacheTypePerformance: { type: string; hitRate: number; avgTime: number }[];
  };
  circuitBreakers: {
    totalServices: number;
    healthyServices: number;
    openCircuits: number;
    recentFailures: number;
  };
}

/**
 * Error Recovery and Cache Performance Profiler
 * Implements task 14.3: Add performance profiling for error recovery and caching mechanisms
 */
export class ErrorRecoveryCacheProfiler {
  private redis: Redis;
  private errorRecoveryMetrics: ErrorRecoveryMetrics[] = [];
  private cacheMetrics: CachePerformanceMetrics[] = [];
  private circuitBreakerMetrics: Map<string, CircuitBreakerMetrics> = new Map();
  private profilingInterval: NodeJS.Timeout | null = null;
  
  private readonly MAX_METRICS_HISTORY = 10000;
  private readonly PROFILING_INTERVAL = 60000; // 1 minute

  constructor(redis: Redis) {
    this.redis = redis;
    this.startProfiling();
  }

  /**
   * Start performance profiling
   */
  private startProfiling(): void {
    safeLogger.info('🔍 Starting error recovery and cache performance profiling');

    this.profilingInterval = setInterval(() => {
      this.collectCircuitBreakerMetrics();
      this.analyzePerformanceTrends();
      this.cleanupOldMetrics();
    }, this.PROFILING_INTERVAL);
  }

  /**
   * Stop profiling
   */
  stopProfiling(): void {
    if (this.profilingInterval) {
      clearInterval(this.profilingInterval);
      this.profilingInterval = null;
      safeLogger.info('🔍 Error recovery and cache profiling stopped');
    }
  }

  /**
   * Profile error recovery operation
   */
  async profileErrorRecovery<T>(
    errorType: string,
    recoveryMethod: string,
    recoveryOperation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    const startTime = performance.now();
    let retryAttempts = 0;
    let lastError: any;

    while (retryAttempts <= maxRetries) {
      try {
        const result = await recoveryOperation();
        const recoveryTime = performance.now() - startTime;

        // Record successful recovery
        this.recordErrorRecovery({
          errorType,
          recoveryMethod,
          recoveryTime,
          success: true,
          retryAttempts,
          timestamp: new Date(),
          metadata: { maxRetries, finalAttempt: retryAttempts }
        });

        safeLogger.info(`✅ Error recovery successful: ${errorType} via ${recoveryMethod}`, {
          recoveryTime: recoveryTime.toFixed(2),
          retryAttempts,
          operation: 'error_recovery'
        });

        return result;
      } catch (error) {
        lastError = error;
        retryAttempts++;

        if (retryAttempts <= maxRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryAttempts - 1), 10000);
          safeLogger.warn(`⚠️ Error recovery attempt ${retryAttempts} failed, retrying in ${backoffDelay}ms`, {
            errorType,
            recoveryMethod,
            error: error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    // Record failed recovery
    const recoveryTime = performance.now() - startTime;
    this.recordErrorRecovery({
      errorType,
      recoveryMethod,
      recoveryTime,
      success: false,
      retryAttempts,
      timestamp: new Date(),
      metadata: { maxRetries, finalError: lastError?.message }
    });

    safeLogger.error(`❌ Error recovery failed: ${errorType} via ${recoveryMethod}`, {
      recoveryTime: recoveryTime.toFixed(2),
      retryAttempts,
      finalError: lastError?.message,
      operation: 'error_recovery_failed'
    });

    throw lastError;
  }

  /**
   * Profile cache operation
   */
  async profileCacheOperation<T>(
    operation: CachePerformanceMetrics['operation'],
    cacheType: CachePerformanceMetrics['cacheType'],
    key: string,
    cacheOperation: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const startTime = performance.now();
    let dataSize = 0;
    let hitRate = 0;

    try {
      const result = await cacheOperation();
      const responseTime = performance.now() - startTime;

      // Calculate data size (approximate)
      if (result !== null && result !== undefined) {
        dataSize = this.estimateDataSize(result);
        hitRate = operation === 'get' ? 1 : 0; // Hit if we got data
      }

      // Record cache performance
      this.recordCachePerformance({
        operation,
        cacheType,
        key,
        hitRate,
        responseTime,
        dataSize,
        ttl,
        timestamp: new Date()
      });

      safeLogger.debug(`📊 Cache operation: ${operation} ${cacheType}`, {
        key: key.substring(0, 50), // Truncate long keys
        responseTime: responseTime.toFixed(2),
        dataSize,
        hit: hitRate === 1,
        operation: 'cache_operation'
      });

      return result;
    } catch (error) {
      const responseTime = performance.now() - startTime;

      // Record failed cache operation
      this.recordCachePerformance({
        operation,
        cacheType,
        key,
        hitRate: 0,
        responseTime,
        dataSize: 0,
        ttl,
        timestamp: new Date()
      });

      safeLogger.warn(`⚠️ Cache operation failed: ${operation} ${cacheType}`, {
        key: key.substring(0, 50),
        responseTime: responseTime.toFixed(2),
        error: error.message,
        operation: 'cache_operation_failed'
      });

      throw error;
    }
  }

  /**
   * Profile circuit breaker operation
   */
  async profileCircuitBreakerOperation<T>(
    serviceName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      // Check if circuit breaker exists for this service
      if (!circuitBreakerService) {
        return await operation();
      }

      const result = await operation();
      const responseTime = performance.now() - startTime;

      // Record successful operation
      this.updateCircuitBreakerMetrics(serviceName, true, responseTime);

      return result;
    } catch (error) {
      const responseTime = performance.now() - startTime;

      // Record failed operation
      this.updateCircuitBreakerMetrics(serviceName, false, responseTime);

      throw error;
    }
  }

  /**
   * Record error recovery metrics
   */
  private recordErrorRecovery(metrics: ErrorRecoveryMetrics): void {
    this.errorRecoveryMetrics.push(metrics);
    
    // Keep only recent metrics
    if (this.errorRecoveryMetrics.length > this.MAX_METRICS_HISTORY) {
      this.errorRecoveryMetrics = this.errorRecoveryMetrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  /**
   * Record cache performance metrics
   */
  private recordCachePerformance(metrics: CachePerformanceMetrics): void {
    this.cacheMetrics.push(metrics);
    
    // Keep only recent metrics
    if (this.cacheMetrics.length > this.MAX_METRICS_HISTORY) {
      this.cacheMetrics = this.cacheMetrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  /**
   * Update circuit breaker metrics
   */
  private updateCircuitBreakerMetrics(serviceName: string, success: boolean, responseTime: number): void {
    let metrics = this.circuitBreakerMetrics.get(serviceName);
    
    if (!metrics) {
      metrics = {
        service: serviceName,
        state: 'closed',
        failureCount: 0,
        successCount: 0
      };
    }

    if (success) {
      metrics.successCount++;
      metrics.lastSuccess = new Date();
      
      // Reset failure count on success
      if (metrics.failureCount > 0) {
        metrics.recoveryTime = responseTime;
      }
      metrics.failureCount = 0;
      
      // Update state based on success
      if (metrics.state === 'half-open') {
        metrics.state = 'closed';
      }
    } else {
      metrics.failureCount++;
      metrics.lastFailure = new Date();
      
      // Update state based on failure threshold
      if (metrics.failureCount >= 5) {
        metrics.state = 'open';
      }
    }

    this.circuitBreakerMetrics.set(serviceName, metrics);
  }

  /**
   * Collect circuit breaker metrics from service
   */
  private collectCircuitBreakerMetrics(): void {
    // This would integrate with actual circuit breaker service
    // For now, we'll use the metrics we've collected
    safeLogger.debug('📊 Collecting circuit breaker metrics', {
      totalServices: this.circuitBreakerMetrics.size,
      operation: 'circuit_breaker_collection'
    });
  }

  /**
   * Analyze performance trends
   */
  private analyzePerformanceTrends(): void {
    const recentErrorRecovery = this.getRecentErrorRecoveryMetrics(300000); // Last 5 minutes
    const recentCache = this.getRecentCacheMetrics(300000);

    // Analyze error recovery trends
    if (recentErrorRecovery.length > 0) {
      const successRate = recentErrorRecovery.filter(m => m.success).length / recentErrorRecovery.length;
      const avgRecoveryTime = recentErrorRecovery
        .filter(m => m.success)
        .reduce((sum, m) => sum + m.recoveryTime, 0) / recentErrorRecovery.filter(m => m.success).length;

      if (successRate < 0.8) {
        safeLogger.warn('⚠️ Low error recovery success rate detected', {
          successRate: (successRate * 100).toFixed(1),
          recentErrors: recentErrorRecovery.length,
          operation: 'trend_analysis'
        });
      }

      if (avgRecoveryTime > 5000) {
        safeLogger.warn('⚠️ Slow error recovery times detected', {
          avgRecoveryTime: avgRecoveryTime.toFixed(2),
          operation: 'trend_analysis'
        });
      }
    }

    // Analyze cache performance trends
    if (recentCache.length > 0) {
      const hitRate = recentCache.reduce((sum, m) => sum + m.hitRate, 0) / recentCache.length;
      const avgResponseTime = recentCache.reduce((sum, m) => sum + m.responseTime, 0) / recentCache.length;

      if (hitRate < 0.7) {
        safeLogger.warn('⚠️ Low cache hit rate detected', {
          hitRate: (hitRate * 100).toFixed(1),
          recentOperations: recentCache.length,
          operation: 'trend_analysis'
        });
      }

      if (avgResponseTime > 100) {
        safeLogger.warn('⚠️ Slow cache response times detected', {
          avgResponseTime: avgResponseTime.toFixed(2),
          operation: 'trend_analysis'
        });
      }
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - 3600000;

    // Clean error recovery metrics
    this.errorRecoveryMetrics = this.errorRecoveryMetrics.filter(
      m => m.timestamp.getTime() > oneHourAgo
    );

    // Clean cache metrics
    this.cacheMetrics = this.cacheMetrics.filter(
      m => m.timestamp.getTime() > oneHourAgo
    );

    safeLogger.debug('🧹 Cleaned up old profiling metrics', {
      errorRecoveryCount: this.errorRecoveryMetrics.length,
      cacheMetricsCount: this.cacheMetrics.length,
      operation: 'metrics_cleanup'
    });
  }

  /**
   * Estimate data size
   */
  private estimateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Get recent error recovery metrics
   */
  private getRecentErrorRecoveryMetrics(timeWindowMs: number): ErrorRecoveryMetrics[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.errorRecoveryMetrics.filter(m => m.timestamp.getTime() > cutoff);
  }

  /**
   * Get recent cache metrics
   */
  private getRecentCacheMetrics(timeWindowMs: number): CachePerformanceMetrics[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.cacheMetrics.filter(m => m.timestamp.getTime() > cutoff);
  }

  /**
   * Get profiler summary
   */
  getProfilerSummary(timeWindowMs: number = 3600000): ProfilerSummary {
    const recentErrorRecovery = this.getRecentErrorRecoveryMetrics(timeWindowMs);
    const recentCache = this.getRecentCacheMetrics(timeWindowMs);

    // Error recovery analysis
    const successfulRecoveries = recentErrorRecovery.filter(m => m.success);
    const errorTypeCount = new Map<string, number>();
    const recoveryMethodTimes = new Map<string, number[]>();

    recentErrorRecovery.forEach(m => {
      errorTypeCount.set(m.errorType, (errorTypeCount.get(m.errorType) || 0) + 1);
      
      if (m.success) {
        if (!recoveryMethodTimes.has(m.recoveryMethod)) {
          recoveryMethodTimes.set(m.recoveryMethod, []);
        }
        recoveryMethodTimes.get(m.recoveryMethod)!.push(m.recoveryTime);
      }
    });

    const commonErrorTypes = Array.from(errorTypeCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const fastestRecoveryMethods = Array.from(recoveryMethodTimes.entries())
      .map(([method, times]) => ({
        method,
        avgTime: times.reduce((sum, time) => sum + time, 0) / times.length
      }))
      .sort((a, b) => a.avgTime - b.avgTime)
      .slice(0, 5);

    // Cache performance analysis
    const cacheOperationCount = new Map<string, { count: number; totalTime: number }>();
    const cacheTypeStats = new Map<string, { hits: number; total: number; totalTime: number }>();

    recentCache.forEach(m => {
      // Operation breakdown
      const opKey = m.operation;
      const opStats = cacheOperationCount.get(opKey) || { count: 0, totalTime: 0 };
      opStats.count++;
      opStats.totalTime += m.responseTime;
      cacheOperationCount.set(opKey, opStats);

      // Cache type performance
      const typeStats = cacheTypeStats.get(m.cacheType) || { hits: 0, total: 0, totalTime: 0 };
      typeStats.total++;
      typeStats.totalTime += m.responseTime;
      if (m.hitRate > 0) typeStats.hits++;
      cacheTypeStats.set(m.cacheType, typeStats);
    });

    const operationBreakdown = Array.from(cacheOperationCount.entries())
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        avgTime: stats.totalTime / stats.count
      }));

    const cacheTypePerformance = Array.from(cacheTypeStats.entries())
      .map(([type, stats]) => ({
        type,
        hitRate: stats.hits / stats.total,
        avgTime: stats.totalTime / stats.total
      }));

    // Circuit breaker analysis
    const circuitBreakerArray = Array.from(this.circuitBreakerMetrics.values());
    const healthyServices = circuitBreakerArray.filter(cb => cb.state === 'closed').length;
    const openCircuits = circuitBreakerArray.filter(cb => cb.state === 'open').length;
    const recentFailures = circuitBreakerArray.reduce((sum, cb) => sum + cb.failureCount, 0);

    return {
      errorRecovery: {
        totalErrors: recentErrorRecovery.length,
        recoverySuccessRate: recentErrorRecovery.length > 0 ? 
          successfulRecoveries.length / recentErrorRecovery.length : 0,
        averageRecoveryTime: successfulRecoveries.length > 0 ?
          successfulRecoveries.reduce((sum, m) => sum + m.recoveryTime, 0) / successfulRecoveries.length : 0,
        commonErrorTypes,
        fastestRecoveryMethods
      },
      cachePerformance: {
        overallHitRate: recentCache.length > 0 ?
          recentCache.reduce((sum, m) => sum + m.hitRate, 0) / recentCache.length : 0,
        averageResponseTime: recentCache.length > 0 ?
          recentCache.reduce((sum, m) => sum + m.responseTime, 0) / recentCache.length : 0,
        operationBreakdown,
        cacheTypePerformance
      },
      circuitBreakers: {
        totalServices: circuitBreakerArray.length,
        healthyServices,
        openCircuits,
        recentFailures
      }
    };
  }

  /**
   * Get detailed metrics
   */
  getDetailedMetrics(): {
    errorRecovery: ErrorRecoveryMetrics[];
    cachePerformance: CachePerformanceMetrics[];
    circuitBreakers: CircuitBreakerMetrics[];
  } {
    return {
      errorRecovery: [...this.errorRecoveryMetrics],
      cachePerformance: [...this.cacheMetrics],
      circuitBreakers: Array.from(this.circuitBreakerMetrics.values())
    };
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations(): {
    category: 'error_recovery' | 'cache' | 'circuit_breaker';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    implementation: string;
  }[] {
    const recommendations = [];
    const summary = this.getProfilerSummary();

    // Error recovery recommendations
    if (summary.errorRecovery.recoverySuccessRate < 0.8) {
      recommendations.push({
        category: 'error_recovery' as const,
        priority: 'high' as const,
        title: 'Improve Error Recovery Success Rate',
        description: `Current success rate is ${(summary.errorRecovery.recoverySuccessRate * 100).toFixed(1)}%`,
        implementation: 'Review and optimize error recovery strategies, implement better fallback mechanisms'
      });
    }

    if (summary.errorRecovery.averageRecoveryTime > 3000) {
      recommendations.push({
        category: 'error_recovery' as const,
        priority: 'medium' as const,
        title: 'Optimize Error Recovery Time',
        description: `Average recovery time is ${summary.errorRecovery.averageRecoveryTime.toFixed(0)}ms`,
        implementation: 'Implement faster fallback mechanisms, reduce retry delays'
      });
    }

    // Cache recommendations
    if (summary.cachePerformance.overallHitRate < 0.7) {
      recommendations.push({
        category: 'cache' as const,
        priority: 'high' as const,
        title: 'Improve Cache Hit Rate',
        description: `Current hit rate is ${(summary.cachePerformance.overallHitRate * 100).toFixed(1)}%`,
        implementation: 'Review cache keys and TTL settings, implement cache warming strategies'
      });
    }

    if (summary.cachePerformance.averageResponseTime > 50) {
      recommendations.push({
        category: 'cache' as const,
        priority: 'medium' as const,
        title: 'Optimize Cache Response Time',
        description: `Average response time is ${summary.cachePerformance.averageResponseTime.toFixed(1)}ms`,
        implementation: 'Consider using faster cache storage, optimize serialization'
      });
    }

    // Circuit breaker recommendations
    if (summary.circuitBreakers.openCircuits > 0) {
      recommendations.push({
        category: 'circuit_breaker' as const,
        priority: 'critical' as const,
        title: 'Address Open Circuit Breakers',
        description: `${summary.circuitBreakers.openCircuits} services have open circuit breakers`,
        implementation: 'Investigate and fix underlying service issues'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

export default ErrorRecoveryCacheProfiler;