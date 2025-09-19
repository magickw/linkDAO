import { OrderCreationService, OrderCreationRequest } from '../services/orderCreationService';
import { DatabaseService } from '../services/databaseService';
import { NotificationService } from '../services/notificationService';
import { ListingService } from '../services/listingService';
import { SellerService } from '../services/sellerService';
import { ShippingService } from '../services/shippingService';

// Mock all dependencies
jest.mock('../services/databaseService');
jest.mock('../services/notificationService');
jest.mock('../services/listingService');
jest.mock('../services/sellerService');
jest.mock('../services/shippingService');

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;
const MockedListingService = ListingService as jest.MockedClass<typeof ListingService>;
const MockedSellerService = SellerService as jest.MockedClass<typeof SellerService>;
const MockedShippingService = ShippingService as jest.MockedClass<typeof ShippingService>;

describe('OrderCreationService', () => {
  let orderCreationService: OrderCreationService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockListingService: jest.Mocked<ListingService>;
  let mockSellerService: jest.Mocked<SellerService>;
  let mockShippingService: jest.Mocked<ShippingService>;

  const mockOrderRequest: OrderCreationRequest = {
    listingId: '123',
    buyerAddress: '0x1234567890123456789012345678901234567890',
    quantity: 2,
    shippingAddress: {
      fullName: 'John Doe',
      addressLine1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
      phoneNumber: '+1234567890'
    },
    paymentMethod: 'crypto',
    paymentDetails: {
      escrowId: 'escrow_123',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      tokenSymbol: 'ETH'
    }
  };

  const mockListing = {
    id: 123,
    title: 'Test Product',
    price: '100.00',
    currency: 'USD',
    sellerId: 'seller_123',
    sellerAddress: '0x9876543210987654321098765432109876543210',
    status: 'active',
    inventory: 10,
    weight: 1.5,
    dimensions: { length: 10, width: 8, height: 6 }
  };

  const mockSeller = {
    id: 'seller_123',
    handle: 'testseller',
    walletAddress: '0x9876543210987654321098765432109876543210',
    email: 'seller@test.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocked instances
    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockNotificationService = new MockedNotificationService() as jest.Mocked<NotificationService>;
    mockListingService = new MockedListingService() as jest.Mocked<ListingService>;
    mockSellerService = new MockedSellerService() as jest.Mocked<SellerService>;
    mockShippingService = new MockedShippingService() as jest.Mocked<ShippingService>;

    // Create service instance
    orderCreationService = new OrderCreationService();

    // Setup default mocks
    mockListingService.getListingById.mockResolvedValue(mockListing);
    mockSellerService.getSellerById.mockResolvedValue(mockSeller);
    mockDatabaseService.getUserProfileByAddress.mockResolvedValue({
      id: 'buyer_123',
      walletAddress: mockOrderRequest.buyerAddress,
      handle: 'testbuyer'
    });
    mockDatabaseService.createOrder.mockResolvedValue({
      id: 1,
      orderNumber: 'ORD-12345678-ABCD',
      listingId: 123,
      buyerId: 'buyer_123',
      sellerId: 'seller_123',
      quantity: 2,
      totalAmount: '220.00',
      currency: 'USD',
      status: 'pending',
      createdAt: new Date()
    });
    mockShippingService.createShippingRecord.mockResolvedValue({
      id: 1,
      orderId: 1,
      estimatedDelivery: '5-7 business days'
    });
    mockShippingService.calculateShippingCost.mockResolvedValue(15.00);
    mockNotificationService.sendOrderNotification.mockResolvedValue();
    mockDatabaseService.createOrderTracking.mockResolvedValue();
  });

  describe('createOrder', () => {
    it('should create order successfully with valid request', async () => {
      const result = await orderCreationService.createOrder(mockOrderRequest);

      expect(result).toMatchObject({
        orderId: '1',
        orderNumber: 'ORD-12345678-ABCD',
        status: 'pending',
        paymentStatus: 'pending',
        currency: 'USD'
      });

      expect(result.nextSteps).toHaveLength(4);
      expect(result.notifications.buyer).toBe(true);
      expect(result.notifications.seller).toBe(true);

      // Verify service calls
      expect(mockListingService.getListingById).toHaveBeenCalledWith(123);
      expect(mockSellerService.getSellerById).toHaveBeenCalledWith('seller_123');
      expect(mockDatabaseService.createOrder).toHaveBeenCalled();
      expect(mockShippingService.createShippingRecord).toHaveBeenCalled();
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle fiat payment method correctly', async () => {
      const fiatRequest = {
        ...mockOrderRequest,
        paymentMethod: 'fiat' as const,
        paymentDetails: {
          paymentIntentId: 'pi_123',
          stripeTransferGroup: 'group_123',
          stripeSellerAccount: 'acct_123'
        }
      };

      const result = await orderCreationService.createOrder(fiatRequest);

      expect(result.paymentStatus).toBe('pending');
      expect(result.nextSteps[0]).toContain('Complete payment with your selected payment method');
    });

    it('should throw error when listing not found', async () => {
      mockListingService.getListingById.mockResolvedValue(null);

      await expect(orderCreationService.createOrder(mockOrderRequest))
        .rejects.toThrow('Listing not found');
    });

    it('should throw error when seller not found', async () => {
      mockSellerService.getSellerById.mockResolvedValue(null);

      await expect(orderCreationService.createOrder(mockOrderRequest))
        .rejects.toThrow('Seller not found');
    });

    it('should handle insufficient inventory', async () => {
      const lowInventoryListing = { ...mockListing, inventory: 1 };
      mockListingService.getListingById.mockResolvedValue(lowInventoryListing);

      await expect(orderCreationService.createOrder(mockOrderRequest))
        .rejects.toThrow('Order validation failed');
    });

    it('should prevent self-purchase', async () => {
      const selfPurchaseRequest = {
        ...mockOrderRequest,
        buyerAddress: mockListing.sellerAddress
      };

      await expect(orderCreationService.createOrder(selfPurchaseRequest))
        .rejects.toThrow('Cannot purchase your own listing');
    });
  });

  describe('validateOrderRequest', () => {
    it('should validate valid order request', async () => {
      const validation = await orderCreationService.validateOrderRequest(mockOrderRequest);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid buyer address', async () => {
      const invalidRequest = {
        ...mockOrderRequest,
        buyerAddress: 'invalid_address'
      };

      const validation = await orderCreationService.validateOrderRequest(invalidRequest);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid buyer address');
    });

    it('should detect invalid quantity', async () => {
      const invalidRequest = {
        ...mockOrderRequest,
        quantity: 0
      };

      const validation = await orderCreationService.validateOrderRequest(invalidRequest);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Quantity must be greater than 0');
    });

    it('should detect insufficient inventory', async () => {
      const lowInventoryListing = { ...mockListing, inventory: 1 };
      mockListingService.getListingById.mockResolvedValue(lowInventoryListing);

      const validation = await orderCreationService.validateOrderRequest(mockOrderRequest);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Insufficient inventory. Available: 1, Requested: 2');
      expect(validation.suggestions).toContain('Consider reducing quantity to 1 or less');
    });

    it('should detect inactive listing', async () => {
      const inactiveListing = { ...mockListing, status: 'inactive' };
      mockListingService.getListingById.mockResolvedValue(inactiveListing);

      const validation = await orderCreationService.validateOrderRequest(mockOrderRequest);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Listing is not available for purchase');
    });

    it('should validate shipping address', async () => {
      const invalidRequest = {
        ...mockOrderRequest,
        shippingAddress: {
          ...mockOrderRequest.shippingAddress,
          fullName: 'A', // Too short
          addressLine1: '123', // Too short
          city: '', // Empty
          postalCode: '12' // Too short
        }
      };

      const validation = await orderCreationService.validateOrderRequest(invalidRequest);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(error => error.includes('Full name'))).toBe(true);
      expect(validation.errors.some(error => error.includes('Address line 1'))).toBe(true);
    });

    it('should validate crypto payment details', async () => {
      const invalidRequest = {
        ...mockOrderRequest,
        paymentDetails: {
          // Missing escrowId
          tokenAddress: 'invalid_address'
        }
      };

      const validation = await orderCreationService.validateOrderRequest(invalidRequest);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Escrow ID is required for crypto payments');
      expect(validation.errors).toContain('Invalid token address format');
    });

    it('should validate fiat payment details', async () => {
      const invalidRequest = {
        ...mockOrderRequest,
        paymentMethod: 'fiat' as const,
        paymentDetails: {
          // Missing paymentIntentId
          stripeTransferGroup: 'group_123'
        }
      };

      const validation = await orderCreationService.validateOrderRequest(invalidRequest);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Payment Intent ID is required for fiat payments');
    });
  });

  describe('getOrderSummary', () => {
    it('should return order summary successfully', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'ORD-12345678-ABCD',
        listingId: 123,
        sellerId: 'seller_123',
        buyerAddress: mockOrderRequest.buyerAddress,
        quantity: 2,
        totalAmount: '220.00',
        currency: 'USD',
        paymentMethod: 'crypto',
        status: 'pending',
        createdAt: new Date()
      };

      mockDatabaseService.getOrderById.mockResolvedValue(mockOrder);

      const summary = await orderCreationService.getOrderSummary('1');

      expect(summary).toMatchObject({
        orderId: '1',
        orderNumber: 'ORD-12345678-ABCD',
        listingTitle: 'Test Product',
        sellerName: 'testseller',
        buyerAddress: mockOrderRequest.buyerAddress,
        quantity: 2,
        totalAmount: '220.00',
        currency: 'USD',
        paymentMethod: 'crypto',
        status: 'pending'
      });
    });

    it('should return null for non-existent order', async () => {
      mockDatabaseService.getOrderById.mockResolvedValue(null);

      const summary = await orderCreationService.getOrderSummary('999');

      expect(summary).toBeNull();
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      mockDatabaseService.updateOrder.mockResolvedValue(true);

      const result = await orderCreationService.updateOrderStatus('1', 'confirmed', 'Payment confirmed');

      expect(result).toBe(true);
      expect(mockDatabaseService.updateOrder).toHaveBeenCalledWith(1, {
        status: 'confirmed',
        updatedAt: expect.any(Date)
      });
      expect(mockDatabaseService.createOrderTracking).toHaveBeenCalledWith(
        1,
        'confirmed',
        'Payment confirmed'
      );
    });

    it('should handle update failure gracefully', async () => {
      mockDatabaseService.updateOrder.mockRejectedValue(new Error('Database error'));

      const result = await orderCreationService.updateOrderStatus('1', 'confirmed');

      expect(result).toBe(false);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      const mockOrder = {
        id: 1,
        listingId: 123,
        quantity: 2,
        status: 'pending',
        paymentMethod: 'crypto',
        escrowId: 'escrow_123'
      };

      mockDatabaseService.getOrderById.mockResolvedValue(mockOrder);
      mockDatabaseService.updateOrder.mockResolvedValue(true);

      const result = await orderCreationService.cancelOrder('1', 'Customer request', 'buyer');

      expect(result.success).toBe(true);
      expect(result.refundInitiated).toBe(true);
      expect(mockDatabaseService.updateOrder).toHaveBeenCalled();
    });

    it('should prevent cancellation of shipped orders', async () => {
      const mockOrder = {
        id: 1,
        status: 'shipped'
      };

      mockDatabaseService.getOrderById.mockResolvedValue(mockOrder);

      await expect(orderCreationService.cancelOrder('1', 'Customer request', 'buyer'))
        .rejects.toThrow('Cannot cancel order with status: shipped');
    });

    it('should handle non-existent order', async () => {
      mockDatabaseService.getOrderById.mockResolvedValue(null);

      await expect(orderCreationService.cancelOrder('999', 'Customer request', 'buyer'))
        .rejects.toThrow('Order not found');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle database connection errors', async () => {
      mockDatabaseService.createOrder.mockRejectedValue(new Error('Database connection failed'));

      await expect(orderCreationService.createOrder(mockOrderRequest))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle notification failures gracefully', async () => {
      mockNotificationService.sendOrderNotification.mockRejectedValue(new Error('Notification failed'));

      // Should still create order successfully even if notifications fail
      const result = await orderCreationService.createOrder(mockOrderRequest);

      expect(result.orderId).toBe('1');
      expect(result.notifications.buyer).toBe(false);
      expect(result.notifications.seller).toBe(false);
    });

    it('should handle shipping service failures', async () => {
      mockShippingService.calculateShippingCost.mockRejectedValue(new Error('Shipping service down'));

      // Should still create order with fallback shipping cost
      const result = await orderCreationService.createOrder(mockOrderRequest);

      expect(result.orderId).toBe('1');
      // Should use fallback calculation
    });

    it('should handle inventory update failures gracefully', async () => {
      mockListingService.updateListing.mockRejectedValue(new Error('Inventory update failed'));

      // Should still create order successfully
      const result = await orderCreationService.createOrder(mockOrderRequest);

      expect(result.orderId).toBe('1');
      // Inventory update failure shouldn't fail order creation
    });
  });
});