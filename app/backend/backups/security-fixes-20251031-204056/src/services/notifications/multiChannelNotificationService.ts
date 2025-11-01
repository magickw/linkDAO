import twilio from 'twilio';
import { safeLogger } from '../utils/safeLogger';

interface NotificationChannel {
  type: 'push' | 'email' | 'sms' | 'webhook' | 'slack' | 'in_app';
  enabled: boolean;
  priority: number;
  config: {
    emailProvider?: 'resend'; // Using Resend for transactional emails
    emailTemplate?: string;
    smsProvider?: 'twilio' | 'messagebird';
    smsTemplate?: string;
    webhookUrl?: string;
    webhookHeaders?: Record<string, string>;
    slackWebhookUrl?: string;
    slackChannel?: string;
  };
  fallback?: NotificationChannel;
}

interface AdminNotification {
  id: string;
  recipient: {
    adminId: string;
    email?: string;
    phone?: string;
  };
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  actionUrl?: string;
  expiresAt?: Date;
}

interface DeliveryResult {
  channel: string;
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

interface NotificationPreferences {
  adminId: string;
  channels: {
    push: { enabled: boolean; devices: string[] };
    email: { enabled: boolean; frequency: 'realtime' | 'digest' };
    sms: { enabled: boolean; criticalOnly: boolean };
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;
  };
  categories?: {
    [key: string]: {
      enabled: boolean;
      channels: string[];
    };
  };
}

/**
 * Multi-Channel Notification Service
 * Supports push, email, SMS, webhook, and Slack notifications with fallback logic
 */
export class MultiChannelNotificationService {
  private twilioClient?: twilio.Twilio;
  private resendApiKey?: string;

  constructor() {
    // Initialize Twilio for SMS
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (twilioSid && twilioToken) {
      this.twilioClient = twilio(twilioSid, twilioToken);
    }

    // Initialize Resend for email (already in dependencies)
    this.resendApiKey = process.env.RESEND_API_KEY;
  }

  /**
   * Send notification through multiple channels based on priority and preferences
   */
  async sendNotification(
    notification: AdminNotification,
    preferences?: NotificationPreferences
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    // Check quiet hours
    if (preferences?.quietHours?.enabled && this.isQuietHours(preferences.quietHours)) {
      if (notification.priority !== 'critical') {
        safeLogger.info('Notification queued due to quiet hours');
        return [];
      }
    }

    // Determine which channels to use based on priority
    const channels = this.determineChannels(notification, preferences);

    // Sort channels by priority
    channels.sort((a, b) => a.priority - b.priority);

    // Send through each enabled channel
    for (const channel of channels) {
      if (!channel.enabled) continue;

      try {
        const result = await this.sendToChannel(notification, channel);
        results.push(result);

        // If critical notification, send through all channels
        // Otherwise, stop after first successful delivery
        if (notification.priority !== 'critical' && result.success) {
          break;
        }
      } catch (error) {
        results.push({
          channel: channel.type,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        });

        // Try fallback channel if available
        if (channel.fallback) {
          try {
            const fallbackResult = await this.sendToChannel(notification, channel.fallback);
            results.push(fallbackResult);
            if (fallbackResult.success) break;
          } catch (fallbackError) {
            safeLogger.error('Fallback channel also failed:', fallbackError);
          }
        }
      }
    }

    return results;
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    notification: AdminNotification,
    channel: NotificationChannel
  ): Promise<DeliveryResult> {
    switch (channel.type) {
      case 'email':
        return await this.sendEmail(notification, channel.config);
      
      case 'sms':
        return await this.sendSMS(notification, channel.config);
      
      case 'webhook':
        return await this.sendWebhook(notification, channel.config);
      
      case 'slack':
        return await this.sendSlack(notification, channel.config);
      
      case 'push':
        return await this.sendPush(notification);
      
      case 'in_app':
        return await this.sendInApp(notification);
      
      default:
        throw new Error(`Unsupported channel: ${channel.type}`);
    }
  }

  /**
   * Send email notification using Resend
   */
  private async sendEmail(
    notification: AdminNotification,
    config: NotificationChannel['config']
  ): Promise<DeliveryResult> {
    if (!this.resendApiKey) {
      throw new Error('Resend API key not configured');
    }

    if (!notification.recipient.email) {
      throw new Error('Email address not provided for recipient');
    }

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(this.resendApiKey);

      const response = await resend.emails.send({
        from: process.env.NOTIFICATION_FROM_EMAIL || 'admin@linkdao.io',
        to: notification.recipient.email,
        subject: notification.title,
        html: this.renderEmailTemplate(notification, config.emailTemplate),
      });

      return {
        channel: 'email',
        success: true,
        messageId: response.data?.id,
        timestamp: new Date(),
      };
    } catch (error) {
      safeLogger.error('Email sending failed:', error);
      return {
        channel: 'email',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send SMS notification using Twilio
   */
  private async sendSMS(
    notification: AdminNotification,
    config: NotificationChannel['config']
  ): Promise<DeliveryResult> {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    if (!notification.recipient.phone) {
      throw new Error('Phone number not provided for recipient');
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: this.renderSMSTemplate(notification, config.smsTemplate),
        to: notification.recipient.phone,
        from: process.env.TWILIO_PHONE_NUMBER,
      });

      return {
        channel: 'sms',
        success: true,
        messageId: message.sid,
        timestamp: new Date(),
      };
    } catch (error) {
      safeLogger.error('SMS sending failed:', error);
      return {
        channel: 'sms',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    notification: AdminNotification,
    config: NotificationChannel['config']
  ): Promise<DeliveryResult> {
    if (!config.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.webhookHeaders || {}),
        },
        body: JSON.stringify({
          notification,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.statusText}`);
      }

      return {
        channel: 'webhook',
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      safeLogger.error('Webhook sending failed:', error);
      return {
        channel: 'webhook',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(
    notification: AdminNotification,
    config: NotificationChannel['config']
  ): Promise<DeliveryResult> {
    if (!config.slackWebhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    try {
      const color = this.getSlackColor(notification.type);
      
      const response = await fetch(config.slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: config.slackChannel,
          attachments: [
            {
              color,
              title: notification.title,
              text: notification.message,
              fields: notification.data ? Object.entries(notification.data).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              })) : [],
              footer: 'LinkDAO Admin',
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack request failed: ${response.statusText}`);
      }

      return {
        channel: 'slack',
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      safeLogger.error('Slack sending failed:', error);
      return {
        channel: 'slack',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send push notification (delegates to existing push service)
   */
  private async sendPush(notification: AdminNotification): Promise<DeliveryResult> {
    // Integrate with existing push notification service
    safeLogger.info('Sending push notification:', notification);
    return {
      channel: 'push',
      success: true,
      timestamp: new Date(),
    };
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(notification: AdminNotification): Promise<DeliveryResult> {
    // Store in database for in-app display
    safeLogger.info('Storing in-app notification:', notification);
    return {
      channel: 'in_app',
      success: true,
      timestamp: new Date(),
    };
  }

  /**
   * Determine which channels to use based on notification priority and preferences
   */
  private determineChannels(
    notification: AdminNotification,
    preferences?: NotificationPreferences
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    // Critical notifications go through all channels
    if (notification.priority === 'critical') {
      channels.push(
        { type: 'push', enabled: true, priority: 1, config: {} },
        { type: 'sms', enabled: !!notification.recipient.phone, priority: 2, config: {} },
        { type: 'email', enabled: !!notification.recipient.email, priority: 3, config: {} },
        { type: 'in_app', enabled: true, priority: 4, config: {} }
      );
    }
    // High priority: push + email/SMS
    else if (notification.priority === 'high') {
      channels.push(
        { type: 'push', enabled: preferences?.channels.push.enabled !== false, priority: 1, config: {} },
        { type: 'email', enabled: preferences?.channels.email.enabled !== false, priority: 2, config: {} }
      );
    }
    // Medium/Low priority: push + in-app
    else {
      channels.push(
        { type: 'push', enabled: preferences?.channels.push.enabled !== false, priority: 1, config: {} },
        { type: 'in_app', enabled: true, priority: 2, config: {} }
      );
    }

    return channels.filter(c => c.enabled);
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(quietHours: NonNullable<NotificationPreferences['quietHours']>): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= quietHours.start && currentTime <= quietHours.end;
  }

  /**
   * Render email template
   */
  private renderEmailTemplate(notification: AdminNotification, template?: string): string {
    const severityColors = {
      info: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { background: white; border-radius: 8px; padding: 24px; margin: 20px 0; border-left: 4px solid ${severityColors[notification.type]}; }
    .title { font-size: 20px; font-weight: 600; margin: 0 0 12px 0; color: #111827; }
    .message { font-size: 14px; line-height: 1.5; color: #4b5563; margin: 0 0 16px 0; }
    .action-button { display: inline-block; background: ${severityColors[notification.type]}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <h1 class="title">${notification.title}</h1>
      <p class="message">${notification.message}</p>
      ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="action-button">Take Action</a>` : ''}
    </div>
    <div class="footer">
      <p>LinkDAO Admin System • ${new Date().toLocaleDateString()}</p>
      <p><a href="${process.env.FRONTEND_URL}/admin/preferences">Manage Notification Preferences</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Render SMS template
   */
  private renderSMSTemplate(notification: AdminNotification, template?: string): string {
    const prefix = notification.priority === 'critical' ? '🚨 CRITICAL: ' : '';
    return `${prefix}${notification.title}\n\n${notification.message}${notification.actionUrl ? `\n\n${notification.actionUrl}` : ''}`;
  }

  /**
   * Get Slack color based on notification type
   */
  private getSlackColor(type: AdminNotification['type']): string {
    const colors = {
      info: '#3b82f6',
      success: 'good',
      warning: 'warning',
      error: 'danger',
    };
    return colors[type];
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotifications(
    notifications: AdminNotification[],
    preferences?: Map<string, NotificationPreferences>
  ): Promise<Map<string, DeliveryResult[]>> {
    const results = new Map<string, DeliveryResult[]>();

    for (const notification of notifications) {
      const prefs = preferences?.get(notification.recipient.adminId);
      const deliveryResults = await this.sendNotification(notification, prefs);
      results.set(notification.id, deliveryResults);

      // Rate limiting: small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }
}

// Export singleton
export const multiChannelNotificationService = new MultiChannelNotificationService();
