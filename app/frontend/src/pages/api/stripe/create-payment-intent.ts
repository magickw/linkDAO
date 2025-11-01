/**
 * Stripe Payment Intent Creation API Route
 *
 * This is a server-side API route that creates Stripe payment intents
 * Uses the secret key (never exposed to client)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import {
  STRIPE_SECRET_KEY,
  STRIPE_CONFIG,
  validateStripeConfig,
  toCents
} from '@/config/stripe';

// Initialize Stripe with secret key (server-side only)
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' as any,
  typescript: true,
});

interface CreatePaymentIntentRequest {
  amount: number; // in dollars
  currency?: string;
  orderId: string;
  customerId?: string;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
  metadata?: Record<string, string>;
}

interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePaymentIntentResponse | ErrorResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate Stripe configuration
    const configValidation = validateStripeConfig();
    if (!configValidation.isValid) {
      console.error('Stripe configuration errors:', configValidation.errors);
      return res.status(500).json({
        error: 'Payment system not configured',
        details: 'Please contact support'
      });
    }

    // Parse request body
    const {
      amount,
      currency = 'usd',
      orderId,
      customerId,
      paymentMethodId,
      savePaymentMethod = false,
      metadata = {}
    } = req.body as CreatePaymentIntentRequest;

    // Validate request
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        details: 'Amount must be greater than 0'
      });
    }

    if (!orderId) {
      return res.status(400).json({
        error: 'Missing orderId',
        details: 'Order ID is required'
      });
    }

    // Check amount limits
    const amountInCents = toCents(amount);
    if (amountInCents < STRIPE_CONFIG.limits.minAmount) {
      return res.status(400).json({
        error: 'Amount too low',
        details: `Minimum amount is $${STRIPE_CONFIG.limits.minAmount / 100}`
      });
    }

    if (amountInCents > STRIPE_CONFIG.limits.maxAmount) {
      return res.status(400).json({
        error: 'Amount too high',
        details: `Maximum amount is $${STRIPE_CONFIG.limits.maxAmount / 100}`
      });
    }

    // Check currency support
    if (!STRIPE_CONFIG.supportedCurrencies.includes(currency.toLowerCase() as any)) {
      return res.status(400).json({
        error: 'Unsupported currency',
        details: `Supported currencies: ${STRIPE_CONFIG.supportedCurrencies.join(', ')}`
      });
    }

    // Create payment intent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      // Payment configuration
      capture_method: STRIPE_CONFIG.paymentIntents.captureMethod,
      confirmation_method: STRIPE_CONFIG.paymentIntents.confirmationMethod,

      // Metadata
      metadata: {
        orderId,
        ...metadata,
        // Add timestamp for tracking
        createdAt: new Date().toISOString(),
      },
    };

    // Add customer if provided
    if (customerId) {
      paymentIntentParams.customer = customerId;

      // Save payment method for future use if requested
      if (savePaymentMethod) {
        paymentIntentParams.setup_future_usage = STRIPE_CONFIG.paymentIntents.setupFutureUsage;
      }
    }

    // Add payment method if provided
    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
    }

    // Create the payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Return client secret and payment intent ID
    return res.status(200).json({
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);

    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: 'Payment setup failed',
        details: error.message
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
