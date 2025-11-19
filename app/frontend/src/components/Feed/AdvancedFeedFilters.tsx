import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FeedFilter, FeedSortType } from '../../types/feed';
import { useFeedPreferences } from '../../hooks/useFeedPreferences';

interface AdvancedFeedFiltersProps {
  filter: FeedFilter;
  onFilterChange: (filter: Partial<FeedFilter>) => void;
  className?: string;
}

export interface TimeFilter {
  value: string;
  label: string;
  description: string;
  icon: string;
  isActive?: boolean;
}

export interface PostTypeFilter {
  value: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  isActive?: boolean;
}

export interface FeedSourceFilter {
  value: 'following' | 'all';
  label: string;
  description: string;
  icon: string;
  algorithm: string;
}

const TIME_FILTERS: TimeFilter[] = [
  {
    value: 'hour',
    label: 'Past Hour',
    description: 'Posts from the last 60 minutes',
    icon: '⏰'
  },
  {
    value: 'day',
    label: 'Today',
    description: 'Posts from the last 24 hours',
    icon: '📅'
  },
  {
    value: 'week',
    label: 'This Week',
    description: 'Posts from the last 7 days',
    icon: '📊'
  },
  {
    value: 'month',
    label: 'This Month',
    description: 'Posts from the last 30 days',
    icon: '🗓️'
  },
  {
    value: 'year',
    label: 'This Year',
    description: 'Posts from the last 365 days',
    icon: '📆'
  },
  {
    value: 'all',
    label: 'All Time',
    description: 'Posts from all time periods',
    icon: '♾️'
  }
];

const POST_TYPE_FILTERS: PostTypeFilter[] = [
  {
    value: 'discussion',
    label: 'Discussion',
    description: 'Text posts and conversations',
    icon: '💬',
    color: 'blue'
  },
  {
    value: 'analysis',
    label: 'Analysis',
    description: 'In-depth research and analysis',
    icon: '📊',
    color: 'green'
  },
  {
    value: 'showcase',
    label: 'Showcase',
    description: 'Projects, art, and creations',
    icon: '🎨',
    color: 'orange'
  },
  {
    value: 'governance',
    label: 'Governance',
    description: 'Proposals and voting',
    icon: '🏛️',
    color: 'purple'
  }
];

const FEED_SOURCE_FILTERS: FeedSourceFilter[] = [
  {
    value: 'following',
    label: 'Following',
    description: 'Posts from communities and users you follow',
    icon: '👥',
    algorithm: 'Personalized feed based on your connections and interests'
  },
  {
    value: 'all',
    label: 'All Communities',
    description: 'Posts from all communities on the platform',
    icon: '🌐',
    algorithm: 'Global feed with trending and popular content'
  }
];

export const AdvancedFeedFilters: React.FC<AdvancedFeedFiltersProps> = ({
  filter,
  onFilterChange,
  className = ''
}) => {
  const { savePreferences } = useFeedPreferences();
  
  // State for UI interactions
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedPostTypes, setSelectedPostTypes] = useState<string[]>([]);
  const [feedSource, setFeedSource] = useState<'following' | 'all'>('following');

  // Initialize state from filter
  useEffect(() => {
    if (filter.postTypes) {
      setSelectedPostTypes(filter.postTypes);
    }
    if (filter.feedSource) {
      setFeedSource(filter.feedSource);
    }
  }, [filter.postTypes, filter.feedSource]);

  // Handle time filter change with visual indicators
  const handleTimeFilterChange = useCallback((timeRange: string) => {
    onFilterChange({ timeRange });
    savePreferences({ defaultTimeRange: timeRange });
  }, [onFilterChange, savePreferences]);

  // Handle feed source toggle with different algorithms
  const handleFeedSourceChange = useCallback((source: 'following' | 'all') => {
    setFeedSource(source);
    onFilterChange({ feedSource: source });
    savePreferences({ defaultFeedSource: source });
  }, [onFilterChange, savePreferences]);

  // Handle post type filtering
  const handlePostTypeToggle = useCallback((postType: string) => {
    const newTypes = selectedPostTypes.includes(postType)
      ? selectedPostTypes.filter(type => type !== postType)
      : [...selectedPostTypes, postType];
    
    setSelectedPostTypes(newTypes);
    onFilterChange({ postTypes: newTypes.length > 0 ? newTypes : undefined });
  }, [selectedPostTypes, onFilterChange]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  }, [expandedSection]);

  // Get color classes for post type
  const getPostTypeColorClasses = useCallback((color: string, isActive: boolean) => {
    const baseClasses = 'transition-all duration-200';
    
    if (isActive) {
      switch (color) {
        case 'blue':
          return `${baseClasses} bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800`;
        case 'green':
          return `${baseClasses} bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 ring-1 ring-green-200 dark:ring-green-800`;
        case 'orange':
          return `${baseClasses} bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-800`;
        case 'purple':
          return `${baseClasses} bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-800`;
        default:
          return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`;
      }
    }
    
    return `${baseClasses} bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300`;
  }, []);

  // Check if any advanced filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filter.timeRange && filter.timeRange !== 'day' ||
      filter.feedSource && filter.feedSource !== 'all' ||
      filter.postTypes?.length
    );
  }, [filter]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <span>Advanced Filters</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full">
                Active
              </span>
            )}
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Time Filters with Visual Indicators */}
        <div>
          <button
            onClick={() => toggleSection('time')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
              <span>⏱️</span>
              <span>Time Range</span>
              {filter.timeRange && filter.timeRange !== 'day' && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                  {TIME_FILTERS.find(t => t.value === filter.timeRange)?.label}
                </span>
              )}
            </h4>
            <span className={`transform transition-transform duration-200 ${expandedSection === 'time' ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {(expandedSection === 'time' || expandedSection === null) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {TIME_FILTERS.map(timeFilter => (
                <button
                  key={timeFilter.value}
                  onClick={() => handleTimeFilterChange(timeFilter.value)}
                  className={`flex items-center space-x-2 p-3 text-left rounded-lg transition-all duration-200 ${
                    filter.timeRange === timeFilter.value
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800 scale-105'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:scale-102'
                  }`}
                >
                  <span className="text-lg">{timeFilter.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{timeFilter.label}</div>
                    <div className="text-xs opacity-75 truncate">{timeFilter.description}</div>
                  </div>
                  {filter.timeRange === timeFilter.value && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feed Source Toggle with Algorithm Info */}
        <div>
          <button
            onClick={() => toggleSection('source')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
              <span>🎯</span>
              <span>Feed Source</span>
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full">
                {FEED_SOURCE_FILTERS.find(f => f.value === feedSource)?.label}
              </span>
            </h4>
            <span className={`transform transition-transform duration-200 ${expandedSection === 'source' ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {(expandedSection === 'source' || expandedSection === null) && (
            <div className="mt-3 space-y-2">
              {FEED_SOURCE_FILTERS.map(sourceFilter => (
                <button
                  key={sourceFilter.value}
                  onClick={() => handleFeedSourceChange(sourceFilter.value)}
                  className={`w-full flex items-start space-x-3 p-3 text-left rounded-lg transition-all duration-200 ${
                    feedSource === sourceFilter.value
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-lg mt-0.5">{sourceFilter.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{sourceFilter.label}</span>
                      {feedSource === sourceFilter.value && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <div className="text-xs opacity-75 mt-1">{sourceFilter.description}</div>
                    <div className="text-xs opacity-60 mt-1 italic">{sourceFilter.algorithm}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Post Type Filtering */}
        <div>
          <button
            onClick={() => toggleSection('types')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
              <span>📝</span>
              <span>Post Types</span>
              {selectedPostTypes.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full">
                  {selectedPostTypes.length} selected
                </span>
              )}
            </h4>
            <span className={`transform transition-transform duration-200 ${expandedSection === 'types' ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {(expandedSection === 'types' || expandedSection === null) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {POST_TYPE_FILTERS.map(typeFilter => {
                const isActive = selectedPostTypes.includes(typeFilter.value);
                return (
                  <button
                    key={typeFilter.value}
                    onClick={() => handlePostTypeToggle(typeFilter.value)}
                    className={`flex items-center space-x-2 p-3 text-left rounded-lg ${getPostTypeColorClasses(typeFilter.color, isActive)}`}
                  >
                    <span className="text-lg">{typeFilter.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center space-x-2">
                        <span>{typeFilter.label}</span>
                        {isActive && (
                          <div className={`w-2 h-2 rounded-full animate-pulse ${
                            typeFilter.color === 'blue' ? 'bg-blue-500' :
                            typeFilter.color === 'green' ? 'bg-green-500' :
                            typeFilter.color === 'orange' ? 'bg-orange-500' :
                            typeFilter.color === 'purple' ? 'bg-purple-500' : 'bg-gray-500'
                          }`} />
                        )}
                      </div>
                      <div className="text-xs opacity-75 truncate">{typeFilter.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedPostTypes.length + (filter.timeRange !== 'day' ? 1 : 0) + (feedSource !== 'all' ? 1 : 0)} filters active
              </span>
              <button
                onClick={() => {
                  setSelectedPostTypes([]);
                  setFeedSource('all');
                  onFilterChange({
                    timeRange: 'day',
                    feedSource: 'all',
                    postTypes: undefined
                  });
                }}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedFeedFilters;