import { supportService } from '../../services/supportService';

global.fetch = jest.fn();

describe('Support Service', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('createTicket', () => {
    it('should create a ticket', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'LDAO-123' } })
      });

      const result = await supportService.createTicket({
        subject: 'Test',
        description: 'Test description',
        category: 'technical',
        priority: 'medium'
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/support/tickets', expect.any(Object));
    });
  });

  describe('getTickets', () => {
    it('should fetch tickets', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });

      const result = await supportService.getTickets();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('getFAQ', () => {
    it('should fetch FAQ items', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });

      const result = await supportService.getFAQ('ldao');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
