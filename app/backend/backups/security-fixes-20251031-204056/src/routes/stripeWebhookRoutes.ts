import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { StripePaymentService } from '../services/stripePaymentService';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';

export function createStripeWebhookRoutes(stripeService: StripePaymentService): express.Router {
  const router = express.Router();

  // Stripe webhook endpoint - must be raw body
  router.post('/webhook', csrfProtection,  express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        safeLogger.error('Missing Stripe signature');
        return res.status(400).json({ error: 'Missing signature' });
      }

      const event = await stripeService.handleWebhook(req.body, signature);
      
      if (!event) {
        safeLogger.error('Invalid webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }

      // Process the webhook event
      await stripeService.processWebhookEvent(event);

      res.status(200).json({ received: true });
    } catch (error) {
      safeLogger.error('Stripe webhook error:', error);
      res.status(500).json({ 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}