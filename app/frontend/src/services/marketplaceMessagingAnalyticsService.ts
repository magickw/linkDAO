/**
 * Marketplace Messaging Analytics Service
 * Provides analytics and insights for seller messaging performance
 */

import { Conversation } from '../types/messaging';

export interface SellerMessagingAnalytics {
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
  async getSellerMessagingAnalytics(sellerAddress: string): Promise<SellerMessagingAnalytics> {
    // Fetch real data from backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/marketplace/seller/${sellerAddress}/messaging-analytics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messaging analytics');
    }

    const data = await response.json();
    return data.data || data;
  }

  /**
   * Get messaging metrics for a seller
   */
  async getSellerMessagingMetrics(sellerAddress: string): Promise<SellerMessagingMetrics> {
    // Fetch real data from backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/marketplace/seller/${sellerAddress}/messaging-metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messaging metrics');
    }

    const data = await response.json();
    return data.data || data;
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(conversationId: string): Promise<any> {
    // Fetch real data from backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/marketplace/conversation/${conversationId}/analytics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch conversation analytics');
    }

    const data = await response.json();
    return data.data || data;
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