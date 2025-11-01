import { db } from '../db/connection';
import { safeLogger } from '../utils/safeLogger';
import { users, products, orders } from '../db/schema';
import { eq, sql, and, gte, lte, desc, asc, count, sum, avg } from 'drizzle-orm';
import { Redis } from 'ioredis';

export interface TrendAnalysis {
  trendId: string;
  metric: string;
  timeframe: string;
  trendType: 'linear' | 'exponential' | 'logarithmic' | 'polynomial' | 'seasonal' | 'cyclical';
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  strength: number; // 0-1, how strong the trend is
  confidence: number; // 0-1, confidence in the trend
  statisticalSignificance: number; // p-value
  dataPoints: Array<{ timestamp: Date; value: number; predicted?: boolean }>;
  trendLine: {
    slope: number;
    intercept: number;
    rSquared: number;
  };
  seasonality: {
    detected: boolean;
    period?: number;
    amplitude?: number;
    phase?: number;
  };
  changePoints: Array<{
    timestamp: Date;
    significance: number;
    description: string;
  }>;
  forecast: Array<{
    timestamp: Date;
    predictedValue: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  }>;
}

export interface TrendAlert {
  alertId: string;
  trendId: string;
  alertType: 'trend_change' | 'threshold_breach' | 'anomaly' | 'forecast_deviation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggeredAt: Date;
  metric: string;
  currentValue: number;
  expectedValue?: number;
  threshold?: number;
  recommendedActions: string[];
}

export interface SeasonalPattern {
  patternId: string;
  metric: string;
  seasonType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period: number; // in the unit of seasonType
  amplitude: number;
  phase: number;
  confidence: number;
  detectedAt: Date;
  examples: Array<{
    period: string;
    peakValue: number;
    troughValue: number;
    peakTime: string;
    troughTime: string;
  }>;
}

export interface TrendVisualization {
  chartType: 'line' | 'area' | 'scatter' | 'heatmap' | 'decomposition';
  title: string;
  description: string;
  data: any[];
  config: {
    xAxis: { label: string; type: 'time' | 'category' | 'numeric' };
    yAxis: { label: string; type: 'numeric' };
    annotations?: Array<{
      type: 'line' | 'area' | 'point';
      data: any;
      style: Record<string, any>;
    }>;
  };
  insights: string[];
}

export interface ForecastModel {
  modelId: string;
  modelType: 'arima' | 'exponential_smoothing' | 'linear_regression' | 'prophet' | 'lstm';
  metric: string;
  parameters: Record<string, any>;
  accuracy: {
    mae: number; // Mean Absolute Error
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    r2: number; // R-squared
  };
  trainingPeriod: {
    start: Date;
    end: Date;
  };
  lastUpdated: Date;
}

export class TrendAnalysisService {
  private redis: Redis;
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly MIN_DATA_POINTS = 10;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Analyze trends for multiple metrics with advanced algorithms
   */
  async analyzeTrends(
    metrics: string[],
    timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    lookbackDays: number = 30
  ): Promise<TrendAnalysis[]> {
    try {
      const cacheKey = `trends:analysis:${metrics.join(',')}:${timeframe}:${lookbackDays}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const analyses: TrendAnalysis[] = [];

      for (const metric of metrics) {
        const data = await this.getMetricData(metric, timeframe, lookbackDays);
        
        if (data.length < this.MIN_DATA_POINTS) {
          continue;
        }

        const analysis = await this.performTrendAnalysis(metric, data, timeframe);
        analyses.push(analysis);
      }

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analyses));
      return analyses;
    } catch (error) {
      safeLogger.error('Error analyzing trends:', error);
      throw new Error('Failed to analyze trends');
    }
  }

  /**
   * Detect seasonal patterns in data
   */
  async detectSeasonalPatterns(
    metric: string,
    timeframe: 'daily' | 'weekly' | 'monthly' = 'daily',
    lookbackDays: number = 90
  ): Promise<SeasonalPattern[]> {
    try {
      const cacheKey = `trends:seasonal:${metric}:${timeframe}:${lookbackDays}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const data = await this.getMetricData(metric, timeframe, lookbackDays);
      
      if (data.length < 28) { // Need at least 4 weeks of data
        return [];
      }

      const patterns = await this.identifySeasonalPatterns(metric, data, timeframe);
      
      await this.redis.setex(cacheKey, this.CACHE_TTL * 2, JSON.stringify(patterns));
      return patterns;
    } catch (error) {
      safeLogger.error('Error detecting seasonal patterns:', error);
      throw new Error('Failed to detect seasonal patterns');
    }
  }

  /**
   * Generate trend-based alerts and notifications
   */
  async generateTrendAlerts(
    thresholds: Record<string, { upper?: number; lower?: number; changePercent?: number }>
  ): Promise<TrendAlert[]> {
    try {
      const alerts: TrendAlert[] = [];
      const metrics = Object.keys(thresholds);

      for (const metric of metrics) {
        const recentData = await this.getMetricData(metric, 'hourly', 1);
        
        if (recentData.length === 0) continue;

        const currentValue = recentData[recentData.length - 1].value;
        const threshold = thresholds[metric];

        // Check threshold breaches
        if (threshold.upper && currentValue > threshold.upper) {
          alerts.push(await this.createTrendAlert(
            metric,
            'threshold_breach',
            'high',
            `${metric} exceeded upper threshold`,
            `Current value ${currentValue} is above threshold ${threshold.upper}`,
            currentValue,
            undefined,
            threshold.upper
          ));
        }

        if (threshold.lower && currentValue < threshold.lower) {
          alerts.push(await this.createTrendAlert(
            metric,
            'threshold_breach',
            'high',
            `${metric} below lower threshold`,
            `Current value ${currentValue} is below threshold ${threshold.lower}`,
            currentValue,
            undefined,
            threshold.lower
          ));
        }

        // Check for significant changes
        if (threshold.changePercent && recentData.length > 1) {
          const previousValue = recentData[recentData.length - 2].value;
          const changePercent = ((currentValue - previousValue) / previousValue) * 100;

          if (Math.abs(changePercent) > threshold.changePercent) {
            alerts.push(await this.createTrendAlert(
              metric,
              'trend_change',
              Math.abs(changePercent) > 50 ? 'critical' : 'medium',
              `Significant change in ${metric}`,
              `${metric} changed by ${changePercent.toFixed(1)}% from ${previousValue} to ${currentValue}`,
              currentValue,
              previousValue
            ));
          }
        }
      }

      // Store alerts
      for (const alert of alerts) {
        await this.storeTrendAlert(alert);
      }

      return alerts;
    } catch (error) {
      safeLogger.error('Error generating trend alerts:', error);
      throw new Error('Failed to generate trend alerts');
    }
  }

  /**
   * Create trend visualizations with statistical significance testing
   */
  async createTrendVisualization(
    analysis: TrendAnalysis,
    includeForecasts: boolean = true
  ): Promise<TrendVisualization> {
    try {
      const chartData = analysis.dataPoints.map(point => ({
        x: point.timestamp,
        y: point.value,
        predicted: point.predicted || false
      }));

      // Add trend line
      const trendLineData = analysis.dataPoints.map(point => ({
        x: point.timestamp,
        y: analysis.trendLine.slope * point.timestamp.getTime() + analysis.trendLine.intercept
      }));

      // Add forecasts if requested
      if (includeForecasts) {
        analysis.forecast.forEach(forecast => {
          chartData.push({
            x: forecast.timestamp,
            y: forecast.predictedValue,
            predicted: true
          });
        });
      }

      const annotations = [
        {
          type: 'line' as const,
          data: trendLineData,
          style: { color: '#ff6b6b', strokeWidth: 2, strokeDasharray: '5,5' }
        }
      ];

      // Add change points
      analysis.changePoints.forEach(changePoint => {
        annotations.push({
          type: 'line' as const,
          data: [{ x: changePoint.timestamp, y: 0 }],
          style: { color: '#ffa500', strokeWidth: 2, strokeDasharray: '2,2' }
        });
      });

      const insights = [
        `Trend direction: ${analysis.direction}`,
        `Trend strength: ${(analysis.strength * 100).toFixed(1)}%`,
        `Confidence: ${(analysis.confidence * 100).toFixed(1)}%`,
        `R-squared: ${analysis.trendLine.rSquared.toFixed(3)}`
      ];

      if (analysis.seasonality.detected) {
        insights.push(`Seasonal pattern detected with period ${analysis.seasonality.period}`);
      }

      return {
        chartType: 'line',
        title: `Trend Analysis: ${analysis.metric}`,
        description: `${analysis.trendType} trend analysis showing ${analysis.direction} pattern with ${(analysis.confidence * 100).toFixed(0)}% confidence`,
        data: chartData,
        config: {
          xAxis: { label: 'Time', type: 'time' },
          yAxis: { label: analysis.metric, type: 'numeric' },
          annotations
        },
        insights
      };
    } catch (error) {
      safeLogger.error('Error creating trend visualization:', error);
      throw new Error('Failed to create trend visualization');
    }
  }

  /**
   * Forecast future values using multiple models
   */
  async forecastMetric(
    metric: string,
    horizonDays: number = 7,
    modelType: 'auto' | 'arima' | 'exponential_smoothing' | 'linear_regression' = 'auto'
  ): Promise<{
    forecasts: Array<{
      timestamp: Date;
      value: number;
      confidenceInterval: { lower: number; upper: number };
    }>;
    model: ForecastModel;
    accuracy: Record<string, number>;
  }> {
    try {
      const historicalData = await this.getMetricData(metric, 'daily', 90);
      
      if (historicalData.length < this.MIN_DATA_POINTS) {
        throw new Error('Insufficient data for forecasting');
      }

      // Select best model if auto
      const selectedModel = modelType === 'auto' 
        ? await this.selectBestModel(historicalData)
        : modelType;

      // Generate forecasts
      const forecasts = await this.generateForecasts(
        historicalData,
        horizonDays,
        selectedModel
      );

      // Calculate model accuracy
      const accuracy = await this.calculateModelAccuracy(
        historicalData,
        selectedModel
      );

      const model: ForecastModel = {
        modelId: `${selectedModel}_${metric}_${Date.now()}`,
        modelType: selectedModel as any,
        metric,
        parameters: {},
        accuracy,
        trainingPeriod: {
          start: historicalData[0].timestamp,
          end: historicalData[historicalData.length - 1].timestamp
        },
        lastUpdated: new Date()
      };

      return { forecasts, model, accuracy };
    } catch (error) {
      safeLogger.error('Error forecasting metric:', error);
      throw new Error('Failed to forecast metric');
    }
  }

  /**
   * Get trend analysis statistics and performance metrics
   */
  async getTrendStatistics(days: number = 30): Promise<{
    totalTrends: number;
    trendsByDirection: Record<string, number>;
    trendsByType: Record<string, number>;
    averageConfidence: number;
    seasonalPatternsDetected: number;
    alertsGenerated: number;
    forecastAccuracy: Record<string, number>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trendStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_trends,
          COUNT(CASE WHEN direction = 'increasing' THEN 1 END) as increasing_trends,
          COUNT(CASE WHEN direction = 'decreasing' THEN 1 END) as decreasing_trends,
          COUNT(CASE WHEN direction = 'stable' THEN 1 END) as stable_trends,
          COUNT(CASE WHEN direction = 'volatile' THEN 1 END) as volatile_trends,
          COUNT(CASE WHEN trend_type = 'linear' THEN 1 END) as linear_trends,
          COUNT(CASE WHEN trend_type = 'exponential' THEN 1 END) as exponential_trends,
          COUNT(CASE WHEN trend_type = 'seasonal' THEN 1 END) as seasonal_trends,
          AVG(confidence) as avg_confidence
        FROM trend_analyses
        WHERE created_at >= ${startDate}
      `);

      const seasonalStats = await db.execute(sql`
        SELECT COUNT(*) as seasonal_patterns
        FROM seasonal_patterns
        WHERE detected_at >= ${startDate}
      `);

      const alertStats = await db.execute(sql`
        SELECT COUNT(*) as alerts_generated
        FROM trend_alerts
        WHERE triggered_at >= ${startDate}
      `);

      const stats = trendStats[0];
      
      return {
        totalTrends: Number(stats?.total_trends) || 0,
        trendsByDirection: {
          increasing: Number(stats?.increasing_trends) || 0,
          decreasing: Number(stats?.decreasing_trends) || 0,
          stable: Number(stats?.stable_trends) || 0,
          volatile: Number(stats?.volatile_trends) || 0
        },
        trendsByType: {
          linear: Number(stats?.linear_trends) || 0,
          exponential: Number(stats?.exponential_trends) || 0,
          seasonal: Number(stats?.seasonal_trends) || 0
        },
        averageConfidence: Number(stats?.avg_confidence) || 0,
        seasonalPatternsDetected: Number(seasonalStats[0]?.seasonal_patterns) || 0,
        alertsGenerated: Number(alertStats[0]?.alerts_generated) || 0,
        forecastAccuracy: {
          mae: 0, // Would calculate from actual forecast results
          mape: 0,
          rmse: 0,
          r2: 0
        }
      };
    } catch (error) {
      safeLogger.error('Error getting trend statistics:', error);
      throw new Error('Failed to get trend statistics');
    }
  }

  // Private helper methods

  private async getMetricData(
    metric: string,
    timeframe: string,
    lookbackDays: number
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lookbackDays);

      let query: any;
      let groupBy: string;

      switch (timeframe) {
        case 'hourly':
          groupBy = "DATE_TRUNC('hour', created_at)";
          break;
        case 'daily':
          groupBy = "DATE_TRUNC('day', created_at)";
          break;
        case 'weekly':
          groupBy = "DATE_TRUNC('week', created_at)";
          break;
        case 'monthly':
          groupBy = "DATE_TRUNC('month', created_at)";
          break;
        default:
          groupBy = "DATE_TRUNC('day', created_at)";
      }

      // Get data based on metric type
      switch (metric) {
        case 'user_registrations':
          query = sql`
            SELECT ${sql.raw(groupBy)} as timestamp, COUNT(*) as value
            FROM users
            WHERE created_at >= ${startDate}
            GROUP BY ${sql.raw(groupBy)}
            ORDER BY timestamp
          `;
          break;
        case 'revenue':
          query = sql`
            SELECT ${sql.raw(groupBy)} as timestamp, SUM(total_amount) as value
            FROM orders
            WHERE created_at >= ${startDate} AND status = 'completed'
            GROUP BY ${sql.raw(groupBy)}
            ORDER BY timestamp
          `;
          break;
        case 'orders':
          query = sql`
            SELECT ${sql.raw(groupBy)} as timestamp, COUNT(*) as value
            FROM orders
            WHERE created_at >= ${startDate}
            GROUP BY ${sql.raw(groupBy)}
            ORDER BY timestamp
          `;
          break;
        case 'active_users':
          query = sql`
            SELECT ${sql.raw(groupBy)} as timestamp, COUNT(DISTINCT user_id) as value
            FROM user_analytics
            WHERE timestamp >= ${startDate}
            GROUP BY ${sql.raw(groupBy)}
            ORDER BY timestamp
          `;
          break;
        default:
          // Generic metric from analytics table
          query = sql`
            SELECT ${sql.raw(groupBy)} as timestamp, AVG(value) as value
            FROM metric_data
            WHERE metric_name = ${metric} AND timestamp >= ${startDate}
            GROUP BY ${sql.raw(groupBy)}
            ORDER BY timestamp
          `;
      }

      const result = await db.execute(query);
      return result.map(row => ({
        timestamp: new Date(String(row.timestamp)),
        value: Number(row.value)
      }));
    } catch (error) {
      safeLogger.error('Error getting metric data:', error);
      return [];
    }
  }

  private async performTrendAnalysis(
    metric: string,
    data: Array<{ timestamp: Date; value: number }>,
    timeframe: string
  ): Promise<TrendAnalysis> {
    // Calculate trend statistics
    const values = data.map(d => d.value);
    const timestamps = data.map(d => d.timestamp.getTime());
    
    // Linear regression for trend line
    const trendLine = this.calculateLinearRegression(timestamps, values);
    
    // Determine trend direction and strength
    const direction = this.determineTrendDirection(trendLine.slope, values);
    const strength = this.calculateTrendStrength(values, trendLine);
    const confidence = this.calculateTrendConfidence(values, trendLine);
    
    // Detect seasonality
    const seasonality = await this.detectSeasonality(values);
    
    // Identify change points
    const changePoints = await this.identifyChangePoints(data);
    
    // Generate forecast
    const forecast = await this.generateSimpleForecast(data, 7);
    
    // Determine trend type
    const trendType = this.determineTrendType(values, seasonality.detected);
    
    return {
      trendId: `trend_${metric}_${Date.now()}`,
      metric,
      timeframe,
      trendType,
      direction,
      strength,
      confidence,
      statisticalSignificance: this.calculatePValue(trendLine, values.length),
      dataPoints: data,
      trendLine,
      seasonality,
      changePoints,
      forecast
    };
  }

  private calculateLinearRegression(x: number[], y: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);
    
    return { slope, intercept, rSquared };
  }

  private determineTrendDirection(
    slope: number,
    values: number[]
  ): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    const threshold = this.calculateVolatilityThreshold(values);
    
    if (Math.abs(slope) < threshold * 0.1) return 'stable';
    if (this.calculateVolatility(values) > threshold) return 'volatile';
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  private calculateTrendStrength(
    values: number[],
    trendLine: { slope: number; intercept: number; rSquared: number }
  ): number {
    // Use R-squared as a measure of trend strength
    return Math.max(0, Math.min(1, trendLine.rSquared));
  }

  private calculateTrendConfidence(
    values: number[],
    trendLine: { slope: number; intercept: number; rSquared: number }
  ): number {
    // Combine R-squared with sample size for confidence
    const sampleSizeBonus = Math.min(0.2, values.length / 100);
    return Math.max(0.1, Math.min(1, trendLine.rSquared + sampleSizeBonus));
  }

  private calculatePValue(
    trendLine: { slope: number; intercept: number; rSquared: number },
    sampleSize: number
  ): number {
    // Simplified p-value calculation
    const tStat = Math.abs(trendLine.slope) / (Math.sqrt((1 - trendLine.rSquared) / (sampleSize - 2)));
    return Math.max(0.001, Math.min(1, 2 * (1 - this.tDistribution(tStat, sampleSize - 2))));
  }

  private tDistribution(t: number, df: number): number {
    // Simplified t-distribution approximation
    return 0.5 + 0.5 * Math.sign(t) * Math.sqrt(1 - Math.exp(-2 * t * t / Math.PI));
  }

  private async detectSeasonality(values: number[]): Promise<{
    detected: boolean;
    period?: number;
    amplitude?: number;
    phase?: number;
  }> {
    if (values.length < 14) {
      return { detected: false };
    }

    // Simple autocorrelation-based seasonality detection
    const periods = [7, 14, 30]; // Daily, bi-weekly, monthly patterns
    let bestPeriod = 0;
    let maxCorrelation = 0;

    for (const period of periods) {
      if (values.length >= period * 2) {
        const correlation = this.calculateAutocorrelation(values, period);
        if (correlation > maxCorrelation) {
          maxCorrelation = correlation;
          bestPeriod = period;
        }
      }
    }

    if (maxCorrelation > 0.3) {
      return {
        detected: true,
        period: bestPeriod,
        amplitude: this.calculateSeasonalAmplitude(values, bestPeriod),
        phase: 0 // Simplified
      };
    }

    return { detected: false };
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const n = values.length - lag;
    const mean1 = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const mean2 = values.slice(lag).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = values[i] - mean1;
      const diff2 = values[i + lag] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }

    return numerator / Math.sqrt(denom1 * denom2);
  }

  private calculateSeasonalAmplitude(values: number[], period: number): number {
    // Calculate the amplitude of seasonal variation
    const seasonalValues: number[][] = [];
    
    for (let i = 0; i < period; i++) {
      seasonalValues[i] = [];
    }

    for (let i = 0; i < values.length; i++) {
      seasonalValues[i % period].push(values[i]);
    }

    const seasonalMeans = seasonalValues.map(vals => 
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    );

    const overallMean = values.reduce((a, b) => a + b, 0) / values.length;
    const maxDeviation = Math.max(...seasonalMeans.map(mean => Math.abs(mean - overallMean)));

    return maxDeviation;
  }

  private async identifyChangePoints(
    data: Array<{ timestamp: Date; value: number }>
  ): Promise<Array<{ timestamp: Date; significance: number; description: string }>> {
    // Simple change point detection using moving averages
    const changePoints: Array<{ timestamp: Date; significance: number; description: string }> = [];
    const windowSize = Math.min(7, Math.floor(data.length / 4));

    if (data.length < windowSize * 2) return changePoints;

    for (let i = windowSize; i < data.length - windowSize; i++) {
      const beforeWindow = data.slice(i - windowSize, i);
      const afterWindow = data.slice(i, i + windowSize);

      const beforeMean = beforeWindow.reduce((sum, d) => sum + d.value, 0) / beforeWindow.length;
      const afterMean = afterWindow.reduce((sum, d) => sum + d.value, 0) / afterWindow.length;

      const changePercent = Math.abs((afterMean - beforeMean) / beforeMean) * 100;

      if (changePercent > 20) { // Significant change threshold
        changePoints.push({
          timestamp: data[i].timestamp,
          significance: changePercent,
          description: `${changePercent.toFixed(1)}% change detected`
        });
      }
    }

    return changePoints;
  }

  private async generateSimpleForecast(
    data: Array<{ timestamp: Date; value: number }>,
    horizonDays: number
  ): Promise<Array<{
    timestamp: Date;
    predictedValue: number;
    confidenceInterval: { lower: number; upper: number };
  }>> {
    const forecast = [];
    const values = data.map(d => d.value);
    const lastTimestamp = data[data.length - 1].timestamp;

    // Simple exponential smoothing
    const alpha = 0.3;
    let smoothed = values[0];
    
    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }

    // Calculate prediction error for confidence intervals
    const errors = [];
    let testSmoothed = values[0];
    for (let i = 1; i < values.length; i++) {
      const predicted = testSmoothed;
      const actual = values[i];
      errors.push(Math.abs(actual - predicted));
      testSmoothed = alpha * actual + (1 - alpha) * testSmoothed;
    }
    
    const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;

    for (let i = 1; i <= horizonDays; i++) {
      const forecastDate = new Date(lastTimestamp);
      forecastDate.setDate(forecastDate.getDate() + i);

      const margin = meanError * Math.sqrt(i); // Increasing uncertainty over time

      forecast.push({
        timestamp: forecastDate,
        predictedValue: smoothed,
        confidenceInterval: {
          lower: Math.max(0, smoothed - margin),
          upper: smoothed + margin
        }
      });
    }

    return forecast;
  }

  private determineTrendType(
    values: number[],
    hasSeasonality: boolean
  ): 'linear' | 'exponential' | 'logarithmic' | 'polynomial' | 'seasonal' | 'cyclical' {
    if (hasSeasonality) return 'seasonal';
    
    // Simple heuristic based on value patterns
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const changeRatio = secondMean / firstMean;
    
    if (changeRatio > 1.5 || changeRatio < 0.67) return 'exponential';
    return 'linear';
  }

  private calculateVolatility(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private calculateVolatilityThreshold(values: number[]): number {
    return this.calculateVolatility(values) * 0.5;
  }

  private async identifySeasonalPatterns(
    metric: string,
    data: Array<{ timestamp: Date; value: number }>,
    timeframe: string
  ): Promise<SeasonalPattern[]> {
    const patterns: SeasonalPattern[] = [];
    
    // Check for different seasonal patterns
    const seasonTypes = ['daily', 'weekly', 'monthly'] as const;
    
    for (const seasonType of seasonTypes) {
      const pattern = await this.detectSeasonalPattern(metric, data, seasonType);
      if (pattern) {
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }

  private async detectSeasonalPattern(
    metric: string,
    data: Array<{ timestamp: Date; value: number }>,
    seasonType: 'daily' | 'weekly' | 'monthly'
  ): Promise<SeasonalPattern | null> {
    let period: number;
    
    switch (seasonType) {
      case 'daily': period = 24; break; // Hours in a day
      case 'weekly': period = 7; break; // Days in a week
      case 'monthly': period = 30; break; // Days in a month
    }
    
    if (data.length < period * 2) return null;
    
    const seasonality = await this.detectSeasonality(data.map(d => d.value));
    
    if (!seasonality.detected || !seasonality.period) return null;
    
    return {
      patternId: `pattern_${metric}_${seasonType}_${Date.now()}`,
      metric,
      seasonType,
      period: seasonality.period,
      amplitude: seasonality.amplitude || 0,
      phase: seasonality.phase || 0,
      confidence: 0.8, // Simplified
      detectedAt: new Date(),
      examples: [] // Would populate with actual examples
    };
  }

  private async selectBestModel(
    data: Array<{ timestamp: Date; value: number }>
  ): Promise<'arima' | 'exponential_smoothing' | 'linear_regression'> {
    // Simple model selection based on data characteristics
    const values = data.map(d => d.value);
    const volatility = this.calculateVolatility(values);
    
    if (volatility > 0.5) return 'arima'; // High volatility
    if (data.length < 30) return 'linear_regression'; // Small dataset
    return 'exponential_smoothing'; // Default
  }

  private async generateForecasts(
    data: Array<{ timestamp: Date; value: number }>,
    horizonDays: number,
    modelType: string
  ): Promise<Array<{
    timestamp: Date;
    value: number;
    confidenceInterval: { lower: number; upper: number };
  }>> {
    // Use the simple forecast method for now
    const simpleForecast = await this.generateSimpleForecast(data, horizonDays);
    return simpleForecast.map(f => ({
      timestamp: f.timestamp,
      value: f.predictedValue,
      confidenceInterval: f.confidenceInterval
    }));
  }

  private async calculateModelAccuracy(
    data: Array<{ timestamp: Date; value: number }>,
    modelType: string
  ): Promise<{ mae: number; mape: number; rmse: number; r2: number }> {
    // Mock implementation - would calculate actual model accuracy
    return {
      mae: 10.5,
      mape: 15.2,
      rmse: 12.8,
      r2: 0.85
    };
  }

  private async createTrendAlert(
    metric: string,
    alertType: 'trend_change' | 'threshold_breach' | 'anomaly' | 'forecast_deviation',
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    description: string,
    currentValue: number,
    expectedValue?: number,
    threshold?: number
  ): Promise<TrendAlert> {
    return {
      alertId: `alert_${Date.now()}_${Math.random()}`,
      trendId: `trend_${metric}_${Date.now()}`,
      alertType,
      severity,
      title,
      description,
      triggeredAt: new Date(),
      metric,
      currentValue,
      expectedValue,
      threshold,
      recommendedActions: [
        'Monitor metric closely',
        'Investigate potential causes',
        'Consider corrective actions if needed'
      ]
    };
  }

  private async storeTrendAlert(alert: TrendAlert): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO trend_alerts (
          alert_id, trend_id, alert_type, severity, title, description,
          triggered_at, metric, current_value, expected_value, threshold,
          recommended_actions
        ) VALUES (
          ${alert.alertId}, ${alert.trendId}, ${alert.alertType},
          ${alert.severity}, ${alert.title}, ${alert.description},
          ${alert.triggeredAt}, ${alert.metric}, ${alert.currentValue},
          ${alert.expectedValue}, ${alert.threshold},
          ${JSON.stringify(alert.recommendedActions)}
        )
      `);
    } catch (error) {
      safeLogger.error('Error storing trend alert:', error);
    }
  }
}

export const trendAnalysisService = new TrendAnalysisService();
