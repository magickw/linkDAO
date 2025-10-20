/**
 * Marketplace Messaging Analytics Service
 * Provides analytics and insights for seller messaging performance
 */

import { Conversation } from '../types/messaging';

export interface MessagingAnalytics {
  avgResponseTime: number; // in minutes
  responseTimeTrend: 'improving' | 'declining' | 'stable';
  conversionRate: number; // percentage
  conversionTrend: 'improving' | 'declining' | 'stable';
  activeConversations: number;
  unreadCount: number;
  responseTimeHistory: Array<{
    date: Date;
    responseTime: number; // in minutes
  }>;
  commonQuestions: Array<{
    keyword: string;
    count: number;
  }>;
}

export interface SellerMessagingMetrics {
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
  responseRate: number; // percentage
  avgMessageLength: number;
  peakActivityHours: number[]; // 0-23 hours
  mostActiveDay: string; // 'monday', 'tuesday', etc.
}

class MarketplaceMessagingAnalyticsService {
  /**
   * Get messaging analytics for a seller
   */
  async getSellerMessagingAnalytics(sellerAddress: string): Promise<MessagingAnalytics> {
    // In a real implementation, this would fetch data from the backend
    // For now, we'll return mock data
    return {
      avgResponseTime: 45, // 45 minutes
      responseTimeTrend: 'improving',
      conversionRate: 24, // 24%
      conversionTrend: 'stable',
      activeConversations: 12,
      unreadCount: 3,
      responseTimeHistory: [
        { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), responseTime: 65 },
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), responseTime: 62 },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), responseTime: 58 },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), responseTime: 55 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), responseTime: 52 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), responseTime: 48 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), responseTime: 46 },
        { date: new Date(), responseTime: 45 }
      ],
      commonQuestions: [
        { keyword: 'shipping', count: 24 },
        { keyword: 'return', count: 18 },
        { keyword: 'size', count: 15 },
        { keyword: 'material', count: 12 },
        { keyword: 'delivery', count: 10 }
      ]
    };
  }

  /**
   * Get messaging metrics for a seller
   */
  async getSellerMessagingMetrics(sellerAddress: string): Promise<SellerMessagingMetrics> {
    // In a real implementation, this would fetch data from the backend
    // For now, we'll return mock data
    return {
      totalMessages: 342,
      messagesSent: 187,
      messagesReceived: 155,
      responseRate: 92, // 92%
      avgMessageLength: 87, // 87 characters
      peakActivityHours: [9, 10, 14, 15, 16], // 9-11 AM and 2-4 PM
      mostActiveDay: 'tuesday'
    };
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(conversationId: string): Promise<any> {
    // In a real implementation, this would fetch data from the backend
    // For now, we'll return mock data
    return {
      conversationId,
      sellerResponseTimeAvg: '32 minutes',
      buyerResponseTimeAvg: '125 minutes',
      messageCount: 24,
      convertedToSale: true,
      saleAmount: '0.245 ETH',
      firstResponseTime: '18 minutes',
      resolutionTime: '2 days 4 hours'
    };
  }

  /**
   * Format duration in minutes to a human-readable string
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    } else if (minutes < 1440) { // less than a day
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return `${hours}h ${remainingMinutes}m`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${remainingHours}h`;
    }
  }

  /**
   * Get trend indicator based on current and previous values
   */
  getTrend(current: number, previous: number): 'improving' | 'declining' | 'stable' {
    const diff = current - previous;
    const percentChange = (Math.abs(diff) / previous) * 100;
    
    if (percentChange < 2) {
      return 'stable';
    }
    
    return diff < 0 ? 'improving' : 'declining';
  }
}

export const marketplaceMessagingAnalyticsService = new MarketplaceMessagingAnalyticsService();