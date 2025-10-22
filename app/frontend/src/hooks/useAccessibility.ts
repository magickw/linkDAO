/**
 * React Hook for Accessibility Features
 * Provides easy access to accessibility service functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { accessibilityService, AccessibilityPreferences } from '../services/accessibilityService';

export interface UseAccessibilityReturn {
  preferences: AccessibilityPreferences;
  loading: boolean;
  error: string | null;
  
  // Preference management
  updatePreferences: (updates: Partial<AccessibilityPreferences>) => void;
  resetPreferences: () => void;
  
  // Voice navigation
  startVoiceNavigation: () => void;
  stopVoiceNavigation: () => void;
  isVoiceNavigationSupported: boolean;
  
  // Audio reading
  speak: (text: string, options?: { rate?: number; voice?: string }) => void;
  stopReading: () => void;
  readPageContent: () => void;
  isTextToSpeechSupported: boolean;
  
  // Utility functions
  formatDate: (date: Date) => string;
  formatNumber: (number: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  
  // Feature checks
  isFeatureSupported: (feature: 'speech-synthesis' | 'speech-recognition') => boolean;
  getAvailableVoices: () => SpeechSynthesisVoice[];
}

export const useAccessibility = (): UseAccessibilityReturn => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    accessibilityService.getPreferences()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for preference changes
  useEffect(() => {
    const handlePreferenceChange = (event: CustomEvent) => {
      setPreferences(event.detail);
    };

    window.addEventListener('accessibility-preferences-changed', handlePreferenceChange as EventListener);

    return () => {
      window.removeEventListener('accessibility-preferences-changed', handlePreferenceChange as EventListener);
    };
  }, []);

  // Update preferences
  const updatePreferences = useCallback((updates: Partial<AccessibilityPreferences>) => {
    try {
      setError(null);
      accessibilityService.updatePreferences(updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    }
  }, []);

  // Reset preferences to defaults
  const resetPreferences = useCallback(() => {
    try {
      setError(null);
      // Clear localStorage and reload defaults
      localStorage.removeItem('accessibility-preferences');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset preferences');
    }
  }, []);

  // Voice navigation controls
  const startVoiceNavigation = useCallback(() => {
    try {
      setError(null);
      accessibilityService.startVoiceNavigation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice navigation');
    }
  }, []);

  const stopVoiceNavigation = useCallback(() => {
    try {
      setError(null);
      accessibilityService.stopVoiceNavigation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop voice navigation');
    }
  }, []);

  // Audio reading controls
  const speak = useCallback((text: string, options?: { rate?: number; voice?: string }) => {
    try {
      setError(null);
      accessibilityService.speak(text, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to speak text');
    }
  }, []);

  const stopReading = useCallback(() => {
    try {
      setError(null);
      accessibilityService.stopReading();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop reading');
    }
  }, []);

  const readPageContent = useCallback(() => {
    try {
      setError(null);
      accessibilityService.readPageContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read page content');
    }
  }, []);

  // Utility functions
  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat(navigator.language, {
      dateStyle: 'medium'
    }).format(date);
  }, []);

  const formatNumber = useCallback((number: number) => {
    return new Intl.NumberFormat(navigator.language).format(number);
  }, []);

  const formatCurrency = useCallback((amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }, []);

  // Feature support checks
  const isFeatureSupported = useCallback((feature: 'speech-synthesis' | 'speech-recognition') => {
    return accessibilityService.isFeatureSupported(feature);
  }, []);

  const getAvailableVoices = useCallback(() => {
    return accessibilityService.getAvailableVoices();
  }, []);

  // Computed values
  const isVoiceNavigationSupported = isFeatureSupported('speech-recognition');
  const isTextToSpeechSupported = isFeatureSupported('speech-synthesis');

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    resetPreferences,
    startVoiceNavigation,
    stopVoiceNavigation,
    isVoiceNavigationSupported,
    speak,
    stopReading,
    readPageContent,
    isTextToSpeechSupported,
    formatDate,
    formatNumber,
    formatCurrency,
    isFeatureSupported,
    getAvailableVoices
  };
};

/**
 * Hook for document-specific accessibility features
 */
export const useDocumentAccessibility = (documentId?: string) => {
  const accessibility = useAccessibility();
  const [isReading, setIsReading] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  // Read specific document
  const readDocument = useCallback(async () => {
    if (!documentId) return;
    
    try {
      setIsReading(true);
      setReadingProgress(0);
      
      // Get document content
      const documentElement = document.querySelector(`[data-document-id="${documentId}"]`);
      if (documentElement) {
        const text = documentElement.textContent || '';
        accessibility.speak(text);
        
        // Simulate reading progress (in a real implementation, this would track actual speech progress)
        const words = text.split(' ').length;
        const estimatedDuration = (words / 150) * 60 * 1000; // 150 WPM
        
        const progressInterval = setInterval(() => {
          setReadingProgress(prev => {
            const newProgress = prev + (100 / (estimatedDuration / 1000));
            if (newProgress >= 100) {
              clearInterval(progressInterval);
              setIsReading(false);
              return 100;
            }
            return newProgress;
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to read document:', error);
      setIsReading(false);
    }
  }, [documentId, accessibility]);

  // Stop reading document
  const stopReadingDocument = useCallback(() => {
    accessibility.stopReading();
    setIsReading(false);
    setReadingProgress(0);
  }, [accessibility]);

  return {
    ...accessibility,
    isReading,
    readingProgress,
    readDocument,
    stopReadingDocument
  };
};

/**
 * Hook for keyboard navigation enhancement
 */
export const useKeyboardNavigation = () => {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const [focusHistory, setFocusHistory] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      setFocusedElement(target);
      setFocusHistory(prev => [...prev.slice(-9), target]); // Keep last 10 elements
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Enhanced keyboard shortcuts
      if (event.altKey && event.key === 'h') {
        // Alt+H: Go to main heading
        event.preventDefault();
        const mainHeading = document.querySelector('h1, [role="heading"][aria-level="1"]') as HTMLElement;
        mainHeading?.focus();
      }
      
      if (event.altKey && event.key === 'n') {
        // Alt+N: Go to navigation
        event.preventDefault();
        const nav = document.querySelector('nav, [role="navigation"]') as HTMLElement;
        nav?.focus();
      }
      
      if (event.altKey && event.key === 'm') {
        // Alt+M: Go to main content
        event.preventDefault();
        const main = document.querySelector('main, [role="main"]') as HTMLElement;
        main?.focus();
      }
      
      if (event.altKey && event.key === 'b') {
        // Alt+B: Go back in focus history
        event.preventDefault();
        if (focusHistory.length > 1) {
          const previousElement = focusHistory[focusHistory.length - 2];
          previousElement?.focus();
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusHistory]);

  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    element?.focus();
  }, []);

  const focusNext = useCallback(() => {
    const focusableElements = Array.from(
      document.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
    ) as HTMLElement[];
    
    const currentIndex = focusableElements.indexOf(focusedElement!);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  }, [focusedElement]);

  const focusPrevious = useCallback(() => {
    const focusableElements = Array.from(
      document.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
    ) as HTMLElement[];

    const currentIndex = focusableElements.indexOf(focusedElement!);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
    focusableElements[prevIndex]?.focus();
  }, [focusedElement]);

  const createKeyboardHandler = useCallback((handlers: Record<string, () => void>) => {
    return (event: React.KeyboardEvent) => {
      const handler = handlers[event.key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };
  }, []);

  return {
    focusedElement,
    focusHistory,
    focusElement,
    focusNext,
    focusPrevious,
    createKeyboardHandler
  };
};

/**
 * Hook for focus management in lists and menus
 */
export const useFocusManagement = (itemCount: number) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleArrowNavigation = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : itemCount - 1));
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => (prev < itemCount - 1 ? prev + 1 : 0));
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;
    }
  }, [itemCount]);

  return {
    focusedIndex,
    setFocusedIndex,
    handleArrowNavigation
  };
};