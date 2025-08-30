/**
 * GlassmorphicNavbar Component Tests
 * Tests for the glassmorphic navigation bar functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/router';
import { GlassmorphicNavbar } from '../GlassmorphicNavbar';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockRouter = {
  pathname: '/',
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

describe('GlassmorphicNavbar', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the navbar with logo and navigation items', () => {
    render(<GlassmorphicNavbar />);
    
    // Check for logo
    expect(screen.getByText('Web3 Marketplace')).toBeInTheDocument();
    
    // Check for navigation items
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('NFTs')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('renders search bar component', () => {
    render(<GlassmorphicNavbar />);
    
    // Search bar should be present (mocked component)
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
  });

  it('renders currency toggle component', () => {
    render(<GlassmorphicNavbar />);
    
    // Currency toggle should be present (mocked component)
    expect(screen.getByTestId('currency-toggle')).toBeInTheDocument();
  });

  it('renders wallet connect button', () => {
    render(<GlassmorphicNavbar />);
    
    // Wallet connect button should be present (mocked component) - there are two instances (desktop and mobile)
    expect(screen.getAllByTestId('wallet-connect-button')).toHaveLength(2);
  });

  it('toggles mobile menu when hamburger button is clicked', () => {
    render(<GlassmorphicNavbar />);
    
    // Find mobile menu button by its SVG content
    const mobileMenuButton = screen.getByRole('button');
    
    // Mobile menu should not be visible initially
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
    
    // Click to open mobile menu
    fireEvent.click(mobileMenuButton);
    
    // Mobile menu should now be visible
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
    
    // Click again to close
    fireEvent.click(mobileMenuButton);
    
    // Mobile menu should be hidden again
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
  });

  it('highlights active navigation item based on current route', () => {
    // Set current route to marketplace
    mockRouter.pathname = '/marketplace';
    
    render(<GlassmorphicNavbar />);
    
    const marketplaceLink = screen.getByText('Marketplace').closest('div');
    expect(marketplaceLink).toHaveClass('bg-white/20', 'text-white');
  });

  it('renders language selector with options', () => {
    render(<GlassmorphicNavbar />);
    
    const languageSelector = screen.getByDisplayValue('🇺🇸 EN');
    expect(languageSelector).toBeInTheDocument();
    
    // Check for language options
    fireEvent.click(languageSelector);
    expect(screen.getByText('🇪🇸 ES')).toBeInTheDocument();
    expect(screen.getByText('🇫🇷 FR')).toBeInTheDocument();
    expect(screen.getByText('🇩🇪 DE')).toBeInTheDocument();
  });

  it('applies glassmorphic styling correctly', () => {
    const { container } = render(<GlassmorphicNavbar />);
    
    const navbar = container.firstChild as HTMLElement;
    expect(navbar).toHaveClass('sticky', 'top-0', 'z-50');
  });
});

// Mock child components for testing
jest.mock('../SearchBar', () => ({
  SearchBar: () => <div data-testid="search-bar">Search Bar</div>,
}));

jest.mock('../CurrencyToggle', () => ({
  CurrencyToggle: () => <div data-testid="currency-toggle">Currency Toggle</div>,
}));

jest.mock('@/components/Auth/WalletConnectButton', () => ({
  WalletConnectButton: () => <div data-testid="wallet-connect-button">Wallet Connect</div>,
}));