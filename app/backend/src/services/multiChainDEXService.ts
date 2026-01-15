import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { UniswapV3Service } from './uniswapV3Service';
import { MultiChainConfig, CrossChainQuote, SwapParams, SwapQuote, TokenInfo } from '../types/uniswapV3';

export class MultiChainDEXService {
  private chainConfigs: Map<number, MultiChainConfig>;
  private uniswapServices: Map<number, UniswapV3Service>;
  private currentChainId: number;

  constructor() {
    this.chainConfigs = new Map();
    this.uniswapServices = new Map();
    this.currentChainId = 1; // Default to Ethereum mainnet
    
    this.initializeChainConfigs();
    this.initializeUniswapServices();
  }

  /**
   * Initialize supported chain configurations
   */
  private initializeChainConfigs(): void {
    // Ethereum Mainnet
    this.chainConfigs.set(1, {
      chainId: 1,
      name: 'Ethereum',
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/your-api-key',
      quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
      routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      usdcAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8b8b8b8b8',
      ldaoAddress: process.env.LDAO_TOKEN_ADDRESS_ETHEREUM,
    });

    // Polygon
    this.chainConfigs.set(137, {
      chainId: 137,
      name: 'Polygon',
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.alchemyapi.io/v2/your-api-key',
      quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
      routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      wethAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
      usdcAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      ldaoAddress: process.env.LDAO_TOKEN_ADDRESS_POLYGON,
    });

    // Arbitrum One
    this.chainConfigs.set(42161, {
      chainId: 42161,
      name: 'Arbitrum',
      rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb-mainnet.alchemyapi.io/v2/your-api-key',
      quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
      routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      wethAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      usdcAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      ldaoAddress: process.env.LDAO_TOKEN_ADDRESS_ARBITRUM,
    });

    // Base Mainnet
    this.chainConfigs.set(8453, {
      chainId: 8453,
      name: 'Base',
      rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      quoterAddress: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a', // Uniswap V3 QuoterV2
      routerAddress: '0x2626664c2603336E57B271c5C0b26F421741e481', // Uniswap V3 SwapRouter02
      factoryAddress: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', // Uniswap V3 Factory
      wethAddress: '0x4200000000000000000000000000000000000006', // WETH on Base
      usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC (Native)
      ldaoAddress: process.env.LDAO_TOKEN_ADDRESS_BASE,
    });

    // Base Sepolia
    this.chainConfigs.set(84532, {
      chainId: 84532,
      name: 'Base Sepolia',
      rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      quoterAddress: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3', // Uniswap V3 QuoterV2 (Check deployment)
      routerAddress: '0x94Cc0AaC535CCDB3C01d6787D6413C739ae12bc4', // Uniswap V3 SwapRouter02 (Check deployment)
      factoryAddress: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24', // Uniswap V3 Factory (Check deployment)
      wethAddress: '0x4200000000000000000000000000000000000006', // WETH on Base Sepolia
      usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
      ldaoAddress: process.env.LDAO_TOKEN_ADDRESS_BASE_SEPOLIA,
    });
  }

  /**
   * Initialize Uniswap V3 services for each chain
   */
  private initializeUniswapServices(): void {
    for (const [chainId, config] of this.chainConfigs) {
      const service = new UniswapV3Service(
        config.rpcUrl,
        config.chainId,
        config.quoterAddress,
        config.routerAddress,
        config.factoryAddress
      );
      this.uniswapServices.set(chainId, service);
    }
  }

  /**
   * Switch to a different chain
   */
  async switchChain(chainId: number): Promise<boolean> {
    if (!this.chainConfigs.has(chainId)) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    this.currentChainId = chainId;
    return true;
  }

  /**
   * Get current chain configuration
   */
  getCurrentChainConfig(): MultiChainConfig {
    const config = this.chainConfigs.get(this.currentChainId);
    if (!config) {
      throw new Error(`No configuration found for chain ID: ${this.currentChainId}`);
    }
    return config;
  }

  /**
   * Get all supported chains
   */
  getSupportedChains(): MultiChainConfig[] {
    return Array.from(this.chainConfigs.values());
  }

  /**
   * Detect network from provider
   */
  async detectNetwork(provider: ethers.Provider): Promise<number> {
    try {
      const network = await provider.getNetwork();
      return Number(network.chainId);
    } catch (error) {
      safeLogger.error('Error detecting network:', error);
      return 1; // Default to Ethereum mainnet
    }
  }

  /**
   * Get swap quote for current chain
   */
  async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
    const service = this.uniswapServices.get(this.currentChainId);
    if (!service) {
      throw new Error(`No Uniswap service available for chain ID: ${this.currentChainId}`);
    }

    return await service.getSwapQuote(params);
  }

  /**
   * Compare prices across multiple chains
   */
  async compareChainPrices(params: SwapParams, chainIds?: number[]): Promise<Map<number, SwapQuote>> {
    const chainsToCheck = chainIds || Array.from(this.chainConfigs.keys());
    const priceComparisons = new Map<number, SwapQuote>();

    const promises = chainsToCheck.map(async (chainId) => {
      try {
        const service = this.uniswapServices.get(chainId);
        if (!service) {
          return null;
        }

        // Adjust token addresses for the specific chain
        const adjustedParams = await this.adjustTokenAddressesForChain(params, chainId);
        const quote = await service.getSwapQuote(adjustedParams);
        
        return { chainId, quote };
      } catch (error) {
        safeLogger.error(`Error getting quote for chain ${chainId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    
    results.forEach((result) => {
      if (result) {
        priceComparisons.set(result.chainId, result.quote);
      }
    });

    return priceComparisons;
  }

  /**
   * Get cross-chain quote (simplified implementation)
   */
  async getCrossChainQuote(
    sourceChain: number,
    targetChain: number,
    params: SwapParams
  ): Promise<CrossChainQuote> {
    if (!this.chainConfigs.has(sourceChain) || !this.chainConfigs.has(targetChain)) {
      throw new Error('Unsupported chain for cross-chain swap');
    }

    // Get quotes from both chains
    const sourceService = this.uniswapServices.get(sourceChain);
    const targetService = this.uniswapServices.get(targetChain);

    if (!sourceService || !targetService) {
      throw new Error('Services not available for cross-chain swap');
    }

    // Adjust token addresses for each chain
    const sourceParams = await this.adjustTokenAddressesForChain(params, sourceChain);
    const targetParams = await this.adjustTokenAddressesForChain(params, targetChain);

    const [sourceQuote, targetQuote] = await Promise.all([
      sourceService.getSwapQuote(sourceParams),
      targetService.getSwapQuote(targetParams)
    ]);

    // Calculate bridge fees (simplified)
    const bridgeFee = this.calculateBridgeFee(sourceChain, targetChain, params.amountIn);
    const estimatedTime = this.estimateBridgeTime(sourceChain, targetChain);

    return {
      sourceChain,
      targetChain,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn.toString(),
      amountOut: targetQuote.amountOut,
      bridgeFee: bridgeFee.toString(),
      totalGasCost: (parseFloat(sourceQuote.gasEstimate) + parseFloat(targetQuote.gasEstimate)).toString(),
      estimatedTime,
      route: [sourceChain.toString(), targetChain.toString()],
    };
  }

  /**
   * Calculate network-specific gas fees
   */
  async getNetworkGasFees(chainId?: number): Promise<{
    chainId: number;
    chainName: string;
    gasPrice: string;
    estimatedSwapCost: string;
    gasCostUSD?: string;
  }> {
    const targetChainId = chainId || this.currentChainId;
    const service = this.uniswapServices.get(targetChainId);
    const config = this.chainConfigs.get(targetChainId);

    if (!service || !config) {
      throw new Error(`No service or config available for chain ID: ${targetChainId}`);
    }

    const gasPrice = await service.getOptimizedGasPrice();
    const estimatedGasLimit = '200000'; // Typical swap gas limit
    const estimatedSwapCost = (parseFloat(gasPrice.toString()) * parseFloat(estimatedGasLimit)).toString();

    return {
      chainId: targetChainId,
      chainName: config.name,
      gasPrice: gasPrice.toString(),
      estimatedSwapCost,
      // gasCostUSD would be calculated using price feeds
    };
  }

  /**
   * Adjust token addresses for specific chain
   */
  private async adjustTokenAddressesForChain(params: SwapParams, chainId: number): Promise<SwapParams> {
    const config = this.chainConfigs.get(chainId);
    if (!config) {
      throw new Error(`No configuration for chain ID: ${chainId}`);
    }

    // This is a simplified implementation
    // In reality, you would have a mapping of token addresses across chains
    let adjustedTokenIn = { ...params.tokenIn };
    let adjustedTokenOut = { ...params.tokenOut };

    // Map common tokens to their addresses on different chains
    if (params.tokenIn.symbol === 'USDC') {
      adjustedTokenIn.address = config.usdcAddress;
    } else if (params.tokenIn.symbol === 'WETH' || params.tokenIn.symbol === 'WMATIC') {
      adjustedTokenIn.address = config.wethAddress;
    } else if (params.tokenIn.symbol === 'LDAO' && config.ldaoAddress) {
      adjustedTokenIn.address = config.ldaoAddress;
    }

    if (params.tokenOut.symbol === 'USDC') {
      adjustedTokenOut.address = config.usdcAddress;
    } else if (params.tokenOut.symbol === 'WETH' || params.tokenOut.symbol === 'WMATIC') {
      adjustedTokenOut.address = config.wethAddress;
    } else if (params.tokenOut.symbol === 'LDAO' && config.ldaoAddress) {
      adjustedTokenOut.address = config.ldaoAddress;
    }

    return {
      ...params,
      tokenIn: adjustedTokenIn,
      tokenOut: adjustedTokenOut,
    };
  }

  /**
   * Calculate bridge fee for cross-chain transfers
   */
  private calculateBridgeFee(sourceChain: number, targetChain: number, amount: number): number {
    // Simplified bridge fee calculation
    // In reality, this would query actual bridge protocols
    const baseFee = 0.001; // 0.1% base fee
    const chainMultiplier = this.getChainFeeMultiplier(sourceChain, targetChain);
    
    return amount * baseFee * chainMultiplier;
  }

  /**
   * Estimate bridge time between chains
   */
  private estimateBridgeTime(sourceChain: number, targetChain: number): number {
    // Simplified time estimation in seconds
    const baseTime = 300; // 5 minutes base time
    
    // Different chains have different confirmation times
    const chainTimeMultipliers: { [key: number]: number } = {
      1: 1.0,    // Ethereum
      137: 0.3,  // Polygon (faster)
      42161: 0.5, // Arbitrum (faster)
      8453: 0.3, // Base (fast)
      84532: 0.3, // Base Sepolia (fast)
    };

    const sourceMultiplier = chainTimeMultipliers[sourceChain] || 1.0;
    const targetMultiplier = chainTimeMultipliers[targetChain] || 1.0;

    return Math.floor(baseTime * (sourceMultiplier + targetMultiplier));
  }

  /**
   * Get chain-specific fee multiplier
   */
  private getChainFeeMultiplier(sourceChain: number, targetChain: number): number {
    // Simplified fee multiplier based on chain combination
    if (sourceChain === 1 || targetChain === 1) {
      return 1.5; // Ethereum has higher fees
    }
    
    if ((sourceChain === 137 && targetChain === 42161) || (sourceChain === 42161 && targetChain === 137)) {
      return 1.2; // L2 to L2 transfers
    }

    return 1.0; // Default multiplier
  }

  /**
   * Get best chain for a specific swap
   */
  async getBestChainForSwap(params: SwapParams): Promise<{
    chainId: number;
    chainName: string;
    quote: SwapQuote;
    gasCost: string;
    totalCost: string;
  }> {
    const priceComparisons = await this.compareChainPrices(params);
    let bestOption: any = null;
    let bestValue = 0;

    for (const [chainId, quote] of priceComparisons) {
      const config = this.chainConfigs.get(chainId);
      if (!config) continue;

      const gasFees = await this.getNetworkGasFees(chainId);
      const outputValue = parseFloat(quote.amountOut);
      const gasCost = parseFloat(gasFees.estimatedSwapCost);
      const netValue = outputValue - gasCost;

      if (netValue > bestValue) {
        bestValue = netValue;
        bestOption = {
          chainId,
          chainName: config.name,
          quote,
          gasCost: gasCost.toString(),
          totalCost: (parseFloat(quote.amountIn) + gasCost).toString(),
        };
      }
    }

    if (!bestOption) {
      throw new Error('No suitable chain found for swap');
    }

    return bestOption;
  }

  /**
   * Check if a token is available on a specific chain
   */
  async isTokenAvailableOnChain(tokenSymbol: string, chainId: number): Promise<boolean> {
    const config = this.chainConfigs.get(chainId);
    if (!config) return false;

    // Check common tokens
    const commonTokens = ['USDC', 'WETH', 'WMATIC', 'LDAO'];
    if (commonTokens.includes(tokenSymbol)) {
      return true;
    }

    // For other tokens, you would query the chain to check if the token exists
    // This is a simplified implementation
    return false;
  }
}
