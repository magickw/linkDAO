/**
 * Supported Tokens Registry
 * Manages network-specific token configurations and availability checking
 */

import { PaymentToken, ChainConfig } from '../types/payment';
import { PaymentMethod, PaymentMethodType } from '../types/paymentPrioritization';
import { SUPPORTED_CHAINS, getAllSupportedTokens, getTokensForChain, getChainConfig } from '../config/payment';
import { SUPPORTED_PAYMENT_METHODS } from '../config/paymentMethodPrioritization';

export interface TokenMetadata {
  token: PaymentToken;
  displayName: string;
  description: string;
  category: 'stablecoin' | 'native' | 'utility';
  riskLevel: 'low' | 'medium' | 'high';
  liquidityScore: number; // 0-100
  popularityScore: number; // 0-100
  gasEfficiency: 'low' | 'medium' | 'high';
  recommendedFor: string[];
  warnings?: string[];
  benefits?: string[];
  lastUpdated: Date;
}

export interface NetworkTokenConfig {
  chainId: number;
  networkName: string;
  tokens: TokenMetadata[];
  nativeToken: TokenMetadata;
  preferredStablecoin?: TokenMetadata;
  gasToken: TokenMetadata;
  averageGasPrice: bigint;
  blockTime: number; // seconds
  confirmationBlocks: number;
  isTestnet: boolean;
  status: 'active' | 'maintenance' | 'deprecated';
}

export interface TokenAvailabilityResult {
  token: PaymentToken;
  available: boolean;
  reason?: string;
  alternativeTokens?: PaymentToken[];
  networkSuggestions?: number[];
}

export class SupportedTokensRegistry {
  private tokenMetadataCache: Map<string, TokenMetadata> = new Map();
  private networkConfigCache: Map<number, NetworkTokenConfig> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeRegistry();
  }

  /**
   * Initialize the registry with default token metadata
   */
  private initializeRegistry(): void {
    this.buildTokenMetadata();
    this.buildNetworkConfigs();
    this.lastCacheUpdate = new Date();
  }

  /**
   * Build comprehensive token metadata
   */
  private buildTokenMetadata(): void {
    const tokenMetadataConfigs: Record<string, Partial<TokenMetadata>> = {
      // USDC configurations
      'USDC-1': {
        category: 'stablecoin',
        riskLevel: 'low',
        liquidityScore: 95,
        popularityScore: 90,
        gasEfficiency: 'medium',
        recommendedFor: ['large_transactions', 'stable_value', 'cross_border'],
        benefits: ['Price stability', 'Wide acceptance', 'Regulatory compliance'],
        warnings: ['Gas fees on Ethereum mainnet can be high']
      },
      'USDC-137': {
        category: 'stablecoin',
        riskLevel: 'low',
        liquidityScore: 85,
        popularityScore: 80,
        gasEfficiency: 'high',
        recommendedFor: ['small_transactions', 'frequent_payments', 'low_cost'],
        benefits: ['Very low gas fees', 'Fast transactions', 'Price stability'],
        warnings: []
      },
      'USDC-42161': {
        category: 'stablecoin',
        riskLevel: 'low',
        liquidityScore: 80,
        popularityScore: 75,
        gasEfficiency: 'high',
        recommendedFor: ['medium_transactions', 'defi_integration', 'fast_settlement'],
        benefits: ['Low gas fees', 'Fast finality', 'Ethereum compatibility'],
        warnings: []
      },
      'USDC-11155111': {
        category: 'stablecoin',
        riskLevel: 'low',
        liquidityScore: 100,
        popularityScore: 100,
        gasEfficiency: 'high',
        recommendedFor: ['testing', 'development'],
        benefits: ['Free testnet tokens', 'No real value risk'],
        warnings: ['Testnet only - no real value']
      },

      // USDT configurations
      'USDT-1': {
        category: 'stablecoin',
        riskLevel: 'low',
        liquidityScore: 98,
        popularityScore: 95,
        gasEfficiency: 'medium',
        recommendedFor: ['large_transactions', 'high_liquidity', 'traditional_users'],
        benefits: ['Highest liquidity', 'Widely accepted', 'Long track record'],
        warnings: ['Higher gas costs than USDC', 'Centralized control']
      },
      'USDT-137': {
        category: 'stablecoin',
        riskLevel: 'low',
        liquidityScore: 90,
        popularityScore: 85,
        gasEfficiency: 'high',
        recommendedFor: ['cost_effective', 'polygon_ecosystem'],
        benefits: ['Low gas fees', 'Good liquidity on Polygon'],
        warnings: []
      },

      // ETH configurations
      'ETH-1': {
        category: 'native',
        riskLevel: 'medium',
        liquidityScore: 100,
        popularityScore: 100,
        gasEfficiency: 'low',
        recommendedFor: ['large_transactions', 'prestige', 'defi_native'],
        benefits: ['Universal acceptance', 'No token approval needed', 'Store of value'],
        warnings: ['Price volatility', 'High gas fees', 'Value fluctuation risk']
      },
      'ETH-42161': {
        category: 'native',
        riskLevel: 'medium',
        liquidityScore: 95,
        popularityScore: 90,
        gasEfficiency: 'high',
        recommendedFor: ['arbitrum_ecosystem', 'cost_effective_eth'],
        benefits: ['Lower gas fees than mainnet', 'Fast transactions', 'Ethereum compatibility'],
        warnings: ['Price volatility', 'Bridge dependency']
      },
      'ETH-11155111': {
        category: 'native',
        riskLevel: 'low',
        liquidityScore: 100,
        popularityScore: 100,
        gasEfficiency: 'high',
        recommendedFor: ['testing', 'development'],
        benefits: ['Free testnet tokens', 'Full Ethereum compatibility'],
        warnings: ['Testnet only - no real value']
      },

      // MATIC configuration
      'MATIC-137': {
        category: 'native',
        riskLevel: 'medium',
        liquidityScore: 85,
        popularityScore: 80,
        gasEfficiency: 'high',
        recommendedFor: ['polygon_native', 'very_low_cost', 'frequent_transactions'],
        benefits: ['Extremely low gas fees', 'Fast transactions', 'Growing ecosystem'],
        warnings: ['Price volatility', 'Less universal acceptance']
      }
    };

    // Build metadata for each supported token
    getAllSupportedTokens().forEach(token => {
      const key = `${token.symbol}-${token.chainId}`;
      const config = tokenMetadataConfigs[key] || {};
      
      const metadata: TokenMetadata = {
        token,
        displayName: `${token.name} (${this.getNetworkName(token.chainId)})`,
        description: this.generateTokenDescription(token, config),
        category: config.category || 'utility',
        riskLevel: config.riskLevel || 'medium',
        liquidityScore: config.liquidityScore || 50,
        popularityScore: config.popularityScore || 50,
        gasEfficiency: config.gasEfficiency || 'medium',
        recommendedFor: config.recommendedFor || [],
        warnings: config.warnings || [],
        benefits: config.benefits || [],
        lastUpdated: new Date()
      };

      this.tokenMetadataCache.set(key, metadata);
    });
  }

  /**
   * Build network-specific configurations
   */
  private buildNetworkConfigs(): void {
    SUPPORTED_CHAINS.forEach(chain => {
      const tokens = chain.supportedTokens.map(token => 
        this.getTokenMetadata(token.symbol, token.chainId)!
      ).filter(Boolean);

      const nativeToken = tokens.find(t => t.token.isNative) || tokens[0];
      const preferredStablecoin = tokens.find(t => 
        t.category === 'stablecoin' && t.token.symbol === 'USDC'
      ) || tokens.find(t => t.category === 'stablecoin');

      const config: NetworkTokenConfig = {
        chainId: chain.chainId,
        networkName: chain.name,
        tokens,
        nativeToken,
        preferredStablecoin,
        gasToken: nativeToken,
        averageGasPrice: this.getAverageGasPrice(chain.chainId),
        blockTime: this.getBlockTime(chain.chainId),
        confirmationBlocks: this.getConfirmationBlocks(chain.chainId),
        isTestnet: this.isTestnet(chain.chainId),
        status: 'active'
      };

      this.networkConfigCache.set(chain.chainId, config);
    });
  }

  /**
   * Get token metadata by symbol and chain ID
   */
  public getTokenMetadata(symbol: string, chainId: number): TokenMetadata | null {
    this.ensureCacheValid();
    const key = `${symbol}-${chainId}`;
    return this.tokenMetadataCache.get(key) || null;
  }

  /**
   * Get all tokens available on a specific network
   */
  public getTokensForNetwork(chainId: number): TokenMetadata[] {
    this.ensureCacheValid();
    const config = this.networkConfigCache.get(chainId);
    return config?.tokens || [];
  }

  /**
   * Get network configuration
   */
  public getNetworkConfig(chainId: number): NetworkTokenConfig | null {
    this.ensureCacheValid();
    return this.networkConfigCache.get(chainId) || null;
  }

  /**
   * Check if a token is available on a specific network
   */
  public isTokenAvailable(token: PaymentToken, chainId: number): TokenAvailabilityResult {
    const networkConfig = this.getNetworkConfig(chainId);
    
    if (!networkConfig) {
      return {
        token,
        available: false,
        reason: 'Network not supported',
        networkSuggestions: this.getSupportedNetworks()
      };
    }

    if (networkConfig.status !== 'active') {
      return {
        token,
        available: false,
        reason: `Network is currently in ${networkConfig.status} mode`,
        alternativeTokens: this.getAlternativeTokens(token, chainId)
      };
    }

    const tokenExists = networkConfig.tokens.some(t => 
      t.token.address.toLowerCase() === token.address.toLowerCase() &&
      t.token.symbol === token.symbol
    );

    if (!tokenExists) {
      return {
        token,
        available: false,
        reason: 'Token not supported on this network',
        alternativeTokens: this.getAlternativeTokens(token, chainId),
        networkSuggestions: this.getNetworksForToken(token)
      };
    }

    return {
      token,
      available: true
    };
  }

  /**
   * Get all supported networks
   */
  public getSupportedNetworks(): number[] {
    return Array.from(this.networkConfigCache.keys());
  }

  /**
   * Get networks that support a specific token
   */
  public getNetworksForToken(token: PaymentToken): number[] {
    const networks: number[] = [];
    
    this.networkConfigCache.forEach((config, chainId) => {
      const hasToken = config.tokens.some(t => 
        t.token.symbol === token.symbol &&
        (token.isNative || t.token.address.toLowerCase() === token.address.toLowerCase())
      );
      
      if (hasToken) {
        networks.push(chainId);
      }
    });
    
    return networks;
  }

  /**
   * Get alternative tokens for a given token on a specific network
   */
  public getAlternativeTokens(token: PaymentToken, chainId: number): PaymentToken[] {
    const networkConfig = this.getNetworkConfig(chainId);
    if (!networkConfig) return [];

    // If looking for stablecoin, return other stablecoins
    if (token.symbol === 'USDC' || token.symbol === 'USDT') {
      return networkConfig.tokens
        .filter(t => t.category === 'stablecoin' && t.token.symbol !== token.symbol)
        .map(t => t.token);
    }

    // If looking for native token, return stablecoins as alternatives
    if (token.isNative) {
      return networkConfig.tokens
        .filter(t => t.category === 'stablecoin')
        .map(t => t.token);
    }

    // Default: return preferred stablecoin and native token
    const alternatives: PaymentToken[] = [];
    if (networkConfig.preferredStablecoin) {
      alternatives.push(networkConfig.preferredStablecoin.token);
    }
    alternatives.push(networkConfig.nativeToken.token);
    
    return alternatives.filter(t => 
      t.symbol !== token.symbol && 
      t.address.toLowerCase() !== token.address.toLowerCase()
    );
  }

  /**
   * Get recommended tokens for a specific use case
   */
  public getRecommendedTokens(
    chainId: number, 
    useCase: string,
    maxResults: number = 3
  ): TokenMetadata[] {
    const networkConfig = this.getNetworkConfig(chainId);
    if (!networkConfig) return [];

    return networkConfig.tokens
      .filter(token => token.recommendedFor.includes(useCase))
      .sort((a, b) => {
        // Sort by popularity and liquidity scores
        const scoreA = (a.popularityScore + a.liquidityScore) / 2;
        const scoreB = (b.popularityScore + b.liquidityScore) / 2;
        return scoreB - scoreA;
      })
      .slice(0, maxResults);
  }

  /**
   * Get tokens by category
   */
  public getTokensByCategory(
    chainId: number, 
    category: 'stablecoin' | 'native' | 'utility'
  ): TokenMetadata[] {
    const networkConfig = this.getNetworkConfig(chainId);
    if (!networkConfig) return [];

    return networkConfig.tokens.filter(token => token.category === category);
  }

  /**
   * Search tokens by name or symbol
   */
  public searchTokens(query: string, chainId?: number): TokenMetadata[] {
    const searchTerm = query.toLowerCase();
    const allTokens = chainId 
      ? this.getTokensForNetwork(chainId)
      : Array.from(this.tokenMetadataCache.values());

    return allTokens.filter(token => 
      token.token.symbol.toLowerCase().includes(searchTerm) ||
      token.token.name.toLowerCase().includes(searchTerm) ||
      token.displayName.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get token compatibility matrix
   */
  public getTokenCompatibilityMatrix(): Record<number, string[]> {
    const matrix: Record<number, string[]> = {};
    
    this.networkConfigCache.forEach((config, chainId) => {
      matrix[chainId] = config.tokens.map(t => t.token.symbol);
    });
    
    return matrix;
  }

  /**
   * Refresh registry data
   */
  public async refreshRegistry(): Promise<void> {
    this.tokenMetadataCache.clear();
    this.networkConfigCache.clear();
    this.initializeRegistry();
  }

  // Private helper methods

  private ensureCacheValid(): void {
    const now = new Date();
    if (now.getTime() - this.lastCacheUpdate.getTime() > this.CACHE_TTL) {
      this.initializeRegistry();
    }
  }

  private generateTokenDescription(token: PaymentToken, config: Partial<TokenMetadata>): string {
    const networkName = this.getNetworkName(token.chainId);
    const category = config.category || 'token';
    
    if (token.isNative) {
      return `Native ${category} of ${networkName} network. Used for gas fees and transactions.`;
    }
    
    if (category === 'stablecoin') {
      return `USD-pegged stablecoin on ${networkName}. Provides price stability for payments.`;
    }
    
    return `${token.name} token on ${networkName} network.`;
  }

  private getNetworkName(chainId: number): string {
    const config = getChainConfig(chainId);
    return config?.name || `Chain ${chainId}`;
  }

  private getAverageGasPrice(chainId: number): bigint {
    // Default gas prices in wei (these would be updated from real data)
    const gasPrices: Record<number, bigint> = {
      1: BigInt('20000000000'), // 20 gwei for Ethereum
      137: BigInt('30000000000'), // 30 gwei for Polygon
      42161: BigInt('100000000'), // 0.1 gwei for Arbitrum
      11155111: BigInt('1000000000') // 1 gwei for Sepolia
    };
    
    return gasPrices[chainId] || BigInt('20000000000');
  }

  private getBlockTime(chainId: number): number {
    const blockTimes: Record<number, number> = {
      1: 12, // Ethereum
      137: 2, // Polygon
      42161: 1, // Arbitrum
      11155111: 12 // Sepolia
    };
    
    return blockTimes[chainId] || 12;
  }

  private getConfirmationBlocks(chainId: number): number {
    const confirmations: Record<number, number> = {
      1: 12, // Ethereum
      137: 20, // Polygon
      42161: 1, // Arbitrum
      11155111: 3 // Sepolia
    };
    
    return confirmations[chainId] || 12;
  }

  private isTestnet(chainId: number): boolean {
    const testnets = [11155111]; // Sepolia
    return testnets.includes(chainId);
  }
}

// Singleton instance
export const supportedTokensRegistry = new SupportedTokensRegistry();

// Export utility functions
export const getTokenMetadata = (symbol: string, chainId: number) => 
  supportedTokensRegistry.getTokenMetadata(symbol, chainId);

export const getTokensForNetwork = (chainId: number) => 
  supportedTokensRegistry.getTokensForNetwork(chainId);

export const isTokenAvailable = (token: PaymentToken, chainId: number) => 
  supportedTokensRegistry.isTokenAvailable(token, chainId);

export const getNetworkConfig = (chainId: number) => 
  supportedTokensRegistry.getNetworkConfig(chainId);

export const getSupportedNetworks = () => 
  supportedTokensRegistry.getSupportedNetworks();

export const getNetworksForToken = (token: PaymentToken) => 
  supportedTokensRegistry.getNetworksForToken(token);

export const getRecommendedTokens = (chainId: number, useCase: string, maxResults?: number) => 
  supportedTokensRegistry.getRecommendedTokens(chainId, useCase, maxResults);

export const searchTokens = (query: string, chainId?: number) => 
  supportedTokensRegistry.searchTokens(query, chainId);

export default supportedTokensRegistry;