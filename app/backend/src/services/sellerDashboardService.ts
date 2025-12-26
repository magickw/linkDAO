import { db } from '../db';
import { sellers, orders, products, notifications, sellerTransactions, users } from '../db/schema';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';
import { cacheService } from './cacheService';
import { safeLogger } from '../utils/safeLogger';

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
   * OPTIMIZED: Uses single transaction with combined queries + intelligent caching
   */
  async getDashboardStats(walletAddress: string): Promise<DashboardStats> {
    // OPTIMIZED: Check cache first with short TTL for real-time data
    const cacheKey = `seller:dashboard:${walletAddress.toLowerCase()}`;
    const cachedStats = await cacheService.get<DashboardStats>(cacheKey);

    if (cachedStats) {
      return cachedStats;
    }

    // Use transaction to reduce connection overhead
    // Add timeout protection for database operations
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout')), 10000)
    );
    
    const dbTransactionPromise = db.transaction(async (tx) => {
      // Verify seller exists and get user UUID for orders queries
      // NOTE: sellers.id is an integer (serial), but orders.sellerId references users.id (UUID)
      // So we need to get the user's UUID by wallet address for querying orders
      const [seller] = await tx
        .select({ id: sellers.id })
        .from(sellers)
        .where(eq(sellers.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      // Get user UUID for orders queries (orders.sellerId references users.id which is UUID)
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      if (!seller) {
        // Instead of throwing an error that might cause a 503, return a default stats object
        // This allows the frontend to handle it gracefully
        safeLogger.warn('Seller not found for dashboard stats, returning default stats');
        return {
          sales: {
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
            total: 0,
          },
          orders: {
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            disputed: 0,
          },
          listings: {
            active: 0,
            draft: 0,
            sold: 0,
            expired: 0,
          },
          balance: {
            crypto: {},
            fiatEquivalent: 0,
            pendingEscrow: 0,
            availableWithdraw: 0,
          },
          reputation: {
            score: 0,
            trend: 'stable',
            recentReviews: 0,
            averageRating: 0,
          },
          unreadNotifications: 0,
        };
      }

      // If user not found in users table, we can't query orders (which use UUID)
      // Return default stats for orders but still show listings (which use seller.id)
      if (!user) {
        safeLogger.warn('User not found in users table for seller dashboard, returning partial stats', { walletAddress });
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Use user UUID for orders queries - DO NOT fall back to seller.id as it's an integer
      // orders.sellerId expects UUID (references users.id), not integer (sellers.id)
      const sellerIdForOrders = user?.id;

      // Default values for sales and order data (used when user not found)
      let salesData: { today: string; week: string; month: string; total: string; pending: string; processing: string } | undefined;
      let orderCounts: { pending: number; processing: number; completed: number; total: number } | undefined;

      // Only query orders if we have a valid user UUID
      // Add a fallback mechanism to handle cases where user exists but sellerIdForOrders is undefined
      if (sellerIdForOrders) {
        // OPTIMIZED: Combined sales query with conditional aggregation
        [salesData] = await tx
          .select({
            today: sql<string>`COALESCE(SUM(CASE WHEN ${orders.createdAt} >= ${todayStart}::timestamp THEN ${orders.amount} ELSE 0 END), 0)`,
            week: sql<string>`COALESCE(SUM(CASE WHEN ${orders.createdAt} >= ${weekStart}::timestamp THEN ${orders.amount} ELSE 0 END), 0)`,
            month: sql<string>`COALESCE(SUM(CASE WHEN ${orders.createdAt} >= ${monthStart}::timestamp THEN ${orders.amount} ELSE 0 END), 0)`,
            total: sql<string>`COALESCE(SUM(${orders.amount}), 0)`,
            pending: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} = 'pending' THEN ${orders.amount} ELSE 0 END), 0)`,
            processing: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} = 'processing' THEN ${orders.amount} ELSE 0 END), 0)`,
          })
          .from(orders)
          .where(eq(orders.sellerId, sellerIdForOrders));

        // OPTIMIZED: Combined order counts with aggregation
        [orderCounts] = await tx
          .select({
            pending: sql<number>`COUNT(CASE WHEN ${orders.status} = 'pending' THEN 1 END)`,
            processing: sql<number>`COUNT(CASE WHEN ${orders.status} = 'processing' THEN 1 END)`,
            completed: sql<number>`COUNT(CASE WHEN ${orders.status} = 'completed' THEN 1 END)`,
            total: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(eq(orders.sellerId, sellerIdForOrders));
      }

      // OPTIMIZED: Combined listing counts with aggregation
      // Note: products.sellerId also references users.id (UUID), not sellers.id (integer)
      let listingCounts: { active: number; draft: number; soldOut: number; total: number } | undefined;

      if (sellerIdForOrders) {
        [listingCounts] = await tx
          .select({
            active: sql<number>`COUNT(CASE WHEN ${products.status} = 'active' THEN 1 END)`,
            draft: sql<number>`COUNT(CASE WHEN ${products.status} = 'draft' THEN 1 END)`,
            soldOut: sql<number>`COUNT(CASE WHEN ${products.status} = 'sold_out' THEN 1 END)`,
            total: sql<number>`COUNT(*)`,
          })
          .from(products)
          .where(eq(products.sellerId, sellerIdForOrders));
      }

      // OPTIMIZED: Single query for balance data with proper indexing
      const [balanceData] = await tx
        .select({
          available: sql<string>`COALESCE(SUM(CASE WHEN ${sellerTransactions.transactionType} = 'sale' THEN ${sellerTransactions.amount} ELSE 0 END), 0)`,
        })
        .from(sellerTransactions)
        .where(eq(sellerTransactions.sellerWalletAddress, walletAddress.toLowerCase()));

      // OPTIMIZED: Simple count query with index on (userAddress, read)
      const [unreadCount] = await tx
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userAddress, walletAddress.toLowerCase()),
            eq(notifications.read, false)
          )
        )
        .limit(1000); // Safety limit

      return {
        sales: {
          today: Number(salesData?.today || 0),
          thisWeek: Number(salesData?.week || 0),
          thisMonth: Number(salesData?.month || 0),
          total: Number(salesData?.total || 0),
        },
        orders: {
          pending: Number(orderCounts?.pending || 0),
          processing: Number(orderCounts?.processing || 0),
          shipped: 0, // Backend doesn't track shipped separately
          delivered: Number(orderCounts?.completed || 0),
          disputed: 0, // Backend doesn't track disputed separately
        },
        listings: {
          active: Number(listingCounts?.active || 0),
          draft: Number(listingCounts?.draft || 0),
          sold: Number(listingCounts?.soldOut || 0),
          expired: 0, // Backend doesn't track expired separately
        },
        balance: {
          crypto: {}, // Backend doesn't track specific crypto balances
          fiatEquivalent: 0, // Backend doesn't track fiat equivalent
          pendingEscrow: Number(salesData?.pending || 0),
          availableWithdraw: Number(balanceData?.available || 0),
        },
        reputation: {
          score: 0, // TODO: Implement reputation calculation
          trend: 'stable',
          recentReviews: 0,
          averageRating: 0,
        },
        unreadNotifications: Number(unreadCount?.count || 0),
      };
    });

    // Execute the database transaction with timeout protection
    let stats;
    try {
      stats = await Promise.race([dbTransactionPromise, timeoutPromise]);
    } catch (error) {
      safeLogger.error('Dashboard stats database operation timed out:', error);
      // Return default stats on timeout to enable graceful degradation
      stats = {
        sales: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          total: 0,
        },
        orders: {
          pending: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          disputed: 0,
        },
        listings: {
          active: 0,
          draft: 0,
          sold: 0,
          expired: 0,
        },
        balance: {
          crypto: {},
          fiatEquivalent: 0,
          pendingEscrow: 0,
          availableWithdraw: 0,
        },
        reputation: {
          score: 0,
          trend: 'stable',
          recentReviews: 0,
          averageRating: 0,
        },
        unreadNotifications: 0,
      };
    }

    // OPTIMIZED: Cache results with short TTL for dashboard data (30 seconds)
    await cacheService.set(cacheKey, stats, 30);

    return stats;
  }

  /**
   * Get notifications for a seller
   * OPTIMIZED: Added pagination limits and efficient counting
   */
  async getNotifications(
    walletAddress: string,
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{ notifications: Notification[]; total: number }> {
    // OPTIMIZED: Enforce reasonable limits to prevent memory issues
    const safeLimit = Math.min(Math.max(limit, 1), 100); // Between 1-100
    const safeOffset = Math.max(offset, 0);

    // Add timeout protection for database operations
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout')), 10000)
    );

    // OPTIMIZED: Use transaction for consistency
    const dbTransactionPromise = db.transaction(async (tx) => {
      const conditions = [eq(notifications.userAddress, walletAddress)];

      if (unreadOnly) {
        conditions.push(eq(notifications.read, false));
      }

      // OPTIMIZED: Efficient count with limit to prevent full table scans
      const [countResult] = await tx
        .select({ count: count() })
        .from(notifications)
        .where(and(...conditions))
        .limit(10000); // Safety limit for count query

      const total = Math.min(Number(countResult?.count || 0), 10000); // Cap at 10k

      // OPTIMIZED: Only fetch needed fields and limit results
      const notificationList = await tx
        .select({
          id: notifications.id,
          type: notifications.type,
          message: notifications.message,
          metadata: notifications.metadata,
          read: notifications.read,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(safeLimit)
        .offset(safeOffset);

      // OPTIMIZED: Process metadata safely with error handling
      const processedNotifications = notificationList.map((n) => {
        try {
          return {
            id: n.id,
            type: n.type || 'general',
            message: n.message,
            metadata: n.metadata ? JSON.parse(n.metadata) : null,
            read: n.read || false,
            createdAt: n.createdAt || new Date(),
          };
        } catch (error) {
          // Fallback for malformed metadata
          return {
            id: n.id,
            type: n.type || 'general',
            message: n.message,
            metadata: null,
            read: n.read || false,
            createdAt: n.createdAt || new Date(),
          };
        }
      });

      return {
        notifications: processedNotifications,
        total,
      };
    });

    // Execute the database transaction with timeout protection
    try {
      const result = await Promise.race([dbTransactionPromise, timeoutPromise]);
      return result as { notifications: Notification[]; total: number };
    } catch (error) {
      safeLogger.error('Notifications database operation timed out:', error);
      // Return default empty result on timeout to enable graceful degradation
      return {
        notifications: [],
        total: 0,
      };
    }
  }

  /**
   * Mark notification as read
   * OPTIMIZED: Added cache invalidation
   */
  async markNotificationRead(notificationId: number): Promise<void> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (!notification) {
      throw new Error('Notification not found');
    }

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));

    // OPTIMIZED: Invalidate dashboard cache when notification is read
    if (notification.userAddress) {
      const cacheKey = `seller:dashboard:${notification.userAddress.toLowerCase()}`;
      await cacheService.invalidate(cacheKey);
    }
  }

  /**
   * Get analytics data for a seller
   * OPTIMIZED: Added date range limits and efficient queries
   */
  async getAnalytics(walletAddress: string, period: string = '30d'): Promise<AnalyticsData> {
    // OPTIMIZED: Validate and limit period to prevent excessive data queries
    const days = Math.min(Math.max(parseInt(period.replace('d', '')) || 30, 1), 365); // Between 1-365 days
    const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // OPTIMIZED: Use single transaction for all analytics queries
    // Add timeout protection for database operations
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout')), 10000)
    );
    
    const dbTransactionPromise = db.transaction(async (tx) => {
      // Verify seller exists
      const [seller] = await tx
        .select({ id: sellers.id })
        .from(sellers)
        .where(eq(sellers.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      // Get user UUID for orders queries (orders.sellerId references users.id which is UUID)
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      if (!seller) {
        // Instead of throwing an error that might cause a 503, return a default analytics object
        // This allows the frontend to handle it gracefully
        safeLogger.warn('Seller not found for analytics, returning default analytics');
        return {
          period: '30d',
          revenue: {
            total: '0',
            byDay: [],
          },
          orders: {
            total: 0,
            byStatus: {},
            byDay: [],
          },
          products: {
            topSelling: [],
            byCategory: {},
          },
          customers: {
            new: 0,
            returning: 0,
            total: 0,
          },
          performance: {
            averageOrderValue: '0.00',
            conversionRate: 0,
            fulfillmentRate: 0,
          },
        };
      }

      // Use user UUID for orders queries - DO NOT fall back to seller.id as it's an integer
      // orders.sellerId expects UUID (references users.id), not integer (sellers.id)
      const sellerIdForOrders = user?.id;

      // Default values for analytics data (used when user not found)
      let analyticsData: { totalRevenue: string; totalOrders: number; completedOrders: number; pendingOrders: number; processingOrders: number } | undefined;
      let dailyData: Array<{ date: string; revenue: string; orderCount: number }> = [];

      // Only query orders if we have a valid user UUID
      if (sellerIdForOrders) {
        // OPTIMIZED: Combined analytics query with proper limits
        [analyticsData] = await tx
          .select({
            totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} = 'completed' THEN ${orders.amount} ELSE 0 END), 0)`,
            totalOrders: sql<number>`COUNT(*)`,
            completedOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'completed' THEN 1 END)`,
            pendingOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'pending' THEN 1 END)`,
            processingOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'processing' THEN 1 END)`,
          })
          .from(orders)
          .where(
            and(
              eq(orders.sellerId, sellerIdForOrders),
              gte(orders.createdAt, periodStart)
            )
          );

        // OPTIMIZED: Limited daily breakdown with reasonable limit
        dailyData = await tx
          .select({
            date: sql<string>`DATE(${orders.createdAt})`,
            revenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} = 'completed' THEN ${orders.amount} ELSE 0 END), 0)`,
            orderCount: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(
            and(
              eq(orders.sellerId, sellerIdForOrders),
              gte(orders.createdAt, periodStart)
            )
          )
          .groupBy(sql`DATE(${orders.createdAt})`)
          .orderBy(desc(sql`DATE(${orders.createdAt})`))
          .limit(90); // Limit to 90 days max
      } else {
        safeLogger.warn('User not found in users table for analytics, returning partial data', { walletAddress });
      }

      // Calculate performance metrics safely
      const totalRevenue = Number(analyticsData?.totalRevenue || 0);
      const totalOrders = Number(analyticsData?.totalOrders || 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const fulfillmentRate = totalOrders > 0 ? (Number(analyticsData?.completedOrders || 0) / totalOrders) * 100 : 0;

      return {
        period: `${days}d`,
        revenue: {
          total: analyticsData?.totalRevenue || '0',
          byDay: dailyData.map((item) => ({
            date: item.date,
            amount: item.revenue,
          })),
        },
        orders: {
          total: totalOrders,
          byStatus: {
            pending: Number(analyticsData?.pendingOrders || 0),
            processing: Number(analyticsData?.processingOrders || 0),
            completed: Number(analyticsData?.completedOrders || 0),
          },
          byDay: dailyData.map((item) => ({
            date: item.date,
            count: item.orderCount,
          })),
        },
        products: {
          topSelling: [], // TODO: Implement top selling products query with LIMIT
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
          fulfillmentRate: Math.round(fulfillmentRate * 100) / 100,
        },
      };
    });

    // Execute the database transaction with timeout protection
    try {
      const result = await Promise.race([dbTransactionPromise, timeoutPromise]);
      return result as AnalyticsData;
    } catch (error) {
      safeLogger.error('Analytics database operation timed out:', error);
      // Return default analytics result on timeout to enable graceful degradation
      return {
        period: '30d',
        revenue: {
          total: '0',
          byDay: [],
        },
        orders: {
          total: 0,
          byStatus: {},
          byDay: [],
        },
        products: {
          topSelling: [],
          byCategory: {},
        },
        customers: {
          new: 0,
          returning: 0,
          total: 0,
        },
        performance: {
          averageOrderValue: '0.00',
          conversionRate: 0,
          fulfillmentRate: 0,
        },
      };
    }
  }
}

export const sellerDashboardService = new SellerDashboardService();
