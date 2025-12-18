import { enhancedAuthService } from './enhancedAuthService';
import { csrfService } from './csrfService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.linkdao.io';

export class BlockService {
  /**
   * Block a user
   * @param blocker - Address of the user blocking
   * @param blocked - Address of the user being blocked
   * @returns True if successful
   */
  static async block(blocker: string, blocked: string): Promise<boolean> {
    const authHeaders = await enhancedAuthService.getAuthHeaders();
    const csrfHeaders = await csrfService.getCSRFHeaders();

    const response = await fetch(`${API_BASE_URL}/api/block/block`, {
      method: 'POST',
      headers: {
        ...csrfHeaders,
        ...authHeaders,
      },
      body: JSON.stringify({ blocker, blocked }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to block user');
    }

    return true;
  }

  /**
   * Unblock a user
   * @param blocker - Address of the user who blocked
   * @param blocked - Address of the user to unblock
   * @returns True if successful
   */
  static async unblock(blocker: string, blocked: string): Promise<boolean> {
    const authHeaders = await enhancedAuthService.getAuthHeaders();
    const csrfHeaders = await csrfService.getCSRFHeaders();

    const response = await fetch(`${API_BASE_URL}/api/block/unblock`, {
      method: 'POST',
      headers: {
        ...csrfHeaders,
        ...authHeaders,
      },
      body: JSON.stringify({ blocker, blocked }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to unblock user');
    }

    return true;
  }

  /**
   * Check if a user has blocked another user
   * @param blocker - Address of the potential blocker
   * @param blocked - Address of the potentially blocked user
   * @returns True if blocked
   */
  static async isBlocked(blocker: string, blocked: string): Promise<boolean> {
    const authHeaders = await enhancedAuthService.getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/block/is-blocked/${blocker}/${blocked}`,
      {
        headers: {
          ...authHeaders,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check block status');
    }

    const data = await response.json();
    return data.isBlocked === true;
  }

  /**
   * Get list of users blocked by an address
   * @param address - Address of the blocker
   * @returns Array of blocked addresses
   */
  static async getBlockedUsers(address: string): Promise<string[]> {
    const authHeaders = await enhancedAuthService.getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/block/blocked-users/${address}`,
      {
        headers: {
          ...authHeaders,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get blocked users');
    }

    return response.json();
  }

  /**
   * Get list of users who have blocked an address
   * @param address - Address that might be blocked
   * @returns Array of blocker addresses
   */
  static async getBlockedBy(address: string): Promise<string[]> {
    const authHeaders = await enhancedAuthService.getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/block/blocked-by/${address}`,
      {
        headers: {
          ...authHeaders,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get blocked by users');
    }

    return response.json();
  }
}
