import { ENV_CONFIG } from '@/config/environment';

interface NewsletterResponse {
  success: boolean;
  message: string;
  data?: any;
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
  async subscribeEmail(email: string): Promise<NewsletterResponse> {
    try {
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to subscribe to newsletter');
      }

      return {
        success: true,
        message: result.message || 'Successfully subscribed to newsletter',
        data: result.data,
      };
    } catch (error) {
      console.error('[NewsletterService] Error subscribing email:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to subscribe to newsletter',
      };
    }
  }

  /**
   * Unsubscribe an email from the newsletter
   */
  async unsubscribeEmail(email: string): Promise<NewsletterResponse> {
    try {
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/newsletter/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to unsubscribe from newsletter');
      }

      return {
        success: true,
        message: result.message || 'Successfully unsubscribed from newsletter',
        data: result.data,
      };
    } catch (error) {
      console.error('[NewsletterService] Error unsubscribing email:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to unsubscribe from newsletter',
      };
    }
  }

  /**
   * Get subscription status for an email
   */
  async getSubscriptionStatus(email: string): Promise<NewsletterResponse> {
    try {
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/newsletter/status?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get subscription status');
      }

      return {
        success: true,
        message: result.message || 'Subscription status retrieved successfully',
        data: result.data,
      };
    } catch (error) {
      console.error('[NewsletterService] Error getting subscription status:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get subscription status',
      };
    }
  }

  // Admin Methods

  /**
   * Get all subscribers (Admin only)
   */
  async getAllSubscribers(): Promise<any[]> {
    try {
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/admin/newsletter/subscribers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get subscribers');
      }

      return result.data || [];
    } catch (error) {
      console.error('[NewsletterService] Error getting subscribers:', error);
      return [];
    }
  }

  /**
   * Get all campaigns (Admin only)
   */
  async getAllCampaigns(): Promise<any[]> {
    try {
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/admin/newsletter/campaigns`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get campaigns');
      }

      return result.data || [];
    } catch (error) {
      console.error('[NewsletterService] Error getting campaigns:', error);
      return [];
    }
  }

  /**
   * Get newsletter statistics (Admin only)
   */
  async getNewsletterStats(): Promise<any> {
    try {
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/admin/newsletter/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get newsletter stats');
      }

      return result.data || {
        totalSubscribers: 0,
        activeSubscribers: 0,
        totalCampaigns: 0,
        avgOpenRate: 0,
        avgClickRate: 0,
        recentGrowth: 0
      };
    } catch (error) {
      console.error('[NewsletterService] Error getting newsletter stats:', error);
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
   * Send newsletter to all active subscribers (Admin only)
   */
  async sendNewsletter(data: {
    subject: string;
    content: string;
    htmlContent?: string;
  }): Promise<NewsletterResponse> {
    try {
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/admin/newsletter/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send newsletter');
      }

      return {
        success: true,
        message: result.message || 'Newsletter sent successfully',
        data: result.data,
      };
    } catch (error) {
      console.error('[NewsletterService] Error sending newsletter:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send newsletter',
      };
    }
  }

  /**
   * Schedule newsletter for later (Admin only)
   */
  async scheduleNewsletter(data: {
    subject: string;
    content: string;
    htmlContent?: string;
    scheduledAt: Date;
  }): Promise<NewsletterResponse> {
    try {
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/admin/newsletter/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to schedule newsletter');
      }

      return {
        success: true,
        message: result.message || 'Newsletter scheduled successfully',
        data: result.data,
      };
    } catch (error) {
      console.error('[NewsletterService] Error scheduling newsletter:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to schedule newsletter',
      };
    }
  }

  /**
   * Delete a campaign (Admin only)
   */
  async deleteCampaign(campaignId: string): Promise<NewsletterResponse> {
    try {
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/admin/newsletter/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete campaign');
      }

      return {
        success: true,
        message: result.message || 'Campaign deleted successfully',
        data: result.data,
      };
    } catch (error) {
      console.error('[NewsletterService] Error deleting campaign:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete campaign',
      };
    }
  }

  /**
   * Export subscribers to CSV (Admin only)
   */
  async exportSubscribers(): Promise<string> {
    try {
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/admin/newsletter/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export subscribers');
      }

      return await response.text();
    } catch (error) {
      console.error('[NewsletterService] Error exporting subscribers:', error);
      throw error;
    }
  }
}

export const newsletterService = NewsletterService.getInstance();
export default newsletterService;