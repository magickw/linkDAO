import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  announcements: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
  textSize: 'normal' | 'large' | 'extra-large';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: (key: keyof AccessibilitySettings, value: any) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  manageFocus: (element: HTMLElement | null) => void;
  enhanceTouchTargets: (element: HTMLElement) => void;
  isScreenReaderActive: boolean;
  accessibilityClasses: string;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: React.ReactNode;
  initialSettings?: Partial<AccessibilitySettings>;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  initialSettings = {}
}) => {
  const {
    announceToScreenReader: announce,
    manageFocus: focus,
    enhanceTouchTargets,
    isScreenReaderActive,
    prefersReducedMotion,
    prefersHighContrast,
    prefersLargeText,
    colorScheme,
    textSize,
    accessibilityClasses: baseClasses
  } = useMobileAccessibility();

  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: prefersHighContrast,
    reducedMotion: prefersReducedMotion,
    largeText: prefersLargeText,
    screenReaderMode: isScreenReaderActive,
    keyboardNavigation: true,
    focusVisible: true,
    announcements: true,
    colorScheme,
    textSize,
    ...initialSettings
  });

  // Update settings when system preferences change
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      highContrast: prefersHighContrast,
      reducedMotion: prefersReducedMotion,
      largeText: prefersLargeText,
      screenReaderMode: isScreenReaderActive,
      colorScheme,
      textSize
    }));
  }, [prefersHighContrast, prefersReducedMotion, prefersLargeText, isScreenReaderActive, colorScheme, textSize]);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (settings.highContrast) {
      root.classList.add('accessibility-high-contrast');
    } else {
      root.classList.remove('accessibility-high-contrast');
    }
    
    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('accessibility-reduced-motion');
    } else {
      root.classList.remove('accessibility-reduced-motion');
    }
    
    // Large text
    if (settings.largeText) {
      root.classList.add('accessibility-large-text');
    } else {
      root.classList.remove('accessibility-large-text');
    }
    
    // Screen reader mode
    if (settings.screenReaderMode) {
      root.classList.add('accessibility-screen-reader');
    } else {
      root.classList.remove('accessibility-screen-reader');
    }
    
    // Keyboard navigation
    if (settings.keyboardNavigation) {
      root.classList.add('accessibility-keyboard-nav');
    } else {
      root.classList.remove('accessibility-keyboard-nav');
    }
    
    // Focus visible
    if (settings.focusVisible) {
      root.classList.add('accessibility-focus-visible');
    } else {
      root.classList.remove('accessibility-focus-visible');
    }
    
    // Color scheme
    root.setAttribute('data-color-scheme', settings.colorScheme);
    
    // Text size
    root.setAttribute('data-text-size', settings.textSize);
    
  }, [settings]);

  // Keyboard navigation setup
  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab navigation enhancement
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation-active');
      }
      
      // Escape key handling
      if (e.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        
        // Close modals, menus, etc.
        const closeButtons = document.querySelectorAll('[data-close-on-escape]');
        closeButtons.forEach(button => {
          if (button instanceof HTMLElement) {
            button.click();
          }
        });
      }
      
      // Arrow key navigation for lists and grids
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.getAttribute('role') === 'option') {
          e.preventDefault();
          handleArrowNavigation(e.key, activeElement);
        }
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-navigation-active');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [settings.keyboardNavigation]);

  const handleArrowNavigation = (key: string, currentElement: HTMLElement) => {
    const container = currentElement.closest('[role="listbox"], [role="grid"], [role="menu"]');
    if (!container) return;

    const options = Array.from(container.querySelectorAll('[role="option"], [role="menuitem"], [role="gridcell"]'));
    const currentIndex = options.indexOf(currentElement);
    
    let nextIndex = currentIndex;
    
    switch (key) {
      case 'ArrowUp':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        break;
      case 'ArrowDown':
        nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowLeft':
        if (container.getAttribute('role') === 'grid') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        }
        break;
      case 'ArrowRight':
        if (container.getAttribute('role') === 'grid') {
          nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        }
        break;
    }
    
    const nextElement = options[nextIndex] as HTMLElement;
    if (nextElement && nextElement.focus) {
      nextElement.focus();
    }
  };

  const updateSetting = useCallback((key: keyof AccessibilitySettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Announce setting changes
    if (settings.announcements) {
      announce(`${key} ${value ? 'enabled' : 'disabled'}`, 'polite');
    }
  }, [settings.announcements, announce]);

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (settings.announcements) {
      announce(message, priority);
    }
  }, [settings.announcements, announce]);

  const manageFocus = useCallback((element: HTMLElement | null) => {
    if (settings.keyboardNavigation) {
      focus(element);
    }
  }, [settings.keyboardNavigation, focus]);

  // Generate accessibility classes
  const accessibilityClasses = [
    baseClasses,
    settings.highContrast ? 'accessibility-high-contrast' : '',
    settings.reducedMotion ? 'accessibility-reduced-motion' : '',
    settings.largeText ? 'accessibility-large-text' : '',
    settings.screenReaderMode ? 'accessibility-screen-reader' : '',
    settings.keyboardNavigation ? 'accessibility-keyboard-nav' : '',
    settings.focusVisible ? 'accessibility-focus-visible' : '',
    `accessibility-color-scheme-${settings.colorScheme}`,
    `accessibility-text-size-${settings.textSize}`
  ].filter(Boolean).join(' ');

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    announceToScreenReader,
    manageFocus,
    enhanceTouchTargets,
    isScreenReaderActive,
    accessibilityClasses
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export default AccessibilityProvider;