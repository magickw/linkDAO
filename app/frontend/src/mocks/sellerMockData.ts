/**
 * Seller Mock Data
 * 
 * Default fallback data for seller pages when real data is unavailable.
 * Used for graceful degradation and error recovery.
 */

interface TrustMetric {
  value: string;
  tooltip: string;
}

interface VerificationLevel {
  type: 'BASIC' | 'ENHANCED' | 'PREMIUM';
  verified: boolean;
  verifiedAt?: Date;
}

interface PerformanceMetrics {
  avgDeliveryTime: string;
  customerSatisfaction: number;
  returnRate: number;
  repeatCustomerRate: number;
  responseTime: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
}

/**
 * Generates default mock seller data for error fallback scenarios
 * @param sellerId - Seller ID or wallet address
 * @param partial - Partial data to override defaults
 * @returns Complete SellerInfo object with fallback values
 */
export function getDefaultMockSeller(sellerId: string, partial?: any): any {
  return {
    id: sellerId,
    name: partial?.name || 'Seller Store',
    avatar: partial?.avatar || '',
    coverImage: partial?.coverImage || '',
    walletAddress: sellerId,
    ensName: partial?.ensName || undefined,
    description: partial?.description || 'This seller store is currently unavailable. Please try again later.',
    sellerStory: partial?.sellerStory || '',
    memberSince: partial?.memberSince || new Date(),
    location: partial?.location || '',
    isOnline: partial?.isOnline || false,
    lastSeen: partial?.lastSeen || new Date(),
    
    // Trust & Reputation
    reputationScore: partial?.reputationScore || { 
      value: '0', 
      tooltip: 'No reputation data available' 
    } as TrustMetric,
    successRate: partial?.successRate || { 
      value: '0%', 
      tooltip: 'No transaction history available' 
    } as TrustMetric,
    safetyScore: partial?.safetyScore || { 
      value: '0', 
      tooltip: 'No safety data available' 
    } as TrustMetric,
    totalTransactions: partial?.totalTransactions || 0,
    successfulTransactions: partial?.successfulTransactions || 0,
    disputesRatio: partial?.disputesRatio || 0,
    
    // Enhanced Verification
    verificationLevels: partial?.verificationLevels || {
      identity: { type: 'BASIC', verified: false } as VerificationLevel,
      business: { type: 'BASIC', verified: false } as VerificationLevel,
      kyc: { type: 'BASIC', verified: false } as VerificationLevel
    },
    socialLinks: partial?.socialLinks || {},
    
    // Performance Analytics
    performanceMetrics: partial?.performanceMetrics || {
      avgDeliveryTime: 'N/A',
      customerSatisfaction: 0,
      returnRate: 0,
      repeatCustomerRate: 0,
      responseTime: 'N/A',
      trend: 'stable' as const,
      trendValue: '0%'
    } as PerformanceMetrics,
    
    // Verification & Badges
    tier: partial?.tier || 'TIER_1',
    tierProgress: partial?.tierProgress || { 
      current: 0, 
      required: 100, 
      nextTier: 'TIER_2' 
    },
    isKYCVerified: partial?.isKYCVerified || false,
    isDAOEndorsed: partial?.isDAOEndorsed || false,
    hasEscrowProtection: partial?.hasEscrowProtection || false,
    
    // Social & DAO
    followers: partial?.followers || 0,
    following: partial?.following || 0,
    daoMemberships: partial?.daoMemberships || [],
    daoEndorsements: partial?.daoEndorsements || [],
    
    // Analytics
    topCategories: partial?.topCategories || [],
    totalListings: partial?.totalListings || 0,
    activeListings: partial?.activeListings || 0,
    featuredListings: partial?.featuredListings || [],
    featuredProducts: partial?.featuredProducts || [],
    
    // Performance & Activity
    performanceBadges: partial?.performanceBadges || [],
    activityTimeline: partial?.activityTimeline || [],
    recentTransactions: partial?.recentTransactions || []
  };
}

/**
 * Generates mock seller profile for onboarding
 */
export function getMockSellerProfile(walletAddress: string): any {
  return {
    walletAddress,
    displayName: '',
    storeName: '',
    bio: '',
    description: '',
    email: '',
    phone: '',
    location: '',
    profileImage: '',
    coverImage: '',
    tier: 'TIER_1',
    isVerified: false,
    isKYCVerified: false,
    memberSince: new Date(),
    lastActive: new Date(),
    totalSales: 0,
    totalRevenue: '0',
    averageRating: 0,
    totalReviews: 0,
    responseTime: 0,
    completionRate: 0,
    onTimeDeliveryRate: 0,
    socialLinks: {
      twitter: '',
      discord: '',
      telegram: '',
      linkedin: '',
      website: ''
    }
  };
}

/**
 * Mock dashboard data for testing
 */
export function getMockDashboardData(): any {
  return {
    stats: {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenue: '0',
      revenueChange: 0,
      activeListings: 0,
      views: 0,
      viewsChange: 0
    },
    recentOrders: [],
    recentActivity: [],
    notifications: []
  };
}

/**
 * Mock analytics data
 */
export function getMockAnalyticsData(): any {
  return {
    revenue: {
      total: 0,
      daily: [],
      weekly: [],
      monthly: []
    },
    orders: {
      total: 0,
      byStatus: {},
      trend: []
    },
    traffic: {
      views: 0,
      uniqueVisitors: 0,
      conversionRate: 0,
      trend: []
    },
    topProducts: [],
    topCategories: []
  };
}
