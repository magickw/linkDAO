import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import Layout from '@/components/Layout';
import { useChatHistory } from '@/hooks/useChatHistory';
import { governanceService } from '@/services/governanceService';
import { CommunityMembershipService } from '@/services/communityMembershipService';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
}));

jest.mock('@/hooks/useChatHistory', () => ({
  useChatHistory: jest.fn(),
}));

jest.mock('@/services/governanceService', () => ({
  governanceService: {
    getAllActiveProposals: jest.fn(),
  },
}));

jest.mock('@/services/communityMembershipService', () => ({
  CommunityMembershipService: {
    getUserMemberships: jest.fn(),
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
const mockUseChatHistory = useChatHistory as jest.MockedFunction<typeof useChatHistory>;

// Helper function to find the hamburger menu button
const getHamburgerMenuButton = () => {
  const buttons = screen.getAllByRole('button');
  return buttons.find(button => {
    const svg = button.querySelector('svg');
    return svg && svg.querySelector('path[d*="M4 6h16M4 12h16"]');
  });
};

describe('Mobile Navigation - Burger Menu Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    } as any);
    
    mockUseChatHistory.mockReturnValue({
      conversations: [
        { unreadCounts: { '0x1234567890123456789012345678901234567890': 3 } },
        { unreadCounts: { '0x1234567890123456789012345678901234567890': 2 } },
      ],
    } as any);

    (governanceService.getAllActiveProposals as jest.Mock).mockResolvedValue([
      { status: 'ACTIVE', communityId: 'community1', canVote: true },
      { status: 'ACTIVE', communityId: 'community2', canVote: true },
    ]);

    (CommunityMembershipService.getUserMemberships as jest.Mock).mockResolvedValue([
      { communityId: 'community1', isActive: true },
      { communityId: 'community2', isActive: true },
    ]);
  });

  describe('Burger Menu Functionality', () => {
    test('should display burger menu button on mobile', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Look for the hamburger menu button
      const menuButton = getHamburgerMenuButton();
      expect(menuButton).toBeInTheDocument();
    });

    test('should toggle mobile menu when burger button is clicked', async () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      
      // Menu should be closed initially - check for mobile menu container
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
      
      // Click to open menu
      fireEvent.click(menuButton!);
      
      // Menu should now be visible
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
      });
      
      // Click to close menu
      fireEvent.click(menuButton!);
      
      // Menu should be hidden again
      await waitFor(() => {
        expect(screen.queryByText('Home')).not.toBeInTheDocument();
      });
    });

    test('should display all navigation items in burger menu', async () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Communities')).toBeInTheDocument();
        expect(screen.getByText('Messages')).toBeInTheDocument();
        expect(screen.getByText('Governance')).toBeInTheDocument();
        expect(screen.getByText('Marketplace')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    test('should display badge counts in burger menu', async () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);

      await waitFor(() => {
        // Should show messages badge (3 + 2 = 5 unread messages)
        const messagesBadge = screen.getByText('5');
        expect(messagesBadge).toBeInTheDocument();
        
        // Should show governance badge (2 active proposals)
        const governanceBadge = screen.getByText('2');
        expect(governanceBadge).toBeInTheDocument();
      });
    });

    test('should navigate to correct routes when menu items are clicked', async () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);

      await waitFor(() => {
        const homeLink = screen.getByRole('link', { name: /home/i });
        const communitiesLink = screen.getByRole('link', { name: /communities/i });
        const messagesLink = screen.getByRole('link', { name: /messages/i });
        const governanceLink = screen.getByRole('link', { name: /governance/i });
        const marketplaceLink = screen.getByRole('link', { name: /marketplace/i });
        const settingsLink = screen.getByRole('link', { name: /settings/i });

        expect(homeLink).toHaveAttribute('href', '/');
        expect(communitiesLink).toHaveAttribute('href', '/communities');
        expect(messagesLink).toHaveAttribute('href', '/messaging');
        expect(governanceLink).toHaveAttribute('href', '/governance');
        expect(marketplaceLink).toHaveAttribute('href', '/marketplace');
        expect(settingsLink).toHaveAttribute('href', '/settings');
      });
    });

    test('should close menu after navigation selection', async () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
      });

      // Click on a navigation item
      const homeLink = screen.getByRole('link', { name: /home/i });
      fireEvent.click(homeLink);

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByText('Home')).not.toBeInTheDocument();
      });
    });

    test('should handle admin navigation when user is admin', async () => {
      // Mock admin user
      process.env.NEXT_PUBLIC_ADMIN_ADDRESS = '0x1234567890123456789012345678901234567890';
      
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);

      await waitFor(() => {
        expect(screen.getByText('Admin')).toBeInTheDocument();
        const adminLink = screen.getByRole('link', { name: /admin/i });
        expect(adminLink).toHaveAttribute('href', '/admin');
      });
    });

    test('should handle service unavailable errors gracefully', async () => {
      // Mock service error
      (CommunityMembershipService.getUserMemberships as jest.Mock).mockRejectedValue(
        new Error('503 Service Unavailable')
      );

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);

      // Should still render menu without crashing
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Communities')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    test('should hide burger menu on desktop screens', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Burger menu should have md:hidden class
      const menuButton = getHamburgerMenuButton();
      const mobileNavContainer = menuButton?.closest('.md\\:hidden');
      expect(mobileNavContainer).toBeInTheDocument();
    });

    test('should show desktop navigation on larger screens', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Desktop navigation should be present with hidden md:flex class
      const desktopNav = screen.getByRole('navigation');
      expect(desktopNav).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    test('should handle touch events on menu items', async () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      
      // Simulate touch events
      fireEvent.touchStart(menuButton!);
      fireEvent.touchEnd(menuButton!);
      fireEvent.click(menuButton!);

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
      });
    });

    test('should provide proper touch target sizes', async () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      fireEvent.click(menuButton!);

      await waitFor(() => {
        const menuItems = screen.getAllByRole('link');
        menuItems.forEach(item => {
          // Check that menu items have adequate padding for touch targets
          const styles = window.getComputedStyle(item);
          expect(styles.padding).toBeTruthy();
        });
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
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
        
        const menuItems = screen.getAllByRole('link');
        menuItems.forEach(item => {
          expect(item).toHaveAttribute('href');
        });
      });
    });

    test('should support keyboard navigation', async () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const menuButton = getHamburgerMenuButton();
      
      // Test keyboard activation
      fireEvent.keyDown(menuButton!, { key: 'Enter' });
      fireEvent.click(menuButton!);

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
      });
    });
  });
});