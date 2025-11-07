/**
 * DEX Service with Graceful Error Handling
 * Provides token discovery and trading functionality with fallbacks
 */

import { ENV_CONFIG } from '@/config/environment';

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
    this.baseUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';
    this.enabled = process.env.NEXT_PUBLIC_ENABLE_DEX === 'true';
  }

  /**
   * Discover tokens for a wallet address
   * Returns empty array if service is unavailable
   */
  async discoverTokens(
    address: string,
    chainId: number = 1
  ): Promise<TokenDiscoveryResult> {
    // Check if DEX feature is enabled
    if (!this.enabled) {
      console.info('DEX discovery is disabled');
      return {
        tokens: [],
        cached: false,
        error: 'DEX discovery is not enabled'
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/discover-tokens?address=${address}&chainId=${chainId}`,
        {
          signal: AbortSignal.timeout(10000), // 10 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('DEX discovery endpoint not implemented yet');
          return {
            tokens: [],
            cached: false,
            error: 'Service not available'
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        tokens: data.tokens || [],
        cached: data.cached || false
      };
    } catch (error) {
      console.warn('DEX token discovery failed:', error);
      return {
        tokens: [],
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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
        {
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        // Return default tokens if API fails
        return this.getDefaultPopularTokens(chainId);
      }

      const data = await response.json();
      return data.tokens || this.getDefaultPopularTokens(chainId);
    } catch (error) {
      console.warn('Failed to get popular tokens:', error);
      // Return default tokens if API fails
      return this.getDefaultPopularTokens(chainId);
    }
  }

  /**
   * Get default popular tokens for different chains
   */
  private getDefaultPopularTokens(chainId: number): TokenInfo[] {
    switch (chainId) {
      case 1: // Ethereum Mainnet
        return [
          {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18
          },
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6
          },
          {
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            symbol: 'USDT',
            name: 'Tether USD',
            decimals: 6
          },
          {
            address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
            symbol: 'WBTC',
            name: 'Wrapped Bitcoin',
            decimals: 8
          }
        ];
      case 8453: // Base
        return [
          {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18
          },
          {
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6
          },
          {
            address: '0x4200000000000000000000000000000000000006',
            symbol: 'WETH',
            name: 'Wrapped Ether',
            decimals: 18
          }
        ];
      case 137: // Polygon
        return [
          {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'MATIC',
            name: 'Polygon',
            decimals: 18
          },
          {
            address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            symbol: 'USDC',
            name: 'USD Coin (PoS)',
            decimals: 6
          },
          {
            address: '0xc2132D05D31c914a87C6611C10748AaCB6D3cC19',
            symbol: 'USDT',
            name: 'Tether USD',
            decimals: 6
          }
        ];
      default:
        // Return basic tokens for other chains
        return [
          {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Native Token',
            decimals: 18
          },
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6
          }
        ];
    }
  }

  /**
   * Get a swap quote for token pair
   */
  async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResponse | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/quote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(params),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      );

      if (!response.ok) {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to get swap quote:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate token address and get token information
   */
  async validateToken(tokenAddress: string, chainId: number = 1): Promise<TokenInfo | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/validate/${tokenAddress}?chainId=${chainId}`,
        {
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to validate token:', error);
      return null;
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress: string, chainId: number = 1): Promise<Token | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/token-info/${tokenAddress}?chainId=${chainId}`,
        {
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to get token info:', error);
      return null;
    }
  }

  /**
   * Get token price
   */
  async getTokenPrice(tokenAddress: string, chainId: number = 1): Promise<number | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/price/${tokenAddress}?chainId=${chainId}`,
        {
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.price || null;
    } catch (error) {
      console.warn('Failed to get token price:', error);
      return null;
    }
  }

  /**
   * Check if DEX service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/dex/health`, {
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const dexService = new DEXService();