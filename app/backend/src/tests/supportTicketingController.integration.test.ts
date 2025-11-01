import request from 'supertest';
import express from 'express';
import { supportTicketingRoutes } from '../routes/supportTicketingRoutes';
import { supportTicketingIntegrationService } from '../services/supportTicketingIntegrationService';

// Mock middleware
jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => next()
}));

jest.mock('../middleware/adminAuthMiddleware', () => ({
  adminAuthMiddleware: (req: any, res: any, next: any) => next()
}));

const app = express();
app.use(express.json());
app.use('/api/support', supportTicketingRoutes);

describe('Support Ticketing Controller Integration', () => {
  beforeEach(() => {
    // Clear any existing tickets
    jest.clearAllMocks();
  });

  describe('POST /api/support/tickets', () => {
    it('should create a new support ticket', async () => {
      const ticketData = {
        title: 'Cannot connect wallet',
        description: 'I am having trouble connecting my MetaMask wallet',
        category: 'technical',
        priority: 'medium',
        status: 'open',
        userEmail: 'user@example.com',
        tags: ['wallet', 'metamask'],
        metadata: {
          userAgent: 'Mozilla/5.0...',
          documentsViewed: ['/docs/wallet-connection.md'],
          searchQueries: ['wallet connect'],
          timeSpentInDocs: 120000
        }
      };

      const response = await request(app)
        .post('/api/support/tickets')
        .send(ticketData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.ticket).toHaveProperty('id');
      expect(response.body.ticket.title).toBe(ticketData.title);
      expect(response.body.ticket.category).toBe(ticketData.category);
      expect(response.body.ticket.priority).toBe(ticketData.priority);
      expect(response.body.ticket.status).toBe(ticketData.status);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        title: 'Test ticket'
        // Missing description and userEmail
      };

      const response = await request(app)
        .post('/api/support/tickets')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('PUT /api/support/tickets/:ticketId', () => {
    it('should update an existing ticket', async () => {
      // First create a ticket
      const ticketData = {
        title: 'Test ticket',
        description: 'Test description',
        category: 'general',
        priority: 'low',
        status: 'open',
        userEmail: 'user@example.com',
        tags: [],
        metadata: {}
      };

      const createResponse = await request(app)
        .post('/api/support/tickets')
        .send(ticketData)
        .expect(201);

      const ticketId = createResponse.body.ticket.id;

      // Update the ticket
      const updates = {
        status: 'resolved',
        assignedTo: 'support@example.com'
      };

      const updateResponse = await request(app)
        .put(`/api/support/tickets/${ticketId}`)
        .send(updates)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.ticket.status).toBe('resolved');
      expect(updateResponse.body.ticket.resolvedAt).toBeDefined();
    });

    it('should return 404 for non-existent ticket', async () => {
      const updates = { status: 'resolved' };

      const response = await request(app)
        .put('/api/support/tickets/non-existent-id')
        .send(updates)
        .expect(404);

      expect(response.body.error).toBe('Ticket not found');
    });
  });

  describe('GET /api/support/tickets/:ticketId', () => {
    it('should retrieve a ticket by ID', async () => {
      // Create a ticket first
      const ticketData = {
        title: 'Retrieve test ticket',
        description: 'Test description for retrieval',
        category: 'general',
        priority: 'medium',
        status: 'open',
        userEmail: 'user@example.com',
        tags: ['test'],
        metadata: {}
      };

      const createResponse = await request(app)
        .post('/api/support/tickets')
        .send(ticketData)
        .expect(201);

      const ticketId = createResponse.body.ticket.id;

      const getResponse = await request(app)
        .get(`/api/support/tickets/${ticketId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.ticket.id).toBe(ticketId);
      expect(getResponse.body.ticket.title).toBe(ticketData.title);
    });

    it('should return 404 for non-existent ticket', async () => {
      const response = await request(app)
        .get('/api/support/tickets/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Ticket not found');
    });
  });

  describe('GET /api/support/tickets/user/:userEmail', () => {
    it('should retrieve tickets for a specific user', async () => {
      const userEmail = 'testuser@example.com';

      // Create multiple tickets for the user
      const ticket1Data = {
        title: 'First ticket',
        description: 'First description',
        category: 'general',
        priority: 'low',
        status: 'open',
        userEmail,
        tags: [],
        metadata: {}
      };

      const ticket2Data = {
        title: 'Second ticket',
        description: 'Second description',
        category: 'technical',
        priority: 'high',
        status: 'resolved',
        userEmail,
        tags: [],
        metadata: {}
      };

      await request(app).post('/api/support/tickets').send(ticket1Data);
      await request(app).post('/api/support/tickets').send(ticket2Data);

      const response = await request(app)
        .get(`/api/support/tickets/user/${userEmail}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(2);
      expect(response.body.tickets.every((ticket: any) => 
        ticket.userEmail === userEmail
      )).toBe(true);
    });
  });

  describe('GET /api/support/tickets (search)', () => {
    beforeEach(async () => {
      // Create test tickets
      const tickets = [
        {
          title: 'Wallet connection issue',
          description: 'Cannot connect MetaMask wallet',
          category: 'technical',
          priority: 'high',
          status: 'open',
          userEmail: 'user1@example.com',
          tags: ['wallet', 'metamask'],
          metadata: {}
        },
        {
          title: 'Payment failed',
          description: 'Credit card payment was declined',
          category: 'payment',
          priority: 'medium',
          status: 'resolved',
          userEmail: 'user2@example.com',
          tags: ['payment', 'credit-card'],
          metadata: {}
        },
        {
          title: 'Account locked',
          description: 'Account locked after failed login attempts',
          category: 'account',
          priority: 'critical',
          status: 'in_progress',
          userEmail: 'user3@example.com',
          tags: ['account', 'security'],
          metadata: {}
        }
      ];

      for (const ticket of tickets) {
        await request(app).post('/api/support/tickets').send(ticket);
      }
    });

    it('should search tickets by query', async () => {
      const response = await request(app)
        .get('/api/support/tickets?q=wallet')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].title).toContain('Wallet');
    });

    it('should filter tickets by category', async () => {
      const response = await request(app)
        .get('/api/support/tickets?category=technical')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].category).toBe('technical');
    });

    it('should filter tickets by priority', async () => {
      const response = await request(app)
        .get('/api/support/tickets?priority=critical')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].priority).toBe('critical');
    });

    it('should filter tickets by status', async () => {
      const response = await request(app)
        .get('/api/support/tickets?status=resolved')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].status).toBe('resolved');
    });

    it('should combine query and filters', async () => {
      const response = await request(app)
        .get('/api/support/tickets?q=payment&category=payment&status=resolved')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].title).toContain('Payment');
      expect(response.body.tickets[0].category).toBe('payment');
      expect(response.body.tickets[0].status).toBe('resolved');
    });
  });

  describe('GET /api/support/analytics', () => {
    beforeEach(async () => {
      // Create test tickets with documentation interactions
      const tickets = [
        {
          title: 'Wallet issue',
          description: 'Wallet not connecting',
          category: 'technical',
          priority: 'high',
          status: 'resolved',
          userEmail: 'user1@example.com',
          tags: ['wallet'],
          metadata: {
            documentsViewed: ['/docs/wallet-guide.md'],
            timeSpentInDocs: 180000
          }
        },
        {
          title: 'Payment problem',
          description: 'Payment failed',
          category: 'payment',
          priority: 'medium',
          status: 'open',
          userEmail: 'user2@example.com',
          tags: ['payment'],
          metadata: {
            documentsViewed: ['/docs/payment-guide.md'],
            timeSpentInDocs: 120000
          }
        }
      ];

      for (const ticket of tickets) {
        await request(app).post('/api/support/tickets').send(ticket);
      }
    });

    it('should generate support analytics', async () => {
      const response = await request(app)
        .get('/api/support/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toHaveProperty('summary');
      expect(response.body.analytics).toHaveProperty('documentCorrelations');
      expect(response.body.analytics).toHaveProperty('contentGaps');
      expect(response.body.analytics).toHaveProperty('preventionOpportunities');
      expect(response.body.analytics).toHaveProperty('recommendations');
      expect(response.body.period).toBe('30 days');
    });

    it('should accept custom time period', async () => {
      const response = await request(app)
        .get('/api/support/analytics?days=7')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.period).toBe('7 days');
    });
  });

  describe('GET /api/support/analytics/statistics', () => {
    it('should return ticket statistics', async () => {
      // Create a test ticket
      await request(app).post('/api/support/tickets').send({
        title: 'Test ticket for stats',
        description: 'Test description',
        category: 'general',
        priority: 'low',
        status: 'open',
        userEmail: 'user@example.com',
        tags: [],
        metadata: {}
      });

      const response = await request(app)
        .get('/api/support/analytics/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.statistics).toHaveProperty('totalTickets');
      expect(response.body.statistics).toHaveProperty('ticketsWithDocViews');
      expect(response.body.statistics).toHaveProperty('averageResolutionTime');
      expect(response.body.statistics).toHaveProperty('documentationEffectiveness');
      expect(response.body.statistics).toHaveProperty('topCategories');
      expect(response.body.statistics).toHaveProperty('contentGaps');
      expect(response.body.statistics).toHaveProperty('preventionOpportunities');
      expect(response.body.statistics.period).toBe('30 days');
    });
  });

  describe('GET /api/support/analytics/documentation-effectiveness', () => {
    it('should return documentation effectiveness report', async () => {
      // Create ticket with documentation correlation
      await request(app).post('/api/support/tickets').send({
        title: 'Issue after reading docs',
        description: 'Still having problems after reading guide',
        category: 'technical',
        priority: 'medium',
        status: 'open',
        userEmail: 'user@example.com',
        tags: [],
        metadata: {
          documentsViewed: ['/docs/troubleshooting.md'],
          timeSpentInDocs: 180000
        }
      });

      const response = await request(app)
        .get('/api/support/analytics/documentation-effectiveness')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toHaveProperty('overallScore');
      expect(response.body.report).toHaveProperty('documentScores');
      expect(response.body.report).toHaveProperty('topIssues');
      expect(response.body.report.documentScores).toHaveLength(1);
    });
  });

  describe('POST /api/support/integrations/configure', () => {
    it('should configure external integrations', async () => {
      const config = {
        zendesk: {
          apiKey: 'test-api-key',
          subdomain: 'test-subdomain',
          email: 'admin@example.com'
        },
        slack: {
          webhookUrl: 'https://hooks.slack.com/test'
        }
      };

      const response = await request(app)
        .post('/api/support/integrations/configure')
        .send(config)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Integrations configured successfully');
    });

    it('should validate Zendesk configuration', async () => {
      const invalidConfig = {
        zendesk: {
          apiKey: 'test-api-key'
          // Missing subdomain and email
        }
      };

      const response = await request(app)
        .post('/api/support/integrations/configure')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.error).toContain('Invalid Zendesk configuration');
    });

    it('should validate Intercom configuration', async () => {
      const invalidConfig = {
        intercom: {
          // Missing accessToken
        }
      };

      const response = await request(app)
        .post('/api/support/integrations/configure')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.error).toContain('Invalid Intercom configuration');
    });

    it('should validate Freshdesk configuration', async () => {
      const invalidConfig = {
        freshdesk: {
          apiKey: 'test-api-key'
          // Missing domain
        }
      };

      const response = await request(app)
        .post('/api/support/integrations/configure')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.error).toContain('Invalid Freshdesk configuration');
    });
  });

  describe('POST /api/support/interactions', () => {
    it('should record documentation interaction', async () => {
      const interactionData = {
        sessionId: 'session-123',
        documentPath: '/docs/wallet-guide.md',
        timeSpent: 120000,
        searchQuery: 'wallet connection',
        userAgent: 'Mozilla/5.0...',
        referrer: 'https://example.com'
      };

      const response = await request(app)
        .post('/api/support/interactions')
        .send(interactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Documentation interaction recorded');
    });
  });
});
