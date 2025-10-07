import { EnhancedPost, FeedFilter, CommunityEngagementMetrics, LeaderboardEntry, LikedByData, FeedSortType } from '../types/feed';
import { requestManager } from './requestManager';

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export interface FeedResponse {
  posts: EnhancedPost[];
  hasMore: boolean;
  totalPages: number;
}

interface BackendFeedResponse {
  posts: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class FeedService {
  static async getEnhancedFeed(
    filter: FeedFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<FeedResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: filter.sortBy || FeedSortType.HOT,
        timeRange: filter.timeRange || 'all'
      });

      if (filter.communityId) {
        params.append('communities', filter.communityId);
      }

      if (filter.tags && filter.tags.length > 0) {
        params.append('tags', filter.tags.join(','));
      }

      if (filter.author) {
        params.append('author', filter.author);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/enhanced?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.statusText}`);
      }

      const data: BackendFeedResponse = await response.json();
      
      return {
        posts: data.posts.map(this.transformBackendPost),
        hasMore: data.pagination.page < data.pagination.totalPages,
        totalPages: data.pagination.totalPages
      };
    } catch (error) {
      console.error('Error fetching enhanced feed:', error);
      
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/community/${communityId}/metrics?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch community metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching community engagement metrics:', error);
      
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/community/${communityId}/leaderboard?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch community leaderboard: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching community leaderboard:', error);
      return [];
    }
  }

  static async getLikedByData(postId: string): Promise<LikedByData> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${postId}/engagement`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch liked by data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching liked by data:', error);
      
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/trending?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trending posts: ${response.statusText}`);
      }

      const data: BackendFeedResponse = await response.json();
      return data.posts.map(this.transformBackendPost);
    } catch (error) {
      console.error('Error fetching trending posts:', error);
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/hashtags/trending?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trending hashtags: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      return [];
    }
  }

  // Get content popularity metrics
  static async getContentPopularityMetrics(postId: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${postId}/popularity`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch content popularity metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching content popularity metrics:', error);
      return null;
    }
  }

  // Add comment to post
  static async addComment(postId: string, content: string, parentCommentId?: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          parentCommentId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding comment:', error);
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching comments:', error);
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/comments/${commentId}/replies?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch comment replies: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching comment replies:', error);
      return { replies: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }

  // Add reaction to post
  static async addReaction(postId: string, type: string, tokenAmount: number = 0): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          tokenAmount
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add reaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  // Get post reactions
  static async getPostReactions(postId: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${postId}/reactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch post reactions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching post reactions:', error);
      return { postId, totalReactions: 0, reactionsByType: [], recentReactions: [] };
    }
  }

  // Send tip to post author
  static async sendTip(postId: string, amount: number, tokenType: string, message?: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/tip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          tokenType,
          message
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send tip: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending tip:', error);
      throw error;
    }
  }

  // Share post
  static async sharePost(postId: string, platform: string, message?: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          message
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to share post: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sharing post:', error);
      throw error;
    }
  }

  // Toggle bookmark
  static async toggleBookmark(postId: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle bookmark: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      throw error;
    }
  }

  // Real-time post updates
  static async subscribeToFeedUpdates(
    callback: (post: EnhancedPost) => void,
    filter?: FeedFilter
  ): Promise<() => void> {
    try {
      // WebSocket connection for real-time updates
      const wsUrl = `${BACKEND_API_BASE_URL.replace('http', 'ws')}/ws/feed`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_post') {
            const transformedPost = this.transformBackendPost(data.post);
            callback(transformedPost);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      // Return cleanup function
      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Error setting up feed updates subscription:', error);
      // Return no-op cleanup function
      return () => {};
    }
  }

  // Transform backend post data to frontend format
  private static transformBackendPost(backendPost: any): EnhancedPost {
    return {
      id: backendPost.id.toString(),
      author: backendPost.walletAddress || backendPost.authorId,
      contentCid: backendPost.contentCid,
      mediaCids: backendPost.mediaCids ? JSON.parse(backendPost.mediaCids) : [],
      tags: backendPost.tags ? JSON.parse(backendPost.tags) : [],
      createdAt: new Date(backendPost.createdAt),
      updatedAt: new Date(backendPost.updatedAt || backendPost.createdAt),
      reactions: this.transformReactions(backendPost.reactions || []),
      tips: this.transformTips(backendPost.tips || []),
      comments: backendPost.commentCount || 0,
      shares: backendPost.shareCount || 0,
      views: backendPost.viewCount || 0,
      engagementScore: backendPost.engagementScore || 0,
      previews: [], // Will be populated by content preview service
      socialProof: undefined, // Will be populated by social proof service
      trendingStatus: backendPost.trendingScore > 0 ? 'trending' : null,
      trendingScore: backendPost.trendingScore || 0,
      isBookmarked: false, // Will be populated by user preferences
      communityId: backendPost.dao,
      contentType: this.detectContentType(backendPost)
    };
  }

  private static transformReactions(reactions: any[]): any[] {
    // Group reactions by type
    const reactionMap = new Map();
    
    reactions.forEach(reaction => {
      const type = reaction.type;
      if (!reactionMap.has(type)) {
        reactionMap.set(type, {
          type,
          users: [],
          totalAmount: 0,
          tokenType: 'LDAO'
        });
      }
      
      const reactionGroup = reactionMap.get(type);
      reactionGroup.users.push({
        address: reaction.userAddress,
        username: reaction.username || reaction.userAddress.slice(0, 8),
        avatar: reaction.avatar || '',
        amount: parseFloat(reaction.amount || '0'),
        timestamp: new Date(reaction.createdAt)
      });
      reactionGroup.totalAmount += parseFloat(reaction.amount || '0');
    });

    return Array.from(reactionMap.values());
  }

  private static transformTips(tips: any[]): any[] {
    return tips.map(tip => ({
      from: tip.fromAddress,
      amount: parseFloat(tip.amount),
      tokenType: tip.token || 'LDAO',
      message: tip.message,
      timestamp: new Date(tip.createdAt)
    }));
  }

  private static detectContentType(post: any): 'text' | 'media' | 'link' | 'poll' | 'proposal' {
    if (post.mediaCids && JSON.parse(post.mediaCids || '[]').length > 0) {
      return 'media';
    }
    
    if (post.contentCid && post.contentCid.includes('http')) {
      return 'link';
    }
    
    if (post.tags && JSON.parse(post.tags || '[]').includes('poll')) {
      return 'poll';
    }
    
    if (post.tags && JSON.parse(post.tags || '[]').includes('proposal')) {
      return 'proposal';
    }
    
    return 'text';
  }
}