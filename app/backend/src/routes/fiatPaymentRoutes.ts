import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { StripePaymentService } from '../services/stripePaymentService';
import { PurchaseRequest } from '../types/ldaoAcquisition';

export function createFiatPaymentRoutes(stripeService: StripePaymentService): express.Router {
  const router = express.Router();

  // Create payment intent
  router.post('/create-payment-intent', csrfProtection,  async (req, res) => {
    try {
      const { amount, userAddress } = req.body;

      if (!amount || !userAddress) {
        return res.status(400).json({ 
          error: 'Missing required fields: amount, userAddress' 
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ 
          error: 'Amount must be greater than 0' 
        });
      }

      const purchaseRequest: PurchaseRequest = {
        amount: parseFloat(amount),
        paymentMethod: 'fiat',
        userAddress,
      };

      const result = await stripeService.processPayment(purchaseRequest);

      if (result.success) {
        res.status(200).json({
          success: true,
          paymentIntentId: result.transactionId,
          clientSecret: result.clientSecret,
          estimatedTokens: result.estimatedTokens,
          finalPrice: result.finalPrice,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      safeLogger.error('Payment intent creation error:', error);
      res.status(500).json({ 
        error: 'Failed to create payment intent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Confirm payment
  router.post('/confirm-payment', csrfProtection,  async (req, res) => {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ 
          error: 'Missing paymentIntentId' 
        });
      }

      const result = await stripeService.confirmPayment(paymentIntentId);

      res.status(200).json(result);
    } catch (error) {
      safeLogger.error('Payment confirmation error:', error);
      res.status(500).json({ 
        error: 'Failed to confirm payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get payment intent status
  router.get('/payment-intent/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const paymentIntent = await stripeService.getPaymentIntent(id);

      if (!paymentIntent) {
        return res.status(404).json({ 
          error: 'Payment intent not found' 
        });
      }

      res.status(200).json(paymentIntent);
    } catch (error) {
      safeLogger.error('Payment intent retrieval error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve payment intent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create setup intent for saving payment methods
  router.post('/create-setup-intent', csrfProtection,  async (req, res) => {
    try {
      const { customerId } = req.body;

      const result = await stripeService.createSetupIntent(customerId);

      res.status(200).json(result);
    } catch (error) {
      safeLogger.error('Setup intent creation error:', error);
      res.status(500).json({ 
        error: 'Failed to create setup intent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create customer
  router.post('/create-customer', csrfProtection,  async (req, res) => {
    try {
      const { email, name } = req.body;

      if (!email) {
        return res.status(400).json({ 
          error: 'Email is required' 
        });
      }

      const customerId = await stripeService.createCustomer(email, name);

      res.status(200).json({ customerId });
    } catch (error) {
      safeLogger.error('Customer creation error:', error);
      res.status(500).json({ 
        error: 'Failed to create customer',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get customer payment methods
  router.get('/customer/:customerId/payment-methods', async (req, res) => {
    try {
      const { customerId } = req.params;

      const paymentMethods = await stripeService.getPaymentMethods(customerId);

      res.status(200).json({ paymentMethods });
    } catch (error) {
      safeLogger.error('Payment methods retrieval error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve payment methods',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Process refund
  router.post('/refund', csrfProtection,  async (req, res) => {
    try {
      const { paymentIntentId, amount } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ 
          error: 'Missing paymentIntentId' 
        });
      }

      const result = await stripeService.processRefund(paymentIntentId, amount);

      res.status(200).json(result);
    } catch (error) {
      safeLogger.error('Refund processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process refund',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Retry payment
  router.post('/retry-payment', csrfProtection,  async (req, res) => {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ 
          error: 'Missing paymentIntentId' 
        });
      }

      const result = await stripeService.retryPayment(paymentIntentId);

      res.status(200).json(result);
    } catch (error) {
      safeLogger.error('Payment retry error:', error);
      res.status(500).json({ 
        error: 'Failed to retry payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get supported payment methods
  router.get('/supported-methods', async (req, res) => {
    try {
      const methods = stripeService.getSupportedMethods();
      res.status(200).json({ methods });
    } catch (error) {
      safeLogger.error('Supported methods retrieval error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve supported methods',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
