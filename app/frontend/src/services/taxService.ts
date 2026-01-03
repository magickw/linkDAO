/**
 * Tax Service
 * Handles tax calculations and tax-related API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

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

export interface TaxExemption {
    type: 'resale' | 'non_profit' | 'government' | 'educational' | 'medical' | 'charity';
    certificateId?: string;
    validUntil?: string;
    jurisdictions: string[];
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

export class TaxService {
    /**
     * Calculate tax for a given order
     */
    async calculateTax(
        items: TaxableItem[],
        shippingAddress: Address,
        shippingCost: number = 0,
        currency: string = 'USD',
        taxExemption?: TaxExemption
    ): Promise<TaxCalculationResult> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/checkout/calculate-tax`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items,
                    shippingAddress,
                    shippingCost,
                    currency,
                    taxExemption
                })
            });

            if (!response.ok) {
                throw new Error(`Tax calculation failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error calculating tax:', error);
            // Return fallback result
            return this.getFallbackTaxCalculation(items, shippingCost);
        }
    }

    /**
     * Get supported tax jurisdictions
     */
    async getSupportedJurisdictions(): Promise<string[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/checkout/tax-jurisdictions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get jurisdictions: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error getting tax jurisdictions:', error);
            return [];
        }
    }

    /**
     * Validate tax exemption certificate
     */
    async validateTaxExemption(certificateId: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/checkout/validate-tax-exemption`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ certificateId })
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.valid || false;
        } catch (error) {
            console.error('Error validating tax exemption:', error);
            return false;
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

    /**
     * Format tax rate for display
     */
    formatTaxRate(rate: number): string {
        return `${(rate * 100).toFixed(2)}%`;
    }

    /**
     * Check if an address is in a taxable jurisdiction
     */
    isTaxableJurisdiction(address: Address): boolean {
        // List of countries that typically require tax
        const taxableCountries = [
            'US', 'CA', 'GB', 'DE', 'FR', 'IE', 'AU', 'IN', 'JP', 'SG',
            'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 
            'HU', 'IS', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 
            'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH'
        ];

        return taxableCountries.includes(address.country.toUpperCase());
    }

    /**
     * Get tax rate estimate for a country (for quick display)
     */
    getEstimatedTaxRate(country: string, state?: string): number {
        const countryUpper = country.toUpperCase();
        
        // Common tax rates (simplified estimates)
        const taxRates: { [key: string]: number } = {
            'US': 0.08, // Average US sales tax
            'CA': 0.13, // Average Canadian GST/HST
            'GB': 0.20, // UK VAT
            'DE': 0.19, // German VAT
            'FR': 0.20, // French VAT
            'AU': 0.10, // Australian GST
            'IN': 0.18, // India GST
            'JP': 0.10, // Japan Consumption Tax
            'SG': 0.09, // Singapore GST
        };

        return taxRates[countryUpper] || 0;
    }
}

// Export singleton instance
export const taxService = new TaxService();

export default TaxService;