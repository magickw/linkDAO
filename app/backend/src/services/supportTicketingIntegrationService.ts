/**
 * Support Ticketing Integration Service
 * Integrates with customer support systems to correlate documentation usage with support issues
 */

import path from 'path';
import { logger } from '../utils/logger';

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'account' | 'payment' | 'security' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  userId?: string;
  userEmail: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  tags: string[];
  metadata: {
    userAgent?: string;
    referrer?: string;
    sessionId?: string;
    documentsViewed?: string[];
    searchQueries?: string[];
    lastDocumentViewed?: string;
    timeSpentInDocs?: number;
  };
}

export interface DocumentationCorrelation {
  documentPath: string;
  title: string;
  category: string;
  relatedTickets: Array<{
    ticketId: string;
    category: string;
    priority: string;
    createdAt: Date;
    correlation: 'viewed_before_ticket' | 'searched_related_topic' | 'mentioned_in_ticket';
    correlationStrength: number; // 0-1
  }>;
  gapAnalysis: {
    commonIssues: string[];
    missingInformation: string[];
    confusingSections: string[];
    suggestedImprovements: string[];
  };
  effectivenessScore: number; // 0-100
}

export interface AgentPerformance {
  id: string;
  name: string;
  email: string;
  ticketsHandled: number;
  ticketsResolved: number;
  avgResponseTime: number; // in hours
  avgResolutionTime: number; // in hours
  satisfactionScore: number; // 0-100
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
  agentPerformance: AgentPerformance[];
  documentCorrelations: DocumentationCorrelation[];
  contentGaps: Array<{
    topic: string;
    ticketCount: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggestedContent: string;
  }>;
  preventionOpportunities: Array<{
    issueType: string;
    ticketCount: number;
    potentialPrevention: number; // percentage
    recommendedAction: string;
  }>;
  recommendations: string[];
}

export class SupportTicketingIntegrationService {
  private tickets: Map<string, SupportTicket> = new Map();
  private correlations: Map<string, DocumentationCorrelation> = new Map();
  private integrationConfig: {
    zendesk?: { apiKey: string; subdomain: string; email: string };
    intercom?: { accessToken: string };
    freshdesk?: { apiKey: string; domain: string };
    slack?: { webhookUrl: string };
  } = {};

  /**
   * Configure external integrations
   */
  configureIntegrations(config: typeof this.integrationConfig): void {
    this.integrationConfig = { ...this.integrationConfig, ...config };
    logger.info('Support ticketing integrations configured');
  }

  /**
   * Record support ticket
   */
  recordSupportTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>): SupportTicket {
    const fullTicket: SupportTicket = {
      ...ticket,
      id: this.generateTicketId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tickets.set(fullTicket.id, fullTicket);

    // Analyze correlation with documentation
    this.analyzeDocumentationCorrelation(fullTicket);

    // Send to external systems
    this.syncToExternalSystems(fullTicket);

    // Send notifications
    this.sendTicketNotifications(fullTicket);

    return fullTicket;
  }

  /**
   * Update support ticket
   */
  updateSupportTicket(
    ticketId: string,
    updates: Partial<Pick<SupportTicket, 'status' | 'assignedTo' | 'priority' | 'tags'>>
  ): SupportTicket {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    Object.assign(ticket, updates);
    ticket.updatedAt = new Date();

    if (updates.status === 'resolved' || updates.status === 'closed') {
      ticket.resolvedAt = new Date();
    }

    this.tickets.set(ticketId, ticket);
    return ticket;
  }

  /**
   * Analyze correlation between documentation and support tickets
   */
  private analyzeDocumentationCorrelation(ticket: SupportTicket): void {
    const { metadata } = ticket;
    
    if (!metadata.documentsViewed || metadata.documentsViewed.length === 0) {
      return; // No documentation interaction to analyze
    }

    for (const documentPath of metadata.documentsViewed) {
      let correlation = this.correlations.get(documentPath);
      
      if (!correlation) {
        correlation = {
          documentPath,
          title: this.extractTitleFromPath(documentPath),
          category: this.extractCategoryFromPath(documentPath),
          relatedTickets: [],
          gapAnalysis: {
            commonIssues: [],
            missingInformation: [],
            confusingSections: [],
            suggestedImprovements: []
          },
          effectivenessScore: 100
        };
      }

      // Determine correlation type and strength
      const correlationType = this.determineCorrelationType(ticket, documentPath);
      const correlationStrength = this.calculateCorrelationStrength(ticket, documentPath);

      correlation.relatedTickets.push({
        ticketId: ticket.id,
        category: ticket.category,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        correlation: correlationType,
        correlationStrength
      });

      // Update gap analysis
      this.updateGapAnalysis(correlation, ticket);

      // Recalculate effectiveness score
      correlation.effectivenessScore = this.calculateEffectivenessScore(correlation);

      this.correlations.set(documentPath, correlation);
    }
  }

  /**
   * Determine correlation type between ticket and document
   */
  private determineCorrelationType(
    ticket: SupportTicket,
    documentPath: string
  ): DocumentationCorrelation['relatedTickets'][0]['correlation'] {
    const { metadata } = ticket;

    // Check if document was the last one viewed
    if (metadata.lastDocumentViewed === documentPath) {
      return 'viewed_before_ticket';
    }

    // Check if search queries relate to document topic
    if (metadata.searchQueries) {
      const documentTopic = this.extractTopicFromPath(documentPath);
      const hasRelatedSearch = metadata.searchQueries.some(query => 
        query.toLowerCase().includes(documentTopic.toLowerCase())
      );
      if (hasRelatedSearch) {
        return 'searched_related_topic';
      }
    }

    // Check if document is mentioned in ticket description
    const documentName = path.basename(documentPath, '.md');
    if (ticket.description.toLowerCase().includes(documentName.toLowerCase())) {
      return 'mentioned_in_ticket';
    }

    return 'viewed_before_ticket';
  }

  /**
   * Calculate correlation strength
   */
  private calculateCorrelationStrength(ticket: SupportTicket, documentPath: string): number {
    let strength = 0.3; // Base correlation

    const { metadata } = ticket;

    // Stronger correlation if document was viewed recently before ticket creation
    if (metadata.lastDocumentViewed === documentPath) {
      strength += 0.4;
    }

    // Stronger correlation if user spent significant time on document
    if (metadata.timeSpentInDocs && metadata.timeSpentInDocs > 300000) { // 5 minutes
      strength += 0.2;
    }

    // Stronger correlation for high-priority tickets
    if (ticket.priority === 'high' || ticket.priority === 'critical') {
      strength += 0.1;
    }

    return Math.min(strength, 1.0);
  }

  /**
   * Update gap analysis based on ticket
   */
  private updateGapAnalysis(correlation: DocumentationCorrelation, ticket: SupportTicket): void {
    const { gapAnalysis } = correlation;

    // Extract common issues from ticket description
    const issues = this.extractIssuesFromTicket(ticket);
    for (const issue of issues) {
      if (!gapAnalysis.commonIssues.includes(issue)) {
        gapAnalysis.commonIssues.push(issue);
      }
    }

    // Identify missing information based on ticket category and description
    const missingInfo = this.identifyMissingInformation(ticket, correlation.documentPath);
    for (const info of missingInfo) {
      if (!gapAnalysis.missingInformation.includes(info)) {
        gapAnalysis.missingInformation.push(info);
      }
    }

    // Generate improvement suggestions
    const improvements = this.generateImprovementSuggestions(ticket, correlation);
    for (const improvement of improvements) {
      if (!gapAnalysis.suggestedImprovements.includes(improvement)) {
        gapAnalysis.suggestedImprovements.push(improvement);
      }
    }
  }

  /**
   * Calculate document effectiveness score
   */
  private calculateEffectivenessScore(correlation: DocumentationCorrelation): number {
    const { relatedTickets } = correlation;
    
    if (relatedTickets.length === 0) {
      return 100; // No tickets = effective documentation
    }

    // Lower score for more tickets, especially high-priority ones
    const ticketPenalty = relatedTickets.reduce((penalty, ticket) => {
      const priorityWeight = {
        low: 1,
        medium: 2,
        high: 4,
        critical: 8
      };
      return penalty + priorityWeight[ticket.priority as keyof typeof priorityWeight];
    }, 0);

    // Base score minus penalty, minimum 0
    const score = Math.max(0, 100 - (ticketPenalty * 2));
    return Math.round(score);
  }

  /**
   * Generate support analytics
   */
  generateSupportAnalytics(days: number = 30): SupportAnalytics {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentTickets = Array.from(this.tickets.values())
      .filter(ticket => ticket.createdAt > cutoff);

    const summary = this.calculateSummaryMetrics(recentTickets);
    const agentPerformance = this.calculateAgentPerformance(recentTickets);
    const documentCorrelations = Array.from(this.correlations.values())
      .filter(corr => corr.relatedTickets.some(t =>
        recentTickets.some(rt => rt.id === t.ticketId)
      ))
      .sort((a, b) => a.effectivenessScore - b.effectivenessScore);

    const contentGaps = this.identifyContentGaps(recentTickets);
    const preventionOpportunities = this.identifyPreventionOpportunities(recentTickets);
    const recommendations = this.generateSupportRecommendations(
      summary,
      documentCorrelations,
      contentGaps
    );

    return {
      summary,
      agentPerformance,
      documentCorrelations,
      contentGaps,
      preventionOpportunities,
      recommendations
    };
  }

  /**
   * Calculate agent performance metrics
   */
  private calculateAgentPerformance(tickets: SupportTicket[]): AgentPerformance[] {
    const agentMap = new Map<string, {
      tickets: SupportTicket[];
      resolved: SupportTicket[];
      responseTimes: number[];
      resolutionTimes: number[];
    }>();

    // Group tickets by agent
    for (const ticket of tickets) {
      if (!ticket.assignedTo) continue;

      const agent = agentMap.get(ticket.assignedTo) || {
        tickets: [],
        resolved: [],
        responseTimes: [],
        resolutionTimes: []
      };

      agent.tickets.push(ticket);

      if (ticket.resolvedAt) {
        agent.resolved.push(ticket);
        const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
        agent.resolutionTimes.push(resolutionTime / (1000 * 60 * 60)); // Convert to hours
      }

      // Calculate response time (mock - would need actual first response data)
      const responseTime = Math.random() * 4 + 0.5; // Mock: 0.5-4.5 hours
      agent.responseTimes.push(responseTime);

      agentMap.set(ticket.assignedTo, agent);
    }

    // Calculate performance metrics for each agent
    const agentPerformance: AgentPerformance[] = [];

    for (const [agentEmail, data] of agentMap.entries()) {
      const avgResponseTime = data.responseTimes.length > 0
        ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
        : 0;

      const avgResolutionTime = data.resolutionTimes.length > 0
        ? data.resolutionTimes.reduce((sum, time) => sum + time, 0) / data.resolutionTimes.length
        : 0;

      const resolutionRate = data.tickets.length > 0
        ? (data.resolved.length / data.tickets.length) * 100
        : 0;

      // Calculate satisfaction score based on resolution rate and speed
      const satisfactionScore = Math.min(100, Math.round(
        resolutionRate * 0.5 +
        (avgResponseTime < 2 ? 25 : avgResponseTime < 4 ? 15 : 5) +
        (avgResolutionTime < 24 ? 25 : avgResolutionTime < 48 ? 15 : 5)
      ));

      const activeTickets = data.tickets.filter(t =>
        t.status === 'open' || t.status === 'in_progress'
      ).length;

      agentPerformance.push({
        id: agentEmail,
        name: this.formatAgentName(agentEmail),
        email: agentEmail,
        ticketsHandled: data.tickets.length,
        ticketsResolved: data.resolved.length,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        satisfactionScore,
        activeTickets
      });
    }

    // Sort by tickets handled (descending)
    return agentPerformance.sort((a, b) => b.ticketsHandled - a.ticketsHandled);
  }

  /**
   * Format agent name from email
   */
  private formatAgentName(email: string): string {
    const name = email.split('@')[0];
    return name
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummaryMetrics(tickets: SupportTicket[]): SupportAnalytics['summary'] {
    const totalTickets = tickets.length;
    const ticketsWithDocViews = tickets.filter(t => 
      t.metadata.documentsViewed && t.metadata.documentsViewed.length > 0
    ).length;

    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    const averageResolutionTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, ticket) => {
          const resolutionTime = ticket.resolvedAt!.getTime() - ticket.createdAt.getTime();
          return sum + resolutionTime;
        }, 0) / resolvedTickets.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    const documentationEffectiveness = totalTickets > 0 
      ? ((totalTickets - ticketsWithDocViews) / totalTickets) * 100
      : 100;

    const categoryCount = tickets.reduce((acc, ticket) => {
      acc[ticket.category] = (acc[ticket.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIssueCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalTickets) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalTickets,
      ticketsWithDocViews,
      averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
      documentationEffectiveness: Math.round(documentationEffectiveness),
      topIssueCategories
    };
  }

  /**
   * Identify content gaps from support tickets
   */
  private identifyContentGaps(tickets: SupportTicket[]): SupportAnalytics['contentGaps'] {
    const topicCounts = new Map<string, number>();
    const topicSeverity = new Map<string, string>();

    for (const ticket of tickets) {
      const topics = this.extractTopicsFromTicket(ticket);
      
      for (const topic of topics) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        
        // Track highest severity for each topic
        const currentSeverity = topicSeverity.get(topic) || 'low';
        if (this.compareSeverity(ticket.priority, currentSeverity) > 0) {
          topicSeverity.set(topic, ticket.priority);
        }
      }
    }

    return Array.from(topicCounts.entries())
      .filter(([, count]) => count >= 3) // Minimum 3 tickets for a gap
      .map(([topic, count]) => ({
        topic,
        ticketCount: count,
        severity: topicSeverity.get(topic) as any || 'low',
        suggestedContent: this.generateSuggestedContent(topic, count)
      }))
      .sort((a, b) => b.ticketCount - a.ticketCount);
  }

  /**
   * Identify prevention opportunities
   */
  private identifyPreventionOpportunities(tickets: SupportTicket[]): SupportAnalytics['preventionOpportunities'] {
    const issueTypes = new Map<string, SupportTicket[]>();

    // Group tickets by issue type
    for (const ticket of tickets) {
      const issueType = this.classifyIssueType(ticket);
      const issues = issueTypes.get(issueType) || [];
      issues.push(ticket);
      issueTypes.set(issueType, issues);
    }

    return Array.from(issueTypes.entries())
      .filter(([, tickets]) => tickets.length >= 5) // Minimum 5 tickets
      .map(([issueType, issueTickets]) => {
        const ticketCount = issueTickets.length;
        const potentialPrevention = this.calculatePreventionPotential(issueTickets);
        const recommendedAction = this.generatePreventionAction(issueType, issueTickets);

        return {
          issueType,
          ticketCount,
          potentialPrevention,
          recommendedAction
        };
      })
      .sort((a, b) => b.potentialPrevention - a.potentialPrevention);
  }

  /**
   * Generate support recommendations
   */
  private generateSupportRecommendations(
    summary: SupportAnalytics['summary'],
    correlations: DocumentationCorrelation[],
    gaps: SupportAnalytics['contentGaps']
  ): string[] {
    const recommendations: string[] = [];

    if (summary.documentationEffectiveness < 70) {
      recommendations.push('Documentation effectiveness is low - prioritize content improvements');
    }

    if (gaps.length > 0) {
      const criticalGaps = gaps.filter(g => g.severity === 'critical' || g.severity === 'high');
      if (criticalGaps.length > 0) {
        recommendations.push(`Address ${criticalGaps.length} critical content gaps immediately`);
      }
    }

    const lowEffectivenessDocuments = correlations.filter(c => c.effectivenessScore < 50);
    if (lowEffectivenessDocuments.length > 0) {
      recommendations.push(`Review ${lowEffectivenessDocuments.length} documents with low effectiveness scores`);
    }

    if (summary.averageResolutionTime > 24) {
      recommendations.push('High resolution times - improve self-service documentation');
    }

    return recommendations;
  }

  /**
   * Sync ticket to external support systems
   */
  private async syncToExternalSystems(ticket: SupportTicket): Promise<void> {
    try {
      // Sync to Zendesk
      if (this.integrationConfig.zendesk) {
        await this.syncToZendesk(ticket);
      }

      // Sync to Intercom
      if (this.integrationConfig.intercom) {
        await this.syncToIntercom(ticket);
      }

      // Sync to Freshdesk
      if (this.integrationConfig.freshdesk) {
        await this.syncToFreshdesk(ticket);
      }
    } catch (error) {
      logger.error('Error syncing ticket to external systems:', error);
    }
  }

  /**
   * Sync ticket to Zendesk
   */
  private async syncToZendesk(ticket: SupportTicket): Promise<void> {
    const { zendesk } = this.integrationConfig;
    if (!zendesk) return;

    try {
      const zendeskTicket = {
        ticket: {
          subject: ticket.title,
          comment: {
            body: ticket.description
          },
          priority: this.mapPriorityToZendesk(ticket.priority),
          tags: [...ticket.tags, 'documentation-correlation'],
          custom_fields: [
            {
              id: 'documents_viewed',
              value: ticket.metadata.documentsViewed?.join(', ') || ''
            },
            {
              id: 'search_queries',
              value: ticket.metadata.searchQueries?.join(', ') || ''
            }
          ]
        }
      };

      // In a real implementation, make HTTP request to Zendesk API
      logger.info(`Would sync ticket ${ticket.id} to Zendesk:`, zendeskTicket);
    } catch (error) {
      logger.error('Error syncing to Zendesk:', error);
    }
  }

  /**
   * Sync ticket to Intercom
   */
  private async syncToIntercom(ticket: SupportTicket): Promise<void> {
    const { intercom } = this.integrationConfig;
    if (!intercom) return;

    try {
      const intercomTicket = {
        message_type: 'inbound',
        subject: ticket.title,
        body: ticket.description,
        from: {
          type: 'user',
          email: ticket.userEmail
        },
        custom_attributes: {
          priority: ticket.priority,
          category: ticket.category,
          documents_viewed: ticket.metadata.documentsViewed?.length || 0,
          time_in_docs: ticket.metadata.timeSpentInDocs || 0
        }
      };

      // In a real implementation, make HTTP request to Intercom API
      logger.info(`Would sync ticket ${ticket.id} to Intercom:`, intercomTicket);
    } catch (error) {
      logger.error('Error syncing to Intercom:', error);
    }
  }

  /**
   * Sync ticket to Freshdesk
   */
  private async syncToFreshdesk(ticket: SupportTicket): Promise<void> {
    const { freshdesk } = this.integrationConfig;
    if (!freshdesk) return;

    try {
      const freshdeskTicket = {
        subject: ticket.title,
        description: ticket.description,
        email: ticket.userEmail,
        priority: this.mapPriorityToFreshdesk(ticket.priority),
        status: 2, // Open
        tags: ticket.tags,
        custom_fields: {
          cf_documents_viewed: ticket.metadata.documentsViewed?.join(', ') || '',
          cf_search_queries: ticket.metadata.searchQueries?.join(', ') || '',
          cf_time_in_docs: ticket.metadata.timeSpentInDocs || 0
        }
      };

      // In a real implementation, make HTTP request to Freshdesk API
      logger.info(`Would sync ticket ${ticket.id} to Freshdesk:`, freshdeskTicket);
    } catch (error) {
      logger.error('Error syncing to Freshdesk:', error);
    }
  }

  /**
   * Send ticket notifications
   */
  private async sendTicketNotifications(ticket: SupportTicket): Promise<void> {
    try {
      // Send Slack notification for high-priority tickets
      if ((ticket.priority === 'high' || ticket.priority === 'critical') && this.integrationConfig.slack) {
        await this.sendSlackNotification(ticket);
      }

      // Send email notifications to support team
      await this.sendEmailNotification(ticket);
    } catch (error) {
      logger.error('Error sending ticket notifications:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(ticket: SupportTicket): Promise<void> {
    const { slack } = this.integrationConfig;
    if (!slack) return;

    try {
      const slackMessage = {
        text: `🚨 ${ticket.priority.toUpperCase()} Priority Support Ticket`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${ticket.title}*\n${ticket.description.substring(0, 200)}${ticket.description.length > 200 ? '...' : ''}`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Priority:* ${ticket.priority}`
              },
              {
                type: 'mrkdwn',
                text: `*Category:* ${ticket.category}`
              },
              {
                type: 'mrkdwn',
                text: `*User:* ${ticket.userEmail}`
              },
              {
                type: 'mrkdwn',
                text: `*Docs Viewed:* ${ticket.metadata.documentsViewed?.length || 0}`
              }
            ]
          }
        ]
      };

      // In a real implementation, make HTTP request to Slack webhook
      logger.info(`Would send Slack notification for ticket ${ticket.id}:`, slackMessage);
    } catch (error) {
      logger.error('Error sending Slack notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(ticket: SupportTicket): Promise<void> {
    try {
      const emailData = {
        to: 'support@linkdao.io',
        subject: `New Support Ticket: ${ticket.title}`,
        html: `
          <h2>New Support Ticket Created</h2>
          <p><strong>Ticket ID:</strong> ${ticket.id}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><strong>Category:</strong> ${ticket.category}</p>
          <p><strong>User:</strong> ${ticket.userEmail}</p>
          <p><strong>Title:</strong> ${ticket.title}</p>
          <p><strong>Description:</strong></p>
          <p>${ticket.description}</p>
          
          <h3>Documentation Context</h3>
          <p><strong>Documents Viewed:</strong> ${ticket.metadata.documentsViewed?.length || 0}</p>
          <p><strong>Time in Docs:</strong> ${Math.round((ticket.metadata.timeSpentInDocs || 0) / 60000)} minutes</p>
          <p><strong>Search Queries:</strong> ${ticket.metadata.searchQueries?.join(', ') || 'None'}</p>
          
          <p><strong>Created:</strong> ${ticket.createdAt.toISOString()}</p>
        `
      };

      // In a real implementation, send email via email service
      logger.info(`Would send email notification for ticket ${ticket.id}:`, emailData);
    } catch (error) {
      logger.error('Error sending email notification:', error);
    }
  }

  /**
   * Get tickets by user
   */
  getTicketsByUser(userEmail: string): SupportTicket[] {
    return Array.from(this.tickets.values())
      .filter(ticket => ticket.userEmail === userEmail)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get ticket by ID
   */
  getTicketById(ticketId: string): SupportTicket | undefined {
    return this.tickets.get(ticketId);
  }

  /**
   * Search tickets
   */
  searchTickets(query: string, filters?: {
    category?: string;
    priority?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): SupportTicket[] {
    const queryLower = query.toLowerCase();
    
    return Array.from(this.tickets.values())
      .filter(ticket => {
        // Text search
        const matchesQuery = !query || 
          ticket.title.toLowerCase().includes(queryLower) ||
          ticket.description.toLowerCase().includes(queryLower) ||
          ticket.userEmail.toLowerCase().includes(queryLower);

        // Filters
        const matchesCategory = !filters?.category || ticket.category === filters.category;
        const matchesPriority = !filters?.priority || ticket.priority === filters.priority;
        const matchesStatus = !filters?.status || ticket.status === filters.status;
        const matchesDateFrom = !filters?.dateFrom || ticket.createdAt >= filters.dateFrom;
        const matchesDateTo = !filters?.dateTo || ticket.createdAt <= filters.dateTo;

        return matchesQuery && matchesCategory && matchesPriority && 
               matchesStatus && matchesDateFrom && matchesDateTo;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get documentation effectiveness report
   */
  getDocumentationEffectivenessReport(): {
    overallScore: number;
    documentScores: Array<{
      path: string;
      title: string;
      score: number;
      ticketCount: number;
      recommendations: string[];
    }>;
    topIssues: Array<{
      issue: string;
      count: number;
      affectedDocuments: string[];
    }>;
  } {
    const correlations = Array.from(this.correlations.values());
    
    const overallScore = correlations.length > 0
      ? Math.round(correlations.reduce((sum, corr) => sum + corr.effectivenessScore, 0) / correlations.length)
      : 100;

    const documentScores = correlations.map(corr => ({
      path: corr.documentPath,
      title: corr.title,
      score: corr.effectivenessScore,
      ticketCount: corr.relatedTickets.length,
      recommendations: corr.gapAnalysis.suggestedImprovements
    })).sort((a, b) => a.score - b.score);

    // Aggregate common issues across all documents
    const issueMap = new Map<string, { count: number; documents: Set<string> }>();
    
    for (const corr of correlations) {
      for (const issue of corr.gapAnalysis.commonIssues) {
        const existing = issueMap.get(issue) || { count: 0, documents: new Set() };
        existing.count++;
        existing.documents.add(corr.documentPath);
        issueMap.set(issue, existing);
      }
    }

    const topIssues = Array.from(issueMap.entries())
      .map(([issue, data]) => ({
        issue,
        count: data.count,
        affectedDocuments: Array.from(data.documents)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      overallScore,
      documentScores,
      topIssues
    };
  }

  /**
   * Map priority to Zendesk format
   */
  private mapPriorityToZendesk(priority: string): string {
    const mapping = {
      low: 'low',
      medium: 'normal',
      high: 'high',
      critical: 'urgent'
    };
    return mapping[priority as keyof typeof mapping] || 'normal';
  }

  /**
   * Map priority to Freshdesk format
   */
  private mapPriorityToFreshdesk(priority: string): number {
    const mapping = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };
    return mapping[priority as keyof typeof mapping] || 2;
  }

  /**
   * Extract topics from support ticket
   */
  private extractTopicsFromTicket(ticket: SupportTicket): string[] {
    const text = `${ticket.title} ${ticket.description}`.toLowerCase();
    const topics: string[] = [];

    // Common topic patterns
    const topicPatterns = {
      'wallet connection': ['wallet', 'connect', 'metamask'],
      'token purchase': ['buy', 'purchase', 'token', 'ldao'],
      'transaction failed': ['transaction', 'failed', 'error', 'pending'],
      'security concern': ['security', 'hack', 'scam', 'suspicious'],
      'account access': ['login', 'password', 'account', 'access'],
      'payment issue': ['payment', 'card', 'bank', 'charge'],
      'staking problem': ['staking', 'stake', 'rewards', 'unstake'],
      'gas fees': ['gas', 'fee', 'expensive', 'cost']
    };

    for (const [topic, keywords] of Object.entries(topicPatterns)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Classify issue type
   */
  private classifyIssueType(ticket: SupportTicket): string {
    const description = ticket.description.toLowerCase();
    
    if (description.includes('how to') || description.includes('how do i')) {
      return 'how-to-question';
    }
    
    if (description.includes('error') || description.includes('failed') || description.includes('not working')) {
      return 'technical-error';
    }
    
    if (description.includes('confused') || description.includes('unclear') || description.includes('don\'t understand')) {
      return 'confusion-clarity';
    }
    
    if (description.includes('missing') || description.includes('can\'t find')) {
      return 'missing-information';
    }
    
    return 'general-inquiry';
  }

  /**
   * Calculate prevention potential
   */
  private calculatePreventionPotential(tickets: SupportTicket[]): number {
    // Analyze if tickets could have been prevented with better documentation
    let preventableCount = 0;

    for (const ticket of tickets) {
      const issueType = this.classifyIssueType(ticket);
      
      // These issue types are typically preventable with good documentation
      if (['how-to-question', 'confusion-clarity', 'missing-information'].includes(issueType)) {
        preventableCount++;
      }
      
      // Technical errors might be preventable with better troubleshooting guides
      if (issueType === 'technical-error' && ticket.priority !== 'critical') {
        preventableCount += 0.5;
      }
    }

    return Math.round((preventableCount / tickets.length) * 100);
  }

  /**
   * Generate prevention action recommendation
   */
  private generatePreventionAction(issueType: string, tickets: SupportTicket[]): string {
    switch (issueType) {
      case 'how-to-question':
        return 'Create step-by-step tutorials for common procedures';
      case 'confusion-clarity':
        return 'Improve clarity and add more examples to existing documentation';
      case 'missing-information':
        return 'Add missing information sections to relevant documents';
      case 'technical-error':
        return 'Expand troubleshooting guides with common error solutions';
      default:
        return 'Review and improve general documentation coverage';
    }
  }

  /**
   * Extract issues from ticket description
   */
  private extractIssuesFromTicket(ticket: SupportTicket): string[] {
    const issues: string[] = [];
    const description = ticket.description.toLowerCase();

    // Common issue patterns
    const issuePatterns = [
      'wallet not connecting',
      'transaction stuck',
      'high gas fees',
      'token not showing',
      'login problems',
      'payment failed',
      'security concerns',
      'staking issues'
    ];

    for (const pattern of issuePatterns) {
      if (description.includes(pattern.toLowerCase())) {
        issues.push(pattern);
      }
    }

    return issues;
  }

  /**
   * Identify missing information based on ticket
   */
  private identifyMissingInformation(ticket: SupportTicket, documentPath: string): string[] {
    const missing: string[] = [];
    const issueType = this.classifyIssueType(ticket);

    if (issueType === 'missing-information') {
      missing.push('Add section addressing user\'s specific question');
    }

    if (issueType === 'technical-error') {
      missing.push('Add troubleshooting steps for this error type');
    }

    if (ticket.category === 'security' && !documentPath.includes('security')) {
      missing.push('Add security considerations section');
    }

    return missing;
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovementSuggestions(
    ticket: SupportTicket,
    correlation: DocumentationCorrelation
  ): string[] {
    const suggestions: string[] = [];
    const issueType = this.classifyIssueType(ticket);

    switch (issueType) {
      case 'confusion-clarity':
        suggestions.push('Simplify language and add more examples');
        suggestions.push('Add visual aids or screenshots');
        break;
      case 'missing-information':
        suggestions.push('Add comprehensive coverage of the topic');
        suggestions.push('Include edge cases and common variations');
        break;
      case 'technical-error':
        suggestions.push('Expand troubleshooting section');
        suggestions.push('Add error code explanations');
        break;
    }

    return suggestions;
  }

  // Helper methods
  private generateTicketId(): string {
    return `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private extractTitleFromPath(documentPath: string): string {
    const fileName = documentPath.split('/').pop() || '';
    return fileName.replace('.md', '').replace(/-/g, ' ');
  }

  private extractCategoryFromPath(documentPath: string): string {
    const pathParts = documentPath.split('/');
    return pathParts[pathParts.length - 2] || 'general';
  }

  private extractTopicFromPath(documentPath: string): string {
    const fileName = documentPath.split('/').pop() || '';
    return fileName.replace('.md', '').replace(/-/g, ' ');
  }

  private compareSeverity(priority1: string, priority2: string): number {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    return (severityOrder[priority1 as keyof typeof severityOrder] || 0) - 
           (severityOrder[priority2 as keyof typeof severityOrder] || 0);
  }

  private generateSuggestedContent(topic: string, ticketCount: number): string {
    if (ticketCount >= 10) {
      return `Comprehensive guide: "${topic}" - High demand topic`;
    } else if (ticketCount >= 5) {
      return `FAQ section: "${topic}" - Common questions`;
    } else {
      return `Troubleshooting entry: "${topic}" - Address specific issues`;
    }
  }
}

export const supportTicketingIntegrationService = new SupportTicketingIntegrationService();
