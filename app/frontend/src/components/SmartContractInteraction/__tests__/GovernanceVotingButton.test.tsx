import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GovernanceVotingButton } from '../GovernanceVotingButton';
import { Proposal, VoteChoice } from '@/types/governance';

// Mock Web3 hooks
jest.mock('@/hooks/useWeb3', () => ({
  useWeb3: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    chainId: 1,
  }),
}));

// Mock governance service
jest.mock('@/services/web3/governanceService', () => ({
  submitVote: jest.fn(),
  getVotingPower: jest.fn(() => Promise.resolve(100)),
  estimateVoteGasCost: jest.fn(() => Promise.resolve('0.005')),
}));

describe('GovernanceVotingButton', () => {
  const mockProposal: Proposal = {
    id: 'proposal-123',
    title: 'Increase Community Treasury Allocation',
    description: 'Proposal to increase the community treasury allocation from 10% to 15%',
    proposer: '0x9876543210987654321098765432109876543210',
    status: 'active',
    votingPower: {
      for: 1500,
      against: 500,
      abstain: 100,
    },
    startTime: new Date('2024-01-01'),
    endTime: new Date('2024-01-15'),
    onChainId: 'prop-123',
    contractAddress: '0x1111222233334444555566667777888899990000',
  };

  const mockProps = {
    proposal: mockProposal,
    userVotingPower: 100,
    onVote: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders voting button with proposal title', () => {
    render(<GovernanceVotingButton {...mockProps} />);

    expect(screen.getByText('Vote on Proposal')).toBeInTheDocument();
    expect(screen.getByText('Increase Community Treasury Allocation')).toBeInTheDocument();
  });

  it('displays user voting power', () => {
    render(<GovernanceVotingButton {...mockProps} />);

    expect(screen.getByText('Your Voting Power: 100')).toBeInTheDocument();
  });

  it('shows voting options when clicked', async () => {
    render(<GovernanceVotingButton {...mockProps} />);

    const voteButton = screen.getByText('Vote on Proposal');
    fireEvent.click(voteButton);

    await waitFor(() => {
      expect(screen.getByText('Cast Your Vote')).toBeInTheDocument();
      expect(screen.getByText('For')).toBeInTheDocument();
      expect(screen.getByText('Against')).toBeInTheDocument();
      expect(screen.getByText('Abstain')).toBeInTheDocument();
    });
  });

  it('displays current voting results', async () => {
    render(<GovernanceVotingButton {...mockProps} />);

    fireEvent.click(screen.getByText('Vote on Proposal'));

    await waitFor(() => {
      expect(screen.getByText('Current Results')).toBeInTheDocument();
      expect(screen.getByText('For: 1,500 votes (71.4%)')).toBeInTheDocument();
      expect(screen.getByText('Against: 500 votes (23.8%)')).toBeInTheDocument();
      expect(screen.getByText('Abstain: 100 votes (4.8%)')).toBeInTheDocument();
    });
  });

  it('estimates gas cost when vote option is selected', async () => {
    const mockEstimateVoteGasCost = require('@/services/web3/governanceService').estimateVoteGasCost;
    
    render(<GovernanceVotingButton {...mockProps} />);

    fireEvent.click(screen.getByText('Vote on Proposal'));

    await waitFor(() => {
      const forButton = screen.getByText('For');
      fireEvent.click(forButton);
    });

    await waitFor(() => {
      expect(mockEstimateVoteGasCost).toHaveBeenCalledWith(mockProposal.id, 'for');
      expect(screen.getByText('Estimated Gas: ~$0.005')).toBeInTheDocument();
    });
  });

  it('submits vote when confirm button is clicked', async () => {
    render(<GovernanceVotingButton {...mockProps} />);

    fireEvent.click(screen.getByText('Vote on Proposal'));

    await waitFor(() => {
      const forButton = screen.getByText('For');
      fireEvent.click(forButton);
      
      const confirmButton = screen.getByText('Confirm Vote');
      fireEvent.click(confirmButton);
    });

    expect(mockProps.onVote).toHaveBeenCalledWith(mockProposal.id, 'for');
  });

  it('shows loading state during vote submission', async () => {
    const slowOnVote = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<GovernanceVotingButton {...mockProps} onVote={slowOnVote} />);

    fireEvent.click(screen.getByText('Vote on Proposal'));

    await waitFor(() => {
      const forButton = screen.getByText('For');
      fireEvent.click(forButton);
      
      const confirmButton = screen.getByText('Confirm Vote');
      fireEvent.click(confirmButton);
    });

    expect(screen.getByText('Submitting Vote...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('is disabled when proposal is not active', () => {
    const inactiveProposal = { ...mockProposal, status: 'passed' as const };
    
    render(<GovernanceVotingButton {...mockProps} proposal={inactiveProposal} />);

    const voteButton = screen.getByText('Vote on Proposal');
    expect(voteButton).toBeDisabled();
    expect(screen.getByText('Voting Ended')).toBeInTheDocument();
  });

  it('is disabled when user has no voting power', () => {
    render(<GovernanceVotingButton {...mockProps} userVotingPower={0} />);

    const voteButton = screen.getByText('Vote on Proposal');
    expect(voteButton).toBeDisabled();
    expect(screen.getByText('No Voting Power')).toBeInTheDocument();
  });

  it('is disabled when explicitly disabled prop is true', () => {
    render(<GovernanceVotingButton {...mockProps} disabled={true} />);

    const voteButton = screen.getByText('Vote on Proposal');
    expect(voteButton).toBeDisabled();
  });

  it('shows proposal end time', async () => {
    render(<GovernanceVotingButton {...mockProps} />);

    fireEvent.click(screen.getByText('Vote on Proposal'));

    await waitFor(() => {
      expect(screen.getByText('Voting ends: Jan 15, 2024')).toBeInTheDocument();
    });
  });

  it('handles vote confirmation with different choices', async () => {
    const voteChoices: VoteChoice[] = ['for', 'against', 'abstain'];
    
    for (const choice of voteChoices) {
      const { rerender } = render(<GovernanceVotingButton {...mockProps} />);

      fireEvent.click(screen.getByText('Vote on Proposal'));

      await waitFor(() => {
        const choiceButton = screen.getByText(choice.charAt(0).toUpperCase() + choice.slice(1));
        fireEvent.click(choiceButton);
        
        const confirmButton = screen.getByText('Confirm Vote');
        fireEvent.click(confirmButton);
      });

      expect(mockProps.onVote).toHaveBeenCalledWith(mockProposal.id, choice);
      
      rerender(<div />); // Clear for next iteration
      jest.clearAllMocks();
    }
  });

  it('closes modal when cancel is clicked', async () => {
    render(<GovernanceVotingButton {...mockProps} />);

    fireEvent.click(screen.getByText('Vote on Proposal'));

    await waitFor(() => {
      expect(screen.getByText('Cast Your Vote')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Cast Your Vote')).not.toBeInTheDocument();
    });
  });

  it('shows error state when vote fails', async () => {
    const errorOnVote = jest.fn(() => Promise.reject(new Error('Transaction failed')));
    
    render(<GovernanceVotingButton {...mockProps} onVote={errorOnVote} />);

    fireEvent.click(screen.getByText('Vote on Proposal'));

    await waitFor(() => {
      const forButton = screen.getByText('For');
      fireEvent.click(forButton);
      
      const confirmButton = screen.getByText('Confirm Vote');
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Vote Failed')).toBeInTheDocument();
      expect(screen.getByText('Transaction failed')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('shows success state after successful vote', async () => {
    const successOnVote = jest.fn(() => Promise.resolve({ txHash: '0xabc123' }));
    
    render(<GovernanceVotingButton {...mockProps} onVote={successOnVote} />);

    fireEvent.click(screen.getByText('Vote on Proposal'));

    await waitFor(() => {
      const forButton = screen.getByText('For');
      fireEvent.click(forButton);
      
      const confirmButton = screen.getByText('Confirm Vote');
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Vote Submitted!')).toBeInTheDocument();
      expect(screen.getByText('Your vote has been recorded on-chain')).toBeInTheDocument();
    });
  });

  it('is accessible with proper ARIA labels', () => {
    render(<GovernanceVotingButton {...mockProps} />);

    const button = screen.getByText('Vote on Proposal');
    expect(button).toHaveAttribute('aria-label', 'Vote on governance proposal: Increase Community Treasury Allocation');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('handles wallet not connected state', () => {
    // Mock disconnected state
    jest.mocked(require('@/hooks/useWeb3').useWeb3).mockReturnValue({
      address: null,
      isConnected: false,
      chainId: null,
    });

    render(<GovernanceVotingButton {...mockProps} />);

    const button = screen.getByText('Connect Wallet to Vote');
    expect(button).toBeDisabled();
  });

  it('shows proposal description in modal', async () => {
    render(<GovernanceVotingButton {...mockProps} />);

    fireEvent.click(screen.getByText('Vote on Proposal'));

    await waitFor(() => {
      expect(screen.getByText('Proposal to increase the community treasury allocation from 10% to 15%')).toBeInTheDocument();
    });
  });

  it('displays proposer information', async () => {
    render(<GovernanceVotingButton {...mockProps} />);

    fireEvent.click(screen.getByText('Vote on Proposal'));

    await waitFor(() => {
      expect(screen.getByText('Proposed by: 0x9876...3210')).toBeInTheDocument();
    });
  });

  it('handles different proposal statuses correctly', () => {
    const statuses = [
      { status: 'passed', text: 'Proposal Passed' },
      { status: 'failed', text: 'Proposal Failed' },
      { status: 'executed', text: 'Proposal Executed' },
    ] as const;

    statuses.forEach(({ status, text }) => {
      const proposalWithStatus = { ...mockProposal, status };
      const { rerender } = render(<GovernanceVotingButton {...mockProps} proposal={proposalWithStatus} />);
      
      expect(screen.getByText(text)).toBeInTheDocument();
      
      rerender(<div />); // Clear for next iteration
    });
  });
});