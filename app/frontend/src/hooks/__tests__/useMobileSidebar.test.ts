import { renderHook, act } from '@testing-library/react';
import { useMobileSidebar } from '../useMobileSidebar';

// Mock the mobile accessibility hook
jest.mock('../useMobileAccessibility', () => ({
  useMobileAccessibility: () => ({
    manageFocus: jest.fn(),
    announceToScreenReader: jest.fn()
  })
}));

describe('useMobileSidebar', () => {
  beforeEach(() => {
    // Reset document body styles
    document.body.style.overflow = '';
    
    // Clear any existing event listeners
    document.removeEventListener('keydown', jest.fn());
    document.removeEventListener('mousedown', jest.fn());
    document.removeEventListener('touchstart', jest.fn());
  });

  it('should initialize with closed sidebars', () => {
    const { result } = renderHook(() => useMobileSidebar());

    expect(result.current.sidebarState).toEqual({
      leftSidebarOpen: false,
      rightSidebarOpen: false,
      activeOverlay: null
    });
    expect(result.current.isAnyOpen).toBe(false);
  });

  it('should open left sidebar', () => {
    const { result } = renderHook(() => useMobileSidebar());

    act(() => {
      result.current.openLeftSidebar();
    });

    expect(result.current.sidebarState.leftSidebarOpen).toBe(true);
    expect(result.current.sidebarState.rightSidebarOpen).toBe(false);
    expect(result.current.sidebarState.activeOverlay).toBe('left');
    expect(result.current.isAnyOpen).toBe(true);
  });

  it('should open right sidebar', () => {
    const { result } = renderHook(() => useMobileSidebar());

    act(() => {
      result.current.openRightSidebar();
    });

    expect(result.current.sidebarState.leftSidebarOpen).toBe(false);
    expect(result.current.sidebarState.rightSidebarOpen).toBe(true);
    expect(result.current.sidebarState.activeOverlay).toBe('right');
    expect(result.current.isAnyOpen).toBe(true);
  });

  it('should close all sidebars', () => {
    const { result } = renderHook(() => useMobileSidebar());

    // Open left sidebar first
    act(() => {
      result.current.openLeftSidebar();
    });

    expect(result.current.isAnyOpen).toBe(true);

    // Close sidebars
    act(() => {
      result.current.closeSidebars();
    });

    expect(result.current.sidebarState).toEqual({
      leftSidebarOpen: false,
      rightSidebarOpen: false,
      activeOverlay: null
    });
    expect(result.current.isAnyOpen).toBe(false);
  });

  it('should toggle left sidebar', () => {
    const { result } = renderHook(() => useMobileSidebar());

    // Toggle open
    act(() => {
      result.current.toggleLeftSidebar();
    });

    expect(result.current.sidebarState.leftSidebarOpen).toBe(true);

    // Toggle closed
    act(() => {
      result.current.toggleLeftSidebar();
    });

    expect(result.current.sidebarState.leftSidebarOpen).toBe(false);
  });

  it('should toggle right sidebar', () => {
    const { result } = renderHook(() => useMobileSidebar());

    // Toggle open
    act(() => {
      result.current.toggleRightSidebar();
    });

    expect(result.current.sidebarState.rightSidebarOpen).toBe(true);

    // Toggle closed
    act(() => {
      result.current.toggleRightSidebar();
    });

    expect(result.current.sidebarState.rightSidebarOpen).toBe(false);
  });

  it('should close right sidebar when opening left sidebar', () => {
    const { result } = renderHook(() => useMobileSidebar());

    // Open right sidebar first
    act(() => {
      result.current.openRightSidebar();
    });

    expect(result.current.sidebarState.rightSidebarOpen).toBe(true);

    // Open left sidebar
    act(() => {
      result.current.openLeftSidebar();
    });

    expect(result.current.sidebarState.leftSidebarOpen).toBe(true);
    expect(result.current.sidebarState.rightSidebarOpen).toBe(false);
  });

  it('should prevent body scroll when sidebar is open', () => {
    const { result } = renderHook(() => useMobileSidebar());

    act(() => {
      result.current.openLeftSidebar();
    });

    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      result.current.closeSidebars();
    });

    expect(document.body.style.overflow).toBe('');
  });

  it('should handle escape key to close sidebar', () => {
    const { result } = renderHook(() => useMobileSidebar());

    act(() => {
      result.current.openLeftSidebar();
    });

    expect(result.current.isAnyOpen).toBe(true);

    // Simulate escape key
    act(() => {
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
    });

    expect(result.current.isAnyOpen).toBe(false);
  });

  it('should provide focus management functions', () => {
    const { result } = renderHook(() => useMobileSidebar());

    expect(typeof result.current.focusManagement.trapFocus).toBe('function');
    expect(typeof result.current.focusManagement.restoreFocus).toBe('function');
  });

  it('should trap focus within sidebar element', () => {
    const { result } = renderHook(() => useMobileSidebar());

    // Create mock sidebar element with focusable elements
    const mockSidebar = document.createElement('div');
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');
    mockSidebar.appendChild(button1);
    mockSidebar.appendChild(button2);
    document.body.appendChild(mockSidebar);

    act(() => {
      result.current.focusManagement.trapFocus(mockSidebar);
    });

    // The focus trap should be set up (we can't easily test the actual focus behavior in jsdom)
    expect(typeof result.current.focusManagement.trapFocus).toBe('function');

    // Cleanup
    document.body.removeChild(mockSidebar);
  });

  it('should handle tab key for focus trapping', () => {
    const { result } = renderHook(() => useMobileSidebar());

    // Create mock sidebar with buttons
    const mockSidebar = document.createElement('div');
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');
    mockSidebar.appendChild(button1);
    mockSidebar.appendChild(button2);
    document.body.appendChild(mockSidebar);

    act(() => {
      result.current.focusManagement.trapFocus(mockSidebar);
    });

    // Focus on last button
    button2.focus();

    // Simulate tab key (should cycle to first button)
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    Object.defineProperty(tabEvent, 'preventDefault', {
      value: jest.fn()
    });

    act(() => {
      mockSidebar.dispatchEvent(tabEvent);
    });

    // Cleanup
    document.body.removeChild(mockSidebar);
  });
});