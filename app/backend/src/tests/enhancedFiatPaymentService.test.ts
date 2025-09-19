import { 
  EnhancedFiatPaymentService, 
  FiatPaymentRequest, 
  FiatPaymentResult,
  PaymentMethodSelection,
  PaymentMethodInfo,
  FiatPaymentStatus
} from '../services/enhancedFiatPaymentService';
import { DatabaseService } from '../services/databaseService';
import { ExchangeRateService } from '../services/exchangeRateService';
import { NotificationService } from '../services/notificationService';
import { UserProfileService } from '../services/userProfileService';

// Mock dependencies
jest.mock('../services/databaseService');
jest.mock('../services/exchangeRateService');
jest.mock('../services/notificationService');
jest.mock('../services/userProfileService');

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedExchangeRateService = ExchangeRateService as jest.MockedClass<typeof ExchangeRateService>;
const MockedNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;
const MockedUserProfileService = UserProfileService as jest.MockedClass<typeof UserProfileService>;

describe('EnhancedFiatPaymentService', () => {
  let enhancedFiatPaymentService: EnhancedFiatPaymentService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockExchangeRateService: jest.Mocked<ExchangeRateService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockUserProfileService: jest.Mocked<UserProfileService>;

  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockOrderId = 'order_123';
  const mockPaymentMethodId = 'pm_test123';

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockExchangeRateService = new MockedExchangeRateService() as jest.Mocked<ExchangeRateService>;
    mockNotificationService = new MockedNotificationService() as jest.Mocked<NotificationService>;
    mockUserProfileService = new MockedUserProfileService() as jest.Mocked<UserProfileService>;

    // Create service instance
    enhancedFiatPaymentService = new EnhancedFiatPaymentService();

    // Setup default mocks
    mockExchangeRateService.getExchangeRate.mockResolvedValue({
      fromCurrency: 'USD',
      toCurrency: 'ETH',
      rate: 0.0004,
      lastUpdated: new Date(),
      source: 'mock'
    });

    mockNotificationService.sendOrderNotification.mockResolvedValue();
  });

  describe('processFiatPayment', () => {
    it('should process Stripe payment successfully', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 100,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'stripe',
        userAddress: mockUserAddress
      };

      const result = await enhancedFiatPaymentService.processFiatPayment(request);

      expect(result.orderId).toBe(mockOrderId);
      expect(result.amount).toBe(100);
      expect(result.currency).toBe('USD');
      expect(result.provider).toBe('stripe');
      expect(result.status).toBe(FiatPaymentStatus.SUCCEEDED);
      expect(result.fees.totalFees).toBeGreaterThan(0);
      expect(result.receipt).toBeDefined();
    });

    it('should process PayPal payment successfully', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 50,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'paypal',
        userAddress: mockUserAddress
      };

      const result = await enhancedFiatPaymentService.processFiatPayment(request);

      expect(result.provider).toBe('paypal');
      expect(result.status).toBe(FiatPaymentStatus.SUCCEEDED);
      expect(result.fees.processingFee).toBe(50 * 0.034); // PayPal fee
    });

    it('should process bank transfer payment successfully', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 1000,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'bank_transfer',
        userAddress: mockUserAddress
      };

      const result = await enhancedFiatPaymentService.processFiatPayment(request);

      expect(result.provider).toBe('bank_transfer');
      expect(result.status).toBe(FiatPaymentStatus.SUCCEEDED);
      expect(result.fees.processingFee).toBe(5.00); // Flat bank transfer fee
    });

    it('should process payment with crypto conversion', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 100,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'stripe',
        userAddress: mockUserAddress,
        convertToCrypto: {
          targetToken: 'ETH',
          targetChain: 1,
          slippageTolerance: 1.0,
          recipientAddress: mockUserAddress
        }
      };

      const result = await enhancedFiatPaymentService.processFiatPayment(request);

      expect(result.cryptoConversion).toBeDefined();
      expect(result.cryptoConversion!.fromCurrency).toBe('USD');
      expect(result.cryptoConversion!.toToken).toBe('ETH');
      expect(result.cryptoConversion!.status).toBe('completed');
      expect(result.cryptoConversion!.transactionHash).toBeDefined();
      expect(result.fees.exchangeFee).toBeGreaterThan(0);
      expect(result.fees.conversionFee).toBeGreaterThan(0);
    });

    it('should fail for unsupported provider', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 100,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'unsupported' as any,
        userAddress: mockUserAddress
      };

      await expect(enhancedFiatPaymentService.processFiatPayment(request)).rejects.toThrow('Unsupported payment provider');
    });

    it('should fail for unsupported currency', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 100,
        currency: 'XYZ',
        paymentMethodId: mockPaymentMethodId,
        provider: 'stripe',
        userAddress: mockUserAddress
      };

      await expect(enhancedFiatPaymentService.processFiatPayment(request)).rejects.toThrow("stripe doesn't support XYZ");
    });

    it('should fail for amount below minimum', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 0.25, // Below Stripe minimum of 0.50
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'stripe',
        userAddress: mockUserAddress
      };

      await expect(enhancedFiatPaymentService.processFiatPayment(request)).rejects.toThrow('Amount must be between');
    });

    it('should fail for amount above maximum', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 1000000, // Above Stripe maximum
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'stripe',
        userAddress: mockUserAddress
      };

      await expect(enhancedFiatPaymentService.processFiatPayment(request)).rejects.toThrow('Amount must be between');
    });

    it('should fail for missing required fields', async () => {
      const request: FiatPaymentRequest = {
        orderId: '',
        amount: 100,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'stripe',
        userAddress: mockUserAddress
      };

      await expect(enhancedFiatPaymentService.processFiatPayment(request)).rejects.toThrow('Missing required fields');
    });
  });

  describe('getAvailablePaymentMethods', () => {
    it('should return available payment methods for USD', async () => {
      const methods = await enhancedFiatPaymentService.getAvailablePaymentMethods(
        mockUserAddress,
        100,
        'USD',
        'US'
      );

      expect(methods.availableMethods.length).toBeGreaterThan(0);
      expect(methods.availableMethods.some(m => m.provider === 'stripe')).toBe(true);
      expect(methods.availableMethods.some(m => m.provider === 'paypal')).toBe(true);
      expect(methods.availableMethods.some(m => m.provider === 'bank_transfer')).toBe(true);
      expect(methods.recommendedMethod).toBeDefined();
      expect(methods.reasoning.length).toBeGreaterThan(0);
    });

    it('should filter methods by currency support', async () => {
      const methods = await enhancedFiatPaymentService.getAvailablePaymentMethods(
        mockUserAddress,
        100,
        'JPY',
        'JP'
      );

      // Only Stripe supports JPY in our mock config
      const stripeMethod = methods.availableMethods.find(m => m.provider === 'stripe');
      const paypalMethod = methods.availableMethods.find(m => m.provider === 'paypal');

      expect(stripeMethod).toBeDefined();
      expect(paypalMethod).toBeUndefined();
      expect(methods.restrictions.some(r => r.includes("PayPal doesn't support JPY"))).toBe(true);
    });

    it('should filter methods by amount limits', async () => {
      const methods = await enhancedFiatPaymentService.getAvailablePaymentMethods(
        mockUserAddress,
        0.25, // Below minimum for most providers
        'USD',
        'US'
      );

      expect(methods.restrictions.length).toBeGreaterThan(0);
      expect(methods.restrictions.some(r => r.includes('amount limits'))).toBe(true);
    });

    it('should recommend card for small amounts', async () => {
      const methods = await enhancedFiatPaymentService.getAvailablePaymentMethods(
        mockUserAddress,
        50, // Small amount
        'USD',
        'US'
      );

      expect(methods.recommendedMethod?.type).toBe('card');
      expect(methods.reasoning.some(r => r.includes('Cards are ideal for smaller amounts'))).toBe(true);
    });

    it('should recommend bank transfer for large amounts', async () => {
      const methods = await enhancedFiatPaymentService.getAvailablePaymentMethods(
        mockUserAddress,
        5000, // Large amount
        'USD',
        'US'
      );

      expect(methods.recommendedMethod?.type).toBe('bank_account');
      expect(methods.reasoning.some(r => r.includes('Bank transfers have lower fees for larger amounts'))).toBe(true);
    });
  });

  describe('setupPaymentMethod', () => {
    it('should setup Stripe card method successfully', async () => {
      const methodData = {
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025,
        country: 'US',
        currency: 'USD'
      };

      const paymentMethod = await enhancedFiatPaymentService.setupPaymentMethod(
        mockUserAddress,
        'stripe',
        'card',
        methodData
      );

      expect(paymentMethod.provider).toBe('stripe');
      expect(paymentMethod.type).toBe('card');
      expect(paymentMethod.last4).toBe('4242');
      expect(paymentMethod.brand).toBe('visa');
      expect(paymentMethod.enabled).toBe(true);
    });

    it('should setup PayPal account method successfully', async () => {
      const methodData = {
        email: 'user@example.com',
        country: 'US',
        currency: 'USD'
      };

      const paymentMethod = await enhancedFiatPaymentService.setupPaymentMethod(
        mockUserAddress,
        'paypal',
        'paypal_account',
        methodData
      );

      expect(paymentMethod.provider).toBe('paypal');
      expect(paymentMethod.type).toBe('paypal_account');
    });

    it('should fail for unsupported provider', async () => {
      await expect(
        enhancedFiatPaymentService.setupPaymentMethod(
          mockUserAddress,
          'unsupported',
          'card',
          {}
        )
      ).rejects.toThrow('Unsupported provider');
    });

    it('should fail for unsupported method type', async () => {
      await expect(
        enhancedFiatPaymentService.setupPaymentMethod(
          mockUserAddress,
          'stripe',
          'unsupported_method',
          {}
        )
      ).rejects.toThrow("stripe doesn't support unsupported_method");
    });
  });

  describe('getPaymentMethodSelectionData', () => {
    it('should return complete selection data', async () => {
      const selectionData = await enhancedFiatPaymentService.getPaymentMethodSelectionData(
        mockUserAddress,
        100,
        'USD',
        'US'
      );

      expect(selectionData.methods).toBeDefined();
      expect(selectionData.fees).toBeDefined();
      expect(selectionData.limits).toBeDefined();
      expect(selectionData.processingTimes).toBeDefined();

      // Check that all providers have fee data
      expect(selectionData.fees.stripe).toBeDefined();
      expect(selectionData.fees.paypal).toBeDefined();
      expect(selectionData.fees.bank_transfer).toBeDefined();

      // Check fee calculations
      expect(selectionData.fees.stripe.processingFee).toBe((100 * 0.029) + 0.30);
      expect(selectionData.fees.paypal.processingFee).toBe(100 * 0.034);
      expect(selectionData.fees.bank_transfer.processingFee).toBe(5.00);
    });

    it('should include processing times', async () => {
      const selectionData = await enhancedFiatPaymentService.getPaymentMethodSelectionData(
        mockUserAddress,
        100,
        'USD',
        'US'
      );

      expect(selectionData.processingTimes.stripe).toBe('instant');
      expect(selectionData.processingTimes.paypal).toBe('instant');
      expect(selectionData.processingTimes.bank_transfer).toBe('1-3 business days');
    });
  });

  describe('refundPayment', () => {
    it('should process full refund successfully', async () => {
      const transactionId = 'fiat_123';
      
      // Mock transaction exists
      jest.spyOn(enhancedFiatPaymentService as any, 'getTransaction').mockResolvedValue({
        id: transactionId,
        orderId: mockOrderId,
        amount: 100,
        currency: 'USD',
        status: FiatPaymentStatus.SUCCEEDED,
        provider: 'stripe'
      });

      const result = await enhancedFiatPaymentService.refundPayment(transactionId, undefined, 'Customer request');

      expect(result.status).toBe(FiatPaymentStatus.REFUNDED);
    });

    it('should process partial refund successfully', async () => {
      const transactionId = 'fiat_123';
      
      jest.spyOn(enhancedFiatPaymentService as any, 'getTransaction').mockResolvedValue({
        id: transactionId,
        orderId: mockOrderId,
        amount: 100,
        currency: 'USD',
        status: FiatPaymentStatus.SUCCEEDED,
        provider: 'stripe'
      });

      const result = await enhancedFiatPaymentService.refundPayment(transactionId, 50, 'Partial refund');

      expect(result.status).toBe(FiatPaymentStatus.REFUNDED);
    });

    it('should fail refund for non-existent transaction', async () => {
      jest.spyOn(enhancedFiatPaymentService as any, 'getTransaction').mockResolvedValue(null);

      await expect(
        enhancedFiatPaymentService.refundPayment('non_existent', undefined, 'Test')
      ).rejects.toThrow('Transaction not found');
    });

    it('should fail refund for amount exceeding original', async () => {
      const transactionId = 'fiat_123';
      
      jest.spyOn(enhancedFiatPaymentService as any, 'getTransaction').mockResolvedValue({
        id: transactionId,
        amount: 100,
        currency: 'USD'
      });

      await expect(
        enhancedFiatPaymentService.refundPayment(transactionId, 150, 'Too much')
      ).rejects.toThrow('Refund amount cannot exceed original payment amount');
    });
  });

  describe('Error handling', () => {
    it('should handle exchange rate service errors', async () => {
      mockExchangeRateService.getExchangeRate.mockRejectedValue(new Error('Exchange rate error'));

      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 100,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'stripe',
        userAddress: mockUserAddress,
        convertToCrypto: {
          targetToken: 'ETH',
          targetChain: 1,
          slippageTolerance: 1.0,
          recipientAddress: mockUserAddress
        }
      };

      await expect(enhancedFiatPaymentService.processFiatPayment(request)).rejects.toThrow('Exchange rate error');
    });

    it('should handle notification service errors gracefully', async () => {
      mockNotificationService.sendOrderNotification.mockRejectedValue(new Error('Notification error'));

      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 100,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'stripe',
        userAddress: mockUserAddress
      };

      // Should still process payment even if notifications fail
      const result = await enhancedFiatPaymentService.processFiatPayment(request);
      expect(result.status).toBe(FiatPaymentStatus.SUCCEEDED);
    });
  });

  describe('Fee calculations', () => {
    it('should calculate Stripe fees correctly', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 100,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'stripe',
        userAddress: mockUserAddress
      };

      const result = await enhancedFiatPaymentService.processFiatPayment(request);

      expect(result.fees.processingFee).toBe((100 * 0.029) + 0.30); // Stripe fee
      expect(result.fees.platformFee).toBe(100 * 0.01); // 1% platform fee
      expect(result.fees.totalFees).toBe(result.fees.processingFee + result.fees.platformFee);
    });

    it('should calculate PayPal fees correctly', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 100,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'paypal',
        userAddress: mockUserAddress
      };

      const result = await enhancedFiatPaymentService.processFiatPayment(request);

      expect(result.fees.processingFee).toBe(100 * 0.034); // PayPal fee
      expect(result.fees.platformFee).toBe(100 * 0.01); // 1% platform fee
    });

    it('should calculate bank transfer fees correctly', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 1000,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'bank_transfer',
        userAddress: mockUserAddress
      };

      const result = await enhancedFiatPaymentService.processFiatPayment(request);

      expect(result.fees.processingFee).toBe(5.00); // Flat bank transfer fee
      expect(result.fees.platformFee).toBe(1000 * 0.01); // 1% platform fee
    });

    it('should include crypto conversion fees', async () => {
      const request: FiatPaymentRequest = {
        orderId: mockOrderId,
        amount: 100,
        currency: 'USD',
        paymentMethodId: mockPaymentMethodId,
        provider: 'stripe',
        userAddress: mockUserAddress,
        convertToCrypto: {
          targetToken: 'ETH',
          targetChain: 1,
          slippageTolerance: 1.0,
          recipientAddress: mockUserAddress
        }
      };

      const result = await enhancedFiatPaymentService.processFiatPayment(request);

      expect(result.fees.exchangeFee).toBe(100 * 0.002); // 0.2% exchange fee
      expect(result.fees.conversionFee).toBe(100 * 0.005); // 0.5% conversion fee
      expect(result.fees.totalFees).toBeGreaterThan(result.fees.processingFee + result.fees.platformFee);
    });
  });
});