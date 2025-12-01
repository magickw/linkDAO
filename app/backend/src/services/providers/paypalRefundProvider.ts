import axios, { AxiosInstance } from 'axios';
import { safeLogger } from '../../utils/logger';

/**
 * PayPal Refund Provider
 * Handles PayPal-specific refund operations and status tracking
 */
export class PayPalRefundProvider {
  private client: AxiosInstance;
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    // Use sandbox or live based on environment
    this.baseUrl = process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get PayPal access token
   * @returns Access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);

      return this.accessToken;
    } catch (error: any) {
      safeLogger.error('Error getting PayPal access token:', error);
      throw new Error('Failed to authenticate with PayPal');
    }
  }

  /**
   * Process a refund through PayPal
   * @param captureId - PayPal capture ID
   * @param amount - Amount to refund
   * @param currency - Currency code
   * @param note - Refund note
   * @returns Refund result
   */
  async processRefund(
    captureId: string,
    amount: number,
    currency: string = 'USD',
    note?: string
  ): Promise<{
    success: boolean;
    refundId: string;
    status: string;
    amount: number;
    currency: string;
    processingTime: number;
    errorMessage?: string;
  }> {
    const startTime = Date.now();

    try {
      const token = await this.getAccessToken();

      const response = await this.client.post(
        `/v2/payments/captures/${captureId}/refund`,
        {
          amount: {
            value: amount.toFixed(2),
            currency_code: currency
          },
          note_to_payer: note || 'Refund processed'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const processingTime = Date.now() - startTime;

      safeLogger.info(`PayPal refund processed: ${response.data.id}`, {
        captureId,
        amount,
        status: response.data.status
      });

      return {
        success: response.data.status === 'COMPLETED',
        refundId: response.data.id,
        status: response.data.status,
        amount: parseFloat(response.data.amount.value),
        currency: response.data.amount.currency_code,
        processingTime
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      safeLogger.error('PayPal refund failed:', error);
      
      return {
        success: false,
        refundId: '',
        status: 'FAILED',
        amount: 0,
        currency: currency,
        processingTime,
        errorMessage: error.response?.data?.message || error.message || 'Unknown PayPal error'
      };
    }
  }

  /**
   * Get refund status from PayPal
   * @param refundId - PayPal refund ID
   * @returns Refund status information
   */
  async getRefundStatus(refundId: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    created: Date;
    failureReason?: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        `/v2/payments/refunds/${refundId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        status: response.data.status,
        amount: parseFloat(response.data.amount.value),
        currency: response.data.amount.currency_code,
        created: new Date(response.data.create_time),
        failureReason: response.data.status_details?.reason
      };
    } catch (error: any) {
      safeLogger.error('Error retrieving PayPal refund status:', error);
      throw new Error(`Failed to retrieve PayPal refund status: ${error.message}`);
    }
  }

  /**
   * Get capture details to verify refund eligibility
   * @param captureId - PayPal capture ID
   * @returns Capture details
   */
  async getCaptureDetails(captureId: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    refundable: boolean;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        `/v2/payments/captures/${captureId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const refundable = response.data.status === 'COMPLETED' || 
                        response.data.status === 'PARTIALLY_REFUNDED';

      return {
        status: response.data.status,
        amount: parseFloat(response.data.amount.value),
        currency: response.data.amount.currency_code,
        refundable
      };
    } catch (error: any) {
      safeLogger.error('Error retrieving PayPal capture details:', error);
      throw new Error(`Failed to retrieve PayPal capture details: ${error.message}`);
    }
  }

  /**
   * List refunds for a specific capture
   * @param captureId - PayPal capture ID
   * @returns Array of refund objects
   */
  async listRefundsForCapture(captureId: string): Promise<Array<{
    refundId: string;
    amount: number;
    currency: string;
    status: string;
    created: Date;
  }>> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        `/v2/payments/captures/${captureId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // PayPal includes refund links in the capture response
      const refunds = response.data.refunds || [];

      return refunds.map((refund: any) => ({
        refundId: refund.id,
        amount: parseFloat(refund.amount.value),
        currency: refund.amount.currency_code,
        status: refund.status,
        created: new Date(refund.create_time)
      }));
    } catch (error: any) {
      safeLogger.error('Error listing PayPal refunds:', error);
      throw new Error(`Failed to list PayPal refunds: ${error.message}`);
    }
  }

  /**
   * Verify PayPal webhook signature
   * @param headers - Webhook headers
   * @param body - Webhook body
   * @returns Verification result
   */
  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: any
  ): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.post(
        '/v1/notifications/verify-webhook-signature',
        {
          transmission_id: headers['paypal-transmission-id'],
          transmission_time: headers['paypal-transmission-time'],
          cert_url: headers['paypal-cert-url'],
          auth_algo: headers['paypal-auth-algo'],
          transmission_sig: headers['paypal-transmission-sig'],
          webhook_id: process.env.PAYPAL_WEBHOOK_ID,
          webhook_event: body
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data.verification_status === 'SUCCESS';
    } catch (error: any) {
      safeLogger.error('Error verifying PayPal webhook:', error);
      return false;
    }
  }
}

// Export singleton instance
export const paypalRefundProvider = new PayPalRefundProvider();
