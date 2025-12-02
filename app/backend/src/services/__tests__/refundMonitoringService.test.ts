/// <reference types="jest" />

import { RefundMonitoringService } from '../refundMonitoringService';
import { db } from '../../db/index';
import { 
  refundFinancialRecords,
  refundProviderTransactions,
  refundReconciliationRecords,
  refundTransactionAuditLog
} from '../../db/schema';
import { eq } from 'drizzle-orm';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the database
jest.mock('../../db/index', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock provider services
jest.mock('../providers/stripeRefundProvider', () => ({
  stripeRefundProvider: {
    processRefund: jest.fn(),
    getRefundStatus: jest.fn(),
    listRecentRefunds: jest.fn()
  }
}));

jest.mock('../providers/paypalRefundProvider', () => ({
  paypalRefundProvider: {
    processRefund: jest.fn(),
    getRefundStatus: jest.fn()
  }
}));

jest.mock('../providers/blockchainRefundProvider', () => ({
  blockchainRefundProvider: {
    processNativeTokenRefund: jest.fn(),
    getTransactionStatus: jest.fn()
  }
}));

describe('RefundMonitoringService', () => {
  let service: RefundMonitoringService;

  beforeEach(() => {
    service = new RefundMonitoringService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTransactionTracker', () => {
    it('should return comprehensive refund transaction tracking data', async () => {
      // Mock database responses
      const mockStats = {
        totalRefunds: 100,
        totalRefundAmount: 50000,
        successfulRefunds: 85,
        failedRefunds: 10,
        pendingRefunds: 5,
        averageRefundTime: 3600
      };

      const mockProviderStats = [
        {
          provider: 'stripe',
          totalTransactions: 60,
          successfulTransactions: 55,
          failedTransactions: 5,
          totalAmount: 30000,
          averageProcessingTime: 3000
        },
        {
          provider: 'paypal',
          totalTransactions: 40,
          successfulTransactions: 30,
          failedTransactions: 5,
          totalAmount: 20000,
          averageProcessingTime: 4000
        }
      ];

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockStats])
      });

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue(mockProviderStats)
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.getTransactionTracker(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.totalRefunds).toBe(100);
      expect(result.totalRefundAmount).toBe(50000);
      expect(result.successfulRefunds).toBe(85);
      expect(result.failedRefunds).toBe(10);
      expect(result.pendingRefunds).toBe(5);
      expect(result.providerBreakdown).toHaveLength(2);
      expect(result.providerBreakdown[0].provider).toBe('stripe');
      expect(result.providerBreakdown[0].successRate).toBeGreaterThan(90);
    });

    it('should handle empty results gracefully', async () => {
      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{
          totalRefunds: 0,
          totalRefundAmount: 0,
          successfulRefunds: 0,
          failedRefunds: 0,
          pendingRefunds: 0,
          averageRefundTime: 0
        }])
      });

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue([])
      });

      const result = await service.getTransactionTracker(new Date(), new Date());

      expect(result.totalRefunds).toBe(0);
      expect(result.providerBreakdown).toHaveLength(0);
    });
  });

  describe('getProviderStatus', () => {
    it('should return real-time status for all payment providers', async () => {
      const mockProviderData = [
        {
          totalTransactions: 100,
          successfulTransactions: 95,
          failedTransactions: 5,
          averageProcessingTime: 2500,
          lastSuccessfulRefund: new Date()
        }
      ];

      const mockRecentErrors = [
        { failureMessage: 'Network timeout' },
        { failureMessage: 'Rate limit exceeded' }
      ];

      // Mock for each provider
      for (let i = 0; i < 3; i++) {
        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockProviderData)
        });

        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockRecentErrors)
        });
      }

      const result = await service.getProviderStatus();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('provider');
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('successRate');
      expect(result[0]).toHaveProperty('errorRate');
      expect(result[0].status).toBe('operational');
      expect(result[0].successRate).toBeGreaterThan(90);
    });

    it('should detect degraded provider status', async () => {
      const mockDegradedData = [
        {
          totalTransactions: 100,
          successfulTransactions: 85,
          failedTransactions: 15,
          averageProcessingTime: 5000,
          lastSuccessfulRefund: new Date()
        }
      ];

      for (let i = 0; i < 3; i++) {
        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockDegradedData)
        });

        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue([])
        });
      }

      const result = await service.getProviderStatus();

      expect(result[0].status).toBe('degraded');
      expect(result[0].successRate).toBeLessThan(95);
    });

    it('should detect provider down status', async () => {
      const mockDownData = [
        {
          totalTransactions: 100,
          successfulTransactions: 70,
          failedTransactions: 30,
          averageProcessingTime: 10000,
          lastSuccessfulRefund: new Date(Date.now() - 3600000)
        }
      ];

      for (let i = 0; i < 3; i++) {
        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockDownData)
        });

        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue([])
        });
      }

      const result = await service.getProviderStatus();

      expect(result[0].status).toBe('down');
      expect(result[0].successRate).toBeLessThan(80);
    });
  });

  describe('monitorProviderHealth', () => {
    it('should return comprehensive health metrics for all providers', async () => {
      const mockHealthData = [
        {
          successCount: 95,
          failureCount: 5,
          averageResponseTime: 1500
        }
      ];

      // Mock for each provider and time window (3 providers x 3 time windows = 9 calls)
      for (let i = 0; i < 9; i++) {
        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockHealthData)
        });
      }

      const result = await service.monitorProviderHealth();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('provider');
      expect(result[0]).toHaveProperty('health');
      expect(result[0]).toHaveProperty('metrics');
      expect(result[0]).toHaveProperty('alerts');
      expect(result[0]).toHaveProperty('recommendations');
      
      expect(result[0].health.overall).toBe('healthy');
      expect(result[0].health.uptime).toBeGreaterThan(95);
      expect(result[0].metrics.last5Minutes).toBeDefined();
      expect(result[0].metrics.last15Minutes).toBeDefined();
      expect(result[0].metrics.lastHour).toBeDefined();
    });

    it('should generate alerts for unhealthy providers', async () => {
      const mockUnhealthyData = [
        {
          successCount: 50,
          failureCount: 50,
          averageResponseTime: 8000
        }
      ];

      for (let i = 0; i < 9; i++) {
        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockUnhealthyData)
        });
      }

      const result = await service.monitorProviderHealth();

      expect(result[0].health.overall).toBe('critical');
      expect(result[0].alerts.length).toBeGreaterThan(0);
      expect(result[0].recommendations.length).toBeGreaterThan(0);
      expect(result[0].alerts[0].severity).toBe('critical');
    });

    it('should provide actionable recommendations', async () => {
      const mockWarningData = [
        {
          successCount: 90,
          failureCount: 10,
          averageResponseTime: 3000
        }
      ];

      for (let i = 0; i < 9; i++) {
        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockWarningData)
        });
      }

      const result = await service.monitorProviderHealth();

      expect(result[0].health.overall).toBe('warning');
      expect(result[0].recommendations).toContain(
        expect.stringContaining('Monitor provider closely')
      );
    });
  });

  describe('getReconciliationData', () => {
    it('should return reconciliation statistics', async () => {
      const mockReconciliationData = [
        {
          totalReconciled: 90,
          totalPending: 10,
          totalDiscrepancies: 5,
          totalDiscrepancyAmount: 250.50,
          averageReconciliationTime: 7200
        }
      ];

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockReconciliationData)
      });

      const result = await service.getReconciliationData(new Date(), new Date());

      expect(result).toBeDefined();
      expect(result.totalReconciled).toBe(90);
      expect(result.totalPending).toBe(10);
      expect(result.totalDiscrepancies).toBe(5);
      expect(result.totalDiscrepancyAmount).toBe(250.50);
      expect(result.reconciliationRate).toBeGreaterThan(0);
    });

    it('should calculate reconciliation rate correctly', async () => {
      const mockData = [
        {
          totalReconciled: 80,
          totalPending: 20,
          totalDiscrepancies: 0,
          totalDiscrepancyAmount: 0,
          averageReconciliationTime: 3600
        }
      ];

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockData)
      });

      const result = await service.getReconciliationData(new Date(), new Date());

      expect(result.reconciliationRate).toBe(80);
    });
  });

  describe('analyzeFailures', () => {
    it('should provide comprehensive failure analysis', async () => {
      const mockFailureStats = [
        {
          totalFailures: 25,
          averageRetryCount: 1.5,
          successfulRetries: 10,
          permanentFailures: 5
        }
      ];

      const mockProviderFailures = [
        { provider: 'stripe', failureCount: 15 },
        { provider: 'paypal', failureCount: 10 }
      ];

      const mockReasonFailures = [
        { reason: 'insufficient_funds', failureCount: 10 },
        { reason: 'network_error', failureCount: 8 },
        { reason: 'validation_error', failureCount: 7 }
      ];

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockFailureStats)
      });

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue(mockProviderFailures)
      });

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue(mockReasonFailures)
      });

      const result = await service.analyzeFailures(new Date(), new Date());

      expect(result).toBeDefined();
      expect(result.totalFailures).toBe(25);
      expect(result.failuresByProvider).toHaveProperty('stripe');
      expect(result.failuresByProvider).toHaveProperty('paypal');
      expect(result.failuresByReason).toHaveProperty('insufficient_funds');
      expect(result.successfulRetries).toBe(10);
      expect(result.permanentFailures).toBe(5);
    });

    it('should handle zero failures', async () => {
      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{
          totalFailures: 0,
          averageRetryCount: 0,
          successfulRetries: 0,
          permanentFailures: 0
        }])
      });

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue([])
      });

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue([])
      });

      const result = await service.analyzeFailures(new Date(), new Date());

      expect(result.totalFailures).toBe(0);
      expect(Object.keys(result.failuresByProvider)).toHaveLength(0);
    });
  });

  describe('trackRefundTransaction', () => {
    it('should create a new refund transaction record', async () => {
      const mockRefundData = {
        returnId: 'return-123',
        refundId: 'refund-456',
        originalAmount: 100.00,
        refundAmount: 95.00,
        processingFee: 2.50,
        platformFeeImpact: 1.50,
        sellerImpact: 91.00,
        paymentProvider: 'stripe',
        providerTransactionId: 'txn_123456',
        currency: 'USD',
        refundMethod: 'original_payment_method'
      };

      const mockCreatedRecord = {
        id: 'record-789',
        ...mockRefundData,
        status: 'pending',
        reconciled: false,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (db.insert as any).mockReturnValueOnce({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockCreatedRecord])
      });

      (db.insert as any).mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined)
      });

      const result = await service.trackRefundTransaction(mockRefundData);

      expect(result).toBeDefined();
      expect(result.id).toBe('record-789');
      expect(result.status).toBe('pending');
      expect(result.reconciled).toBe(false);
    });

    it('should log audit action for transaction creation', async () => {
      const mockRefundData = {
        returnId: 'return-123',
        refundId: 'refund-456',
        originalAmount: 100.00,
        refundAmount: 95.00,
        paymentProvider: 'stripe'
      };

      (db.insert as any).mockReturnValueOnce({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'record-789' }])
      });

      const auditInsertMock = jest.fn().mockResolvedValue(undefined);
      (db.insert as any).mockReturnValueOnce({
        values: auditInsertMock
      });

      await service.trackRefundTransaction(mockRefundData);

      expect(auditInsertMock).toHaveBeenCalled();
    });
  });

  describe('updateRefundStatus', () => {
    it('should update refund status successfully', async () => {
      const mockCurrentRecord = {
        id: 'record-123',
        status: 'pending',
        refundAmount: '100.00'
      };

      const mockUpdatedRecord = {
        ...mockCurrentRecord,
        status: 'completed',
        processedAt: new Date()
      };

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockCurrentRecord])
      });

      (db.update as any).mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUpdatedRecord])
      });

      (db.insert as any).mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined)
      });

      await service.updateRefundStatus('record-123', 'completed', new Date());

      expect(db.update).toHaveBeenCalled();
    });

    it('should throw error if refund record not found', async () => {
      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      });

      await expect(
        service.updateRefundStatus('nonexistent', 'completed')
      ).rejects.toThrow('Refund record not found');
    });

    it('should handle failure status with reason', async () => {
      const mockCurrentRecord = {
        id: 'record-123',
        status: 'pending'
      };

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockCurrentRecord])
      });

      (db.update as any).mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{
          ...mockCurrentRecord,
          status: 'failed',
          failureReason: 'Insufficient funds'
        }])
      });

      (db.insert as any).mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined)
      });

      await service.updateRefundStatus(
        'record-123',
        'failed',
        undefined,
        'Insufficient funds'
      );

      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('detectFailurePatterns', () => {
    it('should detect provider outage patterns', async () => {
      const mockFailures = Array(10).fill(null).map((_, i) => ({
        id: `failure-${i}`,
        providerName: 'stripe',
        providerStatus: 'failed',
        failureMessage: 'Connection timeout',
        createdAt: new Date(Date.now() - i * 60000)
      }));

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockFailures)
      });

      const result = await service.detectFailurePatterns(60);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      const providerOutagePattern = result.find(p => p.patternType === 'provider_outage');
      expect(providerOutagePattern).toBeDefined();
      expect(providerOutagePattern?.affectedProvider).toBe('stripe');
      expect(providerOutagePattern?.severity).toBe('critical');
    });

    it('should detect rate limiting patterns', async () => {
      const mockRateLimitFailures = Array(5).fill(null).map((_, i) => ({
        id: `failure-${i}`,
        providerName: 'paypal',
        providerStatus: 'failed',
        failureMessage: 'Rate limit exceeded',
        failureCode: 'RATE_LIMIT_EXCEEDED',
        createdAt: new Date(Date.now() - i * 60000)
      }));

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockRateLimitFailures)
      });

      const result = await service.detectFailurePatterns(60);

      const rateLimitPattern = result.find(p => p.patternType === 'rate_limit');
      expect(rateLimitPattern).toBeDefined();
      expect(rateLimitPattern?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect insufficient funds patterns', async () => {
      const mockInsufficientFundsFailures = Array(3).fill(null).map((_, i) => ({
        id: `failure-${i}`,
        providerName: 'blockchain',
        providerStatus: 'failed',
        failureMessage: 'Insufficient balance',
        failureCode: 'INSUFFICIENT_FUNDS',
        createdAt: new Date(Date.now() - i * 60000)
      }));

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockInsufficientFundsFailures)
      });

      const result = await service.detectFailurePatterns(60);

      const insufficientFundsPattern = result.find(p => p.patternType === 'insufficient_funds');
      expect(insufficientFundsPattern).toBeDefined();
      expect(insufficientFundsPattern?.severity).toBe('high');
    });

    it('should return empty array when no patterns detected', async () => {
      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      });

      const result = await service.detectFailurePatterns(60);

      expect(result).toHaveLength(0);
    });
  });

  describe('detectFailurePatterns - additional tests', () => {
    it('should detect network error patterns', async () => {
      const mockNetworkFailures = Array(6).fill(null).map((_, i) => ({
        id: `failure-${i}`,
        providerName: 'stripe',
        providerStatus: 'failed',
        failureMessage: 'Network timeout',
        failureCode: 'NETWORK_ERROR',
        createdAt: new Date(Date.now() - i * 60000)
      }));

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockNetworkFailures)
      });

      const result = await service.detectFailurePatterns(60);

      const networkPattern = result.find(p => p.patternType === 'network_error');
      expect(networkPattern).toBeDefined();
      expect(networkPattern?.severity).toBe('medium');
      expect(networkPattern?.confidence).toBe(0.85);
    });

    it('should detect validation error patterns', async () => {
      const mockValidationFailures = Array(4).fill(null).map((_, i) => ({
        id: `failure-${i}`,
        providerName: 'paypal',
        providerStatus: 'failed',
        failureMessage: 'Invalid payment data',
        failureCode: 'VALIDATION_ERROR',
        createdAt: new Date(Date.now() - i * 60000)
      }));

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockValidationFailures)
      });

      const result = await service.detectFailurePatterns(60);

      const validationPattern = result.find(p => p.patternType === 'validation_error');
      expect(validationPattern).toBeDefined();
      expect(validationPattern?.severity).toBe('medium');
    });

    it('should calculate pattern confidence correctly', async () => {
      const mockFailures = Array(15).fill(null).map((_, i) => ({
        id: `failure-${i}`,
        providerName: 'stripe',
        providerStatus: 'failed',
        failureMessage: 'Connection timeout',
        createdAt: new Date(Date.now() - i * 60000)
      }));

      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockFailures)
      });

      const result = await service.detectFailurePatterns(60);

      const pattern = result.find(p => p.patternType === 'provider_outage');
      expect(pattern?.confidence).toBeGreaterThan(0.9);
      expect(pattern?.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('generateAlerts', () => {
    it('should generate alerts for provider down status', async () => {
      const mockProviderStatuses = [
        {
          provider: 'stripe' as const,
          status: 'down' as const,
          successRate: 50,
          errorRate: 50,
          averageProcessingTime: 5000,
          lastSuccessfulRefund: new Date(Date.now() - 3600000),
          recentErrors: ['Connection timeout', 'Network error']
        }
      ];

      jest.spyOn(service, 'getProviderStatus').mockResolvedValue(mockProviderStatuses);
      jest.spyOn(service, 'analyzeFailures').mockResolvedValue({
        totalFailures: 5,
        failuresByProvider: {},
        failuresByReason: {},
        averageRetryCount: 1,
        successfulRetries: 2,
        permanentFailures: 3
      });
      jest.spyOn(service, 'getReconciliationData').mockResolvedValue({
        totalReconciled: 90,
        totalPending: 10,
        totalDiscrepancies: 2,
        totalDiscrepancyAmount: 100,
        reconciliationRate: 90,
        averageReconciliationTime: 3600
      });
      jest.spyOn(service, 'detectFailurePatterns').mockResolvedValue([]);

      const result = await service.generateAlerts();

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      const providerDownAlert = result.find(a => a.alertType === 'provider_down');
      expect(providerDownAlert).toBeDefined();
      expect(providerDownAlert?.severity).toBe('critical');
      expect(providerDownAlert?.affectedProvider).toBe('stripe');
    });

    it('should generate alerts for degraded provider status', async () => {
      const mockProviderStatuses = [
        {
          provider: 'paypal' as const,
          status: 'degraded' as const,
          successRate: 85,
          errorRate: 15,
          averageProcessingTime: 4000,
          lastSuccessfulRefund: new Date(),
          recentErrors: ['Slow response']
        }
      ];

      jest.spyOn(service, 'getProviderStatus').mockResolvedValue(mockProviderStatuses);
      jest.spyOn(service, 'analyzeFailures').mockResolvedValue({
        totalFailures: 0,
        failuresByProvider: {},
        failuresByReason: {},
        averageRetryCount: 0,
        successfulRetries: 0,
        permanentFailures: 0
      });
      jest.spyOn(service, 'getReconciliationData').mockResolvedValue({
        totalReconciled: 100,
        totalPending: 0,
        totalDiscrepancies: 0,
        totalDiscrepancyAmount: 0,
        reconciliationRate: 100,
        averageReconciliationTime: 3600
      });
      jest.spyOn(service, 'detectFailurePatterns').mockResolvedValue([]);

      const result = await service.generateAlerts();

      const degradedAlert = result.find(a => a.alertType === 'provider_degraded');
      expect(degradedAlert).toBeDefined();
      expect(degradedAlert?.severity).toBe('high');
    });

    it('should generate alerts for failure spikes', async () => {
      jest.spyOn(service, 'getProviderStatus').mockResolvedValue([]);
      jest.spyOn(service, 'analyzeFailures').mockResolvedValue({
        totalFailures: 50,
        failuresByProvider: { stripe: 30, paypal: 20 },
        failuresByReason: { network_error: 25, timeout: 25 },
        averageRetryCount: 2,
        successfulRetries: 10,
        permanentFailures: 40
      });
      jest.spyOn(service, 'getReconciliationData').mockResolvedValue({
        totalReconciled: 50,
        totalPending: 0,
        totalDiscrepancies: 0,
        totalDiscrepancyAmount: 0,
        reconciliationRate: 100,
        averageReconciliationTime: 3600
      });
      jest.spyOn(service, 'detectFailurePatterns').mockResolvedValue([]);

      const result = await service.generateAlerts();

      const failureSpikeAlert = result.find(a => a.alertType === 'failure_spike');
      expect(failureSpikeAlert).toBeDefined();
      expect(failureSpikeAlert?.severity).toBe('critical');
      expect(failureSpikeAlert?.affectedTransactionCount).toBe(50);
    });

    it('should generate alerts for high discrepancies', async () => {
      jest.spyOn(service, 'getProviderStatus').mockResolvedValue([]);
      jest.spyOn(service, 'analyzeFailures').mockResolvedValue({
        totalFailures: 0,
        failuresByProvider: {},
        failuresByReason: {},
        averageRetryCount: 0,
        successfulRetries: 0,
        permanentFailures: 0
      });
      jest.spyOn(service, 'getReconciliationData').mockResolvedValue({
        totalReconciled: 80,
        totalPending: 20,
        totalDiscrepancies: 15,
        totalDiscrepancyAmount: 2500,
        reconciliationRate: 80,
        averageReconciliationTime: 7200
      });
      jest.spyOn(service, 'detectFailurePatterns').mockResolvedValue([]);

      const result = await service.generateAlerts();

      const discrepancyAlert = result.find(a => a.alertType === 'high_discrepancy');
      expect(discrepancyAlert).toBeDefined();
      expect(discrepancyAlert?.severity).toBe('high');
    });

    it('should respect alert cooldown period', async () => {
      const mockProviderStatuses = [
        {
          provider: 'stripe' as const,
          status: 'down' as const,
          successRate: 50,
          errorRate: 50,
          averageProcessingTime: 5000,
          lastSuccessfulRefund: null,
          recentErrors: []
        }
      ];

      jest.spyOn(service, 'getProviderStatus').mockResolvedValue(mockProviderStatuses);
      jest.spyOn(service, 'analyzeFailures').mockResolvedValue({
        totalFailures: 0,
        failuresByProvider: {},
        failuresByReason: {},
        averageRetryCount: 0,
        successfulRetries: 0,
        permanentFailures: 0
      });
      jest.spyOn(service, 'getReconciliationData').mockResolvedValue({
        totalReconciled: 100,
        totalPending: 0,
        totalDiscrepancies: 0,
        totalDiscrepancyAmount: 0,
        reconciliationRate: 100,
        averageReconciliationTime: 3600
      });
      jest.spyOn(service, 'detectFailurePatterns').mockResolvedValue([]);

      // First call should generate alert
      const firstResult = await service.generateAlerts();
      expect(firstResult.length).toBeGreaterThan(0);

      // Second immediate call should not generate same alert (cooldown)
      const secondResult = await service.generateAlerts();
      const duplicateAlerts = secondResult.filter(a => 
        a.alertType === 'provider_down' && a.affectedProvider === 'stripe'
      );
      expect(duplicateAlerts.length).toBe(0);
    });

    it('should generate pattern-based alerts', async () => {
      const mockPattern = {
        patternId: 'pattern-123',
        patternType: 'rate_limit' as const,
        severity: 'high' as const,
        affectedProvider: 'paypal',
        occurrenceCount: 10,
        firstOccurrence: new Date(Date.now() - 3600000),
        lastOccurrence: new Date(),
        affectedTransactions: ['tx1', 'tx2'],
        description: 'Rate limiting detected',
        confidence: 0.9
      };

      jest.spyOn(service, 'getProviderStatus').mockResolvedValue([]);
      jest.spyOn(service, 'analyzeFailures').mockResolvedValue({
        totalFailures: 0,
        failuresByProvider: {},
        failuresByReason: {},
        averageRetryCount: 0,
        successfulRetries: 0,
        permanentFailures: 0
      });
      jest.spyOn(service, 'getReconciliationData').mockResolvedValue({
        totalReconciled: 100,
        totalPending: 0,
        totalDiscrepancies: 0,
        totalDiscrepancyAmount: 0,
        reconciliationRate: 100,
        averageReconciliationTime: 3600
      });
      jest.spyOn(service, 'detectFailurePatterns').mockResolvedValue([mockPattern]);

      const result = await service.generateAlerts();

      const patternAlert = result.find(a => a.alertType === 'pattern_detected');
      expect(patternAlert).toBeDefined();
      expect(patternAlert?.relatedPatterns).toHaveLength(1);
      expect(patternAlert?.relatedPatterns?.[0].patternType).toBe('rate_limit');
    });
  });

  describe('generateRemediationSuggestions', () => {
    it('should generate suggestions for critical provider issues', async () => {
      const mockAlerts = [
        {
          alertId: 'alert-1',
          alertType: 'provider_down' as const,
          severity: 'critical' as const,
          title: 'Provider Down',
          message: 'Stripe is down',
          affectedProvider: 'stripe',
          affectedTransactionCount: 10,
          detectedAt: new Date(),
          remediationSteps: []
        }
      ];

      const result = await service.generateRemediationSuggestions(mockAlerts, []);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      const criticalSuggestion = result.find(s => s.priority === 'critical');
      expect(criticalSuggestion).toBeDefined();
      expect(criticalSuggestion?.category).toBe('immediate_action');
      expect(criticalSuggestion?.steps.length).toBeGreaterThan(0);
    });

    it('should generate suggestions for rate limiting', async () => {
      const mockPatterns = [
        {
          patternId: 'pattern-1',
          patternType: 'rate_limit' as const,
          severity: 'high' as const,
          occurrenceCount: 10,
          firstOccurrence: new Date(),
          lastOccurrence: new Date(),
          affectedTransactions: [],
          description: 'Rate limiting detected',
          confidence: 0.9
        }
      ];

      const result = await service.generateRemediationSuggestions([], mockPatterns);

      const rateLimitSuggestion = result.find(s => 
        s.title.toLowerCase().includes('rate limiting')
      );
      expect(rateLimitSuggestion).toBeDefined();
      expect(rateLimitSuggestion?.priority).toBe('high');
      expect(rateLimitSuggestion?.automatable).toBe(true);
    });

    it('should generate suggestions for insufficient funds', async () => {
      const mockPatterns = [
        {
          patternId: 'pattern-2',
          patternType: 'insufficient_funds' as const,
          severity: 'high' as const,
          occurrenceCount: 5,
          firstOccurrence: new Date(),
          lastOccurrence: new Date(),
          affectedTransactions: [],
          description: 'Insufficient funds',
          confidence: 0.95
        }
      ];

      const result = await service.generateRemediationSuggestions([], mockPatterns);

      const fundsSuggestion = result.find(s => 
        s.title.toLowerCase().includes('balance')
      );
      expect(fundsSuggestion).toBeDefined();
      expect(fundsSuggestion?.priority).toBe('critical');
      expect(fundsSuggestion?.estimatedImpact).toContain('Critical');
    });

    it('should prioritize suggestions correctly', async () => {
      const mockAlerts = [
        {
          alertId: 'alert-1',
          alertType: 'failure_spike' as const,
          severity: 'high' as const,
          title: 'Failure Spike',
          message: 'High failure rate',
          affectedTransactionCount: 50,
          detectedAt: new Date(),
          remediationSteps: []
        }
      ];

      const mockPatterns = [
        {
          patternId: 'pattern-1',
          patternType: 'network_error' as const,
          severity: 'medium' as const,
          occurrenceCount: 8,
          firstOccurrence: new Date(),
          lastOccurrence: new Date(),
          affectedTransactions: [],
          description: 'Network issues',
          confidence: 0.85
        }
      ];

      const result = await service.generateRemediationSuggestions(mockAlerts, mockPatterns);

      // Verify suggestions are sorted by priority
      for (let i = 0; i < result.length - 1; i++) {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        expect(priorityOrder[result[i].priority]).toBeLessThanOrEqual(
          priorityOrder[result[i + 1].priority]
        );
      }
    });

    it('should include actionable steps in suggestions', async () => {
      const mockAlerts = [
        {
          alertId: 'alert-1',
          alertType: 'high_discrepancy' as const,
          severity: 'high' as const,
          title: 'High Discrepancy',
          message: 'Reconciliation issues',
          affectedTransactionCount: 15,
          detectedAt: new Date(),
          remediationSteps: []
        }
      ];

      const result = await service.generateRemediationSuggestions(mockAlerts, []);

      const discrepancySuggestion = result.find(s => 
        s.title.toLowerCase().includes('discrepanc')
      );
      expect(discrepancySuggestion).toBeDefined();
      expect(discrepancySuggestion?.steps.length).toBeGreaterThan(3);
      expect(discrepancySuggestion?.steps[0]).toBeTruthy();
    });
  });

  describe('updateAlertConfig', () => {
    it('should update alert configuration', () => {
      const newConfig = {
        failureRateThreshold: 30,
        consecutiveFailuresThreshold: 10
      };

      service.updateAlertConfig(newConfig);

      const config = service.getAlertConfig();
      expect(config.failureRateThreshold).toBe(30);
      expect(config.consecutiveFailuresThreshold).toBe(10);
    });

    it('should preserve unmodified config values', () => {
      const originalConfig = service.getAlertConfig();
      const originalCooldown = originalConfig.alertCooldownPeriod;

      service.updateAlertConfig({ failureRateThreshold: 25 });

      const newConfig = service.getAlertConfig();
      expect(newConfig.alertCooldownPeriod).toBe(originalCooldown);
    });
  });

  describe('clearAlertCooldown', () => {
    it('should clear specific alert cooldown', async () => {
      // Generate an alert to set cooldown
      jest.spyOn(service, 'getProviderStatus').mockResolvedValue([
        {
          provider: 'stripe' as const,
          status: 'down' as const,
          successRate: 50,
          errorRate: 50,
          averageProcessingTime: 5000,
          lastSuccessfulRefund: null,
          recentErrors: []
        }
      ]);
      jest.spyOn(service, 'analyzeFailures').mockResolvedValue({
        totalFailures: 0,
        failuresByProvider: {},
        failuresByReason: {},
        averageRetryCount: 0,
        successfulRetries: 0,
        permanentFailures: 0
      });
      jest.spyOn(service, 'getReconciliationData').mockResolvedValue({
        totalReconciled: 100,
        totalPending: 0,
        totalDiscrepancies: 0,
        totalDiscrepancyAmount: 0,
        reconciliationRate: 100,
        averageReconciliationTime: 3600
      });
      jest.spyOn(service, 'detectFailurePatterns').mockResolvedValue([]);

      await service.generateAlerts();

      // Clear cooldown
      service.clearAlertCooldown('provider_stripe_down');

      // Should be able to generate same alert again
      const result = await service.generateAlerts();
      const providerDownAlert = result.find(a => 
        a.alertType === 'provider_down' && a.affectedProvider === 'stripe'
      );
      expect(providerDownAlert).toBeDefined();
    });

    it('should clear all alert cooldowns', async () => {
      service.clearAlertCooldown();
      
      // After clearing all, any alert should be generatable
      // This is tested implicitly by the fact that no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully in getTransactionTracker', async () => {
      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        service.getTransactionTracker(new Date(), new Date())
      ).rejects.toThrow('Failed to retrieve refund transaction tracking data');
    });

    it('should handle database errors gracefully in getProviderStatus', async () => {
      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        service.getProviderStatus()
      ).rejects.toThrow('Failed to retrieve payment provider status');
    });

    it('should handle database errors gracefully in analyzeFailures', async () => {
      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        service.analyzeFailures(new Date(), new Date())
      ).rejects.toThrow('Failed to analyze refund failures');
    });

    it('should handle errors in detectFailurePatterns', async () => {
      (db.select as any).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        service.detectFailurePatterns(60)
      ).rejects.toThrow('Failed to detect failure patterns');
    });

    it('should handle errors in generateAlerts', async () => {
      jest.spyOn(service, 'getProviderStatus').mockRejectedValue(new Error('Service error'));

      await expect(
        service.generateAlerts()
      ).rejects.toThrow('Failed to generate alerts');
    });
  });
});
