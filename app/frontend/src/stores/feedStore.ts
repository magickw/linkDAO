import { create } from 'zustand';
import { EnhancedPost, FeedFilter } from '../types/feed';
import { offlineFeedManager } from '../services/offlineFeedManager';

// Define the feed state interface
interface FeedState {
  // Posts data
  posts: EnhancedPost[];
  filteredPosts: EnhancedPost[];
  
  // Feed filters and settings
  filters: FeedFilter;
  displaySettings: {
    showSocialProof: boolean;
    showTrendingBadges: boolean;
    infiniteScroll: boolean;
    postsPerPage: number;
  };
  
  // Loading and error states
  loading: {
    initial: boolean;
    more: boolean;
    refreshing: boolean;
  };
  error: string | null;
  
  // Pagination
  pagination: {
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };
  
  // Offline support
  isOnline: boolean;
  hasOfflineData: boolean;
  
  // Actions
  setPosts: (posts: EnhancedPost[]) => void;
  setFilteredPosts: (posts: EnhancedPost[]) => void;
  appendPosts: (posts: EnhancedPost[]) => void;
  updateFilter: (filter: Partial<FeedFilter>) => void;
  updateDisplaySettings: (settings: Partial<FeedState['displaySettings']>) => void;
  setLoading: (loading: Partial<FeedState['loading']>) => void;
  setError: (error: string | null) => void;
  setPagination: (pagination: Partial<FeedState['pagination']>) => void;
  setIsOnline: (isOnline: boolean) => void;
  setHasOfflineData: (hasOfflineData: boolean) => void;
  
  // Optimistic updates
  optimisticAddPost: (post: EnhancedPost) => void;
  removeOptimisticPost: (postId: string) => void;
  updatePost: (postId: string, updates: Partial<EnhancedPost>) => void;
  
  // Refresh and reset
  refreshFeed: () => Promise<void>;
  resetFeed: () => void;
  
  // Offline operations
  saveOffline: () => Promise<void>;
  loadOffline: () => Promise<void>;
  clearOffline: () => Promise<void>;
}

// Create the feed store
export const useFeedStore = create<FeedState>((set, get) => ({
  // Initial state
  posts: [],
  filteredPosts: [],
  filters: { 
    sortBy: 'hot',
    timeRange: '24h'
  },
  displaySettings: {
    showSocialProof: true,
    showTrendingBadges: true,
    infiniteScroll: true,
    postsPerPage: 20
  },
  loading: {
    initial: false,
    more: false,
    refreshing: false
  },
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    hasMore: true
  },
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  hasOfflineData: false,

  // Actions
  setPosts: (posts) => set({ posts, filteredPosts: posts }),
  setFilteredPosts: (posts) => set({ filteredPosts: posts }),
  appendPosts: (newPosts) => set((state) => ({
    posts: [...state.posts, ...newPosts],
    filteredPosts: [...state.filteredPosts, ...newPosts]
  })),
  updateFilter: (filter) => set((state) => ({
    filters: { ...state.filters, ...filter }
  })),
  updateDisplaySettings: (settings) => set((state) => ({
    displaySettings: { ...state.displaySettings, ...settings }
  })),
  setLoading: (loading) => set((state) => ({
    loading: { ...state.loading, ...loading }
  })),
  setError: (error) => set({ error }),
  setPagination: (pagination) => set((state) => ({
    pagination: { ...state.pagination, ...pagination }
  })),
  setIsOnline: (isOnline) => set({ isOnline }),
  setHasOfflineData: (hasOfflineData) => set({ hasOfflineData }),
  
  // Optimistic updates
  optimisticAddPost: (post) => set((state) => ({
    posts: [post, ...state.posts],
    filteredPosts: [post, ...state.filteredPosts]
  })),
  
  removeOptimisticPost: (postId) => set((state) => ({
    posts: state.posts.filter(p => p.id !== postId),
    filteredPosts: state.filteredPosts.filter(p => p.id !== postId)
  })),
  
  updatePost: (postId, updates) => set((state) => ({
    posts: state.posts.map(p => 
      p.id === postId ? { ...p, ...updates } : p
    ),
    filteredPosts: state.filteredPosts.map(p => 
      p.id === postId ? { ...p, ...updates } : p
    )
  })),
  
  // Refresh feed
  refreshFeed: async () => {
    const { setLoading, setError } = get();
    
    setLoading({ refreshing: true, initial: true });
    setError(null);
    
    try {
      // In a real implementation, this would fetch fresh data
      // For now, we'll just simulate a refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoading({ refreshing: false, initial: false });
    } catch (error) {
      setError('Failed to refresh feed');
      setLoading({ refreshing: false, initial: false });
    }
  },
  
  // Reset feed
  resetFeed: () => set({
    posts: [],
    filteredPosts: [],
    filters: { 
      sortBy: 'hot',
      timeRange: '24h'
    },
    loading: {
      initial: false,
      more: false,
      refreshing: false
    },
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      hasMore: true
    }
  }),
  
  // Offline operations
  saveOffline: async () => {
    const { posts, filters } = get();
    const filterKey = JSON.stringify(filters);
    
    try {
      await offlineFeedManager.savePosts(posts, filters, filterKey);
      set({ hasOfflineData: true });
    } catch (error) {
      console.error('Failed to save feed data offline:', error);
    }
  },
  
  loadOffline: async () => {
    const { filters } = get();
    const filterKey = JSON.stringify(filters);
    
    try {
      const offlinePosts = await offlineFeedManager.getCachedPosts(filterKey);
      if (offlinePosts.length > 0) {
        set({ 
          posts: offlinePosts,
          filteredPosts: offlinePosts,
          hasOfflineData: true
        });
      }
    } catch (error) {
      console.error('Failed to load offline feed data:', error);
    }
  },
  
  clearOffline: async () => {
    try {
      await offlineFeedManager.clearAllCache();
      set({ hasOfflineData: false });
    } catch (error) {
      console.error('Failed to clear offline feed data:', error);
    }
  }
}));

// Selector hooks for common state slices
export const useFeedPosts = () => useFeedStore(state => state.posts);
export const useFilteredPosts = () => useFeedStore(state => state.filteredPosts);
export const useFeedFilters = () => useFeedStore(state => state.filters);
export const useFeedDisplaySettings = () => useFeedStore(state => state.displaySettings);
export const useFeedLoading = () => useFeedStore(state => state.loading);
export const useFeedError = () => useFeedStore(state => state.error);
export const useFeedPagination = () => useFeedStore(state => state.pagination);
export const useFeedOnlineStatus = () => useFeedStore(state => state.isOnline);
export const useFeedOfflineStatus = () => useFeedStore(state => state.hasOfflineData);

// Action hooks
export const useFeedActions = () => useFeedStore(state => ({
  setPosts: state.setPosts,
  setFilteredPosts: state.setFilteredPosts,
  appendPosts: state.appendPosts,
  updateFilter: state.updateFilter,
  updateDisplaySettings: state.updateDisplaySettings,
  setLoading: state.setLoading,
  setError: state.setError,
  setPagination: state.setPagination,
  setIsOnline: state.setIsOnline,
  setHasOfflineData: state.setHasOfflineData,
  optimisticAddPost: state.optimisticAddPost,
  removeOptimisticPost: state.removeOptimisticPost,
  updatePost: state.updatePost,
  refreshFeed: state.refreshFeed,
  resetFeed: state.resetFeed,
  saveOffline: state.saveOffline,
  loadOffline: state.loadOffline,
  clearOffline: state.clearOffline
}));

// Utility function to generate a filter key
export const generateFilterKey = (filters: FeedFilter): string => {
  return JSON.stringify(filters);
};

// Utility function to check if posts match filters
export const filterPosts = (posts: EnhancedPost[], filters: FeedFilter): EnhancedPost[] => {
  return posts.filter(post => {
    // Filter by time range
    if (filters.timeRange) {
      const now = new Date();
      const postDate = new Date(post.createdAt);
      
      switch (filters.timeRange) {
        case '1h':
          return now.getTime() - postDate.getTime() <= 60 * 60 * 1000;
        case '24h':
          return now.getTime() - postDate.getTime() <= 24 * 60 * 60 * 1000;
        case '7d':
          return now.getTime() - postDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
        case '30d':
          return now.getTime() - postDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    }
    
    return true;
  });
};