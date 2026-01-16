/**
 * Admin Service
 * Handles admin operations for mobile app including user management, moderation, and analytics
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalCommunities: number;
  pendingReports: number;
  pendingSellerApplications: number;
  todaySignups: number;
  todayPosts: number;
}

export interface User {
  id: string;
  walletAddress: string;
  displayName?: string;
  handle?: string;
  email?: string;
  role: 'user' | 'moderator' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  createdAt: Date;
  lastActiveAt?: Date;
  reputation?: number;
  isVerified?: boolean;
}

export interface ModerationItem {
  id: string;
  type: 'post' | 'comment' | 'user' | 'community';
  itemId: string;
  reportedBy: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}

export interface SellerApplication {
  id: string;
  userId: string;
  storeName: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  apiResponseTime: number;
  websocketStatus: 'connected' | 'disconnected';
  databaseStatus: 'connected' | 'disconnected';
  lastCheck: Date;
}

class AdminService {
  private baseUrl = `${ENV.BACKEND_URL}/api/admin`;

  /**
   * Get admin dashboard statistics
   */
  async getAdminStats(): Promise<AdminStats | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/stats`);
      const data = response.data.data || response.data;
      return {
        totalUsers: data.totalUsers || 0,
        activeUsers: data.activeUsers || 0,
        totalPosts: data.totalPosts || 0,
        totalCommunities: data.totalCommunities || 0,
        pendingReports: data.pendingReports || 0,
        pendingSellerApplications: data.pendingSellerApplications || 0,
        todaySignups: data.todaySignups || 0,
        todayPosts: data.todayPosts || 0,
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return this.getMockStats();
    }
  }

  /**
   * Get list of users with pagination and filters
   */
  async getUsers(page: number = 1, limit: number = 20, filters?: {
    status?: string;
    role?: string;
    search?: string;
  }): Promise<{ users: User[]; total: number }> {
    try {
      const params: any = { page, limit };
      if (filters?.status) params.status = filters.status;
      if (filters?.role) params.role = filters.role;
      if (filters?.search) params.search = filters.search;

      const response = await apiClient.get(`${this.baseUrl}/users`, { params });
      const data = response.data.data || response.data;
      return {
        users: this.transformUsers(data.users || []),
        total: data.total || 0,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * Get user details
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/users/${userId}`);
      const data = response.data.data || response.data;
      return this.transformUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Update user status (suspend/ban)
   */
  async updateUserStatus(
    userId: string,
    status: 'active' | 'suspended' | 'banned',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/users/${userId}/status`, {
        status,
        reason,
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to update user status',
      };
    }
  }

  /**
   * Get moderation queue
   */
  async getModerationQueue(status?: string): Promise<ModerationItem[]> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get(`${this.baseUrl}/moderation`, { params });
      const data = response.data.data || response.data;
      return this.transformModerationItems(data.items || data || []);
    } catch (error) {
      console.error('Error fetching moderation queue:', error);
      return [];
    }
  }

  /**
   * Review moderation item
   */
  async reviewModerationItem(
    itemId: string,
    action: 'approve' | 'reject' | 'dismiss',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/moderation/${itemId}/review`, {
        action,
        notes,
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error reviewing moderation item:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to review item',
      };
    }
  }

  /**
   * Get seller applications
   */
  async getSellerApplications(status?: string): Promise<SellerApplication[]> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get(`${this.baseUrl}/seller-applications`, { params });
      const data = response.data.data || response.data;
      return this.transformSellerApplications(data.applications || data || []);
    } catch (error) {
      console.error('Error fetching seller applications:', error);
      return [];
    }
  }

  /**
   * Review seller application
   */
  async reviewSellerApplication(
    applicationId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/seller-applications/${applicationId}/review`, {
        action,
        rejectionReason,
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error reviewing seller application:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to review application',
      };
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/system-health`);
      const data = response.data.data || response.data;
      return {
        status: data.status || 'healthy',
        uptime: data.uptime || 0,
        apiResponseTime: data.apiResponseTime || 0,
        websocketStatus: data.websocketStatus || 'connected',
        databaseStatus: data.databaseStatus || 'connected',
        lastCheck: new Date(data.lastCheck || Date.now()),
      };
    } catch (error) {
      console.error('Error fetching system health:', error);
      return null;
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<{
    users: { date: string; count: number }[];
    posts: { date: string; count: number }[];
    engagement: { date: string; value: number }[];
  } | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/analytics`, { params: { timeframe } });
      const data = response.data.data || response.data;
      return {
        users: data.users || [],
        posts: data.posts || [],
        engagement: data.engagement || [],
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  // Helper methods to transform API responses
  private transformUsers(data: any[]): User[] {
    return data.map((item) => this.transformUser(item)).filter(Boolean) as User[];
  }

  private transformUser(data: any): User {
    return {
      id: data.id || data.userId || '',
      walletAddress: data.walletAddress || data.address || '',
      displayName: data.displayName || data.name,
      handle: data.handle,
      email: data.email,
      role: data.role || 'user',
      status: data.status || 'active',
      createdAt: new Date(data.createdAt || Date.now()),
      lastActiveAt: data.lastActiveAt ? new Date(data.lastActiveAt) : undefined,
      reputation: data.reputation,
      isVerified: data.isVerified || false,
    };
  }

  private transformModerationItems(data: any[]): ModerationItem[] {
    return data.map((item) => ({
      id: item.id || '',
      type: item.type || 'post',
      itemId: item.itemId || '',
      reportedBy: item.reportedBy || '',
      reason: item.reason || '',
      status: item.status || 'pending',
      createdAt: new Date(item.createdAt || Date.now()),
      reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : undefined,
      reviewedBy: item.reviewedBy,
      notes: item.notes,
    }));
  }

  private transformSellerApplications(data: any[]): SellerApplication[] {
    return data.map((item) => ({
      id: item.id || '',
      userId: item.userId || '',
      storeName: item.storeName || '',
      description: item.description || '',
      status: item.status || 'pending',
      submittedAt: new Date(item.submittedAt || Date.now()),
      reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : undefined,
      reviewedBy: item.reviewedBy,
      rejectionReason: item.rejectionReason,
    }));
  }

  // Mock data for development
  private getMockStats(): AdminStats {
    return {
      totalUsers: 12453,
      activeUsers: 3241,
      totalPosts: 45678,
      totalCommunities: 234,
      pendingReports: 12,
      pendingSellerApplications: 5,
      todaySignups: 47,
      todayPosts: 156,
    };
  }
}

export const adminService = new AdminService();