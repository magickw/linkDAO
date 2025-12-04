import { db } from '../db';
import { announcements, communities, communityMembers, users } from '../db/schema';
import { eq, and, desc, gt, or, isNull } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export interface CreateAnnouncementInput {
    communityId: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success';
    expiresAt?: Date;
    createdBy: string; // User ID (UUID)
}

export interface UpdateAnnouncementInput {
    title?: string;
    content?: string;
    type?: 'info' | 'warning' | 'success';
    isActive?: boolean;
    expiresAt?: Date;
}

export class AnnouncementService {
    /**
     * Check if user has permission to manage announcements
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
     * Create a new announcement
     */
    async createAnnouncement(input: CreateAnnouncementInput): Promise<{ success: boolean; message: string; data?: any }> {
        try {
            if (!db) return { success: false, message: 'Database not initialized' };

            const hasPermission = await this.checkPermission(input.createdBy, input.communityId);
            if (!hasPermission) {
                return { success: false, message: 'Permission denied' };
            }

            const result = await db.insert(announcements).values({
                communityId: input.communityId,
                title: input.title,
                content: input.content,
                type: input.type,
                createdBy: input.createdBy,
                expiresAt: input.expiresAt,
                isActive: true
            }).returning();

            return { success: true, message: 'Announcement created', data: result[0] };
        } catch (error) {
            safeLogger.error('Error creating announcement:', error);
            return { success: false, message: 'Failed to create announcement' };
        }
    }

    /**
     * Update an announcement
     */
    async updateAnnouncement(id: string, userId: string, input: UpdateAnnouncementInput): Promise<{ success: boolean; message: string; data?: any }> {
        try {
            if (!db) return { success: false, message: 'Database not initialized' };

            // Get announcement to check community ID
            const announcementResult = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
            const announcement = announcementResult[0];

            if (!announcement) {
                return { success: false, message: 'Announcement not found' };
            }

            const hasPermission = await this.checkPermission(userId, announcement.communityId);
            if (!hasPermission) {
                return { success: false, message: 'Permission denied' };
            }

            const result = await db.update(announcements)
                .set({
                    ...input,
                    // Ensure type safety for enum-like fields if needed
                })
                .where(eq(announcements.id, id))
                .returning();

            return { success: true, message: 'Announcement updated', data: result[0] };
        } catch (error) {
            safeLogger.error('Error updating announcement:', error);
            return { success: false, message: 'Failed to update announcement' };
        }
    }

    /**
     * Delete an announcement
     */
    async deleteAnnouncement(id: string, userId: string): Promise<{ success: boolean; message: string }> {
        try {
            if (!db) return { success: false, message: 'Database not initialized' };

            const announcementResult = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
            const announcement = announcementResult[0];

            if (!announcement) {
                return { success: false, message: 'Announcement not found' };
            }

            const hasPermission = await this.checkPermission(userId, announcement.communityId);
            if (!hasPermission) {
                return { success: false, message: 'Permission denied' };
            }

            await db.delete(announcements).where(eq(announcements.id, id));

            return { success: true, message: 'Announcement deleted' };
        } catch (error) {
            safeLogger.error('Error deleting announcement:', error);
            return { success: false, message: 'Failed to delete announcement' };
        }
    }

    /**
     * Get active announcements for a community
     */
    async getActiveAnnouncements(communityId: string) {
        try {
            if (!db) return [];

            const now = new Date();

            const activeAnnouncements = await db.select()
                .from(announcements)
                .where(and(
                    eq(announcements.communityId, communityId),
                    eq(announcements.isActive, true),
                    or(
                        isNull(announcements.expiresAt),
                        gt(announcements.expiresAt, now)
                    )
                ))
                .orderBy(desc(announcements.createdAt));

            return activeAnnouncements;
        } catch (error) {
            safeLogger.error('Error fetching active announcements:', error);
            return [];
        }
    }

    /**
     * Get all announcements for a community (for management)
     */
    async getAllAnnouncements(communityId: string, userId: string) {
        try {
            if (!db) return [];

            const hasPermission = await this.checkPermission(userId, communityId);
            if (!hasPermission) {
                throw new Error('Permission denied');
            }

            const allAnnouncements = await db.select()
                .from(announcements)
                .where(eq(announcements.communityId, communityId))
                .orderBy(desc(announcements.createdAt));

            return allAnnouncements;
        } catch (error) {
            safeLogger.error('Error fetching all announcements:', error);
            return [];
        }
    }
}

export const announcementService = new AnnouncementService();
