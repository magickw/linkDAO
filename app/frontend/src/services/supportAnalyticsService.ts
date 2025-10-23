/**
 * Support Analytics Service
 * Handles fetching and processing support analytics data from the backend
 */

export interface SupportTicketStats {
  totalTickets: number;
  resolvedTickets: number;
  avgResponseTime: string;
  satisfactionRate: number;
}

export interface TicketDataPoint {
  date: string;
  count: number;
  resolved: number;
  pending: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export interface SupportAgent {
  id: string;
  name: string;
  ticketsHandled: number;
  avgResponseTime: string;
  satisfaction: number;
}

export interface AgentPerformance {
  id: string;
  name: string;
  email: string;
  ticketsHandled: number;
  ticketsResolved: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  activeTickets: number;
}

export interface SupportAnalytics {
  summary: {
    totalTickets: number;
    ticketsWithDocViews: number;
    averageResolutionTime: number;
    documentationEffectiveness: number;
    topIssueCategories: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
  };
  agentPerformance?: AgentPerformance[];
  contentGaps: Array<{
    topic: string;
    ticketCount: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggestedContent: string;
  }>;
  preventionOpportunities: Array<{
    issueType: string;
    ticketCount: number;
    potentialPrevention: number;
    recommendedAction: string;
  }>;
  recommendations: string[];
}

export interface SupportTicket {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  tags: string[];
}

class SupportAnalyticsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
  }

  /**
   * Get support analytics for a given time period
   */
  async getSupportAnalytics(days: number = 30): Promise<SupportAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/support-ticketing/analytics?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch support analytics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.analytics;
    } catch (error) {
      console.error('Error fetching support analytics:', error);
      throw error;
    }
  }

  /**
   * Get ticket statistics
   */
  async getTicketStatistics(days: number = 30): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/support-ticketing/analytics/statistics?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ticket statistics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.statistics;
    } catch (error) {
      console.error('Error fetching ticket statistics:', error);
      throw error;
    }
  }

  /**
   * Search tickets with filters
   */
  async searchTickets(params: {
    query?: string;
    category?: string;
    priority?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ tickets: SupportTicket[]; total: number }> {
    try {
      const searchParams = new URLSearchParams();

      if (params.query) searchParams.append('q', params.query);
      if (params.category) searchParams.append('category', params.category);
      if (params.priority) searchParams.append('priority', params.priority);
      if (params.status) searchParams.append('status', params.status);
      if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) searchParams.append('dateTo', params.dateTo);

      const response = await fetch(`${this.baseUrl}/support-ticketing/tickets?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to search tickets: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        tickets: data.tickets,
        total: data.total,
      };
    } catch (error) {
      console.error('Error searching tickets:', error);
      throw error;
    }
  }

  /**
   * Get documentation effectiveness report
   */
  async getDocumentationEffectiveness(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/support-ticketing/analytics/documentation-effectiveness`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documentation effectiveness: ${response.statusText}`);
      }

      const data = await response.json();
      return data.report;
    } catch (error) {
      console.error('Error fetching documentation effectiveness:', error);
      throw error;
    }
  }

  /**
   * Process raw analytics data into dashboard format
   */
  processToDashboardFormat(analytics: SupportAnalytics, tickets: SupportTicket[], timeRange: string): {
    stats: SupportTicketStats;
    ticketData: TicketDataPoint[];
    categoryData: CategoryData[];
    topAgents: SupportAgent[];
  } {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

    // Calculate stats
    const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const stats: SupportTicketStats = {
      totalTickets: analytics.summary.totalTickets,
      resolvedTickets: resolvedCount,
      avgResponseTime: `${analytics.summary.averageResolutionTime.toFixed(1)}h`,
      satisfactionRate: Math.round(analytics.summary.documentationEffectiveness),
    };

    // Generate ticket data points for chart
    const ticketData: TicketDataPoint[] = this.generateTicketDataPoints(tickets, days);

    // Map category data with colors
    const categoryColors: Record<string, string> = {
      technical: '#3b82f6',
      account: '#10b981',
      payment: '#f59e0b',
      security: '#ef4444',
      general: '#6b7280',
    };

    const categoryData: CategoryData[] = analytics.summary.topIssueCategories.map(cat => ({
      name: this.formatCategoryName(cat.category),
      value: cat.percentage,
      color: categoryColors[cat.category] || '#6b7280',
    }));

    // Generate mock agent data (would come from backend in real implementation)
    const topAgents: SupportAgent[] = this.generateMockAgents();

    return {
      stats,
      ticketData,
      categoryData,
      topAgents,
    };
  }

  /**
   * Generate ticket data points for time series chart
   */
  private generateTicketDataPoints(tickets: SupportTicket[], days: number): TicketDataPoint[] {
    const dataPoints: TicketDataPoint[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTickets = tickets.filter(t => {
        const ticketDate = new Date(t.createdAt).toISOString().split('T')[0];
        return ticketDate === dateStr;
      });

      const resolved = dayTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
      const pending = dayTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

      dataPoints.push({
        date: dateStr,
        count: dayTickets.length,
        resolved,
        pending,
      });
    }

    return dataPoints;
  }

  /**
   * Format category names for display
   */
  private formatCategoryName(category: string): string {
    const nameMap: Record<string, string> = {
      technical: 'Technical Issues',
      account: 'Account Access',
      payment: 'Payment Issues',
      security: 'Security Concerns',
      general: 'General Inquiries',
    };
    return nameMap[category] || category;
  }

  /**
   * Generate mock agent data
   * TODO: Replace with real agent data from backend
   */
  private generateMockAgents(): SupportAgent[] {
    return [
      { id: '1', name: 'Alex Johnson', ticketsHandled: 124, avgResponseTime: '2.1h', satisfaction: 94 },
      { id: '2', name: 'Maria Garcia', ticketsHandled: 98, avgResponseTime: '1.8h', satisfaction: 96 },
      { id: '3', name: 'James Wilson', ticketsHandled: 87, avgResponseTime: '2.3h', satisfaction: 92 },
      { id: '4', name: 'Sarah Chen', ticketsHandled: 76, avgResponseTime: '1.9h', satisfaction: 95 },
      { id: '5', name: 'Robert Davis', ticketsHandled: 65, avgResponseTime: '2.5h', satisfaction: 90 },
    ];
  }

  /**
   * Create a new support ticket
   */
  async createTicket(ticketData: {
    title: string;
    description: string;
    category: string;
    priority: string;
    userEmail: string;
    tags?: string[];
    metadata?: any;
  }): Promise<SupportTicket> {
    try {
      const response = await fetch(`${this.baseUrl}/support-ticketing/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create ticket: ${response.statusText}`);
      }

      const data = await response.json();
      return data.ticket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Record documentation interaction
   */
  async recordDocumentationInteraction(interaction: {
    sessionId: string;
    documentPath: string;
    timeSpent: number;
    searchQuery?: string;
    userAgent?: string;
    referrer?: string;
  }): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/support-ticketing/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(interaction),
      });
    } catch (error) {
      console.error('Error recording documentation interaction:', error);
      // Don't throw - this is fire-and-forget analytics
    }
  }
}

export const supportAnalyticsService = new SupportAnalyticsService();
