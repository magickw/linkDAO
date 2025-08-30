import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GasFeeService } from '../gasFeeService';
import { parseGwei, parseEther } from 'viem';

const mockPublicClient = {
  estimateGas: jest.fn(),
  getFeeHistory: jest.fn(),
  getBlock: jest.fn(),
  getGasPrice: jest.fn()
};

// Mock fetch for price API
global.fetch = jest.fn();

describe('GasFeeService', () => {
  let gasFeeService: GasFeeService;

  beforeEach(() => {
    jest.clearAllMocks();
    gasFeeService = new GasFeeService(mockPublicClient as any);
  });

  describe('estimateGasFees', () => {
    it('should estimate gas fees for EIP-1559 chain', async () => {
      const mockBaseFee = parseGwei('30');
      const mockPriorityFees = [parseGwei('1'), parseGwei('2'), parseGwei('3')];

      mockPublicClient.estimateGas.mockResolvedValue(BigInt(21000));
      mockPublicClient.getFeeHistory.mockResolvedValue({
        reward: [mockPriorityFees]
      });
      mockPublicClient.getBlock.mockResolvedValue({
        baseFeePerGas: mockBaseFee
      });

      // Mock ETH price
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ethereum: { usd: 2000 }
        })
      });

      const estimate = await gasFeeService.estimateGasFees(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
        '0x'
      );

      expect(estimate).toBeDefined();
      expect(estimate.gasLimit).toBe(BigInt(25200)); // 21000 * 1.2 buffer
      expect(estimate.maxFeePerGas).toBeDefined();
      expect(estimate.maxPriorityFeePerGas).toBeDefined();
      expect(estimate.totalCost).toBeGreaterThan(0n);
      expect(estimate.totalCostUSD).toBeGreaterThan(0);
    });

    it('should estimate gas fees for legacy chain', async () => {
      const mockGasPrice = parseGwei('25');

      mockPublicClient.estimateGas.mockResolvedValue(BigInt(21000));
      mockPublicClient.getFeeHistory.mockResolvedValue({
        reward: null
      });
      mockPublicClient.getBlock.mockResolvedValue({
        baseFeePerGas: null // Legacy chain
      });
      mockPublicClient.getGasPrice.mockResolvedValue(mockGasPrice);

      const estimate = await gasFeeService.estimateGasFees(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
        '0x'
      );

      expect(estimate).toBeDefined();
      expect(estimate.gasLimit).toBe(BigInt(25200));
      expect(estimate.gasPrice).toBe(mockGasPrice);
      expect(estimate.maxFeePerGas).toBeUndefined();
      expect(estimate.maxPriorityFeePerGas).toBeUndefined();
    });

    it('should apply priority multipliers correctly', async () => {
      mockPublicClient.estimateGas.mockResolvedValue(BigInt(21000));
      mockPublicClient.getFeeHistory.mockResolvedValue({ reward: null });
      mockPublicClient.getBlock.mockResolvedValue({ baseFeePerGas: null });
      mockPublicClient.getGasPrice.mockResolvedValue(parseGwei('20'));

      const standardEstimate = await gasFeeService.estimateGasFees(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
        '0x',
        0n,
        'standard'
      );

      const fastEstimate = await gasFeeService.estimateGasFees(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
        '0x',
        0n,
        'fast'
      );

      expect(fastEstimate.gasPrice).toBeGreaterThan(standardEstimate.gasPrice);
      expect(fastEstimate.totalCost).toBeGreaterThan(standardEstimate.totalCost);
    });

    it('should handle gas estimation errors gracefully', async () => {
      mockPublicClient.estimateGas.mockRejectedValue(new Error('Estimation failed'));
      mockPublicClient.getFeeHistory.mockResolvedValue({ reward: null });
      mockPublicClient.getBlock.mockResolvedValue({ baseFeePerGas: null });
      mockPublicClient.getGasPrice.mockResolvedValue(parseGwei('20'));

      const estimate = await gasFeeService.estimateGasFees(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
        '0x'
      );

      expect(estimate).toBeDefined();
      expect(estimate.gasLimit).toBe(BigInt(25200)); // Fallback gas limit with buffer
    });

    it('should handle price API failures gracefully', async () => {
      mockPublicClient.estimateGas.mockResolvedValue(BigInt(21000));
      mockPublicClient.getFeeHistory.mockResolvedValue({ reward: null });
      mockPublicClient.getBlock.mockResolvedValue({ baseFeePerGas: null });
      mockPublicClient.getGasPrice.mockResolvedValue(parseGwei('20'));

      // Mock fetch failure
      (fetch as any).mockRejectedValue(new Error('API failed'));

      const estimate = await gasFeeService.estimateGasFees(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
        '0x'
      );

      expect(estimate).toBeDefined();
      expect(estimate.totalCostUSD).toBeUndefined();
    });
  });

  describe('formatGasFee', () => {
    it('should format gas fee correctly', () => {
      const estimate = {
        gasLimit: BigInt(21000),
        gasPrice: parseGwei('20'),
        totalCost: parseEther('0.00042'),
        totalCostUSD: 0.84
      };

      const formatted = gasFeeService.formatGasFee(estimate);

      expect(formatted.gasLimit).toBe('21000');
      expect(formatted.gasPrice).toBe('20');
      expect(formatted.totalCost).toBe('0.00042');
      expect(formatted.totalCostUSD).toBe('$0.84');
    });

    it('should handle missing USD price', () => {
      const estimate = {
        gasLimit: BigInt(21000),
        gasPrice: parseGwei('20'),
        totalCost: parseEther('0.00042')
      };

      const formatted = gasFeeService.formatGasFee(estimate);

      expect(formatted.totalCostUSD).toBeUndefined();
    });
  });

  describe('isGasPriceReasonable', () => {
    it('should return true for reasonable gas price', () => {
      const estimate = {
        gasLimit: BigInt(21000),
        gasPrice: parseGwei('50'), // 50 gwei
        totalCost: parseEther('0.00105')
      };

      const isReasonable = gasFeeService.isGasPriceReasonable(estimate, 100);
      expect(isReasonable).toBe(true);
    });

    it('should return false for unreasonable gas price', () => {
      const estimate = {
        gasLimit: BigInt(21000),
        gasPrice: parseGwei('150'), // 150 gwei
        totalCost: parseEther('0.00315')
      };

      const isReasonable = gasFeeService.isGasPriceReasonable(estimate, 100);
      expect(isReasonable).toBe(false);
    });
  });

  describe('getGasPriceRecommendations', () => {
    it('should return recommendations for all priority levels', async () => {
      mockPublicClient.estimateGas.mockResolvedValue(BigInt(21000));
      mockPublicClient.getFeeHistory.mockResolvedValue({ reward: null });
      mockPublicClient.getBlock.mockResolvedValue({ baseFeePerGas: null });
      mockPublicClient.getGasPrice.mockResolvedValue(parseGwei('20'));

      const recommendations = await gasFeeService.getGasPriceRecommendations();

      expect(recommendations).toBeDefined();
      expect(recommendations.slow).toBeDefined();
      expect(recommendations.standard).toBeDefined();
      expect(recommendations.fast).toBeDefined();
      expect(recommendations.instant).toBeDefined();

      // Verify ordering
      expect(recommendations.slow.gasPrice).toBeLessThanOrEqual(recommendations.standard.gasPrice);
      expect(recommendations.standard.gasPrice).toBeLessThanOrEqual(recommendations.fast.gasPrice);
      expect(recommendations.fast.gasPrice).toBeLessThanOrEqual(recommendations.instant.gasPrice);
    });
  });

  describe('price caching', () => {
    it('should cache ETH price for subsequent calls', async () => {
      mockPublicClient.estimateGas.mockResolvedValue(BigInt(21000));
      mockPublicClient.getFeeHistory.mockResolvedValue({ reward: null });
      mockPublicClient.getBlock.mockResolvedValue({ baseFeePerGas: null });
      mockPublicClient.getGasPrice.mockResolvedValue(parseGwei('20'));

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ethereum: { usd: 2000 }
        })
      });

      // First call
      await gasFeeService.estimateGasFees(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
        '0x'
      );

      // Second call should use cache
      await gasFeeService.estimateGasFees(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
        '0x'
      );

      // Fetch should only be called once due to caching
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});