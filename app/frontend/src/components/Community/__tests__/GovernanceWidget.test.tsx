import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GovernanceWidget from '../GovernanceWidget';
import { 
  Proposal, 
  ProposalStatus, 
  ProposalCategory, 
  VoteChoice,
  GovernanceWidgetProps 
} from '../../../types/governance';

// Mock proposals for testing
const mockActiveProposal: Proposal = {
  id: 'prop_1',
  title: 'Increase Staking Rewards',
  description: 'Proposal to increase staking rewards for active community members by 25%',
  proposer: '0x1234567890123456789012345678901234567890',
  proposerReputation: 850,
  communityId: 'community_1',
  startTime: new Date(Date.now() - 86400000), // 1 day ago
  endTime: new Date(Date.now() + 6 * 86400000), // 6 days from now
  forVotes: '1250.5',
  againstVotes: '340.2',
  abstainVotes: '50.0',
  quorum: '1000.0',
  status: ProposalStatus.ACTIVE,
  actions: [],
  category: ProposalCategory.GOVERNANCE,
  executionDelay: 172800, // 2 days
  requiredMajority: 60,
  participationRate: 75.5,
  canVote: true
};

const mockClosedProposal: Proposal = {
  id: 'prop_2',
  title: 'Update Community Rules',
  description: 'Proposal to update community posting guidelines and moderation policies',
  proposer: '0x2345678901234567890123456789012345678901',
  proposerReputation: 920,
  communityId: 'community_1',
  startTime: new Date(Date.now() - 7 * 86400000), // 7 days ago
  endTime: new Date(Date.now() - 86400000), // 1 day ago
  forVotes: '2100.8',
  againstVotes: '150.3',
  abstainVotes: '25.0',
  quorum: '1000.0',
  status: ProposalStatus.SUCCEEDED,
  actions: [],
  category: ProposalCategory.COMMUNITY,
  executionDelay: 172800,
  requiredMajority: 60,
  participationRate: 85.2,
  canVote: false
};

const mockVotedProposal: Proposal = {
  ...mockActiveProposal,
  id: 'prop_3',
  title: 'Treasury Allocation',
  userVote: VoteChoice.FOR,
  canVote: false
};

const defaultProps: GovernanceWidgetProps = {
  activeProposals: [mockActiveProposal, mockClosedProposal],
  userVotingPower: 125.5,
  participationRate: 78.3,
  onVote: jest.fn(),
  onViewProposal: jest.fn(),
  loading: false,
  error: null
};

describe('GovernanceWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the widget with header and proposals', () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      expect(screen.getByText('Governance')).toBeInTheDocument();
      expect(screen.getByText('1 active')).toBeInTheDocument();
      expect(screen.getByText('Community Participation:')).toBeInTheDocument();
      expect(screen.getByText('78.3%')).toBeInTheDocument();
      expect(screen.getByText('Increase Staking Rewards')).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      render(<GovernanceWidget {...defaultProps} loading={true} />);
      
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(document.querySelector('.bg-gray-200')).toBeInTheDocument();
    });

    it('displays error state correctly', () => {
      const errorMessage = 'Failed to load proposals';
      render(<GovernanceWidget {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('displays empty state when no proposals exist', () => {
      render(<GovernanceWidget {...defaultProps} activeProposals={[]} />);
      
      expect(screen.getByText('No governance proposals at this time')).toBeInTheDocument();
    });
  });

  describe('Proposal Display', () => {
    it('shows active proposals with correct status styling', () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      const activeStatus = screen.getByText('Active');
      expect(activeStatus).toHaveClass('text-green-600', 'bg-green-100');
    });

    it('shows proposal category and time remaining for active proposals', () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      expect(screen.getByText('governance')).toBeInTheDocument();
      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });

    it('expands proposal details when clicked', async () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      // Find the expand button by looking for the chevron icon
      const expandButtons = screen.getAllByRole('button');
      const expandButton = expandButtons.find(button => 
        button.querySelector('svg path[d="M19 9l-7 7-7-7"]')
      );
      
      expect(expandButton).toBeDefined();
      fireEvent.click(expandButton!);
      
      await waitFor(() => {
        expect(screen.getByText(mockActiveProposal.description)).toBeInTheDocument();
      });
    });

    it('shows participation metrics when expanded', async () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      // Find the expand button by looking for the chevron icon
      const expandButtons = screen.getAllByRole('button');
      const expandButton = expandButtons.find(button => 
        button.querySelector('svg path[d="M19 9l-7 7-7-7"]')
      );
      
      expect(expandButton).toBeDefined();
      fireEvent.click(expandButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Quorum Progress')).toBeInTheDocument();
        expect(screen.getByText('Participation Rate')).toBeInTheDocument();
        expect(screen.getByText('Your Voting Power')).toBeInTheDocument();
      });
    });
  });

  describe('Voting Functionality', () => {
    it('displays voting buttons for active proposals', () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      expect(screen.getByText('For')).toBeInTheDocument();
      expect(screen.getByText('Against')).toBeInTheDocument();
      expect(screen.getByText('Abstain')).toBeInTheDocument();
    });

    it('calls onVote when voting button is clicked', async () => {
      const mockOnVote = jest.fn().mockResolvedValue(undefined);
      render(<GovernanceWidget {...defaultProps} onVote={mockOnVote} />);
      
      const forButton = screen.getByText('For');
      fireEvent.click(forButton);
      
      await waitFor(() => {
        expect(mockOnVote).toHaveBeenCalledWith('prop_1', VoteChoice.FOR);
      });
    });

    it('shows voting in progress state', async () => {
      const mockOnVote = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<GovernanceWidget {...defaultProps} onVote={mockOnVote} />);
      
      const forButton = screen.getByText('For');
      fireEvent.click(forButton);
      
      expect(screen.getByText('Voting...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Voting...')).not.toBeInTheDocument();
      });
    });

    it('disables voting buttons when user cannot vote', () => {
      const proposalWithNoVoting = { ...mockActiveProposal, canVote: false };
      render(<GovernanceWidget {...defaultProps} activeProposals={[proposalWithNoVoting]} />);
      
      const forButton = screen.getByText('For');
      expect(forButton).toHaveClass('cursor-not-allowed');
    });

    it('shows user vote status when already voted', () => {
      render(<GovernanceWidget {...defaultProps} activeProposals={[mockVotedProposal]} />);
      
      expect(screen.getByText('✓ For')).toBeInTheDocument();
    });
  });

  describe('Proposal Navigation', () => {
    it('calls onViewProposal when View Details is clicked', () => {
      const mockOnViewProposal = jest.fn();
      render(<GovernanceWidget {...defaultProps} onViewProposal={mockOnViewProposal} />);
      
      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);
      
      expect(mockOnViewProposal).toHaveBeenCalledWith('prop_1');
    });

    it('shows "Show All Proposals" button when there are closed proposals', () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      expect(screen.getByText('Show All Proposals (2)')).toBeInTheDocument();
    });

    it('expands to show all proposals when "Show All" is clicked', async () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      const showAllButton = screen.getByText('Show All Proposals (2)');
      fireEvent.click(showAllButton);
      
      await waitFor(() => {
        expect(screen.getByText('Update Community Rules')).toBeInTheDocument();
        expect(screen.getByText('Show Less')).toBeInTheDocument();
      });
    });
  });

  describe('Vote Count Formatting', () => {
    it('formats large vote counts correctly', async () => {
      const proposalWithLargeVotes: Proposal = {
        ...mockActiveProposal,
        forVotes: '1500000.5',
        againstVotes: '750000.2'
      };
      
      render(<GovernanceWidget {...defaultProps} activeProposals={[proposalWithLargeVotes]} />);
      
      // Find the expand button by looking for the chevron icon
      const expandButtons = screen.getAllByRole('button');
      const expandButton = expandButtons.find(button => 
        button.querySelector('svg path[d="M19 9l-7 7-7-7"]')
      );
      
      expect(expandButton).toBeDefined();
      fireEvent.click(expandButton!);
      
      await waitFor(() => {
        expect(screen.getByText(/1.5M/)).toBeInTheDocument();
        expect(screen.getByText(/750.0K/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Check that voting buttons have titles
      const forButton = screen.getByText('For');
      expect(forButton).toHaveAttribute('title');
    });

    it('supports keyboard navigation', () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      const forButton = screen.getByText('For');
      forButton.focus();
      expect(forButton).toHaveFocus();
    });
  });

  describe('Time Formatting', () => {
    it('displays correct time remaining format', () => {
      // Create a proposal ending in 2 hours and 30 minutes
      const proposalEndingSoon: Proposal = {
        ...mockActiveProposal,
        endTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000) // 2.5 hours from now
      };
      
      render(<GovernanceWidget {...defaultProps} activeProposals={[proposalEndingSoon]} />);
      
      expect(screen.getByText(/remaining/)).toBeInTheDocument();
      // Should show hours and minutes format
      expect(screen.getByText(/\d+h \d+m remaining/)).toBeInTheDocument();
    });

    it('shows "Voting ended" for expired proposals', () => {
      const expiredProposal: Proposal = {
        ...mockActiveProposal,
        endTime: new Date(Date.now() - 1000), // 1 second ago
        status: ProposalStatus.EXPIRED
      };
      
      render(<GovernanceWidget {...defaultProps} activeProposals={[expiredProposal]} />);
      
      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
    });
  });

  describe('Quorum Progress', () => {
    it('shows quorum progress correctly', async () => {
      render(<GovernanceWidget {...defaultProps} />);
      
      // Find the expand button by looking for the chevron icon
      const expandButtons = screen.getAllByRole('button');
      const expandButton = expandButtons.find(button => 
        button.querySelector('svg path[d="M19 9l-7 7-7-7"]')
      );
      
      expect(expandButton).toBeDefined();
      fireEvent.click(expandButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Quorum Progress')).toBeInTheDocument();
        // Total votes: 1250.5 + 340.2 + 50.0 = 1640.7
        // Quorum: 1000.0
        // Progress: 164.1%
        expect(screen.getByText('164.1%')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles voting errors gracefully', async () => {
      const mockOnVote = jest.fn().mockRejectedValue(new Error('Voting failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<GovernanceWidget {...defaultProps} onVote={mockOnVote} />);
      
      const forButton = screen.getByText('For');
      fireEvent.click(forButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error voting:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });
});