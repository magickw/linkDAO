/**
 * Gas Fee Estimation Service
 * Integrates with multiple gas price APIs and provides real-time gas fee monitoring
 */

import { 
  GasEstimate, 
  GasFeeThreshold, 
  NetworkConditions,
  PaymentMethodType 
} from '../types/paymentPrioritization';
import { intelligentCacheService } from './intelligentCacheService';

// Gas price API endpoints
const GAS_PRICE_APIS = {
  etherscan: {
    mainnet: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
    sepolia: 'https://api-sepolia.etherscan.io/api?module=gastracker&action=gasoracle'
  },
  alchemy: {
    mainnet: 'https://eth-mainnet.g.alchemy.com/v2',
    polygon: 'https://polygon-mainnet.g.alchemy.com/v2',
    arbitrum: 'https://arb-mainnet.g.alchemy.com/v2',
    sepolia: 'https://eth-sepolia.g.alchemy.com/v2'
  },
  infura: {
    mainnet: 'https://mainnet.infura.io/v3',
    polygon: 'https://polygon-mainnet.infura.io/v3',
    arbitrum: 'https://arbitrum-mainnet.infura.io/v3',
    sepolia: 'https://sepolia.infura.io/v3'
  }
};

// Standard gas limits for different transaction types
const STANDARD_GAS_LIMITS = {
  erc20Transfer: 65000n,
  ethTransfer: 21000n,
  uniswapSwap: 150000n,
  contractInteraction: 100000n,
  complexContract: 200000n
};

// Cache configuration
const CACHE_DURATION = 30 * 1000; // 30 seconds
const CACHE_KEY_PREFIX = 'gas_estimate_';

interface GasPriceResponse {
  source: string;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  confidence: number;
  timestamp: Date;
}

interface CachedGasData {
  data: GasPriceResponse[];
  timestamp: Date;
  chainId: number;
}

export class GasFeeEstimationService {
  private cache = new Map<string, CachedGasData>();
  private apiKeys: {
    etherscan?: string;
    alchemy?: string;
    infura?: string;
  };
  private isDevelopment: boolean;
  private pendingRequests = new Map<string, Promise<GasPriceResponse[]>>(); // Track pending requests
  private requestTimestamps = new Map<string, number>(); // Track request timestamps

  constructor(apiKeys: { etherscan?: string; alchemy?: string; infura?: string } = {}) {
    this.apiKeys = {
      etherscan: apiKeys.etherscan || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY,
      alchemy: apiKeys.alchemy || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
      infura: apiKeys.infura || process.env.NEXT_PUBLIC_INFURA_API_KEY
    };
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Get gas fee estimate for a specific chain and transaction type
   */
  async getGasEstimate(
    chainId: number,
    transactionType: 'erc20Transfer' | 'ethTransfer' | 'uniswapSwap' | 'contractInteraction' | 'complexContract' = 'erc20Transfer',
    customGasLimit?: bigint
  ): Promise<GasEstimate> {
    const cacheKey = `${chainId}_${transactionType}_${customGasLimit?.toString() || 'default'}`;
    
    // Try to get from intelligent cache first
    const cached = await intelligentCacheService.getCachedGasEstimate(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const gasPrices = await this.getGasPrices(chainId);
      let gasLimit = customGasLimit || STANDARD_GAS_LIMITS[transactionType];

      // Ensure gas limit doesn't exceed security or network limits
      const securityMaxGasLimit = 500000n; // Security limit from token transaction security config
      const networkMaxGasLimit = 16777215n; // Maximum safe gas limit (just under 16,777,216 block limit)
      const maxGasLimit = securityMaxGasLimit < networkMaxGasLimit ? securityMaxGasLimit : networkMaxGasLimit;
      if (gasLimit > maxGasLimit) {
        console.warn(`Gas limit ${gasLimit} exceeds maximum ${maxGasLimit}, reducing to maximum`);
        gasLimit = maxGasLimit;
      }

      // Check if we have any gas prices
      if (!gasPrices || gasPrices.length === 0) {
        console.warn('No gas prices available, using fallback');
        return this.getFallbackGasEstimate(chainId, transactionType, customGasLimit);
      }

      // Use the most reliable gas price (highest confidence)
      const bestGasPrice = gasPrices.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      , gasPrices[0]); // Provide initial value to prevent reduce error

      const totalCost = gasLimit * bestGasPrice.gasPrice;
      const totalCostUSD = await this.convertToUSD(totalCost, chainId);

      const estimate: GasEstimate = {
        gasLimit,
        gasPrice: bestGasPrice.gasPrice,
        maxFeePerGas: bestGasPrice.maxFeePerGas,
        maxPriorityFeePerGas: bestGasPrice.maxPriorityFeePerGas,
        totalCost,
        totalCostUSD,
        confidence: bestGasPrice.confidence
      };

      // Cache the result with intelligent caching
      await intelligentCacheService.cacheGasEstimate(cacheKey, estimate);

      return estimate;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return this.getFallbackGasEstimate(chainId, transactionType, customGasLimit);
    }
  }

  /**
   * Validate gas fee against threshold
   */
  validateGasFeeThreshold(
    gasEstimate: GasEstimate,
    threshold: GasFeeThreshold
  ): {
    isAcceptable: boolean;
    shouldWarn: boolean;
    shouldBlock: boolean;
    message?: string;
  } {
    const { totalCostUSD } = gasEstimate;
    const { maxAcceptableGasFeeUSD, warningThresholdUSD, blockTransactionThresholdUSD } = threshold;

    if (totalCostUSD >= blockTransactionThresholdUSD) {
      return {
        isAcceptable: false,
        shouldWarn: true,
        shouldBlock: true,
        message: `Gas fee ($${totalCostUSD.toFixed(2)}) exceeds maximum threshold ($${blockTransactionThresholdUSD}). Transaction blocked.`
      };
    }

    if (totalCostUSD >= maxAcceptableGasFeeUSD) {
      return {
        isAcceptable: false,
        shouldWarn: true,
        shouldBlock: false,
        message: `Gas fee ($${totalCostUSD.toFixed(2)}) exceeds acceptable threshold ($${maxAcceptableGasFeeUSD}). Consider alternative payment methods.`
      };
    }

    if (totalCostUSD >= warningThresholdUSD) {
      return {
        isAcceptable: true,
        shouldWarn: true,
        shouldBlock: false,
        message: `Gas fee ($${totalCostUSD.toFixed(2)}) is higher than usual. Current network congestion may be affecting prices.`
      };
    }

    return {
      isAcceptable: true,
      shouldWarn: false,
      shouldBlock: false
    };
  }

  /**
   * Get real-time network conditions
   */
  async getNetworkConditions(chainId: number): Promise<NetworkConditions> {
    // Try to get from intelligent cache first
    const cached = await intelligentCacheService.getCachedNetworkConditions(chainId);
    if (cached) {
      return cached;
    }

    try {
      const gasPrices = await this.getGasPrices(chainId);

      // Check if we have any gas prices
      if (!gasPrices || gasPrices.length === 0) {
        console.warn('No gas prices available for network conditions, using fallback');
        return this.getFallbackNetworkConditions(chainId);
      }

      const averageGasPrice = gasPrices.reduce((sum, price) => sum + Number(price.gasPrice), 0) / gasPrices.length;
      const gasPriceUSD = await this.convertToUSD(BigInt(Math.round(averageGasPrice)), chainId);

      // Determine network congestion based on gas price
      let networkCongestion: 'low' | 'medium' | 'high';
      if (gasPriceUSD < 10) networkCongestion = 'low';
      else if (gasPriceUSD < 50) networkCongestion = 'medium';
      else networkCongestion = 'high';

      const conditions: NetworkConditions = {
        chainId,
        gasPrice: BigInt(Math.round(averageGasPrice)),
        gasPriceUSD,
        networkCongestion,
        blockTime: this.getAverageBlockTime(chainId),
        lastUpdated: new Date()
      };

      // Cache the network conditions with intelligent caching
      await intelligentCacheService.cacheNetworkConditions(chainId, conditions);

      return conditions;
    } catch (error) {
      console.error('Failed to get network conditions:', error);
      return this.getFallbackNetworkConditions(chainId);
    }
  }

  /**
   * Start real-time gas price monitoring
   */
  startRealTimeMonitoring(
    chainId: number,
    callback: (conditions: NetworkConditions) => void,
    intervalMs: number = 30000
  ): () => void {
    const interval = setInterval(async () => {
      try {
        const conditions = await this.getNetworkConditions(chainId);
        callback(conditions);
      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }

  /**
   * Get gas prices from multiple APIs with request deduplication
   */
  private async getGasPrices(chainId: number): Promise<GasPriceResponse[]> {
    const cacheKey = `${CACHE_KEY_PREFIX}${chainId}`;
    const cached = this.cache.get(cacheKey);

    // Check if we have fresh cached data (less than 30 seconds old)
    if (cached && Date.now() - cached.timestamp.getTime() < CACHE_DURATION) {
      return cached.data;
    }

    // Check if there's already a pending request for this chain
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`Request already pending, waiting for result: ${cacheKey}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // In development mode or when no API keys are configured, use fallback immediately
    if (this.isDevelopment || (!this.apiKeys.etherscan && !this.apiKeys.alchemy && !this.apiKeys.infura)) {
      console.warn('No gas price API keys configured, using fallback gas prices');
      const fallbackPrices = this.getFallbackGasPrices(chainId);
      
      // Cache the fallback results
      this.cache.set(cacheKey, {
        data: fallbackPrices,
        timestamp: new Date(),
        chainId
      });
      
      return fallbackPrices;
    }

    // Create a new request promise
    const requestPromise = this.fetchGasPricesFromAPIs(chainId);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const gasPrices = await requestPromise;
      
      if (gasPrices.length === 0) {
        console.warn('No gas price APIs available, using fallback gas prices');
        const fallbackPrices = this.getFallbackGasPrices(chainId);
        
        // Cache the fallback results
        this.cache.set(cacheKey, {
          data: fallbackPrices,
          timestamp: new Date(),
          chainId
        });
        
        return fallbackPrices;
      }

      // Cache the results
      this.cache.set(cacheKey, {
        data: gasPrices,
        timestamp: new Date(),
        chainId
      });

      return gasPrices;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch gas prices from all available APIs
   */
  private async fetchGasPricesFromAPIs(chainId: number): Promise<GasPriceResponse[]> {
    // Check if we've made a request too recently (rate limiting)
    const now = Date.now();
    
    // Rate limit to 1 request per API per 5 seconds per chain
    const rateLimitKeys = [
      `etherscan_${chainId}`,
      `alchemy_${chainId}`,
      `infura_${chainId}`
    ];
    
    const shouldSkipRequest = rateLimitKeys.some(key => {
      const lastRequestTime = this.requestTimestamps.get(key) || 0;
      return (now - lastRequestTime) < 5000; // 5 second rate limit
    });
    
    if (shouldSkipRequest) {
      console.log(`Rate limit exceeded for chain ${chainId}, using cached or fallback data`);
      // Return cached data if available, otherwise fallback
      const cacheKey = `${CACHE_KEY_PREFIX}${chainId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < CACHE_DURATION * 2) {
        return cached.data;
      }
      // Return fallback data
      return this.getFallbackGasPrices(chainId);
    }

    const promises: Promise<GasPriceResponse | null>[] = [];

    // Etherscan API
    if (this.apiKeys.etherscan) {
      const requestKey = `etherscan_${chainId}`;
      this.requestTimestamps.set(requestKey, now);
      promises.push(this.fetchEtherscanGasPrice(chainId));
    }

    // Alchemy API
    if (this.apiKeys.alchemy) {
      const requestKey = `alchemy_${chainId}`;
      this.requestTimestamps.set(requestKey, now);
      promises.push(this.fetchAlchemyGasPrice(chainId));
    }

    // Infura API
    if (this.apiKeys.infura) {
      const requestKey = `infura_${chainId}`;
      this.requestTimestamps.set(requestKey, now);
      promises.push(this.fetchInfuraGasPrice(chainId));
    }

    const results = await Promise.allSettled(promises);
    const gasPrices = results
      .filter((result): result is PromiseFulfilledResult<GasPriceResponse> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    return gasPrices;
  }

  /**
   * Get fallback gas prices for when APIs are unavailable
   */
  private getFallbackGasPrices(chainId: number): GasPriceResponse[] {
    // Fallback gas prices (in gwei)
    const fallbackGasPrices: Record<number, bigint> = {
      1: 30n * 1000000000n, // 30 gwei for mainnet
      137: 30n * 1000000000n, // 30 gwei for polygon
      42161: 1n * 1000000000n, // 1 gwei for arbitrum
      11155111: 10n * 1000000000n // 10 gwei for sepolia
    };

    const gasPrice = fallbackGasPrices[chainId] || fallbackGasPrices[1];

    return [{
      source: 'fallback',
      gasPrice,
      confidence: 0.5, // Low confidence for fallback
      timestamp: new Date()
    }];
  }

  /**
   * Fetch gas price from Etherscan API with rate limiting
   */
  private async fetchEtherscanGasPrice(chainId: number): Promise<GasPriceResponse | null> {
    try {
      // Check if we've made a request too recently
      const requestKey = `etherscan_${chainId}`;
      const lastRequestTime = this.requestTimestamps.get(requestKey) || 0;
      const now = Date.now();
      
      // Rate limit to 1 request per 5 seconds
      if (now - lastRequestTime < 5000) {
        console.log(`Rate limit exceeded for: Etherscan chain ${chainId}, skipping request`);
        return null;
      }
      
      // Update request timestamp
      this.requestTimestamps.set(requestKey, now);

      const apiUrl = chainId === 1 ? GAS_PRICE_APIS.etherscan.mainnet : GAS_PRICE_APIS.etherscan.sepolia;
      const response = await fetch(`${apiUrl}&apikey=${this.apiKeys.etherscan}`);
      const data = await response.json();

      if (data.status === '1' && data.result) {
        return {
          source: 'etherscan',
          gasPrice: BigInt(Math.round(parseFloat(data.result.ProposeGasPrice) * 1e9)),
          maxFeePerGas: BigInt(Math.round(parseFloat(data.result.FastGasPrice) * 1e9)),
          maxPriorityFeePerGas: BigInt(Math.round(parseFloat(data.result.SafeGasPrice) * 1e9)),
          confidence: 0.9,
          timestamp: new Date()
        };
      }
      return null;
    } catch (error) {
      console.error('Etherscan gas price fetch failed:', error);
      return null;
    }
  }

  /**
   * Fetch gas price from Alchemy API with rate limiting
   */
  private async fetchAlchemyGasPrice(chainId: number): Promise<GasPriceResponse | null> {
    try {
      // Check if we've made a request too recently
      const requestKey = `alchemy_${chainId}`;
      const lastRequestTime = this.requestTimestamps.get(requestKey) || 0;
      const now = Date.now();
      
      // Rate limit to 1 request per 5 seconds
      if (now - lastRequestTime < 5000) {
        console.log(`Rate limit exceeded for: Alchemy chain ${chainId}, skipping request`);
        return null;
      }
      
      // Update request timestamp
      this.requestTimestamps.set(requestKey, now);

      const networkMap: Record<number, keyof typeof GAS_PRICE_APIS.alchemy> = {
        1: 'mainnet',
        137: 'polygon',
        42161: 'arbitrum',
        11155111: 'sepolia'
      };

      const network = networkMap[chainId];
      if (!network) return null;

      const response = await fetch(`${GAS_PRICE_APIS.alchemy[network]}/${this.apiKeys.alchemy}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1
        })
      });

      const data = await response.json();
      if (data.result) {
        return {
          source: 'alchemy',
          gasPrice: BigInt(data.result),
          confidence: 0.85,
          timestamp: new Date()
        };
      }
      return null;
    } catch (error) {
      console.error('Alchemy gas price fetch failed:', error);
      return null;
    }
  }

  /**
   * Fetch gas price from Infura API with rate limiting
   */
  private async fetchInfuraGasPrice(chainId: number): Promise<GasPriceResponse | null> {
    try {
      // Check if we've made a request too recently
      const requestKey = `infura_${chainId}`;
      const lastRequestTime = this.requestTimestamps.get(requestKey) || 0;
      const now = Date.now();
      
      // Rate limit to 1 request per 5 seconds
      if (now - lastRequestTime < 5000) {
        console.log(`Rate limit exceeded for: Infura chain ${chainId}, skipping request`);
        return null;
      }
      
      // Update request timestamp
      this.requestTimestamps.set(requestKey, now);

      const networkMap: Record<number, keyof typeof GAS_PRICE_APIS.infura> = {
        1: 'mainnet',
        137: 'polygon',
        42161: 'arbitrum',
        11155111: 'sepolia'
      };

      const network = networkMap[chainId];
      if (!network) return null;

      const response = await fetch(`${GAS_PRICE_APIS.infura[network]}/${this.apiKeys.infura}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1
        })
      });

      const data = await response.json();
      if (data.result) {
        return {
          source: 'infura',
          gasPrice: BigInt(data.result),
          confidence: 0.8,
          timestamp: new Date()
        };
      }
      return null;
    } catch (error) {
      console.error('Infura gas price fetch failed:', error);
      return null;
    }
  }

  /**
   * Convert gas cost to USD with caching
   */
  private async convertToUSD(gasCost: bigint, chainId: number): Promise<number> {
    try {
      // Create a cache key for the conversion
      const cacheKey = `usd_conversion_${chainId}_${this.getNativeTokenSymbol(chainId)}`;
      const cached = await intelligentCacheService.getCachedExchangeRate(cacheKey);
      
      if (cached) {
        const tokenAmount = Number(gasCost) / 1e18;
        return tokenAmount * cached;
      }

      // Check rate limiting for CoinGecko API
      const now = Date.now();
      const requestKey = `coingecko_${this.getNativeTokenSymbol(chainId)}`;
      const lastRequestTime = this.requestTimestamps.get(requestKey) || 0;
      
      // Rate limit to 1 request per token per 10 seconds
      if ((now - lastRequestTime) < 10000) {
        console.log(`Rate limit exceeded for CoinGecko ${this.getNativeTokenSymbol(chainId)}, using fallback price`);
        return this.getFallbackUSDPrice(gasCost, chainId);
      }
      
      // Update request timestamp
      this.requestTimestamps.set(requestKey, now);

      // Get native token price (ETH, MATIC, etc.)
      const tokenSymbol = this.getNativeTokenSymbol(chainId);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${this.getCoingeckoId(tokenSymbol)}&vs_currencies=usd`
      );
      const data = await response.json();
      const tokenPrice = data[this.getCoingeckoId(tokenSymbol)]?.usd || 0;
      
      // Cache the exchange rate
      await intelligentCacheService.cacheExchangeRate(cacheKey, tokenPrice);
      
      // Convert wei to token amount and multiply by USD price
      const tokenAmount = Number(gasCost) / 1e18;
      return tokenAmount * tokenPrice;
    } catch (error) {
      console.error('USD conversion failed:', error);
      // Fallback to estimated prices
      return this.getFallbackUSDPrice(gasCost, chainId);
    }
  }

  /**
   * Get native token symbol for chain
   */
  private getNativeTokenSymbol(chainId: number): string {
    const symbolMap: Record<number, string> = {
      1: 'ETH',
      137: 'MATIC',
      42161: 'ETH',
      11155111: 'ETH'
    };
    return symbolMap[chainId] || 'ETH';
  }

  /**
   * Get CoinGecko ID for token
   */
  private getCoingeckoId(symbol: string): string {
    const idMap: Record<string, string> = {
      'ETH': 'ethereum',
      'MATIC': 'matic-network'
    };
    return idMap[symbol] || 'ethereum';
  }

  /**
   * Get average block time for chain
   */
  private getAverageBlockTime(chainId: number): number {
    const blockTimeMap: Record<number, number> = {
      1: 12, // Ethereum mainnet
      137: 2, // Polygon
      42161: 1, // Arbitrum
      11155111: 12 // Sepolia
    };
    return blockTimeMap[chainId] || 12;
  }

  /**
   * Get fallback gas estimate when APIs fail
   */
  private getFallbackGasEstimate(
    chainId: number,
    transactionType: keyof typeof STANDARD_GAS_LIMITS,
    customGasLimit?: bigint
  ): GasEstimate {
    const gasLimit = customGasLimit || STANDARD_GAS_LIMITS[transactionType];
    
    // Ensure gas limit doesn't exceed security or network limits
    const securityMaxGasLimit = 500000n; // Security limit from token transaction security config
    const networkMaxGasLimit = 16777215n; // Maximum safe gas limit (just under 16,777,216 block limit)
    const maxGasLimit = securityMaxGasLimit < networkMaxGasLimit ? securityMaxGasLimit : networkMaxGasLimit;
    const safeGasLimit = gasLimit > maxGasLimit ? maxGasLimit : gasLimit;

    // Fallback gas prices (in gwei)
    const fallbackGasPrices: Record<number, bigint> = {
      1: 30n * 1000000000n, // 30 gwei for mainnet
      137: 30n * 1000000000n, // 30 gwei for polygon
      42161: 1n * 1000000000n, // 1 gwei for arbitrum
      11155111: 10n * 1000000000n // 10 gwei for sepolia
    };

    const gasPrice = fallbackGasPrices[chainId] || fallbackGasPrices[1];
    const totalCost = safeGasLimit * gasPrice;

    return {
      gasLimit: safeGasLimit,
      gasPrice,
      totalCost,
      totalCostUSD: this.getFallbackUSDPrice(totalCost, chainId),
      confidence: 0.5 // Low confidence for fallback
    };
  }

  /**
   * Get fallback USD price when conversion fails
   */
  private getFallbackUSDPrice(gasCost: bigint, chainId: number): number {
    // Fallback token prices in USD
    const fallbackPrices: Record<number, number> = {
      1: 2000, // ETH
      137: 0.8, // MATIC
      42161: 2000, // ETH on Arbitrum
      11155111: 2000 // ETH on Sepolia
    };

    const tokenPrice = fallbackPrices[chainId] || fallbackPrices[1];
    const tokenAmount = Number(gasCost) / 1e18;
    return tokenAmount * tokenPrice;
  }

  /**
   * Get fallback network conditions
   */
  private getFallbackNetworkConditions(chainId: number): NetworkConditions {
    return {
      chainId,
      gasPrice: 30n * 1000000000n, // 30 gwei
      gasPriceUSD: 25, // $25 estimated
      networkCongestion: 'medium',
      blockTime: this.getAverageBlockTime(chainId),
      lastUpdated: new Date()
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const gasFeeEstimationService = new GasFeeEstimationService();

export default GasFeeEstimationService;