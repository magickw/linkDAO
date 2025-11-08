import { useState, useEffect } from 'react';
import { FeedSortType, FeedFilter } from '../types/feed';

interface FeedPreferences {
  currentSort: FeedSortType;
  currentTimeRange: string;
  currentFeedSource: 'following' | 'all';
  currentPostTypes: string[];
  updateSort: (sort: FeedSortType, save?: boolean) => void;
  updateTimeRange: (timeRange: string, save?: boolean) => void;
  updateFeedSource: (source: 'following' | 'all', save?: boolean) => void;
  updatePostTypes: (types: string[], save?: boolean) => void;
  savePreferences: (preferences: any) => void;
  getFullFilter: () => FeedFilter;
}

interface DisplayPreferences {
  showTrending: boolean;
  showSocialProof: boolean;
  showTrendingBadges: boolean;
  showPreviews: boolean;
  compactMode: boolean;
  infiniteScroll: boolean;
  postsPerPage: number;
  updateDisplayPreferences: (preferences: Partial<DisplayPreferences>) => void;
}

interface AutoRefreshPreferences {
  isEnabled: boolean;
  enabled: boolean;
  interval: number;
  updateAutoRefreshPreferences: (preferences: Partial<AutoRefreshPreferences>) => void;
}

export const useFeedSortingPreferences = (): FeedPreferences => {
  // Default to 'new' sort and 'following' feed source
  const [currentSort, setCurrentSort] = useState<FeedSortType>(FeedSortType.NEW);
  const [currentTimeRange, setCurrentTimeRange] = useState('all');
  const [currentFeedSource, setCurrentFeedSource] = useState<'following' | 'all'>('following');
  const [currentPostTypes, setCurrentPostTypes] = useState<string[]>([]);

  const updateSort = (sort: FeedSortType, save = false) => {
    setCurrentSort(sort);
    if (save) {
      localStorage.setItem('feedSort', sort);
    }
  };

  const updateTimeRange = (timeRange: string, save = false) => {
    setCurrentTimeRange(timeRange);
    if (save) {
      localStorage.setItem('feedTimeRange', timeRange);
    }
  };

  const updateFeedSource = (source: 'following' | 'all', save = false) => {
    setCurrentFeedSource(source);
    if (save) {
      localStorage.setItem('feedSource', source);
    }
  };

  const updatePostTypes = (types: string[], save = false) => {
    setCurrentPostTypes(types);
    if (save) {
      localStorage.setItem('feedPostTypes', JSON.stringify(types));
    }
  };

  const savePreferences = (preferences: any) => {
    localStorage.setItem('feedPreferences', JSON.stringify(preferences));
    
    // Also save individual preferences for backward compatibility
    if (preferences.defaultSort) {
      localStorage.setItem('feedSort', preferences.defaultSort);
      setCurrentSort(preferences.defaultSort);
    }
    if (preferences.defaultTimeRange) {
      localStorage.setItem('feedTimeRange', preferences.defaultTimeRange);
      setCurrentTimeRange(preferences.defaultTimeRange);
    }
    if (preferences.defaultFeedSource) {
      localStorage.setItem('feedSource', preferences.defaultFeedSource);
      setCurrentFeedSource(preferences.defaultFeedSource);
    }
    if (preferences.defaultPostTypes) {
      localStorage.setItem('feedPostTypes', JSON.stringify(preferences.defaultPostTypes));
      setCurrentPostTypes(preferences.defaultPostTypes);
    }
  };

  const getFullFilter = (): FeedFilter => {
    return {
      sortBy: currentSort,
      timeRange: currentTimeRange,
      feedSource: currentFeedSource,
      postTypes: currentPostTypes.length > 0 ? currentPostTypes : undefined
    };
  };

  useEffect(() => {
    const savedSort = localStorage.getItem('feedSort') as FeedSortType;
    const savedTimeRange = localStorage.getItem('feedTimeRange');
    const savedFeedSource = localStorage.getItem('feedSource') as 'following' | 'all';
    const savedPostTypes = localStorage.getItem('feedPostTypes');
    
    // Set defaults if nothing is saved
    if (savedSort) {
      setCurrentSort(savedSort);
    } else {
      setCurrentSort(FeedSortType.NEW); // Default to newest
    }
    
    if (savedTimeRange) {
      setCurrentTimeRange(savedTimeRange);
    } else {
      setCurrentTimeRange('all'); // Default to all time
    }
    
    if (savedFeedSource) {
      setCurrentFeedSource(savedFeedSource);
    } else {
      setCurrentFeedSource('following'); // Default to following
    }
    
    if (savedPostTypes) {
      try {
        setCurrentPostTypes(JSON.parse(savedPostTypes));
      } catch (e) {
        console.error('Failed to parse saved post types:', e);
      }
    }
  }, []);

  return {
    currentSort,
    currentTimeRange,
    currentFeedSource,
    currentPostTypes,
    updateSort,
    updateTimeRange,
    updateFeedSource,
    updatePostTypes,
    savePreferences,
    getFullFilter
  };
};

export const useDisplayPreferences = (): DisplayPreferences => {
  const [displayPreferences, setDisplayPreferences] = useState<DisplayPreferences>({
    showTrending: true,
    showSocialProof: true,
    showTrendingBadges: true,
    showPreviews: true,
    compactMode: false,
    infiniteScroll: true,
    postsPerPage: 20,
    updateDisplayPreferences: () => {}
  });

  const updateDisplayPreferences = (preferences: Partial<DisplayPreferences>) => {
    const updatedPreferences = { ...displayPreferences, ...preferences };
    setDisplayPreferences(updatedPreferences);
    localStorage.setItem('feedDisplayPreferences', JSON.stringify(updatedPreferences));
  };

  useEffect(() => {
    const savedPreferences = localStorage.getItem('feedDisplayPreferences');
    if (savedPreferences) {
      try {
        const parsedPreferences = JSON.parse(savedPreferences);
        setDisplayPreferences({
          ...displayPreferences,
          ...parsedPreferences,
          updateDisplayPreferences
        });
      } catch (e) {
        console.error('Failed to parse display preferences:', e);
      }
    } else {
      // Set the update function
      setDisplayPreferences(prev => ({
        ...prev,
        updateDisplayPreferences
      }));
    }
  }, []);

  return {
    ...displayPreferences,
    updateDisplayPreferences
  };
};

export const useAutoRefreshPreferences = (): AutoRefreshPreferences => {
  const [autoRefreshPreferences, setAutoRefreshPreferences] = useState<AutoRefreshPreferences>({
    isEnabled: false,
    enabled: false,
    interval: 30000, // 30 seconds
    updateAutoRefreshPreferences: () => {}
  });

  const updateAutoRefreshPreferences = (preferences: Partial<AutoRefreshPreferences>) => {
    const updatedPreferences = { ...autoRefreshPreferences, ...preferences };
    setAutoRefreshPreferences(updatedPreferences);
    localStorage.setItem('feedAutoRefreshPreferences', JSON.stringify(updatedPreferences));
  };

  useEffect(() => {
    const savedPreferences = localStorage.getItem('feedAutoRefreshPreferences');
    if (savedPreferences) {
      try {
        const parsedPreferences = JSON.parse(savedPreferences);
        setAutoRefreshPreferences({
          ...autoRefreshPreferences,
          ...parsedPreferences,
          updateAutoRefreshPreferences
        });
      } catch (e) {
        console.error('Failed to parse auto-refresh preferences:', e);
      }
    } else {
      // Set the update function
      setAutoRefreshPreferences(prev => ({
        ...prev,
        updateAutoRefreshPreferences
      }));
    }
  }, []);

  return {
    ...autoRefreshPreferences,
    updateAutoRefreshPreferences
  };
};

export const useFeedPreferences = (): FeedPreferences => {
  return useFeedSortingPreferences();
};