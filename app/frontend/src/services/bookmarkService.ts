/**
 * Bookmark Service
 * Frontend client for bookmark API
 */

import { ENV_CONFIG } from '@/config/environment';

export interface BookmarkedPost {
  postId: string;
  bookmarkedAt: string;
  post: {
    id: string;
    contentCid: string;
    authorAddress: string;
    title?: string;
    content?: string;
    media?: string[];
    createdAt: string;
    updatedAt?: string;
    communityId?: string;
    upvotes?: number;
    downvotes?: number;
    commentsCount?: number;
    views?: number;
  };
}

export interface BookmarkPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetBookmarksResponse {
  bookmarks: BookmarkedPost[];
  pagination: BookmarkPagination;
}

class BookmarkService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = ENV_CONFIG.BACKEND_URL;
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Get auth token from various storage locations
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') ||
                   localStorage.getItem('authToken') ||
                   localStorage.getItem('auth_token');

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Also try to get from linkdao_session_data
      if (!token) {
        try {
          const sessionDataStr = localStorage.getItem('linkdao_session_data');
          if (sessionDataStr) {
            const sessionData = JSON.parse(sessionDataStr);
            const sessionToken = sessionData.token || sessionData.accessToken;
            if (sessionToken) {
              headers['Authorization'] = `Bearer ${sessionToken}`;
            }
          }
        } catch (error) {
          // Don't clear session data - let auth service handle session management
          console.warn('Failed to parse session data for bookmark auth');
        }
      }
    }

    return headers;
  }

  /**
   * Toggle bookmark status for a post
   */
  async toggleBookmark(postId: string): Promise<{ bookmarked: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bookmarks/toggle`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ postId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to toggle bookmark: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      throw error;
    }
  }

  /**
   * Check if a post is bookmarked by the current user
   */
  async isBookmarked(postId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bookmarks/check/${postId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          return false; // Not authenticated
        }
        throw new Error(`Failed to check bookmark: ${response.status}`);
      }

      const data = await response.json();
      return data.bookmarked || false;
    } catch (error) {
      console.error('Error checking bookmark:', error);
      return false;
    }
  }

  /**
   * Get all bookmarks for the current user
   */
  async getUserBookmarks(page: number = 1, limit: number = 20): Promise<GetBookmarksResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/bookmarks?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get bookmarks: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      throw error;
    }
  }

  /**
   * Get bookmark count for a specific post
   */
  async getBookmarkCount(postId: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bookmarks/${postId}/count`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Error getting bookmark count:', error);
      return 0;
    }
  }
}

export const bookmarkService = new BookmarkService();
