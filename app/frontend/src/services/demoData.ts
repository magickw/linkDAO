import { AuthUser } from '@/services/authService';
import { SellerProfile } from '@/types/seller';

// Demo users with different roles
export const demoUsers: AuthUser[] = [
  {
    id: '1',
    address: '0x1234567890123456789012345678901234567890',
    handle: 'admin_alice',
    ens: 'alice.eth',
    email: 'alice@linkdao.io',
    kycStatus: 'advanced',
    role: 'super_admin',
    permissions: ['manage_users', 'manage_content', 'resolve_disputes', 'view_analytics', 'manage_sellers'],
  createdAt: '2024-01-15T10:00:00Z',
  sessionInfo: { lastLogin: '2024-09-18T14:30:00Z' }
  },
  {
    id: '2',
    address: '0x2345678901234567890123456789012345678901',
    handle: 'mod_bob',
    email: 'bob@linkdao.io',
    kycStatus: 'intermediate',
    role: 'moderator',
    permissions: ['manage_content', 'resolve_disputes', 'manage_sellers'],
  createdAt: '2024-02-20T09:15:00Z',
  sessionInfo: { lastLogin: '2024-09-18T13:45:00Z' }
  },
  {
    id: '3',
    address: '0x3456789012345678901234567890123456789012',
    handle: 'user_charlie',
    kycStatus: 'basic',
    role: 'user',
    permissions: [],
  createdAt: '2024-03-10T16:20:00Z',
  sessionInfo: { lastLogin: '2024-09-17T20:10:00Z' }
  },
  {
    id: '4',
    address: '0x4567890123456789012345678901234567890123',
    handle: 'suspended_dave',
    email: 'dave@example.com',
    kycStatus: 'none',
    role: 'user',
    permissions: [],
    isSuspended: true,
    suspensionReason: 'Violation of community guidelines',
    suspensionExpiresAt: '2024-10-18T00:00:00Z',
  createdAt: '2024-04-05T11:30:00Z',
  sessionInfo: { lastLogin: '2024-09-15T08:20:00Z' }
  }
];

// Demo seller applications
export const demoSellerApplications: SellerProfile[] = [
  {
    id: '1',
    walletAddress: '0x5678901234567890123456789012345678901234',
    tier: 'verified',
    displayName: 'Tech Gadgets Pro',
    storeName: 'TechPro Store',
    bio: 'Premium electronics and gadgets retailer',
    description: 'We specialize in cutting-edge technology products',
    location: 'San Francisco, CA',
    ensVerified: false,
    profileCompleteness: {
      score: 85,
      missingFields: [
        { field: 'ensHandle', label: 'ENS Handle', weight: 10, required: false },
        { field: 'sellerStory', label: 'Seller Story', weight: 15, required: false }
      ],
      recommendations: [
        { action: 'Add ENS handle', description: 'Add ENS handle for better discoverability', impact: 10 },
        { action: 'Complete seller story', description: 'Complete your seller story to build trust', impact: 15 }
      ],
      lastCalculated: '2024-09-18T10:00:00Z'
    },
    socialLinks: {
      twitter: '@techgadgetspro',
      website: 'https://techgadgetspro.com'
    },
    applicationStatus: 'pending',
    applicationDate: '2024-09-15T10:00:00Z',
    email: 'seller1@techgadgetspro.com',
    emailVerified: true,
    phone: '+14155550101',
    phoneVerified: true,
    kycStatus: 'approved',
    kycDocuments: ['doc1.pdf'],
    payoutPreferences: {
      defaultCrypto: 'USDC',
      cryptoAddresses: { USDC: '0x5678901234567890123456789012345678901234' },
      fiatEnabled: true,
      offRampProvider: 'circle',
      bankAccount: {
        accountNumber: '123456789',
        routingNumber: '987654321',
        accountType: 'checking'
      }
    },
    stats: {
      totalSales: 100,
      activeListings: 10,
      completedOrders: 95,
      averageRating: 4.8,
      totalReviews: 50,
      reputationScore: 90,
      joinDate: '2024-01-01T10:00:00Z',
      lastActive: '2024-09-18T10:00:00Z'
    },
    badges: ['verified', 'top-seller'],
    onboardingProgress: {
      profileSetup: true,
      verification: true,
      payoutSetup: true,
      firstListing: true,
      completed: true,
      currentStep: 5,
      totalSteps: 5
    },
    settings: {
      notifications: {
        orders: true,
        disputes: true,
        daoActivity: true,
        tips: true,
        marketing: false
      },
      privacy: {
        showEmail: true,
        showPhone: false,
        showStats: true
      },
      escrow: {
        defaultEnabled: true,
        minimumAmount: 100
      }
    },
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-09-18T10:00:00Z'
  },
  {
    id: '2',
    walletAddress: '0x6789012345678901234567890123456789012345',
    tier: 'basic',
    displayName: 'Artisan Crafts',
    storeName: 'Handmade Haven',
    bio: 'Unique handcrafted items and artwork',
    description: 'Supporting local artisans and creators',
    location: 'Portland, OR',
    ensVerified: false,
    profileCompleteness: {
      score: 70,
      missingFields: [
        { field: 'phone', label: 'Phone', weight: 10, required: false },
        { field: 'kycStatus', label: 'KYC Status', weight: 20, required: false },
        { field: 'sellerStory', label: 'Seller Story', weight: 15, required: false }
      ],
      recommendations: [
        { action: 'Complete phone verification', description: 'Add and verify your phone number', impact: 10 },
        { action: 'Submit KYC documents', description: 'Complete KYC verification for higher trust', impact: 20 },
        { action: 'Add seller story', description: 'Add your seller story to build customer trust', impact: 15 }
      ],
      lastCalculated: '2024-09-18T10:00:00Z'
    },
    socialLinks: {
      website: 'https://artisancrafts.shop'
    },
    applicationStatus: 'approved',
    applicationDate: '2024-09-10T14:30:00Z',
    approvedDate: '2024-09-12T09:15:00Z',
    reviewedBy: 'mod_bob',
    email: 'seller2@artisancrafts.shop',
    emailVerified: true,
    phone: '+15035550102',
    phoneVerified: false,
    kycStatus: 'pending',
    kycDocuments: ['doc2.pdf'],
    payoutPreferences: {
      defaultCrypto: 'ETH',
      cryptoAddresses: { ETH: '0x6789012345678901234567890123456789012345' },
      fiatEnabled: false
    },
    stats: {
      totalSales: 45,
      activeListings: 7,
      completedOrders: 40,
      averageRating: 4.6,
      totalReviews: 22,
      reputationScore: 75,
      joinDate: '2024-02-01T09:00:00Z',
      lastActive: '2024-09-18T09:00:00Z'
    },
    badges: ['artisan'],
    onboardingProgress: {
      profileSetup: true,
      verification: false,
      payoutSetup: true,
      firstListing: true,
      completed: false,
      currentStep: 4,
      totalSteps: 5
    },
    settings: {
      notifications: {
        orders: true,
        disputes: false,
        daoActivity: true,
        tips: true,
        marketing: true
      },
      privacy: {
        showEmail: true,
        showPhone: true,
        showStats: false
      },
      escrow: {
        defaultEnabled: false,
        minimumAmount: 50
      }
    },
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-09-18T09:00:00Z'
  },
  {
    id: '3',
    walletAddress: '0x7890123456789012345678901234567890123456',
    tier: 'pro',
    displayName: 'Crypto Mining Solutions',
    storeName: 'MinerMax',
    bio: 'Professional mining equipment and services',
    description: 'High-performance mining rigs and consultation',
    location: 'Austin, TX',
    ensVerified: false,
    profileCompleteness: {
      score: 60,
      missingFields: [
        { field: 'emailVerified', label: 'Email Verified', weight: 10, required: true },
        { field: 'kycStatus', label: 'KYC Status', weight: 20, required: false },
        { field: 'sellerStory', label: 'Seller Story', weight: 15, required: false }
      ],
      recommendations: [
        { action: 'Verify email', description: 'Verify your email address for notifications', impact: 10 },
        { action: 'Complete KYC', description: 'Complete KYC verification for full access', impact: 20 },
        { action: 'Add detailed story', description: 'Add detailed seller story to stand out', impact: 15 }
      ],
      lastCalculated: '2024-09-18T10:00:00Z'
    },
    socialLinks: {
      twitter: '@minermax',
      website: 'https://minermax.io'
    },
    applicationStatus: 'rejected',
    applicationDate: '2024-09-08T16:45:00Z',
    rejectionReason: 'Insufficient documentation provided',
    reviewedBy: 'admin_alice',
    email: 'seller3@minermax.io',
    emailVerified: false,
    phone: '+15125550103',
    phoneVerified: true,
    kycStatus: 'rejected',
    kycDocuments: [],
    payoutPreferences: {
      defaultCrypto: 'USDC',
      cryptoAddresses: { USDC: '0x7890123456789012345678901234567890123456' },
      fiatEnabled: true,
      offRampProvider: 'coinbase',
      bankAccount: {
        accountNumber: '987654321',
        routingNumber: '123456789',
        accountType: 'savings'
      }
    },
    stats: {
      totalSales: 10,
      activeListings: 3,
      completedOrders: 8,
      averageRating: 4.2,
      totalReviews: 5,
      reputationScore: 60,
      joinDate: '2024-03-01T08:00:00Z',
      lastActive: '2024-09-17T08:00:00Z'
    },
    badges: ['pro'],
    onboardingProgress: {
      profileSetup: true,
      verification: true,
      payoutSetup: false,
      firstListing: false,
      completed: false,
      currentStep: 2,
      totalSteps: 5
    },
    settings: {
      notifications: {
        orders: false,
        disputes: true,
        daoActivity: false,
        tips: true,
        marketing: false
      },
      privacy: {
        showEmail: false,
        showPhone: true,
        showStats: true
      },
      escrow: {
        defaultEnabled: true,
        minimumAmount: 200
      }
    },
    createdAt: '2024-03-01T08:00:00Z',
    updatedAt: '2024-09-17T08:00:00Z'
  }
];

// Demo moderation queue items
export const demoModerationItems = [
  {
    id: '1',
    type: 'listing',
    title: 'Rare NFT Collection - Limited Edition',
    content: 'Exclusive digital art collection with utility tokens',
    author: 'user_charlie',
    authorId: '3',
    status: 'pending',
    priority: 'medium',
    reportCount: 2,
    reports: [
      { reason: 'Suspicious pricing', reporter: 'user_dave' },
      { reason: 'Potential scam', reporter: 'user_eve' }
    ],
    createdAt: '2024-09-18T12:00:00Z',
    category: 'Digital Assets'
  },
  {
    id: '2',
    type: 'post',
    title: 'Community Discussion: Platform Fees',
    content: 'I think the platform fees are too high compared to competitors...',
    author: 'user_frank',
    authorId: '5',
    status: 'approved',
    priority: 'low',
    reportCount: 0,
    reports: [],
    createdAt: '2024-09-17T15:30:00Z',
    reviewedAt: '2024-09-17T16:00:00Z',
    reviewedBy: 'mod_bob',
    category: 'Discussion'
  },
  {
    id: '3',
    type: 'comment',
    title: 'Comment on "Best Trading Strategies"',
    content: 'This is complete garbage advice, anyone following this will lose money!',
    author: 'angry_trader',
    authorId: '6',
    status: 'rejected',
    priority: 'high',
    reportCount: 5,
    reports: [
      { reason: 'Harassment', reporter: 'user_alice' },
      { reason: 'Toxic behavior', reporter: 'user_bob' }
    ],
    createdAt: '2024-09-16T20:15:00Z',
    reviewedAt: '2024-09-17T09:00:00Z',
    reviewedBy: 'admin_alice',
    rejectionReason: 'Violates community guidelines - harassment',
    category: 'Comment'
  }
];

// Demo dispute cases
export const demoDisputes = [
  {
    id: '1',
    orderId: 'ORD-2024-001234',
    type: 'product_not_received',
    status: 'open',
    priority: 'high',
    amount: 1250.00,
    currency: 'USDC',
    buyerId: '3',
    sellerId: '2',
    description: 'Ordered custom artwork 2 weeks ago, seller has gone silent',
    evidence: {
      buyerEvidence: ['payment_proof.pdf', 'conversation_screenshots.png'],
      sellerEvidence: []
    },
    timeline: [
      {
        id: '1',
        timestamp: '2024-09-16T10:00:00Z',
        actor: 'user_charlie',
        description: 'Dispute opened by buyer'
      },
      {
        id: '2',
        timestamp: '2024-09-16T14:30:00Z',
        actor: 'system',
        description: 'Seller notified of dispute'
      }
    ],
    createdAt: '2024-09-16T10:00:00Z',
    assignedTo: 'mod_bob'
  },
  {
    id: '2',
    orderId: 'ORD-2024-001189',
    type: 'product_not_as_described',
    status: 'resolved',
    priority: 'medium',
    amount: 450.00,
    currency: 'ETH',
    buyerId: '4',
    sellerId: '1',
    description: 'Received damaged electronics, not as described in listing',
    evidence: {
      buyerEvidence: ['damage_photos.jpg', 'original_listing.pdf'],
      sellerEvidence: ['shipping_receipt.pdf']
    },
    resolution: {
      outcome: 'partial_refund',
      refundAmount: 225.00,
      reasoning: 'Product was damaged during shipping, partial refund approved',
      resolvedAt: '2024-09-15T16:45:00Z',
      resolvedBy: 'admin_alice'
    },
    timeline: [
      {
        id: '1',
        timestamp: '2024-09-14T09:00:00Z',
        actor: 'suspended_dave',
        description: 'Dispute opened by buyer'
      },
      {
        id: '2',
        timestamp: '2024-09-14T11:30:00Z',
        actor: 'tech_seller',
        description: 'Seller provided shipping evidence'
      },
      {
        id: '3',
        timestamp: '2024-09-15T16:45:00Z',
        actor: 'admin_alice',
        description: 'Dispute resolved with partial refund'
      }
    ],
    createdAt: '2024-09-14T09:00:00Z',
    assignedTo: 'admin_alice'
  }
];

// Demo analytics data
export const demoAnalytics = {
  userGrowth: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    data: [1200, 1350, 1500, 1800, 2100, 2400, 2650, 2900, 3200]
  },
  sellerGrowth: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    data: [45, 52, 68, 85, 102, 125, 148, 165, 189]
  },
  disputeStats: {
    total: 156,
    resolved: 142,
    pending: 14,
    averageResolutionTime: 2.3
  },
  moderationStats: {
    total: 1247,
    approved: 1089,
    rejected: 134,
    pending: 24
  },
  platformHealth: {
    activeUsers: 3200,
    activeSellers: 189,
    totalTransactions: 12450,
    totalVolume: 2850000
  }
};

// Helper function to simulate API delays
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
export const mockAdminAPI = {
  async getUsers(filters: any = {}) {
    await delay(500);
    let filteredUsers = [...demoUsers];
    
    if (filters.role) {
      filteredUsers = filteredUsers.filter(user => user.role === filters.role);
    }
    
    if (filters.status) {
      if (filters.status === 'suspended') {
        filteredUsers = filteredUsers.filter(user => user.isSuspended);
      } else if (filters.status === 'active') {
        filteredUsers = filteredUsers.filter(user => !user.isSuspended);
      }
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.handle.toLowerCase().includes(search) ||
        user.address.toLowerCase().includes(search) ||
        (user.email && user.email.toLowerCase().includes(search))
      );
    }
    
    return {
      users: filteredUsers,
      total: filteredUsers.length,
      page: filters.page || 1,
      totalPages: Math.ceil(filteredUsers.length / (filters.limit || 20))
    };
  },

  async getSellerApplications(filters: any = {}) {
    await delay(400);
    let filteredApplications = [...demoSellerApplications];
    
    if (filters.status) {
      filteredApplications = filteredApplications.filter(app => app.applicationStatus === filters.status);
    }
    
    return {
      applications: filteredApplications,
      total: filteredApplications.length,
      page: filters.page || 1,
      totalPages: Math.ceil(filteredApplications.length / (filters.limit || 20))
    };
  },

  async getModerationQueue(filters: any = {}) {
    await delay(300);
    let filteredItems = [...demoModerationItems];
    
    if (filters.status) {
      filteredItems = filteredItems.filter(item => item.status === filters.status);
    }
    
    if (filters.type) {
      filteredItems = filteredItems.filter(item => item.type === filters.type);
    }
    
    return {
      items: filteredItems,
      total: filteredItems.length,
      page: filters.page || 1,
      totalPages: Math.ceil(filteredItems.length / (filters.limit || 20))
    };
  },

  async getDisputes(filters: any = {}) {
    await delay(600);
    let filteredDisputes = [...demoDisputes];
    
    if (filters.status) {
      filteredDisputes = filteredDisputes.filter(dispute => dispute.status === filters.status);
    }
    
    return {
      disputes: filteredDisputes,
      total: filteredDisputes.length,
      page: filters.page || 1,
      totalPages: Math.ceil(filteredDisputes.length / (filters.limit || 20))
    };
  },

  async getAnalytics() {
    await delay(800);
    return demoAnalytics;
  }
};