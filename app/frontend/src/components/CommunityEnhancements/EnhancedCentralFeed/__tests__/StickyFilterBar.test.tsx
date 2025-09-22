/**
 * StickyFilterBar Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StickyFilterBar from '../StickyFilterBar';
import { SortOption } from '../../../../types/communityEnhancements';

// Mock window.pageYOffset for scroll tests
Object.defineProperty(window, 'pageYOffset', {
  value: 0,
  writable: true,
});

Object.defineProperty(document.documentElement, 'scrollTop', {
  value: 0,
  writable: true,
});

describe('StickyFilterBar', () => {
  const mockOnSortChange = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    currentSort: 'hot' as SortOption,
    onSortChange: mockOnSortChange,
  };

  describe('Basic Rendering', () => {
    it('renders all sort options', () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      const sortOptions = ['Hot', 'New', 'Top', 'Rising', 'Most Tipped', 'Controversial', 'Trending'];
      
      sortOptions.forEach(option => {
        expect(screen.getByText(option)).toBeInTheDocument();
      });
    });

    it('renders sort by label', () => {
      render(<StickyFilterBar {...defaultProps} />);
      expect(screen.getByText('Sort by:')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(<StickyFilterBar {...defaultProps} />);
      expect(screen.getByLabelText('Refresh content')).toBeInTheDocument();
    });

    it('highlights current sort option', () => {
      render(<StickyFilterBar {...defaultProps} currentSort="new" />);
      
      const newButton = screen.getByRole('button', { name: /Sort by New/ });
      expect(newButton).toHaveClass('ce-filter-option-active');
      expect(newButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Sort Option Interactions', () => {
    it('calls onSortChange when different sort option is clicked', () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      const topButton = screen.getByRole('button', { name: /Sort by Top/ });
      fireEvent.click(topButton);
      
      expect(mockOnSortChange).toHaveBeenCalledWith('top');
    });

    it('does not call onSortChange when current sort option is clicked', () => {
      render(<StickyFilterBar {...defaultProps} currentSort="hot" />);
      
      const hotButton = screen.getByRole('button', { name: /Sort by Hot/ });
      fireEvent.click(hotButton);
      
      expect(mockOnSortChange).not.toHaveBeenCalled();
    });

    it('shows correct icons for each sort option', () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      const expectedIcons = {
        'Hot': '🔥',
        'New': '🆕',
        'Top': '⭐',
        'Rising': '📈',
        'Most Tipped': '💰',
        'Controversial': '⚡',
        'Trending': '🚀'
      };

      Object.entries(expectedIcons).forEach(([label, icon]) => {
        const button = screen.getByRole('button', { name: new RegExp(`Sort by ${label}`) });
        expect(button).toContainHTML(icon);
      });
    });
  });

  describe('Sticky Behavior', () => {
    it('becomes sticky when scrolled past threshold', async () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      const filterBar = screen.getByText('Sort by:').closest('.ce-sticky-filter-bar');
      expect(filterBar).not.toHaveClass('fixed');
      
      // Simulate scroll
      Object.defineProperty(window, 'pageYOffset', { value: 150, writable: true });
      fireEvent.scroll(window);
      
      await waitFor(() => {
        expect(filterBar).toHaveClass('fixed');
      });
    });

    it('removes sticky class when scrolled back to top', async () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      // First scroll down
      Object.defineProperty(window, 'pageYOffset', { value: 150, writable: true });
      fireEvent.scroll(window);
      
      const filterBar = screen.getByText('Sort by:').closest('.ce-sticky-filter-bar');
      await waitFor(() => {
        expect(filterBar).toHaveClass('fixed');
      });
      
      // Then scroll back up
      Object.defineProperty(window, 'pageYOffset', { value: 50, writable: true });
      fireEvent.scroll(window);
      
      await waitFor(() => {
        expect(filterBar).not.toHaveClass('fixed');
      });
    });

    it('announces sticky state changes to screen readers', async () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      const announcement = screen.getByText('Filter bar is in normal position');
      expect(announcement).toBeInTheDocument();
      
      // Simulate scroll to make sticky
      Object.defineProperty(window, 'pageYOffset', { value: 150, writable: true });
      fireEvent.scroll(window);
      
      await waitFor(() => {
        expect(screen.getByText('Filter bar is now sticky at top of page')).toBeInTheDocument();
      });
    });
  });

  describe('New Content Indicator', () => {
    it('shows new content indicator when hasNewContent is true', () => {
      render(<StickyFilterBar {...defaultProps} hasNewContent={true} />);
      
      expect(screen.getByLabelText('New content available, click to refresh')).toBeInTheDocument();
      expect(screen.getByText('New posts')).toBeInTheDocument();
    });

    it('does not show new content indicator when hasNewContent is false', () => {
      render(<StickyFilterBar {...defaultProps} hasNewContent={false} />);
      
      expect(screen.queryByLabelText('New content available, click to refresh')).not.toBeInTheDocument();
    });

    it('calls onRefresh when new content indicator is clicked', () => {
      render(<StickyFilterBar {...defaultProps} hasNewContent={true} onRefresh={mockOnRefresh} />);
      
      const newContentButton = screen.getByLabelText('New content available, click to refresh');
      fireEvent.click(newContentButton);
      
      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('hides new content indicator after refresh', () => {
      render(<StickyFilterBar {...defaultProps} hasNewContent={true} onRefresh={mockOnRefresh} />);
      
      const newContentButton = screen.getByLabelText('New content available, click to refresh');
      fireEvent.click(newContentButton);
      
      expect(screen.queryByLabelText('New content available, click to refresh')).not.toBeInTheDocument();
    });

    it('hides new content indicator when sort changes', () => {
      render(<StickyFilterBar {...defaultProps} hasNewContent={true} />);
      
      expect(screen.getByLabelText('New content available, click to refresh')).toBeInTheDocument();
      
      const topButton = screen.getByRole('button', { name: /Sort by Top/ });
      fireEvent.click(topButton);
      
      expect(screen.queryByLabelText('New content available, click to refresh')).not.toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('calls onRefresh when refresh button is clicked', () => {
      render(<StickyFilterBar {...defaultProps} onRefresh={mockOnRefresh} />);
      
      const refreshButton = screen.getByLabelText('Refresh content');
      fireEvent.click(refreshButton);
      
      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('disables refresh button when loading', () => {
      render(<StickyFilterBar {...defaultProps} onRefresh={mockOnRefresh} isLoading={true} />);
      
      const refreshButton = screen.getByLabelText('Refresh content');
      expect(refreshButton).toBeDisabled();
    });

    it('shows loading indicator when isLoading is true', () => {
      render(<StickyFilterBar {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows spinning icon when loading', () => {
      render(<StickyFilterBar {...defaultProps} isLoading={true} />);
      
      const refreshButton = screen.getByLabelText('Refresh content');
      const icon = refreshButton.querySelector('svg');
      expect(icon).toHaveClass('animate-spin');
    });
  });

  describe('Responsive Design', () => {
    it('shows short labels on mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      
      render(<StickyFilterBar {...defaultProps} />);
      
      // Check that short labels are present (they're hidden by CSS on larger screens)
      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('Tipped')).toBeInTheDocument();
      expect(screen.getByText('Debate')).toBeInTheDocument();
      expect(screen.getByText('Trend')).toBeInTheDocument();
    });

    it('shows full labels on desktop screens', () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      expect(screen.getByText('Most Tipped')).toBeInTheDocument();
      expect(screen.getByText('Controversial')).toBeInTheDocument();
      expect(screen.getByText('Trending')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for sort buttons', () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      const hotButton = screen.getByRole('button', { name: /Sort by Hot: Posts with high engagement/ });
      expect(hotButton).toBeInTheDocument();
    });

    it('has proper ARIA pressed states', () => {
      render(<StickyFilterBar {...defaultProps} currentSort="rising" />);
      
      const risingButton = screen.getByRole('button', { name: /Sort by Rising/ });
      const hotButton = screen.getByRole('button', { name: /Sort by Hot/ });
      
      expect(risingButton).toHaveAttribute('aria-pressed', 'true');
      expect(hotButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('has aria-hidden on decorative icons', () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const icons = button.querySelectorAll('[aria-hidden="true"]');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it('has live region for sticky state announcements', () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      const liveRegion = screen.getByText('Filter bar is in normal position').closest('[aria-live]');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('supports keyboard navigation', () => {
      render(<StickyFilterBar {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<StickyFilterBar {...defaultProps} className="custom-class" />);
      
      const filterBar = screen.getByText('Sort by:').closest('.ce-sticky-filter-bar');
      expect(filterBar).toHaveClass('custom-class');
    });

    it('handles missing onRefresh prop gracefully', () => {
      render(<StickyFilterBar {...defaultProps} hasNewContent={true} />);
      
      const newContentButton = screen.getByLabelText('New content available, click to refresh');
      expect(() => fireEvent.click(newContentButton)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('memoizes component correctly', () => {
      const { rerender } = render(<StickyFilterBar {...defaultProps} />);
      const firstRender = screen.getByText('Sort by:');
      
      // Re-render with same props
      rerender(<StickyFilterBar {...defaultProps} />);
      const secondRender = screen.getByText('Sort by:');
      
      expect(firstRender).toBe(secondRender);
    });

    it('cleans up scroll event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<StickyFilterBar {...defaultProps} />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
  });
});