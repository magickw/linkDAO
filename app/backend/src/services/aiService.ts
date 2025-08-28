import OpenAI from 'openai';
import { DatabaseService } from './databaseService';
import { MarketplaceService } from './marketplaceService';

const databaseService = new DatabaseService();
const marketplaceService = new MarketplaceService();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

export class AIService {
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
      const reputation = await marketplaceService.getUserReputation(listing.sellerAddress);
      
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
      const response = await openai.chat.completions.create({
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
      console.error('Error analyzing listing:', error);
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
      const buyerReputation = await marketplaceService.getUserReputation(escrow.buyerAddress);
      const sellerReputation = await marketplaceService.getUserReputation(escrow.sellerAddress);
      
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
        - Buyer: ${escrow.buyerAddress}
        - Seller: ${escrow.sellerAddress}
        
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
      const response = await openai.chat.completions.create({
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
      console.error('Error assisting dispute resolution:', error);
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
      const response = await openai.chat.completions.create({
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
      console.error('Error detecting fraud:', error);
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
      const response = await openai.chat.completions.create({
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
      console.error('Error suggesting price:', error);
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
          console.error(`Error processing ${record.objectType} ${record.objectId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing pending moderation:', error);
      throw error;
    }
  }
}