/**
 * Checkout Service
 * Handles checkout session creation and order processing
 */

import { apiClient } from './apiClient';
import { 
  AddressValidationResult, 
  DiscountValidationResult, 
  CheckoutRecommendation 
} from '../types/checkout';

export interface CheckoutSessionParams {
    items: any[];
    shippingAddress: any;
}

export interface ProcessCheckoutParams {
    sessionId: string;
    paymentMethod: string;
    paymentDetails: any;
    shippingAddress: any;
    discountCode?: string;
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
     * Get user's saved shipping addresses
     */
    async getSavedAddresses() {
        try {
            const response = await apiClient.get('/api/user/addresses');
            if (response.data && response.data.success) {
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error('[Checkout] Error fetching saved addresses:', error);
            return [];
        }
    }

    /**
     * Validate checkout data (Legacy)
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

    /**
     * Validate address using the new service
     */
    async validateAddress(address: any): Promise<AddressValidationResult> {
        try {
            const response = await apiClient.post('/api/checkout/validate-address', { address });
            if (response.data && response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Address validation failed');
        } catch (error: any) {
            console.error('[Checkout] Error validating address:', error);
            return {
                isValid: false,
                confidence: 'low',
                errors: [error.message || 'Address validation service unavailable'],
                warnings: []
            };
        }
    }

    /**
     * Apply discount code
     */
    async applyDiscount(code: string, cartTotal: number, items: any[]): Promise<DiscountValidationResult> {
        try {
            const response = await apiClient.post('/api/checkout/discount', { 
                code, 
                cartTotal,
                items 
            });
            
            if (response.data && response.data.success) {
                return {
                    isValid: true,
                    discountAmount: response.data.data.amount,
                    newTotal: response.data.data.newTotal,
                    code
                };
            }
            
            return {
                isValid: false,
                discountAmount: 0,
                newTotal: cartTotal,
                code,
                error: response.data.message || 'Invalid discount code'
            };
        } catch (error: any) {
            console.error('[Checkout] Error applying discount:', error);
            return {
                isValid: false,
                discountAmount: 0,
                newTotal: cartTotal,
                code,
                error: error.response?.data?.message || error.message || 'Failed to apply discount'
            };
        }
    }

    /**
     * Get payment method recommendation
     */
    async getPaymentRecommendation(params: any): Promise<CheckoutRecommendation | null> {
        try {
            const response = await apiClient.post('/api/hybrid-payment/recommend-path', params);
            if (response.data && response.data.success) {
                // Transform if necessary, or return as is if types match
                return response.data.data; 
            }
            return null;
        } catch (error) {
            console.error('[Checkout] Error getting recommendation:', error);
            return null;
        }
    }
}


export const checkoutService = new CheckoutService();
export default checkoutService;
