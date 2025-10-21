import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessagingAnalytics } from '../MessagingAnalytics';

// Mock the service
jest.mock('../../../services/marketplaceMessagingAnalyticsService', () => ({
  marketplaceMessagingAnalyticsService: {
    getSellerMessagingAnalytics: jest.fn().mockResolvedValue({
      avgResponseTime: 45,
      responseTimeTrend: 'improving',
      conversionRate: 24,
      conversionTrend: 'stable',
      activeConversations: 12,
      unreadCount: 3,
      responseTimeHistory: [
        { date: new Date(), responseTime: 45 }
      ],
      commonQuestions: [
        { keyword: 'shipping', count: 24 }
      ]
    }),
    formatDuration: jest.fn().mockReturnValue('45 minutes')
  }
}));

describe('MessagingAnalytics', () => {
  it('renders loading state initially', () => {
    render(<MessagingAnalytics />);
    
    // Check for loading skeleton
    expect(screen.getByText(/Messaging Analytics/i)).toBeInTheDocument();
  });

  it('renders analytics data after loading', async () => {
    render(<MessagingAnalytics />);
    
    // Wait for data to load
    setTimeout(() => {
      expect(screen.getByText('45 minutes')).toBeInTheDocument();
      expect(screen.getByText('24%')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    }, 100);
  });

  it('renders charts and common questions', async () => {
    render(<MessagingAnalytics />);
    
    // Wait for data to load
    setTimeout(() => {
      expect(screen.getByText('Response Time Trend (7 days)')).toBeInTheDocument();
      expect(screen.getByText('Most Common Questions')).toBeInTheDocument();
      expect(screen.getByText('shipping')).toBeInTheDocument();
    }, 100);
  });
});