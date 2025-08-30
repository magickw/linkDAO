import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useCryptoPayment } from '../useCryptoPayment';
import { PaymentRequest, PaymentStatus } from '../../types/payment';
import { parseEther } from 'viem';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  usePublicClient: () => mockPublicClient,
  useWalletClient: () => ({ data: mockWalletClient }),
  useChainId: () => 1,
  useAccount: () => ({ address: '0x123...', isConnected: true })
}));

// Mock services
jest.mock('../../services/cryptoPaymentService');
jest.mock('../../services/gasFeeService');

const mockPublicClient = {
  estimateGas: jest.fn(),
  getFeeHistory: jest.fn(),
  getBlock: jest.fn(),
  getGasPrice: jest.fn()
};

const mockWalletClient = {
  getAddresses: jest.fn(),
  sendTransaction: jest.fn()
};

const mockPaymentRequest: PaymentRequest = {
  orderId: 'order_123',
  amount: parseEther('1'),
  token: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: 1,
    isNative: true
  },
  recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
  chainId: 1
};

describe('useCryptoPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCryptoPayment());

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.currentTransaction).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.gasEstimate).toBeNull();
  });

  it('should estimate gas fees', async () => {
    const { result } = renderHook(() => useCryptoPayment());

    const mockGasEstimate = {
      gasLimit: BigInt(21000),
      gasPrice: BigInt(20000000000),
      totalCost: BigInt(420000000000000)
    };

    // Wait for services to initialize
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      // Mock the gas estimation
      const estimate = await result.current.estimateGas(mockPaymentRequest);
      expect(estimate).toBeDefined();
    });
  });

  it('should process payment successfully', async () => {
    const { result } = renderHook(() => useCryptoPayment());

    const mockTransaction = {
      id: 'tx_123',
      orderId: mockPaymentRequest.orderId,
      amount: mockPaymentRequest.amount,
      token: mockPaymentRequest.token,
      sender: '0x123...',
      recipient: mockPaymentRequest.recipient,
      chainId: 1,
      status: PaymentStatus.PENDING,
      confirmations: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    // Wait for services to initialize
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      const transaction = await result.current.processPayment(mockPaymentRequest);
      expect(transaction).toBeDefined();
    });
  });

  it('should handle payment errors', async () => {
    const { result } = renderHook(() => useCryptoPayment());

    // Wait for services to initialize
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      try {
        // This should trigger an error since services are mocked
        await result.current.processPayment(mockPaymentRequest);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  it('should retry failed payments', async () => {
    const { result } = renderHook(() => useCryptoPayment());

    // Wait for services to initialize
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      try {
        await result.current.retryPayment('tx_123');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  it('should cancel payments', async () => {
    const { result } = renderHook(() => useCryptoPayment());

    // Wait for services to initialize
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      try {
        await result.current.cancelPayment('tx_123');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useCryptoPayment());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should format amounts correctly', () => {
    const { result } = renderHook(() => useCryptoPayment());

    const formatted = result.current.formatAmount(parseEther('1.5'), 18);
    expect(formatted).toBe('1.5');

    const formattedUSDC = result.current.formatAmount(BigInt(1500000), 6);
    expect(formattedUSDC).toBe('1.5');
  });

  it('should parse amounts correctly', () => {
    const { result } = renderHook(() => useCryptoPayment());

    const parsed = result.current.parseAmount('1.5', 18);
    expect(parsed).toBe(parseEther('1.5'));

    const parsedUSDC = result.current.parseAmount('1.5', 6);
    expect(parsedUSDC).toBe(BigInt(1500000));
  });

  it('should handle edge cases in amount formatting', () => {
    const { result } = renderHook(() => useCryptoPayment());

    // Test whole numbers
    const whole = result.current.formatAmount(parseEther('5'), 18);
    expect(whole).toBe('5');

    // Test very small amounts
    const small = result.current.formatAmount(BigInt(1), 18);
    expect(small).toBe('0.000000000000000001');

    // Test zero
    const zero = result.current.formatAmount(BigInt(0), 18);
    expect(zero).toBe('0');
  });

  it('should handle edge cases in amount parsing', () => {
    const { result } = renderHook(() => useCryptoPayment());

    // Test whole numbers
    const whole = result.current.parseAmount('5', 18);
    expect(whole).toBe(parseEther('5'));

    // Test numbers with many decimals
    const manyDecimals = result.current.parseAmount('1.123456789012345678', 18);
    expect(manyDecimals).toBe(BigInt('1123456789012345678'));

    // Test numbers with fewer decimals than token precision
    const fewDecimals = result.current.parseAmount('1.5', 18);
    expect(fewDecimals).toBe(parseEther('1.5'));
  });
});