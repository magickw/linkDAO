import { Resend } from 'resend';

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
      console.log('Email service initialized with Resend');
    } else {
      console.warn('Email service disabled: RESEND_API_KEY not configured');
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
      console.log('[EmailService] Email disabled or not configured, skipping:', options.subject);
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
        console.error('[EmailService] Failed to send email:', result.error);
        return false;
      }

      console.log('[EmailService] Email sent successfully:', result.data?.id);
      return true;
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
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
          <a href="${process.env.FRONTEND_URL}/support/tickets/${ticketId}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Ticket</a>
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
          <a href="${process.env.FRONTEND_URL}/support/tickets/${ticketId}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Ticket</a>
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
          <a href="${process.env.FRONTEND_URL}/support/tickets/${ticketId}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Full Response</a>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: email, subject: `Response to Ticket: ${ticketId}`, html });
  }

  private getResponseTime(priority: string): string {
    const times = { urgent: '1 hour', high: '4 hours', medium: '12 hours', low: '24 hours' };
    return times[priority] || '24 hours';
  }

  /**
   * Check if email service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export default EmailService.getInstance();
