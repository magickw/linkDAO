import { 
  CommunityMembership, 
  CreateCommunityMembershipInput, 
  UpdateCommunityMembershipInput,
  CommunityMembershipStats 
} from '../models/CommunityMembership';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

/**
 * Community Membership API Service
 * Provides functions to interact with the backend community membership API endpoints
 */
export class CommunityMembershipService {
  /**
   * Join a community (create membership)
   * @param data - Membership data to create
   * @returns The created membership
   */
  static async joinCommunity(data: CreateCommunityMembershipInput): Promise<CommunityMembership> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${data.communityId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join community');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Leave a community (delete membership)
   * @param communityId - Community ID
   * @param userId - User ID
   * @returns True if left successfully
   */
  static async leaveCommunity(communityId: string, userId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave community');
      }
      
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get user's membership in a community
   * @param communityId - Community ID
   * @param userId - User ID
   * @returns The membership or null if not found
   */
  static async getMembership(communityId: string, userId: string): Promise<CommunityMembership | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/members/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch membership');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get all members of a community
   * @param communityId - Community ID
   * @param params - Optional query parameters
   * @returns Array of memberships
   */
  static async getCommunityMembers(
    communityId: string, 
    params?: {
      role?: string;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<CommunityMembership[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      let url = `${BACKEND_API_BASE_URL}/api/communities/${communityId}/members`;
      const searchParams = new URLSearchParams();
      
      if (params) {
        if (params.role) searchParams.append('role', params.role);
        if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
      }
      
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch community members');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get all communities a user is a member of
   * @param userId - User ID
   * @param params - Optional query parameters
   * @returns Array of memberships
   */
  static async getUserMemberships(
    userId: string,
    params?: {
      role?: string;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<CommunityMembership[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      let url = `${BACKEND_API_BASE_URL}/api/users/${userId}/memberships`;
      const searchParams = new URLSearchParams();
      
      if (params) {
        if (params.role) searchParams.append('role', params.role);
        if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
      }
      
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user memberships');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Update a membership (change role, reputation, etc.)
   * @param communityId - Community ID
   * @param userId - User ID
   * @param data - Updated membership data
   * @returns The updated membership
   */
  static async updateMembership(
    communityId: string, 
    userId: string, 
    data: UpdateCommunityMembershipInput
  ): Promise<CommunityMembership> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update membership');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get community membership statistics
   * @param communityId - Community ID
   * @returns Membership statistics
   */
  static async getCommunityMembershipStats(communityId: string): Promise<CommunityMembershipStats> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/members/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch membership stats');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Check if user is a member of a community
   * @param communityId - Community ID
   * @param userId - User ID
   * @returns True if user is a member
   */
  static async isMember(communityId: string, userId: string): Promise<boolean> {
    try {
      const membership = await this.getMembership(communityId, userId);
      return membership !== null && membership.isActive;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user has moderator or admin role in a community
   * @param communityId - Community ID
   * @param userId - User ID
   * @returns True if user is a moderator or admin
   */
  static async isModerator(communityId: string, userId: string): Promise<boolean> {
    try {
      const membership = await this.getMembership(communityId, userId);
      return membership !== null && 
             membership.isActive && 
             ['moderator', 'admin', 'owner'].includes(membership.role);
    } catch (error) {
      return false;
    }
  }
}