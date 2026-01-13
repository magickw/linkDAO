/**
 * Communities Service
 * API service for community operations
 */

import { apiClient } from '@linkdao/shared';
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
    const response = await apiClient.get<{ communities: Community[] }>(
      `/api/communities?page=${page}&limit=${limit}`
    );

    if (response.success && response.data) {
      return response.data.communities;
    }

    return [];
  }

  /**
   * Get featured communities
   */
  async getFeaturedCommunities(): Promise<Community[]> {
    const response = await apiClient.get<{ communities: Community[] }>('/api/communities/featured');

    if (response.success && response.data) {
      return response.data.communities;
    }

    return [];
  }

  /**
   * Get my communities
   */
  async getMyCommunities(): Promise<Community[]> {
    const response = await apiClient.get<{ communities: Community[] }>('/api/communities/my');

    if (response.success && response.data) {
      return response.data.communities;
    }

    return [];
  }

  /**
   * Get community by ID
   */
  async getCommunity(id: string): Promise<Community | null> {
    const response = await apiClient.get<Community>(`/api/communities/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Create new community
   */
  async createCommunity(data: CreateCommunityData): Promise<Community | null> {
    const response = await apiClient.post<Community>('/api/communities', data);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Update community
   */
  async updateCommunity(id: string, data: Partial<CreateCommunityData>): Promise<Community | null> {
    const response = await apiClient.put<Community>(`/api/communities/${id}`, data);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Join community
   */
  async joinCommunity(id: string): Promise<JoinCommunityResponse> {
    const response = await apiClient.post<{ message: string }>(`/api/communities/${id}/join`);

    if (response.success) {
      return {
        success: true,
        message: response.data?.message,
      };
    }

    return {
      success: false,
      message: response.error || 'Failed to join community',
    };
  }

  /**
   * Leave community
   */
  async leaveCommunity(id: string): Promise<boolean> {
    const response = await apiClient.post(`/api/communities/${id}/leave`);
    return response.success;
  }

  /**
   * Search communities
   */
  async searchCommunities(query: string): Promise<Community[]> {
    const response = await apiClient.get<{ communities: Community[] }>(
      `/api/communities/search?q=${encodeURIComponent(query)}`
    );

    if (response.success && response.data) {
      return response.data.communities;
    }

    return [];
  }
}

export const communitiesService = new CommunitiesService();