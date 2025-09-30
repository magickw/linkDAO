/**
 * Order Tracking Service - Business logic for order tracking and display system
 * Features: Order history, search, filtering, timeline, and notifications
 */

import { DatabaseService } from './databaseService';
import { UserProfileService } from './userProfileService';
import { NotificationService } from './notificationService';
import { OrderService } from './orderService';
import { 
  MarketplaceOrder, 
  OrderStatus, 
  OrderEvent,
  OrderAnalytics
} from '../models/Order';
import { AppError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

export class OrderTrackingService {
  private databaseService: DatabaseService;
  private userProfileService: UserProfileService;
  private notificationService: NotificationService;
  private orderService: OrderService;

  constructor() {
    this.databaseService = new DatabaseService();
    this.userProfileService = new UserProfileService();
    this.notificationService = new NotificationService();
    this.orderService = new OrderService();
  }

  /**
   * Get order history for a user with pagination and filtering
   */
  async getOrderHistory(
    userAddress: string,
    userType: 'buyer' | 'seller',
    page: number = 1,
    limit: number = 20,
    filters: any = {}
  ): Promise<{
    orders: MarketplaceOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // Get user profile
      const user = await this.userProfileService.getProfileByAddress(userAddress);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Build query conditions
      const conditions: any = {};
      
      if (userType === 'buyer') {
        conditions.buyerId = user.id;
      } else {
        conditions.sellerId = user.id;
      }

      // Apply filters
      if (filters.status) {
        conditions.status = filters.status.toLowerCase();
      }
      
      if (filters.dateFrom || filters.dateTo) {
        conditions.createdAt = {};
        if (filters.dateFrom) {
          conditions.createdAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          conditions.createdAt.lte = new Date(filters.dateTo);
        }
      }

      if (filters.paymentMethod) {
        conditions.paymentMethod = filters.paymentMethod;
      }

      if (filters.minAmount || filters.maxAmount) {
        conditions.amount = {};
        if (filters.minAmount) {
          conditions.amount.gte = filters.minAmount.toString();
        }
        if (filters.maxAmount) {
          conditions.amount.lte = filters.maxAmount.toString();
        }
      }

      // Get orders with pagination
      const offset = (page - 1) * limit;
      const dbOrders = await this.databaseService.getOrdersWithFilters(
        conditions,
        limit,
        offset,
        'created_at DESC'
      );

      const total = await this.databaseService.countOrdersWithFilters(conditions);

      // Format orders
      const orders: MarketplaceOrder[] = [];
      for (const dbOrder of dbOrders) {
        const [buyer, seller] = await Promise.all([
          this.userProfileService.getProfileById(dbOrder.buyerId || ''),
          this.userProfileService.getProfileById(dbOrder.sellerId || '')
        ]);

        if (buyer && seller) {
          const formattedOrder = await this.formatOrder(dbOrder, buyer, seller);
          
          // Apply additional filters that require formatted data
          if (filters.hasDispute !== undefined) {
            const hasDispute = !!formattedOrder.disputeId;
            if (filters.hasDispute !== hasDispute) continue;
          }

          if (filters.hasTracking !== undefined) {
            const hasTracking = !!formattedOrder.trackingNumber;
            if (filters.hasTracking !== hasTracking) continue;
          }

          orders.push(formattedOrder);
        }
      }

      return {
        orders,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error getting order history:', error);
      throw error;
    }
  }

  /**
   * Get detailed order information by ID
   */
  async getOrderById(orderId: string, userAddress: string): Promise<MarketplaceOrder | null> {
    try {
      const dbOrder = await this.databaseService.getOrderById(parseInt(orderId));
      if (!dbOrder) return null;

      // Verify user has access to this order
      const user = await this.userProfileService.getProfileByAddress(userAddress);
      if (!user) {
        throw new ForbiddenError('User not found');
      }

      const isBuyer = dbOrder.buyerId === user.id;
      const isSeller = dbOrder.sellerId === user.id;
      
      if (!isBuyer && !isSeller) {
        throw new ForbiddenError('Access denied to this order');
      }

      const [buyer, seller] = await Promise.all([
        this.userProfileService.getProfileById(dbOrder.buyerId || ''),
        this.userProfileService.getProfileById(dbOrder.sellerId || '')
      ]);

      if (!buyer || !seller) return null;

      return await this.formatOrder(dbOrder, buyer, seller);
    } catch (error) {
      console.error('Error getting order by ID:', error);
      throw error;
    }
  }

  /**
   * Get order timeline/events
   */
  async getOrderTimeline(orderId: string, userAddress: string): Promise<OrderEvent[]> {
    try {
      // Verify user has access to this order
      const order = await this.getOrderById(orderId, userAddress);
      if (!order) {
        throw new NotFoundError('Order not found or access denied');
      }

      const events = await this.databaseService.getOrderEvents(parseInt(orderId));
      return events.map(event => ({
        id: event.id.toString(),
        orderId: event.orderId?.toString() || orderId,
        eventType: event.eventType,
        description: event.description || '',
        metadata: event.metadata ? JSON.parse(event.metadata) : undefined,
        timestamp: event.timestamp?.toISOString() || new Date().toISOString(),
        userType: this.determineUserTypeFromEvent(event.eventType)
      }));
    } catch (error) {
      console.error('Error getting order timeline:', error);
      throw error;
    }
  }

  /**
   * Search orders with advanced filtering
   */
  async searchOrders(
    userAddress: string,
    query: any,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    orders: MarketplaceOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // Build search conditions
      const filters = query.filters || {};
      
      // Add text search if provided
      if (query.text) {
        // This would require full-text search implementation
        // For now, we'll search in order IDs and product titles
        filters.searchText = query.text;
      }

      if (query.orderId) {
        filters.orderId = query.orderId;
      }

      if (query.trackingNumber) {
        filters.trackingNumber = query.trackingNumber;
      }

      // Use the existing getOrderHistory method with enhanced filters
      return await this.getOrderHistory(userAddress, 'buyer', page, limit, filters);
    } catch (error) {
      console.error('Error searching orders:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    userAddress: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Verify user has permission to update this order
      const order = await this.getOrderById(orderId, userAddress);
      if (!order) {
        throw new NotFoundError('Order not found or access denied');
      }

      // Check if user is the seller (only sellers can update status in most cases)
      const user = await this.userProfileService.getProfileByAddress(userAddress);
      if (!user) {
        throw new ForbiddenError('User not found');
      }

      const dbOrder = await this.databaseService.getOrderById(parseInt(orderId));
      if (!dbOrder || dbOrder.sellerId !== user.id) {
        throw new ForbiddenError('Only sellers can update order status');
      }

      // Update order status
      await this.databaseService.updateOrder(parseInt(orderId), { 
        status: status.toLowerCase() 
      });

      // Create order event
      await this.databaseService.createOrderEvent(
        parseInt(orderId),
        `STATUS_CHANGED_${status}`,
        `Order status changed to ${status}`,
        metadata ? JSON.stringify(metadata) : undefined
      );

      // Send notifications
      await this.notificationService.sendOrderNotification(
        order.buyerWalletAddress,
        'ORDER_STATUS_UPDATED',
        orderId,
        { status, metadata }
      );
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Add tracking information to order
   */
  async addTrackingInfo(
    orderId: string,
    trackingNumber: string,
    carrier: string,
    userAddress: string,
    estimatedDelivery?: string
  ): Promise<void> {
    try {
      // Verify user has permission to add tracking
      const order = await this.getOrderById(orderId, userAddress);
      if (!order) {
        throw new NotFoundError('Order not found or access denied');
      }

      const user = await this.userProfileService.getProfileByAddress(userAddress);
      if (!user) {
        throw new ForbiddenError('User not found');
      }

      const dbOrder = await this.databaseService.getOrderById(parseInt(orderId));
      if (!dbOrder || dbOrder.sellerId !== user.id) {
        throw new ForbiddenError('Only sellers can add tracking information');
      }

      // Update order with tracking info
      const updateData: any = {
        trackingNumber,
        trackingCarrier: carrier
      };

      if (estimatedDelivery) {
        updateData.estimatedDelivery = new Date(estimatedDelivery);
      }

      await this.databaseService.updateOrder(parseInt(orderId), updateData);

      // Create tracking record
      await this.databaseService.createTrackingRecord(
        parseInt(orderId),
        trackingNumber,
        carrier
      );

      // Create order event
      await this.databaseService.createOrderEvent(
        parseInt(orderId),
        'SHIPPING_ADDED',
        `Tracking information added: ${carrier} - ${trackingNumber}`,
        JSON.stringify({ trackingNumber, carrier, estimatedDelivery })
      );

      // Send notification to buyer
      await this.notificationService.sendOrderNotification(
        order.buyerWalletAddress,
        'TRACKING_ADDED',
        orderId,
        { trackingNumber, carrier }
      );
    } catch (error) {
      console.error('Error adding tracking info:', error);
      throw error;
    }
  }

  /**
   * Confirm delivery
   */
  async confirmDelivery(
    orderId: string,
    userAddress: string,
    deliveryInfo?: any
  ): Promise<void> {
    try {
      // Verify user has permission to confirm delivery
      const order = await this.getOrderById(orderId, userAddress);
      if (!order) {
        throw new NotFoundError('Order not found or access denied');
      }

      const user = await this.userProfileService.getProfileByAddress(userAddress);
      if (!user) {
        throw new ForbiddenError('User not found');
      }

      const dbOrder = await this.databaseService.getOrderById(parseInt(orderId));
      if (!dbOrder || dbOrder.buyerId !== user.id) {
        throw new ForbiddenError('Only buyers can confirm delivery');
      }

      // Update order status to delivered
      await this.databaseService.updateOrder(parseInt(orderId), {
        status: 'delivered',
        actualDelivery: new Date(),
        deliveryConfirmation: deliveryInfo ? JSON.stringify(deliveryInfo) : undefined
      });

      // Create order event
      await this.databaseService.createOrderEvent(
        parseInt(orderId),
        'DELIVERY_CONFIRMED',
        'Delivery confirmed by buyer',
        deliveryInfo ? JSON.stringify(deliveryInfo) : undefined
      );

      // Send notification to seller
      await this.notificationService.sendOrderNotification(
        order.sellerWalletAddress,
        'DELIVERY_CONFIRMED',
        orderId,
        deliveryInfo
      );

      // Start auto-completion timer (handled by OrderService)
      // This would typically trigger payment release after a delay
    } catch (error) {
      console.error('Error confirming delivery:', error);
      throw error;
    }
  }

  /**
   * Get order statistics for dashboard
   */
  async getOrderStatistics(
    userAddress: string,
    userType: 'buyer' | 'seller',
    timeframe: 'week' | 'month' | 'year'
  ): Promise<{
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    disputedOrders: number;
    totalValue: number;
    averageOrderValue: number;
    completionRate: number;
    statusBreakdown: Record<string, number>;
  }> {
    try {
      const user = await this.userProfileService.getProfileByAddress(userAddress);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const analytics = await this.databaseService.getOrderAnalytics(user.id, timeframe);
      
      return {
        totalOrders: analytics.totalOrders || 0,
        completedOrders: analytics.completedOrders || 0,
        pendingOrders: analytics.pendingOrders || 0,
        disputedOrders: analytics.disputedOrders || 0,
        totalValue: parseFloat(analytics.totalVolume || '0'),
        averageOrderValue: parseFloat(analytics.averageOrderValue || '0'),
        completionRate: analytics.completionRate || 0,
        statusBreakdown: analytics.statusBreakdown || {}
      };
    } catch (error) {
      console.error('Error getting order statistics:', error);
      throw error;
    }
  }

  /**
   * Get tracking information for an order
   */
  async getTrackingInfo(orderId: string, userAddress: string): Promise<any> {
    try {
      // Verify user has access to this order
      const order = await this.getOrderById(orderId, userAddress);
      if (!order) {
        throw new NotFoundError('Order not found or access denied');
      }

      if (!order.trackingNumber) {
        return null;
      }

      // Get tracking record from database
      const trackingRecord = await this.databaseService.getTrackingRecord(parseInt(orderId));
      
      if (!trackingRecord) {
        return {
          trackingNumber: order.trackingNumber,
          carrier: order.trackingCarrier,
          status: 'UNKNOWN',
          events: []
        };
      }

      return {
        trackingNumber: trackingRecord.trackingNumber,
        carrier: trackingRecord.carrier,
        status: trackingRecord.status || 'UNKNOWN',
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        events: trackingRecord.events ? JSON.parse(trackingRecord.events) : []
      };
    } catch (error) {
      console.error('Error getting tracking info:', error);
      throw error;
    }
  }

  /**
   * Export order history
   */
  async exportOrderHistory(
    userAddress: string,
    userType: 'buyer' | 'seller',
    format: 'csv' | 'json',
    filters: any = {}
  ): Promise<string> {
    try {
      // Get all orders (no pagination for export)
      const result = await this.getOrderHistory(userAddress, userType, 1, 10000, filters);
      
      if (format === 'json') {
        return JSON.stringify(result.orders, null, 2);
      }

      // Generate CSV
      const headers = [
        'Order ID',
        'Product Title',
        'Status',
        'Amount',
        'Currency',
        'Payment Method',
        'Created Date',
        'Tracking Number',
        'Carrier'
      ];

      const rows = result.orders.map(order => [
        order.id,
        order.product?.title || 'N/A',
        order.status,
        order.totalAmount || order.amount,
        order.currency || 'USD',
        order.paymentMethod || 'N/A',
        new Date(order.createdAt).toLocaleDateString(),
        order.trackingNumber || 'N/A',
        order.trackingCarrier || 'N/A'
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting order history:', error);
      throw error;
    }
  }

  /**
   * Get order notifications
   */
  async getOrderNotifications(
    userAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const notifications = await this.notificationService.getUserNotifications(
        userAddress,
        limit,
        offset
      );

      const unreadCount = await this.notificationService.getUnreadCount(userAddress);

      return {
        notifications: notifications || [],
        total: notifications?.length || 0,
        unreadCount: unreadCount || 0
      };
    } catch (error) {
      console.error('Error getting order notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userAddress: string): Promise<void> {
    try {
      await this.notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Get order status counts for dashboard
   */
  async getOrderStatusCounts(
    userAddress: string,
    userType: 'buyer' | 'seller'
  ): Promise<Record<string, number>> {
    try {
      const user = await this.userProfileService.getProfileByAddress(userAddress);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      return await this.databaseService.getOrderStatusCounts(user.id, userType);
    } catch (error) {
      console.error('Error getting order status counts:', error);
      throw error;
    }
  }

  /**
   * Bulk update order statuses
   */
  async bulkUpdateOrderStatus(
    orderIds: string[],
    status: OrderStatus,
    userAddress: string,
    metadata?: any
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ orderId: string; error: string }>;
  }> {
    try {
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as Array<{ orderId: string; error: string }>
      };

      for (const orderId of orderIds) {
        try {
          await this.updateOrderStatus(orderId, status, userAddress, metadata);
          results.successful++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            orderId,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error bulk updating order status:', error);
      throw error;
    }
  }

  /**
   * Get order trends and analytics
   */
  async getOrderTrends(
    userAddress: string,
    userType: 'buyer' | 'seller',
    period: string,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<any> {
    try {
      const user = await this.userProfileService.getProfileByAddress(userAddress);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // This would require more complex analytics implementation
      // For now, return basic trend data
      return {
        period,
        groupBy,
        trends: [],
        summary: {
          totalOrders: 0,
          totalValue: 0,
          averageOrderValue: 0,
          growthRate: 0
        }
      };
    } catch (error) {
      console.error('Error getting order trends:', error);
      throw error;
    }
  }

  // Private helper methods

  private async formatOrder(dbOrder: any, buyer: any, seller: any): Promise<MarketplaceOrder> {
    // Get product information
    const product = await this.getProductInfo(dbOrder.listingId);
    
    return {
      id: dbOrder.id.toString(),
      listingId: dbOrder.listingId?.toString() || '',
      buyerWalletAddress: buyer.walletAddress,
      sellerWalletAddress: seller.walletAddress,
      escrowId: dbOrder.escrowId?.toString(),
      amount: dbOrder.amount,
      paymentToken: dbOrder.paymentToken || '',
      status: (dbOrder.status?.toUpperCase() as OrderStatus) || OrderStatus.CREATED,
      createdAt: dbOrder.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: dbOrder.updatedAt?.toISOString(),
      shippingAddress: this.formatShippingAddress(dbOrder),
      trackingNumber: dbOrder.trackingNumber,
      trackingCarrier: dbOrder.trackingCarrier,
      estimatedDelivery: dbOrder.estimatedDelivery?.toISOString(),
      actualDelivery: dbOrder.actualDelivery?.toISOString(),
      deliveryConfirmation: dbOrder.deliveryConfirmation,
      paymentMethod: dbOrder.paymentMethod as any,
      paymentConfirmationHash: dbOrder.paymentConfirmationHash,
      escrowContractAddress: dbOrder.escrowContractAddress,
      totalAmount: parseFloat(dbOrder.totalAmount || dbOrder.amount || '0'),
      currency: dbOrder.currency || 'USD',
      orderNotes: dbOrder.orderNotes,
      orderMetadata: dbOrder.orderMetadata ? JSON.parse(dbOrder.orderMetadata) : undefined,
      product: product || {
        id: dbOrder.listingId?.toString() || '',
        title: 'Unknown Product',
        description: '',
        image: '',
        category: '',
        quantity: 1,
        unitPrice: parseFloat(dbOrder.amount || '0'),
        totalPrice: parseFloat(dbOrder.amount || '0')
      }
    };
  }

  private formatShippingAddress(dbOrder: any) {
    if (!dbOrder.shippingAddress) return undefined;
    
    try {
      return JSON.parse(dbOrder.shippingAddress);
    } catch {
      return undefined;
    }
  }

  private async getProductInfo(listingId: number): Promise<any> {
    try {
      // This would fetch product information from the listings/products table
      // For now, return a placeholder
      return {
        id: listingId.toString(),
        title: 'Product Title',
        description: 'Product Description',
        image: '/images/placeholder.jpg',
        category: 'General',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      };
    } catch (error) {
      return null;
    }
  }

  private determineUserTypeFromEvent(eventType: string): 'buyer' | 'seller' | 'system' {
    const sellerEvents = ['SHIPPING_ADDED', 'ORDER_SHIPPED', 'STATUS_CHANGED'];
    const buyerEvents = ['DELIVERY_CONFIRMED', 'DISPUTE_INITIATED'];
    
    if (sellerEvents.some(event => eventType.includes(event))) {
      return 'seller';
    }
    
    if (buyerEvents.some(event => eventType.includes(event))) {
      return 'buyer';
    }
    
    return 'system';
  }
}