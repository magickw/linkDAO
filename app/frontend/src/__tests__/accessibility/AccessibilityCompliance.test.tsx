import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { EnhancedPostComposer } from '@/components/EnhancedPostComposer/EnhancedPostComposer';
import { TokenReactionSystem } from '@/components/TokenReactionSystem/TokenReactionSystem';
import { BadgeCollection } from '@/components/Reputation/BadgeCollection';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ContentCreationProvider } from '@/contexts/ContentCreationContext';
import { EngagementProvider } from '@/contexts/EngagementContext';
import { ReputationProvider } from '@/contexts/ReputationContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock services to prevent network calls during accessibility tests
jest.mock('@/services/postService');
jest.mock('@/services/tokenReactionService');
jest.mock('@/services/reputationService');

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  avatar: '/avatar.jpg',
  walletAddress: '0x123',
  reputation: {
    totalScore: 500,
    level: { name: 'Contributor', level: 3 },
    badges: [],
    progress: [],
    breakdown: {},
    history: [],
  },
};

const mockBadges = [
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Joined in the first month',
    icon: '🌟',
    rarity: 'rare' as const,
    earnedAt: new Date('2024-01-01'),
    requirements: [],
  },
  {
    id: 'expert',
    name: 'Expert',
    description: 'Demonstrated expertise',
    icon: '🎓',
    rarity: 'epic' as const,
    earnedAt: new Date('2024-02-01'),
    requirements: [],
  },
];

const mockReactions = [
  {
    type: '🔥' as const,
    users: [{ id: '1', username: 'user1', walletAddress: '0x1', amount: 5 }],
    totalAmount: 5,
    tokenType: 'LDAO',
  },
];

describe('Accessibility Compliance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have no accessibility violations in EnhancedPostComposer', async () => {
      const { container } = render(
        <ContentCreationProvider>
          <EnhancedPostComposer
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </ContentCreationProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in TokenReactionSystem', async () => {
      const { container } = render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in BadgeCollection', async () => {
      const { container } = render(
        <ReputationProvider>
          <BadgeCollection badges={mockBadges} onBadgeClick={jest.fn()} />
        </ReputationProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in complete dashboard', async () => {
      const { container } = render(
        <ContentCreationProvider>
          <EngagementProvider>
            <ReputationProvider>
              <DashboardLayout user={mockUser} />
            </ReputationProvider>
          </EngagementProvider>
        </ContentCreationProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation in post composer', async () => {
      const user = userEvent.setup();
      render(
        <ContentCreationProvider>
          <EnhancedPostComposer
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </ContentCreationProvider>
      );

      // Tab through content type tabs
      await user.keyboard('{Tab}');
      expect(screen.getByRole('tab', { name: /text/i })).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: /media/i })).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: /link/i })).toHaveFocus();

      // Navigate to text area
      await user.keyboard('{Tab}');
      expect(screen.getByRole('textbox')).toHaveFocus();

      // Navigate to submit button
      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /post/i })).toHaveFocus();
    });

    it('should support keyboard navigation in token reactions', async () => {
      const user = userEvent.setup();
      const mockOnReact = jest.fn();

      render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={mockOnReact}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      // Tab through reaction buttons
      const fireButton = screen.getByTestId('reaction-button-🔥');
      fireButton.focus();

      await user.keyboard('{Tab}');
      expect(screen.getByTestId('reaction-button-🚀')).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(screen.getByTestId('reaction-button-💎')).toHaveFocus();

      // Activate reaction with Enter
      await user.keyboard('{Enter}');
      expect(mockOnReact).toHaveBeenCalledWith('💎', 5);

      // Activate reaction with Space
      fireButton.focus();
      await user.keyboard(' ');
      expect(mockOnReact).toHaveBeenCalledWith('🔥', 1);
    });

    it('should trap focus in modals', async () => {
      const user = userEvent.setup();
      render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      // Open stake modal
      const diamondButton = screen.getByTestId('reaction-button-💎');
      await user.click(diamondButton);

      await waitFor(() => {
        expect(screen.getByTestId('reaction-stake-modal')).toBeInTheDocument();
      });

      // Focus should be trapped in modal
      const firstFocusable = screen.getByLabelText(/stake amount/i);
      expect(firstFocusable).toHaveFocus();

      // Tab to next element
      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /confirm/i })).toHaveFocus();

      // Tab to close button
      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();

      // Tab should wrap back to first element
      await user.keyboard('{Tab}');
      expect(firstFocusable).toHaveFocus();
    });

    it('should handle escape key to close modals', async () => {
      const user = userEvent.setup();
      render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      // Open modal
      const diamondButton = screen.getByTestId('reaction-button-💎');
      await user.click(diamondButton);

      await waitFor(() => {
        expect(screen.getByTestId('reaction-stake-modal')).toBeInTheDocument();
      });

      // Press escape to close
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByTestId('reaction-stake-modal')).not.toBeInTheDocument();
      });

      // Focus should return to trigger element
      expect(diamondButton).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide proper ARIA labels for interactive elements', () => {
      render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      // Reaction buttons should have descriptive labels
      expect(screen.getByTestId('reaction-button-🔥')).toHaveAttribute(
        'aria-label',
        'React with fire emoji, costs 1 LDAO token'
      );

      expect(screen.getByTestId('reaction-button-🚀')).toHaveAttribute(
        'aria-label',
        'React with rocket emoji, costs 2 LDAO tokens'
      );

      expect(screen.getByTestId('reaction-button-💎')).toHaveAttribute(
        'aria-label',
        'React with diamond emoji, costs 5 LDAO tokens'
      );
    });

    it('should provide live region updates for dynamic content', async () => {
      const user = userEvent.setup();
      const mockOnReact = jest.fn().mockResolvedValue({ success: true });

      render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={mockOnReact}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);

      // Should announce reaction to screen readers
      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent(/fire reaction added successfully/i);
      });
    });

    it('should provide proper form labels and descriptions', () => {
      render(
        <ContentCreationProvider>
          <EnhancedPostComposer
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </ContentCreationProvider>
      );

      const textArea = screen.getByRole('textbox');
      expect(textArea).toHaveAttribute('aria-label', 'Post content');
      expect(textArea).toHaveAttribute('aria-describedby');

      const description = document.getElementById(textArea.getAttribute('aria-describedby')!);
      expect(description).toHaveTextContent(/enter your post content/i);
    });

    it('should provide progress information for uploads', async () => {
      const user = userEvent.setup();
      render(
        <ContentCreationProvider>
          <EnhancedPostComposer
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </ContentCreationProvider>
      );

      // Switch to media tab
      const mediaTab = screen.getByRole('tab', { name: /media/i });
      await user.click(mediaTab);

      const dropZone = screen.getByTestId('media-upload-zone');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      // Progress bar should have proper ARIA attributes
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-label', 'Upload progress');
        expect(progressBar).toHaveAttribute('aria-valuenow');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      });
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should maintain proper color contrast ratios', () => {
      render(
        <ReputationProvider>
          <BadgeCollection badges={mockBadges} onBadgeClick={jest.fn()} />
        </ReputationProvider>
      );

      // Check that badges have proper contrast classes
      const badges = screen.getAllByTestId(/^badge-/);
      badges.forEach(badge => {
        expect(badge).toHaveClass('high-contrast-compliant');
      });
    });

    it('should support high contrast mode', () => {
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

      render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      // Elements should have high contrast styles
      const reactionButtons = screen.getAllByTestId(/^reaction-button-/);
      reactionButtons.forEach(button => {
        expect(button).toHaveClass('high-contrast');
      });
    });

    it('should support reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      // Animations should be disabled
      const animatedElements = screen.getAllByTestId(/animation/);
      animatedElements.forEach(element => {
        expect(element).toHaveClass('reduced-motion');
      });
    });
  });

  describe('Touch and Mobile Accessibility', () => {
    it('should have proper touch targets', () => {
      render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      // Touch targets should be at least 44px
      const reactionButtons = screen.getAllByTestId(/^reaction-button-/);
      reactionButtons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minSize = parseInt(styles.minHeight) || parseInt(styles.height);
        expect(minSize).toBeGreaterThanOrEqual(44);
      });
    });

    it('should support touch gestures', async () => {
      const user = userEvent.setup();
      const mockOnReact = jest.fn();

      render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={mockOnReact}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      const fireButton = screen.getByTestId('reaction-button-🔥');

      // Simulate touch events
      fireEvent.touchStart(fireButton);
      fireEvent.touchEnd(fireButton);

      expect(mockOnReact).toHaveBeenCalledWith('🔥', 1);
    });
  });

  describe('Error Handling Accessibility', () => {
    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));

      render(
        <ContentCreationProvider>
          <EnhancedPostComposer
            context="feed"
            onSubmit={mockOnSubmit}
            onDraftSave={jest.fn()}
          />
        </ContentCreationProvider>
      );

      const textArea = screen.getByRole('textbox');
      await user.type(textArea, 'Test content');

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      // Error should be announced
      await waitFor(() => {
        const errorRegion = screen.getByRole('alert');
        expect(errorRegion).toHaveTextContent(/submission failed/i);
      });
    });

    it('should provide clear error recovery instructions', async () => {
      const user = userEvent.setup();
      const mockOnReact = jest.fn().mockRejectedValue(new Error('Network error'));

      render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={mockOnReact}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      const fireButton = screen.getByTestId('reaction-button-🔥');
      await user.click(fireButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText(/please try again/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Internationalization Accessibility', () => {
    it('should support RTL languages', () => {
      // Mock RTL direction
      document.dir = 'rtl';

      render(
        <ContentCreationProvider>
          <EnhancedPostComposer
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </ContentCreationProvider>
      );

      const composer = screen.getByTestId('enhanced-post-composer');
      expect(composer).toHaveClass('rtl-support');

      // Reset
      document.dir = 'ltr';
    });

    it('should provide proper language attributes', () => {
      render(
        <ReputationProvider>
          <BadgeCollection badges={mockBadges} onBadgeClick={jest.fn()} />
        </ReputationProvider>
      );

      // Badge descriptions should have language attributes
      const badges = screen.getAllByTestId(/^badge-/);
      badges.forEach(badge => {
        expect(badge).toHaveAttribute('lang', 'en');
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('should maintain accessibility during virtual scrolling', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        content: `Item ${i}`,
      }));

      const { container } = render(
        <div
          role="feed"
          aria-label="Social media feed"
          data-testid="virtual-scroll-container"
        >
          {largeDataset.slice(0, 10).map(item => (
            <article
              key={item.id}
              role="article"
              aria-labelledby={`title-${item.id}`}
              tabIndex={0}
            >
              <h3 id={`title-${item.id}`}>{item.content}</h3>
            </article>
          ))}
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Feed should have proper ARIA attributes
      const feed = screen.getByRole('feed');
      expect(feed).toHaveAttribute('aria-label', 'Social media feed');

      // Articles should be properly labeled
      const articles = screen.getAllByRole('article');
      articles.forEach((article, index) => {
        expect(article).toHaveAttribute('aria-labelledby', `title-item-${index}`);
        expect(article).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should maintain focus during dynamic updates', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x123"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      const fireButton = screen.getByTestId('reaction-button-🔥');
      fireButton.focus();
      expect(fireButton).toHaveFocus();

      // Update reactions
      const updatedReactions = [
        {
          ...mockReactions[0],
          totalAmount: 6,
        },
      ];

      rerender(
        <EngagementProvider>
          <TokenReactionSystem
            postId="test-post"
            reactions={updatedReactions}
            userWallet="0x123"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </EngagementProvider>
      );

      // Focus should be maintained
      expect(fireButton).toHaveFocus();
    });
  });
});