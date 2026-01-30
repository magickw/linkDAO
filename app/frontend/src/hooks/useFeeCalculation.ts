import { useState, useEffect, useCallback } from 'react';

interface FeeCalculationParams {
  itemPrice: number;
  currency: string;
  paymentMethod: 'fiat' | 'crypto';
  shippingCost?: number;
  buyerAddress?: string;
  sellerAddress?: string;
  countryCode?: string;
  stateCode?: string;
}

interface CalculatedFees {
  platformFee: number;
  platformFeeRate: number;
  processingFee: number;
  taxAmount: number;
  taxRate: number;
  shippingCost: number;
  totalAmount: number;
  isLoading: boolean;
  error: string | null;
}

export const useFeeCalculation = (params: FeeCalculationParams) => {
  const [fees, setFees] = useState<CalculatedFees>({
    platformFee: 0,
    platformFeeRate: 0,
    processingFee: 0,
    taxAmount: 0,
    taxRate: 0,
    shippingCost: params.shippingCost || 0,
    totalAmount: 0,
    isLoading: false,
    error: null
  });

  const calculateFees = useCallback(async () => {
    if (!params.itemPrice || params.itemPrice <= 0) {
      setFees(prev => ({
        ...prev,
        platformFee: 0,
        processingFee: 0,
        taxAmount: 0,
        totalAmount: 0,
        isLoading: false,
        error: null
      }));
      return;
    }

    setFees(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Calculate platform fee based on payment method (seller fee)
      const platformFeeRate = params.paymentMethod === 'fiat' ? 0.10 : 0.07;
      const platformFee = params.itemPrice * platformFeeRate;

      // Calculate processing fee based on payment method
      let processingFee = 0;
      if (params.paymentMethod === 'fiat') {
        // Stripe fees: 2.9% + $0.30 on item price
        processingFee = (params.itemPrice * 0.029) + 0.30;
      } else {
        // Crypto network fee estimate
        processingFee = 0.01; // Simplified estimate
      }

      // Calculate tax (mock implementation - would use real tax service)
      let taxAmount = 0;
      let taxRate = 0;
      
      if (params.countryCode && params.stateCode) {
        // Mock tax calculation - would integrate with real tax service
        const stateRates: Record<string, number> = {
          'CA': 0.0825, // California
          'NY': 0.08875, // New York
          'TX': 0.0825, // Texas
          'FL': 0.075, // Florida
        };
        taxRate = stateRates[params.stateCode] || 0.08;
        taxAmount = params.itemPrice * taxRate;
      }

      const totalAmount = params.itemPrice + platformFee + taxAmount + processingFee + (params.shippingCost || 0);

      setFees({
        platformFee,
        platformFeeRate: platformFeeRate * 100,
        processingFee,
        taxAmount,
        taxRate,
        shippingCost: params.shippingCost || 0,
        totalAmount,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Fee calculation error:', error);
      setFees(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to calculate fees'
      }));
    }
  }, [
    params.itemPrice,
    params.currency,
    params.paymentMethod,
    params.shippingCost,
    params.buyerAddress,
    params.sellerAddress,
    params.countryCode,
    params.stateCode
  ]);

  // Recalculate when params change
  useEffect(() => {
    calculateFees();
  }, [calculateFees]);

  return {
    fees,
    recalculate: calculateFees
  };
};