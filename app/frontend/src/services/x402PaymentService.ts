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
  constructor() {
    // Initialize service
  }

  /**
   * Process an x402 payment
   */
  async processPayment(request: X402PaymentRequest): Promise<X402PaymentResult> {
    try {
      // Call the backend x402 payment API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/x402/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to process x402 payment');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process x402 payment');
      }

      return {
        success: true,
        paymentUrl: result.data.paymentUrl,
        status: result.data.status,
        transactionId: result.data.transactionId,
      };
    } catch (error) {
      console.error('X402 payment processing failed:', error);
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check the status of an x402 payment
   */
  async checkPaymentStatus(transactionId: string): Promise<X402PaymentResult> {
    try {
      // Call the backend x402 payment status API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/x402/payment/${transactionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check x402 payment status');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to check x402 payment status');
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
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Refund an x402 payment
   */
  async refundPayment(transactionId: string): Promise<X402PaymentResult> {
    try {
      // Call the backend x402 refund API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/x402/payment/${transactionId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to process x402 refund');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process x402 refund');
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
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Export singleton instance
export const x402PaymentService = new X402PaymentService();