/**
 * Transaction Cost Calculator
 * Calculates total transaction costs including gas fees and exchange rates
 * Implements cost comparison logic between payment methods
 */

import {
  PaymentMethod,
  PaymentMethodType,
  CostEstimate,
  CostComparison,
  GasEstimate,
  ExchangeRate,
  NetworkConditions
} from '../types/paymentPrioritization';
import { gasFeeEstimationService } from './gasFeeEstimationService';

// Platform fee (15%) - charged to SELLERS, not buyers
// Tracked for internal use and seller payout calculations
const SELLER_PLATFORM_FEE_RATE = 0.15; // 15%

// Stripe processing fees - these CAN be passed to buyers
const STRIPE_PROCESSING_FEE_RATE = 0.029; // 2.9%
const STRIPE_FIXED_FEE = 0.30; // $0.30 fixed fee for Stripe

// Exchange rate cache configuration
const EXCHANGE_RATE_CACHE_DURATION = 60 * 1000; // 1 minute
const EXCHANGE_RATE_CACHE_KEY_PREFIX = 'exchange_rate_';

interface CachedExchangeRate {
  rate: ExchangeRate;
  timestamp: Date;
}

interface TransactionCostBreakdown {
  baseAmount: number;
  platformFee: number;
  networkFee: number;
  gasFee: number;
  exchangeRateFee?: number;
  totalCost: number;
  currency: string;
}

export class TransactionCostCalculator {
  private exchangeRateCache = new Map<string, CachedExchangeRate>();
  private confidenceWeights = {
    gasEstimate: 0.4,
    exchangeRate: 0.3,
    networkConditions: 0.2,
    historicalData: 0.1
  };

  /**
   * Calculate total transaction cost for a payment method
   */
  async calculateTransactionCost(
    paymentMethod: PaymentMethod,
    amount: number,
    currency: string = 'USD',
    networkConditions?: NetworkConditions
  ): Promise<CostEstimate> {
    try {
      const breakdown = await this.calculateCostBreakdown(
        paymentMethod,
        amount,
        currency,
        networkConditions
      );

      const confidence = await this.calculateConfidenceScore(
        paymentMethod,
        breakdown,
        networkConditions
      );

      const estimatedTime = this.estimateTransactionTime(paymentMethod, networkConditions);

      return {
        totalCost: breakdown.totalCost,
        baseCost: breakdown.baseAmount,
        gasFee: breakdown.gasFee,
        exchangeRate: await this.getExchangeRate(paymentMethod, currency),
        estimatedTime,
        confidence,
        currency: breakdown.currency,
        breakdown: {
          amount: breakdown.baseAmount,
          gasLimit: await this.getGasLimit(paymentMethod),
          gasPrice: await this.getGasPrice(paymentMethod, networkConditions),
          networkFee: breakdown.networkFee,
          platformFee: breakdown.platformFee
        }
      };
    } catch (error) {
      console.error('Transaction cost calculation failed:', error);
      return this.getFallbackCostEstimate(paymentMethod, amount, currency);
    }
  }

  /**
   * Compare costs between multiple payment methods
   */
  async comparePaymentMethods(
    methods: PaymentMethod[],
    amount: number,
    currency: string = 'USD',
    networkConditions?: NetworkConditions
  ): Promise<CostComparison[]> {
    const costEstimates = await Promise.all(
      methods.map(async (method) => ({
        method,
        costEstimate: await this.calculateTransactionCost(method, amount, currency, networkConditions)
      }))
    );

    // Sort by total cost (ascending)
    costEstimates.sort((a, b) => a.costEstimate.totalCost - b.costEstimate.totalCost);

    const cheapestCost = costEstimates[0]?.costEstimate.totalCost || 0;
    const mostExpensiveCost = costEstimates[costEstimates.length - 1]?.costEstimate.totalCost || 0;

    return costEstimates.map((estimate, index) => {
      const savings = mostExpensiveCost - estimate.costEstimate.totalCost;
      const costDifference = estimate.costEstimate.totalCost - cheapestCost;
      const isRecommended = this.isRecommendedMethod(estimate, costEstimates);

      return {
        method: estimate.method,
        costEstimate: estimate.costEstimate,
        savings: savings > 0 ? savings : undefined,
        costDifference: costDifference > 0 ? costDifference : undefined,
        isRecommended,
        reasonForRecommendation: isRecommended
          ? this.getRecommendationReason(estimate, costEstimates)
          : undefined
      };
    });
  }

  /**
   * Calculate detailed cost breakdown
   */
  private async calculateCostBreakdown(
    paymentMethod: PaymentMethod,
    amount: number,
    currency: string,
    networkConditions?: NetworkConditions
  ): Promise<TransactionCostBreakdown> {
    const baseAmount = amount;
    let networkFee = 0;
    let gasFee = 0;
    let exchangeRateFee = 0;

    // Platform fee (15%) - charged to SELLERS, tracked for payout calculations
    // This is NOT added to buyer's total
    const platformFee = baseAmount * SELLER_PLATFORM_FEE_RATE;

    // Calculate fees that ARE charged to buyer based on payment method
    if (paymentMethod.type === PaymentMethodType.FIAT_STRIPE) {
      // Stripe processing fee: 2.9% + $0.30 - passed to buyer
      networkFee = (baseAmount * STRIPE_PROCESSING_FEE_RATE) + STRIPE_FIXED_FEE;
    } else if (this.isCryptoPayment(paymentMethod)) {
      // Gas fees for crypto payments - charged to buyer
      const gasEstimate = await this.getGasEstimate(paymentMethod, networkConditions);
      gasFee = gasEstimate.totalCostUSD;
      networkFee = gasFee; // Network fee is the gas fee for crypto
    }

    // Calculate exchange rate fee if needed
    if (paymentMethod.token && paymentMethod.token.symbol !== currency) {
      const exchangeRate = await this.getExchangeRate(paymentMethod, currency);
      if (exchangeRate) {
        // Assume 0.1% exchange rate spread
        exchangeRateFee = baseAmount * 0.001;
      }
    }

    // Buyer's total: base amount + network fees + exchange rate fees
    // Platform fee is NOT included - that's deducted from seller
    const totalCost = baseAmount + networkFee + exchangeRateFee;

    return {
      baseAmount,
      platformFee, // Tracked for seller payout, NOT charged to buyer
      networkFee,
      gasFee,
      exchangeRateFee: exchangeRateFee > 0 ? exchangeRateFee : undefined,
      totalCost,
      currency
    };
  }

  /**
   * Calculate confidence score for cost estimate
   */
  private async calculateConfidenceScore(
    paymentMethod: PaymentMethod,
    breakdown: TransactionCostBreakdown,
    networkConditions?: NetworkConditions
  ): Promise<number> {
    let totalConfidence = 0;
    let totalWeight = 0;

    // Gas estimate confidence
    if (this.isCryptoPayment(paymentMethod)) {
      const gasEstimate = await this.getGasEstimate(paymentMethod, networkConditions);
      totalConfidence += gasEstimate.confidence * this.confidenceWeights.gasEstimate;
      totalWeight += this.confidenceWeights.gasEstimate;
    }

    // Exchange rate confidence
    if (paymentMethod.token) {
      const exchangeRate = await this.getExchangeRateData(paymentMethod, 'USD');
      if (exchangeRate) {
        totalConfidence += exchangeRate.confidence * this.confidenceWeights.exchangeRate;
        totalWeight += this.confidenceWeights.exchangeRate;
      }
    }

    // Network conditions confidence
    if (networkConditions) {
      const networkConfidence = this.calculateNetworkConfidence(networkConditions);
      totalConfidence += networkConfidence * this.confidenceWeights.networkConditions;
      totalWeight += this.confidenceWeights.networkConditions;
    }

    // Historical data confidence (simplified)
    const historicalConfidence = 0.8; // Assume good historical data
    totalConfidence += historicalConfidence * this.confidenceWeights.historicalData;
    totalWeight += this.confidenceWeights.historicalData;

    return totalWeight > 0 ? totalConfidence / totalWeight : 0.5;
  }

  /**
   * Estimate transaction time
   */
  private estimateTransactionTime(
    paymentMethod: PaymentMethod,
    networkConditions?: NetworkConditions
  ): number {
    // Base time estimates (in minutes) for different payment methods
    const baseTimeEstimates: Record<PaymentMethodType, number> = {
      [PaymentMethodType.FIAT_STRIPE]: 0, // Instant
      [PaymentMethodType.STABLECOIN_USDC]: 2, // 2 minutes for blockchain confirmation
      [PaymentMethodType.STABLECOIN_USDT]: 2, // 2 minutes for blockchain confirmation
      [PaymentMethodType.NATIVE_ETH]: 2, // 2 minutes for blockchain confirmation
      [PaymentMethodType.X402]: 1 // 1 minute with x402 protocol
    };

    let baseTime = baseTimeEstimates[paymentMethod.type] || 5;

    // Adjust for network conditions
    if (networkConditions && this.isCryptoPayment(paymentMethod)) {
      switch (networkConditions.networkCongestion) {
        case 'high':
          baseTime *= 2;
          break;
        case 'medium':
          baseTime *= 1.5;
          break;
        case 'low':
          baseTime *= 0.8;
          break;
      }

      // Adjust for chain-specific block times
      const chainMultiplier = this.getChainTimeMultiplier(networkConditions.chainId);
      baseTime *= chainMultiplier;
    }

    return Math.round(baseTime * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Get gas estimate for payment method
   */
  private async getGasEstimate(
    paymentMethod: PaymentMethod,
    networkConditions?: NetworkConditions
  ): Promise<GasEstimate> {
    if (!paymentMethod.chainId) {
      throw new Error('Chain ID required for gas estimation');
    }

    const transactionType = paymentMethod.type === PaymentMethodType.NATIVE_ETH
      ? 'ethTransfer'
      : 'erc20Transfer';

    try {
      return await gasFeeEstimationService.getGasEstimate(
        paymentMethod.chainId,
        transactionType
      );
    } catch (error) {
      console.warn('Gas estimation failed, using fallback estimate:', error);
      // Return a fallback gas estimate when API fails with realistic values
      const fallbackGasFeeUSD = this.getRealisticGasFeeForChain(paymentMethod.chainId || 1);
      return {
        gasLimit: BigInt(21000),
        gasPrice: BigInt(20e9), // 20 gwei
        totalCost: BigInt(21000 * 20e9),
        totalCostUSD: fallbackGasFeeUSD,
        confidence: 0.3 // Low confidence for fallback
      };
    }
  }

  /**
   * Get gas limit for payment method
   */
  private async getGasLimit(paymentMethod: PaymentMethod): Promise<bigint | undefined> {
    if (!this.isCryptoPayment(paymentMethod)) {
      return undefined;
    }

    const gasEstimate = await this.getGasEstimate(paymentMethod);
    return gasEstimate.gasLimit;
  }

  /**
   * Get gas price for payment method
   */
  private async getGasPrice(
    paymentMethod: PaymentMethod,
    networkConditions?: NetworkConditions
  ): Promise<bigint | undefined> {
    if (!this.isCryptoPayment(paymentMethod)) {
      return undefined;
    }

    if (networkConditions) {
      return networkConditions.gasPrice;
    }

    const gasEstimate = await this.getGasEstimate(paymentMethod);
    return gasEstimate.gasPrice;
  }

  /**
   * Get exchange rate for payment method
   */
  private async getExchangeRate(
    paymentMethod: PaymentMethod,
    targetCurrency: string
  ): Promise<number | undefined> {
    if (!paymentMethod.token || paymentMethod.token.symbol === targetCurrency) {
      return undefined;
    }

    const exchangeRateData = await this.getExchangeRateData(paymentMethod, targetCurrency);
    return exchangeRateData?.rate;
  }

  /**
   * Get exchange rate data with caching
   */
  private async getExchangeRateData(
    paymentMethod: PaymentMethod,
    targetCurrency: string
  ): Promise<ExchangeRate | null> {
    if (!paymentMethod.token) {
      return null;
    }

    const cacheKey = `${EXCHANGE_RATE_CACHE_KEY_PREFIX}${paymentMethod.token.symbol}_${targetCurrency}`;
    const cached = this.exchangeRateCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp.getTime() < EXCHANGE_RATE_CACHE_DURATION) {
      return cached.rate;
    }

    try {
      const rate = await this.fetchExchangeRate(paymentMethod.token.symbol, targetCurrency);
      if (rate) {
        this.exchangeRateCache.set(cacheKey, {
          rate,
          timestamp: new Date()
        });
      }
      return rate;
    } catch (error) {
      console.error('Exchange rate fetch failed:', error);
      return null;
    }
  }

  /**
   * Fetch exchange rate from API
   */
  private async fetchExchangeRate(
    fromToken: string,
    toToken: string
  ): Promise<ExchangeRate | null> {
    try {
      const coingeckoId = this.getCoingeckoId(fromToken);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=${toToken.toLowerCase()}`
      );
      const data = await response.json();

      const rate = data[coingeckoId]?.[toToken.toLowerCase()];
      if (rate) {
        return {
          fromToken,
          toToken,
          rate,
          source: 'coingecko',
          lastUpdated: new Date(),
          confidence: 0.9
        };
      }
      return null;
    } catch (error) {
      console.error('CoinGecko API error:', error);
      return null;
    }
  }

  /**
   * Get CoinGecko ID for token symbol
   */
  private getCoingeckoId(symbol: string): string {
    const idMap: Record<string, string> = {
      'ETH': 'ethereum',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'MATIC': 'matic-network'
    };
    return idMap[symbol] || symbol.toLowerCase();
  }

  /**
   * Check if payment method is crypto-based
   */
  private isCryptoPayment(paymentMethod: PaymentMethod): boolean {
    return paymentMethod.type !== PaymentMethodType.FIAT_STRIPE &&
      paymentMethod.type !== PaymentMethodType.X402;
  }

  /**
   * Calculate network confidence based on conditions
   */
  private calculateNetworkConfidence(networkConditions: NetworkConditions): number {
    const age = Date.now() - networkConditions.lastUpdated.getTime();
    const ageMinutes = age / (1000 * 60);

    // Confidence decreases with age
    let confidence = Math.max(0.1, 1 - (ageMinutes / 10)); // 10 minutes = 0 confidence

    // Adjust for network congestion
    switch (networkConditions.networkCongestion) {
      case 'low':
        confidence *= 1.1;
        break;
      case 'medium':
        confidence *= 1.0;
        break;
      case 'high':
        confidence *= 0.8;
        break;
    }

    return Math.min(1, confidence);
  }

  /**
   * Get chain-specific time multiplier
   */
  private getChainTimeMultiplier(chainId: number): number {
    const multipliers: Record<number, number> = {
      1: 1.0, // Ethereum mainnet
      137: 0.2, // Polygon (faster)
      42161: 0.1, // Arbitrum (fastest)
      11155111: 1.0 // Sepolia
    };
    return multipliers[chainId] || 1.0;
  }

  /**
   * Get realistic gas fee for a specific chain (fallback values)
   */
  private getRealisticGasFeeForChain(chainId: number): number {
    switch (chainId) {
      case 1: // Ethereum Mainnet
        return 2.50;
      case 137: // Polygon
        return 0.05;
      case 42161: // Arbitrum
        return 0.15;
      case 8453: // Base
        return 0.10;
      case 11155111: // Sepolia Testnet
        return 0.01;
      case 84532: // Base Sepolia
        return 0.01;
      default:
        return 1.00; // Default reasonable fee
    }
  }

  /**
   * Determine if method is recommended
   */
  private isRecommendedMethod(
    estimate: { method: PaymentMethod; costEstimate: CostEstimate },
    allEstimates: { method: PaymentMethod; costEstimate: CostEstimate }[]
  ): boolean {
    const { costEstimate } = estimate;

    // Recommend if it's the cheapest
    const cheapestCost = Math.min(...allEstimates.map(e => e.costEstimate.totalCost));
    if (costEstimate.totalCost === cheapestCost) {
      return true;
    }

    // Recommend if it has high confidence and reasonable cost
    if (costEstimate.confidence > 0.8) {
      const averageCost = allEstimates.reduce((sum, e) => sum + e.costEstimate.totalCost, 0) / allEstimates.length;
      if (costEstimate.totalCost <= averageCost * 1.1) { // Within 10% of average
        return true;
      }
    }

    return false;
  }

  /**
   * Get recommendation reason
   */
  private getRecommendationReason(
    estimate: { method: PaymentMethod; costEstimate: CostEstimate },
    allEstimates: { method: PaymentMethod; costEstimate: CostEstimate }[]
  ): string {
    const { method, costEstimate } = estimate;
    const cheapestCost = Math.min(...allEstimates.map(e => e.costEstimate.totalCost));

    if (costEstimate.totalCost === cheapestCost) {
      return 'Lowest total cost';
    }

    if (costEstimate.confidence > 0.9) {
      return 'High confidence estimate with competitive pricing';
    }

    if (method.type === PaymentMethodType.STABLECOIN_USDC) {
      return 'Stable value with predictable costs';
    }

    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      return 'No gas fees and familiar payment experience';
    }

    return 'Good balance of cost and reliability';
  }

  /**
   * Get fallback cost estimate when calculation fails
   */
  private getFallbackCostEstimate(
    paymentMethod: PaymentMethod,
    amount: number,
    currency: string
  ): CostEstimate {
    // Platform fee (15%) - for internal tracking, NOT charged to buyer
    const platformFee = amount * SELLER_PLATFORM_FEE_RATE;

    let networkFee = 0;
    let estimatedGasFee = 0;

    if (paymentMethod.type === PaymentMethodType.FIAT_STRIPE) {
      // Stripe processing fee passed to buyer
      networkFee = (amount * STRIPE_PROCESSING_FEE_RATE) + STRIPE_FIXED_FEE;
    } else if (this.isCryptoPayment(paymentMethod)) {
      estimatedGasFee = this.getRealisticGasFeeForChain(paymentMethod.chainId || 1);
      networkFee = estimatedGasFee;
    } else if (paymentMethod.type === PaymentMethodType.X402) {
      estimatedGasFee = 0.1; // Very low fee for x402
      networkFee = estimatedGasFee;
    }

    // Buyer's total: amount + network fees (NO platform fee)
    const totalCost = amount + networkFee;

    return {
      totalCost,
      baseCost: amount,
      gasFee: estimatedGasFee,
      estimatedTime: 5, // 5 minutes fallback
      confidence: 0.3, // Low confidence for fallback
      currency,
      breakdown: {
        amount,
        networkFee,
        platformFee // Tracked for seller payout, NOT in buyer total
      }
    };
  }

  /**
   * Clear exchange rate cache
   */
  clearCache(): void {
    this.exchangeRateCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.exchangeRateCache.size,
      keys: Array.from(this.exchangeRateCache.keys())
    };
  }
}

// Export singleton instance
export const transactionCostCalculator = new TransactionCostCalculator();

export default TransactionCostCalculator;