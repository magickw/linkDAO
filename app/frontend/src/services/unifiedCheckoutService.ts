import { CryptoPaymentService } from './cryptoPaymentService';
import { StripePaymentService } from './stripePaymentService';
import { ExchangeRateService } from './exchangeRateService';
import {
  PrioritizedPaymentMethod,
  PaymentMethodType,
  AvailabilityStatus
} from '../types/paymentPrioritization';

export interface UnifiedCheckoutRequest {
  orderId: string;
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: number;
  currency: string;
  preferredMethod?: 'crypto' | 'fiat' | 'auto';
  userCountry?: string;
}

export interface PrioritizedCheckoutRequest extends UnifiedCheckoutRequest {
  selectedPaymentMethod: PrioritizedPaymentMethod;
  paymentDetails?: {
    // For crypto payments
    walletAddress?: string;
    tokenSymbol?: string;
    networkId?: number;
    
    // For fiat payments
    cardToken?: string;
    billingAddress?: any;
    saveCard?: boolean;
  };
}

export interface CheckoutRecommendation {
  recommendedPath: 'crypto' | 'fiat';
  reason: string;
  cryptoOption: {
    available: boolean;
    token: string;
    fees: number;
    estimatedTime: string;
    benefits: string[];
    requirements: string[];
  };
  fiatOption: {
    available: boolean;
    provider: string;
    fees: number;
    estimatedTime: string;
    benefits: string[];
    requirements: string[];
  };
}

export interface UnifiedCheckoutResult {
  orderId: string;
  paymentPath: 'crypto' | 'fiat';
  escrowType: 'smart_contract' | 'stripe_connect';
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  nextSteps: string[];
  estimatedCompletionTime: Date;
  prioritizationMetadata?: {
    selectedMethod: any;
    priority: number;
    recommendationReason: string;
    costEstimate: any;
    alternativeMethods: any[];
  };
}

export class UnifiedCheckoutService {
  private cryptoPaymentService: CryptoPaymentService;
  private stripePaymentService: StripePaymentService;
  private exchangeRateService: ExchangeRateService;
  private apiBaseUrl: string;

  constructor(
    cryptoPaymentService: CryptoPaymentService,
    stripePaymentService: StripePaymentService
  ) {
    this.cryptoPaymentService = cryptoPaymentService;
    this.stripePaymentService = stripePaymentService;
    this.exchangeRateService = new ExchangeRateService();
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  /**
   * Get checkout recommendations with hybrid path analysis
   */
  async getCheckoutRecommendation(request: UnifiedCheckoutRequest): Promise<CheckoutRecommendation> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/hybrid-payment/recommend-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to get payment recommendation');
      }

      const { data } = await response.json();

      // Transform backend response to frontend format
      return {
        recommendedPath: data.selectedPath,
        reason: data.reason,
        cryptoOption: {
          available: data.selectedPath === 'crypto' || data.fallbackOptions.some((f: any) => f.selectedPath === 'crypto'),
          token: data.method.tokenSymbol || 'USDC',
          fees: data.selectedPath === 'crypto' ? data.fees.totalFees : 0,
          estimatedTime: data.selectedPath === 'crypto' ? data.estimatedTime : '1-5 minutes',
          benefits: [
            'Lower fees (≈$0.50)',
            'Decentralized escrow',
            'Trustless transactions',
            'No intermediaries'
          ],
          requirements: [
            'Sufficient crypto balance',
            'Gas fees (~$0.01-0.05)',
            'Wallet connection'
          ]
        },
        fiatOption: {
          available: data.selectedPath === 'fiat' || data.fallbackOptions.some((f: any) => f.selectedPath === 'fiat'),
          provider: 'Stripe',
          fees: data.selectedPath === 'fiat' ? data.fees.totalFees : (request.amount * 0.039) + 0.30,
          estimatedTime: 'Instant',
          benefits: [
            'Instant processing',
            'Familiar payment methods',
            'No crypto knowledge needed',
            'Buyer protection included'
          ],
          requirements: [
            'Valid payment method',
            'KYC verification (if required)'
          ]
        }
      };
    } catch (error) {
      console.error('Error getting checkout recommendation:', error);
      
      // Return default recommendation on error
      return {
        recommendedPath: 'fiat',
        reason: 'Defaulting to fiat due to recommendation error',
        cryptoOption: {
          available: false,
          token: 'USDC',
          fees: 0,
          estimatedTime: '1-5 minutes',
          benefits: [],
          requirements: ['Unable to check crypto availability']
        },
        fiatOption: {
          available: true,
          provider: 'Stripe',
          fees: (request.amount * 0.039) + 0.30,
          estimatedTime: 'Instant',
          benefits: ['Reliable fallback option'],
          requirements: ['Valid payment method']
        }
      };
    }
  }

  /**
   * Process checkout with prioritized payment method
   */
  async processPrioritizedCheckout(request: PrioritizedCheckoutRequest): Promise<UnifiedCheckoutResult> {
    try {
      const { selectedPaymentMethod, paymentDetails } = request;
      
      // Determine payment path based on selected method
      const paymentPath = this.getPaymentPathFromMethod(selectedPaymentMethod.method.type);
      
      // Validate payment method availability
      await this.validatePaymentMethodAvailability(selectedPaymentMethod);
      
      // Process payment based on method type
      let result: UnifiedCheckoutResult;
      
      if (paymentPath === 'crypto') {
        result = await this.processCryptoPayment(request);
      } else {
        result = await this.processFiatPayment(request);
      }
      
      // Add prioritization metadata to result
      result.prioritizationMetadata = {
        selectedMethod: selectedPaymentMethod.method,
        priority: selectedPaymentMethod.priority,
        recommendationReason: selectedPaymentMethod.recommendationReason,
        costEstimate: selectedPaymentMethod.costEstimate,
        alternativeMethods: [] // Could include other available methods
      };
      
      return result;
    } catch (error) {
      console.error('Prioritized checkout failed:', error);
      throw error;
    }
  }

  /**
   * Process unified checkout (legacy method)
   */
  async processCheckout(request: UnifiedCheckoutRequest): Promise<UnifiedCheckoutResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/hybrid-payment/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Checkout failed');
      }

      const { data } = await response.json();

      // Transform backend response
      const result: UnifiedCheckoutResult = {
        orderId: data.orderId,
        paymentPath: data.paymentPath,
        escrowType: data.escrowType,
        transactionId: data.escrowId || data.stripePaymentIntentId || 'unknown',
        status: data.status,
        nextSteps: this.generateNextSteps(data),
        estimatedCompletionTime: new Date(data.estimatedCompletionTime)
      };

      return result;
    } catch (error) {
      console.error('Unified checkout failed:', error);
      throw error;
    }
  }

  /**
   * Get unified order status
   */
  async getOrderStatus(orderId: string): Promise<{
    orderId: string;
    status: string;
    paymentPath: 'crypto' | 'fiat';
    progress: {
      step: number;
      totalSteps: number;
      currentStep: string;
      nextStep?: string;
    };
    actions: {
      canConfirmDelivery: boolean;
      canReleaseFunds: boolean;
      canDispute: boolean;
      canCancel: boolean;
    };
    timeline: Array<{
      timestamp: Date;
      event: string;
      description: string;
      status: 'completed' | 'pending' | 'failed';
    }>;
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/hybrid-payment/orders/${orderId}/status`);

      if (!response.ok) {
        throw new Error('Failed to get order status');
      }

      const { data } = await response.json();

      // Transform to frontend format with progress tracking
      const progress = this.calculateOrderProgress(data);
      const timeline = this.generateOrderTimeline(data);

      return {
        orderId: data.orderId,
        status: data.status,
        paymentPath: data.paymentPath,
        progress,
        actions: {
          canConfirmDelivery: data.canConfirmDelivery,
          canReleaseFunds: data.canReleaseFunds,
          canDispute: data.canDispute,
          canCancel: data.status === 'pending' || data.status === 'created'
        },
        timeline
      };
    } catch (error) {
      console.error('Error getting order status:', error);
      throw error;
    }
  }

  /**
   * Confirm delivery for any payment path
   */
  async confirmDelivery(orderId: string, deliveryInfo: any): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/hybrid-payment/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'confirm_delivery',
          metadata: deliveryInfo
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Delivery confirmation failed');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      throw error;
    }
  }

  /**
   * Release funds for any payment path
   */
  async releaseFunds(orderId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/hybrid-payment/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'release_funds'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fund release failed');
      }
    } catch (error) {
      console.error('Error releasing funds:', error);
      throw error;
    }
  }

  /**
   * Open dispute for any payment path
   */
  async openDispute(orderId: string, reason: string, evidence?: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/hybrid-payment/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'dispute',
          metadata: {
            reason,
            evidence,
            initiatorAddress: this.cryptoPaymentService ? await this.getConnectedAddress() : null
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Dispute opening failed');
      }
    } catch (error) {
      console.error('Error opening dispute:', error);
      throw error;
    }
  }

  /**
   * Get payment method comparison
   */
  async getPaymentMethodComparison(
    buyerAddress: string,
    amount: number,
    currency: string,
    userCountry?: string
  ): Promise<{
    crypto: any;
    fiat: any;
    recommendation: string;
  }> {
    try {
      const params = new URLSearchParams({
        buyerAddress,
        amount: amount.toString(),
        currency,
        ...(userCountry && { userCountry })
      });

      const response = await fetch(`${this.apiBaseUrl}/api/hybrid-payment/comparison?${params}`);

      if (!response.ok) {
        throw new Error('Failed to get payment comparison');
      }

      const { data } = await response.json();
      
      return {
        ...data,
        recommendation: data.crypto.fees < data.fiat.fees ? 
          'Crypto recommended for lower fees' : 
          'Fiat recommended for convenience'
      };
    } catch (error) {
      console.error('Error getting payment comparison:', error);
      throw error;
    }
  }

  // Private helper methods

  private getPaymentPathFromMethod(methodType: PaymentMethodType): 'crypto' | 'fiat' {
    switch (methodType) {
      case PaymentMethodType.FIAT_STRIPE:
        return 'fiat';
      case PaymentMethodType.STABLECOIN_USDC:
      case PaymentMethodType.STABLECOIN_USDT:
      case PaymentMethodType.NATIVE_ETH:
        return 'crypto';
      default:
        return 'fiat'; // Default fallback
    }
  }

  private async validatePaymentMethodAvailability(method: PrioritizedPaymentMethod): Promise<void> {
    if (method.availabilityStatus !== AvailabilityStatus.AVAILABLE) {
      throw new Error(`Payment method ${method.method.name} is not available: ${method.availabilityStatus}`);
    }

    if (method.warnings && method.warnings.length > 0) {
      console.warn('Payment method warnings:', method.warnings);
    }
  }

  private async processCryptoPayment(request: PrioritizedCheckoutRequest): Promise<UnifiedCheckoutResult> {
    const { selectedPaymentMethod, paymentDetails } = request;
    
    // Prepare crypto payment request
    const cryptoRequest = {
      ...request,
      tokenSymbol: selectedPaymentMethod.method.token?.symbol || 'ETH',
      networkId: selectedPaymentMethod.method.chainId || 1,
      walletAddress: paymentDetails?.walletAddress || request.buyerAddress
    };

    // Call existing crypto payment processing
    const response = await fetch(`${this.apiBaseUrl}/api/hybrid-payment/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...cryptoRequest,
        preferredMethod: 'crypto',
        paymentMethodDetails: {
          type: selectedPaymentMethod.method.type,
          tokenAddress: selectedPaymentMethod.method.token?.address,
          chainId: selectedPaymentMethod.method.chainId
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Crypto payment failed');
    }

    const { data } = await response.json();
    return this.transformBackendResponse(data);
  }

  private async processFiatPayment(request: PrioritizedCheckoutRequest): Promise<UnifiedCheckoutResult> {
    const { selectedPaymentMethod, paymentDetails } = request;
    
    // Prepare fiat payment request
    const fiatRequest = {
      ...request,
      cardToken: paymentDetails?.cardToken,
      billingAddress: paymentDetails?.billingAddress,
      saveCard: paymentDetails?.saveCard || false
    };

    // Call existing fiat payment processing
    const response = await fetch(`${this.apiBaseUrl}/api/hybrid-payment/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...fiatRequest,
        preferredMethod: 'fiat',
        paymentMethodDetails: {
          type: selectedPaymentMethod.method.type,
          provider: 'stripe'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fiat payment failed');
    }

    const { data } = await response.json();
    return this.transformBackendResponse(data);
  }

  private transformBackendResponse(data: any): UnifiedCheckoutResult {
    return {
      orderId: data.orderId,
      paymentPath: data.paymentPath,
      escrowType: data.escrowType,
      transactionId: data.escrowId || data.stripePaymentIntentId || 'unknown',
      status: data.status,
      nextSteps: this.generateNextSteps(data),
      estimatedCompletionTime: new Date(data.estimatedCompletionTime)
    };
  }

  private generateNextSteps(checkoutResult: any): string[] {
    const steps: string[] = [];

    if (checkoutResult.paymentPath === 'crypto') {
      if (checkoutResult.status === 'pending') {
        steps.push('Complete wallet transaction to fund escrow');
        steps.push('Wait for blockchain confirmation (1-5 minutes)');
      } else if (checkoutResult.status === 'processing') {
        steps.push('Wait for seller to ship your item');
        steps.push('You will be notified when item ships');
      }
    } else {
      if (checkoutResult.status === 'processing') {
        steps.push('Payment processed successfully');
        steps.push('Funds held securely until delivery');
        steps.push('Wait for seller to ship your item');
      }
    }

    steps.push('Confirm delivery when you receive the item');
    steps.push('Funds will be released to seller automatically');

    return steps;
  }

  private calculateOrderProgress(orderData: any): {
    step: number;
    totalSteps: number;
    currentStep: string;
    nextStep?: string;
  } {
    const steps = [
      'Order Created',
      'Payment Processed',
      'Item Shipped',
      'Delivery Confirmed',
      'Order Completed'
    ];

    let currentStepIndex = 0;

    switch (orderData.status) {
      case 'created':
      case 'pending':
        currentStepIndex = 0;
        break;
      case 'processing':
      case 'paid':
        currentStepIndex = 1;
        break;
      case 'shipped':
        currentStepIndex = 2;
        break;
      case 'delivered':
        currentStepIndex = 3;
        break;
      case 'completed':
        currentStepIndex = 4;
        break;
      default:
        currentStepIndex = 0;
    }

    return {
      step: currentStepIndex + 1,
      totalSteps: steps.length,
      currentStep: steps[currentStepIndex],
      nextStep: currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : undefined
    };
  }

  private generateOrderTimeline(orderData: any): Array<{
    timestamp: Date;
    event: string;
    description: string;
    status: 'completed' | 'pending' | 'failed';
  }> {
    const timeline: Array<{
      timestamp: Date;
      event: string;
      description: string;
      status: 'completed' | 'pending' | 'failed';
    }> = [
      {
        timestamp: new Date(),
        event: 'Order Created',
        description: `Order created with ${orderData.paymentPath} payment`,
        status: 'completed'
      }
    ];

    if (orderData.paymentPath === 'crypto' && orderData.escrowStatus) {
      if (orderData.escrowStatus.fundsLocked) {
        timeline.push({
          timestamp: new Date(Date.now() - 60000),
          event: 'Escrow Funded',
          description: 'Funds locked in smart contract escrow',
          status: 'completed'
        });
      }
    } else if (orderData.paymentPath === 'fiat' && orderData.stripeStatus) {
      timeline.push({
        timestamp: new Date(Date.now() - 30000),
        event: 'Payment Processed',
        description: 'Fiat payment processed and held in escrow',
        status: 'completed'
      });
    }

    // Add pending steps
    if (orderData.status !== 'completed') {
      timeline.push({
        timestamp: new Date(Date.now() + 3600000), // 1 hour from now
        event: 'Awaiting Shipment',
        description: 'Waiting for seller to ship item',
        status: 'pending'
      });
    }

    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async getConnectedAddress(): Promise<string> {
    // In a real implementation, get from wallet connection
    return '0x1234567890123456789012345678901234567890';
  }
}