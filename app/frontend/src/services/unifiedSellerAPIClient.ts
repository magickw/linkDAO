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
import { enhancedAuthService } from './enhancedAuthService';

// Standardized API endpoint pattern using `/api/marketplace/seller` base
// Always use the full backend URL to avoid relative path issues

/**
 * Get the backend URL with defensive fallback logic
 * This ensures the correct URL is used even if environment variables are missing
 */
const getBackendURL = (): string => {
  // Check environment variables first
  const envURL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

  if (envURL) {
    console.log('[SellerAPI] Using backend URL from environment:', envURL);
    return envURL;
  }

  // Fallback logic for production (when environment variables are not set)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Production domains - use api.linkdao.io
    if (hostname === 'linkdao.io' || hostname === 'www.linkdao.io' || hostname === 'app.linkdao.io') {
      console.log('[SellerAPI] Detected production domain, using https://api.linkdao.io');
      return 'https://api.linkdao.io';
    }

    // Vercel preview deployments - use api.linkdao.io
    if (hostname.includes('vercel.app')) {
      console.log('[SellerAPI] Detected Vercel deployment, using https://api.linkdao.io');
      return 'https://api.linkdao.io';
    }
  }

  // Local development fallback
  console.log('[SellerAPI] Using local development URL');
  return 'http://localhost:10000';
};

const USE_API_ROUTES = process.env.NEXT_PUBLIC_USE_API_ROUTES === 'true' || typeof window !== 'undefined';
const BACKEND_API_BASE_URL = getBackendURL();
const SELLER_API_BASE = `${BACKEND_API_BASE_URL}/api/marketplace/seller`;

// Log the final URL being used (helpful for debugging)
console.log('[SellerAPI] Initialized with base URL:', SELLER_API_BASE);

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
  getListingById: (listingId: string) => string;
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
    getListingById: (listingId: string) => `${this.baseURL}/listings/detail/${listingId}`,
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
    getTierProgressionTracking: (walletAddress: string) => `${this.baseURL}/tier/progression/${walletAddress}`,
    triggerTierEvaluation: () => `${this.baseURL}/tier/evaluate`,
    getTierCriteria: () => `${this.baseURL}/tier/criteria`,
    getTierEvaluationHistory: (walletAddress: string) => `${this.baseURL}/tier/history/${walletAddress}`,
    getTierUpgradeNotifications: (walletAddress: string) => `${this.baseURL}/tier/notifications/${walletAddress}`,
  };

  async request<T>(endpoint: string, options?: RequestInit, requireAuth: boolean = true): Promise<T> {
    try {
      // Log the request for debugging (especially useful in production)
      console.log('[SellerAPI] Request:', {
        endpoint,
        method: options?.method || 'GET',
        baseURL: this.baseURL,
        requireAuth
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      // Add authentication headers only if required
      if (requireAuth) {
        // Use enhancedAuthService for consistent authentication
        const authHeaders = enhancedAuthService.getAuthHeaders();
        Object.assign(headers, authHeaders);

        // Get wallet address for authentication
        const walletAddress = localStorage.getItem('linkdao_wallet_address');
        if (walletAddress) {
          headers['X-Wallet-Address'] = walletAddress;
        }

        // Debug logging for authentication
        const hasAuthToken = headers['Authorization'] && headers['Authorization'] !== 'Bearer null';
        console.log('[SellerAPI] Auth check:', {
          hasAuthToken,
          tokenPreview: hasAuthToken ? headers['Authorization']?.substring(0, 25) + '...' : 'none',
          hasWalletAddress: !!walletAddress,
          isAuthenticated: enhancedAuthService.isAuthenticated()
        });

        // If no auth token, throw a clear error before making the request
        if (!hasAuthToken) {
          throw new SellerAPIError(
            SellerErrorType.PERMISSION_ERROR,
            'Please sign in to perform this action. Connect your wallet and authenticate.',
            'MISSING_AUTH',
            { requireAuth: true },
            401
          );
        }
      }

      const response = await fetch(endpoint, {
        ...options,
        headers: {
          ...headers,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // If JSON parsing fails, use the raw text as message
              errorData = { message: errorText };
            }
          } else {
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (readError) {
          // If we can't read the response, provide a generic error
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        throw new SellerAPIError(
          this.getErrorType(response.status),
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code,
          errorData,
          response.status
        );
      }

      // For successful responses, check if there's content to parse
      const responseText = await response.text();
      if (!responseText) {
        return {} as T;
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        // If JSON parsing fails, return the raw text
        throw new SellerAPIError(
          SellerErrorType.API_ERROR,
          `Invalid JSON response: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`,
          'INVALID_JSON_RESPONSE',
          { responseText }
        );
      }

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
      const token = localStorage.getItem('linkdao_access_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken');

      // Get wallet address for authentication
      const walletAddress = localStorage.getItem('linkdao_wallet_address');

      const response = await fetch(endpoint, {
        ...options,
        method: 'POST', // Changed from PUT to POST for form data
        body: formData,
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(walletAddress ? { 'X-Wallet-Address': walletAddress } : {}),
          ...options?.headers,
        },
      });

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // If JSON parsing fails, use the raw text as message
              errorData = { message: errorText };
            }
          } else {
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (readError) {
          // If we can't read the response, provide a generic error
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        throw new SellerAPIError(
          this.getErrorType(response.status),
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code,
          errorData,
          response.status
        );
      }

      // For successful responses, check if there's content to parse
      const responseText = await response.text();
      if (!responseText) {
        return {} as T;
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        // If JSON parsing fails, return the raw text
        throw new SellerAPIError(
          SellerErrorType.API_ERROR,
          `Invalid JSON response: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`,
          'INVALID_JSON_RESPONSE',
          { responseText }
        );
      }

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
      return await this.request<SellerProfile>(this.endpoints.getProfile(walletAddress), undefined, false);
    } catch (error) {
      if (error instanceof SellerAPIError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createProfile(walletAddress: string | undefined, profileData: Partial<SellerProfile>): Promise<SellerProfile> {
    return await this.request<SellerProfile>(this.endpoints.createProfile(), {
      method: 'POST',
      body: JSON.stringify(profileData),
    }, true); // requireAuth = true for private access
  }

  async updateProfile(walletAddress: string, updates: Partial<SellerProfile>): Promise<SellerProfile> {
    return await this.request<SellerProfile>(this.endpoints.updateProfile(walletAddress), {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, true); // requireAuth = true for private access
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
    try {
      return await this.request<OnboardingStep[]>(this.endpoints.getOnboardingSteps(walletAddress), undefined, true);
    } catch (error) {
      if (error instanceof SellerAPIError && error.status === 404) {
        // Return default onboarding steps for new sellers who haven't started onboarding
        return [
          { id: 'profile_setup', completed: false, title: 'Profile Setup', description: 'Set up your seller profile', component: 'ProfileSetup', required: true },
          { id: 'verification', completed: false, title: 'Verification', description: 'Verify your identity', component: 'Verification', required: true },
          { id: 'payout_setup', completed: false, title: 'Payout Setup', description: 'Set up your payment methods', component: 'PayoutSetup', required: true },
          { id: 'first_listing', completed: false, title: 'First Listing', description: 'Create your first product listing', component: 'FirstListing', required: false }
        ];
      }
      throw error;
    }
  }

  async updateOnboardingStep(walletAddress: string, stepId: string, data: any): Promise<void> {
    // The backend expects { completed: true } in the request body
    // We send the data as well for storage, but ensure completed is set to true
    await this.request<void>(this.endpoints.updateOnboardingStep(walletAddress, stepId), {
      method: 'PUT',
      body: JSON.stringify({
        completed: true,
        data: data
      }),
    });
  }

  // Dashboard API methods
  async getDashboardStats(walletAddress: string): Promise<SellerDashboardStats> {
    return await this.request<SellerDashboardStats>(this.endpoints.getDashboard(walletAddress), undefined, true);
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
    const response = await this.request<{ listings: SellerListing[]; total: number } | SellerListing[]>(url);

    // Handle both array response and paginated response format
    if (Array.isArray(response)) {
      return response;
    } else if (response && 'listings' in response && Array.isArray(response.listings)) {
      return response.listings;
    }
    return [];
  }

  async createListing(listingData: Partial<SellerListing>): Promise<SellerListing> {
    return await this.request<SellerListing>(this.endpoints.createListing(), {
      method: 'POST',
      body: JSON.stringify(listingData),
    }, true); // requireAuth = true for private access
  }

  async updateListing(listingId: string, updates: Partial<SellerListing>): Promise<SellerListing> {
    return await this.request<SellerListing>(this.endpoints.updateListing(listingId), {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, true); // requireAuth = true for private access
  }

  async deleteListing(listingId: string): Promise<void> {
    await this.request<void>(this.endpoints.deleteListing(listingId), {
      method: 'DELETE',
    });
  }

  async getListingById(listingId: string): Promise<SellerListing> {
    return await this.request<SellerListing>(this.endpoints.getListingById(listingId));
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
    return await this.request<SellerNotification[]>(this.endpoints.getNotifications(walletAddress), undefined, true);
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
    return await this.request<{ status: string; documents: string[] }>(this.endpoints.getKYCStatus(walletAddress), undefined, true);
  }

  // Payment API methods
  async getPaymentHistory(walletAddress: string): Promise<any[]> {
    return await this.request<any[]>(this.endpoints.getPaymentHistory(walletAddress), undefined, true);
  }

  async requestWithdrawal(walletAddress: string, amount: number, currency: string, method: string): Promise<void> {
    await this.request<void>(this.endpoints.requestWithdrawal(), {
      method: 'POST',
      body: JSON.stringify({ walletAddress, amount, currency, method }),
    }, true);
  }

  // Dispute API methods
  async getDisputes(walletAddress: string): Promise<any[]> {
    return await this.request<any[]>(this.endpoints.getDisputes(walletAddress), undefined, true);
  }

  async respondToDispute(disputeId: string, response: string, evidence?: string[]): Promise<void> {
    await this.request<void>(this.endpoints.respondToDispute(disputeId), {
      method: 'POST',
      body: JSON.stringify({ response, evidence }),
    }, true);
  }

  // Tier API methods
  async getSellerTier(walletAddress: string): Promise<SellerTier> {
    return await this.request<SellerTier>(this.endpoints.getSellerTier(walletAddress), undefined, true);
  }

  async getTierProgress(walletAddress: string): Promise<TierProgress> {
    return await this.request<TierProgress>(this.endpoints.getTierProgress(walletAddress), undefined, true);
  }

  async getTierUpgradeEligibility(walletAddress: string): Promise<TierUpgradeInfo> {
    return await this.request<TierUpgradeInfo>(this.endpoints.getTierUpgradeEligibility(walletAddress), undefined, true);
  }

  async getTierProgressionTracking(walletAddress: string): Promise<any> {
    return await this.request<any>(this.endpoints.getTierProgressionTracking(walletAddress), undefined, true);
  }

  async triggerTierEvaluation(): Promise<any> {
    return await this.request<any>(this.endpoints.triggerTierEvaluation(), {
      method: 'POST',
    }, true);
  }

  async getTierCriteria(): Promise<any> {
    return await this.request<any>(this.endpoints.getTierCriteria(), undefined, true);
  }

  async getTierEvaluationHistory(walletAddress: string): Promise<any> {
    return await this.request<any>(this.endpoints.getTierEvaluationHistory(walletAddress), undefined, true);
  }

  async getTierUpgradeNotifications(walletAddress: string): Promise<any> {
    return await this.request<any>(this.endpoints.getTierUpgradeNotifications(walletAddress), undefined, true);
  }

  async refreshTierData(walletAddress: string): Promise<void> {
    await this.request<void>(this.endpoints.refreshTierData(walletAddress), {
      method: 'POST'
    }, true);
  }
}

// Export singleton instance
export const unifiedSellerAPIClient = new UnifiedSellerAPIClient();