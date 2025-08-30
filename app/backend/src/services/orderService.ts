import { ethers } from 'ethers';
import { DatabaseService } from './databaseService';
import { UserProfileService } from './userProfileService';
import { EnhancedEscrowService } from './enhancedEscrowService';
import { ShippingService } from './shippingService';
import { NotificationService } from './notificationService';
import { BlockchainEventService } from './blockchainEventService';
import { 
  MarketplaceOrder, 
  CreateOrderInput, 
  UpdateOrderInput,
  OrderStatus,
  OrderEvent,
  ShippingInfo,
  OrderAnalytics
} from '../models/Order';

const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();
const shippingService = new ShippingService();
const notificationService = new NotificationService();
const blockchainEventService = new BlockchainEventService();

export class OrderService {
  private enhancedEscrowService: EnhancedEscrowService;

  constructor() {
    this.enhancedEscrowService = new EnhancedEscrowService(
      process.env.RPC_URL || 'http://localhost:8545',
      process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS || '',
      process.env.MARKETPLACE_CONTRACT_ADDRESS || ''
    );
  }

  /**
   * Create a new order with smart contract escrow deployment
   */
  async createOrder(input: CreateOrderInput): Promise<MarketplaceOrder> {
    try {
      // Validate input
      this.validateCreateOrderInput(input);

      // Ensure buyer and seller exist
      const [buyerUser, sellerUser] = await Promise.all([
        this.ensureUserExists(input.buyerAddress),
        this.ensureUserExists(input.sellerAddress)
      ]);

      // Create escrow contract first
      const escrowId = await this.enhancedEscrowService.createEscrow(
        input.listingId,
        input.buyerAddress,
        input.sellerAddress,
        input.paymentToken,
        input.amount
      );

      // Create order in database
      const dbOrder = await databaseService.createOrder(
        parseInt(input.listingId),
        buyerUser.id,
        sellerUser.id,
        input.amount,
        input.paymentToken,
        parseInt(escrowId)
      );

      if (!dbOrder) {
        throw new Error('Failed to create order in database');
      }

      // Update order with shipping information if provided
      if (input.shippingAddress) {
        await this.updateOrderShipping(dbOrder.id.toString(), input.shippingAddress);
      }

      // Create initial order event
      await this.createOrderEvent(dbOrder.id.toString(), 'ORDER_CREATED', 'Order created successfully');

      // Send notifications
      await Promise.all([
        notificationService.sendOrderNotification(input.buyerAddress, 'ORDER_CREATED', dbOrder.id.toString()),
        notificationService.sendOrderNotification(input.sellerAddress, 'ORDER_RECEIVED', dbOrder.id.toString())
      ]);

      // Start blockchain event monitoring
      blockchainEventService.monitorOrderEvents(dbOrder.id.toString(), escrowId);

      return this.formatOrder(dbOrder, buyerUser, sellerUser, escrowId);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID with full details
   */
  async getOrderById(orderId: string): Promise<MarketplaceOrder | null> {
    try {
      const dbOrder = await databaseService.getOrderById(parseInt(orderId));
      if (!dbOrder) return null;

      const [buyer, seller] = await Promise.all([
        userProfileService.getProfileById(dbOrder.buyerId || ''),
        userProfileService.getProfileById(dbOrder.sellerId || '')
      ]);

      if (!buyer || !seller) return null;

      return this.formatOrder(dbOrder, buyer, seller, dbOrder.escrowId?.toString());
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  }

  /**
   * Get orders by user address (buyer or seller)
   */
  async getOrdersByUser(userAddress: string): Promise<MarketplaceOrder[]> {
    try {
      const user = await userProfileService.getProfileByAddress(userAddress);
      if (!user) return [];

      const dbOrders = await databaseService.getOrdersByUser(user.id);
      const orders: MarketplaceOrder[] = [];

      for (const dbOrder of dbOrders) {
        const [buyer, seller] = await Promise.all([
          userProfileService.getProfileById(dbOrder.buyerId || ''),
          userProfileService.getProfileById(dbOrder.sellerId || '')
        ]);

        if (buyer && seller) {
          orders.push(this.formatOrder(dbOrder, buyer, seller, dbOrder.escrowId?.toString()));
        }
      }

      return orders;
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Update order status with blockchain synchronization
   */
  async updateOrderStatus(orderId: string, status: OrderStatus, metadata?: any): Promise<boolean> {
    try {
      const success = await databaseService.updateOrder(parseInt(orderId), { status: status.toLowerCase() });
      
      if (success) {
        // Create order event
        await this.createOrderEvent(orderId, `STATUS_CHANGED_${status}`, `Order status changed to ${status}`, metadata);

        // Send notifications based on status
        await this.handleStatusChangeNotifications(orderId, status);

        // Handle status-specific logic
        await this.handleStatusSpecificLogic(orderId, status, metadata);
      }

      return success !== null;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Process shipping for an order
   */
  async processShipping(orderId: string, shippingInfo: ShippingInfo): Promise<boolean> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) throw new Error('Order not found');

      // Create shipping label and get tracking number
      const trackingInfo = await shippingService.createShipment({
        orderId,
        carrier: shippingInfo.carrier,
        service: shippingInfo.service,
        fromAddress: shippingInfo.fromAddress,
        toAddress: order.shippingAddress!,
        packageInfo: shippingInfo.packageInfo
      });

      // Update order with shipping information
      await databaseService.updateOrder(parseInt(orderId), {
        status: 'shipped'
      });

      // Update shipping info in database
      await this.updateOrderShipping(orderId, {
        ...order.shippingAddress!,
        trackingNumber: trackingInfo.trackingNumber,
        carrier: shippingInfo.carrier,
        service: shippingInfo.service,
        estimatedDelivery: trackingInfo.estimatedDelivery
      });

      // Create order event
      await this.createOrderEvent(orderId, 'ORDER_SHIPPED', 'Order has been shipped', {
        trackingNumber: trackingInfo.trackingNumber,
        carrier: shippingInfo.carrier
      });

      // Send notifications
      await notificationService.sendOrderNotification(
        order.buyerWalletAddress, 
        'ORDER_SHIPPED', 
        orderId,
        { trackingNumber: trackingInfo.trackingNumber }
      );

      // Start delivery tracking
      shippingService.startDeliveryTracking(orderId, trackingInfo.trackingNumber, shippingInfo.carrier);

      return true;
    } catch (error) {
      console.error('Error processing shipping:', error);
      throw error;
    }
  }

  /**
   * Confirm delivery and trigger automatic payment release
   */
  async confirmDelivery(orderId: string, deliveryInfo: any): Promise<boolean> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) throw new Error('Order not found');

      // Confirm delivery in escrow contract
      if (order.escrowId) {
        await this.enhancedEscrowService.confirmDelivery(order.escrowId, JSON.stringify(deliveryInfo));
      }

      // Update order status
      await this.updateOrderStatus(orderId, OrderStatus.DELIVERED, deliveryInfo);

      // Create order event
      await this.createOrderEvent(orderId, 'DELIVERY_CONFIRMED', 'Delivery confirmed', deliveryInfo);

      // Auto-release payment after confirmation period
      setTimeout(async () => {
        await this.autoReleasePayment(orderId);
      }, 24 * 60 * 60 * 1000); // 24 hours delay

      return true;
    } catch (error) {
      console.error('Error confirming delivery:', error);
      throw error;
    }
  }

  /**
   * Get order history and timeline
   */
  async getOrderHistory(orderId: string): Promise<OrderEvent[]> {
    try {
      return await databaseService.getOrderEvents(parseInt(orderId));
    } catch (error) {
      console.error('Error getting order history:', error);
      throw error;
    }
  }

  /**
   * Get order analytics for buyers and sellers
   */
  async getOrderAnalytics(userAddress: string, timeframe: 'week' | 'month' | 'year' = 'month'): Promise<OrderAnalytics> {
    try {
      const user = await userProfileService.getProfileByAddress(userAddress);
      if (!user) throw new Error('User not found');

      const analytics = await databaseService.getOrderAnalytics(user.id, timeframe);
      
      return {
        totalOrders: analytics.totalOrders || 0,
        totalVolume: analytics.totalVolume || '0',
        averageOrderValue: analytics.averageOrderValue || '0',
        completionRate: analytics.completionRate || 0,
        disputeRate: analytics.disputeRate || 0,
        topCategories: analytics.topCategories || [],
        monthlyTrends: analytics.monthlyTrends || [],
        recentOrders: await this.getOrdersByUser(userAddress)
      };
    } catch (error) {
      console.error('Error getting order analytics:', error);
      throw error;
    }
  }

  /**
   * Handle dispute initiation
   */
  async initiateDispute(orderId: string, initiatorAddress: string, reason: string, evidence?: string[]): Promise<boolean> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) throw new Error('Order not found');

      // Open dispute in escrow contract
      if (order.escrowId) {
        await this.enhancedEscrowService.openDispute(order.escrowId, initiatorAddress, reason);
      }

      // Update order status
      await this.updateOrderStatus(orderId, OrderStatus.DISPUTED, { reason, evidence });

      // Create dispute record
      await databaseService.createDispute(
        parseInt(order.escrowId || '0'),
        (await userProfileService.getProfileByAddress(initiatorAddress))?.id || '',
        reason,
        evidence ? JSON.stringify(evidence) : undefined
      );

      // Create order event
      await this.createOrderEvent(orderId, 'DISPUTE_INITIATED', `Dispute initiated: ${reason}`, { evidence });

      // Send notifications
      const otherParty = initiatorAddress === order.buyerWalletAddress ? order.sellerWalletAddress : order.buyerWalletAddress;
      await notificationService.sendOrderNotification(otherParty, 'DISPUTE_INITIATED', orderId, { reason });

      return true;
    } catch (error) {
      console.error('Error initiating dispute:', error);
      throw error;
    }
  }

  // Private helper methods

  private validateCreateOrderInput(input: CreateOrderInput): void {
    if (!input.listingId || !input.buyerAddress || !input.sellerAddress || !input.amount || !input.paymentToken) {
      throw new Error('Missing required fields for order creation');
    }

    if (!ethers.isAddress(input.buyerAddress) || !ethers.isAddress(input.sellerAddress)) {
      throw new Error('Invalid wallet addresses');
    }

    if (parseFloat(input.amount) <= 0) {
      throw new Error('Order amount must be greater than 0');
    }
  }

  private async ensureUserExists(walletAddress: string) {
    let user = await userProfileService.getProfileByAddress(walletAddress);
    if (!user) {
      user = await userProfileService.createProfile({
        walletAddress,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    return user;
  }

  private formatOrder(dbOrder: any, buyer: any, seller: any, escrowId?: string): MarketplaceOrder {
    return {
      id: dbOrder.id.toString(),
      listingId: dbOrder.listingId?.toString() || '',
      buyerWalletAddress: buyer.walletAddress,
      sellerWalletAddress: seller.walletAddress,
      escrowId,
      amount: dbOrder.amount,
      paymentToken: dbOrder.paymentToken || '',
      status: (dbOrder.status?.toUpperCase() as OrderStatus) || OrderStatus.CREATED,
      createdAt: dbOrder.createdAt?.toISOString() || new Date().toISOString(),
      shippingAddress: this.formatShippingAddress(dbOrder)
    };
  }

  private formatShippingAddress(dbOrder: any) {
    if (!dbOrder.shippingStreet) return undefined;
    
    return {
      name: dbOrder.shippingName || '',
      street: dbOrder.shippingStreet,
      city: dbOrder.shippingCity || '',
      state: dbOrder.shippingState || '',
      postalCode: dbOrder.shippingPostalCode || '',
      country: dbOrder.shippingCountry || '',
      phone: dbOrder.shippingPhone || undefined
    };
  }

  private async updateOrderShipping(orderId: string, shippingAddress: any): Promise<void> {
    // TODO: Add shipping fields to orders table or create separate shipping table
    // await databaseService.updateOrder(parseInt(orderId), {
    //   shippingStreet: shippingAddress.street,
    //   shippingCity: shippingAddress.city,
    //   shippingState: shippingAddress.state,
    //   shippingPostalCode: shippingAddress.postalCode,
    //   shippingCountry: shippingAddress.country,
    //   shippingName: shippingAddress.name,
    //   shippingPhone: shippingAddress.phone
    // });
  }

  private async createOrderEvent(orderId: string, eventType: string, description: string, metadata?: any): Promise<void> {
    await databaseService.createOrderEvent(parseInt(orderId), eventType, description, metadata ? JSON.stringify(metadata) : undefined);
  }

  private async handleStatusChangeNotifications(orderId: string, status: OrderStatus): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) return;

    switch (status) {
      case OrderStatus.PAID:
        await notificationService.sendOrderNotification(order.sellerWalletAddress, 'PAYMENT_RECEIVED', orderId);
        break;
      case OrderStatus.PROCESSING:
        await notificationService.sendOrderNotification(order.buyerWalletAddress, 'ORDER_PROCESSING', orderId);
        break;
      case OrderStatus.SHIPPED:
        await notificationService.sendOrderNotification(order.buyerWalletAddress, 'ORDER_SHIPPED', orderId);
        break;
      case OrderStatus.DELIVERED:
        await Promise.all([
          notificationService.sendOrderNotification(order.buyerWalletAddress, 'ORDER_DELIVERED', orderId),
          notificationService.sendOrderNotification(order.sellerWalletAddress, 'ORDER_DELIVERED', orderId)
        ]);
        break;
      case OrderStatus.COMPLETED:
        await Promise.all([
          notificationService.sendOrderNotification(order.buyerWalletAddress, 'ORDER_COMPLETED', orderId),
          notificationService.sendOrderNotification(order.sellerWalletAddress, 'ORDER_COMPLETED', orderId)
        ]);
        break;
    }
  }

  private async handleStatusSpecificLogic(orderId: string, status: OrderStatus, metadata?: any): Promise<void> {
    switch (status) {
      case OrderStatus.PAID:
        // Notify seller to process the order
        await this.updateOrderStatus(orderId, OrderStatus.PROCESSING);
        break;
      case OrderStatus.DELIVERED:
        // Start auto-completion timer
        setTimeout(async () => {
          const currentOrder = await this.getOrderById(orderId);
          if (currentOrder?.status === OrderStatus.DELIVERED) {
            await this.updateOrderStatus(orderId, OrderStatus.COMPLETED);
          }
        }, 7 * 24 * 60 * 60 * 1000); // 7 days
        break;
    }
  }

  private async autoReleasePayment(orderId: string): Promise<void> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order || order.status !== OrderStatus.DELIVERED) return;

      // Release payment from escrow
      if (order.escrowId) {
        await this.enhancedEscrowService.approveEscrow(order.escrowId, order.buyerWalletAddress);
      }

      // Update order status to completed
      await this.updateOrderStatus(orderId, OrderStatus.COMPLETED);

      // Create order event
      await this.createOrderEvent(orderId, 'PAYMENT_RELEASED', 'Payment automatically released to seller');
    } catch (error) {
      console.error('Error auto-releasing payment:', error);
    }
  }
}