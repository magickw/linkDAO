import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { enhancedSystemHealthService, SystemHealthScore } from './enhancedSystemHealthService';
import { safeLogger } from '../utils/safeLogger';
import { capacityPlanningService, PerformanceBottleneck } from './capacityPlanningService';
import { safeLogger } from '../utils/safeLogger';
import { systemHealthMonitoringService, HealthMetrics } from './systemHealthMonitoringService';
import { safeLogger } from '../utils/safeLogger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface PerformanceBenchmark {
  id: string;
  name: string;
  category: 'response_time' | 'throughput' | 'availability' | 'resource_usage' | 'user_experience';
  target: number;
  current: number;
  trend: 'improving' | 'stable' | 'degrading';
  
  historical: Array<{
    timestamp: Date;
    value: number;
  }>;
  
  sla: {
    target: number;
    current: number;
    breaches: number;
    uptime: number;
  };
}

export interface PerformanceOptimizationRecommendation {
  id: string;
  timestamp: Date;
  category: 'database' | 'application' | 'infrastructure' | 'network' | 'caching';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  issue: {
    description: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    affectedComponents: string[];
    rootCause: string;
  };
  
  recommendation: {
    title: string;
    description: string;
    steps: string[];
    estimatedImpact: string;
    estimatedEffort: 'low' | 'medium' | 'high';
    estimatedCost: number;
    timeline: string;
  };
  
  metrics: {
    before: Record<string, number>;
    expectedAfter: Record<string, number>;
    improvement: Record<string, number>;
  };
  
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigationSteps: string[];
  };
}

export interface PerformanceImpactAssessment {
  changeId: string;
  timestamp: Date;
  changeType: 'deployment' | 'configuration' | 'scaling' | 'optimization';
  
  beforeMetrics: Record<string, number>;
  afterMetrics: Record<string, number>;
  
  impact: {
    overall: 'positive' | 'negative' | 'neutral';
    magnitude: 'low' | 'medium' | 'high';
    confidence: number;
  };
  
  affectedMetrics: Array<{
    metric: string;
    change: number;
    changePercent: number;
    significance: 'low' | 'medium' | 'high';
  }>;
  
  userExperienceImpact: {
    responseTime: number;
    errorRate: number;
    availability: number;
    satisfaction: 'improved' | 'unchanged' | 'degraded';
  };
}

export interface PerformanceTrendAnalysis {
  metric: string;
  timeframe: '1h' | '6h' | '24h' | '7d' | '30d';
  
  trend: {
    direction: 'up' | 'down' | 'stable';
    strength: 'weak' | 'moderate' | 'strong';
    confidence: number;
  };
  
  statistics: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    stdDev: number;
  };
  
  seasonality: {
    detected: boolean;
    pattern: 'daily' | 'weekly' | 'monthly' | 'none';
    strength: number;
  };
  
  anomalies: Array<{
    timestamp: Date;
    value: number;
    severity: 'low' | 'medium' | 'high';
    type: 'spike' | 'drop' | 'outlier';
  }>;
  
  forecast: Array<{
    timestamp: Date;
    predicted: number;
    confidence: number;
  }>;
}

/**
 * Performance Analytics Service
 * Provides comprehensive performance analysis, benchmarking, and optimization recommendations
 */
export class PerformanceAnalyticsService extends EventEmitter {
  private performanceMetrics: Map<string, PerformanceMetric[]> = new Map();
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private optimizationRecommendations: PerformanceOptimizationRecommendation[] = [];
  private impactAssessments: PerformanceImpactAssessment[] = [];
  private trendAnalyses: Map<string, PerformanceTrendAnalysis> = new Map();
  
  // Configuration
  private readonly metricRetentionDays = 30;
  private readonly analysisInterval = 5 * 60 * 1000; // 5 minutes
  private readonly benchmarkInterval = 15 * 60 * 1000; // 15 minutes
  
  private analysisTimer?: NodeJS.Timeout;
  private benchmarkTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.setupDefaultBenchmarks();
    this.startPerformanceAnalysis();
    this.setupEventListeners();
  }

  /**
   * Setup default performance benchmarks
   */
  private setupDefaultBenchmarks(): void {
    // Response time benchmark
    this.addBenchmark({
      id: 'api_response_time',
      name: 'API Response Time',
      category: 'response_time',
      target: 200, // 200ms
      current: 0,
      trend: 'stable',
      historical: [],
      sla: {
        target: 95, // 95% of requests under 200ms
        current: 0,
        breaches: 0,
        uptime: 100
      }
    });

    // Throughput benchmark
    this.addBenchmark({
      id: 'system_throughput',
      name: 'System Throughput',
      category: 'throughput',
      target: 1000, // 1000 requests/second
      current: 0,
      trend: 'stable',
      historical: [],
      sla: {
        target: 900, // Minimum 900 req/s
        current: 0,
        breaches: 0,
        uptime: 100
      }
    });

    // Availability benchmark
    this.addBenchmark({
      id: 'system_availability',
      name: 'System Availability',
      category: 'availability',
      target: 99.9, // 99.9% uptime
      current: 0,
      trend: 'stable',
      historical: [],
      sla: {
        target: 99.5,
        current: 0,
        breaches: 0,
        uptime: 100
      }
    });

    // Resource usage benchmarks
    this.addBenchmark({
      id: 'cpu_efficiency',
      name: 'CPU Efficiency',
      category: 'resource_usage',
      target: 70, // Target 70% utilization
      current: 0,
      trend: 'stable',
      historical: [],
      sla: {
        target: 85, // Alert if over 85%
        current: 0,
        breaches: 0,
        uptime: 100
      }
    });

    this.addBenchmark({
      id: 'memory_efficiency',
      name: 'Memory Efficiency',
      category: 'resource_usage',
      target: 75, // Target 75% utilization
      current: 0,
      trend: 'stable',
      historical: [],
      sla: {
        target: 90, // Alert if over 90%
        current: 0,
        breaches: 0,
        uptime: 100
      }
    });
  }

  /**
   * Add performance benchmark
   */
  addBenchmark(benchmark: PerformanceBenchmark): void {
    this.benchmarks.set(benchmark.id, benchmark);
    this.emit('benchmarkAdded', benchmark);
  }

  /**
   * Start performance analysis
   */
  private startPerformanceAnalysis(): void {
    // Continuous analysis every 5 minutes
    this.analysisTimer = setInterval(async () => {
      try {
        await this.collectPerformanceMetrics();
        await this.analyzeTrends();
        await this.generateOptimizationRecommendations();
        await this.detectPerformanceAnomalies();
      } catch (error) {
        safeLogger.error('Performance analysis error:', error);
        this.emit('analysisError', error);
      }
    }, this.analysisInterval);

    // Benchmark evaluation every 15 minutes
    this.benchmarkTimer = setInterval(async () => {
      try {
        await this.evaluateBenchmarks();
        await this.assessPerformanceImpact();
      } catch (error) {
        safeLogger.error('Benchmark evaluation error:', error);
        this.emit('benchmarkError', error);
      }
    }, this.benchmarkInterval);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    systemHealthMonitoringService.on('metricsCollected', (metrics: HealthMetrics) => {
      this.processSystemMetrics(metrics);
    });

    enhancedSystemHealthService.on('healthScoreCalculated', (healthScore: SystemHealthScore) => {
      this.processHealthScore(healthScore);
    });

    capacityPlanningService.on('bottlenecksDetected', (bottlenecks: PerformanceBottleneck[]) => {
      this.processBottlenecks(bottlenecks);
    });
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<void> {
    const timestamp = new Date();
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    const healthScore = enhancedSystemHealthService.getCurrentHealthScore();
    
    if (!currentMetrics || !healthScore) return;

    // Collect various performance metrics
    const metrics: PerformanceMetric[] = [
      {
        name: 'response_time_avg',
        value: this.calculateAverageResponseTime(currentMetrics),
        unit: 'ms',
        timestamp,
        tags: { type: 'latency', component: 'api' }
      },
      {
        name: 'response_time_p95',
        value: this.calculateP95ResponseTime(currentMetrics),
        unit: 'ms',
        timestamp,
        tags: { type: 'latency', component: 'api', percentile: '95' }
      },
      {
        name: 'throughput',
        value: this.calculateThroughput(currentMetrics),
        unit: 'req/s',
        timestamp,
        tags: { type: 'throughput', component: 'system' }
      },
      {
        name: 'error_rate',
        value: this.calculateErrorRate(currentMetrics),
        unit: '%',
        timestamp,
        tags: { type: 'reliability', component: 'system' }
      },
      {
        name: 'cpu_utilization',
        value: currentMetrics.systemLoad.cpu,
        unit: '%',
        timestamp,
        tags: { type: 'resource', component: 'cpu' }
      },
      {
        name: 'memory_utilization',
        value: currentMetrics.systemLoad.memory,
        unit: '%',
        timestamp,
        tags: { type: 'resource', component: 'memory' }
      },
      {
        name: 'system_health_score',
        value: healthScore.overall,
        unit: 'score',
        timestamp,
        tags: { type: 'health', component: 'system' }
      }
    ];

    // Store metrics
    for (const metric of metrics) {
      this.storeMetric(metric);
    }

    this.emit('metricsCollected', metrics);
  }

  /**
   * Store performance metric
   */
  private storeMetric(metric: PerformanceMetric): void {
    const key = metric.name;
    const existing = this.performanceMetrics.get(key) || [];
    
    existing.push(metric);
    
    // Trim old metrics (keep last 30 days)
    const cutoff = new Date(Date.now() - this.metricRetentionDays * 24 * 60 * 60 * 1000);
    const filtered = existing.filter(m => m.timestamp >= cutoff);
    
    this.performanceMetrics.set(key, filtered);
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(metrics: HealthMetrics): number {
    const services = Object.values(metrics.services);
    if (services.length === 0) return 0;
    
    const totalResponseTime = services.reduce((sum, service) => sum + (service.responseTime || 0), 0);
    return totalResponseTime / services.length;
  }

  /**
   * Calculate P95 response time
   */
  private calculateP95ResponseTime(metrics: HealthMetrics): number {
    const responseTimes = Object.values(metrics.services)
      .map(service => service.responseTime || 0)
      .filter(rt => rt > 0)
      .sort((a, b) => a - b);
    
    if (responseTimes.length === 0) return 0;
    
    const p95Index = Math.floor(responseTimes.length * 0.95);
    return responseTimes[p95Index] || 0;
  }

  /**
   * Calculate system throughput
   */
  private calculateThroughput(metrics: HealthMetrics): number {
    return Object.values(metrics.services).reduce((sum, service) => sum + (service.throughput || 0), 0);
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(metrics: HealthMetrics): number {
    const services = Object.values(metrics.services);
    if (services.length === 0) return 0;
    
    const totalErrorRate = services.reduce((sum, service) => sum + (service.errorRate || 0), 0);
    return totalErrorRate / services.length;
  }

  /**
   * Analyze performance trends
   */
  private async analyzeTrends(): Promise<void> {
    const metricNames = Array.from(this.performanceMetrics.keys());
    const timeframes: PerformanceTrendAnalysis['timeframe'][] = ['1h', '6h', '24h', '7d', '30d'];
    
    for (const metricName of metricNames) {
      for (const timeframe of timeframes) {
        const analysis = await this.analyzeTrendForMetric(metricName, timeframe);
        const key = `${metricName}_${timeframe}`;
        this.trendAnalyses.set(key, analysis);
      }
    }
    
    this.emit('trendsAnalyzed', {
      timestamp: new Date(),
      analysisCount: this.trendAnalyses.size
    });
  }

  /**
   * Analyze trend for specific metric and timeframe
   */
  private async analyzeTrendForMetric(
    metricName: string,
    timeframe: PerformanceTrendAnalysis['timeframe']
  ): Promise<PerformanceTrendAnalysis> {
    const metrics = this.getMetricsForTimeframe(metricName, timeframe);
    const values = metrics.map(m => m.value);
    
    // Calculate statistics
    const statistics = this.calculateStatistics(values);
    
    // Detect trend
    const trend = this.detectTrend(values);
    
    // Detect seasonality
    const seasonality = this.detectSeasonality(metrics);
    
    // Detect anomalies
    const anomalies = this.detectAnomalies(metrics, statistics);
    
    // Generate forecast
    const forecast = this.generateForecast(metrics, 12); // 12 future points
    
    return {
      metric: metricName,
      timeframe,
      trend,
      statistics,
      seasonality,
      anomalies,
      forecast
    };
  }

  /**
   * Get metrics for specific timeframe
   */
  private getMetricsForTimeframe(
    metricName: string,
    timeframe: PerformanceTrendAnalysis['timeframe']
  ): PerformanceMetric[] {
    const allMetrics = this.performanceMetrics.get(metricName) || [];
    const timeframeMs = this.getTimeframeMs(timeframe);
    const cutoff = new Date(Date.now() - timeframeMs);
    
    return allMetrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get timeframe in milliseconds
   */
  private getTimeframeMs(timeframe: PerformanceTrendAnalysis['timeframe']): number {
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
   * Calculate statistics for values
   */
  private calculateStatistics(values: number[]): PerformanceTrendAnalysis['statistics'] {
    if (values.length === 0) {
      return { mean: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0, stdDev: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return { mean, median, p95, p99, min, max, stdDev };
  }

  /**
   * Detect trend in values
   */
  private detectTrend(values: number[]): PerformanceTrendAnalysis['trend'] {
    if (values.length < 2) {
      return { direction: 'stable', strength: 'weak', confidence: 0 };
    }
    
    // Simple linear regression for trend detection
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Determine direction
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (slope > 0.1) direction = 'up';
    else if (slope < -0.1) direction = 'down';
    
    // Determine strength
    const absSlope = Math.abs(slope);
    let strength: 'weak' | 'moderate' | 'strong' = 'weak';
    if (absSlope > 1) strength = 'strong';
    else if (absSlope > 0.5) strength = 'moderate';
    
    // Calculate confidence based on R-squared
    const mean = sumY / n;
    const totalSumSquares = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    const residualSumSquares = values.reduce((sum, val, index) => {
      const predicted = (sumY / n) + slope * (index - (n - 1) / 2);
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const rSquared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
    const confidence = Math.max(0, Math.min(1, rSquared));
    
    return { direction, strength, confidence };
  }

  /**
   * Detect seasonality in metrics
   */
  private detectSeasonality(metrics: PerformanceMetric[]): PerformanceTrendAnalysis['seasonality'] {
    if (metrics.length < 24) {
      return { detected: false, pattern: 'none', strength: 0 };
    }
    
    // Simple daily pattern detection
    const hourlyAverages = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    metrics.forEach(metric => {
      const hour = metric.timestamp.getHours();
      hourlyAverages[hour] += metric.value;
      hourlyCounts[hour]++;
    });
    
    // Calculate averages
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyAverages[i] /= hourlyCounts[i];
      }
    }
    
    // Calculate variance in hourly averages
    const mean = hourlyAverages.reduce((a, b) => a + b, 0) / 24;
    const variance = hourlyAverages.reduce((sum, avg) => sum + Math.pow(avg - mean, 2), 0) / 24;
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0;
    
    const detected = coefficientOfVariation > 0.2; // 20% variation indicates seasonality
    const pattern = detected ? 'daily' : 'none';
    const strength = Math.min(1, coefficientOfVariation);
    
    return { detected, pattern, strength };
  }

  /**
   * Detect anomalies in metrics
   */
  private detectAnomalies(
    metrics: PerformanceMetric[],
    statistics: PerformanceTrendAnalysis['statistics']
  ): PerformanceTrendAnalysis['anomalies'] {
    const anomalies: PerformanceTrendAnalysis['anomalies'] = [];
    
    const threshold = 2 * statistics.stdDev; // 2 standard deviations
    
    metrics.forEach(metric => {
      const deviation = Math.abs(metric.value - statistics.mean);
      
      if (deviation > threshold) {
        let severity: 'low' | 'medium' | 'high' = 'low';
        let type: 'spike' | 'drop' | 'outlier' = 'outlier';
        
        if (deviation > 3 * statistics.stdDev) {
          severity = 'high';
        } else if (deviation > 2.5 * statistics.stdDev) {
          severity = 'medium';
        }
        
        if (metric.value > statistics.mean + threshold) {
          type = 'spike';
        } else if (metric.value < statistics.mean - threshold) {
          type = 'drop';
        }
        
        anomalies.push({
          timestamp: metric.timestamp,
          value: metric.value,
          severity,
          type
        });
      }
    });
    
    return anomalies;
  }

  /**
   * Generate forecast for metrics
   */
  private generateForecast(
    metrics: PerformanceMetric[],
    points: number
  ): PerformanceTrendAnalysis['forecast'] {
    if (metrics.length < 2) return [];
    
    const forecast: PerformanceTrendAnalysis['forecast'] = [];
    const values = metrics.map(m => m.value);
    const trend = this.detectTrend(values);
    
    const lastMetric = metrics[metrics.length - 1];
    const intervalMs = this.analysisInterval; // Use analysis interval for forecast
    
    // Simple trend-based forecast
    const trendMultiplier = trend.direction === 'up' ? 1 : trend.direction === 'down' ? -1 : 0;
    const baseChange = (values[values.length - 1] - values[0]) / values.length;
    
    for (let i = 1; i <= points; i++) {
      const futureTimestamp = new Date(lastMetric.timestamp.getTime() + (i * intervalMs));
      const predicted = lastMetric.value + (baseChange * trendMultiplier * i);
      const confidence = Math.max(0.1, trend.confidence * Math.exp(-0.1 * i)); // Decreasing confidence
      
      forecast.push({
        timestamp: futureTimestamp,
        predicted: Math.max(0, predicted),
        confidence
      });
    }
    
    return forecast;
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(): Promise<void> {
    const recommendations: PerformanceOptimizationRecommendation[] = [];
    
    // Analyze current metrics for optimization opportunities
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    const bottlenecks = capacityPlanningService.getPerformanceBottlenecks();
    
    if (!currentMetrics) return;
    
    // Database optimization recommendations
    const dbRecommendations = this.generateDatabaseOptimizations(currentMetrics);
    recommendations.push(...dbRecommendations);
    
    // Application optimization recommendations
    const appRecommendations = this.generateApplicationOptimizations(currentMetrics);
    recommendations.push(...appRecommendations);
    
    // Infrastructure optimization recommendations
    const infraRecommendations = this.generateInfrastructureOptimizations(currentMetrics, bottlenecks);
    recommendations.push(...infraRecommendations);
    
    // Caching optimization recommendations
    const cacheRecommendations = this.generateCachingOptimizations(currentMetrics);
    recommendations.push(...cacheRecommendations);
    
    // Store recommendations
    this.optimizationRecommendations.push(...recommendations);
    
    // Trim recommendations history
    if (this.optimizationRecommendations.length > 1000) {
      this.optimizationRecommendations = this.optimizationRecommendations.slice(-1000);
    }
    
    if (recommendations.length > 0) {
      this.emit('optimizationRecommendationsGenerated', recommendations);
    }
  }

  /**
   * Generate database optimization recommendations
   */
  private generateDatabaseOptimizations(metrics: HealthMetrics): PerformanceOptimizationRecommendation[] {
    const recommendations: PerformanceOptimizationRecommendation[] = [];
    
    // Check for slow database queries
    const avgResponseTime = this.calculateAverageResponseTime(metrics);
    if (avgResponseTime > 1000) {
      recommendations.push({
        id: `db_optimization_${Date.now()}`,
        timestamp: new Date(),
        category: 'database',
        priority: avgResponseTime > 5000 ? 'critical' : 'high',
        issue: {
          description: 'Slow database query performance detected',
          impact: avgResponseTime > 5000 ? 'critical' : 'high',
          affectedComponents: ['Database', 'API Services'],
          rootCause: 'Unoptimized queries or missing indexes'
        },
        recommendation: {
          title: 'Optimize Database Performance',
          description: 'Implement query optimization and indexing strategies',
          steps: [
            'Analyze slow query logs',
            'Add missing database indexes',
            'Optimize complex queries',
            'Implement query result caching',
            'Consider database connection pooling'
          ],
          estimatedImpact: `Reduce response time by 40-60% (from ${avgResponseTime}ms to ${Math.round(avgResponseTime * 0.5)}ms)`,
          estimatedEffort: 'medium',
          estimatedCost: 500,
          timeline: '1-2 weeks'
        },
        metrics: {
          before: { response_time: avgResponseTime },
          expectedAfter: { response_time: avgResponseTime * 0.5 },
          improvement: { response_time: avgResponseTime * 0.5 }
        },
        riskAssessment: {
          level: 'medium',
          factors: ['Potential downtime during index creation', 'Query plan changes'],
          mitigationSteps: ['Test in staging environment', 'Gradual rollout', 'Monitor performance closely']
        }
      });
    }
    
    return recommendations;
  }

  /**
   * Generate application optimization recommendations
   */
  private generateApplicationOptimizations(metrics: HealthMetrics): PerformanceOptimizationRecommendation[] {
    const recommendations: PerformanceOptimizationRecommendation[] = [];
    
    // Check for high error rates
    const errorRate = this.calculateErrorRate(metrics);
    if (errorRate > 2) {
      recommendations.push({
        id: `app_optimization_${Date.now()}`,
        timestamp: new Date(),
        category: 'application',
        priority: errorRate > 5 ? 'critical' : 'high',
        issue: {
          description: 'High application error rate detected',
          impact: errorRate > 5 ? 'critical' : 'high',
          affectedComponents: ['Application Services', 'User Experience'],
          rootCause: 'Application bugs or resource constraints'
        },
        recommendation: {
          title: 'Reduce Application Error Rate',
          description: 'Implement error handling improvements and resource optimization',
          steps: [
            'Analyze error logs and patterns',
            'Implement better error handling',
            'Add circuit breakers for external services',
            'Optimize resource usage',
            'Implement retry mechanisms'
          ],
          estimatedImpact: `Reduce error rate from ${errorRate}% to <1%`,
          estimatedEffort: 'high',
          estimatedCost: 800,
          timeline: '2-3 weeks'
        },
        metrics: {
          before: { error_rate: errorRate },
          expectedAfter: { error_rate: 0.5 },
          improvement: { error_rate: errorRate - 0.5 }
        },
        riskAssessment: {
          level: 'low',
          factors: ['Code changes may introduce new bugs'],
          mitigationSteps: ['Comprehensive testing', 'Gradual deployment', 'Rollback plan']
        }
      });
    }
    
    return recommendations;
  }

  /**
   * Generate infrastructure optimization recommendations
   */
  private generateInfrastructureOptimizations(
    metrics: HealthMetrics,
    bottlenecks: PerformanceBottleneck[]
  ): PerformanceOptimizationRecommendation[] {
    const recommendations: PerformanceOptimizationRecommendation[] = [];
    
    // Check for CPU bottlenecks
    if (metrics.systemLoad.cpu > 80) {
      recommendations.push({
        id: `infra_cpu_optimization_${Date.now()}`,
        timestamp: new Date(),
        category: 'infrastructure',
        priority: metrics.systemLoad.cpu > 90 ? 'critical' : 'high',
        issue: {
          description: 'High CPU utilization detected',
          impact: metrics.systemLoad.cpu > 90 ? 'critical' : 'high',
          affectedComponents: ['Application Servers', 'System Performance'],
          rootCause: 'Insufficient CPU resources or inefficient processing'
        },
        recommendation: {
          title: 'Optimize CPU Resources',
          description: 'Scale CPU resources and optimize processing efficiency',
          steps: [
            'Scale up CPU resources',
            'Implement horizontal scaling',
            'Optimize CPU-intensive operations',
            'Add load balancing',
            'Consider auto-scaling policies'
          ],
          estimatedImpact: `Reduce CPU utilization from ${metrics.systemLoad.cpu}% to 60-70%`,
          estimatedEffort: 'medium',
          estimatedCost: 400,
          timeline: '1 week'
        },
        metrics: {
          before: { cpu_utilization: metrics.systemLoad.cpu },
          expectedAfter: { cpu_utilization: 65 },
          improvement: { cpu_utilization: metrics.systemLoad.cpu - 65 }
        },
        riskAssessment: {
          level: 'low',
          factors: ['Increased infrastructure costs'],
          mitigationSteps: ['Monitor cost impact', 'Implement auto-scaling to optimize costs']
        }
      });
    }
    
    return recommendations;
  }

  /**
   * Generate caching optimization recommendations
   */
  private generateCachingOptimizations(metrics: HealthMetrics): PerformanceOptimizationRecommendation[] {
    const recommendations: PerformanceOptimizationRecommendation[] = [];
    
    // Check if caching could help with response times
    const avgResponseTime = this.calculateAverageResponseTime(metrics);
    if (avgResponseTime > 500) {
      recommendations.push({
        id: `cache_optimization_${Date.now()}`,
        timestamp: new Date(),
        category: 'caching',
        priority: 'medium',
        issue: {
          description: 'Response times could benefit from improved caching',
          impact: 'medium',
          affectedComponents: ['API Services', 'Database'],
          rootCause: 'Insufficient or ineffective caching strategies'
        },
        recommendation: {
          title: 'Implement Advanced Caching',
          description: 'Add multi-layer caching to improve response times',
          steps: [
            'Implement Redis caching layer',
            'Add application-level caching',
            'Implement CDN for static content',
            'Add database query result caching',
            'Implement cache warming strategies'
          ],
          estimatedImpact: `Reduce response time by 30-50% (from ${avgResponseTime}ms to ${Math.round(avgResponseTime * 0.6)}ms)`,
          estimatedEffort: 'medium',
          estimatedCost: 300,
          timeline: '1-2 weeks'
        },
        metrics: {
          before: { response_time: avgResponseTime },
          expectedAfter: { response_time: avgResponseTime * 0.6 },
          improvement: { response_time: avgResponseTime * 0.4 }
        },
        riskAssessment: {
          level: 'low',
          factors: ['Cache invalidation complexity', 'Additional infrastructure costs'],
          mitigationSteps: ['Implement proper cache invalidation', 'Monitor cache hit rates']
        }
      });
    }
    
    return recommendations;
  }

  /**
   * Evaluate performance benchmarks
   */
  private async evaluateBenchmarks(): Promise<void> {
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    const healthScore = enhancedSystemHealthService.getCurrentHealthScore();
    
    if (!currentMetrics || !healthScore) return;
    
    const timestamp = new Date();
    
    // Update each benchmark
    for (const [benchmarkId, benchmark] of this.benchmarks.entries()) {
      const currentValue = this.getBenchmarkValue(benchmark, currentMetrics, healthScore);
      const previousValue = benchmark.current;
      
      // Update current value
      benchmark.current = currentValue;
      
      // Add to historical data
      benchmark.historical.push({ timestamp, value: currentValue });
      
      // Trim historical data (keep last 1000 points)
      if (benchmark.historical.length > 1000) {
        benchmark.historical = benchmark.historical.slice(-1000);
      }
      
      // Update trend
      benchmark.trend = this.calculateBenchmarkTrend(benchmark.historical);
      
      // Update SLA metrics
      this.updateSLAMetrics(benchmark, currentValue);
      
      // Check for SLA breaches
      if (this.isSLABreach(benchmark, currentValue)) {
        this.emit('slaBreachDetected', {
          benchmark: benchmarkId,
          current: currentValue,
          target: benchmark.sla.target,
          timestamp
        });
      }
      
      this.emit('benchmarkUpdated', { benchmarkId, benchmark, previousValue, currentValue });
    }
  }

  /**
   * Get benchmark value from current metrics
   */
  private getBenchmarkValue(
    benchmark: PerformanceBenchmark,
    metrics: HealthMetrics,
    healthScore: SystemHealthScore
  ): number {
    switch (benchmark.id) {
      case 'api_response_time':
        return this.calculateAverageResponseTime(metrics);
      case 'system_throughput':
        return this.calculateThroughput(metrics);
      case 'system_availability':
        return this.calculateAvailability(metrics);
      case 'cpu_efficiency':
        return metrics.systemLoad.cpu;
      case 'memory_efficiency':
        return metrics.systemLoad.memory;
      default:
        return 0;
    }
  }

  /**
   * Calculate system availability
   */
  private calculateAvailability(metrics: HealthMetrics): number {
    const totalServices = Object.keys(metrics.services).length;
    if (totalServices === 0) return 100;
    
    const healthyServices = Object.values(metrics.services).filter(
      service => service.status === 'healthy'
    ).length;
    
    return (healthyServices / totalServices) * 100;
  }

  /**
   * Calculate benchmark trend
   */
  private calculateBenchmarkTrend(historical: PerformanceBenchmark['historical']): PerformanceBenchmark['trend'] {
    if (historical.length < 10) return 'stable';
    
    const recent = historical.slice(-10);
    const values = recent.map(h => h.value);
    const trend = this.detectTrend(values);
    
    return trend.direction === 'up' ? 'improving' :
           trend.direction === 'down' ? 'degrading' : 'stable';
  }

  /**
   * Update SLA metrics
   */
  private updateSLAMetrics(benchmark: PerformanceBenchmark, currentValue: number): void {
    // Update current SLA performance
    const isWithinSLA = this.isWithinSLA(benchmark, currentValue);
    
    // Simple SLA calculation (would be more sophisticated in production)
    if (isWithinSLA) {
      benchmark.sla.current = Math.min(100, benchmark.sla.current + 0.1);
    } else {
      benchmark.sla.current = Math.max(0, benchmark.sla.current - 1);
      benchmark.sla.breaches++;
    }
    
    // Update uptime calculation
    benchmark.sla.uptime = benchmark.sla.current;
  }

  /**
   * Check if value is within SLA
   */
  private isWithinSLA(benchmark: PerformanceBenchmark, value: number): boolean {
    switch (benchmark.category) {
      case 'response_time':
        return value <= benchmark.sla.target;
      case 'throughput':
        return value >= benchmark.sla.target;
      case 'availability':
        return value >= benchmark.sla.target;
      case 'resource_usage':
        return value <= benchmark.sla.target;
      default:
        return true;
    }
  }

  /**
   * Check if current value is an SLA breach
   */
  private isSLABreach(benchmark: PerformanceBenchmark, value: number): boolean {
    return !this.isWithinSLA(benchmark, value);
  }

  /**
   * Assess performance impact of changes
   */
  private async assessPerformanceImpact(): Promise<void> {
    // This would typically be triggered by deployment events
    // For now, we'll simulate impact assessment
    
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    if (!currentMetrics) return;
    
    // Simulate a performance impact assessment
    const assessment: PerformanceImpactAssessment = {
      changeId: `change_${Date.now()}`,
      timestamp: new Date(),
      changeType: 'optimization',
      beforeMetrics: {
        response_time: 800,
        throughput: 500,
        error_rate: 2.5,
        cpu_usage: 75
      },
      afterMetrics: {
        response_time: this.calculateAverageResponseTime(currentMetrics),
        throughput: this.calculateThroughput(currentMetrics),
        error_rate: this.calculateErrorRate(currentMetrics),
        cpu_usage: currentMetrics.systemLoad.cpu
      },
      impact: {
        overall: 'positive',
        magnitude: 'medium',
        confidence: 0.8
      },
      affectedMetrics: [],
      userExperienceImpact: {
        responseTime: -200, // 200ms improvement
        errorRate: -1, // 1% improvement
        availability: 0.5, // 0.5% improvement
        satisfaction: 'improved'
      }
    };
    
    // Calculate affected metrics
    for (const [metric, beforeValue] of Object.entries(assessment.beforeMetrics)) {
      const afterValue = assessment.afterMetrics[metric];
      const change = afterValue - beforeValue;
      const changePercent = beforeValue > 0 ? (change / beforeValue) * 100 : 0;
      
      assessment.affectedMetrics.push({
        metric,
        change,
        changePercent,
        significance: Math.abs(changePercent) > 10 ? 'high' : 
                     Math.abs(changePercent) > 5 ? 'medium' : 'low'
      });
    }
    
    this.impactAssessments.push(assessment);
    
    // Trim assessments history
    if (this.impactAssessments.length > 100) {
      this.impactAssessments = this.impactAssessments.slice(-100);
    }
    
    this.emit('performanceImpactAssessed', assessment);
  }

  /**
   * Detect performance anomalies
   */
  private async detectPerformanceAnomalies(): Promise<void> {
    const anomalies = [];
    
    // Check each trend analysis for anomalies
    for (const [key, analysis] of this.trendAnalyses.entries()) {
      if (analysis.anomalies.length > 0) {
        const recentAnomalies = analysis.anomalies.filter(
          a => Date.now() - a.timestamp.getTime() < 15 * 60 * 1000 // Last 15 minutes
        );
        
        if (recentAnomalies.length > 0) {
          anomalies.push({
            metric: analysis.metric,
            timeframe: analysis.timeframe,
            anomalies: recentAnomalies
          });
        }
      }
    }
    
    if (anomalies.length > 0) {
      this.emit('performanceAnomaliesDetected', anomalies);
    }
  }

  /**
   * Process system metrics
   */
  private processSystemMetrics(metrics: HealthMetrics): void {
    // Additional processing for performance analytics
    this.emit('systemMetricsProcessed', {
      timestamp: new Date(),
      responseTime: this.calculateAverageResponseTime(metrics),
      throughput: this.calculateThroughput(metrics),
      errorRate: this.calculateErrorRate(metrics)
    });
  }

  /**
   * Process health score
   */
  private processHealthScore(healthScore: SystemHealthScore): void {
    // Use health score for performance analysis
    this.emit('healthScoreProcessed', {
      timestamp: new Date(),
      score: healthScore.overall,
      trend: healthScore.trends.direction
    });
  }

  /**
   * Process performance bottlenecks
   */
  private processBottlenecks(bottlenecks: PerformanceBottleneck[]): void {
    // Generate recommendations based on bottlenecks
    bottlenecks.forEach(bottleneck => {
      this.emit('bottleneckAnalyzed', {
        bottleneck,
        recommendations: this.generateBottleneckRecommendations(bottleneck)
      });
    });
  }

  /**
   * Generate recommendations for specific bottleneck
   */
  private generateBottleneckRecommendations(bottleneck: PerformanceBottleneck): string[] {
    const recommendations = [];
    
    switch (bottleneck.type) {
      case 'cpu':
        recommendations.push('Scale up CPU resources', 'Optimize CPU-intensive operations');
        break;
      case 'memory':
        recommendations.push('Increase memory allocation', 'Optimize memory usage');
        break;
      case 'io':
        recommendations.push('Optimize I/O operations', 'Implement caching');
        break;
      case 'database':
        recommendations.push('Optimize database queries', 'Add database indexes');
        break;
      case 'network':
        recommendations.push('Optimize network usage', 'Implement compression');
        break;
    }
    
    return recommendations;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(metricName?: string, timeframe?: string): PerformanceMetric[] {
    if (metricName) {
      return this.performanceMetrics.get(metricName) || [];
    }
    
    // Return all metrics
    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.performanceMetrics.values()) {
      allMetrics.push(...metrics);
    }
    
    return allMetrics;
  }

  /**
   * Get performance benchmarks
   */
  getPerformanceBenchmarks(): PerformanceBenchmark[] {
    return Array.from(this.benchmarks.values());
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(priority?: PerformanceOptimizationRecommendation['priority']): PerformanceOptimizationRecommendation[] {
    let recommendations = this.optimizationRecommendations;
    
    if (priority) {
      recommendations = recommendations.filter(r => r.priority === priority);
    }
    
    return recommendations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get trend analyses
   */
  getTrendAnalyses(metric?: string, timeframe?: PerformanceTrendAnalysis['timeframe']): PerformanceTrendAnalysis[] {
    const analyses = Array.from(this.trendAnalyses.values());
    
    let filtered = analyses;
    if (metric) {
      filtered = filtered.filter(a => a.metric === metric);
    }
    if (timeframe) {
      filtered = filtered.filter(a => a.timeframe === timeframe);
    }
    
    return filtered;
  }

  /**
   * Get performance impact assessments
   */
  getPerformanceImpactAssessments(limit?: number): PerformanceImpactAssessment[] {
    const actualLimit = limit || this.impactAssessments.length;
    return this.impactAssessments.slice(-actualLimit);
  }

  /**
   * Stop performance analysis
   */
  stopAnalysis(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
    }
    
    if (this.benchmarkTimer) {
      clearInterval(this.benchmarkTimer);
      this.benchmarkTimer = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAnalysis();
    this.removeAllListeners();
  }
}

export const performanceAnalyticsService = new PerformanceAnalyticsService();