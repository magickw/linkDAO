import { 
  SellerProfile, 
  SellerDashboardStats, 
  SellerNotification, 
  SellerOrder, 
  SellerListing, 
  SellerAnalytics, 
  OnboardingStep, 
  SellerTier,
  SellerProfileUpdateRequest,
  SellerProfileUpdateResponse,
  ENSValidationResult,
  ProfileCompletenessCalculation,
  ValidationResult,
  ProfileValidationRule,
  ProfileValidationOptions
} from '../types/seller';
import { unifiedSellerAPIClient, SellerAPIError, SellerErrorType } from './unifiedSellerAPIClient';

class SellerService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
  private profileCache = new Map<string, { data: SellerProfile | null; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 60 seconds cache

  // Cache management
  clearProfileCache(walletAddress?: string): void {
    if (walletAddress) {
      this.profileCache.delete(walletAddress);
    } else {
      this.profileCache.clear();
    }
  }
  
  // Method to check if a profile is cached
  isProfileCached(walletAddress: string): boolean {
    const cached = this.profileCache.get(walletAddress);
    if (!cached) return false;
    
    const now = Date.now();
    return now - cached.timestamp < this.CACHE_DURATION;
  }
  
  // Method to get cached profile without making a request
  getCachedProfile(walletAddress: string): SellerProfile | null {
    const cached = this.profileCache.get(walletAddress);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    
    // Cache expired, remove it
    this.profileCache.delete(walletAddress);
    return null;
  }
  
  // Helper method to determine the correct base URL based on context
  private getApiBaseUrl(): string {
    // When running in browser, use relative URLs which will be handled by Next.js rewrites
    // When running in Node.js (API routes), use the full backend URL
    if (typeof window === 'undefined') {
      // Server-side (API routes) - use backend URL directly
      return this.baseUrl;
    } else {
      // Client-side (browser) - use relative URLs for proxying
      return '';
    }
  }

  // Profile validation rules with weights for completeness scoring
  private validationRules: ProfileValidationRule[] = [
    { field: 'displayName', required: true, weight: 15 },
    { field: 'storeName', required: true, weight: 15 },
    { field: 'bio', required: true, weight: 10 },
    { field: 'description', required: false, weight: 8 },
    { field: 'sellerStory', required: false, weight: 8 },
    { field: 'location', required: false, weight: 5 },
    { field: 'profileImageCdn', required: false, weight: 10 },
    { field: 'coverImageCdn', required: false, weight: 8 },
    { field: 'websiteUrl', required: false, weight: 5 },
    { field: 'socialLinks.twitter', required: false, weight: 3 },
    { field: 'socialLinks.discord', required: false, weight: 3 },
    { field: 'socialLinks.telegram', required: false, weight: 3 },
    { field: 'ensHandle', required: false, weight: 7 }, // ENS is optional but valuable
  ];

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
    const defaultSteps: OnboardingStep[] = [
      {
        id: 'wallet-connect',
        title: 'Connect Wallet',
        description: 'Connect your Web3 wallet to get started',
        component: 'WalletConnect',
        required: true,
        completed: true,
      },
      {
        id: 'profile-setup',
        title: 'Profile Setup',
        description: 'Set up your seller profile and store information',
        component: 'ProfileSetup',
        required: true,
        completed: false,
      },
      {
        id: 'verification',
        title: 'Verification',
        description: 'Verify your email and phone for enhanced features',
        component: 'Verification',
        required: false,
        completed: false,
      },
      {
        id: 'payout-setup',
        title: 'Payout Setup',
        description: 'Configure your payment preferences',
        component: 'PayoutSetup',
        required: true,
        completed: false,
      },
      {
        id: 'first-listing',
        title: 'Create First Listing',
        description: 'Create your first product listing',
        component: 'FirstListing',
        required: true,
        completed: false,
      },
    ];

    try {
      console.log(`Fetching onboarding steps for: ${walletAddress}`);
      const steps = await unifiedSellerAPIClient.getOnboardingSteps(walletAddress);
      return Array.isArray(steps) ? steps : defaultSteps;
    } catch (error) {
      console.warn('Onboarding steps unavailable. Using defaults.', error);
      return defaultSteps;
    }
  }

  async updateOnboardingStep(walletAddress: string, stepId: string, data: any): Promise<void> {
    console.log(`Updating onboarding step ${stepId} for: ${walletAddress}`, data);
    await unifiedSellerAPIClient.updateOnboardingStep(walletAddress, stepId, data);
  }

  // Seller Profile Management
  async getSellerProfile(walletAddress: string): Promise<SellerProfile | null> {
    // Check cache first using the new method
    const cachedProfile = this.getCachedProfile(walletAddress);
    if (cachedProfile !== null) {
      console.log(`Returning cached profile for ${walletAddress}`);
      return cachedProfile;
    }
    
    try {
      const baseUrl = this.getApiBaseUrl();
      // Use the correct backend endpoint (using plural 'sellers' as per memory)
      const endpoint = typeof window === 'undefined' 
        ? `${baseUrl}/api/sellers/profile/${walletAddress}`  // Server-side direct call
        : `${baseUrl}/api/marketplace/seller/${walletAddress}`;     // Client-side through proxy
      console.log(`Making GET request to: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      console.log(`Response status: ${response.status}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Cache 404 responses as well to prevent repeated calls
          this.profileCache.set(walletAddress, { data: null, timestamp: Date.now() });
          return null;
        }
        if (response.status === 503) {
          // Backend temporarily unavailable — retry briefly once, then gracefully return null
          await new Promise(r => setTimeout(r, 1000));
          try {
            const retry = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
            if (retry.ok) {
              const retriedResult = await retry.json();
              if (retriedResult?.success) {
                const profile = retriedResult.data || null;
                this.profileCache.set(walletAddress, { data: profile, timestamp: Date.now() });
                return profile;
              }
            }
          } catch {}
          console.warn('Seller profile fetch 503, returning null to avoid crashing UI');
          this.profileCache.set(walletAddress, { data: null, timestamp: Date.now() });
          return null;
        }
        // For other errors, don’t throw—gracefully return null so the UI can recover
        console.warn(`Failed to fetch seller profile (HTTP ${response.status}). Returning null.`);
        this.profileCache.set(walletAddress, { data: null, timestamp: Date.now() });
        return null;
      }
      
      const result = await response.json();
      console.log(`Response data:`, result);
      // The backend returns { success: true, data: {...} }
      // We need to return the data object
      if (result.success) {
        const profile = result.data || null;
        
        if (profile) {
          // Calculate profile completeness if not already calculated or outdated
          if (!profile.profileCompleteness || this.isCompletenessOutdated(profile.profileCompleteness.lastCalculated)) {
            profile.profileCompleteness = this.calculateProfileCompleteness(profile);
          }
          
          // Ensure ENS verification status is properly set
          if (!profile.ensVerified) {
            profile.ensVerified = false;
          }
        }
        
        // Cache the result
        this.profileCache.set(walletAddress, { data: profile, timestamp: Date.now() });
        
        return profile;
      } else {
        throw new Error(result.message || 'Failed to fetch seller profile');
      }
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      return null;
    }
  }

  async createSellerProfile(profileData: Partial<SellerProfile>): Promise<SellerProfile> {
    const baseUrl = this.getApiBaseUrl();
    // Use the correct backend endpoint (using plural 'sellers' as per memory)
    const endpoint = typeof window === 'undefined' 
      ? `${baseUrl}/api/sellers/profile`  // Server-side direct call
      : `${baseUrl}/api/marketplace/seller/profile`;  // Client-side through proxy
    console.log(`Making POST request to: ${endpoint}`, profileData);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
    
    console.log(`Response status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`Failed to create seller profile: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`Response data:`, result);
    // The backend returns { success: true, data: {...} }
    // We need to return the data object
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'Failed to create seller profile');
    }
  }

  async updateSellerProfile(walletAddress: string, updates: Partial<SellerProfile>): Promise<SellerProfile> {
    const baseUrl = this.getApiBaseUrl();
    // Use the correct backend endpoint (using plural 'sellers' as per memory)
    const endpoint = typeof window === 'undefined' 
      ? `${baseUrl}/api/sellers/profile/${walletAddress}`  // Server-side direct call
      : `${baseUrl}/api/marketplace/seller/${walletAddress}`;     // Client-side through proxy
    console.log(`Making PUT request to: ${endpoint}`, updates);
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    console.log(`Response status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`Failed to update seller profile: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`Response data:`, result);
    // The backend returns { success: true, data: {...} }
    // We need to return the data object
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'Failed to update seller profile');
    }
  }

  // Enhanced Profile Update with ENS and Image Support
  async updateSellerProfileEnhanced(walletAddress: string, updates: SellerProfileUpdateRequest): Promise<SellerProfileUpdateResponse> {
    try {
      const baseUrl = this.getApiBaseUrl();
      // Use the correct backend endpoint (using plural 'sellers' as per memory)
      const endpoint = typeof window === 'undefined' 
        ? `${baseUrl}/api/sellers/profile/${walletAddress}/enhanced`  // Server-side direct call
        : `${baseUrl}/api/marketplace/seller/${walletAddress}/enhanced`;     // Client-side through proxy
      console.log(`Making PUT request to: ${endpoint}`);

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

      // Use the correct backend endpoint
      const response = await fetch(endpoint, {
        method: 'PUT',
        body: formData,
      });

      console.log(`Response status: ${response.status}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update seller profile');
      }

      const result = await response.json();
      console.log(`Response data:`, result);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to update seller profile');
      }
    } catch (error) {
      console.error('Error updating seller profile:', error);
      throw error;
    }
  }

  // ENS Validation Methods
  async validateENSHandle(ensHandle: string): Promise<ENSValidationResult> {
    try {
      const baseUrl = this.getApiBaseUrl();
      // Use the correct backend endpoint (using plural 'sellers' as per memory)
      const endpoint = typeof window === 'undefined' 
        ? `${baseUrl}/api/sellers/ens/validate`  // Server-side direct call
        : `${baseUrl}/api/marketplace/seller/ens/validate`;  // Client-side through proxy
      console.log(`Making POST request to: ${endpoint}`, { ensHandle });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ensHandle }),
      });

      console.log(`Response status: ${response.status}`);
      if (!response.ok) {
        throw new Error('Failed to validate ENS handle');
      }

      const result = await response.json();
      console.log(`Response data:`, result);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to validate ENS handle');
      }
    } catch (error) {
      console.error('Error validating ENS handle:', error);
      return {
        isValid: false,
        isAvailable: false,
        isOwned: false,
        errors: ['Failed to validate ENS handle'],
        suggestions: [],
      };
    }
  }

  async verifyENSOwnership(ensHandle: string, walletAddress: string): Promise<boolean> {
    try {
      const baseUrl = this.getApiBaseUrl();
      // Use the correct backend endpoint (using plural 'sellers' as per memory)
      const endpoint = typeof window === 'undefined' 
        ? `${baseUrl}/api/sellers/ens/verify-ownership`  // Server-side direct call
        : `${baseUrl}/api/marketplace/seller/ens/verify-ownership`;  // Client-side through proxy
      console.log(`Making POST request to: ${endpoint}`, { ensHandle, walletAddress });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ensHandle, walletAddress }),
      });

      console.log(`Response status: ${response.status}`);
      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      console.log(`Response data:`, result);
      return result.success && result.data?.isOwned;
    } catch (error) {
      console.error('Error verifying ENS ownership:', error);
      return false;
    }
  }

  // Profile Validation and Completeness
  validateProfile(profile: Partial<SellerProfile>, options: ProfileValidationOptions = {
    ensRequired: false,
    imageRequired: false,
    socialLinksRequired: false,
    strictValidation: false
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    this.validationRules.forEach(rule => {
      if (rule.required || (rule.field === 'ensHandle' && options.ensRequired)) {
        const value = this.getNestedValue(profile, rule.field);
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push(`${rule.field} is required`);
        }
      }
    });

    // Validate ENS handle format if provided
    if (profile.ensHandle && !this.isValidENSFormat(profile.ensHandle)) {
      errors.push('ENS handle format is invalid');
    }

    // Validate URLs
    if (profile.websiteUrl && !this.isValidUrl(profile.websiteUrl)) {
      errors.push('Website URL is invalid');
    }

    // Validate social links
    if (profile.socialLinks) {
      Object.entries(profile.socialLinks).forEach(([platform, handle]) => {
        if (handle && !this.isValidSocialHandle(platform, handle)) {
          warnings.push(`${platform} handle format may be invalid`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  calculateProfileCompleteness(profile: Partial<SellerProfile>): ProfileCompletenessCalculation {
    let totalWeight = 0;
    let completedWeight = 0;
    const missingFields: Array<{
      field: string;
      label: string;
      weight: number;
      required: boolean;
    }> = [];

    this.validationRules.forEach(rule => {
      totalWeight += rule.weight;
      const value = this.getNestedValue(profile, rule.field);
      const isCompleted = value && (typeof value !== 'string' || value.trim() !== '');
      
      if (isCompleted) {
        completedWeight += rule.weight;
      } else {
        missingFields.push({
          field: rule.field,
          label: this.getFieldLabel(rule.field),
          weight: rule.weight,
          required: rule.required,
        });
      }
    });

    const score = Math.round((completedWeight / totalWeight) * 100);
    
    const recommendations = this.generateRecommendations(missingFields, score);

    return {
      totalFields: this.validationRules.length,
      completedFields: this.validationRules.length - missingFields.length,
      score,
      missingFields,
      recommendations,
      lastCalculated: new Date().toISOString(),
    };
  }

  // Helper Methods
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private isValidENSFormat(ensHandle: string): boolean {
    return /^[a-z0-9-]+\.eth$/.test(ensHandle.toLowerCase());
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidSocialHandle(platform: string, handle: string): boolean {
    const patterns: Record<string, RegExp> = {
      twitter: /^@?[A-Za-z0-9_]{1,15}$/,
      discord: /^.{2,32}#[0-9]{4}$|^[A-Za-z0-9_.]{2,32}$/,
      telegram: /^@?[A-Za-z0-9_]{5,32}$/,
    };
    
    const pattern = patterns[platform];
    return pattern ? pattern.test(handle) : true;
  }

  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      'displayName': 'Display Name',
      'storeName': 'Store Name',
      'bio': 'Bio',
      'description': 'Description',
      'sellerStory': 'Seller Story',
      'location': 'Location',
      'profileImageCdn': 'Profile Image',
      'coverImageCdn': 'Cover Image',
      'websiteUrl': 'Website URL',
      'socialLinks.twitter': 'Twitter Handle',
      'socialLinks.discord': 'Discord Handle',
      'socialLinks.telegram': 'Telegram Handle',
      'ensHandle': 'ENS Handle',
    };
    
    return labels[field] || field;
  }

  private generateRecommendations(missingFields: any[], score: number): Array<{
    action: string;
    description: string;
    impact: number;
  }> {
    const recommendations: Array<{
      action: string;
      description: string;
      impact: number;
    }> = [];

    // Sort missing fields by weight (impact)
    const sortedMissing = missingFields.sort((a, b) => b.weight - a.weight);

    // Add top recommendations
    sortedMissing.slice(0, 3).forEach(field => {
      recommendations.push({
        action: `Add ${field.label}`,
        description: `Adding your ${field.label.toLowerCase()} will help buyers trust your store`,
        impact: field.weight,
      });
    });

    // Add score-based recommendations
    if (score < 50) {
      recommendations.unshift({
        action: 'Complete Basic Profile',
        description: 'Fill in your display name, store name, and bio to get started',
        impact: 40,
      });
    } else if (score < 80) {
      recommendations.push({
        action: 'Add Visual Elements',
        description: 'Upload a profile picture and cover image to make your store more appealing',
        impact: 18,
      });
    }

    return recommendations;
  }

  private isCompletenessOutdated(lastCalculated: string): boolean {
    const lastCalc = new Date(lastCalculated);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastCalc.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24; // Recalculate if older than 24 hours
  }

  // Dashboard Data
  async getDashboardStats(walletAddress: string): Promise<SellerDashboardStats> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/seller/dashboard/${walletAddress}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: {...} }
      // We need to return the data object
      if (result.success) {
        return result.data || this.getDefaultDashboardStats();
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error; // Don't return mock data, let the error propagate
    }
  }
  
  // Helper method to get default dashboard stats
  private getDefaultDashboardStats(): SellerDashboardStats {
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

  // Notifications
  async getNotifications(walletAddress: string): Promise<SellerNotification[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/seller/notifications/${walletAddress}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: [...] }
      // We need to return the data array
      if (result.success) {
        return Array.isArray(result.data) ? result.data : [];
      } else {
        throw new Error(result.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to mark notification as read: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to mark notification as read');
    }
  }

  // Orders Management
  async getOrders(walletAddress: string, status?: string): Promise<SellerOrder[]> {
    const url = new URL(`${this.baseUrl}/api/marketplace/seller/orders/${walletAddress}`);
    if (status) {
      url.searchParams.append('status', status);
    }
    
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: [...] }
      // We need to return the data array
      if (result.success) {
        return Array.isArray(result.data) ? result.data : [];
      } else {
        throw new Error(result.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: string, data?: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, ...data }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update order status: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to update order status');
    }
  }

  async addTrackingNumber(orderId: string, trackingNumber: string, carrier: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/orders/${orderId}/tracking`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trackingNumber, carrier }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add tracking number: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to add tracking number');
    }
  }

  // Listings Management
  async getListings(walletAddress: string, status?: string): Promise<SellerListing[]> {
    const url = new URL(`${this.baseUrl}/api/marketplace/seller/listings/${walletAddress}`);
    if (status) {
      url.searchParams.append('status', status);
    }
    
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch listings: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: [...] }
      // We need to transform and return the data array
      if (result.success) {
        const backendListings = Array.isArray(result.data) ? result.data : [];
        
        // Transform backend data to match SellerListing interface
        return backendListings.map((listing: any): SellerListing => {
          // Extract enhanced data if available
          const enhanced = listing.enhancedData || {};
          const title = enhanced.title || listing.metadataURI || listing.title || 'Untitled Listing';
          const description = enhanced.description || listing.description || '';
          const images = enhanced.images || listing.images || [];
          const tags = enhanced.tags || listing.tags || [];
          const condition = enhanced.condition || listing.condition || 'new';
          const category = enhanced.category || listing.category || 'general';
          
          return {
            id: listing.id,
            title,
            description,
            category,
            subcategory: listing.subcategory,
            price: typeof listing.price === 'string' ? parseFloat(listing.price) : (listing.price || 0),
            currency: listing.currency || 'ETH',
            quantity: listing.quantity || 1,
            condition,
            images,
            specifications: listing.specifications || {},
            tags,
            status: listing.status === 'ACTIVE' ? 'active' : (listing.status?.toLowerCase() || 'active'),
            saleType: listing.saleType || (listing.listingType === 'AUCTION' ? 'auction' : 'fixed'),
            escrowEnabled: enhanced.escrowEnabled || listing.escrowEnabled || false,
            shippingOptions: {
              free: false,
              cost: 0,
              estimatedDays: '3-5 days',
              international: false
            },
            views: enhanced.views || listing.views || 0,
            favorites: enhanced.favorites || listing.favorites || 0,
            questions: listing.questions || 0,
            createdAt: listing.createdAt || new Date().toISOString(),
            updatedAt: listing.updatedAt || new Date().toISOString()
          };
        });
      } else {
        throw new Error(result.message || 'Failed to fetch listings');
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      return [];
    }
  }

  async createListing(walletAddress: string, listingData: Partial<SellerListing>): Promise<SellerListing> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...listingData, sellerWalletAddress: walletAddress }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create listing: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    // The backend returns { success: true, data: {...} }
    // We need to return the data object
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'Failed to create listing');
    }
  }

  async updateListing(listingId: string, updates: Partial<SellerListing>): Promise<SellerListing> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/listings/${listingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update listing: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    // The backend returns { success: true, data: {...} }
    // We need to return the data object
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'Failed to update listing');
    }
  }

  async deleteListing(listingId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/listings/${listingId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete listing: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete listing');
    }
  }

  // Analytics
  async getAnalytics(walletAddress: string, period: string = '30d'): Promise<SellerAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/seller/analytics/${walletAddress}?period=${period}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      // The backend returns { success: true, data: {...} }
      // We need to return the data object
      if (result.success) {
        return result.data || this.getDefaultSellerAnalytics();
      } else {
        throw new Error(result.message || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error; // Don't return mock data, let the error propagate
    }
  }
  
  // Helper method to get default seller analytics
  private getDefaultSellerAnalytics(): SellerAnalytics {
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

  // Verification
  async sendEmailVerification(email: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/verification/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send email verification: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to send email verification');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/verification/email/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to verify email: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to verify email');
    }
  }

  async sendPhoneVerification(phone: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/verification/phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send phone verification: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to send phone verification');
    }
  }

  async verifyPhone(phone: string, code: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/verification/phone/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, code }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to verify phone: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to verify phone');
    }
  }

  // KYC
  async submitKYC(walletAddress: string, kycData: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/kyc/${walletAddress}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(kycData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to submit KYC: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to submit KYC');
    }
  }

  async getKYCStatus(walletAddress: string): Promise<{ status: string; documents: string[] }> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/kyc/${walletAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch KYC status: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'Failed to fetch KYC status');
    }
  }

  // Payments & Withdrawals
  async getPaymentHistory(walletAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/seller/payments/${walletAddress}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch payment history: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  async requestWithdrawal(walletAddress: string, amount: number, currency: string, method: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/marketplace/seller/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress, amount, currency, method }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to request withdrawal: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to request withdrawal');
    }
  }

  // Disputes
  async getDisputes(walletAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/seller/disputes/${walletAddress}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch disputes: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch disputes');
      }
    } catch (error) {
      console.error('Error fetching disputes:', error);
      return [];
    }
  }

  async respondToDispute(disputeId: string, response: string, evidence?: string[]): Promise<void> {
    const apiResponse = await fetch(`${this.baseUrl}/api/marketplace/seller/disputes/${disputeId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ response, evidence }),
    });
    
    if (!apiResponse.ok) {
      throw new Error(`Failed to respond to dispute: ${apiResponse.status} ${apiResponse.statusText}`);
    }
    
    const result = await apiResponse.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to respond to dispute');
    }
  }
}

export const sellerService = new SellerService();