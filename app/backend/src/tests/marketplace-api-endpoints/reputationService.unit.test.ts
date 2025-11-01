import { reputationService } from '../../services/reputationService';
import { db } from '../../db/connection';
import { userReputation, reputationHistoryMarketplace } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';

// Mock the database connection
jest.mock('../../db/connection', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    execute: jest.fn(),
  },
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ReputationService', () => {
  let mockDb: jest.Mocked<typeof db>;

  beforeEach(() => {
    mockDb = db as jest.Mocked<typeof db>;
    jest.clearAllMocks();
    // Clear cache before each test
    reputationService.clearCache();
  });

  describe('getReputation', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockReputationData = {
      walletAddress: validWalletAddress,
      reputationScore: '75.50',
      totalTransactions: 25,
      positiveReviews: 20,
      negativeReviews: 3,
      neutralReviews: 2,
      successfulSales: 15,
      successfulPurchases: 10,
      disputedTransactions: 1,
      resolvedDisputes: 1,
      averageResponseTime: '2.5',
      completionRate: '96.00',
      updatedAt: new Date('2023-01-01'),
    };

    it('should return reputation data when found in database', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockReputationData]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.getReputation(validWalletAddress);

      expect(result).toEqual({
        walletAddress: validWalletAddress,
        score: 75.5,
        totalTransactions: 25,
        positiveReviews: 20,
        negativeReviews: 3,
        neutralReviews: 2,
        successfulSales: 15,
        successfulPurchases: 10,
        disputedTransactions: 1,
        resolvedDisputes: 1,
        averageResponseTime: 2.5,
        completionRate: 96.0,
        lastUpdated: mockReputationData.updatedAt,
      });

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(userReputation);
      expect(mockSelect.where).toHaveBeenCalled();
      expect(mockSelect.limit).toHaveBeenCalledWith(1);
    });

    it('should return default reputation data when not found in database', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]), // Empty result
      };
      mockDb.select.mockReturnValue(mockSelect);

      // Mock the createInitialReputation call
      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await reputationService.getReputation(validWalletAddress);

      expect(result).toEqual({
        walletAddress: validWalletAddress,
        score: 50.0,
        totalTransactions: 0,
        positiveReviews: 0,
        negativeReviews: 0,
        neutralReviews: 0,
        successfulSales: 0,
        successfulPurchases: 0,
        disputedTransactions: 0,
        resolvedDisputes: 0,
        averageResponseTime: 0,
        completionRate: 100,
        lastUpdated: expect.any(Date),
      });

      // Should attempt to create initial reputation record
      expect(mockDb.insert).toHaveBeenCalledWith(userReputation);
    });

    it('should return cached data when available and not expired', async () => {
      // First call to populate cache
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockReputationData]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      await reputationService.getReputation(validWalletAddress);

      // Clear mock calls
      jest.clearAllMocks();

      // Second call should use cache
      const result = await reputationService.getReputation(validWalletAddress);

      expect(result.score).toBe(75.5);
      expect(mockDb.select).not.toHaveBeenCalled(); // Should not hit database
    });

    it('should handle database errors and return default values', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.getReputation(validWalletAddress);

      expect(result).toEqual({
        walletAddress: validWalletAddress,
        score: 50.0,
        totalTransactions: 0,
        positiveReviews: 0,
        negativeReviews: 0,
        neutralReviews: 0,
        successfulSales: 0,
        successfulPurchases: 0,
        disputedTransactions: 0,
        resolvedDisputes: 0,
        averageResponseTime: 0,
        completionRate: 100,
        lastUpdated: expect.any(Date),
      });
    });

    it('should handle null/undefined values in database response', async () => {
      const mockReputationDataWithNulls = {
        walletAddress: validWalletAddress,
        reputationScore: null,
        totalTransactions: null,
        positiveReviews: null,
        negativeReviews: null,
        neutralReviews: null,
        successfulSales: null,
        successfulPurchases: null,
        disputedTransactions: null,
        resolvedDisputes: null,
        averageResponseTime: null,
        completionRate: null,
        updatedAt: null,
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockReputationDataWithNulls]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.getReputation(validWalletAddress);

      expect(result).toEqual({
        walletAddress: validWalletAddress,
        score: 0,
        totalTransactions: 0,
        positiveReviews: 0,
        negativeReviews: 0,
        neutralReviews: 0,
        successfulSales: 0,
        successfulPurchases: 0,
        disputedTransactions: 0,
        resolvedDisputes: 0,
        averageResponseTime: 0,
        completionRate: 100,
        lastUpdated: expect.any(Date),
      });
    });
  });

  describe('updateReputation', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockTransaction = {
      eventType: 'positive_review',
      transactionId: 'tx-123',
      reviewId: 'review-456',
      metadata: { rating: 5 },
    };

    it('should update reputation successfully', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await reputationService.updateReputation(validWalletAddress, mockTransaction);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('update_reputation_score'),
        })
      );
    });

    it('should invalidate cache after update', async () => {
      // First populate cache
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{
          walletAddress: validWalletAddress,
          reputationScore: '75.50',
          totalTransactions: 25,
          updatedAt: new Date(),
        }]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      await reputationService.getReputation(validWalletAddress);

      // Clear mocks
      jest.clearAllMocks();

      // Update reputation
      mockDb.execute.mockResolvedValue(undefined);
      await reputationService.updateReputation(validWalletAddress, mockTransaction);

      // Next call should hit database (cache invalidated)
      mockDb.select.mockReturnValue(mockSelect);
      await reputationService.getReputation(validWalletAddress);

      expect(mockDb.select).toHaveBeenCalled(); // Should hit database again
    });

    it('should handle database errors during update', async () => {
      mockDb.execute.mockRejectedValue(new Error('Database update failed'));

      await expect(
        reputationService.updateReputation(validWalletAddress, mockTransaction)
      ).rejects.toThrow('Failed to update reputation: Database update failed');
    });

    it('should handle transaction with minimal data', async () => {
      const minimalTransaction = {
        eventType: 'transaction_completed',
      };

      mockDb.execute.mockResolvedValue(undefined);

      await reputationService.updateReputation(validWalletAddress, minimalTransaction);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('update_reputation_score'),
        })
      );
    });
  });

  describe('calculateReputation', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';

    it('should calculate reputation successfully', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      // Mock getReputation call
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{
          walletAddress: validWalletAddress,
          reputationScore: '80.25',
          totalTransactions: 30,
          updatedAt: new Date(),
        }]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.calculateReputation(validWalletAddress);

      expect(result).toBe(80.25);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('calculate_reputation_metrics'),
        })
      );
    });

    it('should handle calculation errors', async () => {
      mockDb.execute.mockRejectedValue(new Error('Calculation failed'));

      await expect(
        reputationService.calculateReputation(validWalletAddress)
      ).rejects.toThrow('Failed to calculate reputation: Calculation failed');
    });
  });

  describe('getReputationHistory', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockHistoryData = [
      {
        id: 'history-1',
        eventType: 'positive_review',
        scoreChange: '2.5',
        previousScore: '75.0',
        newScore: '77.5',
        description: 'Received positive review',
        createdAt: new Date('2023-01-01'),
      },
      {
        id: 'history-2',
        eventType: 'transaction_completed',
        scoreChange: '1.0',
        previousScore: '74.0',
        newScore: '75.0',
        description: 'Completed transaction',
        createdAt: new Date('2023-01-02'),
      },
    ];

    it('should return reputation history successfully', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockHistoryData),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.getReputationHistory(validWalletAddress, 10);

      expect(result).toEqual([
        {
          id: 'history-1',
          eventType: 'positive_review',
          scoreChange: 2.5,
          previousScore: 75.0,
          newScore: 77.5,
          description: 'Received positive review',
          createdAt: mockHistoryData[0].createdAt,
        },
        {
          id: 'history-2',
          eventType: 'transaction_completed',
          scoreChange: 1.0,
          previousScore: 74.0,
          newScore: 75.0,
          description: 'Completed transaction',
          createdAt: mockHistoryData[1].createdAt,
        },
      ]);

      expect(mockSelect.from).toHaveBeenCalledWith(reputationHistoryMarketplace);
      expect(mockSelect.where).toHaveBeenCalled();
      expect(mockSelect.orderBy).toHaveBeenCalled();
      expect(mockSelect.limit).toHaveBeenCalledWith(10);
    });

    it('should use default limit when not specified', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      await reputationService.getReputationHistory(validWalletAddress);

      expect(mockSelect.limit).toHaveBeenCalledWith(50); // Default limit
    });

    it('should handle database errors and return empty array', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.getReputationHistory(validWalletAddress);

      expect(result).toEqual([]);
    });

    it('should handle null/undefined values in history data', async () => {
      const mockHistoryDataWithNulls = [
        {
          id: 'history-1',
          eventType: 'positive_review',
          scoreChange: null,
          previousScore: null,
          newScore: null,
          description: null,
          createdAt: new Date('2023-01-01'),
        },
      ];

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockHistoryDataWithNulls),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.getReputationHistory(validWalletAddress);

      expect(result).toEqual([
        {
          id: 'history-1',
          eventType: 'positive_review',
          scoreChange: 0,
          previousScore: 0,
          newScore: 0,
          description: undefined,
          createdAt: mockHistoryDataWithNulls[0].createdAt,
        },
      ]);
    });
  });

  describe('getBulkReputation', () => {
    const walletAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0x0987654321098765432109876543210987654321',
      '0x1111111111111111111111111111111111111111',
    ];

    it('should return bulk reputation data successfully', async () => {
      const mockBulkData = [
        {
          walletAddress: walletAddresses[0],
          reputationScore: '75.5',
          totalTransactions: 25,
          positiveReviews: 20,
          negativeReviews: 3,
          neutralReviews: 2,
          successfulSales: 15,
          successfulPurchases: 10,
          disputedTransactions: 1,
          resolvedDisputes: 1,
          averageResponseTime: '2.5',
          completionRate: '96.0',
          updatedAt: new Date(),
        },
        {
          walletAddress: walletAddresses[1],
          reputationScore: '60.0',
          totalTransactions: 10,
          positiveReviews: 8,
          negativeReviews: 2,
          neutralReviews: 0,
          successfulSales: 5,
          successfulPurchases: 5,
          disputedTransactions: 0,
          resolvedDisputes: 0,
          averageResponseTime: '3.0',
          completionRate: '100.0',
          updatedAt: new Date(),
        },
      ];

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockBulkData),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.getBulkReputation(walletAddresses);

      expect(result.size).toBe(3);
      expect(result.get(walletAddresses[0])?.score).toBe(75.5);
      expect(result.get(walletAddresses[1])?.score).toBe(60.0);
      expect(result.get(walletAddresses[2])?.score).toBe(50.0); // Default for missing address
    });

    it('should return default values for all addresses on database error', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.getBulkReputation(walletAddresses);

      expect(result.size).toBe(3);
      for (const address of walletAddresses) {
        expect(result.get(address)?.score).toBe(50.0);
        expect(result.get(address)?.totalTransactions).toBe(0);
      }
    });

    it('should handle empty wallet addresses array', async () => {
      const result = await reputationService.getBulkReputation([]);

      expect(result.size).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should clear cache for specific wallet address', () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';

      // This should not throw
      reputationService.clearCache(validWalletAddress);

      expect(true).toBe(true); // Test passes if no error thrown
    });

    it('should clear all cache when no address specified', () => {
      // This should not throw
      reputationService.clearCache();

      expect(true).toBe(true); // Test passes if no error thrown
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = reputationService.getCacheStats();

      expect(stats).toEqual({
        size: expect.any(Number),
        hitRate: 0, // Currently not implemented
      });
    });
  });

  describe('getReputationTier', () => {
    it('should return correct tier for different scores', () => {
      expect(reputationService.getReputationTier(95)).toBe('excellent');
      expect(reputationService.getReputationTier(85)).toBe('very_good');
      expect(reputationService.getReputationTier(75)).toBe('good');
      expect(reputationService.getReputationTier(65)).toBe('fair');
      expect(reputationService.getReputationTier(55)).toBe('neutral');
      expect(reputationService.getReputationTier(45)).toBe('poor');
      expect(reputationService.getReputationTier(35)).toBe('very_poor');
    });

    it('should handle edge cases', () => {
      expect(reputationService.getReputationTier(90)).toBe('excellent');
      expect(reputationService.getReputationTier(80)).toBe('very_good');
      expect(reputationService.getReputationTier(70)).toBe('good');
      expect(reputationService.getReputationTier(60)).toBe('fair');
      expect(reputationService.getReputationTier(50)).toBe('neutral');
      expect(reputationService.getReputationTier(40)).toBe('poor');
      expect(reputationService.getReputationTier(0)).toBe('very_poor');
    });
  });

  describe('getReputationColor', () => {
    it('should return correct color for different scores', () => {
      expect(reputationService.getReputationColor(85)).toBe('#10B981'); // green
      expect(reputationService.getReputationColor(65)).toBe('#F59E0B'); // yellow
      expect(reputationService.getReputationColor(45)).toBe('#EF4444'); // red
      expect(reputationService.getReputationColor(35)).toBe('#6B7280'); // gray
    });

    it('should handle edge cases', () => {
      expect(reputationService.getReputationColor(80)).toBe('#10B981');
      expect(reputationService.getReputationColor(60)).toBe('#F59E0B');
      expect(reputationService.getReputationColor(40)).toBe('#EF4444');
      expect(reputationService.getReputationColor(0)).toBe('#6B7280');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle concurrent cache access', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      const mockReputationData = {
        walletAddress: validWalletAddress,
        reputationScore: '75.5',
        totalTransactions: 25,
        updatedAt: new Date(),
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockReputationData]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      // Simulate concurrent requests
      const promises = Array(5).fill(null).map(() => 
        reputationService.getReputation(validWalletAddress)
      );

      const results = await Promise.all(promises);

      // All should return the same data
      results.forEach(result => {
        expect(result.score).toBe(75.5);
        expect(result.walletAddress).toBe(validWalletAddress);
      });
    });

    it('should handle very large reputation scores', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      const mockReputationData = {
        walletAddress: validWalletAddress,
        reputationScore: '999999.99',
        totalTransactions: 1000000,
        updatedAt: new Date(),
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockReputationData]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.getReputation(validWalletAddress);

      expect(result.score).toBe(999999.99);
      expect(result.totalTransactions).toBe(1000000);
    });

    it('should handle negative reputation scores', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      const mockReputationData = {
        walletAddress: validWalletAddress,
        reputationScore: '-10.5',
        totalTransactions: 5,
        updatedAt: new Date(),
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockReputationData]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await reputationService.getReputation(validWalletAddress);

      expect(result.score).toBe(-10.5);
      expect(reputationService.getReputationTier(-10.5)).toBe('very_poor');
    });
  });
});
