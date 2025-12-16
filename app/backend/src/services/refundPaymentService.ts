import Stripe from 'stripe';
import { ethers } from 'ethers';
import axios from 'axios';
import { safeLogger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

export interface RefundResult {
  success: boolean;
  refundId?: string;
  transactionHash?: string;
  error?: string;
  provider?: string;
  retryCount?: number;
  lastError?: string;
}

export class RefundPaymentService {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 2000;

  async processStripeRefund(
    paymentIntentId: string, 
    amount: number,
    reason?: string,
    retryCount: number = 0
  ): Promise<RefundResult> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(amount * 100),
        reason: (reason as any) || 'requested_by_customer'
      });
      
      safeLogger.info(`Stripe refund completed: ${refund.id} for amount: ${amount}`);
      return { 
        success: true, 
        refundId: refund.id,
        provider: 'stripe',
        retryCount
      };
    } catch (error: any) {
      safeLogger.error(`Stripe refund failed (attempt ${retryCount + 1}):`, error);
      
      // Check if this is a retryable error
      if (this.isRetryableError(error) && retryCount < this.MAX_RETRY_ATTEMPTS) {
        // Wait before retrying
        await this.delay(this.RETRY_DELAY_MS * (retryCount + 1));
        return this.processStripeRefund(paymentIntentId, amount, reason, retryCount + 1);
      }
      
      return { 
        success: false, 
        error: error.message,
        provider: 'stripe',
        retryCount,
        lastError: error.message
      };
    }
  }

  async processPayPalRefund(
    captureId: string,
    amount: number,
    currency: string = 'USD',
    reason?: string,
    retryCount: number = 0
  ): Promise<RefundResult> {
    try {
      // First get PayPal access token
      const tokenResponse = await axios.post(
        `${process.env.PAYPAL_BASE_URL || 'https://api.sandbox.paypal.com'}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Process the refund
      const refundResponse = await axios.post(
        `${process.env.PAYPAL_BASE_URL || 'https://api.sandbox.paypal.com'}/v2/payments/captures/${captureId}/refund`,
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2)
          },
          note_to_payer: reason || 'Refund for returned item'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      safeLogger.info(`PayPal refund completed: ${refundResponse.data.id} for amount: ${amount}`);
      return {
        success: true,
        refundId: refundResponse.data.id,
        provider: 'paypal',
        retryCount
      };
    } catch (error: any) {
      safeLogger.error(`PayPal refund failed (attempt ${retryCount + 1}):`, error);
      
      if (this.isRetryableError(error) && retryCount < this.MAX_RETRY_ATTEMPTS) {
        await this.delay(this.RETRY_DELAY_MS * (retryCount + 1));
        return this.processPayPalRefund(captureId, amount, currency, reason, retryCount + 1);
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        provider: 'paypal',
        retryCount,
        lastError: error.message
      };
    }
  }

  async processBlockchainRefund(
    recipientAddress: string, 
    amount: string,
    tokenAddress?: string,
    retryCount: number = 0
  ): Promise<RefundResult> {
    try {
      if (!process.env.RPC_URL || !process.env.REFUND_WALLET_PRIVATE_KEY) {
        throw new Error('Blockchain configuration not available');
      }

      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const wallet = new ethers.Wallet(process.env.REFUND_WALLET_PRIVATE_KEY, provider);

      let tx;
      if (tokenAddress) {
        // Handle ERC20 token refund
        const tokenABI = [
          "function transfer(address to, uint256 amount) returns (bool)",
          "function balanceOf(address owner) view returns (uint256)"
        ];
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
        const tx = await tokenContract.transfer(recipientAddress, ethers.parseEther(amount));
        await tx.wait();
      } else {
        // Handle native token refund
        tx = await wallet.sendTransaction({
          to: recipientAddress,
          value: ethers.parseEther(amount),
          gasLimit: 300000 // Set appropriate gas limit
        });
        await tx.wait();
      }

      safeLogger.info(`Blockchain refund completed: ${tx.hash} to ${recipientAddress} for amount: ${amount}`);
      return {
        success: true,
        transactionHash: tx.hash,
        provider: 'blockchain',
        retryCount
      };
    } catch (error: any) {
      safeLogger.error(`Blockchain refund failed (attempt ${retryCount + 1}):`, error);
      
      if (this.isRetryableError(error) && retryCount < this.MAX_RETRY_ATTEMPTS) {
        await this.delay(this.RETRY_DELAY_MS * (retryCount + 1));
        return this.processBlockchainRefund(recipientAddress, amount, tokenAddress, retryCount + 1);
      }

      return {
        success: false,
        error: error.message,
        provider: 'blockchain',
        retryCount,
        lastError: error.message
      };
    }
  }

  /**
   * Process partial refund for specific items
   */
  async processPartialRefund(
    provider: string,
    identifier: string, // transaction ID, payment intent ID, etc.
    amount: number,
    originalAmount: number,
    reason?: string,
    items?: Array<{id: string, quantity: number, price: number}> // Specific items being refunded
  ): Promise<RefundResult> {
    try {
      switch (provider.toLowerCase()) {
        case 'stripe':
          return await this.processStripeRefund(identifier, amount, reason);
        case 'paypal':
          return await this.processPayPalRefund(identifier, amount, undefined, reason);
        case 'blockchain':
          return await this.processBlockchainRefund(identifier, amount.toString());
        default:
          throw new Error(`Unsupported refund provider: ${provider}`);
      }
    } catch (error: any) {
      safeLogger.error('Error processing partial refund:', error);
      return {
        success: false,
        error: error.message,
        provider
      };
    }
  }

  /**
   * Check refund status
   */
  async checkRefundStatus(provider: string, refundId: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    details?: any;
    error?: string;
  }> {
    try {
      switch (provider.toLowerCase()) {
        case 'stripe':
          const stripeRefund = await stripe.refunds.retrieve(refundId);
          return {
            status: this.mapStripeRefundStatus(stripeRefund.status),
            details: {
              id: stripeRefund.id,
              amount: stripeRefund.amount / 100,
              currency: stripeRefund.currency,
              created: new Date(stripeRefund.created * 1000).toISOString()
            }
          };
        case 'paypal':
          // PayPal doesn't have a direct refund status check endpoint
          // We would need to store PayPal refund details in our database
          return {
            status: 'pending', // Default status for PayPal
            details: { id: refundId }
          };
        case 'blockchain':
          // Check transaction status on the blockchain
          const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
          const receipt = await provider.getTransactionReceipt(refundId);
          
          return {
            status: receipt ? 'completed' : 'pending',
            details: {
              transactionHash: refundId,
              blockNumber: receipt?.blockNumber
            }
          };
        default:
          throw new Error(`Unsupported refund provider: ${provider}`);
      }
    } catch (error: any) {
      safeLogger.error('Error checking refund status:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  private isRetryableError(error: any): boolean {
    // Common retryable error conditions
    const retryableCodes = [
      'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH',
      'EPIPE', 'ENETUNREACH', 'ENETDOWN', 'EAGAIN'
    ];
    
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    
    return (
      retryableCodes.includes(error.code) ||
      retryableStatusCodes.includes(error.status || error.response?.status) ||
      error.message?.includes('timeout') ||
      error.message?.includes('network') ||
      error.message?.includes('socket')
    );
  }

  private mapStripeRefundStatus(stripeStatus: string): 'pending' | 'completed' | 'failed' | 'cancelled' {
    switch (stripeStatus) {
      case 'succeeded':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'pending':
        return 'pending';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const refundPaymentService = new RefundPaymentService();
