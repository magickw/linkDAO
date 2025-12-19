/**
 * Seller Data Transformation Utilities
 * 
 * This file provides utilities to transform between different seller data formats
 * ensuring backward compatibility while migrating to unified interfaces.
 */

import {
  UnifiedSellerListing,
  UnifiedSellerProfile,
  UnifiedSellerDashboard,
  DataTransformationOptions,
  TransformationResult,
  BackwardCompatibilityMapping,
  ListingMetadata,
  TrustIndicators,
  SellerStats,
  ReputationData,
  SellerTier,
  TierProgress
} from '@/types/unifiedSeller';

import { SellerProfile, SellerListing, SellerDashboardStats } from '@/types/seller';

// ============================================================================
// LISTING TRANSFORMATIONS
// ============================================================================

/**
 * Transform DisplayMarketplaceListing to UnifiedSellerListing
 */
export function transformDisplayListingToUnified(
  displayListing: any,
  options: Partial<DataTransformationOptions> = {}
): TransformationResult<UnifiedSellerListing> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const transformedFields: string[] = [];

  try {
    const unified: UnifiedSellerListing = {
      // Core identification
      id: displayListing.id || '',
      sellerId: displayListing.sellerId || displayListing.sellerWalletAddress || '',
      sellerWalletAddress: displayListing.sellerWalletAddress || displayListing.sellerId || '',

      // Basic listing information
      title: displayListing.title || displayListing.metadataURI || 'Untitled Listing',
      description: displayListing.description || '',
      category: displayListing.category || displayListing.itemType?.toLowerCase() || 'uncategorized',
      subcategory: displayListing.subcategory,
      tags: displayListing.tags || [],

      // Pricing information (unified format)
      price: typeof displayListing.price === 'string' ? parseFloat(displayListing.price) : (displayListing.price || 0),
      currency: displayListing.currency || 'ETH',
      displayPrice: formatPrice(displayListing.price, displayListing.currency),
      displayCurrency: formatCurrency(displayListing.currency),

      // Inventory and availability
      quantity: displayListing.quantity || 1,
      condition: displayListing.condition || 'new',
      availability: displayListing.isActive === false ? 'out_of_stock' : 'available',

      // Media and presentation
      images: displayListing.images && Array.isArray(displayListing.images) 
        ? displayListing.images.filter(img => 
            typeof img === 'string' && 
            !img.startsWith('0x') && 
            img.length > 0 && 
            (img.startsWith('http') || img.startsWith('ipfs') || img.startsWith('Qm') || img.startsWith('baf'))
          )
        : [displayListing.image].filter(Boolean).filter(img => 
            typeof img === 'string' && 
            !img.startsWith('0x') && 
            img.length > 0 && 
            (img.startsWith('http') || img.startsWith('ipfs') || img.startsWith('Qm') || img.startsWith('baf'))
          ),
      thumbnailUrl: displayListing.image || displayListing.images?.[0] || '',
      featuredImage: displayListing.featuredImage || displayListing.images?.[0],

      // Status and lifecycle
      status: mapListingStatus(displayListing.status, displayListing.isActive),
      listingType: displayListing.listingType?.toLowerCase() || displayListing.saleType || 'fixed_price',
      saleType: displayListing.itemType?.toLowerCase() || displayListing.saleType || 'physical',

      // Engagement metrics
      views: displayListing.views || 0,
      favorites: displayListing.favorites || displayListing.likes || 0,
      likes: displayListing.likes || displayListing.favorites || 0,
      questions: displayListing.questions || 0,

      // Blockchain and escrow
      isEscrowProtected: displayListing.isEscrowProtected || displayListing.isEscrowed || false,
      isEscrowed: displayListing.isEscrowed || displayListing.isEscrowProtected || false,
      escrowEnabled: displayListing.escrowEnabled || displayListing.isEscrowed || false,
      tokenAddress: displayListing.tokenAddress,
      tokenId: displayListing.tokenId,
      nftStandard: displayListing.nftStandard,

      // Shipping and fulfillment
      shippingOptions: transformShippingOptions(displayListing.shippingOptions || displayListing.shipping),

      // Additional metadata
      specifications: displayListing.specifications,
      metadata: transformListingMetadata(displayListing),

      // Timestamps (unified format)
      createdAt: formatTimestamp(displayListing.createdAt || displayListing.startTime),
      updatedAt: formatTimestamp(displayListing.updatedAt),
      publishedAt: formatTimestamp(displayListing.publishedAt),
      startTime: formatTimestamp(displayListing.startTime),
      endTime: formatTimestamp(displayListing.endTime),

      // Auction-specific fields
      currentBid: displayListing.currentBid ? parseFloat(displayListing.currentBid) : undefined,
      minimumBid: displayListing.minimumBid ? parseFloat(displayListing.minimumBid) : undefined,
      reservePrice: displayListing.reservePrice ? parseFloat(displayListing.reservePrice) : undefined,
      highestBidder: displayListing.highestBidderWalletAddress,

      // Trust and verification
      trust: transformTrustIndicators(displayListing.trust),
      verificationStatus: displayListing.verificationStatus
    };

    // Track transformed fields
    if (displayListing.metadataURI && !displayListing.title) {
      transformedFields.push('title');
      warnings.push('Used metadataURI as title fallback');
    }

    if (displayListing.itemType && !displayListing.category) {
      transformedFields.push('category');
      warnings.push('Mapped itemType to category');
    }

    return {
      data: unified,
      warnings,
      errors,
      originalData: options.preserveOriginalFormat ? displayListing : undefined,
      transformedFields
    };
  } catch (error) {
    errors.push(`Transformation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to transform DisplayMarketplaceListing: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Transform SellerListing to UnifiedSellerListing
 */
export function transformSellerListingToUnified(
  sellerListing: SellerListing,
  options: Partial<DataTransformationOptions> = {}
): TransformationResult<UnifiedSellerListing> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const transformedFields: string[] = [];

  try {
    // Handle both old format and new backend format
    // Backend may return: { categoryId, inventory, shipping (JSON), ... }
    // instead of: { category, quantity, shippingOptions, ... }
    const backendListing = sellerListing as any;

    // Parse shipping from JSON if it's a string (backend format)
    let shippingOptions = {
      free: false,
      cost: 0,
      estimatedDays: 5,
      international: false,
    };
    if (backendListing.shippingOptions) {
      shippingOptions = backendListing.shippingOptions;
    } else if (backendListing.shipping) {
      if (typeof backendListing.shipping === 'string') {
        try {
          const parsed = JSON.parse(backendListing.shipping);
          shippingOptions = {
            free: parsed.free ?? false,
            cost: parsed.cost ?? 0,
            estimatedDays: parsed.estimatedDays ?? 5,
            international: parsed.international ?? false,
          };
        } catch {
          // Keep default
        }
      } else if (typeof backendListing.shipping === 'object') {
        shippingOptions = {
          free: backendListing.shipping.free ?? false,
          cost: backendListing.shipping.cost ?? 0,
          estimatedDays: backendListing.shipping.estimatedDays ?? 5,
          international: backendListing.shipping.international ?? false,
        };
      }
    }

    // Parse specifications from metadata if available
    let specifications: any[] = [];
    if (backendListing.specifications) {
      specifications = backendListing.specifications;
    } else if (backendListing.metadata) {
      const metadata = typeof backendListing.metadata === 'string'
        ? JSON.parse(backendListing.metadata)
        : backendListing.metadata;
      if (metadata?.specifications) {
        specifications = metadata.specifications;
      }
    }

    // Get quantity from either quantity or inventory field
    const quantity = backendListing.quantity ?? backendListing.inventory ?? 0;

    // Get category from either category or categoryId
    const category = backendListing.category || backendListing.categoryId || '';

    // Get price - handle both number and string
    const price = typeof backendListing.price === 'string'
      ? parseFloat(backendListing.price)
      : (backendListing.price ?? 0);

    // Get images - handle both array and JSON string, and filter out any wallet addresses
    let images = backendListing.images || [];
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images);
      } catch {
        images = [];
      }
    }
    
    // Ensure images is an array and filter out any items that look like wallet addresses
    if (Array.isArray(images)) {
      images = images.filter(img => 
        typeof img === 'string' && 
        !img.startsWith('0x') && 
        img.length > 0 && 
        (img.startsWith('http') || img.startsWith('ipfs') || img.startsWith('Qm') || img.startsWith('baf'))
      );
    } else {
      images = [];
    }

    const unified: UnifiedSellerListing = {
      // Core identification
      id: sellerListing.id,
      sellerId: '', // Will be filled by context
      sellerWalletAddress: '', // Will be filled by context

      // Basic listing information
      title: sellerListing.title,
      description: sellerListing.description,
      category: category,
      subcategory: backendListing.subcategory || '',
      tags: Array.isArray(backendListing.tags)
        ? backendListing.tags
        : (typeof backendListing.tags === 'string' ? JSON.parse(backendListing.tags || '[]') : []),

      // Pricing information
      price: price,
      currency: (backendListing.currency || backendListing.priceCurrency || 'USD') as any,
      displayPrice: formatPrice(price, backendListing.currency || backendListing.priceCurrency || 'USD'),
      displayCurrency: formatCurrency(backendListing.currency || backendListing.priceCurrency || 'USD'),

      // Inventory and availability
      quantity: quantity,
      condition: backendListing.condition || 'new',
      availability: backendListing.status === 'active' ? 'available' : 'out_of_stock',

      // Media and presentation
      images: images,
      thumbnailUrl: images[0] || '',
      featuredImage: images[0],

      // Status and lifecycle
      status: backendListing.status || 'draft',
      listingType: (backendListing.saleType || backendListing.listingType || 'buy_now') as any,
      saleType: 'physical', // Default assumption

      // Engagement metrics
      views: backendListing.views || 0,
      favorites: backendListing.favorites || 0,
      likes: backendListing.favorites || 0, // Map favorites to likes
      questions: backendListing.questions || 0,

      // Blockchain and escrow
      isEscrowProtected: backendListing.escrowEnabled ?? false,
      isEscrowed: backendListing.escrowEnabled ?? false,
      escrowEnabled: backendListing.escrowEnabled ?? false,

      // Shipping and fulfillment
      shippingOptions: shippingOptions,

      // Additional metadata
      specifications: specifications,
      metadata: {
        specifications: specifications,
        condition: backendListing.condition || 'new',
      },

      // Timestamps
      createdAt: backendListing.createdAt || new Date(),
      updatedAt: backendListing.updatedAt || new Date(),
    };

    transformedFields.push('likes'); // Mapped from favorites
    if (backendListing.inventory !== undefined) {
      transformedFields.push('quantity'); // Mapped from inventory
    }
    if (backendListing.categoryId !== undefined) {
      transformedFields.push('category'); // Mapped from categoryId
    }

    return {
      data: unified,
      warnings,
      errors,
      originalData: options.preserveOriginalFormat ? sellerListing : undefined,
      transformedFields
    };
  } catch (error) {
    errors.push(`Transformation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to transform SellerListing: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Transform MarketplaceListing (from service) to UnifiedSellerListing
 */
export function transformMarketplaceListingToUnified(
  marketplaceListing: any,
  options: Partial<DataTransformationOptions> = {}
): TransformationResult<UnifiedSellerListing> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const transformedFields: string[] = [];

  try {
    // Ensure images is always an array and doesn't contain wallet addresses
    let images: string[] = [];
    if (Array.isArray(marketplaceListing.images)) {
      // Filter out any items that look like wallet addresses (0x... format)
      images = marketplaceListing.images.filter(img => 
        typeof img === 'string' && 
        !img.startsWith('0x') && 
        img.length > 0 && 
        (img.startsWith('http') || img.startsWith('ipfs') || img.startsWith('Qm') || img.startsWith('baf'))
      );
    } else if (typeof marketplaceListing.images === 'string') {
      // If images is a string, try to parse as JSON
      try {
        const parsedImages = JSON.parse(marketplaceListing.images);
        if (Array.isArray(parsedImages)) {
          images = parsedImages.filter(img => 
            typeof img === 'string' && 
            !img.startsWith('0x') && 
            img.length > 0 && 
            (img.startsWith('http') || img.startsWith('ipfs') || img.startsWith('Qm') || img.startsWith('baf'))
          );
        }
      } catch {
        // If parsing fails, treat as empty array
        images = [];
      }
    }

    const unified: UnifiedSellerListing = {
      // Core identification
      id: marketplaceListing.id,
      sellerId: marketplaceListing.sellerAddress || marketplaceListing.sellerWalletAddress,
      sellerWalletAddress: marketplaceListing.sellerWalletAddress || marketplaceListing.sellerAddress,

      // Basic listing information
      title: marketplaceListing.title || marketplaceListing.metadataURI || 'Untitled',
      description: marketplaceListing.description || '',
      category: marketplaceListing.category || marketplaceListing.itemType?.toLowerCase() || 'uncategorized',
      tags: [],

      // Pricing information
      price: typeof marketplaceListing.price === 'string' ? parseFloat(marketplaceListing.price) : marketplaceListing.price,
      currency: marketplaceListing.currency || 'ETH',
      displayPrice: formatPrice(marketplaceListing.price, marketplaceListing.currency),
      displayCurrency: formatCurrency(marketplaceListing.currency),

      // Inventory and availability
      quantity: marketplaceListing.quantity || 1,
      condition: 'new', // Default
      availability: marketplaceListing.isActive ? 'available' : 'out_of_stock',

      // Media and presentation
      images: images,
      thumbnailUrl: images[0] || '',

      // Status and lifecycle
      status: mapMarketplaceStatus(marketplaceListing.status, marketplaceListing.isActive),
      listingType: marketplaceListing.listingType?.toLowerCase() || 'fixed_price',
      saleType: marketplaceListing.itemType?.toLowerCase() || 'physical',

      // Engagement metrics
      views: 0,
      favorites: 0,
      likes: 0,
      questions: 0,

      // Blockchain and escrow
      isEscrowProtected: marketplaceListing.isEscrowed || false,
      isEscrowed: marketplaceListing.isEscrowed || false,
      escrowEnabled: marketplaceListing.isEscrowed || false,
      tokenAddress: marketplaceListing.tokenAddress,
      tokenId: marketplaceListing.tokenId,
      nftStandard: marketplaceListing.nftStandard,

      // Shipping and fulfillment
      shippingOptions: {
        free: false,
        estimatedDays: '3-5',
        international: false,
      },

      // Metadata
      specifications: {},
      metadata: {
        specifications: {},
      },

      // Timestamps
      createdAt: formatTimestamp(marketplaceListing.createdAt),
      updatedAt: formatTimestamp(marketplaceListing.updatedAt),
      startTime: formatTimestamp(marketplaceListing.startTime),
      endTime: formatTimestamp(marketplaceListing.endTime),
    };

    if (!marketplaceListing.title && marketplaceListing.metadataURI) {
      transformedFields.push('title');
      warnings.push('Used metadataURI as title fallback');
    }

    // Add warning if images were filtered due to wallet addresses
    if (marketplaceListing.images && Array.isArray(marketplaceListing.images)) {
      const originalCount = marketplaceListing.images.length;
      const filteredCount = images.length;
      if (originalCount > filteredCount) {
        warnings.push(`Filtered ${originalCount - filteredCount} invalid image URLs (likely wallet addresses)`);
      }
    }

    return {
      data: unified,
      warnings,
      errors,
      originalData: options.preserveOriginalFormat ? marketplaceListing : undefined,
      transformedFields
    };
  } catch (error) {
    errors.push(`Transformation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to transform MarketplaceListing: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// PROFILE TRANSFORMATIONS
// ============================================================================

/**
 * Transform SellerProfile to UnifiedSellerProfile
 */
export function transformSellerProfileToUnified(
  sellerProfile: SellerProfile,
  options: Partial<DataTransformationOptions> = {}
): TransformationResult<UnifiedSellerProfile> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const transformedFields: string[] = [];

  try {
    const unified: UnifiedSellerProfile = {
      // Core identification
      id: sellerProfile.id,
      walletAddress: sellerProfile.walletAddress,

      // Basic profile information
      storeName: sellerProfile.storeName,
      bio: sellerProfile.bio,
      description: sellerProfile.description,
      sellerStory: sellerProfile.sellerStory,
      location: sellerProfile.location,

      // Media and branding
      profileImageUrl: sellerProfile.profilePicture,
      profilePicture: sellerProfile.profilePicture,
      logo: sellerProfile.logo,
      coverImageUrl: sellerProfile.coverImage,
      coverImage: sellerProfile.coverImage,

      // Image storage (unified format)
      images: {
        profile: sellerProfile.profilePicture ? {
          original: sellerProfile.profilePicture,
          thumbnail: sellerProfile.profilePicture,
          cdn: sellerProfile.profileImageCdn,
          ipfs: sellerProfile.profileImageIpfs,
        } : undefined,
        cover: sellerProfile.coverImage ? {
          original: sellerProfile.coverImage,
          thumbnail: sellerProfile.coverImage,
          cdn: sellerProfile.coverImageCdn,
          ipfs: sellerProfile.coverImageIpfs,
        } : undefined,
        logo: sellerProfile.logo ? {
          original: sellerProfile.logo,
          thumbnail: sellerProfile.logo,
        } : undefined,
      },

      // ENS and identity
      ensHandle: sellerProfile.ensHandle,
      ensVerified: sellerProfile.ensVerified,
      ensLastVerified: sellerProfile.ensLastVerified,

      // Contact and social
      email: sellerProfile.email,
      emailVerified: sellerProfile.emailVerified,
      phone: sellerProfile.phone,
      phoneVerified: sellerProfile.phoneVerified,
      websiteUrl: sellerProfile.websiteUrl,
      socialLinks: sellerProfile.socialLinks || {},

      // Verification and status
      verificationStatus: {
        email: sellerProfile.emailVerified,
        phone: sellerProfile.phoneVerified,
        kyc: sellerProfile.kycStatus,
        identity: sellerProfile.kycStatus === 'approved',
      },

      applicationStatus: sellerProfile.applicationStatus,
      applicationDate: sellerProfile.applicationDate,
      approvedDate: sellerProfile.approvedDate,
      rejectionReason: sellerProfile.rejectionReason,
      suspensionReason: sellerProfile.suspensionReason,
      reviewedBy: sellerProfile.reviewedBy,

      // Tier and reputation
      tier: transformSellerTier(sellerProfile.tier),
      tierProgress: transformTierProgress(sellerProfile),
      reputation: transformReputationData(sellerProfile.stats),

      // Statistics
      stats: transformSellerStats(sellerProfile.stats),

      // Profile completeness
      profileCompleteness: sellerProfile.profileCompleteness,

      // Settings and preferences
      settings: {
        notifications: {
          orders: sellerProfile.settings?.notifications?.orders ?? true,
          disputes: sellerProfile.settings?.notifications?.disputes ?? true,
          daoActivity: sellerProfile.settings?.notifications?.daoActivity ?? true,
          tips: sellerProfile.settings?.notifications?.tips ?? true,
          marketing: sellerProfile.settings?.notifications?.marketing ?? false,
          system: (sellerProfile.settings?.notifications as any)?.system ?? true,
        },
        privacy: {
          showEmail: sellerProfile.settings?.privacy?.showEmail ?? false,
          showPhone: sellerProfile.settings?.privacy?.showPhone ?? false,
          showStats: sellerProfile.settings?.privacy?.showStats ?? true,
          showLocation: (sellerProfile.settings?.privacy as any)?.showLocation ?? true,
        },
        escrow: {
          defaultEnabled: (sellerProfile.settings?.escrow as any)?.defaultEnabled ?? false,
          minimumAmount: (sellerProfile.settings?.escrow as any)?.minimumAmount ?? 0,
          autoRelease: (sellerProfile.settings?.escrow as any)?.autoRelease ?? false,
        },
        shipping: {
          defaultFree: (sellerProfile.settings as any)?.shipping?.defaultFree ?? false,
          defaultCost: (sellerProfile.settings as any)?.shipping?.defaultCost ?? 0,
          defaultDays: (sellerProfile.settings as any)?.shipping?.defaultDays ?? '3-5',
          internationalEnabled: (sellerProfile.settings as any)?.shipping?.internationalEnabled ?? false,
        },
      },

      // Onboarding progress
      onboardingProgress: {
        ...sellerProfile.onboardingProgress,
        steps: (sellerProfile.onboardingProgress as any)?.steps || [],
      },

      // Payment and payout (with defensive defaults)
      payoutPreferences: sellerProfile.payoutPreferences ? {
        defaultCrypto: sellerProfile.payoutPreferences.defaultCrypto || 'ETH',
        cryptoAddresses: sellerProfile.payoutPreferences.cryptoAddresses || {},
        fiatEnabled: sellerProfile.payoutPreferences.fiatEnabled ?? false,
        offRampProvider: sellerProfile.payoutPreferences.offRampProvider,
        bankAccount: sellerProfile.payoutPreferences.bankAccount ? {
          ...sellerProfile.payoutPreferences.bankAccount,
          verified: (sellerProfile.payoutPreferences.bankAccount as any)?.verified ?? false,
        } : undefined,
        autoWithdraw: (sellerProfile.payoutPreferences as any)?.autoWithdraw ?? false,
        minimumWithdraw: (sellerProfile.payoutPreferences as any)?.minimumWithdraw ?? 0,
      } : {
        // Default payout preferences if missing
        defaultCrypto: 'ETH',
        cryptoAddresses: {},
        fiatEnabled: false,
        offRampProvider: undefined,
        bankAccount: undefined,
        autoWithdraw: false,
        minimumWithdraw: 0,
      },

      // DAO and governance
      daoReputation: sellerProfile.daoReputation ? {
        ...sellerProfile.daoReputation,
        stakingAmount: (sellerProfile.daoReputation as any)?.stakingAmount ?? 0,
        delegatedVotes: (sellerProfile.daoReputation as any)?.delegatedVotes ?? 0,
      } : undefined,

      // Verification badges
      badges: sellerProfile.badges,

      // Timestamps
      createdAt: sellerProfile.createdAt,
      updatedAt: sellerProfile.updatedAt,
      lastActive: sellerProfile.stats.lastActive,
      joinDate: sellerProfile.stats.joinDate,
    };

    return {
      data: unified,
      warnings,
      errors,
      originalData: options.preserveOriginalFormat ? sellerProfile : undefined,
      transformedFields
    };
  } catch (error) {
    errors.push(`Transformation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to transform SellerProfile: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// DASHBOARD TRANSFORMATIONS
// ============================================================================

/**
 * Transform SellerDashboardStats to UnifiedSellerDashboard
 */
export function transformDashboardStatsToUnified(
  dashboardStats: SellerDashboardStats,
  profile: UnifiedSellerProfile,
  listings: UnifiedSellerListing[],
  options: Partial<DataTransformationOptions> = {}
): TransformationResult<UnifiedSellerDashboard> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const transformedFields: string[] = [];

  try {
    const unified: UnifiedSellerDashboard = {
      // Profile information
      profile,

      // Listings overview
      listings: {
        items: listings,
        summary: {
          total: dashboardStats.listings.active + dashboardStats.listings.draft + dashboardStats.listings.sold + dashboardStats.listings.expired,
          active: dashboardStats.listings.active,
          draft: dashboardStats.listings.draft,
          sold: dashboardStats.listings.sold,
          expired: dashboardStats.listings.expired,
          paused: 0, // Not available in original
          trending: listings.slice(0, 5), // Top 5 as trending
          recentlyAdded: listings.slice(0, 3), // Top 3 as recently added
        },
      },

      // Orders overview
      orders: {
        items: [], // Would need to be provided separately
        summary: {
          total: Object.values(dashboardStats.orders).reduce((sum, count) => sum + count, 0),
          pending: dashboardStats.orders.pending,
          processing: dashboardStats.orders.processing,
          shipped: dashboardStats.orders.shipped,
          delivered: dashboardStats.orders.delivered,
          disputed: dashboardStats.orders.disputed,
          cancelled: 0, // Not available in original
          recent: [], // Would need to be provided separately
        },
      },

      // Analytics and metrics
      analytics: {
        overview: {
          totalRevenue: dashboardStats.sales.total,
          totalOrders: Object.values(dashboardStats.orders).reduce((sum, count) => sum + count, 0),
          conversionRate: 0, // Would need to be calculated
          averageOrderValue: dashboardStats.sales.total / Math.max(1, Object.values(dashboardStats.orders).reduce((sum, count) => sum + count, 0)),
          growthRate: 0, // Would need historical data
        },
        sales: {
          daily: [],
          weekly: [],
          monthly: [],
          byCategory: [],
          byProduct: [],
          topPerforming: listings.slice(0, 5),
        },
        buyers: {
          demographics: {
            countries: [],
            walletTypes: [],
            returningCustomers: 0,
          },
          behavior: {
            repeatCustomers: 0,
            averageOrdersPerCustomer: 0,
            customerLifetimeValue: 0,
            averageSessionDuration: 0,
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
          trends: [],
        },
        traffic: {
          views: [],
          sources: [],
          topPages: [],
          bounceRate: 0,
        },
      },

      // Notifications
      notifications: [], // Would need to be provided separately

      // Tier information
      tierInfo: {
        current: profile.tier,
        next: undefined, // Would need to be calculated
        progress: profile.tierProgress,
        benefits: profile.tier.benefits,
        limitations: profile.tier.limitations,
        upgradeRecommendations: [],
        history: [],
      },

      // Financial overview
      financial: {
        balance: {
          crypto: dashboardStats.balance.crypto,
          fiatEquivalent: dashboardStats.balance.fiatEquivalent,
          pendingEscrow: dashboardStats.balance.pendingEscrow,
          availableWithdraw: dashboardStats.balance.availableWithdraw,
          totalEarnings: dashboardStats.sales.total,
        },
        transactions: {
          recent: [],
          pending: [],
          summary: {
            thisMonth: dashboardStats.sales.thisMonth,
            lastMonth: 0, // Not available
            growth: 0, // Would need to be calculated
          },
        },
        payouts: {
          scheduled: [],
          completed: [],
          failed: [],
        },
      },

      // Performance metrics
      performance: {
        kpis: {
          conversionRate: { value: 0, trend: 'stable', change: 0 },
          averageOrderValue: { value: dashboardStats.sales.total / Math.max(1, Object.values(dashboardStats.orders).reduce((sum, count) => sum + count, 0)), trend: 'stable', change: 0 },
          customerSatisfaction: { value: dashboardStats.reputation.averageRating, trend: dashboardStats.reputation.trend === 'up' ? 'up' : dashboardStats.reputation.trend === 'down' ? 'down' : 'stable', change: 0 },
          responseTime: { value: 0, trend: 'stable', change: 0 },
        },
        goals: {
          monthly: { target: 0, current: dashboardStats.sales.thisMonth, progress: 0 },
          quarterly: { target: 0, current: 0, progress: 0 },
          yearly: { target: 0, current: dashboardStats.sales.total, progress: 0 },
        },
        benchmarks: {
          industryAverage: {},
          topPerformers: {},
          yourRanking: 0,
        },
      },

      // Recent activity
      recentActivity: [],

      // Quick actions
      quickActions: [
        { id: '1', title: 'Create Listing', description: 'Add a new product', icon: 'plus', url: '/seller/listings/new', priority: 1, enabled: true },
        { id: '2', title: 'View Orders', description: 'Check pending orders', icon: 'orders', url: '/seller/orders', priority: 2, enabled: true },
        { id: '3', title: 'Analytics', description: 'View performance', icon: 'chart', url: '/seller/analytics', priority: 3, enabled: true },
      ],

      // System status
      systemStatus: {
        online: true,
        lastSync: new Date().toISOString(),
        pendingUpdates: 0,
        systemHealth: 'good',
        maintenanceMode: false,
        announcements: [],
      },

      // Last updated timestamp
      lastUpdated: new Date().toISOString(),
    };

    warnings.push('Some fields were not available in original data and were set to defaults');
    transformedFields.push('analytics', 'notifications', 'recentActivity');

    return {
      data: unified,
      warnings,
      errors,
      originalData: options.preserveOriginalFormat ? dashboardStats : undefined,
      transformedFields
    };
  } catch (error) {
    errors.push(`Transformation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to transform SellerDashboardStats: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatPrice(price: any, currency?: string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '0';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'USD' ? 2 : 4,
    maximumFractionDigits: currency === 'USD' ? 2 : 6,
  }).format(numPrice);
}

function formatCurrency(currency?: string): string {
  const currencyMap: Record<string, string> = {
    'ETH': 'Ethereum',
    'USDC': 'USD Coin',
    'DAI': 'Dai',
    'USD': 'US Dollar',
  };
  return currencyMap[currency || 'ETH'] || currency || 'Ethereum';
}

function formatTimestamp(timestamp: any): string {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (typeof timestamp === 'string') return new Date(timestamp).toISOString();
  if (typeof timestamp === 'number') return new Date(timestamp).toISOString();
  return new Date().toISOString();
}

function mapListingStatus(status: any, isActive?: boolean): UnifiedSellerListing['status'] {
  if (typeof status === 'string') {
    const statusMap: Record<string, UnifiedSellerListing['status']> = {
      'ACTIVE': 'active',
      'SOLD': 'sold',
      'DRAFT': 'draft',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'expired',
      'active': 'active',
      'sold': 'sold',
      'draft': 'draft',
      'paused': 'paused',
      'expired': 'expired',
      'cancelled': 'cancelled',
    };
    return statusMap[status] || 'draft';
  }

  if (isActive === false) return 'paused';
  return 'active';
}

function mapMarketplaceStatus(status: any, isActive?: boolean): UnifiedSellerListing['status'] {
  if (typeof status === 'string') {
    const statusMap: Record<string, UnifiedSellerListing['status']> = {
      'ACTIVE': 'active',
      'SOLD': 'sold',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'expired',
    };
    return statusMap[status] || (isActive ? 'active' : 'draft');
  }

  return isActive ? 'active' : 'draft';
}

function transformShippingOptions(shipping: any): UnifiedSellerListing['shippingOptions'] {
  if (!shipping) {
    return {
      free: false,
      estimatedDays: '3-5',
      international: false,
    };
  }

  return {
    free: shipping.free || false,
    cost: shipping.cost,
    estimatedDays: shipping.estimatedDays || '3-5',
    international: shipping.international || false,
    regions: shipping.regions,
    expedited: shipping.expedited,
  };
}

function transformListingMetadata(listing: any): ListingMetadata {
  return {
    specifications: listing.specifications || {},
    condition: listing.condition,
    brand: listing.brand,
    model: listing.model,
    year: listing.year,
    dimensions: listing.dimensions,
    weight: listing.weight,
    materials: listing.materials,
    colors: listing.colors,
    sizes: listing.sizes,
    customFields: listing.customFields || {},
  };
}

function transformTrustIndicators(trust: any): TrustIndicators | undefined {
  if (!trust) return undefined;

  return {
    verified: trust.verified || false,
    escrowProtected: trust.escrowProtected || false,
    onChainCertified: trust.onChainCertified || false,
    safetyScore: trust.safetyScore || 0,
    badges: trust.badges || [],
  };
}

function transformSellerTier(tierId: string): SellerTier {
  // Default tier structure - would be loaded from configuration
  const defaultTiers: Record<string, SellerTier> = {
    'anonymous': {
      id: 'anonymous',
      name: 'Anonymous',
      level: 0,
      description: 'Basic seller access',
      requirements: [],
      benefits: [],
      limitations: [],
    },
    'basic': {
      id: 'basic',
      name: 'Basic',
      level: 1,
      description: 'Verified seller',
      requirements: [],
      benefits: [],
      limitations: [],
    },
    'verified': {
      id: 'verified',
      name: 'Verified',
      level: 2,
      description: 'Fully verified seller',
      requirements: [],
      benefits: [],
      limitations: [],
    },
    'pro': {
      id: 'pro',
      name: 'Professional',
      level: 3,
      description: 'Professional seller',
      requirements: [],
      benefits: [],
      limitations: [],
    },
  };

  return defaultTiers[tierId] || defaultTiers['anonymous'];
}

function transformTierProgress(profile: SellerProfile): TierProgress {
  return {
    currentTier: profile.tier,
    nextTier: undefined, // Would need to be calculated
    progress: 0, // Would need to be calculated
    requirements: [],
    estimatedUpgradeDate: undefined,
  };
}

function transformReputationData(stats: any): ReputationData {
  return {
    score: stats?.reputationScore || 0,
    trend: 'stable',
    averageRating: stats?.averageRating || 0,
    totalReviews: stats?.totalReviews || 0,
    recentReviews: 0,
    badges: [],
    history: [],
  };
}

function transformSellerStats(stats: any): SellerStats {
  return {
    // Sales metrics
    totalSales: stats?.totalSales || 0,
    totalRevenue: stats?.totalSales || 0,
    averageOrderValue: 0,

    // Listing metrics
    activeListings: stats?.activeListings || 0,
    totalListings: stats?.activeListings || 0,
    completedOrders: stats?.completedOrders || 0,

    // Engagement metrics
    totalViews: 0,
    totalFavorites: 0,
    conversionRate: 0,

    // Reputation metrics
    averageRating: stats?.averageRating || 0,
    totalReviews: stats?.totalReviews || 0,
    reputationScore: stats?.reputationScore || 0,

    // Activity metrics
    responseTime: 0,
    fulfillmentRate: 0,
    disputeRate: 0,

    // Time-based metrics
    joinDate: stats?.joinDate || new Date().toISOString(),
    lastActive: stats?.lastActive || new Date().toISOString(),
    daysActive: 0,
  };
}

// ============================================================================
// BACKWARD COMPATIBILITY MAPPINGS
// ============================================================================

export const DISPLAY_LISTING_COMPATIBILITY: BackwardCompatibilityMapping = {
  fieldMappings: {
    'metadataURI': 'title',
    'itemType': 'category',
    'isEscrowProtected': 'escrowEnabled',
    'likes': 'favorites',
  },
  typeConversions: {
    'price': (value: any) => typeof value === 'string' ? parseFloat(value) : value,
    'createdAt': (value: any) => formatTimestamp(value),
  },
  defaultValues: {
    'views': 0,
    'favorites': 0,
    'questions': 0,
    'tags': [],
  },
  deprecatedFields: ['metadataURI', 'itemType', 'isEscrowProtected'],
};

export const SELLER_LISTING_COMPATIBILITY: BackwardCompatibilityMapping = {
  fieldMappings: {
    'favorites': 'likes',
  },
  typeConversions: {},
  defaultValues: {
    'likes': 0,
  },
  deprecatedFields: [],
};

export const MARKETPLACE_LISTING_COMPATIBILITY: BackwardCompatibilityMapping = {
  fieldMappings: {
    'sellerAddress': 'sellerWalletAddress',
    'isActive': 'status',
  },
  typeConversions: {
    'price': (value: any) => typeof value === 'string' ? parseFloat(value) : value,
    'isActive': (value: boolean) => value ? 'active' : 'draft',
  },
  defaultValues: {
    'views': 0,
    'favorites': 0,
    'likes': 0,
    'questions': 0,
    'tags': [],
    'images': [],
  },
  deprecatedFields: ['isActive'],
};