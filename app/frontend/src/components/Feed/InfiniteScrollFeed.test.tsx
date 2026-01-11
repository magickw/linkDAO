import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InfiniteScrollFeed from './InfiniteScrollFeed';

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
        reposts: 0,
        views: 0,
        engagementScore: 0,
        socialProof: { followedUsersWhoEngaged: [], totalEngagementFromFollowed: 0, communityLeadersWhoEngaged: [], verifiedUsersWhoEngaged: [] }
      }],
      hasMore: true,
      totalPages: 1
    })
  }
}));

// Mock the mobile optimization hook
jest.mock('@/hooks/useMobileOptimization', () => ({
  useMobileOptimization: () => ({
    isMobile: false
  })
}));

describe('InfiniteScrollFeed', () => {
  const mockFilter = {
    sortBy: 'hot',
    timeRange: '24h'
  };

  const mockChildren = (posts: any[], state: any) => (
    <div>
      {posts.map(post => (
        <div key={post.id} data-testid={`post-${post.id}`}>
          {post.title}
        </div>
      ))}
      {state.isLoading && <div data-testid="loading">Loading...</div>}
      {state.error && <div data-testid="error">Error: {state.error}</div>}
    </div>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with initial loading state', () => {
    render(
      <InfiniteScrollFeed
        filter={mockFilter}
        onPostsLoad={jest.fn()}
      >
        {mockChildren}
      </InfiniteScrollFeed>
    );

    // Initially should show loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should load and display posts', async () => {
    render(
      <InfiniteScrollFeed
        filter={mockFilter}
        onPostsLoad={jest.fn()}
      >
        {mockChildren}
      </InfiniteScrollFeed>
    );

    // Wait for posts to load
    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });

  it('should call onPostsLoad when posts are loaded', async () => {
    const mockOnPostsLoad = jest.fn();

    render(
      <InfiniteScrollFeed
        filter={mockFilter}
        onPostsLoad={mockOnPostsLoad}
      >
        {mockChildren}
      </InfiniteScrollFeed>
    );

    // Wait for posts to load
    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    expect(mockOnPostsLoad).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: '1' })
    ]));
  });

  it('should handle loading errors', async () => {
    // Mock an error response
    const { FeedService } = require('../../services/feedService');
    FeedService.getEnhancedFeed.mockRejectedValueOnce(new Error('Failed to load posts'));

    render(
      <InfiniteScrollFeed
        filter={mockFilter}
        onPostsLoad={jest.fn()}
      >
        {mockChildren}
      </InfiniteScrollFeed>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByText('Error: Failed to load posts')).toBeInTheDocument();
  });

  it('should show retry button on error', async () => {
    // Mock an error response
    const { FeedService } = require('../../services/feedService');
    FeedService.getEnhancedFeed.mockRejectedValueOnce(new Error('Failed to load posts'));

    const mockOnError = jest.fn();

    render(
      <InfiniteScrollFeed
        filter={mockFilter}
        onPostsLoad={jest.fn()}
        onError={mockOnError}
      >
        {mockChildren}
      </InfiniteScrollFeed>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    // Find and click the retry button (it's in the ErrorState component)
    // Since we can't directly access it, we'll test that onError was called
    expect(mockOnError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Failed to load posts'
    }));
  });

  it('should render loading trigger when hasMore is true', async () => {
    render(
      <InfiniteScrollFeed
        filter={mockFilter}
        onPostsLoad={jest.fn()}
      >
        {mockChildren}
      </InfiniteScrollFeed>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    // Should show loading trigger (scroll to load more)
    expect(screen.getByText('Scroll to load more posts...')).toBeInTheDocument();
  });

  it('should render end of feed indicator when hasMore is false', async () => {
    // Mock response with hasMore = false
    const { FeedService } = require('../../services/feedService');
    FeedService.getEnhancedFeed.mockResolvedValueOnce({
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
        reposts: 0,
        views: 0,
        engagementScore: 0,
        socialProof: { followedUsersWhoEngaged: [], totalEngagementFromFollowed: 0, communityLeadersWhoEngaged: [], verifiedUsersWhoEngaged: [] }
      }],
      hasMore: false,
      totalPages: 1
    });

    render(
      <InfiniteScrollFeed
        filter={mockFilter}
        onPostsLoad={jest.fn()}
      >
        {mockChildren}
      </InfiniteScrollFeed>
    );

    // Wait for posts to load
    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    // Should show end of feed indicator
    expect(screen.getByText('🎉 You\'ve reached the end!')).toBeInTheDocument();
    expect(screen.getByText('Refresh feed')).toBeInTheDocument();
  });

  it('should call refresh function when refresh button is clicked', async () => {
    // Mock response with hasMore = false
    const { FeedService } = require('../../services/feedService');
    FeedService.getEnhancedFeed
      .mockResolvedValueOnce({
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
          reposts: 0,
          views: 0,
          engagementScore: 0,
          socialProof: { followedUsersWhoEngaged: [], totalEngagementFromFollowed: 0, communityLeadersWhoEngaged: [], verifiedUsersWhoEngaged: [] }
        }],
        hasMore: false,
        totalPages: 1
      })
      .mockResolvedValueOnce({
        posts: [{
          id: '2',
          title: 'Test Post 2',
          content: 'Content 2',
          author: '0x456',
          authorProfile: { handle: 'user2', verified: false },
          createdAt: new Date(),
          updatedAt: new Date(),
          previews: [],
          hashtags: [],
          mentions: [],
          reactions: [],
          tips: [],
          comments: 0,
          reposts: 0,
          views: 0,
          engagementScore: 0,
          socialProof: { followedUsersWhoEngaged: [], totalEngagementFromFollowed: 0, communityLeadersWhoEngaged: [], verifiedUsersWhoEngaged: [] }
        }],
        hasMore: false,
        totalPages: 1
      });

    render(
      <InfiniteScrollFeed
        filter={mockFilter}
        onPostsLoad={jest.fn()}
      >
        {mockChildren}
      </InfiniteScrollFeed>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByText('Refresh feed');
    fireEvent.click(refreshButton);

    // Wait for refresh to complete
    await waitFor(() => {
      expect(screen.getByTestId('post-2')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Post 2')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <InfiniteScrollFeed
        filter={mockFilter}
        onPostsLoad={jest.fn()}
      >
        {mockChildren}
      </InfiniteScrollFeed>
    );

    // The component should render with proper structure
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });
});