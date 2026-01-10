import express from 'express';
import { x402PaymentService } from '../services/x402PaymentService';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { db } from '../db';
import { userGoldBalance, goldTransaction } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Gold packages configuration (same as in goldPurchaseRoutes)
const GOLD_PACKAGES = [
  { id: '100', name: 'Starter Stack', amount: 100, price: 1.79 },
  { id: '200', name: 'DeFi Degen', amount: 200, price: 3.59 },
  { id: '300', name: 'Whale Pack', amount: 300, price: 5.39 },
  { id: '500', name: 'Diamond Hands', amount: 500, price: 8.99 },
  { id: '1000', name: 'OG Collection', amount: 1000, price: 16.99 }
];

/**
 * x402 Gold Purchase endpoint
 * POST /api/x402/gold-purchase
 * Uses x402 protocol for ultra-low fee gold purchases
 */
router.post('/gold-purchase', async (req, res) => {
  try {
    const { packageId, amount, userId } = req.body;

    // Validate required fields
    if (!packageId || !userId) {
      safeLogger.warn('Missing required fields in x402 gold purchase request', {
        missingFields: { packageId: !packageId, userId: !userId }
      });

      return res.status(400).json({
        success: false,
        error: 'Missing required fields: packageId, userId'
      });
    }

    // Find the gold package
    const goldPackage = GOLD_PACKAGES.find(p => p.id === packageId);
    if (!goldPackage) {
      safeLogger.warn('Invalid gold package in x402 purchase', { packageId });
      return res.status(400).json({
        success: false,
        error: 'Invalid gold package'
      });
    }

    // Validate user address format
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethereumAddressRegex.test(userId)) {
      safeLogger.warn('Invalid user address in x402 gold purchase', { userId });
      return res.status(400).json({
        success: false,
        error: 'Invalid user address'
      });
    }

    safeLogger.info('Processing x402 gold purchase', { packageId, amount: goldPackage.price, userId });

    // Generate a transaction ID for the x402 payment
    const transactionId = `x402-gold-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // For x402 protocol, we process the payment through the x402 service
    // In production, this would interact with the actual x402 payment infrastructure
    const paymentResult = await x402PaymentService.processPayment({
      orderId: transactionId,
      amount: goldPackage.price.toString(),
      currency: 'USDC',
      buyerAddress: userId,
      sellerAddress: process.env.TREASURY_ADDRESS || '0xeF85C8CcC03320dA32371940b315D563be2585e5',
      listingId: `gold-package-${packageId}`
    });

    if (!paymentResult.success) {
      safeLogger.error('x402 gold purchase payment failed', {
        transactionId,
        error: paymentResult.error
      });

      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'x402 payment processing failed'
      });
    }

    // Update user's gold balance
    try {
      let userBalance = await db.select().from(userGoldBalance)
        .where(eq(userGoldBalance.userId, String(userId))).limit(1);

      if (!userBalance.length) {
        const newBalance = await db.insert(userGoldBalance).values({
          userId: String(userId),
          balance: 0,
          totalPurchased: 0,
        }).returning();
        userBalance = newBalance;
      }

      // Update gold balance
      await db.update(userGoldBalance)
        .set({
          balance: (userBalance[0]?.balance || 0) + goldPackage.amount,
          totalPurchased: (userBalance[0]?.totalPurchased || 0) + goldPackage.amount,
          lastPurchaseAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userGoldBalance.userId, String(userId)));

      // Create transaction record
      await db.insert(goldTransaction).values({
        userId: String(userId),
        amount: goldPackage.amount,
        type: 'purchase',
        price: String(goldPackage.price),
        paymentMethod: 'x402',
        paymentIntentId: transactionId,
        network: 'base',
        transactionHash: paymentResult.transactionId || transactionId,
        status: 'completed',
        createdAt: new Date(),
      });

      safeLogger.info('x402 gold purchase completed successfully', {
        transactionId,
        userId,
        goldAmount: goldPackage.amount
      });

      res.status(200).json({
        success: true,
        transactionId: transactionId,
        goldAmount: goldPackage.amount,
        newBalance: (userBalance[0]?.balance || 0) + goldPackage.amount
      });
    } catch (dbError) {
      safeLogger.error('Database error during x402 gold purchase:', dbError);
      // Payment went through but DB update failed - log for manual resolution
      res.status(500).json({
        success: false,
        error: 'Payment processed but failed to update balance. Please contact support.',
        transactionId: transactionId
      });
    }
  } catch (error) {
    safeLogger.error('Error processing x402 gold purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during x402 gold purchase'
    });
  }
});

/**
 * Process an x402 payment
 * POST /api/x402/payment
 */
router.post('/payment', authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { orderId, amount, currency, buyerAddress, sellerAddress, listingId } = req.body;

    // Validate required fields
    if (!orderId || !amount || !currency || !buyerAddress || !sellerAddress || !listingId) {
      safeLogger.warn('Missing required fields in x402 payment request', { 
        missingFields: {
          orderId: !orderId,
          amount: !amount,
          currency: !currency,
          buyerAddress: !buyerAddress,
          sellerAddress: !sellerAddress,
          listingId: !listingId
        }
      });
      
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId, amount, currency, buyerAddress, sellerAddress, listingId'
      });
    }

    // Additional validation
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      safeLogger.warn('Invalid amount in x402 payment request', { amount });
      return res.status(400).json({
        success: false,
        error: 'Invalid amount: must be a positive number'
      });
    }

    // Validate Ethereum addresses
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethereumAddressRegex.test(buyerAddress)) {
      safeLogger.warn('Invalid buyer address in x402 payment request', { buyerAddress });
      return res.status(400).json({
        success: false,
        error: 'Invalid buyer address: must be a valid Ethereum address'
      });
    }

    if (!ethereumAddressRegex.test(sellerAddress)) {
      safeLogger.warn('Invalid seller address in x402 payment request', { sellerAddress });
      return res.status(400).json({
        success: false,
        error: 'Invalid seller address: must be a valid Ethereum address'
      });
    }

    safeLogger.info('Processing x402 payment request', { orderId, amount, currency });

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
      safeLogger.error('X402 payment processing failed', { 
        orderId, 
        error: paymentResult.error 
      });
      
      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'Failed to process x402 payment'
      });
    }

    safeLogger.info('X402 payment processed successfully', { 
      orderId, 
      transactionId: paymentResult.transactionId,
      status: paymentResult.status
    });

    res.status(200).json({
      success: true,
      data: paymentResult
    });
  } catch (error) {
    safeLogger.error('Error processing x402 payment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during x402 payment processing'
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
      safeLogger.warn('Missing transactionId parameter in x402 payment status request');
      return res.status(400).json({
        success: false,
        error: 'Missing transactionId parameter'
      });
    }

    // Validate transaction ID format (basic validation)
    if (transactionId.length < 10 || transactionId.length > 100) {
      safeLogger.warn('Invalid transactionId format in x402 payment status request', { transactionId });
      return res.status(400).json({
        success: false,
        error: 'Invalid transactionId format'
      });
    }

    safeLogger.info('Checking x402 payment status', { transactionId });

    // Check the payment status
    const paymentResult = await x402PaymentService.checkPaymentStatus(transactionId);

    if (!paymentResult.success) {
      safeLogger.error('X402 payment status check failed', { 
        transactionId, 
        error: paymentResult.error 
      });
      
      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'Failed to check x402 payment status'
      });
    }

    safeLogger.info('X402 payment status checked successfully', { 
      transactionId, 
      status: paymentResult.status
    });

    res.status(200).json({
      success: true,
      data: paymentResult
    });
  } catch (error) {
    safeLogger.error('Error checking x402 payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during x402 payment status check'
    });
  }
});

/**
 * Refund an x402 payment
 * POST /api/x402/payment/:transactionId/refund
 */
router.post('/payment/:transactionId/refund', authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      safeLogger.warn('Missing transactionId parameter in x402 refund request');
      return res.status(400).json({
        success: false,
        error: 'Missing transactionId parameter'
      });
    }

    // Validate transaction ID format (basic validation)
    if (transactionId.length < 10 || transactionId.length > 100) {
      safeLogger.warn('Invalid transactionId format in x402 refund request', { transactionId });
      return res.status(400).json({
        success: false,
        error: 'Invalid transactionId format'
      });
    }

    safeLogger.info('Processing x402 refund request', { transactionId });

    // Process the refund
    const refundResult = await x402PaymentService.refundPayment(transactionId);

    if (!refundResult.success) {
      safeLogger.error('X402 refund processing failed', { 
        transactionId, 
        error: refundResult.error 
      });
      
      return res.status(400).json({
        success: false,
        error: refundResult.error || 'Failed to process refund'
      });
    }

    safeLogger.info('X402 refund processed successfully', { 
      transactionId, 
      refundId: refundResult.transactionId,
      status: refundResult.status
    });

    res.status(200).json({
      success: true,
      data: refundResult
    });
  } catch (error) {
    safeLogger.error('Error processing x402 refund:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during x402 refund processing'
    });
  }
});

// Health check endpoint for x402 service
router.get('/health', async (req, res) => {
  try {
    const status = x402PaymentService.getStatus();
    res.status(200).json({
      success: true,
      data: {
        service: 'x402-payment',
        status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    safeLogger.error('Error checking x402 service health:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during health check'
    });
  }
});

// Status endpoint for x402 service availability
router.get('/status', async (req, res) => {
  try {
    const status = x402PaymentService.getStatus();
    res.status(200).json({
      available: status.available,
      hasCredentials: status.hasCredentials,
      usingMock: status.usingMock,
      message: status.hasCredentials 
        ? 'x402 payment service is available' 
        : 'x402 payment requires Coinbase CDP credentials'
    });
  } catch (error) {
    safeLogger.error('Error checking x402 service status:', error);
    res.status(500).json({
      available: false,
      hasCredentials: false,
      usingMock: true,
      message: 'x402 service unavailable'
    });
  }
});

export default router;