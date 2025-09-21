import React, { useCallback, useEffect, useState, useRef } from 'react';

export interface AccessibilityState {
  isScreenReaderActive: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
}

export interface AccessibilityActions {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  manageFocus: (element: HTMLElement | null, options?: FocusOptions) => void;
  trapFocus: (container: HTMLElement | null) => () => void;
  restoreFocus: () => void;
  setAriaExpanded: (element: HTMLElement, expanded: boolean) => void;
  setAriaPressed: (element: HTMLElement, pressed: boolean) => void;
  generateId: (prefix?: string) => string;
}

export interface UseAccessibilityReturn extends AccessibilityState, AccessibilityActions {
  ariaLiveRegionId: string;
  focusableElements: string;
}

let idCounter = 0;

export const useAccessibility = (): UseAccessibilityReturn => {
  const [state, setState] = useState<AccessibilityState>({
    isScreenReaderActive: false,
    prefersReducedMotion: false,
    prefersHighContrast: false,
    keyboardNavigation: false,
    focusVisible: false,
  });

  const previousFocusRef = useRef<HTMLElement | null>(null);
  const liveRegionRef = useRef<HTMLElement | null>(null);
  const ariaLiveRegionId = 'accessibility-live-region';

  // Focusable elements selector
  const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  // Initialize accessibility detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect screen reader
    const detectScreenReader = () => {
      const hasScreenReader = 
        'speechSynthesis' in window ||
        (typeof navigator !== 'undefined' && (
          navigator.userAgent.includes('NVDA') ||
          navigator.userAgent.includes('JAWS') ||
          navigator.userAgent.includes('VoiceOver') ||
          navigator.userAgent.includes('Talkback')
        ));
      
      setState(prev => ({ ...prev, isScreenReaderActive: hasScreenReader }));
    };

    // Detect reduced motion preference
    const detectReducedMotion = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setState(prev => ({ ...prev, prefersReducedMotion }));
    };

    // Detect high contrast preference
    const detectHighContrast = () => {
      const prefersHighContrast = 
        window.matchMedia('(prefers-contrast: high)').matches ||
        window.matchMedia('(-ms-high-contrast: active)').matches;
      setState(prev => ({ ...prev, prefersHighContrast }));
    };

    // Detect keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setState(prev => ({ ...prev, keyboardNavigation: true, focusVisible: true }));
      }
    };

    const handleMouseDown = () => {
      setState(prev => ({ ...prev, focusVisible: false }));
    };

    // Initialize detections
    detectScreenReader();
    detectReducedMotion();
    detectHighContrast();

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    // Create live region for screen reader announcements
    if (!document.getElementById(ariaLiveRegionId)) {
      const liveRegion = document.createElement('div');
      liveRegion.id = ariaLiveRegionId;
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    } else {
      liveRegionRef.current = document.getElementById(ariaLiveRegionId);
    }

    // Listen for media query changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setState(prev => ({ ...prev, prefersReducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setState(prev => ({ ...prev, prefersHighContrast: e.matches }));
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, [ariaLiveRegionId]);

  // Screen reader announcements
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return;

    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  // Focus management
  const manageFocus = useCallback((element: HTMLElement | null, options?: FocusOptions) => {
    if (!element) return;

    // Store previous focus for restoration
    if (document.activeElement && document.activeElement !== document.body) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    element.focus(options);
  }, []);

  // Focus trap for modals and overlays
  const trapFocus = useCallback((container: HTMLElement | null) => {
    if (!container) return () => {};

    const focusableEls = container.querySelectorAll(focusableElements) as NodeListOf<HTMLElement>;
    const firstFocusableEl = focusableEls[0];
    const lastFocusableEl = focusableEls[focusableEls.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusableEl) {
          lastFocusableEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusableEl) {
          firstFocusableEl.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    if (firstFocusableEl) {
      firstFocusableEl.focus();
    }

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusableElements]);

  // Restore focus to previously focused element
  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  // ARIA state helpers
  const setAriaExpanded = useCallback((element: HTMLElement, expanded: boolean) => {
    element.setAttribute('aria-expanded', expanded.toString());
  }, []);

  const setAriaPressed = useCallback((element: HTMLElement, pressed: boolean) => {
    element.setAttribute('aria-pressed', pressed.toString());
  }, []);

  // Generate unique IDs for ARIA relationships
  const generateId = useCallback((prefix: string = 'a11y') => {
    return `${prefix}-${++idCounter}`;
  }, []);

  return {
    ...state,
    announceToScreenReader,
    manageFocus,
    trapFocus,
    restoreFocus,
    setAriaExpanded,
    setAriaPressed,
    generateId,
    ariaLiveRegionId,
    focusableElements,
  };
};

// Keyboard navigation helpers
export const useKeyboardNavigation = () => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent, handlers: Record<string, () => void>) => {
    const handler = handlers[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  }, []);

  const createKeyboardHandler = useCallback((handlers: Record<string, () => void>) => {
    return (e: React.KeyboardEvent) => handleKeyDown(e, handlers);
  }, [handleKeyDown]);

  return { handleKeyDown, createKeyboardHandler };
};

// Focus management for lists and grids
export const useFocusManagement = (itemCount: number) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleArrowNavigation = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, itemCount - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;
    }
  }, [itemCount]);

  return { focusedIndex, setFocusedIndex, handleArrowNavigation };
};