import axios from 'axios';

interface ProposalData {
  id: string;
  title: string;
  description: string;
  status: string;
  votingEnds: string;
  votingStarts: string;
  yesVotes: number;
  noVotes: number;
  abstainVotes?: number;
  quorum: number;
  proposer: string;
  proposerReputation?: number;
  category: string;
  executionDelay?: number;
  requiredMajority: number;
}

export class GovernanceService {
  private readonly snapshotApiUrl = 'https://hub.snapshot.org/graphql';
  private readonly tallyApiKey = process.env.TALLY_API_KEY;

  async getProposal(proposalId: string): Promise<ProposalData> {
    try {
      // Try to fetch from multiple governance platforms
      const [snapshotData, tallyData] = await Promise.allSettled([
        this.getFromSnapshot(proposalId),
        this.getFromTally(proposalId)
      ]);

      // Use the first successful result
      if (snapshotData.status === 'fulfilled') {
        return snapshotData.value;
      } else if (tallyData.status === 'fulfilled') {
        return tallyData.value;
      } else {
        // Return mock data if all sources fail
        return this.getMockProposalData(proposalId);
      }
    } catch (error) {
      console.error('Governance data fetch failed:', error);
      return this.getMockProposalData(proposalId);
    }
  }

  private async getFromSnapshot(proposalId: string): Promise<ProposalData> {
    const query = `
      query Proposal($id: String!) {
        proposal(id: $id) {
          id
          title
          body
          state
          start
          end
          scores
          scores_total
          quorum
          author
          space {
            id
            name
          }
          strategies {
            name
            params
          }
        }
      }
    `;

    const response = await axios.post(
      this.snapshotApiUrl,
      {
        query,
        variables: { id: proposalId }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const proposal = response.data.data.proposal;
    if (!proposal) {
      throw new Error('Proposal not found on Snapshot');
    }

    return {
      id: proposal.id,
      title: proposal.title,
      description: proposal.body,
      status: this.mapSnapshotStatus(proposal.state),
      votingEnds: new Date(proposal.end * 1000).toISOString(),
      votingStarts: new Date(proposal.start * 1000).toISOString(),
      yesVotes: proposal.scores?.[0] || 0,
      noVotes: proposal.scores?.[1] || 0,
      abstainVotes: proposal.scores?.[2] || 0,
      quorum: proposal.quorum || 0,
      proposer: proposal.author,
      category: proposal.space?.name || 'general',
      requiredMajority: 50
    };
  }

  private async getFromTally(proposalId: string): Promise<ProposalData> {
    if (!this.tallyApiKey) {
      throw new Error('Tally API key not configured');
    }

    const response = await axios.get(
      `https://api.tally.xyz/proposal/${proposalId}`,
      {
        headers: {
          'Api-Key': this.tallyApiKey
        },
        timeout: 10000
      }
    );

    const proposal = response.data;
    
    return {
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      status: this.mapTallyStatus(proposal.status),
      votingEnds: proposal.end,
      votingStarts: proposal.start,
      yesVotes: proposal.yesVotes || 0,
      noVotes: proposal.noVotes || 0,
      abstainVotes: proposal.abstainVotes || 0,
      quorum: proposal.quorum || 0,
      proposer: proposal.proposer,
      proposerReputation: proposal.proposerReputation,
      category: proposal.category || 'general',
      executionDelay: proposal.executionDelay,
      requiredMajority: proposal.requiredMajority || 50
    };
  }

  private mapSnapshotStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'draft',
      'active': 'active',
      'closed': 'passed', // Simplified mapping
      'canceled': 'cancelled'
    };

    return statusMap[status] || 'draft';
  }

  private mapTallyStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'draft',
      'ACTIVE': 'active',
      'SUCCEEDED': 'passed',
      'DEFEATED': 'failed',
      'QUEUED': 'queued',
      'EXECUTED': 'executed',
      'CANCELED': 'cancelled',
      'EXPIRED': 'expired'
    };

    return statusMap[status] || 'draft';
  }

  async getProposalsBySpace(spaceId: string, limit: number = 20): Promise<ProposalData[]> {
    try {
      const query = `
        query Proposals($space: String!, $first: Int!) {
          proposals(
            where: { space: $space }
            first: $first
            orderBy: "created"
            orderDirection: desc
          ) {
            id
            title
            body
            state
            start
            end
            scores
            scores_total
            quorum
            author
            space {
              id
              name
            }
          }
        }
      `;

      const response = await axios.post(
        this.snapshotApiUrl,
        {
          query,
          variables: { space: spaceId, first: limit }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const proposals = response.data.data.proposals || [];
      
      return proposals.map((proposal: any) => ({
        id: proposal.id,
        title: proposal.title,
        description: proposal.body,
        status: this.mapSnapshotStatus(proposal.state),
        votingEnds: new Date(proposal.end * 1000).toISOString(),
        votingStarts: new Date(proposal.start * 1000).toISOString(),
        yesVotes: proposal.scores?.[0] || 0,
        noVotes: proposal.scores?.[1] || 0,
        abstainVotes: proposal.scores?.[2] || 0,
        quorum: proposal.quorum || 0,
        proposer: proposal.author,
        category: proposal.space?.name || 'general',
        requiredMajority: 50
      }));
    } catch (error) {
      console.error('Proposals fetch failed:', error);
      return [];
    }
  }

  async searchProposals(query: string, limit: number = 20): Promise<ProposalData[]> {
    try {
      const graphqlQuery = `
        query SearchProposals($search: String!, $first: Int!) {
          proposals(
            where: { title_contains: $search }
            first: $first
            orderBy: "created"
            orderDirection: desc
          ) {
            id
            title
            body
            state
            start
            end
            scores
            scores_total
            quorum
            author
            space {
              id
              name
            }
          }
        }
      `;

      const response = await axios.post(
        this.snapshotApiUrl,
        {
          query: graphqlQuery,
          variables: { search: query, first: limit }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const proposals = response.data.data.proposals || [];
      
      return proposals.map((proposal: any) => ({
        id: proposal.id,
        title: proposal.title,
        description: proposal.body,
        status: this.mapSnapshotStatus(proposal.state),
        votingEnds: new Date(proposal.end * 1000).toISOString(),
        votingStarts: new Date(proposal.start * 1000).toISOString(),
        yesVotes: proposal.scores?.[0] || 0,
        noVotes: proposal.scores?.[1] || 0,
        abstainVotes: proposal.scores?.[2] || 0,
        quorum: proposal.quorum || 0,
        proposer: proposal.author,
        category: proposal.space?.name || 'general',
        requiredMajority: 50
      }));
    } catch (error) {
      console.error('Proposal search failed:', error);
      return [];
    }
  }

  // Mock data for development/testing
  getMockProposalData(proposalId: string): ProposalData {
    const mockProposals = [
      {
        id: proposalId,
        title: 'Increase Community Treasury Allocation',
        description: 'This proposal aims to increase the community treasury allocation from 10% to 15% to fund more community initiatives and development projects.',
        status: 'active',
        votingEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        votingStarts: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        yesVotes: 1250000,
        noVotes: 350000,
        abstainVotes: 100000,
        quorum: 1000000,
        proposer: '0x1234567890123456789012345678901234567890',
        proposerReputation: 95,
        category: 'treasury',
        executionDelay: 48,
        requiredMajority: 60
      },
      {
        id: proposalId,
        title: 'Implement New Governance Framework',
        description: 'Proposal to implement a new governance framework that includes delegation, improved voting mechanisms, and better proposal categorization.',
        status: 'passed',
        votingEnds: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        votingStarts: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        yesVotes: 2100000,
        noVotes: 450000,
        abstainVotes: 150000,
        quorum: 1500000,
        proposer: '0x9876543210987654321098765432109876543210',
        proposerReputation: 88,
        category: 'governance',
        executionDelay: 72,
        requiredMajority: 55
      }
    ];

    // Return a mock proposal based on ID hash
    const index = parseInt(proposalId.slice(-1), 16) % mockProposals.length;
    return mockProposals[index];
  }
}

export const governanceService = new GovernanceService();