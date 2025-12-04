import { db } from '../db';
import { monthlyUpdates, communities, communityMembers, users } from '../db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export interface MonthlyUpdateHighlight {
    title: string;
    description: string;
    icon?: string;
    link?: string;
}

export interface MonthlyUpdateMetrics {
    newMembers?: number;
    totalPosts?: number;
    activeProposals?: number;
    treasuryBalance?: string;
    engagementRate?: number;
    [key: string]: any;
}

export interface CreateMonthlyUpdateInput {
    communityId: string;
    title: string;
    content: string;
    summary?: string;
    month: number; // 1-12
    year: number;
    highlights?: MonthlyUpdateHighlight[];
    metrics?: MonthlyUpdateMetrics;
    mediaCids?: string[];
    createdBy: string; // User ID (UUID)
}

export interface UpdateMonthlyUpdateInput {
    title?: string;
    content?: string;
    summary?: string;
    highlights?: MonthlyUpdateHighlight[];
    metrics?: MonthlyUpdateMetrics;
    mediaCids?: string[];
    isPublished?: boolean;
}

export class MonthlyUpdateService {
    /**
     * Check if user has permission to manage monthly updates
     */
    private async checkPermission(userId: string, communityId: string): Promise<boolean> {
        try {
            if (!db) return false;

            // Get user's wallet address
            const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            const user = userResult[0];

            if (!user || !user.walletAddress) return false;

            const walletAddress = user.walletAddress.toLowerCase();

            // Check if user is creator
            const communityResult = await db.select().from(communities).where(eq(communities.id, communityId)).limit(1);
            const community = communityResult[0];

            if (community && community.creatorAddress && community.creatorAddress.toLowerCase() === walletAddress) {
                return true;
            }

            // Check if user is admin or moderator
            const memberResult = await db.select().from(communityMembers).where(and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, walletAddress)
            )).limit(1);
            const member = memberResult[0];

            if (member && (member.role === 'admin' || member.role === 'moderator')) {
                return true;
            }

            // Legacy check
            if (community && community.moderators) {
                try {
                    const moderators = JSON.parse(community.moderators);
                    if (Array.isArray(moderators) && moderators.some((m: string) => m.toLowerCase() === walletAddress)) {
                        return true;
                    }
                } catch (e) {
                    // Ignore parsing error
                }
            }

            return false;
        } catch (error) {
            safeLogger.error('Error checking permissions:', error);
            return false;
        }
    }

    /**
     * Create a new monthly update
     */
    async createMonthlyUpdate(input: CreateMonthlyUpdateInput): Promise<{ success: boolean; message: string; data?: any }> {
        try {
            if (!db) return { success: false, message: 'Database not initialized' };

            // Validate month
            if (input.month < 1 || input.month > 12) {
                return { success: false, message: 'Invalid month (must be 1-12)' };
            }

            const hasPermission = await this.checkPermission(input.createdBy, input.communityId);
            if (!hasPermission) {
                return { success: false, message: 'Permission denied' };
            }

            const result = await db.insert(monthlyUpdates).values({
                communityId: input.communityId,
                title: input.title,
                content: input.content,
                summary: input.summary,
                month: input.month,
                year: input.year,
                highlights: input.highlights || [],
                metrics: input.metrics || {},
                mediaCids: input.mediaCids ? JSON.stringify(input.mediaCids) : null,
                createdBy: input.createdBy,
                isPublished: false
            }).returning();

            return { success: true, message: 'Monthly update created', data: result[0] };
        } catch (error: any) {
            safeLogger.error('Error creating monthly update:', error);
            // Handle unique constraint violation
            if (error.code === '23505') {
                return { success: false, message: 'A monthly update already exists for this month' };
            }
            return { success: false, message: 'Failed to create monthly update' };
        }
    }

    /**
     * Update a monthly update
     */
    async updateMonthlyUpdate(id: string, userId: string, input: UpdateMonthlyUpdateInput): Promise<{ success: boolean; message: string; data?: any }> {
        try {
            if (!db) return { success: false, message: 'Database not initialized' };

            // Get update to check community ID
            const updateResult = await db.select().from(monthlyUpdates).where(eq(monthlyUpdates.id, id)).limit(1);
            const update = updateResult[0];

            if (!update) {
                return { success: false, message: 'Monthly update not found' };
            }

            const hasPermission = await this.checkPermission(userId, update.communityId);
            if (!hasPermission) {
                return { success: false, message: 'Permission denied' };
            }

            const updateData: any = {
                updatedAt: new Date()
            };

            if (input.title !== undefined) updateData.title = input.title;
            if (input.content !== undefined) updateData.content = input.content;
            if (input.summary !== undefined) updateData.summary = input.summary;
            if (input.highlights !== undefined) updateData.highlights = input.highlights;
            if (input.metrics !== undefined) updateData.metrics = input.metrics;
            if (input.mediaCids !== undefined) updateData.mediaCids = JSON.stringify(input.mediaCids);
            if (input.isPublished !== undefined) {
                updateData.isPublished = input.isPublished;
                if (input.isPublished && !update.publishedAt) {
                    updateData.publishedAt = new Date();
                }
            }

            const result = await db.update(monthlyUpdates)
                .set(updateData)
                .where(eq(monthlyUpdates.id, id))
                .returning();

            return { success: true, message: 'Monthly update updated', data: result[0] };
        } catch (error) {
            safeLogger.error('Error updating monthly update:', error);
            return { success: false, message: 'Failed to update monthly update' };
        }
    }

    /**
     * Publish a monthly update
     */
    async publishMonthlyUpdate(id: string, userId: string): Promise<{ success: boolean; message: string; data?: any }> {
        return this.updateMonthlyUpdate(id, userId, { isPublished: true });
    }

    /**
     * Unpublish a monthly update
     */
    async unpublishMonthlyUpdate(id: string, userId: string): Promise<{ success: boolean; message: string; data?: any }> {
        return this.updateMonthlyUpdate(id, userId, { isPublished: false });
    }

    /**
     * Delete a monthly update
     */
    async deleteMonthlyUpdate(id: string, userId: string): Promise<{ success: boolean; message: string }> {
        try {
            if (!db) return { success: false, message: 'Database not initialized' };

            const updateResult = await db.select().from(monthlyUpdates).where(eq(monthlyUpdates.id, id)).limit(1);
            const update = updateResult[0];

            if (!update) {
                return { success: false, message: 'Monthly update not found' };
            }

            const hasPermission = await this.checkPermission(userId, update.communityId);
            if (!hasPermission) {
                return { success: false, message: 'Permission denied' };
            }

            await db.delete(monthlyUpdates).where(eq(monthlyUpdates.id, id));

            return { success: true, message: 'Monthly update deleted' };
        } catch (error) {
            safeLogger.error('Error deleting monthly update:', error);
            return { success: false, message: 'Failed to delete monthly update' };
        }
    }

    /**
     * Get a single monthly update by ID
     */
    async getMonthlyUpdate(id: string) {
        try {
            if (!db) return null;

            const result = await db.select().from(monthlyUpdates).where(eq(monthlyUpdates.id, id)).limit(1);

            if (result[0]) {
                return {
                    ...result[0],
                    mediaCids: result[0].mediaCids ? JSON.parse(result[0].mediaCids) : []
                };
            }
            return null;
        } catch (error) {
            safeLogger.error('Error fetching monthly update:', error);
            return null;
        }
    }

    /**
     * Get published monthly updates for a community
     */
    async getPublishedUpdates(communityId: string, limit: number = 12) {
        try {
            if (!db) return [];

            const updates = await db.select()
                .from(monthlyUpdates)
                .where(and(
                    eq(monthlyUpdates.communityId, communityId),
                    eq(monthlyUpdates.isPublished, true)
                ))
                .orderBy(desc(monthlyUpdates.year), desc(monthlyUpdates.month))
                .limit(limit);

            return updates.map(update => ({
                ...update,
                mediaCids: update.mediaCids ? JSON.parse(update.mediaCids) : []
            }));
        } catch (error) {
            safeLogger.error('Error fetching published monthly updates:', error);
            return [];
        }
    }

    /**
     * Get all monthly updates for a community (for management)
     */
    async getAllUpdates(communityId: string, userId: string) {
        try {
            if (!db) return [];

            const hasPermission = await this.checkPermission(userId, communityId);
            if (!hasPermission) {
                throw new Error('Permission denied');
            }

            const updates = await db.select()
                .from(monthlyUpdates)
                .where(eq(monthlyUpdates.communityId, communityId))
                .orderBy(desc(monthlyUpdates.year), desc(monthlyUpdates.month));

            return updates.map(update => ({
                ...update,
                mediaCids: update.mediaCids ? JSON.parse(update.mediaCids) : []
            }));
        } catch (error) {
            safeLogger.error('Error fetching all monthly updates:', error);
            return [];
        }
    }

    /**
     * Get monthly update for a specific month/year
     */
    async getUpdateForMonth(communityId: string, month: number, year: number) {
        try {
            if (!db) return null;

            const result = await db.select()
                .from(monthlyUpdates)
                .where(and(
                    eq(monthlyUpdates.communityId, communityId),
                    eq(monthlyUpdates.month, month),
                    eq(monthlyUpdates.year, year)
                ))
                .limit(1);

            if (result[0]) {
                return {
                    ...result[0],
                    mediaCids: result[0].mediaCids ? JSON.parse(result[0].mediaCids) : []
                };
            }
            return null;
        } catch (error) {
            safeLogger.error('Error fetching monthly update for month:', error);
            return null;
        }
    }

    /**
     * Get latest published update for a community
     */
    async getLatestUpdate(communityId: string) {
        try {
            if (!db) return null;

            const result = await db.select()
                .from(monthlyUpdates)
                .where(and(
                    eq(monthlyUpdates.communityId, communityId),
                    eq(monthlyUpdates.isPublished, true)
                ))
                .orderBy(desc(monthlyUpdates.year), desc(monthlyUpdates.month))
                .limit(1);

            if (result[0]) {
                return {
                    ...result[0],
                    mediaCids: result[0].mediaCids ? JSON.parse(result[0].mediaCids) : []
                };
            }
            return null;
        } catch (error) {
            safeLogger.error('Error fetching latest monthly update:', error);
            return null;
        }
    }
}

export const monthlyUpdateService = new MonthlyUpdateService();
