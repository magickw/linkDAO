/**
 * Payment Method Prioritization Configuration
 * Centralized configuration for payment method prioritization system
 */

import { mainnet, polygon, arbitrum, sepolia } from 'wagmi/chains';
import {
  PaymentMethod,
  PaymentMethodType,
  PaymentMethodConfig,
  GasFeeThreshold,
  DEFAULT_PAYMENT_METHOD_CONFIGS,
  DEFAULT_GAS_FEE_THRESHOLDS
} from '../types/paymentPrioritization';
import {
  USDC_MAINNET,
  USDC_POLYGON,
  USDC_ARBITRUM,
  USDC_SEPOLIA,
  USDT_MAINNET,
  USDT_POLYGON,
  ETH,
  ETH_SEPOLIA,
  MATIC
} from './payment';

// Supported Payment Methods Configuration
export const SUPPORTED_PAYMENT_METHODS: PaymentMethod[] = [
  // USDC Stablecoin Methods
  {
    id: 'usdc-mainnet',
    type: PaymentMethodType.STABLECOIN_USDC,
    name: 'USDC (Ethereum)',
    description: 'USD Coin on Ethereum mainnet - stable value with predictable costs',
    token: USDC_MAINNET,
    chainId: mainnet.id,
    icon: '/icons/usdc.svg',
    enabled: true,
    supportedNetworks: [mainnet.id]
  },
  {
    id: 'usdc-polygon',
    type: PaymentMethodType.STABLECOIN_USDC,
    name: 'USDC (Polygon)',
    description: 'USD Coin on Polygon - stable value with low gas fees',
    token: USDC_POLYGON,
    chainId: polygon.id,
    icon: '/icons/usdc.svg',
    enabled: true,
    supportedNetworks: [polygon.id]
  },
  {
    id: 'usdc-arbitrum',
    type: PaymentMethodType.STABLECOIN_USDC,
    name: 'USDC (Arbitrum)',
    description: 'USD Coin on Arbitrum - stable value with fast transactions',
    token: USDC_ARBITRUM,
    chainId: arbitrum.id,
    icon: '/icons/usdc.svg',
    enabled: true,
    supportedNetworks: [arbitrum.id]
  },
  {
    id: 'usdc-sepolia',
    type: PaymentMethodType.STABLECOIN_USDC,
    name: 'USDC (Sepolia)',
    description: 'USD Coin on Sepolia testnet - for testing purposes',
    token: USDC_SEPOLIA,
    chainId: sepolia.id,
    icon: '/icons/usdc.svg',
    enabled: true,
    supportedNetworks: [sepolia.id]
  },

  // USDT Stablecoin Methods
  {
    id: 'usdt-mainnet',
    type: PaymentMethodType.STABLECOIN_USDT,
    name: 'USDT (Ethereum)',
    description: 'Tether USD on Ethereum mainnet - widely accepted stablecoin',
    token: USDT_MAINNET,
    chainId: mainnet.id,
    icon: '/icons/usdt.svg',
    enabled: true,
    supportedNetworks: [mainnet.id]
  },
  {
    id: 'usdt-polygon',
    type: PaymentMethodType.STABLECOIN_USDT,
    name: 'USDT (Polygon)',
    description: 'Tether USD on Polygon - low cost alternative',
    token: USDT_POLYGON,
    chainId: polygon.id,
    icon: '/icons/usdt.svg',
    enabled: true,
    supportedNetworks: [polygon.id]
  },

  // Fiat Payment Method
  {
    id: 'fiat-stripe',
    type: PaymentMethodType.FIAT_STRIPE,
    name: 'Credit/Debit Card',
    description: 'Traditional payment with Stripe - no gas fees, familiar experience',
    chainId: undefined,
    icon: '/icons/credit-card.svg',
    enabled: true,
    supportedNetworks: [] // Available on all networks
  },

  // Native Token Methods
  {
    id: 'eth-mainnet',
    type: PaymentMethodType.NATIVE_ETH,
    name: 'ETH (Ethereum)',
    description: 'Native Ethereum token - widely accepted but variable gas costs',
    token: ETH,
    chainId: mainnet.id,
    icon: '/icons/eth.svg',
    enabled: true,
    supportedNetworks: [mainnet.id]
  },
  {
    id: 'eth-arbitrum',
    type: PaymentMethodType.NATIVE_ETH,
    name: 'ETH (Arbitrum)',
    description: 'Ethereum on Arbitrum - lower gas fees than mainnet',
    token: { ...ETH, chainId: arbitrum.id },
    chainId: arbitrum.id,
    icon: '/icons/eth.svg',
    enabled: true,
    supportedNetworks: [arbitrum.id]
  },
  {
    id: 'eth-sepolia',
    type: PaymentMethodType.NATIVE_ETH,
    name: 'ETH (Sepolia)',
    description: 'Ethereum on Sepolia testnet - for testing purposes',
    token: ETH_SEPOLIA,
    chainId: sepolia.id,
    icon: '/icons/eth.svg',
    enabled: true,
    supportedNetworks: [sepolia.id]
  },
  {
    id: 'matic-polygon',
    type: PaymentMethodType.NATIVE_ETH, // Using same type for native tokens
    name: 'MATIC (Polygon)',
    description: 'Native Polygon token - very low gas fees',
    token: MATIC,
    chainId: polygon.id,
    icon: '/icons/matic.svg',
    enabled: true,
    supportedNetworks: [polygon.id]
  }
];

// Environment-specific configurations
export const PAYMENT_METHOD_CONFIGS = {
  development: {
    ...DEFAULT_PAYMENT_METHOD_CONFIGS,
    // More lenient thresholds for development
    [PaymentMethodType.NATIVE_ETH]: {
      ...DEFAULT_PAYMENT_METHOD_CONFIGS[PaymentMethodType.NATIVE_ETH],
      gasFeeThreshold: {
        maxAcceptableGasFeeUSD: 200,
        warningThresholdUSD: 100,
        blockTransactionThresholdUSD: 500
      }
    }
  },
  production: DEFAULT_PAYMENT_METHOD_CONFIGS,
  testnet: {
    ...DEFAULT_PAYMENT_METHOD_CONFIGS,
    // Very lenient thresholds for testnet
    [PaymentMethodType.NATIVE_ETH]: {
      ...DEFAULT_PAYMENT_METHOD_CONFIGS[PaymentMethodType.NATIVE_ETH],
      gasFeeThreshold: {
        maxAcceptableGasFeeUSD: 1000,
        warningThresholdUSD: 500,
        blockTransactionThresholdUSD: 2000
      }
    }
  }
};

// Network-specific prioritization rules
export const NETWORK_PRIORITIZATION_RULES: {
  [key: number]: {
    preferredMethods: PaymentMethodType[];
    gasFeeMultiplier: number;
    description: string;
  };
  [mainnet.id]: {
    preferredMethods: PaymentMethodType[];
    gasFeeMultiplier: number;
    description: string;
  };
  [polygon.id]: {
    preferredMethods: PaymentMethodType[];
    gasFeeMultiplier: number;
    description: string;
  };
  [arbitrum.id]: {
    preferredMethods: PaymentMethodType[];
    gasFeeMultiplier: number;
    description: string;
  };
  [sepolia.id]: {
    preferredMethods: PaymentMethodType[];
    gasFeeMultiplier: number;
    description: string;
  };
} = {
  [mainnet.id]: {
    preferredMethods: [
      PaymentMethodType.STABLECOIN_USDC,
      PaymentMethodType.FIAT_STRIPE,
      PaymentMethodType.STABLECOIN_USDT,
      PaymentMethodType.NATIVE_ETH
    ],
    gasFeeMultiplier: 1.0,
    description: 'Ethereum mainnet - prioritize stablecoins due to gas costs'
  },
  [polygon.id]: {
    preferredMethods: [
      PaymentMethodType.STABLECOIN_USDC,
      PaymentMethodType.STABLECOIN_USDT,
      PaymentMethodType.NATIVE_ETH, // MATIC
      PaymentMethodType.FIAT_STRIPE
    ],
    gasFeeMultiplier: 0.1,
    description: 'Polygon - low gas fees make crypto methods more attractive'
  },
  [arbitrum.id]: {
    preferredMethods: [
      PaymentMethodType.STABLECOIN_USDC,
      PaymentMethodType.NATIVE_ETH,
      PaymentMethodType.FIAT_STRIPE,
      PaymentMethodType.STABLECOIN_USDT
    ],
    gasFeeMultiplier: 0.2,
    description: 'Arbitrum - fast and cheap, good for all crypto methods'
  },
  [sepolia.id]: {
    preferredMethods: [
      PaymentMethodType.STABLECOIN_USDC,
      PaymentMethodType.NATIVE_ETH,
      PaymentMethodType.FIAT_STRIPE
    ],
    gasFeeMultiplier: 0.01,
    description: 'Sepolia testnet - minimal gas fees for testing'
  }
};

// User tier-based configurations
export const USER_TIER_CONFIGS = {
  basic: {
    maxGasFeeThreshold: 25, // $25 USD
    preferStablecoins: true,
    autoSelectBestOption: true,
    availablePaymentMethods: [
      PaymentMethodType.STABLECOIN_USDC,
      PaymentMethodType.FIAT_STRIPE,
      PaymentMethodType.NATIVE_ETH
    ]
  },
  premium: {
    maxGasFeeThreshold: 50, // $50 USD
    preferStablecoins: true,
    autoSelectBestOption: true,
    availablePaymentMethods: [
      PaymentMethodType.STABLECOIN_USDC,
      PaymentMethodType.STABLECOIN_USDT,
      PaymentMethodType.FIAT_STRIPE,
      PaymentMethodType.NATIVE_ETH
    ]
  },
  vip: {
    maxGasFeeThreshold: 100, // $100 USD
    preferStablecoins: false, // VIP users might prefer ETH for prestige
    autoSelectBestOption: false, // VIP users want control
    availablePaymentMethods: [
      PaymentMethodType.STABLECOIN_USDC,
      PaymentMethodType.STABLECOIN_USDT,
      PaymentMethodType.FIAT_STRIPE,
      PaymentMethodType.NATIVE_ETH
    ]
  }
};

// Regional configurations
export const REGIONAL_CONFIGS: Record<string, {
  preferredCurrency: string;
  fiatPaymentEnabled: boolean;
  restrictedMethods: PaymentMethodType[];
  complianceLevel: string;
}> = {
  US: {
    preferredCurrency: 'USD',
    fiatPaymentEnabled: true,
    restrictedMethods: [] as PaymentMethodType[],
    complianceLevel: 'high'
  },
  EU: {
    preferredCurrency: 'EUR',
    fiatPaymentEnabled: true,
    restrictedMethods: [] as PaymentMethodType[],
    complianceLevel: 'high'
  },
  ASIA: {
    preferredCurrency: 'USD',
    fiatPaymentEnabled: true,
    restrictedMethods: [] as PaymentMethodType[],
    complianceLevel: 'medium'
  },
  OTHER: {
    preferredCurrency: 'USD',
    fiatPaymentEnabled: false, // Restricted regions might not have fiat
    restrictedMethods: [PaymentMethodType.FIAT_STRIPE],
    complianceLevel: 'basic'
  }
};

// Utility functions for configuration management
export class PaymentMethodConfigurationManager {
  private environment: 'development' | 'production' | 'testnet';
  private userTier: 'basic' | 'premium' | 'vip';
  private region: 'US' | 'EU' | 'ASIA' | 'OTHER';

  constructor(
    environment: 'development' | 'production' | 'testnet' = 'production',
    userTier: 'basic' | 'premium' | 'vip' = 'basic',
    region: 'US' | 'EU' | 'ASIA' | 'OTHER' = 'US'
  ) {
    this.environment = environment;
    this.userTier = userTier;
    this.region = region;
  }

  getPaymentMethodConfigs(): Record<PaymentMethodType, PaymentMethodConfig> {
    return PAYMENT_METHOD_CONFIGS[this.environment];
  }

  getAvailablePaymentMethods(chainId?: number): PaymentMethod[] {
    const userTierConfig = USER_TIER_CONFIGS[this.userTier];
    const regionalConfig = REGIONAL_CONFIGS[this.region];

    let availableMethods = SUPPORTED_PAYMENT_METHODS.filter(method => {
      // Filter by user tier
      if (!userTierConfig.availablePaymentMethods.includes(method.type)) {
        return false;
      }

      // Filter by regional restrictions
      if (regionalConfig.restrictedMethods.includes(method.type)) {
        return false;
      }

      // Filter by chain if specified
      if (chainId && method.chainId && method.chainId !== chainId) {
        return false;
      }

      return method.enabled;
    });

    return availableMethods;
  }

  getNetworkPrioritizationRules(chainId: number) {
    return NETWORK_PRIORITIZATION_RULES[chainId] || NETWORK_PRIORITIZATION_RULES[mainnet.id];
  }

  getUserTierConfig() {
    return USER_TIER_CONFIGS[this.userTier];
  }

  getRegionalConfig() {
    return REGIONAL_CONFIGS[this.region];
  }

  updateEnvironment(environment: 'development' | 'production' | 'testnet') {
    this.environment = environment;
  }

  updateUserTier(userTier: 'basic' | 'premium' | 'vip') {
    this.userTier = userTier;
  }

  updateRegion(region: 'US' | 'EU' | 'ASIA' | 'OTHER') {
    this.region = region;
  }

  // Get method-specific configuration
  getMethodConfig(methodType: PaymentMethodType): PaymentMethodConfig {
    return this.getPaymentMethodConfigs()[methodType];
  }

  // Check if a payment method is available for current configuration
  isPaymentMethodAvailable(methodType: PaymentMethodType, chainId?: number): boolean {
    const availableMethods = this.getAvailablePaymentMethods(chainId);
    return availableMethods.some(method => method.type === methodType);
  }

  // Get prioritized method types for a specific network
  getPrioritizedMethodTypes(chainId: number): PaymentMethodType[] {
    const networkRules = this.getNetworkPrioritizationRules(chainId);
    const availableMethods = this.getAvailablePaymentMethods(chainId);
    
    return networkRules.preferredMethods.filter(methodType =>
      availableMethods.some(method => method.type === methodType)
    );
  }
}

// Default configuration manager instance
export const defaultConfigManager = new PaymentMethodConfigurationManager(
  process.env.NODE_ENV === 'development' ? 'development' : 'production'
);

// Export configuration getter functions
export const getPaymentMethodConfigs = () => defaultConfigManager.getPaymentMethodConfigs();
export const getAvailablePaymentMethods = (chainId?: number) => 
  defaultConfigManager.getAvailablePaymentMethods(chainId);
export const getNetworkPrioritizationRules = (chainId: number) => 
  defaultConfigManager.getNetworkPrioritizationRules(chainId);

export default PaymentMethodConfigurationManager;