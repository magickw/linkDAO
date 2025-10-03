import express, { Request, Response } from 'express';
import { getRedisManager } from '../config/redis-production';
import { getLoadBalancerManager } from '../config/load-balancer';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

interface HealthMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  database: {
    status: 'healthy' | 'unhealthy' | 'degraded';
    latency: number;
    connections: number;
    error?: string;
  };
  redis: {
    status: 'healthy' | 'unhealthy' | 'disconnected';
    latency: number;
    memory: string;
    connections: number;
    error?: string;
  };
  loadBalancer?: {
    status: 'active' | 'inactive';
    healthyServers: number;
    totalServers: number;
    totalConnections: number;
  };
  api: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    activeConnections: number;
  };
}

interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: HealthMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number; // minutes
  lastTriggered?: Date;
}

class HealthMonitoringService {
  private metrics: HealthMetrics[] = [];
  private maxMetricsHistory = 1000;
  private alertRules: AlertRule[] = [];
  private apiMetrics = {
    totalRequests: 0,
    totalErrors: 0,
    responseTimes: [] as number[],
    activeConnections: 0
  };

  constructor() {
    this.initializeAlertRules();
    this.startMetricsCollection();
  }

  private initializeAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        condition: (metrics) => metrics.memory.percentage > 85,
        severity: 'high',
        message: 'Memory usage is above 85%',
        cooldown: 15
      },
      {
        id: 'database-unhealthy',
        name: 'Database Unhealthy',
        condition: (metrics) => metrics.database.status === 'unhealthy',
        severity: 'critical',
        message: 'Database connection is unhealthy',
        cooldown: 5
      },
      {
        id: 'redis-disconnected',
        name: 'Redis Disconnected',
        condition: (metrics) => metrics.redis.status === 'disconnected',
        severity: 'high',
        message: 'Redis connection is lost',
        cooldown: 10
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: (metrics) => metrics.api.errorRate > 10,
        severity: 'high',
        message: 'API error rate is above 10%',
        cooldown: 10
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        condition: (metrics) => metrics.api.averageResponseTime > 2000,
        severity: 'medium',
        message: 'Average response time is above 2 seconds',
        cooldown: 15
      },
      {
        id: 'no-healthy-servers',
        name: 'No Healthy Load Balancer Servers',
        condition: (metrics) => metrics.loadBalancer?.healthyServers === 0,
        severity: 'critical',
        message: 'All load balancer servers are unhealthy',
        cooldown: 5
      }
    ];
  }

  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.storeMetrics(metrics);
        await this.checkAlerts(metrics);
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, 30000);

    console.log('📊 Health monitoring started');
  }

  private async collectMetrics(): Promise<HealthMetrics> {
    const timestamp = new Date().toISOString();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp,
      uptime: process.uptime(),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      database: await this.checkDatabaseHealth(),
      redis: await this.checkRedisHealth(),
      loadBalancer: await this.checkLoadBalancerHealth(),
      api: this.getAPIMetrics()
    };
  }

  private async checkDatabaseHealth(): Promise<HealthMetrics['database']> {
    try {
      const connectionString = process.env.DATABASE_URL!;
      const client = postgres(connectionString, { prepare: false, max: 1 });
      
      const start = Date.now();
      await client`SELECT 1`;
      const latency = Date.now() - start;
      
      // Get connection count (simplified)
      const connections = 1; // This would be more complex in a real implementation
      
      await client.end();
      
      return {
        status: 'healthy',
        latency,
        connections
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: 0,
        connections: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkRedisHealth(): Promise<HealthMetrics['redis']> {
    try {
      const redisManager = getRedisManager();
      const healthCheck = await redisManager.healthCheck();
      
      if (healthCheck.status === 'healthy') {
        const info = await redisManager.getInfo();
        return {
          status: 'healthy',
          latency: healthCheck.latency || 0,
          memory: info.memory?.used_memory_human || 'unknown',
          connections: parseInt(info.stats?.connected_clients || '0')
        };
      } else {
        return {
          status: 'unhealthy',
          latency: 0,
          memory: 'unknown',
          connections: 0,
          error: healthCheck.error
        };
      }
    } catch (error) {
      return {
        status: 'disconnected',
        latency: 0,
        memory: 'unknown',
        connections: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkLoadBalancerHealth(): Promise<HealthMetrics['loadBalancer'] | undefined> {
    if (process.env.LB_ENABLED !== 'true') {
      return undefined;
    }

    try {
      const loadBalancer = getLoadBalancerManager();
      const status = loadBalancer.getStatus();
      
      return {
        status: 'active',
        healthyServers: status.healthyServers,
        totalServers: status.totalServers,
        totalConnections: status.totalConnections
      };
    } catch (error) {
      return {
        status: 'inactive',
        healthyServers: 0,
        totalServers: 0,
        totalConnections: 0
      };
    }
  }

  private getAPIMetrics(): HealthMetrics['api'] {
    const errorRate = this.apiMetrics.totalRequests > 0 
      ? (this.apiMetrics.totalErrors / this.apiMetrics.totalRequests) * 100 
      : 0;

    const averageResponseTime = this.apiMetrics.responseTimes.length > 0
      ? this.apiMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.apiMetrics.responseTimes.length
      : 0;

    return {
      totalRequests: this.apiMetrics.totalRequests,
      errorRate,
      averageResponseTime,
      activeConnections: this.apiMetrics.activeConnections
    };
  }

  private storeMetrics(metrics: HealthMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  private async checkAlerts(metrics: HealthMetrics): Promise<void> {
    const now = new Date();
    
    for (const rule of this.alertRules) {
      // Check cooldown
      if (rule.lastTriggered) {
        const timeSinceLastTrigger = now.getTime() - rule.lastTriggered.getTime();
        const cooldownMs = rule.cooldown * 60 * 1000;
        
        if (timeSinceLastTrigger < cooldownMs) {
          continue; // Still in cooldown
        }
      }

      // Check condition
      if (rule.condition(metrics)) {
        rule.lastTriggered = now;
        await this.triggerAlert(rule, metrics);
      }
    }
  }

  private async triggerAlert(rule: AlertRule, metrics: HealthMetrics): Promise<void> {
    const alert = {
      id: `alert_${Date.now()}`,
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: new Date().toISOString(),
      metrics: {
        memory: metrics.memory.percentage,
        database: metrics.database.status,
        redis: metrics.redis.status,
        errorRate: metrics.api.errorRate,
        responseTime: metrics.api.averageResponseTime
      }
    };

    console.error(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${rule.name} - ${rule.message}`);
    
    // Send to external alerting systems
    await this.sendToAlertingServices(alert);
  }

  private async sendToAlertingServices(alert: any): Promise<void> {
    // Send to Slack, PagerDuty, email, etc.
    // This is a placeholder for actual alerting integrations
    
    try {
      // Example: Send to webhook
      if (process.env.ALERT_WEBHOOK_URL) {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      }

      // Example: Log to file
      console.log(`ALERT: ${JSON.stringify(alert)}`);
      
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  // API methods for dashboard
  getCurrentMetrics(): HealthMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(minutes: number = 60): HealthMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.metrics.filter(m => new Date(m.timestamp) > cutoff);
  }

  getActiveAlerts(): AlertRule[] {
    const now = new Date();
    return this.alertRules.filter(rule => {
      if (!rule.lastTriggered) return false;
      const timeSince = now.getTime() - rule.lastTriggered.getTime();
      return timeSince < (rule.cooldown * 60 * 1000);
    });
  }

  // Middleware for tracking API metrics
  trackingMiddleware() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const start = Date.now();
      this.apiMetrics.totalRequests++;
      this.apiMetrics.activeConnections++;

      res.on('finish', () => {
        const responseTime = Date.now() - start;
        this.apiMetrics.responseTimes.push(responseTime);
        
        // Keep only last 1000 response times
        if (this.apiMetrics.responseTimes.length > 1000) {
          this.apiMetrics.responseTimes = this.apiMetrics.responseTimes.slice(-1000);
        }

        if (res.statusCode >= 400) {
          this.apiMetrics.totalErrors++;
        }

        this.apiMetrics.activeConnections--;
      });

      next();
    };
  }

  // Dashboard routes
  setupDashboardRoutes(app: express.Application): void {
    // Current health status
    app.get('/monitoring/health', (req: Request, res: Response) => {
      const currentMetrics = this.getCurrentMetrics();
      const activeAlerts = this.getActiveAlerts();
      
      res.json({
        status: currentMetrics ? 'active' : 'inactive',
        metrics: currentMetrics,
        alerts: activeAlerts,
        timestamp: new Date().toISOString()
      });
    });

    // Metrics history
    app.get('/monitoring/metrics', (req: Request, res: Response) => {
      const minutes = parseInt(req.query.minutes as string) || 60;
      const history = this.getMetricsHistory(minutes);
      
      res.json({
        timeRange: `${minutes} minutes`,
        dataPoints: history.length,
        metrics: history
      });
    });

    // Dashboard HTML
    app.get('/monitoring/dashboard', (req: Request, res: Response) => {
      res.send(this.generateDashboardHTML());
    });
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marketplace API - Health Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #2c3e50; }
        .metric-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .healthy { color: #27ae60; }
        .warning { color: #f39c12; }
        .error { color: #e74c3c; }
        .alerts { background: #e74c3c; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .alert-item { margin-bottom: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 4px; }
        .refresh-btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #2980b9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Marketplace API Health Dashboard</h1>
            <p>Real-time monitoring and alerting system</p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        </div>
        
        <div id="alerts"></div>
        <div id="metrics" class="metrics-grid"></div>
    </div>

    <script>
        async function loadDashboard() {
            try {
                const response = await fetch('/monitoring/health');
                const data = await response.json();
                
                updateAlerts(data.alerts);
                updateMetrics(data.metrics);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            }
        }

        function updateAlerts(alerts) {
            const alertsDiv = document.getElementById('alerts');
            if (alerts && alerts.length > 0) {
                alertsDiv.innerHTML = '<h2>🚨 Active Alerts</h2>' + 
                    alerts.map(alert => 
                        '<div class="alert-item">' +
                        '<strong>' + alert.name + '</strong> (' + alert.severity + ')<br>' +
                        alert.message +
                        '</div>'
                    ).join('');
                alertsDiv.className = 'alerts';
                alertsDiv.style.display = 'block';
            } else {
                alertsDiv.style.display = 'none';
            }
        }

        function updateMetrics(metrics) {
            if (!metrics) return;
            
            const metricsDiv = document.getElementById('metrics');
            metricsDiv.innerHTML = [
                createMetricCard('Memory Usage', 
                    Math.round(metrics.memory.percentage) + '%',
                    metrics.memory.percentage > 85 ? 'error' : metrics.memory.percentage > 70 ? 'warning' : 'healthy'
                ),
                createMetricCard('Database', 
                    metrics.database.status + ' (' + metrics.database.latency + 'ms)',
                    metrics.database.status === 'healthy' ? 'healthy' : 'error'
                ),
                createMetricCard('Redis', 
                    metrics.redis.status + ' (' + metrics.redis.latency + 'ms)',
                    metrics.redis.status === 'healthy' ? 'healthy' : 'error'
                ),
                createMetricCard('API Error Rate', 
                    Math.round(metrics.api.errorRate * 100) / 100 + '%',
                    metrics.api.errorRate > 10 ? 'error' : metrics.api.errorRate > 5 ? 'warning' : 'healthy'
                ),
                createMetricCard('Response Time', 
                    Math.round(metrics.api.averageResponseTime) + 'ms',
                    metrics.api.averageResponseTime > 2000 ? 'error' : metrics.api.averageResponseTime > 1000 ? 'warning' : 'healthy'
                ),
                createMetricCard('Uptime', 
                    Math.round(metrics.uptime / 3600) + ' hours',
                    'healthy'
                )
            ].join('');
        }

        function createMetricCard(title, value, status) {
            return '<div class="metric-card">' +
                '<div class="metric-title">' + title + '</div>' +
                '<div class="metric-value ' + status + '">' + value + '</div>' +
                '</div>';
        }

        // Load dashboard on page load
        loadDashboard();
        
        // Auto-refresh every 30 seconds
        setInterval(loadDashboard, 30000);
    </script>
</body>
</html>`;
  }
}

// Singleton instance
let healthMonitoringService: HealthMonitoringService | null = null;

export function getHealthMonitoringService(): HealthMonitoringService {
  if (!healthMonitoringService) {
    healthMonitoringService = new HealthMonitoringService();
  }
  return healthMonitoringService;
}

export { HealthMonitoringService, HealthMetrics, AlertRule };