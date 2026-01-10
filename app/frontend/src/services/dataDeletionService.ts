/**
 * Data Deletion Service
 * Frontend service for communicating with data deletion API
 */

import { apiClient } from './api';

export interface DataCategories {
  profile: boolean;
  posts: boolean;
  comments: boolean;
  messages: boolean;
  socialConnections: boolean;
  follows: boolean;
  bookmarks: boolean;
  notifications: boolean;
  preferences: boolean;
}

export interface UserDataSummary {
  profile: {
    exists: boolean;
    fields: string[];
  };
  posts: {
    count: number;
  };
  comments: {
    count: number;
  };
  messages: {
    conversationCount: number;
    messageCount: number;
  };
  socialConnections: {
    platforms: string[];
  };
  follows: {
    followingCount: number;
    followersCount: number;
  };
  bookmarks: {
    count: number;
  };
  notifications: {
    count: number;
  };
}

export interface DeletionResult {
  success: boolean;
  deletedCategories: string[];
  failedCategories: string[];
  confirmationCode: string;
  timestamp: string;
  message?: string;
}

export interface DeletionPolicy {
  title: string;
  lastUpdated: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  contactEmail: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
}

export interface DeletionStatus {
  found: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
}

class DataDeletionService {
  private baseUrl = '/api/data-deletion';

  /**
   * Get summary of user's stored data
   */
  async getUserDataSummary(): Promise<UserDataSummary> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/summary`);
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('Error fetching user data summary:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch user data summary');
    }
  }

  /**
   * Get data deletion policy
   */
  async getPolicy(): Promise<DeletionPolicy> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/policy`);
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('Error fetching deletion policy:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch deletion policy');
    }
  }

  /**
   * Delete specific categories of user data
   */
  async deleteData(categories: DataCategories): Promise<DeletionResult> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/delete`, { categories });
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('Error deleting user data:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete user data');
    }
  }

  /**
   * Delete all user data
   */
  async deleteAllData(): Promise<DeletionResult> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/delete-all`, {
        confirmDelete: 'DELETE_ALL_MY_DATA'
      });
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('Error deleting all user data:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete all user data');
    }
  }

  /**
   * Check deletion status by confirmation code
   */
  async getDeletionStatus(confirmationCode: string): Promise<DeletionStatus> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/status/${confirmationCode}`);
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('Error checking deletion status:', error);
      throw new Error(error.response?.data?.message || 'Failed to check deletion status');
    }
  }
}

export const dataDeletionService = new DataDeletionService();
