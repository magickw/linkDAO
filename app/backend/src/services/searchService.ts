import { DatabaseService } from './databaseService';
import { RedisService } from './redisService';

export interface SearchFilters {
  type?: string;
  timeRange?: string;
  sortBy?: string;
  category?: string;
  tags?: string[];
  author?: string;
  community?: string;
}

export interface SearchResults {
  posts: any[];
  communities: any[];
  users: any[];
  hashtags: string[];
  totalResults: number;
  hasMore: boolean;
}

export interface TrendingContent {
  posts: any[];
  communities: any[];
  hashtags: string[];
  topics: string[];
}

export interface RecommendationOptions {
  userId?: string;
  limit?: number;
  excludeJoined?: boolean;
  basedOn?: string;
}

export class SearchService {
  private db: DatabaseService;
  private redis: RedisService;

  constructor() {
    this.db = new DatabaseService();
    this.redis = new RedisService();
  }

  /**
   * Comprehensive search across posts and users (simplified version)
   */
  async search(
    query: string,
    filters: SearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchResults> {
    const searchResults: SearchResults = {
      posts: [],
      communities: [],
      users: [],
      hashtags: [],
      totalResults: 0,
      hasMore: false
    };

    try {
      // For now, we'll implement basic search functionality
      // Posts search would need to be implemented when we have proper content storage
      // Users search can work with existing schema
      
      if (!filters.type || filters.type === 'all' || filters.type === 'users') {
        const userResults = await this.searchUsers(query, limit, offset);
        searchResults.users = userResults.users;
        searchResults.totalResults += userResults.total;
      }

      // Extract hashtags from query
      const hashtags = this.extractHashtags(query);
      if (hashtags.length > 0) {
        searchResults.hashtags = hashtags;
      }

      // Mock some results for posts and communities for now
      if (!filters.type || filters.type === 'all' || filters.type === 'posts') {
        searchResults.posts = this.getMockPosts(query, limit);
        searchResults.totalResults += searchResults.posts.length;
      }

      if (!filters.type || filters.type === 'all' || filters.type === 'communities') {
        searchResults.communities = this.getMockCommunities(query, limit);
        searchResults.totalResults += searchResults.communities.length;
      }

      searchResults.hasMore = searchResults.totalResults >= limit;

      return searchResults;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Search failed');
    }
  }

  /**
   * Search posts (simplified implementation)
   */
  async searchPosts(
    query: string,
    filters: SearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ posts: any[]; hasMore: boolean; total: number }> {
    try {
      // For now, return mock data
      const posts = this.getMockPosts(query, limit);
      
      return {
        posts,
        hasMore: posts.length >= limit,
        total: posts.length
      };
    } catch (error) {
      console.error('Post search error:', error);
      throw new Error('Post search failed');
    }
  }

  /**
   * Search communities (mock implementation)
   */
  async searchCommunities(
    query: string,
    filters: SearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ communities: any[]; hasMore: boolean; total: number }> {
    try {
      const communities = this.getMockCommunities(query, limit);
      
      return {
        communities,
        hasMore: communities.length >= limit,
        total: communities.length
      };
    } catch (error) {
      console.error('Community search error:', error);
      throw new Error('Community search failed');
    }
  }

  /**
   * Search users/profiles
   */
  async searchUsers(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ users: any[]; hasMore: boolean; total: number }> {
    try {
      // This will work with the existing schema
      const users = await this.db.searchUsers(query, limit, offset);
      
      return {
        users: users || [],
        hasMore: (users?.length || 0) >= limit,
        total: users?.length || 0
      };
    } catch (error) {
      console.error('User search error:', error);
      // Return empty results instead of throwing
      return {
        users: [],
        hasMore: false,
        total: 0
      };
    }
  }

  /**
   * Get trending content (mock implementation)
   */
  async getTrendingContent(
    timeRange: string = 'day',
    limit: number = 10
  ): Promise<TrendingContent> {
    try {
      return {
        posts: this.getMockTrendingPosts(limit),
        communities: this.getMockTrendingCommunities(limit),
        hashtags: this.getMockTrendingHashtags(limit),
        topics: this.getMockTrendingTopics(limit)
      };
    } catch (error) {
      console.error('Trending content error:', error);
      throw new Error('Failed to fetch trending content');
    }
  }

  /**
   * Get trending hashtags (mock implementation)
   */
  async getTrendingHashtags(
    timeRange: string = 'day',
    limit: number = 20
  ): Promise<{ tag: string; count: number; growth: number }[]> {
    try {
      const hashtags = ['defi', 'nft', 'web3', 'crypto', 'blockchain', 'dao', 'metaverse', 'gaming'];
      
      return hashtags.slice(0, limit).map((tag, index) => ({
        tag,
        count: Math.floor(Math.random() * 1000) + 100,
        growth: Math.floor(Math.random() * 50)
      }));
    } catch (error) {
      console.error('Trending hashtags error:', error);
      throw new Error('Failed to fetch trending hashtags');
    }
  }

  /**
   * Get posts by hashtag (mock implementation)
   */
  async getPostsByHashtag(
    hashtag: string,
    filters: SearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ posts: any[]; hasMore: boolean; total: number }> {
    try {
      const posts = this.getMockPosts(`#${hashtag}`, limit);
      
      return {
        posts,
        hasMore: posts.length >= limit,
        total: posts.length
      };
    } catch (error) {
      console.error('Hashtag posts error:', error);
      throw new Error('Failed to fetch hashtag posts');
    }
  }

  /**
   * Get topic-based content (mock implementation)
   */
  async getTopicContent(
    topic: string,
    limit: number = 20
  ): Promise<{ posts: any[]; communities: any[]; hashtags: string[] }> {
    try {
      return {
        posts: this.getMockPosts(topic, limit),
        communities: this.getMockCommunities(topic, limit),
        hashtags: this.generateRelatedHashtags(topic)
      };
    } catch (error) {
      console.error('Topic content error:', error);
      throw new Error('Failed to fetch topic content');
    }
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(
    query: string,
    type: string = 'all',
    limit: number = 10
  ): Promise<{
    posts: string[];
    communities: string[];
    users: string[];
    hashtags: string[];
  }> {
    try {
      const suggestions = {
        posts: [] as string[],
        communities: [] as string[],
        users: [] as string[],
        hashtags: [] as string[]
      };

      // Get user suggestions from actual database
      if (type === 'all' || type === 'users') {
        try {
          const users = await this.db.searchUsers(query, limit, 0);
          suggestions.users = (users || []).map((u: any) => u.handle || u.walletAddress).filter(Boolean);
        } catch (error) {
          // Fail silently for suggestions
        }
      }

      // Mock suggestions for other types
      if (type === 'all' || type === 'communities') {
        suggestions.communities = this.getMockCommunitySuggestions(query, limit);
      }

      if (type === 'all' || type === 'hashtags') {
        suggestions.hashtags = this.generateHashtagSuggestions(query, limit);
      }

      return suggestions;
    } catch (error) {
      console.error('Search suggestions error:', error);
      return { posts: [], communities: [], users: [], hashtags: [] };
    }
  }

  /**
   * Get recommended communities (mock implementation)
   */
  async getRecommendedCommunities(options: RecommendationOptions): Promise<any[]> {
    try {
      return this.getMockCommunities('', options.limit || 10);
    } catch (error) {
      console.error('Community recommendations error:', error);
      throw new Error('Failed to fetch community recommendations');
    }
  }

  /**
   * Get recommended users
   */
  async getRecommendedUsers(options: RecommendationOptions): Promise<any[]> {
    try {
      // Get actual users from database
      const users = await this.db.getRecentUsers(options.limit || 10);
      return users || [];
    } catch (error) {
      console.error('User recommendations error:', error);
      return [];
    }
  }

  // Helper methods

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  private generateRelatedHashtags(topic: string): string[] {
    const relatedHashtags = {
      'defi': ['defi', 'yield', 'liquidity', 'farming', 'protocol'],
      'nft': ['nft', 'art', 'collectibles', 'opensea', 'mint'],
      'gaming': ['gaming', 'play2earn', 'metaverse', 'esports', 'blockchain'],
      'dao': ['dao', 'governance', 'voting', 'community', 'decentralized']
    };

    const topicLower = topic.toLowerCase();
    for (const [key, hashtags] of Object.entries(relatedHashtags)) {
      if (topicLower.includes(key)) {
        return hashtags;
      }
    }

    return [topicLower];
  }

  private generateHashtagSuggestions(query: string, limit: number): string[] {
    const commonHashtags = [
      'defi', 'nft', 'web3', 'crypto', 'blockchain', 'dao', 'metaverse', 
      'gaming', 'art', 'music', 'sports', 'technology', 'education'
    ];

    return commonHashtags
      .filter(tag => tag.includes(query.toLowerCase()))
      .slice(0, limit);
  }

  // Mock data methods (to be replaced with real implementations)

  private getMockPosts(query: string, limit: number): any[] {
    const mockPosts = [];
    for (let i = 0; i < Math.min(limit, 5); i++) {
      mockPosts.push({
        id: `post-${i}`,
        content: `Mock post about ${query} - ${i + 1}`,
        author: `0x${Math.random().toString(16).substr(2, 8)}`,
        createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        tags: [query.toLowerCase()],
        reactions: []
      });
    }
    return mockPosts;
  }

  private getMockCommunities(query: string, limit: number): any[] {
    const categories = ['Technology', 'Gaming', 'Art', 'Music', 'Sports', 'Education'];
    const mockCommunities = [];
    
    for (let i = 0; i < Math.min(limit, 3); i++) {
      mockCommunities.push({
        id: `community-${i}`,
        name: `${query.toLowerCase()}-community-${i}`,
        displayName: `${query} Community ${i + 1}`,
        description: `A community for discussing ${query} and related topics`,
        category: categories[i % categories.length],
        memberCount: Math.floor(Math.random() * 10000) + 100,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        isPublic: true,
        moderators: [],
        settings: {
          allowedPostTypes: [],
          requireApproval: false,
          minimumReputation: 0,
          stakingRequirements: []
        }
      });
    }
    
    return mockCommunities;
  }

  private getMockCommunitySuggestions(query: string, limit: number): string[] {
    const communities = ['defi-community', 'nft-collectors', 'web3-builders', 'crypto-traders'];
    return communities
      .filter(community => community.includes(query.toLowerCase()))
      .slice(0, limit);
  }

  private getMockTrendingPosts(limit: number): any[] {
    return this.getMockPosts('trending', limit);
  }

  private getMockTrendingCommunities(limit: number): any[] {
    return this.getMockCommunities('trending', limit);
  }

  private getMockTrendingHashtags(limit: number): string[] {
    return ['defi', 'nft', 'web3', 'crypto', 'blockchain'].slice(0, limit);
  }

  private getMockTrendingTopics(limit: number): string[] {
    return ['Technology', 'Gaming', 'Art', 'Music', 'Sports'].slice(0, limit);
  }
}