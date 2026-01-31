/**
 * Blocked Users Service
 * Handles blocking/unblocking users and managing block list
 */

export interface BlockedUser {
  blockedAddress: string;
  blockerAddress: string;
  reason?: string;
  createdAt: string;
}

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

class BlockingService {
  /**
   * Get list of blocked users
   */
  async getBlockedUsers(): Promise<BlockedUser[]> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/messaging/blocked`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch blocked users: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.blockedUsers || [];
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }
  }

  /**
   * Block a user
   */
  async blockUser(userAddress: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/messaging/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userAddress, reason }),
      });

      if (!response.ok) {
        throw new Error(`Failed to block user: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userAddress: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/messaging/block/${userAddress}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to unblock user: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      return false;
    }
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(userAddress: string): Promise<boolean> {
    try {
      const blockedUsers = await this.getBlockedUsers();
      return blockedUsers.some(
        u => u.blockedAddress.toLowerCase() === userAddress.toLowerCase()
      );
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }
}

export const blockingService = new BlockingService();
