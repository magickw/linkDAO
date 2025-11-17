import { useState, useEffect, useCallback } from 'react';
import { FilterState, ContentType, DateRange } from '../types/communityFilter';
import { EnhancedPost } from '../types/communityEnhancements';

const DEFAULT_FILTER_STATE: FilterState = {
  flair: [],
  author: [],
  timeRange: { startDate: null, endDate: null },
  contentType: []
};

interface UseFilterStateOptions {
  communityId?: string;
  persistKey?: string;
  onFilterChange?: (filters: FilterState) => void;
}

export function useFilterState({
  communityId,
  persistKey,
  onFilterChange
}: UseFilterStateOptions = {}) {
  const storageKey = persistKey || `community-filters-${communityId || 'default'}`;
  
  // Initialize state from localStorage or defaults
  const [filterState, setFilterState] = useState<FilterState>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_FILTER_STATE;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        if (parsed.timeRange) {
          parsed.timeRange.startDate = parsed.timeRange.startDate 
            ? new Date(parsed.timeRange.startDate) 
            : null;
          parsed.timeRange.endDate = parsed.timeRange.endDate 
            ? new Date(parsed.timeRange.endDate) 
            : null;
        }
        return { ...DEFAULT_FILTER_STATE, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load filter state from localStorage:', error);
    }

    return DEFAULT_FILTER_STATE;
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(filterState));
    } catch (error) {
      console.warn('Failed to save filter state to localStorage:', error);
    }
  }, [filterState, storageKey]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilterState(newFilters);
    onFilterChange?.(newFilters);
  }, [onFilterChange]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedState = { ...DEFAULT_FILTER_STATE };
    setFilterState(clearedState);
    onFilterChange?.(clearedState);
  }, [onFilterChange]);

  // Add flair filter
  const addFlairFilter = useCallback((flairId: string) => {
    if (!filterState.flair.includes(flairId)) {
      const newState = {
        ...filterState,
        flair: [...filterState.flair, flairId]
      };
      handleFilterChange(newState);
    }
  }, [filterState, handleFilterChange]);

  // Remove flair filter
  const removeFlairFilter = useCallback((flairId: string) => {
    const newState = {
      ...filterState,
      flair: filterState.flair.filter(id => id !== flairId)
    };
    handleFilterChange(newState);
  }, [filterState, handleFilterChange]);

  // Add author filter
  const addAuthorFilter = useCallback((authorUsername: string) => {
    if (!filterState.author.includes(authorUsername)) {
      const newState = {
        ...filterState,
        author: [...filterState.author, authorUsername]
      };
      handleFilterChange(newState);
    }
  }, [filterState, handleFilterChange]);

  // Remove author filter
  const removeAuthorFilter = useCallback((authorUsername: string) => {
    const newState = {
      ...filterState,
      author: filterState.author.filter(username => username !== authorUsername)
    };
    handleFilterChange(newState);
  }, [filterState, handleFilterChange]);

  // Set time range filter
  const setTimeRangeFilter = useCallback((timeRange: DateRange) => {
    const newState = {
      ...filterState,
      timeRange
    };
    handleFilterChange(newState);
  }, [filterState, handleFilterChange]);

  // Add content type filter
  const addContentTypeFilter = useCallback((contentType: ContentType) => {
    if (!filterState.contentType.includes(contentType)) {
      const newState = {
        ...filterState,
        contentType: [...filterState.contentType, contentType]
      };
      handleFilterChange(newState);
    }
  }, [filterState, handleFilterChange]);

  // Remove content type filter
  const removeContentTypeFilter = useCallback((contentType: ContentType) => {
    const newState = {
      ...filterState,
      contentType: filterState.contentType.filter(type => type !== contentType)
    };
    handleFilterChange(newState);
  }, [filterState, handleFilterChange]);

  // Check if any filters are active
  const hasActiveFilters = useCallback(() => {
    return (
      filterState.flair.length > 0 ||
      filterState.author.length > 0 ||
      filterState.contentType.length > 0 ||
      filterState.timeRange.startDate !== null ||
      filterState.timeRange.endDate !== null
    );
  }, [filterState]);

  // Get active filter count
  const getActiveFilterCount = useCallback(() => {
    return (
      filterState.flair.length +
      filterState.author.length +
      filterState.contentType.length +
      (filterState.timeRange.startDate || filterState.timeRange.endDate ? 1 : 0)
    );
  }, [filterState]);

  // Apply filters to a list of posts (utility function)
  const applyFilters = useCallback((posts: EnhancedPost[]) => {
    return posts.filter(post => {
      // Flair filter
      if (filterState.flair.length > 0) {
        if (!post.flair || !filterState.flair.includes(post.flair.id)) {
          return false;
        }
      }

      // Author filter
      if (filterState.author.length > 0) {
        if (!filterState.author.includes(post.author.username)) {
          return false;
        }
      }

      // Content type filter
      if (filterState.contentType.length > 0) {
        const postType = determinePostType(post);
        if (!filterState.contentType.includes(postType)) {
          return false;
        }
      }

      // Time range filter
      if (filterState.timeRange.startDate || filterState.timeRange.endDate) {
        const postDate = new Date(post.timestamp);
        
        if (filterState.timeRange.startDate && postDate < filterState.timeRange.startDate) {
          return false;
        }
        
        if (filterState.timeRange.endDate && postDate > filterState.timeRange.endDate) {
          return false;
        }
      }

      return true;
    });
  }, [filterState]);

  return {
    filterState,
    handleFilterChange,
    clearFilters,
    addFlairFilter,
    removeFlairFilter,
    addAuthorFilter,
    removeAuthorFilter,
    setTimeRangeFilter,
    addContentTypeFilter,
    removeContentTypeFilter,
    hasActiveFilters,
    getActiveFilterCount,
    applyFilters
  };
}

// Helper function to determine post type
function determinePostType(post: any): ContentType {
  if (post.poll) return ContentType.POLL;
  if (post.proposal) return ContentType.PROPOSAL;
  if (post.mediaCids && post.mediaCids.length > 0) {
    // This is a simplified check - in reality you'd need to check media types
    return ContentType.IMAGE;
  }
  if (post.content && post.content.includes('http')) {
    return ContentType.LINK;
  }
  return ContentType.TEXT;
}

// Hook for managing filter panel collapse state
export function useFilterPanelState(initialCollapsed = true) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const expand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  return {
    isCollapsed,
    toggleCollapse,
    collapse,
    expand
  };
}