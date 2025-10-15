import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';

interface CommunitySearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  showFilters?: boolean;
  onFiltersToggle?: () => void;
}

/**
 * CommunitySearchBar Component
 * 
 * Enhanced search bar with filtering capabilities for communities.
 * Includes real-time search, clear functionality, and filter toggle.
 * 
 * Requirements: 1.7 (community search and filtering within sidebar)
 */
export const CommunitySearchBar: React.FC<CommunitySearchBarProps> = ({
  searchQuery,
  onSearchChange,
  placeholder = "Search communities...",
  showFilters = false,
  onFiltersToggle
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  const handleClear = useCallback(() => {
    onSearchChange('');
    inputRef.current?.focus();
  }, [onSearchChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  // Focus management
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <div className="relative">
      <div className={`
        relative flex items-center transition-all duration-200
        ${isFocused 
          ? 'ring-2 ring-blue-500 ring-opacity-50' 
          : 'ring-1 ring-gray-300 dark:ring-gray-600'
        }
        rounded-lg bg-white dark:bg-gray-800
      `}>
        {/* Search Icon */}
        <div className="absolute left-3 flex items-center pointer-events-none">
          <Search className={`
            w-4 h-4 transition-colors duration-200
            ${isFocused 
              ? 'text-blue-500' 
              : 'text-gray-400 dark:text-gray-500'
            }
          `} />
        </div>

        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-3 text-sm bg-transparent
                   text-gray-900 dark:text-white
                   placeholder-gray-500 dark:placeholder-gray-400
                   border-0 focus:outline-none focus:ring-0"
        />

        {/* Action Buttons */}
        <div className="absolute right-2 flex items-center space-x-1">
          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 
                       transition-colors duration-200 group"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400 group-hover:text-gray-600 
                          dark:text-gray-500 dark:group-hover:text-gray-300" />
            </button>
          )}

          {/* Filter Toggle Button */}
          {showFilters && onFiltersToggle && (
            <button
              onClick={onFiltersToggle}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 
                       transition-colors duration-200 group"
              aria-label="Toggle filters"
            >
              <Filter className="w-4 h-4 text-gray-400 group-hover:text-gray-600 
                               dark:text-gray-500 dark:group-hover:text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Count (when searching) */}
      {searchQuery && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Searching for "{searchQuery}"...
        </div>
      )}
    </div>
  );
};

export default CommunitySearchBar;