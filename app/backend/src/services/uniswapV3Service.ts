import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { Pool, Route, Trade, SwapQuoter, SwapRouter } from '@uniswap/v3-sdk';
import type { AlphaRouter, SwapType } from '@uniswap/smart-order-router';
import { IUniswapV3Service, SwapQuote, SwapParams, SwapResult, LiquidityInfo } from '../types/uniswapV3';

export class UniswapV3Service implements IUniswapV3Service {
  private provider: ethers.JsonRpcProvider;
  private alphaRouter: AlphaRouter | null = null;
  private swapTypeEnum: any = null;
  private chainId: number;
  private quoterAddress: string;
  private routerAddress: string;

  constructor(
    rpcUrl: string,
    chainId: number = 1,
    quoterAddress: string = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    routerAddress: string = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.chainId = chainId;
    this.quoterAddress = quoterAddress;
    this.routerAddress = routerAddress;

    // Try to initialize AlphaRouter, but handle compatibility issues gracefully
    // Try to initialize AlphaRouter, but handle compatibility issues gracefully
    try {
      // Dynamic require to avoid crashing if dependency is incompatible (ethers v6 vs v5)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AlphaRouter, SwapType } = require('@uniswap/smart-order-router');

      this.alphaRouter = new AlphaRouter({
        chainId: this.chainId,
        provider: this.provider as any, // Type assertion to handle compatibility issues
      });
      this.swapTypeEnum = SwapType;
      safeLogger.info('AlphaRouter initialized successfully');
    } catch (error) {
      safeLogger.warn('Failed to initialize AlphaRouter, DEX swap functionality will be limited:', error);
      this.alphaRouter = null;
      this.swapTypeEnum = null;
    }
  }

  /**
   * Get a quote for swapping tokens
   */
  async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
    // If AlphaRouter is not available, throw an error
    if (!this.alphaRouter) {
      throw new Error('DEX swap functionality is not available due to initialization issues');
    }

    try {
      const { tokenIn, tokenOut, amountIn, slippageTolerance = 0.5 } = params;

      // Create token instances
      const tokenInInstance = new Token(
        this.chainId,
        tokenIn.address,
        tokenIn.decimals,
        tokenIn.symbol,
        tokenIn.name
      );

      const tokenOutInstance = new Token(
        this.chainId,
        tokenOut.address,
        tokenOut.decimals,
        tokenOut.symbol,
        tokenOut.name
      );

      // Create currency amount
      const currencyAmount = CurrencyAmount.fromRawAmount(
        tokenInInstance,
        ethers.parseUnits(amountIn.toString(), tokenIn.decimals).toString()
      );

      // Get route using AlphaRouter
      const route = await this.alphaRouter.route(
        currencyAmount,
        tokenOutInstance,
        TradeType.EXACT_INPUT,
        {
          recipient: params.recipient || ethers.ZeroAddress,
          slippageTolerance: new Percent(Math.floor(slippageTolerance * 100), 10000),
          deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
          recipient: params.recipient || ethers.ZeroAddress,
          slippageTolerance: new Percent(Math.floor(slippageTolerance * 100), 10000),
          deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
          type: this.swapTypeEnum.SWAP_ROUTER_02,
        }
      );

      if (!route) {
        throw new Error('No route found for swap');
      }

      // Calculate gas estimate
      const gasEstimate = await this.estimateGas(route.methodParameters!);

      return {
        amountIn: amountIn.toString(),
        amountOut: route.quote.toFixed(),
        amountOutMinimum: route.quote.multiply(new Percent(10000 - Math.floor(slippageTolerance * 100), 10000)).toFixed(),
        priceImpact: route.estimatedGasUsedQuoteToken?.toFixed() || '0',
        gasEstimate: gasEstimate.toString(),
        route: route.route.map(r => {
          // Handle different route types (V2 vs V3)
          if ('tokenIn' in r && 'tokenOut' in r && 'pools' in r) {
            // V3 route
            return {
              tokenIn: (r as any).tokenIn.address,
              tokenOut: (r as any).tokenOut.address,
              fee: (r as any).pools[0]?.fee || 0,
              pool: (r as any).pools[0]?.token0?.address || '',
            };
          } else if ('pair' in r) {
            // V2 route
            return {
              tokenIn: (r as any).pair.token0.address,
              tokenOut: (r as any).pair.token1.address,
              fee: 3000, // Standard V2 fee
              pool: (r as any).pair.liquidityToken.address,
            };
          } else {
            // Fallback
            return {
              tokenIn: '',
              tokenOut: '',
              fee: 0,
              pool: '',
            };
          }
        }),
        methodParameters: route.methodParameters,
        blockNumber: await this.provider.getBlockNumber(),
        timestamp: Date.now(),
      };
    } catch (error) {
      safeLogger.error('Error getting swap quote:', error);
      throw new Error(`Failed to get swap quote: ${error.message}`);
    }
  }

  /**
   * Execute a token swap
   */
  async executeSwap(params: SwapParams, privateKey: string): Promise<SwapResult> {
    try {
      const quote = await this.getSwapQuote(params);

      if (!quote.methodParameters) {
        throw new Error('No method parameters available for swap');
      }

      const wallet = new ethers.Wallet(privateKey, this.provider);

      // Execute the swap transaction
      const transaction = {
        to: quote.methodParameters.to,
        data: quote.methodParameters.calldata,
        value: quote.methodParameters.value,
        gasLimit: quote.gasEstimate,
        gasPrice: (await this.provider.getFeeData()).gasPrice || BigInt(0),
      };

      const txResponse = await wallet.sendTransaction(transaction);
      const receipt = await txResponse.wait();

      return {
        transactionHash: receipt.hash || (receipt as any).transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        timestamp: Date.now(),
      };
    } catch (error) {
      safeLogger.error('Error executing swap:', error);
      throw new Error(`Failed to execute swap: ${error.message}`);
    }
  }

  /**
   * Get liquidity information for a token pair
   */
  async getLiquidityInfo(tokenA: string, tokenB: string, fee: number = 3000): Promise<LiquidityInfo> {
    try {
      // This is a simplified implementation
      // In a real implementation, you would query the pool contract directly
      const poolAddress = await this.getPoolAddress(tokenA, tokenB, fee);

      return {
        poolAddress,
        liquidity: '0', // Would be fetched from pool contract
        sqrtPriceX96: '0', // Would be fetched from pool contract
        tick: 0, // Would be fetched from pool contract
        fee,
        token0: tokenA < tokenB ? tokenA : tokenB,
        token1: tokenA < tokenB ? tokenB : tokenA,
        reserve0: '0', // Would be calculated from liquidity
        reserve1: '0', // Would be calculated from liquidity
      };
    } catch (error) {
      safeLogger.error('Error getting liquidity info:', error);
      throw new Error(`Failed to get liquidity info: ${error.message}`);
    }
  }

  /**
   * Monitor liquidity pools for better routing
   */
  async monitorLiquidityPools(tokenPairs: Array<{ tokenA: string; tokenB: string; fee: number }>): Promise<LiquidityInfo[]> {
    const liquidityInfos: LiquidityInfo[] = [];

    for (const pair of tokenPairs) {
      try {
        const info = await this.getLiquidityInfo(pair.tokenA, pair.tokenB, pair.fee);
        liquidityInfos.push(info);
      } catch (error) {
        safeLogger.error(`Error monitoring pool ${pair.tokenA}/${pair.tokenB}:`, error);
      }
    }

    return liquidityInfos;
  }

  /**
   * Handle swap failures and provide alternatives
   */
  async handleSwapFailure(params: SwapParams, error: Error): Promise<SwapQuote[]> {
    // If AlphaRouter is not available, return empty array
    if (!this.alphaRouter) {
      safeLogger.warn('DEX swap functionality not available, cannot provide alternatives');
      return [];
    }

    safeLogger.info('Handling swap failure, looking for alternatives...');

    const alternatives: SwapQuote[] = [];

    // Try different fee tiers
    const feeTiers = [500, 3000, 10000];

    for (const fee of feeTiers) {
      try {
        // This would involve modifying the route to use specific fee tiers
        // For now, we'll return the original quote with different parameters
        const alternativeParams = { ...params, slippageTolerance: (params.slippageTolerance || 0.5) + 0.5 };
        const quote = await this.getSwapQuote(alternativeParams);
        alternatives.push(quote);
      } catch (altError) {
        safeLogger.error(`Alternative with fee ${fee} also failed:`, altError);
      }
    }

    return alternatives;
  }

  /**
   * Estimate gas for a transaction
   */
  private async estimateGas(methodParameters: any): Promise<bigint> {
    try {
      return await this.provider.estimateGas({
        to: methodParameters.to,
        data: methodParameters.calldata,
        value: methodParameters.value,
      });
    } catch (error) {
      safeLogger.error('Error estimating gas:', error);
      return BigInt(200000); // Default gas limit
    }
  }

  /**
   * Get pool address for token pair
   */
  private async getPoolAddress(tokenA: string, tokenB: string, fee: number): Promise<string> {
    // This would typically use the Uniswap V3 Factory contract to get the pool address
    // For now, returning a placeholder
    return ethers.ZeroAddress;
  }

  /**
   * Get current gas price with optimization
   */
  async getOptimizedGasPrice(): Promise<bigint> {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      // Add 10% buffer for faster execution
      return (gasPrice * BigInt(110)) / BigInt(100);
    } catch (error) {
      safeLogger.error('Error getting gas price:', error);
      return ethers.parseUnits('20', 'gwei'); // Fallback gas price
    }
  }

  /**
   * Validate token addresses and get token info
   */
  async validateAndGetTokenInfo(tokenAddress: string): Promise<{ symbol: string; decimals: number; name: string }> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function symbol() view returns (string)', 'function decimals() view returns (uint8)', 'function name() view returns (string)'],
        this.provider
      );

      const [symbol, decimals, name] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.name(),
      ]);

      return { symbol, decimals, name };
    } catch (error) {
      safeLogger.error('Error validating token:', error);
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }
  }
}
