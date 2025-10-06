import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FeedFilter, FeedSortType } from '../../types/feed';
import { useFeedPreferences } from '../../hooks/useFeedPreferences';
import { serviceWorkerCacheService } from '../../services/serviceWorkerCacheService';

interface FeedFiltersProps {
  filter: FeedFilter;
  onFilterChange: (filter: Partial<FeedFilter>) => void;
  availableCommunities?: Community[];
  className?: string;
  showAdvanced?: boolean;
}

interface Community {
  id: string;
  name: string;
  displayName: string;
  iconUrl?: string;
  memberCount: number;
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filter: Partial<FeedFilter>;
  icon: string;
}

const SORT_OPTIONS = [
  { value: FeedSortType.HOT, label: 'Hot', description: 'Trending posts with high engagement', icon: '🔥' },
  { value: FeedSortType.NEW, label: 'New', description: 'Most recent posts', icon: '🆕' },
  { value: FeedSortType.TOP, label: 'Top', description: 'Highest rated posts', icon: '⭐' },
  { value: FeedSortType.RISING, label: 'Rising', description: 'Posts gaining momentum', icon: '📈' }
];

const TIME_RANGE_OPTIONS = [
  { value: 'hour', label: 'Past Hour', icon: '⏰' },
  { value: 'day', label: 'Today', icon: '📅' },
  { value: 'week', label: 'This Week', icon: '📊' },
  { value: 'month', label: 'This Month', icon: '🗓️' },
  { value: 'year', label: 'This Year', icon: '📆' },
  { value: 'all', label: 'All Time', icon: '♾️' }
];

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'trending',
    name: 'Trending',
    description: 'Hot posts from the last 24 hours',
    filter: { sortBy: FeedSortType.HOT, timeRange: 'day' },
    icon: '🔥'
  },
  {
    id: 'fresh',
    name: 'Fresh',
    description: 'Latest posts from all communities',
    filter: { sortBy: FeedSortType.NEW },
    icon: '🆕'
  },
  {
    id: 'top_week',
    name: 'Weekly Best',
    description: 'Top posts from this week',
    filter: { sortBy: FeedSortType.TOP, timeRange: 'week' },
    icon: '🏆'
  },
  {
    id: 'rising',
    name: 'Rising Stars',
    description: 'Posts gaining traction',
    filter: { sortBy: FeedSortType.RISING, timeRange: 'day' },
    icon: '🚀'
  }
];

export default function FeedFilters({
  filter,
  onFilterChange,
  availableCommunities = [],
  className = '',
  showAdvanced = false
}: FeedFiltersProps) {
  const { savePreferences } = useFeedPreferences();
  
  // State
  const [showCommunityFilter, setShowCommunityFilter] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // Load popular tags on mount
  useEffect(() => {
    loadPopularTags();
  }, []);

  // Update selected communities when filter changes
  useEffect(() => {
    if (filter.communityId) {
      setSelectedCommunities([filter.communityId]);
    } else {
      setSelectedCommunities([]);
    }
  }, [filter.communityId]);

  // Update selected tags when filter changes
  useEffect(() => {
    setSelectedTags(filter.tags || []);
  }, [filter.tags]);

  // Load popular tags
  const loadPopularTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      // Try cache first
      const cachedResponse = await serviceWorkerCacheService.cacheWithStrategy(
        '/api/tags/popular',
        'communities',
        ['tags', 'popular']
      );

      let tagsData;
      if (cachedResponse) {
        tagsData = await cachedResponse.json();
      } else {
        // Fallback to mock data
        tagsData = [
          'defi', 'nft', 'web3', 'crypto', 'blockchain', 'dao', 'governance',
          'trading', 'yield', 'staking', 'metaverse', 'gaming', 'art', 'music'
        ];
      }

      setPopularTags(tagsData);
    } catch (error) {
      console.error('Failed to load popular tags:', error);
      setPopularTags(['defi', 'nft', 'web3', 'crypto', 'blockchain']);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((sortBy: FeedSortType) => {
    const newFilter: Partial<FeedFilter> = { sortBy };
    
    // Reset time range for NEW sort
    if (sortBy === FeedSortType.NEW) {
      newFilter.timeRange = undefined;
    } else if (!filter.timeRange) {
      newFilter.timeRange = 'day';
    }

    onFilterChange(newFilter);
    savePreferences({ defaultSort: sortBy });
  }, [filter.timeRange, onFilterChange, savePreferences]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((timeRange: string) => {
    onFilterChange({ timeRange });
    savePreferences({ defaultTimeRange: timeRange });
  }, [onFilterChange, savePreferences]);

  // Handle community selection
  const handleCommunityToggle = useCallback((communityId: string) => {
    const newSelected = selectedCommunities.includes(communityId)
      ? selectedCommunities.filter(id => id !== communityId)
      : [...selectedCommunities, communityId];

    setSelectedCommunities(newSelected);
    
    // Update filter - single community for now, could be extended to multiple
    onFilterChange({
      communityId: newSelected.length === 1 ? newSelected[0] : undefined
    });
  }, [selectedCommunities, onFilterChange]);

  // Handle tag selection
  const handleTagToggle = useCallback((tag: string) => {
    const newSelected = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(newSelected);
    onFilterChange({ tags: newSelected.length > 0 ? newSelected : undefined });
  }, [selectedTags, onFilterChange]);

  // Add custom tag
  const handleAddCustomTag = useCallback(() => {
    const tag = customTagInput.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      const newSelected = [...selectedTags, tag];
      setSelectedTags(newSelected);
      onFilterChange({ tags: newSelected });
      setCustomTagInput('');
    }
  }, [customTagInput, selectedTags, onFilterChange]);

  // Apply preset filter
  const handlePresetApply = useCallback((preset: FilterPreset) => {
    onFilterChange(preset.filter);
    savePreferences({
      defaultSort: preset.filter.sortBy || FeedSortType.HOT,
      defaultTimeRange: preset.filter.timeRange || 'day'
    });
  }, [onFilterChange, savePreferences]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedCommunities([]);
    setSelectedTags([]);
    setCustomTagInput('');
    onFilterChange({
      sortBy: FeedSortType.HOT,
      timeRange: 'day',
      communityId: undefined,
      tags: undefined,
      author: undefined
    });
  }, [onFilterChange]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filter.communityId ||
      filter.tags?.length ||
      filter.author ||
      (filter.sortBy !== FeedSortType.HOT) ||
      (filter.timeRange !== 'day')
    );
  }, [filter]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Feed Filters
          </h3>
          
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Presets */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Filters
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {FILTER_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePresetApply(preset)}
                className="flex items-center space-x-2 p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
              >
                <span className="text-lg">{preset.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {preset.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {preset.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sort By
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {SORT_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`flex items-center space-x-2 p-3 text-left rounded-lg transition-colors duration-200 ${
                  filter.sortBy === option.value
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-lg">{option.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs opacity-75 truncate">{option.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Time Range */}
        {filter.sortBy !== FeedSortType.NEW && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {TIME_RANGE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleTimeRangeChange(option.value)}
                  className={`flex items-center justify-center space-x-1 p-2 text-sm rounded-lg transition-colors duration-200 ${
                    filter.timeRange === option.value
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Community Filter */}
        {availableCommunities.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Communities
              </h4>
              <button
                onClick={() => setShowCommunityFilter(!showCommunityFilter)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200"
              >
                {showCommunityFilter ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showCommunityFilter && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableCommunities.map(community => (
                  <label
                    key={community.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCommunities.includes(community.id)}
                      onChange={() => handleCommunityToggle(community.id)}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {community.iconUrl && (
                        <img
                          src={community.iconUrl}
                          alt={community.name}
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {community.displayName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {community.memberCount} members
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tag Filter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tags
            </h4>
            <button
              onClick={() => setShowTagFilter(!showTagFilter)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200"
            >
              {showTagFilter ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full"
                >
                  #{tag}
                  <button
                    onClick={() => handleTagToggle(tag)}
                    className="ml-1 text-primary-500 hover:text-primary-700 dark:hover:text-primary-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {showTagFilter && (
            <div className="space-y-3">
              {/* Custom Tag Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                  placeholder="Add custom tag..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddCustomTag}
                  disabled={!customTagInput.trim()}
                  className="px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              {/* Popular Tags */}
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Popular Tags
                </div>
                {loadingTags ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-500" />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${
                          selectedTags.includes(tag)
                            ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Advanced
            </h4>
            
            {/* Author Filter */}
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Filter by Author
              </label>
              <input
                type="text"
                value={filter.author || ''}
                onChange={(e) => onFilterChange({ author: e.target.value || undefined })}
                placeholder="Enter wallet address or username..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}