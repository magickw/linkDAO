import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { StripePaymentService } from '../services/stripePaymentService';
import { PurchaseRequest } from '../types/ldaoAcquisition';

export class FiatPaymentController {
  private stripeService: StripePaymentService;

  constructor(stripeService: StripePaymentService) {
    this.stripeService = stripeService;
  }

  public createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { amount, userAddress, currency = 'usd' } = req.body;

      // Validation
      if (!amount || !userAddress) {
        res.status(400).json({ 
          error: 'Missing required fields: amount, userAddress' 
        });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({ 
          error: 'Amount must be greater than 0' 
        });
        return;
      }

      if (amount > 10000) { // Max $10,000 per transaction
        res.status(400).json({ 
          error: 'Amount exceeds maximum limit of $10,000' 
        });
        return;
      }

      const purchaseRequest: PurchaseRequest = {
        amount: parseFloat(amount),
        paymentMethod: 'fiat',
        userAddress,
      };

      const result = await this.stripeService.processPayment(purchaseRequest);

      if (result.success) {
        res.status(200).json({
          success: true,
          paymentIntentId: result.transactionId,
          estimatedTokens: result.estimatedTokens,
          finalPrice: result.finalPrice,
          currency,
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
  };

  public confirmPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        res.status(400).json({ 
          error: 'Missing paymentIntentId' 
        });
        return;
      }

      const result = await this.stripeService.confirmPayment(paymentIntentId);

      res.status(200).json(result);
    } catch (error) {
      safeLogger.error('Payment confirmation error:', error);
      res.status(500).json({ 
        error: 'Failed to confirm payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ 
          error: 'Missing payment intent ID' 
        });
        return;
      }

      const paymentIntent = await this.stripeService.getPaymentIntent(id);

      if (!paymentIntent) {
        res.status(404).json({ 
          error: 'Payment intent not found' 
        });
        return;
      }

      res.status(200).json({
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      });
    } catch (error) {
      safeLogger.error('Payment status retrieval error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve payment status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        safeLogger.error('Missing Stripe signature');
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      const event = await this.stripeService.handleWebhook(req.body, signature);
      
      if (!event) {
        safeLogger.error('Invalid webhook signature');
        res.status(400).json({ error: 'Invalid signature' });
        return;
      }

      // Process the webhook event
      await this.stripeService.processWebhookEvent(event);

      res.status(200).json({ received: true });
    } catch (error) {
      safeLogger.error('Stripe webhook error:', error);
      res.status(500).json({ 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public createCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, name } = req.body;

      if (!email) {
        res.status(400).json({ 
          error: 'Email is required' 
        });
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ 
          error: 'Invalid email format' 
        });
        return;
      }

      const customerId = await this.stripeService.createCustomer(email, name);

      res.status(200).json({ 
        success: true,
        customerId 
      });
    } catch (error) {
      safeLogger.error('Customer creation error:', error);
      res.status(500).json({ 
        error: 'Failed to create customer',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public createSetupIntent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { customerId } = req.body;

      const result = await this.stripeService.createSetupIntent(customerId);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      safeLogger.error('Setup intent creation error:', error);
      res.status(500).json({ 
        error: 'Failed to create setup intent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public getPaymentMethods = async (req: Request, res: Response): Promise<void> => {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        res.status(400).json({ 
          error: 'Missing customer ID' 
        });
        return;
      }

      const paymentMethods = await this.stripeService.getPaymentMethods(customerId);

      res.status(200).json({ 
        success: true,
        paymentMethods: paymentMethods.map(pm => ({
          id: pm.id,
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          } : null,
        }))
      });
    } catch (error) {
      safeLogger.error('Payment methods retrieval error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve payment methods',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public processRefund = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentIntentId, amount, reason } = req.body;

      if (!paymentIntentId) {
        res.status(400).json({ 
          error: 'Missing paymentIntentId' 
        });
        return;
      }

      if (amount && amount <= 0) {
        res.status(400).json({ 
          error: 'Refund amount must be greater than 0' 
        });
        return;
      }

      const result = await this.stripeService.processRefund(paymentIntentId, amount);

      res.status(200).json({
        ...result,
        reason: reason || 'requested_by_customer'
      });
    } catch (error) {
      safeLogger.error('Refund processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process refund',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public retryPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        res.status(400).json({ 
          error: 'Missing paymentIntentId' 
        });
        return;
      }

      const result = await this.stripeService.retryPayment(paymentIntentId);

      res.status(200).json(result);
    } catch (error) {
      safeLogger.error('Payment retry error:', error);
      res.status(500).json({ 
        error: 'Failed to retry payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public getSupportedMethods = async (req: Request, res: Response): Promise<void> => {
    try {
      const methods = this.stripeService.getSupportedMethods();
      
      res.status(200).json({ 
        success: true,
        methods,
        supportedCards: ['visa', 'mastercard', 'amex', 'discover'],
        supportedWallets: ['apple_pay', 'google_pay'],
      });
    } catch (error) {
      safeLogger.error('Supported methods retrieval error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve supported methods',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
