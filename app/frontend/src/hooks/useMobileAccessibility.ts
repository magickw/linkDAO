import { useCallback, useEffect, useState, useMemo } from 'react';

interface MobileAccessibilityHook {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  manageFocus: (element: HTMLElement | null) => void;
  enhanceTouchTargets: (element: HTMLElement) => void;
  applyHighContrastMode: (enabled: boolean) => void;
  accessibilityClasses: string;
  isScreenReaderActive: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  prefersLargeText: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
  textSize: 'normal' | 'large' | 'extra-large';
}

export const useMobileAccessibility = (): MobileAccessibilityHook => {
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  const [prefersLargeText, setPrefersLargeText] = useState(false);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'extra-large'>('normal');

  // Screen reader detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for screen reader indicators
    const checkScreenReader = () => {
      // Check for common screen reader user agents or accessibility APIs
      const hasScreenReader = 
        'speechSynthesis' in window ||
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver') ||
        navigator.userAgent.includes('TalkBack');

      setIsScreenReaderActive(hasScreenReader);
    };

    checkScreenReader();

    // Listen for accessibility events
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target && (e.target as HTMLElement).getAttribute('aria-live')) {
        setIsScreenReaderActive(true);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // Media query preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updatePreferences = () => {
      setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      setPrefersHighContrast(window.matchMedia('(prefers-contrast: high)').matches);
      
      // Check for large text preference
      const largeTextQuery = window.matchMedia('(min-resolution: 2dppx)');
      setPrefersLargeText(largeTextQuery.matches);

      // Color scheme preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setColorScheme('dark');
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        setColorScheme('light');
      } else {
        setColorScheme('auto');
      }
    };

    updatePreferences();

    // Set up media query listeners
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const lightModeQuery = window.matchMedia('(prefers-color-scheme: light)');

    const handleChange = () => updatePreferences();

    reducedMotionQuery.addEventListener('change', handleChange);
    highContrastQuery.addEventListener('change', handleChange);
    darkModeQuery.addEventListener('change', handleChange);
    lightModeQuery.addEventListener('change', handleChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleChange);
      highContrastQuery.removeEventListener('change', handleChange);
      darkModeQuery.removeEventListener('change', handleChange);
      lightModeQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Text size detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTextSize = () => {
      const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      
      if (fontSize >= 20) {
        setTextSize('extra-large');
      } else if (fontSize >= 18) {
        setTextSize('large');
      } else {
        setTextSize('normal');
      }
    };

    checkTextSize();

    // Monitor font size changes
    const observer = new MutationObserver(checkTextSize);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return () => observer.disconnect();
  }, []);

  // Screen reader announcements
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (typeof window === 'undefined') return;

    // Create or update live region
    let liveRegion = document.getElementById('mobile-accessibility-live-region');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'mobile-accessibility-live-region';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }

    // Update the live region
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = '';
      }
    }, 1000);
  }, []);

  // Focus management
  const manageFocus = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    // Ensure element is focusable
    if (!element.hasAttribute('tabindex') && !element.matches('button, input, select, textarea, a[href]')) {
      element.setAttribute('tabindex', '-1');
    }

    // Focus the element
    element.focus();

    // Add focus ring for keyboard users
    element.addEventListener('blur', () => {
      element.classList.remove('keyboard-focus');
    }, { once: true });

    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        element.classList.add('keyboard-focus');
      }
    });
  }, []);

  // Touch target enhancement
  const enhanceTouchTargets = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const minSize = 44; // WCAG minimum touch target size

    if (rect.width < minSize || rect.height < minSize) {
      element.style.minWidth = `${minSize}px`;
      element.style.minHeight = `${minSize}px`;
      element.style.display = 'inline-flex';
      element.style.alignItems = 'center';
      element.style.justifyContent = 'center';
    }

    // Add touch feedback
    element.addEventListener('touchstart', () => {
      element.style.opacity = '0.7';
    }, { passive: true });

    element.addEventListener('touchend', () => {
      element.style.opacity = '';
    }, { passive: true });

    element.addEventListener('touchcancel', () => {
      element.style.opacity = '';
    }, { passive: true });
  }, []);

  // High contrast mode
  const applyHighContrastMode = useCallback((enabled: boolean) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    if (enabled) {
      root.classList.add('high-contrast-mode');
      root.style.setProperty('--text-color', '#000000');
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--border-color', '#000000');
      root.style.setProperty('--focus-color', '#0000ff');
    } else {
      root.classList.remove('high-contrast-mode');
      root.style.removeProperty('--text-color');
      root.style.removeProperty('--bg-color');
      root.style.removeProperty('--border-color');
      root.style.removeProperty('--focus-color');
    }
  }, []);

  // Apply high contrast automatically
  useEffect(() => {
    applyHighContrastMode(prefersHighContrast);
  }, [prefersHighContrast, applyHighContrastMode]);

  // Accessibility CSS classes
  const accessibilityClasses = useMemo(() => {
    const classes = [];

    if (isScreenReaderActive) {
      classes.push('screen-reader-active');
    }

    if (prefersReducedMotion) {
      classes.push('reduce-motion');
    }

    if (prefersHighContrast) {
      classes.push('high-contrast');
    }

    if (prefersLargeText) {
      classes.push('large-text');
    }

    classes.push(`text-size-${textSize}`);
    classes.push(`color-scheme-${colorScheme}`);

    // Focus management classes
    classes.push('focus-visible:outline-2');
    classes.push('focus-visible:outline-blue-500');
    classes.push('focus-visible:outline-offset-2');

    return classes.join(' ');
  }, [isScreenReaderActive, prefersReducedMotion, prefersHighContrast, prefersLargeText, textSize, colorScheme]);

  return {
    announceToScreenReader,
    manageFocus,
    enhanceTouchTargets,
    applyHighContrastMode,
    accessibilityClasses,
    isScreenReaderActive,
    prefersReducedMotion,
    prefersHighContrast,
    prefersLargeText,
    colorScheme,
    textSize
  };
};