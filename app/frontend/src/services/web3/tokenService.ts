/**
 * Token service for Web3 integration
 */

import { TokenActivity, TokenActivityType, TokenTransactionRequest, TokenTransactionResponse } from '../../types/tokenActivity';
import { TokenInfo } from '../../types/web3Community';
import { web3ErrorHandler } from '../../utils/web3ErrorHandling';
import deployedAddresses from '../../../../contracts/deployedAddresses-sepolia.json';
import { ldaoTokenService } from './ldaoTokenService';

export class TokenService {
  private static instance: TokenService;
  private priceCache: Map<string, { price: number; timestamp: Date }> = new Map();
  private readonly PRICE_CACHE_TTL = 30000; // 30 seconds

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
    try {
      // Check if this is the LDAO token
      if (tokenAddress === 'LDAO' || tokenAddress.toLowerCase() === 'ldao') {
        // Get actual token info from the contract
        const tokenInfo = await ldaoTokenService.getTokenInfo();
        
        if (tokenInfo) {
          return {
            address: deployedAddresses.contracts.LDAOToken.address,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            name: tokenInfo.name,
            logoUrl: '/logo.png',
            priceUSD: await this.getTokenPrice('LDAO'),
            priceChange24h: 0
          };
        }
        
        // Fallback if contract call fails
        return {
          address: deployedAddresses.contracts.LDAOToken.address,
          symbol: 'LDAO',
          decimals: 18,
          name: 'LinkDAO Token',
          logoUrl: '/logo.png',
          priceUSD: await this.getTokenPrice('LDAO'),
          priceChange24h: 0
        };
      }
      
      // This would typically call a token registry or blockchain RPC
      // For now, return mock data structure
      return {
        address: tokenAddress,
        symbol: 'TOKEN',
        decimals: 18,
        name: 'Sample Token',
        logoUrl: undefined,
        priceUSD: await this.getTokenPrice(tokenAddress),
        priceChange24h: 0
      };
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getTokenInfo',
        component: 'TokenService'
      });
      console.error('Failed to get token info:', errorResponse.message);
      return null;
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<number | undefined> {
    try {
      // Check cache first
      const cached = this.priceCache.get(tokenAddress);
      if (cached && Date.now() - cached.timestamp.getTime() < this.PRICE_CACHE_TTL) {
        return cached.price;
      }

      // Special handling for LDAO token
      if (tokenAddress === 'LDAO' || tokenAddress.toLowerCase() === 'ldao') {
        // Mock price for LDAO token - in a real implementation, this would call a price API
        const price = 0.5; // $0.50 USD
        this.priceCache.set(tokenAddress, {
          price,
          timestamp: new Date()
        });
        return price;
      }

      // This would typically call a price API like CoinGecko or DEX aggregator
      const price = 1.0; // Mock price
      
      this.priceCache.set(tokenAddress, {
        price,
        timestamp: new Date()
      });

      return price;
    } catch (error) {
      web3ErrorHandler.handleError(error as Error, {
        action: 'getTokenPrice',
        component: 'TokenService'
      });
      return undefined;
    }
  }

  async getUserTokenBalance(userAddress: string, tokenAddress: string): Promise<number> {
    try {
      // Check if this is the LDAO token
      if (tokenAddress === 'LDAO' || tokenAddress.toLowerCase() === 'ldao') {
        // Get actual balance from the contract
        const balance = await ldaoTokenService.getUserBalance(userAddress);
        return parseFloat(balance);
      }
      
      // This would call the blockchain to get actual balance for other tokens
      return 0;
    } catch (error) {
      web3ErrorHandler.handleError(error as Error, {
        action: 'getUserTokenBalance',
        component: 'TokenService'
      });
      return 0;
    }
  }

  async getTokenActivity(userAddress: string, limit: number = 50): Promise<TokenActivity[]> {
    try {
      // This would fetch from blockchain or indexer
      return [];
    } catch (error) {
      web3ErrorHandler.handleError(error as Error, {
        action: 'getTokenActivity',
        component: 'TokenService'
      });
      return [];
    }
  }

  async executeTokenTransaction(request: TokenTransactionRequest): Promise<TokenTransactionResponse> {
    try {
      // This would interact with wallet and blockchain
      return {
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        status: 'pending'
      };
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'executeTokenTransaction',
        component: 'TokenService'
      });
      
      return {
        transactionHash: '',
        status: 'failed',
        error: errorResponse.message
      };
    }
  }

  async tipUser(recipientAddress: string, amount: number, tokenAddress: string, postId?: string): Promise<TokenTransactionResponse> {
    return this.executeTokenTransaction({
      type: 'tip',
      amount,
      tokenAddress,
      recipientAddress,
      relatedContentId: postId
    });
  }

  async stakeOnPost(postId: string, amount: number, tokenAddress: string): Promise<TokenTransactionResponse> {
    return this.executeTokenTransaction({
      type: 'stake',
      amount,
      tokenAddress,
      relatedContentId: postId
    });
  }

  clearPriceCache(): void {
    this.priceCache.clear();
  }
}

export const tokenService = TokenService.getInstance();