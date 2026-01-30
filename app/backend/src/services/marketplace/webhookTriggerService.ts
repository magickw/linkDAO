import axios, { AxiosError } from 'axios';
import { db } from '../../db';
import { webhookEndpoints, webhookLogs } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';

interface WebhookPayload {
  event: string;
  orderId: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Service to trigger webhooks for order events
 * Sends notifications to registered webhook endpoints
 */
class WebhookTriggerService {
  private readonly TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  /**
   * Register a webhook endpoint for a seller
   */
  async registerWebhook(
    sellerId: string,
    url: string,
    events: string[]
  ): Promise<void> {
    try {
      // Validate URL
      new URL(url);

      // Check if webhook already exists
      const existing = await db
        .select()
        .from(webhookEndpoints)
        .where(and(
          eq(webhookEndpoints.sellerId, sellerId),
          eq(webhookEndpoints.url, url)
        ))
        .limit(1);

      if (existing.length > 0) {
        safeLogger.warn(`Webhook already exists for seller ${sellerId} at ${url}`);
        return;
      }

      await db.insert(webhookEndpoints).values({
        sellerId,
        url,
        events: JSON.stringify(events),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      safeLogger.info(`Registered webhook for seller ${sellerId} at ${url}`);
    } catch (error) {
      safeLogger.error(`Error registering webhook for seller ${sellerId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a webhook endpoint
   */
  async unregisterWebhook(sellerId: string, url: string): Promise<void> {
    try {
      await db
        .delete(webhookEndpoints)
        .where(and(
          eq(webhookEndpoints.sellerId, sellerId),
          eq(webhookEndpoints.url, url)
        ));

      safeLogger.info(`Unregistered webhook for seller ${sellerId} at ${url}`);
    } catch (error) {
      safeLogger.error(`Error unregistering webhook for seller ${sellerId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger webhooks for an order event
   */
  async triggerWebhooks(
    orderId: string,
    sellerId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      // Get registered webhooks for this seller
      const webhooks = await db
        .select()
        .from(webhookEndpoints)
        .where(and(
          eq(webhookEndpoints.sellerId, sellerId),
          eq(webhookEndpoints.isActive, true)
        ));

      if (webhooks.length === 0) {
        safeLogger.debug(`No active webhooks for seller ${sellerId}`);
        return;
      }

      const payload: WebhookPayload = {
        event: eventType,
        orderId,
        timestamp: new Date().toISOString(),
        data: eventData,
      };

      // Send to each webhook endpoint
      for (const webhook of webhooks) {
        const events = JSON.parse(webhook.events || '[]');

        // Check if webhook is subscribed to this event type
        if (!events.includes(eventType) && !events.includes('*')) {
          continue;
        }

        // Send webhook with retry logic
        this.sendWebhookWithRetry(webhook.url, payload, webhook.id)
          .catch((error) => {
            safeLogger.error(`Failed to send webhook to ${webhook.url} after retries:`, error);
          });
      }
    } catch (error) {
      safeLogger.error(`Error triggering webhooks for order ${orderId}:`, error);
    }
  }

  /**
   * Send webhook with exponential backoff retry logic
   */
  private async sendWebhookWithRetry(
    url: string,
    payload: WebhookPayload,
    webhookId: number,
    attempt: number = 1
  ): Promise<void> {
    try {
      const response = await axios.post(url, payload, {
        timeout: this.TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LinkDAO-Marketplace/1.0',
          'X-Webhook-Timestamp': payload.timestamp,
        },
      });

      // Log successful delivery
      await db.insert(webhookLogs).values({
        webhookId,
        event: payload.event,
        orderId: payload.orderId,
        statusCode: response.status,
        responseBody: JSON.stringify(response.data),
        sentAt: new Date(),
        success: true,
      });

      safeLogger.info(`Successfully sent webhook to ${url} for order ${payload.orderId}`);
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status || 0;
      const responseBody = axiosError.response?.data || null;

      // Log failed attempt
      await db.insert(webhookLogs).values({
        webhookId,
        event: payload.event,
        orderId: payload.orderId,
        statusCode,
        responseBody: JSON.stringify(responseBody),
        errorMessage: axiosError.message,
        sentAt: new Date(),
        success: false,
        retryAttempt: attempt,
      });

      // Retry on network errors or 5xx errors
      const shouldRetry = (
        (axiosError.code === 'ECONNREFUSED' ||
          axiosError.code === 'ECONNABORTED' ||
          axiosError.code === 'ETIMEDOUT' ||
          (statusCode >= 500 && statusCode < 600)) &&
        attempt < this.MAX_RETRIES
      );

      if (shouldRetry) {
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        safeLogger.warn(
          `Webhook send failed for ${url}, retrying in ${delay}ms (attempt ${attempt}/${this.MAX_RETRIES})`
        );

        setTimeout(() => {
          this.sendWebhookWithRetry(url, payload, webhookId, attempt + 1);
        }, delay);
      } else {
        safeLogger.error(
          `Webhook send permanently failed for ${url} after ${attempt} attempts: ${axiosError.message}`
        );
      }
    }
  }

  /**
   * Get webhook delivery logs for a webhook
   */
  async getWebhookLogs(
    webhookId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<any>> {
    try {
      const logs = await db
        .select()
        .from(webhookLogs)
        .where(eq(webhookLogs.webhookId, webhookId))
        .orderBy(webhookLogs.sentAt)
        .limit(limit)
        .offset(offset);

      return logs;
    } catch (error) {
      safeLogger.error(`Error retrieving webhook logs for webhook ${webhookId}:`, error);
      throw error;
    }
  }

  /**
   * Test a webhook endpoint
   */
  async testWebhook(url: string): Promise<boolean> {
    try {
      const testPayload: WebhookPayload = {
        event: 'TEST_EVENT',
        orderId: 'test-order-id',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook',
        },
      };

      const response = await axios.post(url, testPayload, {
        timeout: this.TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LinkDAO-Marketplace/1.0',
          'X-Webhook-Timestamp': testPayload.timestamp,
        },
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      safeLogger.warn(`Webhook test failed for ${url}:`, error);
      return false;
    }
  }
}

export const webhookTriggerService = new WebhookTriggerService();
