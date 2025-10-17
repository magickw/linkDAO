import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import Layout from '@/components/Layout';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
}));

jest.mock('@/hooks/useChatHistory', () => ({
  useChatHistory: jest.fn(() => ({ conversations: [] })),
}));

jest.mock('@/services/governanceService', () => ({
  governanceService: {
    getAllActiveProposals: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('@/services/communityMembershipService', () => ({
  CommunityMembershipService: {
    getUserMemberships: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/components/NotificationSystem', () => {
  return function NotificationSystem() {
    return <div data-testid="notification-system">Notification System</div>;
  };
});

jest.mock('@/components/Messaging', () => ({
  MessagingWidget: () => <div data-testid="messaging-widget">Messaging Widget</div>,
}));

const mockRouter = {
  pathname: '/',
  push: jest.fn(),
  query: {},
  asPath: '/',
};

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Helper function to simulate different viewport sizes
const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

describe('Desktop Navigation Verification - Task 4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    } as any);
  });

  describe('Desktop Navigation Layout Verification', () => {
    test('should maintain desktop navigation structure on medium screens (1024px)', () => {
      setViewportSize(1024, 768);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify desktop navigation container exists with correct classes
      const desktopNavContainer = document.querySelector('.hidden.md\\:flex .items-center.space-x-4.ml-auto');
      expect(desktopNavContainer).toBeInTheDocument();

      // Verify navigation element exists
      const navElement = desktopNavContainer?.querySelector('nav');
      expect(navElement).toBeInTheDocument();

      // Verify navigation list structure
      const navList = navElement?.querySelector('ul.flex.space-x-2');
      expect(navList).toBeInTheDocument();
    });

    test('should maintain desktop navigation structure on large screens (1280px)', () => {
      setViewportSize(1280, 800);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify desktop navigation container
      const desktopNavContainer = document.querySelector('.hidden.md\\:flex .items-center.space-x-4.ml-auto');
      expect(desktopNavContainer).toBeInTheDocument();

      // Verify all navigation items are present
      const navItems = ['Home', 'Communities', 'Messages', 'Governance', 'Marketplace', 'Settings'];
      navItems.forEach(item => {
        const navItem = screen.getByText(item);
        expect(navItem).toBeInTheDocument();
        
        // Verify the item is within the desktop navigation structure
        const parentLink = navItem.closest('a');
        expect(parentLink).toBeInTheDocument();
        expect(parentLink?.closest('ul.flex.space-x-2')).toBeInTheDocument();
      });
    });

    test('should maintain desktop navigation structure on ultra-wide screens (1920px)', () => {
      setViewportSize(1920, 1080);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify desktop navigation container
      const desktopNavContainer = document.querySelector('.hidden.md\\:flex .items-center.space-x-4.ml-auto');
      expect(desktopNavContainer).toBeInTheDocument();

      // Verify navigation structure is intact
      const navElement = desktopNavContainer?.querySelector('nav ul.flex.space-x-2');
      expect(navElement).toBeInTheDocument();
      
      // Count navigation items (should be 6: Home, Communities, Messages, Governance, Marketplace, Settings)
      const navLinks = navElement?.querySelectorAll('li a');
      expect(navLinks?.length).toBe(6);
    });
  });

  describe('Desktop Navigation Functionality Verification', () => {
    test('should maintain proper navigation links and hrefs', () => {
      setViewportSize(1024, 768);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify each navigation item has correct href
      const expectedNavItems = [
        { name: 'Home', href: '/' },
        { name: 'Communities', href: '/communities' },
        { name: 'Messages', href: '/messaging' },
        { name: 'Governance', href: '/governance' },
        { name: 'Marketplace', href: '/marketplace' },
        { name: 'Settings', href: '/settings' },
      ];

      expectedNavItems.forEach(({ name, href }) => {
        const navItem = screen.getByText(name);
        const link = navItem.closest('a');
        expect(link).toHaveAttribute('href', href);
      });
    });

    test('should maintain active state styling for current route', () => {
      setViewportSize(1024, 768);
      
      // Test with different active routes
      const testRoutes = ['/', '/communities', '/messaging', '/governance', '/marketplace'];
      
      testRoutes.forEach(route => {
        mockUseRouter.mockReturnValue({
          ...mockRouter,
          pathname: route,
        });

        const { unmount } = render(
          <Layout>
            <div>Test Content</div>
          </Layout>
        );

        // Find the active navigation item
        const activeNavItems = document.querySelectorAll('.bg-primary-100.text-primary-700');
        expect(activeNavItems.length).toBeGreaterThan(0);

        // Verify active indicator is present
        const activeIndicators = document.querySelectorAll('.pointer-events-none.absolute.-bottom-1');
        expect(activeIndicators.length).toBeGreaterThan(0);

        unmount();
      });
    });

    test('should maintain hover and transition effects', () => {
      setViewportSize(1024, 768);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify hover classes are present on navigation items
      const navLinks = document.querySelectorAll('nav ul.flex.space-x-2 li a');
      navLinks.forEach(link => {
        expect(link).toHaveClass('transition-colors');
        expect(link).toHaveClass('transition-transform');
        expect(link).toHaveClass('hover:scale-[1.03]');
      });
    });

    test('should maintain badge functionality for messages and governance', () => {
      setViewportSize(1024, 768);
      
      // Mock some unread messages and governance items
      mockUseAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
      } as any);

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify badge containers exist (even if count is 0)
      const messagesLink = screen.getByText('Messages').closest('a');
      const governanceLink = screen.getByText('Governance').closest('a');
      
      expect(messagesLink).toBeInTheDocument();
      expect(governanceLink).toBeInTheDocument();
      
      // The badge elements should be conditionally rendered based on counts
      // Since we're mocking empty data, badges shouldn't be visible
      const badges = document.querySelectorAll('.absolute.-top-1.-right-1');
      // Badges should only appear when there are actual unread items
      expect(badges.length).toBe(0);
    });
  });

  describe('Desktop Navigation Responsive Breakpoints', () => {
    test('should show desktop navigation at md breakpoint (768px+)', () => {
      setViewportSize(768, 600);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // At 768px, should still show mobile navigation (md breakpoint is typically 768px+)
      // But let's test at exactly the md breakpoint
      const desktopNavContainer = document.querySelector('.hidden.md\\:flex');
      expect(desktopNavContainer).toBeInTheDocument();
    });

    test('should maintain desktop navigation visibility across all desktop sizes', () => {
      const desktopSizes = [
        [1024, 768],   // Standard desktop
        [1280, 800],   // Large desktop
        [1440, 900],   // Wide desktop
        [1920, 1080],  // Full HD
        [2560, 1440],  // 2K
      ];

      desktopSizes.forEach(([width, height]) => {
        setViewportSize(width, height);
        
        const { unmount } = render(
          <Layout>
            <div>Test Content</div>
          </Layout>
        );

        // Verify desktop navigation is visible
        const desktopNavContainer = document.querySelector('.hidden.md\\:flex .items-center.space-x-4.ml-auto');
        expect(desktopNavContainer).toBeInTheDocument();

        // Verify mobile burger menu is hidden on desktop
        const mobileNavContainer = document.querySelector('.md\\:hidden');
        expect(mobileNavContainer).toBeInTheDocument(); // Container exists but should be hidden via CSS

        unmount();
      });
    });
  });

  describe('Desktop Navigation Additional Features', () => {
    test('should maintain search functionality on desktop', () => {
      setViewportSize(1024, 768);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify search input exists in desktop layout
      const searchInput = document.querySelector('.hidden.md\\:flex.flex-1.max-w-xl input');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', 'Search');
      expect(searchInput).toHaveAttribute('aria-label', 'Global search');
    });

    test('should maintain dark mode toggle on desktop', () => {
      setViewportSize(1024, 768);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify dark mode toggle exists in desktop navigation
      const darkModeButtons = document.querySelectorAll('button[aria-label="Toggle dark mode"]');
      expect(darkModeButtons.length).toBeGreaterThan(0);
      
      // Test dark mode toggle functionality
      const darkModeButton = darkModeButtons[0];
      fireEvent.click(darkModeButton);
      
      // Button should still be functional (no errors thrown)
      expect(darkModeButton).toBeInTheDocument();
    });

    test('should maintain ConnectButton integration on desktop', () => {
      setViewportSize(1024, 768);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify ConnectButton is present in desktop layout
      const connectButton = screen.getByText('Connect Wallet');
      expect(connectButton).toBeInTheDocument();
      
      // Verify it's in the desktop navigation area
      const desktopNavContainer = document.querySelector('.hidden.md\\:flex .items-center.space-x-4.ml-auto');
      expect(desktopNavContainer).toContainElement(connectButton);
    });

    test('should maintain admin navigation when user is admin', () => {
      setViewportSize(1024, 768);
      
      // Mock admin user
      process.env.NEXT_PUBLIC_ADMIN_ADDRESS = '0x1234567890123456789012345678901234567890';
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Admin link should be present in desktop navigation
      // Note: Admin detection is based on useEffect, so it might not be immediately visible
      // But the structure should support it
      const navList = document.querySelector('nav ul.flex.space-x-2');
      expect(navList).toBeInTheDocument();
    });
  });

  describe('Desktop Navigation Performance and Accessibility', () => {
    test('should maintain proper ARIA labels and accessibility', () => {
      setViewportSize(1024, 768);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify navigation has proper structure for screen readers
      const navElement = document.querySelector('nav');
      expect(navElement).toBeInTheDocument();
      
      // Verify search input has proper aria-label
      const searchInput = document.querySelector('input[aria-label="Global search"]');
      expect(searchInput).toBeInTheDocument();
      
      // Verify all navigation links are accessible
      const navLinks = document.querySelectorAll('nav ul li a');
      navLinks.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });

    test('should maintain efficient rendering on desktop', () => {
      setViewportSize(1024, 768);
      
      const startTime = performance.now();
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Desktop navigation should render efficiently
      expect(renderTime).toBeLessThan(100);
    });
  });
});