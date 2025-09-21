import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'card' | 'compact';

interface ViewModePreferences {
  viewMode: ViewMode;
  rememberPreference: boolean;
}

const DEFAULT_PREFERENCES: ViewModePreferences = {
  viewMode: 'card',
  rememberPreference: true
};

const STORAGE_KEY = 'reddit-style-view-mode';

/**
 * Hook for managing view mode preferences with localStorage persistence
 */
export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ViewModePreferences;
          return parsed.viewMode || DEFAULT_PREFERENCES.viewMode;
        }
      } catch (error) {
        console.warn('Failed to load view mode from localStorage:', error);
      }
    }
    return DEFAULT_PREFERENCES.viewMode;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save preferences to localStorage
  const savePreferences = useCallback((preferences: ViewModePreferences) => {
    if (typeof window !== 'undefined' && preferences.rememberPreference) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.error('Failed to save view mode to localStorage:', error);
        setError('Failed to save preference');
      }
    }
  }, []);

  // Toggle between card and compact view
  const toggleViewMode = useCallback(() => {
    setIsLoading(true);
    setError(null);

    const newViewMode: ViewMode = viewMode === 'card' ? 'compact' : 'card';
    
    try {
      setViewMode(newViewMode);
      savePreferences({
        viewMode: newViewMode,
        rememberPreference: true
      });
    } catch (error) {
      console.error('Failed to toggle view mode:', error);
      setError('Failed to change view mode');
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, savePreferences]);

  // Set specific view mode
  const setSpecificViewMode = useCallback((mode: ViewMode, remember: boolean = true) => {
    setIsLoading(true);
    setError(null);

    try {
      setViewMode(mode);
      savePreferences({
        viewMode: mode,
        rememberPreference: remember
      });
    } catch (error) {
      console.error('Failed to set view mode:', error);
      setError('Failed to change view mode');
    } finally {
      setIsLoading(false);
    }
  }, [savePreferences]);

  // Reset to default
  const resetViewMode = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      setViewMode(DEFAULT_PREFERENCES.viewMode);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to reset view mode:', error);
      setError('Failed to reset view mode');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get view mode display properties
  const getViewModeProperties = useCallback(() => {
    return {
      isCardView: viewMode === 'card',
      isCompactView: viewMode === 'compact',
      displayName: viewMode === 'card' ? 'Card View' : 'Compact View',
      description: viewMode === 'card' 
        ? 'Full post cards with thumbnails and expanded content'
        : 'Condensed list view with minimal spacing'
    };
  }, [viewMode]);

  return {
    viewMode,
    isLoading,
    error,
    toggleViewMode,
    setViewMode: setSpecificViewMode,
    resetViewMode,
    getViewModeProperties
  };
}

/**
 * Hook for managing view mode with session-only persistence (no localStorage)
 */
export function useSessionViewMode(initialMode: ViewMode = 'card') {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);

  const toggleViewMode = useCallback(() => {
    setViewMode(current => current === 'card' ? 'compact' : 'card');
  }, []);

  const setSpecificViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  return {
    viewMode,
    toggleViewMode,
    setViewMode: setSpecificViewMode,
    isCardView: viewMode === 'card',
    isCompactView: viewMode === 'compact'
  };
}

/**
 * Utility function to get view mode CSS classes
 */
export function getViewModeClasses(viewMode: ViewMode) {
  const baseClasses = 'transition-all duration-200 ease-in-out';
  
  if (viewMode === 'compact') {
    return {
      container: `${baseClasses} compact-view`,
      postCard: 'py-2 px-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0',
      content: 'flex items-start space-x-3',
      voting: 'flex-shrink-0 w-8',
      main: 'flex-1 min-w-0',
      thumbnail: 'w-16 h-12 flex-shrink-0 rounded object-cover',
      title: 'text-sm font-medium line-clamp-2',
      metadata: 'text-xs text-gray-500 dark:text-gray-400 mt-1',
      actions: 'text-xs space-x-3 mt-1'
    };
  }

  return {
    container: `${baseClasses} card-view`,
    postCard: 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-4',
    content: 'flex',
    voting: 'flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-700/50 border-r border-gray-200 dark:border-gray-600 min-w-[48px]',
    main: 'flex-1 p-4',
    thumbnail: 'w-full max-w-md rounded-lg object-cover',
    title: 'text-lg font-semibold mb-2',
    metadata: 'text-sm text-gray-500 dark:text-gray-400 mb-3',
    actions: 'text-sm space-x-4'
  };
}

/**
 * Utility function to determine if thumbnails should be shown based on view mode
 */
export function shouldShowThumbnail(viewMode: ViewMode, hasMedia: boolean): boolean {
  if (!hasMedia) return false;
  
  // Always show thumbnails in card view
  if (viewMode === 'card') return true;
  
  // Show small thumbnails in compact view
  if (viewMode === 'compact') return true;
  
  return false;
}

/**
 * Utility function to get thumbnail size based on view mode
 */
export function getThumbnailSize(viewMode: ViewMode): { width: number; height: number } {
  if (viewMode === 'compact') {
    return { width: 64, height: 48 }; // 16x12 in Tailwind units
  }
  
  return { width: 400, height: 300 }; // Full size for card view
}