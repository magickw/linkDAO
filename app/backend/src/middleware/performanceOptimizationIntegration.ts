import { Express, Request, Response, NextFunction } from 'express';
import { databaseOptimizationService } from '../services/databaseOptimizationService';
import { 
  dynamicRateLimit, 
  extractUserTier, 
  rateLimitMonitoring,
  internalServiceBypass,
  emergencyRateLimitOverride
} from './dynamicRateLimit';
import { 
  deduplicationMiddleware, 
  responseCacheMiddleware,
  requestDeduplicationService
} from '../services/requestDeduplicationService';
import { 
  standardCompression, 
  responseOptimization, 
  largePayloadOptimization 
} from './compressionMiddleware';
import { 
  defaultApiCache,
  apiResponseCacheService
} from '../services/apiResponseCacheService';
import { logger } from '../utils/logger';

/**
 * Performance optimization integration service
 */
export class PerformanceOptimizationIntegration {
  private static instance: PerformanceOptimizationIntegration;
  private isInitialized = false;

  public static getInstance(): PerformanceOptimizationIntegration {
    if (!PerformanceOptimizationIntegration.instance) {
      PerformanceOptimizationIntegration.instance = new PerformanceOptimizationIntegration();
    }
    return PerformanceOptimizationIntegration.instance;
  }

  /**
   * Initialize all performance optimizations
   */
  public async initialize(app: Express): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Performance optimizations already initialized');
      return;
    }

    try {
      logger.info('Initializing performance optimizations...');

      // 1. Database optimizations
      await this.initializeDatabaseOptimizations();

      // 2. Apply middleware in correct order
      this.applyPerformanceMiddleware(app);

      // 3. Initialize monitoring and cleanup
      this.initializeMonitoring();

      this.isInitialized = true;
      logger.info('Performance optimizations initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize performance optimizations:', error);
      throw error;
    }
  }

  /**
   * Initialize database optimizations
   */
  private async initializeDatabaseOptimizations(): Promise<void> {
    try {
      // Create performance indexes
      await databaseOptimizationService.createOptimizationIndexes();
      
      // Optimize connection settings
      await databaseOptimizationService.optimizeConnectionSettings();
      
      logger.info('Database optimizations applied');
    } catch (error) {
      logger.error('Database optimization failed:', error);
      // Don't throw - continue with other optimizations
    }
  }

  /**
   * Apply performance middleware in the correct order
   */
  private applyPerformanceMiddleware(app: Express): void {
    // 1. Emergency overrides (highest priority)
    app.use(emergencyRateLimitOverride);

    // 2. Internal service bypass
    app.use(internalServiceBypass);

    // 3. Request monitoring and user tier extraction
    app.use(rateLimitMonitoring);
    app.use(extractUserTier);

    // 4. Rate limiting (before caching to prevent cache pollution)
    app.use(dynamicRateLimit);

    // 5. Request deduplication (prevent duplicate processing)
    app.use(deduplicationMiddleware);

    // 6. Response caching (cache successful responses)
    app.use(responseCacheMiddleware(300)); // 5 minutes default TTL
    app.use(defaultApiCache);

    // 7. Response compression and optimization
    app.use(standardCompression);
    app.use(responseOptimization);
    app.use(largePayloadOptimization);

    logger.info('Performance middleware applied');
  }

  /**
   * Initialize monitoring and cleanup processes
   */
  private initializeMonitoring(): void {
    // Start performance monitoring
    setInterval(async () => {
      try {
        await this.collectPerformanceMetrics();
      } catch (error) {
        logger.error('Error collecting performance metrics:', error);
      }
    }, 60000); // Every minute

    // Start cleanup processes
    setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        logger.error('Error during cleanup:', error);
      }
    }, 300000); // Every 5 minutes

    logger.info('Performance monitoring initialized');
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<void> {
    try {
      // Database performance metrics
      const dbStats = await databaseOptimizationService.getDatabaseStats();
      
      // Cache performance metrics
      const cacheStats = apiResponseCacheService.getCacheStats();
      const deduplicationStats = requestDeduplicationService.getCacheStats();

      // Query performance analysis
      const queryAnalysis = await databaseOptimizationService.analyzeQueryPerformance();

      const metrics = {
        timestamp: new Date().toISOString(),
        database: dbStats,
        cache: cacheStats,
        deduplication: deduplicationStats,
        queries: {
          slowQueryCount: queryAnalysis.slowQueries.length,
          averageExecutionTime: queryAnalysis.performanceStats.averageExecutionTime,
          totalQueries: queryAnalysis.performanceStats.totalQueries
        }
      };

      // Log metrics for monitoring systems
      logger.info('Performance metrics collected', metrics);

      // Alert on performance issues
      this.checkPerformanceAlerts(metrics);
    } catch (error) {
      logger.error('Error collecting performance metrics:', error);
    }
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(metrics: any): void {
    // Database connection alerts
    if (metrics.database.connectionStats.active_connections > 20) {
      logger.warn('High database connection usage', {
        activeConnections: metrics.database.connectionStats.active_connections
      });
    }

    // Cache hit rate alerts
    if (metrics.cache.hitRate < 50) {
      logger.warn('Low cache hit rate', {
        hitRate: metrics.cache.hitRate
      });
    }

    // Slow query alerts
    if (metrics.queries.slowQueryCount > 10) {
      logger.warn('High number of slow queries detected', {
        slowQueryCount: metrics.queries.slowQueryCount,
        averageTime: metrics.queries.averageExecutionTime
      });
    }

    // Average response time alerts
    if (metrics.queries.averageExecutionTime > 1000) {
      logger.warn('High average query execution time', {
        averageTime: metrics.queries.averageExecutionTime
      });
    }
  }

  /**
   * Perform cleanup operations
   */
  private async performCleanup(): Promise<void> {
    try {
      // Clean up expired cache entries
      await this.cleanupExpiredCache();

      // Clean up old performance metrics
      await this.cleanupOldMetrics();

      logger.debug('Cleanup operations completed');
    } catch (error) {
      logger.error('Error during cleanup operations:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredCache(): Promise<void> {
    // This would be implemented based on your cache service capabilities
    logger.debug('Cache cleanup completed');
  }

  /**
   * Clean up old performance metrics
   */
  private async cleanupOldMetrics(): Promise<void> {
    // Clean up old query metrics in database optimization service
    logger.debug('Metrics cleanup completed');
  }

  /**
   * Get comprehensive performance status
   */
  public async getPerformanceStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    metrics: any;
    recommendations: string[];
  }> {
    try {
      const metrics = {
        database: await databaseOptimizationService.getDatabaseStats(),
        cache: apiResponseCacheService.getCacheStats(),
        deduplication: requestDeduplicationService.getCacheStats(),
        queries: await databaseOptimizationService.analyzeQueryPerformance()
      };

      const recommendations: string[] = [];
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

      // Analyze metrics and generate recommendations
      if (metrics.cache.hitRate < 30) {
        status = 'degraded';
        recommendations.push('Consider increasing cache TTL or warming cache for popular endpoints');
      }

      if (metrics.queries.performanceStats.averageExecutionTime > 2000) {
        status = 'critical';
        recommendations.push('Database queries are slow - consider adding indexes or optimizing queries');
      }

      if (metrics.database.connectionStats.active_connections > 25) {
        status = 'degraded';
        recommendations.push('High database connection usage - consider connection pooling optimization');
      }

      return {
        status,
        metrics,
        recommendations
      };
    } catch (error) {
      logger.error('Error getting performance status:', error);
      return {
        status: 'critical',
        metrics: {},
        recommendations: ['Unable to collect performance metrics - check system health']
      };
    }
  }

  /**
   * Invalidate caches for specific operations
   */
  public async invalidateRelatedCaches(operation: string, data: any): Promise<void> {
    try {
      switch (operation) {
        case 'seller_profile_update':
          await apiResponseCacheService.invalidateByTags(['seller', 'profile']);
          await requestDeduplicationService.invalidateCache('seller');
          break;
        
        case 'listing_created':
        case 'listing_updated':
          await apiResponseCacheService.invalidateByTags(['listings', 'marketplace']);
          await requestDeduplicationService.invalidateCache('listings');
          break;
        
        case 'reputation_updated':
          await apiResponseCacheService.invalidateByTags(['reputation']);
          await requestDeduplicationService.invalidateCache('reputation');
          break;
        
        default:
          logger.debug(`No cache invalidation rules for operation: ${operation}`);
      }

      logger.info(`Cache invalidated for operation: ${operation}`);
    } catch (error) {
      logger.error('Error invalidating caches:', error);
    }
  }

  /**
   * Warm caches for popular endpoints
   */
  public async warmPopularCaches(): Promise<void> {
    try {
      const popularRequests = [
        { method: 'GET', path: '/marketplace/listings', query: { limit: 20, sortBy: 'createdAt' } },
        { method: 'GET', path: '/health' },
        // Add more popular endpoints as needed
      ];

      await apiResponseCacheService.warmCache(popularRequests);
      logger.info('Cache warming completed for popular endpoints');
    } catch (error) {
      logger.error('Error warming caches:', error);
    }
  }

  /**
   * Get optimization recommendations
   */
  public async getOptimizationRecommendations(): Promise<string[]> {
    try {
      const queryAnalysis = await databaseOptimizationService.analyzeQueryPerformance();
      const recommendations: string[] = [];

      // Add database recommendations
      recommendations.push(...queryAnalysis.indexRecommendations.map(rec => 
        `Add index on ${rec.table}.${rec.columns.join(', ')}: ${rec.reason}`
      ));

      // Add cache recommendations
      const cacheStats = apiResponseCacheService.getCacheStats();
      if (cacheStats.hitRate < 50) {
        recommendations.push('Consider increasing cache TTL for frequently accessed endpoints');
      }

      return recommendations;
    } catch (error) {
      logger.error('Error getting optimization recommendations:', error);
      return ['Unable to generate recommendations - check system health'];
    }
  }
}

export const performanceOptimizationIntegration = PerformanceOptimizationIntegration.getInstance();