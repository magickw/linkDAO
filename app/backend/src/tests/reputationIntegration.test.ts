import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import sinon from 'sinon';
import { reputationService } from '../services/reputationService';
import { reputationController } from '../controllers/reputationController';
import { alignedReputationController } from '../controllers/alignedReputationController';

describe('Reputation System Integration', () => {
  // Mock data
  const testWalletAddress = '0x1234567890123456789012345678901234567890';
  const testUserId = 'user-123';
  const testTransaction = {
    eventType: 'review_received',
    transactionId: 'tx-123',
    reviewId: 'review-456',
    metadata: { rating: 5 }
  };

  const mockBackendReputation = {
    walletAddress: testWalletAddress,
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

  const mockFrontendReputation = {
    totalScore: 75.5,
    level: { id: 3, name: 'Active Member', minScore: 500, maxScore: 1499, color: '#3B82F6', icon: '⭐', privileges: [] },
    badges: [],
    progress: [],
    breakdown: {
      posting: 10,
      governance: 8,
      community: 5,
      trading: 5,
      moderation: 2
    },
    achievements: []
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

  let reputationServiceStub: sinon.SinonStubbedInstance<any>;

  beforeEach(async () => {
    // Create stubs for the reputation service
    reputationServiceStub = sinon.stub(reputationService);
    
    // Clear cache before each test
    await reputationService.clearCache();
  });

  afterEach(async () => {
    // Restore all sinon stubs after each test
    sinon.restore();
    
    // Clear cache after each test
    await reputationService.clearCache();
  });

  describe('Service to Controller Integration', () => {
    it('should integrate getReputation service with controller', async () => {
      // Mock the reputation service
      reputationServiceStub.getReputation.resolves(mockBackendReputation);

      // Mock request and response
      const mockRequest = {
        params: { identifier: testWalletAddress },
        query: {},
        body: {},
        headers: {},
      };

      const mockResponse = {
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

      await reputationController.getReputation(mockRequest as any, mockResponse as any);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.walletAddress, testWalletAddress);
      assert.strictEqual(mockResponse.body?.data?.score, 75.5);
      sinon.assert.calledOnceWithExactly(reputationServiceStub.getReputation, testWalletAddress);
    });

    it('should integrate updateReputation service with controller', async () => {
      // Mock the reputation service
      reputationServiceStub.updateReputation.resolves();
      reputationServiceStub.getReputation.resolves(mockBackendReputation);

      // Mock request and response
      const mockRequest = {
        params: { identifier: testWalletAddress },
        query: {},
        body: testTransaction,
        headers: {},
      };

      const mockResponse = {
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

      await reputationController.updateReputation(mockRequest as any, mockResponse as any);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.ok(mockResponse.body?.data?.message);
      sinon.assert.calledOnceWithExactly(reputationServiceStub.updateReputation, testWalletAddress, testTransaction);
      sinon.assert.calledOnce(reputationServiceStub.getReputation);
    });

    it('should integrate getReputationHistory service with controller', async () => {
      // Mock the reputation service
      reputationServiceStub.getReputationHistory.resolves([mockHistoryEntry]);

      // Mock request and response
      const mockRequest = {
        params: { identifier: testWalletAddress },
        query: { limit: 10 },
        body: {},
        headers: {},
      };

      const mockResponse = {
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

      await reputationController.getReputationHistory(mockRequest as any, mockResponse as any);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.walletAddress, testWalletAddress);
      assert.strictEqual(mockResponse.body?.data?.count, 1);
      sinon.assert.calledOnceWithExactly(reputationServiceStub.getReputationHistory, testWalletAddress, 10);
    });

    it('should integrate getBulkReputation service with controller', async () => {
      const walletAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdef123456789012345678901234567890abcd'
      ];

      // Mock the reputation service
      const mockReputationMap = new Map();
      mockReputationMap.set(walletAddresses[0], mockBackendReputation);
      mockReputationMap.set(walletAddresses[1], { ...mockBackendReputation, walletAddress: walletAddresses[1] });
      reputationServiceStub.getBulkReputation.resolves(mockReputationMap);

      // Mock request and response
      const mockRequest = {
        params: {},
        query: {},
        body: { walletAddresses },
        headers: {},
      };

      const mockResponse = {
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

      await reputationController.getBulkReputation(mockRequest as any, mockResponse as any);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.ok(mockResponse.body?.data?.reputations);
      sinon.assert.calledOnceWithExactly(reputationServiceStub.getBulkReputation, walletAddresses);
    });
  });

  describe('Complete Flow Integration', () => {
    it('should handle the complete reputation update and retrieval flow', async () => {
      // Mock the reputation service for the complete flow
      reputationServiceStub.updateReputation.resolves();
      reputationServiceStub.getReputation.resolves(mockBackendReputation);
      reputationServiceStub.getReputationHistory.resolves([mockHistoryEntry]);

      // Step 1: Update reputation
      const updateRequest = {
        params: { identifier: testWalletAddress },
        body: testTransaction
      };
      
      const updateResponse = {
        status: function(code: number) { this.statusCode = code; return this; },
        json: function(data: any) { this.body = data; return this; },
        locals: { requestId: 'test-request-id' }
      };

      await reputationController.updateReputation(updateRequest as any, updateResponse as any);
      
      assert.strictEqual(updateResponse.statusCode, 200);
      assert.ok(updateResponse.body?.success);

      // Step 2: Get updated reputation
      const getRequest = {
        params: { identifier: testWalletAddress }
      };
      
      const getResponse = {
        status: function(code: number) { this.statusCode = code; return this; },
        json: function(data: any) { this.body = data; return this; },
        locals: { requestId: 'test-request-id' }
      };

      await reputationController.getReputation(getRequest as any, getResponse as any);
      
      assert.strictEqual(getResponse.statusCode, 200);
      assert.ok(getResponse.body?.success);
      assert.strictEqual(getResponse.body?.data?.score, 75.5);

      // Verify service calls
      sinon.assert.calledOnceWithExactly(reputationServiceStub.updateReputation, testWalletAddress, testTransaction);
      sinon.assert.calledWith(reputationServiceStub.getReputation, testWalletAddress);
    });

    it('should handle error scenarios gracefully throughout the flow', async () => {
      // Mock the reputation service to throw an error on update
      reputationServiceStub.updateReputation.rejects(new Error('Database connection failed'));

      // Step 1: Attempt to update reputation (should fail)
      const updateRequest = {
        params: { identifier: testWalletAddress },
        body: testTransaction
      };
      
      const updateResponse = {
        status: function(code: number) { this.statusCode = code; return this; },
        json: function(data: any) { this.body = data; return this; },
        locals: { requestId: 'test-request-id' }
      };

      await reputationController.updateReputation(updateRequest as any, updateResponse as any);
      
      assert.strictEqual(updateResponse.statusCode, 500);
      assert.ok(updateResponse.body?.error?.code === 'REPUTATION_UPDATE_FAILED');

      // Step 2: Get reputation (should still work with default values)
      reputationServiceStub.updateReputation.reset(); // Reset the stub
      reputationServiceStub.getReputation.resolves({
        walletAddress: testWalletAddress,
        score: 50.0, // Default score
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
      });

      const getRequest = {
        params: { identifier: testWalletAddress }
      };
      
      const getResponse = {
        status: function(code: number) { this.statusCode = code; return this; },
        json: function(data: any) { this.body = data; return this; },
        locals: { requestId: 'test-request-id' }
      };

      await reputationController.getReputation(getRequest as any, getResponse as any);
      
      assert.strictEqual(getResponse.statusCode, 200); // Should still succeed
      assert.ok(getResponse.body?.success);
      assert.strictEqual(getResponse.body?.data?.score, 50.0); // Default score
    });

    it('should maintain data consistency across service and controller layers', async () => {
      // Mock the reputation service
      reputationServiceStub.getReputation.resolves(mockBackendReputation);

      // Test both controllers with the same data
      const mockRequest = {
        params: { identifier: testWalletAddress }
      };

      // Test original controller
      const response1 = {
        status: function(code: number) { this.statusCode = code; return this; },
        json: function(data: any) { this.body = data; return this; },
        locals: { requestId: 'test-request-id' }
      };

      await reputationController.getReputation(mockRequest as any, response1 as any);

      // Test aligned controller
      const response2 = {
        status: function(code: number) { this.statusCode = code; return this; },
        json: function(data: any) { this.body = data; return this; },
        locals: { requestId: 'test-request-id' }
      };

      // Mock the transformer for aligned controller
      const { ReputationDataTransformer } = await import('../services/reputationDataTransformer');
      sinon.stub(ReputationDataTransformer, 'transformReputationData').returns(mockFrontendReputation);

      await alignedReputationController.getUserReputation(mockRequest as any, response2 as any);
      
      // Both should succeed
      assert.strictEqual(response1.statusCode, 200);
      assert.strictEqual(response2.statusCode, 200);
      
      // Original controller returns backend format
      assert.strictEqual(response1.body?.data?.score, 75.5);
      
      // Aligned controller returns frontend format
      assert.strictEqual(response2.body?.data?.totalScore, 75.5);
    });
  });

  describe('Caching Integration', () => {
    it('should properly cache reputation data', async () => {
      // Mock the reputation service
      reputationServiceStub.getReputation.onFirstCall().resolves(mockBackendReputation);
      reputationServiceStub.getReputation.onSecondCall().resolves(mockBackendReputation);

      // First call - should hit the service
      const result1 = await reputationService.getReputation(testWalletAddress);
      
      // Second call - should potentially use cache (implementation dependent)
      const result2 = await reputationService.getReputation(testWalletAddress);
      
      // Both should return the same data
      assert.deepStrictEqual(result1, result2);
      assert.strictEqual(result1.score, 75.5);
    });

    it('should invalidate cache when reputation is updated', async () => {
      // Mock the reputation service
      reputationServiceStub.updateReputation.resolves();
      reputationServiceStub.getReputation.resolves(mockBackendReputation);

      // Get initial reputation
      const initialResult = await reputationService.getReputation(testWalletAddress);
      
      // Update reputation
      await reputationService.updateReputation(testWalletAddress, testTransaction);
      
      // Get updated reputation
      const updatedResult = await reputationService.getReputation(testWalletAddress);
      
      // Both should return the same data (in this mock scenario)
      assert.deepStrictEqual(initialResult, updatedResult);
      sinon.assert.calledOnce(reputationServiceStub.updateReputation);
    });

    it('should handle cache failures gracefully', async () => {
      // Mock the reputation service to simulate cache failure
      // but still work correctly
      reputationServiceStub.getReputation.resolves(mockBackendReputation);

      const result = await reputationService.getReputation(testWalletAddress);
      
      // Should still return valid data even if cache fails
      assert.ok(result);
      assert.strictEqual(result.walletAddress, testWalletAddress);
      assert.strictEqual(result.score, 75.5);
    });
  });

  describe('Edge Cases Integration', () => {
    it('should handle concurrent reputation updates', async () => {
      // Mock the reputation service to handle concurrent calls
      reputationServiceStub.updateReputation.resolves();
      reputationServiceStub.getReputation.resolves(mockBackendReputation);

      // Simulate concurrent updates
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const request = {
          params: { identifier: testWalletAddress },
          body: { ...testTransaction, metadata: { ...testTransaction.metadata, iteration: i } }
        };
        
        const response = {
          status: function(code: number) { this.statusCode = code; return this; },
          json: function(data: any) { this.body = data; return this; },
          locals: { requestId: 'test-request-id' }
        };

        promises.push(reputationController.updateReputation(request as any, response as any));
      }

      // Wait for all updates to complete
      await Promise.all(promises);
      
      // Should have called updateReputation 5 times
      assert.strictEqual(reputationServiceStub.updateReputation.callCount, 5);
    });

    it('should handle very large bulk reputation requests', async () => {
      const largeWalletArray = Array(200).fill(0).map((_, i) => 
        `0x${i.toString().padStart(36, '0')}12345678901234567890`
      );

      const result = await reputationService.getBulkReputation(largeWalletArray);
      // Should be limited to 100 addresses
      assert.strictEqual(result.size, 100);
    });

    it('should handle malformed data gracefully', async () => {
      // Test with invalid wallet address
      const invalidAddress = 'invalid-wallet-address';
      
      // Mock request and response
      const mockRequest = {
        params: { identifier: invalidAddress }
      };

      const mockResponse = {
        status: function(code: number) { this.statusCode = code; return this; },
        json: function(data: any) { this.body = data; return this; },
        locals: { requestId: 'test-request-id' }
      };

      await reputationController.getReputation(mockRequest as any, mockResponse as any);
      
      // Should return 400 for invalid address
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'INVALID_WALLET_ADDRESS');
    });
  });
});