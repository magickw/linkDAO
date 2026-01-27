import { safeLogger } from '../utils/safeLogger';
import { redisService } from './redisService';
import { returnAggregationQueue } from '../workers/returnAggregationWorker';
import { returnEventQueue } from '../queues/returnEventQueue';
import { getAdminWebSocketService } from '../websocket/adminWebSocketService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PipelineMetrics {
  timestamp: Date;
  queues: QueueMetrics;
  websocket: WebSocketMetrics;
  aggregation: AggregationMetrics;
  alerts: AlertMetrics;
  performance: PerformanceMetrics;
}

export interface QueueMetrics {
  returnEventQueue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
  aggregationQueue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
}

export interface WebSocketMetrics {
  connectedAdmins: number;
  totalConnections: number;
  messagesSentPerMinute: number;
  messagesReceivedPerMinute: number;
  averageLatency: number;
}

export interface AggregationMetrics {
  lastHourlyRun: Date | null;
  lastDailyRun: Date | null;
  lastWeeklyRun: Date | null;
  lastMonthlyRun: Date | null;
  hourlyJobsCompleted: number;
  dailyJobsCompleted: number;
  weeklyJobsCompleted: number;
  monthlyJobsCompleted: number;
  failedJobs24h: number;
}

export interface AlertMetrics {
  activeAlerts: number;
  alertsGenerated24h: number;
  criticalAlerts: number;
  acknowledgedRate: number;
}

export interface PerformanceMetrics {
  averageEventProcessingTime: number;
  p95EventProcessingTime: number;
  p99EventProcessingTime: number;
  throughputEventsPerSecond: number;
  errorRate: number;
  cacheHitRate: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: {
    redis: ComponentHealth;
    websocket: ComponentHealth;
    eventQueue: ComponentHealth;
    aggregationQueue: ComponentHealth;
    database: ComponentHealth;
  };
  issues: string[];
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
}

// ============================================================================
// MONITORING SERVICE
// ============================================================================

class ReturnPipelineMonitoringService {
  private metricsHistory: PipelineMetrics[] = [];
  private readonly MAX_HISTORY_SIZE = 1440; // 24 hours of minute-by-minute data
  private processingTimes: number[] = [];
  private readonly MAX_PROCESSING_SAMPLES = 1000;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: HealthCheckResult | null = null;
  private messagesSent = 0;
  private messagesReceived = 0;
  private lastMinuteMessagesSent = 0;
  private lastMinuteMessagesReceived = 0;

  // ========================================================================
  // LIFECYCLE MANAGEMENT
  // ========================================================================

  /**
   * Start the monitoring service
   */
  start(): void {
    safeLogger.info('Starting Return Pipeline Monitoring Service');

    // Collect metrics every minute
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000);

    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.runHealthCheck();
    }, 30000);

    // Initial collection
    this.collectMetrics();
    this.runHealthCheck();

    safeLogger.info('Return Pipeline Monitoring Service started');
  }

  /**
   * Stop the monitoring service
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    safeLogger.info('Return Pipeline Monitoring Service stopped');
  }

  // ========================================================================
  // METRICS COLLECTION
  // ========================================================================

  /**
   * Collect current pipeline metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics: PipelineMetrics = {
        timestamp: new Date(),
        queues: await this.collectQueueMetrics(),
        websocket: await this.collectWebSocketMetrics(),
        aggregation: await this.collectAggregationMetrics(),
        alerts: await this.collectAlertMetrics(),
        performance: await this.collectPerformanceMetrics(),
      };

      // Add to history
      this.metricsHistory.push(metrics);

      // Trim history if needed
      if (this.metricsHistory.length > this.MAX_HISTORY_SIZE) {
        this.metricsHistory.shift();
      }

      // Store in Redis for cross-instance access
      await this.storeMetricsInRedis(metrics);

      // Check for anomalies and generate alerts
      await this.checkForAnomalies(metrics);

      // Reset per-minute counters
      this.lastMinuteMessagesSent = this.messagesSent;
      this.lastMinuteMessagesReceived = this.messagesReceived;
      this.messagesSent = 0;
      this.messagesReceived = 0;

      safeLogger.debug('Pipeline metrics collected successfully');
    } catch (error) {
      safeLogger.error('Error collecting pipeline metrics:', error);
    }
  }

  private async collectQueueMetrics(): Promise<QueueMetrics> {
    try {
      const [eventQueueCounts, aggQueueCounts] = await Promise.all([
        returnEventQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
        returnAggregationQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      ]);

      const [eventPaused, aggPaused] = await Promise.all([
        returnEventQueue.isPaused(),
        returnAggregationQueue.isPaused(),
      ]);

      return {
        returnEventQueue: {
          waiting: eventQueueCounts.waiting || 0,
          active: eventQueueCounts.active || 0,
          completed: eventQueueCounts.completed || 0,
          failed: eventQueueCounts.failed || 0,
          delayed: eventQueueCounts.delayed || 0,
          paused: eventPaused,
        },
        aggregationQueue: {
          waiting: aggQueueCounts.waiting || 0,
          active: aggQueueCounts.active || 0,
          completed: aggQueueCounts.completed || 0,
          failed: aggQueueCounts.failed || 0,
          delayed: aggQueueCounts.delayed || 0,
          paused: aggPaused,
        },
      };
    } catch (error) {
      safeLogger.error('Error collecting queue metrics:', error);
      return {
        returnEventQueue: {
          waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: false,
        },
        aggregationQueue: {
          waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: false,
        },
      };
    }
  }

  private async collectWebSocketMetrics(): Promise<WebSocketMetrics> {
    try {
      const adminWs = getAdminWebSocketService();
      if (!adminWs) {
        return {
          connectedAdmins: 0,
          totalConnections: 0,
          messagesSentPerMinute: 0,
          messagesReceivedPerMinute: 0,
          averageLatency: 0,
        };
      }

      const stats = adminWs.getAdminStats();

      return {
        connectedAdmins: stats.connectedAdmins,
        totalConnections: stats.uniqueAdmins,
        messagesSentPerMinute: this.lastMinuteMessagesSent,
        messagesReceivedPerMinute: this.lastMinuteMessagesReceived,
        averageLatency: await this.getAverageLatency(),
      };
    } catch (error) {
      safeLogger.error('Error collecting WebSocket metrics:', error);
      return {
        connectedAdmins: 0,
        totalConnections: 0,
        messagesSentPerMinute: 0,
        messagesReceivedPerMinute: 0,
        averageLatency: 0,
      };
    }
  }

  private async collectAggregationMetrics(): Promise<AggregationMetrics> {
    try {
      const cacheKey = 'pipeline:aggregation:metrics';
      const cached = await redisService.get(cacheKey);

      if (cached) {
        return cached as AggregationMetrics;
      }

      // Get last run times from Redis or return defaults
      const [lastHourly, lastDaily, lastWeekly, lastMonthly] = await Promise.all([
        redisService.get('aggregation:last:hourly'),
        redisService.get('aggregation:last:daily'),
        redisService.get('aggregation:last:weekly'),
        redisService.get('aggregation:last:monthly'),
      ]);

      return {
        lastHourlyRun: lastHourly ? new Date(lastHourly as string) : null,
        lastDailyRun: lastDaily ? new Date(lastDaily as string) : null,
        lastWeeklyRun: lastWeekly ? new Date(lastWeekly as string) : null,
        lastMonthlyRun: lastMonthly ? new Date(lastMonthly as string) : null,
        hourlyJobsCompleted: 0,
        dailyJobsCompleted: 0,
        weeklyJobsCompleted: 0,
        monthlyJobsCompleted: 0,
        failedJobs24h: 0,
      };
    } catch (error) {
      safeLogger.error('Error collecting aggregation metrics:', error);
      return {
        lastHourlyRun: null,
        lastDailyRun: null,
        lastWeeklyRun: null,
        lastMonthlyRun: null,
        hourlyJobsCompleted: 0,
        dailyJobsCompleted: 0,
        weeklyJobsCompleted: 0,
        monthlyJobsCompleted: 0,
        failedJobs24h: 0,
      };
    }
  }

  private async collectAlertMetrics(): Promise<AlertMetrics> {
    try {
      const cacheKey = 'pipeline:alerts:metrics';
      const cached = await redisService.get(cacheKey);

      if (cached) {
        return cached as AlertMetrics;
      }

      return {
        activeAlerts: 0,
        alertsGenerated24h: 0,
        criticalAlerts: 0,
        acknowledgedRate: 1.0,
      };
    } catch (error) {
      safeLogger.error('Error collecting alert metrics:', error);
      return {
        activeAlerts: 0,
        alertsGenerated24h: 0,
        criticalAlerts: 0,
        acknowledgedRate: 1.0,
      };
    }
  }

  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const sortedTimes = [...this.processingTimes].sort((a, b) => a - b);
      const avgTime = sortedTimes.length > 0
        ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
        : 0;
      const p95Time = sortedTimes.length > 0
        ? sortedTimes[Math.floor(sortedTimes.length * 0.95)] || avgTime
        : 0;
      const p99Time = sortedTimes.length > 0
        ? sortedTimes[Math.floor(sortedTimes.length * 0.99)] || p95Time
        : 0;

      const cacheStats = await redisService.get('pipeline:cache:stats');
      const cacheHitRate = cacheStats ? (cacheStats as { hitRate: number }).hitRate : 0.8;

      // Calculate throughput from queue completed jobs
      const queueMetrics = await this.collectQueueMetrics();
      const completedLastMinute = queueMetrics.returnEventQueue.completed;

      return {
        averageEventProcessingTime: avgTime,
        p95EventProcessingTime: p95Time,
        p99EventProcessingTime: p99Time,
        throughputEventsPerSecond: completedLastMinute / 60,
        errorRate: await this.calculateErrorRate(),
        cacheHitRate,
      };
    } catch (error) {
      safeLogger.error('Error collecting performance metrics:', error);
      return {
        averageEventProcessingTime: 0,
        p95EventProcessingTime: 0,
        p99EventProcessingTime: 0,
        throughputEventsPerSecond: 0,
        errorRate: 0,
        cacheHitRate: 0,
      };
    }
  }

  // ========================================================================
  // HEALTH CHECKS
  // ========================================================================

  /**
   * Run a comprehensive health check
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const issues: string[] = [];
    const timestamp = new Date();

    // Check Redis
    const redisHealth = await this.checkRedisHealth();
    if (redisHealth.status !== 'healthy') {
      issues.push(`Redis: ${redisHealth.message}`);
    }

    // Check WebSocket
    const websocketHealth = await this.checkWebSocketHealth();
    if (websocketHealth.status !== 'healthy') {
      issues.push(`WebSocket: ${websocketHealth.message}`);
    }

    // Check Event Queue
    const eventQueueHealth = await this.checkEventQueueHealth();
    if (eventQueueHealth.status !== 'healthy') {
      issues.push(`Event Queue: ${eventQueueHealth.message}`);
    }

    // Check Aggregation Queue
    const aggQueueHealth = await this.checkAggregationQueueHealth();
    if (aggQueueHealth.status !== 'healthy') {
      issues.push(`Aggregation Queue: ${aggQueueHealth.message}`);
    }

    // Check Database (via Redis as proxy)
    const dbHealth = await this.checkDatabaseHealth();
    if (dbHealth.status !== 'healthy') {
      issues.push(`Database: ${dbHealth.message}`);
    }

    // Determine overall status
    const allComponents = [redisHealth, websocketHealth, eventQueueHealth, aggQueueHealth, dbHealth];
    const hasUnhealthy = allComponents.some(c => c.status === 'unhealthy');
    const hasDegraded = allComponents.some(c => c.status === 'degraded');

    const status: 'healthy' | 'degraded' | 'unhealthy' = hasUnhealthy
      ? 'unhealthy'
      : hasDegraded
        ? 'degraded'
        : 'healthy';

    const result: HealthCheckResult = {
      status,
      timestamp,
      components: {
        redis: redisHealth,
        websocket: websocketHealth,
        eventQueue: eventQueueHealth,
        aggregationQueue: aggQueueHealth,
        database: dbHealth,
      },
      issues,
    };

    this.lastHealthCheck = result;

    // Store health check result
    await redisService.set('pipeline:health:latest', result, 60);

    // Log warnings if not healthy
    if (status !== 'healthy') {
      safeLogger.warn('Pipeline health check issues:', { status, issues });
    }

    return result;
  }

  private async checkRedisHealth(): Promise<ComponentHealth> {
    try {
      const start = Date.now();
      await redisService.set('health:ping', 'pong', 10);
      const pingResult = await redisService.get('health:ping');
      const latency = Date.now() - start;

      if (pingResult !== 'pong') {
        return { status: 'unhealthy', latency, message: 'Redis ping failed' };
      }

      if (latency > 100) {
        return { status: 'degraded', latency, message: `High latency: ${latency}ms` };
      }

      return { status: 'healthy', latency };
    } catch (error) {
      return { status: 'unhealthy', message: `Redis error: ${error}` };
    }
  }

  private async checkWebSocketHealth(): Promise<ComponentHealth> {
    try {
      const adminWs = getAdminWebSocketService();
      if (!adminWs) {
        return { status: 'degraded', message: 'WebSocket service not initialized' };
      }

      const stats = adminWs.getAdminStats();
      return { status: 'healthy', message: `${stats.connectedAdmins} admins connected` };
    } catch (error) {
      return { status: 'unhealthy', message: `WebSocket error: ${error}` };
    }
  }

  private async checkEventQueueHealth(): Promise<ComponentHealth> {
    try {
      const counts = await returnEventQueue.getJobCounts('waiting', 'active', 'failed');
      const isPaused = await returnEventQueue.isPaused();

      if (isPaused) {
        return { status: 'unhealthy', message: 'Event queue is paused' };
      }

      if ((counts.failed || 0) > 100) {
        return { status: 'degraded', message: `High failed count: ${counts.failed}` };
      }

      if ((counts.waiting || 0) > 1000) {
        return { status: 'degraded', message: `High queue depth: ${counts.waiting}` };
      }

      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: `Queue error: ${error}` };
    }
  }

  private async checkAggregationQueueHealth(): Promise<ComponentHealth> {
    try {
      const counts = await returnAggregationQueue.getJobCounts('waiting', 'active', 'failed');
      const isPaused = await returnAggregationQueue.isPaused();

      if (isPaused) {
        return { status: 'unhealthy', message: 'Aggregation queue is paused' };
      }

      if ((counts.failed || 0) > 10) {
        return { status: 'degraded', message: `Failed aggregation jobs: ${counts.failed}` };
      }

      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: `Aggregation queue error: ${error}` };
    }
  }

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    // Use Redis as a proxy for database health
    // In a real implementation, you'd check the actual database
    try {
      const dbStatus = await redisService.get('db:health:status');
      if (dbStatus === 'unhealthy') {
        return { status: 'unhealthy', message: 'Database reported unhealthy' };
      }
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'degraded', message: 'Unable to verify database health' };
    }
  }

  // ========================================================================
  // ANOMALY DETECTION
  // ========================================================================

  private async checkForAnomalies(metrics: PipelineMetrics): Promise<void> {
    const issues: string[] = [];

    // Check queue depth
    if (metrics.queues.returnEventQueue.waiting > 500) {
      issues.push(`High event queue depth: ${metrics.queues.returnEventQueue.waiting}`);
    }

    // Check failed jobs
    if (metrics.queues.returnEventQueue.failed > 50) {
      issues.push(`High failed event jobs: ${metrics.queues.returnEventQueue.failed}`);
    }

    // Check error rate
    if (metrics.performance.errorRate > 0.05) {
      issues.push(`High error rate: ${(metrics.performance.errorRate * 100).toFixed(2)}%`);
    }

    // Check processing time
    if (metrics.performance.p95EventProcessingTime > 1000) {
      issues.push(`High p95 processing time: ${metrics.performance.p95EventProcessingTime}ms`);
    }

    // Generate alerts for critical issues
    if (issues.length > 0) {
      await this.generateMonitoringAlert(issues);
    }
  }

  private async generateMonitoringAlert(issues: string[]): Promise<void> {
    try {
      const adminWs = getAdminWebSocketService();
      if (adminWs) {
        adminWs.broadcastToAllAdmins('pipeline_monitoring_alert', {
          severity: 'warning',
          title: 'Return Pipeline Issues Detected',
          issues,
          timestamp: new Date().toISOString(),
        });
      }

      safeLogger.warn('Pipeline monitoring alert generated:', { issues });
    } catch (error) {
      safeLogger.error('Error generating monitoring alert:', error);
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private async storeMetricsInRedis(metrics: PipelineMetrics): Promise<void> {
    try {
      await redisService.set('pipeline:metrics:latest', metrics, 300); // 5 minutes TTL
    } catch (error) {
      safeLogger.error('Error storing metrics in Redis:', error);
    }
  }

  private async getAverageLatency(): Promise<number> {
    try {
      const latencyKey = 'pipeline:websocket:latency';
      const latencies = await redisService.get(latencyKey) as number[] | null;
      if (!latencies || latencies.length === 0) {
        return 0;
      }
      return latencies.reduce((a, b) => a + b, 0) / latencies.length;
    } catch {
      return 0;
    }
  }

  private async calculateErrorRate(): Promise<number> {
    try {
      const queueMetrics = await this.collectQueueMetrics();
      const total = queueMetrics.returnEventQueue.completed + queueMetrics.returnEventQueue.failed;
      if (total === 0) return 0;
      return queueMetrics.returnEventQueue.failed / total;
    } catch {
      return 0;
    }
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Record an event processing time
   */
  recordProcessingTime(timeMs: number): void {
    this.processingTimes.push(timeMs);
    if (this.processingTimes.length > this.MAX_PROCESSING_SAMPLES) {
      this.processingTimes.shift();
    }
  }

  /**
   * Record a message sent
   */
  recordMessageSent(): void {
    this.messagesSent++;
  }

  /**
   * Record a message received
   */
  recordMessageReceived(): void {
    this.messagesReceived++;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PipelineMetrics | null {
    return this.metricsHistory[this.metricsHistory.length - 1] || null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(minutes = 60): PipelineMetrics[] {
    return this.metricsHistory.slice(-minutes);
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  /**
   * Get a summary of pipeline status
   */
  async getPipelineStatus(): Promise<{
    health: HealthCheckResult | null;
    metrics: PipelineMetrics | null;
    summary: {
      status: string;
      queueDepth: number;
      processingRate: number;
      errorRate: number;
      connectedAdmins: number;
    };
  }> {
    const health = this.lastHealthCheck;
    const metrics = this.getCurrentMetrics();

    return {
      health,
      metrics,
      summary: {
        status: health?.status || 'unknown',
        queueDepth: metrics?.queues.returnEventQueue.waiting || 0,
        processingRate: metrics?.performance.throughputEventsPerSecond || 0,
        errorRate: metrics?.performance.errorRate || 0,
        connectedAdmins: metrics?.websocket.connectedAdmins || 0,
      },
    };
  }
}

// Export singleton instance
export const returnPipelineMonitoringService = new ReturnPipelineMonitoringService();
