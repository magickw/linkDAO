import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommunityView from '../../components/CommunityView';
import { mockCommunityData } from '../../mocks/communityMockData';

// Mock services
jest.mock('../../services/communityService');
jest.mock('../../services/communityPostService');
jest.mock('../../services/governanceService');

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Reddit-Style Community Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Complete User Journey - Community Browsing', () => {
    it('should handle complete community browsing workflow', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      // 1. Community loads with header
      await waitFor(() => {
        expect(screen.getByTestId('community-header')).toBeInTheDocument();
      });

      // 2. Posts load in Reddit-style cards
      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      // 3. Sidebar widgets load
      expect(screen.getByTestId('about-community-widget')).toBeInTheDocument();
      expect(screen.getByTestId('moderator-list-widget')).toBeInTheDocument();
      expect(screen.getByTestId('community-stats-widget')).toBeInTheDocument();

      // 4. User can interact with voting
      const firstPost = screen.getAllByTestId('reddit-style-post-card')[0];
      const upvoteButton = within(firstPost).getByTestId('upvote-button');
      
      await user.click(upvoteButton);
      
      await waitFor(() => {
        expect(within(firstPost).getByTestId('vote-score')).toHaveTextContent('1');
      });

      // 5. User can change sorting
      const sortingTabs = screen.getByTestId('post-sorting-tabs');
      const hotTab = within(sortingTabs).getByText('Hot');
      
      await user.click(hotTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });
    });

    it('should handle mobile responsive behavior', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('community-view')).toBeInTheDocument();
      });

      // Mobile sidebar should be collapsed
      expect(screen.getByTestId('mobile-sidebar-toggle')).toBeInTheDocument();
      
      // Sidebar should be hidden initially
      expect(screen.queryByTestId('left-sidebar')).not.toBeVisible();

      // Click toggle to show sidebar
      await user.click(screen.getByTestId('mobile-sidebar-toggle'));
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-sidebar-overlay')).toBeInTheDocument();
      });
    });
  });

  describe('Post Interaction Workflows', () => {
    it('should handle complete post interaction workflow', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      const firstPost = screen.getAllByTestId('reddit-style-post-card')[0];

      // 1. Vote on post
      const upvoteButton = within(firstPost).getByTestId('upvote-button');
      await user.click(upvoteButton);

      // 2. Save post
      const saveButton = within(firstPost).getByTestId('save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(within(firstPost).getByTestId('save-button')).toHaveAttribute('aria-pressed', 'true');
      });

      // 3. Share post
      const shareButton = within(firstPost).getByTestId('share-button');
      await user.click(shareButton);

      await waitFor(() => {
        expect(screen.getByTestId('share-modal')).toBeInTheDocument();
      });

      // Close share modal
      await user.click(screen.getByTestId('close-share-modal'));

      // 4. Report post
      const reportButton = within(firstPost).getByTestId('report-button');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-modal')).toBeInTheDocument();
      });

      // Select report reason
      const spamOption = screen.getByTestId('report-spam');
      await user.click(spamOption);

      // Submit report
      await user.click(screen.getByTestId('submit-report'));

      await waitFor(() => {
        expect(screen.queryByTestId('report-modal')).not.toBeInTheDocument();
      });
    });

    it('should handle comment preview expansion', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      const firstPost = screen.getAllByTestId('reddit-style-post-card')[0];
      const commentPreview = within(firstPost).getByTestId('comment-preview');

      // Expand comments
      await user.click(commentPreview);

      await waitFor(() => {
        expect(within(firstPost).getByTestId('expanded-comments')).toBeInTheDocument();
      });

      // Collapse comments
      const collapseButton = within(firstPost).getByTestId('collapse-comments');
      await user.click(collapseButton);

      await waitFor(() => {
        expect(within(firstPost).queryByTestId('expanded-comments')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Sorting Workflows', () => {
    it('should handle advanced filtering workflow', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      });

      // 1. Filter by flair
      const flairFilter = screen.getByTestId('flair-filter-discussion');
      await user.click(flairFilter);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // 2. Add author filter
      const authorInput = screen.getByTestId('author-filter-input');
      await user.type(authorInput, 'testuser');

      // 3. Apply time filter
      const timeFilter = screen.getByTestId('time-filter-dropdown');
      await user.click(timeFilter);
      
      const pastWeekOption = screen.getByTestId('time-filter-week');
      await user.click(pastWeekOption);

      await waitFor(() => {
        expect(screen.getByTestId('active-filters')).toBeInTheDocument();
      });

      // 4. Clear all filters
      const clearFiltersButton = screen.getByTestId('clear-all-filters');
      await user.click(clearFiltersButton);

      await waitFor(() => {
        expect(screen.queryByTestId('active-filters')).not.toBeInTheDocument();
      });
    });

    it('should handle sorting with time filters', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('post-sorting-tabs')).toBeInTheDocument();
      });

      // 1. Switch to Top sorting
      const topTab = screen.getByText('Top');
      await user.click(topTab);

      // 2. Time filter dropdown should appear
      await waitFor(() => {
        expect(screen.getByTestId('time-filter-dropdown')).toBeInTheDocument();
      });

      // 3. Select different time periods
      const timeDropdown = screen.getByTestId('time-filter-dropdown');
      await user.click(timeDropdown);

      const monthOption = screen.getByTestId('time-filter-month');
      await user.click(monthOption);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });
    });
  });

  describe('View Mode and Preferences', () => {
    it('should handle view mode toggle workflow', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-mode-toggle')).toBeInTheDocument();
      });

      // Start in card view
      expect(screen.getByTestId('post-list')).toHaveClass('card-view');

      // Switch to compact view
      const compactToggle = screen.getByTestId('compact-view-toggle');
      await user.click(compactToggle);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toHaveClass('compact-view');
      });

      // Switch back to card view
      const cardToggle = screen.getByTestId('card-view-toggle');
      await user.click(cardToggle);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toHaveClass('card-view');
      });
    });
  });

  describe('Governance Integration', () => {
    it('should handle governance proposal workflow', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('governance-widget')).toBeInTheDocument();
      });

      // 1. View active proposals
      const governanceWidget = screen.getByTestId('governance-widget');
      const activeProposal = within(governanceWidget).getByTestId('active-proposal-1');

      expect(activeProposal).toBeInTheDocument();

      // 2. Click vote button
      const voteButton = within(activeProposal).getByTestId('vote-now-button');
      await user.click(voteButton);

      await waitFor(() => {
        expect(screen.getByTestId('voting-modal')).toBeInTheDocument();
      });

      // 3. Cast vote
      const yesVote = screen.getByTestId('vote-yes');
      await user.click(yesVote);

      const submitVote = screen.getByTestId('submit-vote');
      await user.click(submitVote);

      await waitFor(() => {
        expect(screen.queryByTestId('voting-modal')).not.toBeInTheDocument();
      });

      // 4. Check participation metrics update
      await waitFor(() => {
        const participationMetrics = within(governanceWidget).getByTestId('participation-metrics');
        expect(participationMetrics).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Should have retry button
      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toBeInTheDocument();

      // Restore fetch and retry
      mockFetch.mockRestore();
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });
    });

    it('should handle loading states properly', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      // Should show loading skeletons initially
      expect(screen.getByTestId('post-card-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-widget-skeleton')).toBeInTheDocument();

      // Should hide skeletons when content loads
      await waitFor(() => {
        expect(screen.queryByTestId('post-card-skeleton')).not.toBeInTheDocument();
        expect(screen.queryByTestId('sidebar-widget-skeleton')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle infinite scroll efficiently', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      // Scroll to bottom to trigger infinite scroll
      const postList = screen.getByTestId('post-list');
      fireEvent.scroll(postList, { target: { scrollTop: 1000 } });

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByTestId('infinite-scroll-loader')).toBeInTheDocument();
      });

      // Should load more posts
      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(10);
      });
    });

    it('should handle virtual scrolling for large lists', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
      });

      // Only visible posts should be rendered
      const visiblePosts = screen.getAllByTestId('reddit-style-post-card');
      expect(visiblePosts.length).toBeLessThanOrEqual(10);
    });
  });
});