/**
 * DEX Swap Service
 * Provides token swap functionality with Uniswap and 1inch integration
 */

import { Hash, PublicClient, WalletClient, parseUnits, formatUnits } from 'viem';
import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from './enhancedAuthService';
import { csrfService } from './csrfService';
import { pendingTransactionService } from './pendingTransactionService';


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

  constructor() {
    this.baseUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';
    this.enabled = process.env.NEXT_PUBLIC_ENABLE_DEX === 'true' || process.env.NEXT_PUBLIC_ENABLE_DEX_TRADING === 'true';
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
   * Get a swap quote from backend (aggregates 1inch/Uniswap)
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
      const response = await fetch(
        `${this.baseUrl}/api/dex/quote`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify({
            tokenInAddress: params.tokenIn.address,
            tokenOutAddress: params.tokenOut.address,
            amountIn: params.amountIn,
            chainId,
            slippageTolerance: params.slippageTolerance
          }),
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        console.warn('Backend quote failed:', response.status);
        return null;
      }

      const data = await response.json();
      const quoteData = data.quote;

      return {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOut: formatUnits(BigInt(quoteData.amountOut), params.tokenOut.decimals),
        amountOutMin: formatUnits(BigInt(quoteData.amountOutMin), params.tokenOut.decimals),
        priceImpact: parseFloat(quoteData.priceImpact || '0'),
        gasEstimate: quoteData.gasEstimate || '0',
        route: quoteData.route || [],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      return null;
    }
  }

  /**
   * Execute a token swap
   */
  async executeSwap(params: SwapExecutionParams): Promise<SwapResult> {
    if (!this.enabled) {
      return { success: false, error: 'DEX swap is disabled' };
    }

    try {
      // 1. Get Transaction Data from Backend
      const response = await fetch(
        `${this.baseUrl}/api/dex/build-tx`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify({
            tokenInAddress: params.tokenIn.address,
            tokenOutAddress: params.tokenOut.address,
            amountIn: params.amountIn,
            recipient: params.recipient || params.walletAddress,
            slippageTolerance: params.slippageTolerance,
            chainId: params.publicClient.chain?.id || 1
          }),
          signal: AbortSignal.timeout(15000)
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        return { success: false, error: errData.error || 'Failed to build transaction' };
      }

      const data = await response.json();
      const tx = data.tx;

      // 2. Sign and Send Transaction from Client
      const hash = await params.walletClient.sendTransaction({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(tx.value || '0'),
        account: params.walletAddress as `0x${string}`,
        chain: undefined,
        // Let wallet estimate gas or use backend suggestion (optional)
        // gas: tx.gas ? BigInt(tx.gas) : undefined
      });

      // Register pending transaction for immediate visibility
      try {
        pendingTransactionService.addTransaction({
          hash,
          type: 'swap',
          amount: params.amountIn,
          token: params.tokenIn.symbol,
          from: params.walletAddress,
          to: tx.to as string,
          chainId: params.publicClient.chain?.id || 1
        });
      } catch (pendingErr) {
        console.warn('Failed to register pending transaction:', pendingErr);
      }

      // 3. Wait for Receipt
      await params.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: true,
        transactionHash: hash,
        // We might not know exact amount out until confirmed, but we return estimated for now
        amountOut: '0'
      };

    } catch (error) {
      console.error('Swap execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
          headers: await this.getHeaders(),
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        return this.getDefaultTokens(chainId);
      }

      const data = await response.json();
      return data.tokens && data.tokens.length > 0 ? data.tokens : this.getDefaultTokens(chainId);
    } catch (error) {
      return this.getDefaultTokens(chainId);
    }
  }

  /**
   * Get default tokens for a chain (Fallback)
   */
  private getDefaultTokens(chainId: number): Token[] {
    const commonTokens: Record<number, Token[]> = {
      1: [ // Ethereum
        { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
        { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 }
      ],
      8453: [ // Base
        { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
        { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bDA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 }
      ],
      137: [ // Polygon
        { address: '0x7ceB23fD6bC0adD59E62ac25578270cCf1b9f619', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
        { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6 }
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
          headers: await this.getHeaders()
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.token || null;
    } catch {
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
          headers: await this.getHeaders()
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.price || null;
    } catch {
      return null;
    }
  }

  /**
   * Get spender address for approval
   */
  async getSpenderAddress(chainId: number = 1): Promise<string | null> {
    // Return backend proxy router address or common 1inch router
    // Ideally this comes from backend config
    const ROUTERS: Record<number, string> = {
      1: '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch V5
      11155111: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E', // Sepolia Uniswap Router
      8453: '0x2626664c2603336E57B271c5C0b26F421741e481' // Base Uniswap Router
    };
    return ROUTERS[chainId] || null;
  }

  async checkHealth(): Promise<boolean> {
    // Simplified health check
    return true;
  }
}

// Export singleton instance
export const dexSwapService = new DexSwapService();
