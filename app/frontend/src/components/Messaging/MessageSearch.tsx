/**
 * Message Search Component
 * Provides advanced search functionality for messages across all conversations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Filter, User, FileText, Image, Clock, ChevronDown, ChevronRight, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/types/messaging';

export interface SearchFilter {
  query: string;
  dateFrom?: Date;
  dateTo?: Date;
  senderAddress?: string;
  contentTypes?: Array<'text' | 'image' | 'file' | 'post_share'>;
  conversationId?: string;
}

export interface SearchResult {
  message: Message;
  conversationName: string;
  matchedText: string;
  matchIndex: number;
}

interface MessageSearchProps {
  onResultClick?: (result: SearchResult) => void;
  onClose?: () => void;
  conversationId?: string; // If provided, search only in this conversation
}

export const MessageSearch: React.FC<MessageSearchProps> = ({
  onResultClick,
  onClose,
  conversationId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilter>({
    query: '',
    contentTypes: []
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('message-search-history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  }, []);

  // Save search to history
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    const updated = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10);
    setSearchHistory(updated);
    localStorage.setItem('message-search-history', JSON.stringify(updated));
  }, [searchHistory]);

  // Perform search
  const performSearch = useCallback(async (searchFilters: SearchFilter) => {
    if (!searchFilters.query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        q: searchFilters.query,
        ...(searchFilters.dateFrom && { from: searchFilters.dateFrom.toISOString() }),
        ...(searchFilters.dateTo && { to: searchFilters.dateTo.toISOString() }),
        ...(searchFilters.senderAddress && { sender: searchFilters.senderAddress }),
        ...(conversationId && { conversationId }),
        ...(searchFilters.contentTypes?.length && { types: searchFilters.contentTypes.join(',') })
      });

      const response = await fetch(`/api/messages/search?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        saveToHistory(searchFilters.query);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, saveToHistory]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch({ ...filters, query: searchQuery });
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filters, performSearch]);

  const updateFilter = <K extends keyof SearchFilter>(key: K, value: SearchFilter[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: searchQuery,
      contentTypes: []
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setFilters({ query: '', contentTypes: [] });
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
  };

  const removeFromHistory = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = searchHistory.filter(q => q !== query);
    setSearchHistory(updated);
    localStorage.setItem('message-search-history', JSON.stringify(updated));
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.senderAddress) count++;
    if (filters.contentTypes && filters.contentTypes.length > 0) count++;
    return count;
  }, [filters]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Search Messages</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowHistory(searchHistory.length > 0 && !searchQuery)}
            placeholder="Search messages..."
            className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-20 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-2 top-2 flex items-center space-x-1">
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                aria-label="Clear search"
              >
                <X size={14} className="text-gray-400" />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1 hover:bg-gray-700 rounded transition-colors relative ${
                activeFilterCount > 0 ? 'text-blue-400' : 'text-gray-400'
              }`}
              aria-label="Toggle filters"
            >
              <Filter size={14} />
              {activeFilterCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {activeFilterCount}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Search History Dropdown */}
        <AnimatePresence>
          {showHistory && searchHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden"
            >
              <div className="p-2 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Recent Searches</span>
                  <button
                    onClick={() => {
                      setSearchHistory([]);
                      localStorage.removeItem('message-search-history');
                    }}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              {searchHistory.map((query, index) => (
                <div
                  key={index}
                  onClick={() => handleHistoryClick(query)}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-700 cursor-pointer group"
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <Clock size={12} className="text-gray-500" />
                    <span className="text-sm text-white">{query}</span>
                  </div>
                  <button
                    onClick={(e) => removeFromHistory(query, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-opacity"
                  >
                    <X size={12} className="text-gray-400" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Filters</h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {/* Date Range */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                      onChange={(e) => updateFilter('dateFrom', e.target.value ? new Date(e.target.value) : undefined)}
                      className="bg-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="From"
                    />
                    <input
                      type="date"
                      value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                      onChange={(e) => updateFilter('dateTo', e.target.value ? new Date(e.target.value) : undefined)}
                      className="bg-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="To"
                    />
                  </div>
                </div>

                {/* Sender */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">From User</label>
                  <input
                    type="text"
                    value={filters.senderAddress || ''}
                    onChange={(e) => updateFilter('senderAddress', e.target.value || undefined)}
                    placeholder="Wallet address or ENS"
                    className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Content Types */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Message Type</label>
                  <div className="flex flex-wrap gap-2">
                    {(['text', 'image', 'file', 'post_share'] as const).map(type => (
                      <label
                        key={type}
                        className={`flex items-center space-x-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                          filters.contentTypes?.includes(type)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={filters.contentTypes?.includes(type) || false}
                          onChange={(e) => {
                            const current = filters.contentTypes || [];
                            updateFilter(
                              'contentTypes',
                              e.target.checked
                                ? [...current, type]
                                : current.filter(t => t !== type)
                            );
                          }}
                          className="sr-only"
                        />
                        <span className="capitalize">{type === 'post_share' ? 'Post' : type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : !searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Search Messages</h3>
            <p className="text-gray-400 text-sm">
              Enter keywords to search across all your conversations
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Results Found</h3>
            <p className="text-gray-400 text-sm mb-4">
              Try different keywords or adjust your filters
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-400 hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-2">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
            {results.map((result, index) => (
              <SearchResultCard
                key={`${result.message.id}-${index}`}
                result={result}
                searchQuery={searchQuery}
                onClick={() => onResultClick?.(result)}
                highlightMatch={highlightMatch}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface SearchResultCardProps {
  result: SearchResult;
  searchQuery: string;
  onClick: () => void;
  highlightMatch: (text: string, query: string) => React.ReactNode;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  searchQuery,
  onClick,
  highlightMatch
}) => {
  const [expanded, setExpanded] = useState(false);

  const getContentTypeIcon = () => {
    const type = result.message.contentType;
    if (type === 'image') return <Image size={14} className="text-blue-400" />;
    if (type === 'file') return <FileText size={14} className="text-green-400" />;
    if (type === 'post_share') return <Link size={14} className="text-purple-400" />;
    return <FileText size={14} className="text-gray-400" />;
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.toLocaleDateString();
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {getContentTypeIcon()}
          <span className="text-white font-medium text-sm truncate">
            {result.conversationName}
          </span>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
          {formatTimestamp(result.message.timestamp)}
        </span>
      </div>

      <div className="flex items-center space-x-2 mb-2">
        <User size={12} className="text-gray-500" />
        <span className="text-xs text-gray-400">
          {truncateAddress(result.message.fromAddress)}
        </span>
      </div>

      <div className="text-sm text-gray-300">
        {expanded ? (
          <div>{highlightMatch(result.message.content, searchQuery)}</div>
        ) : (
          <div className="line-clamp-2">
            {highlightMatch(result.message.content, searchQuery)}
          </div>
        )}
      </div>

      {result.message.content.length > 150 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex items-center space-x-1 text-xs text-blue-400 hover:underline mt-2"
        >
          {expanded ? (
            <>
              <ChevronDown size={12} />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronRight size={12} />
              <span>Show more</span>
            </>
          )}
        </button>
      )}
    </motion.div>
  );
};

export default MessageSearch;
