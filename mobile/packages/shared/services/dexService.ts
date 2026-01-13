/**
 * DEX Service with Graceful Error Handling
 * Provides token discovery and trading functionality with fallbacks
 */

import { Config } from '../constants/config';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  price?: number;
}

export interface TokenDiscoveryResult {
  tokens: Token[];
  cached: boolean;
  error?: string;
}

export interface SwapQuoteParams {
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: number;
  slippageTolerance?: number;
  recipient?: string;
}

export interface SwapQuoteResult {
  amountIn: string;
  amountOut: string;
  priceImpact: string;
  gasEstimate: string;
  route: any[];
  timestamp: number;
}

export interface SwapQuoteResponse {
  success: boolean;
  data?: {
    quote: SwapQuoteResult;
    tokenIn: Token;
    tokenOut: Token;
    timestamp: number;
  };
  message?: string;
  error?: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export class DEXService {
  private baseUrl: string;
  private enabled: boolean;

  constructor() {
    this.baseUrl = Config.backendUrl;
    this.enabled = Config.enableDex;
  }

  /**
   * Discover tokens for a wallet address
   * Returns empty array if service is unavailable
   */
  async discoverTokens(
    address: string,
    chainId: number = 1
  ): Promise<TokenDiscoveryResult> {
    if (!this.enabled) {
      return { tokens: [], cached: false, error: 'DEX discovery is not enabled' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/discover-tokens?address=${address}&chainId=${chainId}`,
        {
          signal: (AbortSignal as any).timeout(10000), 
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        return { tokens: [], cached: false, error: 'Service not available' };
      }

      const data = await response.json();
      return { tokens: data.tokens || [], cached: data.cached || false };
    } catch (error) {
      console.warn('DEX token discovery failed:', error);
      return { tokens: [], cached: false, error: 'Failed to discover tokens' };
    }
  }

  /**
   * Get popular tokens for a specific chain
   */
  async getPopularTokens(chainId: number = 1): Promise<TokenInfo[]> {
    if (!this.enabled) {
      return this.getDefaultPopularTokens(chainId);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/popular-tokens?chainId=${chainId}`,
        { signal: (AbortSignal as any).timeout(5000) }
      );

      if (!response.ok) {
        return this.getDefaultPopularTokens(chainId);
      }

      const data = await response.json();
      return data.tokens || this.getDefaultPopularTokens(chainId);
    } catch (error) {
      return this.getDefaultPopularTokens(chainId);
    }
  }

  private getDefaultPopularTokens(chainId: number): TokenInfo[] {
    switch (chainId) {
      case 1:
        return [
          { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
          { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
          { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 }
        ];
      case 8453:
        return [
          { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
          { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 }
        ];
      default:
        return [
          { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Native Token', decimals: 18 }
        ];
    }
  }

  async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResponse | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/quote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: (AbortSignal as any).timeout(10000)
        }
      );

      if (!response.ok) return { success: false, message: 'Failed to get quote' };
      return await response.json();
    } catch (error) {
      return { success: false, message: 'Quote fetch failed' };
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const response = await fetch(`${this.baseUrl}/api/dex/health`, {
        signal: (AbortSignal as any).timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const dexService = new DEXService();
