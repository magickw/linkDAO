import { db } from '../db';
import { sellers, orders, users, orderEvents, products } from '../db/schema';
import { eq, and, desc, sql, asc, inArray } from 'drizzle-orm';

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
  id: string;
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
  listingId?: string;
  escrowId?: string;
  checkoutSessionId?: string;
  paymentMethod?: string;
  items?: any[];
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
    // Verify seller exists and get user ID
    const userResult = await db.select().from(users).where(eq(users.walletAddress, walletAddress.toLowerCase()));
    const user = userResult[0];

    if (!user) {
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
    const conditions = [eq(orders.sellerId, user.id)];

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
  async getOrderById(orderId: string): Promise<OrderWithBuyer> {
    const orderResult = await db.select().from(orders).where(eq(orders.id, orderId as any));
    const order = orderResult[0];

    if (!order) {
      throw new Error('Order not found');
    }

    // Get buyer wallet address
    const buyerResult = await db.select().from(users).where(eq(users.id, order.buyerId));
    const buyer = buyerResult[0];

    // Get product details
    let items: any[] = [];
    if (order.listingId) {
      try {
        const productResult = await db.select().from(products).where(eq(products.id, order.listingId));
        const product = productResult[0];
        
        if (product) {
          let image = '';
          try {
            const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
            image = Array.isArray(images) && images.length > 0 ? images[0] : '';
          } catch (e) {
            image = '';
          }

          items.push({
            id: product.id,
            title: product.title,
            quantity: order.quantity || 1,
            price: order.amount,
            image: image,
            isPhysical: product.isPhysical,
            isService: product.isService,
            serviceType: product.serviceType
          });
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
      }
    }

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
      items
    };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<void> {
    // Verify order exists
    const orderResult = await db.select().from(orders).where(eq(orders.id, orderId as any));
    const order = orderResult[0];

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
  async updateOrderTracking(orderId: string, trackingInfo: TrackingInfo): Promise<void> {
    // Verify order exists
    const orderResult = await db.select().from(orders).where(eq(orders.id, orderId as any));
    const order = orderResult[0];

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
      eventType: 'tracking_updated',
      description: `Tracking information updated: ${trackingInfo.trackingCarrier} - ${trackingInfo.trackingNumber}`,
      metadata: JSON.stringify(trackingInfo),
    });
  }

  /**
   * Bulk update order status
   */
  async bulkUpdateStatus(
    orderIds: string[],
    status: string,
    sellerId: string,
    notes?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    for (const orderId of orderIds) {
      try {
        // Verify order exists and belongs to seller
        const orderResult = await db.select().from(orders).where(eq(orders.id, orderId as any));
        const order = orderResult[0];

        if (!order) {
          errors.push(`Order ${orderId}: not found`);
          failed++;
          continue;
        }

        if (order.sellerId !== sellerId) {
          errors.push(`Order ${orderId}: not authorized`);
          failed++;
          continue;
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
          eventType: 'status_changed',
          description: `Bulk status update to ${status}`,
          metadata: JSON.stringify({
            previousStatus: order.status,
            newStatus: status,
            notes,
            bulkUpdate: true,
          }),
        });

        success++;
      } catch (err) {
        errors.push(`Order ${orderId}: ${err instanceof Error ? err.message : 'unknown error'}`);
        failed++;
      }
    }

    return { success, failed, errors };
  }

  /**
   * Get order messages
   */
  async getOrderMessages(orderId: string, sellerId: string): Promise<any[]> {
    // Verify order exists and belongs to seller
    const orderResult = await db.select().from(orders).where(eq(orders.id, orderId as any));
    const order = orderResult[0];

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.sellerId !== sellerId) {
      throw new Error('Not authorized to view this order');
    }

    // Get messages from order events
    const messageEvents = await db
      .select()
      .from(orderEvents)
      .where(and(
        eq(orderEvents.eventType, 'message'),
        sql`${orderEvents.metadata}::jsonb->>'orderId' = ${orderId}`
      ))
      .orderBy(asc(orderEvents.createdAt));

    return messageEvents.map(event => {
      const metadata = JSON.parse(event.metadata || '{}');
      return {
        id: event.id,
        sender: metadata.sender || 'system',
        message: event.description || '',
        timestamp: event.createdAt?.toISOString() || new Date().toISOString(),
        read: metadata.read || false,
      };
    });
  }

  /**
   * Send message on order
   */
  async sendOrderMessage(
    orderId: string,
    sellerId: string,
    message: string
  ): Promise<{ id: string; timestamp: string }> {
    // Verify order exists and belongs to seller
    const orderResult = await db.select().from(orders).where(eq(orders.id, orderId as any));
    const order = orderResult[0];

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.sellerId !== sellerId) {
      throw new Error('Not authorized to message on this order');
    }

    // Create message event
    const result = await db.insert(orderEvents).values({
      eventType: 'message',
      description: message,
      metadata: JSON.stringify({
        orderId,
        sender: 'seller',
        sellerId,
        read: false,
      }),
    }).returning({ id: orderEvents.id, createdAt: orderEvents.createdAt });

    return {
      id: result[0]?.id?.toString() || '',
      timestamp: result[0]?.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  /**
   * Export orders to CSV format
   */
  async exportOrdersToCSV(
    sellerId: string,
    orderIds?: string[]
  ): Promise<string> {
    let conditions: any[] = [eq(orders.sellerId, sellerId)];

    if (orderIds && orderIds.length > 0) {
      conditions.push(inArray(orders.id, orderIds as any));
    }

    const orderList = await db
      .select({
        id: orders.id,
        status: orders.status,
        amount: orders.amount,
        currency: orders.currency,
        paymentMethod: orders.paymentMethod,
        trackingNumber: orders.trackingNumber,
        trackingCarrier: orders.trackingCarrier,
        createdAt: orders.createdAt,
        buyerAddress: users.walletAddress,
      })
      .from(orders)
      .leftJoin(users, eq(orders.buyerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));

    // Generate CSV
    const headers = ['Order ID', 'Status', 'Amount', 'Currency', 'Payment Method', 'Tracking Number', 'Carrier', 'Buyer Address', 'Created At'];
    const rows = orderList.map(order => [
      order.id,
      order.status || '',
      order.amount?.toString() || '0',
      order.currency || 'USDC',
      order.paymentMethod || '',
      order.trackingNumber || '',
      order.trackingCarrier || '',
      order.buyerAddress || '',
      order.createdAt?.toISOString() || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csv;
  }
}

export const sellerOrderService = new SellerOrderService();
