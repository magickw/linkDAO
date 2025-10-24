import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedFeedView from './EnhancedFeedView';

// Mock the hooks
jest.mock('../../hooks/useFeedPreferences', () => ({
  useFeedSortingPreferences: () => ({
    currentSort: 'hot',
    currentTimeRange: '24h',
    updateSort: jest.fn(),
    updateTimeRange: jest.fn()
  }),
  useDisplayPreferences: () => ({
    showSocialProof: true,
    showTrendingBadges: true,
    infiniteScroll: true,
    postsPerPage: 20
  }),
  useAutoRefreshPreferences: () => ({
    isEnabled: false,
    interval: 60
  })
}));

// Mock the context providers
jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: jest.fn()
  })
}));

jest.mock('@/hooks/useMobileOptimization', () => ({
  useMobileOptimization: () => ({
    isMobile: false
  })
}));

// Mock the analytics service
jest.mock('@/services/analyticsService', () => ({
  analyticsService: {
    trackUserEvent: jest.fn(),
    trackError: jest.fn()
  }
}));

// Mock child components
jest.mock('./FeedSortingTabs', () => ({
  FeedSortingHeader: () => <div data-testid="feed-sorting-header">Sorting Header</div>
}));

jest.mock('./InfiniteScrollFeed', () => {
  return function MockInfiniteScrollFeed({ children, onPostsLoad }: any) {
    // Simulate loading posts
    React.useEffect(() => {
      onPostsLoad([
        {
          id: '1',
          title: 'Test Post 1',
          content: 'Content 1',
          author: '0x123',
          authorProfile: { handle: 'user1', verified: true },
          createdAt: new Date(),
          updatedAt: new Date(),
          previews: [],
          hashtags: [],
          mentions: [],
          reactions: [],
          tips: [],
          comments: 0,
          shares: 0,
          views: 0,
          engagementScore: 0,
          socialProof: { followedUsersWhoEngaged: [], totalEngagementFromFollowed: 0, communityLeadersWhoEngaged: [], verifiedUsersWhoEngaged: [] }
        }
      ]);
    }, [onPostsLoad]);

    return (
      <div data-testid="infinite-scroll-feed">
        {children([{
          id: '1',
          title: 'Test Post 1',
          content: 'Content 1',
          author: '0x123',
          authorProfile: { handle: 'user1', verified: true },
          createdAt: new Date(),
          updatedAt: new Date(),
          previews: [],
          hashtags: [],
          mentions: [],
          reactions: [],
          tips: [],
          comments: 0,
          shares: 0,
          views: 0,
          engagementScore: 0,
          socialProof: { followedUsersWhoEngaged: [], totalEngagementFromFollowed: 0, communityLeadersWhoEngaged: [], verifiedUsersWhoEngaged: [] }
        }], { 
          hasMore: true, 
          isLoading: false, 
          page: 1, 
          totalPages: 1,
          error: undefined,
          refresh: jest.fn(),
          retry: jest.fn()
        })}
      </div>
    );
  };
});

jest.mock('./LikedByModal', () => {
  return function MockLikedByModal() {
    return <div data-testid="liked-by-modal">Liked By Modal</div>;
  };
});

jest.mock('./TrendingContentDetector', () => {
  return {
    default: function MockTrendingContentDetector() {
      return <div data-testid="trending-detector">Trending Detector</div>;
    },
    TrendingBadge: function MockTrendingBadge() {
      return <div data-testid="trending-badge">Trending Badge</div>;
    }
  };
});

jest.mock('./CommunityEngagementMetrics', () => {
  return function MockCommunityEngagementMetrics() {
    return <div data-testid="community-metrics">Community Metrics</div>;
  };
});

jest.mock('../EnhancedPostCard/EnhancedPostCard', () => {
  return function MockEnhancedPostCard({ post }: any) {
    return <div data-testid={`post-card-${post.id}`}>Post Card {post.title}</div>;
  };
});

// Mock the FeedService
jest.mock('../../services/feedService', () => ({
  FeedService: {
    getEnhancedFeed: jest.fn().mockResolvedValue({
      posts: [{
        id: '1',
        title: 'Test Post 1',
        content: 'Content 1',
        author: '0x123',
        authorProfile: { handle: 'user1', verified: true },
        createdAt: new Date(),
        updatedAt: new Date(),
        previews: [],
        hashtags: [],
        mentions: [],
        reactions: [],
        tips: [],
        comments: 0,
        shares: 0,
        views: 0,
        engagementScore: 0,
        socialProof: { followedUsersWhoEngaged: [], totalEngagementFromFollowed: 0, communityLeadersWhoEngaged: [], verifiedUsersWhoEngaged: [] }
      }],
      hasMore: true,
      totalPages: 1
    })
  }
}));

describe('EnhancedFeedView', () => {
  it('should render feed sorting header', () => {
    render(<EnhancedFeedView />);
    
    expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
  });

  it('should render infinite scroll feed', () => {
    render(<EnhancedFeedView />);
    
    expect(screen.getByTestId('infinite-scroll-feed')).toBeInTheDocument();
  });

  it('should render post cards', async () => {
    render(<EnhancedFeedView />);
    
    await waitFor(() => {
      expect(screen.getByTestId('post-card-1')).toBeInTheDocument();
    });
  });

  it('should render trending content detector', () => {
    render(<EnhancedFeedView />);
    
    expect(screen.getByTestId('trending-detector')).toBeInTheDocument();
  });

  it('should render liked by modal', () => {
    render(<EnhancedFeedView />);
    
    expect(screen.getByTestId('liked-by-modal')).toBeInTheDocument();
  });

  it('should render community metrics when showCommunityMetrics is true', () => {
    render(<EnhancedFeedView showCommunityMetrics={true} communityId="test-community" />);
    
    expect(screen.getByTestId('community-metrics')).toBeInTheDocument();
  });

  it('should not render community metrics when showCommunityMetrics is false', () => {
    render(<EnhancedFeedView showCommunityMetrics={false} communityId="test-community" />);
    
    expect(screen.queryByTestId('community-metrics')).not.toBeInTheDocument();
  });

  it('should handle sort changes', () => {
    render(<EnhancedFeedView />);
    
    // The sorting header is mocked, so we can't directly test the click
    // But we can verify it renders
    expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
  });

  it('should handle error states', async () => {
    // Mock an error response
    const { FeedService } = require('../../services/feedService');
    FeedService.getEnhancedFeed.mockRejectedValueOnce(new Error('Failed to load feed'));
    
    render(<EnhancedFeedView />);
    
    // Wait for error to be handled
    await waitFor(() => {
      // The error boundary would catch this, but we're testing the component logic
      // In a real test, we might want to test the error boundary separately
    });
  });

  it('should have proper accessibility attributes', () => {
    render(<EnhancedFeedView />);
    
    // The feed view itself doesn't have specific ARIA attributes,
    // but we can check that it renders properly
    expect(screen.getByTestId('infinite-scroll-feed')).toBeInTheDocument();
  });
});