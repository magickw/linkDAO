import { PublicClient, formatGwei, parseGwei, formatEther } from 'viem';
import { GasFeeEstimate, PaymentToken } from '../types/payment';
import { PAYMENT_CONFIG } from '../config/payment';

export class GasFeeService {
  private priceCache = new Map<string, { price: number; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 1 minute

  constructor(private publicClient: PublicClient) {}

  /**
   * Estimate gas fees for a transaction
   */
  async estimateGasFees(
    to: string,
    data: string,
    value: bigint = 0n,
    priority: 'slow' | 'standard' | 'fast' | 'instant' = 'standard'
  ): Promise<GasFeeEstimate> {
    try {
      // Estimate gas limit
      const gasLimit = await this.estimateGasLimit(to, data, value);
      
      // Get gas prices
      const gasPrices = await this.getGasPrices();
      
      // Apply priority multiplier
      const multiplier = PAYMENT_CONFIG.GAS_PRICE_MULTIPLIERS[priority];
      
      let estimate: GasFeeEstimate;
      
      // Check if chain supports EIP-1559
      if (gasPrices.maxFeePerGas && gasPrices.maxPriorityFeePerGas) {
        // Use BigInt arithmetic to avoid floating-point precision errors
        const multiplierBigInt = BigInt(Math.floor(multiplier * 100));
        const maxFeePerGas = (gasPrices.maxFeePerGas * multiplierBigInt) / 100n;
        const maxPriorityFeePerGas = (gasPrices.maxPriorityFeePerGas * multiplierBigInt) / 100n;
        
        estimate = {
          gasLimit,
          gasPrice: gasPrices.gasPrice,
          maxFeePerGas,
          maxPriorityFeePerGas,
          totalCost: gasLimit * maxFeePerGas
        };
      } else {
        // Use BigInt arithmetic to avoid floating-point precision errors
        const multiplierBigInt = BigInt(Math.floor(multiplier * 100));
        const gasPrice = (gasPrices.gasPrice * multiplierBigInt) / 100n;
        
        estimate = {
          gasLimit,
          gasPrice,
          totalCost: gasLimit * gasPrice
        };
      }

      // Add USD equivalent if available
      const ethPriceUSD = await this.getETHPriceUSD();
      if (ethPriceUSD) {
        estimate.totalCostUSD = Number(formatEther(estimate.totalCost)) * ethPriceUSD;
      }

      return estimate;
    } catch (error) {
      console.error('Gas fee estimation failed:', error);
      throw new Error('Failed to estimate gas fees');
    }
  }

  /**
   * Estimate gas limit for a transaction
   */
  private async estimateGasLimit(
    to: string,
    data: string,
    value: bigint = 0n
  ): Promise<bigint> {
    try {
      const gasEstimate = await this.publicClient.estimateGas({
        to: to as `0x${string}`,
        data: data as `0x${string}`,
        value
      });

      // Add buffer to gas estimate using BigInt arithmetic to avoid floating-point precision errors
      const bufferBigInt = BigInt(Math.floor(PAYMENT_CONFIG.GAS_LIMIT_BUFFER * 100));
      let gasLimitWithBuffer = (gasEstimate * bufferBigInt) / 100n;
      
      // Ensure gas limit doesn't exceed security or network limits
      console.log('[GasFeeService] Using enhanced gas estimation logic v2');
      const securityMaxGasLimit = 500000n; // Security limit from token transaction security config
      const networkMaxGasLimit = 16777215n; // Maximum safe gas limit (just under 16,777,216 block limit)
      const maxGasLimit = securityMaxGasLimit < networkMaxGasLimit ? securityMaxGasLimit : networkMaxGasLimit;
      
      if (gasLimitWithBuffer > maxGasLimit) {
        console.warn(`Gas limit ${gasLimitWithBuffer} exceeds maximum ${maxGasLimit}, reducing to maximum`);
        return maxGasLimit;
      }
      
      return gasLimitWithBuffer;
    } catch (error) {
      console.error('Gas limit estimation failed:', error);
      // Return a reasonable default for simple transfers using BigInt arithmetic
      // INCREASED: Use 300,000 as default to support contract interactions if estimation fails
      const bufferBigInt = BigInt(Math.floor(PAYMENT_CONFIG.GAS_LIMIT_BUFFER * 100));
      let defaultGasLimit = (300000n * bufferBigInt) / 100n;
      
      // Ensure default doesn't exceed security or network limits
      const securityMaxGasLimit = 500000n; // Security limit from token transaction security config
      const networkMaxGasLimit = 16777215n; // Maximum safe gas limit (just under 16,777,216 block limit)
      const maxGasLimit = securityMaxGasLimit < networkMaxGasLimit ? securityMaxGasLimit : networkMaxGasLimit;
      if (defaultGasLimit > maxGasLimit) {
        defaultGasLimit = maxGasLimit;
      }
      
      return defaultGasLimit;
    }
  }

  /**
   * Get current gas prices
   */
  private async getGasPrices() {
    try {
      const feeHistory = await this.publicClient.getFeeHistory({
        blockCount: 4,
        rewardPercentiles: [25, 50, 75]
      });

      const block = await this.publicClient.getBlock({ blockTag: 'latest' });
      
      if (block.baseFeePerGas) {
        // EIP-1559 chain
        const baseFee = block.baseFeePerGas;
        const priorityFees = feeHistory.reward?.[0] || [parseGwei('1'), parseGwei('2'), parseGwei('3')];
        
        const maxPriorityFeePerGas = priorityFees[1]; // Use median
        const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas;

        return {
          gasPrice: maxFeePerGas,
          maxFeePerGas,
          maxPriorityFeePerGas
        };
      } else {
        // Legacy chain
        const gasPrice = await this.publicClient.getGasPrice();
        return { gasPrice };
      }
    } catch (error) {
      console.error('Failed to get gas prices:', error);
      // Fallback to a reasonable default
      const fallbackGasPrice = parseGwei('20'); // 20 gwei
      return { gasPrice: fallbackGasPrice };
    }
  }

  /**
   * Get ETH price in USD for cost calculation
   */
  private async getETHPriceUSD(): Promise<number | null> {
    const cacheKey = 'eth-usd';
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      // Using CoinGecko API as an example - in production, use multiple sources
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch ETH price');
      }

      const data = await response.json();
      const price = data.ethereum?.usd;
      
      if (typeof price === 'number') {
        this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
        return price;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch ETH price:', error);
      return null;
    }
  }

  /**
   * Format gas fee for display
   */
  formatGasFee(estimate: GasFeeEstimate): {
    gasLimit: string;
    gasPrice: string;
    totalCost: string;
    totalCostUSD?: string;
  } {
    return {
      gasLimit: estimate.gasLimit.toString(),
      gasPrice: formatGwei(estimate.gasPrice),
      totalCost: formatEther(estimate.totalCost),
      totalCostUSD: estimate.totalCostUSD ? `$${estimate.totalCostUSD.toFixed(2)}` : undefined
    };
  }

  /**
   * Check if gas price is reasonable (not too high)
   */
  isGasPriceReasonable(estimate: GasFeeEstimate, maxGasPriceGwei: number = 100): boolean {
    const gasPriceGwei = Number(formatGwei(estimate.gasPrice));
    return gasPriceGwei <= maxGasPriceGwei;
  }

  /**
   * Get gas price recommendations
   */
  async getGasPriceRecommendations(): Promise<{
    slow: GasFeeEstimate;
    standard: GasFeeEstimate;
    fast: GasFeeEstimate;
    instant: GasFeeEstimate;
  }> {
    const baseEstimate = await this.estimateGasFees('0x0000000000000000000000000000000000000000', '0x');
    
    const recommendations = {} as any;
    
    for (const priority of ['slow', 'standard', 'fast', 'instant'] as const) {
      recommendations[priority] = await this.estimateGasFees(
        '0x0000000000000000000000000000000000000000',
        '0x',
        0n,
        priority
      );
    }
    
    return recommendations;
  }

  /**
   * Format gas fee in a user-friendly way
   */
  formatGasFeeUserFriendly(estimate: GasFeeEstimate): string {
    const formatted = this.formatGasFee(estimate);
    
    if (formatted.totalCostUSD) {
      return `${formatted.totalCost} ETH (~${formatted.totalCostUSD})`;
    }
    
    return `${formatted.totalCost} ETH`;
  }
}