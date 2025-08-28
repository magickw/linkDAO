import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { ethers } from 'ethers';

// Types
export interface AIBotConfig {
  name: string;
  description: string;
  scope: string[];
  permissions: string[];
  aiModel: string;
  persona: string;
  settings?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
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

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// AI Service Class
export class AIService {
  private openai: OpenAI;
  private pinecone: Pinecone;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Pinecone for RAG
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    
    // Initialize Ethereum provider for on-chain data
    this.provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'http://localhost:8545'
    );
  }

  /**
   * Generate text using OpenAI GPT models
   */
  async generateText(
    messages: Message[],
    model: string = 'gpt-4-turbo',
    maxTokens: number = 1000
  ): Promise<AIResponse> {
    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
      });

      return {
        content: completion.choices[0].message.content || '',
        tokensUsed: completion.usage?.total_tokens || 0,
        model: completion.model,
      };
    } catch (error) {
      console.error('Error generating text:', error);
      throw error;
    }
  }

  /**
   * Moderate content using OpenAI's moderation API
   */
  async moderateContent(input: string): Promise<{ flagged: boolean; categories: any }> {
    try {
      const moderation = await this.openai.moderations.create({
        input,
      });

      return {
        flagged: moderation.results[0].flagged,
        categories: moderation.results[0].categories,
      };
    } catch (error) {
      console.error('Error moderating content:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for semantic search
   */
  async generateEmbeddings(input: string | string[]): Promise<number[][]> {
    try {
      const embeddings = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input,
      });

      return embeddings.data.map(item => item.embedding);
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant context from Pinecone
   */
  async retrieveContext(query: string, namespace: string = 'default', topK: number = 5): Promise<any[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = (await this.generateEmbeddings(query))[0];
      
      // Query Pinecone
      const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'linkdao');
      const queryResponse = await index.namespace(namespace).query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
      });

      return queryResponse.matches || [];
    } catch (error) {
      console.error('Error retrieving context:', error);
      return [];
    }
  }

  /**
   * Get on-chain governance data
   */
  async getProposalData(proposalId: string): Promise<any> {
    // In a real implementation, this would fetch from our governance contract
    // or a subgraph indexing the governance data
    
    // For now, we'll return a mock structure
    return {
      id: proposalId,
      title: 'Sample Proposal',
      description: 'This is a sample governance proposal for demonstration purposes.',
      proposer: '0x1234567890123456789012345678901234567890',
      startBlock: 1000000,
      endBlock: 1001000,
      forVotes: '1000000',
      againstVotes: '500000',
    };
  }

  /**
   * Analyze a governance proposal
   */
  async analyzeProposal(proposal: ProposalData): Promise<AIResponse> {
    const prompt = `
      Analyze this DAO governance proposal comprehensively:
      
      Proposal ID: ${proposal.id}
      Title: ${proposal.title}
      Description: ${proposal.description}
      Proposer: ${proposal.proposer}
      
      Voting Statistics:
      For Votes: ${proposal.forVotes}
      Against Votes: ${proposal.againstVotes}
      
      Please provide:
      1. Executive Summary (2-3 sentences)
      2. Key Benefits
      3. Potential Risks
      4. Technical Feasibility Assessment
      5. Financial Impact Analysis
      6. Community Impact Evaluation
      7. Recommendation (Approve/Reject/Needs Revision)
      8. Key Considerations for Voters
    `;

    return await this.generateText([
      {
        role: 'system',
        content: 'You are a governance expert specializing in DAO proposal analysis. Provide clear, actionable insights.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], 'gpt-4-turbo', 1500);
  }

  /**
   * Generate voting guidance for a user
   */
  async generateVotingGuidance(proposal: ProposalData, userAddress: string): Promise<AIResponse> {
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

    return await this.generateText([
      {
        role: 'system',
        content: 'You are a governance advisor helping DAO members make informed voting decisions.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }
}

// Bot Framework
export class AIBot {
  protected config: AIBotConfig;
  protected aiService: AIService;

  constructor(config: AIBotConfig, aiService: AIService) {
    this.config = config;
    this.aiService = aiService;
  }

  /**
   * Process a user message and generate a response
   */
  async processMessage(userMessage: string, userId: string): Promise<AIResponse> {
    // This should be implemented by specific bot types
    throw new Error('processMessage must be implemented by bot subclass');
  }

  /**
   * Get bot configuration
   */
  getConfig(): AIBotConfig {
    return this.config;
  }
}

// Export a singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}