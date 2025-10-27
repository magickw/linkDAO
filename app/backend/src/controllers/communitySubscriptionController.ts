import { Request, Response } from 'express';
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
      console.error('Error fetching subscription tiers:', error);
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

      const subscription = await communityService.getUserSubscription(
        communityId,
        userAddress
      );

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
      console.error('Error fetching user subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription'
      });
    }
  }

  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(req: Request, res: Response) {
    try {
      const { id: communityId } = req.params;
      const { tierId, billingPeriod, userAddress } = req.body;

      if (!tierId || !billingPeriod || !userAddress) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Get tier details
      const tier = await communityService.getSubscriptionTier(communityId, tierId);
      if (!tier) {
        return res.status(404).json({
          success: false,
          error: 'Subscription tier not found'
        });
      }

      // Create Stripe checkout session
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      const price = billingPeriod === 'monthly' 
        ? tier.priceMonthly 
        : tier.priceYearly;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tier.name} - ${tier.description}`,
              description: `Subscription to ${communityId}`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
            recurring: {
              interval: billingPeriod === 'monthly' ? 'month' : 'year',
            },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/communities/${communityId}?subscription=success`,
        cancel_url: `${process.env.FRONTEND_URL}/communities/${communityId}?subscription=cancelled`,
        client_reference_id: userAddress,
        metadata: {
          communityId,
          tierId,
          userAddress,
          billingPeriod,
        },
      });

      res.json({
        success: true,
        data: {
          checkoutUrl: session.url,
          sessionId: session.id,
        }
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
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
      const { id: communityId } = req.params;
      const { tierId, billingPeriod, userAddress } = req.body;

      if (!tierId || !billingPeriod || !userAddress) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Get tier details
      const tier = await communityService.getSubscriptionTier(communityId, tierId);
      if (!tier) {
        return res.status(404).json({
          success: false,
          error: 'Subscription tier not found'
        });
      }

      // Get community treasury address
      const community = await communityService.getCommunityById(communityId);
      if (!community?.treasuryAddress) {
        return res.status(400).json({
          success: false,
          error: 'Community treasury not configured'
        });
      }

      const price = billingPeriod === 'monthly' 
        ? tier.priceMonthly 
        : tier.priceYearly;

      res.json({
        success: true,
        data: {
          paymentAddress: community.treasuryAddress,
          amount: price.toString(),
          tokenAddress: tier.currency === 'ETH' 
            ? '0x0000000000000000000000000000000000000000' 
            : process.env.LDAO_TOKEN_ADDRESS,
          tokenSymbol: tier.currency,
          communityId,
          tierId,
          billingPeriod,
        }
      });
    } catch (error) {
      console.error('Error processing crypto payment:', error);
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
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const sig = req.headers['stripe-signature'];

      if (!sig) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook handler failed' });
    }
  }

  /**
   * Handle successful checkout
   */
  private async handleCheckoutCompleted(session: any) {
    const { metadata, customer, subscription } = session;
    const { communityId, tierId, userAddress, billingPeriod } = metadata;

    // Create subscription record in database
    await communityService.createSubscription({
      communityId,
      tierId,
      userId: userAddress,
      status: 'active',
      billingPeriod,
      stripeCustomerId: customer,
      stripeSubscriptionId: subscription,
      startDate: new Date(),
      endDate: this.calculateEndDate(billingPeriod),
      autoRenew: true,
    });
  }

  /**
   * Handle subscription update
   */
  private async handleSubscriptionUpdated(subscription: any) {
    const { metadata, status } = subscription;
    
    await communityService.updateSubscriptionStatus(
      subscription.id,
      status === 'active' ? 'active' : 'cancelled'
    );
  }

  /**
   * Handle subscription cancellation
   */
  private async handleSubscriptionCancelled(subscription: any) {
    await communityService.updateSubscriptionStatus(
      subscription.id,
      'cancelled'
    );
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: any) {
    const { subscription } = invoice;
    
    // Notify user about failed payment
    // Could trigger grace period or suspend access
    console.log('Payment failed for subscription:', subscription);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(req: Request, res: Response) {
    try {
      const { id: communityId, subscriptionId } = req.params;
      const { userAddress } = req.body;

      // Verify ownership
      const subscription = await communityService.getSubscription(subscriptionId);
      if (!subscription || subscription.userId !== userAddress) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Cancel in Stripe if applicable
      if (subscription.stripeSubscriptionId) {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      }

      // Update database
      await communityService.updateSubscriptionStatus(subscriptionId, 'cancelled');

      res.json({
        success: true,
        message: 'Subscription cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
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
