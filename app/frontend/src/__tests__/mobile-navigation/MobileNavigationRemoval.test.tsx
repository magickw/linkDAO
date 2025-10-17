import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('Mobile Navigation Removal Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    } as any);
  });

  test('should not render MobileNavigation component', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Check that there's no bottom navigation bar
    const bottomNavigation = screen.queryByRole('tablist', { name: /main navigation/i });
    expect(bottomNavigation).not.toBeInTheDocument();

    // Check that there's no fixed bottom navigation
    const fixedBottomNav = document.querySelector('.fixed.bottom-0');
    expect(fixedBottomNav).not.toBeInTheDocument();
  });

  test('should not have bottom tab bar elements', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Look for common bottom tab bar indicators
    const tabElements = screen.queryAllByRole('tab');
    expect(tabElements).toHaveLength(0);

    // Check for bottom navigation specific classes
    const bottomNavClasses = document.querySelectorAll('.bottom-0, .pb-safe');
    const mobileNavElements = Array.from(bottomNavClasses).filter(el => 
      el.classList.contains('fixed') || 
      el.classList.contains('z-50') ||
      el.textContent?.includes('Home') ||
      el.textContent?.includes('Communities')
    );
    expect(mobileNavElements).toHaveLength(0);
  });

  test('should only have burger menu navigation on mobile', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Should have burger menu button
    const buttons = screen.getAllByRole('button');
    const menuButton = buttons.find(button => {
      const svg = button.querySelector('svg');
      return svg && svg.querySelector('path[d*="M4 6h16M4 12h16"]');
    });
    expect(menuButton).toBeInTheDocument();

    // Should have desktop navigation (which is hidden on mobile via CSS)
    const allNavElements = screen.getAllByRole('navigation');
    expect(allNavElements.length).toBe(1);
  });

  test('should maintain clean DOM structure without bottom navigation', () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Check that there are no elements with bottom navigation styling
    const bottomFixedElements = container.querySelectorAll('[class*="bottom-0"]');
    const mobileNavElements = Array.from(bottomFixedElements).filter(el => {
      const classList = Array.from(el.classList);
      return classList.some(cls => 
        cls.includes('fixed') || 
        cls.includes('z-50') ||
        cls.includes('backdrop-blur')
      );
    });

    expect(mobileNavElements).toHaveLength(0);
  });

  test('should not import MobileNavigation component', () => {
    // This test verifies that the Layout component doesn't import MobileNavigation
    const layoutSource = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/components/Layout.tsx'),
      'utf8'
    );

    // Check that MobileNavigation is not imported
    expect(layoutSource).not.toMatch(/import.*MobileNavigation/);
    expect(layoutSource).not.toMatch(/<MobileNavigation/);
  });

  test('should have proper mobile viewport without bottom navigation interference', () => {
    render(
      <Layout>
        <div data-testid="main-content">Test Content</div>
      </Layout>
    );

    const mainContent = screen.getByTestId('main-content');
    expect(mainContent).toBeInTheDocument();

    // Verify that main content is not pushed up by bottom navigation
    const main = mainContent.closest('main');
    expect(main).not.toHaveClass('pb-16', 'pb-20', 'mb-16', 'mb-20'); // Common bottom nav spacings
  });

  test('should maintain all navigation functionality through burger menu only', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Should have hamburger menu button
    const buttons = screen.getAllByRole('button');
    const hamburgerButton = buttons.find(button => {
      const svg = button.querySelector('svg');
      return svg && svg.querySelector('path[d*="M4 6h16M4 12h16"]');
    });
    expect(hamburgerButton).toBeInTheDocument();

    // Should have other UI buttons (dark mode, connect wallet)
    expect(buttons.length).toBeGreaterThanOrEqual(3); // hamburger + dark mode + connect button
  });
});