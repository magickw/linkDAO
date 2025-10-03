// Seller Profile Types for API Endpoints

export interface SellerProfile {
  walletAddress: string;
  displayName?: string;
  ensHandle?: string;
  storeDescription?: string;
  coverImageUrl?: string;
  isVerified: boolean;
  onboardingCompleted: boolean;
  onboardingSteps: OnboardingSteps;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingSteps {
  profile_setup: boolean;
  verification: boolean;
  payout_setup: boolean;
  first_listing: boolean;
}

export interface CreateSellerProfileRequest {
  walletAddress: string;
  displayName?: string;
  ensHandle?: string;
  storeDescription?: string;
  coverImageUrl?: string;
}

export interface UpdateSellerProfileRequest {
  displayName?: string;
  ensHandle?: string;
  storeDescription?: string;
  coverImageUrl?: string;
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