// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

/**
 * Follow API Service
 * Provides functions to interact with the backend follow API endpoints
 */
export class FollowService {
  /**
   * Follow a user
   * @param follower - Address of the follower
   * @param following - Address of the user being followed
   * @returns True if successful
   */
  static async follow(follower: string, following: string): Promise<boolean> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/follow/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ follower, following }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to follow user');
    }

    return true;
  }

  /**
   * Unfollow a user
   * @param follower - Address of the follower
   * @param following - Address of the user being unfollowed
   * @returns True if successful
   */
  static async unfollow(follower: string, following: string): Promise<boolean> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/follow/unfollow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ follower, following }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unfollow user');
    }

    return true;
  }

  /**
   * Get followers of a user
   * @param address - Address of the user
   * @returns Array of follower addresses
   */
  static async getFollowers(address: string): Promise<string[]> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/follow/followers/${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch followers');
    }

    return response.json();
  }

  /**
   * Get users that a user is following
   * @param address - Address of the user
   * @returns Array of following addresses
   */
  static async getFollowing(address: string): Promise<string[]> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/follow/following/${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch following');
    }

    return response.json();
  }

  /**
   * Check if one user is following another
   * @param follower - Address of the follower
   * @param following - Address of the user being followed
   * @returns True if following, false otherwise
   */
  static async isFollowing(follower: string, following: string): Promise<boolean> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/follow/is-following/${follower}/${following}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check follow status');
    }

    return response.json();
  }

  /**
   * Get follow count for a user
   * @param address - Address of the user
   * @returns Object with followers and following counts
   */
  static async getFollowCount(address: string): Promise<{ followers: number, following: number }> {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/follow/count/${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch follow count');
    }

    return response.json();
  }
}