import { X402PaymentService } from '../x402PaymentService';

// Mock fetch API
global.fetch = jest.fn();

describe('X402PaymentService', () => {
  let x402PaymentService: X402PaymentService;

  beforeEach(() => {
    x402PaymentService = new X402PaymentService();
    (fetch as jest.Mock).mockClear();
  });

  describe('processPayment', () => {
    it('should process an x402 payment successfully', async () => {
      const request = {
        orderId: 'order_123',
        amount: '100',
        currency: 'USD',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        listingId: 'listing_123'
      };

      // Mock successful response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: {
            paymentUrl: 'https://pay.coinbase.com/x402/payment_123',
            status: 'pending',
            transactionId: 'payment_intent_123'
          }
        })
      });

      const result = await x402PaymentService.processPayment(request);

      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
      expect(result.paymentUrl).toBe('https://pay.coinbase.com/x402/payment_123');
      expect(result.transactionId).toBe('payment_intent_123');
    });

    it('should handle payment processing errors', async () => {
      const request = {
        orderId: 'order_123',
        amount: '100',
        currency: 'USD',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        listingId: 'listing_123'
      };

      // Mock failed response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await x402PaymentService.processPayment(request);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });
  });

  describe('checkPaymentStatus', () => {
    it('should check the status of an x402 payment', async () => {
      const transactionId = 'payment_intent_123';

      // Mock successful response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: {
            transactionId: 'payment_intent_123',
            status: 'completed'
          }
        })
      });

      const result = await x402PaymentService.checkPaymentStatus(transactionId);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe('completed');
    });

    it('should handle payment status check errors', async () => {
      const transactionId = 'payment_intent_123';

      // Mock failed response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await x402PaymentService.checkPaymentStatus(transactionId);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });
  });

  describe('refundPayment', () => {
    it('should process an x402 payment refund', async () => {
      const transactionId = 'payment_intent_123';

      // Mock successful response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: {
            transactionId: 'refund_123',
            status: 'completed'
          }
        })
      });

      const result = await x402PaymentService.refundPayment(transactionId);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('refund_123');
      expect(result.status).toBe('completed');
    });

    it('should handle refund processing errors', async () => {
      const transactionId = 'payment_intent_123';

      // Mock failed response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await x402PaymentService.refundPayment(transactionId);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });
  });
});