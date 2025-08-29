import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommunityView from '../CommunityView';
import { mockCommunities, mockCommunityPosts } from '@/mocks/communityMockData';

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({
    isConnected: true,
    address: '0x1234567890123456789012345678901234567890'
  })
}));

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

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

// Mock the services
jest.mock('@/services/communityService');
jest.mock('@/services/communityPostService');
jest.mock('@/services/communityMembershipService');

// Mock components that might have complex dependencies
jest.mock('../UnifiedPostCreation', () => {
  return function MockUnifiedPostCreation({ onSubmit, placeholder }: any) {
    return (
      <div data-testid="unified-post-creation">
        <input placeholder={placeholder} />
        <button onClick={() => onSubmit({ content: 'test post' })}>Post</button>
      </div>
    );
  };
});

jest.mock('../CommunityPostCard', () => {
  return function MockCommunityPostCard({ post, onVote }: any) {
    return (
      <div data-testid="community-post-card">
        <div>{post.content}</div>
        <button onClick={() => onVote(post.id, 'upvote')}>Upvote</button>
      </div>
    );
  };
});

describe('CommunityView', () => {
  const mockCommunity = mockCommunities[0];
  const mockPosts = mockCommunityPosts.filter(post => post.communityId === mockCommunity.id);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    const { CommunityService } = require('@/services/communityService');
    const { CommunityPostService } = require('@/services/communityPostService');
    const { CommunityMembershipService } = require('@/services/communityMembershipService');
    
    CommunityService.getCommunityById = jest.fn().mockResolvedValue(mockCommunity);
    CommunityPostService.getCommunityPosts = jest.fn().mockResolvedValue(mockPosts);
    CommunityMembershipService.getUserMembership = jest.fn().mockResolvedValue({
      userId: '0x1234567890123456789012345678901234567890',
      communityId: mockCommunity.id,
      role: 'member',
      joinedAt: new Date(),
      reputation: 100,
      contributions: 5
    });
  });

  it('renders community header with basic information', async () => {
    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText(mockCommunity.displayName)).toBeInTheDocument();
      expect(screen.getByText(`r/${mockCommunity.name} • ${mockCommunity.memberCount.toLocaleString()} members`)).toBeInTheDocument();
      expect(screen.getByText(mockCommunity.description)).toBeInTheDocument();
    });
  });

  it('shows join button for non-members', async () => {
    const { CommunityMembershipService } = require('@/services/communityMembershipService');
    CommunityMembershipService.getUserMembership = jest.fn().mockRejectedValue(new Error('Not a member'));

    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText('Join')).toBeInTheDocument();
    });
  });

  it('shows leave button for members', async () => {
    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText('Leave')).toBeInTheDocument();
    });
  });

  it('displays community rules when available', async () => {
    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText(`Community Rules (${mockCommunity.rules.length})`)).toBeInTheDocument();
    });

    // Click to expand rules
    fireEvent.click(screen.getByText(`Community Rules (${mockCommunity.rules.length})`));
    
    // Check if first rule is displayed
    expect(screen.getByText(mockCommunity.rules[0])).toBeInTheDocument();
  });

  it('renders post creation interface for members', async () => {
    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-post-creation')).toBeInTheDocument();
    });
  });

  it('does not show post creation for non-members', async () => {
    const { CommunityMembershipService } = require('@/services/communityMembershipService');
    CommunityMembershipService.getUserMembership = jest.fn().mockRejectedValue(new Error('Not a member'));

    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.queryByTestId('unified-post-creation')).not.toBeInTheDocument();
    });
  });

  it('displays sort controls', async () => {
    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText('Sort by:')).toBeInTheDocument();
      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Top')).toBeInTheDocument();
      expect(screen.getByText('Rising')).toBeInTheDocument();
    });
  });

  it('changes sort option when clicked', async () => {
    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText('Hot')).toBeInTheDocument();
    });

    // Click on "New" sort option
    fireEvent.click(screen.getByText('New'));

    // Verify the service was called with new sort option
    const { CommunityPostService } = require('@/services/communityPostService');
    await waitFor(() => {
      expect(CommunityPostService.getCommunityPosts).toHaveBeenCalledWith(
        mockCommunity.id,
        expect.objectContaining({ sortBy: 'new' })
      );
    });
  });

  it('shows timeframe selector for top sort', async () => {
    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText('Top')).toBeInTheDocument();
    });

    // Click on "Top" sort option
    fireEvent.click(screen.getByText('Top'));

    await waitFor(() => {
      expect(screen.getByText('from:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Past Day')).toBeInTheDocument();
    });
  });

  it('renders community posts', async () => {
    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      // Check if posts are rendered using the mock component
      expect(screen.getAllByTestId('community-post-card')).toHaveLength(mockPosts.length);
    }, { timeout: 3000 });
  });

  it('handles join community action', async () => {
    const { CommunityMembershipService } = require('@/services/communityMembershipService');
    CommunityMembershipService.getUserMembership = jest.fn().mockRejectedValue(new Error('Not a member'));
    CommunityMembershipService.joinCommunity = jest.fn().mockResolvedValue({
      userId: '0x1234567890123456789012345678901234567890',
      communityId: mockCommunity.id,
      role: 'member',
      joinedAt: new Date(),
      reputation: 0,
      contributions: 0
    });

    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText('Join')).toBeInTheDocument();
    });

    // Click join button
    fireEvent.click(screen.getByText('Join'));

    await waitFor(() => {
      expect(CommunityMembershipService.joinCommunity).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        mockCommunity.id
      );
    });
  });

  it('handles leave community action', async () => {
    const { CommunityMembershipService } = require('@/services/communityMembershipService');
    CommunityMembershipService.leaveCommunity = jest.fn().mockResolvedValue(undefined);

    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText('Leave')).toBeInTheDocument();
    });

    // Click leave button
    fireEvent.click(screen.getByText('Leave'));

    await waitFor(() => {
      expect(CommunityMembershipService.leaveCommunity).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        mockCommunity.id
      );
    });
  });

  it('shows empty state when no posts exist', async () => {
    const { CommunityPostService } = require('@/services/communityPostService');
    CommunityPostService.getCommunityPosts = jest.fn().mockResolvedValue([]);

    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText('No posts yet')).toBeInTheDocument();
      expect(screen.getByText('Be the first to start a discussion in this community!')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows error state when community not found', async () => {
    const { CommunityService } = require('@/services/communityService');
    CommunityService.getCommunityById = jest.fn().mockResolvedValue(null);

    render(<CommunityView communityId="nonexistent" />);

    await waitFor(() => {
      expect(screen.getByText('Community not found')).toBeInTheDocument();
      expect(screen.getByText("The community you're looking for doesn't exist or has been removed.")).toBeInTheDocument();
    });
  });

  it('displays community tags and category', async () => {
    render(<CommunityView communityId={mockCommunity.id} />);

    await waitFor(() => {
      expect(screen.getByText(mockCommunity.category)).toBeInTheDocument();
      
      // Check for first two tags (as per component logic)
      mockCommunity.tags.slice(0, 2).forEach(tag => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });
    });
  });
});