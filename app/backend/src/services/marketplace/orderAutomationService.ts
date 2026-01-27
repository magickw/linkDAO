import { db } from '../db';
import { orders, orderEvents, orderAutomationLogs } from '../../db/schema';
import { eq, and, lt, isNull, sql, or, inArray, gt } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { OrderService } from './orderService';
import { NotificationService } from './notificationService';
import { OrderStatus } from '../../models/Order';

const orderService = new OrderService();
const notificationService = new NotificationService();

export interface AutomationRule {
    name: string;
    condition: (order: any) => boolean;
    action: (order: any) => Promise<void>;
    enabled: boolean;
}

class OrderAutomationService {
    private rules: AutomationRule[] = [];

    constructor() {
        this.initializeRules();
    }

    /**
     * Initialize automation rules
     */
    private initializeRules(): void {
        this.rules = [
            {
                name: 'auto_progress_paid_to_processing',
                condition: (order) => order.status === 'paid',
                action: async (order) => {
                    await this.progressToProcessing(order.id);
                },
                enabled: true
            },
            {
                name: 'auto_progress_tracking_to_shipped',
                condition: (order) =>
                    order.status === 'processing' && order.trackingNumber,
                action: async (order) => {
                    await this.progressToShipped(order.id);
                },
                enabled: true
            },
            {
                name: 'auto_complete_after_delivery',
                condition: (order) =>
                    order.status === 'delivered' &&
                    this.daysSince(order.actualDelivery || order.updatedAt) >= 7,
                action: async (order) => {
                    await this.completeOrder(order.id);
                },
                enabled: true
            },
            {
                name: 'alert_overdue_shipping',
                condition: (order) =>
                    (order.status === 'paid' || order.status === 'processing') &&
                    !order.trackingNumber &&
                    this.hoursSince(order.createdAt) >= 48,
                action: async (order) => {
                    await this.alertOverdueShipping(order.id);
                },
                enabled: true
            },
            {
                name: 'escalate_long_transit',
                condition: (order) =>
                    order.status === 'shipped' &&
                    !order.actualDelivery &&
                    this.daysSince(order.estimatedDelivery || order.updatedAt) >= 3,
                action: async (order) => {
                    await this.escalateLongTransit(order.id);
                },
                enabled: true
            }
        ];
    }

    /**
     * Process automation rules for an order
     */
    async processOrder(orderId: string): Promise<void> {
        try {
            const order = await orderService.getOrderById(orderId);
            if (!order) {
                safeLogger.warn(`Order not found for automation: ${orderId}`);
                return;
            }

            for (const rule of this.rules) {
                if (!rule.enabled) continue;

                try {
                    if (rule.condition(order)) {
                        safeLogger.info(`Executing automation rule: ${rule.name} for order ${orderId}`);
                        await rule.action(order);
                        await this.logAutomation(orderId, rule.name, 'executed', order.status);
                    }
                } catch (error) {
                    safeLogger.error(`Error executing rule ${rule.name}:`, error);
                    await this.logAutomation(
                        orderId,
                        rule.name,
                        'failed',
                        order.status,
                        error instanceof Error ? error.message : 'Unknown error'
                    );
                }
            }
        } catch (error) {
            safeLogger.error('Error processing order automation:', error);
        }
    }

    /**
     * Process all orders that might need automation
     */
    async processAllOrders(): Promise<{ processed: number; errors: number }> {
        try {
            // Get orders that might need automation
            const candidateOrders = await db
                .select()
                .from(orders)
                .where(
                    and(
                        inArray(orders.status, ['paid', 'processing', 'shipped', 'delivered']),
                        sql`${orders.createdAt} > NOW() - INTERVAL '30 days'`
                    )
                );

            let processed = 0;
            let errors = 0;

            for (const order of candidateOrders) {
                try {
                    await this.processOrder(order.id);
                    processed++;
                } catch (error) {
                    errors++;
                    safeLogger.error(`Error processing order ${order.id}:`, error);
                }
            }

            safeLogger.info(`Automation batch complete: ${processed} processed, ${errors} errors`);
            return { processed, errors };
        } catch (error) {
            safeLogger.error('Error in batch automation:', error);
            throw error;
        }
    }

    /**
     * Auto-progress order from PAID to PROCESSING
     */
    private async progressToProcessing(orderId: string): Promise<void> {
        try {
            const order = await orderService.getOrderById(orderId);
            if (!order) return;

            await orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING, {
                automationTriggered: true,
                automationRule: 'auto_progress_paid_to_processing'
            });

            // Notify seller
            await notificationService.sendOrderNotification(
                order.sellerWalletAddress,
                'ORDER_PROCESSING',
                orderId,
                {
                    recipientType: 'seller',
                    message: 'New order ready to fulfill! Please ship within 48 hours.'
                }
            );

            safeLogger.info(`Auto-progressed order ${orderId} to PROCESSING`);
        } catch (error) {
            safeLogger.error(`Error progressing order ${orderId} to PROCESSING:`, error);
            throw error;
        }
    }

    /**
     * Auto-progress order from PROCESSING to SHIPPED when tracking added
     */
    private async progressToShipped(orderId: string): Promise<void> {
        try {
            const order = await orderService.getOrderById(orderId);
            if (!order) return;

            await orderService.updateOrderStatus(orderId, OrderStatus.SHIPPED, {
                automationTriggered: true,
                automationRule: 'auto_progress_tracking_to_shipped'
            });

            // Notify buyer
            await notificationService.sendOrderNotification(
                order.buyerWalletAddress,
                'ORDER_SHIPPED',
                orderId,
                {
                    recipientType: 'buyer',
                    trackingNumber: order.trackingNumber,
                    carrier: order.trackingCarrier
                }
            );

            safeLogger.info(`Auto-progressed order ${orderId} to SHIPPED`);
        } catch (error) {
            safeLogger.error(`Error progressing order ${orderId} to SHIPPED:`, error);
            throw error;
        }
    }

    /**
     * Auto-complete order 7 days after delivery
     */
    private async completeOrder(orderId: string): Promise<void> {
        try {
            const order = await orderService.getOrderById(orderId);
            if (!order) return;

            await orderService.updateOrderStatus(orderId, OrderStatus.COMPLETED, {
                automationTriggered: true,
                automationRule: 'auto_complete_after_delivery',
                autoCompletedAt: new Date()
            });

            // Notify both parties
            await Promise.all([
                notificationService.sendOrderNotification(
                    order.buyerWalletAddress,
                    'ORDER_COMPLETED',
                    orderId,
                    {
                        recipientType: 'buyer',
                        message: 'Order completed. Funds released to seller.'
                    }
                ),
                notificationService.sendOrderNotification(
                    order.sellerWalletAddress,
                    'ORDER_COMPLETED',
                    orderId,
                    {
                        recipientType: 'seller',
                        message: 'Order completed. Funds released to your account.'
                    }
                )
            ]);

            safeLogger.info(`Auto-completed order ${orderId}`);
        } catch (error) {
            safeLogger.error(`Error completing order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Alert seller about overdue shipping
     */
    private async alertOverdueShipping(orderId: string): Promise<void> {
        try {
            const order = await orderService.getOrderById(orderId);
            if (!order) return;

            // Check if we've already sent this alert recently
            const recentAlerts = await db
                .select()
                .from(orderAutomationLogs)
                .where(
                    and(
                        eq(orderAutomationLogs.orderId, orderId),
                        eq(orderAutomationLogs.ruleName, 'alert_overdue_shipping'),
                        sql`created_at > NOW() - INTERVAL '24 hours'`
                    )
                );

            if (recentAlerts.length > 0) {
                return; // Don't spam alerts
            }

            await notificationService.sendOrderNotification(
                order.sellerWalletAddress,
                'SHIPPING_OVERDUE',
                orderId,
                {
                    recipientType: 'seller',
                    message: 'Order is overdue for shipping. Please add tracking information.',
                    urgency: 'high'
                }
            );

            // Also notify buyer
            await notificationService.sendOrderNotification(
                order.buyerWalletAddress,
                'SHIPPING_DELAYED',
                orderId,
                {
                    recipientType: 'buyer',
                    message: 'We\'ve notified the seller about the shipping delay.'
                }
            );

            safeLogger.info(`Sent overdue shipping alert for order ${orderId}`);
        } catch (error) {
            safeLogger.error(`Error sending overdue alert for order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Escalate orders stuck in transit
     */
    private async escalateLongTransit(orderId: string): Promise<void> {
        try {
            const order = await orderService.getOrderById(orderId);
            if (!order) return;

            await notificationService.sendOrderNotification(
                order.buyerWalletAddress,
                'DELIVERY_DELAYED',
                orderId,
                {
                    recipientType: 'buyer',
                    message: 'Your order is taking longer than expected. We\'re investigating.',
                    supportContact: true
                }
            );

            await notificationService.sendOrderNotification(
                order.sellerWalletAddress,
                'DELIVERY_DELAYED',
                orderId,
                {
                    recipientType: 'seller',
                    message: 'Order delivery is delayed. Please check with carrier.',
                    urgency: 'high'
                }
            );

            safeLogger.info(`Escalated long transit for order ${orderId}`);
        } catch (error) {
            safeLogger.error(`Error escalating transit for order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Log automation action
     */
    private async logAutomation(
        orderId: string,
        ruleName: string,
        actionTaken: string,
        previousStatus?: string,
        errorMessage?: string
    ): Promise<void> {
        try {
            await db.insert(orderAutomationLogs).values({
                orderId,
                ruleName,
                actionTaken,
                previousStatus: previousStatus || null,
                newStatus: null,
                success: !errorMessage,
                errorMessage: errorMessage || null,
                metadata: JSON.stringify({ timestamp: new Date() })
            });
        } catch (error) {
            safeLogger.error('Error logging automation:', error);
            // Don't throw - logging is optional
        }
    }

    /**
     * Get automation history for an order
     */
    async getAutomationHistory(orderId: string): Promise<any[]> {
        try {
            const logs = await db
                .select()
                .from(orderAutomationLogs)
                .where(eq(orderAutomationLogs.orderId, orderId))
                .orderBy(sql`created_at DESC`);

            return logs.map(log => ({
                id: log.id,
                ruleName: log.ruleName,
                actionTaken: log.actionTaken,
                previousStatus: log.previousStatus,
                newStatus: log.newStatus,
                success: log.success,
                errorMessage: log.errorMessage,
                createdAt: log.createdAt
            }));
        } catch (error) {
            safeLogger.error('Error getting automation history:', error);
            return [];
        }
    }

    /**
     * Helper: Calculate hours since a date
     */
    private hoursSince(date: Date | string | null): number {
        if (!date) return 0;
        const d = typeof date === 'string' ? new Date(date) : date;
        return (Date.now() - d.getTime()) / (1000 * 60 * 60);
    }

    /**
     * Helper: Calculate days since a date
     */
    private daysSince(date: Date | string | null): number {
        if (!date) return 0;
        const d = typeof date === 'string' ? new Date(date) : date;
        return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    }

    /**
     * Enable/disable a rule
     */
    setRuleEnabled(ruleName: string, enabled: boolean): void {
        const rule = this.rules.find(r => r.name === ruleName);
        if (rule) {
            rule.enabled = enabled;
            safeLogger.info(`Rule ${ruleName} ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get all rules and their status
     */
    getRules(): Array<{ name: string; enabled: boolean }> {
        return this.rules.map(r => ({
            name: r.name,
            enabled: r.enabled
        }));
    }
}

export const orderAutomationService = new OrderAutomationService();
