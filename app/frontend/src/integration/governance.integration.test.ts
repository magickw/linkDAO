import { governanceService } from '../services/governanceService';
import { Proposal, ProposalStatus, ProposalCategory } from '../types/governance';

// Mock fetch globally
global.fetch = jest.fn();

describe('Governance Integration Tests', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockCommunityId = 'general';
  
  const mockProposal: Proposal = {
    id: 'prop_1',
    title: 'Test Governance Proposal',
    description: 'This is a test proposal for integration testing',
    type: 'general',
    proposer: mockUserAddress,
    proposerReputation: 850,
    communityId: mockCommunityId,
    startTime: new Date(Date.now() - 86400000), // 1 day ago
    endTime: new Date(Date.now() + 6 * 86400000), // 6 days from now
    forVotes: '1250.5',
    againstVotes: '340.2',
    abstainVotes: '50.0',
    quorum: '1000.0',
    status: ProposalStatus.ACTIVE,
    category: ProposalCategory.GOVERNANCE,
    executionDelay: 172800,
    requiredMajority: 60,
    participationRate: 75.5,
    canVote: true
  };

  const mockProposals: Proposal[] = [
    mockProposal,
    {
      id: 'prop_2',
      title: 'Second Test Proposal',
      description: 'Another test proposal for integration testing',
      type: 'general',
      proposer: '0xabcdef1234567890abcdef1234567890abcdef12',
      proposerReputation: 920,
      communityId: mockCommunityId,
      startTime: new Date(Date.now() - 2 * 86400000), // 2 days ago
      endTime: new Date(Date.now() + 5 * 86400000), // 5 days from now
      forVotes: '2100.8',
      againstVotes: '150.3',
      abstainVotes: '75.2',
      quorum: '1500.0',
      status: ProposalStatus.ACTIVE,
      category: ProposalCategory.FUNDING,
      executionDelay: 259200, // 3 days
      requiredMajority: 65,
      participationRate: 82.1,
      canVote: true
    }
  ];

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('Proposal Retrieval Flow', () => {
    it('should retrieve community proposals', async () => {
      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProposals),
      });

      const proposals = await governanceService.getCommunityProposals(mockCommunityId);
      expect(proposals).toEqual(mockProposals);
      expect(proposals.length).toBe(2);
      expect(proposals[0].id).toBe('prop_1');
      expect(proposals[0].title).toBe('Test Governance Proposal');
    });

    it('should retrieve a specific proposal by ID', async () => {
      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProposal),
      });

      const proposal = await governanceService.getProposal('prop_1');
      expect(proposal).toEqual(mockProposal);
      expect(proposal?.id).toBe('prop_1');
      expect(proposal?.title).toBe('Test Governance Proposal');
    });

    it('should retrieve active proposals', async () => {
      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProposals),
      });

      const activeProposals = await governanceService.getActiveProposals(mockCommunityId);
      expect(activeProposals).toEqual(mockProposals);
      expect(activeProposals.length).toBe(2);
      expect(activeProposals.every(p => p.status === ProposalStatus.ACTIVE)).toBe(true);
    });
  });

  describe('Proposal Creation Flow', () => {
    it('should create a new proposal', async () => {
      const newProposalData = {
        title: 'New Community Proposal',
        description: 'A new proposal created through the governance service',
        daoId: mockCommunityId,
        proposerId: mockUserAddress,
        category: 'General'
      };

      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          ...mockProposal,
          id: 'prop_3',
          title: newProposalData.title,
          description: newProposalData.description,
          proposer: newProposalData.proposerId
        }),
      });

      const createdProposal = await governanceService.createProposal(newProposalData);
      expect(createdProposal).not.toBeNull();
      expect(createdProposal?.title).toBe(newProposalData.title);
      expect(createdProposal?.description).toBe(newProposalData.description);
      expect(createdProposal?.proposer).toBe(newProposalData.proposerId);
    });
  });

  describe('Voting Flow', () => {
    it('should submit a vote on a proposal', async () => {
      // Mock successful vote submission
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ 
          success: true, 
          transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' 
        }),
      });

      const voteResult = await governanceService.voteOnProposal('prop_1', true);
      expect(voteResult.success).toBe(true);
      expect(voteResult.transactionHash).toBeDefined();
    });

    it('should handle voting errors gracefully', async () => {
      // Mock failed vote submission
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ 
          error: 'Invalid proposal ID' 
        }),
      });

      const voteResult = await governanceService.voteOnProposal('invalid_proposal', true);
      expect(voteResult.success).toBe(false);
      expect(voteResult.error).toBe('Invalid proposal ID');
    });
  });

  describe('User Voting Power Flow', () => {
    it('should retrieve user voting power', async () => {
      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ votingPower: 1250 }),
      });

      const votingPower = await governanceService.getUserVotingPower(mockCommunityId, mockUserAddress);
      expect(votingPower).toBe(1250);
    });
  });

  describe('Community Participation Flow', () => {
    it('should retrieve community participation rate', async () => {
      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ participationRate: 75.5 }),
      });

      const participationRate = await governanceService.getCommunityParticipationRate(mockCommunityId);
      expect(participationRate).toBe(75.5);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully when fetching proposals', async () => {
      // Mock API error
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Internal server error' }),
      });

      // Should return mock data when API fails
      const proposals = await governanceService.getCommunityProposals(mockCommunityId);
      expect(proposals).toHaveLength(3); // Should return mock proposals
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Should return mock data when network fails
      const proposals = await governanceService.getCommunityProposals(mockCommunityId);
      expect(proposals).toHaveLength(3); // Should return mock proposals
    });

    it('should return null for non-existent proposals', async () => {
      // Mock 404 response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const proposal = await governanceService.getProposal('nonexistent_proposal');
      expect(proposal).toBeNull();
    });
  });
});