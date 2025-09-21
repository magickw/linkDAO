import { Request, Response } from 'express';
import { EnhancedSearchService } from '../services/enhancedSearchService';

export class EnhancedSearchController {
  private enhancedSearchService: EnhancedSearchService;

  constructor() {
    this.enhancedSearchService = new EnhancedSearchService();
  }

  /**
   * Enhanced search with real-time suggestions and content previews
   */
  async enhancedSearch(req: Request, res: Response): Promise<void> {
    try {
      const {
        q: query,
        type,
        timeRange,
        sortBy,
        category,
        tags,
        author,
        community,
        hasMedia,
        hasPolls,
        hasProposals,
        minEngagement,
        verified,
        location,
        limit = '20',
        offset = '0',
        userId
      } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query parameter is required' });
        return;
      }

      const filters = {
        type: type as any,
        timeRange: timeRange as any,
        sortBy: sortBy as any,
        category: category as string,
        tags: tags ? (tags as string).split(',') : undefined,
        author: author as string,
        community: community as string,
        hasMedia: hasMedia === 'true',
        hasPolls: hasPolls === 'true',
        hasProposals: hasProposals === 'true',
        minEngagement: minEngagement ? parseInt(minEngagement as string) : undefined,
        verified: verified === 'true',
        location: location as string
      };

      const results = await this.enhancedSearchService.enhancedSearch(
        query,
        filters,
        parseInt(limit as string),
        parseInt(offset as string),
        userId as string
      );

      res.json(results);
    } catch (error) {
      console.error('Enhanced search error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Enhanced search failed' 
      });
    }
  }

  /**
   * Get enhanced search suggestions with previews
   */
  async getEnhancedSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, type = 'all', limit = '10', userId } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query parameter is required' });
        return;
      }

      const suggestions = await this.enhancedSearchService.getEnhancedSuggestions(
        query,
        type as any,
        parseInt(limit as string),
        userId as string
      );

      res.json(suggestions);
    } catch (error) {
      console.error('Enhanced suggestions error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get suggestions' 
      });
    }
  }

  /**
   * Get discovery content for the discovery dashboard
   */
  async getDiscoveryContent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, preferences } = req.query;

      const content = await this.enhancedSearchService.getDiscoveryContent(
        userId as string,
        preferences ? (preferences as string).split(',') : undefined
      );

      res.json(content);
    } catch (error) {
      console.error('Discovery content error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get discovery content' 
      });
    }
  }

  /**
   * Get hashtag discovery with engagement metrics
   */
  async getHashtagDiscovery(req: Request, res: Response): Promise<void> {
    try {
      const { hashtag } = req.params;
      const { timeRange = 'day', limit = '20', offset = '0' } = req.query;

      const result = await this.enhancedSearchService.getHashtagDiscovery(
        hashtag,
        timeRange as any,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json(result);
    } catch (error) {
      console.error('Hashtag discovery error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get hashtag discovery' 
      });
    }
  }

  /**
   * Get topic discovery
   */
  async getTopicDiscovery(req: Request, res: Response): Promise<void> {
    try {
      const { topic } = req.params;
      const { limit = '20', offset = '0' } = req.query;

      const result = await this.enhancedSearchService.getTopicDiscovery(
        topic,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json(result);
    } catch (error) {
      console.error('Topic discovery error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get topic discovery' 
      });
    }
  }

  /**
   * Search within a specific community
   */
  async searchInCommunity(req: Request, res: Response): Promise<void> {
    try {
      const { communityId } = req.params;
      const {
        q: query,
        timeRange,
        sortBy,
        hasMedia,
        hasPolls,
        hasProposals,
        minEngagement,
        limit = '20',
        offset = '0'
      } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query parameter is required' });
        return;
      }

      const filters = {
        timeRange: timeRange as any,
        sortBy: sortBy as any,
        hasMedia: hasMedia === 'true',
        hasPolls: hasPolls === 'true',
        hasProposals: hasProposals === 'true',
        minEngagement: minEngagement ? parseInt(minEngagement as string) : undefined,
        community: communityId
      };

      const results = await this.enhancedSearchService.searchInCommunity(
        communityId,
        query,
        filters,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json(results);
    } catch (error) {
      console.error('Community search error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Community search failed' 
      });
    }
  }

  /**
   * Get community recommendations
   */
  async getCommunityRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId, basedOn = 'interests', limit = '10', excludeJoined = 'true' } = req.query;

      const recommendations = await this.enhancedSearchService.getCommunityRecommendations(
        userId as string,
        basedOn as any,
        parseInt(limit as string),
        excludeJoined === 'true'
      );

      res.json(recommendations);
    } catch (error) {
      console.error('Community recommendations error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get community recommendations' 
      });
    }
  }

  /**
   * Get user recommendations
   */
  async getUserRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId, basedOn = 'mutual_connections', limit = '10' } = req.query;

      const recommendations = await this.enhancedSearchService.getUserRecommendations(
        userId as string,
        basedOn as any,
        parseInt(limit as string)
      );

      res.json(recommendations);
    } catch (error) {
      console.error('User recommendations error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get user recommendations' 
      });
    }
  }

  /**
   * Bookmark an item
   */
  async bookmarkItem(req: Request, res: Response): Promise<void> {
    try {
      const { type, itemId, title, description, thumbnail, tags, folder } = req.body;

      if (!type || !itemId || !title) {
        res.status(400).json({ error: 'Type, itemId, and title are required' });
        return;
      }

      const bookmark = await this.enhancedSearchService.bookmarkItem(
        type,
        itemId,
        title,
        description,
        thumbnail,
        tags || [],
        folder
      );

      res.json(bookmark);
    } catch (error) {
      console.error('Bookmark error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to bookmark item' 
      });
    }
  }

  /**
   * Follow an item (user, community, hashtag, topic)
   */
  async followItem(req: Request, res: Response): Promise<void> {
    try {
      const { type, targetType, targetId } = req.body;

      if (!type || !targetType || !targetId) {
        res.status(400).json({ error: 'Type, targetType, and targetId are required' });
        return;
      }

      const followAction = await this.enhancedSearchService.followItem(
        targetType,
        targetId
      );

      res.json(followAction);
    } catch (error) {
      console.error('Follow error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to follow item' 
      });
    }
  }

  /**
   * Join a community
   */
  async joinCommunity(req: Request, res: Response): Promise<void> {
    try {
      const { communityId } = req.params;

      const joinAction = await this.enhancedSearchService.joinCommunity(communityId);

      res.json(joinAction);
    } catch (error) {
      console.error('Join community error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to join community' 
      });
    }
  }

  /**
   * Update learning data for personalization
   */
  async updateLearningData(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const learningData = req.body;

      await this.enhancedSearchService.updateLearningData(userId, learningData);

      res.json({ success: true });
    } catch (error) {
      console.error('Update learning data error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to update learning data' 
      });
    }
  }

  /**
   * Track search analytics
   */
  async trackSearchAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = req.body;

      await this.enhancedSearchService.trackSearchAnalytics(analytics);

      res.json({ success: true });
    } catch (error) {
      console.error('Track search analytics error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to track search analytics' 
      });
    }
  }

  /**
   * Track click-through for improving search relevance
   */
  async trackClickThrough(req: Request, res: Response): Promise<void> {
    try {
      const { query, resultType, resultId, position, userId, timestamp, sessionId } = req.body;

      await this.enhancedSearchService.trackClickThrough(
        query,
        resultType,
        resultId,
        position,
        userId,
        timestamp,
        sessionId
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Track click-through error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to track click-through' 
      });
    }
  }
}