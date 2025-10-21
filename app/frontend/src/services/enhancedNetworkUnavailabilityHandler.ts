import { PaymentMethod, PaymentMethodType } from '../types/paymentPrioritization';

export interface EnhancedNetworkHandlingResult {
  action: 'suggest_network_switch' | 'suggest_alternatives' | 'show_fiat_option' | 'show_error' | 'auto_fallback';
  targetNetwork?: number;
  targetNetworkName?: string;
  alternatives?: PaymentMethod[];
  migrationInstructions?: string;
  userMessage: string;
  canRetry: boolean;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
  estimatedSwitchTime?: number; // seconds
  fallbackStrategy?: 'immediate' | 'delayed' | 'manual';
  networkHealth?: NetworkHealthStatus;
}

export interface NetworkHealthStatus {
  isOnline: boolean;
  latency: number; // ms
  blockHeight: number;
  lastUpdate: number;
  congestionLevel: 'low' | 'medium' | 'high';
}

export interface EnhancedNetworkInfo {
  chainId: number;
  name: string;
  displayName: string;
  rpcUrl: string;
  backupRpcUrls: string[];
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  averageBlockTime: number; // seconds
  averageGasFee: number; // USD
  isTestnet: boolean;
  isLayer2: boolean;
  parentChain?: number;
  bridgeUrls?: string[];
  faucetUrl?: string;
}

export class EnhancedNetworkUnavailabilityHandler {
  private supportedNetworks: Map<number, EnhancedNetworkInfo>;
  private paymentMethodNetworks: Map<PaymentMethodType, number[]>;
  private networkHealthCache: Map<number, NetworkHealthStatus>;
  private retryAttempts: Map<string, number>;
  private maxRetryAttempts = 3;

  constructor() {
    this.supportedNetworks = new Map([
      [1, {
        chainId: 1,
        name: 'ethereum',
        displayName: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/',
        backupRpcUrls: [
          'https://eth-mainnet.alchemyapi.io/v2/',
          'https://cloudflare-eth.com',
          'https://ethereum.publicnode.com'
        ],
        blockExplorerUrl: 'https://etherscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        averageBlockTime: 12,
        averageGasFee: 25,
        isTestnet: false,
        isLayer2: false
      }],
      [137, {
        chainId: 137,
        name: 'polygon',
        displayName: 'Polygon',
        rpcUrl: 'https://polygon-rpc.com',
        backupRpcUrls: [
          'https://rpc-mainnet.maticvigil.com',
          'https://polygon-mainnet.infura.io/v3/',
          'https://polygon.llamarpc.com'
        ],
        blockExplorerUrl: 'https://polygonscan.com',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        averageBlockTime: 2,
        averageGasFee: 0.01,
        isTestnet: false,
        isLayer2: true,
        parentChain: 1,
        bridgeUrls: ['https://wallet.polygon.technology/bridge']
      }],
      [56, {
        chainId: 56,
        name: 'bsc',
        displayName: 'BNB Smart Chain',
        rpcUrl: 'https://bsc-dataseed.binance.org',
        backupRpcUrls: [
          'https://bsc-dataseed1.defibit.io',
          'https://bsc-dataseed1.ninicoin.io',
          'https://bsc.publicnode.com'
        ],
        blockExplorerUrl: 'https://bscscan.com',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        averageBlockTime: 3,
        averageGasFee: 0.20,
        isTestnet: false,
        isLayer2: false
      }],
      [42161, {
        chainId: 42161,
        name: 'arbitrum',
        displayName: 'Arbitrum One',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        backupRpcUrls: [
          'https://arbitrum-mainnet.infura.io/v3/',
          'https://arb-mainnet.g.alchemy.com/v2/',
          'https://arbitrum.publicnode.com'
        ],
        blockExplorerUrl: 'https://arbiscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        averageBlockTime: 1,
        averageGasFee: 0.50,
        isTestnet: false,
        isLayer2: true,
        parentChain: 1,
        bridgeUrls: ['https://bridge.arbitrum.io']
      }],
      [10, {
        chainId: 10,
        name: 'optimism',
        displayName: 'Optimism',
        rpcUrl: 'https://mainnet.optimism.io',
        backupRpcUrls: [
          'https://optimism-mainnet.infura.io/v3/',
          'https://opt-mainnet.g.alchemy.com/v2/',
          'https://optimism.publicnode.com'
        ],
        blockExplorerUrl: 'https://optimistic.etherscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        averageBlockTime: 2,
        averageGasFee: 0.30,
        isTestnet: false,
        isLayer2: true,
        parentChain: 1,
        bridgeUrls: ['https://app.optimism.io/bridge']
      }]
    ]);

    this.paymentMethodNetworks = new Map([
      [PaymentMethodType.STABLECOIN_USDC, [1, 137, 56, 42161, 10]], // USDC available on multiple networks
      [PaymentMethodType.STABLECOIN_USDT, [1, 137, 56]], // USDT available on fewer networks
      [PaymentMethodType.NATIVE_ETH, [1, 42161, 10]], // ETH on Ethereum and L2s
      [PaymentMethodType.FIAT_STRIPE, []] // Fiat doesn't depend on network
    ]);

    this.networkHealthCache = new Map();
    this.retryAttempts = new Map();
  }

  /**
   * Enhanced network unavailability handling with health checks and smart fallbacks
   */
  async handleUnsupportedNetwork(
    preferredMethod: PaymentMethod,
    currentNetwork: number,
    availableAlternatives: PaymentMethod[]
  ): Promise<EnhancedNetworkHandlingResult> {
    const retryKey = `${preferredMethod.id}-${currentNetwork}`;
    const attempts = this.retryAttempts.get(retryKey) || 0;

    // Check network health first
    const networkHealth = await this.checkNetworkHealth(currentNetwork);
    
    // If network is unhealthy, suggest immediate fallback
    if (!networkHealth.isOnline && attempts < this.maxRetryAttempts) {
      return this.handleNetworkConnectionIssue(preferredMethod, currentNetwork, availableAlternatives, attempts);
    }

    const supportedNetworks = this.getSupportedNetworks(preferredMethod.type);
    
    // If method doesn't require a network (like fiat), handle gracefully
    if (supportedNetworks.length === 0) {
      return this.handleMethodUnavailable(preferredMethod, availableAlternatives);
    }

    // Find the best network to switch to
    const bestNetwork = await this.findOptimalNetworkForMethod(preferredMethod.type, currentNetwork);
    
    if (bestNetwork) {
      return this.suggestEnhancedNetworkSwitch(preferredMethod, bestNetwork, currentNetwork, networkHealth);
    }

    // If no good network switch option, suggest alternatives with smart prioritization
    return this.suggestSmartAlternativePaymentMethods(preferredMethod, currentNetwork, availableAlternatives, networkHealth);
  }

  /**
   * Handle network connection issues with progressive fallback
   */
  private async handleNetworkConnectionIssue(
    method: PaymentMethod,
    currentNetwork: number,
    availableAlternatives: PaymentMethod[],
    attempts: number
  ): Promise<EnhancedNetworkHandlingResult> {
    const retryKey = `${method.id}-${currentNetwork}`;
    this.retryAttempts.set(retryKey, attempts + 1);

    const networkInfo = this.supportedNetworks.get(currentNetwork);
    const fiatAlternative = availableAlternatives.find(alt => alt.type === PaymentMethodType.FIAT_STRIPE);

    // Progressive fallback strategy
    if (attempts === 0) {
      // First attempt: suggest retry with backup RPC
      return {
        action: 'show_error',
        userMessage: `Connection issues detected with ${networkInfo?.displayName || 'current network'}. Trying backup connection...`,
        canRetry: true,
        severity: 'low',
        recommendations: ['Check your internet connection', 'Try refreshing the page'],
        estimatedSwitchTime: 10,
        fallbackStrategy: 'immediate',
        networkHealth: await this.checkNetworkHealth(currentNetwork)
      };
    } else if (attempts === 1 && fiatAlternative) {
      // Second attempt: suggest fiat as immediate fallback
      return {
        action: 'auto_fallback',
        alternatives: [fiatAlternative],
        userMessage: `Network issues persist with ${networkInfo?.displayName || 'current network'}. Automatically switching to fiat payment for reliability.`,
        canRetry: true,
        severity: 'medium',
        recommendations: [
          'Fiat payment bypasses network issues',
          'No gas fees or network delays',
          'Instant confirmation'
        ],
        fallbackStrategy: 'immediate',
        networkHealth: await this.checkNetworkHealth(currentNetwork)
      };
    } else {
      // Final attempt: show error with all options
      return {
        action: 'show_error',
        alternatives: availableAlternatives,
        userMessage: `Unable to connect to ${networkInfo?.displayName || 'current network'} after multiple attempts. Please try alternative payment methods.`,
        canRetry: false,
        severity: 'high',
        recommendations: [
          'Check your wallet connection',
          'Try switching to a different network',
          'Use fiat payment to avoid network issues'
        ],
        networkHealth: await this.checkNetworkHealth(currentNetwork)
      };
    }
  }

  /**
   * Handle method unavailable scenarios
   */
  private async handleMethodUnavailable(
    method: PaymentMethod,
    availableAlternatives: PaymentMethod[]
  ): Promise<EnhancedNetworkHandlingResult> {
    const fiatAlternative = availableAlternatives.find(alt => alt.type === PaymentMethodType.FIAT_STRIPE);

    if (fiatAlternative) {
      return {
        action: 'show_fiat_option',
        alternatives: [fiatAlternative],
        userMessage: `${method.name} is temporarily unavailable. You can use fiat payment instead.`,
        canRetry: true,
        severity: 'low',
        recommendations: [
          'Fiat payment is always available',
          'No network dependencies',
          'Instant processing'
        ],
        fallbackStrategy: 'immediate'
      };
    }

    return {
      action: 'show_error',
      userMessage: `${method.name} is currently unavailable. Please try again later.`,
      canRetry: true,
      severity: 'medium',
      recommendations: [
        'Try again in a few minutes',
        'Check service status updates'
      ]
    };
  }

  /**
   * Enhanced network switch suggestion with health and cost analysis
   */
  private async suggestEnhancedNetworkSwitch(
    method: PaymentMethod,
    targetNetwork: EnhancedNetworkInfo,
    currentNetwork: number,
    currentNetworkHealth: NetworkHealthStatus
  ): Promise<EnhancedNetworkHandlingResult> {
    const currentNetworkInfo = this.supportedNetworks.get(currentNetwork);
    const targetNetworkHealth = await this.checkNetworkHealth(targetNetwork.chainId);
    
    const migrationInstructions = this.generateEnhancedMigrationInstructions(
      currentNetworkInfo, 
      targetNetwork,
      targetNetworkHealth
    );

    const recommendations = this.generateNetworkSwitchRecommendations(
      currentNetworkInfo,
      targetNetwork,
      currentNetworkHealth,
      targetNetworkHealth
    );

    const severity = this.assessSwitchSeverity(currentNetworkHealth, targetNetworkHealth);

    return {
      action: 'suggest_network_switch',
      targetNetwork: targetNetwork.chainId,
      targetNetworkName: targetNetwork.displayName,
      migrationInstructions,
      userMessage: this.generateNetworkSwitchMessage(method, currentNetworkInfo, targetNetwork, targetNetworkHealth),
      canRetry: true,
      severity,
      recommendations,
      estimatedSwitchTime: this.estimateNetworkSwitchTime(targetNetwork),
      fallbackStrategy: severity === 'high' ? 'immediate' : 'manual',
      networkHealth: targetNetworkHealth
    };
  }

  /**
   * Smart alternative payment method suggestions with cost-benefit analysis
   */
  private async suggestSmartAlternativePaymentMethods(
    preferredMethod: PaymentMethod,
    currentNetwork: number,
    availableAlternatives: PaymentMethod[],
    networkHealth: NetworkHealthStatus
  ): Promise<EnhancedNetworkHandlingResult> {
    const currentNetworkInfo = this.supportedNetworks.get(currentNetwork);
    
    // Analyze alternatives with network compatibility and cost
    const analyzedAlternatives = await this.analyzeAlternatives(
      availableAlternatives,
      currentNetwork,
      networkHealth
    );

    const compatibleAlternatives = analyzedAlternatives.filter(alt => alt.isCompatible);
    
    // Always prioritize fiat if network issues exist
    if (networkHealth.congestionLevel === 'high' || !networkHealth.isOnline) {
      const fiatAlternative = compatibleAlternatives.find(alt => alt.method.type === PaymentMethodType.FIAT_STRIPE);
      if (fiatAlternative) {
        return {
          action: 'show_fiat_option',
          alternatives: [fiatAlternative.method],
          userMessage: `${preferredMethod.name} is not available on ${currentNetworkInfo?.displayName || 'current network'} and network conditions are poor. Fiat payment is recommended for reliability.`,
          canRetry: false,
          severity: 'medium',
          recommendations: [
            'Fiat payment bypasses network congestion',
            'No gas fees during high congestion',
            'Guaranteed fast processing'
          ],
          fallbackStrategy: 'immediate',
          networkHealth
        };
      }
    }

    if (compatibleAlternatives.length === 0) {
      return {
        action: 'show_error',
        userMessage: `No payment methods are available on ${currentNetworkInfo?.displayName || 'current network'}. Please switch networks or try again later.`,
        canRetry: true,
        severity: 'high',
        recommendations: [
          'Switch to a supported network',
          'Wait for network conditions to improve',
          'Contact support if issues persist'
        ],
        networkHealth
      };
    }

    // Sort alternatives by score (cost, reliability, speed)
    const sortedAlternatives = compatibleAlternatives
      .sort((a, b) => b.score - a.score)
      .map(alt => alt.method);

    return {
      action: 'suggest_alternatives',
      alternatives: sortedAlternatives,
      userMessage: `${preferredMethod.name} is not available on ${currentNetworkInfo?.displayName || 'current network'}. Here are the best alternative payment methods:`,
      canRetry: false,
      severity: 'low',
      recommendations: this.generateAlternativeRecommendations(sortedAlternatives, networkHealth),
      networkHealth
    };
  }

  /**
   * Check network health with comprehensive metrics
   */
  private async checkNetworkHealth(chainId: number): Promise<NetworkHealthStatus> {
    const cached = this.networkHealthCache.get(chainId);
    
    // Use cached result if recent (within 2 minutes)
    if (cached && Date.now() - cached.lastUpdate < 2 * 60 * 1000) {
      return cached;
    }

    const networkInfo = this.supportedNetworks.get(chainId);
    if (!networkInfo) {
      return {
        isOnline: false,
        latency: 0,
        blockHeight: 0,
        lastUpdate: Date.now(),
        congestionLevel: 'high'
      };
    }

    try {
      const startTime = Date.now();
      
      // Simulate network health check (in real implementation, this would make actual RPC calls)
      const mockLatency = Math.random() * 1000 + 100; // 100-1100ms
      const mockBlockHeight = Math.floor(Math.random() * 1000000) + 18000000;
      const mockCongestion = mockLatency > 800 ? 'high' : mockLatency > 400 ? 'medium' : 'low';

      const health: NetworkHealthStatus = {
        isOnline: mockLatency < 5000, // Consider offline if > 5s latency
        latency: mockLatency,
        blockHeight: mockBlockHeight,
        lastUpdate: Date.now(),
        congestionLevel: mockCongestion
      };

      this.networkHealthCache.set(chainId, health);
      return health;
    } catch (error) {
      const health: NetworkHealthStatus = {
        isOnline: false,
        latency: 0,
        blockHeight: 0,
        lastUpdate: Date.now(),
        congestionLevel: 'high'
      };

      this.networkHealthCache.set(chainId, health);
      return health;
    }
  }

  /**
   * Find optimal network for a payment method considering health and costs
   */
  private async findOptimalNetworkForMethod(
    methodType: PaymentMethodType,
    currentNetwork: number
  ): Promise<EnhancedNetworkInfo | null> {
    const supportedNetworks = this.getSupportedNetworks(methodType);
    
    if (supportedNetworks.length === 0) {
      return null;
    }

    // Score networks based on health, cost, and speed
    const networkScores: Array<{ network: EnhancedNetworkInfo; score: number }> = [];

    for (const chainId of supportedNetworks) {
      if (chainId === currentNetwork) continue;

      const networkInfo = this.supportedNetworks.get(chainId);
      if (!networkInfo) continue;

      const health = await this.checkNetworkHealth(chainId);
      const score = this.calculateNetworkScore(networkInfo, health);

      networkScores.push({ network: networkInfo, score });
    }

    // Sort by score (highest first)
    networkScores.sort((a, b) => b.score - a.score);

    return networkScores.length > 0 ? networkScores[0].network : null;
  }

  /**
   * Calculate network score based on multiple factors
   */
  private calculateNetworkScore(network: EnhancedNetworkInfo, health: NetworkHealthStatus): number {
    let score = 0;

    // Health score (40% weight)
    if (health.isOnline) score += 40;
    if (health.latency < 500) score += 20;
    else if (health.latency < 1000) score += 10;

    if (health.congestionLevel === 'low') score += 20;
    else if (health.congestionLevel === 'medium') score += 10;

    // Cost score (30% weight)
    if (network.averageGasFee < 1) score += 30;
    else if (network.averageGasFee < 5) score += 20;
    else if (network.averageGasFee < 20) score += 10;

    // Speed score (20% weight)
    if (network.averageBlockTime < 5) score += 20;
    else if (network.averageBlockTime < 15) score += 15;
    else if (network.averageBlockTime < 30) score += 10;

    // Layer 2 bonus (10% weight)
    if (network.isLayer2) score += 10;

    return score;
  }

  /**
   * Analyze alternatives with compatibility and scoring
   */
  private async analyzeAlternatives(
    alternatives: PaymentMethod[],
    currentNetwork: number,
    networkHealth: NetworkHealthStatus
  ): Promise<Array<{ method: PaymentMethod; isCompatible: boolean; score: number }>> {
    const analyzed = [];

    for (const method of alternatives) {
      const isCompatible = this.isMethodSupportedOnNetwork(method.type, currentNetwork);
      let score = 0;

      if (isCompatible) {
        // Base compatibility score
        score += 50;

        // Method-specific scoring
        switch (method.type) {
          case PaymentMethodType.FIAT_STRIPE:
            score += 30; // Always reliable
            if (networkHealth.congestionLevel === 'high') score += 20; // Bonus during congestion
            break;
          case PaymentMethodType.STABLECOIN_USDC:
            score += 25; // Good stability
            if (networkHealth.congestionLevel === 'low') score += 15; // Bonus for low congestion
            break;
          case PaymentMethodType.STABLECOIN_USDT:
            score += 20; // Decent option
            break;
          case PaymentMethodType.NATIVE_ETH:
            score += 10; // Lower priority due to volatility
            if (networkHealth.congestionLevel === 'high') score -= 10; // Penalty for congestion
            break;
        }

        // Network health impact
        if (networkHealth.isOnline) score += 10;
        if (networkHealth.latency < 500) score += 5;
      }

      analyzed.push({ method, isCompatible, score });
    }

    return analyzed;
  }

  /**
   * Generate enhanced migration instructions with health considerations
   */
  private generateEnhancedMigrationInstructions(
    currentNetwork: EnhancedNetworkInfo | undefined,
    targetNetwork: EnhancedNetworkInfo,
    targetHealth: NetworkHealthStatus
  ): string {
    const baseInstructions = this.generateBasicMigrationInstructions(currentNetwork, targetNetwork);
    
    let healthWarnings = '';
    if (!targetHealth.isOnline) {
      healthWarnings += '\n⚠️ Target network appears to be experiencing issues. You may want to wait before switching.';
    } else if (targetHealth.congestionLevel === 'high') {
      healthWarnings += '\n⚠️ Target network is congested. Transactions may be slower and more expensive.';
    } else if (targetHealth.latency > 1000) {
      healthWarnings += '\n⚠️ Target network has high latency. Allow extra time for transactions.';
    }

    let bridgeInstructions = '';
    if (targetNetwork.bridgeUrls && targetNetwork.bridgeUrls.length > 0) {
      bridgeInstructions += `\n\n🌉 Bridge Assets (if needed):
If you need to move assets to ${targetNetwork.displayName}:
1. Visit: ${targetNetwork.bridgeUrls[0]}
2. Connect your wallet
3. Select assets to bridge
4. Confirm the bridge transaction
5. Wait for confirmation (usually 5-20 minutes)`;
    }

    return baseInstructions + healthWarnings + bridgeInstructions;
  }

  /**
   * Generate basic migration instructions
   */
  private generateBasicMigrationInstructions(
    currentNetwork: EnhancedNetworkInfo | undefined,
    targetNetwork: EnhancedNetworkInfo
  ): string {
    if (!currentNetwork) {
      return `Please connect to ${targetNetwork.displayName} in your wallet to use this payment method.`;
    }

    return `To switch from ${currentNetwork.displayName} to ${targetNetwork.displayName}:

📱 Automatic Switch (Recommended):
1. Click "Switch Network" button above
2. Approve the network switch in your wallet
3. Wait for confirmation

🔧 Manual Setup:
1. Open your wallet (MetaMask, WalletConnect, etc.)
2. Click on the network selector
3. Select "Add Network" or "Custom RPC"
4. Enter the following details:
   - Network Name: ${targetNetwork.displayName}
   - RPC URL: ${targetNetwork.rpcUrl}
   - Chain ID: ${targetNetwork.chainId}
   - Currency Symbol: ${targetNetwork.nativeCurrency.symbol}
   - Block Explorer: ${targetNetwork.blockExplorerUrl}
5. Save and switch to the new network`;
  }

  /**
   * Generate network switch recommendations
   */
  private generateNetworkSwitchRecommendations(
    currentNetwork: EnhancedNetworkInfo | undefined,
    targetNetwork: EnhancedNetworkInfo,
    currentHealth: NetworkHealthStatus,
    targetHealth: NetworkHealthStatus
  ): string[] {
    const recommendations: string[] = [];

    if (targetNetwork.averageGasFee < (currentNetwork?.averageGasFee || 25)) {
      const savings = ((currentNetwork?.averageGasFee || 25) - targetNetwork.averageGasFee);
      recommendations.push(`Save ~$${savings.toFixed(2)} on average gas fees`);
    }

    if (targetNetwork.averageBlockTime < (currentNetwork?.averageBlockTime || 12)) {
      recommendations.push(`Faster transactions (~${targetNetwork.averageBlockTime}s vs ${currentNetwork?.averageBlockTime || 12}s)`);
    }

    if (targetHealth.congestionLevel === 'low' && currentHealth.congestionLevel !== 'low') {
      recommendations.push('Lower network congestion for reliable transactions');
    }

    if (targetNetwork.isLayer2 && !currentNetwork?.isLayer2) {
      recommendations.push('Layer 2 benefits: lower fees and faster confirmations');
    }

    if (targetNetwork.bridgeUrls && targetNetwork.bridgeUrls.length > 0) {
      recommendations.push('Easy asset bridging available if needed');
    }

    return recommendations;
  }

  /**
   * Generate alternative recommendations
   */
  private generateAlternativeRecommendations(
    alternatives: PaymentMethod[],
    networkHealth: NetworkHealthStatus
  ): string[] {
    const recommendations: string[] = [];

    const hasFiat = alternatives.some(alt => alt.type === PaymentMethodType.FIAT_STRIPE);
    const hasStablecoin = alternatives.some(alt => 
      alt.type === PaymentMethodType.STABLECOIN_USDC || alt.type === PaymentMethodType.STABLECOIN_USDT
    );

    if (hasFiat) {
      recommendations.push('Fiat payment: No gas fees, instant confirmation');
    }

    if (hasStablecoin && networkHealth.congestionLevel === 'low') {
      recommendations.push('Stablecoins: Lower gas fees than ETH, stable value');
    }

    if (networkHealth.congestionLevel === 'high') {
      recommendations.push('Consider waiting for lower network congestion');
    }

    if (networkHealth.latency > 1000) {
      recommendations.push('Network latency is high - allow extra time for transactions');
    }

    return recommendations;
  }

  /**
   * Assess switch severity
   */
  private assessSwitchSeverity(
    currentHealth: NetworkHealthStatus,
    targetHealth: NetworkHealthStatus
  ): 'low' | 'medium' | 'high' {
    if (!currentHealth.isOnline || !targetHealth.isOnline) {
      return 'high';
    }

    if (currentHealth.congestionLevel === 'high' || targetHealth.congestionLevel === 'high') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate network switch message
   */
  private generateNetworkSwitchMessage(
    method: PaymentMethod,
    currentNetwork: EnhancedNetworkInfo | undefined,
    targetNetwork: EnhancedNetworkInfo,
    targetHealth: NetworkHealthStatus
  ): string {
    const currentName = currentNetwork?.displayName || 'current network';
    const healthStatus = targetHealth.isOnline ? 
      (targetHealth.congestionLevel === 'low' ? ' (optimal conditions)' : 
       targetHealth.congestionLevel === 'medium' ? ' (moderate congestion)' : 
       ' (high congestion)') : ' (connection issues)';

    return `${method.name} is not available on ${currentName}. Switch to ${targetNetwork.displayName}${healthStatus} to use this payment method with average gas fees of $${targetNetwork.averageGasFee.toFixed(2)}.`;
  }

  /**
   * Estimate network switch time
   */
  private estimateNetworkSwitchTime(network: EnhancedNetworkInfo): number {
    // Base time for network switch
    let time = 10; // 10 seconds base

    // Add time for L2 networks (bridge considerations)
    if (network.isLayer2) {
      time += 5;
    }

    // Add time for less common networks
    if (![1, 137, 56].includes(network.chainId)) {
      time += 10;
    }

    return time;
  }

  /**
   * Get supported networks for a payment method type
   */
  private getSupportedNetworks(methodType: PaymentMethodType): number[] {
    return this.paymentMethodNetworks.get(methodType) || [];
  }

  /**
   * Check if a payment method is supported on a specific network
   */
  private isMethodSupportedOnNetwork(methodType: PaymentMethodType, chainId: number): boolean {
    const supportedNetworks = this.getSupportedNetworks(methodType);
    return supportedNetworks.includes(chainId) || methodType === PaymentMethodType.FIAT_STRIPE;
  }

  /**
   * Clear retry attempts for a specific method/network combination
   */
  clearRetryAttempts(methodId: string, networkId: number): void {
    const retryKey = `${methodId}-${networkId}`;
    this.retryAttempts.delete(retryKey);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.networkHealthCache.clear();
    this.retryAttempts.clear();
  }

  /**
   * Get network information by chain ID
   */
  getNetworkInfo(chainId: number): EnhancedNetworkInfo | undefined {
    return this.supportedNetworks.get(chainId);
  }

  /**
   * Get all supported networks
   */
  getAllSupportedNetworks(): EnhancedNetworkInfo[] {
    return Array.from(this.supportedNetworks.values());
  }
}

// Export singleton instance
export const enhancedNetworkUnavailabilityHandler = new EnhancedNetworkUnavailabilityHandler();