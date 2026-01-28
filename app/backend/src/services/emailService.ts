import { Resend } from 'resend';
import { getPrimaryFrontendUrl } from '../utils/urlUtils';
import { safeLogger } from '../utils/safeLogger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface CommunityNotificationEmailData {
  communityName: string;
  communityAvatar?: string;
  actionUrl: string;
  userName?: string;
  contentPreview?: string;
  metadata?: Record<string, any>;
}

export class EmailService {
  private static instance: EmailService;
  private resend: Resend | null = null;
  private fromEmail: string;
  private enabled: boolean;

  private constructor() {
    // Initialize Resend only if API key is provided
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@linkdao.io';
    this.enabled = !!apiKey;

    if (this.enabled) {
      this.resend = new Resend(apiKey);
      safeLogger.info('Email service initialized with Resend');
    } else {
      safeLogger.warn('Email service disabled: RESEND_API_KEY not configured');
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled || !this.resend) {
      safeLogger.info('[EmailService] Email disabled or not configured, skipping:', options.subject);
      return false;
    }

    try {
      const from = options.from || this.fromEmail;

      const result = await this.resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (result.error) {
        safeLogger.error('[EmailService] Failed to send email:', result.error);
        return false;
      }

      safeLogger.info('[EmailService] Email sent successfully:', result.data?.id);
      return true;
    } catch (error) {
      safeLogger.error('[EmailService] Error sending email:', error);
      return false;
    }
  }

  /**
   * Send community join notification email
   */
  async sendCommunityJoinEmail(
    email: string,
    data: CommunityNotificationEmailData
  ): Promise<boolean> {
    const html = this.getCommunityJoinTemplate(data);
    return this.sendEmail({
      to: email,
      subject: `Welcome to ${data.communityName}!`,
      html,
    });
  }

  /**
   * Send new post notification email
   */
  async sendNewPostEmail(
    email: string,
    data: CommunityNotificationEmailData
  ): Promise<boolean> {
    const html = this.getNewPostTemplate(data);
    return this.sendEmail({
      to: email,
      subject: `New post in ${data.communityName}`,
      html,
    });
  }

  /**
   * Send comment notification email
   */
  async sendCommentEmail(
    email: string,
    data: CommunityNotificationEmailData
  ): Promise<boolean> {
    const html = this.getCommentTemplate(data);
    return this.sendEmail({
      to: email,
      subject: `New comment in ${data.communityName}`,
      html,
    });
  }

  /**
   * Send governance proposal notification email
   */
  async sendGovernanceProposalEmail(
    email: string,
    data: CommunityNotificationEmailData
  ): Promise<boolean> {
    const html = this.getGovernanceProposalTemplate(data);
    return this.sendEmail({
      to: email,
      subject: `New governance proposal in ${data.communityName}`,
      html,
    });
  }

  /**
   * Send moderation action notification email
   */
  async sendModerationActionEmail(
    email: string,
    data: CommunityNotificationEmailData
  ): Promise<boolean> {
    const html = this.getModerationActionTemplate(data);
    return this.sendEmail({
      to: email,
      subject: `Moderation action in ${data.communityName}`,
      html,
    });
  }

  /**
   * Send community role change notification email
   */
  async sendRoleChangeEmail(
    email: string,
    data: CommunityNotificationEmailData
  ): Promise<boolean> {
    const html = this.getRoleChangeTemplate(data);
    return this.sendEmail({
      to: email,
      subject: `Your role has changed in ${data.communityName}`,
      html,
    });
  }

  // Template Methods

  private getEmailHeader(communityName: string, communityAvatar?: string): string {
    return `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        ${communityAvatar ? `<img src="${communityAvatar}" alt="${communityName}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid white; margin-bottom: 16px;" />` : ''}
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">${communityName}</h1>
      </div>
    `;
  }

  private getEmailFooter(): string {
    return `
      <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
        <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO - Decentralized Community Platform</p>
        <p style="color: #6c757d; font-size: 12px; margin: 0;">
          You received this email because you're a member of this community.
          <a href="{{unsubscribeUrl}}" style="color: #667eea; text-decoration: none;">Manage notification preferences</a>
        </p>
      </div>
    `;
  }

  private getCommunityJoinTemplate(data: CommunityNotificationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${data.communityName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader(data.communityName, data.communityAvatar)}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">Welcome to the community! 🎉</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              You've successfully joined <strong>${data.communityName}</strong>. Get ready to connect with like-minded individuals and participate in meaningful discussions.
            </p>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <h3 style="color: #1a1a1a; font-size: 18px; margin: 0 0 12px 0;">What you can do now:</h3>
              <ul style="color: #4a5568; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Introduce yourself to the community</li>
                <li>Create your first post or comment</li>
                <li>Participate in governance proposals</li>
                <li>Earn reputation by contributing</li>
              </ul>
            </div>

            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              Visit Community
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getNewPostTemplate(data: CommunityNotificationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Post in ${data.communityName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader(data.communityName, data.communityAvatar)}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">New Post in Your Community</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${data.userName ? `<strong>${data.userName}</strong> posted` : 'Someone posted'} in <strong>${data.communityName}</strong>:
            </p>

            ${data.contentPreview ? `
              <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; border-radius: 4px; margin: 24px 0;">
                <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0;">
                  ${data.contentPreview}
                </p>
              </div>
            ` : ''}

            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Post
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getCommentTemplate(data: CommunityNotificationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Comment in ${data.communityName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader(data.communityName, data.communityAvatar)}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">New Comment on Your Post</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${data.userName ? `<strong>${data.userName}</strong> commented` : 'Someone commented'} on your post in <strong>${data.communityName}</strong>:
            </p>

            ${data.contentPreview ? `
              <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; border-radius: 4px; margin: 24px 0;">
                <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0;">
                  ${data.contentPreview}
                </p>
              </div>
            ` : ''}

            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Comment
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getGovernanceProposalTemplate(data: CommunityNotificationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Governance Proposal in ${data.communityName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader(data.communityName, data.communityAvatar)}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">🗳️ New Governance Proposal</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              A new governance proposal has been submitted in <strong>${data.communityName}</strong>. Your vote matters!
            </p>

            ${data.contentPreview ? `
              <div style="background: #fff7ed; padding: 20px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 24px 0;">
                <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0;">
                  <strong>Proposal:</strong> ${data.contentPreview}
                </p>
              </div>
            ` : ''}

            <div style="background: #f0fdf4; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <p style="color: #15803d; font-size: 14px; margin: 0;">
                ⏰ Voting is now open. Make your voice heard!
              </p>
            </div>

            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View & Vote
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getModerationActionTemplate(data: CommunityNotificationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Moderation Action in ${data.communityName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader(data.communityName, data.communityAvatar)}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">⚠️ Moderation Action</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              A moderation action has been taken on your content in <strong>${data.communityName}</strong>.
            </p>

            ${data.contentPreview ? `
              <div style="background: #fef2f2; padding: 20px; border-left: 4px solid #ef4444; border-radius: 4px; margin: 24px 0;">
                <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0;">
                  ${data.contentPreview}
                </p>
              </div>
            ` : ''}

            <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
              Please review the community guidelines and ensure future contributions comply with the rules.
            </p>

            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Details
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getRoleChangeTemplate(data: CommunityNotificationEmailData): string {
    const roleInfo = data.metadata?.role || 'member';
    const isPromotion = data.metadata?.isPromotion !== false;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Role Change in ${data.communityName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader(data.communityName, data.communityAvatar)}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">
              ${isPromotion ? '🎉 Congratulations!' : 'Role Update'}
            </h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Your role in <strong>${data.communityName}</strong> has been ${isPromotion ? 'upgraded' : 'updated'} to <strong>${roleInfo}</strong>.
            </p>

            ${isPromotion ? `
              <div style="background: #f0fdf4; padding: 20px; border-left: 4px solid #10b981; border-radius: 4px; margin: 24px 0;">
                <p style="color: #15803d; font-size: 15px; line-height: 1.6; margin: 0;">
                  <strong>New privileges unlocked!</strong> As a ${roleInfo}, you now have additional permissions and responsibilities within the community.
                </p>
              </div>
            ` : ''}

            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              Visit Community
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send support ticket confirmation email
   */
  async sendTicketConfirmationEmail(
    email: string,
    ticketId: string,
    subject: string,
    priority: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f4f5f7; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
          <h2 style="color: #1a1a1a;">Support Ticket Created</h2>
          <p>Your support ticket has been created successfully.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 5px 0;"><strong>Priority:</strong> ${priority}</p>
          </div>
          <p>We'll respond within ${this.getResponseTime(priority)}.</p>
          <a href="${getPrimaryFrontendUrl()}/support/tickets/${ticketId}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Ticket</a>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: email, subject: `Ticket Created: ${ticketId}`, html });
  }

  /**
   * Send ticket status update email
   */
  async sendTicketStatusEmail(
    email: string,
    ticketId: string,
    status: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f4f5f7; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
          <h2 style="color: #1a1a1a;">Ticket Status Updated</h2>
          <p>Your support ticket <strong>${ticketId}</strong> status has been updated to: <strong>${status}</strong></p>
          <a href="${getPrimaryFrontendUrl()}/support/tickets/${ticketId}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Ticket</a>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: email, subject: `Ticket Update: ${ticketId}`, html });
  }

  /**
   * Send ticket response email
   */
  async sendTicketResponseEmail(
    email: string,
    ticketId: string,
    response: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f4f5f7; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
          <h2 style="color: #1a1a1a;">New Response to Your Ticket</h2>
          <p>Our support team has responded to ticket <strong>${ticketId}</strong>:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p>${response.substring(0, 200)}${response.length > 200 ? '...' : ''}</p>
          </div>
          <a href="${getPrimaryFrontendUrl()}/support/tickets/${ticketId}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Full Response</a>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: email, subject: `Response to Ticket: ${ticketId}`, html });
  }

  /**
   * Send newsletter welcome email
   */
  async sendNewsletterWelcomeEmail(email: string): Promise<boolean> {
    const html = this.getNewsletterWelcomeTemplate();
    return this.sendEmail({
      to: email,
      subject: 'Welcome to LinkDAO Newsletter!',
      html,
    });
  }

  private getNewsletterWelcomeTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to LinkDAO Newsletter</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">LinkDAO Newsletter</h1>
          </div>

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">Welcome Aboard! 🎉</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Thank you for subscribing to the LinkDAO newsletter! You're now part of our community of innovators and early adopters.
            </p>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <h3 style="color: #1a1a1a; font-size: 18px; margin: 0 0 12px 0;">What to expect:</h3>
              <ul style="color: #4a5568; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Latest updates on LinkDAO platform features</li>
                <li>Exclusive insights into decentralized governance</li>
                <li>Community highlights and success stories</li>
                <li>Upcoming events and opportunities</li>
              </ul>
            </div>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              We're excited to share our journey with you as we build the future of decentralized communities.
            </p>

            <a href="${getPrimaryFrontendUrl()}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              Visit LinkDAO
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO - Decentralized Community Platform</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              You received this email because you subscribed to our newsletter.
              <a href="{{unsubscribeUrl}}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getResponseTime(priority: string): string {
    const times = { urgent: '1 hour', high: '4 hours', medium: '12 hours', low: '24 hours' };
    return times[priority] || '24 hours';
  }

  /**
   * Send purchase receipt email
   */
  async sendPurchaseReceiptEmail(
    email: string,
    data: {
      orderId: string;
      goldAmount: number;
      totalCost: number;
      paymentMethod: string;
      network?: string;
      transactionHash?: string;
      timestamp: Date;
    }
  ): Promise<boolean> {
    const html = this.getPurchaseReceiptTemplate(data);
    return this.sendEmail({
      to: email,
      subject: `Receipt: Gold Purchase #${data.orderId}`,
      html,
    });
  }

  private getPurchaseReceiptTemplate(data: {
    orderId: string;
    goldAmount: number;
    totalCost: number;
    paymentMethod: string;
    network?: string;
    transactionHash?: string;
    timestamp: Date;
  }): string {
    const formattedDate = data.timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Purchase Receipt</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <div style="background: white; border-radius: 50%; width: 60px; height: 60px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <svg style="width: 40px; height: 40px;" fill="none" stroke="#667eea" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Purchase Receipt</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Order #${data.orderId}</p>
          </div>

          <div style="padding: 40px 30px;">
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #10b981;">
              <p style="color: #15803d; font-size: 16px; font-weight: 600; margin: 0;">Payment Successful!</p>
              <p style="color: #15803d; font-size: 14px; margin: 8px 0 0 0;">Your gold has been added to your account.</p>
            </div>

            <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 20px 0;">Order Details</h2>

            <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Date</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${formattedDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Payment Method</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${data.paymentMethod}</span>
              </div>
              ${data.network ? `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-size: 14px;">Network</span>
                  <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${data.network}</span>
                </div>
              ` : ''}
              ${data.transactionHash ? `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-size: 14px;">Transaction</span>
                  <span style="color: #1f2937; font-size: 12px; font-weight: 500; font-family: monospace; word-break: break-all;">${data.transactionHash.substring(0, 20)}...${data.transactionHash.substring(data.transactionHash.length - 8)}</span>
                </div>
              ` : ''}
            </div>

            <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 20px 0;">Payment Summary</h2>

            <div style="background: #fef3c7; padding: 24px; border-radius: 8px; margin-bottom: 24px; border: 2px solid #f59e0b;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="color: #92400e; font-size: 16px;">Gold Purchased</span>
                <span style="color: #92400e; font-size: 24px; font-weight: 700;">${data.goldAmount} 🪙</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #92400e; font-size: 16px;">Total Paid</span>
                <span style="color: #92400e; font-size: 24px; font-weight: 700;">$${data.totalCost.toFixed(2)}</span>
              </div>
            </div>

            <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
              <p style="color: #1e40af; font-size: 14px; margin: 0;">
                💡 <strong>Tip:</strong> Use your gold to give awards to posts and comments you love!
              </p>
            </div>

            <a href="${getPrimaryFrontendUrl()}/profile" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Your Gold Balance
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO - Decentralized Community Platform</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              Questions? Contact us at <a href="mailto:support@linkdao.io" style="color: #667eea; text-decoration: none;">support@linkdao.io</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send LDAO token purchase receipt email
   */
  async sendLDAOReceiptEmail(
    email: string,
    data: {
      orderId: string;
      transactionId: string;
      tokensPurchased: string;
      amount: number;
      currency: string;
      pricePerToken: string;
      paymentMethod: string;
      network?: string;
      transactionHash?: string;
      fees?: {
        processing?: string;
        platform?: string;
        gas?: string;
        total?: string;
      };
      timestamp: Date;
    }
  ): Promise<boolean> {
    const html = this.getLDAOReceiptTemplate(data);
    return this.sendEmail({
      to: email,
      subject: `Receipt: LDAO Token Purchase #${data.orderId}`,
      html,
    });
  }

  private getLDAOReceiptTemplate(data: {
    orderId: string;
    transactionId: string;
    tokensPurchased: string;
    amount: number;
    currency: string;
    pricePerToken: string;
    paymentMethod: string;
    network?: string;
    transactionHash?: string;
    fees?: {
      processing?: string;
      platform?: string;
      gas?: string;
      total?: string;
    };
    timestamp: Date;
  }): string {
    const formattedDate = data.timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const totalFees = (parseFloat(data.fees?.processing || '0') +
      parseFloat(data.fees?.platform || '0') +
      parseFloat(data.fees?.gas || '0')).toFixed(2);
    const totalFeesNum = parseFloat(totalFees);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LDAO Token Purchase Receipt</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <div style="background: white; border-radius: 50%; width: 60px; height: 60px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <svg style="width: 40px; height: 40px;" fill="none" stroke="#667eea" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">LDAO Token Purchase Receipt</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Order #${data.orderId}</p>
          </div>

          <div style="padding: 40px 30px;">
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #10b981;">
              <p style="color: #15803d; font-size: 16px; font-weight: 600; margin: 0;">Payment Successful!</p>
              <p style="color: #15803d; font-size: 14px; margin: 8px 0 0 0;">Your LDAO tokens have been added to your wallet.</p>
            </div>

            <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 20px 0;">Order Details</h2>

            <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Date</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${formattedDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Transaction ID</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 500; font-family: monospace;">${data.transactionId}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Payment Method</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${data.paymentMethod}</span>
              </div>
              ${data.network ? `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-size: 14px;">Network</span>
                  <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${data.network}</span>
                </div>
              ` : ''}
              ${data.transactionHash ? `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-size: 14px;">Transaction Hash</span>
                  <span style="color: #1f2937; font-size: 12px; font-weight: 500; font-family: monospace; word-break: break-all;">${data.transactionHash.substring(0, 20)}...${data.transactionHash.substring(data.transactionHash.length - 8)}</span>
                </div>
              ` : ''}
            </div>

            <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 20px 0;">Purchase Summary</h2>

            <div style="background: #dbeafe; padding: 24px; border-radius: 8px; margin-bottom: 24px; border: 2px solid #3b82f6;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="color: #1e40af; font-size: 16px;">LDAO Tokens Purchased</span>
                <span style="color: #1e40af; font-size: 24px; font-weight: 700;">${data.tokensPurchased} LDAO</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="color: #1e40af; font-size: 14px;">Price per Token</span>
                <span style="color: #1e40af; font-size: 16px; font-weight: 500;">$${data.pricePerToken}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="color: #1e40af; font-size: 14px;">Subtotal</span>
                <span style="color: #1e40af; font-size: 16px; font-weight: 500;">$${data.amount.toFixed(2)}</span>
              </div>
              ${totalFeesNum > 0 ? `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="color: #1e40af; font-size: 14px;">Fees</span>
                  <span style="color: #1e40af; font-size: 16px; font-weight: 500;">$${totalFees}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #3b82f6; padding-top: 16px; margin-top: 8px;">
                <span style="color: #1e40af; font-size: 18px; font-weight: 600;">Total Paid</span>
                <span style="color: #1e40af; font-size: 28px; font-weight: 700;">$${(data.amount + totalFeesNum).toFixed(2)}</span>
              </div>
            </div>

            <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
              <p style="color: #1e40af; font-size: 14px; margin: 0;">
                💡 <strong>Tip:</strong> LDAO tokens give you voting rights and access to exclusive features!
              </p>
            </div>

            <a href="${getPrimaryFrontendUrl()}/ldao-dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Your LDAO Balance
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO - Decentralized Community Platform</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              Questions? Contact us at <a href="mailto:support@linkdao.io" style="color: #667eea; text-decoration: none;">support@linkdao.io</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send marketplace purchase receipt email
   */
  async sendMarketplaceReceiptEmail(
    email: string,
    data: {
      orderId: string;
      transactionId: string;
      items: Array<{
        name: string;
        quantity: number;
        unitPrice: string;
        totalPrice: string;
      }>;
      subtotal: number;
      shipping: number;
      tax: number;
      platformFee: number;
      total: number;
      paymentMethod: string;
      network?: string;
      transactionHash?: string;
      sellerName: string;
      shippingAddress?: {
        name: string;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
      timestamp: Date;
    }
  ): Promise<boolean> {
    const html = this.getMarketplaceReceiptTemplate(data);
    return this.sendEmail({
      to: email,
      subject: `Receipt: Marketplace Order #${data.orderId}`,
      html,
    });
  }

  private getMarketplaceReceiptTemplate(data: {
    orderId: string;
    transactionId: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
    }>;
    subtotal: number;
    shipping: number;
    tax: number;
    platformFee: number;
    total: number;
    paymentMethod: string;
    network?: string;
    transactionHash?: string;
    sellerName: string;
    shippingAddress?: {
      name: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    timestamp: Date;
  }): string {
    const formattedDate = data.timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsHtml = data.items.map(item => `
      <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
        <div>
          <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${item.name}</div>
          <div style="color: #6b7280; font-size: 12px;">Qty: ${item.quantity} × $${item.unitPrice}</div>
        </div>
        <span style="color: #1f2937; font-size: 14px; font-weight: 500;">$${item.totalPrice}</span>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Marketplace Purchase Receipt</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <div style="background: white; border-radius: 50%; width: 60px; height: 60px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <svg style="width: 40px; height: 40px;" fill="none" stroke="#667eea" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
              </svg>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Marketplace Order Receipt</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Order #${data.orderId}</p>
          </div>

          <div style="padding: 40px 30px;">
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #10b981;">
              <p style="color: #15803d; font-size: 16px; font-weight: 600; margin: 0;">Order Confirmed!</p>
              <p style="color: #15803d; font-size: 14px; margin: 8px 0 0 0;">Your order has been placed successfully. The seller will ship your items soon.</p>
            </div>

            <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 20px 0;">Order Details</h2>

            <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Date</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${formattedDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Transaction ID</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 500; font-family: monospace;">${data.transactionId}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Seller</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${data.sellerName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 14px;">Payment Method</span>
                <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${data.paymentMethod}</span>
              </div>
              ${data.network ? `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-size: 14px;">Network</span>
                  <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${data.network}</span>
                </div>
              ` : ''}
              ${data.transactionHash ? `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-size: 14px;">Transaction Hash</span>
                  <span style="color: #1f2937; font-size: 12px; font-weight: 500; font-family: monospace; word-break: break-all;">${data.transactionHash.substring(0, 20)}...${data.transactionHash.substring(data.transactionHash.length - 8)}</span>
                </div>
              ` : ''}
            </div>

            ${data.shippingAddress ? `
              <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 20px 0;">Shipping Address</h2>
              <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                <p style="color: #1f2937; font-size: 14px; margin: 0 0 4px 0; font-weight: 500;">${data.shippingAddress.name}</p>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">${data.shippingAddress.street}</p>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}</p>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">${data.shippingAddress.country}</p>
              </div>
            ` : ''}

            <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 20px 0;">Order Items</h2>

            <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
              ${itemsHtml}
            </div>

            <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 20px 0;">Payment Summary</h2>

            <div style="background: #dbeafe; padding: 24px; border-radius: 8px; margin-bottom: 24px; border: 2px solid #3b82f6;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #3b82f6;">
                <span style="color: #1e40af; font-size: 14px;">Subtotal</span>
                <span style="color: #1e40af; font-size: 16px; font-weight: 500;">$${data.subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #3b82f6;">
                <span style="color: #1e40af; font-size: 14px;">Shipping</span>
                <span style="color: #1e40af; font-size: 16px; font-weight: 500;">$${data.shipping.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #3b82f6;">
                <span style="color: #1e40af; font-size: 14px;">Tax</span>
                <span style="color: #1e40af; font-size: 16px; font-weight: 500;">$${data.tax.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #3b82f6;">
                <span style="color: #1e40af; font-size: 14px;">Platform Fee</span>
                <span style="color: #1e40af; font-size: 16px; font-weight: 500;">$${data.platformFee.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #3b82f6; padding-top: 16px; margin-top: 8px;">
                <span style="color: #1e40af; font-size: 18px; font-weight: 600;">Total</span>
                <span style="color: #1e40af; font-size: 28px; font-weight: 700;">$${data.total.toFixed(2)}</span>
              </div>
            </div>

            <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
              <p style="color: #1e40af; font-size: 14px; margin: 0;">
                📦 <strong>Shipping Info:</strong> You'll receive tracking information once the seller ships your items.
              </p>
            </div>

            <a href="${getPrimaryFrontendUrl()}/marketplace/orders/${data.orderId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              Track Your Order
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO - Decentralized Community Platform</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              Questions? Contact us at <a href="mailto:support@linkdao.io" style="color: #667eea; text-decoration: none;">support@linkdao.io</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ============ Security Notification Methods ============

  /**
   * Send new device login notification
   */
  async sendNewDeviceLoginEmail(
    email: string,
    data: {
      userName?: string;
      device: string;
      browser?: string;
      os?: string;
      location?: string;
      ipAddress?: string;
      timestamp: Date;
      sessionId: string;
    }
  ): Promise<boolean> {
    const html = this.getNewDeviceLoginTemplate(data);
    return this.sendEmail({
      to: email,
      subject: '🔐 New Device Login Detected',
      html,
    });
  }

  /**
   * Send 2FA status change notification
   */
  /**
   * Send 2FA verification code email
   */
  async send2FAVerificationEmail(
    email: string,
    data: {
      code: string;
      expiresIn: number; // minutes
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: white; border: 2px dashed #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Two-Factor Authentication</h1>
          </div>
          <div class="content">
            <h2>Your Verification Code</h2>
            <p>Use this code to complete your two-factor authentication setup or login:</p>
            
            <div class="code-box">
              <div class="code">${data.code}</div>
              <p style="margin-top: 10px; color: #666;">This code expires in ${data.expiresIn} minutes</p>
            </div>

            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Never share this code with anyone</li>
                <li>LinkDAO staff will never ask for this code</li>
                <li>If you didn't request this code, please ignore this email</li>
              </ul>
            </div>

            <p>If you're having trouble, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LinkDAO. All rights reserved.</p>
            <p>This is an automated security email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Your LinkDAO Verification Code: ${data.code}`,
      html,
      text: `Your LinkDAO verification code is: ${data.code}. This code expires in ${data.expiresIn} minutes. Never share this code with anyone.`
    });
  }

  /**
   * Send 2FA change notification email
   */
  async send2FAChangeEmail(
    email: string,
    data: {
      userName?: string;
      action: 'enabled' | 'disabled';
      timestamp: Date;
      ipAddress?: string;
    }
  ): Promise<boolean> {
    const html = this.get2FAChangeTemplate(data);
    const subject = data.action === 'enabled'
      ? '✅ Two-Factor Authentication Enabled'
      : '⚠️ Two-Factor Authentication Disabled';
    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Send suspicious activity alert
   */
  async sendSuspiciousActivityEmail(
    email: string,
    data: {
      userName?: string;
      activityType: string;
      description: string;
      timestamp: Date;
      ipAddress?: string;
      location?: string;
    }
  ): Promise<boolean> {
    const html = this.getSuspiciousActivityTemplate(data);
    return this.sendEmail({
      to: email,
      subject: '⚠️ Suspicious Activity Detected',
      html,
    });
  }

  /**
   * Send large transaction alert
   */
  async sendLargeTransactionEmail(
    email: string,
    data: {
      userName?: string;
      amount: string;
      currency: string;
      recipient?: string;
      timestamp: Date;
      transactionHash?: string;
    }
  ): Promise<boolean> {
    const html = this.getLargeTransactionTemplate(data);
    return this.sendEmail({
      to: email,
      subject: '💰 Large Transaction Alert',
      html,
    });
  }

  /**
   * Send security settings change notification
   */
  async sendSecurityChangeEmail(
    email: string,
    data: {
      userName?: string;
      changeType: string;
      description: string;
      timestamp: Date;
      ipAddress?: string;
    }
  ): Promise<boolean> {
    const html = this.getSecurityChangeTemplate(data);
    return this.sendEmail({
      to: email,
      subject: '🔒 Security Settings Changed',
      html,
    });
  }

  /**
   * Send all sessions terminated notification
   */
  async sendSessionsTerminatedEmail(
    email: string,
    data: {
      userName?: string;
      timestamp: Date;
      ipAddress?: string;
      device?: string;
    }
  ): Promise<boolean> {
    const html = this.getSessionsTerminatedTemplate(data);
    return this.sendEmail({
      to: email,
      subject: '🚪 All Sessions Terminated',
      html,
    });
  }

  // Security Email Templates

  private getNewDeviceLoginTemplate(data: {
    userName?: string;
    device: string;
    browser?: string;
    os?: string;
    location?: string;
    ipAddress?: string;
    timestamp: Date;
    sessionId: string;
  }): string {
    const formattedDate = data.timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Device Login</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <div style="background: white; border-radius: 50%; width: 60px; height: 60px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 32px;">🔐</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">New Device Login</h1>
          </div>

          <div style="padding: 40px 30px;">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${data.userName ? `Hi ${data.userName},` : 'Hello,'}
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              We detected a login to your LinkDAO account from a new device. If this was you, you can safely ignore this email.
            </p>

            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 24px 0;">
              <h3 style="color: #991b1b; font-size: 16px; margin: 0 0 12px 0;">Login Details:</h3>
              <div style="color: #7f1d1d; font-size: 14px; line-height: 1.8;">
                <p style="margin: 4px 0;"><strong>Device:</strong> ${data.device}</p>
                ${data.browser ? `<p style="margin: 4px 0;"><strong>Browser:</strong> ${data.browser}</p>` : ''}
                ${data.os ? `<p style="margin: 4px 0;"><strong>OS:</strong> ${data.os}</p>` : ''}
                ${data.location ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${data.location}</p>` : ''}
                ${data.ipAddress ? `<p style="margin: 4px 0;"><strong>IP Address:</strong> ${data.ipAddress}</p>` : ''}
                <p style="margin: 4px 0;"><strong>Time:</strong> ${formattedDate}</p>
              </div>
            </div>

            <div style="background: #fff7ed; padding: 16px; border-radius: 6px; margin: 24px 0;">
              <p style="color: #9a3412; font-size: 14px; margin: 0;">
                ⚠️ <strong>Wasn't you?</strong> Secure your account immediately by changing your password and reviewing your security settings.
              </p>
            </div>

            <div style="margin-top: 30px;">
              <a href="${getPrimaryFrontendUrl()}/settings?tab=security" style="display: inline-block; background: #ef4444; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 12px;">
                Secure My Account
              </a>
              <a href="${getPrimaryFrontendUrl()}/settings?tab=security&action=terminate&session=${data.sessionId}" style="display: inline-block; background: #6b7280; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                This Wasn't Me
              </a>
            </div>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO Security Team</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              This is an automated security notification. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private get2FAChangeTemplate(data: {
    userName?: string;
    action: 'enabled' | 'disabled';
    timestamp: Date;
    ipAddress?: string;
  }): string {
    const formattedDate = data.timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isEnabled = data.action === 'enabled';
    const bgColor = isEnabled ? '#10b981' : '#f59e0b';
    const textColor = isEnabled ? '#065f46' : '#92400e';
    const emoji = isEnabled ? '✅' : '⚠️';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>2FA ${isEnabled ? 'Enabled' : 'Disabled'}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <span style="font-size: 48px;">${emoji}</span>
            <h1 style="color: white; margin: 16px 0 0 0; font-size: 28px; font-weight: 600;">
              Two-Factor Authentication ${isEnabled ? 'Enabled' : 'Disabled'}
            </h1>
          </div>

          <div style="padding: 40px 30px;">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${data.userName ? `Hi ${data.userName},` : 'Hello,'}
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Two-factor authentication has been <strong>${data.action}</strong> on your LinkDAO account.
            </p>

            <div style="background: ${isEnabled ? '#f0fdf4' : '#fef3c7'}; padding: 20px; border-radius: 8px; border-left: 4px solid ${bgColor}; margin: 24px 0;">
              <p style="color: ${textColor}; font-size: 14px; line-height: 1.8; margin: 0;">
                <strong>Time:</strong> ${formattedDate}<br>
                ${data.ipAddress ? `<strong>IP Address:</strong> ${data.ipAddress}` : ''}
              </p>
            </div>

            ${isEnabled ? `
              <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin: 24px 0;">
                <p style="color: #1e40af; font-size: 14px; margin: 0;">
                  💡 <strong>Tip:</strong> Save your backup codes in a secure location. You'll need them if you lose access to your authenticator app.
                </p>
              </div>
            ` : `
              <div style="background: #fef2f2; padding: 16px; border-radius: 6px; margin: 24px 0;">
                <p style="color: #991b1b; font-size: 14px; margin: 0;">
                  ⚠️ <strong>Security Notice:</strong> Your account is now less secure. We recommend re-enabling 2FA to protect your account.
                </p>
              </div>
            `}

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              If you didn't make this change, please secure your account immediately.
            </p>

            <a href="${getPrimaryFrontendUrl()}/settings?tab=security" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              Manage Security Settings
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO Security Team</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              This is an automated security notification.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSuspiciousActivityTemplate(data: {
    userName?: string;
    activityType: string;
    description: string;
    timestamp: Date;
    ipAddress?: string;
    location?: string;
  }): string {
    const formattedDate = data.timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Suspicious Activity Alert</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <span style="font-size: 48px;">⚠️</span>
            <h1 style="color: white; margin: 16px 0 0 0; font-size: 28px; font-weight: 600;">Suspicious Activity Detected</h1>
          </div>

          <div style="padding: 40px 30px;">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${data.userName ? `Hi ${data.userName},` : 'Hello,'}
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              We detected unusual activity on your LinkDAO account that requires your attention.
            </p>

            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 24px 0;">
              <h3 style="color: #991b1b; font-size: 16px; margin: 0 0 12px 0;">Activity Details:</h3>
              <div style="color: #7f1d1d; font-size: 14px; line-height: 1.8;">
                <p style="margin: 4px 0;"><strong>Type:</strong> ${data.activityType}</p>
                <p style="margin: 4px 0;"><strong>Description:</strong> ${data.description}</p>
                ${data.location ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${data.location}</p>` : ''}
                ${data.ipAddress ? `<p style="margin: 4px 0;"><strong>IP Address:</strong> ${data.ipAddress}</p>` : ''}
                <p style="margin: 4px 0;"><strong>Time:</strong> ${formattedDate}</p>
              </div>
            </div>

            <div style="background: #fff7ed; padding: 20px; border-radius: 6px; margin: 24px 0;">
              <h3 style="color: #92400e; font-size: 16px; margin: 0 0 12px 0;">Recommended Actions:</h3>
              <ul style="color: #92400e; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Review your recent account activity</li>
                <li>Change your password if you don't recognize this activity</li>
                <li>Enable two-factor authentication if not already enabled</li>
                <li>Terminate any suspicious sessions</li>
              </ul>
            </div>

            <a href="${getPrimaryFrontendUrl()}/settings?tab=security" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              Secure My Account Now
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO Security Team</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              This is a critical security alert. Please take action immediately.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getLargeTransactionTemplate(data: {
    userName?: string;
    amount: string;
    currency: string;
    recipient?: string;
    timestamp: Date;
    transactionHash?: string;
  }): string {
    const formattedDate = data.timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Large Transaction Alert</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <span style="font-size: 48px;">💰</span>
            <h1 style="color: white; margin: 16px 0 0 0; font-size: 28px; font-weight: 600;">Large Transaction Alert</h1>
          </div>

          <div style="padding: 40px 30px;">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${data.userName ? `Hi ${data.userName},` : 'Hello,'}
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              A large transaction was processed on your LinkDAO account.
            </p>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
              <h3 style="color: #92400e; font-size: 16px; margin: 0 0 12px 0;">Transaction Details:</h3>
              <div style="color: #78350f; font-size: 14px; line-height: 1.8;">
                <p style="margin: 4px 0;"><strong>Amount:</strong> ${data.amount} ${data.currency}</p>
                ${data.recipient ? `<p style="margin: 4px 0;"><strong>Recipient:</strong> ${data.recipient}</p>` : ''}
                ${data.transactionHash ? `<p style="margin: 4px 0; word-break: break-all;"><strong>Transaction:</strong> ${data.transactionHash}</p>` : ''}
                <p style="margin: 4px 0;"><strong>Time:</strong> ${formattedDate}</p>
              </div>
            </div>

            <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin: 24px 0;">
              <p style="color: #1e40af; font-size: 14px; margin: 0;">
                💡 If you didn't authorize this transaction, please contact support immediately.
              </p>
            </div>

            <a href="${getPrimaryFrontendUrl()}/settings?tab=security" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Account Activity
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO Security Team</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              This is an automated transaction alert.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSecurityChangeTemplate(data: {
    userName?: string;
    changeType: string;
    description: string;
    timestamp: Date;
    ipAddress?: string;
  }): string {
    const formattedDate = data.timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Settings Changed</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <span style="font-size: 48px;">🔒</span>
            <h1 style="color: white; margin: 16px 0 0 0; font-size: 28px; font-weight: 600;">Security Settings Changed</h1>
          </div>

          <div style="padding: 40px 30px;">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${data.userName ? `Hi ${data.userName},` : 'Hello,'}
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Your security settings have been updated.
            </p>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 24px 0;">
              <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 12px 0;">Change Details:</h3>
              <div style="color: #4b5563; font-size: 14px; line-height: 1.8;">
                <p style="margin: 4px 0;"><strong>Type:</strong> ${data.changeType}</p>
                <p style="margin: 4px 0;"><strong>Description:</strong> ${data.description}</p>
                ${data.ipAddress ? `<p style="margin: 4px 0;"><strong>IP Address:</strong> ${data.ipAddress}</p>` : ''}
                <p style="margin: 4px 0;"><strong>Time:</strong> ${formattedDate}</p>
              </div>
            </div>

            <div style="background: #fef2f2; padding: 16px; border-radius: 6px; margin: 24px 0;">
              <p style="color: #991b1b; font-size: 14px; margin: 0;">
                ⚠️ If you didn't make this change, please secure your account immediately.
              </p>
            </div>

            <a href="${getPrimaryFrontendUrl()}/settings?tab=security" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              Review Security Settings
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO Security Team</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              This is an automated security notification.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSessionsTerminatedTemplate(data: {
    userName?: string;
    timestamp: Date;
    ipAddress?: string;
    device?: string;
  }): string {
    const formattedDate = data.timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>All Sessions Terminated</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <span style="font-size: 48px;">🚪</span>
            <h1 style="color: white; margin: 16px 0 0 0; font-size: 28px; font-weight: 600;">All Sessions Terminated</h1>
          </div>

          <div style="padding: 40px 30px;">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${data.userName ? `Hi ${data.userName},` : 'Hello,'}
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              All active sessions on your LinkDAO account have been terminated.
            </p>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
              <h3 style="color: #92400e; font-size: 16px; margin: 0 0 12px 0;">Action Details:</h3>
              <div style="color: #78350f; font-size: 14px; line-height: 1.8;">
                ${data.device ? `<p style="margin: 4px 0;"><strong>Initiated From:</strong> ${data.device}</p>` : ''}
                ${data.ipAddress ? `<p style="margin: 4px 0;"><strong>IP Address:</strong> ${data.ipAddress}</p>` : ''}
                <p style="margin: 4px 0;"><strong>Time:</strong> ${formattedDate}</p>
              </div>
            </div>

            <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin: 24px 0;">
              <p style="color: #1e40af; font-size: 14px; margin: 0;">
                💡 You'll need to log in again on all devices. This is a security measure to protect your account.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              If you didn't initiate this action, please contact support immediately.
            </p>

            <a href="${getPrimaryFrontendUrl()}/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              Log In
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO Security Team</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              This is an automated security notification.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send marketplace/order notification email
   * Generic method for order notifications
   */
  async sendOrderNotificationEmail(
    email: string,
    subject: string,
    message: string,
    actionUrl?: string,
    receipt?: any
  ): Promise<boolean> {
    const html = this.getOrderNotificationTemplate(subject, message, actionUrl, receipt);
    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Generate HTML template for order notification emails
   */
  private getOrderNotificationTemplate(
    subject: string,
    message: string,
    actionUrl?: string,
    receipt?: any
  ): string {
    const appUrl = getPrimaryFrontendUrl();
    const actionButton = actionUrl
      ? `<a href="${appUrl}${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">View Order</a>`
      : '';

    const receiptSection = receipt
      ? `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #1a1a1a; font-size: 16px; margin: 0 0 12px 0;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; color: #4a5568; font-size: 14px;">
            ${receipt.orderId ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Order ID:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${receipt.orderId}</td></tr>` : ''}
            ${receipt.amount ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Amount:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${receipt.amount} ${receipt.currency || 'USD'}</td></tr>` : ''}
            ${receipt.productTitle ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Product:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${receipt.productTitle}</td></tr>` : ''}
            ${receipt.status ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Status:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${receipt.status}</td></tr>` : ''}
            ${receipt.trackingNumber ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Tracking:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${receipt.trackingNumber}</td></tr>` : ''}
          </table>
        </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">LinkDAO Marketplace</h1>
          </div>

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">${subject}</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${message}
            </p>

            ${receiptSection}
            ${actionButton}
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO - Decentralized Marketplace</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              This is an automated email. Please do not reply directly.
              <a href="${getPrimaryFrontendUrl()}/notification-preferences" style="color: #667eea; text-decoration: none;">Manage notification preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Check if email service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

}

export const emailService = EmailService.getInstance();
export default emailService;
