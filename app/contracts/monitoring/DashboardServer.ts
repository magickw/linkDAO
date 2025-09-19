import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { ContractMonitor, ContractMetrics } from './ContractMonitor';
import { AlertingSystem } from './AlertingSystem';

export class DashboardServer {
  private app: express.Application;
  private server: any;
  private io: Server;
  private contractMonitor: ContractMonitor;
  private alertingSystem: AlertingSystem;
  private port: number;

  constructor(
    contractMonitor: ContractMonitor,
    alertingSystem: AlertingSystem,
    port: number = 3001
  ) {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.contractMonitor = contractMonitor;
    this.alertingSystem = alertingSystem;
    this.port = port;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupEventListeners();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Get all contract metrics
    this.app.get('/api/metrics', (req, res) => {
      const metrics = this.contractMonitor.getMetrics() as Map<string, ContractMetrics>;
      const metricsArray = Array.from(metrics.entries()).map(([name, data]) => ({
        name,
        ...data
      }));
      res.json(metricsArray);
    });

    // Get specific contract metrics
    this.app.get('/api/metrics/:contractName', (req, res) => {
      const metrics = this.contractMonitor.getMetrics(req.params.contractName) as ContractMetrics;
      if (!metrics.contractName) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      res.json(metrics);
    });

    // Get health summary
    this.app.get('/api/health-summary', (req, res) => {
      const summary = this.contractMonitor.getHealthSummary();
      res.json(summary);
    });

    // Get alert history
    this.app.get('/api/alerts', (req, res) => {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const alerts = this.alertingSystem.getAlertHistory(limit);
      res.json(alerts);
    });

    // Get alert statistics
    this.app.get('/api/alert-stats', (req, res) => {
      const stats = this.alertingSystem.getAlertStats();
      res.json(stats);
    });

    // Dashboard HTML page
    this.app.get('/', (req, res) => {
      res.send(this.getDashboardHTML());
    });

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        endpoints: [
          { path: '/health', method: 'GET', description: 'Service health check' },
          { path: '/api/metrics', method: 'GET', description: 'Get all contract metrics' },
          { path: '/api/metrics/:contractName', method: 'GET', description: 'Get specific contract metrics' },
          { path: '/api/health-summary', method: 'GET', description: 'Get overall health summary' },
          { path: '/api/alerts', method: 'GET', description: 'Get alert history', params: ['limit'] },
          { path: '/api/alert-stats', method: 'GET', description: 'Get alert statistics' }
        ],
        websocket: {
          events: ['metricsUpdate', 'securityAlert', 'healthCheck']
        }
      });
    });
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Dashboard client connected:', socket.id);

      // Send initial data
      socket.emit('initialData', {
        metrics: Array.from((this.contractMonitor.getMetrics() as Map<string, ContractMetrics>).entries()),
        healthSummary: this.contractMonitor.getHealthSummary(),
        recentAlerts: this.alertingSystem.getAlertHistory(10)
      });

      socket.on('disconnect', () => {
        console.log('Dashboard client disconnected:', socket.id);
      });

      // Handle client requests for specific data
      socket.on('requestMetrics', (contractName) => {
        const metrics = this.contractMonitor.getMetrics(contractName);
        socket.emit('metricsData', { contractName, metrics });
      });
    });
  }

  private setupEventListeners() {
    // Listen to contract monitor events
    this.contractMonitor.on('metricsUpdated', (contractName, metrics) => {
      this.io.emit('metricsUpdate', { contractName, metrics });
    });

    this.contractMonitor.on('securityAlert', (alert) => {
      this.io.emit('securityAlert', alert);
    });

    this.contractMonitor.on('healthCheck', (data) => {
      this.io.emit('healthCheck', data);
    });

    // Listen to alerting system events
    this.alertingSystem.on('alertSent', (alert) => {
      this.io.emit('newAlert', alert);
    });
  }

  private getDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Contract Monitoring Dashboard</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-card h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .health-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .healthy { background-color: #4CAF50; }
        .warning { background-color: #FF9800; }
        .critical { background-color: #F44336; }
        .alerts-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .alert-item {
            padding: 10px;
            margin: 5px 0;
            border-left: 4px solid;
            background-color: #f9f9f9;
        }
        .alert-critical { border-left-color: #F44336; }
        .alert-high { border-left-color: #FF9800; }
        .alert-medium { border-left-color: #2196F3; }
        .alert-low { border-left-color: #4CAF50; }
        .timestamp {
            font-size: 0.8em;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Smart Contract Monitoring Dashboard</h1>
        <p>Real-time monitoring of deployed smart contracts</p>
        <div id="connection-status">Connecting...</div>
    </div>

    <div id="health-summary" class="metric-card">
        <h3>System Health Summary</h3>
        <div id="health-stats"></div>
    </div>

    <div class="metrics-grid" id="metrics-container">
        <!-- Contract metrics will be populated here -->
    </div>

    <div class="alerts-section">
        <h3>Recent Alerts</h3>
        <div id="alerts-container">
            <!-- Alerts will be populated here -->
        </div>
    </div>

    <script>
        const socket = io();
        
        socket.on('connect', () => {
            document.getElementById('connection-status').textContent = 'Connected';
            document.getElementById('connection-status').style.color = 'green';
        });

        socket.on('disconnect', () => {
            document.getElementById('connection-status').textContent = 'Disconnected';
            document.getElementById('connection-status').style.color = 'red';
        });

        socket.on('initialData', (data) => {
            updateMetrics(data.metrics);
            updateHealthSummary(data.healthSummary);
            updateAlerts(data.recentAlerts);
        });

        socket.on('metricsUpdate', (data) => {
            updateSingleMetric(data.contractName, data.metrics);
        });

        socket.on('securityAlert', (alert) => {
            addAlert(alert);
        });

        socket.on('newAlert', (alert) => {
            addAlert(alert);
        });

        function updateMetrics(metrics) {
            const container = document.getElementById('metrics-container');
            container.innerHTML = '';
            
            metrics.forEach(([name, data]) => {
                const card = createMetricCard(name, data);
                container.appendChild(card);
            });
        }

        function updateSingleMetric(contractName, metrics) {
            const existingCard = document.getElementById('metric-' + contractName);
            if (existingCard) {
                existingCard.replaceWith(createMetricCard(contractName, metrics));
            }
        }

        function createMetricCard(name, data) {
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.id = 'metric-' + name;
            
            card.innerHTML = \`
                <h3>
                    <span class="health-indicator \${data.healthStatus}"></span>
                    \${name}
                </h3>
                <p><strong>Address:</strong> \${data.contractAddress}</p>
                <p><strong>Transactions:</strong> \${data.transactionCount}</p>
                <p><strong>Errors:</strong> \${data.errorCount}</p>
                <p><strong>Last Activity:</strong> \${new Date(data.lastActivity).toLocaleString()}</p>
                <p><strong>Status:</strong> \${data.healthStatus}</p>
            \`;
            
            return card;
        }

        function updateHealthSummary(summary) {
            const container = document.getElementById('health-stats');
            container.innerHTML = \`
                <p><span class="health-indicator healthy"></span>Healthy: \${summary.healthy}</p>
                <p><span class="health-indicator warning"></span>Warning: \${summary.warning}</p>
                <p><span class="health-indicator critical"></span>Critical: \${summary.critical}</p>
                <p><strong>Total Contracts:</strong> \${summary.total}</p>
            \`;
        }

        function updateAlerts(alerts) {
            const container = document.getElementById('alerts-container');
            container.innerHTML = '';
            
            alerts.forEach(alert => {
                addAlert(alert, false);
            });
        }

        function addAlert(alert, prepend = true) {
            const container = document.getElementById('alerts-container');
            const alertDiv = document.createElement('div');
            alertDiv.className = \`alert-item alert-\${alert.severity}\`;
            
            alertDiv.innerHTML = \`
                <div><strong>\${alert.alertType}</strong> - \${alert.severity.toUpperCase()}</div>
                <div>\${alert.description}</div>
                <div class="timestamp">\${new Date(alert.timestamp).toLocaleString()}</div>
            \`;
            
            if (prepend) {
                container.insertBefore(alertDiv, container.firstChild);
            } else {
                container.appendChild(alertDiv);
            }
        }
    </script>
</body>
</html>
    `;
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Dashboard server running on http://localhost:${this.port}`);
    });
  }

  stop() {
    this.server.close();
  }
}