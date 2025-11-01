import nodemailer from 'nodemailer';
import { safeLogger } from '../utils/safeLogger';
import twilio from 'twilio';
import crypto from 'crypto';

interface VerificationCode {
  code: string;
  email?: string;
  phone?: string;
  expiresAt: Date;
  attempts: number;
}

export class VerificationService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: any;
  private verificationCodes: Map<string, VerificationCode> = new Map();

  // Rate limiting
  private emailAttempts: Map<string, number> = new Map();
  private phoneAttempts: Map<string, number> = new Map();

  constructor() {
    this.initializeEmailService();
    this.initializeSMSService();
    this.cleanupExpiredCodes();
  }

  private initializeEmailService() {
    // Check for email service configuration
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      safeLogger.warn('⚠️  Email service not configured. Set SMTP_USER and SMTP_PASS environment variables.');
      return;
    }

    try {
      this.emailTransporter = nodemailer.createTransporter(emailConfig);
      safeLogger.info('✅ Email service initialized');
    } catch (error) {
      safeLogger.error('❌ Failed to initialize email service:', error);
    }
  }

  private initializeSMSService() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      safeLogger.warn('⚠️  SMS service not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
      return;
    }

    try {
      this.twilioClient = twilio(accountSid, authToken);
      safeLogger.info('✅ SMS service initialized');
    } catch (error) {
      safeLogger.error('❌ Failed to initialize SMS service:', error);
    }
  }

  /**
   * Send email verification code
   */
  async sendEmailVerification(email: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Rate limiting check
      const attempts = this.emailAttempts.get(email) || 0;
      if (attempts >= 5) {
        return {
          success: false,
          message: 'Too many attempts. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED'
        };
      }

      // Validate email format
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          message: 'Invalid email address format',
          error: 'INVALID_EMAIL'
        };
      }

      if (!this.emailTransporter) {
        return {
          success: false,
          message: 'Email service not configured',
          error: 'SERVICE_UNAVAILABLE'
        };
      }

      // Generate verification code
      const code = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code
      const verificationKey = `email:${email}`;
      this.verificationCodes.set(verificationKey, {
        code,
        email,
        expiresAt,
        attempts: 0
      });

      // Send email
      await this.emailTransporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@linkdao.io',
        to: email,
        subject: 'LinkDAO Marketplace - Email Verification',
        html: this.generateEmailTemplate(code)
      });

      // Update rate limiting
      this.emailAttempts.set(email, attempts + 1);

      // Clean up rate limiting after 1 hour
      setTimeout(() => {
        this.emailAttempts.delete(email);
      }, 60 * 60 * 1000);

      safeLogger.info(`✅ Verification email sent to ${email}`);

      return {
        success: true,
        message: 'Verification email sent successfully'
      };

    } catch (error) {
      safeLogger.error('❌ Failed to send email verification:', error);
      return {
        success: false,
        message: 'Failed to send verification email. Please try again.',
        error: 'SEND_FAILED'
      };
    }
  }

  /**
   * Send phone verification code via SMS
   */
  async sendPhoneVerification(phone: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Rate limiting check
      const attempts = this.phoneAttempts.get(phone) || 0;
      if (attempts >= 5) {
        return {
          success: false,
          message: 'Too many attempts. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED'
        };
      }

      // Validate phone format
      if (!this.isValidPhone(phone)) {
        return {
          success: false,
          message: 'Invalid phone number format',
          error: 'INVALID_PHONE'
        };
      }

      if (!this.twilioClient) {
        return {
          success: false,
          message: 'SMS service not configured',
          error: 'SERVICE_UNAVAILABLE'
        };
      }

      // Generate verification code
      const code = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code
      const verificationKey = `phone:${phone}`;
      this.verificationCodes.set(verificationKey, {
        code,
        phone,
        expiresAt,
        attempts: 0
      });

      // Send SMS
      await this.twilioClient.messages.create({
        body: `Your LinkDAO verification code is: ${code}. This code expires in 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        to: phone.startsWith('+') ? phone : `+1${phone}`
      });

      // Update rate limiting
      this.phoneAttempts.set(phone, attempts + 1);

      // Clean up rate limiting after 1 hour
      setTimeout(() => {
        this.phoneAttempts.delete(phone);
      }, 60 * 60 * 1000);

      safeLogger.info(`✅ Verification SMS sent to ${phone}`);

      return {
        success: true,
        message: 'Verification code sent successfully'
      };

    } catch (error) {
      safeLogger.error('❌ Failed to send SMS verification:', error);
      return {
        success: false,
        message: 'Failed to send verification code. Please try again.',
        error: 'SEND_FAILED'
      };
    }
  }

  /**
   * Verify email with code
   */
  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const verificationKey = `email:${email}`;
      const storedVerification = this.verificationCodes.get(verificationKey);

      if (!storedVerification) {
        return {
          success: false,
          message: 'No verification code found. Please request a new one.',
          error: 'CODE_NOT_FOUND'
        };
      }

      // Check if expired
      if (new Date() > storedVerification.expiresAt) {
        this.verificationCodes.delete(verificationKey);
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.',
          error: 'CODE_EXPIRED'
        };
      }

      // Check attempts
      if (storedVerification.attempts >= 3) {
        this.verificationCodes.delete(verificationKey);
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new verification code.',
          error: 'TOO_MANY_ATTEMPTS'
        };
      }

      // Verify code
      if (storedVerification.code !== code.trim()) {
        storedVerification.attempts++;
        return {
          success: false,
          message: 'Invalid verification code. Please try again.',
          error: 'INVALID_CODE'
        };
      }

      // Success - remove the code
      this.verificationCodes.delete(verificationKey);

      safeLogger.info(`✅ Email ${email} verified successfully`);

      return {
        success: true,
        message: 'Email verified successfully'
      };

    } catch (error) {
      safeLogger.error('❌ Failed to verify email:', error);
      return {
        success: false,
        message: 'Verification failed. Please try again.',
        error: 'VERIFY_FAILED'
      };
    }
  }

  /**
   * Verify phone with code
   */
  async verifyPhone(phone: string, code: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const verificationKey = `phone:${phone}`;
      const storedVerification = this.verificationCodes.get(verificationKey);

      if (!storedVerification) {
        return {
          success: false,
          message: 'No verification code found. Please request a new one.',
          error: 'CODE_NOT_FOUND'
        };
      }

      // Check if expired
      if (new Date() > storedVerification.expiresAt) {
        this.verificationCodes.delete(verificationKey);
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.',
          error: 'CODE_EXPIRED'
        };
      }

      // Check attempts
      if (storedVerification.attempts >= 3) {
        this.verificationCodes.delete(verificationKey);
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new verification code.',
          error: 'TOO_MANY_ATTEMPTS'
        };
      }

      // Verify code
      if (storedVerification.code !== code.trim()) {
        storedVerification.attempts++;
        return {
          success: false,
          message: 'Invalid verification code. Please try again.',
          error: 'INVALID_CODE'
        };
      }

      // Success - remove the code
      this.verificationCodes.delete(verificationKey);

      safeLogger.info(`✅ Phone ${phone} verified successfully`);

      return {
        success: true,
        message: 'Phone verified successfully'
      };

    } catch (error) {
      safeLogger.error('❌ Failed to verify phone:', error);
      return {
        success: false,
        message: 'Verification failed. Please try again.',
        error: 'VERIFY_FAILED'
      };
    }
  }

  // Helper methods

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    // Check if it's a valid US phone number (10 or 11 digits)
    return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
  }

  private generateEmailTemplate(code: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - LinkDAO</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
          }
          .verification-code {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            font-size: 32px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            letter-spacing: 8px;
            color: #495057;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Email Verification</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">LinkDAO Marketplace</p>
          </div>

          <div class="content">
            <h2>Verify your email address</h2>
            <p>Thank you for joining LinkDAO Marketplace! To complete your account setup and unlock enhanced features, please use the verification code below:</p>

            <div class="verification-code">
              ${code}
            </div>

            <p><strong>This code will expire in 10 minutes.</strong></p>

            <div class="warning">
              <strong>Important:</strong> If you didn't request this verification, please ignore this email. Never share your verification code with anyone.
            </div>

            <p>Once verified, you'll be able to:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>✅ Sell physical goods with shipping</li>
              <li>✅ Get priority support and dispute resolution</li>
              <li>✅ Receive verified seller badge</li>
              <li>✅ Higher trust score with buyers</li>
            </ul>
          </div>

          <div class="footer">
            <p>This is an automated message from LinkDAO Marketplace.<br>
            If you have any questions, contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private cleanupExpiredCodes() {
    setInterval(() => {
      const now = new Date();
      for (const [key, verification] of this.verificationCodes.entries()) {
        if (now > verification.expiresAt) {
          this.verificationCodes.delete(key);
        }
      }
    }, 60 * 1000); // Run every minute
  }

  /**
   * Get verification service status
   */
  getServiceStatus(): {
    email: { configured: boolean; service: string };
    sms: { configured: boolean; service: string };
  } {
    return {
      email: {
        configured: !!this.emailTransporter,
        service: this.emailTransporter ? 'SMTP' : 'Not configured'
      },
      sms: {
        configured: !!this.twilioClient,
        service: this.twilioClient ? 'Twilio' : 'Not configured'
      }
    };
  }

  /**
   * Test email service connection
   */
  async testEmailService(): Promise<boolean> {
    try {
      if (!this.emailTransporter) return false;
      await this.emailTransporter.verify();
      return true;
    } catch (error) {
      safeLogger.error('Email service test failed:', error);
      return false;
    }
  }
}

export const verificationService = new VerificationService();
