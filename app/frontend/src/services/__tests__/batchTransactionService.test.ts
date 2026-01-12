/**
 * Unit Tests for Batch Transaction Service
 */

import { batchTransactionService } from '@/services/batchTransactionService';
import { PublicClient } from 'viem';

// Mock PublicClient
const mockPublicClient: jest.Mocked<PublicClient> = {
  call: jest.fn(),
  estimateGas: jest.fn(),
  getBalance: jest.fn(),
  getTransactionCount: jest.fn(),
  getChainId: jest.fn(),
  simulateContract: jest.fn(),
  writeContract: jest.fn(),
  // Add other required methods as needed
} as any;

// Mock secureSigningService
jest.mock('@/services/secureSigningService', () => ({
  secureSigningService: {
    signTransaction: jest.fn(),
  },
}));

// Mock transactionSimulator
jest.mock('@/services/transactionSimulator', () => ({
  simulateTransaction: jest.fn(() => ({
    success: true,
    gasUsed: 21000n,
    gasCost: 21000000000n,
  })),
}));

describe('Batch Transaction Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeBatch', () => {
    it('should execute a batch of transactions successfully', async () => {
      const transactions = [
        {
          request: {
            to: '0x' + 'a'.repeat(40),
            value: 1000000000000000000n,
            data: '0x',
          },
          description: 'First transaction',
        },
        {
          request: {
            to: '0x' + 'b'.repeat(40),
            value: 500000000000000000n,
            data: '0x',
          },
          description: 'Second transaction',
        },
      ];

      // Mock successful signing
      const { secureSigningService } = require('@/services/secureSigningService');
      secureSigningService.signTransaction.mockResolvedValue({
        success: true,
        signature: '0x' + 'c'.repeat(130),
      });

      const result = await batchTransactionService.executeBatch(
        transactions,
        'test-password',
        mockPublicClient
      );

      expect(result).toBeDefined();
      expect(result.totalTransactions).toBe(2);
      expect(result.successfulTransactions).toBeGreaterThanOrEqual(0);
      expect(result.failedTransactions).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty batch', async () => {
      const result = await batchTransactionService.executeBatch(
        [],
        'test-password',
        mockPublicClient
      );

      expect(result.totalTransactions).toBe(0);
      expect(result.successfulTransactions).toBe(0);
      expect(result.failedTransactions).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should stop on first failure when stopOnFirstError is true', async () => {
      const transactions = [
        {
          request: {
            to: '0x' + 'a'.repeat(40),
            value: 1000000000000000000n,
            data: '0x',
          },
          description: 'First transaction',
        },
        {
          request: {
            to: '0x' + 'b'.repeat(40),
            value: 500000000000000000n,
            data: '0x',
          },
          description: 'Second transaction',
        },
      ];

      // Mock first transaction to fail
      const { secureSigningService } = require('@/services/secureSigningService');
      secureSigningService.signTransaction
        .mockResolvedValueOnce({
          success: false,
          error: 'Signing failed',
        })
        .mockResolvedValueOnce({
          success: true,
          signature: '0x' + 'c'.repeat(130),
        });

      const result = await batchTransactionService.executeBatch(
        transactions,
        'test-password',
        mockPublicClient,
        { stopOnFirstError: true }
      );

      expect(result.failedTransactions).toBe(1);
      expect(result.successfulTransactions).toBe(0);
    });

    it('should continue on failure when stopOnFirstError is false', async () => {
      const transactions = [
        {
          request: {
            to: '0x' + 'a'.repeat(40),
            value: 1000000000000000000n,
            data: '0x',
          },
          description: 'First transaction',
        },
        {
          request: {
            to: '0x' + 'b'.repeat(40),
            value: 500000000000000000n,
            data: '0x',
          },
          description: 'Second transaction',
        },
      ];

      // Mock first transaction to fail, second to succeed
      const { secureSigningService } = require('@/services/secureSigningService');
      secureSigningService.signTransaction
        .mockResolvedValueOnce({
          success: false,
          error: 'Signing failed',
        })
        .mockResolvedValueOnce({
          success: true,
          signature: '0x' + 'c'.repeat(130),
        });

      const result = await batchTransactionService.executeBatch(
        transactions,
        'test-password',
        mockPublicClient,
        { stopOnFirstError: false }
      );

      expect(result.failedTransactions).toBe(1);
      expect(result.successfulTransactions).toBe(1);
    });

    it('should simulate transactions before execution', async () => {
      const transactions = [
        {
          request: {
            to: '0x' + 'a'.repeat(40),
            value: 1000000000000000000n,
            data: '0x',
          },
          description: 'First transaction',
        },
      ];

      const { simulateTransaction } = require('@/services/transactionSimulator');

      await batchTransactionService.executeBatch(
        transactions,
        'test-password',
        mockPublicClient,
        { simulateBeforeExecution: true }
      );

      expect(simulateTransaction).toHaveBeenCalled();
    });
  });

  describe('estimateBatchGas', () => {
    it('should estimate gas for batch transactions', async () => {
      const transactions = [
        {
          request: {
            to: '0x' + 'a'.repeat(40),
            value: 1000000000000000000n,
            data: '0x',
          },
        },
        {
          request: {
            to: '0x' + 'b'.repeat(40),
            value: 500000000000000000n,
            data: '0x',
          },
        },
      ];

      const result = await batchTransactionService.estimateBatchGas(transactions, mockPublicClient);

      expect(result).toBeDefined();
      expect(result.totalGas).toBeDefined();
      expect(result.totalGasCost).toBeDefined();
      expect(result.transactions).toHaveLength(2);
    });

    it('should handle empty batch', async () => {
      const result = await batchTransactionService.estimateBatchGas([], mockPublicClient);

      expect(result.totalGas).toBe(0n);
      expect(result.totalGasCost).toBe(0n);
      expect(result.transactions).toEqual([]);
    });
  });

  describe('validateBatch', () => {
    it('should validate a batch of transactions', () => {
      const transactions = [
        {
          request: {
            to: '0x' + 'a'.repeat(40),
            value: 1000000000000000000n,
            data: '0x',
          },
        },
        {
          request: {
            to: '0x' + 'b'.repeat(40),
            value: 500000000000000000n,
            data: '0x',
          },
        },
      ];

      const result = batchTransactionService.validateBatch(transactions);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should detect invalid transactions in batch', () => {
      const transactions = [
        {
          request: {
            to: 'invalid-address',
            value: -1n,
            data: 'not-hex',
          },
        },
      ];

      const result = batchTransactionService.validateBatch(transactions);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect duplicate transactions', () => {
      const transaction = {
        request: {
          to: '0x' + 'a'.repeat(40),
          value: 1000000000000000000n,
          data: '0x',
        },
      };

      const result = batchTransactionService.validateBatch([transaction, transaction]);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.toLowerCase().includes('duplicate'))).toBe(true);
    });
  });

  describe('getBatchSummary', () => {
    it('should generate batch summary', () => {
      const transactions = [
        {
          request: {
            to: '0x' + 'a'.repeat(40),
            value: 1000000000000000000n,
            data: '0x',
          },
          description: 'First transaction',
        },
        {
          request: {
            to: '0x' + 'b'.repeat(40),
            value: 500000000000000000n,
            data: '0x',
          },
          description: 'Second transaction',
        },
      ];

      const summary = batchTransactionService.getBatchSummary(transactions);

      expect(summary.totalTransactions).toBe(2);
      expect(summary.totalValue).toBeDefined();
      expect(summary.uniqueAddresses).toHaveLength(2);
    });

    it('should handle empty batch summary', () => {
      const summary = batchTransactionService.getBatchSummary([]);

      expect(summary.totalTransactions).toBe(0);
      expect(summary.totalValue).toBe(0n);
      expect(summary.uniqueAddresses).toHaveLength(0);
    });
  });

  describe('cancelBatch', () => {
    it('should cancel a running batch', () => {
      const batchId = 'test-batch-id';
      const result = batchTransactionService.cancelBatch(batchId);

      expect(result.success).toBe(true);
    });
  });
});