import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { chargebackWebhookService } from '../services/chargebackWebhookService';

export function createPayPalWebhookRoutes(): express.Router {
  const router = express.Router();

  /**
   * PayPal Webhook Endpoint
   * Handles all PayPal webhook events including disputes/chargebacks
   */
  router.post('/webhook', express.json(), async (req, res) => {
    try {
      const webhookBody = req.body;

      // Extract PayPal headers for verification
      const headers: Record<string, string> = {
        'paypal-auth-algo': req.headers['paypal-auth-algo'] as string || '',
        'paypal-cert-url': req.headers['paypal-cert-url'] as string || '',
        'paypal-transmission-id': req.headers['paypal-transmission-id'] as string || '',
        'paypal-transmission-sig': req.headers['paypal-transmission-sig'] as string || '',
        'paypal-transmission-time': req.headers['paypal-transmission-time'] as string || ''
      };

      // Verify webhook signature (optional in sandbox, required in production)
      if (process.env.NODE_ENV === 'production') {
        const isValid = await chargebackWebhookService.verifyPayPalWebhook(webhookBody, headers);
        if (!isValid) {
          safeLogger.error('PayPal webhook signature verification failed');
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }
      }

      const eventType = webhookBody.event_type;
      safeLogger.info(`Received PayPal webhook event: ${eventType}`);

      // Handle dispute events
      if (eventType?.startsWith('CUSTOMER.DISPUTE')) {
        await chargebackWebhookService.processPayPalDisputeEvent(webhookBody);
      } else {
        // Log other events for potential future handling
        safeLogger.info(`Unhandled PayPal webhook event: ${eventType}`, {
          resourceType: webhookBody.resource_type,
          summary: webhookBody.summary
        });
      }

      res.status(200).json({ received: true });

    } catch (error) {
      safeLogger.error('PayPal webhook processing error:', error);
      res.status(500).json({
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Health check endpoint for PayPal webhook
   */
  router.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'paypal-webhook',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}
