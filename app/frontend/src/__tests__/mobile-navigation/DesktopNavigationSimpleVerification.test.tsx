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

describe('Desktop Navigation Verification - Task 4 (Simple)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    } as any);

    // Set desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  test('should confirm desktop navigation layout is unaffected', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Verify desktop navigation container exists
    const desktopNavContainer = document.querySelector('.hidden.md\\:flex');
    expect(desktopNavContainer).toBeInTheDocument();

    // Verify navigation element exists within desktop container
    const navElement = document.querySelector('.hidden.md\\:flex nav');
    expect(navElement).toBeInTheDocument();

    // Verify navigation list structure
    const navList = document.querySelector('.hidden.md\\:flex nav ul.flex.space-x-2');
    expect(navList).toBeInTheDocument();
  });

  test('should verify all desktop navigation items are present', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Verify all navigation items exist in the DOM (both desktop and mobile versions)
    const navItems = ['Home', 'Communities', 'Messages', 'Governance', 'Marketplace', 'Settings'];
    navItems.forEach(item => {
      const elements = screen.getAllByText(item);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('should verify desktop navigation has proper responsive classes', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Verify desktop navigation has hidden md:flex classes
    const desktopNavContainer = document.querySelector('.hidden.md\\:flex .items-center.space-x-4');
    expect(desktopNavContainer).toBeInTheDocument();

    // Verify mobile navigation has md:hidden classes
    const mobileNavContainer = document.querySelector('.md\\:hidden');
    expect(mobileNavContainer).toBeInTheDocument();
  });

  test('should verify desktop search functionality exists', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Verify search input exists in desktop layout
    const searchInput = document.querySelector('.hidden.md\\:flex input[aria-label="Global search"]');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search');
  });

  test('should verify desktop navigation styling is intact', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Verify navigation links have proper styling classes
    const navLinks = document.querySelectorAll('.hidden.md\\:flex nav ul li a');
    expect(navLinks.length).toBeGreaterThan(0);

    navLinks.forEach(link => {
      expect(link).toHaveClass('transition-colors');
      expect(link).toHaveClass('transition-transform');
    });
  });

  test('should verify desktop navigation breakpoint behavior', () => {
    // Test different desktop screen sizes
    const desktopSizes = [1024, 1280, 1440, 1920];

    desktopSizes.forEach(width => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });

      const { unmount } = render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // Verify desktop navigation container exists at all desktop sizes
      const desktopNavContainer = document.querySelector('.hidden.md\\:flex');
      expect(desktopNavContainer).toBeInTheDocument();

      unmount();
    });
  });

  test('should verify ConnectButton is present in desktop layout', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Verify ConnectButton exists (there should be multiple instances - desktop and mobile)
    const connectButtons = screen.getAllByText('Connect Wallet');
    expect(connectButtons.length).toBeGreaterThanOrEqual(1);
  });

  test('should verify dark mode toggle exists in desktop layout', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Verify dark mode toggle buttons exist
    const darkModeButtons = document.querySelectorAll('button[aria-label="Toggle dark mode"]');
    expect(darkModeButtons.length).toBeGreaterThanOrEqual(1);
  });

  test('should verify desktop navigation performance', () => {
    const startTime = performance.now();
    
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Desktop navigation should render efficiently (less than 100ms)
    expect(renderTime).toBeLessThan(100);
  });

  test('should verify desktop navigation accessibility', () => {
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
    
    // Verify all navigation links have href attributes
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });
});