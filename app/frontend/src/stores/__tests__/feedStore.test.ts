import { useFeedStore, filterPosts, generateFilterKey } from '../feedStore';

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
      sortBy: 'hot',
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
    useFeedStore.getState().updateFilter({ sortBy: 'new', timeRange: '7d' });
    
    const state = useFeedStore.getState();
    expect(state.filters).toEqual({ 
      sortBy: 'new',
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
    useFeedStore.getState().updateFilter({ sortBy: 'new' });
    useFeedStore.getState().setError('Some error');
    
    // Reset
    useFeedStore.getState().resetFeed();
    
    // Check that state is reset
    const state = useFeedStore.getState();
    expect(state.posts).toEqual([]);
    expect(state.filters.sortBy).toBe('hot'); // Back to default
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
    expect(filters.sortBy).toBe('hot');
  });

  // Test utility functions
  it('should filter posts by time range', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const posts = [
      { id: '1', title: 'Recent Post', createdAt: now },
      { id: '2', title: '1 Hour Old', createdAt: oneHourAgo },
      { id: '3', title: '1 Day Old', createdAt: oneDayAgo },
      { id: '4', title: '1 Week Old', createdAt: oneWeekAgo }
    ] as any;
    
    // Test 1 hour filter
    const oneHourFilter = { timeRange: '1h' } as any;
    const oneHourFiltered = filterPosts(posts, oneHourFilter);
    expect(oneHourFiltered).toHaveLength(2); // Recent and 1 hour old
    
    // Test 24 hour filter
    const oneDayFilter = { timeRange: '24h' } as any;
    const oneDayFiltered = filterPosts(posts, oneDayFilter);
    expect(oneDayFiltered).toHaveLength(3); // Recent, 1 hour old, and 1 day old
    
    // Test 7 day filter
    const oneWeekFilter = { timeRange: '7d' } as any;
    const oneWeekFiltered = filterPosts(posts, oneWeekFilter);
    expect(oneWeekFiltered).toHaveLength(4); // All posts
  });

  it('should generate filter keys correctly', () => {
    const filters = { 
      sortBy: 'hot',
      timeRange: '24h',
      communityId: 'test-community'
    };
    
    const filterKey = generateFilterKey(filters as any);
    expect(filterKey).toBe(JSON.stringify(filters));
  });
});