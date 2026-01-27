import { db } from '../../db';
import { orders, users, marketplaceListings } from '../../db/schema';
import { safeLogger } from '../../utils/safeLogger';
import { eq, and, gte, lte, desc, or, sql, like, inArray } from 'drizzle-orm';

export interface OrderSearchFilters {
    query?: string; // Search text (order ID, buyer/seller name, listing title)
    status?: string[];
    dateRange?: { start: Date; end: Date };
    sellerId?: string;
    buyerId?: string;
    minAmount?: number;
    maxAmount?: number;
    paymentMethod?: string;
}

export interface OrderSearchResult {
    id: string;
    sellerId: string;
    buyerId: string;
    listingId: string | null;
    amount: string;
    totalAmount: string;
    currency: string;
    status: string;
    paymentMethod: string;
    createdAt: Date;
    // Joined data
    sellerName?: string;
    buyerName?: string;
    listingTitle?: string;
}

export class OrderSearchService {
    /**
     * Search orders with comprehensive filters
     */
    async searchOrders(
        filters: OrderSearchFilters,
        limit: number = 20,
        offset: number = 0
    ): Promise<{ orders: OrderSearchResult[]; total: number }> {
        try {
            const conditions = [];

            // Status filter
            if (filters.status && filters.status.length > 0) {
                conditions.push(inArray(orders.status, filters.status as any));
            }

            // Date range filter
            if (filters.dateRange) {
                if (filters.dateRange.start) {
                    conditions.push(gte(orders.createdAt, filters.dateRange.start));
                }
                if (filters.dateRange.end) {
                    conditions.push(lte(orders.createdAt, filters.dateRange.end));
                }
            }

            // Seller filter
            if (filters.sellerId) {
                conditions.push(eq(orders.sellerId, filters.sellerId));
            }

            // Buyer filter
            if (filters.buyerId) {
                conditions.push(eq(orders.buyerId, filters.buyerId));
            }

            // Amount range filter
            if (filters.minAmount !== undefined) {
                conditions.push(gte(orders.totalAmount, filters.minAmount.toString()));
            }

            if (filters.maxAmount !== undefined) {
                conditions.push(lte(orders.totalAmount, filters.maxAmount.toString()));
            }

            // Payment method filter
            if (filters.paymentMethod) {
                conditions.push(eq(orders.paymentMethod, filters.paymentMethod as any));
            }

            // Text search filter (order ID)
            if (filters.query) {
                conditions.push(like(orders.id, `%${filters.query}%`));
            }

            // Build query
            let query = db
                .select({
                    id: orders.id,
                    sellerId: orders.sellerId,
                    buyerId: orders.buyerId,
                    listingId: orders.listingId,
                    amount: orders.amount,
                    totalAmount: orders.totalAmount,
                    currency: orders.currency,
                    status: orders.status,
                    paymentMethod: orders.paymentMethod,
                    createdAt: orders.createdAt,
                })
                .from(orders)
                .orderBy(desc(orders.createdAt));

            if (conditions.length > 0) {
                query = query.where(and(...conditions)) as any;
            }

            // Get total count
            let countQuery = db
                .select({ count: sql<number>`count(*)` })
                .from(orders);

            if (conditions.length > 0) {
                countQuery = countQuery.where(and(...conditions)) as any;
            }

            const [{ count: total }] = await countQuery;

            // Apply pagination
            query = query.limit(limit).offset(offset) as any;

            const results = await query;

            return {
                orders: results.map(order => ({
                    id: order.id,
                    sellerId: order.sellerId,
                    buyerId: order.buyerId,
                    listingId: order.listingId,
                    amount: order.amount,
                    totalAmount: order.totalAmount,
                    currency: order.currency,
                    status: order.status,
                    paymentMethod: order.paymentMethod,
                    createdAt: order.createdAt,
                })),
                total: Number(total),
            };
        } catch (error) {
            safeLogger.error('Error searching orders:', error);
            throw error;
        }
    }

    /**
     * Get search suggestions based on query
     */
    async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
        try {
            if (!query || query.length < 2) {
                return [];
            }

            // Search for order IDs that match the query
            const orderResults = await db
                .select({ id: orders.id })
                .from(orders)
                .where(like(orders.id, `%${query}%`))
                .limit(limit);

            return orderResults.map(o => o.id);
        } catch (error) {
            safeLogger.error('Error getting search suggestions:', error);
            return [];
        }
    }

    /**
     * Advanced search with joined data (seller/buyer names, listing titles)
     */
    async advancedSearch(
        filters: OrderSearchFilters,
        limit: number = 20,
        offset: number = 0
    ): Promise<{ orders: OrderSearchResult[]; total: number }> {
        try {
            // For advanced search with joins, we'll use raw SQL or more complex Drizzle queries
            // This is a simplified version - in production, you'd want to join with users and listings

            const basicResults = await this.searchOrders(filters, limit, offset);

            // TODO: Enhance with joins to get seller/buyer names and listing titles
            // This would require more complex Drizzle queries or raw SQL

            return basicResults;
        } catch (error) {
            safeLogger.error('Error in advanced search:', error);
            throw error;
        }
    }

    /**
     * Get popular search filters (for UI suggestions)
     */
    async getPopularFilters(): Promise<{
        statuses: Array<{ status: string; count: number }>;
        paymentMethods: Array<{ method: string; count: number }>;
    }> {
        try {
            // Get status distribution
            const statusResults = await db
                .select({
                    status: orders.status,
                    count: sql<number>`count(*)`,
                })
                .from(orders)
                .groupBy(orders.status)
                .orderBy(desc(sql`count(*)`));

            // Get payment method distribution
            const paymentResults = await db
                .select({
                    method: orders.paymentMethod,
                    count: sql<number>`count(*)`,
                })
                .from(orders)
                .groupBy(orders.paymentMethod)
                .orderBy(desc(sql`count(*)`));

            return {
                statuses: statusResults.map(r => ({
                    status: r.status,
                    count: Number(r.count),
                })),
                paymentMethods: paymentResults.map(r => ({
                    method: r.method,
                    count: Number(r.count),
                })),
            };
        } catch (error) {
            safeLogger.error('Error getting popular filters:', error);
            return { statuses: [], paymentMethods: [] };
        }
    }

    /**
     * Quick search by order ID
     */
    async quickSearchById(orderId: string): Promise<OrderSearchResult | null> {
        try {
            const results = await db
                .select()
                .from(orders)
                .where(eq(orders.id, orderId))
                .limit(1);

            if (results.length === 0) {
                return null;
            }

            const order = results[0];
            return {
                id: order.id,
                sellerId: order.sellerId,
                buyerId: order.buyerId,
                listingId: order.listingId,
                amount: order.amount,
                totalAmount: order.totalAmount,
                currency: order.currency,
                status: order.status,
                paymentMethod: order.paymentMethod,
                createdAt: order.createdAt,
            };
        } catch (error) {
            safeLogger.error('Error in quick search:', error);
            return null;
        }
    }
}

// Export singleton instance
export const orderSearchService = new OrderSearchService();
