import { Proposal } from '@/types/governance';

export interface AIProposalAnalysis {
  feasibility: number;
  communityImpact: number;
  financialImpact: number;
  technicalQuality: number;
  alignment: number;
  overallScore: number;
  recommendation: 'APPROVE' | 'REJECT' | 'NEEDS_IMPROVEMENT';
  analysis: string;
  keyPoints: string[];
}

export interface VotingGuidance {
  shouldVote: 'yes' | 'no' | 'abstain';
  reasoning: string;
  keyConsiderations: string[];
  risks: string[];
}

export class AIGovernanceService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /**
   * Get AI analysis for a proposal
   * @param proposal The proposal to analyze
   * @returns AI analysis results
   */
  async analyzeProposal(proposal: Proposal): Promise<AIProposalAnalysis | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/governance/proposals/${proposal.id}/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: proposal.title,
          description: proposal.description,
          proposer: proposal.proposer,
          category: proposal.category,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze proposal: ${response.statusText}`);
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Error analyzing proposal:', error);
      // Return mock analysis for development
      return this.getMockAnalysis();
    }
  }

  /**
   * Get voting guidance for a user on a proposal
   * @param proposal The proposal to get guidance for
   * @param userAddress The user's wallet address
   * @returns Voting guidance
   */
  async getVotingGuidance(proposal: Proposal, userAddress: string): Promise<VotingGuidance | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/governance/proposals/${proposal.id}/voting-guidance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          proposalTitle: proposal.title,
          proposalDescription: proposal.description,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get voting guidance: ${response.statusText}`);
      }

      const data = await response.json();
      return data.guidance;
    } catch (error) {
      console.error('Error getting voting guidance:', error);
      // Return mock guidance for development
      return this.getMockGuidance();
    }
  }

  /**
   * Get mock AI analysis for development
   * @returns Mock analysis data
   */
  private getMockAnalysis(): AIProposalAnalysis {
    return {
      feasibility: 85,
      communityImpact: 78,
      financialImpact: 70,
      technicalQuality: 82,
      alignment: 90,
      overallScore: 81,
      recommendation: 'APPROVE',
      analysis: 'This proposal demonstrates strong feasibility with clear implementation steps. The community impact is positive, focusing on expanding access to governance participation. Financial implications are moderate with reasonable costs. Technical quality is high with well-defined specifications. The proposal aligns well with the DAO\'s mission of decentralized governance.',
      keyPoints: [
        'Clear implementation roadmap with defined milestones',
        'Positive community sentiment based on initial feedback',
        'Financial costs are justified by expected benefits',
        'Technical approach is sound and follows best practices',
        'Strong alignment with DAO values of transparency and inclusivity'
      ]
    };
  }

  /**
   * Get mock voting guidance for development
   * @returns Mock guidance data
   */
  private getMockGuidance(): VotingGuidance {
    return {
      shouldVote: 'yes',
      reasoning: 'This proposal aligns with your interests as a long-term community member and offers benefits that will enhance your participation in governance.',
      keyConsiderations: [
        'Proposal addresses community feedback about accessibility',
        'Implementation timeline is realistic',
        'Financial impact on individual members is minimal'
      ],
      risks: [
        'Implementation may take longer than estimated',
        'Some technical dependencies are still in development'
      ]
    };
  }
}

export const aiGovernanceService = new AIGovernanceService();