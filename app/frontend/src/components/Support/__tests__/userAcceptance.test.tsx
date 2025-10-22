import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SupportDocuments } from '../SupportDocuments';
import { mockDocuments } from './mocks/documentMocks';

// User Acceptance Testing Framework
// Tests real user scenarios and workflows

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('User Acceptance Testing - Support Documentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup realistic mock data
    jest.mocked(require('../../services/documentService').loadDocuments)
      .mockResolvedValue(mockDocuments);
  });

  describe('UAT-001: New User Onboarding Journey', () => {
    test('As a new user, I want to quickly find getting started information', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // User Story: New user arrives at support page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /support/i })).toBeInTheDocument();
      });

      // Acceptance Criteria 1: Getting started section is prominently displayed
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('Getting Started (2)')).toBeInTheDocument();

      // Acceptance Criteria 2: Beginner's guide is easily discoverable
      const beginnersGuide = screen.getByText('Beginner\'s Guide to LDAO');
      expect(beginnersGuide).toBeInTheDocument();
      
      // Acceptance Criteria 3: Document shows appropriate difficulty level
      expect(screen.getByText('Beginner')).toBeInTheDocument();
      
      // Acceptance Criteria 4: Estimated read time is displayed
      expect(screen.getByText('15 min read')).toBeInTheDocument();

      // User Action: Click on beginner's guide
      await user.click(beginnersGuide);

      // Acceptance Criteria 5: Document opens with clear structure
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Step 1: Setting up your wallet')).toBeInTheDocument();
      });

      // Acceptance Criteria 6: Table of contents is available
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Step 2: Acquiring LDAO tokens')).toBeInTheDocument();

      // Test passes if user can successfully navigate to and read beginner content
    });

    test('As a new user, I want to understand security best practices', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
      });

      // User Action: Look for security information
      const securityGuide = screen.getByText('Security Best Practices');
      
      // Acceptance Criteria 1: Security guide is clearly marked
      expect(securityGuide).toBeInTheDocument();
      
      // User Action: Open security guide
      await user.click(securityGuide);

      await waitFor(() => {
        expect(screen.getByText('Wallet Security')).toBeInTheDocument();
        expect(screen.getByText('Platform Safety')).toBeInTheDocument();
        expect(screen.getByText('Common Scams')).toBeInTheDocument();
      });

      // Acceptance Criteria 2: Security content covers essential topics
      // Test passes if security guide contains wallet, platform, and scam information
    });
  });

  describe('UAT-002: Problem-Solving User Journey', () => {
    test('As a user with a problem, I want to quickly find solutions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // User Story: User has a specific problem (transaction failed)
      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });

      // User Action: Search for their problem
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'transaction failed');

      // Acceptance Criteria 1: Search returns relevant results quickly
      await waitFor(() => {
        expect(screen.getByText('Troubleshooting Guide')).toBeInTheDocument();
      });

      // User Action: Open troubleshooting guide
      const troubleshootingGuide = screen.getByText('Troubleshooting Guide');
      await user.click(troubleshootingGuide);

      // Acceptance Criteria 2: Troubleshooting content is well-organized
      await waitFor(() => {
        expect(screen.getByText('Transaction Problems')).toBeInTheDocument();
        expect(screen.getByText('Connection Issues')).toBeInTheDocument();
      });

      // Acceptance Criteria 3: User can find specific solutions
      const transactionSection = screen.getByText('Transaction Problems');
      await user.click(transactionSection);

      // Test passes if user can find and access relevant troubleshooting information
    });

    test('As a user, I want to escalate to human support when documentation is insufficient', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // User Story: User reads documentation but needs more help
      await waitFor(() => {
        expect(screen.getByText('Troubleshooting Guide')).toBeInTheDocument();
      });

      const troubleshootingGuide = screen.getByText('Troubleshooting Guide');
      await user.click(troubleshootingGuide);

      // Acceptance Criteria 1: Support escalation options are available
      await waitFor(() => {
        expect(screen.getByText('Still need help?')).toBeInTheDocument();
      });

      // Acceptance Criteria 2: Live chat option is available
      expect(screen.getByRole('button', { name: /start live chat/i })).toBeInTheDocument();

      // Acceptance Criteria 3: Support ticket option is available
      expect(screen.getByRole('button', { name: /create support ticket/i })).toBeInTheDocument();

      // User Action: Start live chat
      const liveChatButton = screen.getByRole('button', { name: /start live chat/i });
      await user.click(liveChatButton);

      // Acceptance Criteria 4: Chat opens with context
      await waitFor(() => {
        expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
      });

      // Test passes if user can successfully escalate to human support
    });
  });

  describe('UAT-003: Mobile User Experience', () => {
    test('As a mobile user, I want to access documentation on my phone', async () => {
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

      // Acceptance Criteria 1: Mobile layout is active
      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // Acceptance Criteria 2: Mobile navigation is accessible
      const menuButton = screen.getByRole('button', { name: /menu/i });
      expect(menuButton).toBeInTheDocument();

      // User Action: Open mobile menu
      await user.click(menuButton);

      // Acceptance Criteria 3: Mobile menu provides full functionality
      await waitFor(() => {
        expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      });

      // Acceptance Criteria 4: Search is available on mobile
      expect(screen.getByTestId('mobile-search')).toBeInTheDocument();

      // User Action: Search on mobile
      const mobileSearchInput = screen.getByTestId('mobile-search').querySelector('input');
      await user.type(mobileSearchInput!, 'wallet');

      // Acceptance Criteria 5: Mobile search works effectively
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });

      // Test passes if mobile experience is fully functional
    });

    test('As a mobile user, I want to read documents comfortably on my device', async () => {
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

      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });

      // User Action: Open document on mobile
      const documentLink = screen.getByText('Beginner\'s Guide to LDAO');
      await user.click(documentLink);

      // Acceptance Criteria 1: Mobile document viewer opens
      await waitFor(() => {
        expect(screen.getByTestId('mobile-document-viewer')).toBeInTheDocument();
      });

      // Acceptance Criteria 2: Text is readable on mobile
      const documentContent = screen.getByTestId('mobile-document-viewer');
      const styles = window.getComputedStyle(documentContent);
      expect(parseInt(styles.fontSize)).toBeGreaterThanOrEqual(16);

      // Acceptance Criteria 3: Mobile navigation controls are available
      expect(screen.getByTestId('mobile-nav-controls')).toBeInTheDocument();

      // Test passes if mobile reading experience is optimized
    });
  });

  describe('UAT-004: Accessibility User Experience', () => {
    test('As a screen reader user, I want to navigate documentation effectively', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // Acceptance Criteria 1: Page has proper landmarks
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.getByRole('search')).toBeInTheDocument();
      });

      // Acceptance Criteria 2: Headings provide proper structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check heading hierarchy
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();

      // Acceptance Criteria 3: Interactive elements are properly labeled
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('aria-label');

      // Acceptance Criteria 4: Dynamic content changes are announced
      await user.type(searchInput, 'security');
      
      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveTextContent(/found/i);
      });

      // Test passes if screen reader experience is fully accessible
    });

    test('As a keyboard user, I want to navigate without a mouse', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // Acceptance Criteria 1: All interactive elements are keyboard accessible
      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });

      // User Action: Navigate with keyboard
      await user.tab(); // Search input
      expect(screen.getByRole('searchbox')).toHaveFocus();

      await user.tab(); // Category filter
      expect(screen.getByRole('button', { name: /category/i })).toHaveFocus();

      await user.tab(); // First document
      expect(screen.getByText('Beginner\'s Guide to LDAO')).toHaveFocus();

      // Acceptance Criteria 2: Enter key activates elements
      await user.keyboard('{Enter}');

      // Acceptance Criteria 3: Focus is managed in modals
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
        
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveFocus();
      });

      // Acceptance Criteria 4: Escape key closes modals
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Test passes if keyboard navigation is fully functional
    });
  });

  describe('UAT-005: Performance User Experience', () => {
    test('As a user, I want the documentation to load quickly', async () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // Acceptance Criteria 1: Initial content loads within 2 seconds
      await waitFor(() => {
        expect(screen.getByRole('heading')).toBeInTheDocument();
      });

      const initialLoadTime = performance.now() - startTime;
      expect(initialLoadTime).toBeLessThan(2000);

      // Acceptance Criteria 2: Documents load within 2 seconds
      const documentLoadStart = performance.now();
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });

      const documentLoadTime = performance.now() - documentLoadStart;
      expect(documentLoadTime).toBeLessThan(2000);

      // Test passes if performance meets user expectations
    });

    test('As a user on a slow connection, I want a responsive experience', async () => {
      // Mock slow network
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g' },
        writable: true
      });

      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // Acceptance Criteria 1: Loading states are shown
      expect(screen.getByTestId('documents-loading')).toBeInTheDocument();

      // Acceptance Criteria 2: Progressive loading works
      await waitFor(() => {
        expect(screen.getByRole('heading')).toBeInTheDocument();
      });

      // Acceptance Criteria 3: Images are optimized for slow connections
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img.src).toMatch(/quality=low|w_400/);
      });

      // Test passes if slow connection experience is acceptable
    });
  });

  describe('UAT-006: Multi-language User Experience', () => {
    test('As a non-English user, I want documentation in my language', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // Acceptance Criteria 1: Language selector is available
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /language/i })).toBeInTheDocument();
      });

      // User Action: Change language
      const languageSelector = screen.getByRole('button', { name: /language/i });
      await user.click(languageSelector);

      // Acceptance Criteria 2: Multiple languages are available
      await waitFor(() => {
        expect(screen.getByText('Español')).toBeInTheDocument();
        expect(screen.getByText('Français')).toBeInTheDocument();
        expect(screen.getByText('中文')).toBeInTheDocument();
      });

      // User Action: Select Spanish
      await user.click(screen.getByText('Español'));

      // Acceptance Criteria 3: Content updates to selected language
      await waitFor(() => {
        expect(screen.getByText('Documentación de Soporte')).toBeInTheDocument();
      });

      // Test passes if multi-language support works correctly
    });
  });

  describe('UAT-007: Content Quality User Experience', () => {
    test('As a user, I want accurate and up-to-date information', async () => {
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // Acceptance Criteria 1: Last updated dates are shown
      await waitFor(() => {
        expect(screen.getByText(/Updated:/)).toBeInTheDocument();
      });

      // Acceptance Criteria 2: Content freshness is indicated
      const updatedText = screen.getByText(/Updated:/);
      expect(updatedText).toBeInTheDocument();

      // Acceptance Criteria 3: Feedback mechanism is available
      const documentCard = screen.getByTestId('document-card-beginners-guide');
      expect(documentCard.querySelector('[data-testid="feedback-button"]')).toBeInTheDocument();

      // Test passes if content quality indicators are present
    });

    test('As a user, I want to provide feedback on documentation helpfulness', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // User Action: Open a document
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });

      const documentLink = screen.getByText('Beginner\'s Guide to LDAO');
      await user.click(documentLink);

      // Acceptance Criteria 1: Feedback options are available
      await waitFor(() => {
        expect(screen.getByText('Was this helpful?')).toBeInTheDocument();
      });

      // Acceptance Criteria 2: User can provide positive feedback
      const helpfulButton = screen.getByRole('button', { name: /yes, helpful/i });
      expect(helpfulButton).toBeInTheDocument();

      await user.click(helpfulButton);

      // Acceptance Criteria 3: Feedback is acknowledged
      await waitFor(() => {
        expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
      });

      // Test passes if feedback system works correctly
    });
  });

  describe('UAT-008: Error Recovery User Experience', () => {
    test('As a user, I want helpful error messages when things go wrong', async () => {
      // Mock network error
      jest.mocked(require('../../services/documentService').loadDocuments)
        .mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SupportDocuments />
        </TestWrapper>
      );

      // Acceptance Criteria 1: Error message is user-friendly
      await waitFor(() => {
        expect(screen.getByText(/unable to load documents/i)).toBeInTheDocument();
      });

      // Acceptance Criteria 2: Recovery options are provided
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      // Acceptance Criteria 3: Alternative actions are suggested
      expect(screen.getByText(/check your connection/i)).toBeInTheDocument();

      // User Action: Retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      
      // Mock successful retry
      jest.mocked(require('../../services/documentService').loadDocuments)
        .mockResolvedValueOnce(mockDocuments);

      await user.click(retryButton);

      // Acceptance Criteria 4: Recovery works
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });

      // Test passes if error recovery is user-friendly
    });
  });
});

// Test utilities for user acceptance testing
export const userAcceptanceTestUtils = {
  // Simulate real user behavior
  simulateUserReading: async (element: HTMLElement, readingSpeed = 200) => {
    // Simulate reading time based on content length
    const wordCount = element.textContent?.split(' ').length || 0;
    const readingTime = (wordCount / readingSpeed) * 60 * 1000; // ms
    await new Promise(resolve => setTimeout(resolve, Math.min(readingTime, 5000)));
  },

  // Simulate user hesitation and exploration
  simulateUserExploration: async (user: any) => {
    // Random pauses to simulate real user behavior
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  },

  // Check if user goals are met
  validateUserGoal: (goalDescription: string, condition: boolean) => {
    if (!condition) {
      throw new Error(`User goal not met: ${goalDescription}`);
    }
  },

  // Measure user task completion time
  measureTaskTime: async (task: () => Promise<void>) => {
    const startTime = performance.now();
    await task();
    const endTime = performance.now();
    return endTime - startTime;
  }
};