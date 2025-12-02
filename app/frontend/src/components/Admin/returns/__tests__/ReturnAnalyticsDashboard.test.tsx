import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ReturnAnalyticsDashboard } from '../ReturnAnalyticsDashboard';
import { returnAnalyticsService } from '../../../../services/returnAnalyticsService';

// Mock the service
jest.mock('../../../../services/returnAnalyticsService');

const mockAnalytics = {
  metrics: {
    totalReturns: 448,
    approvedReturns: 402,
    rejectedReturns: 46,
    completedReturns: 380,
    pendingReturns: 22,
    cancelledReturns: 0,
    statusDistribution: {},
  },
  financial: {
    totalRefundAmount: 125000,
    averageRefundAmount: 279.02,
    maxRefundAmount: 1500,
    minRefundAmount: 10,
    totalRestockingFees: 2500,
    totalShippingCosts: 3200,
    netRefundImpact: 119300,
  },
  processingTime: {
    averageApprovalTime: 1.5,
    averageRefundTime: 2.3,
    averageTotalResolutionTime: 3.8,
    medianApprovalTime: 1.2,
    p95ApprovalTime: 3.5,
    p99ApprovalTime: 5.2,
  },
  risk: {
    highRiskReturns: 12,
    mediumRiskReturns: 45,
    lowRiskReturns: 391,
    flaggedForReview: 15,
    fraudDetected: 3,
    averageRiskScore: 23.5,
  },
  topReturnReasons: [],
  returnsByDay: [],
  returnRate: 8.5,
  customerSatisfaction: 4.3,
  returnTrends: {
    monthOverMonth: 5.2,
    weeklyTrend: [
      { week: 'Week 1', returns: 95, refunds: 88 },
      { week: 'Week 2', returns: 102, refunds: 94 },
      { week: 'Week 3', returns: 98, refunds: 90 },
      { week: 'Week 4', returns: 105, refunds: 97 },
    ],
  },
};

describe('ReturnAnalyticsDashboard', () => {
  beforeEach(() => {
    (returnAnalyticsService.getAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);
  });

  it('should render the dashboard title', async () => {
    render(<ReturnAnalyticsDashboard />);
    
    expect(screen.getByText('Return Analytics Dashboard')).toBeInTheDocument();
  });

  it('should display summary cards with analytics data', async () => {
    render(<ReturnAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Returns')).toBeInTheDocument();
      expect(screen.getByText('Total Refunded')).toBeInTheDocument();
      expect(screen.getByText('Approval Rate')).toBeInTheDocument();
      expect(screen.getByText('Avg Resolution Time')).toBeInTheDocument();
    });
  });

  it('should render trend visualization section', async () => {
    render(<ReturnAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Return Trends')).toBeInTheDocument();
    });
  });

  it('should render category breakdown charts', async () => {
    render(<ReturnAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Returns by Category')).toBeInTheDocument();
      expect(screen.getByText('Avg Refund by Category')).toBeInTheDocument();
    });
  });

  it('should render seller performance table', async () => {
    render(<ReturnAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Seller Performance')).toBeInTheDocument();
    });
  });
});
