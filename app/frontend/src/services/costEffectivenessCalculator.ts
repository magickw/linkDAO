/**
 * Cost Effectiveness Calculator
 * Calculates and compares transaction costs for different payment methods
 * Integrates with gas fee estimation and exchange rate services
 */

import {
  PaymentMethod,
  PaymentMethodType,
  CostEstimate,
  CostComparison,
  NetworkConditions
} from '../types/paymentPrioritization';
import { ICostEffectivenessCalculator } from './paymentMethodPrioritizationService';
import { gasFeeEstimationService } from './gasFeeEstimationService';
import { transactionCostCalculator } from './transactionCostCalculator';
import { exchangeRateService } from './exchangeRateService';

export class CostEffectivenessCalculator implements ICostEffectivenessCalculator {
  private readonly PLATFORM_FEE_RATE = 0.025; // 2.5%
  private readonly STRIPE_FEE_RATE = 0.029; // 2.9% + $0.30
  private readonly STRIPE_FIXED_FEE = 0.30;

  async calculateTransactionCost(
    paymentMethod: PaymentMethod,
    amount: number,
    networkConditions: NetworkConditions
  ): Promise<CostEstimate> {
    try {
      // Use the integrated transaction cost calculator
      return await transactionCostCalculator.calculateTransactionCost(
        paymentMethod,
        amount,
        'USD',
        networkConditions
      );
    } catch (error) {
      console.error('Integrated cost calculation failed, falling back to legacy method:', error);
      return this.calculateTransactionCostLegacy(paymentMethod, amount, networkConditions);
    }
  }

  private async calculateTransactionCostLegacy(
    paymentMethod: PaymentMethod,
    amount: number,
    networkConditions: NetworkConditions
  ): Promise<CostEstimate> {
    const baseCost = amount;
    let gasFee = 0;
    let networkFee = 0;
    let platformFee = baseCost * this.PLATFORM_FEE_RATE;
    let estimatedTime = 5; // Default 5 minutes
    let confidence = 0.9; // Default high confidence

    switch (paymentMethod.type) {
      case PaymentMethodType.STABLECOIN_USDC:
      case PaymentMethodType.STABLECOIN_USDT:
        gasFee = await this.calculateGasFee(paymentMethod, networkConditions);
        estimatedTime = this.estimateConfirmationTime(networkConditions);
        confidence = this.calculateGasEstimateConfidence(networkConditions);
        break;

      case PaymentMethodType.FIAT_STRIPE:
        networkFee = (baseCost * this.STRIPE_FEE_RATE) + this.STRIPE_FIXED_FEE;
        estimatedTime = 1; // Instant for fiat
        confidence = 0.95; // High confidence for fiat
        break;

      case PaymentMethodType.NATIVE_ETH:
        gasFee = await this.calculateGasFee(paymentMethod, networkConditions);
        estimatedTime = this.estimateConfirmationTime(networkConditions);
        confidence = this.calculateGasEstimateConfidence(networkConditions);
        break;

      default:
        throw new Error(`Unsupported payment method type: ${paymentMethod.type}`);
    }

    const totalCost = baseCost + gasFee + networkFee + platformFee;

    return {
      totalCost,
      baseCost,
      gasFee,
      exchangeRate: 1, // Assuming USD base
      estimatedTime,
      confidence,
      currency: 'USD',
      breakdown: {
        amount: baseCost,
        gasLimit: paymentMethod.token ? BigInt(21000) : undefined, // Standard transfer
        gasPrice: paymentMethod.token ? networkConditions.gasPrice : undefined,
        networkFee,
        platformFee
      }
    };
  }

  async comparePaymentMethods(
    methods: PaymentMethod[],
    amount: number,
    networkConditions: NetworkConditions[]
  ): Promise<CostComparison[]> {
    try {
      // Use the integrated transaction cost calculator for comparison
      const networkCondition = networkConditions[0]; // Use first available for now
      return await transactionCostCalculator.comparePaymentMethods(
        methods,
        amount,
        'USD',
        networkCondition
      );
    } catch (error) {
      console.error('Integrated cost comparison failed, falling back to legacy method:', error);
      return this.comparePaymentMethodsLegacy(methods, amount, networkConditions);
    }
  }

  private async comparePaymentMethodsLegacy(
    methods: PaymentMethod[],
    amount: number,
    networkConditions: NetworkConditions[]
  ): Promise<CostComparison[]> {
    const costEstimates = await Promise.all(
      methods.map(async (method) => {
        const networkCondition = networkConditions.find(
          nc => nc.chainId === method.chainId
        ) || networkConditions[0]; // Fallback to first available

        const costEstimate = await this.calculateTransactionCost(
          method,
          amount,
          networkCondition
        );

        return { method, costEstimate };
      })
    );

    // Find cheapest option for comparison
    const cheapestCost = Math.min(...costEstimates.map(ce => ce.costEstimate.totalCost));
    const mostExpensiveCost = Math.max(...costEstimates.map(ce => ce.costEstimate.totalCost));

    return costEstimates.map(({ method, costEstimate }) => {
      const savings = mostExpensiveCost - costEstimate.totalCost;
      const costDifference = costEstimate.totalCost - cheapestCost;
      const isRecommended = this.isMethodRecommended(method, costEstimate, cheapestCost);

      return {
        method,
        costEstimate,
        savings: savings > 0 ? savings : undefined,
        costDifference: costDifference > 0 ? costDifference : undefined,
        isRecommended,
        reasonForRecommendation: isRecommended 
          ? this.getRecommendationReason(method, costEstimate, cheapestCost)
          : undefined
      };
    }).sort((a, b) => a.costEstimate.totalCost - b.costEstimate.totalCost);
  }

  isGasFeeAcceptable(gasEstimate: CostEstimate, threshold: number): boolean {
    return gasEstimate.gasFee <= threshold;
  }

  private async calculateGasFee(
    paymentMethod: PaymentMethod,
    networkConditions: NetworkConditions
  ): Promise<number> {
    if (!paymentMethod.token || !paymentMethod.chainId) return 0;

    try {
      // Use the integrated gas fee estimation service
      const transactionType = paymentMethod.type === PaymentMethodType.NATIVE_ETH 
        ? 'ethTransfer' 
        : 'erc20Transfer';
      
      const gasEstimate = await gasFeeEstimationService.getGasEstimate(
        paymentMethod.chainId,
        transactionType
      );
      
      return gasEstimate.totalCostUSD;
    } catch (error) {
      console.warn('Gas fee estimation failed, using fallback calculation:', error);
      return this.calculateGasFeeFallback(paymentMethod, networkConditions);
    }
  }

  private async calculateGasFeeFallback(
    paymentMethod: PaymentMethod,
    networkConditions: NetworkConditions
  ): Promise<number> {
    if (!paymentMethod.token) return 0;

    try {
      // Base gas limit for different transaction types
      let gasLimit = 21000; // Standard transfer

      // Adjust gas limit based on token type
      if (paymentMethod.type === PaymentMethodType.STABLECOIN_USDC || 
          paymentMethod.type === PaymentMethodType.STABLECOIN_USDT) {
        gasLimit = 65000; // ERC-20 transfer
      }

      // Calculate gas cost in USD
      const gasCostWei = BigInt(gasLimit) * networkConditions.gasPrice;
      const gasCostEth = Number(gasCostWei) / 1e18;
      
      // Convert to USD using exchange rate service
      const ethPriceUSD = await this.getETHPriceUSD();
      const gasFeeUSD = gasCostEth * ethPriceUSD;

      return gasFeeUSD;
    } catch (error) {
      console.warn('Gas fee fallback calculation failed, using static fallback:', error);
      // Static fallback values based on payment method type
      switch (paymentMethod.type) {
        case PaymentMethodType.STABLECOIN_USDC:
        case PaymentMethodType.STABLECOIN_USDT:
          return 5; // $5 for stablecoin transfers
        case PaymentMethodType.NATIVE_ETH:
          return 10; // $10 for ETH transfers
        default:
          return 5; // $5 default
      }
    }
  }

  private estimateConfirmationTime(networkConditions: NetworkConditions): number {
    // Estimate based on network congestion and block time
    const baseTime = networkConditions.blockTime / 60; // Convert to minutes

    switch (networkConditions.networkCongestion) {
      case 'low':
        return Math.max(1, baseTime * 1);
      case 'medium':
        return Math.max(2, baseTime * 2);
      case 'high':
        return Math.max(5, baseTime * 4);
      default:
        return 5;
    }
  }

  private calculateGasEstimateConfidence(networkConditions: NetworkConditions): number {
    // Confidence decreases with network congestion and older data
    const dataAge = Date.now() - networkConditions.lastUpdated.getTime();
    const ageMinutes = dataAge / (1000 * 60);

    let baseConfidence = 0.9;

    // Reduce confidence based on network congestion
    switch (networkConditions.networkCongestion) {
      case 'high':
        baseConfidence -= 0.2;
        break;
      case 'medium':
        baseConfidence -= 0.1;
        break;
    }

    // Reduce confidence based on data age
    if (ageMinutes > 5) {
      baseConfidence -= Math.min(0.3, ageMinutes / 20);
    }

    return Math.max(0.1, baseConfidence);
  }

  private async getETHPriceUSD(): Promise<number> {
    try {
      // Use the integrated exchange rate service
      const exchangeRate = await exchangeRateService.getExchangeRate('ETH', 'USD');
      return exchangeRate?.rate || 2000; // Fallback to $2000 per ETH
    } catch (error) {
      console.warn('ETH price fetch failed, using fallback:', error);
      return 2000; // $2000 per ETH fallback
    }
  }

  private isMethodRecommended(
    method: PaymentMethod,
    costEstimate: CostEstimate,
    cheapestCost: number
  ): boolean {
    // Recommend if it's the cheapest or within 5% of cheapest
    const costDifference = costEstimate.totalCost - cheapestCost;
    const percentageDifference = costDifference / cheapestCost;

    if (percentageDifference <= 0.05) {
      return true;
    }

    // Special cases for recommendation
    if (method.type === PaymentMethodType.STABLECOIN_USDC && costEstimate.gasFee < 10) {
      return true; // Recommend USDC if gas fees are low
    }

    if (method.type === PaymentMethodType.FIAT_STRIPE && costEstimate.totalCost < cheapestCost * 1.1) {
      return true; // Recommend fiat if within 10% of cheapest
    }

    return false;
  }

  private getRecommendationReason(
    method: PaymentMethod,
    costEstimate: CostEstimate,
    cheapestCost: number
  ): string {
    if (costEstimate.totalCost === cheapestCost) {
      return 'Lowest cost option';
    }

    if (method.type === PaymentMethodType.STABLECOIN_USDC) {
      return 'Stable value with reasonable fees';
    }

    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      return 'No gas fees and familiar payment experience';
    }

    if (costEstimate.estimatedTime < 2) {
      return 'Fast confirmation time';
    }

    return 'Good balance of cost and convenience';
  }

  // Utility methods for testing and debugging
  async estimateGasPrice(chainId: number): Promise<bigint> {
    // Mock implementation - would integrate with gas price APIs
    switch (chainId) {
      case 1: // Mainnet
        return BigInt(20e9); // 20 gwei
      case 137: // Polygon
        return BigInt(30e9); // 30 gwei
      case 42161: // Arbitrum
        return BigInt(0.1e9); // 0.1 gwei
      default:
        return BigInt(20e9);
    }
  }

  async getNetworkConditions(chainId: number): Promise<NetworkConditions> {
    try {
      // Use the integrated gas fee estimation service
      return await gasFeeEstimationService.getNetworkConditions(chainId);
    } catch (error) {
      console.error('Network conditions fetch failed, using fallback:', error);
      return this.getNetworkConditionsFallback(chainId);
    }
  }

  private async getNetworkConditionsFallback(chainId: number): Promise<NetworkConditions> {
    try {
      // Mock implementation - would integrate with network monitoring APIs
      const gasPrice = await this.estimateGasPrice(chainId);
      const ethPrice = await this.getETHPriceUSD();
      const gasPriceUSD = (Number(gasPrice) / 1e9) * (21000 / 1e9) * ethPrice;

      return {
        chainId,
        gasPrice,
        gasPriceUSD,
        networkCongestion: gasPriceUSD > 10 ? 'high' : gasPriceUSD > 5 ? 'medium' : 'low',
        blockTime: chainId === 137 ? 2 : chainId === 42161 ? 0.25 : 12, // seconds
        lastUpdated: new Date()
      };
    } catch (error) {
      console.warn('Network conditions fallback failed, using static values:', error);
      // Static fallback values
      const fallbackGasPrices: Record<number, bigint> = {
        1: BigInt(20e9), // 20 gwei for mainnet
        137: BigInt(30e9), // 30 gwei for polygon
        42161: BigInt(1e9), // 1 gwei for arbitrum
        11155111: BigInt(10e9) // 10 gwei for sepolia
      };

      const gasPrice = fallbackGasPrices[chainId] || BigInt(20e9);
      const gasPriceUSD = 5; // $5 fallback

      return {
        chainId,
        gasPrice,
        gasPriceUSD,
        networkCongestion: 'medium',
        blockTime: chainId === 137 ? 2 : chainId === 42161 ? 0.25 : 12,
        lastUpdated: new Date()
      };
    }
  }
}

export default CostEffectivenessCalculator;