/**
 * Stripe Webhook Handler
 *
 * Handles webhook events from Stripe
 * IMPORTANT: This endpoint must be configured in Stripe Dashboard
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  validateStripeConfig
} from '@/config/stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' as any,
  typescript: true,
});

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

interface WebhookResponse {
  received: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ received: false, error: 'Method not allowed' });
  }

  try {
    // Validate Stripe configuration
    const configValidation = validateStripeConfig();
    if (!configValidation.isValid) {
      console.error('Stripe configuration errors:', configValidation.errors);
      return res.status(500).json({
        received: false,
        error: 'Webhook not configured'
      });
    }

    // Get the raw body for signature verification
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.error('Missing stripe-signature header');
      return res.status(400).json({
        received: false,
        error: 'Missing signature'
      });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        buf,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({
        received: false,
        error: 'Invalid signature'
      });
    }

    // Handle the event
    console.log(`Received webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.processing':
        await handlePaymentIntentProcessing(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return success response
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({
      received: false,
      error: 'Webhook processing failed'
    });
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  // TODO: Update your database
  // - Mark order as paid
  // - Send confirmation email
  // - Trigger fulfillment process
  // - Update user credits/balance if applicable

  const { orderId } = paymentIntent.metadata;

  console.log(`Order ${orderId} payment successful. Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}`);

  // Example: You would update your database here
  // await db.orders.update({
  //   where: { id: orderId },
  //   data: {
  //     status: 'paid',
  //     paidAt: new Date(),
  //     stripePaymentIntentId: paymentIntent.id
  //   }
  // });
}

/**
 * Handle failed payment
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);

  const { orderId } = paymentIntent.metadata;
  const failureReason = paymentIntent.last_payment_error?.message || 'Unknown error';

  console.log(`Order ${orderId} payment failed. Reason: ${failureReason}`);

  // TODO: Update your database
  // - Mark payment as failed
  // - Send notification to user
  // - Log failure reason

  // Example:
  // await db.orders.update({
  //   where: { id: orderId },
  //   data: {
  //     status: 'payment_failed',
  //     failureReason,
  //     failedAt: new Date()
  //   }
  // });
}

/**
 * Handle payment processing (e.g., bank transfers)
 */
async function handlePaymentIntentProcessing(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment processing:', paymentIntent.id);

  const { orderId } = paymentIntent.metadata;

  // TODO: Update status to processing
  // This is common for bank transfers which take days to complete
  console.log(`Order ${orderId} payment is processing`);
}

/**
 * Handle canceled payment
 */
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment canceled:', paymentIntent.id);

  const { orderId } = paymentIntent.metadata;

  // TODO: Update your database
  // - Mark order as canceled
  // - Release inventory if applicable
  console.log(`Order ${orderId} payment was canceled`);
}

/**
 * Handle payment requiring additional action (3D Secure)
 */
async function handlePaymentIntentRequiresAction(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment requires action:', paymentIntent.id);

  const { orderId } = paymentIntent.metadata;

  // TODO: Send notification to user
  // - Email with link to complete authentication
  // - Update status to 'requires_action'
  console.log(`Order ${orderId} requires additional authentication`);
}

/**
 * Handle refund
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('Charge refunded:', charge.id);

  // TODO: Update your database
  // - Mark order as refunded
  // - Update user balance
  // - Send refund confirmation email
  console.log(`Refund processed for charge ${charge.id}. Amount: ${charge.amount_refunded / 100}`);
}

/**
 * Handle dispute/chargeback
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  console.log('Dispute created:', dispute.id);

  // TODO: Alert your team
  // - Send notification to support team
  // - Gather evidence for dispute
  // - Update order status
  console.log(`ALERT: Dispute created for charge ${dispute.charge}. Reason: ${dispute.reason}`);

  // You might want to send an alert email to your team here
}

/**
 * Handle new customer creation
 */
async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log('Customer created:', customer.id);

  // TODO: Update your database
  // - Link Stripe customer ID to your user
  // - Enable saved payment methods
  console.log(`New Stripe customer created: ${customer.id}`);
}

/**
 * Handle payment method attached to customer
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  console.log('Payment method attached:', paymentMethod.id);

  // TODO: Update your database
  // - Save payment method details
  // - Mark as default if first payment method
  console.log(`Payment method ${paymentMethod.id} attached to customer ${paymentMethod.customer}`);
}
