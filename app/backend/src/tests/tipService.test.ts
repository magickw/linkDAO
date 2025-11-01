import { TipService } from '../services/tipService';

// Mock the database
jest.mock('../db', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    where: jest.fn().mockReturnThis(),
    and: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
  }
}));

describe('TipService', () => {
  let tipService: TipService;

  beforeEach(() => {
    tipService = new TipService();
    jest.clearAllMocks();
  });

  describe('recordTip', () => {
    it('should record a new tip', async () => {
      const mockTip = {
        id: 1,
        postId: 1,
        fromUserId: 'user1',
        toUserId: 'user2',
        amount: '100',
        token: 'LDAO',
        message: 'Great post!',
        txHash: '0x123',
        createdAt: new Date(),
      };

      (require('../db').db.insert().values().returning as jest.Mock).mockResolvedValue([mockTip]);

      const result = await tipService.recordTip(
        1,
        'user1',
        'user2',
        '100',
        'LDAO',
        'Great post!',
        '0x123'
      );

      expect(result).toEqual(mockTip);
    });
  });

  describe('getTipsForPost', () => {
    it('should get tips for a specific post', async () => {
      const mockTips = [
        {
          id: 1,
          postId: 1,
          fromUserId: 'user1',
          toUserId: 'user2',
          amount: '100',
          token: 'LDAO',
          message: 'Great post!',
          txHash: '0x123',
          createdAt: new Date(),
        }
      ];

      (require('../db').db.select().from().where as jest.Mock).mockResolvedValue(mockTips);

      const result = await tipService.getTipsForPost(1);

      expect(result).toEqual(mockTips);
    });
  });

  describe('getTotalTipsReceived', () => {
    it('should calculate total tips received by a user', async () => {
      const mockTips = [
        { total: '100' },
        { total: '50' },
        { total: '25' }
      ];

      (require('../db').db.select().from().where as jest.Mock).mockResolvedValue(mockTips);

      const result = await tipService.getTotalTipsReceived('user1');

      expect(result).toBe(175);
    });
  });

  describe('getTotalTipsSent', () => {
    it('should calculate total tips sent by a user', async () => {
      const mockTips = [
        { total: '100' },
        { total: '50' }
      ];

      (require('../db').db.select().from().where as jest.Mock).mockResolvedValue(mockTips);

      const result = await tipService.getTotalTipsSent('user1');

      expect(result).toBe(150);
    });
  });
});
