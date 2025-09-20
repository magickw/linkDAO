import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { EnhancedPostComposer } from '@/components/EnhancedPostComposer/EnhancedPostComposer';
import { TokenReactionSystem } from '@/components/TokenReactionSystem/TokenReactionSystem';
import { VirtualScrolling } from '@/components/Performance/VirtualScrolling';
import { EnhancedSearchInterface } from '@/components/EnhancedSearch/EnhancedSearchInterface';
import { RealTimeNotificationSystem } from '@/components/RealTimeNotifications/RealTimeNotificationSystem';
import { EnhancedStateProvider } from '@/contexts/EnhancedStateProvider';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EnhancedStateProvider>
    {children}
  </EnhancedStateProvider>
);

describe('WCAG 2.1 AA Accessibility Compliance', () => {
  beforeEach(() => {
    // Mock necessary APIs
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  describe('Enhanced Post Composer Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <EnhancedPostComposer 
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <EnhancedPostComposer 
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </TestWrapper>
      );

      // Check main composer has proper role
      expect(screen.getByRole('form')).toBeInTheDocument();
      
      // Check text input has proper labeling
      const textInput = screen.getByRole('textbox');
      expect(textInput).toHaveAttribute('aria-label');
      expect(textInput).toHaveAttribute('aria-describedby');

      // Check content type tabs have proper roles
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();
      expect(tabList).toHaveAttribute('aria-label');

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-controls');
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedPostComposer 
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </TestWrapper>
      );

      // Tab through interface
      await user.tab();
      expect(screen.getAllByRole('tab')[0]).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();

      // Arrow key navigation in tabs
      screen.getAllByRole('tab')[0].focus();
      await user.keyboard('{ArrowRight}');
      expect(screen.getAllByRole('tab')[1]).toHaveFocus();

      await user.keyboard('{ArrowLeft}');
      expect(screen.getAllByRole('tab')[0]).toHaveFocus();
    });

    it('should have sufficient color contrast', () => {
      render(
        <TestWrapper>
          <EnhancedPostComposer 
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </TestWrapper>
      );

      // Check that elements have proper contrast classes
      const textInput = screen.getByRole('textbox');
      expect(textInput).toHaveClass(/high-contrast|accessible-colors/);

      const submitButton = screen.getByRole('button', { name: /submit|post/i });
      expect(submitButton).toHaveClass(/high-contrast|accessible-colors/);
    });

    it('should provide clear focus indicators', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedPostComposer 
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </TestWrapper>
      );

      await user.tab();
      const focusedElement = document.activeElement;
      
      // Check focus indicator is visible
      const computedStyle = window.getComputedStyle(focusedElement!);
      expect(computedStyle.outline).not.toBe('none');
    });

    it('should support screen readers with proper announcements', () => {
      render(
        <TestWrapper>
          <EnhancedPostComposer 
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </TestWrapper>
      );

      // Check for live regions
      expect(screen.getByRole('status')).toBeInTheDocument();
      
      // Check for proper headings structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Verify heading hierarchy
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(6);
      });
    });
  });

  describe('Token Reaction System Accessibility', () => {
    const mockReactions = [
      {
        type: '🔥',
        users: [{ address: '0xuser1', amount: 5, username: 'user1' }],
        totalAmount: 5,
        tokenType: 'LDAO',
      },
    ];

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <TokenReactionSystem 
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x1234"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper button accessibility', () => {
      render(
        <TestWrapper>
          <TokenReactionSystem 
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x1234"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </TestWrapper>
      );

      const reactionButtons = screen.getAllByRole('button');
      reactionButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button).toHaveAttribute('aria-describedby');
        expect(button).not.toHaveAttribute('disabled', 'true');
      });
    });

    it('should support keyboard interaction', async () => {
      const user = userEvent.setup();
      const mockOnReact = jest.fn();
      
      render(
        <TestWrapper>
          <TokenReactionSystem 
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x1234"
            onReact={mockOnReact}
            onViewReactors={jest.fn()}
          />
        </TestWrapper>
      );

      const fireButton = screen.getByRole('button', { name: /fire/i });
      fireButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnReact).toHaveBeenCalled();

      await user.keyboard('{Space}');
      expect(mockOnReact).toHaveBeenCalledTimes(2);
    });

    it('should provide meaningful tooltips', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TokenReactionSystem 
            postId="test-post"
            reactions={mockReactions}
            userWallet="0x1234"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </TestWrapper>
      );

      const fireButton = screen.getByRole('button', { name: /fire/i });
      await user.hover(fireButton);

      // Tooltip should be accessible
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('aria-describedby');
    });
  });

  describe('Virtual Scrolling Accessibility', () => {
    const mockItems = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
      content: `Content ${i}`,
    }));

    const MockItemRenderer = ({ item, index }: any) => (
      <div role="listitem" aria-label={`${item.title}: ${item.content}`}>
        <h3>{item.title}</h3>
        <p>{item.content}</p>
      </div>
    );

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <VirtualScrolling 
            items={mockItems}
            itemHeight={100}
            containerHeight={600}
            renderItem={MockItemRenderer}
          />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper list semantics', () => {
      render(
        <TestWrapper>
          <VirtualScrolling 
            items={mockItems}
            itemHeight={100}
            containerHeight={600}
            renderItem={MockItemRenderer}
          />
        </TestWrapper>
      );

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list).toHaveAttribute('aria-label');

      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThan(0);
      
      listItems.forEach(item => {
        expect(item).toHaveAttribute('aria-label');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <VirtualScrolling 
            items={mockItems}
            itemHeight={100}
            containerHeight={600}
            renderItem={MockItemRenderer}
          />
        </TestWrapper>
      );

      const list = screen.getByRole('list');
      list.focus();

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{Home}');
      await user.keyboard('{End}');

      // Should handle keyboard navigation without errors
      expect(list).toHaveFocus();
    });

    it('should announce scroll position changes', async () => {
      render(
        <TestWrapper>
          <VirtualScrolling 
            items={mockItems}
            itemHeight={100}
            containerHeight={600}
            renderItem={MockItemRenderer}
          />
        </TestWrapper>
      );

      // Should have live region for scroll announcements
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Enhanced Search Interface Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <EnhancedSearchInterface 
            onSearch={jest.fn()}
            onFilterChange={jest.fn()}
          />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper search form semantics', () => {
      render(
        <TestWrapper>
          <EnhancedSearchInterface 
            onSearch={jest.fn()}
            onFilterChange={jest.fn()}
          />
        </TestWrapper>
      );

      const searchForm = screen.getByRole('search');
      expect(searchForm).toBeInTheDocument();

      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('aria-label');
      expect(searchInput).toHaveAttribute('aria-describedby');

      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeInTheDocument();
    });

    it('should provide search suggestions accessibly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSearchInterface 
            onSearch={jest.fn()}
            onFilterChange={jest.fn()}
          />
        </TestWrapper>
      );

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test');

      // Should show suggestions with proper ARIA
      const suggestions = screen.getByRole('listbox');
      expect(suggestions).toBeInTheDocument();
      expect(suggestions).toHaveAttribute('aria-label');

      const suggestionItems = screen.getAllByRole('option');
      suggestionItems.forEach(item => {
        expect(item).toHaveAttribute('aria-selected');
      });
    });

    it('should support keyboard navigation in suggestions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSearchInterface 
            onSearch={jest.fn()}
            onFilterChange={jest.fn()}
          />
        </TestWrapper>
      );

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test');

      await user.keyboard('{ArrowDown}');
      expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');

      await user.keyboard('{ArrowDown}');
      expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

      await user.keyboard('{Enter}');
      // Should select the highlighted suggestion
    });
  });

  describe('Real-time Notifications Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should use proper live regions for announcements', () => {
      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Should have live regions for different priority levels
      expect(screen.getByRole('status')).toBeInTheDocument(); // Polite announcements
      expect(screen.getByRole('alert')).toBeInTheDocument(); // Assertive announcements
    });

    it('should provide proper notification semantics', () => {
      const mockNotifications = [
        {
          id: '1',
          type: 'mention',
          title: 'New mention',
          message: 'You were mentioned in a post',
          timestamp: new Date(),
          read: false,
        },
      ];

      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={mockNotifications}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      const notificationList = screen.getByRole('list');
      expect(notificationList).toHaveAttribute('aria-label', /notifications/i);

      const notificationItems = screen.getAllByRole('listitem');
      notificationItems.forEach(item => {
        expect(item).toHaveAttribute('aria-label');
        expect(item).toHaveAttribute('aria-describedby');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockNotifications = [
        {
          id: '1',
          type: 'mention',
          title: 'New mention',
          message: 'You were mentioned in a post',
          timestamp: new Date(),
          read: false,
        },
      ];

      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={mockNotifications}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      const notificationButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(notificationButton);

      // Should be able to navigate through notifications
      await user.tab();
      expect(screen.getAllByRole('button')[1]).toHaveFocus();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should meet color contrast requirements', () => {
      render(
        <TestWrapper>
          <div className="test-container">
            <EnhancedPostComposer 
              context="feed"
              onSubmit={jest.fn()}
              onDraftSave={jest.fn()}
            />
          </div>
        </TestWrapper>
      );

      // Check that high contrast classes are applied
      const container = screen.getByRole('form');
      expect(container).toHaveClass(/high-contrast|accessible/);
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
        <TestWrapper>
          <TokenReactionSystem 
            postId="test-post"
            reactions={[]}
            userWallet="0x1234"
            onReact={jest.fn()}
            onViewReactors={jest.fn()}
          />
        </TestWrapper>
      );

      // Should apply reduced motion classes
      const reactionSystem = screen.getByTestId('token-reaction-system');
      expect(reactionSystem).toHaveClass(/reduced-motion/);
    });

    it('should support high contrast mode', () => {
      // Mock high contrast preference
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
        <TestWrapper>
          <EnhancedPostComposer 
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </TestWrapper>
      );

      // Should apply high contrast styles
      const composer = screen.getByRole('form');
      expect(composer).toHaveClass(/high-contrast/);
    });
  });

  describe('Focus Management', () => {
    it('should trap focus in modals', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedPostComposer 
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </TestWrapper>
      );

      // Open modal (if applicable)
      const triggerButton = screen.getByRole('button', { name: /open|create/i });
      await user.click(triggerButton);

      // Focus should be trapped within modal
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Tab through modal elements
      await user.tab();
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
      expect(modal.contains(document.activeElement)).toBe(true);
    });

    it('should restore focus after modal closes', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedPostComposer 
            context="feed"
            onSubmit={jest.fn()}
            onDraftSave={jest.fn()}
          />
        </TestWrapper>
      );

      const triggerButton = screen.getByRole('button', { name: /open|create/i });
      triggerButton.focus();
      
      await user.click(triggerButton);
      
      // Close modal
      const closeButton = screen.getByRole('button', { name: /close|cancel/i });
      await user.click(closeButton);

      // Focus should return to trigger button
      expect(triggerButton).toHaveFocus();
    });
  });
});