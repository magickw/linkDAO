import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PredictiveAnalyticsService } from '../services/predictiveAnalyticsService';

// Mock ML libraries
jest.mock('@tensorflow/tfjs-node', () => ({
  sequential: jest.fn(() => ({
    add: jest.fn(),
    compile: jest.fn(),
    fit: jest.fn().mockResolvedValue({}),
    predict: jest.fn().mockReturnValue({
      dataSync: jest.fn().mockReturnValue([100, 110, 120])
    })
  })),
  layers: {
    dense: jest.fn()
  },
  tensor2d: jest.fn(),
  loadLayersModel: jest.fn()
}));

// Mock database
jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn()
  }
}));

describe('PredictiveAnalyticsService', () => {
  let predictiveAnalyticsService: PredictiveAnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    predictiveAnalyticsService = new PredictiveAnalyticsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('predictUserGrowth', () => {
    it('should predict user growth for specified period', async () => {
      const historicalData = [
        { date: '2024-01-01', users: 1000 },
        { date: '2024-01-02', users: 1050 },
        { date: '2024-01-03', users: 1100 }
      ];

      const prediction = await predictiveAnalyticsService.predictUserGrowth(
        historicalData,
        30 // 30 days forecast
      );

      expect(prediction).toHaveProperty('predictions');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('trend');
      expect(prediction).toHaveProperty('seasonality');
      expect(Array.isArray(prediction.predictions)).toBe(true);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle insufficient data gracefully', async () => {
      const insufficientData = [
        { date: '2024-01-01', users: 1000 }
      ];

      await expect(predictiveAnalyticsService.predictUserGrowth(insufficientData, 30))
        .rejects.toThrow('Insufficient historical data for prediction');
    });
  });

  describe('predictContentVolume', () => {
    it('should forecast content creation volume', async () => {
      const contentData = [
        { date: '2024-01-01', posts: 100, comments: 500 },
        { date: '2024-01-02', posts: 110, comments: 550 },
        { date: '2024-01-03', posts: 120, comments: 600 }
      ];

      const prediction = await predictiveAnalyticsService.predictContentVolume(
        contentData,
        14 // 14 days forecast
      );

      expect(prediction).toHaveProperty('postsPrediction');
      expect(prediction).toHaveProperty('commentsPrediction');
      expect(prediction).toHaveProperty('engagementForecast');
      expect(prediction.postsPrediction).toHaveProperty('values');
      expect(prediction.postsPrediction).toHaveProperty('confidence');
    });
  });

  describe('predictSystemLoad', () => {
    it('should predict system resource usage', async () => {
      const systemData = [
        { timestamp: '2024-01-01T00:00:00Z', cpu: 45, memory: 60, requests: 1000 },
        { timestamp: '2024-01-01T01:00:00Z', cpu: 50, memory: 65, requests: 1100 },
        { timestamp: '2024-01-01T02:00:00Z', cpu: 55, memory: 70, requests: 1200 }
      ];

      const prediction = await predictiveAnalyticsService.predictSystemLoad(
        systemData,
        24 // 24 hours forecast
      );

      expect(prediction).toHaveProperty('cpuForecast');
      expect(prediction).toHaveProperty('memoryForecast');
      expect(prediction).toHaveProperty('requestsForecast');
      expect(prediction).toHaveProperty('capacityRecommendations');
      expect(Array.isArray(prediction.capacityRecommendations)).toBe(true);
    });

    it('should identify capacity bottlenecks', async () => {
      const highLoadData = [
        { timestamp: '2024-01-01T00:00:00Z', cpu: 85, memory: 90, requests: 5000 },
        { timestamp: '2024-01-01T01:00:00Z', cpu: 90, memory: 92, requests: 5500 },
        { timestamp: '2024-01-01T02:00:00Z', cpu: 95, memory: 95, requests: 6000 }
      ];

      const prediction = await predictiveAnalyticsService.predictSystemLoad(
        highLoadData,
        12
      );

      expect(prediction.capacityRecommendations.length).toBeGreaterThan(0);
      expect(prediction.capacityRecommendations[0]).toHaveProperty('type');
      expect(prediction.capacityRecommendations[0]).toHaveProperty('priority');
      expect(prediction.capacityRecommendations[0]).toHaveProperty('description');
    });
  });

  describe('predictModerationWorkload', () => {
    it('should forecast moderation queue size', async () => {
      const moderationData = [
        { date: '2024-01-01', submitted: 50, processed: 45, avgProcessingTime: 300 },
        { date: '2024-01-02', submitted: 55, processed: 50, avgProcessingTime: 280 },
        { date: '2024-01-03', submitted: 60, processed: 55, avgProcessingTime: 320 }
      ];

      const prediction = await predictiveAnalyticsService.predictModerationWorkload(
        moderationData,
        7 // 7 days forecast
      );

      expect(prediction).toHaveProperty('queueSizeForecast');
      expect(prediction).toHaveProperty('processingTimeForecast');
      expect(prediction).toHaveProperty('staffingRecommendations');
      expect(prediction).toHaveProperty('workloadDistribution');
    });
  });

  describe('predictSellerPerformance', () => {
    it('should forecast seller metrics', async () => {
      const sellerData = [
        { sellerId: 'seller-1', revenue: 1000, orders: 20, rating: 4.5 },
        { sellerId: 'seller-2', revenue: 1500, orders: 30, rating: 4.8 }
      ];

      const predictions = await predictiveAnalyticsService.predictSellerPerformance(
        sellerData,
        30 // 30 days forecast
      );

      expect(Array.isArray(predictions)).toBe(true);
      predictions.forEach(prediction => {
        expect(prediction).toHaveProperty('sellerId');
        expect(prediction).toHaveProperty('revenueForecast');
        expect(prediction).toHaveProperty('ordersForecast');
        expect(prediction).toHaveProperty('ratingTrend');
        expect(prediction).toHaveProperty('riskFactors');
      });
    });

    it('should identify at-risk sellers', async () => {
      const riskSellerData = [
        { sellerId: 'seller-risk', revenue: 500, orders: 5, rating: 3.2, disputes: 3 }
      ];

      const predictions = await predictiveAnalyticsService.predictSellerPerformance(
        riskSellerData,
        30
      );

      const riskSeller = predictions.find(p => p.sellerId === 'seller-risk');
      expect(riskSeller?.riskFactors.length).toBeGreaterThan(0);
      expect(riskSeller?.riskScore).toBeGreaterThan(0.5);
    });
  });

  describe('detectAnomalies', () => {
    it('should identify anomalous patterns in data', async () => {
      const normalData = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        value: 100 + Math.random() * 20 // Normal range: 100-120
      }));

      // Add anomalous data points
      normalData.push({
        timestamp: new Date().toISOString(),
        value: 200 // Anomaly: much higher than normal
      });

      const anomalies = await predictiveAnalyticsService.detectAnomalies(normalData);

      expect(Array.isArray(anomalies)).toBe(true);
      expect(anomalies.length).toBeGreaterThan(0);
      anomalies.forEach(anomaly => {
        expect(anomaly).toHaveProperty('timestamp');
        expect(anomaly).toHaveProperty('value');
        expect(anomaly).toHaveProperty('anomalyScore');
        expect(anomaly).toHaveProperty('expectedRange');
      });
    });
  });

  describe('generateInsights', () => {
    it('should generate actionable insights from predictions', async () => {
      const predictionData = {
        userGrowth: { trend: 'increasing', rate: 0.15 },
        systemLoad: { peak: 0.85, average: 0.65 },
        contentVolume: { growth: 0.20 }
      };

      const insights = await predictiveAnalyticsService.generateInsights(predictionData);

      expect(Array.isArray(insights)).toBe(true);
      insights.forEach(insight => {
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('severity');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('recommendations');
        expect(insight).toHaveProperty('confidence');
      });
    });
  });

  describe('trainModel', () => {
    it('should train prediction model with new data', async () => {
      const trainingData = Array.from({ length: 1000 }, (_, i) => ({
        features: [i, i * 2, Math.sin(i / 10)],
        target: i * 1.5 + Math.random() * 10
      }));

      const modelMetrics = await predictiveAnalyticsService.trainModel(
        'user_growth',
        trainingData
      );

      expect(modelMetrics).toHaveProperty('accuracy');
      expect(modelMetrics).toHaveProperty('loss');
      expect(modelMetrics).toHaveProperty('epochs');
      expect(modelMetrics).toHaveProperty('validationScore');
      expect(modelMetrics.accuracy).toBeGreaterThan(0);
    });
  });

  describe('validatePredictions', () => {
    it('should validate prediction accuracy against actual data', async () => {
      const predictions = [100, 110, 120, 130];
      const actualValues = [105, 108, 125, 128];

      const validation = await predictiveAnalyticsService.validatePredictions(
        predictions,
        actualValues
      );

      expect(validation).toHaveProperty('accuracy');
      expect(validation).toHaveProperty('meanAbsoluteError');
      expect(validation).toHaveProperty('rootMeanSquareError');
      expect(validation).toHaveProperty('correlationCoefficient');
      expect(validation.accuracy).toBeGreaterThan(0);
      expect(validation.accuracy).toBeLessThanOrEqual(1);
    });
  });
});