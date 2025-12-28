import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';
import { db } from '../db';
import { userGoldBalance, goldTransaction, users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { emailService } from '../services/emailService';
import { safeLogger } from '../utils/safeLogger';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface GoldPackage {
  id: string;
  name: string;
  amount: number;
  price: number; // in USD
}

const GOLD_PACKAGES: GoldPackage[] = [
  { id: 'small', name: 'Small Gold Pack', amount: 100, price: 4.99 },
  { id: 'medium', name: 'Medium Gold Pack', amount: 500, price: 19.99 },
  { id: 'large', name: 'Large Gold Pack', amount: 1200, price: 39.99 },
  { id: 'xlarge', name: 'Extra Large Gold Pack', amount: 3000, price: 99.99 },
];

// Create payment intent for gold purchase
router.post('/payment-intent', authenticateToken, csrfProtection, async (req, res) => {
  try {
    const { packageId, paymentMethod } = req.body;
    const userAddress = req.user?.address;

    if (!userAddress) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const goldPackage = GOLD_PACKAGES.find(p => p.id === packageId);
    if (!goldPackage) {
      return res.status(400).json({ error: 'Invalid gold package' });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(goldPackage.price * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId: userAddress,
        packageId: goldPackage.id,
        goldAmount: goldPackage.amount.toString(),
        type: 'gold_purchase'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      package: goldPackage,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Complete gold purchase (called by Stripe webhook)
router.post('/complete', async (req, res) => {
  try {
    const { paymentIntentId, userId, packageId, goldAmount, paymentMethod = 'stripe', network, transactionHash } = req.body;

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    // Get or create user gold balance
    let userBalance = await db.select().from(userGoldBalance).where(eq(userGoldBalance.userId, String(userId))).limit(1);

    if (!userBalance.length) {
      const newBalance = await db.insert(userGoldBalance).values({
        userId: String(userId),
        balance: 0,
        totalPurchased: 0,
      }).returning();
      userBalance = newBalance;
    }

    // Update gold balance
    const updatedBalance = await db.update(userGoldBalance)
      .set({
        balance: (userBalance[0]?.balance || 0) + parseInt(goldAmount),
        totalPurchased: (userBalance[0]?.totalPurchased || 0) + parseInt(goldAmount),
        lastPurchaseAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userGoldBalance.userId, String(userId)))
      .returning();

    // Create transaction record
    await db.insert(goldTransaction).values({
      userId: String(userId),
      amount: parseInt(goldAmount),
      type: 'purchase',
      price: String(GOLD_PACKAGES.find(p => p.id === packageId)?.price || 0),
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
      const goldPackage = GOLD_PACKAGES.find(p => p.id === packageId);
      if (goldPackage) {
        try {
          await emailService.sendPurchaseReceiptEmail(userEmail, {
            orderId: `GOLD-${Date.now()}`,
            goldAmount: parseInt(goldAmount),
            totalCost: goldPackage.price,
            paymentMethod: paymentMethod === 'stripe' ? 'Credit/Debit Card' : `USDC on ${network || 'Ethereum'}`,
            network,
            transactionHash,
            timestamp: new Date()
          });
          safeLogger.info(`Gold purchase receipt sent to ${userEmail}`);
        } catch (emailError) {
          safeLogger.error('Error sending gold purchase receipt email:', emailError);
        }
      }
    } else {
      safeLogger.warn(`No email found for user ${userId}, skipping receipt email`);
    }

    res.json({
      success: true,
      newBalance: updatedBalance[0]?.balance || 0,
      goldAdded: parseInt(goldAmount),
    });
  } catch (error) {
    safeLogger.error('Error completing gold purchase:', error);
    res.status(500).json({ error: 'Failed to complete gold purchase' });
  }
});

// Get user's gold balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const userAddress = req.user?.address;

    if (!userAddress) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userBalance = await db.select().from(userGoldBalance).where(eq(userGoldBalance.userId, userAddress)).limit(1);

    res.json({
      balance: userBalance[0]?.balance || 0,
      totalPurchased: userBalance[0]?.totalPurchased || 0,
      lastPurchaseAt: userBalance[0]?.lastPurchaseAt,
    });
  } catch (error) {
    console.error('Error fetching gold balance:', error);
    res.status(500).json({ error: 'Failed to fetch gold balance' });
  }
});

// Get available gold packages
router.get('/packages', (req, res) => {
  res.json(GOLD_PACKAGES);
});

// Get user's gold transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userAddress = req.user?.address;
    const { page = 1, limit = 20 } = req.query;

    if (!userAddress) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const transactions = await db.select()
      .from(goldTransaction)
      .where(eq(goldTransaction.userId, userAddress))
      .orderBy(goldTransaction.createdAt)
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit));

    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(goldTransaction)
      .where(eq(goldTransaction.userId, userAddress));
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
    console.error('Error fetching gold transactions:', error);
    res.status(500).json({ error: 'Failed to fetch gold transactions' });
  }
});

export default router;