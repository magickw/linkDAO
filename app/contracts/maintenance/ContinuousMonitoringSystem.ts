import { ethers } from 'ethers';
import { MainnetMonitoringSetup } from '../monitoring/MainnetMonitoringSetup';
import { AlertingSystem } from '../monitoring/AlertingSystem';
import { ContractMonitor } from '../monitoring/ContractMonitor';

interface MonitoringConfig {
  healthCheckInterval: number;
  performanceCheckInterval: number;
  alertThresholds: {
    gasPrice: {
      normal: string;
      high: string;
      critical: string;
    };
    transactionFailureRate: number;
    responseTime: number;
    errorRate: number;
  };
  onCallRotation: {
    enabled: boolean;
    schedule: Array<{
      name: string;
      contact: string;
      startTime: string;
      endTime: string;
      timezone: string;
    }>;
  };
}

export class ContinuousMonitoringSystem {
  private monitoringSetup: MainnetMonitoringSetup;
  private config: MonitoringConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private performanceTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private metrics: Map<string, any> = new Map();

  constructor(rpcUrl: string, config: MonitoringConfig) {
    this.monitoringSetup = new MainnetMonitoringSetup(rpcUrl);
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('Initializing Continuous Monitoring System...');
    
    await this.monitoringSetup.initialize();
    this.setupHealthChecks();
    this.setupPerformanceMonitoring();
    this.setupProactiveAlerting();
    
    console.log('Continuous Monitoring System initialized successfully');
  }

  private setupHealthChecks(): void {
    console.log('Setting up 24/7 health checks...');
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
        await this.handleHealthCheckFailure(error);
      }
    }, this.config.healthCheckInterval);
  }

  private setupPerformanceMonitoring(): void {
    console.log('Setting up performance monitoring...');
    
    this.performanceTimer = setInterval(async () => {
      try {
        await this.performPerformanceCheck();
      } catch (error) {
        console.error('Performance check failed:', error);
      }
    }, this.config.performanceCheckInterval);
  }

  private setupProactiveAlerting(): void {
    console.log('Setting up proactive alerting...');
    
    // Monitor gas price trends
    setInterval(async () => {
      await this.checkGasPriceAlerts();
    }, 60000); // Check every minute

    // Monitor transaction failure rates
    setInterval(async () => {
      await this.checkTransactionFailureRates();
    }, 300000); // Check every 5 minutes

    // Monitor system response times
    setInterval(async () => {
      await this.checkResponseTimes();
    }, 120000); // Check every 2 minutes
  }

  private async performHealthCheck(): Promise<void> {
    const timestamp = new Date().toISOString();
    const healthData: any = {
      timestamp,
      status: 'healthy',
      checks: {}
    };

    try {
      // Check RPC connectivity
      const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
      const blockNumber = await provider.getBlockNumber();
      healthData.checks.rpcConnectivity = {
        status: 'healthy',
        blockNumber,
        latency: Date.now()
      };

      // Check contract health
      const monitoringStatus = this.monitoringSetup.getMonitoringStatus();
      healthData.checks.contractHealth = {
        status: monitoringStatus.contractsMonitored > 0 ? 'healthy' : 'unhealthy',
        contractsMonitored: monitoringStatus.contractsMonitored,
        totalContracts: monitoringStatus.totalContracts
      };

      // Check alerting system
      healthData.checks.alertingSystem = {
        status: 'healthy', // Assume healthy unless we detect issues
        lastAlert: Date.now()
      };

      // Store health metrics
      this.metrics.set('lastHealthCheck', healthData);

      // Log health status
      console.log(`Health check completed: ${healthData.status}`);

    } catch (error) {
      healthData.status = 'unhealthy';
      healthData.error = error.message;
      
      await this.triggerHealthAlert(healthData);
    }
  }

  private async performPerformanceCheck(): Promise<void> {
    const timestamp = new Date().toISOString();
    const performanceData: any = {
      timestamp,
      metrics: {}
    };

    try {
      // Measure RPC response time
      const startTime = Date.now();
      const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
      await provider.getBlockNumber();
      const rpcLatency = Date.now() - startTime;

      performanceData.metrics.rpcLatency = rpcLatency;

      // Check if response time exceeds threshold
      if (rpcLatency > this.config.alertThresholds.responseTime) {
        await this.triggerPerformanceAlert('High RPC latency', {
          current: rpcLatency,
          threshold: this.config.alertThresholds.responseTime
        });
      }

      // Get monitoring system performance
      const monitoringStatus = this.monitoringSetup.getMonitoringStatus();
      performanceData.metrics.monitoringPerformance = monitoringStatus;

      // Store performance metrics
      this.metrics.set('lastPerformanceCheck', performanceData);

      console.log(`Performance check completed - RPC latency: ${rpcLatency}ms`);

    } catch (error) {
      console.error('Performance check failed:', error);
      await this.triggerPerformanceAlert('Performance check failure', { error: error.message });
    }
  }

  private async checkGasPriceAlerts(): Promise<void> {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
      const feeData = await provider.getFeeData();
      
      if (feeData.gasPrice) {
        const gasPriceGwei = ethers.formatUnits(feeData.gasPrice, 'gwei');
        const gasPriceNum = parseFloat(gasPriceGwei);

        let alertLevel: string | null = null;
        
        if (gasPriceNum > parseFloat(this.config.alertThresholds.gasPrice.critical)) {
          alertLevel = 'critical';
        } else if (gasPriceNum > parseFloat(this.config.alertThresholds.gasPrice.high)) {
          alertLevel = 'high';
        } else if (gasPriceNum > parseFloat(this.config.alertThresholds.gasPrice.normal)) {
          alertLevel = 'normal';
        }

        if (alertLevel) {
          await this.triggerGasPriceAlert(alertLevel, gasPriceGwei);
        }

        // Store gas price metrics
        this.metrics.set('currentGasPrice', {
          timestamp: new Date().toISOString(),
          gasPrice: gasPriceGwei,
          alertLevel
        });
      }
    } catch (error) {
      console.error('Gas price check failed:', error);
    }
  }

  private async checkTransactionFailureRates(): Promise<void> {
    try {
      // This would typically analyze recent transaction data
      // For now, we'll implement a placeholder that can be extended
      const failureRate = 0; // Placeholder - implement actual calculation
      
      if (failureRate > this.config.alertThresholds.transactionFailureRate) {
        await this.triggerTransactionFailureAlert(failureRate);
      }

      this.metrics.set('transactionFailureRate', {
        timestamp: new Date().toISOString(),
        failureRate
      });
    } catch (error) {
      console.error('Transaction failure rate check failed:', error);
    }
  }

  private async checkResponseTimes(): Promise<void> {
    try {
      const startTime = Date.now();
      const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
      
      // Test multiple operations
      const operations = [
        () => provider.getBlockNumber(),
        () => provider.getGasPrice(),
        () => provider.getNetwork()
      ];

      const results = await Promise.all(
        operations.map(async (op) => {
          const opStart = Date.now();
          await op();
          return Date.now() - opStart;
        })
      );

      const avgResponseTime = results.reduce((a, b) => a + b, 0) / results.length;

      if (avgResponseTime > this.config.alertThresholds.responseTime) {
        await this.triggerResponseTimeAlert(avgResponseTime);
      }

      this.metrics.set('responseTime', {
        timestamp: new Date().toISOString(),
        averageResponseTime: avgResponseTime,
        individualTimes: results
      });
    } catch (error) {
      console.error('Response time check failed:', error);
    }
  }

  private async triggerHealthAlert(healthData: any): Promise<void> {
    const alert = {
      type: 'HEALTH_CHECK_FAILURE',
      severity: 'critical',
      title: 'Platform Health Check Failed',
      description: `Health check failed: ${healthData.error}`,
      timestamp: new Date().toISOString(),
      data: healthData,
      onCallRequired: true
    };

    await this.sendAlert(alert);
  }

  private async triggerPerformanceAlert(message: string, data: any): Promise<void> {
    const alert = {
      type: 'PERFORMANCE_DEGRADATION',
      severity: 'high',
      title: 'Performance Degradation Detected',
      description: message,
      timestamp: new Date().toISOString(),
      data,
      onCallRequired: false
    };

    await this.sendAlert(alert);
  }

  private async triggerGasPriceAlert(level: string, gasPrice: string): Promise<void> {
    const alert = {
      type: 'GAS_PRICE_ALERT',
      severity: level === 'critical' ? 'critical' : 'medium',
      title: `${level.toUpperCase()} Gas Price Alert`,
      description: `Gas price is ${gasPrice} Gwei (${level} threshold exceeded)`,
      timestamp: new Date().toISOString(),
      data: { gasPrice, level },
      onCallRequired: level === 'critical'
    };

    await this.sendAlert(alert);
  }

  private async triggerTransactionFailureAlert(failureRate: number): Promise<void> {
    const alert = {
      type: 'TRANSACTION_FAILURE_RATE',
      severity: 'high',
      title: 'High Transaction Failure Rate',
      description: `Transaction failure rate is ${failureRate}%`,
      timestamp: new Date().toISOString(),
      data: { failureRate },
      onCallRequired: true
    };

    await this.sendAlert(alert);
  }

  private async triggerResponseTimeAlert(responseTime: number): Promise<void> {
    const alert = {
      type: 'HIGH_RESPONSE_TIME',
      severity: 'medium',
      title: 'High Response Time Detected',
      description: `Average response time is ${responseTime}ms`,
      timestamp: new Date().toISOString(),
      data: { responseTime },
      onCallRequired: false
    };

    await this.sendAlert(alert);
  }

  private async sendAlert(alert: any): Promise<void> {
    try {
      // Send through existing alerting system
      // This would integrate with the AlertingSystem class
      console.log('ALERT:', alert);

      // If on-call is required, trigger on-call notification
      if (alert.onCallRequired && this.config.onCallRotation.enabled) {
        await this.triggerOnCallAlert(alert);
      }
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  private async triggerOnCallAlert(alert: any): Promise<void> {
    const currentOnCall = this.getCurrentOnCallPerson();
    
    if (currentOnCall) {
      console.log(`Triggering on-call alert for ${currentOnCall.name}: ${alert.title}`);
      
      // Here you would integrate with your on-call system
      // (PagerDuty, OpsGenie, etc.)
    }
  }

  private getCurrentOnCallPerson(): any {
    if (!this.config.onCallRotation.enabled) {
      return null;
    }

    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format

    // Find current on-call person based on schedule
    for (const person of this.config.onCallRotation.schedule) {
      if (currentTime >= person.startTime && currentTime <= person.endTime) {
        return person;
      }
    }

    return null;
  }

  private async handleHealthCheckFailure(error: any): Promise<void> {
    console.error('Critical: Health check system failure:', error);
    
    // Implement emergency procedures
    await this.triggerHealthAlert({
      error: error.message,
      timestamp: new Date().toISOString(),
      status: 'critical_failure'
    });
  }

  public start(): void {
    if (this.isRunning) {
      console.log('Continuous monitoring is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting continuous monitoring system...');
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log('Continuous monitoring is not running');
      return;
    }

    console.log('Stopping continuous monitoring system...');
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    if (this.performanceTimer) {
      clearInterval(this.performanceTimer);
    }

    this.isRunning = false;
    console.log('Continuous monitoring system stopped');
  }

  public getMetrics(): Map<string, any> {
    return this.metrics;
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      lastHealthCheck: this.metrics.get('lastHealthCheck'),
      lastPerformanceCheck: this.metrics.get('lastPerformanceCheck'),
      currentGasPrice: this.metrics.get('currentGasPrice'),
      monitoringStatus: this.monitoringSetup.getMonitoringStatus()
    };
  }
}

// Default configuration
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  healthCheckInterval: 300000, // 5 minutes
  performanceCheckInterval: 120000, // 2 minutes
  alertThresholds: {
    gasPrice: {
      normal: '50', // 50 Gwei
      high: '100', // 100 Gwei
      critical: '200' // 200 Gwei
    },
    transactionFailureRate: 5, // 5%
    responseTime: 5000, // 5 seconds
    errorRate: 1 // 1%
  },
  onCallRotation: {
    enabled: true,
    schedule: [
      {
        name: 'Primary Engineer',
        contact: 'primary@linkdao.io',
        startTime: '09:00:00',
        endTime: '17:00:00',
        timezone: 'UTC'
      },
      {
        name: 'Secondary Engineer',
        contact: 'secondary@linkdao.io',
        startTime: '17:00:00',
        endTime: '09:00:00',
        timezone: 'UTC'
      }
    ]
  }
};