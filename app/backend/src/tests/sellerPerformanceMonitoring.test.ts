import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { sellerPerformanceMonitoringService } from '../services/sellerPerformanceMonitoringService';
import { sellerErrorTrackingService } from '../services/sellerErrorTrackingService';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null as any),
    set: jest.fn().mockResolvedValue('OK' as any),
    setex: jest.fn().mockResolvedValue('OK' as any),
    del: jest.fn().mockResolvedValue(1 as any),
    publish: jest.fn().mockResolvedValue(1 as any),
    zadd: jest.fn().mockResolvedValue(1 as any),
    expire: jest.fn().mockResolvedValue(1 as any),
  }));
});

// Mock database
jest.mock('../db/connection', () => ({
  db: {
    execute: jest.fn().mockResolvedValue([] as any)
  }
}));

describe('Seller Performance Monitoring Service', () => {
  const testSellerId = 'test-seller-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Performance Metrics Storage', () => {
    it('should store performance metrics successfully', async () => {
      const mockMetrics = [{
        sellerId: testSellerId,
        timestamp: new Date().toISOString(),
        componentLoadTimes: {
          sellerOnboarding: 1200,
          sellerProfile: 800,
          sellerDashboard: 1500,
          sellerStore: 1000,
        },
        apiResponseTimes: {
          getProfile: 250,
          updateProfile: 400,
          getListings: 300,
          createListing: 500,
          getDashboard: 350,
        },
        cacheMetrics: {
          hitRate: 92,
          missRate: 8,
          invalidationTime: 50,
          averageRetrievalTime: 25,
        },
        errorMetrics: {
          totalErrors: 2,
          errorRate: 0.5,
          criticalErrors: 0,
          recoveredErrors: 1,
          errorsByType: { api: 1, component: 1 },
        },
        userExperienceMetrics: {
          timeToInteractive: 2000,
          firstContentfulPaint: 1500,
          largestContentfulPaint: 2500,
          cumulativeLayoutShift: 0.1,
          firstInputDelay: 100,
        },
        mobileMetrics: {
          touchResponseTime: 50,
          scrollPerformance: 60,
          gestureRecognitionTime: 30,
          batteryImpact: 5,
        },
        realTimeMetrics: {
          webSocketConnectionTime: 200,
          messageDeliveryTime: 100,
          liveUpdateLatency: 150,
          connectionStability: 95,
        },
      }];

      await expect(
        sellerPerformanceMonitoringService.storePerformanceMetrics(testSellerId, mockMetrics)
      ).resolves.not.toThrow();
    });

    it('should handle empty metrics array', async () => {
      await expect(
        sellerPerformanceMonitoringService.storePerformanceMetrics(testSellerId, [])
      ).resolves.not.toThrow();
    });
  });

  describe('Performance Dashboard', () => {
    it('should return performance dashboard data', async () => {
      const dashboardData = await sellerPerformanceMonitoringService.getPerformanceDashboard(testSellerId);

      expect(dashboardData).toBeDefined();
      expect(dashboardData.sellerId).toBe(testSellerId);
      expect(dashboardData.overallScore).toBeGreaterThanOrEqual(0);
      expect(dashboardData.overallScore).toBeLessThanOrEqual(100);
      expect(dashboardData.metrics).toBeDefined();
      expect(dashboardData.alerts).toBeInstanceOf(Array);
      expect(dashboardData.regressions).toBeInstanceOf(Array);
      expect(dashboardData.trends).toBeInstanceOf(Array);
      expect(dashboardData.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Performance Regression Testing', () => {
    it('should run load test successfully', async () => {
      const testResult = await sellerPerformanceMonitoringService.runPerformanceRegressionTest(
        testSellerId,
        'load'
      );

      expect(testResult).toBeDefined();
      expect(testResult.testId).toBeDefined();
      expect(testResult.sellerId).toBe(testSellerId);
      expect(testResult.testType).toBe('load');
      expect(testResult.status).toBe('completed');
      expect(testResult.results).toBeDefined();
      expect(testResult.results.averageResponseTime).toBeGreaterThan(0);
      expect(testResult.results.successRate).toBeGreaterThanOrEqual(0);
      expect(testResult.results.successRate).toBeLessThanOrEqual(100);
    });

    it('should run different test types', async () => {
      const testTypes: Array<'load' | 'stress' | 'endurance' | 'spike' | 'volume'> = [
        'load', 'stress', 'endurance', 'spike', 'volume'
      ];

      for (const testType of testTypes) {
        const testResult = await sellerPerformanceMonitoringService.runPerformanceRegressionTest(
          testSellerId,
          testType
        );

        expect(testResult.testType).toBe(testType);
        expect(testResult.status).toBe('completed');
      }
    });
  });

  describe('Performance Alerts', () => {
    it('should create performance alert', async () => {
      const alertData = {
        alertType: 'performance' as const,
        severity: 'high' as const,
        title: 'High API Response Time',
        description: 'API response time exceeded threshold',
        metrics: { responseTime: 5000, threshold: 2000 },
        actions: [{
          action: 'investigate',
          description: 'Investigate slow API response',
          automated: false
        }]
      };

      const alert = await sellerPerformanceMonitoringService.createPerformanceAlert(
        testSellerId,
        { ...alertData, sellerId: testSellerId }
      );

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.sellerId).toBe(testSellerId);
      expect(alert.alertType).toBe('performance');
      expect(alert.severity).toBe('high');
      expect(alert.resolved).toBe(false);
    });

    it('should get performance alerts', async () => {
      const alerts = await sellerPerformanceMonitoringService.getPerformanceAlerts(testSellerId);

      expect(alerts).toBeInstanceOf(Array);
    });

    it('should filter alerts by severity', async () => {
      const criticalAlerts = await sellerPerformanceMonitoringService.getPerformanceAlerts(
        testSellerId,
        'critical'
      );

      expect(criticalAlerts).toBeInstanceOf(Array);
    });
  });

  describe('Performance Recommendations', () => {
    it('should get performance recommendations', async () => {
      const recommendations = await sellerPerformanceMonitoringService.getPerformanceRecommendations(testSellerId);

      expect(recommendations).toBeInstanceOf(Array);
      
      if (recommendations.length > 0) {
        const rec = recommendations[0];
        expect(rec.priority).toMatch(/^(high|medium|low)$/);
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.expectedImpact).toBeDefined();
        expect(rec.effort).toMatch(/^(low|medium|high)$/);
      }
    });
  });

  describe('Performance Trends', () => {
    it('should get performance trends', async () => {
      const trends = await sellerPerformanceMonitoringService.getPerformanceTrends(
        testSellerId,
        'API Response Time',
        'day',
        7
      );

      expect(trends).toBeInstanceOf(Array);
    });

    it('should handle different time periods', async () => {
      const periods: Array<'hour' | 'day' | 'week'> = ['hour', 'day', 'week'];

      for (const period of periods) {
        const trends = await sellerPerformanceMonitoringService.getPerformanceTrends(
          testSellerId,
          undefined,
          period,
          10
        );

        expect(trends).toBeInstanceOf(Array);
      }
    });
  });
});

describe('Seller Error Tracking Service', () => {
  const testSellerId = 'test-seller-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Tracking', () => {
    it('should track seller error successfully', async () => {
      const errorData = {
        type: 'api',
        severity: 'medium' as const,
        message: 'API request failed',
        stack: 'Error: API request failed\n    at test.js:1:1',
        context: {
          component: 'SellerProfile',
          endpoint: '/api/seller/profile',
          userAgent: 'Mozilla/5.0...',
          url: '/seller/profile',
          timestamp: new Date().toISOString(),
          metadata: { userId: 'user-123' }
        }
      };

      const trackedError = await sellerErrorTrackingService.trackError(testSellerId, errorData);

      expect(trackedError).toBeDefined();
      expect(trackedError.id).toBeDefined();
      expect(trackedError.sellerId).toBe(testSellerId);
      expect(trackedError.errorType).toBe('api');
      expect(trackedError.severity).toBe('medium');
      expect(trackedError.message).toBe('API request failed');
      expect(trackedError.count).toBe(1);
      expect(trackedError.resolved).toBe(false);
    });

    it('should increment count for duplicate errors', async () => {
      const errorData = {
        type: 'component',
        severity: 'low' as const,
        message: 'Component render error',
        context: {
          component: 'SellerDashboard',
          timestamp: new Date().toISOString()
        }
      };

      // Track the same error twice
      const firstError = await sellerErrorTrackingService.trackError(testSellerId, errorData);
      const secondError = await sellerErrorTrackingService.trackError(testSellerId, errorData);

      expect(firstError.count).toBe(1);
      expect(secondError.count).toBe(2);
      expect(firstError.fingerprint).toBe(secondError.fingerprint);
    });

    it('should handle critical errors with alerts', async () => {
      const criticalError = {
        type: 'security',
        severity: 'critical' as const,
        message: 'Security breach detected',
        context: {
          component: 'SellerAuth',
          timestamp: new Date().toISOString(),
          metadata: { suspiciousActivity: true }
        }
      };

      const trackedError = await sellerErrorTrackingService.trackError(testSellerId, criticalError);

      expect(trackedError.severity).toBe('critical');
    });
  });

  describe('Error Metrics', () => {
    it('should get error metrics for different timeframes', async () => {
      const timeframes: Array<'hour' | 'day' | 'week' | 'month'> = ['hour', 'day', 'week', 'month'];

      for (const timeframe of timeframes) {
        const metrics = await sellerErrorTrackingService.getErrorMetrics(testSellerId, timeframe);

        expect(metrics).toBeDefined();
        expect(metrics.sellerId).toBe(testSellerId);
        expect(metrics.timeframe).toBe(timeframe);
        expect(metrics.totalErrors).toBeGreaterThanOrEqual(0);
        expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
        expect(metrics.errorsByType).toBeDefined();
        expect(metrics.errorsBySeverity).toBeDefined();
        expect(metrics.topErrors).toBeInstanceOf(Array);
        expect(metrics.trends).toBeInstanceOf(Array);
      }
    });
  });

  describe('Error Alerts', () => {
    it('should get error alerts', async () => {
      const alerts = await sellerErrorTrackingService.getErrorAlerts(testSellerId);

      expect(alerts).toBeInstanceOf(Array);
    });

    it('should filter alerts by acknowledgment status', async () => {
      const unacknowledgedAlerts = await sellerErrorTrackingService.getErrorAlerts(testSellerId, false);
      const acknowledgedAlerts = await sellerErrorTrackingService.getErrorAlerts(testSellerId, true);

      expect(unacknowledgedAlerts).toBeInstanceOf(Array);
      expect(acknowledgedAlerts).toBeInstanceOf(Array);
    });

    it('should acknowledge alert', async () => {
      const alertId = 'test-alert-123';
      const acknowledgedBy = 'admin-user';

      await expect(
        sellerErrorTrackingService.acknowledgeAlert(alertId, acknowledgedBy)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Resolution', () => {
    it('should resolve error', async () => {
      const errorId = 'test-error-123';
      const resolvedBy = 'admin-user';

      await expect(
        sellerErrorTrackingService.resolveError(errorId, resolvedBy, 'Fixed API endpoint')
      ).resolves.not.toThrow();
    });
  });

  describe('Error Cleanup', () => {
    it('should clean up old errors', async () => {
      const deletedCount = await sellerErrorTrackingService.cleanupOldErrors();

      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Integration Tests', () => {
  const testSellerId = 'integration-test-seller';

  it('should handle performance monitoring and error tracking together', async () => {
    // Store performance metrics
    const metrics = [{
      sellerId: testSellerId,
      timestamp: new Date().toISOString(),
      componentLoadTimes: { sellerOnboarding: 1000, sellerProfile: 800, sellerDashboard: 1200, sellerStore: 900 },
      apiResponseTimes: { getProfile: 300, updateProfile: 450, getListings: 250, createListing: 600, getDashboard: 400 },
      cacheMetrics: { hitRate: 88, missRate: 12, invalidationTime: 75, averageRetrievalTime: 30 },
      errorMetrics: { totalErrors: 3, errorRate: 1.2, criticalErrors: 0, recoveredErrors: 2, errorsByType: { api: 2, component: 1 } },
      userExperienceMetrics: { timeToInteractive: 1800, firstContentfulPaint: 1200, largestContentfulPaint: 2200, cumulativeLayoutShift: 0.15, firstInputDelay: 120 },
      mobileMetrics: { touchResponseTime: 60, scrollPerformance: 55, gestureRecognitionTime: 40, batteryImpact: 7 },
      realTimeMetrics: { webSocketConnectionTime: 250, messageDeliveryTime: 120, liveUpdateLatency: 180, connectionStability: 92 }
    }];

    await sellerPerformanceMonitoringService.storePerformanceMetrics(testSellerId, metrics);

    // Track an error
    const errorData = {
      type: 'api',
      severity: 'medium' as const,
      message: 'Integration test error',
      context: {
        component: 'IntegrationTest',
        timestamp: new Date().toISOString()
      }
    };

    await sellerErrorTrackingService.trackError(testSellerId, errorData);

    // Get dashboard data
    const dashboard = await sellerPerformanceMonitoringService.getPerformanceDashboard(testSellerId);
    const errorMetrics = await sellerErrorTrackingService.getErrorMetrics(testSellerId);

    expect(dashboard).toBeDefined();
    expect(errorMetrics).toBeDefined();
    expect(dashboard.sellerId).toBe(testSellerId);
    expect(errorMetrics.sellerId).toBe(testSellerId);
  });
});