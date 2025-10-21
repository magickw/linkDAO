import { useState, useCallback, useEffect } from 'react';
import { 
  FiatPaymentRequest, 
  FiatPaymentTransaction, 
  FiatPaymentStatus, 
  FiatPaymentMethod,
  FiatPaymentReceipt,
  ExchangeRate
} from '../types/fiatPayment';
import { StripePaymentService } from '../services/stripePaymentService';
import { ExchangeRateService } from '../services/exchangeRateService';

interface UseFiatPaymentReturn {
  // State
  isProcessing: boolean;
  currentTransaction: FiatPaymentTransaction | null;
  error: string | null;
  paymentMethods: FiatPaymentMethod[];
  exchangeRates: Record<string, ExchangeRate>;
  
  // Actions
  processPayment: (request: FiatPaymentRequest) => Promise<FiatPaymentTransaction>;
  confirmPayment: (paymentIntentId: string, paymentMethodId: string) => Promise<FiatPaymentTransaction>;
  refundPayment: (transactionId: string, amount?: number, reason?: string) => Promise<FiatPaymentTransaction>;
  loadPaymentMethods: (customerId: string) => Promise<void>;
  getExchangeRate: (fromCurrency: string, toCurrency: string) => Promise<ExchangeRate>;
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => Promise<{ convertedAmount: number; exchangeRate: ExchangeRate }>;
  generateReceipt: (transaction: FiatPaymentTransaction) => FiatPaymentReceipt;
  clearError: () => void;
  
  // Utils
  formatCurrency: (amount: number, currency: string) => string;
  getSupportedCurrencies: () => string[];
}

export function useFiatPayment(stripeApiKey?: string): UseFiatPaymentReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<FiatPaymentTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<FiatPaymentMethod[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, ExchangeRate>>({});

  // Initialize services
  const [stripeService, setStripeService] = useState<StripePaymentService | null>(null);
  const [exchangeRateService, setExchangeRateService] = useState<ExchangeRateService | null>(null);

  useEffect(() => {
    if (stripeApiKey) {
      setStripeService(new StripePaymentService(stripeApiKey));
    }
    setExchangeRateService(new ExchangeRateService());
  }, [stripeApiKey]);

  /**
   * Process a fiat payment
   */
  const processPayment = useCallback(async (request: FiatPaymentRequest): Promise<FiatPaymentTransaction> => {
    if (!stripeService) {
      throw new Error('Stripe service not initialized');
    }

    try {
      setIsProcessing(true);
      setError(null);

      const transaction = await stripeService.processPayment(request);
      setCurrentTransaction(transaction);

      return transaction;
    } catch (err: any) {
      const errorMessage = err.message || 'Payment processing failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [stripeService]);

  /**
   * Confirm a payment intent
   */
  const confirmPayment = useCallback(async (
    paymentIntentId: string, 
    paymentMethodId: string
  ): Promise<FiatPaymentTransaction> => {
    if (!stripeService) {
      throw new Error('Stripe service not initialized');
    }

    try {
      setIsProcessing(true);
      setError(null);

      const transaction = await stripeService.confirmPayment(paymentIntentId, paymentMethodId);
      setCurrentTransaction(transaction);

      return transaction;
    } catch (err: any) {
      const errorMessage = err.message || 'Payment confirmation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [stripeService]);

  /**
   * Refund a payment
   */
  const refundPayment = useCallback(async (
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<FiatPaymentTransaction> => {
    if (!stripeService) {
      throw new Error('Stripe service not initialized');
    }

    try {
      setIsProcessing(true);
      setError(null);

      const transaction = await stripeService.refundPayment(transactionId, amount, reason);
      setCurrentTransaction(transaction);

      return transaction;
    } catch (err: any) {
      const errorMessage = err.message || 'Refund failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [stripeService]);

  /**
   * Load customer payment methods
   */
  const loadPaymentMethods = useCallback(async (customerId: string): Promise<void> => {
    if (!stripeService) {
      throw new Error('Stripe service not initialized');
    }

    try {
      setError(null);
      const methods = await stripeService.getPaymentMethods(customerId);
      setPaymentMethods(methods);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load payment methods';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [stripeService]);

  /**
   * Get exchange rate between currencies
   */
  const getExchangeRate = useCallback(async (
    fromCurrency: string, 
    toCurrency: string
  ): Promise<ExchangeRate> => {
    if (!exchangeRateService) {
      throw new Error('Exchange rate service not initialized');
    }

    try {
      setError(null);
      const rate = await exchangeRateService.getExchangeRate(fromCurrency, toCurrency);
      
      // Cache the rate only if it's not null
      if (rate !== null) {
        // Convert the service ExchangeRate to the hook ExchangeRate type
        const hookExchangeRate: ExchangeRate = {
          fromCurrency: rate.fromToken,
          toCurrency: rate.toToken,
          rate: rate.rate,
          provider: rate.source,
          timestamp: rate.lastUpdated,
          validUntil: new Date(rate.lastUpdated.getTime() + 5 * 60 * 1000) // 5 minutes from now
        };
        
        setExchangeRates(prev => ({
          ...prev,
          [`${fromCurrency}-${toCurrency}`]: hookExchangeRate
        }));
        
        return hookExchangeRate;
      } else {
        // Return a default exchange rate if we can't fetch it
        const defaultRate: ExchangeRate = {
          fromCurrency: fromCurrency,
          toCurrency: toCurrency,
          rate: 1,
          provider: 'default',
          timestamp: new Date(),
          validUntil: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
        };
        return defaultRate;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get exchange rate';
      setError(errorMessage);
      // Return a default exchange rate if we encounter an error
      const defaultRate: ExchangeRate = {
        fromCurrency: fromCurrency,
        toCurrency: toCurrency,
        rate: 1,
        provider: 'default',
        timestamp: new Date(),
        validUntil: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      };
      return defaultRate;
    }
  }, [exchangeRateService]);

  /**
   * Convert amount between currencies
   */
  const convertAmount = useCallback(async (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ convertedAmount: number; exchangeRate: ExchangeRate }> => {
    if (!exchangeRateService) {
      throw new Error('Exchange rate service not initialized');
    }

    try {
      setError(null);
      const result = await exchangeRateService.convertCurrency(amount, fromCurrency, toCurrency);
      
      if (result) {
        // Convert the service ExchangeRate to the hook ExchangeRate type
        const hookExchangeRate: ExchangeRate = {
          fromCurrency: result.fromCurrency,
          toCurrency: result.toCurrency,
          rate: result.rate,
          provider: 'exchange-service',
          timestamp: result.timestamp,
          validUntil: new Date(result.timestamp.getTime() + 5 * 60 * 1000) // 5 minutes from now
        };
        
        return {
          convertedAmount: result.toAmount,
          exchangeRate: hookExchangeRate
        };
      } else {
        // Return default conversion if we can't get the rate
        const defaultRate: ExchangeRate = {
          fromCurrency: fromCurrency,
          toCurrency: toCurrency,
          rate: 1,
          provider: 'default',
          timestamp: new Date(),
          validUntil: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
        };
        
        return {
          convertedAmount: amount,
          exchangeRate: defaultRate
        };
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Currency conversion failed';
      setError(errorMessage);
      // Return default conversion if we encounter an error
      const defaultRate: ExchangeRate = {
        fromCurrency: fromCurrency,
        toCurrency: toCurrency,
        rate: 1,
        provider: 'default',
        timestamp: new Date(),
        validUntil: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      };
      
      return {
        convertedAmount: amount,
        exchangeRate: defaultRate
      };
    }
  }, [exchangeRateService]);

  /**
   * Generate payment receipt
   */
  const generateReceipt = useCallback((transaction: FiatPaymentTransaction): FiatPaymentReceipt => {
    if (!stripeService) {
      throw new Error('Stripe service not initialized');
    }

    return stripeService.generateReceipt(transaction);
  }, [stripeService]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Format currency amount for display
   */
  const formatCurrency = useCallback((amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }, []);

  /**
   * Get supported currencies
   */
  const getSupportedCurrencies = useCallback((): string[] => {
    if (!exchangeRateService) {
      return ['USD', 'EUR', 'GBP'];
    }
    const supported = exchangeRateService.getSupportedCurrencies();
    return supported.all;
  }, [exchangeRateService]);

  return {
    // State
    isProcessing,
    currentTransaction,
    error,
    paymentMethods,
    exchangeRates,
    
    // Actions
    processPayment,
    confirmPayment,
    refundPayment,
    loadPaymentMethods,
    getExchangeRate,
    convertAmount,
    generateReceipt,
    clearError,
    
    // Utils
    formatCurrency,
    getSupportedCurrencies
  };
}