import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RiskManagementConsole } from '../RiskManagementConsole';
import { riskManagementService } from '../../../../services/riskManagementService';

// Mock the service
jest.mock('../../../../services/riskManagementService');
const mockRiskManagementService = riskManagementService as jest.Mocked<typeof riskManagementService>;

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
}));

describe('RiskManagementConsole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock all service methods to return resolved promises
    mockRiskManagementService.getRiskMetrics.mockResolvedValue({
      totalReturns: 1000,
      highRiskReturns: 150,
      mediumRiskReturns: 300,
      lowRiskReturns: 550,
      flaggedForReview: 75,
      fraudDetected: 10,
      averageRiskScore: 0.45,
      riskTrend: {
        daily: [],
        weekly: []
      }
    });

    mockRiskManagementService.getRiskStatistics.mockResolvedValue({
      totalReturns: 1000,
      riskDistribution: { low: 550, medium: 300, high: 150, critical: 0 },
      riskTrends: { daily: [], weekly: [] },
      topRiskFactors: [],
      alertSummary: { total: 50, active: 15, acknowledged: 25, resolved: 10 },
      reviewQueue: { pending: 30, overdue: 5, completed: 65 }
    });

    mockRiskManagementService.getHighRiskReturns.mockResolvedValue({
      returns: [],
      total: 0
    });

    mockRiskManagementService.getRiskAlerts.mockResolvedValue({
      alerts: [],
      total: 0
    });

    mockRiskManagementService.getReviewAssignments.mockResolvedValue({
      assignments: [],
      total: 0
    });
  });

  it('should render the risk management console with loading state', async () => {
    await act(async () => {
      render(<RiskManagementConsole />);
    });

    expect(screen.getByText('Risk Management Console')).toBeInTheDocument();
    expect(screen.getByText('Monitor and manage return risks and fraud detection')).toBeInTheDocument();
  });

  it('should display navigation tabs', async () => {
    await act(async () => {
      render(<RiskManagementConsole />);
    });

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Risk Returns')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Reviews')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});