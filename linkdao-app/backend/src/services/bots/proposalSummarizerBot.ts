import { AIBot, aiService, AIResponse } from '../aiService';

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
        description: 'Explains DAO governance proposals in plain English',
        scope: ['governance'],
        permissions: ['read-proposals'],
        aiModel: 'gpt-4-turbo',
        persona: 'neutral-explainer',
      },
      aiService
    );
  }

  async summarizeProposal(proposal: ProposalData): Promise<AIResponse> {
    const prompt = `
      Summarize this DAO governance proposal in plain English:
      
      Title: ${proposal.title}
      Description: ${proposal.description}
      
      Voting Statistics:
      For Votes: ${proposal.forVotes}
      Against Votes: ${proposal.againstVotes}
      
      Proposal ID: ${proposal.id}
      Proposer: ${proposal.proposer}
      
      Please provide:
      1. A clear summary of what this proposal is about (2-3 sentences)
      2. The key changes or actions being proposed
      3. Potential impact on the DAO and its members
      4. Current voting sentiment (if available)
      
      Use simple, non-technical language that any DAO member can understand.
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are an expert at explaining complex governance proposals in simple terms.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }

  async processMessage(userMessage: string, userId: string): Promise<AIResponse> {
    const prompt = `
      User is asking about governance proposals: "${userMessage}"
      
      Provide helpful information about:
      1. How to understand governance proposals
      2. What to look for when evaluating a proposal
      3. How voting works in the DAO
      4. The importance of participating in governance
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a DAO governance expert helping users understand and participate in governance.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }
}