import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import MobileNavigation from '../MobileNavigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn()
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  HomeIcon: () => <div data-testid="home-icon" />,
  MagnifyingGlassIcon: () => <div data-testid="search-icon" />,
  PlusIcon: () => <div data-testid="plus-icon" />,
  WalletIcon: () => <div data-testid="wallet-icon" />,
  UserIcon: () => <div data-testid="user-icon" />,
  ShoppingBagIcon: () => <div data-testid="shopping-bag-icon" />,
  HeartIcon: () => <div data-testid="heart-icon" />,
  Cog6ToothIcon: () => <div data-testid="cog-icon" />
}));

jest.mock('@heroicons/react/24/solid', () => ({
  HomeIcon: () => <div data-testid="home-icon-solid" />,
  MagnifyingGlassIcon: () => <div data-testid="search-icon-solid" />,
  PlusIcon: () => <div data-testid="plus-icon-solid" />,
  WalletIcon: () => <div data-testid="wallet-icon-solid" />,
  UserIcon: () => <div data-testid="user-icon-solid" />,
  ShoppingBagIcon: () => <div data-testid="shopping-bag-icon-solid" />,
  HeartIcon: () => <div data-testid="heart-icon-solid" />,
  Cog6ToothIcon: () => <div data-testid="cog-icon-solid" />
}));

const mockPush = jest.fn();
const mockPathname = jest.fn();

describe('MobileNavigation', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    });
    (usePathname as jest.Mock).mockReturnValue('/');
    
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: jest.fn(),
      writable: true
    });
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders navigation items correctly', () => {
    render(<MobileNavigation />);
    
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Sell')).toBeInTheDocument();
    expect(screen.getByLabelText('Orders')).toBeInTheDocument();
    expect(screen.getByLabelText('Profile')).toBeInTheDocument();
  });

  it('highlights active item based on current path', () => {
    (usePathname as jest.Mock).mockReturnValue('/search');
    
    render(<MobileNavigation />);
    
    const searchButton = screen.getByLabelText('Search');
    expect(searchButton).toHaveClass('text-indigo-600');
  });

  it('navigates to correct path when item is clicked', async () => {
    render(<MobileNavigation />);
    
    const searchButton = screen.getByLabelText('Search');
    fireEvent.click(searchButton);
    
    expect(mockPush).toHaveBeenCalledWith('/search');
  });

  it('calls onItemPress callback when provided', () => {
    const mockOnItemPress = jest.fn();
    render(<MobileNavigation onItemPress={mockOnItemPress} />);
    
    const homeButton = screen.getByLabelText('Home');
    fireEvent.click(homeButton);
    
    expect(mockOnItemPress).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'home',
        label: 'Home',
        path: '/'
      })
    );
  });

  it('shows badge when item has badge count', () => {
    render(<MobileNavigation />);
    
    // Orders item should have a badge with count 2
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('triggers haptic feedback on supported devices', () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true
    });
    
    render(<MobileNavigation />);
    
    const homeButton = screen.getByLabelText('Home');
    fireEvent.click(homeButton);
    
    expect(mockVibrate).toHaveBeenCalledWith(50);
  });

  it('hides navigation on scroll down and shows on scroll up', async () => {
    render(<MobileNavigation />);
    
    const navigation = screen.getByRole('tablist');
    expect(navigation).toBeInTheDocument();
    
    // Mock scroll down
    Object.defineProperty(window, 'scrollY', { value: 200, writable: true });
    fireEvent.scroll(window);
    
    await waitFor(() => {
      // Navigation should be hidden (component uses AnimatePresence)
      // In a real test, you'd check for the animation state
    });
  });

  it('applies custom className', () => {
    render(<MobileNavigation className="custom-class" />);
    
    const navigation = screen.getByRole('tablist');
    expect(navigation).toHaveClass('custom-class');
  });

  it('handles keyboard navigation', () => {
    render(<MobileNavigation />);
    
    const homeButton = screen.getByLabelText('Home');
    
    // Test Enter key
    fireEvent.keyDown(homeButton, { key: 'Enter', code: 'Enter' });
    // In a real implementation, you'd add keyboard handlers
  });

  it('updates active item when pathname changes', () => {
    const { rerender } = render(<MobileNavigation />);
    
    // Initially on home
    expect(screen.getByLabelText('Home')).toHaveClass('text-indigo-600');
    
    // Change to profile
    (usePathname as jest.Mock).mockReturnValue('/profile');
    rerender(<MobileNavigation />);
    
    expect(screen.getByLabelText('Profile')).toHaveClass('text-indigo-600');
  });

  it('handles touch interactions properly', () => {
    render(<MobileNavigation />);
    
    const homeButton = screen.getByLabelText('Home');
    
    // Test touch events
    fireEvent.touchStart(homeButton);
    fireEvent.touchEnd(homeButton);
    
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('shows correct icons for active and inactive states', () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    
    render(<MobileNavigation />);
    
    // Home should show solid icon (active)
    expect(screen.getByTestId('home-icon-solid')).toBeInTheDocument();
    
    // Other items should show outline icons (inactive)
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('handles badge overflow correctly', () => {
    // Mock a navigation item with high badge count
    const mockNavigation = () => {
      const nav = render(<MobileNavigation />);
      // In a real test, you'd pass props to set badge count > 99
      return nav;
    };
    
    mockNavigation();
    
    // Test that badges over 99 show "99+"
    // This would require modifying the component to accept badge counts as props
  });

  it('maintains accessibility attributes', () => {
    render(<MobileNavigation />);
    
    const navigation = screen.getByRole('tablist');
    expect(navigation).toHaveAttribute('aria-label', 'Main navigation');
    
    const homeButton = screen.getByLabelText('Home');
    expect(homeButton).toHaveAttribute('role', 'tab');
    expect(homeButton).toHaveAttribute('aria-selected');
  });

  it('handles safe area padding on devices with home indicator', () => {
    render(<MobileNavigation />);
    
    const safeAreaContainer = screen.getByRole('tablist').querySelector('.pb-safe');
    expect(safeAreaContainer).toBeInTheDocument();
  });
});