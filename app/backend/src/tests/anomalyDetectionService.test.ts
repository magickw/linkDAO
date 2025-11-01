import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AnomalyDetectionService } from '../services/anomalyDetectionService';

// Mock ML dependencies
jest.mock('@tensorflow/tfjs-node', () => ({
  tensor1d: jest.fn().mockReturnValue({
    reshape: jest.fn().mockReturnValue({
      dataSync: jest.fn().mockReturnValue([0.1, 0.9, 0.2])
    })
  }),
  sequential: jest.fn(() => ({
    add: jest.fn(),
    compile: jest.fn(),
    fit: jest.fn().mockResolvedValue({}),
    predict: jest.fn().mockReturnValue({
      dataSync: jest.fn().mockReturnValue([0.1, 0.9, 0.2])
    })
  })),
  layers: {
    dense: jest.fn(),
    dropout: jest.fn()
  }
}));

jest.mock('ml-matrix', () => ({
  Matrix: jest.fn().mockImplementation((data) => ({
    data,
    rows: data.length,
    columns: data[0]?.length || 0,
    mean: jest.fn().mockReturnValue([0.5, 0.5]),
    standardDeviation: jest.fn().mockReturnValue([0.2, 0.2])
  }))
}));

describe('AnomalyDetectionService', () => {
  let anomalyDetectionService: AnomalyDetectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    anomalyDetectionService = new AnomalyDetectionService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('detectUserBehaviorAnomalies', () => {
    it('should detect anomalous user behavior patterns', async () => {
      const userActivityData = [
        {
          userId: 'user-1',
          loginFrequency: 5,
          sessionDuration: 1800,
          actionsPerSession: 25,
          timeOfDay: 14,
          deviceType: 'desktop'
        },
        {
          userId: 'user-2',
          loginFrequency: 50, // Anomalous: very high
          sessionDuration: 10, // Anomalous: very short
          actionsPerSession: 200, // Anomalous: very high
          timeOfDay: 3, // Anomalous: unusual time
          deviceType: 'mobile'
        }
      ];

      const anomalies = await anomalyDetectionService.detectUserBehaviorAnomalies(userActivityData);

      expect(Array.isArray(anomalies)).toBe(true);
      expect(anomalies.length).toBeGreaterThan(0);
      
      const user2Anomaly = anomalies.find(a => a.userId === 'user-2');
      expect(user2Anomaly).toBeDefined();
      expect(user2Anomaly?.anomalyScore).toBeGreaterThan(0.5);
      expect(user2Anomaly?.anomalyTypes).toContain('unusual_activity_pattern');
    });

    it('should identify bot-like behavior', async () => {
      const botLikeData = [
        {
          userId: 'bot-user',
          loginFrequency: 100,
          sessionDuration: 5,
          actionsPerSession: 1000,
          timeOfDay: 2,
          deviceType: 'unknown',
          clickPattern: 'regular_intervals',
          userAgent: 'automated'
        }
      ];

      const anomalies = await anomalyDetectionService.detectUserBehaviorAnomalies(botLikeData);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].anomalyTypes).toContain('bot_behavior');
      expect(anomalies[0].confidence).toBeGreaterThan(0.8);
    });
  });

  describe('detectContentAnomalies', () => {
    it('should detect anomalous content patterns', async () => {
      const contentMetrics = [
        {
          contentId: 'content-1',
          engagementRate: 0.05,
          viewDuration: 30,
          shareRate: 0.01,
          commentSentiment: 0.7,
          reportCount: 0
        },
        {
          contentId: 'content-2',
          engagementRate: 0.95, // Anomalous: very high
          viewDuration: 5, // Anomalous: very low
          shareRate: 0.8, // Anomalous: very high
          commentSentiment: -0.9, // Anomalous: very negative
          reportCount: 50 // Anomalous: many reports
        }
      ];

      const anomalies = await anomalyDetectionService.detectContentAnomalies(contentMetrics);

      expect(Array.isArray(anomalies)).toBe(true);
      
      const content2Anomaly = anomalies.find(a => a.contentId === 'content-2');
      expect(content2Anomaly).toBeDefined();
      expect(content2Anomaly?.anomalyScore).toBeGreaterThan(0.7);
      expect(content2Anomaly?.anomalyTypes).toContain('engagement_manipulation');
    });

    it('should detect spam content patterns', async () => {
      const spamContent = [
        {
          contentId: 'spam-content',
          textLength: 10,
          linkCount: 20,
          capsRatio: 0.8,
          duplicateScore: 0.95,
          keywordDensity: 0.9,
          postFrequency: 100
        }
      ];

      const anomalies = await anomalyDetectionService.detectContentAnomalies(spamContent);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].anomalyTypes).toContain('spam_pattern');
      expect(anomalies[0].severity).toBe('high');
    });
  });

  describe('detectSystemAnomalies', () => {
    it('should detect system performance anomalies', async () => {
      const systemMetrics = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          cpuUsage: 0.45,
          memoryUsage: 0.60,
          diskIO: 100,
          networkIO: 500,
          responseTime: 150,
          errorRate: 0.001
        },
        {
          timestamp: '2024-01-01T10:01:00Z',
          cpuUsage: 0.95, // Anomalous: very high
          memoryUsage: 0.98, // Anomalous: very high
          diskIO: 10000, // Anomalous: very high
          networkIO: 50, // Anomalous: very low
          responseTime: 5000, // Anomalous: very high
          errorRate: 0.5 // Anomalous: very high
        }
      ];

      const anomalies = await anomalyDetectionService.detectSystemAnomalies(systemMetrics);

      expect(Array.isArray(anomalies)).toBe(true);
      expect(anomalies.length).toBeGreaterThan(0);
      
      const systemAnomaly = anomalies.find(a => 
        a.timestamp === '2024-01-01T10:01:00Z'
      );
      expect(systemAnomaly).toBeDefined();
      expect(systemAnomaly?.anomalyTypes).toContain('performance_degradation');
      expect(systemAnomaly?.severity).toBe('critical');
    });

    it('should detect security-related anomalies', async () => {
      const securityMetrics = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          failedLogins: 100, // Anomalous: many failed logins
          suspiciousIPs: 50,
          malwareDetections: 10,
          ddosIndicators: 5,
          dataExfiltrationSignals: 3
        }
      ];

      const anomalies = await anomalyDetectionService.detectSystemAnomalies(securityMetrics);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].anomalyTypes).toContain('security_threat');
      expect(anomalies[0].severity).toBe('critical');
    });
  });

  describe('trainAnomalyModel', () => {
    it('should train anomaly detection model with historical data', async () => {
      const trainingData = Array.from({ length: 1000 }, (_, i) => ({
        features: [
          Math.random() * 100, // Normal feature 1
          Math.random() * 50,  // Normal feature 2
          Math.random() * 10   // Normal feature 3
        ],
        isAnomaly: Math.random() > 0.95 // 5% anomalies
      }));

      const modelMetrics = await anomalyDetectionService.trainAnomalyModel(
        'user_behavior',
        trainingData
      );

      expect(modelMetrics).toHaveProperty('accuracy');
      expect(modelMetrics).toHaveProperty('precision');
      expect(modelMetrics).toHaveProperty('recall');
      expect(modelMetrics).toHaveProperty('f1Score');
      expect(modelMetrics).toHaveProperty('falsePositiveRate');
      expect(modelMetrics.accuracy).toBeGreaterThan(0.8);
    });
  });

  describe('calculateAnomalyScore', () => {
    it('should calculate anomaly score for data point', () => {
      const dataPoint = [0.8, 0.9, 0.7]; // Feature vector
      const normalDistribution = {
        mean: [0.5, 0.5, 0.5],
        covariance: [[0.1, 0, 0], [0, 0.1, 0], [0, 0, 0.1]]
      };

      const score = anomalyDetectionService.calculateAnomalyScore(
        dataPoint,
        normalDistribution
      );

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('setAnomalyThreshold', () => {
    it('should set custom anomaly detection threshold', () => {
      const threshold = 0.75;
      
      anomalyDetectionService.setAnomalyThreshold('user_behavior', threshold);
      
      const currentThreshold = anomalyDetectionService.getAnomalyThreshold('user_behavior');
      expect(currentThreshold).toBe(threshold);
    });
  });

  describe('getAnomalyExplanation', () => {
    it('should provide explanation for detected anomaly', () => {
      const anomaly = {
        id: 'anomaly-123',
        type: 'user_behavior',
        score: 0.85,
        features: {
          loginFrequency: 100,
          sessionDuration: 5,
          actionsPerSession: 500
        }
      };

      const explanation = anomalyDetectionService.getAnomalyExplanation(anomaly);

      expect(explanation).toHaveProperty('primaryFactors');
      expect(explanation).toHaveProperty('contributingFeatures');
      expect(explanation).toHaveProperty('riskLevel');
      expect(explanation).toHaveProperty('recommendedActions');
      expect(Array.isArray(explanation.primaryFactors)).toBe(true);
    });
  });

  describe('updateModel', () => {
    it('should update model with new training data', async () => {
      const newData = [
        {
          features: [0.6, 0.7, 0.5],
          isAnomaly: false
        },
        {
          features: [0.9, 0.95, 0.8],
          isAnomaly: true
        }
      ];

      const updateResult = await anomalyDetectionService.updateModel(
        'content_anomaly',
        newData
      );

      expect(updateResult).toHaveProperty('success', true);
      expect(updateResult).toHaveProperty('modelVersion');
      expect(updateResult).toHaveProperty('improvementMetrics');
    });
  });

  describe('validateModel', () => {
    it('should validate model performance on test data', async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        features: [Math.random(), Math.random(), Math.random()],
        isAnomaly: Math.random() > 0.9,
        id: `test-${i}`
      }));

      const validation = await anomalyDetectionService.validateModel(
        'system_anomaly',
        testData
      );

      expect(validation).toHaveProperty('accuracy');
      expect(validation).toHaveProperty('precision');
      expect(validation).toHaveProperty('recall');
      expect(validation).toHaveProperty('confusionMatrix');
      expect(validation).toHaveProperty('rocAuc');
      expect(validation.accuracy).toBeGreaterThan(0);
    });
  });
});
