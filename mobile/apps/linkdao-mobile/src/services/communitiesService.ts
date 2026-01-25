/**
 * Communities Service
 * API service for community operations
 */

import { apiClient } from './apiClient';
import { Community } from '../store';

export interface CreateCommunityData {
  name: string;
  handle: string;
  description?: string;
  avatar?: string;
  banner?: string;
  isPublic: boolean;
}

export interface JoinCommunityResponse {
  success: boolean;
  message?: string;
}

class CommunitiesService {
  /**
   * Get all communities
   */
  async getCommunities(page: number = 1, limit: number = 20): Promise<Community[]> {
    try {
      const response = await apiClient.get<any>(
        `/api/communities?page=${page}&limit=${limit}`
      );
      // Backend returns { success: true, data: { communities: [], pagination: {} } }
      // Shared apiClient already extracts 'data'
      const data = response.data;
      if (data && Array.isArray(data.communities)) {
        return data.communities;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching communities:', error);
      return [];
    }
  }

  /**
   * Get featured (trending) communities
   */
  async getFeaturedCommunities(): Promise<Community[]> {
    try {
      // Backend uses /trending, mapped to getTrendingCommunities
      const response = await apiClient.get<any>('/api/communities/trending');
      const data = response.data;
      if (data && Array.isArray(data.communities)) {
        return data.communities;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching featured communities:', error);
      return [];
    }
  }

  /**
   * Get my communities
   */
  async getMyCommunities(): Promise<Community[]> {
    try {
      // Backend uses /my-communities
      const response = await apiClient.get<any>('/api/communities/my-communities');
      const data = response.data;
      if (data && Array.isArray(data.communities)) {
        return data.communities;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching my communities:', error);
      return [];
    }
  }

  /**
   * Get community by ID
   */
  async getCommunity(id: string): Promise<Community | null> {
    try {
      const response = await apiClient.get<Community>(`/api/communities/${id}`);
      return response.data || null;
    } catch (error) {
      console.error('Error fetching community:', error);
      return null;
    }
  }

  /**
   * Create new community
   */
  async createCommunity(data: CreateCommunityData): Promise<Community | null> {
    try {
      const response = await apiClient.post<Community>('/api/communities', data);
      return response.data || null;
    } catch (error) {
      console.error('Error creating community:', error);
      return null;
    }
  }

  /**
   * Update community
   */
  async updateCommunity(id: string, data: Partial<CreateCommunityData>): Promise<Community | null> {
    try {
      const response = await apiClient.put<Community>(`/api/communities/${id}`, data);
      return response.data || null;
    } catch (error) {
      console.error('Error updating community:', error);
      return null;
    }
  }

  /**
   * Join community
   */
  async joinCommunity(id: string): Promise<JoinCommunityResponse> {
    try {
      const response = await apiClient.post<any>(`/api/communities/${id}/join`);
      return {
        success: true,
        message: response.data?.message || 'Joined successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to join community',
      };
    }
  }

  /**
   * Leave community
   */
  async leaveCommunity(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/api/communities/${id}/leave`);
      return true;
    } catch (error) {
      console.error('Error leaving community:', error);
      return false;
    }
  }

  /**
   * Search communities
   */
  async searchCommunities(query: string): Promise<Community[]> {
    try {
      // Backend: GET /api/communities/search/query?q=...
      const response = await apiClient.get<any>(
        `/api/communities/search/query?q=${encodeURIComponent(query)}`
      );
      const data = response.data;
      // Search result format from backend: { success: true, data: [...] }
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.communities)) {
        return data.communities;
      }
      return [];
    } catch (error) {
      console.error('Error searching communities:', error);
      return [];
    }
  }

  /**
   * Get community members
   */
  async getCommunityMembers(id: string, page: number = 1, limit: number = 20): Promise<any[]> {
    try {
      const response = await apiClient.get<{ data: any[] }>(
        `/api/communities/${id}/members?page=${page}&limit=${limit}`
      );
      return response.data.data || (response.data as any) || [];
    } catch (error) {
      console.error('Error fetching community members:', error);
      return [];
    }
  }
}

export const communitiesService = new CommunitiesService();