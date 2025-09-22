/**
 * StickyFilterBar Component
 * 
 * Creates a sticky sort bar that remains visible during scrolling with smooth transitions
 * between different sort options, real-time update indicators, and filter state persistence.
 * 
 * Requirements: 2.7, 6.3, 6.4
 */

import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { SortOption } from '../../../types/communityEnhancements';

interface StickyFilterBarProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  hasNewContent?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

interface SortOptionConfig {
  label: string;
  icon: string;
  description: string;
  shortLabel: string;
}

const SORT_OPTIONS: Record<SortOption, SortOptionConfig> = {
  hot: {
    label: 'Hot',
    icon: '🔥',
    description: 'Posts with high engagement and recent activity',
    shortLabel: 'Hot'
  },
  new: {
    label: 'New',
    icon: '🆕',
    description: 'Most recently posted content',
    shortLabel: 'New'
  },
  top: {
    label: 'Top',
    icon: '⭐',
    description: 'Highest rated posts of all time',
    shortLabel: 'Top'
  },
  rising: {
    label: 'Rising',
    icon: '📈',
    description: 'Posts gaining momentum quickly',
    shortLabel: 'Rising'
  },
  mostTipped: {
    label: 'Most Tipped',
    icon: '💰',
    description: 'Posts with the highest tip amounts',
    shortLabel: 'Tipped'
  },
  controversial: {
    label: 'Controversial',
    icon: '⚡',
    description: 'Posts with mixed reactions',
    shortLabel: 'Debate'
  },
  trending: {
    label: 'Trending',
    icon: '🚀',
    description: 'Currently popular across the platform',
    shortLabel: 'Trend'
  }
};

const StickyFilterBar: React.FC<StickyFilterBarProps> = memo(({
  currentSort,
  onSortChange,
  hasNewContent = false,
  onRefresh,
  isLoading = false,
  className = ''
}) => {
  const [isSticky, setIsSticky] = useState(false);
  const [showNewContentIndicator, setShowNewContentIndicator] = useState(false);

  // Handle scroll to determine sticky state
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsSticky(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show new content indicator when hasNewContent changes
  useEffect(() => {
    if (hasNewContent) {
      setShowNewContentIndicator(true);
    }
  }, [hasNewContent]);

  // Handle sort option click
  const handleSortClick = useCallback((sort: SortOption) => {
    if (sort !== currentSort) {
      onSortChange(sort);
      // Hide new content indicator when user changes sort
      setShowNewContentIndicator(false);
    }
  }, [currentSort, onSortChange]);

  // Handle refresh click
  const handleRefreshClick = useCallback(() => {
    if (onRefresh && !isLoading) {
      onRefresh();
      setShowNewContentIndicator(false);
    }
  }, [onRefresh, isLoading]);

  // Memoized sort options for performance
  const sortOptionElements = useMemo(() => {
    return Object.entries(SORT_OPTIONS).map(([key, config]) => {
      const sortKey = key as SortOption;
      const isActive = currentSort === sortKey;
      
      return (
        <button
          key={sortKey}
          onClick={() => handleSortClick(sortKey)}
          className={`
            ce-filter-option
            ${isActive ? 'ce-filter-option-active' : 'ce-filter-option-inactive'}
            inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-200 ease-in-out
            hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            ${isActive 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }
          `}
          title={config.description}
          aria-label={`Sort by ${config.label}: ${config.description}`}
          aria-pressed={isActive}
        >
          <span className="text-base leading-none" aria-hidden="true">
            {config.icon}
          </span>
          <span className="hidden sm:inline">
            {config.label}
          </span>
          <span className="sm:hidden">
            {config.shortLabel}
          </span>
        </button>
      );
    });
  }, [currentSort, handleSortClick]);

  const containerClasses = useMemo(() => {
    const baseClasses = [
      'ce-sticky-filter-bar',
      'bg-white dark:bg-gray-800',
      'border-b border-gray-200 dark:border-gray-700',
      'transition-all duration-300 ease-in-out',
      'z-sticky'
    ];

    if (isSticky) {
      baseClasses.push(
        'fixed top-0 left-0 right-0',
        'shadow-md',
        'backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95'
      );
    } else {
      baseClasses.push('relative');
    }

    if (className) {
      baseClasses.push(className);
    }

    return baseClasses.join(' ');
  }, [isSticky, className]);

  return (
    <div className={containerClasses} style={{ zIndex: 'var(--ce-z-sticky)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Sort Options */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2 whitespace-nowrap">
              Sort by:
            </span>
            {sortOptionElements}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3 ml-4">
            {/* New content indicator */}
            {showNewContentIndicator && (
              <button
                onClick={handleRefreshClick}
                disabled={isLoading}
                className="
                  ce-new-content-indicator
                  inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                  bg-blue-500 text-white text-sm font-medium
                  hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                  transition-all duration-200 ease-in-out
                  animate-pulse hover:animate-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                aria-label="New content available, click to refresh"
              >
                <span className="text-sm leading-none" aria-hidden="true">
                  ✨
                </span>
                <span className="hidden sm:inline">
                  New posts
                </span>
                <span className="sm:hidden">
                  New
                </span>
              </button>
            )}

            {/* Refresh button */}
            <button
              onClick={handleRefreshClick}
              disabled={isLoading}
              className="
                ce-refresh-button
                p-2 rounded-lg text-gray-500 dark:text-gray-400
                hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                transition-all duration-200 ease-in-out
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              title="Refresh content"
              aria-label="Refresh content"
            >
              <svg
                className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                <span className="hidden sm:inline">Loading...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky state indicator for screen readers */}
      <div className="sr-only" aria-live="polite">
        {isSticky ? 'Filter bar is now sticky at top of page' : 'Filter bar is in normal position'}
      </div>
    </div>
  );
});

StickyFilterBar.displayName = 'StickyFilterBar';

export default StickyFilterBar;