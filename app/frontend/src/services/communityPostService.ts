import { 
  CommunityPost, 
  CreateCommunityPostInput, 
  UpdateCommunityPostInput,
  VoteInput,
  CreateCommentInput,
  Comment
} from '../models/CommunityPost';
import { CommunityOfflineCacheService } from './communityOfflineCacheService';
import { fetchWithRetry, RetryOptions } from './retryUtils';
import { communityPerformanceService } from './communityPerformanceService';
import { authService } from './authService';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

// Default retry options for community post API calls
const COMMUNITY_POST_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error: any) => {
    // Retry on network errors, 5xx errors, and 429 (rate limited)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 503;
    }
    
    return false;
  }
};

/**
 * Community Post API Service
 * Provides functions to interact with the backend community post API endpoints
 */
export class CommunityPostService {
  private static offlineCacheService = CommunityOfflineCacheService.getInstance();
  
  /**
   * Calculate engagement score for a post based on interactions
   */
  private static calculateEngagementScore(post: CommunityPost): number {
    // Simple engagement score calculation based on views, comments, and votes
    const viewScore = (post.viewCount || 0) * 0.1;
    const commentScore = (post.comments?.length || 0) * 2;
    const voteScore = (post.upvotes || 0) * 1.5 - (post.downvotes || 0) * 0.5;
    
    // Combine scores with diminishing returns
    const totalScore = viewScore + commentScore + voteScore;
    
    // Apply trending factor based on recency
    const hoursSinceCreation = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
    const trendingFactor = Math.max(0.1, 1 - (hoursSinceCreation / 168)); // 168 hours = 1 week
    
    return Math.round(totalScore * trendingFactor);
  }

  /**
   * Create a new community post with offline support
   * @param data - Post data to create
   * @returns The created post
   */
  static async createCommunityPost(data: CreateCommunityPostInput): Promise<CommunityPost> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Get authentication headers
      const authHeaders = authService.getAuthHeaders();
      
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities/${data.communityId}/posts`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(data),
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create community post');
      }
      
      const post = await response.json();
      
      // Track post creation event for performance metrics
      if (post) {
        communityPerformanceService.trackEvent({
          eventType: 'post_created',
          communityId: data.communityId,
          userId: data.author,
          timestamp: new Date(),
          metadata: {
            postId: post.id,
            postType: post.type
          }
        });
      }
      
      return post;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If offline, queue the action
      if (!this.offlineCacheService.isOnlineStatus()) {
        await this.offlineCacheService.queueOfflineAction({
          type: 'create_post',
          data: { communityId: data.communityId, postData: data },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
        throw new Error('Post creation queued for when online');
      }
      
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
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/community-posts/${postId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch community post');
      }
      
      const post = await response.json();
      
      // Track post view for performance metrics
      if (post) {
        // Increment view count
        post.viewCount = (post.viewCount || 0) + 1;
        post.lastViewedAt = new Date();
        
        // Update engagement score based on views
        post.engagementScore = this.calculateEngagementScore(post);
        
        // Track view event
        communityPerformanceService.trackEvent({
          eventType: 'view_recorded',
          communityId: post.communityId,
          userId: 'anonymous', // This would be the actual user ID in a real implementation
          timestamp: new Date(),
          metadata: {
            postId: post.id,
            viewCount: post.viewCount
          }
        });
      }
      
      return post;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get posts for a community with offline support
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
      let url = `${BACKEND_API_BASE_URL}/communities/${communityId}/posts`;
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
      
      const response = await fetchWithRetry(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch community posts');
      }
      
      const posts = await response.json();
      
      return posts;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If offline, try to get from cache
      if (!this.offlineCacheService.isOnlineStatus()) {
        const cached = await this.offlineCacheService.getCachedCommunityPosts(communityId);
        if (cached) {
          console.warn('Offline mode, returning cached community posts');
          // Convert CachedCommunityPost[] to CommunityPost[]
          return cached.map(post => ({
            // Properties from EnhancedPost
            id: post.id,
            author: post.author,
            parentId: post.parentId,
            title: post.title,
            contentCid: post.contentCid,
            mediaCids: post.mediaCids,
            tags: post.tags,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            onchainRef: post.onchainRef,
            stakedValue: post.stakedValue,
            reputationScore: post.reputationScore,
            dao: post.dao,
            reactions: post.reactions,
            tips: post.tips,
            comments: Array.isArray(post.comments) ? post.comments : [],
            shares: post.shares,
            views: post.views,
            engagementScore: post.engagementScore || 0,
            previews: post.previews,
            socialProof: post.socialProof,
            trendingStatus: post.trendingStatus,
            trendingScore: post.trendingScore,
            isBookmarked: post.isBookmarked,
            communityId: post.communityId || communityId,
            contentType: post.contentType,
            
            // Properties specific to CommunityPost
            isPinned: false,
            isLocked: false,
            upvotes: 0,
            downvotes: 0,
            depth: 0,
            sortOrder: 0,
            
            // Performance tracking fields
            viewCount: post.views,
            lastViewedAt: post.updatedAt,
          }));
        }
      }
      
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
      // Get authentication headers
      const authHeaders = authService.getAuthHeaders();
      
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/community-posts/${postId}`,
        {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(data),
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update community post');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If offline, queue the action
      if (!this.offlineCacheService.isOnlineStatus()) {
        await this.offlineCacheService.queueOfflineAction({
          type: 'update_post',
          data: { postId, updateData: data },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
        throw new Error('Post update queued for when online');
      }
      
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
      // Get authentication headers
      const authHeaders = authService.getAuthHeaders();
      
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/community-posts/${postId}`,
        {
          method: 'DELETE',
          headers: authHeaders,
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
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
      
      // If offline, queue the action
      if (!this.offlineCacheService.isOnlineStatus()) {
        await this.offlineCacheService.queueOfflineAction({
          type: 'delete_post',
          data: { postId },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
        throw new Error('Post deletion queued for when online');
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Vote on a community post with offline support
   * @param data - Vote data
   * @returns The updated post
   */
  static async voteOnPost(data: VoteInput): Promise<CommunityPost> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Get authentication headers
      const authHeaders = authService.getAuthHeaders();
      
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/community-posts/${data.postId}/vote`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(data),
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to vote on post');
      }
      
      const post = await response.json();
      
      // Track vote event for performance metrics
      if (post) {
        // Update engagement score
        post.engagementScore = this.calculateEngagementScore(post);
        
        // Track reaction event
        communityPerformanceService.trackEvent({
          eventType: 'reaction_added',
          communityId: post.communityId,
          userId: data.userId,
          timestamp: new Date(),
          metadata: {
            postId: post.id,
            voteType: data.voteType,
            upvotes: post.upvotes,
            downvotes: post.downvotes
          }
        });
      }
      
      return post;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If offline, queue the action
      if (!this.offlineCacheService.isOnlineStatus()) {
        await this.offlineCacheService.queueOfflineAction({
          type: 'react_to_post',
          data: { postId: data.postId, voteData: data },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
        throw new Error('Post reaction queued for when online');
      }
      
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
      // Get authentication headers
      const authHeaders = authService.getAuthHeaders();
      
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/community-posts/${data.postId}/comments`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(data),
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create comment');
      }
      
      const comment = await response.json();
      
      // Track comment creation event for performance metrics
      if (comment) {
        communityPerformanceService.trackEvent({
          eventType: 'comment_added',
          communityId: data.communityId,
          userId: data.authorId,
          timestamp: new Date(),
          metadata: {
            postId: data.postId,
            commentId: comment.id
          }
        });
      }
      
      return comment;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If offline, queue the action
      if (!this.offlineCacheService.isOnlineStatus()) {
        await this.offlineCacheService.queueOfflineAction({
          type: 'create_comment',
          data: { postId: data.postId, commentData: data },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
        throw new Error('Comment creation queued for when online');
      }
      
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
      let url = `${BACKEND_API_BASE_URL}/community-posts/${postId}/comments`;
      const searchParams = new URLSearchParams();
      
      if (params) {
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
      }
      
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
      
      const response = await fetchWithRetry(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
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
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/comments/${commentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
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
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
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
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/community-posts/${postId}/pin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sortOrder }),
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
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
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/community-posts/${postId}/unpin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
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
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities/${communityId}/posts/reorder-pinned`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ postIds }),
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
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
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities/${communityId}/posts/pinned`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
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
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities/${communityId}/posts/stats`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
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

  /**
   * Get statistics for a specific post
   * @param postId - Post ID
   * @returns Post statistics including comment count
   */
  static async getPostStats(postId: string): Promise<{ commentCount: number; upvotes: number; downvotes: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/community-posts/${postId}/stats`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_POST_RETRY_OPTIONS
      );
      
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
      
      // Return fallback stats if API fails
      console.warn('Failed to fetch post stats, using fallback:', error);
      return { commentCount: 0, upvotes: 0, downvotes: 0 };
    }
  }
}




