import { 
  SellerProfile, 
  SellerDashboardStats, 
  SellerNotification, 
  SellerOrder, 
  SellerListing, 
  OnboardingStep, 
  SellerAnalytics,
  SellerProfileUpdateRequest,
  SellerProfileUpdateResponse,
  ENSValidationResult
} from '../types/seller';
import { 
  SellerTier, 
  TierProgress, 
  TierUpgradeInfo 
} from '../types/sellerTier';

// Standardized API endpoint pattern using `/api/marketplace/seller` base
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
const SELLER_API_BASE = `${BACKEND_API_BASE_URL}/api/marketplace/seller`;

interface SellerAPIEndpoints {
  // Profile endpoints
  getProfile: (walletAddress: string) => string;
  updateProfile: (walletAddress: string) => string;
  createProfile: () => string;
  updateProfileEnhanced: (walletAddress: string) => string;
  
  // Onboarding endpoints
  getOnboardingSteps: (walletAddress: string) => string;
  updateOnboardingStep: (walletAddress: string, stepId: string) => string;
  
  // Dashboard endpoints
  getDashboard: (walletAddress: string) => string;
  getAnalytics: (walletAddress: string) => string;
  
  // Listings endpoints
  getListings: (walletAddress: string) => string;
  createListing: () => string;
  updateListing: (listingId: string) => string;
  deleteListing: (listingId: string) => string;
  
  // Orders endpoints
  getOrders: (walletAddress: string) => string;
  updateOrderStatus: (orderId: string) => string;
  addTrackingNumber: (orderId: string) => string;
  
  // Notifications endpoints
  getNotifications: (walletAddress: string) => string;
  markNotificationRead: (notificationId: string) => string;
  
  // ENS endpoints
  validateENS: () => string;
  verifyENSOwnership: () => string;
  
  // Verification endpoints
  sendEmailVerification: () => string;
  verifyEmail: () => string;
  sendPhoneVerification: () => string;
  verifyPhone: () => string;
  
  // KYC endpoints
  submitKYC: (walletAddress: string) => string;
  getKYCStatus: (walletAddress: string) => string;
  
  // Payment endpoints
  getPaymentHistory: (walletAddress: string) => string;
  requestWithdrawal: () => string;
  
  // Dispute endpoints
  getDisputes: (walletAddress: string) => string;
  respondToDispute: (disputeId: string) => string;
  
  // Tier endpoints
  getSellerTier: (walletAddress: string) => string;
  getTierProgress: (walletAddress: string) => string;
  getTierUpgradeEligibility: (walletAddress: string) => string;
  refreshTierData: (walletAddress: string) => string;
  
  // Automated tier upgrade endpoints
  getTierProgressionTracking: (walletAddress: string) => string;
  triggerTierEvaluation: () => string;
  getTierCriteria: () => string;
  getTierEvaluationHistory: (walletAddress: string) => string;
  getTierUpgradeNotifications: (walletAddress: string) => string;
}

// Unified error types for seller system
export enum SellerErrorType {
  API_ERROR = 'API_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
}

export class SellerAPIError extends Error {
  constructor(
    public type: SellerErrorType,
    public message: string,
    public code?: string,
    public details?: any,
    public status?: number
  ) {
    super(message);
    this.name = 'SellerAPIError';
  }
}

// Unified API client with consistent error handling
export class UnifiedSellerAPIClient {
  private baseURL = SELLER_API_BASE;
  
  // Standardized endpoint patterns
  private endpoints: SellerAPIEndpoints = {
    // Profile endpoints
    getProfile: (walletAddress: string) => `${this.baseURL}/${walletAddress}`,
    updateProfile: (walletAddress: string) => `${this.baseURL}/${walletAddress}`,
    createProfile: () => `${this.baseURL}/profile`,
    updateProfileEnhanced: (walletAddress: string) => `${this.baseURL}/${walletAddress}/enhanced`,
    
    // Onboarding endpoints
    getOnboardingSteps: (walletAddress: string) => `${this.baseURL}/onboarding/${walletAddress}`,
    updateOnboardingStep: (walletAddress: string, stepId: string) => `${this.baseURL}/onboarding/${walletAddress}/${stepId}`,
    
    // Dashboard endpoints
    getDashboard: (walletAddress: string) => `${this.baseURL}/dashboard/${walletAddress}`,
    getAnalytics: (walletAddress: string) => `${this.baseURL}/analytics/${walletAddress}`,
    
    // Listings endpoints
    getListings: (walletAddress: string) => `${this.baseURL}/listings/${walletAddress}`,
    createListing: () => `${this.baseURL}/listings`,
    updateListing: (listingId: string) => `${this.baseURL}/listings/${listingId}`,
    deleteListing: (listingId: string) => `${this.baseURL}/listings/${listingId}`,
    
    // Orders endpoints
    getOrders: (walletAddress: string) => `${this.baseURL}/orders/${walletAddress}`,
    updateOrderStatus: (orderId: string) => `${this.baseURL}/orders/${orderId}/status`,
    addTrackingNumber: (orderId: string) => `${this.baseURL}/orders/${orderId}/tracking`,
    
    // Notifications endpoints
    getNotifications: (walletAddress: string) => `${this.baseURL}/notifications/${walletAddress}`,
    markNotificationRead: (notificationId: string) => `${this.baseURL}/notifications/${notificationId}/read`,
    
    // ENS endpoints
    validateENS: () => `${this.baseURL}/ens/validate`,
    verifyENSOwnership: () => `${this.baseURL}/ens/verify-ownership`,
    
    // Verification endpoints
    sendEmailVerification: () => `${this.baseURL}/verification/email`,
    verifyEmail: () => `${this.baseURL}/verification/email/verify`,
    sendPhoneVerification: () => `${this.baseURL}/verification/phone`,
    verifyPhone: () => `${this.baseURL}/verification/phone/verify`,
    
    // KYC endpoints
    submitKYC: (walletAddress: string) => `${this.baseURL}/kyc/${walletAddress}`,
    getKYCStatus: (walletAddress: string) => `${this.baseURL}/kyc/${walletAddress}`,
    
    // Payment endpoints
    getPaymentHistory: (walletAddress: string) => `${this.baseURL}/payments/${walletAddress}`,
    requestWithdrawal: () => `${this.baseURL}/withdraw`,
    
    // Dispute endpoints
    getDisputes: (walletAddress: string) => `${this.baseURL}/disputes/${walletAddress}`,
    respondToDispute: (disputeId: string) => `${this.baseURL}/disputes/${disputeId}/respond`,
    
    // Tier endpoints
    getSellerTier: (walletAddress: string) => `${this.baseURL}/${walletAddress}/tier`,
    getTierProgress: (walletAddress: string) => `${this.baseURL}/${walletAddress}/tier/progress`,
    getTierUpgradeEligibility: (walletAddress: string) => `${this.baseURL}/${walletAddress}/tier/upgrade-eligibility`,
    refreshTierData: (walletAddress: string) => `${this.baseURL}/${walletAddress}/tier/refresh`,
    
    // Automated tier upgrade endpoints
    getTierProgressionTracking: (walletAddress: string) => `/api/marketplace/seller/tier/progression/${walletAddress}`,
    triggerTierEvaluation: () => `/api/marketplace/seller/tier/evaluate`,
    getTierCriteria: () => `/api/marketplace/seller/tier/criteria`,
    getTierEvaluationHistory: (walletAddress: string) => `/api/marketplace/seller/tier/history/${walletAddress}`,
    getTierUpgradeNotifications: (walletAddress: string) => `/api/marketplace/seller/tier/notifications/${walletAddress}`,
  };

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      // Get authentication token if available
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      // Get wallet address for authentication
      const walletAddress = localStorage.getItem('linkdao_wallet_address');
      
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(walletAddress ? { 'X-Wallet-Address': walletAddress } : {}),
          ...options?.headers,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new SellerAPIError(
          this.getErrorType(response.status),
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code,
          errorData,
          response.status
        );
      }
      
      const result = await response.json();
      
      // Handle backend response format { success: true, data: ... }
      if (result.success === false) {
        throw new SellerAPIError(
          SellerErrorType.API_ERROR,
          result.message || 'API request failed',
          result.code,
          result
        );
      }
      
      return result.success ? result.data : result;
    } catch (error) {
      if (error instanceof SellerAPIError) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new SellerAPIError(
          SellerErrorType.NETWORK_ERROR,
          'Network error: Unable to connect to the server',
          'NETWORK_ERROR',
          error
        );
      }
      
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  async requestWithFormData<T>(endpoint: string, formData: FormData, options?: Omit<RequestInit, 'body'>): Promise<T> {
    try {
      // Get authentication token if available
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      // Get wallet address for authentication
      const walletAddress = localStorage.getItem('linkdao_wallet_address');
      
      const response = await fetch(endpoint, {
        ...options,
        method: 'PUT',
        body: formData,
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(walletAddress ? { 'X-Wallet-Address': walletAddress } : {}),
          ...options?.headers,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new SellerAPIError(
          this.getErrorType(response.status),
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code,
          errorData,
          response.status
        );
      }
      
      const result = await response.json();
      
      if (result.success === false) {
        throw new SellerAPIError(
          SellerErrorType.API_ERROR,
          result.message || 'API request failed',
          result.code,
          result
        );
      }
      
      return result.success ? result.data : result;
    } catch (error) {
      if (error instanceof SellerAPIError) {
        throw error;
      }
      
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  private getErrorType(status: number): SellerErrorType {
    if (status >= 400 && status < 500) {
      return status === 403 ? SellerErrorType.PERMISSION_ERROR : SellerErrorType.VALIDATION_ERROR;
    }
    if (status >= 500) {
      return SellerErrorType.API_ERROR;
    }
    return SellerErrorType.API_ERROR;
  }

  // Profile API methods
  async getProfile(walletAddress: string): Promise<SellerProfile | null> {
    try {
      return await this.request<SellerProfile>(this.endpoints.getProfile(walletAddress));
    } catch (error) {
      if (error instanceof SellerAPIError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createProfile(profileData: Partial<SellerProfile>): Promise<SellerProfile> {
    return await this.request<SellerProfile>(this.endpoints.createProfile(), {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async updateProfile(walletAddress: string, updates: Partial<SellerProfile>): Promise<SellerProfile> {
    return await this.request<SellerProfile>(this.endpoints.updateProfile(walletAddress), {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateProfileEnhanced(walletAddress: string, updates: SellerProfileUpdateRequest): Promise<SellerProfileUpdateResponse> {
    const formData = new FormData();
    
    // Add text fields
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'profileImage' && key !== 'coverImage' && value !== undefined) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    
    // Add image files
    if (updates.profileImage) {
      formData.append('profileImage', updates.profileImage);
    }
    if (updates.coverImage) {
      formData.append('coverImage', updates.coverImage);
    }

    return await this.requestWithFormData<SellerProfileUpdateResponse>(
      this.endpoints.updateProfileEnhanced(walletAddress),
      formData
    );
  }

  // Onboarding API methods
  async getOnboardingSteps(walletAddress: string): Promise<OnboardingStep[]> {
    return await this.request<OnboardingStep[]>(this.endpoints.getOnboardingSteps(walletAddress));
  }

  async updateOnboardingStep(walletAddress: string, stepId: string, data: any): Promise<void> {
    // The backend expects { completed: true } in the request body
    // We send the data as well for storage, but ensure completed is set to true
    await this.request<void>(this.endpoints.updateOnboardingStep(walletAddress, stepId), {
      method: 'PUT',
      body: JSON.stringify({
        completed: true
      }),
    });
  }

  // Dashboard API methods
  async getDashboardStats(walletAddress: string): Promise<SellerDashboardStats> {
    return await this.request<SellerDashboardStats>(this.endpoints.getDashboard(walletAddress));
  }

  async getAnalytics(walletAddress: string, period: string = '30d'): Promise<SellerAnalytics> {
    const url = `${this.endpoints.getAnalytics(walletAddress)}?period=${period}`;
    return await this.request<SellerAnalytics>(url);
  }

  // Listings API methods
  async getListings(walletAddress: string, status?: string): Promise<SellerListing[]> {
    const url = status 
      ? `${this.endpoints.getListings(walletAddress)}?status=${status}`
      : this.endpoints.getListings(walletAddress);
    return await this.request<SellerListing[]>(url);
  }

  async createListing(walletAddress: string, listingData: Partial<SellerListing>): Promise<SellerListing> {
    return await this.request<SellerListing>(this.endpoints.createListing(), {
      method: 'POST',
      body: JSON.stringify({ ...listingData, sellerWalletAddress: walletAddress }),
    });
  }

  async updateListing(listingId: string, updates: Partial<SellerListing>): Promise<SellerListing> {
    return await this.request<SellerListing>(this.endpoints.updateListing(listingId), {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteListing(listingId: string): Promise<void> {
    await this.request<void>(this.endpoints.deleteListing(listingId), {
      method: 'DELETE',
    });
  }

  // Orders API methods
  async getOrders(walletAddress: string, status?: string): Promise<SellerOrder[]> {
    const url = status 
      ? `${this.endpoints.getOrders(walletAddress)}?status=${status}`
      : this.endpoints.getOrders(walletAddress);
    return await this.request<SellerOrder[]>(url);
  }

  async updateOrderStatus(orderId: string, status: string, data?: any): Promise<void> {
    await this.request<void>(this.endpoints.updateOrderStatus(orderId), {
      method: 'PUT',
      body: JSON.stringify({ status, ...data }),
    });
  }

  async addTrackingNumber(orderId: string, trackingNumber: string, carrier: string): Promise<void> {
    await this.request<void>(this.endpoints.addTrackingNumber(orderId), {
      method: 'PUT',
      body: JSON.stringify({ trackingNumber, carrier }),
    });
  }

  // Notifications API methods
  async getNotifications(walletAddress: string): Promise<SellerNotification[]> {
    return await this.request<SellerNotification[]>(this.endpoints.getNotifications(walletAddress));
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.request<void>(this.endpoints.markNotificationRead(notificationId), {
      method: 'PUT',
    });
  }

  // ENS API methods
  async validateENS(ensHandle: string): Promise<ENSValidationResult> {
    return await this.request<ENSValidationResult>(this.endpoints.validateENS(), {
      method: 'POST',
      body: JSON.stringify({ ensHandle }),
    });
  }

  async verifyENSOwnership(ensHandle: string, walletAddress: string): Promise<boolean> {
    try {
      const result = await this.request<{ isOwned: boolean }>(this.endpoints.verifyENSOwnership(), {
        method: 'POST',
        body: JSON.stringify({ ensHandle, walletAddress }),
      });
      return result.isOwned;
    } catch (error) {
      console.error('Error verifying ENS ownership:', error);
      return false;
    }
  }

  // Verification API methods
  async sendEmailVerification(email: string): Promise<void> {
    await this.request<void>(this.endpoints.sendEmailVerification(), {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyEmail(token: string): Promise<void> {
    await this.request<void>(this.endpoints.verifyEmail(), {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async sendPhoneVerification(phone: string): Promise<void> {
    await this.request<void>(this.endpoints.sendPhoneVerification(), {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyPhone(phone: string, code: string): Promise<void> {
    await this.request<void>(this.endpoints.verifyPhone(), {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  // KYC API methods
  async submitKYC(walletAddress: string, kycData: any): Promise<void> {
    await this.request<void>(this.endpoints.submitKYC(walletAddress), {
      method: 'POST',
      body: JSON.stringify(kycData),
    });
  }

  async getKYCStatus(walletAddress: string): Promise<{ status: string; documents: string[] }> {
    return await this.request<{ status: string; documents: string[] }>(this.endpoints.getKYCStatus(walletAddress));
  }

  // Payment API methods
  async getPaymentHistory(walletAddress: string): Promise<any[]> {
    return await this.request<any[]>(this.endpoints.getPaymentHistory(walletAddress));
  }

  async requestWithdrawal(walletAddress: string, amount: number, currency: string, method: string): Promise<void> {
    await this.request<void>(this.endpoints.requestWithdrawal(), {
      method: 'POST',
      body: JSON.stringify({ walletAddress, amount, currency, method }),
    });
  }

  // Dispute API methods
  async getDisputes(walletAddress: string): Promise<any[]> {
    return await this.request<any[]>(this.endpoints.getDisputes(walletAddress));
  }

  async respondToDispute(disputeId: string, response: string, evidence?: string[]): Promise<void> {
    await this.request<void>(this.endpoints.respondToDispute(disputeId), {
      method: 'POST',
      body: JSON.stringify({ response, evidence }),
    });
  }

  // Tier API methods
  async getSellerTier(walletAddress: string): Promise<SellerTier> {
    return await this.request<SellerTier>(this.endpoints.getSellerTier(walletAddress));
  }

  async getTierProgress(walletAddress: string): Promise<TierProgress> {
    return await this.request<TierProgress>(this.endpoints.getTierProgress(walletAddress));
  }

  async getTierUpgradeEligibility(walletAddress: string): Promise<TierUpgradeInfo> {
    return await this.request<TierUpgradeInfo>(this.endpoints.getTierUpgradeEligibility(walletAddress));
  }

  async refreshTierData(walletAddress: string): Promise<void> {
    await this.request<void>(this.endpoints.refreshTierData(walletAddress), {
      method: 'POST',
    });
  }

  // Automated tier upgrade API methods
  async getTierProgressionTracking(walletAddress: string): Promise<any> {
    return await this.request<any>(this.endpoints.getTierProgressionTracking(walletAddress));
  }

  async triggerTierEvaluation(walletAddress: string, force: boolean = false): Promise<any> {
    return await this.request<any>(this.endpoints.triggerTierEvaluation(), {
      method: 'POST',
      body: JSON.stringify({ walletAddress, force }),
    });
  }

  async getTierCriteria(): Promise<any> {
    return await this.request<any>(this.endpoints.getTierCriteria());
  }

  async getTierEvaluationHistory(walletAddress: string): Promise<any> {
    return await this.request<any>(this.endpoints.getTierEvaluationHistory(walletAddress));
  }

  async getTierUpgradeNotifications(walletAddress: string): Promise<any> {
    return await this.request<any>(this.endpoints.getTierUpgradeNotifications(walletAddress));
  }
}

// Export singleton instance
export const unifiedSellerAPIClient = new UnifiedSellerAPIClient();