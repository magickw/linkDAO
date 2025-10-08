import { logger } from '../utils/logger';
import { dataOperationMonitoringService } from './dataOperationMonitoringService';

// Alert configuration interface
interface AlertConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownMinutes: number;
  escalationRules?: EscalationRule[];
}

interface AlertCondition {
  type: 'database_error_rate' | 'database_slow_queries' | 'api_error_rate' | 'api_response_time' | 'connection_pool' | 'data_consistency';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
  timeWindowMinutes: number;
  minimumSamples?: number;
}

interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'sms' | 'log' | 'auto_remediation';
  config: Record<string, any>;
  enabled: boolean;
}

interface EscalationRule {
  afterMinutes: number;
  severity: 'high' | 'critical';
  actions: AlertAction[];
}

interface ActiveAlert {
  id: string;
  configId: string;
  name: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggeredAt: Date;
  lastNotifiedAt?: Date;
  escalatedAt?: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata: Record<string, any>;
  notificationsSent: number;
  escalationLevel: number;
}

interface DataConsistencyCheck {
  id: string;
  name: string;
  query: string;
  expectedResult: any;
  tolerance?: number;
  enabled: boolean;
  intervalMinutes: number;
  lastChecked?: Date;
  lastResult?: any;
}

class DataIssueAlertingService {
  private alertConfigs: Map<string, AlertConfig> = new Map();
  private activeAlerts: Map<string, ActiveAlert> = new Map();
  private alertHistory: ActiveAlert[] = [];
  private consistencyChecks: Map<string, DataConsistencyCheck> = new Map();
  private lastConditionChecks: Map<string, Date> = new Map();
  private isRunning = false;

  constructor() {
    this.setupDefaultAlertConfigs();
    this.setupDefaultConsistencyChecks();
    this.startMonitoring();
  }

  // Setup default alert configurations
  private setupDefaultAlertConfigs(): void {
    // Database error rate alert
    this.addAlertConfig({
      id: 'db_high_error_rate',
      name: 'High Database Error Rate',
      description: 'Database error rate exceeds acceptable threshold',
      enabled: true,
      severity: 'high',
      conditions: [{
        type: 'database_error_rate',
        operator: 'gt',
        threshold: 5, // 5%
        timeWindowMinutes: 5,
        minimumSamples: 10
      }],
      actions: [
        {
          type: 'log',
          config: { level: 'error' },
          enabled: true
        },
        {
          type: 'webhook',
          config: { url: process.env.ALERT_WEBHOOK_URL },
          enabled: !!process.env.ALERT_WEBHOOK_URL
        }
      ],
      cooldownMinutes: 10,
      escalationRules: [{
        afterMinutes: 15,
        severity: 'critical',
        actions: [{
          type: 'slack',
          config: { webhook: process.env.ALERT_SLACK_WEBHOOK },
          enabled: !!process.env.ALERT_SLACK_WEBHOOK
        }]
      }]
    });

    // Critical database error rate alert
    this.addAlertConfig({
      id: 'db_critical_error_rate',
      name: 'Critical Database Error Rate',
      description: 'Database error rate is critically high',
      enabled: true,
      severity: 'critical',
      conditions: [{
        type: 'database_error_rate',
        operator: 'gt',
        threshold: 15, // 15%
        timeWindowMinutes: 3,
        minimumSamples: 5
      }],
      actions: [
        {
          type: 'log',
          config: { level: 'error' },
          enabled: true
        },
        {
          type: 'webhook',
          config: { url: process.env.ALERT_WEBHOOK_URL },
          enabled: !!process.env.ALERT_WEBHOOK_URL
        },
        {
          type: 'slack',
          config: { webhook: process.env.ALERT_SLACK_WEBHOOK },
          enabled: !!process.env.ALERT_SLACK_WEBHOOK
        }
      ],
      cooldownMinutes: 5
    });

    // Slow database queries alert
    this.addAlertConfig({
      id: 'db_slow_queries',
      name: 'High Number of Slow Database Queries',
      description: 'Too many slow database queries detected',
      enabled: true,
      severity: 'medium',
      conditions: [{
        type: 'database_slow_queries',
        operator: 'gt',
        threshold: 10, // 10 slow queries
        timeWindowMinutes: 5,
        minimumSamples: 1
      }],
      actions: [
        {
          type: 'log',
          config: { level: 'warn' },
          enabled: true
        },
        {
          type: 'webhook',
          config: { url: process.env.ALERT_WEBHOOK_URL },
          enabled: !!process.env.ALERT_WEBHOOK_URL
        }
      ],
      cooldownMinutes: 15,
      escalationRules: [{
        afterMinutes: 30,
        severity: 'high',
        actions: [{
          type: 'slack',
          config: { webhook: process.env.ALERT_SLACK_WEBHOOK },
          enabled: !!process.env.ALERT_SLACK_WEBHOOK
        }]
      }]
    });

    // API error rate alert
    this.addAlertConfig({
      id: 'api_high_error_rate',
      name: 'High API Error Rate',
      description: 'API error rate exceeds acceptable threshold',
      enabled: true,
      severity: 'high',
      conditions: [{
        type: 'api_error_rate',
        operator: 'gt',
        threshold: 10, // 10%
        timeWindowMinutes: 5,
        minimumSamples: 20
      }],
      actions: [
        {
          type: 'log',
          config: { level: 'error' },
          enabled: true
        },
        {
          type: 'webhook',
          config: { url: process.env.ALERT_WEBHOOK_URL },
          enabled: !!process.env.ALERT_WEBHOOK_URL
        }
      ],
      cooldownMinutes: 10
    });

    // API response time alert
    this.addAlertConfig({
      id: 'api_slow_response',
      name: 'Slow API Response Times',
      description: 'API response times are consistently slow',
      enabled: true,
      severity: 'medium',
      conditions: [{
        type: 'api_response_time',
        operator: 'gt',
        threshold: 3000, // 3 seconds
        timeWindowMinutes: 10,
        minimumSamples: 10
      }],
      actions: [
        {
          type: 'log',
          config: { level: 'warn' },
          enabled: true
        },
        {
          type: 'webhook',
          config: { url: process.env.ALERT_WEBHOOK_URL },
          enabled: !!process.env.ALERT_WEBHOOK_URL
        }
      ],
      cooldownMinutes: 20
    });

    // Connection pool alert
    this.addAlertConfig({
      id: 'connection_pool_exhausted',
      name: 'Database Connection Pool Exhausted',
      description: 'Database connection pool usage is critically high',
      enabled: true,
      severity: 'critical',
      conditions: [{
        type: 'connection_pool',
        operator: 'gt',
        threshold: 90, // 90% usage
        timeWindowMinutes: 2,
        minimumSamples: 1
      }],
      actions: [
        {
          type: 'log',
          config: { level: 'error' },
          enabled: true
        },
        {
          type: 'webhook',
          config: { url: process.env.ALERT_WEBHOOK_URL },
          enabled: !!process.env.ALERT_WEBHOOK_URL
        },
        {
          type: 'slack',
          config: { webhook: process.env.ALERT_SLACK_WEBHOOK },
          enabled: !!process.env.ALERT_SLACK_WEBHOOK
        },
        {
          type: 'auto_remediation',
          config: { action: 'restart_connection_pool' },
          enabled: process.env.AUTO_REMEDIATION_ENABLED === 'true'
        }
      ],
      cooldownMinutes: 5
    });
  }

  // Setup default data consistency checks
  private setupDefaultConsistencyChecks(): void {
    // User count consistency
    this.addConsistencyCheck({
      id: 'user_count_consistency',
      name: 'User Count Consistency',
      query: 'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL',
      expectedResult: { type: 'range', min: 0, max: 1000000 },
      enabled: true,
      intervalMinutes: 30
    });

    // Order total consistency
    this.addConsistencyCheck({
      id: 'order_total_consistency',
      name: 'Order Total Consistency',
      query: `
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
        FROM orders
      `,
      expectedResult: { type: 'validation', rules: ['pending_orders >= 0', 'completed_orders >= 0'] },
      enabled: true,
      intervalMinutes: 15
    });

    // Product availability consistency
    this.addConsistencyCheck({
      id: 'product_availability_consistency',
      name: 'Product Availability Consistency',
      query: 'SELECT COUNT(*) as count FROM products WHERE quantity < 0',
      expectedResult: { type: 'exact', value: 0 },
      tolerance: 0,
      enabled: true,
      intervalMinutes: 10
    });
  }

  // Add alert configuration
  addAlertConfig(config: AlertConfig): void {
    this.alertConfigs.set(config.id, config);
    logger.info(`Alert configuration added: ${config.name}`, { configId: config.id });
  }

  // Add data consistency check
  addConsistencyCheck(check: DataConsistencyCheck): void {
    this.consistencyChecks.set(check.id, check);
    logger.info(`Data consistency check added: ${check.name}`, { checkId: check.id });
  }

  // Start monitoring
  private startMonitoring(): void {
    if (this.isRunning || process.env.NODE_ENV === 'test') {
      return;
    }

    this.isRunning = true;

    // Check alert conditions every minute
    setInterval(() => {
      this.checkAlertConditions();
    }, 60000);

    // Check data consistency every 5 minutes
    setInterval(() => {
      this.runConsistencyChecks();
    }, 300000);

    // Process escalations every 2 minutes
    setInterval(() => {
      this.processEscalations();
    }, 120000);

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000);

    logger.info('Data issue alerting service started');
  }

  // Check all alert conditions
  private async checkAlertConditions(): Promise<void> {
    for (const [configId, config] of this.alertConfigs.entries()) {
      if (!config.enabled) continue;

      try {
        await this.checkConfigConditions(config);
      } catch (error) {
        logger.error(`Failed to check alert conditions for ${configId}`, error);
      }
    }
  }

  // Check conditions for a specific alert configuration
  private async checkConfigConditions(config: AlertConfig): Promise<void> {
    const now = new Date();
    const lastCheck = this.lastConditionChecks.get(config.id);
    
    // Check cooldown
    if (lastCheck && (now.getTime() - lastCheck.getTime()) < (config.cooldownMinutes * 60 * 1000)) {
      const activeAlert = Array.from(this.activeAlerts.values()).find(a => a.configId === config.id);
      if (activeAlert && !activeAlert.resolvedAt) {
        return; // Still in cooldown and alert is active
      }
    }

    // Check all conditions
    let allConditionsMet = true;
    const conditionResults: any[] = [];

    for (const condition of config.conditions) {
      const result = await this.evaluateCondition(condition);
      conditionResults.push(result);
      
      if (!result.met) {
        allConditionsMet = false;
        break;
      }
    }

    if (allConditionsMet) {
      await this.triggerAlert(config, conditionResults);
      this.lastConditionChecks.set(config.id, now);
    } else {
      // Check if we should resolve an existing alert
      await this.checkAlertResolution(config, conditionResults);
    }
  }

  // Evaluate a single condition
  private async evaluateCondition(condition: AlertCondition): Promise<{ met: boolean; value: number; metadata: any }> {
    const metrics = dataOperationMonitoringService.getMetrics();
    const now = Date.now();
    const timeWindowMs = condition.timeWindowMinutes * 60 * 1000;

    switch (condition.type) {
      case 'database_error_rate': {
        const dbMetrics = metrics.database.overall;
        if (dbMetrics.queryCount < (condition.minimumSamples || 1)) {
          return { met: false, value: 0, metadata: { reason: 'insufficient_samples' } };
        }
        
        const errorRate = (dbMetrics.errorCount / dbMetrics.queryCount) * 100;
        const met = this.compareValues(errorRate, condition.operator, condition.threshold);
        
        return {
          met,
          value: errorRate,
          metadata: {
            errorCount: dbMetrics.errorCount,
            queryCount: dbMetrics.queryCount,
            threshold: condition.threshold
          }
        };
      }

      case 'database_slow_queries': {
        const dbMetrics = metrics.database.overall;
        const met = this.compareValues(dbMetrics.slowQueryCount, condition.operator, condition.threshold);
        
        return {
          met,
          value: dbMetrics.slowQueryCount,
          metadata: {
            slowQueryCount: dbMetrics.slowQueryCount,
            totalQueries: dbMetrics.queryCount,
            threshold: condition.threshold
          }
        };
      }

      case 'api_error_rate': {
        const apiEndpoints = Array.from(metrics.api.endpoints.values());
        const totalRequests = apiEndpoints.reduce((sum, e) => sum + e.requestCount, 0);
        const totalErrors = apiEndpoints.reduce((sum, e) => sum + e.errorCount, 0);
        
        if (totalRequests < (condition.minimumSamples || 1)) {
          return { met: false, value: 0, metadata: { reason: 'insufficient_samples' } };
        }
        
        const errorRate = (totalErrors / totalRequests) * 100;
        const met = this.compareValues(errorRate, condition.operator, condition.threshold);
        
        return {
          met,
          value: errorRate,
          metadata: {
            totalErrors,
            totalRequests,
            threshold: condition.threshold
          }
        };
      }

      case 'api_response_time': {
        const apiEndpoints = Array.from(metrics.api.endpoints.values());
        if (apiEndpoints.length === 0) {
          return { met: false, value: 0, metadata: { reason: 'no_endpoints' } };
        }
        
        const avgResponseTime = apiEndpoints.reduce((sum, e) => sum + e.averageResponseTime, 0) / apiEndpoints.length;
        const met = this.compareValues(avgResponseTime, condition.operator, condition.threshold);
        
        return {
          met,
          value: avgResponseTime,
          metadata: {
            averageResponseTime: avgResponseTime,
            endpointCount: apiEndpoints.length,
            threshold: condition.threshold
          }
        };
      }

      case 'connection_pool': {
        const dbMetrics = metrics.database.overall;
        if (dbMetrics.connectionCount === 0) {
          return { met: false, value: 0, metadata: { reason: 'no_connection_data' } };
        }
        
        const usage = (dbMetrics.activeConnections / dbMetrics.connectionCount) * 100;
        const met = this.compareValues(usage, condition.operator, condition.threshold);
        
        return {
          met,
          value: usage,
          metadata: {
            activeConnections: dbMetrics.activeConnections,
            totalConnections: dbMetrics.connectionCount,
            threshold: condition.threshold
          }
        };
      }

      default:
        return { met: false, value: 0, metadata: { reason: 'unknown_condition_type' } };
    }
  }

  // Compare values based on operator
  private compareValues(value: number, operator: AlertCondition['operator'], threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'neq': return value !== threshold;
      default: return false;
    }
  }

  // Trigger an alert
  private async triggerAlert(config: AlertConfig, conditionResults: any[]): Promise<void> {
    const alertId = `${config.id}_${Date.now()}`;
    const message = this.generateAlertMessage(config, conditionResults);

    const alert: ActiveAlert = {
      id: alertId,
      configId: config.id,
      name: config.name,
      message,
      severity: config.severity,
      triggeredAt: new Date(),
      metadata: {
        conditions: conditionResults,
        config: {
          id: config.id,
          description: config.description
        }
      },
      notificationsSent: 0,
      escalationLevel: 0
    };

    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Execute alert actions
    await this.executeAlertActions(alert, config.actions);

    logger.error(`Alert triggered: ${config.name}`, {
      alertId,
      severity: config.severity,
      message,
      conditions: conditionResults
    });
  }

  // Generate alert message
  private generateAlertMessage(config: AlertConfig, conditionResults: any[]): string {
    const condition = conditionResults[0]; // Use first condition for message
    
    switch (config.id) {
      case 'db_high_error_rate':
      case 'db_critical_error_rate':
        return `Database error rate is ${condition.value.toFixed(2)}% (threshold: ${condition.metadata.threshold}%)`;
      
      case 'db_slow_queries':
        return `${condition.value} slow database queries detected (threshold: ${condition.metadata.threshold})`;
      
      case 'api_high_error_rate':
        return `API error rate is ${condition.value.toFixed(2)}% (threshold: ${condition.metadata.threshold}%)`;
      
      case 'api_slow_response':
        return `Average API response time is ${condition.value.toFixed(0)}ms (threshold: ${condition.metadata.threshold}ms)`;
      
      case 'connection_pool_exhausted':
        return `Database connection pool usage is ${condition.value.toFixed(1)}% (threshold: ${condition.metadata.threshold}%)`;
      
      default:
        return `Alert condition met: ${config.description}`;
    }
  }

  // Execute alert actions
  private async executeAlertActions(alert: ActiveAlert, actions: AlertAction[]): Promise<void> {
    for (const action of actions) {
      if (!action.enabled) continue;

      try {
        await this.executeAction(alert, action);
        alert.notificationsSent++;
      } catch (error) {
        logger.error(`Failed to execute alert action: ${action.type}`, {
          alertId: alert.id,
          actionType: action.type,
          error: error.message
        });
      }
    }

    alert.lastNotifiedAt = new Date();
  }

  // Execute a single action
  private async executeAction(alert: ActiveAlert, action: AlertAction): Promise<void> {
    switch (action.type) {
      case 'log':
        const level = action.config.level || 'error';
        logger[level](`ALERT: ${alert.name}`, {
          alertId: alert.id,
          severity: alert.severity,
          message: alert.message,
          metadata: alert.metadata
        });
        break;

      case 'webhook':
        if (action.config.url) {
          await this.sendWebhookNotification(alert, action.config);
        }
        break;

      case 'slack':
        if (action.config.webhook) {
          await this.sendSlackNotification(alert, action.config);
        }
        break;

      case 'email':
        if (action.config.recipients) {
          await this.sendEmailNotification(alert, action.config);
        }
        break;

      case 'auto_remediation':
        await this.executeAutoRemediation(alert, action.config);
        break;

      default:
        logger.warn(`Unknown alert action type: ${action.type}`);
    }
  }

  // Send webhook notification
  private async sendWebhookNotification(alert: ActiveAlert, config: any): Promise<void> {
    const payload = {
      alert: {
        id: alert.id,
        name: alert.name,
        message: alert.message,
        severity: alert.severity,
        triggeredAt: alert.triggeredAt.toISOString(),
        metadata: alert.metadata
      },
      service: 'LinkDAO Marketplace',
      environment: process.env.NODE_ENV || 'development'
    };

    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LinkDAO-Alert-System/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  // Send Slack notification
  private async sendSlackNotification(alert: ActiveAlert, config: any): Promise<void> {
    const color = alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'good';
    const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'high' ? '⚠️' : 'ℹ️';

    const payload = {
      text: `${emoji} ${alert.severity.toUpperCase()} Alert: ${alert.name}`,
      attachments: [
        {
          color,
          title: alert.message,
          fields: [
            {
              title: 'Alert ID',
              value: alert.id,
              short: true
            },
            {
              title: 'Triggered At',
              value: alert.triggeredAt.toISOString(),
              short: true
            },
            {
              title: 'Environment',
              value: process.env.NODE_ENV || 'development',
              short: true
            }
          ]
        }
      ]
    };

    const response = await fetch(config.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status}`);
    }
  }

  // Send email notification (placeholder)
  private async sendEmailNotification(alert: ActiveAlert, config: any): Promise<void> {
    // This would integrate with an email service
    logger.info('Email notification would be sent', {
      alertId: alert.id,
      recipients: config.recipients,
      subject: `Alert: ${alert.name}`,
      message: alert.message
    });
  }

  // Execute auto-remediation
  private async executeAutoRemediation(alert: ActiveAlert, config: any): Promise<void> {
    logger.info(`Executing auto-remediation: ${config.action}`, {
      alertId: alert.id,
      action: config.action
    });

    switch (config.action) {
      case 'restart_connection_pool':
        // This would restart the database connection pool
        logger.info('Auto-remediation: Connection pool restart triggered');
        break;
      
      default:
        logger.warn(`Unknown auto-remediation action: ${config.action}`);
    }
  }

  // Run data consistency checks
  private async runConsistencyChecks(): Promise<void> {
    for (const [checkId, check] of this.consistencyChecks.entries()) {
      if (!check.enabled) continue;

      try {
        await this.runConsistencyCheck(check);
      } catch (error) {
        logger.error(`Failed to run consistency check: ${checkId}`, error);
      }
    }
  }

  // Run a single consistency check
  private async runConsistencyCheck(check: DataConsistencyCheck): Promise<void> {
    const now = new Date();
    
    // Check if it's time to run this check
    if (check.lastChecked) {
      const timeSinceLastCheck = now.getTime() - check.lastChecked.getTime();
      const intervalMs = check.intervalMinutes * 60 * 1000;
      
      if (timeSinceLastCheck < intervalMs) {
        return;
      }
    }

    // This would execute the actual database query
    // For now, we'll simulate the check
    const result = await this.executeConsistencyQuery(check.query);
    
    check.lastChecked = now;
    check.lastResult = result;

    // Validate the result
    const isValid = this.validateConsistencyResult(result, check.expectedResult, check.tolerance);
    
    if (!isValid) {
      await this.triggerConsistencyAlert(check, result);
    }

    logger.debug(`Consistency check completed: ${check.name}`, {
      checkId: check.id,
      result,
      isValid
    });
  }

  // Execute consistency query (placeholder)
  private async executeConsistencyQuery(query: string): Promise<any> {
    // This would execute the actual database query
    // For now, return a mock result
    return { count: 100 };
  }

  // Validate consistency result
  private validateConsistencyResult(result: any, expected: any, tolerance?: number): boolean {
    if (expected.type === 'exact') {
      return result.count === expected.value;
    }
    
    if (expected.type === 'range') {
      return result.count >= expected.min && result.count <= expected.max;
    }
    
    if (expected.type === 'validation') {
      // This would validate against the rules
      return true; // Simplified
    }
    
    return true;
  }

  // Trigger consistency alert
  private async triggerConsistencyAlert(check: DataConsistencyCheck, result: any): Promise<void> {
    const alertConfig: AlertConfig = {
      id: `consistency_${check.id}`,
      name: `Data Consistency Issue: ${check.name}`,
      description: `Data consistency check failed for ${check.name}`,
      enabled: true,
      severity: 'high',
      conditions: [],
      actions: [
        {
          type: 'log',
          config: { level: 'error' },
          enabled: true
        },
        {
          type: 'webhook',
          config: { url: process.env.ALERT_WEBHOOK_URL },
          enabled: !!process.env.ALERT_WEBHOOK_URL
        }
      ],
      cooldownMinutes: 30
    };

    const conditionResults = [{
      met: true,
      value: result.count || 0,
      metadata: {
        checkId: check.id,
        checkName: check.name,
        result,
        expectedResult: check.expectedResult
      }
    }];

    await this.triggerAlert(alertConfig, conditionResults);
  }

  // Process escalations
  private async processEscalations(): Promise<void> {
    const now = new Date();

    for (const alert of this.activeAlerts.values()) {
      if (alert.resolvedAt || alert.escalatedAt) continue;

      const config = this.alertConfigs.get(alert.configId);
      if (!config?.escalationRules) continue;

      for (const rule of config.escalationRules) {
        const timeSinceTrigger = now.getTime() - alert.triggeredAt.getTime();
        const escalationTime = rule.afterMinutes * 60 * 1000;

        if (timeSinceTrigger >= escalationTime) {
          await this.escalateAlert(alert, rule);
          break;
        }
      }
    }
  }

  // Escalate an alert
  private async escalateAlert(alert: ActiveAlert, rule: EscalationRule): Promise<void> {
    alert.escalatedAt = new Date();
    alert.escalationLevel++;
    alert.severity = rule.severity;

    await this.executeAlertActions(alert, rule.actions);

    logger.warn(`Alert escalated: ${alert.name}`, {
      alertId: alert.id,
      newSeverity: rule.severity,
      escalationLevel: alert.escalationLevel
    });
  }

  // Check if alerts should be resolved
  private async checkAlertResolution(config: AlertConfig, conditionResults: any[]): Promise<void> {
    const activeAlert = Array.from(this.activeAlerts.values()).find(a => 
      a.configId === config.id && !a.resolvedAt
    );

    if (activeAlert) {
      // Check if conditions are no longer met
      const allConditionsResolved = conditionResults.every(result => !result.met);
      
      if (allConditionsResolved) {
        await this.resolveAlert(activeAlert.id);
      }
    }
  }

  // Resolve an alert
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.resolvedAt) {
      return false;
    }

    alert.resolvedAt = new Date();
    this.activeAlerts.delete(alertId);

    logger.info(`Alert resolved: ${alert.name}`, {
      alertId,
      resolvedAt: alert.resolvedAt,
      duration: alert.resolvedAt.getTime() - alert.triggeredAt.getTime()
    });

    return true;
  }

  // Acknowledge an alert
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.acknowledgedAt) {
      return false;
    }

    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    logger.info(`Alert acknowledged: ${alert.name}`, {
      alertId,
      acknowledgedBy,
      acknowledgedAt: alert.acknowledgedAt
    });

    return true;
  }

  // Clean up old alerts
  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    this.alertHistory = this.alertHistory.filter(alert => 
      alert.triggeredAt.getTime() > cutoff
    );

    logger.debug('Old alerts cleaned up', {
      remainingAlerts: this.alertHistory.length
    });
  }

  // Get active alerts
  getActiveAlerts(): ActiveAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  // Get alert history
  getAlertHistory(limit: number = 100): ActiveAlert[] {
    return this.alertHistory.slice(0, limit);
  }

  // Get alert configurations
  getAlertConfigs(): AlertConfig[] {
    return Array.from(this.alertConfigs.values());
  }

  // Get consistency checks
  getConsistencyChecks(): DataConsistencyCheck[] {
    return Array.from(this.consistencyChecks.values());
  }

  // Stop monitoring (for testing)
  stop(): void {
    this.isRunning = false;
  }
}

// Export singleton instance
export const dataIssueAlertingService = new DataIssueAlertingService();

// Export types
export type {
  AlertConfig,
  AlertCondition,
  AlertAction,
  EscalationRule,
  ActiveAlert,
  DataConsistencyCheck
};