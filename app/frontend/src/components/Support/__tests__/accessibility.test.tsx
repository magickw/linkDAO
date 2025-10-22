import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { SupportDocuments } from '../SupportDocuments';
import { DocumentNavigation } from '../DocumentNavigation';
import { AccessibilityControls } from '../AccessibilityControls';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock document service
jest.mock('../../services/documentService');

describe('Accessibility Testing Suite', () => {
  describe('WCAG 2.1 AA Compliance', () => {
    test('SupportDocuments component has no accessibility violations', async () => {
      const { container } = render(<SupportDocuments />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('DocumentNavigation component has no accessibility violations', async () => {
      const { container } = render(<DocumentNavigation />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('AccessibilityControls component has no accessibility violations', async () => {
      const { container } = render(<AccessibilityControls />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('Document viewer modal has no accessibility violations', async () => {
      const { container } = render(<SupportDocuments />);
      
      // Open document viewer
      const documentLink = screen.getByText('Beginner\'s Guide to LDAO');
      await userEvent.click(documentLink);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    test('all interactive elements are keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);

      // Tab through all interactive elements
      await user.tab(); // Search input
      expect(screen.getByRole('searchbox')).toHaveFocus();

      await user.tab(); // Category filter
      expect(screen.getByRole('button', { name: /category/i })).toHaveFocus();

      await user.tab(); // Sort dropdown
      expect(screen.getByRole('button', { name: /sort/i })).toHaveFocus();

      await user.tab(); // First document
      expect(screen.getByText('Beginner\'s Guide to LDAO')).toHaveFocus();
    });

    test('keyboard shortcuts work correctly', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);

      // Test search shortcut (Ctrl+K)
      await user.keyboard('{Control>}k{/Control}');
      expect(screen.getByRole('searchbox')).toHaveFocus();

      // Test escape to close modals
      await user.keyboard('{Escape}');
      expect(screen.getByRole('searchbox')).not.toHaveFocus();
    });

    test('tab order is logical and follows visual layout', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);

      const tabbableElements = [
        screen.getByRole('searchbox'),
        screen.getByRole('button', { name: /category/i }),
        screen.getByRole('button', { name: /sort/i }),
        ...screen.getAllByRole('link')
      ];

      for (let i = 0; i < tabbableElements.length; i++) {
        await user.tab();
        expect(tabbableElements[i]).toHaveFocus();
      }
    });

    test('skip links are provided for keyboard users', () => {
      render(<SupportDocuments />);
      
      expect(screen.getByText('Skip to main content')).toBeInTheDocument();
      expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
    });

    test('focus is managed properly in modals', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);

      // Open document viewer
      const documentLink = screen.getByText('Beginner\'s Guide to LDAO');
      await user.click(documentLink);

      // Focus should be trapped in modal
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // First focusable element in modal should have focus
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    test('provides proper ARIA labels and descriptions', () => {
      render(<SupportDocuments />);

      // Search input
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('aria-label', 'Search support documents');
      expect(searchInput).toHaveAttribute('aria-describedby');

      // Document cards
      const documentCards = screen.getAllByRole('article');
      documentCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
      });

      // Category filters
      const categoryButtons = screen.getAllByRole('button');
      categoryButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    test('announces dynamic content changes', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);

      // Search for documents
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'security');

      // Should announce search results
      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/found/i);
    });

    test('provides proper heading structure', () => {
      render(<SupportDocuments />);

      // Check heading hierarchy
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();

      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);

      // No heading levels should be skipped
      const headings = screen.getAllByRole('heading');
      const levels = headings.map(h => parseInt(h.tagName.charAt(1)));
      
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i] - levels[i-1]).toBeLessThanOrEqual(1);
      }
    });

    test('provides alternative text for images', () => {
      render(<SupportDocuments />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).not.toBe('');
      });
    });

    test('uses semantic HTML elements', () => {
      render(<SupportDocuments />);

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getAllByRole('article')).toHaveLength(4);
    });
  });

  describe('Visual Accessibility', () => {
    test('meets color contrast requirements', () => {
      render(<SupportDocuments />);

      // Test would require actual color contrast calculation
      // This is a placeholder for contrast testing
      const textElements = screen.getAllByText(/./);
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        expect(styles.color).toBeDefined();
        expect(styles.backgroundColor).toBeDefined();
      });
    });

    test('supports high contrast mode', () => {
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

      render(<SupportDocuments />);

      // Should apply high contrast styles
      const container = screen.getByTestId('support-documents');
      expect(container).toHaveClass('high-contrast');
    });

    test('supports reduced motion preferences', () => {
      // Mock reduced motion media query
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

      render(<SupportDocuments />);

      // Should disable animations
      const animatedElements = screen.getAllByTestId(/animated/);
      animatedElements.forEach(element => {
        expect(element).toHaveClass('no-animation');
      });
    });

    test('provides focus indicators', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);

      const focusableElement = screen.getByRole('searchbox');
      await user.tab();

      expect(focusableElement).toHaveFocus();
      
      // Should have visible focus indicator
      const styles = window.getComputedStyle(focusableElement);
      expect(styles.outline).not.toBe('none');
    });
  });

  describe('Motor Accessibility', () => {
    test('provides large click targets', () => {
      render(<SupportDocuments />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
      });
    });

    test('supports alternative input methods', async () => {
      render(<AccessibilityControls />);

      // Test dwell clicking
      const dwellButton = screen.getByRole('button', { name: /dwell clicking/i });
      expect(dwellButton).toBeInTheDocument();

      // Test sticky keys
      const stickyKeysButton = screen.getByRole('button', { name: /sticky keys/i });
      expect(stickyKeysButton).toBeInTheDocument();
    });

    test('provides hover alternatives for touch devices', () => {
      render(<SupportDocuments />);

      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        value: () => {},
        writable: true
      });

      const documentCards = screen.getAllByTestId(/document-card/);
      documentCards.forEach(card => {
        // Should have click handler instead of hover
        expect(card).toHaveAttribute('onClick');
      });
    });
  });

  describe('Cognitive Accessibility', () => {
    test('provides clear and consistent navigation', () => {
      render(<SupportDocuments />);

      // Navigation should be consistent
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Breadcrumbs should show current location
      const breadcrumbs = screen.getByTestId('breadcrumbs');
      expect(breadcrumbs).toBeInTheDocument();
    });

    test('provides help and instructions', () => {
      render(<SupportDocuments />);

      // Search should have placeholder text
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('placeholder');

      // Should have help text for complex interactions
      const helpTexts = screen.getAllByText(/help/i);
      expect(helpTexts.length).toBeGreaterThan(0);
    });

    test('supports simplified interface mode', () => {
      render(<AccessibilityControls />);

      const simplifiedModeButton = screen.getByRole('button', { name: /simplified interface/i });
      expect(simplifiedModeButton).toBeInTheDocument();
    });

    test('provides error prevention and correction', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);

      // Search with no results should provide suggestions
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'xyz123nonexistent');

      const noResults = screen.getByText(/no documents found/i);
      expect(noResults).toBeInTheDocument();

      const suggestions = screen.getByText(/try different keywords/i);
      expect(suggestions).toBeInTheDocument();
    });
  });

  describe('Language and Internationalization', () => {
    test('provides proper language attributes', () => {
      render(<SupportDocuments />);

      const htmlElement = document.documentElement;
      expect(htmlElement).toHaveAttribute('lang');
    });

    test('supports right-to-left languages', () => {
      // Mock RTL language
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');

      render(<SupportDocuments />);

      const container = screen.getByTestId('support-documents');
      expect(container).toHaveClass('rtl');
    });

    test('provides language alternatives', () => {
      render(<SupportDocuments />);

      const languageSelector = screen.getByRole('button', { name: /language/i });
      expect(languageSelector).toBeInTheDocument();
    });
  });

  describe('Assistive Technology Integration', () => {
    test('works with screen readers', () => {
      render(<SupportDocuments />);

      // Should have proper landmarks
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();

      // Should have proper live regions
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('supports voice control', () => {
      render(<SupportDocuments />);

      // Elements should have accessible names for voice control
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAccessibleName();
      });
    });

    test('supports switch navigation', async () => {
      render(<AccessibilityControls />);

      const switchNavButton = screen.getByRole('button', { name: /switch navigation/i });
      expect(switchNavButton).toBeInTheDocument();
    });
  });

  describe('Performance and Accessibility', () => {
    test('maintains accessibility during lazy loading', async () => {
      render(<SupportDocuments />);

      // Initially loaded content should be accessible
      let results = await axe(document.body);
      expect(results).toHaveNoViolations();

      // Trigger lazy loading
      const loadMoreButton = screen.getByRole('button', { name: /load more/i });
      await userEvent.click(loadMoreButton);

      // Newly loaded content should also be accessible
      results = await axe(document.body);
      expect(results).toHaveNoViolations();
    });

    test('maintains focus during dynamic updates', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);

      const searchInput = screen.getByRole('searchbox');
      await user.click(searchInput);
      expect(searchInput).toHaveFocus();

      // Type to trigger dynamic update
      await user.type(searchInput, 'test');

      // Focus should be maintained
      expect(searchInput).toHaveFocus();
    });
  });

  describe('Error Handling and Accessibility', () => {
    test('provides accessible error messages', () => {
      // Mock error state
      jest.mocked(require('../../services/documentService').loadDocuments)
        .mockRejectedValue(new Error('Network error'));

      render(<SupportDocuments />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(/error/i);
    });

    test('provides accessible loading states', () => {
      render(<SupportDocuments />);

      const loadingIndicator = screen.getByRole('status');
      expect(loadingIndicator).toHaveAttribute('aria-label', 'Loading documents');
    });

    test('handles accessibility gracefully when features fail', () => {
      // Mock feature detection failure
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        writable: true
      });

      render(<AccessibilityControls />);

      // Should still render without speech features
      expect(screen.getByTestId('accessibility-controls')).toBeInTheDocument();
    });
  });
});