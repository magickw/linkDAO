/**
 * NFT Negotiation Bot Service
 * AI-powered bot for NFT deal negotiations with testnet ETH rewards
 */

import { ethers } from 'ethers';
import messagingService, { ChatMessage } from './messagingService';

export interface NFTOffer {
  id: string;
  nftContract: string;
  nftTokenId: string;
  currentPrice: string;
  offerPrice: string;
  buyerAddress: string;
  sellerAddress: string;
  status: 'active' | 'accepted' | 'rejected' | 'countered';
  timestamp: Date;
  expiresAt: Date;
  metadata?: {
    name?: string;
    image?: string;
    rarity?: string;
    floorPrice?: string;
  };
}

export interface BotResponse {
  message: string;
  action: 'counter' | 'accept' | 'reject' | 'negotiate' | 'reward';
  data?: {
    counterOffer?: string;
    reasoning?: string;
    rewardAmount?: string;
    transactionHash?: string;
  };
}

class NFTNegotiationBot {
  private static readonly BOT_ADDRESS = 'game.etherscan.eth';
  private static readonly TESTNET_REWARD_AMOUNT = '0.01'; // 0.01 ETH reward
  private offers: Map<string, NFTOffer> = new Map();
  private conversationHistory: Map<string, ChatMessage[]> = new Map();

  // Mock NFT data for demonstration
  private mockNFTs = new Map([
    ['0x1', {
      name: 'Rare Dragon #123',
      image: 'https://example.com/dragon.png',
      rarity: 'Legendary',
      floorPrice: '0.5',
      currentPrice: '0.8'
    }],
    ['0x2', {
      name: 'Cyber Punk #456',
      image: 'https://example.com/punk.png',
      rarity: 'Epic',
      floorPrice: '0.3',
      currentPrice: '0.45'
    }],
    ['0x3', {
      name: 'Space Cat #789',
      image: 'https://example.com/cat.png',
      rarity: 'Common',
      floorPrice: '0.1',
      currentPrice: '0.15'
    }]
  ]);

  constructor() {
    this.initializeBot();
  }

  private initializeBot(): void {
    // Listen for NFT-related messages
    messagingService.on('message_received', this.handleIncomingMessage.bind(this));
    messagingService.on('message_sent', this.handleOutgoingMessage.bind(this));
  }

  /**
   * Handle incoming messages to detect NFT negotiation opportunities
   */
  private async handleIncomingMessage(message: ChatMessage): Promise<void> {
    // Only respond if the message is to the bot
    if (message.toAddress.toLowerCase() !== NFTNegotiationBot.BOT_ADDRESS.toLowerCase()) {
      return;
    }

    // Store conversation history
    this.addToConversationHistory(message);

    try {
      const response = await this.generateBotResponse(message);
      await this.sendBotResponse(message.fromAddress, response);
    } catch (error) {
      console.error('Bot failed to respond:', error);
      await this.sendErrorResponse(message.fromAddress);
    }
  }

  /**
   * Handle outgoing messages to track offers
   */
  private async handleOutgoingMessage(message: ChatMessage): Promise<void> {
    if (message.messageType === 'nft_offer' && message.metadata) {
      const offer: NFTOffer = {
        id: message.id,
        nftContract: message.metadata.nftContract || '',
        nftTokenId: message.metadata.nftTokenId || '',
        currentPrice: this.getCurrentNFTPrice(message.metadata.nftTokenId || ''),
        offerPrice: message.metadata.offerAmount || '0',
        buyerAddress: message.fromAddress,
        sellerAddress: message.toAddress,
        status: 'active',
        timestamp: message.timestamp,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: this.getNFTMetadata(message.metadata.nftTokenId || '')
      };

      this.offers.set(offer.id, offer);
    }
  }

  /**
   * Generate AI-powered bot response
   */
  private async generateBotResponse(message: ChatMessage): Promise<BotResponse> {
    const messageContent = message.content.toLowerCase();
    const conversationHistory = this.getConversationHistory(message.fromAddress);

    // Detect intent
    if (this.isGreeting(messageContent)) {
      return this.generateGreetingResponse();
    }

    if (this.isNFTInquiry(messageContent)) {
      return this.generateNFTInquiryResponse(messageContent);
    }

    if (message.messageType === 'nft_offer' && message.metadata) {
      return this.generateOfferResponse(message);
    }

    if (this.isPriceNegotiation(messageContent)) {
      return this.generateNegotiationResponse(messageContent, conversationHistory);
    }

    if (this.isAcceptanceRequest(messageContent)) {
      return this.generateAcceptanceResponse(message.fromAddress);
    }

    // Default response
    return this.generateDefaultResponse();
  }

  /**
   * Send bot response message
   */
  private async sendBotResponse(toAddress: string, response: BotResponse): Promise<void> {
    try {
      let messageType: ChatMessage['messageType'] = 'text';
      let metadata: ChatMessage['metadata'] = {};

      if (response.action === 'counter' && response.data?.counterOffer) {
        messageType = 'nft_counter';
        metadata.offerAmount = response.data.counterOffer;
      }

      await messagingService.sendMessage(
        toAddress,
        response.message,
        messageType,
        metadata
      );

      // Handle rewards
      if (response.action === 'reward' && response.data?.rewardAmount) {
        await this.distributeTestnetReward(toAddress, response.data.rewardAmount);
      }
    } catch (error) {
      console.error('Failed to send bot response:', error);
    }
  }

  /**
   * Distribute testnet ETH rewards
   */
  private async distributeTestnetReward(toAddress: string, amount: string): Promise<string> {
    try {
      // In a real implementation, this would interact with a testnet faucet
      // or use a bot wallet to send actual testnet ETH
      const mockTxHash = `0x${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
      
      // Send confirmation message
      await messagingService.sendMessage(
        toAddress,
        `🎉 Congratulations! You've been rewarded ${amount} testnet ETH for successful NFT negotiation!\n\nTransaction: ${mockTxHash}\n\nKeep negotiating to earn more rewards!`,
        'system',
        {
          rewardAmount: amount,
          transactionHash: mockTxHash
        }
      );

      return mockTxHash;
    } catch (error) {
      console.error('Failed to distribute reward:', error);
      throw error;
    }
  }

  /**
   * Intent detection methods
   */
  private isGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'greetings', 'gm', 'good morning'];
    return greetings.some(greeting => message.includes(greeting));
  }

  private isNFTInquiry(message: string): boolean {
    const nftKeywords = ['nft', 'token', 'collection', 'buy', 'sell', 'price', 'floor'];
    return nftKeywords.some(keyword => message.includes(keyword));
  }

  private isPriceNegotiation(message: string): boolean {
    const negotiationKeywords = ['lower', 'higher', 'best price', 'deal', 'negotiate', 'counter'];
    return negotiationKeywords.some(keyword => message.includes(keyword));
  }

  private isAcceptanceRequest(message: string): boolean {
    const acceptanceKeywords = ['accept', 'deal', 'agreed', 'yes', 'confirm'];
    return acceptanceKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Response generators
   */
  private generateGreetingResponse(): BotResponse {
    const greetings = [
      "Hello! I'm the NFT Negotiation Bot. I can help you get the best deals on NFTs and earn testnet ETH rewards!",
      "Hey there! Ready to negotiate some amazing NFT deals? Let's find you the perfect price!",
      "Greetings, collector! I'm here to help you master the art of NFT negotiations. What are you looking for today?"
    ];

    return {
      message: greetings[Math.floor(Math.random() * greetings.length)],
      action: 'negotiate'
    };
  }

  private generateNFTInquiryResponse(message: string): BotResponse {
    const availableNFTs = Array.from(this.mockNFTs.entries());
    const randomNFT = availableNFTs[Math.floor(Math.random() * availableNFTs.length)];
    
    return {
      message: `I have some great NFTs available! For example: ${randomNFT[1].name} - Current price: ${randomNFT[1].currentPrice} ETH (Floor: ${randomNFT[1].floorPrice} ETH). Would you like to make an offer?`,
      action: 'negotiate'
    };
  }

  private generateOfferResponse(message: ChatMessage): BotResponse {
    if (!message.metadata) {
      return this.generateDefaultResponse();
    }

    const tokenId = message.metadata.nftTokenId || '';
    const offerAmount = parseFloat(message.metadata.offerAmount || '0');
    const nftData = this.getNFTMetadata(tokenId);
    const currentPrice = parseFloat(this.getCurrentNFTPrice(tokenId));
    const floorPrice = parseFloat(nftData?.floorPrice || '0');

    let response: BotResponse;

    if (offerAmount >= currentPrice) {
      // Accept offer
      response = {
        message: `Excellent offer! I accept your bid of ${offerAmount} ETH for ${nftData?.name || `Token #${tokenId}`}. This is a fair deal above the floor price of ${floorPrice} ETH.`,
        action: 'accept'
      };
    } else if (offerAmount >= floorPrice * 0.8) {
      // Counter offer
      const counterOffer = (currentPrice * 0.9).toFixed(3);
      response = {
        message: `Your offer of ${offerAmount} ETH is close! How about ${counterOffer} ETH? That's only 10% below current price and still above floor.`,
        action: 'counter',
        data: {
          counterOffer,
          reasoning: `Considering floor price: ${floorPrice} ETH, current market: ${currentPrice} ETH`
        }
      };
    } else {
      // Reject but encourage
      const suggestedOffer = (floorPrice * 1.1).toFixed(3);
      response = {
        message: `That's quite low for ${nftData?.name || `Token #${tokenId}`}. The floor is ${floorPrice} ETH. How about ${suggestedOffer} ETH as a starting point?`,
        action: 'reject',
        data: {
          reasoning: `Offer too far below floor price of ${floorPrice} ETH`
        }
      };
    }

    return response;
  }

  private generateNegotiationResponse(message: string, history: ChatMessage[]): BotResponse {
    // Simple negotiation logic based on conversation context
    const responses = [
      {
        message: "I appreciate good negotiation skills! Let's find a price that works for both of us. What's your best offer?",
        action: 'negotiate' as const
      },
      {
        message: "You drive a hard bargain! I can come down a bit. What do you think about splitting the difference?",
        action: 'counter' as const,
        data: { counterOffer: "0.4" }
      },
      {
        message: "I like your negotiation style! As a reward for your persistence, here's some testnet ETH to encourage more deals!",
        action: 'reward' as const,
        data: { rewardAmount: NFTNegotiationBot.TESTNET_REWARD_AMOUNT }
      }
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateAcceptanceResponse(userAddress: string): BotResponse {
    return {
      message: "🎉 Deal accepted! Congratulations on your successful negotiation! You've earned testnet ETH as a reward for your excellent negotiation skills. Keep up the great work!",
      action: 'reward',
      data: { 
        rewardAmount: NFTNegotiationBot.TESTNET_REWARD_AMOUNT,
        reasoning: 'Successful NFT deal completion'
      }
    };
  }

  private generateDefaultResponse(): BotResponse {
    const responses = [
      "I'm here to help you negotiate NFT deals! Try asking about available NFTs or make an offer.",
      "Let's talk NFTs! I can help you find great deals and earn testnet ETH rewards.",
      "I specialize in NFT negotiations. What are you interested in today?"
    ];

    return {
      message: responses[Math.floor(Math.random() * responses.length)],
      action: 'negotiate'
    };
  }

  private async sendErrorResponse(toAddress: string): Promise<void> {
    await messagingService.sendMessage(
      toAddress,
      "Sorry, I'm having trouble processing your request right now. Please try again later!",
      'system'
    );
  }

  /**
   * Helper methods
   */
  private addToConversationHistory(message: ChatMessage): void {
    const key = message.fromAddress;
    if (!this.conversationHistory.has(key)) {
      this.conversationHistory.set(key, []);
    }
    const history = this.conversationHistory.get(key)!;
    history.push(message);
    
    // Keep only last 10 messages
    if (history.length > 10) {
      history.shift();
    }
  }

  private getConversationHistory(userAddress: string): ChatMessage[] {
    return this.conversationHistory.get(userAddress) || [];
  }

  private getCurrentNFTPrice(tokenId: string): string {
    const nftData = this.mockNFTs.get(tokenId);
    return nftData?.currentPrice || '0.1';
  }

  private getNFTMetadata(tokenId: string) {
    return this.mockNFTs.get(tokenId);
  }

  /**
   * Public methods for manual interaction
   */
  public async startNegotiation(userAddress: string, nftTokenId: string): Promise<void> {
    const nftData = this.getNFTMetadata(nftTokenId);
    const message = `Hi! I see you're interested in ${nftData?.name || `Token #${nftTokenId}`}. Current price is ${nftData?.currentPrice} ETH. What's your offer?`;
    
    await messagingService.sendMessage(
      userAddress,
      message,
      'text'
    );
  }

  public getAvailableNFTs(): Array<{id: string, data: any}> {
    return Array.from(this.mockNFTs.entries()).map(([id, data]) => ({ id, data }));
  }

  public getActiveOffers(): NFTOffer[] {
    return Array.from(this.offers.values()).filter(offer => offer.status === 'active');
  }
}

// Export singleton instance
export const nftNegotiationBot = new NFTNegotiationBot();
export default nftNegotiationBot;