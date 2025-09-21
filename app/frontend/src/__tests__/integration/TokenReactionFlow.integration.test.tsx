import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenReactionSystem } from '@/components/TokenReactionSystem/TokenReactionSystem';
import { EnhancedPostCard } from '@/components/EnhancedPostCard/EnhancedPostCard';
import { EngagementProvider } from '@/contexts/EngagementContext';
import { ReputationProvider } from '@/contexts/ReputationContext';
import * as tokenReactionService from '@/services/tokenReactionService';
import * as reputationService from '@/services/reputationService';

// Mock services
jest.mock('@/services/tokenReactionService');
jest.mock('@/services/reputationService');
jest.mock('@/services/walletService');

const mockTokenReactionService = tokenReactionService as jest.Mocked<typeof tokenReactionService>;
const mockReputationService = reputationService as jest.Mocked<typeof reputationService>;

const mockPost = {
  id: 'post-1',
  author: {
    id: 'author-1',
    username: 'testauthor',
    displayName: 'Test Author',
    avatar: '/avatar.jpg',
    walletAddress: '0xauthor',
    reputation: {
      totalScore: 500,
      level: { name: 'Contributor', level: 3 },
      badges: [],
      progress: [],
      breakdown: {},
      history: [],
    },
  },
  content: {
    type: 'text',
    body: 'This is a test post for token reactions',
    formatting: {},
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  reactions: [],
  tips: [],
  comments: [],
  shares: [],
  views: 100,
  engagementScore: 50,
  previews: [],
  hashtags: ['test'],
  mentions: [],
  media: [],
  socialProof: {
    followedUsersWhoEngaged: [],
    totalEngagementFromFollowed: 0,
    communityLeadersWhoEngaged: [],
    verifiedUsersWhoEngaged: [],
  },
  moderationStatus: 'approved',
};

const renderIntegrationTest = () => {
  return render(
    <EngagementProvider>
      <ReputationProvider>
        <EnhancedPostCard
          post={mockPost}
          context="feed"
          onReaction={jest.fn()}
          onTip={jest.fn()}
          onShare={jest.fn()}
          showSocialProof={true}
        />
      </ReputationProvider>
    </EngagementProvider>
  );
};

describe('Token Reaction Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock wallet connection
    mockTokenReactionService.checkWalletConnection.mockResolvedValue({
      connected: true,
      address: '0xuser123',
      balance: 100,
    });
    
    // Mock token reaction service
    mockTokenReactionService.addReaction.mockResolvedValue({
      success: true,
      transactionHash: '0xtxhash',
      newReactionCount: 1,
    });
    
    // Mock reputation service
    mockReputationService.updateReputationForReaction.mockResolvedValue({
      pointsEarned: 5,
      newTotalScore: 505,
    });
  });

  describe('Complete Reaction Flow', () => {
    it('should complete full reaction flow from click to reputation update', async () => {
      const user = userEvent.setup();
      renderIntegrationTest();
      
      // Step 1: Click reaction button
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      // Step 2: Verify wallet connection check
      await waitFor(() => {
        expect(mockTokenReactionService.checkWalletConnection).toHaveBeenCalled();
      });
      
      // Step 3: Verify reaction is added
      await waitFor(() => {
        expect(mockTokenReactionService.addReaction).toHaveBeenCalledWith({
          postId: 'post-1',
          reactionType: '🔥',
          amount: 1,
          userAddress: '0xuser123',
        });
      });
      
      // Step 4: Verify reputation update
      await waitFor(() => {
        expect(mockReputationService.updateReputationForReaction).toHaveBeenCalledWith({
          userId: '0xuser123',
          action: 'reaction_given',
          reactionType: '🔥',
          amount: 1,
        });
      });
      
      // Step 5: Verify UI updates
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // reaction count
        expect(screen.getByTestId('reaction-success-animation')).toBeInTheDocument();
      });
    });

    it('should handle expensive reaction with stake modal', async () => {
      const user = userEvent.setup();
      renderIntegrationTest();
      
      // Click diamond reaction (expensive)
      const diamondButton = screen.getByTestId('reaction-button-💎');
      await user.click(diamondButton);
      
      // Stake modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('reaction-stake-modal')).toBeInTheDocument();
      });
      
      // Set custom amount
      const amountInput = screen.getByLabelText(/stake amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '10');
      
      // Confirm stake
      const confirmButton = screen.getByRole('button', { name: /confirm stake/i });
      await user.click(confirmButton);
      
      // Verify reaction with custom amount
      await waitFor(() => {
        expect(mockTokenReactionService.addReaction).toHaveBeenCalledWith({
          postId: 'post-1',
          reactionType: '💎',
          amount: 10,
          userAddress: '0xuser123',
        });
      });
    });

    it('should handle reaction with insufficient balance', async () => {
      const user = userEvent.setup();
      
      // Mock insufficient balance
      mockTokenReactionService.checkWalletConnection.mockResolvedValue({
        connected: true,
        address: '0xuser123',
        balance: 1, // Insufficient for diamond reaction
      });
      
      renderIntegrationTest();
      
      const diamondButton = screen.getByTestId('reaction-button-💎');
      await user.click(diamondButton);
      
      await waitFor(() => {
        expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
      });
      
      expect(mockTokenReactionService.addReaction).not.toHaveBeenCalled();
    });

    it('should handle reaction failure and retry', async () => {
      const user = userEvent.setup();
      
      // Mock initial failure then success
      mockTokenReactionService.addReaction
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          transactionHash: '0xtxhash',
          newReactionCount: 1,
        });
      
      renderIntegrationTest();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      // Error should be shown
      await waitFor(() => {
        expect(screen.getByText(/failed to add reaction/i)).toBeInTheDocument();
      });
      
      // Retry button should appear
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);
      
      // Should succeed on retry
      await waitFor(() => {
        expect(mockTokenReactionService.addReaction).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId('reaction-success-animation')).toBeInTheDocument();
      });
    });
  });

  describe('Social Proof Integration', () => {
    it('should update social proof when followed users react', async () => {
      const user = userEvent.setup();
      
      // Mock followed users
      const postWithSocialProof = {
        ...mockPost,
        socialProof: {
          followedUsersWhoEngaged: [
            { id: 'friend-1', username: 'friend1', displayName: 'Friend One' },
          ],
          totalEngagementFromFollowed: 1,
          communityLeadersWhoEngaged: [],
          verifiedUsersWhoEngaged: [],
        },
      };
      
      render(
        <EngagementProvider>
          <ReputationProvider>
            <EnhancedPostCard
              post={postWithSocialProof}
              context="feed"
              onReaction={jest.fn()}
              onTip={jest.fn()}
              onShare={jest.fn()}
              showSocialProof={true}
            />
          </ReputationProvider>
        </EngagementProvider>
      );
      
      // Social proof should be visible
      expect(screen.getByText(/friend1 and others reacted/i)).toBeInTheDocument();
      
      // Add own reaction
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      // Social proof should update
      await waitFor(() => {
        expect(screen.getByText(/you and friend1 reacted/i)).toBeInTheDocument();
      });
    });

    it('should highlight verified user reactions', async () => {
      const postWithVerifiedReactions = {
        ...mockPost,
        socialProof: {
          followedUsersWhoEngaged: [],
          totalEngagementFromFollowed: 0,
          communityLeadersWhoEngaged: [],
          verifiedUsersWhoEngaged: [
            { id: 'verified-1', username: 'verified1', displayName: 'Verified User' },
          ],
        },
      };
      
      render(
        <EngagementProvider>
          <ReputationProvider>
            <EnhancedPostCard
              post={postWithVerifiedReactions}
              context="feed"
              onReaction={jest.fn()}
              onTip={jest.fn()}
              onShare={jest.fn()}
              showSocialProof={true}
            />
          </ReputationProvider>
        </EngagementProvider>
      );
      
      expect(screen.getByTestId('verified-reaction-indicator')).toBeInTheDocument();
    });
  });

  describe('Milestone Celebrations', () => {
    it('should trigger celebration when reaction milestone is reached', async () => {
      const user = userEvent.setup();
      
      // Mock milestone reached
      mockTokenReactionService.addReaction.mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        newReactionCount: 100, // Milestone number
        milestoneReached: {
          type: 'reaction_count',
          value: 100,
          reward: 'Popular Post Badge',
        },
      });
      
      renderIntegrationTest();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('milestone-celebration')).toBeInTheDocument();
        expect(screen.getByText(/100 reactions milestone/i)).toBeInTheDocument();
      });
    });

    it('should award reputation bonus for milestones', async () => {
      const user = userEvent.setup();
      
      // Mock milestone with bonus
      mockTokenReactionService.addReaction.mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        newReactionCount: 50,
        milestoneReached: {
          type: 'reaction_count',
          value: 50,
          reward: 'Engagement Badge',
        },
      });
      
      mockReputationService.updateReputationForReaction.mockResolvedValue({
        pointsEarned: 25, // Bonus points for milestone
        newTotalScore: 525,
        milestoneBonus: true,
      });
      
      renderIntegrationTest();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        expect(mockReputationService.updateReputationForReaction).toHaveBeenCalledWith(
          expect.objectContaining({
            milestoneReached: true,
          })
        );
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update reaction counts in real-time', async () => {
      const user = userEvent.setup();
      renderIntegrationTest();
      
      // Simulate real-time update from another user
      fireEvent(window, new CustomEvent('reactionUpdate', {
        detail: {
          postId: 'post-1',
          reactionType: '🚀',
          newCount: 5,
          user: { username: 'otheruser' },
        },
      }));
      
      await waitFor(() => {
        expect(screen.getByTestId('reaction-count-🚀')).toHaveTextContent('5');
      });
    });

    it('should show live reaction animations from other users', async () => {
      renderIntegrationTest();
      
      // Simulate live reaction from another user
      fireEvent(window, new CustomEvent('liveReaction', {
        detail: {
          postId: 'post-1',
          reactionType: '🔥',
          user: { username: 'liveuser' },
        },
      }));
      
      await waitFor(() => {
        expect(screen.getByTestId('live-reaction-animation')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce rapid reaction clicks', async () => {
      const user = userEvent.setup();
      renderIntegrationTest();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      
      // Click rapidly
      await user.click(fireButton);
      await user.click(fireButton);
      await user.click(fireButton);
      
      // Should only make one API call due to debouncing
      await waitFor(() => {
        expect(mockTokenReactionService.addReaction).toHaveBeenCalledTimes(1);
      });
    });

    it('should cache reaction states for performance', async () => {
      const user = userEvent.setup();
      renderIntegrationTest();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      // Verify caching service is called
      await waitFor(() => {
        expect(mockTokenReactionService.cacheReactionState).toHaveBeenCalledWith({
          postId: 'post-1',
          userAddress: '0xuser123',
          reactions: expect.any(Array),
        });
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle network failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network failure
      mockTokenReactionService.addReaction.mockRejectedValue(
        new Error('Network unavailable')
      );
      
      renderIntegrationTest();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should queue reactions when offline', async () => {
      const user = userEvent.setup();
      
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      
      renderIntegrationTest();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        expect(screen.getByText(/queued for when online/i)).toBeInTheDocument();
        expect(mockTokenReactionService.queueOfflineReaction).toHaveBeenCalled();
      });
    });

    it('should sync queued reactions when back online', async () => {
      renderIntegrationTest();
      
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      
      fireEvent(window, new Event('online'));
      
      await waitFor(() => {
        expect(mockTokenReactionService.syncOfflineReactions).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should announce reaction changes to screen readers', async () => {
      const user = userEvent.setup();
      renderIntegrationTest();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveTextContent(/fire reaction added/i);
      });
    });

    it('should support keyboard navigation through reactions', async () => {
      const user = userEvent.setup();
      renderIntegrationTest();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      fireButton.focus();
      
      await user.keyboard('{Tab}');
      expect(screen.getByTestId('reaction-button-🚀')).toHaveFocus();
      
      await user.keyboard('{Tab}');
      expect(screen.getByTestId('reaction-button-💎')).toHaveFocus();
    });

    it('should provide proper focus management in modals', async () => {
      const user = userEvent.setup();
      renderIntegrationTest();
      
      const diamondButton = screen.getByTestId('reaction-button-💎');
      await user.click(diamondButton);
      
      await waitFor(() => {
        const modal = screen.getByTestId('reaction-stake-modal');
        expect(modal).toBeInTheDocument();
        
        // Focus should be trapped in modal
        const firstFocusable = screen.getByLabelText(/stake amount/i);
        expect(firstFocusable).toHaveFocus();
      });
    });
  });
});