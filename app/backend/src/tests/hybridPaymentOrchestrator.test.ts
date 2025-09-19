import { 
  HybridPaymentOrchestrator, 
  HybridCheckoutRequest, 
  PaymentPathDecision,
  HybridPaymentResult
} from '../services/hybridPaymentOrchestrator';
import { PaymentValidationService } from '../services/paymentValidationService';
import { EnhancedFiatPaymentService } from '../services/enhancedFiatPaymentService';
import { EnhancedEscrowService } from '../services/enhancedEscrowService';
import { ExchangeRateService } from '../services/exchangeRateService';
import { DatabaseService } from '../services/databaseService';
import { NotificationService } from '../services/notificationService';

// Mock dependencies
jest.mock('../services/paymentValidationService');
jest.mock('../services/enhancedFiatPaymentService');
jest.mock('../services/enhancedEscrowService');
jest.mock('../services/exchangeRateService');
jest.mock('../services/databaseService');
jest.mock('../services/notificationService');

const MockedPaymentValidationService = PaymentValidationService as jest.MockedClass<typeof PaymentValidationService>;
const MockedEnhancedFiatPaymentService = EnhancedFiatPaymentService as jest.MockedClass<typeof EnhancedFiatPaymentService>;
const MockedEnhancedEscrowService = EnhancedEscrowService as jest.MockedClass<typeof EnhancedEscrowService>;
const MockedExchangeRateService = ExchangeRateService as jest.MockedClass<typeof ExchangeRateService>;
const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;

describe('HybridPaymentOrchestrator', () => {
  let hybridPaymentOrchestrator: HybridPaymentOrchestrator;
  let mockPaymentValidationService: jest.Mocked<PaymentValidationService>;
  let mockFiatPaymentService: jest.Mocked<EnhancedFiatPaymentService>;
  let mockEscrowService: jest.Mocked<EnhancedEscrowService>;
  let mockExchangeRateService: jest.Mocked<ExchangeRateService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  const mockRequest: HybridCheckoutRequest = {
    orderId: 'order_123',
    listingId: 'listing_456',
    buyerAddress: '0x1234567890123456789012345678901234567890',
    sellerAddress: '0x9876543210987654321098765432109876543210',
    amount: 100,
    currency: 'USD',
    preferredMethod: 'auto',
    userCountry: 'US'
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockPaymentValidationService = new MockedPaymentValidationService() as jest.Mocked<PaymentValidationService>;
    mockFiatPaymentService = new MockedEnhancedFiatPaymentService() as jest.Mocked<EnhancedFiatPaymentService>;
    mockEscrowService = new MockedEnhancedEscrowService('', '', '') as jest.Mocked<EnhancedEscrowService>;
    mockExchangeRateService = new MockedExchangeRateService() as jest.Mocked<ExchangeRateService>;
    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockNotificationService = new MockedNotificationService() as jest.Mocked<NotificationService>;

    // Create service instance
    hybridPaymentOrchestrator = new HybridPaymentOrchestrator();

    // Setup default mocks
    mockNotificationService.sendOrderNotification.mockResolvedValue();
    mockDatabaseService.createOrder.mockResolvedValue({
      id: 1,
      listingId: 456,
      buyerId: 'buyer-id',
      sellerId: 'seller-id',
      amount: '100',
      paymentToken: 'USD',
      status: 'created',
      createdAt: new Date()
    });
    mockDatabaseService.updateOrder.mockResolvedValue({});
  });

  describe('determineOptimalPaymentPath', () => {
    it('should select crypto path when user has sufficient balance and prefers crypto', async () => {
      mockPaymentValidationService.validatePayment.mockResolvedValue({
        isValid: true,
        hasSufficientBalance: true,
        errors: [],
        warnings: [],
        estimatedFees: {
          processingFee: 0,
          platformFee: 0.5,
          gasFee: 0.01,
          totalFees: 0.51,
          currency: 'USDC'
        }
      });

      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [
          {
            id: 'stripe_card',
            type: 'card',
            provider: 'stripe',
            name: 'Stripe Card',
            isDefault: false,
            enabled: true,
            country: 'US',
            currency: 'USD',
            verificationStatus: 'verified',
            addedAt: new Date()
          }
        ],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      const request = { ...mockRequest, preferredMethod: 'crypto' as const };
      const decision = await hybridPaymentOrchestrator.determineOptimalPaymentPath(request);

      expect(decision.selectedPath).toBe('crypto');
      expect(decision.reason).toContain('Crypto payment selected');
      expect(decision.method.type).toBe('crypto');
      expect(decision.fallbackOptions).toHaveLength(1);
      expect(decision.fallbackOptions[0].selectedPath).toBe('fiat');
    });

    it('should select fiat path when crypto balance is insufficient', async () => {
      mockPaymentValidationService.validatePayment.mockResolvedValue({
        isValid: false,
        hasSufficientBalance: false,
        errors: ['Insufficient balance'],
        warnings: []
      });

      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [
          {
            id: 'stripe_card',
            type: 'card',
            provider: 'stripe',
            name: 'Stripe Card',
            isDefault: false,
            enabled: true,
            country: 'US',
            currency: 'USD',
            verificationStatus: 'verified',
            addedAt: new Date()
          }
        ],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      const decision = await hybridPaymentOrchestrator.determineOptimalPaymentPath(mockRequest);

      expect(decision.selectedPath).toBe('fiat');
      expect(decision.reason).toContain('insufficient crypto balance');
      expect(decision.method.type).toBe('fiat');
      expect(decision.method.provider).toBe('stripe');
    });

    it('should default to fiat on validation errors', async () => {
      mockPaymentValidationService.validatePayment.mockRejectedValue(new Error('Validation error'));
      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      const decision = await hybridPaymentOrchestrator.determineOptimalPaymentPath(mockRequest);

      expect(decision.selectedPath).toBe('fiat');
      expect(decision.reason).toContain('path determination error');
    });

    it('should calculate correct fees for crypto path', async () => {
      mockPaymentValidationService.validatePayment.mockResolvedValue({
        isValid: true,
        hasSufficientBalance: true,
        errors: [],
        warnings: [],
        estimatedFees: {
          processingFee: 0,
          platformFee: 0.5,
          gasFee: 0.02,
          totalFees: 0.52,
          currency: 'USDC'
        }
      });

      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      const request = { ...mockRequest, preferredMethod: 'crypto' as const };
      const decision = await hybridPaymentOrchestrator.determineOptimalPaymentPath(request);

      expect(decision.fees.totalFees).toBe(0.52);
      expect(decision.fees.currency).toBe('USDC');
      expect(decision.fees.gasFee).toBe(0.02);
    });

    it('should calculate correct fees for fiat path', async () => {
      mockPaymentValidationService.validatePayment.mockResolvedValue({
        isValid: false,
        hasSufficientBalance: false,
        errors: ['Insufficient balance'],
        warnings: []
      });

      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      const decision = await hybridPaymentOrchestrator.determineOptimalPaymentPath(mockRequest);

      expect(decision.selectedPath).toBe('fiat');
      expect(decision.fees.processingFee).toBe((100 * 0.029) + 0.30); // Stripe fee
      expect(decision.fees.platformFee).toBe(100 * 0.01); // 1% platform fee
      expect(decision.fees.currency).toBe('USD');
    });
  });

  describe('processHybridCheckout', () => {
    it('should process crypto checkout successfully', async () => {
      mockPaymentValidationService.validatePayment.mockResolvedValue({
        isValid: true,
        hasSufficientBalance: true,
        errors: [],
        warnings: [],
        estimatedFees: {
          processingFee: 0,
          platformFee: 0.5,
          gasFee: 0.01,
          totalFees: 0.51,
          currency: 'USDC'
        }
      });

      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      mockEscrowService.createEscrow.mockResolvedValue('1');

      const request = { ...mockRequest, preferredMethod: 'crypto' as const };
      const result = await hybridPaymentOrchestrator.processHybridCheckout(request);

      expect(result.paymentPath).toBe('crypto');
      expect(result.escrowType).toBe('smart_contract');
      expect(result.escrowId).toBe('1');
      expect(result.status).toBe('pending');
      expect(mockEscrowService.createEscrow).toHaveBeenCalled();
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledTimes(2);
    });

    it('should process fiat checkout successfully', async () => {
      mockPaymentValidationService.validatePayment.mockResolvedValue({
        isValid: false,
        hasSufficientBalance: false,
        errors: ['Insufficient balance'],
        warnings: []
      });

      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      const result = await hybridPaymentOrchestrator.processHybridCheckout(mockRequest);

      expect(result.paymentPath).toBe('fiat');
      expect(result.escrowType).toBe('stripe_connect');
      expect(result.stripePaymentIntentId).toBeDefined();
      expect(result.stripeTransferGroup).toBeDefined();
      expect(result.status).toBe('processing');
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledTimes(2);
    });

    it('should fallback to fiat when crypto fails', async () => {
      mockPaymentValidationService.validatePayment.mockResolvedValue({
        isValid: true,
        hasSufficientBalance: true,
        errors: [],
        warnings: []
      });

      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      mockEscrowService.createEscrow.mockRejectedValue(new Error('Escrow creation failed'));

      const request = { ...mockRequest, preferredMethod: 'crypto' as const };
      const result = await hybridPaymentOrchestrator.processHybridCheckout(request);

      expect(result.paymentPath).toBe('fiat');
      expect(result.escrowType).toBe('stripe_connect');
    });

    it('should create order record immediately for visibility', async () => {
      mockPaymentValidationService.validatePayment.mockResolvedValue({
        isValid: true,
        hasSufficientBalance: true,
        errors: [],
        warnings: []
      });

      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      mockEscrowService.createEscrow.mockResolvedValue('1');

      const request = { ...mockRequest, preferredMethod: 'crypto' as const };
      await hybridPaymentOrchestrator.processHybridCheckout(request);

      expect(mockDatabaseService.createOrder).toHaveBeenCalled();
      expect(mockDatabaseService.updateOrder).toHaveBeenCalled();
    });
  });

  describe('handleOrderFulfillment', () => {
    const mockOrder = {
      id: 1,
      paymentMethod: 'crypto',
      escrowId: 1,
      buyerId: 'buyer-id',
      sellerId: 'seller-id',
      stripePaymentIntentId: null,
      stripeTransferGroup: null
    };

    beforeEach(() => {
      mockDatabaseService.getOrderById.mockResolvedValue(mockOrder);
    });

    it('should handle crypto escrow delivery confirmation', async () => {
      await hybridPaymentOrchestrator.handleOrderFulfillment(
        '1',
        'confirm_delivery',
        { trackingNumber: 'TRACK123' }
      );

      expect(mockEscrowService.confirmDelivery).toHaveBeenCalledWith(
        '1',
        JSON.stringify({ trackingNumber: 'TRACK123' })
      );
      expect(mockDatabaseService.updateOrder).toHaveBeenCalledWith(1, { status: 'processing' });
    });

    it('should handle crypto escrow fund release', async () => {
      await hybridPaymentOrchestrator.handleOrderFulfillment(
        '1',
        'release_funds'
      );

      expect(mockEscrowService.approveEscrow).toHaveBeenCalledWith('1', 'buyer-id');
      expect(mockDatabaseService.updateOrder).toHaveBeenCalledWith(1, { status: 'completed' });
    });

    it('should handle crypto escrow disputes', async () => {
      await hybridPaymentOrchestrator.handleOrderFulfillment(
        '1',
        'dispute',
        { initiatorAddress: '0x123...', reason: 'Item not as described' }
      );

      expect(mockEscrowService.openDispute).toHaveBeenCalledWith(
        '1',
        '0x123...',
        'Item not as described'
      );
      expect(mockDatabaseService.updateOrder).toHaveBeenCalledWith(1, { status: 'disputed' });
    });

    it('should handle fiat escrow operations', async () => {
      const fiatOrder = {
        ...mockOrder,
        paymentMethod: 'fiat',
        escrowId: null,
        stripePaymentIntentId: 'pi_123'
      };
      mockDatabaseService.getOrderById.mockResolvedValue(fiatOrder);

      await hybridPaymentOrchestrator.handleOrderFulfillment(
        '1',
        'confirm_delivery',
        { trackingNumber: 'TRACK123' }
      );

      expect(mockDatabaseService.updateOrder).toHaveBeenCalledWith(1, { status: 'processing' });
    });

    it('should throw error for non-existent order', async () => {
      mockDatabaseService.getOrderById.mockResolvedValue(null);

      await expect(
        hybridPaymentOrchestrator.handleOrderFulfillment('999', 'confirm_delivery')
      ).rejects.toThrow('Order not found');
    });
  });

  describe('getUnifiedOrderStatus', () => {
    it('should return crypto escrow status', async () => {
      const mockOrder = {
        id: 1,
        paymentMethod: 'crypto',
        escrowId: 1,
        status: 'active'
      };

      mockDatabaseService.getOrderById.mockResolvedValue(mockOrder);
      mockEscrowService.getEscrowStatus.mockResolvedValue({
        id: '1',
        status: 'funded',
        buyerApproved: true,
        sellerApproved: true,
        disputeOpened: false,
        fundsLocked: true,
        deliveryConfirmed: false,
        createdAt: new Date()
      });

      const status = await hybridPaymentOrchestrator.getUnifiedOrderStatus('1');

      expect(status.paymentPath).toBe('crypto');
      expect(status.escrowStatus).toBeDefined();
      expect(status.canConfirmDelivery).toBe(true);
      expect(status.canReleaseFunds).toBe(false);
    });

    it('should return fiat payment status', async () => {
      const mockOrder = {
        id: 1,
        paymentMethod: 'fiat',
        escrowId: null,
        stripePaymentIntentId: 'pi_123',
        status: 'processing'
      };

      mockDatabaseService.getOrderById.mockResolvedValue(mockOrder);

      const status = await hybridPaymentOrchestrator.getUnifiedOrderStatus('1');

      expect(status.paymentPath).toBe('fiat');
      expect(status.stripeStatus).toBeDefined();
      expect(status.canConfirmDelivery).toBe(true);
      expect(status.canReleaseFunds).toBe(true);
    });

    it('should throw error for non-existent order', async () => {
      mockDatabaseService.getOrderById.mockResolvedValue(null);

      await expect(
        hybridPaymentOrchestrator.getUnifiedOrderStatus('999')
      ).rejects.toThrow('Order not found');
    });
  });

  describe('Error handling', () => {
    it('should handle escrow service errors gracefully', async () => {
      mockPaymentValidationService.validatePayment.mockResolvedValue({
        isValid: true,
        hasSufficientBalance: true,
        errors: [],
        warnings: []
      });

      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      mockEscrowService.createEscrow.mockRejectedValue(new Error('Contract error'));

      const request = { ...mockRequest, preferredMethod: 'crypto' as const };
      
      // Should fallback to fiat
      const result = await hybridPaymentOrchestrator.processHybridCheckout(request);
      expect(result.paymentPath).toBe('fiat');
    });

    it('should handle database errors', async () => {
      mockDatabaseService.createOrder.mockRejectedValue(new Error('Database error'));

      await expect(
        hybridPaymentOrchestrator.processHybridCheckout(mockRequest)
      ).rejects.toThrow();
    });

    it('should handle notification errors gracefully', async () => {
      mockNotificationService.sendOrderNotification.mockRejectedValue(new Error('Notification error'));
      
      mockPaymentValidationService.validatePayment.mockResolvedValue({
        isValid: false,
        hasSufficientBalance: false,
        errors: ['Insufficient balance'],
        warnings: []
      });

      mockFiatPaymentService.getAvailablePaymentMethods.mockResolvedValue({
        availableMethods: [],
        recommendedMethod: undefined,
        reasoning: [],
        restrictions: []
      });

      // Should still complete checkout even if notifications fail
      const result = await hybridPaymentOrchestrator.processHybridCheckout(mockRequest);
      expect(result.paymentPath).toBe('fiat');
    });
  });
});