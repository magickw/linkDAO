import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { useAnalytics } from '../../../hooks/useAnalytics';

// Mock the useAnalytics hook
vi.mock('../../../hooks/useAnalytics');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => <div data-testid="line-chart">{JSON.stringify(data)}</div>,
  Bar: ({ data }: any) => <div data-testid="bar-chart">{JSON.stringify(data)}</div>,
  Doughnut: ({ data }: any) => <div data-testid="doughnut-chart">{JSON.stringify(data)}</div>,
  Pie: ({ data }: any) => <div data-testid="pie-chart">{JSON.stringify(data)}</div>
}));

const mockAnalyticsData = {
  overviewMetrics: {
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
    },
    revenueGrowth: 15,
    userGrowth: 10,
    orderGrowth: 25,
    successRateChange: 2
  },
  salesAnalytics: {
    dailySales: [
      { date: '2024-01-01', sales: 1000, orders: 10, gmv: 1000 },
      { date: '2024-01-02', sales: 1200, orders: 12, gmv: 1200 }
    ],
    topProducts: [
      { productId: 'prod-1', title: 'Product 1', sales: 500, revenue: 500, units: 10 },
      { productId: 'prod-2', title: 'Product 2', sales: 300, revenue: 300, units: 6 }
    ],
    topCategories: [
      { category: 'Electronics', sales: 2000, revenue: 2000, growth: 15 }
    ],
    revenueByPaymentMethod: [
      { method: 'ETH', revenue: 30000, percentage: 60 },
      { method: 'USDC', revenue: 20000, percentage: 40 }
    ],
    customerSegments: [
      { segment: 'Premium', revenue: 40000, count: 100, ltv: 400 }
    ]
  },
  userBehavior: {
    pageViews: 10000,
    sessionDuration: 300,
    bounceRate: 25,
    topPages: [
      { page: '/products', views: 5000, conversionRate: 15 }
    ],
    userJourney: [
      { step: 'Landing', users: 1000, dropoffRate: 10 },
      { step: 'Product View', users: 900, dropoffRate: 15 }
    ],
    deviceBreakdown: { mobile: 60, desktop: 35, tablet: 5 },
    geographicDistribution: [
      { country: 'US', users: 500, revenue: 25000 }
    ]
  },
  marketTrends: {
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
  },
  anomalies: [
    {
      id: 'anomaly-1',
      type: 'warning',
      message: 'Unusual transaction volume detected',
      timestamp: new Date(),
      severity: 'medium' as const
    }
  ],
  realTimeStats: {
    activeUsers: 150,
    currentTransactions: 25,
    systemLoad: 45,
    responseTime: 120,
    errorRate: 0.5,
    throughput: 50.5,
    lastUpdated: new Date().toISOString()
  },
  isLoading: false,
  error: null,
  refetch: vi.fn()
};

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.mocked(useAnalytics).mockReturnValue(mockAnalyticsData);
  });

  it('renders dashboard with overview metrics', () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByText('Platform Analytics')).toBeInTheDocument();
    expect(screen.getByText('Real-time insights and performance metrics')).toBeInTheDocument();
    
    // Check for tab navigation
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Trends')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    vi.mocked(useAnalytics).mockReturnValue({
      ...mockAnalyticsData,
      isLoading: true,
      overviewMetrics: null
    });

    render(<AnalyticsDashboard />);

    // Should show loading skeletons
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    vi.mocked(useAnalytics).mockReturnValue({
      ...mockAnalyticsData,
      error: 'Failed to load analytics data',
      overviewMetrics: null
    });

    render(<AnalyticsDashboard />);

    expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
    expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('handles retry button click', async () => {
    const mockRefetch = vi.fn();
    vi.mocked(useAnalytics).mockReturnValue({
      ...mockAnalyticsData,
      error: 'Network error',
      overviewMetrics: null,
      refetch: mockRefetch
    });

    render(<AnalyticsDashboard />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('switches between tabs correctly', async () => {
    render(<AnalyticsDashboard />);

    // Initially on Overview tab
    expect(screen.getByText('Total Revenue (GMV)')).toBeInTheDocument();

    // Switch to Sales tab
    fireEvent.click(screen.getByText('Sales'));
    await waitFor(() => {
      expect(screen.getByText('Top Products')).toBeInTheDocument();
    });

    // Switch to Users tab
    fireEvent.click(screen.getByText('Users'));
    await waitFor(() => {
      expect(screen.getByText('User Journey')).toBeInTheDocument();
    });

    // Switch to Trends tab
    fireEvent.click(screen.getByText('Trends'));
    await waitFor(() => {
      expect(screen.getByText('Trending Categories')).toBeInTheDocument();
    });
  });

  it('displays metrics cards with correct values', () => {
    render(<AnalyticsDashboard />);

    // Check for formatted values
    expect(screen.getByText('$50,000.00')).toBeInTheDocument(); // GMV
    expect(screen.getByText('1,000')).toBeInTheDocument(); // Total Users
    expect(screen.getByText('200')).toBeInTheDocument(); // Total Orders
    expect(screen.getByText('95%')).toBeInTheDocument(); // Success Rate
  });

  it('shows real-time metrics', () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByText('Real-Time Metrics')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument(); // Active Users
    expect(screen.getByText('25')).toBeInTheDocument(); // Current Transactions
    expect(screen.getByText('45%')).toBeInTheDocument(); // System Load
  });

  it('displays anomaly alerts when present', () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByText('Anomaly Detection')).toBeInTheDocument();
    expect(screen.getByText('Unusual transaction volume detected')).toBeInTheDocument();
  });

  it('handles refresh interval changes', () => {
    render(<AnalyticsDashboard />);

    const refreshSelect = screen.getByDisplayValue('30s');
    fireEvent.change(refreshSelect, { target: { value: '60000' } });

    expect(refreshSelect).toHaveValue('60000');
  });

  it('handles manual refresh', () => {
    const mockRefetch = vi.fn();
    vi.mocked(useAnalytics).mockReturnValue({
      ...mockAnalyticsData,
      refetch: mockRefetch
    });

    render(<AnalyticsDashboard />);

    const refreshButton = screen.getByText('↻ Refresh');
    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders seller analytics when sellerId is provided', () => {
    const sellerId = 'seller-123';
    render(<AnalyticsDashboard sellerId={sellerId} />);

    expect(screen.getByText('Seller Analytics')).toBeInTheDocument();
  });

  it('displays charts in overview tab', () => {
    render(<AnalyticsDashboard />);

    // Should render charts (mocked components)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows top products table in sales tab', async () => {
    render(<AnalyticsDashboard />);

    fireEvent.click(screen.getByText('Sales'));

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });
  });

  it('displays user journey in users tab', async () => {
    render(<AnalyticsDashboard />);

    fireEvent.click(screen.getByText('Users'));

    await waitFor(() => {
      expect(screen.getByText('Landing')).toBeInTheDocument();
      expect(screen.getByText('Product View')).toBeInTheDocument();
      expect(screen.getByText('10% dropoff')).toBeInTheDocument();
    });
  });

  it('shows trending categories in trends tab', async () => {
    render(<AnalyticsDashboard />);

    fireEvent.click(screen.getByText('Trends'));

    await waitFor(() => {
      expect(screen.getByText('NFTs')).toBeInTheDocument();
      expect(screen.getByText('+50%')).toBeInTheDocument();
    });
  });

  it('handles date range prop', () => {
    const dateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    render(<AnalyticsDashboard dateRange={dateRange} />);

    expect(useAnalytics).toHaveBeenCalledWith({
      sellerId: undefined,
      dateRange,
      refreshInterval: 30000
    });
  });

  it('displays active users breakdown', () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // Daily
    expect(screen.getByText('500')).toBeInTheDocument(); // Weekly
    expect(screen.getByText('800')).toBeInTheDocument(); // Monthly
  });

  it('shows conversion metrics', () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByText('Conversion Metrics')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument(); // Conversion Rate
    expect(screen.getByText('$250.00')).toBeInTheDocument(); // Avg Order Value
  });

  it('displays platform health indicators', () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByText('Platform Health')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument(); // Uptime
    expect(screen.getByText('150ms')).toBeInTheDocument(); // Response Time
  });
});