import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { reputationRoutes } from '../routes/reputationRoutes';
import { reputationService } from '../services/reputationService';

// Mock the reputation service
jest.mock('../services/reputationService', () => ({
  reputationService: {
    getReputation: jest.fn(),
    updateReputation: jest.fn(),
    calculateReputation: jest.fn(),
    getReputationHistory: jest.fn(),
    getBulkReputation: jest.fn(),
    getCacheStats: jest.fn(),
    clearCache: jest.fn(),
  }
}));

// Mock middleware
jest.mock('../middleware/requestLogging', () => ({
  requestLogging: (req: any, res: any, next: any) => next()
}));

jest.mock('../middleware/marketplaceSecurity', () => ({
  marketplaceSecurity: {
    corsHandler: (req: any, res: any, next: any) => next(),
    createRateLimit: () => (req: any, res: any, next: any) => next()
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

describe('Reputation Routes Integration Tests', () => {
  let app: express.Application;
  const mockReputationService = reputationService as jest.Mocked<typeof reputationService>;
  const testWalletAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/marketplace/reputation', reputationRoutes);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /marketplace/reputation/:walletAddress', () => {
    it('should return reputation data for valid wallet address', async () => {
      const mockReputation = {
        walletAddress: testWalletAddress,
        score: 75.5,
        totalTransactions: 10,
        positiveReviews: 8,
        negativeReviews: 1,
        neutralReviews: 1,
        successfulSales: 5,
        successfulPurchases: 5,
        disputedTransactions: 0,
        resolvedDisputes: 0,
        averageResponseTime: 2.5,
        completionRate: 95.0,
        lastUpdated: new Date(),
      };

      mockReputationService.getReputation.mockResolvedValue(mockReputation);

      const response = await request(app)
        .get(`/marketplace/reputation/${testWalletAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReputation);
      expect(mockReputationService.getReputation).toHaveBeenCalledWith(testWalletAddress);
    });

    it('should return 400 for invalid wallet address', async () => {
      const invalidAddress = 'invalid-address';

      const response = await request(app)
        .get(`/marketplace/reputation/${invalidAddress}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_WALLET_ADDRESS');
    });

    it('should return default values when service fails', async () => {
      mockReputationService.getReputation.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get(`/marketplace/reputation/${testWalletAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.walletAddress).toBe(testWalletAddress);
      expect(response.body.data.score).toBe(50.0);
      expect(response.body.metadata.fallback).toBe(true);
    });
  });

  describe('POST /marketplace/reputation/:walletAddress', () => {
    it('should update reputation successfully', async () => {
      const updateData = {
        eventType: 'review_received',
        reviewId: 'review-123',
        metadata: { rating: 5 }
      };

      const mockUpdatedReputation = {
        walletAddress: testWalletAddress,
        score: 77.5,
        totalTransactions: 11,
        positiveReviews: 9,
        negativeReviews: 1,
        neutralReviews: 1,
        successfulSales: 5,
        successfulPurchases: 6,
        disputedTransactions: 0,
        resolvedDisputes: 0,
        averageResponseTime: 2.3,
        completionRate: 96.0,
        lastUpdated: new Date(),
      };

      mockReputationService.updateReputation.mockResolvedValue(undefined);
      mockReputationService.getReputation.mockResolvedValue(mockUpdatedReputation);

      const response = await request(app)
        .post(`/marketplace/reputation/${testWalletAddress}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Reputation updated successfully');
      expect(response.body.data.reputation).toEqual(mockUpdatedReputation);
      expect(mockReputationService.updateReputation).toHaveBeenCalledWith(
        testWalletAddress,
        updateData
      );
    });

    it('should return 400 for missing event type', async () => {
      const updateData = {
        reviewId: 'review-123',
        metadata: { rating: 5 }
      };

      const response = await request(app)
        .post(`/marketplace/reputation/${testWalletAddress}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_EVENT_TYPE');
    });

    it('should return 400 for invalid event type', async () => {
      const updateData = {
        eventType: 'invalid_event',
        reviewId: 'review-123',
        metadata: { rating: 5 }
      };

      const response = await request(app)
        .post(`/marketplace/reputation/${testWalletAddress}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_EVENT_TYPE');
    });

    it('should return 500 when update fails', async () => {
      const updateData = {
        eventType: 'review_received',
        reviewId: 'review-123',
        metadata: { rating: 5 }
      };

      mockReputationService.updateReputation.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .post(`/marketplace/reputation/${testWalletAddress}`)
        .send(updateData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REPUTATION_UPDATE_FAILED');
    });
  });

  describe('GET /marketplace/reputation/:walletAddress/history', () => {
    it('should return reputation history', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          eventType: 'review_received',
          scoreChange: 2.5,
          previousScore: 75.0,
          newScore: 77.5,
          description: 'Positive review received',
          createdAt: new Date(),
        },
        {
          id: 'history-2',
          eventType: 'transaction_completed',
          scoreChange: 1.0,
          previousScore: 74.0,
          newScore: 75.0,
          description: 'Successfully completed transaction',
          createdAt: new Date(),
        }
      ];

      mockReputationService.getReputationHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get(`/marketplace/reputation/${testWalletAddress}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.walletAddress).toBe(testWalletAddress);
      expect(response.body.data.history).toEqual(mockHistory);
      expect(response.body.data.count).toBe(2);
      expect(mockReputationService.getReputationHistory).toHaveBeenCalledWith(testWalletAddress, 50);
    });

    it('should respect limit parameter', async () => {
      mockReputationService.getReputationHistory.mockResolvedValue([]);

      const response = await request(app)
        .get(`/marketplace/reputation/${testWalletAddress}/history?limit=25`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockReputationService.getReputationHistory).toHaveBeenCalledWith(testWalletAddress, 25);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get(`/marketplace/reputation/${testWalletAddress}/history?limit=150`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_LIMIT');
    });

    it('should return empty history when service fails', async () => {
      mockReputationService.getReputationHistory.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get(`/marketplace/reputation/${testWalletAddress}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toEqual([]);
      expect(response.body.metadata.fallback).toBe(true);
    });
  });

  describe('POST /marketplace/reputation/bulk', () => {
    it('should return bulk reputation data', async () => {
      const addresses = [testWalletAddress, '0x9876543210987654321098765432109876543210'];
      const mockReputationMap = new Map();
      
      addresses.forEach(address => {
        mockReputationMap.set(address, {
          walletAddress: address,
          score: 75.0,
          totalTransactions: 10,
          positiveReviews: 8,
          negativeReviews: 1,
          neutralReviews: 1,
          successfulSales: 5,
          successfulPurchases: 5,
          disputedTransactions: 0,
          resolvedDisputes: 0,
          averageResponseTime: 2.5,
          completionRate: 95.0,
          lastUpdated: new Date(),
        });
      });

      mockReputationService.getBulkReputation.mockResolvedValue(mockReputationMap);

      const response = await request(app)
        .post('/marketplace/reputation/bulk')
        .send({ walletAddresses: addresses })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(2);
      expect(Object.keys(response.body.data.reputations)).toHaveLength(2);
      expect(mockReputationService.getBulkReputation).toHaveBeenCalledWith(addresses);
    });

    it('should return 400 for missing wallet addresses', async () => {
      const response = await request(app)
        .post('/marketplace/reputation/bulk')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_WALLET_ADDRESSES');
    });

    it('should return 400 for too many addresses', async () => {
      const addresses = Array(51).fill(0).map((_, i) => 
        `0x${i.toString().padStart(40, '0')}`
      );

      const response = await request(app)
        .post('/marketplace/reputation/bulk')
        .send({ walletAddresses: addresses })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOO_MANY_ADDRESSES');
    });

    it('should return 400 for invalid wallet addresses', async () => {
      const addresses = [testWalletAddress, 'invalid-address'];

      const response = await request(app)
        .post('/marketplace/reputation/bulk')
        .send({ walletAddresses: addresses })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_WALLET_ADDRESSES');
    });
  });

  describe('POST /marketplace/reputation/:walletAddress/calculate', () => {
    it('should calculate reputation successfully', async () => {
      const mockScore = 78.5;
      const mockReputation = {
        walletAddress: testWalletAddress,
        score: mockScore,
        totalTransactions: 12,
        positiveReviews: 10,
        negativeReviews: 1,
        neutralReviews: 1,
        successfulSales: 6,
        successfulPurchases: 6,
        disputedTransactions: 0,
        resolvedDisputes: 0,
        averageResponseTime: 2.2,
        completionRate: 97.0,
        lastUpdated: new Date(),
      };

      mockReputationService.calculateReputation.mockResolvedValue(mockScore);
      mockReputationService.getReputation.mockResolvedValue(mockReputation);

      const response = await request(app)
        .post(`/marketplace/reputation/${testWalletAddress}/calculate`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Reputation calculated successfully');
      expect(response.body.data.score).toBe(mockScore);
      expect(response.body.data.reputation).toEqual(mockReputation);
    });

    it('should return 500 when calculation fails', async () => {
      mockReputationService.calculateReputation.mockRejectedValue(new Error('Calculation failed'));

      const response = await request(app)
        .post(`/marketplace/reputation/${testWalletAddress}/calculate`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REPUTATION_CALCULATION_FAILED');
    });
  });

  describe('GET /marketplace/reputation/stats', () => {
    it('should return reputation service stats', async () => {
      const mockStats = {
        size: 10,
        hitRate: 0.85
      };

      mockReputationService.getCacheStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/marketplace/reputation/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cache).toEqual(mockStats);
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('DELETE /marketplace/reputation/cache', () => {
    it('should clear cache for specific wallet', async () => {
      mockReputationService.clearCache.mockReturnValue(undefined);

      const response = await request(app)
        .delete(`/marketplace/reputation/cache?walletAddress=${testWalletAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain(testWalletAddress);
      expect(mockReputationService.clearCache).toHaveBeenCalledWith(testWalletAddress);
    });

    it('should clear all cache when no wallet address provided', async () => {
      mockReputationService.clearCache.mockReturnValue(undefined);

      const response = await request(app)
        .delete('/marketplace/reputation/cache')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('All reputation cache cleared');
      expect(mockReputationService.clearCache).toHaveBeenCalledWith();
    });

    it('should return 400 for invalid wallet address', async () => {
      const response = await request(app)
        .delete('/marketplace/reputation/cache?walletAddress=invalid-address')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_WALLET_ADDRESS');
    });
  });
});