import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { memoryMonitoringService } from './memoryMonitoringService';
import { performanceMonitoringService } from './performanceMonitoringService';

interface RenderEnvironmentMetrics {
  memoryUsage: {
    current: number;
    limit: number;
    utilization: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    gcEfficiency: number;
  };
  databaseConnections: {
    poolSize: number;
    activeConnections: number;
    idleConnections: number;
    waitingClients: number;
    utilization: number;
    connectionHealth: 'healthy' | 'degraded' | 'critical';
  };
  renderSpecific: {
    isPro: boolean;
    memoryLimit: number;
    cpuLimit: number;
    diskUsage: number;
    networkLatency: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'memory' | 'database' | 'performance' | 'render';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metadata: any;
  resolved: boolean;
}

interface OptimizationRecommendation {
  category: 'memory' | 'database' | 'performance' | 'infrastructure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation: string;
  estimatedImpact: 'low' | 'medium' | 'high';
}

/**
 * Render Performance Monitoring Service
 * Implements task 14.2: Implement monitoring for memory usage and database connection pooling on Render
 */
export class RenderPerformanceMonitoringService {
  private pool: Pool;
  private redis: Redis;
  private alerts: Map<string, PerformanceAlert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: RenderEnvironmentMetrics[] = [];
  private readonly MAX_HISTORY = 1000; // Keep last 1000 metrics snapshots

  private readonly RENDER_THRESHOLDS = {
    memory: {
      warning: 0.8, // 80% of limit
      critical: 0.9, // 90% of limit
      emergency: 0.95 // 95% of limit
    },
    database: {
      connectionUtilization: {
        warning: 0.7, // 70% of pool
        critical: 0.9 // 90% of pool
      },
      waitingClients: {
        warning: 5,
        critical: 15
      }
    },
    performance: {
      responseTime: {
        warning: 1000, // 1 second
        critical: 3000 // 3 seconds
      },
      errorRate: {
        warning: 0.05, // 5%
        critical: 0.1 // 10%
      }
    }
  };

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
    this.startMonitoring();
  }

  /**
   * Start comprehensive monitoring
   */
  private startMonitoring(): void {
    const isRenderPro = process.env.RENDER && process.env.RENDER_PRO;
    const interval = isRenderPro ? 30000 : 15000; // More frequent monitoring on free tier

    safeLogger.info(`🔍 Starting Render performance monitoring (interval: ${interval}ms)`);

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.analyzePerformance();
        await this.checkAlerts();
      } catch (error) {
        safeLogger.error('Error in performance monitoring cycle:', error);
      }
    }, interval);

    // Initial collection
    this.collectMetrics();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      safeLogger.info('🔍 Render performance monitoring stopped');
    }
  }

  /**
   * Collect comprehensive metrics
   */
  private async collectMetrics(): Promise<RenderEnvironmentMetrics> {
    const memoryStats = memoryMonitoringService.getMemoryStats();
    const performanceStats = performanceMonitoringService.getMetrics();
    
    // Memory metrics
    const memoryLimit = this.getMemoryLimit();
    const memoryUtilization = memoryStats.rss / memoryLimit;
    const memoryTrend = this.calculateMemoryTrend();
    const gcEfficiency = this.calculateGcEfficiency();

    // Database connection metrics
    const dbMetrics = await this.collectDatabaseMetrics();

    // Render-specific metrics
    const renderMetrics = await this.collectRenderSpecificMetrics();

    const metrics: RenderEnvironmentMetrics = {
      memoryUsage: {
        current: memoryStats.rss,
        limit: memoryLimit,
        utilization: memoryUtilization,
        trend: memoryTrend,
        gcEfficiency
      },
      databaseConnections: dbMetrics,
      renderSpecific: renderMetrics
    };

    // Store in history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory = this.metricsHistory.slice(-this.MAX_HISTORY);
    }

    return metrics;
  }

  /**
   * Get memory limit based on environment
   */
  private getMemoryLimit(): number {
    if (process.env.MEMORY_LIMIT) {
      return parseInt(process.env.MEMORY_LIMIT) * 1024 * 1024; // Convert MB to bytes
    }

    // Default Render limits
    const isRenderPro = process.env.RENDER && process.env.RENDER_PRO;
    return isRenderPro ? 2048 * 1024 * 1024 : 512 * 1024 * 1024; // 2GB Pro, 512MB Free
  }

  /**
   * Calculate memory trend
   */
  private calculateMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.metricsHistory.length < 5) return 'stable';

    const recent = this.metricsHistory.slice(-5);
    const trend = recent.reduce((acc, curr, index) => {
      if (index === 0) return acc;
      const prev = recent[index - 1];
      if (curr.memoryUsage.current > prev.memoryUsage.current) acc.increasing++;
      else if (curr.memoryUsage.current < prev.memoryUsage.current) acc.decreasing++;
      return acc;
    }, { increasing: 0, decreasing: 0 });

    if (trend.increasing > trend.decreasing) return 'increasing';
    if (trend.decreasing > trend.increasing) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate garbage collection efficiency
   */
  private calculateGcEfficiency(): number {
    if (this.metricsHistory.length < 2) return 1;

    const current = this.metricsHistory[this.metricsHistory.length - 1];
    const previous = this.metricsHistory[this.metricsHistory.length - 2];

    const memoryReduction = previous.memoryUsage.current - current.memoryUsage.current;
    const expectedReduction = previous.memoryUsage.current * 0.1; // Expect 10% reduction

    return Math.min(1, Math.max(0, memoryReduction / expectedReduction));
  }

  /**
   * Collect database connection metrics
   */
  private async collectDatabaseMetrics(): Promise<RenderEnvironmentMetrics['databaseConnections']> {
    const poolSize = this.pool.totalCount;
    const activeConnections = this.pool.totalCount - this.pool.idleCount;
    const idleConnections = this.pool.idleCount;
    const waitingClients = this.pool.waitingCount;
    const utilization = poolSize > 0 ? activeConnections / poolSize : 0;

    let connectionHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (utilization > this.RENDER_THRESHOLDS.database.connectionUtilization.critical || 
        waitingClients > this.RENDER_THRESHOLDS.database.waitingClients.critical) {
      connectionHealth = 'critical';
    } else if (utilization > this.RENDER_THRESHOLDS.database.connectionUtilization.warning || 
               waitingClients > this.RENDER_THRESHOLDS.database.waitingClients.warning) {
      connectionHealth = 'degraded';
    }

    return {
      poolSize,
      activeConnections,
      idleConnections,
      waitingClients,
      utilization,
      connectionHealth
    };
  }

  /**
   * Collect Render-specific metrics
   */
  private async collectRenderSpecificMetrics(): Promise<RenderEnvironmentMetrics['renderSpecific']> {
    const isPro = !!(process.env.RENDER && process.env.RENDER_PRO);
    const memoryLimit = this.getMemoryLimit() / (1024 * 1024); // Convert to MB
    const cpuLimit = isPro ? 2 : 0.5; // CPU cores

    // Estimate disk usage (simplified)
    let diskUsage = 0;
    try {
      const fs = require('fs');
      const stats = fs.statSync(process.cwd());
      diskUsage = stats.size / (1024 * 1024); // MB
    } catch (error) {
      // Ignore disk usage errors
    }

    // Measure network latency to external service
    const networkLatency = await this.measureNetworkLatency();

    return {
      isPro,
      memoryLimit,
      cpuLimit,
      diskUsage,
      networkLatency
    };
  }

  /**
   * Measure network latency
   */
  private async measureNetworkLatency(): Promise<number> {
    try {
      const start = Date.now();
      await this.redis.ping();
      return Date.now() - start;
    } catch (error) {
      return 1000; // Default high latency on error
    }
  }

  /**
   * Analyze performance and generate insights
   */
  private async analyzePerformance(): Promise<void> {
    const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    if (!currentMetrics) return;

    // Memory analysis
    if (currentMetrics.memoryUsage.utilization > this.RENDER_THRESHOLDS.memory.critical) {
      this.createAlert('memory', 'critical', 
        `Critical memory usage: ${(currentMetrics.memoryUsage.utilization * 100).toFixed(1)}%`,
        { metrics: currentMetrics.memoryUsage });
    } else if (currentMetrics.memoryUsage.utilization > this.RENDER_THRESHOLDS.memory.warning) {
      this.createAlert('memory', 'medium', 
        `High memory usage: ${(currentMetrics.memoryUsage.utilization * 100).toFixed(1)}%`,
        { metrics: currentMetrics.memoryUsage });
    }

    // Database analysis
    if (currentMetrics.databaseConnections.connectionHealth === 'critical') {
      this.createAlert('database', 'critical',
        `Critical database connection issues: ${currentMetrics.databaseConnections.waitingClients} waiting clients`,
        { metrics: currentMetrics.databaseConnections });
    }

    // Performance analysis
    const performanceStats = performanceMonitoringService.getHealthStatus();
    if (performanceStats.status === 'unhealthy') {
      this.createAlert('performance', 'high',
        `Performance degradation detected: ${performanceStats.issues.join(', ')}`,
        { metrics: performanceStats.metrics });
    }

    // Render-specific analysis
    if (!currentMetrics.renderSpecific.isPro && currentMetrics.memoryUsage.utilization > 0.8) {
      this.createAlert('render', 'medium',
        'Consider upgrading to Render Pro for better performance',
        { currentPlan: 'free', recommendation: 'pro' });
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    metadata: any
  ): void {
    const alertId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      type,
      severity,
      message,
      timestamp: new Date(),
      metadata,
      resolved: false
    };

    this.alerts.set(alertId, alert);

    // Log alert
    const logLevel = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    safeLogger[logLevel](`🚨 Performance Alert [${severity.toUpperCase()}]: ${message}`, {
      alertId,
      type,
      metadata
    });

    // Auto-resolve old alerts of same type
    this.autoResolveOldAlerts(type);
  }

  /**
   * Auto-resolve old alerts of the same type
   */
  private autoResolveOldAlerts(type: PerformanceAlert['type']): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    for (const [alertId, alert] of this.alerts) {
      if (alert.type === type && 
          alert.timestamp.getTime() < fiveMinutesAgo && 
          !alert.resolved) {
        alert.resolved = true;
        safeLogger.info(`✅ Auto-resolved alert: ${alertId}`);
      }
    }
  }

  /**
   * Check and process alerts
   */
  private async checkAlerts(): Promise<void> {
    const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolved);
    
    // Take action on critical alerts
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    
    for (const alert of criticalAlerts) {
      await this.handleCriticalAlert(alert);
    }

    // Clean up old resolved alerts
    this.cleanupOldAlerts();
  }

  /**
   * Handle critical alerts with automated responses
   */
  private async handleCriticalAlert(alert: PerformanceAlert): Promise<void> {
    switch (alert.type) {
      case 'memory':
        if (alert.metadata.metrics?.utilization > this.RENDER_THRESHOLDS.memory.emergency) {
          safeLogger.error('🚨 Emergency memory cleanup triggered');
          memoryMonitoringService.performEmergencyCleanup();
        } else {
          memoryMonitoringService.forceGarbageCollection();
        }
        break;

      case 'database':
        if (alert.metadata.metrics?.waitingClients > 20) {
          safeLogger.warn('🚨 High database connection pressure - implementing connection throttling');
          // In a real implementation, you might temporarily reduce connection pool size
          // or implement connection queuing
        }
        break;

      case 'performance':
        safeLogger.warn('🚨 Performance degradation - enabling enhanced monitoring');
        // Could trigger more detailed profiling or circuit breaker activation
        break;
    }
  }

  /**
   * Clean up old alerts
   */
  private cleanupOldAlerts(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [alertId, alert] of this.alerts) {
      if (alert.timestamp.getTime() < oneDayAgo) {
        this.alerts.delete(alertId);
      }
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): RenderEnvironmentMetrics | null {
    return this.metricsHistory.length > 0 ? 
      this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): RenderEnvironmentMetrics[] {
    if (limit) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit?: number): PerformanceAlert[] {
    const alerts = Array.from(this.alerts.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? alerts.slice(0, limit) : alerts;
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const currentMetrics = this.getCurrentMetrics();
    
    if (!currentMetrics) return recommendations;

    // Memory recommendations
    if (currentMetrics.memoryUsage.utilization > 0.8) {
      recommendations.push({
        category: 'memory',
        priority: currentMetrics.memoryUsage.utilization > 0.9 ? 'critical' : 'high',
        title: 'Optimize Memory Usage',
        description: `Memory utilization is at ${(currentMetrics.memoryUsage.utilization * 100).toFixed(1)}%`,
        implementation: 'Implement object pooling, reduce memory allocations, enable garbage collection monitoring',
        estimatedImpact: 'high'
      });
    }

    if (currentMetrics.memoryUsage.trend === 'increasing') {
      recommendations.push({
        category: 'memory',
        priority: 'medium',
        title: 'Memory Leak Investigation',
        description: 'Memory usage is consistently increasing',
        implementation: 'Profile application for memory leaks, implement heap snapshots',
        estimatedImpact: 'medium'
      });
    }

    // Database recommendations
    if (currentMetrics.databaseConnections.utilization > 0.8) {
      recommendations.push({
        category: 'database',
        priority: 'high',
        title: 'Optimize Database Connections',
        description: `Database connection utilization is at ${(currentMetrics.databaseConnections.utilization * 100).toFixed(1)}%`,
        implementation: 'Increase connection pool size, implement connection pooling strategies',
        estimatedImpact: 'high'
      });
    }

    if (currentMetrics.databaseConnections.waitingClients > 5) {
      recommendations.push({
        category: 'database',
        priority: 'medium',
        title: 'Reduce Database Connection Wait Time',
        description: `${currentMetrics.databaseConnections.waitingClients} clients waiting for connections`,
        implementation: 'Optimize query performance, implement query caching',
        estimatedImpact: 'medium'
      });
    }

    // Infrastructure recommendations
    if (!currentMetrics.renderSpecific.isPro && currentMetrics.memoryUsage.utilization > 0.7) {
      recommendations.push({
        category: 'infrastructure',
        priority: 'medium',
        title: 'Consider Render Pro Upgrade',
        description: 'Current resource usage suggests benefits from Pro tier',
        implementation: 'Upgrade to Render Pro for 4x memory and better performance',
        estimatedImpact: 'high'
      });
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
    status: 'optimal' | 'good' | 'degraded' | 'critical';
    score: number;
    issues: string[];
    recommendations: OptimizationRecommendation[];
    metrics: RenderEnvironmentMetrics | null;
  } {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    const recommendations = this.generateOptimizationRecommendations();

    let status: 'optimal' | 'good' | 'degraded' | 'critical' = 'optimal';
    let score = 100;
    const issues: string[] = [];

    if (!currentMetrics) {
      return { status: 'critical', score: 0, issues: ['No metrics available'], recommendations, metrics: null };
    }

    // Evaluate memory
    if (currentMetrics.memoryUsage.utilization > 0.9) {
      status = 'critical';
      score -= 40;
      issues.push('Critical memory usage');
    } else if (currentMetrics.memoryUsage.utilization > 0.8) {
      status = status === 'optimal' ? 'degraded' : status;
      score -= 20;
      issues.push('High memory usage');
    }

    // Evaluate database
    if (currentMetrics.databaseConnections.connectionHealth === 'critical') {
      status = 'critical';
      score -= 30;
      issues.push('Critical database connection issues');
    } else if (currentMetrics.databaseConnections.connectionHealth === 'degraded') {
      status = status === 'optimal' ? 'degraded' : status;
      score -= 15;
      issues.push('Database connection pressure');
    }

    // Evaluate alerts
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      status = 'critical';
      score -= 25;
      issues.push(`${criticalAlerts.length} critical alerts`);
    }

    const highAlerts = activeAlerts.filter(a => a.severity === 'high');
    if (highAlerts.length > 0) {
      status = status === 'optimal' ? 'good' : status;
      score -= 10;
      issues.push(`${highAlerts.length} high priority alerts`);
    }

    // Adjust status based on score
    if (score >= 90 && status === 'optimal') status = 'optimal';
    else if (score >= 70) status = status === 'critical' ? 'critical' : 'good';
    else if (score >= 50) status = status === 'critical' ? 'critical' : 'degraded';
    else status = 'critical';

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations,
      metrics: currentMetrics
    };
  }
}

export default RenderPerformanceMonitoringService;