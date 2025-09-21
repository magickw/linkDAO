import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import EnhancedSocialDashboard from '@/components/EnhancedSocialDashboard';
import { TestProviders } from '@/__tests__/setup/testSetup';

// Mock external services
jest.mock('@/services/tokenReactionService');
jest.mock('@/services/realTimeNotificationService');
jest.mock('@/services/enhancedSearchService');

describe('Comprehensive User Workflows', () => {
  const mockUser = {
    id: '1',
    username: 'testuser',
    walletAddress: '0x123...',
    reputation: { totalScore: 1500, level: 'Expert' },
    badges: [{ id: '1', name: 'Early Adopter', rarity: 'rare' }]
  };

  const mockCommunities = [
    { id: '1', name: 'DeFi Discussion', icon: '/icons/defi.png', unreadCount: 3 },
    { id: '2', name: 'NFT Collectors', icon: '/icons/nft.png', unreadCount: 0 }
  ];

  const mockPosts = [
    {
      id: '1',
      author: mockUser,
      content: { type: 'text', body: 'Test post content' },
      reactions: [],
      tips: [],
      createdAt: new Date()
    }
  ];

  const renderDashboard = (featureFlags = {}) => {
    return render(
      <TestProviders>
        <EnhancedSocialDashboard
          initialData={{
            user: mockUser,
            communities: mockCommunities,
            posts: mockPosts
          }}
          featureFlags={{
            enableTokenReactions: true,
            enableRealTimeNotifications: true,
            enableAdvancedSearch: true,
            enablePerformanceOptimizations: true,
            ...featureFlags
          }}
        />
      </TestProviders>
    );
  };

  describe('Complete Content Creation Workflow', () => {
    it('should allow user to create a post with media and token reactions', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-composer')).toBeInTheDocument();
      });

      // Open post composer
      const composer = screen.getByTestId('enhanced-post-composer');
      
      // Select media content type
      const mediaTab = within(composer).getByText('Media');
      await user.click(mediaTab);

      // Add content
      const textArea = within(composer).getByPlaceholderText('What\'s on your mind?');
      await user.type(textArea, 'Check out this amazing NFT! #NFT #Web3');

      // Upload media (mock file upload)
      const fileInput = within(composer).getByTestId('media-upload-input');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);

      // Wait for media preview
      await waitFor(() => {
        expect(within(composer).getByTestId('media-preview')).toBeInTheDocument();
      });

      // Submit post
      const submitButton = within(composer).getByText('Post');
      await user.click(submitButton);

      // Verify post appears in feed
      await waitFor(() => {
        expect(screen.getByText('Check out this amazing NFT! #NFT #Web3')).toBeInTheDocument();
      });
    });

    it('should handle poll creation workflow', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-composer')).toBeInTheDocument();
      });

      const composer = screen.getByTestId('enhanced-post-composer');
      
      // Select poll content type
      const pollTab = within(composer).getByText('Poll');
      await user.click(pollTab);

      // Add poll question
      const questionInput = within(composer).getByPlaceholderText('Ask a question...');
      await user.type(questionInput, 'Which DeFi protocol do you prefer?');

      // Add poll options
      const option1Input = within(composer).getByPlaceholderText('Option 1');
      await user.type(option1Input, 'Uniswap');

      const option2Input = within(composer).getByPlaceholderText('Option 2');
      await user.type(option2Input, 'Compound');

      // Add third option
      const addOptionButton = within(composer).getByText('Add Option');
      await user.click(addOptionButton);

      const option3Input = within(composer).getByPlaceholderText('Option 3');
      await user.type(option3Input, 'Aave');

      // Enable token-weighted voting
      const tokenWeightedCheckbox = within(composer).getByLabelText('Token-weighted voting');
      await user.click(tokenWeightedCheckbox);

      // Submit poll
      const submitButton = within(composer).getByText('Create Poll');
      await user.click(submitButton);

      // Verify poll appears in feed
      await waitFor(() => {
        expect(screen.getByText('Which DeFi protocol do you prefer?')).toBeInTheDocument();
        expect(screen.getByText('Uniswap')).toBeInTheDocument();
        expect(screen.getByText('Compound')).toBeInTheDocument();
        expect(screen.getByText('Aave')).toBeInTheDocument();
      });
    });
  });

  describe('Token Reaction and Engagement Workflow', () => {
    it('should allow users to react with tokens and view reaction details', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Wait for feed to load
      await waitFor(() => {
        expect(screen.getByText('Test post content')).toBeInTheDocument();
      });

      // Find the post and reaction buttons
      const post = screen.getByTestId('enhanced-post-card');
      const fireReaction = within(post).getByTestId('reaction-fire');

      // Click fire reaction
      await user.click(fireReaction);

      // Verify reaction stake modal opens
      await waitFor(() => {
        expect(screen.getByTestId('reaction-stake-modal')).toBeInTheDocument();
      });

      // Set stake amount
      const stakeInput = screen.getByPlaceholderText('Enter token amount');
      await user.type(stakeInput, '5');

      // Confirm reaction
      const confirmButton = screen.getByText('React with 5 tokens');
      await user.click(confirmButton);

      // Verify reaction appears on post
      await waitFor(() => {
        expect(within(post).getByText('🔥 5')).toBeInTheDocument();
      });

      // Click on reaction count to view details
      const reactionCount = within(post).getByText('🔥 5');
      await user.click(reactionCount);

      // Verify reactor modal opens
      await waitFor(() => {
        expect(screen.getByTestId('reactor-modal')).toBeInTheDocument();
        expect(screen.getByText('testuser')).toBeInTheDocument();
        expect(screen.getByText('5 tokens')).toBeInTheDocument();
      });
    });

    it('should handle tipping workflow', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Test post content')).toBeInTheDocument();
      });

      const post = screen.getByTestId('enhanced-post-card');
      const tipButton = within(post).getByTestId('tip-button');

      await user.click(tipButton);

      // Verify tip modal opens
      await waitFor(() => {
        expect(screen.getByTestId('tip-modal')).toBeInTheDocument();
      });

      // Select tip amount
      const tipAmount = screen.getByText('10 USDC');
      await user.click(tipAmount);

      // Add tip message
      const messageInput = screen.getByPlaceholderText('Add a message (optional)');
      await user.type(messageInput, 'Great post!');

      // Send tip
      const sendTipButton = screen.getByText('Send Tip');
      await user.click(sendTipButton);

      // Verify tip appears on post
      await waitFor(() => {
        expect(within(post).getByText('💰 10 USDC')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Discovery Workflow', () => {
    it('should allow users to search and discover content', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Wait for search interface to load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-search-interface')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      
      // Type search query
      await user.type(searchInput, 'DeFi');

      // Wait for search suggestions
      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
      });

      // Click on a suggestion
      const suggestion = screen.getByText('#DeFi');
      await user.click(suggestion);

      // Verify search results appear
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });

      // Filter by content type
      const postsFilter = screen.getByText('Posts');
      await user.click(postsFilter);

      // Verify filtered results
      await waitFor(() => {
        expect(screen.getByTestId('post-results')).toBeInTheDocument();
      });
    });

    it('should show trending content and recommendations', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Check right sidebar for trending content
      await waitFor(() => {
        expect(screen.getByTestId('trending-content-widget')).toBeInTheDocument();
      });

      const trendingWidget = screen.getByTestId('trending-content-widget');
      
      // Verify trending hashtags
      expect(within(trendingWidget).getByText('Trending')).toBeInTheDocument();
      
      // Click on trending hashtag
      const trendingHashtag = within(trendingWidget).getByText('#DeFi');
      await user.click(trendingHashtag);

      // Verify navigation to hashtag feed
      await waitFor(() => {
        expect(screen.getByText('Posts tagged with #DeFi')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Features Workflow', () => {
    it('should handle real-time notifications', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Wait for notification system to initialize
      await waitFor(() => {
        expect(screen.getByTestId('notification-system')).toBeInTheDocument();
      });

      // Simulate receiving a mention notification
      const notificationSystem = screen.getByTestId('notification-system');
      
      // Mock notification event
      fireEvent(notificationSystem, new CustomEvent('notification', {
        detail: {
          type: 'mention',
          message: 'You were mentioned in a post',
          postId: '123',
          userId: 'user456'
        }
      }));

      // Verify notification appears
      await waitFor(() => {
        expect(screen.getByText('You were mentioned in a post')).toBeInTheDocument();
      });

      // Click notification to navigate
      const notification = screen.getByText('You were mentioned in a post');
      await user.click(notification);

      // Verify navigation occurs
      await waitFor(() => {
        expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
      });
    });

    it('should show live comment updates', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Navigate to a post with comments
      const post = screen.getByTestId('enhanced-post-card');
      const commentsButton = within(post).getByText('Comments');
      await user.click(commentsButton);

      // Wait for comments section
      await waitFor(() => {
        expect(screen.getByTestId('comments-section')).toBeInTheDocument();
      });

      // Simulate live comment update
      const commentsSection = screen.getByTestId('comments-section');
      fireEvent(commentsSection, new CustomEvent('liveCommentUpdate', {
        detail: {
          comment: {
            id: 'new-comment',
            author: { username: 'newuser' },
            content: 'This is a live comment!',
            createdAt: new Date()
          }
        }
      }));

      // Verify new comment appears
      await waitFor(() => {
        expect(screen.getByText('This is a live comment!')).toBeInTheDocument();
        expect(screen.getByText('newuser')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness Workflow', () => {
    it('should adapt to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const user = userEvent.setup();
      renderDashboard();

      // Verify mobile navigation appears
      await waitFor(() => {
        expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      });

      // Test mobile menu toggle
      const menuButton = screen.getByTestId('mobile-menu-toggle');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();
      });

      // Test mobile post composer
      const mobileComposer = screen.getByTestId('mobile-post-composer');
      expect(mobileComposer).toBeInTheDocument();

      // Test swipe gestures on posts
      const postCard = screen.getByTestId('mobile-post-card');
      fireEvent.touchStart(postCard, { touches: [{ clientX: 0, clientY: 0 }] });
      fireEvent.touchMove(postCard, { touches: [{ clientX: 100, clientY: 0 }] });
      fireEvent.touchEnd(postCard);

      // Verify swipe action menu appears
      await waitFor(() => {
        expect(screen.getByTestId('swipe-action-menu')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery Workflow', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      
      renderDashboard();

      // Try to create a post
      const composer = screen.getByTestId('enhanced-post-composer');
      const textArea = within(composer).getByPlaceholderText('What\'s on your mind?');
      await user.type(textArea, 'Test post');

      const submitButton = within(composer).getByText('Post');
      await user.click(submitButton);

      // Verify error message appears
      await waitFor(() => {
        expect(screen.getByText('Failed to create post. Please try again.')).toBeInTheDocument();
      });

      // Verify retry button appears
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();

      // Test retry functionality
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await user.click(retryButton);

      // Verify success
      await waitFor(() => {
        expect(screen.getByText('Post created successfully!')).toBeInTheDocument();
      });
    });

    it('should handle offline mode', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      window.dispatchEvent(new Event('offline'));

      // Verify offline indicator appears
      await waitFor(() => {
        expect(screen.getByText('You\'re offline')).toBeInTheDocument();
      });

      // Try to create a post while offline
      const composer = screen.getByTestId('enhanced-post-composer');
      const textArea = within(composer).getByPlaceholderText('What\'s on your mind?');
      await user.type(textArea, 'Offline post');

      const submitButton = within(composer).getByText('Post');
      await user.click(submitButton);

      // Verify post is queued
      await waitFor(() => {
        expect(screen.getByText('Post queued for when you\'re back online')).toBeInTheDocument();
      });

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      window.dispatchEvent(new Event('online'));

      // Verify offline indicator disappears and queued post is sent
      await waitFor(() => {
        expect(screen.queryByText('You\'re offline')).not.toBeInTheDocument();
        expect(screen.getByText('Queued posts sent successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Accessibility Workflow', () => {
    it('should maintain performance with large datasets', async () => {
      const largeMockPosts = Array.from({ length: 1000 }, (_, i) => ({
        id: `post-${i}`,
        author: mockUser,
        content: { type: 'text', body: `Post content ${i}` },
        reactions: [],
        tips: [],
        createdAt: new Date()
      }));

      renderDashboard();

      // Verify virtual scrolling is working
      await waitFor(() => {
        expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
      });

      // Verify only visible posts are rendered
      const renderedPosts = screen.getAllByTestId('enhanced-post-card');
      expect(renderedPosts.length).toBeLessThan(50); // Should not render all 1000 posts

      // Test scrolling performance
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 5000 } });

      // Verify new posts are loaded
      await waitFor(() => {
        expect(screen.getByText('Post content 50')).toBeInTheDocument();
      });
    });

    it('should be accessible with screen readers', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Test keyboard navigation
      await user.tab(); // Should focus on first interactive element
      
      // Verify focus management
      const focusedElement = document.activeElement;
      expect(focusedElement).toHaveAttribute('role');

      // Test ARIA labels
      const postComposer = screen.getByTestId('enhanced-post-composer');
      expect(postComposer).toHaveAttribute('aria-label', 'Create new post');

      // Test screen reader announcements
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
    });
  });
});