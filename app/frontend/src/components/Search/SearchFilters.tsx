/**
 * SearchFilters Component
 * Advanced filtering options for search results
 * Implements requirements 4.1, 4.4 from the interconnected social platform spec
 */

import React, { useState } from 'react';
import { SearchQuery } from './GlobalSearchInterface';

interface SearchFiltersProps {
  filters: SearchQuery['filters'];
  onChange: (filters: Partial<SearchQuery['filters']>) => void;
  compact?: boolean;
  showAdvanced?: boolean;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onChange,
  compact = false,
  showAdvanced = false
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(showAdvanced);

  const contentTypes = [
    { value: 'all', label: 'All', icon: '🔍' },
    { value: 'posts', label: 'Posts', icon: '📝' },
    { value: 'communities', label: 'Communities', icon: '👥' },
    { value: 'users', label: 'Users', icon: '👤' },
    { value: 'hashtags', label: 'Hashtags', icon: '#️⃣' }
  ];

  const timeRanges = [
    { value: 'all', label: 'All time' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last week' },
    { value: '30d', label: 'Last month' }
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Most relevant' },
    { value: 'recent', label: 'Most recent' },
    { value: 'popular', label: 'Most popular' }
  ];

  const handleFilterChange = (key: keyof SearchQuery['filters'], value: any) => {
    onChange({ [key]: value });
  };

  return (
    <div className={`search-filters ${compact ? 'space-y-2' : 'space-y-4'}`}>
      {/* Content Type Filter */}
      <div>
        {!compact && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content Type
          </label>
        )}
        <div className={`flex ${compact ? 'space-x-1' : 'space-x-2'} overflow-x-auto`}>
          {contentTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleFilterChange('type', type.value)}
              className={`
                flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${filters.type === type.value
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }
                ${compact ? 'text-xs px-2 py-1' : ''}
              `}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time Range and Sort (Compact Layout) */}
      {compact ? (
        <div className="flex space-x-2">
          <select
            value={filters.timeRange || 'all'}
            onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          
          <select
            value={filters.sortBy || 'relevance'}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          {/* Time Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
            </label>
            <div className="flex space-x-2">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleFilterChange('timeRange', range.value)}
                  className={`
                    px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${filters.timeRange === range.value
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <div className="flex space-x-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange('sortBy', option.value)}
                  className={`
                    px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${filters.sortBy === option.value
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Advanced Filters Toggle */}
      {!compact && (
        <div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <span>Advanced filters</span>
            <svg
              className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && !compact && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Community Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Specific Community
            </label>
            <input
              type="text"
              placeholder="Enter community name..."
              value={filters.communityId || ''}
              onChange={(e) => handleFilterChange('communityId', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            />
          </div>

          {/* Author Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Specific Author
            </label>
            <input
              type="text"
              placeholder="Enter wallet address or username..."
              value={filters.authorAddress || ''}
              onChange={(e) => handleFilterChange('authorAddress', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            />
          </div>

          {/* Clear Advanced Filters */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                onChange({
                  communityId: undefined,
                  authorAddress: undefined
                });
              }}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear advanced filters
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {!compact && (
        <div className="flex flex-wrap gap-2">
          {filters.type && filters.type !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Type: {contentTypes.find(t => t.value === filters.type)?.label}
              <button
                onClick={() => handleFilterChange('type', 'all')}
                className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.timeRange && filters.timeRange !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Time: {timeRanges.find(t => t.value === filters.timeRange)?.label}
              <button
                onClick={() => handleFilterChange('timeRange', 'all')}
                className="ml-1 text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.sortBy && filters.sortBy !== 'relevance' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Sort: {sortOptions.find(s => s.value === filters.sortBy)?.label}
              <button
                onClick={() => handleFilterChange('sortBy', 'relevance')}
                className="ml-1 text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-100"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.communityId && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              Community: {filters.communityId}
              <button
                onClick={() => handleFilterChange('communityId', undefined)}
                className="ml-1 text-orange-600 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-100"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.authorAddress && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200">
              Author: {filters.authorAddress.slice(0, 6)}...{filters.authorAddress.slice(-4)}
              <button
                onClick={() => handleFilterChange('authorAddress', undefined)}
                className="ml-1 text-pink-600 hover:text-pink-800 dark:text-pink-300 dark:hover:text-pink-100"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;