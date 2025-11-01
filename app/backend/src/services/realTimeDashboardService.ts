import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { EventEmitter } from 'events';
import { analyticsService } from './analyticsService';

export interface DashboardMetrics {
  gmv: {
    current: number;
    change24h: number;
    changePercent: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    disputed: number;
  };
  users: {
    active: number;
    new24h: number;
    online: number;
  };
  transactions: {
    successRate: number;
    avgProcessingTime: number;
    totalVolume: number;
    failureCount: number;
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
  }>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export class RealTimeDashboardService extends EventEmitter {
  private redis: Redis;
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_FREQUENCY = 30000; // 30 seconds
  private readonly METRICS_TTL = 300; // 5 minutes

  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.startRealTimeUpdates();
  }

  /**
   * Start real-time metrics updates
   */
  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateDashboardMetrics();
        await this.updateSystemHealth();
        this.emit('metricsUpdated');
      } catch (error) {
        safeLogger.error('Error updating real-time metrics:', error);
        this.emit('error', error);
      }
    }, this.UPDATE_FREQUENCY);
  }

  /**
   * Stop real-time updates
   */
  public stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Get current dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const cached = await this.redis.get('dashboard:metrics');
      if (cached) {
        return JSON.parse(cached);
      }

      // If no cached data, generate fresh metrics
      await this.updateDashboardMetrics();
      const fresh = await this.redis.get('dashboard:metrics');
      return fresh ? JSON.parse(fresh) : this.getDefaultMetrics();
    } catch (error) {
      safeLogger.error('Error getting dashboard metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get current system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const cached = await this.redis.get('dashboard:health');
      if (cached) {
        return JSON.parse(cached);
      }

      await this.updateSystemHealth();
      const fresh = await this.redis.get('dashboard:health');
      return fresh ? JSON.parse(fresh) : this.getDefaultHealth();
    } catch (error) {
      safeLogger.error('Error getting system health:', error);
      return this.getDefaultHealth();
    }
  }

  /**
   * Update dashboard metrics in cache
   */
  private async updateDashboardMetrics(): Promise<void> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get current and historical data
      const [
        currentMetrics,
        yesterdayMetrics,
        anomalies
      ] = await Promise.all([
        analyticsService.getOverviewMetrics(),
        analyticsService.getOverviewMetrics(yesterday, now),
        analyticsService.detectAnomalies()
      ]);

      // Calculate changes
      const gmvChange = currentMetrics.gmv - (yesterdayMetrics.gmv || 0);
      const gmvChangePercent = yesterdayMetrics.gmv > 0 
        ? (gmvChange / yesterdayMetrics.gmv) * 100 
        : 0;

      const metrics: DashboardMetrics = {
        gmv: {
          current: currentMetrics.gmv,
          change24h: gmvChange,
          changePercent: gmvChangePercent
        },
        orders: {
          total: currentMetrics.totalOrders,
          pending: await this.getOrderCountByStatus('pending'),
          completed: await this.getOrderCountByStatus('completed'),
          disputed: await this.getOrderCountByStatus('disputed')
        },
        users: {
          active: currentMetrics.activeUsers.daily,
          new24h: currentMetrics.userAcquisitionRate,
          online: await this.getOnlineUserCount()
        },
        transactions: {
          successRate: currentMetrics.transactionSuccessRate,
          avgProcessingTime: await this.getAvgProcessingTime(),
          totalVolume: currentMetrics.gmv,
          failureCount: await this.getFailedTransactionCount()
        },
        alerts: anomalies.slice(0, 10).map(anomaly => ({
          id: anomaly.id,
          type: this.mapSeverityToType(anomaly.severity),
          message: anomaly.description,
          timestamp: anomaly.detectionTime
        }))
      };

      await this.redis.setex('dashboard:metrics', this.METRICS_TTL, JSON.stringify(metrics));
    } catch (error) {
      safeLogger.error('Error updating dashboard metrics:', error);
    }
  }

  /**
   * Update system health metrics
   */
  private async updateSystemHealth(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Test database connectivity
      await this.testDatabaseConnection();
      const responseTime = Date.now() - startTime;

      // Get system resources
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Calculate error rate from recent transactions
      const errorRate = await this.calculateErrorRate();
      
      // Calculate throughput (requests per second)
      const throughput = await this.calculateThroughput();

      const health: SystemHealth = {
        status: this.determineSystemStatus(responseTime, errorRate),
        uptime: process.uptime(),
        responseTime,
        errorRate,
        throughput,
        resources: {
          cpu: this.calculateCpuPercentage(cpuUsage),
          memory: (memUsage.heapUsed / memUsage.heapTotal) * 100,
          disk: await this.getDiskUsage()
        }
      };

      await this.redis.setex('dashboard:health', this.METRICS_TTL, JSON.stringify(health));
    } catch (error) {
      safeLogger.error('Error updating system health:', error);
      
      // Store error state
      const errorHealth: SystemHealth = {
        status: 'critical',
        uptime: process.uptime(),
        responseTime: -1,
        errorRate: 100,
        throughput: 0,
        resources: {
          cpu: 0,
          memory: 0,
          disk: 0
        }
      };

      await this.redis.setex('dashboard:health', this.METRICS_TTL, JSON.stringify(errorHealth));
    }
  }

  /**
   * Record real-time event
   */
  async recordEvent(eventType: string, data: any): Promise<void> {
    try {
      const event = {
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      };

      // Store in Redis stream for real-time processing
      await this.redis.xadd('events:stream', '*', 'event', JSON.stringify(event));

      // Update counters
      const counterKey = `counter:${eventType}:${new Date().toISOString().split('T')[0]}`;
      await this.redis.incr(counterKey);
      await this.redis.expire(counterKey, 86400); // 24 hours

      // Emit event for WebSocket clients
      this.emit('event', event);
    } catch (error) {
      safeLogger.error('Error recording event:', error);
    }
  }

  /**
   * Get real-time event stream
   */
  async getEventStream(lastId: string = '0'): Promise<any[]> {
    try {
      const events = await this.redis.xread('STREAMS', 'events:stream', lastId);
      return events || [];
    } catch (error) {
      safeLogger.error('Error getting event stream:', error);
      return [];
    }
  }

  /**
   * Get trending metrics
   */
  async getTrendingMetrics(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<any> {
    try {
      const cacheKey = `trending:${timeframe}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate trending metrics based on timeframe
      const trends = await this.calculateTrendingMetrics(timeframe);
      
      await this.redis.setex(cacheKey, 300, JSON.stringify(trends)); // 5 min cache
      return trends;
    } catch (error) {
      safeLogger.error('Error getting trending metrics:', error);
      return {};
    }
  }

  // Private helper methods
  private async getOrderCountByStatus(status: string): Promise<number> {
    try {
      const count = await this.redis.get(`orders:count:${status}`);
      return count ? parseInt(count) : 0;
    } catch (error) {
      return 0;
    }
  }

  private async getOnlineUserCount(): Promise<number> {
    try {
      const count = await this.redis.scard('users:online');
      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getAvgProcessingTime(): Promise<number> {
    try {
      const avg = await this.redis.get('metrics:avg_processing_time');
      return avg ? parseFloat(avg) : 0;
    } catch (error) {
      return 0;
    }
  }

  private async getFailedTransactionCount(): Promise<number> {
    try {
      const count = await this.redis.get('transactions:failed:24h');
      return count ? parseInt(count) : 0;
    } catch (error) {
      return 0;
    }
  }

  private mapSeverityToType(severity: string): 'warning' | 'error' | 'info' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    // Simple database connectivity test
    // This would be replaced with actual database ping
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private calculateCpuPercentage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU calculation
    return (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to percentage
  }

  private async getDiskUsage(): Promise<number> {
    // Mock disk usage - would use actual system calls in production
    return Math.random() * 100;
  }

  private async calculateErrorRate(): Promise<number> {
    try {
      const [total, errors] = await Promise.all([
        this.redis.get('requests:total:1h'),
        this.redis.get('requests:errors:1h')
      ]);

      const totalCount = total ? parseInt(total) : 0;
      const errorCount = errors ? parseInt(errors) : 0;

      return totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
    } catch (error) {
      return 0;
    }
  }

  private async calculateThroughput(): Promise<number> {
    try {
      const requests = await this.redis.get('requests:total:1m');
      return requests ? parseInt(requests) / 60 : 0; // requests per second
    } catch (error) {
      return 0;
    }
  }

  private determineSystemStatus(responseTime: number, errorRate: number): 'healthy' | 'degraded' | 'critical' {
    if (responseTime > 5000 || errorRate > 10) {
      return 'critical';
    } else if (responseTime > 2000 || errorRate > 5) {
      return 'degraded';
    }
    return 'healthy';
  }

  private async calculateTrendingMetrics(timeframe: string): Promise<any> {
    // Mock implementation - would calculate actual trending metrics
    return {
      topCategories: [],
      growingProducts: [],
      activeRegions: []
    };
  }

  private getDefaultMetrics(): DashboardMetrics {
    return {
      gmv: { current: 0, change24h: 0, changePercent: 0 },
      orders: { total: 0, pending: 0, completed: 0, disputed: 0 },
      users: { active: 0, new24h: 0, online: 0 },
      transactions: { successRate: 0, avgProcessingTime: 0, totalVolume: 0, failureCount: 0 },
      alerts: []
    };
  }

  private getDefaultHealth(): SystemHealth {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      responseTime: 0,
      errorRate: 0,
      throughput: 0,
      resources: { cpu: 0, memory: 0, disk: 0 }
    };
  }
}

export const realTimeDashboardService = new RealTimeDashboardService();
