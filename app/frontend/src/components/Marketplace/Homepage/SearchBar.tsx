/**
 * SearchBar Component - Auto-suggest search with cached results
 * Provides intelligent search functionality for products, NFTs, and services
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '@/design-system/tokens';
import { GlassPanel } from '@/design-system/components/GlassPanel';

interface SearchSuggestion {
  id: string;
  title: string;
  type: 'product' | 'nft' | 'service' | 'category';
  category?: string;
  image?: string;
  price?: string;
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search products, NFTs, services...",
  onSearch,
  className = "",
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock suggestions data - in real app, this would come from API
  const mockSuggestions: SearchSuggestion[] = [
    { id: '1', title: 'Ethereum NFT Collection', type: 'nft', category: 'Art', price: '0.5 ETH' },
    { id: '2', title: 'Web3 Development Services', type: 'service', category: 'Development' },
    { id: '3', title: 'Crypto Hardware Wallet', type: 'product', category: 'Hardware', price: '$120' },
    { id: '4', title: 'DeFi Consulting', type: 'service', category: 'Consulting' },
    { id: '5', title: 'Rare Digital Art', type: 'nft', category: 'Art', price: '2.1 ETH' },
    { id: '6', title: 'Blockchain Books', type: 'product', category: 'Education', price: '$45' },
  ];

  // Simulate search with debouncing
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      // Filter mock suggestions based on query
      const filtered = mockSuggestions.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category?.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length > 0);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    setIsOpen(false);
    if (onSearch) {
      onSearch(suggestion.title);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      if (onSearch) {
        onSearch(query.trim());
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return '📦';
      case 'nft': return '🎨';
      case 'service': return '⚡';
      case 'category': return '📂';
      default: return '🔍';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'product': return 'text-blue-400';
      case 'nft': return 'text-purple-400';
      case 'service': return 'text-green-400';
      case 'category': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
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
            onFocus={() => setIsOpen(query.length > 0)}
            placeholder={placeholder}
            className="w-full md:w-80 px-4 py-2 pl-10 pr-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
          />
          
          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
              />
            </div>
          )}
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      <AnimatePresence>
        {isOpen && (suggestions.length > 0 || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <GlassPanel
              variant="modal"
              className="max-h-80 overflow-y-auto"
            >
              {isLoading ? (
                <div className="p-4 text-center text-white/60">
                  <div className="flex items-center justify-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span>Searching...</span>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="flex items-center px-4 py-3 hover:bg-white/10 cursor-pointer transition-colors group"
                    >
                      <span className="text-lg mr-3">{getTypeIcon(suggestion.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-white font-medium truncate group-hover:text-indigo-200 transition-colors">
                            {suggestion.title}
                          </p>
                          {suggestion.price && (
                            <span className="text-green-400 font-semibold ml-2">
                              {suggestion.price}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs font-medium ${getTypeColor(suggestion.type)}`}>
                            {suggestion.type.toUpperCase()}
                          </span>
                          {suggestion.category && (
                            <>
                              <span className="text-white/40">•</span>
                              <span className="text-xs text-white/60">{suggestion.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <svg className="h-4 w-4 text-white/40 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};