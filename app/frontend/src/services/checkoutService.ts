/**
 * Comprehensive Checkout Service
 * Handles the complete checkout flow with Web3 and traditional payment integration
 */

import { UnifiedCheckoutService, UnifiedCheckoutRequest, CheckoutRecommendation } from './unifiedCheckoutService';
import { CryptoPaymentService } from './cryptoPaymentService';
import { StripePaymentService } from './stripePaymentService';
import { CartItem } from './cartService';

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
  paymentMethod?: 'crypto' | 'fiat';
  recommendation?: CheckoutRecommendation;
  expiresAt: Date;
}

export interface CheckoutResult {
  success: boolean;
  orderId: string;
  paymentPath: 'crypto' | 'fiat';
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
  private apiBaseUrl: string;

  constructor() {
    const cryptoService = new CryptoPaymentService();
    const stripeService = new StripePaymentService();
    this.unifiedCheckoutService = new UnifiedCheckoutService(cryptoService, stripeService);
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
      const platformFee = subtotal * 0.025; // 2.5% platform fee
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
      }

      return session;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  /**
   * Process checkout with selected payment method
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