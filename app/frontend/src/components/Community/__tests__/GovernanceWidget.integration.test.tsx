import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GovernanceWidget from '../GovernanceWidget';
import { governanceService } from '../../../services/governanceService';
import { VoteChoice } from '../../../types/governance';

// Mock the governance service
jest.mock('../../../services/governanceService', () => ({
  governanceService: {
    getCommunityProposals: jest.fn(),
    getUserVotingPower: jest.fn(),
    getCommunityParticipationRate: jest.fn(),
    voteOnProposal: jest.fn()
  }
}));

const mockGovernanceService = governanceService as jest.Mocked<typeof governanceService>;

describe('GovernanceWidget Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('integrates with governance service for voting', async () => {
    // Setup mock data
    const mockProposals = [
      {
        id: 'prop_1',
        title: 'Test Proposal',
        description: 'A test proposal',
        proposer: '0x123',
        communityId: 'community_1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() + 6 * 86400000),
        forVotes: '100',
        againstVotes: '50',
        abstainVotes: '10',
        quorum: '80',
        status: 'active' as any,
        actions: [],
        category: 'governance' as any,
        executionDelay: 172800,
        requiredMajority: 60,
        participationRate: 75,
        canVote: true
      }
    ];

    // Mock successful vote
    mockGovernanceService.voteOnProposal.mockResolvedValue({
      success: true,
      transactionHash: '0xabc123'
    });

    const mockOnVote = jest.fn().mockImplementation(async (proposalId: string, choice: VoteChoice) => {
      const result = await mockGovernanceService.voteOnProposal(proposalId, choice);
      if (result.success) {
        console.log('Vote successful');
      }
    });

    render(
      <GovernanceWidget
        activeProposals={mockProposals}
        userVotingPower={125.5}
        participationRate={75}
        onVote={mockOnVote}
        onViewProposal={jest.fn()}
      />
    );

    // Click the "For" vote button
    const forButton = screen.getByText('For');
    fireEvent.click(forButton);

    await waitFor(() => {
      expect(mockOnVote).toHaveBeenCalledWith('prop_1', VoteChoice.FOR);
      expect(mockGovernanceService.voteOnProposal).toHaveBeenCalledWith('prop_1', VoteChoice.FOR);
    });
  });

  it('handles voting errors gracefully', async () => {
    const mockProposals = [
      {
        id: 'prop_1',
        title: 'Test Proposal',
        description: 'A test proposal',
        proposer: '0x123',
        communityId: 'community_1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() + 6 * 86400000),
        forVotes: '100',
        againstVotes: '50',
        abstainVotes: '10',
        quorum: '80',
        status: 'active' as any,
        actions: [],
        category: 'governance' as any,
        executionDelay: 172800,
        requiredMajority: 60,
        participationRate: 75,
        canVote: true
      }
    ];

    // Mock failed vote
    mockGovernanceService.voteOnProposal.mockResolvedValue({
      success: false,
      error: 'Insufficient voting power'
    });

    const mockOnVote = jest.fn().mockImplementation(async (proposalId: string, choice: VoteChoice) => {
      const result = await mockGovernanceService.voteOnProposal(proposalId, choice);
      if (!result.success) {
        throw new Error(result.error);
      }
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <GovernanceWidget
        activeProposals={mockProposals}
        userVotingPower={125.5}
        participationRate={75}
        onVote={mockOnVote}
        onViewProposal={jest.fn()}
      />
    );

    // Click the "For" vote button
    const forButton = screen.getByText('For');
    fireEvent.click(forButton);

    await waitFor(() => {
      expect(mockOnVote).toHaveBeenCalledWith('prop_1', VoteChoice.FOR);
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('displays real-time voting updates', async () => {
    const initialProposals = [
      {
        id: 'prop_1',
        title: 'Test Proposal',
        description: 'A test proposal',
        proposer: '0x123',
        communityId: 'community_1',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() + 6 * 86400000),
        forVotes: '100',
        againstVotes: '50',
        abstainVotes: '10',
        quorum: '80',
        status: 'active' as any,
        actions: [],
        category: 'governance' as any,
        executionDelay: 172800,
        requiredMajority: 60,
        participationRate: 75,
        canVote: true
      }
    ];

    const { rerender } = render(
      <GovernanceWidget
        activeProposals={initialProposals}
        userVotingPower={125.5}
        participationRate={75}
        onVote={jest.fn()}
        onViewProposal={jest.fn()}
      />
    );

    // Expand to see vote counts
    const expandButtons = screen.getAllByRole('button');
    const expandButton = expandButtons.find(button => 
      button.querySelector('svg path[d="M19 9l-7 7-7-7"]')
    );
    fireEvent.click(expandButton!);

    await waitFor(() => {
      expect(screen.getByText(/100\.0/)).toBeInTheDocument(); // For votes
      expect(screen.getByText(/50\.0/)).toBeInTheDocument(); // Against votes
    });

    // Update proposals with new vote counts
    const updatedProposals = [
      {
        ...initialProposals[0],
        forVotes: '150',
        againstVotes: '60',
        userVote: VoteChoice.FOR,
        canVote: false
      }
    ];

    rerender(
      <GovernanceWidget
        activeProposals={updatedProposals}
        userVotingPower={125.5}
        participationRate={78}
        onVote={jest.fn()}
        onViewProposal={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/150\.0/)).toBeInTheDocument(); // Updated for votes
      expect(screen.getByText(/60\.0/)).toBeInTheDocument(); // Updated against votes
      expect(screen.getByText('✓ For')).toBeInTheDocument(); // User voted
    });
  });
});