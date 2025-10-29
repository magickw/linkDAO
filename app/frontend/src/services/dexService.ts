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
}

// Create a default instance
export const dexService = new DEXService();
export default dexService;