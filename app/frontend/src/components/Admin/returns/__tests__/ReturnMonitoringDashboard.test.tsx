import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReturnMonitoringDashboard } from '../ReturnMonitoringDashboard';
import { returnAnalyticsService } from '../../../../services/returnAnalyticsService';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the service
jest.mock('../../../../services/returnAnalyticsService');

// Mock child components
jest.mock('../ReturnMetricsCards', () => ({
  ReturnMetricsCards: jest.fn(({ metrics, isLoading }: any) => {
    return React.createElement('div', { 'data-testid': 'return-metrics-cards' },
      isLoading ? 'Loading metrics...' : `Metrics: ${metrics?.activeReturns || 0}`
    );
  }),
}));

jest.mock('../StatusDistributionChart', () => ({
  StatusDistributionChart: jest.fn(({ data, isLoading }: any) => {
    return React.createElement('div', { 'data-testid': 'status-distribution-chart' },
      isLoading ? 'Loading chart...' : `Chart data: ${Object.keys(data || {}).length} statuses`
    );
  }),
}));

jest.mock('../ReturnTrendsChart', () => ({
  ReturnTrendsChart: jest.fn(({ data, isLoading }: any) => {
    return React.createElement('div', { 'data-testid': 'return-trends-chart' },
      isLoading ? 'Loading trends...' : `Trends: ${data?.length || 0} days`
    );
  }),
}));

jest.mock('../RecentReturnsTable', () => ({
  RecentReturnsTable: jest.fn(({ events, isLoading }: any) => {
    return React.createElement('div', { 'data-testid': 'recent-returns-table' },
      isLoading ? 'Loading table...' : `Events: ${events?.length || 0}`
    );
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: jest.fn(({ children, ...props }: any) => {
      return React.createElement('div', props, children);
    }),
  },
}));

describe('ReturnMonitoringDashboard', () => {
  const mockRealtimeMetrics = {
    timestamp: '2024-01-15T10:00:00Z',
    activeReturns: 45,
    pendingApproval: 12,
    pendingRefund: 8,
    inTransitReturns: 15,
    returnsPerMinute: 2.5,
    approvalsPerMinute: 1.2,
    refundsPerMinute: 0.8,
    manualReviewQueueDepth: 5,
    refundProcessingQueueDepth: 3,
    inspectionQueueDepth: 7,
    volumeSpikeDetected: false,
  };

  const mockAnalytics = {
    metrics: {
      totalReturns: 150,
      approvedReturns: 120,
      rejectedReturns: 20,
      completedReturns: 100,
      pendingReturns: 30,
      cancelledReturns: 10,
      statusDistribution: {
        requested: 30,
        approved: 120,
        rejected: 20,
      },
    },
    financial: {
      totalRefundAmount: 50000,
      averageRefundAmount: 500,
      maxRefundAmount: 2000,
      minRefundAmount: 50,
      totalRestockingFees: 1000,
      totalShippingCosts: 500,
      netRefundImpact: 48500,
    },
    processingTime: {
      averageApprovalTime: 24,
      averageRefundTime: 48,
      averageTotalResolutionTime: 72,
      medianApprovalTime: 20,
      p95ApprovalTime: 48,
      p99ApprovalTime: 72,
    },
    risk: {
      highRiskReturns: 5,
      mediumRiskReturns: 15,
      lowRiskReturns: 130,
      flaggedForReview: 10,
      fraudDetected: 2,
      averageRiskScore: 25,
    },
    topReturnReasons: [
      { reason: 'Defective', count: 50, percentage: 33.3 },
      { reason: 'Wrong item', count: 30, percentage: 20 },
    ],
    returnsByDay: [
      { date: '2024-01-01', count: 10 },
      { date: '2024-01-02', count: 15 },
    ],
    returnRate: 5.5,
    customerSatisfaction: 4.2,
    returnTrends: {
      monthOverMonth: 10,
      weeklyTrend: [
        { week: 'Week 1', returns: 30, refunds: 25 },
        { week: 'Week 2', returns: 35, refunds: 30 },
      ],
    },
  };

  const mockStatusDistribution = {
    requested: 30,
    approved: 120,
    rejected: 20,
    in_transit: 15,
    received: 10,
    completed: 100,
    cancelled: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default mocks
    (returnAnalyticsService.getRealtimeMetrics as jest.Mock).mockResolvedValue(mockRealtimeMetrics);
    (returnAnalyticsService.getAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);
    (returnAnalyticsService.getStatusDistribution as jest.Mock).mockResolvedValue(mockStatusDistribution);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('should render the dashboard with header', async () => {
      render(<ReturnMonitoringDashboard />);

      expect(screen.getByText('Return Monitoring Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Real-time monitoring and analytics for return operations')).toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      render(<ReturnMonitoringDashboard />);

      expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
      expect(screen.getByText('Loading trends...')).toBeInTheDocument();
    });

    it('should fetch initial data on mount', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getRealtimeMetrics).toHaveBeenCalledTimes(1);
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(1);
        expect(returnAnalyticsService.getStatusDistribution).toHaveBeenCalledTimes(1);
      });
    });

    it('should display data after loading', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Metrics: 45/)).toBeInTheDocument();
        expect(screen.getByText(/Chart data: 7 statuses/)).toBeInTheDocument();
        expect(screen.getByText(/Trends: 2 days/)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update metrics every 30 seconds', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getRealtimeMetrics).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(returnAnalyticsService.getRealtimeMetrics).toHaveBeenCalledTimes(2);
      });

      // Fast-forward another 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(returnAnalyticsService.getRealtimeMetrics).toHaveBeenCalledTimes(3);
      });
    });

    it('should display last update timestamp', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });

    it('should cleanup interval on unmount', async () => {
      const { unmount } = render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getRealtimeMetrics).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Fast-forward time after unmount
      jest.advanceTimersByTime(30000);

      // Should not call again after unmount
      expect(returnAnalyticsService.getRealtimeMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('Refresh Functionality', () => {
    it('should have a refresh button', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });

    it('should refresh data when refresh button is clicked', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getRealtimeMetrics).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(returnAnalyticsService.getRealtimeMetrics).toHaveBeenCalledTimes(2);
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(2);
      });
    });

    it('should show refreshing state during refresh', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      expect(screen.getByText('Refreshing...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });

    it('should disable refresh button while refreshing', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh') as HTMLButtonElement;
      fireEvent.click(refreshButton);

      expect(refreshButton.closest('button')).toBeDisabled();

      await waitFor(() => {
        expect(refreshButton.closest('button')).not.toBeDisabled();
      });
    });
  });

  describe('Filter Functionality', () => {
    it('should render date range filters', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        const dateInputs = screen.getAllByDisplayValue(/2024/);
        expect(dateInputs.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should render status filter', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
      });
    });

    it('should update analytics when date range changes', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(1);
      });

      const dateInputs = screen.getAllByDisplayValue(/2024/);
      const startDateInput = dateInputs[0];

      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(2);
      });
    });

    it('should have quick date preset buttons', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('7 Days')).toBeInTheDocument();
        expect(screen.getByText('30 Days')).toBeInTheDocument();
        expect(screen.getByText('90 Days')).toBeInTheDocument();
      });
    });

    it('should apply 7 days preset when clicked', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(1);
      });

      const sevenDaysButton = screen.getByText('7 Days');
      fireEvent.click(sevenDaysButton);

      await waitFor(() => {
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(2);
      });
    });

    it('should apply 30 days preset when clicked', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(1);
      });

      const thirtyDaysButton = screen.getByText('30 Days');
      fireEvent.click(thirtyDaysButton);

      await waitFor(() => {
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(2);
      });
    });

    it('should apply 90 days preset when clicked', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(1);
      });

      const ninetyDaysButton = screen.getByText('90 Days');
      fireEvent.click(ninetyDaysButton);

      await waitFor(() => {
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(2);
      });
    });

    it('should update status filter', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusSelect, { target: { value: 'approved' } });

      expect(screen.getByDisplayValue('Approved')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when realtime metrics fail', async () => {
      (returnAnalyticsService.getRealtimeMetrics as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch real-time metrics')).toBeInTheDocument();
      });
    });

    it('should display error message when analytics fail', async () => {
      (returnAnalyticsService.getAnalytics as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch analytics data')).toBeInTheDocument();
      });
    });

    it('should clear error on successful retry', async () => {
      (returnAnalyticsService.getRealtimeMetrics as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockRealtimeMetrics);

      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch real-time metrics')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.queryByText('Failed to fetch real-time metrics')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to ReturnMetricsCards', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        const metricsCard = screen.getByTestId('return-metrics-cards');
        expect(metricsCard).toHaveTextContent('Metrics: 45');
      });
    });

    it('should pass correct props to StatusDistributionChart', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        const chart = screen.getByTestId('status-distribution-chart');
        expect(chart).toHaveTextContent('Chart data: 7 statuses');
      });
    });

    it('should pass correct props to ReturnTrendsChart', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        const trendsChart = screen.getByTestId('return-trends-chart');
        expect(trendsChart).toHaveTextContent('Trends: 2 days');
      });
    });

    it('should pass correct props to RecentReturnsTable', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        const table = screen.getByTestId('recent-returns-table');
        expect(table).toHaveTextContent('Events: 0');
      });
    });
  });

  describe('Filter Synchronization', () => {
    it('should synchronize all visualizations when filters change', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(1);
        expect(returnAnalyticsService.getStatusDistribution).toHaveBeenCalledTimes(1);
      });

      // Change date range
      const dateInputs = screen.getAllByDisplayValue(/2024/);
      fireEvent.change(dateInputs[0], { target: { value: '2024-01-01' } });

      await waitFor(() => {
        // Both analytics and status distribution should be called again
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(2);
        expect(returnAnalyticsService.getStatusDistribution).toHaveBeenCalledTimes(2);
      });
    });

    it('should pass same date range to all API calls', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        const analyticsCall = (returnAnalyticsService.getAnalytics as jest.Mock).mock.calls[0];
        const statusCall = (returnAnalyticsService.getStatusDistribution as jest.Mock).mock.calls[0];

        expect(analyticsCall[0]).toEqual(statusCall[0]);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form labels', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Date Range/)).toBeInTheDocument();
        expect(screen.getByText(/Status/)).toBeInTheDocument();
      });
    });

    it('should have accessible buttons', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh').closest('button');
        expect(refreshButton).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not refetch analytics during initial load', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(1);
      });

      // Should not call again immediately
      expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(1);
    });

    it('should batch API calls on refresh', async () => {
      render(<ReturnMonitoringDashboard />);

      await waitFor(() => {
        expect(returnAnalyticsService.getRealtimeMetrics).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        // Should call both APIs in parallel
        expect(returnAnalyticsService.getRealtimeMetrics).toHaveBeenCalledTimes(2);
        expect(returnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(2);
      });
    });
  });
});
