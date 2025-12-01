import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { X402PaymentService } from '../x402PaymentService';

// Mock fetch
global.fetch = vi.fn();

// Mock authService
vi.mock('../authService', () => ({
  authService: {
    getAuthHeaders: () => ({
      'Authorization': 'Bearer mock-token'
    })
  }
}));

describe('X402PaymentService', () => {
  let x402Service: X402PaymentService;

  beforeEach(() => {
    x402Service = new X402PaymentService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processPayment', () => {
    const validRequest = {
      orderId: 'test-order-123',
      amount: '100.00',
      currency: 'USD',
      buyerAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      sellerAddress: '0x1234567890123456789012345678901234567890',
      listingId: 'test-listing-123'
    };

    it('should process a payment successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          paymentUrl: 'https://pay.coinbase.com/x402/test-order-123',
          status: 'pending',
          transactionId: 'x402_test-order-123_1234567890'
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await x402Service.processPayment(validRequest);

      expect(result.success).toBe(true);
      expect(result.paymentUrl).toBe('https://pay.coinbase.com/x402/test-order-123');
      expect(result.status).toBe('pending');
      expect(result.transactionId).toBe('x402_test-order-123_1234567890');
    });

    it('should validate required fields', async () => {
      const invalidRequest = { ...validRequest, orderId: '' };

      const result = await x402Service.processPayment(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should validate amount format', async () => {
      const invalidRequest = { ...validRequest, amount: 'invalid' };

      const result = await x402Service.processPayment(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
    });

    it('should validate Ethereum addresses', async () => {
      const invalidRequest = { ...validRequest, buyerAddress: 'invalid-address' };

      const result = await x402Service.processPayment(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid buyer address format');
    });

    it('should handle server errors with retry', async () => {
      // First call fails with server error
      (fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error')
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              paymentUrl: 'https://pay.coinbase.com/x402/test-order-123',
              status: 'pending',
              transactionId: 'x402_test-order-123_1234567890'
            }
          })
        });

      const result = await x402Service.processPayment(validRequest);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });

      const result = await x402Service.processPayment(validRequest);

      expect(result.success).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(3); // Max retries
    });
  });

  describe('checkPaymentStatus', () => {
    it('should check payment status successfully', async () => {
      const transactionId = 'x402_test-order-123_1234567890';
      const mockResponse = {
        success: true,
        data: {
          transactionId,
          status: 'completed'
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await x402Service.checkPaymentStatus(transactionId);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe('completed');
    });

    it('should validate transaction ID', async () => {
      const result = await x402Service.checkPaymentStatus('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction ID is required');
    });
  });

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      const transactionId = 'x402_test-order-123_1234567890';
      const mockResponse = {
        success: true,
        data: {
          transactionId: `refund_${transactionId}_${Date.now()}`,
          status: 'completed'
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await x402Service.refundPayment(transactionId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.transactionId).toContain('refund_');
    });
  });
});