/**
 * SMS Service
 * Twilio integration for SMS notifications
 */

import twilio from 'twilio';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';

export interface SMSMessage {
  to: string;
  body: string;
  templateName?: string;
  variables?: Record<string, any>;
}

export interface SMSResult {
  messageId: string;
  to: string;
  status: 'queued' | 'sent' | 'failed';
  sentAt: Date;
  error?: string;
}

export class SMSService {
  private twilioClient: twilio.Twilio | null = null;
  private databaseService: DatabaseService;
  private fromNumber: string;
  private isConfigured: boolean = false;

  constructor() {
    this.databaseService = new DatabaseService();

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (accountSid && authToken && this.fromNumber) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        this.isConfigured = true;
        safeLogger.info('[SMSService] Initialized with Twilio');
      } catch (error) {
        safeLogger.error('[SMSService] Failed to initialize Twilio:', error);
        this.isConfigured = false;
      }
    } else {
      safeLogger.warn('[SMSService] Twilio credentials not configured. SMS will be disabled.');
      this.isConfigured = false;
    }
  }

  /**
   * Check if SMS service is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Send SMS message
   */
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    try {
      if (!this.isConfigured || !this.twilioClient) {
        throw new Error('SMS service is not configured');
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(message.to)) {
        throw new Error(`Invalid phone number format: ${message.to}`);
      }

      safeLogger.info(`[SMS] Sending SMS to ${message.to}...`);

      const result = await this.twilioClient.messages.create({
        to: message.to,
        from: this.fromNumber,
        body: message.body,
      });

      const smsResult: SMSResult = {
        messageId: result.sid,
        to: message.to,
        status: (result.status as any) || 'sent',
        sentAt: new Date(),
      };

      // Log SMS delivery
      try {
        await this.databaseService.createNotificationLog({
          templateName: message.templateName || 'generic-sms',
          channel: 'sms',
          recipient: message.to,
          body: message.body,
          variables: message.variables,
          status: 'sent',
        });
      } catch (dbError) {
        safeLogger.warn('[SMS] Failed to log SMS delivery:', dbError);
      }

      safeLogger.info(`[SMS] SMS sent successfully: ${result.sid}`);
      return smsResult;
    } catch (error) {
      safeLogger.error('[SMS] Error sending SMS:', error);

      const smsResult: SMSResult = {
        messageId: '',
        to: message.to,
        status: 'failed',
        sentAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return smsResult;
    }
  }

  /**
   * Send SMS with template
   */
  async sendTemplatedSMS(
    to: string,
    templateName: string,
    variables: Record<string, any>
  ): Promise<SMSResult> {
    try {
      // Get template and render
      const template = await this.databaseService.getNotificationTemplate(templateName);
      if (!template || template.channel !== 'sms') {
        throw new Error(`SMS template not found: ${templateName}`);
      }

      // Simple variable replacement for SMS (no EJS due to SMS length constraints)
      let body = template.bodyTemplate;
      for (const [key, value] of Object.entries(variables)) {
        body = body.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }

      return this.sendSMS({
        to,
        body,
        templateName,
        variables,
      });
    } catch (error) {
      safeLogger.error('[SMS] Error sending templated SMS:', error);
      throw error;
    }
  }

  /**
   * Send order shipped SMS
   */
  async sendOrderShippedSMS(
    phone: string,
    orderNumber: string,
    trackingUrl: string
  ): Promise<SMSResult> {
    const message = `Your order #${orderNumber} has shipped! Track: ${trackingUrl}`;

    return this.sendSMS({
      to: phone,
      body: message,
      templateName: 'order_shipped_sms',
      variables: { orderNumber, trackingUrl },
    });
  }

  /**
   * Send receipt ready SMS
   */
  async sendReceiptReadySMS(phone: string, receiptNumber: string, downloadUrl: string): Promise<SMSResult> {
    const message = `Your receipt #${receiptNumber} is ready. Download: ${downloadUrl}`;

    return this.sendSMS({
      to: phone,
      body: message,
      templateName: 'receipt_ready_sms',
      variables: { receiptNumber, downloadUrl },
    });
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCodeSMS(phone: string, code: string): Promise<SMSResult> {
    const message = `Your LinkDAO verification code is: ${code}. Valid for 10 minutes.`;

    return this.sendSMS({
      to: phone,
      body: message,
      templateName: 'verification_code_sms',
      variables: { code },
    });
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  /**
   * Get SMS service status
   */
  getStatus(): Record<string, any> {
    return {
      isConfigured: this.isConfigured,
      fromNumber: this.isConfigured ? this.fromNumber : 'not-configured',
      provider: 'twilio',
    };
  }
}

// Export singleton instance
export const smsService = new SMSService();
