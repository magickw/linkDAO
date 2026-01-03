/**
 * Tax Calculation Service Tests
 * Tests tax calculations for different jurisdictions and scenarios
 */

import { describe, it, expect } from '@jest/globals';
import { taxCalculationService, TaxableItem, Address } from '../services/taxCalculationService';

describe('TaxCalculationService', () => {
    describe('US Sales Tax', () => {
        it('should calculate California sales tax correctly', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Test Product',
                    price: 100,
                    quantity: 1,
                    isDigital: false,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'US',
                state: 'CA',
                city: 'Los Angeles',
                postalCode: '90210'
            };

            const result = await taxCalculationService.calculateTax(items, address, 10, 'USD');

            expect(result.subtotal).toBe(100);
            expect(result.shippingCost).toBe(10);
            expect(result.taxRate).toBeCloseTo(0.0725, 4); // 7.25%
            expect(result.taxAmount).toBeCloseTo(110 * 0.0725, 2);
            expect(result.total).toBeCloseTo(110 + (110 * 0.0725), 2);
            expect(result.jurisdiction).toContain('California');
        });

        it('should calculate New York sales tax correctly', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Test Product',
                    price: 50,
                    quantity: 2,
                    isDigital: false,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'US',
                state: 'NY',
                city: 'New York',
                postalCode: '10001'
            };

            const result = await taxCalculationService.calculateTax(items, address, 5, 'USD');

            expect(result.subtotal).toBe(100);
            expect(result.taxRate).toBeCloseTo(0.0888, 4); // 8.88%
            expect(result.jurisdiction).toContain('New York');
        });
    });

    describe('Canadian GST/HST', () => {
        it('should calculate Ontario HST correctly', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Test Product',
                    price: 100,
                    quantity: 1,
                    isDigital: false,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'CA',
                state: 'ON',
                city: 'Toronto',
                postalCode: 'M5V 3A8'
            };

            const result = await taxCalculationService.calculateTax(items, address, 10, 'USD');

            expect(result.subtotal).toBe(100);
            expect(result.taxRate).toBeCloseTo(0.13, 4); // 13% HST
            expect(result.taxAmount).toBeCloseTo(110 * 0.13, 2);
            expect(result.jurisdiction).toContain('Ontario');
        });

        it('should calculate Alberta GST correctly', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Test Product',
                    price: 100,
                    quantity: 1,
                    isDigital: false,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'CA',
                state: 'AB',
                city: 'Calgary',
                postalCode: 'T2P 1H4'
            };

            const result = await taxCalculationService.calculateTax(items, address, 10, 'USD');

            expect(result.subtotal).toBe(100);
            expect(result.taxRate).toBeCloseTo(0.05, 4); // 5% GST
            expect(result.taxAmount).toBeCloseTo(110 * 0.05, 2);
            expect(result.jurisdiction).toContain('Alberta');
        });
    });

    describe('European VAT', () => {
        it('should calculate UK VAT correctly', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Test Product',
                    price: 100,
                    quantity: 1,
                    isDigital: false,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'GB',
                city: 'London',
                postalCode: 'SW1A 1AA'
            };

            const result = await taxCalculationService.calculateTax(items, address, 10, 'USD');

            expect(result.subtotal).toBe(100);
            expect(result.taxRate).toBeCloseTo(0.20, 4); // 20% VAT
            expect(result.taxAmount).toBeCloseTo(110 * 0.20, 2);
            expect(result.jurisdiction).toContain('UK');
        });

        it('should calculate German VAT correctly', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Test Product',
                    price: 100,
                    quantity: 1,
                    isDigital: false,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'DE',
                city: 'Berlin',
                postalCode: '10115'
            };

            const result = await taxCalculationService.calculateTax(items, address, 10, 'USD');

            expect(result.subtotal).toBe(100);
            expect(result.taxRate).toBeCloseTo(0.19, 4); // 19% VAT
            expect(result.taxAmount).toBeCloseTo(110 * 0.19, 2);
            expect(result.jurisdiction).toContain('German');
        });
    });

    describe('Australian GST', () => {
        it('should calculate Australian GST correctly', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Test Product',
                    price: 100,
                    quantity: 1,
                    isDigital: false,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'AU',
                state: 'NSW',
                city: 'Sydney',
                postalCode: '2000'
            };

            const result = await taxCalculationService.calculateTax(items, address, 10, 'USD');

            expect(result.subtotal).toBe(100);
            expect(result.taxRate).toBeCloseTo(0.10, 4); // 10% GST
            expect(result.taxAmount).toBeCloseTo(110 * 0.10, 2);
            expect(result.jurisdiction).toContain('Australian');
        });
    });

    describe('Tax Exemptions', () => {
        it('should apply tax exemption correctly', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Test Product',
                    price: 100,
                    quantity: 1,
                    isDigital: false,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'US',
                state: 'CA',
                city: 'Los Angeles',
                postalCode: '90210'
            };

            const exemption = {
                type: 'resale' as const,
                certificateId: 'TEST-123',
                jurisdictions: ['US-CA']
            };

            const result = await taxCalculationService.calculateTax(items, address, 10, 'USD', exemption);

            expect(result.subtotal).toBe(100);
            expect(result.taxAmount).toBe(0);
            expect(result.total).toBe(110); // No tax
            expect(result.jurisdiction).toBe('Exempt');
        });

        it('should not apply exemption for different jurisdiction', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Test Product',
                    price: 100,
                    quantity: 1,
                    isDigital: false,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'US',
                state: 'NY',
                city: 'New York',
                postalCode: '10001'
            };

            const exemption = {
                type: 'resale' as const,
                certificateId: 'TEST-123',
                jurisdictions: ['US-CA'] // Only valid for CA
            };

            const result = await taxCalculationService.calculateTax(items, address, 10, 'USD', exemption);

            expect(result.taxAmount).toBeGreaterThan(0); // Should still have tax
            expect(result.jurisdiction).not.toBe('Exempt');
        });
    });

    describe('Digital Goods', () => {
        it('should handle digital goods correctly', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Digital Product',
                    price: 100,
                    quantity: 1,
                    isDigital: true,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'US',
                state: 'CA',
                city: 'Los Angeles',
                postalCode: '90210'
            };

            const result = await taxCalculationService.calculateTax(items, address, 0, 'USD');

            expect(result.subtotal).toBe(100);
            // US sales tax typically doesn't apply to digital goods
            expect(result.taxAmount).toBe(0);
        });
    });

    describe('No Tax Jurisdiction', () => {
        it('should return no tax for unsupported jurisdiction', async () => {
            const items: TaxableItem[] = [
                {
                    id: '1',
                    name: 'Test Product',
                    price: 100,
                    quantity: 1,
                    isDigital: false,
                    isTaxExempt: false
                }
            ];

            const address: Address = {
                country: 'XX', // Unsupported country
                city: 'Test City'
            };

            const result = await taxCalculationService.calculateTax(items, address, 10, 'USD');

            expect(result.subtotal).toBe(100);
            expect(result.taxAmount).toBe(0);
            expect(result.total).toBe(110);
            expect(result.jurisdiction).toBe('No Tax');
        });
    });

    describe('Supported Jurisdictions', () => {
        it('should return list of supported jurisdictions', () => {
            const jurisdictions = taxCalculationService.getSupportedJurisdictions();

            expect(Array.isArray(jurisdictions)).toBe(true);
            expect(jurisdictions.length).toBeGreaterThan(0);
            expect(jurisdictions).toContain('US - CA');
            expect(jurisdictions).toContain('CA - ON');
            expect(jurisdictions).toContain('GB');
        });
    });
});