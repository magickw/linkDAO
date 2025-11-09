/**
 * Unified Seller Service
 * 
 * This service provides a unified interface for all seller-related operations
 * using the new unified data types and transformation utilities.
 */

import {
  UnifiedSellerProfile,
  UnifiedSellerListing,
  UnifiedSellerDashboard,
  SellerNotification,
  SellerOrder,
  SellerAnalytics,
  OnboardingStep,
  SellerTier,
  DataTransformationOptions,
  TransformationResult
} from '@/types/unifiedSeller';

import {
  transformDisplayListingToUnified,
  transformSellerListingToUnified,
  transformMarketplaceListingToUnified,
  transformSellerProfileToUnified,
  transformDashboardStatsToUnified
} from '@/utils/sellerDataTransformers';

import { unifiedSellerAPIClient, SellerAPIError, SellerErrorType } from './unifiedSellerAPIClient';

// Legacy imports for backward compatibility
import { SellerProfile, SellerListing, SellerDashboardStats } from '@/types/seller';

export class UnifiedSellerService {
  private profileCache = new Map<string, { data: UnifiedSellerProfile | null; timestamp: number }>();
  private listingsCache = new Map<string, { data: UnifiedSellerListing[]; timestamp: number }>();
  private dashboardCache = new Map<string, { data: UnifiedSellerDashboard | null; timestamp: number }>();
  
  private readonly CACHE_DURATION = 60000; // 60 seconds cache
  private readonly transformationOptions: DataTransformationOptions = {
    includeDeprecatedFields: false,
    validateData: true,
    fillMissingFields: true,
    preserveOriginalFormat: false
  };

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  clearCache(walletAddress?: string): void {
    if (walletAddress) {
      this.profileCache.delete(walletAddress);
      this.listingsCache.delete(walletAddress);
      this.dashboardCache.delete(walletAddress);
    } else {
      this.profileCache.clear();
      this.listingsCache.clear();
      this.dashboardCache.clear();
    }
  }

  invalidateSellerCache(walletAddress: string): void {
    this.clearCache(walletAddress);
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  // ============================================================================
  // PROFILE OPERATIONS
  // ============================================================================

  async getProfile(walletAddress: string): Promise<UnifiedSellerProfile | null> {
    try {
      // Check cache first
      const cached = this.profileCache.get(walletAddress);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }

      // Fetch from API
      const response = await unifiedSellerAPIClient.request<SellerProfile>(
        `/api/marketplace/seller/${walletAddress}`
      );

      if (!response) {
        this.profileCache.set(walletAddress, { data: null, timestamp: Date.now() });
        return null;
      }

      // Transform to unified format
      const transformResult = transformSellerProfileToUnified(response, this.transformationOptions);
      
      // Log transformation warnings if any
      if (transformResult.warnings.length > 0) {
        console.warn('Profile transformation warnings:', transformResult.warnings);
      }

      // Cache the result
      this.profileCache.set(walletAddress, { 
        data: transformResult.data, 
        timestamp: Date.now() 
      });

      return transformResult.data;
    } catch (error) {
      console.error('Failed to get seller profile:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to fetch seller profile: ${error instanceof Error ? error.message : String(error)}`,
        'PROFILE_FETCH_ERROR'
      );
    }
  }

  async createProfile(profileData: Partial<UnifiedSellerProfile>): Promise<UnifiedSellerProfile> {
    try {
      // Convert unified profile data to legacy format for API
      const legacyProfileData = this.convertUnifiedProfileToLegacy(profileData);

      const response = await unifiedSellerAPIClient.createProfile(legacyProfileData);

      // Transform response to unified format
      const transformResult = transformSellerProfileToUnified(response, this.transformationOptions);

      // Update cache with the wallet address from the response
      if (response.walletAddress) {
        this.profileCache.set(response.walletAddress, {
          data: transformResult.data,
          timestamp: Date.now()
        });

        // Invalidate related caches
        this.dashboardCache.delete(response.walletAddress);
      }

      return transformResult.data;
    } catch (error) {
      console.error('Failed to create seller profile:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to create seller profile: ${error instanceof Error ? error.message : String(error)}`,
        'PROFILE_CREATE_ERROR'
      );
    }
  }

  async updateProfile(
    walletAddress: string, 
    updates: Partial<UnifiedSellerProfile>
  ): Promise<UnifiedSellerProfile> {
    try {
      // Convert unified updates back to legacy format for API
      const legacyUpdates = this.convertUnifiedProfileToLegacy(updates);

      const response = await unifiedSellerAPIClient.request<SellerProfile>(
        `/api/marketplace/seller/${walletAddress}`,
        {
          method: 'PUT',
          body: JSON.stringify(legacyUpdates),
        }
      );

      // Transform response to unified format
      const transformResult = transformSellerProfileToUnified(response, this.transformationOptions);

      // Update cache
      this.profileCache.set(walletAddress, { 
        data: transformResult.data, 
        timestamp: Date.now() 
      });

      // Invalidate related caches
      this.dashboardCache.delete(walletAddress);

      return transformResult.data;
    } catch (error) {
      console.error('Failed to update seller profile:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to update seller profile: ${error instanceof Error ? error.message : String(error)}`,
        'PROFILE_UPDATE_ERROR'
      );
    }
  }

  // ============================================================================
  // LISTINGS OPERATIONS
  // ============================================================================

  async getListings(walletAddress: string): Promise<UnifiedSellerListing[]> {
    try {
      // Check cache first
      const cached = this.listingsCache.get(walletAddress);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }

      // Fetch from API
      const response = await unifiedSellerAPIClient.request<SellerListing[]>(
        `/listings/${walletAddress}`
      );

      if (!response || !Array.isArray(response)) {
        this.listingsCache.set(walletAddress, { data: [], timestamp: Date.now() });
        return [];
      }

      // Transform each listing to unified format
      const unifiedListings: UnifiedSellerListing[] = [];
      const transformationWarnings: string[] = [];

      for (const listing of response) {
        try {
          const transformResult = transformSellerListingToUnified(listing, this.transformationOptions);
          
          // Fill in seller information
          transformResult.data.sellerId = walletAddress;
          transformResult.data.sellerWalletAddress = walletAddress;
          
          unifiedListings.push(transformResult.data);
          transformationWarnings.push(...transformResult.warnings);
        } catch (error) {
          console.error('Failed to transform listing:', listing.id, error);
          // Continue with other listings
        }
      }

      // Log transformation warnings if any
      if (transformationWarnings.length > 0) {
        console.warn('Listings transformation warnings:', transformationWarnings);
      }

      // Cache the result
      this.listingsCache.set(walletAddress, { 
        data: unifiedListings, 
        timestamp: Date.now() 
      });

      return unifiedListings;
    } catch (error) {
      console.error('Failed to get seller listings:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to fetch seller listings: ${error instanceof Error ? error.message : String(error)}`,
        'LISTINGS_FETCH_ERROR'
      );
    }
  }

  async createListing(
    walletAddress: string, 
    listingData: Partial<UnifiedSellerListing>
  ): Promise<UnifiedSellerListing> {
    try {
      // Convert unified listing back to legacy format for API
      const legacyListing = this.convertUnifiedListingToLegacy(listingData);

      const response = await unifiedSellerAPIClient.request<SellerListing>(
        `/listings/${walletAddress}`,
        {
          method: 'POST',
          body: JSON.stringify(legacyListing),
        }
      );

      // Transform response to unified format
      const transformResult = transformSellerListingToUnified(response, this.transformationOptions);
      
      // Fill in seller information
      transformResult.data.sellerId = walletAddress;
      transformResult.data.sellerWalletAddress = walletAddress;

      // Invalidate listings cache
      this.listingsCache.delete(walletAddress);
      this.dashboardCache.delete(walletAddress);

      return transformResult.data;
    } catch (error) {
      console.error('Failed to create listing:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to create listing: ${error instanceof Error ? error.message : String(error)}`,
        'LISTING_CREATE_ERROR'
      );
    }
  }

  async updateListing(
    walletAddress: string,
    listingId: string,
    updates: Partial<UnifiedSellerListing>
  ): Promise<UnifiedSellerListing> {
    try {
      // Convert unified updates back to legacy format for API
      const legacyUpdates = this.convertUnifiedListingToLegacy(updates);

      const response = await unifiedSellerAPIClient.request<SellerListing>(
        `/listings/${walletAddress}/${listingId}`,
        {
          method: 'PUT',
          body: JSON.stringify(legacyUpdates),
        }
      );

      // Transform response to unified format
      const transformResult = transformSellerListingToUnified(response, this.transformationOptions);
      
      // Fill in seller information
      transformResult.data.sellerId = walletAddress;
      transformResult.data.sellerWalletAddress = walletAddress;

      // Invalidate caches
      this.listingsCache.delete(walletAddress);
      this.dashboardCache.delete(walletAddress);

      return transformResult.data;
    } catch (error) {
      console.error('Failed to update listing:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to update listing: ${error instanceof Error ? error.message : String(error)}`,
        'LISTING_UPDATE_ERROR'
      );
    }
  }

  // ============================================================================
  // DASHBOARD OPERATIONS
  // ============================================================================

  async getDashboard(walletAddress: string): Promise<UnifiedSellerDashboard> {
    try {
      // Check cache first
      const cached = this.dashboardCache.get(walletAddress);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data!;
      }

      // Fetch dashboard data from API
      const [profile, listings, dashboardStats] = await Promise.all([
        this.getProfile(walletAddress),
        this.getListings(walletAddress),
        unifiedSellerAPIClient.request<SellerDashboardStats>(`/dashboard/${walletAddress}`)
      ]);

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Transform dashboard stats to unified format
      const transformResult = transformDashboardStatsToUnified(
        dashboardStats,
        profile,
        listings,
        this.transformationOptions
      );

      // Log transformation warnings if any
      if (transformResult.warnings.length > 0) {
        console.warn('Dashboard transformation warnings:', transformResult.warnings);
      }

      // Cache the result
      this.dashboardCache.set(walletAddress, { 
        data: transformResult.data, 
        timestamp: Date.now() 
      });

      return transformResult.data;
    } catch (error) {
      console.error('Failed to get seller dashboard:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to fetch seller dashboard: ${error instanceof Error ? error.message : String(error)}`,
        'DASHBOARD_FETCH_ERROR'
      );
    }
  }

  // ============================================================================
  // ORDERS OPERATIONS
  // ============================================================================

  async getOrders(walletAddress: string): Promise<SellerOrder[]> {
    try {
      const response = await unifiedSellerAPIClient.request<SellerOrder[]>(
        `/orders/${walletAddress}`
      );

      return response || [];
    } catch (error) {
      console.error('Failed to get seller orders:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to fetch seller orders: ${error instanceof Error ? error.message : String(error)}`,
        'ORDERS_FETCH_ERROR'
      );
    }
  }

  // ============================================================================
  // ANALYTICS OPERATIONS
  // ============================================================================

  async getAnalytics(walletAddress: string): Promise<SellerAnalytics> {
    try {
      const response = await unifiedSellerAPIClient.request<SellerAnalytics>(
        `/analytics/${walletAddress}`
      );

      return response;
    } catch (error) {
      console.error('Failed to get seller analytics:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to fetch seller analytics: ${error instanceof Error ? error.message : String(error)}`,
        'ANALYTICS_FETCH_ERROR'
      );
    }
  }

  // ============================================================================
  // NOTIFICATIONS OPERATIONS
  // ============================================================================

  async getNotifications(walletAddress: string): Promise<SellerNotification[]> {
    try {
      const response = await unifiedSellerAPIClient.request<SellerNotification[]>(
        `/notifications/${walletAddress}`
      );

      return response || [];
    } catch (error) {
      console.error('Failed to get seller notifications:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to fetch seller notifications: ${error instanceof Error ? error.message : String(error)}`,
        'NOTIFICATIONS_FETCH_ERROR'
      );
    }
  }

  async markNotificationRead(walletAddress: string, notificationId: string): Promise<void> {
    try {
      await unifiedSellerAPIClient.request(
        `/notifications/${walletAddress}/${notificationId}/read`,
        { method: 'POST' }
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw new SellerAPIError(
        SellerErrorType.API_ERROR,
        `Failed to mark notification as read: ${error instanceof Error ? error.message : String(error)}`,
        'NOTIFICATION_UPDATE_ERROR'
      );
    }
  }

  // ============================================================================
  // TIER OPERATIONS
  // ============================================================================

  getSellerTiers(): SellerTier[] {
    return [
      {
        id: 'anonymous',
        name: 'Anonymous Browser',
        level: 0,
        description: 'Browse and view listings without registration',
        requirements: [],
        benefits: [
          { type: 'listing_limit', description: 'View all listings', value: 'unlimited' },
          { type: 'listing_limit', description: 'Browse categories', value: 'unlimited' },
          { type: 'listing_limit', description: 'Search products', value: 'unlimited' }
        ],
        limitations: [
          { type: 'feature_access', description: 'Cannot purchase', value: 'disabled' },
          { type: 'feature_access', description: 'Cannot sell', value: 'disabled' },
          { type: 'feature_access', description: 'No saved favorites', value: 'disabled' }
        ]
      },
      {
        id: 'basic',
        name: 'Basic Seller',
        level: 1,
        description: 'Wallet-only seller for digital goods and NFTs',
        requirements: [
          { type: 'sales_volume', value: 0, current: 0, met: true, description: 'Connected wallet' }
        ],
        benefits: [
          { type: 'listing_limit', description: 'List digital goods & NFTs', value: 10 },
          { type: 'commission_rate', description: 'Standard commission rate', value: '5%' },
          { type: 'analytics_access', description: 'Basic analytics', value: 'basic' }
        ],
        limitations: [
          { type: 'listing_limit', description: 'Limited to 10 listings', value: 10 },
          { type: 'feature_access', description: 'Escrow required for all sales', value: 'required' },
          { type: 'feature_access', description: 'No physical goods', value: 'disabled' }
        ]
      },
      {
        id: 'verified',
        name: 'Verified Seller',
        level: 2,
        description: 'Enhanced seller with email/phone verification',
        requirements: [
          { type: 'sales_volume', value: 1000, current: 0, met: false, description: '$1000 in sales' },
          { type: 'rating', value: 4.0, current: 0, met: false, description: '4.0+ average rating' },
          { type: 'reviews', value: 10, current: 0, met: false, description: '10+ reviews' }
        ],
        benefits: [
          { type: 'listing_limit', description: 'Unlimited listings', value: 'unlimited' },
          { type: 'commission_rate', description: 'Reduced commission rate', value: '3%' },
          { type: 'priority_support', description: 'Priority customer support', value: 'enabled' },
          { type: 'analytics_access', description: 'Advanced analytics', value: 'advanced' }
        ],
        limitations: [
          { type: 'withdrawal_limit', description: 'KYC required for fiat withdrawals', value: 'kyc_required' }
        ]
      },
      {
        id: 'pro',
        name: 'Pro Seller',
        level: 3,
        description: 'Full-featured seller with KYC and fiat integration',
        requirements: [
          { type: 'sales_volume', value: 10000, current: 0, met: false, description: '$10,000 in sales' },
          { type: 'rating', value: 4.5, current: 0, met: false, description: '4.5+ average rating' },
          { type: 'reviews', value: 50, current: 0, met: false, description: '50+ reviews' },
          { type: 'time_active', value: 90, current: 0, met: false, description: '90+ days active' }
        ],
        benefits: [
          { type: 'listing_limit', description: 'Unlimited listings', value: 'unlimited' },
          { type: 'commission_rate', description: 'Lowest commission rate', value: '2%' },
          { type: 'priority_support', description: 'VIP customer support', value: 'vip' },
          { type: 'analytics_access', description: 'Premium analytics', value: 'premium' }
        ],
        limitations: [
          { type: 'feature_access', description: 'Subject to tax reporting', value: 'tax_reporting' },
          { type: 'feature_access', description: 'Enhanced compliance requirements', value: 'compliance' }
        ]
      }
    ];
  }

  // ============================================================================
  // ONBOARDING OPERATIONS
  // ============================================================================

  async getOnboardingSteps(walletAddress: string): Promise<OnboardingStep[]> {
    try {
      const profile = await this.getProfile(walletAddress);
      
      if (!profile) {
        return this.getDefaultOnboardingSteps();
      }

      return profile.onboardingProgress.steps || this.getDefaultOnboardingSteps();
    } catch (error) {
      console.error('Failed to get onboarding steps:', error);
      return this.getDefaultOnboardingSteps();
    }
  }

  private getDefaultOnboardingSteps(): OnboardingStep[] {
    return [
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
        title: 'Setup Profile',
        description: 'Complete your seller profile information',
        component: 'ProfileSetup',
        required: true,
        completed: false,
      },
      {
        id: 'verification',
        title: 'Verify Identity',
        description: 'Verify your email and phone number',
        component: 'Verification',
        required: false,
        completed: false,
      },
      {
        id: 'payout-setup',
        title: 'Setup Payouts',
        description: 'Configure how you want to receive payments',
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
  }

  // ============================================================================
  // DATA CONVERSION UTILITIES
  // ============================================================================

  private convertUnifiedProfileToLegacy(unified: Partial<UnifiedSellerProfile>): Partial<SellerProfile> {
    return {
      displayName: unified.displayName,
      storeName: unified.storeName,
      bio: unified.bio,
      description: unified.description,
      sellerStory: unified.sellerStory,
      location: unified.location,
      profilePicture: unified.profileImageUrl || unified.profilePicture,
      logo: unified.logo,
      coverImage: unified.coverImageUrl || unified.coverImage,
      ensHandle: unified.ensHandle,
      email: unified.email,
      phone: unified.phone,
      websiteUrl: unified.websiteUrl,
      socialLinks: unified.socialLinks,
      // Map other fields as needed
    };
  }

  private convertUnifiedListingToLegacy(unified: Partial<UnifiedSellerListing>): Partial<SellerListing> {
    return {
      title: unified.title,
      description: unified.description,
      category: unified.category,
      subcategory: unified.subcategory,
      price: unified.price,
      currency: unified.currency,
      quantity: unified.quantity,
      condition: unified.condition,
      images: unified.images,
      tags: unified.tags,
      status: unified.status as any,
      saleType: unified.listingType as any,
      escrowEnabled: unified.escrowEnabled,
      shippingOptions: unified.shippingOptions ? {
        free: unified.shippingOptions.free,
        cost: unified.shippingOptions.cost,
        estimatedDays: unified.shippingOptions.estimatedDays,
        international: unified.shippingOptions.international,
      } : undefined,
      specifications: unified.specifications,
      // Map other fields as needed
    };
  }

  // ============================================================================
  // EXTERNAL DATA TRANSFORMATION
  // ============================================================================

  /**
   * Transform external marketplace listing data to unified format
   * This is useful when receiving data from different marketplace APIs
   */
  transformExternalListing(
    externalListing: any,
    source: 'display' | 'marketplace' | 'seller'
  ): TransformationResult<UnifiedSellerListing> {
    switch (source) {
      case 'display':
        return transformDisplayListingToUnified(externalListing, this.transformationOptions);
      case 'marketplace':
        return transformMarketplaceListingToUnified(externalListing, this.transformationOptions);
      case 'seller':
        return transformSellerListingToUnified(externalListing, this.transformationOptions);
      default:
        throw new Error(`Unknown listing source: ${source}`);
    }
  }

  /**
   * Batch transform multiple listings from different sources
   */
  async batchTransformListings(
    listings: Array<{ data: any; source: 'display' | 'marketplace' | 'seller' }>
  ): Promise<UnifiedSellerListing[]> {
    const results: UnifiedSellerListing[] = [];
    const errors: string[] = [];

    for (const { data, source } of listings) {
      try {
        const transformResult = this.transformExternalListing(data, source);
        results.push(transformResult.data);
      } catch (error) {
        errors.push(`Failed to transform ${source} listing ${data.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (errors.length > 0) {
      console.warn('Batch transformation errors:', errors);
    }

    return results;
  }
}

// Export singleton instance
export const unifiedSellerService = new UnifiedSellerService();