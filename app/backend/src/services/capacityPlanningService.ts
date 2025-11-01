import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { enhancedSystemHealthService, PerformanceTrend } from './enhancedSystemHealthService';
import { systemHealthMonitoringService, HealthMetrics } from './systemHealthMonitoringService';

export interface ResourceUsagePrediction {
  resource: 'cpu' | 'memory' | 'storage' | 'network' | 'database_connections';
  timeframe: '1h' | '6h' | '24h' | '7d' | '30d';
  predictions: Array<{
    timestamp: Date;
    predicted: number;
    confidence: number;
    upperBound: number;
    lowerBound: number;
  }>;
  thresholds: {
    warning: number;
    critical: number;
  };
  projectedExhaustion?: {
    date: Date;
    confidence: number;
  };
}

export interface AutoScalingRecommendation {
  id: string;
  timestamp: Date;
  component: string;
  action: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  trigger: {
    metric: string;
    currentValue: number;
    threshold: number;
    duration: number; // seconds the condition has persisted
  };
  
  recommendation: {
    targetCapacity: number;
    estimatedCost: number;
    estimatedImpact: string;
    implementationSteps: string[];
  };
  
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigationSteps: string[];
  };
  
  costOptimization: {
    currentCost: number;
    projectedCost: number;
    savings: number;
    paybackPeriod?: number; // days
  };
}

export interface PerformanceBottleneck {
  id: string;
  component: string;
  type: 'cpu' | 'memory' | 'io' | 'network' | 'database' | 'application';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  metrics: {
    current: Record<string, number>;
    baseline: Record<string, number>;
    deviation: number; // percentage
  };
  
  impact: {
    affectedServices: string[];
    performanceDegradation: number; // percentage
    userExperienceImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
  };
  
  resolution: {
    recommendations: string[];
    estimatedEffort: 'low' | 'medium' | 'high';
    estimatedCost: number;
    timeline: string;
  };
}

export interface CostOptimizationAnalysis {
  timestamp: Date;
  totalCost: number;
  
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    database: number;
    monitoring: number;
    other: number;
  };
  
  optimizations: Array<{
    category: string;
    description: string;
    potentialSavings: number;
    implementation: 'immediate' | 'short_term' | 'long_term';
    risk: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
  }>;
  
  rightsizing: Array<{
    resource: string;
    currentSize: string;
    recommendedSize: string;
    utilization: number;
    savings: number;
  }>;
}

/**
 * Capacity Planning and Optimization Service
 * Provides intelligent resource planning, auto-scaling recommendations, and cost optimization
 */
export class CapacityPlanningService extends EventEmitter {
  private resourcePredictions: Map<string, ResourceUsagePrediction> = new Map();
  private scalingRecommendations: AutoScalingRecommendation[] = [];
  private bottlenecks: Map<string, PerformanceBottleneck> = new Map();
  private costAnalyses: CostOptimizationAnalysis[] = [];
  
  // Historical data for predictions
  private resourceHistory: Array<{
    timestamp: Date;
    cpu: number;
    memory: number;
    storage: number;
    network: number;
    connections: number;
  }> = [];
  
  // Configuration
  private readonly predictionModels = {
    linear: true,
    seasonal: true,
    exponential: true,
    ensemble: true
  };
  
  private readonly scalingThresholds = {
    cpu: { warning: 70, critical: 85 },
    memory: { warning: 75, critical: 90 },
    storage: { warning: 80, critical: 95 },
    network: { warning: 70, critical: 85 },
    connections: { warning: 80, critical: 95 }
  };
  
  private monitoringInterval?: NodeJS.Timeout;
  private predictionInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.startCapacityMonitoring();
    this.setupEventListeners();
  }

  /**
   * Start capacity monitoring
   */
  private startCapacityMonitoring(): void {
    // Monitor resource usage every minute
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectResourceMetrics();
        await this.analyzeBottlenecks();
        await this.generateScalingRecommendations();
      } catch (error) {
        safeLogger.error('Capacity monitoring error:', error);
        this.emit('monitoringError', error);
      }
    }, 60000);

    // Generate predictions every 15 minutes
    this.predictionInterval = setInterval(async () => {
      try {
        await this.generateResourcePredictions();
        await this.performCostOptimizationAnalysis();
      } catch (error) {
        safeLogger.error('Prediction generation error:', error);
        this.emit('predictionError', error);
      }
    }, 15 * 60 * 1000);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    enhancedSystemHealthService.on('healthScoreCalculated', (healthScore) => {
      this.processHealthScoreForCapacity(healthScore);
    });

    systemHealthMonitoringService.on('metricsCollected', (metrics: HealthMetrics) => {
      this.processMetricsForCapacity(metrics);
    });
  }

  /**
   * Collect resource metrics
   */
  private async collectResourceMetrics(): Promise<void> {
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    if (!currentMetrics) return;

    // Simulate additional resource metrics
    const resourceMetrics = {
      timestamp: new Date(),
      cpu: currentMetrics.systemLoad.cpu,
      memory: currentMetrics.systemLoad.memory,
      storage: this.simulateStorageUsage(),
      network: this.simulateNetworkUsage(),
      connections: this.simulateDatabaseConnections()
    };

    this.resourceHistory.push(resourceMetrics);

    // Trim history (keep last 7 days of minute-by-minute data)
    const maxHistorySize = 7 * 24 * 60;
    if (this.resourceHistory.length > maxHistorySize) {
      this.resourceHistory = this.resourceHistory.slice(-maxHistorySize);
    }

    this.emit('resourceMetricsCollected', resourceMetrics);
  }

  /**
   * Simulate storage usage (would be real metrics in production)
   */
  private simulateStorageUsage(): number {
    // Simulate gradual storage growth with some variance
    const baseUsage = 45;
    const growth = (Date.now() % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000) * 5; // 5% daily growth
    const variance = (Math.random() - 0.5) * 10;
    return Math.max(0, Math.min(100, baseUsage + growth + variance));
  }

  /**
   * Simulate network usage
   */
  private simulateNetworkUsage(): number {
    // Simulate network usage with daily patterns
    const hour = new Date().getHours();
    const peakHours = hour >= 9 && hour <= 17; // Business hours
    const baseUsage = peakHours ? 60 : 30;
    const variance = (Math.random() - 0.5) * 20;
    return Math.max(0, Math.min(100, baseUsage + variance));
  }

  /**
   * Simulate database connections
   */
  private simulateDatabaseConnections(): number {
    // Simulate connection pool usage
    const baseConnections = 40;
    const variance = (Math.random() - 0.5) * 30;
    return Math.max(0, Math.min(100, baseConnections + variance));
  }

  /**
   * Generate resource usage predictions
   */
  private async generateResourcePredictions(): Promise<void> {
    if (this.resourceHistory.length < 60) return; // Need at least 1 hour of data

    const resources: Array<ResourceUsagePrediction['resource']> = [
      'cpu', 'memory', 'storage', 'network', 'database_connections'
    ];

    const timeframes: Array<ResourceUsagePrediction['timeframe']> = [
      '1h', '6h', '24h', '7d', '30d'
    ];

    for (const resource of resources) {
      for (const timeframe of timeframes) {
        const prediction = await this.generateResourcePrediction(resource, timeframe);
        const key = `${resource}_${timeframe}`;
        this.resourcePredictions.set(key, prediction);
      }
    }

    this.emit('predictionsGenerated', {
      timestamp: new Date(),
      predictionsCount: this.resourcePredictions.size
    });
  }

  /**
   * Generate prediction for specific resource and timeframe
   */
  private async generateResourcePrediction(
    resource: ResourceUsagePrediction['resource'],
    timeframe: ResourceUsagePrediction['timeframe']
  ): Promise<ResourceUsagePrediction> {
    const historicalData = this.getHistoricalData(resource, timeframe);
    const predictions = this.calculatePredictions(historicalData, timeframe);
    
    const thresholds = this.scalingThresholds[resource] || { warning: 70, critical: 85 };
    const projectedExhaustion = this.calculateProjectedExhaustion(predictions, thresholds.critical);

    return {
      resource,
      timeframe,
      predictions,
      thresholds,
      projectedExhaustion
    };
  }

  /**
   * Get historical data for resource
   */
  private getHistoricalData(
    resource: ResourceUsagePrediction['resource'],
    timeframe: ResourceUsagePrediction['timeframe']
  ): Array<{ timestamp: Date; value: number }> {
    const timeframeMs = this.getTimeframeMs(timeframe);
    const cutoff = new Date(Date.now() - timeframeMs);
    
    return this.resourceHistory
      .filter(h => h.timestamp >= cutoff)
      .map(h => ({
        timestamp: h.timestamp,
        value: this.extractResourceValue(h, resource)
      }));
  }

  /**
   * Extract resource value from history entry
   */
  private extractResourceValue(
    history: typeof this.resourceHistory[0],
    resource: ResourceUsagePrediction['resource']
  ): number {
    switch (resource) {
      case 'cpu': return history.cpu;
      case 'memory': return history.memory;
      case 'storage': return history.storage;
      case 'network': return history.network;
      case 'database_connections': return history.connections;
      default: return 0;
    }
  }

  /**
   * Calculate predictions using ensemble of models
   */
  private calculatePredictions(
    historicalData: Array<{ timestamp: Date; value: number }>,
    timeframe: ResourceUsagePrediction['timeframe']
  ): ResourceUsagePrediction['predictions'] {
    if (historicalData.length < 2) return [];

    const predictions: ResourceUsagePrediction['predictions'] = [];
    const predictionPoints = this.getPredictionPoints(timeframe);
    const intervalMs = this.getPredictionInterval(timeframe);
    
    const lastDataPoint = historicalData[historicalData.length - 1];
    
    for (let i = 1; i <= predictionPoints; i++) {
      const futureTimestamp = new Date(lastDataPoint.timestamp.getTime() + (i * intervalMs));
      
      // Ensemble prediction combining multiple models
      const linearPred = this.linearPrediction(historicalData, i);
      const seasonalPred = this.seasonalPrediction(historicalData, i);
      const exponentialPred = this.exponentialPrediction(historicalData, i);
      
      // Weighted ensemble
      const predicted = (linearPred * 0.4) + (seasonalPred * 0.3) + (exponentialPred * 0.3);
      
      // Calculate confidence based on historical variance
      const confidence = this.calculatePredictionConfidence(historicalData, i);
      
      // Calculate bounds
      const variance = this.calculateVariance(historicalData);
      const margin = Math.sqrt(variance) * (1 + i * 0.1); // Increasing uncertainty over time
      
      predictions.push({
        timestamp: futureTimestamp,
        predicted: Math.max(0, Math.min(100, predicted)),
        confidence,
        upperBound: Math.max(0, Math.min(100, predicted + margin)),
        lowerBound: Math.max(0, Math.min(100, predicted - margin))
      });
    }

    return predictions;
  }

  /**
   * Linear trend prediction
   */
  private linearPrediction(data: Array<{ timestamp: Date; value: number }>, steps: number): number {
    if (data.length < 2) return data[0]?.value || 0;

    // Simple linear regression
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point, index) => sum + point.value * index, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return intercept + slope * (n - 1 + steps);
  }

  /**
   * Seasonal pattern prediction
   */
  private seasonalPrediction(data: Array<{ timestamp: Date; value: number }>, steps: number): number {
    if (data.length < 24) return data[data.length - 1]?.value || 0; // Need at least 24 hours

    // Simple seasonal decomposition (daily pattern)
    const hourlyAverages = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    data.forEach(point => {
      const hour = point.timestamp.getHours();
      hourlyAverages[hour] += point.value;
      hourlyCounts[hour]++;
    });

    // Calculate averages
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyAverages[i] /= hourlyCounts[i];
      }
    }

    // Predict based on future hour
    const lastTimestamp = data[data.length - 1].timestamp;
    const futureTimestamp = new Date(lastTimestamp.getTime() + (steps * this.getPredictionInterval('1h')));
    const futureHour = futureTimestamp.getHours();

    return hourlyAverages[futureHour] || data[data.length - 1].value;
  }

  /**
   * Exponential smoothing prediction
   */
  private exponentialPrediction(data: Array<{ timestamp: Date; value: number }>, steps: number): number {
    if (data.length === 0) return 0;
    if (data.length === 1) return data[0].value;

    const alpha = 0.3; // Smoothing parameter
    let smoothed = data[0].value;

    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i].value + (1 - alpha) * smoothed;
    }

    // Simple forecast (constant)
    return smoothed;
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(
    data: Array<{ timestamp: Date; value: number }>,
    steps: number
  ): number {
    const baseConfidence = 0.9;
    const decayRate = 0.05; // Confidence decreases over time
    const dataQualityFactor = Math.min(1, data.length / 100); // More data = higher confidence
    
    return Math.max(0.1, baseConfidence * dataQualityFactor * Math.exp(-decayRate * steps));
  }

  /**
   * Calculate variance in historical data
   */
  private calculateVariance(data: Array<{ timestamp: Date; value: number }>): number {
    if (data.length < 2) return 0;

    const mean = data.reduce((sum, point) => sum + point.value, 0) / data.length;
    const variance = data.reduce((sum, point) => sum + Math.pow(point.value - mean, 2), 0) / data.length;
    
    return variance;
  }

  /**
   * Calculate projected resource exhaustion
   */
  private calculateProjectedExhaustion(
    predictions: ResourceUsagePrediction['predictions'],
    threshold: number
  ): ResourceUsagePrediction['projectedExhaustion'] | undefined {
    const exhaustionPoint = predictions.find(p => p.predicted >= threshold);
    
    if (exhaustionPoint) {
      return {
        date: exhaustionPoint.timestamp,
        confidence: exhaustionPoint.confidence
      };
    }

    return undefined;
  }

  /**
   * Get timeframe in milliseconds
   */
  private getTimeframeMs(timeframe: ResourceUsagePrediction['timeframe']): number {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  /**
   * Get number of prediction points for timeframe
   */
  private getPredictionPoints(timeframe: ResourceUsagePrediction['timeframe']): number {
    switch (timeframe) {
      case '1h': return 12; // 5-minute intervals
      case '6h': return 24; // 15-minute intervals
      case '24h': return 24; // 1-hour intervals
      case '7d': return 28; // 6-hour intervals
      case '30d': return 30; // 1-day intervals
      default: return 12;
    }
  }

  /**
   * Get prediction interval in milliseconds
   */
  private getPredictionInterval(timeframe: ResourceUsagePrediction['timeframe']): number {
    switch (timeframe) {
      case '1h': return 5 * 60 * 1000; // 5 minutes
      case '6h': return 15 * 60 * 1000; // 15 minutes
      case '24h': return 60 * 60 * 1000; // 1 hour
      case '7d': return 6 * 60 * 60 * 1000; // 6 hours
      case '30d': return 24 * 60 * 60 * 1000; // 1 day
      default: return 5 * 60 * 1000;
    }
  }

  /**
   * Analyze performance bottlenecks
   */
  private async analyzeBottlenecks(): Promise<void> {
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    if (!currentMetrics) return;

    const bottlenecks: PerformanceBottleneck[] = [];

    // Analyze CPU bottlenecks
    if (currentMetrics.systemLoad.cpu > 80) {
      bottlenecks.push(this.createCPUBottleneck(currentMetrics));
    }

    // Analyze memory bottlenecks
    if (currentMetrics.systemLoad.memory > 85) {
      bottlenecks.push(this.createMemoryBottleneck(currentMetrics));
    }

    // Analyze service response time bottlenecks
    const slowServices = Object.entries(currentMetrics.services).filter(
      ([_, service]) => service.responseTime && service.responseTime > 5000
    );

    for (const [serviceName, service] of slowServices) {
      bottlenecks.push(this.createServiceBottleneck(serviceName, service, currentMetrics));
    }

    // Update bottlenecks map
    bottlenecks.forEach(bottleneck => {
      this.bottlenecks.set(bottleneck.id, bottleneck);
    });

    // Clean up resolved bottlenecks
    this.cleanupResolvedBottlenecks(currentMetrics);

    if (bottlenecks.length > 0) {
      this.emit('bottlenecksDetected', bottlenecks);
    }
  }

  /**
   * Create CPU bottleneck
   */
  private createCPUBottleneck(metrics: HealthMetrics): PerformanceBottleneck {
    return {
      id: `cpu_bottleneck_${Date.now()}`,
      component: 'CPU',
      type: 'cpu',
      severity: metrics.systemLoad.cpu > 95 ? 'critical' : 'high',
      metrics: {
        current: { cpu_usage: metrics.systemLoad.cpu },
        baseline: { cpu_usage: 50 },
        deviation: ((metrics.systemLoad.cpu - 50) / 50) * 100
      },
      impact: {
        affectedServices: Object.keys(metrics.services),
        performanceDegradation: Math.min(50, (metrics.systemLoad.cpu - 80) * 2),
        userExperienceImpact: metrics.systemLoad.cpu > 95 ? 'severe' : 'significant'
      },
      resolution: {
        recommendations: [
          'Scale up CPU resources',
          'Optimize application code',
          'Implement caching',
          'Load balance across more instances'
        ],
        estimatedEffort: 'medium',
        estimatedCost: 500,
        timeline: '2-4 hours'
      }
    };
  }

  /**
   * Create memory bottleneck
   */
  private createMemoryBottleneck(metrics: HealthMetrics): PerformanceBottleneck {
    return {
      id: `memory_bottleneck_${Date.now()}`,
      component: 'Memory',
      type: 'memory',
      severity: metrics.systemLoad.memory > 95 ? 'critical' : 'high',
      metrics: {
        current: { memory_usage: metrics.systemLoad.memory },
        baseline: { memory_usage: 60 },
        deviation: ((metrics.systemLoad.memory - 60) / 60) * 100
      },
      impact: {
        affectedServices: Object.keys(metrics.services),
        performanceDegradation: Math.min(60, (metrics.systemLoad.memory - 85) * 3),
        userExperienceImpact: metrics.systemLoad.memory > 95 ? 'severe' : 'significant'
      },
      resolution: {
        recommendations: [
          'Increase memory allocation',
          'Optimize memory usage in applications',
          'Implement garbage collection tuning',
          'Add memory caching layers'
        ],
        estimatedEffort: 'medium',
        estimatedCost: 300,
        timeline: '1-3 hours'
      }
    };
  }

  /**
   * Create service bottleneck
   */
  private createServiceBottleneck(
    serviceName: string,
    service: HealthMetrics['services'][string],
    metrics: HealthMetrics
  ): PerformanceBottleneck {
    return {
      id: `service_bottleneck_${serviceName}_${Date.now()}`,
      component: serviceName,
      type: 'application',
      severity: (service.responseTime || 0) > 10000 ? 'critical' : 'high',
      metrics: {
        current: { 
          response_time: service.responseTime || 0,
          error_rate: service.errorRate || 0
        },
        baseline: { 
          response_time: 1000,
          error_rate: 1
        },
        deviation: ((service.responseTime || 0) - 1000) / 1000 * 100
      },
      impact: {
        affectedServices: [serviceName],
        performanceDegradation: Math.min(80, ((service.responseTime || 0) - 5000) / 100),
        userExperienceImpact: (service.responseTime || 0) > 10000 ? 'severe' : 'significant'
      },
      resolution: {
        recommendations: [
          'Optimize database queries',
          'Implement connection pooling',
          'Add service caching',
          'Scale service horizontally'
        ],
        estimatedEffort: 'high',
        estimatedCost: 800,
        timeline: '4-8 hours'
      }
    };
  }

  /**
   * Clean up resolved bottlenecks
   */
  private cleanupResolvedBottlenecks(currentMetrics: HealthMetrics): void {
    for (const [id, bottleneck] of this.bottlenecks.entries()) {
      let isResolved = false;

      switch (bottleneck.type) {
        case 'cpu':
          isResolved = currentMetrics.systemLoad.cpu < 70;
          break;
        case 'memory':
          isResolved = currentMetrics.systemLoad.memory < 75;
          break;
        case 'application':
          const service = currentMetrics.services[bottleneck.component];
          isResolved = !service || (service.responseTime || 0) < 3000;
          break;
      }

      if (isResolved) {
        this.bottlenecks.delete(id);
        this.emit('bottleneckResolved', bottleneck);
      }
    }
  }

  /**
   * Generate auto-scaling recommendations
   */
  private async generateScalingRecommendations(): Promise<void> {
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    if (!currentMetrics) return;

    const recommendations: AutoScalingRecommendation[] = [];

    // Check CPU scaling needs
    const cpuRecommendation = this.generateCPUScalingRecommendation(currentMetrics);
    if (cpuRecommendation) recommendations.push(cpuRecommendation);

    // Check memory scaling needs
    const memoryRecommendation = this.generateMemoryScalingRecommendation(currentMetrics);
    if (memoryRecommendation) recommendations.push(memoryRecommendation);

    // Check service scaling needs
    const serviceRecommendations = this.generateServiceScalingRecommendations(currentMetrics);
    recommendations.push(...serviceRecommendations);

    // Store recommendations
    this.scalingRecommendations.push(...recommendations);

    // Trim recommendations history
    if (this.scalingRecommendations.length > 1000) {
      this.scalingRecommendations = this.scalingRecommendations.slice(-1000);
    }

    if (recommendations.length > 0) {
      this.emit('scalingRecommendationsGenerated', recommendations);
    }
  }

  /**
   * Generate CPU scaling recommendation
   */
  private generateCPUScalingRecommendation(metrics: HealthMetrics): AutoScalingRecommendation | null {
    const cpuUsage = metrics.systemLoad.cpu;
    const threshold = this.scalingThresholds.cpu;

    if (cpuUsage > threshold.critical) {
      return {
        id: `cpu_scale_up_${Date.now()}`,
        timestamp: new Date(),
        component: 'CPU',
        action: 'scale_up',
        priority: 'urgent',
        trigger: {
          metric: 'cpu_usage',
          currentValue: cpuUsage,
          threshold: threshold.critical,
          duration: 300 // Assume 5 minutes
        },
        recommendation: {
          targetCapacity: Math.ceil(cpuUsage / 70), // Scale to 70% utilization
          estimatedCost: 200,
          estimatedImpact: 'Improved response times and system stability',
          implementationSteps: [
            'Increase CPU allocation by 50%',
            'Monitor performance for 15 minutes',
            'Adjust if necessary'
          ]
        },
        riskAssessment: {
          level: 'low',
          factors: ['Increased costs'],
          mitigationSteps: ['Monitor usage patterns', 'Set up auto-scaling policies']
        },
        costOptimization: {
          currentCost: 400,
          projectedCost: 600,
          savings: -200,
          paybackPeriod: undefined
        }
      };
    } else if (cpuUsage < 30) {
      return {
        id: `cpu_scale_down_${Date.now()}`,
        timestamp: new Date(),
        component: 'CPU',
        action: 'scale_down',
        priority: 'low',
        trigger: {
          metric: 'cpu_usage',
          currentValue: cpuUsage,
          threshold: 30,
          duration: 1800 // 30 minutes
        },
        recommendation: {
          targetCapacity: Math.max(1, Math.floor(cpuUsage / 50)), // Scale to 50% utilization
          estimatedCost: -100,
          estimatedImpact: 'Cost savings with minimal performance impact',
          implementationSteps: [
            'Reduce CPU allocation by 25%',
            'Monitor performance for 30 minutes',
            'Revert if performance degrades'
          ]
        },
        riskAssessment: {
          level: 'medium',
          factors: ['Potential performance degradation during traffic spikes'],
          mitigationSteps: ['Set up auto-scaling triggers', 'Monitor closely during peak hours']
        },
        costOptimization: {
          currentCost: 400,
          projectedCost: 300,
          savings: 100,
          paybackPeriod: 1
        }
      };
    }

    return null;
  }

  /**
   * Generate memory scaling recommendation
   */
  private generateMemoryScalingRecommendation(metrics: HealthMetrics): AutoScalingRecommendation | null {
    const memoryUsage = metrics.systemLoad.memory;
    const threshold = this.scalingThresholds.memory;

    if (memoryUsage > threshold.critical) {
      return {
        id: `memory_scale_up_${Date.now()}`,
        timestamp: new Date(),
        component: 'Memory',
        action: 'scale_up',
        priority: 'high',
        trigger: {
          metric: 'memory_usage',
          currentValue: memoryUsage,
          threshold: threshold.critical,
          duration: 180
        },
        recommendation: {
          targetCapacity: Math.ceil(memoryUsage / 75), // Scale to 75% utilization
          estimatedCost: 150,
          estimatedImpact: 'Prevent out-of-memory errors and improve stability',
          implementationSteps: [
            'Increase memory allocation by 40%',
            'Restart services if necessary',
            'Monitor memory usage patterns'
          ]
        },
        riskAssessment: {
          level: 'low',
          factors: ['Increased costs', 'Potential service restart required'],
          mitigationSteps: ['Gradual scaling', 'Rolling restarts']
        },
        costOptimization: {
          currentCost: 300,
          projectedCost: 450,
          savings: -150
        }
      };
    }

    return null;
  }

  /**
   * Generate service scaling recommendations
   */
  private generateServiceScalingRecommendations(metrics: HealthMetrics): AutoScalingRecommendation[] {
    const recommendations: AutoScalingRecommendation[] = [];

    for (const [serviceName, service] of Object.entries(metrics.services)) {
      if (service.responseTime && service.responseTime > 5000) {
        recommendations.push({
          id: `service_scale_out_${serviceName}_${Date.now()}`,
          timestamp: new Date(),
          component: serviceName,
          action: 'scale_out',
          priority: service.responseTime > 10000 ? 'urgent' : 'high',
          trigger: {
            metric: 'response_time',
            currentValue: service.responseTime,
            threshold: 5000,
            duration: 300
          },
          recommendation: {
            targetCapacity: Math.ceil(service.responseTime / 2000), // Target 2s response time
            estimatedCost: 250,
            estimatedImpact: 'Improved response times and user experience',
            implementationSteps: [
              'Deploy additional service instances',
              'Configure load balancing',
              'Monitor response times'
            ]
          },
          riskAssessment: {
            level: 'low',
            factors: ['Increased infrastructure costs'],
            mitigationSteps: ['Auto-scaling policies', 'Performance monitoring']
          },
          costOptimization: {
            currentCost: 500,
            projectedCost: 750,
            savings: -250
          }
        });
      }
    }

    return recommendations;
  }

  /**
   * Perform cost optimization analysis
   */
  private async performCostOptimizationAnalysis(): Promise<void> {
    const analysis: CostOptimizationAnalysis = {
      timestamp: new Date(),
      totalCost: 2500, // Simulated total monthly cost
      breakdown: {
        compute: 1200,
        storage: 400,
        network: 300,
        database: 500,
        monitoring: 100,
        other: 0
      },
      optimizations: [],
      rightsizing: []
    };

    // Analyze compute optimization
    const avgCPUUsage = this.calculateAverageCPUUsage();
    if (avgCPUUsage < 40) {
      analysis.optimizations.push({
        category: 'Compute',
        description: 'Right-size compute instances based on actual usage',
        potentialSavings: 300,
        implementation: 'short_term',
        risk: 'medium',
        effort: 'medium'
      });

      analysis.rightsizing.push({
        resource: 'Application Servers',
        currentSize: 'c5.2xlarge',
        recommendedSize: 'c5.xlarge',
        utilization: avgCPUUsage,
        savings: 300
      });
    }

    // Analyze storage optimization
    analysis.optimizations.push({
      category: 'Storage',
      description: 'Implement intelligent tiering for infrequently accessed data',
      potentialSavings: 120,
      implementation: 'immediate',
      risk: 'low',
      effort: 'low'
    });

    // Analyze database optimization
    analysis.optimizations.push({
      category: 'Database',
      description: 'Optimize database instance sizing and implement read replicas',
      potentialSavings: 150,
      implementation: 'long_term',
      risk: 'medium',
      effort: 'high'
    });

    this.costAnalyses.push(analysis);

    // Trim history
    if (this.costAnalyses.length > 100) {
      this.costAnalyses = this.costAnalyses.slice(-100);
    }

    this.emit('costOptimizationAnalysisCompleted', analysis);
  }

  /**
   * Calculate average CPU usage
   */
  private calculateAverageCPUUsage(): number {
    if (this.resourceHistory.length === 0) return 50;

    const recentHistory = this.resourceHistory.slice(-60); // Last hour
    const totalCPU = recentHistory.reduce((sum, h) => sum + h.cpu, 0);
    return totalCPU / recentHistory.length;
  }

  /**
   * Process health score for capacity planning
   */
  private processHealthScoreForCapacity(healthScore: any): void {
    // Use health score trends for capacity planning
    if (healthScore.trends.direction === 'degrading') {
      this.emit('capacityAlert', {
        type: 'health_degradation',
        message: 'System health is degrading, consider scaling resources',
        severity: 'warning'
      });
    }
  }

  /**
   * Process metrics for capacity planning
   */
  private processMetricsForCapacity(metrics: HealthMetrics): void {
    // Additional processing for capacity planning
    this.emit('capacityMetricsProcessed', {
      timestamp: new Date(),
      cpu: metrics.systemLoad.cpu,
      memory: metrics.systemLoad.memory
    });
  }

  /**
   * Get resource usage predictions
   */
  getResourcePredictions(
    resource?: ResourceUsagePrediction['resource'],
    timeframe?: ResourceUsagePrediction['timeframe']
  ): ResourceUsagePrediction[] {
    const predictions = Array.from(this.resourcePredictions.values());
    
    let filtered = predictions;
    if (resource) {
      filtered = filtered.filter(p => p.resource === resource);
    }
    if (timeframe) {
      filtered = filtered.filter(p => p.timeframe === timeframe);
    }

    return filtered;
  }

  /**
   * Get auto-scaling recommendations
   */
  getScalingRecommendations(priority?: AutoScalingRecommendation['priority']): AutoScalingRecommendation[] {
    let recommendations = this.scalingRecommendations;
    
    if (priority) {
      recommendations = recommendations.filter(r => r.priority === priority);
    }

    // Return most recent recommendations first
    return recommendations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance bottlenecks
   */
  getPerformanceBottlenecks(severity?: PerformanceBottleneck['severity']): PerformanceBottleneck[] {
    const bottlenecks = Array.from(this.bottlenecks.values());
    
    if (severity) {
      return bottlenecks.filter(b => b.severity === severity);
    }

    return bottlenecks;
  }

  /**
   * Get cost optimization analyses
   */
  getCostOptimizationAnalyses(limit?: number): CostOptimizationAnalysis[] {
    const actualLimit = limit || this.costAnalyses.length;
    return this.costAnalyses.slice(-actualLimit);
  }

  /**
   * Get resource usage history
   */
  getResourceUsageHistory(hours?: number): typeof this.resourceHistory {
    if (!hours) return this.resourceHistory;

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.resourceHistory.filter(h => h.timestamp >= cutoff);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    if (this.predictionInterval) {
      clearInterval(this.predictionInterval);
      this.predictionInterval = undefined;
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

export const capacityPlanningService = new CapacityPlanningService();
