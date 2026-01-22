import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { HybridPaymentOrchestrator } from '../services/hybridPaymentOrchestrator';
import { safeLogger } from '../utils/safeLogger';
import { serializeBigInt } from '../utils/bigIntSerializer';

const router = express.Router();
const paymentOrchestrator = new HybridPaymentOrchestrator();

/**
 * Get checkout recommendation based on real market data
 */
router.post('/recommend-path', async (req, res) => {
  try {
    const { amount, currency, buyerAddress, sellerAddress, preferredMethod, userCountry } = req.body;

    // Validate required fields
    if (!amount || !currency || !buyerAddress || !sellerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, currency, buyerAddress, sellerAddress'
      });
    }

    // Create checkout request
    const checkoutRequest = {
      orderId: `temp_${Date.now()}`, // Temporary ID for recommendation
      listingId: 'recommendation', // Special ID for recommendations
      buyerAddress,
      sellerAddress,
      amount: parseFloat(amount),
      currency,
      preferredMethod,
      userCountry
    };

    // Get intelligent payment path recommendation
    const pathDecision = await paymentOrchestrator.determineOptimalPaymentPath(checkoutRequest);

    // Get real-time market data for additional context
    const marketData = await getMarketData();

    // Enhance recommendation with market insights
    const enhancedRecommendation = {
      ...pathDecision,
      marketContext: {
        gasPrice: marketData.gasPrice,
        ethPrice: marketData.ethPrice,
        networkCongestion: marketData.networkCongestion,
        recommendation: marketData.recommendation
      }
    };

    res.json({
      success: true,
      data: enhancedRecommendation
    });
  } catch (error) {
    safeLogger.error('Error in payment path recommendation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate payment recommendation'
    });
  }
});

/**
 * Fetch real-time market data
 */
async function getMarketData() {
  try {
    // Get gas prices from multiple sources for accuracy
    const gasPromises = [
      fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle').then(r => r.json()),
      fetch('https://gasstation-mainnet.matic.network').then(r => r.json()).catch(() => null)
    ];

    const [etherscanGas, polygonGas] = await Promise.allSettled(gasPromises);

    let gasPrice = '20'; // Default fallback in gwei
    let networkCongestion = 'low';

    if (etherscanGas.status === 'fulfilled' && etherscanGas.value.result) {
      gasPrice = etherscanGas.value.result.SafeGasPrice || '20';

      // Determine congestion based on gas price
      const gasGwei = parseFloat(gasPrice);
      if (gasGwei > 50) {
        networkCongestion = 'high';
      } else if (gasGwei > 30) {
        networkCongestion = 'medium';
      }
    }

    // Get ETH price from CoinGecko
    const ethPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const ethPriceData = await ethPriceResponse.json();
    const ethPrice = ethPriceData.ethereum?.usd || 2000;

    // Get USDC price (should be ~$1 but we check anyway)
    const usdcPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd');
    const usdcPriceData = await usdcPriceResponse.json();
    const usdcPrice = usdcPriceData['usd-coin']?.usd || 1;

    // Calculate recommendation based on current conditions
    let recommendation = 'fiat'; // Default
    if (networkCongestion === 'low' && ethPrice < 2500) {
      recommendation = 'crypto'; // Prefer crypto when gas is cheap and ETH price is reasonable
    }

    return {
      gasPrice,
      ethPrice,
      usdcPrice,
      networkCongestion,
      recommendation,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    safeLogger.warn('Failed to fetch market data, using defaults:', error);

    // Return conservative defaults
    return {
      gasPrice: '20',
      ethPrice: 2000,
      usdcPrice: 1,
      networkCongestion: 'medium',
      recommendation: 'fiat',
      timestamp: new Date().toISOString()
    };
  }
}

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
 * Process a unified checkout with real payment processing
 */
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const {
      orderId,
      listingId,
      buyerAddress,
      sellerAddress,
      amount,
      currency,
      preferredMethod,
      userCountry,
      paymentMethodDetails,
      shippingAddress,
      shippingCost
    } = req.body;

    // Validate required fields
    if (!orderId || !listingId || !buyerAddress || !sellerAddress || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields for checkout'
      });
    }

    // Create checkout request
    const checkoutRequest = {
      orderId,
      listingId,
      buyerAddress,
      sellerAddress,
      amount: parseFloat(amount),
      currency,
      preferredMethod,
      userCountry,
      metadata: paymentMethodDetails,
      shippingAddress,
      shippingCost: shippingCost ? parseFloat(shippingCost) : 0
    };

    // Process checkout with real payment integration
    const checkoutResult = await paymentOrchestrator.processHybridCheckout(checkoutRequest);

    res.json({
      success: true,
      data: serializeBigInt({
        ...checkoutResult,
        estimatedCompletionTime: checkoutResult.estimatedCompletionTime.toISOString()
      })
    });
  } catch (error) {
    safeLogger.error('Error processing checkout:', error);

    // Provide specific error messages for common issues
    let errorMessage = 'Checkout processing failed';
    let errorDetails: any = {};
    let statusCode = 500;

    if (error instanceof Error) {
      errorDetails.message = error.message;
      errorDetails.name = error.name;

      if (error.message.includes('insufficient')) {
        errorMessage = 'Insufficient inventory or balance';
        statusCode = 400;
      } else if (error.message.includes('Stripe')) {
        errorMessage = 'Payment processing error. Please try another payment method';
        statusCode = 400;
      } else if (error.message.includes('network') || error.message.includes('Crypto payment failed') || error.message.includes('Escrow validation failed') || error.message.includes('Failed to check buyer balance')) {
        errorMessage = 'Network error or transaction failed. Please try again';
        statusCode = 400;
      } else if (error.message.includes('user records') || error.message.includes('Failed to find user') || error.message.includes('account not found')) {
        errorMessage = 'User account not found. Please ensure you are logged in.';
        statusCode = 401;
      } else if (error.message.includes('Product not found') || error.message.includes('listing')) {
        errorMessage = 'Product not found or no longer available';
        statusCode = 404;
      } else if (error.message.includes('inventory')) {
        errorMessage = 'Product is out of stock';
        statusCode = 409;
      } else if (error.message.includes('minimum amount')) {
        errorMessage = error.message; // Return the specific minimum amount error
        statusCode = 400;
      } else if (error.message.includes('not initialized')) {
        errorMessage = 'Service temporarily unavailable (Configuration Error). Please contact support.';
        statusCode = 503;
      } else if (error.message.includes('Invalid addresses') || error.message.includes('validation failed')) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message.includes('database')) {
        errorMessage = 'System error: Database operation failed';
        statusCode = 500;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

/**
 * Get unified order status
 */
router.get('/orders/:orderId/status', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const orderStatus = await paymentOrchestrator.getUnifiedOrderStatus(orderId);

    res.json({
      success: true,
      data: orderStatus
    });
  } catch (error) {
    safeLogger.error('Error getting order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order status'
    });
  }
});

/**
 * Handle order fulfillment (confirm delivery, release funds, dispute)
 */
router.post('/orders/:orderId/fulfill', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, metadata } = req.body;

    if (!orderId || !action) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and action are required'
      });
    }

    // Validate action
    const validActions = ['confirm_delivery', 'release_funds', 'dispute'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }

    await paymentOrchestrator.handleOrderFulfillment(orderId, action, metadata);

    res.json({
      success: true,
      message: `Order ${action} processed successfully`
    });
  } catch (error) {
    safeLogger.error('Error handling order fulfillment:', error);

    let errorMessage = 'Order fulfillment failed';
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        errorMessage = 'Order not found';
      } else if (error.message.includes('already')) {
        errorMessage = 'Order is already in a state that prevents this action';
      }
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * Capture Stripe payment (for when delivery is confirmed)
 */
router.post('/orders/:orderId/capture-payment', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    const captureResult = await paymentOrchestrator.captureStripePayment(paymentIntentId, orderId);

    res.json({
      success: true,
      data: captureResult
    });
  } catch (error) {
    safeLogger.error('Error capturing Stripe payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to capture payment'
    });
  }
});

/**
 * Refund Stripe payment
 */
router.post('/orders/:orderId/refund-payment', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentIntentId, reason } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    const refundResult = await paymentOrchestrator.refundStripePayment(paymentIntentId, orderId, reason);

    res.json({
      success: true,
      data: refundResult
    });
  } catch (error) {
    safeLogger.error('Error refunding Stripe payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund'
    });
  }
});

/**
 * Verify crypto escrow transaction
 */
router.post('/orders/:orderId/verify-transaction', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { transactionHash, escrowId } = req.body;

    if (!transactionHash || !escrowId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction hash and escrow ID are required'
      });
    }

    const { EnhancedEscrowService } = await import('../services/enhancedEscrowService');
    const escrowService = new EnhancedEscrowService(
      process.env.RPC_URL || '',
      process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS || '',
      process.env.MARKETPLACE_CONTRACT_ADDRESS || ''
    );

    const verificationResult = await escrowService.verifyEscrowTransaction(escrowId, transactionHash);

    res.json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    safeLogger.error('Error verifying transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify transaction'
    });
  }
});

export default router;
