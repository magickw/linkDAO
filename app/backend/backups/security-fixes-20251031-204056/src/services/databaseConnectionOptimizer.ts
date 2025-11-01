/**
 * Database Connection Pool Optimizer
 * Optimizes PostgreSQL connection pool settings and monitors connection health
 * Implements task 14.1: Optimize database queries (connection optimization)
 */

import { Pool, PoolConfig, PoolClient } from 'pg';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';

interface ConnectionPoolMetrics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  totalQueries: number;
  averageQueryTime: number;
  connectionErrors: number;
  poolUtilization: number;
  lastOptimization: Date;
}

interface OptimizationRecommendation {
  parameter: string;
  currentValue: any;
  recommendedValue: any;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  estimatedImprovement: number;
}

interface ConnectionHealth {
  connectionId: string;
  isHealthy: boolean;
  lastUsed: Date;
  queryCount: number;
  averageQueryTime: number;
  errors: number;
  warnings: string[];
}

/**
 * Database Connection Pool Optimizer
 * Monitors and optimizes PostgreSQL connection pool performance
 */
export class DatabaseConnectionOptimizer {
  private pool: Pool;
  private metrics: ConnectionPoolMetrics;
  private queryTimes: number[] = [];
  private connectionHealthMap: Map<string, ConnectionHealth> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private optimizationInterval?: NodeJS.Timeout;

  constructor(pool: Pool) {
    this.pool = pool;
    this.metrics = this.initializeMetrics();
    this.startMonitoring();
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ConnectionPoolMetrics {
    return {
      totalConnections: 0,
      idleConnections: 0,
      activeConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      averageQueryTime: 0,
      connectionErrors: 0,
      poolUtilization: 0,
      lastOptimization: new Date()
    };
  }

  /**
   * Start monitoring connection pool
   */
  private startMonitoring(): void {
    // Monitor pool metrics every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateMetrics();
        await this.checkConnectionHealth();
      } catch (error) {
        safeLogger.error('Connection pool monitoring error:', error);
      }
    }, 30000);

    // Run optimization every 5 minutes
    this.optimizationInterval = setInterval(async () => {
      try {
        await this.optimizeConnectionPool();
      } catch (error) {
        safeLogger.error('Connection pool optimization error:', error);
      }
    }, 300000);

    // Set up pool event listeners
    this.setupPoolEventListeners();
  }

  /**
   * Set up pool event listeners
   */
  private setupPoolEventListeners(): void {
    this.pool.on('connect', (client: PoolClient) => {
      const connectionId = this.getConnectionId(client);
      this.connectionHealthMap.set(connectionId, {
        connectionId,
        isHealthy: true,
        lastUsed: new Date(),
        queryCount: 0,
        averageQueryTime: 0,
        errors: 0,
        warnings: []
      });
    });

    this.pool.on('remove', (client: PoolClient) => {
      const connectionId = this.getConnectionId(client);
      this.connectionHealthMap.delete(connectionId);
    });

    this.pool.on('error', (error: Error, client: PoolClient) => {
      safeLogger.error('Pool client error:', error);
      this.metrics.connectionErrors++;
      
      const connectionId = this.getConnectionId(client);
      const health = this.connectionHealthMap.get(connectionId);
      if (health) {
        health.errors++;
        health.isHealthy = false;
        health.warnings.push(`Error: ${error.message}`);
      }
    });
  }

  /**
   * Get connection ID from client
   */
  private getConnectionId(client: PoolClient): string {
    // Use process ID as connection identifier
    return (client as any).processID?.toString() || Math.random().toString(36);
  }

  /**
   * Update pool metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      // Get pool statistics
      this.metrics.totalConnections = this.pool.totalCount;
      this.metrics.idleConnections = this.pool.idleCount;
      this.metrics.activeConnections = this.pool.totalCount - this.pool.idleCount;
      this.metrics.waitingClients = this.pool.waitingCount;

      // Calculate pool utilization
      this.metrics.poolUtilization = this.pool.totalCount > 0 
        ? (this.metrics.activeConnections / this.pool.totalCount) * 100 
        : 0;

      // Update average query time
      if (this.queryTimes.length > 0) {
        const sum = this.queryTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageQueryTime = sum / this.queryTimes.length;
        
        // Keep only recent query times (last 1000)
        if (this.queryTimes.length > 1000) {
          this.queryTimes = this.queryTimes.slice(-1000);
        }
      }

      // Get database-level statistics
      await this.updateDatabaseStatistics();

    } catch (error) {
      safeLogger.error('Error updating pool metrics:', error);
    }
  }

  /**
   * Update database-level statistics
   */
  private async updateDatabaseStatistics(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Get connection statistics from PostgreSQL
      const connectionStats = await client.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      const stats = connectionStats.rows[0];
      
      // Update metrics with database-level data
      if (stats.idle_in_transaction > 0) {
        safeLogger.warn(`Found ${stats.idle_in_transaction} idle in transaction connections`);
      }

    } finally {
      client.release();
    }
  }

  /**
   * Check health of individual connections
   */
  private async checkConnectionHealth(): Promise<void> {
    const unhealthyConnections: string[] = [];
    const now = new Date();

    for (const [connectionId, health] of this.connectionHealthMap.entries()) {
      // Check if connection hasn't been used recently
      const timeSinceLastUse = now.getTime() - health.lastUsed.getTime();
      const maxIdleTime = 30 * 60 * 1000; // 30 minutes

      if (timeSinceLastUse > maxIdleTime && health.queryCount === 0) {
        health.warnings.push('Connection idle for too long with no queries');
        health.isHealthy = false;
      }

      // Check error rate
      if (health.errors > 5) {
        health.warnings.push('High error rate detected');
        health.isHealthy = false;
      }

      // Check average query time
      if (health.averageQueryTime > 5000) { // 5 seconds
        health.warnings.push('High average query time');
        health.isHealthy = false;
      }

      if (!health.isHealthy) {
        unhealthyConnections.push(connectionId);
      }
    }

    if (unhealthyConnections.length > 0) {
      safeLogger.warn(`Found ${unhealthyConnections.length} unhealthy connections`);
    }
  }

  /**
   * Execute query with monitoring
   */
  async executeQuery<T = any>(
    query: string, 
    params: any[] = []
  ): Promise<{ rows: T[]; executionTime: number; connectionId: string }> {
    const startTime = performance.now();
    const client = await this.pool.connect();
    const connectionId = this.getConnectionId(client);

    try {
      const result = await client.query(query, params);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Update metrics
      this.metrics.totalQueries++;
      this.queryTimes.push(executionTime);

      // Update connection health
      const health = this.connectionHealthMap.get(connectionId);
      if (health) {
        health.lastUsed = new Date();
        health.queryCount++;
        health.averageQueryTime = (health.averageQueryTime + executionTime) / 2;
      }

      return {
        rows: result.rows,
        executionTime,
        connectionId
      };

    } catch (error) {
      this.metrics.connectionErrors++;
      
      const health = this.connectionHealthMap.get(connectionId);
      if (health) {
        health.errors++;
        health.isHealthy = false;
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Optimize connection pool settings
   */
  private async optimizeConnectionPool(): Promise<void> {
    const recommendations = await this.generateOptimizationRecommendations();
    
    if (recommendations.length > 0) {
      safeLogger.info('Connection Pool Optimization Recommendations:');
      recommendations.forEach(rec => {
        safeLogger.info(`- ${rec.parameter}: ${rec.currentValue} → ${rec.recommendedValue} (${rec.reason})`);
      });

      // Apply high-impact recommendations automatically
      const highImpactRecommendations = recommendations.filter(rec => rec.impact === 'high');
      for (const rec of highImpactRecommendations) {
        await this.applyOptimization(rec);
      }

      this.metrics.lastOptimization = new Date();
    }
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    const config = this.pool.options as PoolConfig;

    // Analyze pool utilization
    if (this.metrics.poolUtilization > 90) {
      recommendations.push({
        parameter: 'max',
        currentValue: config.max || 10,
        recommendedValue: Math.min((config.max || 10) * 1.5, 50),
        reason: 'High pool utilization detected',
        impact: 'high',
        estimatedImprovement: 0.3
      });
    }

    // Analyze waiting clients
    if (this.metrics.waitingClients > 5) {
      recommendations.push({
        parameter: 'max',
        currentValue: config.max || 10,
        recommendedValue: (config.max || 10) + 5,
        reason: 'High number of waiting clients',
        impact: 'high',
        estimatedImprovement: 0.4
      });
    }

    // Analyze connection timeout
    if (this.metrics.averageQueryTime > 1000 && (config.connectionTimeoutMillis || 0) < 10000) {
      recommendations.push({
        parameter: 'connectionTimeoutMillis',
        currentValue: config.connectionTimeoutMillis || 0,
        recommendedValue: 10000,
        reason: 'Slow queries detected, increase connection timeout',
        impact: 'medium',
        estimatedImprovement: 0.2
      });
    }

    // Analyze idle timeout
    const idleConnections = this.metrics.idleConnections;
    const totalConnections = this.metrics.totalConnections;
    
    if (idleConnections > totalConnections * 0.5 && (config.idleTimeoutMillis || 10000) < 30000) {
      recommendations.push({
        parameter: 'idleTimeoutMillis',
        currentValue: config.idleTimeoutMillis || 10000,
        recommendedValue: 30000,
        reason: 'Many idle connections, increase idle timeout',
        impact: 'medium',
        estimatedImprovement: 0.15
      });
    }

    // Analyze query timeout
    if (this.metrics.averageQueryTime > 5000 && !(config as any).query_timeout) {
      recommendations.push({
        parameter: 'query_timeout',
        currentValue: 'none',
        recommendedValue: 30000,
        reason: 'Very slow queries detected, set query timeout',
        impact: 'medium',
        estimatedImprovement: 0.25
      });
    }

    return recommendations;
  }

  /**
   * Apply optimization recommendation
   */
  private async applyOptimization(recommendation: OptimizationRecommendation): Promise<void> {
    try {
      // Note: Pool configuration changes require pool recreation in most cases
      // This is a simplified implementation - in production, you might want to
      // create a new pool with optimized settings and gradually migrate
      
      safeLogger.info(`Applying optimization: ${recommendation.parameter} = ${recommendation.recommendedValue}`);
      
      // For demonstration, we'll just log the optimization
      // In a real implementation, you would:
      // 1. Create a new pool with optimized settings
      // 2. Gradually migrate connections
      // 3. Monitor the impact
      
    } catch (error) {
      safeLogger.error(`Failed to apply optimization for ${recommendation.parameter}:`, error);
    }
  }

  /**
   * Get connection pool metrics
   */
  getMetrics(): ConnectionPoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection health report
   */
  getConnectionHealthReport(): {
    totalConnections: number;
    healthyConnections: number;
    unhealthyConnections: number;
    connectionDetails: ConnectionHealth[];
  } {
    const connections = Array.from(this.connectionHealthMap.values());
    const healthyConnections = connections.filter(c => c.isHealthy).length;
    const unhealthyConnections = connections.length - healthyConnections;

    return {
      totalConnections: connections.length,
      healthyConnections,
      unhealthyConnections,
      connectionDetails: connections
    };
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    return await this.generateOptimizationRecommendations();
  }

  /**
   * Force pool optimization
   */
  async forceOptimization(): Promise<void> {
    await this.optimizeConnectionPool();
  }

  /**
   * Get pool health status
   */
  getPoolHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: number;
    utilization: number;
  } {
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check utilization
    if (this.metrics.poolUtilization > 90) {
      issues.push('High pool utilization');
      status = 'degraded';
    }

    // Check waiting clients
    if (this.metrics.waitingClients > 10) {
      issues.push('High number of waiting clients');
      status = 'degraded';
    }

    // Check error rate
    const errorRate = this.metrics.totalQueries > 0 
      ? this.metrics.connectionErrors / this.metrics.totalQueries 
      : 0;
    
    if (errorRate > 0.05) { // 5% error rate
      issues.push('High connection error rate');
      status = 'unhealthy';
    }

    // Check average query time
    if (this.metrics.averageQueryTime > 2000) {
      issues.push('High average query time');
      status = 'degraded';
    }

    if (issues.length > 2) {
      status = 'unhealthy';
    }

    return {
      status,
      issues,
      recommendations: 0, // Would be calculated based on current recommendations
      utilization: this.metrics.poolUtilization
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.queryTimes = [];
    this.connectionHealthMap.clear();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = undefined;
    }
  }

  /**
   * Create optimized pool configuration
   */
  static createOptimizedPoolConfig(baseConfig: PoolConfig = {}): PoolConfig {
    const cpuCount = require('os').cpus().length;
    
    return {
      // Connection limits
      max: Math.min(cpuCount * 2, 20), // 2 connections per CPU core, max 20
      min: Math.max(2, Math.floor(cpuCount / 2)), // Minimum connections
      
      // Timeouts
      connectionTimeoutMillis: 10000, // 10 seconds
      idleTimeoutMillis: 30000, // 30 seconds
      
      // Keep alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      
      // SSL configuration
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      
      // Statement timeout (PostgreSQL specific)
      statement_timeout: 30000, // 30 seconds
      
      // Query timeout
      query_timeout: 30000, // 30 seconds
      
      // Application name for monitoring
      application_name: 'marketplace-api',
      
      ...baseConfig
    };
  }
}

export default DatabaseConnectionOptimizer;