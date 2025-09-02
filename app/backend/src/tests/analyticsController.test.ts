import request from 'supertest';
import express from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { analyticsService } from '../services/analyticsService';

// Mock the analytics service
jest.mock('../services/analyticsService');

const app = express();
app.use(express.json());

// Setup routes
app.get('/analytics/overview', analyticsController.getOverviewMetrics.bind(analyticsController));
app.get('/analytics/user-behavior', analyticsController.getUserBehaviorAnalytics.bind(analyticsController));
app.get('/analytics/sales', analyticsController.getSalesAnalytics.bind(analyticsController));
app.get('/analytics/seller/:sellerId', analyticsController.getSellerAnalytics.bind(analyticsController));
app.get('/analytics/market-trends', analyticsController.getMarketTrends.bind(analyticsController));
app.get('/analytics/anomalies', analyticsController.getAnomalyAlerts.bind(analyticsController));
app.get('/analytics/dashboard', analyticsController.getRealTimeDashboard.bind(analyticsController));
app.get('/analytics/health', analyticsController.getPlatformHealth.bind(analyticsController));
app.post('/analytics/track/event', analyticsController.trackUserEvent.bind(analyticsController));
app.post('/analytics/track/transaction', analyticsController.trackTransaction.bind(analyticsController));
app.post('/analytics/report', analyticsController.generateReport.bind(analyticsController));
app.get('/analytics/export', analyticsController.exportAnalytics.bind(analyticsController));

describe('AnalyticsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /analytics/overview', () => {
    it('should return overview metrics successfully', async () => {
      const mockMetrics = {
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

      (analyticsService.getOverviewMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/analytics/overview')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics,
        timestamp: expect.any(String)
      });

      expect(analyticsService.getOverviewMetrics).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should handle date range parameters', async () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';
      
      (analyticsService.getOverviewMetrics as jest.Mock).mockResolvedValue({} as any);

      await request(app)
        .get(`/analytics/overview?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(analyticsService.getOverviewMetrics).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate)
      );
    });

    it('should handle service errors', async () => {
      (analyticsService.getOverviewMetrics as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/analytics/overview')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve overview metrics',
        message: 'Database connection failed'
      });
    });
  });

  describe('GET /analytics/user-behavior', () => {
    it('should return user behavior analytics', async () => {
      const mockBehaviorData = {
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

      (analyticsService.getUserBehaviorData as jest.Mock).mockResolvedValue(mockBehaviorData);

      const response = await request(app)
        .get('/analytics/user-behavior')
        .expect(200);

      expect(response.body.data).toEqual(mockBehaviorData);
    });
  });

  describe('GET /analytics/sales', () => {
    it('should return sales analytics', async () => {
      const mockSalesData = {
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

      (analyticsService.getSalesAnalytics as jest.Mock).mockResolvedValue(mockSalesData);

      const response = await request(app)
        .get('/analytics/sales')
        .expect(200);

      expect(response.body.data).toEqual(mockSalesData);
    });
  });

  describe('GET /analytics/seller/:sellerId', () => {
    it('should return seller-specific analytics', async () => {
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
          demographics: {},
          preferences: {},
          behavior: {}
        }
      };

      (analyticsService.getSellerAnalytics as jest.Mock).mockResolvedValue(mockSellerData);

      const response = await request(app)
        .get(`/analytics/seller/${sellerId}`)
        .expect(200);

      expect(response.body.data).toEqual(mockSellerData);
      expect(analyticsService.getSellerAnalytics).toHaveBeenCalledWith(
        sellerId,
        undefined,
        undefined
      );
    });

    it('should validate seller ID format', async () => {
      const invalidSellerId = 'invalid-id';

      const response = await request(app)
        .get(`/analytics/seller/${invalidSellerId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /analytics/market-trends', () => {
    it('should return market trends', async () => {
      const mockTrends = {
        trending: [
          { category: 'NFTs', growth: 50, volume: 1000 }
        ],
        seasonal: [
          { period: 'Q4', categories: ['Electronics'], multiplier: 1.5 }
        ],
        priceAnalysis: [
          { category: 'Art', avgPrice: 500, priceChange: 10 }
        ],
        demandForecast: [
          { category: 'Gaming', predictedDemand: 2000, confidence: 0.85 }
        ]
      };

      (analyticsService.getMarketTrends as jest.Mock).mockResolvedValue(mockTrends);

      const response = await request(app)
        .get('/analytics/market-trends')
        .expect(200);

      expect(response.body.data).toEqual(mockTrends);
    });
  });

  describe('GET /analytics/anomalies', () => {
    it('should return anomaly alerts', async () => {
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

      vi.mocked(analyticsService.detectAnomalies).mockResolvedValue(mockAnomalies);

      const response = await request(app)
        .get('/analytics/anomalies')
        .expect(200);

      expect(response.body.data).toEqual(mockAnomalies);
    });
  });

  describe('GET /analytics/dashboard', () => {
    it('should return real-time dashboard data', async () => {
      const mockOverview = { totalUsers: 1000, totalOrders: 200 };
      const mockAnomalies = [];
      const mockUserBehavior = { deviceBreakdown: { mobile: 60, desktop: 40, tablet: 0 } };

      vi.mocked(analyticsService.getOverviewMetrics).mockResolvedValue(mockOverview as any);
      vi.mocked(analyticsService.detectAnomalies).mockResolvedValue(mockAnomalies);
      vi.mocked(analyticsService.getUserBehaviorData).mockResolvedValue(mockUserBehavior as any);

      const response = await request(app)
        .get('/analytics/dashboard')
        .expect(200);

      expect(response.body.data).toEqual({
        overview: mockOverview,
        anomalies: mockAnomalies,
        activeUsers: mockUserBehavior.deviceBreakdown,
        lastUpdated: expect.any(String)
      });
    });
  });

  describe('GET /analytics/health', () => {
    it('should return platform health metrics', async () => {
      const mockMetrics = {
        totalUsers: 1000,
        transactionSuccessRate: 95,
        activeUsers: { daily: 100, weekly: 500, monthly: 800 }
      };

      vi.mocked(analyticsService.getOverviewMetrics).mockResolvedValue(mockMetrics as any);

      const response = await request(app)
        .get('/analytics/health')
        .expect(200);

      expect(response.body.data).toMatchObject({
        status: 'healthy',
        uptime: expect.any(Number),
        transactionSuccessRate: 95,
        activeUsers: { daily: 100, weekly: 500, monthly: 800 },
        systemLoad: expect.any(Object),
        timestamp: expect.any(String)
      });
    });
  });

  describe('POST /analytics/track/event', () => {
    it('should track user events successfully', async () => {
      const eventData = {
        userId: 'user-123',
        sessionId: 'session-456',
        eventType: 'page_view',
        eventData: { page: '/products' },
        metadata: {
          pageUrl: 'https://example.com/products',
          userAgent: 'Mozilla/5.0...',
          deviceType: 'desktop'
        }
      };

      vi.mocked(analyticsService.trackUserEvent).mockResolvedValue();

      const response = await request(app)
        .post('/analytics/track/event')
        .send(eventData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Event tracked successfully'
      });

      expect(analyticsService.trackUserEvent).toHaveBeenCalledWith(
        eventData.userId,
        eventData.sessionId,
        eventData.eventType,
        eventData.eventData,
        eventData.metadata
      );
    });

    it('should validate event data', async () => {
      const invalidEventData = {
        userId: 'invalid-uuid',
        eventType: 'page_view'
        // Missing required fields
      };

      const response = await request(app)
        .post('/analytics/track/event')
        .send(invalidEventData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /analytics/track/transaction', () => {
    it('should track transactions successfully', async () => {
      const transactionData = {
        transactionId: 'tx-123',
        orderId: 'order-456',
        type: 'purchase',
        amount: 100,
        currency: 'ETH',
        status: 'completed',
        transactionHash: '0x123...'
      };

      vi.mocked(analyticsService.trackTransaction).mockResolvedValue();

      const response = await request(app)
        .post('/analytics/track/transaction')
        .send(transactionData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Transaction tracked successfully'
      });

      expect(analyticsService.trackTransaction).toHaveBeenCalledWith(transactionData);
    });
  });

  describe('POST /analytics/report', () => {
    it('should generate custom reports', async () => {
      const reportRequest = {
        reportType: 'sales',
        parameters: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      };

      const mockReport = {
        totalSales: 10000,
        orderCount: 100,
        averageOrderValue: 100
      };

      vi.mocked(analyticsService.generateReport).mockResolvedValue(mockReport);

      const response = await request(app)
        .post('/analytics/report')
        .send(reportRequest)
        .expect(200);

      expect(response.body.data).toMatchObject({
        reportType: 'sales',
        generatedAt: expect.any(String),
        data: mockReport
      });
    });

    it('should validate report type', async () => {
      const invalidReportRequest = {
        reportType: 'invalid_type',
        parameters: {}
      };

      const response = await request(app)
        .post('/analytics/report')
        .send(invalidReportRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /analytics/export', () => {
    it('should export analytics data as JSON', async () => {
      const mockOverview = { totalUsers: 1000 };
      const mockSales = { dailySales: [] };
      const mockUserBehavior = { pageViews: 5000 };

      vi.mocked(analyticsService.getOverviewMetrics).mockResolvedValue(mockOverview as any);
      vi.mocked(analyticsService.getSalesAnalytics).mockResolvedValue(mockSales as any);
      vi.mocked(analyticsService.getUserBehaviorData).mockResolvedValue(mockUserBehavior as any);

      const response = await request(app)
        .get('/analytics/export?format=json')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toMatchObject({
        exportedAt: expect.any(String),
        overview: mockOverview,
        sales: mockSales,
        userBehavior: mockUserBehavior
      });
    });

    it('should export analytics data as CSV', async () => {
      const mockOverview = {
        totalUsers: 1000,
        totalOrders: 200,
        totalRevenue: 50000,
        conversionRate: 20,
        transactionSuccessRate: 95
      };

      vi.mocked(analyticsService.getOverviewMetrics).mockResolvedValue(mockOverview as any);
      vi.mocked(analyticsService.getSalesAnalytics).mockResolvedValue({} as any);
      vi.mocked(analyticsService.getUserBehaviorData).mockResolvedValue({} as any);

      const response = await request(app)
        .get('/analytics/export?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Metric,Value');
      expect(response.text).toContain('Total Users,1000');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const response = await request(app)
        .get('/analytics/overview?startDate=invalid-date')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle service unavailable errors', async () => {
      vi.mocked(analyticsService.getOverviewMetrics).mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const response = await request(app)
        .get('/analytics/overview')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve overview metrics',
        message: 'Service temporarily unavailable'
      });
    });

    it('should handle unknown errors gracefully', async () => {
      vi.mocked(analyticsService.getOverviewMetrics).mockRejectedValue('Unknown error');

      const response = await request(app)
        .get('/analytics/overview')
        .expect(500);

      expect(response.body.message).toBe('Unknown error');
    });
  });
});