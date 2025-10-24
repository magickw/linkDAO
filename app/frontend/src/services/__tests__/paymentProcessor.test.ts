/**
 * Tests for PaymentProcessor service
 */

import { PaymentProcessor, PaymentError, PaymentRequest, EscrowSetupRequest } from '../paymentProcessor';

// Mock fetch
global.fetch = jest.fn();

describe('PaymentProcessor', () => {
  let processor: PaymentProcessor;

  beforeEach(() => {
    processor = new PaymentProcessor({
      maxRetries: 2,
      delayMs: 10,
      backoffMultiplier: 2
    });
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    const mockRequest: PaymentRequest = {
      orderId: 'ORDER_123',
      amount: 100,
      currency: 'ETH',
      paymentMethod: 'crypto',
      userAddress: '0x123',
      tokenSymbol: 'ETH',
      networkId: 1
    };

    it('should process payment successfully', async () => {
      const mockResponse = {
        orderId: 'ORDER_123',
        transactionId: 'TX_123',
        transactionHash: '0xabc',
        status: 'processing'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await processor.processPayment(mockRequest);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('ORDER_123');
      expect(result.transactionHash).toBe('0xabc');
      expect(result.status).toBe('processing');
    });

    it('should handle payment failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Insufficient funds' })
      });

      const result = await processor.processPayment(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
      expect(result.retryable).toBe(false);
    });

    it('should retry on server errors', async () => {
      // First call fails with server error
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' })
        })
        // Second call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orderId: 'ORDER_123', status: 'processing' })
        });

      const result = await processor.processPayment(mockRequest);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries on persistent failures', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' })
      });

      await expect(processor.processPayment(mockRequest)).rejects.toThrow(PaymentError);
      expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('setupEscrow', () => {
    const mockRequest: EscrowSetupRequest = {
      orderId: 'ORDER_123',
      amount: 100,
      buyerAddress: '0x123',
      sellerAddress: '0x456',
      networkId: 1
    };

    it('should setup escrow successfully', async () => {
      const mockResponse = {
        escrowAddress: '0xescrow',
        transactionHash: '0xabc'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await processor.setupEscrow(mockRequest);

      expect(result.success).toBe(true);
      expect(result.escrowAddress).toBe('0xescrow');
      expect(result.transactionHash).toBe('0xabc');
    });

    it('should handle escrow setup failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Setup failed' })
      });

      const result = await processor.setupEscrow(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Setup failed');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await processor.setupEscrow(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('validatePaymentMethod', () => {
    it('should validate payment method successfully', async () => {
      const mockResponse = {
        isValid: true,
        hasSufficientBalance: true,
        errors: [],
        suggestedAlternatives: []
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await processor.validatePaymentMethod('crypto', '0x123');

      expect(result.isValid).toBe(true);
      expect(result.hasSufficientBalance).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors', async () => {
      const mockResponse = {
        isValid: false,
        errors: ['Insufficient balance', 'Network not supported'],
        suggestedAlternatives: ['fiat']
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await processor.validatePaymentMethod('crypto', '0x123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Insufficient balance');
      expect(result.suggestedAlternatives).toContain('fiat');
    });

    it('should handle validation service unavailability', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      });

      const result = await processor.validatePaymentMethod('crypto', '0x123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment validation service unavailable');
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const mockResponse = {
        success: true,
        orderId: 'ORDER_123',
        status: 'completed',
        transactionHash: '0xabc'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await processor.getPaymentStatus('ORDER_123');

      expect(result).not.toBeNull();
      expect(result?.orderId).toBe('ORDER_123');
      expect(result?.status).toBe('completed');
    });

    it('should return null on failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      });

      const result = await processor.getPaymentStatus('ORDER_123');

      expect(result).toBeNull();
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const result = await processor.cancelPayment('ORDER_123', 'User requested');

      expect(result).toBe(true);
    });

    it('should return false on cancellation failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      });

      const result = await processor.cancelPayment('ORDER_123', 'User requested');

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await processor.cancelPayment('ORDER_123', 'User requested');

      expect(result).toBe(false);
    });
  });

  describe('PaymentError', () => {
    it('should create retryable error', () => {
      const error = new PaymentError('Test error', true, 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.retryable).toBe(true);
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('PaymentError');
    });

    it('should create non-retryable error', () => {
      const error = new PaymentError('Test error', false);

      expect(error.retryable).toBe(false);
    });

    it('should default to retryable', () => {
      const error = new PaymentError('Test error');

      expect(error.retryable).toBe(true);
    });
  });
});
