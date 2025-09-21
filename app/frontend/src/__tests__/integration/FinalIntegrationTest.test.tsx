import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import EnhancedSocialDashboard from '@/components/EnhancedSocialDashboard';
import { TestProviders } from '@/__tests__/setup/testSetup';
import { FeatureFlagProvider } from '@/utils/featureFlags';
import { monitoring } from '@/utils/monitoring';

// Mock all external services
jest.mock('@/services/tokenReactionService');
jest.mock('@/services/realTimeNotificationService');
jest.mock('@/services/enhancedSearchService');
jest.mock('@/services/contentPreviewService');
jest.mock('@/services/reputationService');
jest.mock('@/utils/monitoring');

describe('Final Integration Test - Enhanced Social Dashboard', () => {
  const mockUser = {
    id: 'test-user-123',
    username: 'testuser',
    walletAddress: '0x1234567890123456789012345678901234567890',
    reputation: {
      totalScore: 2500,
      level: 'Expert',
      badges: [
        { id: '1', name: 'Early Adopter', rarity: 'rare' },
        { id: '2', name: 'Community Leader', rarity: 'epic' },
      ],
    },
  };

  const mockCommunities = [
    {
      id: '1',
      name: 'DeFi Discussion',
      icon: '/icons/defi.png',
      unreadCount: 5,
      memberCount: 1250,
    },
    {
      id: '2',
      name: 'NFT Collectors',
      icon: '/icons/nft.png',
      unreadCount: 0,
      memberCount: 890,
    },
  ];

  const mockPosts = [
    {
      id: '1',
      author: mockUser,
      content: {
        type: 'text',
        body: 'Just discovered an amazing new DeFi protocol! 🚀 #DeFi #Web3',
      },
      reactions: [
        { type: '🔥', users: [{ id: 'user1', amount: 5 }], totalAmount: 5 },
        { type: '🚀', users: [{ id: 'user2', amount: 10 }], totalAmount: 10 },
      ],
      tips: [
        { userId: 'user3', amount: 25, token: 'USDC', message: 'Great find!' },
      ],
      createdAt: new Date('2024-01-15T10:00:00Z'),
      engagementScore: 85,
      trendingStatus: 'rising',
    },
  ];

  const renderDashboard = (featureFlags = {}) => {
    return render(
      <TestProviders>
        <FeatureFlagProvider
          userId={mockUser.id}
          initialFlags={{
            enableEnhancedPostComposer: true,
            enableTokenReactions: true,
            enableRealTimeNotifications: true,
            enableAdvancedSearch: true,
            enablePerformanceOptimizations: true,
            enableVisualPolish: true,
            enableMobileOptimizations: true,
            enableSecurityValidation: true,
            enableAnalytics: true,
            ...featureFlags,
          }}
        >
          <EnhancedSocialDashboard
            initialData={{
              user: mockUser,
              communities: mockCommunities,
              posts: mockPosts,
            }}
          />
        </FeatureFlagProvider>
      </TestProviders>
    );
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock monitoring service
    (monitoring.trackFeatureAdoption as jest.Mock).mockImplementation(() => {});
    (monitoring.trackUserBehavior as jest.Mock).mockImplementation(() => {});
    (monitoring.startFeatureTimer as jest.Mock).mockReturnValue(() => {});
  });

  describe('Complete Dashboard Integration', () => {
    it('should render all major components successfully', async () => {
      renderDashboard();

      // Wait for dashboard to fully load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-social-dashboard')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify main layout components
      expect(screen.getByTestId('advanced-navigation-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('enhanced-post-composer')).toBeInTheDocument();
      expect(screen.getByTestId('enhanced-feed-view')).toBeInTheDocument();
      expect(screen.getByTestId('smart-right-sidebar')).toBeInTheDocument();

      // Verify user profile is displayed
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('Expert')).toBeInTheDocument();

      // Verify communities are listed
      expect(screen.getByText('DeFi Discussion')).toBeInTheDocument();
      expect(screen.getByText('NFT Collectors')).toBeInTheDocument();

      // Verify posts are displayed
      expect(screen.getByText('Just discovered an amazing new DeFi protocol! 🚀 #DeFi #Web3')).toBeInTheDocument();
    });

    it('should handle complete content creation workflow', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-composer')).toBeInTheDocument();
      });

      // Test text post creation
      const composer = screen.getByTestId('enhanced-post-composer');
      const textArea = screen.getByPlaceholderText('What\'s on your mind?');
      
      await user.type(textArea, 'Testing the enhanced post composer! #Test #Integration');

      // Add hashtags and mentions
      expect(screen.getByText('#Test')).toBeInTheDocument();
      expect(screen.getByText('#Integration')).toBeInTheDocument();

      // Submit post
      const submitButton = screen.getByText('Post');
      await user.click(submitButton);

      // Verify post submission tracking
      expect(monitoring.trackFeatureAdoption).toHaveBeenCalledWith({
        featureName: 'enableEnhancedPostComposer',
        userId: mockUser.id,
        action: 'completed',
        metadata: expect.any(Object),
      });
    });

    it('should handle token reaction workflow end-to-end', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Find and click fire reaction
      const postCard = screen.getByTestId('enhanced-post-card');
      const fireReaction = screen.getByTestId('reaction-fire');
      
      await user.click(fireReaction);

      // Verify reaction modal opens
      await waitFor(() => {
        expect(screen.getByTestId('reaction-stake-modal')).toBeInTheDocument();
      });

      // Set stake amount
      const stakeInput = screen.getByPlaceholderText('Enter token amount');
      await user.type(stakeInput, '10');

      // Confirm reaction
      const confirmButton = screen.getByText('React with 10 tokens');
      await user.click(confirmButton);

      // Verify tracking
      expect(monitoring.trackFeatureAdoption).toHaveBeenCalledWith({
        featureName: 'enableTokenReactions',
        userId: mockUser.id,
        action: 'completed',
        metadata: expect.objectContaining({
          reactionType: '🔥',
          tokenAmount: 10,
        }),
      });
    });

    it('should handle search and discovery workflow', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-search-interface')).toBeInTheDocument();
      });

      // Perform search
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'DeFi');

      // Wait for search suggestions
      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
      });

      // Click on suggestion
      const suggestion = screen.getByText('#DeFi');
      await user.click(suggestion);

      // Verify search tracking
      expect(monitoring.trackFeatureAdoption).toHaveBeenCalledWith({
        featureName: 'enableAdvancedSearch',
        userId: mockUser.id,
        action: 'interacted',
        metadata: expect.objectContaining({
          searchQuery: 'DeFi',
        }),
      });
    });

    it('should handle real-time notifications', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('real-time-notification-system')).toBeInTheDocument();
      });

      // Simulate receiving a notification
      const notificationSystem = screen.getByTestId('real-time-notification-system');
      
      fireEvent(notificationSystem, new CustomEvent('notification', {
        detail: {
          type: 'mention',
          message: 'You were mentioned in a post by @alice',
          postId: 'post-123',
          userId: 'alice',
        },
      }));

      // Verify notification appears
      await waitFor(() => {
        expect(screen.getByText('You were mentioned in a post by @alice')).toBeInTheDocument();
      });

      // Verify tracking
      expect(monitoring.trackFeatureAdoption).toHaveBeenCalledWith({
        featureName: 'enableRealTimeNotifications',
        userId: mockUser.id,
        action: 'viewed',
        metadata: expect.objectContaining({
          notificationType: 'mention',
        }),
      });
    });

    it('should handle wallet integration features', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('wallet-dashboard')).toBeInTheDocument();
      });

      // Test portfolio modal
      const viewPortfolioButton = screen.getByText('View Portfolio');
      await user.click(viewPortfolioButton);

      await waitFor(() => {
        expect(screen.getByTestId('portfolio-modal')).toBeInTheDocument();
      });

      // Verify wallet address is displayed
      expect(screen.getByText('0x1234...7890')).toBeInTheDocument();

      // Test quick actions
      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      // Verify tracking
      expect(monitoring.trackFeatureAdoption).toHaveBeenCalledWith({
        featureName: 'enableWalletDashboard',
        userId: mockUser.id,
        action: 'interacted',
        metadata: expect.objectContaining({
          action: 'send',
        }),
      });
    });

    it('should handle reputation system features', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-user-card')).toBeInTheDocument();
      });

      // Verify reputation display
      expect(screen.getByText('2500')).toBeInTheDocument(); // Total score
      expect(screen.getByText('Expert')).toBeInTheDocument(); // Level

      // Test badge collection
      const badgeCollection = screen.getByTestId('badge-collection');
      expect(badgeCollection).toBeInTheDocument();

      // Click on a badge
      const earlyAdopterBadge = screen.getByText('Early Adopter');
      await user.click(earlyAdopterBadge);

      // Verify badge modal opens
      await waitFor(() => {
        expect(screen.getByTestId('badge-detail-modal')).toBeInTheDocument();
      });

      // Verify tracking
      expect(monitoring.trackFeatureAdoption).toHaveBeenCalledWith({
        featureName: 'enableReputationSystem',
        userId: mockUser.id,
        action: 'interacted',
        metadata: expect.objectContaining({
          badgeId: '1',
          badgeName: 'Early Adopter',
        }),
      });
    });

    it('should handle mobile responsiveness', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const user = userEvent.setup();
      renderDashboard();

      // Verify mobile components are rendered
      await waitFor(() => {
        expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      });

      // Test mobile menu
      const menuButton = screen.getByTestId('mobile-menu-toggle');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();
      });

      // Test mobile post composer
      const mobileComposer = screen.getByTestId('mobile-post-composer');
      expect(mobileComposer).toBeInTheDocument();

      // Verify tracking
      expect(monitoring.trackFeatureAdoption).toHaveBeenCalledWith({
        featureName: 'enableMobileOptimizations',
        userId: mockUser.id,
        action: 'viewed',
      });
    });

    it('should handle performance optimizations', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
      });

      // Test virtual scrolling
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } });

      // Verify performance tracking
      expect(monitoring.trackFeatureAdoption).toHaveBeenCalledWith({
        featureName: 'enablePerformanceOptimizations',
        userId: mockUser.id,
        action: 'interacted',
        metadata: expect.objectContaining({
          feature: 'virtual_scrolling',
        }),
      });

      // Test lazy loading
      const lazyImage = screen.getByTestId('lazy-loaded-image');
      expect(lazyImage).toBeInTheDocument();
    });

    it('should handle error scenarios gracefully', async () => {
      // Mock network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-composer')).toBeInTheDocument();
      });

      // Try to create a post
      const textArea = screen.getByPlaceholderText('What\'s on your mind?');
      await user.type(textArea, 'Test post');

      const submitButton = screen.getByText('Post');
      await user.click(submitButton);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText('Failed to create post. Please try again.')).toBeInTheDocument();
      });

      // Verify retry button
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();

      // Verify error tracking
      expect(monitoring.trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Network error'),
          component: 'EnhancedPostComposer',
        })
      );
    });

    it('should handle feature flag toggles', async () => {
      const user = userEvent.setup();
      
      // Start with token reactions disabled
      renderDashboard({ enableTokenReactions: false });

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify token reactions are not shown
      expect(screen.queryByTestId('reaction-fire')).not.toBeInTheDocument();

      // Re-render with token reactions enabled
      renderDashboard({ enableTokenReactions: true });

      await waitFor(() => {
        expect(screen.getByTestId('reaction-fire')).toBeInTheDocument();
      });
    });

    it('should track comprehensive analytics', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-social-dashboard')).toBeInTheDocument();
      });

      // Simulate various user interactions
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'test');

      const fireReaction = screen.getByTestId('reaction-fire');
      await user.click(fireReaction);

      const communityLink = screen.getByText('DeFi Discussion');
      await user.click(communityLink);

      // Verify comprehensive tracking
      expect(monitoring.trackFeatureAdoption).toHaveBeenCalledTimes(3);
      expect(monitoring.trackUserBehavior).toHaveBeenCalledTimes(3);

      // Verify different feature interactions are tracked
      const trackedFeatures = (monitoring.trackFeatureAdoption as jest.Mock).mock.calls.map(
        call => call[0].featureName
      );

      expect(trackedFeatures).toContain('enableAdvancedSearch');
      expect(trackedFeatures).toContain('enableTokenReactions');
      expect(trackedFeatures).toContain('enableCommunityIcons');
    });
  });

  describe('Bundle Size and Performance', () => {
    it('should load components efficiently with code splitting', async () => {
      const startTime = performance.now();
      
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-social-dashboard')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      
      // Verify reasonable load time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000); // 5 seconds max

      // Verify lazy loading is working
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should handle large datasets with virtual scrolling', async () => {
      // Create large dataset
      const largePosts = Array.from({ length: 1000 }, (_, i) => ({
        id: `post-${i}`,
        author: mockUser,
        content: { type: 'text', body: `Post content ${i}` },
        reactions: [],
        tips: [],
        createdAt: new Date(),
      }));

      render(
        <TestProviders>
          <EnhancedSocialDashboard
            initialData={{
              user: mockUser,
              communities: mockCommunities,
              posts: largePosts,
            }}
          />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
      });

      // Verify only visible posts are rendered
      const renderedPosts = screen.getAllByTestId('enhanced-post-card');
      expect(renderedPosts.length).toBeLessThan(50); // Should not render all 1000 posts
    });
  });

  describe('Accessibility Compliance', () => {
    it('should meet WCAG 2.1 AA standards', async () => {
      const { container } = renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-social-dashboard')).toBeInTheDocument();
      });

      // Test keyboard navigation
      const firstFocusableElement = container.querySelector('[tabindex="0"]');
      expect(firstFocusableElement).toBeInTheDocument();

      // Test ARIA labels
      const postComposer = screen.getByTestId('enhanced-post-composer');
      expect(postComposer).toHaveAttribute('aria-label');

      // Test screen reader announcements
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();

      // Test color contrast (would need additional testing tools in real implementation)
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });
});