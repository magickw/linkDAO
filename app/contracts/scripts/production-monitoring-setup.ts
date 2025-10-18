import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { ContractMonitor } from '../monitoring/ContractMonitor';
import { AlertingSystem } from '../monitoring/AlertingSystem';
import { DashboardServer } from '../monitoring/DashboardServer';

export interface MonitoringConfig {
  network: string;
  rpcUrl: string;
  rpcBackupUrls: string[];
  monitoringInterval: number;
  healthCheckInterval: number;
  gasMonitoringEnabled: boolean;
  alerting: {
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
    discord: {
      enabled: boolean;
      webhookUrl: string;
    };
    email: {
      enabled: boolean;
      recipients: string[];
      smtpConfig?: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
    };
    webhook: {
      enabled: boolean;
      url: string;
      headers: Record<string, string>;
    };
  };
  dashboard: {
    enabled: boolean;
    port: number;
    auth: {
      enabled: boolean;
      username: string;
      password: string;
    };
  };
  thresholds: {
    gasPrice: {
      normal: string;
      high: string;
      critical: string;
    };
    balanceAlert: string;
    transactionVolume: {
      hourly: number;
      daily: number;
    };
    errorRate: {
      warning: number;
      critical: number;
    };
  };
}

export interface ContractHealthMetrics {
  contractName: string;
  address: string;
  balance: string;
  transactionCount: number;
  lastActivity: number;
  errorCount: number;
  gasUsage: {
    average: number;
    total: number;
  };
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: ContractHealthMetrics, gasPrice: bigint) => boolean;
  severity: 'info' | 'warning' | 'critical';
  cooldownMs: number;
  enabled: boolean;
}

export class ProductionMonitoringSetup {
  private config: MonitoringConfig;
  private provider: ethers.Provider;
  private backupProviders: ethers.Provider[];
  private contractMonitor: ContractMonitor;
  private alertingSystem: AlertingSystem;
  private dashboardServer?: DashboardServer;
  private deploymentData: any;
  private contractABIs: { [key: string]: any[] } = {};
  private monitoringStartTime: number;
  private healthMetrics: Map<string, ContractHealthMetrics> = new Map();
  private alertRules: AlertRule[] = [];

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.monitoringStartTime = Date.now();
    
    // Initialize providers with failover
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.backupProviders = config.rpcBackupUrls.map(url => new ethers.JsonRpcProvider(url));
    
    // Initialize monitoring components
    this.contractMonitor = new ContractMonitor(this.provider);
    this.alertingSystem = new AlertingSystem();
    
    if (config.dashboard.enabled) {
      this.dashboardServer = new DashboardServer(
        this.contractMonitor,
        this.alertingSystem,
        config.dashboard.port
      );
    }
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing production monitoring system...\n');
    
    try {
      // Load deployment data and ABIs
      await this.loadDeploymentData();
      await this.loadContractABIs();
      
      // Setup monitoring components
      await this.setupContractMonitoring();
      await this.configureAlerting();
      await this.setupAlertRules();
      
      // Start services
      await this.startMonitoringServices();
      
      // Setup health checks
      this.setupHealthChecks();
      
      console.log('✅ Production monitoring system initialized successfully!\n');
      this.logMonitoringStatus();
      
    } catch (error) {
      console.error('❌ Failed to initialize monitoring system:', error);
      throw error;
    }
  }

  private async loadDeploymentData(): Promise<void> {
    const possiblePaths = [
      path.join(__dirname, '..', `deployedAddresses-${this.config.network}.json`),
      path.join(__dirname, '..', 'deployedAddresses.json'),
      path.join(__dirname, '..', 'deployed-addresses-localhost.json')
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        this.deploymentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📄 Loaded deployment data from: ${path.basename(filePath)}`);
        return;
      }
    }

    throw new Error('❌ No deployment data found. Deploy contracts first.');
  }

  private async loadContractABIs(): Promise<void> {
    const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts');
    
    for (const [contractName, address] of Object.entries(this.deploymentData)) {
      if (typeof address === 'string' && address.startsWith('0x')) {
        try {
          const artifactPath = path.join(artifactsPath, `${contractName}.sol`, `${contractName}.json`);
          
          if (fs.existsSync(artifactPath)) {
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            this.contractABIs[contractName] = artifact.abi;
            console.log(`📋 Loaded ABI for ${contractName}`);
          } else {
            console.warn(`⚠️ ABI not found for ${contractName}`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not load ABI for ${contractName}:`, error);
        }
      }
    }
  }

  private async setupContractMonitoring(): Promise<void> {
    console.log('🔍 Setting up contract monitoring...\n');

    for (const [contractName, address] of Object.entries(this.deploymentData)) {
      if (typeof address === 'string' && address.startsWith('0x') && this.contractABIs[contractName]) {
        // Add contract to monitor
        this.contractMonitor.addContract(contractName, address, this.contractABIs[contractName]);
        
        // Initialize health metrics
        this.healthMetrics.set(contractName, {
          contractName,
          address,
          balance: '0',
          transactionCount: 0,
          lastActivity: 0,
          errorCount: 0,
          gasUsage: { average: 0, total: 0 },
          status: 'healthy',
          uptime: 100
        });

        console.log(`   ✅ Added monitoring for ${contractName} at ${address}`);
      }
    }

    // Setup event listeners
    this.contractMonitor.on('metricsUpdated', (contractName, metrics) => {
      this.updateHealthMetrics(contractName, metrics);
    });

    this.contractMonitor.on('securityAlert', (alert) => {
      this.alertingSystem.processAlert({
        ...alert,
        severity: 'critical',
        timestamp: Date.now()
      });
    });

    this.contractMonitor.on('error', (error) => {
      console.error('Contract monitoring error:', error);
      this.alertingSystem.processAlert({
        id: `monitor-error-${Date.now()}`,
        title: 'Contract Monitoring Error',
        description: error.message,
        severity: 'warning',
        timestamp: Date.now()
      });
    });
  }

  private async configureAlerting(): Promise<void> {
    console.log('📢 Configuring alerting system...\n');

    // Configure Slack notifications
    if (this.config.alerting.slack.enabled) {
      this.alertingSystem.addNotificationChannel('slack', {
        type: 'slack',
        config: {
          webhookUrl: this.config.alerting.slack.webhookUrl,
          channel: this.config.alerting.slack.channel
        },
        enabled: true
      });
      console.log('   ✅ Slack notifications configured');
    }

    // Configure Discord notifications
    if (this.config.alerting.discord.enabled) {
      this.alertingSystem.addNotificationChannel('discord', {
        type: 'discord',
        config: {
          webhookUrl: this.config.alerting.discord.webhookUrl
        },
        enabled: true
      });
      console.log('   ✅ Discord notifications configured');
    }

    // Configure email notifications
    if (this.config.alerting.email.enabled) {
      this.alertingSystem.addNotificationChannel('email', {
        type: 'email',
        config: {
          recipients: this.config.alerting.email.recipients,
          smtp: this.config.alerting.email.smtpConfig
        },
        enabled: true
      });
      console.log('   ✅ Email notifications configured');
    }

    // Configure webhook notifications
    if (this.config.alerting.webhook.enabled) {
      this.alertingSystem.addNotificationChannel('webhook', {
        type: 'webhook',
        config: {
          url: this.config.alerting.webhook.url,
          headers: this.config.alerting.webhook.headers
        },
        enabled: true
      });
      console.log('   ✅ Webhook notifications configured');
    }
  }

  private setupAlertRules(): void {
    console.log('⚠️ Setting up alert rules...\n');

    // High gas price alert
    this.alertRules.push({
      id: 'high-gas-price',
      name: 'High Gas Price Alert',
      description: 'Gas price exceeds normal threshold',
      condition: (metrics, gasPrice) => {
        const gasPriceGwei = Number(ethers.formatUnits(gasPrice, 'gwei'));
        const threshold = Number(ethers.formatUnits(this.config.thresholds.gasPrice.high, 'gwei'));
        return gasPriceGwei > threshold;
      },
      severity: 'warning',
      cooldownMs: 300000, // 5 minutes
      enabled: true
    });

    // Critical gas price alert
    this.alertRules.push({
      id: 'critical-gas-price',
      name: 'Critical Gas Price Alert',
      description: 'Gas price exceeds critical threshold',
      condition: (metrics, gasPrice) => {
        const gasPriceGwei = Number(ethers.formatUnits(gasPrice, 'gwei'));
        const threshold = Number(ethers.formatUnits(this.config.thresholds.gasPrice.critical, 'gwei'));
        return gasPriceGwei > threshold;
      },
      severity: 'critical',
      cooldownMs: 600000, // 10 minutes
      enabled: true
    });

    // Low balance alert
    this.alertRules.push({
      id: 'low-balance',
      name: 'Low Contract Balance',
      description: 'Contract balance below threshold',
      condition: (metrics) => {
        const balance = Number(ethers.formatEther(metrics.balance));
        const threshold = Number(ethers.formatEther(this.config.thresholds.balanceAlert));
        return balance < threshold;
      },
      severity: 'warning',
      cooldownMs: 3600000, // 1 hour
      enabled: true
    });

    // High error rate alert
    this.alertRules.push({
      id: 'high-error-rate',
      name: 'High Error Rate',
      description: 'Contract error rate exceeds threshold',
      condition: (metrics) => {
        const errorRate = metrics.transactionCount > 0 ? 
          (metrics.errorCount / metrics.transactionCount) * 100 : 0;
        return errorRate > this.config.thresholds.errorRate.warning;
      },
      severity: 'warning',
      cooldownMs: 900000, // 15 minutes
      enabled: true
    });

    // Contract offline alert
    this.alertRules.push({
      id: 'contract-offline',
      name: 'Contract Offline',
      description: 'Contract appears to be offline or unresponsive',
      condition: (metrics) => {
        const timeSinceLastActivity = Date.now() - metrics.lastActivity;
        return timeSinceLastActivity > 3600000; // 1 hour
      },
      severity: 'critical',
      cooldownMs: 1800000, // 30 minutes
      enabled: true
    });

    console.log(`   ✅ Configured ${this.alertRules.length} alert rules`);
  }

  private async startMonitoringServices(): Promise<void> {
    console.log('🔄 Starting monitoring services...\n');

    // Start contract monitoring
    this.contractMonitor.startMonitoring(this.config.monitoringInterval);
    console.log(`   ✅ Contract monitoring started (${this.config.monitoringInterval}ms interval)`);

    // Start dashboard server
    if (this.dashboardServer) {
      this.dashboardServer.start();
      console.log(`   ✅ Dashboard server started on port ${this.config.dashboard.port}`);
    }

    // Start gas price monitoring
    if (this.config.gasMonitoringEnabled) {
      this.startGasPriceMonitoring();
      console.log('   ✅ Gas price monitoring started');
    }
  }

  private setupHealthChecks(): void {
    console.log('💓 Setting up health checks...\n');

    // Periodic health check
    setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Provider failover check
    setInterval(async () => {
      await this.checkProviderHealth();
    }, 60000); // Check every minute

    console.log(`   ✅ Health checks configured (${this.config.healthCheckInterval}ms interval)`);
  }

  private startGasPriceMonitoring(): void {
    setInterval(async () => {
      try {
        const feeData = await this.provider.getFeeData();
        const gasPrice = feeData.gasPrice || BigInt(0);
        
        // Check alert rules for gas price
        for (const rule of this.alertRules.filter(r => r.enabled)) {
          if (rule.id.includes('gas-price')) {
            // Create dummy metrics for gas price rules
            const dummyMetrics: ContractHealthMetrics = {
              contractName: 'GasPrice',
              address: '0x0000000000000000000000000000000000000000',
              balance: '0',
              transactionCount: 0,
              lastActivity: Date.now(),
              errorCount: 0,
              gasUsage: { average: 0, total: 0 },
              status: 'healthy',
              uptime: 100
            };

            if (rule.condition(dummyMetrics, gasPrice)) {
              this.alertingSystem.processAlert({
                id: `${rule.id}-${Date.now()}`,
                title: rule.name,
                description: `${rule.description}. Current: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`,
                severity: rule.severity,
                timestamp: Date.now()
              });
            }
          }
        }
      } catch (error) {
        console.error('Gas price monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    try {
      for (const [contractName, metrics] of this.healthMetrics.entries()) {
        // Check alert rules
        for (const rule of this.alertRules.filter(r => r.enabled && !r.id.includes('gas-price'))) {
          if (rule.condition(metrics, BigInt(0))) {
            this.alertingSystem.processAlert({
              id: `${rule.id}-${contractName}-${Date.now()}`,
              title: `${rule.name} - ${contractName}`,
              description: `${rule.description}. Contract: ${contractName} (${metrics.address})`,
              severity: rule.severity,
              timestamp: Date.now()
            });
          }
        }
      }
    } catch (error) {
      console.error('Health check error:', error);
    }
  }

  private async checkProviderHealth(): Promise<void> {
    try {
      // Test primary provider
      await this.provider.getBlockNumber();
    } catch (error) {
      console.warn('Primary provider unhealthy, attempting failover...');
      
      // Try backup providers
      for (let i = 0; i < this.backupProviders.length; i++) {
        try {
          await this.backupProviders[i].getBlockNumber();
          console.log(`Switched to backup provider ${i + 1}`);
          
          // Update provider in monitoring components
          this.contractMonitor = new ContractMonitor(this.backupProviders[i]);
          break;
        } catch (backupError) {
          console.warn(`Backup provider ${i + 1} also unhealthy`);
        }
      }
    }
  }

  private updateHealthMetrics(contractName: string, metrics: any): void {
    const existing = this.healthMetrics.get(contractName);
    if (existing) {
      const updated: ContractHealthMetrics = {
        ...existing,
        balance: metrics.balance || existing.balance,
        transactionCount: metrics.transactionCount || existing.transactionCount,
        lastActivity: metrics.lastActivity || existing.lastActivity,
        errorCount: metrics.errorCount || existing.errorCount,
        gasUsage: metrics.gasUsage || existing.gasUsage,
        status: this.calculateHealthStatus(metrics),
        uptime: this.calculateUptime(contractName)
      };
      
      this.healthMetrics.set(contractName, updated);
    }
  }

  private calculateHealthStatus(metrics: any): 'healthy' | 'warning' | 'critical' | 'offline' {
    const timeSinceLastActivity = Date.now() - (metrics.lastActivity || 0);
    
    if (timeSinceLastActivity > 3600000) return 'offline'; // 1 hour
    if (metrics.errorCount > 10) return 'critical';
    if (metrics.errorCount > 5) return 'warning';
    return 'healthy';
  }

  private calculateUptime(contractName: string): number {
    // Simple uptime calculation based on monitoring duration
    const monitoringDuration = Date.now() - this.monitoringStartTime;
    const metrics = this.healthMetrics.get(contractName);
    
    if (!metrics || monitoringDuration === 0) return 100;
    
    // Estimate uptime based on error rate
    const errorRate = metrics.transactionCount > 0 ? 
      (metrics.errorCount / metrics.transactionCount) * 100 : 0;
    
    return Math.max(0, 100 - errorRate);
  }

  private logMonitoringStatus(): void {
    console.log('📊 Monitoring Status:');
    console.log(`   Contracts monitored: ${this.healthMetrics.size}`);
    console.log(`   Alert rules: ${this.alertRules.filter(r => r.enabled).length}`);
    console.log(`   Notification channels: ${this.alertingSystem.getChannelCount()}`);
    console.log(`   Dashboard: ${this.config.dashboard.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   Gas monitoring: ${this.config.gasMonitoringEnabled ? 'Enabled' : 'Disabled'}`);
    console.log('');
  }

  async generateMonitoringReport(): Promise<string> {
    let report = '# Production Monitoring Report\n\n';
    report += `**Network**: ${this.config.network}\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Monitoring Duration**: ${Math.round((Date.now() - this.monitoringStartTime) / 1000 / 60)} minutes\n\n`;

    // System Status
    report += '## System Status\n\n';
    const healthyContracts = Array.from(this.healthMetrics.values()).filter(m => m.status === 'healthy').length;
    const totalContracts = this.healthMetrics.size;
    
    report += `- **Overall Health**: ${healthyContracts}/${totalContracts} contracts healthy\n`;
    report += `- **Alert Rules**: ${this.alertRules.filter(r => r.enabled).length} active\n`;
    report += `- **Notification Channels**: ${this.alertingSystem.getChannelCount()} configured\n\n`;

    // Contract Health
    report += '## Contract Health\n\n';
    report += '| Contract | Status | Balance | Transactions | Last Activity | Uptime |\n';
    report += '|----------|--------|---------|--------------|---------------|--------|\n';

    for (const [name, metrics] of this.healthMetrics.entries()) {
      const statusEmoji = {
        healthy: '✅',
        warning: '⚠️',
        critical: '❌',
        offline: '🔴'
      }[metrics.status];

      const balance = Number(ethers.formatEther(metrics.balance)).toFixed(4);
      const lastActivity = metrics.lastActivity ? 
        new Date(metrics.lastActivity).toLocaleString() : 'Never';
      
      report += `| ${name} | ${statusEmoji} ${metrics.status} | ${balance} ETH | ${metrics.transactionCount} | ${lastActivity} | ${metrics.uptime.toFixed(1)}% |\n`;
    }

    report += '\n';

    // Alert Summary
    const alertStats = this.alertingSystem.getAlertStats();
    report += '## Alert Summary\n\n';
    report += `- **Total Alerts**: ${alertStats.total}\n`;
    report += `- **Critical**: ${alertStats.critical}\n`;
    report += `- **Warning**: ${alertStats.warning}\n`;
    report += `- **Info**: ${alertStats.info}\n\n`;

    // Recommendations
    report += '## Recommendations\n\n';
    const criticalContracts = Array.from(this.healthMetrics.values()).filter(m => m.status === 'critical');
    const offlineContracts = Array.from(this.healthMetrics.values()).filter(m => m.status === 'offline');

    if (criticalContracts.length > 0) {
      report += '### 🚨 Critical Issues\n\n';
      for (const contract of criticalContracts) {
        report += `- **${contract.contractName}**: High error rate (${contract.errorCount} errors)\n`;
      }
      report += '\n';
    }

    if (offlineContracts.length > 0) {
      report += '### 🔴 Offline Contracts\n\n';
      for (const contract of offlineContracts) {
        report += `- **${contract.contractName}**: No activity for extended period\n`;
      }
      report += '\n';
    }

    return report;
  }

  async saveMonitoringReport(): Promise<void> {
    const report = await this.generateMonitoringReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `monitoring-report-${this.config.network}-${timestamp}.md`;
    const reportsDir = path.join(__dirname, '..', 'monitoring-reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, report);
    
    console.log(`📄 Monitoring report saved to: ${filename}`);
  }

  getHealthMetrics(): Map<string, ContractHealthMetrics> {
    return new Map(this.healthMetrics);
  }

  getAlertingSystem(): AlertingSystem {
    return this.alertingSystem;
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down monitoring system...');
    
    this.contractMonitor.stopMonitoring();
    
    if (this.dashboardServer) {
      this.dashboardServer.stop();
    }
    
    // Save final report
    await this.saveMonitoringReport();
    
    console.log('✅ Monitoring system shut down successfully');
  }
}

// Load monitoring configuration
export function loadMonitoringConfig(): MonitoringConfig {
  const configPath = path.join(__dirname, '..', 'monitoring-config.json');
  
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // Default configuration
  return {
    network: process.env.HARDHAT_NETWORK || 'mainnet',
    rpcUrl: process.env.MAINNET_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/your-api-key',
    rpcBackupUrls: (process.env.BACKUP_RPC_URLS || '').split(',').filter(Boolean),
    monitoringInterval: 30000, // 30 seconds
    healthCheckInterval: 300000, // 5 minutes
    gasMonitoringEnabled: true,
    alerting: {
      slack: {
        enabled: !!process.env.SLACK_WEBHOOK_URL,
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: process.env.SLACK_CHANNEL || '#alerts'
      },
      discord: {
        enabled: !!process.env.DISCORD_WEBHOOK_URL,
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || ''
      },
      email: {
        enabled: !!process.env.ALERT_EMAIL_RECIPIENTS,
        recipients: (process.env.ALERT_EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
      },
      webhook: {
        enabled: !!process.env.ALERT_WEBHOOK_URL,
        url: process.env.ALERT_WEBHOOK_URL || '',
        headers: {
          'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN || ''}`
        }
      }
    },
    dashboard: {
      enabled: process.env.DASHBOARD_ENABLED !== 'false',
      port: parseInt(process.env.DASHBOARD_PORT || '3001'),
      auth: {
        enabled: process.env.DASHBOARD_AUTH_ENABLED === 'true',
        username: process.env.DASHBOARD_USERNAME || 'admin',
        password: process.env.DASHBOARD_PASSWORD || 'password'
      }
    },
    thresholds: {
      gasPrice: {
        normal: ethers.parseUnits('20', 'gwei').toString(),
        high: ethers.parseUnits('50', 'gwei').toString(),
        critical: ethers.parseUnits('100', 'gwei').toString()
      },
      balanceAlert: ethers.parseEther('1').toString(),
      transactionVolume: {
        hourly: 1000,
        daily: 10000
      },
      errorRate: {
        warning: 5,
        critical: 10
      }
    }
  };
}

// Main execution function
export async function activateProductionMonitoring(): Promise<ProductionMonitoringSetup> {
  try {
    console.log('🚀 Activating production monitoring infrastructure...\n');

    // Load configuration
    const config = loadMonitoringConfig();
    
    // Validate configuration
    if (!config.rpcUrl) {
      throw new Error('RPC URL is required for monitoring');
    }

    // Initialize monitoring system
    const monitoring = new ProductionMonitoringSetup(config);
    await monitoring.initialize();

    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await monitoring.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await monitoring.shutdown();
      process.exit(0);
    });

    console.log('🎉 Production monitoring infrastructure activated successfully!');
    
    return monitoring;

  } catch (error) {
    console.error('❌ Failed to activate monitoring infrastructure:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  activateProductionMonitoring()
    .then(() => {
      console.log('Monitoring system running... Press Ctrl+C to stop.');
    })
    .catch(() => process.exit(1));
}