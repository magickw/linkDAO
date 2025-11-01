import { eq, and, desc, sql, gte, lte, count, or } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db/connection';
import { 
  orders,
  orderEvents,
  trackingRecords,
  marketplaceListings,
  users,
  sellers,
  paymentTransactions,
  orderPaymentEvents
} from '../db/schema';
import { transactionService } from './transactionService';

export interface OrderManagementData {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerAddress: string;
  sellerAddress: string;
  buyerName?: string;
  sellerName?: string;
  amount: string;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentStatus?: string;
  shippingAddress?: any;
  billingAddress?: any;
  trackingNumber?: string;
  trackingCarrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  orderNotes?: string;
  paymentConfirmationHash?: string;
  escrowContractAddress?: string;
  totalAmount: string;
  orderMetadata?: any;
  createdAt: string;
  events: OrderEventData[];
  paymentTransactions: PaymentTransactionData[];
}

export interface OrderEventData {
  id: string;
  eventType: string;
  description: string;
  metadata?: any;
  timestamp: string;
}

export interface PaymentTransactionData {
  id: string;
  paymentMethod: string;
  amount: string;
  currency: string;
  status: string;
  transactionHash?: string;
  paymentIntentId?: string;
  escrowId?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface RecentOrder {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: string;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

export interface OrderSearchFilters {
  orderId?: string;
  buyerAddress?: string;
  sellerAddress?: string;
  status?: string;
  paymentMethod?: string;
  trackingNumber?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchOrdersResult {
  orders: RecentOrder[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface OrderAnalytics {
  totalOrders: number;
  ordersByStatus: Array<{ status: string; count: number; percentage: number }>;
  ordersByPaymentMethod: Array<{ method: string; count: number; volume: string }>;
  totalRevenue: string;
  avgOrderValue: string;
  topCategories: Array<{ category: string; count: number }>;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

class OrderManagementService {

  /**
   * Get comprehensive order details with events and payment history
   */
  async getOrderDetails(orderId: string): Promise<OrderManagementData | null> {
    try {
      // Get order with related data
      const orderResult = await db
        .select({
          orderId: orders.id,
          listingId: orders.listingId,
          listingTitle: marketplaceListings.title,
          sellerAddress: marketplaceListings.sellerAddress,
          buyerAddress: sql<string>`buyer_user.wallet_address`,
          buyerName: sql<string>`buyer_seller.display_name`,
          sellerName: sql<string>`seller_seller.display_name`,
          amount: orders.amount,
          totalAmount: orders.totalAmount,
          currency: orders.currency,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          paymentDetails: orders.paymentDetails,
          shippingAddress: orders.shippingAddress,
          billingAddress: orders.billingAddress,
          orderNotes: orders.orderNotes,
          trackingNumber: orders.trackingNumber,
          trackingCarrier: orders.trackingCarrier,
          estimatedDelivery: orders.estimatedDelivery,
          actualDelivery: orders.actualDelivery,
          paymentConfirmationHash: orders.paymentConfirmationHash,
          escrowContractAddress: orders.escrowContractAddress,
          orderMetadata: orders.orderMetadata,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users, eq(orders.buyerId, users.id))
        .leftJoin(sellers, eq(sql`buyer_user.wallet_address`, sellers.walletAddress))
        .leftJoin(sellers, eq(marketplaceListings.sellerAddress, sellers.walletAddress))
        .where(eq(orders.id, parseInt(orderId)))
        .limit(1);

      if (orderResult.length === 0) {
        return null;
      }

      const order = orderResult[0];

      // Get order events
      const events = await db
        .select()
        .from(orderEvents)
        .where(eq(orderEvents.orderId, parseInt(orderId)))
        .orderBy(desc(orderEvents.timestamp));

      // Get payment transactions
      const payments = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.orderId, parseInt(orderId)))
        .orderBy(desc(paymentTransactions.createdAt));

      return {
        id: order.orderId.toString(),
        listingId: order.listingId?.toString() || '',
        listingTitle: order.listingTitle || 'Unknown Item',
        buyerAddress: order.buyerAddress || '',
        sellerAddress: order.sellerAddress || '',
        buyerName: order.buyerName || undefined,
        sellerName: order.sellerName || undefined,
        amount: order.amount || '0',
        currency: order.currency || 'USD',
        status: order.status || 'pending',
        paymentMethod: order.paymentMethod || 'crypto',
        shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : undefined,
        billingAddress: order.billingAddress ? JSON.parse(order.billingAddress) : undefined,
        trackingNumber: order.trackingNumber || undefined,
        trackingCarrier: order.trackingCarrier || undefined,
        estimatedDelivery: order.estimatedDelivery?.toISOString(),
        actualDelivery: order.actualDelivery?.toISOString(),
        orderNotes: order.orderNotes || undefined,
        paymentConfirmationHash: order.paymentConfirmationHash || undefined,
        escrowContractAddress: order.escrowContractAddress || undefined,
        totalAmount: order.totalAmount || '0',
        orderMetadata: order.orderMetadata ? JSON.parse(order.orderMetadata) : undefined,
        createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
        events: events.map(event => ({
          id: event.id.toString(),
          eventType: event.eventType,
          description: event.description || '',
          metadata: event.metadata ? JSON.parse(event.metadata) : undefined,
          timestamp: event.timestamp?.toISOString() || new Date().toISOString(),
        })),
        paymentTransactions: payments.map(payment => ({
          id: payment.id,
          paymentMethod: payment.paymentMethod,
          amount: payment.amount || '0',
          currency: payment.currency || 'USD',
          status: payment.status || 'pending',
          transactionHash: payment.transactionHash || undefined,
          paymentIntentId: payment.paymentIntentId || undefined,
          escrowId: payment.escrowId || undefined,
          createdAt: payment.createdAt?.toISOString() || new Date().toISOString(),
          confirmedAt: payment.confirmedAt?.toISOString(),
        })),
      };
    } catch (error) {
      safeLogger.error('Error getting order details:', error);
      throw error;
    }
  }

  /**
   * Get orders for a specific user (buyer or seller)
   */
  async getUserOrders(
    walletAddress: string,
    role: 'buyer' | 'seller' | 'both' = 'both',
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<OrderManagementData[]> {
    try {
      let whereConditions = [];

      // Build role-based conditions
      if (role === 'buyer' || role === 'both') {
        whereConditions.push(sql`users.wallet_address = ${walletAddress}`);
      }
      if (role === 'seller' || role === 'both') {
        whereConditions.push(eq(marketplaceListings.sellerAddress, walletAddress));
      }

      let query = db
        .select({
          orderId: orders.id,
          listingId: orders.listingId,
          listingTitle: marketplaceListings.title,
          sellerAddress: marketplaceListings.sellerAddress,
          buyerAddress: sql<string>`users.wallet_address`,
          buyerName: sql<string>`sellers.display_name`,
          sellerName: sql<string>`sellers.display_name`,
          amount: orders.amount,
          totalAmount: orders.totalAmount,
          currency: orders.currency,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          trackingNumber: orders.trackingNumber,
          trackingCarrier: orders.trackingCarrier,
          estimatedDelivery: orders.estimatedDelivery,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users, eq(orders.buyerId, users.id))
        .leftJoin(sellers, eq(sql`users.wallet_address`, sellers.walletAddress))
        .leftJoin(sellers, eq(marketplaceListings.sellerAddress, sellers.walletAddress));

      // Apply role conditions
      if (whereConditions.length === 1) {
        // @ts-ignore - Fix for drizzle-orm typing issue
        query = query.where(whereConditions[0]);
      } else if (whereConditions.length > 1) {
        // @ts-ignore - Fix for drizzle-orm typing issue
        query = query.where(or(...whereConditions));
      }

      // Apply status filter
      if (status) {
        // @ts-ignore - Fix for drizzle-orm typing issue
        query = query.where(and(
          whereConditions.length > 0 ? or(...whereConditions) : sql`1=1`,
          eq(orders.status, status)
        ));
      }

      const orderResults = await query
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

      // Get events and payments for each order (simplified for performance)
      const ordersWithDetails: OrderManagementData[] = [];

      for (const order of orderResults) {
        ordersWithDetails.push({
          id: order.orderId.toString(),
          listingId: order.listingId?.toString() || '',
          listingTitle: order.listingTitle || 'Unknown Item',
          buyerAddress: order.buyerAddress || '',
          sellerAddress: order.sellerAddress || '',
          buyerName: order.buyerName || undefined,
          sellerName: order.sellerName || undefined,
          amount: order.amount || '0',
          currency: order.currency || 'USD',
          status: order.status || 'pending',
          paymentMethod: order.paymentMethod || 'crypto',
          trackingNumber: order.trackingNumber || undefined,
          trackingCarrier: order.trackingCarrier || undefined,
          estimatedDelivery: order.estimatedDelivery?.toISOString(),
          totalAmount: order.totalAmount || '0',
          createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
          events: [], // Simplified - can be loaded separately if needed
          paymentTransactions: [], // Simplified - can be loaded separately if needed
        });
      }

      return ordersWithDetails;
    } catch (error) {
      safeLogger.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Update order status and record transaction
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: string,
    updatedBy: string,
    notes?: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      // Get current order
      const order = await this.getOrderDetails(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update order status
      await db
        .update(orders)
        .set({ status: newStatus })
        .where(eq(orders.id, parseInt(orderId)));

      // Create order event
      await db.insert(orderEvents).values({
        orderId: parseInt(orderId),
        eventType: `STATUS_CHANGED_${newStatus.toUpperCase()}`,
        description: `Order status changed to ${newStatus}${notes ? `: ${notes}` : ''}`,
        metadata: JSON.stringify({ 
          previousStatus: order.status, 
          newStatus, 
          updatedBy, 
          notes,
          ...metadata 
        }),
        timestamp: new Date(),
      });

      // Record transaction based on status change
      await this.handleStatusChangeTransaction(order, newStatus);

      return true;
    } catch (error) {
      safeLogger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Add tracking information to an order
   */
  async addOrderTracking(
    orderId: string,
    trackingNumber: string,
    carrier: string,
    estimatedDelivery?: Date
  ): Promise<boolean> {
    try {
      // Update order with tracking info
      await db
        .update(orders)
        .set({
          trackingNumber,
          trackingCarrier: carrier,
          estimatedDelivery,
          status: 'shipped'
        })
        .where(eq(orders.id, parseInt(orderId)));

      // Create tracking record
      await db.insert(trackingRecords).values({
        orderId: parseInt(orderId),
        trackingNumber,
        carrier,
        status: 'shipped',
        events: JSON.stringify([{
          status: 'shipped',
          description: 'Package shipped',
          timestamp: new Date().toISOString(),
        }]),
        createdAt: new Date(),
        lastUpdated: new Date(),
      });

      // Create order event
      await db.insert(orderEvents).values({
        orderId: parseInt(orderId),
        eventType: 'TRACKING_ADDED',
        description: `Tracking number ${trackingNumber} added for ${carrier}`,
        metadata: JSON.stringify({ trackingNumber, carrier, estimatedDelivery }),
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      safeLogger.error('Error adding order tracking:', error);
      throw error;
    }
  }

  /**
   * Get order analytics for a user or platform
   */
  async getOrderAnalytics(
    walletAddress?: string,
    role?: 'buyer' | 'seller',
    days: number = 90
  ): Promise<OrderAnalytics> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get basic statistics
      const totalOrdersResult = await db
        .select({ count: count() })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users, eq(orders.buyerId, users.id))
        .where(
          walletAddress && role === 'buyer' 
            ? sql`users.wallet_address = ${walletAddress}`
            : walletAddress && role === 'seller'
            ? eq(marketplaceListings.sellerAddress, walletAddress)
            : sql`1=1`
        );

      const totalOrders = totalOrdersResult[0]?.count || 0;

      // Orders by status
      const ordersByStatus = await db
        .select({
          status: orders.status,
          count: count(),
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users, eq(orders.buyerId, users.id))
        .where(
          walletAddress && role === 'buyer' 
            ? sql`users.wallet_address = ${walletAddress}`
            : walletAddress && role === 'seller'
            ? eq(marketplaceListings.sellerAddress, walletAddress)
            : sql`1=1`
        )
        .groupBy(orders.status);

      // Calculate percentages
      const statusWithPercentages = ordersByStatus.map(item => ({
        status: item.status || 'unknown',
        count: item.count,
        percentage: totalOrders > 0 ? Math.round((item.count / totalOrders) * 100) : 0,
      }));

      // Orders by payment method
      const ordersByPaymentMethodResult = await db
        .select({
          paymentMethod: orders.paymentMethod,
          count: count(),
          totalAmount: sql<number>`SUM(${orders.totalAmount})`,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users, eq(orders.buyerId, users.id))
        .where(
          walletAddress && role === 'buyer' 
            ? sql`users.wallet_address = ${walletAddress}`
            : walletAddress && role === 'seller'
            ? eq(marketplaceListings.sellerAddress, walletAddress)
            : sql`1=1`
        )
        .groupBy(orders.paymentMethod);

      // Format payment method data to match expected structure
      const formattedPaymentMethods = ordersByPaymentMethodResult.map(item => ({
        method: item.paymentMethod || 'unknown',
        count: item.count,
        volume: item.totalAmount?.toString() || '0',
      }));

      // Revenue analytics
      const revenueResult = await db
        .select({
          totalRevenue: sql<number>`SUM(${orders.totalAmount})`,
          avgOrderValue: sql<number>`AVG(${orders.totalAmount})`,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users, eq(orders.buyerId, users.id))
        .where(
          walletAddress && role === 'buyer' 
            ? sql`users.wallet_address = ${walletAddress}`
            : walletAddress && role === 'seller'
            ? eq(marketplaceListings.sellerAddress, walletAddress)
            : sql`1=1`
        );

      const totalRevenue = revenueResult[0]?.totalRevenue || 0;
      const avgOrderValue = revenueResult[0]?.avgOrderValue || 0;

      // Top selling categories (for sellers)
      let topCategories: Array<{ category: string; count: number }> = [];
      if (role === 'seller' && walletAddress) {
        const categoryResult = await db
          .select({
            category: marketplaceListings.category,
            count: count(),
          })
          .from(orders)
          .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
          .where(eq(marketplaceListings.sellerAddress, walletAddress))
          .groupBy(marketplaceListings.category)
          .orderBy(desc(count()))
          .limit(5);

        topCategories = categoryResult.map(item => ({
          category: item.category || 'Uncategorized',
          count: item.count,
        }));
      }

      return {
        totalOrders,
        ordersByStatus: statusWithPercentages,
        ordersByPaymentMethod: formattedPaymentMethods,
        totalRevenue: totalRevenue.toString(),
        avgOrderValue: avgOrderValue.toString(),
        topCategories,
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
      };
    } catch (error) {
      safeLogger.error('Error getting order analytics:', error);
      throw error;
    }
  }

  /**
   * Get recent orders with basic details
   */
  async getRecentOrders(
    walletAddress: string,
    role: 'buyer' | 'seller',
    limit: number = 10
  ): Promise<RecentOrder[]> {
    try {
      const ordersResult = await db
        .select({
          orderId: orders.id,
          listingId: orders.listingId,
          listingTitle: marketplaceListings.title,
          buyerAddress: sql<string>`users.wallet_address`,
          sellerAddress: marketplaceListings.sellerAddress,
          amount: orders.amount,
          currency: orders.currency,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users, eq(orders.buyerId, users.id))
        .where(
          role === 'buyer' 
            ? sql`users.wallet_address = ${walletAddress}`
            : eq(marketplaceListings.sellerAddress, walletAddress)
        )
        .orderBy(desc(orders.createdAt))
        .limit(limit);

      return ordersResult.map(order => ({
        id: order.orderId.toString(),
        listingId: order.listingId?.toString() || '',
        listingTitle: order.listingTitle || 'Unknown Item',
        buyerAddress: order.buyerAddress || '',
        sellerAddress: order.sellerAddress || '',
        amount: order.amount || '0',
        currency: order.currency || 'USD',
        status: order.status || 'pending',
        paymentMethod: order.paymentMethod || 'crypto',
        createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
      }));
    } catch (error) {
      safeLogger.error('Error getting recent orders:', error);
      throw error;
    }
  }

  /**
   * Search orders with filters
   */
  async searchOrders(
    filters: OrderSearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchOrdersResult> {
    try {
      // Build base query
      let query = db
        .select({
          orderId: orders.id,
          listingId: orders.listingId,
          listingTitle: marketplaceListings.title,
          buyerAddress: sql<string>`users.wallet_address`,
          sellerAddress: marketplaceListings.sellerAddress,
          amount: orders.amount,
          totalAmount: orders.totalAmount,
          currency: orders.currency,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          trackingNumber: orders.trackingNumber,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users, eq(orders.buyerId, users.id));

      // Apply filters
      const conditions = [];
      
      if (filters.orderId) {
        conditions.push(eq(orders.id, parseInt(filters.orderId)));
      }
      
      if (filters.buyerAddress) {
        conditions.push(sql`users.wallet_address = ${filters.buyerAddress}`);
      }
      
      if (filters.sellerAddress) {
        conditions.push(eq(marketplaceListings.sellerAddress, filters.sellerAddress));
      }
      
      if (filters.status) {
        conditions.push(eq(orders.status, filters.status));
      }
      
      if (filters.paymentMethod) {
        conditions.push(eq(orders.paymentMethod, filters.paymentMethod));
      }
      
      if (filters.trackingNumber) {
        conditions.push(eq(orders.trackingNumber, filters.trackingNumber));
      }
      
      if (filters.dateFrom) {
        conditions.push(gte(orders.createdAt, new Date(filters.dateFrom)));
      }
      
      if (filters.dateTo) {
        conditions.push(lte(orders.createdAt, new Date(filters.dateTo)));
      }

      // Apply conditions if any
      if (conditions.length > 0) {
        // @ts-ignore - Fix for drizzle-orm typing issue
        query = query.where(and(...conditions));
      }

      // Get total count
      const countQuery = db
        .select({ count: count() })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users, eq(orders.buyerId, users.id));

      if (conditions.length > 0) {
        // @ts-ignore - Fix for drizzle-orm typing issue
        countQuery.where(and(...conditions));
      }

      const countResult = await countQuery;
      const total = countResult[0]?.count || 0;

      // Execute main query with pagination
      const ordersResult = await query
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

      const ordersList = ordersResult.map(order => ({
        id: order.orderId.toString(),
        listingId: order.listingId?.toString() || '',
        listingTitle: order.listingTitle || 'Unknown Item',
        buyerAddress: order.buyerAddress || '',
        sellerAddress: order.sellerAddress || '',
        amount: order.amount || '0',
        totalAmount: order.totalAmount || '0',
        currency: order.currency || 'USD',
        status: order.status || 'pending',
        paymentMethod: order.paymentMethod || 'crypto',
        trackingNumber: order.trackingNumber || undefined,
        createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
      }));

      return {
        orders: ordersList,
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrevious: offset > 0,
      };
    } catch (error) {
      safeLogger.error('Error searching orders:', error);
      throw error;
    }
  }

  /**
   * Handle status change transaction
   */
  private async handleStatusChangeTransaction(
    order: OrderManagementData,
    newStatus: string
  ): Promise<void> {
    // Implementation for handling status change transactions
    // This would typically involve updating payment status, escrow status, etc.
    safeLogger.info(`Handling status change for order ${order.id} to ${newStatus}`);
  }
}

// Export singleton instance
export const orderManagementService = new OrderManagementService();
