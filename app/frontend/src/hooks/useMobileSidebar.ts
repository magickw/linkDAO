import { useState, useCallback, useEffect, useRef } from 'react';
import { useMobileAccessibility } from './useMobileAccessibility';

interface MobileSidebarState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeOverlay: 'left' | 'right' | null;
}

interface MobileSidebarHook {
  sidebarState: MobileSidebarState;
  openLeftSidebar: () => void;
  openRightSidebar: () => void;
  closeSidebars: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  isAnyOpen: boolean;
  focusManagement: {
    trapFocus: (element: HTMLElement) => void;
    restoreFocus: () => void;
  };
}

export const useMobileSidebar = (): MobileSidebarHook => {
  const [sidebarState, setSidebarState] = useState<MobileSidebarState>({
    leftSidebarOpen: false,
    rightSidebarOpen: false,
    activeOverlay: null
  });

  const { manageFocus, announceToScreenReader } = useMobileAccessibility();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);

  // Track if any sidebar is open
  const isAnyOpen = sidebarState.leftSidebarOpen || sidebarState.rightSidebarOpen;

  // Open left sidebar
  const openLeftSidebar = useCallback(() => {
    // Store current focus
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    setSidebarState({
      leftSidebarOpen: true,
      rightSidebarOpen: false,
      activeOverlay: 'left'
    });

    announceToScreenReader('Left sidebar opened');
  }, [announceToScreenReader]);

  // Open right sidebar
  const openRightSidebar = useCallback(() => {
    // Store current focus
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    setSidebarState({
      leftSidebarOpen: false,
      rightSidebarOpen: true,
      activeOverlay: 'right'
    });

    announceToScreenReader('Right sidebar opened');
  }, [announceToScreenReader]);

  // Close all sidebars
  const closeSidebars = useCallback(() => {
    setSidebarState({
      leftSidebarOpen: false,
      rightSidebarOpen: false,
      activeOverlay: null
    });

    // Restore focus to previous element
    if (previousFocusRef.current) {
      manageFocus(previousFocusRef.current);
      previousFocusRef.current = null;
    }

    announceToScreenReader('Sidebar closed');
  }, [manageFocus, announceToScreenReader]);

  // Toggle left sidebar
  const toggleLeftSidebar = useCallback(() => {
    if (sidebarState.leftSidebarOpen) {
      closeSidebars();
    } else {
      openLeftSidebar();
    }
  }, [sidebarState.leftSidebarOpen, closeSidebars, openLeftSidebar]);

  // Toggle right sidebar
  const toggleRightSidebar = useCallback(() => {
    if (sidebarState.rightSidebarOpen) {
      closeSidebars();
    } else {
      openRightSidebar();
    }
  }, [sidebarState.rightSidebarOpen, closeSidebars, openRightSidebar]);

  // Focus trap for accessibility
  const trapFocus = useCallback((element: HTMLElement) => {
    sidebarRef.current = element;
    
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element
    if (firstFocusable) {
      manageFocus(firstFocusable);
    }

    // Handle tab key for focus trapping
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            manageFocus(lastFocusable);
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            manageFocus(firstFocusable);
          }
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    
    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [manageFocus]);

  // Restore focus to previous element
  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      manageFocus(previousFocusRef.current);
      previousFocusRef.current = null;
    }
  }, [manageFocus]);

  // Handle escape key to close sidebars
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAnyOpen) {
        closeSidebars();
      }
    };

    if (isAnyOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isAnyOpen, closeSidebars]);

  // Handle click outside to close sidebar
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      const target = e.target as Node;
      if (isAnyOpen && sidebarRef.current && !sidebarRef.current.contains(target)) {
        closeSidebars();
      }
    };

    if (isAnyOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isAnyOpen, closeSidebars]);

  return {
    sidebarState,
    openLeftSidebar,
    openRightSidebar,
    closeSidebars,
    toggleLeftSidebar,
    toggleRightSidebar,
    isAnyOpen,
    focusManagement: {
      trapFocus,
      restoreFocus
    }
  };
};