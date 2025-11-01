import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { supportTicketingIntegrationService, SupportTicket } from '../services/supportTicketingIntegrationService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { logger } from '../utils/logger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class SupportTicketingController {
  /**
   * Create a new support ticket
   */
  async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const ticketData = req.body;
      
      // Validate required fields
      if (!ticketData.title || !ticketData.description || !ticketData.userEmail) {
        res.status(400).json({
          error: 'Missing required fields: title, description, userEmail'
        });
        return;
      }

      const ticket = supportTicketingIntegrationService.recordSupportTicket(ticketData);
      
      res.status(201).json({
        success: true,
        ticket: {
          id: ticket.id,
          title: ticket.title,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.createdAt
        }
      });
    } catch (error) {
      logger.error('Error creating support ticket:', error);
      res.status(500).json({
        error: 'Failed to create support ticket'
      });
    }
  }

  /**
   * Update support ticket
   */
  async updateTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const updates = req.body;

      const ticket = supportTicketingIntegrationService.updateSupportTicket(ticketId, updates);
      
      res.json({
        success: true,
        ticket: {
          id: ticket.id,
          title: ticket.title,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          updatedAt: ticket.updatedAt,
          resolvedAt: ticket.resolvedAt
        }
      });
    } catch (error) {
      logger.error('Error updating support ticket:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Ticket not found'
        });
      } else {
        res.status(500).json({
          error: 'Failed to update support ticket'
        });
      }
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const ticket = supportTicketingIntegrationService.getTicketById(ticketId);

      if (!ticket) {
        res.status(404).json({
          error: 'Ticket not found'
        });
        return;
      }

      res.json({
        success: true,
        ticket
      });
    } catch (error) {
      logger.error('Error fetching support ticket:', error);
      res.status(500).json({
        error: 'Failed to fetch support ticket'
      });
    }
  }

  /**
   * Get tickets by user
   */
  async getUserTickets(req: Request, res: Response): Promise<void> {
    try {
      const { userEmail } = req.params;
      const tickets = supportTicketingIntegrationService.getTicketsByUser(userEmail);

      res.json({
        success: true,
        tickets: tickets.map(ticket => ({
          id: ticket.id,
          title: ticket.title,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          resolvedAt: ticket.resolvedAt
        }))
      });
    } catch (error) {
      logger.error('Error fetching user tickets:', error);
      res.status(500).json({
        error: 'Failed to fetch user tickets'
      });
    }
  }

  /**
   * Search tickets
   */
  async searchTickets(req: Request, res: Response): Promise<void> {
    try {
      const { q: query } = req.query;
      const filters = {
        category: req.query.category as string,
        priority: req.query.priority as string,
        status: req.query.status as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };

      const tickets = supportTicketingIntegrationService.searchTickets(
        query as string || '',
        filters
      );

      res.json({
        success: true,
        tickets: tickets.map(ticket => ({
          id: ticket.id,
          title: ticket.title,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          userEmail: ticket.userEmail,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          resolvedAt: ticket.resolvedAt,
          tags: ticket.tags
        })),
        total: tickets.length
      });
    } catch (error) {
      logger.error('Error searching tickets:', error);
      res.status(500).json({
        error: 'Failed to search tickets'
      });
    }
  }

  /**
   * Get support analytics
   */
  async getSupportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = supportTicketingIntegrationService.generateSupportAnalytics(days);

      res.json({
        success: true,
        analytics,
        period: `${days} days`
      });
    } catch (error) {
      logger.error('Error generating support analytics:', error);
      res.status(500).json({
        error: 'Failed to generate support analytics'
      });
    }
  }

  /**
   * Get documentation effectiveness report
   */
  async getDocumentationEffectiveness(req: Request, res: Response): Promise<void> {
    try {
      const report = supportTicketingIntegrationService.getDocumentationEffectivenessReport();

      res.json({
        success: true,
        report
      });
    } catch (error) {
      logger.error('Error generating documentation effectiveness report:', error);
      res.status(500).json({
        error: 'Failed to generate documentation effectiveness report'
      });
    }
  }

  /**
   * Configure external integrations
   */
  async configureIntegrations(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      // Validate configuration
      if (config.zendesk && (!config.zendesk.apiKey || !config.zendesk.subdomain || !config.zendesk.email)) {
        res.status(400).json({
          error: 'Invalid Zendesk configuration: missing apiKey, subdomain, or email'
        });
        return;
      }

      if (config.intercom && !config.intercom.accessToken) {
        res.status(400).json({
          error: 'Invalid Intercom configuration: missing accessToken'
        });
        return;
      }

      if (config.freshdesk && (!config.freshdesk.apiKey || !config.freshdesk.domain)) {
        res.status(400).json({
          error: 'Invalid Freshdesk configuration: missing apiKey or domain'
        });
        return;
      }

      supportTicketingIntegrationService.configureIntegrations(config);

      res.json({
        success: true,
        message: 'Integrations configured successfully'
      });
    } catch (error) {
      logger.error('Error configuring integrations:', error);
      res.status(500).json({
        error: 'Failed to configure integrations'
      });
    }
  }

  /**
   * Record documentation interaction for correlation
   */
  async recordDocumentationInteraction(req: Request, res: Response): Promise<void> {
    try {
      const {
        sessionId,
        documentPath,
        timeSpent,
        searchQuery,
        userAgent,
        referrer
      } = req.body;

      // Store interaction data for potential correlation with future tickets
      // This would typically be stored in a session store or database
      logger.info('Documentation interaction recorded:', {
        sessionId,
        documentPath,
        timeSpent,
        searchQuery,
        userAgent,
        referrer,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: 'Documentation interaction recorded'
      });
    } catch (error) {
      logger.error('Error recording documentation interaction:', error);
      res.status(500).json({
        error: 'Failed to record documentation interaction'
      });
    }
  }

  /**
   * Get ticket statistics
   */
  async getTicketStatistics(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = supportTicketingIntegrationService.generateSupportAnalytics(days);

      const statistics = {
        totalTickets: analytics.summary.totalTickets,
        ticketsWithDocViews: analytics.summary.ticketsWithDocViews,
        averageResolutionTime: analytics.summary.averageResolutionTime,
        documentationEffectiveness: analytics.summary.documentationEffectiveness,
        topCategories: analytics.summary.topIssueCategories,
        contentGaps: analytics.contentGaps.length,
        preventionOpportunities: analytics.preventionOpportunities.length,
        period: `${days} days`
      };

      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      logger.error('Error generating ticket statistics:', error);
      res.status(500).json({
        error: 'Failed to generate ticket statistics'
      });
    }
  }
}

export const supportTicketingController = new SupportTicketingController();