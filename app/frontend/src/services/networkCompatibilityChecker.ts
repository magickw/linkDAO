/**
 * Network Compatibility Checker
 * Validates payment method support across networks and provides switching suggestions
 */

import { PaymentMethod, PaymentMethodType, AvailabilityStatus } from '../types/paymentPrioritization';
import { PaymentToken } from '../types/payment';
import { supportedTokensRegistry, TokenAvailabilityResult } from './supportedTokensRegistry';
import { SUPPORTED_PAYMENT_METHODS, NETWORK_PRIORITIZATION_RULES } from '../config/paymentMethodPrioritization';

export interface NetworkCompatibilityResult {
  method: PaymentMethod;
  isSupported: boolean;
  supportLevel: 'full' | 'partial' | 'none';
  availabilityStatus: AvailabilityStatus;
  reason?: string;
  alternativeNetworks?: NetworkSuggestion[];
  alternativeMethods?: PaymentMethod[];
  migrationSuggestion?: NetworkMigrationSuggestion;
  warnings?: string[];
  benefits?: string[];
}

export interface NetworkSuggestion {
  chainId: number;
  networkName: string;
  reason: string;
  benefits: string[];
  estimatedGasSavings?: number;
  estimatedTimeImprovement?: number;
  migrationComplexity: 'low' | 'medium' | 'high';
  recommendationScore: number; // 0-100
}

export interface NetworkMigrationSuggestion {
  fromChainId: number;
  toChainId: number;
  fromNetworkName: string;
  toNetworkName: string;
  migrationSteps: MigrationStep[];
  estimatedCost: number; // USD
  estimatedTime: number; // minutes
  riskLevel: 'low' | 'medium' | 'high';
  benefits: string[];
  requirements: string[];
}

export interface MigrationStep {
  step: number;
  action: string;
  description: string;
  estimatedTime: number; // minutes
  estimatedCost?: number; // USD
  required: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PaymentMethodCompatibilityMatrix {
  chainId: number;
  networkName: string;
  supportedMethods: {
    method: PaymentMethodType;
    supported: boolean;
    recommendationScore: number;
    gasEfficiency: 'low' | 'medium' | 'high';
    liquidityScore: number;
  }[];
  preferredMethods: PaymentMethodType[];
  fallbackMethods: PaymentMethodType[];
  networkStatus: 'optimal' | 'good' | 'limited' | 'unavailable';
}

export class NetworkCompatibilityChecker {
  private compatibilityCache: Map<string, NetworkCompatibilityResult> = new Map();
  private migrationCache: Map<string, NetworkMigrationSuggestion> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  /**
   * Validate payment method support on a specific network
   */
  public async validatePaymentMethodSupport(
    method: PaymentMethod,
    chainId: number
  ): Promise<NetworkCompatibilityResult> {
    const cacheKey = `${method.id}-${chainId}`;
    
    // Check cache first
    if (this.isCacheValid() && this.compatibilityCache.has(cacheKey)) {
      return this.compatibilityCache.get(cacheKey)!;
    }

    const result = await this.performCompatibilityCheck(method, chainId);
    this.compatibilityCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Get network switching suggestions for unavailable methods
   */
  public async getNetworkSwitchingSuggestions(
    method: PaymentMethod,
    currentChainId: number,
    userPreferences?: {
      preferLowGas?: boolean;
      preferFastTransactions?: boolean;
      preferHighLiquidity?: boolean;
    }
  ): Promise<NetworkSuggestion[]> {
    const suggestions: NetworkSuggestion[] = [];
    
    // Get all networks that support this payment method
    const supportedNetworks = this.getSupportedNetworksForMethod(method);
    
    for (const chainId of supportedNetworks) {
      if (chainId === currentChainId) continue;
      
      const suggestion = await this.buildNetworkSuggestion(
        method,
        currentChainId,
        chainId,
        userPreferences
      );
      
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }
    
    // Sort by recommendation score
    return suggestions.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  /**
   * Get fallback network recommendations when preferred method is unavailable
   */
  public async getFallbackNetworkRecommendations(
    preferredMethod: PaymentMethod,
    currentChainId: number,
    transactionAmount?: number
  ): Promise<NetworkSuggestion[]> {
    const fallbackSuggestions: NetworkSuggestion[] = [];
    
    // Get networks with similar payment methods
    const allNetworks = supportedTokensRegistry.getSupportedNetworks();
    
    for (const chainId of allNetworks) {
      if (chainId === currentChainId) continue;
      
      const networkConfig = supportedTokensRegistry.getNetworkConfig(chainId);
      if (!networkConfig) continue;
      
      // Check if network has similar payment methods
      const hasSimilarMethod = this.hasSimilarPaymentMethod(preferredMethod, chainId);
      
      if (hasSimilarMethod) {
        const suggestion = await this.buildFallbackSuggestion(
          preferredMethod,
          currentChainId,
          chainId,
          transactionAmount
        );
        
        if (suggestion) {
          fallbackSuggestions.push(suggestion);
        }
      }
    }
    
    return fallbackSuggestions.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  /**
   * Generate network migration suggestions
   */
  public async generateMigrationSuggestion(
    fromChainId: number,
    toChainId: number,
    method: PaymentMethod
  ): Promise<NetworkMigrationSuggestion | null> {
    const cacheKey = `${fromChainId}-${toChainId}-${method.type}`;
    
    if (this.isCacheValid() && this.migrationCache.has(cacheKey)) {
      return this.migrationCache.get(cacheKey)!;
    }
    
    const suggestion = await this.buildMigrationSuggestion(fromChainId, toChainId, method);
    
    if (suggestion) {
      this.migrationCache.set(cacheKey, suggestion);
    }
    
    return suggestion;
  }

  /**
   * Get compatibility matrix for all payment methods across networks
   */
  public getPaymentMethodCompatibilityMatrix(): PaymentMethodCompatibilityMatrix[] {
    const matrix: PaymentMethodCompatibilityMatrix[] = [];
    const supportedNetworks = supportedTokensRegistry.getSupportedNetworks();
    
    for (const chainId of supportedNetworks) {
      const networkConfig = supportedTokensRegistry.getNetworkConfig(chainId);
      if (!networkConfig) continue;
      
      const supportedMethods = Object.values(PaymentMethodType).map(methodType => {
        const isSupported = this.isPaymentMethodSupportedOnNetwork(methodType, chainId);
        const recommendationScore = this.calculateMethodRecommendationScore(methodType, chainId);
        const gasEfficiency = this.getGasEfficiencyForMethod(methodType, chainId);
        const liquidityScore = this.getLiquidityScoreForMethod(methodType, chainId);
        
        return {
          method: methodType,
          supported: isSupported,
          recommendationScore,
          gasEfficiency,
          liquidityScore
        };
      });
      
      const networkRules = NETWORK_PRIORITIZATION_RULES[chainId];
      const preferredMethods = networkRules?.preferredMethods || [];
      const fallbackMethods = this.getFallbackMethodsForNetwork(chainId);
      const networkStatus = this.assessNetworkStatus(chainId);
      
      matrix.push({
        chainId,
        networkName: networkConfig.networkName,
        supportedMethods,
        preferredMethods,
        fallbackMethods,
        networkStatus
      });
    }
    
    return matrix;
  }

  /**
   * Check if payment method is supported on network
   */
  public isPaymentMethodSupportedOnNetwork(
    methodType: PaymentMethodType,
    chainId: number
  ): boolean {
    // Fiat payments are supported on all networks
    if (methodType === PaymentMethodType.FIAT_STRIPE) {
      return true;
    }
    
    // Check if network has tokens for this method type
    const networkConfig = supportedTokensRegistry.getNetworkConfig(chainId);
    if (!networkConfig) return false;
    
    return networkConfig.tokens.some(tokenMetadata => {
      const method = this.getPaymentMethodForToken(tokenMetadata.token);
      return method?.type === methodType;
    });
  }

  /**
   * Get supported networks for a specific payment method
   */
  public getSupportedNetworksForMethod(method: PaymentMethod): number[] {
    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      return supportedTokensRegistry.getSupportedNetworks();
    }
    
    if (!method.token) return [];
    
    return supportedTokensRegistry.getNetworksForToken(method.token);
  }

  // Private helper methods

  private async performCompatibilityCheck(
    method: PaymentMethod,
    chainId: number
  ): Promise<NetworkCompatibilityResult> {
    // Fiat payments are always supported
    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      return {
        method,
        isSupported: true,
        supportLevel: 'full',
        availabilityStatus: AvailabilityStatus.AVAILABLE,
        benefits: ['No gas fees', 'Familiar payment experience', 'Instant processing']
      };
    }
    
    // Check token availability
    if (!method.token) {
      return {
        method,
        isSupported: false,
        supportLevel: 'none',
        availabilityStatus: AvailabilityStatus.UNAVAILABLE_NETWORK_UNSUPPORTED,
        reason: 'Payment method has no associated token',
        alternativeNetworks: [],
        alternativeMethods: this.getAlternativeMethodsForNetwork(chainId)
      };
    }
    
    const tokenAvailability = supportedTokensRegistry.isTokenAvailable(method.token, chainId);
    
    if (tokenAvailability.available) {
      const tokenMetadata = supportedTokensRegistry.getTokenMetadata(
        method.token.symbol,
        chainId
      );
      
      return {
        method,
        isSupported: true,
        supportLevel: 'full',
        availabilityStatus: AvailabilityStatus.AVAILABLE,
        benefits: tokenMetadata?.benefits || [],
        warnings: tokenMetadata?.warnings || []
      };
    }
    
    // Method not supported on this network
    const alternativeNetworks = await this.getNetworkSwitchingSuggestions(method, chainId);
    const alternativeMethods = this.getAlternativeMethodsForNetwork(chainId);
    const migrationSuggestion = alternativeNetworks.length > 0 
      ? await this.generateMigrationSuggestion(chainId, alternativeNetworks[0].chainId, method)
      : undefined;
    
    return {
      method,
      isSupported: false,
      supportLevel: 'none',
      availabilityStatus: AvailabilityStatus.UNAVAILABLE_NETWORK_UNSUPPORTED,
      reason: tokenAvailability.reason,
      alternativeNetworks,
      alternativeMethods,
      migrationSuggestion: migrationSuggestion || undefined
    };
  }

  private async buildNetworkSuggestion(
    method: PaymentMethod,
    fromChainId: number,
    toChainId: number,
    userPreferences?: {
      preferLowGas?: boolean;
      preferFastTransactions?: boolean;
      preferHighLiquidity?: boolean;
    }
  ): Promise<NetworkSuggestion | null> {
    const toNetworkConfig = supportedTokensRegistry.getNetworkConfig(toChainId);
    if (!toNetworkConfig) return null;
    
    const fromNetworkConfig = supportedTokensRegistry.getNetworkConfig(fromChainId);
    const fromNetworkName = fromNetworkConfig?.networkName || `Chain ${fromChainId}`;
    
    const benefits: string[] = [];
    let recommendationScore = 50; // Base score
    
    // Calculate gas savings
    const gasSavings = this.estimateGasSavings(fromChainId, toChainId);
    if (gasSavings > 0) {
      benefits.push(`~${gasSavings}% lower gas fees`);
      recommendationScore += Math.min(gasSavings / 2, 30); // Up to 30 points for gas savings
    }
    
    // Calculate time improvements
    const timeImprovement = this.estimateTimeImprovement(fromChainId, toChainId);
    if (timeImprovement > 0) {
      benefits.push(`~${timeImprovement}% faster transactions`);
      recommendationScore += Math.min(timeImprovement / 3, 20); // Up to 20 points for speed
    }
    
    // Apply user preferences
    if (userPreferences?.preferLowGas && gasSavings > 50) {
      recommendationScore += 15;
    }
    if (userPreferences?.preferFastTransactions && timeImprovement > 50) {
      recommendationScore += 15;
    }
    
    // Check liquidity
    if (method.token) {
      const tokenMetadata = supportedTokensRegistry.getTokenMetadata(
        method.token.symbol,
        toChainId
      );
      if (tokenMetadata && tokenMetadata.liquidityScore > 80) {
        benefits.push('High liquidity available');
        recommendationScore += 10;
      }
    }
    
    const migrationComplexity = this.assessMigrationComplexity(fromChainId, toChainId);
    
    return {
      chainId: toChainId,
      networkName: toNetworkConfig.networkName,
      reason: `Better support for ${method.name}`,
      benefits,
      estimatedGasSavings: gasSavings > 0 ? gasSavings : undefined,
      estimatedTimeImprovement: timeImprovement > 0 ? timeImprovement : undefined,
      migrationComplexity,
      recommendationScore: Math.min(recommendationScore, 100)
    };
  }

  private async buildFallbackSuggestion(
    preferredMethod: PaymentMethod,
    fromChainId: number,
    toChainId: number,
    transactionAmount?: number
  ): Promise<NetworkSuggestion | null> {
    const toNetworkConfig = supportedTokensRegistry.getNetworkConfig(toChainId);
    if (!toNetworkConfig) return null;
    
    const benefits: string[] = [];
    let recommendationScore = 40; // Lower base score for fallback
    
    // Find similar methods on target network
    const similarMethods = this.getSimilarMethodsOnNetwork(preferredMethod, toChainId);
    if (similarMethods.length === 0) return null;
    
    benefits.push(`${similarMethods.length} similar payment option(s) available`);
    
    // Calculate potential benefits
    const gasSavings = this.estimateGasSavings(fromChainId, toChainId);
    if (gasSavings > 0) {
      benefits.push(`Lower gas fees (~${gasSavings}% savings)`);
      recommendationScore += gasSavings / 3;
    }
    
    // Consider transaction amount for recommendation
    if (transactionAmount) {
      if (transactionAmount < 100 && gasSavings > 70) {
        benefits.push('Especially cost-effective for small transactions');
        recommendationScore += 15;
      }
    }
    
    return {
      chainId: toChainId,
      networkName: toNetworkConfig.networkName,
      reason: `Alternative network with similar payment methods`,
      benefits,
      estimatedGasSavings: gasSavings > 0 ? gasSavings : undefined,
      migrationComplexity: this.assessMigrationComplexity(fromChainId, toChainId),
      recommendationScore: Math.min(recommendationScore, 100)
    };
  }

  private async buildMigrationSuggestion(
    fromChainId: number,
    toChainId: number,
    method: PaymentMethod
  ): Promise<NetworkMigrationSuggestion | null> {
    const fromConfig = supportedTokensRegistry.getNetworkConfig(fromChainId);
    const toConfig = supportedTokensRegistry.getNetworkConfig(toChainId);
    
    if (!fromConfig || !toConfig) return null;
    
    const steps: MigrationStep[] = [];
    let totalCost = 0;
    let totalTime = 0;
    
    // Step 1: Connect to target network
    steps.push({
      step: 1,
      action: 'switch_network',
      description: `Switch wallet to ${toConfig.networkName}`,
      estimatedTime: 1,
      required: true,
      riskLevel: 'low'
    });
    totalTime += 1;
    
    // Step 2: Bridge tokens if needed (for non-native tokens)
    if (method.token && !method.token.isNative && method.type !== PaymentMethodType.FIAT_STRIPE) {
      const bridgeCost = this.estimateBridgeCost(fromChainId, toChainId);
      steps.push({
        step: 2,
        action: 'bridge_tokens',
        description: `Bridge ${method.token.symbol} from ${fromConfig.networkName} to ${toConfig.networkName}`,
        estimatedTime: 15,
        estimatedCost: bridgeCost,
        required: true,
        riskLevel: 'medium'
      });
      totalCost += bridgeCost;
      totalTime += 15;
    }
    
    // Step 3: Verify token availability
    steps.push({
      step: steps.length + 1,
      action: 'verify_tokens',
      description: `Verify ${method.name} is available on ${toConfig.networkName}`,
      estimatedTime: 2,
      required: true,
      riskLevel: 'low'
    });
    totalTime += 2;
    
    const benefits = [
      `Use ${method.name} on ${toConfig.networkName}`,
      'Access to network-specific features'
    ];
    
    const gasSavings = this.estimateGasSavings(fromChainId, toChainId);
    if (gasSavings > 0) {
      benefits.push(`${gasSavings}% lower gas fees`);
    }
    
    return {
      fromChainId,
      toChainId,
      fromNetworkName: fromConfig.networkName,
      toNetworkName: toConfig.networkName,
      migrationSteps: steps,
      estimatedCost: totalCost,
      estimatedTime: totalTime,
      riskLevel: totalCost > 50 ? 'high' : totalCost > 10 ? 'medium' : 'low',
      benefits,
      requirements: [
        'Wallet that supports network switching',
        'Sufficient gas tokens for transactions'
      ]
    };
  }

  private hasSimilarPaymentMethod(method: PaymentMethod, chainId: number): boolean {
    const networkConfig = supportedTokensRegistry.getNetworkConfig(chainId);
    if (!networkConfig) return false;
    
    // Check for same method type
    return networkConfig.tokens.some(tokenMetadata => {
      const paymentMethod = this.getPaymentMethodForToken(tokenMetadata.token);
      return paymentMethod?.type === method.type;
    });
  }

  private getPaymentMethodForToken(token: PaymentToken): PaymentMethod | undefined {
    return SUPPORTED_PAYMENT_METHODS.find(method => 
      method.token?.address.toLowerCase() === token.address.toLowerCase() &&
      method.token?.chainId === token.chainId
    );
  }

  private getAlternativeMethodsForNetwork(chainId: number): PaymentMethod[] {
    return SUPPORTED_PAYMENT_METHODS.filter(method => 
      method.type === PaymentMethodType.FIAT_STRIPE ||
      (method.chainId === chainId && method.enabled)
    );
  }

  private getSimilarMethodsOnNetwork(method: PaymentMethod, chainId: number): PaymentMethod[] {
    return SUPPORTED_PAYMENT_METHODS.filter(m => 
      m.type === method.type && 
      (m.chainId === chainId || m.type === PaymentMethodType.FIAT_STRIPE) &&
      m.enabled
    );
  }

  private estimateGasSavings(fromChainId: number, toChainId: number): number {
    const fromRules = NETWORK_PRIORITIZATION_RULES[fromChainId];
    const toRules = NETWORK_PRIORITIZATION_RULES[toChainId];
    
    if (!fromRules || !toRules) return 0;
    
    const fromMultiplier = fromRules.gasFeeMultiplier;
    const toMultiplier = toRules.gasFeeMultiplier;
    
    if (toMultiplier < fromMultiplier) {
      return Math.round(((fromMultiplier - toMultiplier) / fromMultiplier) * 100);
    }
    
    return 0;
  }

  private estimateTimeImprovement(fromChainId: number, toChainId: number): number {
    const fromConfig = supportedTokensRegistry.getNetworkConfig(fromChainId);
    const toConfig = supportedTokensRegistry.getNetworkConfig(toChainId);
    
    if (!fromConfig || !toConfig) return 0;
    
    if (toConfig.blockTime < fromConfig.blockTime) {
      return Math.round(((fromConfig.blockTime - toConfig.blockTime) / fromConfig.blockTime) * 100);
    }
    
    return 0;
  }

  private assessMigrationComplexity(fromChainId: number, toChainId: number): 'low' | 'medium' | 'high' {
    // Same network family (e.g., Ethereum mainnet to Arbitrum) = low
    // Different families but common bridges = medium  
    // Uncommon networks = high
    
    const ethereumFamily = [1, 42161, 11155111]; // Mainnet, Arbitrum, Sepolia
    const polygonFamily = [137]; // Polygon
    
    const fromInEthereum = ethereumFamily.includes(fromChainId);
    const toInEthereum = ethereumFamily.includes(toChainId);
    const fromInPolygon = polygonFamily.includes(fromChainId);
    const toInPolygon = polygonFamily.includes(toChainId);
    
    if ((fromInEthereum && toInEthereum) || (fromInPolygon && toInPolygon)) {
      return 'low';
    }
    
    if ((fromInEthereum && toInPolygon) || (fromInPolygon && toInEthereum)) {
      return 'medium';
    }
    
    return 'high';
  }

  private estimateBridgeCost(fromChainId: number, toChainId: number): number {
    // Rough estimates for bridging costs in USD
    const bridgeCosts: Record<string, number> = {
      '1-137': 25, // Ethereum to Polygon
      '137-1': 15, // Polygon to Ethereum
      '1-42161': 20, // Ethereum to Arbitrum
      '42161-1': 10, // Arbitrum to Ethereum
      '137-42161': 5, // Polygon to Arbitrum
      '42161-137': 5 // Arbitrum to Polygon
    };
    
    const key = `${fromChainId}-${toChainId}`;
    return bridgeCosts[key] || 30; // Default higher cost for unknown routes
  }

  private calculateMethodRecommendationScore(methodType: PaymentMethodType, chainId: number): number {
    const networkRules = NETWORK_PRIORITIZATION_RULES[chainId];
    if (!networkRules) return 50;
    
    const preferredIndex = networkRules.preferredMethods.indexOf(methodType);
    if (preferredIndex === -1) return 30; // Not preferred
    
    // Higher score for higher preference (lower index)
    return 100 - (preferredIndex * 20);
  }

  private getGasEfficiencyForMethod(methodType: PaymentMethodType, chainId: number): 'low' | 'medium' | 'high' {
    if (methodType === PaymentMethodType.FIAT_STRIPE) return 'high'; // No gas fees
    
    const networkRules = NETWORK_PRIORITIZATION_RULES[chainId];
    if (!networkRules) return 'medium';
    
    if (networkRules.gasFeeMultiplier <= 0.1) return 'high';
    if (networkRules.gasFeeMultiplier <= 0.5) return 'medium';
    return 'low';
  }

  private getLiquidityScoreForMethod(methodType: PaymentMethodType, chainId: number): number {
    // Simplified liquidity scoring
    const scores: Record<PaymentMethodType, Record<number, number>> = {
      [PaymentMethodType.STABLECOIN_USDC]: { 1: 95, 137: 85, 42161: 80, 11155111: 100 },
      [PaymentMethodType.STABLECOIN_USDT]: { 1: 98, 137: 90, 42161: 70, 11155111: 100 },
      [PaymentMethodType.NATIVE_ETH]: { 1: 100, 137: 85, 42161: 95, 11155111: 100 },
      [PaymentMethodType.FIAT_STRIPE]: { 1: 100, 137: 100, 42161: 100, 11155111: 100 }
    };
    
    return scores[methodType]?.[chainId] || 50;
  }

  private getFallbackMethodsForNetwork(chainId: number): PaymentMethodType[] {
    const networkRules = NETWORK_PRIORITIZATION_RULES[chainId];
    if (!networkRules) return [PaymentMethodType.FIAT_STRIPE];
    
    // Return methods not in preferred list as fallbacks
    const allMethods = Object.values(PaymentMethodType);
    return allMethods.filter(method => !networkRules.preferredMethods.includes(method));
  }

  private assessNetworkStatus(chainId: number): 'optimal' | 'good' | 'limited' | 'unavailable' {
    const networkConfig = supportedTokensRegistry.getNetworkConfig(chainId);
    if (!networkConfig) return 'unavailable';
    
    if (networkConfig.status !== 'active') return 'unavailable';
    
    const tokenCount = networkConfig.tokens.length;
    const hasStablecoin = networkConfig.tokens.some(t => t.category === 'stablecoin');
    const hasNative = networkConfig.tokens.some(t => t.category === 'native');
    
    if (tokenCount >= 3 && hasStablecoin && hasNative) return 'optimal';
    if (tokenCount >= 2 && (hasStablecoin || hasNative)) return 'good';
    if (tokenCount >= 1) return 'limited';
    
    return 'unavailable';
  }

  private isCacheValid(): boolean {
    const now = new Date();
    return now.getTime() - this.lastCacheUpdate.getTime() < this.CACHE_TTL;
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.compatibilityCache.clear();
    this.migrationCache.clear();
    this.lastCacheUpdate = new Date(0);
  }
}

// Singleton instance
export const networkCompatibilityChecker = new NetworkCompatibilityChecker();

// Export utility functions
export const validatePaymentMethodSupport = (method: PaymentMethod, chainId: number) =>
  networkCompatibilityChecker.validatePaymentMethodSupport(method, chainId);

export const getNetworkSwitchingSuggestions = (
  method: PaymentMethod,
  currentChainId: number,
  userPreferences?: any
) => networkCompatibilityChecker.getNetworkSwitchingSuggestions(method, currentChainId, userPreferences);

export const getFallbackNetworkRecommendations = (
  preferredMethod: PaymentMethod,
  currentChainId: number,
  transactionAmount?: number
) => networkCompatibilityChecker.getFallbackNetworkRecommendations(preferredMethod, currentChainId, transactionAmount);

export const isPaymentMethodSupportedOnNetwork = (methodType: PaymentMethodType, chainId: number) =>
  networkCompatibilityChecker.isPaymentMethodSupportedOnNetwork(methodType, chainId);

export const getPaymentMethodCompatibilityMatrix = () =>
  networkCompatibilityChecker.getPaymentMethodCompatibilityMatrix();

export default networkCompatibilityChecker;