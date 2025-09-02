import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';
import * as os from 'os';
import * as process from 'process';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // Duration in seconds the condition must be true
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // Cooldown period in seconds
  lastTriggered?: Date;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  severity: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

interface ApplicationMetrics {
  requests: {
    total: number;
    perSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictions: number;
  };
  blockchain: {
    transactionCount: number;
    gasUsage: number;
    failedTransactions: number;
  };
}

export class PerformanceMonitoringService extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private metricsRetentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
  private collectionInterval = 5000; // 5 seconds
  private intervalId?: NodeJS.Timeout;
  private performanceObserver?: PerformanceObserver;

  constructor() {
    super();
    this.setupPerformanceObserver();
    this.startMetricsCollection();
    this.setupDefaultAlertRules();
  }

  private setupPerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.recordMetric('performance', entry.duration, 'ms', {
          name: entry.name,
          type: entry.entryType,
        });
      });
    });

    this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  }

  private startMetricsCollection(): void {
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
      this.evaluateAlertRules();
      this.cleanupOldMetrics();
    }, this.collectionInterval);
  }

  // Record custom metrics
  recordMetric(name: string, value: number, unit: string = '', tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);
    this.emit('metricRecorded', metric);
  }

  // Collect system metrics
  private collectSystemMetrics(): void {
    const systemMetrics = this.getSystemMetrics();
    
    // CPU metrics
    this.recordMetric('system.cpu.usage', systemMetrics.cpu.usage, '%');
    this.recordMetric('system.cpu.loadAverage1m', systemMetrics.cpu.loadAverage[0], '');
    this.recordMetric('system.cpu.loadAverage5m', systemMetrics.cpu.loadAverage[1], '');
    this.recordMetric('system.cpu.loadAverage15m', systemMetrics.cpu.loadAverage[2], '');

    // Memory metrics
    this.recordMetric('system.memory.used', systemMetrics.memory.used, 'bytes');
    this.recordMetric('system.memory.free', systemMetrics.memory.free, 'bytes');
    this.recordMetric('system.memory.usage', systemMetrics.memory.usage, '%');

    // Process metrics
    const memUsage = process.memoryUsage();
    this.recordMetric('process.memory.rss', memUsage.rss, 'bytes');
    this.recordMetric('process.memory.heapUsed', memUsage.heapUsed, 'bytes');
    this.recordMetric('process.memory.heapTotal', memUsage.heapTotal, 'bytes');
    this.recordMetric('process.memory.external', memUsage.external, 'bytes');

    // Event loop lag
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
      this.recordMetric('process.eventLoopLag', lag, 'ms');
    });
  }

  private getSystemMetrics(): SystemMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpu: {
        usage: this.getCpuUsage(),
        loadAverage: os.loadavg(),
      },
      memory: {
        used: usedMem,
        free: freeMem,
        total: totalMem,
        usage: (usedMem / totalMem) * 100,
      },
      disk: {
        used: 0, // Would need additional library for disk metrics
        free: 0,
        total: 0,
        usage: 0,
      },
      network: {
        bytesIn: 0, // Would need additional library for network metrics
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0,
      },
    };
  }

  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (totalIdle / totalTick) * 100;
  }

  // Application-specific metrics
  recordRequestMetrics(responseTime: number, statusCode: number, endpoint: string): void {
    this.recordMetric('http.request.duration', responseTime, 'ms', {
      endpoint,
      status: statusCode.toString(),
    });

    this.recordMetric('http.request.count', 1, 'count', {
      endpoint,
      status: statusCode.toString(),
    });

    if (statusCode >= 400) {
      this.recordMetric('http.request.errors', 1, 'count', {
        endpoint,
        status: statusCode.toString(),
      });
    }
  }

  recordDatabaseMetrics(queryTime: number, operation: string, success: boolean): void {
    this.recordMetric('database.query.duration', queryTime, 'ms', {
      operation,
      success: success.toString(),
    });

    this.recordMetric('database.query.count', 1, 'count', {
      operation,
      success: success.toString(),
    });

    if (queryTime > 1000) { // Slow query threshold
      this.recordMetric('database.query.slow', 1, 'count', { operation });
    }
  }

  recordCacheMetrics(operation: 'hit' | 'miss' | 'set' | 'delete', key?: string): void {
    this.recordMetric(`cache.${operation}`, 1, 'count', key ? { key } : undefined);
  }

  recordBlockchainMetrics(transactionHash: string, gasUsed: number, success: boolean): void {
    this.recordMetric('blockchain.transaction.count', 1, 'count', {
      success: success.toString(),
    });

    this.recordMetric('blockchain.gas.used', gasUsed, 'gas', {
      transactionHash,
    });

    if (!success) {
      this.recordMetric('blockchain.transaction.failed', 1, 'count');
    }
  }

  // Alert management
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertRule: AlertRule = { ...rule, id };
    this.alertRules.set(id, alertRule);
    return id;
  }

  removeAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      this.alertRules.set(ruleId, { ...rule, ...updates });
      return true;
    }
    return false;
  }

  private setupDefaultAlertRules(): void {
    // High CPU usage
    this.addAlertRule({
      name: 'High CPU Usage',
      metric: 'system.cpu.usage',
      condition: 'gt',
      threshold: 80,
      duration: 300, // 5 minutes
      severity: 'high',
      enabled: true,
      cooldown: 600, // 10 minutes
    });

    // High memory usage
    this.addAlertRule({
      name: 'High Memory Usage',
      metric: 'system.memory.usage',
      condition: 'gt',
      threshold: 85,
      duration: 300,
      severity: 'high',
      enabled: true,
      cooldown: 600,
    });

    // High response time
    this.addAlertRule({
      name: 'High Response Time',
      metric: 'http.request.duration',
      condition: 'gt',
      threshold: 2000, // 2 seconds
      duration: 180, // 3 minutes
      severity: 'medium',
      enabled: true,
      cooldown: 300,
    });

    // High error rate
    this.addAlertRule({
      name: 'High Error Rate',
      metric: 'http.request.errors',
      condition: 'gt',
      threshold: 10, // 10 errors per collection interval
      duration: 120, // 2 minutes
      severity: 'critical',
      enabled: true,
      cooldown: 300,
    });

    // Event loop lag
    this.addAlertRule({
      name: 'High Event Loop Lag',
      metric: 'process.eventLoopLag',
      condition: 'gt',
      threshold: 100, // 100ms
      duration: 60,
      severity: 'medium',
      enabled: true,
      cooldown: 300,
    });
  }

  private evaluateAlertRules(): void {
    this.alertRules.forEach((rule) => {
      if (!rule.enabled) return;

      const metrics = this.getRecentMetrics(rule.metric, rule.duration * 1000);
      if (metrics.length === 0) return;

      const latestValue = metrics[metrics.length - 1].value;
      const shouldTrigger = this.evaluateCondition(latestValue, rule.condition, rule.threshold);

      if (shouldTrigger && this.canTriggerAlert(rule)) {
        this.triggerAlert(rule, latestValue);
      } else if (!shouldTrigger) {
        this.resolveAlert(rule.id);
      }
    });
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  private canTriggerAlert(rule: AlertRule): boolean {
    if (!rule.lastTriggered) return true;
    
    const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
    return timeSinceLastTrigger >= rule.cooldown * 1000;
  }

  private triggerAlert(rule: AlertRule, value: number): void {
    const alertId = `${rule.id}_${Date.now()}`;
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      severity: rule.severity,
      message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
      timestamp: new Date(),
      resolved: false,
    };

    this.activeAlerts.set(rule.id, alert);
    rule.lastTriggered = new Date();
    
    this.emit('alertTriggered', alert);
    console.warn(`ALERT: ${alert.message}`);
  }

  private resolveAlert(ruleId: string): void {
    const alert = this.activeAlerts.get(ruleId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      this.emit('alertResolved', alert);
      console.info(`RESOLVED: ${alert.message}`);
    }
  }

  // Data retrieval methods
  getMetrics(name: string, startTime?: Date, endTime?: Date): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];
    
    if (!startTime && !endTime) {
      return metrics;
    }

    return metrics.filter(metric => {
      const time = metric.timestamp.getTime();
      const start = startTime?.getTime() || 0;
      const end = endTime?.getTime() || Date.now();
      return time >= start && time <= end;
    });
  }

  private getRecentMetrics(name: string, durationMs: number): PerformanceMetric[] {
    const cutoff = new Date(Date.now() - durationMs);
    return this.getMetrics(name, cutoff);
  }

  getAggregatedMetrics(name: string, interval: number = 60000): Array<{
    timestamp: Date;
    avg: number;
    min: number;
    max: number;
    count: number;
  }> {
    const metrics = this.getMetrics(name);
    const buckets = new Map<number, PerformanceMetric[]>();

    // Group metrics into time buckets
    metrics.forEach(metric => {
      const bucketTime = Math.floor(metric.timestamp.getTime() / interval) * interval;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      buckets.get(bucketTime)!.push(metric);
    });

    // Calculate aggregations for each bucket
    return Array.from(buckets.entries()).map(([bucketTime, bucketMetrics]) => {
      const values = bucketMetrics.map(m => m.value);
      return {
        timestamp: new Date(bucketTime),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  getAllAlerts(limit: number = 100): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  // Performance analysis
  getPerformanceSummary(): {
    system: SystemMetrics;
    application: ApplicationMetrics;
    alerts: { active: number; total: number };
  } {
    const systemMetrics = this.getSystemMetrics();
    const applicationMetrics = this.calculateApplicationMetrics();
    const activeAlerts = this.getActiveAlerts();

    return {
      system: systemMetrics,
      application: applicationMetrics,
      alerts: {
        active: activeAlerts.length,
        total: this.activeAlerts.size,
      },
    };
  }

  private calculateApplicationMetrics(): ApplicationMetrics {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    // HTTP metrics
    const requestMetrics = this.getMetrics('http.request.count', oneMinuteAgo);
    const responseTimeMetrics = this.getMetrics('http.request.duration', oneMinuteAgo);
    const errorMetrics = this.getMetrics('http.request.errors', oneMinuteAgo);

    // Database metrics
    const dbQueryMetrics = this.getMetrics('database.query.duration', oneMinuteAgo);
    const slowQueryMetrics = this.getMetrics('database.query.slow', oneMinuteAgo);

    // Cache metrics
    const cacheHits = this.getMetrics('cache.hit', oneMinuteAgo);
    const cacheMisses = this.getMetrics('cache.miss', oneMinuteAgo);

    // Blockchain metrics
    const blockchainTxMetrics = this.getMetrics('blockchain.transaction.count', oneMinuteAgo);
    const gasMetrics = this.getMetrics('blockchain.gas.used', oneMinuteAgo);
    const failedTxMetrics = this.getMetrics('blockchain.transaction.failed', oneMinuteAgo);

    return {
      requests: {
        total: requestMetrics.length,
        perSecond: requestMetrics.length / 60,
        averageResponseTime: responseTimeMetrics.length > 0
          ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
          : 0,
        errorRate: requestMetrics.length > 0 ? errorMetrics.length / requestMetrics.length : 0,
      },
      database: {
        connections: 0, // Would need to track this separately
        queryTime: dbQueryMetrics.length > 0
          ? dbQueryMetrics.reduce((sum, m) => sum + m.value, 0) / dbQueryMetrics.length
          : 0,
        slowQueries: slowQueryMetrics.length,
      },
      cache: {
        hitRate: (cacheHits.length + cacheMisses.length) > 0
          ? cacheHits.length / (cacheHits.length + cacheMisses.length)
          : 0,
        missRate: (cacheHits.length + cacheMisses.length) > 0
          ? cacheMisses.length / (cacheHits.length + cacheMisses.length)
          : 0,
        evictions: 0, // Would need to track this separately
      },
      blockchain: {
        transactionCount: blockchainTxMetrics.length,
        gasUsage: gasMetrics.reduce((sum, m) => sum + m.value, 0),
        failedTransactions: failedTxMetrics.length,
      },
    };
  }

  // Cleanup old metrics
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.metricsRetentionPeriod);
    
    this.metrics.forEach((metricArray, name) => {
      const filtered = metricArray.filter(metric => metric.timestamp > cutoff);
      this.metrics.set(name, filtered);
    });
  }

  // Export metrics for external monitoring systems
  exportMetrics(format: 'prometheus' | 'json' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusFormat();
    }
    
    const allMetrics: Record<string, PerformanceMetric[]> = {};
    this.metrics.forEach((metrics, name) => {
      allMetrics[name] = metrics;
    });
    
    return JSON.stringify(allMetrics, null, 2);
  }

  private exportPrometheusFormat(): string {
    let output = '';
    
    this.metrics.forEach((metrics, name) => {
      if (metrics.length === 0) return;
      
      const latest = metrics[metrics.length - 1];
      const metricName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      
      output += `# HELP ${metricName} ${name}\n`;
      output += `# TYPE ${metricName} gauge\n`;
      
      if (latest.tags) {
        const labels = Object.entries(latest.tags)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        output += `${metricName}{${labels}} ${latest.value}\n`;
      } else {
        output += `${metricName} ${latest.value}\n`;
      }
    });
    
    return output;
  }

  // Cleanup
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.removeAllListeners();
  }
}