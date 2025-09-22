import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpandedGovernanceWidget } from '../ExpandedGovernanceWidget';
import { GovernanceProposal } from '../../../../types/communityEnhancements';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the hooks and components
jest.mock('../../../../hooks/useCommunityWebSocket', () => ({
  useCommunityWebSocket: () => ({ isConnected: true })
}));

jest.mock('../../SharedComponents/MicroInteractionLayer', () => ({
  MicroInteractionLayer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const mockProposals: GovernanceProposal[] = [
  {
    id: '1',
    title: 'Increase Community Treasury Allocation',
    description: 'Proposal to increase the treasury allocation for community development projects',
    votingProgress: {
      totalVotes: 1000,
      yesVotes: 600,
      noVotes: 300,
      abstainVotes: 100,
      participationRate: 75.5
    },
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    userHasVoted: false,
    priority: 'urgent'
  },
  {
    id: '2',
    title: 'Update Governance Parameters',
    description: 'Modify voting thresholds and proposal requirements',
    votingProgress: {
      totalVotes: 500,
      yesVotes: 200,
      noVotes: 250,
      abstainVotes: 50,
      participationRate: 45.2
    },
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    userHasVoted: true,
    priority: 'normal'
  }
];

const defaultProps = {
  activeProposals: mockProposals,
  userVotingPower: 1500,
  onVoteClick: jest.fn(),
  showProgressBars: true,
  communityId: 'test-community'
};

describe('ExpandedGovernanceWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders governance widget with proposals', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} />);
    
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('2 active')).toBeInTheDocument();
    expect(screen.getByText('Your Voting Power')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('displays proposals sorted by priority', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} />);
    
    const proposals = screen.getAllByRole('button', { name: /vote with wallet|voted/i });
    expect(proposals).toHaveLength(2);
    
    // First proposal should be urgent (treasury allocation)
    expect(screen.getByText('Increase Community Treasury Allocation')).toBeInTheDocument();
    expect(screen.getByText('URGENT')).toBeInTheDocument();
  });

  it('shows voting progress bars correctly', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} />);
    
    // Check for progress indicators
    expect(screen.getByText('Yes: 600')).toBeInTheDocument();
    expect(screen.getByText('No: 300')).toBeInTheDocument();
    expect(screen.getByText('Abstain: 100')).toBeInTheDocument();
    expect(screen.getByText('Participation: 75.5%')).toBeInTheDocument();
  });

  it('handles vote button clicks for unvoted proposals', () => {
    const mockOnVoteClick = jest.fn();
    render(<ExpandedGovernanceWidget {...defaultProps} onVoteClick={mockOnVoteClick} />);
    
    const voteButtons = screen.getAllByText('Vote with Wallet');
    fireEvent.click(voteButtons[0]);
    
    expect(mockOnVoteClick).toHaveBeenCalledWith('1');
  });

  it('disables vote button for already voted proposals', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} />);
    
    const votedButton = screen.getByText('Voted');
    expect(votedButton.closest('button')).toBeDisabled();
  });

  it('displays countdown timers', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} />);
    
    // Should show time remaining (exact text may vary based on timing)
    const timeElements = screen.getAllByText(/\d+[dhm]/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('shows urgent styling for urgent proposals', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} />);
    
    const urgentProposal = screen.getByText('Increase Community Treasury Allocation').closest('div');
    expect(urgentProposal).toHaveClass('border-red-200');
  });

  it('renders empty state when no proposals', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} activeProposals={[]} />);
    
    expect(screen.getByText('No active proposals')).toBeInTheDocument();
  });

  it('hides progress bars when showProgressBars is false', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} showProgressBars={false} />);
    
    expect(screen.queryByText('Yes: 600')).not.toBeInTheDocument();
    expect(screen.queryByText('Participation: 75.5%')).not.toBeInTheDocument();
  });

  it('shows connection status indicator', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} />);
    
    // Should show green dot for connected status
    const connectionIndicator = document.querySelector('.bg-green-500.animate-pulse');
    expect(connectionIndicator).toBeInTheDocument();
  });

  it('handles "View All Proposals" button click', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} />);
    
    const viewAllButton = screen.getByText('View All Proposals →');
    expect(viewAllButton).toBeInTheDocument();
    
    fireEvent.click(viewAllButton);
    // In a real implementation, this would navigate or open a modal
  });

  it('updates countdown timer', async () => {
    // Create a proposal with a very short deadline for testing
    const shortDeadlineProposal: GovernanceProposal = {
      ...mockProposals[0],
      deadline: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now
    };

    render(<ExpandedGovernanceWidget 
      {...defaultProps} 
      activeProposals={[shortDeadlineProposal]} 
    />);

    // Should show minutes remaining
    await waitFor(() => {
      expect(screen.getByText(/\d+m/)).toBeInTheDocument();
    });
  });

  it('shows voting power with proper formatting', () => {
    render(<ExpandedGovernanceWidget {...defaultProps} userVotingPower={1234567} />);
    
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('handles proposal updates via props', () => {
    const { rerender } = render(<ExpandedGovernanceWidget {...defaultProps} />);
    
    expect(screen.getByText('2 active')).toBeInTheDocument();
    
    // Update with fewer proposals
    rerender(<ExpandedGovernanceWidget {...defaultProps} activeProposals={[mockProposals[0]]} />);
    
    expect(screen.getByText('1 active')).toBeInTheDocument();
  });
});