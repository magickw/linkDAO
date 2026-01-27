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
import { SellerService } from './sellerService';
const receiptService = new ReceiptService();
const sellerService = new SellerService();
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
      const { escrowId } = await this.enhancedEscrowService.createEscrow(
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
        input.quantity ?? 1,
        escrowId,
        undefined, // variantId
        undefined, // orderId
        '0', // taxAmount
        '0', // shippingCost
        '0', // platformFee
        [], // taxBreakdown
        input.shippingAddress,
        input.billingAddress || input.shippingAddress,
        input.paymentMethod || 'crypto',
        input.paymentDetails
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

      // Send notifications with recipientType for proper buyer/seller isolation
      await Promise.all([
        notificationService.sendOrderNotification(input.buyerAddress, 'ORDER_CREATED', dbOrder.id.toString(), { recipientType: 'buyer' }),
        notificationService.sendOrderNotification(input.sellerAddress, 'ORDER_RECEIVED', dbOrder.id.toString(), { recipientType: 'seller' })
      ]);

      // Start blockchain event monitoring
      blockchainEventService.monitorOrderEvents(dbOrder.id.toString(), escrowId);

      // Send WebSocket updates for order creation
      // Fetch seller profile for correct address in formatted order
      const sellerProfile = await sellerService.getSellerProfile(sellerUser.walletAddress);

      const newOrder = this.formatOrder(dbOrder, buyerUser, sellerUser, escrowId, undefined, sellerProfile);
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

      const [buyer, seller, product] = await Promise.all([
        userProfileService.getProfileById(dbOrder.buyerId || ''),
        userProfileService.getProfileById(dbOrder.sellerId || ''),
        dbOrder.listingId ? databaseService.getProductById(dbOrder.listingId) : null
      ]);

      if (!buyer || !seller) return null;

      const sellerProfile = await sellerService.getSellerProfile(seller.walletAddress);
      return this.formatOrder(dbOrder, buyer, seller, dbOrder.escrowId?.toString(), product, sellerProfile);
    } catch (error) {
      safeLogger.error('Error getting order:', error);
      throw error;
    }
  }

  /**
   * Get orders by user ID (direct DB access)
   * @param userId - The UUID of the user
   * @param role - Optional role filter: 'buyer' for orders placed by user, 'seller' for orders received by user
   */
  async getOrdersByUserId(
    userId: string,
    role?: 'buyer' | 'seller',
    filters: { status?: string } = {},
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    limit: number = 50,
    offset: number = 0
  ): Promise<{ orders: MarketplaceOrder[]; total: number }> {
    try {
      safeLogger.info('[OrderService] getOrdersByUserId called', { userId, role, filters, sortBy, sortOrder, limit, offset });

      const result = await databaseService.getOrdersByUser(userId, role, filters, sortBy, sortOrder, limit, offset);

      safeLogger.info('[OrderService] DB orders found', { count: result.orders.length, total: result.total, userId });

      return {
        orders: result.orders.map((row: any) => this.formatOrder(row.order, row.buyer, row.seller, row.order.escrowId?.toString(), row.product, null)),
        total: result.total
      };
    } catch (error) {
      safeLogger.error('Error getting user orders by ID:', error);
      throw error;
    }
  }

  /**
   * Get orders by user address (buyer or seller)
   * @param userAddress - The wallet address of the user
   * @param role - Optional role filter: 'buyer' for orders placed by user, 'seller' for orders received by user
   */
  async getOrdersByUser(
    userAddress: string,
    role?: 'buyer' | 'seller',
    filters: { status?: string } = {},
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    limit: number = 50,
    offset: number = 0
  ): Promise<{ orders: MarketplaceOrder[]; total: number }> {
    try {
      safeLogger.info('[OrderService] getOrdersByUser called', { userAddress, role, filters, sortBy, sortOrder, limit, offset });
      const user = await userProfileService.getProfileByAddress(userAddress);
      if (!user) {
        safeLogger.warn('[OrderService] User not found for address', { userAddress });
        return { orders: [], total: 0 };
      }

      safeLogger.info('[OrderService] User profile found', { userId: user.id });

      return await this.getOrdersByUserId(user.id, role, filters, sortBy, sortOrder, limit, offset);
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

      const {
        digitalDeliveryCompletedAt,
        deliveryNotes,
        serviceStatus,
        serviceScheduled,
        scheduledDate,
        scheduledTime,
        scheduledTimezone,
        serviceNotes,
        serviceDeliverables,
        serviceCompletedAt,
        buyerConfirmedAt,
        serviceStarted,
        serviceStartedAt,
        isServiceOrder,
        trackingNumber,
        carrier
      } = metadata || {};

      const success = await databaseService.updateOrder(orderId, {
        status: status.toLowerCase(),
        digitalDeliveryCompletedAt,
        deliveryNotes,
        serviceStatus,
        serviceScheduled,
        scheduledDate,
        scheduledTime,
        scheduledTimezone,
        serviceNotes,
        serviceDeliverables,
        serviceCompletedAt,
        buyerConfirmedAt,
        serviceStarted,
        serviceStartedAt,
        isServiceOrder,
        trackingNumber,
        trackingCarrier: carrier
      });

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

        // Handle inventory release for cancelled/refunded orders
        if (status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED) {
          try {
            await this.releaseOrderInventory(orderId, status === OrderStatus.CANCELLED ? 'order_cancelled' : 'order_cancelled');
            safeLogger.info(`Inventory released for ${status} order`, { orderId });
          } catch (inventoryError) {
            safeLogger.error('Failed to release inventory for order:', { orderId, status, error: inventoryError });
            // Don't throw - order status update succeeded, inventory release is secondary
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
        status: 'shipped',
        trackingNumber: trackingInfo.trackingNumber,
        trackingCarrier: shippingInfo.carrier
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
        { trackingNumber: trackingInfo.trackingNumber, recipientType: 'buyer' }
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
        recentOrders: (await this.getOrdersByUser(userAddress)).orders,
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
      const otherPartyType = initiatorAddress === order.buyerWalletAddress ? 'seller' : 'buyer';
      await notificationService.sendOrderNotification(otherParty, 'DISPUTE_INITIATED', orderId, { reason, recipientType: otherPartyType });

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

  /**
   * Get tracking information for an order
   */
  async getOrderTracking(orderId: string): Promise<any[]> {
    try {
      return await databaseService.getTrackingRecords(orderId);
    } catch (error) {
      safeLogger.error('Error getting order tracking:', error);
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
      const otherPartyType = requesterAddress === order.buyerWalletAddress ? 'seller' : 'buyer';
      await notificationService.sendOrderNotification(otherParty, 'CANCELLATION_REQUESTED', orderId, { reason, recipientType: otherPartyType });

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
        // Issue on-chain refund if it's a crypto payment
        if (order.paymentMethod === 'crypto' && order.escrowId) {
          try {
            const escrow = await databaseService.getEscrowById(order.escrowId);
            if (escrow && escrow.onChainId) {
              // Get chain ID from order metadata if available, otherwise default to Sepolia
              let chainId = 11155111;
              if (order.metadata && typeof order.metadata === 'object' && (order.metadata as any).chainId) {
                chainId = Number((order.metadata as any).chainId);
              }

              await this.enhancedEscrowService.refundBuyerOnChain(escrow.onChainId, chainId);
              safeLogger.info(`On-chain refund triggered for order ${orderId} (escrow: ${escrow.onChainId})`);
            } else {
              safeLogger.warn(`On-chain ID missing for escrow ${order.escrowId}, manual refund required`);
            }
          } catch (error) {
            safeLogger.error(`Failed to trigger on-chain refund for order ${orderId}:`, error);
            // We continue with DB update even if on-chain refund fails to maintain system state consistency,
            // but the error is logged for manual intervention.
          }
        }

        // Update cancellation status
        await databaseService.updateCancellationStatus(cancellationRequest.id, 'approved', resolutionNotes);

        // Update order status (this automatically releases inventory via updateOrderStatus)
        await this.updateOrderStatus(orderId, OrderStatus.CANCELLED);

        // Notification
        await notificationService.sendOrderNotification(order.buyerWalletAddress, 'CANCELLATION_APPROVED', orderId, { recipientType: 'buyer' });
      } else {
        // Update cancellation status
        await databaseService.updateCancellationStatus(cancellationRequest.id, 'rejected', resolutionNotes);

        // Revert order status to previous state? Or just 'processing'/'paid'.
        // Ideally we should know the previous state. For now, reverting to PAID or PROCESSING as safe default if it was requested.
        // Actually, if it was 'cancellation_requested', we should probably move it back to 'processing' or 'paid'.
        await this.updateOrderStatus(orderId, OrderStatus.PROCESSING); // Fallback

        // Notification
        await notificationService.sendOrderNotification(order.buyerWalletAddress, 'CANCELLATION_REJECTED', orderId, { reason: resolutionNotes, recipientType: 'buyer' });
      }

      return true;
    } catch (error) {
      safeLogger.error('Error processing cancellation:', error);
      throw error;
    }
  }

  /**
   * Process pending cancellation requests that require auto-approval (e.g., no response > 24h)
   */
  async processAutoApprovals(): Promise<number> {
    try {
      // Get pending cancellations older than 24 hours
      const staleRequests = await databaseService.getStaleCancellationRequests(24);
      let processedCount = 0;

      for (const request of staleRequests) {
        try {
          // Verify it's still pending
          if (request.status !== 'pending') continue;

          // Auto-approve
          await databaseService.updateCancellationStatus(request.id, 'auto_approved', 'Auto-approved due to no response from seller within 24 hours.');

          // Update order status
          await this.updateOrderStatus(request.orderId, OrderStatus.CANCELLED, { reason: 'Cancellation Auto-Approved' });

          // Notify buyer and seller
          const order = await this.getOrderById(request.orderId);
          if (order) {
            await notificationService.sendOrderNotification(order.buyerWalletAddress, 'CANCELLATION_AUTO_APPROVED', request.orderId, { recipientType: 'buyer' });
            await notificationService.sendOrderNotification(order.sellerWalletAddress, 'CANCELLATION_AUTO_APPROVED', request.orderId, { recipientType: 'seller' });
          }

          processedCount++;
        } catch (err) {
          safeLogger.error(`Error processing auto-approval for cancellation ${request.id}:`, err);
        }
      }

      return processedCount;
    } catch (error) {
      safeLogger.error('Error processing auto-approvals:', error);
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

  private formatOrder(dbOrder: any, buyer: any, seller: any, escrowId?: string, product?: any, sellerProfile?: any): MarketplaceOrder {
    // Parse product images if stored as JSON string
    let productImage = '';
    if (product?.images) {
      try {
        const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
        productImage = Array.isArray(images) && images.length > 0 ? images[0] : '';
      } catch (e) {
        productImage = '';
      }
    }

    // Calculate order total from amount
    const orderTotal = parseFloat(dbOrder.amount) || 0;

    // Build items array from product
    const items = product ? [{
      id: product.id?.toString() || dbOrder.listingId?.toString() || '',
      productId: product.id?.toString() || dbOrder.listingId?.toString() || '',
      productName: product.title || 'Unknown Product',
      productImage: productImage,
      quantity: dbOrder.quantity || 1,
      price: orderTotal / (dbOrder.quantity || 1),
      total: orderTotal,
      isPhysical: product.isPhysical ?? false,
      isService: product.isService ?? false,
      serviceType: product.serviceType
    }] : [];

    // Determine if this is a service order
    const isServiceOrder = product?.isService === true || dbOrder.isServiceOrder === true;

    // Parse service deliverables from JSON if stored
    let serviceDeliverables = [];
    if (dbOrder.serviceDeliverables) {
      try {
        serviceDeliverables = typeof dbOrder.serviceDeliverables === 'string'
          ? JSON.parse(dbOrder.serviceDeliverables)
          : dbOrder.serviceDeliverables;
      } catch (e) {
        serviceDeliverables = [];
      }
    }

    // Ensure buyer and seller objects exist to prevent crashes
    const safeBuyer = buyer || {
      id: dbOrder.buyerId || 'unknown',
      walletAddress: dbOrder.buyerWalletAddress || 'unknown',
      handle: 'Unknown User',
      displayName: 'Unknown User',
      avatarCid: undefined,
      billingAddress1: undefined,
      billingCity: undefined,
      billingState: undefined,
      billingZipCode: undefined,
      billingCountry: undefined
    };

    const safeSeller = seller || {
      id: dbOrder.sellerId || 'unknown',
      walletAddress: dbOrder.sellerWalletAddress || 'unknown',
      handle: 'Unknown Seller',
      displayName: 'Unknown Seller',
      avatarCid: undefined,
      billingAddress1: undefined,
      billingCity: undefined,
      billingState: undefined,
      billingZipCode: undefined,
      billingCountry: undefined
    };

    return {
      id: dbOrder.id.toString(),
      orderNumber: dbOrder.id.toString(),
      listingId: dbOrder.listingId?.toString() || '',
      buyerId: safeBuyer.id?.toString(),
      sellerId: safeSeller.id?.toString(),
      buyerWalletAddress: safeBuyer.walletAddress,
      sellerWalletAddress: safeSeller.walletAddress,
      buyer: {
        id: safeBuyer.id?.toString(),
        walletAddress: safeBuyer.walletAddress,
        handle: safeBuyer.handle,
        displayName: safeBuyer.displayName,
        avatar: safeBuyer.avatarCid ? `https://ipfs.io/ipfs/${safeBuyer.avatarCid}` : undefined,
        address: safeBuyer.billingAddress1 ? {
          street: safeBuyer.billingAddress1 + (safeBuyer.billingAddress2 ? ` ${safeBuyer.billingAddress2}` : ''),
          city: safeBuyer.billingCity || '',
          state: safeBuyer.billingState || '',
          postalCode: safeBuyer.billingZipCode || '',
          country: safeBuyer.billingCountry || ''
        } : undefined
      },
      seller: {
        id: safeSeller.id?.toString(),
        walletAddress: safeSeller.walletAddress,
        handle: safeSeller.handle,
        displayName: safeSeller.displayName,
        avatar: safeSeller.avatarCid ? `https://ipfs.io/ipfs/${safeSeller.avatarCid}` : undefined,
        address: sellerProfile ? {
          street: sellerProfile.registeredAddressStreet || sellerProfile.businessAddress || safeSeller.billingAddress1 || '',
          city: sellerProfile.registeredAddressCity || safeSeller.billingCity || '',
          state: sellerProfile.registeredAddressState || safeSeller.billingState || '',
          postalCode: sellerProfile.registeredAddressPostalCode || safeSeller.billingZipCode || '',
          country: sellerProfile.registeredAddressCountry || safeSeller.billingCountry || ''
        } : (safeSeller.billingAddress1 ? {
          street: safeSeller.billingAddress1 + (safeSeller.billingAddress2 ? ` ${safeSeller.billingAddress2}` : ''),
          city: safeSeller.billingCity || '',
          state: safeSeller.billingState || '',
          postalCode: safeSeller.billingZipCode || '',
          country: safeSeller.billingCountry || ''
        } : undefined)
      },
      escrowId,
      amount: dbOrder.amount,
      total: orderTotal,
      paymentToken: dbOrder.paymentToken || '',
      currency: dbOrder.paymentToken || 'USD',
      orderMetadata: typeof dbOrder.orderMetadata === 'string' ? JSON.parse(dbOrder.orderMetadata) : dbOrder.orderMetadata,
      metadata: dbOrder.metadata,
      status: (dbOrder.status?.toUpperCase() as OrderStatus) || OrderStatus.CREATED,
      createdAt: dbOrder.createdAt?.toISOString() || new Date().toISOString(),
      shippingAddress: this.formatAddress(dbOrder.shippingAddress) || this.formatShippingAddress(dbOrder), // Try JSON first, fallback to columns
      billingAddress: this.formatAddress(dbOrder.billingAddress),
      paymentDetails: typeof dbOrder.paymentDetails === 'string' ? JSON.parse(dbOrder.paymentDetails) : dbOrder.paymentDetails,
      items,
      product: product ? {
        id: product.id?.toString() || '',
        title: product.title || 'Unknown Product',
        description: product.description || '',
        image: productImage,
        category: product.mainCategory || product.categoryId || '',
        quantity: dbOrder.quantity || 1,
        unitPrice: items.length > 0 ? items[0].price : orderTotal,
        totalPrice: orderTotal,
        isPhysical: product.isPhysical ?? false,
        isService: product.isService ?? false,
        serviceType: product.serviceType,
        serviceDurationMinutes: product.serviceDurationMinutes
      } : undefined,
      // Service delivery fields
      isServiceOrder,
      serviceStatus: dbOrder.serviceStatus || 'pending',
      serviceSchedule: dbOrder.scheduledDate ? {
        scheduledDate: dbOrder.scheduledDate,
        scheduledTime: dbOrder.scheduledTime || '',
        timezone: dbOrder.scheduledTimezone || 'UTC',
        notes: dbOrder.serviceNotes
      } : undefined,
      serviceDeliverables,
      serviceCompletedAt: dbOrder.serviceCompletedAt?.toISOString(),
      buyerConfirmedAt: dbOrder.buyerConfirmedAt?.toISOString(),
      serviceNotes: dbOrder.serviceNotes,

      // Tracking Info
      trackingNumber: dbOrder.trackingNumber || dbOrder.tracking_number,
      trackingCarrier: dbOrder.trackingCarrier || dbOrder.tracking_carrier,
      trackingUrl: this.getTrackingUrl(dbOrder.trackingNumber || dbOrder.tracking_number, dbOrder.trackingCarrier || dbOrder.tracking_carrier),

      // Financial Details
      taxAmount: dbOrder.taxAmount,
      shippingCost: dbOrder.shippingCost,
      platformFee: dbOrder.platformFee,
      netRevenue: (parseFloat(dbOrder.amount || '0') - parseFloat(dbOrder.platformFee || '0')).toString()
    };
  }

  private getTrackingUrl(trackingNumber?: string, carrier?: string): string | undefined {
    if (!trackingNumber) return undefined;

    const c = (carrier || '').toLowerCase();
    if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    if (c.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;

    return undefined;
  }

  private formatAddress(addressData: any) {
    if (!addressData) return undefined;
    try {
      const address = typeof addressData === 'string' ? JSON.parse(addressData) : addressData;
      return {
        name: address.fullName || address.name || '',
        street: address.addressLine1 || address.street || '',
        city: address.city || '',
        state: address.state || '',
        postalCode: address.postalCode || '',
        country: address.country || '',
        phone: address.phoneNumber || address.phone
      };
    } catch (e) {
      return undefined;
    }
  }

  private formatShippingAddress(dbOrder: any) {
    // Prefer new individual columns if available
    if (dbOrder.shippingStreet) {
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

    // Fallback to old legacy fields if they exist
    if (dbOrder.shippingStreet) return undefined; // Should be caught above, but just in case

    return undefined;
  }

  private async updateOrderShipping(orderId: string, shippingAddress: any): Promise<void> {
    await databaseService.updateOrder(orderId, {
      shippingStreet: shippingAddress.street,
      shippingCity: shippingAddress.city,
      shippingState: shippingAddress.state,
      shippingPostalCode: shippingAddress.postalCode,
      shippingCountry: shippingAddress.country,
      shippingName: shippingAddress.name,
      shippingPhone: shippingAddress.phone
    });
  }

  private async createOrderEvent(orderId: string, eventType: string, description: string, metadata?: any): Promise<void> {
    await databaseService.createOrderEvent(orderId, eventType, description, metadata ? JSON.stringify(metadata) : undefined);
  }

  private async handleStatusChangeNotifications(orderId: string, status: OrderStatus): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) return;

    switch (status) {
      case OrderStatus.PAID:
        await notificationService.sendOrderNotification(order.sellerWalletAddress, 'PAYMENT_RECEIVED', orderId, { recipientType: 'seller' });
        break;
      case OrderStatus.PROCESSING:
        await notificationService.sendOrderNotification(order.buyerWalletAddress, 'ORDER_PROCESSING', orderId, { recipientType: 'buyer' });
        break;
      case OrderStatus.SHIPPED:
        await notificationService.sendOrderNotification(order.buyerWalletAddress, 'ORDER_SHIPPED', orderId, { recipientType: 'buyer' });
        break;
      case OrderStatus.DELIVERED:
        await Promise.all([
          notificationService.sendOrderNotification(order.buyerWalletAddress, 'ORDER_DELIVERED', orderId, { recipientType: 'buyer' }),
          notificationService.sendOrderNotification(order.sellerWalletAddress, 'ORDER_DELIVERED', orderId, { recipientType: 'seller' })
        ]);
        break;
      case OrderStatus.COMPLETED:
        await Promise.all([
          notificationService.sendOrderNotification(order.buyerWalletAddress, 'ORDER_COMPLETED', orderId, { recipientType: 'buyer' }),
          notificationService.sendOrderNotification(order.sellerWalletAddress, 'ORDER_COMPLETED', orderId, { recipientType: 'seller' })
        ]);
        break;
      case OrderStatus.DISPUTED:
        await Promise.all([
          notificationService.sendOrderNotification(order.buyerWalletAddress, 'DISPUTE_INITIATED', orderId, { recipientType: 'buyer' }),
          notificationService.sendOrderNotification(order.sellerWalletAddress, 'DISPUTE_INITIATED', orderId, { recipientType: 'seller' })
        ]);
        break;
      case OrderStatus.CANCELLATION_REQUESTED:
        await Promise.all([
          notificationService.sendOrderNotification(order.buyerWalletAddress, 'CANCELLATION_REQUESTED', orderId, { recipientType: 'buyer' }),
          notificationService.sendOrderNotification(order.sellerWalletAddress, 'CANCELLATION_REQUESTED', orderId, { recipientType: 'seller' })
        ]);
        break;
      case OrderStatus.CANCELLED:
        await Promise.all([
          notificationService.sendOrderNotification(order.buyerWalletAddress, 'CANCELLATION_APPROVED', orderId, { recipientType: 'buyer' }),
          notificationService.sendOrderNotification(order.sellerWalletAddress, 'CANCELLATION_APPROVED', orderId, { recipientType: 'seller' })
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
          await receiptService.generateReceipt({
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
          // Normalize status comparison to handle case differences
          const normalizedStatus = (currentOrder?.status || '').toUpperCase();
          if (normalizedStatus === OrderStatus.DELIVERED) {
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

  /**
   * Release inventory hold for an order
   * Called when order is cancelled or refunded
   */
  private async releaseOrderInventory(orderId: string, reason: 'order_cancelled' | 'order_completed' | 'expired'): Promise<void> {
    try {
      // Find the inventory hold associated with this order
      const inventoryHold = await databaseService.getInventoryHoldByOrderId(orderId);

      if (inventoryHold) {
        await databaseService.releaseInventoryHold(inventoryHold.id, reason);
        safeLogger.info('Released inventory hold for order', { orderId, holdId: inventoryHold.id, reason });
      } else {
        safeLogger.warn('No inventory hold found for order', { orderId });
      }
    } catch (error) {
      safeLogger.error('Error releasing inventory for order:', { orderId, reason, error });
      throw error;
    }
  }
}

export const orderService = new OrderService();
