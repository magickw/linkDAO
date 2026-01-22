/**
 * Payment Prioritization Factory
 * Factory service to create and configure payment method prioritization system
 */

import PaymentMethodPrioritizationService from './paymentMethodPrioritizationService';
import CostEffectivenessCalculator from './costEffectivenessCalculator';
import NetworkAvailabilityChecker from './networkAvailabilityChecker';
import UserPreferenceManager from './userPreferenceManager';
import PaymentMethodConfigurationManager from '../config/paymentMethodPrioritization';
import { getTokenAddress } from '../config/tokenAddresses';
import {
  PaymentMethodType,
  PaymentMethodConfig,
  UserContext,
  PrioritizationContext,
  MarketConditions,
  NetworkConditions
} from '../types/paymentPrioritization';

export class PaymentPrioritizationFactory {
  private static instance: PaymentPrioritizationFactory;
  private prioritizationService: PaymentMethodPrioritizationService | null = null;
  private configManager: PaymentMethodConfigurationManager;

  private constructor() {
    this.configManager = new PaymentMethodConfigurationManager();
  }

  static getInstance(): PaymentPrioritizationFactory {
    if (!PaymentPrioritizationFactory.instance) {
      PaymentPrioritizationFactory.instance = new PaymentPrioritizationFactory();
    }
    return PaymentPrioritizationFactory.instance;
  }

  /**
   * Create a configured payment method prioritization service
   */
  createPrioritizationService(
    environment?: 'development' | 'production' | 'testnet',
    userTier?: 'basic' | 'premium' | 'vip',
    region?: 'US' | 'EU' | 'ASIA' | 'OTHER'
  ): PaymentMethodPrioritizationService {
    if (this.prioritizationService) {
      return this.prioritizationService;
    }

    // Configure the configuration manager
    if (environment) this.configManager.updateEnvironment(environment);
    if (userTier) this.configManager.updateUserTier(userTier);
    if (region) this.configManager.updateRegion(region);

    // Create service dependencies
    const costCalculator = new CostEffectivenessCalculator();
    const networkChecker = new NetworkAvailabilityChecker(
      this.configManager.getAvailablePaymentMethods()
    );
    const preferenceManager = new UserPreferenceManager();

    // Get configurations
    const configs = this.configManager.getPaymentMethodConfigs();

    // Create the main service
    this.prioritizationService = new PaymentMethodPrioritizationService(
      costCalculator,
      networkChecker,
      preferenceManager,
      configs
    );

    return this.prioritizationService;
  }

  /**
   * Create a user context for prioritization
   */
  async createUserContext(
    userAddress?: string,
    chainId: number = 1,
    region?: 'US' | 'EU' | 'ASIA' | 'OTHER'
  ): Promise<UserContext> {
    const preferenceManager = new UserPreferenceManager();

    // Get user preferences
    const preferences = userAddress
      ? await preferenceManager.getUserPaymentPreferences(userAddress)
      : preferenceManager['getDefaultPreferences']();

    // Mock wallet balances (in production, this would fetch from wallet/blockchain)
    const walletBalances = await this.getMockWalletBalances(userAddress, chainId);

    return {
      userAddress,
      chainId,
      preferences,
      walletBalances,
      region,
      isVIP: false // Would be determined by user tier service
    };
  }

  /**
   * Create market conditions context
   */
  async createMarketConditions(chainIds: number[] = [1, 137, 42161]): Promise<MarketConditions> {
    const costCalculator = new CostEffectivenessCalculator();

    // Get network conditions for specified chains
    const gasConditions = await Promise.all(
      chainIds.map(chainId => costCalculator.getNetworkConditions(chainId))
    );

    // Mock exchange rates (in production, would fetch from price APIs)
    const exchangeRates = [
      {
        fromToken: 'ETH',
        toToken: 'USD',
        rate: 2000,
        source: 'mock',
        lastUpdated: new Date(),
        confidence: 0.95
      },
      {
        fromToken: 'MATIC',
        toToken: 'USD',
        rate: 0.8,
        source: 'mock',
        lastUpdated: new Date(),
        confidence: 0.95
      },
      {
        fromToken: 'USDC',
        toToken: 'USD',
        rate: 1.0,
        source: 'mock',
        lastUpdated: new Date(),
        confidence: 0.99
      }
    ];

    // Mock network availability
    const networkAvailability = chainIds.map(chainId => ({
      chainId,
      available: true,
      reason: undefined,
      estimatedRecoveryTime: undefined
    }));

    return {
      gasConditions,
      exchangeRates,
      networkAvailability,
      lastUpdated: new Date()
    };
  }

  /**
   * Create a complete prioritization context
   */
  async createPrioritizationContext(
    userAddress: string | undefined,
    chainId: number,
    transactionAmount: number,
    transactionCurrency: string = 'USD',
    region?: 'US' | 'EU' | 'ASIA' | 'OTHER'
  ): Promise<PrioritizationContext> {
    const userContext = await this.createUserContext(userAddress, chainId, region);
    const marketConditions = await this.createMarketConditions([chainId]);
    const availablePaymentMethods = this.configManager.getAvailablePaymentMethods(chainId);

    return {
      userContext,
      transactionAmount,
      transactionCurrency,
      marketConditions,
      availablePaymentMethods
    };
  }

  /**
   * Quick setup method for common use cases
   */
  async quickSetup(
    userAddress?: string,
    chainId: number = 1,
    transactionAmount: number = 100
  ) {
    const service = this.createPrioritizationService();
    const context = await this.createPrioritizationContext(
      userAddress,
      chainId,
      transactionAmount
    );

    return {
      service,
      context,
      prioritize: () => service.prioritizePaymentMethods(context)
    };
  }

  /**
   * Get configuration manager
   */
  getConfigManager(): PaymentMethodConfigurationManager {
    return this.configManager;
  }

  /**
   * Reset factory (useful for testing)
   */
  reset(): void {
    this.prioritizationService = null;
    this.configManager = new PaymentMethodConfigurationManager();
  }

  // Private helper methods
  private async getMockWalletBalances(userAddress?: string, chainId: number = 1) {
    if (!userAddress) return [];

    // Mock wallet balances - in production, would fetch from blockchain
    const mockBalances = [
      {
        token: {
          address: getTokenAddress('USDC', chainId), // Use correct USDC address for the chain
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId
        },
        balance: BigInt('1000000000'), // 1000 USDC
        balanceUSD: 1000,
        chainId
      },
      {
        token: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          chainId,
          isNative: true
        },
        balance: BigInt('500000000000000000'), // 0.5 ETH
        balanceUSD: 1000,
        chainId
      }
    ];

    return mockBalances;
  }
}

// Export singleton instance
export const paymentPrioritizationFactory = PaymentPrioritizationFactory.getInstance();

// Export convenience functions
export const createPrioritizationService = (
  environment?: 'development' | 'production' | 'testnet',
  userTier?: 'basic' | 'premium' | 'vip',
  region?: 'US' | 'EU' | 'ASIA' | 'OTHER'
) => paymentPrioritizationFactory.createPrioritizationService(environment, userTier, region);

export const quickPrioritization = async (
  userAddress?: string,
  chainId: number = 1,
  transactionAmount: number = 100
) => {
  const { service, context } = await paymentPrioritizationFactory.quickSetup(
    userAddress,
    chainId,
    transactionAmount
  );

  return service.prioritizePaymentMethods(context);
};

export default PaymentPrioritizationFactory;