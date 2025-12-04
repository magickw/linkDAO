import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock the database
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../src/db', () => ({
  db: mockDb,
}));

// Mock the schema
jest.mock('../src/db/schema', () => ({
  monthlyUpdates: { id: 'id', communityId: 'community_id' },
  communities: { id: 'id', creatorAddress: 'creator_address' },
  communityMembers: { communityId: 'community_id', userAddress: 'user_address', role: 'role' },
  users: { id: 'id', walletAddress: 'wallet_address' },
}));

// Import after mocking
import { MonthlyUpdateService } from '../src/services/monthlyUpdateService';

describe('MonthlyUpdateService', () => {
  let service: MonthlyUpdateService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MonthlyUpdateService();
  });

  describe('createMonthlyUpdate', () => {
    it('should validate month range', async () => {
      const result = await service.createMonthlyUpdate({
        communityId: 'test-community',
        title: 'Test Update',
        content: 'Test content',
        month: 13, // Invalid month
        year: 2024,
        createdBy: 'user-123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid month');
    });

    it('should validate month is at least 1', async () => {
      const result = await service.createMonthlyUpdate({
        communityId: 'test-community',
        title: 'Test Update',
        content: 'Test content',
        month: 0, // Invalid month
        year: 2024,
        createdBy: 'user-123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid month');
    });

    it('should return error when database is not initialized', async () => {
      // Temporarily set db to null
      jest.resetModules();
      jest.mock('../src/db', () => ({
        db: null,
      }));

      const { MonthlyUpdateService: FreshService } = await import('../src/services/monthlyUpdateService');
      const freshService = new FreshService();

      const result = await freshService.createMonthlyUpdate({
        communityId: 'test-community',
        title: 'Test Update',
        content: 'Test content',
        month: 1,
        year: 2024,
        createdBy: 'user-123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Database not initialized');
    });
  });

  describe('updateMonthlyUpdate', () => {
    it('should return error when update not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.updateMonthlyUpdate('non-existent-id', 'user-123', {
        title: 'Updated Title',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('deleteMonthlyUpdate', () => {
    it('should return error when update not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.deleteMonthlyUpdate('non-existent-id', 'user-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('getPublishedUpdates', () => {
    it('should return empty array when database is not initialized', async () => {
      jest.resetModules();
      jest.mock('../src/db', () => ({
        db: null,
      }));

      const { MonthlyUpdateService: FreshService } = await import('../src/services/monthlyUpdateService');
      const freshService = new FreshService();

      const result = await freshService.getPublishedUpdates('test-community');

      expect(result).toEqual([]);
    });

    it('should return published updates', async () => {
      const mockUpdates = [
        {
          id: 'update-1',
          communityId: 'test-community',
          title: 'December Update',
          content: 'Content',
          month: 12,
          year: 2024,
          isPublished: true,
          mediaCids: '[]',
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockUpdates),
            }),
          }),
        }),
      });

      const result = await service.getPublishedUpdates('test-community');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('December Update');
    });
  });

  describe('getMonthlyUpdate', () => {
    it('should return null when database is not initialized', async () => {
      jest.resetModules();
      jest.mock('../src/db', () => ({
        db: null,
      }));

      const { MonthlyUpdateService: FreshService } = await import('../src/services/monthlyUpdateService');
      const freshService = new FreshService();

      const result = await freshService.getMonthlyUpdate('test-id');

      expect(result).toBeNull();
    });

    it('should return null when update not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getMonthlyUpdate('non-existent-id');

      expect(result).toBeNull();
    });

    it('should parse mediaCids JSON', async () => {
      const mockUpdate = {
        id: 'update-1',
        mediaCids: '["cid1", "cid2"]',
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUpdate]),
          }),
        }),
      });

      const result = await service.getMonthlyUpdate('update-1');

      expect(result).not.toBeNull();
      expect(result?.mediaCids).toEqual(['cid1', 'cid2']);
    });
  });

  describe('getLatestUpdate', () => {
    it('should return null when no updates exist', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await service.getLatestUpdate('test-community');

      expect(result).toBeNull();
    });
  });

  describe('getUpdateForMonth', () => {
    it('should return update for specific month and year', async () => {
      const mockUpdate = {
        id: 'update-1',
        month: 11,
        year: 2024,
        mediaCids: null,
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUpdate]),
          }),
        }),
      });

      const result = await service.getUpdateForMonth('test-community', 11, 2024);

      expect(result).not.toBeNull();
      expect(result?.month).toBe(11);
      expect(result?.year).toBe(2024);
    });
  });
});
