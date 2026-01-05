import { db } from '../db';
import { auditLogs } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export interface AuditLogEntry {
    id: string;
    userId: string | null; // Actor (null for system actions)
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    payload: any; // JSON object of changes/data
    ipAddress: string | null;
    userAgent: string | null;
    timestamp: Date;
}

export interface AuditLogFilter {
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export class AuditService {
    /**
     * Log an action to the audit_logs table
     */
    async logAction(entry: {
        userId?: string | null;
        action: string;
        resourceType?: string | null;
        resourceId?: string | null;
        payload?: any;
        ipAddress?: string | null;
        userAgent?: string | null;
    }): Promise<void> {
        try {
            await db.insert(auditLogs).values({
                userId: entry.userId || null,
                action: entry.action,
                resourceType: entry.resourceType || null,
                resourceId: entry.resourceId || null,
                payload: entry.payload ? JSON.stringify(entry.payload) : null,
                ipAddress: entry.ipAddress || null,
                userAgent: entry.userAgent || null,
            });

            safeLogger.info(`[AUDIT] ${entry.action} by ${entry.userId || 'SYSTEM'} on ${entry.resourceType}:${entry.resourceId}`);
        } catch (error) {
            safeLogger.error('Error logging audit action:', error);
            // Don't throw - audit logging should not break the main flow
        }
    }

    /**
     * Get audit logs with optional filters
     */
    async getLogs(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
        try {
            const conditions = [];

            if (filter.userId) {
                conditions.push(eq(auditLogs.userId, filter.userId));
            }

            if (filter.action) {
                conditions.push(eq(auditLogs.action, filter.action));
            }

            if (filter.resourceType) {
                conditions.push(eq(auditLogs.resourceType, filter.resourceType));
            }

            if (filter.resourceId) {
                conditions.push(eq(auditLogs.resourceId, filter.resourceId));
            }

            if (filter.startDate) {
                conditions.push(gte(auditLogs.timestamp, filter.startDate));
            }

            if (filter.endDate) {
                conditions.push(lte(auditLogs.timestamp, filter.endDate));
            }

            let query = db
                .select()
                .from(auditLogs)
                .orderBy(desc(auditLogs.timestamp));

            if (conditions.length > 0) {
                query = query.where(and(...conditions)) as any;
            }

            if (filter.limit) {
                query = query.limit(filter.limit) as any;
            }

            if (filter.offset) {
                query = query.offset(filter.offset) as any;
            }

            const results = await query;

            return results.map(row => ({
                id: row.id,
                userId: row.userId,
                action: row.action,
                resourceType: row.resourceType,
                resourceId: row.resourceId,
                payload: row.payload ? JSON.parse(row.payload) : null,
                ipAddress: row.ipAddress,
                userAgent: row.userAgent,
                timestamp: row.timestamp,
            }));
        } catch (error) {
            safeLogger.error('Error retrieving audit logs:', error);
            return [];
        }
    }

    /**
     * Get logs for a specific resource
     */
    async getLogsForResource(resourceType: string, resourceId: string, limit: number = 50): Promise<AuditLogEntry[]> {
        return this.getLogs({
            resourceType,
            resourceId,
            limit,
        });
    }

    /**
     * Get logs for a specific user
     */
    async getLogsForUser(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
        return this.getLogs({
            userId,
            limit,
        });
    }

    /**
     * Get recent logs
     */
    async getRecentLogs(limit: number = 100): Promise<AuditLogEntry[]> {
        return this.getLogs({ limit });
    }

    /**
     * Get audit log statistics
     */
    async getStatistics(startDate?: Date, endDate?: Date): Promise<{
        totalLogs: number;
        actionBreakdown: Record<string, number>;
        resourceTypeBreakdown: Record<string, number>;
        topUsers: Array<{ userId: string; count: number }>;
    }> {
        try {
            const conditions = [];

            if (startDate) {
                conditions.push(gte(auditLogs.timestamp, startDate));
            }

            if (endDate) {
                conditions.push(lte(auditLogs.timestamp, endDate));
            }

            // Get total count
            let countQuery = db
                .select({ count: sql<number>`count(*)` })
                .from(auditLogs);

            if (conditions.length > 0) {
                countQuery = countQuery.where(and(...conditions)) as any;
            }

            const [{ count: totalLogs }] = await countQuery;

            // Get action breakdown
            let actionQuery = db
                .select({
                    action: auditLogs.action,
                    count: sql<number>`count(*)`,
                })
                .from(auditLogs)
                .groupBy(auditLogs.action);

            if (conditions.length > 0) {
                actionQuery = actionQuery.where(and(...conditions)) as any;
            }

            const actionResults = await actionQuery;
            const actionBreakdown: Record<string, number> = {};
            actionResults.forEach(row => {
                actionBreakdown[row.action] = Number(row.count);
            });

            // Get resource type breakdown
            let resourceQuery = db
                .select({
                    resourceType: auditLogs.resourceType,
                    count: sql<number>`count(*)`,
                })
                .from(auditLogs)
                .groupBy(auditLogs.resourceType);

            if (conditions.length > 0) {
                resourceQuery = resourceQuery.where(and(...conditions)) as any;
            }

            const resourceResults = await resourceQuery;
            const resourceTypeBreakdown: Record<string, number> = {};
            resourceResults.forEach(row => {
                if (row.resourceType) {
                    resourceTypeBreakdown[row.resourceType] = Number(row.count);
                }
            });

            // Get top users
            let userQuery = db
                .select({
                    userId: auditLogs.userId,
                    count: sql<number>`count(*)`,
                })
                .from(auditLogs)
                .groupBy(auditLogs.userId)
                .orderBy(desc(sql`count(*)`))
                .limit(10);

            if (conditions.length > 0) {
                userQuery = userQuery.where(and(...conditions)) as any;
            }

            const userResults = await userQuery;
            const topUsers = userResults
                .filter(row => row.userId !== null)
                .map(row => ({
                    userId: row.userId!,
                    count: Number(row.count),
                }));

            return {
                totalLogs: Number(totalLogs),
                actionBreakdown,
                resourceTypeBreakdown,
                topUsers,
            };
        } catch (error) {
            safeLogger.error('Error getting audit log statistics:', error);
            return {
                totalLogs: 0,
                actionBreakdown: {},
                resourceTypeBreakdown: {},
                topUsers: [],
            };
        }
    }

    /**
     * Delete old audit logs (for cleanup/retention policies)
     */
    async deleteOldLogs(olderThan: Date): Promise<number> {
        try {
            const result = await db
                .delete(auditLogs)
                .where(lte(auditLogs.timestamp, olderThan));

            safeLogger.info(`Deleted audit logs older than ${olderThan.toISOString()}`);
            return 0; // Drizzle doesn't return affected rows count easily
        } catch (error) {
            safeLogger.error('Error deleting old audit logs:', error);
            return 0;
        }
    }
}

// Export singleton instance
export const auditService = new AuditService();
