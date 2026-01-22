/**
 * Comprehensive Checkout Service
 * Handles the complete checkout flow with Web3 and traditional payment integration
 */

import {
  UnifiedCheckoutService,
  UnifiedCheckoutRequest,
  PrioritizedCheckoutRequest,
  CheckoutRecommendation
} from './unifiedCheckoutService';
import { CryptoPaymentService } from './cryptoPaymentService';
import { StripePaymentService } from './stripePaymentService';
import { PaymentMethodPrioritizationService } from './paymentMethodPrioritizationService';
import { CostEffectivenessCalculator } from './costEffectivenessCalculator';
import { NetworkAvailabilityChecker } from './networkAvailabilityChecker';
import { UserPreferenceManager } from './userPreferenceManager';
import { CartItem } from './cartService';
import { getTokenAddress } from '../config/tokenAddresses';
import {
  PrioritizationResult,
  PrioritizationContext,
  PaymentMethodType
} from '../types/paymentPrioritization';

export interface CheckoutSession {
  sessionId: string;
  orderId: string;
  items: CartItem[];
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    platformFee: number;
    total: number;
  };
  paymentMethod?: 'crypto' | 'fiat' | 'x402';
  recommendation?: CheckoutRecommendation;
  prioritizationResult?: PrioritizationResult;
  expiresAt: Date;
}

export interface CheckoutResult {
  success: boolean;
  orderId: string;
  paymentPath: 'crypto' | 'fiat' | 'x402';
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  redirectUrl?: string;
  nextSteps: string[];
  estimatedCompletionTime: Date;
  error?: string;
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface PaymentDetails {
  // For crypto payments
  walletAddress?: string;
  tokenSymbol?: string;
  networkId?: number;

  // For fiat payments
  cardToken?: string;
  billingAddress?: ShippingAddress;
  saveCard?: boolean;
}

export class CheckoutService {
  private unifiedCheckoutService: UnifiedCheckoutService;
  private prioritizationService: PaymentMethodPrioritizationService;
  private apiBaseUrl: string;

  constructor() {
    const cryptoService = new CryptoPaymentService();
    const stripeService = new StripePaymentService();
    this.unifiedCheckoutService = new UnifiedCheckoutService(cryptoService, stripeService);

    // Initialize prioritization service
    const costCalculator = new CostEffectivenessCalculator();
    const networkChecker = new NetworkAvailabilityChecker();
    const preferenceManager = new UserPreferenceManager();
    this.prioritizationService = new PaymentMethodPrioritizationService(
      costCalculator,
      networkChecker,
      preferenceManager
    );

    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  /**
   * Create a new checkout session
   */
  async createCheckoutSession(items: CartItem[], userAddress?: string): Promise<CheckoutSession> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/checkout/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            name: item.title,
            price: item.price.fiat,
            quantity: item.quantity,
            sellerId: item.seller.id,
            metadata: {
              image: item.image,
              description: item.description
            }
          })),
          userAddress,
          currency: 'USD'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { data } = await response.json();

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price.fiat) * item.quantity), 0);
      const shipping = this.calculateShipping(items);
      const tax = this.calculateTax(subtotal, shipping);
      const platformFee = subtotal * 0.125; // 12.5% platform fee
      const total = subtotal + shipping + tax + platformFee;

      const session: CheckoutSession = {
        sessionId: data.sessionId,
        orderId: data.orderId,
        items,
        totals: {
          subtotal,
          shipping,
          tax,
          platformFee,
          total
        },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };

      // Get payment recommendations
      if (userAddress) {
        const request: UnifiedCheckoutRequest = {
          orderId: session.orderId,
          listingId: items[0]?.id || '',
          buyerAddress: userAddress,
          sellerAddress: items[0]?.seller.id || '',
          amount: total,
          currency: 'USD',
          preferredMethod: 'auto'
        };

        session.recommendation = await this.unifiedCheckoutService.getCheckoutRecommendation(request);

        // Get prioritized payment methods
        session.prioritizationResult = await this.getPrioritizedPaymentMethods(
          total,
          userAddress
        );
      }

      return session;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  /**
   * Process checkout with prioritized payment method
   */
  async processPrioritizedCheckout(request: PrioritizedCheckoutRequest): Promise<CheckoutResult> {
    try {
      // Use the unified checkout service's prioritized method
      const result = await this.unifiedCheckoutService.processPrioritizedCheckout(request);

      // Transform to CheckoutResult format
      return {
        success: true,
        orderId: result.orderId,
        paymentPath: result.paymentPath,
        transactionId: result.transactionId,
        status: result.status as any,
        redirectUrl: undefined,
        nextSteps: result.nextSteps,
        estimatedCompletionTime: result.estimatedCompletionTime
      };
    } catch (error: any) {
      console.error('Prioritized checkout processing failed:', error);

      return {
        success: false,
        orderId: request.orderId,
        paymentPath: request.selectedPaymentMethod.method.type === PaymentMethodType.FIAT_STRIPE ? 'fiat' : 'crypto',
        transactionId: '',
        status: 'failed',
        nextSteps: ['Please try again or contact support'],
        estimatedCompletionTime: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Process checkout with selected payment method (legacy)
   */
  async processCheckout(
    session: CheckoutSession,
    paymentMethod: 'crypto' | 'fiat',
    paymentDetails: PaymentDetails,
    shippingAddress: ShippingAddress
  ): Promise<CheckoutResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/checkout/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          orderId: session.orderId,
          paymentMethod,
          paymentDetails,
          shippingAddress,
          totals: session.totals
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Checkout failed');
      }

      const { data } = await response.json();

      const result: CheckoutResult = {
        success: true,
        orderId: data.orderId,
        paymentPath: data.paymentPath,
        transactionId: data.transactionId,
        status: data.status,
        redirectUrl: data.redirectUrl,
        nextSteps: this.generateNextSteps(data),
        estimatedCompletionTime: new Date(data.estimatedCompletionTime),
      };

      return result;
    } catch (error: any) {
      console.error('Checkout processing failed:', error);

      return {
        success: false,
        orderId: session.orderId,
        paymentPath: paymentMethod,
        transactionId: '',
        status: 'failed',
        nextSteps: ['Please try again or contact support'],
        estimatedCompletionTime: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Validate checkout session
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/checkout/session/${sessionId}/validate`);
      return response.ok;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Get checkout session details
   */
  async getSession(sessionId: string): Promise<CheckoutSession | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/checkout/session/${sessionId}`);

      if (!response.ok) {
        return null;
      }

      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Get prioritized payment methods for checkout
   */
  async getPrioritizedPaymentMethods(
    amount: number,
    userAddress?: string
  ): Promise<PrioritizationResult> {
    try {
      const context: PrioritizationContext = {
        transactionAmount: amount,
        transactionCurrency: 'USD',
        userContext: {
          userAddress,
          chainId: 1, // Default to Ethereum mainnet
          walletBalances: [], // Should be fetched from wallet
          preferences: {
            preferredMethods: [],
            avoidedMethods: [],
            maxGasFeeThreshold: 50,
            preferStablecoins: true,
            preferFiat: false,
            lastUsedMethods: [],
            autoSelectBestOption: true
          }
        },
        availablePaymentMethods: await this.getAvailablePaymentMethods(),
        marketConditions: await this.getCurrentMarketConditions()
      };

      return await this.prioritizationService.prioritizePaymentMethods(context);
    } catch (error) {
      console.error('Failed to get prioritized payment methods:', error);
      // Return fallback prioritization
      return {
        prioritizedMethods: [],
        defaultMethod: null,
        recommendations: [],
        warnings: [],
        metadata: {
          calculatedAt: new Date(),
          totalMethodsEvaluated: 0,
          averageConfidence: 0,
          processingTimeMs: 0
        }
      };
    }
  }

  /**
   * Get available payment methods
   */
  private async getAvailablePaymentMethods() {
    // Mock implementation - should be replaced with actual service calls
    const chainId = 1; // Ethereum mainnet

    return [
      {
        id: 'usdc-eth',
        type: PaymentMethodType.STABLECOIN_USDC,
        name: 'USDC',
        description: 'USD Coin on Ethereum',
        chainId,
        enabled: true,
        supportedNetworks: [1],
        token: {
          address: getTokenAddress('USDC', chainId), // Use correct USDC address for the chain
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          chainId
        }
      },
      {
        id: 'stripe-fiat',
        type: PaymentMethodType.FIAT_STRIPE,
        name: 'Credit/Debit Card',
        description: 'Traditional payment via Stripe',
        chainId: 0,
        enabled: true,
        supportedNetworks: []
      },
      {
        id: 'eth-mainnet',
        type: PaymentMethodType.NATIVE_ETH,
        name: 'Ethereum',
        description: 'Native ETH on Ethereum',
        chainId: 1,
        enabled: true,
        supportedNetworks: [1],
        token: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          decimals: 18,
          name: 'Ethereum',
          chainId: 1,
          isNative: true
        }
      }
    ];
  }

  /**
   * Get current market conditions
   */
  private async getCurrentMarketConditions() {
    // Mock implementation - should be replaced with actual market data
    return {
      gasConditions: [
        {
          chainId: 1,
          gasPrice: BigInt(30000000000), // 30 gwei in wei
          gasPriceUSD: 0.50,
          networkCongestion: 'medium' as const,
          blockTime: 12,
          lastUpdated: new Date()
        }
      ],
      networkAvailability: [
        {
          chainId: 1,
          available: true
        }
      ],
      exchangeRates: [
        {
          fromToken: 'ETH',
          toToken: 'USD',
          rate: 2000,
          source: 'coingecko',
          confidence: 0.95,
          lastUpdated: new Date()
        },
        {
          fromToken: 'USDC',
          toToken: 'USD',
          rate: 1,
          source: 'coingecko',
          confidence: 0.99,
          lastUpdated: new Date()
        }
      ],
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate shipping costs
   */
  private calculateShipping(items: CartItem[]): number {
    // Simple shipping calculation - can be enhanced with real shipping APIs
    const totalWeight = items.reduce((weight, item) => weight + (item.quantity * 0.5), 0); // Assume 0.5 lbs per item

    if (totalWeight === 0) return 0; // Digital items
    if (totalWeight <= 1) return 5.99;
    if (totalWeight <= 5) return 9.99;
    if (totalWeight <= 10) return 14.99;

    return 19.99;
  }

  /**
   * Calculate tax
   */
  private calculateTax(subtotal: number, shipping: number): number {
    // Simple tax calculation - should be enhanced with real tax APIs
    const taxableAmount = subtotal + shipping;
    const taxRate = 0.08; // 8% tax rate
    return taxableAmount * taxRate;
  }

  /**
   * Generate next steps based on checkout result
   */
  private generateNextSteps(checkoutResult: any): string[] {
    const steps: string[] = [];

    if (checkoutResult.paymentPath === 'crypto') {
      switch (checkoutResult.status) {
        case 'pending':
          steps.push('Complete wallet transaction to fund escrow');
          steps.push('Wait for blockchain confirmation (1-5 minutes)');
          steps.push('You will receive an email confirmation once payment is confirmed');
          break;
        case 'processing':
          steps.push('Payment confirmed and funds locked in escrow');
          steps.push('Seller has been notified to prepare your order');
          steps.push('You will be notified when your order ships');
          break;
        case 'completed':
          steps.push('Payment completed successfully');
          steps.push('Your order is being prepared for shipment');
          break;
      }
    } else {
      switch (checkoutResult.status) {
        case 'pending':
          steps.push('Complete payment authorization');
          steps.push('Your card will be charged once order ships');
          break;
        case 'processing':
          steps.push('Payment authorized and funds reserved');
          steps.push('Seller has been notified to prepare your order');
          steps.push('You will be notified when your order ships');
          break;
        case 'completed':
          steps.push('Payment completed successfully');
          steps.push('Your order is being prepared for shipment');
          break;
      }
    }

    // Common steps
    steps.push('Track your order progress in the Orders section');
    steps.push('Confirm delivery when you receive your items');
    steps.push('Funds will be released to seller after delivery confirmation');

    return steps;
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string) {
    return this.unifiedCheckoutService.getOrderStatus(orderId);
  }

  /**
   * Confirm delivery
   */
  async confirmDelivery(orderId: string, deliveryInfo: any) {
    return this.unifiedCheckoutService.confirmDelivery(orderId, deliveryInfo);
  }

  /**
   * Release funds
   */
  async releaseFunds(orderId: string) {
    return this.unifiedCheckoutService.releaseFunds(orderId);
  }

  /**
   * Open dispute
   */
  async openDispute(orderId: string, reason: string, evidence?: string[]) {
    return this.unifiedCheckoutService.openDispute(orderId, reason, evidence);
  }

  /**
   * Cancel order (if possible)
   */
  async cancelOrder(orderId: string, reason: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  }

  /**
   * Get user's order history
   */
  async getUserOrders(userAddress: string, limit = 50, offset = 0) {
    try {
      const params = new URLSearchParams({
        userAddress,
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`${this.apiBaseUrl}/api/orders?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get user orders:', error);
      throw error;
    }
  }

  /**
   * Estimate checkout fees for different payment methods
   */
  async estimateCheckoutFees(amount: number, paymentMethod: 'crypto' | 'fiat') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/checkout/estimate-fees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, paymentMethod })
      });

      if (!response.ok) {
        throw new Error('Failed to estimate fees');
      }

      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to estimate fees:', error);
      throw error;
    }
  }

  /**
   * Validate shipping address
   */
  async validateShippingAddress(address: ShippingAddress): Promise<{
    valid: boolean;
    suggestions?: ShippingAddress[];
    errors?: string[];
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/checkout/validate-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(address)
      });

      if (!response.ok) {
        return { valid: false, errors: ['Address validation service unavailable'] };
      }

      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Address validation failed:', error);
      return { valid: false, errors: ['Address validation failed'] };
    }
  }

  /**
   * Apply discount code
   */
  async applyDiscountCode(sessionId: string, code: string): Promise<{
    valid: boolean;
    discount?: {
      type: 'percentage' | 'fixed';
      value: number;
      description: string;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/checkout/discount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, code })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { valid: false, error: errorData.message };
      }

      const { data } = await response.json();
      return { valid: true, discount: data };
    } catch (error) {
      console.error('Failed to apply discount:', error);
      return { valid: false, error: 'Failed to apply discount code' };
    }
  }
}

export default CheckoutService;