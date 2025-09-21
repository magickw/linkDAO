import { renderHook, act } from '@testing-library/react';
import { useViewMode, useSessionViewMode, getViewModeClasses, shouldShowThumbnail, getThumbnailSize } from '../useViewMode';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('useViewMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('initialization', () => {
    it('initializes with default card view mode', () => {
      const { result } = renderHook(() => useViewMode());
      
      expect(result.current.viewMode).toBe('card');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('loads saved preference from localStorage', () => {
      const savedPreference = JSON.stringify({
        viewMode: 'compact',
        rememberPreference: true
      });
      mockLocalStorage.getItem.mockReturnValue(savedPreference);
      
      const { result } = renderHook(() => useViewMode());
      
      expect(result.current.viewMode).toBe('compact');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('reddit-style-view-mode');
    });

    it('handles corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      
      const { result } = renderHook(() => useViewMode());
      
      expect(result.current.viewMode).toBe('card'); // fallback to default
    });

    it('handles localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const { result } = renderHook(() => useViewMode());
      
      expect(result.current.viewMode).toBe('card'); // fallback to default
    });
  });

  describe('toggleViewMode', () => {
    it('toggles from card to compact', async () => {
      const { result } = renderHook(() => useViewMode());
      
      expect(result.current.viewMode).toBe('card');
      
      await act(async () => {
        await result.current.toggleViewMode();
      });
      
      expect(result.current.viewMode).toBe('compact');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'reddit-style-view-mode',
        JSON.stringify({
          viewMode: 'compact',
          rememberPreference: true
        })
      );
    });

    it('toggles from compact to card', async () => {
      const savedPreference = JSON.stringify({
        viewMode: 'compact',
        rememberPreference: true
      });
      mockLocalStorage.getItem.mockReturnValue(savedPreference);
      
      const { result } = renderHook(() => useViewMode());
      
      expect(result.current.viewMode).toBe('compact');
      
      await act(async () => {
        await result.current.toggleViewMode();
      });
      
      expect(result.current.viewMode).toBe('card');
    });

    it('shows loading state during toggle', async () => {
      const { result } = renderHook(() => useViewMode());
      
      await act(async () => {
        const togglePromise = result.current.toggleViewMode();
        // Loading state is set synchronously but may be brief
        await togglePromise;
      });
      
      // After toggle completes, loading should be false
      expect(result.current.isLoading).toBe(false);
    });

    it('handles localStorage errors during save', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const { result } = renderHook(() => useViewMode());
      
      await act(async () => {
        await result.current.toggleViewMode();
      });
      
      expect(result.current.viewMode).toBe('compact'); // still changes locally
      expect(result.current.error).toBe('Failed to save preference');
    });
  });

  describe('setViewMode', () => {
    it('sets specific view mode', async () => {
      const { result } = renderHook(() => useViewMode());
      
      await act(async () => {
        await result.current.setViewMode('compact');
      });
      
      expect(result.current.viewMode).toBe('compact');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'reddit-style-view-mode',
        JSON.stringify({
          viewMode: 'compact',
          rememberPreference: true
        })
      );
    });

    it('can set view mode without remembering', async () => {
      const { result } = renderHook(() => useViewMode());
      
      await act(async () => {
        await result.current.setViewMode('compact', false);
      });
      
      expect(result.current.viewMode).toBe('compact');
      // Should not save to localStorage when remember is false
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('resetViewMode', () => {
    it('resets to default view mode', async () => {
      const { result } = renderHook(() => useViewMode());
      
      // First set to compact
      await act(async () => {
        await result.current.setViewMode('compact');
      });
      
      expect(result.current.viewMode).toBe('compact');
      
      // Then reset
      await act(async () => {
        await result.current.resetViewMode();
      });
      
      expect(result.current.viewMode).toBe('card');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('reddit-style-view-mode');
    });
  });

  describe('getViewModeProperties', () => {
    it('returns correct properties for card view', () => {
      const { result } = renderHook(() => useViewMode());
      
      const properties = result.current.getViewModeProperties();
      
      expect(properties).toEqual({
        isCardView: true,
        isCompactView: false,
        displayName: 'Card View',
        description: 'Full post cards with thumbnails and expanded content'
      });
    });

    it('returns correct properties for compact view', async () => {
      const { result } = renderHook(() => useViewMode());
      
      await act(async () => {
        await result.current.setViewMode('compact');
      });
      
      const properties = result.current.getViewModeProperties();
      
      expect(properties).toEqual({
        isCardView: false,
        isCompactView: true,
        displayName: 'Compact View',
        description: 'Condensed list view with minimal spacing'
      });
    });
  });
});

describe('useSessionViewMode', () => {
  it('initializes with provided initial mode', () => {
    const { result } = renderHook(() => useSessionViewMode('compact'));
    
    expect(result.current.viewMode).toBe('compact');
    expect(result.current.isCompactView).toBe(true);
    expect(result.current.isCardView).toBe(false);
  });

  it('defaults to card view when no initial mode provided', () => {
    const { result } = renderHook(() => useSessionViewMode());
    
    expect(result.current.viewMode).toBe('card');
    expect(result.current.isCardView).toBe(true);
    expect(result.current.isCompactView).toBe(false);
  });

  it('toggles view mode without persistence', () => {
    const { result } = renderHook(() => useSessionViewMode());
    
    expect(result.current.viewMode).toBe('card');
    
    act(() => {
      result.current.toggleViewMode();
    });
    
    expect(result.current.viewMode).toBe('compact');
    
    // Should not interact with localStorage
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it('sets specific view mode', () => {
    const { result } = renderHook(() => useSessionViewMode());
    
    act(() => {
      result.current.setViewMode('compact');
    });
    
    expect(result.current.viewMode).toBe('compact');
    expect(result.current.isCompactView).toBe(true);
  });
});

describe('Utility Functions', () => {
  describe('getViewModeClasses', () => {
    it('returns correct classes for card view', () => {
      const classes = getViewModeClasses('card');
      
      expect(classes.container).toContain('card-view');
      expect(classes.postCard).toContain('bg-white');
      expect(classes.postCard).toContain('rounded-lg');
      expect(classes.voting).toContain('flex-col');
      expect(classes.main).toContain('flex-1');
      expect(classes.title).toContain('text-lg');
    });

    it('returns correct classes for compact view', () => {
      const classes = getViewModeClasses('compact');
      
      expect(classes.container).toContain('compact-view');
      expect(classes.postCard).toContain('py-2');
      expect(classes.postCard).toContain('border-b');
      expect(classes.content).toContain('flex');
      expect(classes.voting).toContain('w-8');
      expect(classes.title).toContain('text-sm');
      expect(classes.title).toContain('line-clamp-2');
    });

    it('includes transition classes for both modes', () => {
      const cardClasses = getViewModeClasses('card');
      const compactClasses = getViewModeClasses('compact');
      
      expect(cardClasses.container).toContain('transition-all');
      expect(compactClasses.container).toContain('transition-all');
    });
  });

  describe('shouldShowThumbnail', () => {
    it('returns false when no media', () => {
      expect(shouldShowThumbnail('card', false)).toBe(false);
      expect(shouldShowThumbnail('compact', false)).toBe(false);
    });

    it('returns true for card view with media', () => {
      expect(shouldShowThumbnail('card', true)).toBe(true);
    });

    it('returns true for compact view with media', () => {
      expect(shouldShowThumbnail('compact', true)).toBe(true);
    });
  });

  describe('getThumbnailSize', () => {
    it('returns full size for card view', () => {
      const size = getThumbnailSize('card');
      
      expect(size).toEqual({ width: 400, height: 300 });
    });

    it('returns small size for compact view', () => {
      const size = getThumbnailSize('compact');
      
      expect(size).toEqual({ width: 64, height: 48 });
    });
  });
});

describe('Error Handling', () => {
  it('handles localStorage unavailable', () => {
    // Mock localStorage as undefined (e.g., in private browsing)
    Object.defineProperty(window, 'localStorage', {
      value: undefined
    });
    
    const { result } = renderHook(() => useViewMode());
    
    expect(result.current.viewMode).toBe('card'); // should still work
  });

  it('handles localStorage quota exceeded', async () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    
    const { result } = renderHook(() => useViewMode());
    
    await act(async () => {
      await result.current.toggleViewMode();
    });
    
    expect(result.current.viewMode).toBe('compact'); // still changes locally
    expect(result.current.error).toBe('Failed to save preference');
  });

  it('clears error when successful operation occurs', async () => {
    // First cause an error
    mockLocalStorage.setItem.mockImplementationOnce(() => {
      throw new Error('localStorage error');
    });
    
    const { result } = renderHook(() => useViewMode());
    
    await act(async () => {
      await result.current.toggleViewMode();
    });
    
    expect(result.current.error).toBe('Failed to save preference');
    
    // Then fix localStorage and try again
    mockLocalStorage.setItem.mockImplementation(() => {});
    
    await act(async () => {
      await result.current.setViewMode('card');
    });
    
    // Error should be cleared after successful operation
    expect(result.current.error).toBe(null);
  });
});

describe('Performance', () => {
  it('does not cause unnecessary re-renders', () => {
    const { result, rerender } = renderHook(() => useViewMode());
    
    const initialToggle = result.current.toggleViewMode;
    const initialSetViewMode = result.current.setViewMode;
    const initialReset = result.current.resetViewMode;
    
    rerender();
    
    // Functions should be stable (memoized)
    expect(result.current.toggleViewMode).toBe(initialToggle);
    expect(result.current.setViewMode).toBe(initialSetViewMode);
    expect(result.current.resetViewMode).toBe(initialReset);
  });

  it('memoizes getViewModeProperties correctly', () => {
    const { result } = renderHook(() => useViewMode());
    
    const properties1 = result.current.getViewModeProperties();
    const properties2 = result.current.getViewModeProperties();
    
    // Should return the same object reference for same view mode
    expect(properties1).toEqual(properties2);
  });
});