import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { OrderService } from '../services/orderService';
import { ShippingService } from '../services/shippingService';
import { NotificationService } from '../services/notificationService';
import { BlockchainEventService } from '../services/blockchainEventService';
import { DatabaseService } from '../services/databaseService';
import { OrderStatus } from '../models/Order';

// Mock external services
jest.mock('../services/shippingService');
jest.mock('../services/notificationService');
jest.mock('../services/blockchainEventService');

describe('Order Lifecycle Integration Tests', () => {
  let app: Express;
  let orderService: OrderService;
  let mockShippingService: jest.Mocked<ShippingService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockBlockchainEventService: jest.Mocked<BlockchainEventService>;
  let databaseService: DatabaseService;

  const testBuyer = {
    id: 'test-buyer-id',
    walletAddress: '0x1234567890123456789012345678901234567890',
    handle: 'testbuyer',
    profileCid: '',
    createdAt: new Date().toISOString()
  };

  const testSeller = {
    id: 'test-seller-id',
    walletAddress: '0x0987654321098765432109876543210987654321',
    handle: 'testseller',
    profileCid: '',
    createdAt: new Date().toISOString()
  };

  const testListing = {
    id: 1,
    sellerId: testSeller.id,
    tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8',
    price: '1000',
    quantity: 1,
    itemType: 'PHYSICAL',
    listingType: 'FIXED_PRICE',
    status: 'active',
    metadataURI: 'ipfs://test-metadata',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const createOrderPayload = {
    listingId: '1',
    buyerAddress: testBuyer.walletAddress,
    sellerAddress: testSeller.walletAddress,
    amount: '1000',
    paymentToken: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8',
    quantity: 1,
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      country: 'US',
      phone: '+1234567890'
    }
  };

  const shippingInfo = {
    carrier: 'FEDEX',
    service: 'GROUND',
    fromAddress: {
      name: 'Test Seller',
      street: '456 Seller St',
      city: 'Seller City',
      state: 'NY',
      postalCode: '54321',
      country: 'US',
      phone: '+0987654321'
    },
    packageInfo: {
      weight: 2.5,
      dimensions: {
        length: 10,
        width: 8,
        height: 6
      },
      value: '1000',
      description: 'Test product'
    }
  };

  beforeAll(async () => {
    // Initialize test app and services
    // This would typically involve setting up a test database and Express app
    databaseService = new DatabaseService();
    orderService = new OrderService();
    
    // Setup mocks
    mockShippingService = new (jest.requireMock('../services/shippingService').ShippingService)();
    mockNotificationService = new (jest.requireMock('../services/notificationService').NotificationService)();
    mockBlockchainEventService = new (jest.requireMock('../services/blockchainEventService').BlockchainEventService)();
  });

  afterAll(async () => {
    // Cleanup test database and close connections
    await databaseService.close?.();
  });

  beforeEach(async () => {
    // Clear all mocks and reset database state
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockShippingService.createShipment.mockResolvedValue({
      trackingNumber: 'TEST123456789',
      labelUrl: 'https://test.com/label.pdf',
      estimatedDelivery: '2024-03-20',
      cost: '15.99'
    });

    mockShippingService.trackShipment.mockResolvedValue({
      trackingNumber: 'TEST123456789',
      carrier: 'FEDEX',
      status: 'In Transit',
      events: [{
        timestamp: new Date().toISOString(),
        status: 'Picked Up',
        location: 'Origin Facility',
        description: 'Package picked up'
      }]
    });

    mockNotificationService.sendOrderNotification.mockResolvedValue();
    mockBlockchainEventService.monitorOrderEvents.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Order Lifecycle', () => {
    let orderId: string;

    it('should complete full order lifecycle from creation to delivery', async () => {
      // Step 1: Create Order
      const order = await orderService.createOrder(createOrderPayload);
      orderId = order.id;

      expect(order).toBeDefined();
      expect(order.status).toBe(OrderStatus.CREATED);
      expect(order.buyerWalletAddress).toBe(testBuyer.walletAddress);
      expect(order.sellerWalletAddress).toBe(testSeller.walletAddress);
      expect(order.amount).toBe('1000');

      // Verify escrow creation and notifications
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledWith(
        testBuyer.walletAddress,
        'ORDER_CREATED',
        orderId
      );
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledWith(
        testSeller.walletAddress,
        'ORDER_RECEIVED',
        orderId
      );
      expect(mockBlockchainEventService.monitorOrderEvents).toHaveBeenCalledWith(orderId, expect.any(String));

      // Step 2: Update to Payment Pending
      let success = await orderService.updateOrderStatus(orderId, OrderStatus.PAYMENT_PENDING);
      expect(success).toBe(true);

      // Step 3: Update to Paid (simulating blockchain payment confirmation)
      success = await orderService.updateOrderStatus(orderId, OrderStatus.PAID, {
        transactionHash: '0xabcdef123456789',
        blockNumber: 12345
      });
      expect(success).toBe(true);

      // Step 4: Update to Processing
      success = await orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING);
      expect(success).toBe(true);

      // Step 5: Process Shipping
      success = await orderService.processShipping(orderId, shippingInfo);
      expect(success).toBe(true);

      // Verify shipping service calls
      expect(mockShippingService.createShipment).toHaveBeenCalledWith({
        orderId,
        carrier: 'FEDEX',
        service: 'GROUND',
        fromAddress: shippingInfo.fromAddress,
        toAddress: expect.objectContaining({
          name: 'John Doe',
          street: '123 Main St'
        }),
        packageInfo: shippingInfo.packageInfo
      });

      expect(mockShippingService.startDeliveryTracking).toHaveBeenCalledWith(
        orderId,
        'TEST123456789',
        'FEDEX'
      );

      // Step 6: Confirm Delivery
      const deliveryInfo = {
        deliveredAt: '2024-03-20T14:30:00Z',
        signature: 'John Doe',
        location: 'Front door'
      };

      success = await orderService.confirmDelivery(orderId, deliveryInfo);
      expect(success).toBe(true);

      // Step 7: Verify Final Order State
      const finalOrder = await orderService.getOrderById(orderId);
      expect(finalOrder).toBeDefined();
      expect(finalOrder!.status).toBe(OrderStatus.DELIVERED);

      // Step 8: Verify Order History
      const history = await orderService.getOrderHistory(orderId);
      expect(history.length).toBeGreaterThan(0);
      
      const eventTypes = history.map(event => event.eventType);
      expect(eventTypes).toContain('ORDER_CREATED');
      expect(eventTypes).toContain('STATUS_CHANGED_PAID');
      expect(eventTypes).toContain('ORDER_SHIPPED');
      expect(eventTypes).toContain('DELIVERY_CONFIRMED');
    });

    it('should handle dispute workflow', async () => {
      // Create order first
      const order = await orderService.createOrder(createOrderPayload);
      orderId = order.id;

      // Process through to shipped status
      await orderService.updateOrderStatus(orderId, OrderStatus.PAID);
      await orderService.processShipping(orderId, shippingInfo);

      // Initiate dispute
      const disputeReason = 'Product not as described';
      const evidence = ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'];

      const success = await orderService.initiateDispute(
        orderId,
        testBuyer.walletAddress,
        disputeReason,
        evidence
      );

      expect(success).toBe(true);

      // Verify order status changed to disputed
      const disputedOrder = await orderService.getOrderById(orderId);
      expect(disputedOrder!.status).toBe(OrderStatus.DISPUTED);

      // Verify dispute notification sent
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledWith(
        testSeller.walletAddress,
        'DISPUTE_INITIATED',
        orderId,
        { reason: disputeReason }
      );

      // Verify order history includes dispute event
      const history = await orderService.getOrderHistory(orderId);
      const disputeEvent = history.find(event => event.eventType === 'DISPUTE_INITIATED');
      expect(disputeEvent).toBeDefined();
      expect(disputeEvent!.description).toContain(disputeReason);
    });

    it('should handle order cancellation', async () => {
      // Create order
      const order = await orderService.createOrder(createOrderPayload);
      orderId = order.id;

      // Cancel order
      const cancelReason = 'Changed mind';
      const success = await orderService.updateOrderStatus(orderId, OrderStatus.CANCELLED, {
        reason: cancelReason
      });

      expect(success).toBe(true);

      // Verify order status
      const cancelledOrder = await orderService.getOrderById(orderId);
      expect(cancelledOrder!.status).toBe(OrderStatus.CANCELLED);

      // Verify order history
      const history = await orderService.getOrderHistory(orderId);
      const cancelEvent = history.find(event => event.eventType === 'STATUS_CHANGED_CANCELLED');
      expect(cancelEvent).toBeDefined();
    });

    it('should handle refund workflow', async () => {
      // Create and process order to paid status
      const order = await orderService.createOrder(createOrderPayload);
      orderId = order.id;
      
      await orderService.updateOrderStatus(orderId, OrderStatus.PAID);

      // Process refund
      const refundReason = 'Seller unable to fulfill order';
      const refundAmount = '1000';
      
      const success = await orderService.updateOrderStatus(orderId, OrderStatus.REFUNDED, {
        reason: refundReason,
        amount: refundAmount
      });

      expect(success).toBe(true);

      // Verify order status
      const refundedOrder = await orderService.getOrderById(orderId);
      expect(refundedOrder!.status).toBe(OrderStatus.REFUNDED);
    });
  });

  describe('Order Analytics', () => {
    beforeEach(async () => {
      // Create multiple test orders for analytics
      const orders = [];
      for (let i = 0; i < 5; i++) {
        const order = await orderService.createOrder({
          ...createOrderPayload,
          amount: (1000 + i * 100).toString()
        });
        orders.push(order);
        
        // Complete some orders
        if (i < 3) {
          await orderService.updateOrderStatus(order.id, OrderStatus.PAID);
          await orderService.updateOrderStatus(order.id, OrderStatus.COMPLETED);
        }
      }
    });

    it('should generate accurate order analytics', async () => {
      const analytics = await orderService.getOrderAnalytics(testBuyer.walletAddress);

      expect(analytics).toBeDefined();
      expect(analytics.totalOrders).toBeGreaterThan(0);
      expect(parseFloat(analytics.totalVolume)).toBeGreaterThan(0);
      expect(parseFloat(analytics.averageOrderValue)).toBeGreaterThan(0);
      expect(analytics.completionRate).toBeGreaterThanOrEqual(0);
      expect(analytics.completionRate).toBeLessThanOrEqual(1);
      expect(analytics.disputeRate).toBeGreaterThanOrEqual(0);
      expect(analytics.disputeRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Notification System', () => {
    it('should send notifications at each order status change', async () => {
      const order = await orderService.createOrder(createOrderPayload);
      const orderId = order.id;

      // Clear initial notifications
      jest.clearAllMocks();

      // Update status and verify notifications
      await orderService.updateOrderStatus(orderId, OrderStatus.PAID);
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledWith(
        testSeller.walletAddress,
        'PAYMENT_RECEIVED',
        orderId
      );

      await orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING);
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledWith(
        testBuyer.walletAddress,
        'ORDER_PROCESSING',
        orderId
      );

      await orderService.processShipping(orderId, shippingInfo);
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledWith(
        testBuyer.walletAddress,
        'ORDER_SHIPPED',
        orderId,
        { trackingNumber: 'TEST123456789' }
      );
    });
  });

  describe('Shipping Integration', () => {
    it('should integrate with shipping carriers for label creation and tracking', async () => {
      const order = await orderService.createOrder(createOrderPayload);
      const orderId = order.id;

      await orderService.updateOrderStatus(orderId, OrderStatus.PAID);
      
      // Process shipping
      const success = await orderService.processShipping(orderId, shippingInfo);
      expect(success).toBe(true);

      // Verify shipping service integration
      expect(mockShippingService.createShipment).toHaveBeenCalledTimes(1);
      expect(mockShippingService.startDeliveryTracking).toHaveBeenCalledTimes(1);

      // Verify tracking functionality
      const trackingInfo = await mockShippingService.trackShipment('TEST123456789', 'FEDEX');
      expect(trackingInfo.trackingNumber).toBe('TEST123456789');
      expect(trackingInfo.carrier).toBe('FEDEX');
      expect(trackingInfo.events.length).toBeGreaterThan(0);
    });

    it('should handle shipping service failures gracefully', async () => {
      const order = await orderService.createOrder(createOrderPayload);
      const orderId = order.id;

      await orderService.updateOrderStatus(orderId, OrderStatus.PAID);

      // Mock shipping service failure
      mockShippingService.createShipment.mockRejectedValue(new Error('Shipping service unavailable'));

      // Attempt to process shipping
      await expect(orderService.processShipping(orderId, shippingInfo))
        .rejects.toThrow('Shipping service unavailable');

      // Verify order status remains unchanged
      const orderAfterFailure = await orderService.getOrderById(orderId);
      expect(orderAfterFailure!.status).toBe(OrderStatus.PAID);
    });
  });

  describe('Blockchain Event Integration', () => {
    it('should monitor blockchain events for order lifecycle', async () => {
      const order = await orderService.createOrder(createOrderPayload);
      const orderId = order.id;

      // Verify blockchain monitoring was started
      expect(mockBlockchainEventService.monitorOrderEvents).toHaveBeenCalledWith(
        orderId,
        expect.any(String) // escrowId
      );

      // Simulate blockchain events
      const mockEvents = [
        {
          id: 'event1',
          orderId,
          escrowId: '1',
          eventType: 'ESCROW_CREATED',
          transactionHash: '0xabc123',
          blockNumber: 12345,
          timestamp: new Date().toISOString(),
          data: {}
        },
        {
          id: 'event2',
          orderId,
          escrowId: '1',
          eventType: 'FUNDS_LOCKED',
          transactionHash: '0xdef456',
          blockNumber: 12346,
          timestamp: new Date().toISOString(),
          data: {}
        }
      ];

      mockBlockchainEventService.getOrderEvents.mockResolvedValue(mockEvents);

      const events = await mockBlockchainEventService.getOrderEvents(orderId, '1');
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('ESCROW_CREATED');
      expect(events[1].eventType).toBe('FUNDS_LOCKED');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent order status updates', async () => {
      const order = await orderService.createOrder(createOrderPayload);
      const orderId = order.id;

      // Attempt concurrent status updates
      const promises = [
        orderService.updateOrderStatus(orderId, OrderStatus.PAID),
        orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING),
        orderService.updateOrderStatus(orderId, OrderStatus.SHIPPED)
      ];

      const results = await Promise.allSettled(promises);
      
      // At least one should succeed
      const successfulUpdates = results.filter(result => result.status === 'fulfilled');
      expect(successfulUpdates.length).toBeGreaterThan(0);
    });

    it('should handle invalid order operations', async () => {
      // Attempt to process shipping for non-existent order
      await expect(orderService.processShipping('999', shippingInfo))
        .rejects.toThrow('Order not found');

      // Attempt to confirm delivery for non-existent order
      await expect(orderService.confirmDelivery('999', {}))
        .rejects.toThrow('Order not found');

      // Attempt to initiate dispute for non-existent order
      await expect(orderService.initiateDispute('999', testBuyer.walletAddress, 'test reason'))
        .rejects.toThrow('Order not found');
    });

    it('should validate order state transitions', async () => {
      const order = await orderService.createOrder(createOrderPayload);
      const orderId = order.id;

      // Try to ship before payment
      await expect(orderService.processShipping(orderId, shippingInfo))
        .rejects.toThrow(); // Should fail because order is not paid

      // Pay first, then shipping should work
      await orderService.updateOrderStatus(orderId, OrderStatus.PAID);
      const success = await orderService.processShipping(orderId, shippingInfo);
      expect(success).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk order operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple orders
      const orderPromises = [];
      for (let i = 0; i < 10; i++) {
        orderPromises.push(orderService.createOrder({
          ...createOrderPayload,
          amount: (1000 + i).toString()
        }));
      }

      const orders = await Promise.all(orderPromises);
      const endTime = Date.now();

      expect(orders).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all orders were created successfully
      for (const order of orders) {
        expect(order.status).toBe(OrderStatus.CREATED);
        expect(order.amount).toMatch(/^100\d$/);
      }
    });

    it('should handle high-frequency status updates', async () => {
      const order = await orderService.createOrder(createOrderPayload);
      const orderId = order.id;

      const startTime = Date.now();
      
      // Perform rapid status updates
      await orderService.updateOrderStatus(orderId, OrderStatus.PAYMENT_PENDING);
      await orderService.updateOrderStatus(orderId, OrderStatus.PAID);
      await orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING);
      
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify final status
      const finalOrder = await orderService.getOrderById(orderId);
      expect(finalOrder!.status).toBe(OrderStatus.PROCESSING);
    });
  });
});