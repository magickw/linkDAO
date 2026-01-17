/**
 * Checkout Service
 * Handles checkout session creation and order processing
 */

import { apiClient } from './apiClient';

export interface CheckoutSessionParams {
    items: any[];
    shippingAddress: any;
}

export interface ProcessCheckoutParams {
    sessionId: string;
    paymentMethod: 'crypto' | 'fiat';
    paymentDetails: any;
    shippingAddress: any;
}

class CheckoutService {
    /**
     * Create checkout session
     * Returns session details including totals and sessionId
     */
    async createSession(params: CheckoutSessionParams) {
        try {
            const response = await apiClient.post('/api/checkout/session', params);
            if (response.data && response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to create session');
        } catch (error: any) {
            console.error('[Checkout] Error creating session:', error);
            throw error;
        }
    }

    /**
     * Process checkout
     * Finalizes the order
     */
    async processCheckout(params: ProcessCheckoutParams) {
        try {
            const response = await apiClient.post('/api/checkout/process', params);
            if (response.data && response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to process checkout');
        } catch (error: any) {
            console.error('[Checkout] Error processing checkout:', error);
            throw error;
        }
    }

    /**
     * Validate checkout data
     */
    async validateCheckout(data: any) {
        try {
            const response = await apiClient.post('/api/checkout/validate', data);
            return response.data;
        } catch (error) {
            console.error('[Checkout] Error validating:', error);
            return { valid: false, errors: [{ message: 'Validation failed' }] };
        }
    }
}

export const checkoutService = new CheckoutService();
export default checkoutService;
