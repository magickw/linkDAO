import React, { useState } from 'react';

// Reddit-style sorting options
export enum PostSortOption {
  BEST = 'best',
  HOT = 'hot',
  NEW = 'new',
  TOP = 'top',
  RISING = 'rising',
  CONTROVERSIAL = 'controversial'
}

// Time filter options for Top sorting
export enum TimeFilter {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  ALL_TIME = 'all'
}

interface PostSortingTabsProps {
  sortBy: PostSortOption;
  timeFilter: TimeFilter;
  onSortChange: (sort: PostSortOption) => void;
  onTimeFilterChange: (filter: TimeFilter) => void;
  postCount?: number;
  className?: string;
}

interface SortTab {
  type: PostSortOption;
  label: string;
  icon: string;
  description: string;
  color: string;
}

const SORT_TABS: SortTab[] = [
  {
    type: PostSortOption.BEST,
    label: 'Best',
    icon: '🏆',
    description: 'Posts with the best overall score',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    type: PostSortOption.HOT,
    label: 'Hot',
    icon: '🔥',
    description: 'Posts with high recent engagement',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    type: PostSortOption.NEW,
    label: 'New',
    icon: '⚡',
    description: 'Latest posts',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    type: PostSortOption.TOP,
    label: 'Top',
    icon: '⭐',
    description: 'Highest rated posts',
    color: 'text-purple-600 dark:text-purple-400'
  },
  {
    type: PostSortOption.RISING,
    label: 'Rising',
    icon: '📈',
    description: 'Posts gaining momentum',
    color: 'text-green-600 dark:text-green-400'
  },
  {
    type: PostSortOption.CONTROVERSIAL,
    label: 'Controversial',
    icon: '🌶️',
    description: 'Posts with mixed reactions',
    color: 'text-red-600 dark:text-red-400'
  }
];

const TIME_FILTER_OPTIONS = [
  { value: TimeFilter.HOUR, label: 'Hour' },
  { value: TimeFilter.DAY, label: 'Day' },
  { value: TimeFilter.WEEK, label: 'Week' },
  { value: TimeFilter.MONTH, label: 'Month' },
  { value: TimeFilter.YEAR, label: 'Year' },
  { value: TimeFilter.ALL_TIME, label: 'All Time' }
];

export default function PostSortingTabs({
  sortBy,
  timeFilter,
  onSortChange,
  onTimeFilterChange,
  postCount,
  className = ''
}: PostSortingTabsProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleSortChange = async (newSort: PostSortOption) => {
    if (newSort === sortBy || isChanging) return;

    setIsChanging(true);
    
    // Add a small delay for smooth transition
    setTimeout(() => {
      onSortChange(newSort);
      setIsChanging(false);
    }, 150);
  };

  const handleTimeFilterChange = (newFilter: TimeFilter) => {
    if (newFilter === timeFilter) return;
    onTimeFilterChange(newFilter);
  };

  return (
    <div className={`bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Sorting tabs */}
        <div className="flex items-center space-x-1">
          {SORT_TABS.map((tab) => {
            const isActive = tab.type === sortBy;
            
            return (
              <button
                key={tab.type}
                onClick={() => handleSortChange(tab.type)}
                disabled={isChanging}
                className={`
                  relative flex items-center space-x-2 px-3 py-2 rounded-md font-medium text-sm
                  transition-all duration-200 ease-in-out
                  ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-700'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                  ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title={tab.description}
              >
                <span className={`text-sm ${isActive ? tab.color : ''}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          {/* Time filter dropdown for Top sorting */}
          {sortBy === PostSortOption.TOP && (
            <div className="flex items-center space-x-2">
              <label htmlFor="time-filter" className="text-sm text-gray-500 dark:text-gray-400">
                Time:
              </label>
              <select
                id="time-filter"
                value={timeFilter}
                onChange={(e) => handleTimeFilterChange(e.target.value as TimeFilter)}
                className="
                  text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-colors duration-200
                "
              >
                {TIME_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Post count indicator */}
          {postCount !== undefined && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {postCount.toLocaleString()} posts
            </div>
          )}

          {/* Loading indicator */}
          {isChanging && (
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500" />
              <span className="text-xs">Loading...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for managing post sorting state
export function usePostSorting(initialSort: PostSortOption = PostSortOption.BEST, initialTimeFilter: TimeFilter = TimeFilter.DAY) {
  const [sortBy, setSortBy] = useState<PostSortOption>(initialSort);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(initialTimeFilter);
  const [isLoading, setIsLoading] = useState(false);

  const handleSortChange = (newSort: PostSortOption) => {
    setSortBy(newSort);
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const handleTimeFilterChange = (newFilter: TimeFilter) => {
    setTimeFilter(newFilter);
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  return {
    sortBy,
    timeFilter,
    isLoading,
    handleSortChange,
    handleTimeFilterChange
  };
}