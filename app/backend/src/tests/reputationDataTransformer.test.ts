import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ReputationDataTransformer } from '../services/reputationDataTransformer';

describe('ReputationDataTransformer', () => {
  describe('transformReputationData', () => {
    it('should transform backend reputation data to frontend format', () => {
      const backendData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        score: 75.5,
        totalTransactions: 10,
        positiveReviews: 8,
        negativeReviews: 1,
        neutralReviews: 1,
        successfulSales: 5,
        successfulPurchases: 5,
        disputedTransactions: 2,
        resolvedDisputes: 1,
        averageResponseTime: 120.5,
        completionRate: 95.5,
        lastUpdated: new Date(),
      };

      const result = ReputationDataTransformer.transformReputationData(backendData);
      
      assert.ok(result);
      assert.strictEqual(result.totalScore, 75.5);
      assert.ok(result.level);
      assert.strictEqual(result.level.id, 3); // Active Member level for score 75.5
      assert.ok(Array.isArray(result.badges));
      assert.ok(Array.isArray(result.progress));
      assert.ok(result.breakdown);
      assert.strictEqual(result.breakdown.posting, 10);
      assert.strictEqual(result.breakdown.governance, 8);
      assert.strictEqual(result.breakdown.community, 5);
      assert.strictEqual(result.breakdown.trading, 5);
      assert.strictEqual(result.breakdown.moderation, 2);
      assert.ok(result.achievements);
    });

    it('should handle edge cases in reputation data transformation', () => {
      const backendData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
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
        lastUpdated: new Date(),
      };

      const result = ReputationDataTransformer.transformReputationData(backendData);
      
      assert.ok(result);
      assert.strictEqual(result.totalScore, 0);
      assert.ok(result.level);
      assert.strictEqual(result.level.id, 1); // Newcomer level for score 0
    });

    it('should correctly calculate progress for different metrics', () => {
      const backendData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        score: 1250,
        totalTransactions: 150,
        positiveReviews: 75,
        negativeReviews: 5,
        neutralReviews: 10,
        successfulSales: 40,
        successfulPurchases: 35,
        disputedTransactions: 3,
        resolvedDisputes: 2,
        averageResponseTime: 60.0,
        completionRate: 98.5,
        lastUpdated: new Date(),
      };

      const result = ReputationDataTransformer.transformReputationData(backendData);
      
      assert.ok(result);
      assert.strictEqual(result.totalScore, 1250);
      assert.strictEqual(result.level.id, 4); // Trusted User level for score 1250
      assert.ok(Array.isArray(result.progress));
      assert.strictEqual(result.progress.length, 3); // posting, governance, community
      // Check progress calculations
      assert.ok(result.progress[0].progress >= 0 && result.progress[0].progress <= 100);
    });
  });

  describe('transformReputationHistory', () => {
    it('should transform backend reputation history to frontend events', () => {
      const backendHistory = [
        {
          id: 'event-1',
          eventType: 'review_received',
          scoreChange: 5.0,
          previousScore: 70.0,
          newScore: 75.0,
          description: 'Positive review received',
          createdAt: new Date(),
        },
        {
          id: 'event-2',
          eventType: 'dispute_created',
          scoreChange: -2.0,
          previousScore: 75.0,
          newScore: 73.0,
          description: 'Dispute filed',
          createdAt: new Date(),
        }
      ];

      const result = ReputationDataTransformer.transformReputationHistory(backendHistory, 'user-123');
      
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].userId, 'user-123');
      assert.strictEqual(result[0].type, 'post_liked'); // Mapped from review_received
      assert.strictEqual(result[0].category, 'governance'); // Determined from review_received
      assert.strictEqual(result[0].points, 5.0);
      assert.strictEqual(result[1].type, 'moderation_action'); // Mapped from dispute_created
      assert.strictEqual(result[1].category, 'moderation'); // Determined from dispute_created
      assert.strictEqual(result[1].points, -2.0);
    });

    it('should handle empty history', () => {
      const result = ReputationDataTransformer.transformReputationHistory([], 'user-123');
      
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });

    it('should handle history with missing descriptions', () => {
      const backendHistory = [
        {
          id: 'event-1',
          eventType: 'transaction_completed',
          scoreChange: 10.0,
          previousScore: 70.0,
          newScore: 80.0,
          // No description
          createdAt: new Date(),
        }
      ];

      const result = ReputationDataTransformer.transformReputationHistory(backendHistory, 'user-123');
      
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 1);
      assert.ok(result[0].description); // Should have generated description
      assert.ok(result[0].description.includes('increased')); // Should mention increase
    });
  });

  describe('calculateLevel', () => {
    it('should calculate correct reputation level for different scores', () => {
      const testCases = [
        { score: 0, expectedLevel: 1, expectedName: 'Newcomer' },
        { score: 50, expectedLevel: 1, expectedName: 'Newcomer' },
        { score: 100, expectedLevel: 2, expectedName: 'Contributor' },
        { score: 500, expectedLevel: 3, expectedName: 'Active Member' },
        { score: 1500, expectedLevel: 4, expectedName: 'Trusted User' },
        { score: 5000, expectedLevel: 5, expectedName: 'Community Leader' },
        { score: 15000, expectedLevel: 6, expectedName: 'Legend' },
        { score: 20000, expectedLevel: 6, expectedName: 'Legend' },
      ];

      for (const testCase of testCases) {
        const backendData = {
          walletAddress: '0x1234567890123456789012345678901234567890',
          score: testCase.score,
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
          lastUpdated: new Date(),
        };

        const result = ReputationDataTransformer.transformReputationData(backendData);
        assert.strictEqual(result.level.id, testCase.expectedLevel, `Failed for score ${testCase.score}`);
        assert.strictEqual(result.level.name, testCase.expectedName, `Failed for score ${testCase.score}`);
      }
    });

    it('should handle boundary values correctly', () => {
      // Test exact boundary values
      const boundaryTests = [
        { score: 99, expectedLevel: 1 }, // Newcomer max
        { score: 100, expectedLevel: 2 }, // Contributor min
        { score: 499, expectedLevel: 2 }, // Contributor max
        { score: 500, expectedLevel: 3 }, // Active Member min
        { score: 1499, expectedLevel: 3 }, // Active Member max
        { score: 1500, expectedLevel: 4 }, // Trusted User min
        { score: 4999, expectedLevel: 4 }, // Trusted User max
        { score: 5000, expectedLevel: 5 }, // Community Leader min
        { score: 14999, expectedLevel: 5 }, // Community Leader max
        { score: 15000, expectedLevel: 6 }, // Legend min
      ];

      for (const test of boundaryTests) {
        const backendData = {
          walletAddress: '0x1234567890123456789012345678901234567890',
          score: test.score,
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
          lastUpdated: new Date(),
        };

        const result = ReputationDataTransformer.transformReputationData(backendData);
        assert.strictEqual(result.level.id, test.expectedLevel, `Failed for boundary score ${test.score}`);
      }
    });
  });

  describe('mapEventType', () => {
    it('should map backend event types to frontend event types', () => {
      const testCases = [
        { backend: 'review_received', expected: 'post_liked' },
        { backend: 'transaction_completed', expected: 'tip_received' },
        { backend: 'dispute_created', expected: 'moderation_action' },
        { backend: 'dispute_resolved', expected: 'moderation_action' },
        { backend: 'response_time', expected: 'community_joined' },
        { backend: 'completion_rate', expected: 'achievement_unlocked' },
        { backend: 'unknown_event', expected: 'post_created' }, // Default
      ];

      // Test through transformReputationHistory which uses mapEventType internally
      for (const testCase of testCases) {
        const backendHistory = [{
          id: 'test-event',
          eventType: testCase.backend,
          scoreChange: 5.0,
          previousScore: 70.0,
          newScore: 75.0,
          createdAt: new Date(),
        }];

        const result = ReputationDataTransformer.transformReputationHistory(backendHistory, 'user-123');
        assert.strictEqual(result[0].type, testCase.expected, `Failed to map ${testCase.backend} to ${testCase.expected}`);
      }
    });
  });

  describe('determineCategory', () => {
    it('should determine correct category for event types', () => {
      const testCases = [
        { eventType: 'review_received', expectedCategory: 'governance' },
        { eventType: 'transaction_completed', expectedCategory: 'trading' },
        { eventType: 'dispute_created', expectedCategory: 'moderation' },
        { eventType: 'dispute_resolved', expectedCategory: 'moderation' },
        { eventType: 'response_time', expectedCategory: 'community' },
        { eventType: 'completion_rate', expectedCategory: 'community' },
        { eventType: 'unknown_event', expectedCategory: 'posting' }, // Default
      ];

      // Test through transformReputationHistory which uses determineCategory internally
      for (const testCase of testCases) {
        const backendHistory = [{
          id: 'test-event',
          eventType: testCase.eventType,
          scoreChange: 5.0,
          previousScore: 70.0,
          newScore: 75.0,
          createdAt: new Date(),
        }];

        const result = ReputationDataTransformer.transformReputationHistory(backendHistory, 'user-123');
        assert.strictEqual(result[0].category, testCase.expectedCategory, `Failed to categorize ${testCase.eventType} as ${testCase.expectedCategory}`);
      }
    });
  });
});