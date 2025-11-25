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

export interface NewsletterCampaign {
  id: string;
  subject: string;
  content: string;
  htmlContent?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledAt?: Date;
  sentAt?: Date;
  recipientCount: number;
  openRate?: number;
  clickRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for campaigns (for MVP - should be moved to database later)
const campaigns: Map<string, NewsletterCampaign> = new Map();

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

  /**
   * Get all subscribers (Admin only)
   */
  async getAllSubscribers(limit: number = 1000): Promise<NewsletterSubscription[]> {
    try {
      const result = await db.select().from(newsletterSubscriptions)
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
      safeLogger.error('[NewsletterService] Error getting all subscribers:', error);
      return [];
    }
  }

  /**
   * Send newsletter to all active subscribers (Admin only)
   */
  async sendNewsletter(subject: string, content: string, htmlContent?: string): Promise<{ success: boolean; message: string; campaignId?: string }> {
    try {
      // Get all active subscribers
      const subscribers = await db.select().from(newsletterSubscriptions)
        .where(eq(newsletterSubscriptions.isActive, true));

      if (subscribers.length === 0) {
        return { success: false, message: 'No active subscribers found' };
      }

      // Create campaign record
      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const campaign: NewsletterCampaign = {
        id: campaignId,
        subject,
        content,
        htmlContent,
        status: 'sent',
        sentAt: new Date(),
        recipientCount: subscribers.length,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      campaigns.set(campaignId, campaign);

      // Send emails if email service is enabled
      if (emailService.isEnabled()) {
        const emailAddresses = subscribers.map(s => s.email);

        // Send in batches to avoid overwhelming the email service
        const batchSize = 50;
        for (let i = 0; i < emailAddresses.length; i += batchSize) {
          const batch = emailAddresses.slice(i, i + batchSize);

          try {
            await Promise.all(
              batch.map(email =>
                emailService.sendEmail({
                  to: email,
                  subject,
                  text: content,
                  html: htmlContent || `<p>${content}</p>`,
                  from: process.env.FROM_EMAIL || 'noreply@linkdao.io'
                })
              )
            );
          } catch (batchError) {
            safeLogger.error(`[NewsletterService] Error sending batch ${i / batchSize + 1}:`, batchError);
          }
        }

        safeLogger.info(`[NewsletterService] Newsletter sent to ${subscribers.length} subscribers`);
        return {
          success: true,
          message: `Newsletter sent successfully to ${subscribers.length} subscribers`,
          campaignId
        };
      } else {
        safeLogger.warn('[NewsletterService] Email service disabled, newsletter not sent');
        campaign.status = 'failed';
        campaigns.set(campaignId, campaign);
        return {
          success: false,
          message: 'Email service is not configured'
        };
      }
    } catch (error) {
      safeLogger.error('[NewsletterService] Error sending newsletter:', error);
      return { success: false, message: 'Failed to send newsletter' };
    }
  }

  /**
   * Schedule newsletter for later (Admin only)
   */
  async scheduleNewsletter(subject: string, content: string, scheduledAt: Date, htmlContent?: string): Promise<{ success: boolean; message: string; campaignId?: string }> {
    try {
      // Get active subscriber count
      const subscriberCount = await this.getSubscriberCount();

      // Create campaign record
      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const campaign: NewsletterCampaign = {
        id: campaignId,
        subject,
        content,
        htmlContent,
        status: 'scheduled',
        scheduledAt,
        recipientCount: subscriberCount,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      campaigns.set(campaignId, campaign);

      safeLogger.info(`[NewsletterService] Newsletter scheduled for ${scheduledAt.toISOString()}`);
      return {
        success: true,
        message: `Newsletter scheduled successfully for ${scheduledAt.toLocaleString()}`,
        campaignId
      };
    } catch (error) {
      safeLogger.error('[NewsletterService] Error scheduling newsletter:', error);
      return { success: false, message: 'Failed to schedule newsletter' };
    }
  }

  /**
   * Get all campaigns (Admin only)
   */
  async getAllCampaigns(): Promise<NewsletterCampaign[]> {
    try {
      return Array.from(campaigns.values()).sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (error) {
      safeLogger.error('[NewsletterService] Error getting all campaigns:', error);
      return [];
    }
  }

  /**
   * Get newsletter statistics (Admin only)
   */
  async getNewsletterStats(): Promise<{
    totalSubscribers: number;
    activeSubscribers: number;
    totalCampaigns: number;
    avgOpenRate: number;
    avgClickRate: number;
    recentGrowth: number;
  }> {
    try {
      const totalSubscribers = await db.select({ count: sql<number>`count(*)` })
        .from(newsletterSubscriptions);

      const activeSubscribers = await db.select({ count: sql<number>`count(*)` })
        .from(newsletterSubscriptions)
        .where(eq(newsletterSubscriptions.isActive, true));

      // Calculate growth from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentSubscribers = await db.select({ count: sql<number>`count(*)` })
        .from(newsletterSubscriptions)
        .where(sql`subscribed_at >= ${thirtyDaysAgo.toISOString()}`);

      const totalCampaignsCount = campaigns.size;

      // Calculate average open and click rates from sent campaigns
      const sentCampaigns = Array.from(campaigns.values()).filter(c => c.status === 'sent');
      const avgOpenRate = sentCampaigns.length > 0
        ? sentCampaigns.reduce((sum, c) => sum + (c.openRate || 0), 0) / sentCampaigns.length
        : 0;
      const avgClickRate = sentCampaigns.length > 0
        ? sentCampaigns.reduce((sum, c) => sum + (c.clickRate || 0), 0) / sentCampaigns.length
        : 0;

      const total = totalSubscribers[0]?.count || 0;
      const active = activeSubscribers[0]?.count || 0;
      const recent = recentSubscribers[0]?.count || 0;

      const recentGrowth = total > 0 ? Math.round((recent / total) * 100) : 0;

      return {
        totalSubscribers: total,
        activeSubscribers: active,
        totalCampaigns: totalCampaignsCount,
        avgOpenRate: Math.round(avgOpenRate * 10) / 10,
        avgClickRate: Math.round(avgClickRate * 10) / 10,
        recentGrowth
      };
    } catch (error) {
      safeLogger.error('[NewsletterService] Error getting newsletter stats:', error);
      return {
        totalSubscribers: 0,
        activeSubscribers: 0,
        totalCampaigns: 0,
        avgOpenRate: 0,
        avgClickRate: 0,
        recentGrowth: 0
      };
    }
  }

  /**
   * Delete a campaign (Admin only)
   */
  async deleteCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!campaigns.has(campaignId)) {
        return { success: false, message: 'Campaign not found' };
      }

      campaigns.delete(campaignId);
      safeLogger.info(`[NewsletterService] Campaign deleted: ${campaignId}`);
      return { success: true, message: 'Campaign deleted successfully' };
    } catch (error) {
      safeLogger.error('[NewsletterService] Error deleting campaign:', error);
      return { success: false, message: 'Failed to delete campaign' };
    }
  }

  /**
   * Export subscribers to CSV (Admin only)
   */
  async exportSubscribers(): Promise<string> {
    try {
      const subscribers = await this.getAllSubscribers();

      // Create CSV header
      const header = 'Email,Status,Subscribed At,Unsubscribed At\n';

      // Create CSV rows
      const rows = subscribers.map(sub => {
        const status = sub.isActive ? 'Active' : 'Inactive';
        const subscribedAt = sub.subscribedAt.toISOString();
        const unsubscribedAt = sub.unsubscribedAt ? sub.unsubscribedAt.toISOString() : '';
        return `${sub.email},${status},${subscribedAt},${unsubscribedAt}`;
      }).join('\n');

      return header + rows;
    } catch (error) {
      safeLogger.error('[NewsletterService] Error exporting subscribers:', error);
      throw error;
    }
  }
}

export const newsletterService = NewsletterService.getInstance();
export default newsletterService;