import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  PostCardSkeleton, 
  CommunityPostSkeleton, 
  FeedSkeleton, 
  CommunityFeedSkeleton,
  CommunityHeaderSkeleton,
  SidebarSkeleton,
  CommentThreadSkeleton,
  LoadingSpinner,
  ProgressiveLoader
} from '../LoadingSkeletons';
import { 
  FeedErrorBoundary, 
  CommunityErrorBoundary, 
  Web3ErrorBoundary,
  NetworkError,
  OfflineError,
  ErrorDisplay
} from '../ErrorBoundaries';
import { 
  EmptyState, 
  NoPostsState, 
  NoCommunitiesState,
  ConnectionRequiredState,
  LoadingState,
  RetryState,
  MaintenanceState,
  PermissionDeniedState,
  RateLimitState
} from '../FallbackStates';

// Mock error component for testing error boundaries
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('Loading Skeletons', () => {
  test('renders PostCardSkeleton with animation', () => {
    const { container } = render(<PostCardSkeleton />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass('animate-pulse');
  });

  test('renders CommunityPostSkeleton with vote section', () => {
    const { container } = render(<CommunityPostSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test('renders FeedSkeleton with specified post count', () => {
    const { container } = render(<FeedSkeleton postCount={5} />);
    const postCards = container.children[0].children;
    expect(postCards).toHaveLength(5);
  });

  test('renders CommunityFeedSkeleton with default post count', () => {
    const { container } = render(<CommunityFeedSkeleton />);
    const postCards = container.children[0].children;
    expect(postCards).toHaveLength(3);
  });

  test('renders CommunityHeaderSkeleton', () => {
    const { container } = render(<CommunityHeaderSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  test('renders SidebarSkeleton', () => {
    const { container } = render(<SidebarSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test('renders CommentThreadSkeleton with depth', () => {
    const { container } = render(<CommentThreadSkeleton depth={1} />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass('ml-6');
  });

  test('renders LoadingSpinner with different sizes', () => {
    const { container, rerender } = render(<LoadingSpinner size="sm" />);
    expect(container.firstChild).toHaveClass('w-4', 'h-4');
    
    rerender(<LoadingSpinner size="lg" />);
    expect(container.firstChild).toHaveClass('w-8', 'h-8');
  });

  test('renders ProgressiveLoader in loading state', () => {
    render(<ProgressiveLoader isLoading={true} hasMore={true} />);
    expect(screen.getByText('Loading more content...')).toBeInTheDocument();
  });

  test('renders ProgressiveLoader end state', () => {
    render(<ProgressiveLoader isLoading={false} hasMore={false} />);
    expect(screen.getByText("You've reached the end")).toBeInTheDocument();
  });

  test('renders ProgressiveLoader with load more button', () => {
    const mockLoadMore = jest.fn();
    render(<ProgressiveLoader isLoading={false} hasMore={true} onLoadMore={mockLoadMore} />);
    
    const button = screen.getByText('Load More');
    fireEvent.click(button);
    expect(mockLoadMore).toHaveBeenCalled();
  });
});

describe('Error Boundaries', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  test('FeedErrorBoundary catches and displays error', () => {
    render(
      <FeedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FeedErrorBoundary>
    );
    
    expect(screen.getByText('Feed Error')).toBeInTheDocument();
    expect(screen.getByText(/couldn't load your social feed/)).toBeInTheDocument();
  });

  test('FeedErrorBoundary renders children when no error', () => {
    render(
      <FeedErrorBoundary>
        <ThrowError shouldThrow={false} />
      </FeedErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  test('CommunityErrorBoundary displays community-specific error', () => {
    render(
      <CommunityErrorBoundary communityId="test-community">
        <ThrowError shouldThrow={true} />
      </CommunityErrorBoundary>
    );
    
    expect(screen.getByText('Community Error')).toBeInTheDocument();
    expect(screen.getByText(/test-community/)).toBeInTheDocument();
  });

  test('Web3ErrorBoundary displays wallet connection error', () => {
    render(
      <Web3ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </Web3ErrorBoundary>
    );
    
    expect(screen.getByText('Web3 Connection Error')).toBeInTheDocument();
    expect(screen.getByText(/wallet connection/)).toBeInTheDocument();
  });

  test('NetworkError displays with retry button', () => {
    const mockRetry = jest.fn();
    render(<NetworkError error="Connection failed" onRetry={mockRetry} />);
    
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalled();
  });

  test('OfflineError displays offline message', () => {
    render(<OfflineError />);
    expect(screen.getByText("You're Offline")).toBeInTheDocument();
  });

  test('ErrorDisplay renders different types', () => {
    const { rerender } = render(
      <ErrorDisplay type="error" title="Error Title" message="Error message" />
    );
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    
    rerender(
      <ErrorDisplay type="warning" title="Warning Title" message="Warning message" />
    );
    expect(screen.getByText('Warning Title')).toBeInTheDocument();
    
    rerender(
      <ErrorDisplay type="info" title="Info Title" message="Info message" />
    );
    expect(screen.getByText('Info Title')).toBeInTheDocument();
  });
});

describe('Fallback States', () => {
  test('EmptyState renders with action button', () => {
    const mockAction = jest.fn();
    render(
      <EmptyState
        title="Empty Title"
        description="Empty description"
        action={{ label: 'Take Action', onClick: mockAction }}
      />
    );
    
    expect(screen.getByText('Empty Title')).toBeInTheDocument();
    expect(screen.getByText('Empty description')).toBeInTheDocument();
    
    const actionButton = screen.getByText('Take Action');
    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalled();
  });

  test('NoPostsState renders different states based on connection', () => {
    const { rerender } = render(
      <NoPostsState isConnected={false} activeFilter="all" />
    );
    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    
    rerender(
      <NoPostsState isConnected={true} activeFilter="following" />
    );
    expect(screen.getByText('No posts from people you follow')).toBeInTheDocument();
    
    rerender(
      <NoPostsState isConnected={true} activeFilter="trending" />
    );
    expect(screen.getByText('No trending posts right now')).toBeInTheDocument();
  });

  test('NoCommunitiesState renders with explore action', () => {
    const mockExplore = jest.fn();
    render(<NoCommunitiesState onExplore={mockExplore} />);
    
    expect(screen.getByText('No communities yet')).toBeInTheDocument();
    
    const exploreButton = screen.getByText('Explore Communities');
    fireEvent.click(exploreButton);
    expect(mockExplore).toHaveBeenCalled();
  });

  test('ConnectionRequiredState renders with connect action', () => {
    const mockConnect = jest.fn();
    render(<ConnectionRequiredState onConnect={mockConnect} />);
    
    expect(screen.getByText('Wallet Connection Required')).toBeInTheDocument();
    
    const connectButton = screen.getByText('Connect Wallet');
    fireEvent.click(connectButton);
    expect(mockConnect).toHaveBeenCalled();
  });

  test('LoadingState renders with custom message', () => {
    render(<LoadingState message="Custom loading message" />);
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });

  test('RetryState handles retry action', () => {
    const mockRetry = jest.fn();
    render(
      <RetryState
        title="Retry Title"
        message="Retry message"
        onRetry={mockRetry}
      />
    );
    
    expect(screen.getByText('Retry Title')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalled();
  });

  test('RetryState shows retrying state', () => {
    render(
      <RetryState
        title="Retry Title"
        message="Retry message"
        onRetry={() => {}}
        isRetrying={true}
      />
    );
    
    expect(screen.getByText('Retrying...')).toBeInTheDocument();
  });

  test('MaintenanceState renders maintenance message', () => {
    render(<MaintenanceState />);
    expect(screen.getByText('Under Maintenance')).toBeInTheDocument();
  });

  test('PermissionDeniedState renders with resource name', () => {
    render(<PermissionDeniedState resource="community posts" />);
    expect(screen.getByText(/community posts/)).toBeInTheDocument();
  });

  test('RateLimitState renders with time until reset', () => {
    const resetTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    render(<RateLimitState resetTime={resetTime} />);
    
    expect(screen.getByText('Rate Limit Exceeded')).toBeInTheDocument();
    expect(screen.getByText(/5 minutes/)).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  test('error boundary with retry functionality', async () => {
    let shouldThrow = true;
    const mockRetry = jest.fn(() => {
      shouldThrow = false;
    });

    const TestComponent = () => (
      <FeedErrorBoundary onRetry={mockRetry}>
        <ThrowError shouldThrow={shouldThrow} />
      </FeedErrorBoundary>
    );

    const { rerender } = render(<TestComponent />);
    
    // Should show error state
    expect(screen.getByText('Feed Error')).toBeInTheDocument();
    
    // Click retry
    const retryButton = screen.getByText('Reload Feed');
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalled();
    
    // Rerender with no error
    shouldThrow = false;
    rerender(<TestComponent />);
  });

  test('progressive loader handles loading states', () => {
    const mockLoadMore = jest.fn();
    const { rerender } = render(
      <ProgressiveLoader isLoading={false} hasMore={true} onLoadMore={mockLoadMore} />
    );
    
    // Should show load more button
    expect(screen.getByText('Load More')).toBeInTheDocument();
    
    // Click load more
    fireEvent.click(screen.getByText('Load More'));
    expect(mockLoadMore).toHaveBeenCalled();
    
    // Show loading state
    rerender(<ProgressiveLoader isLoading={true} hasMore={true} />);
    expect(screen.getByText('Loading more content...')).toBeInTheDocument();
    
    // Show end state
    rerender(<ProgressiveLoader isLoading={false} hasMore={false} />);
    expect(screen.getByText("You've reached the end")).toBeInTheDocument();
  });
});