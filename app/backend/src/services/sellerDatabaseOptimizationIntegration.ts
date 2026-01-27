/**
 * Seller Database Optimization Integration Service
 * Integrates all database optimization components for seller operations
 * Task 15: Optimize database queries and performance for seller integration consistency
 */

import { Pool } from 'pg';
import { safeLogger } from '../utils/safeLogger';
import EnhancedDatabaseOptimizationService from './enhancedDatabaseOptimizationService';
import DatabaseConnectionOptimizer from './databaseConnectionOptimizer';
import SellerQueryOptimizer from './sellerQueryOptimizer';

interface SellerOptimizationMetrics {
  queryPerformance: {
    averageExecutionTime: number;
    slowQueries: number;
    totalQueries: number;
    optimizedQueries: number;
  };
  connectionPool: {
    utilization: number;
    activeConnections: number;
    waitingClients: number;
    healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  };
  cacheEfficiency: {
    hitRate: number;
    invalidations: number;
    averageTTL: number;
  };
  indexUsage: {
    recommendedIndexes: number;
    createdIndexes: number;
    unusedIndexes: number;
  };
}

interface SellerOptimizationReport {
  timestamp: Date;
  metrics: SellerOptimizationMetrics;
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: 'query' | 'index' | 'connection' | 'cache';
    description: string;
    estimatedImprovement: number;
    implementation: string;
  }[];
  performanceIssues: {
    severity: 'critical' | 'warning' | 'info';
    component: string;
    issue: string;
    impact: string;
    resolution: string;
  }[];
}

/**
 * Seller Database Optimization Integration Service
 * Coordinates all database optimization services for seller operations
 */
export class SellerDatabaseOptimizationIntegration {
  private pool: Pool;
  private databaseOptimizer: EnhancedDatabaseOptimizationService;
  private connectionOptimizer: DatabaseConnectionOptimizer;
  private sellerQueryOptimizer: SellerQueryOptimizer;
  private monitoringInterval?: NodeJS.Timeout;
  private optimizationHistory: SellerOptimizationReport[] = [];

  constructor(pool: Pool) {
    this.pool = pool;
    this.databaseOptimizer = new EnhancedDatabaseOptimizationService(pool);
    this.connectionOptimizer = new DatabaseConnectionOptimizer(pool);
    this.sellerQueryOptimizer = new SellerQueryOptimizer(pool);
    
    this.startIntegratedMonitoring();
  }

  /**
   * Start integrated monitoring of all optimization services
   */
  private startIntegratedMonitoring(): void {
    // Run comprehensive optimization analysis every 10 minutes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runOptimizationAnalysis();
      } catch (error) {
        safeLogger.error('Integrated optimization monitoring error:', error);
      }
    }, 600000); // 10 minutes
  }

  /**
   * Run comprehensive optimization analysis
   */
  private async runOptimizationAnalysis(): Promise<void> {
    try {
      const report = await this.generateOptimizationReport();
      this.optimizationHistory.push(report);
      
      // Keep only last 24 reports (4 hours of history)
      if (this.optimizationHistory.length > 24) {
        this.optimizationHistory = this.optimizationHistory.slice(-24);
      }

      // Apply high-priority optimizations automatically
      await this.applyAutomaticOptimizations(report);

      // Log significant issues
      this.logPerformanceIssues(report);

    } catch (error) {
      safeLogger.error('Failed to run optimization analysis:', error);
    }
  }

  /**
   * Generate comprehensive optimization report
   */
  async generateOptimizationReport(): Promise<SellerOptimizationReport> {
    const timestamp = new Date();
    
    // Collect metrics from all services
    const dbStats = await this.databaseOptimizer.getDatabaseStats() as { cacheHitRatio?: number };
    const connectionHealth = this.connectionOptimizer.getPoolHealth();
    const sellerQueryStats = this.sellerQueryOptimizer.getQueryStatistics();
    const connectionMetrics = this.connectionOptimizer.getMetrics();

    // Build metrics
    const metrics: SellerOptimizationMetrics = {
      queryPerformance: {
        averageExecutionTime: sellerQueryStats.averageExecutionTime,
        slowQueries: sellerQueryStats.slowQueries,
        totalQueries: sellerQueryStats.totalQueries,
        optimizedQueries: Object.keys(sellerQueryStats.queryTypeBreakdown).length
      },
      connectionPool: {
        utilization: connectionMetrics.poolUtilization,
        activeConnections: connectionMetrics.activeConnections,
        waitingClients: connectionMetrics.waitingClients,
        healthStatus: connectionHealth.status
      },
      cacheEfficiency: {
        hitRate: (dbStats.cacheHitRatio || 0) * 100,
        invalidations: 0, // Would be tracked separately
        averageTTL: 300 // Default 5 minutes
      },
      indexUsage: {
        recommendedIndexes: this.databaseOptimizer.getIndexRecommendations().length,
        createdIndexes: 0, // Would be tracked
        unusedIndexes: 0 // Would be analyzed
      }
    };

    // Generate recommendations
    const recommendations = await this.generateIntegratedRecommendations(metrics);

    // Identify performance issues
    const performanceIssues = this.identifyPerformanceIssues(metrics);

    return {
      timestamp,
      metrics,
      recommendations,
      performanceIssues
    };
  }

  /**
   * Generate integrated recommendations from all services
   */
  private async generateIntegratedRecommendations(
    metrics: SellerOptimizationMetrics
  ): Promise<SellerOptimizationReport['recommendations']> {
    const recommendations: SellerOptimizationReport['recommendations'] = [];

    // Query performance recommendations
    if (metrics.queryPerformance.averageExecutionTime > 500) {
      recommendations.push({
        priority: 'high',
        category: 'query',
        description: 'High average query execution time detected',
        estimatedImprovement: 0.4,
        implementation: 'Review and optimize slow seller queries, add missing indexes'
      });
    }

    // Connection pool recommendations
    if (metrics.connectionPool.utilization > 90) {
      recommendations.push({
        priority: 'high',
        category: 'connection',
        description: 'Connection pool utilization is very high',
        estimatedImprovement: 0.3,
        implementation: 'Increase connection pool size or optimize query patterns'
      });
    }

    // Cache efficiency recommendations
    if (metrics.cacheEfficiency.hitRate < 80) {
      recommendations.push({
        priority: 'medium',
        category: 'cache',
        description: 'Low cache hit rate affecting performance',
        estimatedImprovement: 0.25,
        implementation: 'Optimize cache strategies and increase cache TTL for stable data'
      });
    }

    // Index recommendations
    if (metrics.indexUsage.recommendedIndexes > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'index',
        description: 'Multiple missing indexes detected',
        estimatedImprovement: 0.35,
        implementation: 'Create recommended indexes for frequently accessed seller data'
      });
    }

    // Get specific recommendations from services
    const dbRecommendations = this.databaseOptimizer.getIndexRecommendations();
    const connectionRecommendations = await this.connectionOptimizer.getOptimizationRecommendations();
    const queryRecommendations = await this.sellerQueryOptimizer.generateOptimizationRecommendations();

    // Add high-priority database recommendations
    dbRecommendations
      .filter(rec => rec.priority === 'high')
      .slice(0, 3) // Limit to top 3
      .forEach(rec => {
        recommendations.push({
          priority: 'high',
          category: 'index',
          description: `Missing index on ${rec.table}: ${rec.reason}`,
          estimatedImprovement: rec.estimatedImprovement,
          implementation: rec.createStatement
        });
      });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Identify performance issues
   */
  private identifyPerformanceIssues(
    metrics: SellerOptimizationMetrics
  ): SellerOptimizationReport['performanceIssues'] {
    const issues: SellerOptimizationReport['performanceIssues'] = [];

    // Critical query performance issues
    if (metrics.queryPerformance.averageExecutionTime > 2000) {
      issues.push({
        severity: 'critical',
        component: 'Query Performance',
        issue: 'Extremely slow average query execution time',
        impact: 'Severe user experience degradation and potential timeouts',
        resolution: 'Immediate query optimization and index creation required'
      });
    }

    // Connection pool issues
    if (metrics.connectionPool.healthStatus === 'unhealthy') {
      issues.push({
        severity: 'critical',
        component: 'Connection Pool',
        issue: 'Connection pool is in unhealthy state',
        impact: 'Database connectivity issues and potential service outages',
        resolution: 'Review connection pool configuration and database health'
      });
    }

    // High waiting clients
    if (metrics.connectionPool.waitingClients > 20) {
      issues.push({
        severity: 'warning',
        component: 'Connection Pool',
        issue: 'High number of waiting clients',
        impact: 'Increased response times and potential request queuing',
        resolution: 'Increase connection pool size or optimize query performance'
      });
    }

    // Low cache hit rate
    if (metrics.cacheEfficiency.hitRate < 60) {
      issues.push({
        severity: 'warning',
        component: 'Cache System',
        issue: 'Very low cache hit rate',
        impact: 'Increased database load and slower response times',
        resolution: 'Review cache strategies and optimize cache keys and TTL'
      });
    }

    // Many slow queries
    if (metrics.queryPerformance.slowQueries > metrics.queryPerformance.totalQueries * 0.1) {
      issues.push({
        severity: 'warning',
        component: 'Query Performance',
        issue: 'High percentage of slow queries',
        impact: 'Degraded performance for seller operations',
        resolution: 'Identify and optimize slow query patterns'
      });
    }

    return issues;
  }

  /**
   * Apply automatic optimizations for high-priority issues
   */
  private async applyAutomaticOptimizations(report: SellerOptimizationReport): Promise<void> {
    const highPriorityRecommendations = report.recommendations.filter(rec => rec.priority === 'high');

    for (const recommendation of highPriorityRecommendations) {
      try {
        if (recommendation.category === 'index' && recommendation.implementation.startsWith('CREATE INDEX')) {
          // Apply index recommendations automatically
          const indexRecommendations = this.databaseOptimizer.getIndexRecommendations();
          const matchingRec = indexRecommendations.find(rec => 
            recommendation.implementation.includes(rec.table)
          );
          
          if (matchingRec) {
            // Execute index optimizations for the table
            const result = await this.databaseOptimizer.executeIndexOptimizations(matchingRec.table);
            if (result.created > 0 || result.dropped > 0) {
              safeLogger.info(`Automatically applied index optimizations for table ${matchingRec.table}: ${result.created} created, ${result.dropped} dropped`);
            }
          }        }

        if (recommendation.category === 'connection') {
          // Apply connection optimizations
          await this.connectionOptimizer.forceOptimization();
          safeLogger.info('Applied connection pool optimization');
        }

      } catch (error) {
        safeLogger.error(`Failed to apply automatic optimization: ${recommendation.description}`, error);
      }
    }
  }

  /**
   * Log performance issues
   */
  private logPerformanceIssues(report: SellerOptimizationReport): void {
    const criticalIssues = report.performanceIssues.filter(issue => issue.severity === 'critical');
    const warningIssues = report.performanceIssues.filter(issue => issue.severity === 'warning');

    if (criticalIssues.length > 0) {
      safeLogger.error('CRITICAL SELLER DATABASE PERFORMANCE ISSUES:');
      criticalIssues.forEach(issue => {
        safeLogger.error(`- ${issue.component}: ${issue.issue}`);
        safeLogger.error(`  Impact: ${issue.impact}`);
        safeLogger.error(`  Resolution: ${issue.resolution}`);
      });
    }

    if (warningIssues.length > 0) {
      safeLogger.warn('SELLER DATABASE PERFORMANCE WARNINGS:');
      warningIssues.forEach(issue => {
        safeLogger.warn(`- ${issue.component}: ${issue.issue}`);
        safeLogger.warn(`  Resolution: ${issue.resolution}`);
      });
    }
  }

  /**
   * Execute optimized seller query
   */
  async executeSellerQuery<T = any>(
    queryType: string,
    params: any[] = [],
    sellerWalletAddress?: string
  ): Promise<{ rows: T[]; executionTime: number; fromCache?: boolean }> {
    const result = await this.sellerQueryOptimizer.executeSellerQuery<T>(
      queryType,
      params,
      sellerWalletAddress
    );

    return {
      rows: result.rows,
      executionTime: result.metrics.executionTime,
      fromCache: false // Would be true if served from cache
    };
  }

  /**
   * Get seller profile with full optimization
   */
  async getOptimizedSellerProfile(walletAddress: string): Promise<any> {
    return await this.sellerQueryOptimizer.getSellerProfile(walletAddress);
  }

  /**
   * Get seller dashboard with full optimization
   */
  async getOptimizedSellerDashboard(walletAddress: string): Promise<any> {
    return await this.sellerQueryOptimizer.getSellerDashboard(walletAddress);
  }

  /**
   * Get seller listings with optimization and pagination
   */
  async getOptimizedSellerListings(
    walletAddress: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    return await this.sellerQueryOptimizer.getSellerListings(walletAddress, status, limit, offset);
  }

  /**
   * Invalidate seller cache across all systems
   */
  async invalidateSellerCache(
    walletAddress: string,
    invalidationType: string,
    component?: string
  ): Promise<void> {
    await this.sellerQueryOptimizer.invalidateSellerCache(walletAddress, invalidationType, component);
  }

  /**
   * Update seller performance metrics
   */
  async updateSellerPerformanceMetrics(walletAddress: string): Promise<void> {
    await this.sellerQueryOptimizer.updateSellerPerformanceMetrics(walletAddress);
  }

  /**
   * Get comprehensive optimization status
   */
  getOptimizationStatus(): {
    status: 'optimal' | 'good' | 'needs_attention' | 'critical';
    summary: string;
    lastReport?: SellerOptimizationReport;
    trends: {
      queryPerformance: 'improving' | 'stable' | 'degrading';
      connectionHealth: 'improving' | 'stable' | 'degrading';
      cacheEfficiency: 'improving' | 'stable' | 'degrading';
    };
  } {
    const lastReport = this.optimizationHistory[this.optimizationHistory.length - 1];
    
    if (!lastReport) {
      return {
        status: 'good',
        summary: 'Optimization monitoring starting up',
        trends: {
          queryPerformance: 'stable',
          connectionHealth: 'stable',
          cacheEfficiency: 'stable'
        }
      };
    }

    // Determine overall status
    let status: 'optimal' | 'good' | 'needs_attention' | 'critical' = 'optimal';
    const criticalIssues = lastReport.performanceIssues.filter(i => i.severity === 'critical').length;
    const warningIssues = lastReport.performanceIssues.filter(i => i.severity === 'warning').length;
    const highPriorityRecs = lastReport.recommendations.filter(r => r.priority === 'high').length;

    if (criticalIssues > 0) {
      status = 'critical';
    } else if (warningIssues > 2 || highPriorityRecs > 3) {
      status = 'needs_attention';
    } else if (warningIssues > 0 || highPriorityRecs > 0) {
      status = 'good';
    }

    // Calculate trends
    const trends = this.calculateTrends();

    const summary = this.generateStatusSummary(status, lastReport);

    return {
      status,
      summary,
      lastReport,
      trends
    };
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(): {
    queryPerformance: 'improving' | 'stable' | 'degrading';
    connectionHealth: 'improving' | 'stable' | 'degrading';
    cacheEfficiency: 'improving' | 'stable' | 'degrading';
  } {
    if (this.optimizationHistory.length < 2) {
      return {
        queryPerformance: 'stable',
        connectionHealth: 'stable',
        cacheEfficiency: 'stable'
      };
    }

    const current = this.optimizationHistory[this.optimizationHistory.length - 1];
    const previous = this.optimizationHistory[this.optimizationHistory.length - 2];

    const queryTrend = current.metrics.queryPerformance.averageExecutionTime < previous.metrics.queryPerformance.averageExecutionTime
      ? 'improving' : current.metrics.queryPerformance.averageExecutionTime > previous.metrics.queryPerformance.averageExecutionTime
      ? 'degrading' : 'stable';

    const connectionTrend = current.metrics.connectionPool.utilization < previous.metrics.connectionPool.utilization
      ? 'improving' : current.metrics.connectionPool.utilization > previous.metrics.connectionPool.utilization
      ? 'degrading' : 'stable';

    const cacheTrend = current.metrics.cacheEfficiency.hitRate > previous.metrics.cacheEfficiency.hitRate
      ? 'improving' : current.metrics.cacheEfficiency.hitRate < previous.metrics.cacheEfficiency.hitRate
      ? 'degrading' : 'stable';

    return {
      queryPerformance: queryTrend,
      connectionHealth: connectionTrend,
      cacheEfficiency: cacheTrend
    };
  }

  /**
   * Generate status summary
   */
  private generateStatusSummary(
    status: 'optimal' | 'good' | 'needs_attention' | 'critical',
    report: SellerOptimizationReport
  ): string {
    const metrics = report.metrics;
    
    switch (status) {
      case 'optimal':
        return `Seller database performance is optimal. Average query time: ${metrics.queryPerformance.averageExecutionTime.toFixed(1)}ms, Pool utilization: ${metrics.connectionPool.utilization.toFixed(1)}%`;
      
      case 'good':
        return `Seller database performance is good with minor optimizations available. ${report.recommendations.length} recommendations pending.`;
      
      case 'needs_attention':
        return `Seller database performance needs attention. ${report.performanceIssues.length} issues identified, ${report.recommendations.filter(r => r.priority === 'high').length} high-priority optimizations recommended.`;
      
      case 'critical':
        return `CRITICAL: Seller database performance issues detected. Immediate attention required. ${report.performanceIssues.filter(i => i.severity === 'critical').length} critical issues found.`;
      
      default:
        return 'Seller database optimization status unknown';
    }
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(limit: number = 10): SellerOptimizationReport[] {
    return this.optimizationHistory.slice(-limit);
  }

  /**
   * Force comprehensive optimization
   */
  async forceOptimization(): Promise<SellerOptimizationReport> {
    const report = await this.generateOptimizationReport();
    await this.applyAutomaticOptimizations(report);
    
    // Refresh materialized views
    await this.sellerQueryOptimizer.refreshSellerPerformanceDashboard();
    
    return report;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.databaseOptimizer.stopMonitoring();
    this.connectionOptimizer.stopMonitoring();
  }

  /**
   * Get all services for direct access
   */
  getServices() {
    return {
      databaseOptimizer: this.databaseOptimizer,
      connectionOptimizer: this.connectionOptimizer,
      sellerQueryOptimizer: this.sellerQueryOptimizer
    };
  }
}

export default SellerDatabaseOptimizationIntegration;
