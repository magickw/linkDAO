import React from 'react';
import { render, screen } from '@testing-library/react';
import { EnhancedRightSidebar } from '../EnhancedRightSidebar';
import { GovernanceProposal, WalletActivity } from '../../../../types/communityEnhancements';

// Mock the child components
jest.mock('../ExpandedGovernanceWidget', () => ({
  ExpandedGovernanceWidget: ({ activeProposals }: { activeProposals: GovernanceProposal[] }) => (
    <div data-testid="governance-widget">
      Governance Widget - {activeProposals.length} proposals
    </div>
  )
}));

jest.mock('../WalletActivityFeed', () => ({
  WalletActivityFeed: ({ activities }: { activities: WalletActivity[] }) => (
    <div data-testid="wallet-activity-feed">
      Wallet Activity Feed - {activities.length} activities
    </div>
  )
}));

jest.mock('../SuggestedCommunitiesWidget', () => ({
  SuggestedCommunitiesWidget: ({ suggestedCommunities }: { suggestedCommunities: any[] }) => (
    <div data-testid="suggested-communities-widget">
      Suggested Communities Widget - {suggestedCommunities.length} suggestions
    </div>
  )
}));

const mockProposals: GovernanceProposal[] = [
  {
    id: '1',
    title: 'Test Proposal',
    description: 'Test Description',
    votingProgress: {
      totalVotes: 100,
      yesVotes: 60,
      noVotes: 30,
      abstainVotes: 10,
      participationRate: 75
    },
    deadline: new Date(),
    userHasVoted: false,
    priority: 'normal'
  }
];

const mockActivities: WalletActivity[] = [
  {
    id: '1',
    type: 'tip_received',
    amount: 100,
    token: 'LDAO',
    timestamp: new Date(),
    description: 'Received tip',
    celebratory: true
  }
];

const mockSuggestedCommunities = [
  {
    id: '1',
    name: 'Test Community',
    description: 'Test Description',
    memberCount: 1000,
    icon: '/test-icon.png',
    bannerImage: '/test-banner.png',
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
      postsToday: 10,
      activeMembers: 100,
      trendingScore: 50,
      engagementRate: 0.5,
      activityLevel: 'medium' as const
    },
    governance: {
      activeProposals: 1,
      userVotingPower: 0,
      participationRate: 50,
      nextDeadline: new Date()
    },
    mutualMemberCount: 5,
    trendingScore: 50,
    joinReason: 'mutual_connections' as const,
    previewStats: {
      recentPosts: 20,
      activeDiscussions: 5,
      weeklyGrowth: 10
    }
  }
];

const defaultProps = {
  activeProposals: mockProposals,
  userVotingPower: 1000,
  onVoteClick: jest.fn(),
  walletActivities: mockActivities,
  onActivityClick: jest.fn(),
  suggestedCommunities: mockSuggestedCommunities,
  onJoinCommunity: jest.fn(),
  onCommunityClick: jest.fn(),
  communityId: 'test-community'
};

describe('EnhancedRightSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all widgets by default', () => {
    render(<EnhancedRightSidebar {...defaultProps} />);
    
    expect(screen.getByTestId('governance-widget')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-activity-feed')).toBeInTheDocument();
    expect(screen.getByTestId('suggested-communities-widget')).toBeInTheDocument();
  });

  it('passes correct data to governance widget', () => {
    render(<EnhancedRightSidebar {...defaultProps} />);
    
    expect(screen.getByText('Governance Widget - 1 proposals')).toBeInTheDocument();
  });

  it('passes correct data to wallet activity feed', () => {
    render(<EnhancedRightSidebar {...defaultProps} />);
    
    expect(screen.getByText('Wallet Activity Feed - 1 activities')).toBeInTheDocument();
  });

  it('passes correct data to suggested communities widget', () => {
    render(<EnhancedRightSidebar {...defaultProps} />);
    
    expect(screen.getByText('Suggested Communities Widget - 1 suggestions')).toBeInTheDocument();
  });

  it('hides governance widget when showGovernance is false', () => {
    render(<EnhancedRightSidebar {...defaultProps} showGovernance={false} />);
    
    expect(screen.queryByTestId('governance-widget')).not.toBeInTheDocument();
    expect(screen.getByTestId('wallet-activity-feed')).toBeInTheDocument();
    expect(screen.getByTestId('suggested-communities-widget')).toBeInTheDocument();
  });

  it('hides wallet activity feed when showWalletActivity is false', () => {
    render(<EnhancedRightSidebar {...defaultProps} showWalletActivity={false} />);
    
    expect(screen.getByTestId('governance-widget')).toBeInTheDocument();
    expect(screen.queryByTestId('wallet-activity-feed')).not.toBeInTheDocument();
    expect(screen.getByTestId('suggested-communities-widget')).toBeInTheDocument();
  });

  it('hides suggested communities widget when showSuggestedCommunities is false', () => {
    render(<EnhancedRightSidebar {...defaultProps} showSuggestedCommunities={false} />);
    
    expect(screen.getByTestId('governance-widget')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-activity-feed')).toBeInTheDocument();
    expect(screen.queryByTestId('suggested-communities-widget')).not.toBeInTheDocument();
  });

  it('can hide all widgets', () => {
    render(
      <EnhancedRightSidebar 
        {...defaultProps} 
        showGovernance={false}
        showWalletActivity={false}
        showSuggestedCommunities={false}
      />
    );
    
    expect(screen.queryByTestId('governance-widget')).not.toBeInTheDocument();
    expect(screen.queryByTestId('wallet-activity-feed')).not.toBeInTheDocument();
    expect(screen.queryByTestId('suggested-communities-widget')).not.toBeInTheDocument();
  });

  it('renders widgets in correct order', () => {
    render(<EnhancedRightSidebar {...defaultProps} />);
    
    const widgets = screen.getAllByTestId(/governance-widget|wallet-activity-feed|suggested-communities-widget/);
    expect(widgets[0]).toHaveAttribute('data-testid', 'governance-widget');
    expect(widgets[1]).toHaveAttribute('data-testid', 'wallet-activity-feed');
    expect(widgets[2]).toHaveAttribute('data-testid', 'suggested-communities-widget');
  });

  it('handles empty data gracefully', () => {
    render(
      <EnhancedRightSidebar 
        {...defaultProps}
        activeProposals={[]}
        walletActivities={[]}
        suggestedCommunities={[]}
      />
    );
    
    expect(screen.getByText('Governance Widget - 0 proposals')).toBeInTheDocument();
    expect(screen.getByText('Wallet Activity Feed - 0 activities')).toBeInTheDocument();
    expect(screen.getByText('Suggested Communities Widget - 0 suggestions')).toBeInTheDocument();
  });

  it('applies proper spacing between widgets', () => {
    const { container } = render(<EnhancedRightSidebar {...defaultProps} />);
    
    const sidebarContainer = container.firstChild as HTMLElement;
    expect(sidebarContainer).toHaveClass('space-y-6');
  });
});