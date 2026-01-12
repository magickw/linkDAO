/**
 * Unit Tests for Transaction Simulator
 */

import { simulateTransaction, TransactionSimulator } from '@/services/transactionSimulator';
import { PublicClient } from 'viem';

// Mock PublicClient
const mockPublicClient: jest.Mocked<PublicClient> = {
  call: jest.fn(),
  estimateGas: jest.fn(),
  getBalance: jest.fn(),
  getTransactionCount: jest.fn(),
  getChainId: jest.fn(),
  simulateContract: jest.fn(),
  // Add other required methods as needed
} as any;

describe('Transaction Simulator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('simulateTransaction', () => {
    it('should simulate a simple transfer transaction', async () => {
      mockPublicClient.call.mockResolvedValue('0x');
      mockPublicClient.estimateGas.mockResolvedValue(21000n);

      const result = await simulateTransaction(
        '0x' + 'a'.repeat(40),
        '0x',
        1000000000000000000n,
        mockPublicClient
      );

      expect(result.success).toBe(true);
      expect(result.gasUsed).toBeDefined();
      expect(result.gasCost).toBeDefined();
    });

    it('should simulate a contract interaction', async () => {
      mockPublicClient.call.mockResolvedValue('0x');
      mockPublicClient.estimateGas.mockResolvedValue(50000n);

      const result = await simulateTransaction(
        '0x' + 'c'.repeat(40),
        '0xa9059cbb' + 'bb'.repeat(31) + 'dd'.repeat(31),
        0n,
        mockPublicClient
      );

      expect(result.success).toBe(true);
      expect(result.gasUsed).toBeDefined();
    });

    it('should detect transaction reverts', async () => {
      mockPublicClient.call.mockRejectedValue(new Error('Transaction reverted'));
      mockPublicClient.estimateGas.mockRejectedValue(new Error('Transaction reverted'));

      const result = await simulateTransaction(
        '0x' + 'c'.repeat(40),
        '0xa9059cbb' + 'bb'.repeat(31) + 'dd'.repeat(31),
        0n,
        mockPublicClient
      );

      expect(result.success).toBe(false);
      expect(result.revertReason).toBeDefined();
    });

    it('should capture state changes', async () => {
      mockPublicClient.call.mockResolvedValue('0x');
      mockPublicClient.estimateGas.mockResolvedValue(21000n);

      const result = await simulateTransaction(
        '0x' + 'a'.repeat(40),
        '0x',
        1000000000000000000n,
        mockPublicClient
      );

      expect(result.stateChanges).toBeDefined();
      expect(Array.isArray(result.stateChanges)).toBe(true);
    });

    it('should capture event logs', async () => {
      mockPublicClient.call.mockResolvedValue('0x');
      mockPublicClient.estimateGas.mockResolvedValue(50000n);

      const result = await simulateTransaction(
        '0x' + 'c'.repeat(40),
        '0xa9059cbb' + 'bb'.repeat(31) + 'dd'.repeat(31),
        0n,
        mockPublicClient
      );

      expect(result.logs).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);
    });

    it('should handle network errors', async () => {
      mockPublicClient.call.mockRejectedValue(new Error('Network error'));
      mockPublicClient.estimateGas.mockRejectedValue(new Error('Network error'));

      const result = await simulateTransaction(
        '0x' + 'a'.repeat(40),
        '0x',
        1000000000000000000n,
        mockPublicClient
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('TransactionSimulator class', () => {
    let simulator: TransactionSimulator;

    beforeEach(() => {
      simulator = new TransactionSimulator(mockPublicClient);
    });

    describe('simulate', () => {
      it('should simulate transaction with options', async () => {
        mockPublicClient.call.mockResolvedValue('0x');
        mockPublicClient.estimateGas.mockResolvedValue(21000n);

        const result = await simulator.simulate({
          to: '0x' + 'a'.repeat(40),
          data: '0x',
          value: 1000000000000000000n,
        });

        expect(result.success).toBe(true);
      });

      it('should respect gas limit override', async () => {
        mockPublicClient.call.mockResolvedValue('0x');
        mockPublicClient.estimateGas.mockResolvedValue(21000n);

        const result = await simulator.simulate(
          {
            to: '0x' + 'a'.repeat(40),
            data: '0x',
            value: 1000000000000000000n,
          },
          { gasLimit: 50000n }
        );

        expect(result.success).toBe(true);
      });
    });

    describe('estimateGas', () => {
      it('should estimate gas for transaction', async () => {
        mockPublicClient.estimateGas.mockResolvedValue(21000n);

        const result = await simulator.estimateGas({
          to: '0x' + 'a'.repeat(40),
          data: '0x',
          value: 1000000000000000000n,
        });

        expect(result.success).toBe(true);
        expect(result.gasUsed).toBe(21000n);
      });

      it('should handle gas estimation errors', async () => {
        mockPublicClient.estimateGas.mockRejectedValue(new Error('Gas estimation failed'));

        const result = await simulator.estimateGas({
          to: '0x' + 'a'.repeat(40),
          data: '0x',
          value: 1000000000000000000n,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('simulateContract', () => {
      it('should simulate contract call', async () => {
        mockPublicClient.simulateContract.mockResolvedValue({
          result: '0x',
          request: {},
        });

        const result = await simulator.simulateContract({
          address: '0x' + 'c'.repeat(40),
          abi: [],
          functionName: 'transfer',
          args: ['0x' + 'a'.repeat(40), 1000000000000000000n],
        });

        expect(result.success).toBe(true);
      });

      it('should handle contract simulation errors', async () => {
        mockPublicClient.simulateContract.mockRejectedValue(new Error('Contract call failed'));

        const result = await simulator.simulateContract({
          address: '0x' + 'c'.repeat(40),
          abi: [],
          functionName: 'transfer',
          args: ['0x' + 'a'.repeat(40), 1000000000000000000n],
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('getSimulationHistory', () => {
      it('should return simulation history', async () => {
        mockPublicClient.call.mockResolvedValue('0x');
        mockPublicClient.estimateGas.mockResolvedValue(21000n);

        await simulator.simulate({
          to: '0x' + 'a'.repeat(40),
          data: '0x',
          value: 1000000000000000000n,
        });

        const history = simulator.getSimulationHistory();
        expect(history.length).toBeGreaterThan(0);
      });

      it('should return empty history when no simulations', () => {
        const history = simulator.getSimulationHistory();
        expect(history).toEqual([]);
      });
    });

    describe('clearHistory', () => {
      it('should clear simulation history', async () => {
        mockPublicClient.call.mockResolvedValue('0x');
        mockPublicClient.estimateGas.mockResolvedValue(21000n);

        await simulator.simulate({
          to: '0x' + 'a'.repeat(40),
          data: '0x',
          value: 1000000000000000000n,
        });

        simulator.clearHistory();
        const history = simulator.getSimulationHistory();
        expect(history).toEqual([]);
      });
    });

    describe('getSimulationStatistics', () => {
      it('should return simulation statistics', async () => {
        mockPublicClient.call.mockResolvedValue('0x');
        mockPublicClient.estimateGas.mockResolvedValue(21000n);

        await simulator.simulate({
          to: '0x' + 'a'.repeat(40),
          data: '0x',
          value: 1000000000000000000n,
        });

        const stats = simulator.getSimulationStatistics();
        expect(stats.totalSimulations).toBeGreaterThan(0);
        expect(stats.successfulSimulations).toBeGreaterThan(0);
      });

      it('should return zero statistics when no simulations', () => {
        const stats = simulator.getSimulationStatistics();
        expect(stats.totalSimulations).toBe(0);
        expect(stats.successfulSimulations).toBe(0);
        expect(stats.failedSimulations).toBe(0);
      });
    });
  });

  describe('parseRevertReason', () => {
    it('should parse simple revert reason', () => {
      const error = new Error('Execution reverted');
      const reason = TransactionSimulator.parseRevertReason(error);
      expect(reason).toBeDefined();
    });

    it('should parse custom error revert', () => {
      const error = new Error('Execution reverted: Insufficient balance');
      const reason = TransactionSimulator.parseRevertReason(error);
      expect(reason).toContain('Insufficient balance');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      const reason = TransactionSimulator.parseRevertReason(error);
      expect(reason).toBeDefined();
    });
  });

  describe('formatGasCost', () => {
    it('should format gas cost in ETH', () => {
      const gasCost = 21000n * 1000000000n; // 21000 gas * 1 gwei
      const formatted = TransactionSimulator.formatGasCost(gasCost, 1000000000n);
      expect(formatted).toContain('0.000021');
    });

    it('should format gas cost in GWEI', () => {
      const gasCost = 21000n * 1000000000n;
      const formatted = TransactionSimulator.formatGasCost(gasCost, 1000000000n, 'gwei');
      expect(formatted).toContain('21000');
    });
  });
});