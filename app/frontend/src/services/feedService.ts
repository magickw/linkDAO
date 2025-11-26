import { EnhancedPost, FeedFilter, CommunityEngagementMetrics, LeaderboardEntry, LikedByData, FeedSortType, FeedError, FeedAnalyticsEvent } from '../types/feed';
import { requestManager } from './requestManager';
import { convertBackendPostToPost } from '../models/Post';
import { convertBackendQuickPostToQuickPost } from '../models/QuickPost';
import { analyticsService } from './analyticsService';
import { authService } from './authService'; // Add authService import
import { ENV_CONFIG } from '@/config/environment';

// Use centralized environment config to ensure consistent backend URL
const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

// In-memory cache for feed data
const feedCache = new Map<string, { data: any; timestamp: number; expiresAt: number }>();

export interface FeedResponse {
  posts: EnhancedPost[];
  hasMore: boolean;
  totalPages: number;
}

interface BackendFeedResponse {
  success: boolean;
  data: {
    posts: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message?: string;
  timestamp?: string;
}

// Cache configuration
const CACHE_CONFIG = {
  FEED: {
    TTL: 30000, // 30 seconds
    MAX_ENTRIES: 100
  },
  COMMUNITY_METRICS: {
    TTL: 60000, // 1 minute
    MAX_ENTRIES: 50
  },
  TRENDING: {
    TTL: 45000, // 45 seconds
    MAX_ENTRIES: 20
  }
};

// Analytics service integration
class FeedAnalytics {
  private events: FeedAnalyticsEvent[] = [];
  
  trackEvent(event: FeedAnalyticsEvent) {
    this.events.push(event);
    // In a real implementation, this would send to an analytics service
    console.log('Feed Analytics Event:', event);
  }
  
  getEvents(): FeedAnalyticsEvent[] {
    return this.events;
  }
  
  clearEvents() {
    this.events = [];
  }
}

const feedAnalytics = new FeedAnalytics();

// Cache management utilities
const cacheUtils = {
  set: (key: string, data: any, ttl: number = CACHE_CONFIG.FEED.TTL) => {
    // Clean up expired entries
    cacheUtils.cleanup();
    
    // Remove oldest entries if we're at max capacity
    if (feedCache.size >= CACHE_CONFIG.FEED.MAX_ENTRIES) {
      const firstKey = feedCache.keys().next().value;
      if (firstKey) feedCache.delete(firstKey);
    }
    
    const expiresAt = Date.now() + ttl;
    feedCache.set(key, { data, timestamp: Date.now(), expiresAt });
  },
  
  get: (key: string) => {
    const entry = feedCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      feedCache.delete(key);
      return null;
    }
    
    return entry.data;
  },
  
  cleanup: () => {
    const now = Date.now();
    for (const [key, entry] of feedCache.entries()) {
      if (now > entry.expiresAt) {
        feedCache.delete(key);
      }
    }
  },
  
  clear: () => {
    feedCache.clear();
  }
};

export class FeedService {
  // Helper method to clear invalid community from cache/storage
  private static clearInvalidCommunityFromCache(invalidCommunityId: string): void {
    try {
      // Clear from localStorage if present
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('community') || key.includes('feed')) && 
            localStorage.getItem(key)?.includes(invalidCommunityId)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear from sessionStorage if present
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('community') || key.includes('feed')) && 
            sessionStorage.getItem(key)?.includes(invalidCommunityId)) {
          sessionStorage.removeItem(key);
        }
      }
      
      console.log(`[FEED] Cleared invalid community ${invalidCommunityId} from storage`);
    } catch (error) {
      console.warn('[FEED] Failed to clear invalid community from storage:', error);
    }
  }

  static async getEnhancedFeed(
    filter: FeedFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<FeedResponse> {
    try {
      // Create cache key
      const cacheKey = `feed_${JSON.stringify(filter)}_${page}_${limit}`;
      
      // Check cache first
      const cachedData = cacheUtils.get(cacheKey);
      if (cachedData) {
        // Track cache hit
        feedAnalytics.trackEvent({
          eventType: 'feed_cache_hit',
          timestamp: new Date(),
          metadata: { filter, page, limit }
        });
        
        return cachedData;
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: filter.sortBy || FeedSortType.HOT,
        timeRange: filter.timeRange || 'all'
      });

      // Add feedSource parameter
      if (filter.feedSource) {
        params.append('feedSource', filter.feedSource);
      }

      // CRITICAL: Add userAddress parameter for personalized feed
      // This is required for 'following' feed to work correctly
      if (filter.userAddress) {
        params.append('userAddress', filter.userAddress);
      }

      // Validate and filter community IDs before adding to params
      if (filter.communities && filter.communities.length > 0) {
        // UUID regex pattern to validate community IDs
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        const validCommunityIds = filter.communities.filter(communityId => {
          const isValid = uuidPattern.test(communityId);
          if (!isValid) {
            console.warn(`[FEED] Invalid community ID filtered out: ${communityId}`);
            // Clear invalid community from any stored state to prevent repeated errors
            this.clearInvalidCommunityFromCache(communityId);
          }
          return isValid;
        });

        // Only add valid community IDs to params
        validCommunityIds.forEach(communityId => {
          params.append('communities', communityId);
        });

        // If all community IDs were invalid, log warning and continue without community filter
        if (filter.communities.length > 0 && validCommunityIds.length === 0) {
          console.warn('[FEED] All community IDs were invalid and filtered out, fetching general feed');
          // Don't add any communities parameter to get general feed
        }
      }

      if (filter.tags && filter.tags.length > 0) {
        params.append('tags', filter.tags.join(','));
      }

      if (filter.author) {
        params.append('author', filter.author);
      }

      const url = `${BACKEND_API_BASE_URL}/api/feed?${params}`;

      // Debug logging
      console.log('🔍 [FEED DEBUG] Fetching feed with params:', {
        feedSource: filter.feedSource,
        userAddress: filter.userAddress,
        page,
        limit,
        url
      });

      // Track analytics event
      feedAnalytics.trackEvent({
        eventType: 'feed_load',
        timestamp: new Date(),
        metadata: { filter, page, limit }
      });

      // Get auth headers from authService to include JWT token
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders // Include auth headers with JWT token
        },
      }).catch((fetchError) => {
        // Handle network errors (backend unavailable)
        console.warn('Backend unavailable for feed, returning empty feed');
        throw new Error('Backend service is temporarily unavailable. Please try again later.');
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to fetch feed: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };

        // For server errors, return empty feed instead of throwing
        if (response.status >= 500) {
          console.warn('Backend unavailable for feed, returning empty feed');
          return {
            posts: [],
            hasMore: false,
            totalPages: 0
          };
        }

        // Handle 400 errors (e.g., invalid community IDs) gracefully
        if (response.status === 400) {
          console.warn('Invalid feed parameters (possibly non-existent community), returning empty feed');
          return {
            posts: [],
            hasMore: false,
            totalPages: 0
          };
        }

        throw error;
      }

      const response_data: BackendFeedResponse = await response.json();

      // Debug logging response
      console.log('✅ [FEED DEBUG] Received response:', {
        postsCount: response_data?.data?.posts?.length || 0,
        hasMore: response_data?.data?.pagination?.totalPages > page,
        totalPosts: response_data?.data?.pagination?.total
      });

      // Validate response data structure
      if (!response_data || !response_data.data || !Array.isArray(response_data.data.posts)) {
        console.warn('❌ [FEED DEBUG] Invalid feed response structure:', response_data);
        return {
          posts: [],
          hasMore: false,
          totalPages: 0
        };
      }

      // Transform backend posts to frontend posts
      // The enhanced feed API now returns both regular posts and quickPosts
      const posts = response_data.data.posts.map((post: any) => {
        // Check if this is a quickPost using the isQuickPost flag from backend
        if (post.isQuickPost === true) {
          // This is a quickPost (home/feed post)
          console.log('🔍 [FEED DEBUG] Converting quickPost:', { id: post.id, contentCid: post.contentCid, contentLength: post.content?.length });
          return convertBackendQuickPostToQuickPost(post);
        } else {
          // This is a regular post (community post)
          console.log('🔍 [FEED DEBUG] Converting regular post:', { id: post.id, contentCid: post.contentCid, contentLength: post.content?.length });
          return convertBackendPostToPost(post);
        }
      });

      const result: FeedResponse = {
        posts,
        hasMore: response_data.data.pagination?.page < response_data.data.pagination?.totalPages || false,
        totalPages: response_data.data.pagination?.totalPages || 0
      };
      
      // Cache the result
      cacheUtils.set(cacheKey, result, CACHE_CONFIG.FEED.TTL);
      
      // Track success event with more detailed analytics
      feedAnalytics.trackEvent({
        eventType: 'feed_load_success',
        timestamp: new Date(),
        metadata: {
          filter,
          page,
          limit,
          postCount: posts.length,
          hasMore: response_data.data.pagination.page < response_data.data.pagination.totalPages,
          totalPages: response_data.data.pagination.totalPages
        }
      });
      
      // Also track with the main analytics service
      analyticsService.trackUserEvent('feed_load', {
        filter,
        page,
        limit,
        postCount: posts.length,
        success: true
      });

      return result;
    } catch (error: any) {
      console.error('Error fetching enhanced feed:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'feed_error',
        timestamp: new Date(),
        metadata: { error: error.message || 'Unknown error' }
      });
      
      // Track error with main analytics service
      analyticsService.trackUserEvent('feed_load_error', {
        filter,
        page,
        limit,
        error: error.message || 'Unknown error',
        timestamp: new Date()
      });
      
      // Return empty feed on error instead of mock data
      return {
        posts: [],
        hasMore: false,
        totalPages: 0
      };
    }
  }

  static async getCommunityEngagementMetrics(
    communityId: string,
    timeRange: string = 'week'
  ): Promise<CommunityEngagementMetrics> {
    try {
      const params = new URLSearchParams({
        timeRange
      });

      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/community/${communityId}/metrics?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to fetch community metrics: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const metrics = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'community_metrics_load',
        timestamp: new Date(),
        metadata: { communityId, timeRange }
      });
      
      // Track with main analytics service
      analyticsService.trackUserEvent('community_metrics_load', {
        communityId,
        timeRange,
        success: true
      });
      
      return metrics;
    } catch (error: any) {
      console.error('Error fetching community engagement metrics:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'community_metrics_error',
        timestamp: new Date(),
        metadata: { 
          communityId, 
          timeRange, 
          error: error.message || 'Unknown error' 
        }
      });
      
      // Track error with main analytics service
      analyticsService.trackUserEvent('community_metrics_error', {
        communityId,
        timeRange,
        error: error.message || 'Unknown error',
        timestamp: new Date()
      });
      
      // Return empty metrics on error
      return {
        communityId,
        totalPosts: 0,
        totalEngagement: 0,
        topContributors: [],
        trendingTags: [],
        engagementGrowth: 0
      };
    }
  }

  static async getCommunityLeaderboard(
    communityId: string,
    metric: 'posts' | 'engagement' | 'tips_received' | 'tips_given',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    try {
      const params = new URLSearchParams({
        metric,
        limit: limit.toString()
      });

      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/community/${communityId}/leaderboard?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to fetch community leaderboard: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const leaderboard = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'leaderboard_load',
        timestamp: new Date(),
        metadata: { communityId, metric, limit }
      });
      
      return leaderboard;
    } catch (error: any) {
      console.error('Error fetching community leaderboard:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'leaderboard_error',
        timestamp: new Date(),
        metadata: { 
          communityId, 
          metric, 
          limit,
          error: error.message || 'Unknown error' 
        }
      });
      
      return [];
    }
  }

  static async getLikedByData(postId: string): Promise<LikedByData> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${postId}/engagement`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to fetch liked by data: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const data = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'liked_by_load',
        postId,
        timestamp: new Date()
      });
      
      return data;
    } catch (error: any) {
      console.error('Error fetching liked by data:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'liked_by_error',
        postId,
        timestamp: new Date(),
        metadata: { error: error.message || 'Unknown error' }
      });
      
      return {
        reactions: [],
        tips: [],
        followedUsers: [],
        totalUsers: 0
      };
    }
  }

  static async getTrendingPosts(
    timeRange: string = 'day',
    limit: number = 5
  ): Promise<EnhancedPost[]> {
    try {
      const params = new URLSearchParams({
        timeRange,
        limit: limit.toString()
      });

      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/trending?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to fetch trending posts: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const response_data: BackendFeedResponse = await response.json();

      // Validate response structure
      if (!response_data || !response_data.data || !Array.isArray(response_data.data.posts)) {
        console.warn('Invalid trending posts response structure:', response_data);
        return [];
      }

      const posts = response_data.data.posts.map(convertBackendPostToPost);
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'trending_posts_load',
        timestamp: new Date(),
        metadata: { timeRange, limit }
      });
      
      return posts;
    } catch (error: any) {
      console.error('Error fetching trending posts:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'trending_posts_error',
        timestamp: new Date(),
        metadata: { 
          timeRange, 
          limit,
          error: error.message || 'Unknown error' 
        }
      });
      
      return [];
    }
  }

  // Get trending hashtags
  static async getTrendingHashtags(
    timeRange: string = 'day',
    limit: number = 10
  ): Promise<Array<{tag: string; postCount: number; totalEngagement: number; trendingScore: number}>> {
    try {
      const params = new URLSearchParams({
        timeRange,
        limit: limit.toString()
      });

      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/hashtags/trending?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to fetch trending hashtags: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const hashtags = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'trending_hashtags_load',
        timestamp: new Date(),
        metadata: { timeRange, limit }
      });
      
      return hashtags;
    } catch (error: any) {
      console.error('Error fetching trending hashtags:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'trending_hashtags_error',
        timestamp: new Date(),
        metadata: { 
          timeRange, 
          limit,
          error: error.message || 'Unknown error' 
        }
      });
      
      return [];
    }
  }

  // Get content popularity metrics
  static async getContentPopularityMetrics(postId: string): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${postId}/popularity`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to fetch content popularity metrics: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const metrics = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'popularity_metrics_load',
        postId,
        timestamp: new Date()
      });
      
      return metrics;
    } catch (error: any) {
      console.error('Error fetching content popularity metrics:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'popularity_metrics_error',
        postId,
        timestamp: new Date(),
        metadata: { error: error.message || 'Unknown error' }
      });
      
      return null;
    }
  }

  // Add comment to post
  static async addComment(postId: string, content: string, parentCommentId?: string): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          content,
          parentCommentId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to add comment: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const comment = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'comment_add',
        postId,
        timestamp: new Date(),
        metadata: { hasParent: !!parentCommentId }
      });
      
      return comment;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'comment_add_error',
        postId,
        timestamp: new Date(),
        metadata: { 
          hasParent: !!parentCommentId,
          error: error.message || 'Unknown error' 
        }
      });
      
      throw error;
    }
  }

  // Get post comments
  static async getPostComments(
    postId: string,
    page: number = 1,
    limit: number = 20,
    sort: string = 'newest'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort
      });

      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to fetch comments: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const comments = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'comments_load',
        postId,
        timestamp: new Date(),
        metadata: { page, limit, sort }
      });
      
      return comments;
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'comments_load_error',
        postId,
        timestamp: new Date(),
        metadata: { 
          page, 
          limit, 
          sort,
          error: error.message || 'Unknown error' 
        }
      });
      
      return { comments: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }

  // Get comment replies
  static async getCommentReplies(
    commentId: string,
    page: number = 1,
    limit: number = 10,
    sort: string = 'newest'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort
      });

      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/comments/${commentId}/replies?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to fetch comment replies: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const replies = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'replies_load',
        timestamp: new Date(),
        metadata: { commentId, page, limit, sort }
      });
      
      return replies;
    } catch (error: any) {
      console.error('Error fetching comment replies:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'replies_load_error',
        timestamp: new Date(),
        metadata: { 
          commentId, 
          page, 
          limit, 
          sort,
          error: error.message || 'Unknown error' 
        }
      });
      
      return { replies: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }

  // Add reaction to post
  static async addReaction(postId: string, type: string, tokenAmount: number = 0): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          type,
          tokenAmount
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to add reaction: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const reaction = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'reaction_add',
        postId,
        timestamp: new Date(),
        metadata: { type, tokenAmount }
      });
      
      return reaction;
    } catch (error: any) {
      console.error('Error adding reaction:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'reaction_add_error',
        postId,
        timestamp: new Date(),
        metadata: { 
          type, 
          tokenAmount,
          error: error.message || 'Unknown error' 
        }
      });
      
      throw error;
    }
  }

  // Get post reactions
  static async getPostReactions(postId: string): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${postId}/reactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to fetch post reactions: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const reactions = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'reactions_load',
        postId,
        timestamp: new Date()
      });
      
      return reactions;
    } catch (error: any) {
      console.error('Error fetching post reactions:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'reactions_load_error',
        postId,
        timestamp: new Date(),
        metadata: { error: error.message || 'Unknown error' }
      });
      
      return { postId, totalReactions: 0, reactionsByType: [], recentReactions: [] };
    }
  }

  // Send tip to post author
  static async sendTip(postId: string, amount: number, tokenType: string, message?: string): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/tip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          amount,
          tokenType,
          message
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to send tip: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const tip = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'tip_send',
        postId,
        timestamp: new Date(),
        metadata: { amount, tokenType, hasMessage: !!message }
      });
      
      return tip;
    } catch (error: any) {
      console.error('Error sending tip:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'tip_send_error',
        postId,
        timestamp: new Date(),
        metadata: { 
          amount, 
          tokenType, 
          hasMessage: !!message,
          error: error.message || 'Unknown error' 
        }
      });
      
      throw error;
    }
  }

  // Share post
  static async sharePost(postId: string, platform: string, message?: string): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          platform,
          message
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to share post: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const share = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'post_share',
        postId,
        timestamp: new Date(),
        metadata: { platform, hasMessage: !!message }
      });
      
      return share;
    } catch (error: any) {
      console.error('Error sharing post:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'post_share_error',
        postId,
        timestamp: new Date(),
        metadata: { 
          platform, 
          hasMessage: !!message,
          error: error.message || 'Unknown error' 
        }
      });
      
      throw error;
    }
  }

  // Toggle bookmark
  static async toggleBookmark(postId: string): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to toggle bookmark: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const bookmark = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'bookmark_toggle',
        postId,
        timestamp: new Date()
      });
      
      return bookmark;
    } catch (error: any) {
      console.error('Error toggling bookmark:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'bookmark_toggle_error',
        postId,
        timestamp: new Date(),
        metadata: { error: error.message || 'Unknown error' }
      });
      
      throw error;
    }
  }

  // Real-time post updates
  static async subscribeToFeedUpdates(
    callback: (post: EnhancedPost) => void,
    filter?: FeedFilter
  ): Promise<() => void> {
    try {
      // Use localhost:3004 for local development (backend port), fallback to environment variable or default
      const wsBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'ws://localhost:3004'
        : (process.env.NEXT_PUBLIC_BACKEND_URL?.replace('http', 'ws') || 'ws://localhost:10000');
      
      const wsUrl = `${wsBaseUrl}/ws/feed`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_post') {
            // Extract the post data from the message
            const postData = data.data.post || data.data;
            const transformedPost = convertBackendPostToPost(postData);
            callback(transformedPost);
            
            // Track success event
            feedAnalytics.trackEvent({
              eventType: 'realtime_post_received',
              postId: transformedPost.id,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          
          // Track error event
          feedAnalytics.trackEvent({
            eventType: 'realtime_message_error',
            timestamp: new Date(),
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        
        // Track error event
        feedAnalytics.trackEvent({
          eventType: 'websocket_error',
          timestamp: new Date(),
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      };

      // Return cleanup function
      return () => {
        ws.close();
      };
    } catch (error: any) {
      console.error('Error setting up feed updates subscription:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'subscription_setup_error',
        timestamp: new Date(),
        metadata: { 
          filter: filter ? JSON.stringify(filter) : 'none',
          error: error.message || 'Unknown error' 
        }
      });
      
      // Return no-op cleanup function
      return () => {};
    }
  }

  // Get analytics events
  static getAnalyticsEvents(): FeedAnalyticsEvent[] {
    return feedAnalytics.getEvents();
  }

  // Clear analytics events
  static clearAnalyticsEvents(): void {
    feedAnalytics.clearEvents();
  }

  // Upvote a post
  static async upvotePost(postId: string): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/upvote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to upvote post: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const result = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'post_upvote',
        postId,
        timestamp: new Date()
      });
      
      return result;
    } catch (error: any) {
      console.error('Error upvoting post:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'post_upvote_error',
        postId,
        timestamp: new Date(),
        metadata: { error: error.message || 'Unknown error' }
      });
      
      throw error;
    }
  }

  // Downvote a post
  static async downvotePost(postId: string): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/downvote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: FeedError = {
          code: `HTTP_${response.status}`,
          message: errorData.error || `Failed to downvote post: ${response.statusText}`,
          timestamp: new Date(),
          retryable: response.status >= 500 || response.status === 429
        };
        
        throw error;
      }

      const result = await response.json();
      
      // Track success event
      feedAnalytics.trackEvent({
        eventType: 'post_downvote',
        postId,
        timestamp: new Date()
      });
      
      return result;
    } catch (error: any) {
      console.error('Error downvoting post:', error);
      
      // Track error event
      feedAnalytics.trackEvent({
        eventType: 'post_downvote_error',
        postId,
        timestamp: new Date(),
        metadata: { error: error.message || 'Unknown error' }
      });
      
      throw error;
    }
  }
}