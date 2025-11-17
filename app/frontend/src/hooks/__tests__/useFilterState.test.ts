import { renderHook, act } from '@testing-library/react';
import { useFilterState, useFilterPanelState } from '../useFilterState';
import { ContentType } from '../../types/communityFilter';
import { describe, it, beforeEach } from 'node:test';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useFilterState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with default state when no stored data', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useFilterState());

      expect(result.current.filterState).toEqual({
        flair: [],
        author: [],
        timeRange: { startDate: null, endDate: null },
        contentType: []
      });
    });

    it('initializes with stored data when available', () => {
      const storedData = {
        flair: ['1', '2'],
        author: ['user1'],
        timeRange: { 
          startDate: '2023-01-01T00:00:00.000Z', 
          endDate: '2023-01-31T23:59:59.999Z' 
        },
        contentType: [ContentType.TEXT]
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const { result } = renderHook(() => useFilterState());

      expect(result.current.filterState.flair).toEqual(['1', '2']);
      expect(result.current.filterState.author).toEqual(['user1']);
      expect(result.current.filterState.contentType).toEqual([ContentType.TEXT]);
      expect(result.current.filterState.timeRange.startDate).toBeInstanceOf(Date);
      expect(result.current.filterState.timeRange.endDate).toBeInstanceOf(Date);
    });

    it('handles corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useFilterState());

      expect(result.current.filterState).toEqual({
        flair: [],
        author: [],
        timeRange: { startDate: null, endDate: null },
        contentType: []
      });
    });

    it('uses custom storage key when provided', () => {
      const { result } = renderHook(() => 
        useFilterState({ persistKey: 'custom-key' })
      );

      act(() => {
        result.current.addFlairFilter('test');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'custom-key',
        expect.any(String)
      );
    });

    it('uses community-specific storage key', () => {
      const { result } = renderHook(() => 
        useFilterState({ communityId: 'test-community' })
      );

      act(() => {
        result.current.addFlairFilter('test');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'community-filters-test-community',
        expect.any(String)
      );
    });
  });

  describe('Filter Management', () => {
    it('adds flair filter correctly', () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addFlairFilter('flair1');
      });

      expect(result.current.filterState.flair).toEqual(['flair1']);
    });

    it('does not add duplicate flair filters', () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addFlairFilter('flair1');
        result.current.addFlairFilter('flair1');
      });

      expect(result.current.filterState.flair).toEqual(['flair1']);
    });

    it('removes flair filter correctly', () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addFlairFilter('flair1');
      });

      act(() => {
        result.current.addFlairFilter('flair2');
      });

      act(() => {
        result.current.removeFlairFilter('flair1');
      });

      expect(result.current.filterState.flair).toEqual(['flair2']);
    });

    it('adds author filter correctly', () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addAuthorFilter('user1');
      });

      expect(result.current.filterState.author).toEqual(['user1']);
    });

    it('does not add duplicate author filters', () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addAuthorFilter('user1');
        result.current.addAuthorFilter('user1');
      });

      expect(result.current.filterState.author).toEqual(['user1']);
    });

    it('removes author filter correctly', () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addAuthorFilter('user1');
      });

      act(() => {
        result.current.addAuthorFilter('user2');
      });

      act(() => {
        result.current.removeAuthorFilter('user1');
      });

      expect(result.current.filterState.author).toEqual(['user2']);
    });

    it('sets time range filter correctly', () => {
      const { result } = renderHook(() => useFilterState());
      const timeRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      act(() => {
        result.current.setTimeRangeFilter(timeRange);
      });

      expect(result.current.filterState.timeRange).toEqual(timeRange);
    });

    it('adds content type filter correctly', () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addContentTypeFilter(ContentType.TEXT);
      });

      expect(result.current.filterState.contentType).toEqual([ContentType.TEXT]);
    });

    it('does not add duplicate content type filters', () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addContentTypeFilter(ContentType.TEXT);
        result.current.addContentTypeFilter(ContentType.TEXT);
      });

      expect(result.current.filterState.contentType).toEqual([ContentType.TEXT]);
    });

    it('removes content type filter correctly', () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addContentTypeFilter(ContentType.TEXT);
      });

      act(() => {
        result.current.addContentTypeFilter(ContentType.IMAGE);
      });

      act(() => {
        result.current.removeContentTypeFilter(ContentType.TEXT);
      });

      expect(result.current.filterState.contentType).toEqual([ContentType.IMAGE]);
    });
  });

  describe('Filter State Management', () => {
    it('handles filter change correctly', () => {
      const onFilterChange = jest.fn();
      const { result } = renderHook(() => useFilterState({ onFilterChange }));

      const newFilters = {
        flair: ['flair1'],
        author: ['user1'],
        timeRange: { startDate: null, endDate: null },
        contentType: [ContentType.TEXT]
      };

      act(() => {
        result.current.handleFilterChange(newFilters);
      });

      expect(result.current.filterState).toEqual(newFilters);
      expect(onFilterChange).toHaveBeenCalledWith(newFilters);
    });

    it('clears all filters correctly', () => {
      const onFilterChange = jest.fn();
      const { result } = renderHook(() => useFilterState({ onFilterChange }));

      // Add some filters first
      act(() => {
        result.current.addFlairFilter('flair1');
        result.current.addAuthorFilter('user1');
      });

      // Clear all filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filterState).toEqual({
        flair: [],
        author: [],
        timeRange: { startDate: null, endDate: null },
        contentType: []
      });
      expect(onFilterChange).toHaveBeenCalledWith({
        flair: [],
        author: [],
        timeRange: { startDate: null, endDate: null },
        contentType: []
      });
    });

    it('detects active filters correctly', () => {
      const { result } = renderHook(() => useFilterState());

      expect(result.current.hasActiveFilters()).toBe(false);

      act(() => {
        result.current.addFlairFilter('flair1');
      });

      expect(result.current.hasActiveFilters()).toBe(true);
    });

    it('counts active filters correctly', () => {
      const { result } = renderHook(() => useFilterState());

      expect(result.current.getActiveFilterCount()).toBe(0);

      act(() => {
        result.current.addFlairFilter('flair1');
      });

      act(() => {
        result.current.addFlairFilter('flair2');
      });

      act(() => {
        result.current.addAuthorFilter('user1');
      });

      act(() => {
        result.current.setTimeRangeFilter({
          startDate: new Date(),
          endDate: new Date()
        });
      });

      expect(result.current.getActiveFilterCount()).toBe(4); // 2 flairs + 1 author + 1 time range
    });
  });

  describe('Filter Application', () => {
    it('applies flair filters correctly', () => {
      const { result } = renderHook(() => useFilterState());
      const posts = [
        { id: '1', flair: 'discussion', author: 'user1', createdAt: new Date() },
        { id: '2', flair: 'question', author: 'user2', createdAt: new Date() },
        { id: '3', flair: 'discussion', author: 'user3', createdAt: new Date() }
      ];

      act(() => {
        result.current.addFlairFilter('discussion');
      });

      const filteredPosts = result.current.applyFilters(posts);
      expect(filteredPosts).toHaveLength(2);
      expect(filteredPosts.every(post => post.flair === 'discussion')).toBe(true);
    });

    it('applies author filters correctly', () => {
      const { result } = renderHook(() => useFilterState());
      const posts = [
        { id: '1', flair: 'discussion', author: 'user1', createdAt: new Date() },
        { id: '2', flair: 'question', author: 'user2', createdAt: new Date() },
        { id: '3', flair: 'discussion', author: 'user1', createdAt: new Date() }
      ];

      act(() => {
        result.current.addAuthorFilter('user1');
      });

      const filteredPosts = result.current.applyFilters(posts);
      expect(filteredPosts).toHaveLength(2);
      expect(filteredPosts.every(post => post.author === 'user1')).toBe(true);
    });

    it('applies time range filters correctly', () => {
      const { result } = renderHook(() => useFilterState());
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const posts = [
        { id: '1', author: 'user1', createdAt: yesterday },
        { id: '2', author: 'user2', createdAt: now },
        { id: '3', author: 'user3', createdAt: tomorrow }
      ];

      act(() => {
        result.current.setTimeRangeFilter({
          startDate: now,
          endDate: tomorrow
        });
      });

      const filteredPosts = result.current.applyFilters(posts);
      expect(filteredPosts).toHaveLength(2);
    });

    it('applies multiple filters simultaneously', () => {
      const { result } = renderHook(() => useFilterState());
      const posts = [
        { id: '1', flair: 'discussion', author: 'user1', createdAt: new Date() },
        { id: '2', flair: 'question', author: 'user1', createdAt: new Date() },
        { id: '3', flair: 'discussion', author: 'user2', createdAt: new Date() }
      ];

      act(() => {
        result.current.addFlairFilter('discussion');
      });

      act(() => {
        result.current.addAuthorFilter('user1');
      });

      const filteredPosts = result.current.applyFilters(posts);
      expect(filteredPosts).toHaveLength(1);
      expect(filteredPosts[0].id).toBe('1');
    });
  });

  describe('Persistence', () => {
    it('saves state to localStorage on changes', () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.addFlairFilter('flair1');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'community-filters-default',
        expect.stringContaining('flair1')
      );
    });

    it('handles localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useFilterState());

      expect(() => {
        act(() => {
          result.current.addFlairFilter('flair1');
        });
      }).not.toThrow();
    });
  });
});

describe('useFilterPanelState', () => {
  it('initializes with default collapsed state', () => {
    const { result } = renderHook(() => useFilterPanelState());

    expect(result.current.isCollapsed).toBe(true);
  });

  it('initializes with custom collapsed state', () => {
    const { result } = renderHook(() => useFilterPanelState(false));

    expect(result.current.isCollapsed).toBe(false);
  });

  it('toggles collapse state correctly', () => {
    const { result } = renderHook(() => useFilterPanelState());

    expect(result.current.isCollapsed).toBe(true);

    act(() => {
      result.current.toggleCollapse();
    });

    expect(result.current.isCollapsed).toBe(false);

    act(() => {
      result.current.toggleCollapse();
    });

    expect(result.current.isCollapsed).toBe(true);
  });

  it('collapses correctly', () => {
    const { result } = renderHook(() => useFilterPanelState(false));

    expect(result.current.isCollapsed).toBe(false);

    act(() => {
      result.current.collapse();
    });

    expect(result.current.isCollapsed).toBe(true);
  });

  it('expands correctly', () => {
    const { result } = renderHook(() => useFilterPanelState(true));

    expect(result.current.isCollapsed).toBe(true);

    act(() => {
      result.current.expand();
    });

    expect(result.current.isCollapsed).toBe(false);
  });
});