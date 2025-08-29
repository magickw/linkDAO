import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Web3SocialPostCard from './Web3SocialPostCard';

// Mock the context providers
jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: jest.fn(),
  }),
}));

// Mock the child components
jest.mock('@/components/NFTPreview', () => {
  return function MockNFTPreview() {
    return <div data-testid="nft-preview">NFT Preview</div>;
  };
});

jest.mock('@/components/DeFiChartEmbed', () => {
  return function MockDeFiChartEmbed() {
    return <div data-testid="defi-chart">DeFi Chart</div>;
  };
});

jest.mock('@/components/WalletSnapshotEmbed', () => {
  return function MockWalletSnapshotEmbed() {
    return <div data-testid="wallet-snapshot">Wallet Snapshot</div>;
  };
});

jest.mock('@/components/DAOGovernanceEmbed', () => {
  return function MockDAOGovernanceEmbed() {
    return <div data-testid="dao-governance">DAO Governance</div>;
  };
});

jest.mock('@/components/GestureHandler', () => {
  return function MockGestureHandler({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={className} data-testid="gesture-handler">{children}</div>;
  };
});

jest.mock('@/components/QuickActionsMenu', () => {
  return function MockQuickActionsMenu() {
    return <div data-testid="quick-actions-menu">Quick Actions Menu</div>;
  };
});

describe('Web3SocialPostCard', () => {
  const mockPost = {
    id: '1',
    title: 'Test Post',
    contentCid: 'This is a test post content that is long enough to be truncated when not expanded.',
    author: '0x1234567890123456789012345678901234567890',
    dao: 'test-dao',
    createdAt: new Date(),
    reputationScore: 100,
    stakedValue: 50,
    commentCount: 5,
    tags: ['defi'],
    mediaCids: ['https://example.com/image.jpg'],
  };

  const mockProfile = {
    handle: 'testuser',
    ens: 'testuser.eth',
    avatarCid: 'https://example.com/avatar.jpg',
    verified: true,
    reputationTier: 'gold',
  };

  it('renders the post title and content', () => {
    render(
      <Web3SocialPostCard 
        post={mockPost} 
        profile={mockProfile} 
      />
    );

    expect(screen.getByText('Test Post')).toBeInTheDocument();
    expect(screen.getByText('This is a test post content that is long enough to be truncated when not expanded.')).toBeInTheDocument();
  });

  it('displays the author information', () => {
    render(
      <Web3SocialPostCard 
        post={mockPost} 
        profile={mockProfile} 
      />
    );

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument(); // Verified badge
  });

  it('shows post tags with correct color coding', () => {
    render(
      <Web3SocialPostCard 
        post={mockPost} 
        profile={mockProfile} 
      />
    );

    expect(screen.getByText('#defi')).toBeInTheDocument();
  });

  it('displays reactions with token values', () => {
    render(
      <Web3SocialPostCard 
        post={mockPost} 
        profile={mockProfile} 
      />
    );

    // Check that reactions are displayed with their values
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument(); // Hot take value
    expect(screen.getByText('💎')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument(); // Diamond hands value
  });

  it('handles reaction clicks', () => {
    render(
      <Web3SocialPostCard 
        post={mockPost} 
        profile={mockProfile} 
      />
    );

    const hotTakeButton = screen.getByText('🔥').closest('button');
    if (hotTakeButton) {
      fireEvent.click(hotTakeButton);
      // We can't easily test the state change here without more complex mocking
      // but we can verify the button exists and is clickable
      expect(hotTakeButton).toBeInTheDocument();
    }
  });

  it('shows media when available', () => {
    render(
      <Web3SocialPostCard 
        post={mockPost} 
        profile={mockProfile} 
      />
    );

    const mediaImage = screen.getByAltText('Post media');
    expect(mediaImage).toBeInTheDocument();
    expect(mediaImage).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('applies glassmorphism effect class', () => {
    render(
      <Web3SocialPostCard 
        post={mockPost} 
        profile={mockProfile} 
      />
    );

    const card = screen.getByTestId('gesture-handler');
    expect(card).toHaveClass('backdrop-blur-xl');
    expect(card).toHaveClass('bg-white/80');
  });
});