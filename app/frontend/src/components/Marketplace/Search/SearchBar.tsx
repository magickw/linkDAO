/**
 * SearchBar Component - Enhanced search bar with category filtering and auto-suggest
 * Provides a more comprehensive search experience with category shortcuts
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, TrendingUp, Tag, ShoppingCart, User } from 'lucide-react';
import { AutoSuggestSearch } from './AutoSuggestSearch';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { designTokens } from '../../../design-system/tokens';
import { 
  AnimatedCategoryCard 
} from '../../../components/VisualPolish/MarketplaceAnimations';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'product' | 'category' | 'brand' | 'tag' | 'seller';
  relevance?: number;
}

interface SearchCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  placeholder: string;
}

interface SearchBarProps {
  onSearch: (query: string, category?: string) => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const categoryFilterRef = useRef<HTMLDivElement>(null);

  // Search categories
  const searchCategories: SearchCategory[] = [
    { id: 'all', name: 'All', icon: <Search size={16} />, placeholder: 'Search products, categories, brands...' },
    { id: 'products', name: 'Products', icon: <ShoppingCart size={16} />, placeholder: 'Search products...' },
    { id: 'sellers', name: 'Sellers', icon: <User size={16} />, placeholder: 'Search sellers...' },
    { id: 'categories', name: 'Categories', icon: <Filter size={16} />, placeholder: 'Search categories...' },
    { id: 'trending', name: 'Trending', icon: <TrendingUp size={16} />, placeholder: 'Search trending items...' },
  ];

  // Close category filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(event.target as Node)) {
        setShowCategoryFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      onSearch(searchQuery, activeCategory !== 'all' ? activeCategory : undefined);
      setQuery('');
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  const activeCategoryData = searchCategories.find(cat => cat.id === activeCategory) || searchCategories[0];

  return (
    <div className={`search-bar ${className}`}>
      {/* Category Filter Button */}
      <div className="relative mb-4" ref={categoryFilterRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCategoryFilter(!showCategoryFilter)}
          className="flex items-center gap-2"
        >
          {activeCategoryData.icon}
          <span>{activeCategoryData.name}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </Button>

        <AnimatePresence>
          {showCategoryFilter && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-2 w-48"
            >
              <GlassPanel variant="secondary" className="rounded-lg overflow-hidden">
                <ul className="py-1">
                  {searchCategories.map((category) => (
                    <li key={category.id}>
                      <button
                        onClick={() => {
                          setActiveCategory(category.id);
                          setShowCategoryFilter(false);
                        }}
                        className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-colors ${
                          activeCategory === category.id ? 'text-white bg-white/20' : 'text-white/80'
                        }`}
                      >
                        {category.icon}
                        <span>{category.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Input with Auto-Suggest */}
      <AutoSuggestSearch
        onSearch={handleSearch}
        onSuggestionSelect={handleSuggestionSelect}
        placeholder={activeCategoryData.placeholder}
        className="w-full"
      />

      {/* Quick Search Tags */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-sm text-white/60">Quick search:</span>
        {['Electronics', 'Fashion', 'Home & Garden', 'NFTs'].map((tag) => (
          <motion.button
            key={tag}
            onClick={() => {
              setQuery(tag);
              handleSearch(tag);
            }}
            className="px-3 py-1 rounded-full text-xs bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Tag size={12} />
            {tag}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;