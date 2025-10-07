/**
 * Real Marketplace Search Component
 * Replaces mock search functionality with real database-driven search
 */

import React, { useState, useEffect, useCallback } from 'react';
import { marketplaceService, MockProduct } from '../../services/unifiedMarketplaceService';
import { debounce } from 'lodash';

interface SearchFilters {
  category?: string;
  priceRange?: { min: number; max: number };
  currency?: string;
  tags?: string[];
  seller?: string;
  condition?: string;
  listingType?: 'FIXED_PRICE' | 'AUCTION';
  verified?: boolean;
  escrowProtected?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'oldest' | 'popular';
}

interface RealMarketplaceSearchProps {
  onResults?: (results: MockProduct[]) => void;
  onLoading?: (loading: boolean) => void;
  initialQuery?: string;
  initialFilters?: SearchFilters;
  showFilters?: boolean;
  placeholder?: string;
  className?: string;
}

export default function RealMarketplaceSearch({
  onResults,
  onLoading,
  initialQuery = '',
  initialFilters = {},
  showFilters = true,
  placeholder = 'Search products...',
  className = ''
}: RealMarketplaceSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<MockProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [popularTerms, setPopularTerms] = useState<Array<{term: string, count: number}>>([]);
  const [categories, setCategories] = useState<Array<{id: string, name: string, slug: string}>>([]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      if (!searchQuery.trim() && Object.keys(searchFilters).length === 0) {
        setResults([]);
        onResults?.([]);
        return;
      }

      setLoading(true);
      onLoading?.(true);

      try {
        const searchResults = await marketplaceService.searchProducts(searchQuery.trim() || '', {
          query: searchQuery.trim() || '',
          ...searchFilters,
          limit: 50
        });

        // Convert to MockProduct format
        const mockProducts = searchResults.map(product => ({
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.priceAmount.toString(),
          currency: product.priceCurrency,
          cryptoPrice: (product.priceAmount / 2400).toFixed(4),
          cryptoSymbol: 'ETH',
          category: product.category?.slug || 'general',
          listingType: 'FIXED_PRICE' as const,
          seller: {
            id: product.seller?.id || product.sellerId,
            name: product.seller?.displayName || 'Unknown Seller',
            rating: product.seller?.rating || 0,
            reputation: product.seller?.reputation || 0,
            verified: product.seller?.verified || false,
            daoApproved: product.seller?.daoApproved || false,
            walletAddress: product.seller?.walletAddress || '',
          },
          trust: product.trust || {
            verified: false,
            escrowProtected: false,
            onChainCertified: false,
            safetyScore: 0,
          },
          images: product.images,
          inventory: product.inventory,
          isNFT: !!product.nft,
          tags: product.tags,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          views: product.views,
          favorites: product.favorites,
        }));

        setResults(mockProducts);
        onResults?.(mockProducts);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        onResults?.([]);
      } finally {
        setLoading(false);
        onLoading?.(false);
      }
    }, 300),
    [onResults, onLoading]
  );

  // Debounced suggestions function
  const debouncedGetSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const suggestionResults = await marketplaceService.getSearchSuggestions(searchQuery.trim());
        setSuggestions(suggestionResults);
      } catch (error) {
        console.error('Suggestions error:', error);
        setSuggestions([]);
      }
    }, 200),
    []
  );

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [categoriesData] = await Promise.all([
          marketplaceService.getCategories()
        ]);

        // Note: Popular search terms would need to be implemented in unified service
        const popularTermsData: Array<{term: string, count: number}> = [];

        setPopularTerms(popularTermsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // Trigger search when query or filters change
  useEffect(() => {
    debouncedSearch(query, filters);
  }, [query, filters, debouncedSearch]);

  // Get suggestions when query changes
  useEffect(() => {
    if (showSuggestions) {
      debouncedGetSuggestions(query);
    }
  }, [query, showSuggestions, debouncedGetSuggestions]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  const handlePopularTermClick = (term: string) => {
    setQuery(term);
    setShowSuggestions(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Search Suggestions */}
      {showSuggestions && (query.length > 0 || popularTerms.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Query Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Suggestions</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Popular Terms */}
          {query.length === 0 && popularTerms.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Popular Searches</div>
              {popularTerms.slice(0, 5).map((term, index) => (
                <button
                  key={index}
                  onClick={() => handlePopularTermClick(term.term)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex justify-between items-center"
                >
                  <span>{term.term}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{term.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange?.min || ''}
                  onChange={(e) => handleFilterChange('priceRange', {
                    ...filters.priceRange,
                    min: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange?.max || ''}
                  onChange={(e) => handleFilterChange('priceRange', {
                    ...filters.priceRange,
                    max: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Listing Type */}
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Listing Type
              </label>
              <select
                value={filters.listingType || ''}
                onChange={(e) => handleFilterChange('listingType', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="FIXED_PRICE">Fixed Price</option>
                <option value="AUCTION">Auction</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy || ''}
                onChange={(e) => handleFilterChange('sortBy', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Relevance</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>

          {/* Filter Toggles */}
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.verified || false}
                onChange={(e) => handleFilterChange('verified', e.target.checked || undefined)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Verified Sellers Only</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.escrowProtected || false}
                onChange={(e) => handleFilterChange('escrowProtected', e.target.checked || undefined)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Escrow Protected</span>
            </label>
          </div>

          {/* Clear Filters */}
          {Object.keys(filters).length > 0 && (
            <div className="mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      {(query || Object.keys(filters).length > 0) && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {loading ? (
            'Searching...'
          ) : (
            `Found ${results.length} product${results.length !== 1 ? 's' : ''}`
          )}
        </div>
      )}
    </div>
  );
}