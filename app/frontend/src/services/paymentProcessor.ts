/**
 * PaymentProcessor - Centralized payment processing service
 * Handles crypto and fiat payments with retry logic and error recovery
 */

import { toast } from 'react-hot-toast';
import { marketplaceService } from './marketplaceService';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'crypto' | 'fiat';
  userAddress?: string;
  
  // Crypto-specific
  tokenSymbol?: string;
  networkId?: number;
  
  // Fiat-specific
  cardToken?: string;
  billingAddress?: any;
}

export interface PaymentResult {
  success: boolean;
  orderId: string;
  transactionId?: string;
  transactionHash?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  retryable?: boolean;
  estimatedCompletionTime?: Date;
}

export interface EscrowSetupRequest {
  orderId: string;
  amount: number;
  buyerAddress: string;
  sellerAddress: string;
  tokenAddress?: string;
  networkId: number;
}

export interface EscrowSetupResult {
  success: boolean;
  escrowAddress?: string;
  transactionHash?: string;
  error?: string;
}

interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 2
};

export class PaymentProcessor {
  private apiBaseUrl: string;
  private retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Process payment with automatic retry logic
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    return this.withRetry(
      () => this.executePayment(request),
      `Processing ${request.paymentMethod} payment`
    );
  }

  /**
   * Setup escrow contract
   */
  async setupEscrow(request: EscrowSetupRequest): Promise<EscrowSetupResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/escrow/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to setup escrow');
      }

      const data = await response.json();
      
      return {
        success: true,
        escrowAddress: data.escrowAddress,
        transactionHash: data.transactionHash
      };
    } catch (error) {
      console.error('Escrow setup failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup escrow'
      };
    }
  }

  /**
   * Validate payment method availability
   */
  async validatePaymentMethod(
    method: 'crypto' | 'fiat',
    userAddress?: string
  ): Promise<{
    isValid: boolean;
    hasSufficientBalance?: boolean;
    errors: string[];
    suggestedAlternatives: string[];
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/payment/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method, userAddress })
      });

      if (!response.ok) {
        return {
          isValid: false,
          errors: ['Payment validation service unavailable'],
          suggestedAlternatives: []
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Payment validation failed:', error);
      
      return {
        isValid: false,
        errors: ['Unable to validate payment method'],
        suggestedAlternatives: []
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(orderId: string): Promise<PaymentResult | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/payment-status`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get payment status:', error);
      return null;
    }
  }

  /**
   * Cancel payment (if possible)
   */
  async cancelPayment(orderId: string, reason: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/cancel-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to cancel payment:', error);
      return false;
    }
  }

  /**
   * Execute actual payment processing
   */
  private async executePayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      const endpoint = request.paymentMethod === 'crypto' 
        ? '/api/payment/crypto/process'
        : '/api/payment/fiat/process';

      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        return {
          success: false,
          orderId: request.orderId,
          status: 'failed',
          error: errorData.message || 'Payment processing failed',
          retryable: this.isRetryableError(response.status)
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        orderId: data.orderId || request.orderId,
        transactionId: data.transactionId,
        transactionHash: data.transactionHash,
        status: data.status || 'processing',
        estimatedCompletionTime: data.estimatedCompletionTime 
          ? new Date(data.estimatedCompletionTime) 
          : undefined
      };
    } catch (error) {
      console.error('Payment execution failed:', error);
      
      return {
        success: false,
        orderId: request.orderId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        retryable: true
      };
    }
  }

  /**
   * Retry wrapper for operations
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: any;
    let delay = this.retryConfig.delayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for ${operationName}`);
          await this.sleep(delay);
          delay *= this.retryConfig.backoffMultiplier;
        }

        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry if this is the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (error instanceof PaymentError && !error.retryable) {
          throw error;
        }

        console.warn(`${operationName} failed (attempt ${attempt + 1}):`, error);
      }
    }

    // All retries exhausted
    throw new PaymentError(
      lastError?.message || `${operationName} failed after ${this.retryConfig.maxRetries} retries`,
      false
    );
  }

  /**
   * Check if HTTP error is retryable
   */
  private isRetryableError(statusCode: number): boolean {
    // Retry on server errors and rate limiting
    return statusCode >= 500 || statusCode === 429 || statusCode === 408;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log payment event for analytics
   */
  private logPaymentEvent(
    event: string,
    data: Record<string, any>
  ): void {
    try {
      // Could integrate with analytics service
      console.log(`Payment Event: ${event}`, data);
      
      // Example: Send to analytics
      // analyticsService.track('payment_event', { event, ...data });
    } catch (error) {
      console.error('Failed to log payment event:', error);
    }
  }
}

/**
 * Custom payment error class
 */
export class PaymentError extends Error {
  constructor(
    message: string,
    public retryable: boolean = true,
    public code?: string
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// Singleton instance
export const paymentProcessor = new PaymentProcessor();
