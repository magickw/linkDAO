export interface FiatPaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'bank_transfer' | 'paypal' | 'apple_pay' | 'google_pay';
  provider: 'stripe' | 'paypal' | 'square';
  name: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  enabled: boolean;
}

export interface FiatPaymentRequest {
  orderId: string;
  amount: number;
  currency: string; // USD, EUR, GBP, etc.
  paymentMethodId: string;
  customerEmail?: string;
  billingAddress?: BillingAddress;
  convertToCrypto?: {
    targetToken: string;
    targetChain: number;
    slippageTolerance: number;
  };
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface FiatPaymentTransaction {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: FiatPaymentStatus;
  paymentMethodId: string;
  provider: 'stripe' | 'paypal' | 'square';
  providerTransactionId?: string;
  fees: {
    processingFee: number;
    platformFee: number;
    totalFees: number;
  };
  exchangeRate?: ExchangeRate;
  cryptoConversion?: CryptoConversion;
  createdAt: Date;
  updatedAt: Date;
  failureReason?: string;
  refundId?: string;
}

export enum FiatPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  provider: string;
  timestamp: Date;
  validUntil: Date;
}

export interface CryptoConversion {
  fromAmount: number;
  fromCurrency: string;
  toAmount: string; // bigint as string
  toToken: string;
  toChain: number;
  exchangeRate: number;
  slippage: number;
  transactionHash?: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface PaymentMethodSetup {
  clientSecret: string;
  paymentMethodId?: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded';
}

export interface FiatPaymentReceipt {
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: {
    type: string;
    last4?: string;
    brand?: string;
  };
  fees: {
    processingFee: number;
    platformFee: number;
    totalFees: number;
  };
  timestamp: Date;
  status: FiatPaymentStatus;
  providerTransactionId: string;
  cryptoConversion?: CryptoConversion;
}

export interface ComplianceData {
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  amlChecks: {
    status: 'passed' | 'failed' | 'pending';
    riskScore: number;
    lastChecked: Date;
  };
  transactionLimits: {
    daily: number;
    monthly: number;
    yearly: number;
    remaining: {
      daily: number;
      monthly: number;
      yearly: number;
    };
  };
  restrictedCountries: string[];
}