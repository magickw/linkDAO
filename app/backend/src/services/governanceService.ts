import axios from 'axios';
import { db } from '../db';
import { proposals, users, communities, votes, votingDelegations, votingPowerSnapshots, governanceSettings } from '../db/schema';
import { eq, desc, and, gte, lte, sql, sum } from 'drizzle-orm';

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
  daoId?: string;
  daoName?: string;
}

interface CreateProposalData {
  title: string;
  description: string;
  daoId?: string;
  proposerId: string;
  votingDuration?: number; // in hours
  category?: string;
  executionDelay?: number;
  requiredMajority?: number;
}

interface VoteData {
  proposalId: string;
  userId: string;
  vote: 'yes' | 'no' | 'abstain';
  votingPower?: number;
}

interface TreasuryData {
  daoId: string;
  totalValue: number;
  currency: string;
  tokens: Array<{
    symbol: string;
    balance: number;
    value: number;
    contractAddress?: string;
  }>;
  nfts?: Array<{
    collection: string;
    count: number;
    estimatedValue: number;
  }>;
  lastUpdated: Date;
}

interface VotingPower {
  userId: string;
  daoId: string;
  votingPower: number;
  delegatedPower?: number;
  totalPower: number;
  tokenBalance: number;
  stakingMultiplier?: number;
}

export class GovernanceService {
  private readonly snapshotApiUrl = 'https://hub.snapshot.org/graphql';
  private readonly tallyApiKey = process.env.TALLY_API_KEY;

  // Database operations for proposals
  async createProposal(data: CreateProposalData): Promise<ProposalData> {
    try {
      const votingEndTime = new Date();
      votingEndTime.setHours(votingEndTime.getHours() + (data.votingDuration || 168)); // Default 7 days

      const [newProposal] = await db.insert(proposals).values({
        daoId: data.daoId || null,
        titleCid: data.title, // Store title directly for now, can be moved to IPFS later
        bodyCid: data.description, // Store description directly for now
        startBlock: Math.floor(Date.now() / 1000), // Current timestamp as start
        endBlock: Math.floor(votingEndTime.getTime() / 1000), // End timestamp
        status: 'active'
      }).returning();

      return {
        id: newProposal.id.toString(),
        title: data.title,
        description: data.description,
        status: 'active',
        votingStarts: new Date().toISOString(),
        votingEnds: votingEndTime.toISOString(),
        yesVotes: 0,
        noVotes: 0,
        abstainVotes: 0,
        quorum: 1000, // Default quorum
        proposer: data.proposerId,
        category: data.category || 'general',
        executionDelay: data.executionDelay || 48,
        requiredMajority: data.requiredMajority || 50,
        daoId: data.daoId
      };
    } catch (error) {
      console.error('Error creating proposal:', error);
      throw new Error('Failed to create proposal');
    }
  }

  async getProposalsByDao(daoId: string, limit: number = 20): Promise<ProposalData[]> {
    try {
      const dbProposals = await db
        .select()
        .from(proposals)
        .where(eq(proposals.daoId, daoId))
        .orderBy(desc(proposals.id))
        .limit(limit);

      return dbProposals.map(proposal => ({
        id: proposal.id.toString(),
        title: proposal.titleCid || 'Untitled Proposal',
        description: proposal.bodyCid || 'No description available',
        status: proposal.status || 'pending',
        votingStarts: new Date((proposal.startBlock || 0) * 1000).toISOString(),
        votingEnds: new Date((proposal.endBlock || 0) * 1000).toISOString(),
        yesVotes: 0, // TODO: Calculate from votes table
        noVotes: 0,
        abstainVotes: 0,
        quorum: 1000,
        proposer: 'Unknown', // TODO: Get from proposer relation
        category: 'general',
        executionDelay: 48,
        requiredMajority: 50,
        daoId: proposal.daoId || undefined
      }));
    } catch (error) {
      console.error('Error fetching DAO proposals:', error);
      return [];
    }
  }

  async getAllActiveProposals(limit: number = 20): Promise<ProposalData[]> {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      
      const dbProposals = await db
        .select()
        .from(proposals)
        .where(
          and(
            eq(proposals.status, 'active'),
            gte(proposals.endBlock, currentTime)
          )
        )
        .orderBy(desc(proposals.id))
        .limit(limit);

      return dbProposals.map(proposal => ({
        id: proposal.id.toString(),
        title: proposal.titleCid || 'Untitled Proposal',
        description: proposal.bodyCid || 'No description available',
        status: proposal.status || 'pending',
        votingStarts: new Date((proposal.startBlock || 0) * 1000).toISOString(),
        votingEnds: new Date((proposal.endBlock || 0) * 1000).toISOString(),
        yesVotes: 0, // TODO: Calculate from votes table
        noVotes: 0,
        abstainVotes: 0,
        quorum: 1000,
        proposer: 'Unknown', // TODO: Get from proposer relation
        category: 'general',
        executionDelay: 48,
        requiredMajority: 50,
        daoId: proposal.daoId || undefined
      }));
    } catch (error) {
      console.error('Error fetching active proposals:', error);
      return [];
    }
  }

  async getProposal(proposalId: string): Promise<ProposalData> {
    try {
      // First try to get from database
      const dbProposal = await this.getProposalFromDb(proposalId);
      if (dbProposal) {
        return dbProposal;
      }

      // Fallback to external sources
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

  private async getProposalFromDb(proposalId: string): Promise<ProposalData | null> {
    try {
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(eq(proposals.id, parseInt(proposalId)))
        .limit(1);

      if (!proposal) {
        return null;
      }

      return {
        id: proposal.id.toString(),
        title: proposal.titleCid || 'Untitled Proposal',
        description: proposal.bodyCid || 'No description available',
        status: proposal.status || 'pending',
        votingStarts: new Date((proposal.startBlock || 0) * 1000).toISOString(),
        votingEnds: new Date((proposal.endBlock || 0) * 1000).toISOString(),
        yesVotes: 0, // TODO: Calculate from votes table
        noVotes: 0,
        abstainVotes: 0,
        quorum: 1000,
        proposer: 'Unknown', // TODO: Get from proposer relation
        category: 'general',
        executionDelay: 48,
        requiredMajority: 50,
        daoId: proposal.daoId || undefined
      };
    } catch (error) {
      console.error('Error fetching proposal from database:', error);
      return null;
    }
  }

  async voteOnProposal(voteData: VoteData): Promise<boolean> {
    try {
      // Validate the proposal exists and is active
      const proposal = await this.getProposalFromDb(voteData.proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      // Check if voting is still active
      const now = new Date();
      const votingEnd = new Date(proposal.votingEnds);
      if (now > votingEnd) {
        throw new Error('Voting period has ended');
      }

      // Calculate user's voting power
      const votingPower = await this.calculateVotingPower(voteData.userId, proposal.daoId || 'general');
      
      // Store the vote in the database
      await db.insert(votes).values({
        proposalId: parseInt(voteData.proposalId),
        voterId: voteData.userId,
        voteChoice: voteData.vote,
        votingPower: votingPower.votingPower.toString(),
        delegatedPower: votingPower.delegatedPower?.toString() || '0',
        totalPower: votingPower.totalPower.toString(),
        transactionHash: null, // TODO: Add blockchain transaction hash if applicable
      }).onConflictDoUpdate({
        target: [votes.proposalId, votes.voterId],
        set: {
          voteChoice: voteData.vote,
          votingPower: votingPower.votingPower.toString(),
          delegatedPower: votingPower.delegatedPower?.toString() || '0',
          totalPower: votingPower.totalPower.toString(),
        }
      });

      return true;
    } catch (error) {
      console.error('Error voting on proposal:', error);
      return false;
    }
  }

  private async calculateVotingPower(userId: string, daoId: string): Promise<VotingPower> {
    try {
      // Get user's base token balance (mock for now)
      const baseTokens = 100 + (parseInt(userId.slice(-2), 16) || 0) * 10;
      
      // Get delegated power from others
      const delegatedResult = await db
        .select({ totalDelegated: sum(votingDelegations.votingPower) })
        .from(votingDelegations)
        .where(
          and(
            eq(votingDelegations.delegateId, userId),
            eq(votingDelegations.daoId, daoId),
            eq(votingDelegations.active, true)
          )
        );
      
      const delegatedPower = parseFloat(delegatedResult[0]?.totalDelegated || '0');
      
      // Get governance settings for staking multiplier
      const [settings] = await db
        .select()
        .from(governanceSettings)
        .where(eq(governanceSettings.daoId, daoId))
        .limit(1);
      
      const stakingMultiplier = settings?.stakingEnabled 
        ? 1 + Math.random() * (parseFloat(settings.stakingMultiplierMax || '2.0') - 1)
        : 1.0;
      
      const votingPower = baseTokens * stakingMultiplier;
      const totalPower = votingPower + delegatedPower;
      
      return {
        userId,
        daoId,
        votingPower,
        delegatedPower,
        totalPower,
        tokenBalance: baseTokens,
        stakingMultiplier
      };
    } catch (error) {
      console.error('Error calculating voting power:', error);
      return this.getMockVotingPower(userId, daoId);
    }
  }

  async delegateVotingPower(
    delegatorId: string, 
    delegateId: string, 
    daoId: string, 
    votingPower: number
  ): Promise<boolean> {
    try {
      // Check if delegation already exists
      await db.insert(votingDelegations).values({
        delegatorId,
        delegateId,
        daoId,
        votingPower: votingPower.toString(),
        active: true,
      }).onConflictDoUpdate({
        target: [votingDelegations.delegatorId, votingDelegations.delegateId, votingDelegations.daoId],
        set: {
          votingPower: votingPower.toString(),
          active: true,
        }
      });

      return true;
    } catch (error) {
      console.error('Error delegating voting power:', error);
      return false;
    }
  }

  async revokeDelegation(delegatorId: string, delegateId: string, daoId: string): Promise<boolean> {
    try {
      await db
        .update(votingDelegations)
        .set({ active: false })
        .where(
          and(
            eq(votingDelegations.delegatorId, delegatorId),
            eq(votingDelegations.delegateId, delegateId),
            eq(votingDelegations.daoId, daoId)
          )
        );

      return true;
    } catch (error) {
      console.error('Error revoking delegation:', error);
      return false;
    }
  }

  async getUserVotingHistory(userId: string, daoId?: string): Promise<Array<{
    proposalId: string;
    proposalTitle: string;
    voteChoice: string;
    votingPower: number;
    createdAt: Date;
  }>> {
    try {
      const userVotes = await db
        .select({
          proposalId: votes.proposalId,
          proposalTitle: proposals.titleCid,
          voteChoice: votes.voteChoice,
          votingPower: votes.totalPower,
          createdAt: votes.createdAt,
        })
        .from(votes)
        .innerJoin(proposals, eq(votes.proposalId, proposals.id))
        .where(
          and(
            eq(votes.voterId, userId),
            daoId ? eq(proposals.daoId, daoId) : undefined
          )
        )
        .orderBy(desc(votes.createdAt));

      return userVotes.map(vote => ({
        proposalId: vote.proposalId.toString(),
        proposalTitle: vote.proposalTitle || 'Untitled Proposal',
        voteChoice: vote.voteChoice,
        votingPower: parseFloat(vote.votingPower || '0'),
        createdAt: vote.createdAt || new Date(),
      }));
    } catch (error) {
      console.error('Error fetching voting history:', error);
      return [];
    }
  }

  // Treasury integration methods
  async getDAOTreasuryData(daoId: string): Promise<TreasuryData> {
    try {
      // Try to fetch from on-chain data first
      const onChainData = await this.fetchOnChainTreasuryData(daoId);
      if (onChainData) {
        return onChainData;
      }

      // Fallback to mock data for development
      return this.getMockTreasuryData(daoId);
    } catch (error) {
      console.error('Error fetching treasury data:', error);
      return this.getMockTreasuryData(daoId);
    }
  }

  private async fetchOnChainTreasuryData(daoId: string): Promise<TreasuryData | null> {
    try {
      // TODO: Implement actual on-chain treasury data fetching
      // This would involve:
      // 1. Getting the DAO's treasury contract address
      // 2. Querying token balances
      // 3. Fetching current token prices
      // 4. Calculating total value
      
      // For now, return null to use mock data
      return null;
    } catch (error) {
      console.error('Error fetching on-chain treasury data:', error);
      return null;
    }
  }

  private getMockTreasuryData(daoId: string): TreasuryData {
    // Generate mock treasury data based on DAO ID
    const baseValue = 1000000 + (parseInt(daoId.slice(-2), 16) || 0) * 100000;
    
    return {
      daoId,
      totalValue: baseValue,
      currency: 'USD',
      tokens: [
        {
          symbol: 'ETH',
          balance: baseValue * 0.4 / 3000, // 40% in ETH at $3000
          value: baseValue * 0.4,
          contractAddress: '0x0000000000000000000000000000000000000000'
        },
        {
          symbol: 'USDC',
          balance: baseValue * 0.3,
          value: baseValue * 0.3,
          contractAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8'
        },
        {
          symbol: 'LDAO',
          balance: baseValue * 0.2 / 0.5, // 20% in LDAO at $0.50
          value: baseValue * 0.2,
          contractAddress: '0x1234567890123456789012345678901234567890'
        },
        {
          symbol: 'WBTC',
          balance: baseValue * 0.1 / 45000, // 10% in WBTC at $45000
          value: baseValue * 0.1,
          contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
        }
      ],
      nfts: [
        {
          collection: 'DAO Membership NFTs',
          count: Math.floor(Math.random() * 100) + 50,
          estimatedValue: Math.floor(Math.random() * 50000) + 10000
        }
      ],
      lastUpdated: new Date()
    };
  }

  async getVotingPower(userId: string, daoId: string): Promise<VotingPower> {
    try {
      // Try to fetch from on-chain data first
      const onChainPower = await this.fetchOnChainVotingPower(userId, daoId);
      if (onChainPower) {
        return onChainPower;
      }

      // Fallback to mock data for development
      return this.getMockVotingPower(userId, daoId);
    } catch (error) {
      console.error('Error fetching voting power:', error);
      return this.getMockVotingPower(userId, daoId);
    }
  }

  private async fetchOnChainVotingPower(userId: string, daoId: string): Promise<VotingPower | null> {
    try {
      // TODO: Implement actual on-chain voting power calculation
      // This would involve:
      // 1. Getting user's token balance
      // 2. Checking for delegated voting power
      // 3. Applying any staking multipliers
      // 4. Calculating total voting power
      
      // For now, return null to use mock data
      return null;
    } catch (error) {
      console.error('Error fetching on-chain voting power:', error);
      return null;
    }
  }

  private getMockVotingPower(userId: string, daoId: string): VotingPower {
    // Generate mock voting power based on user and DAO
    const baseTokens = 100 + (parseInt(userId.slice(-2), 16) || 0) * 10;
    const stakingMultiplier = 1 + Math.random() * 0.5; // 1.0 to 1.5x
    const delegatedPower = Math.random() > 0.7 ? Math.random() * 50 : 0; // 30% chance of delegation
    
    return {
      userId,
      daoId,
      votingPower: baseTokens,
      delegatedPower,
      totalPower: baseTokens * stakingMultiplier + delegatedPower,
      tokenBalance: baseTokens,
      stakingMultiplier
    };
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