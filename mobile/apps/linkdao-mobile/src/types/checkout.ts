/**
 * Checkout Types
 * Consolidated types for mobile checkout flow
 */

// Address Types
export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

// Payment Method Types
export enum PaymentMethodType {
  STABLECOIN_USDC = 'STABLECOIN_USDC',
  STABLECOIN_USDT = 'STABLECOIN_USDT',
  FIAT_STRIPE = 'FIAT_STRIPE',
  NATIVE_ETH = 'NATIVE_ETH',
  X402 = 'X402'
}

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  UNAVAILABLE_INSUFFICIENT_BALANCE = 'unavailable_insufficient_balance',
  UNAVAILABLE_NETWORK_UNSUPPORTED = 'unavailable_network_unsupported',
  UNAVAILABLE_HIGH_GAS_FEES = 'unavailable_high_gas_fees',
  UNAVAILABLE_SERVICE_DOWN = 'unavailable_service_down',
  UNAVAILABLE_REGION_RESTRICTED = 'unavailable_region_restricted',
  UNAVAILABLE_MINIMUM_AMOUNT = 'unavailable_minimum_amount'
}

export interface PaymentToken {
  symbol: string;
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  logoURI?: string;
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
  estimatedTime: number; // in minutes
  confidence: number; // 0-1 scale
  currency: string;
}

export interface PrioritizedPaymentMethod {
  method: PaymentMethod;
  priority: number; // 1 = highest priority
  costEstimate: CostEstimate;
  availabilityStatus: AvailabilityStatus;
  userPreferenceScore: number; // 0-1 scale
  recommendationReason: string;
  totalScore: number;
  warnings?: string[];
  benefits?: string[];
}

export interface PrioritizationResult {
  prioritizedMethods: PrioritizedPaymentMethod[];
  defaultMethod: PrioritizedPaymentMethod | null;
  recommendations: any[]; // Simplified
  warnings: any[]; // Simplified
}

export interface CheckoutRecommendation {
  recommendedPath: 'crypto' | 'fiat' | 'x402';
  reason: string;
  cryptoOption: {
    available: boolean;
    token: string;
    fees: number;
    estimatedTime: string;
    benefits: string[];
    requirements: string[];
  };
  fiatOption: {
    available: boolean;
    provider: string;
    fees: number;
    estimatedTime: string;
    benefits: string[];
    requirements: string[];
  };
  x402Option?: {
    available: boolean;
    fees: number;
    estimatedTime: string;
    benefits: string[];
    requirements: string[];
  };
}

// Error Types
export interface PaymentError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  recoveryOptions?: any[];
}

// Tax Types
export interface TaxCalculationResult {
    subtotal: number;
    shippingCost: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    taxBreakdown: Array<{
        name: string;
        rate: number;
        amount: number;
        type: string;
    }>;
    currency: string;
    jurisdiction: string;
}

// Validation Types
export interface AddressValidationResult {
  isValid: boolean;
  normalizedAddress?: ShippingAddress;
  confidence: 'high' | 'medium' | 'low';
  errors: string[];
  warnings: string[];
}

export interface DiscountValidationResult {
  isValid: boolean;
  discountAmount: number;
  newTotal: number;
  code: string;
  error?: string;
}
