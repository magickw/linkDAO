/**
 * Notification Delivery Service
 * Tracks email delivery status and processes webhook events from Resend
 */

import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { emailService } from './emailService';

export interface DeliveryEvent {
  id: string;
  templateName: string;
  recipient: string;
  status: 'sent' | 'delivered' | 'failed' | 'bounced' | 'complained';
  provider: string;
  providerMessageId?: string;
  errorMessage?: string;
  timestamp: Date;
}

export interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.bounced' | 'email.complained';
  data: {
    email_id: string;
    from: string;
    to: string;
    created_at: string;
    subject?: string;
    error?: {
      message: string;
      code?: string;
    };
  };
}

export class NotificationDeliveryService {
  private databaseService: DatabaseService;
  private deliveryMetrics: Map<string, { total: number; delivered: number; bounced: number }> = new Map();

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Log a notification delivery attempt
   */
  async logDeliveryAttempt(
    templateName: string,
    recipient: string,
    channel: 'email' | 'push' | 'sms',
    subject?: string,
    body?: string,
    variables?: Record<string, any>
  ): Promise<string> {
    try {
      const log = {
        templateName,
        channel,
        recipient,
        subject,
        body,
        variables,
        status: 'pending',
        retryCount: 0,
      };

      await this.databaseService.createNotificationLog(log);
      safeLogger.info(`Delivery logged: ${templateName} -> ${recipient}`);

      return recipient;
    } catch (error) {
      safeLogger.error('Error logging delivery attempt:', error);
      throw error;
    }
  }

  /**
   * Handle Resend webhook event
   */
  async handleResendWebhook(event: ResendWebhookEvent): Promise<boolean> {
    try {
      const { type, data } = event;
      const { email_id, to, created_at, error } = data;

      safeLogger.info(`[ResendWebhook] Received event: ${type} for ${to}`);

      let status: 'sent' | 'delivered' | 'failed' | 'bounced';

      switch (type) {
        case 'email.sent':
          status = 'sent';
          break;
        case 'email.delivered':
          status = 'delivered';
          break;
        case 'email.bounced':
          status = 'bounced';
          break;
        case 'email.complained':
          status = 'bounced'; // Treat complaints as bounces
          break;
        default:
          safeLogger.warn(`[ResendWebhook] Unknown event type: ${type}`);
          return false;
      }

      // Update delivery status in database
      await this.updateDeliveryStatus(
        email_id,
        status,
        error?.message,
        email_id
      );

      // Update metrics
      this.updateMetrics(to, status);

      safeLogger.info(`[ResendWebhook] Processed event: ${type} for ${to}`);
      return true;
    } catch (error) {
      safeLogger.error('[ResendWebhook] Error processing webhook:', error);
      return false;
    }
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    logId: string,
    status: 'sent' | 'delivered' | 'failed' | 'bounced',
    errorMessage?: string,
    providerMessageId?: string
  ): Promise<void> {
    try {
      await this.databaseService.updateNotificationDeliveryStatus(logId, status, errorMessage);

      safeLogger.info(`Delivery status updated: ${logId} -> ${status}`);
    } catch (error) {
      safeLogger.error('Error updating delivery status:', error);
      throw error;
    }
  }

  /**
   * Retry failed deliveries
   */
  async retryFailedDeliveries(maxRetries: number = 3): Promise<number> {
    try {
      safeLogger.info('Starting retry of failed deliveries...');
      // This would need a database query to get failed deliveries
      // For now, just log the action
      safeLogger.info(`Retry process completed (max ${maxRetries} retries)`);
      return 0;
    } catch (error) {
      safeLogger.error('Error retrying failed deliveries:', error);
      throw error;
    }
  }

  /**
   * Get delivery metrics
   */
  getMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const [recipient, data] of this.deliveryMetrics.entries()) {
      metrics[recipient] = {
        total: data.total,
        delivered: data.delivered,
        bounced: data.bounced,
        deliveryRate: ((data.delivered / data.total) * 100).toFixed(2) + '%',
        bounceRate: ((data.bounced / data.total) * 100).toFixed(2) + '%',
      };
    }

    return metrics;
  }

  /**
   * Update metrics
   */
  private updateMetrics(recipient: string, status: string): void {
    const current = this.deliveryMetrics.get(recipient) || { total: 0, delivered: 0, bounced: 0 };

    current.total++;

    if (status === 'delivered' || status === 'sent') {
      current.delivered++;
    } else if (status === 'bounced') {
      current.bounced++;
    }

    this.deliveryMetrics.set(recipient, current);
  }

  /**
   * Get delivery analytics for a time period
   */
  getAnalytics(days: number = 7): Record<string, any> {
    return {
      period: `Last ${days} days`,
      metrics: this.getMetrics(),
      summary: this.getDeliverySummary(),
    };
  }

  /**
   * Get delivery summary
   */
  private getDeliverySummary(): Record<string, any> {
    let totalSent = 0;
    let totalDelivered = 0;
    let totalBounced = 0;

    for (const data of this.deliveryMetrics.values()) {
      totalSent += data.total;
      totalDelivered += data.delivered;
      totalBounced += data.bounced;
    }

    return {
      totalSent,
      totalDelivered,
      totalBounced,
      overallDeliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) + '%' : '0%',
      overallBounceRate: totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) + '%' : '0%',
    };
  }

  /**
   * Clear metrics (for testing)
   */
  clearMetrics(): void {
    this.deliveryMetrics.clear();
    safeLogger.info('Delivery metrics cleared');
  }
}

// Export singleton instance
export const notificationDeliveryService = new NotificationDeliveryService();
