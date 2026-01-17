import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';
import { db } from '../db';
import { userGemBalance, gemTransaction, users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { emailService } from '../services/emailService';
import { safeLogger } from '../utils/safeLogger';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface GemPackage {
  id: string;
  name: string;
  amount: number;
  price: number; // in USD
}

const GEM_PACKAGES: GemPackage[] = [
  { id: 'small', name: 'Small Gem Pack', amount: 100, price: 4.99 },
  { id: 'medium', name: 'Medium Gem Pack', amount: 500, price: 19.99 },
  { id: 'large', name: 'Large Gem Pack', amount: 1200, price: 39.99 },
  { id: 'xlarge', name: 'Extra Large Gem Pack', amount: 3000, price: 99.99 },
];

// Create payment intent for gem purchase
router.post('/payment-intent', authenticateToken, csrfProtection, async (req, res) => {
  try {
    const { packageId, paymentMethod } = req.body;
    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const gemPackage = GEM_PACKAGES.find(p => p.id === packageId);
    if (!gemPackage) {
      return res.status(400).json({ error: 'Invalid gem package' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(gemPackage.price * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId: userAddress,
        packageId: gemPackage.id,
        gemAmount: gemPackage.amount.toString(),
        type: 'gem_purchase'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      package: gemPackage,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Complete gem purchase (called by Stripe webhook or client after successful payment)
router.post('/complete', async (req, res) => {
  try {
    const { paymentIntentId, userId, packageId, gemAmount, paymentMethod = 'stripe', network, transactionHash } = req.body;

    // Verify payment intent (with simulation bypass for dev/test)
    // If it's a simulated ID (starts with stripe-timestamp) and we are not in production, allow it
    let isVerified = false;

    // Check if this is a simulated payment in non-production environment
    if (process.env.NODE_ENV !== 'production' && (paymentIntentId.startsWith('stripe-') || paymentIntentId.startsWith('simulated-'))) {
      isVerified = true;
      safeLogger.info(`Bypassing payment verification for simulated payment: ${paymentIntentId}`);
    } else {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
          isVerified = true;
        }
      } catch (err) {
        safeLogger.warn(`Payment intent verification failed: ${err.message}`);
      }
    }

    if (!isVerified) {
      return res.status(400).json({ error: 'Payment not successful or could not be verified' });
    }

    // Get or create user gem balance
    let userBalance = await db.select().from(userGemBalance).where(eq(userGemBalance.userId, String(userId))).limit(1);

    if (!userBalance.length) {
      const newBalance = await db.insert(userGemBalance).values({
        userId: String(userId),
        balance: 0,
        totalPurchased: 0,
      }).returning();
      userBalance = newBalance;
    }

    // Update gem balance
    const updatedBalance = await db.update(userGemBalance)
      .set({
        balance: (userBalance[0]?.balance || 0) + parseInt(gemAmount),
        totalPurchased: (userBalance[0]?.totalPurchased || 0) + parseInt(gemAmount),
        lastPurchaseAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userGemBalance.userId, String(userId)))
      .returning();

    // Create transaction record
    await db.insert(gemTransaction).values({
      userId: String(userId),
      amount: parseInt(gemAmount),
      type: 'purchase',
      price: String(GEM_PACKAGES.find(p => p.id === packageId)?.price || 0),
      paymentMethod: paymentMethod,
      paymentIntentId,
      network: network,
      transactionHash: transactionHash || undefined,
      status: 'completed',
      createdAt: new Date(),
    });

    // Get user email for receipt
    const user = await db.select().from(users).where(eq(users.walletAddress, String(userId))).limit(1);
    const userEmail = user[0]?.email;

    // Send receipt email
    if (userEmail) {
      const gemPackage = GEM_PACKAGES.find(p => p.id === packageId);
      if (gemPackage) {
        try {
          await emailService.sendPurchaseReceiptEmail(userEmail, {
            orderId: `GEM-${Date.now()}`,
            goldAmount: parseInt(gemAmount), // Keeping param name compatible if email service expects goldAmount, or update service too. Assuming service interface for now, but logged as Gem receipt.
            totalCost: gemPackage.price,
            paymentMethod: paymentMethod === 'stripe' ? 'Credit/Debit Card' : `USDC on ${network || 'Ethereum'}`,
            network,
            transactionHash,
            timestamp: new Date()
          });
          safeLogger.info(`Gem purchase receipt sent to ${userEmail}`);
        } catch (emailError) {
          safeLogger.error('Error sending gem purchase receipt email:', emailError);
        }
      }
    } else {
      safeLogger.warn(`No email found for user ${userId}, skipping receipt email`);
    }

    res.json({
      success: true,
      newBalance: updatedBalance[0]?.balance || 0,
      gemsAdded: parseInt(gemAmount),
    });
  } catch (error) {
    safeLogger.error('Error completing gem purchase:', error);
    res.status(500).json({ error: 'Failed to complete gem purchase' });
  }
});

// Get user's gem balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userBalance = await db.select().from(userGemBalance).where(eq(userGemBalance.userId, userAddress)).limit(1);

    res.json({
      balance: userBalance[0]?.balance || 0,
      totalPurchased: userBalance[0]?.totalPurchased || 0,
      lastPurchaseAt: userBalance[0]?.lastPurchaseAt,
    });
  } catch (error) {
    console.error('Error fetching gem balance:', error);
    res.status(500).json({ error: 'Failed to fetch gem balance' });
  }
});

// Get available gem packages
router.get('/packages', (req, res) => {
  res.json(GEM_PACKAGES);
});

// Get user's gem transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userAddress = req.user?.walletAddress;
    const { page = 1, limit = 20 } = req.query;

    if (!userAddress) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const transactions = await db.select()
      .from(gemTransaction)
      .where(eq(gemTransaction.userId, userAddress))
      .orderBy(gemTransaction.createdAt)
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit));

    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(gemTransaction)
      .where(eq(gemTransaction.userId, userAddress));
    const total = totalResult[0]?.count || 0;

    res.json({
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching gem transactions:', error);
    res.status(500).json({ error: 'Failed to fetch gem transactions' });
  }
});

export default router;