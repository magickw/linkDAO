/**
 * Unified Seller Interfaces
 * 
 * This file contains unified interfaces that resolve data type inconsistencies
 * between DisplayMarketplaceListing, SellerListing, and other seller-related types.
 * 
 * These interfaces provide a consistent data structure across all seller components
 * while maintaining backward compatibility through data transformation utilities.
 */

// ============================================================================
// UNIFIED SELLER LISTING INTERFACE
// ============================================================================

/**
 * Unified interface that resolves mismatches between DisplayMarketplaceListing and SellerListing
 * Combines all necessary fields from both interfaces with consistent typing
 */
export interface UnifiedSellerListing {
  // Core identification
  id: string;
  sellerId: string;
  sellerWalletAddress: string;

  // Basic listing information
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];

  // Pricing information (unified format)
  price: number;
  currency: 'ETH' | 'USDC' | 'DAI' | 'USD';
  displayPrice: string; // Formatted price for display
  displayCurrency: string; // User-friendly currency display

  // Inventory and availability
  inventory: number;
  condition: 'new' | 'used' | 'refurbished';
  availability: 'available' | 'out_of_stock' | 'discontinued';

  // Media and presentation
  images: string[];
  thumbnailUrl: string; // Optimized thumbnail
  featuredImage?: string;

  // Status and lifecycle
  status: 'draft' | 'active' | 'paused' | 'sold' | 'expired' | 'cancelled';
  listingType: 'fixed_price' | 'auction' | 'negotiable';
  saleType: 'physical' | 'digital' | 'nft' | 'service';

  // Engagement metrics
  views: number;
  favorites: number;
  likes: number;
  questions: number;

  // Blockchain and escrow
  isEscrowProtected: boolean;
  isEscrowed: boolean;
  escrowEnabled: boolean;
  tokenAddress?: string;
  tokenId?: string;
  nftStandard?: 'ERC721' | 'ERC1155';

  // Shipping and fulfillment
  shippingOptions: {
    free: boolean;
    cost?: number;
    estimatedDays: string;
    international: boolean;
    regions?: string[];
    expedited?: boolean;
  };

  // Additional metadata
  specifications?: Record<string, string>;
  metadata: ListingMetadata;

  // Timestamps (unified format)
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  startTime?: string;
  endTime?: string;

  // Auction-specific fields
  currentBid?: number;
  minimumBid?: number;
  reservePrice?: number;
  highestBidder?: string;

  // Trust and verification
  trust?: TrustIndicators;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

export interface ListingMetadata {
  specifications?: Record<string, string>;
  condition?: string;
  brand?: string;
  model?: string;
  year?: string;
  dimensions?: string;
  weight?: string;
  materials?: string[];
  colors?: string[];
  sizes?: string[];
  customFields?: Record<string, any>;
}

export interface TrustIndicators {
  verified: boolean;
  escrowProtected: boolean;
  onChainCertified: boolean;
  safetyScore: number;
  badges?: string[];
}

// ============================================================================
// UNIFIED SELLER PROFILE INTERFACE
// ============================================================================

/**
 * Unified seller profile interface for consistent profile data across components
 */
export interface UnifiedSellerProfile {
  // Core identification
  id: string;
  walletAddress: string;

  // Basic profile information
  storeName?: string;
  bio?: string;
  description?: string;
  storeDescription?: string;
  sellerStory?: string;
  location?: string;

  // Media and branding
  profileImageUrl?: string;
  profilePicture?: string;
  profileImageCdn?: string;
  profileImageIpfs?: string;
  logo?: string;
  coverImageUrl?: string;
  coverImage?: string;
  coverImageCdn?: string;
  coverImageIpfs?: string;

  // Image storage (unified format)
  images: {
    profile?: {
      original: string;
      thumbnail: string;
      cdn?: string;
      ipfs?: string;
    };
    cover?: {
      original: string;
      thumbnail: string;
      cdn?: string;
      ipfs?: string;
    };
    logo?: {
      original: string;
      thumbnail: string;
      cdn?: string;
      ipfs?: string;
    };
  };

  // ENS and identity
  ensHandle?: string;
  ensVerified: boolean;
  ensLastVerified?: string;

  // Contact and social
  email?: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  websiteUrl?: string;
  socialLinks: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    linkedin?: string;
    facebook?: string;
    website?: string;
  };

  // Business Information
  legalBusinessName?: string;
  businessType?: string;
  registeredAddressStreet?: string;
  registeredAddressCity?: string;
  registeredAddressState?: string;
  registeredAddressPostalCode?: string;
  registeredAddressCountry?: string;

  // Verification and status
  verificationStatus: {
    email: boolean;
    phone: boolean;
    kyc: 'none' | 'pending' | 'approved' | 'rejected';
    identity: boolean;
  };

  applicationStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  applicationDate: string;
  approvedDate?: string;
  rejectionReason?: string;
  suspensionReason?: string;
  reviewedBy?: string;

  // Tier and reputation
  tier: SellerTier;
  tierProgress: TierProgress;
  reputation: ReputationData;

  // Statistics (unified format)
  stats: SellerStats;

  // Profile completeness
  profileCompleteness: {
    score: number; // 0-100
    missingFields: Array<{
      field: string;
      label: string;
      weight: number;
      required: boolean;
    }>;
    recommendations: Array<{
      action: string;
      description: string;
      impact: number;
    }>;
    lastCalculated: string;
  };

  // Settings and preferences
  settings: SellerSettings;

  // Onboarding progress
  onboardingProgress: OnboardingProgress;

  // Payment and payout
  payoutPreferences: PayoutPreferences;

  // DAO and governance
  daoReputation?: DAOReputation;

  // Verification badges
  badges: string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastActive: string;
  joinDate: string;
}

export interface SellerTier {
  id: 'anonymous' | 'basic' | 'verified' | 'pro';
  name: string;
  level: number;
  description: string;
  requirements: TierRequirement[];
  benefits: TierBenefit[];
  limitations: TierLimitation[];
}

export interface TierRequirement {
  type: 'sales_volume' | 'rating' | 'reviews' | 'time_active';
  value: number;
  current: number;
  met: boolean;
  description: string;
}

export interface TierBenefit {
  type: 'listing_limit' | 'commission_rate' | 'priority_support' | 'analytics_access';
  description: string;
  value: string | number;
}

export interface TierLimitation {
  type: 'listing_limit' | 'withdrawal_limit' | 'feature_access';
  description: string;
  value: string | number;
}

export interface TierProgress {
  currentTier: string;
  nextTier?: string;
  progress: number; // 0-100
  requirements: TierRequirement[];
  estimatedUpgradeDate?: string;
}

export interface ReputationData {
  score: number;
  trend: 'up' | 'down' | 'stable';
  averageRating: number;
  totalReviews: number;
  recentReviews: number;
  badges: string[];
  history: Array<{
    date: string;
    score: number;
    event: string;
  }>;
}

export interface SellerStats {
  // Sales metrics
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;

  // Listing metrics
  activeListings: number;
  totalListings: number;
  completedOrders: number;

  // Engagement metrics
  totalViews: number;
  totalFavorites: number;
  conversionRate: number;

  // Reputation metrics
  averageRating: number;
  totalReviews: number;
  reputationScore: number;

  // Activity metrics
  responseTime: number; // in hours
  fulfillmentRate: number; // percentage
  disputeRate: number; // percentage

  // Time-based metrics
  joinDate: string;
  lastActive: string;
  daysActive: number;
}

export interface SellerSettings {
  notifications: {
    orders: boolean;
    disputes: boolean;
    daoActivity: boolean;
    tips: boolean;
    marketing: boolean;
    system: boolean;
  };
  privacy: {
    showEmail: boolean;
    showPhone: boolean;
    showStats: boolean;
    showLocation: boolean;
  };
  escrow: {
    defaultEnabled: boolean;
    minimumAmount: number;
    autoRelease: boolean;
  };
  shipping: {
    defaultFree: boolean;
    defaultCost: number;
    defaultDays: string;
    internationalEnabled: boolean;
  };
}

export interface OnboardingProgress {
  profileSetup: boolean;
  verification: boolean;
  payoutSetup: boolean;
  firstListing: boolean;
  completed: boolean;
  currentStep: number;
  totalSteps: number;
  steps: OnboardingStep[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  required: boolean;
  completed: boolean;
  data?: any;
}

export interface PayoutPreferences {
  defaultCrypto: string; // USDC, ETH, etc.
  cryptoAddresses: Record<string, string>;
  fiatEnabled: boolean;
  offRampProvider?: 'circle' | 'coinbase' | 'stripe';
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    accountType: 'checking' | 'savings';
    verified: boolean;
  };
  autoWithdraw: boolean;
  minimumWithdraw: number;
}

export interface DAOReputation {
  governanceParticipation: number;
  proposalsSubmitted: number;
  votingHistory: number;
  communityStanding: 'good' | 'excellent' | 'outstanding';
  stakingAmount: number;
  delegatedVotes: number;
}

// ============================================================================
// UNIFIED SELLER DASHBOARD INTERFACE
// ============================================================================

/**
 * Unified dashboard interface for consistent dashboard data across components
 */
export interface UnifiedSellerDashboard {
  // Profile information
  profile: UnifiedSellerProfile;

  // Listings overview
  listings: {
    items: UnifiedSellerListing[];
    summary: ListingsSummary;
  };

  // Orders overview
  orders: {
    items: SellerOrder[];
    summary: OrdersSummary;
  };

  // Analytics and metrics
  analytics: SellerAnalytics;

  // Notifications
  notifications: SellerNotification[];

  // Tier information
  tierInfo: TierInformation;

  // Financial overview
  financial: FinancialOverview;

  // Performance metrics
  performance: PerformanceMetrics;

  // Recent activity
  recentActivity: ActivityItem[];

  // Quick actions
  quickActions: QuickAction[];

  // System status
  systemStatus: SystemStatus;

  // Last updated timestamp
  lastUpdated: string;
}

export interface ListingsSummary {
  total: number;
  active: number;
  draft: number;
  sold: number;
  expired: number;
  paused: number;
  trending: UnifiedSellerListing[];
  recentlyAdded: UnifiedSellerListing[];
}

export interface OrdersSummary {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  disputed: number;
  cancelled: number;
  recent: SellerOrder[];
}

export interface SellerOrder {
  id: string;
  listingId: string;
  listingTitle: string;
  listing?: UnifiedSellerListing;
  buyerAddress: string;
  buyerName?: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  displayAmount: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'disputed' | 'cancelled';
  escrowStatus: 'none' | 'locked' | 'released' | 'disputed';
  paymentMethod: 'crypto' | 'fiat';
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
  timeline: OrderTimelineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export interface OrderTimelineItem {
  id: string;
  status: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SellerAnalytics {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    conversionRate: number;
    averageOrderValue: number;
    growthRate: number;
  };
  sales: {
    daily: Array<{ date: string; amount: number; orders: number }>;
    weekly: Array<{ week: string; amount: number; orders: number }>;
    monthly: Array<{ month: string; amount: number; orders: number }>;
    byCategory: Array<{ category: string; amount: number; percentage: number }>;
    byProduct: Array<{ productId: string; title: string; sales: number; revenue: number }>;
    topPerforming: UnifiedSellerListing[];
  };
  buyers: {
    demographics: {
      countries: Array<{ country: string; count: number }>;
      walletTypes: Array<{ type: string; count: number }>;
      returningCustomers: number;
    };
    behavior: {
      repeatCustomers: number;
      averageOrdersPerCustomer: number;
      customerLifetimeValue: number;
      averageSessionDuration: number;
    };
  };
  reputation: {
    ratingHistory: Array<{ date: string; rating: number }>;
    reviewSentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
    badges: Array<{ badge: string; earnedAt: string }>;
    trends: Array<{ metric: string; trend: 'up' | 'down' | 'stable'; change: number }>;
  };
  traffic: {
    views: Array<{ date: string; views: number }>;
    sources: Array<{ source: string; visits: number; percentage: number }>;
    topPages: Array<{ page: string; views: number }>;
    bounceRate: number;
  };
}

export interface SellerNotification {
  id: string;
  type: 'order' | 'dispute' | 'dao' | 'tip' | 'system' | 'tier' | 'payment';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  actionRequired: boolean;
  actions?: NotificationAction[];
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'link' | 'action' | 'modal';
  url?: string;
  action?: string;
  data?: any;
}

export interface TierInformation {
  current: SellerTier;
  next?: SellerTier;
  progress: TierProgress;
  benefits: TierBenefit[];
  limitations: TierLimitation[];
  upgradeRecommendations: string[];
  history: Array<{
    tier: string;
    achievedAt: string;
    duration: number;
  }>;
}

export interface FinancialOverview {
  balance: {
    crypto: Record<string, number>;
    fiatEquivalent: number;
    pendingEscrow: number;
    availableWithdraw: number;
    totalEarnings: number;
  };
  transactions: {
    recent: TransactionItem[];
    pending: TransactionItem[];
    summary: {
      thisMonth: number;
      lastMonth: number;
      growth: number;
    };
  };
  payouts: {
    scheduled: PayoutItem[];
    completed: PayoutItem[];
    failed: PayoutItem[];
  };
}

export interface TransactionItem {
  id: string;
  type: 'sale' | 'payout' | 'fee' | 'refund' | 'tip';
  amount: number;
  currency: string;
  displayAmount: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  orderId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PayoutItem {
  id: string;
  amount: number;
  currency: string;
  displayAmount: string;
  method: 'crypto' | 'bank' | 'paypal';
  destination: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface PerformanceMetrics {
  kpis: {
    conversionRate: { value: number; trend: 'up' | 'down' | 'stable'; change: number };
    averageOrderValue: { value: number; trend: 'up' | 'down' | 'stable'; change: number };
    customerSatisfaction: { value: number; trend: 'up' | 'down' | 'stable'; change: number };
    responseTime: { value: number; trend: 'up' | 'down' | 'stable'; change: number };
  };
  goals: {
    monthly: { target: number; current: number; progress: number };
    quarterly: { target: number; current: number; progress: number };
    yearly: { target: number; current: number; progress: number };
  };
  benchmarks: {
    industryAverage: Record<string, number>;
    topPerformers: Record<string, number>;
    yourRanking: number;
  };
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'listing' | 'review' | 'message' | 'system';
  title: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
  read: boolean;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  url?: string;
  action?: string;
  priority: number;
  enabled: boolean;
}

export interface SystemStatus {
  online: boolean;
  lastSync: string;
  pendingUpdates: number;
  systemHealth: 'good' | 'warning' | 'error';
  maintenanceMode: boolean;
  announcements: string[];
}

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Utility interfaces for data transformation and backward compatibility
 */
export interface DataTransformationOptions {
  includeDeprecatedFields: boolean;
  validateData: boolean;
  fillMissingFields: boolean;
  preserveOriginalFormat: boolean;
}

export interface TransformationResult<T> {
  data: T;
  warnings: string[];
  errors: string[];
  originalData?: any;
  transformedFields: string[];
}

export interface BackwardCompatibilityMapping {
  fieldMappings: Record<string, string>;
  typeConversions: Record<string, (value: any) => any>;
  defaultValues: Record<string, any>;
  deprecatedFields: string[];
}