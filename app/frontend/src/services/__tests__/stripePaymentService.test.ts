import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StripePaymentService } from '../stripePaymentService';
import { FiatPaymentRequest, FiatPaymentStatus } from '../../types/fiatPayment';

describe('StripePaymentService', () => {
  let stripeService: StripePaymentService;
  const mockApiKey = 'sk_test_mock_key';

  const mockPaymentRequest: FiatPaymentRequest = {
    orderId: 'order_123',
    amount: 100,
    currency: 'USD',
    paymentMethodId: 'pm_test_123',
    customerEmail: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    stripeService = new StripePaymentService(mockApiKey);
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const transaction = await stripeService.processPayment(mockPaymentRequest);

      expect(transaction).toBeDefined();
      expect(transaction.orderId).toBe(mockPaymentRequest.orderId);
      expect(transaction.amount).toBe(mockPaymentRequest.amount);
      expect(transaction.currency).toBe(mockPaymentRequest.currency);
      expect(transaction.provider).toBe('stripe');
      expect(transaction.fees.processingFee).toBeGreaterThan(0);
      expect(transaction.fees.platformFee).toBeGreaterThan(0);
    });

    it('should handle crypto conversion request', async () => {
      const requestWithCrypto: FiatPaymentRequest = {
        ...mockPaymentRequest,
        convertToCrypto: {
          targetToken: 'ETH',
          targetChain: 1,
          slippageTolerance: 1.0
        }
      };

      const transaction = await stripeService.processPayment(requestWithCrypto);

      expect(transaction.cryptoConversion).toBeDefined();
      expect(transaction.cryptoConversion?.toToken).toBe('ETH');
      expect(transaction.cryptoConversion?.status).toBe('pending');
    });

    it('should validate payment request', async () => {
      const invalidRequest = {
        ...mockPaymentRequest,
        amount: 0
      };

      await expect(stripeService.processPayment(invalidRequest))
        .rejects.toThrow('Invalid payment amount');
    });

    it('should check compliance requirements', async () => {
      // This test would fail if compliance checks fail
      const transaction = await stripeService.processPayment(mockPaymentRequest);
      expect(transaction).toBeDefined();
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const transaction = await stripeService.confirmPayment('pi_test_123', 'pm_test_123');

      expect(transaction).toBeDefined();
      expect(transaction.status).toBe(FiatPaymentStatus.SUCCEEDED);
      expect(transaction.providerTransactionId).toBe('pi_test_123');
    });
  });

  describe('getPaymentMethods', () => {
    it('should retrieve customer payment methods', async () => {
      const paymentMethods = await stripeService.getPaymentMethods('cus_test_123');

      expect(paymentMethods).toBeDefined();
      expect(Array.isArray(paymentMethods)).toBe(true);
      expect(paymentMethods.length).toBeGreaterThan(0);
      expect(paymentMethods[0].provider).toBe('stripe');
    });
  });

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      const transaction = await stripeService.refundPayment('pi_test_123', 50, 'customer_request');

      expect(transaction).toBeDefined();
      expect(transaction.status).toBe(FiatPaymentStatus.REFUNDED);
      expect(transaction.amount).toBe(50);
      expect(transaction.refundId).toBeDefined();
    });

    it('should process full refund when amount not specified', async () => {
      const transaction = await stripeService.refundPayment('pi_test_123');

      expect(transaction).toBeDefined();
      expect(transaction.status).toBe(FiatPaymentStatus.REFUNDED);
    });
  });

  describe('setupPaymentMethod', () => {
    it('should setup payment method successfully', async () => {
      const setup = await stripeService.setupPaymentMethod('cus_test_123');

      expect(setup).toBeDefined();
      expect(setup.clientSecret).toBeDefined();
      expect(setup.status).toBe('requires_payment_method');
    });
  });

  describe('generateReceipt', () => {
    it('should generate payment receipt', async () => {
      const transaction = await stripeService.processPayment(mockPaymentRequest);
      transaction.providerTransactionId = 'pi_test_123';
      
      const receipt = stripeService.generateReceipt(transaction);

      expect(receipt).toBeDefined();
      expect(receipt.transactionId).toBe(transaction.id);
      expect(receipt.orderId).toBe(transaction.orderId);
      expect(receipt.amount).toBe(transaction.amount);
      expect(receipt.currency).toBe(transaction.currency);
      expect(receipt.providerTransactionId).toBe('pi_test_123');
    });
  });

  describe('fee calculations', () => {
    it('should calculate processing fees correctly', async () => {
      const transaction = await stripeService.processPayment({
        ...mockPaymentRequest,
        amount: 100
      });

      // Stripe fee: 2.9% + $0.30
      const expectedProcessingFee = (100 * 0.029) + 0.30;
      expect(transaction.fees.processingFee).toBeCloseTo(expectedProcessingFee, 2);
    });

    it('should calculate platform fees correctly', async () => {
      const transaction = await stripeService.processPayment({
        ...mockPaymentRequest,
        amount: 100
      });

      // Platform fee: 1%
      const expectedPlatformFee = 100 * 0.01;
      expect(transaction.fees.platformFee).toBe(expectedPlatformFee);
    });

    it('should calculate total fees correctly', async () => {
      const transaction = await stripeService.processPayment(mockPaymentRequest);

      const expectedTotal = transaction.fees.processingFee + transaction.fees.platformFee;
      expect(transaction.fees.totalFees).toBe(expectedTotal);
    });
  });

  describe('status mapping', () => {
    it('should map Stripe statuses correctly', async () => {
      // This is tested indirectly through confirmPayment
      const transaction = await stripeService.confirmPayment('pi_test_123', 'pm_test_123');
      expect(transaction.status).toBe(FiatPaymentStatus.SUCCEEDED);
    });
  });

  describe('error handling', () => {
    it('should handle invalid currency', async () => {
      const invalidRequest = {
        ...mockPaymentRequest,
        currency: 'INVALID'
      };

      await expect(stripeService.processPayment(invalidRequest))
        .rejects.toThrow('Unsupported currency: INVALID');
    });

    it('should handle missing required fields', async () => {
      const invalidRequest = {
        ...mockPaymentRequest,
        orderId: ''
      };

      await expect(stripeService.processPayment(invalidRequest))
        .rejects.toThrow('Invalid payment request: missing required fields');
    });
  });
});