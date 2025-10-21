/**
 * Payment Method Prioritization System
 * Main export file for all payment prioritization services and types
 */

// Core service exports
export { default as PaymentMethodPrioritizationService } from '../paymentMethodPrioritizationService';
export { default as CostEffectivenessCalculator } from '../costEffectivenessCalculator';
export { default as NetworkAvailabilityChecker } from '../networkAvailabilityChecker';
export { default as UserPreferenceManager } from '../userPreferenceManager';
export { 
  default as PaymentPrioritizationFactory,
  paymentPrioritizationFactory,
  createPrioritizationService,
  quickPrioritization
} from '../paymentPrioritizationFactory';

// Configuration exports
export { 
  default as PaymentMethodConfigurationManager,
  defaultConfigManager,
  getPaymentMethodConfigs,
  getAvailablePaymentMethods,
  getNetworkPrioritizationRules,
  SUPPORTED_PAYMENT_METHODS,
  PAYMENT_METHOD_CONFIGS,
  NETWORK_PRIORITIZATION_RULES,
  USER_TIER_CONFIGS,
  REGIONAL_CONFIGS
} from '../../config/paymentMethodPrioritization';

// Enum exports (export as values first)
export { PaymentMethodType, AvailabilityStatus } from '../../types/paymentPrioritization';

// Type exports
export type {
  PaymentMethod,
  CostEstimate,
  GasEstimate,
  GasFeeThreshold,
  PrioritizedPaymentMethod,
  PaymentMethodConfig,
  UserPreferences,
  PaymentMethodPreference,
  RecentPaymentMethod,
  UserContext,
  WalletBalance,
  NetworkConditions,
  MarketConditions,
  ExchangeRate,
  NetworkAvailability,
  PrioritizationContext,
  PrioritizationResult,
  PrioritizationRecommendation,
  PrioritizationWarning,
  CostComparison
} from '../../types/paymentPrioritization';

// Interface exports
export type {
  IPaymentMethodPrioritizationService,
  ICostEffectivenessCalculator,
  INetworkAvailabilityChecker,
  IUserPreferenceManager
} from '../paymentMethodPrioritizationService';

// Constants exports
export {
  DEFAULT_GAS_FEE_THRESHOLDS,
  DEFAULT_PAYMENT_METHOD_CONFIGS
} from '../../types/paymentPrioritization';