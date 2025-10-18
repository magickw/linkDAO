import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import AnalyticsDashboard from '../AnalyticsDashboard';

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Pie: ({ data, options }: any) => (
    <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)} />
  ),
}));

// Mock analytics hook
jest.mock('../../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    userMetrics: {
      totalUsers: 1000,
      activeUsers: 750,
      newUsers: 50,
      retentionRate: 0.85
    },
    contentMetrics: {
      totalPosts: 5000,
      postsToday: 120,
      engagementRate: 0.65
    },
    systemMetrics: {
      uptime: 0.999,
      responseTime: 150,
      errorRate: 0.001
    },
    loading: false,
    error: null,
    refreshAnalytics: jest.fn()
  })
}));

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders analytics dashboard with metrics', () => {
    render(<AnalyticsDashboard />);
    
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument(); // Total users
    expect(screen.getByText('750')).toBeInTheDocument(); // Active users
    expect(screen.getByText('50')).toBeInTheDocument(); // New users
  });

  it('displays user metrics section', () => {
    render(<AnalyticsDashboard />);
    
    expect(screen.getByText('User Metrics')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // Retention rate
  });

  it('shows content metrics', () => {
    render(<AnalyticsDashboard />);
    
    expect(screen.getByText('Content Metrics')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument(); // Total posts
    expect(screen.getByText('120')).toBeInTheDocument(); // Posts today
    expect(screen.getByText('65%')).toBeInTheDocument(); // Engagement rate
  });

  it('displays system metrics', () => {
    render(<AnalyticsDashboard />);
    
    expect(screen.getByText('System Metrics')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument(); // Uptime
    expect(screen.getByText('150ms')).toBeInTheDocument(); // Response time
    expect(screen.getByText('0.1%')).toBeInTheDocument(); // Error rate
  });

  it('renders charts', () => {
    render(<AnalyticsDashboard />);
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('handles time range selection', async () => {
    render(<AnalyticsDashboard />);
    
    const timeRangeSelect = screen.getByRole('combobox', { name: /time range/i });
    fireEvent.change(timeRangeSelect, { target: { value: '7d' } });
    
    await waitFor(() => {
      expect(timeRangeSelect).toHaveValue('7d');
    });
  });

  it('handles metric type filtering', async () => {
    render(<AnalyticsDashboard />);
    
    const metricFilter = screen.getByRole('button', { name: /filter metrics/i });
    fireEvent.click(metricFilter);
    
    const userMetricsOption = screen.getByRole('checkbox', { name: /user metrics/i });
    fireEvent.click(userMetricsOption);
    
    await waitFor(() => {
      expect(userMetricsOption).toBeChecked();
    });
  });

  it('displays loading state', () => {
    jest.mocked(require('../../../hooks/useAnalytics').useAnalytics).mockReturnValue({
      userMetrics: {},
      contentMetrics: {},
      systemMetrics: {},
      loading: true,
      error: null,
      refreshAnalytics: jest.fn()
    });

    render(<AnalyticsDashboard />);
    
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    jest.mocked(require('../../../hooks/useAnalytics').useAnalytics).mockReturnValue({
      userMetrics: {},
      contentMetrics: {},
      systemMetrics: {},
      loading: false,
      error: 'Failed to load analytics',
      refreshAnalytics: jest.fn()
    });

    render(<AnalyticsDashboard />);
    
    expect(screen.getByText('Error: Failed to load analytics')).toBeInTheDocument();
  });

  it('handles refresh action', async () => {
    const mockRefresh = jest.fn();
    jest.mocked(require('../../../hooks/useAnalytics').useAnalytics).mockReturnValue({
      userMetrics: {},
      contentMetrics: {},
      systemMetrics: {},
      loading: false,
      error: null,
      refreshAnalytics: mockRefresh
    });

    render(<AnalyticsDashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});