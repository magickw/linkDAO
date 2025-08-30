import { 
  FiatPaymentRequest, 
  FiatPaymentTransaction, 
  FiatPaymentStatus, 
  FiatPaymentMethod,
  PaymentMethodSetup,
  FiatPaymentReceipt,
  ComplianceData
} from '../types/fiatPayment';
import { ExchangeRateService } from './exchangeRateService';

// Mock Stripe types (in real implementation, use @stripe/stripe-js)
interface StripePaymentIntent {
  id: string;
  status: string;
  amount: number;
  currency: string;
  client_secret: string;
  payment_method?: string;
}

interface StripePaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

export class StripePaymentService {
  private exchangeRateService: ExchangeRateService;
  private apiKey: string;
  private baseURL = 'https://api.stripe.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.exchangeRateService = new ExchangeRateService();
  }

  /**
   * Process fiat payment
   */
  async processPayment(request: FiatPaymentRequest): Promise<FiatPaymentTransaction> {
    try {
      // Validate request
      await this.validatePaymentRequest(request);

      // Check compliance
      await this.checkCompliance(request);

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(request);

      // Create transaction record
      const transaction = this.createTransactionRecord(request, paymentIntent);

      // If crypto conversion is requested, get exchange rate
      if (request.convertToCrypto) {
        const exchangeRate = await this.exchangeRateService.getExchangeRate(
          request.currency,
          request.convertToCrypto.targetToken
        );
        
        transaction.exchangeRate = exchangeRate;
        transaction.cryptoConversion = {
          fromAmount: request.amount,
          fromCurrency: request.currency,
          toAmount: (request.amount * exchangeRate.rate).toString(),
          toToken: request.convertToCrypto.targetToken,
          toChain: request.convertToCrypto.targetChain,
          exchangeRate: exchangeRate.rate,
          slippage: request.convertToCrypto.slippageTolerance,
          status: 'pending'
        };
      }

      return transaction;
    } catch (error) {
      console.error('Stripe payment processing failed:', error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<FiatPaymentTransaction> {
    try {
      const response = await this.makeStripeRequest(
        `payment_intents/${paymentIntentId}/confirm`,
        'POST',
        {
          payment_method: paymentMethodId,
          return_url: window.location.origin + '/payment/return'
        }
      );

      const paymentIntent = response as StripePaymentIntent;
      
      // Update transaction status based on payment intent status
      const status = this.mapStripeStatusToFiatStatus(paymentIntent.status);
      
      // In real implementation, retrieve and update the transaction from database
      const transaction: FiatPaymentTransaction = {
        id: `fiat_${Date.now()}`,
        orderId: 'mock_order',
        amount: paymentIntent.amount / 100, // Stripe uses cents
        currency: paymentIntent.currency.toUpperCase(),
        status,
        paymentMethodId,
        provider: 'stripe',
        providerTransactionId: paymentIntent.id,
        fees: {
          processingFee: this.calculateProcessingFee(paymentIntent.amount / 100),
          platformFee: this.calculatePlatformFee(paymentIntent.amount / 100),
          totalFees: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      transaction.fees.totalFees = transaction.fees.processingFee + transaction.fees.platformFee;

      return transaction;
    } catch (error) {
      console.error('Payment confirmation failed:', error);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Setup payment method
   */
  async setupPaymentMethod(
    customerId: string,
    paymentMethodType: string = 'card'
  ): Promise<PaymentMethodSetup> {
    try {
      const response = await this.makeStripeRequest('setup_intents', 'POST', {
        customer: customerId,
        payment_method_types: [paymentMethodType],
        usage: 'off_session'
      });

      return {
        clientSecret: response.client_secret,
        status: response.status
      };
    } catch (error) {
      console.error('Payment method setup failed:', error);
      throw new Error(`Payment method setup failed: ${error.message}`);
    }
  }

  /**
   * Get customer payment methods
   */
  async getPaymentMethods(customerId: string): Promise<FiatPaymentMethod[]> {
    try {
      const response = await this.makeStripeRequest(
        `customers/${customerId}/payment_methods`,
        'GET'
      );

      return response.data.map((pm: StripePaymentMethod) => this.mapStripePaymentMethod(pm));
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      throw new Error(`Failed to fetch payment methods: ${error.message}`);
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<FiatPaymentTransaction> {
    try {
      const refundData: any = {
        payment_intent: transactionId,
        reason: reason || 'requested_by_customer'
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const response = await this.makeStripeRequest('refunds', 'POST', refundData);

      // In real implementation, update the transaction in database
      const transaction: FiatPaymentTransaction = {
        id: `fiat_${Date.now()}`,
        orderId: 'mock_order',
        amount: response.amount / 100,
        currency: response.currency.toUpperCase(),
        status: FiatPaymentStatus.REFUNDED,
        paymentMethodId: 'mock_pm',
        provider: 'stripe',
        providerTransactionId: response.payment_intent,
        refundId: response.id,
        fees: {
          processingFee: 0,
          platformFee: 0,
          totalFees: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return transaction;
    } catch (error) {
      console.error('Refund failed:', error);
      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Generate payment receipt
   */
  generateReceipt(transaction: FiatPaymentTransaction): FiatPaymentReceipt {
    return {
      transactionId: transaction.id,
      orderId: transaction.orderId,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: {
        type: 'card', // In real implementation, get from payment method
        last4: '4242',
        brand: 'visa'
      },
      fees: transaction.fees,
      timestamp: transaction.createdAt,
      status: transaction.status,
      providerTransactionId: transaction.providerTransactionId || '',
      cryptoConversion: transaction.cryptoConversion
    };
  }

  /**
   * Check compliance requirements
   */
  private async checkCompliance(request: FiatPaymentRequest): Promise<void> {
    // Mock compliance check
    const complianceData: ComplianceData = {
      kycStatus: 'approved',
      amlChecks: {
        status: 'passed',
        riskScore: 0.1,
        lastChecked: new Date()
      },
      transactionLimits: {
        daily: 10000,
        monthly: 50000,
        yearly: 200000,
        remaining: {
          daily: 9000,
          monthly: 45000,
          yearly: 180000
        }
      },
      restrictedCountries: ['XX', 'YY'] // Mock restricted countries
    };

    // Check transaction limits
    if (request.amount > complianceData.transactionLimits.remaining.daily) {
      throw new Error('Transaction exceeds daily limit');
    }

    // Check KYC status
    if (complianceData.kycStatus !== 'approved') {
      throw new Error('KYC verification required');
    }

    // Check AML
    if (complianceData.amlChecks.status !== 'passed') {
      throw new Error('AML check failed');
    }
  }

  /**
   * Validate payment request
   */
  private async validatePaymentRequest(request: FiatPaymentRequest): Promise<void> {
    if (!request.orderId || !request.amount || !request.currency || !request.paymentMethodId) {
      throw new Error('Invalid payment request: missing required fields');
    }

    if (request.amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    const supportedCurrencies = this.exchangeRateService.getSupportedFiatCurrencies();
    if (!supportedCurrencies.includes(request.currency)) {
      throw new Error(`Unsupported currency: ${request.currency}`);
    }
  }

  /**
   * Create Stripe payment intent
   */
  private async createPaymentIntent(request: FiatPaymentRequest): Promise<StripePaymentIntent> {
    const intentData = {
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      payment_method: request.paymentMethodId,
      confirmation_method: 'manual',
      confirm: false,
      metadata: {
        order_id: request.orderId,
        convert_to_crypto: request.convertToCrypto ? 'true' : 'false'
      }
    };

    return await this.makeStripeRequest('payment_intents', 'POST', intentData);
  }

  /**
   * Create transaction record
   */
  private createTransactionRecord(
    request: FiatPaymentRequest,
    paymentIntent: StripePaymentIntent
  ): FiatPaymentTransaction {
    const processingFee = this.calculateProcessingFee(request.amount);
    const platformFee = this.calculatePlatformFee(request.amount);

    return {
      id: `fiat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      status: this.mapStripeStatusToFiatStatus(paymentIntent.status),
      paymentMethodId: request.paymentMethodId,
      provider: 'stripe',
      providerTransactionId: paymentIntent.id,
      fees: {
        processingFee,
        platformFee,
        totalFees: processingFee + platformFee
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Calculate processing fee (Stripe's fee)
   */
  private calculateProcessingFee(amount: number): number {
    // Stripe's standard fee: 2.9% + $0.30
    return (amount * 0.029) + 0.30;
  }

  /**
   * Calculate platform fee
   */
  private calculatePlatformFee(amount: number): number {
    // Platform fee: 1% of transaction
    return amount * 0.01;
  }

  /**
   * Map Stripe status to fiat payment status
   */
  private mapStripeStatusToFiatStatus(stripeStatus: string): FiatPaymentStatus {
    const statusMap: Record<string, FiatPaymentStatus> = {
      'requires_payment_method': FiatPaymentStatus.PENDING,
      'requires_confirmation': FiatPaymentStatus.PENDING,
      'requires_action': FiatPaymentStatus.PROCESSING,
      'processing': FiatPaymentStatus.PROCESSING,
      'succeeded': FiatPaymentStatus.SUCCEEDED,
      'canceled': FiatPaymentStatus.CANCELLED
    };

    return statusMap[stripeStatus] || FiatPaymentStatus.FAILED;
  }

  /**
   * Map Stripe payment method to our format
   */
  private mapStripePaymentMethod(stripePaymentMethod: StripePaymentMethod): FiatPaymentMethod {
    return {
      id: stripePaymentMethod.id,
      type: stripePaymentMethod.type as any,
      provider: 'stripe',
      name: `${stripePaymentMethod.card?.brand} ****${stripePaymentMethod.card?.last4}`,
      last4: stripePaymentMethod.card?.last4,
      brand: stripePaymentMethod.card?.brand,
      expiryMonth: stripePaymentMethod.card?.exp_month,
      expiryYear: stripePaymentMethod.card?.exp_year,
      isDefault: false,
      enabled: true
    };
  }

  /**
   * Make request to Stripe API
   */
  private async makeStripeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<any> {
    // Mock implementation - in real app, use Stripe SDK
    console.log(`Mock Stripe API call: ${method} ${endpoint}`, data);
    
    // Return mock responses based on endpoint
    if (endpoint === 'payment_intents' && method === 'POST') {
      return {
        id: `pi_${Math.random().toString(36).substr(2, 9)}`,
        status: 'requires_confirmation',
        amount: data.amount,
        currency: data.currency,
        client_secret: `pi_${Math.random().toString(36).substr(2, 9)}_secret_${Math.random().toString(36).substr(2, 9)}`,
        payment_method: data.payment_method
      };
    }

    if (endpoint.includes('payment_intents') && endpoint.includes('confirm')) {
      return {
        id: endpoint.split('/')[1],
        status: 'succeeded',
        amount: 1000,
        currency: 'usd'
      };
    }

    if (endpoint === 'setup_intents' && method === 'POST') {
      return {
        client_secret: `seti_${Math.random().toString(36).substr(2, 9)}_secret_${Math.random().toString(36).substr(2, 9)}`,
        status: 'requires_payment_method'
      };
    }

    if (endpoint.includes('payment_methods') && method === 'GET') {
      return {
        data: [
          {
            id: 'pm_1234567890',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2025
            }
          }
        ]
      };
    }

    if (endpoint === 'refunds' && method === 'POST') {
      return {
        id: `re_${Math.random().toString(36).substr(2, 9)}`,
        amount: data.amount || 1000,
        currency: 'usd',
        payment_intent: data.payment_intent,
        status: 'succeeded'
      };
    }

    throw new Error(`Mock endpoint not implemented: ${method} ${endpoint}`);
  }
}