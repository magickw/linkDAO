import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Import components
import { GlobalSearchInterface } from '@/components/Search/GlobalSearchInterface';
import { EnhancedSearchInterface } from '@/components/EnhancedSearch/EnhancedSearchInterface';
import { DiscoveryDashboard } from '@/components/EnhancedSearch/DiscoveryDashboard';
import { SearchResults } from '@/components/Search/SearchResults';

// Import services
import * as globalSearchService from '@/services/globalSearchService';
import * as enhancedSearchService from '@/services/enhancedSearchService';
import * as userActivityService from '@/services/userActivityService';

// Test providers
import { TestProviders } from '@/__tests__/setup/testSetup';

// Mock services
jest.mock('@/services/globalSearchService');
jest.mock('@/services/enhancedSearchService');
jest.mock('@/services/userActivityService');

const mockGlobalSearchService = globalSearchService as jest.Mocked<typeof globalSearchService>;
const mockEnhancedSearchService = enhancedSearchService as jest.Mocked<typeof enhancedSearchService>;
const mockUserActivityService = userActivityService as jest.Mocked<typeof userActivityService>;

describe('Search Functionality Integration Tests', () => {
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    walletAddress: '0x123456789abcdef',
    searchHistory: ['DeFi', 'NFT', 'Web3'],
    preferences: {
      searchFilters: {
        includeTypes: ['posts', 'communities', 'users'],
        sortBy: 'relevance',
        timeRange: 'all'
      }
    }
  };

  const mockSearchResults = {
    posts: [
      {
        id: 'post-1',
        author: { username: 'defiexpert', walletAddress: '0xdefi123' },
        content: 'Complete guide to DeFi yield farming strategies and best practices',
        communityId: 'defi-community',
        tags: ['DeFi', 'yield-farming', 'strategies'],
        reactions: { fire: 25, heart: 12 },
        createdAt: new Date('2024-01-15'),
        relevanceScore: 0.95
      },
      {
        id: 'post-2',
        author: { username: 'cryptoanalyst', walletAddress: '0xcrypto456' },
        content: 'DeFi protocol comparison: Uniswap vs Compound vs Aave',
        communityId: 'defi-community',
        tags: ['DeFi', 'protocols', 'comparison'],
        reactions: { fire: 18, rocket: 8 },
        createdAt: new Date('2024-01-10'),
        relevanceScore: 0.87
      }
    ],
    communities: [
      {
        id: 'defi-community',
        name: 'defi-discussion',
        displayName: 'DeFi Discussion',
        description: 'Community for discussing DeFi protocols, strategies, and news',
        memberCount: 1250,
        tags: ['DeFi', 'finance', 'protocols'],
        isPublic: true,
        relevanceScore: 0.92
      },
      {
        id: 'yield-community',
        name: 'yield-farming',
        displayName: 'Yield Farming Hub',
        description: 'Dedicated to yield farming strategies and opportunities',
        memberCount: 850,
        tags: ['yield-farming', 'DeFi', 'strategies'],
        isPublic: true,
        relevanceScore: 0.78
      }
    ],
    users: [
      {
        id: 'user-defi-expert',
        username: 'defiexpert',
        walletAddress: '0xdefi123',
        bio: 'DeFi researcher and yield farming specialist',
        reputation: { totalScore: 2500, level: 'Expert' },
        badges: [{ name: 'DeFi Pioneer', rarity: 'legendary' }],
        relevanceScore: 0.89
      },
      {
        id: 'user-protocol-dev',
        username: 'protocoldev',
        walletAddress: '0xprotocol789',
        bio: 'Building the future of DeFi protocols',
        reputation: { totalScore: 3200, level: 'Master' },
        badges: [{ name: 'Protocol Builder', rarity: 'epic' }],
        relevanceScore: 0.85
      }
    ],
    hashtags: [
      { tag: 'DeFi', count: 1250, trending: true },
      { tag: 'yield-farming', count: 450, trending: false },
      { tag: 'protocols', count: 320, trending: false }
    ],
    totalResults: 4,
    searchTime: 0.045
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockGlobalSearchService.searchAll.mockResolvedValue(mockSearchResults);
    mockEnhancedSearchService.getSearchSuggestions.mockResolvedValue([
      'DeFi protocols',
      'DeFi yield farming',
      'DeFi strategies'
    ]);
    mockUserActivityService.trackSearchQuery.mockResolvedValue({ success: true });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <TestProviders initialUser={mockUser}>
        {component}
      </TestProviders>
    );
  };

  describe('Global Search Functionality', () => {
    it('should perform comprehensive search across all content types', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<GlobalSearchInterface />);
      
      // Enter search query
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'DeFi');
      
      // Submit search
      await user.press('Enter');
      
      // Verify search service is called with correct parameters
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'DeFi',
          filters: {
            includeTypes: ['posts', 'communities', 'users'],
            sortBy: 'relevance',
            timeRange: 'all'
          },
          userId: mockUser.id
        });
      });
      
      // Verify search results are displayed
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
      
      // Verify posts section
      const postsSection = screen.getByTestId('search-results-posts');
      expect(within(postsSection).getByText('Complete guide to DeFi yield farming strategies')).toBeInTheDocument();
      expect(within(postsSection).getByText('DeFi protocol comparison: Uniswap vs Compound')).toBeInTheDocument();
      
      // Verify communities section
      const communitiesSection = screen.getByTestId('search-results-communities');
      expect(within(communitiesSection).getByText('DeFi Discussion')).toBeInTheDocument();
      expect(within(communitiesSection).getByText('Yield Farming Hub')).toBeInTheDocument();
      
      // Verify users section
      const usersSection = screen.getByTestId('search-results-users');
      expect(within(usersSection).getByText('defiexpert')).toBeInTheDocument();
      expect(within(usersSection).getByText('protocoldev')).toBeInTheDocument();
      
      // Verify search analytics tracking
      expect(mockUserActivityService.trackSearchQuery).toHaveBeenCalledWith({
        userId: mockUser.id,
        query: 'DeFi',
        resultsCount: 4,
        searchTime: 0.045
      });
    });

    it('should provide search suggestions and autocomplete', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      
      // Start typing
      await user.type(searchInput, 'DeF');
      
      // Verify suggestions are requested
      await waitFor(() => {
        expect(mockEnhancedSearchService.getSearchSuggestions).toHaveBeenCalledWith({
          query: 'DeF',
          userId: mockUser.id,
          limit: 5
        });
      });
      
      // Verify suggestions appear
      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
        expect(screen.getByText('DeFi protocols')).toBeInTheDocument();
        expect(screen.getByText('DeFi yield farming')).toBeInTheDocument();
        expect(screen.getByText('DeFi strategies')).toBeInTheDocument();
      });
      
      // Click on a suggestion
      const suggestion = screen.getByText('DeFi protocols');
      await user.click(suggestion);
      
      // Verify search input is updated and search is performed
      expect(searchInput).toHaveValue('DeFi protocols');
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'DeFi protocols',
          filters: expect.any(Object),
          userId: mockUser.id
        });
      });
    });

    it('should handle search filters and sorting options', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<GlobalSearchInterface />);
      
      // Perform initial search
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'blockchain');
      await user.press('Enter');
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
      
      // Apply content type filter
      const postsOnlyFilter = screen.getByTestId('filter-posts-only');
      await user.click(postsOnlyFilter);
      
      // Verify filtered search
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'blockchain',
          filters: {
            includeTypes: ['posts'],
            sortBy: 'relevance',
            timeRange: 'all'
          },
          userId: mockUser.id
        });
      });
      
      // Change sorting option
      const sortByDate = screen.getByTestId('sort-by-date');
      await user.click(sortByDate);
      
      // Verify sort parameter
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'blockchain',
          filters: {
            includeTypes: ['posts'],
            sortBy: 'date',
            timeRange: 'all'
          },
          userId: mockUser.id
        });
      });
      
      // Apply time range filter
      const lastWeekFilter = screen.getByTestId('time-range-week');
      await user.click(lastWeekFilter);
      
      // Verify time range parameter
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'blockchain',
          filters: {
            includeTypes: ['posts'],
            sortBy: 'date',
            timeRange: 'week'
          },
          userId: mockUser.id
        });
      });
    });

    it('should maintain search history and provide quick access', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      
      // Click on search input to show history
      await user.click(searchInput);
      
      // Verify search history appears
      await waitFor(() => {
        expect(screen.getByTestId('search-history')).toBeInTheDocument();
        expect(screen.getByText('DeFi')).toBeInTheDocument();
        expect(screen.getByText('NFT')).toBeInTheDocument();
        expect(screen.getByText('Web3')).toBeInTheDocument();
      });
      
      // Click on a previous search
      const previousSearch = screen.getByText('NFT');
      await user.click(previousSearch);
      
      // Verify search is performed
      expect(searchInput).toHaveValue('NFT');
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'NFT',
          filters: expect.any(Object),
          userId: mockUser.id
        });
      });
      
      // Perform a new search to update history
      await user.clear(searchInput);
      await user.type(searchInput, 'governance');
      await user.press('Enter');
      
      // Verify history is updated
      await waitFor(() => {
        expect(mockUserActivityService.updateSearchHistory).toHaveBeenCalledWith({
          userId: mockUser.id,
          query: 'governance'
        });
      });
    });
  });

  describe('Search Result Accuracy and Relevance', () => {
    it('should rank results by relevance score', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<SearchResults />);
      
      // Perform search
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'DeFi');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
      
      // Verify posts are ordered by relevance score
      const postResults = screen.getAllByTestId(/^post-result-/);
      expect(postResults).toHaveLength(2);
      
      // First result should have higher relevance score (0.95)
      expect(within(postResults[0]).getByText('Complete guide to DeFi yield farming strategies')).toBeInTheDocument();
      
      // Second result should have lower relevance score (0.87)
      expect(within(postResults[1]).getByText('DeFi protocol comparison: Uniswap vs Compound')).toBeInTheDocument();
      
      // Verify relevance indicators
      expect(within(postResults[0]).getByTestId('relevance-score')).toHaveTextContent('95%');
      expect(within(postResults[1]).getByTestId('relevance-score')).toHaveTextContent('87%');
    });

    it('should highlight search terms in results', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<SearchResults />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'yield farming');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
      
      // Verify search terms are highlighted
      const postResult = screen.getByTestId('post-result-post-1');
      const highlightedTerms = within(postResult).getAllByTestId('highlighted-term');
      
      expect(highlightedTerms).toHaveLength(2); // "yield" and "farming"
      expect(highlightedTerms[0]).toHaveTextContent('yield');
      expect(highlightedTerms[1]).toHaveTextContent('farming');
      
      // Verify highlighting styling
      highlightedTerms.forEach(term => {
        expect(term).toHaveClass('search-highlight');
      });
    });

    it('should provide contextual snippets for search results', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<SearchResults />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'strategies');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
      
      // Verify contextual snippets are shown
      const postResult = screen.getByTestId('post-result-post-1');
      const snippet = within(postResult).getByTestId('result-snippet');
      
      // Should show relevant portion of content around search term
      expect(snippet).toHaveTextContent('...DeFi yield farming strategies and best practices...');
      
      // Verify snippet length is appropriate
      const snippetText = snippet.textContent || '';
      expect(snippetText.length).toBeLessThan(200); // Reasonable snippet length
      expect(snippetText.length).toBeGreaterThan(50); // Sufficient context
    });

    it('should handle typos and fuzzy matching', async () => {
      const user = userEvent.setup();
      
      // Mock fuzzy search results
      const fuzzyResults = {
        ...mockSearchResults,
        query: 'defi', // Original query with typo
        correctedQuery: 'DeFi', // Suggested correction
        fuzzyMatch: true
      };
      
      mockGlobalSearchService.searchAll.mockResolvedValue(fuzzyResults);
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'defi'); // Lowercase, potential typo
      await user.press('Enter');
      
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
      
      // Verify "did you mean" suggestion
      expect(screen.getByTestId('search-suggestion')).toBeInTheDocument();
      expect(screen.getByText('Did you mean: DeFi?')).toBeInTheDocument();
      
      // Click on suggestion
      const suggestionLink = screen.getByText('DeFi');
      await user.click(suggestionLink);
      
      // Verify corrected search is performed
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'DeFi',
          filters: expect.any(Object),
          userId: mockUser.id
        });
      });
    });

    it('should provide semantic search capabilities', async () => {
      const user = userEvent.setup();
      
      // Mock semantic search results
      const semanticResults = {
        posts: [
          {
            id: 'semantic-post-1',
            content: 'Automated market makers and liquidity pools explained',
            semanticMatch: true,
            relevanceScore: 0.82
          }
        ],
        semanticQuery: true,
        originalQuery: 'AMM',
        expandedTerms: ['automated market maker', 'liquidity pools', 'DEX']
      };
      
      mockGlobalSearchService.searchAll.mockResolvedValue(semanticResults);
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'AMM');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
      
      // Verify semantic expansion notice
      expect(screen.getByTestId('semantic-expansion')).toBeInTheDocument();
      expect(screen.getByText('Also searching for: automated market maker, liquidity pools, DEX')).toBeInTheDocument();
      
      // Verify semantically related results
      expect(screen.getByText('Automated market makers and liquidity pools explained')).toBeInTheDocument();
      
      // Verify semantic match indicator
      const semanticResult = screen.getByTestId('post-result-semantic-post-1');
      expect(within(semanticResult).getByTestId('semantic-match-indicator')).toBeInTheDocument();
    });
  });

  describe('Advanced Search Features', () => {
    it('should support boolean search operators', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      
      // Test AND operator
      await user.type(searchInput, 'DeFi AND yield');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'DeFi AND yield',
          filters: expect.any(Object),
          userId: mockUser.id,
          searchType: 'boolean'
        });
      });
      
      // Test OR operator
      await user.clear(searchInput);
      await user.type(searchInput, 'NFT OR token');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'NFT OR token',
          filters: expect.any(Object),
          userId: mockUser.id,
          searchType: 'boolean'
        });
      });
      
      // Test NOT operator
      await user.clear(searchInput);
      await user.type(searchInput, 'crypto NOT bitcoin');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'crypto NOT bitcoin',
          filters: expect.any(Object),
          userId: mockUser.id,
          searchType: 'boolean'
        });
      });
    });

    it('should support field-specific search', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      
      // Search by author
      await user.type(searchInput, 'author:defiexpert');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'author:defiexpert',
          filters: expect.any(Object),
          userId: mockUser.id,
          searchType: 'field_specific'
        });
      });
      
      // Search by tag
      await user.clear(searchInput);
      await user.type(searchInput, 'tag:yield-farming');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'tag:yield-farming',
          filters: expect.any(Object),
          userId: mockUser.id,
          searchType: 'field_specific'
        });
      });
      
      // Search by community
      await user.clear(searchInput);
      await user.type(searchInput, 'community:defi-discussion');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'community:defi-discussion',
          filters: expect.any(Object),
          userId: mockUser.id,
          searchType: 'field_specific'
        });
      });
    });

    it('should provide search analytics and insights', async () => {
      const user = userEvent.setup();
      
      const searchAnalytics = {
        popularQueries: [
          { query: 'DeFi', count: 1250, trend: 'up' },
          { query: 'NFT', count: 980, trend: 'stable' },
          { query: 'Web3', count: 750, trend: 'down' }
        ],
        trendingTopics: ['yield-farming', 'governance', 'layer2'],
        userSearchPatterns: {
          mostSearchedCategories: ['posts', 'communities'],
          averageResultsClicked: 2.3,
          searchSuccessRate: 0.87
        }
      };
      
      mockEnhancedSearchService.getSearchAnalytics.mockResolvedValue(searchAnalytics);
      
      renderWithProviders(<DiscoveryDashboard />);
      
      // Wait for analytics to load
      await waitFor(() => {
        expect(screen.getByTestId('search-analytics')).toBeInTheDocument();
      });
      
      // Verify popular queries
      const popularQueries = screen.getByTestId('popular-queries');
      expect(within(popularQueries).getByText('DeFi')).toBeInTheDocument();
      expect(within(popularQueries).getByText('1,250 searches')).toBeInTheDocument();
      expect(within(popularQueries).getByTestId('trend-up')).toBeInTheDocument();
      
      // Verify trending topics
      const trendingTopics = screen.getByTestId('trending-topics');
      expect(within(trendingTopics).getByText('#yield-farming')).toBeInTheDocument();
      expect(within(trendingTopics).getByText('#governance')).toBeInTheDocument();
      expect(within(trendingTopics).getByText('#layer2')).toBeInTheDocument();
      
      // Click on trending topic to search
      const trendingTopic = within(trendingTopics).getByText('#yield-farming');
      await user.click(trendingTopic);
      
      // Verify search is performed
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'yield-farming',
          filters: expect.any(Object),
          userId: mockUser.id
        });
      });
    });
  });

  describe('Search Performance and Error Handling', () => {
    it('should handle search service failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock search service failure
      mockGlobalSearchService.searchAll.mockRejectedValue(
        new Error('Search service unavailable')
      );
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'test query');
      await user.press('Enter');
      
      // Verify error handling
      await waitFor(() => {
        expect(screen.getByTestId('search-error')).toBeInTheDocument();
        expect(screen.getByText('Search temporarily unavailable. Please try again.')).toBeInTheDocument();
      });
      
      // Verify retry option
      const retryButton = screen.getByTestId('retry-search');
      expect(retryButton).toBeInTheDocument();
      
      // Test retry functionality
      mockGlobalSearchService.searchAll.mockResolvedValue(mockSearchResults);
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
    });

    it('should show loading states during search', async () => {
      const user = userEvent.setup();
      
      // Mock slow search response
      mockGlobalSearchService.searchAll.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSearchResults), 1000))
      );
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'loading test');
      await user.press('Enter');
      
      // Verify loading state
      expect(screen.getByTestId('search-loading')).toBeInTheDocument();
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      
      // Verify search input is disabled during search
      expect(searchInput).toBeDisabled();
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Verify loading state is cleared
      expect(screen.queryByTestId('search-loading')).not.toBeInTheDocument();
      expect(searchInput).not.toBeDisabled();
    });

    it('should handle empty search results appropriately', async () => {
      const user = userEvent.setup();
      
      // Mock empty results
      mockGlobalSearchService.searchAll.mockResolvedValue({
        posts: [],
        communities: [],
        users: [],
        hashtags: [],
        totalResults: 0,
        searchTime: 0.023
      });
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'nonexistentquery123');
      await user.press('Enter');
      
      await waitFor(() => {
        expect(screen.getByTestId('no-results')).toBeInTheDocument();
      });
      
      // Verify helpful no results message
      expect(screen.getByText('No results found for "nonexistentquery123"')).toBeInTheDocument();
      
      // Verify search suggestions
      expect(screen.getByText('Try different keywords or check your spelling')).toBeInTheDocument();
      expect(screen.getByText('Use broader terms')).toBeInTheDocument();
      expect(screen.getByText('Browse trending topics')).toBeInTheDocument();
      
      // Verify trending topics are shown as alternatives
      const trendingSection = screen.getByTestId('trending-alternatives');
      expect(trendingSection).toBeInTheDocument();
    });

    it('should debounce search requests to prevent excessive API calls', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      
      // Type rapidly
      await user.type(searchInput, 'a');
      await user.type(searchInput, 'b');
      await user.type(searchInput, 'c');
      await user.type(searchInput, 'd');
      await user.type(searchInput, 'e');
      
      // Wait for debounce period
      await waitFor(() => {
        expect(mockEnhancedSearchService.getSearchSuggestions).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
      
      // Verify final query
      expect(mockEnhancedSearchService.getSearchSuggestions).toHaveBeenCalledWith({
        query: 'abcde',
        userId: mockUser.id,
        limit: 5
      });
    });
  });
});