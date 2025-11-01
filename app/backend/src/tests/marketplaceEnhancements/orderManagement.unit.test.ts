import { OrderCreationService } from '../../services/orderCreationService';
import { OrderTrackingService } from '../../services/orderTrackingService';
import { NotificationService } from '../../services/notificationService';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../services/notificationService');
jest.mock('../../db/schema', () => ({
  orders: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  },
  orderItems: {
    insert: jest.fn(),
  },
  products: {
    select: jest.fn(),
  },
  users: {
    select: jest.fn(),
  },
}));

describe('Order Management Unit Tests', () => {
  let orderCreationService: OrderCreationService;
  let orderTrackingService: OrderTrackingService;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockNotificationService = {
      sendOrderConfirmation: jest.fn(),
      sendOrderStatusUpdate: jest.fn(),
      sendSellerNotification: jest.fn(),
    } as any;

    mockDb = {
      orders: {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'order-123',
              status: 'pending',
              createdAt: new Date(),
            }]),
          }),
        }),
        select: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            first: jest.fn(),
          }),
        }),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{
                id: 'order-123',
                status: 'confirmed',
              }]),
            }),
          }),
        }),
      },
      orderItems: {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockResolvedValue(undefined),
        }),
      },
      products: {
        select: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({
              id: 'product-123',
              title: 'Test Product',
              price: 100,
              sellerId: 'seller-123',
            }),
          }),
        }),
      },
      users: {
        select: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({
              id: 'user-123',
              email: 'test@example.com',
            }),
          }),
        }),
      },
    };

    orderCreationService = new OrderCreationService(mockDb, mockNotificationService);
    orderTrackingService = new OrderTrackingService(mockDb, mockNotificationService);
  });

  describe('OrderCreationService', () => {
    const mockOrderData = {
      buyerId: 'buyer-123',
      sellerId: 'seller-123',
      productId: 'product-123',
      quantity: 2,
      paymentMethod: 'crypto' as const,
      paymentDetails: {
        transactionHash: '0xabc123',
        tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
        amount: '200.00',
      },
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
      },
      specialInstructions: 'Handle with care',
    };

    describe('createOrder', () => {
      it('should create order successfully', async () => {
        const result = await orderCreationService.createOrder(mockOrderData);

        expect(result).toEqual({
          id: 'order-123',
          status: 'pending',
          createdAt: expect.any(Date),
        });

        expect(mockDb.orders.insert).toHaveBeenCalled();
        expect(mockDb.orderItems.insert).toHaveBeenCalled();
        expect(mockNotificationService.sendOrderConfirmation).toHaveBeenCalledWith(
          'buyer-123',
          'order-123'
        );
        expect(mockNotificationService.sendSellerNotification).toHaveBeenCalledWith(
          'seller-123',
          'order-123',
          'new_order'
        );
      });

      it('should validate required fields', async () => {
        const invalidOrderData = {
          ...mockOrderData,
          buyerId: '',
        };

        await expect(orderCreationService.createOrder(invalidOrderData))
          .rejects.toThrow('Buyer ID is required');
      });

      it('should validate product exists', async () => {
        mockDb.products.select().where().first.mockResolvedValue(null);

        await expect(orderCreationService.createOrder(mockOrderData))
          .rejects.toThrow('Product not found');
      });

      it('should validate quantity is positive', async () => {
        const invalidOrderData = {
          ...mockOrderData,
          quantity: 0,
        };

        await expect(orderCreationService.createOrder(invalidOrderData))
          .rejects.toThrow('Quantity must be greater than zero');
      });

      it('should handle database errors', async () => {
        mockDb.orders.insert().values().returning.mockRejectedValue(
          new Error('Database connection failed')
        );

        await expect(orderCreationService.createOrder(mockOrderData))
          .rejects.toThrow('Failed to create order');
      });

      it('should create order with escrow payment', async () => {
        const escrowOrderData = {
          ...mockOrderData,
          paymentMethod: 'escrow' as const,
          paymentDetails: {
            escrowContractAddress: '0xEscrow123456789012345678901234567890',
            transactionHash: '0xdef456',
            tokenAddress: '0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c2D0e0f',
            amount: '200.00',
          },
        };

        const result = await orderCreationService.createOrder(escrowOrderData);

        expect(result.id).toBe('order-123');
        expect(mockDb.orders.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethod: 'escrow',
            escrowProtected: true,
          })
        );
      });

      it('should create order with fiat payment', async () => {
        const fiatOrderData = {
          ...mockOrderData,
          paymentMethod: 'fiat' as const,
          paymentDetails: {
            paymentIntentId: 'pi_1234567890',
            provider: 'stripe',
            amount: '200.00',
            currency: 'USD',
          },
        };

        const result = await orderCreationService.createOrder(fiatOrderData);

        expect(result.id).toBe('order-123');
        expect(mockDb.orders.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethod: 'fiat',
            escrowProtected: false,
          })
        );
      });

      it('should calculate total amount correctly', async () => {
        const result = await orderCreationService.createOrder(mockOrderData);

        expect(mockDb.orders.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            totalAmount: 200, // 2 * 100
          })
        );
      });

      it('should handle shipping address validation', async () => {
        const orderWithInvalidShipping = {
          ...mockOrderData,
          shippingAddress: {
            street: '',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
        };

        await expect(orderCreationService.createOrder(orderWithInvalidShipping))
          .rejects.toThrow('Street address is required');
      });
    });

    describe('validateOrderData', () => {
      it('should validate complete order data', () => {
        const result = orderCreationService.validateOrderData(mockOrderData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should detect missing buyer ID', () => {
        const invalidData = { ...mockOrderData, buyerId: '' };
        const result = orderCreationService.validateOrderData(invalidData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Buyer ID is required');
      });

      it('should detect invalid payment method', () => {
        const invalidData = { ...mockOrderData, paymentMethod: 'invalid' as any };
        const result = orderCreationService.validateOrderData(invalidData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid payment method');
      });

      it('should validate shipping address completeness', () => {
        const invalidData = {
          ...mockOrderData,
          shippingAddress: {
            ...mockOrderData.shippingAddress,
            zipCode: '',
          },
        };
        const result = orderCreationService.validateOrderData(invalidData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Zip code is required');
      });
    });
  });

  describe('OrderTrackingService', () => {
    const mockOrder = {
      id: 'order-123',
      buyerId: 'buyer-123',
      sellerId: 'seller-123',
      status: 'pending',
      trackingNumber: null,
      estimatedDelivery: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('trackOrder', () => {
      it('should retrieve order status', async () => {
        mockDb.orders.select().where().first.mockResolvedValue(mockOrder);

        const result = await orderTrackingService.trackOrder('order-123');

        expect(result).toEqual({
          id: 'order-123',
          status: 'pending',
          trackingNumber: null,
          estimatedDelivery: null,
          statusHistory: expect.any(Array),
        });
      });

      it('should handle non-existent order', async () => {
        mockDb.orders.select().where().first.mockResolvedValue(null);

        await expect(orderTrackingService.trackOrder('non-existent'))
          .rejects.toThrow('Order not found');
      });

      it('should include status history', async () => {
        const orderWithHistory = {
          ...mockOrder,
          statusHistory: [
            { status: 'pending', timestamp: new Date(), note: 'Order created' },
            { status: 'confirmed', timestamp: new Date(), note: 'Payment confirmed' },
          ],
        };
        mockDb.orders.select().where().first.mockResolvedValue(orderWithHistory);

        const result = await orderTrackingService.trackOrder('order-123');

        expect(result.statusHistory).toHaveLength(2);
        expect(result.statusHistory[0].status).toBe('pending');
        expect(result.statusHistory[1].status).toBe('confirmed');
      });
    });

    describe('updateOrderStatus', () => {
      it('should update order status successfully', async () => {
        const updatedOrder = { ...mockOrder, status: 'shipped' };
        mockDb.orders.update().set().where().returning.mockResolvedValue([updatedOrder]);

        const result = await orderTrackingService.updateOrderStatus(
          'order-123',
          'shipped',
          'Order has been shipped'
        );

        expect(result.status).toBe('shipped');
        expect(mockNotificationService.sendOrderStatusUpdate).toHaveBeenCalledWith(
          'buyer-123',
          'order-123',
          'shipped'
        );
      });

      it('should validate status transitions', async () => {
        mockDb.orders.select().where().first.mockResolvedValue({
          ...mockOrder,
          status: 'delivered',
        });

        await expect(orderTrackingService.updateOrderStatus(
          'order-123',
          'pending',
          'Invalid transition'
        )).rejects.toThrow('Invalid status transition');
      });

      it('should handle database update errors', async () => {
        mockDb.orders.update().set().where().returning.mockRejectedValue(
          new Error('Database error')
        );

        await expect(orderTrackingService.updateOrderStatus(
          'order-123',
          'shipped',
          'Order shipped'
        )).rejects.toThrow('Failed to update order status');
      });
    });

    describe('updateTrackingInfo', () => {
      it('should update tracking information', async () => {
        const trackingData = {
          trackingNumber: 'TRACK123456',
          carrier: 'UPS',
          estimatedDelivery: new Date('2024-01-15'),
        };

        const updatedOrder = { ...mockOrder, ...trackingData };
        mockDb.orders.update().set().where().returning.mockResolvedValue([updatedOrder]);

        const result = await orderTrackingService.updateTrackingInfo('order-123', trackingData);

        expect(result.trackingNumber).toBe('TRACK123456');
        expect(result.carrier).toBe('UPS');
        expect(mockNotificationService.sendOrderStatusUpdate).toHaveBeenCalledWith(
          'buyer-123',
          'order-123',
          'tracking_updated'
        );
      });

      it('should validate tracking number format', async () => {
        const invalidTrackingData = {
          trackingNumber: '',
          carrier: 'UPS',
        };

        await expect(orderTrackingService.updateTrackingInfo('order-123', invalidTrackingData))
          .rejects.toThrow('Tracking number is required');
      });
    });

    describe('getOrderHistory', () => {
      it('should retrieve user order history', async () => {
        const orders = [
          { ...mockOrder, id: 'order-1' },
          { ...mockOrder, id: 'order-2' },
        ];
        mockDb.orders.select().where.mockResolvedValue(orders);

        const result = await orderTrackingService.getOrderHistory('buyer-123');

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('order-1');
        expect(result[1].id).toBe('order-2');
      });

      it('should filter orders by status', async () => {
        const pendingOrders = [
          { ...mockOrder, id: 'order-1', status: 'pending' },
        ];
        mockDb.orders.select().where.mockResolvedValue(pendingOrders);

        const result = await orderTrackingService.getOrderHistory('buyer-123', {
          status: 'pending',
        });

        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('pending');
      });

      it('should paginate results', async () => {
        const orders = Array.from({ length: 5 }, (_, i) => ({
          ...mockOrder,
          id: `order-${i + 1}`,
        }));
        mockDb.orders.select().where.mockResolvedValue(orders.slice(0, 3));

        const result = await orderTrackingService.getOrderHistory('buyer-123', {
          page: 1,
          limit: 3,
        });

        expect(result).toHaveLength(3);
      });
    });

    describe('Status Validation', () => {
      it('should validate allowed status values', () => {
        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        
        validStatuses.forEach(status => {
          const isValid = orderTrackingService.isValidStatus(status);
          expect(isValid).toBe(true);
        });
      });

      it('should reject invalid status values', () => {
        const invalidStatuses = ['invalid', 'unknown', ''];
        
        invalidStatuses.forEach(status => {
          const isValid = orderTrackingService.isValidStatus(status);
          expect(isValid).toBe(false);
        });
      });

      it('should validate status transitions', () => {
        const validTransitions = [
          ['pending', 'confirmed'],
          ['confirmed', 'processing'],
          ['processing', 'shipped'],
          ['shipped', 'delivered'],
          ['pending', 'cancelled'],
        ];

        validTransitions.forEach(([from, to]) => {
          const isValid = orderTrackingService.isValidStatusTransition(from, to);
          expect(isValid).toBe(true);
        });
      });

      it('should reject invalid status transitions', () => {
        const invalidTransitions = [
          ['delivered', 'pending'],
          ['cancelled', 'shipped'],
          ['shipped', 'confirmed'],
        ];

        invalidTransitions.forEach(([from, to]) => {
          const isValid = orderTrackingService.isValidStatusTransition(from, to);
          expect(isValid).toBe(false);
        });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent order creation', async () => {
      // Simulate concurrent order creation attempts
      const promises = Array.from({ length: 3 }, () =>
        orderCreationService.createOrder(mockOrderData)
      );

      const results = await Promise.allSettled(promises);
      
      // At least one should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should handle order creation with missing product', async () => {
      mockDb.products.select().where().first.mockResolvedValue(null);

      await expect(orderCreationService.createOrder(mockOrderData))
        .rejects.toThrow('Product not found');
    });

    it('should handle notification service failures gracefully', async () => {
      mockNotificationService.sendOrderConfirmation.mockRejectedValue(
        new Error('Notification service down')
      );

      // Order creation should still succeed even if notifications fail
      const result = await orderCreationService.createOrder(mockOrderData);
      expect(result.id).toBe('order-123');
    });

    it('should handle malformed order data', async () => {
      const malformedData = {
        buyerId: 123, // Should be string
        quantity: 'two', // Should be number
        paymentMethod: null,
      };

      await expect(orderCreationService.createOrder(malformedData as any))
        .rejects.toThrow();
    });

    it('should handle database connection failures', async () => {
      mockDb.orders.insert().values().returning.mockRejectedValue(
        new Error('Connection timeout')
      );

      await expect(orderCreationService.createOrder(mockOrderData))
        .rejects.toThrow('Failed to create order');
    });
  });
});
