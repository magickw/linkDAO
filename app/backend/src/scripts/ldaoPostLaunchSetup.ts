#!/usr/bin/env ts-node

import { logger } from '../utils/logger';
import { ldaoPostLaunchMonitoringService } from '../services/ldaoPostLaunchMonitoringService';
import { ldaoOptimizationEngine } from '../services/ldaoOptimizationEngine';

/**
 * Setup script for LDAO post-launch monitoring and optimization
 * This script initializes monitoring systems, sets up alerting, and configures optimization engines
 */

interface SetupConfig {
  enableRealTimeMonitoring: boolean;
  enableOptimizationEngine: boolean;
  alertingThresholds: {
    errorRate: number;
    responseTime: number;
    conversionRate: number;
  };
  monitoringInterval: number; // minutes
  reportingSchedule: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
}

class LDAOPostLaunchSetup {
  private config: SetupConfig;

  constructor(config: SetupConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Starting LDAO post-launch monitoring setup...');

      // Step 1: Initialize monitoring service
      await this.setupMonitoringService();

      // Step 2: Configure alerting system
      await this.setupAlertingSystem();

      // Step 3: Initialize optimization engine
      if (this.config.enableOptimizationEngine) {
        await this.setupOptimizationEngine();
      }

      // Step 4: Setup automated reporting
      await this.setupAutomatedReporting();

      // Step 5: Create initial baseline metrics
      await this.createBaselineMetrics();

      // Step 6: Setup health checks
      await this.setupHealthChecks();

      logger.info('LDAO post-launch monitoring setup completed successfully');
    } catch (error) {
      logger.error('Error during post-launch setup:', error);
      throw error;
    }
  }

  private async setupMonitoringService(): Promise<void> {
    logger.info('Setting up monitoring service...');

    // Configure monitoring service event listeners
    ldaoPostLaunchMonitoringService.on('alert', (alert) => {
      this.handleAlert(alert);
    });

    ldaoPostLaunchMonitoringService.on('daily_report', (report) => {
      this.handleDailyReport(report);
    });

    // Test monitoring service
    const testTimeRange = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    };

    try {
      await ldaoPostLaunchMonitoringService.getSystemMetrics(testTimeRange);
      logger.info('Monitoring service test successful');
    } catch (error) {
      logger.error('Monitoring service test failed:', error);
      throw error;
    }
  }

  private async setupAlertingSystem(): Promise<void> {
    logger.info('Setting up alerting system...');

    // Configure alert thresholds
    const thresholds = this.config.alertingThresholds;
    
    // Setup alert channels (email, Slack, etc.)
    await this.configureAlertChannels();

    // Create alert rules
    const alertRules = [
      {
        name: 'High Error Rate',
        condition: `error_rate > ${thresholds.errorRate}`,
        severity: 'critical',
        description: 'System error rate exceeds acceptable threshold'
      },
      {
        name: 'Slow Response Time',
        condition: `response_time > ${thresholds.responseTime}`,
        severity: 'warning',
        description: 'API response time is slower than expected'
      },
      {
        name: 'Low Conversion Rate',
        condition: `conversion_rate < ${thresholds.conversionRate}`,
        severity: 'warning',
        description: 'Conversion rate has dropped below threshold'
      }
    ];

    logger.info(`Created ${alertRules.length} alert rules`);
  }

  private async setupOptimizationEngine(): Promise<void> {
    logger.info('Setting up optimization engine...');

    // Configure optimization engine event listeners
    ldaoOptimizationEngine.on('optimization_implemented', (event) => {
      logger.info(`Optimization implemented: ${event.name} (${event.strategyId})`);
    });

    ldaoOptimizationEngine.on('ab_test_created', (event) => {
      logger.info(`A/B test created: ${event.name} (${event.testId})`);
    });

    // Initialize with baseline optimization strategies
    const strategies = await ldaoOptimizationEngine.analyzeOptimizationOpportunities();
    logger.info(`Identified ${strategies.length} optimization opportunities`);

    // Create initial A/B tests for high-priority optimizations
    const highPriorityStrategies = strategies.filter(s => s.priority === 'high').slice(0, 2);
    
    for (const strategy of highPriorityStrategies) {
      await this.createInitialABTest(strategy);
    }
  }

  private async setupAutomatedReporting(): Promise<void> {
    logger.info('Setting up automated reporting...');

    const schedule = this.config.reportingSchedule;

    if (schedule.daily) {
      // Setup daily report generation
      this.scheduleDailyReports();
    }

    if (schedule.weekly) {
      // Setup weekly report generation
      this.scheduleWeeklyReports();
    }

    if (schedule.monthly) {
      // Setup monthly report generation
      this.scheduleMonthlyReports();
    }
  }

  private async createBaselineMetrics(): Promise<void> {
    logger.info('Creating baseline metrics...');

    const timeRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date()
    };

    try {
      const [metrics, analytics, performance] = await Promise.all([
        ldaoPostLaunchMonitoringService.getSystemMetrics(timeRange),
        ldaoPostLaunchMonitoringService.analyzeUserBehavior(timeRange),
        ldaoPostLaunchMonitoringService.getPerformanceMetrics(timeRange)
      ]);

      // Store baseline metrics for comparison
      const baseline = {
        timestamp: new Date().toISOString(),
        metrics,
        analytics,
        performance
      };

      // In production, store this in a persistent storage
      logger.info('Baseline metrics created:', {
        totalPurchases: metrics.totalPurchases,
        conversionRate: metrics.conversionRate,
        averageResponseTime: metrics.responseTime
      });

    } catch (error) {
      logger.error('Error creating baseline metrics:', error);
      throw error;
    }
  }

  private async setupHealthChecks(): Promise<void> {
    logger.info('Setting up health checks...');

    // Setup periodic health checks
    const healthCheckInterval = setInterval(async () => {
      try {
        const timeRange = {
          start: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          end: new Date()
        };

        const metrics = await ldaoPostLaunchMonitoringService.getSystemMetrics(timeRange);
        
        // Check critical metrics
        if (metrics.errorRate > this.config.alertingThresholds.errorRate) {
          logger.warn(`High error rate detected: ${(metrics.errorRate * 100).toFixed(2)}%`);
        }

        if (metrics.responseTime > this.config.alertingThresholds.responseTime) {
          logger.warn(`Slow response time detected: ${metrics.responseTime}ms`);
        }

      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, this.config.monitoringInterval * 60 * 1000);

    // Cleanup on process exit
    process.on('SIGINT', () => {
      clearInterval(healthCheckInterval);
      logger.info('Health checks stopped');
    });
  }

  private async configureAlertChannels(): Promise<void> {
    // Configure email alerts
    const emailConfig = {
      smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      recipients: (process.env.ALERT_RECIPIENTS || '').split(',').filter(Boolean)
    };

    // Configure Slack alerts (if webhook URL provided)
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      logger.info('Slack alerts configured');
    }

    logger.info('Alert channels configured');
  }

  private async createInitialABTest(strategy: any): Promise<void> {
    const testConfig = {
      id: `initial-${strategy.id}`,
      name: `Initial Test: ${strategy.name}`,
      description: `A/B test for ${strategy.description}`,
      variants: {
        control: { enabled: false },
        treatment: { enabled: true }
      },
      trafficSplit: 0.1, // Start with 10% traffic
      duration: 14, // 2 weeks
      successMetrics: [strategy.targetMetric],
      minimumSampleSize: 1000
    };

    try {
      await ldaoOptimizationEngine.createABTest(testConfig);
      logger.info(`Created initial A/B test for strategy: ${strategy.name}`);
    } catch (error) {
      logger.error(`Error creating A/B test for ${strategy.name}:`, error);
    }
  }

  private scheduleDailyReports(): void {
    // Schedule daily reports at 9 AM UTC
    const dailyInterval = setInterval(async () => {
      const now = new Date();
      if (now.getUTCHours() === 9 && now.getUTCMinutes() === 0) {
        await this.generateDailyReport();
      }
    }, 60 * 1000); // Check every minute

    logger.info('Daily reports scheduled');
  }

  private scheduleWeeklyReports(): void {
    // Schedule weekly reports on Mondays at 10 AM UTC
    const weeklyInterval = setInterval(async () => {
      const now = new Date();
      if (now.getUTCDay() === 1 && now.getUTCHours() === 10 && now.getUTCMinutes() === 0) {
        await this.generateWeeklyReport();
      }
    }, 60 * 1000); // Check every minute

    logger.info('Weekly reports scheduled');
  }

  private scheduleMonthlyReports(): void {
    // Schedule monthly reports on the 1st at 11 AM UTC
    const monthlyInterval = setInterval(async () => {
      const now = new Date();
      if (now.getUTCDate() === 1 && now.getUTCHours() === 11 && now.getUTCMinutes() === 0) {
        await this.generateMonthlyReport();
      }
    }, 60 * 1000); // Check every minute

    logger.info('Monthly reports scheduled');
  }

  private async generateDailyReport(): Promise<void> {
    try {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const [metrics, recommendations] = await Promise.all([
        ldaoPostLaunchMonitoringService.getSystemMetrics(timeRange),
        ldaoPostLaunchMonitoringService.generateOptimizationRecommendations()
      ]);

      const report = {
        type: 'daily',
        date: new Date().toISOString().split('T')[0],
        metrics,
        topRecommendations: recommendations.slice(0, 3),
        summary: this.generateReportSummary(metrics)
      };

      logger.info('Daily report generated:', report.summary);
      
      // In production, send this report via email/Slack
      await this.sendReport(report);

    } catch (error) {
      logger.error('Error generating daily report:', error);
    }
  }

  private async generateWeeklyReport(): Promise<void> {
    try {
      const timeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const [metrics, analytics, performance, roadmap] = await Promise.all([
        ldaoPostLaunchMonitoringService.getSystemMetrics(timeRange),
        ldaoPostLaunchMonitoringService.analyzeUserBehavior(timeRange),
        ldaoPostLaunchMonitoringService.getPerformanceMetrics(timeRange),
        ldaoPostLaunchMonitoringService.createFeatureRoadmap()
      ]);

      const report = {
        type: 'weekly',
        weekOf: new Date().toISOString().split('T')[0],
        metrics,
        analytics,
        performance,
        roadmap,
        summary: this.generateWeeklyReportSummary(metrics, analytics)
      };

      logger.info('Weekly report generated');
      await this.sendReport(report);

    } catch (error) {
      logger.error('Error generating weekly report:', error);
    }
  }

  private async generateMonthlyReport(): Promise<void> {
    try {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const [metrics, optimizationPlan] = await Promise.all([
        ldaoPostLaunchMonitoringService.getSystemMetrics(timeRange),
        ldaoOptimizationEngine.generateOptimizationPlan()
      ]);

      const report = {
        type: 'monthly',
        month: new Date().toISOString().substring(0, 7),
        metrics,
        optimizationPlan,
        summary: this.generateMonthlyReportSummary(metrics)
      };

      logger.info('Monthly report generated');
      await this.sendReport(report);

    } catch (error) {
      logger.error('Error generating monthly report:', error);
    }
  }

  private generateReportSummary(metrics: any): string {
    return `Daily Summary: ${metrics.totalPurchases} purchases, ${(metrics.conversionRate * 100).toFixed(2)}% conversion rate, ${metrics.responseTime}ms avg response time`;
  }

  private generateWeeklyReportSummary(metrics: any, analytics: any): string {
    const topPaymentMethod = Object.keys(analytics.preferredPaymentMethods)[0] || 'N/A';
    return `Weekly Summary: ${metrics.totalPurchases} purchases, top payment method: ${topPaymentMethod}`;
  }

  private generateMonthlyReportSummary(metrics: any): string {
    return `Monthly Summary: ${metrics.totalPurchases} total purchases, $${metrics.totalVolume.toLocaleString()} volume`;
  }

  private async sendReport(report: any): Promise<void> {
    // In production, implement actual report sending
    logger.info(`Report ready to send: ${report.type} report for ${report.date || report.weekOf || report.month}`);
  }

  private handleAlert(alert: any): void {
    logger.warn(`ALERT: ${alert.type} - ${alert.message}`, {
      severity: alert.severity,
      metrics: alert.metrics
    });

    // In production, send alert notifications
  }

  private handleDailyReport(report: any): void {
    logger.info(`Daily report generated for ${report.date}`);
  }
}

// Main execution
async function main(): Promise<void> {
  const config: SetupConfig = {
    enableRealTimeMonitoring: true,
    enableOptimizationEngine: true,
    alertingThresholds: {
      errorRate: 0.05, // 5%
      responseTime: 2000, // 2 seconds
      conversionRate: 0.02 // 2%
    },
    monitoringInterval: 5, // 5 minutes
    reportingSchedule: {
      daily: true,
      weekly: true,
      monthly: true
    }
  };

  const setup = new LDAOPostLaunchSetup(config);
  
  try {
    await setup.initialize();
    logger.info('LDAO post-launch monitoring is now active');
  } catch (error) {
    logger.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { LDAOPostLaunchSetup, SetupConfig };