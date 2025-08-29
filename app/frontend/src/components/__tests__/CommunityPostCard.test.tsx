import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommunityPostCard from '../CommunityPostCard';
import { mockCommunities, mockCommunityPosts } from '@/mocks/communityMockData';

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({
    isConnected: true,
    address: '0x1234567890123456789012345678901234567890'
  })
}));

// Mock the Web3Context
jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
    chainId: 1,
    balance: '1.0'
  })
}));

// Mock the ToastContext
jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: jest.fn(),
    removeToast: jest.fn(),
    toasts: []
  })
}));

// Mock complex components
jest.mock('../CommentThread', () => {
  return function MockCommentThread({ comment }: any) {
    return <div data-testid="comment-thread">{comment.content}</div>;
  };
});

jest.mock('../NFTPreview', () => {
  return function MockNFTPreview() {
    return <div data-testid="nft-preview">NFT Preview</div>;
  };
});

jest.mock('../DeFiChartEmbed', () => {
  return function MockDeFiChartEmbed() {
    return <div data-testid="defi-chart">DeFi Chart</div>;
  };
});

jest.mock('../WalletSnapshotEmbed', () => {
  return function MockWalletSnapshotEmbed() {
    return <div data-testid="wallet-snapshot">Wallet Snapshot</div>;
  };
});

jest.mock('../DAOGovernanceEmbed', () => {
  return function MockDAOGovernanceEmbed() {
    return <div data-testid="dao-governance">DAO Governance</div>;
  };
});

describe('CommunityPostCard', () => {
  const mockCommunity = mockCommunities[0];
  const mockPost = mockCommunityPosts[0];
  const mockMembership = {
    userId: '0x1234567890123456789012345678901234567890',
    communityId: mockCommunity.id,
    role: 'member' as const,
    joinedAt: new Date(),
    reputation: 100,
    contributions: 5
  };

  const defaultProps = {
    post: mockPost,
    community: mockCommunity,
    userMembership: mockMembership,
    onVote: jest.fn(),
    onReaction: jest.fn(),
    onTip: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders post content correctly', () => {
    render(<CommunityPostCard {...defaultProps} />);
    expect(screen.getByText(mockPost.content)).toBeInTheDocument();
  });

  it('displays vote score correctly', () => {
    render(<CommunityPostCard {...defaultProps} />);
    const voteScore = mockPost.upvotes - mockPost.downvotes;
    expect(screen.getByText(voteScore > 0 ? `+${voteScore}` : voteScore.toString())).toBeInTheDocument();
  });

  it('shows web3 reactions for members', () => {
    render(<CommunityPostCard {...defaultProps} />);
    // Check for reaction emojis
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('💎')).toBeInTheDocument();
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('⚖️')).toBeInTheDocument();
  });

  it('displays post tags with web3 styling', () => {
    render(<CommunityPostCard {...defaultProps} />);
    mockPost.tags?.forEach(tag => {
      expect(screen.getByText(`#${tag}`)).toBeInTheDocument();
    });
  });

  it('shows tip button for members', () => {
    render(<CommunityPostCard {...defaultProps} />);
    expect(screen.getByText('Tip')).toBeInTheDocument();
  });

  it('shows analytics button', () => {
    render(<CommunityPostCard {...defaultProps} />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('displays staked tokens amount', () => {
    render(<CommunityPostCard {...defaultProps} />);
    expect(screen.getByText(/\d+ \$LNK staked/)).toBeInTheDocument();
  });
});