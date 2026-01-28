import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { authMiddleware } from '../middleware/authMiddleware';
import { StripePaymentService } from '../services/stripePaymentService';
import { stripeConnectService } from '../services/stripeConnectService';
import { getPrimaryFrontendUrl } from '../utils/urlUtils';
import { sellerProfileService } from '../services/sellerProfileService';

export function createStripeConnectRoutes(stripeService: StripePaymentService): express.Router {
  const router = express.Router();

  // Middleware to ensure user is authenticated
  router.use(authMiddleware);

  /**
   * POST /onboard
   * Initiates the Stripe Connect onboarding flow
   */
  router.post('/onboard', async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || !user.walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const walletAddress = user.walletAddress;
      const { country = 'US', businessType = 'individual', email } = req.body;

      // Check if seller profile exists
      const sellerProfile = await sellerProfileService.getProfile(walletAddress);
      if (!sellerProfile) {
        return res.status(404).json({ error: 'Seller profile not found' });
      }

      // Check for existing Stripe Connect account
      let connectAccount = await stripeConnectService.getAccountByAddress(walletAddress);
      let accountId: string;

      if (connectAccount && connectAccount.stripeAccountId) {
        accountId = connectAccount.stripeAccountId;
      } else {
        // Create new Connect account
        accountId = await stripeService.createConnectAccount(
          email || user.email || `seller_${walletAddress.substring(2, 8)}@linkdao.network`,
          businessType,
          country
        );

        // Save to DB
        await stripeConnectService.createOrUpdateAccount(walletAddress, accountId, {
          accountStatus: 'pending',
          payoutsEnabled: false,
          chargesEnabled: false
        });
      }

      // Generate Account Link
      const frontendUrl = getPrimaryFrontendUrl();
      const returnUrl = `${frontendUrl}/dashboard/seller?tab=payout&status=return`;
      const refreshUrl = `${frontendUrl}/dashboard/seller?tab=payout&status=refresh`;

      const accountLink = await stripeService.createAccountLink(accountId, refreshUrl, returnUrl);

      res.status(200).json({ 
        url: accountLink,
        stripeAccountId: accountId
      });

    } catch (error) {
      safeLogger.error('Stripe Connect onboarding error:', error);
      res.status(500).json({ 
        error: 'Failed to start onboarding',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /status
   * Checks the status of the connected account
   */
  router.get('/status', async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || !user.walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const walletAddress = user.walletAddress;
      const connectAccount = await stripeConnectService.getAccountByAddress(walletAddress);

      if (!connectAccount) {
        return res.status(200).json({ 
          connected: false,
          status: 'not_created'
        });
      }

      // Fetch latest status from Stripe
      const stripeAccount = await stripeService.getConnectAccount(connectAccount.stripeAccountId);
      
      // Update DB with latest status
      await stripeConnectService.updateAccountStatus(connectAccount.stripeAccountId, {
        payoutsEnabled: stripeAccount.payouts_enabled,
        chargesEnabled: stripeAccount.charges_enabled,
        requirements: stripeAccount.requirements,
        detailsSubmitted: stripeAccount.details_submitted
      });

      // Update seller profile payout_setup step if connected
      if (stripeAccount.details_submitted && stripeAccount.payouts_enabled) {
        await sellerProfileService.updateOnboardingStep(walletAddress, 'payout_setup', true);
      }

      res.status(200).json({
        connected: true,
        stripeAccountId: connectAccount.stripeAccountId,
        detailsSubmitted: stripeAccount.details_submitted,
        payoutsEnabled: stripeAccount.payouts_enabled,
        chargesEnabled: stripeAccount.charges_enabled,
        requirements: stripeAccount.requirements
      });

    } catch (error) {
      safeLogger.error('Stripe Connect status check error:', error);
      res.status(500).json({ 
        error: 'Failed to check status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /login-link
   * Generates a login link for the Stripe Express dashboard
   */
  router.post('/login-link', async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || !user.walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const connectAccount = await stripeConnectService.getAccountByAddress(user.walletAddress);
      
      if (!connectAccount || !connectAccount.stripeAccountId) {
        return res.status(404).json({ error: 'No connected account found' });
      }

      const loginLink = await stripeService.createLoginLink(connectAccount.stripeAccountId);

      res.status(200).json({ url: loginLink });

    } catch (error) {
      safeLogger.error('Stripe login link creation error:', error);
      res.status(500).json({ 
        error: 'Failed to create login link',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
