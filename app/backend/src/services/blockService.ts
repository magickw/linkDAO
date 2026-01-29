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
      console.log(`[BlockService] Blocking user: ${blockerAddress} -> ${blockedAddress}`);

      // Validate addresses
      if (!blockerAddress || !blockedAddress) {
        console.warn('[BlockService] Invalid addresses provided');
        return false;
      }

      // Prevent self-blocking
      if (blockerAddress.toLowerCase() === blockedAddress.toLowerCase()) {
        console.warn('[BlockService] Cannot block yourself');
        return false;
      }

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
        console.log('[BlockService] User already blocked');
        return false; // Already blocked
      }

      // Insert block relationship
      console.log('[BlockService] Inserting block record...');
      await db.insert(blockedUsers).values({
        blockerAddress,
        blockedAddress,
        createdAt: new Date(),
      });

      console.log('[BlockService] Block successful');
      return true;
    } catch (error: any) {
      console.error('[BlockService] Error blocking user:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        errorString: String(error)
      });
      // Return false instead of throwing to prevent crashes
      return false;
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
      console.log(`[BlockService] Unblocking user: ${blockerAddress} -> ${blockedAddress}`);

      // Validate addresses
      if (!blockerAddress || !blockedAddress) {
        console.warn('[BlockService] Invalid addresses provided for unblock');
        return false;
      }

      const result = await db
        .delete(blockedUsers)
        .where(
          and(
            eq(blockedUsers.blockerAddress, blockerAddress),
            eq(blockedUsers.blockedAddress, blockedAddress)
          )
        );

      console.log('[BlockService] Unblock successful');
      return true;
    } catch (error: any) {
      console.error('[BlockService] Error unblocking user:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        errorString: String(error)
      });
      // Return false instead of throwing to prevent crashes
      return false;
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
      if (!blockerAddress) {
        console.warn('[BlockService] Invalid blocker address');
        return [];
      }

      console.log(`[BlockService] Getting blocked users for: ${blockerAddress}`);
      const results = await db
        .select({ blockedAddress: blockedUsers.blockedAddress })
        .from(blockedUsers)
        .where(eq(blockedUsers.blockerAddress, blockerAddress));

      console.log(`[BlockService] Found ${results.length} blocked users`);
      return results.map(r => r.blockedAddress);
    } catch (error: any) {
      console.error('[BlockService] Error getting blocked users:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        errorString: String(error)
      });
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }

  /**
   * Get list of users who have blocked an address
   * @param blockedAddress - Address that might be blocked
   * @returns Array of blocker addresses
   */
  async getBlockedBy(blockedAddress: string): Promise<string[]> {
    try {
      if (!blockedAddress) {
        console.warn('[BlockService] Invalid blocked address');
        return [];
      }

      console.log(`[BlockService] Getting blocked by for: ${blockedAddress}`);
      const results = await db
        .select({ blockerAddress: blockedUsers.blockerAddress })
        .from(blockedUsers)
        .where(eq(blockedUsers.blockedAddress, blockedAddress));

      console.log(`[BlockService] Found ${results.length} users who blocked this address`);
      return results.map(r => r.blockerAddress);
    } catch (error: any) {
      console.error('[BlockService] Error getting blocked by users:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        errorString: String(error)
      });
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }
}
