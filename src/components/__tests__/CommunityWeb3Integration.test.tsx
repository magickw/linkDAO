import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Web3Provider } from '@/context/Web3Context';
import { ToastProvider } from '@/context/ToastContext';
import CommunityGovernance from '../CommunityGovernance';
import StakingVoteButton from '../StakingVoteButton';
import CommunityTipButton from '../CommunityTipButton';
import { Community } from '@/models/Community';

// Mock the web3 service
jest.mock('@/services/communityWeb3Service', () => ({
  communityWeb3Service: {
    getCommunityProposals: jest.fn().mockResolvedValue([
      {
        id: 'prop_1',
        title: 'Test Proposal',
        description: 'A test governance proposal',
        proposer: '0x1234567890123456789012345678901234567890',
        communityId: 'test-community',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() + 6 * 86400000),
        forVotes: '1250.5',
        againstVotes: '340.2',
        quorum: '1000.0',
        status: 'active' as const,
        actions: []
      }
    ]),
    getVotingPower: jest.fn().mockResolvedValue('100.5'),
    createGovernanceProposal: jest.fn().mockResolvedValue('new_proposal_id'),
    voteOnProposal: jest.fn().mockResolvedValue('0x123...'),
    checkStakingRequirement: jest.fn().mockResolvedValue({
      canPerform: true,
      requiredStake: '1.0',
      currentStake: '5.0'
    }),
    stakeOnVote: jest.fn().mockResolvedValue('0x456...'),
    tipCommunityPost: jest.fn().mockResolvedValue('0x789...')
  }
}));

// Mock useWeb3 hook
const mockUseWeb3 = {
  isConnected: true,
  address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  balance: '100.0',
  chainId: 1
};

jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => mockUseWeb3,
  Web3Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock useToast hook
const mockAddToast = jest.fn();
jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const mockCommunity: Community = {
  id: 'test-community',
  name: 'test-community',
  displayName: 'Test Community',
  description: 'A test community for web3 features',
  rules: ['Be respectful', 'No spam'],
  memberCount: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: 'Technology',
  tags: ['web3', 'defi'],
  isPublic: true,
  moderators: [],
  governanceToken: 'TEST',
  settings: {
    allowedPostTypes: [],
    requireApproval: false,
    minimumReputation: 0,
    stakingRequirements: []
  }
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Web3Provider>
    <ToastProvider>
      {children}
    </ToastProvider>
  </Web3Provider>
);

describe('Community Web3 Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CommunityGovernance', () => {
    it('renders governance proposals correctly', async () => {
      render(
        <TestWrapper>
          <CommunityGovernance community={mockCommunity} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Community Governance')).toBeInTheDocument();
        expect(screen.getByText('Test Proposal')).toBeInTheDocument();
        expect(screen.getByText('100.5 TEST')).toBeInTheDocument();
      });
    });

    it('allows creating new proposals', async () => {
      render(
        <TestWrapper>
          <CommunityGovernance community={mockCommunity} />
        </TestWrapper>
      );

      await waitFor(() => {
        const createButton = screen.getByText('Create Proposal');
        fireEvent.click(createButton);
      });

      expect(screen.getByText('Create New Proposal')).toBeInTheDocument();
    });

    it('allows voting on proposals', async () => {
      render(
        <TestWrapper>
          <CommunityGovernance community={mockCommunity} />
        </TestWrapper>
      );

      await waitFor(() => {
        const voteForButton = screen.getByText('Vote For');
        fireEvent.click(voteForButton);
      });

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.stringContaining('Vote cast successfully'),
        'success'
      );
    });
  });

  describe('StakingVoteButton', () => {
    const mockOnVote = jest.fn();

    it('renders vote button correctly', () => {
      render(
        <TestWrapper>
          <StakingVoteButton
            postId="test-post"
            communityId="test-community"
            voteType="upvote"
            onVote={mockOnVote}
          />
        </TestWrapper>
      );

      const voteButton = screen.getByRole('button');
      expect(voteButton).toBeInTheDocument();
    });

    it('shows staking modal when staking is required', async () => {
      render(
        <TestWrapper>
          <StakingVoteButton
            postId="test-post"
            communityId="test-community"
            voteType="upvote"
            onVote={mockOnVote}
          />
        </TestWrapper>
      );

      const voteButton = screen.getByRole('button');
      fireEvent.click(voteButton);

      await waitFor(() => {
        expect(screen.getByText('Stake to Upvote')).toBeInTheDocument();
      });
    });
  });

  describe('CommunityTipButton', () => {
    const mockOnTip = jest.fn();

    it('renders tip button correctly', () => {
      render(
        <TestWrapper>
          <CommunityTipButton
            postId="test-post"
            recipientAddress="0x1234567890123456789012345678901234567890"
            communityId="test-community"
            onTip={mockOnTip}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Tip')).toBeInTheDocument();
    });

    it('opens tip modal when clicked', () => {
      render(
        <TestWrapper>
          <CommunityTipButton
            postId="test-post"
            recipientAddress="0x1234567890123456789012345678901234567890"
            communityId="test-community"
            onTip={mockOnTip}
          />
        </TestWrapper>
      );

      const tipButton = screen.getByText('Tip');
      fireEvent.click(tipButton);

      expect(screen.getByText('Send Tip')).toBeInTheDocument();
    });

    it('shows supported tokens in modal', () => {
      render(
        <TestWrapper>
          <CommunityTipButton
            postId="test-post"
            recipientAddress="0x1234567890123456789012345678901234567890"
            communityId="test-community"
            onTip={mockOnTip}
          />
        </TestWrapper>
      );

      const tipButton = screen.getByText('Tip');
      fireEvent.click(tipButton);

      expect(screen.getByText('LinkDAO Token (LDAO)')).toBeInTheDocument();
      expect(screen.getByText('USD Coin (USDC)')).toBeInTheDocument();
    });
  });

  describe('Web3 Service Integration', () => {
    it('handles staking requirements correctly', async () => {
      const { communityWeb3Service } = require('@/services/communityWeb3Service');
      
      const result = await communityWeb3Service.checkStakingRequirement(
        'test-community',
        '0x1234567890123456789012345678901234567890',
        'vote'
      );

      expect(result.canPerform).toBe(true);
      expect(result.requiredStake).toBe('1.0');
      expect(result.currentStake).toBe('5.0');
    });

    it('handles governance proposals correctly', async () => {
      const { communityWeb3Service } = require('@/services/communityWeb3Service');
      
      const proposals = await communityWeb3Service.getCommunityProposals('test-community');
      
      expect(proposals).toHaveLength(1);
      expect(proposals[0].title).toBe('Test Proposal');
      expect(proposals[0].status).toBe('active');
    });

    it('handles voting power calculation', async () => {
      const { communityWeb3Service } = require('@/services/communityWeb3Service');
      
      const votingPower = await communityWeb3Service.getVotingPower(
        'test-community',
        '0x1234567890123456789012345678901234567890'
      );

      expect(votingPower).toBe('100.5');
    });
  });
});