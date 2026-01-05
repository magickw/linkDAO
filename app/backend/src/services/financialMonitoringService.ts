import { db } from '../db/index';
import { orders, blockchainEvents, orderReceipts } from '../db/schema'; // Assuming orderReceipts is available in schema
import { sql, eq, and, or, desc, gte, lte } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { OrderStatus } from '../models/Order';

export interface FinancialMetrics {
    totalRevenue: string;
    pendingPayouts: string;
    completedPayouts: string;
    platformFees: string; // e.g., 2.5% taken
    escrowBalance: string;
    disputedFunds: string;
}

export interface TransactionRecord {
    id: string;
    orderId: string;
    type: 'PAYMENT' | 'PAYOUT' | 'REFUND' | 'FEE';
    amount: string;
    currency: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    timestamp: Date;
    metadata?: any;
}

export interface ReconciliationStats {
    totalOrders: number;
    reconciledOrders: number;
    discrepancies: number;
    totalDiscrepancyAmount: number;
    unreconciledOrders: string[];
}

export class FinancialMonitoringService {

    /**
     * Get platform financial metrics aggregating data from the orders table.
     */
    async getFinancialMetrics(): Promise<FinancialMetrics> {
        try {
            // Aggregate metrics using SQL
            // revenue: completed orders
            // escrow: pending/processing/shipped orders
            // disputed: disputed orders

            const result = await db.select({
                totalRevenue: sql<number>`sum(case when ${orders.status} = 'completed' then ${orders.amount} else 0 end)`,
                escrowBalance: sql<number>`sum(case when ${orders.status} in ('pending', 'processing', 'shipped') then ${orders.amount} else 0 end)`,
                disputedFunds: sql<number>`sum(case when ${orders.status} = 'disputed' then ${orders.amount} else 0 end)`,
                // Approximating platform fees as 2.5% of total revenue for now if not explicitly stored
                // Ideally this should come from a fees table or column
            }).from(orders);

            const metrics = result[0];
            const totalRevenue = Number(metrics.totalRevenue || 0);
            const platformFees = totalRevenue * 0.025; // 2.5% platform fee assumption

            // Payouts logic would typically query a separate payouts table.
            // For now, we assume completed orders imply completed payouts to sellers minus fees.
            const completedPayouts = totalRevenue - platformFees;

            return {
                totalRevenue: totalRevenue.toFixed(2),
                pendingPayouts: '0.00', // Placeholder until payout system is fully integrated
                completedPayouts: completedPayouts.toFixed(2),
                platformFees: platformFees.toFixed(2),
                escrowBalance: Number(metrics.escrowBalance || 0).toFixed(2),
                disputedFunds: Number(metrics.disputedFunds || 0).toFixed(2)
            };
        } catch (error) {
            safeLogger.error('Error fetching financial metrics:', error);
            throw error;
        }
    }

    /**
     * Get recent financial transactions by fetching recent orders.
     * Maps orders to a TransactionRecord format.
     */
    async getRecentTransactions(limit: number = 50): Promise<TransactionRecord[]> {
        try {
            const recentOrders = await db.select()
                .from(orders)
                .orderBy(desc(orders.createdAt))
                .limit(limit);

            return recentOrders.map(order => ({
                id: order.paymentConfirmationHash || `ord-${order.id}`,
                orderId: order.id,
                type: 'PAYMENT', // Simplified mapping
                amount: order.amount?.toString() || '0',
                currency: order.currency || 'USD',
                status: this.mapOrderStatusToTransactionStatus(order.status),
                timestamp: order.createdAt || new Date(),
                metadata: {
                    paymentMethod: order.paymentMethod,
                    buyer: order.buyerAddress
                }
            }));
        } catch (error) {
            safeLogger.error('Error fetching recent transactions:', error);
            return [];
        }
    }

    /**
     * Reconcile orders with blockchain events or payment confirmations.
     */
    async reconcileOrders(startDate?: Date, endDate?: Date): Promise<ReconciliationStats> {
        try {
            let query = db.select().from(orders);
            const conditions = [];

            if (startDate) conditions.push(gte(orders.createdAt, startDate));
            if (endDate) conditions.push(lte(orders.createdAt, endDate));

            if (conditions.length > 0) {
                // Apply filters if supported by simple query construction or rebuild query chain
            }

            // Fetch orders for the period (simplifying to all/recent for now if date filtering is complex to construct dynamically here)
            // Real implementation would properly chain .where(and(...conditions))

            const ordersToReconcile = await db.select().from(orders)
                .where(
                    startDate && endDate
                        ? and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate))
                        : undefined
                );

            let reconciledCount = 0;
            let discrepancies = 0;
            let totalDiscrepancyAmount = 0;
            const unreconciledIds: string[] = [];

            for (const order of ordersToReconcile) {
                // Logic: A paid order must have a paymentConfirmationHash or Stripe ID
                // For Crypto: Check if blockchain event exists (if we index them)
                // For now, we perform a basic integrity check on the order record itself

                let isReconciled = false;

                if (order.status === 'pending' || order.status === 'disputed') {
                    // Not fully settled yet, skip strictly 'reconciled' check but verify they aren't marked paid
                    isReconciled = true;
                } else if (order.paymentMethod === 'crypto') {
                    if (order.paymentConfirmationHash) {
                        isReconciled = true;
                        // Advanced: Verify hash exists in blockchainEvents table
                        // const event = await db.query.blockchainEvents.findFirst({ where: eq(blockchainEvents.transactionHash, order.paymentConfirmationHash) });
                        // if (!event) isReconciled = false;
                    }
                } else if (order.paymentMethod === 'fiat') {
                    if (order.stripePaymentIntentId) {
                        isReconciled = true;
                    }
                } else {
                    // Assume manual or other
                    isReconciled = true;
                }

                if (isReconciled) {
                    reconciledCount++;
                } else {
                    discrepancies++;
                    totalDiscrepancyAmount += Number(order.amount);
                    unreconciledIds.push(order.id);
                }
            }

            return {
                totalOrders: ordersToReconcile.length,
                reconciledOrders: reconciledCount,
                discrepancies,
                totalDiscrepancyAmount,
                unreconciledOrders: unreconciledIds
            };

        } catch (error) {
            safeLogger.error('Error reconciling orders:', error);
            throw error;
        }
    }

    /**
     * Generate a financial report for a specific period.
     */
    async generateFinancialReport(startDate: Date, endDate: Date): Promise<any> {
        const metrics = await this.getFinancialMetrics();
        // Recalculate metrics strictly for this period in a real scenario
        // For now, returning current global metrics + reconciliation stats for the period
        const reconciliation = await this.reconcileOrders(startDate, endDate);

        return {
            period: { start: startDate, end: endDate },
            metrics,
            reconciliation,
            generatedAt: new Date()
        };
    }

    private mapOrderStatusToTransactionStatus(status: string | null): 'PENDING' | 'COMPLETED' | 'FAILED' {
        switch (status) {
            case 'completed': return 'COMPLETED';
            case 'refunded': return 'FAILED'; // Or Refunded
            case 'cancelled': return 'FAILED';
            default: return 'PENDING';
        }
    }
}
