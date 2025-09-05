import { SellerProfile, SellerDashboardStats, SellerNotification, SellerOrder, SellerListing, SellerAnalytics, OnboardingStep, SellerTier } from '../types/seller';

class SellerService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Seller Tiers Configuration
  getSellerTiers(): SellerTier[] {
    return [
      {
        id: 'anonymous',
        name: 'Anonymous Browser',
        description: 'Browse and view listings without registration',
        requirements: [],
        benefits: ['View all listings', 'Browse categories', 'Search products'],
        limitations: ['Cannot purchase', 'Cannot sell', 'No saved favorites']
      },
      {
        id: 'basic',
        name: 'Basic Seller',
        description: 'Wallet-only seller for digital goods and NFTs',
        requirements: ['Connected wallet'],
        benefits: [
          'List digital goods & NFTs',
          'Receive crypto payments',
          'Basic reputation system',
          'Community participation'
        ],
        limitations: [
          'Escrow required for all sales',
          'No physical goods',
          'Limited dispute priority',
          'Reputation starts at 0'
        ]
      },
      {
        id: 'verified',
        name: 'Verified Seller',
        description: 'Enhanced seller with email/phone verification',
        requirements: ['Connected wallet', 'Email verification', 'Phone verification (optional)'],
        benefits: [
          'Sell physical goods',
          'Higher escrow limits',
          'Priority dispute resolution',
          'Enhanced profile visibility',
          'Customer communication tools'
        ],
        limitations: [
          'KYC required for fiat withdrawals',
          'Subject to platform policies'
        ]
      },
      {
        id: 'pro',
        name: 'Pro Seller',
        description: 'Full-featured seller with KYC and fiat integration',
        requirements: ['Connected wallet', 'Email & phone verified', 'KYC completed'],
        benefits: [
          'Fiat withdrawal options',
          'Higher reputation multiplier',
          'DAO "Verified Vendor" badge',
          'Advanced analytics',
          'Bulk listing tools',
          'Priority customer support'
        ],
        limitations: [
          'Subject to tax reporting',
          'Enhanced compliance requirements'
        ]
      }
    ];
  }

  // Onboarding Flow
  async getOnboardingSteps(walletAddress: string): Promise<OnboardingStep[]> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/seller/onboarding/${walletAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch onboarding steps');
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: [...] }
      // We need to return the data array
      return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      console.error('Error fetching onboarding steps:', error);
      // Return default onboarding steps if there's an error
      return [
        {
          id: 'wallet-connect',
          title: 'Connect Wallet',
          description: 'Connect your Web3 wallet to get started',
          component: 'WalletConnect',
          required: true,
          completed: true // Assumed completed if we're here
        },
        {
          id: 'profile-setup',
          title: 'Profile Setup',
          description: 'Set up your seller profile and store information',
          component: 'ProfileSetup',
          required: true,
          completed: false
        },
        {
          id: 'verification',
          title: 'Verification',
          description: 'Verify your email and phone for enhanced features',
          component: 'Verification',
          required: false,
          completed: false
        },
        {
          id: 'payout-setup',
          title: 'Payout Setup',
          description: 'Configure your payment preferences',
          component: 'PayoutSetup',
          required: true,
          completed: false
        },
        {
          id: 'first-listing',
          title: 'Create First Listing',
          description: 'Create your first product listing',
          component: 'FirstListing',
          required: true,
          completed: false
        }
      ];
    }
  }

  async updateOnboardingStep(walletAddress: string, stepId: string, data: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/onboarding/${walletAddress}/${stepId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update onboarding step');
    }
    
    // Parse the response to ensure it's successful
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to update onboarding step');
    }
  }

  // Seller Profile Management
  async getSellerProfile(walletAddress: string): Promise<SellerProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/seller/profile/${walletAddress}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch seller profile');
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: {...} }
      // We need to return the data object
      return result.data || null;
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      return null;
    }
  }

  async createSellerProfile(profileData: Partial<SellerProfile>): Promise<SellerProfile> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create seller profile');
    }
    
    const result = await response.json();
    // The backend returns { success: true, data: {...} }
    // We need to return the data object
    return result.data;
  }

  async updateSellerProfile(walletAddress: string, updates: Partial<SellerProfile>): Promise<SellerProfile> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/profile/${walletAddress}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update seller profile');
    }
    
    const result = await response.json();
    // The backend returns { success: true, data: {...} }
    // We need to return the data object
    return result.data;
  }

  // Dashboard Data
  async getDashboardStats(walletAddress: string): Promise<SellerDashboardStats> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/seller/dashboard/${walletAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: {...} }
      // We need to return the data object
      return result.data || {};
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return mock data for development
      return {
        sales: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          total: 0,
        },
        orders: {
          pending: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          disputed: 0,
        },
        listings: {
          active: 0,
          draft: 0,
          sold: 0,
          expired: 0,
        },
        balance: {
          crypto: {},
          fiatEquivalent: 0,
          pendingEscrow: 0,
          availableWithdraw: 0,
        },
        reputation: {
          score: 0,
          trend: 'stable',
          recentReviews: 0,
          averageRating: 0,
        },
      };
    }
  }

  // Notifications
  async getNotifications(walletAddress: string): Promise<SellerNotification[]> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/seller/notifications/${walletAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: [...] }
      // We need to return the data array
      return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to mark notification as read');
    }
  }

  // Orders Management
  async getOrders(walletAddress: string, status?: string): Promise<SellerOrder[]> {
    const url = new URL(`${this.baseUrl}/marketplace/seller/orders/${walletAddress}`);
    if (status) {
      url.searchParams.append('status', status);
    }
    
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: [...] }
      // We need to return the data array
      return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: string, data?: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, ...data }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update order status');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to update order status');
    }
  }

  async addTrackingNumber(orderId: string, trackingNumber: string, carrier: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/orders/${orderId}/tracking`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trackingNumber, carrier }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add tracking number');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to add tracking number');
    }
  }

  // Listings Management
  async getListings(walletAddress: string, status?: string): Promise<SellerListing[]> {
    const url = new URL(`${this.baseUrl}/marketplace/seller/listings/${walletAddress}`);
    if (status) {
      url.searchParams.append('status', status);
    }
    
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: [...] }
      // We need to return the data array
      return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      console.error('Error fetching listings:', error);
      return [];
    }
  }

  async createListing(walletAddress: string, listingData: Partial<SellerListing>): Promise<SellerListing> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...listingData, sellerAddress: walletAddress }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create listing');
    }
    
    const result = await response.json();
    // The backend returns { success: true, data: {...} }
    // We need to return the data object
    return result.data;
  }

  async updateListing(listingId: string, updates: Partial<SellerListing>): Promise<SellerListing> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/listings/${listingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update listing');
    }
    
    const result = await response.json();
    // The backend returns { success: true, data: {...} }
    // We need to return the data object
    return result.data;
  }

  async deleteListing(listingId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/listings/${listingId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete listing');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete listing');
    }
  }

  // Analytics
  async getAnalytics(walletAddress: string, period: string = '30d'): Promise<SellerAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/api/seller/analytics/${walletAddress}?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Return mock data for development
      return {
        overview: {
          totalRevenue: 0,
          totalOrders: 0,
          conversionRate: 0,
          averageOrderValue: 0,
        },
        sales: {
          daily: [],
          byCategory: [],
          byProduct: [],
        },
        buyers: {
          demographics: {
            countries: [],
            walletTypes: [],
          },
          behavior: {
            repeatCustomers: 0,
            averageOrdersPerCustomer: 0,
            customerLifetimeValue: 0,
          },
        },
        reputation: {
          ratingHistory: [],
          reviewSentiment: {
            positive: 0,
            neutral: 0,
            negative: 0,
          },
          badges: [],
        },
      };
    }
  }

  // Verification
  async sendEmailVerification(email: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/verification/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send email verification');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to send email verification');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/verification/email/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to verify email');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to verify email');
    }
  }

  async sendPhoneVerification(phone: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/verification/phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send phone verification');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to send phone verification');
    }
  }

  async verifyPhone(phone: string, code: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/marketplace/seller/verification/phone/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, code }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to verify phone');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to verify phone');
    }
  }

  // KYC
  async submitKYC(walletAddress: string, kycData: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/seller/kyc/${walletAddress}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(kycData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit KYC');
    }
  }

  async getKYCStatus(walletAddress: string): Promise<{ status: string; documents: string[] }> {
    const response = await fetch(`${this.baseUrl}/api/seller/kyc/${walletAddress}`);
    if (!response.ok) {
      throw new Error('Failed to fetch KYC status');
    }
    return response.json();
  }

  // Payments & Withdrawals
  async getPaymentHistory(walletAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/seller/payments/${walletAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  async requestWithdrawal(walletAddress: string, amount: number, currency: string, method: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/seller/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress, amount, currency, method }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to request withdrawal');
    }
  }

  // Disputes
  async getDisputes(walletAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/seller/disputes/${walletAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch disputes');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching disputes:', error);
      return [];
    }
  }

  async respondToDispute(disputeId: string, response: string, evidence?: string[]): Promise<void> {
    const apiResponse = await fetch(`${this.baseUrl}/api/seller/disputes/${disputeId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ response, evidence }),
    });
    
    if (!apiResponse.ok) {
      throw new Error('Failed to respond to dispute');
    }
  }
}

export const sellerService = new SellerService();