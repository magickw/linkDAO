import { SearchService } from '../searchService';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('search', () => {
    it('should perform a comprehensive search', async () => {
      const mockResults = {
        posts: [
          {
            id: '1',
            content: 'Test post about DeFi',
            author: '0x123',
            createdAt: new Date().toISOString(),
            tags: ['defi'],
            reactions: []
          }
        ],
        communities: [
          {
            id: '1',
            name: 'defi-community',
            displayName: 'DeFi Community',
            description: 'A community for DeFi enthusiasts',
            memberCount: 1000,
            createdAt: new Date().toISOString(),
            category: 'Finance',
            tags: ['defi'],
            isPublic: true,
            moderators: [],
            settings: {
              allowedPostTypes: [],
              requireApproval: false,
              minimumReputation: 0,
              stakingRequirements: []
            }
          }
        ],
        users: [],
        hashtags: ['defi', 'web3'],
        totalResults: 1,
        hasMore: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults
      });

      const result = await SearchService.search('defi', {}, 20, 0);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );

      expect(result).toEqual(mockResults);
    });

    it('should handle search errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Search failed' })
      });

      await expect(SearchService.search('test')).rejects.toThrow('Search failed');
    });

    it('should handle network timeouts', async () => {
      // Mock AbortError
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(SearchService.search('test')).rejects.toThrow('Search timeout');
    });
  });

  describe('searchPosts', () => {
    it('should search posts with filters', async () => {
      const mockResults = {
        posts: [
          {
            id: '1',
            content: 'Test post',
            author: '0x123',
            createdAt: new Date().toISOString(),
            tags: ['test'],
            reactions: []
          }
        ],
        hasMore: false,
        total: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults
      });

      const result = await SearchService.searchPosts('test', { timeRange: 'day' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/posts?'),
        expect.any(Object)
      );

      expect(result).toEqual(mockResults);
    });
  });

  describe('searchCommunities', () => {
    it('should search communities with filters', async () => {
      const mockResults = {
        communities: [
          {
            id: '1',
            name: 'test-community',
            displayName: 'Test Community',
            description: 'A test community',
            memberCount: 100,
            createdAt: new Date().toISOString(),
            category: 'Test',
            tags: ['test'],
            isPublic: true,
            moderators: [],
            settings: {
              allowedPostTypes: [],
              requireApproval: false,
              minimumReputation: 0,
              stakingRequirements: []
            }
          }
        ],
        hasMore: false,
        total: 1
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults
      });

      const result = await SearchService.searchCommunities('test', { category: 'Test' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/communities?'),
        expect.any(Object)
      );

      expect(result).toEqual(mockResults);
    });
  });

  describe('getTrendingContent', () => {
    it('should fetch trending content', async () => {
      const mockTrending = {
        posts: [],
        communities: [],
        hashtags: ['defi', 'nft'],
        topics: ['blockchain', 'web3']
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrending
      });

      const result = await SearchService.getTrendingContent('day', 10);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trending?timeRange=day&limit=10'),
        expect.any(Object)
      );

      expect(result).toEqual(mockTrending);
    });
  });

  describe('getTrendingHashtags', () => {
    it('should fetch trending hashtags', async () => {
      const mockHashtags = [
        { tag: 'defi', count: 1000, growth: 15 },
        { tag: 'nft', count: 800, growth: 10 }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHashtags
      });

      const result = await SearchService.getTrendingHashtags('day', 20);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trending/hashtags?timeRange=day&limit=20'),
        expect.any(Object)
      );

      expect(result).toEqual(mockHashtags);
    });
  });

  describe('getRecommendedCommunities', () => {
    it('should fetch recommended communities', async () => {
      const mockCommunities = [
        {
          id: '1',
          name: 'recommended-community',
          displayName: 'Recommended Community',
          description: 'A recommended community',
          memberCount: 500,
          createdAt: new Date().toISOString(),
          category: 'Technology',
          tags: ['tech'],
          isPublic: true,
          moderators: [],
          settings: {
            allowedPostTypes: [],
            requireApproval: false,
            minimumReputation: 0,
            stakingRequirements: []
          }
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommunities
      });

      const result = await SearchService.getRecommendedCommunities({
        userId: '0x123',
        limit: 10,
        basedOn: 'activity'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/recommendations/communities?'),
        expect.any(Object)
      );

      expect(result).toEqual(mockCommunities);
    });
  });

  describe('getPostsByHashtag', () => {
    it('should fetch posts by hashtag', async () => {
      const mockResults = {
        posts: [
          {
            id: '1',
            content: 'Post with #defi hashtag',
            author: '0x123',
            createdAt: new Date().toISOString(),
            tags: ['defi'],
            reactions: []
          }
        ],
        hasMore: false,
        total: 1
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults
      });

      const result = await SearchService.getPostsByHashtag('defi');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/hashtags/defi/posts?'),
        expect.any(Object)
      );

      expect(result).toEqual(mockResults);
    });

    it('should handle hashtags with # prefix', async () => {
      const mockResults = {
        posts: [],
        hasMore: false,
        total: 0
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults
      });

      await SearchService.getPostsByHashtag('#defi');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/hashtags/defi/posts?'),
        expect.any(Object)
      );
    });
  });

  describe('getSearchSuggestions', () => {
    it('should fetch search suggestions', async () => {
      const mockSuggestions = {
        posts: ['defi trading', 'defi protocols'],
        communities: ['defi-traders', 'defi-builders'],
        users: ['defi-expert', 'defi-whale'],
        hashtags: ['defi', 'defisummer']
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestions
      });

      const result = await SearchService.getSearchSuggestions('defi', 'all', 10);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/suggestions?'),
        expect.any(Object)
      );

      expect(result).toEqual(mockSuggestions);
    });

    it('should handle suggestion timeouts gracefully', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      (fetch as jest.Mock).mockRejectedValueOnce(abortError);

      const result = await SearchService.getSearchSuggestions('test');

      expect(result).toEqual({
        posts: [],
        communities: [],
        users: [],
        hashtags: []
      });
    });
  });
});