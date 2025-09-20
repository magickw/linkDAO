import { useState, useEffect, useCallback } from 'react';
import { FeedPreferences, FeedSortType } from '../types/feed';
import { FeedService } from '../services/feedService';

const DEFAULT_PREFERENCES: FeedPreferences = {
  defaultSort: FeedSortType.HOT,
  defaultTimeRange: 'day',
  autoRefresh: true,
  refreshInterval: 30,
  showSocialProof: true,
  showTrendingBadges: true,
  infiniteScroll: true,
  postsPerPage: 20
};

const STORAGE_KEY = 'feedPreferences';

/**
 * Hook for managing user feed preferences with persistence
 */
export function useFeedPreferences() {
  const [preferences, setPreferences] = useState<FeedPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load from backend first
      const backendPrefs = await FeedService.getFeedPreferences();
      setPreferences(backendPrefs);
    } catch (backendError) {
      console.warn('Failed to load preferences from backend:', backendError);
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      } catch (storageError) {
        console.error('Failed to load preferences from localStorage:', storageError);
        setError('Failed to load preferences');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = useCallback(async (newPreferences: Partial<FeedPreferences>) => {
    const updatedPreferences = { ...preferences, ...newPreferences };
    
    setIsSaving(true);
    setError(null);

    try {
      // Save to backend
      await FeedService.saveFeedPreferences(updatedPreferences);
      
      // Save to localStorage as backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPreferences));
      
      setPreferences(updatedPreferences);
    } catch (saveError) {
      console.error('Failed to save preferences:', saveError);
      
      // Still update local state and localStorage even if backend fails
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPreferences));
      setPreferences(updatedPreferences);
      
      setError('Preferences saved locally only');
    } finally {
      setIsSaving(false);
    }
  }, [preferences]);

  const updatePreference = useCallback(<K extends keyof FeedPreferences>(
    key: K,
    value: FeedPreferences[K]
  ) => {
    savePreferences({ [key]: value });
  }, [savePreferences]);

  const resetPreferences = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES);
  }, [savePreferences]);

  return {
    preferences,
    isLoading,
    isSaving,
    error,
    savePreferences,
    updatePreference,
    resetPreferences,
    loadPreferences
  };
}

/**
 * Hook for managing feed sorting preferences specifically
 */
export function useFeedSortingPreferences() {
  const { preferences, updatePreference, isLoading } = useFeedPreferences();
  
  const [currentSort, setCurrentSort] = useState<FeedSortType>(preferences.defaultSort);
  const [currentTimeRange, setCurrentTimeRange] = useState<string>(preferences.defaultTimeRange);

  // Update current values when preferences change
  useEffect(() => {
    setCurrentSort(preferences.defaultSort);
    setCurrentTimeRange(preferences.defaultTimeRange);
  }, [preferences.defaultSort, preferences.defaultTimeRange]);

  const updateSort = useCallback((sort: FeedSortType, saveAsDefault: boolean = false) => {
    setCurrentSort(sort);
    if (saveAsDefault) {
      updatePreference('defaultSort', sort);
    }
  }, [updatePreference]);

  const updateTimeRange = useCallback((timeRange: string, saveAsDefault: boolean = false) => {
    setCurrentTimeRange(timeRange);
    if (saveAsDefault) {
      updatePreference('defaultTimeRange', timeRange);
    }
  }, [updatePreference]);

  return {
    currentSort,
    currentTimeRange,
    defaultSort: preferences.defaultSort,
    defaultTimeRange: preferences.defaultTimeRange,
    updateSort,
    updateTimeRange,
    isLoading
  };
}

/**
 * Hook for managing auto-refresh preferences
 */
export function useAutoRefreshPreferences() {
  const { preferences, updatePreference } = useFeedPreferences();
  const [isEnabled, setIsEnabled] = useState(preferences.autoRefresh);
  const [interval, setInterval] = useState(preferences.refreshInterval);

  // Update local state when preferences change
  useEffect(() => {
    setIsEnabled(preferences.autoRefresh);
    setInterval(preferences.refreshInterval);
  }, [preferences.autoRefresh, preferences.refreshInterval]);

  const toggleAutoRefresh = useCallback((enabled?: boolean) => {
    const newEnabled = enabled !== undefined ? enabled : !isEnabled;
    setIsEnabled(newEnabled);
    updatePreference('autoRefresh', newEnabled);
  }, [isEnabled, updatePreference]);

  const updateInterval = useCallback((newInterval: number) => {
    setInterval(newInterval);
    updatePreference('refreshInterval', newInterval);
  }, [updatePreference]);

  return {
    isEnabled,
    interval,
    toggleAutoRefresh,
    updateInterval
  };
}

/**
 * Hook for managing display preferences
 */
export function useDisplayPreferences() {
  const { preferences, updatePreference } = useFeedPreferences();

  const toggleSocialProof = useCallback((enabled?: boolean) => {
    const newEnabled = enabled !== undefined ? enabled : !preferences.showSocialProof;
    updatePreference('showSocialProof', newEnabled);
  }, [preferences.showSocialProof, updatePreference]);

  const toggleTrendingBadges = useCallback((enabled?: boolean) => {
    const newEnabled = enabled !== undefined ? enabled : !preferences.showTrendingBadges;
    updatePreference('showTrendingBadges', newEnabled);
  }, [preferences.showTrendingBadges, updatePreference]);

  const toggleInfiniteScroll = useCallback((enabled?: boolean) => {
    const newEnabled = enabled !== undefined ? enabled : !preferences.infiniteScroll;
    updatePreference('infiniteScroll', newEnabled);
  }, [preferences.infiniteScroll, updatePreference]);

  const updatePostsPerPage = useCallback((count: number) => {
    updatePreference('postsPerPage', Math.max(5, Math.min(50, count)));
  }, [updatePreference]);

  return {
    showSocialProof: preferences.showSocialProof,
    showTrendingBadges: preferences.showTrendingBadges,
    infiniteScroll: preferences.infiniteScroll,
    postsPerPage: preferences.postsPerPage,
    toggleSocialProof,
    toggleTrendingBadges,
    toggleInfiniteScroll,
    updatePostsPerPage
  };
}

/**
 * Hook for managing feed preferences with local storage fallback
 */
export function useLocalFeedPreferences() {
  const [preferences, setPreferences] = useState<FeedPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const updatePreferences = useCallback((updates: Partial<FeedPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Failed to save preferences to localStorage:', error);
    }
  }, [preferences]);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear preferences from localStorage:', error);
    }
  }, []);

  return {
    preferences,
    updatePreferences,
    resetPreferences
  };
}

/**
 * Utility function to get preference value with fallback
 */
export function getPreferenceValue<K extends keyof FeedPreferences>(
  preferences: Partial<FeedPreferences>,
  key: K,
  fallback: FeedPreferences[K]
): FeedPreferences[K] {
  return preferences[key] !== undefined ? preferences[key]! : fallback;
}

/**
 * Utility function to validate preferences
 */
export function validatePreferences(preferences: Partial<FeedPreferences>): FeedPreferences {
  return {
    defaultSort: Object.values(FeedSortType).includes(preferences.defaultSort as FeedSortType) 
      ? preferences.defaultSort as FeedSortType 
      : DEFAULT_PREFERENCES.defaultSort,
    defaultTimeRange: ['hour', 'day', 'week', 'month', 'year', 'all'].includes(preferences.defaultTimeRange || '')
      ? preferences.defaultTimeRange!
      : DEFAULT_PREFERENCES.defaultTimeRange,
    autoRefresh: typeof preferences.autoRefresh === 'boolean' 
      ? preferences.autoRefresh 
      : DEFAULT_PREFERENCES.autoRefresh,
    refreshInterval: typeof preferences.refreshInterval === 'number' && preferences.refreshInterval > 0
      ? Math.max(10, Math.min(300, preferences.refreshInterval))
      : DEFAULT_PREFERENCES.refreshInterval,
    showSocialProof: typeof preferences.showSocialProof === 'boolean'
      ? preferences.showSocialProof
      : DEFAULT_PREFERENCES.showSocialProof,
    showTrendingBadges: typeof preferences.showTrendingBadges === 'boolean'
      ? preferences.showTrendingBadges
      : DEFAULT_PREFERENCES.showTrendingBadges,
    infiniteScroll: typeof preferences.infiniteScroll === 'boolean'
      ? preferences.infiniteScroll
      : DEFAULT_PREFERENCES.infiniteScroll,
    postsPerPage: typeof preferences.postsPerPage === 'number'
      ? Math.max(5, Math.min(50, preferences.postsPerPage))
      : DEFAULT_PREFERENCES.postsPerPage
  };
}