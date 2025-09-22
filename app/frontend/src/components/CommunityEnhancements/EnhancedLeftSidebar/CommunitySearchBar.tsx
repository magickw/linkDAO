import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface CommunitySearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * CommunitySearchBar Component
 * 
 * Simple search bar component for filtering communities.
 * Used within the CommunityIconList component.
 */
export const CommunitySearchBar: React.FC<CommunitySearchBarProps> = ({
  onSearch,
  placeholder = "Search communities...",
  className = ""
}) => {
  const [query, setQuery] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                 placeholder-gray-500 dark:placeholder-gray-400"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full 
                   hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <X className="w-3 h-3 text-gray-400" />
        </button>
      )}
    </div>
  );
};

export default CommunitySearchBar;