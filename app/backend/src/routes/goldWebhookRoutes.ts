import { Router } from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { userGoldBalance, goldTransaction } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Gold packages configuration
const GOLD_PACKAGES = [
  { id: 'small', name: 'Small Gold Pack', amount: 100, price: 4.99 },
  { id: 'medium', name: 'Medium Gold Pack', amount: 500, price: 19.99 },
  { id: 'large', name: 'Large Gold Pack', amount: 1200, price: 39.99 },
  { id: 'xlarge', name: 'Extra Large Gold Pack', amount: 3000, price: 99.99 },
];

// Stripe webhook handler for gold purchases
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: 'Missing webhook signature or secret' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Only process gold purchases
        if (paymentIntent.metadata?.type === 'gold_purchase') {
          await processGoldPurchase(paymentIntent);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', failedPayment.id);
        // Optionally notify user of failed payment
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function processGoldPurchase(paymentIntent: Stripe.PaymentIntent) {
  const { userId, packageId, goldAmount } = paymentIntent.metadata || {};

  if (!userId || !packageId || !goldAmount) {
    console.error('Missing metadata in payment intent:', paymentIntent.id);
    return;
  }

  try {
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
      paymentMethod: 'stripe',
      paymentIntentId: paymentIntent.id,
      status: 'completed',
      metadata: {
        packageId,
        stripePaymentId: paymentIntent.id,
      },
      createdAt: new Date(),
    });

    console.log(`Gold purchase completed for user ${userId}: +${goldAmount} gold`);
  } catch (error) {
    console.error('Error processing gold purchase:', error);
    throw error;
  }
}

export default router;