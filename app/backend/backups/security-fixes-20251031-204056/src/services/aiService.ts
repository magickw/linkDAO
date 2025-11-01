import OpenAI from 'openai';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { BlockchainMarketplaceService } from './marketplaceService';
import { safeLogger } from '../utils/safeLogger';

const databaseService = new DatabaseService();
const marketplaceService = new BlockchainMarketplaceService();

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

export class AIService {
  private openai: OpenAI;
  private pinecone: any;
  private provider: any;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });
    // Initialize other services as needed
  }

  /**
   * Generate text using AI model
   * @param messages Array of messages
   * @param model AI model to use (optional)
   * @param maxTokens Maximum tokens (optional)
   * @returns AI response
   */
  async generateText(messages: Message[], model: string = 'gpt-3.5-turbo', maxTokens: number = 1000): Promise<AIResponse> {
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.3
      });

      return {
        content: response.choices[0]?.message?.content || '',
        tokensUsed: response.usage?.total_tokens || 0,
        model: model
      };
    } catch (error) {
      safeLogger.error('Error generating text:', error);
      throw error;
    }
  }

  /**
   * Moderate content for policy violations
   * @param input Input text to moderate
   * @returns Moderation results
   */
  async moderateContent(input: string): Promise<{ flagged: boolean; categories: any }> {
    try {
      const response = await this.openai.moderations.create({
        input: input
      });

      return {
        flagged: response.results[0].flagged,
        categories: response.results[0].categories
      };
    } catch (error) {
      safeLogger.error('Error moderating content:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   * @param input Text or array of texts
   * @returns Embeddings array
   */
  async generateEmbeddings(input: string | string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: input
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      safeLogger.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Retrieve context from vector database
   * @param query Search query
   * @param namespace Namespace (optional)
   * @param topK Number of results (optional)
   * @returns Context results
   */
  async retrieveContext(query: string, namespace?: string, topK: number = 5): Promise<any[]> {
    // Placeholder implementation - would integrate with Pinecone or similar
    return [];
  }

  /**
   * Get proposal data
   * @param proposalId Proposal ID
   * @returns Proposal data
   */
  async getProposalData(proposalId: string): Promise<any> {
    // Placeholder implementation - would integrate with DAO service
    return null;
  }

  /**
   * Analyze a proposal using AI
   * @param proposal Proposal data
   * @returns AI analysis
   */
  async analyzeProposal(proposal: ProposalData): Promise<AIResponse> {
    const prompt = `
      Analyze this DAO proposal:
      
      Title: ${proposal.title}
      Description: ${proposal.description}
      Proposer: ${proposal.proposer}
      
      Provide analysis on:
      1. Feasibility (0-100)
      2. Impact (0-100) 
      3. Risk (0-100)
      4. Alignment with DAO values (0-100)
      
      Give specific reasoning for each score.
    `;

    return await this.generateText([
      {
        role: 'system',
        content: 'You are an expert DAO governance analyst.'
      },
      {
        role: 'user', 
        content: prompt
      }
    ]);
  }

  /**
   * Generate voting guidance for a proposal
   * @param proposal Proposal data
   * @param userAddress User address
   * @returns Voting guidance
   */
  async generateVotingGuidance(proposal: ProposalData, userAddress: string): Promise<AIResponse> {
    const prompt = `
      Provide voting guidance for this DAO proposal:
      
      Title: ${proposal.title}
      Description: ${proposal.description}
      
      Consider:
      1. Whether to vote yes or no
      2. Key points to consider
      3. How this affects the user's interests
      4. Any risks to be aware of
      
      Keep guidance concise and actionable.
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
  /**
   * Analyze a marketplace listing for prohibited content
   * @param listingId ID of the listing to analyze
   * @returns Analysis results
   */
  async analyzeListing(listingId: string): Promise<any> {
    try {
      // Get listing details
      const listing = await marketplaceService.getListingById(listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }

      // Get user reputation
      const reputation = await marketplaceService.getUserReputation(listing.sellerWalletAddress);
      
      // Create prompt for AI analysis
      const prompt = `
        Analyze this marketplace listing for prohibited content, fraud risk, and policy violations.
        
        Listing Details:
        - Title/Description: ${listing.metadataURI}
        - Item Type: ${listing.itemType}
        - Price: ${listing.price}
        - Seller Reputation Score: ${reputation?.score || 0}
        - Seller DAO Approved: ${reputation?.daoApproved ? 'Yes' : 'No'}
        
        Check for:
        1. Prohibited items (weapons, illegal substances, stolen goods)
        2. Counterfeit trademarks or copyrighted material
        3. Fraudulent pricing or misleading descriptions
        4. Seller reputation risk factors
        5. Policy violations
        
        Provide a risk score (0-100) and detailed explanation.
      `;

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a marketplace content moderator AI. Analyze listings for prohibited content and policy violations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const analysis = response.choices[0].message.content || '';
      
      // Parse risk score from analysis (simple extraction)
      const riskScoreMatch = analysis.match(/risk score[:\s]*(\d+)/i);
      const riskScore = riskScoreMatch ? parseInt(riskScoreMatch[1]) : 50;
      
      // Determine status based on risk score
      let status: 'APPROVED' | 'FLAGGED' | 'REJECTED' = 'APPROVED';
      if (riskScore > 80) {
        status = 'REJECTED';
      } else if (riskScore > 50) {
        status = 'FLAGGED';
      }
      
      // Save analysis to database
      const aiModeration = await marketplaceService.createAIModeration(
        'listing',
        listingId,
        JSON.stringify({
          analysis,
          riskScore,
          status
        })
      );
      
      return {
        listingId,
        riskScore,
        status,
        analysis,
        aiModerationId: aiModeration?.id
      };
    } catch (error) {
      safeLogger.error('Error analyzing listing:', error);
      throw error;
    }
  }

  /**
   * Assist with dispute resolution
   * @param disputeId ID of the dispute to analyze
   * @returns Analysis results and recommendation
   */
  async assistDisputeResolution(disputeId: string): Promise<any> {
    try {
      // Get dispute details
      const dispute = await marketplaceService.getDisputeById(disputeId);
      if (!dispute) {
        throw new Error('Dispute not found');
      }

      // Get escrow details
      const escrow = await marketplaceService.getEscrowById(dispute.escrowId);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      // Get user reputations
      const buyerReputation = await marketplaceService.getUserReputation(escrow.buyerWalletAddress);
      const sellerReputation = await marketplaceService.getUserReputation(escrow.sellerWalletAddress);
      
      // Get evidence if available
      const evidenceText = dispute.evidence ? dispute.evidence.join('\n') : 'No evidence provided';
      
      // Create prompt for AI analysis
      const prompt = `
        Assist with this marketplace dispute resolution.
        
        Dispute Details:
        - Reason: ${dispute.reason}
        - Evidence: ${evidenceText}
        
        Transaction Details:
        - Amount: ${escrow.amount}
        - Buyer: ${escrow.buyerWalletAddress}
        - Seller: ${escrow.sellerWalletAddress}
        
        User Reputations:
        - Buyer Score: ${buyerReputation?.score || 0}
        - Buyer DAO Approved: ${buyerReputation?.daoApproved ? 'Yes' : 'No'}
        - Seller Score: ${sellerReputation?.score || 0}
        - Seller DAO Approved: ${sellerReputation?.daoApproved ? 'Yes' : 'No'}
        
        Analyze the evidence and provide:
        1. Likelihood of buyer winning (0-100%)
        2. Key factors in the decision
        3. Recommended resolution (refund to buyer, pay seller, split, etc.)
        4. Confidence level in recommendation (0-100%)
      `;

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a dispute resolution AI assistant. Provide fair and balanced recommendations for marketplace disputes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const analysis = response.choices[0].message.content || '';
      
      // Save analysis to database
      const aiModeration = await marketplaceService.createAIModeration(
        'dispute',
        disputeId,
        analysis
      );
      
      return {
        disputeId,
        analysis,
        aiModerationId: aiModeration?.id
      };
    } catch (error) {
      safeLogger.error('Error assisting dispute resolution:', error);
      throw error;
    }
  }

  /**
   * Detect fraudulent patterns in user behavior
   * @param userAddress Address of the user to analyze
   * @returns Fraud risk assessment
   */
  async detectFraud(userAddress: string): Promise<any> {
    try {
      // Get user reputation
      const reputation = await marketplaceService.getUserReputation(userAddress);
      
      // Get user's recent transactions
      const userOrders = await marketplaceService.getOrdersByUser(userAddress);
      const userDisputes = await marketplaceService.getDisputesByUser(userAddress);
      
      // Create prompt for AI analysis
      const prompt = `
        Assess fraud risk for this marketplace user.
        
        User Details:
        - Address: ${userAddress}
        - Reputation Score: ${reputation?.score || 0}
        - DAO Approved: ${reputation?.daoApproved ? 'Yes' : 'No'}
        
        Recent Activity:
        - Orders Placed: ${userOrders.length}
        - Disputes Initiated: ${userDisputes.length}
        
        Check for:
        1. Pattern of disputes (frequent buyer or seller disputes)
        2. Rapid account creation and activity
        3. Unusual transaction patterns
        4. History of policy violations
        
        Provide a fraud risk score (0-100) and detailed explanation.
      `;

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a fraud detection AI. Analyze user behavior for potential fraudulent activity.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const analysis = response.choices[0].message.content || '';
      
      // Parse risk score from analysis (simple extraction)
      const riskScoreMatch = analysis.match(/risk score[:\s]*(\d+)/i);
      const riskScore = riskScoreMatch ? parseInt(riskScoreMatch[1]) : 50;
      
      return {
        userAddress,
        riskScore,
        analysis
      };
    } catch (error) {
      safeLogger.error('Error detecting fraud:', error);
      throw error;
    }
  }

  /**
   * Suggest listing price based on comparable sales
   * @param itemType Type of item
   * @param metadataURI Metadata URI for the item
   * @returns Price suggestion
   */
  async suggestPrice(itemType: string, metadataURI: string): Promise<any> {
    try {
      // Create prompt for AI analysis
      const prompt = `
        Suggest a marketplace listing price for this item.
        
        Item Details:
        - Type: ${itemType}
        - Description: ${metadataURI}
        
        Consider:
        1. Comparable sales in similar marketplaces
        2. Item condition and rarity
        3. Current market demand
        4. Seasonal factors
        
        Provide a price range suggestion and explanation.
      `;

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a pricing advisor AI. Suggest fair market prices for items based on descriptions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      const analysis = response.choices[0].message.content || '';
      
      return {
        itemType,
        metadataURI,
        suggestion: analysis
      };
    } catch (error) {
      safeLogger.error('Error suggesting price:', error);
      throw error;
    }
  }

  /**
   * Process pending AI moderation records
   */
  async processPendingModeration(): Promise<void> {
    try {
      // Get pending AI moderation records
      const pendingRecords = await marketplaceService.getPendingAIModeration();
      
      // Process each record
      for (const record of pendingRecords) {
        try {
          if (record.objectType === 'listing') {
            await this.analyzeListing(record.objectId);
          } else if (record.objectType === 'dispute') {
            await this.assistDisputeResolution(record.objectId);
          }
        } catch (error) {
          safeLogger.error(`Error processing ${record.objectType} ${record.objectId}:`, error);
        }
      }
    } catch (error) {
      safeLogger.error('Error processing pending moderation:', error);
      throw error;
    }
  }
}

export class AIBot {
  protected config: AIBotConfig;
  protected aiService: AIService;

  constructor(config: AIBotConfig, aiService: AIService) {
    this.config = config;
    this.aiService = aiService;
  }

  async processMessage(userMessage: string, userId: string): Promise<AIResponse> {
    // Default implementation - can be overridden by specific bots
    return await this.aiService.generateText([
      {
        role: 'system',
        content: this.config.persona
      },
      {
        role: 'user',
        content: userMessage
      }
    ], this.config.aiModel);
  }

  getConfig(): AIBotConfig {
    return this.config;
  }
}

let aiServiceInstance: AIService;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}