/**
 * AutoSuggestSearch Component - Search with autocomplete suggestions
 * Provides real-time search suggestions as users type
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { designTokens } from '../../../design-system/tokens';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'product' | 'category' | 'brand' | 'tag' | 'seller';
  relevance?: number;
}

interface AutoSuggestSearchProps {
  onSearch: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export const AutoSuggestSearch: React.FC<AutoSuggestSearchProps> = ({
  onSearch,
  onSuggestionSelect,
  placeholder = 'Search products, categories, brands...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions from API
  const fetchSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Call the enhanced search suggestions API
      const response = await fetch(`/api/marketplace/search/suggestions/enhanced?q=${encodeURIComponent(searchQuery)}&limit=8`);
      const data = await response.json();
      
      // Transform the response to match our interface
      const transformedSuggestions: SearchSuggestion[] = [];
      
      // Add product suggestions
      if (data.suggestions.products) {
        data.suggestions.products.slice(0, 3).forEach((product: string, index: number) => {
          transformedSuggestions.push({
            id: `product-${index}`,
            text: product,
            type: 'product'
          });
        });
      }
      
      // Add category suggestions
      if (data.suggestions.categories) {
        data.suggestions.categories.slice(0, 2).forEach((category: string, index: number) => {
          transformedSuggestions.push({
            id: `category-${index}`,
            text: category,
            type: 'category'
          });
        });
      }
      
      // Add brand suggestions
      if (data.suggestions.tags) {
        data.suggestions.tags.slice(0, 2).forEach((tag: string, index: number) => {
          transformedSuggestions.push({
            id: `tag-${index}`,
            text: tag,
            type: 'tag'
          });
        });
      }
      
      // Add seller suggestions
      if (data.suggestions.sellers) {
        data.suggestions.sellers.slice(0, 1).forEach((seller: string, index: number) => {
          transformedSuggestions.push({
            id: `seller-${index}`,
            text: seller,
            type: 'seller'
          });
        });
      }
      
      setSuggestions(transformedSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // Fallback to mock suggestions if API fails
      const mockSuggestions: SearchSuggestion[] = [
        { id: '1', text: `${searchQuery} phone`, type: 'product' },
        { id: '2', text: `${searchQuery} laptop`, type: 'product' },
        { id: '3', text: `Electronics`, type: 'category' },
        { id: '4', text: `Apple`, type: 'brand' },
        { id: '5', text: `Samsung`, type: 'brand' },
        { id: '6', text: `on sale`, type: 'tag' },
        { id: '7', text: `new arrival`, type: 'tag' },
      ].filter(s => s.text.toLowerCase().includes(searchQuery.toLowerCase())) as SearchSuggestion[];
      
      setSuggestions(mockSuggestions.slice(0, 8));
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(query);
        setShowSuggestions(true);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    } else {
      handleSearch(suggestion.text);
    }
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    if (query.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'product': return '📦';
      case 'category': return '📂';
      case 'brand': return '🏷️';
      case 'tag': return '🔖';
      case 'seller': return '👤';
      default: return '🔍';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full p-4 pr-12 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
          style={{
            background: designTokens.glassmorphism.primary.background,
            border: designTokens.glassmorphism.primary.border,
            backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
          }}
        />
        
        <button
          onClick={() => handleSearch()}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2"
          >
            <GlassPanel variant="secondary" className="rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="p-4 text-center text-white/60">
                  Loading suggestions...
                </div>
              ) : suggestions.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <button
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center gap-3"
                      >
                        <span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
                        <div>
                          <div className="text-white">{suggestion.text}</div>
                          <div className="text-xs text-white/60 capitalize">{suggestion.type}</div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.trim() ? (
                <div className="p-4 text-center text-white/60">
                  No suggestions found
                </div>
              ) : null}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AutoSuggestSearch;