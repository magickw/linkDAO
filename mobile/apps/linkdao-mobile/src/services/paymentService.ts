/**
 * Payment Service
 * Handles crypto and Stripe payment processing
 */

import { walletConnectService } from './walletConnectService';
import { apiClient } from '@linkdao/shared';

export interface CryptoPaymentRequest {
    orderId: string;
    amount: number;
    tokenAddress?: string; // Optional, defaults to ETH
    recipientAddress: string;
}

export interface StripePaymentRequest {
    amount: number;
    currency: string;
    orderId: string;
}

export interface PaymentResult {
    success: boolean;
    transactionHash?: string;
    paymentIntentId?: string;
    error?: string;
}

class PaymentService {
    /**
     * Process crypto payment using connected wallet
     */
    async processCryptoPayment(request: CryptoPaymentRequest): Promise<PaymentResult> {
        try {
            // Get connected wallet address
            const walletAddress = await walletConnectService.getAddress();

            if (!walletAddress) {
                return {
                    success: false,
                    error: 'Wallet not connected',
                };
            }

            // Send transaction via wallet
            const txHash = await walletConnectService.sendTransaction({
                to: request.recipientAddress,
                value: request.amount.toString(),
                data: '0x', // Empty data for simple transfer
            });

            if (!txHash) {
                return {
                    success: false,
                    error: 'Transaction failed',
                };
            }

            // Notify backend of payment
            await apiClient.post('/api/payments/crypto/confirm', {
                orderId: request.orderId,
                transactionHash: txHash,
                amount: request.amount,
                tokenAddress: request.tokenAddress,
            });

            return {
                success: true,
                transactionHash: txHash,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Payment failed',
            };
        }
    }

    /**
     * Create Stripe payment intent
     */
    async createStripePaymentIntent(request: StripePaymentRequest): Promise<{
        clientSecret?: string;
        error?: string;
    }> {
        try {
            const response = await apiClient.post<{ clientSecret: string }>(
                '/api/payments/stripe/create-intent',
                {
                    amount: Math.round(request.amount * 100), // Convert to cents
                    currency: request.currency,
                    orderId: request.orderId,
                }
            );

            if (response.success && response.data) {
                return {
                    clientSecret: response.data.clientSecret,
                };
            }

            return {
                error: response.error || 'Failed to create payment intent',
            };
        } catch (error: any) {
            return {
                error: error.message || 'Payment initialization failed',
            };
        }
    }

    /**
     * Confirm Stripe payment
     */
    async confirmStripePayment(paymentIntentId: string, orderId: string): Promise<PaymentResult> {
        try {
            const response = await apiClient.post('/api/payments/stripe/confirm', {
                paymentIntentId,
                orderId,
            });

            if (response.success) {
                return {
                    success: true,
                    paymentIntentId,
                };
            }

            return {
                success: false,
                error: response.error || 'Payment confirmation failed',
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Payment confirmation failed',
            };
        }
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(orderId: string): Promise<{
        status: 'pending' | 'processing' | 'completed' | 'failed';
        transactionHash?: string;
        paymentIntentId?: string;
    } | null> {
        try {
            const response = await apiClient.get<any>(`/api/payments/status/${orderId}`);

            if (response.success && response.data) {
                return response.data;
            }

            return null;
        } catch (error) {
            return null;
        }
    }
}

export const paymentService = new PaymentService();
