/**
 * Profile Service
 * API service for user profile operations
 */

import { apiClient } from '@linkdao/shared';

export interface SocialLink {
  platform: string;
  url: string;
  username: string;
}

export interface UserProfile {
  id: string;
  handle: string;
  displayName: string;
  ens: string;
  bio: string;
  avatar: string;
  banner: string;
  website: string;
  socialLinks: SocialLink[];
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserProfileInput {
  handle: string;
  displayName?: string;
  ens?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  website?: string;
  socialLinks?: SocialLink[];
}

export interface UpdateUserProfileInput {
  handle?: string;
  displayName?: string;
  ens?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  website?: string;
  socialLinks?: SocialLink[];
}

class ProfileService {
  /**
   * Get user profile by ID
   */
  async getProfile(id: string): Promise<UserProfile | null> {
    try {
      const response = await apiClient.get<any>(`/api/profiles/${id}`);
      
      if (response.success && response.data) {
        return response.data.data || response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }

  /**
   * Get user profile by wallet address
   */
  async getProfileByAddress(address: string): Promise<UserProfile | null> {
    try {
      const response = await apiClient.get<any>(`/api/profiles/address/${address}`);
      
      if (response.success && response.data) {
        return response.data.data || response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile by address:', error);
      return null;
    }
  }

  /**
   * Create a new user profile
   */
  async createProfile(data: CreateUserProfileInput): Promise<UserProfile> {
    const response = await apiClient.post<any>('/api/profiles', data);
    
    if (response.success && response.data) {
      return response.data.data || response.data;
    }
    throw new Error('Failed to create profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, data: UpdateUserProfileInput): Promise<UserProfile> {
    const response = await apiClient.put<any>(`/api/profiles/${id}`, data);
    
    if (response.success && response.data) {
      return response.data.data || response.data;
    }
    throw new Error('Failed to update profile');
  }

  /**
   * Update profile by wallet address
   */
  async updateProfileByAddress(address: string, data: UpdateUserProfileInput): Promise<UserProfile> {
    const response = await apiClient.put<any>(`/api/profiles/address/${address}`, data);
    
    if (response.success && response.data) {
      return response.data.data || response.data;
    }
    throw new Error('Failed to update profile');
  }

  /**
   * Delete user profile
   */
  async deleteProfile(id: string): Promise<boolean> {
    const response = await apiClient.delete<any>(`/api/profiles/${id}`);
    return response.success || false;
  }

  /**
   * Search profiles
   */
  async searchProfiles(query: string): Promise<UserProfile[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const response = await apiClient.get<any>(`/api/profiles/search?q=${encodeURIComponent(query)}`);
      
      if (response.success && response.data) {
        return response.data.data || response.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error searching profiles:', error);
      return [];
    }
  }

  /**
   * Get all profiles (with pagination)
   */
  async getAllProfiles(page: number = 1, limit: number = 50): Promise<UserProfile[]> {
    try {
      const response = await apiClient.get<any>(`/api/profiles?page=${page}&limit=${limit}`);
      
      if (response.success && response.data) {
        return response.data.data?.profiles || response.data.data || response.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching all profiles:', error);
      return [];
    }
  }
}

export const profileService = new ProfileService();