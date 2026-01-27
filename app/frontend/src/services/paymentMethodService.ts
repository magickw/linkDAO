import { API_BASE_URL } from '@/config/api';

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
  private baseUrl = `${API_BASE_URL}/api`;

  constructor() {
    // baseUrl is initialized above
  }

  /**
   * Get user's saved payment methods (returns tokenized data only)
   */
  async getPaymentMethods(userAddress: string): Promise<PaymentMethod[]> {
    try {
      // Use the payment history endpoint to get payment methods
      const response = await fetch(`${this.baseUrl}/enhanced-fiat-payment/history/${userAddress}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        // Try to parse a body if available to extract any partial data
        try {
          const data = await response.json().catch(() => null);
          if (data?.paymentMethods && Array.isArray(data.paymentMethods)) {
            return data.paymentMethods as PaymentMethod[];
          }
        } catch {
          // ignore JSON parse errors
        }
        // Fallback gracefully with empty list (development/demo resilience)
        return [];
      }

      const data = await response.json();
      // Transform payment history to payment methods if needed
      return data.paymentHistory ? this.transformPaymentHistoryToPaymentMethods(data.paymentHistory) : [];
    } catch (err) {
      // Network or CORS error — return an empty list to avoid crashing UI
      console.error('Error fetching payment methods:', err);
      return [];
    }
  }

  /**
   * Create a SetupIntent for saving a card
   */
  async createSetupIntent(): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/create-setup-intent`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({}), // Customer ID is inferred from auth token/user address in backend
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      const data = await response.json();
      return data.clientSecret;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  /**
   * Add new payment method (uses Stripe PaymentMethod ID)
   */
  async addPaymentMethod(userAddress: string, paymentMethodId: string, nickname?: string): Promise<PaymentMethod> {
    try {
      const response = await fetch(`${this.baseUrl}/enhanced-fiat-payment/setup-method`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          userAddress,
          provider: 'stripe',
          methodType: 'card',
          methodData: {
            paymentMethodId,
            nickname
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Return a payment method object based on the response
      return {
        id: data.data?.id || `pm_${Date.now()}`,
        type: 'card',
        nickname: nickname || data.data?.name || 'Card',
        isDefault: false,
        token: paymentMethodId,
        lastFour: data.data?.last4,
        expiryMonth: data.data?.expiryMonth,
        expiryYear: data.data?.expiryYear,
        brand: data.data?.brand,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('Error adding payment method:', err);
      throw err;
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(paymentMethodId: string, updates: Partial<CreatePaymentMethodInput>): Promise<PaymentMethod> {
    try {
      // Since the backend doesn't have a direct update endpoint, we'll use the setup-method endpoint
      // to update the payment method data
      const response = await fetch(`${this.baseUrl}/enhanced-fiat-payment/setup-method`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          methodId: paymentMethodId,
          updates: updates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        id: data.id || paymentMethodId,
        type: updates.type || 'card',
        nickname: updates.nickname || 'Updated Payment Method',
        isDefault: updates.isDefault || false,
        token: data.token || `token_${paymentMethodId}`,
        lastFour: updates.cardNumber ? updates.cardNumber.slice(-4) : '****',
        expiryMonth: updates.expiryMonth,
        expiryYear: updates.expiryYear,
        brand: data.brand || 'Visa',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('Error updating payment method:', err);
      throw err;
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      // Since there's no direct delete endpoint, we'll make a request to handle this
      // This would need to be implemented in the backend with a proper delete endpoint
      const response = await fetch(`${this.baseUrl}/enhanced-fiat-payment/methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error('Error deleting payment method:', err);
      throw err;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(userAddress: string, paymentMethodId: string): Promise<void> {
    try {
      // Since there's no direct set default endpoint in the routes provided, 
      // we'll make an update request to change the default status
      const response = await fetch(`${this.baseUrl}/enhanced-fiat-payment/setup-method`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          userAddress,
          methodId: paymentMethodId,
          isDefault: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error('Error setting default payment method:', err);
      throw err;
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
    // Use the x402-payments endpoint for processing payments
    const response = await fetch(`${this.baseUrl}/x402-payments/payment`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        orderId,
        amount,
        currency,
        paymentMethodId, // This would need to be mapped to the actual parameters the backend expects
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        transactionId: data.data?.transactionId || `txn_${Date.now()}`
      };
    } else {
      return {
        success: false,
        error: data.error || 'Payment processing failed'
      };
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? (
      localStorage.getItem('linkdao_access_token') || 
      localStorage.getItem('token') || 
      localStorage.getItem('authToken') || 
      localStorage.getItem('auth_token')
    ) : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }
  
  private transformTransactionsToPaymentMethods(transactions: any[]): PaymentMethod[] {
    // Extract unique payment methods from transaction history
    const paymentMethodsMap = new Map<string, PaymentMethod>();
    
    transactions.forEach(transaction => {
      if (transaction.paymentMethod) {
        const key = `${transaction.paymentMethod.type}-${transaction.paymentMethod.lastFour}`;
        if (!paymentMethodsMap.has(key)) {
          paymentMethodsMap.set(key, {
            id: `pm_${transaction.paymentMethod.type}_${transaction.paymentMethod.lastFour}`,
            type: transaction.paymentMethod.type,
            nickname: transaction.paymentMethod.nickname || `${transaction.paymentMethod.type} ending in ${transaction.paymentMethod.lastFour}`,
            isDefault: transaction.paymentMethod.isDefault || false,
            token: transaction.paymentMethod.token,
            lastFour: transaction.paymentMethod.lastFour,
            expiryMonth: transaction.paymentMethod.expiryMonth,
            expiryYear: transaction.paymentMethod.expiryYear,
            brand: transaction.paymentMethod.brand,
            createdAt: transaction.paymentMethod.createdAt || new Date().toISOString(),
            updatedAt: transaction.paymentMethod.updatedAt || new Date().toISOString()
          });
        }
      }
    });
    
    return Array.from(paymentMethodsMap.values());
  }
  
  private transformPaymentHistoryToPaymentMethods(paymentHistory: any[]): PaymentMethod[] {
    // Extract unique payment methods from payment history
    const paymentMethodsMap = new Map<string, PaymentMethod>();
    
    paymentHistory.forEach(payment => {
      if (payment.methodType) {
        const key = `${payment.methodType}-${payment.last4 || payment.methodId}`;
        if (!paymentMethodsMap.has(key)) {
          paymentMethodsMap.set(key, {
            id: payment.methodId || `pm_${payment.methodType}_${payment.last4 || 'unknown'}`,
            type: payment.methodType,
            nickname: payment.nickname || `${payment.methodType} ending in ${payment.last4 || '****'}`,
            isDefault: payment.isDefault || false,
            token: payment.token || payment.providerMethodId,
            lastFour: payment.last4,
            expiryMonth: payment.expiryMonth,
            expiryYear: payment.expiryYear,
            brand: payment.brand,
            createdAt: payment.createdAt || new Date().toISOString(),
            updatedAt: payment.updatedAt || new Date().toISOString()
          });
        }
      }
    });
    
    return Array.from(paymentMethodsMap.values());
  }
}

export const paymentMethodService = new PaymentMethodService();
export default paymentMethodService;