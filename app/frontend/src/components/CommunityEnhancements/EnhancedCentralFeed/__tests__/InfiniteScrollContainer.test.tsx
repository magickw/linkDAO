import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import InfiniteScrollContainer, { useInfiniteScrollContainer } from '../InfiniteScrollContainer';
import { EnhancedPost } from '../../../../types/communityEnhancements';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock scrollTo
window.HTMLElement.prototype.scrollTo = jest.fn();

// Sample test data
const createMockPost = (id: string, title: string): EnhancedPost => ({
  id,
  title,
  content: `Content for post ${id}`,
  author: {
    id: `author-${id}`,
    username: `user${id}`,
    avatar: '/avatar.jpg',
    reputation: 100,
    badges: [],
    walletAddress: '0x123',
    mutualConnections: 0,
    isFollowing: false,
  },
  timestamp: new Date(),
  postType: 'discussion',
  priority: 'normal',
  engagement: {
    upvotes: 10,
    downvotes: 2,
    comments: 5,
    tips: [],
    reactions: [],
  },
  previews: {},
  realTimeData: {
    isLive: false,
    recentActivity: [],
  },
});

const mockPosts = Array.from({ length: 20 }, (_, i) => 
  createMockPost(`post-${i}`, `Post ${i}`)
);

describe('InfiniteScrollContainer', () => {
  const mockOnLoadMore = jest.fn();
  const mockOnRetry = jest.fn();
  const mockOnRefresh = jest.fn();
  const mockRenderItem = jest.fn((item: EnhancedPost, index: number) => (
    <div key={item.id} data-testid={`post-${item.id}`}>
      {item.title} - Index: {index}
    </div>
  ));

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Basic Rendering', () => {
    it('renders items correctly', () => {
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('post-post-0')).toBeInTheDocument();
      expect(screen.getByTestId('post-post-4')).toBeInTheDocument();
      expect(screen.getByText('Post 0 - Index: 0')).toBeInTheDocument();
    });

    it('renders empty state when no items', () => {
      render(
        <InfiniteScrollContainer
          items={[]}
          hasMore={false}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByText('No posts found')).toBeInTheDocument();
      expect(screen.getByText('Be the first to share something with the community!')).toBeInTheDocument();
    });

    it('renders custom empty state', () => {
      const customEmpty = () => <div>Custom empty message</div>;
      
      render(
        <InfiniteScrollContainer
          items={[]}
          hasMore={false}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          renderEmpty={customEmpty}
        />
      );

      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 3)}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('infinite-scroll-container', 'custom-class');
    });
  });

  describe('Loading States', () => {
    it('renders loading state', () => {
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={true}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByText('Loading more posts...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // spinner
    });

    it('renders custom loading state', () => {
      const customLoading = () => <div>Custom loading...</div>;
      
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={true}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          renderLoading={customLoading}
        />
      );

      expect(screen.getByText('Custom loading...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('renders error state', () => {
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={false}
          error="Failed to load posts"
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByText('⚠️ Failed to load posts')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('calls onRetry when retry button clicked', async () => {
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={false}
          error="Failed to load posts"
          onLoadMore={mockOnLoadMore}
          onRetry={mockOnRetry}
          renderItem={mockRenderItem}
        />
      );

      fireEvent.click(screen.getByText('Try Again'));
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('renders custom error state', () => {
      const customError = (error: string, onRetry: () => void) => (
        <div>
          <span>Custom error: {error}</span>
          <button onClick={onRetry}>Retry</button>
        </div>
      );
      
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={false}
          error="Network error"
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          renderError={customError}
        />
      );

      expect(screen.getByText('Custom error: Network error')).toBeInTheDocument();
    });
  });

  describe('End of Feed', () => {
    it('renders end of feed state', () => {
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={false}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          onRefresh={mockOnRefresh}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByText('🎉 You\'ve reached the end!')).toBeInTheDocument();
      expect(screen.getByText('Refresh feed')).toBeInTheDocument();
    });

    it('calls onRefresh when refresh button clicked', async () => {
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={false}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          onRefresh={mockOnRefresh}
          renderItem={mockRenderItem}
        />
      );

      fireEvent.click(screen.getByText('Refresh feed'));
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('renders custom end of feed state', () => {
      const customEndOfFeed = () => <div>Custom end message</div>;
      
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={false}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          renderEndOfFeed={customEndOfFeed}
        />
      );

      expect(screen.getByText('Custom end message')).toBeInTheDocument();
    });
  });

  describe('Load More Button', () => {
    it('renders load more button when enabled', () => {
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          enableLoadMoreButton={true}
        />
      );

      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    it('calls onLoadMore when load more button clicked', async () => {
      mockOnLoadMore.mockResolvedValue(undefined);
      
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          enableLoadMoreButton={true}
        />
      );

      fireEvent.click(screen.getByText('Load More'));
      await waitFor(() => {
        expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
      });
    });

    it('disables load more button when loading', () => {
      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={true}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          enableLoadMoreButton={true}
        />
      );

      expect(screen.getByText('Load More')).toBeDisabled();
    });
  });

  describe('Virtual Scrolling', () => {
    it('applies virtual scrolling styles when enabled', () => {
      const { container } = render(
        <InfiniteScrollContainer
          items={mockPosts}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          enableVirtualScrolling={true}
          itemHeight={200}
        />
      );

      const scrollContainer = container.querySelector('.infinite-scroll-container');
      expect(scrollContainer).toHaveStyle({ height: '100%', overflowY: 'auto' });
    });

    it('calculates total height correctly for virtual scrolling', () => {
      const { container } = render(
        <InfiniteScrollContainer
          items={mockPosts}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          enableVirtualScrolling={true}
          itemHeight={200}
        />
      );

      const virtualContainer = container.querySelector('div[style*="height"]');
      expect(virtualContainer).toHaveStyle({ height: `${mockPosts.length * 200}px` });
    });

    it('disables virtual scrolling when specified', () => {
      const { container } = render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          enableVirtualScrolling={false}
        />
      );

      const scrollContainer = container.querySelector('.infinite-scroll-container');
      expect(scrollContainer).toHaveStyle({ overflowY: 'visible' });
    });
  });

  describe('Scroll Position Restoration', () => {
    it('saves scroll position to sessionStorage', async () => {
      jest.useFakeTimers();
      
      const { container } = render(
        <InfiniteScrollContainer
          items={mockPosts}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          scrollKey="test-feed"
          restoreScrollPosition={true}
          enableVirtualScrolling={true}
        />
      );

      const scrollContainer = container.querySelector('.infinite-scroll-container');
      
      // Simulate scroll
      act(() => {
        fireEvent.scroll(scrollContainer!, { target: { scrollTop: 500 } });
      });

      // Fast-forward timers to trigger debounced save
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
          'infiniteScrollPosition_test-feed',
          expect.stringContaining('"scrollTop":500')
        );
      });

      jest.useRealTimers();
    });

    it('restores scroll position from sessionStorage', () => {
      const savedPosition = JSON.stringify({
        scrollTop: 300,
        timestamp: Date.now()
      });
      mockSessionStorage.getItem.mockReturnValue(savedPosition);

      const { container } = render(
        <InfiniteScrollContainer
          items={mockPosts}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          scrollKey="test-feed"
          restoreScrollPosition={true}
        />
      );

      const scrollContainer = container.querySelector('.infinite-scroll-container');
      expect(scrollContainer?.scrollTop).toBe(300);
    });

    it('does not restore old scroll position', () => {
      const oldPosition = JSON.stringify({
        scrollTop: 300,
        timestamp: Date.now() - (31 * 60 * 1000) // 31 minutes ago
      });
      mockSessionStorage.getItem.mockReturnValue(oldPosition);

      const { container } = render(
        <InfiniteScrollContainer
          items={mockPosts}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          scrollKey="test-feed"
          restoreScrollPosition={true}
        />
      );

      const scrollContainer = container.querySelector('.infinite-scroll-container');
      expect(scrollContainer?.scrollTop).toBe(0);
    });
  });

  describe('Performance Features', () => {
    it('respects maxItems limit', () => {
      render(
        <InfiniteScrollContainer
          items={mockPosts}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          maxItems={5}
          enableVirtualScrolling={false}
        />
      );

      // Should only render first 5 items
      expect(screen.getByTestId('post-post-0')).toBeInTheDocument();
      expect(screen.getByTestId('post-post-4')).toBeInTheDocument();
      expect(screen.queryByTestId('post-post-5')).not.toBeInTheDocument();
    });

    it('debounces load more calls', async () => {
      jest.useFakeTimers();
      mockOnLoadMore.mockResolvedValue(undefined);

      render(
        <InfiniteScrollContainer
          items={mockPosts.slice(0, 5)}
          hasMore={true}
          isLoading={false}
          onLoadMore={mockOnLoadMore}
          renderItem={mockRenderItem}
          enableLoadMoreButton={true}
          debounceMs={100}
        />
      );

      const loadMoreButton = screen.getByText('Load More');
      
      // Click multiple times rapidly
      fireEvent.click(loadMoreButton);
      fireEvent.click(loadMoreButton);
      fireEvent.click(loadMoreButton);

      // Fast-forward past debounce time
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });
});

describe('useInfiniteScrollContainer Hook', () => {
  const mockLoadFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads initial data', async () => {
    const mockResponse = {
      items: mockPosts.slice(0, 5),
      hasMore: true,
      totalPages: 4
    };
    mockLoadFunction.mockResolvedValue(mockResponse);

    const TestComponent = () => {
      const { items, isLoading, hasMore } = useInfiniteScrollContainer(
        mockLoadFunction,
        { initialLoad: true }
      );

      return (
        <div>
          <div data-testid="loading">{isLoading.toString()}</div>
          <div data-testid="hasMore">{hasMore.toString()}</div>
          <div data-testid="itemCount">{items.length}</div>
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('itemCount')).toHaveTextContent('5');
      expect(screen.getByTestId('hasMore')).toHaveTextContent('true');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(mockLoadFunction).toHaveBeenCalledWith(1);
  });

  it('loads more data when loadMore is called', async () => {
    const initialResponse = {
      items: mockPosts.slice(0, 5),
      hasMore: true,
      totalPages: 4
    };
    const moreResponse = {
      items: mockPosts.slice(5, 10),
      hasMore: true,
      totalPages: 4
    };

    mockLoadFunction
      .mockResolvedValueOnce(initialResponse)
      .mockResolvedValueOnce(moreResponse);

    const TestComponent = () => {
      const { items, loadMore, isLoading } = useInfiniteScrollContainer(
        mockLoadFunction,
        { initialLoad: true }
      );

      return (
        <div>
          <div data-testid="itemCount">{items.length}</div>
          <button onClick={loadMore} disabled={isLoading}>
            Load More
          </button>
        </div>
      );
    };

    render(<TestComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('itemCount')).toHaveTextContent('5');
    });

    // Load more
    fireEvent.click(screen.getByText('Load More'));

    await waitFor(() => {
      expect(screen.getByTestId('itemCount')).toHaveTextContent('10');
    });

    expect(mockLoadFunction).toHaveBeenCalledTimes(2);
    expect(mockLoadFunction).toHaveBeenNthCalledWith(1, 1);
    expect(mockLoadFunction).toHaveBeenNthCalledWith(2, 2);
  });

  it('handles errors correctly', async () => {
    const error = new Error('Load failed');
    mockLoadFunction.mockRejectedValue(error);

    const TestComponent = () => {
      const { items, error: hookError, retry } = useInfiniteScrollContainer(
        mockLoadFunction,
        { initialLoad: true }
      );

      return (
        <div>
          <div data-testid="itemCount">{items.length}</div>
          <div data-testid="error">{hookError || 'no error'}</div>
          <button onClick={retry}>Retry</button>
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Load failed');
      expect(screen.getByTestId('itemCount')).toHaveTextContent('0');
    });
  });

  it('refreshes data correctly', async () => {
    const initialResponse = {
      items: mockPosts.slice(0, 5),
      hasMore: true,
      totalPages: 4
    };
    const refreshResponse = {
      items: mockPosts.slice(10, 15),
      hasMore: true,
      totalPages: 4
    };

    mockLoadFunction
      .mockResolvedValueOnce(initialResponse)
      .mockResolvedValueOnce(refreshResponse);

    const TestComponent = () => {
      const { items, refresh } = useInfiniteScrollContainer(
        mockLoadFunction,
        { initialLoad: true }
      );

      return (
        <div>
          <div data-testid="itemCount">{items.length}</div>
          <div data-testid="firstItem">{items[0]?.id || 'none'}</div>
          <button onClick={refresh}>Refresh</button>
        </div>
      );
    };

    render(<TestComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('itemCount')).toHaveTextContent('5');
      expect(screen.getByTestId('firstItem')).toHaveTextContent('post-0');
    });

    // Refresh
    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('itemCount')).toHaveTextContent('5');
      expect(screen.getByTestId('firstItem')).toHaveTextContent('post-10');
    });
  });

  it('respects maxItems option', async () => {
    const mockResponse = {
      items: mockPosts.slice(0, 10),
      hasMore: true,
      totalPages: 2
    };
    mockLoadFunction.mockResolvedValue(mockResponse);

    const TestComponent = () => {
      const { items } = useInfiniteScrollContainer(
        mockLoadFunction,
        { initialLoad: true, maxItems: 5 }
      );

      return <div data-testid="itemCount">{items.length}</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('itemCount')).toHaveTextContent('5');
    });
  });
});