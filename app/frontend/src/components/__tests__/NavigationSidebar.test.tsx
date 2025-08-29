import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAccount } from 'wagmi';
import NavigationSidebar from '../NavigationSidebar';
import { NavigationProvider } from '@/context/NavigationContext';
import { Web3Provider } from '@/context/Web3Context';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useBalance: jest.fn(),
}));

// Mock the profile hook
jest.mock('@/hooks/useProfile', () => ({
  useProfile: jest.fn(() => ({
    profile: {
      id: '1',
      address: '0x1234567890123456789012345678901234567890',
      handle: 'testuser',
      ens: 'testuser.eth',
      avatarCid: '',
      bioCid: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    isLoading: false,
    error: null,
  })),
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/dashboard',
  }),
}));

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;

// Mock useBalance from wagmi
const mockUseBalance = require('wagmi').useBalance as jest.MockedFunction<any>;

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NavigationProvider>
      {component}
    </NavigationProvider>
  );
};

describe('NavigationSidebar', () => {
  beforeEach(() => {
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      addresses: ['0x1234567890123456789012345678901234567890'] as readonly [`0x${string}`, ...`0x${string}`[]],
      chain: { id: 1, name: 'Ethereum' },
      chainId: 1,
      connector: {} as any,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: false,
      status: 'connected',
    });

    mockUseBalance.mockReturnValue({
      data: {
        formatted: '1.5',
        symbol: 'ETH',
        decimals: 18,
        value: BigInt('1500000000000000000'),
      },
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders user profile section when expanded', () => {
    renderWithProviders(<NavigationSidebar />);
    
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
  });

  it('renders main navigation menu', () => {
    renderWithProviders(<NavigationSidebar />);
    
    expect(screen.getByText('Home Feed')).toBeInTheDocument();
    expect(screen.getByText('All Communities')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
  });

  it('renders joined communities section', () => {
    renderWithProviders(<NavigationSidebar />);
    
    expect(screen.getByText('My Communities')).toBeInTheDocument();
    expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
    expect(screen.getByText('DeFi Traders')).toBeInTheDocument();
    expect(screen.getByText('NFT Collectors')).toBeInTheDocument();
  });

  it('renders discover communities section', () => {
    renderWithProviders(<NavigationSidebar />);
    
    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('DAO Governance')).toBeInTheDocument();
  });

  it('shows unread count badges for communities with unread content', () => {
    renderWithProviders(<NavigationSidebar />);
    
    // Ethereum Builders has 3 unread
    expect(screen.getByText('3')).toBeInTheDocument();
    // NFT Collectors has 1 unread
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('allows joining communities', () => {
    renderWithProviders(<NavigationSidebar />);
    
    const joinButton = screen.getByText('Join');
    expect(joinButton).toBeInTheDocument();
    
    fireEvent.click(joinButton);
    // After clicking join, the community should move to joined section
    // This is a basic test - in real implementation we'd test the state change
  });

  it('renders create post button when expanded', () => {
    renderWithProviders(<NavigationSidebar />);
    
    expect(screen.getByText('Create Post')).toBeInTheDocument();
  });

  it('handles navigation between feed and communities', () => {
    renderWithProviders(<NavigationSidebar />);
    
    const feedButton = screen.getByText('Home Feed');
    const communitiesButton = screen.getByText('All Communities');
    
    expect(feedButton).toBeInTheDocument();
    expect(communitiesButton).toBeInTheDocument();
    
    fireEvent.click(feedButton);
    fireEvent.click(communitiesButton);
    
    // Navigation state changes would be tested through context
  });

  it('shows member counts for communities', () => {
    renderWithProviders(<NavigationSidebar />);
    
    expect(screen.getByText('1,240 members')).toBeInTheDocument();
    expect(screen.getByText('890 members')).toBeInTheDocument();
    expect(screen.getByText('2,100 members')).toBeInTheDocument();
  });

  it('handles show more/less for communities list', () => {
    renderWithProviders(<NavigationSidebar />);
    
    // Since we have 3 joined communities (less than 5), the show more button shouldn't appear
    // This test would be more relevant with more mock communities
    const showMoreButton = screen.queryByText(/more/);
    expect(showMoreButton).not.toBeInTheDocument();
  });
});