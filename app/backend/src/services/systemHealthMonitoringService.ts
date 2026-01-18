import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { gracefulDegradationService } from './gracefulDegradationService';
import { circuitBreakerService } from './circuitBreakerService';

export interface HealthMetrics {
  timestamp: Date;
  systemLoad: {
    cpu: number;
    memory: number;
    heap: NodeJS.MemoryUsage;
  };
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'degraded' | 'failed';
      responseTime: number;
      errorRate: number;
      throughput: number;
    };
  };
  circuitBreakers: {
    [breakerName: string]: {
      state: 'closed' | 'open' | 'half-open';
      failureCount: number;
      successCount: number;
    };
  };
  degradationState: {
    mode: 'normal' | 'degraded' | 'emergency';
    reason: string;
    affectedServices: string[];
  };
}

export interface AlertRule {
  name: string;
  condition: (metrics: HealthMetrics) => boolean;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  cooldownMs: number;
  lastTriggered?: Date;
}

export interface SystemAlert {
  id: string;
  rule: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metrics: Partial<HealthMetrics>;
  acknowledged: boolean;
}

/**
 * System health monitoring service for AI content moderation
 * Monitors system health, triggers alerts, and manages automatic recovery
 */
export class SystemHealthMonitoringService extends EventEmitter {
  private metrics: HealthMetrics[] = [];
  private alerts: SystemAlert[] = [];
  private alertRules: AlertRule[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private recoveryInterval?: NodeJS.Timeout;
  private readonly maxMetricsHistory = 1000;
  private readonly monitoringIntervalMs = 30000; // 30 seconds
  private readonly recoveryIntervalMs = 300000; // 5 minutes

  constructor() {
    super();
    this.setupDefaultAlertRules();
    this.startMonitoring();
    this.startRecoveryProcess();
  }

  /**
   * Start system monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.processMetrics(metrics);
        this.checkAlertRules(metrics);
      } catch (error) {
        safeLogger.error('Error collecting system metrics:', error);
        this.emit('monitoringError', { error: (error as Error).message });
      }
    }, this.monitoringIntervalMs);

    this.emit('monitoringStarted');
  }

  /**
   * Stop system monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = undefined;
    }

    this.emit('monitoringStopped');
  }

  /**
   * Collect current system metrics
   */
  async collectMetrics(): Promise<HealthMetrics> {
    const systemHealth = gracefulDegradationService.getSystemHealth();
    const circuitBreakerStats = circuitBreakerService.getAllStates();

    // Collect system load metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const os = require('os');
    const totalSystemMemory = os.totalmem();

    // Convert CPU usage to percentage (simplified)
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

    // Build services metrics
    const services: HealthMetrics['services'] = {};
    systemHealth.services.forEach(service => {
      services[service.name] = {
        status: service.status,
        responseTime: service.responseTime,
        errorRate: service.errorRate,
        throughput: this.calculateThroughput(service.name)
      };
    });

    // Build circuit breaker metrics
    const circuitBreakers: HealthMetrics['circuitBreakers'] = {};
    for (const [name, stats] of Object.entries(circuitBreakerStats)) {
      circuitBreakers[name] = {
        state: stats.state,
        failureCount: stats.failureCount,
        successCount: stats.successCount
      };
    }

    return {
      timestamp: new Date(),
      systemLoad: {
        cpu: cpuPercent,
        memory: (memoryUsage.rss / totalSystemMemory) * 100,
        heap: memoryUsage
      },
      services,
      circuitBreakers,
      degradationState: {
        mode: systemHealth.degradationState.mode,
        reason: systemHealth.degradationState.reason,
        affectedServices: [
          ...systemHealth.degradationState.failedServices,
          ...systemHealth.degradationState.degradedServices
        ]
      }
    };
  }

  /**
   * Process collected metrics
   */
  private processMetrics(metrics: HealthMetrics): void {
    // Store metrics with history limit
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Emit metrics for external consumers
    this.emit('metricsCollected', metrics);

    // Log significant changes
    if (this.metrics.length > 1) {
      const previousMetrics = this.metrics[this.metrics.length - 2];
      this.detectSignificantChanges(previousMetrics, metrics);
    }
  }

  /**
   * Check alert rules against current metrics
   */
  private checkAlertRules(metrics: HealthMetrics): void {
    const now = new Date();

    this.alertRules.forEach(rule => {
      // Check cooldown period
      if (rule.lastTriggered) {
        const timeSinceLastTrigger = now.getTime() - rule.lastTriggered.getTime();
        if (timeSinceLastTrigger < rule.cooldownMs) {
          return;
        }
      }

      // Check rule condition
      if (rule.condition(metrics)) {
        const alert = this.createAlert(rule, metrics);
        this.triggerAlert(alert);
        rule.lastTriggered = now;
      }
    });
  }

  /**
   * Create alert from rule and metrics
   */
  private createAlert(rule: AlertRule, metrics: HealthMetrics): SystemAlert {
    return {
      id: this.generateAlertId(),
      rule: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: new Date(),
      metrics: {
        timestamp: metrics.timestamp,
        systemLoad: metrics.systemLoad,
        degradationState: metrics.degradationState
      },
      acknowledged: false
    };
  }

  /**
   * Trigger alert and handle response
   */
  private triggerAlert(alert: SystemAlert): void {
    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    this.emit('alertTriggered', alert);

    // Handle critical alerts with automatic actions
    if (alert.severity === 'critical') {
      this.handleCriticalAlert(alert);
    }

    safeLogger.info(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
  }

  /**
   * Handle critical alerts with automatic actions
   */
  private async handleCriticalAlert(alert: SystemAlert): Promise<void> {
    this.emit('criticalAlertHandling', alert);

    try {
      // Attempt automatic recovery based on alert type
      if (alert.rule.includes('service-failure')) {
        await this.handleServiceFailure(alert);
      } else if (alert.rule.includes('memory-critical')) {
        await this.handleMemoryPressure(alert);
      } else if (alert.rule.includes('degradation-emergency')) {
        await this.handleEmergencyDegradation(alert);
      }
    } catch (error) {
      safeLogger.error('Error handling critical alert:', error);
      this.emit('criticalAlertHandlingFailed', {
        alert,
        error: (error as Error).message
      });
    }
  }

  /**
   * Handle service failure alerts
   */
  private async handleServiceFailure(alert: SystemAlert): Promise<void> {
    safeLogger.info('🔧 Attempting automatic service recovery...');
    
    // Attempt to recover failed services
    const recoverySuccess = await gracefulDegradationService.attemptRecovery();
    
    if (recoverySuccess) {
      this.emit('automaticRecoverySuccess', { alert });
      safeLogger.info('✅ Automatic service recovery successful');
    } else {
      this.emit('automaticRecoveryFailed', { alert });
      safeLogger.info('❌ Automatic service recovery failed');
    }
  }

  /**
   * Handle memory pressure alerts
   */
  private async handleMemoryPressure(alert: SystemAlert): Promise<void> {
    safeLogger.info('🧹 Attempting memory cleanup...');
    
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Clear old metrics
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }
      
      // Clear old alerts
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(-50);
      }
      
      this.emit('memoryCleanupCompleted', { alert });
      safeLogger.info('✅ Memory cleanup completed');
    } catch (error) {
      this.emit('memoryCleanupFailed', { alert, error: (error as Error).message });
      safeLogger.info('❌ Memory cleanup failed:', error);
    }
  }

  /**
   * Handle emergency degradation alerts
   */
  private async handleEmergencyDegradation(alert: SystemAlert): Promise<void> {
    safeLogger.info('🚨 Handling emergency degradation...');
    
    // Force system into safe mode
    gracefulDegradationService.forceDegradedMode('Emergency alert triggered');
    
    // Notify external systems
    this.emit('emergencyModeActivated', { alert });
    
    safeLogger.info('🛡️ Emergency mode activated');
  }

  /**
   * Start automatic recovery process
   */
  private startRecoveryProcess(): void {
    this.recoveryInterval = setInterval(async () => {
      try {
        const systemHealth = gracefulDegradationService.getSystemHealth();
        
        // Only attempt recovery if system is degraded but not in emergency
        if (systemHealth.degradationState.mode === 'degraded') {
          safeLogger.info('🔄 Attempting scheduled recovery...');
          
          const recoverySuccess = await gracefulDegradationService.attemptRecovery();
          
          if (recoverySuccess) {
            this.emit('scheduledRecoverySuccess');
            safeLogger.info('✅ Scheduled recovery successful');
          } else {
            this.emit('scheduledRecoveryFailed');
            safeLogger.info('❌ Scheduled recovery failed');
          }
        }
      } catch (error) {
        safeLogger.error('Error in scheduled recovery:', error);
        this.emit('scheduledRecoveryError', { error: (error as Error).message });
      }
    }, this.recoveryIntervalMs);
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    // Service failure alerts
    this.alertRules.push({
      name: 'service-failure-critical',
      condition: (metrics) => {
        const failedServices = Object.values(metrics.services)
          .filter(service => service.status === 'failed').length;
        const totalServices = Object.keys(metrics.services).length;
        return totalServices > 0 && (failedServices / totalServices) >= 0.5;
      },
      severity: 'critical',
      message: 'Critical: 50% or more services have failed',
      cooldownMs: 300000 // 5 minutes
    });

    this.alertRules.push({
      name: 'service-failure-warning',
      condition: (metrics) => {
        const failedServices = Object.values(metrics.services)
          .filter(service => service.status === 'failed').length;
        // Only alert if there are failed services AND they're critical services (not just external dependencies)
        const criticalFailedServices = Object.values(metrics.services)
          .filter(service => service.status === 'failed' && 
                         !['ENS', 'Ethereum_RPC', 'external_services'].includes(service.name as any))
          .length;
        return criticalFailedServices > 0;
      },
      severity: 'warning',
      message: 'Warning: One or more critical services have failed',
      cooldownMs: 300000 // 5 minutes
    });

    // Memory pressure alerts
    this.alertRules.push({
      name: 'memory-critical',
      condition: (metrics) => metrics.systemLoad.memory > 90,
      severity: 'critical',
      message: 'Critical: Memory usage above 90%',
      cooldownMs: 300000 // 5 minutes
    });

    this.alertRules.push({
      name: 'memory-warning',
      condition: (metrics) => metrics.systemLoad.memory > 80,
      severity: 'warning',
      message: 'Warning: Memory usage above 80%',
      cooldownMs: 120000 // 2 minutes
    });

    // Circuit breaker alerts
    this.alertRules.push({
      name: 'circuit-breaker-open',
      condition: (metrics) => {
        return Object.values(metrics.circuitBreakers)
          .some(breaker => breaker.state === 'open');
      },
      severity: 'warning',
      message: 'Warning: One or more circuit breakers are open',
      cooldownMs: 60000 // 1 minute
    });

    // Degradation state alerts
    this.alertRules.push({
      name: 'degradation-emergency',
      condition: (metrics) => metrics.degradationState.mode === 'emergency',
      severity: 'critical',
      message: 'Critical: System in emergency degradation mode',
      cooldownMs: 600000 // 10 minutes
    });

    this.alertRules.push({
      name: 'degradation-warning',
      condition: (metrics) => metrics.degradationState.mode === 'degraded',
      severity: 'warning',
      message: 'Warning: System in degraded mode',
      cooldownMs: 300000 // 5 minutes
    });

    // Response time alerts
    this.alertRules.push({
      name: 'response-time-critical',
      condition: (metrics) => {
        return Object.values(metrics.services)
          .some(service => service.responseTime > 10000); // 10 seconds
      },
      severity: 'critical',
      message: 'Critical: Service response time above 10 seconds',
      cooldownMs: 180000 // 3 minutes
    });
  }

  /**
   * Detect significant changes between metrics
   */
  private detectSignificantChanges(previous: HealthMetrics, current: HealthMetrics): void {
    // Check for service status changes
    Object.keys(current.services).forEach(serviceName => {
      const currentService = current.services[serviceName];
      const previousService = previous.services[serviceName];
      
      if (previousService && currentService.status !== previousService.status) {
        this.emit('serviceStatusChanged', {
          serviceName,
          previousStatus: previousService.status,
          currentStatus: currentService.status,
          timestamp: current.timestamp
        });
      }
    });

    // Check for degradation state changes
    if (current.degradationState.mode !== previous.degradationState.mode) {
      this.emit('degradationStateChanged', {
        previousMode: previous.degradationState.mode,
        currentMode: current.degradationState.mode,
        reason: current.degradationState.reason,
        timestamp: current.timestamp
      });
    }
  }

  /**
   * Calculate throughput for a service (simplified)
   */
  private calculateThroughput(serviceName: string): number {
    // This would integrate with actual metrics collection
    // For now, return a placeholder value
    return Math.random() * 100;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current system metrics
   */
  getCurrentMetrics(): HealthMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): HealthMetrics[] {
    const actualLimit = limit || this.metrics.length;
    return this.metrics.slice(-actualLimit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit?: number): SystemAlert[] {
    const actualLimit = limit || this.alerts.length;
    return this.alerts.slice(-actualLimit);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    this.emit('alertRuleAdded', rule);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleName: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.name === ruleName);
    if (index !== -1) {
      const removedRule = this.alertRules.splice(index, 1)[0];
      this.emit('alertRuleRemoved', removedRule);
      return true;
    }
    return false;
  }

  /**
   * Get system health summary
   */
  getHealthSummary(): {
    status: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    activeAlerts: number;
    criticalAlerts: number;
    servicesStatus: { healthy: number; degraded: number; failed: number };
    lastUpdate: Date;
  } {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let servicesStatus = { healthy: 0, degraded: 0, failed: 0 };
    
    if (currentMetrics) {
      Object.values(currentMetrics.services).forEach(service => {
        servicesStatus[service.status]++;
      });
      
      if (criticalAlerts.length > 0 || currentMetrics.degradationState.mode === 'emergency') {
        status = 'critical';
      } else if (activeAlerts.length > 0 || currentMetrics.degradationState.mode === 'degraded') {
        status = 'degraded';
      }
    }

    return {
      status,
      uptime: process.uptime(),
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      servicesStatus,
      lastUpdate: currentMetrics?.timestamp || new Date()
    };
  }

  /**
   * Update service health status
   */
  updateServiceHealth(serviceName: string, isHealthy: boolean, responseTime?: number): void {
    gracefulDegradationService.updateServiceHealth(serviceName, isHealthy, responseTime);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

export const systemHealthMonitoringService = new SystemHealthMonitoringService();
