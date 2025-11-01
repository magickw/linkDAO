/**
 * Database Optimization Integration Service
 * Integrates all database optimization components for task 14.1
 * Provides unified interface for database query optimization, indexing, and caching
 */

import { Pool } from 'pg';
import { safeLogger } from '../utils/safeLogger';
import EnhancedDatabaseOptimizationService from './enhancedDatabaseOptimizationService';
import DatabaseConnectionOptimizer from './databaseConnectionOptimizer';
import { queryResultCachingMiddleware } from '../middleware/queryResultCachingMiddleware';
import { cacheService } from './cacheService';

interface OptimizationReport {
  timestamp: Date;
  performance: {
    averageQueryTime: number;
    slowQueries: number;
    cacheHitRate: number;
    connectionPoolUtilization: number;
  };
  indexing: {
    recommendedIndexes: number;
    redundantIndexes: number;
    indexesCreated: number;
    indexesDropped: number;
  };
  caching: {
    queryResultCacheHitRate: number;
    redisCacheHitRate: number;
    totalCachedQueries: number;
    cacheSize: number;
  };
  connections: {
    totalConnections: number;
    activeConnections: number;
    healthyConnections: number;
    optimizationRecommendations: number;
  };
  recommendations: Array<{
    category: 'indexing' | 'caching' | 'connections' | 'queries';
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    estimatedImprovement: number;
    action: string;
  }>;
}

interface OptimizationConfig {
  enableQueryOptimization: boolean;
  enableIndexOptimization: boolean;
  enableCaching: boolean;
  enableConnectionOptimization: boolean;
  autoApplyOptimizations: boolean;
  reportingInterval: number;
  optimizationInterval: number;
}

/**
 * Database Optimization Integration Service
 * Coordinates all database optimization efforts
 */
export class DatabaseOptimizationIntegration {
  private pool: Pool;
  private enhancedOptimizer: EnhancedDatabaseOptimizationService;
  private connectionOptimizer: DatabaseConnectionOptimizer;
  private config: OptimizationConfig;
  private reportingInterval?: NodeJS.Timeout;
  private optimizationInterval?: NodeJS.Timeout;
  private lastReport?: OptimizationReport;

  constructor(pool: Pool, config: Partial<OptimizationConfig> = {}) {
    this.pool = pool;
    this.config = {
      enableQueryOptimization: true,
      enableIndexOptimization: true,
      enableCaching: true,
      enableConnectionOptimization: true,
      autoApplyOptimizations: false,
      reportingInterval: 300000, // 5 minutes
      optimizationInterval: 900000, // 15 minutes
      ...config
    };

    this.initializeOptimizers();
    this.startOptimizationCycle();
  }

  /**
   * Initialize optimization services
   */
  private initializeOptimizers(): void {
    if (this.config.enableQueryOptimization || this.config.enableIndexOptimization) {
      this.enhancedOptimizer = new EnhancedDatabaseOptimizationService(this.pool);
    }

    if (this.config.enableConnectionOptimization) {
      this.connectionOptimizer = new DatabaseConnectionOptimizer(this.pool);
    }
  }

  /**
   * Start optimization cycle
   */
  private startOptimizationCycle(): void {
    // Generate reports periodically
    this.reportingInterval = setInterval(async () => {
      try {
        await this.generateOptimizationReport();
      } catch (error) {
        safeLogger.error('Error generating optimization report:', error);
      }
    }, this.config.reportingInterval);

    // Run optimizations periodically
    this.optimizationInterval = setInterval(async () => {
      try {
        await this.runOptimizationCycle();
      } catch (error) {
        safeLogger.error('Error running optimization cycle:', error);
      }
    }, this.config.optimizationInterval);
  }

  /**
   * Execute optimized query with all optimizations applied
   */
  async executeOptimizedQuery<T = any>(
    query: string,
    params: any[] = [],
    options: {
      enableCache?: boolean;
      cacheTTL?: number;
      forceOptimization?: boolean;
      explain?: boolean;
    } = {}
  ): Promise<{
    rows: T[];
    fromCache: boolean;
    executionTime: number;
    optimizationApplied: boolean;
    connectionId?: string;
    cacheKey?: string;
    optimizationDetails?: any;
  }> {
    // Use enhanced optimizer if available
    if (this.enhancedOptimizer && this.config.enableQueryOptimization) {
      return await this.enhancedOptimizer.executeOptimizedQuery<T>(query, params, options);
    }

    // Fallback to connection optimizer
    if (this.connectionOptimizer) {
      const result = await this.connectionOptimizer.executeQuery<T>(query, params);
      return {
        rows: result.rows,
        fromCache: false,
        executionTime: result.executionTime,
        optimizationApplied: false,
        connectionId: result.connectionId
      };
    }

    // Basic execution without optimization
    const client = await this.pool.connect();
    try {
      const startTime = Date.now();
      const result = await client.query(query, params);
      const executionTime = Date.now() - startTime;

      return {
        rows: result.rows,
        fromCache: false,
        executionTime,
        optimizationApplied: false
      };
    } finally {
      client.release();
    }
  }

  /**
   * Generate comprehensive optimization report
   */
  async generateOptimizationReport(): Promise<OptimizationReport> {
    const timestamp = new Date();
    const recommendations: OptimizationReport['recommendations'] = [];

    // Gather performance metrics
    let performance = {
      averageQueryTime: 0,
      slowQueries: 0,
      cacheHitRate: 0,
      connectionPoolUtilization: 0
    };

    if (this.enhancedOptimizer) {
      const dbStats = await this.enhancedOptimizer.getDatabaseStats();
      const slowQueries = this.enhancedOptimizer.getSlowQueries(500);
      
      performance.averageQueryTime = slowQueries.length > 0 
        ? slowQueries.reduce((sum, q) => sum + q.executionTime, 0) / slowQueries.length 
        : 0;
      performance.slowQueries = slowQueries.length;
    }

    if (this.connectionOptimizer) {
      const connectionMetrics = this.connectionOptimizer.getMetrics();
      performance.connectionPoolUtilization = connectionMetrics.poolUtilization;
      performance.averageQueryTime = Math.max(performance.averageQueryTime, connectionMetrics.averageQueryTime);
    }

    // Gather indexing metrics
    let indexing = {
      recommendedIndexes: 0,
      redundantIndexes: 0,
      indexesCreated: 0,
      indexesDropped: 0
    };

    if (this.enhancedOptimizer && this.config.enableIndexOptimization) {
      const indexRecommendations = this.enhancedOptimizer.getIndexRecommendations();
      indexing.recommendedIndexes = indexRecommendations.length;

      // Add indexing recommendations
      indexRecommendations.slice(0, 5).forEach(rec => {
        recommendations.push({
          category: 'indexing',
          priority: rec.priority as any,
          description: `Create index on ${rec.table}.${rec.columns.join(', ')}: ${rec.reason}`,
          estimatedImprovement: rec.estimatedImprovement,
          action: rec.createStatement
        });
      });
    }

    // Gather caching metrics
    let caching = {
      queryResultCacheHitRate: 0,
      redisCacheHitRate: 0,
      totalCachedQueries: 0,
      cacheSize: 0
    };

    if (this.config.enableCaching) {
      const queryResultMetrics = queryResultCachingMiddleware.getCacheMetrics();
      caching.queryResultCacheHitRate = queryResultMetrics.hitRate;
      caching.totalCachedQueries = queryResultMetrics.totalRequests;
      caching.cacheSize = queryResultMetrics.cacheSize;

      try {
        const redisStats = await cacheService.getStats();
        caching.redisCacheHitRate = redisStats.hitRate;
      } catch (error) {
        safeLogger.warn('Could not get Redis cache stats:', error);
      }

      // Add caching recommendations
      if (caching.queryResultCacheHitRate < 0.3) {
        recommendations.push({
          category: 'caching',
          priority: 'medium',
          description: 'Low query result cache hit rate - consider caching more endpoints',
          estimatedImprovement: 0.4,
          action: 'Review and add caching to frequently accessed endpoints'
        });
      }
    }

    // Gather connection metrics
    let connections = {
      totalConnections: 0,
      activeConnections: 0,
      healthyConnections: 0,
      optimizationRecommendations: 0
    };

    if (this.connectionOptimizer && this.config.enableConnectionOptimization) {
      const connectionMetrics = this.connectionOptimizer.getMetrics();
      const healthReport = this.connectionOptimizer.getConnectionHealthReport();
      const connectionRecommendations = await this.connectionOptimizer.getOptimizationRecommendations();

      connections.totalConnections = connectionMetrics.totalConnections;
      connections.activeConnections = connectionMetrics.activeConnections;
      connections.healthyConnections = healthReport.healthyConnections;
      connections.optimizationRecommendations = connectionRecommendations.length;

      // Add connection recommendations
      connectionRecommendations.slice(0, 3).forEach(rec => {
        recommendations.push({
          category: 'connections',
          priority: rec.impact as any,
          description: `Optimize ${rec.parameter}: ${rec.reason}`,
          estimatedImprovement: rec.estimatedImprovement,
          action: `Change ${rec.parameter} from ${rec.currentValue} to ${rec.recommendedValue}`
        });
      });
    }

    // Add query optimization recommendations
    if (performance.slowQueries > 10) {
      recommendations.push({
        category: 'queries',
        priority: 'high',
        description: `${performance.slowQueries} slow queries detected - consider optimization`,
        estimatedImprovement: 0.5,
        action: 'Review and optimize slow queries, add appropriate indexes'
      });
    }

    if (performance.averageQueryTime > 1000) {
      recommendations.push({
        category: 'queries',
        priority: 'critical',
        description: 'Very high average query time detected',
        estimatedImprovement: 0.7,
        action: 'Immediate query optimization required'
      });
    }

    // Sort recommendations by priority and estimated improvement
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.estimatedImprovement - a.estimatedImprovement;
    });

    const report: OptimizationReport = {
      timestamp,
      performance,
      indexing,
      caching,
      connections,
      recommendations
    };

    this.lastReport = report;

    // Log the report
    safeLogger.info('Database Optimization Report Generated:');
    safeLogger.info(`- Average Query Time: ${performance.averageQueryTime.toFixed(2)}ms`);
    safeLogger.info(`- Slow Queries: ${performance.slowQueries}`);
    safeLogger.info(`- Cache Hit Rate: ${(caching.queryResultCacheHitRate * 100).toFixed(1)}%`);
    safeLogger.info(`- Pool Utilization: ${performance.connectionPoolUtilization.toFixed(1)}%`);
    safeLogger.info(`- Recommendations: ${recommendations.length}`);

    if (recommendations.length > 0) {
      safeLogger.info('Top Recommendations:');
      recommendations.slice(0, 3).forEach((rec, index) => {
        safeLogger.info(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
      });
    }

    return report;
  }

  /**
   * Run optimization cycle
   */
  private async runOptimizationCycle(): Promise<void> {
    safeLogger.info('🔧 Starting database optimization cycle...');

    const results = {
      indexesCreated: 0,
      indexesDropped: 0,
      optimizationsApplied: 0,
      errors: [] as string[]
    };

    try {
      // Apply index optimizations if enabled and auto-apply is on
      if (this.config.enableIndexOptimization && this.config.autoApplyOptimizations && this.enhancedOptimizer) {
        const tables = ['users', 'posts', 'products', 'communities', 'orders'];
        
        for (const table of tables) {
          try {
            const optimizationResults = await this.enhancedOptimizer.executeIndexOptimizations(table);
            results.indexesCreated += optimizationResults.created;
            results.indexesDropped += optimizationResults.dropped;
            results.errors.push(...optimizationResults.errors);
          } catch (error) {
            results.errors.push(`Failed to optimize indexes for table ${table}: ${error}`);
          }
        }
      }

      // Apply connection optimizations if enabled
      if (this.config.enableConnectionOptimization && this.config.autoApplyOptimizations && this.connectionOptimizer) {
        try {
          await this.connectionOptimizer.forceOptimization();
          results.optimizationsApplied++;
        } catch (error) {
          results.errors.push(`Failed to apply connection optimizations: ${error}`);
        }
      }

      // Warm caches if enabled
      if (this.config.enableCaching) {
        try {
          await this.warmCaches();
          results.optimizationsApplied++;
        } catch (error) {
          results.errors.push(`Failed to warm caches: ${error}`);
        }
      }

      safeLogger.info('✅ Database optimization cycle completed:');
      safeLogger.info(`- Indexes created: ${results.indexesCreated}`);
      safeLogger.info(`- Indexes dropped: ${results.indexesDropped}`);
      safeLogger.info(`- Optimizations applied: ${results.optimizationsApplied}`);
      
      if (results.errors.length > 0) {
        safeLogger.info(`- Errors: ${results.errors.length}`);
        results.errors.forEach(error => safeLogger.error(`  - ${error}`));
      }

    } catch (error) {
      safeLogger.error('Database optimization cycle failed:', error);
    }
  }

  /**
   * Warm caches with popular data
   */
  private async warmCaches(): Promise<void> {
    try {
      // Warm Redis cache
      await cacheService.warmCache();

      // Warm query result cache for popular endpoints
      await queryResultCachingMiddleware.warmCache([
        { path: '/api/products', params: { limit: 20 } },
        { path: '/api/communities', params: { limit: 10 } },
        { path: '/api/posts', params: { limit: 50 } }
      ]);

    } catch (error) {
      safeLogger.error('Cache warming failed:', error);
    }
  }

  /**
   * Get latest optimization report
   */
  getLatestReport(): OptimizationReport | undefined {
    return this.lastReport;
  }

  /**
   * Force optimization report generation
   */
  async forceReportGeneration(): Promise<OptimizationReport> {
    return await this.generateOptimizationReport();
  }

  /**
   * Apply specific optimization recommendation
   */
  async applyRecommendation(recommendationIndex: number): Promise<boolean> {
    if (!this.lastReport || !this.lastReport.recommendations[recommendationIndex]) {
      throw new Error('Invalid recommendation index');
    }

    const recommendation = this.lastReport.recommendations[recommendationIndex];

    try {
      switch (recommendation.category) {
        case 'indexing':
          if (this.enhancedOptimizer) {
            // Extract table name and create index
            const tableMatch = recommendation.action.match(/ON (\w+)/);
            if (tableMatch) {
              const table = tableMatch[1];
              await this.enhancedOptimizer.executeIndexOptimizations(table);
            }
          }
          break;

        case 'connections':
          if (this.connectionOptimizer) {
            await this.connectionOptimizer.forceOptimization();
          }
          break;

        case 'caching':
          await this.warmCaches();
          break;

        case 'queries':
          // Query optimizations are applied automatically during execution
          safeLogger.info('Query optimizations will be applied automatically during execution');
          break;
      }

      safeLogger.info(`✅ Applied recommendation: ${recommendation.description}`);
      return true;

    } catch (error) {
      safeLogger.error(`❌ Failed to apply recommendation: ${error}`);
      return false;
    }
  }

  /**
   * Get optimization health status
   */
  async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      queries: 'healthy' | 'degraded' | 'unhealthy';
      indexes: 'healthy' | 'degraded' | 'unhealthy';
      caching: 'healthy' | 'degraded' | 'unhealthy';
      connections: 'healthy' | 'degraded' | 'unhealthy';
    };
    issues: string[];
    recommendations: number;
  }> {
    const issues: string[] = [];
    const components = {
      queries: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      indexes: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      caching: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      connections: 'healthy' as 'healthy' | 'degraded' | 'unhealthy'
    };

    // Check query performance
    if (this.enhancedOptimizer) {
      const slowQueries = this.enhancedOptimizer.getSlowQueries(500);
      if (slowQueries.length > 10) {
        components.queries = 'degraded';
        issues.push(`${slowQueries.length} slow queries detected`);
      }
      if (slowQueries.length > 50) {
        components.queries = 'unhealthy';
      }
    }

    // Check indexing
    if (this.enhancedOptimizer) {
      const indexRecommendations = this.enhancedOptimizer.getIndexRecommendations();
      const criticalRecommendations = indexRecommendations.filter(r => r.priority === 'high');
      
      if (criticalRecommendations.length > 5) {
        components.indexes = 'degraded';
        issues.push(`${criticalRecommendations.length} critical index recommendations`);
      }
      if (criticalRecommendations.length > 15) {
        components.indexes = 'unhealthy';
      }
    }

    // Check caching
    const cacheMetrics = queryResultCachingMiddleware.getCacheMetrics();
    if (cacheMetrics.hitRate < 0.3) {
      components.caching = 'degraded';
      issues.push('Low cache hit rate');
    }
    if (cacheMetrics.hitRate < 0.1) {
      components.caching = 'unhealthy';
    }

    // Check connections
    if (this.connectionOptimizer) {
      const poolHealth = this.connectionOptimizer.getPoolHealth();
      components.connections = poolHealth.status;
      issues.push(...poolHealth.issues);
    }

    // Determine overall health
    const componentStatuses = Object.values(components);
    const unhealthyCount = componentStatuses.filter(s => s === 'unhealthy').length;
    const degradedCount = componentStatuses.filter(s => s === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 1) {
      overall = 'degraded';
    }

    return {
      overall,
      components,
      issues,
      recommendations: this.lastReport?.recommendations.length || 0
    };
  }

  /**
   * Stop optimization services
   */
  stop(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = undefined;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = undefined;
    }

    if (this.enhancedOptimizer) {
      this.enhancedOptimizer.stopMonitoring();
    }

    if (this.connectionOptimizer) {
      this.connectionOptimizer.stopMonitoring();
    }
  }
}

export default DatabaseOptimizationIntegration;
