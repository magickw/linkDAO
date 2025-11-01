import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { OrderService } from '../services/orderService';
import { DatabaseService } from '../services/databaseService';
import { UserProfileService } from '../services/userProfileService';
import { EnhancedEscrowService } from '../services/enhancedEscrowService';
import { ShippingService } from '../services/shippingService';
import { NotificationService } from '../services/notificationService';
import { BlockchainEventService } from '../services/blockchainEventService';
import { CreateOrderInput, OrderStatus } from '../models/Order';

// Mock dependencies
jest.mock('../services/databaseService');
jest.mock('../services/userProfileService');
jest.mock('../services/enhancedEscrowService');
jest.mock('../services/shippingService');
jest.mock('../services/notificationService');
jest.mock('../services/blockchainEventService');

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedUserProfileService = UserProfileService as jest.MockedClass<typeof UserProfileService>;
const MockedEnhancedEscrowService = EnhancedEscrowService as jest.MockedClass<typeof EnhancedEscrowService>;
const MockedShippingService = ShippingService as jest.MockedClass<typeof ShippingService>;
const MockedNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;
const MockedBlockchainEventService = BlockchainEventService as jest.MockedClass<typeof BlockchainEventService>;

describe('OrderService', () => {
  let orderService: OrderService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockUserProfileService: jest.Mocked<UserProfileService>;
  let mockEnhancedEscrowService: jest.Mocked<EnhancedEscrowService>;
  let mockShippingService: jest.Mocked<ShippingService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockBlockchainEventService: jest.Mocked<BlockchainEventService>;

  const mockBuyer = {
    id: 'buyer-id',
    walletAddress: '0x1234567890123456789012345678901234567890',
    handle: 'buyer',
    profileCid: '',
    createdAt: new Date().toISOString()
  };

  const mockSeller = {
    id: 'seller-id',
    walletAddress: '0x0987654321098765432109876543210987654321',
    handle: 'seller',
    profileCid: '',
    createdAt: new Date().toISOString()
  };

  const mockOrder = {
    id: 1,
    listingId: 1,
    buyerId: 'buyer-id',
    sellerId: 'seller-id',
    escrowId: 1,
    amount: '1000',
    paymentToken: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8',
    status: 'created',
    createdAt: new Date(),
    shippingStreet: '123 Main St',
    shippingCity: 'Anytown',
    shippingState: 'CA',
    shippingPostalCode: '12345',
    shippingCountry: 'US',
    shippingName: 'John Doe',
    shippingPhone: '+1234567890'
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockUserProfileService = new MockedUserProfileService() as jest.Mocked<UserProfileService>;
    mockEnhancedEscrowService = new MockedEnhancedEscrowService('', '', '') as jest.Mocked<EnhancedEscrowService>;
    mockShippingService = new MockedShippingService() as jest.Mocked<ShippingService>;
    mockNotificationService = new MockedNotificationService() as jest.Mocked<NotificationService>;
    mockBlockchainEventService = new MockedBlockchainEventService() as jest.Mocked<BlockchainEventService>;

    // Create OrderService instance
    orderService = new OrderService();

    // Setup default mock implementations
    mockUserProfileService.getProfileByAddress.mockImplementation(async (address: string) => {
      if (address === mockBuyer.walletAddress) return mockBuyer;
      if (address === mockSeller.walletAddress) return mockSeller;
      return null;
    });

    mockUserProfileService.createProfile.mockImplementation(async (input: any) => {
      return {
        id: 'new-user-id',
        walletAddress: input.walletAddress,
        handle: input.handle,
        profileCid: input.profileCid,
        createdAt: new Date().toISOString()
      };
    });

    mockEnhancedEscrowService.createEscrow.mockResolvedValue('1');
    mockDatabaseService.createOrder.mockResolvedValue(mockOrder);
    mockNotificationService.sendOrderNotification.mockResolvedValue();
    mockBlockchainEventService.monitorOrderEvents.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createOrder', () => {
    const validOrderInput: CreateOrderInput = {
      listingId: '1',
      buyerAddress: mockBuyer.walletAddress,
      sellerAddress: mockSeller.walletAddress,
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

    it('should create an order successfully', async () => {
      const result = await orderService.createOrder(validOrderInput);

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.buyerWalletAddress).toBe(mockBuyer.walletAddress);
      expect(result.sellerWalletAddress).toBe(mockSeller.walletAddress);
      expect(result.amount).toBe('1000');
      expect(result.status).toBe(OrderStatus.CREATED);

      // Verify escrow creation
      expect(mockEnhancedEscrowService.createEscrow).toHaveBeenCalledWith(
        '1',
        mockBuyer.walletAddress,
        mockSeller.walletAddress,
        '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8',
        '1000'
      );

      // Verify database order creation
      expect(mockDatabaseService.createOrder).toHaveBeenCalledWith(
        1,
        'buyer-id',
        'seller-id',
        '1000',
        '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8',
        1
      );

      // Verify notifications sent
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledWith(
        mockBuyer.walletAddress,
        'ORDER_CREATED',
        '1'
      );
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledWith(
        mockSeller.walletAddress,
        'ORDER_RECEIVED',
        '1'
      );

      // Verify blockchain monitoring started
      expect(mockBlockchainEventService.monitorOrderEvents).toHaveBeenCalledWith('1', '1');
    });

    it('should throw error for missing required fields', async () => {
      const invalidInput = { ...validOrderInput };
      delete (invalidInput as any).listingId;

      await expect(orderService.createOrder(invalidInput)).rejects.toThrow('Missing required fields for order creation');
    });

    it('should throw error for invalid wallet addresses', async () => {
      const invalidInput = {
        ...validOrderInput,
        buyerAddress: 'invalid-address'
      };

      await expect(orderService.createOrder(invalidInput)).rejects.toThrow('Invalid wallet addresses');
    });

    it('should throw error for invalid amount', async () => {
      const invalidInput = {
        ...validOrderInput,
        amount: '0'
      };

      await expect(orderService.createOrder(invalidInput)).rejects.toThrow('Order amount must be greater than 0');
    });

    it('should create users if they do not exist', async () => {
      mockUserProfileService.getProfileByAddress.mockResolvedValue(null);

      await orderService.createOrder(validOrderInput);

      expect(mockUserProfileService.createProfile).toHaveBeenCalledTimes(2);
    });

    it('should handle escrow creation failure', async () => {
      mockEnhancedEscrowService.createEscrow.mockRejectedValue(new Error('Escrow creation failed'));

      await expect(orderService.createOrder(validOrderInput)).rejects.toThrow('Escrow creation failed');
    });

    it('should handle database order creation failure', async () => {
      mockDatabaseService.createOrder.mockResolvedValue(null);

      await expect(orderService.createOrder(validOrderInput)).rejects.toThrow('Failed to create order in database');
    });
  });

  describe('getOrderById', () => {
    beforeEach(() => {
      mockDatabaseService.getOrderById.mockResolvedValue(mockOrder);
      mockUserProfileService.getProfileById.mockImplementation(async (id: string) => {
        if (id === 'buyer-id') return mockBuyer;
        if (id === 'seller-id') return mockSeller;
        return null;
      });
    });

    it('should return order by ID', async () => {
      const result = await orderService.getOrderById('1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('1');
      expect(result!.buyerWalletAddress).toBe(mockBuyer.walletAddress);
      expect(result!.sellerWalletAddress).toBe(mockSeller.walletAddress);
    });

    it('should return null for non-existent order', async () => {
      mockDatabaseService.getOrderById.mockResolvedValue(null);

      const result = await orderService.getOrderById('999');

      expect(result).toBeNull();
    });

    it('should return null if buyer or seller not found', async () => {
      mockUserProfileService.getProfileById.mockResolvedValue(null);

      const result = await orderService.getOrderById('1');

      expect(result).toBeNull();
    });
  });

  describe('updateOrderStatus', () => {
    beforeEach(() => {
      mockDatabaseService.updateOrder.mockResolvedValue(mockOrder);
      mockDatabaseService.createOrderEvent.mockResolvedValue({
        id: 1,
        orderId: 1,
        eventType: 'STATUS_CHANGED_PAID',
        description: 'Order status changed to PAID',
        metadata: null,
        timestamp: new Date()
      });
    });

    it('should update order status successfully', async () => {
      const result = await orderService.updateOrderStatus('1', OrderStatus.PAID);

      expect(result).toBe(true);
      expect(mockDatabaseService.updateOrder).toHaveBeenCalledWith(1, { status: 'paid' });
      expect(mockDatabaseService.createOrderEvent).toHaveBeenCalledWith(
        1,
        'STATUS_CHANGED_PAID',
        'Order status changed to PAID',
        undefined
      );
    });

    it('should handle metadata in status update', async () => {
      const metadata = { transactionHash: '0x123' };
      
      await orderService.updateOrderStatus('1', OrderStatus.PAID, metadata);

      expect(mockDatabaseService.createOrderEvent).toHaveBeenCalledWith(
        1,
        'STATUS_CHANGED_PAID',
        'Order status changed to PAID',
        JSON.stringify(metadata)
      );
    });

    it('should return false if update fails', async () => {
      mockDatabaseService.updateOrder.mockResolvedValue(null);

      const result = await orderService.updateOrderStatus('1', OrderStatus.PAID);

      expect(result).toBe(false);
    });
  });

  describe('processShipping', () => {
    const shippingInfo = {
      carrier: 'FEDEX' as const,
      service: 'GROUND',
      fromAddress: {
        name: 'Seller Name',
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

    beforeEach(() => {
      mockDatabaseService.getOrderById.mockResolvedValue(mockOrder);
      mockUserProfileService.getProfileById.mockImplementation(async (id: string) => {
        if (id === 'buyer-id') return mockBuyer;
        if (id === 'seller-id') return mockSeller;
        return null;
      });

      mockShippingService.createShipment.mockResolvedValue({
        trackingNumber: 'TRACK123',
        labelUrl: 'https://example.com/label.pdf',
        estimatedDelivery: '2024-03-15',
        cost: '15.99'
      });

      mockShippingService.startDeliveryTracking.mockResolvedValue();
      mockDatabaseService.updateOrder.mockResolvedValue(mockOrder);
      mockDatabaseService.createOrderEvent.mockResolvedValue({
        id: 1,
        orderId: 1,
        eventType: 'ORDER_SHIPPED',
        description: 'Order has been shipped',
        metadata: JSON.stringify({ trackingNumber: 'TRACK123', carrier: 'FEDEX' }),
        timestamp: new Date()
      });
    });

    it('should process shipping successfully', async () => {
      const result = await orderService.processShipping('1', shippingInfo);

      expect(result).toBe(true);
      expect(mockShippingService.createShipment).toHaveBeenCalledWith({
        orderId: '1',
        carrier: 'FEDEX',
        service: 'GROUND',
        fromAddress: shippingInfo.fromAddress,
        toAddress: expect.objectContaining({
          name: 'John Doe',
          street: '123 Main St',
          city: 'Anytown'
        }),
        packageInfo: shippingInfo.packageInfo
      });

      expect(mockDatabaseService.updateOrder).toHaveBeenCalledWith(1, { status: 'shipped' });
      expect(mockShippingService.startDeliveryTracking).toHaveBeenCalledWith('1', 'TRACK123', 'FEDEX');
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledWith(
        mockBuyer.walletAddress,
        'ORDER_SHIPPED',
        '1',
        { trackingNumber: 'TRACK123' }
      );
    });

    it('should throw error if order not found', async () => {
      mockDatabaseService.getOrderById.mockResolvedValue(null);

      await expect(orderService.processShipping('999', shippingInfo)).rejects.toThrow('Order not found');
    });

    it('should handle shipping service errors', async () => {
      mockShippingService.createShipment.mockRejectedValue(new Error('Shipping service error'));

      await expect(orderService.processShipping('1', shippingInfo)).rejects.toThrow('Shipping service error');
    });
  });

  describe('confirmDelivery', () => {
    const deliveryInfo = {
      deliveredAt: '2024-03-15T10:30:00Z',
      signature: 'John Doe',
      location: 'Front door'
    };

    beforeEach(() => {
      mockDatabaseService.getOrderById.mockResolvedValue(mockOrder);
      mockUserProfileService.getProfileById.mockImplementation(async (id: string) => {
        if (id === 'buyer-id') return mockBuyer;
        if (id === 'seller-id') return mockSeller;
        return null;
      });

      mockEnhancedEscrowService.confirmDelivery.mockResolvedValue();
      mockDatabaseService.updateOrder.mockResolvedValue(mockOrder);
      mockDatabaseService.createOrderEvent.mockResolvedValue({
        id: 1,
        orderId: 1,
        eventType: 'DELIVERY_CONFIRMED',
        description: 'Delivery confirmed',
        metadata: JSON.stringify(deliveryInfo),
        timestamp: new Date()
      });
    });

    it('should confirm delivery successfully', async () => {
      const result = await orderService.confirmDelivery('1', deliveryInfo);

      expect(result).toBe(true);
      expect(mockEnhancedEscrowService.confirmDelivery).toHaveBeenCalledWith('1', JSON.stringify(deliveryInfo));
      expect(mockDatabaseService.createOrderEvent).toHaveBeenCalledWith(
        1,
        'DELIVERY_CONFIRMED',
        'Delivery confirmed',
        JSON.stringify(deliveryInfo)
      );
    });

    it('should throw error if order not found', async () => {
      mockDatabaseService.getOrderById.mockResolvedValue(null);

      await expect(orderService.confirmDelivery('999', deliveryInfo)).rejects.toThrow('Order not found');
    });

    it('should handle escrow service errors', async () => {
      mockEnhancedEscrowService.confirmDelivery.mockRejectedValue(new Error('Escrow service error'));

      await expect(orderService.confirmDelivery('1', deliveryInfo)).rejects.toThrow('Escrow service error');
    });
  });

  describe('initiateDispute', () => {
    const reason = 'Product not as described';
    const evidence = ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'];

    beforeEach(() => {
      mockDatabaseService.getOrderById.mockResolvedValue(mockOrder);
      mockUserProfileService.getProfileById.mockImplementation(async (id: string) => {
        if (id === 'buyer-id') return mockBuyer;
        if (id === 'seller-id') return mockSeller;
        return null;
      });

      mockUserProfileService.getProfileByAddress.mockImplementation(async (address: string) => {
        if (address === mockBuyer.walletAddress) return mockBuyer;
        if (address === mockSeller.walletAddress) return mockSeller;
        return null;
      });

      mockEnhancedEscrowService.openDispute.mockResolvedValue();
      mockDatabaseService.updateOrder.mockResolvedValue(mockOrder);
      mockDatabaseService.createDispute.mockResolvedValue({
        id: 1,
        escrowId: 1,
        reporterId: 'buyer-id',
        reason,
        status: 'open',
        createdAt: new Date(),
        resolvedAt: null,
        resolution: null,
        evidence: JSON.stringify(evidence)
      });
      mockDatabaseService.createOrderEvent.mockResolvedValue({
        id: 1,
        orderId: 1,
        eventType: 'DISPUTE_INITIATED',
        description: `Dispute initiated: ${reason}`,
        metadata: JSON.stringify({ evidence }),
        timestamp: new Date()
      });
    });

    it('should initiate dispute successfully', async () => {
      const result = await orderService.initiateDispute('1', mockBuyer.walletAddress, reason, evidence);

      expect(result).toBe(true);
      expect(mockEnhancedEscrowService.openDispute).toHaveBeenCalledWith('1', mockBuyer.walletAddress, reason);
      expect(mockDatabaseService.createDispute).toHaveBeenCalledWith(
        1,
        'buyer-id',
        reason,
        JSON.stringify(evidence)
      );
      expect(mockNotificationService.sendOrderNotification).toHaveBeenCalledWith(
        mockSeller.walletAddress,
        'DISPUTE_INITIATED',
        '1',
        { reason }
      );
    });

    it('should throw error if order not found', async () => {
      mockDatabaseService.getOrderById.mockResolvedValue(null);

      await expect(orderService.initiateDispute('999', mockBuyer.walletAddress, reason)).rejects.toThrow('Order not found');
    });

    it('should handle escrow service errors', async () => {
      mockEnhancedEscrowService.openDispute.mockRejectedValue(new Error('Escrow service error'));

      await expect(orderService.initiateDispute('1', mockBuyer.walletAddress, reason)).rejects.toThrow('Escrow service error');
    });
  });

  describe('getOrdersByUser', () => {
    beforeEach(() => {
      mockUserProfileService.getProfileByAddress.mockResolvedValue(mockBuyer);
      mockDatabaseService.getOrdersByUser.mockResolvedValue([mockOrder]);
      mockUserProfileService.getProfileById.mockImplementation(async (id: string) => {
        if (id === 'buyer-id') return mockBuyer;
        if (id === 'seller-id') return mockSeller;
        return null;
      });
    });

    it('should return orders for user', async () => {
      const result = await orderService.getOrdersByUser(mockBuyer.walletAddress);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].buyerWalletAddress).toBe(mockBuyer.walletAddress);
    });

    it('should return empty array if user not found', async () => {
      mockUserProfileService.getProfileByAddress.mockResolvedValue(null);

      const result = await orderService.getOrdersByUser('0xinvalid');

      expect(result).toEqual([]);
    });

    it('should filter out orders with missing user data', async () => {
      mockUserProfileService.getProfileById.mockResolvedValue(null);

      const result = await orderService.getOrdersByUser(mockBuyer.walletAddress);

      expect(result).toEqual([]);
    });
  });

  describe('getOrderAnalytics', () => {
    const mockAnalytics = {
      totalOrders: 10,
      totalVolume: '50000',
      averageOrderValue: '5000',
      completionRate: 0.9,
      disputeRate: 0.1,
      topCategories: [],
      monthlyTrends: []
    };

    beforeEach(() => {
      mockUserProfileService.getProfileByAddress.mockResolvedValue(mockBuyer);
      mockDatabaseService.getOrderAnalytics.mockResolvedValue(mockAnalytics);
      mockDatabaseService.getOrdersByUser.mockResolvedValue([]);
    });

    it('should return order analytics', async () => {
      const result = await orderService.getOrderAnalytics(mockBuyer.walletAddress);

      expect(result.totalOrders).toBe(10);
      expect(result.totalVolume).toBe('50000');
      expect(result.averageOrderValue).toBe('5000');
      expect(result.completionRate).toBe(0.9);
      expect(result.disputeRate).toBe(0.1);
    });

    it('should throw error if user not found', async () => {
      mockUserProfileService.getProfileByAddress.mockResolvedValue(null);

      await expect(orderService.getOrderAnalytics('0xinvalid')).rejects.toThrow('User not found');
    });
  });
});
