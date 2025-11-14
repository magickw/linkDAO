import { eq, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { databaseService } from '../services/databaseService';
import { sellers } from '../db/schema';
import { 
  SellerProfile, 
  CreateSellerProfileRequest, 
  UpdateSellerProfileRequest, 
  OnboardingStatus,
  OnboardingSteps 
} from '../types/sellerProfile';

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

      const result = await db
        .select()
        .from(sellers)
        .where(eq(sellers.walletAddress, walletAddress))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const seller = result[0];
      
      return this.mapSellerToProfile(seller);
    } catch (error) {
      safeLogger.error('Error fetching seller profile:', error);
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
        verification: false,
        payout_setup: false,
        first_listing: false
      };

      const result = await db
        .insert(sellers)
        .values({
          walletAddress: profileData.walletAddress,
          displayName: profileData.displayName,
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
          isVerified: false,
          onboardingCompleted: false,
          onboardingSteps: JSON.stringify(defaultOnboardingSteps),
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

      const result = await db
        .update(sellers)
        .set({
          displayName: updates.displayName,
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
          onboardingSteps: JSON.stringify(updatedOnboardingSteps),
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

  /**
   * Update onboarding step completion
   */
  async updateOnboardingStep(walletAddress: string, step: keyof OnboardingSteps, completed: boolean): Promise<OnboardingStatus> {
    try {
      safeLogger.info('Starting updateOnboardingStep:', { walletAddress, step, completed });
      
      const profile = await this.getProfile(walletAddress);
      if (!profile) {
        throw new Error('Seller profile not found');
      }

      const updatedSteps = {
        ...profile.onboardingSteps,
        [step]: completed
      };

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

      // Update onboardingSteps using raw SQL with proper JSON string serialization
      await db.execute(sql.raw(`
        UPDATE sellers 
        SET 
          onboarding_steps = '${JSON.stringify(updatedSteps).replace(/'/g, "''")}',
          onboarding_completed = ${onboardingCompleted},
          updated_at = NOW()
        WHERE wallet_address = '${walletAddress}'
      `));
      
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
      const db = databaseService.getDatabase();
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.walletAddress, walletAddress))
        .limit(1);

      if (!seller) {
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
        tier: seller.tier || 'unverified',
        benefits: tierBenefits[seller.tier as keyof typeof tierBenefits] || tierBenefits.unverified
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
      const db = databaseService.getDatabase();
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.walletAddress, walletAddress))
        .limit(1);

      if (!seller) {
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

      const currentTier = seller.tier || 'unverified';
      const tierProgress = {
        unverified: {
          nextTier: 'basic',
          requirements: {
            profileComplete: seller.profileCompleteness >= 50,
            emailVerified: seller.emailVerified || false,
            firstListing: false
          }
        },
        basic: {
          nextTier: 'verified',
          requirements: {
            profileComplete: seller.profileCompleteness >= 75,
            emailVerified: seller.emailVerified || false,
            firstListing: seller.totalListings > 0,
            noDisputes: true
          }
        },
        verified: {
          nextTier: 'premium',
          requirements: {
            profileComplete: seller.profileCompleteness >= 90,
            salesVolume: seller.totalSales > 1000,
            goodRating: seller.averageRating >= 4.5,
            activeListings: seller.activeListings >= 5
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
      ensLastVerified: seller.ensLastVerified?.toISOString(),
      profileImageIpfs: seller.profileImageIpfs || undefined,
      profileImageCdn: seller.profileImageCdn || undefined,
      profilePicture: seller.profileImageCdn || seller.coverImageUrl || undefined, // For backward compatibility
      coverImageIpfs: seller.coverImageIpfs || undefined,
      coverImageCdn: seller.coverImageCdn || undefined,
      coverImageUrl: seller.coverImageUrl || undefined,
      websiteUrl: seller.websiteUrl || undefined,
      socialLinks: seller.socialLinks ? JSON.parse(seller.socialLinks) : undefined,
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
        joinDate: seller.createdAt?.toISOString() || new Date().toISOString(),
        lastActive: seller.updatedAt?.toISOString() || new Date().toISOString(),
      },
      createdAt: seller.createdAt || new Date(),
      updatedAt: seller.updatedAt || new Date(),
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

  private parseOnboardingSteps(steps: any): OnboardingSteps {
    if (typeof steps === 'object' && steps !== null) {
      return {
        profile_setup: Boolean(steps.profile_setup),
        verification: Boolean(steps.verification),
        payout_setup: Boolean(steps.payout_setup),
        first_listing: Boolean(steps.first_listing)
      };
    }

    // Return default if parsing fails
    return {
      profile_setup: false,
      verification: false,
      payout_setup: false,
      first_listing: false
    };
  }

  private calculateOnboardingCompletion(steps: OnboardingSteps): boolean {
    return steps.profile_setup && steps.verification && steps.payout_setup && steps.first_listing;
  }

  private calculateCompletionPercentage(steps: OnboardingSteps): number {
    const totalSteps = 4;
    const completedSteps = Object.values(steps).filter(Boolean).length;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  private getNextOnboardingStep(steps: OnboardingSteps): string | undefined {
    if (!steps.profile_setup) return 'profile_setup';
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
