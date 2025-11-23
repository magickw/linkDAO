import { db } from '../db';
import { userBehaviorLogs, userTransactions, purchases, walletActivity, riskFlags, auditLogs, users } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, gt, sql } from 'drizzle-orm';

export class TrackingService {

    // Track generic user behavior event
    async trackEvent(data: {
        userId?: string;
        eventType: string;
        metadata?: any;
        ipAddress?: string;
        userAgent?: string;
        sessionId?: string;
        path?: string;
    }) {
        try {
            const { userId, eventType, metadata, ipAddress, userAgent, sessionId, path } = data;

            await db.insert(userBehaviorLogs).values({
                userId: userId || null,
                eventType,
                metadata: metadata ? JSON.stringify(metadata) : null,
                ipAddress,
                userAgent,
                sessionId,
                path,
                timestamp: new Date()
            });

            // Basic risk check for high velocity events
            if (userId) {
                await this.checkEventVelocity(userId);
            }

        } catch (error) {
            safeLogger.error('Error tracking event:', error);
            // Don't throw, just log to prevent disrupting user flow
        }
    }

    // Track on-chain transaction
    async trackTransaction(data: {
        userId?: string;
        txHash: string;
        chain?: string;
        eventType: string;
        token?: string;
        amount?: string;
        status?: string;
        blockNumber?: number;
    }) {
        try {
            await db.insert(userTransactions).values({
                userId: data.userId || null,
                txHash: data.txHash,
                chain: data.chain || 'ethereum',
                eventType: data.eventType,
                token: data.token,
                amount: data.amount,
                status: data.status || 'pending',
                blockNumber: data.blockNumber,
                timestamp: new Date()
            }).onConflictDoUpdate({
                target: userTransactions.txHash,
                set: {
                    status: data.status,
                    blockNumber: data.blockNumber,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            safeLogger.error('Error tracking transaction:', error);
        }
    }

    // Track marketplace purchase
    async trackPurchase(data: {
        buyerId: string;
        sellerId: string;
        productId?: string;
        price: string;
        currency: string;
        escrowId?: string;
        txHash?: string;
        metadata?: any;
    }) {
        try {
            await db.insert(purchases).values({
                buyerId: data.buyerId,
                sellerId: data.sellerId,
                productId: data.productId,
                price: data.price,
                currency: data.currency,
                escrowId: data.escrowId,
                txHash: data.txHash,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null,
                status: 'pending',
                timestamp: new Date()
            });

            // Check for high value purchase risk
            await this.checkHighValuePurchase(data.buyerId, data.price, data.currency);

        } catch (error) {
            safeLogger.error('Error tracking purchase:', error);
        }
    }

    // Track wallet activity
    async trackWalletActivity(data: {
        walletAddress: string;
        userId?: string;
        activityType: string;
        txHash?: string;
        amount?: string;
        token?: string;
        chainId?: number;
        metadata?: any;
    }) {
        try {
            await db.insert(walletActivity).values({
                walletAddress: data.walletAddress,
                userId: data.userId || null,
                activityType: data.activityType,
                txHash: data.txHash,
                amount: data.amount,
                token: data.token,
                chainId: data.chainId,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null,
                timestamp: new Date()
            });
        } catch (error) {
            safeLogger.error('Error tracking wallet activity:', error);
        }
    }

    // Log audit event
    async logAudit(data: {
        userId?: string;
        action: string;
        resourceType?: string;
        resourceId?: string;
        payload?: any;
        ipAddress?: string;
        userAgent?: string;
    }) {
        try {
            await db.insert(auditLogs).values({
                userId: data.userId || null,
                action: data.action,
                resourceType: data.resourceType,
                resourceId: data.resourceId,
                payload: data.payload ? JSON.stringify(data.payload) : null,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                timestamp: new Date()
            });
        } catch (error) {
            safeLogger.error('Error logging audit event:', error);
        }
    }

    // --- Risk Detection Logic ---

    // Check for high event velocity (potential bot)
    private async checkEventVelocity(userId: string) {
        try {
            const oneMinuteAgo = new Date(Date.now() - 60000);

            const recentEvents = await db
                .select({ count: sql<number>`count(*)` })
                .from(userBehaviorLogs)
                .where(and(
                    eq(userBehaviorLogs.userId, userId),
                    gt(userBehaviorLogs.timestamp, oneMinuteAgo)
                ));

            const count = Number(recentEvents[0]?.count || 0);

            if (count > 60) { // More than 1 event per second on average
                await this.flagRisk(userId, 'High Event Velocity', 'medium', `User generated ${count} events in the last minute.`);
            }
        } catch (error) {
            safeLogger.error('Error checking event velocity:', error);
        }
    }

    // Check for high value purchases on new accounts
    private async checkHighValuePurchase(userId: string, price: string, currency: string) {
        try {
            // Simple threshold check (e.g., > 1000 USD/USDC)
            const numericPrice = parseFloat(price);
            if (isNaN(numericPrice)) return;

            // Normalize currency check (simplified)
            const isHighValue = (currency === 'USDC' || currency === 'USD') && numericPrice > 1000;

            if (isHighValue) {
                // Check account age
                const user = await db.select({ createdAt: users.createdAt })
                    .from(users)
                    .where(eq(users.id, userId))
                    .limit(1)
                    .then(res => res[0]);

                if (user && user.createdAt) {
                    const accountAgeHours = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);

                    if (accountAgeHours < 24) {
                        await this.flagRisk(userId, 'High Value Purchase - New Account', 'high', `New account (<24h) made a purchase of ${price} ${currency}.`);
                    }
                }
            }
        } catch (error) {
            safeLogger.error('Error checking high value purchase:', error);
        }
    }

    // Create a risk flag
    async flagRisk(userId: string, flagType: string, severity: string, description: string) {
        try {
            // Check if active flag already exists to avoid spamming
            const existingFlag = await db.select()
                .from(riskFlags)
                .where(and(
                    eq(riskFlags.userId, userId),
                    eq(riskFlags.flagType, flagType),
                    eq(riskFlags.status, 'active')
                ))
                .limit(1)
                .then(res => res[0]);

            if (!existingFlag) {
                await db.insert(riskFlags).values({
                    userId,
                    flagType,
                    severity,
                    description,
                    score: severity === 'critical' ? 100 : severity === 'high' ? 75 : severity === 'medium' ? 50 : 25,
                    status: 'active',
                    createdAt: new Date()
                });

                safeLogger.warn(`[RISK] Flagged user ${userId}: ${flagType} (${severity})`);
            }
        } catch (error) {
            safeLogger.error('Error creating risk flag:', error);
        }
    }
    // --- Data Retrieval for Dashboard ---

    async getMonitoringStats() {
        try {
            const [totalEvents, totalTransactions, totalRiskFlags, highRiskUsers] = await Promise.all([
                db.select({ count: sql<number>`count(*)` }).from(userBehaviorLogs).then(res => Number(res[0]?.count || 0)),
                db.select({ count: sql<number>`count(*)` }).from(userTransactions).then(res => Number(res[0]?.count || 0)),
                db.select({ count: sql<number>`count(*)` }).from(riskFlags).then(res => Number(res[0]?.count || 0)),
                db.select({ count: sql<number>`count(distinct ${riskFlags.userId})` })
                    .from(riskFlags)
                    .where(eq(riskFlags.severity, 'high'))
                    .then(res => Number(res[0]?.count || 0))
            ]);

            return {
                totalEvents,
                totalTransactions,
                totalRiskFlags,
                highRiskUsers
            };
        } catch (error) {
            safeLogger.error('Error getting monitoring stats:', error);
            return { totalEvents: 0, totalTransactions: 0, totalRiskFlags: 0, highRiskUsers: 0 };
        }
    }

    async getRecentActivity(limit: number = 50) {
        try {
            return await db.select()
                .from(userBehaviorLogs)
                .orderBy(sql`${userBehaviorLogs.timestamp} DESC`)
                .limit(limit);
        } catch (error) {
            safeLogger.error('Error getting recent activity:', error);
            return [];
        }
    }

    async getRiskFlags(limit: number = 50) {
        try {
            return await db.select()
                .from(riskFlags)
                .orderBy(sql`${riskFlags.createdAt} DESC`)
                .limit(limit);
        } catch (error) {
            safeLogger.error('Error getting risk flags:', error);
            return [];
        }
    }
}

export const trackingService = new TrackingService();
