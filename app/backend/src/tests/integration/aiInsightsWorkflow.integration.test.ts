import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db';
import { createTestAdmin, createTestData, cleanupTestData } from '../fixtures/testDataFactory';

describe('AI Insights Workflow Integration Tests', () => {
  let adminToken: string;
  let testAdminId: string;

  beforeAll(async () => {
    const testAdmin = await createTestAdmin({
      email: 'ai-admin@test.com',
      role: 'super_admin',
      permissions: ['ai_insights_access', 'analytics_view', 'system_monitoring']
    });
    testAdminId = testAdmin.id;
    adminToken = testAdmin.token;

    // Create test data for AI analysis
    await createTestData({
      users: 100,
      posts: 500,
      comments: 1000,
      transactions: 200,
      disputes: 10
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI Insights Generation Workflow', () => {
    it('should generate predictive analytics insights', async () => {
      // Trigger AI insights generation
      const generateResponse = await request(app)
        .post('/api/admin/ai-insights/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          analysisType: 'predictive',
          timeRange: '30d',
          metrics: ['user_growth', 'content_volume', 'system_load']
        })
        .expect(202);

      expect(generateResponse.body).toHaveProperty('jobId');
      expect(generateResponse.body).toHaveProperty('status', 'processing');

      const jobId = generateResponse.body.jobId;

      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await request(app)
          .get(`/api/admin/ai-insights/job/${jobId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        if (statusResponse.body.status === 'completed') {
          completed = true;
          expect(statusResponse.body).toHaveProperty('insights');
          expect(Array.isArray(statusResponse.body.insights)).toBe(true);
          
          statusResponse.body.insights.forEach((insight: any) => {
            expect(insight).toHaveProperty('id');
            expect(insight).toHaveProperty('type');
            expect(insight).toHaveProperty('severity');
            expect(insight).toHaveProperty('title');
            expect(insight).toHaveProperty('description');
            expect(insight).toHaveProperty('confidence');
            expect(insight).toHaveProperty('recommendations');
          });
        }
        
        attempts++;
      }

      expect(completed).toBe(true);
    });

    it('should detect anomalies in user behavior', async () => {
      // Generate anomalous user activity
      await request(app)
        .post('/api/test/generate-anomalous-activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'test-user-anomaly',
          activityType: 'suspicious_login_pattern',
          intensity: 'high'
        });

      // Trigger anomaly detection
      const response = await request(app)
        .post('/api/admin/ai-insights/detect-anomalies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          analysisType: 'user_behavior',
          timeRange: '1h'
        })
        .expect(200);

      expect(response.body).toHaveProperty('anomalies');
      expect(Array.isArray(response.body.anomalies)).toBe(true);
      
      const suspiciousAnomaly = response.body.anomalies.find(
        (a: any) => a.userId === 'test-user-anomaly'
      );
      
      expect(suspiciousAnomaly).toBeDefined();
      expect(suspiciousAnomaly.anomalyScore).toBeGreaterThan(0.7);
      expect(suspiciousAnomaly.anomalyTypes).toContain('suspicious_login_pattern');
    });

    it('should generate content moderation insights', async () => {
      // Create content that needs moderation
      await request(app)
        .post('/api/test/create-flagged-content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contentType: 'post',
          flags: ['spam', 'inappropriate'],
          count: 5
        });

      const response = await request(app)
        .get('/api/admin/ai-insights/moderation')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          timeRange: '24h',
          includeRecommendations: true
        })
        .expect(200);

      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('queueMetrics');
      expect(response.body).toHaveProperty('recommendations');

      expect(response.body.queueMetrics).toHaveProperty('pendingItems');
      expect(response.body.queueMetrics).toHaveProperty('averageProcessingTime');
      expect(response.body.queueMetrics).toHaveProperty('flaggedContent');

      expect(Array.isArray(response.body.recommendations)).toBe(true);
      response.body.recommendations.forEach((rec: any) => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('estimatedImpact');
      });
    });
  });

  describe('Seller Performance Analysis Workflow', () => {
    it('should analyze seller risk factors', async () => {
      // Create seller data with risk indicators
      await request(app)
        .post('/api/test/create-seller-data')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sellerId: 'risky-seller',
          metrics: {
            disputeRate: 0.15, // High dispute rate
            responseTime: 72, // Slow response
            rating: 3.2, // Low rating
            orderVolume: 5 // Low volume
          }
        });

      const response = await request(app)
        .post('/api/admin/ai-insights/seller-analysis')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sellerId: 'risky-seller',
          analysisDepth: 'comprehensive'
        })
        .expect(200);

      expect(response.body).toHaveProperty('riskAssessment');
      expect(response.body).toHaveProperty('performanceMetrics');
      expect(response.body).toHaveProperty('recommendations');

      expect(response.body.riskAssessment).toHaveProperty('overallRisk');
      expect(response.body.riskAssessment).toHaveProperty('riskFactors');
      expect(response.body.riskAssessment.overallRisk).toBeGreaterThan(0.5);

      expect(Array.isArray(response.body.riskAssessment.riskFactors)).toBe(true);
      expect(response.body.riskAssessment.riskFactors).toContain('high_dispute_rate');
    });

    it('should generate marketplace health insights', async () => {
      const response = await request(app)
        .get('/api/admin/ai-insights/marketplace-health')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          timeRange: '7d',
          includeForecasts: true
        })
        .expect(200);

      expect(response.body).toHaveProperty('healthScore');
      expect(response.body).toHaveProperty('keyMetrics');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('forecasts');
      expect(response.body).toHaveProperty('recommendations');

      expect(typeof response.body.healthScore).toBe('number');
      expect(response.body.healthScore).toBeGreaterThanOrEqual(0);
      expect(response.body.healthScore).toBeLessThanOrEqual(1);

      expect(response.body.keyMetrics).toHaveProperty('sellerCount');
      expect(response.body.keyMetrics).toHaveProperty('transactionVolume');
      expect(response.body.keyMetrics).toHaveProperty('averageOrderValue');
    });
  });

  describe('System Performance Insights Workflow', () => {
    it('should analyze system capacity and performance', async () => {
      // Generate system load data
      await request(app)
        .post('/api/test/generate-system-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          duration: '1h',
          loadPattern: 'increasing',
          peakLoad: 0.85
        });

      const response = await request(app)
        .post('/api/admin/ai-insights/system-analysis')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          analysisType: 'capacity_planning',
          forecastPeriod: '30d'
        })
        .expect(200);

      expect(response.body).toHaveProperty('currentCapacity');
      expect(response.body).toHaveProperty('utilizationTrends');
      expect(response.body).toHaveProperty('capacityForecast');
      expect(response.body).toHaveProperty('scalingRecommendations');

      expect(response.body.currentCapacity).toHaveProperty('cpu');
      expect(response.body.currentCapacity).toHaveProperty('memory');
      expect(response.body.currentCapacity).toHaveProperty('storage');
      expect(response.body.currentCapacity).toHaveProperty('network');

      expect(Array.isArray(response.body.scalingRecommendations)).toBe(true);
      response.body.scalingRecommendations.forEach((rec: any) => {
        expect(rec).toHaveProperty('resource');
        expect(rec).toHaveProperty('action');
        expect(rec).toHaveProperty('timeline');
        expect(rec).toHaveProperty('estimatedCost');
      });
    });

    it('should detect performance bottlenecks', async () => {
      // Create performance bottleneck scenario
      await request(app)
        .post('/api/test/create-bottleneck')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'database_slow_queries',
          severity: 'high',
          duration: '30m'
        });

      const response = await request(app)
        .get('/api/admin/ai-insights/bottlenecks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          timeRange: '1h',
          threshold: 0.7
        })
        .expect(200);

      expect(response.body).toHaveProperty('bottlenecks');
      expect(Array.isArray(response.body.bottlenecks)).toBe(true);

      const dbBottleneck = response.body.bottlenecks.find(
        (b: any) => b.type === 'database_slow_queries'
      );

      expect(dbBottleneck).toBeDefined();
      expect(dbBottleneck.severity).toBe('high');
      expect(dbBottleneck).toHaveProperty('impact');
      expect(dbBottleneck).toHaveProperty('recommendations');
    });
  });

  describe('Automated Alert Generation', () => {
    it('should generate alerts based on AI insights', async () => {
      // Create conditions that should trigger alerts
      await request(app)
        .post('/api/test/create-alert-conditions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          conditions: [
            { type: 'high_error_rate', value: 0.05 },
            { type: 'unusual_user_activity', value: 0.9 },
            { type: 'system_overload', value: 0.95 }
          ]
        });

      // Trigger AI analysis and alert generation
      const response = await request(app)
        .post('/api/admin/ai-insights/generate-alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          analysisTypes: ['system', 'user_behavior', 'content'],
          alertThreshold: 0.7
        })
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(Array.isArray(response.body.alerts)).toBe(true);
      expect(response.body.alerts.length).toBeGreaterThan(0);

      response.body.alerts.forEach((alert: any) => {
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('confidence');
        expect(alert).toHaveProperty('recommendedActions');
        expect(['low', 'medium', 'high', 'critical']).toContain(alert.severity);
      });
    });

    it('should handle alert escalation workflow', async () => {
      // Create critical alert
      const alertResponse = await request(app)
        .post('/api/admin/ai-insights/create-alert')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'security_breach_detected',
          severity: 'critical',
          confidence: 0.95,
          metadata: {
            affectedUsers: 100,
            suspiciousIPs: ['192.168.1.100'],
            detectionTime: new Date().toISOString()
          }
        })
        .expect(201);

      const alertId = alertResponse.body.alertId;

      // Check escalation was triggered
      const escalationResponse = await request(app)
        .get(`/api/admin/ai-insights/alert/${alertId}/escalation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(escalationResponse.body).toHaveProperty('escalated', true);
      expect(escalationResponse.body).toHaveProperty('escalationLevel');
      expect(escalationResponse.body).toHaveProperty('notifiedPersonnel');
      expect(escalationResponse.body).toHaveProperty('automatedActions');

      expect(Array.isArray(escalationResponse.body.notifiedPersonnel)).toBe(true);
      expect(Array.isArray(escalationResponse.body.automatedActions)).toBe(true);
    });
  });

  describe('Insight Quality and Validation', () => {
    it('should validate insight accuracy over time', async () => {
      // Generate insights
      const insightResponse = await request(app)
        .post('/api/admin/ai-insights/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          analysisType: 'predictive',
          timeRange: '7d',
          metrics: ['user_growth']
        })
        .expect(202);

      // Wait for completion and get insights
      await new Promise(resolve => setTimeout(resolve, 2000));

      const jobResponse = await request(app)
        .get(`/api/admin/ai-insights/job/${insightResponse.body.jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const insights = jobResponse.body.insights;
      const predictionInsight = insights.find((i: any) => i.type === 'prediction');

      if (predictionInsight) {
        // Simulate time passing and validate prediction
        const validationResponse = await request(app)
          .post(`/api/admin/ai-insights/validate/${predictionInsight.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            actualData: {
              userGrowth: 0.12, // Actual growth rate
              timeframe: '7d'
            }
          })
          .expect(200);

        expect(validationResponse.body).toHaveProperty('accuracy');
        expect(validationResponse.body).toHaveProperty('deviation');
        expect(validationResponse.body).toHaveProperty('confidenceScore');
        expect(validationResponse.body.accuracy).toBeGreaterThanOrEqual(0);
        expect(validationResponse.body.accuracy).toBeLessThanOrEqual(1);
      }
    });

    it('should track insight performance metrics', async () => {
      const response = await request(app)
        .get('/api/admin/ai-insights/performance-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          timeRange: '30d',
          insightTypes: 'prediction,anomaly,recommendation'
        })
        .expect(200);

      expect(response.body).toHaveProperty('overallAccuracy');
      expect(response.body).toHaveProperty('insightTypeMetrics');
      expect(response.body).toHaveProperty('modelPerformance');
      expect(response.body).toHaveProperty('userFeedback');

      expect(typeof response.body.overallAccuracy).toBe('number');
      expect(response.body.insightTypeMetrics).toHaveProperty('prediction');
      expect(response.body.insightTypeMetrics).toHaveProperty('anomaly');
      expect(response.body.insightTypeMetrics).toHaveProperty('recommendation');

      Object.values(response.body.insightTypeMetrics).forEach((metrics: any) => {
        expect(metrics).toHaveProperty('accuracy');
        expect(metrics).toHaveProperty('precision');
        expect(metrics).toHaveProperty('recall');
        expect(metrics).toHaveProperty('totalInsights');
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle AI service unavailability gracefully', async () => {
      // Mock AI service failure
      jest.spyOn(require('../../services/aiInsightsEngine'), 'AIInsightsEngine')
        .mockImplementation(() => {
          throw new Error('AI service unavailable');
        });

      const response = await request(app)
        .post('/api/admin/ai-insights/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          analysisType: 'predictive',
          timeRange: '7d'
        })
        .expect(503);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('AI service temporarily unavailable');
      expect(response.body).toHaveProperty('fallbackRecommendations');

      jest.restoreAllMocks();
    });

    it('should handle invalid analysis parameters', async () => {
      await request(app)
        .post('/api/admin/ai-insights/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          analysisType: 'invalid_type',
          timeRange: 'invalid_range',
          metrics: ['nonexistent_metric']
        })
        .expect(400);
    });

    it('should handle concurrent insight generation requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/admin/ai-insights/generate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            analysisType: 'predictive',
            timeRange: '1d',
            requestId: `concurrent-${i}`
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect([202, 429]).toContain(response.status); // Accept or rate limited
        if (response.status === 202) {
          expect(response.body).toHaveProperty('jobId');
        }
      });
    });
  });
});
