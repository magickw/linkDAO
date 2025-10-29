import { ldaoSupportService } from '../../services/ldaoSupportService';

describe('LDAO Support Service', () => {
  describe('Ticket Management', () => {
    it('should create a support ticket', async () => {
      const ticket = await ldaoSupportService.createTicket({
        userId: 'test-user',
        subject: 'Test ticket',
        description: 'This is a test ticket description',
        category: 'technical',
        priority: 'medium',
        status: 'open'
      });
      
      expect(ticket).toBeDefined();
      expect(ticket.id).toMatch(/^LDAO-/);
      expect(ticket.subject).toBe('Test ticket');
    });

    it('should fetch tickets by user', async () => {
      const tickets = await ldaoSupportService.getTicketsByUser('test-user');
      expect(Array.isArray(tickets)).toBe(true);
    });

    it('should update ticket status', async () => {
      const ticket = await ldaoSupportService.createTicket({
        userId: 'test-user',
        subject: 'Status test',
        description: 'Testing status update',
        category: 'technical',
        priority: 'low',
        status: 'open'
      });

      const updated = await ldaoSupportService.updateTicketStatus(ticket.id, 'resolved');
      expect(updated.status).toBe('resolved');
      expect(updated.resolvedAt).toBeDefined();
    });
  });

  describe('FAQ Management', () => {
    it('should fetch FAQ by category', async () => {
      const faqs = await ldaoSupportService.getFAQByCategory('ldao');
      expect(Array.isArray(faqs)).toBe(true);
    });

    it('should search FAQ', async () => {
      const results = await ldaoSupportService.searchFAQ('token');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should mark FAQ as helpful', async () => {
      await expect(
        ldaoSupportService.markFAQHelpful('faq-1', true)
      ).resolves.not.toThrow();
    });
  });

  describe('Live Chat', () => {
    it('should initiate live chat session', async () => {
      const sessionId = await ldaoSupportService.initiateLiveChat('test-user', 'Hello');
      expect(sessionId).toMatch(/^chat-/);
    });
  });

  describe('Metrics', () => {
    it('should calculate support metrics', async () => {
      const metrics = await ldaoSupportService.getSupportMetrics('week');
      expect(metrics).toHaveProperty('totalTickets');
      expect(metrics).toHaveProperty('openTickets');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('resolutionRate');
    });
  });
});
