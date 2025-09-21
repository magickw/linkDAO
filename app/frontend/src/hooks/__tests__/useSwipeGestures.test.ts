import { renderHook, act } from '@testing-library/react';
import { useSwipeGestures, usePostCardSwipeGestures } from '../useSwipeGestures';

// Mock haptic feedback
const mockVibrate = jest.fn();
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true
});

// Mock touch support
Object.defineProperty(window, 'ontouchstart', {
  value: true,
  writable: true
});

describe('useSwipeGestures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVibrate.mockClear();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useSwipeGestures({}));

    expect(result.current.swipeState).toEqual({
      isActive: false,
      direction: null,
      distance: 0,
      velocity: 0,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    });
    expect(result.current.isSwipeSupported).toBe(true);
  });

  it('should detect touch support correctly', () => {
    const { result } = renderHook(() => useSwipeGestures({}));
    expect(result.current.isSwipeSupported).toBe(true);
  });

  it('should handle touch start correctly', () => {
    const { result } = renderHook(() => useSwipeGestures({}));

    const mockTouchEvent = {
      touches: [{ clientX: 100, clientY: 200 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchStart(mockTouchEvent);
    });

    expect(result.current.swipeState.isActive).toBe(true);
    expect(result.current.swipeState.startX).toBe(100);
    expect(result.current.swipeState.startY).toBe(200);
  });

  it('should calculate swipe direction correctly for left swipe', () => {
    const onSwipeLeft = jest.fn();
    const { result } = renderHook(() => useSwipeGestures({ 
      onSwipeLeft,
      velocityThreshold: 0.1 // Lower threshold for testing
    }));

    // Start touch
    const startEvent = {
      touches: [{ clientX: 200, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchStart(startEvent);
    });

    // Move left
    const moveEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchMove(moveEvent);
    });

    expect(result.current.swipeState.direction).toBe('left');
    expect(result.current.swipeState.distance).toBe(100);

    // End touch with sufficient time for velocity
    setTimeout(() => {
      act(() => {
        result.current.swipeHandlers.onTouchEnd({} as React.TouchEvent);
      });
      expect(onSwipeLeft).toHaveBeenCalledWith(100);
    }, 100);
  });

  it('should calculate swipe direction correctly for right swipe', () => {
    const onSwipeRight = jest.fn();
    const { result } = renderHook(() => useSwipeGestures({ 
      onSwipeRight,
      velocityThreshold: 0.1 // Lower threshold for testing
    }));

    // Start touch
    const startEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchStart(startEvent);
    });

    // Move right
    const moveEvent = {
      touches: [{ clientX: 200, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchMove(moveEvent);
    });

    expect(result.current.swipeState.direction).toBe('right');
    expect(result.current.swipeState.distance).toBe(100);

    // End touch with sufficient time for velocity
    setTimeout(() => {
      act(() => {
        result.current.swipeHandlers.onTouchEnd({} as React.TouchEvent);
      });
      expect(onSwipeRight).toHaveBeenCalledWith(100);
    }, 100);
  });

  it('should not trigger callback if distance is below threshold', () => {
    const onSwipeLeft = jest.fn();
    const { result } = renderHook(() => useSwipeGestures({ 
      onSwipeLeft, 
      threshold: 100 
    }));

    // Start touch
    const startEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchStart(startEvent);
    });

    // Small move (below threshold)
    const moveEvent = {
      touches: [{ clientX: 80, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchMove(moveEvent);
    });

    // End touch
    act(() => {
      result.current.swipeHandlers.onTouchEnd({} as React.TouchEvent);
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('should reset state on touch cancel', () => {
    const { result } = renderHook(() => useSwipeGestures({}));

    // Start touch
    const startEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchStart(startEvent);
    });

    expect(result.current.swipeState.isActive).toBe(true);

    // Cancel touch
    act(() => {
      result.current.swipeHandlers.onTouchCancel({} as React.TouchEvent);
    });

    expect(result.current.swipeState.isActive).toBe(false);
    expect(result.current.swipeState.direction).toBe(null);
  });

  it('should trigger haptic feedback when enabled', () => {
    const { result } = renderHook(() => useSwipeGestures({ 
      enableHapticFeedback: true,
      onSwipeLeft: jest.fn()
    }));

    // Start touch
    const startEvent = {
      touches: [{ clientX: 200, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchStart(startEvent);
    });

    // Move to trigger threshold
    const moveEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchMove(moveEvent);
    });

    // End touch
    act(() => {
      result.current.swipeHandlers.onTouchEnd({} as React.TouchEvent);
    });

    expect(mockVibrate).toHaveBeenCalled();
  });

  it('should not trigger haptic feedback when disabled', () => {
    const { result } = renderHook(() => useSwipeGestures({ 
      enableHapticFeedback: false,
      onSwipeLeft: jest.fn()
    }));

    // Start touch
    const startEvent = {
      touches: [{ clientX: 200, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchStart(startEvent);
    });

    // Move and end
    const moveEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    } as React.TouchEvent;

    act(() => {
      result.current.swipeHandlers.onTouchMove(moveEvent);
    });

    act(() => {
      result.current.swipeHandlers.onTouchEnd({} as React.TouchEvent);
    });

    expect(mockVibrate).not.toHaveBeenCalled();
  });
});

describe('usePostCardSwipeGestures', () => {
  it('should configure swipe gestures for post card actions', () => {
    const mockOnVote = jest.fn();
    const mockOnSave = jest.fn();
    const mockOnShare = jest.fn();

    const { result } = renderHook(() => 
      usePostCardSwipeGestures('post-1', mockOnVote, mockOnSave, mockOnShare)
    );

    expect(result.current.isSwipeSupported).toBe(true);
    expect(result.current.swipeState.isActive).toBe(false);
  });

  it('should handle left swipe for voting', () => {
    const mockOnVote = jest.fn();
    const { result } = renderHook(() => 
      usePostCardSwipeGestures('post-1', mockOnVote)
    );

    // Simulate left swipe (short distance for upvote)
    act(() => {
      result.current.swipeHandlers.onTouchStart({
        touches: [{ clientX: 200, clientY: 100 }]
      } as React.TouchEvent);
    });

    act(() => {
      result.current.swipeHandlers.onTouchMove({
        touches: [{ clientX: 120, clientY: 100 }]
      } as React.TouchEvent);
    });

    act(() => {
      result.current.swipeHandlers.onTouchEnd({} as React.TouchEvent);
    });

    expect(mockOnVote).toHaveBeenCalledWith('post-1', 'up');
  });

  it('should handle long left swipe for downvote', async () => {
    const mockOnVote = jest.fn();
    const { result } = renderHook(() => 
      usePostCardSwipeGestures('post-1', mockOnVote)
    );

    // Simulate long left swipe for downvote
    act(() => {
      result.current.swipeHandlers.onTouchStart({
        touches: [{ clientX: 200, clientY: 100 }]
      } as React.TouchEvent);
    });

    act(() => {
      result.current.swipeHandlers.onTouchMove({
        touches: [{ clientX: 50, clientY: 100 }]
      } as React.TouchEvent);
    });

    // Wait a bit for velocity calculation
    await new Promise(resolve => setTimeout(resolve, 100));

    act(() => {
      result.current.swipeHandlers.onTouchEnd({} as React.TouchEvent);
    });

    expect(mockOnVote).toHaveBeenCalledWith('post-1', 'down');
  });

  it('should handle right swipe for save', async () => {
    const mockOnVote = jest.fn();
    const mockOnSave = jest.fn();
    const { result } = renderHook(() => 
      usePostCardSwipeGestures('post-1', mockOnVote, mockOnSave)
    );

    // Simulate right swipe (short distance for save)
    act(() => {
      result.current.swipeHandlers.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }]
      } as React.TouchEvent);
    });

    act(() => {
      result.current.swipeHandlers.onTouchMove({
        touches: [{ clientX: 180, clientY: 100 }]
      } as React.TouchEvent);
    });

    // Wait a bit for velocity calculation
    await new Promise(resolve => setTimeout(resolve, 100));

    act(() => {
      result.current.swipeHandlers.onTouchEnd({} as React.TouchEvent);
    });

    expect(mockOnSave).toHaveBeenCalledWith('post-1');
  });

  it('should handle long right swipe for share', async () => {
    const mockOnVote = jest.fn();
    const mockOnSave = jest.fn();
    const mockOnShare = jest.fn();
    const { result } = renderHook(() => 
      usePostCardSwipeGestures('post-1', mockOnVote, mockOnSave, mockOnShare)
    );

    // Simulate long right swipe for share
    act(() => {
      result.current.swipeHandlers.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }]
      } as React.TouchEvent);
    });

    act(() => {
      result.current.swipeHandlers.onTouchMove({
        touches: [{ clientX: 250, clientY: 100 }]
      } as React.TouchEvent);
    });

    // Wait a bit for velocity calculation
    await new Promise(resolve => setTimeout(resolve, 100));

    act(() => {
      result.current.swipeHandlers.onTouchEnd({} as React.TouchEvent);
    });

    expect(mockOnShare).toHaveBeenCalledWith('post-1');
  });
});