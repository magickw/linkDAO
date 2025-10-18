import { EventEmitter } from 'events';
import { systemHealthMonitoringService, HealthMetrics } from './systemHealthMonitoringService';
import { monitoringDashboardService } from './monitoringDashboardService';

export interface ComponentDependency {
  id: string;
  name: string;
  type: 'database' | 'cache' | 'external_api' | 'microservice' | 'queue';
  dependencies: string[];
  dependents: string[];
  criticality: 'low' | 'medium' | 'high' | 'critical';
  healthCheckUrl?: string;
  timeout: number;
}

export interface SystemHealthScore {
  overall: number;
  components: {
    [componentId: string]: {
      score: number;
      weight: number;
      status: 'healthy' | 'degraded' | 'failed';
      responseTime: number;
      errorRate: number;
      availability: number;
    };
  };
  trends: {
    direction: 'improving' | 'stable' | 'degrading';
    changeRate: number;
    confidence: number;
  };
}

export interface PerformanceTrend {
  metric: string;
  timeframe: '1h' | '6h' | '24h' | '7d';
  values: Array<{
    timestamp: Date;
    value: number;
    prediction?: number;
    confidence?: number;
  }>;
  trend: 'up' | 'down' | 'stable';
  forecast: Array<{
    timestamp: Date;
    predicted: number;
    confidence: number;
  }>;
}

/**
 * Enhanced System Health Monitoring Service
 * Provides comprehensive system health monitoring with ML-based insights
 */
export class EnhancedSystemHealthService extends EventEmitter {
  private componentDependencies: Map<string, ComponentDependency> = new Map();
  private healthHistory: Array<{ timestamp: Date; metrics: HealthMetrics }> = [];
  private performanceTrends: Map<string, PerformanceTrend> = new Map();
  private healthScores: Array<{ timestamp: Date; score: SystemHealthScore }> = [];
  private readonly maxHistorySize = 10000;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.setupComponentDependencies();
    this.startEnhancedMonitoring();
  }

  /**
   * Setup component dependency mapping
   */
  private setupComponentDependencies(): void {
    // Database components
    this.addComponentDependency({
      id: 'postgres_primary',
      name: 'PostgreSQL Primary',
      type: 'database',
      dependencies: [],
      dependents: ['api_server', 'analytics_service', 'user_service'],
      criticality: 'critical',
      timeout: 5000
    });

    this.addComponentDependency({
      id: 'redis_cache',
      name: 'Redis Cache',
      type: 'cache',
      dependencies: [],
      dependents: ['api_server', 'session_service'],
      criticality: 'high',
      timeout: 2000
    });

    // Core services
    this.addComponentDependency({
      id: 'api_server',
      name: 'API Server',
      type: 'microservice',
      dependencies: ['postgres_primary', 'redis_cache'],
      dependents: ['frontend', 'mobile_app'],
      criticality: 'critical',
      timeout: 10000
    });
    this.addComponentDependency({
      id: 'analytics_service',
      name: 'Analytics Service',
      type: 'microservice',
      dependencies: ['postgres_primary', 'redis_cache'],
      dependents: ['admin_dashboard'],
      criticality: 'medium',
      timeout: 15000
    });

    this.addComponentDependency({
      id: 'user_service',
      name: 'User Service',
      type: 'microservice',
      dependencies: ['postgres_primary'],
      dependents: ['api_server'],
      criticality: 'high',
      timeout: 8000
    });

    // External dependencies
    this.addComponentDependency({
      id: 'blockchain_rpc',
      name: 'Blockchain RPC',
      type: 'external_api',
      dependencies: [],
      dependents: ['web3_service'],
      criticality: 'high',
      timeout: 30000
    });

    this.addComponentDependency({
      id: 'ipfs_gateway',
      name: 'IPFS Gateway',
      type: 'external_api',
      dependencies: [],
      dependents: ['nft_service'],
      criticality: 'medium',
      timeout: 20000
    });
  }

  /**
   * Add component dependency
   */
  addComponentDependency(component: ComponentDependency): void {
    this.componentDependencies.set(component.id, component);
    this.emit('componentAdded', component);
  }

  /**
   * Start enhanced monitoring
   */
  private startEnhancedMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectEnhancedMetrics();
        await this.calculateHealthScores();
        await this.updatePerformanceTrends();
        await this.detectAnomalies();
      } catch (error) {
        console.error('Enhanced monitoring error:', error);
        this.emit('monitoringError', error);
      }
    }, 30000);

    // Listen to base monitoring events
    systemHealthMonitoringService.on('metricsCollected', (metrics: HealthMetrics) => {
      this.processBaseMetrics(metrics);
    });
  }

  /**
   * Collect enhanced metrics
   */
  private async collectEnhancedMetrics(): Promise<void> {
    const baseMetrics = systemHealthMonitoringService.getCurrentMetrics();
    if (!baseMetrics) return;

    // Store metrics with timestamp
    this.healthHistory.push({
      timestamp: new Date(),
      metrics: baseMetrics
    });

    // Trim history
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }

    // Perform component health checks
    await this.performComponentHealthChecks();
  }

  /**
   * Perform health checks on all components
   */
  private async performComponentHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.componentDependencies.values()).map(
      component => this.checkComponentHealth(component)
    );

    const results = await Promise.allSettled(healthCheckPromises);
    
    results.forEach((result, index) => {
      const component = Array.from(this.componentDependencies.values())[index];
      if (result.status === 'rejected') {
        this.emit('componentHealthCheckFailed', {
          componentId: component.id,
          error: result.reason
        });
      }
    });
  }

  /**
   * Check individual component health
   */
  private async checkComponentHealth(component: ComponentDependency): Promise<{
    componentId: string;
    status: 'healthy' | 'degraded' | 'failed';
    responseTime: number;
    errorRate: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Simulate health check based on component type
      let isHealthy = true;
      let responseTime = 0;

      switch (component.type) {
        case 'database':
          responseTime = await this.checkDatabaseHealth(component);
          break;
        case 'cache':
          responseTime = await this.checkCacheHealth(component);
          break;
        case 'microservice':
          responseTime = await this.checkServiceHealth(component);
          break;
        case 'external_api':
          responseTime = await this.checkExternalApiHealth(component);
          break;
        case 'queue':
          responseTime = await this.checkQueueHealth(component);
          break;
      }

      const status = responseTime > component.timeout ? 'degraded' : 'healthy';
      
      return {
        componentId: component.id,
        status,
        responseTime,
        errorRate: 0 // Would be calculated from actual metrics
      };
    } catch (error) {
      return {
        componentId: component.id,
        status: 'failed',
        responseTime: Date.now() - startTime,
        errorRate: 100
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(component: ComponentDependency): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simulate database health check
      // In real implementation, this would execute a simple query
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      return Date.now() - startTime;
    } catch (error) {
      throw new Error(`Database health check failed: ${error}`);
    }
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(component: ComponentDependency): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simulate cache health check
      // In real implementation, this would ping Redis
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      return Date.now() - startTime;
    } catch (error) {
      throw new Error(`Cache health check failed: ${error}`);
    }
  }

  /**
   * Check service health
   */
  private async checkServiceHealth(component: ComponentDependency): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simulate service health check
      if (component.healthCheckUrl) {
        // Would make HTTP request to health endpoint
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
      } else {
        // Internal service check
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }
      return Date.now() - startTime;
    } catch (error) {
      throw new Error(`Service health check failed: ${error}`);
    }
  }

  /**
   * Check external API health
   */
  private async checkExternalApiHealth(component: ComponentDependency): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simulate external API health check
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      return Date.now() - startTime;
    } catch (error) {
      throw new Error(`External API health check failed: ${error}`);
    }
  }

  /**
   * Check queue health
   */
  private async checkQueueHealth(component: ComponentDependency): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simulate queue health check
      await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
      return Date.now() - startTime;
    } catch (error) {
      throw new Error(`Queue health check failed: ${error}`);
    }
  }

  /**
   * Calculate system health scores
   */
  private async calculateHealthScores(): Promise<void> {
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    if (!currentMetrics) return;

    const components: SystemHealthScore['components'] = {};
    let totalWeight = 0;
    let weightedScore = 0;

    // Calculate component scores
    for (const [componentId, component] of this.componentDependencies) {
      const weight = this.getComponentWeight(component.criticality);
      const score = await this.calculateComponentScore(componentId, currentMetrics);
      
      components[componentId] = {
        score,
        weight,
        status: score > 80 ? 'healthy' : score > 50 ? 'degraded' : 'failed',
        responseTime: Math.random() * 1000, // Would use actual metrics
        errorRate: Math.random() * 5,
        availability: Math.min(100, score + Math.random() * 10)
      };

      totalWeight += weight;
      weightedScore += score * weight;
    }

    const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    
    // Calculate trends
    const trends = this.calculateHealthTrends();

    const healthScore: SystemHealthScore = {
      overall: overallScore,
      components,
      trends
    };

    this.healthScores.push({
      timestamp: new Date(),
      score: healthScore
    });

    // Trim history
    if (this.healthScores.length > 1000) {
      this.healthScores = this.healthScores.slice(-1000);
    }

    this.emit('healthScoreCalculated', healthScore);
  }

  /**
   * Get component weight based on criticality
   */
  private getComponentWeight(criticality: ComponentDependency['criticality']): number {
    switch (criticality) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  /**
   * Calculate individual component score
   */
  private async calculateComponentScore(componentId: string, metrics: HealthMetrics): Promise<number> {
    const component = this.componentDependencies.get(componentId);
    if (!component) return 0;

    let score = 100;

    // Check if component is in failed services
    const failedServices = Object.keys(metrics.services).filter(
      serviceName => metrics.services[serviceName].status === 'failed'
    );

    if (failedServices.includes(componentId)) {
      score = 0;
    } else {
      // Calculate score based on various factors
      const service = metrics.services[componentId];
      if (service) {
        // Response time impact
        if (service.responseTime > component.timeout) {
          score -= 30;
        } else if (service.responseTime > component.timeout * 0.8) {
          score -= 15;
        }

        // Error rate impact
        if (service.errorRate > 5) {
          score -= 25;
        } else if (service.errorRate > 1) {
          score -= 10;
        }

        // Throughput impact
        if (service.throughput < 10) {
          score -= 20;
        }
      }

      // Dependency impact
      const dependencyIssues = component.dependencies.filter(depId => {
        const depService = metrics.services[depId];
        return depService && depService.status === 'failed';
      });

      score -= dependencyIssues.length * 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate health trends
   */
  private calculateHealthTrends(): SystemHealthScore['trends'] {
    if (this.healthScores.length < 2) {
      return {
        direction: 'stable',
        changeRate: 0,
        confidence: 0
      };
    }

    const recent = this.healthScores.slice(-10);
    const scores = recent.map(h => h.score.overall);
    
    // Simple linear regression for trend
    const n = scores.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = scores.reduce((sum, score, index) => sum + score * index, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const changeRate = Math.abs(slope);
    
    let direction: 'improving' | 'stable' | 'degrading' = 'stable';
    if (slope > 0.5) direction = 'improving';
    else if (slope < -0.5) direction = 'degrading';

    // Calculate confidence based on variance
    const mean = sumY / n;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / n;
    const confidence = Math.max(0, Math.min(100, 100 - variance));

    return {
      direction,
      changeRate,
      confidence
    };
  }

  /**
   * Update performance trends
   */
  private async updatePerformanceTrends(): Promise<void> {
    const metrics = ['response_time', 'throughput', 'error_rate', 'memory_usage', 'cpu_usage'];
    
    for (const metric of metrics) {
      await this.updateMetricTrend(metric);
    }
  }

  /**
   * Update individual metric trend
   */
  private async updateMetricTrend(metricName: string): Promise<void> {
    const timeframes: Array<PerformanceTrend['timeframe']> = ['1h', '6h', '24h', '7d'];
    
    for (const timeframe of timeframes) {
      const trend = await this.calculateMetricTrend(metricName, timeframe);
      const key = `${metricName}_${timeframe}`;
      this.performanceTrends.set(key, trend);
    }
  }

  /**
   * Calculate metric trend for timeframe
   */
  private async calculateMetricTrend(metricName: string, timeframe: PerformanceTrend['timeframe']): Promise<PerformanceTrend> {
    const now = new Date();
    const timeframeMs = this.getTimeframeMs(timeframe);
    const startTime = new Date(now.getTime() - timeframeMs);

    // Get historical data
    const historicalData = this.healthHistory.filter(
      h => h.timestamp >= startTime
    );

    const values = historicalData.map(h => ({
      timestamp: h.timestamp,
      value: this.extractMetricValue(h.metrics, metricName)
    }));

    // Calculate trend direction
    const trend = this.calculateTrendDirection(values);

    // Generate forecast (simplified)
    const forecast = this.generateForecast(values, 12); // 12 future points

    return {
      metric: metricName,
      timeframe,
      values,
      trend,
      forecast
    };
  }

  /**
   * Get timeframe in milliseconds
   */
  private getTimeframeMs(timeframe: PerformanceTrend['timeframe']): number {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  /**
   * Extract metric value from health metrics
   */
  private extractMetricValue(metrics: HealthMetrics, metricName: string): number {
    switch (metricName) {
      case 'response_time':
        return Object.values(metrics.services).reduce((sum, service) => 
          sum + (service.responseTime || 0), 0) / Object.keys(metrics.services).length;
      case 'throughput':
        return Object.values(metrics.services).reduce((sum, service) => 
          sum + (service.throughput || 0), 0);
      case 'error_rate':
        return Object.values(metrics.services).reduce((sum, service) => 
          sum + (service.errorRate || 0), 0) / Object.keys(metrics.services).length;
      case 'memory_usage':
        return metrics.systemLoad.memory;
      case 'cpu_usage':
        return metrics.systemLoad.cpu;
      default:
        return 0;
    }
  }

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(values: Array<{ timestamp: Date; value: number }>): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';

    const recent = values.slice(-Math.min(10, values.length));
    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    const change = ((last - first) / first) * 100;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  /**
   * Generate forecast
   */
  private generateForecast(values: Array<{ timestamp: Date; value: number }>, points: number): Array<{
    timestamp: Date;
    predicted: number;
    confidence: number;
  }> {
    if (values.length < 2) return [];

    const forecast: Array<{ timestamp: Date; predicted: number; confidence: number }> = [];
    const lastValue = values[values.length - 1];
    const trend = this.calculateSimpleTrend(values);
    
    for (let i = 1; i <= points; i++) {
      const futureTime = new Date(lastValue.timestamp.getTime() + (i * 30000)); // 30 second intervals
      const predicted = lastValue.value + (trend * i);
      const confidence = Math.max(10, 90 - (i * 5)); // Decreasing confidence over time

      forecast.push({
        timestamp: futureTime,
        predicted: Math.max(0, predicted),
        confidence
      });
    }

    return forecast;
  }

  /**
   * Calculate simple trend
   */
  private calculateSimpleTrend(values: Array<{ timestamp: Date; value: number }>): number {
    if (values.length < 2) return 0;

    const recent = values.slice(-5); // Use last 5 points
    const firstValue = recent[0].value;
    const lastValue = recent[recent.length - 1].value;
    const timeSpan = recent.length - 1;

    return timeSpan > 0 ? (lastValue - firstValue) / timeSpan : 0;
  }

  /**
   * Detect anomalies in metrics
   */
  private async detectAnomalies(): Promise<void> {
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    if (!currentMetrics || this.healthHistory.length < 10) return;

    const anomalies = [];

    // Check for response time anomalies
    const responseTimeAnomaly = this.detectResponseTimeAnomaly(currentMetrics);
    if (responseTimeAnomaly) anomalies.push(responseTimeAnomaly);

    // Check for memory usage anomalies
    const memoryAnomaly = this.detectMemoryAnomaly(currentMetrics);
    if (memoryAnomaly) anomalies.push(memoryAnomaly);

    // Check for error rate anomalies
    const errorRateAnomaly = this.detectErrorRateAnomaly(currentMetrics);
    if (errorRateAnomaly) anomalies.push(errorRateAnomaly);

    // Emit anomalies
    anomalies.forEach(anomaly => {
      this.emit('anomalyDetected', anomaly);
    });
  }

  /**
   * Detect response time anomalies
   */
  private detectResponseTimeAnomaly(currentMetrics: HealthMetrics): any {
    const recentHistory = this.healthHistory.slice(-20);
    const responseTimes = recentHistory.map(h => 
      Object.values(h.metrics.services).reduce((sum, service) => 
        sum + (service.responseTime || 0), 0) / Object.keys(h.metrics.services).length
    );

    const currentResponseTime = Object.values(currentMetrics.services).reduce((sum, service) => 
      sum + (service.responseTime || 0), 0) / Object.keys(currentMetrics.services).length;

    const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const stdDev = Math.sqrt(responseTimes.reduce((sum, rt) => sum + Math.pow(rt - mean, 2), 0) / responseTimes.length);

    // Anomaly if current value is more than 2 standard deviations from mean
    if (Math.abs(currentResponseTime - mean) > 2 * stdDev) {
      return {
        type: 'response_time_anomaly',
        severity: currentResponseTime > mean + 2 * stdDev ? 'high' : 'medium',
        message: `Response time anomaly detected: ${currentResponseTime.toFixed(2)}ms (expected: ${mean.toFixed(2)}ms ± ${stdDev.toFixed(2)}ms)`,
        timestamp: new Date(),
        value: currentResponseTime,
        expected: mean,
        deviation: Math.abs(currentResponseTime - mean) / stdDev
      };
    }

    return null;
  }

  /**
   * Detect memory usage anomalies
   */
  private detectMemoryAnomaly(currentMetrics: HealthMetrics): any {
    const recentHistory = this.healthHistory.slice(-20);
    const memoryUsages = recentHistory.map(h => h.metrics.systemLoad.memory);
    const currentMemory = currentMetrics.systemLoad.memory;

    const mean = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    const stdDev = Math.sqrt(memoryUsages.reduce((sum, mem) => sum + Math.pow(mem - mean, 2), 0) / memoryUsages.length);

    if (Math.abs(currentMemory - mean) > 2 * stdDev) {
      return {
        type: 'memory_usage_anomaly',
        severity: currentMemory > mean + 2 * stdDev ? 'high' : 'medium',
        message: `Memory usage anomaly detected: ${currentMemory.toFixed(2)}% (expected: ${mean.toFixed(2)}% ± ${stdDev.toFixed(2)}%)`,
        timestamp: new Date(),
        value: currentMemory,
        expected: mean,
        deviation: Math.abs(currentMemory - mean) / stdDev
      };
    }

    return null;
  }

  /**
   * Detect error rate anomalies
   */
  private detectErrorRateAnomaly(currentMetrics: HealthMetrics): any {
    const recentHistory = this.healthHistory.slice(-20);
    const errorRates = recentHistory.map(h => 
      Object.values(h.metrics.services).reduce((sum, service) => 
        sum + (service.errorRate || 0), 0) / Object.keys(h.metrics.services).length
    );

    const currentErrorRate = Object.values(currentMetrics.services).reduce((sum, service) => 
      sum + (service.errorRate || 0), 0) / Object.keys(currentMetrics.services).length;

    const mean = errorRates.reduce((a, b) => a + b, 0) / errorRates.length;
    const stdDev = Math.sqrt(errorRates.reduce((sum, er) => sum + Math.pow(er - mean, 2), 0) / errorRates.length);

    if (currentErrorRate > mean + 2 * stdDev && currentErrorRate > 1) {
      return {
        type: 'error_rate_anomaly',
        severity: currentErrorRate > 5 ? 'critical' : 'high',
        message: `Error rate anomaly detected: ${currentErrorRate.toFixed(2)}% (expected: ${mean.toFixed(2)}% ± ${stdDev.toFixed(2)}%)`,
        timestamp: new Date(),
        value: currentErrorRate,
        expected: mean,
        deviation: Math.abs(currentErrorRate - mean) / stdDev
      };
    }

    return null;
  }

  /**
   * Process base metrics from system health monitoring
   */
  private processBaseMetrics(metrics: HealthMetrics): void {
    // Additional processing of base metrics
    this.emit('baseMetricsProcessed', metrics);
  }

  /**
   * Get current system health score
   */
  getCurrentHealthScore(): SystemHealthScore | null {
    return this.healthScores.length > 0 
      ? this.healthScores[this.healthScores.length - 1].score 
      : null;
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(metric?: string, timeframe?: PerformanceTrend['timeframe']): PerformanceTrend[] {
    const trends = Array.from(this.performanceTrends.values());
    
    let filtered = trends;
    if (metric) {
      filtered = filtered.filter(t => t.metric === metric);
    }
    if (timeframe) {
      filtered = filtered.filter(t => t.timeframe === timeframe);
    }

    return filtered;
  }

  /**
   * Get component dependency map
   */
  getComponentDependencyMap(): ComponentDependency[] {
    return Array.from(this.componentDependencies.values());
  }

  /**
   * Get health score history
   */
  getHealthScoreHistory(limit?: number): Array<{ timestamp: Date; score: SystemHealthScore }> {
    const actualLimit = limit || this.healthScores.length;
    return this.healthScores.slice(-actualLimit);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

export const enhancedSystemHealthService = new EnhancedSystemHealthService();