import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { Pool } from 'pg';
import { ResponseCachingMiddleware } from './responseCachingMiddleware';
import DatabaseOptimizationMiddleware from './databaseOptimizationMiddleware';
import CompressionOptimizationMiddleware from './compressionOptimizationMiddleware';
import ConnectionPoolOptimizer from '../services/connectionPoolOptimizer';
import DatabaseIndexOptimizer from '../services/databaseIndexOptimizer';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  compressionRate: number;
  databaseQueryTime: number;
  poolUtilization: number;
  indexEfficiency: number;
  errorRate: number;
}

interface OptimizationConfig {
  enableCaching: boolean;
  enableCompression: boolean;
  enableDatabaseOptimization: boolean;
  enableConnectionPooling: boolean;
  enableIndexOptimization: boolean;
  enableMetrics: boolean;
  enableAutoOptimization: boolean;
}

/**
 * Performance Optimization Integration Middleware
 * Integrates all performance optimization components
 */
export class PerformanceOptimizationIntegration {
  private pool: Pool;
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;
  
  // Optimization components
  private responseCaching: ResponseCachingMiddleware;
  private databaseOptimization: DatabaseOptimizationMiddleware;
  private compressionOptimization: CompressionOptimizationMiddleware;
  private connectionPoolOptimizer: ConnectionPoolOptimizer;
  private databaseIndexOptimizer: DatabaseIndexOptimizer;

  // Monitoring
  private requestTimes: number[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private optimizationInterval?: NodeJS.Timeout;

  private defaultConfig: OptimizationConfig = {
    enableCaching: true,
    enableCompression: true,
    enableDatabaseOptimization: true,
    enableConnectionPooling: true,
    enableIndexOptimization: true,
    enableMetrics: true,
    enableAutoOptimization: true,
  };

  constructor(pool: Pool, config: OptimizationConfig) {
    this.pool = pool;
    this.config = { ...this.defaultConfig, ...config };
    this.metrics = this.initializeMetrics();
    this.requestTimes = [];
    
    // Initialize components based on config
    this.initializeComponents();
    
    // Start monitoring if enabled
    if (this.config.enableMetrics) {
      this.startMonitoring();
    }
    
    // Setup memory cleanup
    this.setupMemoryCleanup();
  }

  /**
   * Setup periodic memory cleanup to prevent memory leaks
   */
  private setupMemoryCleanup(): void {
    // Clean up old metrics data every hour
    setInterval(() => {
      try {
        // Limit request times to last 1000 requests to prevent unbounded growth
        if (this.requestTimes.length > 1000) {
          this.requestTimes = this.requestTimes.slice(-1000);
        }
        
        // Reset metrics if they get too large (prevent memory leaks)
        if (this.metrics.totalRequests > 1000000) {
          this.resetMetrics();
          safeLogger.info('Performance metrics reset to prevent memory leaks');
        }
        
        safeLogger.debug(`Performance metrics cleanup: ${this.requestTimes.length} request times, ${this.metrics.totalRequests} total requests`);
      } catch (error) {
        safeLogger.warn('Error during performance metrics cleanup:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      compressionRate: 0,
      databaseQueryTime: 0,
      poolUtilization: 0,
      indexEfficiency: 0,
      errorRate: 0
    };
  }

  /**
   * Initialize optimization components
   */
  private initializeComponents(): void {
    if (this.config.enableCaching) {
      this.responseCaching = new ResponseCachingMiddleware();
    }

    if (this.config.enableDatabaseOptimization) {
      this.databaseOptimization = new DatabaseOptimizationMiddleware(this.pool, {
        enableQueryLogging: true,
        slowQueryThreshold: 1000,
        enableIndexHints: true,
        enableQueryPlan: true,
        cacheQueryPlans: true
      });
    }

    if (this.config.enableCompression) {
      this.compressionOptimization = new CompressionOptimizationMiddleware({
        threshold: 1024,
        level: 6,
        enableBrotli: true,
        enableGzip: true
      });
    }

    if (this.config.enableConnectionPooling) {
      this.connectionPoolOptimizer = new ConnectionPoolOptimizer(this.pool);
    }

    if (this.config.enableIndexOptimization) {
      this.databaseIndexOptimizer = new DatabaseIndexOptimizer(this.pool);
    }
  }

  /**
   * Start monitoring and auto-optimization
   */
  private startMonitoring(): void {
    if (!this.config.enableMetrics) return;

    // Update metrics every minute
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, 60000);

    // Run optimization every 10 minutes
    if (this.config.enableAutoOptimization) {
      this.optimizationInterval = setInterval(() => {
        this.runAutoOptimization();
      }, 600000);
    }
  }

  /**
   * Main performance optimization middleware
   */
  optimize() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      this.metrics.totalRequests++;

      // Add performance context to request
      req.performance = {
        startTime,
        optimizations: {
          caching: this.config.enableCaching,
          compression: this.config.enableCompression,
          database: this.config.enableDatabaseOptimization,
          pooling: this.config.enableConnectionPooling,
          indexing: this.config.enableIndexOptimization
        },
        metrics: () => this.getMetrics()
      };

      // Apply optimizations in order
      const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

      // 1. Compression (should be early in the chain)
      if (this.config.enableCompression) {
        middlewares.push(this.compressionOptimization.adaptiveCompression());
        middlewares.push(this.compressionOptimization.contentAwareCompression());
      }

      // 2. Caching (before database operations)
      if (this.config.enableCaching) {
        middlewares.push(this.getCachingMiddleware(req));
      }

      // 3. Database optimization
      if (this.config.enableDatabaseOptimization) {
        middlewares.push(this.databaseOptimization.optimize());
      }

      // Execute middleware chain
      let currentIndex = 0;
      const executeNext = () => {
        if (currentIndex < middlewares.length) {
          const middleware = middlewares[currentIndex++];
          middleware(req, res, executeNext);
        } else {
          // All optimizations applied, continue to next middleware
          this.trackRequestCompletion(req, res, startTime);
          next();
        }
      };

      executeNext();
    };
  }

  /**
   * Get appropriate caching middleware based on request
   */
  private getCachingMiddleware(req: Request) {
    const path = req.path.toLowerCase();
    
    // Different caching strategies for different endpoints
    if (path.includes('/marketplace/listings')) {
      return this.responseCaching.cache({
        ttl: 60, // 1 minute for listings
        keyGenerator: (req) => {
          const query = new URLSearchParams(req.query as any).toString();
          return `listings:${Buffer.from(query).toString('base64')}`;
        },
        varyBy: ['query:category', 'query:search', 'query:page']
      });
    }

    if (path.includes('/sellers/') && path.includes('/profile')) {
      return this.responseCaching.cache({
        ttl: 300, // 5 minutes for seller profiles
        keyGenerator: (req) => `seller:${req.params.sellerId}`,
        condition: (req, res) => req.method === 'GET' && res.statusCode === 200
      });
    }

    if (path.includes('/products/')) {
      return this.responseCaching.cache({
        ttl: 600, // 10 minutes for product details
        keyGenerator: (req) => `product:${req.params.productId}`,
        condition: (req, res) => req.method === 'GET' && res.statusCode === 200
      });
    }

    // Default caching
    return this.responseCaching.cache({
      ttl: 300,
      condition: (req, res) => req.method === 'GET' && res.statusCode === 200
    });
  }

  /**
   * Track request completion and update metrics
   */
  private trackRequestCompletion(req: Request, res: Response, startTime: number): void {
    res.on('finish', () => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.requestTimes.push(responseTime);
      
      // Keep only recent request times
      if (this.requestTimes.length > 1000) {
        this.requestTimes = this.requestTimes.slice(-1000);
      }

      // Track query analysis for index optimization
      if (this.config.enableIndexOptimization && req.db) {
        // This would be called after database queries are executed
        // Implementation would depend on how queries are tracked
      }

      // Add performance headers only if headers haven't been sent yet
      if (!res.headersSent) {
        res.set({
          'X-Response-Time': `${responseTime.toFixed(2)}ms`,
          'X-Performance-Optimized': 'true',
          'X-Optimizations': Object.entries(req.performance?.optimizations || {})
            .filter(([_, enabled]) => enabled)
            .map(([name]) => name)
            .join(',')
        });
      }
    });
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    try {
      // Calculate average response time
      if (this.requestTimes.length > 0) {
        const sum = this.requestTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageResponseTime = sum / this.requestTimes.length;
      }

      // Get cache metrics
      if (this.config.enableCaching && this.responseCaching) {
        const cacheMetrics = this.responseCaching.getMetrics();
        this.metrics.cacheHitRate = cacheMetrics.hitRate;
      }

      // Get compression metrics
      if (this.config.enableCompression && this.compressionOptimization) {
        const compressionMetrics = this.compressionOptimization.getMetrics();
        this.metrics.compressionRate = compressionMetrics.compressionRate;
      }

      // Get database metrics
      if (this.config.enableDatabaseOptimization && this.databaseOptimization) {
        const dbMetrics = this.databaseOptimization.getMetrics();
        this.metrics.databaseQueryTime = dbMetrics.averageQueryTime;
      }

      // Get pool metrics
      if (this.config.enableConnectionPooling && this.connectionPoolOptimizer) {
        const poolMetrics = this.connectionPoolOptimizer.getMetrics();
        this.metrics.poolUtilization = poolMetrics.poolUtilization;
      }

    } catch (error) {
      safeLogger.error('Error updating performance metrics:', error);
    }
  }

  /**
   * Run automatic optimization
   */
  private async runAutoOptimization(): Promise<void> {
    try {
      safeLogger.info('Running automatic performance optimization...');

      // Optimize connection pool
      if (this.config.enableConnectionPooling && this.connectionPoolOptimizer) {
        await this.connectionPoolOptimizer.forceOptimization();
      }

      // Generate index recommendations
      if (this.config.enableIndexOptimization && this.databaseIndexOptimizer) {
        const recommendations = await this.databaseIndexOptimizer.generateIndexRecommendations();
        
        if (recommendations.length > 0) {
          safeLogger.info(`Generated ${recommendations.length} index recommendations`);
          
          // Auto-apply critical recommendations
          const criticalRecs = recommendations.filter(rec => rec.priority === 'critical');
          for (const rec of criticalRecs.slice(0, 3)) { // Limit to 3 at a time
            const result = await this.databaseIndexOptimizer.createIndex(rec);
            if (result.success) {
              safeLogger.info(`Auto-applied critical index: ${rec.createStatement}`);
            }
          }
        }
      }

      safeLogger.info('Automatic optimization completed');

    } catch (error) {
      safeLogger.error('Auto-optimization error:', error);
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): PerformanceMetrics & {
    components: {
      caching?: any;
      compression?: any;
      database?: any;
      connectionPool?: any;
      indexing?: any;
    };
  } {
    const componentMetrics: any = {};

    if (this.config.enableCaching && this.responseCaching) {
      componentMetrics.caching = this.responseCaching.getMetrics();
    }

    if (this.config.enableCompression && this.compressionOptimization) {
      componentMetrics.compression = this.compressionOptimization.getMetrics();
    }

    if (this.config.enableDatabaseOptimization && this.databaseOptimization) {
      componentMetrics.database = this.databaseOptimization.getMetrics();
    }

    if (this.config.enableConnectionPooling && this.connectionPoolOptimizer) {
      componentMetrics.connectionPool = this.connectionPoolOptimizer.getMetrics();
    }

    if (this.config.enableIndexOptimization && this.databaseIndexOptimizer) {
      componentMetrics.indexing = {
        recommendations: this.databaseIndexOptimizer.getIndexRecommendations().length,
        queryPatterns: this.databaseIndexOptimizer.getQueryPatterns().length
      };
    }

    return {
      ...this.metrics,
      components: componentMetrics
    };
  }

  /**
   * Get performance report
   */
  async getPerformanceReport(): Promise<{
    overall: {
      status: 'excellent' | 'good' | 'fair' | 'poor';
      score: number;
      recommendations: string[];
    };
    components: {
      [key: string]: {
        status: string;
        metrics: any;
        recommendations: string[];
      };
    };
  }> {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    let score = 100;

    // Evaluate overall performance
    if (metrics.averageResponseTime > 2000) {
      recommendations.push('High average response time - review query optimization');
      score -= 20;
    }

    if (metrics.cacheHitRate < 0.5) {
      recommendations.push('Low cache hit rate - review caching strategy');
      score -= 15;
    }

    if (metrics.compressionRate < 0.3) {
      recommendations.push('Low compression rate - review content optimization');
      score -= 10;
    }

    if (metrics.poolUtilization > 90) {
      recommendations.push('High pool utilization - consider scaling');
      score -= 15;
    }

    // Determine overall status
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else status = 'poor';

    // Get component reports
    const components: any = {};

    if (this.config.enableCompression && this.compressionOptimization) {
      const compressionReport = this.compressionOptimization.getCompressionReport();
      components.compression = {
        status: compressionReport.efficiency,
        metrics: compressionReport.stats,
        recommendations: compressionReport.recommendations
      };
    }

    if (this.config.enableConnectionPooling && this.connectionPoolOptimizer) {
      const poolStatus = this.connectionPoolOptimizer.getPoolStatus();
      components.connectionPool = {
        status: poolStatus.status,
        metrics: metrics.components.connectionPool,
        recommendations: poolStatus.issues
      };
    }

    return {
      overall: {
        status,
        score,
        recommendations
      },
      components
    };
  }

  /**
   * Manual optimization trigger
   */
  async runOptimization(): Promise<void> {
    await this.runAutoOptimization();
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.requestTimes = [];

    if (this.responseCaching) {
      this.responseCaching.resetMetrics();
    }

    if (this.compressionOptimization) {
      this.compressionOptimization.resetMetrics();
    }

    if (this.databaseOptimization) {
      this.databaseOptimization.resetMetrics();
    }

    if (this.connectionPoolOptimizer) {
      this.connectionPoolOptimizer.resetMetrics();
    }
  }

  /**
   * Stop monitoring and cleanup
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = undefined;
    }

    if (this.connectionPoolOptimizer) {
      this.connectionPoolOptimizer.stopMonitoring();
    }

    if (this.databaseIndexOptimizer) {
      this.databaseIndexOptimizer.stopMonitoring();
    }
  }
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      performance?: {
        startTime: number;
        optimizations: {
          caching: boolean;
          compression: boolean;
          database: boolean;
          pooling: boolean;
          indexing: boolean;
        };
        metrics: () => PerformanceMetrics;
      };
    }
  }
}

export default PerformanceOptimizationIntegration;
