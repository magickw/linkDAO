import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommunityView from '../../components/CommunityView';

// Mock all services
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

describe('Final Reddit-Style Integration Test', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  it('should demonstrate complete Reddit-style community functionality', async () => {
    const Wrapper = createTestWrapper();
    
    render(
      <Wrapper>
        <CommunityView communityId="test-community" />
      </Wrapper>
    );

    // ========================================
    // 1. INITIAL LOAD AND LAYOUT VERIFICATION
    // ========================================
    
    console.log('🔍 Testing initial load and layout...');
    
    // Verify loading states appear first
    expect(screen.getByTestId('community-header-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('post-card-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-widget-skeleton')).toBeInTheDocument();

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByTestId('community-layout')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Verify three-column layout
    expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();

    console.log('✅ Layout verification complete');

    // ========================================
    // 2. COMMUNITY HEADER FUNCTIONALITY
    // ========================================
    
    console.log('🔍 Testing community header...');
    
    const communityHeader = screen.getByTestId('community-header');
    expect(within(communityHeader).getByText('Test Community')).toBeInTheDocument();
    expect(within(communityHeader).getByText('1,234 members')).toBeInTheDocument();
    
    // Test join functionality
    const joinButton = within(communityHeader).getByTestId('join-button');
    await user.click(joinButton);
    
    await waitFor(() => {
      expect(within(communityHeader).getByText('Leave')).toBeInTheDocument();
    });

    console.log('✅ Community header functionality verified');

    // ========================================
    // 3. REDDIT-STYLE POST CARDS
    // ========================================
    
    console.log('🔍 Testing Reddit-style post cards...');
    
    await waitFor(() => {
      expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
    });

    const firstPost = screen.getAllByTestId('reddit-style-post-card')[0];
    
    // Verify post card structure
    expect(within(firstPost).getByTestId('vote-arrows')).toBeInTheDocument();
    expect(within(firstPost).getByTestId('post-thumbnail')).toBeInTheDocument();
    expect(within(firstPost).getByTestId('post-content')).toBeInTheDocument();
    expect(within(firstPost).getByTestId('post-metadata')).toBeInTheDocument();
    expect(within(firstPost).getByTestId('quick-actions')).toBeInTheDocument();

    // Test voting functionality
    const upvoteButton = within(firstPost).getByTestId('upvote-button');
    await user.click(upvoteButton);
    
    await waitFor(() => {
      expect(within(firstPost).getByTestId('vote-score')).toHaveTextContent('1');
      expect(upvoteButton).toHaveClass('voted');
    });

    // Test downvoting
    const downvoteButton = within(firstPost).getByTestId('downvote-button');
    await user.click(downvoteButton);
    
    await waitFor(() => {
      expect(within(firstPost).getByTestId('vote-score')).toHaveTextContent('-1');
      expect(downvoteButton).toHaveClass('voted');
      expect(upvoteButton).not.toHaveClass('voted');
    });

    console.log('✅ Post card voting verified');

    // ========================================
    // 4. QUICK ACTIONS FUNCTIONALITY
    // ========================================
    
    console.log('🔍 Testing quick actions...');
    
    // Test save functionality
    const saveButton = within(firstPost).getByTestId('save-button');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(saveButton).toHaveAttribute('aria-pressed', 'true');
    });

    // Test share functionality
    const shareButton = within(firstPost).getByTestId('share-button');
    await user.click(shareButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    });
    
    await user.click(screen.getByTestId('close-share-modal'));

    // Test report functionality
    const reportButton = within(firstPost).getByTestId('report-button');
    await user.click(reportButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('report-modal')).toBeInTheDocument();
    });
    
    const spamOption = screen.getByTestId('report-spam');
    await user.click(spamOption);
    await user.click(screen.getByTestId('submit-report'));
    
    await waitFor(() => {
      expect(screen.queryByTestId('report-modal')).not.toBeInTheDocument();
    });

    console.log('✅ Quick actions functionality verified');

    // ========================================
    // 5. COMMENT PREVIEW SYSTEM
    // ========================================
    
    console.log('🔍 Testing comment preview system...');
    
    const commentPreview = within(firstPost).getByTestId('comment-preview');
    expect(commentPreview).toBeInTheDocument();
    
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

    console.log('✅ Comment preview system verified');

    // ========================================
    // 6. POST SORTING AND FILTERING
    // ========================================
    
    console.log('🔍 Testing sorting and filtering...');
    
    // Test sorting tabs
    const sortingTabs = screen.getByTestId('post-sorting-tabs');
    const hotTab = within(sortingTabs).getByText('Hot');
    const newTab = within(sortingTabs).getByText('New');
    const topTab = within(sortingTabs).getByText('Top');
    
    await user.click(hotTab);
    expect(hotTab).toHaveClass('active');
    
    await user.click(newTab);
    expect(newTab).toHaveClass('active');
    expect(hotTab).not.toHaveClass('active');
    
    // Test Top sorting with time filter
    await user.click(topTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('time-filter-dropdown')).toBeInTheDocument();
    });
    
    const timeDropdown = screen.getByTestId('time-filter-dropdown');
    await user.click(timeDropdown);
    
    const weekOption = screen.getByTestId('time-filter-week');
    await user.click(weekOption);

    // Test filtering
    const filterPanel = screen.getByTestId('filter-panel');
    const discussionFlair = within(filterPanel).getByTestId('flair-filter-discussion');
    await user.click(discussionFlair);
    
    await waitFor(() => {
      expect(screen.getByTestId('active-filters')).toBeInTheDocument();
    });
    
    // Clear filters
    const clearFiltersButton = screen.getByTestId('clear-all-filters');
    await user.click(clearFiltersButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('active-filters')).not.toBeInTheDocument();
    });

    console.log('✅ Sorting and filtering verified');

    // ========================================
    // 7. VIEW MODE TOGGLE
    // ========================================
    
    console.log('🔍 Testing view mode toggle...');
    
    const viewModeToggle = screen.getByTestId('view-mode-toggle');
    const compactToggle = within(viewModeToggle).getByTestId('compact-view-toggle');
    const cardToggle = within(viewModeToggle).getByTestId('card-view-toggle');
    
    // Switch to compact view
    await user.click(compactToggle);
    
    await waitFor(() => {
      expect(screen.getByTestId('post-list')).toHaveClass('compact-view');
    });
    
    // Switch back to card view
    await user.click(cardToggle);
    
    await waitFor(() => {
      expect(screen.getByTestId('post-list')).toHaveClass('card-view');
    });

    console.log('✅ View mode toggle verified');

    // ========================================
    // 8. SIDEBAR WIDGETS
    // ========================================
    
    console.log('🔍 Testing sidebar widgets...');
    
    // About Community Widget
    const aboutWidget = screen.getByTestId('about-community-widget');
    expect(within(aboutWidget).getByText('Test Community')).toBeInTheDocument();
    expect(within(aboutWidget).getByText('1,234 members')).toBeInTheDocument();
    
    // Community Stats Widget
    const statsWidget = screen.getByTestId('community-stats-widget');
    expect(within(statsWidget).getByText('56 online')).toBeInTheDocument();
    
    // Moderator List Widget
    const moderatorWidget = screen.getByTestId('moderator-list-widget');
    expect(within(moderatorWidget).getByText('mod1')).toBeInTheDocument();
    expect(within(moderatorWidget).getByText('mod2')).toBeInTheDocument();
    
    // Related Communities Widget
    const relatedWidget = screen.getByTestId('related-communities-widget');
    expect(relatedWidget).toBeInTheDocument();

    console.log('✅ Sidebar widgets verified');

    // ========================================
    // 9. GOVERNANCE INTEGRATION
    // ========================================
    
    console.log('🔍 Testing governance integration...');
    
    const governanceWidget = screen.getByTestId('governance-widget');
    const activeProposal = within(governanceWidget).getByTestId('active-proposal-1');
    
    expect(activeProposal).toBeInTheDocument();
    expect(within(activeProposal).getByText('Test Governance Proposal')).toBeInTheDocument();
    
    // Test voting on proposal
    const voteButton = within(activeProposal).getByTestId('vote-now-button');
    await user.click(voteButton);
    
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
    
    // Verify participation metrics update
    const participationMetrics = within(governanceWidget).getByTestId('participation-metrics');
    expect(participationMetrics).toBeInTheDocument();

    console.log('✅ Governance integration verified');

    // ========================================
    // 10. MOBILE RESPONSIVENESS
    // ========================================
    
    console.log('🔍 Testing mobile responsiveness...');
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    // Trigger resize event
    fireEvent(window, new Event('resize'));
    
    await waitFor(() => {
      expect(screen.getByTestId('mobile-sidebar-toggle')).toBeInTheDocument();
    });
    
    // Test mobile sidebar
    const sidebarToggle = screen.getByTestId('mobile-sidebar-toggle');
    await user.click(sidebarToggle);
    
    await waitFor(() => {
      expect(screen.getByTestId('mobile-sidebar-overlay')).toBeInTheDocument();
    });
    
    // Close sidebar
    const overlay = screen.getByTestId('mobile-sidebar-overlay');
    await user.click(overlay);
    
    await waitFor(() => {
      expect(screen.queryByTestId('mobile-sidebar-overlay')).not.toBeInTheDocument();
    });

    console.log('✅ Mobile responsiveness verified');

    // ========================================
    // 11. PERFORMANCE FEATURES
    // ========================================
    
    console.log('🔍 Testing performance features...');
    
    // Test infinite scroll
    const postList = screen.getByTestId('post-list');
    fireEvent.scroll(postList, { target: { scrollTop: 1000 } });
    
    await waitFor(() => {
      expect(screen.getByTestId('infinite-scroll-loader')).toBeInTheDocument();
    });
    
    // Test virtual scrolling
    expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
    
    // Test lazy loading
    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    console.log('✅ Performance features verified');

    // ========================================
    // 12. ACCESSIBILITY FEATURES
    // ========================================
    
    console.log('🔍 Testing accessibility features...');
    
    // Test ARIA labels
    expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Community posts');
    expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Community information');
    
    // Test keyboard navigation
    const firstUpvoteButton = screen.getAllByTestId('upvote-button')[0];
    firstUpvoteButton.focus();
    expect(document.activeElement).toBe(firstUpvoteButton);
    
    // Test screen reader support
    const voteScore = screen.getAllByTestId('vote-score')[0];
    expect(voteScore).toHaveAttribute('aria-live', 'polite');
    
    // Test skip links
    expect(screen.getByTestId('skip-to-content')).toBeInTheDocument();

    console.log('✅ Accessibility features verified');

    // ========================================
    // 13. ERROR HANDLING
    // ========================================
    
    console.log('🔍 Testing error handling...');
    
    // Mock network error
    const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    
    // Trigger an action that would cause a network request
    const refreshButton = screen.getByTestId('refresh-posts');
    await user.click(refreshButton);
    
    // Should show error state
    await waitFor(() => {
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
    
    // Should have retry functionality
    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toBeInTheDocument();
    
    // Restore fetch and retry
    mockFetch.mockRestore();
    await user.click(retryButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });

    console.log('✅ Error handling verified');

    // ========================================
    // 14. FINAL VERIFICATION
    // ========================================
    
    console.log('🔍 Final verification...');
    
    // Verify all major components are still present and functional
    expect(screen.getByTestId('community-header')).toBeInTheDocument();
    expect(screen.getByTestId('post-sorting-tabs')).toBeInTheDocument();
    expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
    expect(screen.getByTestId('about-community-widget')).toBeInTheDocument();
    expect(screen.getByTestId('governance-widget')).toBeInTheDocument();
    
    // Verify state persistence
    expect(within(communityHeader).getByText('Leave')).toBeInTheDocument(); // Still joined
    expect(within(firstPost).getByTestId('vote-score')).toHaveTextContent('-1'); // Vote persisted
    expect(saveButton).toHaveAttribute('aria-pressed', 'true'); // Save state persisted

    console.log('✅ Final verification complete');

    // ========================================
    // TEST SUMMARY
    // ========================================
    
    console.log('\n🎯 REDDIT-STYLE COMMUNITY INTEGRATION TEST SUMMARY');
    console.log('====================================================');
    console.log('✅ Layout and responsive design');
    console.log('✅ Community header functionality');
    console.log('✅ Reddit-style post cards');
    console.log('✅ Voting system');
    console.log('✅ Quick actions (save, share, report)');
    console.log('✅ Comment preview system');
    console.log('✅ Post sorting and filtering');
    console.log('✅ View mode toggle');
    console.log('✅ Sidebar widgets');
    console.log('✅ Governance integration');
    console.log('✅ Mobile responsiveness');
    console.log('✅ Performance optimizations');
    console.log('✅ Accessibility compliance');
    console.log('✅ Error handling and recovery');
    console.log('✅ State persistence');
    console.log('\n🎉 ALL REDDIT-STYLE FEATURES WORKING CORRECTLY!');
  });

  it('should handle stress testing with rapid interactions', async () => {
    const Wrapper = createTestWrapper();
    
    render(
      <Wrapper>
        <CommunityView communityId="test-community" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
    });

    console.log('🔥 Starting stress test with rapid interactions...');

    // Rapid voting on multiple posts
    const posts = screen.getAllByTestId('reddit-style-post-card');
    const upvoteButtons = screen.getAllByTestId('upvote-button');
    
    // Rapid fire voting
    for (let i = 0; i < upvoteButtons.length; i++) {
      await user.click(upvoteButtons[i]);
    }

    // Rapid sorting changes
    const sortingTabs = screen.getByTestId('post-sorting-tabs');
    const tabs = ['Hot', 'New', 'Top', 'Rising'];
    
    for (const tabName of tabs) {
      const tab = within(sortingTabs).getByText(tabName);
      await user.click(tab);
    }

    // Rapid filter changes
    const filterPanel = screen.getByTestId('filter-panel');
    const flairFilters = within(filterPanel).getAllByTestId(/flair-filter-/);
    
    for (const filter of flairFilters) {
      await user.click(filter);
    }

    // Verify system stability
    await waitFor(() => {
      expect(screen.getByTestId('community-layout')).toBeInTheDocument();
      expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
    });

    console.log('✅ Stress test completed - system remains stable');
  });
});