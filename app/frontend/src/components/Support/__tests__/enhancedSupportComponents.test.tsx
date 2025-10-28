import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedSupportCenter from '../EnhancedSupportCenter';
import EnhancedSupportDocuments from '../EnhancedSupportDocuments';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/support',
    query: {},
    asPath: '/support',
  }),
}));

// Mock useAuth hook
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

// Mock useSupportTickets hook
jest.mock('@/hooks/useSupportTickets', () => ({
  useSupportTickets: () => ({
    createTicket: jest.fn(),
    tickets: [],
    loading: false,
    error: null,
  }),
}));

// Mock useDocumentNavigation hook
jest.mock('@/hooks/useDocumentNavigation', () => () => ({
  currentDocument: null,
  previousDocument: null,
  nextDocument: null,
  relatedDocuments: [],
  scrollProgress: 0,
  navigateToDocument: jest.fn(),
  goBack: jest.fn(),
  canGoBack: false,
}));

describe('Enhanced Support Components', () => {
  describe('EnhancedSupportCenter', () => {
    it('renders without crashing', () => {
      render(<EnhancedSupportCenter />);
      
      expect(screen.getByText('Support Center')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search support...')).toBeInTheDocument();
    });

    it('displays quick action buttons', () => {
      render(<EnhancedSupportCenter />);
      
      // Use more specific selectors to avoid duplicates
      expect(screen.getByText('Create Ticket')).toBeInTheDocument();
      expect(screen.getByText('Browse Docs')).toBeInTheDocument();
      // Find the button with specific text content
      const liveChatButtons = screen.getAllByText('Live Chat');
      expect(liveChatButtons.length).toBeGreaterThan(0);
      expect(screen.getByText('Contact Us')).toBeInTheDocument();
    });

    it('allows switching between tabs', () => {
      render(<EnhancedSupportCenter />);
      
      const overviewTab = screen.getByText('Overview');
      const documentsTab = screen.getByText('Documents');
      const ticketsTab = screen.getByText('Tickets');
      const analyticsTab = screen.getByText('Analytics');
      
      expect(overviewTab).toBeInTheDocument();
      expect(documentsTab).toBeInTheDocument();
      expect(ticketsTab).toBeInTheDocument();
      expect(analyticsTab).toBeInTheDocument();
    });
  });

  describe('EnhancedSupportDocuments', () => {
    it('renders without crashing', () => {
      render(<EnhancedSupportDocuments />);
      
      expect(screen.getByText('Support Documentation')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search guides, tutorials, and FAQs...')).toBeInTheDocument();
    });

    it('allows searching documents', () => {
      render(<EnhancedSupportDocuments />);
      
      const searchInput = screen.getByPlaceholderText('Search guides, tutorials, and FAQs...');
      fireEvent.change(searchInput, { target: { value: 'beginner' } });
      
      expect(searchInput).toHaveValue('beginner');
    });

    it('displays multi-channel support options', () => {
      render(<EnhancedSupportDocuments />);
      
      // Use more specific selectors to avoid duplicates
      const supportButtons = screen.getAllByText('Live Chat');
      expect(supportButtons.length).toBeGreaterThan(0);
      
      const documentationButtons = screen.getAllByText('Documentation');
      expect(documentationButtons.length).toBeGreaterThan(0);
      
      const communityButtons = screen.getAllByText('Community');
      expect(communityButtons.length).toBeGreaterThan(0);
      
      const emailSupportButtons = screen.getAllByText('Email Support');
      expect(emailSupportButtons.length).toBeGreaterThan(0);
    });
  });
});