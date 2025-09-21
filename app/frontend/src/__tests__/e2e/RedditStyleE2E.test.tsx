import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommunityView from '../../components/CommunityView';

// Mock all external services
jest.mock('../../services/communityService');
jest.mock('../../services/communityPostService');
jest.mock('../../services/governanceService');
jest.mock('../../services/pollService');

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

describe('Reddit-Style Community E2E Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });
  });

  describe('Complete User Journey - New User Experience', () => {
    it('should guide new user through complete Reddit-style community experience', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      // 1. Initial page load - loading states
      expect(screen.getByTestId('community-header-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-widget-skeleton')).toBeInTheDocument();

      // 2. Content loads - community header appears
      await waitFor(() => {
        expect(screen.getByTestId('community-header')).toBeInTheDocument();
      });

      const communityHeader = screen.getByTestId('community-header');
      expect(within(communityHeader).getByText('Test Community')).toBeInTheDocument();
      expect(within(communityHeader).getByText('1,234 members')).toBeInTheDocument();
      expect(within(communityHeader).getByTestId('join-button')).toBeInTheDocument();

      // 3. Posts load in Reddit-style layout
      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      // 4. Sidebar widgets load
      expect(screen.getByTestId('about-community-widget')).toBeInTheDocument();
      expect(screen.getByTestId('moderator-list-widget')).toBeInTheDocument();
      expect(screen.getByTestId('community-stats-widget')).toBeInTheDocument();
      expect(screen.getByTestId('governance-widget')).toBeInTheDocument();
      expect(screen.getByTestId('related-communities-widget')).toBeInTheDocument();

      // 5. User joins community
      const joinButton = within(communityHeader).getByTestId('join-button');
      await user.click(joinButton);

      await waitFor(() => {
        expect(within(communityHeader).getByText('Leave')).toBeInTheDocument();
      });

      // 6. User explores post interactions
      const firstPost = screen.getAllByTestId('reddit-style-post-card')[0];
      
      // Vote on post
      const upvoteButton = within(firstPost).getByTestId('upvote-button');
      await user.click(upvoteButton);

      await waitFor(() => {
        expect(within(firstPost).getByTestId('vote-score')).toHaveTextContent('1');
        expect(upvoteButton).toHaveClass('voted');
      });

      // Save post
      const saveButton = within(firstPost).getByTestId('save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton).toHaveAttribute('aria-pressed', 'true');
      });

      // 7. User explores sorting options
      const sortingTabs = screen.getByTestId('post-sorting-tabs');
      const hotTab = within(sortingTabs).getByText('Hot');
      await user.click(hotTab);

      await waitFor(() => {
        expect(hotTab).toHaveClass('active');
      });

      // Switch to Top with time filter
      const topTab = within(sortingTabs).getByText('Top');
      await user.click(topTab);

      await waitFor(() => {
        expect(screen.getByTestId('time-filter-dropdown')).toBeInTheDocument();
      });

      const timeDropdown = screen.getByTestId('time-filter-dropdown');
      await user.click(timeDropdown);

      const weekOption = screen.getByTestId('time-filter-week');
      await user.click(weekOption);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toBeInTheDocument();
      });

      // 8. User applies filters
      const filterPanel = screen.getByTestId('filter-panel');
      const discussionFlair = within(filterPanel).getByTestId('flair-filter-discussion');
      await user.click(discussionFlair);

      await waitFor(() => {
        expect(screen.getByTestId('active-filters')).toBeInTheDocument();
      });

      // 9. User switches view modes
      const viewModeToggle = screen.getByTestId('view-mode-toggle');
      const compactToggle = within(viewModeToggle).getByTestId('compact-view-toggle');
      await user.click(compactToggle);

      await waitFor(() => {
        expect(screen.getByTestId('post-list')).toHaveClass('compact-view');
      });

      // 10. User participates in governance
      const governanceWidget = screen.getByTestId('governance-widget');
      const activeProposal = within(governanceWidget).getByTestId('active-proposal-1');
      const voteNowButton = within(activeProposal).getByTestId('vote-now-button');
      
      await user.click(voteNowButton);

      await waitFor(() => {
        expect(screen.getByTestId('voting-modal')).toBeInTheDocument();
      });

      const yesVote = screen.getByTestId('vote-yes');
      await user.click(yesVote);

      const submitVote = screen.getByTestId('submit-vote');
      await user.click(submitVote);

      await waitFor(() => {
        expect(screen.queryByTestId('voting-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mobile User Journey', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 812,
      });
    });

    it('should provide complete mobile experience with swipe gestures', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // 1. Mobile sidebar management
      expect(screen.getByTestId('mobile-sidebar-toggle')).toBeInTheDocument();
      expect(screen.queryByTestId('left-sidebar')).not.toBeVisible();

      // Open sidebar
      const sidebarToggle = screen.getByTestId('mobile-sidebar-toggle');
      await user.click(sidebarToggle);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-sidebar-overlay')).toBeInTheDocument();
      });

      // Close sidebar by clicking overlay
      const overlay = screen.getByTestId('mobile-sidebar-overlay');
      await user.click(overlay);

      await waitFor(() => {
        expect(screen.queryByTestId('mobile-sidebar-overlay')).not.toBeInTheDocument();
      });

      // 2. Swipe gestures on posts
      await waitFor(() => {
        expect(screen.getAllByTestId('swipeable-post-card')).toHaveLength(5);
      });

      const firstPost = screen.getAllByTestId('swipeable-post-card')[0];

      // Left swipe for voting
      fireEvent.touchStart(firstPost, {
        touches: [{ clientX: 200, clientY: 100 }],
      });

      fireEvent.touchMove(firstPost, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchEnd(firstPost, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      await waitFor(() => {
        expect(screen.getByTestId('swipe-vote-actions')).toBeInTheDocument();
      });

      // Tap upvote from swipe actions
      const swipeUpvote = screen.getByTestId('swipe-upvote');
      await user.click(swipeUpvote);

      await waitFor(() => {
        expect(within(firstPost).getByTestId('vote-score')).toHaveTextContent('1');
      });

      // Right swipe for actions
      fireEvent.touchStart(firstPost, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchMove(firstPost, {
        touches: [{ clientX: 200, clientY: 100 }],
      });

      fireEvent.touchEnd(firstPost, {
        changedTouches: [{ clientX: 200, clientY: 100 }],
      });

      await waitFor(() => {
        expect(screen.getByTestId('swipe-action-buttons')).toBeInTheDocument();
      });

      // 3. Mobile-optimized modals
      const swipeSave = screen.getByTestId('swipe-save');
      await user.click(swipeSave);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-save-confirmation')).toBeInTheDocument();
      });

      // 4. Pull-to-refresh
      const postList = screen.getByTestId('post-list');
      
      fireEvent.touchStart(postList, {
        touches: [{ clientX: 200, clientY: 50 }],
      });

      fireEvent.touchMove(postList, {
        touches: [{ clientX: 200, clientY: 150 }],
      });

      fireEvent.touchEnd(postList, {
        changedTouches: [{ clientX: 200, clientY: 150 }],
      });

      await waitFor(() => {
        expect(screen.getByTestId('pull-to-refresh-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('Power User Workflow', () => {
    it('should handle advanced user interactions and shortcuts', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      // 1. Keyboard navigation
      const firstPost = screen.getAllByTestId('reddit-style-post-card')[0];
      const upvoteButton = within(firstPost).getByTestId('upvote-button');
      
      upvoteButton.focus();
      expect(document.activeElement).toBe(upvoteButton);

      // Use keyboard to vote
      fireEvent.keyDown(upvoteButton, { key: 'Enter' });

      await waitFor(() => {
        expect(within(firstPost).getByTestId('vote-score')).toHaveTextContent('1');
      });

      // Tab to next interactive element
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
      
      const downvoteButton = within(firstPost).getByTestId('downvote-button');
      expect(document.activeElement).toBe(downvoteButton);

      // 2. Bulk actions with multi-select
      const selectCheckbox = within(firstPost).getByTestId('select-post-checkbox');
      await user.click(selectCheckbox);

      const secondPost = screen.getAllByTestId('reddit-style-post-card')[1];
      const secondCheckbox = within(secondPost).getByTestId('select-post-checkbox');
      await user.click(secondCheckbox);

      await waitFor(() => {
        expect(screen.getByTestId('bulk-actions-toolbar')).toBeInTheDocument();
      });

      const bulkSaveButton = screen.getByTestId('bulk-save-button');
      await user.click(bulkSaveButton);

      await waitFor(() => {
        expect(screen.getByTestId('bulk-action-confirmation')).toBeInTheDocument();
      });

      // 3. Advanced filtering combinations
      const filterPanel = screen.getByTestId('filter-panel');
      
      // Apply multiple flair filters
      const discussionFlair = within(filterPanel).getByTestId('flair-filter-discussion');
      const guideFlair = within(filterPanel).getByTestId('flair-filter-guide');
      
      await user.click(discussionFlair);
      await user.click(guideFlair);

      // Add author filter
      const authorInput = within(filterPanel).getByTestId('author-filter-input');
      await user.type(authorInput, 'poweruser');

      // Add time range
      const timeRangeStart = within(filterPanel).getByTestId('time-range-start');
      await user.type(timeRangeStart, '2023-01-01');

      await waitFor(() => {
        expect(screen.getByTestId('active-filters')).toBeInTheDocument();
        expect(screen.getAllByTestId('active-filter-tag')).toHaveLength(4);
      });

      // 4. Save filter preset
      const saveFilterButton = within(filterPanel).getByTestId('save-filter-preset');
      await user.click(saveFilterButton);

      const presetNameInput = screen.getByTestId('preset-name-input');
      await user.type(presetNameInput, 'My Custom Filter');

      const savePresetButton = screen.getByTestId('save-preset-button');
      await user.click(savePresetButton);

      await waitFor(() => {
        expect(screen.getByTestId('filter-preset-my-custom-filter')).toBeInTheDocument();
      });

      // 5. Quick poll creation
      const createPollButton = screen.getByTestId('create-poll-button');
      await user.click(createPollButton);

      await waitFor(() => {
        expect(screen.getByTestId('poll-creation-modal')).toBeInTheDocument();
      });

      const pollQuestion = screen.getByTestId('poll-question-input');
      await user.type(pollQuestion, 'What is your favorite feature?');

      const option1Input = screen.getByTestId('poll-option-1-input');
      await user.type(option1Input, 'Reddit-style layout');

      const option2Input = screen.getByTestId('poll-option-2-input');
      await user.type(option2Input, 'Governance integration');

      const addOptionButton = screen.getByTestId('add-poll-option');
      await user.click(addOptionButton);

      const option3Input = screen.getByTestId('poll-option-3-input');
      await user.type(option3Input, 'Mobile optimizations');

      const createPollSubmit = screen.getByTestId('create-poll-submit');
      await user.click(createPollSubmit);

      await waitFor(() => {
        expect(screen.queryByTestId('poll-creation-modal')).not.toBeInTheDocument();
        expect(screen.getByTestId('poll-post-card')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle network failures and recovery gracefully', async () => {
      // Mock network failure
      const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('network-error-boundary')).toBeInTheDocument();
      });

      expect(screen.getByText('Unable to load community')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();

      // Restore network and retry
      mockFetch.mockRestore();
      
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByTestId('network-error-boundary')).not.toBeInTheDocument();
        expect(screen.getByTestId('community-layout')).toBeInTheDocument();
      });
    });

    it('should handle partial failures with graceful degradation', async () => {
      // Mock partial API failure (posts load but sidebar fails)
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/sidebar')) {
          return Promise.reject(new Error('Sidebar API error'));
        }
        return Promise.resolve(new Response(JSON.stringify({ data: [] })));
      });

      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      // Posts should load
      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      // Sidebar should show error state but not crash
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-error-fallback')).toBeInTheDocument();
      });

      expect(screen.getByText('Sidebar temporarily unavailable')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-retry-button')).toBeInTheDocument();

      mockFetch.mockRestore();
    });

    it('should handle infinite scroll edge cases', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      const postList = screen.getByTestId('post-list');

      // Rapid scrolling to bottom
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(postList, { target: { scrollTop: 1000 + i * 100 } });
      }

      // Should only trigger one loading request
      await waitFor(() => {
        expect(screen.getByTestId('infinite-scroll-loader')).toBeInTheDocument();
      });

      // Should not duplicate posts
      await waitFor(() => {
        const posts = screen.getAllByTestId('reddit-style-post-card');
        const postIds = posts.map(post => post.getAttribute('data-post-id'));
        const uniqueIds = new Set(postIds);
        expect(uniqueIds.size).toBe(postIds.length);
      });
    });

    it('should handle concurrent user actions', async () => {
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
      const upvoteButton = within(firstPost).getByTestId('upvote-button');
      const saveButton = within(firstPost).getByTestId('save-button');

      // Rapid concurrent actions
      await Promise.all([
        user.click(upvoteButton),
        user.click(saveButton),
        user.click(upvoteButton), // Double click
      ]);

      // Should handle gracefully without errors
      await waitFor(() => {
        expect(within(firstPost).getByTestId('vote-score')).toBeInTheDocument();
        expect(saveButton).toHaveAttribute('aria-pressed', 'true');
      });

      // Vote should only be counted once
      expect(within(firstPost).getByTestId('vote-score')).toHaveTextContent('1');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large numbers of posts efficiently', async () => {
      // Mock large dataset
      const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
        id: `post-${i}`,
        title: `Test Post ${i}`,
        content: `Content for post ${i}`,
        voteScore: Math.floor(Math.random() * 100),
      }));

      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      // Should use virtual scrolling
      await waitFor(() => {
        expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
      });

      // Should only render visible posts
      const visiblePosts = screen.getAllByTestId('reddit-style-post-card');
      expect(visiblePosts.length).toBeLessThanOrEqual(20);

      // Scrolling should load more posts efficiently
      const postList = screen.getByTestId('post-list');
      fireEvent.scroll(postList, { target: { scrollTop: 2000 } });

      await waitFor(() => {
        const newVisiblePosts = screen.getAllByTestId('reddit-style-post-card');
        expect(newVisiblePosts.length).toBeLessThanOrEqual(20);
      });
    });

    it('should handle rapid user interactions without lag', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      // Rapid sorting changes
      const sortingTabs = screen.getByTestId('post-sorting-tabs');
      const tabs = ['Hot', 'New', 'Top', 'Rising'];

      for (const tabName of tabs) {
        const tab = within(sortingTabs).getByText(tabName);
        await user.click(tab);
        
        // Should respond immediately
        expect(tab).toHaveClass('active');
      }

      // Rapid filter changes
      const filterPanel = screen.getByTestId('filter-panel');
      const flairFilters = within(filterPanel).getAllByTestId(/flair-filter-/);

      for (const filter of flairFilters.slice(0, 3)) {
        await user.click(filter);
      }

      // Should handle all changes without blocking UI
      await waitFor(() => {
        expect(screen.getByTestId('active-filters')).toBeInTheDocument();
      });
    });
  });
});