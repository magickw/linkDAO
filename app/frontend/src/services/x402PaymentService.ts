import { enhancedAuthService } from './enhancedAuthService';

export interface X402PaymentRequest {
  orderId: string;
  amount: string;
  currency: string;
  buyerAddress: string;
  sellerAddress: string;
  listingId: string;
}

export interface X402PaymentResult {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export class X402PaymentService {
  private readonly API_BASE_URL: string;

  constructor() {
    // Initialize with proper API base URL
    this.API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:10000';
  }

  /**
   * Process an x402 payment
   */
  async processPayment(request: X402PaymentRequest): Promise<X402PaymentResult> {
    try {
      // Validate required fields
      if (!request.orderId || !request.amount || !request.currency ||
        !request.buyerAddress || !request.sellerAddress || !request.listingId) {
        throw new Error('Missing required fields in x402 payment request');
      }

      // Enhanced validation
      const amountNum = parseFloat(request.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount: must be a positive number');
      }

      // Validate Ethereum addresses
      const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethereumAddressRegex.test(request.buyerAddress)) {
        throw new Error('Invalid buyer address format');
      }
      if (!ethereumAddressRegex.test(request.sellerAddress)) {
        throw new Error('Invalid seller address format');
      }

      // Get CSRF token if needed
      let csrfToken: string | null = null;
      try {
        const tokenResponse = await fetch(`${this.API_BASE_URL}/api/csrf-token`, {
          method: 'GET',
          credentials: 'include' // Include session cookies
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          csrfToken = tokenData.data?.csrfToken;
        }
      } catch (tokenError) {
        console.warn('Could not fetch CSRF token:', tokenError);
      }

      // Get auth headers with Bearer token
      const authHeaders = await enhancedAuthService.getAuthHeaders();

      // Call the backend x402 payment API with proper authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders, // Include Authorization header with Bearer token
      };

      // Include CSRF token if available
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      // Add retry mechanism for network issues
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const response = await fetch(`${this.API_BASE_URL}/api/x402-payments/payment`, {
            method: 'POST',
            headers,
            credentials: 'include', // Include session cookies for authentication
            body: JSON.stringify(request),
            timeout: 30000 // 30 second timeout
          });

          if (response.ok) {
            const result = await response.json();

            if (!result.success) {
              throw new Error(result.error || 'Failed to process x402 payment');
            }

            // Validate response data
            if (!result.data) {
              throw new Error('Invalid response from x402 payment service');
            }

            return {
              success: true,
              paymentUrl: result.data.paymentUrl,
              status: result.data.status,
              transactionId: result.data.transactionId,
            };
          } else {
            const errorText = await response.text();
            
            // Don't retry on client errors (4xx)
            if (response.status >= 400 && response.status < 500) {
              throw new Error(`Failed to process x402 payment: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            // Retry on server errors (5xx)
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw fetchError;
          }
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      throw new Error('Max retries exceeded');
    } catch (error) {
      console.error('X402 payment processing failed:', error);
      
      // User-friendly error messages
      let userMessage = 'An unexpected error occurred during payment processing.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          userMessage = 'Connection issue. Please check your internet connection and try again.';
        } else if (error.message.includes('Invalid amount')) {
          userMessage = 'Please enter a valid payment amount.';
        } else if (error.message.includes('Invalid address')) {
          userMessage = 'Invalid wallet address. Please check your connection.';
        } else if (error.message.includes('Server error')) {
          userMessage = 'Payment service temporarily unavailable. Please try again in a few minutes.';
        } else if (error.message.includes('CSRF')) {
          userMessage = 'Security verification failed. Please refresh the page and try again.';
        }
      }
      
      return {
        success: false,
        status: 'failed',
        error: userMessage,
        technicalError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check the status of an x402 payment
   */
  async checkPaymentStatus(transactionId: string): Promise<X402PaymentResult> {
    try {
      // Validate transaction ID
      if (!transactionId) {
        throw new Error('Transaction ID is required to check payment status');
      }

      // Get CSRF token if needed
      let csrfToken: string | null = null;
      try {
        const tokenResponse = await fetch(`${this.API_BASE_URL}/api/csrf-token`, {
          method: 'GET',
          credentials: 'include' // Include session cookies
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          csrfToken = tokenData.data?.csrfToken;
        }
      } catch (tokenError) {
        console.warn('Could not fetch CSRF token:', tokenError);
      }

      // Call the backend x402 payment status API
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include CSRF token if available
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch(`${this.API_BASE_URL}/api/x402-payments/payment/${encodeURIComponent(transactionId)}`, {
        method: 'GET',
        headers,
        credentials: 'include' // Include session cookies for authentication
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to check x402 payment status: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to check x402 payment status');
      }

      // Validate response data
      if (!result.data) {
        throw new Error('Invalid response from x402 payment status service');
      }

      return {
        success: true,
        transactionId: result.data.transactionId,
        status: result.data.status,
      };
    } catch (error) {
      console.error('Failed to check X402 payment status:', error);
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred while checking x402 payment status',
      };
    }
  }

  /**
   * Refund an x402 payment
   */
  async refundPayment(transactionId: string): Promise<X402PaymentResult> {
    try {
      // Validate transaction ID
      if (!transactionId) {
        throw new Error('Transaction ID is required to process refund');
      }

      // Get CSRF token if needed
      let csrfToken: string | null = null;
      try {
        const tokenResponse = await fetch(`${this.API_BASE_URL}/api/csrf-token`, {
          method: 'GET',
          credentials: 'include' // Include session cookies
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          csrfToken = tokenData.data?.csrfToken;
        }
      } catch (tokenError) {
        console.warn('Could not fetch CSRF token:', tokenError);
      }

      // Call the backend x402 refund API with proper authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include CSRF token if available
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch(`${this.API_BASE_URL}/api/x402-payments/payment/${encodeURIComponent(transactionId)}/refund`, {
        method: 'POST',
        headers,
        credentials: 'include' // Include session cookies for authentication
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process x402 refund: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to process x402 refund');
      }

      // Validate response data
      if (!result.data) {
        throw new Error('Invalid response from x402 refund service');
      }

      return {
        success: true,
        transactionId: result.data.transactionId,
        status: result.data.status,
      };
    } catch (error) {
      console.error('X402 payment refund failed:', error);
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred during x402 refund processing',
      };
    }
  }
}

// Export singleton instance
export const x402PaymentService = new X402PaymentService();