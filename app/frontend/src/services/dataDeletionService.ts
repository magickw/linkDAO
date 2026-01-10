/**
 * Data Deletion Service
 * Frontend service for communicating with data deletion API
 */

import { API_BASE_URL } from '../config/api';

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
  private baseUrl = `${API_BASE_URL}/data-deletion`;

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Get summary of user's stored data
   */
  async getUserDataSummary(): Promise<UserDataSummary> {
    try {
      const response = await fetch(`${this.baseUrl}/summary`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch user data summary');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error: any) {
      console.error('Error fetching user data summary:', error);
      throw new Error(error.message || 'Failed to fetch user data summary');
    }
  }

  /**
   * Get data deletion policy
   */
  async getPolicy(): Promise<DeletionPolicy> {
    try {
      const response = await fetch(`${this.baseUrl}/policy`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch deletion policy');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error: any) {
      console.error('Error fetching deletion policy:', error);
      throw new Error(error.message || 'Failed to fetch deletion policy');
    }
  }

  /**
   * Delete specific categories of user data
   */
  async deleteData(categories: DataCategories): Promise<DeletionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/delete`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ categories }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete user data');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error: any) {
      console.error('Error deleting user data:', error);
      throw new Error(error.message || 'Failed to delete user data');
    }
  }

  /**
   * Delete all user data
   */
  async deleteAllData(): Promise<DeletionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/delete-all`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ confirmDelete: 'DELETE_ALL_MY_DATA' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete all user data');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error: any) {
      console.error('Error deleting all user data:', error);
      throw new Error(error.message || 'Failed to delete all user data');
    }
  }

  /**
   * Check deletion status by confirmation code
   */
  async getDeletionStatus(confirmationCode: string): Promise<DeletionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${confirmationCode}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to check deletion status');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error: any) {
      console.error('Error checking deletion status:', error);
      throw new Error(error.message || 'Failed to check deletion status');
    }
  }
}

export const dataDeletionService = new DataDeletionService();
