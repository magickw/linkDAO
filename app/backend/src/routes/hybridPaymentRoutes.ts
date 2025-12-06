import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * Get checkout recommendation based on cart and context
 */
router.post('/recommend-path', (req, res) => {
  const { amount, currency, buyerAddress, sellerAddress } = req.body;

  // Mock logic for recommendation
  // In a real implementation, this would analyze gas fees, user preferences, etc.

  // Default to crypto if under $50, otherwise fiat (just as an example logic)
  // or purely random/static for now since we want to unblock frontend

  const isCryptoPreferred = amount < 50;

  const cryptoFees = (amount * 0.01) + 2; // Mock gas + fee
  const fiatFees = (amount * 0.029) + 0.30; // Stripe standard

  res.json({
    success: true,
    data: {
      selectedPath: isCryptoPreferred ? 'crypto' : 'fiat',
      reason: isCryptoPreferred
        ? 'Gas fees are low right now, saving you money.'
        : 'Credit card is faster for this amount.',
      method: {
        tokenSymbol: 'USDC',
        chainId: 1
      },
      fees: {
        totalFees: isCryptoPreferred ? cryptoFees : fiatFees
      },
      estimatedTime: isCryptoPreferred ? '1-3 mins' : 'Instant',
      fallbackOptions: [
        {
          selectedPath: isCryptoPreferred ? 'fiat' : 'crypto',
          fees: isCryptoPreferred ? fiatFees : cryptoFees
        }
      ]
    }
  });
});

/**
 * Compare payment methods
 */
router.get('/comparison', (req, res) => {
  const { amount } = req.query;
  const numAmount = parseFloat(amount as string) || 0;

  res.json({
    success: true,
    data: {
      crypto: {
        fees: (numAmount * 0.01) + 2,
        time: '1-3 mins'
      },
      fiat: {
        fees: (numAmount * 0.029) + 0.30,
        time: 'Instant'
      }
    }
  });
});

/**
 * Process a unified checkout
 */
router.post('/checkout', authMiddleware, (req, res) => {
  // Mock successful response
  const { paymentMethodDetails, amount } = req.body;

  // Simulate processing delay
  setTimeout(() => {
  }, 100);

  const orderId = `ord_${Math.random().toString(36).substring(7)}`;

  res.json({
    success: true,
    data: {
      orderId: orderId,
      paymentPath: paymentMethodDetails?.type?.includes('stripe') ? 'fiat' : 'crypto',
      escrowType: paymentMethodDetails?.type?.includes('stripe') ? 'stripe_connect' : 'smart_contract',
      stripePaymentIntentId: 'pi_mock_' + Math.random().toString(36).substring(7),
      escrowId: '0x' + Math.random().toString(16).substring(2, 42), // Mock hex string
      status: 'pending', // or processing
      estimatedCompletionTime: new Date(Date.now() + 5 * 60000).toISOString()
    }
  });
});

export default router;
