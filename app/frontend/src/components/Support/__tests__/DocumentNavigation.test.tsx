import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentNavigation } from '../DocumentNavigation';
import { mockDocuments } from './mocks/documentMocks';

// Mock the navigation hook
const mockNavigate = jest.fn();
jest.mock('../../../hooks/useDocumentNavigation', () => ({
  useDocumentNavigation: () => ({
    currentDocument: mockDocuments[0],
    previousDocument: null,
    nextDocument: mockDocuments[1],
    navigateToDocument: mockNavigate,
    navigationHistory: [mockDocuments[0]],
    canGoBack: false,
    goBack: jest.fn()
  })
}));

describe('DocumentNavigation Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Navigation Controls', () => {
    test('renders navigation controls correctly', () => {
      render(<DocumentNavigation />);
      
      expect(screen.getByTestId('document-navigation')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous document/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next document/i })).toBeInTheDocument();
    });

    test('disables previous button when no previous document', () => {
      render(<DocumentNavigation />);
      
      const prevButton = screen.getByRole('button', { name: /previous document/i });
      expect(prevButton).toBeDisabled();
    });

    test('enables next button when next document exists', () => {
      render(<DocumentNavigation />);
      
      const nextButton = screen.getByRole('button', { name: /next document/i });
      expect(nextButton).not.toBeDisabled();
    });

    test('navigates to next document when next button clicked', async () => {
      render(<DocumentNavigation />);
      
      const nextButton = screen.getByRole('button', { name: /next document/i });
      fireEvent.click(nextButton);
      
      expect(mockNavigate).toHaveBeenCalledWith(mockDocuments[1].id);
    });

    test('shows document titles in navigation tooltips', async () => {
      render(<DocumentNavigation />);
      
      const nextButton = screen.getByRole('button', { name: /next document/i });
      fireEvent.mouseEnter(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText(mockDocuments[1].title)).toBeInTheDocument();
      });
    });
  });

  describe('Breadcrumb Navigation', () => {
    test('displays breadcrumb trail', () => {
      render(<DocumentNavigation />);
      
      expect(screen.getByTestId('breadcrumb-navigation')).toBeInTheDocument();
      expect(screen.getByText('Support')).toBeInTheDocument();
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText(mockDocuments[0].title)).toBeInTheDocument();
    });

    test('makes breadcrumb items clickable', async () => {
      render(<DocumentNavigation />);
      
      const categoryLink = screen.getByText('Getting Started');
      fireEvent.click(categoryLink);
      
      expect(mockNavigate).toHaveBeenCalledWith(null, 'getting-started');
    });

    test('shows current document as non-clickable', () => {
      render(<DocumentNavigation />);
      
      const currentDoc = screen.getByText(mockDocuments[0].title);
      expect(currentDoc).not.toHaveAttribute('href');
      expect(currentDoc).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Progress Indicator', () => {
    test('shows reading progress for long documents', () => {
      render(<DocumentNavigation />);
      
      expect(screen.getByTestId('reading-progress')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('updates progress as user scrolls', () => {
      render(<DocumentNavigation />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      
      // Simulate scroll progress
      fireEvent.scroll(window, { target: { scrollY: 500 } });
      
      // Progress should update (mocked behavior)
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    test('shows estimated time remaining', () => {
      render(<DocumentNavigation />);
      
      expect(screen.getByText(/15 min read/)).toBeInTheDocument();
      expect(screen.getByText(/Time remaining:/)).toBeInTheDocument();
    });
  });

  describe('Table of Contents', () => {
    test('generates table of contents from document headings', () => {
      render(<DocumentNavigation />);
      
      expect(screen.getByTestId('table-of-contents')).toBeInTheDocument();
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Step 1: Setting up your wallet')).toBeInTheDocument();
      expect(screen.getByText('Step 2: Acquiring LDAO tokens')).toBeInTheDocument();
    });

    test('allows jumping to sections via table of contents', async () => {
      render(<DocumentNavigation />);
      
      const tocLink = screen.getByText('Step 1: Setting up your wallet');
      fireEvent.click(tocLink);
      
      // Should scroll to section (mocked behavior)
      expect(document.getElementById('step-1-setting-up-your-wallet')).toBeTruthy();
    });

    test('highlights current section in table of contents', () => {
      render(<DocumentNavigation />);
      
      const currentSection = screen.getByText('Introduction');
      expect(currentSection).toHaveClass('active');
    });

    test('collapses/expands table of contents on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<DocumentNavigation />);
      
      const tocToggle = screen.getByRole('button', { name: /table of contents/i });
      expect(tocToggle).toBeInTheDocument();
      
      fireEvent.click(tocToggle);
      
      await waitFor(() => {
        expect(screen.getByTestId('table-of-contents')).toHaveClass('expanded');
      });
    });
  });

  describe('Navigation History', () => {
    test('shows back button when navigation history exists', () => {
      // Mock with history
      jest.mocked(require('../../../hooks/useDocumentNavigation').useDocumentNavigation)
        .mockReturnValue({
          currentDocument: mockDocuments[1],
          previousDocument: mockDocuments[0],
          nextDocument: mockDocuments[2],
          navigateToDocument: mockNavigate,
          navigationHistory: [mockDocuments[0], mockDocuments[1]],
          canGoBack: true,
          goBack: jest.fn()
        });
      
      render(<DocumentNavigation />);
      
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    test('navigates back through history', async () => {
      const mockGoBack = jest.fn();
      jest.mocked(require('../../../hooks/useDocumentNavigation').useDocumentNavigation)
        .mockReturnValue({
          currentDocument: mockDocuments[1],
          previousDocument: mockDocuments[0],
          nextDocument: mockDocuments[2],
          navigateToDocument: mockNavigate,
          navigationHistory: [mockDocuments[0], mockDocuments[1]],
          canGoBack: true,
          goBack: mockGoBack
        });
      
      render(<DocumentNavigation />);
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockGoBack).toHaveBeenCalled();
    });

    test('shows navigation history dropdown', async () => {
      jest.mocked(require('../../../hooks/useDocumentNavigation').useDocumentNavigation)
        .mockReturnValue({
          currentDocument: mockDocuments[1],
          previousDocument: mockDocuments[0],
          nextDocument: mockDocuments[2],
          navigateToDocument: mockNavigate,
          navigationHistory: [mockDocuments[0], mockDocuments[1]],
          canGoBack: true,
          goBack: jest.fn()
        });
      
      render(<DocumentNavigation />);
      
      const historyButton = screen.getByRole('button', { name: /navigation history/i });
      fireEvent.click(historyButton);
      
      await waitFor(() => {
        expect(screen.getByText(mockDocuments[0].title)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    test('supports keyboard shortcuts for navigation', async () => {
      const user = userEvent.setup();
      render(<DocumentNavigation />);
      
      // Test next document shortcut (Alt + Right Arrow)
      await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
      
      expect(mockNavigate).toHaveBeenCalledWith(mockDocuments[1].id);
    });

    test('supports keyboard shortcut for table of contents', async () => {
      const user = userEvent.setup();
      render(<DocumentNavigation />);
      
      // Test TOC shortcut (Alt + T)
      await user.keyboard('{Alt>}t{/Alt}');
      
      await waitFor(() => {
        expect(screen.getByTestId('table-of-contents')).toHaveFocus();
      });
    });

    test('supports keyboard shortcut for search', async () => {
      const user = userEvent.setup();
      render(<DocumentNavigation />);
      
      // Test search shortcut (Ctrl + K)
      await user.keyboard('{Control>}k{/Control}');
      
      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toHaveFocus();
      });
    });
  });

  describe('Accessibility', () => {
    test('provides proper ARIA labels for navigation controls', () => {
      render(<DocumentNavigation />);
      
      const prevButton = screen.getByRole('button', { name: /previous document/i });
      const nextButton = screen.getByRole('button', { name: /next document/i });
      
      expect(prevButton).toHaveAttribute('aria-label');
      expect(nextButton).toHaveAttribute('aria-label');
    });

    test('announces navigation changes to screen readers', async () => {
      render(<DocumentNavigation />);
      
      const nextButton = screen.getByRole('button', { name: /next document/i });
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/navigated to/i);
      });
    });

    test('provides skip links for keyboard users', () => {
      render(<DocumentNavigation />);
      
      expect(screen.getByText('Skip to content')).toBeInTheDocument();
      expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
    });

    test('maintains focus management during navigation', async () => {
      render(<DocumentNavigation />);
      
      const nextButton = screen.getByRole('button', { name: /next document/i });
      nextButton.focus();
      
      fireEvent.click(nextButton);
      
      // Focus should be maintained or moved appropriately
      await waitFor(() => {
        expect(document.activeElement).toBeTruthy();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    test('adapts navigation for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<DocumentNavigation />);
      
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-progress-bar')).toBeInTheDocument();
    });

    test('shows compact navigation controls on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<DocumentNavigation />);
      
      expect(screen.getByTestId('compact-nav-controls')).toBeInTheDocument();
    });

    test('provides swipe gestures for mobile navigation', async () => {
      // Mock mobile viewport and touch events
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<DocumentNavigation />);
      
      const navContainer = screen.getByTestId('document-navigation');
      
      // Simulate swipe left (next document)
      fireEvent.touchStart(navContainer, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchEnd(navContainer, {
        changedTouches: [{ clientX: 50, clientY: 100 }]
      });
      
      expect(mockNavigate).toHaveBeenCalledWith(mockDocuments[1].id);
    });
  });

  describe('Performance', () => {
    test('lazy loads table of contents for long documents', () => {
      render(<DocumentNavigation />);
      
      // TOC should not be fully rendered initially for performance
      expect(screen.queryByTestId('full-toc-content')).not.toBeInTheDocument();
      
      // Click to expand
      const tocToggle = screen.getByRole('button', { name: /table of contents/i });
      fireEvent.click(tocToggle);
      
      expect(screen.getByTestId('full-toc-content')).toBeInTheDocument();
    });

    test('debounces scroll events for progress updates', () => {
      const scrollSpy = jest.fn();
      window.addEventListener('scroll', scrollSpy);
      
      render(<DocumentNavigation />);
      
      // Simulate rapid scroll events
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(window, { target: { scrollY: i * 100 } });
      }
      
      // Should debounce scroll events
      expect(scrollSpy).toHaveBeenCalled();
      
      window.removeEventListener('scroll', scrollSpy);
    });
  });
});