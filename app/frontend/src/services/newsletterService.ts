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
}

export const newsletterService = NewsletterService.getInstance();
export default newsletterService;