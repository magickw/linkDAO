import useFeedStore, { filterPosts, generateFilterKey } from '../feedStore';
import { FeedSortType } from '../../types/feed';

// Import testing utilities
import '@testing-library/jest-dom';

// Mock the offline feed manager
jest.mock('../../services/offlineFeedManager', () => ({
  offlineFeedManager: {
    savePosts: jest.fn(),
    getCachedPosts: jest.fn(),
    clearAllCache: jest.fn()
  }
}));

describe('Feed Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useFeedStore.getState().resetFeed();
  });

  it('should initialize with default state', () => {
    const state = useFeedStore.getState();
    
    expect(state.posts).toEqual([]);
    expect(state.filteredPosts).toEqual([]);
    expect(state.filters).toEqual({ 
      sortBy: FeedSortType.HOT,
      timeRange: '24h'
    });
    expect(state.displaySettings).toEqual({
      showSocialProof: true,
      showTrendingBadges: true,
      infiniteScroll: true,
      postsPerPage: 20
    });
    expect(state.loading).toEqual({
      initial: false,
      more: false,
      refreshing: false
    });
    expect(state.error).toBeNull();
    expect(state.pagination).toEqual({
      currentPage: 1,
      totalPages: 1,
      hasMore: true
    });
  });

  it('should set posts correctly', () => {
    const posts = [
      { id: '1', title: 'Post 1' },
      { id: '2', title: 'Post 2' }
    ] as any;
    
    useFeedStore.getState().setPosts(posts);
    
    const state = useFeedStore.getState();
    expect(state.posts).toEqual(posts);
    expect(state.filteredPosts).toEqual(posts);
  });

  it('should append posts correctly', () => {
    const initialPosts = [
      { id: '1', title: 'Post 1' }
    ] as any;
    
    const newPosts = [
      { id: '2', title: 'Post 2' }
    ] as any;
    
    useFeedStore.getState().setPosts(initialPosts);
    useFeedStore.getState().appendPosts(newPosts);
    
    const state = useFeedStore.getState();
    expect(state.posts).toEqual([...initialPosts, ...newPosts]);
    expect(state.filteredPosts).toEqual([...initialPosts, ...newPosts]);
  });

  it('should update filters correctly', () => {
    useFeedStore.getState().updateFilter({ sortBy: FeedSortType.NEW, timeRange: '7d' });
    
    const state = useFeedStore.getState();
    expect(state.filters).toEqual({ 
      sortBy: FeedSortType.NEW,
      timeRange: '7d'
    });
  });

  it('should update display settings correctly', () => {
    useFeedStore.getState().updateDisplaySettings({ 
      showSocialProof: false,
      postsPerPage: 10
    });
    
    const state = useFeedStore.getState();
    expect(state.displaySettings.showSocialProof).toBe(false);
    expect(state.displaySettings.postsPerPage).toBe(10);
    // Other settings should remain unchanged
    expect(state.displaySettings.showTrendingBadges).toBe(true);
    expect(state.displaySettings.infiniteScroll).toBe(true);
  });

  it('should update loading state correctly', () => {
    useFeedStore.getState().setLoading({ initial: true, more: true });
    
    const state = useFeedStore.getState();
    expect(state.loading.initial).toBe(true);
    expect(state.loading.more).toBe(true);
    expect(state.loading.refreshing).toBe(false); // Should remain unchanged
  });

  it('should set error correctly', () => {
    const errorMessage = 'Failed to load posts';
    useFeedStore.getState().setError(errorMessage);
    
    const state = useFeedStore.getState();
    expect(state.error).toBe(errorMessage);
  });

  it('should set pagination correctly', () => {
    useFeedStore.getState().setPagination({ 
      currentPage: 2,
      totalPages: 5,
      hasMore: false
    });
    
    const state = useFeedStore.getState();
    expect(state.pagination.currentPage).toBe(2);
    expect(state.pagination.totalPages).toBe(5);
    expect(state.pagination.hasMore).toBe(false);
  });

  it('should handle optimistic post addition', () => {
    const post = { id: 'optimistic-1', title: 'Optimistic Post' } as any;
    
    useFeedStore.getState().optimisticAddPost(post);
    
    const state = useFeedStore.getState();
    expect(state.posts).toHaveLength(1);
    expect(state.posts[0]).toEqual(post);
    expect(state.filteredPosts).toHaveLength(1);
    expect(state.filteredPosts[0]).toEqual(post);
  });

  it('should remove optimistic post', () => {
    const posts = [
      { id: '1', title: 'Post 1' },
      { id: 'optimistic-1', title: 'Optimistic Post' },
      { id: '2', title: 'Post 2' }
    ] as any;
    
    useFeedStore.getState().setPosts(posts);
    useFeedStore.getState().removeOptimisticPost('optimistic-1');
    
    const state = useFeedStore.getState();
    expect(state.posts).toHaveLength(2);
    expect(state.posts.find(p => p.id === 'optimistic-1')).toBeUndefined();
    expect(state.filteredPosts).toHaveLength(2);
    expect(state.filteredPosts.find(p => p.id === 'optimistic-1')).toBeUndefined();
  });

  it('should update post correctly', () => {
    const posts = [
      { id: '1', title: 'Original Title', content: 'Original content' },
      { id: '2', title: 'Post 2' }
    ] as any;
    
    useFeedStore.getState().setPosts(posts);
    useFeedStore.getState().updatePost('1', { 
      title: 'Updated Title',
      content: 'Updated content'
    });
    
    const state = useFeedStore.getState();
    expect(state.posts[0].title).toBe('Updated Title');
    expect(state.posts[0].content).toBe('Updated content');
    expect(state.posts[1]).toEqual(posts[1]); // Other posts should be unchanged
  });

  it('should reset feed to initial state', () => {
    // Set some state
    useFeedStore.getState().setPosts([{ id: '1', title: 'Post 1' }] as any);
    useFeedStore.getState().updateFilter({ sortBy: FeedSortType.NEW });
    useFeedStore.getState().setError('Some error');
    
    // Reset
    useFeedStore.getState().resetFeed();
    
    // Check that state is reset
    const state = useFeedStore.getState();
    expect(state.posts).toEqual([]);
    expect(state.filters.sortBy).toBe(FeedSortType.HOT); // Back to default
    expect(state.error).toBeNull();
  });

  it('should handle online/offline status', () => {
    useFeedStore.getState().setIsOnline(false);
    
    let state = useFeedStore.getState();
    expect(state.isOnline).toBe(false);
    
    useFeedStore.getState().setIsOnline(true);
    state = useFeedStore.getState();
    expect(state.isOnline).toBe(true);
  });

  it('should handle offline data status', () => {
    useFeedStore.getState().setHasOfflineData(true);
    
    const state = useFeedStore.getState();
    expect(state.hasOfflineData).toBe(true);
  });

  // Test selector hooks
  it('should provide correct selector hooks', () => {
    const posts = [{ id: '1', title: 'Test Post' }] as any;
    useFeedStore.getState().setPosts(posts);
    
    // Test individual selectors
    const selectedPosts = useFeedStore.getState().posts;
    expect(selectedPosts).toEqual(posts);
    
    const filters = useFeedStore.getState().filters;
    expect(filters.sortBy).toBe(FeedSortType.HOT);
    expect(filters.timeRange).toBe('24h');
  });

  // Test utility functions
  it('should generate correct filter keys', () => {
    const filters = { 
      sortBy: FeedSortType.HOT, 
      timeRange: '24h' 
    };
    
    const key = generateFilterKey(filters);
    expect(key).toBe(JSON.stringify(filters));
  });

  it('should filter posts by time range', () => {
    const now = new Date();
    const posts = [
      { id: '1', createdAt: new Date(now.getTime() - 30 * 60 * 1000) }, // 30 minutes ago
      { id: '2', createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) }, // 2 hours ago
      { id: '3', createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000) }, // 25 hours ago
    ] as any;

    // Test 1 hour filter
    let filtered = filterPosts(posts, { sortBy: FeedSortType.HOT, timeRange: '1h' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');

    // Test 24 hour filter
    filtered = filterPosts(posts, { sortBy: FeedSortType.HOT, timeRange: '24h' });
    expect(filtered).toHaveLength(2);
    expect(filtered.map(p => p.id)).toEqual(['1', '2']);

    // Test 7 day filter
    filtered = filterPosts(posts, { sortBy: FeedSortType.HOT, timeRange: '7d' });
    expect(filtered).toHaveLength(3);
  });

  it('should handle edge cases in filtering', () => {
    // Test with no time range
    const posts = [{ id: '1', createdAt: new Date() }] as any;
    const filtered = filterPosts(posts, { sortBy: FeedSortType.HOT });
    expect(filtered).toHaveLength(1);

    // Test with unknown time range
    const filtered2 = filterPosts(posts, { sortBy: FeedSortType.HOT, timeRange: 'unknown' });
    expect(filtered2).toHaveLength(1);
  });
});