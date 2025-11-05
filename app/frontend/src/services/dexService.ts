import { TokenInfo, SwapQuote, SwapParams, LiquidityInfo, GasEstimate } from '../types/dex';

export class DEXService {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = '/api/dex', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Get a swap quote from the DEX
   */
  async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
    try {
      const response = await fetch(`${this.baseUrl}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify(params)
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get swap quote');
      }

      return result.data.quote;
    } catch (error: any) {
      console.error('Error getting swap quote:', error);
      throw new Error(`Failed to get swap quote: ${error.message || error}`);
    }
  }

  /**
   * Get real-time price for a token pair
   */
  async getTokenPrice(tokenInAddress: string, tokenOutAddress: string, amountIn: number = 1): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/price?tokenInAddress=${tokenInAddress}&tokenOutAddress=${tokenOutAddress}&amountIn=${amountIn}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get token price');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error getting token price:', error);
      throw new Error(`Failed to get token price: ${error.message || error}`);
    }
  }

  /**
   * Get liquidity information for a token pair
   */
  async getLiquidityInfo(tokenA: string, tokenB: string, fee: number = 3000): Promise<LiquidityInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/liquidity?tokenA=${tokenA}&tokenB=${tokenB}&fee=${fee}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get liquidity info');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error getting liquidity info:', error);
      throw new Error(`Failed to get liquidity info: ${error.message || error}`);
    }
  }

  /**
   * Get gas estimate for a swap
   */
  async getGasEstimate(params: Omit<SwapParams, 'slippageTolerance' | 'recipient'>): Promise<GasEstimate> {
    try {
      const response = await fetch(`${this.baseUrl}/gas-estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify(params)
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get gas estimate');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error getting gas estimate:', error);
      throw new Error(`Failed to get gas estimate: ${error.message || error}`);
    }
  }

  /**
   * Validate token address and get token information
   */
  async validateToken(tokenAddress: string): Promise<TokenInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/validate/${tokenAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Invalid token address');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error validating token:', error);
      throw new Error(`Failed to validate token: ${error.message || error}`);
    }
  }

  /**
   * Get network gas fees
   */
  async getNetworkGasFees(chainId?: number): Promise<any> {
    try {
      const url = chainId 
        ? `${this.baseUrl}/gas-fees?chainId=${chainId}`
        : `${this.baseUrl}/gas-fees`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get gas fees');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error getting gas fees:', error);
      throw new Error(`Failed to get gas fees: ${error.message || error}`);
    }
  }

  /**
   * Get popular tokens for swapping
   */
  async getPopularTokens(chainId: number = 1): Promise<TokenInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/popular-tokens?chainId=${chainId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get popular tokens');
      }

      return result.data.tokens;
    } catch (error: any) {
      console.error('Error getting popular tokens:', error);
      // Return default tokens as fallback
      return this.getDefaultTokens(chainId);
    }
  }

  /**
   * Discover tokens held by a wallet address
   */
  async discoverTokens(address: string, chainId: number = 1): Promise<TokenInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/discover-tokens?address=${address}&chainId=${chainId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to discover tokens');
      }

      return result.data.tokens;
    } catch (error: any) {
      console.error('Error discovering tokens:', error);
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Get default tokens for a chain
   */
  private getDefaultTokens(chainId: number): TokenInfo[] {
    switch (chainId) {
      case 8453: // Base Mainnet
        return [
          { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, name: 'Ethereum' },
          { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
          { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
          { address: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196', symbol: 'LINK', decimals: 18, name: 'Chainlink' }
        ];
      case 137: // Polygon
        return [
          { address: '0x0000000000000000000000000000000000000000', symbol: 'MATIC', decimals: 18, name: 'Polygon' },
          { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6, name: 'USD Coin (Polygon)' },
          { address: '0xc2132D05D31c914a87C6611C10748AaCB6D3cC19', symbol: 'USDT', decimals: 6, name: 'Tether USD (Polygon)' },
          { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether (Polygon)' }
        ];
      case 1: // Ethereum Mainnet
      default:
        return [
          { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, name: 'Ethereum' },
          { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
          { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
          { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' }
        ];
    }
  }
}

// Create a default instance
export const dexService = new DEXService();
export default dexService;