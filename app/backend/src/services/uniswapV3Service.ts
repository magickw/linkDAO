import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { Pool, Route, Trade, SwapQuoter, SwapRouter, FeeAmount, computePoolAddress } from '@uniswap/v3-sdk';
import { IUniswapV3Service, SwapQuote, SwapParams, SwapResult, LiquidityInfo } from '../types/uniswapV3';

// Uniswap V3 contract ABIs (minimal)
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
  'function quoteExactOutputSingle((address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)'
];

const POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() external view returns (uint128)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)'
];

const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// Uniswap V3 Factory address (same across networks)
// const UNISWAP_V3_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

export class UniswapV3Service implements IUniswapV3Service {
  private provider: ethers.JsonRpcProvider;
  private chainId: number;
  private quoterAddress: string;
  private routerAddress: string;
  private factoryAddress: string;

  constructor(
    rpcUrl: string,
    chainId: number = 11155111,
    quoterAddress: string = '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3', // Sepolia Quoter V2
    routerAddress: string = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E', // Sepolia SwapRouter02
    factoryAddress: string = '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'  // Sepolia Factory
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.chainId = chainId;
    this.quoterAddress = quoterAddress;
    this.routerAddress = routerAddress;
    this.factoryAddress = factoryAddress;

    safeLogger.info('UniswapV3Service initialized with direct SDK integration (ethers v6 compatible)');
  }

  /**
   * Get a quote for swapping tokens using Quoter V2 contract directly
   */
  async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
    try {
      const { tokenIn, tokenOut, amountIn } = params;
      const fee = 3000; // Default 0.3% fee
      const tradeType = 'EXACT_INPUT'; // Default to exact input

      // Get token info
      const [tokenInInfo, tokenOutInfo] = await Promise.all([
        this.validateAndGetTokenInfo(tokenIn.address),
        this.validateAndGetTokenInfo(tokenOut.address)
      ]);

      const quoterContract = new ethers.Contract(this.quoterAddress, QUOTER_V2_ABI, this.provider);

      let amountOut: bigint;
      let amountInBigInt: bigint;

      // Quote exact input
      const result = await quoterContract.quoteExactInputSingle.staticCall({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: ethers.parseUnits(amountIn.toString(), tokenInInfo.decimals),
        fee,
        sqrtPriceLimitX96: 0
      });
      amountOut = result.amountOut;
      amountInBigInt = ethers.parseUnits(amountIn.toString(), tokenInInfo.decimals);

      // Calculate price impact (simplified)
      const priceImpact = 0.5; // Would need pool data for accurate calculation

      // Get gas estimate
      const gasEstimate = await this.estimateSwapGas(params);

      return {
        amountIn: ethers.formatUnits(amountInBigInt, tokenInInfo.decimals),
        amountOut: ethers.formatUnits(amountOut, tokenOutInfo.decimals),
        amountOutMinimum: ethers.formatUnits(amountOut, tokenOutInfo.decimals),
        priceImpact: priceImpact.toString(),
        gasEstimate: gasEstimate.toString(),
        route: [{
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          fee: fee / 10000,
          pool: await this.getPoolAddress(tokenIn.address, tokenOut.address, fee)
        }],
        blockNumber: await this.provider.getBlockNumber(),
        timestamp: Math.floor(Date.now() / 1000)
      };
    } catch (error) {
      safeLogger.error('Error getting swap quote:', error);
      throw new Error(`Failed to get swap quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a token swap using SwapRouter directly
   */
  async executeSwap(params: SwapParams, privateKey: string): Promise<SwapResult> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const { tokenIn, tokenOut, amountIn, slippageTolerance = 0.5 } = params;
      const fee = 3000; // Default 0.3%

      // Get token info
      const [tokenInInfo, tokenOutInfo] = await Promise.all([
        this.validateAndGetTokenInfo(tokenIn.address),
        this.validateAndGetTokenInfo(tokenOut.address)
      ]);

      // Get quote first
      const quote = await this.getSwapQuote(params);

      // Approve token spending if needed
      const tokenInContract = new ethers.Contract(tokenIn.address, ERC20_ABI, wallet);
      const amountInWei = ethers.parseUnits(amountIn.toString(), tokenInInfo.decimals);

      const allowance = await tokenInContract.allowance(wallet.address, this.routerAddress);
      if (allowance < amountInWei) {
        safeLogger.info('Approving token spend...');
        const approveTx = await tokenInContract.approve(this.routerAddress, amountInWei);
        await approveTx.wait();
      }

      // Build swap transaction
      const routerContract = new ethers.Contract(this.routerAddress, SWAP_ROUTER_ABI, wallet);

      const amountOutMinimum = ethers.parseUnits(
        (parseFloat(quote.amountOut) * (1 - slippageTolerance / 100)).toFixed(tokenOutInfo.decimals),
        tokenOutInfo.decimals
      );

      const tx = await routerContract.exactInputSingle({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee,
        recipient: wallet.address,
        amountIn: amountInWei,
        amountOutMinimum,
        sqrtPriceLimitX96: 0
      });

      const receipt = await tx.wait();

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: 'success',
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        timestamp: Math.floor(Date.now() / 1000)
      };
    } catch (error) {
      safeLogger.error('Error executing swap:', error);
      return {
        transactionHash: '',
        blockNumber: 0,
        gasUsed: '0',
        status: 'failed',
        amountIn: '0',
        amountOut: '0',
        timestamp: Math.floor(Date.now() / 1000)
      };
    }
  }

  /**
   * Get liquidity information for a token pair
   */
  async getLiquidityInfo(tokenA: string, tokenB: string, fee: number): Promise<LiquidityInfo> {
    try {
      const poolAddress = await this.getPoolAddress(tokenA, tokenB, fee);

      if (poolAddress === ethers.ZeroAddress) {
        throw new Error('Pool not found for this token pair');
      }

      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, this.provider);

      const [slot0, liquidity, token0, token1] = await Promise.all([
        poolContract.slot0(),
        poolContract.liquidity(),
        poolContract.token0(),
        poolContract.token1()
      ]);

      const [token0Info, token1Info] = await Promise.all([
        this.validateAndGetTokenInfo(token0),
        this.validateAndGetTokenInfo(token1)
      ]);

      return {
        poolAddress,
        liquidity: liquidity.toString(),
        sqrtPriceX96: slot0.sqrtPriceX96.toString(),
        tick: slot0.tick,
        fee: fee / 10000,
        token0,
        token1,
        reserve0: '0', // Would need additional calculation
        reserve1: '0'  // Would need additional calculation
      };
    } catch (error) {
      safeLogger.error('Error getting liquidity info:', error);
      throw new Error(`Failed to get liquidity info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Monitor liquidity pools for better routing
   */
  async monitorLiquidityPools(tokenPairs: Array<{ tokenA: string; tokenB: string; fee: number }>): Promise<LiquidityInfo[]> {
    const results: LiquidityInfo[] = [];

    for (const pair of tokenPairs) {
      try {
        const info = await this.getLiquidityInfo(pair.tokenA, pair.tokenB, pair.fee);
        results.push(info);
      } catch (error) {
        safeLogger.warn(`Could not get liquidity for pair ${pair.tokenA}/${pair.tokenB}:`, error);
      }
    }

    return results;
  }

  /**
   * Handle swap failures and provide alternatives
   */
  async handleSwapFailure(params: SwapParams, error: Error): Promise<SwapQuote[]> {
    safeLogger.info('Attempting to find alternative routes after swap failure...');
    const alternatives: SwapQuote[] = [];

    // Try different fee tiers
    const feeTiers = [FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];

    for (const fee of feeTiers) {
      if (fee === params.fee) continue;

      try {
        const quote = await this.getSwapQuote({ ...params, fee });
        alternatives.push(quote);
      } catch (e) {
        // Continue to next fee tier
      }
    }

    return alternatives;
  }

  /**
   * Estimate gas for a swap
   */
  private async estimateSwapGas(params: SwapParams): Promise<bigint> {
    try {
      // Approximate gas for Uniswap V3 single-hop swap
      return BigInt(150000);
    } catch (error) {
      safeLogger.error('Error estimating gas:', error);
      return BigInt(200000);
    }
  }

  /**
   * Get pool address for token pair using computePoolAddress
   */
  private async getPoolAddress(tokenA: string, tokenB: string, fee: number): Promise<string> {
    try {
      // Sort tokens (Uniswap requires token0 < token1)
      const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase()
        ? [tokenA, tokenB]
        : [tokenB, tokenA];

      // Compute pool address deterministically
      const poolAddress = computePoolAddress({
        factoryAddress: this.factoryAddress,
        tokenA: new Token(this.chainId, token0, 18), // decimals don't matter for address computation
        tokenB: new Token(this.chainId, token1, 18),
        fee: fee as FeeAmount
      });

      // Verify pool exists by checking code
      const code = await this.provider.getCode(poolAddress);
      if (code === '0x') {
        return ethers.ZeroAddress;
      }

      return poolAddress;
    } catch (error) {
      safeLogger.error('Error computing pool address:', error);
      return ethers.ZeroAddress;
    }
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
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);

      const [symbol, decimals, name] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.name(),
      ]);

      return { symbol, decimals: Number(decimals), name };
    } catch (error) {
      safeLogger.error('Error validating token:', error);
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }
  }
}
