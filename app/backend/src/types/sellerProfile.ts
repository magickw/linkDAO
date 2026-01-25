// Seller Profile Types for API Endpoints

export interface SellerProfile {
  walletAddress: string;
  displayName?: string;
  storeName?: string;
  bio?: string;
  description?: string;
  sellerStory?: string;
  location?: string;
  ensHandle?: string;
  ensVerified: boolean;
  ensLastVerified?: string;
  profileImageIpfs?: string;
  profileImageCdn?: string;
  profilePicture?: string; // For backward compatibility
  coverImageIpfs?: string;
  coverImageCdn?: string;
  coverImageUrl?: string;
  websiteUrl?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    linkedin?: string;
    website?: string;
    facebook?: string;
  };
  storeDescription?: string;
  // Business Information
  payoutSettings?: any; // JSON with fiat withdrawal details
  legalBusinessName?: string;
  businessType?: string;
  registeredAddressStreet?: string;
  registeredAddressCity?: string;
  registeredAddressState?: string;
  registeredAddressPostalCode?: string;
  registeredAddressCountry?: string;
  taxIdType?: string;
  // Note: taxId is not exposed in the profile for security, only taxIdType
  tier?: string;
  isVerified: boolean;
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  onboardingCompleted: boolean;
  onboardingSteps: OnboardingSteps;
  // Profile Completeness
  profileCompleteness?: {
    score: number;
    missingFields: string[];
    recommendations: Array<{
      action: string;
      description: string;
      impact: number;
    }>;
    lastCalculated: string;
  };
  // Seller Stats
  stats?: {
    totalSales: number;
    activeListings: number;
    completedOrders: number;
    averageRating: number;
    totalReviews: number;
    reputationScore: number;
    joinDate: string;
    lastActive: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingSteps {
  profile_setup: boolean;
  business_info: boolean;
  verification: boolean;
  payout_setup: boolean;
  first_listing: boolean;
}

export interface CreateSellerProfileRequest {
  walletAddress: string;
  displayName?: string;
  storeName?: string;
  bio?: string;
  description?: string;
  sellerStory?: string;
  location?: string;
  ensHandle?: string;
  websiteUrl?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    linkedin?: string;
    website?: string;
    facebook?: string;
  };
  storeDescription?: string;
  // Business Information
  legalBusinessName?: string;
  businessType?: string;
  registeredAddressStreet?: string;
  registeredAddressCity?: string;
  registeredAddressState?: string;
  registeredAddressPostalCode?: string;
  registeredAddressCountry?: string;
  taxId?: string; // Plain text tax ID, will be encrypted on backend
  taxIdType?: string;
  coverImageUrl?: string;
  coverImageCdn?: string;
  coverImageIpfs?: string;
  profilePicture?: string;
  profileImageCdn?: string;
  profileImageIpfs?: string;
}

export interface UpdateSellerProfileRequest {
  displayName?: string;
  storeName?: string;
  bio?: string;
  description?: string;
  sellerStory?: string;
  location?: string;
  ensHandle?: string;
  websiteUrl?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    linkedin?: string;
    website?: string;
    facebook?: string;
  };
  storeDescription?: string;
  // Business Information
  legalBusinessName?: string;
  businessType?: string;
  registeredAddressStreet?: string;
  registeredAddressCity?: string;
  registeredAddressState?: string;
  registeredAddressPostalCode?: string;
  registeredAddressCountry?: string;
  taxId?: string; // Plain text tax ID, will be encrypted on backend
  taxIdType?: string;
  coverImageUrl?: string;
  coverImageCdn?: string;
  coverImageIpfs?: string;
  profilePicture?: string;
  profileImageCdn?: string;
  profileImageIpfs?: string;
  payoutSettings?: any; // JSON with fiat withdrawal details
}

export interface OnboardingStatus {
  walletAddress: string;
  completed: boolean;
  steps: OnboardingSteps;
  completionPercentage: number;
  nextStep?: string;
}

export interface SellerProfileResponse {
  success: boolean;
  data?: SellerProfile | null;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
  };
}

export interface OnboardingStatusResponse {
  success: boolean;
  data?: OnboardingStatus;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
  };
}
