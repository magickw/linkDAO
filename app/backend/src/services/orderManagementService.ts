import { eq, and, desc, sql, gte, lte, count, or } from 'drizzle-orm';
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

export interface OrderAnalytics {
  totalOrders: number;
  ordersByStatus: Array<{ status: string; count: number; percentage: number }>;
  ordersByPaymentMethod: Array<{ method: string; count: number; volume: string }>;
  averageOrderValue: string;
  totalRevenue: string;
  monthlyOrderTrends: Array<{ month: string; orders: number; revenue: string }>;
  topBuyers: Array<{ address: string; name?: string; orders: number; volume: string }>;
  topSellers: Array<{ address: string; name?: string; orders: number; volume: string }>;
  averageProcessingTime: number; // in hours
  completionRate: number; // percentage
  disputeRate: number; // percentage
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
          enhancedData: marketplaceListings.enhancedData,
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
        .leftJoin(users.as('buyer_user'), eq(orders.buyerId, users.id))
        .leftJoin(sellers.as('buyer_seller'), eq(sql`buyer_user.wallet_address`, sellers.walletAddress))
        .leftJoin(sellers.as('seller_seller'), eq(marketplaceListings.sellerAddress, sellers.walletAddress))
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

      const enhanced = order.enhancedData as any;

      return {
        id: order.orderId.toString(),
        listingId: order.listingId?.toString() || '',
        listingTitle: enhanced?.title || order.listingTitle || 'Unknown Item',
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
      console.error('Error getting order details:', error);
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
        whereConditions.push(sql`buyer_user.wallet_address = ${walletAddress}`);
      }
      if (role === 'seller' || role === 'both') {
        whereConditions.push(eq(marketplaceListings.sellerAddress, walletAddress));
      }

      let query = db
        .select({
          orderId: orders.id,
          listingId: orders.listingId,
          listingTitle: marketplaceListings.title,
          enhancedData: marketplaceListings.enhancedData,
          sellerAddress: marketplaceListings.sellerAddress,
          buyerAddress: sql<string>`buyer_user.wallet_address`,
          buyerName: sql<string>`buyer_seller.display_name`,
          sellerName: sql<string>`seller_seller.display_name`,
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
        .leftJoin(users.as('buyer_user'), eq(orders.buyerId, users.id))
        .leftJoin(sellers.as('buyer_seller'), eq(sql`buyer_user.wallet_address`, sellers.walletAddress))
        .leftJoin(sellers.as('seller_seller'), eq(marketplaceListings.sellerAddress, sellers.walletAddress));

      // Apply role conditions
      if (whereConditions.length === 1) {
        query = query.where(whereConditions[0]);
      } else if (whereConditions.length > 1) {
        query = query.where(or(...whereConditions));
      }

      // Apply status filter
      if (status) {
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
        const enhanced = order.enhancedData as any;
        
        ordersWithDetails.push({
          id: order.orderId.toString(),
          listingId: order.listingId?.toString() || '',
          listingTitle: enhanced?.title || order.listingTitle || 'Unknown Item',
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
      console.error('Error getting user orders:', error);
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
      console.error('Error updating order status:', error);
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
      console.error('Error adding order tracking:', error);
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

      let baseQuery = db
        .select()
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users.as('buyer_user'), eq(orders.buyerId, users.id))
        .where(gte(orders.createdAt, startDate));

      // Apply user and role filters
      if (walletAddress && role) {
        if (role === 'buyer') {
          baseQuery = baseQuery.where(and(
            gte(orders.createdAt, startDate),
            sql`buyer_user.wallet_address = ${walletAddress}`
          ));
        } else if (role === 'seller') {
          baseQuery = baseQuery.where(and(
            gte(orders.createdAt, startDate),
            eq(marketplaceListings.sellerAddress, walletAddress)
          ));
        }
      }

      // Get basic statistics
      const totalOrdersResult = await db
        .select({ count: count() })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users.as('buyer_user'), eq(orders.buyerId, users.id))
        .where(
          walletAddress && role === 'buyer' 
            ? sql`buyer_user.wallet_address = ${walletAddress}`
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
        .leftJoin(users.as('buyer_user'), eq(orders.buyerId, users.id))
        .where(
          walletAddress && role === 'buyer' 
            ? sql`buyer_user.wallet_address = ${walletAddress}`
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
      const ordersByPaymentMethod = await db
        .select({
          method: orders.paymentMethod,
          count: count(),
          volume: sql<string>`coalesce(sum(cast(total_amount as decimal)), 0)`,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users.as('buyer_user'), eq(orders.buyerId, users.id))
        .where(
          walletAddress && role === 'buyer' 
            ? sql`buyer_user.wallet_address = ${walletAddress}`
            : walletAddress && role === 'seller'
            ? eq(marketplaceListings.sellerAddress, walletAddress)
            : sql`1=1`
        )
        .groupBy(orders.paymentMethod);

      // Revenue and averages
      const revenueStats = await db
        .select({
          totalRevenue: sql<string>`coalesce(sum(cast(total_amount as decimal)), 0)`,
          averageOrderValue: sql<string>`coalesce(avg(cast(total_amount as decimal)), 0)`,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users.as('buyer_user'), eq(orders.buyerId, users.id))
        .where(
          walletAddress && role === 'buyer' 
            ? sql`buyer_user.wallet_address = ${walletAddress}`
            : walletAddress && role === 'seller'
            ? eq(marketplaceListings.sellerAddress, walletAddress)
            : sql`1=1`
        );

      // Monthly trends
      const monthlyTrends = await db
        .select({
          month: sql<string>`to_char(created_at, 'YYYY-MM')`,
          orders: count(),
          revenue: sql<string>`coalesce(sum(cast(total_amount as decimal)), 0)`,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .leftJoin(users.as('buyer_user'), eq(orders.buyerId, users.id))
        .where(and(
          gte(orders.createdAt, startDate),
          walletAddress && role === 'buyer' 
            ? sql`buyer_user.wallet_address = ${walletAddress}`
            : walletAddress && role === 'seller'
            ? eq(marketplaceListings.sellerAddress, walletAddress)
            : sql`1=1`
        ))
        .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
        .orderBy(sql`to_char(created_at, 'YYYY-MM')`);

      // Calculate completion and dispute rates
      const completedOrders = ordersByStatus.find(s => s.status === 'completed')?.count || 0;
      const disputedOrders = ordersByStatus.find(s => s.status === 'disputed')?.count || 0;
      
      const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
      const disputeRate = totalOrders > 0 ? Math.round((disputedOrders / totalOrders) * 100) : 0;

      return {
        totalOrders,
        ordersByStatus: statusWithPercentages,
        ordersByPaymentMethod: ordersByPaymentMethod.map(item => ({
          method: item.method || 'unknown',
          count: item.count,
          volume: item.volume,
        })),
        averageOrderValue: revenueStats[0]?.averageOrderValue || '0',
        totalRevenue: revenueStats[0]?.totalRevenue || '0',
        monthlyOrderTrends: monthlyTrends,
        topBuyers: [], // TODO: Implement if needed
        topSellers: [], // TODO: Implement if needed
        averageProcessingTime: 24, // TODO: Calculate actual processing time
        completionRate,
        disputeRate,
      };
    } catch (error) {
      console.error('Error getting order analytics:', error);
      throw error;
    }
  }

  /**
   * Handle transaction recording based on status changes
   */
  private async handleStatusChangeTransaction(order: OrderManagementData, newStatus: string): Promise<void> {
    try {
      switch (newStatus) {
        case 'paid':
          // Record payment received for seller
          await transactionService.recordOrderTransaction(
            order.id,
            'payment_received',
            order.totalAmount,
            order.currency,
            order.paymentConfirmationHash
          );
          break;

        case 'completed':
          // Record escrow release for seller
          await transactionService.recordOrderTransaction(
            order.id,
            'escrow_release',
            order.totalAmount,
            order.currency,
            order.paymentConfirmationHash
          );
          break;

        case 'disputed':
          // Record escrow hold (no transaction needed, just event)
          break;

        case 'cancelled':
          // Record refund if payment was made
          if (order.status === 'paid') {
            await transactionService.recordOrderTransaction(
              order.id,
              'escrow_release',
              order.totalAmount,
              order.currency
            );
          }
          break;
      }
    } catch (error) {
      console.error('Error handling status change transaction:', error);
      // Don't throw error as this is supplementary functionality
    }
  }
}

export const orderManagementService = new OrderManagementService();