import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { db } from '../db';
import { bridgeAlerts } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface BridgeAlert {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  chainId?: number;
  transactionId?: string;
  validatorAddress?: string;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: any;
  createdAt: Date;
}

export interface NotificationChannel {
  name: string;
  type: 'email' | 'webhook' | 'slack' | 'discord' | 'telegram';
  config: any;
  isActive: boolean;
  severityFilter: string[]; // Which severities to notify for
}

export class BridgeNotificationService extends EventEmitter {
  private channels: Map<string, NotificationChannel> = new Map();
  private alertQueue: BridgeAlert[] = [];
  private isProcessing: boolean = false;

  constructor() {
    super();
    this.initializeDefaultChannels();
    this.startAlertProcessor();
  }

  /**
   * Initialize default notification channels
   */
  private initializeDefaultChannels(): void {
    // Email notifications
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.addChannel({
        name: 'email',
        type: 'email',
        config: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          recipients: (process.env.BRIDGE_ALERT_EMAILS || '').split(',').filter(Boolean)
        },
        isActive: true,
        severityFilter: ['high', 'critical']
      });
    }

    // Webhook notifications
    if (process.env.BRIDGE_WEBHOOK_URL) {
      this.addChannel({
        name: 'webhook',
        type: 'webhook',
        config: {
          url: process.env.BRIDGE_WEBHOOK_URL,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.BRIDGE_WEBHOOK_AUTH || ''
          }
        },
        isActive: true,
        severityFilter: ['medium', 'high', 'critical']
      });
    }

    // Slack notifications
    if (process.env.SLACK_WEBHOOK_URL) {
      this.addChannel({
        name: 'slack',
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#bridge-alerts',
          username: 'Bridge Monitor',
          iconEmoji: ':warning:'
        },
        isActive: true,
        severityFilter: ['high', 'critical']
      });
    }

    // Discord notifications
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.addChannel({
        name: 'discord',
        type: 'discord',
        config: {
          webhookUrl: process.env.DISCORD_WEBHOOK_URL,
          username: 'Bridge Monitor',
          avatarUrl: process.env.DISCORD_AVATAR_URL || ''
        },
        isActive: true,
        severityFilter: ['high', 'critical']
      });
    }
  }

  /**
   * Add a notification channel
   */
  public addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.name, channel);
    logger.info(`Added notification channel: ${channel.name} (${channel.type})`);
  }

  /**
   * Remove a notification channel
   */
  public removeChannel(channelName: string): void {
    this.channels.delete(channelName);
    logger.info(`Removed notification channel: ${channelName}`);
  }

  /**
   * Create and send a bridge alert
   */
  public async createAlert(alert: Omit<BridgeAlert, 'id' | 'isResolved' | 'createdAt'>): Promise<string> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullAlert: BridgeAlert = {
      id: alertId,
      ...alert,
      isResolved: false,
      createdAt: new Date()
    };

    try {
      // Store alert in database
      await db.insert(bridgeAlerts).values({
        id: fullAlert.id,
        alertType: fullAlert.alertType,
        severity: fullAlert.severity,
        title: fullAlert.title,
        message: fullAlert.message,
        chainId: fullAlert.chainId,
        transactionId: fullAlert.transactionId,
        validatorAddress: fullAlert.validatorAddress,
        isResolved: fullAlert.isResolved,
        metadata: fullAlert.metadata ? JSON.stringify(fullAlert.metadata) : null
      });

      // Add to notification queue
      this.alertQueue.push(fullAlert);

      // Emit event
      this.emit('alert_created', fullAlert);

      logger.info(`Created bridge alert: ${alertId} - ${fullAlert.title}`);
      return alertId;
    } catch (error) {
      logger.error('Error creating bridge alert:', error);
      throw error;
    }
  }

  /**
   * Resolve a bridge alert
   */
  public async resolveAlert(alertId: string, resolvedBy?: string): Promise<void> {
    try {
      await db
        .update(bridgeAlerts)
        .set({
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy
        })
        .where(eq(bridgeAlerts.id, alertId));

      this.emit('alert_resolved', { alertId, resolvedBy });
      logger.info(`Resolved bridge alert: ${alertId}`);
    } catch (error) {
      logger.error('Error resolving bridge alert:', error);
      throw error;
    }
  }

  /**
   * Start the alert processor
   */
  private startAlertProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.alertQueue.length === 0) return;

      this.isProcessing = true;
      
      try {
        const alert = this.alertQueue.shift();
        if (alert) {
          await this.processAlert(alert);
        }
      } catch (error) {
        logger.error('Error processing alert:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process alerts every second
  }

  /**
   * Process a single alert
   */
  private async processAlert(alert: BridgeAlert): Promise<void> {
    logger.info(`Processing alert: ${alert.id} - ${alert.title}`);

    // Send notifications to all active channels that match severity filter
    const promises: Promise<void>[] = [];

    for (const [channelName, channel] of this.channels) {
      if (!channel.isActive || !channel.severityFilter.includes(alert.severity)) {
        continue;
      }

      promises.push(this.sendNotification(channel, alert));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send notification to a specific channel
   */
  private async sendNotification(channel: NotificationChannel, alert: BridgeAlert): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(channel, alert);
          break;
        case 'webhook':
          await this.sendWebhookNotification(channel, alert);
          break;
        case 'slack':
          await this.sendSlackNotification(channel, alert);
          break;
        case 'discord':
          await this.sendDiscordNotification(channel, alert);
          break;
        case 'telegram':
          await this.sendTelegramNotification(channel, alert);
          break;
        default:
          logger.warn(`Unknown notification channel type: ${channel.type}`);
      }

      logger.info(`Sent notification via ${channel.name} for alert: ${alert.id}`);
    } catch (error) {
      logger.error(`Failed to send notification via ${channel.name}:`, error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(channel: NotificationChannel, alert: BridgeAlert): Promise<void> {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter(channel.config);
    
    const subject = `[${alert.severity.toUpperCase()}] Bridge Alert: ${alert.title}`;
    const html = this.generateEmailTemplate(alert);

    await transporter.sendMail({
      from: channel.config.auth.user,
      to: channel.config.recipients.join(','),
      subject,
      html
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(channel: NotificationChannel, alert: BridgeAlert): Promise<void> {
    const fetch = require('node-fetch');
    
    const payload = {
      alert: {
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        chainId: alert.chainId,
        transactionId: alert.transactionId,
        validatorAddress: alert.validatorAddress,
        metadata: alert.metadata,
        createdAt: alert.createdAt.toISOString()
      },
      timestamp: new Date().toISOString()
    };

    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: channel.config.headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(channel: NotificationChannel, alert: BridgeAlert): Promise<void> {
    const fetch = require('node-fetch');
    
    const color = this.getSeverityColor(alert.severity);
    const payload = {
      channel: channel.config.channel,
      username: channel.config.username,
      icon_emoji: channel.config.iconEmoji,
      attachments: [
        {
          color,
          title: `${alert.severity.toUpperCase()} Alert: ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: 'Alert Type',
              value: alert.alertType,
              short: true
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            ...(alert.chainId ? [{
              title: 'Chain ID',
              value: alert.chainId.toString(),
              short: true
            }] : []),
            ...(alert.transactionId ? [{
              title: 'Transaction ID',
              value: alert.transactionId,
              short: true
            }] : []),
            ...(alert.validatorAddress ? [{
              title: 'Validator',
              value: alert.validatorAddress,
              short: true
            }] : [])
          ],
          footer: 'Bridge Monitor',
          ts: Math.floor(alert.createdAt.getTime() / 1000)
        }
      ]
    };

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send Discord notification
   */
  private async sendDiscordNotification(channel: NotificationChannel, alert: BridgeAlert): Promise<void> {
    const fetch = require('node-fetch');
    
    const color = this.getSeverityColorHex(alert.severity);
    const payload = {
      username: channel.config.username,
      avatar_url: channel.config.avatarUrl,
      embeds: [
        {
          title: `${alert.severity.toUpperCase()} Alert: ${alert.title}`,
          description: alert.message,
          color: parseInt(color.replace('#', ''), 16),
          fields: [
            {
              name: 'Alert Type',
              value: alert.alertType,
              inline: true
            },
            {
              name: 'Severity',
              value: alert.severity.toUpperCase(),
              inline: true
            },
            ...(alert.chainId ? [{
              name: 'Chain ID',
              value: alert.chainId.toString(),
              inline: true
            }] : []),
            ...(alert.transactionId ? [{
              name: 'Transaction ID',
              value: alert.transactionId,
              inline: false
            }] : []),
            ...(alert.validatorAddress ? [{
              name: 'Validator',
              value: alert.validatorAddress,
              inline: false
            }] : [])
          ],
          footer: {
            text: 'Bridge Monitor'
          },
          timestamp: alert.createdAt.toISOString()
        }
      ]
    };

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegramNotification(channel: NotificationChannel, alert: BridgeAlert): Promise<void> {
    const fetch = require('node-fetch');
    
    const message = this.formatTelegramMessage(alert);
    const payload = {
      chat_id: channel.config.chatId,
      text: message,
      parse_mode: 'HTML'
    };

    const response = await fetch(`https://api.telegram.org/bot${channel.config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Telegram API failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Generate email template
   */
  private generateEmailTemplate(alert: BridgeAlert): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background-color: ${this.getSeverityColorHex(alert.severity)}; color: white; padding: 20px;">
              <h1 style="margin: 0; font-size: 24px;">${alert.severity.toUpperCase()} Alert</h1>
              <h2 style="margin: 10px 0 0 0; font-size: 18px; font-weight: normal;">${alert.title}</h2>
            </div>
            <div style="padding: 20px;">
              <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">${alert.message}</p>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Alert Type:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${alert.alertType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Severity:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${alert.severity.toUpperCase()}</td>
                </tr>
                ${alert.chainId ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Chain ID:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${alert.chainId}</td>
                </tr>
                ` : ''}
                ${alert.transactionId ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Transaction ID:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-family: monospace;">${alert.transactionId}</td>
                </tr>
                ` : ''}
                ${alert.validatorAddress ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Validator:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-family: monospace;">${alert.validatorAddress}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Created At:</td>
                  <td style="padding: 8px 0;">${alert.createdAt.toISOString()}</td>
                </tr>
              </table>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; color: #666; font-size: 14px;">
              Bridge Monitor Alert System
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Format Telegram message
   */
  private formatTelegramMessage(alert: BridgeAlert): string {
    let message = `🚨 <b>${alert.severity.toUpperCase()} Alert</b>\n\n`;
    message += `<b>${alert.title}</b>\n\n`;
    message += `${alert.message}\n\n`;
    message += `<b>Details:</b>\n`;
    message += `• Type: ${alert.alertType}\n`;
    message += `• Severity: ${alert.severity.toUpperCase()}\n`;
    
    if (alert.chainId) {
      message += `• Chain ID: ${alert.chainId}\n`;
    }
    
    if (alert.transactionId) {
      message += `• Transaction: <code>${alert.transactionId}</code>\n`;
    }
    
    if (alert.validatorAddress) {
      message += `• Validator: <code>${alert.validatorAddress}</code>\n`;
    }
    
    message += `• Time: ${alert.createdAt.toISOString()}`;
    
    return message;
  }

  /**
   * Get severity color for Slack
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'low': return 'good';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      case 'critical': return '#8B0000';
      default: return '#808080';
    }
  }

  /**
   * Get severity color hex
   */
  private getSeverityColorHex(severity: string): string {
    switch (severity) {
      case 'low': return '#28a745';
      case 'medium': return '#ffc107';
      case 'high': return '#dc3545';
      case 'critical': return '#8B0000';
      default: return '#6c757d';
    }
  }

  /**
   * Get active channels
   */
  public getActiveChannels(): NotificationChannel[] {
    return Array.from(this.channels.values()).filter(channel => channel.isActive);
  }

  /**
   * Update channel configuration
   */
  public updateChannel(channelName: string, updates: Partial<NotificationChannel>): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      Object.assign(channel, updates);
      logger.info(`Updated notification channel: ${channelName}`);
    }
  }

  /**
   * Test notification channel
   */
  public async testChannel(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel not found: ${channelName}`);
    }

    const testAlert: BridgeAlert = {
      id: 'test-alert',
      alertType: 'test',
      severity: 'low',
      title: 'Test Notification',
      message: 'This is a test notification from the Bridge Monitor system.',
      isResolved: false,
      createdAt: new Date()
    };

    await this.sendNotification(channel, testAlert);
  }
}
