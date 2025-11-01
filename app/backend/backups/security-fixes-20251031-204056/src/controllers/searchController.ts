import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { SearchService } from '../services/searchService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { RedisService } from '../services/redisService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { eq, and, or } from 'drizzle-orm';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import * as schema from '../db/schema';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

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

      const results = await SearchController.searchService.advancedSearch(
        { query, ...searchParams },
        { field: 'createdAt', direction: 'desc' },
        { page: Math.floor(offsetNum / limitNum) + 1, limit: limitNum }
      );

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

      const results = await SearchController.searchService.getSearchSuggestions(
        query,
        limitNum
      );

      return res.json(results);
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