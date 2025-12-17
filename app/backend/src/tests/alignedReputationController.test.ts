import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import sinon from 'sinon';
import { alignedReputationController } from '../controllers/alignedReputationController';
import { reputationService } from '../services/reputationService';
import { ReputationDataTransformer } from '../services/reputationDataTransformer';

describe('AlignedReputationController', () => {
  // Mock request and response objects
  let mockRequest: any;
  let mockResponse: any;
  let reputationServiceStub: sinon.SinonStubbedInstance<any>;

  const mockWalletAddress = '0x1234567890123456789012345678901234567890';
  const mockUserId = 'user-123';
  const mockBackendReputation = {
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

  const mockBackendHistory = [
    {
      id: 'event-1',
      eventType: 'review_received',
      scoreChange: '5.00',
      previousScore: '70.50',
      newScore: '75.50',
      description: 'Positive review received',
      createdAt: new Date(),
    }
  ];

  const mockFrontendEvents = [
    {
      id: 'event-1',
      userId: mockUserId,
      type: 'post_liked',
      category: 'governance',
      points: 5.0,
      description: 'Positive review received',
      timestamp: new Date(),
      metadata: {}
    }
  ];

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

  describe('getUserReputation', () => {
    it('should return 400 when identifier is missing', async () => {
      mockRequest.params = {};
      
      await alignedReputationController.getUserReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_IDENTIFIER');
    });

    it('should return user reputation for valid identifier', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      
      // Mock the reputation service and transformer
      reputationServiceStub.getReputation.resolves(mockBackendReputation);
      sinon.stub(ReputationDataTransformer, 'transformReputationData').returns(mockFrontendReputation);

      await alignedReputationController.getUserReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.totalScore, 75.5);
      sinon.assert.calledOnceWithExactly(reputationServiceStub.getReputation, mockWalletAddress);
    });

    it('should return default reputation data on service error', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      
      // Mock the reputation service to throw an error
      reputationServiceStub.getReputation.rejects(new Error('Service unavailable'));
      sinon.stub(ReputationDataTransformer, 'transformReputationData').returns(mockFrontendReputation);

      await alignedReputationController.getUserReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200); // Should still return 200 with default data
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.totalScore, 75.5); // Transformed default score
    });
  });

  describe('getReputationEvents', () => {
    it('should return 400 when identifier is missing', async () => {
      mockRequest.params = {};
      
      await alignedReputationController.getReputationEvents(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_IDENTIFIER');
    });

    it('should return 400 when limit is invalid', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.query = { limit: 150 }; // Above max limit of 100
      
      await alignedReputationController.getReputationEvents(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'INVALID_LIMIT');
    });

    it('should return reputation events for valid parameters', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.query = { limit: 10 };
      
      // Mock the reputation service and transformer
      reputationServiceStub.getReputationHistory.resolves(mockBackendHistory);
      sinon.stub(ReputationDataTransformer, 'transformReputationHistory').returns(mockFrontendEvents);

      await alignedReputationController.getReputationEvents(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.userId, mockWalletAddress);
      assert.strictEqual(mockResponse.body?.data?.count, 1);
      assert.strictEqual(mockResponse.body?.data?.events[0]?.id, 'event-1');
      sinon.assert.calledOnceWithExactly(reputationServiceStub.getReputationHistory, mockWalletAddress, 10);
    });

    it('should return empty events on service error', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      
      // Mock the reputation service to throw an error
      reputationServiceStub.getReputationHistory.rejects(new Error('Database error'));

      await alignedReputationController.getReputationEvents(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200); // Should still return 200 with empty events
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.userId, mockWalletAddress);
      assert.strictEqual(mockResponse.body?.data?.count, 0);
      assert.ok(Array.isArray(mockResponse.body?.data?.events));
    });
  });

  describe('awardPoints', () => {
    it('should return 400 when identifier is missing', async () => {
      mockRequest.params = {};
      mockRequest.body = { category: 'posting', points: 10 };
      
      await alignedReputationController.awardPoints(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_IDENTIFIER');
    });

    it('should return 400 when category is missing', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.body = { points: 10 };
      
      await alignedReputationController.awardPoints(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_DATA');
    });

    it('should award points for valid parameters', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.body = { 
        category: 'posting', 
        points: 10,
        description: 'Good post'
      };
      
      // Mock the reputation service and transformer
      reputationServiceStub.updateReputation.resolves();
      reputationServiceStub.getReputation.resolves(mockBackendReputation);
      sinon.stub(ReputationDataTransformer, 'transformReputationData').returns(mockFrontendReputation);

      await alignedReputationController.awardPoints(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      assert.ok(mockResponse.body?.data?.message);
      assert.strictEqual(mockResponse.body?.data?.reputation?.totalScore, 75.5);
      sinon.assert.calledOnceWithExactly(
        reputationServiceStub.updateReputation,
        mockWalletAddress,
        {
          eventType: 'review_received',
          metadata: { category: 'posting', points: 10, description: 'Good post' }
        }
      );
      sinon.assert.calledOnce(reputationServiceStub.getReputation);
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      mockRequest.body = { category: 'posting', points: 10 };
      
      // Mock the reputation service to throw an error
      reputationServiceStub.updateReputation.rejects(new Error('Database error'));

      await alignedReputationController.awardPoints(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 500);
      assert.ok(mockResponse.body?.error?.code === 'REPUTATION_AWARD_FAILED');
    });
  });

  describe('checkForAchievements', () => {
    it('should return 400 when identifier is missing', async () => {
      mockRequest.params = {};
      
      await alignedReputationController.checkForAchievements(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 400);
      assert.ok(mockResponse.body?.error?.code === 'MISSING_IDENTIFIER');
    });

    it('should return achievements check result for valid identifier', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      
      await alignedReputationController.checkForAchievements(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200);
      assert.ok(mockResponse.body?.success);
      // Should return empty array as placeholder
      assert.ok(Array.isArray(mockResponse.body?.data));
      assert.strictEqual(mockResponse.body?.data?.length, 0);
    });
  });

  describe('Validation', () => {
    it('should validate wallet address format correctly', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      const invalidAddress1 = '0x123456789012345678901234567890123456789'; // Too short
      const invalidAddress2 = '0x12345678901234567890123456789012345678901'; // Too long
      const invalidAddress3 = '0x123456789012345678901234567890123456789g'; // Invalid character
      
      assert.ok(alignedReputationController['isValidWalletAddress'](validAddress));
      assert.ok(!alignedReputationController['isValidWalletAddress'](invalidAddress1));
      assert.ok(!alignedReputationController['isValidWalletAddress'](invalidAddress2));
      assert.ok(!alignedReputationController['isValidWalletAddress'](invalidAddress3));
    });
    
    it('should map category to event type correctly', () => {
      // Test the private method through direct access
      const mapCategoryToEventType = (alignedReputationController as any)['mapCategoryToEventType'].bind(alignedReputationController);
      
      assert.strictEqual(mapCategoryToEventType('posting'), 'review_received');
      assert.strictEqual(mapCategoryToEventType('governance'), 'review_received');
      assert.strictEqual(mapCategoryToEventType('community'), 'completion_rate');
      assert.strictEqual(mapCategoryToEventType('trading'), 'transaction_completed');
      assert.strictEqual(mapCategoryToEventType('moderation'), 'dispute_resolved');
      assert.strictEqual(mapCategoryToEventType('unknown'), 'review_received'); // Default
    });
  });

  describe('Error Scenarios', () => {
    it('should handle service errors gracefully', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      
      // Mock the reputation service to throw an error
      reputationServiceStub.getReputation.rejects(new Error('Service unavailable'));
      sinon.stub(ReputationDataTransformer, 'transformReputationData').returns({
        totalScore: 50.0,
        level: { id: 1, name: 'Newcomer', minScore: 0, maxScore: 99, color: '#94A3B8', icon: '🌱', privileges: [] },
        badges: [],
        progress: [],
        breakdown: {
          posting: 0,
          governance: 0,
          community: 0,
          trading: 0,
          moderation: 0
        },
        achievements: []
      });

      await alignedReputationController.getUserReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200); // Should still return 200 with default data
      assert.ok(mockResponse.body?.success);
    });

    it('should return default values as fallback', async () => {
      mockRequest.params = { identifier: mockWalletAddress };
      
      // Mock the reputation service to throw an error
      reputationServiceStub.getReputation.rejects(new Error('Service unavailable'));
      sinon.stub(ReputationDataTransformer, 'transformReputationData').returns({
        totalScore: 50.0,
        level: { id: 1, name: 'Newcomer', minScore: 0, maxScore: 99, color: '#94A3B8', icon: '🌱', privileges: [] },
        badges: [],
        progress: [],
        breakdown: {
          posting: 0,
          governance: 0,
          community: 0,
          trading: 0,
          moderation: 0
        },
        achievements: []
      });

      await alignedReputationController.getUserReputation(mockRequest, mockResponse);
      
      assert.strictEqual(mockResponse.statusCode, 200); // Should still return 200
      assert.ok(mockResponse.body?.success);
      assert.strictEqual(mockResponse.body?.data?.totalScore, 50.0); // Default score
    });
  });
});