import { SupportTicketingIntegrationService, SupportTicket } from '../services/supportTicketingIntegrationService';

describe('SupportTicketingIntegrationService', () => {
  let service: SupportTicketingIntegrationService;

  beforeEach(() => {
    service = new SupportTicketingIntegrationService();
  });

  describe('recordSupportTicket', () => {
    it('should create a new support ticket with generated ID and timestamps', () => {
      const ticketData = {
        title: 'Cannot connect wallet',
        description: 'I am having trouble connecting my MetaMask wallet to the platform',
        category: 'technical' as const,
        priority: 'medium' as const,
        status: 'open' as const,
        userEmail: 'user@example.com',
        tags: ['wallet', 'metamask'],
        metadata: {
          userAgent: 'Mozilla/5.0...',
          documentsViewed: ['/docs/wallet-connection.md'],
          searchQueries: ['wallet connect', 'metamask'],
          timeSpentInDocs: 120000
        }
      };

      const ticket = service.recordSupportTicket(ticketData);

      expect(ticket.id).toBeDefined();
      expect(ticket.title).toBe(ticketData.title);
      expect(ticket.description).toBe(ticketData.description);
      expect(ticket.category).toBe(ticketData.category);
      expect(ticket.priority).toBe(ticketData.priority);
      expect(ticket.status).toBe(ticketData.status);
      expect(ticket.userEmail).toBe(ticketData.userEmail);
      expect(ticket.createdAt).toBeInstanceOf(Date);
      expect(ticket.updatedAt).toBeInstanceOf(Date);
      expect(ticket.tags).toEqual(ticketData.tags);
      expect(ticket.metadata).toEqual(ticketData.metadata);
    });

    it('should analyze documentation correlation when documents are viewed', () => {
      const ticketData = {
        title: 'Staking rewards not showing',
        description: 'My staking rewards are not appearing in my dashboard',
        category: 'technical' as const,
        priority: 'high' as const,
        status: 'open' as const,
        userEmail: 'user@example.com',
        tags: ['staking', 'rewards'],
        metadata: {
          documentsViewed: ['/docs/staking-guide.md', '/docs/rewards-faq.md'],
          searchQueries: ['staking rewards', 'rewards not showing'],
          timeSpentInDocs: 300000,
          lastDocumentViewed: '/docs/rewards-faq.md'
        }
      };

      const ticket = service.recordSupportTicket(ticketData);
      const effectiveness = service.getDocumentationEffectivenessReport();

      expect(effectiveness.documentScores).toHaveLength(2);
      expect(effectiveness.documentScores.some(doc => 
        doc.path === '/docs/staking-guide.md'
      )).toBe(true);
      expect(effectiveness.documentScores.some(doc => 
        doc.path === '/docs/rewards-faq.md'
      )).toBe(true);
    });
  });

  describe('updateSupportTicket', () => {
    it('should update ticket status and set resolved timestamp', () => {
      const ticketData = {
        title: 'Test ticket',
        description: 'Test description',
        category: 'general' as const,
        priority: 'low' as const,
        status: 'open' as const,
        userEmail: 'user@example.com',
        tags: [],
        metadata: {}
      };

      const ticket = service.recordSupportTicket(ticketData);
      const originalUpdatedAt = ticket.updatedAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        const updatedTicket = service.updateSupportTicket(ticket.id, {
          status: 'resolved',
          assignedTo: 'support@example.com'
        });

        expect(updatedTicket.status).toBe('resolved');
        expect(updatedTicket.assignedTo).toBe('support@example.com');
        expect(updatedTicket.resolvedAt).toBeInstanceOf(Date);
        expect(updatedTicket.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });

    it('should throw error for non-existent ticket', () => {
      expect(() => {
        service.updateSupportTicket('non-existent-id', { status: 'resolved' });
      }).toThrow('Ticket non-existent-id not found');
    });
  });

  describe('getTicketsByUser', () => {
    it('should return tickets for specific user sorted by creation date', () => {
      const userEmail = 'user@example.com';
      
      // Create multiple tickets for the user
      const ticket1 = service.recordSupportTicket({
        title: 'First ticket',
        description: 'First description',
        category: 'general' as const,
        priority: 'low' as const,
        status: 'open' as const,
        userEmail,
        tags: [],
        metadata: {}
      });

      const ticket2 = service.recordSupportTicket({
        title: 'Second ticket',
        description: 'Second description',
        category: 'technical' as const,
        priority: 'medium' as const,
        status: 'open' as const,
        userEmail,
        tags: [],
        metadata: {}
      });

      // Create ticket for different user
      service.recordSupportTicket({
        title: 'Other user ticket',
        description: 'Other description',
        category: 'general' as const,
        priority: 'low' as const,
        status: 'open' as const,
        userEmail: 'other@example.com',
        tags: [],
        metadata: {}
      });

      const userTickets = service.getTicketsByUser(userEmail);

      expect(userTickets).toHaveLength(2);
      expect(userTickets[0].id).toBe(ticket2.id); // Most recent first
      expect(userTickets[1].id).toBe(ticket1.id);
      expect(userTickets.every(ticket => ticket.userEmail === userEmail)).toBe(true);
    });
  });

  describe('searchTickets', () => {
    beforeEach(() => {
      // Create test tickets
      service.recordSupportTicket({
        title: 'Wallet connection issue',
        description: 'Cannot connect MetaMask wallet',
        category: 'technical' as const,
        priority: 'high' as const,
        status: 'open' as const,
        userEmail: 'user1@example.com',
        tags: ['wallet', 'metamask'],
        metadata: {}
      });

      service.recordSupportTicket({
        title: 'Payment failed',
        description: 'Credit card payment was declined',
        category: 'payment' as const,
        priority: 'medium' as const,
        status: 'resolved' as const,
        userEmail: 'user2@example.com',
        tags: ['payment', 'credit-card'],
        metadata: {}
      });

      service.recordSupportTicket({
        title: 'Account locked',
        description: 'My account has been locked after multiple login attempts',
        category: 'account' as const,
        priority: 'critical' as const,
        status: 'in_progress' as const,
        userEmail: 'user3@example.com',
        tags: ['account', 'security'],
        metadata: {}
      });
    });

    it('should search tickets by title and description', () => {
      const results = service.searchTickets('wallet');
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Wallet');
    });

    it('should filter tickets by category', () => {
      const results = service.searchTickets('', { category: 'technical' });
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('technical');
    });

    it('should filter tickets by priority', () => {
      const results = service.searchTickets('', { priority: 'critical' });
      expect(results).toHaveLength(1);
      expect(results[0].priority).toBe('critical');
    });

    it('should filter tickets by status', () => {
      const results = service.searchTickets('', { status: 'resolved' });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('resolved');
    });

    it('should combine search query with filters', () => {
      const results = service.searchTickets('payment', { 
        category: 'payment',
        status: 'resolved'
      });
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Payment');
      expect(results[0].category).toBe('payment');
      expect(results[0].status).toBe('resolved');
    });
  });

  describe('generateSupportAnalytics', () => {
    beforeEach(() => {
      // Create test tickets with documentation interactions
      service.recordSupportTicket({
        title: 'Wallet issue',
        description: 'Wallet not connecting',
        category: 'technical' as const,
        priority: 'high' as const,
        status: 'resolved' as const,
        userEmail: 'user1@example.com',
        tags: ['wallet'],
        metadata: {
          documentsViewed: ['/docs/wallet-guide.md'],
          timeSpentInDocs: 180000
        }
      });

      service.recordSupportTicket({
        title: 'Payment problem',
        description: 'Payment failed',
        category: 'payment' as const,
        priority: 'medium' as const,
        status: 'open' as const,
        userEmail: 'user2@example.com',
        tags: ['payment'],
        metadata: {
          documentsViewed: ['/docs/payment-guide.md'],
          timeSpentInDocs: 120000
        }
      });

      service.recordSupportTicket({
        title: 'General question',
        description: 'How does this work?',
        category: 'general' as const,
        priority: 'low' as const,
        status: 'resolved' as const,
        userEmail: 'user3@example.com',
        tags: [],
        metadata: {} // No documentation viewed
      });
    });

    it('should generate comprehensive analytics', () => {
      const analytics = service.generateSupportAnalytics(30);

      expect(analytics.summary.totalTickets).toBe(3);
      expect(analytics.summary.ticketsWithDocViews).toBe(2);
      expect(analytics.summary.topIssueCategories).toHaveLength(3);
      expect(analytics.documentCorrelations).toHaveLength(2);
      expect(analytics.recommendations).toBeInstanceOf(Array);
    });

    it('should calculate documentation effectiveness', () => {
      const analytics = service.generateSupportAnalytics(30);
      
      // 2 out of 3 tickets had documentation views, so effectiveness should be around 33%
      expect(analytics.summary.documentationEffectiveness).toBe(33);
    });

    it('should identify content gaps', () => {
      // Create multiple tickets with similar issues
      for (let i = 0; i < 5; i++) {
        service.recordSupportTicket({
          title: `Staking issue ${i}`,
          description: 'Problems with staking rewards',
          category: 'technical' as const,
          priority: 'medium' as const,
          status: 'open' as const,
          userEmail: `user${i}@example.com`,
          tags: ['staking'],
          metadata: {}
        });
      }

      const analytics = service.generateSupportAnalytics(30);
      expect(analytics.contentGaps.length).toBeGreaterThan(0);
      
      const stakingGap = analytics.contentGaps.find(gap => 
        gap.topic.includes('staking')
      );
      expect(stakingGap).toBeDefined();
      expect(stakingGap?.ticketCount).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getDocumentationEffectivenessReport', () => {
    it('should return effectiveness report with document scores', () => {
      // Create tickets with documentation correlation
      service.recordSupportTicket({
        title: 'Wallet connection failed',
        description: 'Cannot connect wallet after reading guide',
        category: 'technical' as const,
        priority: 'high' as const,
        status: 'open' as const,
        userEmail: 'user@example.com',
        tags: ['wallet'],
        metadata: {
          documentsViewed: ['/docs/wallet-connection.md'],
          timeSpentInDocs: 300000
        }
      });

      service.recordSupportTicket({
        title: 'Still confused about staking',
        description: 'Read the staking guide but still confused',
        category: 'general' as const,
        priority: 'medium' as const,
        status: 'open' as const,
        userEmail: 'user2@example.com',
        tags: ['staking'],
        metadata: {
          documentsViewed: ['/docs/staking-guide.md'],
          timeSpentInDocs: 240000
        }
      });

      const report = service.getDocumentationEffectivenessReport();

      expect(report.overallScore).toBeLessThan(100);
      expect(report.documentScores).toHaveLength(2);
      expect(report.documentScores[0].score).toBeLessThan(100);
      expect(report.topIssues).toBeInstanceOf(Array);
    });

    it('should return perfect score when no tickets exist', () => {
      const report = service.getDocumentationEffectivenessReport();
      
      expect(report.overallScore).toBe(100);
      expect(report.documentScores).toHaveLength(0);
      expect(report.topIssues).toHaveLength(0);
    });
  });

  describe('configureIntegrations', () => {
    it('should configure external integrations', () => {
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

      expect(() => {
        service.configureIntegrations(config);
      }).not.toThrow();
    });
  });

  describe('correlation analysis', () => {
    it('should determine correlation type correctly', () => {
      const ticketData = {
        title: 'Issue after reading docs',
        description: 'Still having problems after reading the guide',
        category: 'technical' as const,
        priority: 'medium' as const,
        status: 'open' as const,
        userEmail: 'user@example.com',
        tags: [],
        metadata: {
          documentsViewed: ['/docs/troubleshooting.md'],
          lastDocumentViewed: '/docs/troubleshooting.md',
          searchQueries: ['troubleshooting', 'problems'],
          timeSpentInDocs: 180000
        }
      };

      const ticket = service.recordSupportTicket(ticketData);
      const report = service.getDocumentationEffectivenessReport();
      
      const docScore = report.documentScores.find(doc => 
        doc.path === '/docs/troubleshooting.md'
      );
      
      expect(docScore).toBeDefined();
      expect(docScore?.ticketCount).toBe(1);
      expect(docScore?.score).toBeLessThan(100);
    });

    it('should calculate correlation strength based on user behavior', () => {
      // High correlation: user spent long time on document and it was last viewed
      const highCorrelationTicket = service.recordSupportTicket({
        title: 'High correlation issue',
        description: 'Issue after extensive reading',
        category: 'technical' as const,
        priority: 'critical' as const,
        status: 'open' as const,
        userEmail: 'user1@example.com',
        tags: [],
        metadata: {
          documentsViewed: ['/docs/advanced-guide.md'],
          lastDocumentViewed: '/docs/advanced-guide.md',
          timeSpentInDocs: 600000, // 10 minutes
          searchQueries: ['advanced guide']
        }
      });

      // Low correlation: user barely looked at document
      const lowCorrelationTicket = service.recordSupportTicket({
        title: 'Low correlation issue',
        description: 'Quick question',
        category: 'general' as const,
        priority: 'low' as const,
        status: 'open' as const,
        userEmail: 'user2@example.com',
        tags: [],
        metadata: {
          documentsViewed: ['/docs/basic-guide.md'],
          timeSpentInDocs: 30000, // 30 seconds
          searchQueries: []
        }
      });

      const report = service.getDocumentationEffectivenessReport();
      
      const advancedDoc = report.documentScores.find(doc => 
        doc.path === '/docs/advanced-guide.md'
      );
      const basicDoc = report.documentScores.find(doc => 
        doc.path === '/docs/basic-guide.md'
      );

      // Advanced guide should have lower effectiveness due to high correlation
      expect(advancedDoc?.score).toBeLessThan(basicDoc?.score || 100);
    });
  });
});
