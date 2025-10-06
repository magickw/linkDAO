/**
 * SearchHistory Component
 * Displays and manages search history and saved searches
 * Implements requirements 4.1, 4.4 from the interconnected social platform spec
 */

import React from 'react';

interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultCount?: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, any>;
  createdAt: Date;
}

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  savedSearches?: SavedSearch[];
  onHistorySelect: (query: string) => void;
  onSavedSearchSelect?: (savedSearch: SavedSearch) => void;
  onClearHistory: () => void;
  onDeleteSavedSearch?: (id: string) => void;
  maxHistoryItems?: number;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  savedSearches = [],
  onHistorySelect,
  onSavedSearchSelect,
  onClearHistory,
  onDeleteSavedSearch,
  maxHistoryItems = 10
}) => {
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const recentHistory = history.slice(0, maxHistoryItems);

  return (
    <div className="search-history">
      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
            <span>Saved Searches</span>
          </div>
          
          <div className="py-1">
            {savedSearches.map((savedSearch) => (
              <div
                key={savedSearch.id}
                className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
              >
                {/* Bookmark Icon */}
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onSavedSearchSelect?.(savedSearch)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {savedSearch.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                        {formatTimeAgo(savedSearch.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {savedSearch.query}
                    </p>
                  </button>
                </div>

                {/* Delete Button */}
                {onDeleteSavedSearch && (
                  <button
                    onClick={() => onDeleteSavedSearch(savedSearch.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {recentHistory.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
            <span>Recent Searches</span>
            <button
              onClick={onClearHistory}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 normal-case"
            >
              Clear all
            </button>
          </div>
          
          <div className="py-1">
            {recentHistory.map((item, index) => (
              <button
                key={index}
                onClick={() => onHistorySelect(item.query)}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
              >
                {/* Clock Icon */}
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                {/* Query Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white truncate">
                      {item.query}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                  {item.resultCount !== undefined && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.resultCount} results
                    </p>
                  )}
                </div>

                {/* Arrow Icon */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {history.length > maxHistoryItems && (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
              +{history.length - maxHistoryItems} more searches
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {recentHistory.length === 0 && savedSearches.length === 0 && (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No search history yet</p>
          <p className="text-xs mt-1">Your recent searches will appear here</p>
        </div>
      )}
    </div>
  );
};

export default SearchHistory;