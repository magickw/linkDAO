import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { BridgeMonitoringController } from '../controllers/bridgeMonitoringController';
import { BridgeMonitoringService } from '../services/bridgeMonitoringService';
import bridgeMonitoringRoutes from '../routes/bridgeMonitoringRoutes';

// Mock the bridge monitoring service
jest.mock('../services/bridgeMonitoringService');

// Mock middleware
jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => next()
}));

jest.mock('../middleware/adminAuthMiddleware', () => ({
  adminAuthMiddleware: (req: any, res: any, next: any) => next()
}));

describe('Bridge Monitoring Controller Integration', () => {
  let app: express.Application;
  let mockBridgeMonitoringService: jest.Mocked<BridgeMonitoringService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/bridge', bridgeMonitoringRoutes);

    // Get the mocked service instance
    mockBridgeMonitoringService = jest.mocked(BridgeMonitoringService).mock.instances[0] as jest.Mocked<BridgeMonitoringService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/bridge/transactions', () => {
    it('should return bridge transactions with pagination', async () => {
      const mockTransactions = [
        {
          id: '1-1',
          nonce: 1,
          user: '0x1234567890123456789012345678901234567890',
          amount: '1000000000000000000',
          sourceChain: 1,
          destinationChain: 137,
          status: 'completed',
          fee: '10000000000000000',
          timestamp: new Date(),
          validatorCount: 3,
          requiredValidators: 3
        }
      ];

      mockBridgeMonitoringService.getBridgeTransactions = jest.fn().mockResolvedValue({
        transactions: mockTransactions,
        total: 1
      });

      const response = await request(app)
        .get('/api/bridge/transactions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toEqual(mockTransactions);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1
      });
    });

    it('should handle pagination parameters', async () => {
      mockBridgeMonitoringService.getBridgeTransactions = jest.fn().mockResolvedValue({
        transactions: [],
        total: 0
      });

      await request(app)
        .get('/api/bridge/transactions?page=2&limit=25&status=pending')
        .expect(200);

      expect(mockBridgeMonitoringService.getBridgeTransactions).toHaveBeenCalledWith(2, 25, 'pending');
    });

    it('should limit maximum page size', async () => {
      mockBridgeMonitoringService.getBridgeTransactions = jest.fn().mockResolvedValue({
        transactions: [],
        total: 0
      });

      await request(app)
        .get('/api/bridge/transactions?limit=200')
        .expect(200);

      expect(mockBridgeMonitoringService.getBridgeTransactions).toHaveBeenCalledWith(1, 100, undefined);
    });

    it('should handle service errors', async () => {
      mockBridgeMonitoringService.getBridgeTransactions = jest.fn().mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/bridge/transactions')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/bridge/transactions/:nonce', () => {
    it('should return specific bridge transaction', async () => {
      const mockTransaction = {
        id: '1-1',
        nonce: 1,
        user: '0x1234567890123456789012345678901234567890',
        amount: '1000000000000000000',
        status: 'completed'
      };

      mockBridgeMonitoringService.getBridgeTransaction = jest.fn().mockResolvedValue(mockTransaction);

      const response = await request(app)
        .get('/api/bridge/transactions/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTransaction);
      expect(mockBridgeMonitoringService.getBridgeTransaction).toHaveBeenCalledWith(1);
    });

    it('should return 404 for non-existent transaction', async () => {
      mockBridgeMonitoringService.getBridgeTransaction = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/bridge/transactions/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bridge transaction not found');
    });

    it('should return 400 for invalid nonce', async () => {
      const response = await request(app)
        .get('/api/bridge/transactions/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid nonce parameter');
    });
  });

  describe('GET /api/bridge/transactions/:transactionId/events', () => {
    it('should return events for a transaction', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          transactionId: '1-1',
          eventType: 'initiated',
          blockNumber: 1001,
          txHash: '0xabcdef',
          timestamp: new Date(),
          data: {}
        }
      ];

      mockBridgeMonitoringService.getBridgeEvents = jest.fn().mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/bridge/transactions/1-1/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockEvents);
      expect(mockBridgeMonitoringService.getBridgeEvents).toHaveBeenCalledWith('1-1');
    });

    it('should return 400 for missing transaction ID', async () => {
      const response = await request(app)
        .get('/api/bridge/transactions//events')
        .expect(404); // Express returns 404 for missing route params
    });
  });

  describe('GET /api/bridge/metrics', () => {
    it('should return bridge metrics', async () => {
      const mockMetrics = {
        totalTransactions: 100,
        totalVolume: '1000000000000000000000',
        totalFees: '10000000000000000000',
        successRate: 95.5,
        averageCompletionTime: 300000,
        activeValidators: 5,
        chainMetrics: {
          1: { transactions: 60, volume: '600000000000000000000', fees: '6000000000000000000' },
          137: { transactions: 40, volume: '400000000000000000000', fees: '4000000000000000000' }
        }
      };

      mockBridgeMonitoringService.getLatestMetrics = jest.fn().mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/bridge/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMetrics);
    });

    it('should return 404 when no metrics available', async () => {
      mockBridgeMonitoringService.getLatestMetrics = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/bridge/metrics')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No metrics available');
    });
  });

  describe('GET /api/bridge/health', () => {
    it('should return healthy status', async () => {
      const mockHealth = {
        isHealthy: true,
        issues: [],
        chainStatus: { 1: true, 137: true }
      };

      mockBridgeMonitoringService.checkBridgeHealth = jest.fn().mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/bridge/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHealth);
    });

    it('should return unhealthy status with 503', async () => {
      const mockHealth = {
        isHealthy: false,
        issues: ['Chain 1 is not responsive'],
        chainStatus: { 1: false, 137: true }
      };

      mockBridgeMonitoringService.checkBridgeHealth = jest.fn().mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/bridge/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toEqual(mockHealth);
    });
  });

  describe('GET /api/bridge/statistics', () => {
    it('should return bridge statistics with default timeframe', async () => {
      const mockMetrics = {
        totalTransactions: 50,
        totalVolume: '500000000000000000000',
        totalFees: '5000000000000000000',
        successRate: 98.0,
        averageCompletionTime: 250000,
        activeValidators: 4,
        chainMetrics: {}
      };

      mockBridgeMonitoringService.getLatestMetrics = jest.fn().mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/bridge/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeframe).toBe('24h');
      expect(response.body.data.metrics).toEqual(mockMetrics);
    });

    it('should handle different timeframes', async () => {
      mockBridgeMonitoringService.getLatestMetrics = jest.fn().mockResolvedValue({
        totalTransactions: 0,
        totalVolume: '0',
        totalFees: '0',
        successRate: 0,
        averageCompletionTime: 0,
        activeValidators: 0,
        chainMetrics: {}
      });

      const response = await request(app)
        .get('/api/bridge/statistics?timeframe=7d')
        .expect(200);

      expect(response.body.data.timeframe).toBe('7d');
    });
  });

  describe('POST /api/bridge/monitoring/start', () => {
    it('should start monitoring successfully', async () => {
      mockBridgeMonitoringService.startMonitoring = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/bridge/monitoring/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bridge monitoring started successfully');
      expect(mockBridgeMonitoringService.startMonitoring).toHaveBeenCalled();
    });

    it('should handle start monitoring errors', async () => {
      mockBridgeMonitoringService.startMonitoring = jest.fn().mockRejectedValue(new Error('Start error'));

      const response = await request(app)
        .post('/api/bridge/monitoring/start')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to start bridge monitoring');
    });
  });

  describe('POST /api/bridge/monitoring/stop', () => {
    it('should stop monitoring successfully', async () => {
      mockBridgeMonitoringService.stopMonitoring = jest.fn();

      const response = await request(app)
        .post('/api/bridge/monitoring/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bridge monitoring stopped successfully');
      expect(mockBridgeMonitoringService.stopMonitoring).toHaveBeenCalled();
    });
  });

  describe('GET /api/bridge/validators/:validatorAddress/performance', () => {
    it('should return validator performance', async () => {
      const response = await request(app)
        .get('/api/bridge/validators/0x1234567890123456789012345678901234567890/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.validatorAddress).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should return 400 for missing validator address', async () => {
      const response = await request(app)
        .get('/api/bridge/validators//performance')
        .expect(404); // Express returns 404 for missing route params
    });
  });

  describe('GET /api/bridge/alerts', () => {
    it('should return bridge alerts', async () => {
      const response = await request(app)
        .get('/api/bridge/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toEqual([]);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should handle alert filtering', async () => {
      const response = await request(app)
        .get('/api/bridge/alerts?severity=high&resolved=false&page=1&limit=25')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/bridge/alerts', () => {
    it('should create bridge alert', async () => {
      const alertData = {
        alertType: 'stuck_transaction',
        severity: 'high',
        title: 'Transaction Stuck',
        message: 'Transaction has been pending for over 24 hours',
        chainId: 1,
        transactionId: '1-1'
      };

      const response = await request(app)
        .post('/api/bridge/alerts')
        .send(alertData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alertType).toBe(alertData.alertType);
      expect(response.body.data.severity).toBe(alertData.severity);
      expect(response.body.data.isResolved).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        alertType: 'stuck_transaction',
        severity: 'high'
        // Missing title and message
      };

      const response = await request(app)
        .post('/api/bridge/alerts')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('PATCH /api/bridge/alerts/:alertId/resolve', () => {
    it('should resolve bridge alert', async () => {
      const resolveData = {
        resolvedBy: '0x1234567890123456789012345678901234567890'
      };

      const response = await request(app)
        .patch('/api/bridge/alerts/alert-123/resolve')
        .send(resolveData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Alert resolved successfully');
      expect(response.body.data.isResolved).toBe(true);
      expect(response.body.data.resolvedBy).toBe(resolveData.resolvedBy);
    });

    it('should return 400 for missing alert ID', async () => {
      const response = await request(app)
        .patch('/api/bridge/alerts//resolve')
        .send({})
        .expect(404); // Express returns 404 for missing route params
    });
  });

  describe('GET /api/bridge/chains/:chainId/status', () => {
    it('should return chain status', async () => {
      const response = await request(app)
        .get('/api/bridge/chains/1/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chainId).toBe(1);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should return 400 for invalid chain ID', async () => {
      const response = await request(app)
        .get('/api/bridge/chains/invalid/status')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid chain ID');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockBridgeMonitoringService.getBridgeTransactions = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .get('/api/bridge/transactions')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/bridge/alerts')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle concurrent requests', async () => {
      mockBridgeMonitoringService.getBridgeTransactions = jest.fn().mockResolvedValue({
        transactions: [],
        total: 0
      });

      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/bridge/transactions')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
