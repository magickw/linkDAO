import { API_BASE_URL } from '../config/api';

export interface UserProfile {
  id: string;
  walletAddress: string;
  handle: string;
  ens?: string;
  avatarCid?: string;
  bioCid?: string;
  followers: number;
  following: number;
  reputationScore: number;
  postCount: number;
  totalTipsReceived: number;
  totalReactionsReceived: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuggestedUser {
  id: string;
  handle: string;
  ens?: string;
  avatarCid?: string;
  followers: number;
  reputationScore: number;
  mutualConnections: number;
  reasonForSuggestion: string;
}

export interface UserSearchResult {
  id: string;
  handle: string;
  ens?: string;
  avatarCid?: string;
  followers: number;
  reputationScore: number;
  matchScore: number;
}

export interface UserRecommendationFilters {
  minReputationScore?: number;
  maxResults?: number;
  excludeFollowed?: boolean;
  communityId?: string;
}

export interface UserSearchFilters {
  query: string;
  minFollowers?: number;
  minReputationScore?: number;
  maxResults?: number;
  sortBy?: 'relevance' | 'followers' | 'reputation' | 'recent';
}

class EnhancedUserService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/users`;
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/profile/${userId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Get user profile by wallet address
   */
  async getUserProfileByAddress(address: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/profile/address/${address}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error fetching user profile by address:', error);
      return null;
    }
  }

  /**
   * Get user profile by handle
   */
  async getUserProfileByHandle(handle: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/profile/handle/${handle}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error fetching user profile by handle:', error);
      return null;
    }
  }

  /**
   * Get suggested users for a user
   */
  async getSuggestedUsers(
    userId: string,
    filters: UserRecommendationFilters = {}
  ): Promise<SuggestedUser[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.minReputationScore !== undefined) {
        params.append('minReputationScore', filters.minReputationScore.toString());
      }
      if (filters.maxResults !== undefined) {
        params.append('maxResults', filters.maxResults.toString());
      }
      if (filters.excludeFollowed !== undefined) {
        params.append('excludeFollowed', filters.excludeFollowed.toString());
      }
      if (filters.communityId) {
        params.append('communityId', filters.communityId);
      }

      const url = `${this.baseUrl}/suggestions/${userId}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json().catch(() => null);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.users)) return data.users;
      return [];
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      return [];
    }
  }

  /**
   * Search users
   */
  async searchUsers(filters: UserSearchFilters): Promise<UserSearchResult[]> {
    try {
      const params = new URLSearchParams();
      params.append('query', filters.query);
      
      if (filters.minFollowers !== undefined) {
        params.append('minFollowers', filters.minFollowers.toString());
      }
      if (filters.minReputationScore !== undefined) {
        params.append('minReputationScore', filters.minReputationScore.toString());
      }
      if (filters.maxResults !== undefined) {
        params.append('maxResults', filters.maxResults.toString());
      }
      if (filters.sortBy) {
        params.append('sortBy', filters.sortBy);
      }

      const response = await fetch(`${this.baseUrl}/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json().catch(() => null);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.users)) return data.users;
      return [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Follow a user
   */
  async followUser(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/follow/${userId}/${targetUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/follow/${userId}/${targetUserId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, limit?: number): Promise<UserProfile[]> {
    try {
      const params = limit ? `?limit=${limit}` : '';
      const response = await fetch(`${this.baseUrl}/followers/${userId}${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching followers:', error);
      return [];
    }
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, limit?: number): Promise<UserProfile[]> {
    try {
      const params = limit ? `?limit=${limit}` : '';
      const response = await fetch(`${this.baseUrl}/following/${userId}${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching following:', error);
      return [];
    }
  }

  /**
   * Check if user A is following user B
   */
  async isFollowing(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/follow-status/${userId}/${targetUserId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data.isFollowing : false;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Get trending users
   */
  async getTrendingUsers(limit?: number): Promise<UserProfile[]> {
    try {
      const params = limit ? `?limit=${limit}` : '';
      const response = await fetch(`${this.baseUrl}/trending${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json().catch(() => null);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.users)) return data.users;
      return [];
    } catch (error) {
      console.error('Error fetching trending users:', error);
      return [];
    }
  }

  /**
   * Format user display name (handle or shortened address)
   */
  formatUserDisplayName(user: UserProfile | SuggestedUser | UserSearchResult): string {
    if (user.handle) {
      return user.handle;
    }
    
    if ('walletAddress' in user) {
      return `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`;
    }
    
    return 'Unknown User';
  }

  /**
   * Get user avatar URL (IPFS, CDN, or placeholder)
   */
  getUserAvatarUrl(user: UserProfile | SuggestedUser | UserSearchResult, size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium'): string {
    // If user has an avatar CID, construct IPFS URL
    if (user.avatarCid) {
      return `https://ipfs.io/ipfs/${user.avatarCid}`;
    }
    
    // Return a deterministic placeholder avatar based on user data
    const identifier = user.id || user.handle || 'default';
    return this.generateDefaultAvatar(identifier, size);
  }

  /**
   * Generate default avatar URL
   */
  private generateDefaultAvatar(identifier: string, size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium'): string {
    const sizeMap = {
      small: 40,
      medium: 80,
      large: 160,
      xlarge: 320,
    };

    const pixelSize = sizeMap[size];
    
    // Use different avatar styles based on identifier hash
    const avatarStyles = ['identicon', 'bottts', 'avataaars', 'personas'];
    const hash = this.simpleHash(identifier);
    const styleIndex = hash % avatarStyles.length;
    const style = avatarStyles[styleIndex];

    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(identifier)}&size=${pixelSize}`;
  }

  /**
   * Simple hash function for consistent avatar generation
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Format reputation score for display
   */
  formatReputationScore(score: number): string {
    if (score >= 1000000) {
      return `${(score / 1000000).toFixed(1)}M`;
    }
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`;
    }
    return score.toString();
  }

  /**
   * Format follower count for display
   */
  formatFollowerCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }
}

// Create and export a singleton instance
export const enhancedUserService = new EnhancedUserService();
export default enhancedUserService;