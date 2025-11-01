/**
 * Stripe Configuration
 *
 * Environment Variables Required:
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY - Stripe publishable key (starts with pk_)
 * - STRIPE_SECRET_KEY - Stripe secret key (starts with sk_) - SERVER SIDE ONLY
 * - STRIPE_WEBHOOK_SECRET - Webhook signing secret (starts with whsec_)
 */

// Publishable key for client-side (safe to expose)
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Secret key for server-side only (NEVER expose to client)
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// Webhook signing secret for verifying webhook events
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Stripe API version
export const STRIPE_API_VERSION = '2023-10-16' as const;

// Stripe configuration
export const STRIPE_CONFIG = {
  // Payment intents configuration
  paymentIntents: {
    captureMethod: 'automatic' as const, // or 'manual' for two-step auth
    confirmationMethod: 'automatic' as const,
    setupFutureUsage: 'off_session' as const, // Enable saving cards for future use
  },

  // Payment methods
  paymentMethods: {
    types: ['card', 'link'] as const, // Add more: 'us_bank_account', 'sepa_debit', etc.
    card: {
      requestThreeDSecure: 'automatic' as const, // SCA compliance
    },
  },

  // Fees
  fees: {
    // Stripe standard fees (adjust based on your pricing)
    cardPercentage: 0.029, // 2.9%
    cardFixed: 0.30, // $0.30
    internationalCardPercentage: 0.039, // 3.9% for international cards
    internationalCardFixed: 0.30,
    // Your platform fee
    platformPercentage: 0.01, // 1%
  },

  // Limits (in USD cents)
  limits: {
    minAmount: 50, // $0.50 minimum
    maxAmount: 99999999, // ~$999,999.99 maximum
  },

  // Supported currencies
  supportedCurrencies: [
    'usd', 'eur', 'gbp', 'cad', 'aud',
    'jpy', 'chf', 'nzd', 'sgd', 'hkd'
  ] as const,

  // Metadata settings
  metadata: {
    maxKeyLength: 40,
    maxValueLength: 500,
    maxKeys: 50,
  },

  // Timeout settings
  timeouts: {
    paymentIntent: 90, // minutes before payment intent expires
    setupIntent: 24 * 60, // hours before setup intent expires
  },
};

// Validate configuration
export function validateStripeConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!STRIPE_PUBLISHABLE_KEY) {
    errors.push('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  } else if (!STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
    errors.push('Invalid STRIPE_PUBLISHABLE_KEY format (should start with pk_)');
  }

  // Only validate server-side keys if running on server
  if (typeof window === 'undefined') {
    if (!STRIPE_SECRET_KEY) {
      errors.push('Missing STRIPE_SECRET_KEY');
    } else if (!STRIPE_SECRET_KEY.startsWith('sk_')) {
      errors.push('Invalid STRIPE_SECRET_KEY format (should start with sk_)');
    }

    if (!STRIPE_WEBHOOK_SECRET) {
      errors.push('Missing STRIPE_WEBHOOK_SECRET (required for webhooks)');
    } else if (!STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
      errors.push('Invalid STRIPE_WEBHOOK_SECRET format (should start with whsec_)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper to check if we're using test or live keys
export function isTestMode(): boolean {
  return STRIPE_PUBLISHABLE_KEY.includes('test');
}

// Currency helpers
export function formatCurrency(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Stripe uses cents
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(amountInCents: number): number {
  return amountInCents / 100;
}

// Type definitions
export type StripeCurrency = typeof STRIPE_CONFIG.supportedCurrencies[number];
export type StripePaymentMethodType = typeof STRIPE_CONFIG.paymentMethods.types[number];
