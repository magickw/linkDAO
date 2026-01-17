/**
 * Tax Service
 * Handles tax calculations and tax-related API calls
 */

import { apiClient } from './apiClient';

export interface TaxableItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    isDigital?: boolean;
    isTaxExempt?: boolean;
    category?: string;
}

export interface Address {
    country: string;
    state?: string;
    city?: string;
    postalCode?: string;
    line1?: string;
}

export interface TaxCalculationResult {
    subtotal: number;
    shippingCost: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    taxBreakdown: Array<{
        name: string;
        rate: number;
        amount: number;
        type: string;
    }>;
    currency: string;
    jurisdiction: string;
}

class TaxService {
    /**
     * Calculate tax for a given order
     */
    async calculateTax(
        items: TaxableItem[],
        shippingAddress: Address,
        shippingCost: number = 0,
        currency: string = 'USD'
    ): Promise<TaxCalculationResult> {
        try {
            const response = await apiClient.post('/api/checkout/calculate-tax', {
                items,
                shippingAddress,
                shippingCost,
                currency
            });

            if (response.data && response.data.success) {
                return response.data.data;
            }
            
            return this.getFallbackTaxCalculation(items, shippingCost);
        } catch (error) {
            console.error('[TaxService] Error calculating tax:', error);
            // Return fallback result
            return this.getFallbackTaxCalculation(items, shippingCost);
        }
    }

    /**
     * Get fallback tax calculation (8% sales tax)
     */
    private getFallbackTaxCalculation(
        items: TaxableItem[],
        shippingCost: number
    ): TaxCalculationResult {
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxRate = 0.08; // 8% fallback
        const taxAmount = (subtotal + shippingCost) * taxRate;
        const total = subtotal + shippingCost + taxAmount;

        return {
            subtotal,
            shippingCost,
            taxRate,
            taxAmount,
            total,
            taxBreakdown: [
                {
                    name: 'Sales Tax (Fallback)',
                    rate: taxRate,
                    amount: taxAmount,
                    type: 'sales_tax'
                }
            ],
            currency: 'USD',
            jurisdiction: 'US (Fallback)'
        };
    }
}

export const taxService = new TaxService();
export default taxService;
