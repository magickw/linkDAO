import { db } from '../db';
import { blockedUsers } from '../db/schema';
import { and, eq, or } from 'drizzle-orm';

export class BlockService {
  /**
   * Block a user
   * @param blockerAddress - Address of the user blocking
   * @param blockedAddress - Address of the user being blocked
   * @returns True if successful
   */
  async blockUser(blockerAddress: string, blockedAddress: string): Promise<boolean> {
    try {
      // Check if already blocked
      const existing = await db
        .select()
        .from(blockedUsers)
        .where(
          and(
            eq(blockedUsers.blockerAddress, blockerAddress),
            eq(blockedUsers.blockedAddress, blockedAddress)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return false; // Already blocked
      }

      // Insert block relationship
      await db.insert(blockedUsers).values({
        blockerAddress,
        blockedAddress,
        createdAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   * @param blockerAddress - Address of the user who blocked
   * @param blockedAddress - Address of the user to unblock
   * @returns True if successful
   */
  async unblockUser(blockerAddress: string, blockedAddress: string): Promise<boolean> {
    try {
      const result = await db
        .delete(blockedUsers)
        .where(
          and(
            eq(blockedUsers.blockerAddress, blockerAddress),
            eq(blockedUsers.blockedAddress, blockedAddress)
          )
        );

      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Check if a user has blocked another user
   * @param blockerAddress - Address of the potential blocker
   * @param blockedAddress - Address of the potentially blocked user
   * @returns True if blocked
   */
  async isBlocked(blockerAddress: string, blockedAddress: string): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(blockedUsers)
        .where(
          and(
            eq(blockedUsers.blockerAddress, blockerAddress),
            eq(blockedUsers.blockedAddress, blockedAddress)
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error('Error checking block status:', error);
      return false;
    }
  }

  /**
   * Get list of users blocked by an address
   * @param blockerAddress - Address of the blocker
   * @returns Array of blocked addresses
   */
  async getBlockedUsers(blockerAddress: string): Promise<string[]> {
    try {
      const results = await db
        .select({ blockedAddress: blockedUsers.blockedAddress })
        .from(blockedUsers)
        .where(eq(blockedUsers.blockerAddress, blockerAddress));

      return results.map(r => r.blockedAddress);
    } catch (error) {
      console.error('Error getting blocked users:', error);
      throw error;
    }
  }

  /**
   * Get list of users who have blocked an address
   * @param blockedAddress - Address that might be blocked
   * @returns Array of blocker addresses
   */
  async getBlockedBy(blockedAddress: string): Promise<string[]> {
    try {
      const results = await db
        .select({ blockerAddress: blockedUsers.blockerAddress })
        .from(blockedUsers)
        .where(eq(blockedUsers.blockedAddress, blockedAddress));

      return results.map(r => r.blockerAddress);
    } catch (error) {
      console.error('Error getting blocked by users:', error);
      throw error;
    }
  }
}
