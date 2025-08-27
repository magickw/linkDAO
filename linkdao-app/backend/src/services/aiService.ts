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
    temperature: number = 0.7
  ): Promise<AIResponse> {
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        temperature,
      });

      return {
        content: response.choices[0].message?.content || '',
        tokensUsed: response.usage?.total_tokens || 0,
        model: response.model,
      };
    } catch (error) {
      console.error('Error generating text:', error);
      throw new Error('Failed to generate text with AI model');
    }
  }

  /**
   * Moderate content using OpenAI's moderation API
   */
  async moderateContent(content: string): Promise<boolean> {
    try {
      const response = await this.openai.moderations.create({
        input: content,
      });

      return response.results[0].flagged;
    } catch (error) {
      console.error('Error moderating content:', error);
      return false;
    }
  }

  /**
   * Embed text for similarity search using OpenAI embeddings
   */
  async embedText(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error embedding text:', error);
      throw new Error('Failed to embed text');
    }
  }

  /**
   * Retrieve relevant context from vector database
   */
  async retrieveContext(query: string, namespace: string, topK: number = 5): Promise<any[]> {
    try {
      const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'linkdao');
      const queryEmbedding = await this.embedText(query);
      
      const response = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
      });

      return response.matches || [];
    } catch (error) {
      console.error('Error retrieving context:', error);
      return [];
    }
  }

  /**
   * Get user's on-chain activity
   */
  async getUserOnChainActivity(address: string): Promise<any> {
    try {
      // Get transaction count
      const transactionCount = await this.provider.getTransactionCount(address);
      
      // Get balance
      const balance = await this.provider.getBalance(address);
      
      // In a real implementation, we would fetch more detailed activity
      // like token transfers, contract interactions, etc.
      
      return {
        address,
        transactionCount,
        balance: ethers.formatEther(balance),
      };
    } catch (error) {
      console.error('Error fetching on-chain activity:', error);
      return null;
    }
  }

  /**
   * Get governance proposal data
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

// Export a factory function instead of a singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
