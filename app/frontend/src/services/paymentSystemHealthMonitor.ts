/**
 * Payment System Health Monitor
 * Monitors gas fee estimation accuracy, service availability, and prioritization performance
 */

import { 
  PaymentMethod,
  PaymentMethodType,
  CostEstimate,
  NetworkConditions,
  PrioritizationResult
} from '../types/paymentPrioritization';
import { gasFeeEstimationService } from './gasFeeEstimationService';
import { exchangeRateService } from './exchangeRateService';

interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  threshold: {
    warning: number;
    critical: number;
  };
  lastUpdated: Date;
  trend?: 'improving' | 'stable' | 'degrading';
}

interface ServiceHealthStatus {
  serviceName: string;
  isAvailable: boolean;
  responseTime: number; // milliseconds
  errorRate: number; // percentage
  lastCheck: Date;
  consecutiveFailures: number;
  uptime: number; // percentage over last 24h
}

interface GasEstimationAccuracy {
  chainId: number;
  estimatedGasPrice: bigint;
  actualGasPrice?: bigint;
  accuracyPercentage: number;
  estimationTime: Date;
  confirmationTime?: Date;
  source: string;
}

interface PrioritizationPerformance {
  sessionId: string;
  methodCount: number;
  processingTimeMs: number;
  cacheHitRate: number;
  accuracyScore: number; // 0-1 based on user selections
  timestamp: Date;
}

interface SystemAlert {
  id: string;
  type: 'service_down' | 'high_error_rate' | 'slow_response' | 'accuracy_degraded' | 'performance_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  affectedServices: string[];
  timestamp: Date;
  isResolved: boolean;
  resolvedAt?: Date;
}

export class PaymentSystemHealthMonitor {
  private healthMetrics: Map<string, HealthMetric> = new Map();
  private serviceStatuses: Map<string, ServiceHealthStatus> = new Map();
  private gasAccuracyHistory: GasEstimationAccuracy[] = [];
  private performanceHistory: PrioritizationPerformance[] = [];
  private activeAlerts: Map<string, SystemAlert> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  // Configuration
  private readonly MONITORING_INTERVAL = 60000; // 1 minute
  private readonly HISTORY_RETENTION_HOURS = 24;
  private readonly MAX_HISTORY_ENTRIES = 1000;

  constructor() {
    this.initializeHealthMetrics();
    this.initializeServiceStatuses();
  }

  /**
   * Start system health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    console.log('Starting payment system health monitoring');
    this.isMonitoring = true;

    // Initial health check
    this.performHealthCheck();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.MONITORING_INTERVAL);

    this.emit('monitoring_started', { timestamp: new Date() });
  }

  /**
   * Stop system health monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('Stopping payment system health monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoring_stopped', { timestamp: new Date() });
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Check gas fee estimation services
      await this.checkGasFeeEstimationHealth();

      // Check exchange rate services
      await this.checkExchangeRateServiceHealth();

      // Check prioritization performance
      await this.checkPrioritizationPerformance();

      // Update overall system health
      this.updateOverallSystemHealth();

      // Check for alerts
      this.checkForAlerts();

      // Cleanup old data
      this.cleanupOldData();

      this.emit('health_check_completed', {
        timestamp: new Date(),
        metrics: this.getHealthSummary()
      });

    } catch (error) {
      console.error('Health check failed:', error);
      this.recordSystemError('health_check_failure', error);
    }
  }

  /**
   * Check gas fee estimation service health
   */
  private async checkGasFeeEstimationHealth(): Promise<void> {
    const chains = [1, 137, 42161, 11155111]; // Test major chains
    const results: { chainId: number; success: boolean; responseTime: number; error?: string }[] = [];

    for (const chainId of chains) {
      const startTime = Date.now();
      try {
        const estimate = await gasFeeEstimationService.getGasEstimate(chainId, 'erc20Transfer');
        const responseTime = Date.now() - startTime;
        
        results.push({
          chainId,
          success: true,
          responseTime
        });

        // Record gas estimation accuracy if we have historical data
        // Convert GasEstimate to CostEstimate for compatibility
        const costEstimate = {
          totalCost: Number(estimate.totalCostUSD),
          baseCost: Number(estimate.totalCostUSD),
          gasFee: Number(estimate.totalCostUSD),
          estimatedTime: 60, // Default 1 minute
          confidence: estimate.confidence,
          currency: 'USD',
          breakdown: {
            amount: Number(estimate.totalCostUSD),
            gasLimit: estimate.gasLimit,
            gasPrice: estimate.gasPrice
          }
        };
        this.recordGasEstimationAccuracy(chainId, costEstimate, 'health_check');

      } catch (error) {
        const responseTime = Date.now() - startTime;
        results.push({
          chainId,
          success: false,
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update gas fee service health metrics
    const successRate = (results.filter(r => r.success).length / results.length) * 100;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    this.updateHealthMetric('gas_fee_service_availability', successRate, '%', {
      warning: 90,
      critical: 75
    });

    this.updateHealthMetric('gas_fee_service_response_time', avgResponseTime, 'ms', {
      warning: 2000,
      critical: 5000
    });

    // Update individual service statuses
    this.updateServiceStatus('gas_fee_estimation', {
      isAvailable: successRate > 50,
      responseTime: avgResponseTime,
      errorRate: 100 - successRate,
      consecutiveFailures: successRate === 0 ? this.getConsecutiveFailures('gas_fee_estimation') + 1 : 0
    });
  }

  /**
   * Check exchange rate service health
   */
  private async checkExchangeRateServiceHealth(): Promise<void> {
    const currencies = ['ETH', 'USDC', 'USDT', 'MATIC'];
    const results: { currency: string; success: boolean; responseTime: number; error?: string }[] = [];

    for (const currency of currencies) {
      const startTime = Date.now();
      try {
        const rate = await exchangeRateService.getExchangeRate(currency, 'USD');
        const responseTime = Date.now() - startTime;
        
        results.push({
          currency,
          success: !!rate,
          responseTime
        });

      } catch (error) {
        const responseTime = Date.now() - startTime;
        results.push({
          currency,
          success: false,
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update exchange rate service health metrics
    const successRate = (results.filter(r => r.success).length / results.length) * 100;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    this.updateHealthMetric('exchange_rate_service_availability', successRate, '%', {
      warning: 90,
      critical: 75
    });

    this.updateHealthMetric('exchange_rate_service_response_time', avgResponseTime, 'ms', {
      warning: 3000,
      critical: 6000
    });

    // Update service status
    this.updateServiceStatus('exchange_rate_service', {
      isAvailable: successRate > 50,
      responseTime: avgResponseTime,
      errorRate: 100 - successRate,
      consecutiveFailures: successRate === 0 ? this.getConsecutiveFailures('exchange_rate_service') + 1 : 0
    });
  }

  /**
   * Check prioritization performance
   */
  private async checkPrioritizationPerformance(): Promise<void> {
    // Calculate average performance metrics from recent history
    const recentPerformance = this.performanceHistory.filter(
      p => Date.now() - p.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );

    if (recentPerformance.length === 0) return;

    const avgProcessingTime = recentPerformance.reduce((sum, p) => sum + p.processingTimeMs, 0) / recentPerformance.length;
    const avgCacheHitRate = recentPerformance.reduce((sum, p) => sum + p.cacheHitRate, 0) / recentPerformance.length;
    const avgAccuracyScore = recentPerformance.reduce((sum, p) => sum + p.accuracyScore, 0) / recentPerformance.length;

    this.updateHealthMetric('prioritization_processing_time', avgProcessingTime, 'ms', {
      warning: 500,
      critical: 1000
    });

    this.updateHealthMetric('prioritization_cache_hit_rate', avgCacheHitRate * 100, '%', {
      warning: 70,
      critical: 50
    });

    this.updateHealthMetric('prioritization_accuracy', avgAccuracyScore * 100, '%', {
      warning: 80,
      critical: 60
    });

    // Update service status
    this.updateServiceStatus('prioritization_engine', {
      isAvailable: true,
      responseTime: avgProcessingTime,
      errorRate: Math.max(0, (1 - avgAccuracyScore) * 100),
      consecutiveFailures: 0
    });
  }

  /**
   * Record gas estimation accuracy
   */
  recordGasEstimationAccuracy(
    chainId: number,
    estimate: CostEstimate,
    source: string,
    actualGasPrice?: bigint
  ): void {
    const accuracy: GasEstimationAccuracy = {
      chainId,
      estimatedGasPrice: estimate.breakdown.gasPrice || BigInt(0),
      actualGasPrice,
      accuracyPercentage: actualGasPrice 
        ? this.calculateGasAccuracy(estimate.breakdown.gasPrice || BigInt(0), actualGasPrice)
        : estimate.confidence * 100,
      estimationTime: new Date(),
      source
    };

    this.gasAccuracyHistory.push(accuracy);

    // Keep only recent history
    if (this.gasAccuracyHistory.length > this.MAX_HISTORY_ENTRIES) {
      this.gasAccuracyHistory = this.gasAccuracyHistory.slice(-this.MAX_HISTORY_ENTRIES);
    }

    // Update accuracy metric
    const recentAccuracy = this.gasAccuracyHistory
      .filter(a => Date.now() - a.estimationTime.getTime() < 60 * 60 * 1000) // Last hour
      .map(a => a.accuracyPercentage);

    if (recentAccuracy.length > 0) {
      const avgAccuracy = recentAccuracy.reduce((sum, acc) => sum + acc, 0) / recentAccuracy.length;
      this.updateHealthMetric('gas_estimation_accuracy', avgAccuracy, '%', {
        warning: 85,
        critical: 70
      });
    }
  }

  /**
   * Record prioritization performance
   */
  recordPrioritizationPerformance(
    sessionId: string,
    methodCount: number,
    processingTimeMs: number,
    cacheHitRate: number,
    accuracyScore: number = 0.9 // Default assumption
  ): void {
    const performance: PrioritizationPerformance = {
      sessionId,
      methodCount,
      processingTimeMs,
      cacheHitRate,
      accuracyScore,
      timestamp: new Date()
    };

    this.performanceHistory.push(performance);

    // Keep only recent history
    if (this.performanceHistory.length > this.MAX_HISTORY_ENTRIES) {
      this.performanceHistory = this.performanceHistory.slice(-this.MAX_HISTORY_ENTRIES);
    }

    this.emit('performance_recorded', performance);
  }

  /**
   * Record system error
   */
  recordSystemError(type: string, error: any): void {
    const errorMetricName = `${type}_error_rate`;
    const currentMetric = this.healthMetrics.get(errorMetricName);
    const currentValue = currentMetric?.value || 0;

    this.updateHealthMetric(errorMetricName, currentValue + 1, 'count', {
      warning: 5,
      critical: 10
    });

    this.emit('system_error_recorded', {
      type,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date()
    });
  }

  /**
   * Update health metric
   */
  private updateHealthMetric(
    name: string,
    value: number,
    unit: string,
    threshold: { warning: number; critical: number }
  ): void {
    const previousMetric = this.healthMetrics.get(name);
    const previousValue = previousMetric?.value;

    let status: HealthMetric['status'] = 'healthy';
    if (unit === '%' || unit === 'count') {
      // For percentages and counts, higher values might be bad or good depending on metric
      if (name.includes('availability') || name.includes('accuracy') || name.includes('hit_rate')) {
        // Higher is better
        if (value < threshold.critical) status = 'critical';
        else if (value < threshold.warning) status = 'warning';
      } else {
        // Higher is worse (error rates, etc.)
        if (value >= threshold.critical) status = 'critical';
        else if (value >= threshold.warning) status = 'warning';
      }
    } else {
      // For time-based metrics, higher is usually worse
      if (value >= threshold.critical) status = 'critical';
      else if (value >= threshold.warning) status = 'warning';
    }

    let trend: HealthMetric['trend'] = 'stable';
    if (previousValue !== undefined) {
      const change = ((value - previousValue) / previousValue) * 100;
      if (Math.abs(change) > 10) {
        if (name.includes('availability') || name.includes('accuracy') || name.includes('hit_rate')) {
          trend = change > 0 ? 'improving' : 'degrading';
        } else {
          trend = change > 0 ? 'degrading' : 'improving';
        }
      }
    }

    const metric: HealthMetric = {
      name,
      value,
      unit,
      status,
      threshold,
      lastUpdated: new Date(),
      trend
    };

    this.healthMetrics.set(name, metric);

    this.emit('metric_updated', metric);
  }

  /**
   * Update service status
   */
  private updateServiceStatus(
    serviceName: string,
    update: Partial<ServiceHealthStatus>
  ): void {
    const existing = this.serviceStatuses.get(serviceName) || {
      serviceName,
      isAvailable: false,
      responseTime: 0,
      errorRate: 100,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      uptime: 0
    };

    const updated: ServiceHealthStatus = {
      ...existing,
      ...update,
      lastCheck: new Date()
    };

    // Calculate uptime (simplified - would be more sophisticated in production)
    if (update.isAvailable !== undefined) {
      const uptimeWeight = 0.95; // Weight for historical uptime
      updated.uptime = (existing.uptime * uptimeWeight) + (update.isAvailable ? (1 - uptimeWeight) * 100 : 0);
    }

    this.serviceStatuses.set(serviceName, updated);

    this.emit('service_status_updated', updated);
  }

  /**
   * Update overall system health
   */
  private updateOverallSystemHealth(): void {
    const allMetrics = Array.from(this.healthMetrics.values());
    const criticalCount = allMetrics.filter(m => m.status === 'critical').length;
    const warningCount = allMetrics.filter(m => m.status === 'warning').length;

    let overallStatus: 'healthy' | 'warning' | 'critical';
    if (criticalCount > 0) {
      overallStatus = 'critical';
    } else if (warningCount > 0) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'healthy';
    }

    this.updateHealthMetric('overall_system_health', 
      overallStatus === 'healthy' ? 100 : overallStatus === 'warning' ? 75 : 25,
      '%',
      { warning: 80, critical: 50 }
    );
  }

  /**
   * Check for alerts
   */
  private checkForAlerts(): void {
    // Check for service availability alerts
    this.serviceStatuses.forEach((status, serviceName) => {
      if (!status.isAvailable && status.consecutiveFailures >= 3) {
        this.createAlert('service_down', 'critical', 
          `${serviceName} is unavailable`,
          `Service has been down for ${status.consecutiveFailures} consecutive checks`,
          [serviceName]
        );
      }

      if (status.errorRate > 50) {
        this.createAlert('high_error_rate', 'high',
          `High error rate in ${serviceName}`,
          `Error rate is ${status.errorRate.toFixed(1)}%`,
          [serviceName]
        );
      }

      if (status.responseTime > 5000) {
        this.createAlert('slow_response', 'medium',
          `Slow response from ${serviceName}`,
          `Response time is ${status.responseTime}ms`,
          [serviceName]
        );
      }
    });

    // Check for accuracy degradation
    const accuracyMetric = this.healthMetrics.get('gas_estimation_accuracy');
    if (accuracyMetric && accuracyMetric.status === 'critical') {
      this.createAlert('accuracy_degraded', 'high',
        'Gas estimation accuracy degraded',
        `Accuracy is ${accuracyMetric.value.toFixed(1)}%`,
        ['gas_fee_estimation']
      );
    }

    // Check for performance issues
    const performanceMetric = this.healthMetrics.get('prioritization_processing_time');
    if (performanceMetric && performanceMetric.status === 'critical') {
      this.createAlert('performance_issue', 'medium',
        'Prioritization performance degraded',
        `Processing time is ${performanceMetric.value.toFixed(0)}ms`,
        ['prioritization_engine']
      );
    }
  }

  /**
   * Create system alert
   */
  private createAlert(
    type: SystemAlert['type'],
    severity: SystemAlert['severity'],
    title: string,
    message: string,
    affectedServices: string[]
  ): void {
    const alertId = `${type}_${affectedServices.join('_')}_${Date.now()}`;
    
    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      alert => alert.type === type && 
               alert.affectedServices.some(service => affectedServices.includes(service)) &&
               !alert.isResolved
    );

    if (existingAlert) return; // Don't create duplicate alerts

    const alert: SystemAlert = {
      id: alertId,
      type,
      severity,
      title,
      message,
      affectedServices,
      timestamp: new Date(),
      isResolved: false
    };

    this.activeAlerts.set(alertId, alert);

    console.warn('System alert created:', alert);
    this.emit('alert_created', alert);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.isResolved) {
      alert.isResolved = true;
      alert.resolvedAt = new Date();
      this.emit('alert_resolved', alert);
    }
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    overallStatus: 'healthy' | 'warning' | 'critical';
    metrics: HealthMetric[];
    services: ServiceHealthStatus[];
    activeAlerts: SystemAlert[];
    lastUpdated: Date;
  } {
    const overallMetric = this.healthMetrics.get('overall_system_health');
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'unknown' as any;
    
    if (overallMetric) {
      if (overallMetric.value >= 80) overallStatus = 'healthy';
      else if (overallMetric.value >= 50) overallStatus = 'warning';
      else overallStatus = 'critical';
    }

    return {
      overallStatus,
      metrics: Array.from(this.healthMetrics.values()),
      services: Array.from(this.serviceStatuses.values()),
      activeAlerts: Array.from(this.activeAlerts.values()).filter(a => !a.isResolved),
      lastUpdated: new Date()
    };
  }

  /**
   * Get gas estimation accuracy history
   */
  getGasAccuracyHistory(chainId?: number, hours: number = 24): GasEstimationAccuracy[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.gasAccuracyHistory.filter(
      a => a.estimationTime.getTime() > cutoff && 
           (chainId === undefined || a.chainId === chainId)
    );
  }

  /**
   * Get prioritization performance history
   */
  getPerformanceHistory(hours: number = 24): PrioritizationPerformance[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.performanceHistory.filter(
      p => p.timestamp.getTime() > cutoff
    );
  }

  // Helper methods
  private initializeHealthMetrics(): void {
    const initialMetrics = [
      'gas_fee_service_availability',
      'gas_fee_service_response_time',
      'gas_estimation_accuracy',
      'exchange_rate_service_availability',
      'exchange_rate_service_response_time',
      'prioritization_processing_time',
      'prioritization_cache_hit_rate',
      'prioritization_accuracy',
      'overall_system_health'
    ];

    initialMetrics.forEach(name => {
      this.healthMetrics.set(name, {
        name,
        value: 0,
        unit: name.includes('time') ? 'ms' : '%',
        status: 'unknown',
        threshold: { warning: 80, critical: 50 },
        lastUpdated: new Date()
      });
    });
  }

  private initializeServiceStatuses(): void {
    const services = [
      'gas_fee_estimation',
      'exchange_rate_service',
      'prioritization_engine'
    ];

    services.forEach(serviceName => {
      this.serviceStatuses.set(serviceName, {
        serviceName,
        isAvailable: false,
        responseTime: 0,
        errorRate: 0,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        uptime: 100
      });
    });
  }

  private calculateGasAccuracy(estimated: bigint, actual: bigint): number {
    if (actual === BigInt(0)) return 0;
    const diff = estimated > actual ? estimated - actual : actual - estimated;
    const accuracy = 100 - (Number(diff * BigInt(100)) / Number(actual));
    return Math.max(0, Math.min(100, accuracy));
  }

  private getConsecutiveFailures(serviceName: string): number {
    return this.serviceStatuses.get(serviceName)?.consecutiveFailures || 0;
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - (this.HISTORY_RETENTION_HOURS * 60 * 60 * 1000);
    
    // Cleanup gas accuracy history
    this.gasAccuracyHistory = this.gasAccuracyHistory.filter(
      a => a.estimationTime.getTime() > cutoff
    );

    // Cleanup performance history
    this.performanceHistory = this.performanceHistory.filter(
      p => p.timestamp.getTime() > cutoff
    );

    // Cleanup resolved alerts older than 24 hours
    for (const [id, alert] of this.activeAlerts.entries()) {
      if (alert.isResolved && alert.resolvedAt && 
          Date.now() - alert.resolvedAt.getTime() > 24 * 60 * 60 * 1000) {
        this.activeAlerts.delete(id);
      }
    }
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in health monitor event callback:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const paymentSystemHealthMonitor = new PaymentSystemHealthMonitor();

export default PaymentSystemHealthMonitor;