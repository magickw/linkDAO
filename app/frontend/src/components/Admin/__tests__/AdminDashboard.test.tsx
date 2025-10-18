import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import AdminDashboard from '../AdminDashboard';

// Mock dependencies
jest.mock('../../../hooks/useAdminDashboard', () => ({
  useAdminDashboard: () => ({
    metrics: {
      realTimeUsers: 150,
      systemHealth: { overall: 'healthy', components: [], alerts: [], performance: {} },
      moderationQueue: { pending: 5, processed: 100 },
      sellerMetrics: { active: 25, pending: 3 },
      disputeStats: { open: 2, resolved: 15 },
      aiInsights: []
    },
    loading: false,
    error: null,
    refreshMetrics: jest.fn()
  })
}));

jest.mock('../../../services/adminWebSocketService', () => ({
  subscribeToMetrics: jest.fn(),
  unsubscribeFromMetrics: jest.fn()
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with metrics', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument(); // Real-time users
    expect(screen.getByText('5')).toBeInTheDocument(); // Pending moderation
  });

  it('displays system health status', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('shows moderation queue metrics', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('Moderation Queue')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Pending
    expect(screen.getByText('100')).toBeInTheDocument(); // Processed
  });

  it('displays seller metrics', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('Seller Metrics')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument(); // Active sellers
    expect(screen.getByText('3')).toBeInTheDocument(); // Pending applications
  });

  it('shows dispute statistics', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('Dispute Statistics')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Open disputes
    expect(screen.getByText('15')).toBeInTheDocument(); // Resolved disputes
  });

  it('handles refresh action', async () => {
    const mockRefresh = jest.fn();
    jest.mocked(require('../../../hooks/useAdminDashboard').useAdminDashboard).mockReturnValue({
      metrics: {},
      loading: false,
      error: null,
      refreshMetrics: mockRefresh
    });

    render(<AdminDashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('displays loading state', () => {
    jest.mocked(require('../../../hooks/useAdminDashboard').useAdminDashboard).mockReturnValue({
      metrics: {},
      loading: true,
      error: null,
      refreshMetrics: jest.fn()
    });

    render(<AdminDashboard />);
    
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    jest.mocked(require('../../../hooks/useAdminDashboard').useAdminDashboard).mockReturnValue({
      metrics: {},
      loading: false,
      error: 'Failed to load metrics',
      refreshMetrics: jest.fn()
    });

    render(<AdminDashboard />);
    
    expect(screen.getByText('Error: Failed to load metrics')).toBeInTheDocument();
  });
});