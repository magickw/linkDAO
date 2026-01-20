/**
 * DEX Swap Service
 * Provides token swap functionality with Uniswap and 1inch integration
 */

import { Hash, PublicClient, WalletClient, parseUnits, formatUnits } from 'viem';
import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from './enhancedAuthService';
import { csrfService } from './csrfService';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  price?: number;
}

export interface SwapParams {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string; // In human-readable format (e.g., "1.5" ETH)
  slippageTolerance: number; // In percentage (e.g., 0.5 for 0.5%)
  recipient?: string;
}

export interface SwapQuote {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  amountOutMin: string; // Minimum amount out after slippage
  priceImpact: number; // In percentage
  gasEstimate: string;
  route: string[]; // List of intermediate tokens
  timestamp: number;
}

export interface SwapResult {
  success: boolean;
  transactionHash?: Hash;
  amountOut?: string;
  error?: string;
}

export interface SwapExecutionParams extends SwapParams {
  walletAddress: string;
  publicClient: PublicClient;
  walletClient: WalletClient;
}

export class DexSwapService {
  private baseUrl: string;
  private enabled: boolean;
  private oneInchApiKey: string;
  private uniswapEnabled: boolean;

  constructor() {
    this.baseUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';
    this.enabled = process.env.NEXT_PUBLIC_ENABLE_DEX === 'true' || process.env.NEXT_PUBLIC_ENABLE_DEX_TRADING === 'true';
    this.oneInchApiKey = process.env.NEXT_PUBLIC_ONEINCH_API_KEY || '';
    this.uniswapEnabled = process.env.NEXT_PUBLIC_ENABLE_UNISWAP === 'true';
  }

  /**
   * Get headers for API requests including Auth and CSRF
   */
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    // Add Auth token
    const token = enhancedAuthService.getSession()?.token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add CSRF token
    const csrfHeaders = await csrfService.getCSRFHeaders();
    Object.assign(headers, csrfHeaders);

    return headers;
  }

  /**
   * Get a swap quote from multiple DEX aggregators
   */
  async getSwapQuote(
    params: SwapParams,
    chainId: number = 1
  ): Promise<SwapQuote | null> {
    if (!this.enabled) {
      console.warn('DEX swap is disabled');
      return null;
    }

    try {
      // Try 1inch API first (best aggregation)
      if (this.oneInchApiKey) {
        const oneInchQuote = await this.getOneInchQuote(params, chainId);
        if (oneInchQuote) {
          return oneInchQuote;
        }
      }

      // Fallback to Uniswap V3
      if (this.uniswapEnabled) {
        const uniswapQuote = await this.getUniswapQuote(params, chainId);
        if (uniswapQuote) {
          return uniswapQuote;
        }
      }

      // Fallback to backend API
      return await this.getBackendQuote(params, chainId);
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      return null;
    }
  }

  /**
   * Get quote from 1inch API
   */
  private async getOneInchQuote(
    params: SwapParams,
    chainId: number
  ): Promise<SwapQuote | null> {
    try {
      // 1inch API call remains direct as it uses API Key, not our backend auth
      const response = await fetch(
        `https://api.1inch.dev/swap/v6.0/${chainId}/quote`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.oneInchApiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        console.warn('1inch API failed:', response.status);
        return null;
      }

      const data = await response.json();

      return {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOut: formatUnits(BigInt(data.toAmount), params.tokenOut.decimals),
        amountOutMin: formatUnits(
          BigInt(data.toAmount) * BigInt(10000 - Math.floor(params.slippageTolerance * 100)) / 10000n,
          params.tokenOut.decimals
        ),
        priceImpact: parseFloat(data.estimatedImpact || '0'),
        gasEstimate: data.gas || '0',
        route: data.route || [],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('1inch quote error:', error);
      return null;
    }
  }

  /**
   * Get quote from Uniswap V3
   */
  private async getUniswapQuote(
    params: SwapParams,
    chainId: number
  ): Promise<SwapQuote | null> {
    try {
      const amountInWei = parseUnits(params.amountIn, params.tokenIn.decimals);

      // Call backend Uniswap endpoint
      const response = await fetch(
        `${this.baseUrl}/api/dex/uniswap/quote`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify({
            tokenIn: params.tokenIn.address,
            tokenOut: params.tokenOut.address,
            amountIn: amountInWei.toString(),
            chainId,
            slippageTolerance: params.slippageTolerance
          }),
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOut: formatUnits(BigInt(data.amountOut), params.tokenOut.decimals),
        amountOutMin: formatUnits(
          BigInt(data.amountOutMin),
          params.tokenOut.decimals
        ),
        priceImpact: data.priceImpact || 0,
        gasEstimate: data.gasEstimate || '0',
        route: data.route || [],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Uniswap quote error:', error);
      return null;
    }
  }

  /**
   * Get quote from backend API (fallback)
   */
  private async getBackendQuote(
    params: SwapParams,
    chainId: number
  ): Promise<SwapQuote | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/quote`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify({
            tokenInAddress: params.tokenIn.address,
            tokenOutAddress: params.tokenOut.address,
            amountIn: params.amountIn,
            slippageTolerance: params.slippageTolerance,
            chainId
          }),
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOut: data.quote?.amountOut || '0',
        amountOutMin: data.quote?.amountOutMin || '0',
        priceImpact: parseFloat(data.quote?.priceImpact || '0'),
        gasEstimate: data.quote?.gasEstimate || '0',
        route: data.quote?.route || [],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Backend quote error:', error);
      return null;
    }
  }

  /**
   * Execute a token swap
   */
  async executeSwap(params: SwapExecutionParams): Promise<SwapResult> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'DEX swap is disabled'
      };
    }

    try {
      // Get swap quote
      const quote = await this.getSwapQuote(params, params.publicClient.chain?.id || 1);
      if (!quote) {
        return {
          success: false,
          error: 'Failed to get swap quote'
        };
      }

      // Try 1inch execution first
      if (this.oneInchApiKey) {
        const oneInchResult = await this.executeOneInchSwap(params, quote);
        if (oneInchResult.success) {
          return oneInchResult;
        }
      }

      // Fallback to Uniswap execution
      if (this.uniswapEnabled) {
        const uniswapResult = await this.executeUniswapSwap(params, quote);
        if (uniswapResult.success) {
          return uniswapResult;
        }
      }

      // Fallback to backend execution
      return await this.executeBackendSwap(params, quote);
    } catch (error) {
      console.error('Swap execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute swap using 1inch API
   */
  private async executeOneInchSwap(
    params: SwapExecutionParams,
    quote: SwapQuote
  ): Promise<SwapResult> {
    try {
      const response = await fetch(
        `https://api.1inch.dev/swap/v6.0/${params.publicClient.chain?.id || 1}/swap`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.oneInchApiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(30000)
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `1inch API failed: ${response.status}`
        };
      }

      const data = await response.json();

      // Execute transaction using wallet client
      const txParams = {
        to: data.to as `0x${string}`,
        data: data.data as `0x${string}`,
        value: BigInt(data.value || '0'),
        account: params.walletAddress as `0x${string}`,
        gas: data.gas ? BigInt(data.gas) : undefined,
        ...(data.gasPrice ? { gasPrice: BigInt(data.gasPrice) } : {}),
        ...(data.maxFeePerGas ? { maxFeePerGas: BigInt(data.maxFeePerGas) } : {}),
        ...(data.maxPriorityFeePerGas ? { maxPriorityFeePerGas: BigInt(data.maxPriorityFeePerGas) } : {})
      };

      const hash = await params.walletClient.sendTransaction(txParams as any);

      // Wait for transaction confirmation
      await params.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: true,
        transactionHash: hash,
        amountOut: quote.amountOut
      };
    } catch (error) {
      console.error('1inch swap error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '1inch swap failed'
      };
    }
  }

  /**
   * Execute swap using Uniswap V3
   */
  private async executeUniswapSwap(
    params: SwapExecutionParams,
    quote: SwapQuote
  ): Promise<SwapResult> {
    try {
      const amountInWei = parseUnits(params.amountIn, params.tokenIn.decimals);
      const amountOutMinWei = parseUnits(quote.amountOutMin, params.tokenOut.decimals);

      // Get swap data from backend
      const response = await fetch(
        `${this.baseUrl}/api/dex/uniswap/swap`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify({
            tokenIn: params.tokenIn.address,
            tokenOut: params.tokenOut.address,
            amountIn: amountInWei.toString(),
            amountOutMin: amountOutMinWei.toString(),
            recipient: params.recipient || params.walletAddress,
            slippageTolerance: params.slippageTolerance,
            chainId: params.publicClient.chain?.id || 1
          }),
          signal: AbortSignal.timeout(30000)
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Uniswap API failed: ${response.status}`
        };
      }

      const data = await response.json();

      // Execute transaction
      const hash = await params.walletClient.sendTransaction({
        to: data.to as `0x${string}`,
        data: data.data as `0x${string}`,
        value: BigInt(data.value || '0'),
        account: params.walletAddress as `0x${string}`,
        chain: undefined,
        gas: data.gas ? BigInt(data.gas) : undefined
      });

      // Wait for confirmation
      await params.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: true,
        transactionHash: hash,
        amountOut: quote.amountOut
      };
    } catch (error) {
      console.error('Uniswap swap error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Uniswap swap failed'
      };
    }
  }

  /**
   * Execute swap using backend API (fallback)
   */
  private async executeBackendSwap(
    params: SwapExecutionParams,
    quote: SwapQuote
  ): Promise<SwapResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/execute`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify({
            tokenInAddress: params.tokenIn.address,
            tokenOutAddress: params.tokenOut.address,
            amountIn: params.amountIn,
            amountOutMin: quote.amountOutMin,
            recipient: params.recipient || params.walletAddress,
            slippageTolerance: params.slippageTolerance,
            chainId: params.publicClient.chain?.id || 1
          }),
          signal: AbortSignal.timeout(30000)
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Backend API failed: ${response.status}`
        };
      }

      const data = await response.json();

      // Execute transaction
      const hash = await params.walletClient.sendTransaction({
        to: data.to as `0x${string}`,
        data: data.data as `0x${string}`,
        value: BigInt(data.value || '0'),
        account: params.walletAddress as `0x${string}`,
        chain: undefined,
        gas: data.gas ? BigInt(data.gas) : undefined
      });

      // Wait for confirmation
      await params.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: true,
        transactionHash: hash,
        amountOut: quote.amountOut
      };
    } catch (error) {
      console.error('Backend swap error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backend swap failed'
      };
    }
  }

  /**
   * Get popular tokens for a chain
   */
  async getPopularTokens(chainId: number = 1): Promise<Token[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/popular-tokens?chainId=${chainId}`,
        {
          // We can try to use auth headers here too, just in case
          headers: await this.getHeaders(),
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        // Silently fall back to default tokens if endpoint doesn't exist
        return this.getDefaultTokens(chainId);
      }

      const data = await response.json();
      return data.tokens || this.getDefaultTokens(chainId);
    } catch (error) {
      // Endpoint likely doesn't exist yet or failed, so we just use default tokens
      // No console.error to avoid spamming logs
      return this.getDefaultTokens(chainId);
    }
  }

  /**
   * Get default tokens for a chain
   */
  private getDefaultTokens(chainId: number): Token[] {
    const commonTokens: Record<number, Token[]> = {
      1: [ // Ethereum
        {
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          symbol: 'WETH',
          name: 'Wrapped Ether',
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
          name: 'Wrapped BTC',
          decimals: 8
        }
      ],
      8453: [ // Base
        {
          address: '0x4200000000000000000000000000000000000006',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18
        },
        {
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bDA02913',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6
        }
      ],
      137: [ // Polygon
        {
          address: '0x7ceB23fD6bC0adD59E62ac25578270cCf1b9f619',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18
        },
        {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6
        }
      ]
    };

    return commonTokens[chainId] || commonTokens[1];
  }

  /**
   * Validate token address
   */
  async validateToken(tokenAddress: string, chainId: number = 1): Promise<Token | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/validate/${tokenAddress}?chainId=${chainId}`,
        {
          headers: await this.getHeaders(),
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.token || null;
    } catch (error) {
      // Swallow error for cleaner logs (user just sees token not found)
      // console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Get token price
   */
  async getTokenPrice(tokenAddress: string, chainId: number = 1): Promise<number | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/price/${tokenAddress}?chainId=${chainId}`,
        {
          headers: await this.getHeaders(),
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.price || null;
    } catch (error) {
      // Swallow error
      return null;
    }
  }

  /**
   * Get spender address for approval
   */
  async getSpenderAddress(chainId: number = 1): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      // Try 1inch first
      if (this.oneInchApiKey) {
        const response = await fetch(
          `https://api.1inch.dev/swap/v6.0/${chainId}/approve/spender`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.oneInchApiKey}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          }
        );

        if (response.ok) {
          const data = await response.json();
          return data.address;
        }
      }

      // Fallback for Uniswap/Backend (Router address)
      // These should ideally be fetched from configuration or API
      // Using known Universal Router addresses or 0x as placeholders
      const UNISWAP_ROUTERS: Record<number, string> = {
        1: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
        137: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        42161: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        8453: '0x2626664c2603336E57B271c5C0b26F421741e481', // Uniswap V3 Base
        11155111: '0x3bFA4769FB09e8893f0G2F1b259fb984e469D1e9' // Sepolia placeholder
      };

      return UNISWAP_ROUTERS[chainId] || null;
    } catch (error) {
      console.error('Failed to get spender address:', error);
      return null;
    }
  }

  /**
   * Check if DEX service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/dex/health`,
        {
          headers: await this.getHeaders(),
          signal: AbortSignal.timeout(5000)
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const dexSwapService = new DexSwapService();
