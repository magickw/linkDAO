import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupportDocuments } from '../SupportDocuments';
import { mockDocuments, mockCategories } from './mocks/documentMocks';

// Mock the document service
jest.mock('../../services/documentService', () => ({
  loadDocuments: jest.fn(() => Promise.resolve(mockDocuments)),
  searchDocuments: jest.fn((query) => 
    Promise.resolve(mockDocuments.filter(doc => 
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      doc.content.toLowerCase().includes(query.toLowerCase())
    ))
  ),
  getDocumentsByCategory: jest.fn((category) =>
    Promise.resolve(mockDocuments.filter(doc => doc.category === category))
  ),
  getDocumentMetadata: jest.fn((id) => 
    Promise.resolve(mockDocuments.find(doc => doc.id === id))
  )
}));

describe('SupportDocuments Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Document Loading and Rendering', () => {
    test('loads and displays documents on mount', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
        expect(screen.getByText('Troubleshooting Guide')).toBeInTheDocument();
      });
    });

    test('displays document metadata correctly', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        // Check for difficulty indicators
        expect(screen.getByText('Beginner')).toBeInTheDocument();
        expect(screen.getByText('Intermediate')).toBeInTheDocument();
        
        // Check for read time estimates
        expect(screen.getByText('15 min read')).toBeInTheDocument();
        expect(screen.getByText('8 min read')).toBeInTheDocument();
        
        // Check for last updated dates
        expect(screen.getByText(/Updated:/)).toBeInTheDocument();
      });
    });

    test('handles loading states properly', () => {
      render(<SupportDocuments />);
      
      // Should show loading skeleton initially
      expect(screen.getByTestId('documents-loading')).toBeInTheDocument();
    });

    test('handles error states gracefully', async () => {
      const mockError = new Error('Failed to load documents');
      jest.mocked(require('../../services/documentService').loadDocuments)
        .mockRejectedValueOnce(mockError);
      
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error loading documents/)).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    test('performs search with debouncing', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search documentation...')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search documentation...');
      
      // Type search query
      await user.type(searchInput, 'wallet setup');
      
      // Wait for debounced search
      await waitFor(() => {
        expect(require('../../services/documentService').searchDocuments)
          .toHaveBeenCalledWith('wallet setup');
      }, { timeout: 1000 });
    });

    test('displays search results correctly', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search documentation...')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search documentation...');
      await user.type(searchInput, 'security');
      
      await waitFor(() => {
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
        expect(screen.queryByText('Beginner\'s Guide to LDAO')).not.toBeInTheDocument();
      });
    });

    test('shows no results message when search returns empty', async () => {
      jest.mocked(require('../../services/documentService').searchDocuments)
        .mockResolvedValueOnce([]);
      
      const user = userEvent.setup();
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search documentation...')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search documentation...');
      await user.type(searchInput, 'nonexistent');
      
      await waitFor(() => {
        expect(screen.getByText(/No documents found/)).toBeInTheDocument();
        expect(screen.getByText(/Try different keywords/)).toBeInTheDocument();
      });
    });

    test('clears search results when input is cleared', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search documentation...')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search documentation...');
      
      // Search first
      await user.type(searchInput, 'security');
      await waitFor(() => {
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
      });
      
      // Clear search
      await user.clear(searchInput);
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
        expect(screen.getByText('Troubleshooting Guide')).toBeInTheDocument();
      });
    });
  });

  describe('Category Filtering', () => {
    test('filters documents by category', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
      });
      
      // Click on Security category
      fireEvent.click(screen.getByText('Security'));
      
      await waitFor(() => {
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
        expect(screen.queryByText('Beginner\'s Guide to LDAO')).not.toBeInTheDocument();
      });
    });

    test('shows document counts for each category', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Getting Started (2)')).toBeInTheDocument();
        expect(screen.getByText('Security (1)')).toBeInTheDocument();
        expect(screen.getByText('Troubleshooting (1)')).toBeInTheDocument();
      });
    });

    test('allows clearing category filter', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });
      
      // Filter by category
      fireEvent.click(screen.getByText('Security'));
      
      await waitFor(() => {
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
      });
      
      // Clear filter
      fireEvent.click(screen.getByText('All Categories'));
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
      });
    });
  });

  describe('Document Sorting', () => {
    test('sorts documents by popularity', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Sort by')).toBeInTheDocument();
      });
      
      // Click sort dropdown
      fireEvent.click(screen.getByText('Sort by'));
      fireEvent.click(screen.getByText('Most Popular'));
      
      await waitFor(() => {
        const documentTitles = screen.getAllByTestId('document-title');
        expect(documentTitles[0]).toHaveTextContent('Beginner\'s Guide to LDAO');
      });
    });

    test('sorts documents by recency', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Sort by')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Sort by'));
      fireEvent.click(screen.getByText('Most Recent'));
      
      await waitFor(() => {
        const documentTitles = screen.getAllByTestId('document-title');
        expect(documentTitles[0]).toHaveTextContent('Security Best Practices');
      });
    });

    test('sorts documents by difficulty', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Sort by')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Sort by'));
      fireEvent.click(screen.getByText('Difficulty'));
      
      await waitFor(() => {
        const documentTitles = screen.getAllByTestId('document-title');
        expect(documentTitles[0]).toHaveTextContent('Beginner\'s Guide to LDAO');
      });
    });
  });

  describe('Document Interaction', () => {
    test('opens document viewer when document is clicked', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Beginner\'s Guide to LDAO'));
      
      await waitFor(() => {
        expect(screen.getByTestId('document-viewer')).toBeInTheDocument();
      });
    });

    test('tracks document views for analytics', async () => {
      const trackViewSpy = jest.fn();
      jest.mocked(require('../../services/analyticsService').trackDocumentView = trackViewSpy);
      
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Beginner\'s Guide to LDAO'));
      
      expect(trackViewSpy).toHaveBeenCalledWith('beginners-guide');
    });

    test('shows document preview on hover', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });
      
      const documentCard = screen.getByTestId('document-card-beginners-guide');
      fireEvent.mouseEnter(documentCard);
      
      await waitFor(() => {
        expect(screen.getByText(/Learn the basics of LDAO tokens/)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    test('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<SupportDocuments />);
      
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-search')).toBeInTheDocument();
    });

    test('shows desktop layout on larger screens', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      render(<SupportDocuments />);
      
      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-filters')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('provides proper ARIA labels and roles', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByRole('search')).toBeInTheDocument();
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('aria-label', 'Search support documents');
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });
      
      // Tab to first document
      await user.tab();
      await user.tab();
      
      const firstDocument = screen.getByText('Beginner\'s Guide to LDAO');
      expect(firstDocument).toHaveFocus();
      
      // Press Enter to open
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByTestId('document-viewer')).toBeInTheDocument();
      });
    });

    test('provides screen reader announcements', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('4 documents found')).toBeInTheDocument();
      });
      
      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent('4 documents found');
    });
  });

  describe('Performance', () => {
    test('implements lazy loading for document content', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });
      
      // Verify that full content is not loaded initially
      expect(screen.queryByText('Step 1: Setting up your wallet')).not.toBeInTheDocument();
      
      // Click to open document
      fireEvent.click(screen.getByText('Beginner\'s Guide to LDAO'));
      
      await waitFor(() => {
        expect(screen.getByText('Step 1: Setting up your wallet')).toBeInTheDocument();
      });
    });

    test('debounces search input to prevent excessive API calls', async () => {
      const user = userEvent.setup();
      const searchSpy = jest.mocked(require('../../services/documentService').searchDocuments);
      
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search documentation...')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search documentation...');
      
      // Type rapidly
      await user.type(searchInput, 'test');
      
      // Should only call search once after debounce
      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });
});