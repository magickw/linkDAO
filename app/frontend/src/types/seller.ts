export interface SellerTier {
  id: 'anonymous' | 'basic' | 'verified' | 'pro';
  name: string;
  description: string;
  requirements: string[];
  benefits: string[];
  limitations: string[];
}

export interface SellerProfile {
  id: string;
  walletAddress: string;
  tier: SellerTier['id'];
  
  // Basic Profile
  displayName?: string;
  storeName?: string;
  profilePicture?: string;
  logo?: string;
  bio?: string;
  description?: string;
  
  // Verification Data
  email?: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  kycDocuments?: string[];
  
  // DAO Reputation
  daoReputation?: {
    governanceParticipation: number;
    proposalsSubmitted: number;
    votingHistory: number;
    communityStanding: 'good' | 'excellent' | 'outstanding';
  };
  
  // Payout Preferences
  payoutPreferences: {
    defaultCrypto: string; // USDC, ETH, etc.
    cryptoAddresses: Record<string, string>;
    fiatEnabled: boolean;
    offRampProvider?: 'circle' | 'coinbase' | 'stripe';
    bankAccount?: {
      accountNumber: string;
      routingNumber: string;
      accountType: 'checking' | 'savings';
    };
  };
  
  // Seller Stats
  stats: {
    totalSales: number;
    activeListings: number;
    completedOrders: number;
    averageRating: number;
    totalReviews: number;
    reputationScore: number;
    joinDate: string;
    lastActive: string;
  };
  
  // Verification Badges
  badges: string[];
  
  // Onboarding Progress
  onboardingProgress: {
    profileSetup: boolean;
    verification: boolean;
    payoutSetup: boolean;
    firstListing: boolean;
    completed: boolean;
    currentStep: number;
    totalSteps: number;
  };
  
  // Settings
  settings: {
    notifications: {
      orders: boolean;
      disputes: boolean;
      daoActivity: boolean;
      tips: boolean;
      marketing: boolean;
    };
    privacy: {
      showEmail: boolean;
      showPhone: boolean;
      showStats: boolean;
    };
    escrow: {
      defaultEnabled: boolean;
      minimumAmount: number;
    };
  };
  
  createdAt: string;
  updatedAt: string;
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

export interface SellerDashboardStats {
  sales: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  orders: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    disputed: number;
  };
  listings: {
    active: number;
    draft: number;
    sold: number;
    expired: number;
  };
  balance: {
    crypto: Record<string, number>;
    fiatEquivalent: number;
    pendingEscrow: number;
    availableWithdraw: number;
  };
  reputation: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    recentReviews: number;
    averageRating: number;
  };
}

export interface SellerNotification {
  id: string;
  type: 'order' | 'dispute' | 'dao' | 'tip' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
}

export interface SellerOrder {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerAddress: string;
  buyerName?: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'disputed' | 'cancelled';
  escrowStatus: 'none' | 'locked' | 'released' | 'disputed';
  paymentMethod: 'crypto' | 'fiat';
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerListing {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  currency: string;
  quantity: number;
  condition: 'new' | 'used' | 'refurbished';
  images: string[];
  specifications?: Record<string, string>;
  tags: string[];
  status: 'draft' | 'active' | 'paused' | 'sold' | 'expired';
  saleType: 'fixed' | 'auction' | 'negotiable';
  escrowEnabled: boolean;
  shippingOptions: {
    free: boolean;
    cost?: number;
    estimatedDays: string;
    international: boolean;
  };
  views: number;
  favorites: number;
  questions: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerAnalytics {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  sales: {
    daily: Array<{ date: string; amount: number; orders: number }>;
    byCategory: Array<{ category: string; amount: number; percentage: number }>;
    byProduct: Array<{ productId: string; title: string; sales: number; revenue: number }>;
  };
  buyers: {
    demographics: {
      countries: Array<{ country: string; count: number }>;
      walletTypes: Array<{ type: string; count: number }>;
    };
    behavior: {
      repeatCustomers: number;
      averageOrdersPerCustomer: number;
      customerLifetimeValue: number;
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
  };
}