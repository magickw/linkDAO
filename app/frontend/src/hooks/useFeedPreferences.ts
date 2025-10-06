import { useState, useEffect } from 'react';
import { FeedSortType } from '../types/feed';

interface FeedPreferences {
  currentSort: FeedSortType;
  currentTimeRange: string;
  updateSort: (sort: FeedSortType, save?: boolean) => void;
  updateTimeRange: (timeRange: string, save?: boolean) => void;
  savePreferences: (preferences: any) => void;
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
  const [currentSort, setCurrentSort] = useState<FeedSortType>(FeedSortType.HOT);
  const [currentTimeRange, setCurrentTimeRange] = useState('day');

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

  const savePreferences = (preferences: any) => {
    localStorage.setItem('feedPreferences', JSON.stringify(preferences));
  };

  useEffect(() => {
    const savedSort = localStorage.getItem('feedSort') as FeedSortType;
    const savedTimeRange = localStorage.getItem('feedTimeRange');
    
    if (savedSort) setCurrentSort(savedSort);
    if (savedTimeRange) setCurrentTimeRange(savedTimeRange);
  }, []);

  return {
    currentSort,
    currentTimeRange,
    updateSort,
    updateTimeRange,
    savePreferences
  };
};

export const useFeedPreferences = (): FeedPreferences => {
  return useFeedSortingPreferences();
};

export const useDisplayPreferences = (): DisplayPreferences => {
  const [preferences, setPreferences] = useState({
    showTrending: true,
    showSocialProof: true,
    showTrendingBadges: true,
    showPreviews: true,
    compactMode: false,
    infiniteScroll: true,
    postsPerPage: 20
  });

  const updateDisplayPreferences = (newPreferences: Partial<DisplayPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
    localStorage.setItem('displayPreferences', JSON.stringify({ ...preferences, ...newPreferences }));
  };

  useEffect(() => {
    const saved = localStorage.getItem('displayPreferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse display preferences:', e);
      }
    }
  }, []);

  return {
    ...preferences,
    updateDisplayPreferences
  };
};

export const useAutoRefreshPreferences = (): AutoRefreshPreferences => {
  const [preferences, setPreferences] = useState({
    enabled: false,
    isEnabled: false,
    interval: 30000 // 30 seconds
  });

  const updateAutoRefreshPreferences = (newPreferences: Partial<AutoRefreshPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
    localStorage.setItem('autoRefreshPreferences', JSON.stringify({ ...preferences, ...newPreferences }));
  };

  useEffect(() => {
    const saved = localStorage.getItem('autoRefreshPreferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse auto refresh preferences:', e);
      }
    }
  }, []);

  return {
    ...preferences,
    isEnabled: preferences.enabled,
    updateAutoRefreshPreferences
  };
};