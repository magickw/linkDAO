import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SuggestedCommunitiesWidget } from '../SuggestedCommunitiesWidget';

// Mock the MicroInteractionLayer component
jest.mock('../../SharedComponents/MicroInteractionLayer', () => ({
  MicroInteractionLayer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const mockSuggestedCommunities = [
  {
    id: '1',
    name: 'DeFi Enthusiasts',
    description: 'A community for DeFi protocol discussions and yield farming strategies',
    memberCount: 15420,
    icon: '/images/defi-community.png',
    bannerImage: '/images/defi-banner.png',
    brandColors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#60A5FA'
    },
    userMembership: {
      isJoined: false,
      joinDate: new Date(),
      reputation: 0,
      tokenBalance: 0,
      role: 'member' as const
    },
    activityMetrics: {
      postsToday: 25,
      activeMembers: 1200,
      trendingScore: 85,
      engagementRate: 0.75,
      activityLevel: 'high' as const
    },
    governance: {
      activeProposals: 3,
      userVotingPower: 0,
      participationRate: 65,
      nextDeadline: new Date()
    },
    mutualMemberCount: 12,
    trendingScore: 85,
    joinReason: 'mutual_connections' as const,
    previewStats: {
      recentPosts: 45,
      activeDiscussions: 8,
      weeklyGrowth: 15
    }
  },
  {
    id: '2',
    name: 'NFT Collectors',
    description: 'Share and discover the latest NFT collections and market trends',
    memberCount: 8750,
    icon: '/images/nft-community.png',
    bannerImage: '/images/nft-banner.png',
    brandColors: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      accent: '#A78BFA'
    },
    userMembership: {
      isJoined: true,
      joinDate: new Date(),
      reputation: 150,
      tokenBalance: 500,
      role: 'member' as const
    },
    activityMetrics: {
      postsToday: 18,
      activeMembers: 650,
      trendingScore: 92,
      engagementRate: 0.68,
      activityLevel: 'high' as const
    },
    governance: {
      activeProposals: 1,
      userVotingPower: 500,
      participationRate: 45,
      nextDeadline: new Date()
    },
    mutualMemberCount: 5,
    trendingScore: 92,
    joinReason: 'trending' as const,
    previewStats: {
      recentPosts: 32,
      activeDiscussions: 12,
      weeklyGrowth: 22
    }
  },
  {
    id: '3',
    name: 'Web3 Developers',
    description: 'Technical discussions about blockchain development and smart contracts',
    memberCount: 5200,
    icon: '/images/dev-community.png',
    bannerImage: '/images/dev-banner.png',
    brandColors: {
      primary: '#10B981',
      secondary: '#059669',
      accent: '#34D399'
    },
    userMembership: {
      isJoined: false,
      joinDate: new Date(),
      reputation: 0,
      tokenBalance: 0,
      role: 'member' as const
    },
    activityMetrics: {
      postsToday: 12,
      activeMembers: 320,
      trendingScore: 45,
      engagementRate: 0.82,
      activityLevel: 'medium' as const
    },
    governance: {
      activeProposals: 0,
      userVotingPower: 0,
      participationRate: 78,
      nextDeadline: new Date()
    },
    mutualMemberCount: 0,
    trendingScore: 45,
    joinReason: 'similar_interests' as const,
    previewStats: {
      recentPosts: 28,
      activeDiscussions: 6,
      weeklyGrowth: 8
    }
  }
];

const defaultProps = {
  suggestedCommunities: mockSuggestedCommunities,
  onJoinCommunity: jest.fn().mockResolvedValue(true),
  onCommunityClick: jest.fn(),
  maxSuggestions: 5
};

describe('SuggestedCommunitiesWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders suggested communities widget with communities', () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    expect(screen.getByText('Suggested Communities')).toBeInTheDocument();
    expect(screen.getByText('3 suggestions')).toBeInTheDocument();
    expect(screen.getByText('DeFi Enthusiasts')).toBeInTheDocument();
    expect(screen.getByText('NFT Collectors')).toBeInTheDocument();
    expect(screen.getByText('Web3 Developers')).toBeInTheDocument();
  });

  it('displays community information correctly', () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    expect(screen.getByText('15,420 members')).toBeInTheDocument();
    expect(screen.getByText('8,750 members')).toBeInTheDocument();
    expect(screen.getByText('5,200 members')).toBeInTheDocument();
  });

  it('shows activity indicators correctly', () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    expect(screen.getAllByText('Very Active')).toHaveLength(2); // DeFi and NFT communities
    expect(screen.getByText('Active')).toBeInTheDocument(); // Web3 Developers
  });

  it('displays trending badges for high trending scores', () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    const trendingBadges = screen.getAllByText('🔥 Trending');
    expect(trendingBadges).toHaveLength(2); // DeFi (85) and NFT (92) communities
  });

  it('shows suggestion reasons correctly', () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    expect(screen.getByText('12 of your connections joined')).toBeInTheDocument();
    expect(screen.getByText('Trending in your network')).toBeInTheDocument();
    expect(screen.getByText('Based on your interests')).toBeInTheDocument();
  });

  it('handles join button clicks for unjoined communities', async () => {
    const mockOnJoin = jest.fn().mockResolvedValue(true);
    render(<SuggestedCommunitiesWidget {...defaultProps} onJoinCommunity={mockOnJoin} />);
    
    const joinButtons = screen.getAllByText('Join');
    fireEvent.click(joinButtons[0]);
    
    expect(mockOnJoin).toHaveBeenCalledWith('1');
    
    await waitFor(() => {
      expect(screen.getByText('Joined')).toBeInTheDocument();
    });
  });

  it('shows "Joined" status for already joined communities', () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    expect(screen.getByText('Joined')).toBeInTheDocument(); // NFT Collectors is already joined
  });

  it('handles community card clicks', () => {
    const mockOnCommunityClick = jest.fn();
    render(<SuggestedCommunitiesWidget {...defaultProps} onCommunityClick={mockOnCommunityClick} />);
    
    const communityCard = screen.getByText('DeFi Enthusiasts').closest('div');
    fireEvent.click(communityCard!);
    
    expect(mockOnCommunityClick).toHaveBeenCalledWith('1');
  });

  it('shows loading state during join process', async () => {
    const mockOnJoin = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
    render(<SuggestedCommunitiesWidget {...defaultProps} onJoinCommunity={mockOnJoin} />);
    
    const joinButtons = screen.getAllByText('Join');
    fireEvent.click(joinButtons[0]);
    
    expect(screen.getByText('Joining...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Joined')).toBeInTheDocument();
    });
  });

  it('sorts communities by priority (mutual connections first)', () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    const communityNames = screen.getAllByText(/DeFi Enthusiasts|NFT Collectors|Web3 Developers/);
    // DeFi Enthusiasts should be first (mutual_connections)
    expect(communityNames[0]).toHaveTextContent('DeFi Enthusiasts');
  });

  it('respects maxSuggestions limit', () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} maxSuggestions={2} />);
    
    expect(screen.getByText('2 suggestions')).toBeInTheDocument();
    expect(screen.getByText('DeFi Enthusiasts')).toBeInTheDocument();
    expect(screen.getByText('NFT Collectors')).toBeInTheDocument();
    expect(screen.queryByText('Web3 Developers')).not.toBeInTheDocument();
  });

  it('renders empty state when no communities', () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} suggestedCommunities={[]} />);
    
    expect(screen.getByText('No community suggestions available')).toBeInTheDocument();
  });

  it('shows community preview on hover', async () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    const communityCard = screen.getByText('DeFi Enthusiasts').closest('div');
    fireEvent.mouseEnter(communityCard!);
    
    // Wait for hover timeout
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument(); // Recent posts in preview
      expect(screen.getByText('Posts this week')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('hides community preview on mouse leave', async () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    const communityCard = screen.getByText('DeFi Enthusiasts').closest('div');
    fireEvent.mouseEnter(communityCard!);
    fireEvent.mouseLeave(communityCard!);
    
    // Preview should not appear
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(screen.queryByText('Posts this week')).not.toBeInTheDocument();
  });

  it('handles join failure gracefully', async () => {
    const mockOnJoin = jest.fn().mockRejectedValue(new Error('Join failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<SuggestedCommunitiesWidget {...defaultProps} onJoinCommunity={mockOnJoin} />);
    
    const joinButtons = screen.getAllByText('Join');
    fireEvent.click(joinButtons[0]);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to join community:', expect.any(Error));
    });
    
    // Button should return to "Join" state
    expect(screen.getAllByText('Join')).toHaveLength(2);
    
    consoleSpy.mockRestore();
  });

  it('prevents event propagation on join button click', () => {
    const mockOnCommunityClick = jest.fn();
    render(<SuggestedCommunitiesWidget {...defaultProps} onCommunityClick={mockOnCommunityClick} />);
    
    const joinButtons = screen.getAllByText('Join');
    fireEvent.click(joinButtons[0]);
    
    // Community click should not be triggered
    expect(mockOnCommunityClick).not.toHaveBeenCalled();
  });

  it('shows "Discover More Communities" button', () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    expect(screen.getByText('Discover More Communities →')).toBeInTheDocument();
  });

  it('updates communities when prop changes', () => {
    const { rerender } = render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    expect(screen.getByText('3 suggestions')).toBeInTheDocument();
    
    // Update with fewer communities
    rerender(<SuggestedCommunitiesWidget {...defaultProps} suggestedCommunities={[mockSuggestedCommunities[0]]} />);
    
    expect(screen.getByText('1 suggestions')).toBeInTheDocument();
  });

  it('shows mutual member count in preview', async () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    const communityCard = screen.getByText('DeFi Enthusiasts').closest('div');
    fireEvent.mouseEnter(communityCard!);
    
    await waitFor(() => {
      expect(screen.getByText('12 of your connections are members')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows growth indicator in preview', async () => {
    render(<SuggestedCommunitiesWidget {...defaultProps} />);
    
    const communityCard = screen.getByText('DeFi Enthusiasts').closest('div');
    fireEvent.mouseEnter(communityCard!);
    
    await waitFor(() => {
      expect(screen.getByText('+15% this week')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});