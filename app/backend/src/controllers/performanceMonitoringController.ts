import { Request, Response } from 'express';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { performanceBenchmarkService } from '../services/performanceBenchmarkService';
import RenderPerformanceMonitoringService from '../services/renderPerformanceMonitoringService';
import ErrorRecoveryCacheProfiler from '../services/errorRecoveryCacheProfiler';
import CriticalPathPerformanceOptimizer from '../services/criticalPathPerformanceOptimizer';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { memoryMonitoringService } from '../services/memoryMonitoringService';

/**
 * Performance Monitoring Controller
 * Provides comprehensive performance monitoring and optimization endpoints
 */
export class PerformanceMonitoringController {
  private renderMonitoringService: RenderPerformanceMonitoringService;
  private errorRecoveryProfiler: ErrorRecoveryCacheProfiler;
  private criticalPathOptimizer: CriticalPathPerformanceOptimizer;
  private benchmarkService: any;

  constructor(pool: Pool, redis: Redis) {
    this.renderMonitoringService = new RenderPerformanceMonitoringService(pool, redis);
    this.errorRecoveryProfiler = new ErrorRecoveryCacheProfiler(redis);
    this.criticalPathOptimizer = new CriticalPathPerformanceOptimizer(pool, redis);
    this.benchmarkService = performanceBenchmarkService;
  }

  /**
   * Get comprehensive performance dashboard data
   */
  async getPerformanceDashboard(req: Request, res: Response): Promise<void> {
    try {
      const timeWindow = parseInt(req.query.timeWindow as string) || 3600000; // Default 1 hour

      // Gather data from all monitoring services
      const [
        benchmarkSummary,
        renderMetrics,
        profilerSummary,
        criticalPathSummary,
        systemMetrics,
        memoryStats
      ] = await Promise.all([
        performanceBenchmarkService.getBenchmarkSummary(),
        this.renderMonitoringService.getCurrentMetrics(),
        this.errorRecoveryProfiler.getProfilerSummary(timeWindow),
        this.criticalPathOptimizer.getPerformanceSummary(),
        performanceMonitoringService.getHealthStatus(),
        memoryMonitoringService.getMemoryStats()
      ]);

      // Calculate overall performance score
      const overallScore = this.calculateOverallPerformanceScore({
        benchmarkSummary,
        renderMetrics,
        profilerSummary,
        criticalPathSummary,
        systemMetrics
      });

      // Get optimization recommendations
      const recommendations = [
        ...this.renderMonitoringService.generateOptimizationRecommendations(),
        ...this.errorRecoveryProfiler.generatePerformanceRecommendations(),
        ...this.criticalPathOptimizer.getOptimizationRecommendations()
      ].sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      res.json({
        success: true,
        data: {
          overallScore,
          status: this.getOverallStatus(overallScore),
          benchmarks: benchmarkSummary,
          renderEnvironment: renderMetrics,
          errorRecovery: profilerSummary.errorRecovery,
          cachePerformance: profilerSummary.cachePerformance,
          criticalPaths: criticalPathSummary,
          systemHealth: systemMetrics,
          memoryUsage: memoryStats,
          recommendations: recommendations.slice(0, 10), // Top 10 recommendations
          timestamp: new Date().toISOString()
        }
      });

      safeLogger.info('📊 Performance dashboard data retrieved', {
        overallScore,
        recommendationCount: recommendations.length,
        operation: 'performance_dashboard'
      });
    } catch (error) {
      safeLogger.error('Error retrieving performance dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance dashboard data'
      });
    }
  }

  /**
   * Run performance benchmarks
   */
  async runBenchmarks(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;

      if (type === 'comprehensive') {
        const results = await performanceBenchmarkService.runComprehensiveBenchmarks();
        
        res.json({
          success: true,
          data: results,
          timestamp: new Date().toISOString()
        });

        safeLogger.info('🚀 Comprehensive benchmarks completed', {
          overallScore: results.overallScore,
          recommendationCount: results.recommendations.length,
          operation: 'comprehensive_benchmarks'
        });
      } else {
        // Return benchmark history
        const history = performanceBenchmarkService.getBenchmarkHistory();
        
        res.json({
          success: true,
          data: {
            history: history instanceof Map ? Object.fromEntries(history) : history,
            summary: this.benchmarkService.getBenchmarkSummary()
          }
        });
      }
    } catch (error) {
      safeLogger.error('Error running benchmarks:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get Render-specific performance metrics
   */
  async getRenderMetrics(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      
      const currentMetrics = this.renderMonitoringService.getCurrentMetrics();
      const metricsHistory = this.renderMonitoringService.getMetricsHistory(limit);
      const activeAlerts = this.renderMonitoringService.getActiveAlerts();
      const recommendations = this.renderMonitoringService.generateOptimizationRecommendations();

      res.json({
        success: true,
        data: {
          current: currentMetrics,
          history: metricsHistory,
          alerts: activeAlerts,
          recommendations,
          timestamp: new Date().toISOString()
        }
      });

      safeLogger.info('📊 Render metrics retrieved', {
        historyCount: metricsHistory.length,
        alertCount: activeAlerts.length,
        operation: 'render_metrics'
      });
    } catch (error) {
      safeLogger.error('Error retrieving Render metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve Render metrics'
      });
    }
  }

  /**
   * Get error recovery and cache profiling data
   */
  async getProfilingData(req: Request, res: Response): Promise<void> {
    try {
      const timeWindow = parseInt(req.query.timeWindow as string) || 3600000;
      
      const summary = this.errorRecoveryProfiler.getProfilerSummary(timeWindow);
      const detailedMetrics = this.errorRecoveryProfiler.getDetailedMetrics();
      const recommendations = this.errorRecoveryProfiler.generatePerformanceRecommendations();

      res.json({
        success: true,
        data: {
          summary,
          detailed: {
            errorRecovery: detailedMetrics.errorRecovery.slice(-100), // Last 100
            cachePerformance: detailedMetrics.cachePerformance.slice(-100),
            circuitBreakers: detailedMetrics.circuitBreakers
          },
          recommendations,
          timeWindow,
          timestamp: new Date().toISOString()
        }
      });

      safeLogger.info('📊 Profiling data retrieved', {
        timeWindow,
        recommendationCount: recommendations.length,
        operation: 'profiling_data'
      });
    } catch (error) {
      safeLogger.error('Error retrieving profiling data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve profiling data'
      });
    }
  }

  /**
   * Get critical path performance data
   */
  async getCriticalPathData(req: Request, res: Response): Promise<void> {
    try {
      const { pathName } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      if (pathName) {
        // Get specific path metrics
        const pathMetrics = this.criticalPathOptimizer.getPathMetrics(pathName, limit);
        const userFeedback = this.criticalPathOptimizer.getUserFeedback(pathName);
        
        res.json({
          success: true,
          data: {
            pathName,
            metrics: pathMetrics,
            userFeedback,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // Get summary for all critical paths
        const summary = this.criticalPathOptimizer.getPerformanceSummary();
        const baselines = Object.fromEntries(this.criticalPathOptimizer.getPerformanceBaselines());
        const recommendations = this.criticalPathOptimizer.getOptimizationRecommendations();

        res.json({
          success: true,
          data: {
            summary,
            baselines,
            recommendations,
            timestamp: new Date().toISOString()
          }
        });
      }

      safeLogger.info('📊 Critical path data retrieved', {
        pathName: pathName || 'all',
        operation: 'critical_path_data'
      });
    } catch (error) {
      safeLogger.error('Error retrieving critical path data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve critical path data'
      });
    }
  }

  /**
   * Record user feedback for critical path performance
   */
  async recordUserFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { pathName, perceivedPerformance, actualDuration, userId, userAgent } = req.body;

      if (!pathName || !perceivedPerformance || actualDuration === undefined) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: pathName, perceivedPerformance, actualDuration'
        });
      }

      this.criticalPathOptimizer.recordUserFeedback(
        pathName,
        perceivedPerformance,
        actualDuration,
        userId,
        userAgent
      );

      res.json({
        success: true,
        message: 'User feedback recorded successfully',
        timestamp: new Date().toISOString()
      });

      safeLogger.info('👤 User feedback recorded', {
        pathName,
        perceivedPerformance,
        actualDuration,
        operation: 'user_feedback_recorded'
      });
    } catch (error) {
      safeLogger.error('Error recording user feedback:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record user feedback'
      });
    }
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { severity, limit } = req.query;
      
      const renderAlerts = this.renderMonitoringService.getActiveAlerts();
      const systemAlerts = performanceMonitoringService.getRecentAlerts(
        parseInt(limit as string) || 50
      );

      let allAlerts = [
        ...renderAlerts.map(alert => ({ ...alert, source: 'render' })),
        ...systemAlerts.map(alert => ({ ...alert, source: 'system' }))
      ];

      // Filter by severity if specified
      if (severity) {
        allAlerts = allAlerts.filter(alert => alert.severity === severity);
      }

      // Sort by timestamp (newest first)
      allAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      res.json({
        success: true,
        data: {
          alerts: allAlerts,
          summary: {
            total: allAlerts.length,
            critical: allAlerts.filter(a => a.severity === 'critical').length,
            high: allAlerts.filter(a => a.severity === 'high').length,
            medium: allAlerts.filter(a => a.severity === 'medium').length,
            low: allAlerts.filter(a => a.severity === 'low').length
          },
          timestamp: new Date().toISOString()
        }
      });

      safeLogger.info('🚨 Performance alerts retrieved', {
        totalAlerts: allAlerts.length,
        severity: severity || 'all',
        operation: 'performance_alerts'
      });
    } catch (error) {
      safeLogger.error('Error retrieving performance alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance alerts'
      });
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(req: Request, res: Response): Promise<void> {
    try {
      const { format, timeRange } = req.query;
      const timeWindow = this.parseTimeRange(timeRange as string);

      // Gather comprehensive data
      const [
        benchmarkSummary,
        renderSummary,
        profilerSummary,
        criticalPathSummary,
        systemReport
      ] = await Promise.all([
        performanceBenchmarkService.getBenchmarkSummary(),
        this.renderMonitoringService.getPerformanceSummary(),
        this.errorRecoveryProfiler.getProfilerSummary(timeWindow),
        this.criticalPathOptimizer.getPerformanceSummary(),
        performanceMonitoringService.generateReport()
      ]);

      const report = {
        generatedAt: new Date().toISOString(),
        timeRange: timeRange || '1h',
        summary: {
          overallScore: this.calculateOverallPerformanceScore({
            benchmarkSummary,
            renderMetrics: this.renderMonitoringService.getCurrentMetrics(),
            profilerSummary,
            criticalPathSummary,
            systemMetrics: performanceMonitoringService.getHealthStatus()
          }),
          status: renderSummary.status,
          criticalIssues: renderSummary.issues.length + 
                         (systemReport.recentAlerts.filter(a => a.severity === 'critical').length)
        },
        benchmarks: benchmarkSummary,
        renderEnvironment: renderSummary,
        errorRecovery: profilerSummary.errorRecovery,
        cachePerformance: profilerSummary.cachePerformance,
        criticalPaths: criticalPathSummary,
        systemPerformance: systemReport,
        recommendations: [
          ...renderSummary.recommendations,
          ...this.errorRecoveryProfiler.generatePerformanceRecommendations(),
          ...this.criticalPathOptimizer.getOptimizationRecommendations()
        ].slice(0, 20) // Top 20 recommendations
      };

      if (format === 'json') {
        res.json({
          success: true,
          data: report
        });
      } else {
        // Default to JSON for now, could add PDF/HTML formats later
        res.json({
          success: true,
          data: report
        });
      }

      safeLogger.info('📋 Performance report generated', {
        format: format || 'json',
        timeRange: timeRange || '1h',
        overallScore: report.summary.overallScore,
        operation: 'performance_report'
      });
    } catch (error) {
      safeLogger.error('Error generating performance report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate performance report'
      });
    }
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallPerformanceScore(data: any): number {
    let score = 100;

    // Benchmark score impact (20%)
    if (data.benchmarkSummary.overallSuccessRate < 0.9) {
      score -= (1 - data.benchmarkSummary.overallSuccessRate) * 20;
    }

    // Render environment impact (25%)
    if (data.renderMetrics) {
      if (data.renderMetrics.memoryUsage.utilization > 0.9) score -= 25;
      else if (data.renderMetrics.memoryUsage.utilization > 0.8) score -= 15;
      else if (data.renderMetrics.memoryUsage.utilization > 0.7) score -= 5;

      if (data.renderMetrics.databaseConnections.connectionHealth === 'critical') score -= 20;
      else if (data.renderMetrics.databaseConnections.connectionHealth === 'degraded') score -= 10;
    }

    // Error recovery impact (15%)
    if (data.profilerSummary.errorRecovery.recoverySuccessRate < 0.8) {
      score -= (1 - data.profilerSummary.errorRecovery.recoverySuccessRate) * 15;
    }

    // Cache performance impact (15%)
    if (data.profilerSummary.cachePerformance.overallHitRate < 0.7) {
      score -= (0.7 - data.profilerSummary.cachePerformance.overallHitRate) * 15;
    }

    // Critical path impact (25%)
    const criticalPathScore = this.getCriticalPathScore(data.criticalPathSummary);
    score -= (100 - criticalPathScore) * 0.25;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get critical path performance score
   */
  private getCriticalPathScore(summary: any): number {
    if (!summary.criticalPaths || summary.criticalPaths.length === 0) return 100;

    const fastPaths = summary.criticalPaths.filter(p => p.performanceLevel === 'fast').length;
    const acceptablePaths = summary.criticalPaths.filter(p => p.performanceLevel === 'acceptable').length;
    const totalPaths = summary.criticalPaths.length;

    const goodPaths = fastPaths + acceptablePaths;
    return (goodPaths / totalPaths) * 100;
  }

  /**
   * Get overall status based on score
   */
  private getOverallStatus(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  /**
   * Parse time range string to milliseconds
   */
  private parseTimeRange(timeRange: string): number {
    if (!timeRange) return 3600000; // Default 1 hour

    const match = timeRange.match(/^(\d+)([hmsd])$/);
    if (!match) return 3600000;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 3600000;
    }
  }
}

export default PerformanceMonitoringController;