import { eq, desc, and, gte, like } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db/connection';
import { safeLogger } from '../utils/safeLogger';
import { supportTickets, supportFAQ, supportCategories, ticketResponses } from '../db/schema/supportSchema';
import { safeLogger } from '../utils/safeLogger';
import emailService from './emailService';
import { safeLogger } from '../utils/safeLogger';
import { createNotification } from './notificationHelper';
import { safeLogger } from '../utils/safeLogger';
import { escapeLikePattern, generateSecureId } from '../utils/securityUtils';
import { safeLogger } from '../utils/safeLogger';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assignedTo?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface SupportFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  helpful: number;
  notHelpful: number;
  views: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportMetrics {
  totalTickets: number;
  openTickets: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  resolutionRate: number;
  ticketsByCategory: Record<string, number>;
  ticketsByPriority: Record<string, number>;
}

class LDAOSupportService {
  // Ticket Management
  async createTicket(ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupportTicket> {
    try {
      const ticketId = generateSecureId('LDAO');
      
      const [ticket] = await db.insert(supportTickets).values({
        id: ticketId,
        ...ticketData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Track metrics
      const { supportMonitoring } = await import('./supportMonitoringService');
      supportMonitoring.trackTicketCreated();

      // Send confirmation email to user
      await this.sendTicketConfirmation(ticket);

      // Notify support team based on priority
      if (ticketData.priority === 'urgent' || ticketData.priority === 'high') {
        await this.notifySupportTeam(ticket);
      }

      // Auto-assign based on category
      await this.autoAssignTicket(ticket);

      return ticket;
    } catch (error) {
      safeLogger.error('Error creating support ticket:', error);
      throw new Error('Failed to create support ticket');
    }
  }

  async getTicketsByUser(userId: string): Promise<SupportTicket[]> {
    try {
      return await db.select()
        .from(supportTickets)
        .where(eq(supportTickets.userId, userId))
        .orderBy(desc(supportTickets.createdAt));
    } catch (error) {
      safeLogger.error('Error fetching user tickets:', error);
      throw new Error('Failed to fetch support tickets');
    }
  }

  async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    try {
      const [ticket] = await db.select()
        .from(supportTickets)
        .where(eq(supportTickets.id, ticketId));
      
      return ticket || null;
    } catch (error) {
      safeLogger.error('Error fetching ticket:', error);
      throw new Error('Failed to fetch support ticket');
    }
  }

  async updateTicketStatus(
    ticketId: string, 
    status: SupportTicket['status'], 
    assignedTo?: string
  ): Promise<SupportTicket> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (assignedTo) {
        updateData.assignedTo = assignedTo;
      }

      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
      }

      const [updatedTicket] = await db.update(supportTickets)
        .set(updateData)
        .where(eq(supportTickets.id, ticketId))
        .returning();

      // Notify user of status change
      await this.notifyTicketStatusChange(updatedTicket);

      return updatedTicket;
    } catch (error) {
      safeLogger.error('Error updating ticket status:', error);
      throw new Error('Failed to update ticket status');
    }
  }

  async addTicketResponse(
    ticketId: string,
    response: string,
    isStaffResponse: boolean = false,
    attachments?: string[]
  ): Promise<void> {
    try {
      // Add response to ticket history
      await db.insert(ticketResponses).values({
        id: generateSecureId('resp'),
        ticketId,
        response,
        isStaffResponse,
        attachments,
        createdAt: new Date()
      });

      // Update ticket status if staff response
      if (isStaffResponse) {
        await this.updateTicketStatus(ticketId, 'in-progress');
      }

      // Notify relevant parties
      const ticket = await this.getTicketById(ticketId);
      if (ticket) {
        if (isStaffResponse) {
          await this.notifyUserOfResponse(ticket);
        } else {
          await this.notifyStaffOfUserResponse(ticket);
        }
      }
    } catch (error) {
      safeLogger.error('Error adding ticket response:', error);
      throw new Error('Failed to add ticket response');
    }
  }

  // FAQ Management
  async getFAQByCategory(category: string = 'ldao'): Promise<SupportFAQ[]> {
    try {
      return await db.select()
        .from(supportFAQ)
        .where(and(
          eq(supportFAQ.category, category),
          eq(supportFAQ.isPublished, true)
        ))
        .orderBy(desc(supportFAQ.views));
    } catch (error) {
      safeLogger.error('Error fetching FAQ items:', error);
      throw new Error('Failed to fetch FAQ items');
    }
  }

  async searchFAQ(query: string, category?: string): Promise<SupportFAQ[]> {
    try {
      const escapedQuery = escapeLikePattern(query);
      let whereCondition = eq(supportFAQ.isPublished, true);
      
      if (category) {
        whereCondition = and(whereCondition, eq(supportFAQ.category, category));
      }

      const faqs = await db.select()
        .from(supportFAQ)
        .where(whereCondition);

      // Simple text search with escaped pattern
      return faqs.filter(faq => 
        faq.question.toLowerCase().includes(escapedQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(escapedQuery.toLowerCase()) ||
        faq.tags.some(tag => tag.toLowerCase().includes(escapedQuery.toLowerCase()))
      );
    } catch (error) {
      safeLogger.error('Error searching FAQ:', error);
      throw new Error('Failed to search FAQ');
    }
  }

  async markFAQHelpful(faqId: string, isHelpful: boolean): Promise<void> {
    try {
      const updateField = isHelpful ? 'helpful' : 'notHelpful';
      
      const [faq] = await db.select().from(supportFAQ).where(eq(supportFAQ.id, faqId));
      if (faq) {
        await db.update(supportFAQ)
          .set({
            [updateField]: (faq[updateField] || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(supportFAQ.id, faqId));
      }
    } catch (error) {
      safeLogger.error('Error updating FAQ helpfulness:', error);
      throw new Error('Failed to update FAQ rating');
    }
  }

  async incrementFAQViews(faqId: string): Promise<void> {
    try {
      const [faq] = await db.select().from(supportFAQ).where(eq(supportFAQ.id, faqId));
      if (faq) {
        await db.update(supportFAQ)
          .set({
            views: (faq.views || 0) + 1
          })
          .where(eq(supportFAQ.id, faqId));
      }
    } catch (error) {
      safeLogger.error('Error incrementing FAQ views:', error);
    }
  }

  // Analytics and Metrics
  async getSupportMetrics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<SupportMetrics> {
    try {
      const startDate = this.getStartDate(timeframe);
      
      const tickets = await db.select()
        .from(supportTickets)
        .where(gte(supportTickets.createdAt, startDate));

      const totalTickets = tickets.length;
      const openTickets = tickets.filter(t => t.status === 'open').length;
      const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;

      // Calculate average response time
      const responseTime = await this.calculateAverageResponseTime(tickets);
      
      // Calculate customer satisfaction (from feedback)
      const satisfaction = await this.calculateCustomerSatisfaction(tickets);

      // Group by category and priority
      const ticketsByCategory = tickets.reduce((acc, ticket) => {
        acc[ticket.category] = (acc[ticket.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const ticketsByPriority = tickets.reduce((acc, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalTickets,
        openTickets,
        averageResponseTime: responseTime,
        customerSatisfaction: satisfaction,
        resolutionRate: totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0,
        ticketsByCategory,
        ticketsByPriority
      };
    } catch (error) {
      safeLogger.error('Error calculating support metrics:', error);
      throw new Error('Failed to calculate support metrics');
    }
  }

  // Auto-assignment and routing
  private async autoAssignTicket(ticket: SupportTicket): Promise<void> {
    try {
      const assignmentRules = {
        'direct-purchase': 'payment-specialist',
        'dex-trading': 'trading-specialist',
        'staking': 'staking-specialist',
        'earn-to-own': 'community-manager',
        'cross-chain': 'technical-specialist',
        'technical': 'technical-support',
        'account': 'account-specialist'
      };

      const specialistType = assignmentRules[ticket.category] || 'general-support';
      const availableAgent = await this.findAvailableAgent(specialistType);

      if (availableAgent) {
        await this.updateTicketStatus(ticket.id, 'in-progress', availableAgent.id);
      }
    } catch (error) {
      safeLogger.error('Error auto-assigning ticket:', error);
    }
  }

  private async findAvailableAgent(specialistType: string): Promise<any> {
    // In production, this would query a staff/agent database
    // For now, return a mock agent
    return {
      id: 'agent-001',
      name: 'LDAO Support Agent',
      specialization: specialistType
    };
  }

  // Notification methods
  private async sendTicketConfirmation(ticket: SupportTicket): Promise<void> {
    try {
      // In production, resolve userId to email from user database
      const userEmail = `${ticket.userId}@example.com`; // TODO: Get from user service
      await emailService.sendTicketConfirmationEmail(
        userEmail,
        ticket.id,
        ticket.subject,
        ticket.priority
      );
    } catch (error) {
      safeLogger.error('Error sending ticket confirmation:', error);
    }
  }

  private async notifySupportTeam(ticket: SupportTicket): Promise<void> {
    try {
      // Send urgent notification to support team
      const notification = {
        type: 'urgent-ticket',
        title: `Urgent LDAO Support Ticket: ${ticket.subject}`,
        message: `Priority: ${ticket.priority} | Category: ${ticket.category}`,
        data: { ticketId: ticket.id }
      };

      // In production, this would notify all available agents
      await createNotification('support-team', notification);
    } catch (error) {
      safeLogger.error('Error notifying support team:', error);
    }
  }

  private async notifyTicketStatusChange(ticket: SupportTicket): Promise<void> {
    try {
      const statusMessages = {
        'in-progress': 'Your support ticket is now being reviewed by our team.',
        'resolved': 'Your support ticket has been resolved. Please review the solution.',
        'closed': 'Your support ticket has been closed.'
      };

      const notification = {
        type: 'ticket-status-update',
        title: `Ticket ${ticket.id} Status Update`,
        message: statusMessages[ticket.status] || 'Your ticket status has been updated.',
        data: { ticketId: ticket.id, status: ticket.status }
      };

      await createNotification(ticket.userId, notification);
    } catch (error) {
      safeLogger.error('Error notifying ticket status change:', error);
    }
  }

  private async notifyUserOfResponse(ticket: SupportTicket): Promise<void> {
    try {
      const notification = {
        type: 'ticket-response',
        title: `New Response to Ticket ${ticket.id}`,
        message: 'Our support team has responded to your ticket.',
        data: { ticketId: ticket.id }
      };

      await createNotification(ticket.userId, notification);
    } catch (error) {
      safeLogger.error('Error notifying user of response:', error);
    }
  }

  private async notifyStaffOfUserResponse(ticket: SupportTicket): Promise<void> {
    try {
      if (ticket.assignedTo) {
        const notification = {
          type: 'user-response',
          title: `User Response to Ticket ${ticket.id}`,
          message: 'The user has responded to their support ticket.',
          data: { ticketId: ticket.id }
        };

        await createNotification(ticket.assignedTo, notification);
      }
    } catch (error) {
      safeLogger.error('Error notifying staff of user response:', error);
    }
  }

  // Utility methods
  private getEstimatedResponseTime(priority: string): string {
    const responseTimes = {
      'urgent': '1 hour',
      'high': '4 hours',
      'medium': '12 hours',
      'low': '24 hours'
    };
    return responseTimes[priority] || '24 hours';
  }

  private getStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private async calculateAverageResponseTime(tickets: SupportTicket[]): Promise<number> {
    // Calculate average time from ticket creation to first response
    // This would require ticket response data
    return 4.5; // Mock value in hours
  }

  private async calculateCustomerSatisfaction(tickets: SupportTicket[]): Promise<number> {
    // Calculate satisfaction from feedback surveys
    // This would require feedback data
    return 4.2; // Mock value out of 5
  }

  // Live chat integration
  async initiateLiveChat(userId: string, initialMessage?: string): Promise<string> {
    try {
      const chatSessionId = generateSecureId('chat');
      
      // In production, this would integrate with a live chat service
      // like Intercom, Zendesk Chat, or custom WebSocket implementation
      
      return chatSessionId;
    } catch (error) {
      safeLogger.error('Error initiating live chat:', error);
      throw new Error('Failed to initiate live chat');
    }
  }

  // Knowledge base management
  async createFAQItem(faqData: Omit<SupportFAQ, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupportFAQ> {
    try {
      const [faq] = await db.insert(supportFAQ).values({
        id: generateSecureId('faq'),
        ...faqData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return faq;
    } catch (error) {
      safeLogger.error('Error creating FAQ item:', error);
      throw new Error('Failed to create FAQ item');
    }
  }

  async updateFAQItem(faqId: string, updates: Partial<SupportFAQ>): Promise<SupportFAQ> {
    try {
      const [updatedFAQ] = await db.update(supportFAQ)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(supportFAQ.id, faqId))
        .returning();

      return updatedFAQ;
    } catch (error) {
      safeLogger.error('Error updating FAQ item:', error);
      throw new Error('Failed to update FAQ item');
    }
  }
}

export const ldaoSupportService = new LDAOSupportService();