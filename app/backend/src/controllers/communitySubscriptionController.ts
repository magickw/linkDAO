import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { communityService } from '../services/communityService';

export class CommunitySubscriptionController {
  /**
   * Get subscription tiers for a community
   */
  async getSubscriptionTiers(req: Request, res: Response) {
    try {
      const { id: communityId } = req.params;

      const tiers = await communityService.getSubscriptionTiers(communityId);

      res.json({
        success: true,
        data: tiers
      });
    } catch (error) {
      safeLogger.error('Error fetching subscription tiers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription tiers'
      });
    }
  }

  /**
   * Get user's subscription status
   */
  async getUserSubscription(req: Request, res: Response) {
    try {
      const { id: communityId, userAddress } = req.params;

      // Using getUserSubscriptions instead of getUserSubscription
      const subscriptions = await communityService.getUserSubscriptions(
        userAddress,
        communityId
      );

      const subscription = subscriptions.length > 0 ? subscriptions[0] : null;

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found'
        });
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      safeLogger.error('Error fetching user subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription'
      });
    }
  }

  /**
   * Create subscription tier
   */
  async createSubscriptionTier(req: Request, res: Response) {
    try {
      const { id: communityId } = req.params;
      const {
        name,
        description,
        price,
        currency,
        benefits,
        accessLevel,
        durationDays,
        isActive = true,
        metadata
      } = req.body;

      // Validate required fields
      if (!name || !price || !currency || !accessLevel) {
        return res.status(400).json({
          success: false,
          error: 'Name, price, currency, and accessLevel are required'
        });
      }

      // Validate access level
      if (!['view', 'interact', 'full'].includes(accessLevel)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid access level. Must be view, interact, or full'
        });
      }

      const result = await communityService.createSubscriptionTier({
        communityId,
        name,
        description,
        price: price.toString(),
        currency,
        benefits: benefits || [],
        accessLevel,
        durationDays: durationDays || 30,
        isActive,
        metadata
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message || 'Failed to create subscription tier'
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      safeLogger.error('Error creating subscription tier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create subscription tier'
      });
    }
  }

  /**
   * Subscribe user to a tier
   */
  async subscribeUser(req: Request, res: Response) {
    try {
      const { id: communityId } = req.params;
      const { tierId, paymentTxHash, metadata } = req.body;

      // Get user address from authenticated request
      const userAddress = (req as any).user?.address;
      if (!userAddress) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Validate required fields
      if (!tierId) {
        return res.status(400).json({
          success: false,
          error: 'Tier ID is required'
        });
      }

      const result = await communityService.subscribeUser({
        communityId,
        tierId,
        userAddress,
        paymentTxHash,
        metadata
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message || 'Failed to subscribe user'
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      safeLogger.error('Error subscribing user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to subscribe user'
      });
    }
  }

  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(req: Request, res: Response) {
    try {
      const { tierId, successUrl, cancelUrl } = req.body;

      // Validate required fields
      if (!tierId || !successUrl || !cancelUrl) {
        return res.status(400).json({
          success: false,
          error: 'Tier ID, success URL, and cancel URL are required'
        });
      }

      const result = await communityService.createCheckoutSession({
        tierId,
        successUrl,
        cancelUrl
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message || 'Failed to create checkout session'
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      safeLogger.error('Error creating checkout session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create checkout session'
      });
    }
  }

  /**
   * Process crypto payment
   */
  async processCryptoPayment(req: Request, res: Response) {
    try {
      const { tierId, paymentTxHash, userAddress } = req.body;

      // Validate required fields
      if (!tierId || !paymentTxHash || !userAddress) {
        return res.status(400).json({
          success: false,
          error: 'Tier ID, payment transaction hash, and user address are required'
        });
      }

      const result = await communityService.processCryptoPayment({
        tierId,
        paymentTxHash,
        userAddress
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message || 'Failed to process crypto payment'
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      safeLogger.error('Error processing crypto payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process crypto payment'
      });
    }
  }

  /**
   * Webhook handler for Stripe events
   */
  async handleStripeWebhook(req: Request, res: Response) {
    try {
      // Method not implemented yet
      res.status(501).json({ error: 'Method not implemented yet' });
    } catch (error) {
      safeLogger.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook handler failed' });
    }
  }

  /**
   * Handle successful checkout
   */
  private async handleCheckoutCompleted(session: any) {
    const { metadata, customer, subscription } = session;
    const { communityId, tierId, userAddress, billingPeriod } = metadata;

    // Note: The actual subscription creation would need to be handled differently
    // since we need to use subscribeUser to create a user subscription
    safeLogger.info('Checkout completed event received:', { 
      communityId, 
      tierId, 
      userAddress, 
      billingPeriod,
      customer,
      subscription
    });
  }

  /**
   * Handle subscription update
   */
  private async handleSubscriptionUpdated(subscription: any) {
    const { metadata, status } = subscription;
    
    // Note: updateSubscriptionStatus doesn't exist in the service
    // This would need to be implemented or handled differently
    safeLogger.info('Subscription update event received:', { subscriptionId: subscription.id, status });
  }

  /**
   * Handle subscription cancellation
   */
  private async handleSubscriptionCancelled(subscription: any) {
    // Note: updateSubscriptionStatus doesn't exist in the service
    // This would need to be implemented or handled differently
    safeLogger.info('Subscription cancellation event received:', { subscriptionId: subscription.id });
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: any) {
    const { subscription } = invoice;
    
    // Notify user about failed payment
    // Could trigger grace period or suspend access
    safeLogger.info('Payment failed for subscription:', subscription);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(req: Request, res: Response) {
    try {
      // Method not implemented yet
      res.status(501).json({
        success: false,
        error: 'Method not implemented yet'
      });
    } catch (error) {
      safeLogger.error('Error cancelling subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel subscription'
      });
    }
  }

  /**
   * Calculate end date based on billing period
   */
  private calculateEndDate(billingPeriod: 'monthly' | 'yearly'): Date {
    const endDate = new Date();
    if (billingPeriod === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    return endDate;
  }
}

export const communitySubscriptionController = new CommunitySubscriptionController();
