import { ethers } from 'ethers';
import { AIService } from './aiService';
import { GovernanceService } from './governanceService';

// Proposal evaluation criteria weights
const EVALUATION_CRITERIA = {
  FEASIBILITY: 0.3,      // 30% weight
  COMMUNITY_IMPACT: 0.25, // 25% weight
  FINANCIAL_IMPACT: 0.2,  // 20% weight
  TECHNICAL_QUALITY: 0.15, // 15% weight
  ALIGNMENT: 0.1         // 10% weight
};

export interface ProposalEvaluation {
  proposalId: number;
  title: string;
  description: string;
  proposer: string;
  evaluationScore: number; // 0-100
  criteriaScores: {
    feasibility: number;      // 0-100
    communityImpact: number;  // 0-100
    financialImpact: number;  // 0-100
    technicalQuality: number; // 0-100
    alignment: number;        // 0-100
  };
  aiAnalysis: string;
  recommendation: 'APPROVE' | 'REJECT' | 'NEEDS_IMPROVEMENT';
  createdAt: Date;
}

export interface ProposalData {
  id: number;
  title: string;
  description: string;
  proposer: string;
  startBlock: number;
  endBlock: number;
  forVotes: string;
  againstVotes: string;
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
}

export class ProposalEvaluationService {
  private aiService: AIService;
  private governanceService: GovernanceService;

  constructor() {
    this.aiService = new AIService();
    // In a real implementation, we would pass RPC URL and contract address
    this.governanceService = new GovernanceService('http://localhost:8545', '0x0000000000000000000000000000000000000000');
  }

  /**
   * Evaluate a governance proposal using AI analysis
   * @param proposal The proposal to evaluate
   * @returns The evaluation result
   */
  async evaluateProposal(proposal: ProposalData): Promise<ProposalEvaluation> {
    try {
      // Get AI analysis
      const aiAnalysis = await this.getAIProposalAnalysis(proposal);
      
      // Extract scores from AI analysis
      const criteriaScores = await this.extractCriteriaScores(aiAnalysis);
      
      // Calculate overall score
      const evaluationScore = this.calculateOverallScore(criteriaScores);
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(evaluationScore);
      
      const evaluation: ProposalEvaluation = {
        proposalId: proposal.id,
        title: proposal.title,
        description: proposal.description,
        proposer: proposal.proposer,
        evaluationScore,
        criteriaScores,
        aiAnalysis,
        recommendation,
        createdAt: new Date()
      };

      return evaluation;
    } catch (error) {
      console.error("Error evaluating proposal:", error);
      throw error;
    }
  }

  /**
   * Get AI analysis of a proposal
   * @param proposal The proposal to analyze
   * @returns The AI analysis as a string
   */
  private async getAIProposalAnalysis(proposal: ProposalData): Promise<string> {
    try {
      const prompt = `
        Analyze this DAO governance proposal and provide a detailed assessment:
        
        Proposal Title: ${proposal.title}
        Description: ${proposal.description}
        Proposer: ${proposal.proposer}
        
        Please evaluate this proposal on the following criteria:
        
        1. Feasibility (0-100): How technically and practically feasible is this proposal?
        2. Community Impact (0-100): What positive or negative impact will this have on the community?
        3. Financial Impact (0-100): What are the financial implications (costs, benefits, risks)?
        4. Technical Quality (0-100): How well-designed and secure is the technical implementation?
        5. Alignment (0-100): How well does this align with the DAO's mission and values?
        
        Provide specific reasoning for each score and a final recommendation.
      `;

      const response = await this.aiService.generateText([
        {
          role: 'system',
          content: 'You are an expert DAO governance analyst specializing in evaluating proposals for feasibility, impact, and alignment with community values.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      return response.content;
    } catch (error) {
      console.error("Error getting AI proposal analysis:", error);
      // Return a default analysis if AI fails
      return "Unable to generate AI analysis at this time. Please review the proposal manually.";
    }
  }

  /**
   * Extract criteria scores from AI analysis
   * @param aiAnalysis The AI analysis text
   * @returns The extracted criteria scores
   */
  private async extractCriteriaScores(aiAnalysis: string): Promise<ProposalEvaluation['criteriaScores']> {
    try {
      // In a real implementation, we would use more sophisticated parsing
      // For now, we'll return mock scores
      return {
        feasibility: 85,
        communityImpact: 78,
        financialImpact: 70,
        technicalQuality: 82,
        alignment: 90
      };
    } catch (error) {
      console.error("Error extracting criteria scores:", error);
      // Return default scores if extraction fails
      return {
        feasibility: 50,
        communityImpact: 50,
        financialImpact: 50,
        technicalQuality: 50,
        alignment: 50
      };
    }
  }

  /**
   * Calculate overall evaluation score
   * @param criteriaScores The individual criteria scores
   * @returns The overall evaluation score
   */
  private calculateOverallScore(criteriaScores: ProposalEvaluation['criteriaScores']): number {
    return Math.round(
      criteriaScores.feasibility * EVALUATION_CRITERIA.FEASIBILITY +
      criteriaScores.communityImpact * EVALUATION_CRITERIA.COMMUNITY_IMPACT +
      criteriaScores.financialImpact * EVALUATION_CRITERIA.FINANCIAL_IMPACT +
      criteriaScores.technicalQuality * EVALUATION_CRITERIA.TECHNICAL_QUALITY +
      criteriaScores.alignment * EVALUATION_CRITERIA.ALIGNMENT
    );
  }

  /**
   * Generate recommendation based on evaluation score
   * @param score The evaluation score
   * @returns The recommendation
   */
  private generateRecommendation(score: number): ProposalEvaluation['recommendation'] {
    if (score >= 80) return 'APPROVE';
    if (score >= 60) return 'NEEDS_IMPROVEMENT';
    return 'REJECT';
  }

  /**
   * Get voting guidance for community members
   * @param proposal The proposal to provide guidance for
   * @param userAddress The user's address
   * @returns Personalized voting guidance
   */
  async getVotingGuidance(proposal: ProposalData, userAddress: string): Promise<string> {
    try {
      const prompt = `
        Provide personalized voting guidance for this DAO member:
        
        User Address: ${userAddress}
        Proposal Title: ${proposal.title}
        Description: ${proposal.description}
        
        Based on the proposal analysis, provide clear guidance on:
        1. Whether to vote yes or no
        2. Key points to consider
        3. How this affects the user's interests
        4. Any risks to be aware of
        
        Keep the guidance concise and actionable.
      `;

      const response = await this.aiService.generateText([
        {
          role: 'system',
          content: 'You are a governance advisor helping DAO members make informed voting decisions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      return response.content;
    } catch (error) {
      console.error("Error getting voting guidance:", error);
      return "Unable to provide voting guidance at this time.";
    }
  }

  /**
   * Analyze voting patterns and trends
   * @param proposal The proposal to analyze
   * @returns Analysis of voting patterns
   */
  async analyzeVotingPatterns(proposal: ProposalData): Promise<string> {
    try {
      // In a real implementation, we would fetch actual voting data
      // For now, we'll return a mock analysis
      return `
        Voting Pattern Analysis for Proposal #${proposal.id}:
        
        - Early voting was predominantly in favor (70% yes in first 24 hours)
        - Recent votes show more opposition (40% yes in last 12 hours)
        - Large token holders are mostly in favor
        - New community members are more divided
        
        Recommendation: Monitor the final 24 hours as sentiment appears to be shifting.
      `;
    } catch (error) {
      console.error("Error analyzing voting patterns:", error);
      return "Unable to analyze voting patterns at this time.";
    }
  }

  /**
   * Predict proposal outcome
   * @param proposal The proposal to predict outcome for
   * @returns Prediction of whether the proposal will pass
   */
  async predictOutcome(proposal: ProposalData): Promise<{ 
    willPass: boolean; 
    confidence: number; 
    reasoning: string 
  }> {
    try {
      // In a real implementation, we would use more sophisticated prediction
      // For now, we'll return a mock prediction
      return {
        willPass: true,
        confidence: 75,
        reasoning: "Current vote count shows 60% in favor with 40% of voting period remaining. Historical data suggests this trend will continue."
      };
    } catch (error) {
      console.error("Error predicting outcome:", error);
      return {
        willPass: false,
        confidence: 0,
        reasoning: "Unable to predict outcome due to analysis error."
      };
    }
  }
}