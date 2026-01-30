/**
 * Mute Service
 * Handles muting and unmuting users
 */

import { db } from '../db';
import { mutedUsers, users } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export class MuteService {
  /**
   * Mute a user
   */
  async muteUser(muterId: string, mutedId: string, reason?: string): Promise<boolean> {
    try {
      // Don't allow self-muting
      if (muterId === mutedId) {
        throw new Error('Cannot mute yourself');
      }

      // Check if already muted
      const existing = await db
        .select()
        .from(mutedUsers)
        .where(and(
          eq(mutedUsers.muterId, muterId),
          eq(mutedUsers.mutedId, mutedId)
        ))
        .limit(1);

      if (existing.length > 0) {
        safeLogger.info(`[MuteService] User ${muterId} has already muted ${mutedId}`);
        return true; // Already muted
      }

      // Create mute record
      await db.insert(mutedUsers).values({
        muterId,
        mutedId,
        reason: reason || null
      });

      safeLogger.info(`[MuteService] User ${muterId} muted ${mutedId}`);
      return true;
    } catch (error) {
      safeLogger.error('[MuteService] Error muting user:', error);
      throw error;
    }
  }

  /**
   * Unmute a user
   */
  async unmuteUser(muterId: string, mutedId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(mutedUsers)
        .where(and(
          eq(mutedUsers.muterId, muterId),
          eq(mutedUsers.mutedId, mutedId)
        ))
        .returning();

      if (result.length === 0) {
        safeLogger.warn(`[MuteService] No mute record found for ${muterId} -> ${mutedId}`);
        return false;
      }

      safeLogger.info(`[MuteService] User ${muterId} unmuted ${mutedId}`);
      return true;
    } catch (error) {
      safeLogger.error('[MuteService] Error unmuting user:', error);
      throw error;
    }
  }

  /**
   * Check if a user is muted by another user
   */
  async isMuted(muterId: string, mutedId: string): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(mutedUsers)
        .where(and(
          eq(mutedUsers.muterId, muterId),
          eq(mutedUsers.mutedId, mutedId)
        ))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      safeLogger.error('[MuteService] Error checking mute status:', error);
      return false;
    }
  }

  /**
   * Get all muted users for a specific user
   */
  async getMutedUsers(muterId: string): Promise<string[]> {
    try {
      const muted = await db
        .select({ mutedId: mutedUsers.mutedId })
        .from(mutedUsers)
        .where(eq(mutedUsers.muterId, muterId));

      return muted.map(m => m.mutedId);
    } catch (error) {
      safeLogger.error('[MuteService] Error getting muted users:', error);
      return [];
    }
  }

  /**
   * Get muted users with user details
   */
  async getMutedUsersWithDetails(muterId: string): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: mutedUsers.id,
          mutedUser: {
            id: users.id,
            walletAddress: users.walletAddress,
            handle: users.handle,
            displayName: users.displayName,
            avatarCid: users.avatarCid
          },
          reason: mutedUsers.reason,
          mutedAt: mutedUsers.createdAt
        })
        .from(mutedUsers)
        .innerJoin(users, eq(mutedUsers.mutedId, users.id))
        .where(eq(mutedUsers.muterId, muterId));

      return result;
    } catch (error) {
      safeLogger.error('[MuteService] Error getting muted users with details:', error);
      return [];
    }
  }

  /**
   * Filter out muted users from a list of user IDs
   * Returns only the user IDs that are NOT muted
   */
  async filterMutedUsers(muterId: string, userIds: string[]): Promise<string[]> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    try {
      const mutedUserIds = await this.getMutedUsers(muterId);
      if (mutedUserIds.length === 0) {
        return userIds;
      }

      // Filter out muted users
      return userIds.filter(id => !mutedUserIds.includes(id));
    } catch (error) {
      safeLogger.error('[MuteService] Error filtering muted users:', error);
      return userIds; // Return original list if error
    }
  }

  /**
   * Bulk check if users are muted
   * Returns a map of userId -> isMuted
   */
  async checkMutedStatus(muterId: string, userIds: string[]): Promise<Map<string, boolean>> {
    const statusMap = new Map<string, boolean>();

    if (!userIds || userIds.length === 0) {
      return statusMap;
    }

    try {
      const muted = await db
        .select({ mutedId: mutedUsers.mutedId })
        .from(mutedUsers)
        .where(and(
          eq(mutedUsers.muterId, muterId),
          inArray(mutedUsers.mutedId, userIds)
        ));

      const mutedSet = new Set(muted.map(m => m.mutedId));

      // Initialize all as not muted, then mark muted ones
      userIds.forEach(userId => {
        statusMap.set(userId, mutedSet.has(userId));
      });

      return statusMap;
    } catch (error) {
      safeLogger.error('[MuteService] Error checking muted status:', error);
      // Return all as not muted if error
      userIds.forEach(userId => {
        statusMap.set(userId, false);
      });
      return statusMap;
    }
  }

  /**
   * Get count of muted users
   */
  async getMutedCount(muterId: string): Promise<number> {
    try {
      const muted = await this.getMutedUsers(muterId);
      return muted.length;
    } catch (error) {
      safeLogger.error('[MuteService] Error getting muted count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const muteService = new MuteService();
