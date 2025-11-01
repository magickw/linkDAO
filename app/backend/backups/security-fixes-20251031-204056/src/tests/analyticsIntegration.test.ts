import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../index';
import { analyticsService } from '../services/analyticsService';
import { realTimeDashboardService } from '../services/realTimeDashboardService';

// Mock the services
vi.mock('../services/analyticsService');
vi.mock('../services/realTimeDashboardService');

describe('Analytics Integration Tests', () => {
  const mockAnalyticsService = vi.mocked(analyticsService);
  const mockRealTimeDashboardService = vi.mocked(realTimeDashboardService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Analytics API Endpoints', () => {
    it('should handle complete analytics workflow', async () => {
      // Mock all required service methods
      const mockOverviewMetrics = {
        totalUsers: 1000,
        totalProducts: 500,
        totalOrders: 200,
        totalRevenue: 50000,
        averageOrderValue: 250,
        conversionRate: 20,
        gmv: 50000,
        userAcquisitionRate: 50,
        transactionSuccessRate: 95,
        activeUsers: {
          daily: 100,
          weekly: 500,
          monthly: 800
        }
      };

      const mockSalesAnalytics = {
        dailySales: [
          { date: '2024-01-01', sales: 1000, orders: 10, gmv: 1000 }
        ],
        topProducts: [
          { productId: 'prod-1', title: 'Product 1', sales: 500, revenue: 500, units: 10 }
        ],
        topCategories: [
          { category: 'Electronics', sales: 2000, revenue: 2000, growth: 15 }
        ],
        revenueByPaymentMethod: [
          { method: 'ETH', revenue: 30000, percentage: 60 }
        ],
        customerSegments: [
          { segment: 'Premium', revenue: 40000, count: 100, ltv: 400 }
        ]
      };

      const mockUserBehavior = {
        pageViews: 10000,
        sessionDuration: 300,
        bounceRate: 25,
        topPages: [
          { page: '/products', views: 5000, conversionRate: 15 }
        ],
        userJourney: [
          { step: 'Landing', users: 1000, dropoffRate: 10 }
        ],
        deviceBreakdown: { mobile: 60, desktop: 35, tablet: 5 },
        geographicDistribution: [
          { country: 'US', users: 500, revenue: 25000 }
        ]
      };

      const mockAnomalies = [
        {
          id: 'anomaly-1',
          type: 'transaction_spike',
          severity: 'medium' as const,
          description: 'Unusual transaction volume detected',
          affectedEntity: 'payment_system',
          detectionTime: new Date(),
          confidence: 0.85,
          suggestedActions: ['Monitor closely', 'Check for fraud']
        }
      ];

      mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);
      mockAnalyticsService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);
      mockAnalyticsService.getUserBehaviorData.mockResolvedValue(mockUserBehavior);
      mockAnalyticsService.detectAnomalies.mockResolvedValue(mockAnomalies);

      // Test overview metrics endpoint
      const overviewResponse = await request(app)
        .get('/api/analytics/overview')
        .expect(200);

      expect(overviewResponse.body.success).toBe(true);
      expect(overviewResponse.body.data).toEqual(mockOverviewMetrics);

      // Test sales analytics endpoint
      const salesResponse = await request(app)
        .get('/api/analytics/sales')
        .expect(200);

      expect(salesResponse.body.success).toBe(true);
      expect(salesResponse.body.data).toEqual(mockSalesAnalytics);

      // Test user behavior endpoint
      const behaviorResponse = await request(app)
        .get('/api/analytics/user-behavior')
        .expect(200);

      expect(behaviorResponse.body.success).toBe(true);
      expect(behaviorResponse.body.data).toEqual(mockUserBehavior);

      // Test anomalies endpoint
      const anomaliesResponse = await request(app)
        .get('/api/analytics/anomalies')
        .expect(200);

      expect(anomaliesResponse.body.success).toBe(true);
      expect(anomaliesResponse.body.data).toEqual(mockAnomalies);
    });

    it('should handle event tracking workflow', async () => {
      mockAnalyticsService.trackUserEvent.mockResolvedValue();

      // Track page view
      await request(app)
        .post('/api/analytics/track/event')
        .send({
          userId: 'user-123',
          sessionId: 'session-456',
          eventType: 'page_view',
          eventData: { page: '/products' },
          metadata: {
            pageUrl: 'https://example.com/products',
            userAgent: 'Mozilla/5.0...',
            deviceType: 'desktop'
          }
        })
        .expect(200);

      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'user-123',
        'session-456',
        'page_view',
        { page: '/products' },
        expect.objectContaining({
          pageUrl: 'https://example.com/products',
          userAgent: 'Mozilla/5.0...',
          deviceType: 'desktop'
        })
      );

      // Track product interaction
      await request(app)
        .post('/api/analytics/track/event')
        .send({
          userId: 'user-123',
          sessionId: 'session-456',
          eventType: 'product_view',
          eventData: { productId: 'prod-1', category: 'Electronics' }
        })
        .expect(200);

      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'user-123',
        'session-456',
        'product_view',
        { productId: 'prod-1', category: 'Electronics' },
        undefined
      );
    });

    it('should handle transaction tracking workflow', async () => {
      mockAnalyticsService.trackTransaction.mockResolvedValue();

      const transactionData = {
        transactionId: 'tx-123',
        orderId: 'order-456',
        type: 'purchase',
        amount: 100,
        currency: 'ETH',
        status: 'completed',
        transactionHash: '0x123...',
        gasUsed: 21000,
        gasPrice: 20000000000
      };

      await request(app)
        .post('/api/analytics/track/transaction')
        .send(transactionData)
        .expect(200);

      expect(mockAnalyticsService.trackTransaction).toHaveBeenCalledWith(transactionData);
    });

    it('should handle seller analytics with date filtering', async () => {
      const sellerId = 'seller-123';
      const mockSellerData = {
        sellerId,
        totalSales: 10000,
        totalOrders: 50,
        averageOrderValue: 200,
        conversionRate: 15,
        customerSatisfaction: 4.5,
        returnRate: 2,
        disputeRate: 1,
        responseTime: 2,
        shippingTime: 3,
        repeatCustomerRate: 30,
        revenueGrowth: 25,
        topProducts: [
          { productId: 'prod-1', title: 'Product 1', sales: 5000 }
        ],
        customerInsights: {
          demographics: { avgAge: 35, topCountries: ['US', 'UK'] },
          preferences: { topCategories: ['Electronics', 'Fashion'] },
          behavior: { avgSessionDuration: 300, returnRate: 0.3 }
        }
      };

      mockAnalyticsService.getSellerAnalytics.mockResolvedValue(mockSellerData);

      const response = await request(app)
        .get(`/api/analytics/seller/${sellerId}?startDate=2024-01-01&endDate=2024-01-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSellerData);
      expect(mockAnalyticsService.getSellerAnalytics).toHaveBeenCalledWith(
        sellerId,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });

    it('should handle real-time dashboard data', async () => {
      const mockDashboardData = {
        overview: {
          totalUsers: 1000,
          totalOrders: 200,
          transactionSuccessRate: 95,
          activeUsers: { daily: 100, weekly: 500, monthly: 800 }
        },
        anomalies: [],
        activeUsers: { mobile: 60, desktop: 35, tablet: 5 },
        lastUpdated: new Date().toISOString()
      };

      mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockDashboardData.overview as any);
      mockAnalyticsService.detectAnomalies.mockResolvedValue(mockDashboardData.anomalies);
      mockAnalyticsService.getUserBehaviorData.mockResolvedValue({ 
        deviceBreakdown: mockDashboardData.activeUsers 
      } as any);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        overview: mockDashboardData.overview,
        anomalies: mockDashboardData.anomalies,
        activeUsers: mockDashboardData.activeUsers,
        lastUpdated: expect.any(String)
      });
    });

    it('should handle custom report generation', async () => {
      const mockReport = {
        reportType: 'sales',
        period: '2024-01',
        totalSales: 50000,
        orderCount: 200,
        averageOrderValue: 250,
        topProducts: [
          { productId: 'prod-1', sales: 10000, units: 40 }
        ],
        salesByCategory: [
          { category: 'Electronics', sales: 30000, percentage: 60 }
        ]
      };

      mockAnalyticsService.generateReport.mockResolvedValue(mockReport);

      const response = await request(app)
        .post('/api/analytics/report')
        .send({
          reportType: 'sales',
          parameters: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toEqual(mockReport);
      expect(response.body.data.reportType).toBe('sales');
      expect(response.body.data.generatedAt).toBeDefined();
    });

    it('should handle data export functionality', async () => {
      const mockExportData = {
        exportedAt: new Date().toISOString(),
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        overview: { totalUsers: 1000, totalRevenue: 50000 },
        sales: { dailySales: [] },
        userBehavior: { pageViews: 10000 }
      };

      mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockExportData.overview as any);
      mockAnalyticsService.getSalesAnalytics.mockResolvedValue(mockExportData.sales as any);
      mockAnalyticsService.getUserBehaviorData.mockResolvedValue(mockExportData.userBehavior as any);

      // Test JSON export
      const jsonResponse = await request(app)
        .get('/api/analytics/export?startDate=2024-01-01&endDate=2024-01-31&format=json')
        .expect(200);

      expect(jsonResponse.headers['content-type']).toContain('application/json');
      expect(jsonResponse.headers['content-disposition']).toContain('attachment');
      expect(jsonResponse.body.overview).toEqual(mockExportData.overview);

      // Test CSV export
      const csvResponse = await request(app)
        .get('/api/analytics/export?format=csv')
        .expect(200);

      expect(csvResponse.headers['content-type']).toContain('text/csv');
      expect(csvResponse.text).toContain('Metric,Value');
    });

    it('should handle platform health monitoring', async () => {
      const mockHealthMetrics = {
        totalUsers: 1000,
        transactionSuccessRate: 95,
        activeUsers: { daily: 100, weekly: 500, monthly: 800 }
      };

      mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockHealthMetrics as any);

      const response = await request(app)
        .get('/api/analytics/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        status: 'healthy',
        uptime: expect.any(Number),
        transactionSuccessRate: 95,
        activeUsers: mockHealthMetrics.activeUsers,
        systemLoad: expect.any(Object),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service failures gracefully', async () => {
      mockAnalyticsService.getOverviewMetrics.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/analytics/overview')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve overview metrics');
      expect(response.body.message).toBe('Database connection failed');
    });

    it('should validate input parameters', async () => {
      // Test invalid UUID for seller ID
      const response = await request(app)
        .get('/api/analytics/seller/invalid-uuid')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed event tracking data', async () => {
      const response = await request(app)
        .post('/api/analytics/track/event')
        .send({
          userId: 'invalid-uuid',
          eventType: 'page_view'
          // Missing required fields
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid date ranges', async () => {
      const response = await request(app)
        .get('/api/analytics/overview?startDate=invalid-date&endDate=2024-01-31')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle unknown report types', async () => {
      mockAnalyticsService.generateReport.mockRejectedValue(
        new Error('Unknown report type: invalid_type')
      );

      const response = await request(app)
        .post('/api/analytics/report')
        .send({
          reportType: 'invalid_type',
          parameters: {}
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockAnalyticsService.getOverviewMetrics.mockResolvedValue({
        totalUsers: 1000,
        totalOrders: 200
      } as any);

      // Make multiple concurrent requests
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/analytics/overview')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Service should be called for each request (no caching at controller level)
      expect(mockAnalyticsService.getOverviewMetrics).toHaveBeenCalledTimes(10);
    });

    it('should handle large data exports', async () => {
      // Mock large dataset
      const largeSalesData = {
        dailySales: Array(365).fill(null).map((_, i) => ({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          sales: Math.random() * 10000,
          orders: Math.floor(Math.random() * 100),
          gmv: Math.random() * 10000
        }))
      };

      mockAnalyticsService.getOverviewMetrics.mockResolvedValue({ totalUsers: 1000 } as any);
      mockAnalyticsService.getSalesAnalytics.mockResolvedValue(largeSalesData as any);
      mockAnalyticsService.getUserBehaviorData.mockResolvedValue({ pageViews: 10000 } as any);

      const response = await request(app)
        .get('/api/analytics/export?format=json')
        .expect(200);

      expect(response.body.sales.dailySales).toHaveLength(365);
    });
  });

  describe('Real-time Features', () => {
    it('should track events in real-time', async () => {
      mockAnalyticsService.trackUserEvent.mockResolvedValue();

      // Simulate rapid event tracking
      const events = [
        { eventType: 'page_view', eventData: { page: '/home' } },
        { eventType: 'product_view', eventData: { productId: 'prod-1' } },
        { eventType: 'add_to_cart', eventData: { productId: 'prod-1', quantity: 1 } },
        { eventType: 'checkout_start', eventData: { cartValue: 100 } },
        { eventType: 'purchase', eventData: { orderId: 'order-123', amount: 100 } }
      ];

      const trackingPromises = events.map(event =>
        request(app)
          .post('/api/analytics/track/event')
          .send({
            userId: 'user-123',
            sessionId: 'session-456',
            ...event
          })
      );

      const responses = await Promise.all(trackingPromises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledTimes(5);
    });

    it('should provide real-time dashboard updates', async () => {
      const mockRealTimeData = {
        activeUsers: 150,
        currentTransactions: 25,
        systemLoad: 45,
        responseTime: 120,
        errorRate: 0.5,
        throughput: 50.5
      };

      mockAnalyticsService.getOverviewMetrics.mockResolvedValue({
        transactionSuccessRate: 95,
        activeUsers: { daily: 150, weekly: 800, monthly: 2000 }
      } as any);
      mockAnalyticsService.detectAnomalies.mockResolvedValue([]);
      mockAnalyticsService.getUserBehaviorData.mockResolvedValue({
        deviceBreakdown: { mobile: 60, desktop: 40, tablet: 0 }
      } as any);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lastUpdated).toBeDefined();
      expect(new Date(response.body.data.lastUpdated)).toBeInstanceOf(Date);
    });
  });
});