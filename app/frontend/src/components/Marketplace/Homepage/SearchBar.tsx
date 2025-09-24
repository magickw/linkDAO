/**
 * SearchBar Component - Enhanced auto-suggest search with Web3 features
 * Provides intelligent search functionality for products, NFTs, services, sellers, and ENS names
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, User, Package, Palette, Zap, Tag, ExternalLink } from 'lucide-react';
import { designTokens } from '@/design-system/tokens';
import { GlassPanel } from '@/design-system/components/GlassPanel';

interface SearchSuggestion {
  id: string;
  title: string;
  type: 'product' | 'nft' | 'service' | 'category' | 'seller' | 'wallet' | 'ens' | 'recent';
  category?: string;
  image?: string;
  price?: string;
  seller?: {
    name: string;
    avatar: string;
    verified: boolean;
    reputation: number;
  };
  metadata?: {
    chain?: string;
    tokenId?: string;
    collection?: string;
    walletAddress?: string;
    ensName?: string;
    lastSearched?: Date;
  };
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  showRecentSearches?: boolean;
  maxSuggestions?: number;
  className?: string;
}

interface SearchCache {
  [key: string]: {
    suggestions: SearchSuggestion[];
    timestamp: number;
  };
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search products, NFTs, services, sellers, or paste wallet address...",
  onSearch,
  onSuggestionSelect,
  showRecentSearches = true,
  maxSuggestions = 8,
  className = "",
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<SearchCache>({});

  // Enhanced mock suggestions with Web3 features
  const mockSuggestions: SearchSuggestion[] = [
    {
      id: '1',
      title: 'Ethereum NFT Collection',
      type: 'nft',
      category: 'Art',
      price: '0.5 ETH',
      seller: { name: 'CryptoArtist', avatar: '/avatars/artist1.jpg', verified: true, reputation: 4.8 },
      metadata: { chain: 'ethereum', collection: 'Bored Apes', tokenId: '1234' }
    },
    {
      id: '2',
      title: 'Web3 Development Services',
      type: 'service',
      category: 'Development',
      seller: { name: 'BlockchainDev', avatar: '/avatars/dev1.jpg', verified: true, reputation: 4.9 }
    },
    {
      id: '3',
      title: 'Crypto Hardware Wallet',
      type: 'product',
      category: 'Hardware',
      price: '$120',
      seller: { name: 'SecureStore', avatar: '/avatars/store1.jpg', verified: true, reputation: 4.7 }
    },
    {
      id: '4',
      title: 'vitalik.eth',
      type: 'ens',
      metadata: { ensName: 'vitalik.eth', walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' }
    },
    {
      id: '5',
      title: '0x742d35Cc6635C0532925a3b8D332Cc',
      type: 'wallet',
      metadata: { walletAddress: '0x742d35Cc6635C0532925a3b8D332Cc' }
    },
    {
      id: '6',
      title: 'Rare Digital Art',
      type: 'nft',
      category: 'Art',
      price: '2.1 ETH',
      seller: { name: 'DigitalMaster', avatar: '/avatars/artist2.jpg', verified: true, reputation: 4.6 },
      metadata: { chain: 'polygon', collection: 'Digital Masters', tokenId: '567' }
    },
    {
      id: '7',
      title: 'Blockchain Books',
      type: 'product',
      category: 'Education',
      price: '$45',
      seller: { name: 'EduHub', avatar: '/avatars/edu1.jpg', verified: true, reputation: 4.5 }
    },
    {
      id: '8',
      title: 'DeFi Consulting',
      type: 'service',
      category: 'Consulting',
      seller: { name: 'DeFiExpert', avatar: '/avatars/consultant1.jpg', verified: true, reputation: 5.0 }
    }
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('marketplace_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((suggestion: SearchSuggestion) => {
    try {
      const updated = [
        { ...suggestion, type: 'recent' as const, metadata: { ...suggestion.metadata, lastSearched: new Date() } },
        ...recentSearches.filter(item => item.id !== suggestion.id).slice(0, 4)
      ];
      setRecentSearches(updated);
      localStorage.setItem('marketplace_recent_searches', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  }, [recentSearches]);

  // Enhanced search with caching and Web3 detection
  const performSearch = useCallback(async (searchQuery: string): Promise<SearchSuggestion[]> => {
    // Check cache first
    const cacheKey = searchQuery.toLowerCase();
    const cached = cacheRef.current[cacheKey];
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes

    if (cached && Date.now() - cached.timestamp < cacheExpiry) {
      return cached.suggestions;
    }

    let results: SearchSuggestion[] = [];

    // Detect wallet address (0x followed by 40 hex chars)
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (walletRegex.test(searchQuery)) {
      results.push({
        id: `wallet-${searchQuery}`,
        title: searchQuery,
        type: 'wallet',
        metadata: { walletAddress: searchQuery }
      });
    }

    // Detect ENS name (.eth suffix)
    if (searchQuery.endsWith('.eth')) {
      results.push({
        id: `ens-${searchQuery}`,
        title: searchQuery,
        type: 'ens',
        metadata: { ensName: searchQuery }
      });
    }

    // Filter regular suggestions
    const filtered = mockSuggestions.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    results = [...results, ...filtered];

    // Cache the results
    cacheRef.current[cacheKey] = {
      suggestions: results,
      timestamp: Date.now()
    };

    return results.slice(0, maxSuggestions);
  }, [maxSuggestions]);

  // Enhanced search with debouncing and keyboard support
  useEffect(() => {
    if (query.length === 0) {
      // Show recent searches when query is empty and input is focused
      if (showRecentSearches && recentSearches.length > 0 && isOpen) {
        setSuggestions(recentSearches);
      } else {
        setSuggestions([]);
      }
      setIsLoading(false);
      return;
    }

    if (query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await performSearch(query);
        setSuggestions(results);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search failed:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch, showRecentSearches, recentSearches, isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedSuggestion = suggestions[selectedIndex];
          handleSuggestionClick(selectedSuggestion);
        } else if (query.trim()) {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, suggestions, selectedIndex, query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    setIsOpen(false);
    setSelectedIndex(-1);

    // Save to recent searches (except if it's already a recent search)
    if (suggestion.type !== 'recent') {
      saveRecentSearch(suggestion);
    }

    // Handle different suggestion types
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    } else if (onSearch) {
      onSearch(suggestion.title);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      setSelectedIndex(-1);
      if (onSearch) {
        onSearch(query.trim());
      }
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('marketplace_recent_searches');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return <Package size={16} className="text-blue-400" />;
      case 'nft': return <Palette size={16} className="text-purple-400" />;
      case 'service': return <Zap size={16} className="text-green-400" />;
      case 'category': return <Tag size={16} className="text-yellow-400" />;
      case 'seller': return <User size={16} className="text-orange-400" />;
      case 'wallet': return <ExternalLink size={16} className="text-gray-400" />;
      case 'ens': return <ExternalLink size={16} className="text-blue-300" />;
      case 'recent': return <Clock size={16} className="text-gray-400" />;
      default: return <Search size={16} className="text-gray-400" />;
    }
  };

  const getChainIcon = (chain?: string) => {
    switch (chain) {
      case 'ethereum': return '🔷';
      case 'polygon': return '🟣';
      case 'arbitrum': return '🔵';
      case 'optimism': return '🔴';
      default: return '';
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full md:w-96 px-4 py-3 pl-12 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
          />

          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-white/60" />
          </div>

          {/* Loading Spinner or Clear Button */}
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                className="h-5 w-5 text-white/60 hover:text-white transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Enhanced Search Suggestions Dropdown */}
      <AnimatePresence>
        {isOpen && (suggestions.length > 0 || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-3 z-50"
          >
            <GlassPanel
              variant="modal"
              className="max-h-96 overflow-hidden border border-white/10"
            >
              {isLoading ? (
                <div className="p-6 text-center text-white/60">
                  <div className="flex items-center justify-center space-x-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span>Searching across marketplace...</span>
                  </div>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {/* Recent Searches Header */}
                  {query.length === 0 && recentSearches.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <span className="text-sm font-medium text-white/70">Recent Searches</span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-white/50 hover:text-white/70 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  )}

                  {/* Suggestions List */}
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={`flex items-center px-4 py-3 cursor-pointer transition-colors group relative ${
                        selectedIndex === index
                          ? 'bg-white/20'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      {/* Type Icon */}
                      <div className="mr-3 flex-shrink-0">
                        {getTypeIcon(suggestion.type)}
                      </div>

                      {/* Suggestion Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate group-hover:text-blue-200 transition-colors">
                              {suggestion.type === 'wallet' && suggestion.metadata?.walletAddress
                                ? formatWalletAddress(suggestion.metadata.walletAddress)
                                : suggestion.title
                              }
                            </p>

                            {/* Enhanced metadata display */}
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs font-medium text-white/50 uppercase tracking-wide">
                                {suggestion.type}
                              </span>

                              {/* Chain indicator for NFTs */}
                              {suggestion.metadata?.chain && (
                                <>
                                  <span className="text-white/30">•</span>
                                  <span className="text-xs text-white/60 flex items-center gap-1">
                                    {getChainIcon(suggestion.metadata.chain)}
                                    {suggestion.metadata.chain}
                                  </span>
                                </>
                              )}

                              {/* Category */}
                              {suggestion.category && (
                                <>
                                  <span className="text-white/30">•</span>
                                  <span className="text-xs text-white/60">{suggestion.category}</span>
                                </>
                              )}

                              {/* Collection for NFTs */}
                              {suggestion.metadata?.collection && (
                                <>
                                  <span className="text-white/30">•</span>
                                  <span className="text-xs text-white/60">{suggestion.metadata.collection}</span>
                                </>
                              )}
                            </div>

                            {/* Seller information */}
                            {suggestion.seller && (
                              <div className="flex items-center space-x-2 mt-1">
                                <img
                                  src={suggestion.seller.avatar}
                                  alt={suggestion.seller.name}
                                  className="w-4 h-4 rounded-full"
                                />
                                <span className="text-xs text-white/70">{suggestion.seller.name}</span>
                                {suggestion.seller.verified && (
                                  <span className="text-xs">✅</span>
                                )}
                                <span className="text-xs text-yellow-400">
                                  ⭐ {suggestion.seller.reputation}
                                </span>
                              </div>
                            )}

                            {/* ENS/Wallet metadata */}
                            {suggestion.type === 'ens' && suggestion.metadata?.walletAddress && (
                              <div className="text-xs text-white/50 mt-1">
                                {formatWalletAddress(suggestion.metadata.walletAddress)}
                              </div>
                            )}
                          </div>

                          {/* Price */}
                          {suggestion.price && (
                            <div className="ml-3 flex-shrink-0">
                              <span className="text-green-400 font-bold text-sm">
                                {suggestion.price}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Arrow */}
                      <div className="ml-3 flex-shrink-0">
                        {suggestion.type === 'wallet' || suggestion.type === 'ens' ? (
                          <ExternalLink className="h-4 w-4 text-white/40 group-hover:text-white/60 transition-colors" />
                        ) : (
                          <svg className="h-4 w-4 text-white/40 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* No results found */}
                  {!isLoading && suggestions.length === 0 && query.length >= 2 && (
                    <div className="px-4 py-8 text-center text-white/60">
                      <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p>No results found for "{query}"</p>
                      <p className="text-sm text-white/40 mt-1">Try different keywords or check spelling</p>
                    </div>
                  )}
                </div>
              )}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};