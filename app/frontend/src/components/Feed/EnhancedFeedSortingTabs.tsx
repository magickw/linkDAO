import React, { useState, useCallback, useEffect } from 'react';
import { FeedSortType } from '../../types/feed';
import { useFeedPreferences } from '../../hooks/useFeedPreferences';

interface EnhancedFeedSortingTabsProps {
  activeSort: FeedSortType;
  activeTimeRange?: string;
  onSortChange: (sort: FeedSortType) => void;
  onTimeRangeChange: (timeRange: string) => void;
  className?: string;
  showTimeRange?: boolean;
}

interface SortOption {
  value: FeedSortType;
  label: string;
  description: string;
  icon: string;
  color: string;
  algorithm: string;
}

interface TimeRangeOption {
  value: string;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: FeedSortType.HOT,
    label: 'Hot',
    description: 'Trending posts with high engagement',
    icon: '🔥',
    color: 'red',
    algorithm: 'Engagement score + recency + token activity'
  },
  {
    value: FeedSortType.NEW,
    label: 'New',
    description: 'Most recent posts',
    icon: '🆕',
    color: 'blue',
    algorithm: 'Chronological order by creation time'
  },
  {
    value: FeedSortType.TOP,
    label: 'Top',
    description: 'Highest rated posts',
    icon: '⭐',
    color: 'yellow',
    algorithm: 'Total engagement score + staking weight'
  },
  {
    value: FeedSortType.RISING,
    label: 'Rising',
    description: 'Posts gaining momentum',
    icon: '📈',
    color: 'green',
    algorithm: 'Engagement velocity + growth rate'
  }
];

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  {
    value: 'hour',
    label: 'Past Hour',
    shortLabel: '1h',
    icon: '⏰',
    description: 'Last 60 minutes'
  },
  {
    value: 'day',
    label: 'Today',
    shortLabel: '24h',
    icon: '📅',
    description: 'Last 24 hours'
  },
  {
    value: 'week',
    label: 'This Week',
    shortLabel: '7d',
    icon: '📊',
    description: 'Last 7 days'
  },
  {
    value: 'month',
    label: 'This Month',
    shortLabel: '30d',
    icon: '🗓️',
    description: 'Last 30 days'
  },
  {
    value: 'year',
    label: 'This Year',
    shortLabel: '1y',
    icon: '📆',
    description: 'Last 365 days'
  },
  {
    value: 'all',
    label: 'All Time',
    shortLabel: 'All',
    icon: '♾️',
    description: 'All time periods'
  }
];

export const EnhancedFeedSortingTabs: React.FC<EnhancedFeedSortingTabsProps> = ({
  activeSort,
  activeTimeRange = 'day',
  onSortChange,
  onTimeRangeChange,
  className = '',
  showTimeRange = true
}) => {
  const { savePreferences } = useFeedPreferences();
  const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);
  const [hoveredSort, setHoveredSort] = useState<FeedSortType | null>(null);

  // Handle sort change with preferences saving
  const handleSortChange = useCallback((sort: FeedSortType) => {
    onSortChange(sort);
    savePreferences({ defaultSort: sort });
  }, [onSortChange, savePreferences]);

  // Handle time range change with preferences saving
  const handleTimeRangeChange = useCallback((timeRange: string) => {
    onTimeRangeChange(timeRange);
    savePreferences({ defaultTimeRange: timeRange });
  }, [onTimeRangeChange, savePreferences]);

  // Get color classes for sort tabs
  const getSortColorClasses = useCallback((color: string, isActive: boolean, isHovered: boolean) => {
    const baseClasses = 'transition-all duration-200';
    
    if (isActive) {
      switch (color) {
        case 'red':
          return `${baseClasses} bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-2 ring-red-200 dark:ring-red-800 shadow-lg`;
        case 'blue':
          return `${baseClasses} bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-2 ring-blue-200 dark:ring-blue-800 shadow-lg`;
        case 'yellow':
          return `${baseClasses} bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 ring-2 ring-yellow-200 dark:ring-yellow-800 shadow-lg`;
        case 'green':
          return `${baseClasses} bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 ring-2 ring-green-200 dark:ring-green-800 shadow-lg`;
        default:
          return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ring-2 ring-gray-200 dark:ring-gray-600 shadow-lg`;
      }
    }
    
    if (isHovered) {
      switch (color) {
        case 'red':
          return `${baseClasses} bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 ring-1 ring-red-100 dark:ring-red-900 shadow-md`;
        case 'blue':
          return `${baseClasses} bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900 shadow-md`;
        case 'yellow':
          return `${baseClasses} bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 dark:text-yellow-400 ring-1 ring-yellow-100 dark:ring-yellow-900 shadow-md`;
        case 'green':
          return `${baseClasses} bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 ring-1 ring-green-100 dark:ring-green-900 shadow-md`;
        default:
          return `${baseClasses} bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 ring-1 ring-gray-100 dark:ring-gray-600 shadow-md`;
      }
    }
    
    return `${baseClasses} bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600`;
  }, []);

  // Get active sort option
  const activeSortOption = SORT_OPTIONS.find(option => option.value === activeSort);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header with Algorithm Info Toggle */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Feed Sorting
          </h3>
          <button
            onClick={() => setShowAlgorithmInfo(!showAlgorithmInfo)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 flex items-center space-x-1"
          >
            <span>ℹ️</span>
            <span>{showAlgorithmInfo ? 'Hide' : 'Show'} Algorithm Info</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Sort Options */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center space-x-2">
            <span>🎯</span>
            <span>Sort By</span>
            {activeSortOption && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full">
                {activeSortOption.icon} {activeSortOption.label}
              </span>
            )}
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            {SORT_OPTIONS.map(option => {
              const isActive = activeSort === option.value;
              const isHovered = hoveredSort === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  onMouseEnter={() => setHoveredSort(option.value)}
                  onMouseLeave={() => setHoveredSort(null)}
                  className={`flex items-start space-x-3 p-4 text-left rounded-lg ${getSortColorClasses(option.color, isActive, isHovered)}`}
                >
                  <span className="text-xl mt-0.5">{option.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{option.label}</span>
                      {isActive && (
                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                          option.color === 'red' ? 'bg-red-500' :
                          option.color === 'blue' ? 'bg-blue-500' :
                          option.color === 'yellow' ? 'bg-yellow-500' :
                          option.color === 'green' ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                      )}
                    </div>
                    <div className="text-xs opacity-75 mt-1">{option.description}</div>
                    {showAlgorithmInfo && (
                      <div className="text-xs opacity-60 mt-2 italic bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                        <strong>Algorithm:</strong> {option.algorithm}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Range Options (only show for non-NEW sorts) */}
        {showTimeRange && activeSort !== FeedSortType.NEW && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center space-x-2">
              <span>⏱️</span>
              <span>Time Range</span>
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                {TIME_RANGE_OPTIONS.find(t => t.value === activeTimeRange)?.shortLabel}
              </span>
            </h4>
            
            <div className="grid grid-cols-3 gap-2">
              {TIME_RANGE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleTimeRangeChange(option.value)}
                  className={`flex flex-col items-center space-y-1 p-3 text-center rounded-lg transition-all duration-200 ${
                    activeTimeRange === option.value
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800 scale-105'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:scale-102'
                  }`}
                  title={option.description}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-xs font-medium">{option.shortLabel}</span>
                  {activeTimeRange === option.value && (
                    <div className="w-1 h-1 bg-primary-500 rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Configuration Summary */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Current: <strong>{activeSortOption?.label}</strong>
              {activeSort !== FeedSortType.NEW && activeTimeRange && (
                <span> • <strong>{TIME_RANGE_OPTIONS.find(t => t.value === activeTimeRange)?.label}</strong></span>
              )}
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">Live Updates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFeedSortingTabs;