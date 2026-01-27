import { DatabaseService } from '../services/databaseService';
import { HybridPaymentOrchestrator } from '../services/hybridPaymentOrchestrator';
import { EnhancedEscrowService } from '../services/enhancedEscrowService';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Checkout Process Tests', () => {
  let databaseService: DatabaseService;
  let paymentOrchestrator: HybridPaymentOrchestrator;
  let escrowService: EnhancedEscrowService;

  beforeEach(() => {
    databaseService = new DatabaseService();
    paymentOrchestrator = new HybridPaymentOrchestrator();
    escrowService = new EnhancedEscrowService(
      'https://eth-sepolia.g.alchemy.com/v2/test',
      '0x1234567890123456789012345678901234567890',
      '0x1234567890123456789012345678901234567890'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inventory Management', () => {
    it('should create order with inventory hold', async () => {
      const mockListingId = 'test-listing-123';
      const mockBuyerId = 'buyer-123';
      const mockSellerId = 'seller-123';
      const mockAmount = '100';
      const mockPaymentToken = 'USDC';

      // Mock database transaction
      const mockTransaction = jest.fn().mockImplementation(async (callback: Function) => {
        return await callback({
          select: jest.fn().mockReturnValue([
            { id: '1', inventory: 10, inventoryHolds: 0 }
          ]),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'hold-123' }])
            })
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ id: '1' }])
            })
          })
        });
      });

      databaseService.db = { transaction: mockTransaction } as any;

      const order = await databaseService.createOrder(
        mockListingId,
        mockBuyerId,
        mockSellerId,
        mockAmount,
        mockPaymentToken
      );

      expect(order).toBeDefined();
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should release expired inventory holds', async () => {
      const mockExpiredHolds = [
        {
          id: 'hold-1',
          productId: 'product-1',
          quantity: 1,
          status: 'active',
          expiresAt: new Date(Date.now() - 10000) // 10 seconds ago
        }
      ];

      jest.spyOn(databaseService.db, 'select').mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn<() => any>().mockResolvedValue(mockExpiredHolds)
        })
      } as any);

      jest.spyOn(databaseService, 'releaseExpiredInventory').mockResolvedValue(1);

      const releasedCount = await databaseService.releaseExpiredInventory();

      expect(releasedCount).toBe(1);
    });

    it('should check available inventory', async () => {
      const mockProduct = {
        inventory: 5,
        inventoryHolds: 2
      };

      jest.spyOn(databaseService.db, 'select').mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn<() => any>().mockResolvedValue([mockProduct])
        })
      } as any);

      const inventory = await databaseService.checkAvailableInventory('product-123');

      expect(inventory.available).toBe(5);
      expect(inventory.held).toBe(2);
      expect(inventory.total).toBe(7);
    });
  });

  describe('Payment Path Selection', () => {
    it('should recommend crypto for low amounts and low gas', async () => {
      const request = {
        orderId: 'order-123',
        listingId: 'listing-123',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        amount: 25, // Low amount
        currency: 'USD',
        preferredMethod: 'auto' as const
      };

      const decision = await paymentOrchestrator.determineOptimalPaymentPath(request);

      expect(decision.selectedPath).toBe('crypto');
      expect(decision.fees).toBeDefined();
      expect(decision.estimatedTime).toBe('1-5 minutes');
    });

    it('should recommend fiat for high amounts', async () => {
      const request = {
        orderId: 'order-123',
        listingId: 'listing-123',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        amount: 500, // High amount
        currency: 'USD',
        preferredMethod: 'auto' as const
      };

      const decision = await paymentOrchestrator.determineOptimalPaymentPath(request);

      expect(decision.selectedPath).toBe('fiat');
      expect(decision.method.provider).toBe('stripe');
    });

    it('should respect user preference for crypto', async () => {
      const request = {
        orderId: 'order-123',
        listingId: 'listing-123',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        amount: 100,
        currency: 'USD',
        preferredMethod: 'crypto' as const
      };

      const decision = await paymentOrchestrator.determineOptimalPaymentPath(request);

      expect(decision.selectedPath).toBe('crypto');
    });
  });

  describe('Stripe Integration', () => {
    it('should create Stripe payment intent', async () => {
      const request = {
        orderId: 'order-123',
        listingId: 'listing-123',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        amount: 100,
        currency: 'USD'
      };

      const pathDecision = {
        selectedPath: 'fiat' as const,
        reason: 'User requested fiat payment',
        method: {
          type: 'fiat' as const,
          provider: 'stripe'
        },
        fees: {
          processingFee: 2.90,
          platformFee: 1.00,
          totalFees: 4.30,
          currency: 'USD'
        },
        estimatedTime: '2-5 business days',
        fallbackOptions: []
      };

      // Mock Stripe payment intent creation
      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_test',
        amount: 14300, // $143.00 in cents
        currency: 'usd'
      };

      jest.spyOn(paymentOrchestrator as any, 'createStripeConnectEscrow')
        .mockResolvedValue({
          paymentIntentId: mockPaymentIntent.id,
          transferGroup: 'order_order-123',
          sellerAccountId: 'acct_test',
          clientSecret: mockPaymentIntent.client_secret
        });

      const result = await (paymentOrchestrator as any).processFiatEscrowPath(request, pathDecision, null);

      expect(result.paymentPath).toBe('fiat');
      expect(result.stripePaymentIntentId).toBe(mockPaymentIntent.id);
      expect(result.status).toBe('processing');
    });

    it('should capture Stripe payment after delivery', async () => {
      const paymentIntentId = 'pi_test_123';
      const orderId = 'order-123';

      // Mock Stripe capture
      const mockCapturedIntent = {
        id: paymentIntentId,
        amount: 14300,
        currency: 'usd',
        status: 'succeeded'
      };

      jest.spyOn(paymentOrchestrator as any, 'captureStripePayment')
        .mockResolvedValue({
          captured: true,
          amount: 143,
          currency: 'USD',
          transferId: 'tr_test_123'
        });

      const result = await paymentOrchestrator.captureStripePayment(paymentIntentId, orderId);

      expect(result.captured).toBe(true);
      expect(result.amount).toBe(143);
      expect(result.transferId).toBe('tr_test_123');
    });

    it('should refund Stripe payment', async () => {
      const paymentIntentId = 'pi_test_123';
      const orderId = 'order-123';

      jest.spyOn(paymentOrchestrator as any, 'refundStripePayment')
        .mockResolvedValue({
          refunded: true,
          amount: 143,
          currency: 'USD',
          refundId: 're_test_123'
        });

      const result = await paymentOrchestrator.refundStripePayment(paymentIntentId, orderId, 'Customer request');

      expect(result.refunded).toBe(true);
      expect(result.refundId).toBe('re_test_123');
    });
  });

  describe('Crypto Escrow Validation', () => {
    it('should validate escrow creation with sufficient balance', async () => {
      const request = {
        listingId: 'listing-123',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8', // USDC
        amount: '100'
      };

      // Mock successful balance check
      jest.spyOn(escrowService['paymentValidationService'], 'checkCryptoBalance')
        .mockResolvedValue({
          hasSufficientBalance: true,
          balance: {
            tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8',
            tokenSymbol: 'USDC',
            balance: '150000000', // 150 USDC
            balanceFormatted: '150.0',
            decimals: 6
          },
          gasBalance: {
            tokenAddress: '0x0000000000000000000000000000000000000000',
            tokenSymbol: 'ETH',
            balance: '100000000000000000', // 0.1 ETH
            balanceFormatted: '0.1',
            decimals: 18
          }
        });

      // Mock gas estimation
      jest.spyOn(escrowService['provider'], 'getFeeData')
        .mockResolvedValue({
          gasPrice: BigInt('20000000000'), // 20 gwei
          maxFeePerGas: BigInt('30000000000'), // 30 gwei
          maxPriorityFeePerGas: BigInt('2000000000') // 2 gwei
        } as any);

      const validation = await escrowService.validateEscrowCreation(request);

      expect(validation.isValid).toBe(true);
      expect(validation.hasSufficientBalance).toBe(true);
      expect(validation.estimatedGasFee).toBeDefined();
    });

    it('should reject escrow creation with insufficient balance', async () => {
      const request = {
        listingId: 'listing-123',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8', // USDC
        amount: '100'
      };

      // Mock insufficient balance
      jest.spyOn(escrowService['paymentValidationService'], 'checkCryptoBalance')
        .mockResolvedValue({
          hasSufficientBalance: false,
          balance: {
            tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8',
            tokenSymbol: 'USDC',
            balance: '50000000', // 50 USDC
            balanceFormatted: '50.0',
            decimals: 6
          }
        });

      const validation = await escrowService.validateEscrowCreation(request);

      expect(validation.isValid).toBe(false);
      expect(validation.hasSufficientBalance).toBe(false);
      expect(validation.errors).toContain('Insufficient balance');
    });

    it('should verify blockchain transaction', async () => {
      const escrowId = 'escrow-123';
      const transactionHash = '0x1234567890abcdef';

      // Mock successful transaction receipt
      const mockReceipt = {
        status: 1,
        blockNumber: 12345,
        blockHash: '0xabcdef123456789',
        gasUsed: BigInt('150000'),
        effectiveGasPrice: BigInt('20000000000'),
        to: '0x1234567890123456789012345678901234567890',
        logs: [
          {
            topics: ['0x1234567890abcdef'], // EscrowCreated event topic
            data: '0x1234567890abcdef'
          }
        ]
      };

      jest.spyOn(escrowService['provider'], 'getTransactionReceipt')
        .mockResolvedValue(mockReceipt as any);

      jest.spyOn(escrowService['provider'], 'getTransaction')
        .mockResolvedValue({
          to: '0x1234567890123456789012345678901234567890'
        } as any);

      const result = await escrowService.verifyEscrowTransaction(escrowId, transactionHash);

      expect(result.verified).toBe(true);
      expect(result.status).toBe('confirmed');
      expect(result.blockNumber).toBe(12345);
    });
  });

  describe('Order Fulfillment', () => {
    it('should handle order fulfillment actions', async () => {
      const orderId = 'order-123';
      const action = 'confirm_delivery';
      const metadata = {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS'
      };

      jest.spyOn(paymentOrchestrator, 'handleOrderFulfillment')
        .mockResolvedValue();

      await paymentOrchestrator.handleOrderFulfillment(orderId, action, metadata);

      expect(paymentOrchestrator.handleOrderFulfillment).toHaveBeenCalledWith(
        orderId,
        action,
        metadata
      );
    });

    it('should get unified order status', async () => {
      const orderId = 'order-123';

      const mockOrder = {
        id: orderId,
        status: 'processing',
        paymentMethod: 'crypto',
        escrowId: 'escrow-123',
        buyerId: 'buyer-123'
      };

      jest.spyOn(databaseService, 'getOrderById')
        .mockResolvedValue(mockOrder as any);

      jest.spyOn(escrowService, 'getEscrowStatus')
        .mockResolvedValue({
          id: 'escrow-123',
          status: 'funded',
          buyerApproved: false,
          sellerApproved: false,
          disputeOpened: false,
          fundsLocked: true,
          deliveryConfirmed: false,
          createdAt: new Date()
        });

      const status = await paymentOrchestrator.getUnifiedOrderStatus(orderId);

      expect(status.orderId).toBe(orderId);
      expect(status.status).toBe('processing');
      expect(status.paymentPath).toBe('crypto');
      expect(status.canConfirmDelivery).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      const request = {
        orderId: 'order-123',
        listingId: 'listing-123',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        amount: 100,
        currency: 'USD'
      };

      const pathDecision = {
        selectedPath: 'fiat' as const,
        reason: 'User requested fiat payment',
        method: {
          type: 'fiat' as const,
          provider: 'stripe'
        },
        fees: {
          processingFee: 2.90,
          platformFee: 1.00,
          totalFees: 4.30,
          currency: 'USD'
        },
        estimatedTime: '2-5 business days',
        fallbackOptions: []
      };

      // Mock Stripe error
      jest.spyOn(paymentOrchestrator as any, 'createStripeConnectEscrow')
        .mockRejectedValue(new Error('Stripe API key is invalid'));

      await expect((paymentOrchestrator as any).processFiatEscrowPath(request, pathDecision, null))
        .rejects.toThrow('Stripe API key is invalid');
    });

    it('should handle blockchain network errors', async () => {
      const request = {
        listingId: 'listing-123',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8',
        amount: '100'
      };

      // Mock network error
      jest.spyOn(escrowService['provider'], 'getNetwork')
        .mockRejectedValue(new Error('Network connection failed'));

      const validation = await escrowService.validateEscrowCreation(request);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Failed to connect to blockchain network');
    });
  });
});