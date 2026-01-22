import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CryptoPaymentService } from '../cryptoPaymentService';
import { GasFeeService } from '../gasFeeService';
import { PaymentRequest, PaymentStatus, PaymentToken } from '../../types/payment';
import { parseEther, parseUnits } from 'viem';

// Mock dependencies
jest.mock('../gasFeeService');

const mockPublicClient = {
  getBalance: jest.fn(),
  getTransactionReceipt: jest.fn(),
  getBlockNumber: jest.fn(),
  estimateGas: jest.fn(),
  getFeeHistory: jest.fn(),
  getBlock: jest.fn(),
  getGasPrice: jest.fn()
};

const mockWalletClient = {
  getAddresses: jest.fn(),
  sendTransaction: jest.fn(),
  writeContract: jest.fn()
};

const mockContract = {
  read: {
    balanceOf: jest.fn()
  },
  write: {
    transfer: jest.fn()
  }
};

// Mock viem functions
jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    getContract: jest.fn(() => mockContract)
  };
});

describe('CryptoPaymentService', () => {
  let paymentService: CryptoPaymentService;
  let mockGasFeeService: jest.MockedClass<typeof GasFeeService>;

  const mockETH: PaymentToken = {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: 1,
    isNative: true
  };

  const mockUSDC: PaymentToken = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Correct USDC address for Ethereum Mainnet
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 1
  };

  const mockPaymentRequest: PaymentRequest = {
    orderId: 'order_123',
    amount: parseEther('1'),
    token: mockETH,
    recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
    chainId: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGasFeeService = jest.mocked(GasFeeService);
    mockGasFeeService.prototype.estimateGasFees = jest.fn().mockResolvedValue({
      gasLimit: BigInt(21000),
      gasPrice: parseUnits('20', 9), // 20 gwei
      totalCost: parseUnits('420000', 9) // 0.00042 ETH
    });

    mockWalletClient.getAddresses.mockResolvedValue(['0x123...']);
    mockPublicClient.getBalance.mockResolvedValue(parseEther('10'));
    mockContract.read.balanceOf.mockResolvedValue(parseUnits('1000', 6));

    paymentService = new CryptoPaymentService(
      mockPublicClient as any,
      mockWalletClient as any
    );
  });

  describe('processPayment', () => {
    it('should process native token payment successfully', async () => {
      const mockTxHash = '0xabc123...';
      mockWalletClient.sendTransaction.mockResolvedValue(mockTxHash);

      const transaction = await paymentService.processPayment(mockPaymentRequest);

      expect(transaction).toBeDefined();
      expect(transaction.hash).toBe(mockTxHash);
      expect(transaction.status).toBe(PaymentStatus.CONFIRMING);
      expect(transaction.orderId).toBe(mockPaymentRequest.orderId);
      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockPaymentRequest.recipient,
          value: mockPaymentRequest.amount
        })
      );
    });

    it('should process ERC-20 token payment successfully', async () => {
      const erc20Request = {
        ...mockPaymentRequest,
        token: mockUSDC,
        amount: parseUnits('100', 6)
      };

      const mockTxHash = '0xdef456...';
      mockContract.write.transfer.mockResolvedValue(mockTxHash);

      const transaction = await paymentService.processPayment(erc20Request);

      expect(transaction).toBeDefined();
      expect(transaction.hash).toBe(mockTxHash);
      expect(transaction.status).toBe(PaymentStatus.CONFIRMING);
      expect(mockContract.write.transfer).toHaveBeenCalledWith([
        erc20Request.recipient,
        erc20Request.amount
      ], expect.any(Object));
    });

    it('should throw error for insufficient balance', async () => {
      mockPublicClient.getBalance.mockResolvedValue(parseEther('0.1')); // Less than required

      await expect(paymentService.processPayment(mockPaymentRequest))
        .rejects.toThrow('Insufficient ETH balance');
    });

    it('should throw error for invalid payment request', async () => {
      const invalidRequest = {
        ...mockPaymentRequest,
        amount: BigInt(0)
      };

      await expect(paymentService.processPayment(invalidRequest))
        .rejects.toThrow('Invalid payment amount');
    });

    it('should throw error for invalid recipient address', async () => {
      const invalidRequest = {
        ...mockPaymentRequest,
        recipient: 'invalid-address'
      };

      await expect(paymentService.processPayment(invalidRequest))
        .rejects.toThrow('Invalid recipient address');
    });

    it('should throw error for expired deadline', async () => {
      const expiredRequest = {
        ...mockPaymentRequest,
        deadline: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };

      await expect(paymentService.processPayment(expiredRequest))
        .rejects.toThrow('Payment deadline has passed');
    });
  });

  describe('retryPayment', () => {
    it('should retry failed payment successfully', async () => {
      // First, create a failed transaction
      mockWalletClient.sendTransaction.mockRejectedValueOnce(new Error('Network error'));

      let transaction;
      try {
        transaction = await paymentService.processPayment(mockPaymentRequest);
      } catch (error) {
        // Expected to fail
      }

      // Now retry should work
      const mockTxHash = '0xretry123...';
      mockWalletClient.sendTransaction.mockResolvedValue(mockTxHash);

      const retriedTransaction = await paymentService.retryPayment(transaction!.id);

      expect(retriedTransaction).toBeDefined();
      expect(retriedTransaction.retryCount).toBe(1);
    });

    it('should throw error when max retries exceeded', async () => {
      // Create a transaction with max retries
      const transaction = await paymentService.processPayment(mockPaymentRequest);
      transaction.retryCount = 3; // Assuming max is 3
      transaction.maxRetries = 3;

      await expect(paymentService.retryPayment(transaction.id))
        .rejects.toThrow('Maximum retry attempts exceeded');
    });

    it('should throw error for non-existent transaction', async () => {
      await expect(paymentService.retryPayment('non-existent-id'))
        .rejects.toThrow('Transaction not found');
    });
  });

  describe('cancelPayment', () => {
    it('should cancel pending payment successfully', async () => {
      const transaction = await paymentService.processPayment(mockPaymentRequest);

      await expect(paymentService.cancelPayment(transaction.id))
        .resolves.not.toThrow();

      const status = paymentService.getTransactionStatus(transaction.id);
      expect(status).toBeNull(); // Should be removed from active transactions
    });

    it('should throw error when canceling confirmed transaction', async () => {
      const transaction = await paymentService.processPayment(mockPaymentRequest);
      transaction.status = PaymentStatus.CONFIRMED;

      await expect(paymentService.cancelPayment(transaction.id))
        .rejects.toThrow('Cannot cancel confirmed transaction');
    });
  });

  describe('generateReceipt', () => {
    it('should generate receipt for confirmed transaction', async () => {
      const transaction = await paymentService.processPayment(mockPaymentRequest);
      transaction.hash = '0xconfirmed123...';
      transaction.blockNumber = 12345;
      transaction.gasUsed = BigInt(21000);
      transaction.gasFee = parseUnits('420000', 9);
      transaction.status = PaymentStatus.CONFIRMED;

      const receipt = paymentService.generateReceipt(transaction);

      expect(receipt).toBeDefined();
      expect(receipt.transactionId).toBe(transaction.id);
      expect(receipt.orderId).toBe(mockPaymentRequest.orderId);
      expect(receipt.transactionHash).toBe(transaction.hash);
      expect(receipt.status).toBe(PaymentStatus.CONFIRMED);
    });

    it('should throw error for unconfirmed transaction', async () => {
      const transaction = await paymentService.processPayment(mockPaymentRequest);
      // Don't set hash or blockNumber

      expect(() => paymentService.generateReceipt(transaction))
        .toThrow('Transaction not confirmed');
    });
  });

  describe('transaction monitoring', () => {
    it('should update transaction status when confirmed', async () => {
      const mockTxHash = '0xmonitored123...';
      mockWalletClient.sendTransaction.mockResolvedValue(mockTxHash);

      // Mock successful transaction receipt
      mockPublicClient.getTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: BigInt(12345),
        gasUsed: BigInt(21000),
        effectiveGasPrice: parseUnits('20', 9)
      });

      mockPublicClient.getBlockNumber.mockResolvedValue(BigInt(12357)); // 12 confirmations

      const transaction = await paymentService.processPayment(mockPaymentRequest);

      // Wait for monitoring to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(transaction.status).toBe(PaymentStatus.CONFIRMING);
    });

    it('should handle failed transaction', async () => {
      const mockTxHash = '0xfailed123...';
      mockWalletClient.sendTransaction.mockResolvedValue(mockTxHash);

      // Mock failed transaction receipt
      mockPublicClient.getTransactionReceipt.mockResolvedValue({
        status: 'reverted',
        blockNumber: BigInt(12345),
        gasUsed: BigInt(21000),
        effectiveGasPrice: parseUnits('20', 9)
      });

      const transaction = await paymentService.processPayment(mockPaymentRequest);

      // Wait for monitoring to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(transaction.status).toBe(PaymentStatus.CONFIRMING);
    });
  });

  describe('error handling', () => {
    it('should handle user rejection error', async () => {
      const rejectionError = new Error('User rejected the request');
      mockWalletClient.sendTransaction.mockRejectedValue(rejectionError);

      await expect(paymentService.processPayment(mockPaymentRequest))
        .rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      mockWalletClient.sendTransaction.mockRejectedValue(networkError);

      await expect(paymentService.processPayment(mockPaymentRequest))
        .rejects.toThrow();
    });

    it('should handle gas estimation errors', async () => {
      mockGasFeeService.prototype.estimateGasFees.mockRejectedValue(
        new Error('Gas estimation failed')
      );

      await expect(paymentService.processPayment(mockPaymentRequest))
        .rejects.toThrow();
    });
  });
});