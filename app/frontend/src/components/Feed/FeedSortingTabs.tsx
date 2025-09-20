import React, { useState, useEffect } from 'react';
import { FeedSortType } from '../../types/feed';

interface FeedSortingTabsProps {
  activeSort: FeedSortType;
  onSortChange: (sort: FeedSortType) => void;
  className?: string;
  showCounts?: boolean;
  counts?: Record<FeedSortType, number>;
}

interface SortTab {
  type: FeedSortType;
  label: string;
  icon: string;
  description: string;
  color: string;
}

const SORT_TABS: SortTab[] = [
  {
    type: FeedSortType.HOT,
    label: 'Hot',
    icon: '🔥',
    description: 'Posts with high recent engagement',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    type: FeedSortType.NEW,
    label: 'New',
    icon: '⚡',
    description: 'Latest posts',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    type: FeedSortType.TOP,
    label: 'Top',
    icon: '⭐',
    description: 'Highest rated posts',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    type: FeedSortType.RISING,
    label: 'Rising',
    icon: '📈',
    description: 'Posts gaining momentum',
    color: 'text-green-600 dark:text-green-400'
  }
];

export default function FeedSortingTabs({
  activeSort,
  onSortChange,
  className = '',
  showCounts = false,
  counts
}: FeedSortingTabsProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleSortChange = async (newSort: FeedSortType) => {
    if (newSort === activeSort || isChanging) return;

    setIsChanging(true);
    
    // Add a small delay for smooth transition
    setTimeout(() => {
      onSortChange(newSort);
      setIsChanging(false);
    }, 150);
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {SORT_TABS.map((tab) => {
        const isActive = tab.type === activeSort;
        const count = counts?.[tab.type];
        
        return (
          <button
            key={tab.type}
            onClick={() => handleSortChange(tab.type)}
            disabled={isChanging}
            className={`
              relative flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm
              transition-all duration-200 ease-in-out
              ${isActive
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
              ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title={tab.description}
          >
            <span className={`text-base ${isActive ? tab.color : ''}`}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            
            {showCounts && count !== undefined && (
              <span className={`
                text-xs px-2 py-0.5 rounded-full
                ${isActive
                  ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }
              `}>
                {count > 999 ? `${Math.floor(count / 1000)}k` : count}
              </span>
            )}
            
            {/* Active indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full" />
            )}
          </button>
        );
      })}
      
      {/* Loading indicator */}
      {isChanging && (
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-500" />
          <span className="text-sm">Loading...</span>
        </div>
      )}
    </div>
  );
}

// Time range selector component
interface TimeRangeSelectorProps {
  activeRange: string;
  onRangeChange: (range: string) => void;
  className?: string;
}

const TIME_RANGES = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All Time' }
];

export function TimeRangeSelector({
  activeRange,
  onRangeChange,
  className = ''
}: TimeRangeSelectorProps) {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
        Time:
      </span>
      <select
        value={activeRange}
        onChange={(e) => onRangeChange(e.target.value)}
        className="
          text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus:ring-2 focus:ring-primary-500 focus:border-transparent
          transition-colors duration-200
        "
      >
        {TIME_RANGES.map((range) => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Combined sorting header component
interface FeedSortingHeaderProps {
  activeSort: FeedSortType;
  activeTimeRange: string;
  onSortChange: (sort: FeedSortType) => void;
  onTimeRangeChange: (range: string) => void;
  showTimeRange?: boolean;
  showCounts?: boolean;
  counts?: Record<FeedSortType, number>;
  className?: string;
}

export function FeedSortingHeader({
  activeSort,
  activeTimeRange,
  onSortChange,
  onTimeRangeChange,
  showTimeRange = true,
  showCounts = false,
  counts,
  className = ''
}: FeedSortingHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <FeedSortingTabs
        activeSort={activeSort}
        onSortChange={onSortChange}
        showCounts={showCounts}
        counts={counts}
      />
      
      {showTimeRange && (
        <TimeRangeSelector
          activeRange={activeTimeRange}
          onRangeChange={onTimeRangeChange}
        />
      )}
    </div>
  );
}