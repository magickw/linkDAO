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
import { getSellerCacheManager } from './sellerCacheManager';

class SellerService {
  private profileCache = new Map<string, { data: SellerProfile | null; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 60 seconds cache

  // Legacy cache management (kept for backward compatibility)
  clearProfileCache(walletAddress?: string): void {
    const cacheManager = getSellerCacheManager();

    if (cacheManager) {
      if (walletAddress) {
        // Use new cache manager
        cacheManager.clearSellerCache(walletAddress);
      } else {
        // Clear all caches - get all wallet addresses from metadata
        const stats = cacheManager.getCacheStats();
        const walletAddresses = [...new Set(stats.metadata.map(m => m.walletAddress))];
        walletAddresses.forEach(address => cacheManager.clearSellerCache(address));
      }
    }

    // Also clear legacy cache
    if (walletAddress) {
      this.profileCache.delete(walletAddress);
    } else {
      this.profileCache.clear();
    }
  }

  // Method to check if a profile is cached (enhanced with new cache manager)
  isProfileCached(walletAddress: string): boolean {
    const cacheManager = getSellerCacheManager();

    if (cacheManager) {
      return cacheManager.isCacheValid(walletAddress, 'profile');
    }

    // Fallback to legacy cache
    const cached = this.profileCache.get(walletAddress);
    if (!cached) return false;

    const now = Date.now();
    return now - cached.timestamp < this.CACHE_DURATION;
  }

  // Method to get cached profile without making a request (enhanced with new cache manager)
  getCachedProfile(walletAddress: string): SellerProfile | null {
    const cacheManager = getSellerCacheManager();

    if (cacheManager) {
      // Try to get from React Query cache via cache manager
      // This is a simplified approach - in practice, you'd use the React Query hooks
      console.log('[SellerService] Using cache manager for profile lookup');
    }

    // Fallback to legacy cache
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
    // Business Information
    { field: 'businessType', required: true, weight: 5 },
    { field: 'legalBusinessName', required: true, weight: 10 },
    { field: 'registeredAddressStreet', required: true, weight: 5 },
    { field: 'registeredAddressCity', required: true, weight: 5 },
    { field: 'registeredAddressCountry', required: true, weight: 5 },
  ];

  // Seller Tiers Configuration
  getSellerTiers(): SellerTier[] {
    return [
      {
        id: 'bronze',
        name: 'Bronze Seller',
        description: 'Entry-level seller for digital goods and NFTs',
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
        id: 'silver',
        name: 'Silver Seller',
        description: 'Verified seller with enhanced features',
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
        id: 'gold',
        name: 'Gold Seller',
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
      },
      {
        id: 'platinum',
        name: 'Platinum Seller',
        description: 'Premium seller with exclusive benefits',
        requirements: ['$100,000+ total sales', '4.5+ star rating', 'Low dispute rate'],
        benefits: [
          'Reduced commission fees (3.5%)',
          'Dedicated account manager',
          'Early access to new features',
          'Custom store branding',
          'Advanced API access'
        ],
        limitations: [
          'Subject to enhanced compliance',
          'Quarterly performance reviews'
        ]
      },
      {
        id: 'diamond',
        name: 'Diamond Seller',
        description: 'VIP seller with maximum benefits',
        requirements: ['$500,000+ total sales', '4.7+ star rating', 'Excellent reputation'],
        benefits: [
          'Lowest commission fees (3%)',
          'White-glove support service',
          'Revenue sharing opportunities',
          'Exclusive seller events',
          'Unlimited withdrawal limits'
        ],
        limitations: [
          'Subject to enhanced compliance',
          'Monthly performance reviews'
        ]
      }
    ];
  }

  // Onboarding Flow - Using Unified API Client
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
        id: 'business-info',
        title: 'Business Information',
        description: 'Provide your business details and address',
        component: 'BusinessInfo',
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

  // Seller Profile Management - Using Unified API Client
  async getSellerProfile(walletAddress: string): Promise<SellerProfile | null> {
    // Check cache first using the new method
    const cachedProfile = this.getCachedProfile(walletAddress);
    if (cachedProfile !== null) {
      console.log(`Returning cached profile for ${walletAddress}`);
      return cachedProfile;
    }

    try {
      console.log(`Fetching seller profile for: ${walletAddress}`);
      const profile = await unifiedSellerAPIClient.getProfile(walletAddress);

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
    } catch (error) {
      console.error('Error fetching seller profile:', error);

      // Handle specific error types gracefully
      if (error instanceof SellerAPIError) {
        if (error.status === 404) {
          // Cache 404 responses as well to prevent repeated calls
          this.profileCache.set(walletAddress, { data: null, timestamp: Date.now() });
          return null;
        }
        if (error.status === 503) {
          console.warn('Seller profile fetch 503, returning null to avoid crashing UI');
          this.profileCache.set(walletAddress, { data: null, timestamp: Date.now() });
          return null;
        }
      }

      // For other errors, don't throw—gracefully return null so the UI can recover
      console.warn(`Failed to fetch seller profile. Returning null.`);
      this.profileCache.set(walletAddress, { data: null, timestamp: Date.now() });
      return null;
    }
  }

  async createSellerProfile(walletAddress: string, profileData: Partial<SellerProfile>): Promise<SellerProfile> {
    console.log(`Creating seller profile for ${walletAddress}:`, profileData);
    return await unifiedSellerAPIClient.createProfile(walletAddress, profileData);
  }

  async updateSellerProfile(walletAddress: string, updates: Partial<SellerProfile>): Promise<SellerProfile> {
    console.log(`Updating seller profile for ${walletAddress}:`, updates);

    const result = await unifiedSellerAPIClient.updateProfile(walletAddress, updates);

    // Trigger cache invalidation via cache manager
    const cacheManager = getSellerCacheManager();
    if (cacheManager) {
      await cacheManager.invalidateSellerCache(walletAddress, {
        immediate: true,
        cascade: true,
        dependencies: ['profile']
      });

      // Trigger profile update event for other components
      window.dispatchEvent(new CustomEvent('seller-profile-updated', {
        detail: { walletAddress, profile: result }
      }));
    }

    // Clear legacy cache
    this.clearProfileCache(walletAddress);

    return result;
  }

  // Enhanced Profile Update with ENS and Image Support - Using Unified API Client
  async updateSellerProfileEnhanced(walletAddress: string, updates: SellerProfileUpdateRequest): Promise<SellerProfileUpdateResponse> {
    console.log(`Updating seller profile enhanced for ${walletAddress}`);
    return await unifiedSellerAPIClient.updateProfileEnhanced(walletAddress, updates);
  }

  // ENS Validation Methods - Using Unified API Client
  async validateENSHandle(ensHandle: string): Promise<ENSValidationResult> {
    try {
      console.log(`Validating ENS handle: ${ensHandle}`);
      return await unifiedSellerAPIClient.validateENS(ensHandle);
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
      console.log(`Verifying ENS ownership: ${ensHandle} for ${walletAddress}`);
      return await unifiedSellerAPIClient.verifyENSOwnership(ensHandle, walletAddress);
    } catch (error) {
      console.error('Error verifying ENS ownership:', error);
      return false;
    }
  }

  // Dashboard Data - Using Unified API Client
  async getDashboardStats(walletAddress: string): Promise<SellerDashboardStats> {
    try {
      console.log(`Fetching dashboard stats for: ${walletAddress}`);
      return await unifiedSellerAPIClient.getDashboardStats(walletAddress);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return this.getDefaultDashboardStats();
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

  // Notifications - Using Unified API Client
  async getNotifications(walletAddress: string): Promise<SellerNotification[]> {
    try {
      console.log(`Fetching notifications for: ${walletAddress}`);
      return await unifiedSellerAPIClient.getNotifications(walletAddress);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    console.log(`Marking notification as read: ${notificationId}`);
    await unifiedSellerAPIClient.markNotificationRead(notificationId);
  }

  // Orders Management - Using Unified API Client
  async getOrders(walletAddress: string, status?: string): Promise<SellerOrder[]> {
    try {
      console.log(`Fetching orders for: ${walletAddress}`, status ? `with status: ${status}` : '');
      return await unifiedSellerAPIClient.getOrders(walletAddress, status);
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: string, data?: any): Promise<void> {
    console.log(`Updating order ${orderId} status to: ${status}`, data);
    await unifiedSellerAPIClient.updateOrderStatus(orderId, status, data);
  }

  /**
   * Transforms backend listing data to the SellerListing interface used by the frontend
   */
  private transformBackendListing(listing: any): SellerListing {
    const enhanced = listing.enhancedData || {};

    // Parse metadata if it's a string (backend stores as JSON)
    const metadata = typeof listing.metadata === 'string'
      ? JSON.parse(listing.metadata)
      : (listing.metadata || {});

    // Title & Description resolution
    const title = enhanced.title || listing.title || listing.metadataURI || 'Untitled Listing';
    const description = enhanced.description || listing.description || '';

    // Category resolution - Handle UUID, slug, or object
    // Backend returns categoryId as UUID, but frontend needs slug for dropdown
    let category = 'other';
    if (typeof listing.category === 'object' && listing.category !== null) {
      // If category is an object with slug/name
      category = listing.category.slug || listing.category.name || 'other';
    } else if (listing.categorySlug) {
      // If backend provides categorySlug directly
      category = listing.categorySlug;
    } else if (listing.category && typeof listing.category === 'string') {
      // If category is already a slug string
      category = listing.category;
    } else if (listing.categoryId && typeof listing.categoryId === 'string') {
      // If categoryId is a UUID, we'll need the categories list to resolve it
      // For now, store it - the edit page will need to resolve it from the categories list
      category = listing.categoryId;
    } else if (listing.mainCategory) {
      category = listing.mainCategory;
    }
    // Ensure category is lowercase to match select options (except for UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(category)) {
      category = category.toString().toLowerCase();
    }

    // Price resolution (Backend uses priceAmount, priceCrypto or price)
    let price = 0;
    if (listing.priceAmount !== undefined) price = parseFloat(listing.priceAmount.toString());
    else if (listing.priceCrypto !== undefined) price = parseFloat(listing.priceCrypto.toString());
    else if (listing.price !== undefined) price = typeof listing.price === 'string' ? parseFloat(listing.price) : listing.price;

    // Image & Tag resolution
    const images = Array.isArray(listing.images) ? listing.images :
      (typeof listing.images === 'string' ? JSON.parse(listing.images) : (enhanced.images || []));
    const tags = Array.isArray(listing.tags) ? listing.tags :
      (typeof listing.tags === 'string' ? JSON.parse(listing.tags) : (enhanced.tags || []));

    // Shipping transformation (Backend uses 'shipping', Frontend expects 'shippingOptions')
    const backendShipping = typeof listing.shipping === 'string' ? JSON.parse(listing.shipping) : listing.shipping;
    const shippingOptions = {
      free: backendShipping?.methods?.standard?.cost === 0,
      cost: backendShipping?.methods?.standard?.cost || 0,
      estimatedDays: backendShipping?.methods?.standard?.estimatedDays || '3-5 days',
      international: !!backendShipping?.methods?.international?.enabled
    };

    // Quantity resolution
    const inventory = listing.inventory !== undefined ? listing.inventory : (listing.inventory ?? (listing.stock ?? 1));

    // Extract specifications from metadata (where they're stored during creation)
    const specifications = metadata.specifications || listing.specifications || enhanced.specifications || {
      weight: { value: 0, unit: 'g' },
      dimensions: { length: 0, width: 0, height: 0, unit: 'cm' }
    };

    // Extract condition from metadata (where it's stored during creation)
    const condition = metadata.condition || enhanced.condition || listing.condition || 'new';

    // Extract itemType from metadata (PHYSICAL, DIGITAL, NFT, SERVICE)
    const itemType = metadata.itemType || enhanced.itemType || (backendShipping ? 'PHYSICAL' : 'DIGITAL');

    // Extract other metadata fields
    const escrowEnabled = metadata.escrowEnabled ?? enhanced.escrowEnabled ?? listing.escrowEnabled ?? true;
    const listingType = metadata.listingType || listing.listingType || 'FIXED_PRICE';
    const royalty = metadata.royalty || listing.royalty || 0;
    const tokenAddress = metadata.tokenAddress || listing.tokenAddress || '';
    const seoTitle = metadata.seoTitle || listing.seoTitle || '';
    const seoDescription = metadata.seoDescription || listing.seoDescription || '';

    return {
      id: listing.id,
      title,
      description,
      category,
      categoryId: listing.categoryId, // Keep UUID for reference
      subcategory: listing.subcategory || listing.subCategory,
      price,
      currency: listing.currency || listing.priceCurrency || 'ETH',
      inventory,
      condition,
      images,
      specifications,
      tags,
      status: listing.status === 'ACTIVE' ? 'active' : (listing.status?.toLowerCase() || 'active'),
      saleType: listing.saleType || (listingType === 'AUCTION' ? 'auction' : 'fixed'),
      escrowEnabled,
      shippingOptions,
      // For the edit form to have raw shipping data if needed
      shipping: backendShipping,
      views: listing.views || enhanced.views || 0,
      favorites: listing.favorites || enhanced.favorites || 0,
      questions: listing.questions || 0,
      createdAt: listing.createdAt || new Date().toISOString(),
      updatedAt: listing.updatedAt || new Date().toISOString(),
      // Additional fields from metadata for edit form
      itemType,
      listingType,
      royalty,
      tokenAddress,
      seoTitle,
      seoDescription,
      metadata // Include raw metadata for any other fields
    } as any; // Cast to any to allow extra fields
  }

  // Orders Management - Using Unified API Client
  async getListings(walletAddress: string, status?: string): Promise<SellerListing[]> {
    try {
      console.log(`[SellerService] Fetching listings for: ${walletAddress}`, status ? `with status: ${status}` : '');
      const backendListings = await unifiedSellerAPIClient.getListings(walletAddress, status);

      console.log(`[SellerService] Backend returned ${backendListings.length} listings`);

      // Transform backend data to match SellerListing interface
      return backendListings.map((listing: any) => this.transformBackendListing(listing));
    } catch (error) {
      console.error('[SellerService] Error fetching listings:', error);
      return [];
    }
  }

  async createListing(walletAddress: string, listingData: Partial<SellerListing>): Promise<SellerListing> {
    console.log(`Creating listing for ${walletAddress}:`, listingData);
    return await unifiedSellerAPIClient.createListing(listingData);
  }

  async updateListing(listingId: string, updates: Partial<SellerListing>): Promise<SellerListing> {
    console.log(`Updating listing ${listingId}:`, updates);
    return await unifiedSellerAPIClient.updateListing(listingId, updates);
  }

  async deleteListing(listingId: string): Promise<void> {
    console.log(`Deleting listing: ${listingId}`);
    await unifiedSellerAPIClient.deleteListing(listingId);
  }

  async getListingById(listingId: string): Promise<SellerListing> {
    console.log(`[SellerService] Fetching listing by ID: ${listingId}`);
    const data = await unifiedSellerAPIClient.getListingById(listingId);
    return this.transformBackendListing(data);
  }
  // Analytics - Using Unified API Client
  async getAnalytics(walletAddress: string, period: string = '30d'): Promise<SellerAnalytics> {
    try {
      console.log(`Fetching analytics for: ${walletAddress}, period: ${period}`);
      return await unifiedSellerAPIClient.getAnalytics(walletAddress, period);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return this.getDefaultSellerAnalytics();
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

  // Verification - Using Unified API Client
  async sendEmailVerification(email: string): Promise<void> {
    console.log(`Sending email verification to: ${email}`);
    await unifiedSellerAPIClient.sendEmailVerification(email);
  }

  async verifyEmail(token: string): Promise<void> {
    console.log(`Verifying email with token: ${token}`);
    await unifiedSellerAPIClient.verifyEmail(token);
  }

  async sendPhoneVerification(phone: string): Promise<void> {
    console.log(`Sending phone verification to: ${phone}`);
    await unifiedSellerAPIClient.sendPhoneVerification(phone);
  }

  async verifyPhone(phone: string, code: string): Promise<void> {
    console.log(`Verifying phone ${phone} with code: ${code}`);
    await unifiedSellerAPIClient.verifyPhone(phone, code);
  }

  // KYC - Using Unified API Client
  async submitKYC(walletAddress: string, kycData: any): Promise<void> {
    console.log(`Submitting KYC for: ${walletAddress}`);
    await unifiedSellerAPIClient.submitKYC(walletAddress, kycData);
  }

  async getKYCStatus(walletAddress: string): Promise<{ status: string; documents: string[] }> {
    console.log(`Fetching KYC status for: ${walletAddress}`);
    return await unifiedSellerAPIClient.getKYCStatus(walletAddress);
  }

  // Payments & Withdrawals - Using Unified API Client
  async getPaymentHistory(walletAddress: string): Promise<any[]> {
    try {
      console.log(`Fetching payment history for: ${walletAddress}`);
      return await unifiedSellerAPIClient.getPaymentHistory(walletAddress);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  async requestWithdrawal(walletAddress: string, amount: number, currency: string, method: string): Promise<void> {
    console.log(`Requesting withdrawal for ${walletAddress}: ${amount} ${currency} via ${method}`);
    await unifiedSellerAPIClient.requestWithdrawal(walletAddress, amount, currency, method);
  }

  // Disputes - Using Unified API Client
  async getDisputes(walletAddress: string): Promise<any[]> {
    try {
      console.log(`Fetching disputes for: ${walletAddress}`);
      return await unifiedSellerAPIClient.getDisputes(walletAddress);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      return [];
    }
  }

  async respondToDispute(disputeId: string, response: string, evidence?: string[]): Promise<void> {
    console.log(`Responding to dispute ${disputeId}:`, response);
    await unifiedSellerAPIClient.respondToDispute(disputeId, response, evidence);
  }

  // Profile Validation and Completeness (keeping existing logic)
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

  // Helper Methods (keeping existing logic)
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
      'businessType': 'Business Type',
      'legalBusinessName': 'Legal Name',
      'registeredAddressStreet': 'Street Address',
      'registeredAddressCity': 'City',
      'registeredAddressCountry': 'Country',
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
}

export const sellerService = new SellerService();