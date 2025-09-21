import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ContentCreationProvider } from '@/contexts/ContentCreationContext';
import { EngagementProvider } from '@/contexts/EngagementContext';
import { ReputationProvider } from '@/contexts/ReputationContext';
import { PerformanceProvider } from '@/contexts/PerformanceContext';
import { RealTimeUpdateProvider } from '@/contexts/RealTimeUpdateContext';
import { OfflineSyncProvider } from '@/contexts/OfflineSyncContext';

// Mock all services
jest.mock('@/services/postService');
jest.mock('@/services/tokenReactionService');
jest.mock('@/services/reputationService');
jest.mock('@/services/feedService');
jest.mock('@/services/walletService');
jest.mock('@/services/enhancedSearchService');
jest.mock('@/services/realTimeNotificationService');

// Mock Web3 wallet
const mockWallet = {
  address: '0x1234567890abcdef',
  balance: 1000,
  connected: true,
};

// Mock user data
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  avatar: '/avatar.jpg',
  walletAddress: '0x1234567890abcdef',
  reputation: {
    totalScore: 750,
    level: { name: 'Contributor', level: 4 },
    badges: [
      { id: 'early-adopter', name: 'Early Adopter', icon: '🌟', rarity: 'rare' },
    ],
    progress: [
      { category: 'posting', current: 60, target: 100, progress: 0.6 },
    ],
    breakdown: { posting: 300, governance: 200, community: 150, trading: 100 },
    history: [],
  },
};

// Mock posts data
const mockPosts = [
  {
    id: 'post-1',
    author: mockUser,
    content: { type: 'text', body: 'Welcome to the enhanced social dashboard!' },
    createdAt: new Date(),
    reactions: [
      { type: '🔥', users: [], totalAmount: 5, tokenType: 'LDAO' },
    ],
    tips: [],
    comments: [],
    engagementScore: 85,
    socialProof: { followedUsersWhoEngaged: [], totalEngagementFromFollowed: 0 },
  },
  {
    id: 'post-2',
    author: { ...mockUser, id: 'user-2', username: 'creator' },
    content: { type: 'media', body: 'Check out this amazing NFT!', media: [{ url: '/nft.jpg' }] },
    createdAt: new Date(),
    reactions: [
      { type: '💎', users: [], totalAmount: 25, tokenType: 'LDAO' },
    ],
    tips: [{ amount: 10, token: 'LDAO', from: mockUser }],
    comments: [],
    engagementScore: 120,
    socialProof: { followedUsersWhoEngaged: [mockUser], totalEngagementFromFollowed: 1 },
  },
];

const renderFullDashboard = () => {
  return render(
    <BrowserRouter>
      <ContentCreationProvider>
        <EngagementProvider>
          <ReputationProvider>
            <PerformanceProvider>
              <RealTimeUpdateProvider>
                <OfflineSyncProvider>
                  <DashboardLayout user={mockUser} />
                </OfflineSyncProvider>
              </RealTimeUpdateProvider>
            </PerformanceProvider>
          </ReputationProvider>
        </EngagementProvider>
      </ContentCreationProvider>
    </BrowserRouter>
  );
};

describe('Social Dashboard Complete User Journey E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ posts: mockPosts }),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
  });

  describe('New User Onboarding Journey', () => {
    it('should guide new user through complete dashboard experience', async () => {
      const user = userEvent.setup();
      renderFullDashboard();
      
      // Step 1: Dashboard loads with welcome tour
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
      });
      
      // Should show onboarding tour for new users
      expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
      
      // Step 2: Tour highlights key features
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/enhanced post composer/i)).toBeInTheDocument();
      
      await user.click(nextButton);
      expect(screen.getByText(/token reactions/i)).toBeInTheDocument();
      
      await user.click(nextButton);
      expect(screen.getByText(/reputation system/i)).toBeInTheDocument();
      
      // Step 3: Complete tour
      const finishButton = screen.getByRole('button', { name: /finish tour/i });
      await user.click(finishButton);
      
      // Step 4: Dashboard is fully functional
      expect(screen.getByTestId('enhanced-post-composer')).toBeInTheDocument();
      expect(screen.getByTestId('feed-view')).toBeInTheDocument();
      expect(screen.getByTestId('navigation-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('smart-right-sidebar')).toBeInTheDocument();
    });
  });

  describe('Content Creation and Engagement Journey', () => {
    it('should complete full content creation to engagement cycle', async () => {
      const user = userEvent.setup();
      renderFullDashboard();
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
      });
      
      // Step 1: Create a new post
      const postComposer = screen.getByTestId('enhanced-post-composer');
      const textArea = screen.getByRole('textbox', { name: /post content/i });
      
      await user.type(textArea, 'This is my first enhanced post! #web3 #social');
      
      // Step 2: Add hashtags
      await waitFor(() => {
        expect(screen.getByTestId('hashtag-suggestions')).toBeInTheDocument();
      });
      
      const web3Hashtag = screen.getByText('#web3');
      await user.click(web3Hashtag);
      
      // Step 3: Submit post
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      // Step 4: Post appears in feed
      await waitFor(() => {
        expect(screen.getByText('This is my first enhanced post!')).toBeInTheDocument();
      });
      
      // Step 5: Interact with existing posts
      const existingPost = screen.getByTestId('post-post-1');
      const fireReaction = existingPost.querySelector('[data-testid="reaction-button-🔥"]');
      
      await user.click(fireReaction!);
      
      // Step 6: Verify reaction animation and count update
      await waitFor(() => {
        expect(screen.getByTestId('reaction-animation-🔥')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        const reactionCount = existingPost.querySelector('[data-testid="reaction-count-🔥"]');
        expect(reactionCount).toHaveTextContent('6'); // 5 + 1
      });
      
      // Step 7: Check reputation update
      const reputationScore = screen.getByTestId('user-reputation-score');
      await waitFor(() => {
        expect(reputationScore).toHaveTextContent('755'); // 750 + 5 for reaction
      });
    });

    it('should handle media post creation journey', async () => {
      const user = userEvent.setup();
      renderFullDashboard();
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-composer')).toBeInTheDocument();
      });
      
      // Step 1: Switch to media tab
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);
      
      // Step 2: Upload image
      const dropZone = screen.getByTestId('media-upload-zone');
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });
      
      // Step 3: Wait for processing
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('processed-image-preview')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Step 4: Add caption
      const captionInput = screen.getByLabelText(/caption/i);
      await user.type(captionInput, 'My awesome image! 📸');
      
      // Step 5: Submit media post
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      // Step 6: Verify media post in feed
      await waitFor(() => {
        expect(screen.getByText('My awesome image! 📸')).toBeInTheDocument();
        expect(screen.getByTestId('media-preview')).toBeInTheDocument();
      });
    });
  });

  describe('Social Interaction Journey', () => {
    it('should complete social discovery and interaction flow', async () => {
      const user = userEvent.setup();
      renderFullDashboard();
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
      });
      
      // Step 1: Use enhanced search
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'web3');
      
      // Step 2: View search results
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
      
      // Step 3: Discover new users
      const userResult = screen.getByTestId('user-result-creator');
      await user.hover(userResult);
      
      // Step 4: View mini profile card
      await waitFor(() => {
        expect(screen.getByTestId('mini-profile-card')).toBeInTheDocument();
      });
      
      // Step 5: Follow user
      const followButton = screen.getByRole('button', { name: /follow/i });
      await user.click(followButton);
      
      // Step 6: View user's posts with social proof
      await waitFor(() => {
        const socialProofIndicator = screen.getByTestId('social-proof-indicator');
        expect(socialProofIndicator).toHaveTextContent(/you follow this user/i);
      });
      
      // Step 7: Tip a post
      const tipButton = screen.getByTestId('tip-button-post-2');
      await user.click(tipButton);
      
      // Step 8: Configure tip amount
      const tipModal = screen.getByTestId('tip-modal');
      const amountInput = tipModal.querySelector('input[type="number"]');
      
      await user.clear(amountInput!);
      await user.type(amountInput!, '5');
      
      const confirmTipButton = screen.getByRole('button', { name: /send tip/i });
      await user.click(confirmTipButton);
      
      // Step 9: Verify tip success
      await waitFor(() => {
        expect(screen.getByText(/tip sent successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Reputation and Achievement Journey', () => {
    it('should track reputation progress and achievements', async () => {
      const user = userEvent.setup();
      renderFullDashboard();
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
      });
      
      // Step 1: Check initial reputation
      const reputationCard = screen.getByTestId('enhanced-user-card');
      expect(reputationCard).toHaveTextContent('750');
      
      // Step 2: View reputation breakdown
      const reputationScore = screen.getByTestId('user-reputation-score');
      await user.hover(reputationScore);
      
      await waitFor(() => {
        expect(screen.getByText('Posting: 300')).toBeInTheDocument();
        expect(screen.getByText('Governance: 200')).toBeInTheDocument();
      });
      
      // Step 3: Perform actions to gain reputation
      // Create a post
      const textArea = screen.getByRole('textbox', { name: /post content/i });
      await user.type(textArea, 'Quality content for reputation!');
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      // Step 4: React to posts
      const fireReaction = screen.getByTestId('reaction-button-🔥');
      await user.click(fireReaction);
      
      // Step 5: Check reputation progress
      await waitFor(() => {
        const progressBar = screen.getByTestId('progress-posting');
        expect(progressBar).toHaveAttribute('aria-valuenow', '65'); // Increased from 60
      });
      
      // Step 6: Achieve milestone
      // Simulate reaching 100 posting points
      fireEvent(window, new CustomEvent('reputationUpdate', {
        detail: {
          category: 'posting',
          current: 100,
          target: 100,
          milestoneReached: true,
        },
      }));
      
      // Step 7: View achievement notification
      await waitFor(() => {
        expect(screen.getByTestId('achievement-notification')).toBeInTheDocument();
        expect(screen.getByText(/content creator badge earned/i)).toBeInTheDocument();
      });
      
      // Step 8: View new badge in collection
      const badgeCollection = screen.getByTestId('badge-collection');
      await waitFor(() => {
        expect(badgeCollection).toHaveTextContent('Content Creator');
      });
    });
  });

  describe('Real-time Features Journey', () => {
    it('should handle real-time updates and notifications', async () => {
      const user = userEvent.setup();
      renderFullDashboard();
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
      });
      
      // Step 1: Receive real-time notification
      fireEvent(window, new CustomEvent('notification', {
        detail: {
          type: 'mention',
          message: 'You were mentioned in a post',
          postId: 'post-3',
          from: 'creator',
        },
      }));
      
      // Step 2: Notification appears
      await waitFor(() => {
        expect(screen.getByTestId('notification-toast')).toBeInTheDocument();
        expect(screen.getByText(/you were mentioned/i)).toBeInTheDocument();
      });
      
      // Step 3: Click notification to navigate
      const notificationToast = screen.getByTestId('notification-toast');
      await user.click(notificationToast);
      
      // Step 4: Navigate to mentioned post
      await waitFor(() => {
        expect(screen.getByTestId('post-post-3')).toBeInTheDocument();
      });
      
      // Step 5: Receive live reaction update
      fireEvent(window, new CustomEvent('liveReaction', {
        detail: {
          postId: 'post-1',
          reactionType: '🚀',
          user: { username: 'liveuser' },
          count: 3,
        },
      }));
      
      // Step 6: See live reaction animation
      await waitFor(() => {
        expect(screen.getByTestId('live-reaction-animation')).toBeInTheDocument();
      });
      
      // Step 7: Reaction count updates
      const rocketCount = screen.getByTestId('reaction-count-🚀');
      await waitFor(() => {
        expect(rocketCount).toHaveTextContent('3');
      });
    });
  });

  describe('Performance and Offline Journey', () => {
    it('should handle offline functionality and sync', async () => {
      const user = userEvent.setup();
      renderFullDashboard();
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
      });
      
      // Step 1: Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      
      fireEvent(window, new Event('offline'));
      
      // Step 2: Offline indicator appears
      await waitFor(() => {
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      });
      
      // Step 3: Try to create post while offline
      const textArea = screen.getByRole('textbox', { name: /post content/i });
      await user.type(textArea, 'Offline post');
      
      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);
      
      // Step 4: Post queued for sync
      await waitFor(() => {
        expect(screen.getByText(/queued for when online/i)).toBeInTheDocument();
      });
      
      // Step 5: Try to react while offline
      const fireReaction = screen.getByTestId('reaction-button-🔥');
      await user.click(fireReaction);
      
      // Step 6: Reaction queued
      await waitFor(() => {
        expect(screen.getByText(/reaction queued/i)).toBeInTheDocument();
      });
      
      // Step 7: Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      
      fireEvent(window, new Event('online'));
      
      // Step 8: Sync indicator appears
      await waitFor(() => {
        expect(screen.getByTestId('sync-indicator')).toBeInTheDocument();
      });
      
      // Step 9: Queued actions sync
      await waitFor(() => {
        expect(screen.getByText(/sync complete/i)).toBeInTheDocument();
      });
      
      // Step 10: Offline indicator disappears
      await waitFor(() => {
        expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();
      });
    });

    it('should handle virtual scrolling with large datasets', async () => {
      const user = userEvent.setup();
      
      // Mock large dataset
      const largePosts = Array.from({ length: 1000 }, (_, i) => ({
        id: `post-${i}`,
        author: mockUser,
        content: { type: 'text', body: `Post number ${i}` },
        createdAt: new Date(),
        reactions: [],
        tips: [],
        comments: [],
        engagementScore: Math.floor(Math.random() * 100),
        socialProof: { followedUsersWhoEngaged: [], totalEngagementFromFollowed: 0 },
      }));
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ posts: largePosts }),
      });
      
      renderFullDashboard();
      
      await waitFor(() => {
        expect(screen.getByTestId('feed-view')).toBeInTheDocument();
      });
      
      // Step 1: Initial posts loaded
      expect(screen.getByText('Post number 0')).toBeInTheDocument();
      expect(screen.queryByText('Post number 50')).not.toBeInTheDocument();
      
      // Step 2: Scroll down to load more
      const feedContainer = screen.getByTestId('virtual-scroll-container');
      fireEvent.scroll(feedContainer, { target: { scrollTop: 2000 } });
      
      // Step 3: More posts loaded
      await waitFor(() => {
        expect(screen.getByText('Post number 20')).toBeInTheDocument();
      });
      
      // Step 4: Performance metrics tracked
      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
    });
  });

  describe('Accessibility Journey', () => {
    it('should support complete keyboard navigation', async () => {
      const user = userEvent.setup();
      renderFullDashboard();
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
      });
      
      // Step 1: Tab through navigation
      await user.keyboard('{Tab}');
      expect(screen.getByTestId('skip-to-content')).toHaveFocus();
      
      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /home/i })).toHaveFocus();
      
      // Step 2: Navigate to post composer
      await user.keyboard('{Tab}');
      await user.keyboard('{Tab}');
      expect(screen.getByRole('textbox', { name: /post content/i })).toHaveFocus();
      
      // Step 3: Create post with keyboard
      await user.keyboard('Keyboard navigation test');
      await user.keyboard('{Tab}');
      
      // Find submit button and activate
      const submitButton = screen.getByRole('button', { name: /post/i });
      submitButton.focus();
      await user.keyboard('{Enter}');
      
      // Step 4: Navigate to reactions with keyboard
      await waitFor(() => {
        expect(screen.getByText('Keyboard navigation test')).toBeInTheDocument();
      });
      
      const fireReaction = screen.getByTestId('reaction-button-🔥');
      fireReaction.focus();
      await user.keyboard('{Enter}');
      
      // Step 5: Verify screen reader announcements
      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveTextContent(/fire reaction added/i);
      });
    });

    it('should provide proper ARIA labels and descriptions', () => {
      renderFullDashboard();
      
      // Check main landmarks
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Main content');
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
      expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Sidebar');
      
      // Check interactive elements
      const postComposer = screen.getByRole('textbox', { name: /post content/i });
      expect(postComposer).toHaveAttribute('aria-describedby');
      
      const reactionButtons = screen.getAllByRole('button', { name: /react with/i });
      reactionButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
      
      // Check progress indicators
      const progressBars = screen.getAllByRole('progressbar');
      progressBars.forEach(bar => {
        expect(bar).toHaveAttribute('aria-label');
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-valuemax');
      });
    });
  });

  describe('Error Handling Journey', () => {
    it('should gracefully handle and recover from errors', async () => {
      const user = userEvent.setup();
      
      // Mock API failure
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ posts: mockPosts }),
        });
      
      renderFullDashboard();
      
      // Step 1: Initial load fails
      await waitFor(() => {
        expect(screen.getByText(/failed to load feed/i)).toBeInTheDocument();
      });
      
      // Step 2: Retry button appears
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      
      // Step 3: Retry succeeds
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('feed-view')).toBeInTheDocument();
        expect(screen.getByText('Welcome to the enhanced social dashboard!')).toBeInTheDocument();
      });
      
      // Step 4: Test error boundary
      const errorTrigger = screen.getByTestId('error-trigger-button');
      await user.click(errorTrigger);
      
      // Step 5: Error boundary catches error
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
      });
    });
  });
});