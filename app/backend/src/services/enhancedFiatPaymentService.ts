import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { ExchangeRateService } from './exchangeRateService';
import { NotificationService } from './notificationService';
import { UserProfileService } from './userProfileService';

export interface FiatPaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  provider: 'stripe' | 'paypal' | 'bank_transfer' | 'apple_pay' | 'google_pay';
  userAddress: string;
  convertToCrypto?: {
    targetToken: string;
    targetChain: number;
    slippageTolerance: number;
    recipientAddress: string;
  };
  metadata?: any;
}

export interface FiatPaymentResult {
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: FiatPaymentStatus;
  paymentMethodId: string;
  provider: string;
  providerTransactionId: string;
  fees: PaymentFees;
  cryptoConversion?: CryptoConversionResult;
  receipt: FiatPaymentReceipt;
  createdAt: Date;
  updatedAt: Date;
}

export interface CryptoConversionResult {
  fromAmount: number;
  fromCurrency: string;
  toAmount: string;
  toToken: string;
  toChain: number;
  exchangeRate: number;
  slippage: number;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  recipientAddress: string;
  conversionFee: number;
}

export interface PaymentFees {
  processingFee: number;
  platformFee: number;
  exchangeFee?: number;
  conversionFee?: number;
  totalFees: number;
  currency: string;
}

export interface FiatPaymentReceipt {
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: {
    type: string;
    last4?: string;
    brand?: string;
    provider: string;
  };
  fees: PaymentFees;
  timestamp: Date;
  status: FiatPaymentStatus;
  providerTransactionId: string;
  cryptoConversion?: CryptoConversionResult;
  downloadUrl?: string;
}

export interface PaymentMethodInfo {
  id: string;
  type: 'card' | 'bank_account' | 'digital_wallet';
  provider: string;
  name: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  enabled: boolean;
  country: string;
  currency: string;
  verificationStatus: 'verified' | 'pending' | 'failed';
  addedAt: Date;
}

export interface PaymentMethodSelection {
  availableMethods: PaymentMethodInfo[];
  recommendedMethod?: PaymentMethodInfo;
  reasoning: string[];
  restrictions: string[];
}

export enum FiatPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed'
}

export class EnhancedFiatPaymentService {
  private databaseService: DatabaseService;
  private exchangeRateService: ExchangeRateService;
  private notificationService: NotificationService;
  private userProfileService: UserProfileService;

  // Provider configurations
  private readonly PROVIDER_CONFIGS = {
    stripe: {
      name: 'Stripe',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
      supportedMethods: ['card', 'bank_account', 'apple_pay', 'google_pay'],
      processingFee: (amount: number) => (amount * 0.029) + 0.30,
      maxAmount: 999999,
      minAmount: 0.50,
      settlementTime: 'instant'
    },
    paypal: {
      name: 'PayPal',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      supportedMethods: ['paypal_account', 'card'],
      processingFee: (amount: number) => amount * 0.034,
      maxAmount: 10000,
      minAmount: 1.00,
      settlementTime: 'instant'
    },
    bank_transfer: {
      name: 'Bank Transfer',
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      supportedMethods: ['bank_account'],
      processingFee: () => 5.00,
      maxAmount: 50000,
      minAmount: 10.00,
      settlementTime: '1-3 business days'
    }
  };

  constructor() {
    this.databaseService = new DatabaseService();
    this.exchangeRateService = new ExchangeRateService();
    this.notificationService = new NotificationService();
    this.userProfileService = new UserProfileService();
  }

  /**
   * Process fiat payment with enhanced features
   */
  async processFiatPayment(request: FiatPaymentRequest): Promise<FiatPaymentResult> {
    try {
      // Validate payment request
      await this.validatePaymentRequest(request);

      // Get provider configuration
      const providerConfig = this.PROVIDER_CONFIGS[request.provider];
      if (!providerConfig) {
        throw new Error(`Unsupported payment provider: ${request.provider}`);
      }

      // Calculate fees
      const fees = await this.calculateFees(request);

      // Create payment intent with provider
      const providerResult = await this.createPaymentIntent(request, fees);

      // Process crypto conversion if requested
      let cryptoConversion: CryptoConversionResult | undefined;
      if (request.convertToCrypto) {
        cryptoConversion = await this.processCryptoConversion(request, providerResult);
      }

      // Create transaction record
      const transaction = await this.createTransactionRecord(request, providerResult, fees, cryptoConversion);

      // Generate receipt
      const receipt = await this.generateReceipt(transaction);

      // Send notifications
      await this.sendPaymentNotifications(transaction);

      return {
        transactionId: transaction.id,
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
        status: transaction.status,
        paymentMethodId: request.paymentMethodId,
        provider: request.provider,
        providerTransactionId: providerResult.id,
        fees,
        cryptoConversion,
        receipt,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      };
    } catch (error) {
      safeLogger.error('Enhanced fiat payment processing failed:', error);
      throw error;
    }
  }

  /**
   * Get available payment methods for user
   */
  async getAvailablePaymentMethods(
    userAddress: string,
    amount: number,
    currency: string,
    country?: string
  ): Promise<PaymentMethodSelection> {
    try {
      const availableMethods: PaymentMethodInfo[] = [];
      const restrictions: string[] = [];

      // Get user's saved payment methods
      const savedMethods = await this.getUserPaymentMethods(userAddress);
      availableMethods.push(...savedMethods);

      // Add provider-specific methods based on country and currency
      for (const [providerKey, config] of Object.entries(this.PROVIDER_CONFIGS)) {
        if (!config.supportedCurrencies.includes(currency)) {
          restrictions.push(`${config.name} doesn't support ${currency}`);
          continue;
        }

        if (amount < config.minAmount || amount > config.maxAmount) {
          restrictions.push(`${config.name} amount limits: ${config.minAmount} - ${config.maxAmount} ${currency}`);
          continue;
        }

        // Add generic methods for this provider
        for (const methodType of config.supportedMethods) {
          availableMethods.push({
            id: `${providerKey}_${methodType}`,
            type: methodType as any,
            provider: providerKey,
            name: `${config.name} ${methodType.replace('_', ' ')}`,
            isDefault: false,
            enabled: true,
            country: country || 'US',
            currency,
            verificationStatus: 'verified',
            addedAt: new Date()
          });
        }
      }

      // Determine recommended method
      const recommendedMethod = this.selectRecommendedPaymentMethod(availableMethods, amount, currency);
      const reasoning = this.generateRecommendationReasoning(recommendedMethod, amount, currency);

      return {
        availableMethods,
        recommendedMethod,
        reasoning,
        restrictions
      };
    } catch (error) {
      safeLogger.error('Error getting available payment methods:', error);
      throw error;
    }
  }

  /**
   * Setup new payment method for user
   */
  async setupPaymentMethod(
    userAddress: string,
    provider: string,
    methodType: string,
    methodData: any
  ): Promise<PaymentMethodInfo> {
    try {
      // Validate provider and method type
      const providerConfig = this.PROVIDER_CONFIGS[provider as keyof typeof this.PROVIDER_CONFIGS];
      if (!providerConfig) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      if (!providerConfig.supportedMethods.includes(methodType)) {
        throw new Error(`${provider} doesn't support ${methodType}`);
      }

      // Create payment method with provider
      const providerMethodId = await this.createProviderPaymentMethod(provider, methodType, methodData);

      // Store payment method in database
      const paymentMethod: PaymentMethodInfo = {
        id: providerMethodId,
        type: methodType as any,
        provider,
        name: `${providerConfig.name} ${methodType}`,
        last4: methodData.last4,
        brand: methodData.brand,
        expiryMonth: methodData.expiryMonth,
        expiryYear: methodData.expiryYear,
        isDefault: false,
        enabled: true,
        country: methodData.country || 'US',
        currency: methodData.currency || 'USD',
        verificationStatus: 'verified',
        addedAt: new Date()
      };

      await this.savePaymentMethod(userAddress, paymentMethod);

      return paymentMethod;
    } catch (error) {
      safeLogger.error('Error setting up payment method:', error);
      throw error;
    }
  }

  /**
   * Process crypto conversion after fiat payment
   */
  async processCryptoConversion(
    request: FiatPaymentRequest,
    providerResult: any
  ): Promise<CryptoConversionResult> {
    try {
      if (!request.convertToCrypto) {
        throw new Error('Crypto conversion not requested');
      }

      const { targetToken, targetChain, slippageTolerance, recipientAddress } = request.convertToCrypto;

      // Get exchange rate
      const exchangeRate = await this.exchangeRateService.getExchangeRate(request.currency, targetToken);

      // Calculate conversion amount with slippage
      const baseAmount = request.amount * exchangeRate.rate;
      const slippageAmount = baseAmount * (slippageTolerance / 100);
      const finalAmount = baseAmount - slippageAmount;

      // Calculate conversion fee (0.5% of amount)
      const conversionFee = request.amount * 0.005;

      const conversion: CryptoConversionResult = {
        fromAmount: request.amount,
        fromCurrency: request.currency,
        toAmount: finalAmount.toString(),
        toToken: targetToken,
        toChain: targetChain,
        exchangeRate: exchangeRate.rate,
        slippage: slippageTolerance,
        status: 'pending',
        recipientAddress,
        conversionFee
      };

      // In a real implementation, execute the conversion
      safeLogger.info(`Converting ${request.amount} ${request.currency} to ${finalAmount} ${targetToken}`);
      
      // Simulate conversion completion
      conversion.status = 'completed';
      conversion.transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      return conversion;
    } catch (error) {
      safeLogger.error('Error processing crypto conversion:', error);
      throw error;
    }
  }

  /**
   * Generate payment receipt
   */
  async generateReceipt(transaction: any): Promise<FiatPaymentReceipt> {
    try {
      const receipt: FiatPaymentReceipt = {
        transactionId: transaction.id,
        orderId: transaction.orderId,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: {
          type: transaction.paymentMethodType,
          last4: transaction.paymentMethodLast4,
          brand: transaction.paymentMethodBrand,
          provider: transaction.provider
        },
        fees: transaction.fees,
        timestamp: transaction.createdAt,
        status: transaction.status,
        providerTransactionId: transaction.providerTransactionId,
        cryptoConversion: transaction.cryptoConversion
      };

      // Generate downloadable receipt URL
      receipt.downloadUrl = await this.generateReceiptPDF(receipt);

      return receipt;
    } catch (error) {
      safeLogger.error('Error generating receipt:', error);
      throw error;
    }
  }

  /**
   * Refund fiat payment
   */
  async refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<FiatPaymentResult> {
    try {
      // Get original transaction
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Validate refund amount
      const refundAmount = amount || transaction.amount;
      if (refundAmount > transaction.amount) {
        throw new Error('Refund amount cannot exceed original payment amount');
      }

      // Process refund with provider
      const refundResult = await this.processProviderRefund(transaction, refundAmount, reason);

      // Update transaction status
      transaction.status = FiatPaymentStatus.REFUNDED;
      transaction.updatedAt = new Date();

      // Create refund record
      await this.createRefundRecord(transaction, refundAmount, reason, refundResult);

      // Send notifications
      await this.sendRefundNotifications(transaction, refundAmount);

      return transaction;
    } catch (error) {
      safeLogger.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get payment method selection interface data
   */
  async getPaymentMethodSelectionData(
    userAddress: string,
    amount: number,
    currency: string,
    country?: string
  ): Promise<{
    methods: PaymentMethodSelection;
    fees: Record<string, PaymentFees>;
    limits: Record<string, { min: number; max: number }>;
    processingTimes: Record<string, string>;
  }> {
    try {
      const methods = await this.getAvailablePaymentMethods(userAddress, amount, currency, country);
      
      const fees: Record<string, PaymentFees> = {};
      const limits: Record<string, { min: number; max: number }> = {};
      const processingTimes: Record<string, string> = {};

      // Calculate fees and limits for each provider
      for (const [providerKey, config] of Object.entries(this.PROVIDER_CONFIGS)) {
        fees[providerKey] = {
          processingFee: config.processingFee(amount),
          platformFee: amount * 0.01, // 1% platform fee
          totalFees: config.processingFee(amount) + (amount * 0.01),
          currency
        };

        limits[providerKey] = {
          min: config.minAmount,
          max: config.maxAmount
        };

        processingTimes[providerKey] = config.settlementTime;
      }

      return {
        methods,
        fees,
        limits,
        processingTimes
      };
    } catch (error) {
      safeLogger.error('Error getting payment method selection data:', error);
      throw error;
    }
  }

  // Private helper methods

  private async validatePaymentRequest(request: FiatPaymentRequest): Promise<void> {
    if (!request.orderId || !request.amount || !request.currency || !request.paymentMethodId || !request.userAddress) {
      throw new Error('Missing required fields');
    }

    if (request.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const providerConfig = this.PROVIDER_CONFIGS[request.provider];
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${request.provider}`);
    }

    if (!providerConfig.supportedCurrencies.includes(request.currency)) {
      throw new Error(`${request.provider} doesn't support ${request.currency}`);
    }

    if (request.amount < providerConfig.minAmount || request.amount > providerConfig.maxAmount) {
      throw new Error(`Amount must be between ${providerConfig.minAmount} and ${providerConfig.maxAmount} ${request.currency}`);
    }
  }

  private async calculateFees(request: FiatPaymentRequest): Promise<PaymentFees> {
    const providerConfig = this.PROVIDER_CONFIGS[request.provider];
    const processingFee = providerConfig.processingFee(request.amount);
    const platformFee = request.amount * 0.01; // 1% platform fee
    
    let exchangeFee = 0;
    let conversionFee = 0;

    if (request.convertToCrypto) {
      exchangeFee = request.amount * 0.002; // 0.2% exchange fee
      conversionFee = request.amount * 0.005; // 0.5% conversion fee
    }

    return {
      processingFee,
      platformFee,
      exchangeFee,
      conversionFee,
      totalFees: processingFee + platformFee + exchangeFee + conversionFee,
      currency: request.currency
    };
  }

  private async createPaymentIntent(request: FiatPaymentRequest, fees: PaymentFees): Promise<any> {
    // Mock implementation - in production, use actual provider APIs
    safeLogger.info(`Creating ${request.provider} payment intent for ${request.amount} ${request.currency}`);
    
    return {
      id: `pi_${Math.random().toString(36).substr(2, 9)}`,
      status: 'succeeded',
      amount: request.amount,
      currency: request.currency,
      fees
    };
  }

  private async createTransactionRecord(
    request: FiatPaymentRequest,
    providerResult: any,
    fees: PaymentFees,
    cryptoConversion?: CryptoConversionResult
  ): Promise<any> {
    // Mock transaction record
    return {
      id: `fiat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      status: FiatPaymentStatus.SUCCEEDED,
      provider: request.provider,
      providerTransactionId: providerResult.id,
      paymentMethodId: request.paymentMethodId,
      paymentMethodType: 'card',
      paymentMethodLast4: '4242',
      paymentMethodBrand: 'visa',
      fees,
      cryptoConversion,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async getUserPaymentMethods(userAddress: string): Promise<PaymentMethodInfo[]> {
    // Mock implementation - in production, fetch from database
    return [];
  }

  private selectRecommendedPaymentMethod(
    methods: PaymentMethodInfo[],
    amount: number,
    currency: string
  ): PaymentMethodInfo | undefined {
    // Prefer saved methods
    const savedMethods = methods.filter(m => m.id.includes('pm_'));
    if (savedMethods.length > 0) {
      return savedMethods.find(m => m.isDefault) || savedMethods[0];
    }

    // Prefer card payments for smaller amounts
    if (amount < 100) {
      return methods.find(m => m.type === 'card');
    }

    // Prefer bank transfer for larger amounts
    if (amount > 1000) {
      return methods.find(m => m.type === 'bank_account');
    }

    return methods[0];
  }

  private generateRecommendationReasoning(
    method: PaymentMethodInfo | undefined,
    amount: number,
    currency: string
  ): string[] {
    if (!method) return ['No payment methods available'];

    const reasoning: string[] = [];

    if (method.isDefault) {
      reasoning.push('Your default payment method');
    }

    if (method.type === 'card' && amount < 100) {
      reasoning.push('Cards are ideal for smaller amounts');
    }

    if (method.type === 'bank_account' && amount > 1000) {
      reasoning.push('Bank transfers have lower fees for larger amounts');
    }

    reasoning.push(`Instant processing with ${method.provider}`);

    return reasoning;
  }

  private async createProviderPaymentMethod(provider: string, methodType: string, methodData: any): Promise<string> {
    // Mock implementation
    return `pm_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async savePaymentMethod(userAddress: string, paymentMethod: PaymentMethodInfo): Promise<void> {
    // Mock implementation - in production, save to database
    safeLogger.info(`Saving payment method for ${userAddress}:`, paymentMethod);
  }

  private async generateReceiptPDF(receipt: FiatPaymentReceipt): Promise<string> {
    // Mock implementation - in production, generate actual PDF
    return `https://receipts.example.com/${receipt.transactionId}.pdf`;
  }

  private async getTransaction(transactionId: string): Promise<any> {
    // Mock implementation - in production, fetch from database
    return null;
  }

  private async processProviderRefund(transaction: any, amount: number, reason?: string): Promise<any> {
    // Mock implementation
    return {
      id: `re_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      reason
    };
  }

  private async createRefundRecord(transaction: any, amount: number, reason?: string, refundResult?: any): Promise<void> {
    // Mock implementation
    safeLogger.info(`Creating refund record for ${transaction.id}: ${amount} ${transaction.currency}`);
  }

  private async sendPaymentNotifications(transaction: any): Promise<void> {
    try {
      await this.notificationService.sendOrderNotification(
        transaction.userAddress,
        'PAYMENT_PROCESSED',
        transaction.orderId,
        {
          amount: transaction.amount,
          currency: transaction.currency,
          provider: transaction.provider
        }
      );
    } catch (error) {
      safeLogger.error('Error sending payment notifications:', error);
    }
  }

  private async sendRefundNotifications(transaction: any, amount: number): Promise<void> {
    try {
      await this.notificationService.sendOrderNotification(
        transaction.userAddress,
        'PAYMENT_REFUNDED',
        transaction.orderId,
        {
          amount,
          currency: transaction.currency,
          originalAmount: transaction.amount
        }
      );
    } catch (error) {
      safeLogger.error('Error sending refund notifications:', error);
    }
  }
}
