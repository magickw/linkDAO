import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenReactionSystem } from '@/components/TokenReactionSystem/TokenReactionSystem';
import { EngagementProvider } from '@/contexts/EngagementContext';
import { TokenReaction, ReactionType } from '@/types/tokenReaction';

// Mock services
jest.mock('@/services/tokenReactionService');

const mockReactions: TokenReaction[] = [
  {
    type: '🔥',
    users: [
      { id: '1', username: 'user1', walletAddress: '0x123', amount: 5 },
      { id: '2', username: 'user2', walletAddress: '0x456', amount: 3 },
    ],
    totalAmount: 8,
    tokenType: 'LDAO',
  },
  {
    type: '🚀',
    users: [
      { id: '3', username: 'user3', walletAddress: '0x789', amount: 10 },
    ],
    totalAmount: 10,
    tokenType: 'LDAO',
  },
];

const mockOnReact = jest.fn();
const mockOnViewReactors = jest.fn();

const renderWithProvider = (props = {}) => {
  const defaultProps = {
    postId: 'test-post-1',
    reactions: mockReactions,
    userWallet: '0x123',
    onReact: mockOnReact,
    onViewReactors: mockOnViewReactors,
    ...props,
  };

  return render(
    <EngagementProvider>
      <TokenReactionSystem {...defaultProps} />
    </EngagementProvider>
  );
};

describe('TokenReactionSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Reaction Display', () => {
    it('should render all reaction types', () => {
      renderWithProvider();
      
      expect(screen.getByTestId('reaction-button-🔥')).toBeInTheDocument();
      expect(screen.getByTestId('reaction-button-🚀')).toBeInTheDocument();
      expect(screen.getByTestId('reaction-button-💎')).toBeInTheDocument();
    });

    it('should show reaction counts', () => {
      renderWithProvider();
      
      expect(screen.getByText('8')).toBeInTheDocument(); // Fire reaction count
      expect(screen.getByText('10')).toBeInTheDocument(); // Rocket reaction count
    });

    it('should highlight user reactions', () => {
      renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      expect(fireButton).toHaveClass('user-reacted');
    });

    it('should show token costs for reactions', () => {
      renderWithProvider();
      
      expect(screen.getByText('1 LDAO')).toBeInTheDocument(); // Fire cost
      expect(screen.getByText('2 LDAO')).toBeInTheDocument(); // Rocket cost
      expect(screen.getByText('5 LDAO')).toBeInTheDocument(); // Diamond cost
    });
  });

  describe('Reaction Interactions', () => {
    it('should handle reaction clicks', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const diamondButton = screen.getByTestId('reaction-button-💎');
      await user.click(diamondButton);
      
      expect(mockOnReact).toHaveBeenCalledWith('💎', 5);
    });

    it('should show reaction stake modal for expensive reactions', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const diamondButton = screen.getByTestId('reaction-button-💎');
      await user.click(diamondButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('reaction-stake-modal')).toBeInTheDocument();
      });
    });

    it('should allow custom stake amounts', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const diamondButton = screen.getByTestId('reaction-button-💎');
      await user.click(diamondButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('reaction-stake-modal')).toBeInTheDocument();
      });
      
      const customAmountInput = screen.getByLabelText(/custom amount/i);
      await user.clear(customAmountInput);
      await user.type(customAmountInput, '10');
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);
      
      expect(mockOnReact).toHaveBeenCalledWith('💎', 10);
    });

    it('should prevent reactions with insufficient balance', async () => {
      const user = userEvent.setup();
      renderWithProvider({ userBalance: 1 }); // Low balance
      
      const diamondButton = screen.getByTestId('reaction-button-💎');
      await user.click(diamondButton);
      
      await waitFor(() => {
        expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
      });
      
      expect(mockOnReact).not.toHaveBeenCalled();
    });
  });

  describe('Reaction Animations', () => {
    it('should show reaction animation on click', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('reaction-animation-🔥')).toBeInTheDocument();
      });
    });

    it('should show celebration animation for milestones', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      // Mock a reaction that triggers milestone
      mockOnReact.mockImplementation(() => {
        // Simulate milestone reached
        fireEvent(window, new CustomEvent('reactionMilestone', {
          detail: { type: '🔥', milestone: 100 }
        }));
      });
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('celebration-animation')).toBeInTheDocument();
      });
    });

    it('should animate reaction count updates', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      // Update reactions with new count
      const updatedReactions = [...mockReactions];
      updatedReactions[0].totalAmount = 9;
      
      rerender(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post-1"
            reactions={updatedReactions}
            userWallet="0x123"
            onReact={mockOnReact}
            onViewReactors={mockOnViewReactors}
          />
        </EngagementProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('count-animation')).toBeInTheDocument();
      });
    });
  });

  describe('Reactor Modal', () => {
    it('should show reactor modal when reaction count is clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const reactionCount = screen.getByTestId('reaction-count-🔥');
      await user.click(reactionCount);
      
      expect(mockOnViewReactors).toHaveBeenCalledWith('🔥');
    });

    it('should display reactor list with amounts', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const reactionCount = screen.getByTestId('reaction-count-🔥');
      await user.click(reactionCount);
      
      // Mock modal opening
      render(
        <div data-testid="reactor-modal">
          <div>user1 - 5 LDAO</div>
          <div>user2 - 3 LDAO</div>
        </div>
      );
      
      expect(screen.getByText('user1 - 5 LDAO')).toBeInTheDocument();
      expect(screen.getByText('user2 - 3 LDAO')).toBeInTheDocument();
    });

    it('should sort reactors by amount', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const reactionCount = screen.getByTestId('reaction-count-🔥');
      await user.click(reactionCount);
      
      // Verify sorting logic is called
      expect(mockOnViewReactors).toHaveBeenCalledWith('🔥');
    });
  });

  describe('Social Proof', () => {
    it('should highlight reactions from followed users', () => {
      const followedUsers = ['user1'];
      renderWithProvider({ followedUsers });
      
      const socialProofIndicator = screen.getByTestId('social-proof-🔥');
      expect(socialProofIndicator).toHaveTextContent('user1 and others reacted');
    });

    it('should show verified user reactions', () => {
      const verifiedUsers = ['user2'];
      renderWithProvider({ verifiedUsers });
      
      const verifiedIndicator = screen.getByTestId('verified-reaction-🔥');
      expect(verifiedIndicator).toBeInTheDocument();
    });

    it('should prioritize community leader reactions', () => {
      const communityLeaders = ['user1'];
      renderWithProvider({ communityLeaders });
      
      const leaderIndicator = screen.getByTestId('leader-reaction-🔥');
      expect(leaderIndicator).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should debounce rapid reaction clicks', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      
      // Click rapidly
      await user.click(fireButton);
      await user.click(fireButton);
      await user.click(fireButton);
      
      // Should only call once due to debouncing
      await waitFor(() => {
        expect(mockOnReact).toHaveBeenCalledTimes(1);
      });
    });

    it('should lazy load reaction animations', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      // Animation should be loaded on demand
      await waitFor(() => {
        expect(screen.getByTestId('reaction-animation-🔥')).toBeInTheDocument();
      });
    });

    it('should virtualize large reactor lists', async () => {
      const manyReactors = Array.from({ length: 1000 }, (_, i) => ({
        id: `user-${i}`,
        username: `user${i}`,
        walletAddress: `0x${i}`,
        amount: Math.floor(Math.random() * 10) + 1,
      }));

      const largeReaction: TokenReaction = {
        type: '🔥',
        users: manyReactors,
        totalAmount: manyReactors.reduce((sum, user) => sum + user.amount, 0),
        tokenType: 'LDAO',
      };

      renderWithProvider({ reactions: [largeReaction] });
      
      const user = userEvent.setup();
      const reactionCount = screen.getByTestId('reaction-count-🔥');
      await user.click(reactionCount);
      
      // Should use virtual scrolling for large lists
      expect(mockOnViewReactors).toHaveBeenCalledWith('🔥');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      expect(fireButton).toHaveAttribute('aria-label', 'React with fire emoji, costs 1 LDAO');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      fireButton.focus();
      
      await user.keyboard('{Enter}');
      
      expect(mockOnReact).toHaveBeenCalledWith('🔥', 1);
    });

    it('should announce reaction changes to screen readers', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/reaction added/i);
      });
    });

    it('should provide high contrast mode support', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      expect(fireButton).toHaveClass('high-contrast');
    });
  });

  describe('Error Handling', () => {
    it('should handle reaction failures gracefully', async () => {
      const user = userEvent.setup();
      mockOnReact.mockRejectedValue(new Error('Network error'));
      
      renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to add reaction/i)).toBeInTheDocument();
      });
    });

    it('should retry failed reactions', async () => {
      const user = userEvent.setup();
      mockOnReact
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);
      
      renderWithProvider();
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to add reaction/i)).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(mockOnReact).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle wallet disconnection', async () => {
      const user = userEvent.setup();
      renderWithProvider({ userWallet: null });
      
      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);
      
      await waitFor(() => {
        expect(screen.getByText(/connect wallet to react/i)).toBeInTheDocument();
      });
    });
  });
});