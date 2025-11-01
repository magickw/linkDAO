import { db } from '../db';
import { sellers, orders, products, notifications, sellerTransactions } from '../db/schema';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';

/**
 * Dashboard Statistics Interface
 */
interface DashboardStats {
  sales: {
    today: string;
    week: string;
    month: string;
    total: string;
  };
  orders: {
    pending: number;
    processing: number;
    completed: number;
    total: number;
  };
  listings: {
    active: number;
    draft: number;
    soldOut: number;
    total: number;
  };
  balance: {
    available: string;
    pending: string;
    escrow: string;
    total: string;
  };
  reputation: {
    score: number;
    totalReviews: number;
    averageRating: number;
  };
  unreadNotifications: number;
}

/**
 * Notification Interface
 */
interface Notification {
  id: number;
  type: string;
  message: string;
  metadata: any;
  read: boolean;
  createdAt: Date;
}

/**
 * Analytics Data Interface
 */
interface AnalyticsData {
  period: string;
  revenue: {
    total: string;
    byDay: Array<{ date: string; amount: string }>;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
    byDay: Array<{ date: string; count: number }>;
  };
  products: {
    topSelling: Array<{
      productId: string;
      title: string;
      sales: number;
      revenue: string;
    }>;
    byCategory: Record<string, number>;
  };
  customers: {
    new: number;
    returning: number;
    total: number;
  };
  performance: {
    averageOrderValue: string;
    conversionRate: number;
    fulfillmentRate: number;
  };
}

/**
 * Seller Dashboard Service
 */
class SellerDashboardService {
  /**
   * Get comprehensive dashboard statistics for a seller
   */
  async getDashboardStats(walletAddress: string): Promise<DashboardStats> {
    // Verify seller exists
    const seller = await db.query.sellers.findFirst({
      where: eq(sellers.walletAddress, walletAddress),
    });

    if (!seller) {
      throw new Error('Seller not found');
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get sales data
    const [todaySales] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          gte(orders.createdAt, todayStart),
          eq(orders.status, 'completed')
        )
      );

    const [weekSales] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          gte(orders.createdAt, weekStart),
          eq(orders.status, 'completed')
        )
      );

    const [monthSales] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          gte(orders.createdAt, monthStart),
          eq(orders.status, 'completed')
        )
      );

    const [totalSales] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          eq(orders.status, 'completed')
        )
      );

    // Get order counts by status
    const orderCounts = await db
      .select({
        status: orders.status,
        count: count(),
      })
      .from(orders)
      .where(eq(orders.sellerId, seller.id as any))
      .groupBy(orders.status);

    const orderStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      total: 0,
    };

    orderCounts.forEach((item) => {
      const status = item.status as string;
      const cnt = Number(item.count);
      orderStats.total += cnt;
      if (status === 'pending') orderStats.pending = cnt;
      if (status === 'processing') orderStats.processing = cnt;
      if (status === 'completed') orderStats.completed = cnt;
    });

    // Get listing counts by status
    const listingCounts = await db
      .select({
        status: products.status,
        count: count(),
      })
      .from(products)
      .where(eq(products.sellerId, seller.id as any))
      .groupBy(products.status);

    const listingStats = {
      active: 0,
      draft: 0,
      soldOut: 0,
      total: 0,
    };

    listingCounts.forEach((item) => {
      const status = item.status as string;
      const cnt = Number(item.count);
      listingStats.total += cnt;
      if (status === 'active') listingStats.active = cnt;
      if (status === 'draft') listingStats.draft = cnt;
      if (status === 'sold_out') listingStats.soldOut = cnt;
    });

    // Get balance data from seller transactions
    const [availableBalance] = await db
      .select({ total: sql<string>`COALESCE(SUM(${sellerTransactions.amount}), 0)` })
      .from(sellerTransactions)
      .where(
        and(
          eq(sellerTransactions.sellerWalletAddress, walletAddress),
          eq(sellerTransactions.transactionType, 'sale')
        )
      );

    const [pendingBalance] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          eq(orders.status, 'processing')
        )
      );

    const [escrowBalance] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          eq(orders.status, 'pending')
        )
      );

    // Get unread notification count
    const [unreadCount] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userAddress, walletAddress),
          eq(notifications.read, false)
        )
      );

    return {
      sales: {
        today: todaySales?.total || '0',
        week: weekSales?.total || '0',
        month: monthSales?.total || '0',
        total: totalSales?.total || '0',
      },
      orders: orderStats,
      listings: listingStats,
      balance: {
        available: availableBalance?.total || '0',
        pending: pendingBalance?.total || '0',
        escrow: escrowBalance?.total || '0',
        total: String(
          Number(availableBalance?.total || '0') +
          Number(pendingBalance?.total || '0') +
          Number(escrowBalance?.total || '0')
        ),
      },
      reputation: {
        score: 0, // TODO: Implement reputation calculation
        totalReviews: 0,
        averageRating: 0,
      },
      unreadNotifications: Number(unreadCount?.count || 0),
    };
  }

  /**
   * Get notifications for a seller
   */
  async getNotifications(
    walletAddress: string,
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{ notifications: Notification[]; total: number }> {
    const conditions = [eq(notifications.userAddress, walletAddress)];

    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(...conditions));

    const total = Number(countResult?.count || 0);

    // Get notifications
    const notificationList = await db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: [desc(notifications.createdAt)],
      limit,
      offset,
    });

    return {
      notifications: notificationList.map((n) => ({
        id: n.id,
        type: n.type || 'general',
        message: n.message,
        metadata: n.metadata ? JSON.parse(n.metadata) : null,
        read: n.read || false,
        createdAt: n.createdAt || new Date(),
      })),
      total,
    };
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: number): Promise<void> {
    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, notificationId),
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  }

  /**
   * Get analytics data for a seller
   */
  async getAnalytics(walletAddress: string, period: string = '30d'): Promise<AnalyticsData> {
    // Verify seller exists
    const seller = await db.query.sellers.findFirst({
      where: eq(sellers.walletAddress, walletAddress),
    });

    if (!seller) {
      throw new Error('Seller not found');
    }

    // Parse period (e.g., '7d', '30d', '90d')
    const days = parseInt(period.replace('d', '')) || 30;
    const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get total revenue for period
    const [revenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          gte(orders.createdAt, periodStart),
          eq(orders.status, 'completed')
        )
      );

    // Get revenue by day
    const revenueByDay = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        amount: sql<string>`COALESCE(SUM(${orders.amount}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          gte(orders.createdAt, periodStart),
          eq(orders.status, 'completed')
        )
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    // Get order counts
    const [orderCountResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          gte(orders.createdAt, periodStart)
        )
      );

    // Get orders by status
    const ordersByStatus = await db
      .select({
        status: orders.status,
        count: count(),
      })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          gte(orders.createdAt, periodStart)
        )
      )
      .groupBy(orders.status);

    const orderStatusMap: Record<string, number> = {};
    ordersByStatus.forEach((item) => {
      orderStatusMap[item.status as string] = Number(item.count);
    });

    // Get orders by day
    const ordersByDay = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        count: count(),
      })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, seller.id as any),
          gte(orders.createdAt, periodStart)
        )
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    // Calculate performance metrics
    const totalRevenue = Number(revenueResult?.total || 0);
    const totalOrders = Number(orderCountResult?.count || 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      period,
      revenue: {
        total: revenueResult?.total || '0',
        byDay: revenueByDay.map((item) => ({
          date: item.date,
          amount: item.amount,
        })),
      },
      orders: {
        total: totalOrders,
        byStatus: orderStatusMap,
        byDay: ordersByDay.map((item) => ({
          date: item.date,
          count: Number(item.count),
        })),
      },
      products: {
        topSelling: [], // TODO: Implement top selling products query
        byCategory: {}, // TODO: Implement products by category
      },
      customers: {
        new: 0, // TODO: Implement new customers calculation
        returning: 0, // TODO: Implement returning customers calculation
        total: 0,
      },
      performance: {
        averageOrderValue: averageOrderValue.toFixed(2),
        conversionRate: 0, // TODO: Implement conversion rate calculation
        fulfillmentRate: 0, // TODO: Implement fulfillment rate calculation
      },
    };
  }
}

export const sellerDashboardService = new SellerDashboardService();
