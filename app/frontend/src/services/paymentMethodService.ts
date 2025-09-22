/**
 * Secure Payment Method Service
 * Handles encrypted storage and tokenization of payment methods
 */

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'crypto';
  nickname: string;
  isDefault: boolean;
  // Tokenized/encrypted data - never store raw payment info
  token: string;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodInput {
  type: 'card' | 'bank' | 'crypto';
  nickname: string;
  isDefault?: boolean;
  // Sensitive data that will be tokenized
  cardNumber?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  accountNumber?: string;
  routingNumber?: string;
  walletAddress?: string;
}

class PaymentMethodService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
  }

  /**
   * Get user's saved payment methods (returns tokenized data only)
   */
  async getPaymentMethods(userAddress: string): Promise<PaymentMethod[]> {
    const response = await fetch(`${this.baseUrl}/api/payment-methods/${userAddress}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment methods');
    }

    const data = await response.json();
    return data.paymentMethods || [];
  }

  /**
   * Add new payment method (tokenizes sensitive data)
   */
  async addPaymentMethod(userAddress: string, paymentData: CreatePaymentMethodInput): Promise<PaymentMethod> {
    const response = await fetch(`${this.baseUrl}/api/payment-methods`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        userAddress,
        ...paymentData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to add payment method');
    }

    const data = await response.json();
    return data.paymentMethod;
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(paymentMethodId: string, updates: Partial<CreatePaymentMethodInput>): Promise<PaymentMethod> {
    const response = await fetch(`${this.baseUrl}/api/payment-methods/${paymentMethodId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update payment method');
    }

    const data = await response.json();
    return data.paymentMethod;
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete payment method');
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(userAddress: string, paymentMethodId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/payment-methods/${paymentMethodId}/set-default`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userAddress }),
    });

    if (!response.ok) {
      throw new Error('Failed to set default payment method');
    }
  }

  /**
   * Process payment using stored payment method
   */
  async processPayment(paymentMethodId: string, amount: string, currency: string, orderId: string): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/payments/process`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        paymentMethodId,
        amount,
        currency,
        orderId,
      }),
    });

    const data = await response.json();
    return data;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }
}

export const paymentMethodService = new PaymentMethodService();
export default paymentMethodService;