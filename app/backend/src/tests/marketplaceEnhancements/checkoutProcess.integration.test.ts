import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db/connection';
import { products, sellers, users, orders, orderItems } from '../../db/schema';
import { jest } from '@jest/globals';

// Mock external services
jest.mock('../../services/paymentValidationService');
jest.mock('../../services/hybridPaymentOrchestrator');
jest.mock('../../services/orderCreationService');
jest.mock('stripe');

describe('Full Checkout Process Integration Tests', () => {
  let testUser: any;
  let testSeller: any;
  let testProduct: any;
  let authToken: string;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    // Clean up database
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(products);
    await db.delete(sellers);
    await db.delete(users);

    // Create test data
    const [user] = await db.insert(users).values({
      id: 'test-buyer-123',
      email: 'buyer@example.com',
      walletAddress: '0x1234567890123456789012345678901234567890',
      username: 'testbuyer',
      createdAt: new Date(),
    }).returning();
    testUser = user;

    const [seller] = await db.insert(sellers).values({
      id: 'test-seller-123',
      userId: 'seller-user-123',
      storeName: 'Test Store',
      walletAddress: '0x9876543210987654321098765432109876543210',
      createdAt: new Date(),
    }).returning();
    testSeller = seller;

    const [product] = await db.insert(products).values({
      id: 'test-product-123',
      title: 'Test Product',
      description: 'A test product for checkout',
      price: 99.99,
      currency: 'USD',
      sellerId: testSeller.id,
      status: 'published',
      inventory: 10,
      createdAt: new Date(),
    }).returning();
    testProduct = product;

    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Crypto Payment Checkout', () => {
    it('should complete full crypto checkout process', async () => {
      // Mock payment validation service
      const mockPaymentValidation = require('../../services/paymentValidationService');
      mockPaymentValidation.PaymentValidationService.prototype.validatePaymentMethod = jest.fn()
        .mockResolvedValue({
          isValid: true,
          hasSufficientBalance: true,
          errors: [],
          warnings: [],
          suggestedAlternatives: [],
        });

      // Mock hybrid payment orchestrator
      const mockPaymentOrchestrator = require('../../services/hybridPaymentOrchestrator');
      mockPaymentOrchestrator.HybridPaymentOrchestrator.prototype.processPayment = jest.fn()
        .mockResolvedValue({
          success: true,
          transactionHash: '0xabc123def456',
          paymentId: 'payment-123',
          status: 'confirmed',
        });

      // Mock order creation service
      const mockOrderService = require('../../services/orderCreationService');
      mockOrderService.OrderCreationService.prototype.createOrder = jest.fn()
        .mockResolvedValue({
          id: 'order-123',
          status: 'confirmed',
          createdAt: new Date(),
        });

      // Step 1: Validate payment method
      const paymentValidationData = {
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'crypto',
        userAddress: testUser.walletAddress,
        paymentDetails: {
          tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
          tokenSymbol: 'USDC',
        },
      };

      const validationResponse = await request(app)
        .post('/api/payments/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentValidationData)
        .expect(200);

      expect(validationResponse.body).toMatchObject({
        success: true,
        data: {
          isValid: true,
          hasSufficientBalance: true,
        },
      });

      // Step 2: Create checkout session
      const checkoutData = {
        productId: testProduct.id,
        quantity: 1,
        paymentMethod: 'crypto',
        paymentDetails: {
          tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
          tokenSymbol: 'USDC',
          amount: '99.99',
        },
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(checkoutResponse.body).toMatchObject({
        success: true,
        data: {
          sessionId: expect.any(String),
          paymentIntent: expect.any(String),
          totalAmount: 99.99,
          currency: 'USD',
        },
      });

      const sessionId = checkoutResponse.body.data.sessionId;

      // Step 3: Process payment
      const paymentData = {
        sessionId,
        transactionHash: '0xabc123def456',
        blockNumber: 12345678,
        gasUsed: '21000',
      };

      const paymentResponse = await request(app)
        .post('/api/checkout/process-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body).toMatchObject({
        success: true,
        data: {
          paymentStatus: 'confirmed',
          transactionHash: '0xabc123def456',
          orderId: 'order-123',
        },
      });

      // Step 4: Verify order was created
      const orderResponse = await request(app)
        .get(`/api/orders/order-123`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(orderResponse.body.data).toMatchObject({
        id: 'order-123',
        status: 'confirmed',
        paymentMethod: 'crypto',
        totalAmount: 99.99,
        buyer: {
          id: testUser.id,
        },
        seller: {
          id: testSeller.id,
        },
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: testProduct.id,
            quantity: 1,
            price: 99.99,
          }),
        ]),
      });

      // Step 5: Verify inventory was updated
      const productResponse = await request(app)
        .get(`/api/products/${testProduct.id}`)
        .expect(200);

      expect(productResponse.body.data.inventory).toBe(9); // Reduced by 1
    });

    it('should handle crypto payment with escrow protection', async () => {
      const mockPaymentValidation = require('../../services/paymentValidationService');
      mockPaymentValidation.PaymentValidationService.prototype.validatePaymentMethod = jest.fn()
        .mockResolvedValue({
          isValid: true,
          hasSufficientBalance: true,
          errors: [],
          warnings: [],
          suggestedAlternatives: [],
        });

      const mockPaymentOrchestrator = require('../../services/hybridPaymentOrchestrator');
      mockPaymentOrchestrator.HybridPaymentOrchestrator.prototype.processPayment = jest.fn()
        .mockResolvedValue({
          success: true,
          transactionHash: '0xescrow123',
          paymentId: 'escrow-payment-123',
          status: 'escrowed',
          escrowContractAddress: '0xEscrow123456789012345678901234567890',
        });

      const checkoutData = {
        productId: testProduct.id,
        quantity: 1,
        paymentMethod: 'escrow',
        paymentDetails: {
          tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
          tokenSymbol: 'USDC',
          amount: '99.99',
          escrowContractAddress: '0xEscrow123456789012345678901234567890',
        },
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(checkoutResponse.body.data.escrowProtected).toBe(true);

      const paymentData = {
        sessionId: checkoutResponse.body.data.sessionId,
        transactionHash: '0xescrow123',
        blockNumber: 12345678,
        gasUsed: '45000',
      };

      const paymentResponse = await request(app)
        .post('/api/checkout/process-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.data.paymentStatus).toBe('escrowed');
      expect(paymentResponse.body.data.escrowContractAddress).toBe('0xEscrow123456789012345678901234567890');
    });
  });

  describe('Fiat Payment Checkout', () => {
    it('should complete full fiat checkout process', async () => {
      // Mock Stripe
      const mockStripe = require('stripe');
      mockStripe.mockImplementation(() => ({
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: 'pi_1234567890',
            client_secret: 'pi_1234567890_secret_abc',
            status: 'requires_payment_method',
          }),
          confirm: jest.fn().mockResolvedValue({
            id: 'pi_1234567890',
            status: 'succeeded',
          }),
        },
        paymentMethods: {
          attach: jest.fn().mockResolvedValue({}),
        },
      }));

      const mockPaymentValidation = require('../../services/paymentValidationService');
      mockPaymentValidation.PaymentValidationService.prototype.validatePaymentMethod = jest.fn()
        .mockResolvedValue({
          isValid: true,
          hasSufficientBalance: true,
          errors: [],
          warnings: [],
          suggestedAlternatives: [],
        });

      const mockPaymentOrchestrator = require('../../services/hybridPaymentOrchestrator');
      mockPaymentOrchestrator.HybridPaymentOrchestrator.prototype.processPayment = jest.fn()
        .mockResolvedValue({
          success: true,
          paymentIntentId: 'pi_1234567890',
          paymentId: 'fiat-payment-123',
          status: 'succeeded',
        });

      // Step 1: Create fiat checkout session
      const checkoutData = {
        productId: testProduct.id,
        quantity: 1,
        paymentMethod: 'fiat',
        paymentDetails: {
          paymentMethodId: 'pm_1234567890',
          provider: 'stripe',
          currency: 'USD',
        },
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(checkoutResponse.body).toMatchObject({
        success: true,
        data: {
          sessionId: expect.any(String),
          paymentIntent: 'pi_1234567890',
          clientSecret: 'pi_1234567890_secret_abc',
          totalAmount: 99.99,
          currency: 'USD',
        },
      });

      // Step 2: Confirm payment
      const paymentData = {
        sessionId: checkoutResponse.body.data.sessionId,
        paymentIntentId: 'pi_1234567890',
        paymentMethodId: 'pm_1234567890',
      };

      const paymentResponse = await request(app)
        .post('/api/checkout/process-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body).toMatchObject({
        success: true,
        data: {
          paymentStatus: 'succeeded',
          paymentIntentId: 'pi_1234567890',
          orderId: expect.any(String),
        },
      });
    });

    it('should handle fiat payment failures gracefully', async () => {
      const mockStripe = require('stripe');
      mockStripe.mockImplementation(() => ({
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: 'pi_failed_123',
            client_secret: 'pi_failed_123_secret',
            status: 'requires_payment_method',
          }),
          confirm: jest.fn().mockRejectedValue({
            type: 'StripeCardError',
            code: 'card_declined',
            message: 'Your card was declined.',
          }),
        },
      }));

      const checkoutData = {
        productId: testProduct.id,
        quantity: 1,
        paymentMethod: 'fiat',
        paymentDetails: {
          paymentMethodId: 'pm_declined_card',
          provider: 'stripe',
          currency: 'USD',
        },
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      const paymentData = {
        sessionId: checkoutResponse.body.data.sessionId,
        paymentIntentId: 'pi_failed_123',
        paymentMethodId: 'pm_declined_card',
      };

      const paymentResponse = await request(app)
        .post('/api/checkout/process-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(paymentResponse.body).toMatchObject({
        success: false,
        error: 'Payment failed',
        details: expect.stringContaining('card was declined'),
      });

      // Verify no order was created
      const orders = await db.select().from(orders);
      expect(orders).toHaveLength(0);

      // Verify inventory was not affected
      const productResponse = await request(app)
        .get(`/api/products/${testProduct.id}`)
        .expect(200);

      expect(productResponse.body.data.inventory).toBe(10); // Unchanged
    });
  });

  describe('Order Tracking and Status Updates', () => {
    it('should track order through complete lifecycle', async () => {
      // Create a test order first
      const [order] = await db.insert(orders).values({
        id: 'track-order-123',
        buyerId: testUser.id,
        sellerId: testSeller.id,
        status: 'confirmed',
        totalAmount: 99.99,
        currency: 'USD',
        paymentMethod: 'crypto',
        createdAt: new Date(),
      }).returning();

      await db.insert(orderItems).values({
        id: 'item-123',
        orderId: order.id,
        productId: testProduct.id,
        quantity: 1,
        price: 99.99,
        createdAt: new Date(),
      });

      // Step 1: Check initial order status
      const initialStatusResponse = await request(app)
        .get(`/api/orders/${order.id}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(initialStatusResponse.body.data).toMatchObject({
        id: order.id,
        status: 'confirmed',
        trackingNumber: null,
        estimatedDelivery: null,
      });

      // Step 2: Update to processing
      const processingUpdate = await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'processing',
          note: 'Order is being prepared',
        })
        .expect(200);

      expect(processingUpdate.body.data.status).toBe('processing');

      // Step 3: Add tracking information
      const trackingUpdate = await request(app)
        .put(`/api/orders/${order.id}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: 'TRACK123456789',
          carrier: 'UPS',
          estimatedDelivery: '2024-01-15T00:00:00.000Z',
        })
        .expect(200);

      expect(trackingUpdate.body.data).toMatchObject({
        trackingNumber: 'TRACK123456789',
        carrier: 'UPS',
        estimatedDelivery: '2024-01-15T00:00:00.000Z',
      });

      // Step 4: Update to shipped
      const shippedUpdate = await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'shipped',
          note: 'Package has been shipped',
        })
        .expect(200);

      expect(shippedUpdate.body.data.status).toBe('shipped');

      // Step 5: Update to delivered
      const deliveredUpdate = await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'delivered',
          note: 'Package delivered successfully',
        })
        .expect(200);

      expect(deliveredUpdate.body.data.status).toBe('delivered');

      // Step 6: Verify complete status history
      const finalStatusResponse = await request(app)
        .get(`/api/orders/${order.id}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalStatusResponse.body.data.statusHistory).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'confirmed' }),
          expect.objectContaining({ status: 'processing' }),
          expect.objectContaining({ status: 'shipped' }),
          expect.objectContaining({ status: 'delivered' }),
        ])
      );
    });

    it('should prevent invalid status transitions', async () => {
      const [order] = await db.insert(orders).values({
        id: 'invalid-transition-order',
        buyerId: testUser.id,
        sellerId: testSeller.id,
        status: 'delivered',
        totalAmount: 99.99,
        currency: 'USD',
        paymentMethod: 'crypto',
        createdAt: new Date(),
      }).returning();

      // Try to move from delivered back to processing (invalid)
      const invalidUpdate = await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'processing',
          note: 'Invalid transition attempt',
        })
        .expect(400);

      expect(invalidUpdate.body).toMatchObject({
        success: false,
        error: 'Invalid status transition',
        details: expect.stringContaining('Cannot transition from delivered to processing'),
      });
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle payment timeout gracefully', async () => {
      const mockPaymentOrchestrator = require('../../services/hybridPaymentOrchestrator');
      mockPaymentOrchestrator.HybridPaymentOrchestrator.prototype.processPayment = jest.fn()
        .mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Payment timeout')), 100)
          )
        );

      const checkoutData = {
        productId: testProduct.id,
        quantity: 1,
        paymentMethod: 'crypto',
        paymentDetails: {
          tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
          tokenSymbol: 'USDC',
          amount: '99.99',
        },
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      const paymentData = {
        sessionId: checkoutResponse.body.data.sessionId,
        transactionHash: '0xtimeout123',
        blockNumber: 12345678,
        gasUsed: '21000',
      };

      const paymentResponse = await request(app)
        .post('/api/checkout/process-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(408);

      expect(paymentResponse.body).toMatchObject({
        success: false,
        error: 'Payment processing timeout',
        retryable: true,
      });
    });

    it('should handle insufficient inventory during checkout', async () => {
      // Update product to have only 1 item in stock
      await db.update(products)
        .set({ inventory: 1 })
        .where(eq(products.id, testProduct.id));

      const checkoutData = {
        productId: testProduct.id,
        quantity: 5, // More than available
        paymentMethod: 'crypto',
        paymentDetails: {
          tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
          tokenSymbol: 'USDC',
          amount: '499.95',
        },
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);

      expect(checkoutResponse.body).toMatchObject({
        success: false,
        error: 'Insufficient inventory',
        details: expect.stringContaining('Only 1 items available'),
        availableQuantity: 1,
      });
    });

    it('should handle concurrent checkout attempts', async () => {
      // Update product to have only 1 item in stock
      await db.update(products)
        .set({ inventory: 1 })
        .where(eq(products.id, testProduct.id));

      const checkoutData = {
        productId: testProduct.id,
        quantity: 1,
        paymentMethod: 'crypto',
        paymentDetails: {
          tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
          tokenSymbol: 'USDC',
          amount: '99.99',
        },
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
      };

      // Simulate concurrent checkout attempts
      const checkoutPromises = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/checkout/create-session')
          .set('Authorization', `Bearer ${authToken}`)
          .send(checkoutData)
      );

      const results = await Promise.allSettled(checkoutPromises);
      
      // Only one should succeed
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = results.filter(r => r.status === 'fulfilled' && r.value.status === 400);

      expect(successful.length).toBe(1);
      expect(failed.length).toBe(2);
    });
  });
});