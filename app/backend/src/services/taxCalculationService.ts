/**
 * Tax Calculation Service
 * Handles sales tax, GST, VAT calculations for e-commerce transactions
 * Supports multiple jurisdictions and tax exemptions
 */

import { safeLogger } from '../utils/logger';

// Tax rate configuration by jurisdiction
interface TaxRate {
  country: string;
  state?: string;
  rate: number; // Decimal (e.g., 0.0825 for 8.25%)
  type: 'sales_tax' | 'gst' | 'vat' | 'hst' | 'pst';
  name: string; // Display name (e.g., "California Sales Tax", "UK VAT")
  appliesToShipping: boolean;
  appliesToDigital: boolean;
}

// Tax exemption types
export type TaxExemptionType = 
  | 'resale' 
  | 'non_profit' 
  | 'government' 
  | 'educational' 
  | 'medical'
  | 'charity';

// Tax calculation result
export interface TaxCalculationResult {
  subtotal: number;
  shippingCost: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  taxBreakdown: TaxBreakdown[];
  currency: string;
  jurisdiction: string;
}

export interface TaxBreakdown {
  name: string;
  rate: number;
  amount: number;
  type: string;
}

// Address interface
export interface Address {
  country: string;
  state?: string;
  city?: string;
  postalCode?: string;
  line1?: string;
}

// Line item for tax calculation
export interface TaxableItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isDigital: boolean;
  isTaxExempt: boolean;
  category?: string;
}

// Tax exemption certificate
export interface TaxExemption {
  type: TaxExemptionType;
  certificateId?: string;
  validUntil?: Date;
  jurisdictions: string[]; // Jurisdictions where this exemption applies
}

// Tax nexus - where seller has business presence
interface TaxNexus {
  country: string;
  state?: string;
  threshold: number; // Sales threshold to trigger nexus
  hasNexus: boolean;
}

export class TaxCalculationService {
  private taxRates: Map<string, TaxRate[]> = new Map();
  private taxNexus: Map<string, TaxNexus> = new Map();

  constructor() {
    this.initializeTaxRates();
    this.initializeTaxNexus();
  }

  /**
   * Initialize tax rates for major jurisdictions
   */
  private initializeTaxRates(): void {
    // United States - Sales Tax
    this.addTaxRate({
      country: 'US',
      state: 'CA',
      rate: 0.0725,
      type: 'sales_tax',
      name: 'California Sales Tax',
      appliesToShipping: true,
      appliesToDigital: false
    });

    this.addTaxRate({
      country: 'US',
      state: 'NY',
      rate: 0.0888,
      type: 'sales_tax',
      name: 'New York Sales Tax',
      appliesToShipping: true,
      appliesToDigital: false
    });

    this.addTaxRate({
      country: 'US',
      state: 'TX',
      rate: 0.0625,
      type: 'sales_tax',
      name: 'Texas Sales Tax',
      appliesToShipping: true,
      appliesToDigital: false
    });

    // Canada - GST/HST
    this.addTaxRate({
      country: 'CA',
      state: 'ON',
      rate: 0.13,
      type: 'hst',
      name: 'Ontario HST',
      appliesToShipping: true,
      appliesToDigital: true
    });

    this.addTaxRate({
      country: 'CA',
      state: 'BC',
      rate: 0.12,
      type: 'hst',
      name: 'British Columbia HST',
      appliesToShipping: true,
      appliesToDigital: true
    });

    this.addTaxRate({
      country: 'CA',
      state: 'AB',
      rate: 0.05,
      type: 'gst',
      name: 'Alberta GST',
      appliesToShipping: true,
      appliesToDigital: true
    });

    this.addTaxRate({
      country: 'CA',
      state: 'QC',
      rate: 0.14975,
      type: 'hst',
      name: 'Quebec HST',
      appliesToShipping: true,
      appliesToDigital: true
    });

    // European Union - VAT
    this.addTaxRate({
      country: 'GB',
      rate: 0.20,
      type: 'vat',
      name: 'UK VAT',
      appliesToShipping: true,
      appliesToDigital: true
    });

    this.addTaxRate({
      country: 'DE',
      rate: 0.19,
      type: 'vat',
      name: 'German VAT',
      appliesToShipping: true,
      appliesToDigital: true
    });

    this.addTaxRate({
      country: 'FR',
      rate: 0.20,
      type: 'vat',
      name: 'French VAT',
      appliesToShipping: true,
      appliesToDigital: true
    });

    this.addTaxRate({
      country: 'IE',
      rate: 0.23,
      type: 'vat',
      name: 'Irish VAT',
      appliesToShipping: true,
      appliesToDigital: true
    });

    // Australia - GST
    this.addTaxRate({
      country: 'AU',
      rate: 0.10,
      type: 'gst',
      name: 'Australian GST',
      appliesToShipping: true,
      appliesToDigital: true
    });

    // India - GST
    this.addTaxRate({
      country: 'IN',
      rate: 0.18,
      type: 'gst',
      name: 'India GST',
      appliesToShipping: true,
      appliesToDigital: true
    });

    // Japan - Consumption Tax
    this.addTaxRate({
      country: 'JP',
      rate: 0.10,
      type: 'sales_tax',
      name: 'Japan Consumption Tax',
      appliesToShipping: true,
      appliesToDigital: true
    });

    // Singapore - GST
    this.addTaxRate({
      country: 'SG',
      rate: 0.09,
      type: 'gst',
      name: 'Singapore GST',
      appliesToShipping: true,
      appliesToDigital: true
    });
  }

  /**
   * Initialize tax nexus (where seller has business presence)
   */
  private initializeTaxNexus(): void {
    // US Nexus - Economic nexus thresholds
    this.addTaxNexus({
      country: 'US',
      state: 'CA',
      threshold: 500000,
      hasNexus: true
    });

    this.addTaxNexus({
      country: 'US',
      state: 'NY',
      threshold: 500000,
      hasNexus: true
    });

    this.addTaxNexus({
      country: 'US',
      state: 'TX',
      threshold: 500000,
      hasNexus: true
    });

    // Canada Nexus
    this.addTaxNexus({
      country: 'CA',
      threshold: 30000,
      hasNexus: true
    });

    // EU Nexus - VAT OSS threshold
    this.addTaxNexus({
      country: 'GB',
      threshold: 10000,
      hasNexus: true
    });

    this.addTaxNexus({
      country: 'DE',
      threshold: 10000,
      hasNexus: true
    });

    this.addTaxNexus({
      country: 'FR',
      threshold: 10000,
      hasNexus: true
    });

    // Australia Nexus
    this.addTaxNexus({
      country: 'AU',
      threshold: 75000,
      hasNexus: true
    });
  }

  /**
   * Add a tax rate to the registry
   */
  private addTaxRate(rate: TaxRate): void {
    const key = rate.country + (rate.state ? `-${rate.state}` : '');
    if (!this.taxRates.has(key)) {
      this.taxRates.set(key, []);
    }
    this.taxRates.get(key)!.push(rate);
  }

  /**
   * Add a tax nexus to the registry
   */
  private addTaxNexus(nexus: TaxNexus): void {
    const key = nexus.country + (nexus.state ? `-${nexus.state}` : '');
    this.taxNexus.set(key, nexus);
  }

  /**
   * Calculate tax for an order
   */
  async calculateTax(
    items: TaxableItem[],
    shippingAddress: Address,
    shippingCost: number = 0,
    currency: string = 'USD',
    exemption?: TaxExemption
  ): Promise<TaxCalculationResult> {
    try {
      // Calculate subtotal
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Get applicable tax rates
      const taxRates = this.getApplicableTaxRates(shippingAddress);

      if (taxRates.length === 0) {
        // No tax applies
        return {
          subtotal,
          shippingCost,
          taxRate: 0,
          taxAmount: 0,
          total: subtotal + shippingCost,
          taxBreakdown: [],
          currency,
          jurisdiction: 'No Tax'
        };
      }

      // Check for tax exemption
      if (exemption && this.isExemptionValid(exemption, taxRates)) {
        safeLogger.info(`Tax exemption applied: ${exemption.type}`);
        return {
          subtotal,
          shippingCost,
          taxRate: 0,
          taxAmount: 0,
          total: subtotal + shippingCost,
          taxBreakdown: [],
          currency,
          jurisdiction: 'Exempt'
        };
      }

      // Calculate taxable amount
      const taxableAmount = this.calculateTaxableAmount(items, shippingCost, taxRates);

      // Calculate tax for each rate
      const taxBreakdown: TaxBreakdown[] = [];
      let totalTax = 0;

      for (const taxRate of taxRates) {
        const taxAmount = taxableAmount * taxRate.rate;
        totalTax += taxAmount;

        taxBreakdown.push({
          name: taxRate.name,
          rate: taxRate.rate,
          amount: taxAmount,
          type: taxRate.type
        });
      }

      const total = subtotal + shippingCost + totalTax;
      const effectiveRate = subtotal > 0 ? totalTax / subtotal : 0;

      return {
        subtotal,
        shippingCost,
        taxRate: effectiveRate,
        taxAmount: totalTax,
        total,
        taxBreakdown,
        currency,
        jurisdiction: taxRates.map(r => r.name).join(' + ')
      };
    } catch (error) {
      safeLogger.error('Tax calculation failed:', error);
      throw new Error('Failed to calculate tax');
    }
  }

  /**
   * Get applicable tax rates for an address
   */
  private getApplicableTaxRates(address: Address): TaxRate[] {
    const rates: TaxRate[] = [];
    const country = address.country.toUpperCase();
    const state = address.state?.toUpperCase();

    // Check for country-specific rates
    const countryKey = country;
    if (this.taxRates.has(countryKey)) {
      rates.push(...this.taxRates.get(countryKey)!);
    }

    // Check for state/province-specific rates
    if (state) {
      const stateKey = `${country}-${state}`;
      if (this.taxRates.has(stateKey)) {
        rates.push(...this.taxRates.get(stateKey)!);
      }
    }

    // Check tax nexus
    const hasNexus = this.checkTaxNexus(address);
    if (!hasNexus) {
      // No nexus, no tax
      return [];
    }

    return rates;
  }

  /**
   * Check if seller has tax nexus in the buyer's jurisdiction
   */
  private checkTaxNexus(address: Address): boolean {
    const country = address.country.toUpperCase();
    const state = address.state?.toUpperCase();

    // Check country-level nexus
    const countryKey = country;
    if (this.taxNexus.has(countryKey)) {
      const nexus = this.taxNexus.get(countryKey)!;
      if (nexus.hasNexus) {
        return true;
      }
    }

    // Check state-level nexus
    if (state) {
      const stateKey = `${country}-${state}`;
      if (this.taxNexus.has(stateKey)) {
        const nexus = this.taxNexus.get(stateKey)!;
        if (nexus.hasNexus) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate taxable amount based on tax rules
   */
  private calculateTaxableAmount(
    items: TaxableItem[],
    shippingCost: number,
    taxRates: TaxRate[]
  ): number {
    let taxableAmount = 0;

    // Calculate taxable amount for items
    for (const item of items) {
      if (item.isTaxExempt) {
        continue;
      }

      // Check if digital goods are taxable
      if (item.isDigital) {
        const digitalTaxable = taxRates.some(r => r.appliesToDigital);
        if (!digitalTaxable) {
          continue;
        }
      }

      taxableAmount += item.price * item.quantity;
    }

    // Check if shipping is taxable
    const shippingTaxable = taxRates.some(r => r.appliesToShipping);
    if (shippingTaxable) {
      taxableAmount += shippingCost;
    }

    return taxableAmount;
  }

  /**
   * Check if tax exemption is valid
   */
  private isExemptionValid(exemption: TaxExemption, taxRates: TaxRate[]): boolean {
    // Check if exemption has expired
    if (exemption.validUntil && new Date() > exemption.validUntil) {
      return false;
    }

    // Check if exemption applies to current jurisdiction
    const jurisdictionKeys = taxRates.map(r => 
      r.country + (r.state ? `-${r.state}` : '')
    );

    const applies = exemption.jurisdictions.some(jurisdiction => 
      jurisdictionKeys.includes(jurisdiction.toUpperCase())
    );

    return applies;
  }

  /**
   * Get tax rate for a jurisdiction (for display purposes)
   */
  getTaxRateForDisplay(country: string, state?: string): number {
    const rates = this.getApplicableTaxRates({ country, state });
    if (rates.length === 0) return 0;
    
    // Return the highest rate for display
    return Math.max(...rates.map(r => r.rate));
  }

  /**
   * Validate tax exemption certificate
   */
  async validateTaxExemption(certificateId: string): Promise<boolean> {
    // In production, this would validate against a database or external service
    // For now, return true for valid format
    return certificateId && certificateId.length > 0;
  }

  /**
   * Get supported jurisdictions
   */
  getSupportedJurisdictions(): string[] {
    const jurisdictions = new Set<string>();
    
    for (const [key, rates] of this.taxRates.entries()) {
      rates.forEach(rate => {
        jurisdictions.add(`${rate.country}${rate.state ? ` - ${rate.state}` : ''}`);
      });
    }

    return Array.from(jurisdictions).sort();
  }

  /**
   * Add custom tax rate (for admin configuration)
   */
  addCustomTaxRate(rate: TaxRate): void {
    this.addTaxRate(rate);
  }

  /**
   * Update tax nexus status
   */
  updateTaxNexus(country: string, state: string | undefined, hasNexus: boolean): void {
    const key = country + (state ? `-${state}` : '');
    
    if (this.taxNexus.has(key)) {
      this.taxNexus.get(key)!.hasNexus = hasNexus;
    } else {
      this.addTaxNexus({
        country,
        state,
        threshold: 0,
        hasNexus
      });
    }
  }
}

// Export singleton instance
export const taxCalculationService = new TaxCalculationService();

export default TaxCalculationService;