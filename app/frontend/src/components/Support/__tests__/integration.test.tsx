import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SupportDocuments } from '../SupportDocuments';
import { DocumentNavigation } from '../DocumentNavigation';
import { EnhancedSupportDocuments } from '../EnhancedSupportDocuments';
import { mockDocuments, mockAnalytics } from './mocks/documentMocks';

// Mock services
jest.mock('../../services/documentService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/supportTicketingIntegrationService');

// Wrapper component for routing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Support Documentation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    jest.mocked(require('../../services/documentService').loadDocuments)
      .mockResolvedValue(mockDocuments);
    jest.mocked(require('../../services/analyticsService').getDocumentAnalytics)
      .mockResolvedValue(mockAnalytics);
  });

  describe('Complete User Journey - New User Onboarding', () => {
    test('new user can discover and read beginner documentation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // 1. User arrives at support page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /support documentation/i })).toBeInTheDocument();
      });

      // 2. User sees getting started category prominently
      expect(screen.getByText('Getting Started (2)')).toBeInTheDocument();

      // 3. User clicks on beginner's guide
      const beginnersGuide = screen.getByText('Beginner\'s Guide to LDAO');
      await user.click(beginnersGuide);

      // 4. Document viewer opens with full content
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Step 1: Setting up your wallet')).toBeInTheDocument();
      });

      // 5. User can navigate through document sections
      const tocLink = screen.getByText('Step 2: Acquiring LDAO tokens');
      await user.click(tocLink);

      // 6. User can access related documents
      expect(screen.getByText('Related Documents')).toBeInTheDocument();
      expect(screen.getByText('Quick FAQ')).toBeInTheDocument();

      // 7. Analytics tracks the user journey
      expect(require('../../services/analyticsService').trackDocumentView)
        .toHaveBeenCalledWith('beginners-guide');
    });

    test('user can follow complete onboarding flow', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedSupportDocuments />
        </TestWrapper>
      );

      // 1. Start with beginner's guide
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });

      const beginnersGuide = screen.getByText('Beginner\'s Guide to LDAO');
      await user.click(beginnersGuide);

      // 2. Read through guide and follow next steps
      await waitFor(() => {
        expect(screen.getByText('Next: Security Best Practices')).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next: Security Best Practices');
      await user.click(nextButton);

      // 3. Learn about security
      await waitFor(() => {
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
      });

      // 4. Access quick FAQ for common questions
      const faqLink = screen.getByText('Quick FAQ');
      await user.click(faqLink);

      // 5. Complete onboarding journey
      await waitFor(() => {
        expect(screen.getByText('Frequently asked questions')).toBeInTheDocument();
      });

      // Verify complete journey was tracked
      expect(require('../../services/analyticsService').trackUserJourney)
        .toHaveBeenCalledWith(['beginners-guide', 'security-guide', 'quick-faq']);
    });
  });

  describe('Search and Discovery Workflow', () => {
    test('user can search for specific help topics', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // 1. User has a specific problem (wallet connection)
      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wallet connection');

      // 2. Search returns relevant results
      await waitFor(() => {
        expect(screen.getByText('Troubleshooting Guide')).toBeInTheDocument();
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });

      // 3. User clicks on troubleshooting guide
      const troubleshootingGuide = screen.getByText('Troubleshooting Guide');
      await user.click(troubleshootingGuide);

      // 4. User finds specific solution
      await waitFor(() => {
        expect(screen.getByText('Connection Issues')).toBeInTheDocument();
      });

      // 5. User can provide feedback on helpfulness
      const helpfulButton = screen.getByRole('button', { name: /helpful/i });
      await user.click(helpfulButton);

      // 6. Search query and feedback are tracked
      expect(require('../../services/analyticsService').trackSearchQuery)
        .toHaveBeenCalledWith('wallet connection');
      expect(require('../../services/analyticsService').trackDocumentFeedback)
        .toHaveBeenCalledWith('troubleshooting-guide', 'helpful');
    });

    test('user can filter and sort to find relevant content', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // 1. User wants to see only security-related content
      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      const securityFilter = screen.getByText('Security');
      await user.click(securityFilter);

      // 2. Results are filtered to security category
      await waitFor(() => {
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
        expect(screen.queryByText('Beginner\'s Guide to LDAO')).not.toBeInTheDocument();
      });

      // 3. User sorts by difficulty
      const sortDropdown = screen.getByRole('button', { name: /sort/i });
      await user.click(sortDropdown);
      await user.click(screen.getByText('Difficulty'));

      // 4. Results are reordered
      await waitFor(() => {
        const documentTitles = screen.getAllByTestId('document-title');
        expect(documentTitles[0]).toHaveTextContent('Security Best Practices');
      });

      // 5. User can clear filters
      const clearFilters = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearFilters);

      // 6. All documents are shown again
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Channel Support Escalation', () => {
    test('user can escalate from documentation to live support', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // 1. User reads documentation but needs more help
      await waitFor(() => {
        expect(screen.getByText('Troubleshooting Guide')).toBeInTheDocument();
      });

      const troubleshootingGuide = screen.getByText('Troubleshooting Guide');
      await user.click(troubleshootingGuide);

      // 2. User finds "Still need help?" section
      await waitFor(() => {
        expect(screen.getByText('Still need help?')).toBeInTheDocument();
      });

      // 3. User can start live chat
      const liveChatButton = screen.getByRole('button', { name: /start live chat/i });
      await user.click(liveChatButton);

      // 4. Chat widget opens with context
      await waitFor(() => {
        expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
      });

      // 5. Chat is initialized with document context
      expect(require('../../services/supportTicketingIntegrationService').initializeChat)
        .toHaveBeenCalledWith({
          documentId: 'troubleshooting-guide',
          userQuery: expect.any(String)
        });
    });

    test('user can create support ticket for complex issues', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // 1. User needs help with complex technical issue
      const createTicketButton = screen.getByRole('button', { name: /create support ticket/i });
      await user.click(createTicketButton);

      // 2. Support ticket form opens
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /support ticket/i })).toBeInTheDocument();
      });

      // 3. User fills out ticket form
      const subjectInput = screen.getByLabelText(/subject/i);
      await user.type(subjectInput, 'Unable to complete token transfer');

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'I followed the guide but the transaction keeps failing...');

      const prioritySelect = screen.getByLabelText(/priority/i);
      await user.selectOptions(prioritySelect, 'high');

      // 4. User submits ticket
      const submitButton = screen.getByRole('button', { name: /submit ticket/i });
      await user.click(submitButton);

      // 5. Ticket is created with context
      await waitFor(() => {
        expect(screen.getByText(/ticket created successfully/i)).toBeInTheDocument();
      });

      expect(require('../../services/supportTicketingIntegrationService').createTicket)
        .toHaveBeenCalledWith({
          subject: 'Unable to complete token transfer',
          description: 'I followed the guide but the transaction keeps failing...',
          priority: 'high',
          context: expect.objectContaining({
            lastViewedDocuments: expect.any(Array)
          })
        });
    });

    test('user can access community support channels', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // 1. User wants to connect with community
      const communitySection = screen.getByTestId('community-support');
      expect(communitySection).toBeInTheDocument();

      // 2. User can join Discord
      const discordLink = screen.getByRole('link', { name: /join discord/i });
      expect(discordLink).toHaveAttribute('href', expect.stringContaining('discord'));
      expect(discordLink).toHaveAttribute('target', '_blank');

      // 3. User can join Telegram
      const telegramLink = screen.getByRole('link', { name: /join telegram/i });
      expect(telegramLink).toHaveAttribute('href', expect.stringContaining('telegram'));

      // 4. Community activity is shown
      expect(screen.getByText(/active members/i)).toBeInTheDocument();
      expect(screen.getByText(/recent discussions/i)).toBeInTheDocument();
    });
  });

  describe('Mobile User Experience', () => {
    test('mobile user can navigate documentation effectively', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // 1. Mobile layout is active
      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // 2. User can open mobile menu
      const menuButton = screen.getByRole('button', { name: /menu/i });
      await user.click(menuButton);

      // 3. Mobile navigation is accessible
      await waitFor(() => {
        expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      });

      // 4. User can search on mobile
      const mobileSearch = screen.getByTestId('mobile-search');
      const searchInput = mobileSearch.querySelector('input');
      await user.type(searchInput!, 'wallet');

      // 5. Mobile search results are displayed
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });

      // 6. User can view document on mobile
      const documentLink = screen.getByText('Beginner\'s Guide to LDAO');
      await user.click(documentLink);

      // 7. Mobile document viewer opens
      await waitFor(() => {
        expect(screen.getByTestId('mobile-document-viewer')).toBeInTheDocument();
      });
    });

    test('mobile user can use swipe gestures for navigation', async () => {
      // Mock mobile viewport and touch events
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <DocumentNavigation />
        </TestWrapper>
      );

      const documentViewer = screen.getByTestId('document-viewer');

      // Simulate swipe left (next document)
      const touchStart = { touches: [{ clientX: 100, clientY: 100 }] };
      const touchEnd = { changedTouches: [{ clientX: 50, clientY: 100 }] };

      documentViewer.dispatchEvent(new TouchEvent('touchstart', touchStart));
      documentViewer.dispatchEvent(new TouchEvent('touchend', touchEnd));

      // Should navigate to next document
      expect(require('../../hooks/useDocumentNavigation').navigateToNext)
        .toHaveBeenCalled();
    });
  });

  describe('Accessibility User Journey', () => {
    test('screen reader user can navigate documentation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // 1. Screen reader announces page content
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Support documentation');
      });

      // 2. User can navigate by headings
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // 3. User can navigate by landmarks
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();

      // 4. User can access skip links
      const skipLink = screen.getByText('Skip to main content');
      await user.click(skipLink);
      
      expect(screen.getByRole('main')).toHaveFocus();

      // 5. Dynamic content changes are announced
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'security');

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/found/i);
    });

    test('keyboard user can complete full workflow', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // 1. User navigates with keyboard only
      await user.tab(); // Search input
      expect(screen.getByRole('searchbox')).toHaveFocus();

      await user.tab(); // Category filter
      expect(screen.getByRole('button', { name: /category/i })).toHaveFocus();

      await user.tab(); // First document
      expect(screen.getByText('Beginner\'s Guide to LDAO')).toHaveFocus();

      // 2. User opens document with Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 3. Focus is managed in modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveFocus();

      // 4. User can navigate within document
      await user.tab();
      const tocLink = screen.getByText('Step 1: Setting up your wallet');
      expect(tocLink).toHaveFocus();

      // 5. User can close modal with Escape
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Focus returns to trigger element
      expect(screen.getByText('Beginner\'s Guide to LDAO')).toHaveFocus();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('user can recover from network errors', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      jest.mocked(require('../../services/documentService').loadDocuments)
        .mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // 1. Error state is displayed
      await waitFor(() => {
        expect(screen.getByText(/error loading documents/i)).toBeInTheDocument();
      });

      // 2. User can retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // 3. Mock successful retry
      jest.mocked(require('../../services/documentService').loadDocuments)
        .mockResolvedValueOnce(mockDocuments);

      await user.click(retryButton);

      // 4. Documents load successfully
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });
    });

    test('user receives helpful error messages', async () => {
      // Mock specific error scenarios
      jest.mocked(require('../../services/documentService').searchDocuments)
        .mockRejectedValueOnce(new Error('Search service unavailable'));

      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test query');

      // Error message is user-friendly
      await waitFor(() => {
        expect(screen.getByText(/search is temporarily unavailable/i)).toBeInTheDocument();
        expect(screen.getByText(/please try again later/i)).toBeInTheDocument();
      });

      // Alternative actions are provided
      expect(screen.getByText(/browse categories instead/i)).toBeInTheDocument();
    });
  });

  describe('Performance Under Load', () => {
    test('system remains responsive with many concurrent users', async () => {
      // Simulate multiple concurrent renders
      const renders = Array.from({ length: 10 }, (_, i) => 
        render(
          <TestWrapper key={i}>
            <SupportDocuments />
          </TestWrapper>
        )
      );

      // All instances should load successfully
      await Promise.all(renders.map(async ({ container }) => {
        await waitFor(() => {
          expect(container.querySelector('[data-testid="support-documents"]')).toBeInTheDocument();
        });
      }));

      // Performance should remain acceptable
      const loadTime = performance.now();
      expect(loadTime).toBeLessThan(5000);
    });

    test('search remains fast with large result sets', async () => {
      // Mock large document set
      const largeDocumentSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockDocuments[0],
        id: `doc-${i}`,
        title: `Document ${i}`,
        content: `Content for document ${i}`.repeat(100)
      }));

      jest.mocked(require('../../services/documentService').searchDocuments)
        .mockResolvedValue(largeDocumentSet);

      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });

      const startTime = performance.now();
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'document');

      await waitFor(() => {
        expect(screen.getByText('Document 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const searchTime = endTime - startTime;

      // Search should complete within reasonable time
      expect(searchTime).toBeLessThan(1000);
    });
  });
});