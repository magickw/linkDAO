/**
 * Enhanced Search Interface Component
 * Implements advanced search with filters, suggestions, and real-time results
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  Hash,
  Users,
  MessageSquare,
  TrendingUp,
  Clock,
  Globe,
  Bookmark,
  Star,
  Zap,
  ChevronDown,
  History,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';
import { GlassPanel } from '@/design-system';

interface SearchSuggestion {
  id: string;
  type: 'hashtag' | 'user' | 'community' | 'post' | 'recent';
  title: string;
  subtitle?: string;
  avatar?: string;
  verified?: boolean;
  count?: number;
  trending?: boolean;
}

interface SearchFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  count?: number;
}

interface EnhancedSearchInterfaceProps {
  onSearch: (query: string, filters: string[]) => void;
  onSuggestionClick: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  autoFocus?: boolean;
}

export default function EnhancedSearchInterface({
  onSearch,
  onSuggestionClick,
  placeholder = "Search posts, hashtags, users, and communities...",
  className = '',
  showFilters = true,
  autoFocus = false
}: EnhancedSearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<SearchFilter[]>([
    {
      id: 'all',
      label: 'All',
      icon: <Globe className="w-4 h-4" />,
      active: true,
      count: 1250
    },
    {
      id: 'posts',
      label: 'Posts',
      icon: <MessageSquare className="w-4 h-4" />,
      active: false,
      count: 890
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="w-4 h-4" />,
      active: false,
      count: 156
    },
    {
      id: 'hashtags',
      label: 'Hashtags',
      icon: <Hash className="w-4 h-4" />,
      active: false,
      count: 78
    },
    {
      id: 'communities',
      label: 'Communities',
      icon: <Star className="w-4 h-4" />,
      active: false,
      count: 23
    }
  ]);

  // Mock suggestions data
  const suggestions: SearchSuggestion[] = [
    {
      id: '1',
      type: 'hashtag',
      title: '#DeFiSummer',
      subtitle: '12.5K posts',
      trending: true,
      count: 12500
    },
    {
      id: '2',
      type: 'user',
      title: 'vitalik.eth',
      subtitle: 'Ethereum Founder',
      avatar: 'https://placehold.co/32',
      verified: true
    },
    {
      id: '3',
      type: 'community',
      title: 'DeFi Protocols',
      subtitle: '15.2K members',
      avatar: 'https://placehold.co/32'
    },
    {
      id: '4',
      type: 'post',
      title: 'New yield farming strategy on Arbitrum',
      subtitle: 'by alexj • 2h ago'
    }
  ];

  const filteredSuggestions = query.length > 0 
    ? suggestions.filter(s => 
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        (s.subtitle && s.subtitle.toLowerCase().includes(query.toLowerCase()))
      )
    : suggestions.slice(0, 6);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    
    // Trigger search with debounce
    if (value.length > 2) {
      const activeFilters = filters.filter(f => f.active).map(f => f.id);
      onSearch(value, activeFilters);
    }
  };

  const handleInputFocus = () => {
    setIsExpanded(true);
    setShowSuggestions(true);
  };

  const handleFilterToggle = (filterId: string) => {
    setFilters(prev => prev.map(filter => ({
      ...filter,
      active: filterId === 'all' ? filterId === filter.id : 
              filterId === filter.id ? !filter.active : 
              filterId !== 'all' && filter.id === 'all' ? false : filter.active
    })));
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'recent') {
      setQuery(suggestion.title);
    } else {
      onSuggestionClick(suggestion);
    }
    setShowSuggestions(false);
    
    // Add to recent searches
    if (!recentSearches.includes(suggestion.title)) {
      setRecentSearches(prev => [suggestion.title, ...prev.slice(0, 4)]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const activeFilters = filters.filter(f => f.active).map(f => f.id);
      onSearch(query.trim(), activeFilters);
      setShowSuggestions(false);
      
      // Add to recent searches
      if (!recentSearches.includes(query.trim())) {
        setRecentSearches(prev => [query.trim(), ...prev.slice(0, 4)]);
      }
    }
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'hashtag': return <Hash className="w-4 h-4 text-primary-500" />;
      case 'user': return <Users className="w-4 h-4 text-blue-500" />;
      case 'community': return <Star className="w-4 h-4 text-purple-500" />;
      case 'post': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'recent': return <History className="w-4 h-4 text-gray-400" />;
      default: return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <motion.div
        animate={{
          scale: isExpanded ? 1.02 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <GlassPanel className={`p-0 overflow-hidden transition-all duration-300 ${
          isExpanded ? 'shadow-lg ring-2 ring-primary-500/20' : 'shadow-sm'
        }`}>
          {/* Search Input */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center">
              <div className="flex items-center flex-1 px-4 py-3">
                <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                
                {query && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showFilters && (
                <div className="flex items-center space-x-2 px-4 border-l border-gray-200/50 dark:border-gray-700/50">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`p-2 rounded-lg transition-colors ${
                      showAdvancedFilters
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Filters */}
            {showFilters && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200/50 dark:border-gray-700/50 p-4"
              >
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => handleFilterToggle(filter.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter.active
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      {filter.icon}
                      <span>{filter.label}</span>
                      {filter.count && (
                        <span className="text-xs opacity-75">
                          {filter.count > 1000 ? `${(filter.count / 1000).toFixed(1)}K` : filter.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </form>
        </GlassPanel>
      </motion.div>

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && (isExpanded || query.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <GlassPanel className="p-0 overflow-hidden max-h-96 overflow-y-auto">
              {/* Recent Searches */}
              {query.length === 0 && recentSearches.length > 0 && (
                <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <History className="w-4 h-4 mr-2 text-gray-400" />
                    Recent Searches
                  </h4>
                  <div className="space-y-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionSelect({ 
                          id: `recent-${index}`, 
                          type: 'recent', 
                          title: search 
                        })}
                        className="flex items-center justify-between w-full p-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center space-x-2">
                          <History className="w-4 h-4 text-gray-400" />
                          <span>{search}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              {query.length === 0 && (
                <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-orange-500" />
                    Trending
                  </h4>
                  <div className="space-y-2">
                    {suggestions.filter(s => s.trending).map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="flex items-center justify-between w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          {getSuggestionIcon(suggestion.type)}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {suggestion.title}
                            </p>
                            {suggestion.subtitle && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {suggestion.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Zap className="w-3 h-3 text-orange-500" />
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {query.length > 0 && (
                <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          {suggestion.avatar ? (
                            <div className="relative">
                              <img
                                src={suggestion.avatar}
                                alt={suggestion.title}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              {suggestion.verified && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ) : (
                            getSuggestionIcon(suggestion.type)
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {suggestion.title}
                            </p>
                            {suggestion.subtitle && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {suggestion.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {suggestion.trending && (
                            <div className="flex items-center space-x-1 text-orange-500">
                              <TrendingUp className="w-3 h-3" />
                              <span className="text-xs font-medium">Hot</span>
                            </div>
                          )}
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No results found for "{query}"
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Try adjusting your search or filters
                      </p>
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
}