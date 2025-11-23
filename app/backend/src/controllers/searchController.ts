import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { SearchService } from '../services/searchService';
import { RedisService } from '../services/redisService';
import { eq, and, or } from 'drizzle-orm';
import * as schema from '../db/schema';

export class SearchController {
  private static searchService = new SearchService();
  private static redisService = new RedisService();

  /**
   * Comprehensive search across posts, communities, and users
   */
  static async search(req: Request, res: Response) {
    try {
      const {
        q: query,
        type = 'all',
        timeRange = 'all',
        sortBy = 'relevance',
        category,
        tags,
        author,
        community,
        limit = '20',
        offset = '0'
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const searchParams = {
        type: type as string,
        timeRange: timeRange as string,
        sortBy: sortBy as string,
        category: category as string,
        tags: typeof tags === 'string' ? tags.split(',') : undefined,
        author: author as string,
        community: community as string
      };

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      // Check cache first
      const cacheKey = `search:${query}:${JSON.stringify(searchParams)}:${limitNum}:${offsetNum}`;
      const cachedResults = await SearchController.redisService.get(cacheKey);

      if (cachedResults) {
        return res.json(cachedResults);
      }

      // Check if query is a wallet address
      const isWalletAddress = /^0x[a-fA-F0-9]{40}$/i.test(query);
      const isPartialWalletAddress = /^0x[a-fA-F0-9]+$/i.test(query) && query.length >= 6;

      let results: any = {
        posts: [],
        communities: [],
        users: [],
        hashtags: [],
        totalResults: 0,
        hasMore: false
      };

      // If it's a wallet address, prioritize user search
      if (isWalletAddress || isPartialWalletAddress) {
        // Search users by wallet address
        const userResults = await SearchController.searchService.searchUsers(
          query,
          searchParams,
          limitNum,
          offsetNum
        );

        results.users = userResults.users || [];
        results.totalResults = userResults.total || 0;
        results.hasMore = userResults.hasMore || false;

        // Also search posts by that wallet address (if exact match)
        if (isWalletAddress && (type === 'all' || type === 'posts')) {
          const postResults = await SearchController.searchService.searchPosts(
            query,
            searchParams,
            limitNum,
            offsetNum
          );

          results.posts = postResults.posts || [];
          results.totalResults += postResults.total || 0;
        }
      } else {
        // Regular search across all types
        if (type === 'all' || type === 'posts') {
          const postResults = await SearchController.searchService.searchPosts(
            query,
            searchParams,
            limitNum,
            offsetNum
          );
          results.posts = postResults.posts || [];
          results.totalResults += postResults.total || 0;
        }

        if (type === 'all' || type === 'communities') {
          const communityResults = await SearchController.searchService.searchCommunities(
            query,
            searchParams,
            limitNum,
            offsetNum
          );
          results.communities = communityResults.communities || [];
          results.totalResults += communityResults.total || 0;
        }

        if (type === 'all' || type === 'users') {
          const userResults = await SearchController.searchService.searchUsers(
            query,
            searchParams,
            limitNum,
            offsetNum
          );
          results.users = userResults.users || [];
          results.totalResults += userResults.total || 0;
        }

        // Check for more results
        results.hasMore = (
          (results.posts.length >= limitNum) ||
          (results.communities.length >= limitNum) ||
          (results.users.length >= limitNum)
        );
      }

      // Cache results for 5 minutes
      await SearchController.redisService.set(cacheKey, results, 300);

      return res.json(results);
    } catch (error) {
      safeLogger.error('Search error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }
  }

  /**
   * Search posts with advanced filtering
   */
  static async searchPosts(req: Request, res: Response) {
    try {
      const {
        q: query,
        timeRange = 'all',
        sortBy = 'relevance',
        category,
        tags,
        author,
        community,
        limit = '20',
        offset = '0'
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const searchParams = {
        timeRange: timeRange as string,
        sortBy: sortBy as string,
        category: category as string,
        tags: typeof tags === 'string' ? tags.split(',') : undefined,
        author: author as string,
        community: community as string
      };

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      const results = await SearchController.searchService.searchPosts(
        query,
        searchParams,
        limitNum,
        offsetNum
      );

      return res.json(results);
    } catch (error) {
      safeLogger.error('Post search error:', error);
      return res.status(500).json({ error: 'Post search failed' });
    }
  }

  /**
   * Search communities with filters
   */
  static async searchCommunities(req: Request, res: Response) {
    try {
      const {
        q: query,
        category,
        limit = '20',
        offset = '0'
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const searchParams = {
        category: category as string
      };

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      const results = await SearchController.searchService.searchCommunities(
        query,
        searchParams,
        limitNum,
        offsetNum
      );

      return res.json(results);
    } catch (error) {
      safeLogger.error('Community search error:', error);
      return res.status(500).json({ error: 'Community search failed' });
    }
  }

  /**
   * Search users/profiles
   */
  static async searchUsers(req: Request, res: Response) {
    try {
      const {
        q: query,
        limit = '20',
        offset = '0'
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      const results = await SearchController.searchService.searchUsers(
        query,
        limitNum,
        offsetNum
      );

      return res.json(results);
    } catch (error) {
      safeLogger.error('User search error:', error);
      return res.status(500).json({ error: 'User search failed' });
    }
  }

  /**
   * Get trending content
   */
  static async getTrendingContent(req: Request, res: Response) {
    try {
      const {
        timeRange = 'day',
        limit = '10'
      } = req.query;

      const limitNum = parseInt(limit as string, 10);

      // Check cache first
      const cacheKey = `trending:${timeRange}:${limitNum}`;
      const cachedResults = await SearchController.redisService.get(cacheKey);
      
      if (cachedResults) {
        return res.json(cachedResults);
      }

      const results = await SearchController.searchService.getTrendingContent(
        limitNum,
        timeRange as string
      );

      // Cache trending content for 10 minutes
      await SearchController.redisService.set(cacheKey, results, 600);

      return res.json(results);
    } catch (error) {
      safeLogger.error('Trending content error:', error);
      return res.status(500).json({ error: 'Failed to fetch trending content' });
    }
  }

  /**
   * Get trending hashtags
   */
  static async getTrendingHashtags(req: Request, res: Response) {
    try {
      const {
        timeRange = 'day',
        limit = '20'
      } = req.query;

      const limitNum = parseInt(limit as string, 10);

      const results = await SearchController.searchService.getTrendingHashtags(
        limitNum,
        timeRange as string
      );

      return res.json(results);
    } catch (error) {
      safeLogger.error('Trending hashtags error:', error);
      return res.status(500).json({ error: 'Failed to fetch trending hashtags' });
    }
  }

  /**
   * Get posts by hashtag
   */
  static async getPostsByHashtag(req: Request, res: Response) {
    try {
      const { hashtag } = req.params;
      const {
        timeRange = 'all',
        sortBy = 'recent',
        limit = '20',
        offset = '0'
      } = req.query;

      const searchParams = {
        timeRange: timeRange as string,
        sortBy: sortBy as string
      };

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      const results = await SearchController.searchService.getPostsByHashtag(
        hashtag,
        limitNum,
        offsetNum
      );

      return res.json(results);
    } catch (error) {
      safeLogger.error('Hashtag posts error:', error);
      return res.status(500).json({ error: 'Failed to fetch hashtag posts' });
    }
  }

  /**
   * Get topic-based content
   */
  static async getTopicContent(req: Request, res: Response) {
    try {
      const { topic } = req.params;
      const { limit = '20' } = req.query;

      const limitNum = parseInt(limit as string, 10);

      const results = await SearchController.searchService.getTopicContent(
        topic,
        limitNum
      );

      return res.json(results);
    } catch (error) {
      safeLogger.error('Topic content error:', error);
      return res.status(500).json({ error: 'Failed to fetch topic content' });
    }
  }

  /**
   * Get search suggestions
   */
  static async getSearchSuggestions(req: Request, res: Response) {
    try {
      const {
        q: query,
        type = 'all',
        limit = '10'
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const limitNum = parseInt(limit as string, 10);

      // Check if query looks like a wallet address
      const isPartialWalletAddress = /^0x[a-fA-F0-9]+$/i.test(query) && query.length >= 6;

      // If it's a wallet address, prioritize user suggestions
      if (isPartialWalletAddress) {
        const userResults = await SearchController.searchService.searchUsers(
          query,
          {},
          limitNum,
          0
        );

        return res.json({
          posts: [],
          communities: [],
          users: userResults.users.map((u: any) => u.handle || u.ens || `${u.walletAddress.slice(0, 6)}...${u.walletAddress.slice(-4)}`),
          hashtags: []
        });
      }

      // Regular suggestions
      const suggestions = await SearchController.searchService.getSearchSuggestions(
        query,
        limitNum
      );

      return res.json({
        posts: suggestions.slice(0, Math.ceil(limitNum / 4)),
        communities: suggestions.slice(Math.ceil(limitNum / 4), Math.ceil(limitNum / 2)),
        users: suggestions.slice(Math.ceil(limitNum / 2), Math.ceil(3 * limitNum / 4)),
        hashtags: suggestions.slice(Math.ceil(3 * limitNum / 4), limitNum)
      });
    } catch (error) {
      safeLogger.error('Search suggestions error:', error);
      return res.status(500).json({ error: 'Failed to fetch search suggestions' });
    }
  }

  /**
   * Get community recommendations
   */
  static async getRecommendedCommunities(req: Request, res: Response) {
    try {
      const {
        userId,
        limit = '10',
        excludeJoined = 'true',
        basedOn = 'activity'
      } = req.query;

      const limitNum = parseInt(limit as string, 10);

      const results = await SearchController.searchService.getRecommendedCommunities({
        userId: userId as string,
        limit: limitNum,
        excludeJoined: excludeJoined === 'true',
        basedOn: basedOn as string
      });

      return res.json(results);
    } catch (error) {
      safeLogger.error('Community recommendations error:', error);
      return res.status(500).json({ error: 'Failed to fetch community recommendations' });
    }
  }

  /**
   * Get user recommendations
   */
  static async getRecommendedUsers(req: Request, res: Response) {
    try {
      const {
        userId,
        limit = '10',
        basedOn = 'activity'
      } = req.query;

      const limitNum = parseInt(limit as string, 10);

      const results = await SearchController.searchService.getRecommendedUsers({
        userId: userId as string,
        limit: limitNum,
        basedOn: basedOn as string
      });

      return res.json(results);
    } catch (error) {
      safeLogger.error('User recommendations error:', error);
      return res.status(500).json({ error: 'Failed to fetch user recommendations' });
    }
  }

  /**
   * Get enhanced search suggestions with categorization
   */
  static async getEnhancedSearchSuggestions(req: Request, res: Response) {
    try {
      const {
        q: query,
        limit = '10'
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const limitNum = parseInt(limit as string, 10);

      // Get suggestions from search service
      const suggestions = await SearchController.searchService.getSearchSuggestions(
        query,
        limitNum
      );

      // Categorize suggestions
      const categorizedSuggestions = await SearchController.categorizeSuggestions(query, suggestions);

      return res.json({
        query,
        suggestions: categorizedSuggestions,
        total: suggestions.length
      });
    } catch (error) {
      safeLogger.error('Enhanced search suggestions error:', error);
      return res.status(500).json({ error: 'Failed to fetch search suggestions' });
    }
  }

  /**
   * Categorize search suggestions for better UX
   */
  private static async categorizeSuggestions(query: string, suggestions: string[]) {
    // Simplified categorization - in a real implementation, this would query the database
    // to determine what each suggestion represents
    const categorized = {
      products: [] as string[],
      categories: [] as string[],
      tags: [] as string[],
      sellers: [] as string[],
    };

    // For now, we'll do a simple categorization based on common patterns
    // In a real implementation, this would query the database to check what each suggestion represents
    for (const suggestion of suggestions) {
      // Simple heuristics for categorization
      if (suggestion.includes(' ')) {
        categorized.products.push(suggestion);
      } else if (suggestion.length > 3 && suggestion.toLowerCase() === suggestion) {
        categorized.tags.push(suggestion);
      } else if (suggestion.length > 10) {
        categorized.sellers.push(suggestion);
      } else {
        categorized.categories.push(suggestion);
      }
    }

    return categorized;
  }
}
