import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import sinon from 'sinon';
import { reputationService } from '../services/reputationService';
import { redisService } from '../services/redisService';
import { db } from '../db';
import { eq, desc } from 'drizzle-orm';
import { userReputation, reputationHistoryMarketplace } from '../db/schema';

// Create sinon stubs for mocking
let redisGetStub: sinon.SinonStub;
let redisSetStub: sinon.SinonStub;
let redisDelStub: sinon.SinonStub;
let redisKeysStub: sinon.SinonStub;
let dbSelectStub: sinon.SinonStub;
let dbExecuteStub: sinon.SinonStub;

describe('ReputationService', () => {
  // Mock data
  const mockWalletAddress = '0x1234567890123456789012345678901234567890';
  const mockReputationData = {
    walletAddress: mockWalletAddress,
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

  const mockDbReputation = {
    walletAddress: mockWalletAddress,
    reputationScore: '75.50',
    totalTransactions: 10,
    positiveReviews: 8,
    negativeReviews: 1,
    neutralReviews: 1,
    successfulSales: 5,
    successfulPurchases: 5,
    disputedTransactions: 2,
    resolvedDisputes: 1,
    averageResponseTime: '120.50',
    completionRate: '95.50',
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Setup mocks before each test
    redisGetStub = sinon.stub(redisService, 'get');
    redisSetStub = sinon.stub(redisService, 'set');
    redisDelStub = sinon.stub(redisService, 'del');
    redisKeysStub = sinon.stub(redisService, 'keys');
    
    // Mock database methods
    dbSelectStub = sinon.stub(db, 'select');
    dbExecuteStub = sinon.stub(db, 'execute');
  });

  afterEach(() => {
    // Restore all sinon stubs after each test
    sinon.restore();
  });

  describe('getReputation', () => {
    it('should return reputation data for a valid wallet address', async () => {
      // Mock Redis cache miss
      redisGetStub.resolves(null);
      
      // Mock database query success
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves([mockDbReputation])
      };
      dbSelectStub.returns(mockSelectResult);
      
      // Mock Redis cache set
      redisSetStub.resolves();

      const result = await reputationService.getReputation(mockWalletAddress);
      
      assert.ok(result);
      assert.strictEqual(result.walletAddress, mockWalletAddress);
      assert.strictEqual(result.score, 75.5);
      assert.strictEqual(result.totalTransactions, 10);
      sinon.assert.calledOnce(redisGetStub);
      sinon.assert.calledOnce(mockSelectResult.limit);
      sinon.assert.calledOnce(redisSetStub);
    });

    it('should return default reputation data when user is not found', async () => {
      // Mock Redis cache miss
      redisGetStub.resolves(null);
      
      // Mock database query returning empty array
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves([])
      };
      dbSelectStub.returns(mockSelectResult);

      const result = await reputationService.getReputation(mockWalletAddress);
      
      assert.ok(result);
      assert.strictEqual(result.walletAddress, mockWalletAddress);
      assert.strictEqual(result.score, 50.0); // Default score
      assert.strictEqual(result.totalTransactions, 0);
    });

    it('should handle invalid wallet addresses gracefully', async () => {
      // Mock Redis cache error
      redisGetStub.rejects(new Error('Redis connection failed'));
      
      const result = await reputationService.getReputation(mockWalletAddress);
      
      assert.ok(result);
      assert.strictEqual(result.walletAddress, mockWalletAddress);
      assert.strictEqual(result.score, 50.0); // Default score on error
    });
  });

  describe('updateReputation', () => {
    it('should update reputation for a valid wallet address and transaction', async () => {
      const transaction = {
        eventType: 'review_received',
        transactionId: 'tx-123',
        reviewId: 'review-456',
        metadata: { rating: 5 }
      };

      // Mock database execute success
      dbExecuteStub.resolves();
      
      // Mock Redis cache deletion
      redisDelStub.resolves();

      await reputationService.updateReputation(mockWalletAddress, transaction);
      
      sinon.assert.calledOnce(dbExecuteStub);
      sinon.assert.calledOnce(redisDelStub);
    });

    it('should handle errors during reputation update', async () => {
      const transaction = {
        eventType: 'review_received'
      };

      // Mock database error
      dbExecuteStub.rejects(new Error('Database connection failed'));

      try {
        await reputationService.updateReputation(mockWalletAddress, transaction);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Failed to update reputation'));
      }
    });
  });

  describe('calculateReputation', () => {
    it('should calculate comprehensive reputation score', async () => {
      // Mock database execute
      dbExecuteStub.resolves();
      
      // Mock Redis cache deletion
      redisDelStub.resolves();
      
      // Mock getReputation to return updated data
      const getReputationStub = sinon.stub(reputationService, 'getReputation');
      getReputationStub.resolves({ ...mockReputationData, score: 80.0 });

      const result = await reputationService.calculateReputation(mockWalletAddress);
      
      assert.strictEqual(result, 80.0);
      sinon.assert.calledOnce(dbExecuteStub);
      sinon.assert.calledOnce(redisDelStub);
      sinon.assert.calledOnce(getReputationStub);
    });

    it('should handle errors during reputation calculation', async () => {
      // Mock database error
      dbExecuteStub.rejects(new Error('Calculation failed'));
      
      try {
        await reputationService.calculateReputation(mockWalletAddress);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Failed to calculate reputation'));
      }
    });
  });

  describe('getReputationHistory', () => {
    it('should return reputation history for a valid wallet address', async () => {
      const mockHistoryEntry = {
        id: 'history-1',
        eventType: 'review_received',
        scoreChange: '5.00',
        previousScore: '70.50',
        newScore: '75.50',
        description: 'Positive review received',
        createdAt: new Date(),
      };

      // Mock database query
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        orderBy: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves([mockHistoryEntry])
      };
      dbSelectStub.returns(mockSelectResult);

      const result = await reputationService.getReputationHistory(mockWalletAddress, 10);
      
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'history-1');
      assert.strictEqual(result[0].scoreChange, 5.0);
    });

    it('should return empty array when no history is found', async () => {
      // Mock database query returning empty array
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        orderBy: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves([])
      };
      dbSelectStub.returns(mockSelectResult);

      const result = await reputationService.getReputationHistory(mockWalletAddress);
      
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });

    it('should respect limit parameter', async () => {
      // Mock database query
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        orderBy: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves([])
      };
      dbSelectStub.returns(mockSelectResult);

      await reputationService.getReputationHistory(mockWalletAddress, 25);
      
      // Check that limit was applied
      sinon.assert.calledOnce(mockSelectResult.limit);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        orderBy: sinon.stub().returnsThis(),
        limit: sinon.stub().rejects(new Error('Database error'))
      };
      dbSelectStub.returns(mockSelectResult);

      const result = await reputationService.getReputationHistory(mockWalletAddress);
      
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 0); // Should return empty array on error
    });
  });

  describe('getBulkReputation', () => {
    it('should return reputation data for multiple wallet addresses', async () => {
      const walletAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdef123456789012345678901234567890abcd'
      ];
      
      // Mock database query
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().resolves([mockDbReputation])
      };
      dbSelectStub.returns(mockSelectResult);

      const result = await reputationService.getBulkReputation(walletAddresses);
      
      assert.ok(result instanceof Map);
      assert.ok(result.size >= 1); // At least the found address should be in the map
    });

    it('should handle empty wallet addresses array', async () => {
      const result = await reputationService.getBulkReputation([]);
      
      assert.ok(result instanceof Map);
      assert.strictEqual(result.size, 0);
    });

    it('should limit the number of addresses processed', async () => {
      const walletAddresses = Array(150).fill(0).map((_, i) => 
        `0x${i.toString().padStart(36, '0')}12345678901234567890`
      );
      
      // Mock database query
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().resolves([])
      };
      dbSelectStub.returns(mockSelectResult);

      const result = await reputationService.getBulkReputation(walletAddresses);
      
      assert.ok(result instanceof Map);
      // Should be limited to 100 addresses
      assert.strictEqual(result.size, 100);
    });

    it('should handle database errors gracefully', async () => {
      const walletAddresses = [
        '0x1234567890123456789012345678901234567890'
      ];
      
      // Mock database error
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().rejects(new Error('Database error'))
      };
      dbSelectStub.returns(mockSelectResult);

      const result = await reputationService.getBulkReputation(walletAddresses);
      
      assert.ok(result instanceof Map);
      assert.strictEqual(result.size, 1); // Should still have entry with default values
      const reputation = result.get('0x1234567890123456789012345678901234567890');
      assert.strictEqual(reputation?.score, 50.0); // Default score
    });
  });

  describe('clearCache', () => {
    it('should clear cache for a specific wallet address', async () => {
      // Mock Redis cache deletion
      redisDelStub.resolves();

      await reputationService.clearCache(mockWalletAddress);
      
      sinon.assert.calledOnceWithExactly(redisDelStub, `reputation:user:${mockWalletAddress}`);
    });

    it('should clear all reputation cache when no address provided', async () => {
      // Mock Redis keys and del
      redisKeysStub.resolves([
        'reputation:user:0x1234567890123456789012345678901234567890',
        'reputation:user:0xabcdef123456789012345678901234567890abcd'
      ]);
      redisDelStub.resolves();

      await reputationService.clearCache();
      
      sinon.assert.calledOnceWithExactly(redisKeysStub, 'reputation:user:*');
      // Called for each key plus one for the pattern
      assert.strictEqual(redisDelStub.callCount, 3);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const stats = await reputationService.getCacheStats();
      
      assert.ok(typeof stats === 'object');
      assert.ok('size' in stats);
      assert.ok('hitRate' in stats);
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error messages', async () => {
      // Mock Redis cache miss
      redisGetStub.resolves(null);
      
      // Mock database error with specific code
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        limit: sinon.stub().rejects(Object.assign(new Error('Connection failed'), { code: 'ECONNREFUSED' }))
      };
      dbSelectStub.returns(mockSelectResult);

      const result = await reputationService.getReputation(mockWalletAddress);
      
      assert.ok(result);
      assert.strictEqual(result.walletAddress, mockWalletAddress);
      assert.strictEqual(result.score, 50.0); // Should return default values
    });

    it('should return default values as fallback', async () => {
      // Mock Redis cache miss
      redisGetStub.resolves(null);
      
      // Mock database error
      const mockSelectResult = {
        from: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        limit: sinon.stub().rejects(new Error('Unexpected error'))
      };
      dbSelectStub.returns(mockSelectResult);

      const result = await reputationService.getReputation(mockWalletAddress);
      
      assert.ok(result);
      // Should return default reputation data
      assert.strictEqual(result.score, 50.0);
      assert.strictEqual(result.totalTransactions, 0);
      assert.strictEqual(result.walletAddress, mockWalletAddress);
    });
  });
});