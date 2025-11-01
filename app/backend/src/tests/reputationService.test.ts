import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { reputationService, ReputationData, ReputationTransaction } from '../services/reputationService';
import { db } from '../db/connection';

// Mock the database connection
jest.mock('../db/connection', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    execute: jest.fn(),
  }
}));

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

describe('ReputationService', () => {
  const mockDb = db as jest.Mocked<typeof db>;
  const testWalletAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    reputationService.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getReputation', () => {
    it('should return reputation data for existing user', async () => {
      const mockReputationData = {
        walletAddress: testWalletAddress,
        reputationScore: '75.50',
        totalTransactions: 10,
        positiveReviews: 8,
        negativeReviews: 1,
        neutralReviews: 1,
        successfulSales: 5,
        successfulPurchases: 5,
        disputedTransactions: 0,
        resolvedDisputes: 0,
        averageResponseTime: '2.5',
        completionRate: '95.00',
        updatedAt: new Date(),
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockReputationData])
          })
        })
      });

      const result = await reputationService.getReputation(testWalletAddress);

      expect(result).toEqual({
        walletAddress: testWalletAddress,
        score: 75.50,
        totalTransactions: 10,
        positiveReviews: 8,
        negativeReviews: 1,
        neutralReviews: 1,
        successfulSales: 5,
        successfulPurchases: 5,
        disputedTransactions: 0,
        resolvedDisputes: 0,
        averageResponseTime: 2.5,
        completionRate: 95.00,
        lastUpdated: mockReputationData.updatedAt,
      });
    });

    it('should return default reputation data for new user', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoNothing: jest.fn().mockResolvedValue(undefined)
        })
      });

      const result = await reputationService.getReputation(testWalletAddress);

      expect(result).toEqual({
        walletAddress: testWalletAddress,
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

    it('should return cached data on subsequent calls', async () => {
      const mockReputationData = {
        walletAddress: testWalletAddress,
        reputationScore: '75.50',
        totalTransactions: 10,
        positiveReviews: 8,
        negativeReviews: 1,
        neutralReviews: 1,
        successfulSales: 5,
        successfulPurchases: 5,
        disputedTransactions: 0,
        resolvedDisputes: 0,
        averageResponseTime: '2.5',
        completionRate: '95.00',
        updatedAt: new Date(),
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockReputationData])
          })
        })
      });

      // First call
      await reputationService.getReputation(testWalletAddress);
      
      // Second call should use cache
      const result = await reputationService.getReputation(testWalletAddress);

      expect(result.score).toBe(75.50);
      // Database should only be called once
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      const result = await reputationService.getReputation(testWalletAddress);

      // Should return default values on error
      expect(result).toEqual({
        walletAddress: testWalletAddress,
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
  });

  describe('updateReputation', () => {
    it('should update reputation successfully', async () => {
      const transaction: ReputationTransaction = {
        eventType: 'review_received',
        reviewId: 'review-123',
        metadata: { rating: 5 }
      };

      mockDb.execute = jest.fn().mockResolvedValue(undefined);

      await expect(reputationService.updateReputation(testWalletAddress, transaction))
        .resolves.not.toThrow();

      expect(mockDb.execute).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle update errors', async () => {
      const transaction: ReputationTransaction = {
        eventType: 'review_received',
        reviewId: 'review-123',
        metadata: { rating: 5 }
      };

      mockDb.execute = jest.fn().mockRejectedValue(new Error('Update failed'));

      await expect(reputationService.updateReputation(testWalletAddress, transaction))
        .rejects.toThrow('Failed to update reputation: Update failed');
    });

    it('should clear cache after update', async () => {
      const transaction: ReputationTransaction = {
        eventType: 'review_received',
        reviewId: 'review-123',
        metadata: { rating: 5 }
      };

      // First, populate cache
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              walletAddress: testWalletAddress,
              reputationScore: '75.50',
              totalTransactions: 10,
              positiveReviews: 8,
              negativeReviews: 1,
              neutralReviews: 1,
              successfulSales: 5,
              successfulPurchases: 5,
              disputedTransactions: 0,
              resolvedDisputes: 0,
              averageResponseTime: '2.5',
              completionRate: '95.00',
              updatedAt: new Date(),
            }])
          })
        })
      });

      await reputationService.getReputation(testWalletAddress);

      // Update reputation
      mockDb.execute = jest.fn().mockResolvedValue(undefined);
      await reputationService.updateReputation(testWalletAddress, transaction);

      // Next call should hit database again (cache cleared)
      await reputationService.getReputation(testWalletAddress);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });
  });

  describe('calculateReputation', () => {
    it('should calculate reputation and return score', async () => {
      mockDb.execute = jest.fn().mockResolvedValue(undefined);
      
      // Mock the getReputation call after calculation
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              walletAddress: testWalletAddress,
              reputationScore: '80.00',
              totalTransactions: 15,
              positiveReviews: 12,
              negativeReviews: 2,
              neutralReviews: 1,
              successfulSales: 8,
              successfulPurchases: 7,
              disputedTransactions: 1,
              resolvedDisputes: 1,
              averageResponseTime: '1.5',
              completionRate: '98.00',
              updatedAt: new Date(),
            }])
          })
        })
      });

      const score = await reputationService.calculateReputation(testWalletAddress);

      expect(score).toBe(80.00);
      expect(mockDb.execute).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle calculation errors', async () => {
      mockDb.execute = jest.fn().mockRejectedValue(new Error('Calculation failed'));

      await expect(reputationService.calculateReputation(testWalletAddress))
        .rejects.toThrow('Failed to calculate reputation: Calculation failed');
    });
  });

  describe('getReputationHistory', () => {
    it('should return reputation history', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          eventType: 'review_received',
          scoreChange: '2.50',
          previousScore: '75.00',
          newScore: '77.50',
          description: 'Positive review received',
          createdAt: new Date(),
        },
        {
          id: 'history-2',
          eventType: 'transaction_completed',
          scoreChange: '1.00',
          previousScore: '74.00',
          newScore: '75.00',
          description: 'Successfully completed transaction',
          createdAt: new Date(),
        }
      ];

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockHistory)
            })
          })
        })
      });

      const result = await reputationService.getReputationHistory(testWalletAddress);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'history-1',
        eventType: 'review_received',
        scoreChange: 2.50,
        previousScore: 75.00,
        newScore: 77.50,
        description: 'Positive review received',
        createdAt: expect.any(Date),
      });
    });

    it('should handle history query errors', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockRejectedValue(new Error('Query failed'))
            })
          })
        })
      });

      const result = await reputationService.getReputationHistory(testWalletAddress);

      expect(result).toEqual([]);
    });
  });

  describe('utility methods', () => {
    it('should return correct reputation tier', () => {
      expect(reputationService.getReputationTier(95)).toBe('excellent');
      expect(reputationService.getReputationTier(85)).toBe('very_good');
      expect(reputationService.getReputationTier(75)).toBe('good');
      expect(reputationService.getReputationTier(65)).toBe('fair');
      expect(reputationService.getReputationTier(55)).toBe('neutral');
      expect(reputationService.getReputationTier(45)).toBe('poor');
      expect(reputationService.getReputationTier(35)).toBe('very_poor');
    });

    it('should return correct reputation color', () => {
      expect(reputationService.getReputationColor(85)).toBe('#10B981');
      expect(reputationService.getReputationColor(65)).toBe('#F59E0B');
      expect(reputationService.getReputationColor(45)).toBe('#EF4444');
      expect(reputationService.getReputationColor(35)).toBe('#6B7280');
    });

    it('should clear cache correctly', () => {
      reputationService.clearCache(testWalletAddress);
      reputationService.clearCache(); // Clear all

      const stats = reputationService.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('getBulkReputation', () => {
    it('should return reputation for multiple addresses', async () => {
      const addresses = [testWalletAddress, '0x9876543210987654321098765432109876543210'];
      const mockReputations = [
        {
          walletAddress: testWalletAddress,
          reputationScore: '75.50',
          totalTransactions: 10,
          positiveReviews: 8,
          negativeReviews: 1,
          neutralReviews: 1,
          successfulSales: 5,
          successfulPurchases: 5,
          disputedTransactions: 0,
          resolvedDisputes: 0,
          averageResponseTime: '2.5',
          completionRate: '95.00',
          updatedAt: new Date(),
        }
      ];

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockReputations)
        })
      });

      const result = await reputationService.getBulkReputation(addresses);

      expect(result.size).toBe(2);
      expect(result.get(testWalletAddress)?.score).toBe(75.50);
      expect(result.get(addresses[1])?.score).toBe(50.0); // Default for missing
    });
  });
});
