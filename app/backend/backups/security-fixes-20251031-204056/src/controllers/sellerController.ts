import { Request, Response } from "express";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { databaseService } from "../services/databaseService";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { eq, desc, and, sql } from "drizzle-orm";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { marketplaceUsers, sellerVerifications, marketplaceProducts, marketplaceOrders } from "../db/marketplaceSchema";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { users } from "../db/schema";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class SellerController {
  // Get seller applications
  async getSellerApplications(req: Request, res: Response) {
    try {
      const { status, businessType, submittedAfter, page = 1, limit = 10 } = req.query;
      
      const db = databaseService.getDatabase();
      
      // Get marketplace users with seller role
      const sellers = await db.select({
        id: marketplaceUsers.userId,
        legalName: marketplaceUsers.legalName,
        email: marketplaceUsers.email,
        country: marketplaceUsers.country,
        kycVerified: marketplaceUsers.kycVerified,
        createdAt: marketplaceUsers.createdAt,
        currentTier: sellerVerifications.currentTier,
        reputationScore: sellerVerifications.reputationScore,
        totalVolume: sellerVerifications.totalVolume
      })
      .from(marketplaceUsers)
      .leftJoin(sellerVerifications, eq(marketplaceUsers.userId, sellerVerifications.userId))
      .where(eq(marketplaceUsers.role, 'seller'))
      .orderBy(desc(marketplaceUsers.createdAt))
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));
      
      // Get total count
      const totalCountResult = await db.select({ count: marketplaceUsers.userId })
        .from(marketplaceUsers)
        .where(eq(marketplaceUsers.role, 'seller'));
      const totalCount = totalCountResult.length > 0 ? totalCountResult[0].count : 0;
      
      res.json({
        applications: sellers,
        total: totalCount,
        page: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error) {
      safeLogger.error("Error fetching seller applications:", error);
      res.status(500).json({ error: "Failed to fetch seller applications" });
    }
  }

  // Get specific seller application
  async getSellerApplication(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;
      
      const db = databaseService.getDatabase();
      
      // Get marketplace user with seller verification details
      const sellers = await db.select({
        id: marketplaceUsers.userId,
        legalName: marketplaceUsers.legalName,
        email: marketplaceUsers.email,
        country: marketplaceUsers.country,
        shippingAddress: marketplaceUsers.shippingAddress,
        billingAddress: marketplaceUsers.billingAddress,
        kycVerified: marketplaceUsers.kycVerified,
        kycVerificationDate: marketplaceUsers.kycVerificationDate,
        kycProvider: marketplaceUsers.kycProvider,
        createdAt: marketplaceUsers.createdAt,
        currentTier: sellerVerifications.currentTier,
        reputationScore: sellerVerifications.reputationScore,
        totalVolume: sellerVerifications.totalVolume,
        successfulTransactions: sellerVerifications.successfulTransactions,
        disputeRate: sellerVerifications.disputeRate
      })
      .from(marketplaceUsers)
      .leftJoin(sellerVerifications, eq(marketplaceUsers.userId, sellerVerifications.userId))
      .where(eq(marketplaceUsers.userId, applicationId));
      
      if (sellers.length === 0) {
        return res.status(404).json({ error: "Seller application not found" });
      }
      
      res.json(sellers[0]);
    } catch (error) {
      safeLogger.error("Error fetching seller application:", error);
      res.status(500).json({ error: "Failed to fetch seller application" });
    }
  }

  // Review seller application
  async reviewSellerApplication(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;
      const { status, notes, rejectionReason, requiredInfo } = req.body;

      const db = databaseService.getDatabase();

      // Update seller verification tier based on review
      let newTier = 'standard';
      if (status === 'approved') {
        newTier = 'verified';
      } else if (status === 'rejected') {
        newTier = 'unverified';
      }

      const [updatedVerification] = await db.update(sellerVerifications)
        .set({
          currentTier: newTier,
          updatedAt: new Date()
        })
        .where(eq(sellerVerifications.userId, applicationId))
        .returning();

      if (!updatedVerification) {
        // If no verification record exists, create one
        const [newVerification] = await db.insert(sellerVerifications)
          .values({
            userId: applicationId,
            currentTier: newTier,
            kycVerified: false,
            reputationScore: 0,
            totalVolume: '0',
            successfulTransactions: 0,
            disputeRate: '0',
            lastTierUpdate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        if (!newVerification) {
          return res.status(404).json({ error: "Seller application not found" });
        }
      }

      res.json({ success: true });
    } catch (error) {
      safeLogger.error("Error reviewing seller application:", error);
      res.status(500).json({ error: "Failed to review seller application" });
    }
  }

  // Get seller risk assessment
  async getSellerRiskAssessment(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;

      const db = databaseService.getDatabase();

      // Get seller verification data
      const [seller] = await db.select({
        reputationScore: sellerVerifications.reputationScore,
        totalVolume: sellerVerifications.totalVolume,
        successfulTransactions: sellerVerifications.successfulTransactions,
        disputeRate: sellerVerifications.disputeRate,
        kycVerified: marketplaceUsers.kycVerified,
        createdAt: marketplaceUsers.createdAt
      })
      .from(sellerVerifications)
      .leftJoin(marketplaceUsers, eq(sellerVerifications.userId, marketplaceUsers.userId))
      .where(eq(sellerVerifications.userId, applicationId));

      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      // Calculate risk assessment scores
      const accountAge = Math.floor((Date.now() - new Date(seller.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const volumeFloat = parseFloat(seller.totalVolume || '0');
      const disputeRateFloat = parseFloat(seller.disputeRate || '0');

      const factors = {
        account_age: Math.min(100, (accountAge / 365) * 100),
        kyc_verification: seller.kycVerified ? 100 : 0,
        transaction_history: Math.min(100, (seller.successfulTransactions / 10) * 100),
        dispute_rate: Math.max(0, 100 - (disputeRateFloat * 20)),
        volume_score: Math.min(100, (volumeFloat / 10000) * 100)
      };

      const overallScore = Math.round(
        (factors.account_age * 0.2 +
         factors.kyc_verification * 0.3 +
         factors.transaction_history * 0.2 +
         factors.dispute_rate * 0.2 +
         factors.volume_score * 0.1)
      );

      const notes = [];
      if (!seller.kycVerified) notes.push("KYC verification not completed");
      if (disputeRateFloat > 5) notes.push("High dispute rate detected");
      if (seller.successfulTransactions < 5) notes.push("Limited transaction history");
      if (accountAge < 30) notes.push("New account - less than 30 days old");

      res.json({
        assessment: {
          overallScore,
          factors,
          notes
        }
      });
    } catch (error) {
      safeLogger.error("Error fetching risk assessment:", error);
      res.status(500).json({ error: "Failed to fetch risk assessment" });
    }
  }

  // Get seller performance
  async getSellerPerformance(req: Request, res: Response) {
    try {
      const {
        status,
        minRating,
        search,
        sortBy = 'revenue',
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const db = databaseService.getDatabase();

      // Get verified sellers with performance metrics
      const sellers = await db.select({
        id: marketplaceUsers.userId,
        sellerHandle: marketplaceUsers.legalName,
        businessName: marketplaceUsers.legalName,
        currentTier: sellerVerifications.currentTier,
        reputationScore: sellerVerifications.reputationScore,
        totalVolume: sellerVerifications.totalVolume,
        successfulTransactions: sellerVerifications.successfulTransactions,
        disputeRate: sellerVerifications.disputeRate,
        createdAt: marketplaceUsers.createdAt,
        updatedAt: sellerVerifications.updatedAt
      })
      .from(marketplaceUsers)
      .leftJoin(sellerVerifications, eq(marketplaceUsers.userId, sellerVerifications.userId))
      .where(eq(marketplaceUsers.role, 'seller'))
      .orderBy(desc(sellerVerifications.totalVolume))
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));

      // Calculate performance status for each seller
      const sellersWithPerformance = sellers.map(seller => {
        const volumeFloat = parseFloat(seller.totalVolume || '0');
        const disputeRateFloat = parseFloat(seller.disputeRate || '0');
        const reputationScore = seller.reputationScore || 0;

        // Determine performance status
        let performanceStatus = 'good';
        if (reputationScore >= 90 && disputeRateFloat < 2) {
          performanceStatus = 'excellent';
        } else if (reputationScore < 50 || disputeRateFloat > 10) {
          performanceStatus = 'critical';
        } else if (reputationScore < 70 || disputeRateFloat > 5) {
          performanceStatus = 'warning';
        }

        // Calculate mock trends (in production, compare with previous period)
        const salesGrowth = Math.random() * 40 - 10; // -10% to +30%
        const revenueGrowth = Math.random() * 40 - 10;
        const ratingTrend = Math.random() * 2 - 0.5; // -0.5 to +1.5

        return {
          id: seller.id,
          sellerId: seller.id,
          sellerHandle: seller.sellerHandle || 'Unknown',
          businessName: seller.businessName || 'Unknown Business',
          metrics: {
            totalSales: seller.successfulTransactions || 0,
            totalRevenue: volumeFloat,
            averageOrderValue: volumeFloat / Math.max(seller.successfulTransactions || 1, 1),
            totalOrders: seller.successfulTransactions || 0,
            completedOrders: seller.successfulTransactions || 0,
            cancelledOrders: 0,
            averageRating: reputationScore / 20, // Convert 0-100 to 0-5
            totalReviews: Math.floor(seller.successfulTransactions * 0.7) || 0,
            disputeRate: disputeRateFloat,
            responseTime: 2 + Math.random() * 6, // 2-8 hours
            fulfillmentRate: Math.min(100, 85 + Math.random() * 15)
          },
          trends: {
            salesGrowth,
            revenueGrowth,
            ratingTrend
          },
          status: performanceStatus,
          lastUpdated: seller.updatedAt || seller.createdAt
        };
      });

      // Get total count
      const totalCountResult = await db.select({ count: marketplaceUsers.userId })
        .from(marketplaceUsers)
        .where(eq(marketplaceUsers.role, 'seller'));
      const totalCount = totalCountResult.length || 0;

      res.json({
        sellers: sellersWithPerformance,
        total: totalCount,
        page: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error) {
      safeLogger.error("Error fetching seller performance:", error);
      res.status(500).json({ error: "Failed to fetch seller performance" });
    }
  }

  // Export seller performance
  async exportSellerPerformance(req: Request, res: Response) {
    try {
      // In production, this would generate a CSV/Excel file
      // For now, return success with a mock download URL
      res.json({
        success: true,
        downloadUrl: `/downloads/seller-performance-${Date.now()}.csv`
      });
    } catch (error) {
      safeLogger.error("Error exporting seller performance:", error);
      res.status(500).json({ error: "Failed to export seller performance" });
    }
  }



  async updateProfileEnhanced(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const updateData = req.body;
      // Handle file uploads if present
      const files = req.files as any;

      const db = databaseService.getDatabase();

      // Find user by wallet address
      const [user] = await db.select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const profileUpdate: any = { ...updateData, updatedAt: new Date() };

      if (files?.profileImage) {
        // In production, upload to IPFS or S3 and get URL
        profileUpdate.profileImageUrl = `/uploads/profile-${Date.now()}.jpg`;
      }

      if (files?.coverImage) {
        profileUpdate.coverImageUrl = `/uploads/cover-${Date.now()}.jpg`;
      }

      const [updatedProfile] = await db.update(marketplaceUsers)
        .set(profileUpdate)
        .where(eq(marketplaceUsers.userId, user.id))
        .returning();

      if (!updatedProfile) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      res.json({ success: true, profile: { ...updatedProfile, walletAddress } });
    } catch (error) {
      safeLogger.error("Error updating seller profile (enhanced):", error);
      res.status(500).json({ error: "Failed to update seller profile" });
    }
  }

  async getProfileCompleteness(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const db = databaseService.getDatabase();

      const [result] = await db.select()
        .from(marketplaceUsers)
        .leftJoin(users, eq(marketplaceUsers.userId, users.id))
        .where(eq(users.walletAddress, walletAddress));

      if (!result) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      const seller = result.marketplace_users;

      // Calculate profile completeness
      const fields = ['legalName', 'email', 'country', 'shippingAddress', 'billingAddress'];
      const completedFields = fields.filter(field => seller[field as keyof typeof seller]);
      const completeness = (completedFields.length / fields.length) * 100;

      res.json({
        completeness,
        missingFields: fields.filter(field => !seller[field as keyof typeof seller])
      });
    } catch (error) {
      safeLogger.error("Error calculating profile completeness:", error);
      res.status(500).json({ error: "Failed to calculate profile completeness" });
    }
  }

  async validateProfile(req: Request, res: Response) {
    try {
      const profileData = req.body;

      // Basic validation
      const errors = [];
      if (!profileData.walletAddress) errors.push("Wallet address is required");
      if (!profileData.legalName) errors.push("Legal name is required");
      if (!profileData.email) errors.push("Email is required");

      if (errors.length > 0) {
        return res.status(400).json({ valid: false, errors });
      }

      res.json({ valid: true, errors: [] });
    } catch (error) {
      safeLogger.error("Error validating profile:", error);
      res.status(500).json({ error: "Failed to validate profile" });
    }
  }

  async getSellerStats(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const db = databaseService.getDatabase();

      const [verification] = await db.select()
        .from(sellerVerifications)
        .leftJoin(marketplaceUsers, eq(sellerVerifications.userId, marketplaceUsers.userId))
        .leftJoin(users, eq(marketplaceUsers.userId, users.id))
        .where(eq(users.walletAddress, walletAddress));

      if (!verification) {
        return res.json({
          totalSales: 0,
          totalRevenue: 0,
          averageRating: 0,
          totalReviews: 0
        });
      }

      res.json({
        totalSales: verification.seller_verifications.successfulTransactions || 0,
        totalRevenue: parseFloat(verification.seller_verifications.totalVolume || '0'),
        averageRating: (verification.seller_verifications.reputationScore || 0) / 20,
        totalReviews: Math.floor((verification.seller_verifications.successfulTransactions || 0) * 0.7)
      });
    } catch (error) {
      safeLogger.error("Error fetching seller stats:", error);
      res.status(500).json({ error: "Failed to fetch seller stats" });
    }
  }

  async validateENS(req: Request, res: Response) {
    try {
      const { ensName } = req.body;

      // Mock ENS validation - in production, validate against ENS
      const isValid = ensName && ensName.endsWith('.eth');

      res.json({ valid: isValid, ensName });
    } catch (error) {
      safeLogger.error("Error validating ENS:", error);
      res.status(500).json({ error: "Failed to validate ENS" });
    }
  }

  async verifyENSOwnership(req: Request, res: Response) {
    try {
      const { ensName, walletAddress } = req.body;

      // Mock ownership verification - in production, verify on-chain
      const isOwner = ensName && walletAddress;

      res.json({ verified: isOwner, ensName, walletAddress });
    } catch (error) {
      safeLogger.error("Error verifying ENS ownership:", error);
      res.status(500).json({ error: "Failed to verify ENS ownership" });
    }
  }

  async forceSyncProfile(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;

      // Mock sync - in production, sync with blockchain/IPFS
      res.json({ success: true, message: "Profile synced successfully", walletAddress });
    } catch (error) {
      safeLogger.error("Error syncing profile:", error);
      res.status(500).json({ error: "Failed to sync profile" });
    }
  }

  async validateProfileSync(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;

      // Mock validation - in production, check sync status
      res.json({ inSync: true, lastSync: new Date(), walletAddress });
    } catch (error) {
      safeLogger.error("Error validating profile sync:", error);
      res.status(500).json({ error: "Failed to validate profile sync" });
    }
  }

  async getProfileHistory(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;

      // Mock history - in production, fetch from audit log
      res.json({
        history: [
          {
            timestamp: new Date(),
            action: 'profile_updated',
            field: 'legalName',
            oldValue: 'Old Name',
            newValue: 'New Name'
          }
        ],
        walletAddress
      });
    } catch (error) {
      safeLogger.error("Error fetching profile history:", error);
      res.status(500).json({ error: "Failed to fetch profile history" });
    }
  }

  // New Seller Management API Methods

  // Create new product listing
  async createListing(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.walletAddress) {
        return res.status(401).json({ success: false, error: "Authentication required" });
      }

      const listingData = req.body;
      const db = databaseService.getDatabase();

      // Get or create marketplace user
      let [marketplaceUser] = await db.select()
        .from(marketplaceUsers)
        .leftJoin(users, eq(marketplaceUsers.userId, users.id))
        .where(eq(users.walletAddress, user.walletAddress));

      if (!marketplaceUser) {
        // Create marketplace user if doesn't exist
        const [newUser] = await db.insert(users)
          .values({
            walletAddress: user.walletAddress,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .onConflictDoNothing()
          .returning();

        const userId = newUser?.id || user.id;
        
        await db.insert(marketplaceUsers)
          .values({
            userId,
            role: 'seller',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .onConflictDoNothing();
      }

      // Create the listing
      const [newListing] = await db.insert(marketplaceProducts)
        .values({
          sellerId: marketplaceUser?.users?.id || user.id,
          title: listingData.title,
          description: listingData.description,
          category: listingData.category,
          priceCrypto: listingData.priceCrypto.toString(),
          currency: listingData.currency || 'USDC',
          isPhysical: listingData.isPhysical || false,
          stock: listingData.stock || 1,
          metadataUri: listingData.metadataUri,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.status(201).json({
        success: true,
        data: {
          id: newListing.id,
          title: newListing.title,
          description: newListing.description,
          category: newListing.category,
          priceCrypto: parseFloat(newListing.priceCrypto),
          currency: newListing.currency,
          isPhysical: newListing.isPhysical,
          stock: newListing.stock,
          status: newListing.status,
          createdAt: newListing.createdAt
        }
      });
    } catch (error) {
      safeLogger.error("Error creating listing:", error);
      res.status(500).json({ success: false, error: "Failed to create listing" });
    }
  }

  // Update existing listing
  async updateListing(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const updates = req.body;
      const db = databaseService.getDatabase();

      // Verify ownership
      const [listing] = await db.select()
        .from(marketplaceProducts)
        .leftJoin(users, eq(marketplaceProducts.sellerId, users.id))
        .where(eq(marketplaceProducts.id, id));

      if (!listing || listing.users?.walletAddress !== user.walletAddress) {
        return res.status(404).json({ success: false, error: "Listing not found or access denied" });
      }

      // Update the listing
      const updateData: any = { updatedAt: new Date() };
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.priceCrypto) updateData.priceCrypto = updates.priceCrypto.toString();
      if (updates.currency) updateData.currency = updates.currency;
      if (updates.isPhysical !== undefined) updateData.isPhysical = updates.isPhysical;
      if (updates.stock !== undefined) updateData.stock = updates.stock;
      if (updates.status) updateData.status = updates.status;
      if (updates.metadataUri) updateData.metadataUri = updates.metadataUri;

      const [updatedListing] = await db.update(marketplaceProducts)
        .set(updateData)
        .where(eq(marketplaceProducts.id, id))
        .returning();

      res.json({
        success: true,
        data: {
          id: updatedListing.id,
          title: updatedListing.title,
          description: updatedListing.description,
          category: updatedListing.category,
          priceCrypto: parseFloat(updatedListing.priceCrypto),
          currency: updatedListing.currency,
          isPhysical: updatedListing.isPhysical,
          stock: updatedListing.stock,
          status: updatedListing.status,
          updatedAt: updatedListing.updatedAt
        }
      });
    } catch (error) {
      safeLogger.error("Error updating listing:", error);
      res.status(500).json({ success: false, error: "Failed to update listing" });
    }
  }

  // Delete listing
  async deleteListing(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const db = databaseService.getDatabase();

      // Verify ownership
      const [listing] = await db.select()
        .from(marketplaceProducts)
        .leftJoin(users, eq(marketplaceProducts.sellerId, users.id))
        .where(eq(marketplaceProducts.id, id));

      if (!listing || listing.users?.walletAddress !== user.walletAddress) {
        return res.status(404).json({ success: false, error: "Listing not found or access denied" });
      }

      // Soft delete by setting status to inactive
      await db.update(marketplaceProducts)
        .set({ status: 'inactive', updatedAt: new Date() })
        .where(eq(marketplaceProducts.id, id));

      res.json({ success: true, message: "Listing deleted successfully" });
    } catch (error) {
      safeLogger.error("Error deleting listing:", error);
      res.status(500).json({ success: false, error: "Failed to delete listing" });
    }
  }

  // Get seller dashboard data
  async getDashboard(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { period = '30d', includeOrders = 'true', includeAnalytics = 'true' } = req.query;
      const db = databaseService.getDatabase();

      // Get basic stats
      const stats = await this.getSellerStatsInternal(user.walletAddress);
      
      // Get recent listings
      const recentListings = await db.select({
        id: marketplaceProducts.id,
        title: marketplaceProducts.title,
        status: marketplaceProducts.status,
        priceCrypto: marketplaceProducts.priceCrypto,
        currency: marketplaceProducts.currency,
        createdAt: marketplaceProducts.createdAt
      })
      .from(marketplaceProducts)
      .leftJoin(users, eq(marketplaceProducts.sellerId, users.id))
      .where(eq(users.walletAddress, user.walletAddress))
      .orderBy(desc(marketplaceProducts.createdAt))
      .limit(5);

      const dashboardData: any = {
        stats,
        recentListings: recentListings.map(listing => ({
          ...listing,
          priceCrypto: parseFloat(listing.priceCrypto)
        }))
      };

      if (includeOrders === 'true') {
        dashboardData.recentOrders = await this.getRecentOrdersInternal(user.walletAddress, 5);
      }

      if (includeAnalytics === 'true') {
        dashboardData.analytics = {
          period,
          salesTrend: this.generateMockTrend(period as string),
          topCategories: await this.getTopCategoriesInternal(user.walletAddress),
          conversionRate: 0.15 + Math.random() * 0.1 // Mock conversion rate
        };
      }

      res.json({ success: true, data: dashboardData });
    } catch (error) {
      safeLogger.error("Error fetching dashboard:", error);
      res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
    }
  }

  // Update seller profile
  async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const updates = req.body;

      // Use the existing seller service
      const { sellerService } = await import('../services/sellerService');
      
      try {
        const updatedProfile = await sellerService.updateSellerProfile(user.walletAddress, updates);
        res.json({ success: true, data: updatedProfile });
      } catch (serviceError: any) {
        if (serviceError.message.includes('not found')) {
          // Create profile if it doesn't exist
          const newProfile = await sellerService.createSellerProfile({
            walletAddress: user.walletAddress,
            ...updates
          });
          res.status(201).json({ success: true, data: newProfile });
        } else {
          throw serviceError;
        }
      }
    } catch (error) {
      safeLogger.error("Error updating profile:", error);
      res.status(500).json({ success: false, error: "Failed to update profile" });
    }
  }

  // Get seller's own listings
  async getMyListings(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { 
        status, 
        category, 
        page = 1, 
        limit = 20, 
        sortBy = 'created_at', 
        sortOrder = 'desc' 
      } = req.query;
      
      const db = databaseService.getDatabase();
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let query = db.select({
        id: marketplaceProducts.id,
        title: marketplaceProducts.title,
        description: marketplaceProducts.description,
        category: marketplaceProducts.category,
        priceCrypto: marketplaceProducts.priceCrypto,
        currency: marketplaceProducts.currency,
        isPhysical: marketplaceProducts.isPhysical,
        stock: marketplaceProducts.stock,
        status: marketplaceProducts.status,
        createdAt: marketplaceProducts.createdAt,
        updatedAt: marketplaceProducts.updatedAt
      })
      .from(marketplaceProducts)
      .leftJoin(users, eq(marketplaceProducts.sellerId, users.id))
      .where(eq(users.walletAddress, user.walletAddress));

      // Apply filters
      if (status) {
        query = query.where(eq(marketplaceProducts.status, status as string));
      }
      if (category) {
        query = query.where(eq(marketplaceProducts.category, category as string));
      }

      // Apply sorting
      const sortColumn = sortBy === 'price' ? marketplaceProducts.priceCrypto : 
                        sortBy === 'title' ? marketplaceProducts.title :
                        sortBy === 'updated_at' ? marketplaceProducts.updatedAt :
                        marketplaceProducts.createdAt;
      
      query = sortOrder === 'asc' ? query.orderBy(sortColumn) : query.orderBy(desc(sortColumn));

      const listings = await query.limit(parseInt(limit as string)).offset(offset);

      // Get total count
      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(marketplaceProducts)
        .leftJoin(users, eq(marketplaceProducts.sellerId, users.id))
        .where(eq(users.walletAddress, user.walletAddress));
      
      const total = totalResult[0]?.count || 0;

      res.json({
        success: true,
        data: {
          listings: listings.map(listing => ({
            ...listing,
            priceCrypto: parseFloat(listing.priceCrypto)
          })),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / parseInt(limit as string))
          }
        }
      });
    } catch (error) {
      safeLogger.error("Error fetching listings:", error);
      res.status(500).json({ success: false, error: "Failed to fetch listings" });
    }
  }

  // Get seller's orders
  async getMyOrders(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { 
        status, 
        page = 1, 
        limit = 20, 
        sortBy = 'created_at', 
        sortOrder = 'desc' 
      } = req.query;
      
      const db = databaseService.getDatabase();
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let query = db.select({
        id: marketplaceOrders.id,
        productId: marketplaceOrders.productId,
        productTitle: marketplaceProducts.title,
        buyerId: marketplaceOrders.buyerId,
        amount: marketplaceOrders.amount,
        currency: marketplaceOrders.currency,
        status: marketplaceOrders.status,
        createdAt: marketplaceOrders.createdAt,
        updatedAt: marketplaceOrders.updatedAt
      })
      .from(marketplaceOrders)
      .leftJoin(marketplaceProducts, eq(marketplaceOrders.productId, marketplaceProducts.id))
      .leftJoin(users, eq(marketplaceProducts.sellerId, users.id))
      .where(eq(users.walletAddress, user.walletAddress));

      // Apply filters
      if (status) {
        query = query.where(eq(marketplaceOrders.status, status as string));
      }

      // Apply sorting
      const sortColumn = sortBy === 'amount' ? marketplaceOrders.amount :
                        sortBy === 'updated_at' ? marketplaceOrders.updatedAt :
                        marketplaceOrders.createdAt;
      
      query = sortOrder === 'asc' ? query.orderBy(sortColumn) : query.orderBy(desc(sortColumn));

      const orders = await query.limit(parseInt(limit as string)).offset(offset);

      // Get total count
      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(marketplaceOrders)
        .leftJoin(marketplaceProducts, eq(marketplaceOrders.productId, marketplaceProducts.id))
        .leftJoin(users, eq(marketplaceProducts.sellerId, users.id))
        .where(eq(users.walletAddress, user.walletAddress));
      
      const total = totalResult[0]?.count || 0;

      res.json({
        success: true,
        data: {
          orders: orders.map(order => ({
            ...order,
            amount: parseFloat(order.amount)
          })),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / parseInt(limit as string))
          }
        }
      });
    } catch (error) {
      safeLogger.error("Error fetching orders:", error);
      res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
  }

  // Get seller analytics
  async getAnalytics(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { period = '30d', metrics } = req.query;

      const analytics = {
        period,
        salesTrend: this.generateMockTrend(period as string),
        topCategories: await this.getTopCategoriesInternal(user.walletAddress),
        conversionRate: 0.15 + Math.random() * 0.1,
        averageOrderValue: 150 + Math.random() * 100,
        customerRetentionRate: 0.25 + Math.random() * 0.15,
        topPerformingProducts: await this.getTopProductsInternal(user.walletAddress)
      };

      // Filter metrics if specified
      if (metrics) {
        const requestedMetrics = (metrics as string).split(',');
        const filteredAnalytics: any = { period };
        requestedMetrics.forEach(metric => {
          if (analytics[metric as keyof typeof analytics]) {
            filteredAnalytics[metric] = analytics[metric as keyof typeof analytics];
          }
        });
        res.json({ success: true, data: filteredAnalytics });
      } else {
        res.json({ success: true, data: analytics });
      }
    } catch (error) {
      safeLogger.error("Error fetching analytics:", error);
      res.status(500).json({ success: false, error: "Failed to fetch analytics" });
    }
  }

  // Get seller profile (using seller service)
  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { sellerService } = await import('../services/sellerService');
      
      const profile = await sellerService.getSellerProfile(user.walletAddress);
      
      if (!profile) {
        return res.json({ success: true, data: null });
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error("Error fetching profile:", error);
      res.status(500).json({ success: false, error: "Failed to fetch profile" });
    }
  }

  // Get seller stats (using seller service)
  async getStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const stats = await this.getSellerStatsInternal(user.walletAddress);
      res.json({ success: true, data: stats });
    } catch (error) {
      safeLogger.error("Error fetching stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
  }

  // Request seller verification
  async requestVerification(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { verificationType, verificationData } = req.body;
      const { sellerService } = await import('../services/sellerService');
      
      const result = await sellerService.verifySellerProfile(user.walletAddress, verificationType);
      res.json({ success: true, data: result });
    } catch (error) {
      safeLogger.error("Error requesting verification:", error);
      res.status(500).json({ success: false, error: "Failed to request verification" });
    }
  }

  // Helper methods
  private async getSellerStatsInternal(walletAddress: string) {
    try {
      const { sellerService } = await import('../services/sellerService');
      return await sellerService.getSellerStats(walletAddress);
    } catch (error) {
      safeLogger.error("Error fetching seller stats:", error);
      // Return default stats if service fails
      return {
        totalListings: 0,
        activeListings: 0,
        totalSales: 0,
        averageRating: 0,
        profileCompleteness: 0,
        totalRevenue: '0',
        completedOrders: 0,
        pendingOrders: 0,
        disputedOrders: 0,
        reputationScore: 0
      };
    }
  }

  private async getRecentOrdersInternal(walletAddress: string, limit: number) {
    try {
      const { sellerService } = await import('../services/sellerService');
      const orders = await sellerService.getSellerOrders(walletAddress);
      return orders.slice(0, limit);
    } catch (error) {
      safeLogger.error("Error fetching recent orders:", error);
      return [];
    }
  }

  private async getTopCategoriesInternal(walletAddress: string) {
    try {
      const db = databaseService.getDatabase();
      const categories = await db.select({
        category: marketplaceProducts.category,
        count: sql<number>`count(*)`
      })
      .from(marketplaceProducts)
      .leftJoin(users, eq(marketplaceProducts.sellerId, users.id))
      .where(eq(users.walletAddress, walletAddress))
      .groupBy(marketplaceProducts.category)
      .orderBy(desc(sql<number>`count(*)`))
      .limit(5);

      return categories.map(cat => ({
        category: cat.category || 'Uncategorized',
        count: cat.count
      }));
    } catch (error) {
      safeLogger.error("Error fetching top categories:", error);
      return [];
    }
  }

  private async getTopProductsInternal(walletAddress: string) {
    try {
      const db = databaseService.getDatabase();
      const products = await db.select({
        id: marketplaceProducts.id,
        title: marketplaceProducts.title,
        priceCrypto: marketplaceProducts.priceCrypto,
        currency: marketplaceProducts.currency
      })
      .from(marketplaceProducts)
      .leftJoin(users, eq(marketplaceProducts.sellerId, users.id))
      .where(and(
        eq(users.walletAddress, walletAddress),
        eq(marketplaceProducts.status, 'active')
      ))
      .orderBy(desc(marketplaceProducts.createdAt))
      .limit(5);

      return products.map(product => ({
        ...product,
        priceCrypto: parseFloat(product.priceCrypto),
        sales: Math.floor(Math.random() * 50) // Mock sales data
      }));
    } catch (error) {
      safeLogger.error("Error fetching top products:", error);
      return [];
    }
  }

  private generateMockTrend(period: string) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const trend = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trend.push({
        date: date.toISOString().split('T')[0],
        sales: Math.floor(Math.random() * 10),
        revenue: Math.floor(Math.random() * 1000)
      });
    }
    
    return trend;
  }
}

export const sellerController = new SellerController();