import { eq, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { sellers } from '../db/schema';
import {
  SellerProfile,
  CreateSellerProfileRequest,
  UpdateSellerProfileRequest,
  OnboardingStatus,
  OnboardingSteps
} from '../types/sellerProfile';
import { encrypt } from '../utils/encryption';

export class SellerProfileService {
  /**
   * Get seller profile by wallet address
   * Returns null if profile doesn't exist (no 404 error)
   */
  async getProfile(walletAddress: string): Promise<SellerProfile | null> {
    try {
      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      if (!seller) {
        return null;
      }

      return this.mapSellerToProfile(seller);
    } catch (error) {
      safeLogger.error('Error fetching seller profile:', error);

      // Handle database connection errors specifically
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return null instead of throwing
        // This will allow the frontend to handle it as a "not found" case rather than a 503
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning null for seller profile:', errorCode);
          return null;
        }
      }

      throw error;
    }
  }

  /**
   * Create new seller profile
   */
  async createProfile(profileData: CreateSellerProfileRequest): Promise<SellerProfile> {
    try {
      // Validate wallet address format
      if (!this.isValidWalletAddress(profileData.walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      // Validate ENS handle if provided
      if (profileData.ensHandle && !this.isValidEnsHandle(profileData.ensHandle)) {
        throw new Error('Invalid ENS handle format');
      }

      const defaultOnboardingSteps: OnboardingSteps = {
        profile_setup: false,
        business_info: false,
        verification: false,
        payout_setup: false,
        first_listing: false
      };

      // Encrypt Tax ID if provided
      const taxIdEncrypted = profileData.taxId ? encrypt(profileData.taxId) : null;

      const result = await db
        .insert(sellers)
        .values({
          walletAddress: profileData.walletAddress,
          storeName: profileData.storeName,
          bio: profileData.bio,
          description: profileData.description,
          sellerStory: profileData.sellerStory,
          location: profileData.location,
          ensHandle: profileData.ensHandle,
          websiteUrl: profileData.websiteUrl,
          socialLinks: profileData.socialLinks ? JSON.stringify(profileData.socialLinks) : null,
          storeDescription: profileData.storeDescription,
          coverImageUrl: profileData.coverImageUrl,
          // Business Information
          legalBusinessName: profileData.legalBusinessName,
          businessType: profileData.businessType,
          registeredAddressStreet: profileData.registeredAddressStreet,
          registeredAddressCity: profileData.registeredAddressCity,
          registeredAddressState: profileData.registeredAddressState,
          registeredAddressPostalCode: profileData.registeredAddressPostalCode,
          registeredAddressCountry: profileData.registeredAddressCountry,
          taxIdEncrypted: taxIdEncrypted,
          taxIdType: profileData.taxIdType,

          isVerified: false,
          onboardingCompleted: false,
          onboardingSteps: defaultOnboardingSteps,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const seller = result[0];

      return this.mapSellerToProfile(seller);
    } catch (error) {
      safeLogger.error('Error creating seller profile:', error);
      throw error;
    }
  }

  /**
   * Update existing seller profile
   */
  async updateProfile(walletAddress: string, updates: UpdateSellerProfileRequest): Promise<SellerProfile> {
    try {
      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      // Validate ENS handle if provided
      if (updates.ensHandle && !this.isValidEnsHandle(updates.ensHandle)) {
        throw new Error('Invalid ENS handle format');
      }

      // Check if profile exists
      const existingProfile = await this.getProfile(walletAddress);
      if (!existingProfile) {
        throw new Error('Seller profile not found');
      }

      // Update onboarding steps if profile setup is being completed
      let updatedOnboardingSteps = existingProfile.onboardingSteps;
      if (updates.displayName || updates.storeName || updates.bio || updates.storeDescription) {
        updatedOnboardingSteps = {
          ...updatedOnboardingSteps,
          profile_setup: true
        };
      }

      // Update business info step if business details are provided
      if (updates.legalBusinessName || updates.businessType || updates.registeredAddressStreet) {
        updatedOnboardingSteps = {
          ...updatedOnboardingSteps,
          business_info: true
        };
      }

      // Encrypt Tax ID if provided
      const taxIdEncrypted = updates.taxId ? encrypt(updates.taxId) : undefined;

      const result = await db
        .update(sellers)
        .set({
          storeName: updates.storeName,
          bio: updates.bio,
          description: updates.description,
          sellerStory: updates.sellerStory,
          location: updates.location,
          ensHandle: updates.ensHandle,
          websiteUrl: updates.websiteUrl,
          socialLinks: updates.socialLinks ? JSON.stringify(updates.socialLinks) : undefined,
          storeDescription: updates.storeDescription,
          coverImageUrl: updates.coverImageUrl,
          // Business Information
          legalBusinessName: updates.legalBusinessName,
          businessType: updates.businessType,
          registeredAddressStreet: updates.registeredAddressStreet,
          registeredAddressCity: updates.registeredAddressCity,
          registeredAddressState: updates.registeredAddressState,
          registeredAddressPostalCode: updates.registeredAddressPostalCode,
          registeredAddressCountry: updates.registeredAddressCountry,
          ...(taxIdEncrypted ? { taxIdEncrypted } : {}),
          ...(updates.taxIdType ? { taxIdType: updates.taxIdType } : {}),

          onboardingSteps: updatedOnboardingSteps,
          onboardingCompleted: this.calculateOnboardingCompletion(updatedOnboardingSteps),
          updatedAt: new Date(),
        })
        .where(eq(sellers.walletAddress, walletAddress))
        .returning();

      const seller = result[0];

      return this.mapSellerToProfile(seller);
    } catch (error) {
      safeLogger.error('Error updating seller profile:', error);
      throw error;
    }
  }

  /**
   * Get onboarding status for a seller
   */
  async getOnboardingStatus(walletAddress: string): Promise<OnboardingStatus> {
    try {
      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const profile = await this.getProfile(walletAddress);

      // If no profile exists, return default onboarding status
      if (!profile) {
        const defaultSteps: OnboardingSteps = {
          profile_setup: false,
          business_info: false,
          verification: false,
          payout_setup: false,
          first_listing: false
        };

        return {
          walletAddress,
          completed: false,
          steps: defaultSteps,
          completionPercentage: 0,
          nextStep: 'profile_setup'
        };
      }

      const completionPercentage = this.calculateCompletionPercentage(profile.onboardingSteps);
      const nextStep = this.getNextOnboardingStep(profile.onboardingSteps);

      return {
        walletAddress: profile.walletAddress,
        completed: profile.onboardingCompleted,
        steps: profile.onboardingSteps,
        completionPercentage,
        nextStep
      };
    } catch (error) {
      safeLogger.error('Error fetching onboarding status:', error);
      throw error;
    }
  }

  // Valid onboarding steps
  private readonly VALID_STEPS = [
    'profile_setup',
    'business_info',
    'verification',
    'payout_setup',
    'first_listing'
  ] as const;

  /**
   * Update onboarding step completion
   */
  async updateOnboardingStep(walletAddress: string, step: keyof OnboardingSteps, completed: boolean, data?: any): Promise<OnboardingStatus> {
    try {
      safeLogger.info('Starting updateOnboardingStep:', { walletAddress, step, completed });

      // Validate step
      if (!this.VALID_STEPS.includes(step as any)) {
        throw new Error(`Invalid onboarding step: ${step}. Valid steps are: ${this.VALID_STEPS.join(', ')}`);
      }

      const profile = await this.getProfile(walletAddress);
      if (!profile) {
        throw new Error('Seller profile not found');
      }

      const updatedSteps = {
        ...profile.onboardingSteps,
        [step]: completed
      };

      const updates: UpdateSellerProfileRequest = {};

      // If data is provided, update the profile with that data
      if (data && Object.keys(data).length > 0) {
        // Handle Business Info Step Data
        if (step === 'business_info') {
          if (data.businessType) updates.businessType = data.businessType;
          if (data.legalBusinessName) updates.legalBusinessName = data.legalBusinessName;
          if (data.taxId) updates.taxId = data.taxId;
          if (data.taxIdType) updates.taxIdType = data.taxIdType;
          if (data.registeredAddressStreet) updates.registeredAddressStreet = data.registeredAddressStreet;
          if (data.registeredAddressCity) updates.registeredAddressCity = data.registeredAddressCity;
          if (data.registeredAddressState) updates.registeredAddressState = data.registeredAddressState;
          if (data.registeredAddressPostalCode) updates.registeredAddressPostalCode = data.registeredAddressPostalCode;
          if (data.registeredAddressCountry) updates.registeredAddressCountry = data.registeredAddressCountry;
          if (data.websiteUrl) updates.websiteUrl = data.websiteUrl;
          if (data.ensHandle) updates.ensHandle = data.ensHandle;

          // Handle social links
          if (data.twitterHandle || data.linkedinHandle || data.facebookHandle || data.discordHandle || data.telegramHandle) {
            updates.socialLinks = {
              ...profile.socialLinks,
              twitter: data.twitterHandle || profile.socialLinks?.twitter,
              linkedin: data.linkedinHandle || profile.socialLinks?.linkedin,
              facebook: data.facebookHandle || profile.socialLinks?.facebook,
              discord: data.discordHandle || profile.socialLinks?.discord,
              telegram: data.telegramHandle || profile.socialLinks?.telegram,
            };
          }
        }

        // Handle Profile Setup Step Data (if passed here)
        if (step === 'profile_setup') {
          if (data.displayName) updates.displayName = data.displayName;
          if (data.storeName) updates.storeName = data.storeName;
          if (data.bio) updates.bio = data.bio;
          if (data.description) updates.description = data.description;
          if (data.coverImage) {
            updates.coverImageUrl = data.coverImage;
            updates.coverImageCdn = data.coverImage; // Assuming the URL is a CDN URL
          }
          if (data.logo) {
            updates.profilePicture = data.logo;
            updates.profileImageCdn = data.logo; // Assuming the URL is a CDN URL
          }
        }

        // Handle Payout Setup Step Data
        if (step === 'payout_setup' && data) {
          updates.payoutSettings = data;
        }

        // If we have updates, apply them
        if (Object.keys(updates).length > 0) {
          await this.updateProfile(walletAddress, updates);
        }
      }

      const onboardingCompleted = this.calculateOnboardingCompletion(updatedSteps);

      // Log the update for debugging
      safeLogger.info('Updating onboarding steps:', {
        walletAddress,
        step: typeof step,
        stepValue: step,
        completed: typeof completed,
        completedValue: completed,
        updatedSteps,
        onboardingCompleted
      });

      // If newly completed, log it (and potentially send notification in future)
      if (onboardingCompleted && !profile.onboardingCompleted) {
        safeLogger.info('Seller onboarding completed:', { walletAddress });
      }

      // Prepare DB updates
      const dbUpdates: any = { ...updates };
      if (updates.socialLinks) {
        dbUpdates.socialLinks = JSON.stringify(updates.socialLinks);
      }

      // Update database
      await db
        .update(sellers)
        .set({
          onboardingSteps: updatedSteps,
          onboardingCompleted,
          ...dbUpdates,
          updatedAt: new Date(),
        })
        .where(eq(sellers.walletAddress, walletAddress));

      safeLogger.info('Onboarding steps updated successfully:', { walletAddress, step, completed });

      return this.getOnboardingStatus(walletAddress);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      safeLogger.error('Error updating onboarding step:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        walletAddress,
        step,
        completed
      });

      // Create a simple error without circular references
      throw new Error(`Failed to update onboarding step: ${errorMessage}`);
    }
  }

  // Get seller tier information
  async getSellerTier(walletAddress: string): Promise<{ tier: string; benefits: string[] }> {
    try {
      const profile = await this.getProfile(walletAddress);

      if (!profile) {
        return {
          tier: 'unverified',
          benefits: ['Basic seller features']
        };
      }

      const tierBenefits = {
        unverified: ['Basic seller features'],
        basic: ['Basic seller features', 'Profile visibility'],
        verified: ['Basic seller features', 'Profile visibility', 'Verified badge', 'Priority support'],
        premium: ['All features', 'Enhanced visibility', 'Analytics dashboard', 'Dedicated support']
      };

      return {
        tier: profile.tier || 'unverified',
        benefits: tierBenefits[profile.tier as keyof typeof tierBenefits] || tierBenefits.unverified
      };
    } catch (error) {
      safeLogger.error('Error getting seller tier:', error);
      return {
        tier: 'unverified',
        benefits: ['Basic seller features']
      };
    }
  }

  // Get tier progress for next upgrade
  async getTierProgress(walletAddress: string): Promise<{
    currentTier: string;
    nextTier: string;
    progress: number;
    requirements: { [key: string]: boolean };
  }> {
    try {
      const profile = await this.getProfile(walletAddress);

      if (!profile) {
        return {
          currentTier: 'unverified',
          nextTier: 'basic',
          progress: 0,
          requirements: {
            profileComplete: false,
            emailVerified: false,
            firstListing: false
          }
        };
      }

      const currentTier = profile.tier || 'unverified';
      const profileCompletenessScore = profile.profileCompleteness?.score || 0;

      const tierProgress = {
        unverified: {
          nextTier: 'basic',
          requirements: {
            profileComplete: profileCompletenessScore >= 50,
            emailVerified: false, // Would need to check from users table
            firstListing: false // Would need to check from listings
          }
        },
        basic: {
          nextTier: 'verified',
          requirements: {
            profileComplete: profileCompletenessScore >= 75,
            emailVerified: false,
            firstListing: false,
            noDisputes: true
          }
        },
        verified: {
          nextTier: 'premium',
          requirements: {
            profileComplete: profileCompletenessScore >= 90,
            salesVolume: false,
            goodRating: false,
            activeListings: false
          }
        },
        premium: {
          nextTier: 'premium',
          requirements: {}
        }
      };

      const tierInfo = tierProgress[currentTier as keyof typeof tierProgress];
      const requirements = tierInfo.requirements;
      const completedRequirements = Object.values(requirements).filter(Boolean).length;
      const totalRequirements = Object.keys(requirements).length;
      const progress = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;

      return {
        currentTier,
        nextTier: tierInfo.nextTier,
        progress: Math.round(progress),
        requirements
      };
    } catch (error) {
      safeLogger.error('Error getting tier progress:', error);
      return {
        currentTier: 'unverified',
        nextTier: 'basic',
        progress: 0,
        requirements: {}
      };
    }
  }


  private mapSellerToProfile(seller: any): SellerProfile {
    // Safely access date fields with null checks
    const createdAtValue = seller.createdAt instanceof Date ? seller.createdAt : new Date();
    const updatedAtValue = seller.updatedAt instanceof Date ? seller.updatedAt : new Date();

    return {
      walletAddress: seller.walletAddress,
      displayName: seller.displayName || undefined,
      storeName: seller.storeName || undefined,
      bio: seller.bio || undefined,
      description: seller.description || undefined,
      sellerStory: seller.sellerStory || undefined,
      location: seller.location || undefined,
      ensHandle: seller.ensHandle || undefined,
      ensVerified: seller.ensVerified || false,
      ensLastVerified: seller.ensLastVerified?.toISOString?.() || undefined,
      profileImageIpfs: seller.profileImageIpfs || undefined,
      profileImageCdn: seller.profileImageCdn || undefined,
      profilePicture: seller.profileImageCdn || seller.coverImageUrl || undefined, // For backward compatibility
      coverImageIpfs: seller.coverImageIpfs || undefined,
      coverImageCdn: seller.coverImageCdn || undefined,
      coverImageUrl: seller.coverImageUrl || undefined,
      websiteUrl: seller.websiteUrl || undefined,
      socialLinks: seller.socialLinks ? this.parseSocialLinks(seller.socialLinks) : undefined,
      storeDescription: seller.storeDescription || undefined,
      tier: seller.tier || 'basic',
      isVerified: seller.isVerified || false,
      onboardingCompleted: seller.onboardingCompleted || false,
      onboardingSteps: this.parseOnboardingSteps(seller.onboardingSteps),
      profileCompleteness: this.calculateProfileCompleteness(seller),
      stats: {
        totalSales: 0,
        activeListings: 0,
        completedOrders: 0,
        averageRating: 0,
        totalReviews: 0,
        reputationScore: 0,
        joinDate: createdAtValue.toISOString(),
        lastActive: updatedAtValue.toISOString(),
      },
      // Business Information
      legalBusinessName: seller.legalBusinessName || undefined,
      businessType: seller.businessType || undefined,
      registeredAddressStreet: seller.registeredAddressStreet || undefined,
      registeredAddressCity: seller.registeredAddressCity || undefined,
      registeredAddressState: seller.registeredAddressState || undefined,
      registeredAddressPostalCode: seller.registeredAddressPostalCode || undefined,
      registeredAddressCountry: seller.registeredAddressCountry || undefined,
      taxIdType: seller.taxIdType || undefined,

      createdAt: createdAtValue,
      updatedAt: updatedAtValue,
    };
  }

  private isValidWalletAddress(address: string): boolean {
    // Basic Ethereum address validation (0x followed by 40 hex characters)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidEnsHandle(ensHandle: string): boolean {
    // Basic ENS validation (ends with .eth and contains valid characters)
    return /^[a-zA-Z0-9-]+\.eth$/.test(ensHandle);
  }

  private parseSocialLinks(links: any): SellerProfile['socialLinks'] {
    try {
      // Handle case where links might be a JSON string
      if (typeof links === 'string') {
        // Check if it's a non-empty string before parsing
        if (links.trim()) {
          return JSON.parse(links);
        } else {
          // Return undefined if the string is empty
          return undefined;
        }
      }

      // If it's already an object, return it
      if (typeof links === 'object' && links !== null) {
        return links;
      }
    } catch (error) {
      safeLogger.error('Error parsing social links:', {
        links,
        error: error instanceof Error ? error.message : String(error),
        type: typeof links
      });
    }

    // Return undefined if parsing fails
    return undefined;
  }

  private parseOnboardingSteps(steps: any): OnboardingSteps {
    try {
      // Handle case where steps might be a JSON string
      let parsedSteps: any = steps;
      if (typeof steps === 'string') {
        // Check if it's a non-empty string before parsing
        if (steps.trim()) {
          parsedSteps = JSON.parse(steps);
        } else {
          // Return default if the string is empty
          return {
            profile_setup: false,
            business_info: false,
            verification: false,
            payout_setup: false,
            first_listing: false
          };
        }
      }

      if (typeof parsedSteps === 'object' && parsedSteps !== null) {
        return {
          profile_setup: Boolean(parsedSteps.profile_setup),
          business_info: Boolean(parsedSteps.business_info),
          verification: Boolean(parsedSteps.verification),
          payout_setup: Boolean(parsedSteps.payout_setup),
          first_listing: Boolean(parsedSteps.first_listing)
        };
      }
    } catch (error) {
      safeLogger.error('Error parsing onboarding steps:', {
        steps,
        error: error instanceof Error ? error.message : String(error),
        type: typeof steps
      });
    }

    // Return default if parsing fails
    return {
      profile_setup: false,
      business_info: false,
      verification: false,
      payout_setup: false,
      first_listing: false
    };
  }

  private calculateOnboardingCompletion(steps: OnboardingSteps): boolean {
    return steps.profile_setup && steps.business_info && steps.verification && steps.payout_setup && steps.first_listing;
  }

  private calculateCompletionPercentage(steps: OnboardingSteps): number {
    const totalSteps = 5;
    const completedSteps = Object.values(steps).filter(Boolean).length;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  private getNextOnboardingStep(steps: OnboardingSteps): string | undefined {
    if (!steps.profile_setup) return 'profile_setup';
    if (!steps.business_info) return 'business_info';
    if (!steps.verification) return 'verification';
    if (!steps.payout_setup) return 'payout_setup';
    if (!steps.first_listing) return 'first_listing';
    return undefined; // All steps completed
  }

  private calculateProfileCompleteness(seller: any): {
    score: number;
    missingFields: string[];
    recommendations: Array<{
      action: string;
      description: string;
      impact: number;
    }>;
    lastCalculated: string;
  } {
    const fields = [
      { name: 'displayName', weight: 15, label: 'Display Name' },
      { name: 'storeName', weight: 15, label: 'Store Name' },
      { name: 'bio', weight: 10, label: 'Bio' },
      { name: 'description', weight: 8, label: 'Description' },
      { name: 'sellerStory', weight: 8, label: 'Seller Story' },
      { name: 'location', weight: 5, label: 'Location' },
      { name: 'profileImageCdn', weight: 10, label: 'Profile Image' },
      { name: 'coverImageCdn', weight: 8, label: 'Cover Image' },
      { name: 'websiteUrl', weight: 5, label: 'Website URL' },
      { name: 'ensHandle', weight: 7, label: 'ENS Handle' },
      // Business Info
      { name: 'legalBusinessName', weight: 10, label: 'Legal Name' },
      { name: 'registeredAddressStreet', weight: 5, label: 'Address' },
    ];

    let totalWeight = 0;
    let completedWeight = 0;
    const missingFields: string[] = [];

    fields.forEach(field => {
      totalWeight += field.weight;
      const value = seller[field.name];
      if (value && value.trim && value.trim() !== '') {
        completedWeight += field.weight;
      } else if (value) {
        completedWeight += field.weight;
      } else {
        missingFields.push(field.label);
      }
    });

    const score = Math.round((completedWeight / totalWeight) * 100);

    const recommendations = missingFields.slice(0, 3).map(field => ({
      action: `Add ${field}`,
      description: `Adding your ${field.toLowerCase()} will help buyers trust your store`,
      impact: 10,
    }));

    return {
      score,
      missingFields,
      recommendations,
      lastCalculated: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const sellerProfileService = new SellerProfileService();
