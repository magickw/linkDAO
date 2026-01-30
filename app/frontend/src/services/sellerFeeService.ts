const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export interface SellerFeeCharge {
  id: string;
  sellerWalletAddress: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'charged' | 'failed' | 'waived';
  chargeId?: string;
  paymentMethodId?: string;
  failureReason?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface SellerBalance {
  walletAddress: string;
  availableRevenue: number;
  pendingRevenue: number;
  totalRevenue: number;
  stripeCustomerId?: string;
}

class SellerFeeService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth-token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  /**
   * Check if seller has sufficient balance for a fee
   */
  async checkSellerBalance(requiredAmount: number): Promise<{
    hasSufficientBalance: boolean;
    availableBalance: number;
    pendingBalance: number;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/seller/balance`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ requiredAmount })
      });

      if (!response.ok) {
        throw new Error('Failed to check seller balance');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error checking seller balance:', error);
      throw error;
    }
  }

  /**
   * Get seller's fee charge history
   */
  async getFeeCharges(limit: number = 50, offset: number = 0): Promise<SellerFeeCharge[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/seller/fee-charges?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch fee charges');
      }

      const result = await response.json();
      return result.data.map((charge: any) => ({
        ...charge,
        createdAt: new Date(charge.createdAt),
        processedAt: charge.processedAt ? new Date(charge.processedAt) : undefined
      }));
    } catch (error) {
      console.error('Error fetching fee charges:', error);
      throw error;
    }
  }

  /**
   * Charge seller for fees when balance is insufficient
   */
  async chargeSellerFees(amount: number, reason: string, metadata?: Record<string, string>): Promise<SellerFeeCharge> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/seller/fee-charges`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ amount, reason, metadata })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to charge seller fees');
      }

      const result = await response.json();
      const charge = result.data;
      
      return {
        ...charge,
        createdAt: new Date(charge.createdAt),
        processedAt: charge.processedAt ? new Date(charge.processedAt) : undefined
      };
    } catch (error) {
      console.error('Error charging seller fees:', error);
      throw error;
    }
  }

  /**
   * Get seller's current balance
   */
  async getSellerBalance(): Promise<SellerBalance> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/seller/balance`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch seller balance');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching seller balance:', error);
      throw error;
    }
  }

  /**
   * Format currency amount for display
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Get reason description for display
   */
  getReasonDescription(reason: string): string {
    const descriptions: Record<string, string> = {
      'listing_fee': 'Listing Creation Fee',
      'premium_features': 'Premium Features Fee',
      'subscription': 'Subscription Fee',
      'boost_listing': 'Listing Boost Fee',
      'featured_placement': 'Featured Placement Fee'
    };
    
    return descriptions[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

export const sellerFeeService = new SellerFeeService();