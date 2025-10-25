/**
 * Payment Method Prioritization Types
 * Core types for the payment method prioritization system
 */

import { PaymentToken } from './payment';

export enum PaymentMethodType {
  STABLECOIN_USDC = 'STABLECOIN_USDC',
  STABLECOIN_USDT = 'STABLECOIN_USDT',
  FIAT_STRIPE = 'FIAT_STRIPE',
  NATIVE_ETH = 'NATIVE_ETH'
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  description: string;
  token?: PaymentToken;
  chainId?: number;
  icon?: string;
  enabled: boolean;
  supportedNetworks: number[];
}

export interface CostEstimate {
  totalCost: number;
  baseCost: number;
  gasFee: number;
  exchangeRate?: number;
  estimatedTime: number; // in minutes
  confidence: number; // 0-1 scale
  currency: string;
  breakdown: {
    amount: number;
    gasLimit?: bigint;
    gasPrice?: bigint;
    networkFee?: number;
    platformFee?: number;
  };
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  totalCost: bigint;
  totalCostUSD: number;
  confidence: number;
}

export interface GasFeeThreshold {
  maxAcceptableGasFeeUSD: number;
  warningThresholdUSD: number;
  blockTransactionThresholdUSD: number;
}

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  UNAVAILABLE_INSUFFICIENT_BALANCE = 'unavailable_insufficient_balance',
  UNAVAILABLE_NETWORK_UNSUPPORTED = 'unavailable_network_unsupported',
  UNAVAILABLE_HIGH_GAS_FEES = 'unavailable_high_gas_fees',
  UNAVAILABLE_SERVICE_DOWN = 'unavailable_service_down',
  UNAVAILABLE_REGION_RESTRICTED = 'unavailable_region_restricted'
}

export interface PrioritizedPaymentMethod {
  method: PaymentMethod;
  priority: number; // 1 = highest priority
  costEstimate: CostEstimate;
  availabilityStatus: AvailabilityStatus;
  userPreferenceScore: number; // 0-1 scale
  recommendationReason: string;
  totalScore: number; // Combined weighted score
  warnings?: string[];
  benefits?: string[];
}

export interface PaymentMethodConfig {
  basePriority: number; // 1 = highest priority
  costWeight: number; // How much cost affects priority (0-1)
  preferenceWeight: number; // How much user preference affects priority (0-1)
  availabilityWeight: number; // How much availability affects priority (0-1)
  gasFeeThreshold: GasFeeThreshold;
  displayOrder: number; // UI display order
  enabled: boolean;
}

export interface UserPreferences {
  preferredMethods: PaymentMethodPreference[];
  avoidedMethods: PaymentMethodType[];
  maxGasFeeThreshold: number; // USD
  preferStablecoins: boolean;
  preferFiat: boolean;
  lastUsedMethods: RecentPaymentMethod[];
  autoSelectBestOption: boolean;
}

export interface PaymentMethodPreference {
  methodType: PaymentMethodType;
  score: number; // 0-1 scale, higher = more preferred
  usageCount: number;
  lastUsed: Date;
  averageTransactionAmount: number;
}

export interface RecentPaymentMethod {
  methodType: PaymentMethodType;
  usedAt: Date;
  transactionAmount: number;
  chainId?: number;
  successful: boolean;
}

export interface UserContext {
  userAddress?: string;
  chainId: number;
  preferences: UserPreferences;
  walletBalances: WalletBalance[];
  region?: string;
  isVIP?: boolean;
}

export interface WalletBalance {
  token: PaymentToken;
  balance: bigint;
  balanceUSD: number;
  chainId: number;
}

export interface NetworkConditions {
  chainId: number;
  gasPrice: bigint;
  gasPriceUSD: number;
  networkCongestion: 'low' | 'medium' | 'high';
  blockTime: number; // average block time in seconds
  lastUpdated: Date;
}

export interface MarketConditions {
  gasConditions: NetworkConditions[];
  exchangeRates: ExchangeRate[];
  networkAvailability: NetworkAvailability[];
  lastUpdated: Date;
}

export interface ExchangeRate {
  fromToken: string; // token symbol
  toToken: string; // usually USD
  rate: number;
  source: string;
  lastUpdated: Date;
  confidence: number; // 0-1 scale
}

export interface NetworkAvailability {
  chainId: number;
  available: boolean;
  reason?: string;
  estimatedRecoveryTime?: Date;
}

export interface PrioritizationContext {
  userContext: UserContext;
  transactionAmount: number;
  transactionCurrency: string;
  marketConditions: MarketConditions;
  availablePaymentMethods: PaymentMethod[];
}

export interface PrioritizationResult {
  prioritizedMethods: PrioritizedPaymentMethod[];
  defaultMethod: PrioritizedPaymentMethod | null;
  recommendations: PrioritizationRecommendation[];
  warnings: PrioritizationWarning[];
  metadata: {
    calculatedAt: Date;
    totalMethodsEvaluated: number;
    averageConfidence: number;
    processingTimeMs: number;
  };
}

export interface PrioritizationRecommendation {
  type: 'cost_savings' | 'speed' | 'security' | 'convenience';
  message: string;
  suggestedMethod: PaymentMethodType;
  potentialSavings?: number;
  estimatedTimeDifference?: number;
}

export interface PrioritizationWarning {
  type: 'high_gas_fees' | 'network_congestion' | 'insufficient_balance' | 'service_unavailable';
  message: string;
  affectedMethods: PaymentMethodType[];
  severity: 'low' | 'medium' | 'high';
  actionRequired?: string;
}

export interface CostComparison {
  method: PaymentMethod;
  costEstimate: CostEstimate;
  savings?: number; // compared to most expensive option
  costDifference?: number; // compared to cheapest option
  isRecommended: boolean;
  reasonForRecommendation?: string;
}

// Configuration constants
export const DEFAULT_GAS_FEE_THRESHOLDS: Record<PaymentMethodType, GasFeeThreshold> = {
  [PaymentMethodType.STABLECOIN_USDC]: {
    maxAcceptableGasFeeUSD: 50,
    warningThresholdUSD: 25,
    blockTransactionThresholdUSD: 100
  },
  [PaymentMethodType.STABLECOIN_USDT]: {
    maxAcceptableGasFeeUSD: 50,
    warningThresholdUSD: 25,
    blockTransactionThresholdUSD: 100
  },
  [PaymentMethodType.FIAT_STRIPE]: {
    maxAcceptableGasFeeUSD: 0,
    warningThresholdUSD: 0,
    blockTransactionThresholdUSD: 0
  },
  [PaymentMethodType.NATIVE_ETH]: {
    maxAcceptableGasFeeUSD: 0, // Disabled
    warningThresholdUSD: 0, // Disabled
    blockTransactionThresholdUSD: 0 // Disabled
  }
};

export const DEFAULT_PAYMENT_METHOD_CONFIGS: Record<PaymentMethodType, PaymentMethodConfig> = {
  [PaymentMethodType.STABLECOIN_USDC]: {
    basePriority: 1,
    costWeight: 0.4,
    preferenceWeight: 0.3,
    availabilityWeight: 0.3,
    gasFeeThreshold: DEFAULT_GAS_FEE_THRESHOLDS[PaymentMethodType.STABLECOIN_USDC],
    displayOrder: 1,
    enabled: true
  },
  [PaymentMethodType.STABLECOIN_USDT]: {
    basePriority: 2,
    costWeight: 0.4,
    preferenceWeight: 0.3,
    availabilityWeight: 0.3,
    gasFeeThreshold: DEFAULT_GAS_FEE_THRESHOLDS[PaymentMethodType.STABLECOIN_USDT],
    displayOrder: 2,
    enabled: true
  },
  [PaymentMethodType.FIAT_STRIPE]: {
    basePriority: 3,
    costWeight: 0.2,
    preferenceWeight: 0.4,
    availabilityWeight: 0.4,
    gasFeeThreshold: DEFAULT_GAS_FEE_THRESHOLDS[PaymentMethodType.FIAT_STRIPE],
    displayOrder: 3,
    enabled: true
  },
  [PaymentMethodType.NATIVE_ETH]: {
    basePriority: 99, // Deprioritized
    costWeight: 0.6,
    preferenceWeight: 0.2,
    availabilityWeight: 0.2,
    gasFeeThreshold: DEFAULT_GAS_FEE_THRESHOLDS[PaymentMethodType.NATIVE_ETH],
    displayOrder: 99, // Hidden from display
    enabled: false // Disabled as per requirements
  }
};