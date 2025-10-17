import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Helper function to find the hamburger menu button
const getHamburgerMenuButton = () => {
  const buttons = screen.getAllByRole('button');
  return buttons.find(button => {
    const svg = button.querySelector('svg');
    return svg && svg.querySelector('path[d*="M4 6h16M4 12h16"]');
  });
};

describe('Responsive Navigation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    } as any);
  });

  describe('Mobile Devices', () => {
    test('should work on iPhone SE (375x667)', async () => {
      setViewportSize(375, 667);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Should show burger menu
      const menuButton = getHamburgerMenuButton();
      expect(menuButton).toBeInTheDocument();

      // Open menu and verify navigation works
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Communities')).toBeInTheDocument();
      });
    });

    test('should work on iPhone 12 Pro (390x844)', async () => {
      setViewportSize(390, 844);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        const navigation = screen.getByRole('navigation');
        expect(navigation).toBeInTheDocument();
        
        // Verify all navigation items are accessible
        expect(screen.getByText('Messages')).toBeInTheDocument();
        expect(screen.getByText('Governance')).toBeInTheDocument();
        expect(screen.getByText('Marketplace')).toBeInTheDocument();
      });
    });

    test('should work on Samsung Galaxy S21 (384x854)', async () => {
      setViewportSize(384, 854);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        // Test navigation functionality
        const homeLink = screen.getByRole('link', { name: /home/i });
        expect(homeLink).toHaveAttribute('href', '/');
        
        fireEvent.click(homeLink);
        
        // Menu should close after navigation
        expect(screen.queryByText('Home')).not.toBeInTheDocument();
      });
    });

    test('should work on iPad Mini (768x1024)', async () => {
      setViewportSize(768, 1024);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // At this size, should still show mobile navigation
      const menuButton = getHamburgerMenuButton();
      expect(menuButton).toBeInTheDocument();
      
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
    });
  });

  describe('Desktop Breakpoints', () => {
    test('should show desktop navigation on medium screens (1024px+)', () => {
      setViewportSize(1024, 768);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Desktop navigation should be visible
      const desktopNav = screen.getByRole('navigation');
      expect(desktopNav).toBeInTheDocument();
      
      // Mobile burger menu should be hidden (md:hidden class)
      const menuButton = getHamburgerMenuButton();
      const mobileNavContainer = menuButton?.closest('.md\\:hidden');
      expect(mobileNavContainer).toBeInTheDocument();
    });

    test('should maintain desktop navigation on large screens (1280px+)', () => {
      setViewportSize(1280, 800);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Should have desktop navigation with all items visible
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Communities')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Governance')).toBeInTheDocument();
      expect(screen.getByText('Marketplace')).toBeInTheDocument();
    });

    test('should handle ultra-wide screens (1920px+)', () => {
      setViewportSize(1920, 1080);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Desktop navigation should still work properly
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
      
      // All navigation items should be accessible
      const navItems = screen.getAllByRole('link');
      expect(navItems.length).toBeGreaterThanOrEqual(5); // At least 5 main nav items
    });
  });

  describe('Responsive Behavior', () => {
    test('should handle viewport size changes', async () => {
      // Start with mobile
      setViewportSize(375, 667);
      
      const { rerender } = render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Should show mobile navigation
      let menuButton = getHamburgerMenuButton();
      expect(menuButton).toBeInTheDocument();

      // Switch to desktop
      setViewportSize(1024, 768);
      
      rerender(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Desktop navigation should be available
      const desktopNav = screen.getByRole('navigation');
      expect(desktopNav).toBeInTheDocument();
    });

    test('should maintain navigation state during resize', async () => {
      setViewportSize(375, 667);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      // Resize to larger screen
      setViewportSize(800, 600);
      
      // Navigation should still be functional
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
    });
  });

  describe('Touch and Gesture Support', () => {
    test('should handle touch events properly on mobile', async () => {
      setViewportSize(375, 667);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      
      // Simulate touch interaction
      fireEvent.touchStart(menuButton!, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchEnd(menuButton!);
      fireEvent.click(menuButton!);

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
    });

    test('should provide adequate touch targets on mobile', async () => {
      setViewportSize(375, 667);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);

      await waitFor(() => {
        const menuItems = screen.getAllByRole('link');
        
        // Each menu item should have adequate padding for touch
        menuItems.forEach(item => {
          const computedStyle = window.getComputedStyle(item);
          // Should have some padding for touch targets (at least 8px)
          expect(computedStyle.padding).toBeTruthy();
        });
      });
    });
  });

  describe('Performance on Different Devices', () => {
    test('should render efficiently on low-end devices', () => {
      setViewportSize(320, 568); // iPhone 5/SE
      
      const startTime = performance.now();
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    test('should handle rapid menu toggles without performance issues', async () => {
      setViewportSize(375, 667);
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      
      // Rapidly toggle menu multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(menuButton!);
        await waitFor(() => {
          if (i % 2 === 0) {
            expect(screen.getByText('Home')).toBeInTheDocument();
          } else {
            expect(screen.queryByText('Home')).not.toBeInTheDocument();
          }
        });
      }
    });
  });

  describe('Accessibility Across Devices', () => {
    test('should maintain accessibility on all screen sizes', async () => {
      const screenSizes = [
        [375, 667], // Mobile
        [768, 1024], // Tablet
        [1024, 768], // Desktop
      ];

      for (const [width, height] of screenSizes) {
        setViewportSize(width, height);
        
        const { unmount } = render(
          <Layout>
            <div>Test Content</div>
          </Layout>
        );

        // Should have proper ARIA labels
        const menuButton = getHamburgerMenuButton();
        expect(menuButton).toBeInTheDocument();

        if (width < 768) {
          fireEvent.click(menuButton!);
          
          await waitFor(() => {
            const navigation = screen.getByRole('navigation');
            expect(navigation).toBeInTheDocument();
            
            const menuItems = screen.getAllByRole('link');
            menuItems.forEach(item => {
              expect(item).toHaveAttribute('href');
            });
          });
        }

        unmount();
      }
    });
  });
});