/**
 * Stripe Payment Intent Status API Route
 *
 * Retrieves the status of a payment intent
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, validateStripeConfig } from '@/config/stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' as any,
  typescript: true,
});

interface PaymentStatusResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod?: {
    type: string;
    card?: {
      brand: string;
      last4: string;
    };
  };
  created: number;
  metadata: Record<string, string>;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaymentStatusResponse | ErrorResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate Stripe configuration
    const configValidation = validateStripeConfig();
    if (!configValidation.isValid) {
      return res.status(500).json({
        error: 'Payment system not configured'
      });
    }

    // Get payment intent ID from query
    const { paymentIntentId } = req.query;

    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return res.status(400).json({
        error: 'Missing payment intent ID'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Get payment method details if available
    let paymentMethodDetails;
    if (paymentIntent.payment_method) {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentIntent.payment_method as string
      );

      paymentMethodDetails = {
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
        } : undefined,
      };
    }

    // Return payment status
    return res.status(200).json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      paymentMethod: paymentMethodDetails,
      created: paymentIntent.created,
      metadata: paymentIntent.metadata as Record<string, string>,
    });

  } catch (error) {
    console.error('Error retrieving payment status:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: 'Failed to retrieve payment',
        details: error.message
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
