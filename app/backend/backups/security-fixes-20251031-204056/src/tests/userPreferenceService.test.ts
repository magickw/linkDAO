/**
 * User Preference Service Tests
 * Unit tests for payment method preference management
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UserPreferenceService, TransactionContext } from '../services/userPreferenceService';

// Mock the database connection
jest.mock('../db/connection', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      })
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined)
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 1 })
      })
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue({ rowCount: 1 })
    })
  }
}));

// Mock crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('mock-random-bytes')),
  scryptSync: jest.fn(() => Buffer.from('mock-key')),
  createCipher: jest.fn(() => ({
    update: jest.fn(() => 'encrypted-data'),
    final: jest.fn(() => ''),
    getAuthTag: jest.fn(() => Buffer.from('auth-tag'))
  })),
  createDecipher: jest.fn(() => ({
    setAuthTag: jest.fn(),
    update: jest.fn(() => '{"test": "data"}'),
    final: jest.fn(() => '')
  }))
}));

describe('UserPreferenceService', () => {
  let userPreferenceService: UserPreferenceService;
  let mockDb: any;

  beforeEach(() => {
    userPreferenceService = new UserPreferenceService();
    mockDb = require('../db/connection').db;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getUserPaymentPreferences', () => {
    it('should return default preferences for new user', async () => {
      // Mock empty database result
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      const preferences = await userPreferenceService.getUserPaymentPreferences('test-user-id');

      expect(preferences).toEqual({
        preferredMethods: [
          { methodType: 'STABLECOIN_USDC', preferenceScore: 1.0, usageCount: 0 },
          { methodType: 'FIAT_STRIPE', preferenceScore: 0.8, usageCount: 0 },
          { methodType: 'NATIVE_ETH', preferenceScore: 0.6, usageCount: 0 }
        ],
        avoidedMethods: [],
        maxGasFeeThreshold: 50.00,
        preferStablecoins: true,
        preferFiat: false,
        lastUsedMethods: []
      });
    });

    it('should return existing preferences for user with data', async () => {
      // Mock database result with existing preferences
      const mockPreference = {
        encryptedPreferences: '{"test": "encrypted"}',
        preferenceScores: {
          'STABLECOIN_USDC': { score: 0.9, usageCount: 5 }
        },
        avoidedMethods: ['NATIVE_ETH'],
        maxGasFeeThreshold: '25.00',
        preferStablecoins: true,
        preferFiat: false,
        lastUsedMethods: []
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockPreference])
          })
        })
      });

      const preferences = await userPreferenceService.getUserPaymentPreferences('test-user-id');

      expect(preferences.avoidedMethods).toContain('NATIVE_ETH');
      expect(preferences.maxGasFeeThreshold).toBe(25.00);
      expect(preferences.preferStablecoins).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      const preferences = await userPreferenceService.getUserPaymentPreferences('test-user-id');

      // Should return default preferences on error
      expect(preferences.preferredMethods).toHaveLength(3);
      expect(preferences.preferredMethods[0].methodType).toBe('STABLECOIN_USDC');
    });
  });

  describe('updatePaymentPreference', () => {
    it('should update preference scores based on user selection', async () => {
      const context: TransactionContext = {
        amount: 100,
        currency: 'USD',
        networkId: 1,
        gasFeeUsd: 5,
        totalCostUsd: 105,
        wasPreferred: true,
        wasSuggested: false
      };

      // Mock database operations
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined)
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      await expect(
        userPreferenceService.updatePaymentPreference('test-user-id', 'STABLECOIN_USDC', context)
      ).resolves.not.toThrow();

      // Verify that usage history was recorded
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle invalid context gracefully', async () => {
      const invalidContext = {
        amount: -100, // Invalid amount
        currency: '',
        wasPreferred: true,
        wasSuggested: false
      } as TransactionContext;

      await expect(
        userPreferenceService.updatePaymentPreference('test-user-id', 'STABLECOIN_USDC', invalidContext)
      ).rejects.toThrow();
    });
  });

  describe('calculatePreferenceScore', () => {
    it('should return base score for unknown method', () => {
      const preferences = {
        preferredMethods: [],
        avoidedMethods: [],
        maxGasFeeThreshold: 50,
        preferStablecoins: true,
        preferFiat: false,
        lastUsedMethods: []
      };

      const score = userPreferenceService.calculatePreferenceScore('UNKNOWN_METHOD', preferences);
      expect(score).toBe(0.5); // Default base score
    });

    it('should return preference score for known method', () => {
      const preferences = {
        preferredMethods: [
          { methodType: 'STABLECOIN_USDC', preferenceScore: 0.9, usageCount: 5, lastUsed: new Date() }
        ],
        avoidedMethods: [],
        maxGasFeeThreshold: 50,
        preferStablecoins: true,
        preferFiat: false,
        lastUsedMethods: []
      };

      const score = userPreferenceService.calculatePreferenceScore('STABLECOIN_USDC', preferences);
      expect(score).toBeGreaterThan(0.8); // Should be close to preference score
    });

    it('should apply time decay to old preferences', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

      const preferences = {
        preferredMethods: [
          { methodType: 'STABLECOIN_USDC', preferenceScore: 1.0, usageCount: 5, lastUsed: oldDate }
        ],
        avoidedMethods: [],
        maxGasFeeThreshold: 50,
        preferStablecoins: true,
        preferFiat: false,
        lastUsedMethods: []
      };

      const score = userPreferenceService.calculatePreferenceScore('STABLECOIN_USDC', preferences);
      expect(score).toBeLessThan(1.0); // Should be decayed
      expect(score).toBeGreaterThan(0.1); // But not too low
    });
  });

  describe('getRecommendedMethod', () => {
    it('should return null for empty available methods', () => {
      const preferences = {
        preferredMethods: [],
        avoidedMethods: [],
        maxGasFeeThreshold: 50,
        preferStablecoins: true,
        preferFiat: false,
        lastUsedMethods: []
      };

      const recommendation = userPreferenceService.getRecommendedMethod([], preferences);
      expect(recommendation).toBeNull();
    });

    it('should return highest scored available method', () => {
      const preferences = {
        preferredMethods: [
          { methodType: 'STABLECOIN_USDC', preferenceScore: 0.9, usageCount: 5 },
          { methodType: 'FIAT_STRIPE', preferenceScore: 0.7, usageCount: 3 },
          { methodType: 'NATIVE_ETH', preferenceScore: 0.5, usageCount: 1 }
        ],
        avoidedMethods: [],
        maxGasFeeThreshold: 50,
        preferStablecoins: true,
        preferFiat: false,
        lastUsedMethods: []
      };

      const availableMethods = ['FIAT_STRIPE', 'NATIVE_ETH'];
      const recommendation = userPreferenceService.getRecommendedMethod(availableMethods, preferences);
      expect(recommendation).toBe('FIAT_STRIPE');
    });

    it('should avoid methods in avoided list', () => {
      const preferences = {
        preferredMethods: [
          { methodType: 'NATIVE_ETH', preferenceScore: 0.9, usageCount: 5 }
        ],
        avoidedMethods: ['NATIVE_ETH'],
        maxGasFeeThreshold: 50,
        preferStablecoins: true,
        preferFiat: false,
        lastUsedMethods: []
      };

      const availableMethods = ['NATIVE_ETH', 'FIAT_STRIPE'];
      const recommendation = userPreferenceService.getRecommendedMethod(availableMethods, preferences);
      expect(recommendation).toBe('FIAT_STRIPE');
    });

    it('should fallback to first method if all are avoided', () => {
      const preferences = {
        preferredMethods: [],
        avoidedMethods: ['NATIVE_ETH', 'FIAT_STRIPE'],
        maxGasFeeThreshold: 50,
        preferStablecoins: true,
        preferFiat: false,
        lastUsedMethods: []
      };

      const availableMethods = ['NATIVE_ETH', 'FIAT_STRIPE'];
      const recommendation = userPreferenceService.getRecommendedMethod(availableMethods, preferences);
      expect(recommendation).toBe('NATIVE_ETH'); // First available method
    });
  });

  describe('resetUserPreferences', () => {
    it('should delete user preferences and overrides', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 1 })
      });

      await expect(
        userPreferenceService.resetUserPreferences('test-user-id')
      ).resolves.not.toThrow();

      expect(mockDb.delete).toHaveBeenCalledTimes(2); // Preferences and overrides
    });

    it('should handle database errors during reset', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        userPreferenceService.resetUserPreferences('test-user-id')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getUserPaymentAnalytics', () => {
    it('should return analytics for user with transaction history', async () => {
      const mockHistory = [
        {
          paymentMethodType: 'STABLECOIN_USDC',
          gasFeeUsd: '5.00',
          wasPreferred: true
        },
        {
          paymentMethodType: 'STABLECOIN_USDC',
          gasFeeUsd: '3.00',
          wasPreferred: true
        },
        {
          paymentMethodType: 'FIAT_STRIPE',
          gasFeeUsd: null,
          wasPreferred: false
        }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockHistory)
        })
      });

      const analytics = await userPreferenceService.getUserPaymentAnalytics('test-user-id', 30);

      expect(analytics.totalTransactions).toBe(3);
      expect(analytics.methodBreakdown['STABLECOIN_USDC']).toBe(2);
      expect(analytics.methodBreakdown['FIAT_STRIPE']).toBe(1);
      expect(analytics.averageGasFee).toBe(4.0); // (5 + 3) / 2 (excluding null)
      expect(analytics.preferenceAccuracy).toBeCloseTo(0.67); // 2/3
    });

    it('should return empty analytics for user with no history', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      const analytics = await userPreferenceService.getUserPaymentAnalytics('test-user-id', 30);

      expect(analytics.totalTransactions).toBe(0);
      expect(analytics.methodBreakdown).toEqual({});
      expect(analytics.averageGasFee).toBe(0);
      expect(analytics.preferenceAccuracy).toBe(0);
    });
  });

  describe('addPreferenceOverride', () => {
    it('should add preference override successfully', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined)
      });

      await expect(
        userPreferenceService.addPreferenceOverride(
          'test-user-id',
          'manual_selection',
          'STABLECOIN_USDC',
          {
            priorityBoost: 5,
            reason: 'User manually selected'
          }
        )
      ).resolves.not.toThrow();

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredOverrides', () => {
    it('should clean up expired overrides', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 3 })
      });

      const deletedCount = await userPreferenceService.cleanupExpiredOverrides();
      expect(deletedCount).toBe(3);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const deletedCount = await userPreferenceService.cleanupExpiredOverrides();
      expect(deletedCount).toBe(0);
    });
  });
});