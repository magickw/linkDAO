import { AIBot, getAIService, AIResponse } from '../aiService';

interface ProposalData {
  id: string;
  title: string;
  description: string;
  proposer: string;
  startBlock: number;
  endBlock: number;
  forVotes: string;
  againstVotes: string;
}

export class ProposalSummarizerBot extends AIBot {
  constructor() {
    super(
      {
        name: 'Proposal Summarizer',
        description: 'Summarizes complex DAO governance proposals in plain language',
        scope: ['governance'],
        permissions: ['read-proposals'],
        aiModel: 'gpt-4-turbo',
        persona: 'policy-analyst',
      },
      getAIService()
    );
  }

  async processMessage(userMessage: string, userId: string): Promise<AIResponse> {
    // In a real implementation, we would fetch the actual proposal data
    // For now, we'll simulate with mock data
    const proposalData = await this.aiService.getProposalData('proposal-123');
    
    const prompt = `
      Summarize this DAO governance proposal for a non-technical community member:
      
      Proposal Title: ${proposalData.title}
      Description: ${proposalData.description}
      
      Voting Statistics:
      For Votes: ${proposalData.forVotes}
      Against Votes: ${proposalData.againstVotes}
      
      Please provide:
      1. A simple explanation of what this proposal does
      2. The potential impact on the community
      3. Key points to consider when voting
      4. A recommendation in plain language
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a policy analyst who specializes in explaining complex governance proposals in simple terms.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }
}
