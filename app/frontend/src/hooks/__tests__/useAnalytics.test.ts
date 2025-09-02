import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAnalytics } from '../useAnalytics';
import { analyticsService } from '../../services/analyticsService';

// Mock the analytics service
vi.mock('../../services/analyticsService');

describe('useAnalytics', () => {
  const mockAnalyticsService = vi.mocked(analyticsService);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
    topCategories: [],
    revenueByPaymentMethod: [],
    customerSegments: []
  };

  const mockUserBehavior = {
    pageViews: 10000,
    sessionDuration: 300,
    bounceRate: 25,
    topPages: [],
    userJourney: [],
    deviceBreakdown: { mobile: 60, desktop: 35, tablet: 5 },
    geographicDistribution: []
  };

  const mockMarketTrends = {
    trending: [],
    seasonal: [],
    priceAnalysis: [],
    demandForecast: []
  };

  const mockAnomalies = [
    {
      id: 'anomaly-1',
      type: 'warning',
      severity: 'medium' as const,
      description: 'Test anomaly',
      affectedEntity: 'system',
      detectionTime: new Date(),
      confidence: 0.8,
      suggestedActions: []
    }
  ];

  const mockRealTimeStats = {
    activeUsers: 150,
    currentTransactions: 25,
    systemLoad: 45,
    responseTime: 120,
    errorRate: 0.5,
    throughput: 50.5,
    lastUpdated: new Date().toISOString()
  };

  it('fetches analytics data on mount', async () => {
    mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);
    mockAnalyticsService.detectAnomalies.mockResolvedValue(mockAnomalies);
    mockAnalyticsService.getRealTimeStats.mockResolvedValue(mockRealTimeStats);
    mockAnalyticsService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);
    mockAnalyticsService.getUserBehaviorAnalytics.mockResolvedValue(mockUserBehavior);
    mockAnalyticsService.getMarketTrends.mockResolvedValue(mockMarketTrends);

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.overviewMetrics).toEqual(mockOverviewMetrics);
    expect(result.current.salesAnalytics).toEqual(mockSalesAnalytics);
    expect(result.current.userBehavior).toEqual(mockUserBehavior);
    expect(result.current.marketTrends).toEqual(mockMarketTrends);
    expect(result.current.anomalies).toEqual(mockAnomalies);
    expect(result.current.realTimeStats).toEqual(mockRealTimeStats);
    expect(result.current.error).toBeNull();
  });

  it('handles seller-specific analytics', async () => {
    const sellerId = 'seller-123';
    const mockSellerAnalytics = {
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
      topProducts: [],
      customerInsights: {
        demographics: {},
        preferences: {},
        behavior: {}
      }
    };

    mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);
    mockAnalyticsService.detectAnomalies.mockResolvedValue(mockAnomalies);
    mockAnalyticsService.getRealTimeStats.mockResolvedValue(mockRealTimeStats);
    mockAnalyticsService.getSellerAnalytics.mockResolvedValue(mockSellerAnalytics);
    mockAnalyticsService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);
    mockAnalyticsService.getUserBehaviorAnalytics.mockResolvedValue(mockUserBehavior);

    const { result } = renderHook(() => useAnalytics({ sellerId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAnalyticsService.getSellerAnalytics).toHaveBeenCalledWith(
      sellerId,
      undefined,
      undefined
    );
    expect(result.current.sellerAnalytics).toEqual(mockSellerAnalytics);
  });

  it('handles date range filtering', async () => {
    const dateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);
    mockAnalyticsService.detectAnomalies.mockResolvedValue(mockAnomalies);
    mockAnalyticsService.getRealTimeStats.mockResolvedValue(mockRealTimeStats);
    mockAnalyticsService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);
    mockAnalyticsService.getUserBehaviorAnalytics.mockResolvedValue(mockUserBehavior);
    mockAnalyticsService.getMarketTrends.mockResolvedValue(mockMarketTrends);

    renderHook(() => useAnalytics({ dateRange }));

    await waitFor(() => {
      expect(mockAnalyticsService.getOverviewMetrics).toHaveBeenCalledWith(
        dateRange.startDate,
        dateRange.endDate
      );
      expect(mockAnalyticsService.getSalesAnalytics).toHaveBeenCalledWith(
        dateRange.startDate,
        dateRange.endDate
      );
      expect(mockAnalyticsService.getUserBehaviorAnalytics).toHaveBeenCalledWith(
        dateRange.startDate,
        dateRange.endDate
      );
    });
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'API Error';
    mockAnalyticsService.getOverviewMetrics.mockRejectedValue(new Error(errorMessage));
    mockAnalyticsService.detectAnomalies.mockResolvedValue([]);
    mockAnalyticsService.getRealTimeStats.mockResolvedValue(mockRealTimeStats);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.overviewMetrics).toBeNull();
  });

  it('handles partial failures gracefully', async () => {
    mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);
    mockAnalyticsService.detectAnomalies.mockResolvedValue(mockAnomalies);
    mockAnalyticsService.getRealTimeStats.mockResolvedValue(mockRealTimeStats);
    mockAnalyticsService.getSalesAnalytics.mockRejectedValue(new Error('Sales API failed'));
    mockAnalyticsService.getUserBehaviorAnalytics.mockResolvedValue(mockUserBehavior);
    mockAnalyticsService.getMarketTrends.mockResolvedValue(mockMarketTrends);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.overviewMetrics).toEqual(mockOverviewMetrics);
    expect(result.current.salesAnalytics).toBeNull();
    expect(result.current.userBehavior).toEqual(mockUserBehavior);
    expect(result.current.error).toBeNull();
  });

  it('auto-refreshes data at specified intervals', async () => {
    mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);
    mockAnalyticsService.detectAnomalies.mockResolvedValue(mockAnomalies);
    mockAnalyticsService.getRealTimeStats.mockResolvedValue(mockRealTimeStats);
    mockAnalyticsService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);
    mockAnalyticsService.getUserBehaviorAnalytics.mockResolvedValue(mockUserBehavior);
    mockAnalyticsService.getMarketTrends.mockResolvedValue(mockMarketTrends);

    const refreshInterval = 10000; // 10 seconds
    renderHook(() => useAnalytics({ refreshInterval }));

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockAnalyticsService.getOverviewMetrics).toHaveBeenCalledTimes(1);
    });

    // Advance timer and check for refresh
    vi.advanceTimersByTime(refreshInterval);

    await waitFor(() => {
      expect(mockAnalyticsService.getOverviewMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('disables auto-refresh when autoRefresh is false', async () => {
    mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);
    mockAnalyticsService.detectAnomalies.mockResolvedValue(mockAnomalies);
    mockAnalyticsService.getRealTimeStats.mockResolvedValue(mockRealTimeStats);
    mockAnalyticsService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);
    mockAnalyticsService.getUserBehaviorAnalytics.mockResolvedValue(mockUserBehavior);
    mockAnalyticsService.getMarketTrends.mockResolvedValue(mockMarketTrends);

    renderHook(() => useAnalytics({ autoRefresh: false }));

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockAnalyticsService.getOverviewMetrics).toHaveBeenCalledTimes(1);
    });

    // Advance timer - should not trigger refresh
    vi.advanceTimersByTime(30000);

    expect(mockAnalyticsService.getOverviewMetrics).toHaveBeenCalledTimes(1);
  });

  it('provides refetch function', async () => {
    mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);
    mockAnalyticsService.detectAnomalies.mockResolvedValue(mockAnomalies);
    mockAnalyticsService.getRealTimeStats.mockResolvedValue(mockRealTimeStats);
    mockAnalyticsService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);
    mockAnalyticsService.getUserBehaviorAnalytics.mockResolvedValue(mockUserBehavior);
    mockAnalyticsService.getMarketTrends.mockResolvedValue(mockMarketTrends);

    const { result } = renderHook(() => useAnalytics({ autoRefresh: false }));

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockAnalyticsService.getOverviewMetrics).toHaveBeenCalledTimes(1);
    });

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockAnalyticsService.getOverviewMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('tracks user events', async () => {
    mockAnalyticsService.trackUserEvent.mockResolvedValue();

    const { result } = renderHook(() => useAnalytics());

    await result.current.trackEvent('page_view', { page: '/products' });

    expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
      'page_view',
      { page: '/products' },
      undefined
    );
  });

  it('tracks transactions', async () => {
    mockAnalyticsService.trackTransaction.mockResolvedValue();

    const { result } = renderHook(() => useAnalytics());

    const transactionData = {
      transactionId: 'tx-123',
      orderId: 'order-456',
      type: 'purchase',
      amount: 100,
      currency: 'ETH',
      status: 'completed'
    };

    await result.current.trackTransaction(transactionData);

    expect(mockAnalyticsService.trackTransaction).toHaveBeenCalledWith(transactionData);
  });

  it('generates custom reports', async () => {
    const mockReport = { totalSales: 10000 };
    mockAnalyticsService.generateReport.mockResolvedValue(mockReport);

    const { result } = renderHook(() => useAnalytics());

    const report = await result.current.generateReport('sales', { startDate: '2024-01-01' });

    expect(mockAnalyticsService.generateReport).toHaveBeenCalledWith(
      'sales',
      { startDate: '2024-01-01' }
    );
    expect(report).toEqual(mockReport);
  });

  it('exports analytics data', async () => {
    const mockExportData = { data: 'exported' };
    mockAnalyticsService.exportAnalytics.mockResolvedValue(mockExportData);

    // Mock DOM methods
    const mockCreateElement = vi.fn(() => ({
      href: '',
      download: '',
      click: vi.fn(),
      style: { display: '' }
    }));
    const mockCreateObjectURL = vi.fn(() => 'blob:url');
    const mockRevokeObjectURL = vi.fn();

    Object.defineProperty(document, 'createElement', { value: mockCreateElement });
    Object.defineProperty(document.body, 'appendChild', { value: vi.fn() });
    Object.defineProperty(document.body, 'removeChild', { value: vi.fn() });
    Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

    const { result } = renderHook(() => useAnalytics());

    const dateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    await result.current.exportData('json', dateRange);

    expect(mockAnalyticsService.exportAnalytics).toHaveBeenCalledWith(
      dateRange.startDate,
      dateRange.endDate,
      'json'
    );
  });

  it('calculates stale status correctly', async () => {
    mockAnalyticsService.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);
    mockAnalyticsService.detectAnomalies.mockResolvedValue([]);
    mockAnalyticsService.getRealTimeStats.mockResolvedValue(mockRealTimeStats);

    const refreshInterval = 10000;
    const { result } = renderHook(() => useAnalytics({ refreshInterval }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initially not stale
    expect(result.current.isStale).toBe(false);

    // Advance time beyond stale threshold
    vi.advanceTimersByTime(refreshInterval * 3);

    expect(result.current.isStale).toBe(true);
  });

  it('handles error in event tracking', async () => {
    mockAnalyticsService.trackUserEvent.mockRejectedValue(new Error('Tracking failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAnalytics());

    await result.current.trackEvent('page_view', { page: '/products' });

    expect(consoleSpy).toHaveBeenCalledWith('Error tracking event:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('handles error in transaction tracking', async () => {
    mockAnalyticsService.trackTransaction.mockRejectedValue(new Error('Tracking failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAnalytics());

    await result.current.trackTransaction({
      transactionId: 'tx-123',
      orderId: 'order-456',
      type: 'purchase',
      amount: 100,
      currency: 'ETH',
      status: 'completed'
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error tracking transaction:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});