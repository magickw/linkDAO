import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { newsletterSubscriptions } from '../db/schema';
import { emailService } from './emailService';

export interface NewsletterSubscription {
  id: number;
  email: string;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  isActive: boolean;
  subscriptionMetadata?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class NewsletterService {
  private static instance: NewsletterService;

  private constructor() {}

  public static getInstance(): NewsletterService {
    if (!NewsletterService.instance) {
      NewsletterService.instance = new NewsletterService();
    }
    return NewsletterService.instance;
  }

  /**
   * Subscribe an email to the newsletter
   */
  async subscribeEmail(email: string): Promise<{ success: boolean; message: string; existing?: boolean }> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Check if email already exists
      const existingResult = await db.select().from(newsletterSubscriptions).where(eq(newsletterSubscriptions.email, email)).limit(1);

      if (existingResult.length > 0) {
        const existingSubscription = existingResult[0];
        if (existingSubscription.isActive) {
          return { success: true, message: 'Email already subscribed', existing: true };
        } else {
          // Re-activate the subscription
          await db.update(newsletterSubscriptions)
            .set({
              isActive: true,
              unsubscribedAt: null,
              updatedAt: new Date()
            })
            .where(eq(newsletterSubscriptions.id, existingSubscription.id));

          // Send welcome email for re-subscription
          if (emailService.isEnabled()) {
            await emailService.sendNewsletterWelcomeEmail(email);
          }

          return { success: true, message: 'Subscription re-activated successfully' };
        }
      }

      // Insert new subscription
      await db.insert(newsletterSubscriptions).values({
        email,
        subscribedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Send welcome email for new subscription
      if (emailService.isEnabled()) {
        await emailService.sendNewsletterWelcomeEmail(email);
      }

      safeLogger.info(`[NewsletterService] New subscription: ${email}`);
      return { success: true, message: 'Successfully subscribed to newsletter' };
    } catch (error) {
      safeLogger.error('[NewsletterService] Error subscribing email:', error);
      return { success: false, message: 'Failed to subscribe to newsletter' };
    }
  }

  /**
   * Unsubscribe an email from the newsletter
   */
  async unsubscribeEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await db.update(newsletterSubscriptions)
        .set({
          isActive: false,
          unsubscribedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(newsletterSubscriptions.email, email),
          eq(newsletterSubscriptions.isActive, true)
        ))
        .returning();

      if (result.length > 0) {
        safeLogger.info(`[NewsletterService] Unsubscribed: ${email}`);
        return { success: true, message: 'Successfully unsubscribed from newsletter' };
      } else {
        return { success: false, message: 'Email not found or already unsubscribed' };
      }
    } catch (error) {
      safeLogger.error('[NewsletterService] Error unsubscribing email:', error);
      return { success: false, message: 'Failed to unsubscribe from newsletter' };
    }
  }

  /**
   * Get subscription status for an email
   */
  async getSubscriptionStatus(email: string): Promise<{ isSubscribed: boolean; subscription?: NewsletterSubscription }> {
    try {
      const result = await db.select().from(newsletterSubscriptions).where(eq(newsletterSubscriptions.email, email)).limit(1);

      if (result.length > 0) {
        const subscription = result[0];
        return {
          isSubscribed: subscription.isActive,
          subscription: {
            id: subscription.id,
            email: subscription.email,
            subscribedAt: subscription.subscribedAt,
            unsubscribedAt: subscription.unsubscribedAt ?? undefined,
            isActive: subscription.isActive,
            subscriptionMetadata: subscription.subscriptionMetadata ?? undefined,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt
          }
        };
      }

      return { isSubscribed: false };
    } catch (error) {
      safeLogger.error('[NewsletterService] Error getting subscription status:', error);
      return { isSubscribed: false };
    }
  }

  /**
   * Get total active subscriber count
   */
  async getSubscriberCount(): Promise<number> {
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(newsletterSubscriptions).where(eq(newsletterSubscriptions.isActive, true));
      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('[NewsletterService] Error getting subscriber count:', error);
      return 0;
    }
  }

  /**
   * Get recent subscribers
   */
  async getRecentSubscribers(limit: number = 10): Promise<NewsletterSubscription[]> {
    try {
      const result = await db.select().from(newsletterSubscriptions)
        .where(eq(newsletterSubscriptions.isActive, true))
        .orderBy(sql`subscribed_at DESC`)
        .limit(limit);

      return result.map(subscription => ({
        id: subscription.id,
        email: subscription.email,
        subscribedAt: subscription.subscribedAt,
        unsubscribedAt: subscription.unsubscribedAt ?? undefined,
        isActive: subscription.isActive,
        subscriptionMetadata: subscription.subscriptionMetadata ?? undefined,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt
      }));
    } catch (error) {
      safeLogger.error('[NewsletterService] Error getting recent subscribers:', error);
      return [];
    }
  }
}

export const newsletterService = NewsletterService.getInstance();
export default newsletterService;