import { 
  CommunityPost, 
  CreateCommunityPostInput, 
  UpdateCommunityPostInput,
  Comment,
  CreateCommentInput,
  UpdateCommentInput,
  VoteInput,
  CommunityPostStats
} from '../models/CommunityPost';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

/**
 * Community Post API Service
 * Provides functions to interact with the backend community post API endpoints
 */
export class CommunityPostService {
  /**
   * Create a new community post
   * @param data - Post data to create
   * @returns The created post
   */
  static async createCommunityPost(data: CreateCommunityPostInput): Promise<CommunityPost> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${data.communityId}/posts`, {
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
        throw new Error(error.error || 'Failed to create community post');
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
   * Get a community post by its ID
   * @param postId - Post ID
   * @returns The post or null if not found
   */
  static async getCommunityPostById(postId: string): Promise<CommunityPost | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/community-posts/${postId}`, {
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
        throw new Error(error.error || 'Failed to fetch community post');
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
   * Get posts for a community
   * @param communityId - Community ID
   * @param params - Optional query parameters
   * @returns Array of community posts
   */
  static async getCommunityPosts(
    communityId: string,
    params?: {
      sortBy?: 'hot' | 'new' | 'top' | 'rising';
      timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
      flair?: string;
      author?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<CommunityPost[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      let url = `${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts`;
      const searchParams = new URLSearchParams();
      
      if (params) {
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.timeframe) searchParams.append('timeframe', params.timeframe);
        if (params.flair) searchParams.append('flair', params.flair);
        if (params.author) searchParams.append('author', params.author);
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
        throw new Error(error.error || 'Failed to fetch community posts');
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
   * Update a community post
   * @param postId - Post ID
   * @param data - Updated post data
   * @returns The updated post
   */
  static async updateCommunityPost(postId: string, data: UpdateCommunityPostInput): Promise<CommunityPost> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/community-posts/${postId}`, {
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
        throw new Error(error.error || 'Failed to update community post');
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
   * Delete a community post
   * @param postId - Post ID
   * @returns True if deleted, false if not found
   */
  static async deleteCommunityPost(postId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/community-posts/${postId}`, {
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
        throw new Error(error.error || 'Failed to delete community post');
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
   * Vote on a community post
   * @param data - Vote data
   * @returns The updated post
   */
  static async voteOnPost(data: VoteInput): Promise<CommunityPost> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/community-posts/${data.postId}/vote`, {
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
        throw new Error(error.error || 'Failed to vote on post');
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
   * Create a comment on a post
   * @param data - Comment data to create
   * @returns The created comment
   */
  static async createComment(data: CreateCommentInput): Promise<Comment> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/community-posts/${data.postId}/comments`, {
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
        throw new Error(error.error || 'Failed to create comment');
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
   * Get comments for a post
   * @param postId - Post ID
   * @param params - Optional query parameters
   * @returns Array of comments
   */
  static async getPostComments(
    postId: string,
    params?: {
      sortBy?: 'best' | 'top' | 'new' | 'controversial';
      limit?: number;
      offset?: number;
    }
  ): Promise<Comment[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      let url = `${BACKEND_API_BASE_URL}/api/community-posts/${postId}/comments`;
      const searchParams = new URLSearchParams();
      
      if (params) {
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
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
        throw new Error(error.error || 'Failed to fetch comments');
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
   * Update a comment
   * @param commentId - Comment ID
   * @param data - Updated comment data
   * @returns The updated comment
   */
  static async updateComment(commentId: string, data: UpdateCommentInput): Promise<Comment> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/comments/${commentId}`, {
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
        throw new Error(error.error || 'Failed to update comment');
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
   * Delete a comment
   * @param commentId - Comment ID
   * @returns True if deleted, false if not found
   */
  static async deleteComment(commentId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/comments/${commentId}`, {
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
        throw new Error(error.error || 'Failed to delete comment');
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
   * Pin a community post
   * @param postId - Post ID to pin
   * @param sortOrder - Optional sort order for the pinned post
   * @returns The updated post
   */
  static async pinPost(postId: string, sortOrder?: number): Promise<CommunityPost> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/community-posts/${postId}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sortOrder }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to pin post');
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
   * Unpin a community post
   * @param postId - Post ID to unpin
   * @returns The updated post
   */
  static async unpinPost(postId: string): Promise<CommunityPost> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/community-posts/${postId}/unpin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unpin post');
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
   * Reorder pinned posts
   * @param communityId - Community ID
   * @param postIds - Array of post IDs in desired order
   * @returns Success status
   */
  static async reorderPinnedPosts(communityId: string, postIds: string[]): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/reorder-pinned`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postIds }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder pinned posts');
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
   * Get pinned posts for a community
   * @param communityId - Community ID
   * @returns Array of pinned posts
   */
  static async getPinnedPosts(communityId: string): Promise<CommunityPost[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/pinned`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch pinned posts');
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
   * Get community post statistics
   * @param communityId - Community ID
   * @returns Post statistics
   */
  static async getCommunityPostStats(communityId: string): Promise<CommunityPostStats> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch post stats');
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
}