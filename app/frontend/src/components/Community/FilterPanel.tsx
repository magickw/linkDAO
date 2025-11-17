import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FilterPanelProps, FilterState, Flair, ContentType, AuthorSuggestion, DateRange } from '../../types/communityFilter';

// Content type options with icons and descriptions
const CONTENT_TYPE_OPTIONS = [
  {
    type: ContentType.TEXT,
    label: 'Text Posts',
    icon: '📝',
    description: 'Text-only discussions'
  },
  {
    type: ContentType.IMAGE,
    label: 'Images',
    icon: '🖼️',
    description: 'Posts with images'
  },
  {
    type: ContentType.VIDEO,
    label: 'Videos',
    icon: '🎥',
    description: 'Video content'
  },
  {
    type: ContentType.LINK,
    label: 'Links',
    icon: '🔗',
    description: 'External links'
  },
  {
    type: ContentType.POLL,
    label: 'Polls',
    icon: '📊',
    description: 'Community polls'
  },
  {
    type: ContentType.PROPOSAL,
    label: 'Proposals',
    icon: '🗳️',
    description: 'Governance proposals'
  }
];

// Time range presets
const TIME_RANGE_PRESETS = [
  { label: 'Today', days: 1 },
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
  { label: 'This Year', days: 365 },
  { label: 'Custom', days: null }
];

export default function FilterPanel({
  availableFlairs,
  activeFilters,
  onFilterChange,
  onClearFilters,
  className = '',
  isCollapsed = false,
  onToggleCollapse
}: FilterPanelProps) {
  const [authorSearch, setAuthorSearch] = useState('');
  const [authorSuggestions, setAuthorSuggestions] = useState<AuthorSuggestion[]>([]);
  const [showAuthorSuggestions, setShowAuthorSuggestions] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null
  });
  const [selectedTimePreset, setSelectedTimePreset] = useState<number | null>(null);

  // Debounced author search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (authorSearch.trim()) {
        // Fetch real author suggestions from API
        try {
          const response = await fetch(`/api/communities/search-authors?q=${encodeURIComponent(authorSearch.trim())}`);
          if (response.ok) {
            const suggestions = await response.json();
            setAuthorSuggestions(suggestions);
          } else {
            setAuthorSuggestions([]);
          }
        } catch (error) {
          console.error('Error fetching author suggestions:', error);
          setAuthorSuggestions([]);
        }
        setShowAuthorSuggestions(true);
      } else {
        setAuthorSuggestions([]);
        setShowAuthorSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [authorSearch]);

  // Handle flair filter toggle
  const handleFlairToggle = useCallback((flairId: string) => {
    const newFlairFilters = activeFilters.flair.includes(flairId)
      ? activeFilters.flair.filter(id => id !== flairId)
      : [...activeFilters.flair, flairId];

    onFilterChange({
      ...activeFilters,
      flair: newFlairFilters
    });
  }, [activeFilters, onFilterChange]);

  // Handle author filter addition
  const handleAuthorAdd = useCallback((author: AuthorSuggestion) => {
    if (!activeFilters.author.includes(author.username)) {
      onFilterChange({
        ...activeFilters,
        author: [...activeFilters.author, author.username]
      });
    }
    setAuthorSearch('');
    setShowAuthorSuggestions(false);
  }, [activeFilters, onFilterChange]);

  // Handle author filter removal
  const handleAuthorRemove = useCallback((authorUsername: string) => {
    onFilterChange({
      ...activeFilters,
      author: activeFilters.author.filter(username => username !== authorUsername)
    });
  }, [activeFilters, onFilterChange]);

  // Handle content type filter toggle
  const handleContentTypeToggle = useCallback((contentType: ContentType) => {
    const newContentTypes = activeFilters.contentType.includes(contentType)
      ? activeFilters.contentType.filter(type => type !== contentType)
      : [...activeFilters.contentType, contentType];

    onFilterChange({
      ...activeFilters,
      contentType: newContentTypes
    });
  }, [activeFilters, onFilterChange]);

  // Handle time range preset selection
  const handleTimePresetSelect = useCallback((presetIndex: number) => {
    const preset = TIME_RANGE_PRESETS[presetIndex];
    setSelectedTimePreset(presetIndex);

    if (preset.days === null) {
      // Custom range selected
      onFilterChange({
        ...activeFilters,
        timeRange: customDateRange
      });
    } else {
      // Preset range selected
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - preset.days);

      const newTimeRange = { startDate, endDate };
      setCustomDateRange(newTimeRange);
      onFilterChange({
        ...activeFilters,
        timeRange: newTimeRange
      });
    }
  }, [activeFilters, customDateRange, onFilterChange]);

  // Handle custom date range change with validation and user feedback
  const handleCustomDateChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    const date = value ? new Date(value) : null;
    
    // Validate date range with user feedback
    if (field === 'startDate' && customDateRange.endDate && date && date > customDateRange.endDate) {
      // Show error feedback instead of silently returning
      alert('Start date cannot be after end date. Please select a valid date range.');
      return;
    }
    if (field === 'endDate' && customDateRange.startDate && date && date < customDateRange.startDate) {
      // Show error feedback instead of silently returning
      alert('End date cannot be before start date. Please select a valid date range.');
      return;
    }
    
    // Additional validation: dates cannot be in the future
    if (date && date > new Date()) {
      alert('Selected date cannot be in the future. Please select a past or current date.');
      return;
    }
    
    const newCustomRange = {
      ...customDateRange,
      [field]: date
    };
    setCustomDateRange(newCustomRange);

    if (selectedTimePreset === TIME_RANGE_PRESETS.length - 1) {
      // Only update if custom preset is selected
      onFilterChange({
        ...activeFilters,
        timeRange: newCustomRange
      });
    }
  }, [customDateRange, selectedTimePreset, activeFilters, onFilterChange]);

  // Enhanced keyboard navigation for author suggestions with proper focus management
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Reset active suggestion when suggestions are hidden
  useEffect(() => {
    if (!showAuthorSuggestions) {
      setActiveSuggestionIndex(-1);
    }
  }, [showAuthorSuggestions]);
  
  const handleAuthorKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAuthorSuggestions || authorSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < authorSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : authorSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < authorSuggestions.length) {
          handleAuthorAdd(authorSuggestions[activeSuggestionIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowAuthorSuggestions(false);
        setActiveSuggestionIndex(-1);
        break;
      case 'Tab':
        // Allow default tab behavior but close suggestions
        setShowAuthorSuggestions(false);
        setActiveSuggestionIndex(-1);
        break;
    }
  }, [showAuthorSuggestions, authorSuggestions.length, activeSuggestionIndex, authorSuggestions]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    return (
      activeFilters.flair.length +
      activeFilters.author.length +
      activeFilters.contentType.length +
      (activeFilters.timeRange.startDate || activeFilters.timeRange.endDate ? 1 : 0)
    );
  }, [activeFilters]);

  // Format date for input
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  if (isCollapsed) {
    return (
      <div className={`bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleCollapse}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <span className="text-lg">🔽</span>
              <span className="font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={onClearFilters}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleCollapse}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <span className="text-lg">🔼</span>
            <span className="font-medium">Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Filter Content */}
      <div className="p-4 space-y-6">
        {/* Flair Filters */}
        {availableFlairs.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Filter by Flair
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableFlairs.map((flair) => {
                const isActive = activeFilters.flair.includes(flair.id);
                return (
                  <button
                    key={flair.id}
                    onClick={() => handleFlairToggle(flair.id)}
                    className={`
                      inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                      transition-all duration-200 border
                      ${isActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }
                    `}
                    style={{
                      backgroundColor: isActive ? flair.backgroundColor : undefined,
                      color: isActive ? flair.textColor : undefined,
                      borderColor: isActive ? flair.color : undefined
                    }}
                  >
                    {flair.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Author Filters */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Filter by Author
          </h3>
          
          {/* Selected Authors */}
          {activeFilters.author.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {activeFilters.author.map((authorUsername) => (
                <div
                  key={authorUsername}
                  className="inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs"
                >
                  <span>@{authorUsername}</span>
                  <button
                    onClick={() => handleAuthorRemove(authorUsername)}
                    className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Author Search */}
          <div className="relative">
            <label htmlFor="author-search" className="sr-only">Search for authors</label>
            <input
              id="author-search"
              type="text"
              placeholder="Search for authors..."
              value={authorSearch}
              onChange={(e) => {
                setAuthorSearch(e.target.value);
                setActiveSuggestionIndex(-1); // Reset active suggestion when typing
              }}
              onKeyDown={handleAuthorKeyDown}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-autocomplete="list"
              aria-expanded={showAuthorSuggestions}
              aria-controls="author-suggestions-list"
              role="combobox"
              aria-activedescendant={activeSuggestionIndex >= 0 ? `author-option-${authorSuggestions[activeSuggestionIndex]?.id}` : undefined}
            />
            
            {/* Author Suggestions */}
            {showAuthorSuggestions && authorSuggestions.length > 0 && (
              <div 
                id="author-suggestions-list"
                className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
                role="listbox"
                aria-label="Author suggestions"
              >
                {authorSuggestions.map((author, index) => (
                  <button
                    key={author.id}
                    id={`author-option-${author.id}`}
                    onClick={() => handleAuthorAdd(author)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between focus:outline-none transition-colors ${
                      index === activeSuggestionIndex
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700'
                    }`}
                    role="option"
                    aria-selected={index === activeSuggestionIndex}
                    tabIndex={-1}
                    aria-label={`Add author @${author.username}${author.displayName ? ` (${author.displayName})` : ''}`}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAuthorAdd(author);
                      }
                      // Allow Escape to close the suggestions
                      if (e.key === 'Escape') {
                        setShowAuthorSuggestions(false);
                        setActiveSuggestionIndex(-1);
                        document.getElementById('author-search')?.focus();
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        @{author.username}
                      </div>
                      {author.displayName && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {author.displayName}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {author.postCount} posts
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Type Filters */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Content Type
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPE_OPTIONS.map((option) => {
              const isActive = activeFilters.contentType.includes(option.type);
              return (
                <button
                  key={option.type}
                  onClick={() => handleContentTypeToggle(option.type)}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
                    transition-all duration-200 border
                    ${isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                  title={option.description}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Range Filters */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Time Period
          </h3>
          
          {/* Time Presets */}
          <div className="flex flex-wrap gap-2 mb-3">
            {TIME_RANGE_PRESETS.map((preset, index) => (
              <button
                key={preset.label}
                onClick={() => handleTimePresetSelect(index)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                  ${selectedTimePreset === index
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }
                `}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {selectedTimePreset === TIME_RANGE_PRESETS.length - 1 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="date-from" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  From
                </label>
                <input
                  id="date-from"
                  type="date"
                  value={formatDateForInput(customDateRange.startDate)}
                  onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="date-to" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  To
                </label>
                <input
                  id="date-to"
                  type="date"
                  value={formatDateForInput(customDateRange.endDate)}
                  onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}