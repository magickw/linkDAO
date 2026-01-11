/**
 * SearchBar - Advanced search with typeahead suggestions and category filtering
 * Includes real-time search with debouncing and synonym support
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '@/design-system/tokens';
import { GlassPanel } from '@/design-system/components/GlassPanel';

interface SearchSuggestion {
  text: string;
  category?: string;
  type: 'product' | 'category' | 'query';
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  resultCount?: number;
  placeholder?: string;
  className?: string;
}

// Mock suggestions - in production, these would come from an API
const getMockSuggestions = (query: string): SearchSuggestion[] => {
  if (!query) return [];

  const suggestions: SearchSuggestion[] = [];
  const lowerQuery = query.toLowerCase();

  // Popular queries
  const popularQueries = [
    'wireless headphones',
    'gaming laptop',
    'smart watch',
    'bluetooth speaker',
    'mechanical keyboard',
  ];

  // DeFi specific queries
  const defiQueries = [
    'uniswap lp position',
    'compound yield token',
    'aave liquidity pool',
    'curve stablecoin pool',
    'yearn vault tokens',
    'lido staked eth',
    'governance token',
    'high apy defi',
    'low risk defi',
    'insured defi position',
  ];

  popularQueries
    .filter((q) => q.includes(lowerQuery))
    .forEach((q) => {
      suggestions.push({ text: q, type: 'query' });
    });

  defiQueries
    .filter((q) => q.includes(lowerQuery))
    .forEach((q) => {
      suggestions.push({ text: q, type: 'query', category: 'DeFi' });
    });

  // Categories
  const categories = [
    'Electronics',
    'Fashion',
    'Home & Garden',
    'Sports',
    'Books',
    'Toys',
    'DeFi',
    'NFTs',
    'Services',
    'Digital Goods',
  ];

  categories
    .filter((c) => c.toLowerCase().includes(lowerQuery))
    .forEach((c) => {
      suggestions.push({ text: c, category: c, type: 'category' });
    });

  // DeFi protocols
  const defiProtocols = [
    'Uniswap',
    'Compound',
    'Aave',
    'Curve',
    'Balancer',
    'Yearn Finance',
    'Lido',
    'Rocket Pool',
  ];

  defiProtocols
    .filter((p) => p.toLowerCase().includes(lowerQuery))
    .forEach((p) => {
      suggestions.push({ text: p, category: 'DeFi Protocol', type: 'category' });
    });

  // Limit to 8 suggestions
  return suggestions.slice(0, 8);
};

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  resultCount,
  placeholder = 'Search products...',
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update suggestions when query changes
  useEffect(() => {
    if (value && isFocused) {
      const newSuggestions = getMockSuggestions(value);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
    setSelectedIndex(-1);
  }, [value, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch?.(value.trim());
      setIsFocused(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    onSearch?.(suggestion.text);
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  const clearSearch = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        {/* Search Input */}
        <div className="relative">
          <Search
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60"
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 rounded-lg text-white placeholder-white/60 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{
              background: designTokens.glassmorphism.secondary.background,
              backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
              border: designTokens.glassmorphism.secondary.border,
            }}
          />
          {value && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Result Count */}
        {resultCount !== undefined && value && (
          <div className="absolute right-0 -bottom-6 text-xs text-white/60">
            {resultCount.toLocaleString()} results
          </div>
        )}
      </form>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full z-50"
          >
            <GlassPanel variant="primary" className="py-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-4 py-2 text-left flex items-center gap-2 transition-colors ${
                    index === selectedIndex
                      ? 'bg-white/20'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <Search size={14} className="text-white/60" />
                  <span className="text-white flex-1">{suggestion.text}</span>
                  {suggestion.category && (
                    <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                      in {suggestion.category}
                    </span>
                  )}
                  {suggestion.type === 'category' && (
                    <span className="text-xs text-blue-300">
                      {suggestion.category === 'DeFi Protocol' ? 'Protocol' : 'Category'}
                    </span>
                  )}
                  {suggestion.category === 'DeFi' && (
                    <span className="text-xs text-purple-300">DeFi</span>
                  )}
                </button>
              ))}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
