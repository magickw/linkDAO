import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db/connection';
import { products, sellers, users, orders, orderItems, reviews } from '../../db/schema';
import { jest } from '@jest/globals';

// Mock external services for user acceptance testing
jest.mock('../../services/notificationService');
jest.mock('../../services/emailService');

describe('User Acceptance Testing - Marketplace Workflows', () => {
  let testBuyer: any;
  let testSeller: any;
  let testProduct: any;
  let buyerToken: string;
  let sellerToken: string;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    // Clean up database
    await db.delete(reviews);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(products);
    await db.delete(sellers);
    await db.delete(users);

    // Create test buyer
    const [buyer] = await db.insert(users).values({
      id: 'test-buyer-456',
      email: 'buyer@example.com',
      walletAddress: '0x1111111111111111111111111111111111111111',
      username: 'testbuyer',
      createdAt: new Date(),
    }).returning();
    testBuyer = buyer;

    // Create test seller user
    const [sellerUser] = await db.insert(users).values({
      id: 'test-seller-user-456',
      email: 'seller@example.com',
      walletAddress: '0x2222222222222222222222222222222222222222',
      username: 'testseller',
      createdAt: new Date(),
    }).returning();

    // Create test seller profile
    const [seller] = await db.insert(sellers).values({
      id: 'test-seller-456',
      userId: sellerUser.id,
      storeName: 'Test Seller Store',
      description: 'A test seller store',
      walletAddress: sellerUser.walletAddress,
      createdAt: new Date(),
    }).returning();
    testSeller = seller;

    // Create test product
    const [product] = await db.insert(products).values({
      id: 'test-product-456',
      title: 'User Acceptance Test Product',
      description: 'A product for user acceptance testing',
      price: 149.99,
      currency: 'USD',
      sellerId: testSeller.id,
      status: 'published',
      inventory: 5,
      createdAt: new Date(),
    }).returning();
    testProduct = product;

    buyerToken = 'buyer-jwt-token';
    sellerToken = 'seller-jwt-token';
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Seller Profile Management Workflow', () => {
    it('should allow seller to complete profile setup and management', async () => {
      // Mock notification service
      const mockNotificationService = require('../../services/notificationService');
      mockNotificationService.NotificationService.prototype.sendProfileUpdateNotification = jest.fn()
        .mockResolvedValue({ success: true });

      // Step 1: Seller views their current profile
      const initialProfileResponse = await request(app)
        .get(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(initialProfileResponse.body.data).toMatchObject({
        id: testSeller.id,
        storeName: 'Test Seller Store',
        description: 'A test seller store',
      });

      // Step 2: Seller updates profile information
      const profileUpdateData = {
        storeName: 'Updated Test Store',
        description: 'An updated description with more details',
        websiteUrl: 'https://updatedstore.com',
        socialHandles: {
          twitter: '@updatedstore',
          discord: 'updatedstore#1234',
        },
        businessHours: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '09:00', close: '17:00' },
          wednesday: { open: '09:00', close: '17:00' },
          thursday: { open: '09:00', close: '17:00' },
          friday: { open: '09:00', close: '17:00' },
          saturday: { closed: true },
          sunday: { closed: true },
        },
      };

      const updateResponse = await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(profileUpdateData)
        .expect(200);

      expect(updateResponse.body.data).toMatchObject({
        storeName: 'Updated Test Store',
        description: 'An updated description with more details',
        websiteUrl: 'https://updatedstore.com',
        socialHandles: {
          twitter: '@updatedstore',
          discord: 'updatedstore#1234',
        },
      });

      // Step 3: Verify profile changes are visible to buyers
      const publicProfileResponse = await request(app)
        .get(`/api/sellers/${testSeller.id}/public`)
        .expect(200);

      expect(publicProfileResponse.body.data).toMatchObject({
        storeName: 'Updated Test Store',
        description: 'An updated description with more details',
        websiteUrl: 'https://updatedstore.com',
      });

      // Step 4: Seller views profile analytics
      const analyticsResponse = await request(app)
        .get(`/api/sellers/${testSeller.id}/analytics`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(analyticsResponse.body.data).toMatchObject({
        profileViews: expect.any(Number),
        profileCompleteness: expect.objectContaining({
          score: expect.any(Number),
          missingFields: expect.any(Array),
        }),
      });
    });

    it('should handle profile validation errors gracefully', async () => {
      const invalidProfileData = {
        storeName: '', // Required field
        websiteUrl: 'not-a-valid-url',
        socialHandles: {
          twitter: 'invalid-handle-format',
        },
      };

      const response = await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(invalidProfileData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.stringContaining('Store name is required'),
          expect.stringContaining('Invalid website URL'),
          expect.stringContaining('Invalid Twitter handle'),
        ]),
      });
    });
  });

  describe('Listing Creation and Visibility Workflow', () => {
    it('should allow seller to create listing and verify buyer visibility', async () => {
      // Step 1: Seller creates a new listing
      const listingData = {
        title: 'New User Acceptance Product',
        description: 'A product created during user acceptance testing',
        price: 79.99,
        currency: 'USD',
        category: 'Electronics',
        tags: ['test', 'electronics', 'gadget'],
        inventory: {
          quantity: 15,
          trackInventory: true,
        },
        shipping: {
          weight: 1.2,
          dimensions: { length: 15, width: 10, height: 5 },
          shippingClass: 'standard',
        },
        images: [],
        escrowEnabled: true,
      };

      const createResponse = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(listingData)
        .expect(201);

      expect(createResponse.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          title: 'New User Acceptance Product',
          price: 79.99,
          status: 'published',
          sellerId: testSeller.id,
        },
      });

      const newListingId = createResponse.body.data.id;

      // Step 2: Verify listing appears in marketplace for buyers
      const marketplaceResponse = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      const createdListing = marketplaceResponse.body.data.listings.find(
        (listing: any) => listing.id === newListingId
      );

      expect(createdListing).toBeDefined();
      expect(createdListing).toMatchObject({
        title: 'New User Acceptance Product',
        price: 79.99,
        seller: {
          id: testSeller.id,
          storeName: expect.any(String),
        },
      });

      // Step 3: Buyer views listing details
      const listingDetailResponse = await request(app)
        .get(`/api/listings/${newListingId}`)
        .expect(200);

      expect(listingDetailResponse.body.data).toMatchObject({
        title: 'New User Acceptance Product',
        description: 'A product created during user acceptance testing',
        price: 79.99,
        escrowEnabled: true,
        inventory: {
          quantity: 15,
          trackInventory: true,
        },
        seller: {
          id: testSeller.id,
          storeName: expect.any(String),
        },
      });

      // Step 4: Seller can edit the listing
      const updateData = {
        title: 'Updated User Acceptance Product',
        price: 89.99,
        description: 'Updated description with more details',
      };

      const updateResponse = await request(app)
        .put(`/api/listings/${newListingId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data).toMatchObject({
        title: 'Updated User Acceptance Product',
        price: 89.99,
        description: 'Updated description with more details',
      });

      // Step 5: Verify updates are immediately visible to buyers
      const updatedDetailResponse = await request(app)
        .get(`/api/listings/${newListingId}`)
        .expect(200);

      expect(updatedDetailResponse.body.data).toMatchObject({
        title: 'Updated User Acceptance Product',
        price: 89.99,
      });
    });

    it('should handle listing creation with validation errors', async () => {
      const invalidListingData = {
        title: '', // Required
        price: -10, // Invalid
        currency: 'INVALID', // Invalid currency
        category: '', // Required
      };

      const response = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(invalidListingData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.stringContaining('Title is required'),
          expect.stringContaining('Price must be greater than zero'),
          expect.stringContaining('Invalid currency'),
          expect.stringContaining('Category is required'),
        ]),
      });
    });
  });

  describe('Buyer Checkout and Order Tracking Experience', () => {
    it('should provide complete buyer checkout and tracking experience', async () => {
      // Mock services for checkout
      const mockNotificationService = require('../../services/notificationService');
      mockNotificationService.NotificationService.prototype.sendOrderConfirmation = jest.fn()
        .mockResolvedValue({ success: true });
      mockNotificationService.NotificationService.prototype.sendOrderStatusUpdate = jest.fn()
        .mockResolvedValue({ success: true });

      // Step 1: Buyer browses marketplace and finds product
      const browseResponse = await request(app)
        .get('/api/marketplace/listings')
        .query({ category: 'Electronics', minPrice: 100, maxPrice: 200 })
        .expect(200);

      const targetProduct = browseResponse.body.data.listings.find(
        (listing: any) => listing.id === testProduct.id
      );

      expect(targetProduct).toBeDefined();

      // Step 2: Buyer views product details
      const productDetailResponse = await request(app)
        .get(`/api/listings/${testProduct.id}`)
        .expect(200);

      expect(productDetailResponse.body.data).toMatchObject({
        title: 'User Acceptance Test Product',
        price: 149.99,
        inventory: expect.objectContaining({
          quantity: expect.any(Number),
        }),
      });

      // Step 3: Buyer initiates checkout
      const checkoutData = {
        productId: testProduct.id,
        quantity: 2,
        paymentMethod: 'fiat',
        paymentDetails: {
          paymentMethodId: 'pm_test_card',
          provider: 'stripe',
          currency: 'USD',
        },
        shippingAddress: {
          street: '456 Buyer Street',
          city: 'Buyer City',
          state: 'BC',
          zipCode: '12345',
          country: 'US',
        },
        contactInfo: {
          email: testBuyer.email,
          phone: '+1-555-0123',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(checkoutData)
        .expect(201);

      expect(checkoutResponse.body).toMatchObject({
        success: true,
        data: {
          sessionId: expect.any(String),
          totalAmount: 299.98, // 2 * 149.99
          currency: 'USD',
          estimatedTax: expect.any(Number),
          estimatedShipping: expect.any(Number),
        },
      });

      // Step 4: Buyer completes payment (simulated)
      const paymentData = {
        sessionId: checkoutResponse.body.data.sessionId,
        paymentIntentId: 'pi_test_success',
        paymentMethodId: 'pm_test_card',
      };

      const paymentResponse = await request(app)
        .post('/api/checkout/process-payment')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body).toMatchObject({
        success: true,
        data: {
          paymentStatus: 'succeeded',
          orderId: expect.any(String),
        },
      });

      const orderId = paymentResponse.body.data.orderId;

      // Step 5: Buyer views order confirmation
      const orderResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(orderResponse.body.data).toMatchObject({
        id: orderId,
        status: 'confirmed',
        totalAmount: 299.98,
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: testProduct.id,
            quantity: 2,
            price: 149.99,
          }),
        ]),
        shippingAddress: expect.objectContaining({
          street: '456 Buyer Street',
          city: 'Buyer City',
        }),
      });

      // Step 6: Seller processes order and updates status
      const sellerOrderUpdate = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          status: 'processing',
          note: 'Order is being prepared for shipment',
        })
        .expect(200);

      expect(sellerOrderUpdate.body.data.status).toBe('processing');

      // Step 7: Seller adds tracking information
      const trackingUpdate = await request(app)
        .put(`/api/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          trackingNumber: 'UA123456789',
          carrier: 'FedEx',
          estimatedDelivery: '2024-01-20T00:00:00.000Z',
        })
        .expect(200);

      expect(trackingUpdate.body.data).toMatchObject({
        trackingNumber: 'UA123456789',
        carrier: 'FedEx',
      });

      // Step 8: Buyer tracks order progress
      const trackingResponse = await request(app)
        .get(`/api/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(trackingResponse.body.data).toMatchObject({
        id: orderId,
        status: 'processing',
        trackingNumber: 'UA123456789',
        carrier: 'FedEx',
        estimatedDelivery: '2024-01-20T00:00:00.000Z',
        statusHistory: expect.arrayContaining([
          expect.objectContaining({ status: 'confirmed' }),
          expect.objectContaining({ status: 'processing' }),
        ]),
      });

      // Step 9: Order is shipped
      const shippedUpdate = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          status: 'shipped',
          note: 'Package has been shipped via FedEx',
        })
        .expect(200);

      expect(shippedUpdate.body.data.status).toBe('shipped');

      // Step 10: Order is delivered
      const deliveredUpdate = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          status: 'delivered',
          note: 'Package delivered successfully',
        })
        .expect(200);

      expect(deliveredUpdate.body.data.status).toBe('delivered');

      // Step 11: Buyer leaves a review
      const reviewData = {
        orderId,
        productId: testProduct.id,
        sellerId: testSeller.id,
        rating: 5,
        title: 'Excellent product and service!',
        comment: 'The product arrived quickly and exactly as described. Great seller!',
        wouldRecommend: true,
      };

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData)
        .expect(201);

      expect(reviewResponse.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          rating: 5,
          title: 'Excellent product and service!',
          verified: true, // Because it's from a completed order
        },
      });

      // Step 12: Review appears on product page
      const productWithReviewsResponse = await request(app)
        .get(`/api/listings/${testProduct.id}`)
        .expect(200);

      expect(productWithReviewsResponse.body.data.reviews).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rating: 5,
            title: 'Excellent product and service!',
            verified: true,
          }),
        ])
      );
    });
  });

  describe('Error Scenarios and Recovery Flows', () => {
    it('should handle payment failure and provide recovery options', async () => {
      const checkoutData = {
        productId: testProduct.id,
        quantity: 1,
        paymentMethod: 'fiat',
        paymentDetails: {
          paymentMethodId: 'pm_card_declined',
          provider: 'stripe',
          currency: 'USD',
        },
        shippingAddress: {
          street: '789 Error Street',
          city: 'Error City',
          state: 'EC',
          zipCode: '99999',
          country: 'US',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(checkoutData)
        .expect(201);

      const paymentData = {
        sessionId: checkoutResponse.body.data.sessionId,
        paymentIntentId: 'pi_card_declined',
        paymentMethodId: 'pm_card_declined',
      };

      const paymentResponse = await request(app)
        .post('/api/checkout/process-payment')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(paymentData)
        .expect(400);

      expect(paymentResponse.body).toMatchObject({
        success: false,
        error: 'Payment failed',
        retryable: true,
        suggestedActions: expect.arrayContaining([
          expect.stringContaining('Try a different payment method'),
          expect.stringContaining('Contact your bank'),
        ]),
      });

      // Verify session is still valid for retry
      const sessionResponse = await request(app)
        .get(`/api/checkout/session/${checkoutResponse.body.data.sessionId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(sessionResponse.body.data.status).toBe('payment_failed');
      expect(sessionResponse.body.data.retryable).toBe(true);
    });

    it('should handle inventory conflicts during checkout', async () => {
      // Update product to have limited inventory
      await db.update(products)
        .set({ inventory: 1 })
        .where(eq(products.id, testProduct.id));

      const checkoutData = {
        productId: testProduct.id,
        quantity: 3, // More than available
        paymentMethod: 'fiat',
        paymentDetails: {
          paymentMethodId: 'pm_test_card',
          provider: 'stripe',
          currency: 'USD',
        },
        shippingAddress: {
          street: '123 Inventory Street',
          city: 'Inventory City',
          state: 'IC',
          zipCode: '11111',
          country: 'US',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(checkoutData)
        .expect(400);

      expect(checkoutResponse.body).toMatchObject({
        success: false,
        error: 'Insufficient inventory',
        availableQuantity: 1,
        suggestedActions: expect.arrayContaining([
          expect.stringContaining('Reduce quantity to 1'),
          expect.stringContaining('Check back later'),
        ]),
      });
    });

    it('should handle seller account issues gracefully', async () => {
      // Simulate seller account being temporarily suspended
      await db.update(sellers)
        .set({ status: 'suspended' })
        .where(eq(sellers.id, testSeller.id));

      const checkoutData = {
        productId: testProduct.id,
        quantity: 1,
        paymentMethod: 'fiat',
        paymentDetails: {
          paymentMethodId: 'pm_test_card',
          provider: 'stripe',
          currency: 'USD',
        },
        shippingAddress: {
          street: '456 Suspended Street',
          city: 'Suspended City',
          state: 'SC',
          zipCode: '22222',
          country: 'US',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(checkoutData)
        .expect(400);

      expect(checkoutResponse.body).toMatchObject({
        success: false,
        error: 'Seller account unavailable',
        details: expect.stringContaining('temporarily unavailable'),
        suggestedActions: expect.arrayContaining([
          expect.stringContaining('Try again later'),
          expect.stringContaining('Contact support'),
        ]),
      });
    });
  });

  describe('User Experience and Accessibility', () => {
    it('should provide helpful error messages and guidance', async () => {
      // Test various validation scenarios with user-friendly messages
      const testCases = [
        {
          data: { title: '' },
          expectedError: 'Please enter a product title',
        },
        {
          data: { title: 'Valid Title', price: 'not-a-number' },
          expectedError: 'Please enter a valid price',
        },
        {
          data: { title: 'Valid Title', price: 10, category: '' },
          expectedError: 'Please select a category',
        },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/listings')
          .set('Authorization', `Bearer ${sellerToken}`)
          .send(testCase.data)
          .expect(400);

        expect(response.body.details).toEqual(
          expect.arrayContaining([
            expect.stringContaining(testCase.expectedError),
          ])
        );
      }
    });

    it('should provide progress indicators for long operations', async () => {
      const checkoutData = {
        productId: testProduct.id,
        quantity: 1,
        paymentMethod: 'crypto',
        paymentDetails: {
          tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
          tokenSymbol: 'USDC',
          amount: '149.99',
        },
        shippingAddress: {
          street: '789 Progress Street',
          city: 'Progress City',
          state: 'PC',
          zipCode: '33333',
          country: 'US',
        },
      };

      const checkoutResponse = await request(app)
        .post('/api/checkout/create-session')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(checkoutData)
        .expect(201);

      expect(checkoutResponse.body.data).toMatchObject({
        sessionId: expect.any(String),
        steps: expect.arrayContaining([
          expect.objectContaining({
            step: 'validation',
            status: 'completed',
            description: 'Validating payment method',
          }),
          expect.objectContaining({
            step: 'processing',
            status: 'pending',
            description: 'Processing payment',
          }),
          expect.objectContaining({
            step: 'confirmation',
            status: 'pending',
            description: 'Confirming order',
          }),
        ]),
      });
    });
  });
});
