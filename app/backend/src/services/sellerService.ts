import { eq, and, desc, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import * as schema from '../db/schema';
import {
  sellers,
  users,
  imageStorage,
  ensVerifications,
  sellerActivities,
  sellerBadges,
  marketplaceListings,
  userReputation,
  reviews,
  listings,
  sellerTierRequirements,
  sellerTierBenefits,
  sellerTierProgression,
  sellerTierHistory
} from '../db/schema';
import { ensService } from './ensService';
import { profileSyncService } from './profileSyncService';
import { reputationService } from './reputationService';
import { transactionService } from './transactionService';
import { databaseService } from './databaseService';
import { Request } from 'express';
import multer from 'multer';
import { UploadedFile } from 'express-fileupload';

export interface ProfileCompletenessScore {
  score: number;
  missingFields: string[];
  recommendations: Array<{
    action: string;
    description: string;
    impact: number;
  }>;
  lastCalculated: string;
}

export interface ValidationRule {
  field: string;
  required: boolean;
  weight: number;
  validator?: (value: any) => boolean;
}

export interface SellerProfileData {
  walletAddress: string;
  storeName?: string;
  bio?: string;
  description?: string;
  storeDescription?: string;
  sellerStory?: string;
  location?: string;
  ensHandle?: string;
  ensVerified?: boolean;
  ensLastVerified?: Date | null;
  websiteUrl?: string;
  twitterHandle?: string;
  discordHandle?: string;
  telegramHandle?: string;
  linkedinHandle?: string;
  facebookHandle?: string;
  profileImageIpfs?: string;
  profileImageCdn?: string;
  coverImageIpfs?: string;
  coverImageCdn?: string;
  // Business Information
  legalBusinessName?: string;
  businessType?: string;
  registeredAddressStreet?: string;
  registeredAddressCity?: string;
  registeredAddressState?: string;
  registeredAddressPostalCode?: string;
  registeredAddressCountry?: string;
  // Add reputation metrics
  reputation?: {
    overallScore: number;
    moderationScore: number;
    reportingScore: number;
    juryScore: number;
    violationCount: number;
    helpfulReportsCount: number;
    falseReportsCount: number;
    successfulAppealsCount: number;
    juryDecisionsCount: number;
    juryAccuracyRate: number;
    reputationTier: string;
    lastViolationAt?: Date;
  };
  profileCompleteness?: ProfileCompletenessScore;
}

class SellerService {
  // Profile validation rules with weights for completeness scoring
  private validationRules: ValidationRule[] = [
    { field: 'displayName', required: true, weight: 15 },
    { field: 'storeName', required: true, weight: 15 },
    { field: 'bio', required: true, weight: 10 },
    { field: 'description', required: false, weight: 8 },
    { field: 'sellerStory', required: false, weight: 8 },
    { field: 'location', required: false, weight: 5 },
    { field: 'profileImageCdn', required: false, weight: 10 },
    { field: 'coverImageCdn', required: false, weight: 8 },
    { field: 'websiteUrl', required: false, weight: 5 },
    { field: 'twitterHandle', required: false, weight: 3 },
    { field: 'discordHandle', required: false, weight: 3 },
    { field: 'telegramHandle', required: false, weight: 3 },
    { field: 'ensHandle', required: false, weight: 7 }, // ENS is optional but valuable
  ];

  async getSellerProfile(walletAddress: string): Promise<SellerProfileData | null> {
    try {
      // Validate wallet address
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }

      if (typeof walletAddress !== 'string') {
        throw new Error('Wallet address must be a string');
      }

      const normalizedAddress = walletAddress.toLowerCase();
      safeLogger.info('Fetching seller profile for address:', normalizedAddress);

      const sellerData = await db
        .select()
        .from(sellers)
        .where(eq(sellers.walletAddress, normalizedAddress))
        .limit(1);

      const seller = sellerData[0];

      if (!seller || sellerData.length === 0) {
        safeLogger.info('Seller not found in database for address:', normalizedAddress);

        // Auto-create a basic seller profile for new wallets
        try {
          safeLogger.info('Auto-creating seller profile for address:', normalizedAddress);
          const basicProfileData = {
            walletAddress: normalizedAddress,
            storeName: 'My Store',
            bio: 'Welcome to my store!',
            description: 'Seller profile created automatically',
            createdAt: new Date(),
            updatedAt: new Date(),
            tier: 'bronze'
          };

          const newProfile = await this.createSellerProfile(basicProfileData as any);
          safeLogger.info('Auto-created seller profile for address:', normalizedAddress);

          // Return the newly created profile
          return {
            ...newProfile,
            reputation: undefined,
            profileCompleteness: this.calculateProfileCompleteness(newProfile)
          } as any;
        } catch (autoCreateError) {
          safeLogger.error('Failed to auto-create seller profile:', autoCreateError);
          return null; // Return null if auto-creation fails
        }
      }

      // Get reputation data using wallet address
      let reputation = null;
      try {
        reputation = await reputationService.getReputation(walletAddress);
      } catch (error) {
        safeLogger.warn('Could not fetch reputation data:', error);
        // Continue without reputation data
      }

      // Calculate profile completeness
      const completeness = this.calculateProfileCompleteness(seller);

      return {
        ...seller,
        reputation: reputation ? {
          overallScore: reputation.overallScore,
          moderationScore: reputation.moderationScore,
          reportingScore: reputation.reportingScore,
          juryScore: reputation.juryScore,
          violationCount: reputation.violationCount,
          helpfulReportsCount: reputation.helpfulReportsCount,
          falseReportsCount: reputation.falseReportsCount,
          successfulAppealsCount: reputation.successfulAppealsCount,
          juryDecisionsCount: reputation.juryDecisionsCount,
          juryAccuracyRate: reputation.juryAccuracyRate,
          reputationTier: reputation.reputationTier,
          lastViolationAt: reputation.lastViolationAt
        } : undefined,
        profileCompleteness: completeness,
      } as any;
    } catch (error) {
      safeLogger.error('Error fetching seller profile:', error);
      throw new Error('Failed to fetch seller profile');
    }
  }

  async createSellerProfile(profileData: SellerProfileData): Promise<SellerProfileData> {
    try {
      // Validate ENS handle if provided
      if (profileData.ensHandle) {
        const ensValidation = await ensService.validateENSHandle(profileData.ensHandle);
        if (!ensValidation.isValid) {
          throw new Error('Invalid ENS handle format');
        }

        // Verify ownership if ENS handle is provided
        const isOwned = await ensService.verifyENSOwnership(
          profileData.ensHandle,
          profileData.walletAddress
        );

        if (!isOwned) {
          throw new Error('ENS handle is not owned by this wallet address');
        }
      }

      const result = await db
        .insert(sellers)
        .values({
          walletAddress: profileData.walletAddress.toLowerCase(),
          storeName: profileData.storeName,
          bio: profileData.bio,
          description: profileData.description,
          sellerStory: profileData.sellerStory,
          location: profileData.location,
          ensHandle: profileData.ensHandle,
          ensVerified: profileData.ensHandle ? true : false,
          ensLastVerified: profileData.ensHandle ? new Date() : null,
          websiteUrl: profileData.websiteUrl,
          twitterHandle: profileData.twitterHandle,
          discordHandle: profileData.discordHandle,
          telegramHandle: profileData.telegramHandle,
          linkedinHandle: profileData.linkedinHandle,
          facebookHandle: profileData.facebookHandle,
          profileImageIpfs: profileData.profileImageIpfs,
          profileImageCdn: profileData.profileImageCdn,
          coverImageIpfs: profileData.coverImageIpfs,
          coverImageCdn: profileData.coverImageCdn,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create ENS verification record if ENS handle is provided
      if (profileData.ensHandle) {
        await this.createENSVerificationRecord(
          profileData.walletAddress,
          profileData.ensHandle
        );
      }

      const createdProfile = result[0] as SellerProfileData;

      // Sync profile changes
      await profileSyncService.syncProfileChanges(
        profileData.walletAddress,
        createdProfile,
        'profile_update'
      );

      return createdProfile;
    } catch (error) {
      safeLogger.error('Error creating seller profile:', error);
      throw error;
    }
  }

  async updateSellerProfile(
    walletAddress: string,
    updates: Partial<SellerProfileData>
  ): Promise<SellerProfileData> {
    try {
      // Validate ENS handle if being updated
      if (updates.ensHandle !== undefined) {
        if (updates.ensHandle) {
          const ensValidation = await ensService.validateENSHandle(updates.ensHandle);
          if (!ensValidation.isValid) {
            throw new Error('Invalid ENS handle format');
          }

          // Verify ownership
          const isOwned = await ensService.verifyENSOwnership(
            updates.ensHandle,
            walletAddress
          );

          if (!isOwned) {
            throw new Error('ENS handle is not owned by this wallet address');
          }

          // Set verification fields
          updates.ensVerified = true;
          updates.ensLastVerified = new Date();
        } else {
          // Clearing ENS handle
          updates.ensVerified = false;
          updates.ensLastVerified = null;
        }
      }

      // Prepare updates for database
      const dbUpdates: any = { ...updates };

      // Stringify socialLinks if it's an object (database expects JSON string)
      if (dbUpdates.socialLinks && typeof dbUpdates.socialLinks === 'object') {
        dbUpdates.socialLinks = JSON.stringify(dbUpdates.socialLinks);
      }

      const result = await db
        .update(sellers)
        .set({
          ...dbUpdates,
          updatedAt: new Date(),
        })
        .where(eq(sellers.walletAddress, walletAddress.toLowerCase()))
        .returning();

      if (result.length === 0) {
        throw new Error('Seller profile not found');
      }

      // Update ENS verification record if ENS handle was updated
      if (updates.ensHandle !== undefined) {
        if (updates.ensHandle) {
          await this.createENSVerificationRecord(walletAddress, updates.ensHandle);
        } else {
          await this.deactivateENSVerificationRecord(walletAddress);
        }
      }

      const updatedProfile = result[0] as SellerProfileData;

      // Sync profile changes
      await profileSyncService.syncProfileChanges(
        walletAddress,
        updates,
        updates.ensHandle !== undefined ? 'ens_update' : 'profile_update'
      );

      return updatedProfile;
    } catch (error) {
      safeLogger.error('Error updating seller profile:', error);
      throw error;
    }
  }

  async updateSellerProfileWithImages(
    walletAddress: string,
    updates: Partial<SellerProfileData>,
    profileImage?: UploadedFile,
    coverImage?: UploadedFile
  ): Promise<{
    profile: SellerProfileData;
    imageUploadResults?: {
      profileImage?: any;
      coverImage?: any;
    };
  }> {
    try {
      const imageUploadResults: any = {};

      // Handle profile image upload
      if (profileImage) {
        // TODO: Implement actual image upload service
        const uploadResult = {
          ipfsHash: 'mock-ipfs-hash-profile',
          cdnUrl: 'https://cdn.example.com/profile.jpg',
          thumbnails: {
            small: 'https://cdn.example.com/profile-small.jpg',
            medium: 'https://cdn.example.com/profile-medium.jpg',
            large: 'https://cdn.example.com/profile-large.jpg',
          },
          metadata: {
            width: 400,
            height: 400,
            format: 'jpeg',
            size: profileImage.size,
          },
        };
        updates.profileImageIpfs = uploadResult.ipfsHash;
        updates.profileImageCdn = uploadResult.cdnUrl;
        imageUploadResults.profileImage = uploadResult;
      }

      // Handle cover image upload
      if (coverImage) {
        // TODO: Implement actual image upload service
        const uploadResult = {
          ipfsHash: 'mock-ipfs-hash-cover',
          cdnUrl: 'https://cdn.example.com/cover.jpg',
          thumbnails: {
            small: 'https://cdn.example.com/cover-small.jpg',
            medium: 'https://cdn.example.com/cover-medium.jpg',
            large: 'https://cdn.example.com/cover-large.jpg',
          },
          metadata: {
            width: 1200,
            height: 400,
            format: 'jpeg',
            size: coverImage.size,
          },
        };
        updates.coverImageIpfs = uploadResult.ipfsHash;
        updates.coverImageCdn = uploadResult.cdnUrl;
        imageUploadResults.coverImage = uploadResult;
      }

      // Update the profile
      const profile = await this.updateSellerProfile(walletAddress, updates);

      // Sync image updates if any
      if (Object.keys(imageUploadResults).length > 0) {
        await profileSyncService.syncProfileChanges(
          walletAddress,
          imageUploadResults,
          'image_update'
        );
      }

      return {
        profile,
        imageUploadResults: Object.keys(imageUploadResults).length > 0 ? imageUploadResults : undefined,
      };
    } catch (error) {
      safeLogger.error('Error updating seller profile with images:', error);
      throw error;
    }
  }

  // Profile Validation and Completeness
  validateProfile(profile: Partial<SellerProfileData>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    this.validationRules.forEach(rule => {
      if (rule.required) {
        const value = (profile as any)[rule.field];
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

    // Validate social handles
    const socialHandles = {
      twitter: profile.twitterHandle,
      discord: profile.discordHandle,
      telegram: profile.telegramHandle,
    };

    Object.entries(socialHandles).forEach(([platform, handle]) => {
      if (handle && !this.isValidSocialHandle(platform, handle)) {
        warnings.push(`${platform} handle format may be invalid`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  calculateProfileCompleteness(profile: Partial<SellerProfileData>): ProfileCompletenessScore {
    let totalWeight = 0;
    let completedWeight = 0;
    const missingFields: string[] = [];

    this.validationRules.forEach(rule => {
      totalWeight += rule.weight;
      const value = (profile as any)[rule.field];
      const isCompleted = value && (typeof value !== 'string' || value.trim() !== '');

      if (isCompleted) {
        completedWeight += rule.weight;
      } else {
        missingFields.push(rule.field);
      }
    });

    const score = Math.round((completedWeight / totalWeight) * 100);
    const recommendations = this.generateRecommendations(missingFields, score);

    return {
      score,
      missingFields,
      recommendations,
      lastCalculated: new Date().toISOString(),
    };
  }

  // ENS Verification Management
  private async createENSVerificationRecord(
    walletAddress: string,
    ensHandle: string
  ): Promise<void> {
    try {
      // Deactivate any existing verification records for this wallet
      await db
        .update(ensVerifications)
        .set({ isVerified: false, updatedAt: new Date() })
        .where(eq(ensVerifications.walletAddress, walletAddress));

      // Get user ID from wallet address
      const userData = await db.select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      const user = userData[0];

      if (!user) {
        safeLogger.error('User not found for wallet address:', walletAddress);
        return;
      }

      // Create new verification record
      await db.insert(ensVerifications).values({
        userId: user.id,
        walletAddress,
        ensName: ensHandle,
        resolvedAddress: walletAddress,
        metadata: JSON.stringify({
          verifiedAt: new Date().toISOString(),
          method: 'reverse_resolution',
        }),
        verifiedAt: new Date(),
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      safeLogger.error('Error creating ENS verification record:', error);
      // Don't throw error as this is not critical for profile update
    }
  }

  private async deactivateENSVerificationRecord(walletAddress: string): Promise<void> {
    try {
      await db
        .update(ensVerifications)
        .set({ isVerified: false, updatedAt: new Date() })
        .where(eq(ensVerifications.walletAddress, walletAddress));
    } catch (error) {
      safeLogger.error('Error deactivating ENS verification record:', error);
      // Don't throw error as this is not critical for profile update
    }
  }

  // Helper Methods
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

  private generateRecommendations(
    missingFields: string[],
    score: number
  ): Array<{
    action: string;
    description: string;
    impact: number;
  }> {
    const recommendations: Array<{
      action: string;
      description: string;
      impact: number;
    }> = [];

    // Get field weights for missing fields
    const missingWithWeights = missingFields.map(field => {
      const rule = this.validationRules.find(r => r.field === field);
      return {
        field,
        weight: rule?.weight || 0,
        label: this.getFieldLabel(field),
      };
    }).sort((a, b) => b.weight - a.weight);

    // Add top recommendations
    missingWithWeights.slice(0, 3).forEach(field => {
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
      'twitterHandle': 'Twitter Handle',
      'discordHandle': 'Discord Handle',
      'telegramHandle': 'Telegram Handle',
      'ensHandle': 'ENS Handle',
    };

    return labels[field] || field;
  }

  // Statistics and Analytics
  async getSellerStats(walletAddress: string): Promise<{
    totalListings: number;
    activeListings: number;
    totalSales: number;
    averageRating: number;
    profileCompleteness: number;
    totalRevenue: string;
    completedOrders: number;
    pendingOrders: number;
    disputedOrders: number;
    reputationScore: number;
  }> {
    try {
      // Get basic seller info
      const seller = await this.getSellerProfile(walletAddress);
      if (!seller) {
        throw new Error('Seller profile not found');
      }

      // Normalize wallet address for case-insensitive comparison
      const normalizedAddress = walletAddress.toLowerCase();

      // Get user ID for the seller
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = ${normalizedAddress}`)
        .limit(1);

      const user = userResult[0];
      if (!user) {
        safeLogger.warn('User not found for seller stats', { walletAddress: normalizedAddress });
        // Return zero stats if user not found
        return {
          totalListings: 0,
          activeListings: 0,
          totalSales: 0,
          averageRating: 0,
          profileCompleteness: this.calculateProfileCompleteness(seller).score,
          totalRevenue: '0',
          completedOrders: 0,
          pendingOrders: 0,
          disputedOrders: 0,
          reputationScore: 0,
        };
      }

      // Get listing counts from products table
      const listingStats = await db
        .select({
          totalListings: sql<number>`count(*)`,
          activeListings: sql<number>`count(*) filter (where status = 'active')`,
        })
        .from(schema.products)
        .where(eq(schema.products.sellerId, user.id));

      // Get order statistics from orders table
      const orderStats = await db
        .select({
          totalSales: sql<number>`count(*) filter (where status = 'completed')`,
          totalRevenue: sql<string>`coalesce(sum(total_amount) filter (where status = 'completed'), 0)`,
          completedOrders: sql<number>`count(*) filter (where status = 'completed')`,
          pendingOrders: sql<number>`count(*) filter (where status in ('pending'))`,
          disputedOrders: sql<number>`count(*) filter (where status = 'disputed')`,
        })
        .from(schema.orders)
        .where(eq(schema.orders.sellerId, user.id));

      // Get reputation data
      const reputationData = await db
        .select()
        .from(userReputation)
        .where(eq(userReputation.walletAddress, walletAddress))
        .limit(1);

      // Get average rating from reviews
      const ratingData = await db
        .select({
          averageRating: sql<number>`coalesce(avg(rating), 0)`,
        })
        .from(reviews)
        .where(eq(reviews.revieweeId, walletAddress));

      const completeness = this.calculateProfileCompleteness(seller);

      const stats = listingStats[0] || { totalListings: 0, activeListings: 0 };
      const orderAgg = orderStats[0] || {
        totalSales: 0,
        totalRevenue: '0',
        completedOrders: 0,
        pendingOrders: 0,
        disputedOrders: 0
      };
      const reputation = reputationData[0] || { reputationScore: 0 };
      const rating = ratingData[0] || { averageRating: 0 };

      return {
        totalListings: Number(stats.totalListings),
        activeListings: Number(stats.activeListings),
        totalSales: Number(orderAgg.totalSales),
        averageRating: Number(rating.averageRating),
        profileCompleteness: completeness.score,
        totalRevenue: orderAgg.totalRevenue,
        completedOrders: Number(orderAgg.completedOrders),
        pendingOrders: Number(orderAgg.pendingOrders),
        disputedOrders: Number(orderAgg.disputedOrders),
        reputationScore: Number(reputation.reputationScore),
      };
    } catch (error) {
      safeLogger.error('Error fetching seller stats:', error);
      throw error;
    }
  }

  // Seller Verification System
  async verifySellerProfile(walletAddress: string, verificationType: 'email' | 'phone' | 'kyc'): Promise<{
    success: boolean;
    verificationId?: string;
    message: string;
  }> {
    try {
      const seller = await this.getSellerProfile(walletAddress);
      if (!seller) {
        throw new Error('Seller profile not found');
      }

      // Create verification record
      const verificationId = `${verificationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update seller verification status
      const updateData: any = {};
      switch (verificationType) {
        case 'email':
          updateData.emailVerified = true;
          break;
        case 'phone':
          updateData.phoneVerified = true;
          break;
        case 'kyc':
          updateData.kycStatus = 'approved';
          break;
      }

      await db
        .update(sellers)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(sellers.walletAddress, walletAddress));

      // Create seller activity record
      await db.insert(sellerActivities).values({
        sellerWalletAddress: walletAddress,
        activityType: 'verification',
        title: `${verificationType.toUpperCase()} Verification Completed`,
        description: `Successfully completed ${verificationType} verification`,
        metadata: JSON.stringify({ verificationType, verificationId }),
      });

      return {
        success: true,
        verificationId,
        message: `${verificationType} verification completed successfully`,
      };
    } catch (error) {
      safeLogger.error('Error verifying seller profile:', error);
      return {
        success: false,
        message: `Failed to verify ${verificationType}: ${error.message}`,
      };
    }
  }

  // Seller Reputation Tracking
  async updateSellerReputation(
    walletAddress: string,
    action: 'sale_completed' | 'dispute_resolved' | 'review_received',
    data: any
  ): Promise<void> {
    try {
      // Get current reputation or create new record
      let reputation = await db
        .select()
        .from(userReputation)
        .where(eq(userReputation.walletAddress, walletAddress))
        .limit(1);

      if (reputation.length === 0) {
        // Create new reputation record
        await db.insert(userReputation).values({
          walletAddress,
          reputationScore: 0,
          totalTransactions: 0,
          positiveReviews: 0,
          negativeReviews: 0,
          successfulSales: 0,
          successfulPurchases: 0,
          disputedTransactions: 0,
          resolvedDisputes: 0,
          averageResponseTime: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

        reputation = await db
          .select()
          .from(userReputation)
          .where(eq(userReputation.walletAddress, walletAddress))
          .limit(1);
      }

      const currentRep = reputation[0];
      const updates: any = { updatedAt: new Date() };

      switch (action) {
        case 'sale_completed':
          updates.totalTransactions = Number(currentRep.totalTransactions) + 1;
          updates.successfulSales = Number(currentRep.successfulSales) + 1;
          updates.reputationScore = Number(currentRep.reputationScore) + 5; // +5 points for completed sale
          break;

        case 'dispute_resolved':
          updates.resolvedDisputes = Number(currentRep.resolvedDisputes) + 1;
          if (data.resolution === 'seller_favor') {
            updates.reputationScore = Number(currentRep.reputationScore) + 3; // +3 points for favorable resolution
          } else {
            updates.reputationScore = Math.max(0, Number(currentRep.reputationScore) - 2); // -2 points for unfavorable resolution
          }
          break;

        case 'review_received':
          if (data.rating >= 4) {
            updates.positiveReviews = Number(currentRep.positiveReviews) + 1;
            updates.reputationScore = Number(currentRep.reputationScore) + 2; // +2 points for positive review
          } else if (data.rating <= 2) {
            updates.negativeReviews = Number(currentRep.negativeReviews) + 1;
            updates.reputationScore = Math.max(0, Number(currentRep.reputationScore) - 1); // -1 point for negative review
          }
          break;
      }

      // Update reputation record
      await db
        .update(userReputation)
        .set(updates)
        .where(eq(userReputation.walletAddress, walletAddress));

      // Create activity record
      await db.insert(sellerActivities).values({
        sellerWalletAddress: walletAddress,
        activityType: 'reputation_update',
        title: `Reputation Updated: ${action}`,
        description: `Reputation updated due to ${action.replace('_', ' ')}`,
        metadata: JSON.stringify({ action, data, reputationChange: updates.reputationScore - Number(currentRep.reputationScore) }),
      });

    } catch (error) {
      safeLogger.error('Error updating seller reputation:', error);
      throw error;
    }
  }

  // Seller Activities and Timeline
  async getSellerActivities(walletAddress: string, limit: number = 20): Promise<Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    metadata?: any;
    createdAt: string;
  }>> {
    try {
      const activities = await db
        .select()
        .from(sellerActivities)
        .where(eq(sellerActivities.sellerWalletAddress, walletAddress))
        .orderBy(desc(sellerActivities.createdAt))
        .limit(limit);

      return activities.map(activity => ({
        id: activity.id.toString(),
        type: activity.activityType,
        title: activity.title,
        description: activity.description || '',
        metadata: activity.metadata ? JSON.parse(activity.metadata) : undefined,
        createdAt: activity.createdAt.toISOString(),
      }));
    } catch (error) {
      safeLogger.error('Error getting seller activities:', error);
      throw error;
    }
  }

  // Seller Badges Management
  async getSellerBadges(walletAddress: string): Promise<Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    icon?: string;
    color?: string;
    earnedAt: string;
    isActive: boolean;
  }>> {
    try {
      const badges = await db
        .select()
        .from(sellerBadges)
        .where(and(
          eq(sellerBadges.sellerWalletAddress, walletAddress),
          eq(sellerBadges.isActive, true)
        ))
        .orderBy(desc(sellerBadges.earnedAt));

      return badges.map(badge => ({
        id: badge.id.toString(),
        type: badge.badgeType,
        title: badge.title,
        description: badge.description || '',
        icon: badge.icon || undefined,
        color: badge.color || undefined,
        earnedAt: badge.earnedAt.toISOString(),
        isActive: badge.isActive,
      }));
    } catch (error) {
      safeLogger.error('Error getting seller badges:', error);
      throw error;
    }
  }

  async awardSellerBadge(
    walletAddress: string,
    badgeType: string,
    title: string,
    description: string,
    icon?: string,
    color?: string
  ): Promise<void> {
    try {
      // Check if badge already exists
      const existingBadge = await db
        .select()
        .from(sellerBadges)
        .where(and(
          eq(sellerBadges.sellerWalletAddress, walletAddress),
          eq(sellerBadges.badgeType, badgeType),
          eq(sellerBadges.isActive, true)
        ))
        .limit(1);

      if (existingBadge.length > 0) {
        safeLogger.info(`Badge ${badgeType} already exists for seller ${walletAddress}`);
        return;
      }

      // Award new badge
      await db.insert(sellerBadges).values({
        sellerWalletAddress: walletAddress,
        badgeType,
        title,
        description,
        icon,
        color,
        earnedAt: new Date(),
        isActive: true,
      });

      // Create activity record
      await db.insert(sellerActivities).values({
        sellerWalletAddress: walletAddress,
        activityType: 'badge_earned',
        title: `Badge Earned: ${title}`,
        description: `Earned the "${title}" badge`,
        metadata: JSON.stringify({ badgeType, icon, color }),
      });

    } catch (error) {
      safeLogger.error('Error awarding seller badge:', error);
      throw error;
    }
  }

  // Transaction Integration
  async getSellerTransactionHistory(walletAddress: string, limit: number = 50): Promise<any[]> {
    try {
      return await transactionService.getTransactionHistory(walletAddress, limit);
    } catch (error) {
      safeLogger.error('Error getting seller transaction history:', error);
      throw error;
    }
  }

  async getSellerTransactionSummary(walletAddress: string, days: number = 30): Promise<any> {
    try {
      return await transactionService.getTransactionSummary(walletAddress, days);
    } catch (error) {
      safeLogger.error('Error getting seller transaction summary:', error);
      throw error;
    }
  }

  // Order Management Integration
  async getSellerOrders(walletAddress: string, status?: string): Promise<Array<{
    id: string;
    listingId: string;
    listingTitle: string;
    buyerAddress: string;
    amount: string;
    currency: string;
    status: string;
    paymentMethod: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    try {
      // First get the user ID for the seller wallet address
      const userResult = await db.select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.walletAddress, walletAddress))
        .limit(1);

      if (!userResult.length) {
        return [];
      }

      const sellerId = userResult[0].id;

      const query = db
        .select({
          orderId: schema.orders.id,
          listingId: schema.orders.listingId,
          listingTitle: schema.products.title,
          buyerAddress: sql<string>`orders.buyer_id::text`, // Fallback since we might need to join users for address
          amount: schema.orders.totalAmount,
          currency: schema.orders.currency,
          status: schema.orders.status,
          paymentMethod: schema.orders.paymentMethod,
          createdAt: schema.orders.createdAt,
          updatedAt: sql<Date>`orders.created_at`, // Using created_at as updated_at placeholder
        })
        .from(schema.orders)
        .leftJoin(schema.products, eq(schema.orders.listingId, schema.products.id))
        .where(and(
          eq(schema.orders.sellerId, sellerId),
          status ? eq(schema.orders.status, status) : sql<boolean>`true`
        ));

      const orderResults = await query
        .orderBy(desc(schema.orders.createdAt))
        .limit(50);

      const listingIds = orderResults
        .map(o => o.listingId)
        .filter((id): id is string => id !== null);

      // If we need to fetch legacy listings (from marketplace_listings table) if product join failed?
      // For now assume migration handled it or new system uses products.

      return orderResults.map(order => {
        return {
          id: order.orderId.toString(),
          listingId: order.listingId?.toString() || '',
          listingTitle: order.listingTitle || 'Unknown Item',
          buyerAddress: order.buyerAddress || '',
          amount: order.amount || '0',
          currency: order.currency || 'USD',
          status: order.status || 'pending',
          paymentMethod: order.paymentMethod || 'crypto',
          createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: order.updatedAt?.toISOString() || new Date().toISOString(),
        };
      });
    } catch (error) {
      safeLogger.error('Error getting seller orders:', error);
      throw error;
    }
  }

  // Dashboard Data Aggregation
  async getSellerDashboardData(walletAddress: string): Promise<{
    profile: SellerProfileData | null;
    stats: any;
    recentActivities: any[];
    badges: any[];
    transactionSummary: any;
    recentOrders: any[];
  }> {
    try {
      const [
        profile,
        stats,
        activities,
        badges,
        transactionSummary,
        orders
      ] = await Promise.all([
        this.getSellerProfile(walletAddress),
        this.getSellerStats(walletAddress),
        this.getSellerActivities(walletAddress, 10),
        this.getSellerBadges(walletAddress),
        this.getSellerTransactionSummary(walletAddress, 30),
        this.getSellerOrders(walletAddress)
      ]);

      return {
        profile,
        stats,
        recentActivities: activities,
        badges,
        transactionSummary,
        recentOrders: orders.slice(0, 10),
      };
    } catch (error) {
      safeLogger.error('Error getting seller dashboard data:', error);
      throw error;
    }
  }

  // Tier System Methods

  /**
   * Calculate seller tier based on performance metrics
   */
  async calculateSellerTier(walletAddress: string): Promise<{
    currentTier: string;
    nextTier: string | null;
    progressPercentage: number;
    requirements: Array<{
      type: string;
      current: number;
      required: number;
      met: boolean;
      description: string;
    }>;
    benefits: Array<{
      type: string;
      description: string;
      value: string;
    }>;
  }> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      // Get seller performance metrics
      const sellerData = await db.select().from(sellers).where(eq(sellers.walletAddress, walletAddress));
      const seller = sellerData[0];

      if (!seller) {
        throw new Error('Seller not found');
      }

      // Calculate metrics from orders and reviews
      const salesData = await db
        .select({
          totalSales: sql<number>`SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END)`.as('total_sales'),
          totalOrders: sql<number>`COUNT(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END)`.as('total_orders'),
          averageRating: sql<number>`COALESCE(AVG(r.rating), 0)`.as('average_rating'),
          responseTime: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (o.created_at))), 0)`.as('response_time'),
          disputeRate: sql<number>`COALESCE(COUNT(CASE WHEN o.status = 'disputed' THEN 1 ELSE 0 END) * 100.0 / COUNT(o.id), 0)`.as('dispute_rate'),
          returnRate: sql<number>`COALESCE(COUNT(CASE WHEN o.status = 'completed' AND o.returned = true THEN 1 ELSE 0 END) * 100.0 / COUNT(o.id), 0)`.as('return_rate'),
          repeatRate: sql<number>`COALESCE(COUNT(DISTINCT o.buyer_id) * 100.0 / COUNT(o.id), 0)`.as('repeat_rate')
        })
        .from(schema.orders)
        .leftJoin(reviews, eq(reviews.revieweeId, schema.orders.sellerId))
        .where(eq(schema.orders.sellerId, walletAddress))
        .groupBy(schema.orders.sellerId);

      const metrics = salesData[0] || {
        totalSales: 0,
        totalOrders: 0,
        averageRating: 0,
        responseTime: 0,
        disputeRate: 0,
        returnRate: 0,
        repeatRate: 0
      };

      // Get tier requirements
      const db2 = databaseService.getDatabase();
      const requirementsData = await db2
        .select()
        .from(sellerTierRequirements)
        .where(eq(sellerTierRequirements.tier, seller.tier));
      const requirements = requirementsData[0];

      // Calculate progress
      const requirementsWithStatus = requirements.map(req => ({
        type: req.requirementType,
        current: metrics[this.getMetricField(req.requirementType)] || 0,
        required: parseFloat(req.requiredValue.toString()),
        met: this.checkRequirementMet(req.requirementType, metrics),
        description: req.description
      }));

      const requirementsMet = requirementsWithStatus.filter(req => req.met).length;
      const totalRequirements = requirementsWithStatus.length;
      const progressPercentage = totalRequirements > 0 ? (requirementsMet / totalRequirements) * 100 : 0;

      // Determine next tier
      const tierOrder = ['bronze', 'silver', 'gold', ' platinum', 'diamond'];
      const currentIndex = tierOrder.indexOf(seller.tier);
      const nextTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;

      // Get tier benefits
      const db3 = databaseService.getDatabase();
      const benefitsData = await db3
        .select()
        .from(sellerTierBenefits)
        .where(eq(sellerTierBenefits.tier, seller.tier));
      const benefits = benefitsData[0];

      return {
        currentTier: seller.tier,
        nextTier,
        progressPercentage,
        requirements: requirementsWithStatus,
        benefits: benefits.map(benefit => ({
          type: benefit.benefitType,
          description: benefit.description,
          value: benefit.benefitValue
        }))
      };
    } catch (error) {
      safeLogger.error('Error calculating seller tier:', error);
      throw error;
    }
  }

  /**
   * Update seller tier based on current performance
   */
  async updateSellerTier(walletAddress: string, autoUpgrade: boolean = true): Promise<{
    previousTier: string;
    newTier: string;
    requirementsMet: string[];
    autoUpgraded: boolean;
  }> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      const tierCalculation = await this.calculateSellerTier(walletAddress);

      // Get current seller
      const currentSellerData = await db.select().from(sellers).where(eq(sellers.walletAddress, walletAddress));
      const currentSeller = currentSellerData[0];

      if (!currentSeller) {
        throw new Error('Seller not found');
      }

      const previousTier = currentSeller.tier;
      const newTier = tierCalculation.currentTier;

      // Only update if tier has changed
      if (previousTier !== newTier) {
        // Update seller tier
        await db.update(sellers)
          .set({ tier: newTier })
          .where(eq(sellers.walletAddress, walletAddress));

        // Create tier history record
        await db.insert(sellerTierHistory).values({
          sellerWalletAddress: walletAddress,
          fromTier: previousTier,
          toTier: newTier,
          upgradeReason: `Performance metrics met: ${tierCalculation.requirements.filter(r => r.met).map(r => r.type).join(', ')}`,
          autoUpgraded: autoUpgrade
        });

        // Update tier progression
        const requirementsMet = tierCalculation.requirements.filter(req => req.met).map(req => req.type);
        await this.updateTierProgression(walletAddress, newTier, requirementsMet);
      }

      const requirementsMet = tierCalculation.requirements.filter(req => req.met).map(req => req.type);

      return {
        previousTier,
        newTier,
        requirementsMet,
        autoUpgraded: autoUpgrade
      };
    } catch (error) {
      safeLogger.error('Error updating seller tier:', error);
      throw error;
    }
  }

  /**
   * Update tier progression tracking
   */
  private async updateTierProgression(walletAddress: string, currentTier: string, requirementsMet: string[]): Promise<void> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      // Get total requirements for current tier
      const requirementsData = await db
        .select()
        .from(sellerTierRequirements)
        .where(eq(sellerTierRequirements.tier, currentTier));

      const requirements = requirementsData[0];
      const totalRequirements = requirementsData.length;
      const requirementsMetCount = requirementsMet.length;
      const progressPercentage = totalRequirements > 0 ? (requirementsMetCount / totalRequirements) * 100 : 0;

      // Determine next eligible tier
      const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
      const currentIndex = tierOrder.indexOf(currentTier);
      const nextEligibleTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;

      // Set next evaluation time (daily for now, weekly for higher tiers)
      const nextEvaluationAt = new Date();
      if (['gold', 'platinum', 'diamond'].includes(currentTier)) {
        nextEvaluationAt.setDate(nextEvaluationAt.getDate() + 7); // Weekly for higher tiers
      } else {
        nextEvaluationAt.setDate(nextEvaluationAt.getDate() + 1); // Daily for lower tiers
      }

      // Update or create tier progression record
      const existingProgression = await db
        .select()
        .from(sellerTierProgression)
        .where(eq(sellerTierProgression.sellerWalletAddress, walletAddress));

      if (existingProgression.length > 0) {
        await db.update(sellerTierProgression)
          .set({
            currentTier: currentTier,
            nextEligibleTier: nextEligibleTier,
            progressPercentage: progressPercentage,
            requirementsMet: requirementsMetCount,
            totalRequirements: totalRequirements,
            lastEvaluationAt: new Date(),
            nextEvaluationAt: nextEvaluationAt,
            updatedAt: new Date()
          })
          .where(eq(sellerTierProgression.sellerWalletAddress, walletAddress));
      } else {
        await db.insert(sellerTierProgression)
          .values({
            sellerWalletAddress: walletAddress,
            currentTier: currentTier,
            nextEligibleTier: nextEligibleTier,
            progressPercentage: progressPercentage,
            requirementsMet: requirementsMetCount,
            totalRequirements: totalRequirements,
            lastEvaluationAt: new Date(),
            nextEvaluationAt: nextEvaluationAt,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
    } catch (error) {
      safeLogger.error('Error updating tier progression:', error);
      throw error;
    }
  }

  /**
   * Get seller tier progression history
   */
  async getTierHistory(walletAddress: string, limit: number = 50): Promise<Array<{
    from_tier: string;
    to_tier: string;
    upgrade_reason: string;
    auto_upgraded: boolean;
    created_at: Date;
  }>> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      const history = await db
        .select()
        .from(sellerTierHistory)
        .where(eq(sellerTierHistory.sellerWalletAddress, walletAddress))
        .orderBy(desc(sellerTierHistory.createdAt))
        .limit(limit);

      return history.map(h => ({
        from_tier: h.fromTier,
        to_tier: h.toTier,
        upgrade_reason: h.upgradeReason,
        auto_upgraded: h.autoUpgraded,
        created_at: h.createdAt
      }));
    } catch (error) {
      safeLogger.error('Error getting tier history:', error);
      throw error;
    }
  }

  /**
   * Get tier requirements for a specific tier
   */
  async getTierRequirements(tier: string): Promise<Array<{
    type: string;
    required: number;
    current: number;
    met: boolean;
    description: string;
  }>> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      const requirements = await db
        .select()
        .from(sellerTierRequirements)
        .where(eq(sellerTierRequirements.tier, tier));

      return requirements.map(req => ({
        type: req.requirementType,
        required: parseFloat(req.requiredValue.toString()),
        current: parseFloat(req.currentValue.toString()),
        met: req.isMet,
        description: req.description
      }));
    } catch (error) {
      safeLogger.error('Error getting tier requirements:', error);
      throw error;
    }
  }

  /**
   * Get tier benefits for a specific tier
   */
  async getTierBenefits(tier: string): Promise<Array<{
    type: string;
    description: string;
    value: string;
  }>> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      const benefits = await db
        .select()
        .from(sellerTierBenefits)
        .where(eq(sellerTierBenefits.tier, tier));

      return benefits.map(benefit => ({
        type: benefit.benefitType,
        description: benefit.description,
        value: benefit.benefitValue
      }));
    } catch (error) {
      safeLogger.error('Error getting tier benefits:', error);
      throw error;
    }
  }

  /**
   * Get all available tiers with their requirements and benefits
   */
  async getAllTiers(): Promise<Array<{
    tier: string;
    requirements: Array<{
      type: string;
      required: number;
      description: string;
    }>;
    benefits: Array<{
      type: string;
      description: string;
      value: string;
    }>;
  }>> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

      const tierData = await Promise.all(
        tiers.map(async (tier) => ({
          tier,
          requirements: await this.getTierRequirements(tier),
          benefits: await this.getTierBenefits(tier)
        }))
      );

      return tierData;
    } catch (error) {
      safeLogger.error('Error getting all tiers:', error);
      throw error;
    }
  }

  /**
   * Helper function to map requirement type to metric field
   */
  private getMetricField(requirementType: string): keyof any {
    const mapping: Record<string, keyof any> = {
      'total_sales': 'totalSales',
      'rating': 'averageRating',
      'response_time': 'responseTime',
      'return_rate': 'returnRate',
      'dispute_rate': 'disputeRate',
      'repeat_rate': 'repeatRate'
    };
    return mapping[requirementType] || 'totalSales';
  }

  /**
   * Helper function to check if requirement is met
   */
  private checkRequirementMet(requirementType: string, metrics: any): boolean {
    const metricField = this.getMetricField(requirementType);
    const metricValue = metrics[metricField] || 0;
    const requiredValue = this.getRequiredValue(requirementType);

    switch (requirementType) {
      case 'response_time':
        return metricValue <= requiredValue;
      case 'return_rate':
      case 'dispute_rate':
        return metricValue <= requiredValue;
      case 'repeat_rate':
        return metricValue >= requiredValue;
      default:
        return metricValue >= requiredValue;
    }
  }

  /**
   * Helper function to get required value for requirement type
   */
  private getRequiredValue(requirementType: string): number {
    const mapping: Record<string, number> = {
      'total_sales': 0,
      'rating': 0,
      'response_time': 0,
      'return_rate': 100,
      'dispute_rate': 100,
      'repeat_rate': 0
    };
    return mapping[requirementType] || 0;
  }
}

export const sellerService = new SellerService();
