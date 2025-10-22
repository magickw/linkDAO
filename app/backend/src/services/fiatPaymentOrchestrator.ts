import { StripePaymentService } from './stripePaymentService';
import { MoonPayService } from './moonPayService';
import { FiatToCryptoService, ConversionRequest, ConversionResult } from './fiatToCryptoService';
import { IPaymentProcessor } from './ldaoAcquisitionService';
import { PurchaseRequest, PurchaseResult, PaymentMethod } from '../types/ldaoAcquisition';

export interface FiatPaymentConfig {
  preferredProvider: 'stripe' | 'moonpay' | 'auto';
  enableAutomaticConversion: boolean;
  maxRetryAttempts: number;
  conversionTimeout: number; // minutes
}

export interface PaymentProvider {
  name: string;
  type: 'direct' | 'onramp';
  available: boolean;
  fees: number;
  estimatedTime: number; // minutes
  supportedMethods: string[];
}

export class FiatPaymentOrchestrator implements IPaymentProcessor {
  private stripeService: StripePaymentService;
  private moonPayService: MoonPayService;
  private conversionService: FiatToCryptoService;
  private config: FiatPaymentConfig;

  constructor(
    stripeService: StripePaymentService,
    moonPayService: MoonPayService,
    conversionService: FiatToCryptoService,
    config: FiatPaymentConfig
  ) {
    this.stripeService = stripeService;
    this.moonPayService = moonPayService;
    this.conversionService = conversionService;
    this.config = config;
  }

  public async processPayment(request: PurchaseRequest): Promise<PurchaseResult> {
    try {
      const provider = await this.selectOptimalProvider(request);
      
      switch (provider) {
        case 'stripe':
          return await this.processStripePayment(request);
        case 'moonpay':
          return await this.processMoonPayPayment(request);
        default:
          return {
            success: false,
            error: 'No suitable payment provider available',
          };
      }
    } catch (error) {
      console.error('Fiat payment orchestration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  private async selectOptimalProvider(request: PurchaseRequest): Promise<'stripe' | 'moonpay' | null> {
    if (this.config.preferredProvider !== 'auto') {
      return this.config.preferredProvider;
    }

    // Auto-selection logic based on various factors
    const factors = {
      amount: request.amount,
      userLocation: 'US', // Would be determined from request
      paymentMethod: request.paymentToken || 'card',
    };

    // For small amounts, prefer Stripe (lower fees)
    if (factors.amount < 100) {
      return 'stripe';
    }

    // For crypto-to-crypto conversions, prefer MoonPay
    if (request.paymentToken && ['ETH', 'BTC', 'USDC'].includes(request.paymentToken)) {
      return 'moonpay';
    }

    // Default to Stripe for fiat payments
    return 'stripe';
  }

  private async processStripePayment(request: PurchaseRequest): Promise<PurchaseResult> {
    try {
      // Step 1: Process fiat payment through Stripe
      const stripeResult = await this.stripeService.processPayment(request);
      
      if (!stripeResult.success) {
        return stripeResult;
      }

      // Step 2: If automatic conversion is enabled, convert fiat to crypto
      if (this.config.enableAutomaticConversion) {
        const conversionResult = await this.convertFiatToCrypto(
          stripeResult.finalPrice || request.amount,
          'USD',
          'LDAO'
        );

        if (!conversionResult.success) {
          // Initiate refund if conversion fails
          await this.stripeService.processRefund(stripeResult.transactionId!);
          
          return {
            success: false,
            error: `Payment successful but conversion failed: ${conversionResult.error}`,
          };
        }

        return {
          success: true,
          transactionId: stripeResult.transactionId,
          estimatedTokens: conversionResult.toAmount,
          finalPrice: stripeResult.finalPrice,
        };
      }

      return stripeResult;
    } catch (error) {
      console.error('Stripe payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stripe payment failed',
      };
    }
  }

  private async processMoonPayPayment(request: PurchaseRequest): Promise<PurchaseResult> {
    try {
      // Step 1: Get quote from MoonPay
      const quote = await this.moonPayService.getQuote(
        'USD',
        'LDAO',
        request.amount,
        request.userAddress
      );

      if (!quote) {
        return {
          success: false,
          error: 'Unable to get quote from MoonPay',
        };
      }

      // Step 2: Create MoonPay transaction
      const transaction = await this.moonPayService.createTransaction(
        'USD',
        'LDAO',
        request.amount,
        request.userAddress,
        `ldao_${Date.now()}`
      );

      if (!transaction) {
        return {
          success: false,
          error: 'Failed to create MoonPay transaction',
        };
      }

      return {
        success: true,
        transactionId: transaction.id,
        estimatedTokens: quote.quoteAmount,
        finalPrice: quote.totalAmount,
      };
    } catch (error) {
      console.error('MoonPay payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MoonPay payment failed',
      };
    }
  }

  private async convertFiatToCrypto(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult> {
    const conversionRequest: ConversionRequest = {
      fromAmount: amount,
      fromCurrency,
      toCurrency,
      slippageTolerance: 1, // 1%
      priceGuaranteeMinutes: this.config.conversionTimeout,
    };

    return await this.conversionService.convertFiatToCrypto(conversionRequest);
  }

  public async retryPayment(transactionId: string, provider?: 'stripe' | 'moonpay'): Promise<PurchaseResult> {
    try {
      if (!provider) {
        // Try to determine provider from transaction ID format
        provider = transactionId.startsWith('pi_') ? 'stripe' : 'moonpay';
      }

      switch (provider) {
        case 'stripe':
          return await this.stripeService.retryPayment(transactionId);
        case 'moonpay':
          // MoonPay doesn't support direct retry, would need to create new transaction
          return {
            success: false,
            error: 'MoonPay transactions cannot be retried directly',
          };
        default:
          return {
            success: false,
            error: 'Unknown payment provider for retry',
          };
      }
    } catch (error) {
      console.error('Payment retry error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment retry failed',
      };
    }
  }

  public async processRefund(transactionId: string, amount?: number): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      // Determine provider from transaction ID
      if (transactionId.startsWith('pi_')) {
        return await this.stripeService.processRefund(transactionId, amount);
      } else {
        // For MoonPay, refunds are typically handled through their support
        return {
          success: false,
          error: 'MoonPay refunds must be processed through their support system',
        };
      }
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed',
      };
    }
  }

  public getSupportedMethods(): PaymentMethod[] {
    const methods: PaymentMethod[] = [];

    // Add Stripe methods
    methods.push(...this.stripeService.getSupportedMethods().map(method => ({
      ...method,
      network: 'stripe',
    })));

    // Add MoonPay methods (crypto on-ramp)
    methods.push({
      type: 'fiat',
      available: true,
      fees: 4.5, // Typical MoonPay fee
      network: 'moonpay',
    });

    return methods;
  }

  public async getAvailableProviders(): Promise<PaymentProvider[]> {
    const providers: PaymentProvider[] = [];

    // Stripe provider
    providers.push({
      name: 'Stripe',
      type: 'direct',
      available: true,
      fees: 2.9,
      estimatedTime: 2,
      supportedMethods: ['card', 'apple_pay', 'google_pay'],
    });

    // MoonPay provider
    providers.push({
      name: 'MoonPay',
      type: 'onramp',
      available: true,
      fees: 4.5,
      estimatedTime: 10,
      supportedMethods: ['card', 'bank_transfer', 'apple_pay', 'google_pay'],
    });

    return providers;
  }

  public async getOptimalProvider(request: PurchaseRequest): Promise<PaymentProvider | null> {
    const providers = await this.getAvailableProviders();
    const selectedProvider = await this.selectOptimalProvider(request);

    return providers.find(p => p.name.toLowerCase() === selectedProvider) || null;
  }

  public async estimateTransactionTime(provider: string, amount: number): Promise<number> {
    switch (provider) {
      case 'stripe':
        return 2; // 2 minutes for Stripe
      case 'moonpay':
        return await this.moonPayService.estimateTransactionTime('USD', 'LDAO');
      default:
        return 5; // Default 5 minutes
    }
  }

  public async getTransactionStatus(transactionId: string): Promise<{ status: string; provider: string } | null> {
    try {
      if (transactionId.startsWith('pi_')) {
        const paymentIntent = await this.stripeService.getPaymentIntent(transactionId);
        return paymentIntent ? { status: paymentIntent.status, provider: 'stripe' } : null;
      } else {
        const transaction = await this.moonPayService.getTransaction(transactionId);
        return transaction ? { status: transaction.status, provider: 'moonpay' } : null;
      }
    } catch (error) {
      console.error('Transaction status retrieval error:', error);
      return null;
    }
  }

  public async handleFailedConversion(transactionId: string, reason: string): Promise<void> {
    try {
      console.log(`Handling failed conversion for transaction ${transactionId}: ${reason}`);
      
      // Initiate refund process
      await this.processRefund(transactionId);
      
      // Log the failure for analysis
      await this.conversionService.handleConversionFailure(transactionId, reason);
      
      // Send notification to user (would be implemented)
      // await this.notificationService.sendConversionFailureNotification(transactionId, reason);
    } catch (error) {
      console.error('Failed conversion handling error:', error);
    }
  }
}