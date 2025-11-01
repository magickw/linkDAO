import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { getHealthMonitoringService } from './health-dashboard';
import { safeLogger } from '../utils/safeLogger';
import { getLogAggregationService } from './log-aggregation';
import { safeLogger } from '../utils/safeLogger';
import { getErrorTrackingService } from './error-tracking';
import { safeLogger } from '../utils/safeLogger';
import { getDeploymentAutomationService } from './deployment-automation';
import { safeLogger } from '../utils/safeLogger';

interface MonitoringIntegrationConfig {
  dashboardEnabled: boolean;
  apiEnabled: boolean;
  webhooksEnabled: boolean;
  metricsRetention: number; // days
}

class MonitoringIntegrationService {
  private config: MonitoringIntegrationConfig;
  private healthService = getHealthMonitoringService();
  private logService = getLogAggregationService();
  private errorService = getErrorTrackingService();
  private deploymentService = getDeploymentAutomationService();

  constructor() {
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): MonitoringIntegrationConfig {
    return {
      dashboardEnabled: process.env.MONITORING_DASHBOARD_ENABLED !== 'false',
      apiEnabled: process.env.MONITORING_API_ENABLED !== 'false',
      webhooksEnabled: process.env.MONITORING_WEBHOOKS_ENABLED === 'true',
      metricsRetention: parseInt(process.env.METRICS_RETENTION_DAYS || '30')
    };
  }

  setupMonitoringRoutes(app: express.Application): void {
    if (!this.config.apiEnabled) {
      return;
    }

    // Health monitoring routes
    this.healthService.setupDashboardRoutes(app);

    // Error tracking routes
    this.setupErrorTrackingRoutes(app);

    // Deployment routes
    this.setupDeploymentRoutes(app);

    // Log aggregation routes
    this.setupLogRoutes(app);

    // Combined monitoring dashboard
    if (this.config.dashboardEnabled) {
      this.setupCombinedDashboard(app);
    }

    // Webhook endpoints
    if (this.config.webhooksEnabled) {
      this.setupWebhookRoutes(app);
    }

    safeLogger.info('📊 Monitoring integration routes configured');
  }

  private setupErrorTrackingRoutes(app: express.Application): void {
    // Get tracked errors
    app.get('/monitoring/errors', (req, res) => {
      const { severity, status, limit, offset } = req.query;
      
      const errors = this.errorService.getTrackedErrors({
        severity: severity as any,
        status: status as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });

      res.json({
        errors,
        stats: this.errorService.getErrorStats()
      });
    });

    // Get specific error
    app.get('/monitoring/errors/:id', (req, res) => {
      const error = this.errorService.getErrorById(req.params.id);
      
      if (!error) {
        return res.status(404).json({ error: 'Error not found' });
      }

      res.json(error);
    });

    // Update error status
    app.patch('/monitoring/errors/:id', (req, res) => {
      const { status } = req.body;
      const success = this.errorService.updateErrorStatus(req.params.id, status);
      
      if (!success) {
        return res.status(404).json({ error: 'Error not found' });
      }

      res.json({ success: true });
    });

    // Error statistics
    app.get('/monitoring/errors/stats', (req, res) => {
      const stats = this.errorService.getErrorStats();
      res.json(stats);
    });
  }

  private setupDeploymentRoutes(app: express.Application): void {
    // Get all deployments
    app.get('/monitoring/deployments', (req, res) => {
      const deployments = this.deploymentService.getAllDeployments();
      res.json(deployments);
    });

    // Get specific deployment
    app.get('/monitoring/deployments/:id', (req, res) => {
      const deployment = this.deploymentService.getDeploymentStatus(req.params.id);
      
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      res.json(deployment);
    });

    // Start new deployment
    app.post('/monitoring/deployments', async (req, res) => {
      try {
        const { version } = req.body;
        const deploymentId = await this.deploymentService.deployApplication(version);
        
        res.json({ deploymentId, status: 'started' });
      } catch (error) {
        res.status(500).json({ 
          error: 'Deployment failed', 
          message: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    // Rollback deployment
    app.post('/monitoring/deployments/:id/rollback', async (req, res) => {
      try {
        await this.deploymentService.rollbackDeployment(req.params.id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ 
          error: 'Rollback failed', 
          message: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    // Cancel deployment
    app.post('/monitoring/deployments/:id/cancel', async (req, res) => {
      try {
        await this.deploymentService.cancelDeployment(req.params.id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ 
          error: 'Cancel failed', 
          message: error instanceof Error ? error.message : String(error) 
        });
      }
    });
  }

  private setupLogRoutes(app: express.Application): void {
    // Query logs
    app.get('/monitoring/logs', async (req, res) => {
      try {
        const { service, level, startTime, endTime, limit } = req.query;
        
        const options: any = {};
        if (service) options.service = service as string;
        if (level) options.level = level as string;
        if (startTime) options.startTime = new Date(startTime as string);
        if (endTime) options.endTime = new Date(endTime as string);
        if (limit) options.limit = parseInt(limit as string);

        const logs = await this.logService.queryLogs(options);
        res.json({ logs, count: logs.length });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to query logs', 
          message: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    // Log levels endpoint
    app.get('/monitoring/logs/levels', (req, res) => {
      res.json(['debug', 'info', 'warn', 'error', 'fatal']);
    });
  }

  private setupCombinedDashboard(app: express.Application): void {
    app.get('/monitoring', (req, res) => {
      res.send(this.generateCombinedDashboardHTML());
    });

    // Combined status API
    app.get('/monitoring/status', async (req, res) => {
      try {
        const healthMetrics = this.healthService.getCurrentMetrics();
        const errorStats = this.errorService.getErrorStats();
        const deployments = this.deploymentService.getAllDeployments().slice(0, 5);
        const activeAlerts = this.healthService.getActiveAlerts();

        res.json({
          timestamp: new Date().toISOString(),
          health: healthMetrics,
          errors: errorStats,
          deployments: deployments.map(d => ({
            id: d.id,
            status: d.status,
            version: d.version,
            startTime: d.startTime,
            endTime: d.endTime
          })),
          alerts: activeAlerts.map(a => ({
            id: a.id,
            name: a.name,
            severity: a.severity,
            lastTriggered: a.lastTriggered
          }))
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to get monitoring status', 
          message: error instanceof Error ? error.message : String(error) 
        });
      }
    });
  }

  private setupWebhookRoutes(app: express.Application): void {
    // Generic webhook endpoint for external integrations
    app.post('/monitoring/webhooks/:service', async (req, res) => {
      const service = req.params.service;
      const payload = req.body;

      try {
        await this.handleWebhook(service, payload);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ 
          error: 'Webhook processing failed', 
          message: error instanceof Error ? error.message : String(error) 
        });
      }
    });
  }

  private async handleWebhook(service: string, payload: any): Promise<void> {
    await this.logService.info(
      `Webhook received from ${service}`,
      'monitoring-webhook',
      { service, payload }
    );

    // Handle different webhook services
    switch (service) {
      case 'github':
        await this.handleGitHubWebhook(payload);
        break;
      case 'docker':
        await this.handleDockerWebhook(payload);
        break;
      case 'alertmanager':
        await this.handleAlertManagerWebhook(payload);
        break;
      default:
        safeLogger.warn(`Unknown webhook service: ${service}`);
    }
  }

  private async handleGitHubWebhook(payload: any): Promise<void> {
    if (payload.ref === 'refs/heads/main' && payload.commits?.length > 0) {
      // Auto-deploy on main branch push
      const latestCommit = payload.commits[payload.commits.length - 1];
      
      await this.logService.info(
        `Auto-deploying commit ${latestCommit.id}`,
        'github-webhook',
        { commit: latestCommit }
      );

      // Trigger deployment
      try {
        await this.deploymentService.deployApplication(latestCommit.id);
      } catch (error) {
        await this.logService.error(
          'Auto-deployment failed',
          'github-webhook',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  private async handleDockerWebhook(payload: any): Promise<void> {
    // Handle Docker registry webhooks
    if (payload.action === 'push') {
      await this.logService.info(
        `Docker image pushed: ${payload.target?.repository}:${payload.target?.tag}`,
        'docker-webhook',
        payload
      );
    }
  }

  private async handleAlertManagerWebhook(payload: any): Promise<void> {
    // Handle Prometheus AlertManager webhooks
    if (payload.alerts) {
      for (const alert of payload.alerts) {
        await this.logService.warn(
          `External alert: ${alert.labels?.alertname}`,
          'alertmanager-webhook',
          { alert }
        );
      }
    }
  }

  private generateCombinedDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marketplace API - Monitoring Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e9ecef; }
        .card h3 { color: #495057; margin-bottom: 20px; font-size: 1.3rem; }
        .metric { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f3f4; }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: #6c757d; font-weight: 500; }
        .metric-value { font-weight: 600; font-size: 1.1rem; }
        .status-healthy { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-error { color: #dc3545; }
        .alert { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545; }
        .deployment { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #007bff; }
        .deployment-success { border-left-color: #28a745; }
        .deployment-failed { border-left-color: #dc3545; }
        .refresh-btn { background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 1rem; transition: background 0.2s; }
        .refresh-btn:hover { background: #0056b3; }
        .loading { text-align: center; padding: 40px; color: #6c757d; }
        .timestamp { color: #6c757d; font-size: 0.9rem; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Marketplace API Monitoring</h1>
            <p>Comprehensive monitoring dashboard for health, errors, deployments, and logs</p>
            <button class="refresh-btn" onclick="loadDashboard()" style="margin-top: 15px;">🔄 Refresh Data</button>
        </div>
        
        <div id="alerts"></div>
        
        <div class="grid">
            <div class="card">
                <h3>🏥 System Health</h3>
                <div id="health-metrics">
                    <div class="loading">Loading health metrics...</div>
                </div>
            </div>
            
            <div class="card">
                <h3>🐛 Error Tracking</h3>
                <div id="error-stats">
                    <div class="loading">Loading error statistics...</div>
                </div>
            </div>
            
            <div class="card">
                <h3>🚀 Recent Deployments</h3>
                <div id="deployments">
                    <div class="loading">Loading deployment history...</div>
                </div>
            </div>
            
            <div class="card">
                <h3>📊 System Overview</h3>
                <div id="system-overview">
                    <div class="loading">Loading system overview...</div>
                </div>
            </div>
        </div>
        
        <div class="timestamp" id="last-updated"></div>
    </div>

    <script>
        async function loadDashboard() {
            try {
                const response = await fetch('/monitoring/status');
                const data = await response.json();
                
                updateAlerts(data.alerts);
                updateHealthMetrics(data.health);
                updateErrorStats(data.errors);
                updateDeployments(data.deployments);
                updateSystemOverview(data);
                updateTimestamp(data.timestamp);
                
            } catch (error) {
                safeLogger.error('Failed to load dashboard:', error);
                showError('Failed to load monitoring data');
            }
        }

        function updateAlerts(alerts) {
            const alertsDiv = document.getElementById('alerts');
            if (alerts && alerts.length > 0) {
                alertsDiv.innerHTML = alerts.map(alert => 
                    '<div class="alert">' +
                    '<strong>🚨 ' + alert.name + '</strong> (' + alert.severity + ')<br>' +
                    'Last triggered: ' + new Date(alert.lastTriggered).toLocaleString() +
                    '</div>'
                ).join('');
            } else {
                alertsDiv.innerHTML = '';
            }
        }

        function updateHealthMetrics(health) {
            const healthDiv = document.getElementById('health-metrics');
            if (!health) {
                healthDiv.innerHTML = '<div class="metric"><span>No health data available</span></div>';
                return;
            }

            healthDiv.innerHTML = [
                createMetric('Memory Usage', Math.round(health.memory.percentage) + '%', 
                    health.memory.percentage > 85 ? 'error' : health.memory.percentage > 70 ? 'warning' : 'healthy'),
                createMetric('Database', health.database.status + ' (' + health.database.latency + 'ms)',
                    health.database.status === 'healthy' ? 'healthy' : 'error'),
                createMetric('Redis', health.redis.status + ' (' + health.redis.latency + 'ms)',
                    health.redis.status === 'healthy' ? 'healthy' : 'error'),
                createMetric('API Error Rate', Math.round(health.api.errorRate * 100) / 100 + '%',
                    health.api.errorRate > 10 ? 'error' : health.api.errorRate > 5 ? 'warning' : 'healthy'),
                createMetric('Response Time', Math.round(health.api.averageResponseTime) + 'ms',
                    health.api.averageResponseTime > 2000 ? 'error' : health.api.averageResponseTime > 1000 ? 'warning' : 'healthy')
            ].join('');
        }

        function updateErrorStats(errors) {
            const errorsDiv = document.getElementById('error-stats');
            if (!errors) {
                errorsDiv.innerHTML = '<div class="metric"><span>No error data available</span></div>';
                return;
            }

            errorsDiv.innerHTML = [
                createMetric('Total Errors', errors.total),
                createMetric('Critical', errors.bySeverity.critical, errors.bySeverity.critical > 0 ? 'error' : 'healthy'),
                createMetric('High', errors.bySeverity.high, errors.bySeverity.high > 0 ? 'warning' : 'healthy'),
                createMetric('Recent (1h)', errors.recentErrors, errors.recentErrors > 10 ? 'error' : errors.recentErrors > 5 ? 'warning' : 'healthy'),
                createMetric('New', errors.byStatus.new, errors.byStatus.new > 0 ? 'warning' : 'healthy')
            ].join('');
        }

        function updateDeployments(deployments) {
            const deploymentsDiv = document.getElementById('deployments');
            if (!deployments || deployments.length === 0) {
                deploymentsDiv.innerHTML = '<div class="metric"><span>No recent deployments</span></div>';
                return;
            }

            deploymentsDiv.innerHTML = deployments.map(deployment => {
                const statusClass = deployment.status === 'success' ? 'deployment-success' : 
                                  deployment.status === 'failed' ? 'deployment-failed' : '';
                const duration = deployment.endTime ? 
                    Math.round((new Date(deployment.endTime) - new Date(deployment.startTime)) / 1000) + 's' : 
                    'Running...';
                
                return '<div class="deployment ' + statusClass + '">' +
                       '<strong>' + deployment.id + '</strong><br>' +
                       'Status: ' + deployment.status + ' | Version: ' + deployment.version + '<br>' +
                       'Duration: ' + duration + ' | Started: ' + new Date(deployment.startTime).toLocaleString() +
                       '</div>';
            }).join('');
        }

        function updateSystemOverview(data) {
            const overviewDiv = document.getElementById('system-overview');
            const uptime = data.health ? Math.round(data.health.uptime / 3600) + ' hours' : 'Unknown';
            const totalRequests = data.health ? data.health.api.totalRequests : 0;
            const activeConnections = data.health ? data.health.api.activeConnections : 0;

            overviewDiv.innerHTML = [
                createMetric('Uptime', uptime),
                createMetric('Total Requests', totalRequests.toLocaleString()),
                createMetric('Active Connections', activeConnections),
                createMetric('Environment', 'Production'),
                createMetric('Last Updated', new Date().toLocaleTimeString())
            ].join('');
        }

        function createMetric(label, value, status = '') {
            const statusClass = status ? 'status-' + status : '';
            return '<div class="metric">' +
                   '<span class="metric-label">' + label + '</span>' +
                   '<span class="metric-value ' + statusClass + '">' + value + '</span>' +
                   '</div>';
        }

        function updateTimestamp(timestamp) {
            document.getElementById('last-updated').textContent = 
                'Last updated: ' + new Date(timestamp).toLocaleString();
        }

        function showError(message) {
            document.getElementById('alerts').innerHTML = 
                '<div class="alert"><strong>Error:</strong> ' + message + '</div>';
        }

        // Load dashboard on page load
        loadDashboard();
        
        // Auto-refresh every 30 seconds
        setInterval(loadDashboard, 30000);
    </script>
</body>
</html>`;
  }

  // Middleware setup
  setupMiddleware(app: express.Application): void {
    // Request logging middleware
    app.use(this.logService.requestLoggingMiddleware());

    // Health monitoring middleware
    app.use(this.healthService.trackingMiddleware());

    // Error tracking middleware (should be last)
    app.use(this.errorService.errorTrackingMiddleware());
  }

  async shutdown(): Promise<void> {
    safeLogger.info('🛑 Shutting down monitoring integration...');
    
    await this.logService.shutdown();
    
    safeLogger.info('✅ Monitoring integration shutdown complete');
  }
}

// Singleton instance
let monitoringIntegrationService: MonitoringIntegrationService | null = null;

export function getMonitoringIntegrationService(): MonitoringIntegrationService {
  if (!monitoringIntegrationService) {
    monitoringIntegrationService = new MonitoringIntegrationService();
  }
  return monitoringIntegrationService;
}

export { MonitoringIntegrationService };