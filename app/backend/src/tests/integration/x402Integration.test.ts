import { X402PaymentService } from '../../services/x402PaymentService';

describe('X402 Payment Integration', () => {
  let x402PaymentService: X402PaymentService;

  beforeAll(() => {
    x402PaymentService = new X402PaymentService();
  });

  describe('processPayment', () => {
    it('should create a payment URL for x402 payment', async () => {
      const request = {
        orderId: 'test_order_123',
        amount: '100',
        currency: 'USD',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        listingId: 'test_listing_123'
      };

      const result = await x402PaymentService.processPayment(request);

      expect(result.success).toBe(true);
      expect(result.paymentUrl).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.transactionId).toBeDefined();
    });
  });

  describe('checkPaymentStatus', () => {
    it('should return completed status for a payment', async () => {
      const transactionId = 'test_transaction_123';

      const result = await x402PaymentService.checkPaymentStatus(transactionId);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe('completed');
    });
  });

  describe('refundPayment', () => {
    it('should process a refund for a payment', async () => {
      const transactionId = 'test_transaction_123';

      const result = await x402PaymentService.refundPayment(transactionId);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe('completed');
    });
  });
});
