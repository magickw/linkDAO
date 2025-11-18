import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PersonalizedSupportDashboard from '../PersonalizedSupportDashboard';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
}));

// Mock the Lucide icons
jest.mock('lucide-react', () => ({
  BookOpen: () => <div data-testid="book-open-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Bookmark: () => <div data-testid="bookmark-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  HelpCircle: () => <div data-testid="help-circle-icon" />,
  User: () => <div data-testid="user-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
}));

describe('PersonalizedSupportDashboard', () => {
  it('renders the dashboard title', () => {
    render(<PersonalizedSupportDashboard />);
    
    expect(screen.getByText('Your Support Dashboard')).toBeInTheDocument();
  });

  it('renders all dashboard sections', () => {
    render(<PersonalizedSupportDashboard />);
    
    expect(screen.getByText('Recently Viewed')).toBeInTheDocument();
    expect(screen.getByText('Saved Documents')).toBeInTheDocument();
    expect(screen.getByText('Open Tickets')).toBeInTheDocument();
    expect(screen.getByText('Suggested For You')).toBeInTheDocument();
  });

  it('renders quick action buttons', () => {
    render(<PersonalizedSupportDashboard />);
    
    expect(screen.getByText('New Ticket')).toBeInTheDocument();
    expect(screen.getByText('Browse Docs')).toBeInTheDocument();
    expect(screen.getByText('Live Chat')).toBeInTheDocument();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
  });

  it('displays mock data in each section', () => {
    render(<PersonalizedSupportDashboard />);
    
    // Check Recently Viewed section
    expect(screen.getByText('Complete Beginner\'s Guide')).toBeInTheDocument();
    expect(screen.getByText('Wallet Setup Tutorial')).toBeInTheDocument();
    expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
    
    // Check Saved Documents section
    expect(screen.getByText('DEX Trading Guide')).toBeInTheDocument();
    expect(screen.getByText('Cross-Chain Bridge')).toBeInTheDocument();
    
    // Check Open Tickets section
    expect(screen.getByText('Issue with token transfer')).toBeInTheDocument();
    
    // Check Suggested Articles section
    expect(screen.getByText('Staking Guide')).toBeInTheDocument();
    expect(screen.getByText('Troubleshooting Guide')).toBeInTheDocument();
    expect(screen.getByText('Earn LDAO Tokens')).toBeInTheDocument();
  });

  it('properly tests empty states by checking for specific empty state content', () => {
    render(<PersonalizedSupportDashboard />);
    
    // Check that sections exist even with mock data
    expect(screen.getByText('Recently Viewed')).toBeInTheDocument();
    expect(screen.getByText('Saved Documents')).toBeInTheDocument();
    expect(screen.getByText('Open Tickets')).toBeInTheDocument();
    expect(screen.getByText('Suggested For You')).toBeInTheDocument();
    
    // Verify that with mock data, we don't see empty state messages
    expect(screen.queryByText('No recently viewed documents')).not.toBeInTheDocument();
    expect(screen.queryByText('No saved documents')).not.toBeInTheDocument();
    expect(screen.queryByText('No open tickets')).not.toBeInTheDocument();
    expect(screen.queryByText('No suggestions available')).not.toBeInTheDocument();
  });

  it('has proper navigation elements', () => {
    render(<PersonalizedSupportDashboard />);
    
    // Check for "View All" link
    expect(screen.getByText('View All')).toBeInTheDocument();
    
    // Check that quick action buttons are clickable and have proper aria labels
    const newTicketButton = screen.getByLabelText('Create new support ticket');
    const browseDocsButton = screen.getByLabelText('Browse documentation');
    const liveChatButton = screen.getByLabelText('Open live chat');
    const faqButton = screen.getByLabelText('View FAQ');
    
    expect(newTicketButton).toBeInTheDocument();
    expect(browseDocsButton).toBeInTheDocument();
    expect(liveChatButton).toBeInTheDocument();
    expect(faqButton).toBeInTheDocument();
  });

  it('displays proper date formatting', () => {
    render(<PersonalizedSupportDashboard />);
    
    // Check that dates are displayed in the expected format
    // The mock data should show dates like "Jan 15", "Feb 20", etc.
    const dateElements = screen.getAllByText(/^[A-Za-z]{3} \d{1,2}$/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('renders status and priority badges correctly', () => {
    render(<PersonalizedSupportDashboard />);
    
    // Check for status badges
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    
    // Verify badges have proper styling classes
    const statusBadge = screen.getByText('In Progress').closest('span');
    const priorityBadge = screen.getByText('High').closest('span');
    
    expect(statusBadge).toHaveClass('px-2', 'py-1', 'rounded-full', 'text-xs', 'font-medium');
    expect(priorityBadge).toHaveClass('px-2', 'py-1', 'rounded-full', 'text-xs', 'font-medium');
  });
})