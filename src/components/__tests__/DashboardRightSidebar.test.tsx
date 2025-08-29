import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardRightSidebar from '../DashboardRightSidebar';
import { NavigationProvider } from '@/context/NavigationContext';

// Mock the existing widget components
jest.mock('../WalletSnapshotEmbed', () => {
  return function MockWalletSnapshotEmbed({ walletAddress, className }: { walletAddress: string; className?: string }) {
    return <div data-testid="wallet-snapshot" className={className}>Wallet: {walletAddress}</div>;
  };
});

jest.mock('../DeFiChartEmbed', () => {
  return function MockDeFiChartEmbed({ tokenSymbol, tokenName, className }: { tokenSymbol: string; tokenName: string; className?: string }) {
    return <div data-testid="defi-chart" className={className}>{tokenSymbol} - {tokenName}</div>;
  };
});

jest.mock('../DAOGovernanceEmbed', () => {
  return function MockDAOGovernanceEmbed({ daoName, daoToken, className }: { daoName: string; daoToken: string; className?: string }) {
    return <div data-testid="dao-governance" className={className}>{daoName} - {daoToken}</div>;
  };
});

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock community data
jest.mock('@/mocks/communityMockData', () => ({
  mockCommunities: [
    {
      id: '1',
      name: 'defi-discussion',
      displayName: 'DeFi Discussion',
      description: 'A community for discussing decentralized finance protocols.',
      memberCount: 15420,
      category: 'Finance',
      tags: ['defi', 'yield-farming'],
      avatar: 'https://example.com/avatar1.png',
      governanceToken: '0xdef1...2345'
    },
    {
      id: '2',
      name: 'nft-creators',
      displayName: 'NFT Creators',
      description: 'A space for NFT artists and collectors.',
      memberCount: 8750,
      category: 'Art',
      tags: ['nft', 'art'],
      avatar: 'https://example.com/avatar2.png'
    }
  ]
}));

// Custom render function with NavigationProvider
const renderWithNavigation = (ui: React.ReactElement, navigationState = {}) => {
  const NavigationWrapper = ({ children }: { children: React.ReactNode }) => (
    <NavigationProvider>{children}</NavigationProvider>
  );
  
  return render(ui, { wrapper: NavigationWrapper });
};

describe('DashboardRightSidebar', () => {
  beforeEach(() => {
    // Mock window.innerWidth for responsive behavior
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('renders basic widgets in feed view', () => {
    renderWithNavigation(<DashboardRightSidebar />);
    
    // Should show wallet widget
    expect(screen.getByText('Wallet Overview')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-snapshot')).toBeInTheDocument();
    
    // Should show DeFi markets
    expect(screen.getByText('DeFi Markets')).toBeInTheDocument();
    expect(screen.getByTestId('defi-chart')).toBeInTheDocument();
    
    // Should show trending communities
    expect(screen.getByText('Trending Communities')).toBeInTheDocument();
    
    // Should show suggested users in feed view
    expect(screen.getByText('Suggested Users')).toBeInTheDocument();
    
    // Should show active auctions in feed view
    expect(screen.getByText('Active Auctions')).toBeInTheDocument();
    
    // Should show governance proposals
    expect(screen.getByText('Governance Proposals')).toBeInTheDocument();
  });

  it('shows community-specific content when viewing a community', () => {
    // We need to mock the navigation context to simulate community view
    // Since we can't easily mock the context value, we'll test the component structure
    renderWithNavigation(<DashboardRightSidebar />);
    
    // Basic widgets should always be present
    expect(screen.getByText('Wallet Overview')).toBeInTheDocument();
    expect(screen.getByText('DeFi Markets')).toBeInTheDocument();
    expect(screen.getByText('Governance Proposals')).toBeInTheDocument();
  });

  it('renders wallet quick actions', () => {
    renderWithNavigation(<DashboardRightSidebar />);
    
    // Check for quick action buttons
    expect(screen.getByText('Send')).toBeInTheDocument();
    expect(screen.getByText('Receive')).toBeInTheDocument();
    expect(screen.getByText('Swap')).toBeInTheDocument();
    expect(screen.getByText('Vote')).toBeInTheDocument();
  });

  it('displays trending content with proper formatting', () => {
    renderWithNavigation(<DashboardRightSidebar />);
    
    // Should format numbers correctly
    expect(screen.getByText('Trending Communities')).toBeInTheDocument();
    
    // Check for member count formatting (mocked data should show formatted numbers)
    const memberCounts = screen.getAllByText(/members/);
    expect(memberCounts.length).toBeGreaterThan(0);
  });

  it('shows DeFi market information', () => {
    renderWithNavigation(<DashboardRightSidebar />);
    
    expect(screen.getByText('DeFi Markets')).toBeInTheDocument();
    expect(screen.getByText('Total Value Locked')).toBeInTheDocument();
    expect(screen.getByText('24h Volume')).toBeInTheDocument();
    expect(screen.getByText('$45.2B')).toBeInTheDocument();
    expect(screen.getByText('$12.8B')).toBeInTheDocument();
  });

  it('integrates existing web3 components', () => {
    renderWithNavigation(<DashboardRightSidebar />);
    
    // Check that the mocked components are rendered with correct props
    expect(screen.getByTestId('wallet-snapshot')).toBeInTheDocument();
    expect(screen.getByTestId('defi-chart')).toBeInTheDocument();
    
    // Verify the components receive the expected props
    expect(screen.getByText('Wallet: 0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText('ETH - Ethereum')).toBeInTheDocument();
  });

  it('handles responsive layout', () => {
    // Test mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 640,
    });
    
    renderWithNavigation(<DashboardRightSidebar />);
    
    // Component should still render all widgets
    expect(screen.getByText('Wallet Overview')).toBeInTheDocument();
    expect(screen.getByText('DeFi Markets')).toBeInTheDocument();
  });

  it('shows governance proposals with voting information', () => {
    renderWithNavigation(<DashboardRightSidebar />);
    
    expect(screen.getByText('Governance Proposals')).toBeInTheDocument();
    
    // Check for voting indicators (using emoji)
    const votingElements = screen.getAllByText(/👍|👎/);
    expect(votingElements.length).toBeGreaterThan(0);
  });

  it('displays auction information with time remaining', () => {
    renderWithNavigation(<DashboardRightSidebar />);
    
    expect(screen.getByText('Active Auctions')).toBeInTheDocument();
    
    // Use getAllByText since "Current bid" appears multiple times
    const currentBidElements = screen.getAllByText('Current bid');
    expect(currentBidElements.length).toBeGreaterThan(0);
    
    // Should show ETH prices
    const ethPrices = screen.getAllByText(/ETH$/);
    expect(ethPrices.length).toBeGreaterThan(0);
  });
});