import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useBreakpoints } from '../useMediaQuery';

// Mock matchMedia
const mockMatchMedia = jest.fn();

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  });
});

describe('useMediaQuery', () => {
  let mockMediaQueryList: {
    matches: boolean;
    media: string;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
  };

  beforeEach(() => {
    mockMediaQueryList = {
      matches: false,
      media: '',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    mockMatchMedia.mockReturnValue(mockMediaQueryList);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial match state', () => {
    mockMediaQueryList.matches = true;
    
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    expect(result.current).toBe(true);
    expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 768px)');
  });

  it('returns false when media query does not match', () => {
    mockMediaQueryList.matches = false;
    
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    expect(result.current).toBe(false);
  });

  it('adds event listener on mount', () => {
    renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('removes event listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    unmount();
    
    expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('updates state when media query changes', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    expect(result.current).toBe(false);
    
    // Simulate media query change
    const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1];
    act(() => {
      changeHandler({ matches: true });
    });
    
    expect(result.current).toBe(true);
  });

  it('handles multiple query changes', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1];
    
    // First change
    act(() => {
      changeHandler({ matches: true });
    });
    expect(result.current).toBe(true);
    
    // Second change
    act(() => {
      changeHandler({ matches: false });
    });
    expect(result.current).toBe(false);
    
    // Third change
    act(() => {
      changeHandler({ matches: true });
    });
    expect(result.current).toBe(true);
  });

  it('handles different query strings', () => {
    const { result: result1 } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    const { result: result2 } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    
    expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 767px)');
    expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
  });

  it('handles server-side rendering gracefully', () => {
    // Mock window as undefined to simulate SSR
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;
    
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    expect(result.current).toBe(false);
    
    // Restore window
    global.window = originalWindow;
  });

  it('re-registers listener when query changes', () => {
    const { rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: '(min-width: 768px)' } }
    );
    
    expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 768px)');
    
    // Change the query
    rerender({ query: '(min-width: 1024px)' });
    
    expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
    expect(mockMediaQueryList.removeEventListener).toHaveBeenCalled();
  });
});

describe('useBreakpoints', () => {
  let mockMediaQueryLists: { [key: string]: any };

  beforeEach(() => {
    mockMediaQueryLists = {};
    
    mockMatchMedia.mockImplementation((query: string) => {
      if (!mockMediaQueryLists[query]) {
        mockMediaQueryLists[query] = {
          matches: false,
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      return mockMediaQueryLists[query];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns all breakpoint states', () => {
    const { result } = renderHook(() => useBreakpoints());
    
    expect(result.current).toEqual({
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      isLargeDesktop: false,
      isMobileOrTablet: false,
      isTabletOrDesktop: false,
    });
  });

  it('correctly identifies mobile breakpoint', () => {
    mockMediaQueryLists['(max-width: 767px)'] = {
      matches: true,
      media: '(max-width: 767px)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    const { result } = renderHook(() => useBreakpoints());
    
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isMobileOrTablet).toBe(true);
    expect(result.current.isTabletOrDesktop).toBe(false);
  });

  it('correctly identifies tablet breakpoint', () => {
    mockMediaQueryLists['(min-width: 768px) and (max-width: 1023px)'] = {
      matches: true,
      media: '(min-width: 768px) and (max-width: 1023px)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    const { result } = renderHook(() => useBreakpoints());
    
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobileOrTablet).toBe(true);
    expect(result.current.isTabletOrDesktop).toBe(true);
  });

  it('correctly identifies desktop breakpoint', () => {
    mockMediaQueryLists['(min-width: 1024px)'] = {
      matches: true,
      media: '(min-width: 1024px)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    const { result } = renderHook(() => useBreakpoints());
    
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobileOrTablet).toBe(false);
    expect(result.current.isTabletOrDesktop).toBe(true);
  });

  it('correctly identifies large desktop breakpoint', () => {
    mockMediaQueryLists['(min-width: 1280px)'] = {
      matches: true,
      media: '(min-width: 1280px)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    const { result } = renderHook(() => useBreakpoints());
    
    expect(result.current.isLargeDesktop).toBe(true);
  });

  it('updates breakpoint states when media queries change', () => {
    const { result } = renderHook(() => useBreakpoints());
    
    expect(result.current.isMobile).toBe(false);
    
    // Simulate mobile breakpoint activation
    const mobileQuery = mockMediaQueryLists['(max-width: 767px)'];
    const changeHandler = mobileQuery.addEventListener.mock.calls[0][1];
    
    act(() => {
      changeHandler({ matches: true });
    });
    
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isMobileOrTablet).toBe(true);
  });

  it('handles multiple simultaneous breakpoint changes', () => {
    const { result } = renderHook(() => useBreakpoints());
    
    // Activate tablet breakpoint
    const tabletQuery = mockMediaQueryLists['(min-width: 768px) and (max-width: 1023px)'];
    const tabletChangeHandler = tabletQuery.addEventListener.mock.calls[0][1];
    
    act(() => {
      tabletChangeHandler({ matches: true });
    });
    
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobileOrTablet).toBe(true);
    expect(result.current.isTabletOrDesktop).toBe(true);
    
    // Deactivate tablet and activate desktop
    act(() => {
      tabletChangeHandler({ matches: false });
    });
    
    const desktopQuery = mockMediaQueryLists['(min-width: 1024px)'];
    const desktopChangeHandler = desktopQuery.addEventListener.mock.calls[0][1];
    
    act(() => {
      desktopChangeHandler({ matches: true });
    });
    
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobileOrTablet).toBe(false);
    expect(result.current.isTabletOrDesktop).toBe(true);
  });

  it('provides correct convenience flags', () => {
    // Test mobile or tablet
    mockMediaQueryLists['(max-width: 767px)'] = {
      matches: true,
      media: '(max-width: 767px)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    const { result } = renderHook(() => useBreakpoints());
    
    expect(result.current.isMobileOrTablet).toBe(true);
    expect(result.current.isTabletOrDesktop).toBe(false);
  });
});