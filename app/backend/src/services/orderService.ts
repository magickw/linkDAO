import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { UserProfileService } from './userProfileService';
import { EnhancedEscrowService } from './enhancedEscrowService';
import { ShippingService } from './shippingService';
import { NotificationService } from './notificationService';
import { BlockchainEventService } from './blockchainEventService';
import { getOrderWebSocketService } from './orderWebSocketService';
import {
  MarketplaceOrder,
  CreateOrderInput,
  UpdateOrderInput,
  OrderStatus,
  OrderEvent,
  ShippingInfo,
  OrderAnalytics
} from '../models/Order';
import { ReceiptStatus } from '../types/receipt';

const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();
const shippingService = new ShippingService();
const notificationService = new NotificationService();
const blockchainEventService = new BlockchainEventService();
import { ReceiptService } from './receiptService';
const receiptService = new ReceiptService();
// orderWebSocketService is now lazy-loaded via getOrderWebSocketService()

export class OrderService {
  private enhancedEscrowService: EnhancedEscrowService;

  constructor() {
    this.enhancedEscrowService = new EnhancedEscrowService(
      process.env.RPC_URL || 'https://sepolia.drpc.org',
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
        input.listingId,
        buyerUser.id,
        sellerUser.id,
        input.amount,
        input.paymentToken,
        escrowId
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

      // Send WebSocket updates for order creation
      const newOrder = this.formatOrder(dbOrder, buyerUser, sellerUser, escrowId);
      const wsService = getOrderWebSocketService();
      if (wsService) {
        wsService.sendOrderCreated(newOrder);
      }

      return newOrder;
    } catch (error) {
      safeLogger.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID with full details
   */
  async getOrderById(orderId: string): Promise<MarketplaceOrder | null> {
    try {
      const dbOrder = await databaseService.getOrderById(orderId);
      if (!dbOrder) return null;

      const [buyer, seller] = await Promise.all([
        userProfileService.getProfileById(dbOrder.buyerId || ''),
        userProfileService.getProfileById(dbOrder.sellerId || '')
      ]);

      if (!buyer || !seller) return null;

      return this.formatOrder(dbOrder, buyer, seller, dbOrder.escrowId?.toString());
    } catch (error) {
      safeLogger.error('Error getting order:', error);
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
      safeLogger.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Update order status with blockchain synchronization
   */
  async updateOrderStatus(orderId: string, status: OrderStatus, metadata?: any): Promise<boolean> {
    try {
      // Get current order to capture previous status
      const currentOrder = await this.getOrderById(orderId);
      if (!currentOrder) {
        throw new Error('Order not found');
      }

      const previousStatus = currentOrder.status;

      const success = await databaseService.updateOrder(orderId, { status: status.toLowerCase() });

      if (success) {
        // Create order event
        await this.createOrderEvent(orderId, `STATUS_CHANGED_${status}`, `Order status changed to ${status}`, metadata);

        // Get updated order
        const updatedOrder = await this.getOrderById(orderId);
        if (updatedOrder) {
          // Send WebSocket updates for order status change
          const wsService = getOrderWebSocketService();
          if (wsService) {
            wsService.sendOrderStatusUpdate(updatedOrder, previousStatus);
          }
        }

        // Send notifications based on status
        await this.handleStatusChangeNotifications(orderId, status);

        // Handle status-specific logic
        await this.handleStatusSpecificLogic(orderId, status, metadata);
      }

      return success !== null;
    } catch (error) {
      safeLogger.error('Error updating order status:', error);
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
      await databaseService.updateOrder(orderId, {
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

      // Send WebSocket updates for tracking information
      const wsService = getOrderWebSocketService();
      if (wsService) {
        wsService.sendTrackingUpdate(orderId, order.buyerWalletAddress, {
          trackingNumber: trackingInfo.trackingNumber,
          carrier: shippingInfo.carrier
        });
      }

      return true;
    } catch (error) {
      safeLogger.error('Error processing shipping:', error);
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

      // Send WebSocket updates for delivery confirmation
      const wsService = getOrderWebSocketService();
      if (wsService) {
        wsService.sendDeliveryConfirmation(orderId, order.buyerWalletAddress, deliveryInfo);
        wsService.sendDeliveryConfirmation(orderId, order.sellerWalletAddress, deliveryInfo);
      }

      // Auto-release payment after confirmation period
      setTimeout(async () => {
        await this.autoReleasePayment(orderId);
      }, 24 * 60 * 60 * 1000); // 24 hours delay

      return true;
    } catch (error) {
      safeLogger.error('Error confirming delivery:', error);
      throw error;
    }
  }

  /**
   * Get order history and timeline
   */
  async getOrderHistory(orderId: string): Promise<OrderEvent[]> {
    try {
      return await databaseService.getOrderEvents(orderId);
    } catch (error) {
      safeLogger.error('Error getting order history:', error);
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
        totalRevenue: analytics.totalRevenue || '0',
        averageOrderValue: analytics.averageOrderValue || '0',
        completionRate: analytics.completionRate || 0,
        disputeRate: analytics.disputeRate || 0,
        cancellationRate: analytics.cancellationRate || 0,
        avgShippingTime: analytics.avgShippingTime || 0,
        avgResponseTime: analytics.avgResponseTime || 0,
        repeatCustomerRate: analytics.repeatCustomerRate || 0,
        processingOrders: analytics.processingOrders || 0,
        completedOrders: analytics.completedOrders || 0,
        disputedOrders: analytics.disputedOrders || 0,
        cancelledOrders: analytics.cancelledOrders || 0,
        topCategories: analytics.topCategories || [],
        monthlyTrends: analytics.monthlyTrends || [],
        recentOrders: await this.getOrdersByUser(userAddress),
        timeRange: analytics.timeRange
      };
    } catch (error) {
      safeLogger.error('Error getting order analytics:', error);
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
        order.escrowId || '',
        (await userProfileService.getProfileByAddress(initiatorAddress))?.id || '',
        reason,
        evidence ? JSON.stringify(evidence) : undefined
      );

      // Create order event
      await this.createOrderEvent(orderId, 'DISPUTE_INITIATED', `Dispute initiated: ${reason}`, { evidence });

      // Send notifications
      const otherParty = initiatorAddress === order.buyerWalletAddress ? order.sellerWalletAddress : order.buyerWalletAddress;
      await notificationService.sendOrderNotification(otherParty, 'DISPUTE_INITIATED', orderId, { reason });

      // Send WebSocket updates for dispute initiation
      const wsService = getOrderWebSocketService();
      if (wsService) {
        wsService.handleOrderUpdate({
          type: 'order_status_changed',
          orderId,
          walletAddress: initiatorAddress,
          data: {
            orderId,
            status: OrderStatus.DISPUTED,
            reason,
            evidence
          },
          timestamp: new Date(),
          priority: 'high'
        });
      }

      return true;
    } catch (error) {
      safeLogger.error('Error initiating dispute:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Request order cancellation (by buyer or system)
   */
  async requestCancellation(orderId: string, requesterAddress: string, reason: string, description?: string): Promise<boolean> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) throw new Error('Order not found');

      // Check eligibility (e.g., status is not already completed/shipped if strict, but maybe allow if seller agrees)
      if ([OrderStatus.COMPLETED, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(order.status)) {
        throw new Error('Order cannot be cancelled in its current state');
      }

      // Check if user is buyer or seller (or admin - not implemented yet)
      const requesterProfile = await userProfileService.getProfileByAddress(requesterAddress);
      if (!requesterProfile) throw new Error('Requester profile not found');

      // Create cancellation request
      await databaseService.createCancellationRequest({
        orderId,
        requesterId: requesterProfile.id,
        reason,
        description,
        status: 'pending'
      });

      // Update order status
      await this.updateOrderStatus(orderId, OrderStatus.CANCELLATION_REQUESTED);

      // Notify the other party
      const otherParty = requesterAddress === order.buyerWalletAddress ? order.sellerWalletAddress : order.buyerWalletAddress;
      await notificationService.sendOrderNotification(otherParty, 'CANCELLATION_REQUESTED', orderId, { reason });

      return true;
    } catch (error) {
      safeLogger.error('Error requesting cancellation:', error);
      throw error;
    }
  }

  /**
   * Process cancellation request (Seller approval/rejection)
   */
  async processCancellation(
    orderId: string,
    processorAddress: string,
    action: 'approve' | 'reject',
    resolutionNotes?: string
  ): Promise<boolean> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) throw new Error('Order not found');

      const cancellationRequest = await databaseService.getCancellationByOrderId(orderId);
      if (!cancellationRequest) throw new Error('No active cancellation request found');

      // Verify processor is the seller (or admin)
      if (processorAddress !== order.sellerWalletAddress) {
        throw new Error('Only the seller can process cancellation requests');
      }

      if (action === 'approve') {
        // Issue refund logic would go here
        // For now, assuming refund is handled externally or strictly via update

        // Return items to inventory logic (using databaseService.updateListing or similar if we tracked inventory there)
        // TODO: Implement inventory restoration

        // Update cancellation status
        await databaseService.updateCancellationStatus(cancellationRequest.id, 'approved', resolutionNotes);

        // Update order status
        await this.updateOrderStatus(orderId, OrderStatus.CANCELLED);

        // Notification
        await notificationService.sendOrderNotification(order.buyerWalletAddress, 'CANCELLATION_APPROVED', orderId);
      } else {
        // Update cancellation status
        await databaseService.updateCancellationStatus(cancellationRequest.id, 'rejected', resolutionNotes);

        // Revert order status to previous state? Or just 'processing'/'paid'.
        // Ideally we should know the previous state. For now, reverting to PAID or PROCESSING as safe default if it was requested.
        // Actually, if it was 'cancellation_requested', we should probably move it back to 'processing' or 'paid'.
        await this.updateOrderStatus(orderId, OrderStatus.PROCESSING); // Fallback

        // Notification
        await notificationService.sendOrderNotification(order.buyerWalletAddress, 'CANCELLATION_REJECTED', orderId, { reason: resolutionNotes });
      }

      return true;
    } catch (error) {
      safeLogger.error('Error processing cancellation:', error);
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
    await databaseService.createOrderEvent(orderId, eventType, description, metadata ? JSON.stringify(metadata) : undefined);
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
    const order = await this.getOrderById(orderId);
    if (!order) return;

    switch (status) {
      case OrderStatus.PAID:
        // Generate Receipt
        try {
          await receiptService.generateMarketplaceReceipt({
            orderId: order.id,
            transactionId: order.escrowId || `txn_${Date.now()}`,
            buyerAddress: order.buyerWalletAddress,
            amount: order.amount,
            currency: 'USDC', // Defaulting for now effectively
            paymentMethod: order.paymentToken ? 'crypto' : 'unknown',
            transactionHash: metadata?.txHash,
            status: ReceiptStatus.COMPLETED, // Receipt status
            items: [], // Load items if available
            sellerAddress: order.sellerWalletAddress,
            createdAt: new Date(),
            completedAt: new Date()
          });
        } catch (error) {
          safeLogger.error('Failed to generate receipt during status update', error);
        }

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

      // Send WebSocket updates for order completion
      const wsService = getOrderWebSocketService();
      if (wsService) {
        wsService.sendOrderCompletion(orderId, order.buyerWalletAddress);
        wsService.sendOrderCompletion(orderId, order.sellerWalletAddress);
      }

      // Create order event
      await this.createOrderEvent(orderId, 'PAYMENT_RELEASED', 'Payment automatically released to seller');
    } catch (error) {
      safeLogger.error('Error auto-releasing payment:', error);
    }
  }
}
