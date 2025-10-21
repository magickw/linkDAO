/**
 * Network Availability Checker
 * Validates payment method availability across different networks
 */

import {
  PaymentMethod,
  PaymentMethodType
} from '../types/paymentPrioritization';
import { INetworkAvailabilityChecker } from './paymentMethodPrioritizationService';
import { SUPPORTED_PAYMENT_METHODS } from '../config/paymentMethodPrioritization';

export class NetworkAvailabilityChecker implements INetworkAvailabilityChecker {
  private supportedMethods: PaymentMethod[];

  constructor(supportedMethods?: PaymentMethod[]) {
    this.supportedMethods = supportedMethods || SUPPORTED_PAYMENT_METHODS;
  }

  async getAvailablePaymentMethods(chainId: number): Promise<PaymentMethod[]> {
    return this.supportedMethods.filter(method => 
      this.isPaymentMethodSupported(method, chainId)
    );
  }

  isPaymentMethodSupported(method: PaymentMethod, chainId: number): boolean {
    // Fiat payments are available on all networks
    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      return true;
    }

    // Check if method has specific chain requirement
    if (method.chainId && method.chainId !== chainId) {
      return false;
    }

    // Check if method supports the network
    if (method.supportedNetworks.length > 0) {
      return method.supportedNetworks.includes(chainId);
    }

    // If no specific network requirements, assume supported
    return true;
  }

  getSupportedNetworks(method: PaymentMethod): number[] {
    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      // Fiat is available on all networks
      return [1, 137, 42161, 11155111]; // Mainnet, Polygon, Arbitrum, Sepolia
    }

    return method.supportedNetworks;
  }

  async validateNetworkCompatibility(
    methods: PaymentMethod[],
    chainId: number
  ): Promise<{ method: PaymentMethod; isSupported: boolean; alternativeNetworks?: number[] }[]> {
    return methods.map(method => {
      const isSupported = this.isPaymentMethodSupported(method, chainId);
      const alternativeNetworks = isSupported ? undefined : this.getSupportedNetworks(method);

      return {
        method,
        isSupported,
        alternativeNetworks
      };
    });
  }

  // Additional utility methods
  getMethodsByType(methodType: PaymentMethodType): PaymentMethod[] {
    return this.supportedMethods.filter(method => method.type === methodType);
  }

  getMethodsForNetwork(chainId: number): PaymentMethod[] {
    return this.supportedMethods.filter(method => 
      this.isPaymentMethodSupported(method, chainId)
    );
  }

  isNetworkSupported(chainId: number): boolean {
    return this.supportedMethods.some(method => 
      this.isPaymentMethodSupported(method, chainId)
    );
  }

  getAlternativeNetworksForMethod(method: PaymentMethod, excludeChainId?: number): number[] {
    const supportedNetworks = this.getSupportedNetworks(method);
    
    if (excludeChainId) {
      return supportedNetworks.filter(chainId => chainId !== excludeChainId);
    }

    return supportedNetworks;
  }

  // Network status checking (would integrate with actual network monitoring in production)
  async checkNetworkStatus(chainId: number): Promise<{
    available: boolean;
    reason?: string;
    estimatedRecoveryTime?: Date;
  }> {
    // Mock implementation - would check actual network status
    const networkStatuses = {
      1: { available: true }, // Mainnet
      137: { available: true }, // Polygon
      42161: { available: true }, // Arbitrum
      11155111: { available: true } // Sepolia
    };

    return networkStatuses[chainId as keyof typeof networkStatuses] || {
      available: false,
      reason: 'Unsupported network'
    };
  }

  async getNetworkRecommendations(
    preferredMethod: PaymentMethod,
    currentChainId: number
  ): Promise<{
    recommendedNetworks: number[];
    reasons: string[];
  }> {
    const supportedNetworks = this.getSupportedNetworks(preferredMethod);
    
    if (supportedNetworks.includes(currentChainId)) {
      return {
        recommendedNetworks: [currentChainId],
        reasons: ['Current network supports this payment method']
      };
    }

    // Recommend alternative networks based on method type
    const recommendations: { networks: number[]; reasons: string[] } = {
      networks: [],
      reasons: []
    };

    if (preferredMethod.type === PaymentMethodType.STABLECOIN_USDC) {
      // Recommend low-cost networks for stablecoins
      recommendations.networks = [137, 42161]; // Polygon, Arbitrum
      recommendations.reasons = [
        'Lower gas fees for stablecoin transactions',
        'Faster confirmation times'
      ];
    } else if (preferredMethod.type === PaymentMethodType.NATIVE_ETH) {
      // Recommend based on gas cost preferences
      recommendations.networks = [42161, 1]; // Arbitrum, then Mainnet
      recommendations.reasons = [
        'Lower gas fees on Layer 2',
        'Mainnet for maximum security'
      ];
    }

    return {
      recommendedNetworks: recommendations.networks.filter(network => 
        supportedNetworks.includes(network)
      ),
      reasons: recommendations.reasons
    };
  }
}

export default NetworkAvailabilityChecker;