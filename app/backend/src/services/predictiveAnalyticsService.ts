import { db } from '../db/connection';
import { users, products, orders } from '../db/schema';
import { eq, sql, and, gte, lte, desc, asc, count, sum, avg } from 'drizzle-orm';
import { Redis } from 'ioredis';

export interface PredictionResult {
  predictionId: string;
  modelVersion: string;
  targetMetric: string;
  predictedValue: number;
  confidence: number;
  predictionHorizon: number; // days into the future
  factors: PredictionFactor[];
  timestamp: Date;
  upperBound?: number;
  lowerBound?: number;
}

export interface PredictionFactor {
  name: string;
  importance: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface UserGrowthPrediction {
  period: string;
  predictedUsers: number;
  confidence: number;
  growthRate: number;
  seasonalAdjustment: number;
  factors: PredictionFactor[];
}

export interface ContentVolumePrediction {
  period: string;
  predictedPosts: number;
  predictedComments: number;
  predictedEngagement: number;
  confidence: number;
  trendingTopics: string[];
}

export interface SystemLoadPrediction {
  period: string;
  predictedCpuUsage: number;
  predictedMemoryUsage: number;
  predictedDiskUsage: number;
  predictedNetworkTraffic: number;
  confidence: number;
  recommendedActions: string[];
}

export interface BusinessMetricPrediction {
  metric: string;
  period: string;
  predictedValue: number;
  confidence: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: number;
}

export class PredictiveAnalyticsService {
  private redis: Redis;
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MODEL_VERSION = '1.0.0';

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Generate comprehensive predictive forecasts for user growth
   */
  async predictUserGrowth(horizonDays: number = 30): Promise<UserGrowthPrediction[]> {
    try {
      const cacheKey = `predictions:user_growth:${horizonDays}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get historical user data for the last 90 days
      const historicalData = await this.getHistoricalUserData(90);
      
      // Apply time series forecasting using exponential smoothing
      const predictions = await this.forecastTimeSeries(
        historicalData,
        horizonDays,
        'user_growth'
      );

      // Calculate seasonal adjustments
      const seasonalFactors = await this.calculateSeasonalFactors(historicalData);
      
      const results: UserGrowthPrediction[] = [];
      
      for (let i = 1; i <= horizonDays; i++) {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + i);
        
        const basePrediction = predictions[i - 1] || predictions[predictions.length - 1];
        const seasonalAdjustment = seasonalFactors[baseDate.getDay()] || 1.0;
        
        const predictedUsers = Math.round(basePrediction.value * seasonalAdjustment);
        const growthRate = this.calculateGrowthRate(historicalData, i);
        
        results.push({
          period: baseDate.toISOString().split('T')[0],
          predictedUsers,
          confidence: basePrediction.confidence,
          growthRate,
          seasonalAdjustment,
          factors: await this.identifyGrowthFactors(historicalData, i)
        });
      }

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(results));
      return results;
    } catch (error) {
      console.error('Error predicting user growth:', error);
      throw new Error('Failed to generate user growth predictions');
    }
  }

  /**
   * Predict content volume and engagement patterns
   */
  async predictContentVolume(horizonDays: number = 30): Promise<ContentVolumePrediction[]> {
    try {
      const cacheKey = `predictions:content_volume:${horizonDays}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get historical content data
      const [postData, commentData, engagementData] = await Promise.all([
        this.getHistoricalPostData(90),
        this.getHistoricalCommentData(90),
        this.getHistoricalEngagementData(90)
      ]);

      const results: ContentVolumePrediction[] = [];
      
      for (let i = 1; i <= horizonDays; i++) {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + i);
        
        // Apply ARIMA-like forecasting for each metric
        const postPrediction = await this.forecastMetric(postData, i);
        const commentPrediction = await this.forecastMetric(commentData, i);
        const engagementPrediction = await this.forecastMetric(engagementData, i);
        
        // Identify trending topics based on recent patterns
        const trendingTopics = await this.predictTrendingTopics(baseDate);
        
        results.push({
          period: baseDate.toISOString().split('T')[0],
          predictedPosts: Math.round(postPrediction.value),
          predictedComments: Math.round(commentPrediction.value),
          predictedEngagement: Math.round(engagementPrediction.value),
          confidence: Math.min(postPrediction.confidence, commentPrediction.confidence, engagementPrediction.confidence),
          trendingTopics
        });
      }

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(results));
      return results;
    } catch (error) {
      console.error('Error predicting content volume:', error);
      throw new Error('Failed to generate content volume predictions');
    }
  }

  /**
   * Predict system load and capacity requirements
   */
  async predictSystemLoad(horizonDays: number = 7): Promise<SystemLoadPrediction[]> {
    try {
      const cacheKey = `predictions:system_load:${horizonDays}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get historical system metrics
      const systemMetrics = await this.getHistoricalSystemMetrics(30);
      
      const results: SystemLoadPrediction[] = [];
      
      for (let i = 1; i <= horizonDays; i++) {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + i);
        
        // Predict each system metric
        const cpuPrediction = await this.forecastSystemMetric(systemMetrics.cpu, i);
        const memoryPrediction = await this.forecastSystemMetric(systemMetrics.memory, i);
        const diskPrediction = await this.forecastSystemMetric(systemMetrics.disk, i);
        const networkPrediction = await this.forecastSystemMetric(systemMetrics.network, i);
        
        // Generate recommendations based on predictions
        const recommendations = this.generateCapacityRecommendations({
          cpu: cpuPrediction.value,
          memory: memoryPrediction.value,
          disk: diskPrediction.value,
          network: networkPrediction.value
        });
        
        results.push({
          period: baseDate.toISOString().split('T')[0],
          predictedCpuUsage: cpuPrediction.value,
          predictedMemoryUsage: memoryPrediction.value,
          predictedDiskUsage: diskPrediction.value,
          predictedNetworkTraffic: networkPrediction.value,
          confidence: Math.min(
            cpuPrediction.confidence,
            memoryPrediction.confidence,
            diskPrediction.confidence,
            networkPrediction.confidence
          ),
          recommendedActions: recommendations
        });
      }

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(results));
      return results;
    } catch (error) {
      console.error('Error predicting system load:', error);
      throw new Error('Failed to generate system load predictions');
    }
  }

  /**
   * Predict business metrics with confidence intervals
   */
  async predictBusinessMetrics(
    metrics: string[],
    horizonDays: number = 30
  ): Promise<BusinessMetricPrediction[]> {
    try {
      const cacheKey = `predictions:business_metrics:${metrics.join(',')}:${horizonDays}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const results: BusinessMetricPrediction[] = [];
      
      for (const metric of metrics) {
        // Get historical data for the metric
        const historicalData = await this.getHistoricalBusinessMetric(metric, 90);
        
        if (historicalData.length === 0) {
          continue;
        }

        // Apply advanced forecasting with confidence intervals
        const predictions = await this.forecastWithConfidenceInterval(
          historicalData,
          horizonDays
        );

        for (let i = 0; i < predictions.length; i++) {
          const baseDate = new Date();
          baseDate.setDate(baseDate.getDate() + i + 1);
          
          const prediction = predictions[i];
          const trend = this.determineTrend(historicalData, prediction.value);
          const seasonality = this.calculateSeasonality(historicalData, i + 1);
          
          results.push({
            metric,
            period: baseDate.toISOString().split('T')[0],
            predictedValue: prediction.value,
            confidence: prediction.confidence,
            confidenceInterval: {
              lower: prediction.lowerBound,
              upper: prediction.upperBound
            },
            trend,
            seasonality
          });
        }
      }

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(results));
      return results;
    } catch (error) {
      console.error('Error predicting business metrics:', error);
      throw new Error('Failed to generate business metric predictions');
    }
  }

  /**
   * Store prediction results for tracking accuracy
   */
  async storePrediction(prediction: PredictionResult): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO prediction_results (
          prediction_id, model_version, target_metric, predicted_value,
          confidence, prediction_horizon, factors, timestamp,
          upper_bound, lower_bound
        ) VALUES (
          ${prediction.predictionId}, ${prediction.modelVersion},
          ${prediction.targetMetric}, ${prediction.predictedValue},
          ${prediction.confidence}, ${prediction.predictionHorizon},
          ${JSON.stringify(prediction.factors)}, ${prediction.timestamp},
          ${prediction.upperBound}, ${prediction.lowerBound}
        )
      `);
    } catch (error) {
      console.error('Error storing prediction:', error);
    }
  }

  /**
   * Evaluate prediction accuracy against actual results
   */
  async evaluatePredictionAccuracy(
    predictionId: string,
    actualValue: number
  ): Promise<{ accuracy: number; error: number }> {
    try {
      const result = await db.execute(sql`
        SELECT predicted_value, confidence, upper_bound, lower_bound
        FROM prediction_results
        WHERE prediction_id = ${predictionId}
      `);

      if (result.length === 0) {
        throw new Error('Prediction not found');
      }

      const prediction = result[0];
      const predictedValue = Number(prediction.predicted_value);
      const upperBound = Number(prediction.upper_bound);
      const lowerBound = Number(prediction.lower_bound);

      // Calculate accuracy metrics
      const error = Math.abs(actualValue - predictedValue);
      const relativeError = error / Math.abs(actualValue);
      const accuracy = Math.max(0, 1 - relativeError);

      // Check if actual value falls within confidence interval
      const withinInterval = actualValue >= lowerBound && actualValue <= upperBound;

      // Update prediction with actual results
      await db.execute(sql`
        UPDATE prediction_results
        SET actual_value = ${actualValue},
            accuracy = ${accuracy},
            error = ${error},
            within_confidence_interval = ${withinInterval},
            evaluated_at = NOW()
        WHERE prediction_id = ${predictionId}
      `);

      return { accuracy, error };
    } catch (error) {
      console.error('Error evaluating prediction accuracy:', error);
      throw new Error('Failed to evaluate prediction accuracy');
    }
  }

  // Private helper methods

  private async getHistoricalUserData(days: number): Promise<Array<{ date: Date; value: number }>> {
    try {
      const result = await db.execute(sql`
        SELECT DATE(created_at) as date, COUNT(*) as value
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `);

      return result.map(row => ({
        date: new Date(String(row.date)),
        value: Number(row.value)
      }));
    } catch (error) {
      return [];
    }
  }

  private async getHistoricalPostData(days: number): Promise<Array<{ date: Date; value: number }>> {
    try {
      const result = await db.execute(sql`
        SELECT DATE(created_at) as date, COUNT(*) as value
        FROM posts
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `);

      return result.map(row => ({
        date: new Date(String(row.date)),
        value: Number(row.value)
      }));
    } catch (error) {
      return [];
    }
  }

  private async getHistoricalCommentData(days: number): Promise<Array<{ date: Date; value: number }>> {
    try {
      const result = await db.execute(sql`
        SELECT DATE(created_at) as date, COUNT(*) as value
        FROM comments
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `);

      return result.map(row => ({
        date: new Date(String(row.date)),
        value: Number(row.value)
      }));
    } catch (error) {
      return [];
    }
  }

  private async getHistoricalEngagementData(days: number): Promise<Array<{ date: Date; value: number }>> {
    try {
      const result = await db.execute(sql`
        SELECT DATE(created_at) as date, COUNT(*) as value
        FROM user_analytics
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND event_type IN ('like', 'comment', 'share', 'view')
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `);

      return result.map(row => ({
        date: new Date(String(row.date)),
        value: Number(row.value)
      }));
    } catch (error) {
      return [];
    }
  }

  private async getHistoricalSystemMetrics(days: number): Promise<{
    cpu: Array<{ date: Date; value: number }>;
    memory: Array<{ date: Date; value: number }>;
    disk: Array<{ date: Date; value: number }>;
    network: Array<{ date: Date; value: number }>;
  }> {
    // Mock implementation - would integrate with actual system monitoring
    const mockData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      return {
        date,
        value: Math.random() * 100
      };
    });

    return {
      cpu: mockData,
      memory: mockData,
      disk: mockData,
      network: mockData
    };
  }

  private async getHistoricalBusinessMetric(
    metric: string,
    days: number
  ): Promise<Array<{ date: Date; value: number }>> {
    try {
      let query: any;
      
      switch (metric) {
        case 'revenue':
          query = sql`
            SELECT DATE(created_at) as date, SUM(total_amount) as value
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            AND status = 'completed'
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
          `;
          break;
        case 'orders':
          query = sql`
            SELECT DATE(created_at) as date, COUNT(*) as value
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
          `;
          break;
        case 'active_users':
          query = sql`
            SELECT DATE(timestamp) as date, COUNT(DISTINCT user_id) as value
            FROM user_analytics
            WHERE timestamp >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp)
          `;
          break;
        default:
          return [];
      }

      const result = await db.execute(query);
      return result.map(row => ({
        date: new Date(String(row.date)),
        value: Number(row.value)
      }));
    } catch (error) {
      return [];
    }
  }

  private async forecastTimeSeries(
    data: Array<{ date: Date; value: number }>,
    horizon: number,
    type: string
  ): Promise<Array<{ value: number; confidence: number }>> {
    if (data.length < 7) {
      // Not enough data for reliable forecasting
      return Array(horizon).fill({ value: 0, confidence: 0.1 });
    }

    // Simple exponential smoothing implementation
    const alpha = 0.3; // Smoothing parameter
    const values = data.map(d => d.value);
    
    // Calculate initial smoothed value
    let smoothed = values[0];
    const smoothedValues = [smoothed];
    
    // Apply exponential smoothing
    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
      smoothedValues.push(smoothed);
    }

    // Calculate trend
    const trend = this.calculateLinearTrend(smoothedValues);
    
    // Generate forecasts
    const forecasts = [];
    let lastSmoothed = smoothedValues[smoothedValues.length - 1];
    
    for (let i = 1; i <= horizon; i++) {
      const forecast = lastSmoothed + (trend * i);
      const confidence = Math.max(0.1, 0.9 - (i * 0.02)); // Decreasing confidence over time
      
      forecasts.push({
        value: Math.max(0, forecast),
        confidence
      });
    }

    return forecasts;
  }

  private async forecastMetric(
    data: Array<{ date: Date; value: number }>,
    horizon: number
  ): Promise<{ value: number; confidence: number }> {
    const forecasts = await this.forecastTimeSeries(data, horizon, 'metric');
    return forecasts[horizon - 1] || { value: 0, confidence: 0.1 };
  }

  private async forecastSystemMetric(
    data: Array<{ date: Date; value: number }>,
    horizon: number
  ): Promise<{ value: number; confidence: number }> {
    // Apply more conservative forecasting for system metrics
    const forecasts = await this.forecastTimeSeries(data, horizon, 'system');
    const forecast = forecasts[horizon - 1] || { value: 0, confidence: 0.1 };
    
    // Cap system metrics at reasonable bounds
    return {
      value: Math.min(100, Math.max(0, forecast.value)),
      confidence: forecast.confidence
    };
  }

  private async forecastWithConfidenceInterval(
    data: Array<{ date: Date; value: number }>,
    horizon: number
  ): Promise<Array<{ value: number; confidence: number; lowerBound: number; upperBound: number }>> {
    const forecasts = await this.forecastTimeSeries(data, horizon, 'business');
    
    return forecasts.map((forecast, index) => {
      // Calculate confidence interval based on historical variance
      const variance = this.calculateVariance(data.map(d => d.value));
      const standardError = Math.sqrt(variance) * Math.sqrt(index + 1);
      const margin = 1.96 * standardError; // 95% confidence interval
      
      return {
        value: forecast.value,
        confidence: forecast.confidence,
        lowerBound: Math.max(0, forecast.value - margin),
        upperBound: forecast.value + margin
      };
    });
  }

  private calculateLinearTrend(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateSeasonalFactors(
    data: Array<{ date: Date; value: number }>
  ): Promise<{ [dayOfWeek: number]: number }> {
    const dayAverages: { [key: number]: number[] } = {};
    
    // Group values by day of week
    data.forEach(({ date, value }) => {
      const dayOfWeek = date.getDay();
      if (!dayAverages[dayOfWeek]) {
        dayAverages[dayOfWeek] = [];
      }
      dayAverages[dayOfWeek].push(value);
    });
    
    // Calculate average for each day
    const overallAverage = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    const seasonalFactors: { [dayOfWeek: number]: number } = {};
    
    for (let day = 0; day < 7; day++) {
      if (dayAverages[day] && dayAverages[day].length > 0) {
        const dayAverage = dayAverages[day].reduce((a, b) => a + b, 0) / dayAverages[day].length;
        seasonalFactors[day] = dayAverage / overallAverage;
      } else {
        seasonalFactors[day] = 1.0;
      }
    }
    
    return Promise.resolve(seasonalFactors);
  }

  private calculateGrowthRate(
    data: Array<{ date: Date; value: number }>,
    horizon: number
  ): number {
    if (data.length < 2) return 0;
    
    const recent = data.slice(-7); // Last 7 days
    const older = data.slice(-14, -7); // Previous 7 days
    
    const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.value, 0) / older.length;
    
    return olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  }

  private async identifyGrowthFactors(
    data: Array<{ date: Date; value: number }>,
    horizon: number
  ): Promise<PredictionFactor[]> {
    // Mock implementation - would analyze various factors affecting growth
    return [
      {
        name: 'Historical Trend',
        importance: 0.4,
        value: this.calculateLinearTrend(data.map(d => d.value)),
        impact: 'positive'
      },
      {
        name: 'Seasonal Pattern',
        importance: 0.3,
        value: 1.1,
        impact: 'positive'
      },
      {
        name: 'Market Conditions',
        importance: 0.2,
        value: 0.95,
        impact: 'neutral'
      },
      {
        name: 'Platform Features',
        importance: 0.1,
        value: 1.05,
        impact: 'positive'
      }
    ];
  }

  private async predictTrendingTopics(date: Date): Promise<string[]> {
    // Mock implementation - would analyze content patterns and predict trending topics
    const topics = [
      'DeFi', 'NFTs', 'Web3', 'Blockchain', 'Cryptocurrency',
      'DAO', 'Metaverse', 'Smart Contracts', 'Staking', 'Governance'
    ];
    
    // Return random subset for now
    return topics.slice(0, Math.floor(Math.random() * 5) + 1);
  }

  private generateCapacityRecommendations(metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  }): string[] {
    const recommendations: string[] = [];
    
    if (metrics.cpu > 80) {
      recommendations.push('Consider scaling CPU resources or optimizing high-CPU processes');
    }
    
    if (metrics.memory > 85) {
      recommendations.push('Memory usage approaching limits - consider increasing memory allocation');
    }
    
    if (metrics.disk > 90) {
      recommendations.push('Disk usage critical - implement data archival or increase storage capacity');
    }
    
    if (metrics.network > 75) {
      recommendations.push('Network traffic high - consider CDN optimization or load balancing');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System capacity appears adequate for predicted load');
    }
    
    return recommendations;
  }

  private determineTrend(
    data: Array<{ date: Date; value: number }>,
    predictedValue: number
  ): 'increasing' | 'decreasing' | 'stable' {
    if (data.length === 0) return 'stable';
    
    const recentAverage = data.slice(-7).reduce((sum, d) => sum + d.value, 0) / 7;
    const difference = predictedValue - recentAverage;
    const threshold = recentAverage * 0.05; // 5% threshold
    
    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  private calculateSeasonality(
    data: Array<{ date: Date; value: number }>,
    horizon: number
  ): number {
    // Simple seasonality calculation based on day of week
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + horizon);
    const dayOfWeek = targetDate.getDay();
    
    // Calculate average for this day of week vs overall average
    const dayValues = data.filter(d => d.date.getDay() === dayOfWeek).map(d => d.value);
    const overallAverage = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    
    if (dayValues.length === 0) return 1.0;
    
    const dayAverage = dayValues.reduce((sum, v) => sum + v, 0) / dayValues.length;
    return overallAverage > 0 ? dayAverage / overallAverage : 1.0;
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();