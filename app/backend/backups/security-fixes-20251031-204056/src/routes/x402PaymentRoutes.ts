import express = require('express');
import { x402PaymentService } from '../services/x402PaymentService';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';

const router = express.Router();

/**
 * Process an x402 payment
 * POST /api/x402/payment
 */
router.post('/payment', csrfProtection,  async (req, res) => {
  try {
    const { orderId, amount, currency, buyerAddress, sellerAddress, listingId } = req.body;

    // Validate required fields
    if (!orderId || !amount || !currency || !buyerAddress || !sellerAddress || !listingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId, amount, currency, buyerAddress, sellerAddress, listingId'
      });
    }

    // Process the x402 payment
    const paymentResult = await x402PaymentService.processPayment({
      orderId,
      amount,
      currency,
      buyerAddress,
      sellerAddress,
      listingId
    });

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'Failed to process x402 payment'
      });
    }

    res.status(200).json({
      success: true,
      data: paymentResult
    });
  } catch (error) {
    safeLogger.error('Error processing x402 payment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Check the status of an x402 payment
 * GET /api/x402/payment/:transactionId
 */
router.get('/payment/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing transactionId parameter'
      });
    }

    // Check the payment status
    const paymentResult = await x402PaymentService.checkPaymentStatus(transactionId);

    res.status(200).json({
      success: true,
      data: paymentResult
    });
  } catch (error) {
    safeLogger.error('Error checking x402 payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Refund an x402 payment
 * POST /api/x402/payment/:transactionId/refund
 */
router.post('/payment/:transactionId/refund', csrfProtection,  async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing transactionId parameter'
      });
    }

    // Process the refund
    const refundResult = await x402PaymentService.refundPayment(transactionId);

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        error: refundResult.error || 'Failed to process refund'
      });
    }

    res.status(200).json({
      success: true,
      data: refundResult
    });
  } catch (error) {
    safeLogger.error('Error processing x402 refund:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;