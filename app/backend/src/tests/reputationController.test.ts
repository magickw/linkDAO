import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import sinon from 'sinon';
import { reputationController } from '../controllers/reputationController';
import { reputationService } from '../services/reputationService';

describe('ReputationController', () => {
  // Mock request and response objects
  let mockRequest: any;
  let mockResponse: any;
  let reputationServiceStub: sinon.SinonStubbedInstance<any>;

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

  const mockHistoryEntry = {
    id: 'history-1',
    eventType: 'review_received',
    scoreChange: 5.0,
    previousScore: 70.5,
    newScore: 75.5,
    description: 'Positive review received',
    createdAt: new Date(),
  };

  beforeEach(() => {
    // Create stubs for the reputation service
    reputationServiceStub = sinon.stub(reputationService);
    
    mockRequest = {
      params: {},
      query: {},
      body: {},
      headers: {},
    };

    mockResponse = {
      status: function(code: number) {
        this.statusCode = code;
        return this;
      },
      json: function(data: any) {
        this.body = data;
        return this;
      },
      locals: {
        requestId: 'test-request-id'
      }
    };
  });

  afterEach(() => {
    // Clean up after each test
    sinon.restore();
  });

  describe('getReputation', () => {
    it('should return 400 when wallet address is missing', async () => {
      mockRequest.params = {};
      
      await reputationController.getReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_IDENTIFIER');
    });

    it('should return 400 when wallet address format is invalid', async () => {
      mockRequest.params = { identifier: 'invalid-address' };
      
      await reputationController.getReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'INVALID_WALLET_ADDRESS');
    });

    it('should return reputation data for valid wallet address', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      
      // Mock the reputation service
      reputationServiceStub.getReputation.resolves(mockReputationData);

      await reputationController.getReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.walletAddress, mockWalletAddress);
      sinon.assert.calledOnceWithExactly(reputationServiceStub.getReputation, mockWalletAddress);
    });

    it('should return default reputation data on service error', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      
      // Mock the reputation service to throw an error
      reputationServiceStub.getReputation.rejects(new Error('Service unavailable'));

      await reputationController.getReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200); // Should still return 200 with default data
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.walletAddress, mockWalletAddress);
      assert.strictEqual(mockResponse.body?.data?.score, 50.0); // Default score
    });
  });

  describe('updateReputation', () => {
    it('should return 400 when wallet address is missing', async () => {
      mockRequest.params = {};
      mockRequest.body = { eventType: 'review_received' };
      
      await reputationController.updateReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_IDENTIFIER');
    });

    it('should return 400 when event type is missing', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.body = {};
      
      await reputationController.updateReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_EVENT_TYPE');
    });

    it('should return 400 when event type is invalid', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.body = { eventType: 'invalid_event' };
      
      await reputationController.updateReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'INVALID_EVENT_TYPE');
    });

    it('should update reputation for valid parameters', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.body = { 
        eventType: 'review_received',
        transactionId: 'tx-123',
        reviewId: 'review-456',
        metadata: { rating: 5 }
      };
      
      // Mock the reputation service
      reputationServiceStub.updateReputation.resolves();
      reputationServiceStub.getReputation.resolves(mockReputationData);

      await reputationController.updateReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.ok(mockResponse.body?.data?.message);
      assert.strictEqual(mockResponse.body?.data?.reputation?.walletAddress, mockWalletAddress);
      sinon.assert.calledOnceWithExactly(
        reputationServiceStub.updateReputation,
        mockWalletAddress,
        {
          eventType: 'review_received',
          transactionId: 'tx-123',
          reviewId: 'review-456',
          metadata: { rating: 5 }
        }
      );
      sinon.assert.calledOnce(reputationServiceStub.getReputation);
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.body = { eventType: 'review_received' };
      
      // Mock the reputation service to throw an error
      reputationServiceStub.updateReputation.rejects(new Error('Database error'));

      await reputationController.updateReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 500);
      assert.ok(mockResponse.body?.error?.code === 'REPUTATION_UPDATE_FAILED');
    });
  });

  describe('getReputationHistory', () => {
    it('should return 400 when wallet address is missing', async () => {
      mockRequest.params = {};
      
      await reputationController.getReputationHistory(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_IDENTIFIER');
    });

    it('should return 400 when limit is invalid', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.query = { limit: 150 }; // Above max limit of 100
      
      await reputationController.getReputationHistory(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'INVALID_LIMIT');
    });

    it('should return reputation history for valid parameters', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.query = { limit: 10 };
      
      // Mock the reputation service
      reputationServiceStub.getReputationHistory.resolves([mockHistoryEntry]);

      await reputationController.getReputationHistory(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.walletAddress, mockWalletAddress);
      assert.strictEqual(mockResponse.body?.data?.count, 1);
      assert.strictEqual(mockResponse.body?.data?.history[0]?.id, 'history-1');
      sinon.assert.calledOnceWithExactly(reputationServiceStub.getReputationHistory, mockWalletAddress, 10);
    });

    it('should return empty history on service error', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      
      // Mock the reputation service to throw an error
      reputationServiceStub.getReputationHistory.rejects(new Error('Database error'));

      await reputationController.getReputationHistory(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200); // Should still return 200 with empty history
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.walletAddress, mockWalletAddress);
      assert.strictEqual(mockResponse.body?.data?.count, 0);
      assert.ok(Array.isArray(mockResponse.body?.data?.history));
    });
  });

  describe('getBulkReputation', () => {
    it('should return 400 when wallet addresses are missing', async () => {
      mockRequest.body = {};
      
      await reputationController.getBulkReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_WALLET_ADDRESSES');
    });

    it('should return 400 when wallet addresses is not an array', async () => {
      mockRequest.body = { walletAddresses: 'not-an-array' };
      
      await reputationController.getBulkReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'EMPTY_WALLET_ADDRESSES');
    });

    it('should return 400 when too many wallet addresses are provided', async () => {
      mockRequest.body = { 
        walletAddresses: Array(51).fill(mockWalletAddress) 
      };
      
      await reputationController.getBulkReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'TOO_MANY_ADDRESSES');
    });

    it('should return bulk reputation data for valid parameters', async () => {
      const walletAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdef123456789012345678901234567890abcd'
      ];
      
      mockRequest.body = { walletAddresses };
      
      // Mock the reputation service
      const mockReputationMap = new Map();
      mockReputationMap.set(walletAddresses[0], mockReputationData);
      mockReputationMap.set(walletAddresses[1], { ...mockReputationData, walletAddress: walletAddresses[1] });
      reputationServiceStub.getBulkReputation.resolves(mockReputationMap);

      await reputationController.getBulkReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.ok(mockResponse.body?.data?.reputations instanceof Map || typeof mockResponse.body?.data?.reputations === 'object');
      sinon.assert.calledOnceWithExactly(reputationServiceStub.getBulkReputation, walletAddresses);
    });

    it('should return default reputation data on service error', async () => {
      const walletAddresses = [mockWalletAddress];
      mockRequest.body = { walletAddresses };
      
      // Mock the reputation service to throw an error
      reputationServiceStub.getBulkReputation.rejects(new Error('Database error'));

      await reputationController.getBulkReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200); // Should still return 200 with default data
      assert.ok(mockResponse.body?.success);
      assert.ok(mockResponse.body?.data?.reputations);
    });
  });

  describe('calculateReputation', () => {
    it('should return 400 when wallet address is missing', async () => {
      mockRequest.params = {};
      
      await reputationController.calculateReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_IDENTIFIER');
    });

    it('should return 400 when wallet address format is invalid', async () => {
      mockRequest.params = { walletAddress: 'invalid-address' };
      
      await reputationController.calculateReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'INVALID_WALLET_ADDRESS');
    });

    it('should calculate reputation for valid wallet address', async () => {
      mockRequest.params = { walletAddress: mockWalletAddress };
      
      // Mock the reputation service
      reputationServiceStub.calculateReputation.resolves();
      reputationServiceStub.getReputation.resolves(mockReputationData);

      await reputationController.calculateReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.ok(mockResponse.body?.data?.message);
      assert.strictEqual(mockResponse.body?.data?.reputation?.walletAddress, mockWalletAddress);
      sinon.assert.calledOnceWithExactly(reputationServiceStub.calculateReputation, mockWalletAddress);
      sinon.assert.calledOnce(reputationServiceStub.getReputation);
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { walletAddress: mockWalletAddress };
      
      // Mock the reputation service to throw an error
      reputationServiceStub.calculateReputation.rejects(new Error('Calculation failed'));

      await reputationController.calculateReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 500);
      assert.ok(mockResponse.body?.error?.code === 'REPUTATION_CALCULATION_FAILED');
    });
  });

  describe('getReputationStats', () => {
    it('should return reputation service statistics', async () => {
      // Mock the reputation service
      reputationServiceStub.getCacheStats.resolves({ size: 10, hitRate: 0.85 });

      await reputationController.getReputationStats(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.ok(mockResponse.body?.data?.cache);
      assert.strictEqual(mockResponse.body?.data?.cache?.size, 10);
      sinon.assert.calledOnce(reputationServiceStub.getCacheStats);
    });

    it('should return 500 on service error', async () => {
      // Mock the reputation service to throw an error
      reputationServiceStub.getCacheStats.rejects(new Error('Stats unavailable'));

      await reputationController.getReputationStats(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 500);
      assert.ok(mockResponse.body?.error?.code === 'STATS_RETRIEVAL_FAILED');
    });
  });

  describe('clearReputationCache', () => {
    it('should clear cache for all addresses when no wallet address provided', async () => {
      mockRequest.query = {};
      
      // Mock the reputation service
      reputationServiceStub.clearCache.resolves();

      await reputationController.clearReputationCache(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      sinon.assert.calledOnceWithExactly(reputationServiceStub.clearCache, undefined);
    });

    it('should clear cache for specific wallet address when provided', async () => {
      mockRequest.query = { walletAddress: mockWalletAddress };
      
      // Mock the reputation service
      reputationServiceStub.clearCache.resolves();

      await reputationController.clearReputationCache(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      sinon.assert.calledOnceWithExactly(reputationServiceStub.clearCache, mockWalletAddress);
    });

    it('should return 400 for invalid wallet address format', async () => {
      mockRequest.query = { walletAddress: 'invalid-address' };
      
      await reputationController.clearReputationCache(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'INVALID_WALLET_ADDRESS');
    });

    it('should return 500 on service error', async () => {
      mockRequest.query = {};
      
      // Mock the reputation service to throw an error
      reputationServiceStub.clearCache.rejects(new Error('Cache clear failed'));

      await reputationController.clearReputationCache(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 500);
      assert.ok(mockResponse.body?.error?.code === 'CACHE_CLEAR_FAILED');
    });
  });

  describe('Validation', () => {
    it('should validate wallet address format correctly', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      const invalidAddress1 = '0x123456789012345678901234567890123456789'; // Too short
      const invalidAddress2 = '0x12345678901234567890123456789012345678901'; // Too long
      const invalidAddress3 = '0x123456789012345678901234567890123456789g'; // Invalid character
      
      assert.ok(reputationController['isValidWalletAddress'](validAddress));
      assert.ok(!reputationController['isValidWalletAddress'](invalidAddress1));
      assert.ok(!reputationController['isValidWalletAddress'](invalidAddress2));
      assert.ok(!reputationController['isValidWalletAddress'](invalidAddress3));
    });
  });
});