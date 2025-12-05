import { db } from '../db';
import { sellers, orders, users, orderEvents } from '../db/schema';
import { eq, and, desc, sql, asc } from 'drizzle-orm';

/**
 * Order Query Options
 */
interface OrderQueryOptions {
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Tracking Information
 */
interface TrackingInfo {
  trackingNumber: string;
  trackingCarrier: string;
  estimatedDelivery?: string;
  notes?: string;
}

/**
 * Order with Buyer Information
 */
interface OrderWithBuyer {
  id: number;
  buyerId: string;
  buyerAddress?: string;
  amount: string;
  paymentToken?: string;
  status: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  shippingAddress?: any;
  billingAddress?: any;
  orderNotes?: string;
  createdAt: Date;
  listingId?: number;
  escrowId?: number;
  checkoutSessionId?: string;
  paymentMethod?: string;
}

/**
 * Seller Order Service
 */
class SellerOrderService {
  /**
   * Get all orders for a seller with pagination and filtering
   */
  async getSellerOrders(
    walletAddress: string,
    options: OrderQueryOptions = {}
  ): Promise<{ orders: OrderWithBuyer[]; total: number; page: number; pageSize: number }> {
    // Verify seller exists and get seller ID
    const seller = await db.query.sellers.findFirst({
      where: eq(sellers.walletAddress, walletAddress.toLowerCase()),
    });

    if (!seller) {
      throw new Error('Seller not found');
    }

    const {
      status,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Build query conditions
    const conditions = [eq(orders.sellerId, seller.id as any)];

    if (status) {
      conditions.push(eq(orders.status, status));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(...conditions));

    const total = Number(countResult?.count || 0);

    // Build order by clause
    const orderByColumn = sortBy === 'amount' ? orders.amount : orders.createdAt;
    const orderByDirection = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn);

    // Get orders with buyer information
    const orderList = await db
      .select({
        id: orders.id,
        buyerId: orders.buyerId,
        amount: orders.amount,
        paymentToken: orders.paymentToken,
        status: orders.status,
        trackingNumber: orders.trackingNumber,
        trackingCarrier: orders.trackingCarrier,
        estimatedDelivery: orders.estimatedDelivery,
        actualDelivery: orders.actualDelivery,
        shippingAddress: orders.shippingAddress,
        billingAddress: orders.billingAddress,
        orderNotes: orders.orderNotes,
        createdAt: orders.createdAt,
        listingId: orders.listingId,
        escrowId: orders.escrowId,
        checkoutSessionId: orders.checkoutSessionId,
        paymentMethod: orders.paymentMethod,
        buyerAddress: users.walletAddress,
      })
      .from(orders)
      .leftJoin(users, eq(orders.buyerId, users.id))
      .where(and(...conditions))
      .orderBy(orderByDirection)
      .limit(limit)
      .offset(offset);

    return {
      orders: orderList.map(order => ({
        id: order.id,
        buyerId: order.buyerId?.toString() || '',
        buyerAddress: order.buyerAddress || undefined,
        amount: order.amount?.toString() || '0',
        paymentToken: order.paymentToken || undefined,
        status: order.status || 'pending',
        trackingNumber: order.trackingNumber || undefined,
        trackingCarrier: order.trackingCarrier || undefined,
        estimatedDelivery: order.estimatedDelivery || undefined,
        actualDelivery: order.actualDelivery || undefined,
        shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress as string) : undefined,
        billingAddress: order.billingAddress ? JSON.parse(order.billingAddress as string) : undefined,
        orderNotes: order.orderNotes || undefined,
        createdAt: order.createdAt || new Date(),
        listingId: order.listingId || undefined,
        escrowId: order.escrowId || undefined,
        checkoutSessionId: order.checkoutSessionId || undefined,
        paymentMethod: order.paymentMethod || undefined,
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    };
  }

  /**
   * Get a single order by ID
   */
  async getOrderById(orderId: number): Promise<OrderWithBuyer> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        buyer: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Get buyer wallet address
    const buyer = await db.query.users.findFirst({
      where: eq(users.id, order.buyerId as any),
    });

    return {
      id: order.id,
      buyerId: order.buyerId?.toString() || '',
      buyerAddress: buyer?.walletAddress,
      amount: order.amount?.toString() || '0',
      paymentToken: order.paymentToken || undefined,
      status: order.status || 'pending',
      trackingNumber: order.trackingNumber || undefined,
      trackingCarrier: order.trackingCarrier || undefined,
      estimatedDelivery: order.estimatedDelivery || undefined,
      actualDelivery: order.actualDelivery || undefined,
      shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress as string) : undefined,
      billingAddress: order.billingAddress ? JSON.parse(order.billingAddress as string) : undefined,
      orderNotes: order.orderNotes || undefined,
      createdAt: order.createdAt || new Date(),
      listingId: order.listingId || undefined,
      escrowId: order.escrowId || undefined,
      checkoutSessionId: order.checkoutSessionId || undefined,
      paymentMethod: order.paymentMethod || undefined,
    };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: number, status: string, notes?: string): Promise<void> {
    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Update order status
    await db
      .update(orders)
      .set({
        status,
        orderNotes: notes || order.orderNotes,
      })
      .where(eq(orders.id, orderId));

    // Log order event
    await db.insert(orderEvents).values({
      orderId,
      eventType: 'status_changed',
      description: `Order status changed to ${status}`,
      metadata: JSON.stringify({
        previousStatus: order.status,
        newStatus: status,
        notes,
      }),
    });
  }

  /**
   * Update order tracking information
   */
  async updateOrderTracking(orderId: number, trackingInfo: TrackingInfo): Promise<void> {
    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Update tracking information
    const updateData: any = {
      trackingNumber: trackingInfo.trackingNumber,
      trackingCarrier: trackingInfo.trackingCarrier,
    };

    if (trackingInfo.estimatedDelivery) {
      updateData.estimatedDelivery = new Date(trackingInfo.estimatedDelivery);
    }

    if (trackingInfo.notes) {
      updateData.orderNotes = trackingInfo.notes;
    }

    await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId));

    // If order was in pending/processing, move to shipped
    if (order.status === 'pending' || order.status === 'processing') {
      await db
        .update(orders)
        .set({ status: 'shipped' })
        .where(eq(orders.id, orderId));
    }

    // Log order event
    await db.insert(orderEvents).values({
      orderId,
      eventType: 'tracking_updated',
      description: `Tracking information updated: ${trackingInfo.trackingCarrier} - ${trackingInfo.trackingNumber}`,
      metadata: JSON.stringify(trackingInfo),
    });
  }
}

export const sellerOrderService = new SellerOrderService();
